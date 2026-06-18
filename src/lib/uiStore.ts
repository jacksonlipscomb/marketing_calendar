import { create } from "zustand"
import { addMonths, startOfMonth, subMonths } from "date-fns"
import {
  CAMPAIGN_CATEGORIES,
  CAMPAIGN_STATUSES,
  type CampaignCategory,
  type CampaignStatus,
} from "./database.types"
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

  // Calendar category filter — which campaign categories the calendar shows.
  activeCategories: CampaignCategory[]
  toggleCategory: (category: CampaignCategory) => void

  // Campaign list filters (kept here rather than page-local so the selection
  // survives navigating away and back within a session). The campaign-list
  // category filter is independent of the calendar's `activeCategories` above.
  campaignRange: RangeKey
  setCampaignRange: (range: RangeKey) => void
  campaignStatuses: CampaignStatus[]
  toggleCampaignStatus: (status: CampaignStatus) => void
  campaignCategories: CampaignCategory[]
  toggleCampaignCategory: (category: CampaignCategory) => void

  // Schedule-email dialog for a given deliverable. Campaign/deliverable
  // create+edit are pages (page pattern), not dialogs, so no form state here.
  scheduleDialog: { open: boolean; deliverable: ScheduleTarget | null }
  openScheduleEmail: (deliverable: ScheduleTarget) => void
  closeScheduleDialog: () => void
}

export const useUiStore = create<UiState>((set) => ({
  currentMonth: startOfMonth(new Date()),
  nextMonth: () => set((s) => ({ currentMonth: addMonths(s.currentMonth, 1) })),
  prevMonth: () => set((s) => ({ currentMonth: subMonths(s.currentMonth, 1) })),
  goToday: () => set({ currentMonth: startOfMonth(new Date()) }),

  activeCategories: [...CAMPAIGN_CATEGORIES],
  toggleCategory: (category) =>
    set((s) => ({
      activeCategories: s.activeCategories.includes(category)
        ? s.activeCategories.filter((c) => c !== category)
        : [...s.activeCategories, category],
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
  campaignCategories: [...CAMPAIGN_CATEGORIES],
  toggleCampaignCategory: (category) =>
    set((s) => ({
      campaignCategories: s.campaignCategories.includes(category)
        ? s.campaignCategories.filter((c) => c !== category)
        : [...s.campaignCategories, category],
    })),

  scheduleDialog: { open: false, deliverable: null },
  openScheduleEmail: (deliverable) =>
    set({ scheduleDialog: { open: true, deliverable } }),
  closeScheduleDialog: () =>
    set({ scheduleDialog: { open: false, deliverable: null } }),
}))
