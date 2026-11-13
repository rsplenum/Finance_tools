/**
 * The working as pictures (PIC1, Rahul, 13-11-2026: "A picture or graphics speaks a thousand words … text is the worst
 * way to display verbose information"): the targets as bars against their levels, the room to move as two bars and a
 * grid of instalments, and a year's statement as a waterfall from profit to cash, against what is owed. Every figure is
 * the engine's, as `model.ts` hands it in; nothing is worked out here but each bar's share of the longest.
 */
import { rs } from '../../../engine/util';
import { QUIET } from '../worked/parts';
import type { Line, Preview, StatementView } from './model';
import { N } from './words';

const P = N.pic;
/** A bar's length as a share of the scale, never shorter than a sliver so a small amount still shows. */
const pct = (n: number, top: number) => `${Math.max(0.6, (100 * Math.max(0, n)) / top)}%`;

/** Met or missed, as a mark in the colour that says so; the words beside it always say it too. */
export const Mark = ({ ok, small }: { ok: boolean; small?: boolean }) => <svg aria-hidden="true" viewBox="0 0 20 20" class={`${small ? 'h-4 w-4' : 'h-5 w-5'} shrink-0 ${ok ? 'text-good' : 'text-bad'}`}>
  <circle cx="10" cy="10" r="9" fill="currentColor" opacity="0.16" />
  <path d={ok ? 'M6 10.5l2.6 2.6L14 7.6' : 'M7 7l6 6M13 7l-6 6'} fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
</svg>;

/** The verdict: each target a bar of its figure with the level marked across it; the words before the colon above. */
export function Targets({ v }: { v: NonNullable<Preview['verdict']> }) {
  if (!v.rows?.length) return <p data-testid="dscr-verdict" class="mt-2 text-ink">{v.text}</p>;
  const top = Math.max(...v.rows.flatMap((r) => [r.value, r.target])) * 1.12;
  return <figure data-testid="dscr-verdict" class="m-0 mt-3 max-w-xl">
    <figcaption class="flex items-center gap-2 font-semibold text-ink"><Mark ok={v.meets} />{v.head}</figcaption>
    <ul class="mt-2 space-y-3">
      {v.rows.map((r) => <li key={r.id}>
        <p class="flex flex-wrap items-baseline justify-between gap-x-3 text-base text-ink">
          <span>{r.id === 'minimum' ? P.lowest(r.fy) : P.average}</span>{' '}
          <span class="tabular-nums"><b class={r.ok ? '' : 'text-bad'}>{r.text}</b> <span class="text-sm text-ink-muted">{P.needs(r.targetText)}</span></span>
        </p>
        <div aria-hidden="true" class="relative mt-1 h-3 rounded-full bg-ink/8">
          <div class={`h-3 rounded-full ${r.ok ? 'bg-good' : 'bg-bad'} motion-safe:transition-[width] motion-safe:duration-300`} style={{ width: pct(r.value, top) }} />
          <div class="absolute -top-1 -bottom-1 w-0.5 rounded-full bg-ink" style={{ left: `calc(${(100 * r.target) / top}% - 1px)` }} />
        </div>
      </li>)}
    </ul>
  </figure>;
}

/** Room to move: the most it can repay beside the amount asked, on one scale; then the fewest instalments as a grid. */
export function Room({ p, onAmount, onFewest }: { p: Preview; onAmount: (n: number) => void; onFewest: (n: number) => void }) {
  const l = p.largest, f = p.fewest;
  if (!l && !f) return null;
  return <section aria-labelledby="dscr-room" class="mt-6 max-w-xl">
    <h3 id="dscr-room" class="font-semibold text-ink">{P.room}</h3>
    {l && (l.most !== undefined && l.asked !== undefined ? <Amounts most={l.most} asked={l.asked} limit={l.limit} />
      : <p data-testid="dscr-largest" class="mt-2 text-ink">{l.text}</p>)}
    {l?.amount !== undefined && <button type="button" data-testid="use-amount" class={`${QUIET} -ml-3`} onClick={() => onAmount(l.amount!)}>{P.useAmount(rs(l.amount))}</button>}
    {f && (f.fewest !== undefined ? <Instalments n={f.fewest} now={f.now ?? f.fewest} per={f.per ?? 12} />
      : <p data-testid="dscr-fewest" class="mt-4 text-ink">{f.text}</p>)}
    {f?.instalments !== undefined && <button type="button" data-testid="use-instalments" class={`${QUIET} -ml-3`} onClick={() => onFewest(f.instalments!)}>{P.useFewest(f.instalments)}</button>}
  </section>;
}

