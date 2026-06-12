import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import { supabase } from "./supabase"
import type {
  DeliverableInsert,
  DeliverableRow,
  DeliverableUpdate,
} from "./database.types"

const fmt = (d: Date) => format(d, "yyyy-MM-dd")

// The visible calendar grid spans whole weeks, so it can include a few days from
// the adjacent months. Query that full range so those days show their items too.
export function monthGridRange(month: Date) {
  return {
    start: startOfWeek(startOfMonth(month)),
    end: endOfWeek(endOfMonth(month)),
  }
}

// Calendar feed: deliverables due inside the visible month grid, with the parent
// campaign's name and category embedded (category drives the color chip).
export type CalendarDeliverable = DeliverableRow & {
  campaigns: {
    name: string
    category: import("./database.types").CampaignCategory
  } | null
}

export function useMonthDeliverables(month: Date) {
  const { start, end } = monthGridRange(month)
  return useQuery({
    queryKey: ["deliverables", "range", fmt(start), fmt(end)],
    queryFn: async (): Promise<CalendarDeliverable[]> => {
      const { data, error } = await supabase
        .from("deliverables")
        .select("*, campaigns(name, category)")
        .gte("due_date", fmt(start))
        .lte("due_date", fmt(end))
        .order("due_date", { ascending: true })
        .returns<CalendarDeliverable[]>()
      if (error) throw new Error(error.message)
      return data ?? []
    },
  })
}

// Deliverables of one campaign, due-date order. Drives the campaign detail page
// and the derived completion percentage.
export function useCampaignDeliverables(campaignId: string) {
  return useQuery({
    queryKey: ["deliverables", "campaign", campaignId],
    queryFn: async (): Promise<DeliverableRow[]> => {
      const { data, error } = await supabase
        .from("deliverables")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("due_date", { ascending: true })
      if (error) throw new Error(error.message)
      return data ?? []
    },
  })
}

// Derived completion: complete ÷ total, rounded. Never stored (CLAUDE.md → Traps);
// null when the campaign has no deliverables yet, so the UI can say "—" rather
// than a misleading 0%.
export function completionPercent(
  deliverables: Pick<DeliverableRow, "status">[],
): number | null {
  if (deliverables.length === 0) return null
  const complete = deliverables.filter((d) => d.status === "complete").length
  return Math.round((complete / deliverables.length) * 100)
}

export function useCreateDeliverable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: DeliverableInsert): Promise<DeliverableRow> => {
      const { data, error } = await supabase
        .from("deliverables")
        .insert(values)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deliverables"] }),
  })
}

export function useUpdateDeliverable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: {
      id: string
      values: DeliverableUpdate
    }): Promise<DeliverableRow> => {
      const { data, error } = await supabase
        .from("deliverables")
        .update(args.values)
        .eq("id", args.id)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deliverables"] }),
  })
}

export function useDeleteDeliverable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from("deliverables")
        .delete()
        .eq("id", id)
      if (error) throw new Error(error.message)
    },
    // Cascades to the deliverable's email_jobs.
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deliverables"] })
      qc.invalidateQueries({ queryKey: ["upcoming-sends"] })
    },
  })
}
