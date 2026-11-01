/**
 * The report's one Make it work (engine/work.ts, OR11d, D-UX-249 to D-UX-252): the causes, the ways that keep the loan,
 * the ways that change it and those that do not reach, each a run of the whole report. Fictional cases only (D-BIZ-02):
 * case R at Rs. 70,00,000 of sales (tests/report.test.ts, the mock-up's worked example), case P (the mock-up's PMEGP
 * unit at Rs. 150 a unit) and the mock-up's fill case (5,00,000 boxes a year at Rs. 25, filling 55%, 70%, 85%).
 *
 * Case R by hand, 2026-27 (a full year: drawn in April, no holiday, 60 equal-principal instalments): principal 5,00,000;
 * interest (12 × 25,00,000 − 41,666.67 × 66) × 10% ÷ 12 = 2,27,083.33; service 7,27,083.33. Depreciation 4,20,000,
 * preliminary 20,000, the limit's interest 5,00,000 × 11% = 55,000, fixed 18,00,000; tax 31.2% (a firm). Cash for the
 * loan = PAT + depreciation + preliminary + the loan's interest.
 */
import { describe, it, expect } from 'vitest';
import { projectReport, type Report, type ReportInput } from '../engine/report';
import { diagnose } from '../engine/ratios';
import { makeWork, withChange, type Way, type Work } from '../engine/work';
import { CASE_R } from './report.test';

const R: ReportInput = { ...CASE_R, sales: 7000000 };
const P: ReportInput = {
  taxBy: 'firm', cost: { land: 200000, building: 600000, machinery: 2000000, preliminary: 50000 },
  loan: { amount: 2400000, ratePct: 10, disbursed: '2026-10', moratoriumMonths: 6, instalments: 48, frequency: 'monthly', style: 'equal-principal' },
  capacity: 50000, price: 150, utilisationPct: [60, 70, 80], priceGrowthPct: 0, monthsToStart: 3, variablePct: 70, fixedCosts: 1200000, fixedGrowthPct: 5,
  days: { stock: 30, debtors: 30, creditors: 30 }, wcLimit: 300000, wcRatePct: 11, scheme: { id: 'pmegp', category: 'general', area: 'rural', activity: 'manufacturing' },
};
const FILL: ReportInput = { ...R, salesBy: undefined, sales: undefined, salesGrowthPct: undefined, capacity: 500000, price: 25, utilisationPct: [55, 70, 85], priceGrowthPct: 5 };

const work = (x: ReportInput) => makeWork(x) as Work;
const way = (w: Way[], id: string, k = 0) => w.filter((v) => v.id === id)[k];
const misses = (x: ReportInput) => diagnose(projectReport(x) as Report, x).misses.filter((id) => id !== 'securityCover');
const check = (x: ReportInput, id: string) => diagnose(projectReport(x) as Report, x).checks.find((c) => c.id === id)!.worst as number;
/** Case R's 2026-27 by hand: the DSCR with sales `s` and variable costs `v`% (tax on a profit only). */
const dscrR = (s: number, v: number) => {
  const pbt = s * (1 - v / 100) - 1800000 - 420000 - 20000 - 227083.33 - 55000;
  return (pbt - (pbt > 0 ? pbt * 0.312 : 0) + 420000 + 20000 + 227083.33) / 727083.33;
};
/** Case P's 2026-27 by hand (sales for three months from January 2027; the loan drawn in October, six months' interest on
 * the loan less PMEGP's margin money, kept aside; the limit's interest for three months): interest cover = EBIT ÷
 * interest. The margin money is 25% of the project cost without land, which holds a year's debtors at the running rate,
 * 30 days of sales (stock and creditors, 30 days of the 70% variable cost each, cancel). */
const icP = (units: number, price: number) => {
  const run = units * 0.85 * price, ebit = (run * 3) / 12 * 0.3 - 300000 - 360000 - 10000;
  const subsidy = 0.25 * (2650000 + (run * 30) / 365), interest = (2400000 - subsidy) * 0.1 * 6 / 12 + 300000 * 0.11 * 3 / 12;
  return ebit / interest;
};

