import { CalendarMonth } from "@/components/CalendarMonth"
import { CategoryFilter } from "@/components/CategoryFilter"
import { UpcomingSends } from "@/components/UpcomingSends"
import { useUiStore } from "@/lib/uiStore"
import { useCategories } from "@/lib/categories"

// Calendar page: deliverables by due date with the category filter above and
// the upcoming-sends panel beside (stacked on small screens). Deliverables are
// created from their campaign's page; the schedule-email dialog mounts in the
// root layout.
export function CalendarPage() {
  const hidden = useUiStore((s) => s.hiddenCalendarCategoryIds)
  const toggleCalendarCategory = useUiStore((s) => s.toggleCalendarCategory)
  const { data: categories = [] } = useCategories()
  // Selected = every category not in the hidden set (the CategoryFilter contract).
  const selectedIds = categories
    .filter((c) => !hidden.includes(c.id))
    .map((c) => c.id)
  return (
    <div className="grid gap-4">
      <p className="text-muted-foreground text-sm">
        Deliverables appear on their due date. Click one to open its campaign,
        or the mail icon to schedule an email through the edge function.
      </p>
      <CategoryFilter
        categories={categories}
        value={selectedIds}
        onToggle={toggleCalendarCategory}
      />
      <div className="grid items-start gap-4 lg:grid-cols-[1fr_20rem]">
        <CalendarMonth />
        <UpcomingSends />
      </div>
    </div>
  )
}
