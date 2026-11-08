import Fastify from "fastify";

export const buildApp = () => {
  const app = Fastify({ logger: process.env.NODE_ENV !== "test" });
  app.get("/health", async () => ({ status: "ok" }));
  return app;
};