describe('Make it work on case R at Rs. 70,00,000 (D-UX-249, D-UX-250)', () => {
  const w = work(R);
  it('names what holds it back, year by year, and when the cash runs out', () => {
    expect(w.missed).toEqual(['currentRatio', 'dscrAverage', 'dscrLowest', 'interestCover']);
    expect(w.held.map((h) => h.cause)).toEqual(['earns', 'cushion']);
    expect(w.years.map((y) => (y.dscr as number).toFixed(2))).toEqual(['0.82', '1.02', '1.24', '1.54', '1.92']);
    expect(dscrR(7000000, 65).toFixed(4)).toBe((w.years[0].dscr as number).toFixed(4));
    expect([w.cash?.fy, Math.round(w.cash?.need as number)]).toEqual(['2027-28', 175955]);
  });

  it('keeps the loan with more sales: Rs. 82,11,000 in 2026-27, a plant selling Rs. 1,41,43,206 at full use', () => {
    const s = way(w.keep, 'sales');
    expect([s.change.sales, s.ask]).toEqual([8211000, { id: 'plantSales', need: 14143206 }]);
    // D-UX-250 by hand: 12,11,000 × 35% more profit, PBT 3,51,766.67, tax 1,09,751.20: 9,09,098.80 ÷ 7,27,083.33.
    expect(dscrR(8211000, 65)).toBeCloseTo(909098.8 / 727083.33, 6);
    expect(check(withChange(R, s.change), 'dscrLowest')).toBeCloseTo(dscrR(8211000, 65), 6);
    expect(dscrR(8204000, 65)).toBeLessThan(1.25); // +17.2%, one tenth less
    expect((8211000 * 1.1 ** 4) / 0.85).toBeCloseTo(14143206, 0); // the busiest year, 2030-31, at 85%
  });

  it('or some more sales with a longer repayment: Rs. 76,37,000 and 84 instalments', () => {
    const s = way(w.keep, 'salesLonger'), x = withChange(R, s.change);
    expect([s.change.sales, s.change.instalments, s.ask]).toEqual([7637000, 84, { id: 'plantSales', need: 15916955 }]);
    // By hand: 25,00,000 ÷ 84 a month; interest (12 × 25,00,000 − 29,761.90 × 66) × 10% ÷ 12 = 2,33,630.95, with the
    // limit's 2,88,630.95; EBIT 35% × 76,37,000 − 18,00,000 − 4,40,000 = 4,32,950 (76,30,000: 4,30,500).
    expect(check(x, 'interestCover')).toBeCloseTo(432950 / 288630.95, 6);
    expect((432950 / 288630.95).toFixed(5)).toBe('1.50001');
    expect((430500 / 288630.95).toFixed(4)).toBe('1.4915');
    // DSCR: PBT 1,44,319.05, PAT 99,291.51; (99,291.51 + 4,40,000 + 2,33,630.95) ÷ (3,57,142.86 + 2,33,630.95).
    expect(check(x, 'dscrLowest')).toBeCloseTo((144319.05 * 0.688 + 440000 + 233630.95) / (357142.86 + 233630.95), 5);
    expect((7637000 * 1.1 ** 6) / 0.85).toBeCloseTo(15916955, 0); // seven years now, the busiest 2032-33
  });

  it('or variable costs of 58.9%: by hand 1.2533, and 1.2467 at 59.0%', () => {
    const v = way(w.keep, 'variable');
    expect(v.change).toEqual({ variablePct: 58.9 });
    expect(dscrR(7000000, 58.9).toFixed(4)).toBe('1.2533');
    expect(dscrR(7000000, 59).toFixed(4)).toBe('1.2467');
    expect(check(withChange(R, v.change), 'dscrLowest')).toBeCloseTo(dscrR(7000000, 58.9), 6);
  });

  it('changes the loan by fix.ts: Rs. 9,35,000 over the typed 5 years, or Rs. 10,03,000 over 3', () => {
    expect(w.change.map((c) => [c.id, c.change.amount, c.change.instalments])).toEqual([['fix', 935000, undefined], ['fix', 1003000, 36]]);
    expect(w.change.map((c) => c.promotersMore)).toEqual([1565000, 1497000]);
  });

  it('sets aside, each with what stays short, the ways that do not reach', () => {
    expect(w.not.map((n) => n.id)).toEqual(['growth', 'cash', 'moratorium', 'instalments', 'wc']);
    expect(way(w.not, 'cash').still).toEqual(['dscrAverage', 'dscrLowest', 'interestCover']);
    expect(way(w.not, 'moratorium').still).toEqual(['interestCover', 'facr']);
  });

  it('every way it keeps or changes meets every level missed, and loses none met', () => {
    for (const v of [...w.keep, ...w.change]) expect(misses(withChange(R, v.change))).toEqual([]);
  });
});

