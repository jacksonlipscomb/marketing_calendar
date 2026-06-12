import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "./supabase"
import type { EmailJobRow } from "./database.types"
import type { ScheduleEmailRequest } from "./schemas"

// Upcoming sends. Read-only list of email_jobs still in `scheduled` status,
// soonest first, with the parent deliverable's title embedded. Reads only —
// governed by the email_jobs SELECT policy + grant; never writes.
export type UpcomingSend = {
  id: string
  subject: string
  recipient: string
  scheduled_for: string | null
  status: EmailJobRow["status"]
  deliverables: { title: string } | null
}

export function useUpcomingSends() {
  return useQuery({
    queryKey: ["upcoming-sends"],
    queryFn: async (): Promise<UpcomingSend[]> => {
      const { data, error } = await supabase
        .from("email_jobs")
        .select(
          "id, subject, recipient, scheduled_for, status, deliverables(title)",
        )
        .eq("status", "scheduled")
        .order("scheduled_for", { ascending: true })
        .returns<UpcomingSend[]>()
      if (error) throw new Error(error.message)
      return data ?? []
    },
  })
}

// The only client path that touches `email_jobs` writes. Calls the edge function,
// which performs the privileged service-role write. The client never inserts directly.
export function useScheduleEmail() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: ScheduleEmailRequest): Promise<EmailJobRow> => {
      const { data, error } = await supabase.functions.invoke<EmailJobRow>(
        "schedule-email",
        { body },
      )
      if (error) {
        // FunctionsHttpError carries the original Response in `context`; surface the
        // server's `{ error }` message (e.g. "recipient not allowed") when present.
        let message = error.message
        const ctx = (error as { context?: Response }).context
        if (ctx && typeof ctx.json === "function") {
          try {
            const parsed = await ctx.json()
            if (parsed?.error) message = parsed.error
          } catch {
            /* keep the original message */
          }
        }
        throw new Error(message)
      }
      if (!data) throw new Error("No response from schedule-email")
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["upcoming-sends"] })
      qc.invalidateQueries({ queryKey: ["email-jobs"] })
    },
  })
}
