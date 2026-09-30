/**
 * DSCR on fictional case A (docs/GOLDEN-CASES.md). The expected figures are worked by hand below: model-worked, not
 * yet golden, until the owner's own Excel or a public worked example confirms them (D-BIZ-02).
 */
import { describe, it, expect } from 'vitest';
import DATA from '../engine/data/dscr.json';
import {
  dscrStatement, maxLoanAmount, planStatement, shortestRepayment,
  type Definition, type Plan, type ProjectionYear, type Statement, type YearFigures,
} from '../engine/dscr';
import type { LoanTerms } from '../engine/loan';

const year = (fy: string, pbdit: number, depreciation: number): ProjectionYear =>
  ({ fy, pbdit, depreciation, nonCash: 0, interestOther: 50000, otherLoansInterest: 0, otherLoansPrincipal: 0, taxPct: 25 });
const CASE_A = [year('2026-27', 500000, 150000), year('2027-28', 750000, 130000), year('2028-29', 800000, 110000), year('2029-30', 800000, 100000)];
const LOAN: LoanTerms = { amount: 1200000, ratePct: 12, disbursed: '2026-04', moratoriumMonths: 6, instalments: 12, frequency: 'quarterly', style: 'equal-principal' };
const COMMON: Definition = { interest: 'term-loans', leases: 'no', years: 'repayment', average: 'totals' };

const rows = (s: Statement) => s.rows.map((x) => [x.fy, Math.round(x.available), Math.round(x.service), x.dscr?.toFixed(4)]);
const planned = (def: Definition) => (planStatement(CASE_A, LOAN, def) as Plan).statement;

describe('fictional case A, common definition', () => {
  // Interest by year (tests/loan.test.ts): 1,41,000 · 1,02,000 · 54,000 · 9,000; principal 2, 4, 4, 2 lakh.
  // 2026-27: profit before tax = 5,00,000 − 1,50,000 − 1,41,000 − 50,000 = 1,59,000; tax 39,750; profit after tax 1,19,250.
  //   Cash available = 1,19,250 + 1,50,000 + 1,41,000 = 4,10,250 (= 5,00,000 − 50,000 − 39,750).
  //   Debt service = 1,41,000 + 2,00,000 = 3,41,000. DSCR 1.2031.
  // 2027-28: before tax 4,68,000, tax 1,17,000 → cash 5,83,000 / 5,02,000 = 1.1614.
  // 2028-29: before tax 5,86,000, tax 1,46,500 → cash 6,03,500 / 4,54,000 = 1.3293.
  // 2029-30: before tax 6,41,000, tax 1,60,250 → cash 5,89,750 / 2,09,000 = 2.8218.
  it('year by year, average of totals and the lowest year', () => {
    const s = planned(COMMON);
    expect(rows(s)).toEqual([
      ['2026-27', 410250, 341000, '1.2031'],
      ['2027-28', 583000, 502000, '1.1614'],
      ['2028-29', 603500, 454000, '1.3293'],
      ['2029-30', 589750, 209000, '2.8218'],
    ]);
    // 21,86,500 / 15,06,000 = 1.4519
    expect(s.average?.toFixed(4)).toBe('1.4519');
    expect(s.minimum?.fy).toBe('2027-28');
  });
  it('the simple average of the yearly DSCRs is much higher: (1.2031 + 1.1614 + 1.3293 + 2.8218) / 4 = 1.6289', () => {
    expect(planned({ ...COMMON, average: 'mean' }).average?.toFixed(4)).toBe('1.6289');
  });
  it('counting working-capital interest: 2027-28 is 6,33,000 / 5,52,000 = 1.1467', () => {
    expect(rows(planned({ ...COMMON, interest: 'all-borrowings' }))[1]).toEqual(['2027-28', 633000, 552000, '1.1467']);
  });
  it('cash accruals against instalments only: 4,81,000 / 4,00,000 = 1.2025 in 2027-28; average 18,80,500 / 12,00,000', () => {
    const s = planned({ ...COMMON, interest: 'none' });
    expect(rows(s)[1]).toEqual(['2027-28', 481000, 400000, '1.2025']);
    expect(s.average?.toFixed(4)).toBe('1.5671');
  });
});

