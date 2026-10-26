/**
 * The project report engine (engine/report.ts) on fictional case R, worked by hand below (D-BIZ-02: invented figures).
 * A firm: building 10 lakh, plant 20 lakh, furniture 2 lakh, preliminary expenses 1 lakh; a term loan of 25 lakh at 10%
 * drawn in April 2026, 60 monthly instalments of equal principal from the end of April; sales of 1.2 crore growing 10%;
 * variable costs 65% of sales; fixed costs 18 lakh growing 5%; 30 days of stock, debtors and creditors; a cash credit of
 * 5 lakh at 11%.
 */
import { describe, it, expect } from 'vitest';
import { PMEGP, projectReport, reportNeeds, workedLimit, type Report, type ReportInput } from '../engine/report';
import type { Needs } from '../engine/dscr';

export const CASE_R: ReportInput = {
  taxBy: 'firm', cost: { building: 1000000, machinery: 2000000, furniture: 200000, preliminary: 100000 },
  loan: { amount: 2500000, ratePct: 10, disbursed: '2026-04', moratoriumMonths: 0, instalments: 60, frequency: 'monthly', style: 'equal-principal' },
  salesBy: 'typed', sales: 12000000, salesGrowthPct: 10, monthsToStart: 0, variablePct: 65, fixedCosts: 1800000, fixedGrowthPct: 5,
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
      'The term loan: the number of instalments', 'The term loan: how it is repaid', 'Capacity: the units the business can make or serve in a year',
      'Price a unit', 'Use of the capacity by year (%), each 0 to 100', 'The price: growth a year (%)', 'Months from the loan to the first sales (0 if at once)',
      'Materials and other variable costs, as a share of sales (%), below 100', 'Fixed costs in a full first year', 'Fixed costs: growth a year (%)',
      'Days of stock, 0 to 365', 'Days of debtors, 0 to 365', 'Days of creditors, 0 to 365', 'The working-capital limit you will ask for (0 if none)',
    ]);
  });
  it('says so when the loans come to more than the project', () => {
    expect((projectReport({ ...CASE_R, loan: { ...CASE_R.loan, amount: 4000000 } }) as Needs).needs).toEqual(['The term loan, subsidy and unsecured loans come to more than the cost of the project']);
  });
});

/**
 * Fictional cases P and Q (D-UX-49: sales from the drivers, the months to the first sales, PMEGP), worked apart from the
 * engine by a short script from first principles (the scheme's rules as engine/data/report.json reads them):
 * P, a firm making 50,000 units a year at Rs. 200, used 60%, 70%, then 80%; land 2 lakh, building 6 lakh, plant 20 lakh,
 * preliminary 50,000; a loan of 24 lakh sanctioned at 10%, drawn October 2026, 6 months' moratorium, 48 monthly
 * instalments of equal principal; sales from January 2027 (3 months on); variable costs 70%; fixed costs 12 lakh a full
 * year, growing 5%; a cash credit of 3 lakh at 11%; PMEGP, general category, a village, manufacturing.
 */
const CASE_P: ReportInput = {
  taxBy: 'firm', cost: { land: 200000, building: 600000, machinery: 2000000, preliminary: 50000 },
  loan: { amount: 2400000, ratePct: 10, disbursed: '2026-10', moratoriumMonths: 6, instalments: 48, frequency: 'monthly', style: 'equal-principal' },
  capacity: 50000, price: 200, utilisationPct: [60, 70, 80], priceGrowthPct: 0, monthsToStart: 3, variablePct: 70, fixedCosts: 1200000, fixedGrowthPct: 5,
  days: { stock: 30, debtors: 30, creditors: 30 }, wcLimit: 300000, wcRatePct: 11, scheme: { id: 'pmegp', category: 'general', area: 'rural', activity: 'manufacturing', confirmed: true },
};
const two = (xs: (number | undefined)[]) => xs.map((x) => x?.toFixed(2));

