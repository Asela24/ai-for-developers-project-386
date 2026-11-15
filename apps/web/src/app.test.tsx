import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { routeTree } from "./routeTree.gen";

it("renders the home page", async () => {
  const router = createRouter({ routeTree, history: createMemoryHistory() });
  render(<RouterProvider router={router} />);
  expect(await screen.findByRole("heading", { name: "EasyBook" })).toBeInTheDocument();
  expect(screen.getByText("Виды брони")).toBeInTheDocument();
  expect(screen.queryByText(/звонок/)).not.toBeInTheDocument();
  expect(screen.queryByText(/расписание/)).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Открыть расписание" })).not.toBeInTheDocument();
});
