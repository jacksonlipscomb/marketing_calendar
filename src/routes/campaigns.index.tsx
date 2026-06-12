import { Link } from "@tanstack/react-router"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RangeFilter } from "@/components/RangeFilter"
import { StatusFilter } from "@/components/StatusFilter"
import { TimelineView } from "@/components/TimelineView"
import { useCampaigns } from "@/lib/campaigns"
import { useUiStore } from "@/lib/uiStore"
import { CAMPAIGN_STATUSES, type CampaignRow } from "@/lib/database.types"
import { cn } from "@/lib/utils"

// /campaigns — campaigns filtered by time range (overlap semantics) and
// status, shown either as a list or as the timeline. The filters drive both
// presentations; the timeline additionally maps the range to its zoom.
export function CampaignsPage() {
  const {
    campaignRange,
    setCampaignRange,
    campaignStatus,
    setCampaignStatus,
    campaignView,
    setCampaignView,
  } = useUiStore()
  const {
    data: campaigns = [],
    isLoading,
    error,
  } = useCampaigns(campaignRange, campaignStatus)

  const filtered = campaignRange !== "all" || campaignStatus !== "all"

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Campaigns</h2>
        <Button asChild size="sm">
          <Link to="/campaigns/new">New campaign</Link>
        </Button>
      </div>

      <RangeFilter value={campaignRange} onChange={setCampaignRange} />
      <StatusFilter
        options={CAMPAIGN_STATUSES}
        value={campaignStatus}
        onChange={setCampaignStatus}
      />
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-sm">View:</span>
        {(["list", "timeline"] as const).map((view) => (
          <button
            key={view}
            type="button"
            aria-pressed={campaignView === view}
            data-testid={`view-${view}`}
            onClick={() => setCampaignView(view)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors",
              campaignView === view
                ? "bg-primary text-primary-foreground border-transparent"
                : "bg-background text-muted-foreground hover:bg-accent",
            )}
          >
            {view}
          </button>
        ))}
      </div>

      {campaignView === "timeline" ? (
        <TimelineView />
      ) : (
        <CampaignList
          campaigns={campaigns}
          isLoading={isLoading}
          error={error}
          filtered={filtered}
        />
      )}
    </div>
  )
}

function CampaignList({
  campaigns,
  isLoading,
  error,
  filtered,
}: {
  campaigns: CampaignRow[]
  isLoading: boolean
  error: Error | null
  filtered: boolean
}) {
  return (
    <div className="grid gap-2">
      {error && <p className="text-destructive text-sm">{error.message}</p>}
      {isLoading && (
        <p className="text-muted-foreground text-sm">Loading campaigns…</p>
      )}
      {!isLoading && !error && campaigns.length === 0 && (
        <p className="text-muted-foreground text-sm">
          {filtered
            ? "No campaigns match the current filters."
            : "No campaigns yet. Create one to start planning."}
        </p>
      )}

      <div className="grid gap-2">
        {campaigns.map((c) => (
          <Link
            key={c.id}
            to="/campaigns/$campaignId"
            params={{ campaignId: c.id }}
            className="hover:bg-accent/40 grid gap-1 rounded-lg border p-3"
          >
            <div className="flex items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: `var(--cat-${c.category})` }}
                title={c.category}
              />
              <span className="truncate font-medium">{c.name}</span>
              <Badge variant="secondary" className="ml-auto shrink-0 capitalize">
                {c.status.replace("_", " ")}
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs">
              {format(new Date(`${c.start_date}T00:00:00`), "MMM d, yyyy")} –{" "}
              {format(new Date(`${c.end_date}T00:00:00`), "MMM d, yyyy")}
              {c.owners.length > 0 && <> · {c.owners.join(", ")}</>}
              {c.goal && <> · {c.goal}</>}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
