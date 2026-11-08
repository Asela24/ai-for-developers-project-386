import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { routeTree } from "./routeTree.gen";

it("renders the home page", async () => {
  const router = createRouter({ routeTree, history: createMemoryHistory() });
  render(<RouterProvider router={router} />);
  expect(await screen.findByText("Календарь звонков")).toBeInTheDocument();
});
