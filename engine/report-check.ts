/**
 * Independent second computation of the project report's figures (CLAUDE.md), written apart from report.ts on purpose:
 * depreciation and the net block in closed form ((1 − rate)^years), stock, debtors and creditors from sales by another
 * order, the term loan's balance from dscr-check.ts's closed form, the net worth from the profits summed afresh, cash as
 * the figure that balances the balance sheet (report.ts takes it from the cash flow), and break-even sales from the
 * contribution ratio. report.ts shows no figure unless both agree.
 */
import DATA from './data/report.json';
import type { LoanTerms } from './loan';
import { scheduleCheck } from './dscr-check';

export interface ReportCheckIn {
  cost: Record<string, number>; promoter: number; subsidy: number; unsecured: number; limit: number;
  sales: number[]; variablePct: number; fixed: number[]; days: { stock: number; debtors: number; creditors: number };
  pat: number[]; tlInterest: number[]; wcInterest: number[]; loan: LoanTerms; fys: string[];
}
export interface ReportCheckYear { depreciation: number; netBlock: number; stock: number; debtors: number; creditors: number; netWorth: number; termLoan: number; cash: number; bepSales?: number }

export function reportCheck(x: ReportCheckIn): ReportCheckYear[] {
  const debt = new Map(scheduleCheck(x.loan).map((d) => [d.fy, d.closing]));
  const n = DATA.preliminaryYears, prelim = x.cost.preliminary ?? 0;
  let profits = 0;
  return x.fys.map((fy, k) => {
    profits += x.pat[k];
    let depreciation = 0, netBlock = 0;
    for (const h of DATA.heads) {
      if (h.id === 'preliminary') continue;
      const c = x.cost[h.id] ?? 0, r = h.depreciationPct / 100;
      depreciation += c * r * Math.pow(1 - r, k);
      netBlock += c * Math.pow(1 - r, k + 1);
    }
    const variable = (x.sales[k] * x.variablePct) / 100;
    const stock = (x.days.stock / 365) * variable, debtors = (x.days.debtors / 365) * x.sales[k], creditors = (x.days.creditors / 365) * variable;
    const netWorth = x.promoter + x.subsidy + profits, termLoan = debt.get(fy) ?? 0, left = prelim * Math.max(0, 1 - (k + 1) / n);
    const cash = netWorth + x.unsecured + termLoan + x.limit + creditors - netBlock - left - stock - debtors;
    const fixedAll = x.fixed[k] + depreciation + (k < n ? prelim / n : 0) + x.tlInterest[k] + x.wcInterest[k], ratio = 1 - x.variablePct / 100;
    return { depreciation, netBlock, stock, debtors, creditors, netWorth, termLoan, cash, ...(ratio > 0 ? { bepSales: fixedAll / ratio } : {}) };
  });
}
