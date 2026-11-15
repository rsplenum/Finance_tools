/**
 * Check and confirm (OR8, the owner's O13), one shape for the tools (UXR5): before the report, what was collected, a
 * group a section with its way back, and the benchmarks it is judged against with the owner's line; the confirm shows
 * the report. Once confirmed it folds to one line that opens to the same list; a change since asks again (`lapsed`).
 * Its figures come from the tool's model, as words; none is worked out here.
 */
import { FILLED, goTo, HINT, Section, STATE, Tick } from './fields';

export interface CheckLine { label: string; value: string }
/** A group: its title, the section or box that changes it (`to`), and its lines. */
export interface CheckGroup { id: string; title: string; to: string; lines: CheckLine[] }
export type CheckState = 'open' | 'lapsed' | 'done';

/** The owner's words (O13). */
export const STANDARD = 'These are standard; a bank’s credit manager, a CA or a DSA may change them.';

// A link to its box: a fold that holds the box opens first.
const toBox = (id: string) => (e: Event) => {
  const el = document.getElementById(id);
  if (el instanceof HTMLDetailsElement) el.open = true;
  goTo(id)(e);
};

/** A group as one compact row (Rahul's review of NEW2, point 7: the long list of cards read as a form to fill again):
 * its title and "Change" on one line, its lines run on as "label: value", wrapped. */
function Row({ pre, id, title, to, lines, note, table, railed }: { pre: string; id: string; title: string; to: string; lines: CheckLine[]; note?: string; table?: boolean; railed?: boolean }) {
  return <li data-testid={`${pre}-confirm-${id}`} class={`py-2.5${railed ? ' lg:hidden' : ''}`}>
    <div class="flex items-baseline justify-between gap-2">
      <h3 class="text-sm font-semibold text-ink">{title}</h3>
      <a href={`#${to}`} onClick={toBox(to)} aria-label={`Change: ${title}`} class="-my-3 inline-flex min-h-11 shrink-0 items-center text-sm text-link underline underline-offset-4">Change</a>
    </div>
    {/* The benchmarks stay a table, a ratio a row and its target (the owner: label over value was not intuitive). */}
    {table ? <table class="w-full border-collapse text-sm">
      <thead class="sr-only"><tr><th scope="col">Ratio</th><th scope="col">Target</th></tr></thead>
      <tbody>{lines.map((l) => <tr key={l.label}>
        <th scope="row" class="py-0.5 pr-3 text-left font-normal text-ink-muted">{l.label}</th>
        <td class="py-0.5 text-right text-ink tabular-nums">{l.value}</td>
      </tr>)}</tbody>
    </table> : <p class="text-sm leading-relaxed text-ink">{lines.map((l, i) => <span key={l.label}>
      {i > 0 && <span aria-hidden="true" class="px-1.5 text-ink-muted">·</span>}
      <span class="text-ink-muted">{l.label}: </span><span class="tabular-nums">{l.value}</span>
    </span>)}</p>}
    {note && <p data-testid={`${pre}-confirm-standard`} class="mt-0.5 text-xs text-ink-muted">{note}</p>}
  </li>;
}

/** `benchmarks`: the ratios and their targets ("1.10 or more"); `to`, the box that changes them; `confirm`, the button's words;
 * `railed`, the answers folded to the rail: from 1024 px the groups stand there only, never twice (the owner, D-UX-237). */
export function CheckStep({ pre, groups, benchmarks, to, state, confirm, onConfirm, railed }: {
  pre: string; groups: CheckGroup[]; benchmarks: CheckLine[]; to: string; state: CheckState; confirm: string; onConfirm: () => void; railed?: boolean;
}) {
  const list = <div class="mt-3 rounded-control bg-surface px-3">
    {railed && <p data-testid={`${pre}-confirm-railed`} class={`hidden pt-3 lg:block ${HINT}`}>What you gave is in your answers, beside.</p>}
    <ul class="divide-y divide-line">
      {groups.map((g) => <Row key={g.id} pre={pre} id={g.id} title={g.title} to={g.to} lines={g.lines} railed={railed} />)}
      <Row pre={pre} id="benchmarks" title="The benchmarks it is judged against" to={to} lines={benchmarks} note={STANDARD} table />
    </ul>
  </div>;
  if (state === 'done') return <details id="check" data-testid={`${pre}-confirmed`} class="mt-10 border-t border-line pt-3">
    <summary class={`min-h-11 cursor-pointer ${STATE} items-center text-ink`}><Tick />Checked: what you gave and the benchmarks</summary>
    {list}
  </details>;
  return <Section id="check" title="Check your figures">
    {state === 'lapsed'
      ? <p role="status" data-testid={`${pre}-confirm-lapsed`} class="mt-2 text-sm font-medium text-warn">Your figures changed since you checked them: check them again.</p>
      : <p class={`max-w-prose ${HINT}`}>What you gave, and the benchmarks it is judged against. Change a line, or confirm them.</p>}
    {list}
    <button type="button" data-testid={`${pre}-confirm`} class={`mt-4 ${FILLED}`} onClick={onConfirm}>{confirm}</button>
  </Section>;
}
