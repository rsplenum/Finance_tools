/**
 * DSCR on fictional case A (docs/GOLDEN-CASES.md). The expected figures are worked by hand below: model-worked, not
 * yet golden, until the owner's own Excel or a public worked example confirms them (D-BIZ-02).
 */
import { describe, it, expect } from 'vitest';
import DATA from '../engine/data/dscr.json';
import {
  amortization, dscrStatement, fyRange, loanTimeline, maxLoanAmount, planStatement, shortestRepayment,
  type Amortization, type Definition, type Plan, type ProjectionYear, type Statement, type YearFigures,
} from '../engine/dscr';
import type { LoanTerms } from '../engine/loan';

const year = (fy: string, pbdit: number, depreciation: number): ProjectionYear =>
  ({ fy, pbdit, assetIncome: 0, depreciation, nonCash: 0, interestOther: 50000, otherLoansInterest: 0, otherLoansPrincipal: 0, existingEmis: 0, taxPct: 25 });
const CASE_A = [year('2026-27', 500000, 150000), year('2027-28', 750000, 130000), year('2028-29', 800000, 110000), year('2029-30', 800000, 100000)];
const LOAN: LoanTerms = { amount: 1200000, ratePct: 12, disbursed: '2026-04', moratoriumMonths: 6, instalments: 12, frequency: 'quarterly', style: 'equal-principal' };
const COMMON: Definition = { interest: 'term-loans', leases: 'no', years: 'repayment', average: 'totals' };

