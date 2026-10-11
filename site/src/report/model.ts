/**
 * The project report page's logic, apart from the page (as dscr/model.ts): typed text to the engine's input, and its
 * report to tables in words, with the engine's exact figures beside them for the Excel copy. The page and the document
 * show the same tables. Pure, no DOM. Figures: engine/report.ts only (with dscr.ts for profit, tax and DSCR).
 */
import { ASSUMPTIONS, HEADS, PMEGP, projectReport, type Activity, type Area, type Category, type HeadId, type Report, type ReportInput, type ReportYear } from '../../../engine/report';
import { parseAmount, parseMonth } from '../../../engine/parse';
import { LEVELS, collateralNeeded, diagnose, type RatioCheck, type RatioId, type Shortfall } from '../../../engine/ratios';
import { makeViable, type Longer, type Outcome } from '../../../engine/viable';
import { BORROWERS } from '../../../engine/tax';
import { inr } from '../../../engine/util';

export type Repayment = 'emi' | 'monthly' | 'quarterly';
export interface ReportFacts { name: string; activity: string; address: string; lender: string; preparedBy: string }
export interface ReportState {
  borrower?: string;
  cost: Record<HeadId, string>;
  loan: { amount: string; ratePct: string; disbursed: string; moratoriumMonths: string; instalments: string; repayment?: Repayment };
  subsidy: string; unsecured: string;
  /** The collateral's market value, under More options (D-UX-52). */
  collateral: string;
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
  subsidy: '', unsecured: '', collateral: '', salesBy: 'drivers', capacity: '', price: '', monthsToStart: '', scheme: '',
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
    subsidy: s.scheme ? undefined : opt(s.subsidy), unsecured: opt(s.unsecured), collateral: opt(s.collateral),
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
      ...(r.collateral ? [ratios(ys, 'Security cover, with the collateral at its realisable value', (y) => y.securityCover)] : []),
    ],
  };
  const c = r.collateral, collateral: ViewTable | undefined = c && {
    id: 'collateral', title: 'Collateral', first: 'Value', columns: ['Rupees'],
    rows: [
      { label: 'Market value', values: [rupees(c.market)], n: [c.market] },
      { label: `Realisable sale value, ${LEVELS.collateral.rsvPct}% of it: counted in the security cover`, values: [rupees(c.rsv)], n: [c.rsv] },
      { label: `Distress sale value, ${LEVELS.collateral.dsvPct}% of it`, values: [rupees(c.dsv)], n: [c.dsv] },
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
    years, tables: [cost, finance, ...(collateral ? [collateral] : []), pl, bs, cf, dscr, bep, keyRatios, wc, schedule],
    key: [
      { label: 'Cost of the project', value: `Rs. ${rupees(r.projectCost)}` },
      ...(sc ? [{ label: 'PMEGP margin money', value: `Rs. ${rupees(sc.subsidy)}`, note: `${sc.ratePct}% of Rs. ${rupees(sc.base)}, set off after ${PMEGP.lockInYears} years` }] : []),
      ...(r.average !== undefined ? [{ label: 'Average DSCR', value: ratio(r.average), note: 'total A ÷ total B' }] : []),
      ...(r.lowest ? [{ label: 'Lowest DSCR', value: ratio(r.lowest.dscr), note: `in ${r.lowest.fy}` }] : []),
    ],
  };
}

/** A ratio against its level (D-UX-51), in words: the level, its worst year, and whether it meets. */
export interface CheckRow {
  id: RatioId; label: string; level: string; worst: string; verdict: 'meets' | 'misses' | 'wait';
  /** The bar (MV2b): the ratio's length on a track from 0 to twice its level, so the level sits at the middle; 0 to 100. */
  bar: number; at: 'least' | 'most';
  /** When it misses: the rupees its worst year needs, in words (engine/ratios.ts). */
  short?: string;
}
/** `short`: cash below nil, which keeps the report provisional; `flags`: the scheme's rules to look at, never a decision;
 * `checks`: each lender's ratio against its level, `misses` their summary when any misses, with "Make it viable" beside it
 * (D-UX-50, D-UX-52); `collateralNote`: what the security cover needs; `longTerm`: a term past the longest. */
export interface ReportPreview {
  needs: string[]; blocked?: string; view?: ReportView; short?: string; flags: string[];
  checks?: CheckRow[]; misses?: string; collateralNote?: string; longTerm?: string;
}

