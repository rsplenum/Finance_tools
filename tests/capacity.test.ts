/**
 * How much loan the business can carry (CAP1, docs/CAPACITY-FIRST.md §5.1). Every figure carry() gives is re-read here
 * by a fresh run of the report (engine/report.ts) or worked a second way in closed form, never taken on the engine's word.
 * The cases: "Sample Metals" (tests/fixtures/solve-part-year.json, fictional and model-worked); Rahul's example of
 * docs/CAPACITY-FIRST.md §1 as a loan-only business; a public worked example (Bodmer, below); random fictional units.
 */
import { describe, expect, it } from 'vitest';
import FX from './fixtures/solve-part-year.json';
import { amortization, type Amortization } from '../engine/dscr';
import { carry, type Carry } from '../engine/capacity';
import { levelFor, type Levels } from '../engine/ratios';
import { projectReport, type Report, type ReportInput } from '../engine/report';

const S = FX.input as ReportInput;
/** The same unit with fuller margins: it carries more than it asks. */
const H: ReportInput = { ...S, variablePct: 60, fixedCosts: 2400000, utilisationPct: [55, 65, 75] };
const got = (x: ReportInput, lv?: Levels) => carry(x, { levels: lv }) as Carry;
const at = (x: ReportInput, a: number) => projectReport({ ...x, loan: { ...x.loan, amount: a } }) as Report;
const isReport = (r: unknown): r is Report => !!r && typeof r === 'object' && !('needs' in r) && !('blocked' in r);
/** A fresh run fits: both DSCRs at their levels and no cash short, unless cash is short at the least loan too. */
function fits(x: ReportInput, a: number, lv?: Levels): boolean {
  const r = projectReport({ ...x, loan: { ...x.loan, amount: a } });
  if (!isReport(r) || !r.lowest || r.average === undefined) return false;
  const own = (at(x, 1) as Report).cashShort;
  return r.lowest.dscr >= levelFor('dscrLowest', 'fresh', lv) - 1e-9 && r.average >= levelFor('dscrAverage', 'fresh', lv) - 1e-9 && (!r.cashShort || !!own);
}

/** A business with nothing but its cash for the loan: typed sales, no costs but the variable share, no stock or debtors,
 * a proprietor under the rebate (tax nil), the loan drawn in April and repaid from that month, so every year of the loan
 * is a whole financial year with `forLoan` of cash. */
const loanOnly = (forLoan: number, o: { ratePct: number; instalments: number; amount: number; style: 'emi' | 'equal-principal'; moratorium?: number; disbursed?: string }): ReportInput => ({
  taxBy: 'proprietor', cost: { machinery: 2 * o.amount },
  loan: { amount: o.amount, ratePct: o.ratePct, disbursed: o.disbursed ?? '2027-04', moratoriumMonths: o.moratorium ?? 0, instalments: o.instalments, frequency: 'monthly', style: o.style },
  salesBy: 'typed', sales: 10 * forLoan, salesGrowthPct: 0, monthsToStart: 0, variablePct: 90, fixedCosts: 0, fixedGrowthPct: 0,
  days: { stock: 0, debtors: 0, creditors: 0 }, wcLimit: 0, wcRatePct: 0,
});

