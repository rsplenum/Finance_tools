/**
 * The project report engine (engine/report.ts) on fictional case R, worked by hand below (D-BIZ-02: invented figures).
 * A firm: building 10 lakh, plant 20 lakh, furniture 2 lakh, preliminary expenses 1 lakh; a term loan of 25 lakh at 10%
 * drawn in April 2026, 60 monthly instalments of equal principal from the end of April; sales of 1.2 crore growing 10%;
 * variable costs 65% of sales; fixed costs 18 lakh growing 5%; 30 days of stock, debtors and creditors; a cash credit of
 * 5 lakh at 11%.
 */
import { describe, it, expect } from 'vitest';
import { projectReport, reportNeeds, type Report, type ReportInput } from '../engine/report';
import type { Needs } from '../engine/dscr';

export const CASE_R: ReportInput = {
  taxBy: 'firm', cost: { building: 1000000, machinery: 2000000, furniture: 200000, preliminary: 100000 },
  loan: { amount: 2500000, ratePct: 10, disbursed: '2026-04', moratoriumMonths: 0, instalments: 60, frequency: 'monthly', style: 'equal-principal' },
  sales: 12000000, salesGrowthPct: 10, variablePct: 65, fixedCosts: 1800000, fixedGrowthPct: 5,
  days: { stock: 30, debtors: 30, creditors: 30 }, wcLimit: 500000, wcRatePct: 11,
};
const r = projectReport(CASE_R) as Report, y1 = r.years[0];
const rs = (x: number) => Math.round(x);

describe('fictional case R, year 1 (2026-27) by hand', () => {
  it('runs over the loan\'s years, 2026-27 to 2030-31', () => {
    expect(r.years.map((y) => y.fy)).toEqual(['2026-27', '2027-28', '2028-29', '2029-30', '2030-31']);
  });
  // Sales 1,20,00,000; variable 78,00,000; fixed 18,00,000; PBDIT 24,00,000. Depreciation 1,00,000 + 3,00,000 + 20,000 =
  // 4,20,000; preliminary written off 20,000. Term-loan interest: 10% ÷ 12 on the balances 25,00,000, 24,58,333.33, …:
  // (12 × 25,00,000 − 41,666.67 × 66) × 10/1200 = 2,27,083.33. Working-capital interest 5,00,000 × 11% = 55,000.
  // Profit before tax 16,77,916.67; tax at 31.2% 5,23,510; profit after tax 11,54,406.67.
  it('the profit and loss', () => {
    expect([y1.sales, y1.variable, y1.fixed, y1.pbdit, y1.depreciation, y1.preliminary, y1.wcInterest].map(rs)).toEqual([12000000, 7800000, 1800000, 2400000, 420000, 20000, 55000]);
    expect([y1.tlInterest, y1.pbt, y1.tax, y1.pat].map((x) => x.toFixed(2))).toEqual(['227083.33', '1677916.67', '523510.00', '1154406.67']);
  });
  // Stock and creditors 78,00,000 × 30/365 = 6,41,095.89; debtors 1,20,00,000 × 30/365 = 9,86,301.37. The margin for
  // working capital 9,86,301.37 − 5,00,000 = 4,86,301.37; the project 32,00,000 + 1,00,000 + 4,86,301.37 = 37,86,301.37;
  // the promoters 37,86,301.37 − 25,00,000 = 12,86,301.37, 33.97%.
  it('the cost of the project and how it is financed', () => {
    expect([r.fixedAssets, r.marginMoney, r.projectCost].map((x) => x.toFixed(2))).toEqual(['3200000.00', '486301.37', '3786301.37']);
    expect([r.finance.promoter.toFixed(2), r.finance.promoterPct.toFixed(2), r.finance.total.toFixed(2)]).toEqual(['1286301.37', '33.97', '3786301.37']);
    expect(r.cost.map((c) => c.label)).toEqual(['Building and civil works', 'Plant and machinery', 'Furniture and fixtures', 'Preliminary and pre-operative expenses', 'Margin for working capital']);
  });
  // Sources 12,86,301.37 + 25,00,000 + 11,54,406.67 + 4,20,000 + 20,000 + 5,00,000 + 6,41,095.89 = 65,21,803.93; uses
  // 32,00,000 + 1,00,000 + 6,41,095.89 + 9,86,301.37 + 5,00,000 = 54,27,397.26; cash 10,94,406.67.
  it('the cash flow', () => {
    expect([y1.flow.sources, y1.flow.uses, y1.cash].map((x) => x.toFixed(2))).toEqual(['6521803.93', '5427397.26', '1094406.67']);
  });
  // Net worth 12,86,301.37 + 11,54,406.67 = 24,40,708.04; with the term loan's 20,00,000, the limit's 5,00,000 and the
  // creditors, 55,81,803.93. Assets: 27,80,000 + 80,000 + 6,41,095.89 + 9,86,301.37 + 10,94,406.67 = 55,81,803.93.
  it('the balance sheet balances', () => {
    expect([y1.netWorth, y1.termLoan, y1.netBlock, y1.preliminaryLeft, y1.liabilities, y1.assets].map((x) => x.toFixed(2)))
      .toEqual(['2440708.04', '2000000.00', '2780000.00', '80000.00', '5581803.93', '5581803.93']);
    for (const y of r.years) expect(Math.abs(y.assets - y.liabilities)).toBeLessThan(0.01);
  });
  // DSCR: (11,54,406.67 + 4,20,000 + 20,000 + 2,27,083.33) ÷ (5,00,000 + 2,27,083.33) = 18,21,490 ÷ 7,27,083.33 = 2.5052.
  // Break-even: (18,00,000 + 4,20,000 + 20,000 + 2,27,083.33 + 55,000) ÷ 42,00,000 = 60.05%; cash 20,82,083.33 ÷ 42,00,000
  // = 49.57%. Current ratio (16,27,397.26 + 10,94,406.67) ÷ (5,00,000 + 6,41,095.89) = 2.39. MPBF, rounded once from the
  // exact figures: 0.75 × 16,27,397.260274 − 6,41,095.890411 = 5,79,452.0548; by turnover 25% and 20% of sales, 30,00,000
  // and 24,00,000.
  it('the DSCR, break-even, ratios and the working-capital assessment', () => {
    expect([y1.available.toFixed(2), y1.service.toFixed(2), y1.dscr?.toFixed(4)]).toEqual(['1821490.00', '727083.33', '2.5052']);
    expect([y1.bepPct?.toFixed(2), y1.cashBepPct?.toFixed(2), y1.currentRatio?.toFixed(2)]).toEqual(['60.05', '49.57', '2.39']);
    expect([y1.mpbf.toFixed(2), y1.turnoverNeed, y1.turnoverBank]).toEqual(['579452.05', 3000000, 2400000]);
  });
});

