import {
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router"
import { RootLayout } from "./routes/__root"
import { CalendarPage } from "./routes/index"
import { CampaignsPage } from "./routes/campaigns.index"
import { NewCampaignPage } from "./routes/campaigns.new"
import { CampaignDetailPage } from "./routes/campaigns.$id"
import { NewDeliverablePage } from "./routes/campaigns.$id.deliverables.new"
import { EditDeliverablePage } from "./routes/campaigns.$id.deliverables.$deliverableId"
import { TablePage } from "./routes/table"

const rootRoute = createRootRoute({ component: RootLayout })

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: CalendarPage,
})

// Page pattern: campaign + deliverable flows are deep-linkable routes
// (structure.md → Repo layout). Direct hits rely on public/_redirects.
const campaignsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/campaigns",
  component: CampaignsPage,
})

const tableRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/table",
  component: TablePage,
})

const newCampaignRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/campaigns/new",
  component: NewCampaignPage,
})

const campaignDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/campaigns/$campaignId",
  component: CampaignDetailPage,
})

const newDeliverableRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/campaigns/$campaignId/deliverables/new",
  component: NewDeliverablePage,
})

const editDeliverableRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/campaigns/$campaignId/deliverables/$deliverableId",
  component: EditDeliverablePage,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  campaignsRoute,
  tableRoute,
  newCampaignRoute,
  campaignDetailRoute,
  newDeliverableRoute,
  editDeliverableRoute,
])

export const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
