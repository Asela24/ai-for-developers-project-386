import { expect, test } from "@playwright/test";
import { apiPort } from "./ports";

const api = `http://127.0.0.1:${apiPort}`;
const zone = "Europe/Belgrade";

const createEventType = async (id: string, name: string, description: string) => {
  const res = await fetch(`${api}/event-types`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id, name, description, durationMinutes: 120 }),
  });
  expect(res.status).toBe(201);
};

test("a Slot booked through another Event type shows as busy", async ({ page }) => {
  // Names, descriptions and duration differ from other scenarios on the same server.
  await createEventType("call", "Созвон", "Короткий созвон по плану");
  await createEventType("code-review", "Ревью кода", "Ревью pull request");

  // Book the last free Slot of "call"; other scenarios take the first ones.
  const slots = (await (await fetch(`${api}/event-types/call/slots`)).json()) as Array<{
    start: string;
    status: string;
  }>;
  const target = slots.filter((slot) => slot.status === "free").at(-1);
  expect(target).toBeDefined();
  const start = target?.start ?? "";
  const booked = await fetch(`${api}/bookings`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      eventTypeId: "call",
      start,
      guestName: "Анна",
      guestEmail: "anna@example.com",
    }),
  });
  expect(booked.status).toBe(201);

  const when = new Date(start);
  const dayName = new Intl.DateTimeFormat("ru-RU", {
    timeZone: zone,
    weekday: "short",
    day: "numeric",
    month: "long",
  }).format(when);
  const time = new Intl.DateTimeFormat("ru-RU", {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(when);

  await page.goto("/");
  await page.getByRole("link", { name: "Ревью кода" }).click();
  await expect(page.getByRole("heading", { name: "Ревью кода" })).toBeVisible();

  const day = page.getByRole("region", { name: dayName });
  await expect(day.getByRole("button", { name: `${time} занято` })).toBeDisabled();
  await expect(day.getByRole("button", { name: time, exact: true })).toHaveCount(0);
  await expect(page.getByText("anna@example.com")).toHaveCount(0);
});
