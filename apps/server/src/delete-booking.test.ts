import { expect, it } from "vitest";
import { dataError, hour, ownerApp, slotStatus } from "./test-fixtures.js";

const half = { id: "half", name: "Полчаса", description: "Полчаса на задачу", durationMinutes: 30 };

// 16 Nov 10:00–11:00 Belgrade.
const ten = "2026-11-16T09:00:00.000Z";
// 16 Nov 10:30–11:00 Belgrade, inside the 10:00 Booking.
const tenThirty = "2026-11-16T09:30:00.000Z";

const anya = { eventTypeId: "hour", start: ten, guestName: "Аня", guestEmail: "anya@example.com" };

// The create response carries no id: the Owner takes it from the Owner list.
const appWithAnya = async () => {
  const { app } = await ownerApp({ eventTypes: [hour, half], bookings: [anya] });
  const listed = await app.inject({ method: "GET", url: "/bookings" });
  const [booking] = listed.json() as Array<{ id: string }>;
  return { app, id: booking?.id ?? "" };
};

it("frees the interval for every Event type once the Owner deletes the Booking", async () => {
  const { app, id } = await appWithAnya();
  expect(await slotStatus(app, "hour", ten)).toBe("busy");
  expect(await slotStatus(app, "half", tenThirty)).toBe("busy");

  const deleted = await app.inject({ method: "DELETE", url: `/bookings/${id}` });

  expect(deleted.statusCode).toBe(204);
  expect(await slotStatus(app, "hour", ten)).toBe("free");
  expect(await slotStatus(app, "half", tenThirty)).toBe("free");
  const rebooked = await app.inject({
    method: "POST",
    url: "/bookings",
    payload: { ...anya, eventTypeId: "half", start: tenThirty, guestName: "Борис" },
  });
  expect(rebooked.statusCode).toBe(201);
});

it("drops the deleted Booking from the Owner list and keeps the others", async () => {
  const { app, id } = await appWithAnya();
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
  const { app, id } = await appWithAnya();
  await app.inject({ method: "DELETE", url: `/bookings/${id}` });

  for (const unknown of [id, "no-such-booking"]) {
    const again = await app.inject({ method: "DELETE", url: `/bookings/${unknown}` });
    expect(again.statusCode).toBe(400);
    expect(again.json()).toEqual(dataError);
  }
});

it("needs no session to delete a Booking", async () => {
  const { app, id } = await appWithAnya();

  const deleted = await app.inject({
    method: "DELETE",
    url: `/bookings/${id}`,
    headers: { cookie: "session=not-a-real-session" },
  });

  expect(deleted.statusCode).toBe(204);
});

it("offers the Guest no operation that deletes a Booking", async () => {
  const { app } = await appWithAnya();

  // A Guest only knows the Event type and the Slot start: neither is a way to delete.
  for (const url of ["/event-types/hour/slots", "/bookings", `/event-types/hour/slots/${ten}`]) {
    const attempt = await app.inject({ method: "DELETE", url });
    expect(attempt.statusCode).toBe(404);
  }
  expect(await slotStatus(app, "hour", ten)).toBe("busy");
});
