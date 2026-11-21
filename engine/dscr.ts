/**
 * DSCR: the statement year by year with its average and lowest year, and the loan amount or repayment period that
 * meets a target. Pure — no DOM. The method is data (engine/data/dscr.json, explained in docs/RULES.md). dscr-check.ts
 * recomputes every figure independently and nothing is returned unless both agree. A missing fact is never assumed:
 * the result lists what is needed instead of figures.
 */
import DATA from './data/dscr.json';
import {
  PERIOD_MONTHS, balanceAt, fyOf, levelInstalment, monthAfter, months, monthsFrom, runningLoanTerms, schedule, termMonths,
  type LoanTerms, type MonthRow, type RunningTerms, type YearDebt,
} from './loan';
import { levelCheck, monthsCheck, planCheck, runningCheck, scheduleCheck, statementCheck, type CheckResult } from './dscr-check';
import { borrowerOf, taxOn } from './tax';

type Data = typeof DATA;
type Options = Data['options'];
export type Component = keyof Data['components'];
/** One choice for each option in the data file. */
export type Definition = { [K in keyof Options]: keyof Options[K]['choices'] };
/** A year of figures as they appear in the borrower's projections (statement mode). */
export type YearFigures = { fy: string } & { [C in Component]?: number };

/** A projected year when the engine works out the loan's interest and the tax (planning mode). */
export interface ProjectionYear {
  fy: string;
  pbdit?: number;
  /** Extra profit before interest, depreciation and tax from the new asset, in the months of the year it runs. */
  assetIncome?: number;
  depreciation?: number;
  nonCash?: number;
  interestOther?: number;
  leaseRentals?: number;
  otherLoansInterest?: number;
  otherLoansPrincipal?: number;
  /** The part of this year's interest on the new loan that is paid from the project's cost: the months before the first
   * sales (the project report). It is left out of the year's profit and of its debt service. */
  interestFromCost?: number;
  /** Of `interestFromCost`, the part added to the loan in the holiday (D-POL-13): the rest of the year's added interest
   * is a cost of the year that is not paid, a non-cash charge. */
  addedFromCost?: number;
  /** EMIs paid in the year on loans already running, interest and principal together. */
  existingEmis?: number;
  /** A tax rate, or instead who the borrower is (`taxBy`, an id in engine/data/tax.json), which sets the tax. */
  taxPct?: number;
  taxBy?: string;
}
export type LoanInput = { [K in keyof LoanTerms]?: LoanTerms[K] };
export interface Target { average?: number; minimum?: number }

export interface Row { fy: string; available: number; service: number; counted: boolean; dscr?: number }
/** The Total column: cash available (A), debt service (B) and each figure, added up over the years counted. */
export interface Totals { available: number; service: number; figures: { [C in Component]?: number } }
/** `total` when any year counts; with the average by totals, the average is total A ÷ total B. */
export interface Statement { rows: Row[]; average?: number; minimum?: { dscr: number; fy: string }; notes: string[]; total?: Totals }
/** How profit after tax is reached in a projected year (planning mode). */
/** `interestTL` is the interest charged on every term loan in the year: `interestNew` on the new term loans, `interestRunning`
 * on the loans already running whose interest is known (by their terms, or a CA's yearly figure). */
export interface ProfitYear { fy: string; pbdit: number; assetIncome: number; depreciation: number; nonCash: number; interestTL: number; interestNew: number; interestRunning: number; interestOther: number; pbt: number; tax: number; pat: number }
export type ProfitTotals = Omit<ProfitYear, 'fy'>;
/** A year before the figures start (operations start later): no instalment falls in it, and its interest is paid from the project cost. */
export interface BeforeStart { fy: string; interest: number }
/** A year's term-loan debt service taken apart (DSCR row A, point 2): the interest paid and principal repaid on the new term
 * loans and on the loans already running whose interest is known. Each pair adds up to the year's `interestTL` and
 * `principalTL`; the EMIs of loans whose interest is not known stay whole, as `existingEmis`. */
export interface DebtSplit { fy: string; interestNew: number; interestRunning: number; principalNew: number; principalRunning: number }
/** `profitTotal`: each line of the profit added up over the years counted, beside the statement's `total`. `schedule` is
 * the new loan's own (the one the solvers move); `split` takes each year's term-loan debt service apart. */
export interface Plan { schedule: YearDebt[]; years: YearFigures[]; profit: ProfitYear[]; statement: Statement; beforeStart: BeforeStart[]; split: DebtSplit[]; profitTotal?: ProfitTotals; splitTotal?: Omit<DebtSplit, 'fy'> }
/** The repayment schedule month by month, its totals by financial year, the level instalment (EMI or principal), and the interest over the whole loan. */
export interface Amortization { months: MonthRow[]; years: YearDebt[]; level: number; totalInterest: number }
/** What stops a larger loan or a shorter repayment: the average, the lowest year, or a year with no cash to pay from. */
export type Limit = { kind: 'average' } | { kind: 'minimum'; fy: string } | { kind: 'cash'; fy: string };
export interface AmountAnswer { amount: number; limitedBy: Limit; plan: Plan }
export interface TenureAnswer { instalments: number; plan: Plan }

