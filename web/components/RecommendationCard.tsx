import { Recommendation } from "@/lib/queries";
import { DomainTag, Plate, PriorityStamp } from "./ui";

function Triad({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-4 border-t border-hair-soft pt-4 first:border-t-0 first:pt-0">
      <div className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </div>
      <p className="text-[0.94rem] leading-relaxed text-muted">{children}</p>
    </div>
  );
}

/* Evidence-backed recommendations (a statistical test vouched for them) carry
   the green signature stamp. Everything else stays in ink. */
function isVouched(rec: Recommendation): boolean {
  const p = rec.evidence && (rec.evidence as Record<string, unknown>).p_value;
  return typeof p === "number" && p < 0.05;
}

export function RecommendationCard({ rec }: { rec: Recommendation }) {
  return (
    <Plate className="p-6">
      <div className="flex items-start justify-between gap-5">
        <div>
          <DomainTag domain={rec.domain} />
          <h3
            className="mt-1.5 font-serif text-[1.3rem] font-medium leading-[1.2] text-ink"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {rec.title}
          </h3>
        </div>
        <div className="flex flex-col items-end gap-2 whitespace-nowrap">
          <PriorityStamp priority={rec.priority} />
          <div className="flex items-center gap-2">
            {isVouched(rec) && <span className="stamp green">Evidence tested</span>}
            {rec.confidence != null && (
              <span className="text-[0.62rem] uppercase tracking-[0.1em] text-muted tabular">
                {(rec.confidence * 100).toFixed(0)}% confidence
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4">
        <Triad label="Observation">{rec.observation}</Triad>
        <Triad label="Business Impact">{rec.business_impact}</Triad>
        <Triad label="Recommended Action">
          <span className="text-ink">{rec.recommended_action}</span>
        </Triad>
      </div>
    </Plate>
  );
}
