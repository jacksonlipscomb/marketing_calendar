import { Link, Outlet } from "@tanstack/react-router"

import logoGold from "@/assets/norcal-logo-gold.png"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { ScheduleEmailDialog } from "@/components/ScheduleEmailDialog"
import { ThemeToggle } from "@/components/ThemeToggle"

// App chrome. The schedule-email dialog mounts here (not per-page) because the
// mail quick-action exists on both the calendar and campaign detail pages.
// Breadcrumbs are URL-derived (page pattern); the nav stays for quick switching.
export function RootLayout() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
          <div className="flex items-center gap-3">
            {/* The brand lockup already carries the wordmark; the app name stays as
                separate text. Gold-on-transparent reads well on the dark canvas but
                not on white, so reverse the mark to black in light mode and restore
                the original gold in dark mode (brightness-0 ⇄ brightness-100). */}
            <img
              src={logoGold}
              alt="Norcal Crew"
              className="h-9 w-auto brightness-0 dark:brightness-100"
            />
            <div>
              <h1 className="text-lg font-semibold">Marketing Calendar</h1>
              <p className="text-muted-foreground text-xs">
                Norcal youth rowing
              </p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-4 text-sm">
            <Link
              to="/"
              className="hover:underline"
              activeProps={{ className: "text-primary font-medium underline" }}
            >
              Calendar
            </Link>
            <Link
              to="/campaigns"
              className="hover:underline"
              activeProps={{ className: "text-primary font-medium underline" }}
            >
              Campaigns
            </Link>
            <Link
              to="/table"
              className="hover:underline"
              activeProps={{ className: "text-primary font-medium underline" }}
            >
              Table
            </Link>
            <ThemeToggle />
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
