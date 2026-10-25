/**
 * The fix beside the miss (engine/fix.ts, OR2, D-UX-177) on fictional case F, the owner's OR1 figures (building
 * Rs. 50,00,000, plant Rs. 2,50,00,000, a term loan of Rs. 2,50,00,000 over 15 years after a month's holiday), the rate
 * (9.3%) and the sales model-worked so that only the fixed-asset cover misses, as on the owner's recording.
 *
 * By hand, as the second computation: the net block after k full years of written-down value is 50,00,000 × 0.9^k +
 * 2,50,00,000 × 0.85^k (the engine takes a whole year's depreciation in the first, part year); the loan left after j
 * instalments is P(1 + i)^j − EMI((1 + i)^j − 1) ÷ i, i = 9.3% ÷ 12, EMI as Excel's PMT. Drawn in October 2026, a month's
 * holiday: by 31 March of the k-th year (2026-27 being the first) 6 + 12(k − 1) months have passed and 5 + 12(k − 1)
 * instalments are paid. The cover starts near 1.20 (3 crore against 2.5) and falls: 0.4957 in 2035-36.
 */
import { describe, it, expect } from 'vitest';
import { projectReport, type Report, type ReportInput } from '../engine/report';
import { diagnose } from '../engine/ratios';
import { fixOf } from '../engine/fix';

export const F: ReportInput = {
  taxBy: 'proprietor', cost: { building: 5000000, machinery: 25000000 },
  loan: { amount: 25000000, ratePct: 9.3, disbursed: '2026-10', moratoriumMonths: 1, instalments: 180, frequency: 'monthly', style: 'emi' },
  salesBy: 'drivers', monthsToStart: 1, products: [{ name: 'Widgets', unitsMonth: 10000, price: 1500 }], priceGrowthPct: 0, utilisationPct: [60, 70, 80],
  variablePct: 60, fixedCosts: 12000000, fixedGrowthPct: 5, days: { stock: 30, debtors: 30, creditors: 30 }, wcLimit: 5300000, wcRatePct: 9.3,
};
const i = 9.3 / 1200;
const left = (p: number, n: number, j: number) => (j >= n ? 0 : p * (1 + i) ** j - ((p * i) / (1 - (1 + i) ** -n)) * (((1 + i) ** j - 1) / i));
const block = (k: number) => 5000000 * 0.9 ** k + 25000000 * 0.85 ** k;
/** The lowest fixed-asset cover by hand over the years the loan runs, with loan `p` over `n` instalments. */
const lowest = (p: number, n: number) => Math.min(...Array.from({ length: 16 }, (_, k) => k + 1).filter((k) => 5 + 12 * (k - 1) < n).map((k) => block(k) / left(p, n, 5 + 12 * (k - 1))));
const facr = (r: Report) => Math.min(...r.years.filter((y) => y.facr !== undefined).map((y) => y.facr as number));

describe('the fix beside the miss (OR2)', () => {
  it('case F misses only the fixed-asset cover: the plant loses value faster than the loan is repaid', () => {
    const r = projectReport(F) as Report, d = diagnose(r, F);
    expect(d.misses).toEqual(['facr']);
    expect(facr(r)).toBeCloseTo(lowest(25000000, 180), 9);
    expect(lowest(25000000, 180).toFixed(4)).toBe('0.4957');
    // A shorter repayment alone cannot meet it: the first year's cover is under 1.20 at any term, even 3 years.
    expect(block(1) / left(25000000, 36, 5)).toBeLessThan(1.2);
  });

  it('proposes the least strained fix first: 10 years and Rs. 1,75,00,000; then the 15 years kept and Rs. 1,03,20,000', () => {
    const f = fixOf(F)!;
    expect(f.missed).toEqual(['facr']);
    expect(f.fixes.map((k) => [k.instalments.needed, k.loan.needed, k.loan.more])).toEqual([[120, 17500000, 7500000], [180, 10320000, 14680000]]);
    // By hand: each meets, and Rs. 10,000 more (the step at four figures) misses.
    expect(lowest(17500000, 120)).toBeGreaterThanOrEqual(1.2);
    expect(lowest(17510000, 120)).toBeLessThan(1.2);
    expect(lowest(10320000, 180)).toBeGreaterThanOrEqual(1.2);
    expect(lowest(10330000, 180)).toBeLessThan(1.2);
    expect(facr(f.fixes[0].report)).toBeCloseTo(lowest(17500000, 120), 9);
    // The strain: 60 of 180 months and 75 of 250 lakh, the larger a third; keeping 15 years gives 1,46,80,000 of 2.5 crore.
    expect(f.fixes[0].strain).toBeCloseTo(1 / 3, 12);
    expect(f.fixes[1].strain).toBeCloseTo(14680000 / 25000000, 12);
    // Least strained: at 11 years a loan cut by a third still misses, so 11 years strains more; 9 years gives 0.4 of the term.
    expect(lowest(25000000 * (2 / 3), 132)).toBeLessThan(1.2);
    expect(f.fixes[0].levers).toMatchObject({ promoters: 7500000, instalments: -60 });
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
