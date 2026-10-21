/**
 * The default benchmark ratios (D-UX-51, D-UX-99), or those the user changed (BEN1), read against a project report: each ratio in its worst year (the lowest for a
 * ratio that must be at least its level, the highest for one that must be at most), whether it meets, and the collateral
 * the security cover needs (D-UX-52). Pure, no DOM. Every figure is the report's own (engine/report.ts); the collateral
 * needed is worked here in closed form and checked by running the report again with it.
 */
import DATA from './data/ratios.json';
import { projectReport, type Report, type ReportInput, type ReportYear } from './report';

export const RATIOS = DATA.ratios;
export const LEVELS = DATA;
export type Case = keyof typeof DATA.cases;
export type RatioId = (typeof DATA.ratios)[number]['id'];
/** Benchmarks the user changed (BEN1, D-UX-101): a ratio's id to its figure, over ratios.json's fresh or renewal value. */
export type Levels = Partial<Record<RatioId, number>>;

/** A ratio's benchmark: the user's when it is a figure above nil, else the default for the case. */
export function levelFor(id: RatioId, c: Case, lv?: Levels): number {
  const v = lv?.[id];
  return v !== undefined && Number.isFinite(v) && v > 0 ? v : (RATIOS.find((d) => d.id === id) as (typeof RATIOS)[number])[c];
}
/** A check's head: the ratio, its benchmark and, when the user changed it, the default it replaced. */
export function checkHead(id: RatioId, c: Case, lv?: Levels): Pick<RatioCheck, 'id' | 'label' | 'at' | 'level' | 'byDefault'> {
  const d = RATIOS.find((k) => k.id === id) as (typeof RATIOS)[number], level = levelFor(id, c, lv);
  return { id, label: d.label, at: d.at as 'least' | 'most', level, ...(Math.abs(level - d[c]) > EPS ? { byDefault: d[c] } : {}) };
}

export interface RatioCheck {
  id: RatioId; label: string; at: 'least' | 'most'; level: number;
  /** The default benchmark, when the user changed this one (BEN1). */
  byDefault?: number;
  /** The worst year's figure and the year (none for the average DSCR, which is over the loan). */
  worst?: number; fy?: string;
  /** Undefined while it cannot be read: the security cover before the collateral is typed and short of its level on the
   * project's own assets, or no year to read. */
  meets?: boolean;
  /** The security cover read on the project's own assets, no collateral typed: shown only when that alone meets (UX5b). */
  own?: boolean;
  /** Why it fails without a figure: net worth at or below nil. */
  why?: string;
  /** Why it is not read at all, on the CMA (MV4): no term loan to repay, or no interest to pay. */
  na?: string;
  /** When it misses: how much more of the ratio's own figure the worst year needs to meet the level, in rupees, the rest
   * as it is (D-UX-53, MV2b): cash available for the loan (the DSCRs, the average's over the loan), profit before interest
   * and tax (interest cover), current assets (current ratio), net worth (TOL/TNW, debt-equity), net fixed assets
   * (fixed-asset cover) or security (security cover). Undefined when its two computations disagree. */
  short?: { amount: number; of: Shortfall };
}
/** `pbdit`: the CMA's interest cover is on profit before interest, depreciation and tax (MV4). */
export type Shortfall = 'cash' | 'profit' | 'pbdit' | 'currentAssets' | 'netWorth' | 'fixedAssets' | 'security';
export interface Diagnosis {
  checks: RatioCheck[];
  /** The ratios that miss their level. */
  misses: RatioId[];
  /** The term loan's whole term in months, the moratorium in it, and the longest an MSME loan runs. */
  term: { months: number; longest: number };
}

const EPS = 1e-9;

/** The whole term in months: the moratorium and the instalments, monthly or quarterly. */
export const termMonths = (x: ReportInput) => (x.loan.moratoriumMonths as number) + (x.loan.instalments as number) * (x.loan.frequency === 'quarterly' ? 3 : 1);

/** The worst year of a ratio over the years where it is defined. */
function worstOf(ys: ReportYear[], f: (y: ReportYear) => number | undefined, at: 'least' | 'most') {
  let w: { v: number; fy: string } | undefined;
  for (const y of ys) {
    const v = f(y);
    if (v === undefined || !Number.isFinite(v)) continue;
    if (!w || (at === 'least' ? v < w.v : v > w.v)) w = { v, fy: y.fy };
  }
  return w;
}

/** The collateral's realisable sale value that brings every year's security cover to `level`, in closed form. */
const rsvNeeded = (r: Report, level: number) => Math.max(0, ...r.years.filter((y) => y.secured > EPS).map((y) => level * y.secured - y.security));

/** Worked twice: `a` from the ratio's own parts, `b` by another route; withheld when they differ by more than a paisa. */
const twice = (a: number, b: number | undefined, of: Shortfall) => (b === undefined || Math.abs(a - b) <= 0.01 ? { short: { amount: a, of } } : {});

