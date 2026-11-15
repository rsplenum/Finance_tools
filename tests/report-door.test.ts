/**
 * The report's front door (site/src/report/door.ts, NEW2b): five answers written over the worked example. A fictional
 * packaged-atta unit, opened on 15-10-2026 (sales from April 2027, a full first year 2027-28), worked by hand:
 *   Cost 40,00,000 split as the example's 6 of 26: building 40,00,000 × 6 ÷ 26 = 9,23,076.92, so 9,23,077; machines
 *   30,76,923; together 40,00,000.
 *   Sales 1,20,00,000 a year at full running: one line of 10,00,000 a month.
 *   Left 18,00,000: costs 1,02,00,000, of which fixed 12 of 101.76 (the example's 12,00,000 of 1,01,76,000). With sales:
 *   1,02,00,000 × 89.76 ÷ 101.76 = 89,97,169.81, which is 74.9764% of sales: 74.98%. Fixed a year then 1,20,00,000 ×
 *   25.02% − 18,00,000 = 12,02,400 (1,00,200 a month). Again: 1,20,00,000 − 89,97,600 − 12,02,400 = 18,00,000.
 *   The first year at 60%: 72,00,000; costs with sales 74.98% of it, 53,98,560; fixed 12,02,400; before interest,
 *   depreciation and tax 5,99,040 (again: 18,00,000 × 0.6 − 12,02,400 × 0.4 = 10,80,000 − 4,80,960 = 5,99,040).
 * The example itself goes back through the same split: 1,32,00,000 of sales leaving 30,24,000 gives its 68% and 1,00,000.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { doorProblem, doorReads, doorState, pencilLeft, splitCost, splitCosts } from '../site/src/report/door';
import { carryView, checkKey, inputOf, preview } from '../site/src/report/model';
import { reportExample } from '../site/src/report/example';

const ATTA = { what: 'Packaged atta', cost: '40 L', loan: '30 L', sales: '1.2 Cr', left: '18 L' };
const cell = (p: ReturnType<typeof preview>, table: string, label: string, at = 0) => p.view!.tables.find((t) => t.id === table)!.rows.find((r) => r.label === label)!.n![at];

describe('the report’s front door', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-15T12:00:00')); });
  afterEach(() => { vi.useRealTimers(); });

  it('splits the cost and the costs as the example’s, exactly', () => {
    expect(splitCost(4000000)).toEqual({ building: 923077, machinery: 3076923 });
    expect(splitCost(2600000)).toEqual({ building: 600000, machinery: 2000000 });
    expect(splitCosts(12000000, 1800000)).toEqual({ variablePct: 74.98, fixedYear: 1202400, fixedMonth: 100200 });
    const ex = splitCosts(13200000, 3024000);
    expect([ex.variablePct, Math.round(ex.fixedMonth * 100) / 100]).toEqual([68, 100000]);
  });

  it('writes the five answers over the example, and nothing of the example’s business', () => {
    const s = doorState(ATTA);
    expect(s.doc).toEqual({ name: '', activity: 'Packaged atta', address: '', lender: '', preparedBy: '' });
    expect([s.cost.building, s.cost.machinery, s.loan.amount]).toEqual(['9,23,077', '30,76,923', '30 L']);
    expect(s.products).toEqual([{ name: 'Packaged atta', units: '1', price: '10,00,000', unit: 'month' }]);
    expect([s.variablePct, s.fixedMonth, s.mode]).toEqual(['74.98', '1,00,200', 'simple']);
    const x = inputOf(s);
    expect(x.cost.building! + x.cost.machinery!).toBe(4000000);
  });

  it('the first year through the engine, as worked by hand', () => {
    const p = preview(doorState(ATTA));
    expect(p.blocked).toBeUndefined();
    expect(p.needs).toEqual([]);
    expect(p.view!.years[0]).toBe('2027-28');
    const sales = cell(p, 'pl', 'Sales'), pbdit = cell(p, 'pl', 'Profit before interest, depreciation and tax');
    expect(sales).toBeCloseTo(7200000, 2);
    expect(pbdit).toBeCloseTo(599040, 2);
    expect(pbdit).toBeCloseTo(1800000 * 0.6 - 1202400 * 0.4, 2);
  });

  it('answers the largest loan the cash carries', () => {
    const v = carryView(doorState(ATTA));
    expect(v).toBeDefined();
    expect(v!.line).toMatch(/^The largest loan your business can repay is ₹[\d,]+\. You asked ₹30,00,000\.$/);
    expect(v!.gap).toBe(true);
  });

  it('keeps the rest in pencil until changed or confirmed, outside the figures checked', () => {
    const s = doorState(ATTA);
    expect(pencilLeft(s)).toEqual(['borrower', 'split', 'sellFrom', 'costs', 'rate', 'years', 'wc', 'security']);
    const rate = { ...s, loan: { ...s.loan, ratePct: '11' } };
    expect(pencilLeft(rate)).not.toContain('rate');
    expect(pencilLeft({ ...s, pencil: undefined })).toEqual([]);
    expect(checkKey({ ...s, pencil: undefined })).toBe(checkKey(s));
    expect(pencilLeft(reportExample())).toEqual([]);
  });

  it('refuses what cannot be, and reads back what can', () => {
    expect(doorProblem('what', ' ', {})).toMatch(/few words/);
    expect(doorProblem('cost', 'abc', {})).toMatch(/amount/);
    expect(doorProblem('cost', '0', {})).toMatch(/above nil/);
    expect(doorProblem('loan', '50 L', { cost: '40 L' })).toMatch(/More than the project's cost of ₹40 lakh/);
    expect(doorProblem('left', '1.5 Cr', { sales: '1.2 Cr' })).toMatch(/More than the sales/);
    expect(doorProblem('left', '-1 L', { sales: '1.2 Cr' })).toMatch(/nil or more/);
    expect(doorProblem('left', '0', { sales: '1.2 Cr' })).toBeUndefined();
    expect(doorReads('cost', '40 L', {})).toBe('₹40 lakh: about ₹9.23 lakh building and about ₹30.77 lakh machines, a guess you can change');
    expect(doorReads('loan', '30 L', { cost: '40 L' })).toBe('₹30 lakh, 75% of the cost');
    expect(doorReads('sales', '1.2 Cr', {})).toBe('₹1.2 crore a year, ₹10 lakh a month');
    expect(doorReads('left', '18 L', { sales: '1.2 Cr' })).toBe('₹18 lakh, 15% of sales');
  });
});
