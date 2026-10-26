/**
 * Mudra in the project report and the guarantee fee (SCH1). Case M is the owner's kind of fictional case, worked by hand:
 * plant 8 L, furniture 1 L, preliminary 50,000; a term loan of 8 L at 10% drawn in October 2026, 6 months' moratorium,
 * 48 monthly instalments of equal principal (16,666.67 from April 2027); a working-capital limit of 2 L; sales from
 * January 2027. In all 10 L: Tarun.
 *
 * CGFMU at 1% (its FAQ, Q14), the first year pro rata by months (the owner, 21-10-2026):
 *   term loan: 2026-27, 8 L × 1% × 6/12 (October to March) = 4,000; later, 1% of the balance on 1 April: 2027-28 on 8 L
 *   (nothing repaid yet) = 8,000; 2028-29 on 6 L (12 instalments, 2 L, paid) = 6,000; 2029-30 on 4 L = 4,000;
 *   2030-31 on 2 L = 2,000; the loan is repaid by March 2031.
 *   limit: 2 L × 1% = 2,000 a year, 3/12 of it in 2026-27 (January to March) = 500.
 *   In all: 4,500; 10,000; 8,000; 6,000; 4,000.
 * CGTMSE on the same loans with no scheme and one concession: the slab up to 10 L is 0.37%, less 10% = 0.333, 0.33 as
 * CGS-I's Annexure II rounds it. Term loan: the first twelve months (October 2026 to September 2027) on 8 L: 2,640 a
 * year, 1,320 in each of 2026-27 and 2027-28; October 2027 to March 2028 on the balance at 31 December 2026 (8 L):
 * 1,320; 2028-29 on 31 December 2027's 6.5 L (9 instalments paid) = 2,145; 2029-30 on 4.5 L = 1,485; 2030-31 on
 * 2.5 L = 825. Limit: 0.33% of 2 L = 660 a year, 165 in 2026-27. In all: 1,485; 3,300; 2,805; 2,145; 1,485.
 *
 * Hybrid security (OR7; CGS-I para 2(iv), 8.1 and Annexure IV): the same CGTMSE loans beside property with a market value
 * of 5 L, set against the term loan first. The slab stays that of the loans in all, 10 L: 0.33%. Guaranteed: the term loan
 * 8 L less 5 L = 3 L, the limit 2 L in full; 5 L in all. Term loan: the first twelve months on 3 L: 990 a year, 495 in
 * each of 2026-27 and 2027-28; October 2027 to March 2028 on 31 December 2026's 8 L less 5 L = 3 L: 495, so 990 in
 * 2027-28; 2028-29 on 6.5 L less 5 L = 1.5 L: 495; 2029-30 on 4.5 L, below the 5 L: nil, and the guarantee closes.
 * Limit as before: 165, then 660 a year. In all: 660; 1,650; 1,155; 660; 660.
 * Property of 9 L: 8 L against the term loan, none of it guaranteed, and 1 L against the limit, leaving 1 L of it
 * guaranteed: 0.33% of 1 L = 330 a year, 82.50 in 2026-27. Property of 10 L backs the loans in full: nothing to guarantee.
 */
import { describe, it, expect } from 'vitest';
import { MUDRA, mudraShort, projectReport, reportNeeds, type Report, type ReportInput } from '../engine/report';
import { cgtmseRate } from '../engine/guarantee';
import { collateralNeeded, diagnose } from '../engine/ratios';
import { makeViable, type Viability } from '../engine/viable';

const CASE_M: ReportInput = { taxBy: 'firm', cost: { machinery: 800000, furniture: 100000, preliminary: 50000 },
  loan: { amount: 800000, ratePct: 10, disbursed: '2026-10', moratoriumMonths: 6, instalments: 48, frequency: 'monthly', style: 'equal-principal' },
  capacity: 30000, price: 100, utilisationPct: [60, 70, 80], priceGrowthPct: 0, monthsToStart: 3, variablePct: 65, fixedCosts: 300000, fixedGrowthPct: 5,
  days: { stock: 30, debtors: 30, creditors: 30 }, wcLimit: 200000, wcRatePct: 11, scheme: { id: 'mudra' } };
