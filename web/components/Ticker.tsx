/** Full-bleed marquee of mono tokens, Arc-style. */
export function Ticker({ items }: { items: string[] }) {
  const row = items.length ? items : ["decision intelligence"];
  const doubled = [...row, ...row];
  return (
    <div className="relative -mx-5 overflow-hidden border-y border-hair py-3 md:-mx-10">
      <div className="ticker-track flex w-max items-center whitespace-nowrap">
        {doubled.map((t, i) => (
          <span key={i} className="flex items-center font-mono text-[0.72rem] text-muted">
            <span className="px-6">{t}</span>
            <span className="text-faint">/</span>
          </span>
        ))}
      </div>
    </div>
  );
}
