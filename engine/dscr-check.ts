/**
 * Independent second computation of every DSCR figure (CLAUDE.md). Written apart from loan.ts and dscr.ts on purpose:
 * balances in closed form instead of a running balance, the financial year from Date arithmetic, cash available from
 * profit before interest, depreciation and tax, and the DSCR options as explicit formulas instead of the data file's lists.
 * dscr.ts shows no figure unless both computations agree.
 */
import TAX from './data/tax.json';
import type { LoanTerms, YearDebt } from './loan';
import type { Definition, ProjectionYear, YearFigures } from './dscr';
import type { Borrower } from './tax';

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

/**
 * From projections and loan terms (planning mode): cash available = PBDIT and the new asset's income − tax − interest not
 * added back (+ leases); existing EMIs are debt service in full, and a year paying them has instalments.
 */
export function planCheck(proj: ProjectionYear[], loan: LoanTerms, def: Definition): CheckResult {
  const debt = new Map(scheduleCheck(loan).map((d) => [d.fy, d]));
  return summarise(proj.map((y) => {
    const p = y as Required<ProjectionYear>, d = debt.get(y.fy);
    const tl = (d?.interest ?? 0) + p.otherLoansInterest, principal = (d?.principal ?? 0) + p.otherLoansPrincipal;
    const earned = p.pbdit + p.assetIncome;
    const profitBeforeTax = earned - p.depreciation - p.nonCash - tl - p.interestOther;
    const schedule = TAX.borrowers.find((b) => b.id === y.taxBy) as Borrower | undefined;
    const tax = y.taxBy === undefined ? Math.max(0, profitBeforeTax) * p.taxPct / 100 : schedule ? taxCheck(profitBeforeTax, schedule) : NaN;
    const lease = def.leases === 'yes' ? y.leaseRentals ?? 0 : 0;
    const available = earned - tax
      - (def.interest === 'all-borrowings' ? 0 : p.interestOther)
      - (def.interest === 'none' ? tl : 0)
      + lease;
    const interest = def.interest === 'none' ? 0 : def.interest === 'term-loans' ? tl : tl + p.interestOther;
    return { ...row(y.fy, available, principal + interest + lease + p.existingEmis, principal + p.existingEmis, def), pbt: profitBeforeTax, tax };
  }), def);
}

/**
 * The tax a second way: the slab rates as the sum of each slab's share of the income; the rebate, then the marginal
 * relief on the surcharge, taken off as amounts; the surcharge rate as that of the last threshold passed.
 */
export function taxCheck(income: number, b: Borrower): number {
  if (income <= 0) return 0;
  const slab = (x: number) => b.slabs.reduce((t, [from, pct], k) => {
    const to = k + 1 < b.slabs.length ? b.slabs[k + 1][0] : Infinity;
    return t + (Math.max(0, Math.min(x, to) - from) * pct) / 100;
  }, 0);
  const rebate = (x: number, t: number) => (!b.rebate ? 0
    : x <= b.rebate.incomeUpTo ? Math.min(t, b.rebate.max) : Math.max(0, t - (x - b.rebate.incomeUpTo)));
  const incomeTax = (x: number) => slab(x) - rebate(x, slab(x));
  const rateAt = (x: number) => b.surcharge.filter(([from]) => x > from).reduce((_, [, pct]) => pct, 0);
  let due = incomeTax(income) * (1 + rateAt(income) / 100);
  const passed = b.surcharge.filter(([from]) => income > from).pop();
  if (passed) {
    const [from] = passed, limit = incomeTax(from) * (1 + rateAt(from) / 100) + (income - from);
    due -= Math.max(0, due - limit);
  }
  return due * (1 + b.cess / 100);
}

/** Month number of 'YYYY-MM' counted from year 0, by Date arithmetic. */
const monthNo = (ym: string) => {
  const d = new Date(`${ym}-01T00:00:00Z`);
  return d.getUTCFullYear() * 12 + d.getUTCMonth();
};
/** Months of financial year `fy` from its April to 'YYYY-MM', both counted, within 0 to 12. */
const monthsTo = (fy: string, ym: string) => Math.min(12, Math.max(0, monthNo(ym) - monthNo(`${fy.slice(0, 4)}-04`) + 1));

/** Existing EMIs by year in closed form: each EMI × the months of the year up to its last EMI (all 12 when it runs on). */
export function emisCheck(loans: { emi: number; last?: string }[], years: string[]): number[] {
  return years.map((fy) => loans.reduce((t, l) => t + l.emi * (l.last === undefined ? 12 : monthsTo(fy, l.last)), 0));
}

/** A yearly figure from the month it starts, in closed form: × the months of each year from that month on, ÷ 12. */
export function fromMonthCheck(yearly: number, start: string, years: string[]): number[] {
  return years.map((fy) => (yearly * (12 - monthsTo(fy, monthOfBefore(start)))) / 12);
}
/** The month before 'YYYY-MM', by Date arithmetic. */
const monthOfBefore = (ym: string) => {
  const d = new Date(`${ym}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - 1);
  return d.toISOString().slice(0, 7);
};

/** A yearly series in closed form: first × (1 ± rate)^k, the rate read the other way round from project.ts. */
export function seriesCheck(kind: 'same' | 'grow' | 'fall', first: number, pct: number, count: number): number[] {
  const factor = kind === 'same' ? 1 : kind === 'grow' ? (100 + pct) / 100 : (100 - pct) / 100;
  return Array.from({ length: count }, (_, k) => first * factor ** k);
}
