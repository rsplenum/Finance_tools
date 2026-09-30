/**
 * Term-loan schedule totalled by Indian financial year (April–March). Pure — no DOM. Conventions: engine/data/dscr.json
 * ("planning"). Checked by an independent computation in dscr-check.ts.
 */

export type Frequency = 'monthly' | 'quarterly';
export type RepaymentStyle = 'equal-principal' | 'emi';

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

/** Months from drawing the loan to the last instalment. */
export const termMonths = (t: Pick<LoanTerms, 'moratoriumMonths' | 'instalments' | 'frequency'>) =>
  t.moratoriumMonths + t.instalments * PERIOD_MONTHS[t.frequency];

/** The level instalment: the EMI, or the principal of each equal instalment. */
export const levelInstalment = (t: LoanTerms) =>
  t.style === 'emi' ? annuity(t.amount, t.ratePct / 1200, t.instalments) : t.amount / t.instalments;

/** The loan month by month, from the month it is drawn to the last instalment. */
export function months(t: LoanTerms): MonthRow[] {
  const r = t.ratePct / 1200, p = PERIOD_MONTHS[t.frequency], level = levelInstalment(t);
  const rows: MonthRow[] = [];
  let balance = t.amount;
  for (let k = 0; k < termMonths(t); k++) {
    const { year, month } = monthAfter(t.disbursed, k);
    const opening = balance, interest = balance * r, since = k + 1 - t.moratoriumMonths;
    let principal = 0, instalment: number | undefined;
    if (since > 0 && since % p === 0) {
      instalment = since / p;
      // The last instalment clears what is left, so rounding in earlier months never leaves a balance.
      principal = instalment === t.instalments ? balance : t.style === 'emi' ? level - interest : level;
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
