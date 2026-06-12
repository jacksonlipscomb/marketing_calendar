import { Link, useNavigate, useParams } from "@tanstack/react-router"

import { DeliverableForm } from "@/components/DeliverableForm"
import { useCampaign } from "@/lib/campaigns"
import { deliverablePayload } from "@/lib/schemas"
import { useCreateDeliverable } from "@/lib/deliverables"

// /campaigns/:id/deliverables/new — create form on its own page (page pattern).
export function NewDeliverablePage() {
  const { campaignId } = useParams({ strict: false }) as { campaignId: string }
  const navigate = useNavigate()
  const { data: campaign } = useCampaign(campaignId)
  const createDeliverable = useCreateDeliverable()

  return (
    <div className="grid gap-4">
      <div className="grid gap-1">
        <h2 className="text-xl font-semibold">New deliverable</h2>
        {campaign && (
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
        )}
      </div>
      <DeliverableForm
        submitLabel="Create deliverable"
        pending={createDeliverable.isPending}
        // Default the due date inside the campaign window so a fresh form
        // starts valid relative to its campaign.
        defaultValues={{ due_date: campaign?.start_date ?? "" }}
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
