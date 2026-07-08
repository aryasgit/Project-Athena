"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { DecodeText } from "@/components/DecodeText";

/* A reveal that ENHANCES an already-visible default — never gates content. */
function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

export default function Landing() {
  return (
    <div className="relative">
      {/* ── HUD top bar ──────────────────────────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-[var(--color-grid)] bg-[color-mix(in_srgb,var(--color-void)_70%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-3 md:px-10">
          <span className="glitch display text-sm tracking-tight">
            ATHENA<span className="text-[var(--color-phosphor)]">.</span>
          </span>
          <nav className="hidden items-center gap-6 md:flex">
            <a href="#question" className="glitch label hover:text-[var(--color-phosphor)]">QUESTION</a>
            <a href="#law" className="glitch label hover:text-[var(--color-phosphor)]">ARCHITECTURE</a>
            <a href="#portfolio" className="glitch label hover:text-[var(--color-phosphor)]">INITIATIVE</a>
          </nav>
          <span className="label hidden sm:inline">SYS · <span className="accent">ONLINE</span></span>
        </div>
      </header>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-screen flex-col justify-center overflow-hidden px-5 pt-24 md:px-10">
        {/* corner telemetry */}
        <HudCorner className="left-5 top-24 md:left-10" lines={["ENGINE · DETERMINISTIC", "TICK · 1D = 1 BUSINESS DAY"]} />
        <HudCorner className="right-5 top-24 md:right-10" align="right" lines={["SIG ▮▮▮▮▯ 0.87", "NODES · 22,500"]} />
        <HudCorner className="bottom-8 left-5 md:left-10" lines={["THE LIVING SYSTEMS INITIATIVE", "PROJECT 03 / ATHENA"]} />
        <HudCorner className="bottom-8 right-5 md:right-10" align="right" lines={["SCROLL ↓", "DECODE INITIATED"]} />

        <div className="mx-auto w-full max-w-[1400px]">
          <div className="label mb-6 flex items-center gap-3">
            <span className="h-2 w-2 bg-[var(--color-phosphor)] pulse" />
            ENTERPRISE ORGANIZATIONAL DIGITAL TWIN
          </div>

          <h1 className="display leading-[0.82] tracking-tighter text-[var(--color-ash)]">
            <DecodeText
              as="span"
              text="ATHENA"
              className="stretch block text-[clamp(3.5rem,22vw,17rem)]"
              speed={22}
              revealPerTick={0.5}
            />
          </h1>

          <div className="mt-8 grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-end">
            <p className="max-w-[52ch] text-[1rem] leading-relaxed text-[var(--color-ash-2)]">
              We don&apos;t visualize the past. We simulate the <em>life</em> of an organization —
              thousands of interconnected decisions made by departments, employees, executives,
              customers and markets, accumulating over time. <span className="text-[var(--color-ash)]">Signal over noise.</span>
            </p>
            <div className="flex flex-col items-start gap-3 md:items-end">
              <Link href="/create" className="gbtn glitch text-[0.8rem]">
                ▶ INITIALIZE SIMULATION
              </Link>
              <a href="#question" className="label hover:text-[var(--color-phosphor)]">→ WHAT WE ASK</a>
            </div>
          </div>
        </div>
      </section>

      {/* ── THE RESEARCH QUESTION ────────────────────────────────────── */}
      <section id="question" className="relative border-t border-[var(--color-grid)] px-5 py-28 md:px-10">
        <div className="mx-auto max-w-[1400px]">
          <div className="label mb-8">// THE RESEARCH QUESTION</div>
          <Reveal>
            <h2 className="display max-w-[20ch] text-[clamp(1.8rem,5.2vw,5rem)] leading-[0.95] tracking-tighter">
              HOW DO ORGANIZATIONS <span className="accent">EVOLVE</span> AS THOUSANDS OF DECISIONS ACCUMULATE OVER TIME?
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-8 max-w-[62ch] text-[0.95rem] leading-relaxed text-[var(--color-muted)]">
              Every component of Athena earns its place by helping answer this. It is not built to
              predict reality — it is built to simulate plausible organizational behaviour under
              uncertainty. Closer to SimCity than to a spreadsheet.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── THE THREE-LAYER LAW ──────────────────────────────────────── */}
      <section id="law" className="relative border-t border-[var(--color-grid)] px-5 py-28 md:px-10">
        <div className="mx-auto max-w-[1400px]">
          <div className="label mb-10">// THE ARCHITECTURE · DETERMINISTIC-FIRST</div>
          <div className="flex flex-col gap-px bg-[var(--color-grid)]">
            {LAYERS.map((l, i) => (
              <Reveal key={l.id} delay={i * 0.08}>
                <div className="bracket group relative grid grid-cols-1 gap-4 bg-[var(--color-panel)] px-6 py-8 md:grid-cols-[auto_1fr_auto] md:items-center md:gap-8">
                  <span className="display text-4xl text-[var(--color-grid-2)] md:text-5xl">{l.id}</span>
                  <div>
                    <DecodeText as="h3" onView text={l.title} className="display block text-xl tracking-tight md:text-2xl" />
                    <p className="mt-2 max-w-[68ch] text-[0.9rem] leading-relaxed text-[var(--color-muted)]">{l.body}</p>
                  </div>
                  <span
                    className="mono self-start text-[0.6rem] uppercase tracking-widest md:self-center"
                    style={{ color: l.optional ? "var(--color-muted)" : "var(--color-phosphor)" }}
                  >
                    {l.optional ? "OPTIONAL" : "MANDATORY"}
                  </span>
                </div>
              </Reveal>
            ))}
          </div>
          <p className="mono mt-6 text-[0.7rem] text-[var(--color-faint)]">
            // DEPENDENCY LAW: LOWER LAYERS NEVER DEPEND ON HIGHER ONES. REMOVE THE AI LAYER ENTIRELY — ATHENA IS STILL COMPLETE.
          </p>
        </div>
      </section>

      {/* ── THE INITIATIVE ───────────────────────────────────────────── */}
      <section id="portfolio" className="relative border-t border-[var(--color-grid)] px-5 py-28 md:px-10">
        <div className="mx-auto max-w-[1400px]">
          <div className="label mb-10">// THE LIVING SYSTEMS INITIATIVE</div>
          <div className="flex flex-col">
            {PORTFOLIO.map((p, i) => (
              <Reveal key={p.name} delay={i * 0.08}>
                <div className="group flex flex-wrap items-baseline gap-x-8 gap-y-2 border-b border-[var(--color-grid)] py-7 first:border-t">
                  <span className="display w-[8ch] text-2xl tracking-tight transition-colors group-hover:text-[var(--color-phosphor)] md:text-3xl">
                    {p.name}
                  </span>
                  <span className="text-[0.9rem] text-[var(--color-ash-2)]">{p.models}</span>
                  <span className="ml-auto text-[0.85rem] text-[var(--color-muted)]">{p.q}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-t border-[var(--color-grid)] px-5 py-32 md:px-10">
        <div className="mx-auto max-w-[1400px]">
          <h2 className="display stretch text-[clamp(3rem,18vw,14rem)] leading-[0.82] tracking-tighter text-[var(--color-grid-2)]">
            INITIALIZE
          </h2>
          <div className="mt-8 flex flex-wrap items-center gap-6">
            <Link href="/create" className="gbtn glitch text-[0.85rem]">
              ▶ START SIMULATION
            </Link>
            <span className="mono text-[0.75rem] text-[var(--color-muted)]">
              CREATE A COMPANY · PRESS START · WATCH IT LIVE OR DIE ON ITS OWN.
            </span>
          </div>
        </div>
      </section>

      {/* ── footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-[var(--color-grid)] px-5 py-6 md:px-10">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3">
          <span className="label">ATHENA · ORGANIZATIONAL DIGITAL TWIN</span>
          <span className="label">DETERMINISTIC · AI-OPTIONAL · ZERO-COST</span>
        </div>
      </footer>
    </div>
  );
}

function HudCorner({
  lines,
  className,
  align = "left",
}: {
  lines: string[];
  className?: string;
  align?: "left" | "right";
}) {
  return (
    <div className={`pointer-events-none absolute z-10 hidden flex-col gap-0.5 md:flex ${align === "right" ? "text-right" : ""} ${className}`}>
      {lines.map((l) => (
        <span key={l} className="mono text-[0.58rem] uppercase tracking-widest text-[var(--color-faint)]">{l}</span>
      ))}
    </div>
  );
}

const LAYERS = [
  {
    id: "L1",
    title: "Deterministic Simulation",
    body: "The true intelligence. The organization evolves entirely through seeded, reproducible rules — same seed, same history, forever. Every state transition is explainable.",
    optional: false,
  },
  {
    id: "L2",
    title: "Workflow Orchestration",
    body: "Coordinates events, scheduling, board meetings, notifications and reports. No LLM reasoning. Built to delegate to n8n later without coupling to it.",
    optional: false,
  },
  {
    id: "L3",
    title: "AI Reasoning",
    body: "Optional. Explains results, narrates events, answers questions — reading deterministic output only, never writing state. Degrades gracefully to rule-based when absent.",
    optional: true,
  },
];

const PORTFOLIO = [
  { name: "AGORA", models: "Models electronic exchanges", q: "How do markets execute decisions?" },
  { name: "VEGA", models: "Models quantitative research", q: "How do financial decisions evolve under uncertainty?" },
  { name: "ATHENA", models: "Models organizations", q: "How do organizations evolve over time?" },
];
