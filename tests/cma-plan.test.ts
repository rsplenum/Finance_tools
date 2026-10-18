import { describe, expect, it } from 'vitest';
import { cma, type Cma, type CmaInput, type Figures, type YearId } from '../engine/cma';
import { CMA_AS_TYPED, cmaCollateralNeeded, cmaDiagnose, cmaViable, makeCmaPlan, monthsRoom, withCmaLevers, type CmaPlan, type CmaViability } from '../engine/cma-plan';
import { EXAMPLE } from '../site/src/cma/example';

/*
 * Fictional case M (MV4, 11-10-2026), a small trader stretched on its bank borrowing, in lakh, oldest year first, worked
 * by hand before the engine ran it. Estimate 2026-27 and projection 2027-28:
 *   P&L 2026-27: sales 200; cost of sales 140 + 20 + 5 = 165; less salaries 12 and SGA 8: PBIT 15, PBDIT 20; interest
 *   9 + 3 = 12; PBT 3; tax 0.75; net profit 2.25. Interest cover 20 ÷ 12 = 1.6667. DSCR (2.25 + 5 + 3) ÷ (3 + the
 *   year before's 4 due) = 10.25 ÷ 7 = 1.4643.
 *   P&L 2027-28: sales 240; cost of sales 170 + 25 + 5 = 200; less 14 and 10: PBIT 16, PBDIT 21; interest 12.5 + 2.5 = 15;
 *   PBT 1; tax 0.25; net profit 0.75. Interest cover 21 ÷ 15 = 1.4. DSCR (0.75 + 5 + 2.5) ÷ (2.5 + 4) = 8.25 ÷ 6.5 = 1.2692.
 *   Average DSCR (10.25 + 8.25) ÷ (7 + 6.5) = 18.5 ÷ 13.5 = 1.3704.
 *   Balance sheet 2026-27: current liabilities 70 + 30 + 4 + 2 = 106; term liabilities 24 − 4 + 10 = 30; net worth 20 + 5
 *   = 25; outside 136; total 161 = assets 40 + 10 + (40 + 30 + 3 + 38 = 111). Current ratio 111 ÷ 106 = 1.0472; TOL/TNW
 *   136 ÷ 25 = 5.44; debt-equity 30 ÷ 25 = 1.2; fixed-asset cover 40 ÷ 24 = 1.6667; security cover (40 + 40 + 30) ÷
 *   (24 + 70) = 110 ÷ 94 = 1.1702.
 *   Balance sheet 2027-28: current liabilities 80 + 34 + 4 + 2 = 120; term liabilities 20 − 4 + 10 = 26; net worth 25;
 *   outside 146; total 171 = 35 + 10 + (48 + 36 + 2 + 40 = 126). Current ratio 1.05; TOL/TNW 5.84; debt-equity 1.04;
 *   fixed-asset cover 1.75; security cover 119 ÷ 100 = 1.19.
 * Fresh (D-UX-51): misses the current ratio (1.0472 < 1.1), TOL/TNW (5.84 > 5), the average DSCR (< 1.5), the interest
 * cover (1.4 < 1.5) and the security cover (< 1.2). Renewal: misses only the average DSCR and the security cover.
 */
