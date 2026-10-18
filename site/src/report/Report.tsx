/**
 * The project report for a term loan with working capital. Who the borrower is (it sets the tax); the cost of the
 * project by head; the term loan and any other funds (the promoters' share is worked out); the loan's terms; sales and
 * costs; working capital. Then the report as the engine works it out, provisional while anything is missing, table by
 * table; what it assumes until changed; and the three downloads. Figures: engine/report.ts only, via model.ts.
 */
import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { parseMonth } from '../../../engine/parse';
import { BUTTON, Choice, FILLED, HINT, Section, TextField, toAnswer } from '../fields';
import { Bar, Lever, PlanLever } from '../Board';
import { inSentence, listed } from '../board-model';
import { printable } from '../doc/pdf';
import { isoDate, save, type FileKind } from '../download';
import { monthText } from '../dscr/model';
import { overdueNote, todayIso } from '../../../engine/review';
import { docNeeds, docStatus, fileName, reportDoc } from './document';
import {
  PMEGP, REPORT_REVIEW_BY, ACTIVITY_CHOICES, AREA_CHOICES, BORROWER_CHOICES, CATEGORY_CHOICES, EMPTY, HEADS, REPAYMENT_CHOICES, SCHEME_CHOICES,
  ALONE, AS_TYPED, COLLATERAL_HINT, amountOf, applyPlan, assumptionsOf, boardOf, plainOf, planOf, preview, sameLevers, statusText, tidyAmount, undoPlan, viableOf,
  type LeverId, type Levers, type PlanChange, type PlanView, type ReportFacts, type ReportPreview, type ReportState,
  type ViableView, type ViewRow, type ViewTable,
} from './model';

type Update = (f: (s: ReportState) => ReportState) => void;
const MUTED = 'text-ink-muted';
const SALES_BY: { value: ReportState['salesBy']; label: string }[] = [
  { value: 'drivers', label: 'The capacity, its use and the price' }, { value: 'typed', label: 'Sales I type, with their growth' }];
const bad = (t: string, read: (t: string) => unknown) => !!t.trim() && read(t) === undefined;
const notUnderstood = (t: string, read: (t: string) => unknown, example: string) => (bad(t, read) ? `Not understood. Type ${example}.` : undefined);
/** A control that removes itself hands the focus on, after the render (WCAG 2.4.3; docs/DESIGN.md, Focus). */
const focusNext = (sel: string) => requestAnimationFrame(() => document.querySelector<HTMLElement>(sel)?.focus());
/** One tone a meaning (docs/DESIGN-SITE.md, Colours): good meets, warn provisional, bad misses. */
const TONE = { good: 'border-good bg-good-tint', warn: 'border-warn bg-warn-tint', bad: 'border-bad bg-bad-tint' } as const;

/** The answer in words (review finding 3): the model's own sentence when a level misses; else what meets and what it cannot
 * read yet. Words only, from the model's checks; no figure. */
function verdictOf(p: ReportPreview): { text: string; tone: keyof typeof TONE } | undefined {
  if (!p.view || p.blocked) return undefined;
  if (p.misses) return { text: p.misses, tone: 'bad' };
  const wait = (p.checks ?? []).filter((c) => c.verdict === 'wait').map((c) => inSentence(c.label));
  return wait.length ? { text: `It meets every lender’s level it can read now; not yet read: ${listed(wait)}.`, tone: 'warn' } : { text: 'It meets every lender’s level.', tone: 'good' };
}

/** The answer bar's words (D-UX-84): the lowest DSCR as the model gives it, the verdict and the status. */
function barText(p: ReportPreview) {
  if (p.blocked || !p.view) return statusText(p);
  const lowest = p.view.key.find((k) => k.check === 'dscrLowest'), misses = (p.checks ?? []).filter((c) => c.verdict === 'misses');
  const said = misses.length ? (misses.length > 1 ? 'Misses lender’s levels' : 'Misses a lender’s level') : 'Meets the levels it reads';
  return [lowest && `Lowest DSCR ${lowest.value}`, said, statusText(p)].filter(Boolean).join(' · ');
}

/** Under the last input section (review finding 8): whether the report below has figures, linked to it. */
function arrived(p: ReportPreview) {
  if (p.blocked) return 'has no figures: its two computations disagree.';
  if (p.view) return p.short ? `has its figures. ${statusText(p)}.` : 'has its figures.';
  return `still needs ${p.needs.length === 1 ? 'one thing' : `${p.needs.length} things`}, listed there.`;
}

