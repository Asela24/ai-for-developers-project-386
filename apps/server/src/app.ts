import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import openapiGlue from "fastify-openapi-glue";
import type { components, operations } from "./openapi.gen.js";
import { createBookingStore } from "./booking-store.js";
import { offeredSlots } from "./slots.js";

export type BuildAppOptions = {
  now?: () => Date;
};

type EventType = components["schemas"]["EventType"];
type CreateEventType = components["schemas"]["CreateEventType"];
type Failure = components["schemas"]["Failure"];
type Slot = components["schemas"]["Slot"];
type SlotsPath = operations["listSlots"]["parameters"]["path"];
type CreateBooking = components["schemas"]["CreateBooking"];
type Booking = components["schemas"]["Booking"];

const dataError = {
  code: "data_error",
  message: "Проверьте данные и попробуйте ещё раз.",
} satisfies Failure;

const conflict = {
  code: "conflict",
  message: "Это время уже занято. Выберите другое.",
} satisfies Failure;

// Source, compiled output inside the repo, or the copy next to dist/ in the image.
const openApiCandidates = [
  "../../../openapi/openapi.yaml",
  "../../../../openapi/openapi.yaml",
  "./openapi.yaml",
];

const isValidationError = (error: unknown): boolean =>
  typeof error === "object" && error !== null && "validation" in error && Boolean(error.validation);

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

// Tests pass a fixed `now`; the server uses the real clock.
export const buildApp = ({ now = () => new Date() }: BuildAppOptions = {}) => {
  const eventTypes: EventType[] = [];
  const bookings = createBookingStore();
  const app = Fastify({
    logger: process.env.NODE_ENV !== "test",
    ajv: { customOptions: { coerceTypes: false } },
  });

  app.setErrorHandler((error, _request, reply) => {
    if (isValidationError(error)) {
      return reply.code(400).send(dataError);
    }
    return reply.send(error);
  });

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
      listSlots: (request: FastifyRequest, reply: FastifyReply) => {
        const { eventTypeId } = request.params as SlotsPath;
        const eventType = eventTypes.find((candidate) => candidate.id === eventTypeId);
        if (!eventType) {
          reply.code(400);
          return dataError;
        }
        return offeredSlots(eventType.durationMinutes, now()).map((slot): Slot => ({
          start: slot.start.toISOString(),
          end: slot.end.toISOString(),
          status: bookings.isBusy(slot) ? "busy" : "free",
        }));
      },
      createBooking: (request: FastifyRequest, reply: FastifyReply) => {
        const body = request.body as CreateBooking;
        const eventType = eventTypes.find((candidate) => candidate.id === body.eventTypeId);
        const requested = new Date(body.start).getTime();
        const slot =
          eventType &&
          offeredSlots(eventType.durationMinutes, now()).find(
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
        return {
          eventTypeId: reserved.eventTypeId,
          start: reserved.start.toISOString(),
          end: reserved.end.toISOString(),
          guestName: reserved.guestName,
          guestEmail: reserved.guestEmail,
        } satisfies Booking;
      },
    },
  });

  app.get("/health", async () => ({ status: "ok" }));
  return app;
};
