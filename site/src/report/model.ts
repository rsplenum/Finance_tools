/**
 * The project report page's logic, apart from the page (as dscr/model.ts): typed text to the engine's input, and its
 * report to tables in words, with the engine's exact figures beside them for the Excel copy. The page and the document
 * show the same tables. Pure, no DOM. Figures: engine/report.ts only (with dscr.ts for profit, tax and DSCR).
 */
import { ASSUMPTIONS, HEADS, projectReport, type HeadId, type Report, type ReportInput, type ReportYear } from '../../../engine/report';
import { parseAmount, parseMonth } from '../../../engine/parse';
import { BORROWERS } from '../../../engine/tax';
import { inr } from '../../../engine/util';

export type Repayment = 'emi' | 'monthly' | 'quarterly';
export interface ReportFacts { name: string; activity: string; address: string; lender: string; preparedBy: string }
export interface ReportState {
  borrower?: string;
  cost: Record<HeadId, string>;
  loan: { amount: string; ratePct: string; disbursed: string; moratoriumMonths: string; instalments: string; repayment?: Repayment };
  subsidy: string; unsecured: string;
  sales: string; salesGrowth: string; variablePct: string; fixed: string; fixedGrowth: string;
  days: { stock: string; debtors: string; creditors: string };
  wcLimit: string; wcRate: string;
  doc: ReportFacts;
}

const DAYS = (ASSUMPTIONS.find((a) => a.id === 'days')?.value ?? {}) as Record<string, number>;
export const EMPTY: ReportState = {
  cost: Object.fromEntries(HEADS.map((h) => [h.id, ''])) as Record<HeadId, string>,
  loan: { amount: '', ratePct: '', disbursed: '', moratoriumMonths: '', instalments: '' },
  subsidy: '', unsecured: '', sales: '', salesGrowth: '', variablePct: '', fixed: '', fixedGrowth: '',
  // Assumed until changed (engine/data/report.json), listed on the page.
  days: { stock: String(DAYS.stock ?? ''), debtors: String(DAYS.debtors ?? ''), creditors: String(DAYS.creditors ?? '') },
  wcLimit: '', wcRate: '', doc: { name: '', activity: '', address: '', lender: '', preparedBy: '' },
};
export const BORROWER_CHOICES = BORROWERS.map((b) => ({ value: b.id, label: b.label }));
export const REPAYMENT_CHOICES: { value: Repayment; label: string }[] = [
  { value: 'emi', label: 'EMI every month' }, { value: 'monthly', label: 'Equal principal every month' }, { value: 'quarterly', label: 'Equal principal every quarter' },
];
export { ASSUMPTIONS, HEADS };

export const amountOf = (t: string) => (t.trim() ? parseAmount(t) : undefined);
export const plainOf = (t: string) => (t.trim() ? parseAmount(t.replace(/%\s*$/, ''), false) : undefined);
export const tidyAmount = (t: string) => { const n = amountOf(t); return n === undefined ? t : inr(n, Number.isInteger(n) ? 0 : 2); };

export function inputOf(s: ReportState): ReportInput {
  const opt = (t: string) => (t.trim() ? amountOf(t) ?? NaN : undefined);
  const r = s.loan.repayment;
  return {
    taxBy: s.borrower,
    cost: Object.fromEntries(HEADS.map((h) => [h.id, opt(s.cost[h.id])]).filter(([, v]) => v !== undefined)),
    loan: {
      amount: amountOf(s.loan.amount), ratePct: plainOf(s.loan.ratePct), disbursed: parseMonth(s.loan.disbursed), moratoriumMonths: plainOf(s.loan.moratoriumMonths),
      instalments: plainOf(s.loan.instalments), ...(r ? { frequency: r === 'quarterly' ? 'quarterly' : 'monthly', style: r === 'emi' ? 'emi' : 'equal-principal' } : {}),
    },
    subsidy: opt(s.subsidy), unsecured: opt(s.unsecured),
    sales: amountOf(s.sales), salesGrowthPct: plainOf(s.salesGrowth), variablePct: plainOf(s.variablePct), fixedCosts: amountOf(s.fixed), fixedGrowthPct: plainOf(s.fixedGrowth),
    days: { stock: plainOf(s.days.stock), debtors: plainOf(s.days.debtors), creditors: plainOf(s.days.creditors) },
    wcLimit: amountOf(s.wcLimit), wcRatePct: plainOf(s.wcRate),
  };
}