export function ReportCalculator() {
  const [s, setS] = useState<ReportState>(EMPTY);
  const [more, setMore] = useState(false);
  const update: Update = (f) => setS(f);
  const p = useMemo(() => preview(s), [s]);
  const typed = JSON.stringify(s) !== JSON.stringify(EMPTY);
  // Clear all, with an undo until the next figure is typed (review finding 5), as on the CMA.
  const [cleared, setCleared] = useState<ReportState>();
  useEffect(() => { if (typed) setCleared(undefined); }, [typed]);
  // "Use this plan" (MV3): the fields it wrote, each marked with what it was, until undone or kept.
  const [used, setUsed] = useState<PlanChange[]>([]);
  const use = (l: Levers) => { const a = applyPlan(s, l); setS(a.s); setUsed(a.changes); };
  const undo = () => { setS((x) => undoPlan(x, used)); setUsed([]); };
  const clear = () => { setCleared(s); setS(EMPTY); setUsed([]); focusNext('[data-testid="rep-clear-undo"]'); };
  const unclear = () => { if (cleared) setS(cleared); setCleared(undefined); focusNext('[data-testid="rep-clear"]'); };
  // The security cover's row links to the collateral field under More options (review finding 4).
  const toCollateral = (e: Event) => { e.preventDefault(); setMore(true); focusNext('#fld-collateral'); };
  const mark = (id: string, hint?: string) => { const c = used.find((u) => u.field === id); return c ? `Changed by the plan; it was ${c.was || 'empty'}.${hint ? ` ${hint}` : ''}` : hint; };
  // Each setter builds on the latest state (x), never on the one this render saw.
  const amount = (id: string, label: string, value: string, set: (x: ReportState, t: string) => ReportState, hint?: string) =>
    <TextField id={id} label={label} hint={mark(id, hint)} inputMode="decimal" value={value} tidy={tidyAmount} placeholder="like 10 L or 10,00,000"
      invalid={bad(value, amountOf)} said={notUnderstood(value, amountOf, '10,00,000 or 10 L')} onCommit={(t) => update((x) => set(x, t))} />;
  const percent = (id: string, label: string, value: string, set: (x: ReportState, t: string) => ReportState, placeholder: string) =>
    <TextField id={id} label={label} hint={mark(id)} inputMode="decimal" value={value} placeholder={placeholder}
      invalid={bad(value, plainOf)} said={notUnderstood(value, plainOf, 'a number, like 10')} onCommit={(t) => update((x) => set(x, t))} />;
  return <div>
    <Choice name="fld-borrower" legend="Who is the borrower? It sets the tax." options={BORROWER_CHOICES} value={s.borrower} columns
      onChange={(borrower) => update((x) => ({ ...x, borrower }))} />
    <Section id="cost" title="Cost of the project">
      <p class={`mt-2 ${HINT}`}>Leave a head empty if the project has none. The margin for working capital is worked out and added.</p>
      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        {HEADS.map((h) => <div key={h.id}>{amount(`fld-cost-${h.id}`, h.label, s.cost[h.id], (x, t) => ({ ...x, cost: { ...x.cost, [h.id]: t } }))}</div>)}
      </div>
    </Section>
    <Section id="finance" title="Means of finance">
      <p class={`mt-2 ${HINT}`}>The promoters bring in the rest of the cost of the project; it is worked out.</p>
      <Choice name="fld-scheme" legend="A government scheme" options={SCHEME_CHOICES} value={s.scheme} columns
        onChange={(scheme) => update((x) => ({ ...x, scheme }))} />
      {s.scheme === 'pmegp' && <>
        <p class={`mt-2 ${HINT}`}>The margin money is worked out by the scheme's rules, as read in {monthText(PMEGP.date.slice(0, 7))} and not yet checked against KVIC's guideline. {overdueNote(REPORT_REVIEW_BY, todayIso())}</p>
        <Choice name="fld-category" legend="The borrower's category" options={CATEGORY_CHOICES} value={s.category}
          onChange={(category) => update((x) => ({ ...x, category }))} />
        <Choice name="fld-area" legend="Where the unit is" options={AREA_CHOICES} value={s.area} columns
          onChange={(area) => update((x) => ({ ...x, area }))} />
        <Choice name="fld-activity" legend="What it does" options={ACTIVITY_CHOICES} value={s.activity} columns
          onChange={(activity) => update((x) => ({ ...x, activity }))} />
      </>}
      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        {amount('fld-tl-amount', s.scheme ? 'Term loan sanctioned' : 'Term loan', s.loan.amount, (x, t) => ({ ...x, loan: { ...x.loan, amount: t } }))}
        {!s.scheme && amount('fld-subsidy', 'Capital subsidy, if any', s.subsidy, (x, subsidy) => ({ ...x, subsidy }))}
        {amount('fld-unsecured', 'Unsecured loans, if any', s.unsecured, (x, unsecured) => ({ ...x, unsecured }))}
      </div>
    </Section>
    <Section id="loan" title="The term loan">
      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        {percent('fld-tl-rate', 'Interest rate (% a year)', s.loan.ratePct, (x, ratePct) => ({ ...x, loan: { ...x.loan, ratePct } }), 'like 10')}
        <TextField id="fld-tl-disbursed" label="First drawn (month)" type="month" value={s.loan.disbursed}
          said={s.loan.disbursed.trim() ? (parseMonth(s.loan.disbursed) ? monthText(parseMonth(s.loan.disbursed) as string) : 'Not understood. Type 2026-04 or Apr 2026.') : undefined}
          onCommit={(disbursed) => update((x) => ({ ...x, loan: { ...x.loan, disbursed } }))} />
        {percent('fld-tl-moratorium', 'Moratorium (months; 0 if none)', s.loan.moratoriumMonths, (x, moratoriumMonths) => ({ ...x, loan: { ...x.loan, moratoriumMonths } }), 'like 6')}
        {percent('fld-tl-instalments', 'Number of instalments', s.loan.instalments, (x, instalments) => ({ ...x, loan: { ...x.loan, instalments } }), 'like 60')}
      </div>
      <Choice name="fld-tl-repayment" legend="How it is repaid" options={REPAYMENT_CHOICES} value={s.loan.repayment}
        onChange={(repayment) => update((x) => ({ ...x, loan: { ...x.loan, repayment } }))} />
    </Section>
    <Section id="operations" title="Sales and costs">
      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        {s.salesBy === 'drivers' && <>
          {percent('fld-capacity', 'Capacity: the units it can make or serve in a year', s.capacity, (x, capacity) => ({ ...x, capacity }), 'like 1,00,000')}
          {amount('fld-price', 'Price a unit', s.price, (x, price) => ({ ...x, price }))}
        </>}
        {percent('fld-monthsToStart', 'Months from the loan to the first sales (0 if at once)', s.monthsToStart, (x, monthsToStart) => ({ ...x, monthsToStart }), 'like 3')}
        {percent('fld-variablePct', 'Materials and other variable costs (% of sales)', s.variablePct, (x, variablePct) => ({ ...x, variablePct }), 'like 65')}
        {amount('fld-fixed', 'Fixed costs in a full first year', s.fixed, (x, fixed) => ({ ...x, fixed }), 'Salaries, rent and other overheads.')}
        {percent('fld-fixedGrowth', 'Fixed costs: growth a year (%)', s.fixedGrowth, (x, fixedGrowth) => ({ ...x, fixedGrowth }), 'like 5')}
      </div>
      {/* Set off by its fill, never a border all round (F3), as on the DSCR. */}
      <details id="more-options" open={more} onToggle={(e) => setMore((e.currentTarget as HTMLDetailsElement).open)} class="mt-6">
        <summary class="flex min-h-11 cursor-pointer items-center rounded-card bg-surface px-4 py-3 font-medium text-link">More options: the use of the capacity, the price, typed sales, collateral</summary>
        <div class="pb-4">
          <Choice name="fld-salesBy" legend="Sales come from" options={SALES_BY} value={s.salesBy} columns
            onChange={(salesBy) => update((x) => ({ ...x, salesBy }))} />
          <div class="mt-4 grid gap-4 sm:grid-cols-2">
            {s.salesBy === 'drivers' ? <>
              <TextField id="fld-utilisation" label="Use of the capacity by year (%)" hint={mark('fld-utilisation', 'One a year from the first sales; the last holds after.')} value={s.utilisation} placeholder="like 60, 70, 80"
                onCommit={(utilisation) => update((x) => ({ ...x, utilisation }))} />
              {percent('fld-priceGrowth', 'The price: growth a year (%)', s.priceGrowth, (x, priceGrowth) => ({ ...x, priceGrowth }), 'like 0')}
            </> : <>
              {amount('fld-sales', 'Sales in a full first year', s.sales, (x, sales) => ({ ...x, sales }))}
              {percent('fld-salesGrowth', 'Sales: growth a year (%)', s.salesGrowth, (x, salesGrowth) => ({ ...x, salesGrowth }), 'like 10')}
            </>}
            {amount('fld-collateral', 'Collateral: its market value', s.collateral, (x, collateral) => ({ ...x, collateral }), `Property offered beside the project's assets. ${COLLATERAL_HINT}`)}
          </div>
        </div>
      </details>
    </Section>
    <Section id="wc" title="Working capital">
      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        {amount('fld-wcLimit', 'Working-capital limit sought (0 if none)', s.wcLimit, (x, wcLimit) => ({ ...x, wcLimit }))}
        {percent('fld-wcRate', 'Its interest rate (% a year)', s.wcRate, (x, wcRate) => ({ ...x, wcRate }), 'like 11')}
        {(['stock', 'debtors', 'creditors'] as const).map((k) => <div key={k}>
          {percent(`fld-days-${k}`, `Days of ${k}`, s.days[k], (x, t) => ({ ...x, days: { ...x.days, [k]: t } }), 'like 30')}
        </div>)}
      </div>
      {typed && <p data-testid="rep-arrived" class="mt-8 text-ink"><a href="#report" class="text-link underline underline-offset-4">The project report below</a> {arrived(p)}</p>}
    </Section>
    <Result s={s} p={p} update={update} use={use} used={used} undo={undo} keep={() => setUsed([])} toCollateral={toCollateral}
      reset={typed
        ? <button type="button" data-testid="rep-clear" class={BUTTON} onClick={clear}>Clear all</button>
        : cleared && <p role="status" class="flex items-center gap-2 text-sm text-ink">Cleared.
          <button type="button" data-testid="rep-clear-undo" class={BUTTON} onClick={unclear}>Undo</button></p>} />
    <Section id="assumed" title="Assumed until changed">
      <ul data-testid="rep-assumed" class="mt-3 max-w-prose list-disc space-y-1 pl-5 text-sm text-ink-muted">
        {assumptionsOf(s).map((a) => <li key={a.id}><span class="font-medium text-ink">{a.what}:</span> {a.shown}. <span class={MUTED}>{a.why}.</span></li>)}
      </ul>
    </Section>
    <Download s={s} p={p} update={update} />
    {/* The answer on every screen of the fields (D-UX-84): text, read out as it changes; only the arrow is a target, 44 px. */}
    {/* In the page from load, empty and unseen, so its first answer is a change and is read out (UX5b). */}
    <div class={typed ? 'sticky bottom-0 z-10 -mx-4 mt-10 flex items-center gap-2 border-t border-line bg-canvas px-4 sm:-mx-8 sm:px-8' : 'sr-only'}>
      <p data-testid="rep-answer-bar" data-answer-echo aria-live="polite" class={typed ? 'flex-1 py-2 text-sm font-medium text-ink' : undefined}>{typed ? barText(p) : ''}</p>
      {typed && <a href="#report" aria-label="To the report" onClick={toAnswer} class="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink hover:bg-surface"><span aria-hidden="true">↓</span></a>}
    </div>
  </div>;
}

