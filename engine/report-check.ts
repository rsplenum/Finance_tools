/**
 * Independent second computation of the project report's figures (CLAUDE.md), written apart from report.ts on purpose:
 * depreciation and the net block in closed form ((1 − rate)^years), stock, debtors and creditors from sales by another
 * order, the term loan's balance from dscr-check.ts's closed form, the net worth from the profits summed afresh, cash as
 * the figure that balances the balance sheet (report.ts takes it from the cash flow), and break-even sales from the
 * contribution ratio; the guarantee fee bill by bill (guarantee.ts works it a month at a time). report.ts shows no figure
 * unless both agree.
 */
import DATA from './data/report.json';
import type { LoanTerms } from './loan';
import { monthsCheck, scheduleCheck } from './dscr-check';

export interface ReportCheckIn {
  cost: Record<string, number>; promoter: number; subsidy: number; unsecured: number; limit: number;
  /** A full year's sales at each year's rate (typed), or the drivers to work it out afresh; the months of sales a year. */
  run: number[]; months: number[];
  drivers?: { capacity?: number; price?: number; products?: { unitsMonth: number; price: number }[]; utilisationPct: number[]; priceGrowthPct: number };
  variablePct: number; fixed: number[]; days: { stock: number; debtors: number; creditors: number };
  pat: number[]; tlInterest: number[]; wcInterest: number[];
  /** The guarantee fee a year, a finance cost (none without a guarantee). */
  fee?: number[]; loan: LoanTerms; fys: string[];
}
export interface ReportCheckYear { sales: number; depreciation: number; netBlock: number; stock: number; debtors: number; creditors: number; netWorth: number; termLoan: number; cash: number; bepSales?: number }

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
    // By the drivers: each product's units a year at the year's use, times its price that year, summed; else as typed.
    const d = x.drivers, priced = (units: number, price: number) => units * (d as NonNullable<typeof d>).utilisationPct[k] / 100 * price * (1 + (d as NonNullable<typeof d>).priceGrowthPct / 100) ** k;
    const run = !d ? x.run[k] : d.products ? d.products.reduce((t, p) => t + priced(p.unitsMonth * 12, p.price), 0) : priced(d.capacity as number, d.price as number);
    const sales = (run * x.months[k]) / 12, runVariable = run * (x.variablePct / 100);
    const stock = (x.days.stock / 365) * runVariable, debtors = (x.days.debtors / 365) * run, creditors = (x.days.creditors / 365) * runVariable;
    const netWorth = x.promoter + x.subsidy + profits, termLoan = debt.get(fy) ?? 0, left = prelim * Math.max(0, 1 - (k + 1) / n);
    const cash = netWorth + x.unsecured + termLoan + x.limit + creditors - netBlock - left - stock - debtors;
    const fixedAll = x.fixed[k] + depreciation + (k < n ? prelim / n : 0) + x.tlInterest[k] + x.wcInterest[k] + (x.fee?.[k] ?? 0), ratio = 1 - x.variablePct / 100;
    return { sales, depreciation, netBlock, stock, debtors, creditors, netWorth, termLoan, cash, ...(ratio > 0 ? { bepSales: fixedAll / ratio } : {}) };
  });
}

/** PMEGP's margin money by another route: the rate on the lower of the project cost and the ceiling. */
export const pmegpCheck = (projectCost: number, ratePct: number, ceiling: number) => Math.min(projectCost * ratePct, ceiling * ratePct) / 100;

export interface FeeCheckIn {
  id: 'cgfmu' | 'cgtmse'; ratePct: number; loan: LoanTerms; guaranteed: number; held: number; heldMonths: number; limit: number; start: string; fys: string[];
}
/** The guarantee fee by another route: each bill as the scheme raises it, on the closed-form balances (dscr-check.ts),
 * shared among the years by its months (pro rata, the owner's choice of 21-10-2026). Months are counted from the first
 * draw, 0 being its month. CGFMU: the base year's bill on the amount sanctioned to 31 March, then a year's on what is
 * outstanding each 1 April. CGTMSE: a first bill of a year on the amount guaranteed; then a bill for each year (the part
 * from the first anniversary, the full years, the last to the final instalment) on what was outstanding the 31 December
 * before it (PMEGP's margin money in it while held), or the amount guaranteed if none was drawn by then. The limit: its
 * whole amount for the months of each year from the first sales. */
export function guaranteeFeeCheck(x: FeeCheckIn): { fy: string; termLoan: number; workingCapital: number }[] {
  const rows = monthsCheck(x.loan), live = rows.length, r = x.ratePct / 100, [y0, m0] = x.loan.disbursed.split('-').map(Number);
  const yearOf = (k: number) => { const y = y0 + Math.floor((m0 - 1 + k) / 12), m = ((m0 - 1 + k) % 12) + 1, s = m >= 4 ? y : y - 1; return `${s}-${String((s + 1) % 100).padStart(2, '0')}`; };
  const since = (y: number, m: number) => (y - y0) * 12 + (m - m0);
  const tl = new Map<string, number>(), bill = (fy: string, a: number) => tl.set(fy, (tl.get(fy) ?? 0) + a);
  if (x.id === 'cgfmu') {
    const toMarch = m0 >= 4 ? 16 - m0 : 4 - m0;
    bill(yearOf(0), (r * x.guaranteed * toMarch) / 12);
    for (let k = toMarch; k < live; k += 12) bill(yearOf(k), r * rows[k].opening);
  } else {
    for (let k = 0; k < Math.min(12, live); k++) bill(yearOf(k), (r * x.guaranteed) / 12);
    for (let k = 12; k < live;) {
      const fy = yearOf(k), y = Number(fy.slice(0, 4)), dec = since(y - 1, 12), end = Math.min(live, since(y + 1, 4));
      const base = dec < 0 ? x.guaranteed : rows[dec].closing + (dec < x.heldMonths ? x.held : 0);
      bill(fy, (r * base * (end - k)) / 12);
      k = end;
    }
  }
  const [sy, sm] = x.start.split('-').map(Number);
  return x.fys.map((fy) => {
    const from = (sy - Number(fy.slice(0, 4))) * 12 + (sm - 4);
    return { fy, termLoan: tl.get(fy) ?? 0, workingCapital: (r * x.limit * Math.min(12, Math.max(0, 12 - from))) / 12 };
  });
}

/** The working-capital limit worked out (D-UX-112), rearranged apart from report.ts's: the bank's share of the debtors on
 * sales, plus that share of the stock less the creditors on the variable costs, over the year's days. */
export function workedLimitCheck(run: number, variablePct: number, days: { stock: number; debtors: number; creditors: number }): number {
  const share = DATA.workingCapital.mpbfSharePct / 100, onVariable = (run * variablePct) / 100;
  const need = (share * days.debtors * run + (share * days.stock - days.creditors) * onVariable) / 365;
  return Math.min(need > 0 ? need : 0, (DATA.workingCapital.turnoverBankPct * run) / 100);
}