describe('the loan that meets a target (fictional case A)', () => {
  // Every schedule figure scales with the loan: at k × 12 lakh, cash available in a year = 0.75 × (PBDIT − 50,000)
  // + 0.25 × depreciation + 0.25 × k × interest, and debt service = k × (interest + principal).
  // Average: (21,10,000 + 76,500 k) / (15,06,000 k) ≥ 1.5  →  k ≤ 21,10,000 / 21,82,500  →  Rs. 11,60,137.
  // 2027-28: (5,57,500 + 25,500 k) / (5,02,000 k) ≥ 1.2  →  k ≤ 5,57,500 / 5,76,900  →  Rs. 11,59,646.
  const { amount: _, ...terms } = LOAN;
  it('average of 1.50', () => {
    expect(maxLoanAmount(CASE_A, terms, COMMON, { average: 1.5 })).toMatchObject({ amount: 1160137, limitedBy: { kind: 'average' } });
  });
  it('lowest year of 1.20, and both together', () => {
    expect(maxLoanAmount(CASE_A, terms, COMMON, { minimum: 1.2 })).toMatchObject({ amount: 1159646, limitedBy: { kind: 'minimum', fy: '2027-28' } });
    expect(maxLoanAmount(CASE_A, terms, COMMON, { average: 1.5, minimum: 1.2 })).toMatchObject({ amount: 1159646 });
  });
  it('fewest instalments for a lowest year of 1.20: 13 (12 give 1.1614)', () => {
    // 13 quarterly instalments of 92,307.69: 2027-28 interest 1,05,230.77 and principal 3,69,230.77, so
    // cash (5,57,500 + 26,307.69) / debt service 4,74,461.54 = 1.2305, the lowest year.
    const r = shortestRepayment(CASE_A, { ...LOAN, instalments: undefined }, COMMON, { minimum: 1.2 });
    expect(r).toMatchObject({ instalments: 13 });
    const s = (r as { plan: Plan }).plan.statement;
    expect([s.minimum?.fy, s.minimum?.dscr.toFixed(4)]).toEqual(['2027-28', '1.2305']);
  });
  it('says why when no repayment within the projections is enough', () => {
    const r = shortestRepayment(CASE_A, { ...LOAN, instalments: undefined }, COMMON, { minimum: 1.5 });
    expect((r as { none: string }).none).toMatch(/^Even 14 instalments, the most the projections cover \(to 2029-30\), miss the target.*Add later years/);
  });
});

describe('which years count', () => {
  // Year 1 is a moratorium year (interest only). Its DSCR of 3.00 lifts the average when every year with debt service counts.
  const Y: YearFigures[] = [
    { fy: '2026-27', pat: 60000, depreciation: 40000, nonCash: 0, interestTL: 50000, principalTL: 0 },
    { fy: '2027-28', pat: 80000, depreciation: 40000, nonCash: 0, interestTL: 40000, principalTL: 100000 },
    { fy: '2028-29', pat: 100000, depreciation: 40000, nonCash: 0, interestTL: 20000, principalTL: 100000 },
  ];
  it('years with an instalment: 3,20,000 / 2,60,000 = 1.2308', () => {
    const s = dscrStatement(Y, COMMON) as Statement;
    expect(s.rows.map((x) => x.counted)).toEqual([false, true, true]);
    expect([s.average?.toFixed(4), s.minimum?.fy]).toEqual(['1.2308', '2027-28']);
  });
  it('every year with debt service: 4,70,000 / 3,10,000 = 1.5161; simple average (3 + 1.1429 + 1.3333) / 3 = 1.8254', () => {
    expect((dscrStatement(Y, { ...COMMON, years: 'debt-service' }) as Statement).average?.toFixed(4)).toBe('1.5161');
    expect((dscrStatement(Y, { ...COMMON, years: 'debt-service', average: 'mean' }) as Statement).average?.toFixed(4)).toBe('1.8254');
  });
});

describe('a missing fact is never assumed', () => {
  it('names what is needed and shows no figures', () => {
    const proj = CASE_A.map((y) => (y.fy === '2027-28' ? { ...y, taxPct: undefined } : y));
    expect(planStatement(proj, { ...LOAN, amount: undefined }, COMMON)).toEqual({ needs: ['Loan amount', 'Tax rate (%) for 2027-28'] });
    expect(planStatement(CASE_A.slice(0, 3), LOAN, COMMON)).toEqual({ needs: ['Projections for 2029-30: the loan is still running then'] });
    expect(dscrStatement([{ fy: '2026-27', pat: 1, depreciation: 1, nonCash: 0, principalTL: 1 }], COMMON)).toEqual({ needs: ['Interest on term loans for 2026-27'] });
    expect(maxLoanAmount(CASE_A, LOAN, COMMON, {})).toEqual({ needs: ['A target DSCR for the average, the lowest year, or both'] });
  });
});

describe('the second computation guards every figure', () => {
  it('blocks the result when the data file and the independent formulas disagree', () => {
    const broken = structuredClone(DATA);
    broken.options.interest.choices['term-loans'].adds = [];
    const y: YearFigures[] = [{ fy: '2026-27', pat: 100, depreciation: 10, nonCash: 0, interestTL: 20, principalTL: 50 }];
    expect(dscrStatement(y, COMMON, broken)).toEqual({ blocked: 'The two computations disagree on 2026-27, so no figures are shown. Please report this.' });
    expect('rows' in dscrStatement(y, COMMON)).toBe(true);
  });
});