const head = (label: string, key: string | number) => <p key={key} class={`pt-2 text-xs font-semibold tracking-wide uppercase ${MUTED}`}>{label}</p>;
const line = (label: string, value: string | undefined, kind: ViewRow['kind'], key: string | number) =>
  <p key={key} class={`flex justify-between gap-3 py-0.5 text-ink ${kind ? 'font-semibold' : ''}`}><span>{label}</span><span class="text-right tabular-nums">{value}</span></p>;

/** One of the report's tables as paper, its years across from 640 px; below, a card a year naming its rows (review finding 7,
 * docs/DESIGN.md, Table). The repayment's rows are its years, so a card a row; a table of one column stays a table. */
function ReportTable({ t }: { t: ViewTable }) {
  const cols = t.columns.length + 1, byRow = t.first === 'Year', cards = t.columns.length > 1;
  return <details open={t.id === 'cost' || t.id === 'finance' || t.id === 'dscr'} class="paper shadow-paper mt-4 rounded-card">
    <summary class="flex min-h-11 cursor-pointer items-center px-4 py-2 font-medium text-ink">{t.title}</summary>
    <div class={`overflow-x-auto px-4 pb-4 ${cards ? 'max-sm:hidden' : ''}`} tabIndex={0} role="region" aria-label={t.title}>
      <table data-testid={`rep-${t.id}`} class="w-full border-collapse text-sm">
        <thead><tr class="border-b border-line">
          <th scope="col" class="py-2 pr-3 text-left font-medium text-ink-muted">{t.first}</th>
          {t.columns.map((c) => <th key={c} scope="col" class="px-2 py-2 text-right font-medium whitespace-nowrap text-ink-muted">{c}</th>)}
        </tr></thead>
        <tbody>
          {t.rows.map((r, i) => r.kind === 'head'
            ? <tr key={i}><th colSpan={cols} scope="colgroup" class="pt-3 pb-1 text-left text-xs font-semibold tracking-wide text-ink-muted uppercase">{r.label}</th></tr>
            : <tr key={i} class={`border-b border-line ${r.kind ? 'border-t border-t-ink/25' : ''}`}>
              <th scope="row" class={`min-w-48 py-1.5 pr-3 text-left ${r.kind ? 'font-semibold' : 'font-normal'} text-ink`}>{r.label}</th>
              {r.values.map((x, k) => <td key={k} class={`px-2 py-1.5 text-right whitespace-nowrap tabular-nums ${r.kind ? 'font-semibold' : ''} text-ink`}>{x}</td>)}
            </tr>)}
        </tbody>
      </table>
    </div>
    {cards && <div class="space-y-3 px-4 pb-4 text-sm sm:hidden">
      {byRow
        ? t.rows.map((r, i) => <div key={i} data-testid={`rep-${t.id}-card-${i}`} class="rounded-control bg-surface p-3">
          <p class="font-medium text-ink">{r.label}</p>
          <div class="mt-1">{t.columns.map((c, k) => line(c, r.values[k], undefined, k))}</div>
        </div>)
        : t.columns.map((c, k) => <div key={c} data-testid={`rep-${t.id}-card-${k}`} class="rounded-control bg-surface p-3">
          <p class="font-medium text-ink">{c}</p>
          <div class="mt-1">{t.rows.map((r, i) => (r.kind === 'head' ? head(r.label, i) : line(r.label, r.values[k], r.kind, i)))}</div>
        </div>)}
    </div>}
  </details>;
}

