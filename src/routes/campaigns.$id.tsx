import { useState } from "react"
import { Link, useNavigate, useParams } from "@tanstack/react-router"
import { format } from "date-fns"
import { Mail } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CampaignForm } from "@/components/CampaignForm"
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton"
import { StatusFilter } from "@/components/StatusFilter"
import {
  DELIVERABLE_STATUSES,
  type DeliverableRow,
  type DeliverableStatus,
} from "@/lib/database.types"
import { campaignPayload, type CampaignFormValues } from "@/lib/schemas"
import {
  useCampaign,
  useDeleteCampaign,
  useUpdateCampaign,
  useUpdateCampaignClamp,
} from "@/lib/campaigns"
import {
  completionPercent,
  useCampaignDeliverables,
} from "@/lib/deliverables"
import { useCategoryMap } from "@/lib/categories"
import { useUiStore } from "@/lib/uiStore"

// Split deliverables by how a new campaign window [start, end] affects them.
// Dates are yyyy-mm-dd strings, so lexical compare is chronological.
// - clampable: overflows the window but still has a valid span after clamping
//   (max(start, newStart) <= min(end, newEnd)) — auto-clamp can fix it.
// - unclampable: lies entirely outside the new window — clamping would invert the
//   span, so the campaign save must be blocked until it's fixed/deleted by hand.
function partitionByBounds(
  deliverables: DeliverableRow[],
  newStart: string,
  newEnd: string,
) {
  const clampable: DeliverableRow[] = []
  const unclampable: DeliverableRow[] = []
  for (const d of deliverables) {
    const overflows = d.start_date < newStart || d.end_date > newEnd
    if (!overflows) continue
    const clampedStart = d.start_date > newStart ? d.start_date : newStart
    const clampedEnd = d.end_date < newEnd ? d.end_date : newEnd
    if (clampedStart > clampedEnd) unclampable.push(d)
    else clampable.push(d)
  }
  return { clampable, unclampable }
}

