import { useMemo } from "react"
import {
  differenceInCalendarDays,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
} from "date-fns"
import { useNavigate } from "@tanstack/react-router"
import { Mail } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useUiStore } from "@/lib/uiStore"
import { useCampaignsInRange } from "@/lib/campaigns"
import {
  monthGridRange,
  useMonthDeliverables,
  type CalendarDeliverable,
} from "@/lib/deliverables"
import type { CampaignRow } from "@/lib/database.types"

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const dayKey = (d: Date) => format(d, "yyyy-MM-dd")

// Bar band geometry (px). Bars are absolutely positioned over each week row:
// the band starts below the day-number line, one lane per overlapping campaign.
const BAND_TOP = 28 // cell padding (4) + day-number block (24)
const LANE_H = 24 // lane stride
const BAR_H = 20 // bar height (4px gap between lanes)

type Segment = {
  campaign: CampaignRow
  startCol: number // 1..7
  endCol: number // 1..7
  clippedStart: boolean // continues before this week → square left edge
  clippedEnd: boolean // continues after this week → square right edge
  lane: number
}

// One week's bar layout: campaign segments packed greedily into lanes
// (first lane whose previous segment ends before this one starts).
function weekSegments(week: Date[], campaigns: CampaignRow[]): Segment[] {
  const weekStart = dayKey(week[0])
  const weekEnd = dayKey(week[6])
  const segs = campaigns
    .filter((c) => c.start_date <= weekEnd && c.end_date >= weekStart)
    .map((c) => {
      const startCol =
        Math.max(
          differenceInCalendarDays(new Date(`${c.start_date}T00:00:00`), week[0]),
          0,
        ) + 1
      const endCol =
        Math.min(
          differenceInCalendarDays(new Date(`${c.end_date}T00:00:00`), week[0]),
          6,
        ) + 1
      return {
        campaign: c,
        startCol,
        endCol,
        clippedStart: c.start_date < weekStart,
        clippedEnd: c.end_date > weekEnd,
        lane: 0,
      }
    })
    .sort((a, b) => a.startCol - b.startCol || b.endCol - a.endCol)

  const laneEnds: number[] = []
  for (const seg of segs) {
    const lane = laneEnds.findIndex((end) => end < seg.startCol)
    if (lane === -1) {
      seg.lane = laneEnds.length
      laneEnds.push(seg.endCol)
    } else {
      seg.lane = lane
      laneEnds[lane] = seg.endCol
    }
  }
  return segs
}

// Month view: campaigns as horizontal bars spanning their dates (one segment
// per week row, lane-stacked when they overlap), deliverables listed below
// the bars in each day cell. Both are colored by campaign category and
// filtered by the same category toggles; clicking either opens the campaign.
export function CalendarMonth() {
  const { currentMonth, nextMonth, prevMonth, goToday, activeCategories } =
    useUiStore()
  const openScheduleEmail = useUiStore((s) => s.openScheduleEmail)
  const navigate = useNavigate()

  const { start: gridStart, end: gridEnd } = monthGridRange(currentMonth)
  const {
    data: deliverables = [],
    isLoading,
    error,
  } = useMonthDeliverables(currentMonth)
  const campaignsQuery = useCampaignsInRange(gridStart, gridEnd)

  const weeks = useMemo(() => {
    const { start, end } = monthGridRange(currentMonth)
    const days = eachDayOfInterval({ start, end })
    const chunks: Date[][] = []
    for (let i = 0; i < days.length; i += 7) chunks.push(days.slice(i, i + 7))
    return chunks
  }, [currentMonth])

  const visibleCampaigns = useMemo(
    () =>
      (campaignsQuery.data ?? []).filter((c) =>
        activeCategories.includes(c.category),
      ),
    [campaignsQuery.data, activeCategories],
  )

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

  function openCampaign(campaignId: string) {
    navigate({ to: "/campaigns/$campaignId", params: { campaignId } })
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
      {campaignsQuery.error && (
        <p className="text-destructive text-sm">
          {(campaignsQuery.error as Error).message}
        </p>
      )}

      <div className="overflow-hidden rounded-lg border">
        <div className="grid grid-cols-7">
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              className="bg-muted text-muted-foreground border-b px-2 py-1 text-center text-xs font-medium"
            >
              {w}
            </div>
          ))}
        </div>

        {weeks.map((week) => {
          const segments = weekSegments(week, visibleCampaigns)
          const laneCount = segments.reduce((m, s) => Math.max(m, s.lane + 1), 0)
          return (
            <div key={dayKey(week[0])} className="relative">
              <div className="grid grid-cols-7">
                {week.map((day) => {
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
                      <div className="flex h-6 items-center justify-between px-1">
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
                      {/* reserved space the campaign bars float over */}
                      {laneCount > 0 && (
                        <div style={{ height: laneCount * LANE_H }} aria-hidden />
                      )}
                      <div className="mt-1 grid gap-1">
                        {dayItems.map((d) => (
                          <div
                            key={d.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => openCampaign(d.campaign_id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ")
                                openCampaign(d.campaign_id)
                            }}
                            className="group flex cursor-pointer items-start gap-1 rounded px-1.5 py-0.5 text-xs text-white"
                            style={{
                              backgroundColor: `var(--cat-${d.campaigns?.category ?? "recruiting"})`,
                            }}
                            title={`${d.title} · ${d.campaigns?.name ?? "campaign"}`}
                          >
                            <span className="line-clamp-2 min-w-0 flex-1 break-words">
                              {d.title}
                            </span>
                            <button
                              type="button"
                              aria-label="Schedule email"
                              onClick={(e) => {
                                e.stopPropagation()
                                openScheduleEmail({ id: d.id, title: d.title })
                              }}
                              className="mt-0.5 ml-auto shrink-0 opacity-80 hover:opacity-100"
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

              {segments.map((seg) => (
                <div
                  key={seg.campaign.id}
                  role="button"
                  tabIndex={0}
                  data-testid={`campaign-bar-${seg.campaign.id}`}
                  aria-label={`${seg.campaign.name}, ${seg.campaign.start_date} to ${seg.campaign.end_date}`}
                  onClick={() => openCampaign(seg.campaign.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      openCampaign(seg.campaign.id)
                  }}
                  className={cn(
                    "absolute z-10 flex cursor-pointer items-center rounded-full px-2 text-xs text-white hover:opacity-90",
                    seg.clippedStart && "rounded-l-none",
                    seg.clippedEnd && "rounded-r-none",
                  )}
                  style={{
                    top: BAND_TOP + seg.lane * LANE_H,
                    height: BAR_H,
                    left: `calc(${((seg.startCol - 1) / 7) * 100}% + 2px)`,
                    width: `calc(${((seg.endCol - seg.startCol + 1) / 7) * 100}% - 4px)`,
                    backgroundColor: `var(--cat-${seg.campaign.category})`,
                  }}
                  title={`${seg.campaign.name} · ${seg.campaign.category} · ${seg.campaign.start_date} → ${seg.campaign.end_date}`}
                >
                  <span className="truncate">{seg.campaign.name}</span>
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {(isLoading || campaignsQuery.isLoading) && (
        <p className="text-muted-foreground text-sm">Loading…</p>
      )}
    </div>
  )
}
