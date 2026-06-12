import { Link, Outlet } from "@tanstack/react-router"

import { ScheduleEmailDialog } from "@/components/ScheduleEmailDialog"

// App chrome. The schedule-email dialog mounts here (not per-page) because the
// mail quick-action exists on both the calendar and campaign detail pages.
// URL-derived breadcrumbs replace the simple nav in Phase 2.
export function RootLayout() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-semibold">Marketing Calendar</h1>
            <p className="text-muted-foreground text-xs">
              NorCal youth rowing
            </p>
          </div>
          <nav className="flex gap-4 text-sm">
            <Link
              to="/"
              className="hover:underline"
              activeProps={{ className: "font-medium underline" }}
            >
              Calendar
            </Link>
            <Link
              to="/campaigns"
              className="hover:underline"
              activeProps={{ className: "font-medium underline" }}
            >
              Campaigns
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
      <ScheduleEmailDialog />
    </div>
  )
}
