import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildApp } from "./app.js";

// The Docker image: one process serves the web app at / and the API under /api.
describe("with a web root", () => {
  const webRoot = mkdtempSync(join(tmpdir(), "easybook-web-"));
  writeFileSync(join(webRoot, "index.html"), "<!doctype html><title>EasyBook</title>");
  const app = buildApp({ webRoot });

  it("serves the API under /api", async () => {
    const res = await app.inject({ method: "GET", url: "/api/event-types" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it("serves index.html for client-side routes", async () => {
    const res = await app.inject({ method: "GET", url: "/owner" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain("<title>EasyBook</title>");
  });

  it("answers an unknown API path with 404, not the web app", async () => {
    const res = await app.inject({ method: "GET", url: "/api/nope" });
    expect(res.statusCode).toBe(404);
  });
});
