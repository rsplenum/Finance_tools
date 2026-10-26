/** Loan schedule against figures worked by hand from the loan terms and a textbook EMI (not figures this code produced). */
import { describe, it, expect } from 'vitest';
import { fyOf, levelInstalment, schedule, stepOf, type LoanTerms } from '../engine/loan';
import { amortization } from '../engine/dscr';

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

describe('stepped (OR5)', () => {
  // Figures worked apart from the engine (Python, Decimal at 40 places): the first instalment solved by halving on the
  // balance left after the last instalment, the step by halving on the interest floor; not this code's factor sums.
  it('Rs.12,00,000 at 12% over 24 months: Rs.53,951.45 a month, then 10% more in the second year', () => {
    const t: LoanTerms = { amount: 1200000, ratePct: 12, disbursed: '2026-04', moratoriumMonths: 0, instalments: 24, frequency: 'monthly', style: 'stepped' };
    expect(stepOf(t)).toBe(0.1);
    expect(levelInstalment(t)).toBeCloseTo(53951.4534, 3);
    expect(table(t)).toEqual([['2026-27', 115368.01, 532049.43, 667950.57], ['2027-28', 44208.62, 667950.57, 0]]);
    // Its own check (closed form) agrees, and the interest over the loan is the two years' added up.
    const a = amortization(t);
    expect('months' in a && r(a.totalInterest)).toBe(159576.62);
  });
  it('with a 6-month holiday, interest only until the first instalment', () => {
    expect(table({ amount: 1200000, ratePct: 12, disbursed: '2026-04', moratoriumMonths: 6, instalments: 24, frequency: 'monthly', style: 'stepped' })).toEqual([
      ['2026-27', 137622.75, 258085.97, 941914.03], ['2027-28', 81816.1, 597972.21, 343941.82], ['2028-29', 12137.78, 343941.82, 0],
    ]);
  });
  it('the step: 10%, lowered for the last year at most twice the first, and for a first instalment that covers its interest', () => {
    const at = (ratePct: number, instalments: number) => stepOf({ ratePct, instalments });
    expect([at(10, 84), at(10, 108), at(9, 120), at(10, 180), at(12, 180), at(0, 36), at(12, 12)]).toEqual([0.1, 0.09, 0.08, 0.046, 0.035, 0.1, 0]);
  });
  it('costs more interest than an EMI, which costs more than equal principal', () => {
    const base = { amount: 5000000, ratePct: 10, disbursed: '2026-04', moratoriumMonths: 6, instalments: 84, frequency: 'monthly' } as const;
    const interest = (style: LoanTerms['style']) => { const a = amortization({ ...base, style }); return 'months' in a ? a.totalInterest : NaN; };
    expect(interest('stepped')).toBeGreaterThan(interest('emi'));
    expect(interest('emi')).toBeGreaterThan(interest('equal-principal'));
  });
});