describe('the later years hold together', () => {
  it('sales grow 10%, the loan is repaid by 2030-31, and the preliminary expenses are written off in five years', () => {
    expect(r.years.map((y) => rs(y.sales))).toEqual([12000000, 13200000, 14520000, 15972000, 17569200]);
    expect(r.years.at(-1)?.termLoan).toBeCloseTo(0, 6);
    expect(r.years.at(-1)?.preliminaryLeft).toBeCloseTo(0, 6);
    expect(r.average).toBeGreaterThan(r.lowest?.dscr as number);
  });
});

describe('a missing fact is never assumed', () => {
  it('names what is needed', () => {
    expect(reportNeeds({ cost: {}, loan: {} })).toEqual([
      'Who the borrower is: it sets the tax', 'Cost of the project: at least one fixed asset other than land', 'The term loan: its amount',
      'The term loan: its interest rate', 'The term loan: the month it is first drawn', 'The term loan: the moratorium in months (0 if none)',
      'The term loan: the number of instalments', 'The term loan: how it is repaid', 'Sales in the first year', 'Sales: growth a year (%)',
      'Materials and other variable costs, as a share of sales (%), below 100', 'Fixed costs in the first year', 'Fixed costs: growth a year (%)',
      'Days of stock, 0 to 365', 'Days of debtors, 0 to 365', 'Days of creditors, 0 to 365', 'The working-capital limit sought (0 if none)',
    ]);
  });
  it('says so when the loans come to more than the project', () => {
    expect((projectReport({ ...CASE_R, loan: { ...CASE_R.loan, amount: 4000000 } }) as Needs).needs).toEqual(['The term loan, subsidy and unsecured loans come to more than the cost of the project']);
  });
});
