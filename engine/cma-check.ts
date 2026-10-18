/**
 * Independent second computation of the CMA figures (CLAUDE.md), written apart from cma.ts on purpose: the totals as
 * signed sums over its own lists of heads, current liabilities as what is left of the liabilities once the owners' funds
 * and the term liabilities are taken out, net working capital as long-term funds less long-term uses (cma.ts takes current
 * assets less current liabilities: the two agree only when the balance sheet balances), the limit in closed form
 * (the need less the larger of the margin and the net working capital), and the change in bank borrowing straight from
 * the balance sheets, which the funds flow in cma.ts must close to. cma.ts shows no figure unless both agree.
 */
type F = Record<string, number>;

const INCOME = ['sales', 'otherIncome'];
const COSTS = ['materials', 'otherDirect', 'employees', 'sga', 'depreciation', 'wcInterest', 'tlInterest'];
const LIABILITIES = ['capital', 'reserves', 'promoterLoans', 'termLoans', 'bankWc', 'creditors', 'otherCl'];
const ASSETS = ['netBlock', 'nonCurrent', 'stock', 'debtors', 'cash', 'otherCa'];

export interface CmaCheckYear {
  pbt: number; netProfit: number; pbdit: number; currentLiabilities: number; termLiabilities: number; netWorth: number; outside: number;
  currentAssets: number; assets: number; nwc: number; currentRatio?: number; tolTnw?: number; debtEquity?: number; interestCover?: number;
  netMarginPct?: number; stockDays?: number; debtorDays?: number; creditorDays?: number; growthPct?: number; limit: number; bankChange: number;
  available: number; dscr?: number; facr?: number; security: number; secured: number; securityCover?: number;
}

const sum = (f: F, heads: string[]) => heads.reduce((a, h) => a + f[h], 0);
const over = (a: number, b: number) => (b > 0 ? a / b : undefined);

/** `rsv`: the collateral's realisable sale value. The lender's ratios (MV4) by other routes: the cash for the loan from this
 * file's own net profit; what is secured as the outside liabilities less the creditors, the other current liabilities and
 * the promoters' loans left in them; the security as the assets less those that are not (non-current, cash, other). */
export function cmaCheck(years: F[], quasi: boolean, daysInYear: number, needPct: number, marginPct: number, rsv = 0): CmaCheckYear[] {
  return years.map((f, k) => {
    const pbt = sum(f, INCOME) - sum(f, COSTS), netProfit = pbt - f.tax;
    const pbdit = f.sales - f.materials - f.otherDirect - f.employees - f.sga, interest = f.wcInterest + f.tlInterest;
    const promoterIn = quasi ? f.promoterLoans : 0;
    const netWorth = f.capital + f.reserves + promoterIn, termLiabilities = f.termLoans - f.tlDue12 + f.promoterLoans - promoterIn;
    const all = sum(f, LIABILITIES), assets = sum(f, ASSETS);
    const currentLiabilities = all - netWorth - termLiabilities, outside = all - netWorth, currentAssets = assets - f.netBlock - f.nonCurrent;
    const nwc = netWorth + termLiabilities - f.netBlock - f.nonCurrent;
    const cos = f.materials + f.otherDirect + f.depreciation, before = years[k - 1];
    const need = (f.sales * needPct) / 100, margin = (f.sales * marginPct) / 100;
    const available = netProfit + f.depreciation + f.tlInterest, secured = outside - f.creditors - f.otherCl - (f.promoterLoans - promoterIn);
    const security = assets - f.nonCurrent - f.cash - f.otherCa + rsv;
    return {
      pbt, netProfit, pbdit, currentLiabilities, termLiabilities, netWorth, outside, currentAssets, assets, nwc,
      currentRatio: over(currentAssets, currentLiabilities), tolTnw: over(outside, netWorth), debtEquity: over(termLiabilities, netWorth),
      interestCover: over(pbdit, interest), netMarginPct: f.sales > 0 ? (100 * netProfit) / f.sales : undefined,
      stockDays: cos > 0 ? (f.stock * daysInYear) / cos : undefined, debtorDays: f.sales > 0 ? (f.debtors * daysInYear) / f.sales : undefined,
      creditorDays: f.materials > 0 ? (f.creditors * daysInYear) / f.materials : undefined,
      growthPct: before && before.sales > 0 ? (100 * (f.sales - before.sales)) / before.sales : undefined,
      limit: Math.max(0, need - Math.max(margin, nwc)), bankChange: before ? f.bankWc - before.bankWc : 0,
      available, dscr: before ? over(available, f.tlInterest + before.tlDue12) : undefined, facr: over(f.netBlock, secured - f.bankWc),
      security, secured, securityCover: over(security, secured),
    };
  });
}

/** A year's subtotals as it is typed (UX9), by this file's own lists: gross profit as net sales less its three costs,
 * net profit as the signed sums less tax, and each side of the balance sheet as the sum of its heads. A subtotal is left
 * out until every figure it takes is there. */
export function subtotalsCheck(f: Partial<F>): { grossProfit?: number; netProfit?: number; assets?: number; liabilities?: number } {
  const has = (heads: string[]) => heads.every((h) => typeof f[h] === 'number' && Number.isFinite(f[h]));
  const g = f as F, CAST = ['materials', 'otherDirect', 'depreciation'];
  return {
    ...(has(['sales', ...CAST]) ? { grossProfit: g.sales - sum(g, CAST) } : {}),
    ...(has([...INCOME, ...COSTS, 'tax']) ? { netProfit: sum(g, INCOME) - sum(g, COSTS) - g.tax } : {}),
    ...(has([...LIABILITIES, ...ASSETS, 'tlDue12']) ? { assets: sum(g, ASSETS), liabilities: sum(g, LIABILITIES) } : {}),
  };
}
