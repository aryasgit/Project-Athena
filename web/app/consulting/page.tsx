import { getKpis, getRanking, getRecommendations } from "@/lib/queries";
import { PageHeader, PlateLabel } from "@/components/ui";
import { GuidedMode } from "./GuidedMode";

export const dynamic = "force-dynamic";

export default async function ConsultingPage() {
  const [kpis, regions, skills, channels, recs] = await Promise.all([
    getKpis(),
    getRanking("region_placement_rate"),
    getRanking("skill_salary_premium"),
    getRanking("channel_effectiveness"),
    getRecommendations(),
  ]);

  return (
    <>
      <PageHeader
        plate="Plate I"
        label="Guided Consulting Mode"
        title={<>Think it through, <em>step by step</em>.</>}
        lede="A structured walkthrough of how a consultant reads this business: understand the position, diagnose where the problem sits, segment the drivers, then decide. Each step is backed by the live analysis."
      />
      <PlateLabel plate="Plate II" label="The engagement" />
      <GuidedMode
        kpis={kpis}
        regions={regions}
        skills={skills.slice(0, 6)}
        channels={channels}
        topRec={recs[0] ?? null}
        weakRegion={regions[0]?.entity ?? ""}
      />
    </>
  );
}
