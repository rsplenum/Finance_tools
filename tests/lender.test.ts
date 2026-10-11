/**
 * DSCR as lenders test it (D1) on fictional case L: case A's projections and loan (tests/dscr.test.ts) with sales of
 * 25, 30, 32 and 32 lakh. Worked outside the engine (a short script of plain arithmetic, its base matching case A's
 * 1.4519) and the first year of each line again by hand below: model-worked, not yet golden (D-BIZ-02).
 */
import { describe, it, expect } from 'vitest';
import { planStatement, type Definition, type Plan, type ProjectionYear } from '../engine/dscr';
import { auditedYear, cashCheck, promotersRepaid, stressTests, type LenderYear, type StressLine } from '../engine/lender';
import type { LoanTerms } from '../engine/loan';
import { ASSUMED, NO_LENDER, preview, type State } from '../site/src/dscr/model';

const year = (fy: string, pbdit: number, depreciation: number): ProjectionYear =>
  ({ fy, pbdit, assetIncome: 0, depreciation, nonCash: 0, interestOther: 50000, otherLoansInterest: 0, otherLoansPrincipal: 0, existingEmis: 0, taxPct: 25 });
const CASE = [year('2026-27', 500000, 150000), year('2027-28', 750000, 130000), year('2028-29', 800000, 110000), year('2029-30', 800000, 100000)];
const LOAN: LoanTerms = { amount: 1200000, ratePct: 12, disbursed: '2026-04', moratoriumMonths: 6, instalments: 12, frequency: 'quarterly', style: 'equal-principal' };
const COMMON: Definition = { interest: 'term-loans', leases: 'no', years: 'repayment', average: 'totals' };
const SALES = [2500000, 3000000, 3200000, 3200000];
const EXTRA: LenderYear[] = CASE.map((p, i) => ({ fy: p.fy, sales: SALES[i], capex: 50000, promoterLoans: [0, 100000, 100000, 0][i] }));
const yearly = (l: { rows: { dscr?: number }[] }) => l.rows.map((r) => r.dscr?.toFixed(4));

describe('sales price 5% lower and costs 10% higher, each alone (fictional case L)', () => {
  // Price, 2026-27: 5,00,000 − 5% of 25,00,000 = 3,75,000; before tax 3,75,000 − 1,50,000 − 1,41,000 − 50,000 = 34,000;
  //   tax 8,500; cash 3,75,000 − 50,000 − 8,500 = 3,16,500 / 3,41,000 = 0.9282. Average 17,40,250 / 15,06,000 = 1.1555.
  // Costs, 2026-27: costs 25,00,000 − 5,00,000 = 20,00,000, 10% more is 2,00,000 off: 3,00,000; before tax −41,000, no tax;
  //   cash 3,00,000 − 50,000 = 2,50,000 / 3,41,000 = 0.7331. Average 14,97,500 / 15,06,000 = 0.9944.
  it('each line year by year, its average and lowest year, flagged below 1.00', () => {
    const [price, costs] = stressTests(CASE, LOAN, COMMON, EXTRA) as StressLine[];
    expect(yearly(price)).toEqual(['0.9282', '0.9373', '1.0650', '2.2476']);
    expect(price.average?.toFixed(4)).toBe('1.1555');
    expect(price.minimum).toMatchObject({ fy: '2026-27' });
    expect(yearly(costs)).toEqual(['0.7331', '0.8252', '0.9328', '1.9605']);
    expect(costs.average?.toFixed(4)).toBe('0.9944');
    expect([price.belowFloor, costs.belowFloor]).toEqual([true, true]);
  });
  it('the base plan is untouched: case A still averages 1.4519', () => {
    expect((planStatement(CASE, LOAN, COMMON) as Plan).statement.average?.toFixed(4)).toBe('1.4519');
  });
  it('asks for sales, never takes them as nil', () => {
    expect(stressTests(CASE, LOAN, COMMON, EXTRA.slice(0, 3))).toEqual({ needs: ['Sales for 2029-30'] });
    expect(stressTests(CASE, LOAN, COMMON, [])).toMatchObject({ needs: expect.arrayContaining(['Sales for 2026-27']) });
  });
});

describe("promoters' loans repaid (fictional case L)", () => {
  // 1,00,000 repaid in 2027-28 and in 2028-29: 5,83,000 / 6,02,000 = 0.9684; 6,03,500 / 5,54,000 = 1.0894;
  // average 21,86,500 / 17,06,000 = 1.2817.
  it('counted in debt service in full', () => {
    const p = promotersRepaid(CASE, LOAN, COMMON, EXTRA) as { average: number; minimum: { fy: string }; rows: { dscr?: number }[] };
    expect(yearly(p)).toEqual(['1.2031', '0.9684', '1.0894', '2.8218']);
    expect(p.average.toFixed(4)).toBe('1.2817');
    expect(p.minimum.fy).toBe('2027-28');
  });
  it('nothing when none is repaid: they are kept in the business (the assumption)', () => {
    expect(promotersRepaid(CASE, LOAN, COMMON, EXTRA.map((e) => ({ ...e, promoterLoans: 0 })))).toBeUndefined();
  });
});

