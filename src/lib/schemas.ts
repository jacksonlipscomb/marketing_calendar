import { z } from "zod"
import { EVENT_CATEGORIES, EVENT_STATUSES } from "./database.types"

// Event create/edit form (feature 2). Direct, RLS-governed writes to `events`.
export const eventFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().optional(),
  category: z.enum(EVENT_CATEGORIES),
  event_date: z.string().min(1, "Date is required"), // yyyy-mm-dd from <input type="date">
  owner: z.string().trim().optional(),
  status: z.enum(EVENT_STATUSES),
})
export type EventFormValues = z.infer<typeof eventFormSchema>

// Schedule-email form (feature 3). `recipient` is omitted here — it is fixed to
// VITE_OWNER_EMAIL in the dialog and authoritatively enforced by the edge function
// (ALLOWED_RECIPIENT_EMAIL), so it is never a user-editable form field.
export const scheduleEmailFormSchema = z.object({
  subject: z.string().trim().min(1, "Subject is required"),
  body: z.string().trim().min(1, "Body is required"),
  // datetime-local value (local, no timezone) or "" for send-now.
  scheduled_for_local: z.string().optional(),
})
export type ScheduleEmailFormValues = z.infer<typeof scheduleEmailFormSchema>

// The actual request body sent to the `schedule-email` edge function. The function
// re-validates this same shape server-side with its own Zod copy (CLAUDE.md).
export const scheduleEmailRequestSchema = z.object({
  event_id: z.uuid(),
  subject: z.string().min(1),
  body: z.string().min(1),
  recipient: z.email(),
  scheduled_for: z.iso.datetime({ offset: true }).nullable(),
})
export type ScheduleEmailRequest = z.infer<typeof scheduleEmailRequestSchema>
