import { Fragment, ReactNode } from "react";

/**
 * Minimal, dependency-free markdown renderer for AI-generated prose.
 * Handles paragraphs, bullet and numbered lists, and inline **bold**.
 * Inherits type styles from the parent, so it works in any theme.
 */

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(<Fragment key={i++}>{text.slice(last, m.index)}</Fragment>);
    out.push(<strong key={i++} className="font-semibold text-ink">{m[1]}</strong>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(<Fragment key={i++}>{text.slice(last)}</Fragment>);
  return out;
}

const LIST_RE = /^\s*(?:[-*•]|\d+[.)])\s+(.*)$/;

export function Markdown({ text, className = "" }: { text: string; className?: string }) {
  // Normalise: many models pack list items into one line. Break them out.
  const normalised = text
    .replace(/\s+(\d+[.)])\s+/g, "\n$1 ")
    .replace(/\s+([-*•])\s+/g, "\n$1 ");
  const lines = normalised.split("\n").map((l) => l.trim()).filter(Boolean);

  const blocks: ReactNode[] = [];
  let list: string[] | null = null;
  let key = 0;

  const flush = () => {
    if (list) {
      blocks.push(
        <ul key={key++} className="flex flex-col gap-1.5 pl-1">
          {list.map((it, i) => (
            <li key={i} className="grid grid-cols-[14px_1fr] gap-2">
              <span aria-hidden className="pt-[8px]">
                <span className="block h-[5px] w-[5px] rotate-45 bg-crimson" />
              </span>
              <span>{inline(it)}</span>
            </li>
          ))}
        </ul>,
      );
      list = null;
    }
  };

  for (const line of lines) {
    const li = line.match(LIST_RE);
    if (li) {
      (list ??= []).push(li[1]);
    } else {
      flush();
      blocks.push(<p key={key++}>{inline(line)}</p>);
    }
  }
  flush();

  return <div className={`flex flex-col gap-3 ${className}`}>{blocks}</div>;
}
