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
}

const sum = (f: F, heads: string[]) => heads.reduce((a, h) => a + f[h], 0);
const over = (a: number, b: number) => (b > 0 ? a / b : undefined);

export function cmaCheck(years: F[], quasi: boolean, daysInYear: number, needPct: number, marginPct: number): CmaCheckYear[] {
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
    return {
      pbt, netProfit, pbdit, currentLiabilities, termLiabilities, netWorth, outside, currentAssets, assets, nwc,
      currentRatio: over(currentAssets, currentLiabilities), tolTnw: over(outside, netWorth), debtEquity: over(termLiabilities, netWorth),
      interestCover: over(pbdit, interest), netMarginPct: f.sales > 0 ? (100 * netProfit) / f.sales : undefined,
      stockDays: cos > 0 ? (f.stock * daysInYear) / cos : undefined, debtorDays: f.sales > 0 ? (f.debtors * daysInYear) / f.sales : undefined,
      creditorDays: f.materials > 0 ? (f.creditors * daysInYear) / f.materials : undefined,
      growthPct: before && before.sales > 0 ? (100 * (f.sales - before.sales)) / before.sales : undefined,
      limit: Math.max(0, need - Math.max(margin, nwc)), bankChange: before ? f.bankWc - before.bankWc : 0,
    };
  });
}
