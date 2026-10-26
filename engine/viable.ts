/**
 * Make it viable (D-UX-50, D-UX-52): first the diagnosis, each of the lender's benchmark ratios against its level in its
 * worst year (engine/ratios.ts, D-UX-51); then single changes, each worked alone with the rest as typed, against every
 * ratio. The borrower's: sales, a smaller term loan or working-capital limit with the promoters bringing the rest, and
 * collateral. The lender's, and only these: a longer moratorium or a longer repayment, the whole term at most 180 months
 * with the moratorium. Each answer runs the whole report again (engine/report.ts), so every figure comes from the same
 * engine and its second computation. A change aims at every ratio it can bring to its level; what it cannot is named.
 */
import { collateralNeeded, diagnose, LEVELS, termMonths, type Diagnosis, type Levels, type RatioId } from './ratios';
import { projectReport, type Report, type ReportInput } from './report';
import type { Blocked, Needs } from './dscr';

/** What a change does: the levels missed as typed that it meets, and those still missed with it. */
export interface Outcome { fixes: RatioId[]; still: RatioId[]; cashNeed?: number }
/** Sales scaled by a factor, on the 0.1% grid: in every year, by the drivers (the price) or as typed. */
export interface SalesLever extends Outcome {
  /** The change in sales, in tenths of a per cent: +184 is 18.4% more; −120 is 12.0% less (the room to fall). */
  tenths: number; fy: string; now: number; needed: number;
  /** By the drivers: the price a unit that gives those sales at the same use, and the use in each year at the same price. */
  price?: { now: number; needed: number };
  use?: { now: number[]; needed: number[]; overFull: boolean; overMost: boolean };
}
/** A loan made smaller, the promoters bringing `more`. */
export interface Smaller extends Outcome { now: number; largest: number; more: number }
export interface Longer extends Outcome { now: number; needed: number }
export interface Viability {
  diagnosis: Diagnosis;
  /** True when every ratio that can be read meets its level. */
  meets: boolean;
  sales?: SalesLever; salesNone?: string;
  loan?: Smaller; loanNone?: string;
  wc?: Smaller; wcNone?: string;
  /** The collateral's market value that brings the security cover to its level, and the value typed, if any. */
  collateral?: { now?: number; needed: number };
  moratorium?: Longer; moratoriumNone?: string;
  instalments?: Longer & { perYear: number }; instalmentsNone?: string;
}

const GRID = 1000, MAX_FACTOR = 100;
const isReport = (r: Report | Needs | Blocked): r is Report => !('needs' in r) && !('blocked' in r);
/** The report with sales scaled by `f`: the price (every product's) under the drivers (capacity × use × price), or the typed sales. */
const scaled = (x: ReportInput, f: number): ReportInput =>
  x.salesBy === 'typed' ? { ...x, sales: (x.sales as number) * f }
    : x.products ? { ...x, products: x.products.map((p) => ({ ...p, price: (p.price as number) * f })) } : { ...x, price: (x.price as number) * f };
/** The one price a unit, when the business sells one thing; none for several products. */
const onePrice = (x: ReportInput) => (x.products ? (x.products.length === 1 ? x.products[0].price : undefined) : x.price);
/** The first year with twelve months of sales, else the first: the year the page names. */
const fullYear = (r: Report) => r.years.find((y) => y.months === 12) ?? r.years[0];

/** A run of the report: the report and the levels it misses, or nothing when it cannot be worked. */
interface Run { r: Report; misses: Set<RatioId>; known: Set<RatioId> }
const runAt = (lv?: Levels) => (x: ReportInput): Run | undefined => {
  const r = projectReport(x);
  if (!isReport(r)) return undefined;
  const d = diagnose(r, x, 'fresh', lv);
  return { r, misses: new Set(d.misses), known: new Set(d.checks.filter((c) => c.meets !== undefined).map((c) => c.id)) };
};
/** The levels a change can reach: those that meet at its farthest. */
const reach = (far: Run | undefined) => (far ? [...far.known].filter((id) => !far.misses.has(id)) : []);
const meetsAll = (t: RatioId[]) => (u: Run | undefined) => !!u && t.every((id) => !u.misses.has(id));
const outcome = (missed: RatioId[], u: Run): Outcome => ({
  fixes: missed.filter((id) => !u.misses.has(id)), still: [...u.misses], ...(u.r.cashShort ? { cashNeed: u.r.cashShort.need } : {}),
});

