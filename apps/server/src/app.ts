import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import openapiGlue from "fastify-openapi-glue";
import type { components, operations } from "./openapi.gen.js";
import { createBookingStore, type StoredBooking } from "./booking-store.js";
import { offeredSlots } from "./slots.js";

type EventType = components["schemas"]["EventType"];

export type BuildAppOptions = {
  now?: () => Date;
  /** Event types the catalog starts with; the Owner can delete them like any other. */
  eventTypes?: EventType[];
};

type CreateEventType = components["schemas"]["CreateEventType"];
type Failure = components["schemas"]["Failure"];
type Slot = components["schemas"]["Slot"];
type SlotsPath = operations["listSlots"]["parameters"]["path"];
type DeleteEventTypePath = operations["deleteEventType"]["parameters"]["path"];
type CreateBooking = components["schemas"]["CreateBooking"];
type Booking = components["schemas"]["Booking"];
type OwnerBooking = components["schemas"]["OwnerBooking"];
type DeleteBookingPath = operations["deleteBooking"]["parameters"]["path"];

const dataError = {
  code: "data_error",
  message: "Проверьте данные и попробуйте ещё раз.",
} satisfies Failure;

const conflict = {
  code: "conflict",
  message: "Это время уже занято. Выберите другое.",
} satisfies Failure;

/** A request the specification answers with data_error; the error handler sends it as 400. */
class DataError extends Error {
  readonly statusCode = 400;
}

// Source, compiled output inside the repo, or the copy next to dist/ in the image.
const openApiCandidates = [
  "../../../openapi/openapi.yaml",
  "../../../../openapi/openapi.yaml",
  "./openapi.yaml",
];

// Schema validation, malformed JSON, an unsupported content type, an oversized body…
// every client error the framework raises is the one data_error of the specification.
const isClientError = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null) return false;
  if ("validation" in error && Boolean(error.validation)) return true;
  const statusCode = "statusCode" in error ? Number(error.statusCode) : Number.NaN;
  return statusCode >= 400 && statusCode < 500;
};

const openApiSpecPath = (): string => {
  const here = dirname(fileURLToPath(import.meta.url));
  const found = openApiCandidates
    .map((relative) => join(here, relative))
    .find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error("Generated OpenAPI specification was not found");
  }
  return found;
};

// The Guest's copy has no id: the id is what deletes a Booking, and only the Owner deletes.
const toBooking = (stored: StoredBooking): Booking => ({
  eventTypeId: stored.eventTypeId,
  start: stored.start.toISOString(),
  end: stored.end.toISOString(),
  guestName: stored.guestName,
  guestEmail: stored.guestEmail,
});

const toOwnerBooking = (stored: StoredBooking): OwnerBooking => ({
  id: stored.id,
  ...toBooking(stored),
});

// Tests pass a fixed `now`; the server uses the real clock.
export const buildApp = ({
  now = () => new Date(),
  eventTypes: initialEventTypes = [],
}: BuildAppOptions = {}) => {
  const eventTypes: EventType[] = initialEventTypes.map((eventType) => ({ ...eventType }));
  const bookings = createBookingStore();
  const app = Fastify({
    logger: process.env.NODE_ENV !== "test",
    ajv: { customOptions: { coerceTypes: false } },
  });

  // The contract only takes JSON bodies, and Fastify validates a body only for the content
  // types its schema lists: a text/plain body would reach the handlers unchecked.
  app.removeContentTypeParser("text/plain");

  app.setErrorHandler((error, _request, reply) => {
    if (isClientError(error)) {
      return reply.code(400).send(dataError);
    }
    return reply.send(error);
  });

  // An unknown Event type id is the specification's data error, wherever it is given.
  const knownEventType = (eventTypeId: string): EventType => {
    const eventType = eventTypes.find((candidate) => candidate.id === eventTypeId);
    if (!eventType) throw new DataError(`Unknown Event type "${eventTypeId}"`);
    return eventType;
  };

  app.register(openapiGlue, {
    specification: openApiSpecPath(),
    serviceHandlers: {
      listEventTypes: () => eventTypes,
      createEventType: (request: FastifyRequest, reply: FastifyReply) => {
        const body = request.body as CreateEventType;
        if (eventTypes.some((eventType) => eventType.id === body.id)) {
          reply.code(400);
          return dataError;
        }
        const eventType: EventType = {
          id: body.id,
          name: body.name,
          description: body.description,
          durationMinutes: body.durationMinutes,
        };
        eventTypes.push(eventType);
        reply.code(201);
        return eventType;
      },
      deleteEventType: (request: FastifyRequest, reply: FastifyReply) => {
        const { eventTypeId } = request.params as DeleteEventTypePath;
        eventTypes.splice(eventTypes.indexOf(knownEventType(eventTypeId)), 1);
        bookings.removeByEventType(eventTypeId);
        return reply.code(204).send();
      },
      listSlots: (request: FastifyRequest) => {
        const { eventTypeId } = request.params as SlotsPath;
        return offeredSlots(knownEventType(eventTypeId).durationMinutes, now()).map(
          (slot): Slot => ({
            start: slot.start.toISOString(),
            end: slot.end.toISOString(),
            status: bookings.isBusy(slot) ? "busy" : "free",
          }),
        );
      },
      createBooking: (request: FastifyRequest, reply: FastifyReply) => {
        const body = request.body as CreateBooking;
        const { durationMinutes } = knownEventType(body.eventTypeId);
        const requested = new Date(body.start).getTime();
        const slot = offeredSlots(durationMinutes, now()).find(
          (offered) => offered.start.getTime() === requested,
        );
        if (!slot) {
          reply.code(400);
          return dataError;
        }
        const reserved = bookings.reserve({
          ...slot,
          eventTypeId: body.eventTypeId,
          guestName: body.guestName,
          guestEmail: body.guestEmail,
        });
        if (reserved === "conflict") {
          reply.code(409);
          return conflict;
        }
        reply.code(201);
        return toBooking(reserved);
      },
      listUpcomingBookings: () => bookings.upcoming(now()).map(toOwnerBooking),
      deleteBooking: (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = request.params as DeleteBookingPath;
        if (!bookings.remove(id)) {
          reply.code(400);
          return dataError;
        }
        return reply.code(204).send();
      },
    },
  });

  app.get("/health", async () => ({ status: "ok" }));
  return app;
};
