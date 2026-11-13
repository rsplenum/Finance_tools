/**
 * The CMA page's logic, apart from the page (as report/model.ts): typed text to the engine's input, and its result to
 * Forms I to VI and the ratios as tables in words, with the engine's exact figures beside them for the Excel copy.
 * Pure, no DOM. Figures: engine/cma.ts only.
 */
import { ALL_ANSWERED, questionsLeft } from '../verdict';
import { ASSUMPTIONS, HEADS, TURNOVER, YEARS, cma, fyLabels, subtotalsOf, yearName, type Cma, type CmaInput, type CmaYear, type FlowYear, type HeadId, type Subtotals, type Turnover, type YearId, type YearKind } from '../../../engine/cma';
import { parseAmount } from '../../../engine/parse';
import { inr } from '../../../engine/util';
import { EXAMPLE } from './example';
import type { BenchmarkText } from '../board-model';

export interface CmaFacts { name: string; preparedBy: string; lender?: string }
export type Grid = Record<YearId, Record<HeadId, string>>;
/** `loanCase`: a fresh or enhanced limit, or a renewal, which sets a lender's levels (D-UX-51), unset until the borrower
 * says; `collateral`, its market value (More options); `promotersMost`, the most they can bring in all, for the plan. */
export interface CmaState {
  startYear: number; figures: Grid; existingLimit: string; quasi: boolean; doc: CmaFacts;
  loanCase: '' | 'fresh' | 'renewal'; collateral: string; promotersMost: string;
  /** The benchmarks the user changed (BEN1), as typed; kept when the case changes, until reset. */
  benchmarks?: BenchmarkText;
}

/** The year now running starts in April: in January to March it is the one that began last April. */
export const startYearOf = (d: Date) => d.getFullYear() - (d.getMonth() < 3 ? 1 : 0);
const blankYear = () => Object.fromEntries(HEADS.map((h) => [h.id, ''])) as Record<HeadId, string>;
export const emptyState = (startYear: number): CmaState => ({
  startYear, figures: Object.fromEntries(YEARS.map((y) => [y.id, blankYear()])) as Grid, existingLimit: '', quasi: false, doc: { name: '', preparedBy: '', lender: '' },
  loanCase: '', collateral: '', promotersMost: '',
});
/** Case K (tests/cma.test.ts), typed in for the years from `startYear`, to try the page. */
export const exampleState = (s: CmaState): CmaState => ({
  ...s, existingLimit: inr(EXAMPLE.existingLimit), loanCase: 'fresh',
  figures: Object.fromEntries(YEARS.map((y, k) => [y.id, Object.fromEntries(HEADS.map((h) => [h.id, inr(EXAMPLE.rows[h.id][k] * 100000)]))])) as Grid,
});
export { ASSUMPTIONS, HEADS, YEARS };

export const amountOf = (t: string) => (t.trim() ? parseAmount(t) : undefined);
export const tidyAmount = (t: string) => { const n = amountOf(t); return n === undefined ? t : inr(n, Number.isInteger(n) ? 0 : 2); };
/** The years as the page heads its columns: the year, and audited, estimate or projection. */
export const columnsOf = (startYear: number) => { const fy = fyLabels(startYear); return YEARS.map((y) => ({ id: y.id, fy: fy[y.id], kind: y.kind as YearKind })); };

export function inputOf(s: CmaState): CmaInput {
  const figures: CmaInput['figures'] = {};
  for (const y of YEARS) {
    const row = s.figures[y.id], typed = HEADS.filter((h) => row[h.id].trim());
    // A figure typed but not understood is NaN, so the engine asks it again; a blank stays blank.
    if (typed.length) figures[y.id] = Object.fromEntries(typed.map((h) => [h.id, amountOf(row[h.id]) ?? NaN]));
  }
  const collateral = s.collateral.trim() ? amountOf(s.collateral) ?? NaN : undefined;
  return { startYear: s.startYear, figures, existingLimit: amountOf(s.existingLimit), quasiEquity: s.quasi, ...(collateral !== undefined ? { collateral } : {}) };
}

