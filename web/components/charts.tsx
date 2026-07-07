/**
 * Heritage-system charts: flat ink and crimson on paper, hairline structure,
 * zero gradients, ornament drawn not filled. Server-rendered SVG with native
 * <title> tooltips. Numerals use tabular figures.
 */

const W = 640;
const H = 236;
const PAD = { top: 18, right: 16, bottom: 32, left: 46 };

const CRIMSON = "var(--color-crimson)";
const NUM = "var(--color-ink-2)";   // projections in light grey, not colour
const FN = "var(--color-ink-2)";    // alternate bars in light grey
const HAIR = "var(--color-hair)";
const INK = "var(--color-ink)";
const PAPER = "var(--color-paper)";
const MUTED = "var(--color-muted)";
const AXIS = { fontFamily: "var(--font-mono)", fontSize: 10 } as const;

function scale(v: number, min: number, max: number, a: number, b: number) {
  if (max === min) return (a + b) / 2;
  return a + ((v - min) / (max - min)) * (b - a);
}
function niceTicks(min: number, max: number, count: number): number[] {
  const step = (max - min) / count;
  return Array.from({ length: count + 1 }, (_, i) => min + step * i);
}

type Pt = { label: string; value: number };

function Grid({ ticks, y, format }: { ticks: number[]; y: (v: number) => number; format: (n: number) => string }) {
  return (
    <>
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke={HAIR} strokeWidth="1" />
          <text x={PAD.left - 9} y={y(t) + 3} textAnchor="end" style={AXIS}
            className="tabular" fontSize="10" fill={MUTED}>{format(t)}</text>
        </g>
      ))}
    </>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
      preserveAspectRatio="none" style={{ height: "auto" }}>
      {children}
    </svg>
  );
}

export function LineChart({ data, unit = "", format = (n: number) => n.toFixed(1) }: {
  data: Pt[]; unit?: string; format?: (n: number) => string;
}) {
  if (data.length === 0) return <Empty />;
  const values = data.map((d) => d.value);
  const min = Math.min(...values) * 0.94;
  const max = Math.max(...values) * 1.05;
  const x = (i: number) => scale(i, 0, Math.max(data.length - 1, 1), PAD.left, W - PAD.right);
  const y = (v: number) => scale(v, min, max, H - PAD.bottom, PAD.top);
  const line = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(" ");

  return (
    <Frame>
      <Grid ticks={niceTicks(min, max, 4)} y={y} format={format} />
      <path d={line} fill="none" stroke={CRIMSON} strokeWidth="1.5"
        strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(d.value)} r="3" fill={PAPER} stroke={CRIMSON} strokeWidth="1.5" />
          <text x={x(i)} y={H - PAD.bottom + 17} textAnchor="middle" style={AXIS}
            fontSize="10" fill={MUTED}>{d.label}</text>
          <title>{d.label}: {format(d.value)}{unit}</title>
        </g>
      ))}
    </Frame>
  );
}

export function ForecastChart({ data, unit = "", format = (n: number) => n.toFixed(1) }: {
  data: { label: string; value: number; lower?: number | null; upper?: number | null; forecast: boolean }[];
  unit?: string; format?: (n: number) => string;
}) {
  if (data.length === 0) return <Empty />;
  const all = data.flatMap((d) => [d.value, d.lower ?? d.value, d.upper ?? d.value]);
  const min = Math.min(...all) * 0.92;
  const max = Math.max(...all) * 1.07;
  const x = (i: number) => scale(i, 0, Math.max(data.length - 1, 1), PAD.left, W - PAD.right);
  const y = (v: number) => scale(v, min, max, H - PAD.bottom, PAD.top);

  const splitIdx = data.filter((d) => !d.forecast).length - 1;
  const solidPath = data.map((d, i) => (i <= splitIdx ? `${i === 0 ? "M" : "L"}${x(i)},${y(d.value)}` : "")).join(" ");
  const dashPath = data.map((d, i) => (i >= splitIdx ? `${i === splitIdx ? "M" : "L"}${x(i)},${y(d.value)}` : "")).join(" ");

  const upper = data.map((d, i) => (d.upper != null ? `${x(i)},${y(d.upper)}` : "")).filter(Boolean);
  const lower = [...data].map((d, i) => ({ d, i })).reverse()
    .map(({ d, i }) => (d.lower != null ? `${x(i)},${y(d.lower)}` : "")).filter(Boolean);
  const bandPath = upper.length ? `M${upper.join(" L")} L${lower.join(" L")} Z` : "";

  return (
    <Frame>
      <Grid ticks={niceTicks(min, max, 4)} y={y} format={format} />
      {/* flat, low-alpha crimson interval: data ink, not a gradient surface */}
      {bandPath && <path d={bandPath} fill={NUM} fillOpacity="0.09" stroke="none" />}
      <path d={solidPath} fill="none" stroke={CRIMSON} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <path d={dashPath} fill="none" stroke={NUM} strokeWidth="1.5" strokeDasharray="4 4" strokeLinecap="round" />
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(d.value)} r="3"
            fill={d.forecast ? NUM : PAPER} stroke={d.forecast ? NUM : CRIMSON} strokeWidth="1.5" />
          <text x={x(i)} y={H - PAD.bottom + 17} textAnchor="middle" style={AXIS}
            fontSize="9.5" fill={MUTED}>{d.label}</text>
          <title>{d.label}: {format(d.value)}{unit}{d.forecast ? " (projected)" : ""}</title>
        </g>
      ))}
    </Frame>
  );
}

/* Horizontal figures: flat crimson bar on a hairline track. */
export function BarList({ data, unit = "", format = (n: number) => n.toFixed(1), tone = "crimson" }: {
  data: Pt[]; unit?: string; format?: (n: number) => string; tone?: "crimson" | "ink";
}) {
  if (data.length === 0) return <Empty />;
  const max = Math.max(...data.map((d) => Math.abs(d.value)));
  const fill = tone === "ink" ? FN : CRIMSON;
  return (
    <div className="flex flex-col">
      {data.map((d, i) => (
        <div key={d.label}
          className="grid grid-cols-[150px_1fr_60px] items-center gap-4 border-t border-hair-soft py-2.5"
          style={i === 0 ? { borderTop: "none" } : undefined}>
          <span className="truncate text-[0.82rem] text-ink" title={d.label}>{d.label}</span>
          <div className="h-[7px] border border-hair" style={{ background: PAPER }}>
            <div className="h-full" style={{ width: `${Math.max((Math.abs(d.value) / max) * 100, 2)}%`, background: fill }} />
          </div>
          <span className="text-right text-[0.82rem] font-medium tabular text-ink">
            {format(d.value)}{unit}
          </span>
        </div>
      ))}
    </div>
  );
}

function Empty() {
  return (
    <div className="grid h-36 place-items-center border border-dashed border-hair text-[0.72rem] uppercase tracking-[0.1em] text-muted">
      No data. Run the pipeline to populate this plate.
    </div>
  );
}
