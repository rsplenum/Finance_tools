/**
 * CMA data for a working-capital limit (C1, D-UX-46): the borrower's own figures for three audited years, this year's
 * estimate and next year's projection, typed; from them Forms I to VI (the limits, the operating statement, the balance
 * sheet analysed, current assets and liabilities with their days, the limit by the turnover method, and the funds flow),
 * the usual ratios, and flags where the projection runs ahead of the borrower's own past. Pure, no DOM. Every figure is
 * worked out again by cma-check.ts, by other routes; nothing is returned unless both agree. A balance sheet that does
 * not balance is never made to: it is listed as still needed.
 */
import DATA from './data/cma.json';
import LEVELS from './data/ratios.json';
import { cmaCheck, subtotalsCheck } from './cma-check';
import type { Blocked, Needs } from './dscr';
import { inr } from './util';

export const HEADS = DATA.heads;
export const YEARS = DATA.years;
export const ASSUMPTIONS = DATA.assumptions;
export const TURNOVER = DATA.turnover;
export type HeadId = (typeof DATA.heads)[number]['id'];
export type YearId = (typeof DATA.years)[number]['id'];
export type YearKind = 'audited' | 'estimate' | 'projection';
export type Figures = Record<HeadId, number>;

export interface CmaInput {
  /** The year now running, the estimate's, starts in April of this year: 2026 for 2026-27. */
  startYear: number;
  /** The figures typed, in rupees, by year and head. An audited year left wholly empty is one the business did not have. */
  figures: Partial<Record<YearId, Partial<Record<HeadId, number>>>>;
  /** The working-capital limit the borrower has now, from all banks (0 if none). */
  existingLimit?: number;
  /** Promoters' loans that stay in the business till the bank is repaid count as the owners' funds. */
  quasiEquity?: boolean;
  /** The collateral offered, at market value (D-UX-52): its realisable sale value counts in the security cover. */
  collateral?: number;
}

