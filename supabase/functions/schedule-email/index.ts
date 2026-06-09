// schedule-email — Phase 0 stub.
//
// This is intentionally just an OK response. The real function is the load-bearing
// part of the PoC (validate input with Zod, confirm the event exists, insert/update
// `email_jobs` with the service role, and optionally send via the provider). None of
// that is built yet: the "real send vs stubbed send" open decision in roadmap.md is
// still blank, and CLAUDE.md forbids building the send path until it is settled.
//
// Keep this minimal until Phase 1.
Deno.serve(() =>
  new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  })
);
