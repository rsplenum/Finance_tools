/**
 * The project report for a term loan with working capital. Who the borrower is (it sets the tax); the cost of the
 * project by head; the term loan and any other funds (the promoters' share is worked out); the loan's terms; sales and
 * costs; working capital. Then the report as the engine works it out, provisional while anything is missing, table by
 * table; what it assumes until changed; and the three downloads. Figures: engine/report.ts only, via model.ts.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { parseMonth } from '../../../engine/parse';
import { BUTTON, Choice, HINT, Section, TextField } from '../fields';
import { printable } from '../doc/pdf';
import { isoDate, save, type FileKind } from '../download';
import { monthText } from '../dscr/model';
import { docNeeds, docStatus, fileName, reportDoc } from './document';
import {
  PMEGP, ACTIVITY_CHOICES, AREA_CHOICES, BORROWER_CHOICES, CATEGORY_CHOICES, EMPTY, HEADS, REPAYMENT_CHOICES, SCHEME_CHOICES,
  COLLATERAL_HINT, amountOf, assumptionsOf, plainOf, preview, statusText, tidyAmount, viableOf,
  type CheckRow, type ReportFacts, type ReportPreview, type ReportState, type ViableLine, type ViableView, type ViewTable,
} from './model';

type Update = (f: (s: ReportState) => ReportState) => void;
const MUTED = 'text-slate-600 dark:text-slate-300';
const SALES_BY: { value: ReportState['salesBy']; label: string }[] = [
  { value: 'drivers', label: 'The capacity, its use and the price' }, { value: 'typed', label: 'Sales I type, with their growth' }];
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
      <Choice name="fld-scheme" legend="A government scheme" options={SCHEME_CHOICES} value={s.scheme} columns
        onChange={(scheme) => update((x) => ({ ...x, scheme }))} />
      {s.scheme === 'pmegp' && <>
        <p class={`mt-2 ${HINT}`}>The margin money is worked out by the scheme's rules, as read in {monthText(PMEGP.date.slice(0, 7))} and not yet checked against KVIC's guideline.</p>
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
      <details id="more-options" class="mt-4 rounded-lg border border-slate-200 dark:border-slate-800">
        <summary class="cursor-pointer px-4 py-3 font-medium text-teal-800 dark:text-teal-300">More options: the use of the capacity, the price, typed sales, collateral</summary>
        <div class="px-4 pb-4">
          <Choice name="fld-salesBy" legend="Sales come from" options={SALES_BY} value={s.salesBy} columns
            onChange={(salesBy) => update((x) => ({ ...x, salesBy }))} />
          <div class="mt-4 grid gap-4 sm:grid-cols-2">
            {s.salesBy === 'drivers' ? <>
              <TextField id="fld-utilisation" label="Use of the capacity by year (%)" hint="One a year from the first sales; the last holds after." value={s.utilisation} placeholder="like 60, 70, 80"
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
    </Section>
    <Result s={s} p={p} />
    <Section id="assumed" title="Assumed until changed">
      <ul data-testid="rep-assumed" class="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300">
        {assumptionsOf(s).map((a) => <li key={a.id}><span class="font-medium text-slate-900 dark:text-slate-100">{a.what}:</span> {a.shown}. <span class={MUTED}>{a.why}.</span></li>)}
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

const TONE = { meets: 'bg-teal-600 dark:bg-teal-400', misses: 'bg-red-600 dark:bg-red-400', wait: 'bg-slate-300 dark:bg-slate-600' } as const;
const INK = { meets: 'text-teal-800 dark:text-teal-300', misses: 'text-red-700 dark:text-red-300', wait: MUTED } as const;

/** One ratio as a bar against its level (MV2b): the track runs from nil to twice the level, so the level is the line at the
 * middle; under it the rupees its worst year is short, from the engine. */
function Bar({ c }: { c: CheckRow }) {
  return <li data-testid={`rep-check-${c.id}`} class="py-1.5">
    <p class="text-sm text-slate-800 dark:text-slate-200">{c.label}</p>
    <div aria-hidden="true" class="relative mt-1 h-3 rounded-full bg-slate-100 dark:bg-slate-800">
      <div class={`h-3 rounded-full ${TONE[c.verdict]}`} style={{ width: `${c.verdict === 'misses' ? Math.max(c.bar, 3) : c.bar}%` }} />
      <div class="absolute -inset-y-[3px] left-1/2 w-0.5 bg-slate-900 dark:bg-slate-100" />
    </div>
    <p class="mt-0.5 text-sm"><span class={`tabular-nums ${INK[c.verdict]}`}>{c.verdict === 'misses' ? 'Misses: ' : c.verdict === 'meets' ? 'Meets: ' : ''}{c.worst}</span>
      <span class={`text-xs ${MUTED}`}> · level {c.level}{c.at === 'most' ? ', a shorter bar is better' : ''}</span></p>
    {c.short && <p data-testid={`rep-short-${c.id}`} class="text-sm font-medium text-red-700 dark:text-red-300">{c.short}</p>}
  </li>;
}

