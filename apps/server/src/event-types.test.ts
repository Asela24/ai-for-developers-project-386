import { expect, it } from "vitest";
import { buildApp } from "./app.js";

const dataError = {
  code: "data_error",
  message: "Проверьте данные и попробуйте ещё раз.",
};

const intro = {
  id: "intro",
  name: "Знакомство",
  description: "Первый разговор о задаче",
  durationMinutes: 30,
};

it("Owner creates an Event type and a Guest can read it", async () => {
  const app = buildApp();

  const created = await app.inject({
    method: "POST",
    url: "/event-types",
    payload: {
      id: "intro",
      name: "Знакомство",
      description: "Первый разговор о задаче",
      durationMinutes: 30,
    },
  });

  expect(created.statusCode).toBe(201);
  expect(created.json()).toEqual({
    id: "intro",
    name: "Знакомство",
    description: "Первый разговор о задаче",
    durationMinutes: 30,
  });

  const listed = await app.inject({ method: "GET", url: "/event-types" });

  expect(listed.statusCode).toBe(200);
  expect(listed.json()).toEqual([
    {
      id: "intro",
      name: "Знакомство",
      description: "Первый разговор о задаче",
      durationMinutes: 30,
    },
  ]);
});

it("rejects a duplicate Event type id as a data error", async () => {
  const app = buildApp();
  const payload = {
    id: "intro",
    name: "Знакомство",
    description: "Первый разговор о задаче",
    durationMinutes: 30,
  };

  const created = await app.inject({ method: "POST", url: "/event-types", payload });
  expect(created.statusCode).toBe(201);

  const duplicate = await app.inject({
    method: "POST",
    url: "/event-types",
    payload: { ...payload, name: "Другое имя" },
  });

  expect(duplicate.statusCode).toBe(400);
  expect(duplicate.json()).toEqual({
    code: "data_error",
    message: "Проверьте данные и попробуйте ещё раз.",
  });

  const listed = await app.inject({ method: "GET", url: "/event-types" });
  expect(listed.json()).toEqual([payload]);
});

it("rejects a duration below 15 minutes as a data error", async () => {
  const app = buildApp();

  const res = await app.inject({
    method: "POST",
    url: "/event-types",
    payload: {
      id: "intro",
      name: "Знакомство",
      description: "Первый разговор о задаче",
      durationMinutes: 14,
    },
  });

  expect(res.statusCode).toBe(400);
  expect(res.json()).toEqual(dataError);
});

it("rejects Event type fields outside the limits as a data error", async () => {
  const invalid = [
    { ...intro, id: "" },
    { ...intro, id: "x".repeat(65) },
    { ...intro, name: "" },
    { ...intro, name: "н".repeat(121) },
    { ...intro, description: "о".repeat(2001) },
    { ...intro, durationMinutes: 541 },
    { ...intro, durationMinutes: 14.5 },
    { ...intro, durationMinutes: "30" },
    { id: "intro", name: "Знакомство", durationMinutes: 30 },
  ];

  for (const payload of invalid) {
    const app = buildApp();
    const res = await app.inject({ method: "POST", url: "/event-types", payload });
    expect({ payload, status: res.statusCode, body: res.json() }).toEqual({
      payload,
      status: 400,
      body: dataError,
    });
    expect((await app.inject({ method: "GET", url: "/event-types" })).json()).toEqual([]);
  }
});

it("accepts Event type fields at the limit boundaries", async () => {
  const app = buildApp();
  const shortest = {
    id: "i".repeat(64),
    name: "н",
    description: "",
    durationMinutes: 15,
  };
  const longest = {
    id: "upper",
    name: "н".repeat(120),
    description: "о".repeat(2000),
    durationMinutes: 540,
  };

  for (const payload of [shortest, longest]) {
    const created = await app.inject({ method: "POST", url: "/event-types", payload });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toEqual(payload);
  }
});

it("lists every Event type and does not share rows across apps", async () => {
  const app = buildApp();
  const other = {
    id: "deep",
    name: "Разбор",
    description: "Подробный разбор задачи",
    durationMinutes: 60,
  };

  expect(
    (await app.inject({ method: "POST", url: "/event-types", payload: intro })).statusCode,
  ).toBe(201);
  expect(
    (await app.inject({ method: "POST", url: "/event-types", payload: other })).statusCode,
  ).toBe(201);

  const listed = await app.inject({ method: "GET", url: "/event-types" });
  expect(listed.statusCode).toBe(200);
  expect(listed.json()).toHaveLength(2);
  expect(listed.json()).toEqual(expect.arrayContaining([intro, other]));

  const separate = await buildApp().inject({ method: "GET", url: "/event-types" });
  expect(separate.statusCode).toBe(200);
  expect(separate.json()).toEqual([]);
});

it("an app built with starting Event types lists them, and the Owner can delete one", async () => {
  const app = buildApp({ eventTypes: [intro] });

  const listed = await app.inject({ method: "GET", url: "/event-types" });
  expect(listed.json()).toEqual([intro]);

  const deleted = await app.inject({ method: "DELETE", url: "/event-types/intro" });
  expect(deleted.statusCode).toBe(204);
  expect((await app.inject({ method: "GET", url: "/event-types" })).json()).toEqual([]);
});
