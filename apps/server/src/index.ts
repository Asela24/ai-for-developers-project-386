import { buildApp } from "./app.js";
import { defaultEventTypes } from "./default-event-types.js";

// The e2e suite (NODE_ENV=test) creates its own Event types and expects an empty catalog.
// WEB_ROOT is set in the Docker image: the server then also serves the web app.
const app = buildApp({
  eventTypes: process.env.NODE_ENV === "test" ? [] : defaultEventTypes,
  webRoot: process.env.WEB_ROOT,
});
await app.listen({ port: Number(process.env.PORT ?? 3000), host: "0.0.0.0" });