function Amounts({ most, asked, limit }: { most: number; asked: number; limit?: string }) {
  const top = Math.max(most, asked), over = asked > most;
  const bar = (label: string, n: number, cls: string) => <li>
    <p class="flex flex-wrap items-baseline justify-between gap-x-3 text-base"><span class="text-ink-muted">{label}</span>{' '}<b class="text-ink tabular-nums">{rs(n)}</b></p>
    <div aria-hidden="true" class="mt-1 h-3 rounded-full bg-ink/8"><div class={`h-3 rounded-full ${cls} motion-safe:transition-[width] motion-safe:duration-300`} style={{ width: pct(n, top) }} /></div>
  </li>;
  return <div data-testid="dscr-largest" class="mt-2">
    <ul class="space-y-2.5">
      {bar(P.most, most, 'bg-good')}
      {bar(over ? `${P.asked}: ${P.over.toLowerCase()}` : P.asked, asked, over ? 'bg-bad' : 'bg-ink/45')}
    </ul>
    {limit && <p class="mt-2 text-sm text-ink-muted">{P.limit(limit)}</p>}
  </div>;
}

/** The fewest instalments that work as a grid, a row for each year of repayment; the borrower's own term beside them. */
function Instalments({ n, now, per }: { n: number; now: number; per: number }) {
  const total = Math.max(n, now), rows = Math.ceil(total / per), spare = now > n, more = n > now;
  const dot = (i: number) => (i <= Math.min(n, now) ? 'bg-ink' : spare ? 'border border-ink-muted' : 'bg-bad');
  return <div class="mt-4">
    <p data-testid="dscr-fewest" class="text-base text-ink">{P.fewest(n, per)}</p>
    <div aria-hidden="true" class="mt-2 grid grid-cols-[3.75rem_1fr] items-center gap-y-1">
      {Array.from({ length: rows }, (_, r) => <>
        <span key={`y${r}`} class="text-xs text-ink-muted">{P.row(r + 1)}</span>
        <span key={`d${r}`} class="flex gap-1">{Array.from({ length: Math.min(per, total - r * per) }, (_, k) => <span key={k} class={`h-3 w-3 rounded-[3px] ${dot(r * per + k + 1)}`} />)}</span>
      </>)}
    </div>
    {(spare || more) && <p class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted">
      <span class="inline-flex items-center gap-1.5"><span aria-hidden="true" class="h-3 w-3 rounded-[3px] bg-ink" />{spare ? P.key.fewest : P.key.yours}</span>
      <span class="inline-flex items-center gap-1.5"><span aria-hidden="true" class={`h-3 w-3 rounded-[3px] ${spare ? 'border border-ink-muted' : 'bg-bad'}`} />{spare ? P.key.spare : P.key.more}</span>
    </p>}
  </div>;
}

/** A step of the waterfall: a line of the statement as a bar from where the running figure stood to where it goes. */
interface Step { label: string; text: string; from: number; to: number; tone: 'base' | 'less' | 'add' | 'cash' | 'owed' | 'part'; id?: string; total?: boolean }

/**
 * A column of the statement (a year, or the Total) as a waterfall: the profit down to what is left after tax, the
 * non-cash costs and the loan's interest added back up to the cash available (A); then what is owed (B), built up from
 * nothing on the same scale. The figures and their words are the statement's own lines, in their order.
 */
