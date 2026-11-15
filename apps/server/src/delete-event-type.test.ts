import { expect, it } from "vitest";
import { buildApp } from "./app.js";

type Injector = Pick<ReturnType<typeof buildApp>, "inject">;

const intro = {
  id: "intro",
  name: "Знакомство",
  description: "Первый разговор о задаче",
  durationMinutes: 60,
};

const review = {
  id: "review",
  name: "Разбор",
  description: "Подробный разбор задачи",
  durationMinutes: 30,
};

// 2026-11-15 08:00 Europe/Belgrade (UTC+1), before working hours.
const beforeHours = new Date("2026-11-15T07:00:00.000Z");

const anyaIntro = {
  eventTypeId: "intro",
  start: "2026-11-16T09:00:00.000Z", // 16 Nov 10:00–11:00 Belgrade
  guestName: "Аня",
  guestEmail: "anya@example.com",
};

const borisReview = {
  eventTypeId: "review",
  start: "2026-11-17T13:00:00.000Z", // 17 Nov 14:00–14:30 Belgrade
  guestName: "Борис",
  guestEmail: "boris@example.com",
};

// The clock is a variable so a test can move "now" after the Bookings exist.
const ownerApp = async () => {
  const clock = { now: beforeHours };
  const app = buildApp({ now: () => clock.now });
  for (const payload of [intro, review]) {
    expect((await app.inject({ method: "POST", url: "/event-types", payload })).statusCode).toBe(
      201,
    );
  }
  for (const payload of [anyaIntro, borisReview]) {
    expect((await app.inject({ method: "POST", url: "/bookings", payload })).statusCode).toBe(201);
  }
  return { app, clock };
};

const deleteEventType = (app: Injector, id: string) =>
  app.inject({ method: "DELETE", url: `/event-types/${id}` });

const upcomingGuests = async (app: Injector) => {
  const listed = await app.inject({ method: "GET", url: "/bookings" });
  expect(listed.statusCode).toBe(200);
  // The contract sets no list order.
  return (listed.json() as Array<{ guestName: string }>)
    .map((booking) => booking.guestName)
    .toSorted();
};

const slotStatus = async (app: Injector, eventTypeId: string, start: string) => {
  const listed = await app.inject({ method: "GET", url: `/event-types/${eventTypeId}/slots` });
  expect(listed.statusCode).toBe(200);
  const slots = listed.json() as Array<{ start: string; status: string }>;
  return slots.find((slot) => new Date(slot.start).toISOString() === start)?.status;
};

it("deletes an Event type that has Bookings, and those Bookings with it", async () => {
  const { app } = await ownerApp();

  const deleted = await deleteEventType(app, "intro");

  expect(deleted.statusCode).toBe(204);
  expect(await upcomingGuests(app)).toEqual(["Борис"]);
});

it("removes the deleted Event type from what a Guest reads", async () => {
  const { app } = await ownerApp();

  await deleteEventType(app, "intro");

  const listed = await app.inject({ method: "GET", url: "/event-types" });
  expect(listed.json()).toEqual([review]);
  const slots = await app.inject({ method: "GET", url: "/event-types/intro/slots" });
  expect(slots.statusCode).toBe(400);
  expect(slots.json()).toMatchObject({ code: "data_error" });
  const booking = await app.inject({ method: "POST", url: "/bookings", payload: anyaIntro });
  expect(booking.statusCode).toBe(400);
  expect(booking.json()).toMatchObject({ code: "data_error" });
});

it("frees the intervals of the deleted Bookings for other Event types", async () => {
  const { app } = await ownerApp();
  // 10:00 and 10:30 of 16 Nov sit inside Anya's 10:00–11:00 intro Booking.
  expect(await slotStatus(app, "review", "2026-11-16T09:30:00.000Z")).toBe("busy");

  await deleteEventType(app, "intro");

  expect(await slotStatus(app, "review", "2026-11-16T09:30:00.000Z")).toBe("free");
  const rebooked = await app.inject({
    method: "POST",
    url: "/bookings",
    payload: { ...anyaIntro, eventTypeId: "review", start: "2026-11-16T09:30:00.000Z" },
  });
  expect(rebooked.statusCode).toBe(201);
});

it("keeps the Bookings of other Event types busy", async () => {
  const { app } = await ownerApp();

  await deleteEventType(app, "intro");

  expect(await slotStatus(app, "review", "2026-11-17T13:00:00.000Z")).toBe("busy");
});

it("deletes ended Bookings of the Event type too", async () => {
  const { app, clock } = await ownerApp();
  // After Anya's intro has ended but before Boris's review starts.
  clock.now = new Date("2026-11-16T12:00:00.000Z");
  expect(await upcomingGuests(app)).toEqual(["Борис"]);

  expect((await deleteEventType(app, "intro")).statusCode).toBe(204);

  // Back before that interval: a stored ended Booking would show again here.
  clock.now = beforeHours;
  expect(await upcomingGuests(app)).toEqual(["Борис"]);
  expect(await slotStatus(app, "review", "2026-11-16T09:00:00.000Z")).toBe("free");
});

it("answers an unknown Event type id with data_error", async () => {
  const { app } = await ownerApp();

  const deleted = await deleteEventType(app, "no-such-type");

  expect(deleted.statusCode).toBe(400);
  expect(deleted.json()).toEqual({
    code: "data_error",
    message: "Проверьте данные и попробуйте ещё раз.",
  });
  expect(await upcomingGuests(app)).toEqual(["Аня", "Борис"]);
});
