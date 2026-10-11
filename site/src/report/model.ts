/**
 * The project report page's logic, apart from the page (as dscr/model.ts): typed text to the engine's input, and its
 * report to tables in words, with the engine's exact figures beside them for the Excel copy. The page and the document
 * show the same tables. Pure, no DOM. Figures: engine/report.ts only (with dscr.ts for profit, tax and DSCR).
 */
import { ASSUMPTIONS, HEADS, PMEGP, projectReport, type Activity, type Area, type Category, type HeadId, type Report, type ReportInput, type ReportYear } from '../../../engine/report';
import { parseAmount, parseMonth } from '../../../engine/parse';
import { limitText, shortfall } from '../../../engine/dscr';
import { TARGET, makeViable } from '../../../engine/viable';
import { BORROWERS } from '../../../engine/tax';
import { inr } from '../../../engine/util';

export type Repayment = 'emi' | 'monthly' | 'quarterly';
export interface ReportFacts { name: string; activity: string; address: string; lender: string; preparedBy: string }
export interface ReportState {
  borrower?: string;
  cost: Record<HeadId, string>;
  loan: { amount: string; ratePct: string; disbursed: string; moratoriumMonths: string; instalments: string; repayment?: Repayment };
  subsidy: string; unsecured: string;
  /** Sales from the capacity, its use and the price (the default), or typed under More options. */
  salesBy: 'drivers' | 'typed'; capacity: string; price: string; utilisation: string; priceGrowth: string; monthsToStart: string;
  scheme: '' | 'pmegp'; category?: Category; area?: Area; activity?: Activity;
  sales: string; salesGrowth: string; variablePct: string; fixed: string; fixedGrowth: string;
  days: { stock: string; debtors: string; creditors: string };
  wcLimit: string; wcRate: string;
  doc: ReportFacts;
}

