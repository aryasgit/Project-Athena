/**
 * Natural-language decision engine (TypeScript, runs inside Next.js).
 *
 * Same law as the Python version: retrieve structured evidence FIRST, then let
 * the AI reason over it and cite figures. With no AI provider it answers
 * deterministically from the retrieved evidence. Reads through the query layer,
 * so it works against Postgres or the static snapshot.
 */

import "server-only";
import { getKpis, getRanking, getForecast, getRecommendations } from "./queries";
import { generate, isConfigured, providerLabel } from "./ai/provider";
import { PERSONAS, PersonaKey } from "./ai/personas";

export type NlAnswer = {
  question: string;
  answer: string;
  citations: string[];
  evidence: Record<string, unknown>;
  provenance: { engine: "deterministic" | "ai-enhanced"; provider: string; persona: string };
};

const has = (q: string, words: string[]) => words.some((w) => q.includes(w));

async function retrieve(q: string) {
  const lower = q.toLowerCase();
  const kpis = await getKpis();
  const rate = kpis.find((k) => k.metric_key === "placement_rate");
  const ctc = kpis.find((k) => k.metric_key === "median_ctc");

  const evidence: Record<string, unknown> = {
    headline: {
      placement_rate: rate?.value, placement_rate_delta: rate?.delta,
      median_ctc: ctc?.value, median_ctc_delta: ctc?.delta,
    },
  };
  const citations: string[] = [];
  if (rate) citations.push(`Placement rate ${rate.value.toFixed(1)}% (${(rate.delta ?? 0) >= 0 ? "+" : ""}${(rate.delta ?? 0).toFixed(1)} pts vs prior cycle).`);
  if (ctc) citations.push(`Median CTC ₹${ctc.value.toFixed(1)} LPA (${(ctc.delta ?? 0) >= 0 ? "+" : ""}${(ctc.delta ?? 0).toFixed(1)} LPA vs prior cycle).`);

  if (has(lower, ["region", "underperform", "where", "geograph"])) {
    const region = await getRanking("region_placement_rate");
    if (region.length) {
      evidence.regions = region;
      citations.push(`${region[0].entity} is the weakest region at ${region[0].metric.toFixed(1)}% placement.`);
    }
  }
  if (has(lower, ["skill", "premium", "critical", "demand", "pay"])) {
    const prem = await getRanking("skill_salary_premium");
    if (prem.length) {
      evidence.skill_premium = prem.slice(0, 5);
      citations.push(`Top skill premium: ${prem[0].entity} at ${prem[0].metric >= 0 ? "+" : ""}${prem[0].metric.toFixed(1)}% over median.`);
    }
  }
  if (has(lower, ["channel", "source", "hire", "recruit"])) {
    const ch = await getRanking("channel_effectiveness");
    if (ch.length) {
      evidence.channels = ch;
      citations.push(`${ch[0].entity} is the highest-yield channel at ${ch[0].metric.toFixed(1)}%.`);
    }
  }
  if (has(lower, ["ctc", "salary", "forecast", "next", "future", "project"])) {
    const fc = await getForecast("median_ctc_cycle");
    const proj = fc.find((p) => p.is_forecast);
    if (proj) {
      evidence.ctc_forecast_next = proj.yhat;
      citations.push(`Median CTC projected to ₹${proj.yhat.toFixed(1)} LPA next cycle.`);
    }
  }
  if (has(lower, ["sector", "revenue", "decline", "fall", "fell", "drop", "held back", "it services"])) {
    const recs = await getRecommendations();
    const it = recs.find((r) => /IT Services/.test(r.title) || /IT Services/.test(r.observation));
    if (it) {
      evidence.declining_sector = { title: it.title, observation: it.observation };
      citations.push(it.observation);
    }
  }
  if (has(lower, ["invest", "budget", "allocate", "should we", "priorit"])) {
    const recs = await getRecommendations();
    evidence.recommendations = recs.slice(0, 4).map((r) => ({
      title: r.title, action: r.recommended_action, priority: r.priority,
    }));
  }

  return { evidence, citations };
}

export async function answer(question: string, persona: PersonaKey = "executive"): Promise<NlAnswer> {
  const { evidence, citations } = await retrieve(question);

  if (isConfigured()) {
    const prompt =
      `Question: "${question}"\n\n` +
      "Answer the question using ONLY the evidence below. Cite the figures you use. " +
      "If the evidence does not answer it, say so plainly. " +
      "Keep it tight: one short paragraph, then if there are actions put each on its own " +
      "line starting with '- '. Use **bold** only for a few key terms.\n\nEVIDENCE:\n" +
      JSON.stringify(evidence, null, 2);
    const text = await generate({ system: PERSONAS[persona].system, prompt, temperature: 0.3 });
    if (text) {
      return {
        question, answer: text, citations, evidence,
        provenance: { engine: "ai-enhanced", provider: providerLabel(), persona },
      };
    }
  }

  const body = citations.length ? citations.join(" ") : "No structured evidence matched this question.";
  return {
    question, answer: `Based on the placement analytics: ${body}`, citations, evidence,
    provenance: { engine: "deterministic", provider: providerLabel(), persona },
  };
}
