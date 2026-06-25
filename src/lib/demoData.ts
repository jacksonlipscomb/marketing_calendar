import { useMutation, useQueryClient } from "@tanstack/react-query"
import { addDays, format } from "date-fns"

import { supabase } from "./supabase"
import type {
  CampaignInsert,
  CampaignStatus,
  DeliverableInsert,
  DeliverableStatus,
} from "./database.types"

// Synthetic demo data — a full, realistic "season" generated on demand so the
// calendar, table, and filters can be exercised end to end, plus a one-click
// purge that removes only this generated data.
//
// What keeps it invariant-safe: it writes ONLY `campaigns` and `deliverables`
// (the client's RLS write surface) and never `email_jobs`. Purge deletes the
// seed campaigns and lets the 0004 FK cascade clear their deliverables (and any
// email_jobs) — the same cascade useDeleteCampaign already relies on. The seed
// rows are tagged with `campaigns.is_seed = true` (migration 0006); nothing else
// in the app sets that flag, so the purge filter can never hit hand-made data.

// ---------------------------------------------------------------------------
// Fixtures (static — no faker; per-run variation comes only from `today` and
// the generated ids). Dates are expressed as offsets so one fixed template
// re-centres on whatever "today" is when Generate runs.
// ---------------------------------------------------------------------------

const OWNERS = [
  "Coach Dana",
  "Maya Chen",
  "Diego Alvarez",
  "Priya Patel",
  "Sam Rivera",
  "Jordan Brooks",
] as const

interface DeliverableSpec {
  title: string
  details?: string
  offsetDays: number // start, measured from the campaign's start
  durationDays: number // 0 = single-day deliverable
  owners: string[]
}

interface CampaignSpec {
  name: string
  category: string // category name, resolved to a category_id at generate time
  goal: string
  segmentation: string
  owners: string[]
  startOffsetDays: number // measured from "today"
  durationDays: number
  deliverables: DeliverableSpec[]
}