const DAYS = (ASSUMPTIONS.find((a) => a.id === 'days')?.value ?? {}) as Record<string, number>;
const assumed = (id: string) => ASSUMPTIONS.find((a) => a.id === id)?.value;
export const EMPTY: ReportState = {
  cost: Object.fromEntries(HEADS.map((h) => [h.id, ''])) as Record<HeadId, string>,
  loan: { amount: '', ratePct: '', disbursed: '', moratoriumMonths: '', instalments: '' },
  subsidy: '', unsecured: '', salesBy: 'drivers', capacity: '', price: '', monthsToStart: '', scheme: '',
  utilisation: ((assumed('utilisation') ?? []) as number[]).join(', '), priceGrowth: String(assumed('price') ?? ''), sales: '', salesGrowth: '', variablePct: '', fixed: '', fixedGrowth: '',
  // Assumed until changed (engine/data/report.json), listed on the page.
  days: { stock: String(DAYS.stock ?? ''), debtors: String(DAYS.debtors ?? ''), creditors: String(DAYS.creditors ?? '') },
  wcLimit: '', wcRate: '', doc: { name: '', activity: '', address: '', lender: '', preparedBy: '' },
};
export const BORROWER_CHOICES = BORROWERS.map((b) => ({ value: b.id, label: b.label }));
export const REPAYMENT_CHOICES: { value: Repayment; label: string }[] = [
  { value: 'emi', label: 'EMI every month' }, { value: 'monthly', label: 'Equal principal every month' }, { value: 'quarterly', label: 'Equal principal every quarter' },
];
export const SCHEME_CHOICES: { value: '' | 'pmegp'; label: string }[] = [{ value: '', label: 'None' }, { value: 'pmegp', label: 'PMEGP' }];
export const CATEGORY_CHOICES: { value: Category; label: string }[] = [
  { value: 'general', label: 'General' }, { value: 'special', label: 'Special: SC, ST, OBC, minority, woman, ex-serviceman, a person with a disability and others the scheme names' },
];
export const AREA_CHOICES: { value: Area; label: string }[] = [{ value: 'urban', label: 'A town or city' }, { value: 'rural', label: 'A village' }];
export const ACTIVITY_CHOICES: { value: Activity; label: string }[] = [{ value: 'manufacturing', label: 'Manufacturing' }, { value: 'service', label: 'A service' }];
/** The assumptions listed on the page: the use of the capacity and the price only while sales come from the drivers. */
export const assumptionsOf = (s: ReportState) => ASSUMPTIONS.filter((a) => s.salesBy === 'drivers' || (a.id !== 'utilisation' && a.id !== 'price'));
export { ASSUMPTIONS, HEADS, PMEGP };

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
    subsidy: s.scheme ? undefined : opt(s.subsidy), unsecured: opt(s.unsecured),
    salesBy: s.salesBy, monthsToStart: plainOf(s.monthsToStart),
    ...(s.salesBy === 'typed' ? { sales: amountOf(s.sales), salesGrowthPct: plainOf(s.salesGrowth) } : {
      capacity: plainOf(s.capacity), price: amountOf(s.price), priceGrowthPct: plainOf(s.priceGrowth),
      utilisationPct: s.utilisation.split(/[,\s]+/).filter(Boolean).map((t) => plainOf(t) ?? NaN),
    }),
    ...(s.scheme === 'pmegp' ? { scheme: { id: 'pmegp' as const, category: s.category, area: s.area, activity: s.activity } } : {}), variablePct: plainOf(s.variablePct), fixedCosts: amountOf(s.fixed), fixedGrowthPct: plainOf(s.fixedGrowth),
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
  const f = r.finance, sc = r.scheme, subsidyLabel = sc ? 'PMEGP margin money' : 'Capital subsidy';
  const finance: ViewTable = {
    id: 'finance', title: 'Means of finance', first: 'Source', columns: ['Rupees'],
    rows: [
      { label: `Promoters’ contribution (${f.promoterPct.toFixed(2)}%)`, values: [rupees(f.promoter)], n: [f.promoter] },
      ...(sc ? [{ label: `PMEGP margin money, ${sc.ratePct}% of Rs. ${rupees(sc.base)}: a deposit for ${PMEGP.lockInYears} years, then set off against the loan`, values: [rupees(f.subsidy)], n: [f.subsidy] }]
        : f.subsidy ? [{ label: 'Capital subsidy', values: [rupees(f.subsidy)], n: [f.subsidy] }] : []),
      ...(f.unsecured ? [{ label: 'Unsecured loans', values: [rupees(f.unsecured)], n: [f.unsecured] }] : []),
      { label: sc ? `Term loan: Rs. ${rupees(sc.sanctioned)} sanctioned, less the margin money` : 'Term loan', values: [rupees(f.termLoan)], n: [f.termLoan] },
      { label: 'Total means of finance', values: [rupees(f.total)], n: [f.total], kind: 'total' },
    ],
  };
  const pl: ViewTable = {
    id: 'pl', title: 'Projected profit and loss', first: 'Rupees', columns: years,
    rows: [
      ...(ys.some((y) => y.months < 12) ? [{ label: 'Months of sales', values: ys.map((y) => String(y.months)), n: ys.map((y) => y.months), fig: 'ratio' as const }] : []),
      ...(ys.some((y) => y.utilisationPct !== undefined) ? [ratios(ys, 'Use of the capacity', (y) => y.utilisationPct, (x) => (x === undefined ? '—' : `${x}%`))] : []),
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
      head('Liabilities'), line(ys, 'Capital', (y) => y.capital), ...(any((y) => y.subsidy) ? [line(ys, subsidyLabel, (y) => y.subsidy)] : []),
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
      head('Sources'), line(ys, 'Capital brought in', (y) => y.flow.capital), ...(any((y) => y.flow.subsidy) ? [line(ys, subsidyLabel, (y) => y.flow.subsidy)] : []),
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
      ...(sc ? [{ label: 'PMEGP margin money', value: `Rs. ${rupees(sc.subsidy)}`, note: `${sc.ratePct}% of Rs. ${rupees(sc.base)}, set off after ${PMEGP.lockInYears} years` }] : []),
      ...(r.average !== undefined ? [{ label: 'Average DSCR', value: ratio(r.average), note: 'total A ÷ total B' }] : []),
      ...(r.lowest ? [{ label: 'Lowest DSCR', value: ratio(r.lowest.dscr), note: `in ${r.lowest.fy}` }] : []),
    ],
  };
}

/** `short`: cash below nil, which keeps the report provisional; `flags`: the scheme's rules to look at, never a decision;
 * `misses`: why the DSCR misses the lenders' common benchmarks (D-UX-50), with "Make it viable" beside it. */
export interface ReportPreview { needs: string[]; blocked?: string; view?: ReportView; short?: string; flags: string[]; misses?: string }

export function preview(s: ReportState): ReportPreview {
  const r = projectReport(inputOf(s));
  if ('blocked' in r) return { needs: [], blocked: r.blocked, flags: [] };
  if ('needs' in r) return { needs: r.needs, flags: [] };
  const c = r.cashShort, miss = shortfall(r.plan.statement, TARGET);
  return {
    needs: [], view: viewOf(r), flags: r.scheme?.flags ?? [], ...(miss ? { misses: `The DSCR misses ${targetText}: ${limitText(miss)}.` } : {}),
    ...(c ? { short: `Cash goes below nil in ${c.fy}: Rs. ${rupees(c.need)} short at its lowest. The promoters would need that much more, or the costs or loans be changed, to keep it at nil or above.` } : {}),
  };
}