/** Facts to enter or correct; no figures until they are. */
export interface Needs { needs: string[] }
/** The two computations disagree; no figures. */
export interface Blocked { blocked: string }
/** No amount or repayment period meets the target, and why. */
export interface NoAnswer { none: string }

export const PRESETS = DATA.presets;
export const BENCHMARKS = DATA.benchmarks;
/** The four choices and the names of the figures, in plain words, for screens. */
export const OPTIONS = DATA.options;
export const COMPONENTS = DATA.components;

export const PROJECTION_LABELS: Record<Exclude<keyof ProjectionYear, 'fy' | 'taxBy' | 'interestFromCost' | 'addedFromCost'>, string> = {
  pbdit: 'Profit before interest, depreciation and tax',
  assetIncome: 'Extra income from the new asset',
  depreciation: 'Depreciation',
  nonCash: 'Other non-cash charges',
  interestOther: 'Interest on other borrowings (working capital)',
  leaseRentals: 'Lease rentals',
  otherLoansInterest: 'Interest on other term loans',
  otherLoansPrincipal: 'Instalments of other term loans',
  existingEmis: DATA.components.existingEmis,
  taxPct: 'Tax rate (%)',
};
/** Debt service that planning adds to the method's: existing EMIs, in full under every method (docs/RULES.md). */
export const PLAN_SERVICE: Component[] = ['existingEmis'];
export const HOLIDAY_INTEREST_LABEL = 'Interest in the holiday (paid each month, or added to the loan)';
/** The loan's facts that must be typed; the holiday's interest is optional (absent: paid, the stated assumption). */
export const LOAN_LABELS: Record<Exclude<keyof LoanTerms, 'holidayInterest' | 'alongside'>, string> = {
  amount: 'Loan amount',
  ratePct: 'Interest rate (% a year)',
  disbursed: 'Month the loan is drawn (like 2026-04)',
  moratoriumMonths: 'Holiday before the first instalment, in months (0 if none)',
  instalments: 'Number of instalments',
  frequency: 'How often instalments fall due (monthly or quarterly)',
  style: 'Instalment type (equal instalments of principal, EMI, or stepped)',
};

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
/** '2026-27': the second year is the first plus one. */
export const isFy = (s: string) => {
  const m = /^(\d{4})-(\d{2})$/.exec(s);
  return !!m && (Number(m[1]) + 1) % 100 === Number(m[2]);
};

/** `count` financial years from `first`: 2026-27, 2027-28, … Empty unless `first` is written like 2026-27. */
export const fyRange = (first: string, count: number): string[] =>
  isFy(first) ? Array.from({ length: Math.max(0, count) }, (_, i) => fyOf(Number(first.slice(0, 4)) + i, 4)) : [];

/** Components a definition adds up: the base ones plus whatever the chosen options add, read from the data file. */
export function componentsOf(def: Definition, data: Data = DATA): { available: Component[]; service: Component[] } {
  const adds: Component[] = [];
  for (const k of Object.keys(data.options) as (keyof Options)[]) {
    const choices = data.options[k].choices as Record<string, { adds: string[] }>;
    adds.push(...((choices[def[k] as string]?.adds ?? []) as Component[]));
  }
  return { available: [...(data.base.available as Component[]), ...adds], service: [...(data.base.service as Component[]), ...adds] };
}

// ---- Facts needed ----

function definitionNeeds(def: Definition, data: Data = DATA): string[] {
  return (Object.keys(data.options) as (keyof Options)[])
    .filter((k) => !(String(def?.[k]) in data.options[k].choices))
    .map((k) => `Choose: ${data.options[k].question}`);
}

function yearsNeeds(fys: string[]): string[] {
  const needs: string[] = [], seen = new Set<string>();
  if (!fys.length) needs.push('At least one year of figures');
  for (const fy of fys) {
    if (!isFy(fy)) needs.push(`A financial year written like 2026-27, in place of "${fy}"`);
    else if (seen.has(fy)) needs.push(`Each year once: ${fy} is entered twice`);
    seen.add(fy);
  }
  return needs;
}

function statementNeeds(years: YearFigures[], def: Definition, data: Data): string[] {
  const { available, service } = componentsOf(def, data);
  const needs = yearsNeeds(years.map((y) => y.fy));
  for (const y of years) for (const c of new Set([...available, ...service])) {
    const v = y[c], name = `${data.components[c]} for ${y.fy}`;
    if (!isNum(v)) needs.push(name);
    else if (v < 0 && c !== 'pat') needs.push(`${name}, as zero or more`);
  }
  return needs;
}

