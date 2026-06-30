import { createFileRoute } from "@tanstack/react-router";
import logoGold from "@/assets/norcal-logo-gold.png";

export const Route = createFileRoute("/design-system")({
  head: () => ({
    meta: [
      { title: "Norcal Crew — Design System" },
      {
        name: "description",
        content:
          "Brand & design system for Norcal Crew — black canvas, gold accent, Quicksand display, Open Sans body.",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&family=Open+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;500;700&display=swap",
      },
    ],
  }),
  component: DesignSystemPage,
});

function DesignSystemPage() {
  return (
    <div className="ds-root">
      <style>{DS_CSS}</style>

      <div className="ds-shell">
        {/* MASTHEAD */}
        <header className="ds-masthead">
          <div className="ds-mark">
            <img src={logoGold} alt="Norcal Crew" className="ds-masthead-logo" />
            <div className="ds-wordmark ds-wordmark-divided">
              <div className="ds-wm-sub">Brand &amp; Design</div>
              <div className="ds-wm-top">System · v1.0</div>
            </div>
          </div>
          <div className="ds-meta">
            <div>
              <strong>REDWOOD CITY · CA</strong>
            </div>
            <div>WESTPOINT HARBOR · BAY ROWING</div>
            <div>CRAWLED FROM NORCALCREW.ORG · MAY 2026</div>
          </div>
        </header>

        <nav className="ds-toc">
          <a href="#brand">01 · Brand</a>
          <a href="#color">02 · Color</a>
          <a href="#type">03 · Typography</a>
          <a href="#space">04 · Spacing &amp; Form</a>
          <a href="#components">05 · Components</a>
          <a href="#patterns">06 · Patterns</a>
        </nav>

        {/* ANNOUNCEMENT BAR */}
        <div className="ds-announce">
          <div className="ds-announce-msg">
            Norcal Crew welcomes new athletes — spots are still open!
          </div>
          <div className="ds-announce-pill">Find out more about Norcal Crew</div>
        </div>

        {/* HERO */}
        <div className="ds-hero">
          <div className="ds-eyebrow ds-mb-4">Pulled from norcalcrew.org</div>
          <h1 className="ds-hero-h1">
            Strong work ethic on the water becomes opportunity at the nation's best universities
          </h1>
          <p className="ds-hero-p">
            A visual system mirroring the live site: black canvas, single gold accent, white type.
            Generous whitespace, full-bleed photography, and an announcement bar that calls every
            visitor to the next regatta.
          </p>
          <div className="ds-pillar">
            <div>
              <div className="ds-pillar-num">320+</div>
              <div className="ds-pillar-lab">Athletes</div>
            </div>
            <div>
              <div className="ds-pillar-num">42</div>
              <div className="ds-pillar-lab">Schools</div>
            </div>
            <div>
              <div className="ds-pillar-num">11</div>
              <div className="ds-pillar-lab">Coaches</div>
            </div>
            <div>
              <div className="ds-pillar-num">26yr</div>
              <div className="ds-pillar-lab">On the water</div>
            </div>
          </div>
        </div>

        {/* BRAND */}
        <section id="brand">
          <div className="ds-eyebrow">01 · Brand</div>
          <h2 className="ds-section-title">Mark, lockups &amp; clearspace</h2>
          <p className="ds-section-lede">
            The live mark is a gold California-grizzly silhouette holding crossed oars, with a star
            at its shoulder and the wordmark below. Reproduce that art only from the team's official
            asset pack — the placeholders below show the lockup geometry and clearspace.
          </p>

          <div className="ds-lockups">
            <div className="ds-lock">
              <span className="ds-lock-tag">Primary · gold on black</span>
              <img src={logoGold} alt="Norcal Crew" className="ds-lock-logo" />
            </div>
            <div className="ds-lock ds-lock-light">
              <span className="ds-lock-tag">Reverse · 1-color on white</span>
              <img src={logoGold} alt="Norcal Crew" className="ds-lock-logo ds-logo-black" />
            </div>
            <div className="ds-lock ds-lock-gold">
              <span className="ds-lock-tag">Knockout · black on gold</span>
              <img src={logoGold} alt="Norcal Crew" className="ds-lock-logo ds-logo-black" />
            </div>
          </div>

          <div className="ds-row ds-mt-6">
            <div className="ds-card ds-flex-1">
              <div className="ds-label">Voice</div>
              <p className="ds-body-m ds-mt-2">
                Disciplined. Plainspoken. Earned. Sentences run short, verbs run strong, and copy
                never reaches for inspiration it hasn't put miles in for. The site copy is direct —
                "Find out more," "Come row."
              </p>
            </div>
            <div className="ds-card ds-flex-1">
              <div className="ds-label">Don't</div>
              <ul className="ds-body-m ds-mt-2 ds-ul">
                <li>Tilt, recolor, or distort the bear-and-oars mark.</li>
                <li>Place the gold lockup on photography without a black scrim.</li>
                <li>Pair the wordmark with non-system fonts.</li>
                <li>Use gold on white below 14px — contrast fails.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* COLOR */}
        <section id="color">
          <div className="ds-eyebrow">02 · Color</div>
          <h2 className="ds-section-title">Three colors, one accent</h2>
          <p className="ds-section-lede">
            Black canvas, white type, gold accent. That's the whole core palette — pulled directly
            from norcalcrew.org. Water Blue and Signal Red are reserved for occasional accents
            (status, alerts, regatta legends).
          </p>

          <div className="ds-grid ds-col-4">
            <Swatch name="Black" hex="#000000 · canvas" bg="var(--ds-black)" />
            <Swatch name="White" hex="#FFFFFF · primary type" bg="var(--ds-white)" />
            <Swatch name="Gold 500" hex="#F0B400 · primary accent" bg="var(--ds-gold-500)" />
            <Swatch name="Gold 400" hex="#F7C61A · logo gold" bg="var(--ds-gold-400)" />
            <Swatch
              name="Ink 900"
              hex="#141414 · card surface"
              bg="var(--ds-ink-900)"
              borderBottom
            />
            <Swatch name="Ink 700" hex="#2E2E2E · hairline" bg="var(--ds-ink-700)" />
            <Swatch name="Water" hex="#2B6FA1 · accent" bg="var(--ds-water-500)" />
            <Swatch name="Signal" hex="#D9342B · alert" bg="var(--ds-signal-red)" />
          </div>

          <div className="ds-mt-6">
            <div className="ds-label ds-mb-2">Gold ramp · 100 → 700</div>
            <div className="ds-ramp ds-ramp-7">
              <div
                className="ds-ramp-step"
                style={{ background: "var(--ds-gold-100)", color: "var(--ds-gold-700)" }}
              >
                100
              </div>
              <div
                className="ds-ramp-step"
                style={{ background: "var(--ds-gold-200)", color: "var(--ds-gold-700)" }}
              >
                200
              </div>
              <div
                className="ds-ramp-step"
                style={{ background: "var(--ds-gold-300)", color: "var(--ds-black)" }}
              >
                300
              </div>
              <div
                className="ds-ramp-step"
                style={{ background: "var(--ds-gold-400)", color: "var(--ds-black)" }}
              >
                400
              </div>
              <div
                className="ds-ramp-step"
                style={{ background: "var(--ds-gold-500)", color: "var(--ds-black)" }}
              >
                500
              </div>
              <div
                className="ds-ramp-step"
                style={{ background: "var(--ds-gold-600)", color: "var(--ds-white)" }}
              >
                600
              </div>
              <div
                className="ds-ramp-step"
                style={{ background: "var(--ds-gold-700)", color: "var(--ds-white)" }}
              >
                700
              </div>
            </div>
          </div>

          <div className="ds-mt-6">
            <div className="ds-label ds-mb-2">Ink ramp (text &amp; UI surfaces)</div>
            <div className="ds-ramp">
              <div
                className="ds-ramp-step"
                style={{ background: "var(--ds-white)", color: "var(--ds-ink-700)" }}
              >
                FFF
              </div>
              <div
                className="ds-ramp-step"
                style={{ background: "var(--ds-ink-050)", color: "var(--ds-ink-700)" }}
              >
                050
              </div>
              <div
                className="ds-ramp-step"
                style={{ background: "var(--ds-ink-100)", color: "var(--ds-ink-700)" }}
              >
                100
              </div>
              <div
                className="ds-ramp-step"
                style={{ background: "var(--ds-ink-200)", color: "var(--ds-ink-700)" }}
              >
                200
              </div>
              <div
                className="ds-ramp-step"
                style={{ background: "var(--ds-ink-300)", color: "var(--ds-ink-900)" }}
              >
                300
              </div>
              <div
                className="ds-ramp-step"
                style={{ background: "var(--ds-ink-500)", color: "var(--ds-white)" }}
              >
                500
              </div>
              <div
                className="ds-ramp-step"
                style={{ background: "var(--ds-ink-700)", color: "var(--ds-white)" }}
              >
                700
              </div>
              <div
                className="ds-ramp-step"
                style={{ background: "var(--ds-ink-800)", color: "var(--ds-white)" }}
              >
                800
              </div>
              <div
                className="ds-ramp-step"
                style={{ background: "var(--ds-ink-900)", color: "var(--ds-white)" }}
              >
                900
              </div>
              <div
                className="ds-ramp-step"
                style={{ background: "var(--ds-black)", color: "var(--ds-white)" }}
              >
                000
              </div>
            </div>
          </div>

          <div className="ds-row ds-mt-6">
            <div className="ds-card ds-flex-1">
              <div className="ds-label">Pairings</div>
              <div className="ds-row ds-mt-4 ds-gap-2">
                <span className="ds-badge ds-b-gold">
                  <span className="ds-dot" />
                  Gold 500 · Black
                </span>
                <span className="ds-badge ds-b-solid">
                  <span className="ds-dot" />
                  White · Black
                </span>
                <span className="ds-badge ds-b-goldline">
                  <span className="ds-dot" />
                  Gold 400 · Black
                </span>
                <span className="ds-badge ds-b-water">
                  <span className="ds-dot" />
                  Water 500 · Ink 900
                </span>
              </div>
            </div>
            <div className="ds-card ds-flex-1">
              <div className="ds-label">Ratios on a layout</div>
              <div className="ds-ratio-bar ds-mt-4">
                <div style={{ flex: 65, background: "var(--ds-black)" }} />
                <div style={{ flex: 22, background: "var(--ds-white)" }} />
                <div style={{ flex: 10, background: "var(--ds-gold-500)" }} />
                <div style={{ flex: 3, background: "var(--ds-water-500)" }} />
              </div>
              <div className="ds-body-s ds-mt-2">65 Black · 22 White · 10 Gold · 3 Accent</div>
            </div>
          </div>
        </section>

        {/* TYPE */}
        <section id="type">
          <div className="ds-eyebrow">03 · Typography</div>
          <h2 className="ds-section-title">Rounded geometric &amp; humanist</h2>
          <p className="ds-section-lede">
            The live site uses a rounded geometric sans for display and a clean humanist sans for
            body. Quicksand is the closest open-source match for the headline shapes; Open Sans
            handles long-form copy. JetBrains Mono carries labels and metadata.
          </p>

          <TypeRow
            label={
              <>
                <b>Display · XXL</b>
                Quicksand 600
                <br />
                96 / 94 / -1%
                <br />
                Hero only
              </>
            }
          >
            <p className="ds-display-xxl">Pull together.</p>
          </TypeRow>
          <TypeRow
            label={
              <>
                <b>Display · XL</b>
                Quicksand 600
                <br />
                64 / 65
              </>
            }
          >
            <p className="ds-display-xl">Eight oars, one stroke.</p>
          </TypeRow>
          <TypeRow
            label={
              <>
                <b>Display · L</b>
                Quicksand 600
                <br />
                44 / 46
              </>
            }
          >
            <p className="ds-display-l">Section opener · 44px</p>
          </TypeRow>
          <TypeRow
            label={
              <>
                <b>Display · M</b>
                Quicksand 500
                <br />
                32 / 37
              </>
            }
          >
            <p className="ds-display-m">Card and tile titles</p>
          </TypeRow>
          <TypeRow
            label={
              <>
                <b>Heading · L</b>
                Quicksand 700
                <br />
                24 / 30
              </>
            }
          >
            <p className="ds-heading-l">Sub-section heading</p>
          </TypeRow>
          <TypeRow
            label={
              <>
                <b>Heading · M</b>
                Quicksand 600
                <br />
                18 / 24
              </>
            }
          >
            <p className="ds-heading-m">Inline heading &amp; nav</p>
          </TypeRow>
          <TypeRow
            label={
              <>
                <b>Body · L</b>
                Open Sans 400
                <br />
                18 / 29
              </>
            }
          >
            <p className="ds-body-l">
              Long-form lede style. The water is steady, the boat is not — the crew makes it so.
              Practice begins at first light, ends when the work is done.
            </p>
          </TypeRow>
          <TypeRow
            label={
              <>
                <b>Body · M (default)</b>
                Open Sans 400
                <br />
                16 / 26
              </>
            }
          >
            <p className="ds-body-m">
              The Norcal program serves middle-school and high-school athletes from across the
              Peninsula, with year-round training out of Westpoint Harbor and a calendar that runs
              from fall head races through spring sprints.
            </p>
          </TypeRow>
          <TypeRow
            label={
              <>
                <b>Body · S</b>
                Open Sans 400
                <br />
                14 / 22
              </>
            }
          >
            <p className="ds-body-s">Captions, helper text, dense tables, metadata.</p>
          </TypeRow>
          <TypeRow
            label={
              <>
                <b>Label / Eyebrow</b>
                JetBrains Mono 500
                <br />
                11 / 18 / +20%
                <br />
                UPPERCASE
              </>
            }
          >
            <p className="ds-label">Coaching staff · since 2008</p>
          </TypeRow>
          <TypeRow
            label={
              <>
                <b>Pull quote</b>
                Open Sans 400 italic
                <br />
                24 / 34
              </>
            }
          >
            <p className="ds-quote">
              &ldquo;The crew made up of individuals willing to sacrifice their personal goals for
              the team will be on the medal stand together.&rdquo;
            </p>
          </TypeRow>
        </section>

        {/* SPACING */}
        <section id="space">
          <div className="ds-eyebrow">04 · Spacing &amp; Form</div>
          <h2 className="ds-section-title">A 4px keel</h2>
          <p className="ds-section-lede">
            Every dimension snaps to a 4-pixel base. The live site breathes — section padding sits
            at the high end of the scale (96px+), inline controls at the low end.
          </p>

          <div className="ds-scale">
            {[
              [4, "s-1"],
              [8, "s-2"],
              [12, "s-3"],
              [16, "s-4"],
              [20, "s-5"],
              [24, "s-6"],
              [32, "s-7"],
              [40, "s-8"],
              [48, "s-9"],
              [64, "s-10"],
              [80, "s-11"],
              [96, "s-12"],
              [128, "s-13"],
            ].map(([px, token]) => (
              <div key={token} className="ds-scale-unit">
                <div className="ds-scale-bar" style={{ height: `${px}px` }} />
                <span>
                  {px} · {token}
                </span>
              </div>
            ))}
          </div>

          <h3 className="ds-heading-l ds-mt-9">Radii</h3>
          <div className="ds-radii ds-mt-4">
            <div className="ds-r" style={{ borderRadius: 0 }}>
              0 · sharp
            </div>
            <div className="ds-r" style={{ borderRadius: "var(--ds-r-xs)" }}>
              xs · 2
            </div>
            <div className="ds-r" style={{ borderRadius: "var(--ds-r-sm)" }}>
              sm · 4
            </div>
            <div className="ds-r" style={{ borderRadius: "var(--ds-r-md)" }}>
              md · 6
            </div>
            <div className="ds-r" style={{ borderRadius: "var(--ds-r-lg)" }}>
              lg · 10
            </div>
            <div className="ds-r" style={{ borderRadius: "var(--ds-r-pill)" }}>
              pill
            </div>
          </div>

          <h3 className="ds-heading-l ds-mt-9">Elevation</h3>
          <div className="ds-shadows ds-mt-4">
            <div className="ds-sh" style={{ boxShadow: "none" }}>
              flat · border
            </div>
            <div className="ds-sh" style={{ boxShadow: "var(--ds-shadow-1)" }}>
              shadow-1
            </div>
            <div className="ds-sh" style={{ boxShadow: "var(--ds-shadow-2)" }}>
              shadow-2
            </div>
            <div className="ds-sh" style={{ boxShadow: "var(--ds-shadow-3)" }}>
              shadow-3
            </div>
          </div>
        </section>

        {/* COMPONENTS */}
        <section id="components">
          <div className="ds-eyebrow">05 · Components</div>
          <h2 className="ds-section-title">The kit</h2>
          <p className="ds-section-lede">
            Buttons, badges, fields, stat blocks, athlete cards. Use them straight; restrain the
            urge to invent new ones.
          </p>

          <h3 className="ds-heading-l">Buttons</h3>
          <div className="ds-row ds-mt-4 ds-items-center">
            <button type="button" className="ds-btn ds-btn-gold ds-btn-lg">
              Find out more →
            </button>
            <button type="button" className="ds-btn ds-btn-light ds-btn-lg">
              Donate
            </button>
            <button type="button" className="ds-btn ds-btn-ghost ds-btn-lg">
              Coaching staff
            </button>
            <button type="button" className="ds-btn ds-btn-gold">
              Register
            </button>
            <button type="button" className="ds-btn ds-btn-light">
              Summer camps
            </button>
            <button type="button" className="ds-btn ds-btn-ghost">
              Directions
            </button>
            <button type="button" className="ds-btn ds-btn-gold ds-btn-sm">
              Edit
            </button>
            <button type="button" className="ds-btn ds-btn-ghost ds-btn-sm">
              Cancel
            </button>
            <a href="#" className="ds-btn ds-btn-link">
              Read more
            </a>
          </div>

          <h3 className="ds-heading-l ds-mt-9">Badges</h3>
          <div className="ds-row ds-mt-4">
            <span className="ds-badge ds-b-gold">
              <span className="ds-dot" />
              U17 · 8+
            </span>
            <span className="ds-badge ds-b-solid">
              <span className="ds-dot" />
              Varsity
            </span>
            <span className="ds-badge ds-b-goldline">
              <span className="ds-dot" />
              Recruit
            </span>
            <span className="ds-badge ds-b-water">
              <span className="ds-dot" />
              On the water
            </span>
            <span className="ds-badge ds-b-mute">
              <span className="ds-dot" />
              Spring 2026
            </span>
          </div>

          <h3 className="ds-heading-l ds-mt-9">Fields</h3>
          <div className="ds-grid ds-col-3 ds-mt-4 ds-fields">
            <div>
              <label className="ds-field-label">First name</label>
              <input className="ds-input" defaultValue="Eleanor" />
            </div>
            <div>
              <label className="ds-field-label">Grade level</label>
              <input className="ds-input" defaultValue="9th — Sequoia HS" />
            </div>
            <div>
              <label className="ds-field-label">Email</label>
              <input className="ds-input" placeholder="parent@email.com" />
            </div>
          </div>

          <h3 className="ds-heading-l ds-mt-9">Stat blocks</h3>
          <div className="ds-grid ds-col-4 ds-mt-4">
            <Stat n="1st" l="SW Junior Champs · 2025" />
            <Stat n="5:42" l="2K erg · varsity median" />
            <Stat n="98%" l="College placement" />
            <Stat n="14" l="Boats on water daily" />
          </div>

          <h3 className="ds-heading-l ds-mt-9">Athlete cards</h3>
          <div className="ds-grid ds-col-4 ds-mt-4">
            <Athlete
              tag="Coxswain · 4×"
              name="M. Okafor"
              role="Senior · Bow seat"
              bio="Three seasons varsity. Recruit interest from Ivy + Pac-12 programs."
            />
            <Athlete
              tag="Stroke seat"
              name="A. Reyes"
              role="Junior · Stroke"
              bio="2025 SW Champs gold, JV8+. 5:48 on the erg."
            />
            <Athlete
              tag="Sweep · port"
              name="P. Lindgren"
              role="Sophomore · 5 seat"
              bio="Came through summer Learn-to-Row, made varsity in one year."
            />
            <Athlete
              tag="Sculler"
              name="J. Hill"
              role="Senior · Single"
              bio="Ranked top-20 nationally. Captains the women's varsity squad."
            />
          </div>
        </section>

        {/* PATTERNS */}
        <section id="patterns">
          <div className="ds-eyebrow">06 · Patterns</div>
          <h2 className="ds-section-title">In context</h2>
          <p className="ds-section-lede">
            A few of the system pieces composed into the surfaces they actually serve.
          </p>

          <div className="ds-grid ds-col-2">
            <div className="ds-card">
              <div className="ds-label ds-label-row">
                Spring · Regatta calendar
                <a href="#" className="ds-btn ds-btn-link ds-link-sans">
                  Full schedule →
                </a>
              </div>
              <div className="ds-sched ds-mt-4">
                <SchedRow
                  date="MAR · 14"
                  ev="San Diego Crew Classic"
                  small="Mission Bay · Varsity 8+, Junior 4×"
                  badgeClass="ds-b-gold"
                  badge="Travel"
                />
                <SchedRow
                  date="APR · 04"
                  ev="Covered Bridge Regatta"
                  small="Lake Quinault · all squads"
                  badgeClass="ds-b-goldline"
                  badge="Home circuit"
                />
                <SchedRow
                  date="APR · 25"
                  ev="Pacific Coast Champs"
                  small="Lake Natoma · qualifier"
                  badgeClass="ds-b-water"
                  badge="Qualifier"
                />
                <SchedRow
                  date="MAY · 16"
                  ev="SW Junior Championships"
                  small="Lake Natoma · top 6 advance"
                  badgeClass="ds-b-solid"
                  badge="Champs"
                />
              </div>
            </div>

            <div>
              <div className="ds-pull">
                <div className="ds-label">Family voice</div>
                <p className="ds-quote ds-mt-4">
                  &ldquo;Our daughter has built friendships and life skills that will be with her
                  forever — top-notch coaches building great skills on and off the water.&rdquo;
                </p>
                <div className="ds-body-s ds-mt-4 ds-mono-attribution">— The Hill Family</div>
              </div>

              <div className="ds-card ds-cta-gold">
                <div className="ds-label ds-label-on-gold">Ready to row</div>
                <h3 className="ds-cta-title">Spots are still open for spring.</h3>
                <p className="ds-body-m ds-mt-2 ds-cta-body">
                  Come see what rowing is all about. No experience necessary — we'll teach you
                  everything from your first stroke to your first medal.
                </p>
                <div className="ds-row ds-mt-5">
                  <button type="button" className="ds-btn ds-btn-cta-dark">
                    Find out more →
                  </button>
                  <button type="button" className="ds-btn ds-btn-cta-outline">
                    Visit Westpoint
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FOOT */}
        <footer className="ds-foot">
          <div>
            <div className="ds-foot-title">Norcal Crew · Brand &amp; Design System</div>
            Pulled from norcalcrew.org · v1.0 · May 2026 · Bear illustration sourced separately
          </div>
          <div className="ds-foot-addr">
            <div>101 WESTPOINT HARBOR DRIVE</div>
            <div>REDWOOD CITY · CA 94063</div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function Swatch({
  name,
  hex,
  bg,
  borderBottom,
}: {
  name: string;
  hex: string;
  bg: string;
  borderBottom?: boolean;
}) {
  return (
    <div className="ds-swatch">
      <div
        className="ds-swatch-chip"
        style={{
          background: bg,
          ...(borderBottom ? { borderBottom: "1px solid var(--ds-ink-700)" } : null),
        }}
      />
      <div className="ds-swatch-body">
        <div className="ds-swatch-name">{name}</div>
        <div className="ds-swatch-hex">{hex}</div>
      </div>
    </div>
  );
}

