import { expect, test } from "@playwright/test";
import { dayNameOf, openDay, slotList, timeOf } from "./guest-view";
import { apiPort } from "./ports";

const api = `http://127.0.0.1:${apiPort}`;

test("after the Owner deletes a Booking its Slot shows as free again", async ({ page }) => {
  // Name, description and duration differ from other scenarios on the same server.
  const created = await fetch(`${api}/event-types`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      id: "consultation",
      name: "Консультация",
      description: "Обсуждение архитектуры сервиса",
      durationMinutes: 90,
    }),
  });
  expect(created.status).toBe(201);

  // Book a free Slot from the middle of the window; other scenarios take the first and last.
  const slots = (await (await fetch(`${api}/event-types/consultation/slots`)).json()) as Array<{
    start: string;
    status: string;
  }>;
  const free = slots.filter((slot) => slot.status === "free");
  const start = free[Math.floor(free.length / 2)]?.start ?? "";
  const booked = await fetch(`${api}/bookings`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      eventTypeId: "consultation",
      start,
      guestName: "Вера",
      guestEmail: "vera@example.com",
    }),
  });
  expect(booked.status).toBe(201);
  // The Guest gets no id back; the Owner finds the Booking in the Owner list.
  const listed = (await (await fetch(`${api}/bookings`)).json()) as Array<{
    id: string;
    eventTypeId: string;
  }>;
  const id = listed.find((booking) => booking.eventTypeId === "consultation")?.id ?? "";

  const dayName = dayNameOf(start);
  const time = timeOf(start);

  await page.goto("/event-types");
  await page.getByRole("link", { name: "Консультация" }).click();
  await expect(page.getByRole("heading", { name: "Консультация", level: 1 })).toBeVisible();
  await openDay(page, dayName);
  const day = slotList(page);
  await expect(day.getByRole("button", { name: `${time} занято` })).toBeDisabled();
  // The Guest view offers no way to delete a Booking.
  await expect(page.getByRole("button", { name: /удал/i })).toHaveCount(0);

  const deleted = await fetch(`${api}/bookings/${id}`, { method: "DELETE" });
  expect(deleted.status).toBe(204);

  await page.reload();
  await openDay(page, dayName);
  await expect(day.getByRole("button", { name: time, exact: true })).toBeEnabled();
  await expect(day.getByRole("button", { name: `${time} занято` })).toHaveCount(0);
});
