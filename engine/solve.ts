/**
 * Fix it for me (FIX1, D-UX-346, D-UX-351): up to three whole plans, each a set of moves written into the report's own
 * inputs, that meet every level and never run out of cash. Where engine/work.ts tries one change at a time, a plan here
 * moves several figures together; the borrower picks a plan, never combines. Nothing is worked here: every trial is a
 * run of the whole report (engine/report.ts, its two computations) read by `diagnose` (engine/ratios.ts).
 *
 * The moves, each in its box's own unit and within its limit (engine/data/solve.json; the most use and the longest term
 * from engine/data/ratios.json):
 * - `loan`: a smaller term loan, the promoters bringing the difference, never giving up more of it than a plan may
 *   (`loanCutMostPct`) nor passing under the least the report takes;
 * - `cash`: more of the promoters' money kept as cash at the start (the provision for the months that do not yet pay
 *   their way, D-UX-350), up to the term loan's own size;
 * - `wc`: a smaller working-capital limit, the promoters bringing the margin;
 * - `moratorium` and `instalments`: a shorter or longer holiday and repayment, the whole term within the longest;
 * - `use`: more use of the capacity, every year by as many points, none above the most a plan takes;
 * - `price`: a higher price a unit; `priceGrowth`: prices rising faster a year.
 * Never a move: variable or fixed costs, the rate, the collateral.
 *
 * The plans differ by the moves they may use: Borrow less (the promoters' side and the loan's terms), Earn more (the
 * business's side and the loan's terms, the loan as typed), Balanced (both sides in turn).
 *
 * The search, the same for each plan and deterministic: a run's score is the sum over the levels missed of the rupees
 * the worst year is short, plus the cash shortfall, each as a share of the project's cost; 0 means it works. From the typed
 * figures it takes, a grid step at a time (a 20th of each move's range), the step that lowers the score most, a longer
 * stride only when no single step gains; Balanced takes its steps from each side in turn. Then it trims: each move walks
 * back toward the typed figure while the plan still works, the largest first, and is narrowed to the box's rounding
 * (rupees to the thousand, per cent to 0.1, months to the instalment's), so one unit back on any move misses again.
 * Runs are memoised; a plan takes at most `runsMost` of them. Pure, no DOM.
 */
import DATA from './data/solve.json';
import type { Blocked, Needs } from './dscr';
import { diagnose, LEVELS, termMonths, type Diagnosis, type Levels, type RatioId } from './ratios';
import { projectReport, type Report, type ReportInput } from './report';

export const SOLVE = DATA;
export const MOVE_IDS = ['loan', 'cash', 'wc', 'moratorium', 'instalments', 'use', 'price', 'priceGrowth'] as const;
export type MoveId = (typeof MOVE_IDS)[number];
export type PlanId = 'borrowLess' | 'earnMore' | 'balanced';
/** A move in its box's own unit: rupees, months, instalments, the first year's use (%), the price a unit (the first
 * product's, each product rising by the same share), the growth a year (%). */
export interface Move { id: MoveId; from: number; to: number }
export interface Solution {
  id: PlanId;
  moves: Move[];
  /** The report's inputs with the moves written in. */
  input: ReportInput;
  /** Every level met and cash never short; or what is left: the levels still missed, the first year cash runs out. */
  works: boolean; still: RatioId[]; runsOut?: string;
  /** The search's score (0 when it works) and the runs of the report it took. */
  score: number; runs: number;
  report: Report; diagnosis: Diagnosis;
  /** The promoters' money in all: their share of the project and the cash they keep in the business. */
  promoters: { now: number; plan: number; more: number };
}
export interface Solved { base: { report: Report; diagnosis: Diagnosis; score: number }; plans: Solution[] }
export interface SolveInput { levels?: Levels; promotersMost?: number }