function TypeRow({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="ds-type-row">
      <div className="ds-type-meta">{label}</div>
      <div>{children}</div>
    </div>
  );
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div className="ds-stat">
      <div className="ds-stat-n">{n}</div>
      <div className="ds-stat-l">{l}</div>
    </div>
  );
}

function Athlete({
  tag,
  name,
  role,
  bio,
}: {
  tag: string;
  name: string;
  role: string;
  bio: string;
}) {
  return (
    <div className="ds-athlete">
      <div className="ds-athlete-ph">{tag}</div>
      <div className="ds-athlete-info">
        <div className="ds-athlete-name">{name}</div>
        <div className="ds-athlete-role">{role}</div>
        <p className="ds-athlete-bio">{bio}</p>
      </div>
    </div>
  );
}

function SchedRow({
  date,
  ev,
  small,
  badgeClass,
  badge,
}: {
  date: string;
  ev: string;
  small: string;
  badgeClass: string;
  badge: string;
}) {
  return (
    <div className="ds-sched-row">
      <div className="ds-sched-date">{date}</div>
      <div className="ds-sched-ev">
        {ev}
        <small>{small}</small>
      </div>
      <span className={`ds-badge ${badgeClass}`}>
        <span className="ds-dot" />
        {badge}
      </span>
    </div>
  );
}

