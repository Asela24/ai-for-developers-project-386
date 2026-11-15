import { expect, it } from "vitest";
import { buildApp } from "./app.js";

// Awaiting the app (it is thenable) changes its type, so helpers only ask for `inject`.
type Injector = Pick<ReturnType<typeof buildApp>, "inject">;

const hour = { id: "hour", name: "Час", description: "Час на задачу", durationMinutes: 60 };
const half = { id: "half", name: "Полчаса", description: "Полчаса на задачу", durationMinutes: 30 };

// 2026-11-15 08:00 Europe/Belgrade (UTC+1), before working hours.
const beforeHours = new Date("2026-11-15T07:00:00.000Z");

// 16 Nov 10:00–11:00 Belgrade.
const ten = "2026-11-16T09:00:00.000Z";
// 16 Nov 10:30–11:00 Belgrade, inside the 10:00 Booking.
const tenThirty = "2026-11-16T09:30:00.000Z";

const anya = { eventTypeId: "hour", start: ten, guestName: "Аня", guestEmail: "anya@example.com" };

const ownerApp = async () => {
  const app = buildApp({ now: () => beforeHours });
  for (const payload of [hour, half]) {
    expect((await app.inject({ method: "POST", url: "/event-types", payload })).statusCode).toBe(
      201,
    );
  }
  const created = await app.inject({ method: "POST", url: "/bookings", payload: anya });
  expect(created.statusCode).toBe(201);
  // The create response carries no id: the Owner takes it from the Owner list.
  const listed = await app.inject({ method: "GET", url: "/bookings" });
  const [booking] = listed.json() as Array<{ id: string }>;
  return { app, id: booking?.id ?? "" };
};

const statusAt = async (app: Injector, eventTypeId: string, start: string) => {
  const listed = await app.inject({ method: "GET", url: `/event-types/${eventTypeId}/slots` });
  const slots = listed.json() as Array<{ start: string; status: string }>;
  return slots.find((slot) => new Date(slot.start).toISOString() === start)?.status;
};

it("frees the interval for every Event type once the Owner deletes the Booking", async () => {
  const { app, id } = await ownerApp();
  expect(await statusAt(app, "hour", ten)).toBe("busy");
  expect(await statusAt(app, "half", tenThirty)).toBe("busy");

  const deleted = await app.inject({ method: "DELETE", url: `/bookings/${id}` });

  expect(deleted.statusCode).toBe(204);
  expect(await statusAt(app, "hour", ten)).toBe("free");
  expect(await statusAt(app, "half", tenThirty)).toBe("free");
  const rebooked = await app.inject({
    method: "POST",
    url: "/bookings",
    payload: { ...anya, eventTypeId: "half", start: tenThirty, guestName: "Борис" },
  });
  expect(rebooked.statusCode).toBe(201);
});

it("drops the deleted Booking from the Owner list and keeps the others", async () => {
  const { app, id } = await ownerApp();
  const other = await app.inject({
    method: "POST",
    url: "/bookings",
    payload: { ...anya, start: "2026-11-17T09:00:00.000Z", guestName: "Борис" },
  });
  expect(other.statusCode).toBe(201);

  await app.inject({ method: "DELETE", url: `/bookings/${id}` });

  const listed = await app.inject({ method: "GET", url: "/bookings" });
  expect((listed.json() as Array<{ guestName: string }>).map((b) => b.guestName)).toEqual([
    "Борис",
  ]);
});

it("answers a data error for an unknown or already deleted Booking", async () => {
  const { app, id } = await ownerApp();
  await app.inject({ method: "DELETE", url: `/bookings/${id}` });

  for (const unknown of [id, "no-such-booking"]) {
    const again = await app.inject({ method: "DELETE", url: `/bookings/${unknown}` });
    expect(again.statusCode).toBe(400);
    expect(again.json()).toEqual({
      code: "data_error",
      message: "Проверьте данные и попробуйте ещё раз.",
    });
  }
});

it("needs no session to delete a Booking", async () => {
  const { app, id } = await ownerApp();

  const deleted = await app.inject({
    method: "DELETE",
    url: `/bookings/${id}`,
    headers: { cookie: "session=not-a-real-session" },
  });

  expect(deleted.statusCode).toBe(204);
});

it("offers the Guest no operation that deletes a Booking", async () => {
  const { app } = await ownerApp();

  // A Guest only knows the Event type and the Slot start: neither is a way to delete.
  for (const url of ["/event-types/hour/slots", "/bookings", `/event-types/hour/slots/${ten}`]) {
    const attempt = await app.inject({ method: "DELETE", url });
    expect(attempt.statusCode).toBe(404);
  }
  expect(await statusAt(app, "hour", ten)).toBe("busy");
});