/** Why it does not work yet: each lender's ratio as a bar against its level in its worst year (D-UX-51), then "Make it
 * viable" (D-UX-50, D-UX-52), worked on a tap since it runs the whole report many times. When a level misses, the engine's
 * plan (MV3): a slider for each lever, set where the plan puts it, the borrower's first; the sliders change nothing above
 * until "Use this plan", while the bars, the verdict and the plan's words follow them (one run of the report each). Each
 * card keeps what the lever does alone (MV2b). Any figure changed closes the board; the promoters' most works it again.
 * The two DSCRs are read against their levels on the key figures, so their bars are not repeated here (review finding 9). */
function Viable({ s, p, update, use, toCollateral }: { s: ReportState; p: ReportPreview; update: Update; use: (l: Levers) => void; toCollateral: (e: Event) => void }) {
  const [v, setV] = useState<ViableView | undefined>();
  const [plan, setPlan] = useState<PlanView | undefined>();
  const [lv, setLv] = useState<Levers>(AS_TYPED);
  const [touched, setTouched] = useState<LeverId[]>([]);
  const base = useMemo(() => JSON.stringify({ ...s, promotersMost: '' }), [s]);
  useEffect(() => { setV(undefined); setPlan(undefined); setTouched([]); }, [base]);
  const replan = (ids: LeverId[], at: Levers) => {
    const q = planOf(s, Object.fromEntries(ids.map((id) => [id, at[id]])));
    setPlan(q); setTouched(ids); if (q) setLv(q.levers);
  };
  useEffect(() => { if (plan) replan(touched, lv); }, [s.promotersMost]);
  const b = useMemo(() => (plan ? boardOf(plan, lv) : undefined), [plan, lv]);
  const move = (id: LeverId, n: number) => { setLv((l) => ({ ...l, [id]: n })); if (!touched.includes(id)) setTouched([...touched, id]); };
  const onKey = new Set(p.view?.key.map((k) => k.check).filter(Boolean));
  const group = (by: 'borrower' | 'lender', title?: string) => {
    const ls = v?.lines.filter((l) => l.by === by) ?? [];
    return ls.length > 0 && <>
      {title && <h4 class="mt-3 text-sm font-medium text-ink">{title}</h4>}
      <ul class="mt-2 space-y-2">{ls.map((l) => <Lever key={l.id} l={l} />)}</ul>
    </>;
  };
  const cards = (by: 'borrower' | 'lender', title: string) => {
    const cs = plan && b ? plan.cards.filter((c) => c.by === by) : [];
    return cs.length > 0 && b && <>
      <h4 class="mt-3 text-sm font-medium text-ink">{title}</h4>
      <ul class="mt-1 space-y-2">{cs.map((c) => <PlanLever key={c.id} id={c.id} head={c.head} m={b.moves[c.id]} value={lv[c.id]} set={(n) => move(c.id, n)}
        alone={v?.lines.find((l) => l.id === ALONE[c.id])} />)}</ul>
    </>;
  };
  const tone = (ok: boolean) => (ok ? 'text-good' : 'text-bad');
  return <div class="mt-6">
    {p.checks && <div data-testid="rep-checks">
      <h3 class="text-title text-ink">{p.misses ? 'Why it does not work yet' : 'Against a lender’s levels'}</h3>
      <p class={HINT}>Each ratio in its worst year; the line is the lender’s level.</p>
      <ul class="mt-1 divide-y divide-line">{p.checks.filter((c) => !onKey.has(c.id)).map((c) => <Bar key={c.id} c={c}>
        {/* Met on the project's own assets, the cover reads once: no note, no ask (UX5b, the critic's finding 3). */}
        {c.id === 'securityCover' && (p.collateralNote || (!s.collateral.trim() && c.verdict !== 'meets')) && <p data-testid="rep-collateral-note" class={HINT}>
          {p.collateralNote}{!s.collateral.trim() && <>{p.collateralNote ? ' ' : ''}<a href="#fld-collateral" data-testid="rep-to-collateral" onClick={toCollateral}
            class="text-link underline underline-offset-4">Type it under More options</a>.</>}</p>}
      </Bar>)}</ul>
    </div>}
    {p.longTerm && <p data-testid="rep-long-term" class="mt-2 text-sm text-bad">{p.longTerm}</p>}
    {!v && <button type="button" data-testid="rep-viable" class={`mt-4 ${BUTTON}`} onClick={() => {
      setV(viableOf(s)); if (p.misses) replan([], AS_TYPED);
      // The button removes itself, so the focus moves to what replaces it (WCAG 2.4.3; DESIGN-LESSONS lesson 1).
      focusNext('[data-testid="rep-plan"], [data-testid="rep-viable-box"]');
    }}>
      {p.misses ? 'Make it viable' : 'How far can sales fall?'}</button>}
    {v && !plan && <div data-testid="rep-viable-box" tabIndex={-1} class="mt-6 border-t-2 border-ink pt-4">
      <h3 class="text-title text-ink">{v.title}</h3>
      {/* The title says "the room" once (review finding 10), so the borrower's group takes no heading of its own. */}
      {group('borrower', v.meets ? undefined : 'Your changes')}
      {group('lender', 'The lender’s, if it agrees')}
      <p class={`mt-2 max-w-prose ${HINT}`}>{v.foot}</p>
    </div>}
    {v && plan && b && <div data-testid="rep-plan" tabIndex={-1} class="mt-6 border-t-2 border-ink pt-4">
      <h3 class="text-title text-ink">The plan: the levers together</h3>
      <p class={HINT}>The engine’s plan, your changes first and the lender’s last. The sliders change none of the figures above until you use the plan.</p>
      <TextField id="fld-promotersMost" class="mt-3" label="The most the promoters can bring in all, if known" hint="Without it, no more of their money is assumed."
        inputMode="decimal" value={s.promotersMost} tidy={tidyAmount} placeholder="like 12 L" invalid={bad(s.promotersMost, amountOf)}
        said={notUnderstood(s.promotersMost, amountOf, '10,00,000 or 10 L')} onCommit={(promotersMost) => update((x) => ({ ...x, promotersMost }))} />
      {b.steps.length
        ? <ol data-testid="rep-plan-steps" class="mt-3 list-decimal space-y-0.5 pl-5 text-sm text-ink">{b.steps.map((t) => <li key={t}>{t}</li>)}</ol>
        : <p data-testid="rep-plan-steps" class="mt-3 text-sm text-ink">No lever moves: nothing within its limit helps.</p>}
      {b.promoters && <p data-testid="rep-plan-promoters" class={`mt-1 text-sm ${b.over ? 'font-medium text-bad' : 'text-ink'}`}>{b.promoters}</p>}
      <p data-testid="rep-plan-verdict" class={`mt-2 text-sm font-medium ${tone(b.works)}`}>{b.verdict}</p>
      {b.still.length > 0 && <ul data-testid="rep-plan-still" class="mt-0.5 list-disc space-y-0.5 pl-5 text-sm text-bad">{b.still.map((t) => <li key={t}>{t}</li>)}</ul>}
      <p data-testid="rep-plan-limits" class={HINT}>{plan.limits}{plan.atLimit ? ` ${plan.atLimit}` : ''}</p>
      <div class="mt-3 flex flex-wrap gap-2">
        {b.steps.length > 0 && <button type="button" data-testid="rep-plan-use" class={FILLED} onClick={() => use(lv)}>Use this plan</button>}
        {touched.length > 0 && <button type="button" data-testid="rep-plan-rest" class={BUTTON} onClick={() => replan(touched, lv)}>Work out the rest</button>}
        {(touched.length > 0 || !sameLevers(lv, plan.levers)) && <button type="button" data-testid="rep-plan-back" class={BUTTON} onClick={() => replan([], AS_TYPED)}>Back to the engine’s plan</button>}
      </div>
      {b.checks && <div data-testid="rep-plan-checks" class="mt-3">
        <h4 class="text-sm font-medium text-ink">With these changes</h4>
        <ul class="mt-1 divide-y divide-line">{b.checks.map((c) => <Bar key={c.id} c={c} pre="rep-plan" />)}</ul>
      </div>}
      {cards('borrower', 'Your changes')}
      {cards('lender', 'The lender’s, if it agrees')}
      {/* Above the page's answer bar, which is pinned to the foot too. */}
      <p data-testid="rep-plan-line" aria-live="polite" class={`sticky bottom-12 mt-2 border-t border-line bg-paper py-2 text-sm font-medium ${tone(b.works)}`}>With these changes: {b.line}</p>
      <p class={`max-w-prose ${HINT}`}>{v.foot}</p>
    </div>}
  </div>;
}