const L: Record<string, number[]> = {
  sales: [150, 165, 180, 200, 240], otherIncome: [0, 0, 0, 0, 0], materials: [103, 114, 126, 140, 170], otherDirect: [15, 17, 18, 20, 25],
  employees: [9, 10, 11, 12, 14], sga: [6, 7, 7, 8, 10], depreciation: [5, 5, 5, 5, 5], wcInterest: [7.5, 8, 8.5, 9, 12.5], tlInterest: [4.5, 4, 3.5, 3, 2.5],
  tax: [0, 0, 0.25, 0.75, 0.25], drawings: [0, 0, 0.75, 1.25, 0.75],
  capital: [20, 20, 20, 20, 20], reserves: [4, 4, 4, 5, 5], promoterLoans: [10, 10, 10, 10, 10], termLoans: [36, 32, 28, 24, 20], tlDue12: [4, 4, 4, 4, 4],
  bankWc: [55, 60, 65, 70, 80], creditors: [24, 26, 28, 30, 34], otherCl: [2, 2, 2, 2, 2],
  netBlock: [55, 50, 45, 40, 35], nonCurrent: [10, 10, 10, 10, 10], stock: [32, 35, 38, 40, 48], debtors: [24, 26, 28, 30, 36], cash: [3, 3, 3, 3, 2], otherCa: [27, 30, 33, 38, 40],
};
const IDS: YearId[] = ['a1', 'a2', 'a3', 'est', 'proj'];
const rupeesOf = (rows: Record<string, number[]>) =>
  Object.fromEntries(IDS.map((id, i) => [id, Object.fromEntries(Object.entries(rows).map(([k, v]) => [k, Math.round(v[i] * 1e5)]))])) as Record<YearId, Figures>;
const M: CmaInput = { startYear: 2026, figures: rupeesOf(L), existingLimit: 6000000, collateral: 0 };
const K: CmaInput = { startYear: 2026, figures: rupeesOf(EXAMPLE.rows), existingLimit: EXAMPLE.existingLimit };
const run = (x: CmaInput) => cma(x) as Cma;
const short = (x: CmaInput, c: 'fresh' | 'renewal') =>
  Object.fromEntries(cmaDiagnose(run(x), x, c).checks.filter((k) => k.short).map((k) => [k.id, [Math.ceil(k.short!.amount - 1e-6), k.fy]]));
const misses = (x: CmaInput, c: 'fresh' | 'renewal') => cmaDiagnose(run(x), x, c).misses;

describe('CMA levels, case M worked by hand', () => {
  it('works the DSCR, interest cover and the two covers as by hand', () => {
    const [e, p] = run(M).years.slice(3);
    expect(e.dscr).toBeCloseTo(10.25 / 7, 9); expect(p.dscr).toBeCloseTo(8.25 / 6.5, 9);
    expect(e.interestCover).toBeCloseTo(20 / 12, 9); expect(p.interestCover).toBeCloseTo(1.4, 9);
    expect(e.facr).toBeCloseTo(40 / 24, 9); expect(p.facr).toBeCloseTo(1.75, 9);
    expect(e.securityCover).toBeCloseTo(110 / 94, 9); expect(p.securityCover).toBeCloseTo(1.19, 9);
  });

  it('case K: DSCR 45.2 ÷ 8 = 5.65 and 54 ÷ 9 = 6, the year before’s due-in-12 in the service', () => {
    const [e, p] = run(K).years.slice(3);
    expect(e.dscr).toBeCloseTo(5.65, 9); expect(p.dscr).toBeCloseTo(6, 9);
    expect(misses(K, 'fresh')).toEqual([]);
  });

  it('case K: the security cover on its own assets, (110 + 60 + 58) ÷ (40 + 95) = 228 ÷ 135 = 1.6889 in 2027-28 (2026-27: 166 ÷ 82), meets 1.20 with no collateral typed (D-UX-93)', () => {
    const sc = cmaDiagnose(run(K), K, 'fresh').checks.find((k) => k.id === 'securityCover');
    expect(sc).toMatchObject({ meets: true, own: true, fy: '2027-28' }); expect(sc?.worst).toBeCloseTo(228 / 135, 9);
    expect(cmaCollateralNeeded(run(K), K, 'fresh')).toBe(0);
  });

  it('case M with no collateral typed: 110 ÷ 94 = 1.1702 is short of 1.20, so the cover waits for the collateral’s value', () => {
    const M0 = { ...M, collateral: undefined };
    const sc = cmaDiagnose(run(M0), M0, 'fresh').checks.find((k) => k.id === 'securityCover');
    expect(sc?.meets).toBeUndefined(); expect(sc?.own).toBeUndefined();
    expect(cmaCollateralNeeded(run(M0), M0, 'fresh')).toBe(311112);
  });

  it('reads a fresh loan’s levels and a renewal’s, each ratio in its worse year', () => {
    expect(misses(M, 'fresh')).toEqual(['currentRatio', 'tolTnw', 'dscrAverage', 'interestCover', 'securityCover']);
    expect(misses(M, 'renewal')).toEqual(['dscrAverage', 'securityCover']);
  });

  it('gives each shortfall in rupees as by hand', () => {
    // 1.1 × 106 − 111 = 5.6 L; 146 ÷ 5 − 25 = 4.2 L; 1.5 × 13.5 − 18.5 = 1.75 L; 1.5 × 15 − 21 = 1.5 L; 1.2 × 94 − 110 = 2.8 L.
    expect(short(M, 'fresh')).toEqual({
      currentRatio: [560000, '2026-27'], tolTnw: [420000, '2027-28'], dscrAverage: [175000, undefined],
      interestCover: [150000, '2027-28'], securityCover: [280000, '2026-27'],
    });
  });

  it('waits on the security cover until the collateral is typed', () => {
    const x = { ...M, collateral: undefined };
    expect(misses(x, 'renewal')).toEqual(['dscrAverage']);
  });
});