const levelText = (c: RatioCheck) => `${c.level.toFixed(2)} or ${c.at === 'least' ? 'more' : 'less'}`;
/** A ratio to two places, or four when two would read as meeting a level it misses (1.0996 against 1.10). */
const ratioAt = (x: number, c: RatioCheck) => {
  const two = Number(x.toFixed(2)), reads = c.at === 'least' ? two >= c.level : two <= c.level;
  return reads === !!c.meets ? x.toFixed(2) : x.toFixed(4);
};
/** A label inside a sentence: lower case, but DSCR stays DSCR. */
export const inSentence = (label: string) => (/^[A-Z][A-Z]/.test(label) ? label : label[0].toLowerCase() + label.slice(1));
const listed = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
/** What a ratio's shortfall is more of, in plain words (engine/ratios.ts's `short.of`). */
const SHORT_OF: Record<Shortfall, string> = {
  cash: 'cash to pay the loan', profit: 'profit before interest and tax', currentAssets: 'current assets (stock, debtors and cash)',
  netWorth: 'net worth (the promoters’ money and the profit kept)', fixedAssets: 'net fixed assets', security: 'security',
};
const shortText = (k: RatioCheck) => k.short && k.short.amount > 0
  ? `Short by Rs. ${upRupees(k.short.amount)} of ${SHORT_OF[k.short.of]}${k.fy ? ` in ${k.fy}` : ', in total over the loan'}.` : undefined;
/** Where the bar ends: 0 at nil or below, the level at the middle, full past twice the level (or net worth at or below nil). */
const barOf = (k: RatioCheck) => (k.why ? 100 : k.worst === undefined ? 0 : Math.max(0, Math.min(100, (k.worst / (2 * k.level)) * 100)));
const labelOf = (id: RatioId) => inSentence(LEVELS.ratios.find((r) => r.id === id)?.label ?? id);

export function preview(s: ReportState): ReportPreview {
  const x = inputOf(s), r = projectReport(x);
  if ('blocked' in r) return { needs: [], blocked: r.blocked, flags: [] };
  if ('needs' in r) return { needs: r.needs, flags: [] };
  const c = r.cashShort, d = diagnose(r, x);
  const checks: CheckRow[] = d.checks.map((k) => ({
    id: k.id, label: k.label, level: levelText(k),
    worst: k.why ? `Net worth at or below nil in ${k.fy}` : k.worst === undefined ? (k.id === 'securityCover' ? 'Type the collateral’s value' : '—') : `${ratioAt(k.worst, k)}${k.fy ? ` in ${k.fy}` : ' over the loan'}`,
    verdict: k.meets === undefined ? 'wait' : k.meets ? 'meets' : 'misses', bar: barOf(k), at: k.at,
    ...(shortText(k) ? { short: shortText(k) } : {}),
  }));
  const sc = d.checks.find((k) => k.id === 'securityCover') as RatioCheck, need = sc.meets ? undefined : collateralNeeded(r, x);
  const collateralNote = need === undefined ? undefined : need === 0
    ? `Security cover: the project’s own assets reach ${sc.level.toFixed(2)} without collateral.`
    : `Security cover: collateral with a market value of Rs. ${rupees(need)} or more brings it to ${sc.level.toFixed(2)}.`;
  return {
    needs: [], view: viewOf(r), flags: r.scheme?.flags ?? [], checks,
    ...(d.misses.length ? { misses: `It misses ${d.misses.length === 1 ? 'one' : d.misses.length} of a lender’s levels: ${listed(d.misses.map(labelOf))}.` } : {}),
    ...(collateralNote ? { collateralNote } : {}),
    ...(d.term.months > d.term.longest ? { longTerm: `The term loan runs ${d.term.months} months with its moratorium, beyond the ${d.term.longest} months an MSME term loan commonly runs at most.` } : {}),
    ...(c ? { short: `Cash goes below nil in ${c.fy}: Rs. ${rupees(c.need)} short at its lowest. The promoters would need that much more, or the costs or loans be changed, to keep it at nil or above.` } : {}),
  };
}

/** The collateral field's hint: what its values are (engine/data/ratios.json, the owner's figures). */
export const COLLATERAL_HINT = `Its realisable sale value, ${LEVELS.collateral.rsvPct}% of it, counts in the security cover; its distress sale value, ${LEVELS.collateral.dsvPct}%, is shown.`;

