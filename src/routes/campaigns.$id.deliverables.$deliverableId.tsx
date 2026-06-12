import { Link, useNavigate, useParams } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { DeliverableForm } from "@/components/DeliverableForm"
import { deliverablePayload } from "@/lib/schemas"
import {
  useCampaignDeliverables,
  useDeleteDeliverable,
  useUpdateDeliverable,
} from "@/lib/deliverables"

// /campaigns/:id/deliverables/:deliverableId — edit form on its own page.
// Reuses the campaign's deliverables query (already cached from the detail
// page) rather than adding a one-row fetch hook for Phase 1.
export function EditDeliverablePage() {
  const { campaignId, deliverableId } = useParams({ strict: false }) as {
    campaignId: string
    deliverableId: string
  }
  const navigate = useNavigate()
  const { data: deliverables, isLoading, error } =
    useCampaignDeliverables(campaignId)
  const updateDeliverable = useUpdateDeliverable()
  const deleteDeliverable = useDeleteDeliverable()

  const deliverable = deliverables?.find((d) => d.id === deliverableId)

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Loading deliverable…</p>
  }
  if (error) {
    return <p className="text-destructive text-sm">{(error as Error).message}</p>
  }
  if (!deliverable) {
    return (
      <div className="grid gap-2">
        <p className="text-sm">Deliverable not found.</p>
        <Link
          to="/campaigns/$campaignId"
          params={{ campaignId }}
          className="text-sm underline"
        >
          Back to campaign
        </Link>
      </div>
    )
  }

  async function onDelete() {
    await deleteDeliverable.mutateAsync(deliverable!.id)
    navigate({ to: "/campaigns/$campaignId", params: { campaignId } })
  }

  return (
    <div className="grid gap-4">
      <h2 className="text-xl font-semibold">Edit deliverable</h2>
      <DeliverableForm
        submitLabel="Save changes"
        pending={updateDeliverable.isPending}
        defaultValues={{
          title: deliverable.title,
          details: deliverable.details ?? "",
          due_date: deliverable.due_date,
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
      <div className="grid justify-start gap-2 border-t pt-4">
        <Button
          variant="destructive"
          onClick={onDelete}
          disabled={deleteDeliverable.isPending}
        >
          Delete deliverable
        </Button>
        <p className="text-muted-foreground text-xs">
          Deletes its email jobs too (cascade).
        </p>
      </div>
    </div>
  )
}
