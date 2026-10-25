/**
 * The project report for a term loan with working capital. Who the borrower is (it sets the tax); the cost of the
 * project by head; the term loan and any other funds (the promoters' share is worked out); the loan's terms; sales and
 * costs; working capital. Then the report as the engine works it out, provisional while anything is missing, table by
 * table; what it assumes until changed; and the three downloads. Figures: engine/report.ts only, via model.ts.
 */
import { Fragment, type ComponentChildren } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { parseMonth } from '../../../engine/parse';
import { answerRule, AnswerBar, BUTTON, Choice, Claim, Counter, Dash, FILLED, Folded, goTo, HINT, Ledger, Section, STATE, TextField, Tick, InAppNote, useHomeCase, HomeCaseNote, useKept } from '../fields';
import { REPORT_HOME } from './home-case';
import { Bar, Benchmarks, Lever, PlanLever, targetOf } from '../Board';
import { benchmarkFields, inSentence, listed, withBenchmark } from '../board-model';
import { printable } from '../doc/pdf';
import { isoDate, save, type FileKind } from '../download';
import { monthText } from '../dscr/model';
import { overdueNote, todayIso } from '../../../engine/review';
import { sureLower, type Marked } from '../../../engine/sure';
import { docNeeds, docStatus, fileName, reportDoc } from './document';
import { Words } from './Words';
import {
  CGFMU, CGTMSE, MUDRA, PMEGP, REPORT_REVIEW_BY, ACTIVITY_CHOICES, AREA_CHOICES, BORROWER_CHOICES, CATEGORY_CHOICES, EMPTY, HEADS, NO_PRODUCT, REPAYMENT_CHOICES, SCHEME_CHOICES,
  COST_HEADS, MODE_CHOICES, SECURITY_CHOICES, SIMPLE_COST, WC_CHOICES, changedOf, headsSum, wcByOf, withMode, workedLine, type Mode,
  ALONE, AS_TYPED, COLLATERAL_HINT, amountOf, applyPlan, assumptionsOf, boardOf, guaranteeOf, mudraLine, plainOf, planOf, preview, sameLevers, statusText, tarunAsked, tidyAmount, undoPlan, viableOf,
  type LeverId, type Levers, type PlanChange, type PlanView, type ReportFacts, type ReportPreview, type ReportState,
  type ViableView, type ViewRow, type ViewTable,
} from './model';

type Update = (f: (s: ReportState) => ReportState) => void;
const MUTED = 'text-ink-muted';
const SALES_BY: { value: ReportState['salesBy']; label: string }[] = [
  { value: 'drivers', label: 'Each product: how many a month and its price' }, { value: 'typed', label: 'Sales I type, with their growth' }];
const bad = (t: string, read: (t: string) => unknown) => !!t.trim() && read(t) === undefined;
const notUnderstood = (t: string, read: (t: string) => unknown, example: string) => (bad(t, read) ? `Not understood. Type ${example}.` : undefined);
/** A control that removes itself hands the focus on, after the render (WCAG 2.4.3; docs/DESIGN.md, Focus). */
const focusNext = (sel: string) => requestAnimationFrame(() => document.querySelector<HTMLElement>(sel)?.focus());
// The box that changes an assumption, if one does (review finding 8); in simple mode, it opens expert mode first.
const ASSUMED_BOX: Record<string, string> = {
  days: 'fld-days-stock', utilisation: 'fld-utilisation', price: 'fld-priceGrowth', simpleCost: 'fld-cost-land', simpleFunds: 'fld-unsecured', simpleDrawn: 'fld-tl-disbursed',
  simpleMoratorium: 'fld-tl-moratorium', simpleFixedGrowth: 'fld-fixedGrowth', simpleWcRate: 'fld-wcRate',
};
/** The box each of the engine's needs is typed in, by the first words of the need (engine/report.ts, and model.ts's words
 * in simple mode): each missing figure is a link to its box (UX8, review finding 2), in expert mode when only it has one. */
const BOXES: [string, string][] = [
  ['When you will start selling', 'fld-sellFrom'], ['Years to repay', 'fld-years'], ['Fixed costs a month', 'fld-fixedMonth'], ['What backs the loan', 'fld-security'],
  ['The working-capital limit: worked', 'fld-wcBy'], ['The working-capital limit worked', 'fld-wcBy'], ['Costs by head', 'rep-heads'],
  ['Who the borrower', 'fld-borrower'], ['Cost of the project', 'cost'], ['The term loan: its amount', 'fld-tl-amount'],
  ['The term loan: its interest', 'fld-tl-rate'], ['The term loan: the month', 'fld-tl-disbursed'], ['The term loan: the moratorium', 'fld-tl-moratorium'],
  ['The term loan: the number', 'fld-tl-instalments'], ['The term loan: how', 'fld-tl-repayment'], ['Capital subsidy', 'fld-subsidy'],
  ['Unsecured', 'fld-unsecured'], ['Sales in', 'fld-sales'], ['Sales: growth', 'fld-salesGrowth'], ['Use of the capacity', 'fld-utilisation'], ['The price: growth', 'fld-priceGrowth'],
  ['Months from', 'fld-monthsToStart'], ['PMEGP: the borrower', 'fld-category'], ['PMEGP: a town', 'fld-area'], ['PMEGP: manufacturing', 'fld-activity'],
  ['Materials', 'fld-variablePct'], ['Fixed costs in', 'fld-fixed'], ['Fixed costs: growth', 'fld-fixedGrowth'], ['Days of stock', 'fld-days-stock'],
  ['Days of debtors', 'fld-days-debtors'], ['Days of creditors', 'fld-days-creditors'], ['The working-capital limit sought', 'fld-wcLimit'],
  ['The working-capital limit: its', 'fld-wcRate'], ['The collateral', 'fld-collateral'],
  ['Mudra: the term loan and', 'fld-tl-amount'], ['Mudra: the loans come', 'fld-tarun'], ['CGTMSE: the loans', 'fld-cgtmse'], ['The guarantee fee', 'fld-feeRate'],
];
// A product's line (D-UX-109): "Sales, line 2: the price a unit" is the price's box on the second line.
const LINE_FACT: [string, string][] = [['what', 'name'], ['how many', 'units'], ['the price', 'price']];
const boxOf = (need: string): [string, string] | undefined => {
  const m = /^Sales, line (\d+): (.*)$/.exec(need), fact = m && LINE_FACT.find(([w]) => m[2].startsWith(w));
  return fact ? [need, `fld-product-${Number((m as RegExpExecArray)[1]) - 1}-${fact[1]}`] : BOXES.find(([w]) => need.startsWith(w));
};
/** One tone a meaning (docs/DESIGN-SITE.md, Colours): good meets, warn provisional, bad misses. */

