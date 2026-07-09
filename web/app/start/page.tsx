"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { DecodeText } from "@/components/DecodeText";

/**
 * A guided intro. Six cinematic steps that teach what Athena is and how to read
 * it, ending at the Create console. Keyboard-navigable, skippable, HUD-styled.
 */

interface Step {
  tag: string;
  title: string;
  body: React.ReactNode;
  visual: React.ReactNode;
}

const STEPS: Step[] = [
  {
    tag: "A living system",
    title: "NOT A DASHBOARD",
    body: (
      <>
        Athena is an <em>organizational digital twin</em> — a simulation of a company that lives on
        its own. You don&apos;t read reports about the past; you create an organization, press start,
        and watch it evolve through thousands of interacting decisions.
      </>
    ),
    visual: <LivingNode />,
  },
  {
    tag: "The research question",
    title: "HOW DO ORGANIZATIONS EVOLVE?",
    body: (
      <>
        Every part of Athena earns its place by exploring one question: how do organizations evolve
        as thousands of interconnected decisions accumulate over time? It doesn&apos;t predict reality —
        it simulates <em>plausible</em> behaviour under uncertainty.
      </>
    ),
    visual: <QuestionGlyph />,
  },
  {
    tag: "Deterministic core",
    title: "SAME SEED, SAME WORLD",
    body: (
      <>
        The simulation is deterministic. A run is defined by a <em>seed</em> and a <em>ruleset</em> —
        the same inputs always produce the byte-identical history. That reproducibility is what makes
        it an instrument you can experiment with, not just watch.
      </>
    ),
    visual: <SeedGlyph />,
  },
  {
    tag: "The organism",
    title: "METRICS THAT EMERGE",
    body: (
      <>
        Inside are agents — executives with personas, departments, projects and people. Nothing is a
        formula: cash, morale, innovation and risk <em>emerge</em> from these agents interacting.
        No single KPI defines success; watch how they pull on each other.
      </>
    ),
    visual: <OrgGlyph />,
  },
  {
    tag: "The world",
    title: "A WORLD THAT PUSHES BACK",
    body: (
      <>
        The org lives inside an economy that booms and busts, with competitors, regulators and supply
        shocks — plus real events and <em>disasters</em>: breaches, lawsuits, viral hits, crashes.
        A board reviews the org each quarter and sets a directive, so it visibly self-corrects.
      </>
    ),
    visual: <WorldGlyph />,
  },
  {
    tag: "Your turn",
    title: "BUILD ONE",
    body: (
      <>
        Configure a company — or load a scenario and tune the ruleset down to the coefficient — then
        press start. Read it live through <em>Vitals</em>, the <em>Org Topology</em>, the <em>World</em>,
        and the event feed. Export the run when you&apos;re done. Let&apos;s build your first one.
      </>
    ),
    visual: <LensGlyph />,
  },
];

