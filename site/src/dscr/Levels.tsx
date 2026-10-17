/**
 * Make it viable on the DSCR front door (MV5, D-UX-57): the target's two levels as bars when it misses, then, on a tap,
 * each lever alone and the engine's plan as sliders (D-UX-55's board): a smaller loan and a higher profit, the
 * borrower's; a longer repayment, the lender's. The sliders change no figure above until "Use this plan", which writes
 * the loan and the term only. Figures: engine/dscr-plan.ts only, via levers.ts.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { Bar, Lever, PlanLever } from '../Board';
import { BUTTON, FILLED, HINT, TextField } from '../fields';
import type { ViableView } from '../board-model';
import { amountOf, tidyAmount, type LenderView, type State } from './model';
import {
  DSCR_AS_TYPED, dscrBoardOf, dscrLevelsOf, dscrPlanOf, dscrViableOf, sameDscrLevers,
  type DscrLeverId, type DscrLevers, type DscrPlanView,
} from './levers';

type Update = (f: (s: State) => State) => void;
const tone = (ok: boolean) => (ok ? 'text-link' : 'text-bad');

export function Levels({ s, lender, update, use }: { s: State; lender?: LenderView; update: Update; use: (l: DscrLevers) => void }) {
  const lv = useMemo(() => dscrLevelsOf(s, lender), [s, lender]);
  if (!lv?.misses) return null;
  return <div data-testid="dscr-levels" class="mt-4">
    <h3 class="text-title text-ink">Why it does not work yet</h3>
    <ul class="mt-1 divide-y divide-line">{lv.checks.map((c) => <Bar key={c.id} c={c} pre="dscr" />)}</ul>
    <Viable s={s} update={update} use={use} />
  </div>;
}

/** Worked on a tap, since it runs the whole statement many times; any figure changed closes it, and the most the
 * borrower can bring works the plan again. */