// 12 campaigns across all four categories, spread ~6 months either side of today
// with deliberately overlapping windows so the calendar's lane-stacking shows.
// 28 deliverables total (the "events").
const CAMPAIGN_SPECS: CampaignSpec[] = [
  {
    name: "Fall Recruiting Drive",
    category: "recruiting",
    goal: "Recruit 40 novice rowers",
    segmentation: "High-school students + parents",
    owners: [OWNERS[0], OWNERS[1]],
    startOffsetDays: -150,
    durationDays: 35,
    deliverables: [
      { title: "Open-house flyer", offsetDays: 0, durationDays: 0, owners: [OWNERS[1]] },
      { title: "Learn-to-row signup form", details: "Online registration for the intro program", offsetDays: 7, durationDays: 21, owners: [OWNERS[0]] },
      { title: "Welcome email to signups", offsetDays: 30, durationDays: 0, owners: [OWNERS[1]] },
    ],
  },
  {
    name: "Spring Novice Recruitment",
    category: "recruiting",
    goal: "Fill the spring novice boats",
    segmentation: "Middle + high school",
    owners: [OWNERS[1], OWNERS[4]],
    startOffsetDays: 60,
    durationDays: 42,
    deliverables: [
      { title: "Tryout announcement", offsetDays: 0, durationDays: 0, owners: [OWNERS[4]] },
      { title: "Campus poster run", offsetDays: 5, durationDays: 10, owners: [OWNERS[1]] },
    ],
  },
  {
    name: "Alumni Re-engagement",
    category: "retention",
    goal: "Reconnect 100 alumni",
    segmentation: "Past athletes (2015–2023)",
    owners: [OWNERS[2]],
    startOffsetDays: -120,
    durationDays: 60,
    deliverables: [
      { title: "Alumni newsletter", details: "Season recap + giving ask", offsetDays: 0, durationDays: 3, owners: [OWNERS[2]] },
      { title: "Reunion save-the-date", offsetDays: 30, durationDays: 0, owners: [OWNERS[2]] },
    ],
  },
  {
    name: "Returning Rower Check-in",
    category: "retention",
    goal: "Retain 90% of returning athletes",
    segmentation: "Current roster",
    owners: [OWNERS[0], OWNERS[3]],
    startOffsetDays: -20,
    durationDays: 50,
    deliverables: [
      { title: "Season survey", offsetDays: 0, durationDays: 7, owners: [OWNERS[3]] },
      { title: "1:1 coach check-ins", details: "Schedule short meetings with each returner", offsetDays: 14, durationDays: 21, owners: [OWNERS[0]] },
    ],
  },
  {
    name: "Winter Training Retention",
    category: "retention",
    goal: "Keep athletes engaged through winter",
    segmentation: "Varsity squad",
    owners: [OWNERS[5]],
    startOffsetDays: 120,
    durationDays: 45,
    deliverables: [
      { title: "Erg-challenge kickoff", offsetDays: 0, durationDays: 0, owners: [OWNERS[5]] },
      { title: "Progress leaderboard email", offsetDays: 20, durationDays: 0, owners: [OWNERS[5]] },
    ],
  },
  {
    name: "Spring Regatta Season",
    category: "regatta",
    goal: "Compete in 4 spring regattas",
    segmentation: "Race-eligible athletes",
    owners: [OWNERS[0], OWNERS[4]],
    startOffsetDays: 20,
    durationDays: 56,
    deliverables: [
      { title: "Race schedule announcement", offsetDays: 0, durationDays: 0, owners: [OWNERS[0]] },
      { title: "Volunteer signup", offsetDays: 7, durationDays: 28, owners: [OWNERS[3]] },
      { title: "Race-day logistics email", offsetDays: 45, durationDays: 2, owners: [OWNERS[4]] },
    ],
  },
  {
    name: "Head of the Harbor Regatta",
    category: "regatta",
    goal: "Top-3 finish in the varsity 8+",
    segmentation: "Varsity + families",
    owners: [OWNERS[0]],
    startOffsetDays: -60,
    durationDays: 21,
    deliverables: [
      { title: "Registration + lineup", offsetDays: 0, durationDays: 5, owners: [OWNERS[0]] },
      { title: "Spectator guide", offsetDays: 14, durationDays: 0, owners: [OWNERS[2]] },
    ],
  },
  {
    name: "Summer Sprints",
    category: "regatta",
    goal: "Send 6 boats to summer sprints",
    segmentation: "Summer squad",
    owners: [OWNERS[4], OWNERS[5]],
    startOffsetDays: 150,
    durationDays: 18,
    deliverables: [
      { title: "Entry-deadline reminder", offsetDays: 0, durationDays: 0, owners: [OWNERS[4]] },
      { title: "Travel + lodging info", offsetDays: 5, durationDays: 7, owners: [OWNERS[5]] },
    ],
  },
  {
    name: "Year-End Giving Push",
    category: "fundraising",
    goal: "Raise $75k by Dec 31",
    segmentation: "Donors + parents",
    owners: [OWNERS[2], OWNERS[3]],
    startOffsetDays: -40,
    durationDays: 40,
    deliverables: [
      { title: "Campaign launch email", offsetDays: 0, durationDays: 0, owners: [OWNERS[2]] },
      { title: "Matching-gift reminder", offsetDays: 20, durationDays: 0, owners: [OWNERS[3]] },
      { title: "Thank-you mailer", details: "Printed thank-you to year-end donors", offsetDays: 38, durationDays: 2, owners: [OWNERS[2]] },
    ],
  },
  {
    name: "Spring Erg-a-thon",
    category: "fundraising",
    goal: "Raise $20k via the erg-a-thon",
    segmentation: "Athletes + sponsors",
    owners: [OWNERS[1], OWNERS[5]],
    startOffsetDays: 35,
    durationDays: 30,
    deliverables: [
      { title: "Pledge-page launch", offsetDays: 0, durationDays: 5, owners: [OWNERS[5]] },
      { title: "Event-day recap", offsetDays: 28, durationDays: 0, owners: [OWNERS[1]] },
    ],
  },
  {
    name: "New Boat Capital Campaign",
    category: "fundraising",
    goal: "Fund a new 8+ ($55k)",
    segmentation: "Major donors + board",
    owners: [OWNERS[2]],
    startOffsetDays: -100,
    durationDays: 120,
    deliverables: [
      { title: "Case-for-support deck", offsetDays: 0, durationDays: 14, owners: [OWNERS[2]] },
      { title: "Naming-opportunity outreach", offsetDays: 45, durationDays: 30, owners: [OWNERS[2]] },
      { title: "Milestone update", offsetDays: 100, durationDays: 0, owners: [OWNERS[3]] },
    ],
  },
  {
    name: "Boathouse Renovation Fund",
    category: "fundraising",
    goal: "Raise $120k for dock repair",
    segmentation: "Community + alumni",
    owners: [OWNERS[3], OWNERS[5]],
    startOffsetDays: 90,
    durationDays: 75,
    deliverables: [
      { title: "Renovation announcement", offsetDays: 0, durationDays: 3, owners: [OWNERS[3]] },
      { title: "Community open house", offsetDays: 40, durationDays: 0, owners: [OWNERS[5]] },
    ],
  },
]

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

const iso = (d: Date) => format(d, "yyyy-MM-dd")

// Keep a date within [lo, hi]. Used to clamp a deliverable span inside its
// campaign window so the `deliverables_enforce_bounds` trigger (0005) accepts it.
function clampDate(d: Date, lo: Date, hi: Date): Date {
  if (d < lo) return lo
  if (d > hi) return hi
  return d
}

