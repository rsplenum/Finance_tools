/**
 * How much loan the business can carry (CAP1, docs/CAPACITY-FIRST.md §5.1): the largest term loan, the project's cost
 * held and the promoters bringing the rest, at which the lowest year's DSCR and the average DSCR meet their levels and
 * the cash never runs short because of the loan. Then, when the loan asked is more, the single changes that close the
 * gap, each alone with the rest as typed. Nothing is worked here: every trial is a run of the whole report
 * (engine/report.ts, its two computations); the levels come from engine/data/ratios.json and the user's own (BEN1), the
 * limits of each change from engine/data/solve.json through solve's axes.
 *
 * The figure: on the grid of the loan box's rounding (₹1,000), by doubling up from the loan asked when it fits, else
 * bisection down to the least loan the report takes; a fit is monotone in the loan (more loan, more to repay, the same
 * cash: D-POL-02), checked at three smaller loans, and no single figure is given where one misses. The loan asked, when
 * it fits and is off the grid, is itself the figure unless a grid point above it fits too.
 *
 * The cash counts only when the loan causes it: when cash runs short even at the least loan, the shortfall is the
 * business's (months before the first sale, working capital), so the figure is set by the DSCRs alone and the report's
 * own `cashShort` says how much more to keep ready.
 */
import type { Blocked, Needs } from './dscr';
import { diagnose, levelFor, type Levels, type RatioCheck } from './ratios';
import { projectReport, type Report, type ReportInput } from './report';
import { axes, solve, SOLVE, type Axis, type MoveId } from './solve';

export type CloserId = 'term' | 'use' | 'price' | 'own' | 'holiday';
/** A change alone, the rest as typed, at the loan asked: `from` the figure as typed, `to` the least that closes the gap
 * (or the change's limit when none does), in the box's own unit (instalments, months, the first year's use %, the first
 * price a unit, the promoters' share in rupees); `reaches` the loan carried with the change at `to`; `input` the report's
 * inputs with it written in, when it closes. */
export interface Closer { id: CloserId; from: number; to?: number; closes: boolean; reaches: number; input?: ReportInput }
export interface Carry {
  /** Rupees: the loan asked, the largest carried, and the gap (0 when it carries). */
  asked: number; carries: number; gap: number;
  /** What stops a larger loan: a DSCR (its year; '' for the average, which is over the loan), the cash (its first short
   * year), or the cost of the project itself (`why`: the report's words, when a larger loan cannot be worked at all). */
  limitedBy: { check: 'dscrLowest' | 'dscrAverage' | 'cash' | 'cost'; fy: string; why?: string };
  /** The tightest year at the figure: the cash for the loan, the level, and the instalments that cash pays at the level
   * (the whole loan's totals when the average limits, `fy` ''). */
  how: { fy: string; available: number; level: number; forInstalments: number };
  closers: Closer[]; verdict: 'carries' | 'closable' | 'notAsItStands';
  /** When nothing closes the gap: the change that comes nearest. */
  nearest?: CloserId;
  /** When cash runs short whatever the loan: the promoters' money more that keeps it at nil or above (the report's). */
  keepReady?: number;
  /** When cash runs short and the promoters pay the holiday's interest before the first sale: that interest added to the
   * loan instead (D-POL-13, IDC1), offered only when it lowers all the promoters bring (their share and the cash kept
   * ready). The loan grows by what their share falls, so the cash at the start is the same; the larger instalments after
   * can make the shortfall later deeper, and then it is not offered. `promoters` the part of their share they no longer
   * bring, `less` the fall in all they bring, `keepReady` what is still short after (none when nothing is), `carries`
   * the largest loan then, and `input` the report's inputs with it. */
  addInterest?: { promoters: number; less: number; keepReady?: number; carries: number; input: ReportInput };
  /** The bank's other checks at the loan asked; they never bend the figure. */
  also: RatioCheck[];
  /** The report at the loan asked. */
  report: Report;
}
export interface CarryInput { levels?: Levels; promotersMost?: number }

const EPS = 1e-9, STEP = SOLVE.rounding.rupees;
const isReport = (r: Report | Needs | Blocked): r is Report => !('needs' in r) && !('blocked' in r);
const AXIS_OF: Partial<Record<MoveId, CloserId>> = { instalments: 'term', moratorium: 'holiday', use: 'use', price: 'price' };
const NOT_MONOTONE = 'No single figure: a smaller loan misses again here, because a weak year pulls the ratios around. Try the changes in the report.';

