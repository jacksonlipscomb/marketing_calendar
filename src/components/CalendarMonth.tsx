import { useMemo } from "react"
import { eachDayOfInterval, format, isSameMonth, isToday } from "date-fns"
import { Mail } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useUiStore } from "@/lib/uiStore"
import { useEvents, monthGridRange } from "@/lib/events"
import type { EventRow } from "@/lib/database.types"

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const dayKey = (d: Date) => format(d, "yyyy-MM-dd")

export function CalendarMonth() {
  const {
    currentMonth,
    nextMonth,
    prevMonth,
    goToday,
    activeCategories,
    openCreateEvent,
    openEditEvent,
    openScheduleEmail,
  } = useUiStore()

  const { data: events = [], isLoading, error } = useEvents(currentMonth)

  const days = useMemo(() => {
    const { start, end } = monthGridRange(currentMonth)
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  // Group the (category-filtered) events by their date for quick per-cell lookup.
  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventRow[]>()
    for (const ev of events) {
      if (!activeCategories.includes(ev.category)) continue
      const list = map.get(ev.event_date) ?? []
      list.push(ev)
      map.set(ev.event_date, list)
    }
    return map
  }, [events, activeCategories])

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
          const dayEvents = eventsByDay.get(key) ?? []
          const inMonth = isSameMonth(day, currentMonth)
          return (
            <div
              key={key}
              data-testid={`day-${key}`}
              onClick={() => openCreateEvent(key)}
              className={cn(
                "min-h-24 cursor-pointer border-r border-b p-1 text-left align-top last:border-r-0 hover:bg-accent/40",
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
                {dayEvents.map((ev) => (
                  <div
                    key={ev.id}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation()
                      openEditEvent(ev)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation()
                        openEditEvent(ev)
                      }
                    }}
                    className="group flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-white"
                    style={{ backgroundColor: `var(--cat-${ev.category})` }}
                    title={`${ev.title} · ${ev.category}`}
                  >
                    <span className="truncate">{ev.title}</span>
                    <button
                      type="button"
                      aria-label="Schedule email"
                      onClick={(e) => {
                        e.stopPropagation()
                        openScheduleEmail(ev)
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
        <p className="text-muted-foreground text-sm">Loading events…</p>
      )}
    </div>
  )
}
