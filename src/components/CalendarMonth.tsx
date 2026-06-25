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
import { useCategoryMap } from "@/lib/categories"
import { monthGridRange, useMonthDeliverables } from "@/lib/deliverables"

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const dayKey = (d: Date) => format(d, "yyyy-MM-dd")
// Color for a bar whose category row hasn't loaded yet (or was deleted).
const FALLBACK_CAT_COLOR = "#94a3b8"

// Bar band geometry (px). Bars are absolutely positioned over each week row.
// Two stacked bands: campaign bars first, then a thinner deliverable band below.
const BAND_TOP = 28 // cell padding (4) + day-number block (24)
const LANE_H = 24 // campaign lane stride
const BAR_H = 20 // campaign bar height (4px gap between lanes)
const DELIV_LANE_H = 22 // deliverable lane stride (thinner band)
const DELIV_BAR_H = 18 // deliverable bar height

// One packed segment for a single week row: an item (campaign or deliverable)
// clipped to this week's columns and assigned a lane.
type PackedSegment<T> = {
  item: T
  startCol: number // 1..7
  endCol: number // 1..7
  clippedStart: boolean // continues before this week → square left edge
  clippedEnd: boolean // continues after this week → square right edge
  lane: number
}

// Pack any date-span items into lanes for one week (first lane whose previous
// segment ends before this one starts). Shared by campaign and deliverable bars —
// both have id/start_date/end_date, so the geometry is identical; only the visual
// treatment and the band offset differ.
function packWeek<
  T extends { id: string; start_date: string; end_date: string },
