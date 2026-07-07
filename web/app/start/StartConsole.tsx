"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Plate } from "@/components/ui";

const DOMAINS = [
  { key: "placement", label: "Placement Intelligence", status: "Live", note: "Hiring, salary, skills, university comparisons." },
  { key: "hr", label: "HR Analytics", status: "Preview", note: "Recruitment, promotions, attrition." },
  { key: "retail", label: "Retail Analytics", status: "Preview", note: "Sales, revenue, inventory." },
  { key: "finance", label: "Finance", status: "Preview", note: "Profitability, cost drivers, allocation." },
  { key: "customer", label: "Customer Analytics", status: "Preview", note: "Churn, segmentation, retention." },
];

// The friendly schema Athena's placement engine expects from an uploaded file.
const REQUIRED = ["student_id", "university", "tier", "region", "cgpa_band", "prior_internship", "channel", "sector", "role", "is_placed", "ctc_lpa"];

type Report = { rows: number; matched: string[]; missing: string[]; extra: string[]; preview: string[][]; header: string[] };

function parseCsv(text: string): { header: string[]; rows: string[][] } {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const split = (l: string) => l.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
  const header = lines.length ? split(lines[0]).map((h) => h.toLowerCase()) : [];
  const rows = lines.slice(1).map(split);
  return { header, rows };
}

export function StartConsole() {
  const [domain, setDomain] = useState("placement");
  const [report, setReport] = useState<Report | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const { header, rows } = parseCsv(String(reader.result));
      const matched = REQUIRED.filter((c) => header.includes(c));
      const missing = REQUIRED.filter((c) => !header.includes(c));
      const extra = header.filter((c) => !REQUIRED.includes(c));
      setReport({ rows: rows.length, matched, missing, extra, preview: rows.slice(0, 4), header });
    };
    reader.readAsText(file);
  }

  const valid = report && report.missing.length === 0;

  return (
    <div className="flex flex-col gap-6">
      {/* domain selection */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {DOMAINS.map((d) => {
          const active = domain === d.key;
          const live = d.status === "Live";
          return (
            <button key={d.key} onClick={() => live && setDomain(d.key)} disabled={!live}
              className="plate p-5 text-left disabled:cursor-not-allowed disabled:opacity-55"
              style={{ borderColor: active ? "var(--color-ink)" : undefined }}>
              <div className="flex items-center justify-between">
                <span className="font-serif text-[1.1rem] font-medium text-ink" style={{ fontFamily: "var(--font-serif)" }}>
                  {d.label}
                </span>
                <span className={`stamp ${live ? "green" : "grey"}`}>{d.status}</span>
              </div>
              <p className="mt-2 text-[0.82rem] leading-relaxed text-muted">{d.note}</p>
            </button>
          );
        })}
      </div>

      {/* dataset choice */}
      <Plate className="p-6">
        <div className="mb-4 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ink">Choose a dataset</div>
        <div className="flex flex-wrap gap-3">
          <Link href="/" className="gbtn">Use the demo dataset</Link>
          <button onClick={() => fileRef.current?.click()} className="gbtn">Upload a CSV</button>
          <input ref={fileRef} type="file" accept=".csv" onChange={onFile} className="hidden" />
        </div>
        <p className="mt-4 text-[0.78rem] leading-relaxed text-muted">
          The demo dataset runs the full pipeline immediately. An uploaded file is validated
          here against the expected schema, then analysed through the orchestration API.
        </p>
      </Plate>

      {/* validation report */}
      {report && (
        <Plate className="p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className={`stamp ${valid ? "green" : "red"}`}>{valid ? "Schema valid" : "Schema incomplete"}</span>
            <span className="text-[0.64rem] uppercase tracking-[0.1em] text-muted tabular">
              {report.rows} rows · {report.matched.length} of {REQUIRED.length} required columns
            </span>
          </div>

          {report.missing.length > 0 && (
            <p className="mb-4 text-[0.86rem] leading-relaxed text-muted">
              Missing required columns: <span className="text-ink tabular">{report.missing.join(", ")}</span>.
              Add these and re-upload.
            </p>
          )}

          <div className="overflow-x-auto border border-hair">
            <table className="w-full text-[0.78rem] tabular">
              <thead>
                <tr>{report.header.map((h) => (
                  <th key={h} className="border-b border-hair px-3 py-2 text-left font-semibold uppercase tracking-[0.06em] text-muted whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {report.preview.map((row, i) => (
                  <tr key={i}>{row.map((c, j) => (
                    <td key={j} className="border-b border-hair-soft px-3 py-1.5 text-ink whitespace-nowrap">{c}</td>
                  ))}</tr>
                ))}
              </tbody>
            </table>
          </div>

          {valid && (
            <p className="mt-4 text-[0.82rem] leading-relaxed text-muted">
              Ready. Send this file to the orchestration API with
              <span className="text-ink"> POST /build</span> to load and analyse it, then the
              dashboard reflects your data.
            </p>
          )}
        </Plate>
      )}
    </div>
  );
}
