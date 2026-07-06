import Link from "next/link";
import {
  getKpis, getSeries, getRanking, getForecast, getRecommendations,
} from "@/lib/queries";
import { KpiCard } from "@/components/KpiCard";
import { RecommendationCard } from "@/components/RecommendationCard";
import { LineChart, ForecastChart, BarList } from "@/components/charts";
import { Card, CardTitle, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

const shortYear = (iso: string) => `'${iso.slice(2, 4)}`;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default async function ExecutivePage() {
  const [kpis, rateByCycle, ctcByCycle, sectorCycle, tier, region, channels, ctcForecast, volForecast, recs] =
    await Promise.all([
      getKpis(),
      getSeries("placement_rate_by_cycle"),
      getSeries("median_ctc_by_cycle"),
      getSeries("median_ctc_by_sector_cycle"),
      getSeries("placement_rate_by_tier"),
      getRanking("region_placement_rate"),
      getRanking("channel_effectiveness"),
      getForecast("median_ctc_cycle"),
      getForecast("placements_monthly"),
      getRecommendations(),
    ]);

  const rateData = rateByCycle.map((p) => ({ label: p.dimension ?? "", value: p.value }));
  const ctcData = ctcByCycle.map((p) => ({ label: p.dimension ?? "", value: p.value }));

  // Sector momentum: change in median CTC from first to latest cycle.
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
    label: shortYear(p.period), value: p.yhat, lower: p.yhat_lower, upper: p.yhat_upper,
    forecast: p.is_forecast,
  }));

  const volFc = volForecast.map((p, i) => {
    const d = new Date(p.period);
    const label = i % 4 === 0 ? `${MONTHS[d.getUTCMonth()]} '${String(d.getUTCFullYear()).slice(2)}` : "";
    return { label, value: p.yhat, lower: p.yhat_lower, upper: p.yhat_upper, forecast: p.is_forecast };
  });

  const tierData = tier.map((p) => ({ label: p.dimension ?? "", value: p.value }))
    .sort((a, b) => b.value - a.value);
  const regionData = region.map((r) => ({ label: r.entity, value: r.metric }));
  const channelData = channels.map((c) => ({ label: c.entity, value: c.metric }));

  return (
    <>
      <PageHeader
        eyebrow="Enterprise Decision Intelligence"
        title="Executive Overview"
        subtitle="Placement Intelligence for the 2024-25 cycle — headline outcomes, forward projections, and the decisions they point to."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {kpis.map((k) => <KpiCard key={k.metric_key} kpi={k} />)}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle title="Median CTC trajectory" hint="actuals + next-cycle projection" />
          <ForecastChart data={ctcFc} unit=" LPA" format={(n) => `₹${n.toFixed(0)}`} />
        </Card>
        <Card>
          <CardTitle title="Placement volume outlook" hint="monthly, Holt projection" />
          <ForecastChart data={volFc} format={(n) => n.toFixed(0)} />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle title="Placement rate by cycle" hint="% of eligible students placed" />
          <LineChart data={rateData} unit="%" format={(n) => n.toFixed(0)} />
        </Card>
        <Card>
          <CardTitle title="Sector salary momentum" hint={`median CTC change, ${firstCycle} → ${lastCycle}`} />
          <BarList data={sectorMomentum} unit="%" format={(n) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}`}
            accent="var(--color-accent)" />
          <p className="mt-4 text-[12.5px] leading-relaxed text-ink-muted">
            IT Services is the only sector with declining pay while holding the largest hiring
            share — a structural drag on the headline median.
          </p>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardTitle title="Placement rate by tier" />
          <BarList data={tierData} unit="%" format={(n) => n.toFixed(1)} />
        </Card>
        <Card>
          <CardTitle title="Regional performance" hint="placement rate" />
          <BarList data={regionData} unit="%" format={(n) => n.toFixed(1)} />
        </Card>
        <Card>
          <CardTitle title="Hiring channel yield" hint="placement rate" />
          <BarList data={channelData} unit="%" format={(n) => n.toFixed(1)} />
        </Card>
      </div>

      <div className="mt-8 mb-4 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Priority recommendations</h2>
        <Link href="/recommendations" className="text-[13px] font-medium text-accent hover:underline">
          Open Decision Center →
        </Link>
      </div>
      <div className="grid gap-4">
        {recs.slice(0, 2).map((r) => <RecommendationCard key={r.recommendation_key} rec={r} />)}
      </div>
    </>
  );
}
