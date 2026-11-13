/**
 * The working as pictures (PIC1, Rahul, 13-11-2026: "A picture or graphics speaks a thousand words … text is the worst
 * way to display verbose information"): the targets as bars against their levels, the room to move as two bars and a
 * grid of instalments, and a year's cash (A) against what is owed (B). In ink and grey: a hue only where a target is met
 * or missed (PIC2, Rahul, 13-11-2026: "The over use of color bars has brought down the sophistication and professional
 * vibe"). Every figure is the engine's, as `model.ts` hands it in; nothing is worked out here but each bar's share.
 */
import { rs } from '../../../engine/util';
import { QUIET } from '../worked/parts';
import type { Preview } from './model';
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
          <div class={`h-3 rounded-full ${r.ok ? 'bg-ink-muted/45' : 'bg-bad'} motion-safe:transition-[width] motion-safe:duration-300`} style={{ width: pct(r.value, top) }} />
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
      {bar(P.most, most, 'bg-ink-muted/60')}
      {bar(over ? `${P.asked}: ${P.over.toLowerCase()}` : P.asked, asked, over ? 'bg-bad' : 'bg-ink-muted/30')}
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

/**
 * A year's cash available (A) against what is owed to the bank (B), the table's own figures, on one scale for all the
 * years so that two years open side by side compare: ink for the cash, grey for what is owed; the DSCR is A over B.
 */
export function Cover({ a, b, top }: { a?: number; b?: number; top: number }) {
  if (a === undefined || b === undefined || !(top > 0)) return null;
  const bar = (key: string, label: string, n: number, cls: string) => <div class="grid grid-cols-[1.25rem_1fr] items-center gap-2">
    <span title={label} class="text-xs font-medium text-ink-muted">{key}</span>
    <span class="h-2 rounded-full bg-ink/6"><span class={`block h-2 rounded-full ${cls}`} style={{ width: pct(n, top) }} /></span>
  </div>;
  return <div aria-hidden="true" data-testid="cover" class="mt-3 mb-1 space-y-1.5">
    {bar('A', P.a, a, 'bg-ink/75')}
    {bar('B', P.b, b, 'bg-ink-muted/35')}
  </div>;
}
