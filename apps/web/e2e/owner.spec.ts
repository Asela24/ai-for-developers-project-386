import { expect, test } from "@playwright/test";
import { apiPort } from "./ports";

const api = `http://127.0.0.1:${apiPort}`;
const zone = "Europe/Belgrade";

const intervalLabel = (start: string, end: string) => {
  const day = new Intl.DateTimeFormat("ru-RU", {
    timeZone: zone,
    weekday: "short",
    day: "numeric",
    month: "long",
  }).format(new Date(start));
  const time = new Intl.DateTimeFormat("ru-RU", {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  return `${day}, ${time.format(new Date(start))}–${time.format(new Date(end))}`;
};

// A Guest books a Slot three quarters into the window; other scenarios take other Slots.
const bookAsGuest = async (eventTypeId: string, guestName: string, guestEmail: string) => {
  const slots = (await (await fetch(`${api}/event-types/${eventTypeId}/slots`)).json()) as Array<{
    start: string;
    end: string;
    status: string;
  }>;
  const free = slots.filter((slot) => slot.status === "free");
  const slot = free[Math.floor((free.length * 3) / 4)];
  expect(slot).toBeDefined();
  const booked = await fetch(`${api}/bookings`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ eventTypeId, start: slot?.start, guestName, guestEmail }),
  });
  expect(booked.status).toBe(201);
  return intervalLabel(slot?.start ?? "", slot?.end ?? "");
};

test("Owner creates an Event type, sees and deletes its Bookings, then deletes the type", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Owner" }).click();
  await expect(page.getByRole("heading", { name: "Owner", level: 1 })).toBeVisible();

  // Name, description and duration differ from other scenarios on the same server.
  const form = page.getByRole("form", { name: "Новый тип события" });
  await form.getByLabel("Id").fill("owner-intro");
  await form.getByLabel("Название").fill("Вводная сессия");
  await form.getByLabel("Описание").fill("Знакомство с проектом и командой");
  await form.getByLabel("Длительность, минут").fill("45");
  await form.getByRole("button", { name: "Создать" }).click();

  const types = page.getByRole("region", { name: "Типы событий" });
  const created = types.getByRole("listitem").filter({ hasText: "Вводная сессия" });
  await expect(created).toContainText("45 мин");
  await expect(created).toContainText("Знакомство с проектом и командой");

  // The same id again is the data_error of the contract, shown with its phrase.
  await form.getByLabel("Id").fill("owner-intro");
  await form.getByLabel("Название").fill("Повтор");
  await form.getByLabel("Описание").fill("Тот же id");
  await form.getByLabel("Длительность, минут").fill("45");
  await form.getByRole("button", { name: "Создать" }).click();
  await expect(page.getByRole("alert")).toHaveText("Проверьте данные и попробуйте ещё раз.");
  await expect(types.getByText("Повтор")).toHaveCount(0);

  // The description may be empty (spec #6).
  await form.getByLabel("Id", { exact: true }).fill("owner-no-description");
  await form.getByLabel("Название").fill("Без описания");
  await form.getByLabel("Описание").fill("");
  await form.getByLabel("Длительность, минут").fill("15");
  await form.getByRole("button", { name: "Создать" }).click();
  await expect(types.getByRole("listitem").filter({ hasText: "Без описания" })).toContainText(
    "15 мин",
  );

  const firstInterval = await bookAsGuest("owner-intro", "Олег", "oleg@example.com");
  await page.reload();
  const upcoming = page.getByRole("region", { name: "Предстоящие бронирования" });
  const booking = upcoming.getByRole("listitem").filter({ hasText: "oleg@example.com" });
  await expect(booking).toContainText("Олег");
  await expect(booking).toContainText("Вводная сессия");
  await expect(booking).toContainText(firstInterval);

  await booking.getByRole("button", { name: "Удалить бронирование" }).click();
  await expect(upcoming.getByText("oleg@example.com")).toHaveCount(0);

  await bookAsGuest("owner-intro", "Нина", "nina@example.com");
  await page.reload();
  await expect(upcoming.getByText("nina@example.com")).toBeVisible();

  await created.getByRole("button", { name: "Удалить тип" }).click();
  await expect(created).toContainText("Вместе с типом удалятся все его бронирования.");
  await created.getByRole("button", { name: "Удалить вместе с бронированиями" }).click();

  await expect(types.getByText("Вводная сессия")).toHaveCount(0);
  await expect(upcoming.getByText("nina@example.com")).toHaveCount(0);

  await page.getByRole("link", { name: "Записаться", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Выберите тип события" })).toBeVisible();
  await expect(page.getByText("Вводная сессия")).toHaveCount(0);
});
