import { Link, useNavigate, useParams } from "@tanstack/react-router"
import { format } from "date-fns"

import { Badge } from "@/components/ui/badge"
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton"
import { DeliverableForm } from "@/components/DeliverableForm"
import { deliverablePayload } from "@/lib/schemas"
import {
  useDeleteDeliverable,
  useDeliverable,
  useUpdateDeliverable,
} from "@/lib/deliverables"

// /campaigns/:id/deliverables/:deliverableId — the deliverable's own page:
// detail header + edit form + delete. Fetches the single row by its own id
// (useDeliverable) so it loads standalone on a cold deep link, and shows
// not-found when the row is missing OR its campaign_id doesn't match the URL's
// campaignId (a stale/hand-edited link) — never rendered under the wrong campaign.
export function EditDeliverablePage() {
  const { campaignId, deliverableId } = useParams({ strict: false }) as {
    campaignId: string
    deliverableId: string
  }
  const navigate = useNavigate()
  const { data: deliverable, isLoading, error } = useDeliverable(deliverableId)
  const updateDeliverable = useUpdateDeliverable()
  const deleteDeliverable = useDeleteDeliverable()

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Loading deliverable…</p>
  }
  if (error) {
    return <p className="text-destructive text-sm">{(error as Error).message}</p>
  }
  // Missing row, or a stale/hand-edited URL whose campaignId isn't this
  // deliverable's parent: refuse to render it under the wrong campaign.
  if (!deliverable || deliverable.campaign_id !== campaignId) {
    return (
      <div className="grid gap-2">
        <p className="text-sm">Deliverable not found.</p>
        <Link to="/campaigns" className="text-sm underline">
          Back to campaigns
        </Link>
      </div>
    )
  }

  async function onDelete() {
    await deleteDeliverable.mutateAsync(deliverable!.id)
    navigate({ to: "/campaigns/$campaignId", params: { campaignId } })
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-3">
        <Link
          to="/campaigns/$campaignId"
          params={{ campaignId }}
          className="text-muted-foreground w-fit text-sm hover:underline"
        >
          ← Back to {deliverable.campaigns?.name ?? "campaign"}
        </Link>
        <div className="grid gap-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">{deliverable.title}</h2>
            <Badge variant="secondary" className="capitalize">
              {deliverable.status.replace("_", " ")}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            {format(
              new Date(`${deliverable.start_date}T00:00:00`),
              "MMM d, yyyy",
            )}{" "}
            –{" "}
            {format(new Date(`${deliverable.end_date}T00:00:00`), "MMM d, yyyy")}
            {deliverable.owners.length > 0 && (
              <> · {deliverable.owners.join(", ")}</>
            )}
          </p>
        </div>
      </div>

      <section className="grid gap-3">
        <h3 className="font-medium">Edit deliverable</h3>
        <DeliverableForm
          submitLabel="Save changes"
          pending={updateDeliverable.isPending}
          campaignStart={deliverable.campaigns?.start_date}
          campaignEnd={deliverable.campaigns?.end_date}
          defaultValues={{
            title: deliverable.title,
            details: deliverable.details ?? "",
            start_date: deliverable.start_date,
            end_date: deliverable.end_date,
            owners: deliverable.owners,
            status: deliverable.status,
          }}
          onSubmit={async (values) => {
            await updateDeliverable.mutateAsync({
              id: deliverable.id,
              values: deliverablePayload(values),
            })
            navigate({ to: "/campaigns/$campaignId", params: { campaignId } })
          }}
        />
      </section>

      <section className="grid justify-start gap-2 border-t pt-4">
        <ConfirmDeleteButton
          label="Delete deliverable"
          title={`Delete "${deliverable.title}"?`}
          description="This permanently deletes the deliverable and its email jobs. This cannot be undone."
          pending={deleteDeliverable.isPending}
          onConfirm={onDelete}
        />
      </section>
    </div>
  )
}
