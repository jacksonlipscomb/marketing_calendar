import { Link } from "@tanstack/react-router"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useCampaigns } from "@/lib/campaigns"

// /campaigns — the campaign list. Phase 1 lists everything in start-date order;
// the range (overlap) + status filters arrive in Phase 2 on this same page.
export function CampaignsPage() {
  const { data: campaigns = [], isLoading, error } = useCampaigns()

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Campaigns</h2>
        <Button asChild size="sm">
          <Link to="/campaigns/new">New campaign</Link>
        </Button>
      </div>

      {error && (
        <p className="text-destructive text-sm">{(error as Error).message}</p>
      )}
      {isLoading && (
        <p className="text-muted-foreground text-sm">Loading campaigns…</p>
      )}
      {!isLoading && !error && campaigns.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No campaigns yet. Create one to start planning.
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
