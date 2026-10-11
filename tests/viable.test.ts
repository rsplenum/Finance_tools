/**
 * Make it viable (engine/viable.ts, D-UX-50, D-UX-52) on fictional case R (tests/report.test.ts, worked by hand there),
 * with its sales cut to 70 lakh so it misses, and on case P (drivers, PMEGP) with its price cut to Rs. 150. The levels are
 * a fresh loan's (engine/data/ratios.json, D-UX-51).
 *
 * Case R at 70 lakh, year 1 (2026-27), by hand. Profit before tax 0.35 × 70,00,000 − 18,00,000 − 4,20,000 − 20,000 −
 * 2,27,083.33 − 55,000 = −72,083.33, no tax. Cash available −72,083.33 + 4,40,000 + 2,27,083.33 = 5,95,000; service
 * 7,27,083.33; DSCR 0.8183. Interest cover (−72,083.33 + 2,82,083.33) ÷ 2,82,083.33 = 0.7445. Stock and creditors
 * 3,73,972.60, debtors 5,75,342.47, the margin 75,342.47, the promoters 8,75,342.47; cash 46,17,231.74 − 47,49,315.07 =
 * −1,32,083.33; current ratio 8,17,231.74 ÷ 8,73,972.60 = 0.9351.
 *
 * Sales: a lowest-year DSCR of 1.25 needs 9,08,854.17 available, profit after tax 2,41,770.83, before tax (31.2%)
 * 3,51,411.09, so 0.35 S = 28,73,494.43: S = 82,09,984.08 (interest cover's 1.50 needs only 76,08,928.57). On the 0.1%
 * steps: 70,00,000 × 1.173 = 82,11,000 (1.172 gives 82,04,000, short); from 1.2 crore, × 0.685 = 82,20,000 (0.684 gives
 * 82,08,000, short).
 * A smaller term loan L: year 1's interest (12 L − L/60 × 66) × 10/1200 = 0.0908333 L; interest cover 2,10,000 ÷ (55,000 +
 * 0.0908333 L) ≥ 1.50 when L ≤ 9,35,779.82.
 * A smaller limit W: the margin 5,75,342.47 − W; cash −77,083.33 − 0.11 W; current ratio (8,72,231.74 − 0.11 W) ÷ (W +
 * 3,73,972.60) ≥ 1.10 when W ≤ 3,80,877.59; the promoters bring 5,00,000 − W more as margin.
 */
import { describe, it, expect } from 'vitest';
import { projectReport, type Report, type ReportInput } from '../engine/report';
import { diagnose } from '../engine/ratios';
import { makeViable, type Viability } from '../engine/viable';
import { CASE_R } from './report.test';

export const P: ReportInput = {
  taxBy: 'firm', cost: { land: 200000, building: 600000, machinery: 2000000, preliminary: 50000 },
  loan: { amount: 2400000, ratePct: 10, disbursed: '2026-10', moratoriumMonths: 6, instalments: 48, frequency: 'monthly', style: 'equal-principal' },
  capacity: 50000, price: 150, utilisationPct: [60, 70, 80], priceGrowthPct: 0, monthsToStart: 3, variablePct: 70, fixedCosts: 1200000, fixedGrowthPct: 5,
  days: { stock: 30, debtors: 30, creditors: 30 }, wcLimit: 300000, wcRatePct: 11, scheme: { id: 'pmegp', category: 'general', area: 'rural', activity: 'manufacturing' },
};
const misses = (x: ReportInput) => diagnose(projectReport(x) as Report, x).misses;
const weak = { ...CASE_R, sales: 7000000 };

describe('case R at 70 lakh: the diagnosis', () => {
  const v = makeViable(weak) as Viability, d = v.diagnosis;
  it('each ratio in its worst year, against a fresh loan\'s level', () => {
    expect(d.checks.map((c) => [c.id, c.worst?.toFixed(4), c.fy, c.meets])).toEqual([
      ['currentRatio', '0.9351', '2026-27', false], ['tolTnw', expect.any(String), '2026-27', true], ['debtEquity', expect.any(String), '2026-27', true],
      ['dscrAverage', expect.any(String), undefined, false], ['dscrLowest', '0.8183', '2026-27', false], ['interestCover', '0.7445', '2026-27', false],
      ['facr', '1.3900', '2026-27', true], ['securityCover', undefined, undefined, undefined],
    ]);
    expect([v.meets, d.misses, d.term]).toEqual([false, ['currentRatio', 'dscrAverage', 'dscrLowest', 'interestCover'], { months: 60, longest: 180 }]);
  });
});