describe('fictional case P: drivers, three months of sales in the first year, PMEGP', () => {
  const p = projectReport(CASE_P) as Report, sc = p.scheme;
  // A full year at 60%: 60,00,000; variable 42,00,000; stock and creditors 3,45,205.48, debtors 4,93,150.68; the margin
  // 4,93,150.68 − 3,00,000 = 1,93,150.68. PMEGP's cost: 26,00,000 + 50,000 + 1,93,150.68 + 3,00,000 = 31,43,150.68; the
  // margin money 25% of it, 7,85,787.67; the loan repaid 24,00,000 − 7,85,787.67 = 16,14,212.33. The project
  // 30,43,150.68; the promoters 30,43,150.68 − 24,00,000 = 6,43,150.68, their own share (less the land) 14.10%;
  // working capital 15.69% of PMEGP's cost.
  it('the margin money and the loan it is set off against', () => {
    expect(p.years.map((y) => y.fy)).toEqual(['2026-27', '2027-28', '2028-29', '2029-30', '2030-31']);
    expect(two([p.marginMoney, sc?.cost, sc?.subsidy, p.finance.termLoan, p.projectCost, p.finance.promoter, sc?.ownPct, sc?.workingCapitalPct]))
      .toEqual(['193150.68', '3143150.68', '785787.67', '1614212.33', '3043150.68', '643150.68', '14.10', '15.69']);
    expect([sc?.ratePct, sc?.flags, p.interestBeforeStart, p.cashShort]).toEqual([25, [PMEGP.notice], 0, undefined]);
  });
  // 2026-27, three months: sales 15,00,000, fixed 3,00,000, depreciation 3,60,000 (a full year), write-off 10,000; term
  // loan interest 16,14,212.33 × 10/1200 × 6 = 80,710.62; cash credit 33,000 × 3/12 = 8,250; a loss of 3,08,960.62, no
  // tax; cash 61,039.38. 2027-28: sales 70,00,000, fixed 12,60,000, interest 1,42,925.05, tax 1,07,663.38, profit after
  // tax 2,37,411.57, cash 1,31,706.09, DSCR 1.2797.
  it('the years, by the months of sales', () => {
    expect(p.years.map((y) => y.months)).toEqual([3, 12, 12, 12, 12]);
    expect(p.years.map((y) => y.utilisationPct)).toEqual([60, 70, 80, 80, 80]);
    const [a, b] = p.years;
    expect(two([a.sales, a.fixed, a.depreciation, a.preliminary, a.tlInterest, a.wcInterest, a.pbt, a.tax, a.cash]))
      .toEqual(['1500000.00', '300000.00', '360000.00', '10000.00', '80710.62', '8250.00', '-308960.62', '0.00', '61039.38']);
    expect(two([b.sales, b.fixed, b.tlInterest, b.tax, b.pat, b.cash])).toEqual(['7000000.00', '1260000.00', '142925.05', '107663.38', '237411.57', '131706.09']);
    expect(p.years.map((y) => y.dscr?.toFixed(4))).toEqual(['1.7563', '1.2797', '1.6521', '1.6455', '1.6362']);
    for (const y of p.years) expect(Math.abs(y.assets - y.liabilities)).toBeLessThan(0.01);
  });
});

/**
 * Case P by products (D-UX-109), worked apart from the engine by a short script from first principles: as P, but two
 * lines instead of the capacity: roasted chana, 2,500 packs a month at full running at Rs. 200, and roasted peanuts, 1,500
 * at Rs. 200; 96,00,000 a year at full running. At 60%: 57,60,000, variable 40,32,000; stock and creditors 3,31,397.26,
 * debtors 4,73,424.66; the margin 1,73,424.66. PMEGP's cost 31,23,424.66, the margin money 7,80,856.16, the loan repaid
 * 16,19,143.84; the project 30,23,424.66, the promoters 6,23,424.66, their own share 13.56%. 2026-27 (three months):
 * chana 4,500 packs, 9,00,000; peanuts 2,700 packs, 5,40,000; sales 14,40,000; term loan interest 80,957.19; a loss of
 * 3,27,207.19; cash 42,792.81. 2027-28 at 70%: chana 21,000 packs, 42,00,000; peanuts 12,600, 25,20,000.
 */
const CASE_P_LINES: ReportInput = { ...CASE_P, capacity: undefined, price: undefined,
  products: [{ name: 'Roasted chana', unitsMonth: 2500, price: 200 }, { name: 'Roasted peanuts', unitsMonth: 1500, price: 200 }] };
