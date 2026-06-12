import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useUiStore } from "@/lib/uiStore"
import { useScheduleEmail } from "@/lib/emailJobs"
import { OWNER_EMAIL } from "@/lib/env"
import {
  scheduleEmailFormSchema,
  type ScheduleEmailFormValues,
} from "@/lib/schemas"
import type { EmailJobRow } from "@/lib/database.types"

export function ScheduleEmailDialog() {
  const { scheduleDialog, closeScheduleDialog } = useUiStore()
  const deliverable = scheduleDialog.deliverable
  const schedule = useScheduleEmail()
  const [result, setResult] = useState<EmailJobRow | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const form = useForm<ScheduleEmailFormValues>({
    resolver: zodResolver(scheduleEmailFormSchema),
    defaultValues: { subject: "", body: "", scheduled_for_local: "" },
  })

  function handleOpenChange(open: boolean) {
    if (!open) {
      closeScheduleDialog()
      form.reset()
      setResult(null)
      setErrorMsg(null)
    }
  }

  async function onSubmit(values: ScheduleEmailFormValues) {
    if (!deliverable) return
    setErrorMsg(null)
    setResult(null)
    // datetime-local (local, no tz) -> full ISO with offset, or null for send-now.
    const scheduled_for = values.scheduled_for_local
      ? new Date(values.scheduled_for_local).toISOString()
      : null
    try {
      const row = await schedule.mutateAsync({
        deliverable_id: deliverable.id,
        subject: values.subject,
        body: values.body,
        recipient: OWNER_EMAIL,
        scheduled_for,
      })
      setResult(row)
    } catch (err) {
      setErrorMsg((err as Error).message)
    }
  }

  return (
    <Dialog open={scheduleDialog.open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule email</DialogTitle>
          <DialogDescription>
            {deliverable
              ? `Attach an email to "${deliverable.title}". Sent through the schedule-email edge function.`
              : null}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="recipient">Recipient</Label>
            <Input id="recipient" value={OWNER_EMAIL} readOnly disabled />
            <p className="text-muted-foreground text-xs">
              Locked to your test address. The edge function rejects any other
              recipient.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" {...form.register("subject")} />
            {form.formState.errors.subject && (
              <p className="text-destructive text-xs">
                {form.formState.errors.subject.message}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="body">Body</Label>
            <Textarea id="body" rows={4} {...form.register("body")} />
            {form.formState.errors.body && (
              <p className="text-destructive text-xs">
                {form.formState.errors.body.message}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="scheduled_for_local">Send time (optional)</Label>
            <Input
              id="scheduled_for_local"
              type="datetime-local"
              {...form.register("scheduled_for_local")}
            />
            <p className="text-muted-foreground text-xs">
              Leave empty to send now. A future time is saved as{" "}
              <strong>scheduled / queued — not auto-sent</strong>.
            </p>
          </div>

          {result && (
            <div className="bg-muted rounded-md p-3 text-sm">
              <p>
                Job persisted with status <strong>{result.status}</strong>.
              </p>
              {result.provider_message_id && (
                <p className="text-muted-foreground text-xs break-all">
                  provider_message_id: {result.provider_message_id}
                </p>
              )}
              {result.error && (
                <p className="text-destructive text-xs">{result.error}</p>
              )}
            </div>
          )}
          {errorMsg && <p className="text-destructive text-sm">{errorMsg}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Close
            </Button>
            <Button type="submit" disabled={schedule.isPending}>
              {schedule.isPending ? "Sending…" : "Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
