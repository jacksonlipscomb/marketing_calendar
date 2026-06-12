import { Link, useNavigate, useParams } from "@tanstack/react-router"

import { DeliverableForm } from "@/components/DeliverableForm"
import { useCampaign } from "@/lib/campaigns"
import { deliverablePayload } from "@/lib/schemas"
import { useCreateDeliverable } from "@/lib/deliverables"

// /campaigns/:id/deliverables/new — create form on its own page (page pattern).
export function NewDeliverablePage() {
  const { campaignId } = useParams({ strict: false }) as { campaignId: string }
  const navigate = useNavigate()
  const { data: campaign, isLoading, error } = useCampaign(campaignId)
  const createDeliverable = useCreateDeliverable()

  // react-hook-form captures defaultValues on first render, so wait for the
  // campaign before mounting the form — on a direct (uncached) hit the due-date
  // default would otherwise stay blank.
  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Loading campaign…</p>
  }
  if (error) {
    return <p className="text-destructive text-sm">{(error as Error).message}</p>
  }
  // A deliverable can't exist without its campaign, so a stale/bad URL stops
  // here instead of failing later on insert.
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

  return (
    <div className="grid gap-4">
      <div className="grid gap-1">
        <h2 className="text-xl font-semibold">New deliverable</h2>
        <p className="text-muted-foreground text-sm">
          for{" "}
          <Link
            to="/campaigns/$campaignId"
            params={{ campaignId }}
            className="underline"
          >
            {campaign.name}
          </Link>
        </p>
      </div>
      <DeliverableForm
        submitLabel="Create deliverable"
        pending={createDeliverable.isPending}
        // Default the due date inside the campaign window so a fresh form
        // starts valid relative to its campaign.
        defaultValues={{ due_date: campaign.start_date }}
        onSubmit={async (values) => {
          await createDeliverable.mutateAsync({
            campaign_id: campaignId,
            ...deliverablePayload(values),
          })
          navigate({ to: "/campaigns/$campaignId", params: { campaignId } })
        }}
      />
    </div>
  )
}
