# NorcalOS — Production Spec

> **Status: supersession pending (2026-07-21).** NorcalOS
> `docs/proposals/2026-07-21-marketing-production-spec.md` (in spec-gate
> review) absorbs this document's load-bearing content — the six invariants,
> the CRM bake-off outcome (Atomic CRM selected; Twenty dropped over
> paid-gated OAuth), and the prototype disposition (§7.4, §15.2 there). Upon
> that spec's approval this document becomes historical and this repo is
> scheduled for decommission per its §15.2 checklist. Original status
> follows.
> **Original status:** draft for owner review · **CRM: TBD — bake-off pending** (§4–§5) · **Last updated:** 2026-07-01
> **Audience:** internal planning (owner + agents). Not a stakeholder-facing deliverable.
> **Companion:** [production-plan.md](production-plan.md) — definition of done, dependency-ordered work, risks, and owner decisions. This spec says *what* production is; the plan says *what order to build it in*.
> **Prototype reference set:** [roadmap.md](../roadmap.md) (data model, function contracts), [structure.md](../structure.md) (setup, pipelines), [features.md](../features.md) (feature status). [CLAUDE.md](../CLAUDE.md) remains the standing rule set. This spec extends those docs; where it flips a prototype-scope decision (real accounts, audience delivery), it says so explicitly.

## 1. What NorcalOS is

NorcalOS is the production system for Norcal Crew's marketing and club operations, grown out of the marketing-calendar prototype (live at https://marketing-calendar-e7w.pages.dev). Production scope has four parts:

1. **Marketing calendar** — exists today: campaigns, deliverables, user-managed categories, calendar/table views, email through the edge functions. The prototype is the v1 of this module, hardened per the plan.
2. **Custom task management** — new module, built directly on Supabase (owner decision, §6). Feature scope is specced separately; this doc fixes only its data boundary.
3. **CMS** — new module, built directly on Supabase (owner decision, §6). Same: boundary here, feature spec separately.
4. **CRM** — third-party, open source, **choice TBD pending a bake-off** (§4–§5). This spec deliberately does not select one.

Naming: the repo (`marketing_calendar`), the Cloudflare Pages project (`marketing-calendar`), and the `pages.dev` URL predate the NorcalOS name. Renames and a custom domain are cutover cosmetics, handled as decisions in the plan — nothing in this spec depends on them.

## 2. Budget constraint (binding)

**Recurring software spend for the CRM must be zero. Hosting costs are excepted.**

- "Zero" covers licenses, subscriptions, per-seat fees, support contracts, and paid feature unlocks — **auth features included**. A product qualifies only if every feature the club requires sits outside any paid gate, whether the deployment is self-hosted or vendor-hosted.
- The excepted hosting bucket: VPS/compute for a self-hosted CRM, domains, backup storage. These are budgeted as infrastructure, not as CRM software spend.
- Scope: this constraint governs the CRM. Costs elsewhere in the stack (Supabase plan tier, email provider quota, Cloudflare) are reviewed in the plan's workstreams but are not governed by this clause.

## 3. Prior decision: Twenty — dropped (settled, do not re-litigate)

Twenty was previously the leading CRM candidate. It was dropped after we **verified that OAuth support is license-gated behind a paid plan even when self-hosted**, and the club will not fund it. That is a direct violation of §2, so Twenty is out.

This decision is settled for this planning cycle. Do not re-open it absent a new upstream fact (e.g. OAuth moving into the free license) — and any such fact gets the same hands-on verification that produced this decision, not a reading of the feature matrix.

The lesson is institutionalized in two places: bake-off criterion **C1** (§5) exists because of exactly this failure mode, and the bake-off's evidence rule requires verifying licensing against the deployed instance and the license text itself, not marketing pages.

## 4. CRM candidates under evaluation

Three candidates, **listed alphabetically — no ranking implied, and nothing in this document constitutes a selection**:

| Candidate | Orientation (one line — not evaluated claims) |
| --- | --- |
| **Atomic CRM** | Open-source CRM template from Marmelab, built on react-admin with a Supabase backend. |
| **Corteza** | Open-source low-code platform from Planet Crust; its CRM is an application built on the platform. |
| **erxes** | Open-source CRM / experience platform. |