function projectionNeeds(proj: ProjectionYear[], def: Definition): string[] {
  const needs = yearsNeeds(proj.map((p) => p.fy));
  for (const p of proj) for (const k of Object.keys(PROJECTION_LABELS) as (keyof typeof PROJECTION_LABELS)[]) {
    if (k === 'leaseRentals' && def.leases !== 'yes') continue;
    // Who the borrower is sets the tax in place of a rate.
    if (k === 'taxPct' && p.taxBy !== undefined) {
      if (!borrowerOf(p.taxBy)) needs.push(`Who the borrower is, for the tax in ${p.fy}`);
      continue;
    }
    const v = p[k], name = `${PROJECTION_LABELS[k]} for ${p.fy}`;
    if (!isNum(v)) needs.push(name);
    else if (k !== 'pbdit' && v < 0) needs.push(`${name}, as zero or more`);
    else if (k === 'taxPct' && v > 100) needs.push(`${name}, as 100 or less`);
  }
  return needs;
}

function loanNeeds(l: LoanInput): string[] {
  const needs: string[] = [], L = LOAN_LABELS;
  if (!isNum(l.amount)) needs.push(L.amount); else if (l.amount <= 0) needs.push(`${L.amount}, above zero`);
  if (!isNum(l.ratePct)) needs.push(L.ratePct); else if (l.ratePct < 0) needs.push(`${L.ratePct}, zero or more`);
  if (typeof l.disbursed !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(l.disbursed)) needs.push(L.disbursed);
  if (!isNum(l.moratoriumMonths)) needs.push(L.moratoriumMonths);
  else if (!Number.isInteger(l.moratoriumMonths) || l.moratoriumMonths < 0) needs.push(`${L.moratoriumMonths}, in whole months`);
  if (!isNum(l.instalments)) needs.push(L.instalments);
  else if (!Number.isInteger(l.instalments) || l.instalments < 1) needs.push(`${L.instalments}, a whole number, one or more`);
  if (l.frequency !== 'monthly' && l.frequency !== 'quarterly') needs.push(L.frequency);
  if (l.style !== 'equal-principal' && l.style !== 'emi' && l.style !== 'stepped') needs.push(L.style);
  else if (l.style === 'emi' && l.frequency === 'quarterly') needs.push('Monthly instalments for an EMI (it is worked monthly only), or equal instalments of principal');
  else if (l.style === 'stepped' && l.frequency === 'quarterly') needs.push('Monthly instalments for a stepped repayment (it is worked monthly only), or equal instalments of principal');
  if (l.holidayInterest !== undefined && l.holidayInterest !== 'paid' && l.holidayInterest !== 'added') needs.push(HOLIDAY_INTEREST_LABEL);
  (l.alongside?.loans ?? []).forEach((o, i) => needs.push(...loanNeeds({ ...o, alongside: undefined }).map((n) => `New term loan ${i + 2}: ${lowerFirst(n)}`)));
  (l.alongside?.running ?? []).forEach((r, i) => needs.push(...runningNeeds(r).map((n) => `Loan already running ${i + 1}: ${lowerFirst(n)}`)));
  return needs;
}
const lowerFirst = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

/** What a loan already running needs, given by its terms (DSCR row A, point 3). */
export const RUNNING_LABELS = {
  amount: 'The amount when taken, or the balance today',
  ratePct: 'Interest rate (% a year)',
  start: 'Month it was first drawn (like 2024-04)',
  tenureMonths: 'Whole tenure in months, the holiday inside it',
  holidayMonths: 'Holiday before its first instalment, in months (0 if none)',
  style: 'How it is repaid (EMI, or equal principal every month or quarter)',
};
const isMonth = (t: unknown): t is string => typeof t === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(t);

