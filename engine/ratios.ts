/**
 * The lender's benchmark ratios (D-UX-51) read against a project report: each ratio in its worst year (the lowest for a
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

export interface RatioCheck {
  id: RatioId; label: string; at: 'least' | 'most'; level: number;
  /** The worst year's figure and the year (none for the average DSCR, which is over the loan). */
  worst?: number; fy?: string;
  /** Undefined while it cannot be read: the security cover before the collateral is typed, or no year to read. */
  meets?: boolean;
  /** Why it fails without a figure: net worth at or below nil. */
  why?: string;
}
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

export function diagnose(r: Report, x: ReportInput, c: Case = 'fresh'): Diagnosis {
  const ys = r.years, checks: RatioCheck[] = [];
  for (const d of RATIOS) {
    const level = d[c], at = d.at as 'least' | 'most', base = { id: d.id as RatioId, label: d.label, at, level };
    if (d.id === 'dscrAverage') {
      checks.push(r.average === undefined ? base : { ...base, worst: r.average, meets: r.average >= level - EPS });
      continue;
    }
    if (d.id === 'dscrLowest') {
      checks.push(r.lowest ? { ...base, worst: r.lowest.dscr, fy: r.lowest.fy, meets: r.lowest.dscr >= level - EPS } : base);
      continue;
    }
    if (d.id === 'tolTnw' || d.id === 'debtEquity') {
      // Net worth at or below nil: the ratio has no meaning, and it fails.
      const sunk = ys.find((y) => y.netWorth <= 0);
      if (sunk) { checks.push({ ...base, fy: sunk.fy, meets: false, why: `net worth is at or below nil in ${sunk.fy}` }); continue; }
    }
    if (d.id === 'securityCover' && !r.collateral) { checks.push(base); continue; }
    const w = worstOf(ys, (y) => y[d.id as 'currentRatio' | 'tolTnw' | 'debtEquity' | 'interestCover' | 'facr' | 'securityCover'], at);
    checks.push(w ? { ...base, worst: w.v, fy: w.fy, meets: at === 'least' ? w.v >= level - EPS : w.v <= level + EPS } : base);
  }
  return {
    checks, misses: checks.filter((k) => k.meets === false).map((k) => k.id),
    term: { months: termMonths(x), longest: DATA.term.longestMonths },
  };
}

/** The collateral's market value, to the rupee, whose realisable sale value brings the security cover to its level in
 * every year (0 if none is needed): worked in closed form, then checked by the report itself with that collateral, and a
 * rupee less missing. Undefined when the two disagree by more than a rupee's rounding, so no figure is shown. */
export function collateralNeeded(r: Report, x: ReportInput, c: Case = 'fresh'): number | undefined {
  const level = (RATIOS.find((d) => d.id === 'securityCover') as (typeof RATIOS)[number])[c], rsvPct = DATA.collateral.rsvPct;
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