describe('the figure', () => {
  it('a public worked example: Bodmer, 600 a period at a 1.5 DSCR over two periods carries 800', () => {
    // Source: Edward Bodmer, "Sculpting and Debt Fees (Including Fees for DSRA L/C)", edbodmer.com (read 11-11-2026):
    // "If there were no fees in the example, the debt would be 800 rather than 700 for the DSCR target of 1.5 on 600 per
    // year of debt. Here 600/1.5 is 400 and the total debt service over 2 periods is 800." (The interest rate is zero.)
    // Here in thousands of rupees: ₹6,00,000 a year for the loan, 24 monthly instalments in two whole financial years
    // (drawn in March 2027, a month's holiday, repaid April 2027 to March 2029), the lender's level 1.5 for both DSCRs.
    const x: ReportInput = { ...loanOnly(600000, { ratePct: 0, instalments: 24, amount: 1000000, style: 'equal-principal', moratorium: 1, disbursed: '2027-03' }) };
    const lv = { dscrLowest: 1.5, dscrAverage: 1.5 }, c = got(x, lv);
    const r = at(x, 800000), full = r.years.filter((y) => y.counted);
    expect(full.map((y) => [y.fy, Math.round(y.available), Math.round(y.service)])).toEqual([['2027-28', 600000, 400000], ['2028-29', 600000, 400000]]);
    expect(c.carries).toBe(800000);                    // Bodmer's 800, in thousands
    expect(2 * (600000 / 1.5)).toBe(800000);           // the second way: two periods of 600 ÷ 1.5
    expect(c.gap).toBe(200000);
    expect(c.how).toMatchObject({ level: 1.5 });
    expect(Math.round(c.how.available)).toBe(600000);
    expect(Math.round(c.how.forInstalments)).toBe(400000);
  });

  it("Rahul's example of §1: ₹8,00,000 a year of instalments at 10%, worked by the schedule and the annuity's closed form", () => {
    // ₹10,00,000 a year for the loan at the lowest year's 1.25 leaves ₹8,00,000 for the instalments, ₹66,666.67 a
    // month. The closed form: the loan an annuity of A a month repays over n months at r a month is A × (1 − (1 + r)^−n) ÷ r.
    const A = 800000 / 12, r = 0.1 / 12, pv = (n: number) => (A * (1 - (1 + r) ** -n)) / r;
    const table: [number, number][] = [[60, 3137691], [84, 4015778], [120, 5044744], [180, 6203829]];
    for (const [n, figure] of table) {
      expect(Math.round(pv(n))).toBe(figure);
      const s = amortization({ amount: pv(n), ratePct: 10, disbursed: '2027-04', moratoriumMonths: 0, instalments: n, frequency: 'monthly', style: 'emi' }) as Amortization;
      expect(s.level).toBeCloseTo(A, 6);
      const lv = { dscrAverage: 1.25 }, c = got(loanOnly(1000000, { ratePct: 10, instalments: n, amount: 10000000, style: 'emi' }), lv);
      expect(c.carries).toBe(Math.floor(figure / 1000) * 1000);
      expect(c.limitedBy.check).toBe('dscrLowest');
    }
    // However long: the interest alone on ₹80,00,000 takes the whole ₹8,00,000.
    expect(A / r).toBeCloseTo(8000000, 6);
    expect(got(loanOnly(1000000, { ratePct: 10, instalments: 180, amount: 10000000, style: 'emi' }), { dscrAverage: 1.25 }).carries).toBeLessThan(8000000);
  });

  it('at the figure a fresh run fits, and one rounding step more misses', () => {
    for (const x of [S, H, { ...S, wcLimit: 0 }]) {
      const c = got(x);
      expect(c.carries).toBeGreaterThan(0);
      expect(fits(x, c.carries)).toBe(true);
      expect(fits(x, c.carries + 1000)).toBe(false);
      expect(c.carries % 1000 === 0 || c.carries === c.asked).toBe(true);
    }
  });

  it("Sample Metals: the part first year limits it, and the figure is that year's cash over the level, worked by hand", () => {
    // 2026-27 holds three months of sales and the holiday's interest with the first instalments. Its cash for the loan
    // does not move with the loan (a loss: no tax), and its debt service is the loan times a fixed share, so the largest
    // loan is that cash ÷ 1.25 ÷ the share, rounded down to the thousand.
    const c = got(S), y0 = at(S, S.loan.amount as number).years[0], y1 = at(S, c.carries).years[0];
    expect(c.limitedBy).toEqual({ check: 'dscrLowest', fy: '2026-27' });
    expect(y0.tax).toBe(0);
    expect(y1.available).toBeCloseTo(y0.available, 6);
    const share = y0.service / (S.loan.amount as number);
    expect(c.carries).toBe(Math.floor(y0.available / 1.25 / share / 1000) * 1000);
    expect(c.carries).toBe(2357000);
    expect(c.how).toMatchObject({ fy: '2026-27', level: 1.25 });
    expect(c.how.forInstalments).toBeCloseTo(c.how.available / 1.25, 6);
  });
});

