/**
 * An expansion (D-UX-251 (a), OR11c): today's sales, growing as typed, plus a new line by capacity × use by year × price,
 * the line's price growing only once it is full. Fictional case E (D-BIZ-02: invented figures), worked by hand below and
 * again by a short script: case R's costs, loan and working capital (tests/report.test.ts), a business selling Rs.
 * 70,00,000 today and growing 10% a year, adding the mock-up's line (docs/design-reviews/2026-10-29-or11b/, its `fill`
 * case): 5,00,000 boxes a year at Rs. 25, used 55%, 70%, then 85%, the price growing 5% a year once full; the line's
 * first sales six months after the loan's first draw, in October 2026.
 */
import { describe, it, expect } from 'vitest';
import { projectReport, reportNeeds, workedLimit, type Report, type ReportInput } from '../engine/report';
import { CASE_R } from './report.test';

const LINE: ReportInput = { ...CASE_R, salesBy: 'expansion', sales: 7000000, salesGrowthPct: 10, capacity: 500000, price: 25, utilisationPct: [55, 70, 85], priceGrowthPct: 5, monthsToStart: 6 };
const e = projectReport(LINE) as Report, y1 = e.years[0];
const rs = (x: number) => Math.round(x * 100) / 100;

describe('fictional case E, today\'s sales and a new line', () => {
  // The line at full use: 5,00,000 × 25 = 1,25,00,000 a year. 2026-27: 55% = 68,75,000 a year, six months of it 34,37,500;
  // 2027-28: 70% = 87,50,000; 2028-29: 85% = 1,06,25,000, full, so the price grows from the next year: 2029-30 1,11,56,250
  // (× 1.05), 2030-31 1,17,14,062.50 (× 1.05²). Today's: 70,00,000, 77,00,000, 84,70,000, 93,17,000, 1,02,48,700, every
  // month of each year. Sales: 1,04,37,500, 1,64,50,000, 1,90,95,000, 2,04,73,250, 2,19,62,762.50.
  it('today\'s sales whole, the line by its months, its price growing once full', () => {
    expect(e.years.map((y) => y.months)).toEqual([6, 12, 12, 12, 12]);
    expect(e.years.map((y) => rs(y.today as number))).toEqual([7000000, 7700000, 8470000, 9317000, 10248700]);
    expect(e.years.map((y) => rs(y.line as number))).toEqual([3437500, 8750000, 10625000, 11156250, 11714062.5]);
    expect(e.years.map((y) => rs(y.sales))).toEqual([10437500, 16450000, 19095000, 20473250, 21962762.5]);
  });
  // 2026-27: variable 65% = 67,84,375; fixed 18,00,000 for the whole year (the business runs all year); PBDIT 18,53,125.
  // Less depreciation 4,20,000, preliminary 20,000, term-loan interest 2,27,083.33 (as case R: the loan is the same) and
  // working-capital interest for the line's six months, 5,00,000 × 11% × 6/12 = 27,500: PBT 11,58,541.67; tax at 31.2%
  // 3,61,465; PAT 7,97,076.67. DSCR (7,97,076.67 + 4,20,000 + 20,000 + 2,27,083.33) ÷ 7,27,083.33 = 14,64,160 ÷
  // 7,27,083.33 = 2.0137.
  it('the first year\'s profit and DSCR', () => {
    expect([y1.variable, y1.fixed, y1.pbdit, y1.wcInterest, y1.pbt, y1.tax, y1.pat].map(rs)).toEqual([6784375, 1800000, 1853125, 27500, 1158541.67, 361465, 797076.67]);
    expect([y1.available.toFixed(2), y1.dscr?.toFixed(4)]).toEqual(['1464160.00', '2.0137']);
  });
  // Working capital on the whole business's first-year rate, 70,00,000 + 68,75,000 = 1,38,75,000: debtors 30 days
  // 11,40,410.96, stock and creditors 30 days of its 65% 7,41,267.12 each; the margin 11,40,410.96 − 5,00,000 = 6,40,410.96.
  it('the working capital on today\'s sales and the line together', () => {
    expect([y1.debtors, y1.stock, y1.creditors, e.marginMoney].map(rs)).toEqual([1140410.96, 741267.12, 741267.12, 640410.96]);
    expect(rs(workedLimit(LINE)?.turnover as number)).toBe(rs(13875000 * 0.2));
  });
  it('asks today\'s sales and the line in the line\'s words', () => {
    const needs = reportNeeds({ ...LINE, sales: undefined, salesGrowthPct: undefined, capacity: undefined, price: undefined, utilisationPct: [], priceGrowthPct: undefined });
    expect(needs).toEqual(expect.arrayContaining(['Today\'s sales in a full first year, 0 or more', 'Today\'s sales: growth a year (%)', 'The new line: the units it can make or serve in a year',
      'The new line: its price a unit', 'The new line: its use by year (%), each 0 to 100', 'The new line: its price\'s growth a year once full (%)']));
    expect(reportNeeds({ ...LINE, sales: 0 })).toEqual([]);
  });
});

describe('an expansion with no sales today is a new business by its drivers', () => {
  // With one use for every year the line is full from the start, so its price grows from the second year, as a new
  // business's; sales from the first month, so the fixed costs are whole either way.
  const drivers: ReportInput = { ...CASE_R, salesBy: 'drivers', sales: undefined, salesGrowthPct: undefined, capacity: 500000, price: 25, utilisationPct: [80], priceGrowthPct: 5 };
  const a = projectReport(drivers) as Report, b = projectReport({ ...drivers, salesBy: 'expansion', sales: 0, salesGrowthPct: 0 }) as Report;
  it('gives the same years', () => {
    for (const k of ['sales', 'pbdit', 'pat', 'cash', 'dscr'] as const) expect(b.years.map((y) => y[k])).toEqual(a.years.map((y) => y[k]));
    expect(b.projectCost).toBe(a.projectCost);
  });
  // The mock-up's line as a new business (drivers): the price grows from its second year, so 2029-30 is
  // 1,25,00,000 × 85% × 1.05³ = 1,22,99,765.63, where the same line in an expansion is 1,11,56,250.
  it('while a filling line\'s price waits until it is full', () => {
    const fill = projectReport({ ...LINE, salesBy: 'drivers' }) as Report;
    expect(rs(fill.years[3].sales)).toBe(12299765.63);
  });
});

describe('a new line by its products', () => {
  // Boxes 20,000 a month at Rs. 25 and lids 10,000 at Rs. 12.50: 60,00,000 + 15,00,000 = 75,00,000 a year at full use;
  // 2026-27 at 55% for six months, 20,62,500, of which boxes 16,50,000 (66,000 boxes) and lids 4,12,500 (33,000 lids).
  const p = projectReport({ ...LINE, capacity: undefined, price: undefined, products: [{ name: 'Boxes', unitsMonth: 20000, price: 25 }, { name: 'Lids', unitsMonth: 10000, price: 12.5 }] }) as Report;
  it('adds up to the line, beside today\'s sales', () => {
    expect([p.years[0].line, ...(p.years[0].products ?? []).flatMap((l) => [l.units, l.sales])].map((v) => rs(v as number))).toEqual([2062500, 66000, 1650000, 33000, 412500]);
    expect(rs(p.years[0].sales)).toBe(9062500);
  });
});
