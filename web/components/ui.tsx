import { ReactNode } from "react";

/* Drafting corner ticks, drawn in ink strokes. */
function Tick({ pos }: { pos: "tl" | "br" }) {
  return (
    <span className={`tick ${pos}`}>
      <svg viewBox="0 0 11 11">
        <path d="M0 .5h10.5M.5 0v10.5" stroke="currentColor" fill="none" />
      </svg>
    </span>
  );
}

/* A hairline plate on the same paper, with drafting ticks at two corners. */
export function Plate({ children, className = "", ticks = true }: {
  children: ReactNode; className?: string; ticks?: boolean;
}) {
  return (
    <section className={`plate ${className}`}>
      {ticks && <Tick pos="tl" />}
      {ticks && <Tick pos="br" />}
      {children}
    </section>
  );
}

/* The page masthead block: plate eyebrow, drawn rule, serif title, lede. */
export function PageHeader({ plate, label, title, lede }: {
  plate: string; label: string; title: ReactNode; lede?: string;
}) {
  return (
    <header className="mb-12">
      <div className="eyebrow mb-5">
        <span className="pl">{plate}</span>
        <span>{label}</span>
        <span className="ln" />
      </div>
      <div className="rule mb-5" />
      <h1
        className="max-w-[16ch] font-extrabold leading-[0.98] tracking-[-0.04em] text-ink"
        style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2.6rem,6vw,4.6rem)" }}
      >
        {title}
      </h1>
      {lede && (
        <p className="mt-4 max-w-[60ch] text-[0.98rem] leading-relaxed text-muted">{lede}</p>
      )}
    </header>
  );
}

/* A section demarcation used between content blocks on a page. */
export function PlateLabel({ plate, label }: { plate: string; label: string }) {
  return (
    <div className="eyebrow mb-5 mt-16 first:mt-0">
      <span className="pl">{plate}</span>
      <span>{label}</span>
      <span className="ln" />
    </div>
  );
}

/* Small caps title used inside a plate. */
export function CardTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-5 flex items-baseline justify-between gap-3">
      <h2 className="font-mono text-[0.72rem] font-medium uppercase tracking-[0.02em] text-ink">
        <span className="text-str">{"// "}</span>{title}
      </h2>
      {hint && (
        <span className="font-mono text-[0.62rem] uppercase tracking-[0.02em] text-faint">{hint}</span>
      )}
    </div>
  );
}

/* Delta rendered as tracked caps with a drawn arrow. Green is reserved for
   the vouched signature, so gains read in ink and declines in the danger tone. */
export function DeltaTag({ delta, unit }: { delta: number | null; unit?: string | null }) {
  if (delta == null) return null;
  const positive = delta >= 0;
  const value = Math.abs(delta).toFixed(unit === "%" ? 1 : delta % 1 === 0 ? 0 : 1);
  return (
    <span
      className="inline-flex items-center gap-1 font-mono text-[0.62rem] font-medium tabular"
      style={{ color: positive ? "var(--color-positive)" : "var(--color-negative)" }}
    >
      <span aria-hidden>{positive ? "▲" : "▼"}</span>
      {positive ? "+" : "−"}
      {value}
      {unit === "%" ? " pts" : ""}
    </span>
  );
}

const PRIORITY_CLASS: Record<string, string> = {
  High: "red",
  Medium: "amber",
  Low: "grey",
};

export function PriorityStamp({ priority }: { priority: string }) {
  return <span className={`stamp ${PRIORITY_CLASS[priority] ?? "grey"}`}>{priority} priority</span>;
}

export function ModuleNotice({ moduleName }: { moduleName: string }) {
  return (
    <div className="mt-6 grid place-items-center border border-dashed border-hair bg-panel px-6 py-16 text-center">
      <div className="max-w-md">
        <div className="mb-2 text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-crimson">
          Placement module only
        </div>
        <p className="text-[0.95rem] leading-relaxed text-muted">
          This view is built for Placement Intelligence. You are currently viewing the{" "}
          <span className="text-ink">{moduleName}</span> module. Switch back from the{" "}
          <a href="/start" className="text-crimson hover:underline">Start</a> screen to use it.
        </p>
      </div>
    </div>
  );
}

export function DomainTag({ domain }: { domain: string }) {
  return (
    <span className="font-mono text-[0.62rem] font-medium uppercase tracking-[0.02em] text-fn">
      {domain}
    </span>
  );
}
