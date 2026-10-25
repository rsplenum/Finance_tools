/**
 * The combined plan (D-UX-52, MV3): the levers moved together, the borrower's compromises first and the lender's last,
 * each within its limit, the whole report (engine/report.ts) run again at every trial, so every figure keeps its second
 * computation. The order:
 * - the promoters' money, up to the most they can bring in all (one optional figure; without it none more is assumed):
 *   first a smaller working-capital limit, the least that meets the levels it can reach (the current ratio, mostly), then
 *   a smaller term loan, all the room left unless less finishes the plan;
 * - unsecured loans and fixed costs only as the borrower sets them (`held`): no limit for them is known;
 * - sales: by the drivers, the use of the capacity, no year above the most a plan takes (85%, a placeholder), all of it
 *   unless less finishes; typed, the least that meets what higher sales can reach;
 * - the lender's: a longer moratorium, then more instalments, the whole term within the longest (180 months), each the
 *   fewest that meet what it can reach without losing a level met;
 * - the collateral last, since it moves only the security cover: the market value that brings it to its level.
 * A step never trades a level already met for another. When the plan so worked still misses a level, or asks the
 * promoters for as much as the fix or more, it opens on the fix
 * beside the miss instead (engine/fix.ts, OR2b, D-UX-182), so "Make it viable" agrees with "Use this": a shorter repayment
 * and a smaller term loan, the promoters asked once for what more it needs when their most is not typed, and used only
 * when within it when it is. The repayment may shorten on the board down to where the lowest-year DSCR stops meeting.
 * Pure, no DOM.
 */
import { collateralNeeded, diagnose, LEVELS, termMonths, type Diagnosis, type Levels, type RatioId } from './ratios';
import { projectReport, type Report, type ReportInput } from './report';
import type { Blocked, Needs } from './dscr';
import { fixOf } from './fix';

export const LEVER_IDS = ['wc', 'promoters', 'unsecured', 'fixed', 'sales', 'collateral', 'moratorium', 'instalments'] as const;
export type LeverId = (typeof LEVER_IDS)[number];
/** Each lever as a change from the typed figures, 0 being as typed: rupees less working-capital limit (`wc`) or term loan
 * (`promoters`), the promoters bringing them; rupees more unsecured loans, the term loan less by as much; fixed costs lower
 * and sales higher, in tenths of a per cent; rupees more collateral at market value; months more moratorium; more
 * instalments. */
export type Levers = Record<LeverId, number>;
export const AS_TYPED: Levers = { wc: 0, promoters: 0, unsecured: 0, fixed: 0, sales: 0, collateral: 0, moratorium: 0, instalments: 0 };
export const GRID = 1000;
const EPS = 1e-6;
const up = (v: number, places: number) => Math.ceil(v * 10 ** places - EPS) / 10 ** places;

/** The report's inputs with the levers: sales rounded up (to the rupee, or a use to 0.01%) and fixed costs down to the
 * rupee, so the figures a plan writes into the page are the figures it was worked on, and never weaker. */
export function withLevers(x: ReportInput, l: Levers): ReportInput {
  const y: ReportInput = { ...x, loan: { ...x.loan } };
  if (l.promoters || l.unsecured) y.loan.amount = (x.loan.amount as number) - l.promoters - l.unsecured;
  if (l.unsecured) y.unsecured = (x.unsecured ?? 0) + l.unsecured;
  if (l.wc) y.wcLimit = (x.wcLimit as number) - l.wc;
  if (l.fixed) y.fixedCosts = Math.floor((x.fixedCosts as number) * (1 - l.fixed / GRID) + EPS);
  if (l.sales) {
    const f = 1 + l.sales / GRID, most = LEVELS.capacity.mostUsePct;
    if (x.salesBy === 'typed') y.sales = up((x.sales as number) * f, 0);
    else y.utilisationPct = (x.utilisationPct as number[]).map((p) => (p >= most ? p : Math.min(most, up(p * f, 2))));
  }
  if (l.collateral) y.collateral = (x.collateral ?? 0) + l.collateral;
  if (l.moratorium) y.loan.moratoriumMonths = (x.loan.moratoriumMonths as number) + l.moratorium;
  if (l.instalments) y.loan.instalments = (x.loan.instalments as number) + l.instalments;
  return y;
}

/** The limits the plan keeps to: the promoters' most in all (if given), sales in tenths of a per cent by the drivers
 * (every year at the most use; none when typed), the months the whole term may still grow, and the months an instalment
 * takes; the least term loan the report takes (above PMEGP's margin money); and `fewest`, the instalments lever at its
 * lowest (0 or less): the fewest instalments at which the lowest-year DSCR still meets, at the plan's other levers. */
