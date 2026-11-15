import { expect, it } from "vitest";
import { buildApp } from "./app.js";

// Awaiting the app (it is thenable) changes its type, so helpers only ask for `inject`.
type Injector = Pick<ReturnType<typeof buildApp>, "inject">;

const hour = {
  id: "hour",
  name: "Час",
  description: "Час на задачу",
  durationMinutes: 60,
};

// 2026-11-15 08:00 Europe/Belgrade, before working hours, so the whole grid is offered.
const beforeHours = new Date("2026-11-15T07:00:00.000Z");

it("offers 60-minute Slots from 09:00 through 17:00 inside the 14-day window", async () => {
  const app = buildApp({ now: () => beforeHours });
  const created = await app.inject({ method: "POST", url: "/event-types", payload: hour });
  expect(created.statusCode).toBe(201);

  const listed = await app.inject({ method: "GET", url: "/event-types/hour/slots" });

  expect(listed.statusCode).toBe(200);
  const slots = listed.json() as Array<{ start: string; end: string; status: string }>;
  const starts = slots.map((slot) => new Date(slot.start).toISOString());

  // 09:00–17:00 packed by 60 minutes is 9 starts, for 14 calendar days: 15 Nov through 28 Nov.
  expect(starts).toHaveLength(126);
  expect(starts).toContain("2026-11-15T08:00:00.000Z");
  expect(starts).toContain("2026-11-15T16:00:00.000Z");
  expect(starts).not.toContain("2026-11-15T17:00:00.000Z");
  expect(starts).not.toContain("2026-11-15T07:30:00.000Z");
  expect(starts).toContain("2026-11-28T08:00:00.000Z");
  expect(starts).toContain("2026-11-28T16:00:00.000Z");
  expect(starts).not.toContain("2026-11-29T08:00:00.000Z");
  expect(starts).not.toContain("2026-11-14T16:00:00.000Z");

  const nine = slots.find(
    (slot) => new Date(slot.start).toISOString() === "2026-11-15T08:00:00.000Z",
  );
  expect(nine).toEqual({
    start: nine?.start,
    end: nine?.end,
    status: "free",
  });
  expect(new Date(nine?.end ?? "").toISOString()).toBe("2026-11-15T09:00:00.000Z");
  expect(slots.every((slot) => slot.status === "free")).toBe(true);
  expect(JSON.stringify(slots)).not.toContain("guestName");
  expect(JSON.stringify(slots)).not.toContain("guestEmail");
});

const slotStarts = async (app: Injector, eventTypeId: string) => {
  const listed = await app.inject({ method: "GET", url: `/event-types/${eventTypeId}/slots` });
  expect(listed.statusCode).toBe(200);
  return (listed.json() as Array<{ start: string }>).map((slot) =>
    new Date(slot.start).toISOString(),
  );
};

it("packs 45-minute Slots back-to-back so the last one ends by 18:00", async () => {
  const app = buildApp({ now: () => beforeHours });
  await app.inject({
    method: "POST",
    url: "/event-types",
    payload: { ...hour, id: "short", durationMinutes: 45 },
  });

  const starts = await slotStarts(app, "short");
  const firstDay = starts.filter((start) => start.startsWith("2026-11-15"));

  // 09:00, 09:45, … 17:15 Belgrade (UTC+1): twelve starts, the last ends 18:00.
  expect(firstDay).toEqual([
    "2026-11-15T08:00:00.000Z",
    "2026-11-15T08:45:00.000Z",
    "2026-11-15T09:30:00.000Z",
    "2026-11-15T10:15:00.000Z",
    "2026-11-15T11:00:00.000Z",
    "2026-11-15T11:45:00.000Z",
    "2026-11-15T12:30:00.000Z",
    "2026-11-15T13:15:00.000Z",
    "2026-11-15T14:00:00.000Z",
    "2026-11-15T14:45:00.000Z",
    "2026-11-15T15:30:00.000Z",
    "2026-11-15T16:15:00.000Z",
  ]);
});

