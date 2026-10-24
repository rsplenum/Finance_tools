/**
 * The DSCR calculator. The front door (D-UX-10, P1f) asks the owner's eight inputs: who the borrower is, this year's
 * profit and its growth, EMIs already paid, depreciation if any, and the loan's amount, rate and term; the loan is taken
 * as drawn this month, by EMI. Everything else sits under one closed "More options": the detailed form below. It opens
 * with the assumptions in engine/data/defaults.json answered (D-UX-08); each is listed with the results until changed. The two start questions
 * (where the yearly figures come from, how DSCR is worked out) stay on top to change. Then the loan (or the years); who
 * the borrower is (it sets the tax and which existing EMIs count) and the yearly figures, with loans already running as
 * EMIs a month and the new asset's income; the lender's target; and a free preview that stays provisional while anything
 * is missing: the DSCR statement in the layout chartered accountants use, and the repayment schedule. Last, the statement
 * to download: the document's own facts asked once, then a PDF, an Excel copy and a Word copy made in the browser (document.ts).
 * Figures: engine/dscr.ts only, via model.ts.
 */
import { useMemo, useState } from 'preact/hooks';
import { AmountField } from '../AmountField';
import { OPTIONS, PRESETS } from '../../../engine/dscr';
import { LENDER } from '../../../engine/lender';
import { parseMonth } from '../../../engine/parse';
import { leastSure, sureText, type Marked } from '../../../engine/sure';
import { BORROWERS, TAX_STATUS, borrowerOf } from '../../../engine/tax';
import { inr, rs } from '../../../engine/util';
import DSCR_FILE from '../../../engine/data/dscr.json';
import TAX_FILE from '../../../engine/data/tax.json';
import { answerRule, AnswerBar, Why, BUTTON, CellInput, Claim, Choice, Counter, Dash, FILLED, Folded, goTo, HINT, Ledger, type LedgerRow, Section, SourceNote, STATE, TextField, Tick, InAppNote, useHomeCase, HomeCaseNote } from '../fields';
import { DSCR_HOME } from './home-case';
import { printable } from '../doc/pdf';
import { isoDate, openPdf, save as saveFile, type FileKind } from '../download';
import { allNeeds, docNeeds, docStatus, fileName, gstinOf, statementDoc } from './document';
import {
  BORROWER_CHOICES, checkNext, dscrMarks, EXAMPLE_TARGETS, GROUP_TITLES, NO_LENDER, OPTION_KEYS, amountOf, barText, choicesOf, emisAsk, frontDoor, loanRead, modeOf, monthText, numberOf,
  parseFy, presetText, preview, rowValues, rowsOf, statusText, sureLine, targetText, tidyAmount, withBorrower, withFrontNeeds, FRONT, frontAt, withPlanStart, withSource, yearsOf,
  type DocFacts, type LenderLine, type LenderText, type LenderView, type LoanText, type Preview, type RowDef, type RowMode, type RunningText, type ScheduleView, type State, type StatementView, type Years,
} from './model';
import { applyDscrPlan, undoDscrPlan, type DscrChange, type DscrLevers } from './levers';
import { Levels } from './Levels';

type Update = (f: (s: State) => State) => void;
/** The plan's change to a field, said under it until kept or undone. */
type Was = (key: DscrChange['key']) => string | undefined;
const showDate = (iso: string) => iso.split('-').reverse().join('-');
const notUnderstood = (text: string, read: (t: string) => unknown, example: string) =>
  text.trim() && read(text) === undefined ? `Not understood. Try ${example}.` : undefined;
const MUTED = 'text-ink-muted';

export function DscrCalculator() {
  const start = () => frontDoor(isoDate(new Date()).slice(0, 7));
  const [s, setS] = useState<State>(start);
  const home = useHomeCase(setS, () => DSCR_HOME);
  const [more, setMore] = useState(false);
  const update: Update = (f) => setS(f);
  const y = useMemo(() => yearsOf(s), [s]);
  const p = useMemo(() => withFrontNeeds(s, preview(s), y.years[0]), [s, y]);
  const rows = useMemo(() => rowsOf(s), [s]);
  const openMore = () => setMore(true);
  // "Use this plan" (MV5): the loan and the term written, with an undo while the change is fresh.
  const [used, setUsed] = useState<DscrChange[]>([]);
  const use = (l: DscrLevers) => { const a = applyDscrPlan(s, l); setS(a.s); setUsed(a.changes); };
  const undo = () => { setS((x) => undoDscrPlan(x, used)); setUsed([]); };
  const was = (key: DscrChange['key']) => { const c = used.find((u) => u.key === key); return c ? `Changed by the plan; it was ${c.was || 'empty'}.` : undefined; };
  // The answer beside the questions from 1024 px (UX8, D-UX-106): its panel spans the front door and More options, and
  // the working, year by year, runs under both. On a phone the column keeps the old order.
  const results = <>
    <AnswerPanel s={s} p={p} update={update} use={use} used={used} undo={undo} keep={() => setUsed([])} />
    {p.started && <Working s={s} p={p} openMore={openMore} />}
  </>;
  return <div class="lg:grid lg:grid-cols-tool lg:gap-x-12">
    <div class="lg:col-start-1 lg:row-start-1">
      <HomeCaseNote on={home} />
      <ClearAll shown={JSON.stringify(s) !== JSON.stringify(start())} onClear={() => setS(start())} />
      {s.source === 'plan' && <FrontDoor s={s} update={update} openMore={openMore} was={was} />}
    </div>
    {/* On the front door the answer comes before More options (review finding 12); with year-by-year figures, after them. */}
    {s.source === 'plan' && results}
    <details id="more-options" open={more} onToggle={(e) => setMore((e.currentTarget as HTMLDetailsElement).open)} class="mt-12 lg:col-start-1 lg:row-start-2">
      <summary class="flex min-h-11 cursor-pointer items-center rounded-card bg-surface px-4 py-3 font-medium text-link">More options: the method, the loan in full, year-by-year figures</summary>
      <div class="pb-6">
        <Start s={s} update={update} />
        {p.started && <>
          {s.source === 'plan' ? <Loan s={s} update={update} y={y} p={p} was={was} /> : <YearsSection s={s} update={update} y={y} />}
          <Figures s={s} update={update} rows={rows} y={y} p={p} />
          <TargetSection s={s} update={update} />
          {s.source === 'plan' && <LenderSection s={s} update={update} y={y} />}
        </>}
      </div>
    </details>
    {s.source !== 'plan' && results}
    {p.started && <div class="lg:col-span-2 lg:row-start-4"><DownloadSection s={s} p={p} update={update} /></div>}
    {/* The answer's echo is text; only the arrow is a target, 44 px, so a field under the bar can still be tapped (WCAG 2.5.8; UX3). */}
    <AnswerBar to="preview" label="To the results" testid="answer-bar" text={barText(p)} />
  </div>;
}

/**
 * The front door: the owner's eight inputs, written into the same state the detailed form uses, so More options shows
 * them too. Depreciation is optional (empty: none); EMIs already paid are one figure a month (empty: none).
 */
