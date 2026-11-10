/**
 * The fix beside the miss (engine/fix.ts, OR2, D-UX-177) on fictional case F, the owner's OR1 figures (building
 * Rs. 50,00,000, plant Rs. 2,50,00,000, a term loan of Rs. 2,50,00,000 over 15 years after a month's holiday), the rate
 * (9.3%) and the sales model-worked so that only the fixed-asset cover misses, as on the owner's recording.
 *
 * By hand, as the second computation: sales begin in November 2026, 151 days before 31 March, so the first year takes
 * half its depreciation (under 180 days, D-UX-350) and the net block at the end of the k-th year is 50,00,000 × 0.95 ×
 * 0.9^(k − 1) + 2,50,00,000 × 0.925 × 0.85^(k − 1); the loan left after j
 * instalments is P(1 + i)^j − EMI((1 + i)^j − 1) ÷ i, i = 9.3% ÷ 12, EMI as Excel's PMT. Drawn in October 2026, a month's
 * holiday: by 31 March of the k-th year (2026-27 being the first) 6 + 12(k − 1) months have passed and 5 + 12(k − 1)
 * instalments are paid. The cover starts at 1.13 (2.79 crore against 2.46) and falls: 0.5352 in 2035-36.
 */
import { describe, it, expect } from 'vitest';
import { projectReport, type Report, type ReportInput } from '../engine/report';
import { diagnose } from '../engine/ratios';
import { fixOf } from '../engine/fix';
import { AS_TYPED, makePlan, withLevers, type Plan } from '../engine/plan';

export const F: ReportInput = {
  taxBy: 'proprietor', cost: { building: 5000000, machinery: 25000000 },
  loan: { amount: 25000000, ratePct: 9.3, disbursed: '2026-10', moratoriumMonths: 1, instalments: 180, frequency: 'monthly', style: 'emi' },
  salesBy: 'drivers', monthsToStart: 1, products: [{ name: 'Widgets', unitsMonth: 10000, price: 1500 }], priceGrowthPct: 0, utilisationPct: [60, 70, 80],
  variablePct: 60, fixedCosts: 12000000, fixedGrowthPct: 5, days: { stock: 30, debtors: 30, creditors: 30 }, wcLimit: 5300000, wcRatePct: 9.3,
};
const i = 9.3 / 1200;
const left = (p: number, n: number, j: number) => (j >= n ? 0 : p * (1 + i) ** j - ((p * i) / (1 - (1 + i) ** -n)) * (((1 + i) ** j - 1) / i));
const block = (k: number) => 5000000 * 0.95 * 0.9 ** (k - 1) + 25000000 * 0.925 * 0.85 ** (k - 1);
/** The lowest fixed-asset cover by hand over the years the loan runs, with loan `p` over `n` instalments. */
const lowest = (p: number, n: number) => Math.min(...Array.from({ length: 16 }, (_, k) => k + 1).filter((k) => 5 + 12 * (k - 1) < n).map((k) => block(k) / left(p, n, 5 + 12 * (k - 1))));
const facr = (r: Report) => Math.min(...r.years.filter((y) => y.facr !== undefined).map((y) => y.facr as number));