describe('the closers and the verdict', () => {
  it('a case that carries has no closers', () => {
    const c = got(H);
    expect(c.carries).toBeGreaterThanOrEqual(c.asked);
    expect(c.gap).toBe(0);
    expect(c.verdict).toBe('carries');
    expect(c.closers).toEqual([]);
  });

  it('each closer that closes fits at the loan asked, and a step less does not', () => {
    const c = got(S);
    expect(c.verdict).toBe('closable');
    const closing = c.closers.filter((k) => k.closes);
    expect(closing.map((k) => k.id).sort()).toEqual(['holiday', 'use']);
    for (const k of closing) {
      const y = k.input as ReportInput;
      expect(fits(y, c.asked)).toBe(true);
      expect(k.reaches).toBeGreaterThanOrEqual(c.asked);
      // A step less on its own box, written here: a month of holiday, 0.1 of a point of use in every year under the most.
      const less: ReportInput = k.id === 'holiday'
        ? { ...y, loan: { ...y.loan, moratoriumMonths: (y.loan.moratoriumMonths as number) - 1 } }
        : { ...y, utilisationPct: (y.utilisationPct as number[]).map((p, i) => (p >= 85 && (S.utilisationPct as number[])[i] + ((k.to as number) - (k.from as number)) > 85 ? p : Math.round((p - 0.1) * 10) / 10)) };
      expect(fits(less, c.asked)).toBe(false);
    }
    expect(c.closers.find((k) => k.id === 'holiday')).toMatchObject({ from: 6, to: 13 });
    // Your own money: the promoters' share was → becomes, at the figure; it does not close, the cut being past half the loan.
    const own = c.closers.find((k) => k.id === 'own');
    expect(own).toMatchObject({ closes: false, reaches: c.carries });
    expect(own?.to).toBeCloseTo(at(S, c.carries).finance.promoter, 6);
  });

  it('a closer that cannot close says how far it reaches, worked again by a fresh run', () => {
    const c = got(S), price = c.closers.find((k) => k.id === 'price');
    expect(price).toMatchObject({ closes: false, from: 250, to: 275 });
    const y: ReportInput = { ...S, price: 275 };
    expect(fits(y, price?.reaches as number)).toBe(true);
    expect(fits(y, (price?.reaches as number) + 1000)).toBe(false);
  });

  it('nothing closes: not as it stands, the nearest named, and the cash the business needs whatever the loan', () => {
    const weak: ReportInput = { ...S, variablePct: 75, fixedCosts: 4200000 };
    const c = got(weak);
    expect(c.carries).toBe(0);
    expect(c.verdict).toBe('notAsItStands');
    expect(c.closers.some((k) => k.closes)).toBe(false);
    const best = Math.max(...c.closers.map((k) => k.reaches));
    expect(c.closers.find((k) => k.id === c.nearest)?.reaches).toBe(best);
    // Cash runs short even at the least loan: it is the business's, so it never limits the figure, and keepReady is the
    // report's own shortfall at the loan asked.
    expect(at(weak, 1).cashShort).toBeDefined();
    expect(c.keepReady).toBe(at(weak, weak.loan.amount as number).cashShort?.need);
  });

  it('the bank\'s other checks come at the loan asked, without the two DSCRs', () => {
    const ids = got(S).also.map((k) => k.id);
    expect(ids).not.toContain('dscrLowest');
    expect(ids).not.toContain('dscrAverage');
    expect(ids).toContain('currentRatio');
  });

  it('the same input gives the same answer', () => {
    expect(JSON.stringify(got(S))).toBe(JSON.stringify(got(S)));
  });
});