>(week: Date[], items: T[]): PackedSegment<T>[] {
  const weekStart = dayKey(week[0])
  const weekEnd = dayKey(week[6])
  const segs = items
    .filter((it) => it.start_date <= weekEnd && it.end_date >= weekStart)
    .map((it) => {
      const startCol =
        Math.max(
          differenceInCalendarDays(
            new Date(`${it.start_date}T00:00:00`),
            week[0],
          ),
          0,
        ) + 1
      const endCol =
        Math.min(
          differenceInCalendarDays(new Date(`${it.end_date}T00:00:00`), week[0]),
          6,
        ) + 1
      return {
        item: it,
        startCol,
        endCol,
        clippedStart: it.start_date < weekStart,
        clippedEnd: it.end_date > weekEnd,
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

const laneCountOf = (segs: PackedSegment<unknown>[]) =>
  segs.reduce((m, s) => Math.max(m, s.lane + 1), 0)

// Left/width CSS for a segment spanning columns startCol..endCol (1..7), with a
// 2px gutter so adjacent bars don't touch.
function segmentStyle(startCol: number, endCol: number) {
  return {
    left: `calc(${((startCol - 1) / 7) * 100}% + 2px)`,
    width: `calc(${((endCol - startCol + 1) / 7) * 100}% - 4px)`,
  }
}

// Month view: campaigns AND deliverables both render as horizontal bars spanning
// their date ranges (one segment per week row, lane-stacked when they overlap).
// Deliverables sit in a thinner band directly below the campaign bars. Both are
// colored by campaign category and filtered by the same category toggles; clicking
// a campaign bar opens the campaign, a deliverable bar opens the deliverable.
export function CalendarMonth() {
  const { currentMonth, nextMonth, prevMonth, goToday } = useUiStore()
  const hidden = useUiStore((s) => s.hiddenCalendarCategoryIds)
  const openScheduleEmail = useUiStore((s) => s.openScheduleEmail)
  const categoryMap = useCategoryMap()
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
      (campaignsQuery.data ?? []).filter(
        (c) => !hidden.includes(c.category_id),
      ),
    [campaignsQuery.data, hidden],
  )

  // Deliverables share the calendar's category filter (via the parent campaign's
  // category_id, embedded on the row).
  const visibleDeliverables = useMemo(
    () =>
      deliverables.filter((d) => {
        const id = d.campaigns?.category_id
        return id ? !hidden.includes(id) : true
      }),
    [deliverables, hidden],
  )

  function openCampaign(campaignId: string) {
    navigate({ to: "/campaigns/$campaignId", params: { campaignId } })
  }

  function openDeliverable(campaignId: string, deliverableId: string) {
    navigate({
      to: "/campaigns/$campaignId/deliverables/$deliverableId",
      params: { campaignId, deliverableId },
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
          const campaignSegs = packWeek(week, visibleCampaigns)
          const delivSegs = packWeek(week, visibleDeliverables)
          const campaignLanes = laneCountOf(campaignSegs)
          const delivLanes = laneCountOf(delivSegs)
          // Vertical space the two bands need, reserved inside each day cell so the
          // cell grows to contain the absolutely-positioned bars.
          const bandsHeight =
            campaignLanes * LANE_H + delivLanes * DELIV_LANE_H
          // Deliverable band starts just below the campaign band.
          const delivBandTop = BAND_TOP + campaignLanes * LANE_H
          return (
            <div key={dayKey(week[0])} className="relative">
              <div className="grid grid-cols-7">
                {week.map((day) => {
                  const key = dayKey(day)
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
                      {/* reserved space the campaign + deliverable bars float over */}
                      {bandsHeight > 0 && (
                        <div style={{ height: bandsHeight }} aria-hidden />
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Campaign bars — filled pills, top band. */}
              {campaignSegs.map((seg) => (
                <div
                  key={seg.item.id}
                  role="button"
                  tabIndex={0}
                  data-testid={`campaign-bar-${seg.item.id}`}
                  aria-label={`${seg.item.name}, ${seg.item.start_date} to ${seg.item.end_date}`}
                  onClick={() => openCampaign(seg.item.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault() // Space must not scroll the page
                      openCampaign(seg.item.id)
                    }
                  }}
                  className={cn(
                    "absolute z-10 flex cursor-pointer items-center rounded-full px-2 text-xs text-white hover:opacity-90",
                    seg.clippedStart && "rounded-l-none",
                    seg.clippedEnd && "rounded-r-none",
                  )}
                  style={{
                    top: BAND_TOP + seg.lane * LANE_H,
                    height: BAR_H,
                    ...segmentStyle(seg.startCol, seg.endCol),
                    backgroundColor:
                      categoryMap.get(seg.item.category_id)?.color ??
                      FALLBACK_CAT_COLOR,
                  }}
                  title={`${seg.item.name} · ${categoryMap.get(seg.item.category_id)?.name ?? "—"} · ${seg.item.start_date} → ${seg.item.end_date}`}
                >
                  <span className="truncate">{seg.item.name}</span>
                </div>
              ))}

              {/* Deliverable bars — thinner, square-cornered bars in the band
                  below the campaigns; deep-link to the deliverable, with the
                  schedule-email quick action inline. */}
              {delivSegs.map((seg) => (
                <div
                  key={seg.item.id}
                  role="button"
                  tabIndex={0}
                  data-testid={`deliverable-bar-${seg.item.id}`}
                  aria-label={`${seg.item.title}, ${seg.item.start_date} to ${seg.item.end_date}`}
                  onClick={() => openDeliverable(seg.item.campaign_id, seg.item.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault() // Space must not scroll the page
                      openDeliverable(seg.item.campaign_id, seg.item.id)
                    }
                  }}
                  className={cn(
                    "absolute z-10 flex cursor-pointer items-center gap-1 rounded-sm px-1.5 text-[11px] text-white ring-1 ring-white/40 ring-inset hover:opacity-90",
                    seg.clippedStart && "rounded-l-none",
                    seg.clippedEnd && "rounded-r-none",
                  )}
                  style={{
                    top: delivBandTop + seg.lane * DELIV_LANE_H,
                    height: DELIV_BAR_H,
                    ...segmentStyle(seg.startCol, seg.endCol),
                    backgroundColor:
                      categoryMap.get(seg.item.campaigns?.category_id ?? "")
                        ?.color ?? FALLBACK_CAT_COLOR,
                  }}
                  title={`${seg.item.title} · ${seg.item.campaigns?.name ?? "campaign"} · ${seg.item.start_date} → ${seg.item.end_date}`}
                >
                  <span className="min-w-0 flex-1 truncate">
                    {seg.item.title}
                  </span>
                  <button
                    type="button"
                    aria-label="Schedule email"
                    onClick={(e) => {
                      e.stopPropagation()
                      openScheduleEmail({ id: seg.item.id, title: seg.item.title })
                    }}
                    onKeyDown={(e) => e.stopPropagation()}
                    className="shrink-0 opacity-80 hover:opacity-100"
                  >
                    <Mail className="size-3" />
                  </button>
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
