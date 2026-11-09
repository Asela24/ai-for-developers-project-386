import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { routeTree } from "./routeTree.gen";

it("renders the home page", async () => {
  const router = createRouter({ routeTree, history: createMemoryHistory() });
  render(<RouterProvider router={router} />);
  expect(await screen.findByRole("heading", { name: "EasyBook" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Возможности" })).toBeInTheDocument();
  expect(screen.getByText(/Сервис для записи на звонок/)).toBeInTheDocument();
  expect(screen.getByText("14 дней вперёд")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Открыть расписание" })).toHaveAttribute(
    "href",
    "/schedule",
  );
});
