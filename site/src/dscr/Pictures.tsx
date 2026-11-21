/**
 * The pictures beside the answer (PIC1, Rahul, 13-11-2026: "A picture or graphics speaks a thousand words"): a mark for
 * met or missed, and the room to move with its grid of instalments. In ink and grey: a hue only where a target is met or
 * missed (PIC2). Every figure is the engine's, as `model.ts` hands it in; nothing is worked out here.
 */
import { rs } from '../../../engine/util';
import { QUIET } from '../worked/parts';
import type { Preview } from './model';
import { N } from './words';

const P = N.pic;
/** Met or missed, as a mark in the colour that says so; the words beside it always say it too. */
export const Mark = ({ ok, small }: { ok: boolean; small?: boolean }) => <svg aria-hidden="true" viewBox="0 0 20 20" class={`${small ? 'h-4 w-4' : 'h-5 w-5'} shrink-0 ${ok ? 'text-good' : 'text-bad'}`}>
  <circle cx="10" cy="10" r="9" fill="currentColor" opacity="0.16" />
  <path d={ok ? 'M6 10.5l2.6 2.6L14 7.6' : 'M7 7l6 6M13 7l-6 6'} fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
</svg>;

/**
 * Room to move, beside the ways that work (Rahul, 21-11-2026: "no repetitive communication and no confusing turn of
 * phrase"): what sets the most the figures carry, with that amount a tap away; and, where the ways that work do not
 * already offer a longer term, the shortest repayment that works as a grid of instalments, also a tap away. The reading
 * above says the amount in lakh; the button gives it to the rupee, and nothing else repeats it.
 */
export function Room({ p, longer, onAmount, onFewest }: { p: Preview; longer: boolean; onAmount: (n: number) => void; onFewest: (n: number) => void }) {
  const l = p.largest, f = longer ? undefined : p.fewest;
  const less = l?.most !== undefined && l.asked !== undefined && l.asked > l.most;
  const amount = l && (l.amount !== undefined || l.most === undefined), turns = f && (f.instalments !== undefined || f.fewest === undefined);
  if (!amount && !turns) return null;
  return <section data-testid="room" aria-labelledby="dscr-room" class="mb-6 max-w-xl">
    <h2 id="dscr-room" class="font-heading text-xl font-semibold text-ink">{less ? P.less : P.room}</h2>
    {l && amount && (l.most !== undefined && l.amount !== undefined
      ? <p data-testid="dscr-largest" class="mt-2 text-base text-ink">{P.most(l.limit)}</p>
      : <p data-testid="dscr-largest" class="mt-2 text-base text-ink">{l.text}</p>)}
    {l?.amount !== undefined && <button type="button" data-testid="use-amount" class={`${QUIET} -ml-3`} onClick={() => onAmount(l.amount!)}>{P.useAmount(rs(l.amount))}</button>}
    {f && turns && (f.fewest !== undefined ? <Instalments n={f.fewest} now={f.now ?? f.fewest} per={f.per ?? 12} tenure={f.tenure} />
      : <p data-testid="dscr-fewest" class="mt-4 text-base text-ink">{f.text}</p>)}
    {f?.instalments !== undefined && <button type="button" data-testid="use-instalments" class={`${QUIET} -ml-3`} onClick={() => onFewest(f.instalments!)}>{f.tenure !== undefined ? P.useFewest(f.tenure) : P.useTurns(f.instalments)}</button>}
  </section>;
}

/** The fewest instalments that work as a grid, a row for each year of repayment; the borrower's own term beside them. */
function Instalments({ n, now, per, tenure }: { n: number; now: number; per: number; tenure?: number }) {
  const total = Math.max(n, now), rows = Math.ceil(total / per), spare = now > n, more = n > now;
  const dot = (i: number) => (i <= Math.min(n, now) ? 'bg-ink' : spare ? 'border border-ink-muted' : 'bg-bad');
  return <div class="mt-4">
    <p data-testid="dscr-fewest" class="text-base text-ink">{P.fewest(n, per, tenure)}</p>
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
