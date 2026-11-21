/**
 * DSCR row B: past years from the books before the projected ones (engine/dscr.ts pastStatement, engine/dscr-check.ts
 * pastCheck). Fictional case H, model-worked by hand and again by a separate Python loop (not from any real borrower):
 * - 2023-24: profit before tax 10,00,000, tax 2,60,000 (after tax 7,40,000), depreciation 2,00,000, finance cost 6,00,000
 *   of which 2,00,000 on term loans, principal repaid 4,00,000.
 *   Common method: cash 7,40,000 + 2,00,000 + 2,00,000 = 11,40,000; service 4,00,000 + 2,00,000 = 6,00,000; DSCR 1.90.
 * - 2024-25: before tax 12,00,000, tax 3,00,000 (after 9,00,000), depreciation 2,50,000, finance cost 8,00,000 not split,
 *   principal 5,00,000. The whole 8,00,000 is taken as term-loan interest: cash 9,00,000 + 2,50,000 + 8,00,000 =
 *   19,50,000; service 5,00,000 + 8,00,000 = 13,00,000; DSCR 1.50. Had 3,00,000 of it been on term loans: 14,50,000 ÷
 *   8,00,000 = 1.8125, so the assumption gave the lower figure.
 * - 2025-26: before tax 8,00,000, tax 2,00,000 (after 6,00,000), depreciation 3,00,000, finance cost 9,00,000 of which
 *   1,50,000 on term loans, nothing repaid: cash 10,50,000, service 1,50,000, 7.00, but not counted by the common method
 *   (no instalment).
 * - Common average by totals: (11,40,000 + 19,50,000) ÷ (6,00,000 + 13,00,000) = 30,90,000 ÷ 19,00,000 = 1.626316;
 *   lowest 1.50 in 2024-25.
 * - RBI 2020 (all interest, years with debt service): 15,40,000 ÷ 10,00,000 = 1.54; 19,50,000 ÷ 13,00,000 = 1.50;
 *   18,00,000 ÷ 9,00,000 = 2.00; average 52,90,000 ÷ 32,00,000 = 1.653125 (the hand sum first said 53,40,000; the
 *   Python loop caught it).
 */
import { describe, it, expect } from 'vitest';
import { pastStatement, pastNeeds, type Definition, type Past, type PastYear } from '../engine/dscr';
import { START, preview, type State } from '../site/src/dscr/model';

const COMMON: Definition = { interest: 'term-loans', leases: 'no', years: 'repayment', average: 'totals' };
const RBI: Definition = { interest: 'all-borrowings', leases: 'no', years: 'debt-service', average: 'totals' };
const H: PastYear[] = [
  { fy: '2023-24', pbt: 1000000, tax: 260000, depreciation: 200000, financeCost: 600000, interestTL: 200000, principalTL: 400000 },
  { fy: '2024-25', pbt: 1200000, tax: 300000, depreciation: 250000, financeCost: 800000, principalTL: 500000 },
  { fy: '2025-26', pbt: 800000, tax: 200000, depreciation: 300000, financeCost: 900000, interestTL: 150000, principalTL: 0 },
];
const run = (def: Definition, past = H, before = '2026-27') => pastStatement(past, def, before) as Past;

describe('Past years from the books (DSCR row B, case H)', () => {
  it('works each year from its own books, the unsplit finance cost taken as term-loan interest', () => {
    const p = run(COMMON), r = p.statement.rows;
    expect(r.map((x) => [x.fy, x.available, x.service, x.counted])).toEqual([
      ['2023-24', 1140000, 600000, true], ['2024-25', 1950000, 1300000, true], ['2025-26', 1050000, 150000, false]]);
    expect(r[0].dscr).toBeCloseTo(1.9, 9);
    expect(r[1].dscr).toBeCloseTo(1.5, 9);
    expect(r[2].dscr).toBeCloseTo(7, 9);
    expect(p.statement.average).toBeCloseTo(30.9 / 19, 9);
    expect(p.statement.minimum).toEqual({ dscr: 1.5, fy: '2024-25' });
    expect(p.profit.map((x) => x.splitAssumed)).toEqual([false, true, false]);
    expect(p.profit[1]).toMatchObject({ pat: 900000, interestTL: 800000, interestOther: 0, pbdit: 2250000 });
    expect(p.profit[0]).toMatchObject({ pat: 740000, interestTL: 200000, interestOther: 400000, pbdit: 1800000 });
  });

  it('the split, once given, lifts the year: the assumption errs low above 1', () => {
    const given = run(COMMON, H.map((y) => (y.fy === '2024-25' ? { ...y, interestTL: 300000 } : y)));
    expect(given.statement.rows[1].dscr).toBeCloseTo(1.8125, 9);
    expect(given.profit[1].splitAssumed).toBe(false);
  });

  it('works by the RBI 2020 method too: all interest, every year with debt service', () => {
    const p = run(RBI);
    expect(p.statement.rows.map((x) => x.dscr)).toEqual([1.54, 1.5, 2]);
    expect(p.statement.average).toBeCloseTo(1.653125, 9);
    expect(p.statement.minimum?.fy).toBe('2024-25');
  });

  it('keeps the years in order whatever order they are typed in', () => {
    expect(run(COMMON, [H[2], H[0], H[1]]).statement.rows.map((x) => x.fy)).toEqual(['2023-24', '2024-25', '2025-26']);
  });

  it('asks for what is missing, never takes it as 0', () => {
    const needs = pastNeeds([{ fy: '2025-26', pbt: 100, depreciation: 0, financeCost: 50, interestTL: 60 }], COMMON, '2026-27');
    expect(needs).toEqual([
      'Tax, current and deferred for 2025-26',
      'Term-loan principal repaid for 2025-26',
      'Of the finance cost, interest on term loans for 2025-26, no more than the finance cost',
    ]);
    expect(pastNeeds([{ ...H[0], fy: '2026-27' }], COMMON, '2026-27')).toEqual(['A past year before 2026-27, the first projected year, in place of 2026-27']);
    expect(pastNeeds([{ ...H[0], financeCost: -1 }], COMMON)).toContain('Finance cost (all interest) for 2023-24, as zero or more');
    expect('needs' in pastStatement([], COMMON)).toBe(true);
  });

  it('takes a loss and a tax credit as the books show them', () => {
    const p = run(COMMON, [{ fy: '2024-25', pbt: -100000, tax: -20000, depreciation: 300000, financeCost: 200000, interestTL: 200000, principalTL: 300000 }]);
    // After tax −80,000; cash −80,000 + 3,00,000 + 2,00,000 = 4,20,000; service 5,00,000; 0.84.
    expect(p.statement.rows[0]).toMatchObject({ available: 420000, service: 500000, dscr: 0.84 });
  });
});

