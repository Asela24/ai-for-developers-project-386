import { expect, test } from "@playwright/test";
import { apiPort } from "./ports";

test("Guest sees each Event type name, description, and duration, but not the id", async ({
  page,
}) => {
  const created = await fetch(`http://127.0.0.1:${apiPort}/event-types`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      id: "secret-id-not-shown",
      name: "Знакомство",
      description: "Первый разговор о задаче",
      durationMinutes: 30,
    }),
  });
  expect(created.status).toBe(201);

  await page.goto("/event-types");
  const card = page.getByRole("link", { name: "Знакомство", exact: true });
  await expect(card).toBeVisible();
  await expect(page.getByText("Первый разговор о задаче")).toBeVisible();
  await expect(card).toContainText("30 мин");
  await expect(page.getByText("secret-id-not-shown")).toHaveCount(0);

  await card.click();
  await expect(page.getByRole("heading", { name: "Знакомство", level: 1 })).toBeVisible();
  await expect(page.getByText("Первый разговор о задаче")).toBeVisible();
  await expect(page.getByText("secret-id-not-shown")).toHaveCount(0);
});