// ---- The report as tables, for the page and the document alike ----

export type RowKind = 'head' | 'total' | 'ratio';
/** A row: its words for each column, and the engine's exact figures (`fig`: rupees, or a ratio or percentage). */
export interface ViewRow { label: string; values: string[]; n?: (number | undefined)[]; kind?: RowKind; fig?: 'ratio' }
/** A table: `first` heads the column naming each row; `columns` head the others (the years, or "Rupees"). */
export interface ViewTable { id: string; title: string; first: string; columns: string[]; rows: ViewRow[] }

const rupees = (x: number) => inr(x);
const ratio = (x?: number) => (x === undefined || !Number.isFinite(x) ? '—' : x.toFixed(2));
const pct = (x?: number) => (x === undefined || !Number.isFinite(x) ? '—' : `${x.toFixed(2)}%`);

/** A row of amounts, one for each year, from a field of the report's years. */
const line = (ys: ReportYear[], label: string, f: (y: ReportYear) => number, kind?: RowKind): ViewRow =>
  ({ label, values: ys.map((y) => rupees(f(y))), n: ys.map(f), ...(kind ? { kind } : {}) });
const head = (label: string): ViewRow => ({ label, values: [], kind: 'head' });
const ratios = (ys: ReportYear[], label: string, f: (y: ReportYear) => number | undefined, show = ratio): ViewRow =>
  ({ label, values: ys.map((y) => show(f(y))), n: ys.map(f), fig: 'ratio' });

export interface ReportView { tables: ViewTable[]; key: { label: string; value: string; note?: string }[]; years: string[] }