describe('fictional case P by products: the lines add up to sales', () => {
  const p = projectReport(CASE_P_LINES) as Report, sc = p.scheme, [a, b] = p.years;
  it('works the margin money, the year and each line', () => {
    expect(two([p.marginMoney, sc?.cost, sc?.subsidy, p.finance.termLoan, p.projectCost, p.finance.promoter, sc?.ownPct]))
      .toEqual(['173424.66', '3123424.66', '780856.16', '1619143.84', '3023424.66', '623424.66', '13.56']);
    expect(a.products?.map((l) => [l.name, l.units.toFixed(2), l.price.toFixed(2), l.sales.toFixed(2)]))
      .toEqual([['Roasted chana', '4500.00', '200.00', '900000.00'], ['Roasted peanuts', '2700.00', '200.00', '540000.00']]);
    expect(two([a.sales, a.tlInterest, a.pbt, a.cash])).toEqual(['1440000.00', '80957.19', '-327207.19', '42792.81']);
    expect(b.products?.map((l) => [l.units.toFixed(2), l.sales.toFixed(2)])).toEqual([['21000.00', '4200000.00'], ['12600.00', '2520000.00']]);
  });
  it('asks each line\'s three facts, by its number', () => {
    expect(reportNeeds({ ...CASE_P_LINES, products: [CASE_P_LINES.products![0], { name: ' ' }] }).filter((n) => n.startsWith('Sales')))
      .toEqual(['Sales, line 2: what is sold', 'Sales, line 2: how many a month at full running', 'Sales, line 2: the price a unit']);
    expect(reportNeeds({ ...CASE_P_LINES, products: [] })).toContain('Sales: at least one product or service');
  });
});

// Q: a service, special category, a town; building 10 lakh, plant 20 lakh, preliminary 1 lakh, no cash credit; 40,000
// units at Rs. 150; variable 55%; fixed 9 lakh; 26 lakh sanctioned at 10%, drawn October 2026, 9 months' moratorium, 48
// monthly instalments; sales from May 2027 (7 months on). PMEGP's cost 33,95,890.41 is above the Rs. 20 lakh ceiling, so
// the margin money is 25% of 20 lakh, 5,00,000, and the loan repaid 21,00,000; its interest before May 2027 (October to
// March) is 21,00,000 × 10/1200 × 6 = 1,05,000, in the project of 35,00,890.41. 2027-28 has 11 months: sales 33,00,000,
// profit after tax 15,222, cash 62,472, DSCR 1.1058.
const CASE_Q: ReportInput = {
  taxBy: 'firm', cost: { building: 1000000, machinery: 2000000, preliminary: 100000 },
  loan: { amount: 2600000, ratePct: 10, disbursed: '2026-10', moratoriumMonths: 9, instalments: 48, frequency: 'monthly', style: 'equal-principal' },
  capacity: 40000, price: 150, utilisationPct: [60, 70, 80], priceGrowthPct: 0, monthsToStart: 7, variablePct: 55, fixedCosts: 900000, fixedGrowthPct: 5,
  days: { stock: 30, debtors: 30, creditors: 30 }, wcLimit: 0, scheme: { id: 'pmegp', category: 'special', area: 'urban', activity: 'service', confirmed: true },
};
describe('fictional case Q: sales start in the next year, above the ceiling, cash below nil', () => {
  const q = projectReport(CASE_Q) as Report;
  it('leaves out the year before sales and pays its interest from the project', () => {
    expect(q.years.map((y) => y.fy)).toEqual(['2027-28', '2028-29', '2029-30', '2030-31', '2031-32']);
    expect(two([q.interestBeforeStart, q.scheme?.cost, q.scheme?.subsidy, q.finance.termLoan, q.projectCost, q.finance.promoter, q.scheme?.ownPct]))
      .toEqual(['105000.00', '3395890.41', '500000.00', '2100000.00', '3500890.41', '900890.41', '23.44']);
    expect(q.cost.find((c) => c.id === 'idc')?.amount).toBe(105000);
    expect(q.scheme?.flags).toEqual([PMEGP.notice, 'The project cost of Rs. 33,95,890 is above PMEGP\'s Rs. 20,00,000 for a service: the margin money is worked on Rs. 20,00,000, and the bank may lend the rest without it.']);
    const a = q.years[0];
    expect([a.months, ...two([a.sales, a.pat, a.cash, a.dscr])]).toEqual([11, '3300000.00', '15222.00', '62472.00', '1.11']);
    expect(q.cashShort).toBeUndefined();
  });
  // With fixed costs of 15 lakh, cash goes lowest in 2030-31, at −12,40,707.74.
  it('names the promoters\' money more that keeps cash at nil or above', () => {
    const s = projectReport({ ...CASE_Q, fixedCosts: 1500000 }) as Report;
    expect([s.cashShort?.fy, ...two([s.cashShort?.lowest, s.cashShort?.need])]).toEqual(['2030-31', '-1240707.74', '1240707.74']);
  });
  it('asks the scheme\'s facts, and a loan above the margin money', () => {
    expect(reportNeeds({ ...CASE_Q, scheme: { id: 'pmegp' } })).toEqual(['PMEGP: the borrower\'s category', 'PMEGP: a town or a village', 'PMEGP: manufacturing or a service']);
    expect((projectReport({ ...CASE_Q, loan: { ...CASE_Q.loan, amount: 500000 } }) as Needs).needs).toEqual(['The term loan: more than PMEGP\'s margin money of Rs. 5,00,000, which is set off against it']);
  });
});

