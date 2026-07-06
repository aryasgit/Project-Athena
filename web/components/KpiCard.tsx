import { Kpi } from "@/lib/queries";
import { DeltaChip } from "./ui";

function formatValue(k: Kpi): string {
  if (k.unit === "%") return k.value.toFixed(1);
  if (k.unit === "LPA") return `₹${k.value.toFixed(1)}`;
  return k.value.toLocaleString("en-IN", { maximumFractionDigits: k.value % 1 === 0 ? 0 : 2 });
}

export function KpiCard({ kpi }: { kpi: Kpi }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="text-[12px] font-medium text-ink-muted">{kpi.label}</div>
      <div className="mt-2 flex items-end gap-2">
        <span className="text-[26px] font-semibold leading-none tracking-tight tabular text-ink">
          {formatValue(kpi)}
        </span>
        {kpi.unit && kpi.unit !== "%" && (
          <span className="mb-0.5 text-xs text-ink-faint">{kpi.unit}</span>
        )}
        {kpi.unit === "%" && <span className="mb-0.5 text-sm text-ink-faint">%</span>}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[11px] text-ink-faint">{kpi.context}</span>
        <DeltaChip delta={kpi.delta} unit={kpi.unit} />
      </div>
    </div>
  );
}
