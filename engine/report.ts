/**
 * A project report for a term loan with working capital: the cost of the project and how it is financed; the projected
 * profit and loss, balance sheet and cash flow, year by year over the term loan's years; the DSCR; break-even; the usual
 * ratios; and the working-capital assessment by the second method of lending and by the turnover method. Pure, no DOM.
 * Profit, tax, the loan's schedule and the DSCR come from dscr.ts (planStatement), worked out twice there; the rest is
 * checked by report-check.ts. Nothing is returned unless both agree and the balance sheet balances.
 */
import DATA from './data/report.json';
import { PRESETS, loanTimeline, planStatement, type Blocked, type Definition, type LoanInput, type Needs, type Plan, type ProjectionYear } from './dscr';
import type { LoanTerms } from './loan';
import { series } from './project';
import { reportCheck } from './report-check';
import { borrowerOf } from './tax';

export const HEADS = DATA.heads;
export const ASSUMPTIONS = DATA.assumptions;
export const METHOD = DATA.method;
export type HeadId = (typeof DATA.heads)[number]['id'];

export interface ReportInput {
  /** Who the borrower is (an id in engine/data/tax.json): it sets the tax. */
  taxBy?: string;
  /** The cost of the project by head, in rupees; a head not given has none. */
  cost: Partial<Record<HeadId, number>>;
  /** The term loan: its amount and terms. */
  loan: LoanInput;
  subsidy?: number;
  unsecured?: number;
  /** Sales in the first year and their growth a year (%). */
  sales?: number; salesGrowthPct?: number;
  /** Materials and other variable costs, as a share of sales (%). */
  variablePct?: number;
  /** Fixed costs in the first year (salaries, rent, overheads) and their growth a year (%). */
  fixedCosts?: number; fixedGrowthPct?: number;
  /** Days of stock, debtors and creditors. */
  days?: { stock?: number; debtors?: number; creditors?: number };
  /** The working-capital limit sought, and its interest rate (%). */
  wcLimit?: number; wcRatePct?: number;
}

export interface CostLine { id: HeadId | 'margin'; label: string; amount: number }
export interface Flow {
  capital: number; subsidy: number; unsecured: number; termLoan: number; pat: number; depreciation: number; preliminary: number; wcLoan: number; creditors: number; sources: number;
  fixedAssets: number; preliminarySpent: number; stock: number; debtors: number; repaid: number; uses: number; net: number; opening: number; closing: number;
}
export interface ReportYear {
  fy: string;
  sales: number; variable: number; fixed: number; pbdit: number; depreciation: number; preliminary: number; tlInterest: number; wcInterest: number; pbt: number; tax: number; pat: number;
  capital: number; subsidy: number; retained: number; netWorth: number; unsecured: number; termLoan: number; wcLoan: number; creditors: number; liabilities: number;
  grossBlock: number; accumulated: number; netBlock: number; preliminaryLeft: number; stock: number; debtors: number; cash: number; assets: number;
  flow: Flow;
  available: number; service: number; principal: number; dscr?: number; counted: boolean;
  /** Sales less variable costs; fixed costs with depreciation, the write-off and all interest: break-even's two sides. */
  contribution: number; fixedAll: number; bepPct?: number; bepSales?: number; cashBepPct?: number;
  currentRatio?: number; debtEquity?: number; tolTnw?: number; interestCover?: number; netMarginPct: number; facr?: number;
  currentAssets: number; gap: number; mpbf: number; turnoverNeed: number; turnoverBank: number;
}
export interface Report {
  cost: CostLine[]; fixedAssets: number; marginMoney: number; projectCost: number;
  finance: { termLoan: number; subsidy: number; unsecured: number; promoter: number; total: number; promoterPct: number };
  wcLimit: number; years: ReportYear[]; average?: number; lowest?: { dscr: number; fy: string }; plan: Plan;
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const money = (a: number, b: number) => Math.abs(a - b) <= Math.max(0.01, 1e-9 * Math.max(Math.abs(a), Math.abs(b)));
const blocked = (where: string): Blocked => ({ blocked: `The two computations disagree on ${where}, so no figures are shown. Please report this.` });
const DSCR_METHOD = (PRESETS.find((p) => p.id === DATA.dscrMethod) as { choice: Definition }).choice;

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
  if (!isNum(x.sales)) needs.push('Sales in the first year');
  if (!isNum(x.salesGrowthPct)) needs.push('Sales: growth a year (%)');
  if (!(isNum(x.variablePct) && x.variablePct >= 0 && x.variablePct < 100)) needs.push('Materials and other variable costs, as a share of sales (%), below 100');
  if (!isNum(x.fixedCosts)) needs.push('Fixed costs in the first year');
  if (!isNum(x.fixedGrowthPct)) needs.push('Fixed costs: growth a year (%)');
  const d = x.days ?? {};
  for (const k of ['stock', 'debtors', 'creditors'] as const) if (!(isNum(d[k]) && (d[k] as number) >= 0 && (d[k] as number) <= 365)) needs.push(`Days of ${k}, 0 to 365`);
  if (!(isNum(x.wcLimit) && x.wcLimit >= 0)) needs.push('The working-capital limit sought (0 if none)');
  if (isNum(x.wcLimit) && x.wcLimit > 0 && !isNum(x.wcRatePct)) needs.push('The working-capital limit: its interest rate');
  return needs;
}