export function stepsOf(st: StatementView, get: (l: Line) => { n?: number; text: string }) {
  const steps: Step[] = [];
  let run = 0, owed = 0, side: 'in' | 'owed' = 'in', last: number | undefined, ratio: { label: string; text: string } | undefined;
  for (const l of st.lines) {
    if (l.kind === 'head') continue;
    const { n, text } = get(l);
    if (l.kind === 'ratio') { ratio = { label: l.label, text }; continue; }
    if (n === undefined) continue;
    if (side === 'in') {
      if (l.kind === 'total') {
        steps.push({ label: l.label, text, from: 0, to: n, tone: l.id === 'available' ? 'cash' : 'base', id: l.id, total: true });
        run = n; last = n;
        if (l.id === 'available') side = 'owed';
      } else if (n === 0) continue;
      else if (/^Less:/.test(l.label)) { steps.push({ label: l.label, text, from: run, to: run - n, tone: 'less', id: l.id }); run -= n; last = undefined; }
      else if (/^Add:/.test(l.label)) { steps.push({ label: l.label, text, from: run, to: run + n, tone: 'add', id: l.id }); run += n; last = undefined; }
      // The cash's first line carries the profit after tax just shown: it is not drawn twice.
      else if (last !== undefined && n === last) continue;
      else { steps.push({ label: l.label, text, from: 0, to: n, tone: 'base', id: l.id }); run = n; last = n; }
    } else if (l.id === 'service') steps.push({ label: l.label, text, from: 0, to: n, tone: 'owed', id: l.id, total: true });
    else if (n !== 0) { steps.push({ label: l.label, text, from: owed, to: owed + n, tone: 'part', id: l.id }); owed += n; }
  }
  return { steps, ratio };
}

const TONE: Record<Step['tone'], string> = {
  base: 'bg-ink/45', less: 'bg-bad/70', add: 'bg-good/80', cash: 'bg-ink', owed: 'bg-ink-muted/60', part: 'bg-ink-muted/35',
};

/** The waterfall of one column; each line's figure keeps its `data-line`, as the cards had it. */
export function Waterfall({ st, get }: { st: StatementView; get: (l: Line) => { n?: number; text: string } }) {
  const { steps, ratio } = stepsOf(st, get);
  if (!steps.length) return null;
  const lo = Math.min(0, ...steps.flatMap((s) => [s.from, s.to])), hi = Math.max(1, ...steps.flatMap((s) => [s.from, s.to])), span = hi - lo;
  const at = (x: number) => (100 * (x - lo)) / span;
  return <div data-testid="waterfall" class="mt-1 text-sm">
    <ul class="space-y-1.5">
      {steps.map((s, j) => <li key={j} class={s.tone === 'owed' || (s.tone === 'part' && steps[j - 1]?.tone === 'cash') ? 'pt-2' : ''}>
        <p class={`flex justify-between gap-3 ${s.total ? 'font-semibold text-ink' : 'text-ink'}`}><span>{s.label}</span>{' '}<span data-line={s.id} class="text-right tabular-nums">{s.text}</span></p>
        <div aria-hidden="true" class="relative mt-0.5 h-2.5">
          {lo < 0 && <span class="absolute inset-y-0 w-px bg-line" style={{ left: `${at(0)}%` }} />}
          <span class={`absolute inset-y-0 rounded-sm ${TONE[s.tone]}`} style={{ left: `${at(Math.min(s.from, s.to))}%`, width: `max(3px, ${Math.abs(s.to - s.from) / span * 100}%)` }} />
        </div>
      </li>)}
    </ul>
    {ratio && <p class="mt-3 flex justify-between gap-3 border-t border-line pt-2 font-semibold text-ink"><span>{ratio.label}</span>{' '}<span data-line="dscr" class="tabular-nums">{ratio.text}</span></p>}
  </div>;
}