/** `lv`: the benchmarks the user changed (BEN1), over the fresh loan's defaults. */
export function makeViable(x: ReportInput, lv?: Levels): Viability | Needs | Blocked {
  const base = projectReport(x);
  if (!isReport(base)) return base;
  const run = runAt(lv), diagnosis = diagnose(base, x, 'fresh', lv), missed = diagnosis.misses;
  const out: Viability = { diagnosis, meets: !missed.length };
  const cn = collateralNeeded(base, x, 'fresh', lv);
  if (cn !== undefined && (diagnosis.checks.find((c) => c.id === 'securityCover')?.meets !== true)) out.collateral = { ...(x.collateral !== undefined ? { now: x.collateral } : {}), needed: cn };
  const none = (what: string) => `${what} alone meets none of the levels missed.`;

  // Sales: on the 0.1% grid, the least that meets every level higher sales can reach (k tenths of a per cent, the factor
  // 1 + k/1000); as typed and meeting, the most they can fall with every level still met. The ratios rise with sales while
  // variable costs stay under 100% of them, so the meeting factors are one unbroken range; it is checked below and above.
  const at = (k: number) => run(scaled(x, 1 + k / GRID));
  const target = missed.length ? reach(at((MAX_FACTOR - 1) * GRID)) : [...(run(x) as Run).known];
  const ok = meetsAll(target), okAt = (k: number) => ok(at(k));
  if (missed.length && !missed.some((id) => target.includes(id))) out.salesNone = none('Higher sales');
  else {
    let lo: number, hi: number;
    if (missed.length) {
      lo = 0; hi = 1;
      while (!okAt(hi)) { lo = hi; hi = Math.min(hi * 2, (MAX_FACTOR - 1) * GRID); }
    } else {
      hi = 0; lo = -1;
      while (okAt(lo)) {
        hi = lo; lo *= 2;
        if (lo <= -GRID) { lo = -GRID; break; }
      }
    }
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2);
      if (okAt(mid)) hi = mid; else lo = mid;
    }
    const broken = [1, 2, 5, 10, 50].some((d) => hi - d > -GRID && okAt(hi - d)) || [1, 10, 100].some((d) => !okAt(hi + d));
    const u = at(hi);
    if (broken || !u) out.salesNone = 'No single answer: the ratios do not rise steadily with sales here. Try the other changes below.';
    else {
      const y = fullYear(u.r), y0 = base.years.find((b) => b.fy === y.fy) as Report['years'][number], f = 1 + hi / GRID;
      const most = LEVELS.capacity.mostUsePct, use = base.years.map((b) => (b.utilisationPct as number) * f);
      out.sales = {
        tenths: hi, fy: y.fy, now: y0.sales, needed: y.sales, ...outcome(missed, u),
        ...(x.salesBy !== 'typed' ? {
          ...(onePrice(x) !== undefined ? { price: { now: onePrice(x) as number, needed: (onePrice(x) as number) * f } } : {}),
          use: { now: base.years.map((b) => b.utilisationPct as number), needed: use, overFull: use.some((p) => p > 100 + 1e-9), overMost: use.some((p) => p > most + 1e-9) },
        } : {}),
      };
    }
  }
  if (!missed.length) return out;

  // A smaller loan, the promoters bringing the rest: the largest, to the rupee, that meets every level it can reach. Less
  // loan means less to repay and less interest, so the ratios rise as the loan falls; checked at points below.
  const smaller = (now: number, floor: number, set: (a: number) => ReportInput, what: string): Smaller | string => {
    const t = reach(run(set(floor)));
    if (!missed.some((id) => t.includes(id))) return none(what);
    const okA = (a: number) => meetsAll(t)(run(set(a)));
    let a = floor, b = now;
    while (b - a > 1) {
      const m = Math.floor((a + b) / 2);
      if (okA(m)) a = m; else b = m;
    }
    if ([0.75, 0.5, 0.25].some((p) => !okA(Math.max(floor, Math.floor(a * p))))) return 'No single answer: some smaller amounts miss again, because a weak year pulls the ratios around.';
    const u = run(set(a)) as Run;
    return { now, largest: a, more: u.r.finance.promoter - base.finance.promoter, ...outcome(missed, u) };
  };
  const tl = x.loan.amount as number, floor = base.scheme ? Math.floor(base.scheme.subsidy) + 1 : 1;
  const loan = smaller(tl, floor, (a) => ({ ...x, loan: { ...x.loan, amount: a } }), 'A smaller term loan');
  if (typeof loan === 'string') out.loanNone = loan; else out.loan = loan;
  const wc = x.wcLimit as number;
  if (wc > 0) {
    const w = smaller(wc, 0, (a) => ({ ...x, wcLimit: a }), 'A smaller working-capital limit');
    if (typeof w === 'string') out.wcNone = w; else out.wc = w;
  }

  // The lender's: a longer moratorium, or more instalments, the whole term at most the longest (the moratorium in it).
  // The fewest that meet every level the longest can reach, tried one by one.
  const longest = LEVELS.term.longestMonths, n0 = x.loan.instalments as number, m0 = x.loan.moratoriumMonths as number;
  const perYear = x.loan.frequency === 'quarterly' ? 4 : 12, step = 12 / perYear, room = longest - termMonths(x);
  const longer = (now: number, most: number, set: (v: number) => ReportInput, what: string): Longer | string => {
    if (room <= 0 || most <= now) return `The loan already runs ${termMonths(x)} months: none longer within ${longest}.`;
    const t = reach(run(set(most)));
    if (!missed.some((id) => t.includes(id))) return `${what} within ${longest} months meets none of the levels missed.`;
    for (let v = now + 1; v <= most; v++) {
      const u = run(set(v));
      if (meetsAll(t)(u)) return { now, needed: v, ...outcome(missed, u as Run) };
    }
    return `${what} within ${longest} months meets none of the levels missed.`;
  };
  const mor = longer(m0, m0 + room, (v) => ({ ...x, loan: { ...x.loan, moratoriumMonths: v } }), 'A longer holiday');
  if (typeof mor === 'string') out.moratoriumNone = mor; else out.moratorium = mor;
  const ins = longer(n0, n0 + Math.floor(room / step), (v) => ({ ...x, loan: { ...x.loan, instalments: v } }), 'A longer repayment');
  if (typeof ins === 'string') out.instalmentsNone = ins; else out.instalments = { ...ins, perYear };
  return out;
}