// The shortfall in rupees in each missed ratio's worst year (MV2b), by hand from the year-1 figures above: the lowest DSCR
// needs 1.25 × 7,27,083.33 = 9,08,854.17 available, 3,13,854.17 more; interest cover 1.50 × 2,82,083.33 = 4,23,125 of
// profit before interest and tax against 2,10,000, 2,13,125 more; the current ratio 1.10 × 8,73,972.60 = 9,61,369.86 of
// current assets against 8,17,231.74 (unrounded 8,17,231.735), 1,44,138.13 more.
// With a 20 lakh limit and collateral of 3 lakh: no margin, the promoters 8,00,000; working-capital interest 2,20,000,
// profit before tax 24,50,000 − 18,00,000 − 4,20,000 − 20,000 − 2,27,083.33 − 2,20,000 = −2,37,083.33, net worth
// 5,62,916.67. TOL 20,00,000 + 20,00,000 + 3,73,972.60 = 43,73,972.60, so TOL/TNW 7.7702; at 5 it needs a net worth of
// 8,74,794.52, 3,11,877.85 more. Security 27,80,000 + 3,73,972.60 + 5,75,342.47 + 2,70,000 (90% of 3 lakh) = 39,99,315.07
// against 1.20 × 40,00,000 = 48,00,000: 8,00,684.93 more.
describe('case R at 70 lakh: the shortfall in rupees in the worst year', () => {
  const short = (x: ReportInput) => Object.fromEntries(diagnose(projectReport(x) as Report, x).checks.filter((c) => c.meets === false).map((c) => [c.id, [c.short?.amount.toFixed(2), c.short?.of]]));
  it('the cash for the loan, the profit and the current assets', () => {
    expect(short(weak)).toEqual({
      currentRatio: ['144138.13', 'currentAssets'], dscrAverage: [expect.any(String), 'cash'], dscrLowest: ['313854.17', 'cash'], interestCover: ['213125.00', 'profit'],
    });
  });
  it('the average DSCR\'s over the loan: with that much more cash in total it reads 1.50 exactly', () => {
    const r = projectReport(weak) as Report, t = r.plan.statement.total as NonNullable<Report['plan']['statement']['total']>;
    const k = diagnose(r, weak).checks.find((c) => c.id === 'dscrAverage');
    expect(((t.available + (k?.short?.amount as number)) / t.service).toFixed(10)).toBe('1.5000000000');
  });
  it('the net worth and the security, with a 20 lakh limit and collateral of 3 lakh', () => {
    const s = short({ ...weak, wcLimit: 2000000, collateral: 300000 });
    expect([s.tolTnw, s.securityCover]).toEqual([['311877.85', 'netWorth'], ['800684.93', 'security']]);
  });
});

describe('case R at 70 lakh: each change alone, against every ratio', () => {
  const v = makeViable(weak) as Viability;
  it('sales 17.3% higher: 82,11,000, the hand threshold of 82,09,984.08 rounded up to the 0.1% step', () => {
    expect([v.sales?.tenths, v.sales?.needed.toFixed(2), v.sales?.still]).toEqual([173, '8211000.00', []]);
    expect([misses({ ...weak, sales: 8209985 }), misses({ ...weak, sales: 8209984 })]).toEqual([[], ['dscrLowest']]);
  });
  it('the same threshold from above: as typed, sales can fall 31.5%', () => {
    const s = makeViable(CASE_R) as Viability;
    expect([s.meets, s.sales?.tenths, s.sales?.needed.toFixed(2), s.loan, s.instalments]).toEqual([true, -315, '8220000.00', undefined, undefined]);
  });
  it('a term loan of at most 9,35,779, interest cover the last to meet', () => {
    expect([v.loan?.largest, v.loan?.more, v.loan?.still]).toEqual([935779, 2500000 - 935779, []]);
    expect(misses({ ...weak, loan: { ...weak.loan, amount: 935780 } })).toEqual(['interestCover']);
  });
  it('a limit of at most 3,80,877 meets the current ratio only, the promoters bringing the rest as margin', () => {
    expect([v.wc?.largest, v.wc?.more.toFixed(2), v.wc?.fixes, v.wc?.still]).toEqual([380877, '119123.00', ['currentRatio'], ['dscrAverage', 'dscrLowest', 'interestCover']]);
    expect(misses({ ...weak, wcLimit: 380878 })).toContain('currentRatio');
  });
  it('the lender\'s: the fewest months of moratorium or instalments, within 180 months; what they break is named', () => {
    const m = v.moratorium as NonNullable<Viability['moratorium']>, n = v.instalments as NonNullable<Viability['instalments']>;
    const at = (mo: number, ins: number) => misses({ ...weak, loan: { ...weak.loan, moratoriumMonths: mo, instalments: ins } });
    expect([m.fixes, m.still]).toEqual([['currentRatio', 'dscrAverage', 'dscrLowest'], ['interestCover', 'facr']]);
    expect(at(m.needed, 60)).toEqual(m.still);
    expect(at(m.needed - 1, 60).length).toBeGreaterThan(m.still.length);
    expect(at(0, n.needed)).toEqual(n.still);
    expect(at(0, n.needed - 1).length).toBeGreaterThan(n.still.length);
    expect([m.needed + 60, n.needed]).toEqual([expect.any(Number), expect.any(Number)]);
    expect(m.needed + 60 <= 180 && n.needed <= 180).toBe(true);
  });
  it('no longer loan past 180 months', () => {
    const w = makeViable({ ...weak, loan: { ...weak.loan, moratoriumMonths: 12, instalments: 168 } }) as Viability;
    expect([w.moratoriumNone, w.instalmentsNone]).toEqual(['The loan already runs 180 months: none longer within 180.', 'The loan already runs 180 months: none longer within 180.']);
  });
});

