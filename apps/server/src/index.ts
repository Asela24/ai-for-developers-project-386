import { buildApp } from "./app.js";
import { defaultEventTypes } from "./default-event-types.js";

// The e2e suite (NODE_ENV=test) creates its own Event types and expects an empty catalog.
const app = buildApp({
  eventTypes: process.env.NODE_ENV === "test" ? [] : defaultEventTypes,
});
await app.listen({ port: Number(process.env.PORT ?? 3000), host: "0.0.0.0" });