/** A year's subtotals as it is typed (UX9, review finding 3), the engine's: a figure not understood keeps its subtotal waiting. */
export const subtotals = (s: CmaState, id: YearId): Subtotals => subtotalsOf(inputOf(s).figures[id] ?? {}, s.quasi);

// ---- Forms I to VI and the ratios, for the page and the document alike ----

export type RowKind = 'head' | 'total' | 'ratio';
/** A row: its words for each column, the engine's exact figures (`fig`: rupees, or a ratio or percentage), and its name. */
export interface ViewRow { label: string; values: string[]; n?: (number | undefined)[]; kind?: RowKind; fig?: 'ratio' }
export interface ViewTable { id: string; title: string; first: string; columns: string[]; rows: ViewRow[] }

const ratio = (x?: number) => (x === undefined || !Number.isFinite(x) ? '—' : x.toFixed(2));
const pct = (x?: number) => (x === undefined || !Number.isFinite(x) ? '—' : `${x.toFixed(2)}%`);
const days = (x?: number) => (x === undefined || !Number.isFinite(x) ? '—' : x.toFixed(0));
const head = (label: string): ViewRow => ({ label, values: [], kind: 'head' });
function rowsOf<T>(items: T[]) {
  const line = (label: string, f: (y: T) => number, kind?: RowKind): ViewRow =>
    ({ label, values: items.map((y) => inr(f(y), Number.isInteger(f(y)) ? 0 : 2)), n: items.map(f), ...(kind ? { kind } : {}) });
  const ratios = (label: string, f: (y: T) => number | undefined, show = ratio): ViewRow =>
    ({ label, values: items.map((y) => show(f(y))), n: items.map(f), fig: 'ratio' });
  return { line, ratios };
}
const label = (id: HeadId) => (HEADS.find((h) => h.id === id) as { label: string }).label;

export interface CmaView { tables: ViewTable[]; key: { label: string; value: string; note?: string }[]; flags: string[]; years: string[] }

