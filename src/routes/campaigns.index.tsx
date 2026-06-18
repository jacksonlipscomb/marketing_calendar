import { Link } from "@tanstack/react-router"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RangeFilter } from "@/components/RangeFilter"
import { StatusMultiFilter } from "@/components/StatusMultiFilter"
import { CategoryFilter } from "@/components/CategoryFilter"
import { DemoDataPanel } from "@/components/DemoDataPanel"
import { useCampaigns } from "@/lib/campaigns"
import { useUiStore } from "@/lib/uiStore"
import { CAMPAIGN_CATEGORIES, CAMPAIGN_STATUSES } from "@/lib/database.types"

// /campaigns — the campaign list, filtered by time range (overlap semantics)
// and status, combined server-side. List only — the timeline lives on the
// calendar page as campaign bars (owner re-spec, 2026-06-11).
export function CampaignsPage() {
  const {
    campaignRange,
    setCampaignRange,
    campaignStatuses,
    toggleCampaignStatus,
    campaignCategories,
    toggleCampaignCategory,
  } = useUiStore()
  const {
    data: campaigns = [],
    isLoading,
    error,
  } = useCampaigns(campaignRange, campaignStatuses, campaignCategories)

  const filtered =
    campaignRange !== "all" ||
    campaignStatuses.length < CAMPAIGN_STATUSES.length ||
    campaignCategories.length < CAMPAIGN_CATEGORIES.length

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Campaigns</h2>
        <Button asChild size="sm">
          <Link to="/campaigns/new">New campaign</Link>
        </Button>
      </div>

      <RangeFilter value={campaignRange} onChange={setCampaignRange} />
      <StatusMultiFilter
        options={CAMPAIGN_STATUSES}
        value={campaignStatuses}
        onToggle={toggleCampaignStatus}
      />
      <CategoryFilter
        value={campaignCategories}
        onToggle={toggleCampaignCategory}
      />

      {error && (
        <p className="text-destructive text-sm">{(error as Error).message}</p>
      )}
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

      <DemoDataPanel />
    </div>
  )
}