describe('Each lever alone, case M (the board)', () => {
  const fresh = cmaViable(M, 'fresh') as CmaViability, renewal = cmaViable(M, 'renewal') as CmaViability;
  const meets = (l: Partial<typeof CMA_AS_TYPED>, id: string, c: 'fresh' | 'renewal' = 'fresh') => !misses(withCmaLevers(M, { ...CMA_AS_TYPED, ...l }), c).includes(id as never);

  it('the promoters’ loans counted as their funds: TOL/TNW (136 − 10) ÷ 35 = 3.6 and 136 ÷ 35 = 3.886', () => {
    expect(fresh.quasi).toMatchObject({ loans: 1000000, fixes: ['tolTnw'] });
    expect(renewal.quasi).toBeUndefined(); expect(renewal.quasiNone).toBeDefined();
  });

  it('capital: 120 − 126 ÷ 1.1 = 5,45,454.55, so 5,45,455, and a rupee less misses the current ratio', () => {
    expect(fresh.capital).toMatchObject({ needed: 545455, fixes: ['currentRatio', 'tolTnw', 'securityCover'] });
    expect(meets({ capital: 545455 }, 'currentRatio')).toBe(true); expect(meets({ capital: 545454 }, 'currentRatio')).toBe(false);
    // Renewal: 94 − 110 ÷ 1.2 = 2,33,333.33, so 2,33,334.
    expect(renewal.capital).toMatchObject({ needed: 233334, fixes: ['securityCover'] });
    expect(meets({ capital: 233334 }, 'securityCover', 'renewal')).toBe(true); expect(meets({ capital: 233333 }, 'securityCover', 'renewal')).toBe(false);
  });

  it('sales: 5.2% more (2,52,48,000) meets the average DSCR and the interest cover; 5.1% misses the DSCR', () => {
    // 5.2%: PBT 1 + 12.48 − 8.84 − 1.3 = 3.34 L; tax a quarter, 0.835; net profit 2.505; 10.25 + 10.005 = 20.255 ≥ 20.25.
    // 5.1%: PBT 3.295; net profit 2.47125; 20.22125 < 20.25. Interest cover alone needs 3.4% (PBDIT up 1.53 L ≥ 1.5).
    expect(fresh.sales).toMatchObject({ tenths: 52, now: 24000000, needed: 25248000, fy: '2027-28', fixes: ['dscrAverage', 'interestCover'] });
    expect(meets({ sales: 51 }, 'dscrAverage')).toBe(false);
    expect(meets({ sales: 34 }, 'interestCover')).toBe(true); expect(meets({ sales: 33 }, 'interestCover')).toBe(false);
  });

  it('a longer repayment: 30 months more cuts 2027-28’s due to 2,82,353; 29 misses the average DSCR', () => {
    // 72 months left; 12 × 24 L ÷ 102 = 2,82,352.94, up to 2,82,353; service 7 + 2.5 + 2.82353 = 12.32353 L × 1.5 ≤ 18.5.
    // 29: 12 × 24 L ÷ 101 = 2,85,149; × 1.5 = 18.527 > 18.5. Room: 180 − 72 = 108 months.
    expect(monthsRoom(M)).toBe(108);
    expect(fresh.months).toMatchObject({ needed: 30, dueNow: 400000, due: 282353, room: 108, fixes: ['dscrAverage'] });
    expect(meets({ months: 29 }, 'dscrAverage')).toBe(false);
  });

  it('the collateral: 2.8 L ÷ 90% = 3,11,111.11, so 3,11,112 at market value, and a rupee less misses', () => {
    expect(fresh.collateral).toEqual({ now: 0, needed: 311112 });
    expect(meets({ collateral: 311112 }, 'securityCover')).toBe(true); expect(meets({ collateral: 311111 }, 'securityCover')).toBe(false);
  });

  it('keeps every balance sheet balanced with the levers written in', () => {
    const x = withCmaLevers(M, { quasi: 1, capital: 545455, sales: 52, months: 30, collateral: 311112 });
    for (const y of run(x).years) expect(Math.abs(y.assets - y.liabilities)).toBeLessThan(0.01);
    const big = withCmaLevers(M, { ...CMA_AS_TYPED, capital: 9000000 }), e = big.figures.est as Figures;
    // Past nil the bank's borrowing becomes cash: 70 L cut to nil, the other 20 L in cash.
    expect(e.bankWc).toBe(0); expect(e.cash).toBe(300000 + 2000000);
  });

  it('case K meets every level: sales can fall by the margin the engine finds, and a tenth more misses one', () => {
    const v = cmaViable(K, 'fresh') as CmaViability;
    expect(v.meets).toBe(true);
    const k = (v.sales as { tenths: number }).tenths;
    expect(k).toBeLessThan(0);
    expect(misses(withCmaLevers(K, { ...CMA_AS_TYPED, sales: k }), 'fresh')).toEqual([]);
    expect(misses(withCmaLevers(K, { ...CMA_AS_TYPED, sales: k - 1 }), 'fresh').length).toBeGreaterThan(0);
  });
});