/** The answer in words (review finding 3): the model's own sentence when a level misses; else what meets and what it cannot
 * read yet. Words only, from the model's checks; no figure. */
function verdictOf(p: ReportPreview): { text: string; tone: 'good' | 'warn' | 'bad' } | undefined {
  if (!p.view || p.blocked) return undefined;
  if (p.misses) return { text: p.misses, tone: 'bad' };
  const wait = (p.checks ?? []).filter((c) => c.verdict === 'wait').map((c) => inSentence(c.label));
  const which = p.benchmarks ? 'benchmark ratio, yours where you changed them,' : 'default benchmark ratio';
  return wait.length ? { text: `It meets every ${which} it can read now; not yet read: ${listed(wait)}.`, tone: 'warn' } : { text: `It meets every ${which.replace(/,$/, '')}.`, tone: 'good' };
}

/** The answer bar's words (D-UX-84): the lowest DSCR as the model gives it, the verdict and the status. */
function barText(p: ReportPreview) {
  if (p.blocked || !p.view) return statusText(p);
  const lowest = p.view.key.find((k) => k.check === 'dscrLowest'), misses = (p.checks ?? []).filter((c) => c.verdict === 'misses');
  const said = misses.length ? (misses.length > 1 ? 'Misses the benchmarks' : 'Misses a benchmark') : p.benchmarks ? 'Meets your benchmarks' : 'Meets the benchmarks it reads';
  return [lowest && `Lowest DSCR ${lowest.value}`, said, statusText(p)].filter(Boolean).join(' · ');
}

/** Under the last input section (review finding 8): whether the report below has figures, linked to it. */
function arrived(p: ReportPreview) {
  if (p.blocked) return 'has no figures: its two computations disagree.';
  if (p.view) return p.short ? `has its figures. ${statusText(p)}.` : 'has its figures.';
  return `still needs ${p.needs.length === 1 ? 'one thing' : `${p.needs.length} things`}, listed there.`;
}

/** The mode last picked on this device (D-UX-112): the page opens in simple mode until expert is picked. */
const MODE_KEY = 'report-mode';
const savedMode = (): Mode => { try { return localStorage.getItem(MODE_KEY) === 'expert' ? 'expert' : 'simple'; } catch { return 'simple'; } };
const saveMode = (m: Mode) => { try { localStorage.setItem(MODE_KEY, m); } catch { /* the mode is a convenience */ } };

