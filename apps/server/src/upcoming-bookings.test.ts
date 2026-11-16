import { expect, it } from "vitest";
import { beforeHours, type Injector, ownerApp } from "./test-fixtures.js";

type ListedBooking = {
  id: string;
  eventTypeId: string;
  start: string;
  end: string;
  guestName: string;
  guestEmail: string;
};

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

const anya = {
  eventTypeId: "intro",
  start: "2026-11-16T09:00:00.000Z", // 16 Nov 10:00–11:00 Belgrade
  guestName: "Аня",
  guestEmail: "anya@example.com",
};

const boris = {
  eventTypeId: "review",
  start: "2026-11-17T13:00:00.000Z", // 17 Nov 14:00–14:30 Belgrade
  guestName: "Борис",
  guestEmail: "boris@example.com",
};

const bookedApp = () => ownerApp({ eventTypes: [intro, review], bookings: [boris, anya] });

// The contract sets no list order, so rows are compared sorted by Guest name.
const upcoming = async (app: Injector) => {
  const listed = await app.inject({ method: "GET", url: "/bookings" });
  expect(listed.statusCode).toBe(200);
  return (listed.json() as ListedBooking[])
    .map((booking) => ({
      ...booking,
      start: new Date(booking.start).toISOString(),
      end: new Date(booking.end).toISOString(),
    }))
    .toSorted((a, b) => a.guestName.localeCompare(b.guestName));
};

it("lists Upcoming Bookings of every Event type with name, email, type and interval", async () => {
  const { app } = await bookedApp();

  const bookings = await upcoming(app);

  expect(bookings).toEqual([
    {
      id: expect.any(String),
      eventTypeId: "intro",
      start: "2026-11-16T09:00:00.000Z",
      end: "2026-11-16T10:00:00.000Z",
      guestName: "Аня",
      guestEmail: "anya@example.com",
    },
    {
      id: expect.any(String),
      eventTypeId: "review",
      start: "2026-11-17T13:00:00.000Z",
      end: "2026-11-17T13:30:00.000Z",
      guestName: "Борис",
      guestEmail: "boris@example.com",
    },
  ]);
});

it("keeps a Booking in progress and drops an ended one without deleting it", async () => {
  const { app, clock } = await bookedApp();

  // 16 Nov 10:30 Belgrade: Anya's 10:00–11:00 is in progress.
  clock.now = new Date("2026-11-16T09:30:00.000Z");
  expect((await upcoming(app)).map((booking) => booking.guestName)).toEqual(["Аня", "Борис"]);

  // 16 Nov 11:00 Belgrade: Anya's interval has just ended.
  clock.now = new Date("2026-11-16T10:00:00.000Z");
  expect((await upcoming(app)).map((booking) => booking.guestName)).toEqual(["Борис"]);

  // Back before it started, the ended Booking is listed again: it was stored all along.
  clock.now = beforeHours;
  expect((await upcoming(app)).map((booking) => booking.guestName)).toEqual(["Аня", "Борис"]);
});

it("gives each listed Booking its own id", async () => {
  const { app } = await bookedApp();

  const ids = (await upcoming(app)).map((booking) => booking.id);

  expect(ids).toEqual([expect.stringMatching(/.+/), expect.stringMatching(/.+/)]);
  expect(new Set(ids).size).toBe(2);
});

it("needs no session to read the list", async () => {
  const { app } = await bookedApp();

  const listed = await app.inject({
    method: "GET",
    url: "/bookings",
    headers: { cookie: "session=not-a-real-session" },
  });

  expect(listed.statusCode).toBe(200);
  expect(listed.json()).toHaveLength(2);
});