export function runningNeeds(r: Partial<RunningTerms>): string[] {
  const needs: string[] = [], L = RUNNING_LABELS, hasA = isNum(r.amount), hasB = isNum(r.balance);
  if (!hasA && !hasB) needs.push(L.amount);
  else if (hasA && hasB) needs.push('The amount when taken or the balance today, not both');
  else if (hasA && (r.amount as number) <= 0) needs.push('The amount when taken, above zero');
  else if (hasB && (r.balance as number) <= 0) needs.push('The balance today, above zero: a loan repaid is no longer running');
  if (!isNum(r.ratePct)) needs.push(L.ratePct); else if (r.ratePct < 0) needs.push(`${L.ratePct}, zero or more`);
  if (!isMonth(r.start)) needs.push(L.start);
  const whole = (v: unknown, least: number): v is number => isNum(v) && Number.isInteger(v) && v >= least;
  if (!isNum(r.holidayMonths)) needs.push(L.holidayMonths); else if (!whole(r.holidayMonths, 0)) needs.push(`${L.holidayMonths}, in whole months`);
  if (!isNum(r.tenureMonths)) needs.push(L.tenureMonths); else if (!whole(r.tenureMonths, 1)) needs.push(`${L.tenureMonths}, in whole months`);
  const okFreq = r.frequency === 'monthly' || r.frequency === 'quarterly', okStyle = r.style === 'emi' || r.style === 'equal-principal';
  if (!okFreq || !okStyle || (r.style === 'emi' && r.frequency === 'quarterly')) needs.push(L.style);
  if (r.holidayInterest !== undefined && r.holidayInterest !== 'paid' && r.holidayInterest !== 'added') needs.push(HOLIDAY_INTEREST_LABEL);
  if (needs.length) return needs;
  const per = PERIOD_MONTHS[r.frequency as 'monthly' | 'quarterly'], after = (r.tenureMonths as number) - (r.holidayMonths as number);
  if (after < per || after % per) return [`${L.tenureMonths}: the months after the holiday must make whole ${per === 3 ? 'quarters' : 'months'}, one or more`];
  if (!hasB) return [];
  // A balance today: the loan must have been drawn by this month and not yet repaid on its own schedule.
  if (!isMonth(r.asOf)) return ['This month, for the balance today'];
  const k = monthsFrom(r.start as string, r.asOf);
  if (k < 0) return [`${L.start}: before this month, for a balance today`];
  const t = runningLoanTerms({ ...(r as RunningTerms), balance: undefined, amount: 1 });
  return balanceAt(t, k) > 0 ? [] : [`${L.tenureMonths}: on these terms it would be repaid by now`];
}

export function targetNeeds(t: Target): string[] {
  if (t.average === undefined && t.minimum === undefined) return ['A target DSCR for the average, the lowest year, or both'];
  const needs: string[] = [];
  for (const [k, name] of [['average', 'Target for the average'], ['minimum', 'Target for the lowest year']] as const) {
    const v = t[k];
    if (v === undefined) continue;
    if (!isNum(v)) needs.push(name);
    else if (v < 1) needs.push(`${name}, 1.00 or more: below 1 the earnings would not cover the debt service`);
  }
  return needs;
}

function coverageNeeds(debt: YearDebt[], proj: ProjectionYear[]): string[] {
  const have = new Set(proj.map((p) => p.fy));
  return debt.filter((d) => (d.interest > 0 || d.principal > 0) && !have.has(d.fy))
    .map((d) => `Projections for ${d.fy}: the loan is still running then`);
}

// ---- The two computations must agree ----

const money = (a: number, b: number) => Math.abs(a - b) <= Math.max(0.01, 1e-9 * Math.max(Math.abs(a), Math.abs(b)));
const ratio = (a?: number, b?: number) =>
  a === undefined || b === undefined ? a === b : Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
const blocked = (where: string): Blocked => ({ blocked: `The two computations disagree on ${where}, so no figures are shown. Please report this.` });

function disagreement(s: Statement, c: CheckResult): string {
  if (s.rows.length !== c.rows.length) return 'the number of years';
  for (let i = 0; i < s.rows.length; i++) {
    const a = s.rows[i], b = c.rows[i];
    if (a.fy !== b.fy || a.counted !== b.counted || !money(a.available, b.available) || !money(a.service, b.service) || !ratio(a.dscr, b.dscr)) return a.fy;
  }
  if (!ratio(s.average, c.average)) return 'the average';
  if (!s.total !== !c.total || (s.total && c.total && (!money(s.total.available, c.total.available) || !money(s.total.service, c.total.service)))) return 'the totals';
  // Either computation may pick a different year when two years tie; the lowest value must agree either way.
  if (!ratio(s.minimum?.dscr, c.minimum?.dscr) || (s.minimum && !ratio(c.rows.find((r) => r.fy === s.minimum?.fy)?.dscr, c.minimum?.dscr))) return 'the lowest year';
  return '';
}

// ---- Statement ----