// /campaigns/:id — campaign detail: deliverable list + derived completion %
// above, edit form below, delete at the bottom. Deliverable create/edit are
// their own pages; schedule-email stays a dialog (quick action).
export function CampaignDetailPage() {
  const { campaignId } = useParams({ strict: false }) as { campaignId: string }
  const navigate = useNavigate()
  const { data: campaign, isLoading, error } = useCampaign(campaignId)
  const deliverablesQuery = useCampaignDeliverables(campaignId)
  const updateCampaign = useUpdateCampaign()
  const updateCampaignClamp = useUpdateCampaignClamp()
  const deleteCampaign = useDeleteCampaign()
  const categoryMap = useCategoryMap()
  const openScheduleEmail = useUiStore((s) => s.openScheduleEmail)
  // Page-local: only this list cares, unlike the campaign filters in uiStore.
  const [statusFilter, setStatusFilter] = useState<DeliverableStatus | "all">(
    "all",
  )
  // When a campaign date edit would clamp existing deliverables, stash the pending
  // form values and surface a confirm dialog; the atomic clamp RPC runs on confirm.
  const [pendingClamp, setPendingClamp] = useState<{
    values: CampaignFormValues
    count: number
  } | null>(null)

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Loading campaign…</p>
  }
  if (error) {
    return <p className="text-destructive text-sm">{(error as Error).message}</p>
  }
  if (!campaign) {
    return (
      <div className="grid gap-2">
        <p className="text-sm">Campaign not found.</p>
        <Link to="/campaigns" className="text-sm underline">
          Back to campaigns
        </Link>
      </div>
    )
  }

  const deliverables = deliverablesQuery.data ?? []
  // Completion % is always over ALL deliverables — the status filter below
  // changes what's listed, never the denominator.
  const percent = completionPercent(deliverables)
  const visibleDeliverables =
    statusFilter === "all"
      ? deliverables
      : deliverables.filter((d) => d.status === statusFilter)

  async function onDelete() {
    await deleteCampaign.mutateAsync(campaign!.id)
    navigate({ to: "/campaigns" })
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-3">
        <Link
          to="/campaigns"
          className="text-muted-foreground w-fit text-sm hover:underline"
        >
          ← Back to campaigns
        </Link>
        <div className="grid gap-1">
          <div className="flex items-center gap-2">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{
                backgroundColor: categoryMap.get(campaign.category_id)?.color,
              }}
              title={categoryMap.get(campaign.category_id)?.name}
            />
            <h2 className="text-xl font-semibold">{campaign.name}</h2>
            <Badge variant="secondary" className="capitalize">
              {campaign.status.replace("_", " ")}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            {format(new Date(`${campaign.start_date}T00:00:00`), "MMM d, yyyy")}{" "}
            – {format(new Date(`${campaign.end_date}T00:00:00`), "MMM d, yyyy")}
          </p>
          <p className="text-muted-foreground text-sm">
            Completion: {percent === null ? "— (no deliverables yet)" : `${percent}%`}
          </p>
        </div>
      </div>

      <section className="grid gap-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Deliverables</h3>
          <Button asChild size="sm" variant="outline">
            <Link
              to="/campaigns/$campaignId/deliverables/new"
              params={{ campaignId: campaign.id }}
            >
              Add deliverable
            </Link>
          </Button>
        </div>

        <StatusFilter
          options={DELIVERABLE_STATUSES}
          value={statusFilter}
          onChange={setStatusFilter}
        />

        {deliverablesQuery.error && (
          <p className="text-destructive text-sm">
            {(deliverablesQuery.error as Error).message}
          </p>
        )}
        {deliverablesQuery.isLoading && (
          <p className="text-muted-foreground text-sm">Loading deliverables…</p>
        )}
        {!deliverablesQuery.isLoading && deliverables.length === 0 && (
          <p className="text-muted-foreground text-sm">
            No deliverables yet. Break the campaign down into dated pieces of
            work.
          </p>
        )}
        {!deliverablesQuery.isLoading &&
          deliverables.length > 0 &&
          visibleDeliverables.length === 0 && (
            <p className="text-muted-foreground text-sm">
              No deliverables with this status.
            </p>
          )}

        <div className="grid gap-2">
          {visibleDeliverables.map((d) => (
            <div
              key={d.id}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <div className="min-w-0 flex-1">
                <Link
                  to="/campaigns/$campaignId/deliverables/$deliverableId"
                  params={{ campaignId: campaign.id, deliverableId: d.id }}
                  className="truncate text-sm font-medium hover:underline"
                >
                  {d.title}
                </Link>
                <p className="text-muted-foreground truncate text-xs">
                  {format(new Date(`${d.start_date}T00:00:00`), "MMM d")} –{" "}
                  {format(new Date(`${d.end_date}T00:00:00`), "MMM d, yyyy")}
                  {d.owners.length > 0 && <> · {d.owners.join(", ")}</>}
                </p>
              </div>
              <Badge variant="secondary" className="shrink-0 capitalize">
                {d.status.replace("_", " ")}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                aria-label="Schedule email"
                onClick={() =>
                  openScheduleEmail({ id: d.id, title: d.title })
                }
              >
                <Mail className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-3">
        <h3 className="font-medium">Edit campaign</h3>
        <CampaignForm
          submitLabel="Save changes"
          pending={updateCampaign.isPending}
          defaultValues={{
            name: campaign.name,
            goal: campaign.goal ?? "",
            category_id: campaign.category_id,
            start_date: campaign.start_date,
            end_date: campaign.end_date,
            segmentation: campaign.segmentation ?? "",
            owners: campaign.owners,
            status: campaign.status,
            reminders_enabled: campaign.reminders_enabled,
          }}
          onSubmit={async (values) => {
            // Guard the cross-table date bound on the client (UX layer; the DB
            // triggers are the real guarantee). If the new window would orphan
            // deliverables, branch before writing.
            const { clampable, unclampable } = partitionByBounds(
              deliverables,
              values.start_date,
              values.end_date,
            )
            if (unclampable.length > 0) {
              // Can't auto-clamp these — block the save and name them. Thrown here,
              // caught + shown by CampaignForm's internal error display.
              throw new Error(
                `These deliverables fall entirely outside the new dates — fix or delete them first: ${unclampable
                  .map((d) => d.title)
                  .join(", ")}`,
              )
            }
            if (clampable.length > 0) {
              // Defer the write to the confirm dialog (atomic clamp RPC).
              setPendingClamp({ values, count: clampable.length })
              return
            }
            await updateCampaign.mutateAsync({
              id: campaign.id,
              values: campaignPayload(values),
            })
          }}
        />
      </section>

      <Dialog
        open={pendingClamp !== null}
        onOpenChange={(o) => !o && setPendingClamp(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust deliverables to the new dates?</DialogTitle>
            <DialogDescription>
              {pendingClamp?.count} deliverable
              {pendingClamp?.count === 1 ? "" : "s"} fall outside the new campaign
              window and will be clamped to fit. This happens in one step with the
              campaign update.
            </DialogDescription>
          </DialogHeader>
          {updateCampaignClamp.error && (
            <p className="text-destructive text-sm" role="alert">
              {(updateCampaignClamp.error as Error).message}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingClamp(null)}
              disabled={updateCampaignClamp.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={async () => {
                if (!pendingClamp) return
                try {
                  await updateCampaignClamp.mutateAsync({
                    id: campaign!.id,
                    ...campaignPayload(pendingClamp.values),
                  })
                  setPendingClamp(null)
                } catch {
                  // Failure is surfaced via updateCampaignClamp.error inside the
                  // dialog; swallow the rejection here (no unhandled rejection) and
                  // keep the dialog open so the user can retry or cancel.
                }
              }}
              disabled={updateCampaignClamp.isPending}
            >
              {updateCampaignClamp.isPending ? "Saving…" : "Clamp & save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <section className="grid justify-start gap-2 border-t pt-4">
        <ConfirmDeleteButton
          label="Delete campaign"
          title={`Delete "${campaign.name}"?`}
          description={`This permanently deletes the campaign, its ${deliverables.length} deliverable${deliverables.length === 1 ? "" : "s"}, and their email jobs. This cannot be undone.`}
          pending={deleteCampaign.isPending}
          onConfirm={onDelete}
        />
      </section>
    </div>
  )
}
