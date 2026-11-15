/**
 * The project's worth, discounted (NPV1, Rahul's yes of 15-11-2026): the net present value of the project's cash flows at
 * the term loan's rate and its internal rate of return, and the promoters' own return on their money, from a project
 * report already worked (engine/report.ts). The method and its source: `worth` in engine/data/report.json.
 *
 * Every figure is worked twice: the present value by discounting each flow to the first draw, and again by carrying each
 * to the last year's end and discounting once; the rate by halving the range (D-POL-02) and again by false position
 * (the Illinois method). A figure is withheld when the two disagree, when the flows change sign more than once (two
 * rates would fit), or when the money never comes back. Pure, no DOM.
 */
import DATA from './data/report.json';
import type { Report, ReportInput } from './report';

export const WORTH = DATA.worth;

/** A flow: what it is, its financial year (none for the first draw), the months from the first draw to when it falls,
 * and the rupees (out below nil). */
export interface WorthFlow { label: string; fy?: string; months: number; amount: number }
/** One view: its flows (the outlay, each year, the value at the end), the internal rate of return (% a year) and the net
 * present value at the rate, or why a figure is not given. */
export interface WorthView { flows: WorthFlow[]; irrPct?: number; npv?: number; why?: string }
export interface Worth {
  /** The discount rate, % a year: the term loan's. */
  ratePct: number;
  project: WorthView;
  promoters: WorthView;
}

const money = (a: number, b: number) => Math.abs(a - b) <= Math.max(0.01, 1e-9 * Math.max(Math.abs(a), Math.abs(b)));
const ym = (s: string) => { const [y, m] = s.split('-').map(Number); return y * 12 + (m - 1); };
/** Months from the start of the first draw's month to the end of a financial year ("2026-27" ends with March 2027). */
const monthsTo = (drawn: string, fy: string) => Number(fy.slice(0, 4)) * 12 + 15 - ym(drawn);

/** The present value at `r` (a fraction a year), each flow discounted to the first draw. */
export const presentValue = (flows: WorthFlow[], r: number): number =>
  flows.reduce((t, f) => t + f.amount / (1 + r) ** (f.months / 12), 0);

/** The same value the second way: each flow carried forward to the last flow's date, added, then discounted once. */
export const presentValueBack = (flows: WorthFlow[], r: number): number => {
  const end = Math.max(...flows.map((f) => f.months));
  return flows.reduce((t, f) => t + f.amount * (1 + r) ** ((end - f.months) / 12), 0) / (1 + r) ** (end / 12);
};

/** The internal rate of return (a fraction a year), or why none is given. The range from `lowestPct` to `highestPct` is
 * read on a grid for where the value crosses nil; exactly one crossing is needed, then halved to the rupee's
 * thousandth, and found again by false position from the same bracket. */
export function internalRate(flows: WorthFlow[]): { rate: number } | { why: string } {
  const pv = (r: number) => presentValue(flows, r);
  if (!flows.some((f) => f.amount < 0)) return { why: 'no money is put in' };
  if (!flows.some((f) => f.amount > 0)) return { why: 'no money comes back' };
  const lo = WORTH.lowestPct / 100, hi = WORTH.highestPct / 100, steps = 2000;
  const grid = Array.from({ length: steps + 1 }, (_, i) => lo + ((hi - lo) * i) / steps);
  const crossings: [number, number][] = [];
  for (let i = 1; i < grid.length; i++) {
    const a = pv(grid[i - 1]), b = pv(grid[i]);
    if (a === 0) crossings.push([grid[i - 1], grid[i - 1]]);
    else if (a * b < 0) crossings.push([grid[i - 1], grid[i]]);
  }
  if (!crossings.length) return { why: pv(0) < 0 ? 'the money put in does not come back within the report\'s years' : 'no single rate fits these flows' };
  if (crossings.length > 1) return { why: 'the flows change sign more than once, so two rates would fit' };
  const [a0, b0] = crossings[0];
  if (a0 === b0) return { rate: a0 };
  // First way: halving.
  let a = a0, b = b0, fa = pv(a);
  for (let k = 0; k < 200 && b - a > 1e-12; k++) {
    const m = (a + b) / 2, fm = pv(m);
    if (fa * fm <= 0) b = m; else { a = m; fa = fm; }
  }
  const halved = (a + b) / 2;
  // Second way: false position with the Illinois step, from the same bracket.
  let c = a0, d = b0, fc = pv(c), fd = pv(d), side = 0, x = c;
  for (let k = 0; k < 500; k++) {
    x = (c * fd - d * fc) / (fd - fc);
    const fx = pv(x);
    if (Math.abs(fx) < 1e-9 || Math.abs(d - c) < 1e-13) break;
    if (fx * fd > 0) { d = x; fd = fx; if (side === -1) fc /= 2; side = -1; }
    else { c = x; fc = fx; if (side === 1) fd /= 2; side = 1; }
  }
  if (Math.abs(halved - x) > 1e-7) return { why: 'the two computations disagree on the rate' };
  return { rate: halved };
}