function Result({ s, p, update, use, used, undo, keep, toCollateral, reset }: {
  s: ReportState; p: ReportPreview; update: Update; use: (l: Levers) => void; used: PlanChange[]; undo: () => void; keep: () => void;
  toCollateral: (e: Event) => void; reset: ComponentChildren;
}) {
  const v = p.view, verdict = verdictOf(p), box = 'rounded-control border-l-4 px-3 py-2 text-ink';
  return <Section id="report" title="The project report">
    {reset && <div class="mt-4 flex flex-wrap items-center justify-end gap-2">{reset}</div>}
    {used.length > 0 && <div data-testid="rep-used" role="status" class="mt-3 rounded-control border-l-4 border-accent bg-accent/10 p-3">
      <p class="font-medium text-ink">The plan is used: these figures above changed.</p>
      <ul class="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink tabular-nums">{used.map((c) => <li key={c.key}>{c.label}: {c.was || 'none'} → {c.now}</li>)}</ul>
      <div class="mt-2 flex flex-wrap gap-2">
        <button type="button" data-testid="rep-undo" class={BUTTON} onClick={undo}>Undo</button>
        <button type="button" data-testid="rep-keep" class={BUTTON} onClick={keep}>Keep these</button>
      </div>
    </div>}
    {/* The answer as paper, there at once (docs/DESIGN-SITE.md): the verdict in words and the key figures above the status
        (review finding 3); one tone a meaning, and the status plain when complete, never green under a miss. */}
    <div class="paper shadow-paper mt-6 rounded-card p-4 sm:p-6">
      {verdict && <p data-testid={p.misses ? 'rep-misses' : 'rep-verdict'} data-answer class={`${box} ${TONE[verdict.tone]}`}>{verdict.text}</p>}
      {p.short && <p data-testid="rep-short" class={`mt-3 ${box} ${TONE.bad}`}>{p.short}</p>}
      {v && <dl class="mt-4 grid gap-3 sm:grid-cols-3">
        {v.key.map((k, i) => {
          const c = k.check ? p.checks?.find((x) => x.id === k.check) : undefined;
          return <div key={k.label} data-testid={c ? `rep-check-${c.id}` : undefined} class="rounded-control bg-surface p-3">
            <dt class={`text-sm ${MUTED}`}>{k.label}</dt>
            <dd data-testid={`rep-key-${i}`} class="figure text-2xl text-ink">{k.value}</dd>
            {k.note && <dd class={`text-sm ${MUTED}`}>{k.note}</dd>}
            {c && <dd class="mt-1 text-sm"><span class={c.verdict === 'meets' ? 'text-good' : c.verdict === 'misses' ? 'text-bad' : MUTED}>
              {c.verdict === 'meets' ? 'Meets' : c.verdict === 'misses' ? 'Misses' : 'Not yet read'}</span><span class={MUTED}> · target {c.level}</span></dd>}
            {c?.short && <dd data-testid={`rep-short-${c.id}`} class="mt-0.5 text-sm font-medium text-bad">{c.short}</dd>}
          </div>;
        })}
      </dl>}
      <p data-testid="rep-status" data-answer={verdict ? undefined : true} data-result={p.blocked ? 'blocked' : p.needs.length ? 'provisional' : 'ready'}
        class={`mt-4 inline-block rounded-full px-2.5 py-0.5 text-sm font-medium ${p.blocked ? 'bg-bad-tint text-bad' : p.needs.length || p.short ? 'bg-warn-tint text-warn' : 'bg-surface text-ink'}`}>{statusText(p)}</p>
      {p.blocked && <p role="alert" class={`mt-3 ${box} ${TONE.bad}`}>{p.blocked}</p>}
      {p.needs.length > 0 && <div class="mt-4 text-ink">
        <p class="font-medium">Still needed</p>
        <ul data-testid="rep-needs" class="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink-muted">{p.needs.map((n) => <li key={n}>{n}</li>)}</ul>
      </div>}
      {p.flags.length > 0 && <ul data-testid="rep-flags" class="mt-3 list-disc space-y-0.5 pl-5 text-sm text-warn">{p.flags.map((n) => <li key={n}>{n}</li>)}</ul>}
      {v && !p.blocked && <Viable s={s} p={p} update={update} use={use} toCollateral={toCollateral} />}
    </div>
    {v && v.tables.map((t) => <ReportTable key={t.id} t={t} />)}
  </Section>;
}

