/**
 * The DSCR calculator. It opens with the assumptions in engine/data/defaults.json answered (D-UX-08), so only the loan
 * and this year's figures are asked; each assumption is listed in the preview until changed. The two start questions
 * (where the yearly figures come from, how DSCR is worked out) stay on top to change. Then the loan (or the years), the
 * yearly figures, the lender's target, and a free preview that stays provisional while anything is missing: the DSCR
 * statement in the layout chartered accountants use, and the repayment schedule. Last, the statement to download: the
 * document's own facts asked once, then a PDF and an Excel copy made in the browser (document.ts). Figures: engine/dscr.ts
 * only, via model.ts.
 */
import { useMemo, useState } from 'preact/hooks';
import { AmountField } from '../AmountField';
import { OPTIONS, PRESETS } from '../../../engine/dscr';
import { parseMonth } from '../../../engine/parse';
import { TAX_STATUS } from '../../../engine/tax';
import { inr, rs } from '../../../engine/util';
import { BUTTON, CellInput, Choice, HINT, Section, SourceNote, TextField } from '../fields';
import { pdfOf, printable } from '../doc/pdf';
import { xlsxOf } from '../doc/xlsx';
import { allNeeds, docNeeds, docStatus, fileName, statementDoc } from './document';
import {
  ASSUMED, EXAMPLE_TARGETS, OPTION_KEYS, TAX_CHOICES, amountOf, barText, choicesOf, loanRead, modeOf, numberOf, parseFy, presetText,
  preview, rowValues, rowsOf, statusText, targetText, tidyAmount, withPlanStart, withSource, withTaxRate, yearsOf,
  type DocFacts, type LoanText, type Preview, type RowDef, type RowMode, type ScheduleView, type State, type StatementView, type Years,
} from './model';

type Update = (f: (s: State) => State) => void;
const showDate = (iso: string) => iso.split('-').reverse().join('-');
const notUnderstood = (text: string, read: (t: string) => unknown, example: string) =>
  text.trim() && read(text) === undefined ? `Not understood. Try ${example}.` : undefined;
const MUTED = 'text-slate-600 dark:text-slate-300';

export function DscrCalculator() {
  const [s, setS] = useState<State>(ASSUMED);
  const update: Update = (f) => setS(f);
  const p = useMemo(() => preview(s), [s]);
  const rows = useMemo(() => rowsOf(s), [s]);
  const y = useMemo(() => yearsOf(s), [s]);
  return <div>
    <ClearAll shown={JSON.stringify(s) !== JSON.stringify(ASSUMED)} onClear={() => setS(ASSUMED)} />
    <Start s={s} update={update} />
    {p.started && <>
      {s.source === 'plan' ? <Loan s={s} update={update} y={y} p={p} /> : <YearsSection s={s} update={update} y={y} />}
      <Figures s={s} update={update} rows={rows} y={y} p={p} />
      <TargetSection s={s} update={update} />
      <PreviewSection p={p} update={update} />
      <DownloadSection s={s} p={p} update={update} />
      <div class="sticky bottom-0 z-10 -mx-4 mt-10 border-t border-slate-200 bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-slate-950">
        <a href="#preview" data-testid="answer-bar" aria-live="polite" class="block text-sm font-medium text-slate-900 dark:text-slate-100">
          {barText(p)} <span aria-hidden="true">↓</span>
        </a>
      </div>
    </>}
  </div>;
}

