/** Loan schedule against figures worked by hand from the loan terms and a textbook EMI (not figures this code produced). */
import { describe, it, expect } from 'vitest';
import { fyOf, schedule, type LoanTerms } from '../engine/loan';

const r = (x: number) => Math.round(x * 100) / 100;
const table = (t: LoanTerms) => schedule(t).map((y) => [y.fy, r(y.interest), r(y.principal), r(y.closing)]);

describe('financial years', () => {
  it('run April to March', () => {
    expect(fyOf(2026, 4)).toBe('2026-27');
    expect(fyOf(2027, 3)).toBe('2026-27');
    expect(fyOf(2099, 12)).toBe('2099-00');
  });
});

describe('equal instalments of principal', () => {
  it('quarterly after a 6-month moratorium (fictional case A)', () => {
    // Rs.12,00,000 at 12% (1% a month), drawn April 2026, 6 months' moratorium, 12 quarterly instalments of
    // Rs.1,00,000 from December 2026. Interest is 1% of each month's opening balance:
    // 2026-27: 9 months on 12,00,000 + 3 on 11,00,000 = 1,08,000 + 33,000 = 1,41,000; instalments Dec and Mar.
    // 2027-28: 3 months each on 10, 9, 8 and 7 lakh = 1,02,000.  2028-29: 6, 5, 4, 3 lakh = 54,000.
    // 2029-30: 2 and 1 lakh = 9,000. Total 3,06,000.
    expect(table({ amount: 1200000, ratePct: 12, disbursed: '2026-04', moratoriumMonths: 6, instalments: 12, frequency: 'quarterly', style: 'equal-principal' })).toEqual([
      ['2026-27', 141000, 200000, 1000000],
      ['2027-28', 102000, 400000, 600000],
      ['2028-29', 54000, 400000, 200000],
      ['2029-30', 9000, 200000, 0],
    ]);
  });
  it('at no interest, and a loan of Rs. 1 still has an instalment', () => {
    expect(table({ amount: 12000, ratePct: 0, disbursed: '2027-01', moratoriumMonths: 0, instalments: 12, frequency: 'monthly', style: 'equal-principal' }))
      .toEqual([['2026-27', 0, 3000, 9000], ['2027-28', 0, 9000, 0]]);
    expect(table({ amount: 1, ratePct: 10, disbursed: '2026-04', moratoriumMonths: 0, instalments: 1, frequency: 'monthly', style: 'equal-principal' })[0][2]).toBe(1);
  });
});

describe('EMI', () => {
  it('matches the textbook: Rs.10,00,000 at 12% for 12 months is Rs.88,848.79 a month', () => {
    // Total interest = 12 × 88,848.7887 − 10,00,000 = 66,185.46, all in 2026-27.
    const s = schedule({ amount: 1000000, ratePct: 12, disbursed: '2026-04', moratoriumMonths: 0, instalments: 12, frequency: 'monthly', style: 'emi' });
    expect(s).toHaveLength(1);
    expect(s[0].interest).toBeCloseTo(66185.46, 1);
    expect(s[0].principal).toBeCloseTo(1000000, 6);
    expect(s[0].closing).toBeCloseTo(0, 6);
  });
});
