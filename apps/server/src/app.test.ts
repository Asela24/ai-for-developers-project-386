import { expect, it } from "vitest";
import { buildApp } from "./app.js";

it("GET /health returns ok", async () => {
  const res = await buildApp().inject({ method: "GET", url: "/health" });
  expect(res.statusCode).toBe(200);
  expect(res.json()).toEqual({ status: "ok" });
});
