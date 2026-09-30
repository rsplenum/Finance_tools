/**
 * The DSCR calculator. Two start questions narrow the rest: where the yearly figures come from and how DSCR is worked
 * out. Then the loan (or the years), the yearly figures as a table that becomes cards on phones, the lender's target,
 * and a free preview that stays provisional while anything is missing: the DSCR statement in the layout chartered
 * accountants use, and the repayment schedule. Figures: engine/dscr.ts only, via model.ts.
 */
import { useMemo, useState } from 'preact/hooks';
import { AmountField } from '../AmountField';
import { OPTIONS, PRESETS } from '../../../engine/dscr';
import { parseMonth } from '../../../engine/parse';
import { TAX_STATUS } from '../../../engine/tax';
import { inr, rs } from '../../../engine/util';
import { BUTTON, CellInput, Choice, HINT, Section, SourceNote, TextField } from '../fields';
import {
  EXAMPLE_TARGETS, OPTION_KEYS, START, TAX_CHOICES, amountOf, barText, choicesOf, loanRead, modeOf, numberOf, parseFy, presetText,
  preview, rowsOf, targetText, tidyAmount, withTaxRate, yearsOf,
  type LoanText, type Preview, type RowDef, type RowMode, type ScheduleView, type State, type StatementView, type Years,
} from './model';

type Update = (f: (s: State) => State) => void;
const showDate = (iso: string) => iso.split('-').reverse().join('-');
const notUnderstood = (text: string, read: (t: string) => unknown, example: string) =>
  text.trim() && read(text) === undefined ? `Not understood. Try ${example}.` : undefined;
const MUTED = 'text-slate-600 dark:text-slate-300';

export function DscrCalculator() {
  const [s, setS] = useState<State>(START);
  const update: Update = (f) => setS(f);
  const p = useMemo(() => preview(s), [s]);
  const rows = useMemo(() => rowsOf(s), [s]);
  const y = useMemo(() => yearsOf(s), [s]);
  return <div>
    <ClearAll shown={JSON.stringify(s) !== JSON.stringify(START)} onClear={() => setS(START)} />
    <Start s={s} update={update} />
    {p.started && <>
      {s.source === 'plan' ? <Loan s={s} update={update} y={y} p={p} /> : <YearsSection s={s} update={update} y={y} />}
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
    <Choice name="fld-source" legend="Where do the yearly figures come from?" value={s.source} onChange={(v) => update((x) => ({ ...x, source: v }))}
      options={[
        { value: 'own', label: 'My own yearly figures', hint: 'Profit after tax, depreciation, interest and instalments for each year.' },
        { value: 'plan', label: 'Work them out from the loan terms', hint: 'You give profit before interest, depreciation and tax; the page works out the loan’s interest and instalments, the tax, and the repayment schedule.' },
      ]} />
    <Choice name="fld-method" legend="How is DSCR worked out?" value={s.method} onChange={(v) => update((x) => ({ ...x, method: v }))}
      options={[
        ...PRESETS.map((m) => ({ value: m.id, label: m.label, hint: <>{presetText(m.id)}.{!m.verified && <> Not yet checked.</>}</> })),
        { value: 'choose', label: 'Choose each of the four', hint: 'For a lender who works it out differently.' },
      ]} />
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

function Figures({ s, update, rows, y }: { s: State; update: Update; rows: RowDef[]; y: Years }) {
  const years = y.years, last = years[years.length - 1];
  const setYears = (n: number) => update((x) => ({ ...x, planYears: n }));
  return <Section id="figures" title="Yearly figures">
    {!years.length
      ? <p class={`mt-2 ${HINT}`}>{s.source === 'plan'
        ? 'The years appear once the month first drawn, how it is repaid, the moratorium and the number of instalments are in.'
        : 'The years appear once the first year and the number of years are in.'}</p>
      : <>
        <p class={`mt-2 ${HINT}`}>
          In rupees, like 1,50,000 or 1.5 L{rows.some((r) => r.negative) ? '; a loss with a minus, like -50,000' : ''}.
          {' '}Tick None where there is none in any year.
        </p>
        {s.source === 'plan' && <div class="mt-4">
          <p class="text-sm font-medium text-slate-900 dark:text-slate-100">Tax rate for every year, by borrower</p>
          <div class="mt-1 flex flex-wrap gap-2">
            {TAX_CHOICES.map((t) => <button key={t.id} type="button" data-testid={`tax-${t.id}`} class={BUTTON}
              onClick={() => update((x) => withTaxRate(x, t.pct))}>{t.label}: {t.pct}%</button>)}
          </div>
          <SourceNote what="About these rates">{TAX_STATUS}</SourceNote>
        </div>}
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
      {r.hint && <span class={`mt-0.5 block text-xs ${MUTED}`}>{r.hint}</span>}
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
    {p.statement && <StatementTable st={p.statement} />}
    {p.notCounted && <p data-testid="dscr-not-counted" class={`mt-2 ${HINT}`}>{p.notCounted}</p>}
    {p.notes.length > 0 && <ul data-testid="dscr-notes" class="mt-2 space-y-0.5 text-sm text-amber-900 dark:text-amber-200">{p.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
    {p.schedule && <Schedule sch={p.schedule} />}
    <p class={`mt-6 ${HINT}`}>A free preview, worked out twice in your browser; figures are shown only when both agree.</p>
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
