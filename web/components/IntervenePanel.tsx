"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { Intervention, InterventionKind, OrgState } from "@athena/engine";
import { INTERVENTIONS } from "@athena/engine";
import { computeDecision, type DecisionReport } from "@/lib/decision";
import { currency } from "@/lib/format";
import { Slider } from "./Slider";

const HORIZONS = [90, 180, 365];

/**
 * The decision console. Choose an intervention, fork the timeline, and read the
 * decision report — base vs alternative, benefits, risks, trade-offs, a verdict —
 * then commit it to the live world or discard it. This is where observing becomes
 * deciding.
 */
export function IntervenePanel({
  state,
  onCommit,
  onClose,
}: {
  state: OrgState;
  onCommit: (iv: Intervention) => void;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<InterventionKind>("rnd-budget");
  const def = INTERVENTIONS.find((d) => d.kind === kind)!;
  const [amount, setAmount] = useState(def.amount?.def ?? 0);
  const [deptId, setDeptId] = useState(state.agents.departments[0]?.id ?? "");
  const [competitorId, setCompetitorId] = useState(state.world.competitors[0]?.id ?? "");
  const [horizon, setHorizon] = useState(180);
  const [report, setReport] = useState<DecisionReport | null>(null);
  const [busy, setBusy] = useState(false);

  const select = (k: InterventionKind) => {
    const d = INTERVENTIONS.find((x) => x.kind === k)!;
    setKind(k);
    setAmount(d.amount?.def ?? 0);
    setReport(null);
  };

  const buildIv = (): Intervention => ({
    kind,
    amount: def.amount ? amount : undefined,
    deptId: def.target === "department" ? deptId : undefined,
    competitorId: def.target === "competitor" ? competitorId : undefined,
  });

  const run = () => {
    setBusy(true);
    // let the button paint the busy state before the (synchronous) compute
    setTimeout(() => {
      setReport(computeDecision(state, buildIv(), horizon));
      setBusy(false);
    }, 20);
  };

  return (
    <motion.aside
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[440px] flex-col border-l border-[var(--color-grid-2)] bg-[color-mix(in_srgb,var(--color-void)_96%,transparent)] backdrop-blur-md"
    >
      <header className="flex items-center justify-between border-b border-[var(--color-grid)] px-5 py-4">
        <div>
          <div className="display text-lg tracking-tight">INTERVENE</div>
          <div className="label mt-0.5">WHAT IF? · DAY {state.day}</div>
        </div>
        <button className="gbtn" onClick={onClose}>✕ CLOSE</button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        {/* choose */}
        <div className="label mb-2">1 · Choose a lever</div>
        <div className="grid grid-cols-2 gap-1.5">
          {INTERVENTIONS.map((d) => (
            <button key={d.kind} className="gbtn justify-start text-left text-[0.62rem]" data-active={kind === d.kind} onClick={() => select(d.kind)}>
              {d.label}
            </button>
          ))}
        </div>

        <p className="mt-3 text-[0.8rem] leading-relaxed text-[var(--color-ash-2)]">{def.description}</p>

        {/* parameters */}
        <div className="mt-4 flex flex-col gap-3">
          {def.amount && (
            <Slider
              label={def.amount.label}
              help="The magnitude of the intervention."
              value={amount}
              def={def.amount.def}
              min={def.amount.min}
              max={def.amount.max}
              step={def.amount.step}
              unit={def.amount.unit}
              onChange={setAmount}
            />
          )}
          {def.target === "department" && (
            <Field label="Department">
              <Select value={deptId} onChange={setDeptId} options={state.agents.departments.map((d) => ({ v: d.id, l: `${d.name} · ${d.headcount}p` }))} />
            </Field>
          )}
          {def.target === "competitor" && (
            <Field label="Target">
              <Select value={competitorId} onChange={setCompetitorId} options={state.world.competitors.map((c) => ({ v: c.id, l: `${c.name} · str ${c.strength.toFixed(0)}` }))} />
            </Field>
          )}
          <Field label="Compare over">
            <div className="flex gap-1.5">
              {HORIZONS.map((h) => (
                <button key={h} className="gbtn" data-active={horizon === h} onClick={() => { setHorizon(h); setReport(null); }}>
                  {h}d
                </button>
              ))}
            </div>
          </Field>
        </div>

        <button className="gbtn glitch mt-4 w-full justify-center py-2.5" data-active onClick={run} disabled={busy}>
          {busy ? "SIMULATING BRANCHES…" : "▶ RUN COMPARISON"}
        </button>

        {/* report */}
        {report && <Report report={report} onCommit={() => onCommit(buildIv())} />}
      </div>
    </motion.aside>
  );
}

function Report({ report, onCommit }: { report: DecisionReport; onCommit: () => void }) {
  const verdictColor =
    report.verdict === "Favourable" ? "var(--color-good)" : report.verdict === "Unfavourable" ? "var(--color-phosphor)" : "var(--color-ash)";
  return (
    <div className="mt-6 border-t border-[var(--color-grid)] pt-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="label">Decision report · {report.horizon}d</div>
        <span className="mono text-[0.7rem] font-semibold tracking-widest" style={{ color: verdictColor }}>
          {report.verdict.toUpperCase()}
        </span>
      </div>

      <BranchChart base={report.baseCash} branch={report.branchCash} />

      {(!report.survivalBranch || !report.survivalBase) && (
        <p className="mono mt-2 text-[0.64rem]" style={{ color: report.survivalBranch ? "var(--color-good)" : "var(--color-phosphor)" }}>
          {report.survivalBranch && !report.survivalBase
            ? "◆ This decision keeps the company alive through the horizon."
            : !report.survivalBranch && report.survivalBase
              ? "◆ This decision leads to insolvency before the horizon."
              : ""}
        </p>
      )}

      {/* delta table */}
      <div className="mt-4 flex flex-col">
        <div className="mono flex items-center gap-2 border-b border-[var(--color-grid)] pb-1 text-[0.55rem] uppercase tracking-widest text-[var(--color-faint)]">
          <span className="flex-1">Metric</span>
          <span className="w-[7ch] text-right">Base</span>
          <span className="w-[7ch] text-right">If done</span>
          <span className="w-[8ch] text-right">Δ</span>
        </div>
        {report.deltas.map((d) => (
          <div key={d.key} className="mono flex items-center gap-2 border-b border-[var(--color-grid)] py-1.5 text-[0.66rem]">
            <span className="flex-1 text-[var(--color-muted)]">{d.label}</span>
            <span className="w-[7ch] text-right tabular text-[var(--color-ash-2)]">{fmt(d.base, d.money)}</span>
            <span className="w-[7ch] text-right tabular text-[var(--color-ash)]">{fmt(d.branch, d.money)}</span>
            <span className="w-[8ch] text-right tabular" style={{ color: Math.abs(d.delta) < 0.5 ? "var(--color-faint)" : d.good ? "var(--color-good)" : "var(--color-phosphor)" }}>
              {d.delta >= 0 ? "+" : ""}{fmt(d.delta, d.money)}
            </span>
          </div>
        ))}
      </div>

      {report.benefits.length > 0 && <Bullets title="Benefits" items={report.benefits} color="var(--color-good)" />}
      {report.risks.length > 0 && <Bullets title="Risks" items={report.risks} color="var(--color-phosphor)" />}
      {report.tradeoffs.length > 0 && <Bullets title="Trade-offs" items={report.tradeoffs} color="var(--color-ash-2)" />}

      <p className="mono mt-4 text-[0.6rem] leading-relaxed text-[var(--color-faint)]">
        // EXACT UNDER THIS SEED — THE BRANCH ISOLATES THE DECISION'S EFFECT. REAL FUTURES VARY WITH EVENTS.
      </p>

      <button className="gbtn glitch mt-4 w-full justify-center py-2.5" data-active onClick={onCommit}>
        ✓ COMMIT DECISION
      </button>
    </div>
  );
}

function BranchChart({ base, branch }: { base: number[]; branch: number[] }) {
  const { W, H, basePath, branchPath, zero } = useMemo(() => {
    const W = 380, H = 96, pad = 4;
    const all = [...base, ...branch, 0];
    const min = Math.min(...all), max = Math.max(...all);
    const n = Math.max(base.length, branch.length) - 1 || 1;
    const x = (i: number) => pad + (i / n) * (W - 2 * pad);
    const y = (v: number) => H - pad - ((v - min) / (max - min || 1)) * (H - 2 * pad);
    const toPath = (arr: number[]) => arr.map((v, i) => `${i ? "L" : "M"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
    return { W, H, basePath: toPath(base), branchPath: toPath(branch), zero: y(0) };
  }, [base, branch]);
  return (
    <div>
      <div className="mono mb-1 flex items-center gap-4 text-[0.55rem] uppercase tracking-widest">
        <span className="flex items-center gap-1.5 text-[var(--color-ash-2)]"><span className="inline-block h-px w-4 bg-[var(--color-ash-2)]" />BASE (DO NOTHING)</span>
        <span className="flex items-center gap-1.5 text-[var(--color-phosphor)]"><span className="inline-block h-px w-4 bg-[var(--color-phosphor)]" />IF DONE</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full border border-[var(--color-grid)]" preserveAspectRatio="none">
        <line x1="0" y1={zero} x2={W} y2={zero} stroke="var(--color-grid-2)" strokeWidth="1" strokeDasharray="2 3" />
        <path d={basePath} fill="none" stroke="var(--color-ash-2)" strokeWidth="1.2" />
        <path d={branchPath} fill="none" stroke="var(--color-phosphor)" strokeWidth="1.4" />
      </svg>
      <div className="mono mt-1 text-right text-[0.55rem] text-[var(--color-faint)]">CASH TRAJECTORY</div>
    </div>
  );
}

function Bullets({ title, items, color }: { title: string; items: string[]; color: string }) {
  return (
    <div className="mt-4">
      <div className="label mb-1.5">{title}</div>
      <ul className="flex flex-col gap-1">
        {items.map((t, i) => (
          <li key={i} className="mono text-[0.68rem] leading-snug" style={{ color }}>
            ◆ {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="label mb-1.5">{label}</div>
      {children}
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-[var(--color-grid-2)] bg-[var(--color-panel)] px-3 py-2 font-[family-name:var(--font-mono)] text-[0.72rem] text-[var(--color-ash)] outline-none focus:border-[var(--color-phosphor)]"
    >
      {options.map((o) => (
        <option key={o.v} value={o.v} className="bg-[var(--color-void)]">
          {o.l}
        </option>
      ))}
    </select>
  );
}

function fmt(v: number, money?: boolean): string {
  if (!Number.isFinite(v)) return "∞";
  if (money) return currency(v);
  return (Math.round(v * 10) / 10).toString();
}