/** The rupees a missed ratio needs in its worst year `y` (or over the loan, for the average DSCR). */
function shortfall(id: RatioId, level: number, r: Report, y: ReportYear | undefined) {
  if (id === 'dscrAverage') {
    const t = r.plan.statement.total, used = r.years.filter((k) => k.counted);
    if (!t) return {};
    return twice(level * t.service - t.available, used.reduce((s, k) => s + level * k.service - k.available, 0), 'cash');
  }
  if (!y) return {};
  const tol = y.unsecured + y.termLoan + y.wcLoan + y.creditors, interest = y.tlInterest + y.wcInterest;
  switch (id) {
    case 'dscrLowest': return twice(level * y.service - y.available, y.dscr === undefined ? undefined : (level - y.dscr) * y.service, 'cash');
    case 'interestCover': return twice(level * interest - (y.pbt + interest), y.interestCover === undefined ? undefined : (level - y.interestCover) * interest, 'profit');
    case 'currentRatio': return twice(level * (y.wcLoan + y.creditors) - (y.currentAssets + y.cash), y.currentRatio === undefined ? undefined : (level - y.currentRatio) * (y.wcLoan + y.creditors), 'currentAssets');
    // Net worth at or below nil has no ratio: the second route reads the outside liabilities off the balance sheet's total.
    case 'tolTnw': return twice(tol / level - y.netWorth, (y.liabilities - y.netWorth) / level - y.netWorth, 'netWorth');
    case 'debtEquity': return twice(y.termLoan / level - y.netWorth, y.debtEquity === undefined ? undefined : y.netWorth * (y.debtEquity / level - 1), 'netWorth');
    case 'facr': return twice(level * y.termLoan - y.netBlock, y.facr === undefined ? undefined : (level - y.facr) * y.termLoan, 'fixedAssets');
    case 'securityCover': return twice(level * y.secured - (y.security + (r.collateral?.rsv ?? 0)), y.securityCover === undefined ? undefined : (level - y.securityCover) * y.secured, 'security');
  }
  return {};
}

export function diagnose(r: Report, x: ReportInput, c: Case = 'fresh', lv?: Levels): Diagnosis {
  const ys = r.years, checks: RatioCheck[] = [];
  const year = (fy?: string) => ys.find((y) => y.fy === fy);
  const push = (k: RatioCheck) => checks.push(k.meets === false ? { ...k, ...shortfall(k.id, k.level, r, year(k.fy)) } : k);
  for (const d of RATIOS) {
    const base = checkHead(d.id as RatioId, c, lv), { at, level } = base;
    if (d.id === 'dscrAverage') {
      push(r.average === undefined ? base : { ...base, worst: r.average, meets: r.average >= level - EPS });
      continue;
    }
    if (d.id === 'dscrLowest') {
      push(r.lowest ? { ...base, worst: r.lowest.dscr, fy: r.lowest.fy, meets: r.lowest.dscr >= level - EPS } : base);
      continue;
    }
    if (d.id === 'tolTnw' || d.id === 'debtEquity') {
      // Net worth at or below nil: the ratio has no meaning, and it fails.
      const sunk = ys.find((y) => y.netWorth <= 0);
      if (sunk) { push({ ...base, fy: sunk.fy, meets: false, why: `net worth is at or below nil in ${sunk.fy}` }); continue; }
    }
    if (d.id === 'securityCover' && r.mudra) {
      // A Mudra loan takes no collateral, CGFMU's guarantee standing in (SCH1): the cover on the project's own assets is
      // shown, never counted, so it neither meets nor misses.
      const w = worstOf(ys, (y) => (y.secured > 0 ? y.security / y.secured : undefined), at);
      push({ ...base, na: `${w ? `${w.v.toFixed(2)} in ${w.fy} on the project's own assets; ` : ''}not counted on a Mudra loan, which needs no collateral: CGFMU's guarantee stands in` });
      continue;
    }
    if (d.id === 'securityCover' && !r.collateral) {
      // No collateral typed: the project's own assets may meet the level alone (then typing collateral only adds to it);
      // short of it, the cover waits for the collateral's value. collateralNeeded() is its second computation (0 when it meets).
      const w = worstOf(ys, (y) => (y.secured > 0 ? y.security / y.secured : undefined), at);
      push(w && w.v >= level - EPS ? { ...base, worst: w.v, fy: w.fy, meets: true, own: true } : base);
      continue;
    }
    const w = worstOf(ys, (y) => y[d.id as 'currentRatio' | 'tolTnw' | 'debtEquity' | 'interestCover' | 'facr' | 'securityCover'], at);
    push(w ? { ...base, worst: w.v, fy: w.fy, meets: at === 'least' ? w.v >= level - EPS : w.v <= level + EPS } : base);
  }
  return {
    checks, misses: checks.filter((k) => k.meets === false).map((k) => k.id),
    term: { months: termMonths(x), longest: DATA.term.longestMonths },
  };
}

/** The collateral's market value, to the rupee, whose realisable sale value brings the security cover to its level in
 * every year (0 if none is needed): worked in closed form, then checked by the report itself with that collateral, and a
 * rupee less missing. Undefined when the two disagree by more than a rupee's rounding, so no figure is shown, and on a
 * Mudra loan, which takes no collateral. */
export function collateralNeeded(r: Report, x: ReportInput, c: Case = 'fresh', lv?: Levels): number | undefined {
  if (r.mudra) return undefined;
  const level = levelFor('securityCover', c, lv), rsvPct = DATA.collateral.rsvPct;
  const need = rsvNeeded(r, level);
  if (need <= EPS) return 0;
  const mv = Math.ceil((need * 100) / rsvPct - 1e-6);
  const cover = (m: number) => {
    const t = projectReport({ ...x, collateral: m });
    if ('needs' in t || 'blocked' in t) return NaN;
    return Math.min(...t.years.filter((y) => y.securityCover !== undefined).map((y) => y.securityCover as number));
  };
  // The report with that collateral must meet, and with a rupee less miss; a rupee's rounding either way is allowed.
  for (const m of [mv, mv + 1]) if (cover(m) >= level - EPS && !(cover(m - 1) >= level - EPS)) return m;
  return undefined;
}
