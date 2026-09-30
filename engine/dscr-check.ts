/**
 * Independent second computation of every DSCR figure (CLAUDE.md). Written apart from loan.ts and dscr.ts on purpose:
 * balances in closed form instead of a running balance, the financial year from Date arithmetic, cash available from
 * profit before interest, depreciation and tax, and the DSCR options as explicit formulas instead of the data file's lists.
 * dscr.ts shows no figure unless both computations agree.
 */
import type { LoanTerms, YearDebt } from './loan';
import type { Definition, ProjectionYear, YearFigures } from './dscr';

export interface CheckRow { fy: string; available: number; service: number; counted: boolean; dscr?: number; pbt?: number; tax?: number }
export interface CheckResult { rows: CheckRow[]; average?: number; minimum?: { dscr: number; fy: string } }

function fyLabel(ym: string, k: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + k, 1));
  const start = d.getUTCMonth() < 3 ? d.getUTCFullYear() - 1 : d.getUTCFullYear();
  return `${start}-${String(start + 1).slice(-2)}`;
}

/** The loan in closed form: the EMI, instalments paid before month k starts, and the balance after j instalments. */
function closedForm(t: LoanTerms) {
  const r = t.ratePct / 1200, p = t.frequency === 'quarterly' ? 3 : 1, n = t.instalments, m = t.moratoriumMonths;
  const emi = t.style !== 'emi' ? 0 : r === 0 ? t.amount / n : (t.amount * r) / (1 - Math.pow(1 + r, -n));
  const paidBefore = (k: number) => Math.min(n, Math.max(0, Math.floor((k - m) / p)));
  const balance = (j: number): number => {
    if (j >= n) return 0;
    if (t.style === 'equal-principal') return (t.amount * (n - j)) / n;
    if (r === 0) return t.amount - emi * j;
    const g = Math.pow(1 + r, j);
    return t.amount * g - (emi * (g - 1)) / r;
  };
  return { r, n, months: m + n * p, emi, paidBefore, balance };
}

/** The level instalment in closed form: the EMI, or the loan ÷ the number of instalments. */
export const levelCheck = (t: LoanTerms) => (t.style === 'emi' ? closedForm(t).emi : t.amount / t.instalments);

export interface MonthCheck { month: string; opening: number; interest: number; principal: number; paid: number; closing: number }

/** Every month from the closed-form balances, the month named by Date arithmetic. */
export function monthsCheck(t: LoanTerms): MonthCheck[] {
  const { r, months, paidBefore, balance } = closedForm(t), [y, m] = t.disbursed.split('-').map(Number);
  return Array.from({ length: months }, (_, k) => {
    const opening = balance(paidBefore(k)), closing = balance(paidBefore(k + 1));
    // Paid in the month: the fall in the balance plus the month's interest.
    return { month: new Date(Date.UTC(y, m - 1 + k, 1)).toISOString().slice(0, 7), opening, interest: r * opening, principal: opening - closing, paid: opening - closing + r * opening, closing };
  });
}

export function scheduleCheck(t: LoanTerms): YearDebt[] {
  const { r, months, paidBefore, balance } = closedForm(t);
  const out: YearDebt[] = [];
  let opening = t.amount;
  for (let k = 0; k < months; k++) {
    const fy = fyLabel(t.disbursed, k);
    let row = out[out.length - 1];
    if (!row || row.fy !== fy) {
      opening = balance(paidBefore(k));
      out.push(row = { fy, interest: 0, principal: 0, closing: opening });
    }
    row.interest += r * balance(paidBefore(k));
    row.closing = balance(paidBefore(k + 1));
    row.principal = opening - row.closing;
  }
  return out;
}

function summarise(rows: CheckRow[], def: Definition): CheckResult {
  const used = rows.filter((x) => x.counted);
  if (!used.length) return { rows };
  let average: number;
  if (def.average === 'totals') {
    let a = 0, s = 0;
    for (const x of used) { a += x.available; s += x.service; }
    average = a / s;
  } else average = used.reduce((s, x) => s + (x.dscr as number), 0) / used.length;
  let minimum = { dscr: used[0].dscr as number, fy: used[0].fy };
  for (const x of used) if ((x.dscr as number) < minimum.dscr) minimum = { dscr: x.dscr as number, fy: x.fy };
  return { rows, average, minimum };
}

const row = (fy: string, available: number, service: number, principal: number, def: Definition): CheckRow => ({
  fy, available, service,
  counted: def.years === 'repayment' ? principal > 0 : service > 0,
  dscr: service > 0 ? available / service : undefined,
});

/** From the year's own figures (statement mode). */
export function statementCheck(years: YearFigures[], def: Definition): CheckResult {
  return summarise(years.map((y) => {
    const tl = y.interestTL ?? 0, other = y.interestOther ?? 0, principal = y.principalTL ?? 0;
    const interest = def.interest === 'none' ? 0 : def.interest === 'term-loans' ? tl : tl + other;
    const lease = def.leases === 'yes' ? y.leaseRentals ?? 0 : 0;
    const available = (y.pat ?? 0) + (y.depreciation ?? 0) + (y.nonCash ?? 0) + interest + lease;
    return row(y.fy, available, principal + interest + lease, principal, def);
  }), def);
}

/** From projections and loan terms (planning mode): cash available = PBDIT − tax − interest not added back (+ leases). */
export function planCheck(proj: ProjectionYear[], loan: LoanTerms, def: Definition): CheckResult {
  const debt = new Map(scheduleCheck(loan).map((d) => [d.fy, d]));
  return summarise(proj.map((y) => {
    const p = y as Required<ProjectionYear>, d = debt.get(y.fy);
    const tl = (d?.interest ?? 0) + p.otherLoansInterest, principal = (d?.principal ?? 0) + p.otherLoansPrincipal;
    const profitBeforeTax = p.pbdit - p.depreciation - p.nonCash - tl - p.interestOther;
    const tax = Math.max(0, profitBeforeTax) * p.taxPct / 100;
    const lease = def.leases === 'yes' ? y.leaseRentals ?? 0 : 0;
    const available = p.pbdit - tax
      - (def.interest === 'all-borrowings' ? 0 : p.interestOther)
      - (def.interest === 'none' ? tl : 0)
      + lease;
    const interest = def.interest === 'none' ? 0 : def.interest === 'term-loans' ? tl : tl + p.interestOther;
    return { ...row(y.fy, available, principal + interest + lease, principal, def), pbt: profitBeforeTax, tax };
  }), def);
}

/** A yearly series in closed form: first × (1 ± rate)^k, the rate read the other way round from project.ts. */
export function seriesCheck(kind: 'same' | 'grow' | 'fall', first: number, pct: number, count: number): number[] {
  const factor = kind === 'same' ? 1 : kind === 'grow' ? (100 + pct) / 100 : (100 - pct) / 100;
  return Array.from({ length: count }, (_, k) => first * factor ** k);
}