export interface Limits { promotersMost?: number; sales?: number; termRoom: number; monthsEach: number; leastLoan: number; fewest: number }
export interface Plan {
  levers: Levers;
  limits: Limits;
  /** The levers the plan takes to their limit. */
  atLimit: LeverId[];
  /** True when every ratio that can be read meets its level with the plan; `still`, those that miss. */
  works: boolean; still: RatioId[];
  report: Report; diagnosis: Diagnosis;
  /** The promoters' money in all, as typed and with the plan, and how much more the plan needs (0 or more). */
  promoters: { now: number; plan: number; more: number };
  /** True when the plan is the fix beside the miss (OR2b); `fixNeeds`, the promoters' money in all the fix takes, when it
   * was passed over for being more than their most. */
  fromFix: boolean; fixNeeds?: number;
}
export interface PlanInput {
  /** The most the promoters can bring in all, if the borrower gives it. */
  promotersMost?: number;
  /** Levers the borrower has set: kept as they are, the rest worked around them. */
  held?: Partial<Levers>;
  /** The benchmarks the user changed (BEN1), over the fresh loan's defaults. */
  levels?: Levels;
}

const isReport = (r: Report | Needs | Blocked): r is Report => !('needs' in r) && !('blocked' in r);
interface Run { x: ReportInput; r: Report; d: Diagnosis; met: Set<RatioId> }
const run = (x: ReportInput, lv?: Levels): Run | undefined => {
  const r = projectReport(x);
  if (!isReport(r)) return undefined;
  const d = diagnose(r, x, 'fresh', lv);
  return { x, r, d, met: new Set(d.checks.filter((c) => c.meets).map((c) => c.id)) };
};
/** The levels missed apart from the security cover, which the collateral meets last; and those met. */
const open = (u: Run) => u.d.misses.filter((id) => id !== 'securityCover');
const kept = (u: Run) => [...u.met].filter((id) => id !== 'securityCover');

/** The use of the capacity in tenths of a per cent more that brings every year below the most to the most. */
export function salesLimit(x: ReportInput): number | undefined {
  if (x.salesBy === 'typed') return undefined;
  const most = LEVELS.capacity.mostUsePct, low = (x.utilisationPct ?? []).filter((p) => p > 0 && p < most);
  return low.length ? Math.ceil((most / Math.min(...low) - 1) * GRID - EPS) : 0;
}

