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
  CampaignCategory,
  CampaignStatus,
  DeliverableInsert,
  DeliverableRow,
  DeliverableStatus,
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

// Deliverables due inside an arbitrary date window, with the parent campaign's
// name and category embedded (category drives the color chip). Feeds both the
// calendar grid and the timeline ticks.
export type CalendarDeliverable = DeliverableRow & {
  campaigns: {
    name: string
    category: import("./database.types").CampaignCategory
  } | null
}

// Deliverables are dated SPANS, so "in range" is an OVERLAP query, bounds
// inclusive — same rule as useCampaignsInRange in campaigns.ts. A deliverable
// straddling the window edge appears in the window. Do not "fix" this to
// containment (start_date >= range start), which drops straddling spans.
export function useDeliverablesInRange(start: Date, end: Date) {
  return useQuery({
    queryKey: ["deliverables", "range", fmt(start), fmt(end)],
    queryFn: async (): Promise<CalendarDeliverable[]> => {
      const { data, error } = await supabase
        .from("deliverables")
        .select("*, campaigns(name, category)")
        .lte("start_date", fmt(end))
        .gte("end_date", fmt(start))
        .order("start_date", { ascending: true })
        .returns<CalendarDeliverable[]>()
      if (error) throw new Error(error.message)
      return data ?? []
    },
  })
}

export function useMonthDeliverables(month: Date) {
  const { start, end } = monthGridRange(month)
  return useDeliverablesInRange(start, end)
}

// One flat row per deliverable for the table/exploded view, with the parent
// campaign's columns denormalized onto the row. `campaign_id`/`deliverable_id` are
// internal — they drive the row key and the title deep link, and are NOT shown as
// columns or exported. The other 11 fields are the visible/exported columns.
export type DeliverableTableRow = {
  campaign_id: string
  deliverable_id: string
  campaign_name: string
  campaign_start: string
  campaign_end: string
  category: CampaignCategory
  campaign_status: CampaignStatus
  campaign_owners: string[]
  deliverable_title: string
  deliverable_start: string
  deliverable_end: string
  deliverable_status: DeliverableStatus
  deliverable_owners: string[]
}

// Shape of the embedded campaign on the raw query (mirrors the CalendarDeliverable
// embed pattern, widened to the columns the table denormalizes).
type TableEmbed = DeliverableRow & {
  campaigns: {
    name: string
    start_date: string
    end_date: string
    category: CampaignCategory
    status: CampaignStatus
    owners: string[]
  } | null
}

// All deliverables joined with their campaign, flattened. The table sorts/filters
// client-side, so order here is just a sensible default (campaign then start).
// Key is a sub-key of ["deliverables"], so the existing deliverable/campaign
// mutations' invalidateQueries({ queryKey: ["deliverables"] }) refresh it.
export function useDeliverablesTable() {
  return useQuery({
    queryKey: ["deliverables", "table"],
    queryFn: async (): Promise<DeliverableTableRow[]> => {
      const { data, error } = await supabase
        .from("deliverables")
        .select(
          "*, campaigns(name, start_date, end_date, category, status, owners)",
        )
        .order("start_date", { ascending: true })
        .returns<TableEmbed[]>()
      if (error) throw new Error(error.message)
      return (data ?? [])
        .filter((d): d is TableEmbed & { campaigns: NonNullable<TableEmbed["campaigns"]> } => d.campaigns !== null)
        .map((d) => ({
          campaign_id: d.campaign_id,
          deliverable_id: d.id,
          campaign_name: d.campaigns.name,
          campaign_start: d.campaigns.start_date,
          campaign_end: d.campaigns.end_date,
          category: d.campaigns.category,
          campaign_status: d.campaigns.status,
          campaign_owners: d.campaigns.owners,
          deliverable_title: d.title,
          deliverable_start: d.start_date,
          deliverable_end: d.end_date,
          deliverable_status: d.status,
          deliverable_owners: d.owners,
        }))
    },
  })
}

// Deliverables of one campaign, start-date order. Drives the campaign detail page
// and the derived completion percentage.
export function useCampaignDeliverables(campaignId: string) {
  return useQuery({
    queryKey: ["deliverables", "campaign", campaignId],
    queryFn: async (): Promise<DeliverableRow[]> => {
      const { data, error } = await supabase
        .from("deliverables")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("start_date", { ascending: true })
      if (error) throw new Error(error.message)
      return data ?? []
    },
  })
}

// A single deliverable plus its parent campaign's name AND window. The window
// (start/end) feeds the edit form's date-input min/max so the page doesn't need a
// second campaign fetch; the name still powers the "back to campaign" label.
export type DeliverableWithCampaign = DeliverableRow & {
  campaigns: { name: string; start_date: string; end_date: string } | null
}

// One deliverable by its OWN id (not via the campaign list + .find()), so the
// deliverable page loads standalone on a cold deep link. The embedded campaign
// name powers the "back to campaign" label without a second round-trip. The key
// is a sub-key of ["deliverables"], so the existing deliverable mutations'
// invalidateQueries({ queryKey: ["deliverables"] }) refresh it by prefix match.
// maybeSingle → null when the id doesn't exist (drives the not-found branch).
export function useDeliverable(id: string) {
  return useQuery({
    queryKey: ["deliverables", "one", id],
    queryFn: async (): Promise<DeliverableWithCampaign | null> => {
      const { data, error } = await supabase
        .from("deliverables")
        .select("*, campaigns(name, start_date, end_date)")
        .eq("id", id)
        .returns<DeliverableWithCampaign[]>()
        .maybeSingle()
      if (error) throw new Error(error.message)
      return data
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
