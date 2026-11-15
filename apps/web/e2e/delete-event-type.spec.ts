import { expect, test } from "@playwright/test";
import { apiPort } from "./ports";

const api = `http://127.0.0.1:${apiPort}`;

test("an Event type the Owner deleted with its Bookings is gone from the Guest page", async ({
  page,
}) => {
  // Names, descriptions and durations differ from other scenarios on the same server.
  const createEventType = async (
    id: string,
    name: string,
    description: string,
    minutes: number,
  ) => {
    const res = await fetch(`${api}/event-types`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, name, description, durationMinutes: minutes }),
    });
    expect(res.status).toBe(201);
  };
  await createEventType(
    "retired-type",
    "Стратегическая сессия",
    "Планирование квартала целиком",
    90,
  );
  // Stays, so the reloaded page shows it has loaded the list.
  await createEventType("kept-type", "Ретроспектива", "Итоги прошедшего спринта", 75);

  // Book a Slot a quarter into the window; other scenarios take the first, middle and last ones.
  const slots = (await (await fetch(`${api}/event-types/retired-type/slots`)).json()) as Array<{
    start: string;
    status: string;
  }>;
  const free = slots.filter((slot) => slot.status === "free");
  const booked = await fetch(`${api}/bookings`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      eventTypeId: "retired-type",
      start: free[Math.floor(free.length / 4)]?.start,
      guestName: "Глеб",
      guestEmail: "gleb@example.com",
    }),
  });
  expect(booked.status).toBe(201);

  await page.goto("/");
  await expect(page.getByRole("link", { name: "Стратегическая сессия" })).toBeVisible();

  const deleted = await fetch(`${api}/event-types/retired-type`, { method: "DELETE" });
  expect(deleted.status).toBe(204);

  await page.reload();
  await expect(page.getByRole("link", { name: "Ретроспектива" })).toBeVisible();
  await expect(page.getByText("Стратегическая сессия")).toHaveCount(0);
  await expect(page.getByText("Планирование квартала целиком")).toHaveCount(0);

  const upcoming = (await (await fetch(`${api}/bookings`)).json()) as Array<{
    eventTypeId: string;
  }>;
  expect(upcoming.filter((booking) => booking.eventTypeId === "retired-type")).toEqual([]);
});
