import { useEffect } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useUiStore } from "@/lib/uiStore"
import { useCreateEvent, useDeleteEvent, useUpdateEvent } from "@/lib/events"
import { eventFormSchema, type EventFormValues } from "@/lib/schemas"
import {
  EVENT_CATEGORIES,
  EVENT_STATUSES,
  type EventCategory,
  type EventStatus,
} from "@/lib/database.types"

export function EventDialog() {
  const { eventDialog, closeEventDialog } = useUiStore()
  const { open, event, date } = eventDialog
  const createEvent = useCreateEvent()
  const updateEvent = useUpdateEvent()
  const deleteEvent = useDeleteEvent()

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "recruiting",
      event_date: format(new Date(), "yyyy-MM-dd"),
      owner: "",
      status: "planned",
    },
  })

  // Reset the form whenever the dialog opens for a different event or date.
  useEffect(() => {
    if (!open) return
    form.reset(
      event
        ? {
            title: event.title,
            description: event.description ?? "",
            category: event.category,
            event_date: event.event_date,
            owner: event.owner ?? "",
            status: event.status,
          }
        : {
            title: "",
            description: "",
            category: "recruiting",
            event_date: date ?? format(new Date(), "yyyy-MM-dd"),
            owner: "",
            status: "planned",
          },
    )
  }, [open, event, date, form])

  async function onSubmit(values: EventFormValues) {
    const payload = {
      title: values.title,
      description: values.description?.trim() ? values.description : null,
      category: values.category,
      event_date: values.event_date,
      owner: values.owner?.trim() ? values.owner : null,
      status: values.status,
    }
    if (event) {
      await updateEvent.mutateAsync({ id: event.id, values: payload })
    } else {
      await createEvent.mutateAsync(payload)
    }
    closeEventDialog()
  }

  async function onDelete() {
    if (!event) return
    await deleteEvent.mutateAsync(event.id)
    closeEventDialog()
  }

  const pending =
    createEvent.isPending || updateEvent.isPending || deleteEvent.isPending

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeEventDialog()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{event ? "Edit event" : "New event"}</DialogTitle>
          <DialogDescription>
            Stored directly in Supabase (RLS-governed).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...form.register("title")} />
            {form.formState.errors.title && (
              <p className="text-destructive text-xs">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Controller
                control={form.control}
                name="category"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => field.onChange(v as EventCategory)}
                  >
                    <SelectTrigger id="category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c} className="capitalize">
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => field.onChange(v as EventStatus)}
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="event_date">Date</Label>
              <Input
                id="event_date"
                type="date"
                {...form.register("event_date")}
              />
              {form.formState.errors.event_date && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.event_date.message}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="owner">Owner</Label>
              <Input id="owner" {...form.register("owner")} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} {...form.register("description")} />
          </div>

          <DialogFooter className="sm:justify-between">
            {event ? (
              <Button
                type="button"
                variant="destructive"
                onClick={onDelete}
                disabled={pending}
              >
                Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => closeEventDialog()}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {event ? "Save" : "Create"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
