/**
 * The CMA against a lender's levels (D-UX-51) and "Make it viable" (D-UX-52, MV4, D-UX-56): each ratio as a bar in its
 * worse year of the estimate and the projection; then, on a tap, each lever alone and the engine's plan as sliders, the
 * borrower's first and the lender's last. The sliders change nothing in the columns until "Use this plan". Figures:
 * engine/cma-plan.ts only, via levers.ts.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { Bar, Lever, PlanLever } from '../Board';
import { BUTTON, FILLED, HINT, TextField } from '../fields';
import { amountOf, tidyAmount, type CmaState } from './model';
import {
  CMA_AS_TYPED, cmaBoardOf, cmaPlanOf, cmaViableOf, levelsOf, sameCmaLevers,
  type CmaLeverId, type CmaLevers, type CmaPlanView,
} from './levers';
import type { ViableView } from '../board-model';

type Update = (f: (s: CmaState) => CmaState) => void;
const MUTED = 'text-ink-muted';
const ALONE: Record<CmaLeverId, string> = { quasi: 'quasi', capital: 'capital', sales: 'sales', months: 'months', collateral: 'collateral' };
const tone = (ok: boolean) => (ok ? 'text-good' : 'text-bad');

export function Levels({ s, update, use }: { s: CmaState; update: Update; use: (l: CmaLevers) => void }) {
  const lv = useMemo(() => levelsOf(s), [s]);
  if (!lv) return null;
  // The levels and "Make it viable" are results, so they land on paper (docs/DESIGN-SITE.md; a dark sheet in dark mode, UX5c).
  return <div data-testid="cma-levels" class={lv.checks ? 'paper shadow-paper mt-4 rounded-card p-4 sm:p-6' : 'mt-4'}>
    {lv.ask && <p data-testid="cma-levels-ask" class="text-sm text-warn">{lv.ask}</p>}
    {lv.checks && <div data-testid="cma-checks">
      <h3 class="text-title text-ink">{lv.misses ? 'Why it does not work yet' : 'Against a lender’s levels'}</h3>
      <p class={`text-xs ${MUTED}`}>Each ratio in its worse year of the estimate and the projection; the line is the lender’s target.</p>
      <ul class="mt-1 divide-y divide-line">{lv.checks.map((c) => <Bar key={c.id} c={c} pre="cma" />)}</ul>
    </div>}
    {lv.collateralNote && <p data-testid="cma-collateral-note" class={`mt-1 ${HINT}`}>{lv.collateralNote}</p>}
    {lv.misses && <p data-testid="cma-misses" class="mt-2 text-sm text-bad">{lv.misses}</p>}
    {lv.checks && <Viable s={s} misses={!!lv.misses} update={update} use={use} />}
  </div>;
}

/** "Make it viable", worked on a tap since it runs the whole CMA many times; any figure changed closes it, and the
 * promoters' most works the plan again. */
