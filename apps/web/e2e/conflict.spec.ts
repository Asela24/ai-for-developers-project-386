import { expect, test } from "@playwright/test";
import { dayNameOf, openDay, slotList, timeOf } from "./guest-view";
import { apiPort } from "./ports";

const api = `http://127.0.0.1:${apiPort}`;

test("Guest sees the conflict phrase when the Slot was taken while filling the form", async ({
  page,
}) => {
  // Name, description and duration differ from other scenarios on the same server.
  const created = await fetch(`${api}/event-types`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      id: "contract-call",
      name: "Созвон по договору",
      description: "Короткое согласование условий",
      durationMinutes: 30,
    }),
  });
  expect(created.status).toBe(201);

  // An eighth into the window; other scenarios take other Slots.
  const slots = (await (await fetch(`${api}/event-types/contract-call/slots`)).json()) as Array<{
    start: string;
    status: string;
  }>;
  const free = slots.filter((slot) => slot.status === "free");
  const start = free[Math.floor(free.length / 8)]?.start ?? "";
  const dayName = dayNameOf(start);
  const time = timeOf(start);

  await page.goto("/event-types");
  await page.getByRole("link", { name: "Созвон по договору" }).click();
  await openDay(page, dayName);
  await slotList(page).getByRole("button", { name: time, exact: true }).click();
  await page.getByRole("button", { name: "Продолжить" }).click();
  await page.getByLabel("Имя").fill("Глеб");
  await page.getByLabel("Почта").fill("gleb@example.com");

  // Another Guest takes the same Slot before this one submits.
  const taken = await fetch(`${api}/bookings`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      eventTypeId: "contract-call",
      start,
      guestName: "Дина",
      guestEmail: "dina@example.com",
    }),
  });
  expect(taken.status).toBe(201);

  await page.getByRole("button", { name: "Забронировать" }).click();

  await expect(page.getByRole("alert")).toHaveText("Это время уже занято. Выберите другое.");
  await expect(page.getByRole("heading", { name: "Бронирование создано" })).toHaveCount(0);

  await page.getByRole("button", { name: "Назад" }).click();
  await expect(slotList(page).getByRole("button", { name: `${time} занято` })).toBeDisabled();
});