describe('Make it work on case P at Rs. 150 a unit (D-UX-249: the price and the plant, by hand)', () => {
  const w = work(P);
  it('says more use cannot reach, then a price of Rs. 249.83 at 85% use', () => {
    expect(w.useCannot?.still).toEqual(['dscrAverage', 'dscrLowest', 'interestCover']);
    const p = way(w.keep, 'price');
    expect(p.change).toEqual({ utilisationPct: [85, 85, 85], price: 249.83 });
    expect([icP(50000, 249.83).toFixed(5), icP(50000, 249.82).toFixed(5)]).toEqual(['1.50010', '1.49972']);
    expect(check(withChange(P, p.change), 'interestCover')).toBeCloseTo(icP(50000, 249.83), 9);
    expect(check({ ...P, utilisationPct: [85, 85, 85], price: 249.82 }, 'interestCover')).toBeCloseTo(icP(50000, 249.82), 9);
  });

  it('or a plant of 83,276 units a year at 85% use, its cost asked', () => {
    const c = way(w.keep, 'capacity');
    expect([c.change, c.ask]).toEqual([{ utilisationPct: [85, 85, 85], capacity: 83276 }, { id: 'plantCost' }]);
    expect([icP(83276, 150).toFixed(5), icP(83275, 150).toFixed(5)]).toEqual(['1.50003', '1.49991']);
    expect(check(withChange(P, c.change), 'interestCover')).toBeCloseTo(icP(83276, 150), 9);
  });

  it('has no change of the loan that meets alone: a smaller loan leaves interest cover short in the part first year', () => {
    expect(w.change).toEqual([]);
    expect(way(w.not, 'loan').still).toEqual(['interestCover']);
    expect(way(w.keep, 'variable').change).toEqual({ variablePct: 28.3 });
  });
});

describe('Make it work on the fill case (D-UX-251: what the line must do)', () => {
  const w = work(FILL);
  it('offers the first year\'s use, the price, the plant, variable costs, then the loan', () => {
    expect(w.keep.map((k) => [k.id, k.change])).toEqual([
      ['use1', { utilisationPct: [65.7, 70, 85] }], ['price', { price: 29.86 }], ['capacity', { capacity: 597090 }], ['variable', { variablePct: 58.2 }],
    ]);
    expect(w.change.map((c) => [c.change.amount, c.change.instalments])).toEqual([[614000, undefined], [724000, 24]]);
  });

  it('each is the least on its grid: one step less misses again', () => {
    for (const v of [...w.keep, ...w.change]) expect(misses(withChange(FILL, v.change))).toEqual([]);
    for (const c of [{ utilisationPct: [65.6, 70, 85] }, { price: 29.85 }, { capacity: 597089 }, { variablePct: 58.3 }]) expect(misses(withChange(FILL, c)).length).toBeGreaterThan(0);
  });
});

describe('the promoters\' money kept in the business, and an expansion\'s loans today (OR11d)', () => {
  it('cash at the start adds to the capital, the cash and the net worth in every year, never to the project or its DSCR', () => {
    const a = projectReport(R) as Report, b = projectReport({ ...R, cashAtStart: 176000 }) as Report;
    expect([b.projectCost, b.finance.total, b.finance.kept]).toEqual([a.projectCost, a.finance.total, 176000]);
    b.years.forEach((y, i) => {
      expect(y.cash - a.years[i].cash).toBeCloseTo(176000, 6);
      expect(y.netWorth - a.years[i].netWorth).toBeCloseTo(176000, 6);
      expect(y.liabilities).toBeCloseTo(y.assets, 6);
      expect(y.dscr).toBe(a.years[i].dscr);
    });
    expect(misses({ ...R, cashAtStart: 176000 })).not.toContain('currentRatio');
  });

  it('today\'s loans add their instalments to every year\'s debt service, and only for an expansion', () => {
    const line: ReportInput = { ...CASE_R, salesBy: 'expansion', sales: 7000000, salesGrowthPct: 10, capacity: 500000, price: 25, utilisationPct: [55, 70, 85], priceGrowthPct: 5, monthsToStart: 6 };
    const e = projectReport({ ...line, existingEmis: 240000 }) as Report;
    // tests/expansion.test.ts: 2026-27's cash for the loan 14,64,160 against 7,27,083.33; with 2,40,000 a year more.
    expect(e.years[0].dscr).toBeCloseTo(1464160 / (727083.33 + 240000), 6);
    expect((projectReport({ ...R, existingEmis: 240000 }) as Report).years[0].dscr).toBe((projectReport(R) as Report).years[0].dscr);
  });
});
