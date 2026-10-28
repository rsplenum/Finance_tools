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

function Group({ pre, g, railed }: { pre: string; g: CheckGroup; railed?: boolean }) {
  return <div data-testid={`${pre}-confirm-${g.id}`} class={`rounded-control bg-surface p-3${railed ? ' lg:hidden' : ''}`}>
    <div class="flex items-baseline justify-between gap-2">
      <h3 class="font-medium text-ink">{g.title}</h3>
      <a href={`#${g.to}`} onClick={toBox(g.to)} aria-label={`Change: ${g.title}`} class="inline-flex min-h-11 items-center text-sm text-link underline underline-offset-4">Change</a>
    </div>
    <dl class="mt-1 space-y-1.5">{g.lines.map((l) => <div key={l.label}>
      <dt class="text-sm text-ink-muted">{l.label}</dt><dd class="text-ink tabular-nums">{l.value}</dd>
    </div>)}</dl>
  </div>;
}

/** The benchmarks as a table (the owner: a list of label over value was not intuitive), a ratio a row and its target. */
function Benchmarks({ pre, lines, to }: { pre: string; lines: CheckLine[]; to: string }) {
  const title = 'The benchmarks it is judged against';
  return <div data-testid={`${pre}-confirm-benchmarks`} class="rounded-control bg-surface p-3">
    <div class="flex items-baseline justify-between gap-2">
      <h3 class="font-medium text-ink">{title}</h3>
      <a href={`#${to}`} onClick={toBox(to)} aria-label={`Change: ${title}`} class="inline-flex min-h-11 items-center text-sm text-link underline underline-offset-4">Change</a>
    </div>
    <p data-testid={`${pre}-confirm-standard`} class="text-sm text-ink-muted">{STANDARD}</p>
    <table class="mt-2 w-full border-collapse text-sm">
      <thead><tr class="border-b border-line">
        <th scope="col" class="py-1.5 pr-3 text-left font-medium text-ink-muted">Ratio</th>
        <th scope="col" class="py-1.5 text-right font-medium text-ink-muted">Target</th>
      </tr></thead>
      <tbody>{lines.map((l) => <tr key={l.label} class="border-b border-line last:border-b-0">
        <th scope="row" class="py-1.5 pr-3 text-left font-normal text-ink">{l.label}</th>
        <td class="py-1.5 text-right text-ink tabular-nums">{l.value}</td>
      </tr>)}</tbody>
    </table>
  </div>;
}

/** `benchmarks`: the ratios and their targets ("1.10 or more"); `to`, the box that changes them; `confirm`, the button's words;
 * `railed`, the answers folded to the rail: from 1024 px the groups stand there only, never twice (the owner, D-UX-237). */
export function CheckStep({ pre, groups, benchmarks, to, state, confirm, onConfirm, railed }: {
  pre: string; groups: CheckGroup[]; benchmarks: CheckLine[]; to: string; state: CheckState; confirm: string; onConfirm: () => void; railed?: boolean;
}) {
  const list = <div class={`mt-4 grid gap-3 sm:grid-cols-2${railed ? ' lg:grid-cols-1' : ''}`}>
    {railed && <p data-testid={`${pre}-confirm-railed`} class={`hidden lg:block ${HINT}`}>What you gave is in your answers, beside.</p>}
    {groups.map((g) => <Group key={g.id} pre={pre} g={g} railed={railed} />)}
    <Benchmarks pre={pre} lines={benchmarks} to={to} />
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