// Status derived from where the span sits relative to today — past work reads as
// done/complete, current as in_progress, future as planned/backlog. This gives a
// realistic spread automatically, and re-derives correctly whenever Generate runs.
function campaignStatus(start: Date, end: Date, today: Date): CampaignStatus {
  if (end < today) return "done"
  if (start > today) return "planned"
  return "in_progress"
}

function deliverableStatus(start: Date, end: Date, today: Date): DeliverableStatus {
  if (end < today) return "complete"
  if (start > today) return "backlog"
  return "in_progress"
}

// Turn the fixtures into ready-to-insert rows. Each campaign gets a client-side
// id so its deliverables can reference it without a second round-trip to read
// back inserted ids. `is_seed: true` is set here and nowhere else in the app.
// `categoryIdFor` maps a fixture's category name to a real category_id (categories
// are user-managed now), so generation references existing category rows.
export function buildDemoData(
  categoryIdFor: (name: string) => string,
  today: Date = new Date(),
): {
  campaigns: CampaignInsert[]
  deliverables: DeliverableInsert[]
} {
  const campaigns: CampaignInsert[] = []
  const deliverables: DeliverableInsert[] = []

  for (const spec of CAMPAIGN_SPECS) {
    const id = crypto.randomUUID()
    const start = addDays(today, spec.startOffsetDays)
    const end = addDays(start, spec.durationDays)

    campaigns.push({
      id,
      name: spec.name,
      goal: spec.goal,
      category_id: categoryIdFor(spec.category),
      start_date: iso(start),
      end_date: iso(end),
      segmentation: spec.segmentation,
      owners: spec.owners,
      status: campaignStatus(start, end, today),
      is_seed: true,
    })

    for (const d of spec.deliverables) {
      const dStart = clampDate(addDays(start, d.offsetDays), start, end)
      const dEnd = clampDate(addDays(dStart, d.durationDays), dStart, end)
      deliverables.push({
        campaign_id: id,
        title: d.title,
        details: d.details ?? null,
        start_date: iso(dStart),
        end_date: iso(dEnd),
        owners: d.owners,
        status: deliverableStatus(dStart, dEnd, today),
      })
    }
  }

  return { campaigns, deliverables }
}

// ---------------------------------------------------------------------------
// Mutation hooks (mirror the shape of useCreateCampaign/useDeleteCampaign — same
// invalidation set — but issue their own bulk supabase calls rather than calling
// those hooks).
// ---------------------------------------------------------------------------

// Generate is idempotent: purge any existing seed first, then bulk-insert a fresh
// year. Campaigns are inserted before deliverables because each deliverable's FK
// and the bounds trigger need the parent campaign to already exist. The steps are
// NOT a single transaction (the client can't span one), so a mid-run failure can
// leave a partial set — re-running Generate resets it from a clean slate.
export function useGenerateDemoData() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (): Promise<{ campaigns: number; deliverables: number }> => {
      // Categories are user-managed, so map the fixtures' category names to real
      // ids (case-insensitive), falling back to the first category for any name
      // that was renamed/deleted. Require at least one category to exist.
      const { data: cats, error: catErr } = await supabase
        .from("categories")
        .select("id, name")
      if (catErr) throw new Error(catErr.message)
      if (!cats || cats.length === 0)
        throw new Error(
          "Create at least one category before generating demo data.",
        )
      const idByName = new Map(cats.map((c) => [c.name.toLowerCase(), c.id]))
      const fallbackId = cats[0].id
      const categoryIdFor = (name: string) =>
        idByName.get(name.toLowerCase()) ?? fallbackId

      const purge = await supabase.from("campaigns").delete().eq("is_seed", true)
      if (purge.error) throw new Error(purge.error.message)

      const { campaigns, deliverables } = buildDemoData(categoryIdFor)

      const insertedCampaigns = await supabase.from("campaigns").insert(campaigns)
      if (insertedCampaigns.error) throw new Error(insertedCampaigns.error.message)

      const insertedDeliverables = await supabase
        .from("deliverables")
        .insert(deliverables)
      if (insertedDeliverables.error)
        throw new Error(insertedDeliverables.error.message)

      return { campaigns: campaigns.length, deliverables: deliverables.length }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] })
      qc.invalidateQueries({ queryKey: ["deliverables"] })
      qc.invalidateQueries({ queryKey: ["upcoming-sends"] })
    },
  })
}

// Purge: delete every seed campaign. The 0004 FK cascade removes their
// deliverables and any email_jobs — the same multi-table cascade useDeleteCampaign
// relies on, so nothing here touches the email_jobs write surface directly.
export function useDeleteSeedData() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (): Promise<void> => {
      const { error } = await supabase
        .from("campaigns")
        .delete()
        .eq("is_seed", true)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] })
      qc.invalidateQueries({ queryKey: ["deliverables"] })
      qc.invalidateQueries({ queryKey: ["upcoming-sends"] })
    },
  })
}