// The page: case A's projections (tests/dscr-page.test.ts, from 2026-27) with case H's three years before them, typed as
// a user would; each line's figures by how far back the year is (2025-26 first).
const CASE_A: State = {
  ...START, source: 'plan', method: 'common', target: { average: '1.50', minimum: '1.20' },
  loan: { amount: '12 L', ratePct: '12', disbursed: '2026-04', moratoriumMonths: '6', instalments: '12', repayment: 'quarterly' },
  cells: { pbdit: ['5,00,000', '7,50,000', '8,00,000', '8,00,000'], depreciation: ['1,50,000', '1,30,000', '1,10,000', '1,00,000'], interestOther: ['50,000'], taxPct: ['25'] },
  modes: { pbdit: 'years', depreciation: 'years', nonCash: 'none', otherLoans: 'none', interestOther: 'same', taxPct: 'same' },
};
const WITH_H: State = { ...CASE_A, past: { count: 3, cells: {
  pbt: ['8 L', '12 L', '10 L'], tax: ['2,00,000', '3,00,000', '2,60,000'], depreciation: ['3 L', '2.5 L', '2 L'],
  financeCost: ['9 L', '8 L', '6 L'], interestTL: ['1.5 L', '', '2 L'], principalTL: ['0', '5 L', '4 L'],
} } };

describe('the page: past years before the projected ones', () => {
  it('shows the past years as their own statement, saying which years are past', () => {
    const p = preview(WITH_H), v = p.past!;
    expect(v.years).toEqual(['2023-24', '2024-25', '2025-26']);
    expect(v.statement?.lines.find((l) => l.id === 'dscr')?.values).toEqual(['1.90', '1.50', '7.00']);
    expect([v.average, v.lowest, v.lowestYear]).toEqual(['1.63', '1.50', '2024-25']);
    expect(v.line).toBe('From the books, 2023-24 to 2025-26: average 1.63, lowest 1.50 in 2024-25. The other figures are for the projected years, 2026-27 to 2029-30.');
    expect(v.notCounted).toBe('Not counted: 2025-26 (no term-loan instalment).');
    expect(v.parts).toEqual({ '2024-25': 'finance cost not split' });
    expect(v.statement?.lines.find((l) => l.label === 'Less: other interest')?.values).toEqual(['4,00,000', '0', '7,50,000']);
    expect(p.assumed.find((a) => a.id === 'pastSplit')).toMatchObject({ shown: 'All of it taken as interest on term loans: 2024-25', where: 'fld-past-interestTL-1' });
  });

  it('never changes the projected answer', () => {
    const a = preview(CASE_A), b = preview(WITH_H);
    expect([b.average, b.lowest, b.lowestYear, b.verdict?.text, b.largest?.text]).toEqual([a.average, a.lowest, a.lowestYear, a.verdict?.text, a.largest?.text]);
    expect(b.statement).toEqual(a.statement);
    expect(b.needs).toEqual([]);
  });

  it('asks for a missing past figure, keeping the answer provisional', () => {
    const p = preview({ ...WITH_H, past: { count: 3, cells: { ...WITH_H.past!.cells, tax: ['', '3,00,000', ''], principalTL: ['0', 'five', '4 L'] } } });
    expect(p.needs).toEqual(['From the books: tax, current and deferred for 2023-24 and 2025-26', 'From the books: term-loan principal repaid for 2024-25']);
    expect(p.past?.statement).toBeUndefined();
  });

  it('keeps each figure with its year back when the projections move a year later', () => {
    const later = preview({ ...WITH_H, loan: { ...WITH_H.loan, disbursed: '2027-04' } }).past!;
    expect(later.years).toEqual(['2024-25', '2025-26', '2026-27']);
    expect(later.statement?.lines.find((l) => l.id === 'dscr')?.values).toEqual(['1.90', '1.50', '7.00']);
  });
});
