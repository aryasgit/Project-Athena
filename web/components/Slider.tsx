"use client";

/**
 * The HUD slider — a native range (accessible, draggable) skinned to match the
 * instrument: a hairline track that fills crimson to the handle, a square
 * chrome thumb, a ghost tick at the default value, and a plain-language helper
 * so the user understands exactly what they're tweaking.
 */
export function Slider({
  label,
  help,
  value,
  min,
  max,
  step,
  def,
  unit,
  onChange,
}: {
  label: string;
  help: string;
  value: number;
  min: number;
  max: number;
  step: number;
  def: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  const defPct = ((def - min) / (max - min)) * 100;
  const changed = Math.abs(value - def) > step / 2;

  return (
    <div className="py-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="mono text-[0.68rem] text-[var(--color-ash)]">{label}</span>
        <span className="mono flex items-baseline gap-2 text-[0.62rem]">
          <span className="tabular" style={{ color: changed ? "var(--color-phosphor)" : "var(--color-ash-2)" }}>
            {trim(value)}
            {unit ? ` ${unit}` : ""}
          </span>
          {changed && (
            <button
              className="text-[var(--color-faint)] hover:text-[var(--color-phosphor)]"
              onClick={() => onChange(def)}
              title={`Reset to default (${trim(def)})`}
            >
              ↺
            </button>
          )}
        </span>
      </div>

      <div className="range-wrap mt-2">
        <span className="range-tick" style={{ left: `calc(${defPct}% )` }} aria-hidden />
        <input
          type="range"
          className="athena-range relative"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-label={label}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{
            background: `linear-gradient(to right, var(--color-phosphor) 0 ${pct}%, var(--color-grid-2) ${pct}% 100%)`,
          }}
        />
      </div>

      <p className="mt-1.5 text-[0.66rem] leading-snug text-[var(--color-muted)]">{help}</p>
    </div>
  );
}

function trim(n: number): string {
  return (Math.round(n * 1000) / 1000).toString();
}
