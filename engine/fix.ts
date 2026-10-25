/**
 * The fix beside the miss (OR2, D-UX-177): the changes that make the report work, worked by the whole report again
 * (engine/report.ts) at every trial, so every figure keeps its second computation. Two levers only, the ones that move
 * every level the loan's own terms set: the repayment period (whole years, never longer than typed) and the term loan's
 * size (never larger than typed), the promoters bringing what the loan is cut by. Each fix meets every level missed
 * (the security cover aside: the collateral meets it, as in the plan) and loses none met.
 *
 * The lowest-hanging fruit first (D-UX-176): a fix's strain is the largest share of a lever's typed value it gives away
 * (months of the repayment, rupees of the loan); the least strained comes first, and on a tie the one that costs the
 * promoters less. A shorter repayment raises the instalments, so the lowest-year DSCR bounds it; a smaller loan lowers
 * the debt, so every ratio but the cash on hand rises as it falls. Pure, no DOM.
 */
import { diagnose, type Diagnosis, type Levels, type RatioId } from './ratios';
import { projectReport, type Report, type ReportInput } from './report';
import type { Levers } from './plan';

export interface Fix {
  /** The repayment in instalments, as typed and with the fix (the same when the fix keeps it); a year's instalments. */
  instalments: { now: number; needed: number; perYear: number };
  /** The term loan as typed and with the fix; the promoters bring `more` (the report's own figure). */
  loan: { now: number; needed: number; more: number };
  /** The largest share of a lever's typed value the fix gives away, 0 to 1. */
  strain: number;
  /** The fix as the plan's levers, for "Use this" (applyPlan): fewer instalments as a negative change. */
  levers: Levers;
  report: Report;
}
export interface Fixes {
  /** The levels missed as typed, the security cover aside. */
  missed: RatioId[];
  /** At most two fixes, the least strained first; none when the repayment and the loan cannot meet every level missed. */
  fixes: Fix[];
  /** The ratios as typed, each in its worst year: the cause the page names. */
  diagnosis: Diagnosis;
}

const EPS = 1e-9;
const isReport = (r: ReturnType<typeof projectReport>): r is Report => !('needs' in r) && !('blocked' in r);

/** `lv`: the benchmarks the user changed (BEN1). Undefined when the report cannot be worked or misses nothing to fix. */
export function fixOf(x: ReportInput, lv?: Levels): Fixes | undefined {
  const base = projectReport(x);
  if (!isReport(base)) return undefined;
  const d0 = diagnose(base, x, 'fresh', lv), missed = d0.misses.filter((id) => id !== 'securityCover');
  if (!missed.length) return undefined;
  const kept = d0.checks.filter((c) => c.meets).map((c) => c.id);
  const tl = x.loan.amount as number, n0 = x.loan.instalments as number, perYear = x.loan.frequency === 'quarterly' ? 4 : 12;
  const least = base.scheme ? Math.floor(base.scheme.subsidy) + 1 : 1;
  const run = (amount: number, n: number) => {
    const y = { ...x, loan: { ...x.loan, amount, instalments: n } }, r = projectReport(y);
    if (!isReport(r)) return undefined;
    const m = new Set(diagnose(r, y, 'fresh', lv).misses);
    return missed.every((id) => !m.has(id)) && kept.every((id) => !m.has(id)) ? r : undefined;
  };
  /** The largest loan that meets at `n` instalments, rounded down to four figures (Rs. 1,75,00,000, not 1,75,06,137) so
   * it reads as a person would borrow it: halving on that step, then checked below as `viable.ts` does. */
  const step = 10 ** Math.max(0, Math.floor(Math.log10(tl)) - 3);
  const largest = (n: number) => {
    if (run(tl, n)) return tl;
    let a = Math.ceil(least / step), b = Math.floor(tl / step);
    if (!run(a * step, n)) return undefined;
    while (b - a > 1) { const m = Math.floor((a + b) / 2); if (run(m * step, n)) a = m; else b = m; }
    return [0.75, 0.5].every((p) => !!run(Math.max(least, Math.floor(a * step * p)), n)) ? a * step : undefined;
  };
  const memo = new Map<number, Fix | undefined>();
  const fixAt = (n: number): Fix | undefined => {
    if (memo.has(n)) return memo.get(n);
    const a = largest(n), r = a === undefined ? undefined : run(a, n);
    const f = a === undefined || !r ? undefined : {
      instalments: { now: n0, needed: n, perYear }, loan: { now: tl, needed: a, more: r.finance.promoter - base.finance.promoter },
      strain: Math.max((n0 - n) / n0, (tl - a) / tl), levers: { wc: 0, unsecured: 0, fixed: 0, sales: 0, collateral: 0, moratorium: 0, promoters: tl - a, instalments: n - n0 }, report: r,
    };
    memo.set(n, f);
    return f;
  };
  // The typed repayment, then each whole year below it. Along them the loan's share falls as the repayment shortens (until
  // the DSCR stops it: no fix) and the term's rises, so the larger of the two dips once: a search by thirds finds it.
  const top = Math.ceil(n0 / perYear) - 1, ns = [n0, ...Array.from({ length: top }, (_, k) => (top - k) * perYear)].filter((n, k) => k === 0 || n < n0);
  const cost = (k: number) => fixAt(ns[k])?.strain ?? Infinity;
  let lo = 0, hi = ns.length - 1;
  while (hi - lo > 2) {
    const m1 = lo + Math.floor((hi - lo) / 3), m2 = hi - Math.floor((hi - lo) / 3);
    if (cost(m1) <= cost(m2)) hi = m2; else lo = m1;
  }
  const order = (a: Fix, b: Fix) => a.strain - b.strain || a.loan.more - b.loan.more;
  const best = ns.slice(lo, hi + 1).map(fixAt).filter((f): f is Fix => !!f).sort(order)[0], keep = fixAt(n0);
  const fixes = best ? [best, ...(keep && keep !== best && keep.loan.needed < tl - EPS ? [keep] : [])] : [];
  return { missed, fixes, diagnosis: d0 };
}