function FrontDoor({ s, update, openMore, was }: { s: State; update: Update; openMore: () => void; was: Was }) {
  const perYear = s.loan.repayment === 'quarterly' ? 4 : 12, k = numberOf(s.loan.instalments);
  const years = k === undefined ? '' : String(+(k / perYear).toFixed(2));
  const emi = s.modes.otherLoans === 'emi' ? s.running[0]?.emi ?? '' : '';
  const dep = s.modes.depreciation === 'none' ? '' : s.cells.depreciation?.[0] ?? '';
  // The field tidies what is typed (5 L → 5,00,000), so only what is not understood is said under it.
  const amountSaid = (t: string) => notUnderstood(t, amountOf, '5,00,000 or 5 L');
  const first = (key: string, t: string) => (x: State) => ({ ...x, cells: { ...x.cells, [key]: [t, ...(x.cells[key] ?? []).slice(1)] } });
  return <section id="front-door" aria-label="The loan and the business" class="mt-4">
    <p class={HINT}>Have year-by-year projections, a moratorium, or a loan already drawn? <a href="#more-options" onClick={openMore}
      class="text-link underline underline-offset-4">Use More options</a>.</p>
    <Choice name="fld-fd-borrower" legend="Who is the borrower?" columns value={s.borrower as string | undefined}
      options={BORROWER_CHOICES.map((b) => ({ value: b.id, label: b.label }))} onChange={(id) => update((x) => withBorrower(x, id))} />
    <div class="mt-4 grid gap-4 sm:grid-cols-2">
      <TextField id="fld-fd-profit" label="This year’s profit before interest, depreciation and tax" unit="Rs." inputMode="decimal" value={s.cells.pbdit?.[0] ?? ''}
        tidy={tidyAmount} said={amountSaid(s.cells.pbdit?.[0] ?? '')}
        onCommit={(t) => update((x) => ({ ...first('pbdit', t)(x), modes: { ...x.modes, pbdit: 'grow' } }))} />
      <TextField id="fld-fd-growth" label="Growth in sales a year (%)" unit="%" inputMode="decimal" hint="Like 10." value={s.rates.pbdit ?? ''}
        said={notUnderstood(s.rates.pbdit ?? '', numberOf, 'a number, like 10')} onCommit={(t) => update((x) => ({ ...x, rates: { ...x.rates, pbdit: t } }))} />
      <TextField id="fld-fd-emis" label="EMIs already paid, a month" unit="Rs." hint={<>Leave empty if none.<Why id="fld-fd-emis-why">{emisAsk(s).replace(/\.?$/, '.')}</Why></>} inputMode="decimal" value={emi} tidy={tidyAmount}
        said={amountSaid(emi)} onCommit={(t) => update((x) => (t.trim()
          ? { ...x, modes: { ...x.modes, otherLoans: 'emi' }, running: [{ emi: t, last: x.running[0]?.last ?? '' }, ...x.running.slice(1)] }
          : { ...x, modes: { ...x.modes, otherLoans: 'none' } }))} />
      <TextField id="fld-fd-depreciation" label="Depreciation a year, if any" unit="Rs." hint="Leave empty if none." inputMode="decimal" value={dep} tidy={tidyAmount}
        said={amountSaid(dep)} onCommit={(t) => update((x) => (t.trim() ? { ...first('depreciation', t)(x), modes: { ...x.modes, depreciation: 'same' } } : { ...x, modes: { ...x.modes, depreciation: 'none' } }))} />
      <TextField id="fld-fd-amount" label="Loan amount" unit="Rs." hint={was('amount')} inputMode="decimal" value={s.loan.amount} tidy={tidyAmount}
        said={amountSaid(s.loan.amount)} onCommit={(t) => update((x) => ({ ...x, loan: { ...x.loan, amount: t } }))} />
      <TextField id="fld-fd-rate" label="Interest rate (% a year)" unit="%" inputMode="decimal" hint="Like 12." value={s.loan.ratePct}
        said={notUnderstood(s.loan.ratePct, numberOf, 'a number, like 12')} onCommit={(t) => update((x) => ({ ...x, loan: { ...x.loan, ratePct: t } }))} />
      <TextField id="fld-fd-years" label="Term (years)" unit="years" hint={was('instalments') ? `${was('instalments')?.replace(/\.$/, '')} instalments.` : 'Like 5.'} inputMode="decimal" value={years}
        said={notUnderstood(years, numberOf, 'a number, like 5')} onCommit={(t) => update((x) => {
          const n = numberOf(t), per = x.loan.repayment === 'quarterly' ? 4 : 12;
          return { ...x, loan: { ...x.loan, instalments: n === undefined ? t : String(Math.round(n * per)) } };
        })} />
    </div>
    {s.door && s.loan.disbursed === s.door.month && <p data-testid="fd-loan-note" class={`mt-3 ${HINT}`}>
      The loan is taken as drawn in {monthText(s.door.month)} and repaid by EMI every month, with no moratorium. Change it under More options.</p>}
  </section>;
}

/** Start again, asked twice so that one stray tap never wipes the figures. */
function ClearAll({ shown, onClear }: { shown: boolean; onClear: () => void }) {
  const [asking, setAsking] = useState(false);
  if (!shown) return null;
  return <div class="mt-4 flex flex-wrap items-center justify-end gap-2 text-sm">
    {asking
      ? <>
        <span class="text-ink">Clear everything you typed?</span>
        <button type="button" data-testid="clear-yes" class={BUTTON} onClick={() => { setAsking(false); onClear(); }}>Yes, clear</button>
        <button type="button" data-testid="clear-no" class={BUTTON} onClick={() => setAsking(false)}>No</button>
      </>
      : <button type="button" data-testid="clear-all" class={BUTTON} onClick={() => setAsking(true)}>Clear all</button>}
  </div>;
}

function Start({ s, update }: { s: State; update: Update }) {
  return <div>
    <Choice name="fld-source" legend="Where do the yearly figures come from?" value={s.source} onChange={(v) => update((x) => withSource(x, v))}
      options={[
        { value: 'own', label: 'My own yearly figures', hint: 'Profit after tax, depreciation, interest and instalments for each year.' },
        { value: 'plan', label: 'Work them out from the loan terms', hint: 'You give profit before interest, depreciation and tax; the page works out the loan’s interest and instalments, the tax, and the repayment schedule.' },
      ]} />
    <div id="method" class="scroll-mt-4">
      <Choice name="fld-method" legend="How is DSCR worked out?" value={s.method} onChange={(v) => update((x) => ({ ...x, method: v }))}
        options={[
          ...PRESETS.map((m) => ({ value: m.id, label: m.label, hint: <>{presetText(m.id)}. {sureText(m as Marked)}.</> })),
          { value: 'choose', label: 'Choose each of the four', hint: 'For a lender who works it out differently.' },
        ]} />
    </div>
    <SourceNote what="Where these methods come from" reviewBy={DSCR_FILE.reviewBy}>
      {PRESETS.map((m) => <span key={m.id} class="mt-1 block"><b>{m.label}:</b> {m.source}. Dated {showDate(m.date)}.</span>)}
    </SourceNote>
    {s.method === 'choose' && OPTION_KEYS.map((k) => <Choice key={k} name={`fld-${k}`} legend={OPTIONS[k].question} options={choicesOf(k)}
      value={s.choice[k]} onChange={(v) => update((x) => ({ ...x, choice: { ...x.choice, [k]: v } }))} />)}
  </div>;
}

