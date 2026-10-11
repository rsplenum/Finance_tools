/**
 * Make it viable (D-UX-50): what the project report's own figures must become for its DSCR to meet the lenders' common
 * benchmarks (engine/data/dscr.json, unverified): the average and the lowest year. Each lever is worked alone, the rest
 * held as typed, by running the whole report again (engine/report.ts), so every figure comes from the same engine and its
 * second computation. Sales first (the owner's word: "mostly it will be adjusting sales"), then a smaller term loan with the
 * promoters bringing the rest, then a longer repayment.
 */
import { BENCHMARKS, limitText, shortfall, type Blocked, type Limit, type Needs, type Target } from './dscr';
import { projectReport, type Report, type ReportInput } from './report';

/** The benchmarks the levers aim at, with their wording for the page. */
export const TARGET: Target = {
  average: BENCHMARKS.find((b) => b.target === 'average')?.value,
  minimum: BENCHMARKS.find((b) => b.target === 'minimum')?.value,
};

/** Sales scaled by a factor, on the 0.1% grid: in every year, by the drivers (the price) or as typed. */
export interface SalesLever {
  /** The change in sales, in tenths of a per cent: +184 is 18.4% more; −120 is 12.0% less (the room to fall). */
  tenths: number; fy: string; now: number; needed: number;
  /** By the drivers: the price a unit that gives those sales at the same use, and the use in each year at the same price. */
  price?: { now: number; needed: number };
  use?: { now: number[]; needed: number[]; overFull: boolean };
  /** At those sales, cash still below nil: the promoters' money more that keeps it at nil or above. */
  cashNeed?: number;
}
export interface Viability {
  target: Target;
  /** True when the report as typed meets the targets. */
  meets: boolean;
  /** Why it misses, as the DSCR page says it. */
  misses?: string;
  /** Viable: how far sales may fall and still meet; not viable: how much more they must be. Absent when none works. */
  sales?: SalesLever; salesNone?: string;
  /** Not viable only: the largest term loan that meets, the promoters bringing the rest. */
  loan?: { now: number; largest: number; more: number }; loanNone?: string;
  /** Not viable only: the fewest instalments, more than typed, that meet. */
  instalments?: { now: number; needed: number; perYear: number }; instalmentsNone?: string;
}

const GRID = 1000, MAX_FACTOR = 100, MAX_YEARS = 20;
const isReport = (r: Report | Needs | Blocked): r is Report => !('needs' in r) && !('blocked' in r);

/** The report with sales scaled by `f`: the price under the drivers (capacity × use × price), or the typed sales. */
const scaled = (x: ReportInput, f: number): ReportInput =>
  x.salesBy === 'typed' ? { ...x, sales: (x.sales as number) * f } : { ...x, price: (x.price as number) * f };

/** The first year with twelve months of sales, else the first: the year the page names. */
const fullYear = (r: Report) => r.years.find((y) => y.months === 12) ?? r.years[0];

