import { createRootRoute, Outlet } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: () => (
    <div className="mx-auto max-w-3xl p-6">
      <Outlet />
    </div>
  ),
});