/** `extra`: debt service paid in full beside the method's own, like existing EMIs; a year paying it has instalments. */
function computeStatement(years: YearFigures[], def: Definition, data: Data, extra: Component[] = []): Statement {
  const { available, service } = componentsOf(def, data);
  const add = (y: YearFigures, cs: Component[]) => cs.reduce((s, c) => s + (y[c] as number), 0);
  const rows: Row[] = years.map((y) => {
    const a = add(y, available), s = add(y, [...service, ...extra]);
    const instalments = add(y, ['principalTL', ...extra]);
    return { fy: y.fy, available: a, service: s, counted: def.years === 'repayment' ? instalments > 0 : s > 0, dscr: s > 0 ? a / s : undefined };
  });
  const used = rows.filter((r) => r.counted), notes: string[] = [];
  for (const r of used) if (r.available <= 0) notes.push(`Cash available is nil or negative in ${r.fy}.`);
  if (!used.length) {
    notes.push(`No year has ${def.years === 'repayment' ? 'a term-loan instalment' : 'interest or instalments due'}, so there is no average or lowest year.`);
    return { rows, notes };
  }
  // The Total column: each figure over the years counted, and A and B as the sums of their rows.
  const figures: Totals['figures'] = {};
  years.forEach((y, i) => {
    if (!rows[i].counted) return;
    for (const c of Object.keys(data.components) as Component[]) if (isNum(y[c])) figures[c] = (figures[c] ?? 0) + y[c];
  });
  const total: Totals = { available: used.reduce((t, r) => t + r.available, 0), service: used.reduce((t, r) => t + r.service, 0), figures };
  const average = def.average === 'totals' ? total.available / total.service : used.reduce((t, r) => t + (r.dscr as number), 0) / used.length;
  const low = used.reduce((m, r) => ((r.dscr as number) < (m.dscr as number) ? r : m));
  return { rows, average, minimum: { dscr: low.dscr as number, fy: low.fy }, notes, total };
}

/** Where the Total column does not add up: A and B against the sums of their lines' totals, or '' when it does. */
function totalsOff(s: Statement, def: Definition, data: Data, extra: Component[] = []): string {
  if (!s.total) return '';
  const { available, service } = componentsOf(def, data), f = s.total.figures;
  const sum = (cs: Component[]) => cs.reduce((t, c) => t + (f[c] ?? 0), 0);
  return money(sum(available), s.total.available) && money(sum([...service, ...extra]), s.total.service) ? '' : 'the totals';
}

/** DSCR from the borrower's own yearly figures. `data` is for tests only. */
export function dscrStatement(years: YearFigures[], def: Definition, data: Data = DATA): Statement | Needs | Blocked {
  const needs = [...definitionNeeds(def, data), ...statementNeeds(years, def, data)];
  if (needs.length) return { needs };
  const s = computeStatement(years, def, data);
  const where = disagreement(s, statementCheck(years, def)) || totalsOff(s, def, data);
  return where ? blocked(where) : s;
}

// ---- Planning: the engine works out the loan's interest and the tax ----

/** Where the yearly schedule and its closed-form check part, or '' when they agree. */
function scheduleDisagrees(debt: YearDebt[], check: YearDebt[]): string {
  for (let i = 0; i < Math.max(debt.length, check.length); i++) {
    const a = debt[i], b = check[i];
    if (!a || !b || a.fy !== b.fy || !money(a.interest, b.interest) || !money(a.principal, b.principal) || !money(a.closing, b.closing) || !money(a.added ?? 0, b.added ?? 0))
      return `the loan schedule${a ? ` in ${a.fy}` : ''}`;
  }
  return '';
}

/** The first year of figures, when given, must be a financial year. */
const startNeeds = (start?: string) =>
  start === undefined || isFy(start) ? [] : [`The first year of figures written like 2026-27, in place of "${start}"`];

/**
 * `start`: the first year with figures, when operations start after the loan is drawn. The years before it must have no
 * instalment; their interest is taken as paid from the project cost (capitalised), and they are left out of the statement.
 */
/** Each loan's yearly debt added up by financial year: interest charged, principal repaid, interest added and not paid. */
interface YearSum { interest: number; principal: number; added: number }
function sumByFy(lists: YearDebt[][]): Map<string, YearSum> {
  const out = new Map<string, YearSum>();
  for (const l of lists) for (const d of l) {
    const t = out.get(d.fy) ?? { interest: 0, principal: 0, added: 0 };
    t.interest += d.interest; t.principal += d.principal; t.added += d.added ?? 0;
    out.set(d.fy, t);
  }
  return out;
}
const NONE: YearSum = { interest: 0, principal: 0, added: 0 };

/**
 * `start`: the first year with figures, when operations start after the loan is drawn. The years before it must have no
 * instalment; their interest is taken as paid from the project cost (capitalised), and they are left out of the statement.
 * Beside the loan the solvers move, `loan.alongside` adds more new term loans, each on its own schedule, and loans already
 * running by their terms (DSCR row A): every one's interest is charged in the profit and added back, and every one's
 * principal is debt service. A running loan counts in the years the projections give; its years before them are past.
 */
