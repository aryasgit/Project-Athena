import { getRecommendations } from "@/lib/queries";
import { RecommendationCard } from "@/components/RecommendationCard";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function RecommendationsPage() {
  const recs = await getRecommendations();
  const domains = [...new Set(recs.map((r) => r.domain))];
  const highCount = recs.filter((r) => r.priority === "High").length;

  const stats = [
    { label: "Recommendations", value: recs.length },
    { label: "High priority", value: highCount },
    { label: "Domains covered", value: domains.length },
  ];

  return (
    <>
      <PageHeader
        plate="07"
        label="The Decision Center"
        title={<>Every analysis becomes a <em>decision</em>.</>}
        tail="Observed, weighed, then acted on."
        lede="Each entry states what was observed, why it matters, and the action it recommends. Nothing stops at the chart."
      />

      <div className="figs mb-12" style={{ ["--cols" as string]: stats.length }}>
        {stats.map((s) => (
          <div key={s.label} className="fig">
            <b className="text-ink">{s.value}</b>
            <div className="lab mt-2">{s.label}</div>
          </div>
        ))}
      </div>

      {domains.map((domain, di) => {
        const items = recs.filter((r) => r.domain === domain);
        return (
          <section key={domain} className={di === 0 ? "" : "mt-14"}>
            <div className="eyebrow mb-5">
              <span className="pl">Plate {toRoman(di + 2)}</span>
              <span>{domain}</span>
              <span className="ln" />
            </div>
            <div className="grid gap-6">
              {items.map((r) => <RecommendationCard key={r.recommendation_key} rec={r} />)}
            </div>
          </section>
        );
      })}

      {recs.length === 0 && (
        <div className="grid h-40 place-items-center border border-dashed border-hair text-[0.72rem] uppercase tracking-[0.1em] text-muted">
          No recommendations yet. Run athena build to populate them.
        </div>
      )}
    </>
  );
}

function toRoman(n: number): string {
  const map: [number, string][] = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let out = "";
  for (const [v, s] of map) while (n >= v) { out += s; n -= v; }
  return out;
}