export const statusText = (p: ReportPreview, more = 0) => {
  const n = p.needs.length + (p.short ? 1 : 0) + more;
  return p.blocked ? 'No figures' : n ? `Provisional: ${n} still needed` : 'Complete';
};

const targetText = `the level lenders commonly ask (an average of ${ratio(TARGET.average)} and ${ratio(TARGET.minimum)} in the lowest year)`;
/** A figure the business must reach, shown rounded up so it never reads below what meets: rupees, or a percentage to 0.1. */
const upRupees = (x: number) => rupees(Math.ceil(x - 1e-6));
const upPct = (x: number) => (Math.ceil(x * 10 - 1e-6) / 10).toFixed(1);
const years = (n: number, perYear: number) => {
  const y = Math.floor(n / perYear), m = ((n % perYear) * 12) / perYear;
  return [y ? `${y} year${y > 1 ? 's' : ''}` : '', m ? `${m} month${m > 1 ? 's' : ''}` : ''].filter(Boolean).join(' ');
};

/** "Make it viable" (D-UX-50), in words: the engine's levers (engine/viable.ts), each alone, the rest as typed. */
export interface ViableView { meets: boolean; title: string; lines: { id: string; text: string; note?: string }[]; foot: string }
export function viableOf(s: ReportState): ViableView | undefined {
  const v = makeViable(inputOf(s));
  if ('needs' in v || 'blocked' in v) return undefined;
  const lines: ViableView['lines'] = [], sl = v.sales;
  if (sl && v.meets) {
    lines.push({ id: 'sales', text: sl.tenths < 0
      ? `Sales can fall ${(-sl.tenths / 10).toFixed(1)}%, to Rs. ${upRupees(sl.needed)} in ${sl.fy} (from Rs. ${rupees(sl.now)}), and the DSCR still meets it.`
      : `Sales cannot fall at all before the DSCR misses it.` });
  } else if (sl) {
    const u = sl.use, distinct = u ? u.needed.filter((x, k) => k === 0 || Math.abs(x - u.needed[k - 1]) > 1e-9) : [];
    lines.push({ id: 'sales', text: `Sales ${(sl.tenths / 10).toFixed(1)}% higher in every year: Rs. ${upRupees(sl.needed)} in ${sl.fy} instead of Rs. ${rupees(sl.now)}.`,
      note: [
        sl.price && u ? `That is a price of Rs. ${(Math.ceil(sl.price.needed * 100 - 1e-6) / 100).toFixed(2)} a unit (now Rs. ${sl.price.now}) at the same use, or the use of the capacity at ${distinct.map((x) => `${upPct(x)}%`).join(', then ')} at the same price${u.overFull ? ': above full capacity, so the price, or a larger capacity, must carry it' : ''}.` : '',
        sl.cashNeed ? `At those sales cash still goes below nil: the promoters would need Rs. ${upRupees(sl.cashNeed)} more.` : '',
      ].filter(Boolean).join(' ') || undefined });
  } else if (v.salesNone) lines.push({ id: 'sales', text: `Sales: ${v.salesNone}` });
  if (v.loan) lines.push({ id: 'loan', text: `Or a term loan of at most Rs. ${rupees(v.loan.largest)} (now Rs. ${rupees(v.loan.now)}), the promoters bringing Rs. ${upRupees(v.loan.more)} more.` });
  else if (v.loanNone) lines.push({ id: 'loan', text: `A smaller loan: ${v.loanNone}` });
  if (v.instalments) {
    const i = v.instalments, every = i.perYear === 4 ? 'quarterly' : 'monthly';
    lines.push({ id: 'repayment', text: `Or ${i.needed} ${every} instalments, ${years(i.needed, i.perYear)} (now ${i.now}), if the lender will lend that long.` });
  } else if (v.instalmentsNone) lines.push({ id: 'repayment', text: `A longer repayment: ${v.instalmentsNone}` });
  return {
    meets: v.meets, title: v.meets ? 'It meets the level lenders commonly ask' : 'Make it viable: any one of these', lines,
    foot: `The level: an average DSCR of ${ratio(TARGET.average)} and ${ratio(TARGET.minimum)} in the lowest year, commonly quoted but not checked against a published source; each lender sets its own. Each change is worked alone by the engine, the rest as typed. Change the figures above only to what the business can really reach: a lender tests sales against the market and the capacity.`,
  };
}
