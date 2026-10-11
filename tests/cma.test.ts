import { describe, expect, it } from 'vitest';
import { cma, cmaNeeds, fyLabels, type Cma, type CmaInput, type Figures, type YearId } from '../engine/cma';

/*
 * Fictional case K (C1, 11-10-2026), a private company making steel furniture, worked outside the engine by a separate
 * Python script (scratch, not kept), in lakh and then rupees: sales 300, 345, 390, 445, 520 L for 2023-24 to 2027-28;
 * materials 65% of sales; tax a quarter of profit before tax; reserves start at nil and grow by the profit kept; cash is
 * what balances each year. Promoters' loans are not quasi-equity. By hand, 2027-28 (the projection):
 *   cost of sales 338 + 52 + 9 = 399 L; gross profit 520 − 399 = 121 L; less salaries 31 and SGA 25: PBIT 65 L;
 *   less interest 9 + 3: 53 L; with other income 3: PBT 56 L; tax 14: net profit 42 L; dividend 26: kept 16 L.
 *   Current liabilities 95 + 42 + 8 + 12 = 157 L; term liabilities 40 − 8 + 15 = 47 L; net worth 40 + 52.8 = 92.8 L;
 *   outside 204 L; total 296.8 L. Current assets 60 + 58 + 52.8 + 10 = 180.8 L; fixed 110 + 6: total 296.8 L, balanced.
 *   Net working capital 180.8 − 157 = 23.8 L; current ratio 180.8 ÷ 157 = 1.1516; TOL/TNW 204 ÷ 92.8 = 2.1983.
 *   Turnover method: need 25% of 520 = 130 L; margin 5% = 26 L; 130 − 26 = 104 L; 130 − 23.8 = 106.2 L; the limit is
 *   the lower, 104 L, and the margin is short by 26 − 23.8 = 2.2 L. 2026-27: need 111.25 L, margin 22.25 L, NWC 17.8 L,
 *   limit 89 L. Sales grow 16.85% in 2027-28, above the audited years' best (15% in 2024-25).
 *   Funds flow 2027-28: sources 42 + 9 + capital in 10 (16 L of reserves and 10 of capital, less the 16 kept... see
 *   below) + term loans up 26 = 87 L; uses capex 46 + 9 = 55 L and dividend 26 = 81 L; long-term surplus 6 L; current
 *   assets up 40 L, other current liabilities up 9 L: the gap up 31 L; net deficit 25 L = bank borrowing up 25 L.
 *   (Capital in: capital up 10 L, reserves up 16 L, less the 16 L kept = 10 L.)
 */
const L = 100000;
const rows: Record<string, number[]> = {
  sales: [300, 345, 390, 445, 520], otherIncome: [2, 2, 3, 3, 3], materials: [195, 224, 253, 289, 338], otherDirect: [30, 34, 39, 44, 52],
  employees: [20, 22, 25, 28, 31], sga: [15, 17, 19, 22, 25], depreciation: [6, 6, 7, 8, 9], wcInterest: [5, 6, 7, 8, 9], tlInterest: [3, 3, 2.5, 2, 3],
  tax: [7, 8.8, 10.1, 11.8, 14], drawings: [12, 15, 18, 22, 26],
  capital: [30, 30, 30, 30, 40], reserves: [0, 11.2, 23.6, 36.8, 52.8], promoterLoans: [15, 15, 15, 15, 15], termLoans: [30, 24, 18, 12, 40], tlDue12: [6, 6, 6, 6, 8],
  bankWc: [45, 52, 60, 70, 95], creditors: [25, 28, 32, 36, 42], otherCl: [8, 9, 10, 11, 12],
  netBlock: [60, 60, 62, 64, 110], nonCurrent: [5, 5, 6, 6, 6], stock: [35, 40, 46, 52, 60], debtors: [33, 38, 43, 50, 58], cash: [14, 19.2, 23.6, 29.8, 52.8], otherCa: [6, 7, 8, 9, 10],
};
const IDS: YearId[] = ['a1', 'a2', 'a3', 'est', 'proj'];
const yearFigures = (k: number) => Object.fromEntries(Object.entries(rows).map(([h, v]) => [h, Math.round(v[k] * L)])) as Figures;
export const CASE_K: CmaInput = { startYear: 2026, existingLimit: 70 * L, figures: Object.fromEntries(IDS.map((id, k) => [id, yearFigures(k)])) };