/** A lever on the board: how far it moves, now against needed, and the ratios it brings to their level. */
function Lever({ l }: { l: ViableLine }) {
  const most = l.bars ? Math.max(l.bars.now, l.bars.to, 1e-9) : 1, w = (x: number) => `${Math.max(0, (x / most) * 100)}%`;
  return <li data-testid={`rep-viable-${l.id}`} class={`rounded-lg border p-3 ${l.reach?.out ? 'border-red-300 dark:border-red-800' : 'border-slate-300 dark:border-slate-600'}`}>
    <div class="flex items-baseline justify-between gap-2">
      <span class="font-medium text-slate-900 dark:text-slate-100">{l.head}</span>
      {l.move && <span data-testid={`rep-move-${l.id}`} class="shrink-0 text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-100">{l.move}</span>}
    </div>
    {l.bars && <div class="mt-1 space-y-1 text-xs tabular-nums">
      {[['Now', l.bars.now, l.bars.nowText, 'bg-slate-400 dark:bg-slate-500'], ['Needed', l.bars.to, l.bars.toText, l.reach?.out ? 'bg-red-600 dark:bg-red-400' : 'bg-teal-600 dark:bg-teal-400']].map(([k, x, t, tone]) =>
        <div key={k as string} class="flex items-center gap-2">
          <span class={`w-14 shrink-0 ${MUTED}`}>{k}</span>
          <div aria-hidden="true" class="h-2.5 flex-1 rounded-full bg-slate-100 dark:bg-slate-800"><div class={`h-2.5 rounded-full ${tone}`} style={{ width: w(x as number) }} /></div>
          <span class="w-24 shrink-0 text-right text-slate-800 dark:text-slate-200">{t}</span>
        </div>)}
    </div>}
    {l.reach && <p data-testid={`rep-reach-${l.id}`} class={`mt-1.5 text-sm font-medium ${l.reach.out ? 'text-red-700 dark:text-red-300' : 'text-amber-900 dark:text-amber-200'}`}>{l.reach.text}</p>}
    {(l.fixes.length > 0 || l.still.length > 0) && <ul class="mt-1.5 flex flex-wrap gap-1 text-xs">
      {l.fixes.map((f) => <li key={f} class="rounded-full bg-teal-100 px-2 py-0.5 text-teal-900 dark:bg-teal-950 dark:text-teal-200">✓ {f}</li>)}
      {l.still.map((f) => <li key={f} class="rounded-full bg-red-100 px-2 py-0.5 text-red-900 dark:bg-red-950 dark:text-red-200">✗ {f}</li>)}
    </ul>}
    <p data-testid={`rep-text-${l.id}`} class="mt-1.5 text-sm text-slate-800 dark:text-slate-200">{l.text}</p>
    {l.note && <p class={`mt-0.5 text-sm ${MUTED}`}>{l.note}</p>}
  </li>;
}

/** Why it does not work yet: each lender's ratio as a bar against its level in its worst year (D-UX-51), then "Make it
 * viable" (D-UX-50, D-UX-52) as a board of levers: worked on a tap, since it runs the whole report many times; cleared when
 * a figure changes. */
function Viable({ s, p }: { s: ReportState; p: ReportPreview }) {
  const [v, setV] = useState<ViableView | undefined>();
  useEffect(() => setV(undefined), [s]);
  const group = (by: 'borrower' | 'lender', title: string) => {
    const ls = v?.lines.filter((l) => l.by === by) ?? [];
    return ls.length > 0 && <>
      <p class="mt-3 text-sm font-medium text-slate-800 dark:text-slate-200">{title}</p>
      <ul class="mt-1 space-y-2">{ls.map((l) => <Lever key={l.id} l={l} />)}</ul>
    </>;
  };
  return <div class="mt-3">
    {p.checks && <div data-testid="rep-checks">
      <p class="font-medium text-slate-900 dark:text-slate-100">{p.misses ? 'Why it does not work yet' : 'Against a lender’s levels'}</p>
      <p class={`text-xs ${MUTED}`}>Each ratio in its worst year; the line is the lender’s level.</p>
      <ul class="mt-1 divide-y divide-slate-100 dark:divide-slate-800">{p.checks.map((c) => <Bar key={c.id} c={c} />)}</ul>
    </div>}
    {p.collateralNote && <p data-testid="rep-collateral-note" class={`mt-1 ${HINT}`}>{p.collateralNote}</p>}
    {p.longTerm && <p data-testid="rep-long-term" class="mt-2 text-sm text-red-700 dark:text-red-300">{p.longTerm}</p>}
    {p.misses && <p data-testid="rep-misses" class="mt-2 text-sm text-red-700 dark:text-red-300">{p.misses}</p>}
    {!v && <button type="button" data-testid="rep-viable" class={`mt-2 ${BUTTON}`} onClick={() => setV(viableOf(s))}>
      {p.misses ? 'Make it viable' : 'How far can sales fall?'}</button>}
    {v && <div data-testid="rep-viable-box" class="mt-2">
      <p class="font-medium text-slate-900 dark:text-slate-100">{v.title}</p>
      {group('borrower', v.meets ? 'The room' : 'Your changes')}
      {group('lender', 'The lender’s, if it agrees')}
      <p class={`mt-2 ${HINT}`}>{v.foot}</p>
    </div>}
  </div>;
}

function Result({ s, p }: { s: ReportState; p: ReportPreview }) {
  const v = p.view;
  return <Section id="report" title="The project report">
    <p data-testid="rep-status" class={`mt-3 inline-block rounded-full px-2.5 py-0.5 text-sm font-medium ${p.needs.length || p.blocked || p.short
      ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200' : 'bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-200'}`}>{statusText(p)}</p>
    {p.blocked && <p class="mt-2 text-sm text-red-700 dark:text-red-300">{p.blocked}</p>}
    {v && !p.blocked && <Viable s={s} p={p} />}
    {p.short && <p data-testid="rep-short" class="mt-2 text-sm text-red-700 dark:text-red-300">{p.short}</p>}
    {p.flags.length > 0 && <ul data-testid="rep-flags" class="mt-2 list-disc space-y-0.5 pl-5 text-sm text-amber-900 dark:text-amber-200">{p.flags.map((n) => <li key={n}>{n}</li>)}</ul>}
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
