/**
 * Dependency-free SVG charts. Server-rendered; native <title> tooltips.
 * All charts use a fixed viewBox and scale to their container width.
 */

const W = 640;
const H = 240;
const PAD = { top: 20, right: 20, bottom: 34, left: 44 };

function scale(v: number, min: number, max: number, a: number, b: number) {
  if (max === min) return (a + b) / 2;
  return a + ((v - min) / (max - min)) * (b - a);
}

type Pt = { label: string; value: number };

export function LineChart({ data, unit = "", format = (n: number) => n.toFixed(1) }: {
  data: Pt[]; unit?: string; format?: (n: number) => string;
}) {
  if (data.length === 0) return <Empty />;
  const values = data.map((d) => d.value);
  const min = Math.min(...values) * 0.92;
  const max = Math.max(...values) * 1.06;
  const x = (i: number) => scale(i, 0, Math.max(data.length - 1, 1), PAD.left, W - PAD.right);
  const y = (v: number) => scale(v, min, max, H - PAD.bottom, PAD.top);

  const line = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(data.length - 1)},${H - PAD.bottom} L${x(0)},${H - PAD.bottom} Z`;
  const ticks = niceTicks(min, max, 4);

  return (
    <ChartFrame>
      <defs>
        <linearGradient id="line-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)}
            stroke="var(--color-border)" strokeWidth="1" />
          <text x={PAD.left - 8} y={y(t) + 3} textAnchor="end"
            className="tabular" fontSize="10" fill="var(--color-ink-faint)">
            {format(t)}
          </text>
        </g>
      ))}
      <path d={area} fill="url(#line-fill)" />
      <path d={line} fill="none" stroke="var(--color-accent)" strokeWidth="2"
        strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(d.value)} r="3.2" fill="var(--color-canvas)"
            stroke="var(--color-accent)" strokeWidth="2" />
          <text x={x(i)} y={H - PAD.bottom + 18} textAnchor="middle"
            fontSize="10" fill="var(--color-ink-muted)">{d.label}</text>
          <title>{d.label}: {format(d.value)}{unit}</title>
        </g>
      ))}
    </ChartFrame>
  );
}

export function ForecastChart({ data, unit = "", format = (n: number) => n.toFixed(1) }: {
  data: { label: string; value: number; lower?: number | null; upper?: number | null; forecast: boolean }[];
  unit?: string; format?: (n: number) => string;
}) {
  if (data.length === 0) return <Empty />;
  const all = data.flatMap((d) => [d.value, d.lower ?? d.value, d.upper ?? d.value]);
  const min = Math.min(...all) * 0.9;
  const max = Math.max(...all) * 1.08;
  const x = (i: number) => scale(i, 0, Math.max(data.length - 1, 1), PAD.left, W - PAD.right);
  const y = (v: number) => scale(v, min, max, H - PAD.bottom, PAD.top);
  const ticks = niceTicks(min, max, 4);

  const solid = data.filter((d) => !d.forecast);
  const splitIdx = solid.length - 1;
  const solidPath = data.map((d, i) =>
    i <= splitIdx ? `${i === 0 ? "M" : "L"}${x(i)},${y(d.value)}` : "").join(" ");
  const dashPath = data.map((d, i) =>
    i >= splitIdx ? `${i === splitIdx ? "M" : "L"}${x(i)},${y(d.value)}` : "").join(" ");

  const band = data.filter((d) => d.upper != null);
  const bandPath = band.length
    ? `M${data.map((d, i) => d.upper != null ? `${x(i)},${y(d.upper)}` : "").filter(Boolean).join(" L")}` +
      ` L${[...data].reverse().map((d, ri) => {
        const i = data.length - 1 - ri;
        return d.lower != null ? `${x(i)},${y(d.lower)}` : "";
      }).filter(Boolean).join(" L")} Z`
    : "";

  return (
    <ChartFrame>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)}
            stroke="var(--color-border)" strokeWidth="1" />
          <text x={PAD.left - 8} y={y(t) + 3} textAnchor="end"
            className="tabular" fontSize="10" fill="var(--color-ink-faint)">{format(t)}</text>
        </g>
      ))}
      {bandPath && <path d={bandPath} fill="var(--color-accent)" fillOpacity="0.1" />}
      <path d={solidPath} fill="none" stroke="var(--color-accent)" strokeWidth="2"
        strokeLinejoin="round" strokeLinecap="round" />
      <path d={dashPath} fill="none" stroke="var(--color-accent)" strokeWidth="2"
        strokeDasharray="5 4" strokeLinecap="round" />
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(d.value)} r="3.2"
            fill={d.forecast ? "var(--color-accent)" : "var(--color-canvas)"}
            stroke="var(--color-accent)" strokeWidth="2" />
          <text x={x(i)} y={H - PAD.bottom + 18} textAnchor="middle"
            fontSize="9.5" fill="var(--color-ink-muted)">{d.label}</text>
          <title>{d.label}: {format(d.value)}{unit}{d.forecast ? " (projected)" : ""}</title>
        </g>
      ))}
    </ChartFrame>
  );
}

export function BarList({ data, unit = "", format = (n: number) => n.toFixed(1), accent = "var(--color-accent)" }: {
  data: Pt[]; unit?: string; format?: (n: number) => string; accent?: string;
}) {
  if (data.length === 0) return <Empty />;
  const max = Math.max(...data.map((d) => Math.abs(d.value)));
  return (
    <div className="flex flex-col gap-2.5">
      {data.map((d) => (
        <div key={d.label} className="grid grid-cols-[140px_1fr_54px] items-center gap-3">
          <span className="truncate text-[13px] text-ink-muted" title={d.label}>{d.label}</span>
          <div className="h-2 rounded-full bg-surface-2">
            <div className="h-2 rounded-full" style={{
              width: `${Math.max((Math.abs(d.value) / max) * 100, 3)}%`, background: accent,
            }} />
          </div>
          <span className="text-right text-[13px] font-medium tabular text-ink">
            {format(d.value)}{unit}
          </span>
        </div>
      ))}
    </div>
  );
}

function ChartFrame({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
      preserveAspectRatio="none" style={{ height: "auto" }}>
      {children}
    </svg>
  );
}

function Empty() {
  return (
    <div className="grid h-40 place-items-center rounded-lg border border-dashed border-border text-sm text-ink-faint">
      No data — run the pipeline to populate this view.
    </div>
  );
}

function niceTicks(min: number, max: number, count: number): number[] {
  const step = (max - min) / count;
  return Array.from({ length: count + 1 }, (_, i) => min + step * i);
}
