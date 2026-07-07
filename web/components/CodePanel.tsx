/** A decision_filter.py-style editor window: the decision rule as pseudo-code.
 *  The one place the full syntax palette is allowed to show. */

const K = "text-kw";   // keyword pink
const F = "text-fn";   // function blue
const S = "text-str";  // string green
const N = "text-num";  // number orange
const C = "text-faint"; // comment grey

type Tok = { t: string; c?: string };
const LINES: Tok[][] = [
  [{ t: "# every candidate action passes through one rule", c: C }],
  [{ t: "def ", c: K }, { t: "recommend", c: F }, { t: "(action, evidence):" }],
  [{ t: "    ev ", c: "" }, { t: "= ", c: K }, { t: "expected_value", c: F }, { t: "(action, evidence)" }],
  [{ t: "    if ", c: K }, { t: "ev.delta " }, { t: "<= ", c: K }, { t: "0", c: N }, { t: ":" }],
  [{ t: "        return ", c: K }, { t: "hold", c: F }, { t: "()          " }, { t: "# do no harm", c: C }],
  [{ t: "    if ", c: K }, { t: "ev.confidence " }, { t: "< ", c: K }, { t: "0.6", c: N }, { t: ":" }],
  [{ t: "        return ", c: K }, { t: "watch", c: F }, { t: "(action)   " }, { t: "# not yet", c: C }],
  [{ t: "    return ", c: K }, { t: "act", c: F }, { t: "(action, ", c: "" }, { t: '"pursue"', c: S }, { t: ")" }],
];

export function CodePanel() {
  return (
    <div className="overflow-hidden border border-hair bg-ide">
      <div className="flex items-center justify-between border-b border-hair px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-line-2" />
          <span className="h-2.5 w-2.5 rounded-full bg-line-2" />
          <span className="h-2.5 w-2.5 rounded-full bg-line-2" />
        </div>
        <span className="font-mono text-[0.64rem] text-muted">decision_filter.py</span>
        <span className="font-mono text-[0.58rem] text-faint">PY</span>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[0.76rem] leading-[1.7]">
        <code>
          {LINES.map((line, i) => (
            <div key={i} className="flex">
              <span className="mr-4 w-4 shrink-0 select-none text-right text-faint">{i + 1}</span>
              <span className="text-ink-2">
                {line.map((tok, j) => (
                  <span key={j} className={tok.c ?? "text-ink-2"}>{tok.t}</span>
                ))}
              </span>
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
}
