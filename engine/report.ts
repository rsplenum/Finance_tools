/**
 * A project report for a term loan with working capital: the cost of the project and how it is financed; the projected
 * profit and loss, balance sheet and cash flow, year by year over the term loan's years; the DSCR; break-even; the usual
 * ratios; and the working-capital assessment by the second method of lending and by the turnover method. Pure, no DOM.
 * Profit, tax, the loan's schedule and the DSCR come from dscr.ts (planStatement), worked out twice there; the rest is
 * checked by report-check.ts. Nothing is returned unless both agree and the balance sheet balances.
 */
import DATA from './data/report.json';
import { PRESETS, amortization, isFy, loanTimeline, planStatement, type Blocked, type Definition, type LoanInput, type Needs, type Plan, type ProjectionYear } from './dscr';
import { fyOf, monthAfter, type LoanTerms } from './loan';
import { monthsOf, series } from './project';
import { GUARANTEES, cgtmseRate, guaranteeFee, type FeeYear, type GuaranteeId } from './guarantee';
import { guaranteeFeeCheck, pmegpCheck, reportCheck, workedLimitCheck } from './report-check';
import { borrowerOf } from './tax';
import { inr } from './util';
import RATIOS from './data/ratios.json';

export const HEADS = DATA.heads;
export const ASSUMPTIONS = DATA.assumptions;
export const METHOD = DATA.method;
export type HeadId = (typeof DATA.heads)[number]['id'];
/** Costs by head (expert mode, D-UX-112): those that vary with sales, as a % of sales; the rest in rupees a month. */
export const COST_HEADS = DATA.costHeads;
export type VariableHeadId = (typeof DATA.costHeads.variable)[number]['id'];
export type FixedHeadId = (typeof DATA.costHeads.fixed)[number]['id'];
export interface CostHeadsInput { variable?: Partial<Record<VariableHeadId, number>>; fixed?: Partial<Record<FixedHeadId, number>> }
export interface HeadAmount { id: VariableHeadId | FixedHeadId; label: string; amount: number }
export const PMEGP = DATA.schemes.pmegp;
export const MUDRA = DATA.schemes.mudra;
export type MudraLevel = (typeof MUDRA.levels)[number];
/** The day the report's rules and the schemes are next due for a review (Q2, D-DATA-19). */
export const REPORT_REVIEW_BY = DATA.reviewBy;
export type Category = keyof typeof PMEGP.ownPct;
export type Area = keyof typeof PMEGP.subsidyPct.general;
export type Activity = keyof typeof PMEGP.ceiling;
/** A government scheme the project is financed under, one at a time (D-UX-49, SCH1): PMEGP or Mudra. */
export type SchemeInput = PmegpInput | MudraInput;
/** `confirmed`: the borrower confirms PMEGP's conditions (engine/data/report.json); unconfirmed, the report flags them. */
export interface PmegpInput { id: 'pmegp'; category?: Category; area?: Area; activity?: Activity; confirmed?: boolean }
/** `tarunRepaid`: the borrower has repaid a Tarun loan, which alone opens Tarun Plus, above Rs. 10 lakh. */
export interface MudraInput { id: 'mudra'; tarunRepaid?: boolean }
/** The guarantee on the loans: CGFMU's on a Mudra loan, always; on another loan CGTMSE's when ticked, with the number of
 * its concessions that apply (0 to 3). A rate typed from the sanction letter (% a year) takes the place of the scheme's. */
export interface GuaranteeInput { cgtmse?: boolean; concessions?: number; ratePct?: number }
/** A product or service sold (D-UX-109): what it is, how many a month at full running, and its price a unit. */
export interface ProductInput { name?: string; unitsMonth?: number; price?: number }
/** A product's line in a year: the units sold (at the year's use of the capacity, for its months of sales), the price a
 * unit that year, and the sales; the lines add up to the year's sales. */
export interface ProductYear { name: string; units: number; price: number; sales: number }

export interface ReportInput {
  /** Who the borrower is (an id in engine/data/tax.json): it sets the tax. */
  taxBy?: string;
  /** The cost of the project by head, in rupees; a head not given has none. */
  cost: Partial<Record<HeadId, number>>;
  /** The term loan: its amount and terms. */
  loan: LoanInput;
  subsidy?: number;
  unsecured?: number;
  /** Sales by the capacity (units a year) × its use (% by year of sales, the last repeating) × the price a unit, growing
   * by `priceGrowthPct` a year; or, with `salesBy: 'typed'`, a full year's sales and their growth a year (%). `products`,
   * one line each (units a month at full running and the price), take the place of the capacity and the price. */
  salesBy?: 'drivers' | 'typed';
  capacity?: number; price?: number; products?: ProductInput[]; utilisationPct?: number[]; priceGrowthPct?: number;
  sales?: number; salesGrowthPct?: number;
  /** Months from the term loan's first draw to the first sales (0 if at once). */
  monthsToStart?: number;
  scheme?: SchemeInput;
  guarantee?: GuaranteeInput;
  /** Materials and other variable costs, as a share of sales (%). */
  variablePct?: number;
  /** Fixed costs for a full first year (salaries, rent, overheads) and their growth a year (%). */
  fixedCosts?: number; fixedGrowthPct?: number;
  /** Or the costs by head: each variable head a % of sales and each fixed head rupees a month, added up here. A total
   * given above takes the place of its side's heads, which then only split it in the profit and loss. */
  costHeads?: CostHeadsInput;
  /** Days of stock, debtors and creditors. */
  days?: { stock?: number; debtors?: number; creditors?: number };
  /** The working-capital limit sought, and its interest rate (%). */
  wcLimit?: number; wcRatePct?: number;
  /** The collateral's market value (D-UX-52): its realisable sale value counts in the security cover. */
  collateral?: number;
}