/** Start again, asked twice so that one stray tap never wipes the figures. */
function ClearAll({ shown, onClear }: { shown: boolean; onClear: () => void }) {
  const [asking, setAsking] = useState(false);
  if (!shown) return null;
  return <div class="mt-4 flex flex-wrap items-center justify-end gap-2 text-sm">
    {asking
      ? <>
        <span class="text-slate-800 dark:text-slate-200">Clear everything you typed?</span>
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
          ...PRESETS.map((m) => ({ value: m.id, label: m.label, hint: <>{presetText(m.id)}.{!m.verified && <> Not yet checked.</>}</> })),
          { value: 'choose', label: 'Choose each of the four', hint: 'For a lender who works it out differently.' },
        ]} />
    </div>
    <SourceNote what="Where these methods come from">
      {PRESETS.map((m) => <span key={m.id} class="mt-1 block"><b>{m.label}:</b> {m.source}. Dated {showDate(m.date)}.</span>)}
    </SourceNote>
    {s.method === 'choose' && OPTION_KEYS.map((k) => <Choice key={k} name={`fld-${k}`} legend={OPTIONS[k].question} options={choicesOf(k)}
      value={s.choice[k]} onChange={(v) => update((x) => ({ ...x, choice: { ...x.choice, [k]: v } }))} />)}
  </div>;
}

function Loan({ s, update, y, p }: { s: State; update: Update; y: Years; p: Preview }) {
  const l = s.loan, set = (patch: Partial<LoanText>) => update((x) => ({ ...x, loan: { ...x.loan, ...patch } }));
  const read = loanRead(y);
  return <Section id="loan" title="The loan">
    <p class={`mt-2 ${HINT}`}>As in the sanction letter.</p>
    <div class="mt-4"><AmountField value={l.amount} onCommit={(t) => set({ amount: t })} /></div>
    <div class="mt-2 grid gap-4 sm:grid-cols-2">
      <TextField id="fld-ratePct" label="Interest rate, % a year" inputMode="decimal" placeholder="like 10.5" value={l.ratePct}
        onCommit={(t) => set({ ratePct: t })} said={notUnderstood(l.ratePct, numberOf, '10.5')} />
      <TextField id="fld-disbursed" type="month" label="Month the loan is first drawn" placeholder="like 2026-04" value={l.disbursed}
        onCommit={(t) => set({ disbursed: t })} said={notUnderstood(l.disbursed, parseMonth, '2026-04 or Apr 2026')} />
    </div>
    <Choice name="fld-repayment" legend="How is it repaid?" value={l.repayment} onChange={(v) => set({ repayment: v })} options={[
      { value: 'emi', label: 'EMI every month', hint: 'The same amount each month, interest included.' },
      { value: 'monthly', label: 'Equal principal every month', hint: 'Interest on the balance on top, so the payment falls.' },
      { value: 'quarterly', label: 'Equal principal every quarter', hint: 'Interest on the balance is still paid every month.' },
    ]} />
    <div class="mt-6 grid gap-4 sm:grid-cols-2">
      <TextField id="fld-moratoriumMonths" label="Moratorium, months" inputMode="numeric" placeholder="0 if none" value={l.moratoriumMonths}
        hint="Months before the first instalment; interest is still paid." onCommit={(t) => set({ moratoriumMonths: t })}
        said={notUnderstood(l.moratoriumMonths, numberOf, '6, or 0 if none')} />
      <TextField id="fld-instalments" label="Number of instalments" inputMode="numeric" placeholder="like 60" value={l.instalments}
        hint={l.repayment === 'quarterly' ? 'Quarterly instalments, after the moratorium.' : l.repayment ? 'Monthly instalments, after the moratorium.' : 'After the moratorium.'}
        onCommit={(t) => set({ instalments: t })} said={notUnderstood(l.instalments, numberOf, '60')} />
    </div>
    {(read || p.schedule) && <div data-testid="loan-read" class="mt-4 space-y-1 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-800 dark:bg-slate-800 dark:text-slate-200">
      {p.schedule && <p data-testid="loan-level">{p.schedule.level}</p>}
      {read && <p data-testid="loan-dates">{read}</p>}
    </div>}
  </Section>;
}