const EPS = 1e-9, RUPEES = DATA.rounding.rupees;
const SIDES: MoveId[][] = [['loan', 'cash', 'wc'], ['use', 'price', 'priceGrowth'], ['moratorium', 'instalments']];
const isReport = (r: Report | Needs | Blocked): r is Report => !('needs' in r) && !('blocked' in r);
const round = (v: number, places: number) => Math.round(v * 10 ** places) / 10 ** places;
const up = (v: number, places: number) => Math.ceil(v * 10 ** places - 1e-6) / 10 ** places;

/** A move's axis: `k` whole units of the box's rounding from the typed figure (0), between `lo` and `hi`; a grid step
 * is `step` units; `at` the box's figure at `k`; `write` puts it into the inputs. */
interface Axis { id: MoveId; lo: number; hi: number; step: number; at: (k: number) => number; write: (y: ReportInput, k: number) => void }

/** Rupees moved to round thousands: `k` thousands down (`dir` −1) or up from the typed figure, itself kept at 0. */
const rupees = (typed: number, dir: 1 | -1) => {
  const whole = typed % RUPEES === 0, base = dir < 0 ? Math.floor(typed / RUPEES) * RUPEES : Math.ceil(typed / RUPEES) * RUPEES;
  return { at: (k: number) => (k === 0 ? typed : base + dir * RUPEES * (k - (whole ? 0 : 1))), most: (room: number) => Math.max(0, Math.floor((room + EPS) / RUPEES) + (whole ? 0 : 1)) };
};

function axes(x: ReportInput, base: Report): Axis[] {
  const out: Axis[] = [], grid = (lo: number, hi: number) => Math.max(1, Math.ceil(Math.max(hi, -lo) / DATA.gridSteps));
  const add = (id: MoveId, lo: number, hi: number, at: Axis['at'], write: Axis['write']) => { if (hi > lo) out.push({ id, lo, hi, step: grid(lo, hi), at, write }); };
  const tl = x.loan.amount as number, leastLoan = base.scheme ? Math.floor(base.scheme.subsidy) + 1 : 1;
  const loan = rupees(tl, -1), floorLoan = Math.floor(tl / RUPEES) * RUPEES;
  const least = Math.max(leastLoan, tl * (1 - DATA.loanCutMostPct / 100));
  add('loan', 0, floorLoan >= least ? loan.most(floorLoan - least) : 0, loan.at, (y, k) => { y.loan.amount = loan.at(k); });
  const c0 = x.cashAtStart ?? 0, cash = rupees(c0, 1);
  add('cash', 0, Math.ceil(tl / RUPEES), cash.at, (y, k) => { y.cashAtStart = cash.at(k); });
  if (typeof x.wcLimit === 'number' && x.wcLimit > 0) {
    const wc = rupees(x.wcLimit, -1);
    add('wc', 0, wc.most(Math.floor(x.wcLimit / RUPEES) * RUPEES), wc.at, (y, k) => { y.wcLimit = wc.at(k); });
  }
  const each = x.loan.frequency === 'quarterly' ? 3 : 1, m0 = x.loan.moratoriumMonths as number, n0 = x.loan.instalments as number;
  const room = Math.max(0, LEVELS.term.longestMonths - termMonths(x));
  add('moratorium', -Math.floor(m0 / each), Math.floor(Math.max(0, Math.min(room, DATA.moratoriumMostMonths - m0)) / each), (k) => m0 + k * each, (y, k) => { y.loan.moratoriumMonths = m0 + k * each; });
  add('instalments', -(n0 - 1), Math.floor(room / each), (k) => n0 + k, (y, k) => { y.loan.instalments = n0 + k; });
  if (x.salesBy !== 'typed' && x.utilisationPct?.length) {
    const most = LEVELS.capacity.mostUsePct, u = x.utilisationPct, low = u.filter((p) => p < most);
    const uses = (k: number) => u.map((p) => (p >= most ? p : Math.min(most, round(p + k / 10, 1))));
    if (low.length) add('use', 0, Math.round((most - Math.min(...low)) * 10), (k) => uses(k)[0], (y, k) => { y.utilisationPct = uses(k); });
    const price = (p: number, k: number) => (k ? up(p * (1 + k / 1000), 2) : p), first = x.products?.length ? x.products[0].price : x.price;
    if (typeof first === 'number' && first > 0) add('price', 0, Math.round(DATA.priceMostPct * 10), (k) => price(first, k), (y, k) => {
      if (x.products?.length) y.products = x.products.map((p) => (typeof p.price === 'number' ? { ...p, price: price(p.price, k) } : p));
      else y.price = price(first, k);
    });
    const g0 = x.priceGrowthPct ?? 0;
    add('priceGrowth', 0, Math.round((DATA.priceGrowthMostPct - g0) * 10), (k) => round(g0 + k / 10, 1), (y, k) => { y.priceGrowthPct = round(g0 + k / 10, 1); });
  }
  return out;
}

