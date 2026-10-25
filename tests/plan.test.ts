/**
 * The combined plan (engine/plan.ts, D-UX-52, MV3) on fictional case R at 70 lakh (tests/viable.test.ts, worked by hand
 * there) and case P (drivers, PMEGP). Hand working, year 1 (2026-27) of case R, the first year binding throughout:
 * - Term loan T over n monthly instalments: interest T × (12 − 66/n) × 10/1200, principal 12T/n.
 * - Profit before tax 0.35 S − 22,40,000 − the loan's interest − 0.11 W (W the limit); tax 31.2% when above nil.
 * - The promoters bring 33,00,000 + the margin − T, the margin being the debtors less the limit, 30/365 of S − W (stock
 *   and creditors are both 30 days of materials, so they cancel).
 * With the promoters' most at 12,00,000:
 * - The limit first: the current ratio (8,72,231.74 − 0.11 W) ÷ (W + 3,73,972.60) reaches 1.10 at W ≤ 3,80,877.59
 *   (viable.test.ts), so W = 3,80,877, a cut of 1,19,123 (3,80,878 gives 20,758,379 ÷ 18,871,265 = 1.0999994).
 * - Then the term loan and sales together: the promoters' most holds while T ≥ 17,19,123 + 30 S/365; the lowest DSCR
 *   (profit after tax + 4,40,000 + interest) ÷ (interest + T/5) reaches 1.25 first at S = 70,00,000 × 1.143 = 80,01,000,
 *   T = 23,76,740 (17,19,123 + 6,57,616.44, rounded up): DSCR 1.250013, the promoters 11,99,999.44. At 1.142, S =
 *   79,94,000 and T = 23,76,165: DSCR 1.247853 (worked in exact fractions).
 */
import { describe, it, expect } from 'vitest';
import { projectReport, type Report, type ReportInput } from '../engine/report';
import { diagnose } from '../engine/ratios';
import { AS_TYPED, makePlan, salesLimit, withLevers, type Levers, type Plan } from '../engine/plan';
import { CASE_R } from './report.test';
import { P } from './viable.test';

const weak: ReportInput = { ...CASE_R, sales: 7000000 };
const report = (x: ReportInput, l: Partial<Levers>) => { const y = withLevers(x, { ...AS_TYPED, ...l }); return { y, r: projectReport(y) as Report }; };
const misses = (x: ReportInput, l: Partial<Levers>) => { const { y, r } = report(x, l); return diagnose(r, y).misses; };

describe('case R at 70 lakh, the promoters able to bring 12 lakh in all', () => {
  const p = makePlan(weak, { promotersMost: 1200000 }) as Plan;
  it('the limit, then the term loan, then sales, as worked by hand', () => {
    expect(p.levers).toEqual({ ...AS_TYPED, wc: 119123, promoters: 123260, sales: 143 });
    const { y, r } = report(weak, p.levers);
    expect([y.wcLimit, y.loan.amount, y.sales]).toEqual([380877, 2376740, 8001000]);
    expect(r.lowest?.dscr).toBeCloseTo(1.250013, 6);
    expect(r.finance.promoter).toBeCloseTo(1199999.44, 2);
  });
  it('works, the promoters at their most', () => {
    expect([p.works, p.still, p.atLimit]).toEqual([true, [], ['wc', 'promoters']]);
    expect(p.promoters.plan).toBeCloseTo(1199999.44, 2);
    expect(p.promoters.now).toBeCloseTo(875342.47, 2);
  });
  it('each the least: a rupee less on the limit, or 0.1% less sales, misses', () => {
    expect(misses(weak, { wc: 119122 })).toContain('currentRatio');
    expect(report(weak, { ...p.levers, sales: 142 }).r.lowest?.dscr).toBeCloseTo(1.247574, 5);
    // A rupee more off the term loan and the promoters pass their most.
    expect(report(weak, { ...p.levers, promoters: 123261 }).r.finance.promoter).toBeGreaterThan(1200000);
  });
});

describe('case R at 70 lakh, no figure for the promoters', () => {
  const p = makePlan(weak) as Plan;
  it('none of their money is assumed: sales alone, 17.3% higher (viable.test.ts)', () => {
    expect(p.levers).toEqual({ ...AS_TYPED, sales: 173 });
    expect(p.works).toBe(true);
    // Their margin still grows with sales: 8,75,342.47 + 12,11,000 × 30/365 = 9,74,876.71.
    expect(p.promoters.plan).toBeCloseTo(974876.71, 2);
  });
});