function Loan({ s, update, y, p, was }: { s: State; update: Update; y: Years; p: Preview; was: Was }) {
  const l = s.loan, set = (patch: Partial<LoanText>) => update((x) => ({ ...x, loan: { ...x.loan, ...patch } }));
  const read = loanRead(y);
  return <Section id="loan" title="The loan">
    <p class={`mt-2 ${HINT}`}>As in the sanction letter.</p>
    <div class="mt-4"><AmountField value={l.amount} onCommit={(t) => set({ amount: t })} /></div>
    <div class="mt-2 grid gap-4 sm:grid-cols-2">
      <TextField id="fld-ratePct" label="Interest rate, % a year" unit="%" hint="Like 10.5." inputMode="decimal" value={l.ratePct}
        onCommit={(t) => set({ ratePct: t })} said={notUnderstood(l.ratePct, numberOf, '10.5')} />
      <TextField id="fld-disbursed" type="month" label="Month the loan is first drawn" hint="Like 2026-04." value={l.disbursed}
        onCommit={(t) => set({ disbursed: t })} said={notUnderstood(l.disbursed, parseMonth, '2026-04 or Apr 2026')} />
    </div>
    <Choice name="fld-repayment" legend="How is it repaid?" value={l.repayment} onChange={(v) => set({ repayment: v })} options={[
      { value: 'emi', label: 'EMI every month', hint: 'The same amount each month, interest included.' },
      { value: 'monthly', label: 'Equal principal every month', hint: 'Interest on the balance on top, so the payment falls.' },
      { value: 'quarterly', label: 'Equal principal every quarter', hint: 'Interest on the balance is still paid every month.' },
    ]} />
    <div class="mt-6 grid gap-4 sm:grid-cols-2">
      <TextField id="fld-moratoriumMonths" label="Moratorium, months" unit="months" inputMode="numeric" value={l.moratoriumMonths}
        hint="Months before the first instalment, 0 if none; interest is still paid." onCommit={(t) => set({ moratoriumMonths: t })}
        said={notUnderstood(l.moratoriumMonths, numberOf, '6, or 0 if none')} />
      <TextField id="fld-instalments" label="Number of instalments" inputMode="numeric" value={l.instalments}
        hint={was('instalments') ?? (l.repayment === 'quarterly' ? 'Quarterly instalments, after the moratorium.' : l.repayment ? 'Monthly instalments, after the moratorium.' : 'After the moratorium.')}
        onCommit={(t) => set({ instalments: t })} said={notUnderstood(l.instalments, numberOf, '60')} />
    </div>
    {(read || p.schedule) && <div data-testid="loan-read" class="mt-4 space-y-1 rounded-md bg-surface px-3 py-2 text-sm text-ink">
      {p.schedule && <p data-testid="loan-level">{p.schedule.level}</p>}
      {read && <p data-testid="loan-dates">{read}</p>}
    </div>}
  </Section>;
}

function YearsSection({ s, update, y }: { s: State; update: Update; y: Years }) {
  return <Section id="years" title="Years">
    <div class="mt-4 grid gap-4 sm:grid-cols-2">
      <TextField id="fld-firstYear" label="First year" hint="A financial year, April to March, like 2026-27." value={s.firstYear}
        onCommit={(t) => update((x) => ({ ...x, firstYear: t }))} said={notUnderstood(s.firstYear, parseFy, '2026-27')} />
      <TextField id="fld-yearCount" label="Number of years" unit="years" inputMode="numeric" hint="Every year with interest or instalments." value={s.yearCount}
        onCommit={(t) => update((x) => ({ ...x, yearCount: t }))} />
    </div>
    {y.years.length > 0 && <p data-testid="years-read" class="mt-3 text-sm text-ink-muted">
      {y.years.length > 1 ? `${y.years[0]} to ${y.years[y.years.length - 1]}` : y.years[0]}
    </p>}
  </Section>;
}

const HOW: Record<RowMode, string> = {
  grow: 'Grows each year', same: 'Same every year', fall: 'Falls each year (written-down value)', years: 'Each year', none: 'None',
  emi: 'EMIs a month', from: 'From the month it starts running', borrower: 'By who the borrower is',
};

/** When the loan's first year has interest only: which year the figures start in (the loan's first year while that assumption holds). */
function StartQuestion({ s, y, p, update }: { s: State; y: Years; p: Preview; update: Update }) {
  if (!y.startChoices.length) return null;
  const chosen = y.chosenStart;
  const last = y.startChoices[y.startChoices.length - 1];
  return <div id="start-question" data-testid="start-question" class="mt-2 scroll-mt-4">
    <p class={HINT}>No instalment falls in {y.leading.join(' or ')}, only interest{p.leadingInterest?.length === 1
      ? ` of ${p.leadingInterest[0].amount}` : p.leadingInterest ? ` (${p.leadingInterest.map((i) => `${i.amount} in ${i.fy}`).join(', ')})` : ''}.
      {' '}If operations start later, start your figures there: the interest before then is taken as paid from the project cost, not from profits.</p>
    <Choice name="fld-start" legend="Which year do your figures start in?" value={chosen} columns onChange={(fy) => update((x) => withPlanStart(x, fy))}
      options={y.startChoices.map((fy, i) => ({ value: fy, label: fy, hint: i === 0 ? 'The year the loan is drawn' : fy === last ? 'The year of the first instalment' : undefined }))} />
  </div>;
}

function Figures({ s, update, rows, y, p }: { s: State; update: Update; rows: RowDef[]; y: Years; p: Preview }) {
  const years = y.years, last = years[years.length - 1];
  const setYears = (n: number) => update((x) => ({ ...x, planYears: y.skipped.length + n }));
  const plan = s.source === 'plan';
  return <Section id="figures" title={plan ? 'The business' : 'Yearly figures'}>
    {!years.length
      ? <p class={`mt-2 ${HINT}`}>{plan
        ? 'Asked once the month first drawn, how it is repaid, the moratorium and the number of instalments are in.'
        : 'The years appear once the first year and the number of years are in.'}</p>
      : <>
        {plan && <BorrowerQuestion s={s} update={update} />}
        {plan && <StartQuestion s={s} y={y} p={p} update={update} />}
        <p class={`mt-3 ${HINT}`}>{plan
          ? `One or two answers a line; the page works out every year from ${years[0]} to ${last}. In rupees, like 18,00,000 or 18 L.`
          : `In rupees, like 1,50,000 or 1.5 L, for ${years[0]} to ${last}.`}</p>
        <div class="mt-4 space-y-3">
          {groupsOf(rows).map((g) => <FigureRow key={g[0].modeKey} s={s} group={g} years={years} update={update} />)}
        </div>
        {plan && <div class="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" data-testid="add-year" class={BUTTON} onClick={() => setYears(years.length + 1)}>Add a year after {last}</button>
          {years.length > (y.loanYears ?? 0) && <button type="button" data-testid="remove-year" class={BUTTON} onClick={() => setYears(years.length - 1)}>Remove {last}</button>}
          <span class="text-sm text-ink-muted">A later year lets the page try a longer repayment.</span>
        </div>}
      </>}
  </Section>;
}

/** Who the borrower is: it sets the tax (worked out for that borrower) and which existing EMIs count (D-POL-06). */
function BorrowerQuestion({ s, update }: { s: State; update: Update }) {
  return <Choice name="fld-borrowerType" legend="Who is the borrower?" value={s.borrower} columns onChange={(id) => update((x) => withBorrower(x, id))}
    options={BORROWER_CHOICES.map((b) => ({ value: b.id, label: b.label, hint: <>Tax: {b.tax}. EMIs: {b.emis.charAt(0).toLowerCase() + b.emis.slice(1)}.</> }))} />;
}

/** Rows answered together (loans already running: EMIs a month, or interest and instalments a year) share one block. */
const groupsOf = (rows: RowDef[]) => rows.reduce<RowDef[][]>((gs, r) => {
  const g = gs.find((x) => x[0].modeKey === r.modeKey);
  if (g) g.push(r); else gs.push([r]);
  return gs;
}, []);