function plan(all: ProjectionYear[], loan: LoanTerms, def: Definition, start?: string): Plan | Needs | Blocked {
  const extra = loan.alongside?.loans ?? [], runningTerms = (loan.alongside?.running ?? []).map(runningLoanTerms);
  const own = { ...loan, alongside: undefined }, debt = schedule(own), news = [debt, ...extra.map(schedule)], runs = runningTerms.map(schedule);
  const proj = start ? all.filter((y) => y.fy >= start) : all;
  const early = start ? news.flat().filter((d) => d.fy < start) : [];
  const due = [...new Set(early.filter((d) => d.principal > 0).map((d) => d.fy))].map((fy) => `Figures for ${fy}: an instalment falls due then`);
  if (due.length) return { needs: due };
  const needs = [...new Set(news.flatMap((n) => coverageNeeds(n.filter((d) => !start || d.fy >= start), proj)))];
  if (needs.length) return { needs };
  const check = runningCheck(loan.alongside?.running ?? []);
  const off = [own, ...extra].map((t, i) => scheduleDisagrees(news[i], scheduleCheck(t))).find(Boolean)
    || (runningTerms.some((t, i) => !money(t.amount, check[i].amount)) ? 'a loan already running' : '')
    || runningTerms.map((_, i) => scheduleDisagrees(runs[i], scheduleCheck(check[i]))).find(Boolean);
  if (off) return blocked(off);
  const newBy = sumByFy(news), runBy = sumByFy(runs);
  const profit: ProfitYear[] = [], split: DebtSplit[] = [];
  const years: YearFigures[] = proj.map((y) => {
    const p = y as Required<ProjectionYear>, n = newBy.get(y.fy) ?? NONE, u = runBy.get(y.fy) ?? NONE;
    const interestNew = n.interest - (y.interestFromCost ?? 0), interestRunning = u.interest + p.otherLoansInterest;
    const interestTL = interestNew + interestRunning, principalTL = n.principal + u.principal + p.otherLoansPrincipal;
    // The holiday's interest added to a loan in the year, not paid (D-POL-13): a cost in the profit, a non-cash charge
    // in the cash available, and no debt service.
    const addedNew = n.added - (y.addedFromCost ?? 0), added = addedNew + u.added;
    // Existing EMIs are not split into interest and principal, so none of their interest is set against tax (errs low).
    const pbt = p.pbdit + p.assetIncome - p.depreciation - p.nonCash - interestTL - p.interestOther;
    const by = borrowerOf(y.taxBy), tax = by ? taxOn(pbt, by) : pbt > 0 ? pbt * p.taxPct / 100 : 0, pat = pbt - tax;
    profit.push({ fy: y.fy, pbdit: p.pbdit, assetIncome: p.assetIncome, depreciation: p.depreciation, nonCash: p.nonCash, interestTL, interestNew, interestRunning, interestOther: p.interestOther, pbt, tax, pat });
    split.push({ fy: y.fy, interestNew: interestNew - addedNew, interestRunning: interestRunning - u.added, principalNew: n.principal, principalRunning: u.principal + p.otherLoansPrincipal });
    return {
      fy: y.fy, pat, depreciation: p.depreciation, nonCash: p.nonCash + added, interestTL: interestTL - added, principalTL, interestOther: p.interestOther, existingEmis: p.existingEmis,
      ...(isNum(y.leaseRentals) ? { leaseRentals: y.leaseRentals } : {}),
    };
  });
  const statement = computeStatement(years, def, DATA, PLAN_SERVICE), pc = planCheck(proj, loan, def);
  const profitTotal = statement.total ? profitTotalOf(profit, statement) : undefined;
  const splitTotal = statement.total ? splitTotalOf(split, statement) : undefined;
  const where = disagreement(statement, pc) || totalsOff(statement, def, DATA, PLAN_SERVICE)
    || profit.map((x, i) => (money(x.pbt, pc.rows[i]?.pbt ?? NaN) && money(x.tax, pc.rows[i]?.tax ?? NaN) ? '' : `the tax in ${x.fy}`)).find(Boolean)
    || split.map((x, i) => (money(x.interestRunning, pc.rows[i]?.interestRunning ?? NaN) && money(x.principalRunning, pc.rows[i]?.principalRunning ?? NaN) ? '' : `the loans already running in ${x.fy}`)).find(Boolean)
    || profitTotalOff(profitTotal, statement, pc) || splitTotalOff(splitTotal, statement);
  return where ? blocked(where) : {
    schedule: debt, years, profit, statement, split, beforeStart: beforeStartOf(early), ...(profitTotal ? { profitTotal } : {}), ...(splitTotal ? { splitTotal } : {}),
  };
}

/** The years before the figures start, each year's interest on the new term loans added up. */
function beforeStartOf(early: YearDebt[]): BeforeStart[] {
  const by = new Map<string, number>();
  for (const d of early) by.set(d.fy, (by.get(d.fy) ?? 0) + d.interest);
  return [...by].map(([fy, interest]) => ({ fy, interest }));
}

