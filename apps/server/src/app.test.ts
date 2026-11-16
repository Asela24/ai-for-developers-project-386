import { expect, it } from "vitest";
import { buildApp } from "./app.js";

it("GET /health returns ok", async () => {
  const res = await buildApp().inject({ method: "GET", url: "/health" });
  expect(res.statusCode).toBe(200);
  expect(res.json()).toEqual({ status: "ok" });
});

const dataError = {
  code: "data_error",
  message: "Проверьте данные и попробуйте ещё раз.",
};

it("answers a malformed JSON body with data_error", async () => {
  const res = await buildApp().inject({
    method: "POST",
    url: "/bookings",
    headers: { "content-type": "application/json" },
    payload: '{"eventTypeId": ',
  });

  expect(res.statusCode).toBe(400);
  expect(res.json()).toEqual(dataError);
});

it("answers a body of an unsupported content type with data_error", async () => {
  const res = await buildApp().inject({
    method: "POST",
    url: "/event-types",
    headers: { "content-type": "text/plain" },
    payload: "id=hour",
  });

  expect(res.statusCode).toBe(400);
  expect(res.json()).toEqual(dataError);
});
