/**
 * Linked sliders (engine/dscr-linked.ts, LOOP1, O12) on fictional case S of tests/dscr-plan.test.ts, whose figures were
 * worked outside the engine (model-worked): the repayment alone meets at 80 EMIs (79 miss); the loan alone at most
 * Rs. 9,78,928.88, a cut of 2,21,072; with Rs. 1,00,000 brought the loan 11,00,000 meets at 70 EMIs (69 miss). The room
 * is 120 instalments (180 − 60). Strains: 80 EMIs use 20 ÷ 120 = 0.1667 of the room; the loan at 9,70,000 (the largest in
 * whole Rs. 10,000) uses 2,30,000 of what the borrower can bring: 0.767 of 3 L, 0.1533 of 15 L.
 */
import { describe, it, expect } from 'vitest';
import { fyRange, shortfall, type ProjectionYear } from '../engine/dscr';
import { dscrOptions, follow, followerOf, linked, stopAt, type Followed, type LinkTerms } from '../engine/dscr-linked';
import type { Linked } from '../engine/dscr-linked';
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

// LOOP1b (D-UX-228): one lever answers a move from its home, the third stays; the same case S figures.
const TYPED: LinkTerms = { amount: 1200000, instalments: 60, ratePct: 12 };
const F = (most: number, t: Partial<LinkTerms>, moving: keyof LinkTerms, homes = {}, prefer?: 'amount' | 'instalments') =>
  follow(CASE_S, { most, step: 10000 }, { ...TYPED, ...t }, moving, homes, prefer) as Followed;
const KS = Array.from({ length: 169 }, (_, i) => 12 + i); // the repayment slider's stops, 12 to 180

describe('one lever follows the one moved', () => {
  it('names the follower: the loan for the repayment, the repayment for the loan, the rate by the page’s choice', () => {
    expect([followerOf('instalments', 1), followerOf('instalments', 0), followerOf('amount', 0), followerOf('ratePct', 1, 'amount'), followerOf('ratePct', 0, 'amount'), followerOf('ratePct', 1)])
      .toEqual(['amount', undefined, 'instalments', 'amount', 'instalments', 'instalments']);
  });
  it('lengthens the repayment to 70 EMIs for a loan of 11 L (69 miss)', () => {
    const r = F(300000, { amount: 1100000 }, 'amount');
    expect([r.terms, r.works, r.follower]).toEqual([{ amount: 1100000, instalments: 70, ratePct: 12 }, true, 'instalments']);
  });
  it('moves both ways: back to 80 for 12 L, home to 60 for 9.7 L', () => {
    expect(F(300000, { amount: 1200000 }, 'amount').terms.instalments).toBe(80);
    expect(F(300000, { amount: 970000 }, 'amount').terms.instalments).toBe(60);
  });
  it('gives way from where the borrower set it, not from what was typed', () => {
    const r = F(300000, { amount: 970000, instalments: 70 }, 'amount', { instalments: 70 });
    expect([r.terms.instalments, r.works]).toEqual([70, true]);
  });
  it('shrinks the loan for a shorter repayment and gives it back for a longer one', () => {
    const r = F(300000, { instalments: 70 }, 'instalments');
    expect(r.follower).toBe('amount');
    expect(r.terms.amount).toBeGreaterThanOrEqual(1100000); // 11 L meets at 70
    expect(r.terms.amount).toBeLessThan(1200000); // 12 L needs 80
    expect(r.terms.amount % 10000).toBe(0);
    expect(F(300000, { instalments: 80 }, 'instalments').terms.amount).toBe(1200000);
  });
  it('keeps a loan the borrower set when the rate moves (the owner’s case: the rate answered by the repayment)', () => {
    const r = F(300000, { amount: 1100000, ratePct: 11 }, 'ratePct', { amount: 1100000 }, 'instalments');
    expect(r.terms.amount).toBe(1100000);
    expect(r.terms.instalments).toBeGreaterThanOrEqual(60);
    expect(r.terms.instalments).toBeLessThanOrEqual(70);
    expect(r.works && !shortfall(r.plan.statement, CASE_S.target)).toBe(true);
  });
  it('stops a repayment let go too short where it first works', () => {
    expect(stopAt(CASE_S, { most: 0, step: 10000 }, TYPED, 'instalments', KS)).toBe(80);
    expect(stopAt(CASE_S, { most: 100000, step: 10000 }, TYPED, 'instalments', KS)).toBe(70);
  });
  it('stops at the nearest that works on either side, since a longer repayment can miss again (80 to 82 meet, 83 to 90 miss)', () => {
    expect(stopAt(CASE_S, { most: 0, step: 10000 }, { ...TYPED, instalments: 84 }, 'instalments', KS)).toBe(82);
    expect(stopAt(CASE_S, { most: 0, step: 10000 }, { ...TYPED, instalments: 89 }, 'instalments', KS)).toBe(91);
  });
});

describe('the ready plans and their cost', () => {
  // A second route for each: the EMI by its closed form, P·r ÷ (1 − (1 + r)^−n), and the interest as n EMIs less P.
  const emi = (p: number, n: number) => (p * 0.01) / (1 - 1.01 ** -n);
  const os = dscrOptions(CASE_S, { most: 300000, step: 10000 });
  it('offers the longer repayment, the own money and a mix', () => {
    expect(os.map((o) => o.id)).toEqual(['longer', 'own', 'mix']);
    expect(os.map((o) => [o.terms.amount, o.own])).toEqual([[1200000, 0], [970000, 230000], [1090000, 110000]]);
    expect([os[0].terms.instalments, os[1].terms.instalments]).toEqual([80, 60]);
    expect(os[2].terms.instalments).toBeGreaterThan(60);
    expect(os[2].terms.instalments).toBeLessThanOrEqual(70); // 11 L meets at 70, so 10.9 L does too
  });
  it('reads each plan’s EMI, interest and total paid out, worked a second way', () => {
    for (const o of os) {
      const n = o.terms.instalments, e = emi(o.terms.amount, n);
      expect(o.level).toBeCloseTo(e, 2);
      expect(Math.abs(o.interest - (e * n - o.terms.amount))).toBeLessThan(1);
      expect(Math.abs(o.paidOut - (o.own + e * n))).toBeLessThan(1);
      expect(!shortfall(o.plan.statement, CASE_S.target)).toBe(true);
    }
  });
  it('offers only the longer repayment when the borrower brings nothing', () => {
    expect(dscrOptions(CASE_S, { most: 0, step: 10000 }).map((o) => [o.id, o.terms.instalments])).toEqual([['longer', 80]]);
  });
});
