import { z } from "zod"
import { CAMPAIGN_STATUSES, DELIVERABLE_STATUSES } from "./database.types"

// Hex color string (#rrggbb) — matches the `categories.color` DB check (0007) and
// the value an <input type="color"> produces. Shared by the category form (PR B).
export const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i

// Campaign create/edit form. Direct, RLS-governed writes to `campaigns`.
// Dates are yyyy-mm-dd strings from <input type="date">; the same inclusive
// end >= start rule the DB enforces (campaigns_dates_check) is checked here so
// the user sees a field error instead of a constraint violation.
export const campaignFormSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    goal: z.string().trim().optional(),
    category_id: z.string().min(1, "Pick a category"),
    start_date: z.string().min(1, "Start date is required"),
    end_date: z.string().min(1, "End date is required"),
    segmentation: z.string().trim().optional(),
    owners: z.array(z.string().trim().min(1)),
    status: z.enum(CAMPAIGN_STATUSES),
    reminders_enabled: z.boolean(),
  })
  .refine((v) => v.end_date >= v.start_date, {
    message: "End date must be on or after the start date",
    path: ["end_date"],
  })
export type CampaignFormValues = z.infer<typeof campaignFormSchema>

// Form values -> insert/update payload: empty optional strings become null.
export function campaignPayload(values: CampaignFormValues) {
  return {
    name: values.name,
    goal: values.goal?.trim() ? values.goal : null,
    category_id: values.category_id,
    start_date: values.start_date,
    end_date: values.end_date,
    segmentation: values.segmentation?.trim() ? values.segmentation : null,
    owners: values.owners,
    status: values.status,
    reminders_enabled: values.reminders_enabled,
  }
}

// Deliverable create/edit form. Direct, RLS-governed writes to `deliverables`.
// Deliverables are dated SPANS (start..end). The inclusive end >= start rule the DB
// enforces (deliverables_dates_check) is mirrored here so the user sees a field
// error rather than a constraint violation; the cross-table bound against the
// campaign window is a DB trigger (see migration 0005), surfaced via the form's
// submit-error catch.
export const deliverableFormSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required"),
    details: z.string().trim().optional(),
    start_date: z.string().min(1, "Start date is required"),
    end_date: z.string().min(1, "End date is required"),
    owners: z.array(z.string().trim().min(1)),
    status: z.enum(DELIVERABLE_STATUSES),
  })
  .refine((v) => v.end_date >= v.start_date, {
    message: "End date must be on or after the start date",
    path: ["end_date"],
  })
export type DeliverableFormValues = z.infer<typeof deliverableFormSchema>

// Form values -> insert/update payload: empty optional strings become null.
export function deliverablePayload(values: DeliverableFormValues) {
  return {
    title: values.title,
    details: values.details?.trim() ? values.details : null,
    start_date: values.start_date,
    end_date: values.end_date,
    owners: values.owners,
    status: values.status,
  }
}

// Schedule-email form. `recipient` is omitted here — it is fixed to
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
  deliverable_id: z.uuid(),
  subject: z.string().min(1),
  body: z.string().min(1),
  recipient: z.email(),
  scheduled_for: z.iso.datetime({ offset: true }).nullable(),
})
export type ScheduleEmailRequest = z.infer<typeof scheduleEmailRequestSchema>
