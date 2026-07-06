import { Recommendation } from "@/lib/queries";
import { DomainTag, PriorityBadge } from "./ui";

function Triad({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3 border-t border-border pt-3 first:border-t-0 first:pt-0">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
        {label}
      </div>
      <p className="text-[13.5px] leading-relaxed text-ink-muted">{children}</p>
    </div>
  );
}

export function RecommendationCard({ rec }: { rec: Recommendation }) {
  return (
    <article className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <DomainTag domain={rec.domain} />
          <h3 className="mt-1 text-[16px] font-semibold tracking-tight text-ink">
            {rec.title}
          </h3>
        </div>
        <div className="flex flex-col items-end gap-2 whitespace-nowrap">
          <PriorityBadge priority={rec.priority} />
          {rec.confidence != null && (
            <span className="text-[11px] text-ink-faint tabular">
              {(rec.confidence * 100).toFixed(0)}% confidence
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <Triad label="Observation">{rec.observation}</Triad>
        <Triad label="Business Impact">{rec.business_impact}</Triad>
        <Triad label="Recommended Action">
          <span className="text-ink">{rec.recommended_action}</span>
        </Triad>
      </div>
    </article>
  );
}
