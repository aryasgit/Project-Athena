import { getRanking, getSeries, getRecommendations } from "@/lib/queries";
import { BarList } from "@/components/charts";
import { Plate, CardTitle, PageHeader, PlateLabel } from "@/components/ui";
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
        plate="Plate I"
        label="Talent and Skill Analytics"
        title={<>What the market <em>pays for</em>.</>}
        lede="Which skills carry a salary premium, which are becoming critical, and what that means for curriculum and hiring strategy."
      />

      <PlateLabel plate="Plate II" label="The value of a skill" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Plate className="p-6">
          <CardTitle title="Salary premium by skill" hint="vs overall median, latest cycle" />
          <BarList data={premiumData} unit="%" format={(n) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(1)}`} />
          <p className="mt-5 border-t border-hair-soft pt-4 text-[0.86rem] leading-relaxed text-muted">
            System design, machine learning and deep learning carry the clearest premium.
            These are the skills that move a candidate up the CTC distribution.
          </p>
        </Plate>
        <Plate className="p-6">
          <CardTitle title="Most in demand" hint="share of placed students" />
          <BarList data={demandData} unit="%" format={(n) => n.toFixed(1)} tone="ink" />
        </Plate>
      </div>

      <PlateLabel plate="Plate III" label="Where demand is heading" />
      <Plate className="p-6">
        <CardTitle title="Rising skill demand" hint={`share change in points, ${firstCycle} to ${lastCycle}`} />
        <BarList data={growth} unit=" pts" format={(n) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(1)}`} />
        <p className="mt-5 border-t border-hair-soft pt-4 text-[0.86rem] leading-relaxed text-muted">
          Cloud and machine-learning skills appear in a growing share of offers each cycle,
          signalling where pre-placement training should concentrate.
        </p>
      </Plate>

      {skillRec && (
        <>
          <PlateLabel plate="Plate IV" label="What this implies" />
          <RecommendationCard rec={skillRec} />
        </>
      )}
    </>
  );
}