/** The score of a run: 0 when every level is met and cash never short. Each level missed counts the rupees its worst
 * year is short of it (`short`, engine/ratios.ts, worked twice there) as a share of the project's cost, so a smaller loan
 * never reads worse where a ratio is below nil; the ratio's own shortfall as a share of the level, at most 1, stands in
 * where the rupees are withheld. */
export function scoreOf(r: Report, d: Diagnosis): number {
  let s = 0;
  for (const c of d.checks) {
    if (c.meets !== false) continue;
    s += c.short ? Math.max(0, c.short.amount) / r.projectCost : c.worst === undefined ? 1 : Math.min(1, Math.abs(c.level - c.worst) / c.level);
  }
  return s + (r.cashShort ? r.cashShort.need / r.projectCost : 0);
}

interface Run { y: ReportInput; r: Report; d: Diagnosis; score: number }

export function solve(x: ReportInput, o: SolveInput = {}): Solved | Needs | Blocked {
  const first = projectReport(x);
  if (!isReport(first)) return first;
  const d0 = diagnose(first, x, 'fresh', o.levels), base = { report: first, diagnosis: d0, score: scoreOf(first, d0) };
  const works = (u: Run) => !u.d.misses.length && !u.r.cashShort;
  const start: Run = { y: x, r: first, d: d0, score: base.score };
  if (works(start)) return { base, plans: [] };
  const all = axes(x, first), longest = LEVELS.term.longestMonths, now = first.finance.promoter + first.finance.kept;
  const memo = new Map<string, Run | undefined>();
  let runs = 0, left = 0;
  /** The run at `ks`, a count of units for each axis of `all`; none when the report cannot be made there, the term
   * passes the longest, or the promoters' money in all passes their most. */
  const at = (ks: number[]): Run | undefined => {
    const key = ks.join(',');
    if (memo.has(key)) return memo.get(key);
    let u: Run | undefined;
    if (ks.every((k) => k === 0)) u = start;
    else {
      const y: ReportInput = { ...x, loan: { ...x.loan } };
      all.forEach((a, i) => { if (ks[i]) a.write(y, ks[i]); });
      if (termMonths(y) <= longest) {
        // The plan's runs are spent: not tried, and not remembered as tried.
        if (left <= 0) return undefined;
        runs++; left--;
        const r = projectReport(y);
        if (isReport(r) && (o.promotersMost === undefined || r.finance.promoter + r.finance.kept <= Math.max(o.promotersMost, now) + 0.005)) {
          const d = diagnose(r, y, 'fresh', o.levels);
          u = { y, r, d, score: scoreOf(r, d) };
        }
      }
    }
    memo.set(key, u);
    return u;
  };

  const plan = (id: PlanId, allowed: MoveId[], inTurn: boolean): Solution => {
    const idx = all.map((a, i) => (allowed.includes(a.id) ? i : -1)).filter((i) => i >= 0), before = runs, spent = () => runs - before;
    const groups = (inTurn ? SIDES : [allowed]).map((g) => idx.filter((i) => g.includes(all[i].id))).filter((g) => g.length);
    const moved = (ks: number[], i: number, k: number) => ks.map((v, j) => (j === i ? k : v));
    const clamp = (a: Axis, k: number) => Math.min(a.hi, Math.max(a.lo, k));
    let ks = all.map(() => 0), cur = start;
    left = DATA.runsMost;
    // The descent: the best step of the group whose turn it is; a full round with no gain ends it.
    for (let turn = 0, idle = 0; cur.score > 0 && idle < groups.length && left > 0; turn++) {
      let best: { ks: number[]; u: Run; gain: number } | undefined;
      for (const stride of [1, 4, DATA.gridSteps]) {
        for (const i of groups[turn % groups.length]) for (const dir of [1, -1]) {
          const a = all[i], k = clamp(a, ks[i] + dir * stride * a.step);
          if (k === ks[i]) continue;
          const u = at(moved(ks, i, k));
          if (!u) continue;
          const gain = (cur.score - u.score) / stride;
          if (gain > EPS && (!best || gain > best.gain + EPS)) best = { ks: moved(ks, i, k), u, gain };
        }
        if (best) break;
      }
      if (best) { ks = best.ks; cur = best.u; idle = 0; } else idle++;
    }
    if (works(cur)) {
      const ok = (i: number, k: number) => { const u = at(moved(ks, i, k)); return !!u && works(u); };
      const back = (i: number, by: number) => (ks[i] > 0 ? Math.max(0, ks[i] - by) : Math.min(0, ks[i] + by));
      const order = [...idx].sort((a, b) => Math.abs(ks[b]) / all[b].step - Math.abs(ks[a]) / all[a].step || a - b);
      // Walk back a grid step at a time, the largest move first; then narrow each to the box's rounding.
      for (const i of order) while (ks[i] !== 0 && ok(i, back(i, all[i].step))) ks = moved(ks, i, back(i, all[i].step));
      for (const i of order) {
        if (ks[i] === 0) continue;
        let good = ks[i], bad = back(i, all[i].step);
        if (ok(i, bad)) { ks = moved(ks, i, bad); continue; }
        while (Math.abs(good - bad) > 1) { const mid = Math.trunc((good + bad) / 2); if (ok(i, mid)) good = mid; else bad = mid; }
        ks = moved(ks, i, good);
      }
      // One unit back on any move misses again: repeat while a unit can still be given back.
      for (let again = true, n = 0; again && n < 50; n++) {
        again = false;
        for (const i of order) if (ks[i] !== 0 && ok(i, back(i, 1))) { ks = moved(ks, i, back(i, 1)); again = true; }
      }
      cur = at(ks) as Run;
    }
    const total = cur.r.finance.promoter + cur.r.finance.kept;
    return {
      id, moves: all.flatMap((a, i) => (ks[i] ? [{ id: a.id, from: a.at(0), to: a.at(ks[i]) }] : [])), input: cur.y,
      works: works(cur), still: cur.d.misses, ...(cur.r.cashShort ? { runsOut: cur.r.cashShort.first } : {}), score: cur.score, runs: spent(),
      report: cur.r, diagnosis: cur.d, promoters: { now, plan: total, more: total - now },
    };
  };

  const plans: Solution[] = [];
  for (const p of DATA.plans) {
    const s = plan(p.id as PlanId, p.moves as MoveId[], p.id === 'balanced');
    // Plans with the same moves collapse to one, the first kept; a plan that moves nothing is none.
    const same = (q: Solution) => q.works === s.works && q.moves.length === s.moves.length && q.moves.every((m, i) => m.id === s.moves[i].id);
    if (s.moves.length && !plans.some(same)) plans.push(s);
  }
  // Those that work first, in their order; then the nearest.
  return { base, plans: [...plans.filter((p) => p.works), ...plans.filter((p) => !p.works).sort((a, b) => a.score - b.score)] };
}