export interface CostLine { id: HeadId | 'margin' | 'idc' | 'fee'; label: string; amount: number }
export interface Flow {
  capital: number; subsidy: number; unsecured: number; termLoan: number; pat: number; depreciation: number; preliminary: number; wcLoan: number; creditors: number; sources: number;
  fixedAssets: number; preliminarySpent: number; stock: number; debtors: number; repaid: number; uses: number; net: number; opening: number; closing: number;
}
export interface ReportYear {
  fy: string;
  /** Months of sales in the year, the use of the capacity and the sales by product (by drivers only). */
  months: number; utilisationPct?: number; products?: ProductYear[];
  sales: number; variable: number; fixed: number;
  /** The variable and fixed costs by head, when they were given by head: they add up to `variable` and `fixed`. */
  heads?: { variable: HeadAmount[]; fixed: HeadAmount[] };
  pbdit: number; depreciation: number; preliminary: number; tlInterest: number; wcInterest: number;
  /** The guarantee fee in the year, a finance cost (0 without a guarantee). */
  guaranteeFee: number; pbt: number; tax: number; pat: number;
  capital: number; subsidy: number; retained: number; netWorth: number; unsecured: number; termLoan: number; wcLoan: number; creditors: number; liabilities: number;
  grossBlock: number; accumulated: number; netBlock: number; preliminaryLeft: number; stock: number; debtors: number; cash: number; assets: number;
  flow: Flow;
  available: number; service: number; principal: number; dscr?: number; counted: boolean;
  /** Sales less variable costs; fixed costs with depreciation, the write-off and all interest: break-even's two sides. */
  contribution: number; fixedAll: number; bepPct?: number; bepSales?: number; cashBepPct?: number;
  currentRatio?: number; debtEquity?: number; tolTnw?: number; interestCover?: number; netMarginPct: number; facr?: number;
  /** The security for the loans (net fixed assets, stock and debtors), what it secures (the term loan and the limit
   * outstanding) and the security cover with the collateral's realisable sale value, once the collateral is typed. */
  security: number; secured: number; securityCover?: number;
  currentAssets: number; gap: number; mpbf: number; turnoverNeed: number; turnoverBank: number;
}
/** PMEGP's margin money on this project, and what the engine flags against the scheme's rules (never a decision). */
export interface SchemeResult {
  id: 'pmegp'; label: string; cost: number; base: number; ratePct: number; subsidy: number; sanctioned: number;
  ownPct: number; ownMinPct: number; workingCapitalPct: number; workingCapitalMaxPct: number; ceiling: number; flags: string[];
}
/** A Mudra loan's level by the term loan and the limit in all, and where to apply. */
export interface MudraResult { level: MudraLevel; total: number; collateralFreeUpTo: number; apply: { label: string; url: string } }
/** The guarantee and its fee: the rate (the scheme's, or `typed`), the cover that sets CGTMSE's slab, the fee before the
 * first sales (in the cost of the project), over the whole loan, and in each year of it from its first draw. */