/** Each line of the profit added up over the years the statement counts. */
function profitTotalOf(profit: ProfitYear[], s: Statement): ProfitTotals {
  const t: ProfitTotals = { pbdit: 0, assetIncome: 0, depreciation: 0, nonCash: 0, interestTL: 0, interestNew: 0, interestRunning: 0, interestOther: 0, pbt: 0, tax: 0, pat: 0 };
  profit.forEach((y, i) => {
    if (s.rows[i]?.counted) for (const k of Object.keys(t) as (keyof ProfitTotals)[]) t[k] += y[k];
  });
  return t;
}

/** The split added up over the years the statement counts. */
function splitTotalOf(split: DebtSplit[], s: Statement): Omit<DebtSplit, 'fy'> {
  const t = { interestNew: 0, interestRunning: 0, principalNew: 0, principalRunning: 0 };
  split.forEach((y, i) => {
    if (s.rows[i]?.counted) for (const k of Object.keys(t) as (keyof typeof t)[]) t[k] += y[k];
  });
  return t;
}

/** Where the split's totals do not make up the statement's term-loan totals, or ''. */
function splitTotalOff(t: Omit<DebtSplit, 'fy'> | undefined, s: Statement): string {
  const f = s.total?.figures;
  if (!t || !f) return '';
  const ok = (a: number, b: number | undefined) => b === undefined || money(a, b);
  return ok(t.interestNew + t.interestRunning, f.interestTL) && ok(t.principalNew + t.principalRunning, f.principalTL) ? '' : 'the term loans\' totals';
}

/**
 * Where the profit's totals do not hold, or '': profit before tax and the tax against the check's own loop, and the
 * lines against each other (profit before tax from its lines, profit after tax from it, as in the statement).
 */
function profitTotalOff(t: ProfitTotals | undefined, s: Statement, c: CheckResult): string {
  if (!t) return '';
  const pbt = t.pbdit + t.assetIncome - t.depreciation - t.nonCash - t.interestTL - t.interestOther;
  return money(t.pbt, c.total?.pbt ?? NaN) && money(t.tax, c.total?.tax ?? NaN) && money(pbt, t.pbt) && money(t.pbt - t.tax, t.pat)
    && money(t.pat, s.total?.figures.pat ?? NaN) ? '' : 'the totals';
}

/** DSCR from projections and loan terms: the engine works out the loan's interest, the profit after tax and the DSCR. */
export function planStatement(proj: ProjectionYear[], loan: LoanInput, def: Definition, start?: string): Plan | Needs | Blocked {
  const needs = [...definitionNeeds(def), ...loanNeeds(loan), ...projectionNeeds(proj, def), ...startNeeds(start)];
  return needs.length ? { needs } : plan(proj, loan as LoanTerms, def, start);
}

/** The repayment schedule, every month and by year, shown only when the closed-form check agrees with it. */
export function amortization(input: LoanInput): Amortization | Needs | Blocked {
  const loan = { ...input, alongside: undefined }, needs = loanNeeds(loan);
  if (needs.length) return { needs };
  const t = loan as LoanTerms, rows = months(t), check = monthsCheck(t);
  for (let i = 0; i < Math.max(rows.length, check.length); i++) {
    const a = rows[i], b = check[i];
    if (!a || !b || a.month !== b.month || (['opening', 'interest', 'principal', 'paid', 'closing'] as const).some((k) => !money(a[k], b[k])) || !money(a.added ?? 0, b.added))
      return blocked(`the repayment schedule${a ? ` in ${a.month}` : ''}`);
  }
  const years = schedule(t), off = scheduleDisagrees(years, scheduleCheck(t));
  if (off) return blocked(off);
  const level = levelInstalment(t);
  if (!money(level, levelCheck(t))) return blocked('the instalment');
  // The interest over the whole loan: the months added up, against the closed form's months added up.
  const totalInterest = rows.reduce((a, m) => a + m.interest, 0);
  return money(totalInterest, check.reduce((a, m) => a + m.interest, 0)) ? { months: rows, years, level, totalInterest } : blocked('the total interest');
}

/** The financial years a loan runs over, and the months ('YYYY-MM') of its first and last instalments. */
export interface LoanTimeline { years: string[]; firstInstalment: string; lastInstalment: string }

/** When the loan runs: needs only the month drawn, the moratorium, the number of instalments and how often. */
export function loanTimeline(loan: LoanInput): LoanTimeline | Needs {
  const needs = loanNeeds({ ...loan, alongside: undefined, amount: 1, ratePct: 0, style: 'equal-principal' });
  if (needs.length) return { needs };
  const t = loan as LoanTerms, at = (k: number) => monthAfter(t.disbursed, k), last = termMonths(t) - 1;
  const ym = (k: number) => `${at(k).year}-${String(at(k).month).padStart(2, '0')}`;
  const start = fyOf(at(0).year, at(0).month), end = fyOf(at(last).year, at(last).month);
  return {
    years: fyRange(start, Number(end.slice(0, 4)) - Number(start.slice(0, 4)) + 1),
    firstInstalment: ym(t.moratoriumMonths + PERIOD_MONTHS[t.frequency] - 1),
    lastInstalment: ym(last),
  };
}