describe('the cash check (fictional case L)', () => {
  // Working capital 20% of sales; the last audited year's sales 22,00,000; replacement capex 50,000 a year.
  // 2026-27: growth 20% × 3,00,000 = 60,000; left 4,10,250 − 60,000 − 50,000 − 3,41,000 = −40,750; cover 3,00,250 / 3,41,000 = 0.8805.
  // 2027-28: 1,00,000; left −69,000; 0.8625. 2028-29: 40,000; left 59,500; 1.1311. 2029-30: nil; left 3,30,750; 2.5825.
  it('cash left after the instalments each year, the lowest cover and the years short', () => {
    const p = planStatement(CASE, LOAN, COMMON) as Plan;
    const c = cashCheck(p, EXTRA, 20, 2200000);
    if (!('rows' in c)) throw new Error(JSON.stringify(c));
    expect(c.rows.map((r) => [r.fy, Math.round(r.wcGrowth), Math.round(r.left), r.cover?.toFixed(4)])).toEqual([
      ['2026-27', 60000, -40750, '0.8805'], ['2027-28', 100000, -69000, '0.8625'], ['2028-29', 40000, 59500, '1.1311'], ['2029-30', 0, 330750, '2.5825'],
    ]);
    expect(c.lowest).toMatchObject({ fy: '2027-28' });
    expect(c.short).toEqual(['2026-27', '2027-28']);
  });
  it('asks what it needs', () => {
    const p = planStatement(CASE, LOAN, COMMON) as Plan;
    expect(cashCheck(p, EXTRA.map((e) => ({ ...e, capex: undefined })), undefined, undefined)).toMatchObject({
      needs: expect.arrayContaining(['Working capital needed, as a % of sales', 'Replacement capex for 2026-27 (none, or how much)']),
    });
  });
});

describe('the last audited year beside the projections', () => {
  // 2025-26: before tax 4,40,000 − 1,60,000 − 60,000 = 2,20,000; after tax 1,65,000; cash accrual 3,25,000; margin 20%.
  // 2026-27: sales up 25,00,000 / 22,00,000 − 1 = 13.64%; margin 5,00,000 / 25,00,000 = 20%, not above: no flag.
  const A = { sales: 2200000, pbdit: 440000, depreciation: 160000, interest: 60000, tax: 55000 };
  it('worked out, the year named from the first year of figures', () => {
    const a = auditedYear(A, { fy: '2026-27', pbdit: 500000, sales: 2500000 });
    expect(a).toMatchObject({ fy: '2025-26', pbt: 220000, pat: 165000, accrual: 325000, margin: 0.2, flags: [] });
    expect('next' in a && a.next?.salesGrowth.toFixed(4)).toBe('0.1364');
  });
  it('flags a projected margin above the audited one, never blocks', () => {
    expect(auditedYear(A, { fy: '2026-27', pbdit: 600000, sales: 2500000 })).toMatchObject({ flags: [expect.stringContaining('above the last audited')] });
  });
  it('asks for each missing figure', () => {
    expect(auditedYear({ ...A, tax: undefined }, { fy: '2026-27' })).toEqual({ needs: ["The last audited year's tax"] });
  });
});

describe('on the page: the lines beside the DSCR, from the front door (fictional case A′)', () => {
  // Case A′ (tests/dscr-page.test.ts) with this year's sales 50,00,000, growing 10% with the profit. Price 5% lower:
  // profit 2,50,000 · 2,75,000 · 3,02,500 · 3,32,750; tax at 31.2% nil, nil, 15,132, 38,610; cash 2,00,000 · 2,25,000 ·
  // 2,37,368 · 2,44,140; average 9,06,508 / 15,06,000 = 0.60, lowest 2,25,000 / 5,02,000 = 0.45 in 2027-28 (by hand and a script).
  const A2: State = {
    ...ASSUMED,
    loan: { amount: '12 L', ratePct: '12', disbursed: '2026-04', moratoriumMonths: '6', instalments: '12', repayment: 'quarterly' },
    cells: { ...ASSUMED.cells, pbdit: ['5,00,000'], depreciation: ['1,50,000'], interestOther: ['50,000'] },
    rates: { pbdit: '10' },
  };
  it('asks for sales in one line until given; the promoters\' assumption shows', () => {
    const v = preview(A2).lender!;
    expect(v.stress).toEqual([]);
    expect(v.ask).toMatch(/^Add this year's sales under More options/);
    expect(v.promoters).toEqual({ assumed: expect.stringContaining('subordinated') });
    expect(v.cash).toBeUndefined();
  });
  it('the stress lines once sales are in, flagged below 1.00; the verdict and the DSCR unchanged', () => {
    const p = preview({ ...A2, lender: { ...NO_LENDER, sales: ['50 L'] } });
    expect(p.lender!.stress[0]).toMatchObject({ label: 'Sales price 5% lower', average: '0.60', lowest: '0.45', lowestYear: '2027-28', below: true });
    expect([p.average, p.verdict?.meets]).toEqual(['1.16', false]);
  });
  it("promoters' loans repaid leave the assumptions and show their own line against the target", () => {
    const p = preview({ ...A2, lender: { ...NO_LENDER, promoters: ['', '1 L'] } });
    expect(p.assumed.map((a) => a.id)).not.toContain('promoters');
    expect(p.lender!.promoters).toMatchObject({ line: { meets: false, lowestYear: '2027-28' } });
  });
});