// Case R with a limit of 20 lakh: no margin money; year 1 secures 20,00,000 + 20,00,000 with net fixed assets 27,80,000,
// stock 6,41,095.89 and debtors 9,86,301.37, 44,07,397.26. A cover of 1.20 needs 48,00,000: a realisable sale value of
// 3,92,602.74, a market value of 4,36,225.27 (÷ 0.90), 4,36,226 to the rupee; year 2 secures 35,00,000 with 42,07,136.99,
// already 1.20.
describe('the collateral and the security cover', () => {
  const big = { ...CASE_R, wcLimit: 2000000 };
  it('until typed: no security cover, and the market value it needs', () => {
    const v = makeViable(big) as Viability;
    expect([v.diagnosis.checks.find((c) => c.id === 'securityCover')?.meets, v.collateral]).toEqual([undefined, { needed: 436226 }]);
  });
  it('typed: its realisable and distress sale values, and the cover read in its worst year', () => {
    const r = projectReport({ ...big, collateral: 436226 }) as Report;
    expect([r.collateral?.rsv.toFixed(2), r.collateral?.dsv.toFixed(2), r.years[0].securityCover?.toFixed(6)]).toEqual(['392603.40', '348980.80', '1.200000']);
    expect(misses({ ...big, collateral: 436226 })).toEqual([]);
    expect(misses({ ...big, collateral: 436225 })).toEqual(['securityCover']);
    const v = makeViable({ ...big, collateral: 300000 }) as Viability;
    expect([v.meets, v.collateral]).toEqual([false, { now: 300000, needed: 436226 }]);
  });
});

describe('case P at Rs. 150 a unit: the drivers and PMEGP', () => {
  const v = makeViable(P) as Viability, s = v.sales as NonNullable<Viability['sales']>;
  it('the price that meets, and the use of the capacity beyond full', () => {
    expect(v.meets).toBe(false);
    expect([misses({ ...P, price: s.price?.needed }), misses({ ...P, price: 150 * (1 + (s.tenths - 1) / 1000) }).length > 0]).toEqual([[], true]);
    expect((s.use?.needed ?? []).map((x, k) => x / (s.use?.now[k] as number))).toEqual((s.use?.now ?? []).map(() => 1 + s.tenths / 1000));
    expect([s.use?.overFull, s.use?.overMost]).toEqual([true, true]);
  });
  it('a smaller loan stays above the margin money set off against it', () => {
    const l = v.loan as NonNullable<Viability['loan']>, r = projectReport(P) as Report;
    expect(l.largest).toBeGreaterThan(r.scheme?.subsidy as number);
    expect(misses({ ...P, loan: { ...P.loan, amount: l.largest } })).toEqual(l.still);
    expect(misses({ ...P, loan: { ...P.loan, amount: l.largest + 1 } }).length).toBeGreaterThan(l.still.length);
  });
});

it('needs pass through: nothing is guessed', () => {
  expect(makeViable({ ...CASE_R, variablePct: undefined })).toEqual({ needs: ['Materials and other variable costs, as a share of sales (%), below 100'] });
  expect(makeViable({ ...CASE_R, collateral: -1 })).toEqual({ needs: ['The collateral\'s market value: a figure of 0 or more'] });
});