// Case R with its costs typed by head (D-UX-112): materials 55%, power and fuel 6% and other variable costs 4% of sales
// (65%); wages 80,000, rent 25,000, repairs 10,000, insurance 5,000 and admin 30,000 a month (1,50,000, so 18,00,000 a
// year). Year 1: materials 1,20,00,000 × 55% = 66,00,000, power 7,20,000, other 4,80,000; wages 80,000 × 12 = 9,60,000,
// rent 3,00,000, repairs 1,20,000, insurance 60,000, admin 3,60,000. Year 2, sales 1,32,00,000 and fixed costs up 5%:
// materials 72,60,000, wages 10,08,000. Everything else is case R's.
const CASE_R_HEADS: ReportInput = { ...CASE_R, variablePct: undefined, fixedCosts: undefined, costHeads: {
  variable: { materials: 55, power: 6, otherVariable: 4 }, fixed: { wages: 80000, rent: 25000, repairs: 10000, insurance: 5000, admin: 30000 } } };
describe('fictional case R by cost heads', () => {
  const h = projectReport(CASE_R_HEADS) as Report;
  it('adds the heads up to case R\'s costs and profit', () => {
    expect([h.years[0].variable, h.years[0].fixed, h.years[0].pat].map((x) => x.toFixed(2))).toEqual(['7800000.00', '1800000.00', '1154406.67']);
  });
  it('names each head in the profit and loss, year by year', () => {
    const at = (k: number) => [...(h.years[k].heads?.variable ?? []), ...(h.years[k].heads?.fixed ?? [])].map((x) => [x.label, rs(x.amount)]);
    expect(at(0)).toEqual([['Materials', 6600000], ['Power and fuel', 720000], ['Other variable costs', 480000], ['Wages and salaries', 960000],
      ['Rent', 300000], ['Repairs and maintenance', 120000], ['Insurance', 60000], ['Admin and other overheads', 360000]]);
    expect([at(1)[0], at(1)[3]]).toEqual([['Materials', 7260000], ['Wages and salaries', 1008000]]);
    expect(r.years[0].heads).toBeUndefined();
  });
  it('asks a head typed below 0', () => {
    const bad = projectReport({ ...CASE_R_HEADS, costHeads: { ...CASE_R_HEADS.costHeads, fixed: { rent: -1 } } }) as Needs;
    expect(bad.needs).toContain('Costs by head: rent, a figure of 0 or more');
  });
});

// The limit worked out on case R: stock and creditors 78,00,000 × 30/365 = 6,41,095.89, debtors 9,86,301.37; the need
// 75% × 16,27,397.26 − 6,41,095.89 = 5,79,452.05 (again: (22.5 × 1,20,00,000 − 7.5 × 78,00,000) ÷ 365 = 21,15,00,000 ÷
// 365); the turnover method's 20% of 1,20,00,000 = 24,00,000; the limit the lower, 5,79,452.05. With 90 days of stock
// and debtors and no creditors the need is 75% × (19,23,287.67 + 29,58,904.11) = 36,61,643.84, so the turnover method's
// 24,00,000 holds.
describe('the working-capital limit worked out', () => {
  it('takes the lower of the need and the turnover method', () => {
    const w = workedLimit(CASE_R) as { need: number; turnover: number; limit: number };
    expect([w.need, w.turnover, w.limit].map((x) => x.toFixed(2))).toEqual(['579452.05', '2400000.00', '579452.05']);
    const t = workedLimit({ ...CASE_R, days: { stock: 90, debtors: 90, creditors: 0 } }) as { need: number; limit: number };
    expect([t.need, t.limit].map((x) => x.toFixed(2))).toEqual(['3661643.84', '2400000.00']);
  });
  it('works from the heads, and waits for a missing fact', () => {
    expect(workedLimit(CASE_R_HEADS)?.limit.toFixed(2)).toBe('579452.05');
    expect(workedLimit({ ...CASE_R, days: undefined })).toBeUndefined();
    expect(workedLimit({ ...CASE_R, sales: undefined })).toBeUndefined();
  });
});
