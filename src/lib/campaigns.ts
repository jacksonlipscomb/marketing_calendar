import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "./supabase"
import type {
  CampaignInsert,
  CampaignRow,
  CampaignUpdate,
} from "./database.types"

// Campaigns are read/written directly by the client (RLS-governed).
// Phase 1 keeps the list unfiltered; the range (overlap) + status filters land
// in Phase 2 on top of these same hooks.
export function useCampaigns() {
  return useQuery({
    queryKey: ["campaigns"],
    queryFn: async (): Promise<CampaignRow[]> => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] }),
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
