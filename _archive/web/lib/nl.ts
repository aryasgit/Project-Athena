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

const fmtKpiVal = (unit: string | null, v: number) =>
  unit === "%" ? `${v.toFixed(1)}%` : unit === "LPA" ? `₹${v.toFixed(1)} LPA`
    : unit === "Cr" ? `₹${v.toFixed(0)} Cr` : v.toLocaleString("en-IN", { maximumFractionDigits: 0 });

async function retrieve(q: string) {
  const lower = q.toLowerCase();
  const kpis = await getKpis();

  const evidence: Record<string, unknown> = {
    headline: kpis.map((k) => ({ label: k.label, value: k.value, unit: k.unit, delta: k.delta })),
  };
  const citations: string[] = [];
  for (const k of kpis.slice(0, 3)) {
    const d = k.delta;
    citations.push(`${k.label} ${fmtKpiVal(k.unit, k.value)}${d != null ? ` (${d >= 0 ? "+" : ""}${d.toFixed(1)}${k.unit === "%" ? " pts" : k.unit ? " " + k.unit : ""} vs prior)` : ""}.`);
  }

  if (has(lower, ["region", "underperform", "where", "geograph"])) {
    const region = await getRanking("region_placement_rate");
    if (region.length) {
      evidence.regions = region;
      citations.push(`${region[0].entity} is the weakest region at ${region[0].metric.toFixed(1)}%.`);
    }
  }
  if (has(lower, ["skill", "premium", "critical", "demand", "pay", "product", "segment"])) {
    const prem = await getRanking("skill_salary_premium");
    const top = await getRanking("most_demanded_skills");
    if (prem.length) {
      evidence.skill_premium = prem.slice(0, 5);
      citations.push(`Top premium: ${prem[0].entity} at ${prem[0].metric >= 0 ? "+" : ""}${prem[0].metric.toFixed(1)}%.`);
    }
    if (top.length) {
      evidence.top_items = top.slice(0, 5);
      citations.push(`Largest by value: ${top[0].entity}.`);
    }
  }
  if (has(lower, ["channel", "source", "hire", "recruit"])) {
    const ch = await getRanking("channel_effectiveness");
    if (ch.length) {
      evidence.channels = ch;
      citations.push(`${ch[0].entity} leads the channel mix at ${ch[0].metric.toFixed(1)}%.`);
    }
  }
  if (has(lower, ["ctc", "salary", "revenue", "forecast", "next", "future", "project"])) {
    const fc = await getForecast("median_ctc_cycle");
    const proj = fc.find((p) => p.is_forecast);
    if (proj) {
      evidence.forecast_next = proj.yhat;
      citations.push(`Projected to ${proj.yhat.toFixed(0)} next period.`);
    }
  }
  if (has(lower, ["sector", "segment", "revenue", "decline", "fall", "fell", "drop", "held back", "margin"])) {
    const recs = await getRecommendations();
    const declining = recs.find((r) => /declin|fell|fall|reduce|wind down|sunset|drag|lowest/i.test(r.observation));
    if (declining) {
      evidence.declining_line = { title: declining.title, observation: declining.observation };
      citations.push(declining.observation);
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