function YearsSection({ s, update, y }: { s: State; update: Update; y: Years }) {
  return <Section id="years" title="Years">
    <div class="mt-4 grid gap-4 sm:grid-cols-2">
      <TextField id="fld-firstYear" label="First year" placeholder="like 2026-27" hint="A financial year, April to March." value={s.firstYear}
        onCommit={(t) => update((x) => ({ ...x, firstYear: t }))} said={notUnderstood(s.firstYear, parseFy, '2026-27')} />
      <TextField id="fld-yearCount" label="Number of years" inputMode="numeric" placeholder="like 5" hint="Every year with interest or instalments." value={s.yearCount}
        onCommit={(t) => update((x) => ({ ...x, yearCount: t }))} />
    </div>
    {y.years.length > 0 && <p data-testid="years-read" class="mt-3 text-sm text-slate-700 dark:text-slate-300">
      {y.years.length > 1 ? `${y.years[0]} to ${y.years[y.years.length - 1]}` : y.years[0]}
    </p>}
  </Section>;
}

const HOW: Record<RowMode, string> = {
  grow: 'Grows each year', same: 'Same every year', fall: 'Falls each year (written-down value)', years: 'Each year', none: 'None',
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
          <span class="text-sm text-slate-600 dark:text-slate-300">A later year lets the page try a longer repayment.</span>
        </div>}
      </>}
  </Section>;
}

/** Rows answered together (the interest and instalments of other term loans) share one block. */
const GROUP_TITLES: Record<string, string> = { otherLoans: 'Other term loans already running' };
const groupsOf = (rows: RowDef[]) => rows.reduce<RowDef[][]>((gs, r) => {
  const g = gs.find((x) => x[0].modeKey === r.modeKey);
  if (g) g.push(r); else gs.push([r]);
  return gs;
}, []);

/** One block of figures: how they are given (one choice), then only the one or two fields that answer needs. */
function FigureRow({ s, group, years, update }: { s: State; group: RowDef[]; years: string[]; update: Update }) {
  const r0 = group[0], mode = modeOf(s, r0), title = group.length > 1 ? GROUP_TITLES[r0.modeKey] ?? r0.label : r0.label;
  const setMode = (m: RowMode) => update((x) => ({ ...x, modes: { ...x.modes, [r0.modeKey]: m } }));
  return <div id={`row-${r0.modeKey}`} data-testid={`row-${r0.modeKey}`} class="scroll-mt-4 rounded-lg border border-slate-300 p-3 dark:border-slate-700">
    <p class="font-medium text-slate-900 dark:text-slate-100">{title}</p>
    {r0.hint && <p class={`text-xs ${MUTED}`}>{r0.hint}</p>}
    <div role="radiogroup" aria-label={`${title}: how it is given`} class="mt-2 flex flex-wrap gap-2">
      {r0.modes.map((m) => <label key={m} for={`fld-${r0.key}-${m}`}
        class="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1 text-sm text-slate-800 has-checked:border-teal-700 has-checked:bg-teal-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:has-checked:border-teal-500 dark:has-checked:bg-teal-950">
        <input type="radio" id={`fld-${r0.key}-${m}`} name={`fld-${r0.key}-how`} checked={mode === m} onChange={() => setMode(m)} class="size-4 accent-teal-700 dark:accent-teal-500" />
        {HOW[m]}
      </label>)}
    </div>
    {r0.key === 'taxPct' && s.source === 'plan' && <div class="mt-2">
      <p class={`text-xs ${MUTED}`}>Fill in by borrower:</p>
      <div class="mt-1 flex flex-wrap gap-2">
        {TAX_CHOICES.map((t) => <button key={t.id} type="button" data-testid={`tax-${t.id}`} class={BUTTON}
          onClick={() => update((x) => withTaxRate(x, t.pct))}>{t.label}: {t.pct}%</button>)}
      </div>
      <SourceNote what="About these rates">{TAX_STATUS}</SourceNote>
    </div>}
    {mode === 'none'
      ? <p class={`mt-2 text-sm ${MUTED}`}>None in any year.</p>
      : mode && group.map((r) => <RowFields key={r.key} s={s} r={r} mode={mode} years={years} update={update} titled={group.length > 1} />)}
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
  return <div class="mt-2">
    {titled && <p class="text-sm text-slate-800 dark:text-slate-200">{r.label}</p>}
    {mode === 'same' && <div class="mt-2 grid gap-3 sm:grid-cols-2">{cell(0, 'Every year')}</div>}
    {(mode === 'grow' || mode === 'fall') && <div class="mt-2 grid gap-3 sm:grid-cols-2">
      {cell(0, `In ${years[0]}`)}
      {rateField(mode === 'grow' ? (r.key === 'pbdit' ? 'Sales growth, % a year' : 'Then grows by, % a year') : 'Then falls by, % a year')}
    </div>}
    {mode === 'years' && <div class="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">{years.map((fy, i) => cell(i, fy))}</div>}
    {worked[0] !== undefined && lastValue !== undefined && years.length > 1 && <p data-testid={`readback-${r.key}`} class="mt-2 text-sm text-slate-700 dark:text-slate-300">
      Worked out: {rs(worked[0])} in {years[0]} to {rs(lastValue)} in {years[years.length - 1]}.
    </p>}
  </div>;
}

