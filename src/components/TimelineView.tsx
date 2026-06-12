import { useMemo } from "react"
import { useNavigate } from "@tanstack/react-router"
import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  format,
  isWithinInterval,
} from "date-fns"

import { cn } from "@/lib/utils"
import { useUiStore } from "@/lib/uiStore"
import {
  rangeBounds,
  timelineZoom,
  useCampaigns,
  type TimelineZoom,
} from "@/lib/campaigns"
import { useDeliverablesInRange } from "@/lib/deliverables"
import { CAMPAIGN_CATEGORIES, type CampaignRow } from "@/lib/database.types"

// Timeline of campaigns (features.md Phase 3): one CSS grid with a column per
// day in the window and a row per campaign. A bar spans the campaign's dates
// (clipped to the window — the clipped side loses its rounding to say "this
// continues"), colored by category; deliverable due dates sit on the bar as
// ticks; clicking a bar opens the campaign. Zoom is the shared range filter
// mapped through timelineZoom(), not a second control.

const scaleFormat: Record<TimelineZoom, string> = {
  week: "EEE d",
  month: "MMM d",
  quarter: "MMM",
  year: "MMM",
}

// Where the scale labels (and their vertical gridlines) sit.
function scaleMarks(zoom: TimelineZoom, start: Date, end: Date): Date[] {
  switch (zoom) {
    case "week":
      return eachDayOfInterval({ start, end })
    case "month": {
      // Weekly marks from the 1st: 1, 8, 15, 22, 29.
      const marks: Date[] = []
      for (let d = start; d <= end; d = addDays(d, 7)) marks.push(d)
      return marks
    }
    case "quarter":
    case "year":
      return eachMonthOfInterval({ start, end })
  }
}

// Year zoom packs ~365 day-columns; force a readable min width and let the
// wrapper scroll horizontally instead of crushing the columns.
const minWidth: Record<TimelineZoom, string> = {
  week: "",
  month: "",
  quarter: "min-w-[40rem]",
  year: "min-w-[70rem]",
}

