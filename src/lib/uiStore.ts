import { create } from "zustand"
import { addMonths, startOfMonth, subMonths } from "date-fns"
import { EVENT_CATEGORIES, type EventCategory, type EventRow } from "./database.types"

type UiState = {
  // Calendar (feature 1)
  currentMonth: Date
  nextMonth: () => void
  prevMonth: () => void
  goToday: () => void

  // Category filter (feature 4) — which categories are currently shown.
  activeCategories: EventCategory[]
  toggleCategory: (category: EventCategory) => void

  // Event create/edit dialog (feature 2). `event` set => edit; `date` set => create.
  eventDialog: { open: boolean; event: EventRow | null; date: string | null }
  openCreateEvent: (date: string) => void
  openEditEvent: (event: EventRow) => void
  closeEventDialog: () => void

  // Schedule-email dialog (feature 3) for a given event.
  scheduleDialog: { open: boolean; event: EventRow | null }
  openScheduleEmail: (event: EventRow) => void
  closeScheduleDialog: () => void
}

export const useUiStore = create<UiState>((set) => ({
  currentMonth: startOfMonth(new Date()),
  nextMonth: () => set((s) => ({ currentMonth: addMonths(s.currentMonth, 1) })),
  prevMonth: () => set((s) => ({ currentMonth: subMonths(s.currentMonth, 1) })),
  goToday: () => set({ currentMonth: startOfMonth(new Date()) }),

  activeCategories: [...EVENT_CATEGORIES],
  toggleCategory: (category) =>
    set((s) => ({
      activeCategories: s.activeCategories.includes(category)
        ? s.activeCategories.filter((c) => c !== category)
        : [...s.activeCategories, category],
    })),

  eventDialog: { open: false, event: null, date: null },
  openCreateEvent: (date) =>
    set({ eventDialog: { open: true, event: null, date } }),
  openEditEvent: (event) =>
    set({ eventDialog: { open: true, event, date: null } }),
  closeEventDialog: () =>
    set({ eventDialog: { open: false, event: null, date: null } }),

  scheduleDialog: { open: false, event: null },
  openScheduleEmail: (event) => set({ scheduleDialog: { open: true, event } }),
  closeScheduleDialog: () => set({ scheduleDialog: { open: false, event: null } }),
}))