export function viewOf(r: Cma, quasi: boolean): CmaView {
  const ys = r.years, years = ys.map((y) => yearName(y.fy, y.kind)), { line, ratios } = rowsOf<CmaYear>(ys), f = (id: HeadId) => (y: CmaYear) => y.f[id];
  const formI: ViewTable = {
    id: 'form1', title: 'Form I. The working-capital limit', first: 'Limit', columns: ['Rupees'],
    rows: [
      { label: 'Limit you have today, from all banks', values: [inr(r.existingLimit)], n: [r.existingLimit] },
      { label: `Proposed: bank borrowing in the ${ys.at(-1)?.fy} balance sheet`, values: [inr(r.proposed)], n: [r.proposed] },
      { label: `Assessed by the turnover method for ${ys.at(-1)?.fy}`, values: [inr(r.limit)], n: [r.limit], kind: 'total' },
    ],
  };
  const formII: ViewTable = {
    id: 'form2', title: 'Form II. Operating statement', first: 'Rupees', columns: years,
    rows: [
      line(label('sales'), f('sales')), ratios('Growth in sales', (y) => y.growthPct, pct),
      line(label('materials'), f('materials')), line(label('otherDirect'), f('otherDirect')),
      line(label('depreciation'), f('depreciation')), line('Cost of sales', (y) => y.costOfSales, 'total'),
      line('Gross profit', (y) => y.grossProfit, 'total'),
      line(label('employees'), f('employees')), line(label('sga'), f('sga')),
      line('Operating profit before interest', (y) => y.pbit, 'total'),
      line(label('wcInterest'), f('wcInterest')), line(label('tlInterest'), f('tlInterest')),
      line('Operating profit before tax', (y) => y.opPbt, 'total'),
      line(label('otherIncome'), f('otherIncome')), line('Profit before tax', (y) => y.pbt, 'total'),
      line(label('tax'), f('tax')), line('Net profit', (y) => y.netProfit, 'total'),
      line(label('drawings'), f('drawings')), line('Profit kept in the business', (y) => y.retained, 'total'),
    ],
  };
  const formIII: ViewTable = {
    id: 'form3', title: 'Form III. Analysis of the balance sheet', first: 'Rupees', columns: years,
    rows: [
      head('Current liabilities'),
      line(label('bankWc'), f('bankWc')), line(label('creditors'), f('creditors')),
      line('Term-loan instalments due within 12 months', f('tlDue12')), line(label('otherCl'), f('otherCl')),
      line('Total current liabilities', (y) => y.currentLiabilities, 'total'),
      head('Term liabilities'),
      line('Term loans, less the instalments due within 12 months', (y) => y.f.termLoans - y.f.tlDue12),
      ...(quasi ? [] : [line(label('promoterLoans'), f('promoterLoans'))]),
      line('Total term liabilities', (y) => y.termLiabilities, 'total'),
      line('Total outside liabilities', (y) => y.outside, 'total'),
      head('Net worth'),
      line(label('capital'), f('capital')), line(label('reserves'), f('reserves')),
      ...(quasi ? [line(`${label('promoterLoans')}, staying in the business`, f('promoterLoans'))] : []),
      line('Net worth', (y) => y.netWorth, 'total'),
      line('Total liabilities', (y) => y.liabilities, 'total'),
      head('Assets'),
      line(label('stock'), f('stock')), line(label('debtors'), f('debtors')),
      line(label('cash'), f('cash')), line(label('otherCa'), f('otherCa')),
      line('Total current assets', (y) => y.currentAssets, 'total'),
      line(label('netBlock'), f('netBlock')), line(label('nonCurrent'), f('nonCurrent')),
      line('Total assets', (y) => y.assets, 'total'),
    ],
  };
  const formIV: ViewTable = {
    id: 'form4', title: 'Form IV. Current assets and current liabilities', first: 'Rupees', columns: years,
    rows: [
      line('Stock', f('stock')), ratios('Days, of the cost of sales', (y) => y.stockDays, days),
      line('Debtors', f('debtors')), ratios('Days, of net sales', (y) => y.debtorDays, days),
      line('Cash and bank balances', f('cash')), line('Other current assets', f('otherCa')),
      line('Total current assets', (y) => y.currentAssets, 'total'),
      line('Creditors for goods', f('creditors')), ratios('Days, of the materials consumed', (y) => y.creditorDays, days),
      line('Other current liabilities, with term-loan instalments due within 12 months', (y) => y.f.otherCl + y.f.tlDue12),
      line('Current liabilities other than bank borrowing', (y) => y.currentLiabilities - y.f.bankWc, 'total'),
      line('Working-capital gap', (y) => y.currentAssets - y.currentLiabilities + y.f.bankWc, 'total'),
      line('Net working capital', (y) => y.nwc, 'total'), line('Bank borrowing for working capital', f('bankWc')),
    ],
  };
  const t = rowsOf<Turnover>(r.turnover);
  const T = TURNOVER;
  const formV: ViewTable = {
    id: 'form5', title: 'Form V. The limit by the turnover method', first: 'Rupees', columns: r.turnover.map((x) => yearName(x.fy, ys.find((y) => y.fy === x.fy)?.kind as YearKind)),
    rows: [
      t.line('Turnover: net sales', (x) => x.turnover), t.line(`Working capital needed: ${T.needPct}% of the turnover`, (x) => x.need),
      t.line(`The borrower’s margin: at least ${T.marginPct}% of the turnover`, (x) => x.margin), t.line('Net working capital', (x) => x.nwc),
      t.line(`The need less the ${T.marginPct}% margin`, (x) => x.onMargin), t.line('The need less the net working capital', (x) => x.onNwc),
      t.line('The limit: the lower of the two', (x) => x.limit, 'total'),
      ...(r.turnover.some((x) => x.short > 0) ? [t.line('The margin is short by', (x) => x.short)] : []),
    ],
  };
  const w = rowsOf<FlowYear>(r.flow), any = (k: keyof FlowYear) => r.flow.some((x) => (x[k] as number) > 0.005);
  const opt = (k: keyof FlowYear, what: string) => (any(k) ? [w.line(what, (x) => x[k] as number)] : []);
  const formVI: ViewTable = {
    id: 'form6', title: 'Form VI. Funds flow', first: 'Rupees', columns: r.flow.map((x) => x.fy),
    rows: [
      head('Long-term sources'), w.line('Net profit', (x) => x.netProfit), w.line('Depreciation', (x) => x.depreciation),
      ...opt('capitalIn', 'Capital brought in'), ...opt('termUp', 'Term loans raised'), ...opt('promoterUp', 'Promoters’ loans raised'),
      ...opt('assetsSold', 'Fixed assets sold'), ...opt('nonCurrentDown', 'Non-current assets reduced'),
      w.line('Total long-term sources', (x) => x.sources, 'total'),
      head('Long-term uses'), ...opt('termDown', 'Term loans repaid'), ...opt('capex', 'Fixed assets bought'), ...opt('nonCurrentUp', 'Non-current assets added'),
      w.line('Drawings or dividend', (x) => x.drawings), ...opt('capitalOut', 'Capital taken out'), ...opt('promoterDown', 'Promoters’ loans repaid'),
      w.line('Total long-term uses', (x) => x.uses, 'total'),
      w.line('Long-term surplus (+) or deficit (−)', (x) => x.longTerm, 'total'),
      w.line('Increase in current assets', (x) => x.caUp), w.line('Increase in current liabilities other than bank borrowing', (x) => x.clUp),
      w.line('Increase in the working-capital gap', (x) => x.gapUp, 'total'),
      w.line('Net surplus (+) or deficit (−)', (x) => x.net, 'total'), w.line('Increase in bank borrowing', (x) => x.bankUp),
    ],
  };
  const ratiosT: ViewTable = {
    id: 'ratios', title: 'Ratios', first: 'Ratio', columns: years,
    rows: [
      ratios('Current ratio', (y) => y.currentRatio), line('Net working capital (₹)', (y) => y.nwc),
      ratios('Outside liabilities to net worth', (y) => y.tolTnw), ratios('Term liabilities to net worth', (y) => y.debtEquity),
      ratios('Interest cover: profit before interest, depreciation and tax ÷ interest', (y) => y.interestCover),
      ratios('Net profit to net sales', (y) => y.netMarginPct, pct), ratios('Growth in sales', (y) => y.growthPct, pct),
    ],
  };
  const last = ys.at(-1) as CmaYear;
  return {
    tables: [formI, formII, formIII, formIV, formV, formVI, ratiosT], years,
    key: [
      { label: `Limit by the turnover method, ${last.fy}`, value: `₹${inr(r.limit)}`, note: `${TURNOVER.needPct}% of the turnover less the larger of the ${TURNOVER.marginPct}% margin and the net working capital` },
      { label: 'Limit you have today', value: `₹${inr(r.existingLimit)}` },
      { label: `Current ratio, ${last.fy}`, value: ratio(last.currentRatio) },
    ],
    flags: r.flags.map((x) => x.text),
  };
}

export interface CmaPreview { needs: string[]; blocked?: string; view?: CmaView }

export function preview(s: CmaState): CmaPreview {
  const r = cma(inputOf(s));
  if ('blocked' in r) return { needs: [], blocked: r.blocked };
  if ('needs' in r) return { needs: r.needs };
  return { needs: [], view: viewOf(r, s.quasi) };
}

export const statusText = (p: CmaPreview, more = 0) =>
  p.blocked ? 'No figures' : p.needs.length + more ? questionsLeft(p.needs.length + more) : ALL_ANSWERED;