export function viewOf(r: Report): ReportView {
  const ys = r.years, years = ys.map((y) => y.fy), any = (f: (y: ReportYear) => number) => ys.some((y) => Math.abs(f(y)) > 0.005);
  const t = r.plan.statement.total, pt = r.plan.profitTotal, total = (x?: number) => (t && x !== undefined ? rupees(x) : '');
  const cost: ViewTable = {
    id: 'cost', title: 'Cost of the project', first: 'Item', columns: ['Rupees'],
    rows: [...r.cost.map((c) => ({ label: c.label, values: [rupees(c.amount)], n: [c.amount] })),
      { label: 'Total cost of the project', values: [rupees(r.projectCost)], n: [r.projectCost], kind: 'total' }],
  };
  const f = r.finance;
  const finance: ViewTable = {
    id: 'finance', title: 'Means of finance', first: 'Source', columns: ['Rupees'],
    rows: [
      { label: `Promoters’ contribution (${f.promoterPct.toFixed(2)}%)`, values: [rupees(f.promoter)], n: [f.promoter] },
      ...(f.subsidy ? [{ label: 'Capital subsidy', values: [rupees(f.subsidy)], n: [f.subsidy] }] : []),
      ...(f.unsecured ? [{ label: 'Unsecured loans', values: [rupees(f.unsecured)], n: [f.unsecured] }] : []),
      { label: 'Term loan', values: [rupees(f.termLoan)], n: [f.termLoan] },
      { label: 'Total means of finance', values: [rupees(f.total)], n: [f.total], kind: 'total' },
    ],
  };
  const pl: ViewTable = {
    id: 'pl', title: 'Projected profit and loss', first: 'Rupees', columns: years,
    rows: [
      line(ys, 'Sales', (y) => y.sales), line(ys, 'Less: materials and other variable costs', (y) => y.variable), line(ys, 'Less: fixed costs', (y) => y.fixed),
      line(ys, 'Profit before interest, depreciation and tax', (y) => y.pbdit, 'total'),
      line(ys, 'Less: depreciation', (y) => y.depreciation), line(ys, 'Less: preliminary expenses written off', (y) => y.preliminary),
      line(ys, 'Less: interest on the term loan', (y) => y.tlInterest), line(ys, 'Less: interest on working capital', (y) => y.wcInterest),
      line(ys, 'Profit before tax', (y) => y.pbt, 'total'), line(ys, 'Less: tax', (y) => y.tax), line(ys, 'Profit after tax', (y) => y.pat, 'total'),
    ],
  };
  const bs: ViewTable = {
    id: 'bs', title: 'Projected balance sheet, at each year end', first: 'Rupees', columns: years,
    rows: [
      head('Liabilities'), line(ys, 'Capital', (y) => y.capital), ...(any((y) => y.subsidy) ? [line(ys, 'Capital subsidy', (y) => y.subsidy)] : []),
      line(ys, 'Profit retained', (y) => y.retained), line(ys, 'Net worth', (y) => y.netWorth, 'total'),
      ...(any((y) => y.unsecured) ? [line(ys, 'Unsecured loans', (y) => y.unsecured)] : []), line(ys, 'Term loan', (y) => y.termLoan),
      line(ys, 'Working-capital loan', (y) => y.wcLoan), line(ys, 'Creditors', (y) => y.creditors), line(ys, 'Total liabilities', (y) => y.liabilities, 'total'),
      head('Assets'), line(ys, 'Fixed assets at cost', (y) => y.grossBlock), line(ys, 'Less: depreciation to date', (y) => y.accumulated),
      line(ys, 'Net fixed assets', (y) => y.netBlock, 'total'), ...(any((y) => y.preliminaryLeft) || any((y) => y.preliminary) ? [line(ys, 'Preliminary expenses not written off', (y) => y.preliminaryLeft)] : []),
      line(ys, 'Stock', (y) => y.stock), line(ys, 'Debtors', (y) => y.debtors), line(ys, 'Cash and bank', (y) => y.cash), line(ys, 'Total assets', (y) => y.assets, 'total'),
    ],
  };
  const cf: ViewTable = {
    id: 'cf', title: 'Projected cash flow', first: 'Rupees', columns: years,
    rows: [
      head('Sources'), line(ys, 'Capital brought in', (y) => y.flow.capital), ...(any((y) => y.flow.subsidy) ? [line(ys, 'Capital subsidy', (y) => y.flow.subsidy)] : []),
      ...(any((y) => y.flow.unsecured) ? [line(ys, 'Unsecured loans', (y) => y.flow.unsecured)] : []), line(ys, 'Term loan drawn', (y) => y.flow.termLoan),
      line(ys, 'Profit after tax', (y) => y.flow.pat), line(ys, 'Depreciation', (y) => y.flow.depreciation), line(ys, 'Preliminary expenses written off', (y) => y.flow.preliminary),
      line(ys, 'Working-capital loan', (y) => y.flow.wcLoan), line(ys, 'Increase in creditors', (y) => y.flow.creditors), line(ys, 'Total sources', (y) => y.flow.sources, 'total'),
      head('Uses'), line(ys, 'Fixed assets', (y) => y.flow.fixedAssets), line(ys, 'Preliminary expenses', (y) => y.flow.preliminarySpent),
      line(ys, 'Increase in stock', (y) => y.flow.stock), line(ys, 'Increase in debtors', (y) => y.flow.debtors), line(ys, 'Term loan repaid', (y) => y.flow.repaid),
      line(ys, 'Total uses', (y) => y.flow.uses, 'total'),
      line(ys, 'Net cash flow', (y) => y.flow.net), line(ys, 'Cash at the start of the year', (y) => y.flow.opening), line(ys, 'Cash at the end of the year', (y) => y.flow.closing, 'total'),
    ],
  };
  // The DSCR, with its Total column from the engine (the average is total A ÷ total B).
  const withTotal = (row: ViewRow, x?: number, text?: string): ViewRow => (t ? { ...row, values: [...row.values, text ?? total(x)], n: [...(row.n ?? []), x] } : row);
  const dscr: ViewTable = {
    id: 'dscr', title: 'Debt service coverage ratio (DSCR)', first: 'Rupees', columns: [...years, ...(t ? ['Total'] : [])],
    rows: [
      head('Cash available for debt service'),
      withTotal(line(ys, 'Profit after tax', (y) => y.pat), pt?.pat), withTotal(line(ys, 'Add: depreciation', (y) => y.depreciation), pt?.depreciation),
      withTotal(line(ys, 'Add: preliminary expenses written off', (y) => y.preliminary), pt?.nonCash), withTotal(line(ys, 'Add: interest on the term loan', (y) => y.tlInterest), pt?.interestTL),
      withTotal(line(ys, 'Cash available (A)', (y) => y.available, 'total'), t?.available),
      head('Debt service'),
      withTotal(line(ys, 'Principal', (y) => y.principal), t?.figures.principalTL), withTotal(line(ys, 'Interest on the term loan', (y) => y.tlInterest), t?.figures.interestTL),
      withTotal(line(ys, 'Debt service (B)', (y) => y.service, 'total'), t?.service),
      withTotal({ label: 'DSCR (A ÷ B)', values: ys.map((y) => ratio(y.dscr)), n: ys.map((y) => y.dscr), kind: 'ratio', fig: 'ratio' }, r.average, ratio(r.average)),
    ],
  };
  const bep: ViewTable = {
    id: 'bep', title: 'Break-even', first: 'Rupees', columns: years,
    rows: [
      line(ys, 'Sales', (y) => y.sales), line(ys, 'Contribution (sales less variable costs)', (y) => y.contribution),
      line(ys, 'Fixed costs, with depreciation, write-off and interest', (y) => y.fixedAll),
      { label: 'Break-even sales', values: ys.map((y) => (y.bepSales === undefined ? '—' : rupees(y.bepSales))), n: ys.map((y) => y.bepSales), kind: 'total' },
      ratios(ys, 'Break-even, as a share of sales', (y) => y.bepPct, pct), ratios(ys, 'Cash break-even, as a share of sales', (y) => y.cashBepPct, pct),
    ],
  };
  const keyRatios: ViewTable = {
    id: 'ratios', title: 'Key ratios', first: 'Ratio', columns: years,
    rows: [
      ratios(ys, 'Current ratio', (y) => y.currentRatio), ratios(ys, 'Term loan ÷ net worth', (y) => y.debtEquity),
      ratios(ys, 'Total outside liabilities ÷ net worth', (y) => y.tolTnw), ratios(ys, 'Interest cover', (y) => y.interestCover),
      ratios(ys, 'Net profit margin', (y) => y.netMarginPct, pct), ratios(ys, 'Net fixed assets ÷ term loan', (y) => y.facr), ratios(ys, 'DSCR', (y) => y.dscr),
    ],
  };
  const wc: ViewTable = {
    id: 'wc', title: 'Working capital', first: 'Rupees', columns: years,
    rows: [
      line(ys, 'Stock', (y) => y.stock), line(ys, 'Debtors', (y) => y.debtors), line(ys, 'Current assets', (y) => y.currentAssets, 'total'),
      line(ys, 'Less: creditors', (y) => y.creditors), line(ys, 'Working-capital gap', (y) => y.gap, 'total'),
      line(ys, 'Bank finance, second method (75% of current assets less creditors)', (y) => y.mpbf),
      line(ys, 'By turnover: working capital, 25% of sales', (y) => y.turnoverNeed), line(ys, 'By turnover: bank finance, 20% of sales', (y) => y.turnoverBank),
      line(ys, 'Limit sought', () => r.wcLimit, 'total'),
    ],
  };
  const schedule: ViewTable = {
    id: 'schedule', title: 'Repayment of the term loan', first: 'Year', columns: ['Interest', 'Principal', 'Balance at year end'],
    rows: r.plan.schedule.map((d) => ({ label: d.fy, values: [rupees(d.interest), rupees(d.principal), rupees(d.closing)], n: [d.interest, d.principal, d.closing] })),
  };
  return {
    years, tables: [cost, finance, pl, bs, cf, dscr, bep, keyRatios, wc, schedule],
    key: [
      { label: 'Cost of the project', value: `Rs. ${rupees(r.projectCost)}` },
      ...(r.average !== undefined ? [{ label: 'Average DSCR', value: ratio(r.average), note: 'total A ÷ total B' }] : []),
      ...(r.lowest ? [{ label: 'Lowest DSCR', value: ratio(r.lowest.dscr), note: `in ${r.lowest.fy}` }] : []),
    ],
  };
}

export interface ReportPreview { needs: string[]; blocked?: string; view?: ReportView }

export function preview(s: ReportState): ReportPreview {
  const r = projectReport(inputOf(s));
  if ('blocked' in r) return { needs: [], blocked: r.blocked };
  if ('needs' in r) return { needs: r.needs };
  return { needs: [], view: viewOf(r) };
}

export const statusText = (p: ReportPreview, more = 0) =>
  p.blocked ? 'No figures' : p.needs.length + more ? `Provisional: ${p.needs.length + more} still needed` : 'Complete';