describe('invariants over random fictional units', () => {
  // A seeded generator: the same cases on every run.
  let seed = 20261111;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];
  const unit = (): ReportInput => {
    const cost = Math.round(2000000 + rnd() * 18000000), sales = Math.round(cost * (0.8 + rnd() * 1.7));
    return {
      taxBy: pick(['proprietor', 'firm', 'company']), cost: { machinery: Math.round(cost * 0.7), building: Math.round(cost * 0.3) },
      loan: { amount: Math.round(cost * (0.4 + rnd() * 0.5)), ratePct: Math.round((8 + rnd() * 6) * 10) / 10, disbursed: '2026-07', moratoriumMonths: pick([0, 3, 6, 12]), instalments: pick([36, 48, 60, 84, 96]), frequency: 'monthly', style: pick(['emi', 'equal-principal']) },
      salesBy: 'typed', sales, salesGrowthPct: pick([5, 8, 10]), monthsToStart: pick([0, 2, 4, 6]),
      variablePct: Math.round(50 + rnd() * 25), fixedCosts: Math.round(sales * (0.04 + rnd() * 0.1)), fixedGrowthPct: pick([0, 3, 5]),
      days: { stock: 30, debtors: 30, creditors: 30 }, wcLimit: 0, wcRatePct: 0,
    };
  };
  const cases = Array.from({ length: 24 }, unit);
  /** The figure where the cash sets it; none where the cost of the project does (the whole cost borrowed: a higher rate
   * adds interest before the first sale to the cost, so that ceiling rises with the rate). */
  const fig = (x: ReportInput) => { const c = carry(x); return 'carries' in c && c.limitedBy.check !== 'cost' ? c.carries : undefined; };

  it('a higher rate never carries more, on equal instalments of principal where the cash sets the figure', () => {
    // With an EMI a higher rate repays less principal in the first months, so a short first year whose interest before
    // the first sale sits in the project's cost can carry a little more (0.15% in a case met here); equal instalments of
    // principal repay the same principal at any rate, so there the rate only adds to the service.
    let n = 0;
    for (const c0 of cases) {
      const x: ReportInput = { ...c0, loan: { ...c0.loan, style: 'equal-principal' } };
      const a = fig(x), b = fig({ ...x, loan: { ...x.loan, ratePct: (x.loan.ratePct as number) + 1 } });
      if (a === undefined || b === undefined) continue;
      n++;
      expect(b).toBeLessThanOrEqual(a);
    }
    expect(n).toBeGreaterThan(12);
  });

  it('a longer term never carries less, where no later year has less cash for the loan', () => {
    // A longer loan reaches later years; where those are weaker (costs rising faster than sales) it can carry less, so
    // the invariant holds only where each year's cash for the loan is at least the year before's, read from the report.
    let n = 0;
    for (const x of cases) {
      const r = projectReport(x);
      if (!isReport(r)) continue;
      const full = r.years.filter((y) => y.months === 12), rising = full.every((y, i) => i === 0 || y.available >= full[i - 1].available - 1);
      if (!rising) continue;
      const a = fig(x), b = fig({ ...x, loan: { ...x.loan, instalments: (x.loan.instalments as number) + 12 } });
      if (a === undefined || b === undefined) continue;
      n++;
      expect(b).toBeGreaterThanOrEqual(a);
    }
    expect(n).toBeGreaterThanOrEqual(6);
  });

  it('every figure fits by a fresh run, and a step more misses', () => {
    for (const x of cases.slice(0, 10)) {
      const c = carry(x);
      if (!('carries' in c) || c.carries === 0) continue;
      expect(fits(x, c.carries)).toBe(true);
      expect(fits(x, Math.max(c.carries, Math.ceil(c.carries / 1000) * 1000) + (c.carries % 1000 ? 0 : 1000))).toBe(false);
    }
  });
});
