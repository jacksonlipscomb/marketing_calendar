import { Link, Outlet } from "@tanstack/react-router"

import { Breadcrumbs } from "@/components/Breadcrumbs"
import { ScheduleEmailDialog } from "@/components/ScheduleEmailDialog"

// App chrome. The schedule-email dialog mounts here (not per-page) because the
// mail quick-action exists on both the calendar and campaign detail pages.
// Breadcrumbs are URL-derived (page pattern); the nav stays for quick switching.
export function RootLayout() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
          <div>
            <h1 className="text-lg font-semibold">Marketing Calendar</h1>
            <p className="text-muted-foreground text-xs">
              Norcal youth rowing
            </p>
          </div>
          <nav className="flex flex-wrap gap-4 text-sm">
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
            <Link
              to="/table"
              className="hover:underline"
              activeProps={{ className: "font-medium underline" }}
            >
              Table
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto grid max-w-6xl gap-4 px-4 py-6">
        <Breadcrumbs />
        <Outlet />
      </main>
      <ScheduleEmailDialog />
    </div>
  )
}