/** One block of figures: how they are given (one choice), then only the one or two fields that answer needs. */
function FigureRow({ s, group, years, update }: { s: State; group: RowDef[]; years: string[]; update: Update }) {
  const r0 = group[0], mode = modeOf(s, r0), title = group.length > 1 ? GROUP_TITLES[r0.modeKey] ?? r0.label : r0.label;
  const shown = mode ? group.filter((r) => !r.only || r.only.includes(mode)) : [];
  const setMode = (m: RowMode) => update((x) => ({ ...x, modes: { ...x.modes, [r0.modeKey]: m } }));
  return <div id={`row-${r0.modeKey}`} data-testid={`row-${r0.modeKey}`} class="scroll-mt-4 rounded-card bg-surface p-3">
    <p class="font-medium text-ink">{title}</p>
    {r0.hint && <p class={`text-xs ${MUTED}`}>{r0.hint}</p>}
    <div role="radiogroup" aria-label={`${title}: how it is given`} class="mt-2 flex flex-wrap gap-2">
      {r0.modes.map((m) => <label key={m} for={`fld-${r0.key}-${m}`}
        class="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-edge bg-field px-3 py-1 text-sm text-ink has-checked:border-ink has-checked:outline has-checked:outline-ink">
        <input type="radio" id={`fld-${r0.key}-${m}`} name={`fld-${r0.key}-how`} checked={mode === m} onChange={() => setMode(m)} class="size-4 accent-ink" />
        {HOW[m]}
      </label>)}
    </div>
    {mode === 'none'
      ? <p class={`mt-2 text-sm ${MUTED}`}>None in any year.</p>
      : shown.map((r) => <RowFields key={r.key} s={s} r={r} mode={mode as RowMode} years={years} update={update} titled={shown.length > 1} />)}
    {r0.key === 'taxPct' && <SourceNote what="About these rates" reviewBy={TAX_FILE.reviewBy}>{TAX_STATUS}
      {BORROWERS.map((b) => <span key={b.id} class="mt-1 block"><b>{b.label}:</b> {b.law}. Sources (secondary): {b.source}. Dated {showDate(b.date)}; not yet checked.</span>)}
    </SourceNote>}
  </div>;
}

/** Loans already running, as EMIs a month: one line a loan, and the month of its last EMI only when it ends sooner. */
function RunningFields({ s, update }: { s: State; update: Update }) {
  const set = (i: number, patch: Partial<RunningText>) => update((x) => ({ ...x, running: x.running.map((l, k) => (k === i ? { ...l, ...patch } : l)) }));
  const several = s.running.length > 1;
  return <div class="mt-2">
    <p data-testid="emis-ask" class="text-sm text-ink">{emisAsk(s)}.</p>
    <p class={`text-xs ${MUTED}`}>Interest and principal together; leave their interest out of the working-capital interest. Counted every month unless the last EMI is given.</p>
    {s.running.map((l, i) => <div key={i} class="mt-2 grid gap-3 sm:grid-cols-2">
      <div>
        <label for={`fld-emi-${i + 1}`} class={`block text-xs ${MUTED}`}>{several ? `Loan ${i + 1}: EMI a month` : 'EMI a month'}</label>
        <CellInput id={`fld-emi-${i + 1}`} name={`${several ? `Loan ${i + 1}: ` : ''}EMI a month`} value={l.emi} onCommit={(t) => set(i, { emi: t })}
          tidy={tidyAmount} invalid={!!l.emi.trim() && amountOf(l.emi) === undefined} decimal />
      </div>
      <div>
        <label for={`fld-emiLast-${i + 1}`} class={`block text-xs ${MUTED}`}>Last EMI, if it ends before this loan (month)</label>
        <CellInput id={`fld-emiLast-${i + 1}`} name={`${several ? `Loan ${i + 1}: ` : ''}last EMI`} value={l.last} onCommit={(t) => set(i, { last: t })} month
          invalid={!!l.last.trim() && parseMonth(l.last) === undefined} />
      </div>
    </div>)}
    <div class="mt-2 flex flex-wrap gap-2">
      <button type="button" data-testid="add-loan" class={BUTTON} onClick={() => update((x) => ({ ...x, running: [...x.running, { emi: '', last: '' }] }))}>Add a loan that ends at another time</button>
      {several && <button type="button" data-testid="remove-loan" class={BUTTON} onClick={() => update((x) => ({ ...x, running: x.running.slice(0, -1) }))}>Remove loan {s.running.length}</button>}
    </div>
  </div>;
}

/** The fields one row needs for how it is given, and what the page worked out from them. */
function RowFields({ s, r, mode, years, update, titled }: { s: State; r: RowDef; mode: RowMode; years: string[]; update: Update; titled: boolean }) {
  const text = (i: number) => s.cells[r.key]?.[i] ?? '', rate = s.rates[r.key] ?? '';
  const read = r.percent ? numberOf : amountOf, tidy = r.percent ? undefined : tidyAmount;
  const setCell = (i: number, t: string) => update((x) => {
    const cells = [...(x.cells[r.key] ?? [])];
    cells[i] = t;
    return { ...x, cells: { ...x.cells, [r.key]: cells } };
  });
  const cell = (i: number, label: string) => {
    const id = `fld-${r.key}-${years[i]}`, t = text(i);
    return <div key={id}>
      <label for={id} class={`block text-xs ${MUTED}`}>{label}</label>
      <CellInput id={id} name={`${r.label}, ${label.toLowerCase()}`} value={t} onCommit={(v) => setCell(i, v)} tidy={tidy}
        invalid={!!t.trim() && read(t) === undefined} decimal={!r.negative} />
    </div>;
  };
  const rateField = (label: string) => <div>
    <label for={`fld-${r.key}-rate`} class={`block text-xs ${MUTED}`}>{label}</label>
    <CellInput id={`fld-${r.key}-rate`} name={`${r.label}, ${label.toLowerCase()}`} value={rate} decimal
      onCommit={(v) => update((x) => ({ ...x, rates: { ...x.rates, [r.key]: v } }))} invalid={!!rate.trim() && numberOf(rate) === undefined} />
  </div>;
  const worked = mode === 'grow' || mode === 'fall' ? rowValues(s, r, years).values : [];
  const lastValue = worked[worked.length - 1];
  // Figures that step from year to year (EMIs that end, an asset from a month) are read back for every year.
  const steps = mode === 'emi' || mode === 'from' ? rowValues(s, r, years).values : [];
  const asset = s.asset, setAsset = (patch: Partial<State['asset']>) => update((x) => ({ ...x, asset: { ...x.asset, ...patch } }));
  const by = borrowerOf(s.borrower);
  return <div class="mt-2">
    {titled && <p class="text-sm text-ink">{r.label}</p>}
    {mode === 'borrower' && <p data-testid="tax-by" class="mt-2 text-sm text-ink">{by
      ? `Worked out each year for a ${by.label.toLowerCase()}: ${BORROWER_CHOICES.find((b) => b.id === by.id)?.tax}.`
      : 'Say who the borrower is, at the top of this section.'}</p>}
    {mode === 'emi' && <RunningFields s={s} update={update} />}
    {mode === 'from' && <div class="mt-2 grid gap-3 sm:grid-cols-2">
      <div>
        <label for="fld-assetIncome-yearly" class={`block text-xs ${MUTED}`}>A year</label>
        <CellInput id="fld-assetIncome-yearly" name={`${r.label}, a year`} value={asset.yearly} onCommit={(t) => setAsset({ yearly: t })} tidy={tidyAmount}
          invalid={!!asset.yearly.trim() && amountOf(asset.yearly) === undefined} decimal />
      </div>
      <div>
        <label for="fld-assetIncome-start" class={`block text-xs ${MUTED}`}>From the month it starts running</label>
        <CellInput id="fld-assetIncome-start" name={`${r.label}, from the month it starts running`} value={asset.from} onCommit={(t) => setAsset({ from: t })} month
          invalid={!!asset.from.trim() && parseMonth(asset.from) === undefined} />
      </div>
    </div>}
    {mode === 'same' && <div class="mt-2 grid gap-3 sm:grid-cols-2">{cell(0, 'Every year')}</div>}
    {(mode === 'grow' || mode === 'fall') && <div class="mt-2 grid gap-3 sm:grid-cols-2">
      {cell(0, `In ${years[0]}`)}
      {rateField(mode === 'grow' ? (r.key === 'pbdit' ? 'Sales growth, % a year' : 'Then grows by, % a year') : 'Then falls by, % a year')}
    </div>}
    {mode === 'years' && <div class="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">{years.map((fy, i) => cell(i, fy))}</div>}
    {worked[0] !== undefined && lastValue !== undefined && years.length > 1 && <p data-testid={`readback-${r.key}`} class="mt-2 text-sm text-ink-muted">
      Worked out: {rs(worked[0])} in {years[0]} to {rs(lastValue)} in {years[years.length - 1]}.
    </p>}
    {steps.length > 0 && steps.every((v) => v !== undefined) && <p data-testid={`readback-${r.key}`} class="mt-2 text-sm text-ink-muted">
      Worked out: {steps.map((v, i) => `${rs(v)} in ${years[i]}`).join('; ')}.
    </p>}
  </div>;
}

