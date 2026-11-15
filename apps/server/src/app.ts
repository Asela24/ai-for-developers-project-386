import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import openapiGlue from "fastify-openapi-glue";
import type { components } from "./openapi.gen.js";

export type BuildAppOptions = {
  now?: () => Date;
};

type EventType = components["schemas"]["EventType"];
type CreateEventType = components["schemas"]["CreateEventType"];
type Failure = components["schemas"]["Failure"];

const dataError = {
  code: "data_error",
  message: "Проверьте данные и попробуйте ещё раз.",
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

// `now` is unused until Slot and Booking. Later tests pass a fixed clock here.
export const buildApp = (_options: BuildAppOptions = {}) => {
  const eventTypes: EventType[] = [];
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
    },
  });

  app.get("/health", async () => ({ status: "ok" }));
  return app;
};
