import { expect, test } from "@playwright/test";
import { dayNameOf, openDay, slotList, timeOf } from "./guest-view";
import { apiPort } from "./ports";

const api = `http://127.0.0.1:${apiPort}`;

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
  await createEventType("onboarding", "Онбординг", "Первые шаги нового участника");
  await createEventType("code-review", "Ревью кода", "Ревью pull request");

  // Book the last free Slot of "onboarding"; other scenarios take the first ones.
  const slots = (await (await fetch(`${api}/event-types/onboarding/slots`)).json()) as Array<{
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
      eventTypeId: "onboarding",
      start,
      guestName: "Анна",
      guestEmail: "anna@example.com",
    }),
  });
  expect(booked.status).toBe(201);

  const dayName = dayNameOf(start);
  const time = timeOf(start);

  await page.goto("/event-types");
  await page.getByRole("link", { name: "Ревью кода" }).click();
  await expect(page.getByRole("heading", { name: "Ревью кода", level: 1 })).toBeVisible();

  await openDay(page, dayName);
  const day = slotList(page);
  await expect(day.getByRole("button", { name: `${time} занято` })).toBeDisabled();
  await expect(day.getByRole("button", { name: time, exact: true })).toHaveCount(0);
  await expect(page.getByText("anna@example.com")).toHaveCount(0);
});
