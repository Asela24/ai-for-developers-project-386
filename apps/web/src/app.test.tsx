import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { routeTree } from "./routeTree.gen";

it("renders the home page in the glossary's words", async () => {
  const router = createRouter({ routeTree, history: createMemoryHistory() });
  const { container } = render(<RouterProvider router={router} />);
  expect(await screen.findByRole("heading", { name: "EasyBook", level: 1 })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Возможности" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Забронировать →" })).toHaveAttribute(
    "href",
    "/event-types",
  );
  expect(screen.getByRole("link", { name: "Owner" })).toHaveAttribute("href", "/owner");
  // GLOSSARY.md: no calendar, call, meeting, or запись; no Booking notes either.
  expect(container.textContent).not.toMatch(
    /календар|calendar|звон|встреч|запис|замет|брон[ьи]\b/i,
  );
});
