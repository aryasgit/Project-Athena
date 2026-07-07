/**
 * Executive Brief generator (Layer 4).
 *
 * Deterministic first: it assembles a complete, board-ready brief purely from
 * the structured analytical output, so it works with every AI provider off. If
 * a provider IS configured, the AI layer is handed that same structured
 * evidence and asked to rewrite the narrative sections. The recommendations and
 * every number always come from the deterministic layer, never the model.
 */

import "server-only";
import {
  getKpis, getRanking, getRecommendations, getForecast, getScenarioBaseline,
  type Kpi, type Recommendation,
} from "./queries";
import { generate, isConfigured, providerLabel } from "./ai/provider";
import { PERSONAS } from "./ai/personas";

export type ExecutiveBrief = {
  provenance: { engine: "deterministic" | "ai-enhanced"; provider: string };
  cycle: string;
  summary: string;
  insights: string[];
  risks: string[];
  recommendations: { title: string; action: string; priority: string; domain: string }[];
  nextActions: string[];
  evidence: Record<string, unknown>;
};

const byKey = (kpis: Kpi[], key: string) => kpis.find((k) => k.metric_key === key);
const fmtDelta = (d: number | null, unit = "") =>
  d == null ? "" : `${d >= 0 ? "up" : "down"} ${Math.abs(d).toFixed(1)}${unit}`;

export async function buildExecutiveBrief(): Promise<ExecutiveBrief> {
  const [kpis, recs, skillPrem, region, channel, ctcForecast, topList] = await Promise.all([
    getKpis(),
    getRecommendations(),
    getRanking("skill_salary_premium"),
    getRanking("region_placement_rate"),
    getRanking("channel_effectiveness"),
    getForecast("median_ctc_cycle"),
    getRanking("most_demanded_skills"),
  ]);

  const cycle = kpis[0]?.context?.replace(/^(Cycle|FY)\s*/i, "") ?? "the latest period";
  const projected = ctcForecast.find((p) => p.is_forecast);
  const topSkill = skillPrem[0];
  const topItem = topList[0];
  const bestChannel = channel[0];
  const weakRegion = region[0];
  const moneyUnit = kpis.find((k) => k.unit === "LPA" || k.unit === "Cr")?.unit ?? "";

  const fmtKpi = (k?: Kpi | null) => {
    if (!k) return "";
    if (k.unit === "%") return `${k.value.toFixed(1)}%`;
    if (k.unit === "LPA") return `₹${k.value.toFixed(1)} LPA`;
    if (k.unit === "Cr") return `₹${k.value.toFixed(0)} Cr`;
    return k.value.toLocaleString("en-IN", { maximumFractionDigits: 0 });
  };

  // --- deterministic narrative (module-agnostic) ---------------------------
  const kpiSentence = kpis.slice(0, 3).map((k) =>
    `${k.label.toLowerCase()} at ${fmtKpi(k)}` +
    (k.delta != null ? ` (${fmtDelta(k.delta, k.unit === "%" ? " points" : k.unit ? ` ${k.unit}` : "")})` : "")
  ).join(", ");
  const summary =
    `For ${cycle}, the headline position is ${kpiSentence}. ` +
    (projected ? `The trajectory projects to ₹${projected.yhat.toFixed(0)} ${moneyUnit} next period.` : "");

  const insights = [
    topSkill && `${topSkill.entity} carries the clearest premium at ${topSkill.metric >= 0 ? "+" : ""}${topSkill.metric.toFixed(1)}%, marking where value concentrates.`,
    !topSkill && topItem && `${topItem.entity} is the single largest line in the book.`,
    bestChannel && `${bestChannel.entity} leads the channel mix at ${bestChannel.metric.toFixed(1)}%.`,
    weakRegion && `${weakRegion.entity} is the weakest region at ${weakRegion.metric.toFixed(1)}%, below every other region.`,
  ].filter(Boolean) as string[];

  const highRisks = recs.filter((r) => r.priority === "High");
  const risks = [
    ...highRisks.map((r) => r.observation),
    weakRegion && `${weakRegion.entity} runs materially below the other regions and concentrates downside risk.`,
  ].filter(Boolean).slice(0, 4) as string[];

  const recommendations = recs.slice(0, 5).map((r: Recommendation) => ({
    title: r.title, action: r.recommended_action, priority: r.priority, domain: r.domain,
  }));

  const nextActions = recs
    .filter((r) => r.priority === "High")
    .map((r) => firstSentence(r.recommended_action))
    .slice(0, 4);

  const evidence = {
    period: cycle,
    kpis: kpis.map((k) => ({ label: k.label, value: k.value, unit: k.unit, delta: k.delta })),
    projected_next: projected && { value: projected.yhat, unit: moneyUnit },
    top_ranked_item: topItem && { name: topItem.entity, metric: topItem.metric },
    top_skill_premium: topSkill && { skill: topSkill.entity, premium_pct: topSkill.metric },
    best_channel: bestChannel && { channel: bestChannel.entity, metric: bestChannel.metric },
    weak_region: weakRegion && { region: weakRegion.entity, metric: weakRegion.metric },
    recommendations: recs.map((r) => ({ title: r.title, priority: r.priority, domain: r.domain })),
  };

  const brief: ExecutiveBrief = {
    provenance: { engine: "deterministic", provider: providerLabel() },
    cycle, summary, insights, risks, recommendations, nextActions, evidence,
  };

  // --- optional AI enhancement of the narrative ----------------------------
  if (isConfigured()) {
    const enhanced = await enhance(evidence);
    if (enhanced) {
      brief.summary = enhanced.summary || brief.summary;
      if (enhanced.insights?.length) brief.insights = enhanced.insights;
      if (enhanced.risks?.length) brief.risks = enhanced.risks;
      if (enhanced.nextActions?.length) brief.nextActions = enhanced.nextActions;
      brief.provenance.engine = "ai-enhanced";
    }
  }

  return brief;
}

async function enhance(evidence: Record<string, unknown>) {
  const prompt =
    `Here is the structured analytical output for a placement-intelligence cycle. ` +
    `Write an executive brief strictly from this evidence. Respond with ONLY valid JSON of the shape ` +
    `{"summary": string, "insights": string[], "risks": string[], "nextActions": string[]}. ` +
    `Keep summary to 3 sentences, and 3 to 5 items per list.\n\nEVIDENCE:\n${JSON.stringify(evidence, null, 2)}`;
  const raw = await generate({ system: PERSONAS.report_writer.system, prompt, temperature: 0.2 });
  if (!raw) return null;
  try {
    const json = JSON.parse(raw.replace(/^```json\s*/i, "").replace(/```$/, "").trim());
    return json as { summary?: string; insights?: string[]; risks?: string[]; nextActions?: string[] };
  } catch {
    return null;
  }
}

function firstSentence(text: string): string {
  const m = text.match(/^[^.]+\./);
  return (m ? m[0] : text).trim();
}
