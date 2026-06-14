import { useState } from "react"
import { Link, useNavigate, useParams } from "@tanstack/react-router"
import { format } from "date-fns"
import { Mail } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CampaignForm } from "@/components/CampaignForm"
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton"
import { StatusFilter } from "@/components/StatusFilter"
import {
  DELIVERABLE_STATUSES,
  type DeliverableStatus,
} from "@/lib/database.types"
import { campaignPayload } from "@/lib/schemas"
import {
  useCampaign,
  useDeleteCampaign,
  useUpdateCampaign,
} from "@/lib/campaigns"
import {
  completionPercent,
  useCampaignDeliverables,
} from "@/lib/deliverables"
import { useUiStore } from "@/lib/uiStore"

// /campaigns/:id — campaign detail: deliverable list + derived completion %
// above, edit form below, delete at the bottom. Deliverable create/edit are
// their own pages; schedule-email stays a dialog (quick action).
export function CampaignDetailPage() {
  const { campaignId } = useParams({ strict: false }) as { campaignId: string }
  const navigate = useNavigate()
  const { data: campaign, isLoading, error } = useCampaign(campaignId)
  const deliverablesQuery = useCampaignDeliverables(campaignId)
  const updateCampaign = useUpdateCampaign()
  const deleteCampaign = useDeleteCampaign()
  const openScheduleEmail = useUiStore((s) => s.openScheduleEmail)
  // Page-local: only this list cares, unlike the campaign filters in uiStore.
  const [statusFilter, setStatusFilter] = useState<DeliverableStatus | "all">(
    "all",
  )

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
              style={{ backgroundColor: `var(--cat-${campaign.category})` }}
              title={campaign.category}
            />
            <h2 className="text-xl font-semibold">{campaign.name}</h2>
            <Badge variant="secondary" className="capitalize">
              {campaign.status.replace("_", " ")}
            </Badge>
          </div>
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
                  due {format(new Date(`${d.due_date}T00:00:00`), "MMM d, yyyy")}
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
            category: campaign.category,
            start_date: campaign.start_date,
            end_date: campaign.end_date,
            segmentation: campaign.segmentation ?? "",
            owners: campaign.owners,
            status: campaign.status,
            reminders_enabled: campaign.reminders_enabled,
          }}
          onSubmit={async (values) => {
            await updateCampaign.mutateAsync({
              id: campaign.id,
              values: campaignPayload(values),
            })
          }}
        />
      </section>

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
