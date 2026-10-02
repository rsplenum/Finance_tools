/**
 * The project report for a term loan with working capital. Who the borrower is (it sets the tax); the cost of the
 * project by head; the term loan and any other funds (the promoters' share is worked out); the loan's terms; sales and
 * costs; working capital. Then the report as the engine works it out, provisional while anything is missing, table by
 * table; what it assumes until changed; and the three downloads. Figures: engine/report.ts only, via model.ts.
 */
import { useMemo, useState } from 'preact/hooks';
import { parseMonth } from '../../../engine/parse';
import { BUTTON, Choice, HINT, Section, TextField } from '../fields';
import { printable } from '../doc/pdf';
import { isoDate, save, type FileKind } from '../download';
import { monthText } from '../dscr/model';
import { docNeeds, docStatus, fileName, reportDoc } from './document';
import {
  ASSUMPTIONS, BORROWER_CHOICES, EMPTY, HEADS, REPAYMENT_CHOICES, amountOf, plainOf, preview, statusText, tidyAmount,
  type ReportFacts, type ReportPreview, type ReportState, type ViewTable,
} from './model';

type Update = (f: (s: ReportState) => ReportState) => void;
const MUTED = 'text-slate-600 dark:text-slate-300';
const bad = (t: string, read: (t: string) => unknown) => !!t.trim() && read(t) === undefined;
const notUnderstood = (t: string, read: (t: string) => unknown, example: string) => (bad(t, read) ? `Not understood. Type ${example}.` : undefined);

export function ReportCalculator() {
  const [s, setS] = useState<ReportState>(EMPTY);
  const update: Update = (f) => setS(f);
  const p = useMemo(() => preview(s), [s]);
  // Each setter builds on the latest state (x), never on the one this render saw.
  const amount = (id: string, label: string, value: string, set: (x: ReportState, t: string) => ReportState, hint?: string) =>
    <TextField id={id} label={label} hint={hint} inputMode="decimal" value={value} tidy={tidyAmount} placeholder="like 10 L or 10,00,000"
      invalid={bad(value, amountOf)} said={notUnderstood(value, amountOf, '10,00,000 or 10 L')} onCommit={(t) => update((x) => set(x, t))} />;
  const percent = (id: string, label: string, value: string, set: (x: ReportState, t: string) => ReportState, placeholder: string) =>
    <TextField id={id} label={label} inputMode="decimal" value={value} placeholder={placeholder}
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
      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        {amount('fld-tl-amount', 'Term loan', s.loan.amount, (x, t) => ({ ...x, loan: { ...x.loan, amount: t } }))}
        {amount('fld-subsidy', 'Capital subsidy, if any', s.subsidy, (x, subsidy) => ({ ...x, subsidy }))}
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
        {amount('fld-sales', 'Sales in the first year', s.sales, (x, sales) => ({ ...x, sales }))}
        {percent('fld-salesGrowth', 'Sales: growth a year (%)', s.salesGrowth, (x, salesGrowth) => ({ ...x, salesGrowth }), 'like 10')}
        {percent('fld-variablePct', 'Materials and other variable costs (% of sales)', s.variablePct, (x, variablePct) => ({ ...x, variablePct }), 'like 65')}
        {amount('fld-fixed', 'Fixed costs in the first year', s.fixed, (x, fixed) => ({ ...x, fixed }), 'Salaries, rent and other overheads.')}
        {percent('fld-fixedGrowth', 'Fixed costs: growth a year (%)', s.fixedGrowth, (x, fixedGrowth) => ({ ...x, fixedGrowth }), 'like 5')}
      </div>
    </Section>
    <Section id="wc" title="Working capital">
      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        {amount('fld-wcLimit', 'Working-capital limit sought (0 if none)', s.wcLimit, (x, wcLimit) => ({ ...x, wcLimit }))}
        {percent('fld-wcRate', 'Its interest rate (% a year)', s.wcRate, (x, wcRate) => ({ ...x, wcRate }), 'like 11')}
        {(['stock', 'debtors', 'creditors'] as const).map((k) => <div key={k}>
          {percent(`fld-days-${k}`, `Days of ${k}`, s.days[k], (x, t) => ({ ...x, days: { ...x.days, [k]: t } }), 'like 30')}
        </div>)}
      </div>
    </Section>
    <Result p={p} />
    <Section id="assumed" title="Assumed until changed">
      <ul data-testid="rep-assumed" class="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300">
        {ASSUMPTIONS.map((a) => <li key={a.id}><span class="font-medium text-slate-900 dark:text-slate-100">{a.what}:</span> {a.shown}. <span class={MUTED}>{a.why}.</span></li>)}
      </ul>
    </Section>
    <Download s={s} p={p} update={update} />
  </div>;
}

