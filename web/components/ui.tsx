import { ReactNode } from "react";

export function PageHeader({ eyebrow, title, subtitle }: {
  eyebrow: string; title: string; subtitle?: string;
}) {
  return (
    <header className="mb-8">
      <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
        {eyebrow}
      </div>
      <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-ink md:text-[28px]">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">{subtitle}</p>
      )}
    </header>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-xl border border-border bg-surface p-5 ${className}`}
    >
      {children}
    </section>
  );
}

export function CardTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-3">
      <h2 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h2>
      {hint && <span className="text-[11px] text-ink-faint">{hint}</span>}
    </div>
  );
}

export function DeltaChip({ delta, unit }: { delta: number | null; unit?: string | null }) {
  if (delta == null) return null;
  const positive = delta >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium tabular ${
        positive
          ? "bg-positive/12 text-positive"
          : "bg-negative/12 text-negative"
      }`}
    >
      <span aria-hidden>{positive ? "▲" : "▼"}</span>
      {positive ? "+" : ""}
      {delta.toFixed(unit === "%" ? 1 : delta % 1 === 0 ? 0 : 1)}
      {unit === "%" ? " pts" : ""}
    </span>
  );
}

const PRIORITY_STYLES: Record<string, string> = {
  High: "bg-negative/12 text-negative border-negative/25",
  Medium: "bg-warning/12 text-warning border-warning/25",
  Low: "bg-ink-muted/10 text-ink-muted border-border-strong",
};

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${
        PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.Low
      }`}
    >
      {priority} priority
    </span>
  );
}

export function DomainTag({ domain }: { domain: string }) {
  return (
    <span className="text-[11px] font-medium uppercase tracking-wider text-accent">
      {domain}
    </span>
  );
}
