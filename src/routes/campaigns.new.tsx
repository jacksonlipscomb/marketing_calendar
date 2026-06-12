import { useNavigate } from "@tanstack/react-router"

import { CampaignForm } from "@/components/CampaignForm"
import { useCreateCampaign } from "@/lib/campaigns"
import { campaignPayload } from "@/lib/schemas"

// /campaigns/new — create form on its own page (page pattern: deep-linkable).
export function NewCampaignPage() {
  const navigate = useNavigate()
  const createCampaign = useCreateCampaign()

  return (
    <div className="grid gap-4">
      <h2 className="text-xl font-semibold">New campaign</h2>
      <CampaignForm
        submitLabel="Create campaign"
        pending={createCampaign.isPending}
        onSubmit={async (values) => {
          const row = await createCampaign.mutateAsync(campaignPayload(values))
          navigate({
            to: "/campaigns/$campaignId",
            params: { campaignId: row.id },
          })
        }}
      />
    </div>
  )
}
