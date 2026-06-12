import { useMemo } from "react"
import { eachDayOfInterval, format, isSameMonth, isToday } from "date-fns"
import { useNavigate } from "@tanstack/react-router"
import { Mail } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useUiStore } from "@/lib/uiStore"
import {
  monthGridRange,
  useMonthDeliverables,
  type CalendarDeliverable,
} from "@/lib/deliverables"

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const dayKey = (d: Date) => format(d, "yyyy-MM-dd")

// Month grid of deliverables by due date, colored by the parent campaign's
// category. Clicking a deliverable opens its campaign page; the mail icon
// opens the schedule-email dialog. (Same-date wrapping and the campaign
// timeline land in Phases 2–3.)
export function CalendarMonth() {
  const {
    currentMonth,
    nextMonth,
    prevMonth,
    goToday,
    activeCategories,
    openScheduleEmail,
  } = useUiStore()
  const navigate = useNavigate()

  const {
    data: deliverables = [],
    isLoading,
    error,
  } = useMonthDeliverables(currentMonth)

  const days = useMemo(() => {
    const { start, end } = monthGridRange(currentMonth)
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  // Group the (category-filtered) deliverables by due date for per-cell lookup.
  const deliverablesByDay = useMemo(() => {
    const map = new Map<string, CalendarDeliverable[]>()
    for (const d of deliverables) {
      const category = d.campaigns?.category
      if (category && !activeCategories.includes(category)) continue
      const list = map.get(d.due_date) ?? []
      list.push(d)
      map.set(d.due_date, list)
    }
    return map
  }, [deliverables, activeCategories])

  function openCampaign(d: CalendarDeliverable) {
    navigate({
      to: "/campaigns/$campaignId",
      params: { campaignId: d.campaign_id },
    })
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={prevMonth}>
            Prev
          </Button>
          <Button variant="outline" size="sm" onClick={goToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={nextMonth}>
            Next
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-destructive text-sm">{(error as Error).message}</p>
      )}

      <div className="grid grid-cols-7 overflow-hidden rounded-lg border">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="bg-muted text-muted-foreground border-b px-2 py-1 text-center text-xs font-medium"
          >
            {w}
          </div>
        ))}

        {days.map((day) => {
          const key = dayKey(day)
          const dayItems = deliverablesByDay.get(key) ?? []
          const inMonth = isSameMonth(day, currentMonth)
          return (
            <div
              key={key}
              data-testid={`day-${key}`}
              className={cn(
                "min-h-24 border-r border-b p-1 text-left align-top last:border-r-0",
                !inMonth && "bg-muted/30 text-muted-foreground",
              )}
            >
              <div className="flex items-center justify-between px-1">
                <span
                  className={cn(
                    "text-xs",
                    isToday(day) &&
                      "bg-primary text-primary-foreground flex size-5 items-center justify-center rounded-full",
                  )}
                >
                  {format(day, "d")}
                </span>
              </div>
              <div className="mt-1 grid gap-1">
                {dayItems.map((d) => (
                  <div
                    key={d.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openCampaign(d)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") openCampaign(d)
                    }}
                    className="group flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-xs text-white"
                    style={{
                      backgroundColor: `var(--cat-${d.campaigns?.category ?? "recruiting"})`,
                    }}
                    title={`${d.title} · ${d.campaigns?.name ?? "campaign"}`}
                  >
                    <span className="truncate">{d.title}</span>
                    <button
                      type="button"
                      aria-label="Schedule email"
                      onClick={(e) => {
                        e.stopPropagation()
                        openScheduleEmail({ id: d.id, title: d.title })
                      }}
                      className="ml-auto shrink-0 opacity-80 hover:opacity-100"
                    >
                      <Mail className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {isLoading && (
        <p className="text-muted-foreground text-sm">Loading deliverables…</p>
      )}
    </div>
  )
}