describe('the fix beside the miss (OR2)', () => {
  it('case F misses only the fixed-asset cover: the plant loses value faster than the loan is repaid', () => {
    const r = projectReport(F) as Report, d = diagnose(r, F);
    expect(d.misses).toEqual(['facr']);
    expect(facr(r)).toBeCloseTo(lowest(25000000, 180), 9);
    expect(lowest(25000000, 180).toFixed(4)).toBe('0.5352');
    // A shorter repayment alone meets the cover only at 4 years or less (1.2222 at 48 instalments, 1.1948 at 60): it
    // gives away 132 of the 180 months, more than either fix below, so it is not among the two shown.
    expect([lowest(25000000, 48).toFixed(4), lowest(25000000, 60).toFixed(4)]).toEqual(['1.2222', '1.1948']);
    expect(132 / 180).toBeGreaterThan(13860000 / 25000000);
  });

  it('proposes the least strained fix first: 11 years and Rs. 1,72,20,000; then the 15 years kept and Rs. 1,11,40,000', () => {
    const f = fixOf(F)!;
    expect(f.missed).toEqual(['facr']);
    expect(f.fixes.map((k) => [k.instalments.needed, k.loan.needed, k.loan.more])).toEqual([[132, 17220000, 7719705], [180, 11140000, 13752585]]);
    // By hand: each meets, and Rs. 10,000 more (the step at four figures) misses. The promoters bring the loan's cut less
    // the interest before the first sales that a smaller loan saves (a month at 9.3%: 77,80,000 × 9.3% ÷ 12 = 60,295).
    expect([7780000 - (7780000 * 9.3) / 1200, 13860000 - (13860000 * 9.3) / 1200]).toEqual([7719705, 13752585]);
    expect(lowest(17220000, 132)).toBeGreaterThanOrEqual(1.2);
    expect(lowest(17230000, 132)).toBeLessThan(1.2);
    expect(lowest(11140000, 180)).toBeGreaterThanOrEqual(1.2);
    expect(lowest(11150000, 180)).toBeLessThan(1.2);
    expect(facr(f.fixes[0].report)).toBeCloseTo(lowest(17220000, 132), 9);
    // The strain: 48 of 180 months and 77.8 of 250 lakh, the larger 0.3112; keeping 15 years gives 1,38,60,000 of 2.5 crore.
    expect(f.fixes[0].strain).toBeCloseTo(7780000 / 25000000, 12);
    expect(f.fixes[1].strain).toBeCloseTo(13860000 / 25000000, 12);
    // Least strained: 10 years gives away a third of the term, and at 12 years a loan cut by 0.3112 still misses.
    expect(60 / 180).toBeGreaterThan(7780000 / 25000000);
    expect(lowest(17220000, 144)).toBeLessThan(1.2);
    expect(f.fixes[0].levers).toMatchObject({ promoters: 7780000, instalments: -48 });
  });

  it('meets every level the miss needs and loses none: the DSCR stays met', () => {
    for (const k of fixOf(F)!.fixes) {
      const x = { ...F, loan: { ...F.loan, amount: k.loan.needed, instalments: k.instalments.needed } };
      expect(diagnose(projectReport(x) as Report, x).misses).toEqual([]);
    }
  });

  it('offers none when the repayment and the loan cannot meet a level missed (the current ratio)', () => {
    const f = fixOf({ ...F, products: [{ name: 'Widgets', unitsMonth: 10000, price: 600 }] })!;
    expect(f.missed).toContain('currentRatio');
    expect(f.fixes).toEqual([]);
    expect(fixOf({ ...F, loan: { ...F.loan, amount: 10000000 } })).toBeUndefined();
  });
});

// The sliders on case F (OR11d): the board opens as typed, the fix no longer standing in for the plan (D-UX-182 retired);
// held at the fix's levers, it agrees with "Use this". The fewest instalments the board takes is where the lowest-year DSCR
// still meets (the instalments free, the loan held at the fix's): by the engine, 1.2937 at 12 instalments of Rs. 1,72,20,000 and 1.1891 at 11, under 1.25, in 2026-27 (five
// instalments by 31 March); the term loan as typed, 2.5 crore, reaches its bound at 17.
describe('The sliders on case F (OR11d)', () => {
  it('open as typed, and held at the fix work: the promoters bring Rs. 77,19,705 more', () => {
    const f = fixOf(F)!.fixes[0];
    expect((makePlan(F, { typed: true }) as Plan).levers).toEqual(AS_TYPED);
    const q = makePlan(F, { typed: true, held: f.levers }) as Plan;
    expect([q.works, q.levers]).toEqual([true, f.levers]);
    expect(q.promoters.more).toBe(7719705);
    expect(q.promoters.plan).toBeCloseTo(f.report.finance.promoter, 6);
  });

  it('let the repayment shorten down to where the lowest-year DSCR stops meeting', () => {
    const f = fixOf(F)!.fixes[0], q = makePlan(F, { typed: true, held: { promoters: f.levers.promoters } }) as Plan, dscr = (n: number) => {
      const y = withLevers(F, { ...f.levers, instalments: n - 180 }), k = diagnose(projectReport(y) as Report, y).checks.find((c) => c.id === 'dscrLowest')!;
      return [k.meets, (k.worst as number).toFixed(4)];
    };
    expect(q.limits.fewest).toBe(12 - 180);
    expect([dscr(12), dscr(11)]).toEqual([[true, '1.2937'], [false, '1.1891']]);
    expect((makePlan(F, { typed: true }) as Plan).limits.fewest).toBe(17 - 180);
  });
});
