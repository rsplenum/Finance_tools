/**
 * The DSCR calculator (P1b). Two start questions narrow the rest: where the yearly figures come from and how DSCR is
 * worked out. Then the loan (or the years), the yearly figures as a table that becomes cards on phones, the lender's
 * target, and a free preview that stays provisional while anything is missing. Figures: engine/dscr.ts, via model.ts.
 */
import { useMemo, useState } from 'preact/hooks';
import { AmountField } from '../AmountField';
import { OPTIONS } from '../../../engine/dscr';
import { parseMonth } from '../../../engine/parse';
import { inr, rs } from '../../../engine/util';
import { BUTTON, CellInput, Choice, HINT, Section, SourceNote, TextField } from '../fields';
import {
  COMMON, EXAMPLE_TARGETS, OPTION_KEYS, PRESET_TEXT, START, amountOf, barText, choicesOf, loanRead, modeOf, numberOf, parseFy,
  preview, rowsOf, targetText, tidyAmount, yearsOf,
  type LoanText, type Preview, type RowDef, type RowMode, type State, type Years,
} from './model';

type Update = (f: (s: State) => State) => void;
const showDate = (iso: string) => iso.split('-').reverse().join('-');
const notUnderstood = (text: string, read: (t: string) => unknown, example: string) =>
  text.trim() && read(text) === undefined ? `Not understood. Try ${example}.` : undefined;

export function DscrCalculator() {
  const [s, setS] = useState<State>(START);
  const update: Update = (f) => setS(f);
  const p = useMemo(() => preview(s), [s]);
  const rows = useMemo(() => rowsOf(s), [s]);
  const y = useMemo(() => yearsOf(s), [s]);
  return <div>
    <Start s={s} update={update} />
    {p.started && <>
      {s.source === 'plan' ? <Loan s={s} update={update} y={y} /> : <YearsSection s={s} update={update} y={y} />}
      <Figures s={s} update={update} rows={rows} y={y} />
      <TargetSection s={s} update={update} />
      <PreviewSection p={p} update={update} />
      <div class="sticky bottom-0 z-10 -mx-4 mt-10 border-t border-slate-200 bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-slate-950">
        <a href="#preview" data-testid="answer-bar" aria-live="polite" class="block text-sm font-medium text-slate-900 dark:text-slate-100">
          {barText(p)} <span aria-hidden="true">↓</span>
        </a>
      </div>
    </>}
  </div>;
}

function Start({ s, update }: { s: State; update: Update }) {
  return <div>
    <Choice name="fld-source" legend="Where do the yearly figures come from?" value={s.source} onChange={(v) => update((x) => ({ ...x, source: v }))}
      options={[
        { value: 'own', label: 'My own yearly figures', hint: 'Profit after tax, depreciation, interest and instalments for each year.' },
        { value: 'plan', label: 'Work them out from the loan terms', hint: 'You give profit before interest, depreciation and tax; the page works out the loan’s interest and instalments, and the tax.' },
      ]} />
    <Choice name="fld-method" legend="How is DSCR worked out?" value={s.method} onChange={(v) => update((x) => ({ ...x, method: v }))}
      options={[
        { value: 'preset', label: COMMON.label, hint: <>{PRESET_TEXT}.{!COMMON.verified && <> Not yet checked against a published source.</>}</> },
        { value: 'choose', label: 'Choose each of the four', hint: 'For a lender who works it out differently.' },
      ]} />
    <SourceNote what="Where the common method comes from">{COMMON.source}. Dated {showDate(COMMON.date)}.</SourceNote>
    {s.method === 'choose' && OPTION_KEYS.map((k) => <Choice key={k} name={`fld-${k}`} legend={OPTIONS[k].question} options={choicesOf(k)}
      value={s.choice[k]} onChange={(v) => update((x) => ({ ...x, choice: { ...x.choice, [k]: v } }))} />)}
  </div>;
}