The descriptors above are orientation only. License terms and editions, auth gating, stack and hosting footprint, API shape, and project health are all **bake-off facts to be verified against current upstream source and docs at evaluation time** — the Twenty lesson (§3) is that these claims are only real once verified hands-on.

## 5. Bake-off evaluation criteria

Sized for a small nonprofit: one gate, four comparative criteria, evidence over scores.

### C1 — Auth at zero licensing cost (gate, non-negotiable)

Every required auth feature — **including OAuth or SSO** — must be available at **zero licensing cost, self-hosted or not**. A candidate that fails C1 is eliminated regardless of how it scores elsewhere. This is the criterion Twenty failed.

The concrete "required auth features" list is fixed by the auth review (plan, workstream A1) before bake-off scoring closes. Expected shape: staff/volunteer sign-in via OAuth/OIDC against the identity provider the club standardizes on, adequate role separation for a small staff, no per-seat fees.

### C2 — Self-hosting cost and effort

Runtime footprint (how many services/databases it drags in), install and upgrade path, estimated monthly hosting cost, and — the real currency here — volunteer hours to keep it running.

### C3 — API quality

Coverage of contacts/segments CRUD, webhooks or event feeds, API client auth, versioning and stability posture, documentation quality. Judged against the §6 sync story, not in the abstract.

### C4 — Supabase interop

How the §6 contact mirror would actually be fed (available transports), what identity mapping looks like, and how well the integration fits the house pattern (server-side sync via edge function or scheduled job).

### C5 — Maintenance burden

Release cadence, breaking-change history, community health / bus factor, and the backup-and-restore story.

### Method and evidence rule

Same script per candidate: deploy on a throwaway host → wire up auth and verify C1 **hands-on against the deployed instance and the license text** (snapshot the license/pricing state in the evidence sheet) → exercise the API far enough to prove or disprove the §6 sync story → record an evidence sheet → tear down. C1 is pass/fail; C2–C5 are comparative notes. No weighted scoring theater — three candidates and a small team; the decision memo argues from evidence. Output: a decision memo that names the winner and resolves the §8 open questions.

## 6. System boundary: Supabase vs CRM

Principle: **one source of truth per entity; a sync is a projection, never a second home.** Custom task management and the CMS are built directly on Supabase, not in the CRM (owner decision) — the CRM holds people and relationships, Supabase holds the work and the content.

| Data | Source of truth | Notes |
| --- | --- | --- |
| Campaigns, deliverables, categories | **Supabase** | As today. |
| `email_jobs` (send audit trail) | **Supabase** | Written only by the edge functions (invariant 1, §7). |
| Tasks (task management module) | **Supabase** | New module; zero CRM dependency. |
| CMS content | **Supabase** | New module; zero CRM dependency. Delivery surface specced separately. |
| App accounts and roles | **Supabase Auth** | Upstream IdP topology is **O1** (§8). |
| People & orgs — members/families, prospects, alumni, donors, sponsors | **CRM** | |
| Relationship history, notes, pipelines (recruiting funnel, donor cultivation) | **CRM** | |
| Segments / lists | **CRM** | How campaigns reference them is **O4**. |
| Consent & communication preferences | **CRM** | Gates audience delivery (**O5**). |
| Contact mirror (minimal projection: contact id, display name, email, segment memberships, consent flag) | **Synced CRM → Supabase** | Client-unwritable; reads role-scoped + data-minimized (rules below); transport is **O2**. |

Boundary rules:

