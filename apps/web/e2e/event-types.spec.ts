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

  await page.goto("/");
  await expect(page.getByText("Знакомство")).toBeVisible();
  await expect(page.getByText("Первый разговор о задаче")).toBeVisible();
  await expect(page.getByText("30 минут")).toBeVisible();
  await expect(page.getByText("secret-id-not-shown")).toHaveCount(0);
});