export function makeViable(x: ReportInput): Viability | Needs | Blocked {
  const base = projectReport(x);
  if (!isReport(base)) return base;
  const miss = (r: Report | Needs | Blocked): Limit | 'none' | undefined => (isReport(r) ? shortfall(r.plan.statement, TARGET) : 'none');
  const first = miss(base) as Limit | undefined;
  const out: Viability = { target: TARGET, meets: !first, ...(first ? { misses: limitText(first) } : {}) };

  // Sales: on the 0.1% grid, the least that meets (k tenths of a per cent, the factor 1 + k/1000). The DSCR rises with
  // sales while materials and other variable costs stay under 100% of them, so the meeting factors are one unbroken range
  // upward; the answer is checked against points below it.
  const at = (k: number) => projectReport(scaled(x, 1 + k / GRID));
  const meetsAt = (k: number) => miss(at(k)) === undefined;
  let lo: number, hi: number;
  if (first) {
    lo = 0; hi = 1;
    while (!meetsAt(hi)) {
      lo = hi; hi *= 2;
      if (hi > (MAX_FACTOR - 1) * GRID) { hi = NaN; break; }
    }
  } else {
    hi = 0; lo = -1;
    while (meetsAt(lo)) {
      hi = lo; lo *= 2;
      if (lo <= -GRID) { lo = -GRID; break; }
    }
  }
  if (Number.isNaN(hi)) out.salesNone = `Even ${MAX_FACTOR} times the sales typed, ${limitText(miss(at((MAX_FACTOR - 1) * GRID)) as Limit)}.`;
  else {
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2);
      if (meetsAt(mid)) hi = mid; else lo = mid;
    }
    // The least on the grid must top an unbroken range: points below it miss, and points above it meet.
    const broken = [1, 2, 5, 10, 50].some((d) => hi - d > -GRID && meetsAt(hi - d)) || [1, 10, 100].some((d) => !meetsAt(hi + d));
    const r = at(hi);
    if (broken || !isReport(r)) out.salesNone = 'No single answer: the DSCR does not rise steadily with sales here. Try the other changes below.';
    else {
      const y = fullYear(r), y0 = base.years.find((b) => b.fy === y.fy) as Report['years'][number];
      const f = 1 + hi / GRID;
      out.sales = {
        tenths: hi, fy: y.fy, now: y0.sales, needed: y.sales,
        ...(x.salesBy !== 'typed' ? {
          price: { now: x.price as number, needed: (x.price as number) * f },
          use: { now: base.years.map((b) => b.utilisationPct as number), needed: base.years.map((b) => (b.utilisationPct as number) * f), overFull: base.years.some((b) => (b.utilisationPct as number) * f > 100 + 1e-9) },
        } : {}),
        ...(r.cashShort ? { cashNeed: r.cashShort.need } : {}),
      };
    }
  }
  if (!first) return out;

  // A smaller term loan, the promoters bringing the rest: the largest, to the rupee, that meets. Less loan means less to
  // repay and less interest, so the DSCR rises as the loan falls. Under PMEGP the loan must stay above the margin money.
  const now = x.loan.amount as number, withLoan = (a: number) => projectReport({ ...x, loan: { ...x.loan, amount: a } });
  const floor = base.scheme ? Math.floor(base.scheme.subsidy) + 1 : 1;
  if (miss(withLoan(floor)) !== undefined) {
    const why = miss(withLoan(floor));
    out.loanNone = `No smaller loan meets the targets: even at Rs. ${floor.toLocaleString('en-IN')}, ${why === 'none' ? 'the report cannot be worked' : limitText(why as Limit)}.`;
  } else {
    let a = floor, b = now;
    while (b - a > 1) {
      const m = Math.floor((a + b) / 2);
      if (miss(withLoan(m)) === undefined) a = m; else b = m;
    }
    const broken = [0.75, 0.5, 0.25].some((p) => { const m = Math.max(floor, Math.floor(a * p)); return miss(withLoan(m)) !== undefined; });
    if (broken) out.loanNone = 'No single answer: some smaller loans miss the targets, because a weak year pulls the average around.';
    else out.loan = { now, largest: a, more: now - a };
  }

  // A longer repayment: the fewest instalments, more than typed, that meet, up to twenty years from the first draw.
  const perYear = x.loan.frequency === 'quarterly' ? 4 : 12, n0 = x.loan.instalments as number;
  const most = MAX_YEARS * perYear - Math.ceil(((x.loan.moratoriumMonths as number) * perYear) / 12);
  let found: number | undefined;
  for (let n = n0 + 1; n <= most; n++) {
    if (miss(projectReport({ ...x, loan: { ...x.loan, instalments: n } })) === undefined) { found = n; break; }
  }
  if (found !== undefined) out.instalments = { now: n0, needed: found, perYear };
  else out.instalmentsNone = `No repayment within ${MAX_YEARS} years meets the targets.`;
  return out;
}