describe('The levers together, case M (the plan)', () => {
  it('fresh, no promoters’ most: their loans, 5.2% more sales and the collateral; the current ratio still misses', () => {
    const p = makeCmaPlan(M, 'fresh') as CmaPlan;
    expect(p.levers).toEqual({ quasi: 1, capital: 0, sales: 52, months: 0, collateral: 311112 });
    expect(p.works).toBe(false); expect(p.still).toEqual(['currentRatio']);
  });

  it('fresh, the promoters able to bring 10 L: 5,45,455 of capital and nothing else is needed past sales', () => {
    const p = makeCmaPlan(M, 'fresh', { promotersMost: 1000000 }) as CmaPlan;
    expect(p.levers).toEqual({ quasi: 1, capital: 545455, sales: 52, months: 0, collateral: 0 });
    expect(p.works).toBe(true);
  });

  it('renewal: 5.2% more sales and the collateral', () => {
    const p = makeCmaPlan(M, 'renewal') as CmaPlan;
    expect(p.levers).toEqual({ quasi: 0, capital: 0, sales: 52, months: 0, collateral: 311112 });
    expect(p.works).toBe(true);
  });

  it('keeps a lever the borrower holds and works the rest around it', () => {
    const p = makeCmaPlan(M, 'renewal', { held: { sales: 0 } }) as CmaPlan;
    expect(p.levers).toMatchObject({ sales: 0, months: 30, collateral: 311112 });
    expect(p.works).toBe(true);
  });
});