// ---- Solvers ----

/** Why a statement misses the target, or undefined when it meets it. */
export function shortfall(s: Statement, t: Target): Limit | undefined {
  const dry = s.rows.find((r) => r.counted && r.available <= 0);
  if (dry) return { kind: 'cash', fy: dry.fy };
  if (t.minimum !== undefined && !(s.minimum && s.minimum.dscr >= t.minimum)) return { kind: 'minimum', fy: s.minimum?.fy ?? '' };
  if (t.average !== undefined && !(s.average !== undefined && s.average >= t.average)) return { kind: 'average' };
  return undefined;
}

export const limitText = (l: Limit) =>
  l.kind === 'cash' ? `cash available is nil or negative in ${l.fy}`
    : l.kind === 'minimum' ? `the lowest year${l.fy ? `, ${l.fy},` : ''} is below the target`
      : 'the average is below the target';

class Stop { constructor(readonly result: Needs | Blocked) {} }
const must = (r: Plan | Needs | Blocked): Plan => {
  if ('needs' in r || 'blocked' in r) throw new Stop(r);
  return r;
};
function solve<T>(f: () => T): T | Needs | Blocked {
  try { return f(); } catch (e) { if (e instanceof Stop) return e.result; throw e; }
}

/** Largest loan, to the rupee, whose DSCR meets the target on the given terms. */
export function maxLoanAmount(proj: ProjectionYear[], loan: LoanInput, def: Definition, target: Target, start?: string): AmountAnswer | NoAnswer | Needs | Blocked {
  const needs = [...definitionNeeds(def), ...loanNeeds({ ...loan, amount: 1 }), ...projectionNeeds(proj, def), ...targetNeeds(target), ...startNeeds(start)];
  if (needs.length) return { needs };
  const at = (amount: number) => must(plan(proj, { ...(loan as LoanTerms), amount }, def, start));
  return solve((): AmountAnswer | NoAnswer => {
    const first = shortfall(at(1).statement, target);
    if (first) return { none: `No loan amount meets the target: even at ₹1, ${limitText(first)}.` };
    let lo = 1, hi = 1024;
    while (!shortfall(at(hi).statement, target)) {
      lo = hi;
      hi *= 2;
      if (hi > 1e13) return { none: 'No upper limit found: the figures meet the target at any amount. Please check them.' };
    }
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2);
      if (shortfall(at(mid).statement, target)) hi = mid; else lo = mid;
    }
    // The answer must top an unbroken range from ₹1. A year too weak to cover its other debts can make the
    // average rise with the loan; then there is no single answer.
    for (const f of [0.75, 0.5, 0.25, 0.1]) {
      if (shortfall(at(Math.max(1, Math.floor(lo * f))).statement, target))
        return { none: 'No single answer: some smaller amounts miss the target, because a weak year pulls the average around. Set a target for the lowest year instead.' };
    }
    return { amount: lo, limitedBy: shortfall(at(lo + 1).statement, target) as Limit, plan: at(lo) };
  });
}

/** Fewest instalments whose DSCR meets the target, within the years the projections cover. */
export function shortestRepayment(proj: ProjectionYear[], loan: LoanInput, def: Definition, target: Target, start?: string): TenureAnswer | NoAnswer | Needs | Blocked {
  const needs = [...definitionNeeds(def), ...loanNeeds({ ...loan, instalments: 1 }), ...projectionNeeds(proj, def), ...targetNeeds(target), ...startNeeds(start)];
  if (needs.length) return { needs };
  const last = proj.map((p) => p.fy).sort().at(-1) as string;
  return solve((): TenureAnswer | NoAnswer => {
    let tried = 0, limit: Limit | undefined;
    for (let n = 1; ; n++) {
      const terms = { ...(loan as LoanTerms), instalments: n };
      const end = monthAfter(terms.disbursed, termMonths(terms) - 1);
      if (fyOf(end.year, end.month) > last) break;
      const p = must(plan(proj, terms, def, start));
      limit = shortfall(p.statement, target);
      if (!limit) return { instalments: n, plan: p };
      tried = n;
    }
    if (!tried) return { none: `The projections end in ${last}, before the first instalment falls due. Add later years.` };
    return { none: `Even ${tried} instalments, the most the projections cover (to ${last}), miss the target: ${limitText(limit as Limit)}. Add later years to try a longer repayment.` };
  });
}