export const statusText = (p: ReportPreview, more = 0) => {
  const n = p.needs.length + (p.short ? 1 : 0) + more;
  return p.blocked ? 'No figures' : n ? `Provisional: ${n} still needed` : 'Complete';
};

/** A figure the business must reach, shown rounded up so it never reads below what meets: rupees, or a percentage to 0.1. */
const upRupees = (x: number) => rupees(Math.ceil(x - 1e-6));
const upPct = (x: number) => (Math.ceil(x * 10 - 1e-6) / 10).toFixed(1);
const years = (n: number, perYear: number) => {
  const y = Math.floor(n / perYear), m = ((n % perYear) * 12) / perYear;
  return [y ? `${y} year${y > 1 ? 's' : ''}` : '', m ? `${m} month${m > 1 ? 's' : ''}` : ''].filter(Boolean).join(' ');
};

/** "Make it viable" (D-UX-50, D-UX-52) as a board (MV2b): the engine's changes (engine/viable.ts), each alone, the rest as
 * typed, the borrower's first, then the lender's. Each card: the lever, how far it moves (and a bar of now against needed),
 * the ratios it brings to their level and those it leaves short, and whether it is within reach. */
export interface ViableLine {
  id: string; by: 'borrower' | 'lender'; head: string; text: string; note?: string;
  /** How far it moves, in one figure ("+17.3%", "Rs. 15,64,221 less", "+6 months"); none when no answer. */
  move?: string;
  /** Now and needed, for two bars side by side; the longer is the full width. */
  bars?: { now: number; to: number; nowText: string; toText: string };
  fixes: string[]; still: string[];
  /** Sales beyond full capacity are out of reach; beyond the most a plan takes, a warning. */
  reach?: { out: boolean; text: string };
}
export interface ViableView { meets: boolean; title: string; lines: ViableLine[]; foot: string }
/** Cash below nil that a change leaves. */
const cashLeft = (o: Outcome) => (o.cashNeed ? `Cash still goes below nil: the promoters would need Rs. ${upRupees(o.cashNeed)} more.` : undefined);
const chips = (o: Outcome) => ({ fixes: o.fixes.map(labelOf), still: o.still.map(labelOf) });

