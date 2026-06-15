import { Fragment, type ReactNode } from "react"
import { Link, useRouterState } from "@tanstack/react-router"

import { useCampaign } from "@/lib/campaigns"
import { useDeliverable } from "@/lib/deliverables"

// Resolves a campaign id segment to its name (cached from the page's own
// query in the normal case; a cheap one-row fetch on a cold deep link).
function CampaignName({ id }: { id: string }) {
  const { data: campaign } = useCampaign(id)
  return <>{campaign?.name ?? "Campaign"}</>
}

// Resolves a deliverable id segment to its title — but only when it actually
// belongs to the campaign in the URL. On a stale/wrong-campaign link this would
// otherwise reveal the real title under the wrong campaign crumb, contradicting
// the page's not-found guard. The neutral "Deliverable" label also covers the
// loading/error window (data undefined), so no real title flashes.
function DeliverableName({
  deliverableId,
  campaignId,
}: {
  deliverableId: string
  campaignId: string
}) {
  const { data: deliverable } = useDeliverable(deliverableId)
  if (!deliverable || deliverable.campaign_id !== campaignId) {
    return <>Deliverable</>
  }
  return <>{deliverable.title}</>
}

// URL-derived breadcrumbs (page pattern): the trail is computed from the
// pathname segments alone, so every deep-linkable route shows where it lives.
// Hidden on the calendar home page, which is the trail's root.
export function Breadcrumbs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const segments = pathname.split("/").filter(Boolean)
  // The trail only applies to the campaigns flow and the flat table page; the
  // calendar home page is the trail's root and shows no crumbs.
  if (segments.length === 0) return null
  if (segments[0] !== "campaigns" && segments[0] !== "table") return null

  const crumbs: { key: string; node: ReactNode; current?: boolean }[] = [
    {
      key: "home",
      node: <Link to="/" className="hover:underline">Calendar</Link>,
    },
  ]

  if (segments[0] === "table") {
    crumbs.push({ key: "table", node: "Table", current: true })
    return <BreadcrumbTrail crumbs={crumbs} />
  }

  const [, campaignSegment, deliverablesSegment, deliverableSegment] = segments

  if (!campaignSegment) {
    crumbs.push({ key: "campaigns", node: "Campaigns", current: true })
  } else {
    crumbs.push({
      key: "campaigns",
      node: (
        <Link to="/campaigns" className="hover:underline">
          Campaigns
        </Link>
      ),
    })
    if (campaignSegment === "new") {
      crumbs.push({ key: "new", node: "New campaign", current: true })
    } else if (!deliverablesSegment) {
      crumbs.push({
        key: campaignSegment,
        node: <CampaignName id={campaignSegment} />,
        current: true,
      })
    } else {
      crumbs.push({
        key: campaignSegment,
        node: (
          <Link
            to="/campaigns/$campaignId"
            params={{ campaignId: campaignSegment }}
            className="hover:underline"
          >
            <CampaignName id={campaignSegment} />
          </Link>
        ),
      })
      crumbs.push(
        deliverableSegment === "new"
          ? { key: "d-new", node: "New deliverable", current: true }
          : {
              key: "d-edit",
              node: (
                <DeliverableName
                  deliverableId={deliverableSegment}
                  campaignId={campaignSegment}
                />
              ),
              current: true,
            },
      )
    }
  }

  return <BreadcrumbTrail crumbs={crumbs} />
}

function BreadcrumbTrail({
  crumbs,
}: {
  crumbs: { key: string; node: ReactNode; current?: boolean }[]
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm"
    >
      {crumbs.map((crumb, i) => (
        <Fragment key={crumb.key}>
          {i > 0 && <span aria-hidden>›</span>}
          <span className={crumb.current ? "text-foreground font-medium" : ""}>
            {crumb.node}
          </span>
        </Fragment>
      ))}
    </nav>
  )
}