function Viable({ s, misses, update, use }: { s: CmaState; misses: boolean; update: Update; use: (l: CmaLevers) => void }) {
  const [v, setV] = useState<ViableView | undefined>();
  const [plan, setPlan] = useState<CmaPlanView | undefined>();
  const [lv, setLv] = useState<CmaLevers>(CMA_AS_TYPED);
  const [touched, setTouched] = useState<CmaLeverId[]>([]);
  const base = useMemo(() => JSON.stringify({ ...s, promotersMost: '', doc: undefined }), [s]);
  useEffect(() => { setV(undefined); setPlan(undefined); setTouched([]); }, [base]);
  const replan = (ids: CmaLeverId[], at: CmaLevers) => {
    const q = cmaPlanOf(s, Object.fromEntries(ids.map((id) => [id, at[id]])));
    setPlan(q); setTouched(ids); if (q) setLv(q.levers);
  };
  useEffect(() => { if (plan) replan(touched, lv); }, [s.promotersMost]);
  const b = useMemo(() => (plan ? cmaBoardOf(plan, lv, s) : undefined), [plan, lv]);
  const move = (id: CmaLeverId, n: number) => { setLv((l) => ({ ...l, [id]: n })); if (!touched.includes(id)) setTouched([...touched, id]); };
  const group = (by: 'borrower' | 'lender', title: string) => {
    const ls = v?.lines.filter((l) => l.by === by) ?? [];
    return ls.length > 0 && <>
      <h4 class="mt-3 text-sm font-medium text-ink">{title}</h4>
      <ul class="mt-1 space-y-2">{ls.map((l) => <Lever key={l.id} l={l} pre="cma" />)}</ul>
    </>;
  };
  const cards = (by: 'borrower' | 'lender', title: string) => {
    const cs = plan && b ? plan.cards.filter((c) => c.by === by) : [];
    return cs.length > 0 && b && <>
      <h4 class="mt-3 text-sm font-medium text-ink">{title}</h4>
      <ul class="mt-1 space-y-2">{cs.map((c) => <PlanLever key={c.id} id={c.id} head={c.head} m={b.moves[c.id]} value={lv[c.id]} set={(n) => move(c.id, n)}
        pre="cma" toggle={c.toggle} alone={v?.lines.find((l) => l.id === ALONE[c.id])} />)}</ul>
    </>;
  };
  const bad = !!s.promotersMost.trim() && amountOf(s.promotersMost) === undefined;
  return <>
    {!v && <button type="button" data-testid="cma-viable" class={`mt-2 ${BUTTON}`} onClick={() => {
      setV(cmaViableOf(s)); if (misses) replan([], CMA_AS_TYPED);
      // The button removes itself, so the focus moves to what replaces it (WCAG 2.4.3; DESIGN-LESSONS lesson 1).
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-testid="cma-plan"], [data-testid="cma-viable-box"]')?.focus());
    }}>
      {misses ? 'Make it viable' : 'How far can sales fall?'}</button>}
    {v && !plan && <div data-testid="cma-viable-box" tabIndex={-1} class="mt-2">
      <p class="font-medium text-ink">{v.title}</p>
      {group('borrower', v.meets ? 'The room' : 'Your changes')}
      {group('lender', 'The lender’s, if it agrees')}
      <p class={`mt-2 ${HINT}`}>{v.foot}</p>
    </div>}
    {v && plan && b && <div data-testid="cma-plan" tabIndex={-1} class="mt-6 border-t-2 border-ink pt-4">
      <h3 class="text-title text-ink">The plan: the levers together</h3>
      <p class={HINT}>The engine’s plan, your changes first and the lender’s last. The sliders change none of the figures above until you use the plan.</p>
      <TextField id="fld-cma-promotersMost" class="mt-3" label="The most the promoters can bring as capital, if known" hint="Without it, no more of their money is assumed."
        inputMode="decimal" value={s.promotersMost} tidy={tidyAmount} placeholder="like 12 L" invalid={bad}
        said={bad ? 'Not understood. Type 10,00,000 or 10 L.' : undefined} onCommit={(promotersMost) => update((x) => ({ ...x, promotersMost }))} />
      {b.steps.length
        ? <ol data-testid="cma-plan-steps" class="mt-3 list-decimal space-y-0.5 pl-5 text-sm text-ink">{b.steps.map((t) => <li key={t}>{t}</li>)}</ol>
        : <p data-testid="cma-plan-steps" class="mt-3 text-sm text-ink">No lever moves: nothing within its limit helps.</p>}
      {b.promoters && <p data-testid="cma-plan-promoters" class={`mt-1 text-sm ${b.over ? 'font-medium text-bad' : 'text-ink'}`}>{b.promoters}</p>}
      <p data-testid="cma-plan-verdict" class={`mt-2 text-sm font-medium ${tone(b.works)}`}>{b.verdict}</p>
      {b.still.length > 0 && <ul data-testid="cma-plan-still" class="mt-0.5 list-disc space-y-0.5 pl-5 text-sm text-bad">{b.still.map((t) => <li key={t}>{t}</li>)}</ul>}
      <p data-testid="cma-plan-limits" class={HINT}>{plan.limits}{plan.atLimit ? ` ${plan.atLimit}` : ''}</p>
      <div class="mt-3 flex flex-wrap gap-2">
        {b.steps.length > 0 && <button type="button" data-testid="cma-plan-use" class={FILLED} onClick={() => use(lv)}>Use this plan</button>}
        {touched.length > 0 && <button type="button" data-testid="cma-plan-rest" class={BUTTON} onClick={() => replan(touched, lv)}>Work out the rest</button>}
        {(touched.length > 0 || !sameCmaLevers(lv, plan.levers)) && <button type="button" data-testid="cma-plan-back" class={BUTTON} onClick={() => replan([], CMA_AS_TYPED)}>Back to the engine’s plan</button>}
      </div>
      {b.checks && <div data-testid="cma-plan-checks" class="mt-3">
        <p class="text-sm font-medium text-ink">With these changes</p>
        <ul class="mt-1 divide-y divide-line">{b.checks.map((c) => <Bar key={c.id} c={c} pre="cma-plan" />)}</ul>
      </div>}
      {cards('borrower', 'Your changes')}
      {cards('lender', 'The lender’s, if it agrees')}
      <p data-testid="cma-plan-line" aria-live="polite" class={`sticky bottom-12 mt-2 border-t border-line bg-canvas py-2 text-sm font-medium ${tone(b.works)}`}>With these changes: {b.line}</p>
      <p class={HINT}>{v.foot}</p>
    </div>}
  </>;
}
