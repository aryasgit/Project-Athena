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
  const [kpis, recs, skillPrem, region, channel, ctcForecast, baseline] = await Promise.all([
    getKpis(),
    getRecommendations(),
    getRanking("skill_salary_premium"),
    getRanking("region_placement_rate"),
    getRanking("channel_effectiveness"),
    getForecast("median_ctc_cycle"),
    getScenarioBaseline(),
  ]);

  const rate = byKey(kpis, "placement_rate");
  const ctc = byKey(kpis, "median_ctc");
  const placed = byKey(kpis, "total_placements");
  const topSector = byKey(kpis, "top_sector_hiring");
  const cycle = rate?.context?.replace("Cycle ", "") ?? "latest";
  const projected = ctcForecast.find((p) => p.is_forecast);
  const topSkill = skillPrem[0];
  const bestChannel = channel[0];
  const weakRegion = region[0];

  // --- deterministic narrative ---------------------------------------------
  const summary =
    `In the ${cycle} cycle, ${placed ? Math.round(placed.value).toLocaleString("en-IN") : "the"} students were placed at a ` +
    `${rate ? rate.value.toFixed(1) : ""}% placement rate (${fmtDelta(rate?.delta ?? null, " points")} on the prior cycle), ` +
    `with a median CTC of ₹${ctc ? ctc.value.toFixed(1) : ""} LPA (${fmtDelta(ctc?.delta ?? null, " LPA")}). ` +
    (topSector ? `${topSector.context} is the largest recruiting sector. ` : "") +
    (projected ? `The salary trajectory projects to ₹${projected.yhat.toFixed(1)} LPA next cycle.` : "");

  const insights = [
    topSkill && `${topSkill.entity} carries the clearest salary premium at ${topSkill.metric >= 0 ? "+" : ""}${topSkill.metric.toFixed(1)}% over the median, marking where pay is concentrating.`,
    bestChannel && `${bestChannel.entity} is the highest-yield hiring channel at a ${bestChannel.metric.toFixed(1)}% placement rate.`,
    weakRegion && `${weakRegion.entity} is the weakest region at ${weakRegion.metric.toFixed(1)}%, below the ${rate ? rate.value.toFixed(1) : ""}% institution average.`,
    ctc?.delta != null && `Median CTC moved ${fmtDelta(ctc.delta, " LPA")} year on year, ${ctc.delta >= 0 ? "a real gain" : "a decline to watch"}.`,
  ].filter(Boolean) as string[];

  const highRisks = recs.filter((r) => r.priority === "High");
  const risks = [
    ...highRisks.map((r) => r.observation),
    weakRegion && `Placement is concentrated away from ${weakRegion.entity}, leaving that region's students and employer relationships exposed.`,
  ].filter(Boolean).slice(0, 4) as string[];

  const recommendations = recs.slice(0, 5).map((r: Recommendation) => ({
    title: r.title, action: r.recommended_action, priority: r.priority, domain: r.domain,
  }));

  const nextActions = recs
    .filter((r) => r.priority === "High")
    .map((r) => firstSentence(r.recommended_action))
    .slice(0, 4);

  const evidence = {
    cycle, placement_rate: rate?.value, placement_rate_delta: rate?.delta,
    median_ctc: ctc?.value, median_ctc_delta: ctc?.delta, students_placed: placed?.value,
    top_sector: topSector?.context, projected_next_ctc: projected?.yhat,
    top_skill_premium: topSkill && { skill: topSkill.entity, premium_pct: topSkill.metric },
    best_channel: bestChannel && { channel: bestChannel.entity, rate: bestChannel.metric },
    weak_region: weakRegion && { region: weakRegion.entity, rate: weakRegion.metric },
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