function TargetSection({ s, update }: { s: State; update: Update }) {
  const t = s.target, set = (patch: Partial<State['target']>) => update((x) => ({ ...x, target: { ...x.target, ...patch } }));
  const { average: a, minimum: m } = EXAMPLE_TARGETS;
  return <Section id="target" title="The lender’s target">
    <p class={`mt-2 ${HINT}`}>The DSCR the lender asks for: the average, the lowest year, or both.</p>
    <div class="mt-4 grid gap-4 sm:grid-cols-2">
      <TextField id="fld-targetAverage" label="Average" hint="Like 1.50." inputMode="decimal" value={t.average}
        onCommit={(v) => set({ average: v })} said={notUnderstood(t.average, numberOf, '1.50')} />
      <TextField id="fld-targetMinimum" label="Lowest year" hint="Like 1.20." inputMode="decimal" value={t.minimum}
        onCommit={(v) => set({ minimum: v })} said={notUnderstood(t.minimum, numberOf, '1.20')} />
    </div>
    {a && m && <div class="mt-4">
      <button type="button" data-testid="use-examples" class={BUTTON} onClick={() => set({ average: targetText(a.value), minimum: targetText(m.value) })}>
        Use {targetText(a.value)} and {targetText(m.value)}
      </button>
      <p class={HINT}>Commonly quoted. {sureText(leastSure([a, m] as Marked[]))}; each lender sets its own.</p>
      <SourceNote what="Where the examples come from" reviewBy={DSCR_FILE.reviewBy}>{a.source}. Dated {showDate(a.date)}.</SourceNote>
    </div>}
  </Section>;
}

/** The box a missing figure is typed in: the first of the needs among the front door's fields `from` to `to`. */
const boxFor = (s: State, p: Preview, from = 0, to = FRONT.length) => {
  if (s.source !== 'plan') return undefined;
  const first = yearsOf(s).years[0];
  const i = p.needs.map((n) => frontAt(n, first)).find((k) => k >= from && k < to);
  return i === undefined ? undefined : FRONT[i][2];
};

/**
 * The answer, pinned beside the questions from 1024 px (UX8, D-UX-106) and there from load: the verdict as the paper's
 * heading, one counter of what is still needed opening to its links, and the figures' outline with "—" for each one not
 * yet known, never 0 (review finding 2); then the plan used, why it misses and the largest loan or fewest instalments.
 */
function AnswerPanel({ s, p, update, use, used, undo, keep }: {
  s: State; p: Preview; update: Update; use: (l: DscrLevers) => void; used: DscrChange[]; undo: () => void; keep: () => void;
}) {
  const largest = p.largest?.amount, fewest = p.fewest?.instalments;
  const result = p.blocked ? 'blocked' : p.needs.length ? 'provisional' : 'ready';
  const dash = (what: string, from?: number, to?: number) => <Dash what={what} to={boxFor(s, p, from, to)} />;
  // The panel pins inside a column that spans the questions' rows, so it never runs over the working below.
  return <div class="lg:col-start-2 lg:row-start-1 lg:row-end-3"><section id="preview" aria-labelledby="preview-h" class="answer-panel mt-10 lg:mt-4">
    <h2 id="preview-h" class="sr-only">Results</h2>
    {/* The answer as paper, there at once: it changes as the figures are typed (docs/DESIGN-SITE.md, tool pages). */}
    <div class="paper shadow-paper rounded-card p-4 sm:p-6">
    {/* The answer is the paper's heading (UX7): a flat claim, its rule solid once final and dashed while provisional. */}
    {/* The verdict answers a question (audit A, TRUST1): asked in a muted line set in line with the verdict's words. */}
    {p.verdict && <p data-testid="dscr-question" class={`pl-4 text-sm ${MUTED}`}>Does your projection meet this target?</p>}
    {p.verdict && <h3 data-testid="dscr-verdict" data-answer class={`text-title text-ink ${answerRule(!p.blocked && !p.needs.length)}`}><Claim text={p.verdict.text} /></h3>}
    <Counter id="dscr-status" result={result} text={statusText(p)} rule={!p.verdict} class={p.verdict ? 'mt-2' : ''}>
      {p.needs.length > 0 && <ul data-testid="dscr-needs" class="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink-muted">{p.needs.map((n) => {
        const i = s.source === 'plan' ? frontAt(n, yearsOf(s).years[0]) : -1;
        return <li key={n}>{i < 0 ? n : <a href={`#${FRONT[i][2]}`} onClick={goTo(FRONT[i][2])} class="inline-flex min-h-6 items-center text-link">{FRONT[i][1]}</a>}</li>;
      })}</ul>}
    </Counter>
    {/* The status's own next step (audit 7A): the first answer still needed, a link to its box where it has one. */}
    {p.needs.length > 0 && (() => {
      const n = p.needs[0], i = s.source === 'plan' ? frontAt(n, yearsOf(s).years[0]) : -1;
      return <p data-testid="dscr-next" class="text-sm text-ink">Next: {i < 0 ? n
        : <a href={`#${FRONT[i][2]}`} onClick={goTo(FRONT[i][2])} class="inline-flex min-h-6 items-center text-link underline underline-offset-4">{FRONT[i][1]}</a>}</p>;
    })()}
    {p.blocked && <p data-testid="dscr-blocked" role="alert" class={`mt-4 ${answerRule(true)} text-ink`}>{p.blocked}</p>}
    {!p.blocked && <dl class="mt-4 grid grid-cols-2 gap-3">
      <div class="rounded-control bg-surface p-3">
        <dt class={`text-sm ${MUTED}`}>Average DSCR</dt>
        <dd data-testid="dscr-average" class="figure text-section text-ink">{p.average ?? dash('Average DSCR')}</dd>
      </div>
      <div class="rounded-control bg-surface p-3">
        <dt class={`text-sm ${MUTED}`}>Lowest year</dt>
        <dd class="text-ink">
          <span data-testid="dscr-lowest" class="figure text-section">{p.lowest ?? dash('Lowest year')}</span>
          {p.lowestYear && <>{' '}<span data-testid="dscr-lowest-year" class="whitespace-nowrap text-sm">in {p.lowestYear}</span></>}
        </dd>
      </div>
    </dl>}
    {!p.blocked && s.source === 'plan' && <dl data-testid="dscr-loan-line" class="mt-3 grid grid-cols-2 gap-3 text-ink">
      <div><dt class={`text-sm ${MUTED}`}>Each instalment</dt><dd data-testid="dscr-instalment" class="font-semibold tabular-nums">{p.loanLine?.instalment ?? dash('Each instalment', 3)}</dd></div>
      <div><dt class={`text-sm ${MUTED}`}>Interest over the whole loan</dt><dd data-testid="dscr-total-interest" class="font-semibold tabular-nums">{p.loanLine?.totalInterest ?? dash('Interest over the whole loan', 3)}</dd></div>
    </dl>}
    {p.marks && p.marks.length > 0 && <ul data-testid="dscr-marks" class="mt-4 flex flex-wrap gap-2 text-sm">
      {p.marks.map((m) => <li key={m.fy} data-testid={`mark-${m.fy}`} class={`rounded-full bg-surface px-2.5 py-0.5 ${!m.counted ? 'text-ink-muted' : m.meets ? 'text-good' : 'text-bad'}`}>
        {m.fy}: {m.dscr}, {!m.counted ? 'not counted' : m.meets ? 'meets the target' : 'below the target'}
      </li>)}
    </ul>}
    {/* Once nothing is still to answer (audit 7D): the one thing to check, and how sure what the verdict rests on is. */}
    {p.verdict && !p.blocked && !p.needs.length && (() => {
      const ms = dscrMarks(s), sure = sureLine(ms);
      return <div class="mt-4 text-sm">
        <p data-testid="dscr-check-next" class="text-ink">{checkNext(ms)}</p>
        {sure && <p data-testid="dscr-sure" class={HINT}>{sure}</p>}
      </div>;
    })()}
    </div>
    {used.length > 0 && <div data-testid="dscr-used" role="status" class="mt-3 rounded-control border-l-4 border-ink bg-surface p-3">
      <p class="font-medium text-ink">The plan is used: these figures above changed.</p>
      <ul class="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink tabular-nums">{used.map((c) => <li key={c.key}>{c.label}: {c.was || 'none'} → {c.now}</li>)}</ul>
      <div class="mt-2 flex flex-wrap gap-2">
        <button type="button" data-testid="dscr-undo" class={BUTTON} onClick={undo}>Undo</button>
        <button type="button" data-testid="dscr-keep" class={BUTTON} onClick={keep}>Keep these</button>
      </div>
    </div>}
    {s.source === 'plan' && p.started && <Levels s={s} lender={p.lender} update={update} use={use} />}
    {p.largest && <div class="mt-3 text-sm text-ink">
      <p data-testid="dscr-largest">{p.largest.text}</p>
      {largest !== undefined && <button type="button" data-testid="use-amount" class={`mt-1 ${BUTTON}`}
        onClick={() => update((x) => ({ ...x, loan: { ...x.loan, amount: inr(largest) } }))}>Use {rs(largest)}</button>}
    </div>}
    {p.fewest && <div class="mt-3 text-sm text-ink">
      <p data-testid="dscr-fewest">{p.fewest.text}</p>
      {fewest !== undefined && <button type="button" data-testid="use-instalments" class={`mt-1 ${BUTTON}`}
        onClick={() => update((x) => ({ ...x, loan: { ...x.loan, instalments: String(fewest) } }))}>Use {fewest} instalments</button>}
    </div>}
  </section></div>;
}

