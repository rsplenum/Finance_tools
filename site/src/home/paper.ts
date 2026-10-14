/**
 * A story's scratch paper on home (AG3, D-UX-73, D-UX-74; docs/design-reference/finsight.md, "Where it goes next"): one
 * sheet per story, ruled, its double margin rule in red, the steps numbered (1) to (5) in the margin. Each line writes
 * itself once as it comes into view and stays written (site/src/home/home.ts). The words and figures are the engine's,
 * worked out when the page is built; the paper only sets them in a statement's marks: a deduction in brackets, a single
 * rule over a subtotal, a double rule under the total.
 */
export interface PaperLine {
  /** The words on the left. */
  label?: string;
  /** The amount in the right-hand column, as the engine wrote it. */
  value?: string;
  /** `less`: in brackets; `sub`: a single rule over it; `total`: a single rule over it and a double one under it, set
   *  large; `text`: a sentence across the line; `years`: a row of years, each with its figure. */
  kind?: 'less' | 'sub' | 'total' | 'text' | 'years';
  /** Count: the figure runs from this one to `value` once its line is written. */
  from?: string;
  /** Tick: the marigold highlighter across the figure, once counted (it clears its line). */
  tick?: boolean;
  years?: { fy: string; value: string }[];
}
export interface PaperStep { head: string; lines: PaperLine[] }
export interface Paper {
  /** The tab's name and the paper's id. */
  id: string; tab: string;
  /** The case's name in caps, and the line under it. */
  kicker: string; title: string;
  steps: PaperStep[];
  /** Where to try it with one's own figures. */
  go: { href: string; text: string };
}

/** The engine's lines of one year of a statement, as a paper's lines: lines with nothing in that year left out, a line
 *  said twice kept once, deductions in brackets, the subtotals and the total ruled. */
export function workedYear(lines: { id?: string; label: string; values: string[] }[], i: number, subs: string[], total: string): PaperLine[] {
  const out: PaperLine[] = [], said = new Set<string>();
  for (const l of lines) {
    const v = l.values[i];
    if (v === undefined || v === '' || (/^(Less|Add):/.test(l.label) && /^[0.,\s]+$/.test(v)) || said.has(l.label)) continue;
    said.add(l.label);
    const less = l.label.startsWith('Less:');
    out.push({ label: l.label, value: v, kind: l.id === total ? 'total' : subs.includes(l.id || l.label) ? 'sub' : less ? 'less' : undefined });
  }
  return out;
}