const withLoan = (y: ReportInput, a: number): ReportInput => ({ ...y, loan: { ...y.loan, amount: a } });

export function carry(x: ReportInput, o: CarryInput = {}): Carry | Needs | Blocked {
  const base = projectReport(x);
  if (!isReport(base)) return base;
  const lv = o.levels, low = levelFor('dscrLowest', 'fresh', lv), avg = levelFor('dscrAverage', 'fresh', lv);
  const asked = x.loan.amount as number, least = base.scheme ? Math.floor(base.scheme.subsidy) + 1 : 1;
  const memo = new Map<string, Report | Needs | Blocked>();
  const run = (y: ReportInput) => {
    const key = JSON.stringify(y);
    if (!memo.has(key)) memo.set(key, projectReport(y));
    return memo.get(key) as Report | Needs | Blocked;
  };
  /** Cash short even at the least loan: the business's own shortfall, never the loan's limit. */
  const cashOwn = (y: ReportInput) => { const r = run(withLoan(y, least)); return isReport(r) && !!r.cashShort; };
  /** Why `r`, a run of `y`, does not fit; none when it fits. */
  const miss = (y: ReportInput, r: Report | Needs | Blocked): Carry['limitedBy'] | undefined => {
    if (!isReport(r)) return { check: 'cost', fy: '', why: 'needs' in r ? r.needs.join('; ') : r.blocked };
    if (!r.lowest || r.lowest.dscr < low - EPS) return { check: 'dscrLowest', fy: r.lowest?.fy ?? '' };
    if (r.average === undefined || r.average < avg - EPS) return { check: 'dscrAverage', fy: '' };
    if (r.cashShort && !cashOwn(y)) return { check: 'cash', fy: r.cashShort.first };
    return undefined;
  };
  const fits = (y: ReportInput, a: number) => !miss(withLoan(y, a), run(withLoan(y, a)));

  /** The largest loan `y` carries, on the grid above the least, with what stops one step more. */
  const largest = (y: ReportInput): { carries: number; limit: Carry['limitedBy'] } | Blocked => {
    const a0 = y.loan.amount as number, g = (i: number) => i * STEP, limitAt = (a: number) => miss(withLoan(y, a), run(withLoan(y, a))) as Carry['limitedBy'];
    let lo: number, hi: number;
    if (fits(y, a0)) {
      lo = Math.floor(a0 / STEP); hi = Math.max(lo + 1, Math.ceil(a0 / STEP));
      for (let n = 0; fits(y, g(hi)) && n < 60; n++) { lo = hi; hi *= 2; }
    } else {
      hi = Math.ceil(a0 / STEP); lo = Math.ceil(least / STEP);
      if (lo >= hi || !fits(y, g(lo))) return { carries: 0, limit: limitAt(lo >= hi ? a0 : g(lo)) };
    }
    const hi0 = hi;
    while (hi - lo > 1) {
      const m = Math.floor((lo + hi) / 2);
      if (fits(y, g(m))) lo = m; else hi = m;
    }
    const c = Math.max(fits(y, a0) ? a0 : 0, g(lo));
    if ([0.75, 0.5, 0.25].some((p) => { const a = Math.max(Math.ceil(least / STEP), Math.floor((c * p) / STEP)) * STEP; return a < c && !fits(y, a); })) return { blocked: NOT_MONOTONE };
    // The first grid point above that misses; the loan asked itself when the search never tried the point above it.
    return { carries: c, limit: (hi === hi0 && !fits(y, a0) ? limitAt(a0) : undefined) ?? limitAt(g(hi)) ?? limitAt(a0) };
  };

  const top = largest(x);
  if ('blocked' in top) return top;
  const { carries, limit } = top, gap = Math.max(0, asked - carries);
  const at = carries > 0 ? (run(withLoan(x, carries)) as Report) : base;
  const year = at.years.find((y) => y.fy === (limit.check === 'dscrLowest' ? limit.fy : at.lowest?.fy)) ?? at.years.find((y) => y.fy === at.lowest?.fy);
  const how = limit.check === 'dscrAverage' || !year
    ? { fy: '', available: at.plan.statement.total?.available ?? 0, level: avg, forInstalments: (at.plan.statement.total?.available ?? 0) / avg }
    : { fy: year.fy, available: year.available, level: low, forInstalments: year.available / low };
  const also = diagnose(base, x, 'fresh', lv).checks.filter((c) => c.id !== 'dscrLowest' && c.id !== 'dscrAverage');
  const keepReady = base.cashShort && cashOwn(x) ? base.cashShort.need : undefined;
  const out: Carry = { asked, carries, gap, limitedBy: limit, how, closers: [], verdict: 'carries', also, report: base, ...(keepReady !== undefined ? { keepReady } : {}) };
  if (keepReady !== undefined && x.loan.holidayInterest !== 'added' && base.idc.promoters > 0.005) {
    const y: ReportInput = { ...x, loan: { ...x.loan, holidayInterest: 'added' } }, r = run(y), most = largest(y);
    const less = isReport(r) ? base.finance.promoter + keepReady - (r.finance.promoter + (r.cashShort?.need ?? 0)) : 0;
    if (isReport(r) && less > 0.005 && !('blocked' in most)) {
      out.addInterest = { promoters: base.finance.promoter - r.finance.promoter, less, carries: most.carries, input: y, ...(r.cashShort ? { keepReady: r.cashShort.need } : {}) };
    }
  }
  if (gap <= 0) return out;

  // The changes, each alone at the loan asked. A change need not help steadily (a longer term reaches into later, weaker
  // years), so each is walked on its grid (a 20th of its range) from the typed figure: the first point that fits, then
  // bisection back to the least that fits; when none fits, the point where the DSCRs come nearest their levels. `reaches`
  // is the loan carried there.
  const closers: Closer[] = [];
  const variant = (ax: Axis, k: number) => { const y: ReportInput = { ...x, loan: { ...x.loan } }; ax.write(y, k); return y; };
  const nearness = (y: ReportInput) => {
    const r = run(withLoan(y, asked));
    return isReport(r) && r.lowest && r.average !== undefined ? Math.min(r.lowest.dscr / low, r.average / avg) : -Infinity;
  };
  for (const ax of axes(x, base)) {
    const id = AXIS_OF[ax.id];
    if (!id || ax.hi <= 0) continue;
    let prev = 0, first: number | undefined, best = ax.hi, bestNear = -Infinity;
    for (let k = Math.min(ax.step, ax.hi); ; k = Math.min(k + ax.step, ax.hi)) {
      const y = variant(ax, k);
      if (fits(y, asked)) { first = k; break; }
      const n = nearness(y);
      if (n > bestNear + EPS) { bestNear = n; best = k; }
      if (k >= ax.hi) break;
      prev = k;
    }
    if (first === undefined) {
      const reach = largest(variant(ax, best));
      closers.push({ id, from: ax.at(0), to: ax.at(best), closes: false, reaches: 'blocked' in reach ? 0 : reach.carries });
      continue;
    }
    let a = prev, b = first;
    while (b - a > 1) {
      const m = Math.floor((a + b) / 2);
      if (fits(variant(ax, m), asked)) b = m; else a = m;
    }
    const y = variant(ax, b), reach = largest(y);
    closers.push({ id, from: ax.at(0), to: ax.at(b), closes: true, reaches: 'blocked' in reach ? asked : reach.carries, input: y });
  }
  // Your own money: the loan cut to the figure, the promoters bringing the gap, within the most a plan may cut and the
  // promoters' most.
  if (carries > 0) {
    const cut = at.finance.promoter + at.finance.kept;
    const closes = carries >= asked * (1 - SOLVE.loanCutMostPct / 100) - EPS && (o.promotersMost === undefined || cut <= o.promotersMost + EPS);
    closers.push({ id: 'own', from: base.finance.promoter, to: at.finance.promoter, closes, reaches: carries, ...(closes ? { input: withLoan(x, carries) } : {}) });
  } else closers.push({ id: 'own', from: base.finance.promoter, closes: false, reaches: 0 });
  out.closers = closers;

  if (closers.some((c) => c.closes)) out.verdict = 'closable';
  else {
    const s = solve(x, { levels: lv, promotersMost: o.promotersMost });
    out.verdict = 'plans' in s && s.plans.some((p) => p.works) ? 'closable' : 'notAsItStands';
    if (out.verdict === 'notAsItStands') out.nearest = closers.reduce((n, c) => (c.reaches > n.reaches ? c : n)).id;
  }
  return out;
}
