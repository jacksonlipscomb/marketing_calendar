import { format } from "date-fns"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useUpcomingSends } from "@/lib/emailJobs"

// Feature 5: upcoming sends panel. Read-only view of email_jobs in `scheduled`
// status (soonest first) via useUpcomingSends; never writes. There is no worker
// in this PoC, so these jobs are queued but not auto-delivered — the copy below
// must keep saying so.
export function UpcomingSends() {
  const { data: sends = [], isLoading, error } = useUpcomingSends()

  return (
    <Card data-testid="upcoming-sends">
      <CardHeader>
        <CardTitle>Upcoming sends</CardTitle>
        <CardDescription>
          Emails queued as scheduled. This PoC has no delivery worker, so they
          are recorded but not sent automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {error && (
          <p className="text-destructive text-sm">{(error as Error).message}</p>
        )}
        {isLoading && (
          <p className="text-muted-foreground text-sm">Loading…</p>
        )}
        {!isLoading && !error && sends.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Nothing scheduled. Pick a future date in the schedule-email dialog
            to queue one.
          </p>
        )}
        {sends.map((send) => (
          <div key={send.id} className="grid gap-1 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-medium">
                {send.subject}
              </span>
              <Badge variant="secondary" className="shrink-0">
                {send.status}
              </Badge>
            </div>
            <p className="text-muted-foreground truncate text-xs">
              {send.deliverables ? `${send.deliverables.title} · ` : ""}
              to {send.recipient}
            </p>
            <p className="text-muted-foreground text-xs">
              {send.scheduled_for
                ? format(new Date(send.scheduled_for), "MMM d, yyyy h:mm a")
                : "No send time"}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