export interface GuaranteeResult { id: GuaranteeId; label: string; ratePct: number; typed: boolean; cover: number; concessions: number; beforeStart: number; total: number; years: FeeYear[] }
export interface Report {
  start: string; scheme?: SchemeResult; mudra?: MudraResult; guarantee?: GuaranteeResult; interestBeforeStart: number;
  /** The year cash first goes lowest below nil, and the promoters' money more that keeps it at nil or above. */
  cashShort?: { fy: string; lowest: number; need: number };
  cost: CostLine[]; fixedAssets: number; marginMoney: number; projectCost: number;
  finance: { termLoan: number; subsidy: number; unsecured: number; promoter: number; total: number; promoterPct: number };
  /** The collateral's market value, realisable sale value and distress sale value (engine/data/ratios.json). */
  collateral?: { market: number; rsv: number; dsv: number };
  wcLimit: number; years: ReportYear[]; average?: number; lowest?: { dscr: number; fy: string }; plan: Plan;
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const money = (a: number, b: number) => Math.abs(a - b) <= Math.max(0.01, 1e-9 * Math.max(Math.abs(a), Math.abs(b)));
const blocked = (where: string): Blocked => ({ blocked: `The two computations disagree on ${where}, so no figures are shown. Please report this.` });
const DSCR_METHOD = (PRESETS.find((p) => p.id === DATA.dscrMethod) as { choice: Definition }).choice;

/** Mudra's level for the term loan and the limit in all; none above the Rs. 20 lakh it lends in all. */
export const mudraLevel = (total: number): MudraLevel | undefined => MUDRA.levels.find((v) => total <= v.upTo);

/** On a Mudra loan, what the cost of the project as worked needs beyond the promoters' most, the subsidy, the unsecured
 * loans and the largest term loan within Mudra's Rs. 20 lakh in all (the limit as typed); none when they fund it (D-UX-111). */
export function mudraShort(r: Report, promotersMost: number): number | undefined {
  if (!r.mudra) return undefined;
  const short = r.projectCost - r.finance.subsidy - r.finance.unsecured - promotersMost - (MUDRA.mostInAll - r.wcLimit);
  return short > 0.005 ? short : undefined;
}

const typedHeads = <K extends string>(h: Partial<Record<K, number>> | undefined) => Object.entries(h ?? {}).filter(([, v]) => v !== undefined) as [K, number][];
/** The variable costs (% of sales) and a full first year's fixed costs: as given, or added up from the heads. */
export function costsOf(x: ReportInput): { variablePct?: number; fixedCosts?: number } {
  const v = typedHeads(x.costHeads?.variable), f = typedHeads(x.costHeads?.fixed);
  return {
    variablePct: x.variablePct ?? (v.length ? v.reduce((t, [, p]) => t + p, 0) : undefined),
    fixedCosts: x.fixedCosts ?? (f.length ? 12 * f.reduce((t, [, m]) => t + m, 0) : undefined),
  };
}

/** A side's costs split by its typed heads (more than 0), in their shares; none without any. */
function splitOf<K extends string>(h: Partial<Record<K, number>> | undefined, side: 'variable' | 'fixed', total: number): HeadAmount[] {
  const typed = typedHeads(h).filter(([, a]) => a > 0), sum = typed.reduce((t, [, a]) => t + a, 0);
  const label = (id: string) => (COST_HEADS[side] as { id: string; label: string }[]).find((c) => c.id === id)?.label ?? id;
  return sum > 0 ? typed.map(([id, a]) => ({ id: id as HeadAmount['id'], label: label(id), amount: (total * a) / sum })) : [];
}

/** The first year's sales at its full rate (a year of sales at that year's use of the capacity), or none while a figure
 * it needs is missing. */
function firstRun(x: ReportInput): number | undefined {
  if (x.salesBy === 'typed') return isNum(x.sales) ? x.sales : undefined;
  const u = x.utilisationPct?.[0];
  const lines = x.products ? x.products.map((p) => [12 * (p.unitsMonth as number), p.price as number]) : [[x.capacity as number, x.price as number]];
  const full = lines.reduce((t, [n, p]) => t + n * p, 0);
  return isNum(full) && isNum(u) ? (full * u) / 100 : undefined;
}

/** The working-capital limit worked out (D-UX-112): the lower of the need by the second method of lending (75% of the
 * first year's stock and debtors at its full rate, less its creditors) and the bank's share of that year's sales by the
 * turnover method; none while sales, the variable costs or the days are missing. Checked by `workedLimitCheck`. */
export function workedLimit(x: ReportInput): { need: number; turnover: number; limit: number } | undefined {
  const run = firstRun(x), v = costsOf(x).variablePct, d = x.days;
  if (run === undefined || !isNum(v) || !d || !isNum(d.stock) || !isNum(d.debtors) || !isNum(d.creditors)) return undefined;
  const runVariable = (run * v) / 100, stock = (runVariable * d.stock) / 365, debtors = (run * d.debtors) / 365, creditors = (runVariable * d.creditors) / 365;
  const need = Math.max(0, ((stock + debtors) * DATA.workingCapital.mpbfSharePct) / 100 - creditors), turnover = (run * DATA.workingCapital.turnoverBankPct) / 100;
  const limit = Math.min(need, turnover), again = workedLimitCheck(run, v, d as { stock: number; debtors: number; creditors: number });
  return money(limit, again) ? { need, turnover, limit } : undefined;
}

/** What is missing, in the order the page asks it. */
export function reportNeeds(x: ReportInput): string[] {
  const needs: string[] = [];
  if (!borrowerOf(x.taxBy)) needs.push('Who the borrower is: it sets the tax');
  const heads = HEADS.filter((h) => h.id !== 'preliminary' && h.id !== 'land');
  for (const h of HEADS) if (x.cost[h.id] !== undefined && !(isNum(x.cost[h.id]) && (x.cost[h.id] as number) >= 0)) needs.push(`Cost of the project: ${h.label.toLowerCase()}, a figure of 0 or more`);
  if (!heads.some((h) => (x.cost[h.id] ?? 0) > 0)) needs.push('Cost of the project: at least one fixed asset other than land');
  const l = x.loan;
  if (!(isNum(l.amount) && l.amount > 0)) needs.push('The term loan: its amount');
  if (!isNum(l.ratePct)) needs.push('The term loan: its interest rate');
  if (!l.disbursed) needs.push('The term loan: the month it is first drawn');
  if (!isNum(l.moratoriumMonths)) needs.push('The term loan: the moratorium in months (0 if none)');
  if (!(isNum(l.instalments) && l.instalments > 0)) needs.push('The term loan: the number of instalments');
  if (!l.frequency || !l.style) needs.push('The term loan: how it is repaid');
  for (const [v, what] of [[x.subsidy, 'Capital subsidy'], [x.unsecured, 'Unsecured loans']] as const) if (v !== undefined && !(isNum(v) && v >= 0)) needs.push(`${what}: a figure of 0 or more`);
  if (x.salesBy === 'typed') {
    if (!isNum(x.sales)) needs.push('Sales in a full first year');
    if (!isNum(x.salesGrowthPct)) needs.push('Sales: growth a year (%)');
  } else {
    if (x.products) {
      if (!x.products.length) needs.push('Sales: at least one product or service');
      x.products.forEach((p, k) => {
        if (!p.name?.trim()) needs.push(`Sales, line ${k + 1}: what is sold`);
        if (!(isNum(p.unitsMonth) && p.unitsMonth > 0)) needs.push(`Sales, line ${k + 1}: how many a month at full running`);
        if (!(isNum(p.price) && p.price > 0)) needs.push(`Sales, line ${k + 1}: the price a unit`);
      });
    } else {
      if (!(isNum(x.capacity) && x.capacity > 0)) needs.push('Capacity: the units the business can make or serve in a year');
      if (!(isNum(x.price) && x.price > 0)) needs.push('Price a unit');
    }
    const u = x.utilisationPct ?? [];
    if (!u.length || !u.every((p) => isNum(p) && p >= 0 && p <= 100)) needs.push('Use of the capacity by year (%), each 0 to 100');
    if (!isNum(x.priceGrowthPct)) needs.push('The price: growth a year (%)');
  }
  if (!(isNum(x.monthsToStart) && Number.isInteger(x.monthsToStart) && x.monthsToStart >= 0)) needs.push('Months from the loan to the first sales (0 if at once)');
  if (x.scheme?.id === 'mudra' && isNum(l.amount) && isNum(x.wcLimit)) {
    const total = l.amount + x.wcLimit, most = MUDRA.mostInAll, tarun = (MUDRA.levels.find((v) => v.id === 'tarun') as MudraLevel).upTo;
    if (total > most) needs.push(`Mudra: the term loan and the working-capital limit come to Rs. ${inr(total)}, Rs. ${inr(total - most)} above the Rs. ${inr(most)} Mudra lends in all. Lower them by Rs. ${inr(total - most)}, the promoters bringing more, or choose no scheme: a loan to a small enterprise, which CGTMSE can guarantee`);
    else if (total > tarun && !x.scheme.tarunRepaid) needs.push(`Mudra: the loans come to Rs. ${inr(total)}, above Tarun's Rs. ${inr(tarun)}. Tarun Plus, up to Rs. ${inr(most)}, is only for a borrower who has repaid a Tarun loan: tick that if so, or lower the loans to Rs. ${inr(tarun)}`);
  }
  if (x.scheme?.id === 'mudra' && x.collateral !== undefined) needs.push('Mudra: a Mudra loan takes no collateral, so leave its market value empty');
  const g = x.guarantee;
  if (g?.concessions !== undefined && !(Number.isInteger(g.concessions) && g.concessions >= 0 && g.concessions <= GUARANTEES.cgtmse.groups.length)) needs.push(`CGTMSE: the concessions that apply, 0 to ${GUARANTEES.cgtmse.groups.length}`);
  if (g?.ratePct !== undefined && !(isNum(g.ratePct) && g.ratePct >= 0)) needs.push('The guarantee fee: a rate of 0 or more (% a year)');
  if (g?.cgtmse && x.scheme?.id !== 'mudra' && g.ratePct === undefined && isNum(l.amount) && isNum(x.wcLimit) && cgtmseRate(l.amount + x.wcLimit, 0) === undefined) {
    const most = GUARANTEES.cgtmse.slabs[GUARANTEES.cgtmse.slabs.length - 1].upTo;
    needs.push(`CGTMSE: the loans come to Rs. ${inr(l.amount + x.wcLimit)}, above the Rs. ${inr(most)} it guarantees in all; untick it`);
  }
  if (x.scheme?.id === 'pmegp') {
    const sc = x.scheme;
    if (!sc.category || !(sc.category in PMEGP.ownPct)) needs.push('PMEGP: the borrower\'s category');
    if (!sc.area || !(sc.area in PMEGP.subsidyPct.general)) needs.push('PMEGP: a town or a village');
    if (!sc.activity || !(sc.activity in PMEGP.ceiling)) needs.push('PMEGP: manufacturing or a service');
  }
  for (const side of ['variable', 'fixed'] as const) for (const h of COST_HEADS[side]) {
    const v = (x.costHeads?.[side] as Record<string, number | undefined> | undefined)?.[h.id];
    if (v !== undefined && !(isNum(v) && v >= 0)) needs.push(`Costs by head: ${h.label.toLowerCase()}, a figure of 0 or more`);
  }
  const c = costsOf(x);
  if (!(isNum(c.variablePct) && c.variablePct >= 0 && c.variablePct < 100)) needs.push('Materials and other variable costs, as a share of sales (%), below 100');
  if (!isNum(c.fixedCosts)) needs.push('Fixed costs in a full first year');
  if (!isNum(x.fixedGrowthPct)) needs.push('Fixed costs: growth a year (%)');
  const d = x.days ?? {};
  for (const k of ['stock', 'debtors', 'creditors'] as const) if (!(isNum(d[k]) && (d[k] as number) >= 0 && (d[k] as number) <= 365)) needs.push(`Days of ${k}, 0 to 365`);
  if (!(isNum(x.wcLimit) && x.wcLimit >= 0)) needs.push('The working-capital limit sought (0 if none)');
  if (isNum(x.wcLimit) && x.wcLimit > 0 && !isNum(x.wcRatePct)) needs.push('The working-capital limit: its interest rate');
  if (x.collateral !== undefined && !(isNum(x.collateral) && x.collateral >= 0)) needs.push('The collateral\'s market value: a figure of 0 or more');
  return needs;
}

export function projectReport(x: ReportInput): Report | Needs | Blocked {
  const needs = reportNeeds(x);
  if (needs.length) return { needs };
  const when = loanTimeline(x.loan);
  if ('needs' in when) return when;
  // Sales start `monthsToStart` months after the loan is first drawn; the years before that hold no sales and are left out.
  const at = monthAfter(x.loan.disbursed as string, x.monthsToStart as number);
  const start = `${at.year}-${String(at.month).padStart(2, '0')}`, startFy = fyOf(at.year, at.month);
  const fys = when.years.filter((fy) => fy >= startFy), n = fys.length, first = fys[0];
  if (!n || !isFy(first)) return { needs: ['Months from the loan to the first sales: sales would start after the loan is repaid'] };
  const months = fys.map((fy) => monthsOf(fy).filter((ym) => ym >= start).length);
  // A full year's sales at each year's rate, from the drivers or as typed; a year's own figure is a twelfth of its rate for
  // each month of sales in it.
  const drivers = x.salesBy !== 'typed', u = x.utilisationPct ?? [];
  const util = drivers ? fys.map((_, k) => u[Math.min(k, u.length - 1)]) : [];
  // The products as units a year at full running (the capacity is one line); their sales at full running add up.
  const lines = !drivers ? [] : x.products ? x.products.map((p) => ({ name: (p.name as string).trim(), perYear: 12 * (p.unitsMonth as number), price: p.price as number }))
    : [{ name: '', perYear: x.capacity as number, price: x.price as number }];
  const full = lines.reduce((t, l) => t + l.perYear * l.price, 0), grow = (k: number) => Math.pow(1 + (x.priceGrowthPct as number) / 100, k);
  let runS: number[];
  if (drivers) runS = util.map((p, k) => (full * grow(k) * p) / 100);
  else {
    const typed = series({ kind: 'grow', first: x.sales, pct: x.salesGrowthPct }, n, 'Sales', first);
    if (!Array.isArray(typed)) return typed;
    runS = typed;
  }
  const costs = costsOf(x);
  const fixedS = series({ kind: 'grow', first: costs.fixedCosts, pct: x.fixedGrowthPct }, n, 'Fixed costs', first);
  if (!Array.isArray(fixedS)) return fixedS;
  const part = (rate: number, k: number) => monthsOf(fys[k]).reduce((t, ym) => t + (ym >= start ? rate / 12 : 0), 0);
  const v = costs.variablePct as number, days = x.days as { stock: number; debtors: number; creditors: number };
  const limit = x.wcLimit as number, wcRate = limit > 0 ? (x.wcRatePct as number) : 0;
  const cost = Object.fromEntries(HEADS.map((h) => [h.id, x.cost[h.id] ?? 0])) as Record<HeadId, number>;

  // Stock, debtors and creditors are the days given of a full year's figures at the year's rate, so a first year of a few
  // months holds what the business needs once running. The margin for working capital is what the first year's stock and
  // debtors need beyond the creditors and the bank's limit.
  const level = (k: number) => {
    const run = runS[k], runVariable = (run * v) / 100;
    return { stock: (runVariable * days.stock) / 365, debtors: (run * days.debtors) / 365, creditors: (runVariable * days.creditors) / 365 };
  };
  const l0 = level(0), marginMoney = Math.max(0, l0.stock + l0.debtors - l0.creditors - limit);
  const fixedAssets = HEADS.filter((h) => h.id !== 'preliminary').reduce((t, h) => t + cost[h.id], 0), prelim = cost.preliminary;

  // PMEGP: the margin money on the project cost (fixed assets without land, the preliminary expenses and one cycle of working
  // capital: the margin and the bank's limit), at most the ceiling. It is held as a deposit and set off against the loan, so
  // the loan is repaid, and bears interest, on what is left (engine/data/report.json).
  let scheme: SchemeResult | undefined;
  const sanctioned = x.loan.amount as number;
  if (x.scheme?.id === 'pmegp') {
    if (x.subsidy) return { needs: ['A capital subsidy beside PMEGP: PMEGP\'s margin money is worked out, so leave the capital subsidy empty'] };
    const sc = x.scheme as Required<PmegpInput>, ratePct = PMEGP.subsidyPct[sc.category][sc.area], ceiling = PMEGP.ceiling[sc.activity];
    const pc = fixedAssets - cost.land + prelim + marginMoney + limit, base = pc > ceiling ? ceiling : pc, subsidy = (ratePct / 100) * base;
    if (!money(subsidy, pmegpCheck(pc, ratePct, ceiling))) return blocked('the PMEGP margin money');
    if (subsidy >= sanctioned) return { needs: [`The term loan: more than PMEGP's margin money of Rs. ${inr(subsidy)}, which is set off against it`] };
    scheme = { id: 'pmegp', label: PMEGP.label, cost: pc, base, ratePct, subsidy, sanctioned, ownPct: 0, ownMinPct: PMEGP.ownPct[sc.category],
      workingCapitalPct: pc > 0 ? ((marginMoney + limit) / pc) * 100 : 0, workingCapitalMaxPct: PMEGP.workingCapitalMaxPct[sc.activity], ceiling, flags: [] };
  }
  const loan: LoanInput = scheme ? { ...x.loan, amount: sanctioned - scheme.subsidy } : x.loan;

  // Interest before the first sales is paid from the cost of the project and written off with the preliminary expenses.
  const debt = amortization(loan);
  if (!('years' in debt)) return debt;
  const interestBeforeStart = debt.years.filter((d) => d.fy < first).reduce((t, d) => t + d.interest, 0);

  // The guarantee fee (SCH1): CGFMU's on a Mudra loan, CGTMSE's when ticked; a finance cost each year, and before the first
  // sales paid from the cost of the project with the interest then. Worked twice: guarantee.ts and report-check.ts.
  const gid: GuaranteeId | undefined = x.scheme?.id === 'mudra' ? 'cgfmu' : x.guarantee?.cgtmse ? 'cgtmse' : undefined;
  let guarantee: GuaranteeResult | undefined;
  if (gid) {
    const cover = sanctioned + limit, concessions = gid === 'cgtmse' ? x.guarantee?.concessions ?? 0 : 0, typed = x.guarantee?.ratePct !== undefined;
    const ratePct = typed ? (x.guarantee?.ratePct as number) : gid === 'cgfmu' ? GUARANTEES.cgfmu.ratePct : (cgtmseRate(cover, concessions) as number);
    const fee = { id: gid, ratePct, guaranteed: sanctioned, held: scheme ? scheme.subsidy : 0, heldMonths: PMEGP.lockInYears * 12, limit, start, fys: when.years };
    const byYear = guaranteeFee({ ...fee, months: debt.months }), again = guaranteeFeeCheck({ ...fee, loan: loan as LoanTerms });
    if (byYear.some((y, k) => !money(y.termLoan, again[k].termLoan) || !money(y.workingCapital, again[k].workingCapital))) return blocked('the guarantee fee');
    guarantee = { id: gid, label: GUARANTEES[gid].label, ratePct, typed, cover, concessions, beforeStart: byYear.filter((y) => y.fy < first).reduce((t, y) => t + y.total, 0), total: byYear.reduce((t, y) => t + y.total, 0), years: byYear };
  }
  const feeBeforeStart = guarantee?.beforeStart ?? 0, feeOf = (fy: string) => guarantee?.years.find((y) => y.fy === fy)?.total ?? 0;
  const prelimAll = prelim + interestBeforeStart + feeBeforeStart, years = DATA.preliminaryYears;

  // Profit before interest, depreciation and tax; depreciation on the written-down value, head by head.
  const wdv = new Map(HEADS.filter((h) => h.id !== 'preliminary').map((h) => [h.id, cost[h.id]]));
  const rows = fys.map((fy, k) => {
    const sales = part(runS[k], k), variable = (sales * v) / 100, fixed = part(fixedS[k], k);
    let depreciation = 0;
    for (const h of HEADS) {
      if (h.id === 'preliminary') continue;
      const d = ((wdv.get(h.id) as number) * h.depreciationPct) / 100;
      wdv.set(h.id, (wdv.get(h.id) as number) - d);
      depreciation += d;
    }
    return { fy, sales, variable, fixed, pbdit: sales - variable - fixed, depreciation, preliminary: k < years ? prelimAll / years : 0, wcInterest: part((limit * wcRate) / 100, k), guaranteeFee: feeOf(fy) };
  });
  const proj: ProjectionYear[] = rows.map((r) => ({
    fy: r.fy, pbdit: r.pbdit, assetIncome: 0, depreciation: r.depreciation, nonCash: r.preliminary, interestOther: r.wcInterest + r.guaranteeFee,
    otherLoansInterest: 0, otherLoansPrincipal: 0, existingEmis: 0, taxBy: x.taxBy,
  }));
  const plan = planStatement(proj, loan, DSCR_METHOD, first > when.years[0] ? first : undefined);
  if (!('statement' in plan)) return plan;
  if (!money(plan.beforeStart.reduce((t, d) => t + d.interest, 0), interestBeforeStart)) return blocked('the interest before the first sales');

  const projectCost = fixedAssets + prelimAll + marginMoney;
  const subsidy = scheme ? scheme.subsidy : x.subsidy ?? 0, unsecured = x.unsecured ?? 0, termLoan = loan.amount as number, promoter = projectCost - termLoan - subsidy - unsecured;
  if (promoter < 0) return { needs: ['The term loan, subsidy and unsecured loans come to more than the cost of the project'] };
  if (scheme) {
    // The promoters' own share of PMEGP's project cost: what they bring, less the land and the interest before the first
    // sales, which that cost leaves out.
    const own = promoter - cost.land - interestBeforeStart - feeBeforeStart, sc = scheme;
    sc.ownPct = sc.cost > 0 ? (own / sc.cost) * 100 : 0;
    sc.flags.push(PMEGP.notice);
    if (!(x.scheme as PmegpInput).confirmed) sc.flags.push('PMEGP\'s conditions are not yet confirmed: the scheme finances the project only if each holds.');
    if (sc.cost > sc.ceiling) sc.flags.push(`The project cost of Rs. ${inr(sc.cost)} is above PMEGP's Rs. ${inr(sc.ceiling)} for ${(x.scheme as PmegpInput).activity === 'service' ? 'a service' : 'manufacturing'}: the margin money is worked on Rs. ${inr(sc.ceiling)}, and the bank may lend the rest without it.`);
    if (sc.ownPct < sc.ownMinPct - 1e-9) sc.flags.push(`The promoters bring ${sc.ownPct.toFixed(2)}% of PMEGP's project cost; the scheme asks at least ${sc.ownMinPct}%.`);
    if (sc.workingCapitalPct > sc.workingCapitalMaxPct + 1e-9) sc.flags.push(`Working capital is ${sc.workingCapitalPct.toFixed(2)}% of PMEGP's project cost; the scheme allows at most ${sc.workingCapitalMaxPct}%.`);
  }

  const collateral = isNum(x.collateral) ? { market: x.collateral, rsv: (x.collateral * RATIOS.collateral.rsvPct) / 100, dsv: (x.collateral * RATIOS.collateral.dsvPct) / 100 } : undefined;
  const out: ReportYear[] = [];
  let cash = 0, retained = 0, accumulated = 0, written = 0, prev = { stock: 0, debtors: 0, creditors: 0 };
  let byProductOk = true, headsOk = true;
  rows.forEach((r, k) => {
    const p = plan.profit[k], d = plan.schedule.find((s) => s.fy === r.fy), st = plan.statement.rows[k], lv = level(k);
    // Each product's units sold in the year (a twelfth of its year at full running, at the year's use, for each month of
    // sales) at the year's price; the lines must add up to the year's sales.
    const byProduct = drivers && x.products ? lines.map((l) => {
      const units = (((l.perYear * util[k]) / 100) * months[k]) / 12, price = l.price * grow(k);
      return { name: l.name, units, price, sales: units * price };
    }) : undefined;
    if (byProduct && !money(byProduct.reduce((t, l) => t + l.sales, 0), r.sales)) byProductOk = false;
    // The costs by head (D-UX-112): each side split in the shares typed, so the heads add up to the side's total.
    const heads = { variable: splitOf(x.costHeads?.variable, 'variable', r.variable), fixed: splitOf(x.costHeads?.fixed, 'fixed', r.fixed) };
    const headed = heads.variable.length + heads.fixed.length > 0;
    if ((heads.variable.length && !money(heads.variable.reduce((t, h) => t + h.amount, 0), r.variable)) || (heads.fixed.length && !money(heads.fixed.reduce((t, h) => t + h.amount, 0), r.fixed))) headsOk = false;
    const principal = d?.principal ?? 0, tlLeft = d?.closing ?? 0;
    retained += p.pat; accumulated += r.depreciation; written += r.preliminary;
    const flow: Flow = {
      capital: k ? 0 : promoter, subsidy: k ? 0 : subsidy, unsecured: k ? 0 : unsecured, termLoan: k ? 0 : termLoan,
      pat: p.pat, depreciation: r.depreciation, preliminary: r.preliminary, wcLoan: k ? 0 : limit, creditors: lv.creditors - prev.creditors, sources: 0,
      fixedAssets: k ? 0 : fixedAssets, preliminarySpent: k ? 0 : prelimAll, stock: lv.stock - prev.stock, debtors: lv.debtors - prev.debtors, repaid: principal, uses: 0,
      net: 0, opening: cash, closing: 0,
    };
    flow.sources = flow.capital + flow.subsidy + flow.unsecured + flow.termLoan + flow.pat + flow.depreciation + flow.preliminary + flow.wcLoan + flow.creditors;
    flow.uses = flow.fixedAssets + flow.preliminarySpent + flow.stock + flow.debtors + flow.repaid;
    flow.net = flow.sources - flow.uses;
    cash += flow.net;
    flow.closing = cash;
    const netWorth = promoter + subsidy + retained, netBlock = fixedAssets - accumulated, preliminaryLeft = prelimAll - written;
    const liabilities = netWorth + unsecured + tlLeft + limit + lv.creditors, assets = netBlock + preliminaryLeft + lv.stock + lv.debtors + cash;
    const fixedAll = r.fixed + r.depreciation + r.preliminary + p.interestTL + r.wcInterest + r.guaranteeFee, contribution = r.sales - r.variable;
    const interest = p.interestTL + r.wcInterest + r.guaranteeFee, currentAssets = lv.stock + lv.debtors;
    const security = netBlock + currentAssets, secured = tlLeft + limit;
    out.push({
      fy: r.fy, months: months[k], ...(drivers ? { utilisationPct: util[k] } : {}), ...(byProduct ? { products: byProduct } : {}), sales: r.sales, variable: r.variable, fixed: r.fixed, ...(headed ? { heads } : {}), pbdit: r.pbdit, depreciation: r.depreciation, preliminary: r.preliminary,
      tlInterest: p.interestTL, wcInterest: r.wcInterest, guaranteeFee: r.guaranteeFee, pbt: p.pbt, tax: p.tax, pat: p.pat,
      capital: promoter, subsidy, retained, netWorth, unsecured, termLoan: tlLeft, wcLoan: limit, creditors: lv.creditors, liabilities,
      grossBlock: fixedAssets, accumulated, netBlock, preliminaryLeft, stock: lv.stock, debtors: lv.debtors, cash, assets, flow,
      available: st.available, service: st.service, principal, ...(st.dscr !== undefined ? { dscr: st.dscr } : {}), counted: st.counted, contribution, fixedAll,
      ...(contribution > 0 ? { bepPct: (fixedAll / contribution) * 100, bepSales: (r.sales * fixedAll) / contribution, cashBepPct: ((fixedAll - r.depreciation - r.preliminary) / contribution) * 100 } : {}),
      ...(limit + lv.creditors > 0 ? { currentRatio: (currentAssets + cash) / (limit + lv.creditors) } : {}),
      ...(netWorth > 0 ? { debtEquity: tlLeft / netWorth, tolTnw: (unsecured + tlLeft + limit + lv.creditors) / netWorth } : {}),
      ...(interest > 0 ? { interestCover: (p.pbt + interest) / interest } : {}),
      netMarginPct: r.sales ? (p.pat / r.sales) * 100 : 0,
      ...(tlLeft > 0 ? { facr: netBlock / tlLeft } : {}),
      security, secured, ...(collateral && secured > 0 ? { securityCover: (security + collateral.rsv) / secured } : {}),
      currentAssets, gap: currentAssets - lv.creditors, mpbf: (currentAssets * DATA.workingCapital.mpbfSharePct) / 100 - lv.creditors,
      turnoverNeed: (r.sales * DATA.workingCapital.turnoverNeedPct) / 100, turnoverBank: (r.sales * DATA.workingCapital.turnoverBankPct) / 100,
    });
    prev = lv;
  });

  if (!byProductOk) return blocked('the sales by product');
  if (!headsOk) return blocked('the costs by head');
  const unbalanced = out.find((y) => !money(y.assets, y.liabilities));
  if (unbalanced) return blocked(`the balance sheet for ${unbalanced.fy}`);
  const check = reportCheck({
    cost: { ...cost, preliminary: prelimAll }, promoter, subsidy, unsecured, limit, run: runS, months, variablePct: v, fixed: rows.map((r) => r.fixed), days,
    ...(drivers ? { drivers: { ...(x.products ? { products: x.products.map((p) => ({ unitsMonth: p.unitsMonth as number, price: p.price as number })) } : { capacity: x.capacity as number, price: x.price as number }),
      utilisationPct: util, priceGrowthPct: x.priceGrowthPct as number } } : {}),
    pat: plan.profit.map((p) => p.pat), tlInterest: plan.profit.map((p) => p.interestTL), wcInterest: rows.map((r) => r.wcInterest),
    fee: fys.map((fy) => guarantee?.years.find((y) => y.fy === fy)?.total ?? 0), loan: loan as LoanTerms, fys,
  });
  for (const [k, y] of out.entries()) {
    const c = check[k];
    const off = (['sales', 'depreciation', 'netBlock', 'stock', 'debtors', 'creditors', 'netWorth', 'termLoan', 'cash'] as const).find((f) => !money(y[f], c[f]))
      ?? ((y.bepSales === undefined) !== (c.bepSales === undefined) || (y.bepSales !== undefined && !money(y.bepSales, c.bepSales as number)) ? 'bepSales' : undefined);
    if (off) return blocked(`${off} in ${y.fy}`);
  }
  // Cash below nil: the promoters' money more, brought in at the start, that keeps every year's cash at nil or above. It
  // lifts each year's cash by the same amount and changes no profit, so it is the lowest cash turned positive.
  const low = out.reduce((m, y) => (y.cash < m.cash ? y : m)), lowCheck = Math.min(...check.map((c) => c.cash));
  if (!money(low.cash, lowCheck)) return blocked('the lowest cash');
  return {
    start, ...(scheme ? { scheme } : {}), interestBeforeStart, ...(guarantee ? { guarantee } : {}),
    ...(x.scheme?.id === 'mudra' ? { mudra: { level: mudraLevel(sanctioned + limit) as MudraLevel, total: sanctioned + limit, collateralFreeUpTo: MUDRA.collateralFreeUpTo, apply: MUDRA.apply } } : {}),
    ...(low.cash < -0.005 ? { cashShort: { fy: low.fy, lowest: low.cash, need: -low.cash } } : {}),
    cost: [...HEADS.filter((h) => cost[h.id] > 0).map((h) => ({ id: h.id, label: h.label, amount: cost[h.id] })),
      ...(interestBeforeStart > 0 ? [{ id: 'idc' as const, label: 'Interest on the term loan before sales start', amount: interestBeforeStart }] : []),
      ...(feeBeforeStart > 0 ? [{ id: 'fee' as const, label: 'Guarantee fee before sales start', amount: feeBeforeStart }] : []),
      ...(marginMoney > 0 ? [{ id: 'margin' as const, label: 'Margin for working capital', amount: marginMoney }] : [])],
    fixedAssets, marginMoney, projectCost, ...(collateral ? { collateral } : {}),
    finance: { termLoan, subsidy, unsecured, promoter, total: termLoan + subsidy + unsecured + promoter, promoterPct: (promoter / projectCost) * 100 },
    wcLimit: limit, years: out, ...(plan.statement.average !== undefined ? { average: plan.statement.average } : {}),
    ...(plan.statement.minimum ? { lowest: plan.statement.minimum } : {}), plan,
  };
}