const CGTMSE_M: ReportInput = { ...CASE_M, scheme: undefined, guarantee: { cgtmse: true, concessions: 1 } };
const report = (x: ReportInput) => { const r = projectReport(x); if ('needs' in r || 'blocked' in r) throw new Error(JSON.stringify(r)); return r as Report; };
const fees = (r: Report) => r.years.map((y) => y.guaranteeFee);
const close = (a: number[], b: number[]) => { expect(a.length).toBe(b.length); a.forEach((v, k) => expect(v).toBeCloseTo(b[k], 6)); };

describe('Mudra: the level and the guarantee fee by CGFMU', () => {
  it('case M is Tarun, 10 L in all, collateral free up to 20 L, applied for on JanSamarth', () => {
    const r = report(CASE_M);
    expect(r.mudra?.level.id).toBe('tarun');
    expect(r.mudra?.total).toBe(1000000);
    expect(r.mudra?.collateralFreeUpTo).toBe(2000000);
    expect(r.mudra?.apply.url).toMatch(/^https:\/\/www\.jansamarth\.in\//);
    expect(r.guarantee?.id).toBe('cgfmu');
  });
  it('CGFMU: 4,500; 10,000; 8,000; 6,000; 4,000 (worked by hand above)', () => {
    const r = report(CASE_M);
    expect(r.years.map((y) => y.fy)).toEqual(['2026-27', '2027-28', '2028-29', '2029-30', '2030-31']);
    close(fees(r), [4500, 10000, 8000, 6000, 4000]);
    close(r.guarantee?.years.map((y) => y.termLoan) ?? [], [4000, 8000, 6000, 4000, 2000]);
    expect(r.guarantee?.beforeStart).toBe(0);
  });
  it('the fee is a finance cost: profit before tax falls by it exactly, every year', () => {
    const with_ = report(CASE_M), none = report({ ...CASE_M, guarantee: { ratePct: 0 } });
    close(fees(none), [0, 0, 0, 0, 0]);
    with_.years.forEach((y, k) => expect(none.years[k].pbt - y.pbt).toBeCloseTo(y.guaranteeFee, 6));
    with_.years.forEach((y, k) => expect(y.fixedAll - none.years[k].fixedAll).toBeCloseTo(y.guaranteeFee, 6));
  });
  it('a fee before the first sales goes into the cost of the project, with the interest then', () => {
    // Sales from April 2027: 2026-27's term-loan fee, 4,000, is paid before them.
    const r = report({ ...CASE_M, monthsToStart: 6 });
    expect(r.guarantee?.beforeStart).toBeCloseTo(4000, 6);
    expect(r.cost.find((c) => c.id === 'fee')?.amount).toBeCloseTo(4000, 6);
    expect(r.years[0].fy).toBe('2027-28');
  });
  const levelAt = (amount: number) => {
    const x = { ...CASE_M, cost: { machinery: 3000000 }, loan: { ...CASE_M.loan, amount }, wcLimit: 0, scheme: { id: 'mudra' as const, tarunRepaid: true } };
    return report(x).mudra?.level.id;
  };
  it('the levels by the loans in all: Shishu to 50,000, Kishor to 5 L, Tarun to 10 L, Tarun Plus to 20 L', () => {
    expect([50000, 50001, 500000, 500001, 1000000, 1000001, 2000000].map(levelAt)).toEqual(['shishu', 'kishor', 'kishor', 'tarun', 'tarun', 'tarunPlus', 'tarunPlus']);
    expect(MUDRA.levels.map((l) => l.upTo)).toEqual([50000, 500000, 1000000, 2000000]);
  });
  it('stops above 20 L in all, and above 10 L unless a Tarun loan was repaid', () => {
    const big = { ...CASE_M, cost: { machinery: 3000000 }, loan: { ...CASE_M.loan, amount: 1900000 } };
    const over = reportNeeds({ ...big, scheme: { id: 'mudra', tarunRepaid: true } });
    expect(over.some((n) => n.startsWith('Mudra: the term loan and the working-capital limit come to Rs. 21,00,000, Rs. 1,00,000 above') && n.includes('CGTMSE'))).toBe(true);
    const plus = { ...big, loan: { ...big.loan, amount: 900000 }, wcLimit: 200000 };
    expect(reportNeeds({ ...plus, scheme: { id: 'mudra' } }).some((n) => n.startsWith('Mudra: the loans come to Rs. 11,00,000, above Tarun'))).toBe(true);
    expect(report({ ...plus, scheme: { id: 'mudra', tarunRepaid: true } }).mudra?.level.id).toBe('tarunPlus');
  });
  it('takes no collateral: one typed is refused; the security cover is shown, not counted; no collateral change offered', () => {
    expect(reportNeeds({ ...CASE_M, collateral: 500000 })).toContain('Mudra: a Mudra loan takes no collateral, so leave its market value empty');
    const r = report(CASE_M), cover = diagnose(r, CASE_M).checks.find((c) => c.id === 'securityCover');
    expect(cover?.meets).toBeUndefined();
    expect(cover?.na).toMatch(/^\d+\.\d\d in \d{4}-\d\d on the project's own assets; not counted on a Mudra loan/);
    expect(collateralNeeded(r, CASE_M)).toBeUndefined();
    expect((makeViable(CASE_M) as Viability).collateral).toBeUndefined();
  });
  it('says when the promoters\' most and Mudra\'s 20 L cannot fund the project (D-UX-111)', () => {
    expect(mudraShort(report(CASE_M), 0)).toBeUndefined();
    const big = { ...CASE_M, cost: { machinery: 3000000 }, scheme: { id: 'mudra' as const, tarunRepaid: true } }, r = report(big);
    // The term loan can be at most 20 L less the 2 L limit: 18 L; the rest beyond the promoters' 5 L is short.
    expect(mudraShort(r, 500000)).toBeCloseTo(r.projectCost - 500000 - 1800000, 6);
    expect(mudraShort(report({ ...CASE_M, scheme: undefined }), 0)).toBeUndefined();
  });
});

describe('CGTMSE when ticked', () => {
  it('the rate: the slab of the whole cover, less 10% a concession, to two decimals as Annexure II shows', () => {
    expect([cgtmseRate(1000000, 0), cgtmseRate(1000000, 1), cgtmseRate(1000001, 1), cgtmseRate(5000001, 1), cgtmseRate(100000000, 3), cgtmseRate(100000001, 0)])
      .toEqual([0.37, 0.33, 0.5, 0.54, 0.84, undefined]);
  });
  it('case M at 0.33%: 1,485; 3,300; 2,805; 2,145; 1,485 (worked by hand above)', () => {
    const r = report(CGTMSE_M);
    expect(r.guarantee?.ratePct).toBe(0.33);
    expect(r.guarantee?.typed).toBe(false);
    close(fees(r), [1485, 3300, 2805, 2145, 1485]);
    close(r.guarantee?.years.map((y) => y.termLoan) ?? [], [1320, 2640, 2145, 1485, 825]);
    expect(r.mudra).toBeUndefined();
  });
  it('a rate typed from the sanction letter takes the scheme\'s place', () => {
    const r = report({ ...CGTMSE_M, guarantee: { cgtmse: true, ratePct: 0.66 } });
    expect(r.guarantee?.typed).toBe(true);
    close(fees(r), [2970, 6600, 5610, 4290, 2970]);
  });
  it('unticked, no fee', () => expect(report({ ...CGTMSE_M, guarantee: undefined }).guarantee).toBeUndefined());
  it('beside property of 5 L (hybrid security): 3 L of the term loan and the 2 L limit guaranteed; 660; 1,650; 1,155; 660; 660 (worked by hand above)', () => {
    const r = report({ ...CGTMSE_M, collateral: 500000 });
    expect([r.guarantee?.ratePct, r.guarantee?.cover, r.guarantee?.guaranteed, r.guarantee?.collateral]).toEqual([0.33, 1000000, 500000, 500000]);
    close(r.guarantee?.years.map((y) => y.termLoan) ?? [], [495, 990, 495, 0, 0]);
    close(fees(r), [660, 1650, 1155, 660, 660]);
    expect(report({ ...CGTMSE_M, collateral: 0 }).guarantee?.guaranteed).toBe(1000000);
  });
  it('beside property of 9 L: the term loan backed in full, 1 L of the limit guaranteed; 10 L backs them all and it stops', () => {
    const r = report({ ...CGTMSE_M, collateral: 900000 });
    expect([r.guarantee?.guaranteed, r.guarantee?.collateral]).toEqual([100000, 900000]);
    close(fees(r), [82.5, 330, 330, 330, 330]);
    expect(reportNeeds({ ...CGTMSE_M, collateral: 1000000 })).toContain('CGTMSE: the collateral\'s market value of Rs. 10,00,000 backs the loans\' Rs. 10,00,000 in full, leaving nothing for CGTMSE to guarantee: leave CGTMSE out, or lower the collateral to the part it backs');
  });
  it('beside property, the slab is still that of the loans in all (CGS-I para 8, note 5): 12 L in all at 0.50%, though 7 L is guaranteed', () => {
    const r = report({ ...CGTMSE_M, wcLimit: 400000, collateral: 500000 });
    expect([r.guarantee?.ratePct, r.guarantee?.cover, r.guarantee?.guaranteed]).toEqual([0.5, 1200000, 700000]);
  });
  it('above Rs. 10 crore in all it stops', () => {
    const x = { ...CGTMSE_M, cost: { machinery: 150000000 }, loan: { ...CGTMSE_M.loan, amount: 100000000 } };
    expect(reportNeeds(x).some((n) => n.startsWith('CGTMSE: the loans come to Rs. 10,02,00,000, above the Rs. 10,00,00,000 it guarantees in all'))).toBe(true);
  });
  it('under PMEGP, the margin money counts in the outstanding until it is set off after 3 years', () => {
    // CASE_P's loans: 24 L sanctioned, 3 L limit: 27 L in all, so 0.55%. The loan repaid is 24 L less the margin money.
    const x: ReportInput = { taxBy: 'firm', cost: { land: 200000, building: 600000, machinery: 2000000, preliminary: 50000 },
      loan: { amount: 2400000, ratePct: 10, disbursed: '2026-10', moratoriumMonths: 6, instalments: 48, frequency: 'monthly', style: 'equal-principal' },
      capacity: 50000, price: 200, utilisationPct: [60, 70, 80], priceGrowthPct: 0, monthsToStart: 3, variablePct: 70, fixedCosts: 1200000, fixedGrowthPct: 5,
      days: { stock: 30, debtors: 30, creditors: 30 }, wcLimit: 300000, wcRatePct: 11,
      scheme: { id: 'pmegp', category: 'general', area: 'rural', activity: 'manufacturing', confirmed: true }, guarantee: { cgtmse: true } };
    const r = report(x), mm = r.scheme?.subsidy as number, net = 2400000 - mm, tl = r.guarantee?.years.map((y) => y.termLoan) ?? [];
    expect(r.guarantee?.ratePct).toBe(0.55);
    // 2026-27: six months on the 24 L guaranteed. 2028-29 on 31 December 2027's balance, 9 of 48 paid, with the margin
    // money (month 14 of 36); 2029-30 likewise at 21 paid (month 26); 2030-31 at 33 paid (month 38): set off by then.
    expect(tl[0]).toBeCloseTo(0.0055 * 2400000 * 6 / 12, 6);
    expect(tl[2]).toBeCloseTo(0.0055 * (net * 39 / 48 + mm), 6);
    expect(tl[3]).toBeCloseTo(0.0055 * (net * 27 / 48 + mm), 6);
    expect(tl[4]).toBeCloseTo(0.0055 * (net * 15 / 48), 6);
    expect(r.scheme?.flags.some((f) => f.startsWith('PMEGP\'s conditions are not yet confirmed'))).toBe(false);
    expect(report({ ...x, scheme: { id: 'pmegp', category: 'general', area: 'rural', activity: 'manufacturing' } }).scheme?.flags.some((f) => f.startsWith('PMEGP\'s conditions are not yet confirmed'))).toBe(true);
  });
});
