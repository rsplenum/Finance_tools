/**
 * Independent second computation of the lenders' tests (lender.ts). By other routes: the stressed profit as sales less
 * costs (price: sales at the lower price less the costs as they were; costs: sales less the higher costs) and each DSCR
 * from dscr-check.ts's planCheck; promoters' loans as their own line of debt service; the cash check's total by a
 * telescoping sum (the working capital's growth over all years is the % of last sales less the sales before), and each
 * year's with the two years' sales taken apart (the plan's cash and service are already checked by dscr-check.ts); the audited year's profit after tax from its cash accrual.
 */
import type { Definition, Plan, ProjectionYear } from './dscr';
import { planCheck, type CheckResult } from './dscr-check';
import type { LenderYear, StressId } from './lender';
import type { LoanTerms } from './loan';

export function stressCheck(proj: ProjectionYear[], loan: LoanTerms, def: Definition, sales: Map<string, number>, id: StressId, pct: number): CheckResult {
  const f = 1 + (id === 'price' ? -pct : pct) / 100;
  return planCheck(proj.map((p) => {
    const s = sales.get(p.fy) as number, costs = s - (p.pbdit as number);
    return { ...p, pbdit: id === 'price' ? s * f - costs : s - costs * f };
  }), loan, def);
}

export function promotersCheck(proj: ProjectionYear[], loan: LoanTerms, def: Definition, repaid: Map<string, number>): CheckResult {
  const base = planCheck(proj, loan, def);
  // Promoters' repayment is principal paid in full: it adds to the debt service and makes the year one with instalments.
  const rows = base.rows.map((r) => {
    const extra = repaid.get(r.fy) ?? 0, service = r.service + extra;
    const counted = def.years === 'repayment' ? r.counted || extra > 0 : service > 0;
    return { ...r, service, counted, dscr: service > 0 ? r.available / service : undefined };
  });
  const used = rows.filter((r) => r.counted);
  if (!used.length) return { rows };
  const sum = (k: 'available' | 'service') => used.reduce((t, r) => t + r[k], 0);
  const average = def.average === 'totals' ? sum('available') / sum('service') : used.reduce((t, r) => t + (r.dscr as number), 0) / used.length;
  const minimum = Math.min(...used.map((r) => r.dscr as number));
  return { rows, average, minimum: { dscr: minimum, fy: (used.find((r) => r.dscr === minimum) as { fy: string }).fy } };
}

export function cashCheckTotal(p: Plan, extra: LenderYear[], wcPct: number, salesBefore: number): { left: number; rows: number[] } {
  const by = new Map(extra.map((e) => [e.fy, e]));
  const fys = p.statement.rows.map((r) => r.fy);
  const sales = fys.map((fy) => by.get(fy)?.sales as number), capex = fys.map((fy) => by.get(fy)?.capex as number);
  // The cash and debt service from the plan's yearly figures, by the statement's own definition: cash less service.
  const net = p.statement.rows.map((r) => r.available - r.service);
  const left = net.reduce((a, b) => a + b, 0) - (sales[sales.length - 1] * wcPct - salesBefore * wcPct) / 100 - capex.reduce((a, b) => a + b, 0);
  const rows = net.map((n, i) => n - (sales[i] * wcPct) / 100 + ((i ? sales[i - 1] : salesBefore) * wcPct) / 100 - capex[i]);
  return { left, rows };
}

export function auditedCheck(a: { pbdit: number; depreciation: number; interest: number; tax: number }): { pat: number; accrual: number } {
  const accrual = a.pbdit - a.interest - a.tax;
  return { accrual, pat: accrual - a.depreciation };
}
