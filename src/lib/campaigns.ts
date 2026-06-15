import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  endOfDay,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  endOfYear,
  format,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
} from "date-fns"
import { supabase } from "./supabase"
import { CAMPAIGN_CATEGORIES } from "./database.types"
import type {
  CampaignCategory,
  CampaignInsert,
  CampaignRow,
  CampaignStatus,
  CampaignUpdate,
} from "./database.types"

const fmt = (d: Date) => format(d, "yyyy-MM-dd")

// Range filter keys for the campaign list.
export const RANGE_KEYS = [
  "day",
  "week",
  "month",
  "quarter",
  "year",
  "all",
] as const
export type RangeKey = (typeof RANGE_KEYS)[number]

export type CampaignStatusFilter = CampaignStatus | "all"

// Bounds of "the current <range>" anchored at `today`; null means unbounded.
// "Week" is Sunday-start (date-fns default) on purpose, matching the calendar
// grid's Sun–Sat rows. If ops thinking ever shifts to Monday-start weeks,
// change both together (here via { weekStartsOn: 1 }, and the calendar grid).
export function rangeBounds(
  range: RangeKey,
  today: Date = new Date(),
): { start: Date; end: Date } | null {
  switch (range) {
    case "day":
      return { start: startOfDay(today), end: endOfDay(today) }
    case "week":
      return { start: startOfWeek(today), end: endOfWeek(today) }
    case "month":
      return { start: startOfMonth(today), end: endOfMonth(today) }
    case "quarter":
      return { start: startOfQuarter(today), end: endOfQuarter(today) }
    case "year":
      return { start: startOfYear(today), end: endOfYear(today) }
    case "all":
      return null
  }
}

// Campaigns are read/written directly by the client (RLS-governed).
// Range filtering uses OVERLAP semantics, bounds inclusive (roadmap.md):
// a campaign is in range when start_date <= range_end AND end_date >= range_start,
// so a campaign straddling a boundary appears in both adjacent ranges. Do not
// "fix" this to containment — that silently drops straddling campaigns.
export function useCampaigns(
  range: RangeKey = "all",
  status: CampaignStatusFilter = "all",
  categories: CampaignCategory[] = [...CAMPAIGN_CATEGORIES],
) {
  const bounds = rangeBounds(range)
  // All categories selected = no category constraint; otherwise filter to the
  // chosen set (empty = none selected = no rows, matching the calendar). The key
  // segment is stable/order-independent so toggling refetches correctly.
  const allCategories = categories.length === CAMPAIGN_CATEGORIES.length
  const categoryKey = allCategories
    ? "all"
    : [...categories].sort().join("|") || "none"
  return useQuery({
    queryKey: [
      "campaigns",
      "list",
      bounds ? `${fmt(bounds.start)}..${fmt(bounds.end)}` : "all",
      status,
      categoryKey,
    ],
    queryFn: async (): Promise<CampaignRow[]> => {
      let query = supabase.from("campaigns").select("*")
      if (bounds) {
        query = query
          .lte("start_date", fmt(bounds.end))
          .gte("end_date", fmt(bounds.start))
      }
      if (status !== "all") {
        query = query.eq("status", status)
      }
      if (!allCategories) {
        query = query.in("category", categories)
      }
      const { data, error } = await query.order("start_date", {
        ascending: true,
      })
      if (error) throw new Error(error.message)
      return data ?? []
    },
  })
}

// Campaigns overlapping an explicit window (same inclusive overlap rule as
// above). The calendar uses this with monthGridRange(currentMonth) — the full
// visible 42-cell grid including adjacent-month edge days — because it
// navigates to arbitrary months while useCampaigns is anchored at today.
export function useCampaignsInRange(start: Date, end: Date) {
  return useQuery({
    queryKey: ["campaigns", "window", fmt(start), fmt(end)],
    queryFn: async (): Promise<CampaignRow[]> => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .lte("start_date", fmt(end))
        .gte("end_date", fmt(start))
        .order("start_date", { ascending: true })
      if (error) throw new Error(error.message)
      return data ?? []
    },
  })
}

export function useCampaign(id: string) {
  return useQuery({
    queryKey: ["campaigns", id],
    queryFn: async (): Promise<CampaignRow | null> => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", id)
        .maybeSingle()
      if (error) throw new Error(error.message)
      return data
    },
  })
}

export function useCreateCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: CampaignInsert): Promise<CampaignRow> => {
      const { data, error } = await supabase
        .from("campaigns")
        .insert(values)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] }),
  })
}

export function useUpdateCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: {
      id: string
      values: CampaignUpdate
    }): Promise<CampaignRow> => {
      const { data, error } = await supabase
        .from("campaigns")
        .update(args.values)
        .eq("id", args.id)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return data
    },
    // Also invalidate deliverables: the /table view denormalizes campaign columns
    // (name/dates/category/status/owners) onto each deliverable row, so a campaign
    // edit must refresh that query too or the table shows stale campaign values.
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] })
      qc.invalidateQueries({ queryKey: ["deliverables"] })
    },
  })
}

// Campaign date-shrink WITH child clamp, in one atomic DB transaction (the
// update_campaign_clamp RPC, migration 0005). Use this — not useUpdateCampaign —
// when the new window would push existing deliverables out of bounds: the plain
// update path is blocked by the campaigns shrink-guard trigger, while this RPC
// updates the campaign and clamps overflowing children together. It still raises
// (rejected here) when a child lies ENTIRELY outside the new window. Invalidates
// deliverables too, since their dates may have moved.
export function useUpdateCampaignClamp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: {
      id: string
      name: string
      goal: string | null
      category: CampaignRow["category"]
      start_date: string
      end_date: string
      segmentation: string | null
      owners: string[]
      status: CampaignStatus
      reminders_enabled: boolean
    }): Promise<CampaignRow> => {
      const { data, error } = await supabase
        .rpc("update_campaign_clamp", {
          p_id: values.id,
          p_name: values.name,
          p_goal: values.goal,
          p_category: values.category,
          p_start: values.start_date,
          p_end: values.end_date,
          p_segmentation: values.segmentation,
          p_owners: values.owners,
          p_status: values.status,
          p_reminders_enabled: values.reminders_enabled,
        })
        .single()
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] })
      qc.invalidateQueries({ queryKey: ["deliverables"] })
    },
  })
}

export function useDeleteCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from("campaigns").delete().eq("id", id)
      if (error) throw new Error(error.message)
    },
    // Deleting a campaign cascades to its deliverables (and their email_jobs),
    // so everything derived from them must refetch too.
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] })
      qc.invalidateQueries({ queryKey: ["deliverables"] })
      qc.invalidateQueries({ queryKey: ["upcoming-sends"] })
    },
  })
}