it("hides a start that is already past and shifts the window with the date", async () => {
  // 2026-11-15 12:30 Belgrade.
  const app = buildApp({ now: () => new Date("2026-11-15T11:30:00.000Z") });
  await app.inject({ method: "POST", url: "/event-types", payload: hour });

  const starts = await slotStarts(app, "hour");

  expect(starts[0]).toBe("2026-11-15T12:00:00.000Z");
  expect(starts).not.toContain("2026-11-15T11:00:00.000Z");
  expect(starts.at(-1)).toBe("2026-11-28T16:00:00.000Z");

  // Late on 15 Nov, nothing of today is left; the window runs 16 Nov through 29 Nov.
  const tomorrow = buildApp({ now: () => new Date("2026-11-15T23:30:00.000Z") });
  await tomorrow.inject({ method: "POST", url: "/event-types", payload: hour });
  const shifted = await slotStarts(tomorrow, "hour");
  expect(shifted[0]).toBe("2026-11-16T08:00:00.000Z");
  expect(shifted.at(-1)).toBe("2026-11-29T16:00:00.000Z");
});

it("keeps 09:00 Belgrade time across the switch to summer time", async () => {
  // 2027-03-27 08:00 Belgrade (UTC+1); clocks move to UTC+2 on 28 March.
  const app = buildApp({ now: () => new Date("2027-03-27T07:00:00.000Z") });
  await app.inject({ method: "POST", url: "/event-types", payload: hour });

  const starts = await slotStarts(app, "hour");

  expect(starts).toContain("2027-03-27T08:00:00.000Z");
  expect(starts).toContain("2027-03-28T07:00:00.000Z");
  expect(starts).not.toContain("2027-03-28T06:00:00.000Z");
});

it("rejects Slots of an unknown Event type as a data error", async () => {
  const res = await buildApp().inject({ method: "GET", url: "/event-types/missing/slots" });

  expect(res.statusCode).toBe(400);
  expect(res.json()).toEqual({
    code: "data_error",
    message: "Проверьте данные и попробуйте ещё раз.",
  });
});

const dataError = {
  code: "data_error",
  message: "Проверьте данные и попробуйте ещё раз.",
};
const conflict = {
  code: "conflict",
  message: "Это время уже занято. Выберите другое.",
};

const ten = "2026-11-16T09:00:00.000Z"; // 16 Nov 10:00 Belgrade
const booking = {
  eventTypeId: "hour",
  start: ten,
  guestName: "Анна",
  guestEmail: "anna@example.com",
};

const appWith = async (...eventTypes: Array<typeof hour>) => {
  const app = buildApp({ now: () => beforeHours });
  for (const payload of eventTypes) {
    const created = await app.inject({ method: "POST", url: "/event-types", payload });
    expect(created.statusCode).toBe(201);
  }
  return app;
};

const book = (app: Injector, payload: object) =>
  app.inject({ method: "POST", url: "/bookings", payload });

it("Guest books a free Slot and gets the Booking back", async () => {
  const app = await appWith(hour);

  const res = await book(app, booking);

  expect(res.statusCode).toBe(201);
  const body = res.json() as Record<string, string>;
  expect(Object.keys(body).toSorted()).toEqual([
    "end",
    "eventTypeId",
    "guestEmail",
    "guestName",
    "start",
  ]);
  expect(body.eventTypeId).toBe("hour");
  expect(new Date(body.start ?? "").toISOString()).toBe(ten);
  expect(new Date(body.end ?? "").toISOString()).toBe("2026-11-16T10:00:00.000Z");
  expect(body.guestName).toBe("Анна");
  expect(body.guestEmail).toBe("anna@example.com");
});

it("shows a booked Slot as busy without the Guest's name or email", async () => {
  const app = await appWith(hour);
  expect((await book(app, booking)).statusCode).toBe(201);

  const listed = await app.inject({ method: "GET", url: "/event-types/hour/slots" });
  const slots = listed.json() as Array<{ start: string; status: string }>;
  const taken = slots.filter((slot) => slot.status === "busy");

  expect(taken).toEqual([{ start: expect.any(String), end: expect.any(String), status: "busy" }]);
  expect(new Date(taken[0]?.start ?? "").toISOString()).toBe(ten);
  expect(listed.body).not.toContain("Анна");
  expect(listed.body).not.toContain("anna@example.com");
});

