import Link from "next/link";
import {
  getKpis, getSeries, getRanking, getForecast, getRecommendations,
} from "@/lib/queries";
import { getModule } from "@/lib/module";
import { MODULE_META, headerTitle } from "@/lib/moduleMeta";
import { Figures } from "@/components/KpiCard";
import { RecommendationCard } from "@/components/RecommendationCard";
import { LineChart, ForecastChart, BarList } from "@/components/charts";
import { Plate, CardTitle, PageHeader, PlateLabel } from "@/components/ui";
import { Ticker } from "@/components/Ticker";
import { CodePanel } from "@/components/CodePanel";
import { NorthStar } from "@/components/NorthStar";

export const dynamic = "force-dynamic";

const shortYear = (iso: string) => `'${iso.slice(2, 4)}`;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default async function OverviewPage() {
  const module = await getModule();
  const meta = MODULE_META[module];

  const [kpis, lineSeries, momentumSeries, tier, region, channels, primaryFc, volFc, recs] =
    await Promise.all([
      getKpis(),
      getSeries(meta.line.key),
      getSeries("median_ctc_by_sector_cycle"),
      getSeries("placement_rate_by_tier"),
      getRanking("region_placement_rate"),
      getRanking("channel_effectiveness"),
      getForecast(meta.forecastPrimary.key),
      getForecast(meta.forecastVolume.key),
      getRecommendations(),
    ]);

  const lineData = lineSeries.map((p) => ({ label: p.dimension ?? "", value: p.value }));

  const bySeg = new Map<string, { first: number; last: number }>();
  const periods = [...new Set(momentumSeries.map((p) => (p.dimension ?? "|").split("|")[1]))].sort();
  const firstP = periods[0], lastP = periods[periods.length - 1];
  for (const p of momentumSeries) {
    const [seg, per] = (p.dimension ?? "|").split("|");
    const cur = bySeg.get(seg) ?? { first: 0, last: 0 };
    if (per === firstP) cur.first = p.value;
    if (per === lastP) cur.last = p.value;
    bySeg.set(seg, cur);
  }
  const momentum = [...bySeg.entries()]
    .map(([seg, v]) => ({ label: seg, value: v.first ? ((v.last - v.first) / v.first) * 100 : 0 }))
    .sort((a, b) => a.value - b.value);

  const money = (n: number) => `₹${n.toFixed(0)}`;
  const primaryData = primaryFc.map((p) => ({
    label: shortYear(p.period), value: p.yhat, lower: p.yhat_lower, upper: p.yhat_upper, forecast: p.is_forecast,
  }));
  const volData = volFc.map((p, i) => {
    const d = new Date(p.period);
    const label = i % 4 === 0 ? `${MONTHS[d.getUTCMonth()]} '${String(d.getUTCFullYear()).slice(2)}` : "";
    return { label, value: p.yhat, lower: p.yhat_lower, upper: p.yhat_upper, forecast: p.is_forecast };
  });

  const tierData = tier.map((p) => ({ label: p.dimension ?? "", value: p.value })).sort((a, b) => b.value - a.value);
  const regionData = region.map((r) => ({ label: r.entity, value: r.metric }));
  const channelData = channels.map((c) => ({ label: c.entity, value: c.metric }));
  const panelData = [tierData, regionData, channelData];

  const tickerItems = [
    ...momentum.map((m) => m.label.toLowerCase().replace(/\s+/g, ".")),
    ...regionData.map((r) => r.label.toLowerCase()),
    ...channelData.map((c) => c.label.toLowerCase().replace(/\s+/g, ".")),
    "expected.value", "decision.filter", "confidence", "reallocate",
  ];

  return (
    <>
      <PageHeader plate={meta.header.plate} label={meta.header.label}
        title={headerTitle(meta.header)} tail={meta.header.tail} lede={meta.header.lede} />

      <div className="mb-10">
        <Ticker items={tickerItems} />
      </div>

      <Figures kpis={kpis} />

      <PlateLabel plate="02" label="Forward projections" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Plate className="p-6">
          <CardTitle title={meta.forecastPrimary.title} hint={meta.forecastPrimary.hint} />
          <ForecastChart data={primaryData} unit={meta.forecastPrimary.unit} format={money} />
        </Plate>
        <Plate className="p-6">
          <CardTitle title={meta.forecastVolume.title} hint={meta.forecastVolume.hint} />
          <ForecastChart data={volData} format={(n) => n.toFixed(0)} />
        </Plate>
      </div>

      <PlateLabel plate="03" label="Where value concentrates" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Plate className="p-6">
          <CardTitle title={meta.line.title} hint={meta.line.hint} />
          <LineChart data={lineData} unit="%" format={(n) => n.toFixed(0)} />
        </Plate>
        <Plate className="p-6">
          <CardTitle title={meta.momentum.title} hint={meta.momentum.hint} />
          <BarList data={momentum} unit="%" format={(n) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(1)}`} />
          <p className="mt-5 border-t border-hair-soft pt-4 text-[0.84rem] leading-relaxed text-muted">
            {meta.momentum.note}
          </p>
        </Plate>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        {meta.panels.map((panel, i) => (
          <Plate key={panel.key} className="p-6">
            <CardTitle title={panel.title} hint={panel.hint} />
            <BarList data={panelData[i]} unit="%" format={(n) => n.toFixed(1)} tone={panel.tone} />
          </Plate>
        ))}
      </div>

      <NorthStar />

      <PlateLabel plate="04" label="The decisions that follow" />
      <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_1.05fr] lg:items-center">
        <div>
          <p className="max-w-[42ch] text-[0.95rem] leading-relaxed text-muted">
            Athena never stops at a chart. Every finding runs through one decision filter:
            is the expected value positive, is the confidence high enough, is it worth
            pursuing. Only then does it become a recommendation.
          </p>
        </div>
        <CodePanel />
      </div>
      <div className="grid gap-5">
        {recs.slice(0, 2).map((r) => <RecommendationCard key={r.recommendation_key} rec={r} />)}
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link href="/recommendations" className="gbtn">Open the Decision Center</Link>
        {module === "placement" && <Link href="/simulator" className="gbtn">Run a what-if scenario</Link>}
      </div>
    </>
  );
}
