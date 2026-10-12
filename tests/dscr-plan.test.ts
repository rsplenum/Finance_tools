/**
 * Make it viable on the DSCR front door (engine/dscr-plan.ts, MV5, D-UX-57) on fictional case S: a firm (tax 31.2%), this
 * year's profit before interest, depreciation and tax Rs. 4,50,000 with no growth, no depreciation and no running EMIs; a
 * loan of Rs. 12,00,000 at 12% by 60 monthly EMIs, drawn in October 2026 with the first EMI that month. Target: average
 * 1.50, lowest year 1.20. Worked outside the engine by a separate loop of the EMI schedule and closed forms (model-worked):
 * - Each year's cash available is P − 0.312 (P − I) for profit P and the loan's interest I in it; its service the EMIs in
 *   it (6 in 2026-27, 12 a year to 2030-31, 6 in 2031-32). EMI 26,693.3372.
 * - As typed: average 19,82,899.27 ÷ 16,01,600.23 = 1.238074; lowest 1.002861 in 2030-31 (interest 37,296.14, service
 *   3,20,320.05). Short of cash: 1.2 × 3,20,320.05 − 3,21,236.40 = 63,147.66 in 2030-31; 1.5 × 16,01,600.23 −
 *   19,82,899.27 = 4,19,501.08 over the loan.
 * - The loan alone (interest and service per rupee lent): the average binds, L ≤ 6 × 0.688 P ÷ (1.5 ΣS − 0.312 ΣI) =
 *   9,78,928.88, so Rs. 9,78,928, a cut of 2,21,072 (the lowest year's bound is 9,96,706.46).
 * - The profit alone: the average binds, P ≥ (1.5 ΣS − 0.312 ΣI) ÷ (6 × 0.688) = 5,51,623.32, so 1,01,624 more (the
 *   lowest year's bound is 5,41,784.39).
 * - The repayment alone: 80 EMIs meet (lowest 1.205230, average 1.514052); 79 miss the lowest (1.192663).
 * - With the borrower able to bring Rs. 1,00,000: the loan 11,00,000, then 70 EMIs (lowest 1.207466, average 1.500407);
 *   69 miss the lowest (1.192966).
 * - At Rs. 2,50,000 of profit: no repayment within 180 months meets; the nearest, min(lowest ÷ 1.20, average ÷ 1.50), is
 *   175 EMIs (0.830485: the last year then holds one EMI against a whole year's cash, which lifts the average), and
 *   there the average binds: P ≥ 3,08,817.86, so 58,818 more.
 */
import { describe, it, expect } from 'vitest';
import { fyRange, type Definition, type Plan, type ProjectionYear } from '../engine/dscr';
import { DSCR_AS_TYPED, cashShort, dscrViable, makeDscrPlan, moreRoom, runDscr, withDscrLevers, type DscrCase, type DscrPlan, type DscrViability } from '../engine/dscr-plan';

const COMMON: Definition = { interest: 'term-loans', leases: 'no', years: 'repayment', average: 'totals' };
const proj = (p: number): ProjectionYear[] => fyRange('2026-27', 16).map((fy) => ({
  fy, pbdit: p, assetIncome: 0, depreciation: 0, nonCash: 0, interestOther: 0, otherLoansInterest: 0, otherLoansPrincipal: 0, existingEmis: 0, taxBy: 'firm',
}));
export const CASE_S: DscrCase = {
  proj: proj(450000), shown: 6, def: COMMON, target: { average: 1.5, minimum: 1.2 },
  loan: { amount: 1200000, ratePct: 12, disbursed: '2026-10', moratoriumMonths: 0, instalments: 60, frequency: 'monthly', style: 'emi' },
};
const at = (c: DscrCase, l: Partial<typeof DSCR_AS_TYPED>) => (runDscr(c, { ...DSCR_AS_TYPED, ...l }) as Plan).statement;

