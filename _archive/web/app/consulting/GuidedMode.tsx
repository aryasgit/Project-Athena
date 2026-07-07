"use client";

import { useState } from "react";
import { Kpi, RankingRow, Recommendation } from "@/lib/queries";
import { Figures } from "@/components/KpiCard";
import { BarList } from "@/components/charts";
import { RecommendationCard } from "@/components/RecommendationCard";
import { Plate } from "@/components/ui";

type Props = {
  kpis: Kpi[];
  regions: RankingRow[];
  skills: RankingRow[];
  channels: RankingRow[];
  topRec: Recommendation | null;
  weakRegion: string;
};

const STEPS = ["Understand", "Diagnose", "Segment", "Decide"];

export function GuidedMode(props: Props) {
  const [step, setStep] = useState(0);
  const weakRate = props.regions[0]?.metric?.toFixed(1);
  const rate = props.kpis.find((k) => k.metric_key === "placement_rate")?.value?.toFixed(1);
  const topSkill = props.skills[0];
  const bestChannel = props.channels[0];

  return (
    <div>
      {/* progress rail */}
      <ol className="mb-8 grid grid-cols-4 border border-hair">
        {STEPS.map((label, i) => (
          <li key={label}
            className="border-r border-hair px-3 py-3 last:border-r-0"
            style={{ background: i === step ? "var(--color-accent-soft, transparent)" : "transparent" }}>
            <div className="flex items-baseline gap-2">
              <span className="font-normal tabular"
                style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem",
                  color: i <= step ? "var(--color-crimson)" : "var(--color-muted)" }}>
                {i + 1}
              </span>
              <span className="text-[0.62rem] font-semibold uppercase tracking-[0.1em]"
                style={{ color: i === step ? "var(--color-ink)" : "var(--color-muted)" }}>
                {label}
              </span>
            </div>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <Step
          q="Step 1. What is actually happening?"
          lead="Before any recommendation, read the position. These are the headline outcomes for the cycle. A consultant starts by grounding everyone in the same facts."
        >
          <Figures kpis={props.kpis} />
        </Step>
      )}

      {step === 1 && (
        <Step
          q="Step 2. Where is the problem concentrated?"
          lead={`The headline placement rate is ${rate}%. Break it down by region to find where it is dragged. ${props.weakRegion} sits lowest at ${weakRate}%, so that is where the gap lives.`}
        >
          <Plate className="p-6">
            <BarList data={props.regions.map((r) => ({ label: r.entity, value: r.metric }))}
              unit="%" format={(n) => n.toFixed(1)} tone="ink" />
          </Plate>
        </Step>
      )}

      {step === 2 && (
        <Step
          q="Step 3. Which segments explain the outcome?"
          lead={`Now segment the drivers. ${topSkill?.entity} carries the clearest pay premium, and ${bestChannel?.entity} is the highest-yield channel. These are the levers with the most leverage.`}
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <Plate className="p-6">
              <div className="mb-4 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ink">Skill premium</div>
              <BarList data={props.skills.map((r) => ({ label: r.entity, value: r.metric }))}
                unit="%" format={(n) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(1)}`} />
            </Plate>
            <Plate className="p-6">
              <div className="mb-4 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ink">Channel yield</div>
              <BarList data={props.channels.map((r) => ({ label: r.entity, value: r.metric }))}
                unit="%" format={(n) => n.toFixed(1)} tone="ink" />
            </Plate>
          </div>
        </Step>
      )}

      {step === 3 && (
        <Step
          q="Step 4. So what should we do?"
          lead="The analysis resolves to a decision. This is the highest-priority recommendation the evidence supports, stated as observation, impact, and action."
        >
          {props.topRec ? <RecommendationCard rec={props.topRec} /> : <p className="text-muted">No recommendation available.</p>}
        </Step>
      )}

      <div className="mt-8 flex items-center justify-between">
        <button onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0} className="gbtn disabled:opacity-40">Back</button>
        <span className="text-[0.62rem] uppercase tracking-[0.12em] text-muted">
          Step {step + 1} of {STEPS.length}
        </span>
        {step < STEPS.length - 1 ? (
          <button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} className="gbtn">
            Next step
          </button>
        ) : (
          <button onClick={() => setStep(0)} className="gbtn">Start over</button>
        )}
      </div>
    </div>
  );
}

function Step({ q, lead, children }: { q: string; lead: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-serif text-[1.5rem] font-medium leading-tight text-ink" style={{ fontFamily: "var(--font-serif)" }}>
        {q}
      </h2>
      <p className="mb-6 mt-2 max-w-[64ch] text-[0.95rem] leading-relaxed text-muted">{lead}</p>
      {children}
    </div>
  );
}