function TargetSection({ s, update }: { s: State; update: Update }) {
  const t = s.target, set = (patch: Partial<State['target']>) => update((x) => ({ ...x, target: { ...x.target, ...patch } }));
  const { average: a, minimum: m } = EXAMPLE_TARGETS;
  return <Section id="target" title="The lender’s target">
    <p class={`mt-2 ${HINT}`}>The DSCR the lender asks for: the average, the lowest year, or both.</p>
    <div class="mt-4 grid gap-4 sm:grid-cols-2">
      <TextField id="fld-targetAverage" label="Average" inputMode="decimal" placeholder="like 1.50" value={t.average}
        onCommit={(v) => set({ average: v })} said={notUnderstood(t.average, numberOf, '1.50')} />
      <TextField id="fld-targetMinimum" label="Lowest year" inputMode="decimal" placeholder="like 1.20" value={t.minimum}
        onCommit={(v) => set({ minimum: v })} said={notUnderstood(t.minimum, numberOf, '1.20')} />
    </div>
    {a && m && <div class="mt-4">
      <button type="button" data-testid="use-examples" class={BUTTON} onClick={() => set({ average: targetText(a.value), minimum: targetText(m.value) })}>
        Use {targetText(a.value)} and {targetText(m.value)}
      </button>
      <p class={HINT}>Commonly quoted examples, not a rule: each lender sets its own.{!(a.verified && m.verified) && ' Not yet checked against a published source.'}</p>
      <SourceNote what="Where the examples come from">{a.source}. Dated {showDate(a.date)}.</SourceNote>
    </div>}
  </Section>;
}