const DS_CSS = `
.ds-root {
  --ds-black:#000000;
  --ds-ink-950:#0A0A0A;
  --ds-ink-900:#141414;
  --ds-ink-800:#1F1F1F;
  --ds-ink-700:#2E2E2E;
  --ds-ink-500:#7A7A7A;
  --ds-ink-300:#B8B8B8;
  --ds-ink-200:#D9D9D9;
  --ds-ink-100:#EDEDED;
  --ds-ink-050:#F5F5F5;
  --ds-white:#FFFFFF;

  --ds-gold-700:#9C7A00;
  --ds-gold-600:#C49600;
  --ds-gold-500:#F0B400;
  --ds-gold-400:#F7C61A;
  --ds-gold-300:#FBD957;
  --ds-gold-200:#FDE89A;
  --ds-gold-100:#FFF3CC;

  --ds-water-500:#2B6FA1;
  --ds-signal-red:#D9342B;

  --ds-ff-display:'Quicksand','Trebuchet MS',system-ui,sans-serif;
  --ds-ff-sans:'Open Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
  --ds-ff-mono:'JetBrains Mono',ui-monospace,'SFMono-Regular',Menlo,monospace;

  --ds-s-1:4px; --ds-s-2:8px; --ds-s-3:12px; --ds-s-4:16px; --ds-s-5:20px;
  --ds-s-6:24px; --ds-s-7:32px; --ds-s-8:40px; --ds-s-9:48px; --ds-s-10:64px;
  --ds-s-11:80px; --ds-s-12:96px; --ds-s-13:128px;

  --ds-r-xs:2px; --ds-r-sm:4px; --ds-r-md:6px; --ds-r-lg:10px; --ds-r-xl:18px; --ds-r-pill:999px;

  --ds-shadow-1:0 1px 2px rgba(0,0,0,.4);
  --ds-shadow-2:0 8px 24px rgba(0,0,0,.45);
  --ds-shadow-3:0 18px 48px -12px rgba(0,0,0,.6);

  background:var(--ds-black);
  color:var(--ds-white);
  font-family:var(--ds-ff-sans);
  font-size:16px;
  line-height:1.6;
  -webkit-font-smoothing:antialiased;
  display:block;
}
.ds-root *,
.ds-root *::before,
.ds-root *::after { box-sizing:border-box; }
.ds-root a { color:var(--ds-gold-400); text-decoration:none; }
.ds-root a:hover { color:var(--ds-gold-300); }

/* Layout */
.ds-shell { max-width:1240px; margin:0 auto; padding:var(--ds-s-9) var(--ds-s-8) var(--ds-s-12); }
.ds-root section { padding-top:var(--ds-s-12); scroll-margin-top:var(--ds-s-7); }
.ds-root section + section { border-top:1px solid var(--ds-ink-700); }
.ds-row { display:flex; gap:var(--ds-s-6); flex-wrap:wrap; }
.ds-grid { display:grid; gap:var(--ds-s-6); }
.ds-col-2 { grid-template-columns:repeat(2,1fr); }
.ds-col-3 { grid-template-columns:repeat(3,1fr); }
.ds-col-4 { grid-template-columns:repeat(4,1fr); }
.ds-col-6 { grid-template-columns:repeat(6,1fr); }
.ds-mt-2 { margin-top:var(--ds-s-2); }
.ds-mt-4 { margin-top:var(--ds-s-4); }
.ds-mt-5 { margin-top:var(--ds-s-5); }
.ds-mt-6 { margin-top:var(--ds-s-6); }
.ds-mt-9 { margin-top:var(--ds-s-9); }
.ds-mb-2 { margin-bottom:var(--ds-s-2); }
.ds-mb-4 { margin-bottom:var(--ds-s-4); }
.ds-flex-1 { flex:1; min-width:300px; }
.ds-items-center { align-items:center; }
.ds-gap-2 { gap:var(--ds-s-2); }

.ds-eyebrow {
  font-family:var(--ds-ff-mono);
  font-size:11px;
  letter-spacing:.18em;
  text-transform:uppercase;
  color:var(--ds-gold-400);
  font-weight:500;
}
.ds-section-title {
  font-family:var(--ds-ff-display);
  font-weight:600;
  font-size:48px;
  line-height:1.05;
  letter-spacing:-.005em;
  color:var(--ds-white);
  margin:var(--ds-s-3) 0 var(--ds-s-2);
}
.ds-section-lede {
  color:var(--ds-ink-300);
  font-size:17px;
  max-width:64ch;
  margin:0 0 var(--ds-s-8);
}

/* Masthead */
.ds-masthead {
  display:grid;
  grid-template-columns:1fr auto;
  align-items:end;
  gap:var(--ds-s-8);
  padding-bottom:var(--ds-s-8);
  border-bottom:1px solid var(--ds-gold-500);
}
.ds-mark { display:flex; align-items:center; gap:var(--ds-s-4); }
.ds-masthead-logo { height:72px; width:auto; display:block; }
.ds-wordmark { display:flex; flex-direction:column; line-height:1; }
.ds-wordmark-divided {
  border-left:1px solid var(--ds-ink-700);
  padding-left:var(--ds-s-5);
  margin-left:var(--ds-s-3);
}
.ds-wm-sub {
  font-family:var(--ds-ff-mono);
  font-size:11px;
  letter-spacing:.32em;
  color:var(--ds-gold-400);
  text-transform:uppercase;
}
.ds-wm-top {
  font-family:var(--ds-ff-display);
  font-weight:600;
  font-size:22px;
  color:var(--ds-white);
  margin-top:6px;
}
.ds-meta {
  text-align:right;
  color:var(--ds-ink-300);
  font-family:var(--ds-ff-mono);
  font-size:12px;
  letter-spacing:.08em;
  line-height:1.7;
}
.ds-meta strong { color:var(--ds-white); font-weight:600; }

.ds-toc {
  display:flex; flex-wrap:wrap; gap:var(--ds-s-2) var(--ds-s-5);
  padding:var(--ds-s-4) 0 0;
  font-family:var(--ds-ff-mono); font-size:12px; letter-spacing:.06em;
}
.ds-toc a { color:var(--ds-ink-500); text-transform:uppercase; }
.ds-toc a:hover { color:var(--ds-gold-400); }

/* Announcement */
.ds-announce {
  margin-top:var(--ds-s-9);
  background:var(--ds-gold-500);
  color:var(--ds-black);
  padding:var(--ds-s-5) var(--ds-s-7);
  display:flex; align-items:center; justify-content:space-between; gap:var(--ds-s-6);
  font-weight:600;
}
.ds-announce-msg { font-size:18px; }
.ds-announce-pill {
  background:var(--ds-white); color:var(--ds-black);
  padding:8px 16px; border-radius:var(--ds-r-sm);
  font-size:14px; font-weight:600;
}

/* Hero */
.ds-hero {
  margin-top:var(--ds-s-9);
  padding:var(--ds-s-12) var(--ds-s-9) var(--ds-s-11);
  background:var(--ds-black);
  border-top:1px solid var(--ds-ink-700);
  border-bottom:1px solid var(--ds-ink-700);
  position:relative;
}
.ds-hero-h1 {
  font-family:var(--ds-ff-display);
  font-size:64px; line-height:1.05; letter-spacing:-.005em;
  font-weight:600; margin:0;
  max-width:18ch;
  color:var(--ds-white);
}
.ds-hero-p {
  color:var(--ds-ink-300); max-width:60ch; font-size:17px; margin:var(--ds-s-6) 0 0;
}
.ds-pillar {
  display:grid; grid-template-columns:repeat(4,1fr); gap:var(--ds-s-7);
  margin-top:var(--ds-s-9);
  padding-top:var(--ds-s-7);
  border-top:1px solid var(--ds-ink-700);
}
.ds-pillar-num {
  font-family:var(--ds-ff-display); font-weight:700;
  font-size:46px; color:var(--ds-gold-400); line-height:1;
}
.ds-pillar-lab {
  font-family:var(--ds-ff-mono); font-size:11px; letter-spacing:.18em; text-transform:uppercase;
  color:var(--ds-ink-300); margin-top:var(--ds-s-2);
}

/* Card */
.ds-card {
  background:var(--ds-ink-900);
  border:1px solid var(--ds-ink-700);
  border-radius:var(--ds-r-md);
  padding:var(--ds-s-6);
}

/* Color */
.ds-swatch {
  border-radius:var(--ds-r-md); overflow:hidden; border:1px solid var(--ds-ink-700);
  background:var(--ds-ink-900);
  display:flex; flex-direction:column;
}
.ds-swatch-chip { height:96px; }
.ds-swatch-body { padding:var(--ds-s-3) var(--ds-s-4); font-family:var(--ds-ff-mono); font-size:11px; color:var(--ds-ink-300); }
.ds-swatch-name { font-weight:700; color:var(--ds-white); letter-spacing:.04em; text-transform:uppercase; }
.ds-swatch-hex { color:var(--ds-ink-500); margin-top:2px; }

.ds-ramp {
  display:grid; grid-template-columns:repeat(10,1fr); gap:0;
  border-radius:var(--ds-r-md); overflow:hidden; border:1px solid var(--ds-ink-700);
}
.ds-ramp-7 { grid-template-columns:repeat(7,1fr); }
.ds-ramp-step {
  height:64px; display:flex; align-items:flex-end;
  padding:var(--ds-s-2) var(--ds-s-3);
  font-family:var(--ds-ff-mono); font-size:10px;
}

.ds-ratio-bar {
  display:flex; height:14px; border-radius:var(--ds-r-pill); overflow:hidden;
  border:1px solid var(--ds-ink-700);
}

/* Type */
.ds-type-row {
  display:grid; grid-template-columns:200px 1fr; gap:var(--ds-s-7);
  padding:var(--ds-s-7) 0; border-top:1px dashed var(--ds-ink-700);
}
.ds-type-row:first-of-type { border-top:none; }
.ds-type-meta { font-family:var(--ds-ff-mono); font-size:11px; color:var(--ds-ink-500); letter-spacing:.04em; line-height:1.7; }
.ds-type-meta b { display:block; color:var(--ds-gold-400); font-weight:700; letter-spacing:.12em; text-transform:uppercase; margin-bottom:var(--ds-s-1); }

.ds-display-xxl { font-family:var(--ds-ff-display); font-weight:600; font-size:96px; line-height:.98; letter-spacing:-.01em; color:var(--ds-white); margin:0; }
.ds-display-xl  { font-family:var(--ds-ff-display); font-weight:600; font-size:64px; line-height:1.02; letter-spacing:-.005em; color:var(--ds-white); margin:0; }
.ds-display-l   { font-family:var(--ds-ff-display); font-weight:600; font-size:44px; line-height:1.05; color:var(--ds-white); margin:0; }
.ds-display-m   { font-family:var(--ds-ff-display); font-weight:500; font-size:32px; line-height:1.15; color:var(--ds-white); margin:0; }
.ds-heading-l   { font-family:var(--ds-ff-display); font-weight:700; font-size:24px; line-height:1.25; color:var(--ds-white); margin:0; }
.ds-heading-m   { font-family:var(--ds-ff-display); font-weight:600; font-size:18px; line-height:1.3; color:var(--ds-white); margin:0; }
.ds-body-l { font-family:var(--ds-ff-sans); font-weight:400; font-size:18px; line-height:1.6; color:var(--ds-ink-200); margin:0; max-width:62ch; }
.ds-body-m { font-family:var(--ds-ff-sans); font-weight:400; font-size:16px; line-height:1.6; color:var(--ds-ink-200); margin:0; max-width:62ch; }
.ds-body-s { font-family:var(--ds-ff-sans); font-weight:400; font-size:14px; line-height:1.55; color:var(--ds-ink-300); margin:0; }
.ds-label  { font-family:var(--ds-ff-mono); font-size:11px; letter-spacing:.2em; text-transform:uppercase; color:var(--ds-gold-400); font-weight:500; }
.ds-quote  { font-family:var(--ds-ff-sans); font-style:italic; font-weight:400; font-size:24px; line-height:1.4; color:var(--ds-white); margin:0; max-width:42ch; }

.ds-ul { padding-left:18px; margin:0; }
.ds-ul li { color:var(--ds-ink-200); }

/* Spacing scale */
.ds-scale { display:flex; align-items:flex-end; gap:var(--ds-s-4); flex-wrap:wrap; }
.ds-scale-unit { display:flex; flex-direction:column; align-items:center; gap:var(--ds-s-2); font-family:var(--ds-ff-mono); font-size:11px; color:var(--ds-ink-300); }
.ds-scale-bar { background:var(--ds-gold-500); width:24px; border-radius:2px; }

.ds-radii { display:grid; grid-template-columns:repeat(6,1fr); gap:var(--ds-s-5); }
.ds-r {
  height:96px; background:var(--ds-ink-900); border:1px solid var(--ds-gold-500);
  display:grid; place-items:end center; padding:var(--ds-s-3);
  font-family:var(--ds-ff-mono); font-size:11px; color:var(--ds-gold-400);
}

.ds-shadows { display:grid; grid-template-columns:repeat(4,1fr); gap:var(--ds-s-6); }
.ds-sh {
  background:var(--ds-ink-900); border:1px solid var(--ds-ink-700);
  height:120px; border-radius:var(--ds-r-md);
  display:grid; place-items:center; font-family:var(--ds-ff-mono); font-size:12px; color:var(--ds-ink-300);
}

/* Buttons */
.ds-btn {
  display:inline-flex; align-items:center; gap:var(--ds-s-2);
  font-family:var(--ds-ff-sans); font-weight:600; font-size:14px;
  padding:10px 18px; border-radius:var(--ds-r-sm);
  border:1px solid transparent; cursor:pointer;
  letter-spacing:.02em;
  transition:transform .08s ease, background .15s ease, border-color .15s ease, color .15s ease;
  text-decoration:none;
}
.ds-btn:active { transform:translateY(1px); }
.ds-btn-gold  { background:var(--ds-gold-500); color:var(--ds-black); border-color:var(--ds-gold-500); }
.ds-btn-gold:hover  { background:var(--ds-gold-400); }
.ds-btn-light { background:var(--ds-white); color:var(--ds-black); border-color:var(--ds-white); }
.ds-btn-light:hover { background:var(--ds-ink-100); }
.ds-btn-ghost { background:transparent; color:var(--ds-white); border-color:var(--ds-ink-700); }
.ds-btn-ghost:hover { border-color:var(--ds-gold-500); color:var(--ds-gold-400); }
.ds-btn-link  { background:transparent; color:var(--ds-gold-400); border:none; padding:0; font-weight:600; border-bottom:1px solid var(--ds-gold-500); border-radius:0; }
.ds-btn-link:hover  { color:var(--ds-gold-300); }
.ds-btn-lg { padding:14px 22px; font-size:15px; }
.ds-btn-sm { padding:6px 12px; font-size:13px; }
.ds-link-sans { font-family:var(--ds-ff-sans); font-size:13px; }

/* Badges */
.ds-badge { display:inline-flex; align-items:center; gap:6px; font-family:var(--ds-ff-mono); font-size:11px; padding:4px 10px; border-radius:var(--ds-r-pill); text-transform:uppercase; letter-spacing:.1em; font-weight:500; }
.ds-b-gold     { background:var(--ds-gold-500); color:var(--ds-black); }
.ds-b-goldline { background:transparent; color:var(--ds-gold-400); border:1px solid var(--ds-gold-500); }
.ds-b-mute     { background:var(--ds-ink-800); color:var(--ds-ink-300); border:1px solid var(--ds-ink-700); }
.ds-b-water    { background:rgba(43,111,161,.2); color:#86B4D6; border:1px solid var(--ds-water-500); }
.ds-b-solid    { background:var(--ds-white); color:var(--ds-black); }
.ds-dot { width:6px; height:6px; border-radius:50%; background:currentColor; opacity:.8; display:inline-block; }

/* Inputs */
.ds-input {
  width:100%; padding:10px 14px; border:1px solid var(--ds-ink-700); border-radius:var(--ds-r-sm);
  background:var(--ds-ink-900); font-family:var(--ds-ff-sans); font-size:14px; color:var(--ds-white);
}
.ds-input::placeholder { color:var(--ds-ink-500); }
.ds-input:focus { outline:2px solid var(--ds-gold-500); outline-offset:1px; border-color:var(--ds-gold-500); }
.ds-field-label { font-family:var(--ds-ff-mono); font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:var(--ds-gold-400); font-weight:600; margin-bottom:6px; display:block; }
.ds-fields { max-width:900px; }

/* Stat */
.ds-stat {
  background:var(--ds-ink-900); border:1px solid var(--ds-ink-700); border-radius:var(--ds-r-md);
  padding:var(--ds-s-6);
  border-top:3px solid var(--ds-gold-500);
}
.ds-stat-n { font-family:var(--ds-ff-display); font-weight:700; font-size:48px; line-height:1; color:var(--ds-white); letter-spacing:-.005em; }
.ds-stat-l { font-family:var(--ds-ff-mono); font-size:11px; letter-spacing:.16em; text-transform:uppercase; color:var(--ds-ink-300); margin-top:var(--ds-s-2); }

/* Pull */
.ds-pull {
  background:var(--ds-ink-900);
  border-left:3px solid var(--ds-gold-500);
  padding:var(--ds-s-6) var(--ds-s-7);
  border-radius:0 var(--ds-r-md) var(--ds-r-md) 0;
}
.ds-mono-attribution { font-family:var(--ds-ff-mono); letter-spacing:.1em; text-transform:uppercase; color:var(--ds-ink-500); }

/* Athlete */
.ds-athlete {
  background:var(--ds-ink-900); border:1px solid var(--ds-ink-700); border-radius:var(--ds-r-md); overflow:hidden;
}
.ds-athlete-ph {
  aspect-ratio:4/5;
  background:repeating-linear-gradient(135deg, #1A1A1A 0 8px, #0F0F0F 8px 16px);
  display:grid; place-items:center;
  color:var(--ds-gold-400); font-family:var(--ds-ff-mono); font-size:11px; letter-spacing:.18em; text-transform:uppercase;
  border-bottom:1px solid var(--ds-ink-700);
}
.ds-athlete-info { padding:var(--ds-s-5); }
.ds-athlete-name { font-family:var(--ds-ff-display); font-size:22px; font-weight:700; color:var(--ds-white); }
.ds-athlete-role { font-family:var(--ds-ff-mono); font-size:11px; letter-spacing:.16em; text-transform:uppercase; color:var(--ds-gold-400); margin-top:6px; }
.ds-athlete-bio  { font-size:14px; color:var(--ds-ink-300); margin-top:var(--ds-s-3); line-height:1.5; }

/* Schedule */
.ds-sched { border-top:1px solid var(--ds-ink-700); }
.ds-sched-row {
  display:grid; grid-template-columns:120px 1fr auto; gap:var(--ds-s-5);
  padding:var(--ds-s-4) 0; border-bottom:1px solid var(--ds-ink-700); align-items:center;
}
.ds-sched-date { font-family:var(--ds-ff-mono); font-size:13px; color:var(--ds-gold-400); font-weight:500; letter-spacing:.04em; }
.ds-sched-ev   { font-family:var(--ds-ff-display); font-size:20px; color:var(--ds-white); font-weight:600; }
.ds-sched-ev small { display:block; font-family:var(--ds-ff-sans); font-size:13px; font-weight:400; color:var(--ds-ink-300); letter-spacing:0; margin-top:2px; }

/* Lockups */
.ds-lockups { display:grid; grid-template-columns:repeat(3,1fr); gap:var(--ds-s-5); }
.ds-lock {
  border:1px solid var(--ds-ink-700); border-radius:var(--ds-r-md);
  padding:var(--ds-s-7); min-height:220px;
  display:grid; place-items:center; background:var(--ds-black);
  position:relative;
}
.ds-lock-light { background:var(--ds-white); border-color:var(--ds-ink-200); }
.ds-lock-gold  { background:var(--ds-gold-500); border-color:var(--ds-gold-600); }
.ds-lock-tag {
  position:absolute; left:var(--ds-s-3); top:var(--ds-s-3);
  font-family:var(--ds-ff-mono); font-size:10px; letter-spacing:.12em; text-transform:uppercase; color:var(--ds-ink-500);
}
.ds-lock-light .ds-lock-tag { color:var(--ds-ink-500); }
.ds-lock-gold .ds-lock-tag  { color:var(--ds-gold-700); }

.ds-lock-logo { max-width:80%; max-height:170px; width:auto; height:auto; display:block; }
.ds-logo-black { filter:brightness(0); }

/* Label utilities used in patterns */
.ds-label-row { display:flex; justify-content:space-between; align-items:center; }
.ds-label-on-gold { color:var(--ds-black); opacity:.7; }

/* CTA on gold */
.ds-cta-gold {
  margin-top:var(--ds-s-6);
  background:var(--ds-gold-500); color:var(--ds-black); border-color:var(--ds-gold-600);
}
.ds-cta-title {
  font-family:var(--ds-ff-display); font-weight:700; font-size:32px; line-height:1.1;
  margin:var(--ds-s-3) 0 0; color:var(--ds-black);
}
.ds-cta-body { color:var(--ds-black); max-width:50ch; }
.ds-btn-cta-dark    { background:var(--ds-black); color:var(--ds-gold-400); border-color:var(--ds-black); }
.ds-btn-cta-outline { background:transparent; color:var(--ds-black); border-color:var(--ds-black); }

/* Footer */
.ds-foot {
  margin-top:var(--ds-s-12); padding:var(--ds-s-9) 0 0;
  border-top:1px solid var(--ds-gold-500);
  display:grid; grid-template-columns:1fr auto; gap:var(--ds-s-7); align-items:end;
  font-family:var(--ds-ff-mono); font-size:12px; color:var(--ds-ink-300); letter-spacing:.04em;
}
.ds-foot-title { font-family:var(--ds-ff-display); font-weight:700; font-size:22px; color:var(--ds-white); margin-bottom:6px; }
.ds-foot-addr { text-align:right; }

/* Responsive */
@media (max-width:900px) {
  .ds-shell { padding:var(--ds-s-6) var(--ds-s-5) var(--ds-s-10); }
  .ds-masthead { grid-template-columns:1fr; align-items:start; }
  .ds-meta { text-align:left; }
  .ds-hero { padding:var(--ds-s-9) var(--ds-s-5) var(--ds-s-9); }
  .ds-hero-h1 { font-size:44px; }
  .ds-pillar { grid-template-columns:repeat(2,1fr); gap:var(--ds-s-5); }
  .ds-section-title { font-size:36px; }
  .ds-display-xxl { font-size:64px; }
  .ds-display-xl  { font-size:48px; }
  .ds-display-l   { font-size:36px; }
  .ds-col-2,.ds-col-3,.ds-col-4 { grid-template-columns:1fr; }
  .ds-lockups { grid-template-columns:1fr; }
  .ds-radii { grid-template-columns:repeat(3,1fr); }
  .ds-shadows { grid-template-columns:repeat(2,1fr); }
  .ds-type-row { grid-template-columns:1fr; gap:var(--ds-s-3); }
  .ds-foot { grid-template-columns:1fr; align-items:start; }
  .ds-foot-addr { text-align:left; }
  .ds-announce { flex-direction:column; align-items:flex-start; }
}
`;