export function ReportCalculator() {
  const [s, setS] = useState<ReportState>({ ...EMPTY, mode: 'simple' });
  useEffect(() => { if (savedMode() === 'expert') setS((x) => withMode(x, 'expert')); }, []);
  const home = useHomeCase(setS, () => REPORT_HOME);
  const update: Update = (f) => setS(f);
  const p = useMemo(() => preview(s), [s]);
  const simple = s.mode === 'simple', blank = { ...EMPTY, mode: s.mode };
  const typed = JSON.stringify(s) !== JSON.stringify(blank);
  useKept('report', s, setS, blank);
  const toMode = (m: Mode) => { saveMode(m); update((x) => withMode(x, m)); };
  // A box only expert mode has: switch to it, then focus the box.
  const toExpert = (id: string) => (e: Event) => { e.preventDefault(); toMode('expert'); focusNext(`#${id}`); };
  // Clear all, with an undo until the next figure is typed (review finding 5), as on the CMA.
  const [cleared, setCleared] = useState<ReportState>();
  useEffect(() => { if (typed) setCleared(undefined); }, [typed]);
  // "Use this plan" (MV3): the fields it wrote, each marked with what it was, until undone or kept.
  const [used, setUsed] = useState<PlanChange[]>([]);
  const use = (l: Levers) => { const a = applyPlan(s, l); setS(a.s); setUsed(a.changes); };
  const undo = () => { setS((x) => undoPlan(x, used)); setUsed([]); };
  const clear = () => { setCleared(s); setS(blank); setUsed([]); focusNext('[data-testid="rep-clear-undo"]'); };
  const unclear = () => { if (cleared) setS(cleared); setCleared(undefined); focusNext('[data-testid="rep-clear"]'); };
  // The security cover's row links to the collateral field (review finding 4); in simple mode, property is chosen first.
  const toCollateral = (e: Event) => { e.preventDefault(); if (simple) update((x) => ({ ...x, security: 'property' })); focusNext('#fld-collateral'); };
  // A missing figure's link: to its box, in expert mode when only it has one.
  const toBox = (need: string) => (e: Event) => {
    const b = boxOf(need);
    if (!b) return;
    return document.getElementById(b[1]) ? goTo(b[1])(e) : toExpert(b[1])(e);
  };
  const mark = (id: string, hint?: string) => { const c = used.find((u) => u.field === id); return c ? `Changed by the plan; it was ${c.was || 'empty'}.${hint ? ` ${hint}` : ''}` : hint; };
  // Each setter builds on the latest state (x), never on the one this render saw.
  const amount = (id: string, label: string, value: string, set: (x: ReportState, t: string) => ReportState, hint?: string) =>
    <TextField id={id} label={label} unit="Rs." hint={mark(id, hint)} inputMode="decimal" value={value} tidy={tidyAmount}
      invalid={bad(value, amountOf)} said={notUnderstood(value, amountOf, '10,00,000 or 10 L')} onCommit={(t) => update((x) => set(x, t))} />;
  // A figure with its unit in the box and no example there (UX9, review finding 6); one the page assumes says so in the box.
  const percent = (id: string, label: string, value: string, set: (x: ReportState, t: string) => ReportState, unit?: string, assumed?: string, hint?: string) =>
    <TextField id={id} label={label} unit={unit} assumed={!!assumed && value === assumed} hint={mark(id, hint)} inputMode="decimal" value={value}
      invalid={bad(value, plainOf)} said={notUnderstood(value, plainOf, 'a number, like 10')} onCommit={(t) => update((x) => set(x, t))} />;
  const tick = (id: string, label: string, on: boolean, set: (x: ReportState, v: boolean) => ReportState, hint?: string) =>
    <label class="mt-4 flex items-start gap-2 text-ink">
      <input id={id} type="checkbox" class="mt-1" checked={on} onChange={(e) => { const v = (e.currentTarget as HTMLInputElement).checked; update((x) => set(x, v)); }} />
      <span>{label}{hint && <span class={`block text-sm ${MUTED}`}>{hint}</span>}</span>
    </label>;
  const g = guaranteeOf(s);
  // From 1024 px the questions stand left and the answer panel right (UX8, D-UX-106); the report's tables, what it assumes
  // and the download run the full width below.
  const hv = headsSum(s, 'variable'), hf = headsSum(s, 'fixed'), by = wcByOf(s), changed = changedOf(s), worked = workedLine(s);
  const sum = (testid: string, text: string) => <p data-testid={testid} class="mt-2 self-end text-ink sm:col-span-1">{text}</p>;
  const collateralBox = () => amount('fld-collateral', 'Collateral: its market value', s.collateral, (x, collateral) => ({ ...x, collateral }), `Property offered beside the project's assets. ${COLLATERAL_HINT}`);
  // From 1024 px the questions stand left and the answer panel right (UX8, D-UX-106); the report's tables, what it assumes
  // and the download run the full width below. Simple mode asks its dozen questions; expert mode every field (D-UX-112).
  return <div class="lg:grid lg:grid-cols-tool-grid lg:gap-x-10"><div class="lg:col-start-1 lg:row-start-1">
    <HomeCaseNote on={home} />
    <Choice name="fld-mode" legend="How much to ask" options={MODE_CHOICES} value={s.mode ?? 'expert'} columns onChange={toMode} />
    <Choice name="fld-borrower" legend="Who is the borrower? It sets the tax." options={BORROWER_CHOICES} value={s.borrower} columns
      onChange={(borrower) => update((x) => ({ ...x, borrower }))} />
    <Section id="cost" title="Cost of the project">
      <p class={`mt-2 ${HINT}`}>Leave a head empty if the project has none. The margin for working capital is worked out and added.</p>
      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        {HEADS.filter((h) => !simple || SIMPLE_COST.includes(h.id)).map((h) => <Fragment key={h.id}>{amount(`fld-cost-${h.id}`, h.label, s.cost[h.id], (x, t) => ({ ...x, cost: { ...x.cost, [h.id]: t } }))}</Fragment>)}
      </div>
    </Section>
    <Section id="finance" title="Means of finance">
      <p class={`mt-2 ${HINT}`}>The promoters bring in the rest of the cost of the project; it is worked out.</p>
      <Choice name="fld-scheme" legend="A government scheme" options={SCHEME_CHOICES} value={s.scheme} columns
        onChange={(scheme) => update((x) => ({ ...x, scheme }))} />
      {s.scheme === 'pmegp' && <>
        <p class={`mt-2 ${HINT}`}>The margin money is worked out by the scheme's rules, the guideline of 2023: {sureLower(PMEGP as Marked)}. {overdueNote(REPORT_REVIEW_BY, todayIso())}</p>
        <Choice name="fld-category" legend="The borrower's category" options={CATEGORY_CHOICES} value={s.category}
          onChange={(category) => update((x) => ({ ...x, category }))} />
        <Choice name="fld-area" legend="Where the unit is" options={AREA_CHOICES} value={s.area} columns
          onChange={(area) => update((x) => ({ ...x, area }))} />
        <Choice name="fld-activity" legend="What it does" options={ACTIVITY_CHOICES} value={s.activity} columns
          onChange={(activity) => update((x) => ({ ...x, activity }))} />
        <p class="mt-4 font-medium text-ink">The scheme finances the project only if each of these holds:</p>
        <ul data-testid="rep-pmegp-conditions" class="mt-2 list-disc space-y-1 pl-5 text-ink">{PMEGP.conditions.map((c) => <li key={c}>{c}</li>)}</ul>
        {tick('fld-pmegp-confirmed', 'Each of these holds for this project', !!s.pmegpConfirmed, (x, pmegpConfirmed) => ({ ...x, pmegpConfirmed }))}
      </>}
      {s.scheme === 'mudra' && <div data-testid="rep-mudra">
        <p class={`mt-2 ${HINT}`}>Mudra lends up to Rs. {tidyAmount(String(MUDRA.mostInAll))} in all, the term loan and the working-capital limit together, at the bank's own rate: {MUDRA.levels.map((v) => `${v.label} up to Rs. ${tidyAmount(String(v.upTo))}`).join(', ')}.</p>
        <p data-testid="rep-mudra-level" class="mt-2 font-medium text-ink">{mudraLine(s)}</p>
        <p data-testid="rep-mudra-collateral" class={`mt-2 ${HINT}`}>No collateral needed up to Rs. {tidyAmount(String(MUDRA.collateralFreeUpTo))}: {CGFMU.label.split(',')[0]} guarantees the loan, for a fee of {CGFMU.ratePct}% a year, in the projections as a finance cost. Apply on <a class="text-link underline underline-offset-4" href={MUDRA.apply.url} target="_blank" rel="noopener noreferrer">{MUDRA.apply.label}</a>.</p>
        {tarunAsked(s) && tick('fld-tarun', 'The borrower has taken and repaid a Tarun loan', !!s.tarunRepaid, (x, tarunRepaid) => ({ ...x, tarunRepaid }), `Only then Tarun Plus, above Rs. ${tidyAmount(String(MUDRA.levels[MUDRA.levels.length - 2].upTo))}.`)}
      </div>}
      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        {amount('fld-tl-amount', s.scheme === 'pmegp' ? 'Term loan sanctioned' : 'Term loan', s.loan.amount, (x, t) => ({ ...x, loan: { ...x.loan, amount: t } }))}
        {!simple && s.scheme !== 'pmegp' && amount('fld-subsidy', 'Capital subsidy, if any', s.subsidy, (x, subsidy) => ({ ...x, subsidy }))}
        {!simple && amount('fld-unsecured', 'Unsecured loans, if any', s.unsecured, (x, unsecured) => ({ ...x, unsecured }))}
      </div>
    </Section>
    <Section id="loan" title="The term loan">
      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        {percent('fld-tl-rate', 'Interest rate (% a year)', s.loan.ratePct, (x, ratePct) => ({ ...x, loan: { ...x.loan, ratePct } }), '%')}
        {simple ? percent('fld-years', 'Years to repay', s.years ?? '', (x, years) => ({ ...x, years }), 'years', undefined, 'By EMI every month, from the month you start selling.') : <>
          <TextField id="fld-tl-disbursed" label="First drawn (month)" type="month" value={s.loan.disbursed}
            said={s.loan.disbursed.trim() ? (parseMonth(s.loan.disbursed) ? monthText(parseMonth(s.loan.disbursed) as string) : 'Not understood. Type 2026-04 or Apr 2026.') : undefined}
            onCommit={(disbursed) => update((x) => ({ ...x, loan: { ...x.loan, disbursed } }))} />
          {percent('fld-tl-moratorium', 'Moratorium (months; 0 if none)', s.loan.moratoriumMonths, (x, moratoriumMonths) => ({ ...x, loan: { ...x.loan, moratoriumMonths } }), 'months')}
          {percent('fld-tl-instalments', 'Number of instalments', s.loan.instalments, (x, instalments) => ({ ...x, loan: { ...x.loan, instalments } }))}
        </>}
      </div>
      {!simple && <Choice name="fld-tl-repayment" legend="How it is repaid" options={REPAYMENT_CHOICES} value={s.loan.repayment}
        onChange={(repayment) => update((x) => ({ ...x, loan: { ...x.loan, repayment } }))} />}
      {simple && s.scheme !== 'mudra' && <>
        <Choice name="fld-security" legend="What backs the loan besides the project's own assets?" options={SECURITY_CHOICES} value={s.security}
          onChange={(security) => update((x) => ({ ...x, security }))} />
        {s.security === 'property' && <div class="mt-4 grid gap-4 sm:grid-cols-2">{collateralBox()}</div>}
      </>}
    </Section>
    <Section id="operations" title="Sales and costs">
      {!simple && <Choice name="fld-salesBy" legend="Sales come from" options={SALES_BY} value={s.salesBy} columns
        onChange={(salesBy) => update((x) => ({ ...x, salesBy }))} />}
      {/* One line per product or service (D-UX-109): what it is, how many a month at full running, its price; they add up to sales. */}
      {s.salesBy === 'drivers' && <>
        {s.products.map((pr, k) => {
          const set = (f: keyof typeof pr) => (x: ReportState, t: string) => ({ ...x, products: x.products.map((q, i) => (i === k ? { ...q, [f]: t } : q)) });
          return <fieldset key={k} data-testid={`rep-product-${k}`} class="mt-4">
            <legend class="font-medium text-ink">{s.products.length > 1 ? `Product or service ${k + 1}` : 'What it sells'}</legend>
            <div class="mt-2 grid gap-4 sm:grid-cols-3">
              <TextField id={`fld-product-${k}-name`} label="What it is" value={pr.name} onCommit={(t) => update((x) => set('name')(x, t))} />
              {percent(`fld-product-${k}-units`, 'How many a month at full running', pr.units, set('units'))}
              {amount(`fld-product-${k}-price`, 'Price a unit', pr.price, set('price'))}
            </div>
            {k > 0 && <button type="button" data-testid={`rep-product-remove-${k}`} class="mt-2 min-h-11 text-link underline underline-offset-4"
              onClick={() => update((x) => ({ ...x, products: x.products.filter((_, i) => i !== k) }))}>Remove this line</button>}
          </fieldset>;
        })}
        <button type="button" data-testid="rep-product-add" class="mt-2 min-h-11 text-link underline underline-offset-4"
          onClick={() => update((x) => ({ ...x, products: [...x.products, NO_PRODUCT] }))}>Add another product or service</button>
      </>}
      {simple && s.salesBy === 'typed' && <p class="mt-4 text-ink">Sales are typed by year in expert mode.</p>}
      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        {simple ? <TextField id="fld-sellFrom" label="When will you start selling?" type="month" value={s.sellFrom ?? ''}
            hint={'The moratorium runs until then.'}
            said={s.sellFrom?.trim() ? (parseMonth(s.sellFrom) ? monthText(parseMonth(s.sellFrom) as string) : 'Not understood. Type 2027-03 or Mar 2027.') : undefined}
            onCommit={(sellFrom) => update((x) => ({ ...x, sellFrom }))} />
          : percent('fld-monthsToStart', 'Months from the loan to the first sales (0 if at once)', s.monthsToStart, (x, monthsToStart) => ({ ...x, monthsToStart }), 'months')}
        {hv ? sum('rep-variable-sum', hv) : percent('fld-variablePct', 'Materials and other variable costs (% of sales)', s.variablePct, (x, variablePct) => ({ ...x, variablePct }), '%')}
        {hf ? sum('rep-fixed-sum', hf) : simple ? amount('fld-fixedMonth', 'Fixed costs a month', s.fixedMonth ?? '', (x, fixedMonth) => ({ ...x, fixedMonth }), 'Salaries, rent and other overheads.')
          : amount('fld-fixed', 'Fixed costs in a full first year', s.fixed, (x, fixed) => ({ ...x, fixed }), 'Salaries, rent and other overheads.')}
        {!simple && percent('fld-fixedGrowth', 'Fixed costs: growth a year (%)', s.fixedGrowth, (x, fixedGrowth) => ({ ...x, fixedGrowth }), '%')}
      </div>
      {!simple && <fieldset id="rep-heads" class="mt-6">
        <legend class="font-medium text-ink">Costs by head, if you have them</legend>
        <p class={`mt-1 ${HINT}`}>Each named in the profit and loss; a side with a head typed is added up from its heads.</p>
        <div class="mt-2 grid gap-4 sm:grid-cols-2">
          {COST_HEADS.variable.map((h) => <Fragment key={h.id}>{percent(`fld-head-${h.id}`, `${h.label} (% of sales)`, s.heads?.variable?.[h.id] ?? '',
            (x, t) => ({ ...x, heads: { ...x.heads, variable: { ...x.heads?.variable, [h.id]: t } } }), '%', undefined, 'hint' in h ? h.hint : undefined)}</Fragment>)}
          {COST_HEADS.fixed.map((h) => <Fragment key={h.id}>{amount(`fld-head-${h.id}`, `${h.label} a month`, s.heads?.fixed?.[h.id] ?? '',
            (x, t) => ({ ...x, heads: { ...x.heads, fixed: { ...x.heads?.fixed, [h.id]: t } } }))}</Fragment>)}
        </div>
      </fieldset>}
      {!simple && <>
      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        {s.salesBy === 'drivers' ? <>
          <TextField id="fld-utilisation" label="Use of the capacity by year (%)" unit="%" assumed={s.utilisation === EMPTY.utilisation} hint={mark('fld-utilisation', 'One a year from the first sales, like 60, 70, 80; the last holds after.')} value={s.utilisation}
            onCommit={(utilisation) => update((x) => ({ ...x, utilisation }))} />
          {percent('fld-priceGrowth', 'The price: growth a year (%)', s.priceGrowth, (x, priceGrowth) => ({ ...x, priceGrowth }), '%', EMPTY.priceGrowth)}
        </> : <>
          {amount('fld-sales', 'Sales in a full first year', s.sales, (x, sales) => ({ ...x, sales }))}
          {percent('fld-salesGrowth', 'Sales: growth a year (%)', s.salesGrowth, (x, salesGrowth) => ({ ...x, salesGrowth }), '%')}
        </>}
        {s.scheme !== 'mudra' && collateralBox()}
      </div>
      {s.scheme !== 'mudra' && tick('fld-cgtmse', 'CGTMSE guarantees the loans', !!s.cgtmse, (x, cgtmse) => ({ ...x, cgtmse }),
        `Its fee, ${CGTMSE.slabs[0].ratePct}% to ${CGTMSE.slabs[CGTMSE.slabs.length - 1].ratePct.toFixed(2)}% a year by the loans in all, goes into the projections as a finance cost.`)}
      {s.scheme !== 'mudra' && s.cgtmse && <fieldset class="mt-4">
        <legend class="font-medium text-ink">Concessions that apply, each {CGTMSE.concessionPct}% off the fee</legend>
        {CGTMSE.groups.map((t, k) => <Fragment key={k}>{tick(`fld-concession-${k}`, t, !!s.concessions?.[k], (x, v) => ({ ...x, concessions: CGTMSE.groups.map((_, i) => (i === k ? v : !!x.concessions?.[i])) }))}</Fragment>)}
      </fieldset>}
      {g && <div class="mt-4 grid gap-4 sm:grid-cols-2">
        {percent('fld-feeRate', 'The guarantee fee, if the lender quotes another rate (% a year)', s.feeRate, (x, feeRate) => ({ ...x, feeRate }), '%', undefined,
          g === 'cgfmu' ? `Left empty, CGFMU's ${CGFMU.ratePct}% a year.` : 'Left empty, CGTMSE’s rate for the loans in all, less the concessions ticked.')}
      </div>}
      </>}
    </Section>
    <Section id="wc" title="Working capital">
      <Choice name="fld-wcBy" legend="The working-capital limit (cash credit)" options={WC_CHOICES} value={by} columns
        onChange={(wcBy) => update((x) => ({ ...x, wcBy }))} />
      {worked && <p data-testid="rep-worked" class="mt-2 text-ink">{worked}</p>}
      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        {(simple ? by === 'typed' : by !== 'worked' && by !== 'none') && amount('fld-wcLimit', 'Working-capital limit sought', s.wcLimit, (x, wcLimit) => ({ ...x, wcLimit }))}
        {!simple && <>
          {percent('fld-wcRate', 'Its interest rate (% a year)', s.wcRate, (x, wcRate) => ({ ...x, wcRate }), '%')}
          {(['stock', 'debtors', 'creditors'] as const).map((k) => <Fragment key={k}>
            {percent(`fld-days-${k}`, `Days of ${k}`, s.days[k], (x, t) => ({ ...x, days: { ...x.days, [k]: t } }), 'days', EMPTY.days[k])}
          </Fragment>)}
        </>}
      </div>
      {changed.length > 0 && <div data-testid="rep-changed" class="mt-6 rounded-card bg-surface px-4 py-3">
        <p class="font-medium text-ink">Set in expert mode, and used:</p>
        <ul class="mt-2 list-disc space-y-1 pl-5 text-ink">{changed.map((c) => <li key={c}>{c}</li>)}</ul>
        <button type="button" data-testid="rep-to-expert" class="mt-2 min-h-11 text-link underline underline-offset-4" onClick={() => toMode('expert')}>Change them in expert mode</button>
      </div>}
      {typed && <p data-testid="rep-arrived" class="mt-8 text-ink lg:hidden"><a href="#report" class="text-link underline underline-offset-4">The project report below</a> {arrived(p)}</p>}
    </Section>
    </div>
    <Result s={s} p={p} update={update} use={use} used={used} undo={undo} keep={() => setUsed([])} toCollateral={toCollateral} toBox={toBox}
      reset={typed
        ? <button type="button" data-testid="rep-clear" class={BUTTON} onClick={clear}>Clear all</button>
        : cleared && <p role="status" class="flex items-center gap-2 text-sm text-ink">Cleared.
          <button type="button" data-testid="rep-clear-undo" class={BUTTON} onClick={unclear}>Undo</button></p>} />
    <div class="lg:col-span-2 lg:row-start-2">
    {p.view && p.view.tables.map((t) => <ReportTable key={t.id} t={t} />)}
    <Ledger id="assumed" testid="rep-assumed" title="Assumed until changed" rows={assumptionsOf(s).map((a) => {
      const to = ASSUMED_BOX[a.id];
      return { ...a, to, go: to && simple ? toExpert(to) : undefined };
    })} />
    <Download s={s} p={p} update={update} />
    </div>
    {/* The answer on every screen of the fields (D-UX-84), from load as on every tool (UX8, review finding 13): text, read
        out as it changes; only the arrow is a target, 44 px. From 1024 px the panel stands beside, so only the words stay. */}
    <AnswerBar to="report" label="To the report" testid="rep-answer-bar" text={barText(p)} />
  </div>;
}