export interface CmaYear {
  id: YearId; fy: string; kind: YearKind; f: Figures;
  // Form II
  costOfSales: number; grossProfit: number; pbit: number; pbdit: number; interest: number; opPbt: number; pbt: number; netProfit: number; retained: number; growthPct?: number;
  // Form III
  currentLiabilities: number; termLiabilities: number; outside: number; netWorth: number; liabilities: number;
  currentAssets: number; assets: number;
  // Form IV and the ratios
  nwc: number; currentRatio?: number; tolTnw?: number; debtEquity?: number; interestCover?: number; netMarginPct?: number;
  stockDays?: number; debtorDays?: number; creditorDays?: number;
  // The lender's ratios beside them (MV4, D-UX-56), off the forms: the DSCR on the year before's term loans due within 12
  // months (none for the first year given), the fixed-asset cover, and the security cover with the collateral's RSV.
  available: number; service?: number; dscr?: number; facr?: number; security: number; secured: number; securityCover?: number;
}
/** Form V by the turnover method, for the estimate and the projection. */
export interface Turnover { fy: string; turnover: number; need: number; margin: number; nwc: number; onMargin: number; onNwc: number; limit: number; short: number }
/** Form VI, the funds flow, for each year after the first given. */
export interface FlowYear {
  fy: string;
  netProfit: number; depreciation: number; capitalIn: number; termUp: number; promoterUp: number; assetsSold: number; nonCurrentDown: number; sources: number;
  termDown: number; capex: number; nonCurrentUp: number; drawings: number; capitalOut: number; promoterDown: number; uses: number;
  longTerm: number; caUp: number; clUp: number; gapUp: number; net: number; bankUp: number;
}
export interface Flag { id: string; text: string }
export interface Cma {
  years: CmaYear[]; flow: FlowYear[]; turnover: Turnover[];
  /** The limit by the turnover method for the projected year, the answer; and the limits now and proposed (Form I). */
  limit: number; existingLimit: number; proposed: number; flags: Flag[];
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const money = (a: number, b: number) => Math.abs(a - b) <= Math.max(0.01, 1e-9 * Math.max(Math.abs(a), Math.abs(b)));
const same = (a: number | undefined, b: number | undefined) => (a === undefined || b === undefined ? a === b : Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a)));
const ratio = (a: number, b: number) => (b > 0 ? a / b : undefined);
export const fyOf = (start: number) => `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
/** Each year's financial year, from the estimate's start: three audited years before it, the projection after. */
export const fyLabels = (startYear: number): Record<YearId, string> =>
  Object.fromEntries(YEARS.map((y, i) => [y.id, fyOf(startYear + i - 3)])) as Record<YearId, string>;
const KIND: Record<YearKind, string> = { audited: 'audited', estimate: 'estimate', projection: 'projection' };
export const yearName = (fy: string, kind: YearKind) => `${fy} (${KIND[kind]})`;

/** Which years are given: an audited year wholly empty is left out, the oldest first. */
export function yearsGiven(x: CmaInput): YearId[] {
  const filled = (id: YearId) => HEADS.some((h) => x.figures[id]?.[h.id] !== undefined);
  const first = YEARS.findIndex((y) => y.kind !== 'audited' || filled(y.id));
  return YEARS.slice(first).map((y) => y.id);
}

/** What is missing or cannot be right, year by year, in the order the page asks it. */
export function cmaNeeds(x: CmaInput): string[] {
  const needs: string[] = [];
  if (!(isNum(x.startYear) && x.startYear > 1990)) needs.push('The year now running');
  const fy = fyLabels(isNum(x.startYear) ? x.startYear : 2000);
  if (!(isNum(x.existingLimit) && x.existingLimit >= 0)) needs.push('The working-capital limit you have now (0 if none)');
  if (x.collateral !== undefined && !(isNum(x.collateral) && x.collateral >= 0)) needs.push('The collateral’s market value, as a figure of 0 or more');
  for (const id of yearsGiven(x)) {
    const y = YEARS.find((t) => t.id === id) as (typeof YEARS)[number], f = x.figures[id] ?? {}, name = yearName(fy[id], y.kind as YearKind);
    // A figure typed but not read is named first, before the blanks of its year (design review 5, UX4).
    const missing = HEADS.filter((h) => f[h.id] === undefined).map((h) => h.label);
    const wrong = HEADS.filter((h) => f[h.id] !== undefined && !(isNum(f[h.id]) && (h.negative || (f[h.id] as number) >= 0))).map((h) => h.label);
    if (wrong.length) needs.push(`${name}: ${wrong.join(', ')} as a figure of 0 or more`);
    if (missing.length) needs.push(`${name}: ${missing.length === 1 ? missing[0] : `${missing.length} figures, the first ${missing[0]}`}`);
    if (wrong.length || missing.length) continue;
    const v = f as Figures;
    if (v.tlDue12 > v.termLoans) needs.push(`${name}: the term loans due within 12 months are more than the term loans outstanding`);
    const t = totals(v, !!x.quasiEquity);
    if (!money(t.assets, t.liabilities)) {
      const d = t.assets - t.liabilities;
      needs.push(`${name}: the balance sheet does not balance: the assets are Rs. ${inr(Math.abs(d), Number.isInteger(d) ? 0 : 2)} ${d > 0 ? 'more' : 'less'} than the liabilities`);
    }
  }
  return needs;
}

export interface Subtotals { grossProfit?: number; netProfit?: number; assets?: number; liabilities?: number; blocked?: string }

/**
 * A year's subtotals while it is typed (UX9, review finding 3): gross profit once net sales and the cost of sales are in,
 * net profit once every figure of the profit and loss before drawings is, and both sides of the balance sheet once all
 * its heads are; each worked again by cma-check.ts, and none shown unless both agree. The balance sheet is compared,
 * never made to balance.
 */
export function subtotalsOf(f: Partial<Record<HeadId, number>>, quasi: boolean): Subtotals {
  const has = (form: 'II' | 'III', but: string[] = []) => HEADS.every((h) => h.form !== form || but.includes(h.id) || isNum(f[h.id]));
  const v = f as Figures, out: Subtotals = {};
  if (['sales', 'materials', 'otherDirect', 'depreciation'].every((h) => isNum(f[h as HeadId]))) out.grossProfit = v.sales - (v.materials + v.otherDirect + v.depreciation);
  if (has('II', ['drawings'])) out.netProfit = (out.grossProfit as number) - v.employees - v.sga - (v.wcInterest + v.tlInterest) + v.otherIncome - v.tax;
  if (has('III')) { const t = totals(v, quasi); out.assets = t.assets; out.liabilities = t.liabilities; }
  const c = subtotalsCheck(f);
  for (const k of ['grossProfit', 'netProfit', 'assets', 'liabilities'] as const)
    if ((out[k] === undefined) !== (c[k] === undefined) || (out[k] !== undefined && !money(out[k] as number, c[k] as number)))
      return { blocked: `The two computations disagree on ${k}, so no subtotals are shown. Please report this.` };
  return out;
}

function totals(f: Figures, quasi: boolean) {
  const currentLiabilities = f.bankWc + f.creditors + f.tlDue12 + f.otherCl;
  const termLiabilities = f.termLoans - f.tlDue12 + (quasi ? 0 : f.promoterLoans);
  const netWorth = f.capital + f.reserves + (quasi ? f.promoterLoans : 0);
  const outside = currentLiabilities + termLiabilities, liabilities = outside + netWorth;
  const currentAssets = f.stock + f.debtors + f.cash + f.otherCa, assets = currentAssets + f.netBlock + f.nonCurrent;
  return { currentLiabilities, termLiabilities, netWorth, outside, liabilities, currentAssets, assets };
}

function yearOf(id: YearId, fy: string, kind: YearKind, f: Figures, quasi: boolean, rsv: number, before?: Figures): CmaYear {
  const costOfSales = f.materials + f.otherDirect + f.depreciation, grossProfit = f.sales - costOfSales;
  const pbit = grossProfit - f.employees - f.sga, interest = f.wcInterest + f.tlInterest, opPbt = pbit - interest;
  const pbt = opPbt + f.otherIncome, netProfit = pbt - f.tax, t = totals(f, quasi), days = DATA.daysInYear;
  const days_ = (a: number, b: number) => (b > 0 ? (a / b) * days : undefined);
  const available = netProfit + f.depreciation + f.tlInterest, service = before ? f.tlInterest + before.tlDue12 : undefined;
  const security = f.netBlock + f.stock + f.debtors + rsv, secured = f.termLoans + f.bankWc;
  return {
    id, fy, kind, f, costOfSales, grossProfit, pbit, pbdit: pbit + f.depreciation, interest, opPbt, pbt, netProfit, retained: netProfit - f.drawings,
    ...(before && before.sales > 0 ? { growthPct: (f.sales / before.sales - 1) * 100 } : {}),
    ...t, nwc: t.currentAssets - t.currentLiabilities,
    currentRatio: ratio(t.currentAssets, t.currentLiabilities), tolTnw: ratio(t.outside, t.netWorth), debtEquity: ratio(t.termLiabilities, t.netWorth),
    interestCover: ratio(pbit + f.depreciation, interest), netMarginPct: f.sales > 0 ? (netProfit / f.sales) * 100 : undefined,
    stockDays: days_(f.stock, costOfSales), debtorDays: days_(f.debtors, f.sales), creditorDays: days_(f.creditors, f.materials),
    available, ...(service !== undefined ? { service } : {}), dscr: service === undefined ? undefined : ratio(available, service),
    facr: ratio(f.netBlock, f.termLoans), security, secured, securityCover: ratio(security, secured),
  };
}

function turnoverOf(y: CmaYear): Turnover {
  const T = TURNOVER, turnover = y.f.sales, need = (turnover * T.needPct) / 100, margin = (turnover * T.marginPct) / 100;
  const onMargin = need - margin, onNwc = need - y.nwc;
  return { fy: y.fy, turnover, need, margin, nwc: y.nwc, onMargin, onNwc, limit: Math.max(0, Math.min(onMargin, onNwc)), short: Math.max(0, margin - y.nwc) };
}

function flowOf(y: CmaYear, b: CmaYear): FlowYear {
  const d = (h: HeadId) => y.f[h] - b.f[h], pos = (v: number) => Math.max(0, v), neg = (v: number) => Math.max(0, -v);
  const capital = d('capital') + d('reserves') - y.retained, term = d('termLoans') - d('tlDue12'), promoter = d('promoterLoans');
  const capex = d('netBlock') + y.f.depreciation, nonCurrent = d('nonCurrent');
  const sources = y.netProfit + y.f.depreciation + pos(capital) + pos(term) + pos(promoter) + neg(capex) + neg(nonCurrent);
  const uses = neg(term) + pos(capex) + pos(nonCurrent) + y.f.drawings + neg(capital) + neg(promoter);
  const caUp = d('stock') + d('debtors') + d('cash') + d('otherCa'), clUp = d('creditors') + d('otherCl') + d('tlDue12');
  const longTerm = sources - uses, gapUp = caUp - clUp;
  return {
    fy: y.fy, netProfit: y.netProfit, depreciation: y.f.depreciation, capitalIn: pos(capital), termUp: pos(term), promoterUp: pos(promoter), assetsSold: neg(capex), nonCurrentDown: neg(nonCurrent), sources,
    termDown: neg(term), capex: pos(capex), nonCurrentUp: pos(nonCurrent), drawings: y.f.drawings, capitalOut: neg(capital), promoterDown: neg(promoter), uses,
    longTerm, caUp, clUp, gapUp, net: longTerm - gapUp, bankUp: d('bankWc'),
  };
}

const rsText = (n: number) => `Rs. ${inr(n, Number.isInteger(n) ? 0 : 2)}`;

function flagsOf(years: CmaYear[], turnover: Turnover[], limit: number, proposed: number): Flag[] {
  const flags: Flag[] = [], audited = years.filter((y) => y.kind === 'audited'), ahead = years.filter((y) => y.kind !== 'audited');
  const band = (ASSUMPTIONS.find((a) => a.id === 'band') as { value: number }).value;
  if (audited.length < 3) flags.push({ id: 'audited', text: `${audited.length} audited year${audited.length === 1 ? '' : 's'} given of the three asked, so the projection is tested against less of the past` });
  const past = audited.map((y) => y.growthPct).filter(isNum);
  if (past.length) {
    const best = Math.max(...past);
    for (const y of ahead) if (isNum(y.growthPct) && y.growthPct > best + 1e-9)
      flags.push({ id: `growth-${y.id}`, text: `${yearName(y.fy, y.kind)}: sales grow ${y.growthPct.toFixed(2)}%, faster than in any audited year (at most ${best.toFixed(2)}%)` });
  } else flags.push({ id: 'growth', text: 'Sales growth is not tested: it needs two audited years' });
  if (audited.length) for (const [k, what] of [['stockDays', 'stock'], ['debtorDays', 'debtor'], ['creditorDays', 'creditor']] as const) {
    const was = audited.map((y) => y[k]).filter(isNum);
    if (!was.length) continue;
    const avg = was.reduce((a, v) => a + v, 0) / was.length;
    for (const y of ahead) {
      const v = y[k];
      if (isNum(v) && Math.abs(v - avg) > band)
        flags.push({ id: `${k}-${y.id}`, text: `${yearName(y.fy, y.kind)}: ${what} days of ${v.toFixed(0)}, against ${avg.toFixed(0)} on average in the audited years` });
    }
  }
  for (const t of turnover) if (t.short > 0)
    flags.push({ id: `margin-${t.fy}`, text: `${t.fy}: the net working capital, ${rsText(t.nwc)}, is below the borrower’s 5% margin of ${rsText(t.margin)}, short by ${rsText(t.short)}; the limit is worked on the 5% margin` });
  if (proposed > limit + 0.005) flags.push({ id: 'proposed', text: `The projected balance sheet borrows ${rsText(proposed)} from banks for working capital, ${rsText(proposed - limit)} more than the limit by the turnover method` });
  if (limit > TURNOVER.maxLimit) flags.push({ id: 'ceiling', text: `The limit is above Rs. 5 crore, where lenders assess by the working-capital gap (the second method), not the turnover method` });
  for (const y of years) if (y.netWorth <= 0) flags.push({ id: `worth-${y.id}`, text: `${yearName(y.fy, y.kind)}: the net worth is nil or less, so the ratios on it are not worked out` });
  return flags;
}

export function cma(x: CmaInput): Cma | Needs | Blocked {
  const needs = cmaNeeds(x);
  if (needs.length) return { needs };
  const quasi = !!x.quasiEquity, fy = fyLabels(x.startYear), given = yearsGiven(x), rsv = ((x.collateral ?? 0) * LEVELS.collateral.rsvPct) / 100;
  const years: CmaYear[] = [];
  for (const id of given) {
    const kind = (YEARS.find((t) => t.id === id) as { kind: string }).kind as YearKind;
    years.push(yearOf(id, fy[id], kind, x.figures[id] as Figures, quasi, rsv, years.at(-1)?.f));
  }
  const flow = years.slice(1).map((y, i) => flowOf(y, years[i]));
  const turnover = years.filter((y) => y.kind !== 'audited').map(turnoverOf);
  const limit = (turnover.at(-1) as Turnover).limit, proposed = (years.at(-1) as CmaYear).f.bankWc;

  const check = cmaCheck(given.map((id) => x.figures[id] as Figures), quasi, DATA.daysInYear, TURNOVER.needPct, TURNOVER.marginPct, rsv);
  for (const [i, y] of years.entries()) {
    const c = check[i];
    for (const k of ['pbt', 'netProfit', 'pbdit', 'currentLiabilities', 'termLiabilities', 'netWorth', 'outside', 'currentAssets', 'assets', 'nwc', 'available', 'security', 'secured'] as const)
      if (!money(y[k], c[k])) return blocked(`${y.fy}: ${k}`);
    for (const k of ['currentRatio', 'tolTnw', 'debtEquity', 'interestCover', 'netMarginPct', 'stockDays', 'debtorDays', 'creditorDays', 'growthPct', 'dscr', 'facr', 'securityCover'] as const)
      if (!same(y[k], c[k])) return blocked(`${y.fy}: ${k}`);
    // Form VI must close: what the flows leave over is what the bank borrowing fell by, from the balance sheets alone.
    if (i > 0 && !money(flow[i - 1].net, -c.bankChange)) return blocked(`${y.fy}: the funds flow`);
  }
  for (const t of turnover) {
    const c = check[years.findIndex((y) => y.fy === t.fy)];
    if (!money(t.limit, c.limit as number)) return blocked(`${t.fy}: the limit by the turnover method`);
  }
  return { years, flow, turnover, limit, existingLimit: x.existingLimit as number, proposed, flags: flagsOf(years, turnover, limit, proposed) };
}

const blocked = (where: string): Blocked => ({ blocked: `The two computations disagree on ${where}, so no figures are shown. Please report this.` });
