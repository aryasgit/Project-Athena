import Link from "next/link";
import {
  getKpis, getSeries, getRanking, getForecast, getRecommendations,
} from "@/lib/queries";
import { Figures } from "@/components/KpiCard";
import { RecommendationCard } from "@/components/RecommendationCard";
import { LineChart, ForecastChart, BarList } from "@/components/charts";
import { Plate, CardTitle, PageHeader, PlateLabel } from "@/components/ui";

export const dynamic = "force-dynamic";

const shortYear = (iso: string) => `'${iso.slice(2, 4)}`;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default async function ExecutivePage() {
  const [kpis, rateByCycle, sectorCycle, tier, region, channels, ctcForecast, volForecast, recs] =
    await Promise.all([
      getKpis(),
      getSeries("placement_rate_by_cycle"),
      getSeries("median_ctc_by_sector_cycle"),
      getSeries("placement_rate_by_tier"),
      getRanking("region_placement_rate"),
      getRanking("channel_effectiveness"),
      getForecast("median_ctc_cycle"),
      getForecast("placements_monthly"),
      getRecommendations(),
    ]);

  const rateData = rateByCycle.map((p) => ({ label: p.dimension ?? "", value: p.value }));

  const bySector = new Map<string, { first: number; last: number }>();
  const cycles = [...new Set(sectorCycle.map((p) => (p.dimension ?? "|").split("|")[1]))].sort();
  const firstCycle = cycles[0], lastCycle = cycles[cycles.length - 1];
  for (const p of sectorCycle) {
    const [sector, cycle] = (p.dimension ?? "|").split("|");
    const cur = bySector.get(sector) ?? { first: 0, last: 0 };
    if (cycle === firstCycle) cur.first = p.value;
    if (cycle === lastCycle) cur.last = p.value;
    bySector.set(sector, cur);
  }
  const sectorMomentum = [...bySector.entries()]
    .map(([sector, v]) => ({ label: sector, value: v.first ? ((v.last - v.first) / v.first) * 100 : 0 }))
    .sort((a, b) => a.value - b.value);

  const ctcFc = ctcForecast.map((p) => ({
    label: shortYear(p.period), value: p.yhat, lower: p.yhat_lower, upper: p.yhat_upper, forecast: p.is_forecast,
  }));
  const volFc = volForecast.map((p, i) => {
    const d = new Date(p.period);
    const label = i % 4 === 0 ? `${MONTHS[d.getUTCMonth()]} '${String(d.getUTCFullYear()).slice(2)}` : "";
    return { label, value: p.yhat, lower: p.yhat_lower, upper: p.yhat_upper, forecast: p.is_forecast };
  });

  const tierData = tier.map((p) => ({ label: p.dimension ?? "", value: p.value })).sort((a, b) => b.value - a.value);
  const regionData = region.map((r) => ({ label: r.entity, value: r.metric }));
  const channelData = channels.map((c) => ({ label: c.entity, value: c.metric }));

  return (
    <>
      <PageHeader
        plate="Plate I"
        label="Enterprise Decision Intelligence"
        title={<>The executive <em>reading</em>.</>}
        lede="Placement Intelligence for the 2024 to 2025 cycle. Headline outcomes, forward projections, and the decisions they point to."
      />

      <Figures kpis={kpis} />

      <PlateLabel plate="Plate II" label="Forward projections" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Plate className="p-6">
          <CardTitle title="Median CTC trajectory" hint="actuals to next cycle" />
          <ForecastChart data={ctcFc} unit=" LPA" format={(n) => `₹${n.toFixed(0)}`} />
        </Plate>
        <Plate className="p-6">
          <CardTitle title="Placement volume outlook" hint="monthly, Holt projection" />
          <ForecastChart data={volFc} format={(n) => n.toFixed(0)} />
        </Plate>
      </div>

      <PlateLabel plate="Plate III" label="Where value concentrates" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Plate className="p-6">
          <CardTitle title="Placement rate by cycle" hint="percent of eligible placed" />
          <LineChart data={rateData} unit="%" format={(n) => n.toFixed(0)} />
        </Plate>
        <Plate className="p-6">
          <CardTitle title="Sector salary momentum" hint={`${firstCycle} to ${lastCycle}`} />
          <BarList data={sectorMomentum} unit="%" format={(n) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(1)}`} />
          <p className="mt-5 border-t border-hair-soft pt-4 text-[0.86rem] leading-relaxed text-muted">
            IT Services is the one sector with declining pay while holding the largest hiring
            share, a structural drag on the headline median.
          </p>
        </Plate>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Plate className="p-6">
          <CardTitle title="By university tier" hint="placement rate" />
          <BarList data={tierData} unit="%" format={(n) => n.toFixed(1)} />
        </Plate>
        <Plate className="p-6">
          <CardTitle title="By region" hint="placement rate" />
          <BarList data={regionData} unit="%" format={(n) => n.toFixed(1)} tone="ink" />
        </Plate>
        <Plate className="p-6">
          <CardTitle title="By hiring channel" hint="placement rate" />
          <BarList data={channelData} unit="%" format={(n) => n.toFixed(1)} tone="ink" />
        </Plate>
      </div>

      <PlateLabel plate="Plate IV" label="The decisions that follow" />
      <div className="grid gap-6">
        {recs.slice(0, 2).map((r) => <RecommendationCard key={r.recommendation_key} rec={r} />)}
      </div>
      <div className="mt-6">
        <Link href="/recommendations" className="gbtn">Open the Decision Center</Link>
      </div>
    </>
  );
}
