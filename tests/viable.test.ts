/**
 * Make it viable (engine/viable.ts, D-UX-50) on fictional case R (tests/report.test.ts, worked by hand there), with its
 * sales cut to 70 lakh so the DSCR misses, and on case P (drivers, PMEGP) with its price cut to Rs. 150.
 *
 * The threshold by hand, case R's first year (2026-27), the lowest, at sales S: profit before tax = 0.35 S − 18,00,000 −
 * 4,20,000 − 20,000 − 2,27,083.33 − 55,000; tax 31.2% (a firm); cash available = profit after tax + 4,40,000 + 2,27,083.33;
 * service 7,27,083.33. A DSCR of 1.20 needs 8,72,500 available, so profit after tax 2,05,416.67, before tax 2,98,570.74,
 * and 0.35 S = 28,20,654.07: S = 80,59,011.63. On the engine's 0.1% steps: from 70 lakh, 70,00,000 × 1.152 = 80,64,000
 * (1.151 gives 80,57,000, short); from 1.2 crore, 1,20,00,000 × 0.672 = 80,64,000 (0.671 gives 80,52,000, short).
 */
import { describe, it, expect } from 'vitest';
import { shortfall } from '../engine/dscr';
import { projectReport, type Report, type ReportInput } from '../engine/report';
import { TARGET, makeViable, type Viability } from '../engine/viable';
import { CASE_R } from './report.test';

const meets = (x: ReportInput) => !shortfall((projectReport(x) as Report).plan.statement, TARGET);
const P: ReportInput = {
  taxBy: 'firm', cost: { land: 200000, building: 600000, machinery: 2000000, preliminary: 50000 },
  loan: { amount: 2400000, ratePct: 10, disbursed: '2026-10', moratoriumMonths: 6, instalments: 48, frequency: 'monthly', style: 'equal-principal' },
  capacity: 50000, price: 150, utilisationPct: [60, 70, 80], priceGrowthPct: 0, monthsToStart: 3, variablePct: 70, fixedCosts: 1200000, fixedGrowthPct: 5,
  days: { stock: 30, debtors: 30, creditors: 30 }, wcLimit: 300000, wcRatePct: 11, scheme: { id: 'pmegp', category: 'general', area: 'rural', activity: 'manufacturing' },
};

describe('case R: the sales a 1.20 lowest year needs', () => {
  const weak = { ...CASE_R, sales: 7000000 }, v = makeViable(weak) as Viability;
  it('misses as typed, and names why', () => {
    expect([v.meets, v.misses]).toEqual([false, 'the lowest year, 2026-27, is below the target']);
  });
  it('sales 15.2% higher: 80,64,000 in 2026-27, the hand threshold of 80,59,011.63 rounded up to the 0.1% step', () => {
    expect([v.sales?.tenths, v.sales?.fy, v.sales?.needed.toFixed(2)]).toEqual([152, '2026-27', '8064000.00']);
    expect([meets({ ...weak, sales: 8064000 }), meets({ ...weak, sales: 8057000 })]).toEqual([true, false]);
    expect([meets({ ...weak, sales: 8059012 }), meets({ ...weak, sales: 8059011 })]).toEqual([true, false]);
  });
  it('the same threshold reached from above: as typed, sales can fall 32.8%', () => {
    const s = makeViable(CASE_R) as Viability;
    expect([s.meets, s.sales?.tenths, s.sales?.needed.toFixed(2), s.loan, s.instalments]).toEqual([true, -328, '8064000.00', undefined, undefined]);
  });
  it('or the largest loan, to the rupee, that meets; or the fewest instalments', () => {
    const l = v.loan as NonNullable<Viability['loan']>, n = v.instalments as NonNullable<Viability['instalments']>;
    expect(l.more).toBe(2500000 - l.largest);
    expect([meets({ ...weak, loan: { ...weak.loan, amount: l.largest } }), meets({ ...weak, loan: { ...weak.loan, amount: l.largest + 1 } })]).toEqual([true, false]);
    expect([meets({ ...weak, loan: { ...weak.loan, instalments: n.needed } }), meets({ ...weak, loan: { ...weak.loan, instalments: n.needed - 1 } })]).toEqual([true, false]);
  });
});

describe('case P at Rs. 150 a unit: the drivers and PMEGP', () => {
  const v = makeViable(P) as Viability, s = v.sales as NonNullable<Viability['sales']>;
  it('the price that meets, and the use of the capacity beyond full', () => {
    expect(v.meets).toBe(false);
    expect([meets({ ...P, price: s.price?.needed }), meets({ ...P, price: 150 * (1 + (s.tenths - 1) / 1000) })]).toEqual([true, false]);
    expect((s.use?.needed ?? []).map((x, k) => x / (s.use?.now[k] as number))).toEqual((s.use?.now ?? []).map(() => 1 + s.tenths / 1000));
    expect(s.use?.overFull).toBe(true);
  });
  it('a smaller loan stays above the margin money set off against it', () => {
    const l = v.loan as NonNullable<Viability['loan']>, r = projectReport(P) as Report;
    expect(l.largest).toBeGreaterThan(r.scheme?.subsidy as number);
    expect([meets({ ...P, loan: { ...P.loan, amount: l.largest } }), meets({ ...P, loan: { ...P.loan, amount: l.largest + 1 } })]).toEqual([true, false]);
  });
});

it('needs pass through: nothing is guessed', () => {
  expect(makeViable({ ...CASE_R, variablePct: undefined })).toEqual({ needs: ['Materials and other variable costs, as a share of sales (%), below 100'] });
});
