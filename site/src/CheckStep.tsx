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

function Group({ pre, g, note }: { pre: string; g: CheckGroup; note?: string }) {
  return <div data-testid={`${pre}-confirm-${g.id}`} class="rounded-control bg-surface p-3">
    <div class="flex items-baseline justify-between gap-2">
      <h3 class="font-medium text-ink">{g.title}</h3>
      <a href={`#${g.to}`} onClick={toBox(g.to)} aria-label={`Change: ${g.title}`} class="inline-flex min-h-11 items-center text-sm text-link underline underline-offset-4">Change</a>
    </div>
    {note && <p data-testid={`${pre}-confirm-standard`} class="text-sm text-ink-muted">{note}</p>}
    <dl class="mt-1 space-y-1.5">{g.lines.map((l) => <div key={l.label}>
      <dt class="text-sm text-ink-muted">{l.label}</dt><dd class="text-ink tabular-nums">{l.value}</dd>
    </div>)}</dl>
  </div>;
}

/** `benchmarks`: the ratios and their targets; `to`, the box that changes them; `confirm`, the button's words. */
export function CheckStep({ pre, groups, benchmarks, to, state, confirm, onConfirm }: {
  pre: string; groups: CheckGroup[]; benchmarks: CheckLine[]; to: string; state: CheckState; confirm: string; onConfirm: () => void;
}) {
  const list = <div class="mt-4 grid gap-3 sm:grid-cols-2">
    {groups.map((g) => <Group key={g.id} pre={pre} g={g} />)}
    <Group pre={pre} g={{ id: 'benchmarks', title: 'The benchmarks it is judged against', to, lines: benchmarks }} note={STANDARD} />
  </div>;
  if (state === 'done') return <details id="check" data-testid={`${pre}-confirmed`} class="mt-10 border-t border-line pt-3">
    <summary class={`min-h-11 cursor-pointer ${STATE} items-center text-ink`}><Tick />Checked: what you gave and the benchmarks</summary>
    {list}
  </details>;
  return <Section id="check" title="Check your figures">
    {state === 'lapsed'
      ? <p role="status" data-testid={`${pre}-confirm-lapsed`} class="mt-2 text-sm font-medium text-warn">Your figures changed since you checked them: check them again.</p>
      : <p class={`max-w-prose ${HINT}`}>Before the report: what you gave, and the benchmarks it is judged against.</p>}
    {list}
    <button type="button" data-testid={`${pre}-confirm`} class={`mt-4 ${FILLED}`} onClick={onConfirm}>{confirm}</button>
  </Section>;
}
