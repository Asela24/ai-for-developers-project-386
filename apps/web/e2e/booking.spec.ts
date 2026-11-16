import { expect, test } from "@playwright/test";
import { dayNameOf, openDay, slotList, timeOf } from "./guest-view";
import { apiPort } from "./ports";

const api = `http://127.0.0.1:${apiPort}`;

test("Guest selects an Event type, opens 14 days, and books a free Slot", async ({ page }) => {
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

  await page.getByLabel("Имя").fill("Анна");
  await page.getByLabel("Почта").fill("anna@example.com");
  await page.getByRole("button", { name: "Забронировать" }).click();

  await expect(page.getByText(`Бронирование создано: ${dayName}, ${time}`)).toBeVisible();
  await expect(slotList(page).getByRole("button", { name: `${time} занято` })).toBeDisabled();
  await expect(page.getByText("anna@example.com")).toHaveCount(0);
});