function PreviewSection({ p, update }: { p: Preview; update: Update }) {
  const box = 'mt-4 rounded-md border px-3 py-2';
  const largest = p.largest?.amount, fewest = p.fewest?.instalments;
  return <Section id="preview" title="Preview">
    <p data-testid="dscr-status" class={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-sm font-medium ${p.blocked
      ? 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200' : p.needs.length
        ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200' : 'bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-200'}`}>
      {statusText(p)}
    </p>
    {p.blocked && <p data-testid="dscr-blocked" role="alert" class={`${box} border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200`}>{p.blocked}</p>}
    {p.average !== undefined && <dl class="mt-4 grid grid-cols-2 gap-3">
      <div class="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
        <dt class={`text-sm ${MUTED}`}>Average DSCR</dt>
        <dd data-testid="dscr-average" class="text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">{p.average}</dd>
      </div>
      <div class="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
        <dt class={`text-sm ${MUTED}`}>Lowest year</dt>
        <dd class="text-slate-900 dark:text-slate-100">
          <span data-testid="dscr-lowest" class="text-2xl font-semibold tabular-nums">{p.lowest}</span>
          {' '}<span data-testid="dscr-lowest-year" class="text-sm">in {p.lowestYear}</span>
        </dd>
      </div>
    </dl>}
    {p.verdict && <p data-testid="dscr-verdict" class={`${box} ${p.verdict.meets
      ? 'border-teal-300 bg-teal-50 text-teal-900 dark:border-teal-800 dark:bg-teal-950 dark:text-teal-100'
      : 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100'}`}>{p.verdict.text}</p>}
    {p.largest && <div class="mt-3 text-sm text-slate-800 dark:text-slate-200">
      <p data-testid="dscr-largest">{p.largest.text}</p>
      {largest !== undefined && <button type="button" data-testid="use-amount" class={`mt-1 ${BUTTON}`}
        onClick={() => update((x) => ({ ...x, loan: { ...x.loan, amount: inr(largest) } }))}>Use {rs(largest)}</button>}
    </div>}
    {p.fewest && <div class="mt-3 text-sm text-slate-800 dark:text-slate-200">
      <p data-testid="dscr-fewest">{p.fewest.text}</p>
      {fewest !== undefined && <button type="button" data-testid="use-instalments" class={`mt-1 ${BUTTON}`}
        onClick={() => update((x) => ({ ...x, loan: { ...x.loan, instalments: String(fewest) } }))}>Use {fewest} instalments</button>}
    </div>}
    {p.needs.length > 0 && <div data-testid="dscr-needs" class="mt-4 text-slate-900 dark:text-slate-100">
      <p class="font-medium">Still needed</p>
      <ul class="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-700 dark:text-slate-300">{p.needs.map((n) => <li key={n}>{n}</li>)}</ul>
    </div>}
    {p.assumed.length > 0 && <div data-testid="dscr-assumed" class="mt-4 text-slate-900 dark:text-slate-100">
      <p class="font-medium">Assumed until you change them</p>
      <ul class="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-700 dark:text-slate-300">
        {p.assumed.map((a) => <li key={a.id} data-testid={`assumed-${a.id}`}>
          <a href={`#${a.where}`} class="text-teal-700 underline underline-offset-2 dark:text-teal-400">{a.what}</a>: {a.shown}
        </li>)}
      </ul>
      <SourceNote what="Why these">{p.assumed.map((a) => <span key={a.id} class="mt-1 block"><b>{a.what}:</b> {a.why}.</span>)}</SourceNote>
    </div>}
    {p.statement && <StatementTable st={p.statement} />}
    {p.beforeStart && <p data-testid="dscr-before-start" class={`mt-2 ${HINT}`}>{p.beforeStart}</p>}
    {p.notCounted && <p data-testid="dscr-not-counted" class={`mt-2 ${HINT}`}>{p.notCounted}</p>}
    {p.notes.length > 0 && <ul data-testid="dscr-notes" class="mt-2 space-y-0.5 text-sm text-amber-900 dark:text-amber-200">{p.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
    {p.schedule && <Schedule sch={p.schedule} />}
    <p class={`mt-6 ${HINT}`}>A free preview, worked out twice in your browser; figures are shown only when both agree.</p>
  </Section>;
}

const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const isoDate = (d: Date) => [d.getFullYear(), d.getMonth() + 1, d.getDate()].map((n) => String(n).padStart(2, '0')).join('-');

/** Hands the file to the browser to save. */
function download(bytes: Uint8Array<ArrayBuffer>, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** The statement to download: first what only the document needs, asked once; then the PDF and the Excel copy. */
function DownloadSection({ s, p, update }: { s: State; p: Preview; update: Update }) {
  const f = s.doc, set = (patch: Partial<DocFacts>) => update((x) => ({ ...x, doc: { ...x.doc, ...patch } }));
  const english = (t: string) => (t.trim() && !printable(t) ? 'The document is in English: type this in English letters.' : undefined);
  const own = docNeeds(f), provisional = allNeeds(s, p).length > 0, ready = !!p.statement && !p.blocked;
  const save = (kind: 'pdf' | 'xlsx') => {
    const now = new Date(), doc = statementDoc(s, p, isoDate(now));
    if (doc) download(kind === 'pdf' ? pdfOf(doc, now) : xlsxOf(doc, now), fileName(s, p, kind), kind === 'pdf' ? 'application/pdf' : XLSX_TYPE);
  };
  const field = (id: keyof DocFacts, label: string, hint?: string, placeholder?: string) =>
    <TextField id={`fld-${id}`} label={label} hint={hint} placeholder={placeholder} value={f[id]} onCommit={(t) => set({ [id]: t })}
      said={english(f[id])} invalid={!!english(f[id])} />;
  return <Section id="download" title="Download the statement">
    <p class={`mt-2 ${HINT}`}>A PDF for the lender, and an Excel copy with the working for the accountant, made in your browser from the figures above.</p>
    <div class="mt-4 grid gap-4 sm:grid-cols-2">
      {field('borrower', 'Borrower’s name', undefined, 'like Asha Traders')}
      {field('lender', 'Lender', 'The bank or finance company, and the branch.')}
      {field('preparedBy', 'Prepared by, if not the borrower', 'Your name or your firm’s; leave empty if the borrower prepares it.')}
    </div>
    {ready
      ? <div class="mt-5">
        <p data-testid="doc-status" class={`inline-block rounded-full px-2.5 py-0.5 text-sm font-medium ${provisional
          ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200' : 'bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-200'}`}>
          {docStatus(s, p)}
        </p>
        {provisional && <p class={HINT}>The document says so on every page and lists what is still needed{own.length ? ':' : '.'}</p>}
        {own.length > 0 && <ul data-testid="doc-needs" class="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-700 dark:text-slate-300">{own.map((n) => <li key={n}>{n}</li>)}</ul>}
        <div class="mt-3 flex flex-wrap gap-2">
          <button type="button" data-testid="download-pdf" class={BUTTON} onClick={() => save('pdf')}>Download PDF</button>
          <button type="button" data-testid="download-xlsx" class={BUTTON} onClick={() => save('xlsx')}>Download Excel</button>
        </div>
      </div>
      : <p data-testid="doc-wait" class={`mt-4 ${HINT}`}>{p.blocked ? 'No document while the two computations disagree.' : 'The document can be made once the statement shows figures.'}</p>}
  </Section>;
}

const lineClass = (kind?: string) => kind === 'total' || kind === 'ratio'
  ? 'font-semibold text-slate-900 dark:text-slate-100' : 'text-slate-800 dark:text-slate-200';

/** The DSCR statement: years across on wider screens (as in a project report), one card per year on phones. */
function StatementTable({ st }: { st: StatementView }) {
  return <div class="mt-6">
    <h3 class="font-semibold text-slate-900 dark:text-slate-100">DSCR statement</h3>
    <p class={`mt-1 ${HINT}`}>In rupees.</p>
    <div class="mt-2 overflow-x-auto max-sm:hidden">
      <table data-testid="dscr-statement" class="w-full border-collapse text-sm">
        <thead>
          <tr class="border-b border-slate-300 dark:border-slate-700">
            <th scope="col" class="py-2 pr-3 text-left font-medium text-slate-700 dark:text-slate-200"><span class="sr-only">Line</span></th>
            {st.years.map((fy, i) => <th key={fy} scope="col" class="px-2 py-2 text-right align-bottom font-medium text-slate-700 dark:text-slate-200">
              {fy}{!st.counted[i] && <span class={`block text-xs font-normal ${MUTED}`}>not counted</span>}
            </th>)}
          </tr>
        </thead>
        <tbody>
          {st.lines.map((l) => l.kind === 'head'
            ? <tr key={l.label}><th colSpan={st.years.length + 1} scope="colgroup" class="pt-4 pb-1 text-left text-xs font-semibold tracking-wide text-slate-600 uppercase dark:text-slate-300">{l.label}</th></tr>
            : <tr key={l.label} class={`border-b border-slate-100 dark:border-slate-800 ${l.kind ? 'border-t border-t-slate-300 dark:border-t-slate-600' : ''}`}>
              <th scope="row" class={`py-1.5 pr-3 text-left font-normal ${lineClass(l.kind)}`}>{l.label}</th>
              {l.values.map((v, i) => <td key={i} data-testid={l.id ? `${l.id}-${st.years[i]}` : undefined}
                class={`px-2 py-1.5 text-right tabular-nums ${!st.counted[i] && l.kind === 'ratio' ? `font-semibold ${MUTED}` : lineClass(l.kind)}`}>{v}</td>)}
            </tr>)}
        </tbody>
      </table>
    </div>
    <div class="mt-2 space-y-3 sm:hidden">
      {st.years.map((fy, i) => <div key={fy} data-testid={`card-${fy}`} class="rounded-lg border border-slate-300 p-3 dark:border-slate-700">
        <p class="font-medium text-slate-900 dark:text-slate-100">{fy}{!st.counted[i] && <span class={`ml-2 text-xs font-normal ${MUTED}`}>not counted</span>}</p>
        <div class="mt-1 text-sm">
          {st.lines.map((l) => l.kind === 'head'
            ? <p key={l.label} class={`pt-2 text-xs font-semibold tracking-wide uppercase ${MUTED}`}>{l.label}</p>
            : <p key={l.label} class={`flex justify-between gap-3 py-0.5 ${lineClass(l.kind)}`}>
              <span>{l.label}</span><span data-line={l.id} class="text-right tabular-nums">{l.values[i]}</span>
            </p>)}
        </div>
      </div>)}
    </div>
  </div>;
}

/** The repayment schedule: a line per financial year; each opens to its months. */
function Schedule({ sch }: { sch: ScheduleView }) {
  const cols = 'grid grid-cols-[4.5rem_1fr_1fr_1fr] gap-2 sm:grid-cols-[6rem_1fr_1fr_1fr]';
  return <div data-testid="schedule" class="mt-8">
    <h3 class="font-semibold text-slate-900 dark:text-slate-100">Repayment schedule</h3>
    <p data-testid="schedule-level" class={`mt-1 ${HINT}`}>{sch.level}</p>
    <p class={HINT}>In rupees, rounded; totals use the exact figures. Open a year for its months.</p>
    <div class={`${cols} mt-3 px-3 text-xs font-medium ${MUTED}`}>
      <span>Year</span><span class="text-right">Interest</span><span class="text-right">Principal</span><span class="text-right">Balance at year end</span>
    </div>
    <div class="mt-1 divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
      {sch.years.map((y) => <details key={y.fy} data-testid={`schedule-${y.fy}`} class="group">
        <summary class={`${cols} cursor-pointer list-none px-3 py-2 text-sm tabular-nums text-slate-900 dark:text-slate-100 [&::-webkit-details-marker]:hidden`}>
          <span class="font-medium"><span aria-hidden="true" class="mr-1 inline-block transition-transform group-open:rotate-90">›</span>{y.fy}</span>
          <span class="text-right">{y.interest}</span><span class="text-right">{y.principal}</span><span class="text-right">{y.closing}</span>
        </summary>
        <div class="overflow-x-auto px-3 pb-3">
          <table class="w-full border-collapse text-xs tabular-nums sm:text-sm">
            <thead>
              <tr class={`border-b border-slate-200 dark:border-slate-800 ${MUTED}`}>
                <th scope="col" class="py-1 pr-2 text-left font-medium">Month</th>
                <th scope="col" class="px-1 py-1 text-right font-medium max-sm:hidden">Balance at start</th>
                <th scope="col" class="px-1 py-1 text-right font-medium">Interest</th>
                <th scope="col" class="px-1 py-1 text-right font-medium">Principal</th>
                <th scope="col" class="px-1 py-1 text-right font-medium max-sm:hidden">Paid</th>
                <th scope="col" class="py-1 pl-1 text-right font-medium">Balance at end</th>
              </tr>
            </thead>
            <tbody>
              {y.months.map((m) => <tr key={m.ym} data-testid={`month-${m.ym}`} class="border-b border-slate-100 text-slate-800 dark:border-slate-800 dark:text-slate-200">
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
