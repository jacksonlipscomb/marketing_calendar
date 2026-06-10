import { Outlet } from "@tanstack/react-router"

// App chrome. The upcoming-sends sidebar (feature 5) and category filter (feature 4)
// land in the next pass; this root keeps a header + main content area for the
// Phase 1 vertical slice.
export function RootLayout() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-semibold">Marketing Calendar</h1>
            <p className="text-muted-foreground text-xs">
              NorCal youth rowing — PoC
            </p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