/** The working under the answer, full width from 1024 px: the lenders' tests, what is assumed, the statement year by year
 * and the repayment schedule. */
function Working({ s, p, openMore }: { s: State; p: Preview; openMore: () => void }) {
  // The method and the target read as one line (D-UX-10: shorter).
  const method = p.assumed.find((a) => a.id === 'method'), target = p.assumed.find((a) => a.id === 'target');
  const rows: LedgerRow[] = p.assumed.filter((a) => !(method && target && a.id === 'target')).map((a) => ({
    ...(a.id === 'method' && target ? { what: 'How DSCR is worked out, and the target', shown: `${a.shown}; ${target.shown.toLowerCase()}`, why: `${a.why}. The target: ${target.why}` } : a),
    id: a.id, to: a.where, go: (e: Event) => { e.preventDefault(); openMore(); requestAnimationFrame(() => goTo(a.where)(e)); },
  }));
  return <section id="working" aria-label="How it is worked out" class="lg:col-span-2 lg:row-start-3">
    {p.lender && <LenderLines v={p.lender} openMore={openMore} />}
    <Ledger id="assumed" testid="dscr-assumed" row="assumed-" title="Assumed until changed" rows={rows} />
    {p.statement && <StatementTable st={p.statement} parts={p.partYears} />}
    {p.beforeStart && <p data-testid="dscr-before-start" class={`mt-2 ${HINT}`}>{p.beforeStart}</p>}
    {p.notCounted && <p data-testid="dscr-not-counted" class={`mt-2 ${HINT}`}>{p.notCounted}</p>}
    {p.notes.length > 0 && <ul data-testid="dscr-notes" class="mt-2 space-y-0.5 text-sm text-warn">{p.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
    {p.schedule && <Schedule sch={p.schedule} />}
    <p class={`mt-6 ${HINT}`}>A free preview, worked out twice in your browser; figures are shown only when both agree.</p>
  </section>;
}

/** DSCR as lenders test it, beside the borrower's (D-UX-47): never part of the verdict. */
function LenderLines({ v, openMore }: { v: LenderView; openMore: () => void }) {
  const line = (l: LenderLine, id: string) => <li key={id} data-testid={`lender-${id}`} class={l.below ? 'text-bad' : ''}>
    <b>{l.label}:</b> average {l.average}, lowest {l.lowest} in {l.lowestYear}{l.below ? ': the cash does not cover the debt service' : ''}
    {l.meets !== undefined ? (l.meets ? '; meets the target' : '; below the target') : ''}.
  </li>;
  const c = v.cash, a = v.audited, td = 'px-2 py-1 text-right tabular-nums';
  return <div data-testid="dscr-lender" class="mt-4 text-ink">
    <p class="font-medium">As a lender tests it</p>
    {v.blocked && <p role="alert" class="mt-1 text-sm text-bad">{v.blocked}</p>}
    <ul class="mt-1 space-y-1 text-sm text-ink-muted">
      {v.stress.map((l, i) => line(l, LENDER.stress[i]?.id ?? String(i)))}
      {v.ask && <li data-testid="lender-ask"><a href="#lender" onClick={openMore} class="inline-flex min-h-6 items-center text-link">{v.ask}</a></li>}
      {'line' in v.promoters ? line(v.promoters.line, 'promoters') : <li data-testid="lender-promoters">{v.promoters.assumed}.</li>}
      {v.notStressed && <li>{v.notStressed}.</li>}
    </ul>
    {v.needs.length > 0 && <ul class="mt-1 list-disc pl-5 text-sm text-warn">{v.needs.map((n) => <li key={n}>{n}</li>)}</ul>}
    {c && ('needs' in c
      ? <div data-testid="lender-cash-needs" class="mt-3 text-sm"><p class="font-medium">The cash check still needs</p><ul class="list-disc pl-5">{c.needs.map((n) => <li key={n}>{n}</li>)}</ul></div>
      : <div data-testid="lender-cash" class="mt-3 text-sm"><p class={c.rows.some((r) => r.short) ? 'text-bad' : ''}>{c.text}</p>
        <div class="mt-1 overflow-x-auto"><table class="min-w-full text-xs"><thead><tr class="text-ink-muted">
          <th class="px-2 py-1 text-left">Year</th><th class={td}>Cash available</th><th class={td}>Working capital's growth</th><th class={td}>Replacement capex</th>
          <th class={td}>Debt service</th><th class={td}>Cash left</th><th class={td}>Cover</th></tr></thead>
          <tbody>{c.rows.map((r) => <tr key={r.fy} class={r.short ? 'text-bad' : ''}><td class="px-2 py-1">{r.fy}</td><td class={td}>{r.available}</td>
            <td class={td}>{r.wc}</td><td class={td}>{r.capex}</td><td class={td}>{r.service}</td><td class={td}>{r.left}</td><td class={td}>{r.cover}</td></tr>)}</tbody></table></div>
      </div>)}
    {a && ('needs' in a
      ? <div data-testid="lender-audited-needs" class="mt-3 text-sm"><p class="font-medium">The last audited year still needs</p><ul class="list-disc pl-5">{a.needs.map((n) => <li key={n}>{n}</li>)}</ul></div>
      : <div data-testid="lender-audited" class="mt-3 text-sm"><div class="overflow-x-auto"><table class="min-w-full text-xs"><thead><tr class="text-ink-muted">
          <th class="px-2 py-1 text-left"></th><th class={td}>{a.fy} (audited)</th>{a.nextFy && <th class={td}>{a.nextFy} (projected)</th>}</tr></thead>
          <tbody>{a.rows.map((r) => <tr key={r.label}><td class="px-2 py-1">{r.label}</td><td class={td}>{r.audited}</td>{a.nextFy && <td class={td}>{r.next ?? ''}</td>}</tr>)}</tbody></table></div>
        {a.flags.map((f) => <p key={f} class="mt-1 text-warn">{f}.</p>)}
      </div>)}
    <SourceNote what="About these tests">{LENDER.status} {LENDER.stress.map((x) => `${x.label}: ${x.how}.`).join(' ')} {LENDER.floor.why}.</SourceNote>
  </div>;
}

/** The lenders' tests' own inputs, under More options; none of them is asked on the front door. */
function LenderSection({ s, update, y }: { s: State; update: Update; y: Years }) {
  const l = s.lender ?? NO_LENDER, set = (f: (x: LenderText) => LenderText) => update((x) => ({ ...x, lender: f(x.lender ?? NO_LENDER) }));
  const byYear = s.modes.pbdit === 'years', at = (xs: string[], i: number, t: string) => { const n = [...xs]; n[i] = t; return n; };
  const cells = (key: 'sales' | 'promoters', name: string) => <div class="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
    {y.years.map((fy, i) => <label key={fy} class="text-sm">{fy}<CellInput id={`fld-lender-${key}-${i}`} name={`${name} ${fy}`} decimal value={l[key][i] ?? ''} tidy={tidyAmount}
      onCommit={(t) => set((x) => ({ ...x, [key]: at(x[key], i, t) }))} /></label>)}
  </div>;
  const aud = (k: keyof LenderText['audited'], label: string) => <TextField id={`fld-lender-audited-${k}`} label={label} unit="Rs." inputMode="decimal" value={l.audited[k]} tidy={tidyAmount}
    onCommit={(t) => set((x) => ({ ...x, audited: { ...x.audited, [k]: t } }))} />;
  return <Section id="lender" title="As a lender tests it">
    <p class={`mt-1 ${HINT}`}>Optional. Each adds a line beside your DSCR; none changes it.</p>
    <h3 class="mt-4 font-medium text-ink">Sales, for the price and cost tests</h3>
    {byYear ? cells('sales', 'Sales') : <TextField id="fld-lender-sales" label="This year’s sales" unit="Rs." hint="They grow as the profit does." inputMode="decimal" value={l.sales[0] ?? ''}
      tidy={tidyAmount} said={notUnderstood(l.sales[0] ?? '', amountOf, '50,00,000 or 50 L')} onCommit={(t) => set((x) => ({ ...x, sales: [t] }))} />}
    <h3 class="mt-6 font-medium text-ink">Promoters’ loans repaid</h3>
    <p class={HINT}>Taken as kept in the business until this loan is repaid. If any is repaid sooner, type it by year; leave a year empty for none.</p>
    {cells('promoters', "Promoters' loans repaid")}
    <h3 class="mt-6 font-medium text-ink">The cash check</h3>
    <div class="mt-2 grid gap-3 sm:grid-cols-2">
      <TextField id="fld-lender-wc" label="Working capital needed, % of sales" unit="%" hint="Stock and debtors less creditors, as a share of sales." inputMode="decimal" value={l.wcPct}
        onCommit={(t) => set((x) => ({ ...x, wcPct: t }))} />
      <TextField id="fld-lender-capex" label="Replacement capex a year" unit="Rs." hint="The same every year; 0 if none." inputMode="decimal" value={l.capex} tidy={tidyAmount}
        onCommit={(t) => set((x) => ({ ...x, capex: t }))} />
    </div>
    <h3 class="mt-6 font-medium text-ink">The last audited year</h3>
    <p class={HINT}>The year before your first year of figures. Its sales also start the cash check.</p>
    <div class="mt-2 grid gap-3 sm:grid-cols-2">
      {aud('sales', 'Sales')}{aud('pbdit', 'Profit before interest, depreciation and tax')}{aud('depreciation', 'Depreciation')}{aud('interest', 'Interest')}{aud('tax', 'Tax')}
    </div>
  </Section>;
}

/** The statement to download: first what only the document needs, asked once; then the PDF, the Excel copy and the Word copy. */
function DownloadSection({ s, p, update }: { s: State; p: Preview; update: Update }) {
  const f = s.doc, set = (patch: Partial<DocFacts>) => update((x) => ({ ...x, doc: { ...x.doc, ...patch } }));
  const english = (t = '') => (t.trim() && !printable(t) ? 'The document is in English: type this in English letters.' : undefined);
  const gstinSaid = f.gstin?.trim() && !gstinOf(f.gstin) ? 'A GSTIN has 15 letters and digits, like 27ABCDE1234F1Z5.' : undefined;
  const own = docNeeds(f), provisional = allNeeds(s, p).length > 0, ready = !!p.statement && !p.blocked;
  const save = (kind: FileKind) => {
    const now = new Date();
    saveFile(statementDoc(s, p, isoDate(now)), kind, fileName(s, p, kind), now);
  };
  const field = (id: keyof DocFacts, label: string, hint?: string) =>
    <TextField id={`fld-${id}`} label={label} hint={hint} value={f[id] ?? ''} onCommit={(t) => set({ [id]: t })}
      said={english(f[id]) ?? (id === 'gstin' ? gstinSaid : undefined)} invalid={!!english(f[id]) || (id === 'gstin' && !!gstinSaid)} />;
  // Before the statement shows figures the section is one line (UX8, review finding 9).
  if (!ready) return <Folded id="download" title="Download the statement"><span data-testid="doc-wait">{p.blocked
    ? 'No document while the two computations disagree.' : 'A PDF, an Excel and a Word copy, once the statement shows figures.'}</span></Folded>;
  return <Section id="download" title="Download the statement">
    <p class={`mt-2 ${HINT}`}>A PDF for the lender, an Excel copy for the accountant and a Word copy to edit, made in your browser from the figures above.</p>
    {ready
      ? <div class="mt-5">
        <div class="grid gap-4 sm:grid-cols-2">
          {field('borrower', 'Borrower’s name', 'Like Asha Traders.')}
          {field('lender', 'Lender', 'The bank or finance company, and the branch.')}
          {field('preparedBy', 'Prepared by, if not the borrower', 'Your name or your firm’s; leave empty if the borrower prepares it.')}
        </div>
        <details id="doc-more" class="mt-4">
          <summary class="flex min-h-11 cursor-pointer items-center rounded-card bg-surface px-4 py-3 font-medium text-link">Address, the loan’s purpose and GSTIN, if you want them on the statement</summary>
          <div class="grid gap-4 pt-2 pb-4 sm:grid-cols-2">
            {field('address', 'Address', 'The business’s address.')}
            {field('purpose', 'Purpose of the loan', 'Like a new CNC machine.')}
            {field('gstin', 'GSTIN, if registered', 'Like 27ABCDE1234F1Z5.')}
          </div>
        </details>
        <div class="mt-5">
        <p data-testid="doc-status" class={`${STATE} ${provisional ? 'text-warn' : 'text-ink'}`}>
          {!provisional && <Tick />}{docStatus(s, p)}
        </p>
        {provisional && <p class={HINT}>The document says so on every page and lists what is still needed{own.length ? ':' : '.'}</p>}
        {own.length > 0 && <ul data-testid="doc-needs" class="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink-muted">{own.map((n) => <li key={n}>{n}</li>)}</ul>}
        <div class="mt-3 flex flex-wrap gap-2">
          <button type="button" data-testid="download-pdf" class={FILLED} onClick={() => save('pdf')}>Download PDF</button>
          <button type="button" data-testid="download-xlsx" class={BUTTON} onClick={() => save('xlsx')}>Download Excel</button>
          <button type="button" data-testid="download-docx" class={BUTTON} onClick={() => save('docx')}>Download Word</button>
          <button type="button" data-testid="print" class={BUTTON} onClick={() => { const now = new Date(); openPdf(statementDoc(s, p, isoDate(now)), now); }}>Print</button>
        </div>
        <InAppNote id="in-app" />
        </div>
      </div>
      : null}
  </Section>;
}

const lineClass = (kind?: string) => kind === 'total' || kind === 'ratio'
  ? 'font-semibold text-ink' : 'text-ink';

/** The DSCR statement: years across on wider screens (as in a project report), one card per year on phones; then the Total. */
function StatementTable({ st, parts = {} }: { st: StatementView; parts?: Record<string, string> }) {
  const cols = st.years.length + 1 + (st.total ? 1 : 0);
  // On a phone a line that is nil every year is left off the cards; the table and the document keep it (finding 16).
  const shown = st.lines.filter((l) => l.kind || !l.n || l.n.some((x) => x !== 0));
  const hidden = st.lines.length - shown.length;
  // A sheet lying flat: only the answer's casts the shadow (UX8, D-UX-106).
  return <div class="paper mt-8 rounded-card p-4 sm:p-6">
    <h3 class="font-semibold text-ink">Year by year</h3>
    <p class={`mt-1 ${HINT}`}>In rupees.{hidden > 0 && <span class="sm:hidden"> Lines that are nil every year are left out here; the document keeps them.</span>}</p>
    <div class="mt-2 overflow-x-auto max-sm:hidden">
      <table data-testid="dscr-statement" class="w-full border-collapse text-sm">
        <thead>
          <tr class="border-b border-line">
            <th scope="col" class="py-2 pr-3 text-left font-medium text-ink-muted"><span class="sr-only">Line</span></th>
            {st.years.map((fy, i) => <th key={fy} scope="col" class="px-2 py-2 text-right align-bottom font-medium text-ink-muted">
              {fy}{!st.counted[i] && <span class={`block text-xs font-normal ${MUTED}`}>not counted</span>}
              {parts[fy] && <span data-testid={`part-${fy}`} class={`block text-xs font-normal ${MUTED}`}>{parts[fy]}</span>}
            </th>)}
            {st.total && <th scope="col" class="px-2 py-2 text-right align-bottom font-semibold text-ink">
              Total{st.total.sub && <span class={`block text-xs font-normal ${MUTED}`}>{st.total.sub}</span>}
            </th>}
          </tr>
        </thead>
        <tbody>
          {st.lines.map((l) => l.kind === 'head'
            ? <tr key={l.label}><th colSpan={cols} scope="colgroup" class="pt-4 pb-1 text-left text-xs font-semibold tracking-wide text-ink-muted uppercase">{l.label}</th></tr>
            : <tr key={l.label} class={`border-b border-line ${l.kind ? 'border-t border-t-ink/25' : ''}`}>
              <th scope="row" class={`py-1.5 pr-3 text-left font-normal ${lineClass(l.kind)}`}>{l.label}</th>
              {l.values.map((v, i) => <td key={i} data-testid={l.id ? `${l.id}-${st.years[i]}` : undefined}
                class={`px-2 py-1.5 text-right tabular-nums ${!st.counted[i] && l.kind === 'ratio' ? `font-semibold ${MUTED}` : lineClass(l.kind)}`}>{v}</td>)}
              {st.total && <td data-testid={l.id ? `${l.id}-total` : undefined} class={`px-2 py-1.5 text-right font-semibold tabular-nums ${lineClass(l.kind)}`}>{l.total?.text ?? ''}</td>}
            </tr>)}
        </tbody>
      </table>
    </div>
    <div class="mt-2 space-y-3 sm:hidden">
      {st.years.map((fy, i) => <div key={fy} data-testid={`card-${fy}`} class="rounded-control bg-surface p-3">
        <p class="font-medium text-ink">{fy}{!st.counted[i] && <span class={`ml-2 text-xs font-normal ${MUTED}`}>not counted</span>}
          {parts[fy] && <span class={`ml-2 text-xs font-normal ${MUTED}`}>{parts[fy]}</span>}</p>
        <div class="mt-1 text-sm">
          {shown.map((l) => l.kind === 'head'
            ? <p key={l.label} class={`pt-2 text-xs font-semibold tracking-wide uppercase ${MUTED}`}>{l.label}</p>
            : <p key={l.label} class={`flex justify-between gap-3 py-0.5 ${lineClass(l.kind)}`}>
              <span>{l.label}</span><span data-line={l.id} class="text-right tabular-nums">{l.values[i]}</span>
            </p>)}
        </div>
      </div>)}
      {st.total && <div data-testid="card-total" class="rounded-control border-l-4 border-ink bg-surface p-3">
        <p class="font-medium text-ink">Total{st.total.sub && <span class={`ml-2 text-xs font-normal ${MUTED}`}>{st.total.sub}</span>}</p>
        <div class="mt-1 text-sm">
          {shown.map((l) => l.kind === 'head'
            ? <p key={l.label} class={`pt-2 text-xs font-semibold tracking-wide uppercase ${MUTED}`}>{l.label}</p>
            : <p key={l.label} class={`flex justify-between gap-3 py-0.5 ${lineClass(l.kind)}`}>
              <span>{l.label}</span><span data-line={l.id} class="text-right tabular-nums">{l.total?.text ?? ''}</span>
            </p>)}
        </div>
      </div>}
    </div>
  </div>;
}

/** The repayment schedule: a line per financial year; each opens to its months. */
function Schedule({ sch }: { sch: ScheduleView }) {
  const cols = 'grid grid-cols-label gap-2 sm:grid-cols-label-wide';
  return <div data-testid="schedule" class="mt-8">
    <h3 class="font-semibold text-ink">Repayment schedule</h3>
    <p data-testid="schedule-level" class={`mt-1 ${HINT}`}>{sch.level}</p>
    <p class={HINT}>In rupees, rounded; totals use the exact figures. Open a year for its months.</p>
    <div class={`${cols} mt-3 px-3 text-xs font-medium ${MUTED}`}>
      <span>Year</span><span class="text-right">Interest</span><span class="text-right">Principal</span><span class="text-right">Balance at year end</span>
    </div>
    <div class="mt-1 divide-y divide-line rounded-card bg-surface">
      {sch.years.map((y) => <details key={y.fy} data-testid={`schedule-${y.fy}`} class="group">
        <summary class={`${cols} cursor-pointer list-none px-3 py-2 text-sm tabular-nums text-ink [&::-webkit-details-marker]:hidden`}>
          <span class="font-medium"><span aria-hidden="true" class="mr-1 inline-block transition-transform group-open:rotate-90">›</span>{y.fy}</span>
          <span class="text-right">{y.interest}</span><span class="text-right">{y.principal}</span><span class="text-right">{y.closing}</span>
        </summary>
        <div class="overflow-x-auto px-3 pb-3">
          <table class="w-full border-collapse text-xs tabular-nums sm:text-sm">
            <thead>
              <tr class={`border-b border-line ${MUTED}`}>
                <th scope="col" class="py-1 pr-2 text-left font-medium">Month</th>
                <th scope="col" class="px-1 py-1 text-right font-medium max-sm:hidden">Balance at start</th>
                <th scope="col" class="px-1 py-1 text-right font-medium">Interest</th>
                <th scope="col" class="px-1 py-1 text-right font-medium">Principal</th>
                <th scope="col" class="px-1 py-1 text-right font-medium max-sm:hidden">Paid</th>
                <th scope="col" class="py-1 pl-1 text-right font-medium">Balance at end</th>
              </tr>
            </thead>
            <tbody>
              {y.months.map((m) => <tr key={m.ym} data-testid={`month-${m.ym}`} class="border-b border-line text-ink">
                <th scope="row" class="py-1 pr-2 text-left font-normal whitespace-nowrap">{m.month}{m.instalment && <span class={`ml-1 ${MUTED}`}>#{m.instalment}</span>}</th>
                <td class="px-1 py-1 text-right max-sm:hidden">{m.opening}</td>
                <td class="px-1 py-1 text-right">{m.interest}</td>
                <td class="px-1 py-1 text-right">{m.principal}</td>
                <td class="px-1 py-1 text-right max-sm:hidden">{m.paid}</td>
                <td class="py-1 pl-1 text-right">{m.closing}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </details>)}
    </div>
  </div>;
}