it("blocks an overlapping Slot of another Event type", async () => {
  const half = { ...hour, id: "half", durationMinutes: 30 };
  const app = await appWith(hour, half);
  expect((await book(app, booking)).statusCode).toBe(201);

  // 10:30–11:00 sits inside 10:00–11:00.
  const res = await book(app, {
    ...booking,
    eventTypeId: "half",
    start: "2026-11-16T09:30:00.000Z",
  });

  expect(res.statusCode).toBe(409);
  expect(res.json()).toEqual(conflict);

  const halfSlots = (
    await app.inject({ method: "GET", url: "/event-types/half/slots" })
  ).json() as Array<{ start: string; status: string }>;
  const busy = halfSlots
    .filter((slot) => slot.status === "busy")
    .map((slot) => new Date(slot.start).toISOString());
  expect(busy).toEqual(["2026-11-16T09:00:00.000Z", "2026-11-16T09:30:00.000Z"]);
});

it("rejects booking the same Slot twice as a conflict", async () => {
  const app = await appWith(hour);
  expect((await book(app, booking)).statusCode).toBe(201);

  const again = await book(app, { ...booking, guestName: "Борис", guestEmail: "b@example.com" });

  expect(again.statusCode).toBe(409);
  expect(again.json()).toEqual(conflict);
});

it("allows a start at 11:00 right after a 10:00–11:00 Booking", async () => {
  const app = await appWith(hour);
  expect((await book(app, booking)).statusCode).toBe(201);

  const next = await book(app, { ...booking, start: "2026-11-16T10:00:00.000Z" });

  expect(next.statusCode).toBe(201);
});

it("leaves one Booking when two overlapping creates race", async () => {
  const app = await appWith(hour);

  const results = await Promise.all([
    book(app, booking),
    book(app, { ...booking, guestName: "Борис", guestEmail: "b@example.com" }),
  ]);

  expect(results.map((res) => res.statusCode).toSorted()).toEqual([201, 409]);
  const slots = (
    await app.inject({ method: "GET", url: "/event-types/hour/slots" })
  ).json() as Array<{
    status: string;
  }>;
  expect(slots.filter((slot) => slot.status === "busy")).toHaveLength(1);
});

it("lets the same name and email book again without any session", async () => {
  const app = await appWith(hour);
  expect((await book(app, booking)).statusCode).toBe(201);

  const second = await app.inject({
    method: "POST",
    url: "/bookings",
    headers: { cookie: "session=not-a-real-session" },
    payload: { ...booking, start: "2026-11-17T09:00:00.000Z" },
  });

  expect(second.statusCode).toBe(201);
});

it("rejects a start that is not an offered Slot as a data error", async () => {
  const app = await appWith(hour);
  const notOffered = [
    "2026-11-16T09:30:00.000Z", // off the 60-minute grid
    "2026-11-16T07:00:00.000Z", // 08:00, before working hours
    "2026-11-16T17:00:00.000Z", // 18:00, would end after hours
    "2026-11-15T06:00:00.000Z", // already past
    "2026-11-29T08:00:00.000Z", // the 15th day
  ];

  for (const start of notOffered) {
    const res = await book(app, { ...booking, start });
    expect({ start, status: res.statusCode, body: res.json() }).toEqual({
      start,
      status: 400,
      body: dataError,
    });
  }
});

it("rejects Booking fields outside the limits as a data error", async () => {
  const invalid = [
    { ...booking, eventTypeId: "missing" },
    { ...booking, guestName: "" },
    { ...booking, guestName: "н".repeat(121) },
    { ...booking, guestEmail: "" },
    { ...booking, guestEmail: "anna.example.com" },
    { ...booking, guestEmail: "@example.com" },
    { ...booking, guestEmail: "anna@" },
    { ...booking, guestEmail: "a@b@example.com" },
    { ...booking, guestEmail: `${"a".repeat(243)}@example.com` },
    { ...booking, start: "завтра" },
    { eventTypeId: "hour", start: ten, guestName: "Анна" },
    { eventTypeId: "hour", start: ten, guestEmail: "anna@example.com" },
  ];

  for (const payload of invalid) {
    const app = await appWith(hour);
    const res = await book(app, payload);
    expect({ payload, status: res.statusCode, body: res.json() }).toEqual({
      payload,
      status: 400,
      body: dataError,
    });
    const slots = (
      await app.inject({ method: "GET", url: "/event-types/hour/slots" })
    ).json() as Array<{
      status: string;
    }>;
    expect(slots.every((slot) => slot.status === "free")).toBe(true);
  }
});

it("accepts Booking fields at the limit boundaries", async () => {
  const app = await appWith(hour);

  const res = await book(app, {
    ...booking,
    guestName: "н".repeat(120),
    guestEmail: `${"a".repeat(242)}@example.com`,
  });

  expect(res.statusCode).toBe(201);
});
