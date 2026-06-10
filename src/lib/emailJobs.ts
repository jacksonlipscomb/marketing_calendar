import { useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "./supabase"
import type { EmailJobRow } from "./database.types"
import type { ScheduleEmailRequest } from "./schemas"

// Feature 3: the only path that writes `email_jobs`. Calls the edge function, which
// performs the privileged service-role write. The client never inserts directly.
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