const rows = (s: Statement) => s.rows.map((x) => [x.fy, Math.round(x.available), Math.round(x.service), x.dscr?.toFixed(4)]);
const planned = (def: Definition, proj: ProjectionYear[] = CASE_A) => (planStatement(proj, LOAN, def) as Plan).statement;

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
  // The Total column, by hand: profit before interest, depreciation and tax 5,00,000 + 7,50,000 + 8,00,000 + 8,00,000 =
  // 28,50,000; depreciation 4,90,000; interest on the term loan 3,06,000; on working capital 2,00,000; profit before tax
  // 28,50,000 − 4,90,000 − 3,06,000 − 2,00,000 = 18,54,000; tax at 25% 4,63,500; profit after tax 13,90,500.
  // A = 13,90,500 + 4,90,000 + 3,06,000 = 21,86,500; B = 12,00,000 + 3,06,000 = 15,06,000; 21,86,500 / 15,06,000 = 1.4519.
  it('the Total column: each line added up over the years counted; total A ÷ total B is the average', () => {
    const p = planStatement(CASE_A, LOAN, COMMON) as Plan, t = p.statement.total!;
    expect([t.available, t.service].map(Math.round)).toEqual([2186500, 1506000]);
    expect([t.figures.pat, t.figures.depreciation, t.figures.interestTL, t.figures.principalTL, t.figures.interestOther].map((x) => Math.round(x ?? NaN)))
      .toEqual([1390500, 490000, 306000, 1200000, 200000]);
    expect((t.available / t.service).toFixed(4)).toBe(p.statement.average?.toFixed(4));
    const pt = p.profitTotal!;
    expect([pt.pbdit, pt.depreciation, pt.interestTL, pt.interestOther, pt.pbt, pt.tax, pt.pat].map(Math.round))
      .toEqual([2850000, 490000, 306000, 200000, 1854000, 463500, 1390500]);
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
  it('the Total column leaves out the year not counted: profit after tax 80,000 + 1,00,000 = 1,80,000; A 3,20,000, B 2,60,000', () => {
    const t = (dscrStatement(Y, COMMON) as Statement).total!;
    expect([t.figures.pat, t.figures.principalTL, t.available, t.service]).toEqual([180000, 200000, 320000, 260000]);
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

describe('when the loan runs', () => {
  it('case A: instalments from the end of December 2026 to the end of September 2029', () => {
    // Drawn April 2026; months 1-6 are the moratorium; instalment 1 ends the next quarter (Oct-Dec); 12 quarters end in September 2029.
    expect(loanTimeline(LOAN)).toEqual({ years: ['2026-27', '2027-28', '2028-29', '2029-30'], firstInstalment: '2026-12', lastInstalment: '2029-09' });
  });
  it('one monthly instalment falls in the month drawn; the amount, rate and type do not matter', () => {
    expect(loanTimeline({ disbursed: '2027-03', moratoriumMonths: 0, instalments: 1, frequency: 'monthly' }))
      .toEqual({ years: ['2026-27'], firstInstalment: '2027-03', lastInstalment: '2027-03' });
    expect(loanTimeline({ ...LOAN, moratoriumMonths: undefined })).toEqual({ needs: ['Moratorium in months (0 if none)'] });
  });
  it('years run on across a century', () => {
    expect(fyRange('2098-99', 3)).toEqual(['2098-99', '2099-00', '2100-01']);
    expect(fyRange('2026', 2)).toEqual([]);
  });
});

describe('the repayment schedule, month by month', () => {
  const r2 = (x: number) => Math.round(x * 100) / 100;
  it('case A: interest every month on the balance, instalments of 1,00,000 from December 2026', () => {
    const a = amortization(LOAN) as Amortization, at = (m: string) => a.months.find((x) => x.month === m)!;
    expect(a.months).toHaveLength(42); // 6 months' moratorium + 12 quarters
    // April 2026: 1% of 12,00,000 and no principal; December 2026: instalment 1; September 2029: instalment 12 clears it.
    expect([r2(at('2026-04').opening), r2(at('2026-04').interest), at('2026-04').principal]).toEqual([1200000, 12000, 0]);
    expect([at('2026-12').instalment, r2(at('2026-12').principal), r2(at('2026-12').closing)]).toEqual([1, 100000, 1100000]);
    expect([at('2027-01').instalment, r2(at('2027-01').interest)]).toEqual([undefined, 11000]);
    expect([at('2029-09').instalment, r2(at('2029-09').closing)]).toEqual([12, 0]);
    expect(a.level).toBe(100000);
    // Totals by year, as in tests/loan.test.ts.
    expect(a.years.map((y) => [y.fy, r2(y.interest), r2(y.principal)])).toEqual([
      ['2026-27', 141000, 200000], ['2027-28', 102000, 400000], ['2028-29', 54000, 400000], ['2029-30', 9000, 200000],
    ]);
  });
  it('a textbook EMI: Rs. 10,00,000 at 12% for 12 months is Rs. 88,848.79; month 1 is 10,000 interest and 78,848.79 principal', () => {
    const a = amortization({ amount: 1000000, ratePct: 12, disbursed: '2026-04', moratoriumMonths: 0, instalments: 12, frequency: 'monthly', style: 'emi' }) as Amortization;
    expect(a.level.toFixed(2)).toBe('88848.79');
    expect([a.months[0].interest.toFixed(2), a.months[0].principal.toFixed(2), a.months[0].instalment]).toEqual(['10000.00', '78848.79', 1]);
    expect(a.months[11].closing).toBeCloseTo(0, 6);
  });
  it('names what is missing', () => {
    expect(amortization({ ...LOAN, ratePct: undefined })).toEqual({ needs: ['Interest rate (% a year)'] });
  });
});

describe('profit after tax, worked out (fictional case A)', () => {
  it('2026-27: profit before tax 1,59,000, tax 39,750, profit after tax 1,19,250; a loss pays no tax', () => {
    const p = (planStatement(CASE_A, LOAN, COMMON) as Plan).profit[0];
    expect([p.pbdit, p.depreciation, p.interestTL, p.interestOther, p.pbt, p.tax, p.pat].map(Math.round))
      .toEqual([500000, 150000, 141000, 50000, 159000, 39750, 119250]);
    const loss = (planStatement([{ ...CASE_A[0], pbdit: 200000 }, ...CASE_A.slice(1)], LOAN, COMMON) as Plan).profit[0];
    expect([loss.pbt, loss.tax, loss.pat].map(Math.round)).toEqual([-141000, 0, -141000]);
  });
});

describe('figures that start after the loan is drawn (operations start later)', () => {
  // Case A drawn in October 2026: October to March is the moratorium, so 2026-27 has interest only,
  // 6 months × 1% of 12,00,000 = 72,000; instalments run from June 2027 to March 2030.
  const LATE: LoanTerms = { ...LOAN, disbursed: '2026-10' };
  const PROJ = CASE_A.slice(1).map((y, i) => ({ ...y, fy: ['2027-28', '2028-29', '2029-30'][i] }));
  it('asks for the first year unless told the figures start later', () => {
    expect(planStatement(PROJ, LATE, COMMON)).toEqual({ needs: ['Projections for 2026-27: the loan is still running then'] });
  });
  it('leaves out a year with no instalment, its interest taken as paid from the project cost', () => {
    const p = planStatement(PROJ, LATE, COMMON, '2027-28') as Plan;
    expect(p.beforeStart.map((b) => [b.fy, Math.round(b.interest)])).toEqual([['2026-27', 72000]]);
    expect(p.statement.rows.map((r) => r.fy)).toEqual(['2027-28', '2028-29', '2029-30']);
  });
  it('never leaves out a year with an instalment', () => {
    expect(planStatement(PROJ.slice(1), LATE, COMMON, '2028-29')).toEqual({ needs: ['Figures for 2027-28: an instalment falls due then'] });
    expect(planStatement(PROJ, LATE, COMMON, '2027')).toEqual({ needs: ['The first year of figures written like 2026-27, in place of "2027"'] });
  });
  it('the solvers work from the same start', () => {
    const r = maxLoanAmount(PROJ, { ...LATE, amount: undefined }, COMMON, { minimum: 1.2 }, '2027-28');
    expect('amount' in r && r.plan.beforeStart[0].fy).toBe('2026-27');
  });
});

describe('fictional case P: a proprietor with existing EMIs and a new asset', () => {
  // Case A's loan (interest 1,41,000, 1,02,000, 54,000, 9,000; principal 2, 4, 4, 2 lakh). Profit before interest,
  // depreciation and tax 15,00,000 growing 10% a year; the new asset adds 3,60,000 a year from October 2026 (6 months,
  // 1,80,000, in 2026-27); depreciation 2,00,000 and working-capital interest 1,00,000 every year. Existing EMIs: 25,000 a
  // month running on (a home loan) and 15,000 a month to December 2027: 4,80,000, then 3,00,000 + 9 × 15,000 = 4,35,000,
  // then 3,00,000. Tax at a proprietor's slab rates.
  // 2026-27: before tax 15,00,000 + 1,80,000 − 2,00,000 − 1,41,000 − 1,00,000 = 12,39,000. Slab tax 60,000 + 39,000 × 15%
  //   = 65,850, but at most 39,000 above 12,00,000 (marginal relief); cess 1,560: tax 40,560. Cash available
  //   16,80,000 − 1,00,000 − 40,560 = 15,39,440 against 2,00,000 + 1,41,000 + 4,80,000 = 8,21,000: 1.8751.
  // 2027-28: before tax 20,10,000 − 2,00,000 − 1,02,000 − 1,00,000 = 16,08,000; tax 1,21,600 + 4,864 = 1,26,464;
  //   cash 17,83,536 against 9,37,000: 1.9035.
  // 2028-29: before tax 18,21,000; tax 1,64,200 + 6,568 = 1,70,768; cash 19,04,232 against 7,54,000: 2.5255.
  // 2029-30: before tax 20,47,500; tax 2,11,875 + 8,475 = 2,20,350; cash 20,36,150 against 5,09,000: 4.0003.
  // Average 72,63,358 / 30,21,000 = 2.4043; lowest 2026-27.
  const fys = ['2026-27', '2027-28', '2028-29', '2029-30'];
  const P: ProjectionYear[] = fys.map((fy, i) => ({
    fy, pbdit: [1500000, 1650000, 1815000, 1996500][i], assetIncome: [180000, 360000, 360000, 360000][i], depreciation: 200000, nonCash: 0,
    interestOther: 100000, otherLoansInterest: 0, otherLoansPrincipal: 0, existingEmis: [480000, 435000, 300000, 300000][i], taxBy: 'proprietor',
  }));
  it('year by year: the asset\'s income in profit, the EMIs in debt service, the slab tax', () => {
    const p = planStatement(P, LOAN, COMMON) as Plan;
    expect(p.profit.map((x) => [x.fy, Math.round(x.pbt), Math.round(x.tax)])).toEqual([
      ['2026-27', 1239000, 40560], ['2027-28', 1608000, 126464], ['2028-29', 1821000, 170768], ['2029-30', 2047500, 220350],
    ]);
    expect(rows(p.statement)).toEqual([
      ['2026-27', 1539440, 821000, '1.8751'],
      ['2027-28', 1783536, 937000, '1.9035'],
      ['2028-29', 1904232, 754000, '2.5255'],
      ['2029-30', 2036150, 509000, '4.0003'],
    ]);
    expect([p.statement.average?.toFixed(4), p.statement.minimum?.fy]).toEqual(['2.4043', '2026-27']);
  });
  it('the same figures for a firm pay 31.2%: 3,86,568 in 2026-27 against the proprietor\'s 40,560', () => {
    const firm = planStatement(P.map((y) => ({ ...y, taxBy: 'firm' })), LOAN, COMMON) as Plan;
    expect(Math.round(firm.profit[0].tax)).toBe(386568);
  });
  it('existing EMIs are debt service under every method, and make a year count', () => {
    // Cash accruals against instalments only, 2026-27: profit after tax 11,98,440 + depreciation 2,00,000 = 13,98,440
    // against instalments 2,00,000 + EMIs 4,80,000 = 6,80,000: 2.0565.
    expect(rows(planned({ ...COMMON, interest: 'none' }, P))[0]).toEqual(['2026-27', 1398440, 680000, '2.0565']);
    // A year with no instalment of the new loan still counts when existing EMIs are paid in it.
    const late = planStatement(P, { ...LOAN, moratoriumMonths: 12, instalments: 8 }, COMMON) as Plan;
    expect(late.statement.rows[0]).toMatchObject({ fy: '2026-27', counted: true });
    const none = planStatement(P.map((y) => ({ ...y, existingEmis: 0 })), { ...LOAN, moratoriumMonths: 12, instalments: 8 }, COMMON) as Plan;
    expect(none.statement.rows[0]).toMatchObject({ fy: '2026-27', counted: false });
  });
  it('names a borrower it has no tax for, and asks for the new lines like any other', () => {
    expect(planStatement([{ ...P[0], taxBy: 'trust' }, ...P.slice(1)], LOAN, COMMON)).toEqual({ needs: ['Who the borrower is, for the tax in 2026-27'] });
    expect(planStatement([{ ...P[0], existingEmis: undefined, assetIncome: undefined }, ...P.slice(1)], LOAN, COMMON))
      .toEqual({ needs: ['Extra income from the new asset for 2026-27', 'Existing EMIs (interest and principal) for 2026-27'] });
  });
});