function Loan({ s, update, y }: { s: State; update: Update; y: Years }) {
  const l = s.loan, set = (patch: Partial<LoanText>) => update((x) => ({ ...x, loan: { ...x.loan, ...patch } }));
  const read = loanRead(y);
  return <Section id="loan" title="The loan">
    <div class="mt-4"><AmountField value={l.amount} onCommit={(t) => set({ amount: t })} /></div>
    <div class="mt-2 grid gap-4 sm:grid-cols-2">
      <TextField id="fld-ratePct" label="Interest rate (% a year)" inputMode="decimal" placeholder="like 10.5" value={l.ratePct}
        onCommit={(t) => set({ ratePct: t })} said={notUnderstood(l.ratePct, numberOf, '10.5')} />
      <TextField id="fld-disbursed" type="month" label="Month the loan is drawn" placeholder="like 2026-04" value={l.disbursed}
        onCommit={(t) => set({ disbursed: t })} said={notUnderstood(l.disbursed, parseMonth, '2026-04 or Apr 2026')} />
    </div>
    <TextField id="fld-moratoriumMonths" class="mt-4" label="Moratorium in months (0 if none)" inputMode="numeric" value={l.moratoriumMonths}
      hint="No instalments in these months; interest is still paid." onCommit={(t) => set({ moratoriumMonths: t })}
      said={notUnderstood(l.moratoriumMonths, numberOf, '6, or 0 if none')} />
    <Choice name="fld-style" legend="Instalments" value={l.style} columns onChange={(v) => set({ style: v })} options={[
      { value: 'equal-principal', label: 'Equal instalments of principal', hint: 'Interest on top, falling as the loan is repaid.' },
      { value: 'emi', label: 'EMI', hint: 'The same amount every month, interest included.' },
    ]} />
    {l.style === 'equal-principal' && <Choice name="fld-frequency" legend="How often instalments fall due" value={l.frequency} columns
      onChange={(v) => set({ frequency: v })} options={[{ value: 'monthly', label: 'Monthly' }, { value: 'quarterly', label: 'Quarterly' }]} />}
    <TextField id="fld-instalments" class="mt-6" label="Number of instalments" inputMode="numeric" value={l.instalments}
      hint={l.style === 'emi' ? 'Monthly: an EMI is paid every month.' : l.frequency ? `${l.frequency === 'monthly' ? 'Monthly' : 'Quarterly'} instalments, after the moratorium.` : undefined}
      onCommit={(t) => set({ instalments: t })} said={notUnderstood(l.instalments, numberOf, '60')} />
    {read && <p data-testid="loan-read" class="mt-4 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-800 dark:bg-slate-800 dark:text-slate-200">{read}</p>}
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

function Figures({ s, update, rows, y }: { s: State; update: Update; rows: RowDef[]; y: Years }) {
  const years = y.years, last = years[years.length - 1];
  const setYears = (n: number) => update((x) => ({ ...x, planYears: n }));
  return <Section id="figures" title="Yearly figures">
    {!years.length
      ? <p class={`mt-2 ${HINT}`}>{s.source === 'plan'
        ? 'The years appear once the month drawn, the moratorium, the number of instalments and how often are in.'
        : 'The years appear once the first year and the number of years are in.'}</p>
      : <>
        <p class={`mt-2 ${HINT}`}>
          In rupees, like 1,50,000 or 1.5 L{rows.some((r) => r.negative) ? '; a loss with a minus, like -50,000' : ''}.
          {' '}Tick None where there is none in any year.
        </p>
        <div class="mt-4 sm:overflow-x-auto">
          <table class="w-full border-collapse text-sm max-sm:block">
            <thead class="max-sm:hidden">
              <tr class="border-b border-slate-300 dark:border-slate-700">
                <th scope="col" class="py-2 pr-3 text-left font-medium text-slate-600 dark:text-slate-300"><span class="sr-only">Figure</span></th>
                {years.map((fy) => <th key={fy} scope="col" class="px-1 py-2 text-right font-medium text-slate-700 dark:text-slate-200">{fy}</th>)}
              </tr>
            </thead>
            <tbody class="max-sm:block max-sm:space-y-3">
              {rows.map((r) => <FigureRow key={r.key} s={s} r={r} years={years} update={update} />)}
            </tbody>
          </table>
        </div>
        {s.source === 'plan' && <div class="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" data-testid="add-year" class={BUTTON} onClick={() => setYears(years.length + 1)}>Add a year after {last}</button>
          {years.length > (y.loanYears ?? 0) && <button type="button" data-testid="remove-year" class={BUTTON} onClick={() => setYears(years.length - 1)}>Remove {last}</button>}
          <span class="text-sm text-slate-600 dark:text-slate-300">A later year lets the page try a longer repayment.</span>
        </div>}
      </>}
  </Section>;
}

function FigureRow({ s, r, years, update }: { s: State; r: RowDef; years: string[]; update: Update }) {
  const mode = modeOf(s, r), text = (i: number) => s.cells[r.key]?.[i] ?? '';
  const read = r.percent ? numberOf : amountOf;
  const setMode = (m: RowMode) => update((x) => ({ ...x, modes: { ...x.modes, [r.modeKey]: x.modes[r.modeKey] === m ? 'years' : m } }));
  const setCell = (i: number, t: string) => update((x) => {
    const cells = [...(x.cells[r.key] ?? [])];
    cells[i] = t;
    return { ...x, cells: { ...x.cells, [r.key]: cells } };
  });
  return <tr class="border-b border-slate-200 dark:border-slate-800 max-sm:grid max-sm:grid-cols-2 max-sm:gap-x-3 max-sm:gap-y-2 max-sm:rounded-lg max-sm:border max-sm:border-slate-300 max-sm:p-3 dark:max-sm:border-slate-700">
    <th scope="row" class="py-2 pr-3 text-left align-top font-normal max-sm:col-span-2 max-sm:p-0 sm:min-w-44">
      <span class="block font-medium text-slate-900 dark:text-slate-100">{r.label}</span>
      {r.modes.length > 0 && <span class="mt-1 flex flex-wrap gap-x-4 gap-y-1">
        {r.modes.map((m) => <label key={m} class="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
          <input type="checkbox" id={`fld-${r.key}-${m}`} checked={mode === m} onChange={() => setMode(m)} class="size-4 accent-teal-700 dark:accent-teal-500" />
          {m === 'none' ? 'None' : 'Same every year'}
        </label>)}
      </span>}
    </th>
    {years.map((fy, i) => {
      const id = `fld-${r.key}-${fy}`, asked = mode === 'years' || (mode === 'same' && i === 0), t = text(asked ? i : 0);
      return <td key={fy} class={`py-2 pl-1 align-top max-sm:p-0 ${asked ? '' : 'max-sm:hidden'}`}>
        {asked
          ? <>
            <label for={id} class="mb-0.5 block text-xs text-slate-600 sm:sr-only dark:text-slate-300">{mode === 'same' ? 'Every year' : fy}</label>
            <CellInput id={id} name={`${r.label}, ${mode === 'same' ? 'every year' : fy}`} value={t} onCommit={(v) => setCell(i, v)}
              tidy={r.percent ? undefined : tidyAmount} invalid={!!t.trim() && read(t) === undefined} decimal={!r.negative} />
          </>
          : <span class="block py-[11px] pr-[9px] text-right tabular-nums text-slate-600 dark:text-slate-300">{mode === 'none' ? '0' : t || '—'}</span>}
      </td>;
    })}
  </tr>;
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
      {p.blocked ? 'No figures' : p.needs.length ? `Provisional: ${p.needs.length} still needed` : 'Complete'}
    </p>
    {p.blocked && <p data-testid="dscr-blocked" role="alert" class={`${box} border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200`}>{p.blocked}</p>}
    {p.average !== undefined && <dl class="mt-4 grid grid-cols-2 gap-3">
      <div class="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
        <dt class="text-sm text-slate-600 dark:text-slate-300">Average DSCR</dt>
        <dd data-testid="dscr-average" class="text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">{p.average}</dd>
      </div>
      <div class="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
        <dt class="text-sm text-slate-600 dark:text-slate-300">Lowest year</dt>
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
    {p.rows.length > 0 && <ResultTable p={p} />}
    {p.notCounted && <p data-testid="dscr-not-counted" class={`mt-2 ${HINT}`}>{p.notCounted}</p>}
    {p.notes.length > 0 && <ul data-testid="dscr-notes" class="mt-2 space-y-0.5 text-sm text-amber-900 dark:text-amber-200">{p.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
    <p class={`mt-6 ${HINT}`}>A free preview, worked out twice in your browser; figures are shown only when both agree.</p>
  </Section>;
}

function ResultTable({ p }: { p: Preview }) {
  return <div class="mt-4 sm:overflow-x-auto">
    <table data-testid="dscr-rows" class="w-full border-collapse text-sm max-sm:block">
      <caption class="sr-only">DSCR year by year, figures in rupees</caption>
      <thead class="max-sm:hidden">
        <tr class="border-b border-slate-300 dark:border-slate-700">
          <th scope="col" class="py-2 pr-2 text-left font-medium text-slate-700 dark:text-slate-200">Year</th>
          {p.columns.map((c) => <th key={c} scope="col" class="px-2 py-2 text-right font-medium text-slate-700 dark:text-slate-200">{c}</th>)}
          <th scope="col" class="py-2 pl-2 text-right font-medium text-slate-700 dark:text-slate-200">DSCR</th>
        </tr>
      </thead>
      <tbody class="max-sm:block max-sm:space-y-3">
        {p.rows.map((r) => <tr key={r.fy} data-testid={`dscr-row-${r.fy}`}
          class="border-b border-slate-200 dark:border-slate-800 max-sm:block max-sm:rounded-lg max-sm:border max-sm:border-slate-300 max-sm:p-3 dark:max-sm:border-slate-700">
          <th scope="row" class="py-2 pr-2 text-left align-top font-medium text-slate-900 max-sm:block max-sm:p-0 max-sm:pb-1 dark:text-slate-100">
            {r.fy}{!r.counted && <span class="ml-2 text-xs font-normal text-slate-600 dark:text-slate-300">not counted</span>}
          </th>
          {r.values.map((v, i) => <td key={i} class="px-2 py-2 text-right tabular-nums text-slate-800 max-sm:flex max-sm:justify-between max-sm:gap-3 max-sm:p-0 max-sm:py-0.5 dark:text-slate-200">
            <span class="text-left text-slate-600 sm:hidden dark:text-slate-300">{p.columns[i]}</span><span>{v}</span>
          </td>)}
          <td class={`py-2 pl-2 text-right font-semibold tabular-nums max-sm:flex max-sm:justify-between max-sm:p-0 max-sm:pt-1 ${r.counted ? 'text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-300'}`}>
            <span class="font-normal text-slate-600 sm:hidden dark:text-slate-300">DSCR</span><span data-testid="dscr">{r.dscr}</span>
          </td>
        </tr>)}
      </tbody>
    </table>
  </div>;
}