export function TimelineView() {
  const navigate = useNavigate()
  const { campaignRange, campaignStatus } = useUiStore()
  const zoom = timelineZoom(campaignRange)
  // Zoom is never "all", so bounds are always defined.
  const { start, end } = rangeBounds(zoom)!

  const campaignsQuery = useCampaigns(zoom, campaignStatus)
  const deliverablesQuery = useDeliverablesInRange(start, end)

  const campaigns = campaignsQuery.data ?? []
  const totalDays = differenceInCalendarDays(end, start) + 1

  // 1-based grid column for a date, clamped into the window.
  const col = (iso: string) =>
    Math.min(
      Math.max(differenceInCalendarDays(new Date(`${iso}T00:00:00`), start), 0),
      totalDays - 1,
    ) + 1

  const ticksByCampaign = useMemo(() => {
    const map = new Map<string, { id: string; title: string; due_date: string }[]>()
    for (const d of deliverablesQuery.data ?? []) {
      const list = map.get(d.campaign_id) ?? []
      list.push({ id: d.id, title: d.title, due_date: d.due_date })
      map.set(d.campaign_id, list)
    }
    return map
  }, [deliverablesQuery.data])

  const marks = scaleMarks(zoom, start, end)
  const today = new Date()
  const todayCol = isWithinInterval(today, { start, end })
    ? differenceInCalendarDays(today, start) + 1
    : null

  function openCampaign(c: CampaignRow) {
    navigate({ to: "/campaigns/$campaignId", params: { campaignId: c.id } })
  }

  return (
    <div className="grid gap-3">
      <p className="text-muted-foreground text-sm">
        {format(start, "MMM d, yyyy")} – {format(end, "MMM d, yyyy")}
        {zoom !== campaignRange && (
          <> · the {campaignRange === "day" ? "day" : "all"} range shows as a {zoom} timeline</>
        )}
      </p>

      {campaignsQuery.error && (
        <p className="text-destructive text-sm">
          {(campaignsQuery.error as Error).message}
        </p>
      )}
      {campaignsQuery.isLoading && (
        <p className="text-muted-foreground text-sm">Loading campaigns…</p>
      )}
      {!campaignsQuery.isLoading && campaigns.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No campaigns in this window.
        </p>
      )}

      {campaigns.length > 0 && (
        <div className="overflow-x-auto rounded-lg border p-3">
          <div
            data-testid="timeline-grid"
            className={cn("grid gap-y-1.5", minWidth[zoom])}
            style={{
              gridTemplateColumns: `repeat(${totalDays}, minmax(0, 1fr))`,
              gridTemplateRows: `1.5rem repeat(${campaigns.length}, 2.25rem)`,
            }}
          >
            {/* vertical gridlines + scale labels */}
            {marks.map((mark) => {
              const c = differenceInCalendarDays(mark, start) + 1
              return (
                <div
                  key={mark.toISOString()}
                  className="border-border/70 text-muted-foreground row-span-full border-l pl-1 text-[10px] leading-6 whitespace-nowrap"
                  style={{ gridColumn: c, gridRow: "1 / -1" }}
                  aria-hidden
                >
                  {format(mark, scaleFormat[zoom])}
                </div>
              )
            })}

            {/* today line */}
            {todayCol !== null && (
              <div
                data-testid="timeline-today"
                className="border-destructive border-l-2"
                style={{ gridColumn: todayCol, gridRow: "1 / -1" }}
                aria-hidden
              />
            )}

            {/* one bar per campaign + its deliverable ticks */}
            {campaigns.map((c, i) => {
              const row = i + 2
              const clippedStart = c.start_date < format(start, "yyyy-MM-dd")
              const clippedEnd = c.end_date > format(end, "yyyy-MM-dd")
              const s = col(c.start_date)
              const e = col(c.end_date)
              return (
                <div key={c.id} className="contents">
                  <div
                    role="button"
                    tabIndex={0}
                    data-testid={`timeline-bar-${c.id}`}
                    aria-label={`${c.name}, ${format(new Date(`${c.start_date}T00:00:00`), "MMM d")} to ${format(new Date(`${c.end_date}T00:00:00`), "MMM d")}`}
                    onClick={() => openCampaign(c)}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter" || ev.key === " ") openCampaign(c)
                    }}
                    className={cn(
                      "z-10 flex cursor-pointer items-center self-center rounded-full px-2 py-1 text-xs text-white hover:opacity-90",
                      clippedStart && "rounded-l-none",
                      clippedEnd && "rounded-r-none",
                    )}
                    style={{
                      gridRow: row,
                      gridColumn: `${s} / ${e + 1}`,
                      backgroundColor: `var(--cat-${c.category})`,
                    }}
                    title={`${c.name} · ${c.category} · ${c.start_date} → ${c.end_date}`}
                  >
                    <span className="truncate">{c.name}</span>
                  </div>
                  {(ticksByCampaign.get(c.id) ?? []).map((t) => (
                    <div
                      key={t.id}
                      data-testid={`timeline-tick-${t.id}`}
                      onClick={() => openCampaign(c)}
                      className="ring-foreground/40 z-20 size-2 cursor-pointer place-self-center rounded-full bg-white ring-1"
                      style={{ gridRow: row, gridColumn: col(t.due_date) }}
                      title={`${t.title} · due ${format(new Date(`${t.due_date}T00:00:00`), "MMM d")}`}
                    />
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* category legend (bar colors) */}
      <div className="text-muted-foreground flex flex-wrap gap-3 text-xs">
        {CAMPAIGN_CATEGORIES.map((cat) => (
          <span key={cat} className="flex items-center gap-1 capitalize">
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: `var(--cat-${cat})` }}
            />
            {cat}
          </span>
        ))}
      </div>
    </div>
  )
}
