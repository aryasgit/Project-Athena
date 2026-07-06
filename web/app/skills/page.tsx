import { getRanking, getSeries, getRecommendations } from "@/lib/queries";
import { BarList } from "@/components/charts";
import { Card, CardTitle, PageHeader } from "@/components/ui";
import { RecommendationCard } from "@/components/RecommendationCard";

export const dynamic = "force-dynamic";

export default async function SkillsPage() {
  const [premium, demand, demandSeries, recs] = await Promise.all([
    getRanking("skill_salary_premium"),
    getRanking("most_demanded_skills"),
    getSeries("skill_demand_by_cycle"),
    getRecommendations(),
  ]);

  const premiumData = premium.map((r) => ({ label: r.entity, value: r.metric }));
  const demandData = demand.map((r) => ({ label: r.entity, value: r.metric }));

  // Skill demand growth: share change from first to last cycle.
  const bySkill = new Map<string, { first: number; last: number }>();
  const cycles = [...new Set(demandSeries.map((p) => (p.dimension ?? "|").split("|")[1]))].sort();
  const firstCycle = cycles[0], lastCycle = cycles[cycles.length - 1];
  for (const p of demandSeries) {
    const [skill, cycle] = (p.dimension ?? "|").split("|");
    const cur = bySkill.get(skill) ?? { first: 0, last: 0 };
    if (cycle === firstCycle) cur.first = p.value;
    if (cycle === lastCycle) cur.last = p.value;
    bySkill.set(skill, cur);
  }
  const growth = [...bySkill.entries()]
    .map(([skill, v]) => ({ label: skill, value: v.last - v.first }))
    .sort((a, b) => b.value - a.value);

  const skillRec = recs.find((r) => r.title.toLowerCase().includes("upskill") ||
    r.title.toLowerCase().includes("skill"));

  return (
    <>
      <PageHeader
        eyebrow="Talent & Skill Analytics"
        title="Skill Intelligence"
        subtitle="Which skills the market pays for, which are becoming critical, and what that means for curriculum and hiring strategy."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle title="Salary premium by skill" hint="median CTC vs overall, latest cycle" />
          <BarList data={premiumData} unit="%" format={(n) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}`} />
          <p className="mt-4 text-[12.5px] leading-relaxed text-ink-muted">
            System design, machine learning and deep learning carry the clearest pay premium —
            these are the skills that move a candidate up the CTC distribution.
          </p>
        </Card>
        <Card>
          <CardTitle title="Most in-demand skills" hint="% of placed students, latest cycle" />
          <BarList data={demandData} unit="%" format={(n) => n.toFixed(1)}
            accent="var(--color-positive)" />
        </Card>
      </div>

      <div className="mt-4">
        <Card>
          <CardTitle title="Rising skill demand" hint={`share change, ${firstCycle} → ${lastCycle} (points)`} />
          <BarList data={growth} unit=" pts" format={(n) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}`} />
          <p className="mt-4 text-[12.5px] leading-relaxed text-ink-muted">
            Cloud and ML-adjacent skills are appearing in a growing share of offers each cycle,
            signalling where pre-placement training should concentrate.
          </p>
        </Card>
      </div>

      {skillRec && (
        <>
          <h2 className="mt-8 mb-4 text-lg font-semibold tracking-tight">What this implies</h2>
          <RecommendationCard rec={skillRec} />
        </>
      )}
    </>
  );
}
