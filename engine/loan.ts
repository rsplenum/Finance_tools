/**
 * Term-loan schedule totalled by Indian financial year (April–March). Pure — no DOM. Conventions: engine/data/dscr.json
 * ("planning", and "stepped" for the step). Checked by an independent computation in dscr-check.ts.
 */
import DATA from './data/dscr.json';

export type Frequency = 'monthly' | 'quarterly';
/** Equal instalments of principal, an EMI, or stepped: an instalment that rises by a step each year (OR5). */
export type RepaymentStyle = 'equal-principal' | 'emi' | 'stepped';

export interface LoanTerms {
  amount: number;
  ratePct: number;
  /** Month the loan is drawn, 'YYYY-MM'. */
  disbursed: string;
  moratoriumMonths: number;
  instalments: number;
  frequency: Frequency;
  style: RepaymentStyle;
}

/** One financial year of the schedule: interest and principal paid in it, balance at its end. */
export interface YearDebt { fy: string; interest: number; principal: number; closing: number }

/** One month of the loan ('YYYY-MM'): balance at its start, interest charged and paid, principal repaid, all paid, balance at its end. */
export interface MonthRow { month: string; fy: string; opening: number; interest: number; principal: number; paid: number; closing: number; instalment?: number }

export const PERIOD_MONTHS: Record<Frequency, number> = { monthly: 1, quarterly: 3 };

/** Financial year of a calendar month: 2026-04 → '2026-27', 2026-03 → '2025-26'. */
export function fyOf(year: number, month: number): string {
  const start = month >= 4 ? year : year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

/** Calendar month `k` months after 'YYYY-MM'. */
export function monthAfter(ym: string, k: number): { year: number; month: number } {
  const [y, m] = ym.split('-').map(Number);
  const t = y * 12 + (m - 1) + k;
  return { year: Math.floor(t / 12), month: (t % 12) + 1 };
}

/** Level instalment repaying `principal` in `n` periods at rate `r` a period (Excel's PMT, not rounded). */
export function annuity(principal: number, r: number, n: number): number {
  if (r === 0) return principal / n;
  const f = Math.pow(1 + r, n);
  return (principal * r * f) / (f - 1);
}

/** A stepped loan's instalments to a year: the step falls at the 13th, the 25th and so on. */
export const STEP_EVERY = 12;
export const STEPPED = DATA.stepped;

/** Per rupee of the loan, the instalments' present value at a first instalment of 1, each year's `rise` times the
 * year before's: a running sum (the check has the closed form). An EMI's is the annuity factor, at `rise` 1. */
function stepFactor(n: number, r: number, rise: number): number {
  let f = 0, v = 1, at = 1;
  for (let k = 1; k <= n; k++) {
    v /= 1 + r;
    if (k > 1 && (k - 1) % STEP_EVERY === 0) at *= rise;
    f += at * v;
  }
  return f;
}

/** A stepped loan's step, as a fraction a year: the data's, lowered so the last year's instalment is at most
 * `lastToFirstMost` times the first year's and the first instalment at least its month's interest, then rounded down
 * to a tenth of a percent (engine/data/dscr.json). 0 when the instalments fit in one year: it is an EMI. */
export function stepOf(t: Pick<LoanTerms, 'ratePct' | 'instalments'>): number {
  const years = Math.ceil(t.instalments / STEP_EVERY);
  if (years < 2) return 0;
  const r = t.ratePct / 1200;
  // The first instalment is 1 ÷ the factor a rupee, and falls as the step rises; it covers the month's interest r while
  // the factor is at most 1 ÷ r. At no interest the balance cannot grow.
  const covers = (g: number) => r === 0 || stepFactor(t.instalments, r, 1 + g) * r <= 1;
  let hi = Math.min(STEPPED.stepPct / 100, Math.pow(STEPPED.lastToFirstMost, 1 / (years - 1)) - 1);
  if (!covers(hi)) {
    let lo = 0;
    for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (covers(m)) lo = m; else hi = m; }
    hi = lo;
  }
  const g = Math.floor(hi * 1000 + 1e-9) / 1000;
  return covers(g) ? g : g - 0.001;
}

/** Months from drawing the loan to the last instalment. */
export const termMonths = (t: Pick<LoanTerms, 'moratoriumMonths' | 'instalments' | 'frequency'>) =>
  t.moratoriumMonths + t.instalments * PERIOD_MONTHS[t.frequency];

/** The level instalment: the EMI, the principal of each equal instalment, or a stepped loan's first instalment. */
export const levelInstalment = (t: LoanTerms) =>
  t.style === 'emi' ? annuity(t.amount, t.ratePct / 1200, t.instalments)
    : t.style === 'stepped' ? t.amount / stepFactor(t.instalments, t.ratePct / 1200, 1 + stepOf(t)) : t.amount / t.instalments;

/** Instalment `k` (from 1) of an EMI or a stepped loan, interest and principal together. */
const instalmentAt = (t: LoanTerms, level: number, step: number, k: number) =>
  t.style === 'stepped' ? level * Math.pow(1 + step, Math.floor((k - 1) / STEP_EVERY)) : level;

/** The loan month by month, from the month it is drawn to the last instalment. */
export function months(t: LoanTerms): MonthRow[] {
  const r = t.ratePct / 1200, p = PERIOD_MONTHS[t.frequency], level = levelInstalment(t), step = t.style === 'stepped' ? stepOf(t) : 0;
  const rows: MonthRow[] = [];
  let balance = t.amount;
  for (let k = 0; k < termMonths(t); k++) {
    const { year, month } = monthAfter(t.disbursed, k);
    const opening = balance, interest = balance * r, since = k + 1 - t.moratoriumMonths;
    let principal = 0, instalment: number | undefined;
    if (since > 0 && since % p === 0) {
      instalment = since / p;
      // The last instalment clears what is left, so rounding in earlier months never leaves a balance.
      principal = instalment === t.instalments ? balance : t.style === 'equal-principal' ? level : instalmentAt(t, level, step, instalment) - interest;
      balance -= principal;
    }
    rows.push({ month: `${year}-${String(month).padStart(2, '0')}`, fy: fyOf(year, month), opening, interest, principal, paid: interest + principal, closing: balance, ...(instalment ? { instalment } : {}) });
  }
  return rows;
}

/** The schedule totalled by financial year. */
export function schedule(t: LoanTerms): YearDebt[] {
  const years = new Map<string, YearDebt>();
  for (const m of months(t)) {
    let row = years.get(m.fy);
    if (!row) years.set(m.fy, row = { fy: m.fy, interest: 0, principal: 0, closing: 0 });
    row.interest += m.interest;
    row.principal += m.principal;
    row.closing = m.closing;
  }
  return [...years.values()];
}