describe('fictional case S, as typed', () => {
  const s = at(CASE_S, {});
  it('misses both levels, as worked by hand', () => {
    expect(s.average).toBeCloseTo(1.238074, 6);
    expect([s.minimum?.dscr.toFixed(6), s.minimum?.fy]).toEqual(['1.002861', '2030-31']);
    expect(s.rows.map((r) => r.fy)).toEqual(fyRange('2026-27', 6));
  });
  it('short of cash in the lowest year and over the loan', () => {
    const k = cashShort(s, CASE_S.target, COMMON);
    expect(k.lowest?.fy).toBe('2030-31');
    expect(k.lowest?.amount).toBeCloseTo(63147.66, 2);
    expect(k.average).toBeCloseTo(419501.08, 2);
  });
  it('180 months hold 120 more EMIs', () => expect(moreRoom(CASE_S.loan)).toBe(120));
});

describe('each lever alone', () => {
  const v = dscrViable(CASE_S) as DscrViability;
  it('the loan, the repayment and the profit, as worked by hand', () => {
    expect(v.meets).toBe(false);
    expect([v.cut.needed, v.more.needed, v.profit.needed]).toEqual([221072, 20, 101624]);
  });
  it('a rupee, an EMI or a rupee less misses', () => {
    const ok = (l: Partial<typeof DSCR_AS_TYPED>) => { const s = at(CASE_S, l); return s.average! >= 1.5 && s.minimum!.dscr >= 1.2; };
    expect([ok({ cut: 221072 }), ok({ cut: 221071 })]).toEqual([true, false]);
    expect([ok({ more: 20 }), ok({ more: 19 })]).toEqual([true, false]);
    expect([ok({ profit: 101624 }), ok({ profit: 101623 })]).toEqual([true, false]);
    expect(at(CASE_S, { more: 20 }).minimum?.dscr).toBeCloseTo(1.205230, 6);
    expect(at(CASE_S, { more: 19 }).minimum?.dscr).toBeCloseTo(1.192663, 6);
  });
  it('the longer repayment brings its later years in; the profit moves every year in proportion', () => {
    expect(withDscrLevers(CASE_S, { ...DSCR_AS_TYPED, more: 20 }).proj.map((y) => y.fy).at(-1)).toBe('2033-34');
    expect(withDscrLevers(CASE_S, { ...DSCR_AS_TYPED, profit: 101624 }).proj.map((y) => y.pbdit)).toEqual(Array(6).fill(551624));
  });
});

describe('the levers together, in the owner’s order', () => {
  it('without the most the borrower can bring: the loan stays, 20 more EMIs, no profit needed', () => {
    const p = makeDscrPlan(CASE_S) as DscrPlan;
    expect([p.levers, p.works, p.atLimit]).toEqual([{ cut: 0, more: 20, profit: 0 }, true, []]);
  });
  it('with Rs. 1,00,000 from the borrower: all of it off the loan, then 10 more EMIs', () => {
    const p = makeDscrPlan(CASE_S, { most: 100000 }) as DscrPlan;
    expect([p.levers, p.works, p.atLimit]).toEqual([{ cut: 100000, more: 10, profit: 0 }, true, ['cut']]);
    expect(p.plan.statement.minimum?.dscr).toBeCloseTo(1.207466, 6);
    expect(p.plan.statement.average).toBeCloseTo(1.500407, 6);
    expect(at(CASE_S, { cut: 100000, more: 9 }).minimum?.dscr).toBeCloseTo(1.192966, 6);
  });
  it('with Rs. 3,00,000 from the borrower: the cut the target needs, no more', () => {
    expect((makeDscrPlan(CASE_S, { most: 300000 }) as DscrPlan).levers).toEqual({ cut: 221072, more: 0, profit: 0 });
  });
  it('at Rs. 2,50,000 of profit: the nearest repayment, then the profit for the rest', () => {
    const weak = { ...CASE_S, proj: proj(250000) }, v = dscrViable(weak) as DscrViability, p = makeDscrPlan(weak) as DscrPlan;
    expect(v.more.none).toBe('Even 120 more instalments, the whole term 180 months, miss the target.');
    expect([p.levers, p.works, p.atLimit]).toEqual([{ cut: 0, more: 115, profit: 58818 }, true, []]);
    expect(at(weak, { more: 115, profit: 58817 }).average).toBeLessThan(1.5);
  });
  it('a lever the borrower holds stays where they set it', () => {
    const p = makeDscrPlan(CASE_S, { held: { more: 0 } }) as DscrPlan;
    expect(p.levers).toEqual({ cut: 0, more: 0, profit: 101624 });
  });
});
