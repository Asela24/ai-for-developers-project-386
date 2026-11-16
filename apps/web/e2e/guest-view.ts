import { expect, type Page } from "@playwright/test";

const zone = "Europe/Belgrade";

/** How the Event type view names the Belgrade day of a Slot start. */
export const dayNameOf = (start: string) =>
  new Intl.DateTimeFormat("ru-RU", {
    timeZone: zone,
    weekday: "short",
    day: "numeric",
    month: "long",
  }).format(new Date(start));

/** How the Event type view names the Belgrade time of a Slot start. */
export const timeOf = (start: string) =>
  new Intl.DateTimeFormat("ru-RU", {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(start));

/** The Slot list of the day chosen in the Event type view. */
export const slotList = (page: Page) => page.getByRole("region", { name: "Статус слотов" });

/** Picks a day in the Event type view, turning to the next month when the window crosses one. */
export const openDay = async (page: Page, dayName: string) => {
  await expect(slotList(page).getByRole("listitem").first()).toBeVisible();
  const day = page.getByRole("button", { name: dayName, exact: true });
  if ((await day.count()) === 0 || !(await day.isEnabled())) {
    await page.getByRole("button", { name: "Следующий месяц" }).click();
  }
  await day.click();
  await expect(day).toHaveAttribute("aria-pressed", "true");
};
