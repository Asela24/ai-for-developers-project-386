import { createRootRoute, Link, Outlet } from "@tanstack/react-router";

const navLink = "text-sm text-muted-foreground transition-colors hover:text-foreground";
const navActive = "font-medium text-primary hover:text-primary";

function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span aria-hidden="true" className="size-2 rounded-full bg-primary" />
            EasyBook
          </Link>
          <nav className="flex items-center gap-6">
            <Link to="/event-types" className={navLink} activeProps={{ className: navActive }}>
              Забронировать
            </Link>
            <Link to="/owner" className={navLink} activeProps={{ className: navActive }}>
              Owner
            </Link>
          </nav>
        </div>
      </header>
      <Outlet />
    </div>
  );
}

export const Route = createRootRoute({ component: Layout });
