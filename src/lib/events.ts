import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import { supabase } from "./supabase"
import type { EventInsert, EventRow, EventUpdate } from "./database.types"

const fmt = (d: Date) => format(d, "yyyy-MM-dd")

// The visible calendar grid spans whole weeks, so it can include a few days from
// the adjacent months. Query that full range so those days show their events too.
export function monthGridRange(month: Date) {
  return {
    start: startOfWeek(startOfMonth(month)),
    end: endOfWeek(endOfMonth(month)),
  }
}

// Feature 2 + 1: events are read/written directly by the client (RLS-governed).
export function useEvents(month: Date) {
  const { start, end } = monthGridRange(month)
  return useQuery({
    queryKey: ["events", fmt(start), fmt(end)],
    queryFn: async (): Promise<EventRow[]> => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .gte("event_date", fmt(start))
        .lte("event_date", fmt(end))
        .order("event_date", { ascending: true })
      if (error) throw new Error(error.message)
      return data ?? []
    },
  })
}

export function useCreateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: EventInsert): Promise<EventRow> => {
      const { data, error } = await supabase
        .from("events")
        .insert(values)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  })
}

export function useUpdateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: {
      id: string
      values: EventUpdate
    }): Promise<EventRow> => {
      const { data, error } = await supabase
        .from("events")
        .update(args.values)
        .eq("id", args.id)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  })
}

export function useDeleteEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from("events").delete().eq("id", id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  })
}