/** One of the report's tables, its years across; it scrolls sideways inside itself on a phone. */
function ReportTable({ t }: { t: ViewTable }) {
  const cols = t.columns.length + 1;
  return <details open={t.id === 'cost' || t.id === 'finance' || t.id === 'dscr'} class="mt-4 rounded-lg border border-slate-200 dark:border-slate-800">
    <summary class="cursor-pointer px-3 py-2 font-medium text-slate-900 dark:text-slate-100">{t.title}</summary>
    <div class="overflow-x-auto px-3 pb-3">
      <table data-testid={`rep-${t.id}`} class="w-full border-collapse text-sm">
        <thead><tr class="border-b border-slate-300 dark:border-slate-700">
          <th scope="col" class="py-2 pr-3 text-left font-medium text-slate-700 dark:text-slate-200">{t.first}</th>
          {t.columns.map((c) => <th key={c} scope="col" class="px-2 py-2 text-right font-medium whitespace-nowrap text-slate-700 dark:text-slate-200">{c}</th>)}
        </tr></thead>
        <tbody>
          {t.rows.map((r, i) => r.kind === 'head'
            ? <tr key={i}><th colSpan={cols} scope="colgroup" class="pt-3 pb-1 text-left text-xs font-semibold tracking-wide text-slate-600 uppercase dark:text-slate-300">{r.label}</th></tr>
            : <tr key={i} class={`border-b border-slate-100 dark:border-slate-800 ${r.kind ? 'border-t border-t-slate-300 dark:border-t-slate-600' : ''}`}>
              <th scope="row" class={`min-w-48 py-1.5 pr-3 text-left ${r.kind ? 'font-semibold' : 'font-normal'} text-slate-800 dark:text-slate-200`}>{r.label}</th>
              {r.values.map((x, k) => <td key={k} class={`px-2 py-1.5 text-right whitespace-nowrap tabular-nums ${r.kind ? 'font-semibold' : ''} text-slate-800 dark:text-slate-200`}>{x}</td>)}
            </tr>)}
        </tbody>
      </table>
    </div>
  </details>;
}

function Result({ p }: { p: ReportPreview }) {
  const v = p.view;
  return <Section id="report" title="The project report">
    <p data-testid="rep-status" class={`mt-3 inline-block rounded-full px-2.5 py-0.5 text-sm font-medium ${p.needs.length || p.blocked
      ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200' : 'bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-200'}`}>{statusText(p)}</p>
    {p.blocked && <p class="mt-2 text-sm text-red-700 dark:text-red-300">{p.blocked}</p>}
    {p.needs.length > 0 && <ul data-testid="rep-needs" class="mt-2 list-disc space-y-0.5 pl-5 text-sm text-slate-700 dark:text-slate-300">{p.needs.map((n) => <li key={n}>{n}</li>)}</ul>}
    {v && <>
      <dl class="mt-4 grid gap-3 sm:grid-cols-3">
        {v.key.map((k, i) => <div key={k.label} class="rounded-lg bg-slate-100 p-3 dark:bg-slate-800">
          <dt class={`text-sm ${MUTED}`}>{k.label}</dt>
          <dd data-testid={`rep-key-${i}`} class="text-xl font-semibold text-slate-900 tabular-nums dark:text-slate-100">{k.value}</dd>
          {k.note && <dd class={`text-sm ${MUTED}`}>{k.note}</dd>}
        </div>)}
      </dl>
      {v.tables.map((t) => <ReportTable key={t.id} t={t} />)}
    </>}
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
          ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200' : 'bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-200'}`}>{docStatus(s, p)}</p>
        {own.length > 0 && <ul data-testid="rep-doc-needs" class="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-700 dark:text-slate-300">{own.map((n) => <li key={n}>{n}</li>)}</ul>}
        <div class="mt-3 flex flex-wrap gap-2">
          <button type="button" data-testid="rep-download-pdf" class={BUTTON} onClick={() => go('pdf')}>Download PDF</button>
          <button type="button" data-testid="rep-download-xlsx" class={BUTTON} onClick={() => go('xlsx')}>Download Excel</button>
          <button type="button" data-testid="rep-download-docx" class={BUTTON} onClick={() => go('docx')}>Download Word</button>
        </div>
      </div>
      : <p data-testid="rep-doc-wait" class={`mt-4 ${HINT}`}>{p.blocked ? 'No document while the two computations disagree.' : 'The document can be made once the report shows figures.'}</p>}
  </Section>;
}
