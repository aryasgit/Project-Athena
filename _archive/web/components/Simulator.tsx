"use client";

import { useMemo, useState } from "react";
import { Baseline, Levers, defaultLevers, simulate } from "@/lib/scenario";
import { Plate, CardTitle } from "./ui";

type LeverMeta = {
  key: keyof Levers;
  label: (b: Baseline) => string;
  min: number;
  max: number;
  suffix: string;
  note: (b: Baseline) => string;
};

const LEVERS: LeverMeta[] = [
  {
    key: "internCoverage", label: () => "Internship coverage", min: 20, max: 90, suffix: "%",
    note: (b) => `cohort with a prior internship · baseline ${Math.round(b.internCoverage)}%`,
  },
  {
    key: "skillCoverage", label: () => "High-value skill training", min: 0, max: 100, suffix: "%",
    note: () => "cloud, ML and system design · baseline 25%",
  },
  {
    key: "channelShare", label: () => "High-yield channel mix", min: 30, max: 95, suffix: "%",
    note: (b) => `on-campus and referral share · baseline ${Math.round(b.channelShare)}%`,
  },
  {
    key: "regionIntervention", label: (b) => `${b.weakRegion} region intervention`, min: 0, max: 100, suffix: "",
    note: (b) => `effort to close the ${b.weakRegion} gap · baseline none`,
  },
  {
    key: "tierInvestment", label: () => "Tier-2 / Tier-3 investment", min: 0, max: 100, suffix: "",
    note: () => "training spend on lower-tier cohorts · baseline none",
  },
];

const VERDICT_STAMP: Record<string, string> = {
  "Worth pursuing": "crimson",
  "Marginal gain": "amber",
  "Not recommended": "red",
};

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="fig">
      <b className="text-ink">{value}</b>
      <div className="lab mt-2">{label}</div>
      {sub && <div className="mt-1 text-[0.6rem] uppercase tracking-[0.08em] text-muted">{sub}</div>}
    </div>
  );
}

function Delta({ label, value, unit, good }: { label: string; value: number; unit: string; good: boolean }) {
  const positive = value >= 0;
  const color = value === 0 ? "var(--color-muted)" : good ? "var(--color-ink)" : "var(--color-danger)";
  return (
    <div className="flex items-center justify-between border-t border-hair-soft py-2.5 first:border-t-0">
      <span className="text-[0.82rem] text-muted">{label}</span>
      <span className="text-[0.86rem] font-medium tabular" style={{ color }}>
        {positive ? "▲ +" : "▼ −"}{Math.abs(value).toFixed(unit === "students" ? 0 : unit === "LPA" ? 2 : 1)}
        {unit === "pts" ? " pts" : unit === "LPA" ? " LPA" : unit === "students" ? " placed" : unit}
      </span>
    </div>
  );
}

export function Simulator({ baseline }: { baseline: Baseline }) {
  const [levers, setLevers] = useState<Levers>(() => defaultLevers(baseline));
  const proj = useMemo(() => simulate(baseline, levers), [baseline, levers]);

  const set = (key: keyof Levers, v: number) => setLevers((l) => ({ ...l, [key]: v }));
  const reset = () => setLevers(defaultLevers(baseline));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* Levers */}
      <Plate className="p-6">
        <CardTitle title="Assumptions" hint="drag to explore" />
        <div className="flex flex-col gap-7">
          {LEVERS.map((m) => {
            const value = levers[m.key];
            return (
              <div key={m.key}>
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <span className="text-[0.8rem] font-medium text-ink">{m.label(baseline)}</span>
                  <span
                    className="font-normal tabular text-crimson"
                    style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem" }}
                  >
                    {value}
                    {m.suffix}
                  </span>
                </div>
                <input
                  type="range" className="lever" min={m.min} max={m.max} value={value}
                  onChange={(e) => set(m.key, Number(e.target.value))}
                  aria-label={m.label(baseline)}
                />
                <div className="mt-1.5 text-[0.62rem] uppercase tracking-[0.08em] text-muted">
                  {m.note(baseline)}
                </div>
              </div>
            );
          })}
        </div>
        <button onClick={reset} className="gbtn mt-7">Reset to baseline</button>
      </Plate>

      {/* Projection */}
      <div className="flex flex-col gap-6">
        <div className="figs" style={{ ["--cols" as string]: 3 }}>
          <Metric label="Placement rate" value={`${proj.placementRate.toFixed(1)}%`} />
          <Metric label="Median CTC" value={`₹${proj.medianCtc.toFixed(1)}`} sub="LPA" />
          <Metric label="Students placed" value={proj.placed.toLocaleString("en-IN")} sub={`of ${baseline.cohort.toLocaleString("en-IN")}`} />
        </div>

        <Plate className="p-6">
          <CardTitle title="Expected impact" hint="versus current baseline" />
          <Delta label="Placement rate" value={proj.deltaRate} unit="pts" good={proj.deltaRate >= 0} />
          <Delta label="Median CTC" value={proj.deltaCtc} unit="LPA" good={proj.deltaCtc >= 0} />
          <Delta label="Students placed" value={proj.deltaPlaced} unit="students" good={proj.deltaPlaced >= 0} />
        </Plate>

        <Plate className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-crimson">
              Athena&apos;s verdict
            </div>
            <div className="flex items-center gap-3">
              <span className={`stamp ${VERDICT_STAMP[proj.verdict]}`}>{proj.verdict}</span>
              <span className="text-[0.62rem] uppercase tracking-[0.1em] text-muted tabular">
                {(proj.confidence * 100).toFixed(0)}% confidence
              </span>
            </div>
          </div>
          <p
            className="mt-3 font-serif text-[1.12rem] leading-[1.4] text-ink"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {proj.headline}
          </p>
          {(() => {
            const positive = proj.drivers.filter((d) => d.contribution > 0);
            const total = positive.reduce((s, d) => s + d.contribution, 0);
            if (!positive.length || total <= 0) return null;
            return (
              <div className="mt-4 border-t border-hair-soft pt-4">
                <div className="mb-2 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-muted">
                  What drives the gain
                </div>
                {positive.slice(0, 3).map((d) => (
                  <div key={d.label} className="flex items-center gap-3 py-1">
                    <span className="w-[150px] shrink-0 text-[0.8rem] text-muted">{d.label}</span>
                    <div className="h-[6px] flex-1 border border-hair">
                      <div className="h-full bg-crimson"
                        style={{ width: `${Math.max((d.contribution / total) * 100, 2)}%` }} />
                    </div>
                    <span className="w-9 text-right text-[0.8rem] tabular text-ink">
                      {Math.round((d.contribution / total) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            );
          })()}
        </Plate>
      </div>
    </div>
  );
}
