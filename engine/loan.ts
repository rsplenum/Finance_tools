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

export function schedule(t: LoanTerms): YearDebt[] {
  const r = t.ratePct / 1200, p = PERIOD_MONTHS[t.frequency];
  const level = t.style === 'emi' ? annuity(t.amount, r, t.instalments) : t.amount / t.instalments;
  const years = new Map<string, YearDebt>();
  let balance = t.amount;
  for (let k = 0; k < termMonths(t); k++) {
    const { year, month } = monthAfter(t.disbursed, k);
    const fy = fyOf(year, month);
    let row = years.get(fy);
    if (!row) years.set(fy, row = { fy, interest: 0, principal: 0, closing: 0 });
    const interest = balance * r;
    row.interest += interest;
    const since = k + 1 - t.moratoriumMonths;
    if (since > 0 && since % p === 0) {
      const n = since / p;
      // The last instalment clears what is left, so rounding in earlier months never leaves a balance.
      const principal = n === t.instalments ? balance : t.style === 'emi' ? level - interest : level;
      balance -= principal;
      row.principal += principal;
    }
    row.closing = balance;
  }
  return [...years.values()];
}