const head = (label: string, key: string | number) => <p key={key} class={`pt-2 text-xs font-semibold tracking-wide uppercase ${MUTED}`}>{label}</p>;
const line = (label: string, value: string | undefined, kind: ViewRow['kind'], key: string | number) =>
  <p key={key} class={`flex justify-between gap-3 py-0.5 text-ink ${kind ? 'font-semibold' : ''}`}><span>{label}</span><span class="text-right tabular-nums">{value}</span></p>;

/** One of the report's tables as paper, its years across from 640 px; below, a card a year naming its rows (review finding 7,
 * docs/DESIGN.md, Table). The repayment's rows are its years, so a card a row; a table of one column stays a table. */
function ReportTable({ t }: { t: ViewTable }) {
  const cols = t.columns.length + 1, byRow = t.first === 'Year', cards = t.columns.length > 1;
  return <details open={t.id === 'cost' || t.id === 'finance' || t.id === 'dscr'} class="paper mt-4 rounded-card">
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
  const [worked, setV] = useState<{ on: string; v: ViableView }>();
  const [planned, setPlan] = useState<{ on: string; plan: PlanView | undefined }>();
  const [lv, setLv] = useState<Levers>(AS_TYPED);
  const [touched, setTouched] = useState<LeverId[]>([]);
  const base = useMemo(() => JSON.stringify({ ...s, promotersMost: '' }), [s]);
  // The board shows only on the figures it was worked on, read at render: a reset in an effect ran after paint and could
  // undo a tap that landed between a figure's render and that effect (the site check's intermittent miss, UX6).
  const v = worked?.on === base ? worked.v : undefined, plan = planned?.on === base ? planned.plan : undefined;
  const replan = (ids: LeverId[], at: Levers) => {
    const q = planOf(s, Object.fromEntries(ids.map((id) => [id, at[id]])));
    setPlan({ on: base, plan: q }); setTouched(ids); if (q) setLv(q.levers);
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
      <h3 class="text-title text-ink">{p.misses ? 'Why it does not work yet' : `${p.checks.some((c) => c.verdict === 'wait') ? 'Against' : 'Meets'} the ${p.benchmarks ? '' : 'default '}benchmark ratios`}</h3>
      {p.benchmarks && <p data-testid="rep-benchmarks-note" class="mt-1 text-sm text-warn">{p.benchmarks}</p>}
      <ul class="mt-1 divide-y divide-line">{p.checks.filter((c) => !onKey.has(c.id)).map((c) => <Bar key={c.id} c={c}>
        {/* Met on the project's own assets, the cover reads once: no note, no ask (UX5b, the critic's finding 3). */}
        {c.id === 'securityCover' && (p.collateralNote || (!s.collateral.trim() && c.verdict !== 'meets')) && <p data-testid="rep-collateral-note" class={HINT}>
          {p.collateralNote}{!s.collateral.trim() && <>{p.collateralNote ? ' ' : ''}<a href="#fld-collateral" data-testid="rep-to-collateral" onClick={toCollateral}
            class="text-link underline underline-offset-4">Type its market value</a>.</>}</p>}
      </Bar>)}</ul>
      {/* How to read the bars, under them as a chart its key (UX9b, the UX9 critic). */}
      <p class={`mt-1 ${HINT}`}>Each ratio in its worst year; the line is its benchmark.</p>
      <Benchmarks pre="rep" fields={benchmarkFields('fresh', s.benchmarks)} reset={() => update((t) => ({ ...t, benchmarks: undefined }))}
        set={(id, t) => update((u) => ({ ...u, benchmarks: withBenchmark(u.benchmarks, id, t) }))} />
    </div>}
    {p.longTerm && <p data-testid="rep-long-term" class="mt-2 text-sm text-bad">{p.longTerm}</p>}
    {!v && <button type="button" data-testid="rep-viable" class={`mt-4 ${BUTTON}`} onClick={() => {
      const w = viableOf(s); if (w) setV({ on: base, v: w }); if (p.misses) replan([], AS_TYPED);
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
        unit="Rs." inputMode="decimal" value={s.promotersMost} tidy={tidyAmount} invalid={bad(s.promotersMost, amountOf)}
        said={notUnderstood(s.promotersMost, amountOf, '10,00,000 or 10 L')} onCommit={(promotersMost) => update((x) => ({ ...x, promotersMost }))} />
      {b.steps.length
        ? <ol data-testid="rep-plan-steps" class="mt-3 list-decimal space-y-0.5 pl-5 text-sm text-ink">{b.steps.map((t) => <li key={t}>{t}</li>)}</ol>
        : <p data-testid="rep-plan-steps" class="mt-3 text-sm text-ink">No lever moves: nothing within its limit helps.</p>}
      {b.promoters && <p data-testid="rep-plan-promoters" class={`mt-1 text-sm ${b.over ? 'font-medium text-bad' : 'text-ink'}`}>{b.promoters}</p>}
      <p data-testid="rep-plan-verdict" class={`mt-2 text-sm font-medium ${tone(b.works)}`}>{b.verdict}</p>
      {b.still.length > 0 && <ul data-testid="rep-plan-still" class="mt-0.5 list-disc space-y-0.5 pl-5 text-sm text-bad">{b.still.map((t) => <li key={t}>{t}</li>)}</ul>}
      <p data-testid="rep-plan-limits" class={HINT}>{plan.limits}{plan.atLimit ? ` ${plan.atLimit}` : ''}</p>
      {plan.mudraShort && <p data-testid="rep-mudra-short" class={`mt-2 ${STATE} text-warn`}>{plan.mudraShort}</p>}
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
      <p data-testid="rep-plan-line" data-pinned-line aria-live="polite" class={`sticky bottom-12 lg:bottom-0 mt-2 border-t border-line bg-paper py-2 text-sm font-medium ${tone(b.works)}`}>With these changes: {b.line}</p>
      <p class={`max-w-prose ${HINT}`}>{v.foot}</p>
    </div>}
  </div>;
}

function Result({ s, p, update, use, used, undo, keep, toCollateral, toBox, reset }: {
  s: ReportState; p: ReportPreview; update: Update; use: (l: Levers) => void; used: PlanChange[]; undo: () => void; keep: () => void;
  toCollateral: (e: Event) => void; toBox: (need: string) => (e: Event) => void; reset: ComponentChildren;
}) {
  const v = p.view, verdict = verdictOf(p);
  const result = p.blocked ? 'blocked' : p.needs.length || p.short ? 'provisional' : 'ready';
  // Before the figures, the report's outline: its key figures with "—" for each not yet known, never 0 (UX8, review finding 2).
  const first = p.needs.map(boxOf).find(Boolean)?.[1];
  const key = v?.key ?? [{ label: 'Cost of the project' }, { label: 'Average DSCR', check: 'dscrAverage' }, { label: 'Lowest DSCR', check: 'dscrLowest' }];
  return <div class="lg:col-start-2 lg:row-start-1"><section id="report" aria-labelledby="report-h" class="answer-panel mt-10 lg:mt-4">
    <h2 id="report-h" class="sr-only">The project report</h2>
    {reset && <div class="mb-3 flex flex-wrap items-center justify-end gap-2">{reset}</div>}
    {used.length > 0 && <div data-testid="rep-used" role="status" class="mb-3 rounded-control border-l-4 border-ink bg-surface p-3">
      <p class="font-medium text-ink">The plan is used: these figures changed.</p>
      <ul class="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink tabular-nums">{used.map((c) => <li key={c.key}>{c.label}: {c.was || 'none'} → {c.now}</li>)}</ul>
      <div class="mt-2 flex flex-wrap gap-2">
        <button type="button" data-testid="rep-undo" class={BUTTON} onClick={undo}>Undo</button>
        <button type="button" data-testid="rep-keep" class={BUTTON} onClick={keep}>Keep these</button>
      </div>
    </div>}
    {/* The answer as paper, there from load (docs/DESIGN-SITE.md): the verdict in words and the key figures above the
        status (review finding 3); one tone a meaning, and the status plain when complete, never green under a miss. */}
    <div class="paper shadow-paper rounded-card p-4 sm:p-6">
      {/* The answer is the paper's heading (UX7): a flat claim, its rule solid once final and dashed while provisional. */}
      {verdict && <h3 data-testid={p.misses ? 'rep-misses' : 'rep-verdict'} data-answer class={`text-title text-ink ${answerRule(!p.blocked && !p.needs.length)}`}><Claim text={verdict.text} /></h3>}
      {p.short && <p data-testid="rep-short" class="mt-3 text-sm font-medium text-bad">{p.short}</p>}
      <Counter id="rep-status" result={result} text={statusText(p)} rule={!verdict} answer={!verdict} class={verdict ? 'mt-2' : ''}>
        {p.needs.length > 0 && <ul data-testid="rep-needs" class="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink-muted">{p.needs.map((n) => {
          const b = boxOf(n);
          return <li key={n}>{b ? <a href={`#${b[1]}`} onClick={toBox(n)} class="inline-flex min-h-6 items-center text-link">{n}</a> : n}</li>;
        })}</ul>}
      </Counter>
      {p.blocked && <p role="alert" class={`mt-3 ${answerRule(true)} text-ink`}>{p.blocked}</p>}
      {!p.blocked && <dl class="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-2">
        {key.map((k, i) => {
          const c = k.check && v ? p.checks?.find((x) => x.id === k.check) : undefined;
          return <div key={k.label} data-testid={c ? `rep-check-${c.id}` : undefined} class={`rounded-control bg-surface p-3 ${k.check ? '' : 'lg:col-span-2'}`}>
            <dt class={`text-sm ${MUTED}`}>{k.label}</dt>
            <dd data-testid={`rep-key-${i}`} class="figure text-2xl text-ink">{'value' in k ? k.value : <Dash what={k.label} to={i ? first : 'cost'} />}</dd>
            {'note' in k && k.note && <dd class={`text-sm ${MUTED}`}>{k.note}</dd>}
            {c && <dd class="mt-1 text-sm"><span class={c.verdict === 'meets' ? 'text-good' : c.verdict === 'misses' ? 'text-bad' : MUTED}>
              {c.verdict === 'meets' ? 'Meets' : c.verdict === 'misses' ? 'Misses' : 'Not yet read'}</span><span class={MUTED}> · {targetOf(c)}</span></dd>}
            {c?.short && <dd data-testid={`rep-short-${c.id}`} class="mt-0.5 text-sm font-medium text-bad">{c.short}</dd>}
          </div>;
        })}
      </dl>}
      {p.flags.length > 0 && <ul data-testid="rep-flags" class="mt-3 list-disc space-y-0.5 pl-5 text-sm text-warn">{p.flags.map((n) => <li key={n}>{n}</li>)}</ul>}
      {v && !p.blocked && <Viable s={s} p={p} update={update} use={use} toCollateral={toCollateral} />}
    </div>
  </section></div>;
}

function Download({ s, p, update }: { s: ReportState; p: ReportPreview; update: Update }) {
  const f = s.doc, set = (patch: Partial<ReportFacts>) => update((x) => ({ ...x, doc: { ...x.doc, ...patch } }));
  const english = (t: string) => (t.trim() && !printable(t) ? 'The document is in English: type this in English letters.' : undefined);
  const own = docNeeds(f, s.words), ready = !!p.view && !p.blocked;
  const go = (kind: FileKind) => {
    const now = new Date();
    save(reportDoc(s, p, isoDate(now)), kind, fileName(s, p, kind), now);
  };
  const field = (id: keyof ReportFacts, label: string, hint?: string) =>
    <TextField id={`fld-rep-${id}`} label={label} hint={hint} value={f[id]} said={english(f[id])} invalid={!!english(f[id])} onCommit={(t) => set({ [id]: t })} />;
  // Before the report shows figures the section is one line (UX8, review finding 9).
  if (!ready) return <Folded id="download" title="Download the project report"><span data-testid="rep-doc-wait">{p.blocked
    ? 'No document while the two computations disagree.' : 'A PDF, an Excel copy and a Word copy, once the report shows figures.'}</span></Folded>;
  return <Section id="download" title="Download the project report">
    <p class={`mt-2 ${HINT}`}>A PDF for the lender, an Excel copy and a Word copy to edit, made in your browser from the figures above.</p>
    <div class="mt-4 grid gap-4 sm:grid-cols-2">
      {field('name', 'Business’s name')}
      {field('activity', 'What the business does', 'Like “Manufacture of corrugated boxes”.')}
      {field('address', 'Business’s address')}
      {field('lender', 'Lender, if known')}
      {field('preparedBy', 'Prepared by, if any', 'Your name or your firm’s.')}
    </div>
    <Words s={s} update={update} />
    <div class="mt-5">
        <p data-testid="rep-doc-status" class={`${STATE} ${own.length ? 'text-warn' : 'text-ink'}`}>{!own.length && <Tick />}{docStatus(s, p)}</p>
        {own.length > 0 && <ul data-testid="rep-doc-needs" class="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink-muted">{own.map((n) => <li key={n}>{n}</li>)}</ul>}
        <div class="mt-3 flex flex-wrap gap-2">
          <button type="button" data-testid="rep-download-pdf" class={FILLED} onClick={() => go('pdf')}>Download PDF</button>
          <button type="button" data-testid="rep-download-xlsx" class={BUTTON} onClick={() => go('xlsx')}>Download Excel</button>
          <button type="button" data-testid="rep-download-docx" class={BUTTON} onClick={() => go('docx')}>Download Word</button>
        </div>
        <InAppNote id="rep-in-app" />
      </div>
  </Section>;
}
