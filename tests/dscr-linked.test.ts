/**
 * Linked sliders (engine/dscr-linked.ts, LOOP1, O12) on fictional case S of tests/dscr-plan.test.ts, whose figures were
 * worked outside the engine (model-worked): the repayment alone meets at 80 EMIs (79 miss); the loan alone at most
 * Rs. 9,78,928.88, a cut of 2,21,072; with Rs. 1,00,000 brought the loan 11,00,000 meets at 70 EMIs (69 miss). The room
 * is 120 instalments (180 − 60). Strains: 80 EMIs use 20 ÷ 120 = 0.1667 of the room; the loan at 9,70,000 (the largest in
 * whole Rs. 10,000) uses 2,30,000 of what the borrower can bring: 0.767 of 3 L, 0.1533 of 15 L.
 */
import { describe, it, expect } from 'vitest';
import { fyRange, shortfall, type ProjectionYear } from '../engine/dscr';
import { linked, type Linked } from '../engine/dscr-linked';
import type { DscrCase } from '../engine/dscr-plan';

// Case S as tests/dscr-plan.test.ts has it (that file is not imported, so its tests do not run twice).
const proj = (p: number): ProjectionYear[] => fyRange('2026-27', 16).map((fy) => ({
  fy, pbdit: p, assetIncome: 0, depreciation: 0, nonCash: 0, interestOther: 0, otherLoansInterest: 0, otherLoansPrincipal: 0, existingEmis: 0, taxBy: 'firm',
}));
const CASE_S: DscrCase = {
  proj: proj(450000), shown: 6, target: { average: 1.5, minimum: 1.2 },
  def: { interest: 'term-loans', leases: 'no', years: 'repayment', average: 'totals' },
  loan: { amount: 1200000, ratePct: 12, disbursed: '2026-10', moratoriumMonths: 0, instalments: 60, frequency: 'monthly', style: 'emi' },
};

const L = (most: number, held = {}) => linked(CASE_S, { most, step: 10000 }, held) as Linked;

describe('the linked solver on case S', () => {
  it('lengthens the repayment when the borrower brings nothing, the rate as typed', () => {
    const r = L(0);
    expect([r.terms, r.works, r.moved]).toEqual([{ amount: 1200000, instalments: 80, ratePct: 12 }, true, ['instalments']]);
  });
  it('lengthens before it cuts when the cut strains more (0.767 against 0.1667)', () => {
    expect(L(300000).terms).toEqual({ amount: 1200000, instalments: 80, ratePct: 12 });
  });
  it('cuts the loan when that strains less (0.1533 against 0.1667), in whole steps', () => {
    const r = L(1500000);
    expect([r.terms.amount, r.terms.instalments, r.moved, r.works]).toEqual([970000, 60, ['amount'], true]);
  });
  it('keeps a held repayment and finds the loan for it', () => {
    const r = L(100000, { instalments: 70 });
    expect(r.terms.instalments).toBe(70);
    expect(r.terms.amount).toBeGreaterThanOrEqual(1100000);
    expect(r.moved).toEqual(['amount']);
    expect(r.works && !shortfall(r.plan.statement, CASE_S.target)).toBe(true);
  });
  it('says no set works when a held repayment is too short and nothing can be brought', () => {
    const r = L(0, { instalments: 69 });
    expect([r.works, r.terms.instalments, r.terms.amount]).toEqual([false, 69, 1200000]);
  });
  it('moves nothing when the typed terms already meet', () => {
    const r = L(0, { amount: 900000 });
    expect([r.works, r.moved, r.terms.instalments]).toEqual([true, [], 60]);
  });
});
