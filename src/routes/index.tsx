import { CalendarMonth } from "@/components/CalendarMonth"
import { CategoryFilter } from "@/components/CategoryFilter"
import { EventDialog } from "@/components/EventDialog"
import { ScheduleEmailDialog } from "@/components/ScheduleEmailDialog"
import { UpcomingSends } from "@/components/UpcomingSends"

// Composition root for all five features: category filter (F4) above the
// calendar (F1), upcoming-sends panel (F5) beside it (stacked on small
// screens), and the event (F2) / schedule-email (F3) dialogs.
export function CalendarPage() {
  return (
    <div className="grid gap-4">
      <p className="text-muted-foreground text-sm">
        Click a day to add an event. Click an event to edit it, or the mail icon to
        schedule an email through the edge function.
      </p>
      <CategoryFilter />
      <div className="grid items-start gap-4 lg:grid-cols-[1fr_20rem]">
        <CalendarMonth />
        <UpcomingSends />
      </div>
      <EventDialog />
      <ScheduleEmailDialog />
    </div>
  )
}
