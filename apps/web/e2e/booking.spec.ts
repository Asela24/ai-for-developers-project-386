import { expect, test } from "@playwright/test";
import { dayNameOf, openDay, slotList, timeOf } from "./guest-view";
import { apiPort } from "./ports";

const api = `http://127.0.0.1:${apiPort}`;

test("Guest books a free Slot and the Owner sees it in the upcoming Bookings", async ({ page }) => {
  const created = await fetch(`${api}/event-types`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      id: "review",
      name: "Разбор",
      description: "Подробный разбор задачи",
      durationMinutes: 60,
    }),
  });
  expect(created.status).toBe(201);

  // Book a free Slot two thirds into the window; other scenarios take other Slots.
  const slots = (await (await fetch(`${api}/event-types/review/slots`)).json()) as Array<{
    start: string;
    status: string;
  }>;
  const free = slots.filter((slot) => slot.status === "free");
  const start = free[Math.floor((free.length * 2) / 3)]?.start ?? "";
  const dayName = dayNameOf(start);
  const time = timeOf(start);

  await page.goto("/");
  await page.getByRole("link", { name: "Забронировать →" }).click();
  await expect(page.getByRole("heading", { name: "Выберите тип события" })).toBeVisible();
  await expect(page.getByText("Подробный разбор задачи")).toBeVisible();
  const card = page.getByRole("link", { name: "Разбор" });
  await expect(card).toContainText("60 мин");
  await card.click();

  await expect(page.getByRole("heading", { name: "Разбор", level: 1 })).toBeVisible();
  await expect(slotList(page).getByRole("listitem").first()).toBeVisible();

  // Only days of the window are selectable: 14, or 13 when today has no start left.
  const dayButton = /^[а-я]{2}, \d{1,2} [а-я]+$/;
  const selectable = new Set<string>();
  const collect = async () => {
    for (const button of await page.getByRole("button", { name: dayButton }).all()) {
      if (await button.isEnabled()) selectable.add((await button.getAttribute("aria-label")) ?? "");
    }
  };
  await collect();
  const next = page.getByRole("button", { name: "Следующий месяц" });
  if (await next.isEnabled()) {
    await next.click();
    await collect();
    await page.getByRole("button", { name: "Предыдущий месяц" }).click();
  }
  expect(selectable.size).toBeGreaterThanOrEqual(13);
  expect(selectable.size).toBeLessThanOrEqual(14);

  await openDay(page, dayName);
  await expect(page.getByRole("button", { name: "Продолжить" })).toBeDisabled();
  await slotList(page).getByRole("button", { name: time, exact: true }).click();
  await page.getByRole("button", { name: "Продолжить" }).click();

  await page.getByLabel("Имя").fill("Лидия");
  await page.getByLabel("Почта").fill("lidia@example.com");
  await page.getByRole("button", { name: "Забронировать" }).click();

  // The confirmation is a screen of its own: the calendar, Slots and form are gone.
  const confirmation = page.getByRole("status");
  await expect(confirmation.getByRole("heading", { name: "Бронирование создано" })).toBeVisible();
  await expect(confirmation).toContainText(`${dayName}, ${time}`);
  await expect(slotList(page)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Забронировать", exact: true })).toHaveCount(0);
  await expect(page.getByText("lidia@example.com")).toHaveCount(0);

  await page.getByRole("button", { name: "Забронировать ещё" }).click();
  await openDay(page, dayName);
  await expect(slotList(page).getByRole("button", { name: `${time} занято` })).toBeDisabled();

  // The Owner sees the Guest’s Booking in the upcoming list.
  await page.goto("/");
  await page.getByRole("link", { name: "Owner" }).click();
  const upcoming = page.getByRole("region", { name: "Предстоящие бронирования" });
  const booking = upcoming.getByRole("listitem").filter({ hasText: "lidia@example.com" });
  await expect(booking).toContainText("Лидия");
  await expect(booking).toContainText("Разбор");
  await expect(booking).toContainText(`${dayName}, ${time}`);
});
