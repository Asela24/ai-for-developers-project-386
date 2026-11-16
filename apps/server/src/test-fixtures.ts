// Shared by the API tests; excluded from the build.
import { expect } from "vitest";
import { buildApp } from "./app.js";

// Awaiting the app (it is thenable) changes its type, so helpers only ask for `inject`.
export type Injector = Pick<ReturnType<typeof buildApp>, "inject">;

type EventTypePayload = { id: string; name: string; description: string; durationMinutes: number };
type BookingPayload = { eventTypeId: string; start: string; guestName: string; guestEmail: string };

// 2026-11-15 08:00 Europe/Belgrade (UTC+1), before working hours, so the whole grid is offered.
export const beforeHours = new Date("2026-11-15T07:00:00.000Z");

export const hour: EventTypePayload = {
  id: "hour",
  name: "Час",
  description: "Час на задачу",
  durationMinutes: 60,
};

export const dataError = {
  code: "data_error",
  message: "Проверьте данные и попробуйте ещё раз.",
};

export const conflict = {
  code: "conflict",
  message: "Это время уже занято. Выберите другое.",
};

/**
 * An app with these Event types and Bookings created, in that order. Its clock starts at
 * `beforeHours` and is a variable so a test can move "now" after the Bookings exist.
 */
export const ownerApp = async ({
  eventTypes = [],
  bookings = [],
}: {
  eventTypes?: EventTypePayload[];
  bookings?: BookingPayload[];
}) => {
  const clock = { now: beforeHours };
  const app = buildApp({ now: () => clock.now });
  for (const payload of eventTypes) {
    expect((await app.inject({ method: "POST", url: "/event-types", payload })).statusCode).toBe(
      201,
    );
  }
  for (const payload of bookings) {
    expect((await app.inject({ method: "POST", url: "/bookings", payload })).statusCode).toBe(201);
  }
  return { app, clock };
};

/** The status of the Slot of this Event type that starts at `start`, if one is offered. */
export const slotStatus = async (app: Injector, eventTypeId: string, start: string) => {
  const listed = await app.inject({ method: "GET", url: `/event-types/${eventTypeId}/slots` });
  expect(listed.statusCode).toBe(200);
  const slots = listed.json() as Array<{ start: string; status: string }>;
  return slots.find((slot) => new Date(slot.start).toISOString() === start)?.status;
};
