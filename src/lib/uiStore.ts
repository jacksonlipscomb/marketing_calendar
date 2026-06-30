import { create } from "zustand"
import { addMonths, startOfMonth, subMonths } from "date-fns"
import { CAMPAIGN_STATUSES, type CampaignStatus } from "./database.types"
import type { RangeKey } from "./campaigns"

// What the schedule-email dialog needs to know about its target deliverable:
// the id for the request, the title for the dialog copy.
export type ScheduleTarget = { id: string; title: string }

type UiState = {
  // Calendar month navigation
  currentMonth: Date
  nextMonth: () => void
  prevMonth: () => void
  goToday: () => void

  // Calendar category filter. Categories are dynamic (a table now), so the store
  // can't default to a static "all selected" list — it tracks which category ids
  // are HIDDEN instead. Empty = nothing hidden = all shown (the default), and a
  // newly created category is visible until explicitly hidden. A chip is active
  // when its id is NOT in this set.
  hiddenCalendarCategoryIds: string[]
  toggleCalendarCategory: (id: string) => void

  // Campaign list filters (kept here rather than page-local so the selection
  // survives navigating away and back within a session). The campaign-list
  // category filter is independent of the calendar's hidden set above.
  campaignRange: RangeKey
  setCampaignRange: (range: RangeKey) => void
  campaignStatuses: CampaignStatus[]
  toggleCampaignStatus: (status: CampaignStatus) => void
  hiddenListCategoryIds: string[]
  toggleListCategory: (id: string) => void

  // Schedule-email dialog for a given deliverable. Campaign/deliverable
  // create+edit are pages (page pattern), not dialogs, so no form state here.
  scheduleDialog: { open: boolean; deliverable: ScheduleTarget | null }
  openScheduleEmail: (deliverable: ScheduleTarget) => void
  closeScheduleDialog: () => void

  // Light/dark theme. The default is dark (black brand canvas). The real source
  // of truth at paint time is the `dark` class on <html>, set by index.html's
  // inline boot script before React mounts (no flash); this slice mirrors it so
  // the header toggle can read/flip it. toggleTheme flips the class and persists
  // to localStorage.
  theme: "dark" | "light"
  toggleTheme: () => void
}

export const useUiStore = create<UiState>((set) => ({
  currentMonth: startOfMonth(new Date()),
  nextMonth: () => set((s) => ({ currentMonth: addMonths(s.currentMonth, 1) })),
  prevMonth: () => set((s) => ({ currentMonth: subMonths(s.currentMonth, 1) })),
  goToday: () => set({ currentMonth: startOfMonth(new Date()) }),

  hiddenCalendarCategoryIds: [],
  toggleCalendarCategory: (id) =>
    set((s) => ({
      hiddenCalendarCategoryIds: s.hiddenCalendarCategoryIds.includes(id)
        ? s.hiddenCalendarCategoryIds.filter((x) => x !== id)
        : [...s.hiddenCalendarCategoryIds, id],
    })),

  campaignRange: "all",
  setCampaignRange: (range) => set({ campaignRange: range }),
  campaignStatuses: [...CAMPAIGN_STATUSES],
  toggleCampaignStatus: (status) =>
    set((s) => ({
      campaignStatuses: s.campaignStatuses.includes(status)
        ? s.campaignStatuses.filter((x) => x !== status)
        : [...s.campaignStatuses, status],
    })),
  hiddenListCategoryIds: [],
  toggleListCategory: (id) =>
    set((s) => ({
      hiddenListCategoryIds: s.hiddenListCategoryIds.includes(id)
        ? s.hiddenListCategoryIds.filter((x) => x !== id)
        : [...s.hiddenListCategoryIds, id],
    })),

  scheduleDialog: { open: false, deliverable: null },
  openScheduleEmail: (deliverable) =>
    set({ scheduleDialog: { open: true, deliverable } }),
  closeScheduleDialog: () =>
    set({ scheduleDialog: { open: false, deliverable: null } }),

  // Initialize from the class the boot script already applied, so the toggle's
  // first render matches what's on screen. Guard `document` for any non-DOM
  // (test/SSR) context; default dark there.
  theme:
    typeof document !== "undefined" &&
    !document.documentElement.classList.contains("dark")
      ? "light"
      : "dark",
  toggleTheme: () =>
    set((s) => {
      const next = s.theme === "dark" ? "light" : "dark"
      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("dark", next === "dark")
      }
      try {
        localStorage.setItem("theme", next)
      } catch {
        // Persistence is best-effort (blocked storage, sandboxed context). The
        // in-memory toggle still works for this session.
      }
      return { theme: next }
    }),
}))
