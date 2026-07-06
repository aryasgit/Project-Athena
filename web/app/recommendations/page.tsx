import { getRecommendations } from "@/lib/queries";
import { RecommendationCard } from "@/components/RecommendationCard";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function RecommendationsPage() {
  const recs = await getRecommendations();

  const domains = [...new Set(recs.map((r) => r.domain))];
  const highCount = recs.filter((r) => r.priority === "High").length;

  return (
    <>
      <PageHeader
        eyebrow="Decision Center"
        title="Strategic Recommendations"
        subtitle="Every analysis resolves to a decision. Each card states what was observed, why it matters, and the action it recommends."
      />

      <div className="mb-6 flex flex-wrap gap-3">
        <Stat label="Recommendations" value={recs.length} />
        <Stat label="High priority" value={highCount} />
        <Stat label="Domains covered" value={domains.length} />
      </div>

      {domains.map((domain) => {
        const items = recs.filter((r) => r.domain === domain);
        return (
          <section key={domain} className="mb-8">
            <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-ink-muted">
              {domain}
            </h2>
            <div className="grid gap-4">
              {items.map((r) => <RecommendationCard key={r.recommendation_key} rec={r} />)}
            </div>
          </section>
        );
      })}

      {recs.length === 0 && (
        <div className="grid h-40 place-items-center rounded-xl border border-dashed border-border text-sm text-ink-faint">
          No recommendations yet — run <code className="mx-1 text-ink-muted">athena build</code> to populate them.
        </div>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-2.5">
      <div className="text-[22px] font-semibold leading-none tabular text-ink">{value}</div>
      <div className="mt-1 text-[11px] text-ink-faint">{label}</div>
    </div>
  );
}
