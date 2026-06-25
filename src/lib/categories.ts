import { useMemo } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { PostgrestError } from "@supabase/supabase-js"
import { supabase } from "./supabase"
import type { CategoryInsert, CategoryRow, CategoryUpdate } from "./database.types"

// Categories are client-written directly (RLS-governed), like campaigns. The DB
// holds the real validation (migration 0007: non-empty name, hex color,
// case-insensitive uniqueness) and the ON DELETE RESTRICT rule that blocks
// deleting a category still referenced by a campaign.

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async (): Promise<CategoryRow[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name", { ascending: true })
      if (error) throw new Error(error.message)
      return data ?? []
    },
  })
}

// id -> row map for the render sites that color/label by category_id (calendar
// bars, the list and detail color dots). Built from the same cached useCategories
// query, so a recolor only needs to invalidate ["categories"].
export function useCategoryMap(): Map<string, CategoryRow> {
  const { data = [] } = useCategories()
  return useMemo(() => new Map(data.map((c) => [c.id, c])), [data])
}

// Campaign count per category_id. Keyed under ["campaigns"] so the existing
// campaign create/update/delete invalidations keep it fresh. Drives the category
// manager's in-use disable + "N campaigns" copy (PR B).
export function useCategoryUsageCounts(): Map<string, number> {
  const { data = [] } = useQuery({
    queryKey: ["campaigns", "category-usage"],
    queryFn: async (): Promise<{ category_id: string }[]> => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("category_id")
      if (error) throw new Error(error.message)
      return data ?? []
    },
  })
  return useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of data)
      counts.set(r.category_id, (counts.get(r.category_id) ?? 0) + 1)
    return counts
  }, [data])
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: CategoryInsert): Promise<CategoryRow> => {
      const { data, error } = await supabase
        .from("categories")
        .insert(values)
        .select()
        .single()
      if (error) throw new Error(friendlyCategoryError(error))
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: {
      id: string
      values: CategoryUpdate
    }): Promise<CategoryRow> => {
      const { data, error } = await supabase
        .from("categories")
        .update(args.values)
        .eq("id", args.id)
        .select()
        .single()
      if (error) throw new Error(friendlyCategoryError(error))
      return data
    },
    // A rename/recolor ripples into rendered campaign rows (they look up name and
    // color by category_id), so refresh those views too.
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] })
      qc.invalidateQueries({ queryKey: ["campaigns"] })
      qc.invalidateQueries({ queryKey: ["deliverables"] })
    },
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from("categories").delete().eq("id", id)
      if (error) throw new Error(friendlyCategoryError(error))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  })
}

// Map the Postgres errors the category write surface can raise to readable copy.
// 23503 = FK violation (a campaign still references it → the ON DELETE RESTRICT
// rule); 23505 = unique violation (the case-insensitive name index).
function friendlyCategoryError(error: PostgrestError): string {
  if (error.code === "23503")
    return "This category is still used by one or more campaigns. Reassign or remove those campaigns first."
  if (error.code === "23505")
    return "A category with that name already exists."
  return error.message
}