export default function Start() {
  const router = useRouter();
  const [i, setI] = useState(0);
  const reduce = useReducedMotion();
  const last = i === STEPS.length - 1;

  const next = useCallback(() => {
    if (last) router.push("/create");
    else setI((n) => Math.min(STEPS.length - 1, n + 1));
  }, [last, router]);
  const back = useCallback(() => setI((n) => Math.max(0, n - 1)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") next();
      else if (e.key === "ArrowLeft") back();
      else if (e.key === "Escape") router.push("/create");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, back, router]);

  const step = STEPS[i];

  return (
    <div className="flex min-h-screen flex-col">
      {/* top bar */}
      <header className="flex items-center justify-between border-b border-[var(--color-grid)] px-5 py-3 md:px-10">
        <Link href="/" className="glitch display text-sm tracking-tight">
          ATHENA<span className="text-[var(--color-phosphor)]">.</span>
        </Link>
        <span className="label hidden sm:inline">GUIDED INTRO</span>
        <Link href="/create" className="glitch label hover:text-[var(--color-phosphor)]">
          SKIP →
        </Link>
      </header>

      {/* progress */}
      <div className="mx-auto flex w-full max-w-[1200px] items-center gap-3 px-5 pt-6 md:px-10">
        <span className="mono text-[0.62rem] tracking-widest text-[var(--color-muted)]">
          STEP {String(i + 1).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}
        </span>
        <div className="flex flex-1 gap-1">
          {STEPS.map((_, k) => (
            <div
              key={k}
              className="h-[3px] flex-1 transition-colors duration-300"
              style={{ background: k <= i ? "var(--color-phosphor)" : "var(--color-grid-2)" }}
            />
          ))}
        </div>
      </div>

      {/* body */}
      <main className="mx-auto flex w-full max-w-[1200px] flex-1 items-center px-5 py-10 md:px-10">
        <div className="grid w-full grid-cols-1 items-center gap-10 md:grid-cols-[1.15fr_1fr]">
          <div>
            <div className="label mb-5">{step.tag}</div>
            <h1 className="display text-[clamp(2.2rem,6vw,4.5rem)] leading-[0.92] tracking-tighter">
              <DecodeText key={`t-${i}`} text={step.title} speed={20} />
            </h1>
            <motion.p
              key={`b-${i}`}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="mt-6 max-w-[52ch] text-[1rem] leading-relaxed text-[var(--color-ash-2)]"
            >
              {step.body}
            </motion.p>
          </div>

          <div className="bracket relative flex h-[280px] items-center justify-center border border-[var(--color-grid)] bg-[color-mix(in_srgb,var(--color-panel)_60%,transparent)] md:h-[340px]">
            <motion.div
              key={`v-${i}`}
              initial={reduce ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center justify-center"
            >
              {step.visual}
            </motion.div>
          </div>
        </div>
      </main>

      {/* nav */}
      <footer className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-5 pb-10 md:px-10">
        <button className="gbtn" onClick={back} disabled={i === 0}>
          ← Back
        </button>
        <button className="gbtn glitch" data-active onClick={next}>
          {last ? "▶ Build your company" : "Next →"}
        </button>
      </footer>
    </div>
  );
}

// ── step visuals (monotone HUD motifs) ──────────────────────────────────────

function LivingNode() {
  return (
    <div className="relative flex h-40 w-40 items-center justify-center">
      <span className="absolute h-40 w-40 border border-[var(--color-grid-2)]" />
      <span className="absolute h-24 w-24 border border-[var(--color-grid-2)]" />
      <span className="pulse h-4 w-4 bg-[var(--color-phosphor)]" />
    </div>
  );
}

function QuestionGlyph() {
  return (
    <div className="display text-[7rem] leading-none text-[var(--color-grid-2)]">
      ?<span className="text-[var(--color-phosphor)]">.</span>
    </div>
  );
}

function SeedGlyph() {
  return (
    <div className="mono flex flex-col items-center gap-2 text-[0.7rem] text-[var(--color-muted)]">
      <div className="border border-[var(--color-grid-2)] px-3 py-1.5 text-[var(--color-ash)]">SEED · 1337</div>
      <div className="text-[var(--color-phosphor)]">▼</div>
      <div className="flex gap-1">
        {Array.from({ length: 7 }).map((_, k) => (
          <span key={k} className="h-6 w-[3px]" style={{ background: "var(--color-ash-2)", opacity: 1 - k * 0.1 }} />
        ))}
      </div>
      <div>identical history, every run</div>
    </div>
  );
}

function OrgGlyph() {
  const dot = (c = "var(--color-ash-2)") => <span className="h-2.5 w-2.5" style={{ background: c }} />;
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex gap-6">{dot("var(--color-phosphor)")}{dot()}{dot()}</div>
      <div className="h-5 w-px bg-[var(--color-grid-2)]" />
      <div className="flex gap-8">{dot()}{dot()}{dot()}{dot()}</div>
      <div className="flex gap-4 opacity-70">{dot()}{dot()}{dot()}{dot()}{dot()}{dot()}</div>
    </div>
  );
}

function WorldGlyph() {
  return (
    <svg viewBox="0 0 220 120" className="w-64">
      <path d="M0 60 Q 27 20 55 60 T 110 60 T 165 60 T 220 60" fill="none" stroke="var(--color-ash-2)" strokeWidth="1.5" />
      <path d="M0 60 Q 27 100 55 60 T 110 60" fill="none" stroke="var(--color-phosphor)" strokeWidth="1.5" opacity="0.8" />
      {[30, 60, 90, 120, 150, 180].map((x, k) => (
        <rect key={k} x={x} y={90} width="3" height={8 + (k % 3) * 8} fill="var(--color-grid-2)" />
      ))}
    </svg>
  );
}

function LensGlyph() {
  const tiles = ["VITALS", "TOPOLOGY", "WORLD", "EVENTS"];
  return (
    <div className="grid grid-cols-2 gap-2">
      {tiles.map((t, k) => (
        <div
          key={t}
          className="mono flex h-14 w-24 items-center justify-center border text-[0.6rem] uppercase tracking-widest"
          style={{ borderColor: k === 0 ? "var(--color-phosphor)" : "var(--color-grid-2)", color: k === 0 ? "var(--color-phosphor)" : "var(--color-muted)" }}
        >
          {t}
        </div>
      ))}
    </div>
  );
}
