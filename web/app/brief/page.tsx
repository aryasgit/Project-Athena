import { buildExecutiveBrief } from "@/lib/brief";
import { Plate, PageHeader, PlateLabel } from "@/components/ui";
import { RecommendationCard } from "@/components/RecommendationCard";

export const dynamic = "force-dynamic";

export default async function BriefPage() {
  const brief = await buildExecutiveBrief();
  const aiOn = brief.provenance.engine === "ai-enhanced";

  return (
    <>
      <PageHeader
        plate="Plate I"
        label="AI Executive Brief"
        title={<>The board-ready <em>brief</em>.</>}
        lede="Executives read summaries, not dashboards. This brief is assembled from the deterministic analytics, then, when a model is available, rewritten by the AI layer. Every number stays traceable to the analysis."
      />

      <div className="mb-10 flex flex-wrap items-center gap-3">
        <span className={`stamp ${aiOn ? "green" : "grey"}`}>
          {aiOn ? "AI enhanced" : "Deterministic engine"}
        </span>
        <span className="text-[0.64rem] uppercase tracking-[0.1em] text-muted">
          {aiOn ? `Provider: ${brief.provenance.provider}` : "No AI provider configured, running fully offline"}
        </span>
        <span className="text-[0.64rem] uppercase tracking-[0.1em] text-muted">Cycle {brief.cycle}</span>
      </div>

      <PlateLabel plate="Plate II" label="Executive summary" />
      <Plate className="p-6">
        <p className="font-serif text-[1.24rem] leading-[1.5] text-ink" style={{ fontFamily: "var(--font-serif)" }}>
          {brief.summary}
        </p>
      </Plate>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Plate className="p-6">
          <h2 className="mb-4 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ink">Key insights</h2>
          <List items={brief.insights} marker="crimson" />
        </Plate>
        <Plate className="p-6">
          <h2 className="mb-4 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ink">Risks</h2>
          <List items={brief.risks} marker="danger" />
        </Plate>
      </div>

      <PlateLabel plate="Plate III" label="Recommendations" />
      <div className="grid gap-6">
        {brief.recommendations.map((r, i) => (
          <div key={i} className="plate p-5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-crimson">{r.domain}</span>
              <span className="text-[0.6rem] uppercase tracking-[0.1em] text-muted">{r.priority} priority</span>
            </div>
            <h3 className="mt-1 font-serif text-[1.16rem] font-medium text-ink" style={{ fontFamily: "var(--font-serif)" }}>
              {r.title}
            </h3>
            <p className="mt-2 text-[0.92rem] leading-relaxed text-muted">{r.action}</p>
          </div>
        ))}
      </div>

      <PlateLabel plate="Plate IV" label="Next actions" />
      <Plate className="p-6">
        <ol className="flex flex-col gap-3">
          {brief.nextActions.map((a, i) => (
            <li key={i} className="grid grid-cols-[28px_1fr] gap-3 border-t border-hair-soft pt-3 first:border-t-0 first:pt-0">
              <span className="font-normal tabular text-crimson" style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem" }}>
                {i + 1}
              </span>
              <span className="pt-1 text-[0.94rem] leading-relaxed text-ink">{a}</span>
            </li>
          ))}
        </ol>
      </Plate>

      <p className="mt-8 max-w-[62ch] text-[0.8rem] leading-relaxed text-muted">
        This brief runs with every AI provider disabled. When Ollama or a cloud provider is
        configured, the AI layer rewrites the prose from the same evidence shown above. It never
        changes a number, only the words around them.
      </p>
    </>
  );
}

function List({ items, marker }: { items: string[]; marker: "crimson" | "danger" }) {
  const color = marker === "danger" ? "var(--color-danger)" : "var(--color-crimson)";
  return (
    <ul className="flex flex-col gap-3">
      {items.map((it, i) => (
        <li key={i} className="grid grid-cols-[14px_1fr] gap-2.5">
          <span aria-hidden className="pt-[7px]">
            <span className="block h-[5px] w-[5px] rotate-45" style={{ background: color }} />
          </span>
          <span className="text-[0.92rem] leading-relaxed text-muted">{it}</span>
        </li>
      ))}
    </ul>
  );
}