- **Sync runs server-side only** — an edge function or scheduled job, never the browser.
- **Mirror tables: writes follow the `email_jobs` pattern; reads do not.** Writes are service-role only, no client write policy. Reads are **role-scoped and data-minimized**, not blanket-`authenticated`: the mirror carries third-party PII — emails, consent state, segment membership, and for a youth club that includes family contacts — so the client-visible projection exposes only the fields the calendar UI actually needs, to the roles that need them (policies derived in the RLS audit, plan A2). Raw addresses may need no client exposure at all: sends resolve recipients server-side in the edge functions (O5), so emails staying service-role-only is the default posture until Track C proves a UI need. (Agent proposal, revised per review — flagged, not owner-decided.)
- The CRM never receives NorcalOS database credentials; integration is API-level unless the bake-off surfaces a better transport (**O2**).
- **NorcalOS-originated email keeps routing exclusively through the edge functions.** Whether the winning CRM's native email/campaign modules are used at all is **O6**; the default proposal is *off* — one send path, one audit trail.
- Write-back of campaign activity into the CRM (e.g. "campaign X emailed segment Y") is **O8** — not assumed.
- Task management and CMS tables follow house patterns: additive migrations that include their grants (`authenticated` + `service_role`, never `anon`), real RLS from day one, derived values computed rather than stored.
- The prototype's free-text `campaigns.segmentation` stays as-is until **O4** resolves. Do not build a segment picker against an unknown segment model.

## 7. Prototype invariants, production form

The six invariants in [CLAUDE.md](../CLAUDE.md) survive the move. Two of them evolve; none weaken.

1. **`email_jobs` writes only via edge functions with the service role** — unchanged, and extends to every new send surface (audience delivery included). The client reads only.
2. **The edge functions are the point** — unchanged. The CRM must not become an alternate send path (see O6 and its default-off proposal).
3. **RLS stays real** — *strengthens*: from the prototype's single anonymous-authenticated unit with allow-all policies to role-derived policies per table (plan, workstream A2). The missing write policy on `email_jobs` remains intentional; mirror tables are likewise client-unwritable, with reads role-scoped and data-minimized because they carry third-party PII (§6).
4. **Secrets, two homes by consumer** — unchanged, now provisioned *per environment* (staging and production each get function secrets, and Vault where Postgres is the caller). The CRM adds its own secret store on its host; the email provider key still lives only in function secrets — never Vault, the client bundle, git, or the CRM.
5. **Recipient allowlist enforced server-side, fail closed** — *generalizes*: the single-address allowlist becomes a server-side recipient policy (first validated internal addresses, later CRM-sourced consented segments — O5). The enforcement point (the edge functions) and the fail-closed posture do not change.
6. **Reminders never double-send** — unchanged whenever the reminder path is un-parked (`reminded_at is null` selection, set only after a successful send; selection re-pointed to `end_date` per [archive/phase4-reminders.md](archive/phase4-reminders.md)).

## 8. Open questions — blocked on the CRM decision

Where the CRM choice blocks a design choice, the design stays open. Do not assume answers to these; each is resolved by the bake-off decision memo or the Track C design that follows it.

| ID | Open question | Resolved by |
| --- | --- | --- |
| **O1** | Auth/SSO topology: does the CRM federate to the same IdP as NorcalOS, and which providers does the winner support at zero cost? (App-side auth work proceeds regardless — plan A1.) | Bake-off memo + A1 |
| **O2** | Sync transport for the contact mirror: webhooks, polling, or a DB-level path (one candidate is itself Supabase-backed, which changes the shape entirely). | Bake-off memo |
| **O3** | Identity mapping: CRM contact id ↔ mirror rows ↔ the upgrade path for `owners` (today free-text display names). | Track C design |
| **O4** | Segment model: what a "segment" is in the winner and how campaigns reference it (successor to free-text `segmentation`). | Bake-off memo + Track C design |
| **O5** | Audience delivery mechanics: how consented, CRM-sourced recipient lists reach the send-time policy in the edge functions. | Track C design |
| **O6** | Whether the winner's native email/campaign modules are used at all. Default proposal: disabled — single send path (invariants 1–2). | Owner, after bake-off |
| **O7** | CRM hosting target and sizing — footprint differs materially by candidate. | Bake-off memo (C2 evidence) |
| **O8** | Activity write-back NorcalOS → CRM: whether and what. | Track C design |

Open items that are *not* CRM-blocked (data carry-over, reminders in v1, custom domain, cutover gating) are decisions, not blocked designs — they live in [production-plan.md §6](production-plan.md).