export function viableOf(s: ReportState): ViableView | undefined {
  const v = makeViable(inputOf(s));
  if ('needs' in v || 'blocked' in v) return undefined;
  const lines: ViableLine[] = [], sl = v.sales, push = (l: Omit<ViableLine, 'by'>, by: ViableLine['by'] = 'borrower') => lines.push({ ...l, by });
  const none = { fixes: [], still: [] }, rs = (x: number) => `Rs. ${rupees(x)}`;
  const smaller = (id: string, head: string, l: NonNullable<typeof v.loan>, text: string) =>
    push({ id, head, text, move: `${rs(l.now - l.largest)} less`, bars: { now: l.now, to: l.largest, nowText: rs(l.now), toText: rs(l.largest) }, note: cashLeft(l), ...chips(l) });
  if (sl && v.meets) {
    push({ id: 'sales', head: 'Sales can fall', ...none, ...(sl.tenths < 0 ? {
      move: `${(-sl.tenths / 10).toFixed(1)}%`, bars: { now: sl.now, to: sl.needed, nowText: rs(sl.now), toText: `Rs. ${upRupees(sl.needed)}` },
      text: `Sales can fall ${(-sl.tenths / 10).toFixed(1)}%, to Rs. ${upRupees(sl.needed)} in ${sl.fy} (from Rs. ${rupees(sl.now)}), and every ratio still meets its level.`,
    } : { text: 'Sales cannot fall at all before a ratio misses its level.' }) });
  } else if (sl) {
    const u = sl.use, distinct = u ? u.needed.filter((x, k) => k === 0 || Math.abs(x - u.needed[k - 1]) > 1e-9) : [], top = u ? Math.max(...u.needed) : 0;
    push({ id: 'sales', head: 'Higher sales', move: `+${(sl.tenths / 10).toFixed(1)}%`, ...chips(sl),
      bars: { now: sl.now, to: sl.needed, nowText: rs(sl.now), toText: `Rs. ${upRupees(sl.needed)}` },
      text: `Sales ${(sl.tenths / 10).toFixed(1)}% higher in every year: Rs. ${upRupees(sl.needed)} in ${sl.fy} instead of Rs. ${rupees(sl.now)}.`,
      ...(u?.overFull ? { reach: { out: true, text: `Out of reach at this capacity: it needs ${upPct(top)}% of it. Only a higher price or a larger capacity can carry it.` } }
        : u?.overMost ? { reach: { out: false, text: `Above the ${LEVELS.capacity.mostUsePct}% use of the capacity a plan takes at most: give the reason it can.` } } : {}),
      note: [
        sl.price && u ? `That is a price of Rs. ${(Math.ceil(sl.price.needed * 100 - 1e-6) / 100).toFixed(2)} a unit (now Rs. ${sl.price.now}) at the same use, or the use of the capacity at ${distinct.map((x) => `${upPct(x)}%`).join(', then ')} at the same price.` : '',
        cashLeft(sl) ?? '',
      ].filter(Boolean).join(' ') || undefined });
  } else if (v.salesNone) push({ id: 'sales', head: 'Higher sales', text: v.salesNone, ...none });
  if (v.loan) smaller('loan', 'A smaller term loan', v.loan, `A term loan of at most Rs. ${rupees(v.loan.largest)} (now Rs. ${rupees(v.loan.now)}), the promoters bringing Rs. ${upRupees(v.loan.more)} more.`);
  else if (v.loanNone) push({ id: 'loan', head: 'A smaller term loan', text: v.loanNone, ...none });
  if (v.wc) smaller('wc', 'A smaller working-capital limit', v.wc, `A working-capital limit of at most Rs. ${rupees(v.wc.largest)} (now Rs. ${rupees(v.wc.now)}), ${v.wc.more >= 0.5 ? `the promoters bringing Rs. ${upRupees(v.wc.more)} more as margin` : 'with no more margin from the promoters'}.`);
  else if (v.wcNone) push({ id: 'wc', head: 'A smaller working-capital limit', text: v.wcNone, ...none });
  if (v.collateral && v.collateral.now !== undefined && v.collateral.needed > v.collateral.now) {
    const c = v.collateral as { now: number; needed: number };
    push({ id: 'collateral', head: 'More collateral', move: `+${rs(c.needed - c.now)}`, bars: { now: c.now, to: c.needed, nowText: rs(c.now), toText: rs(c.needed) },
      text: `Collateral with a market value of Rs. ${rupees(c.needed)} (now Rs. ${rupees(c.now)}), for the security cover.`,
      fixes: [labelOf('securityCover')], still: v.diagnosis.misses.filter((id) => id !== 'securityCover').map(labelOf) });
  }
  const longest = LEVELS.term.longestMonths;
  const longer = (id: string, head: string, l: Longer, unit: string, text: string) =>
    push({ id, head, text, move: `+${l.needed - l.now} ${unit}${l.needed - l.now > 1 ? 's' : ''}`, bars: { now: l.now, to: l.needed, nowText: String(l.now), toText: String(l.needed) }, note: cashLeft(l), ...chips(l) }, 'lender');
  if (v.moratorium) longer('moratorium', 'A longer moratorium', v.moratorium, 'month', `A moratorium of ${v.moratorium.needed} months (now ${v.moratorium.now}), the whole term within ${longest} months.`);
  else if (v.moratoriumNone) push({ id: 'moratorium', head: 'A longer moratorium', text: v.moratoriumNone, ...none }, 'lender');
  if (v.instalments) {
    const i = v.instalments, every = i.perYear === 4 ? 'quarterly' : 'monthly';
    longer('repayment', 'A longer repayment', i, 'instalment', `${i.needed} ${every} instalments, ${years(i.needed, i.perYear)} (now ${i.now}), the whole term within ${longest} months.`);
  } else if (v.instalmentsNone) push({ id: 'repayment', head: 'A longer repayment', text: v.instalmentsNone, ...none }, 'lender');
  return {
    meets: v.meets, title: v.meets ? 'Every ratio meets a lender’s level: the room' : 'The levers: any one of these alone', lines,
    foot: `The levels: a fresh or enhanced loan’s benchmarks, said to follow RBI and not yet checked against an RBI publication; each lender sets its own. Each change is worked alone by the engine, the rest as typed. Change the figures above only to what the business can really reach: a lender tests sales against the market and the capacity.`,
  };
}