function Viable({ s, update, use }: { s: State; update: Update; use: (l: DscrLevers) => void }) {
  const [v, setV] = useState<ViableView | undefined>();
  const [plan, setPlan] = useState<DscrPlanView | undefined>();
  const [lv, setLv] = useState<DscrLevers>(DSCR_AS_TYPED);
  const [touched, setTouched] = useState<DscrLeverId[]>([]);
  const base = useMemo(() => JSON.stringify({ ...s, ownMost: '' }), [s]);
  useEffect(() => { setV(undefined); setPlan(undefined); setTouched([]); }, [base]);
  const replan = (ids: DscrLeverId[], at: DscrLevers) => {
    const q = dscrPlanOf(s, Object.fromEntries(ids.map((id) => [id, at[id]])));
    setPlan(q); setTouched(ids); if (q) setLv(q.levers);
  };
  useEffect(() => { if (plan) replan(touched, lv); }, [s.ownMost]);
  const b = useMemo(() => (plan ? dscrBoardOf(plan, lv) : undefined), [plan, lv]);
  const move = (id: DscrLeverId, n: number) => { setLv((l) => ({ ...l, [id]: n })); if (!touched.includes(id)) setTouched([...touched, id]); };
  const group = (by: 'borrower' | 'lender', title: string) => {
    const ls = v?.lines.filter((l) => l.by === by) ?? [];
    return ls.length > 0 && <>
      <h4 class="mt-3 text-sm font-medium text-ink">{title}</h4>
      <ul class="mt-1 space-y-2">{ls.map((l) => <Lever key={l.id} l={l} pre="dscr" />)}</ul>
    </>;
  };
  const cards = (by: 'borrower' | 'lender', title: string) => {
    const cs = plan && b ? plan.cards.filter((c) => c.by === by) : [];
    return cs.length > 0 && b && <>
      <h4 class="mt-3 text-sm font-medium text-ink">{title}</h4>
      <ul class="mt-1 space-y-2">{cs.map((c) => <PlanLever key={c.id} id={c.id} head={c.head} m={b.moves[c.id]} value={lv[c.id]} set={(n) => move(c.id, n)}
        pre="dscr" alone={v?.lines.find((l) => l.id === c.id)} />)}</ul>
    </>;
  };
  const most = s.ownMost ?? '', bad = !!most.trim() && amountOf(most) === undefined;
  // The loan and the term are written; a plan that moves only the profit has nothing to use.
  const usable = !!(lv.cut || lv.more);
  return <>
    {/* The one filled button on a short result (docs/DESIGN.md, principle 6). It removes itself, so the focus moves to what replaces it (WCAG 2.4.3). */}
    {!v && <button type="button" data-testid="dscr-viable" class={`mt-2 ${FILLED}`} onClick={() => {
      setV(dscrViableOf(s)); replan([], DSCR_AS_TYPED);
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-testid="dscr-plan"], [data-testid="dscr-viable-box"]')?.focus());
    }}>Make it viable</button>}
    {v && !plan && <div data-testid="dscr-viable-box" tabIndex={-1} class="mt-2">
      <h3 class="text-title text-ink">{v.title}</h3>
      {group('borrower', 'Your changes')}
      {group('lender', 'The lender’s, if it agrees')}
      <p class={`mt-2 ${HINT}`}>{v.foot}</p>
    </div>}
    {v && plan && b && <div data-testid="dscr-plan" tabIndex={-1} class="mt-6 border-t-2 border-ink pt-4">
      <h3 class="text-title text-ink">The plan: the levers together</h3>
      <p class={HINT}>The engine’s plan: a smaller loan first, then a longer repayment, then the profit still needed. The sliders change none of the figures above until you use the plan, which writes the loan and the term, never the profit.</p>
      <TextField id="fld-dscr-ownMost" class="mt-3" label="The most you can bring in yourself, if known" hint="Without it, no more of your own money is assumed."
        inputMode="decimal" value={most} tidy={tidyAmount} placeholder="like 2 L" invalid={bad}
        said={bad ? 'Not understood. Type 2,00,000 or 2 L.' : undefined} onCommit={(ownMost) => update((x) => ({ ...x, ownMost }))} />
      {b.steps.length
        ? <ol data-testid="dscr-plan-steps" class="mt-3 list-decimal space-y-0.5 pl-5 text-sm text-ink">{b.steps.map((t) => <li key={t}>{t}</li>)}</ol>
        : <p data-testid="dscr-plan-steps" class="mt-3 text-sm text-ink">No lever moves: nothing within its limit helps.</p>}
      {b.own && <p data-testid="dscr-plan-own" class={`mt-1 text-sm ${b.over ? 'font-medium text-bad' : 'text-ink'}`}>{b.own}</p>}
      <p data-testid="dscr-plan-verdict" class={`mt-2 text-sm font-medium ${tone(b.works)}`}>{b.verdict}</p>
      {b.still.length > 0 && <ul data-testid="dscr-plan-still" class="mt-0.5 list-disc space-y-0.5 pl-5 text-sm text-bad">{b.still.map((t) => <li key={t}>{t}</li>)}</ul>}
      <p data-testid="dscr-plan-limits" class={HINT}>{plan.limits}{plan.atLimit ? ` ${plan.atLimit}` : ''}</p>
      <div class="mt-3 flex flex-wrap gap-2">
        {usable && <button type="button" data-testid="dscr-plan-use" class={FILLED} onClick={() => use(lv)}>Use this plan</button>}
        {touched.length > 0 && <button type="button" data-testid="dscr-plan-rest" class={BUTTON} onClick={() => replan(touched, lv)}>Work out the rest</button>}
        {(touched.length > 0 || !sameDscrLevers(lv, plan.levers)) && <button type="button" data-testid="dscr-plan-back" class={BUTTON} onClick={() => replan([], DSCR_AS_TYPED)}>Back to the engine’s plan</button>}
      </div>
      {b.checks.length > 0 && <div data-testid="dscr-plan-checks" class="mt-3">
        <h4 class="text-sm font-medium text-ink">With these changes</h4>
        <ul class="mt-1 divide-y divide-line">{b.checks.map((c) => <Bar key={c.id} c={c} pre="dscr-plan" />)}</ul>
      </div>}
      {cards('borrower', 'Your changes')}
      {cards('lender', 'The lender’s, if it agrees')}
      <p data-testid="dscr-plan-line" aria-live="polite" class={`sticky bottom-10 mt-2 border-t border-line bg-canvas py-2 text-sm font-medium ${tone(b.works)}`}>With these changes: {b.line}</p>
      <p class={HINT}>{v.foot}</p>
    </div>}
  </>;
}