const ok = (x: CmaInput) => {
  const r = cma(x);
  if ('needs' in r || 'blocked' in r) throw new Error(JSON.stringify(r));
  return r as Cma;
};

describe('CMA, case K worked outside the engine', () => {
  const r = ok(CASE_K);
  it('labels the years from the one now running', () => {
    expect(fyLabels(2026)).toEqual({ a1: '2023-24', a2: '2024-25', a3: '2025-26', est: '2026-27', proj: '2027-28' });
    expect(r.years.map((y) => y.fy)).toEqual(['2023-24', '2024-25', '2025-26', '2026-27', '2027-28']);
  });
  it('works Form II as the script did', () => {
    expect(r.years.map((y) => y.pbt)).toEqual([2800000, 3500000, 4050000, 4700000, 5600000]);
    expect(r.years.map((y) => y.netProfit)).toEqual([2100000, 2620000, 3040000, 3520000, 4200000]);
    expect(r.years.map((y) => y.pbdit)).toEqual([4000000, 4800000, 5400000, 6200000, 7400000]);
  });
  it('analyses each balance sheet as the script did', () => {
    expect(r.years.map((y) => y.currentLiabilities)).toEqual([8400000, 9500000, 10800000, 12300000, 15700000]);
    expect(r.years.map((y) => y.netWorth)).toEqual([3000000, 4120000, 5360000, 6680000, 9280000]);
    expect(r.years.map((y) => y.outside)).toEqual([12300000, 12800000, 13500000, 14400000, 20400000]);
    expect(r.years.map((y) => y.assets)).toEqual([15300000, 16920000, 18860000, 21080000, 29680000]);
    expect(r.years.map((y) => y.liabilities)).toEqual(r.years.map((y) => y.assets));
    expect(r.years.map((y) => y.nwc)).toEqual([400000, 920000, 1260000, 1780000, 2380000]);
  });
  it('works the ratios and days as the script did, to four places', () => {
    const four = (k: 'currentRatio' | 'tolTnw' | 'interestCover' | 'stockDays' | 'debtorDays' | 'creditorDays') => r.years.map((y) => +(y[k] as number).toFixed(4));
    expect(four('currentRatio')).toEqual([1.0476, 1.0968, 1.1167, 1.1447, 1.1516]);
    expect(four('tolTnw')).toEqual([4.1, 3.1068, 2.5187, 2.1557, 2.1983]);
    expect(four('interestCover')).toEqual([5, 5.3333, 5.6842, 6.2, 6.1667]);
    expect(four('stockDays')).toEqual([55.303, 55.303, 56.1538, 55.6598, 54.8872]);
    expect(four('debtorDays')).toEqual([40.15, 40.2029, 40.2436, 41.0112, 40.7115]);
    expect(four('creditorDays')).toEqual([46.7949, 45.625, 46.166, 45.4671, 45.355]);
  });
  it('assesses the limit by the turnover method: the lower of the two', () => {
    expect(r.turnover.map((t) => [t.fy, t.need, t.margin, t.nwc, t.onMargin, t.onNwc, t.limit, t.short])).toEqual([
      ['2026-27', 11125000, 2225000, 1780000, 8900000, 9345000, 8900000, 445000],
      ['2027-28', 13000000, 2600000, 2380000, 10400000, 10620000, 10400000, 220000],
    ]);
    expect([r.limit, r.existingLimit, r.proposed]).toEqual([10400000, 7000000, 9500000]);
  });
  it('closes Form VI to the change in bank borrowing', () => {
    expect(r.flow.map((f) => [f.fy, f.sources, f.uses, f.longTerm, f.gapUp, f.net, f.bankUp])).toEqual([
      ['2024-25', 3220000, 2700000, 520000, 1220000, -700000, 700000],
      ['2025-26', 3740000, 3400000, 340000, 1140000, -800000, 800000],
      ['2026-27', 4320000, 3800000, 520000, 1520000, -1000000, 1000000],
      ['2027-28', 8700000, 8100000, 600000, 3100000, -2500000, 2500000],
    ]);
    expect([r.flow[3].capitalIn, r.flow[3].capex, r.flow[3].termUp]).toEqual([1000000, 5500000, 2600000]);
  });
  it('flags the projection against the borrower’s own past, and the short margin', () => {
    expect(r.flags.map((f) => f.id)).toEqual(['growth-proj', 'margin-2026-27', 'margin-2027-28']);
    expect(r.flags[0].text).toBe('2027-28 (projection): sales grow 16.85%, faster than in any audited year (at most 15.00%)');
    expect(r.flags[2].text).toBe('2027-28: the net working capital, Rs. 23,80,000, is below the borrower’s 5% margin of Rs. 26,00,000, short by Rs. 2,20,000; the limit is worked on the 5% margin');
  });
  it('counts promoters’ loans as the owners’ funds when told they stay in', () => {
    const q = ok({ ...CASE_K, quasiEquity: true });
    expect(q.years[4].netWorth).toBe(10780000);
    expect(q.years[4].nwc).toBe(2380000);
    expect(+(q.years[4].tolTnw as number).toFixed(4)).toBe(1.7532); // 189 L ÷ 107.8 L
  });
});

