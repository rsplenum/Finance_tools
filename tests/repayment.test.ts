/**
 * The holiday and the repayment, compared (engine/repayment.ts, OR5, D-UX-198) on fictional case G: case F's business
 * (tests/fix.test.ts) with a term loan of Rs. 2,50,00,000 at 9.3%, drawn in April 2027, a 6 months' holiday and 36 monthly
 * instalments, its fixed costs model-worked so that the ways part on the lowest-year DSCR.
 *
 * By hand, as the second computation (scratchpad caseg.py, Python, month by month in 40-digit decimals): EMI by the annuity
 * formula, equal principal at 2,50,00,000 ÷ 36, stepped by bisection on the last balance with the instalment rising 10% a
 * year (three years: under the twice-the-first cap, and the first instalment above the first month's interest). The holiday
 * pays 2,50,00,000 × 0.775% × 6 = 11,62,500 of interest; equal principal then pays P·i·(n + 1) ÷ 2 = 35,84,375.
 *   Interest over the loan:      equal principal 47,46,875.00; EMI 49,08,086.34; stepped 50,77,669.53.
 *   First and last instalments:  8,88,194.44 and 6,99,826.39; 7,98,488.51 each; 7,27,975.06 and 8,80,849.83.
 *   Debt service in 2028-29 (instalments 7 to 18): 99,15,625.00; 95,81,862.11; 91,72,485.80.
 */
import { describe, it, expect } from 'vitest';
import { F } from './fix.test';
import { compareRepayments, periodOf } from '../engine/repayment';
import type { ReportInput } from '../engine/report';

const G = (fixedCosts: number, loan: Partial<ReportInput['loan']> = {}): ReportInput =>
  ({ ...F, fixedCosts, loan: { ...F.loan, disbursed: '2027-04', amount: 25000000, moratoriumMonths: 6, instalments: 36, ...loan } });
const BY_HAND = {
  'equal-principal': { interest: 4746875.0, first: 888194.44, last: 699826.39, service: 9915625.0 },
  emi: { interest: 4908086.34, first: 798488.51, last: 798488.51, service: 9581862.11 },
  stepped: { interest: 5077669.53, first: 727975.06, last: 880849.83, service: 9172485.8 },
};

describe('the repayment compared (OR5)', () => {
  it('works each way on the same loan: the interest, the instalments and the lowest year match the hand figures', () => {
    const w = compareRepayments(G(33000000))!;
    expect(w.ways.map((k) => k.style)).toEqual(['equal-principal', 'emi', 'stepped']);
    for (const k of w.ways) {
      const h = BY_HAND[k.style], y = k.report.years.find((q) => q.fy === '2028-29')!;
      expect(k.interest).toBeCloseTo(h.interest, 2);
      expect(k.first).toBeCloseTo(h.first, 2);
      expect(k.last).toBeCloseTo(h.last, 2);
      expect(y.service).toBeCloseTo(h.service, 2);
      // 2028-29, the first full year of instalments, is the lowest: its cash available over the hand-worked service.
      expect(k.lowest).toEqual({ dscr: expect.any(Number), fy: '2028-29' });
      expect(k.lowest!.dscr).toBeCloseTo(y.available / h.service, 8);
    }
    expect(w.ways.find((k) => k.style === 'stepped')!.step).toBe(0.1);
  });

  it('proposes the cheapest that misses nothing: equal principal misses the lowest-year DSCR, so EMI', () => {
    const w = compareRepayments(G(33000000))!, [ep, emi, st] = w.ways;
    expect(ep.lowest!.dscr.toFixed(4)).toBe('1.2371');
    expect(ep.misses).toEqual(['dscrLowest']);
    expect(emi.lowest!.dscr.toFixed(4)).toBe('1.2853');
    expect(emi.misses).toEqual([]);
    // Stepped leaves more of the loan outstanding, so the plant's net block covers it less: 1.185 against 1.20.
    expect(st.misses).toEqual(['facr']);
    expect(w.proposed?.style).toBe('emi');
    expect(w.now.style).toBe('emi');
  });

  it('proposes equal principal when it meets, stepped when only it meets, and none when every way misses', () => {
    expect(compareRepayments(G(32000000))!.proposed?.style).toBe('equal-principal');
    // The fixed-asset cover the user set at 1.00 (BEN1): only the stepped way's lowest year clears 1.25.
    const st = compareRepayments(G(34000000), { facr: 1 })!;
    expect(st.ways.map((k) => k.misses)).toEqual([['dscrLowest'], ['dscrLowest'], []]);
    expect(st.proposed?.style).toBe('stepped');
    expect(compareRepayments(G(34000000))!.proposed).toBeUndefined();
  });

  it('has one way for quarterly instalments (EMI and stepped are monthly only), and no stepped one for a year of them', () => {
    const q = compareRepayments(G(32000000, { frequency: 'quarterly', instalments: 12, style: 'equal-principal' }))!;
    expect(q.noStep).toBe('quarterly');
    expect(q.ways.map((k) => k.style)).toEqual(['equal-principal']);
    expect(q.now.style).toBe('equal-principal');
    const short = compareRepayments(G(32000000, { instalments: 12 }))!;
    expect(short.noStep).toBe('short');
    expect(short.ways.map((k) => k.style)).toEqual(['equal-principal', 'emi']);
  });
});

describe('the loan period read back (D-UX-174)', () => {
  it('adds the holiday to the repayment and checks the whole against 180 months', () => {
    expect(periodOf(G(0))).toEqual({ holiday: 6, repayment: 36, months: 42, inAll: { years: 3, months: 6 },
      limits: [{ on: 'whole', most: 180, months: 42, within: true, by: 'msme' }] });
    const long = periodOf(G(0, { moratoriumMonths: 12, instalments: 172 }))!;
    expect([long.months, long.inAll, long.limits[0].within]).toEqual([184, { years: 15, months: 4 }, false]);
    expect(periodOf(G(0, { moratoriumMonths: undefined }))).toBeUndefined();
  });

  it('under PMEGP, checks the repayment after the holiday against 3 to 7 years (guideline 8-4)', () => {
    const pm = (loan: Partial<ReportInput['loan']>) => periodOf({ ...G(0, loan), scheme: { id: 'pmegp', category: 'general', area: 'urban', activity: 'manufacturing' } })!.limits[0];
    expect(pm({ instalments: 84 })).toEqual({ on: 'repayment', least: 36, most: 84, months: 84, within: true, by: 'pmegp' });
    expect(pm({ instalments: 24 }).within).toBe(false);
    expect(pm({ instalments: 85 }).within).toBe(false);
    expect(pm({ instalments: 28, frequency: 'quarterly' })).toMatchObject({ months: 84, within: true });
  });
});
