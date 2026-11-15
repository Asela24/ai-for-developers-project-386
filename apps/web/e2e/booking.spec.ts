import { expect, test } from "@playwright/test";
import { apiPort } from "./ports";

test("Guest selects an Event type, opens 14 days, and books a free Slot", async ({ page }) => {
  const created = await fetch(`http://127.0.0.1:${apiPort}/event-types`, {
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

  await page.goto("/");
  await expect(page.getByText("Подробный разбор задачи")).toBeVisible();
  await expect(page.getByText("60 минут")).toBeVisible();
  await page.getByRole("link", { name: "Разбор" }).click();

  await expect(page.getByRole("heading", { name: "Разбор" })).toBeVisible();
  const days = page.getByRole("region");
  await expect(days.first()).toBeVisible();
  // Today may already have no start left, so the view lists 13 or 14 days.
  expect(await days.count()).toBeGreaterThanOrEqual(13);
  expect(await days.count()).toBeLessThanOrEqual(14);

  const freeSlot = page.getByRole("button", { name: /^\d{2}:\d{2}$/ });
  const day = days.filter({ has: freeSlot }).first();
  const dayName = (await day.getAttribute("aria-label")) ?? "";
  const free = day.getByRole("button", { name: /^\d{2}:\d{2}$/ }).first();
  const time = (await free.textContent())?.trim() ?? "";
  await free.click();

  await page.getByLabel("Имя").fill("Анна");
  await page.getByLabel("Почта").fill("anna@example.com");
  await page.getByRole("button", { name: "Записаться" }).click();

  await expect(page.getByText(`Вы записаны: ${dayName}, ${time}`)).toBeVisible();
  const taken = page
    .getByRole("region", { name: dayName })
    .getByRole("button", { name: `${time} занято` });
  await expect(taken).toBeDisabled();
  await expect(page.getByText("anna@example.com")).toHaveCount(0);
});
