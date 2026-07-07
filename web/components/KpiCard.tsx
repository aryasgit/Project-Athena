import { Kpi } from "@/lib/queries";
import { DeltaTag } from "./ui";

function formatValue(k: Kpi): string {
  if (k.unit === "%") return `${k.value.toFixed(1)}%`;
  if (k.unit === "LPA") return `₹${k.value.toFixed(1)}`;
  if (k.unit === "Cr") return `₹${k.value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  return k.value.toLocaleString("en-IN", { maximumFractionDigits: k.value % 1 === 0 ? 0 : 2 });
}

/* The KPI row set as engraved figures: Caslon numerals in hairline cells. */
export function Figures({ kpis }: { kpis: Kpi[] }) {
  return (
    <div
      className="figs"
      style={{ ["--cols" as string]: Math.min(kpis.length, 5) }}
    >
      {kpis.map((k) => (
        <div key={k.metric_key} className="fig">
          <b className="text-ink">{formatValue(k)}</b>
          <div className="lab mt-2">{k.label}</div>
          <div className="mt-2.5 flex items-center justify-between gap-2">
            <span className="text-[0.6rem] uppercase tracking-[0.08em] text-muted">
              {k.context}
            </span>
            <DeltaTag delta={k.delta} unit={k.unit} />
          </div>
        </div>
      ))}
    </div>
  );
}