describe('CMA, what it asks and refuses', () => {
  it('asks the limit now, the estimate and the projection of an empty page', () => {
    expect(cmaNeeds({ startYear: 2026, figures: {} })).toEqual(['The working-capital limit you have now (0 if none)',
      '2026-27 (estimate): 25 figures, the first Net sales (without GST)', '2027-28 (projection): 25 figures, the first Net sales (without GST)']);
  });
  it('asks the limit now and every figure of a year begun, never taking a blank as nil', () => {
    const x: CmaInput = { ...CASE_K, existingLimit: undefined, figures: { ...CASE_K.figures, est: { ...CASE_K.figures.est, tax: undefined } } };
    expect(cmaNeeds(x)).toEqual(['The working-capital limit you have now (0 if none)', '2026-27 (estimate): Tax']);
  });
  it('lists a balance sheet that does not balance, and never makes it balance', () => {
    const x: CmaInput = { ...CASE_K, figures: { ...CASE_K.figures, a2: { ...CASE_K.figures.a2, cash: 1920000 + 5000 } } };
    expect(cmaNeeds(x)).toEqual(['2024-25 (audited): the balance sheet does not balance: the assets are Rs. 5,000 more than the liabilities']);
  });
  it('takes a younger business with fewer audited years, the oldest left out, and says so', () => {
    const r = ok({ ...CASE_K, figures: { a3: CASE_K.figures.a3, est: CASE_K.figures.est, proj: CASE_K.figures.proj } });
    expect(r.years.map((y) => y.fy)).toEqual(['2025-26', '2026-27', '2027-28']);
    expect(r.flags.map((f) => f.id).slice(0, 2)).toEqual(['audited', 'growth']);
    expect(r.flow.length).toBe(2);
  });
  it('asks the gap year when an older audited year is given', () => {
    const x: CmaInput = { ...CASE_K, figures: { a1: CASE_K.figures.a1, a3: CASE_K.figures.a3, est: CASE_K.figures.est, proj: CASE_K.figures.proj } };
    expect(cmaNeeds(x)).toEqual(['2024-25 (audited): 25 figures, the first Net sales (without GST)']);
  });
  it('flags days far from the audited average, and borrowing above the limit', () => {
    // Debtors up 32 L and cash down as much: still balanced, the same net working capital, debtor days of 63.
    const proj = { ...CASE_K.figures.proj, debtors: 9000000, cash: 2080000 } as Figures;
    const r = ok({ ...CASE_K, figures: { ...CASE_K.figures, proj } });
    expect(r.flags.find((f) => f.id === 'debtorDays-proj')?.text).toBe('2027-28 (projection): debtor days of 63, against 40 on average in the audited years');
    expect(r.years[4].nwc).toBe(2380000);
    // 120 L borrowed from banks, the rest from cash: 16 L above the limit of 104 L.
    const more = { ...CASE_K.figures.proj, bankWc: 12000000, cash: 5280000 + 2500000 } as Figures;
    expect(ok({ ...CASE_K, figures: { ...CASE_K.figures, proj: more } }).flags.find((f) => f.id === 'proposed')?.text)
      .toBe('The projected balance sheet borrows Rs. 1,20,00,000 from banks for working capital, Rs. 16,00,000 more than the limit by the turnover method');
  });
});