describe('the lender\'s steps never trade a level met', () => {
  // Sales and the moratorium held as typed. Year 1's cash with n instalments, below nil profit so no tax:
  // 3,45,000 − 2,86,25,000/n; the current ratio (12,94,315.07 − 2,86,25,000/n) ÷ 8,73,972.60 reaches 1.10 at n ≥ 85.97:
  // 86 gives 1.10011, 85 gives 1.0956. The lowest DSCR 5,95,000 ÷ (2,50,000 + 2,86,25,000/n) needs n ≥ 126.66, but by
  // then the fixed-asset cover misses in a later year (the report), so the plan stops at 86. Interest cover only rises with
  // sales or less debt: no change of term meets it.
  const p = makePlan(weak, { held: { sales: 0, moratorium: 0 } }) as Plan;
  it('26 more instalments, the current ratio and the average DSCR met, the rest named', () => {
    expect(p.levers).toEqual({ ...AS_TYPED, instalments: 26 });
    expect(misses(weak, { instalments: 25 })).toContain('currentRatio');
    expect([p.works, p.still]).toEqual([false, ['dscrLowest', 'interestCover']]);
    const at127 = report(weak, { instalments: 67 }), d = diagnose(at127.r, at127.y);
    expect(at127.r.lowest?.dscr).toBeGreaterThanOrEqual(1.25);
    expect(d.misses).toContain('facr');
  });
});

describe('collateral, last', () => {
  it('case R with a 20 lakh limit and 3 lakh typed: only the cover misses, Rs. 4,36,226 in all (viable.test.ts)', () => {
    const x = { ...CASE_R, wcLimit: 2000000, collateral: 300000 };
    const p = makePlan(x) as Plan;
    expect(p.levers).toEqual({ ...AS_TYPED, collateral: 136226 });
    expect(p.works).toBe(true);
    expect(p.diagnosis.checks.find((c) => c.id === 'securityCover')?.meets).toBe(true);
  });
});

describe('by the drivers: the use of the capacity, no year above 85%', () => {
  it('case P at 60, 70, 80%: the limit lifts 60 to 85, 417 tenths (85/60 = 1.41667)', () => {
    expect(salesLimit(P)).toBe(417);
    expect(withLevers(P, { ...AS_TYPED, sales: 417 }).utilisationPct).toEqual([85, 85, 85]);
    expect(withLevers(P, { ...AS_TYPED, sales: 100 }).utilisationPct).toEqual([66, 77, 85]);
    expect(withLevers(P, { ...AS_TYPED, sales: 33 }).utilisationPct).toEqual([61.98, 72.31, 82.64]);
  });
  it('a weak case leaves sales as typed when the most meets no level more (OR2), then says what still misses', () => {
    const x = { ...P, price: 100 }, p = makePlan(x) as Plan, y = withLevers(x, { ...AS_TYPED, sales: 417 });
    expect(diagnose(projectReport(y) as Report, y).misses).toEqual(p.still);
    expect(p.levers.sales).toBe(0);
    expect(p.atLimit).not.toContain('sales');
    expect(p.works).toBe(false);
    expect(p.still.length).toBeGreaterThan(0);
  });
});

describe('the figures a plan writes', () => {
  it('sales rounded up to the rupee, fixed costs down; as typed when nothing moves', () => {
    expect(withLevers(weak, { ...AS_TYPED, sales: 1 }).sales).toBe(7007000);
    expect(withLevers({ ...weak, sales: 7000001 }, { ...AS_TYPED, sales: 1 }).sales).toBe(7007002);
    expect(withLevers(weak, { ...AS_TYPED, fixed: 33 }).fixedCosts).toBe(1740600);
    expect(withLevers(weak, AS_TYPED)).toEqual(weak);
  });
  it('a held lever stays as the borrower set it', () => {
    const p = makePlan(weak, { promotersMost: 1200000, held: { fixed: 50 } }) as Plan;
    expect(p.levers.fixed).toBe(50);
    expect(p.works).toBe(true);
    expect(p.levers.sales).toBeLessThan(143);
  });
});
