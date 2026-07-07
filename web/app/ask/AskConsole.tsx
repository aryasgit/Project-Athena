"use client";

import { useState } from "react";
import { Plate } from "@/components/ui";
import { Markdown } from "@/components/Markdown";

type Answer = {
  answer?: string;
  citations?: string[];
  provenance?: { engine: string; provider: string; persona: string };
  unavailable?: boolean;
  message?: string;
};

const PERSONAS = [
  { key: "executive", label: "Executive Strategy" },
  { key: "data_analyst", label: "Data Analyst" },
  { key: "forecast_analyst", label: "Forecast Analyst" },
  { key: "risk_analyst", label: "Risk Analyst" },
];

const SUGGESTIONS = [
  "Which region is underperforming and where should we invest?",
  "What is driving the salary premium, and which skills matter most?",
  "Why is the median CTC being held back?",
  "Which hiring channel should we prioritise?",
];

export function AskConsole() {
  const [question, setQuestion] = useState("");
  const [persona, setPersona] = useState("executive");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [loading, setLoading] = useState(false);

  async function ask(q: string) {
    const query = q.trim();
    if (!query) return;
    setQuestion(query);
    setLoading(true);
    setAnswer(null);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: query, persona }),
      });
      setAnswer(await res.json());
    } catch {
      setAnswer({ unavailable: true, message: "Something went wrong reaching the service." });
    } finally {
      setLoading(false);
    }
  }

  const aiOn = answer?.provenance?.engine === "ai-enhanced";

  return (
    <div className="flex flex-col gap-6">
      <Plate className="p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {PERSONAS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPersona(p.key)}
              className="stamp"
              style={{
                borderColor: persona === p.key ? "var(--color-crimson)" : "var(--color-hair)",
                color: persona === p.key ? "var(--color-crimson)" : "var(--color-muted)",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask(question)}
            placeholder="Ask a question about the business..."
            className="flex-1 border border-hair bg-paper px-4 py-3 text-[0.95rem] text-ink outline-none transition-colors focus:border-ink"
          />
          <button onClick={() => ask(question)} disabled={loading} className="gbtn">
            {loading ? "Thinking" : "Ask Athena"}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => ask(s)}
              className="border border-hair-soft px-3 py-1.5 text-[0.74rem] text-muted transition-colors hover:border-ink hover:text-ink">
              {s}
            </button>
          ))}
        </div>
      </Plate>

      {answer && (
        <Plate className="p-6">
          {answer.unavailable ? (
            <p className="text-[0.92rem] leading-relaxed text-muted">{answer.message}</p>
          ) : (
            <>
              <div className="mb-4 flex items-center gap-3">
                <span className={`stamp ${aiOn ? "green" : "grey"}`}>
                  {aiOn ? "AI reasoned" : "Deterministic"}
                </span>
                <span className="text-[0.62rem] uppercase tracking-[0.1em] text-muted">
                  evidence retrieved before answering
                </span>
              </div>
              <div style={{ fontFamily: "var(--font-serif)" }}>
                <Markdown text={answer.answer ?? ""} className="text-[1.16rem] leading-[1.5] text-ink" />
              </div>

              {answer.citations && answer.citations.length > 0 && (
                <div className="mt-5 border-t border-hair-soft pt-4">
                  <div className="mb-2 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-muted">
                    Evidence cited
                  </div>
                  <ul className="flex flex-col gap-2">
                    {answer.citations.map((c, i) => (
                      <li key={i} className="grid grid-cols-[14px_1fr] gap-2.5">
                        <span aria-hidden className="pt-[7px]">
                          <span className="block h-[5px] w-[5px] rotate-45 bg-crimson" />
                        </span>
                        <span className="text-[0.86rem] leading-relaxed text-muted tabular">{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </Plate>
      )}
    </div>
  );
}
