/**
 * The project's worth, discounted (NPV1, engine/worth.ts). First on flows small enough to work by hand, each rate found a
 * second way in closed form; then on fictional case R (tests/report.test.ts, D-BIZ-02: invented figures), its first year
 * read off the hand-worked report and the whole present value worked again here by Horner's rule on whole years.
 */
import { describe, it, expect } from 'vitest';
import { internalRate, presentValue, presentValueBack, worthOf, type Worth, type WorthFlow } from '../engine/worth';
import { projectReport, type Report, type ReportInput } from '../engine/report';
import { CASE_R } from './report.test';

const flows = (...a: [number, number][]): WorthFlow[] => a.map(([months, amount]) => ({ label: '', months, amount }));
const rateOf = (f: WorthFlow[]) => { const r = internalRate(f); return 'rate' in r ? r.rate : r.why; };

describe('flows worked by hand', () => {
  // ₹1,000 out today, ₹1,100 back in a year: 10% exactly. At 5%, 1,100 ÷ 1.05 − 1,000 = 47.619047…
  it('one year: the rate and the value', () => {
    const f = flows([0, -1000], [12, 1100]);
    expect((rateOf(f) as number).toFixed(10)).toBe('0.1000000000');
    expect(presentValue(f, 0.05).toFixed(6)).toBe('47.619048');
    expect(presentValueBack(f, 0.05).toFixed(6)).toBe('47.619048');
  });
  // ₹1,000 out, ₹600 back at the end of each of two years: 600v + 600v² = 1,000, so v = (−1 + √(1 + 4 × 1000/600)) ÷ 2
  // = 0.884437…, and the rate 1/v − 1 = 13.06624%.
  it('two years: the rate against the closed form', () => {
    const v = (-1 + Math.sqrt(1 + (4 * 1000) / 600)) / 2;
    expect(Math.abs((rateOf(flows([0, -1000], [12, 600], [24, 600])) as number) - (1 / v - 1))).toBeLessThan(1e-9);
    expect((1 / v - 1).toFixed(6)).toBe('0.130662');
  });
  // −100, +230, −132: 10% and 20% both give nil (100 × 1.1² = 121 = 230 × 1.1 − 132; 144 = 276 − 132), so none is given.
  it('withholds a rate when two fit, or when nothing goes in or comes back', () => {
    expect(rateOf(flows([0, -100], [12, 230], [24, -132]))).toMatch(/two rates/);
    // Half the money back in a year is a return of −50%: shown, never hidden.
    expect((rateOf(flows([0, -100], [12, 50])) as number).toFixed(8)).toBe('-0.50000000');
    expect(rateOf(flows([0, -100], [12, -50]))).toMatch(/no money comes back/);
    expect(rateOf(flows([0, 100], [12, 50]))).toMatch(/no money is put in/);
  });
});

describe('fictional case R', () => {
  const r = projectReport(CASE_R) as Report, w = worthOf(r, CASE_R) as Worth;
  // The cost of the project 37,86,301.37, with no interest or fee before sales start; the first year's cash available
  // 18,21,490.00 (the hand-worked DSCR's A), and the working capital the business's own at its end, 9,86,301.37 +
  // 6,41,095.89 − 6,41,095.89 − 5,00,000 = 4,86,301.37, is the margin already in the cost: nothing added.
  // The promoters: 12,86,301.37 in; the first year's net cash flow 10,94,406.67 out to them.
  it('the first draw and the first year, by hand', () => {
    expect(w.ratePct).toBe(10);
    expect(w.project.flows.map((f) => f.months)).toEqual([0, 12, 24, 36, 48, 60, 60]);
    expect([w.project.flows[0].amount, w.project.flows[1].amount].map((x) => x.toFixed(2))).toEqual(['-3786301.37', '1821490.00']);
    expect([w.promoters.flows[0].amount, w.promoters.flows[1].amount].map((x) => x.toFixed(2))).toEqual(['-1286301.37', '1094406.67']);
  });
  // A second computation from the report's years: each year's cash available less the change in the business's own
  // working capital, the value at the end added to the last; discounted at 10% by Horner's rule on whole years.
  it('the net present value and the rates, worked again', () => {
    const ys = r.years, own = ys.map((y) => y.stock + y.debtors - y.creditors - y.wcLoan);
    const cf = [-(r.fixedAssets + 100000 + r.marginMoney), ...ys.map((y, k) => y.available - (own[k] - (k ? own[k - 1] : r.marginMoney)))];
    cf[cf.length - 1] += ys[ys.length - 1].netBlock + own[own.length - 1];
    const v = 1 / 1.1, npv = cf.reduceRight((t, c) => t * v + c, 0);
    expect(Math.abs((w.project.npv as number) - npv)).toBeLessThan(0.01);
    expect(npv).toBeGreaterThan(0);
    // At each rate the flows are worth nil, both ways.
    for (const view of [w.project, w.promoters]) {
      const rate = (view.irrPct as number) / 100;
      expect(Math.abs(presentValue(view.flows, rate))).toBeLessThan(0.01);
      expect(Math.abs(presentValueBack(view.flows, rate))).toBeLessThan(0.01);
    }
    // The promoters, on leverage, earn more than the project.
    expect(w.promoters.irrPct as number).toBeGreaterThan(w.project.irrPct as number);
    // Undiscounted, the promoters' flows add up to the subsidy, the profit kept and less the expenses still to write off.
    const last = ys[ys.length - 1];
    expect(Math.abs(w.promoters.flows.reduce((t, f) => t + f.amount, 0) - (last.subsidy + last.retained - last.preliminaryLeft))).toBeLessThan(0.01);
  });
  // Drawn in October 2026, sales six months later in April 2027: the first year 2027-28 ends 18 months after the draw.
  // The interest before sales start is the loan's cost, in the cost of the project, and left out of the project's outlay.
  it('a later start: months to each year end, and the interest before sales left out', () => {
    const x: ReportInput = { ...CASE_R, loan: { ...CASE_R.loan, disbursed: '2026-10', moratoriumMonths: 6 }, monthsToStart: 6 };
    const rx = projectReport(x) as Report, wx = worthOf(rx, x) as Worth;
    expect(rx.interestBeforeStart).toBeGreaterThan(0);
    expect(wx.project.flows[1]).toMatchObject({ fy: '2027-28', months: 18 });
    expect(Math.abs(-wx.project.flows[0].amount - (rx.projectCost - rx.interestBeforeStart))).toBeLessThan(0.01);
  });
  it('an expansion is not read', () => {
    const x: ReportInput = { ...CASE_R, salesBy: 'expansion', sales: 7000000, salesGrowthPct: 10, capacity: 500000, price: 25, utilisationPct: [55, 70, 85], priceGrowthPct: 5, monthsToStart: 6 };
    const rx = projectReport(x);
    expect('years' in rx).toBe(true);
    expect(worthOf(rx as Report, x)).toMatchObject({ why: expect.stringMatching(/expansion/) });
  });
});