export function projectReport(x: ReportInput): Report | Needs | Blocked {
  const needs = reportNeeds(x);
  if (needs.length) return { needs };
  const when = loanTimeline(x.loan);
  if ('needs' in when) return when;
  const fys = when.years, n = fys.length, first = fys[0];
  const salesS = series({ kind: 'grow', first: x.sales, pct: x.salesGrowthPct }, n, 'Sales', first);
  if (!Array.isArray(salesS)) return salesS;
  const fixedS = series({ kind: 'grow', first: x.fixedCosts, pct: x.fixedGrowthPct }, n, 'Fixed costs', first);
  if (!Array.isArray(fixedS)) return fixedS;
  const v = x.variablePct as number, days = x.days as { stock: number; debtors: number; creditors: number };
  const limit = x.wcLimit as number, wcRate = limit > 0 ? (x.wcRatePct as number) : 0;
  const cost = Object.fromEntries(HEADS.map((h) => [h.id, x.cost[h.id] ?? 0])) as Record<HeadId, number>;
  const prelim = cost.preliminary, years = DATA.preliminaryYears;

  // Profit before interest, depreciation and tax; depreciation on the written-down value, head by head.
  const wdv = new Map(HEADS.filter((h) => h.id !== 'preliminary').map((h) => [h.id, cost[h.id]]));
  const rows = fys.map((fy, k) => {
    const sales = salesS[k], variable = (sales * v) / 100, fixed = fixedS[k];
    let depreciation = 0;
    for (const h of HEADS) {
      if (h.id === 'preliminary') continue;
      const d = ((wdv.get(h.id) as number) * h.depreciationPct) / 100;
      wdv.set(h.id, (wdv.get(h.id) as number) - d);
      depreciation += d;
    }
    return { fy, sales, variable, fixed, pbdit: sales - variable - fixed, depreciation, preliminary: k < years ? prelim / years : 0, wcInterest: (limit * wcRate) / 100 };
  });
  const proj: ProjectionYear[] = rows.map((r) => ({
    fy: r.fy, pbdit: r.pbdit, assetIncome: 0, depreciation: r.depreciation, nonCash: r.preliminary, interestOther: r.wcInterest,
    otherLoansInterest: 0, otherLoansPrincipal: 0, existingEmis: 0, taxBy: x.taxBy,
  }));
  const plan = planStatement(proj, x.loan, DSCR_METHOD);
  if (!('statement' in plan)) return plan;

  // The cost of the project and its finance: the margin for working capital is what the first year's stock and debtors
  // need beyond the creditors and the bank's limit.
  const level = (k: number) => {
    const r = rows[k];
    return { stock: (r.variable * days.stock) / 365, debtors: (r.sales * days.debtors) / 365, creditors: (r.variable * days.creditors) / 365 };
  };
  const l0 = level(0), marginMoney = Math.max(0, l0.stock + l0.debtors - l0.creditors - limit);
  const fixedAssets = HEADS.filter((h) => h.id !== 'preliminary').reduce((t, h) => t + cost[h.id], 0);
  const projectCost = fixedAssets + prelim + marginMoney;
  const subsidy = x.subsidy ?? 0, unsecured = x.unsecured ?? 0, termLoan = x.loan.amount as number, promoter = projectCost - termLoan - subsidy - unsecured;
  if (promoter < 0) return { needs: ['The term loan, subsidy and unsecured loans come to more than the cost of the project'] };

  const out: ReportYear[] = [];
  let cash = 0, retained = 0, accumulated = 0, written = 0, prev = { stock: 0, debtors: 0, creditors: 0 };
  rows.forEach((r, k) => {
    const p = plan.profit[k], d = plan.schedule.find((s) => s.fy === r.fy), st = plan.statement.rows[k], lv = level(k);
    const principal = d?.principal ?? 0, tlLeft = d?.closing ?? 0;
    retained += p.pat; accumulated += r.depreciation; written += r.preliminary;
    const flow: Flow = {
      capital: k ? 0 : promoter, subsidy: k ? 0 : subsidy, unsecured: k ? 0 : unsecured, termLoan: k ? 0 : termLoan,
      pat: p.pat, depreciation: r.depreciation, preliminary: r.preliminary, wcLoan: k ? 0 : limit, creditors: lv.creditors - prev.creditors, sources: 0,
      fixedAssets: k ? 0 : fixedAssets, preliminarySpent: k ? 0 : prelim, stock: lv.stock - prev.stock, debtors: lv.debtors - prev.debtors, repaid: principal, uses: 0,
      net: 0, opening: cash, closing: 0,
    };
    flow.sources = flow.capital + flow.subsidy + flow.unsecured + flow.termLoan + flow.pat + flow.depreciation + flow.preliminary + flow.wcLoan + flow.creditors;
    flow.uses = flow.fixedAssets + flow.preliminarySpent + flow.stock + flow.debtors + flow.repaid;
    flow.net = flow.sources - flow.uses;
    cash += flow.net;
    flow.closing = cash;
    const netWorth = promoter + subsidy + retained, netBlock = fixedAssets - accumulated, preliminaryLeft = prelim - written;
    const liabilities = netWorth + unsecured + tlLeft + limit + lv.creditors, assets = netBlock + preliminaryLeft + lv.stock + lv.debtors + cash;
    const fixedAll = r.fixed + r.depreciation + r.preliminary + p.interestTL + r.wcInterest, contribution = r.sales - r.variable;
    const interest = p.interestTL + r.wcInterest, currentAssets = lv.stock + lv.debtors;
    out.push({
      fy: r.fy, sales: r.sales, variable: r.variable, fixed: r.fixed, pbdit: r.pbdit, depreciation: r.depreciation, preliminary: r.preliminary,
      tlInterest: p.interestTL, wcInterest: r.wcInterest, pbt: p.pbt, tax: p.tax, pat: p.pat,
      capital: promoter, subsidy, retained, netWorth, unsecured, termLoan: tlLeft, wcLoan: limit, creditors: lv.creditors, liabilities,
      grossBlock: fixedAssets, accumulated, netBlock, preliminaryLeft, stock: lv.stock, debtors: lv.debtors, cash, assets, flow,
      available: st.available, service: st.service, principal, ...(st.dscr !== undefined ? { dscr: st.dscr } : {}), counted: st.counted, contribution, fixedAll,
      ...(contribution > 0 ? { bepPct: (fixedAll / contribution) * 100, bepSales: (r.sales * fixedAll) / contribution, cashBepPct: ((fixedAll - r.depreciation - r.preliminary) / contribution) * 100 } : {}),
      ...(limit + lv.creditors > 0 ? { currentRatio: (currentAssets + cash) / (limit + lv.creditors) } : {}),
      ...(netWorth > 0 ? { debtEquity: tlLeft / netWorth, tolTnw: (unsecured + tlLeft + limit + lv.creditors) / netWorth } : {}),
      ...(interest > 0 ? { interestCover: (p.pbt + interest) / interest } : {}),
      netMarginPct: r.sales ? (p.pat / r.sales) * 100 : 0,
      ...(tlLeft > 0 ? { facr: netBlock / tlLeft } : {}),
      currentAssets, gap: currentAssets - lv.creditors, mpbf: (currentAssets * DATA.workingCapital.mpbfSharePct) / 100 - lv.creditors,
      turnoverNeed: (r.sales * DATA.workingCapital.turnoverNeedPct) / 100, turnoverBank: (r.sales * DATA.workingCapital.turnoverBankPct) / 100,
    });
    prev = lv;
  });

  const unbalanced = out.find((y) => !money(y.assets, y.liabilities));
  if (unbalanced) return blocked(`the balance sheet for ${unbalanced.fy}`);
  const check = reportCheck({
    cost, promoter, subsidy, unsecured, limit, sales: salesS, variablePct: v, fixed: fixedS, days,
    pat: plan.profit.map((p) => p.pat), tlInterest: plan.profit.map((p) => p.interestTL), wcInterest: rows.map((r) => r.wcInterest),
    loan: x.loan as LoanTerms, fys,
  });
  for (const [k, y] of out.entries()) {
    const c = check[k];
    const off = (['depreciation', 'netBlock', 'stock', 'debtors', 'creditors', 'netWorth', 'termLoan', 'cash'] as const).find((f) => !money(y[f], c[f]))
      ?? ((y.bepSales === undefined) !== (c.bepSales === undefined) || (y.bepSales !== undefined && !money(y.bepSales, c.bepSales as number)) ? 'bepSales' : undefined);
    if (off) return blocked(`${off} in ${y.fy}`);
  }
  return {
    cost: [...HEADS.filter((h) => cost[h.id] > 0).map((h) => ({ id: h.id, label: h.label, amount: cost[h.id] })),
      ...(marginMoney > 0 ? [{ id: 'margin' as const, label: 'Margin for working capital', amount: marginMoney }] : [])],
    fixedAssets, marginMoney, projectCost,
    finance: { termLoan, subsidy, unsecured, promoter, total: termLoan + subsidy + unsecured + promoter, promoterPct: (promoter / projectCost) * 100 },
    wcLimit: limit, years: out, ...(plan.statement.average !== undefined ? { average: plan.statement.average } : {}),
    ...(plan.statement.minimum ? { lowest: plan.statement.minimum } : {}), plan,
  };
}
