import { CalendarMonth } from "@/components/CalendarMonth"
import { EventDialog } from "@/components/EventDialog"
import { ScheduleEmailDialog } from "@/components/ScheduleEmailDialog"

// Phase 1 vertical slice: calendar render (F1) + create/edit event (F2) + schedule
// email through the edge function (F3). Category filter (F4) and upcoming sends (F5)
// are the next pass.
export function CalendarPage() {
  return (
    <div className="grid gap-4">
      <p className="text-muted-foreground text-sm">
        Click a day to add an event. Click an event to edit it, or the mail icon to
        schedule an email through the edge function.
      </p>
      <CalendarMonth />
      <EventDialog />
      <ScheduleEmailDialog />
    </div>
  )
}