function viewOf(flows: WorthFlow[], r: number, why?: string): WorthView {
  if (why) return { flows, why };
  const npv = presentValue(flows, r), back = presentValueBack(flows, r);
  if (!money(npv, back)) return { flows, why: 'the two computations disagree on the present value' };
  const irr = internalRate(flows);
  return { flows, npv, ...('rate' in irr ? { irrPct: irr.rate * 100 } : { why: irr.why }) };
}

/** The project's worth and the promoters' return, from the report worked on `x`. An expansion is not read: its report
 * holds today's business with the new line, and the line's own flows are not apart. */
export function worthOf(r: Report, x: ReportInput): Worth | { why: string } {
  if (x.salesBy === 'expansion') return { why: 'An expansion\'s report holds today\'s business with the new line, so the line\'s own return is not worked out' };
  const drawn = x.loan.disbursed as string, ratePct = x.loan.ratePct as number, rate = ratePct / 100;
  const ys = r.years, last = ys[ys.length - 1];
  const own = (y: (typeof ys)[number]) => y.stock + y.debtors - y.creditors - y.wcLoan;
  // The project: its cost without the loan's own costs before sales start (in the cost as preliminary expenses).
  const fee = r.guarantee?.beforeStart ?? 0, outlay = r.projectCost - r.interestBeforeStart - fee;
  if (!money(outlay, r.fixedAssets + (x.cost.preliminary ?? 0) + r.marginMoney)) return { why: 'The two computations disagree on the project\'s cost' };
  const project: WorthFlow[] = [{ label: 'The cost of the project, without the interest and fee before sales start', months: 0, amount: -outlay }];
  ys.forEach((y, k) => {
    const before = k ? own(ys[k - 1]) : r.marginMoney;
    project.push({ label: 'Cash available, less the working capital added', fy: y.fy, months: monthsTo(drawn, y.fy), amount: y.available - (own(y) - before) });
  });
  const end = monthsTo(drawn, last.fy);
  project.push({ label: 'Net fixed assets and own working capital at book value', fy: last.fy, months: end, amount: last.netBlock + own(last) });
  // The promoters: their money in at the first draw, each year's net cash out to them, the net worth at the end less the
  // cash already counted and the expenses still to be written off.
  const capital = ys[0].capital;
  const promoters: WorthFlow[] = [{ label: 'The promoters\' own money', months: 0, amount: -capital }];
  for (const y of ys) promoters.push({ label: 'Net cash flow of the year', fy: y.fy, months: monthsTo(drawn, y.fy), amount: y.flow.net });
  const left = last.netWorth - last.cash - last.preliminaryLeft;
  // The same end value from the balance sheet's other side: the assets kept less what is owed.
  if (!money(left, last.netBlock + own(last) - last.termLoan - last.unsecured)) return { why: 'The two computations disagree on the promoters\' value at the end' };
  promoters.push({ label: 'Net worth at book value, less the cash counted and the expenses left to write off', fy: last.fy, months: end, amount: left });
  return {
    ratePct,
    project: viewOf(project, rate),
    promoters: viewOf(promoters, rate, capital > 0.005 ? undefined : 'the promoters put in no money of their own'),
  };
}