function Download({ s, p, update }: { s: ReportState; p: ReportPreview; update: Update }) {
  const f = s.doc, set = (patch: Partial<ReportFacts>) => update((x) => ({ ...x, doc: { ...x.doc, ...patch } }));
  const english = (t: string) => (t.trim() && !printable(t) ? 'The document is in English: type this in English letters.' : undefined);
  const own = docNeeds(f), ready = !!p.view && !p.blocked;
  const go = (kind: FileKind) => {
    const now = new Date();
    save(reportDoc(s, p, isoDate(now)), kind, fileName(s, p, kind), now);
  };
  const field = (id: keyof ReportFacts, label: string, hint?: string) =>
    <TextField id={`fld-rep-${id}`} label={label} hint={hint} value={f[id]} said={english(f[id])} invalid={!!english(f[id])} onCommit={(t) => set({ [id]: t })} />;
  return <Section id="download" title="Download the project report">
    <p class={`mt-2 ${HINT}`}>A PDF for the lender, an Excel copy and a Word copy to edit, made in your browser from the figures above.</p>
    <div class="mt-4 grid gap-4 sm:grid-cols-2">
      {field('name', 'Business’s name')}
      {field('activity', 'What the business does', 'Like “Manufacture of corrugated boxes”.')}
      {field('address', 'Business’s address')}
      {field('lender', 'Lender, if known')}
      {field('preparedBy', 'Prepared by, if any', 'Your name or your firm’s.')}
    </div>
    {ready
      ? <div class="mt-5">
        <p data-testid="rep-doc-status" class={`inline-block rounded-full px-2.5 py-0.5 text-sm font-medium ${own.length
          ? 'bg-warn-tint text-warn' : 'bg-surface text-ink'}`}>{docStatus(s, p)}</p>
        {own.length > 0 && <ul data-testid="rep-doc-needs" class="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink-muted">{own.map((n) => <li key={n}>{n}</li>)}</ul>}
        <div class="mt-3 flex flex-wrap gap-2">
          <button type="button" data-testid="rep-download-pdf" class={FILLED} onClick={() => go('pdf')}>Download PDF</button>
          <button type="button" data-testid="rep-download-xlsx" class={BUTTON} onClick={() => go('xlsx')}>Download Excel</button>
          <button type="button" data-testid="rep-download-docx" class={BUTTON} onClick={() => go('docx')}>Download Word</button>
        </div>
      </div>
      : <p data-testid="rep-doc-wait" class={`mt-4 ${HINT}`}>{p.blocked ? 'No document while the two computations disagree.' : 'The document can be made once the report shows figures.'}</p>}
  </Section>;
}
