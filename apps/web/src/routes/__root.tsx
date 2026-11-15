import { createRootRoute, Link, Outlet } from "@tanstack/react-router";

const navLink = "rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground";
const navActive = "bg-muted text-foreground";

function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-15 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-5 text-primary"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            EasyBook
          </Link>
          <nav className="flex items-center gap-1">
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