export function makePlan(x: ReportInput, o: PlanInput = {}): Plan | Needs | Blocked {
  const base = projectReport(x);
  if (!isReport(base)) return base;
  const held = o.held ?? {}, most = o.promotersMost, free = (id: LeverId) => held[id] === undefined;
  const tl = x.loan.amount as number, wc0 = (x.wcLimit as number) ?? 0;
  const leastLoan = base.scheme ? Math.floor(base.scheme.subsidy) + 1 : 1;
  const longest = LEVELS.term.longestMonths, monthsEach = x.loan.frequency === 'quarterly' ? 3 : 1;
  const termRoom = (l: Levers) => Math.max(0, longest - termMonths(withLevers(x, l)));
  const sales = salesLimit(x), start: Levers = { ...AS_TYPED, ...held };
  const memo = new Map<string, Run | undefined>();
  const at = (l: Levers) => {
    const k = LEVER_IDS.map((id) => l[id]).join(',');
    if (!memo.has(k)) memo.set(k, run(withLevers(x, l), o.levels));
    return memo.get(k);
  };

  /** The largest change of `id`, at most `cap`, with the promoters' money in all within their most (none without it). */
  const room = (l: Levers, id: LeverId, cap: number) => {
    if (most === undefined || cap < 1) return 0;
    const within = (v: number) => { const u = at({ ...l, [id]: v }); return !!u && u.r.finance.promoter <= most + EPS; };
    if (!within(0)) return 0;
    if (within(cap)) return cap;
    let a = 0, b = cap;
    while (b - a > 1) { const m = Math.floor((a + b) / 2); if (within(m)) a = m; else b = m; }
    return a;
  };

  /** One step: lever `id` from 0 to `limit`, the rest of `l` as it is. "fill" takes all of it unless less finishes;
   * "least" takes the least that meets what the limit reaches, found by halving. `scan` tries each value in turn (the
   * lender's months, where the ratios need not move one way) for the fewest that meet the most levels missed. */
  const step = (l: Levers, id: LeverId, limit: number, mode: 'fill' | 'least', scan = false): Levers => {
    if (limit < 1) return l;
    const now = at(l), set = (v: number) => at({ ...l, [id]: v });
    if (!now || !open(now).length) return l;
    const far = set(limit);
    if (!far) return l;
    const keep = kept(now);
    if (scan) {
      // The fewest that meet the most levels missed, losing none met: a longer term can cost the fixed-asset cover.
      let best = 0, top = 0;
      for (let v = 1; v <= limit; v++) {
        const u = set(v);
        if (!u || keep.some((k) => !u.met.has(k))) continue;
        const n = open(now).filter((m) => u.met.has(m)).length;
        if (n > top) { best = v; top = n; }
      }
      return best ? { ...l, [id]: best } : l;
    }
    if (keep.some((k) => !far.met.has(k))) return l;
    if (mode === 'fill' && open(far).length) return { ...l, [id]: limit };
    const gain = open(now).filter((m) => far.met.has(m));
    if (!gain.length) return l;
    const target = [...keep, ...gain], ok = (v: number) => { const u = set(v); return !!u && target.every((t) => u.met.has(t)); };
    let lo = 0, hi = limit;
    while (hi - lo > 1) { const m = Math.floor((lo + hi) / 2); if (ok(m)) hi = m; else lo = m; }
    return { ...l, [id]: hi };
  };

  /** The collateral last: the market value that brings the security cover to its level. */
  const withCollateral = (l: Levers): Levers => {
    const u = at(l), need = u ? collateralNeeded(u.r, u.x, 'fresh', o.levels) : undefined, had = (x.collateral ?? 0) + l.collateral;
    return need !== undefined && need > had + EPS && (x.collateral !== undefined || need > 0) ? { ...l, collateral: need - (x.collateral ?? 0) } : l;
  };

  /** The plan in its order; `cap` bounds the term loan's cut when the promoters' most is passed with higher sales. */
  const solve = (cap: number): Levers => {
    let l = { ...start };
    if (free('wc')) l = step(l, 'wc', room(l, 'wc', wc0), 'least');
    if (free('promoters')) l = step(l, 'promoters', Math.min(cap, room(l, 'promoters', tl - leastLoan - l.unsecured)), 'fill');
    if (free('sales')) l = step(l, 'sales', sales ?? (100 - 1) * GRID, sales === undefined ? 'least' : 'fill');
    if (free('moratorium')) l = step(l, 'moratorium', termRoom(l), 'least', true);
    if (free('instalments')) l = step(l, 'instalments', Math.floor(termRoom(l) / monthsEach), 'least', true);
    return free('collateral') ? withCollateral(l) : l;
  };

  // Higher sales need more margin, which the promoters bring: past their most, the term loan's cut gives way by the
  // excess and the steps after it are worked again, until the promoters' money in all is within their most.
  let l = solve(Infinity);
  for (let i = 0; i < 12 && most !== undefined && free('promoters'); i++) {
    const u = at(l), over = u ? u.r.finance.promoter - most : 0;
    if (over <= EPS || l.promoters < 1) break;
    l = solve(Math.max(0, l.promoters - Math.ceil(over - EPS)));
  }
  // A change the plan's levels do not need goes back to as typed, the last first (OR2: sales raised 41.7% met nothing).
  for (const id of [...LEVER_IDS].reverse()) {
    const u = at(l), v = l[id] && free(id) ? at({ ...l, [id]: 0 }) : undefined;
    if (u && v && [...u.met].every((m) => v.met.has(m))) l = { ...l, [id]: 0 };
  }
  // With nothing held, the fix beside the miss (OR2b) when the plan still misses or asks the promoters for as much or
  // more, and the promoters' most, if typed, covers it: so "Make it viable" agrees with "Use this".
  let fromFix = false, fixNeeds: number | undefined;
  const plain = at(l) as Run;
  if (!Object.keys(held).length) {
    const f = fixOf(x, o.levels)?.fixes[0];
    if (f && (most === undefined || f.report.finance.promoter <= most + EPS) && (open(plain).length || plain.r.finance.promoter >= f.report.finance.promoter - EPS)) {
      const k = withCollateral({ ...AS_TYPED, ...f.levers });
      if (at(k) && !open(at(k) as Run).length) { l = k; fromFix = true; }
    } else if (f && open(plain).length) fixNeeds = f.report.finance.promoter;
  }
  const u = at(l) as Run;
  // The fewest instalments the board may take: the lowest-year DSCR meets there (it falls as the instalments rise).
  const n0 = x.loan.instalments as number, dscr = (v: number) => !!at({ ...l, instalments: v })?.met.has('dscrLowest');
  let fewest = Math.min(0, l.instalments);
  if (free('instalments') && dscr(l.instalments)) {
    let a = 1 - n0, b = l.instalments;
    if (dscr(a)) b = a;
    else while (b - a > 1) { const m = Math.floor((a + b) / 2); if (dscr(m)) b = m; else a = m; }
    fewest = Math.min(fewest, b);
  }
  const atLimit = LEVER_IDS.filter((id) => l[id] > 0 && (
    id === 'promoters' || id === 'wc' ? most !== undefined && u.r.finance.promoter >= most - 1 :
    id === 'sales' ? sales !== undefined && l.sales >= sales :
    id === 'moratorium' || id === 'instalments' ? termRoom(l) < monthsEach : false));
  return {
    levers: l, limits: { ...(most !== undefined ? { promotersMost: most } : {}), ...(sales !== undefined ? { sales } : {}), termRoom: termRoom(AS_TYPED), monthsEach, leastLoan, fewest },
    atLimit, works: !u.d.misses.length, still: u.d.misses, report: u.r, diagnosis: u.d, fromFix, ...(fixNeeds !== undefined ? { fixNeeds } : {}),
    promoters: { now: base.finance.promoter, plan: u.r.finance.promoter, more: Math.max(0, u.r.finance.promoter - base.finance.promoter) },
  };
}
