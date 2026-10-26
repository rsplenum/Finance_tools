/**
 * The holiday and the repayment, compared (OR5, D-UX-198). The borrower types the holiday before the first instalment and
 * the years to repay after it; the engine never asks how the loan is repaid. It runs the whole report again for each way
 * (engine/report.ts), so every figure keeps its second computation: EMI, equal instalments of principal and stepped
 * (engine/loan.ts, monthly only), each on the same amount, rate, holiday and number of instalments. Each is read on the
 * interest it pays over the loan and its lowest-year DSCR, and the cheapest that misses no benchmark is proposed
 * (OR1's tradeoff 2): the borrower may take another. The loan period is read back in all and checked against the
 * scheme's limits: PMEGP's repayment of 3 to 7 years after the holiday, and the longest an MSME loan runs. Pure, no DOM.
 */
import REPORT from './data/report.json';
import { stepOf, type Frequency, type RepaymentStyle } from './loan';
import { diagnose, LEVELS, termMonths, type Levels, type RatioCheck, type RatioId } from './ratios';
import { projectReport, type Report, type ReportInput } from './report';

export interface Way {
  style: RepaymentStyle; frequency: Frequency;
  /** The term loan's interest over the whole loan, its first and last instalments (interest and principal together). */
  interest: number; first: number; last: number;
  /** The yearly rise of a stepped instalment, as a fraction (0.1 for 10%); 0 for the others. */
  step: number;
  lowest?: { dscr: number; fy: string }; average?: number;
  /** The benchmarks this way misses, and each read (engine/ratios.ts). */
  misses: RatioId[]; checks: RatioCheck[];
  report: Report;
}
export interface Ways {
  /** Every way worked, the cheapest first. */
  ways: Way[];
  /** The way as typed. */
  now: Way;
  /** The cheapest way that misses no benchmark; none when every way misses one. */
  proposed?: Way;
  /** Why no stepped way is shown: quarterly instalments (an EMI and a stepped repayment are worked monthly only), or
   * instalments that fit in a year (a stepped one would be an EMI). */
  noStep?: 'quarterly' | 'short';
}

const EPS = 1e-6;
const isReport = (r: ReturnType<typeof projectReport>): r is Report => !('needs' in r) && !('blocked' in r);

/** `lv`: the benchmarks the user changed (BEN1). Undefined while the report cannot be worked as typed. */
export function compareRepayments(x: ReportInput, lv?: Levels): Ways | undefined {
  const base = projectReport(x);
  if (!isReport(base)) return undefined;
  const frequency = x.loan.frequency ?? 'monthly', n = x.loan.instalments as number;
  const step = frequency === 'monthly' ? stepOf({ ratePct: x.loan.ratePct as number, instalments: n }) : 0;
  // An EMI and a stepped repayment are worked monthly only (engine/dscr.ts): quarterly instalments have one way, equal principal.
  const styles: RepaymentStyle[] = frequency === 'quarterly' ? ['equal-principal'] : ['emi', 'equal-principal', ...(step > 0 ? ['stepped' as const] : [])];
  const wayOf = (style: RepaymentStyle, r: Report, y: ReportInput): Way => {
    const d = diagnose(r, y, 'fresh', lv);
    return { style, frequency, interest: r.loanInterest, first: r.firstInstalment, last: r.lastInstalment, step: style === 'stepped' ? step : 0,
      ...(r.lowest ? { lowest: r.lowest } : {}), ...(r.average !== undefined ? { average: r.average } : {}), misses: d.misses, checks: d.checks, report: r };
  };
  const ways: Way[] = [];
  for (const style of styles) {
    if (style === x.loan.style) { ways.push(wayOf(style, base, x)); continue; }
    const y = { ...x, loan: { ...x.loan, style } }, r = projectReport(y);
    if (isReport(r)) ways.push(wayOf(style, r, y));
  }
  // The way as typed is always among them: a stepped loan typed where no step fits is worked as typed (an EMI).
  if (!ways.some((w) => w.style === x.loan.style)) ways.push(wayOf(x.loan.style as RepaymentStyle, base, x));
  // The cheapest first; on equal interest (a loan at no interest), the higher lowest-year DSCR.
  ways.sort((a, b) => a.interest - b.interest > EPS ? 1 : b.interest - a.interest > EPS ? -1 : (b.lowest?.dscr ?? 0) - (a.lowest?.dscr ?? 0));
  const now = ways.find((w) => w.style === x.loan.style) as Way, proposed = ways.find((w) => !w.misses.length);
  return { ways, now, ...(proposed ? { proposed } : {}), ...(step > 0 ? {} : { noStep: frequency === 'monthly' ? 'short' as const : 'quarterly' as const }) };
}

export interface Limit {
  /** What the limit is on: the repayment after the holiday, or the whole loan with its holiday. */
  on: 'repayment' | 'whole';
  least?: number; most: number;
  /** In months, the figure it is read against, and whether it is within. */
  months: number; within: boolean;
  /** The scheme or rule that sets it. */
  by: 'pmegp' | 'msme';
}
export interface Period {
  /** Months of holiday before the first instalment, of repayment after it, and in all. */
  holiday: number; repayment: number; months: number;
  /** The whole period in years and months, for its read-back. */
  inAll: { years: number; months: number };
  limits: Limit[];
}

export const PMEGP_REPAYMENT = REPORT.schemes.pmegp.repayment;

/** The loan period read back and checked (D-UX-174): undefined while the holiday or the instalments are not typed. The
 * repayment runs from the holiday's end to the last instalment, whole periods of instalments. */
export function periodOf(x: ReportInput): Period | undefined {
  const h = x.loan.moratoriumMonths, n = x.loan.instalments;
  if (!Number.isInteger(h) || !Number.isInteger(n) || (h as number) < 0 || (n as number) < 1) return undefined;
  const months = termMonths(x), repayment = months - (h as number);
  const limits: Limit[] = [];
  if (x.scheme?.id === 'pmegp') {
    const least = PMEGP_REPAYMENT.leastYears * 12, most = PMEGP_REPAYMENT.mostYears * 12;
    limits.push({ on: 'repayment', least, most, months: repayment, within: repayment >= least && repayment <= most, by: 'pmegp' });
  }
  limits.push({ on: 'whole', most: LEVELS.term.longestMonths, months, within: months <= LEVELS.term.longestMonths, by: 'msme' });
  return { holiday: h as number, repayment, months, inAll: { years: Math.floor(months / 12), months: months % 12 }, limits };
}
