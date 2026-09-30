/**
 * DSCR: the statement year by year with its average and lowest year, and the loan amount or repayment period that
 * meets a target. Pure — no DOM. The method is data (engine/data/dscr.json, explained in docs/RULES.md). dscr-check.ts
 * recomputes every figure independently and nothing is returned unless both agree. A missing fact is never assumed:
 * the result lists what is needed instead of figures.
 */
import DATA from './data/dscr.json';
import { PERIOD_MONTHS, fyOf, levelInstalment, monthAfter, months, schedule, termMonths, type LoanTerms, type MonthRow, type YearDebt } from './loan';
import { levelCheck, monthsCheck, planCheck, scheduleCheck, statementCheck, type CheckResult } from './dscr-check';

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
  depreciation?: number;
  nonCash?: number;
  interestOther?: number;
  leaseRentals?: number;
  otherLoansInterest?: number;
  otherLoansPrincipal?: number;
  taxPct?: number;
}
export type LoanInput = { [K in keyof LoanTerms]?: LoanTerms[K] };
export interface Target { average?: number; minimum?: number }

export interface Row { fy: string; available: number; service: number; counted: boolean; dscr?: number }
export interface Statement { rows: Row[]; average?: number; minimum?: { dscr: number; fy: string }; notes: string[] }
/** How profit after tax is reached in a projected year (planning mode). */
export interface ProfitYear { fy: string; pbdit: number; depreciation: number; nonCash: number; interestTL: number; interestOther: number; pbt: number; tax: number; pat: number }
export interface Plan { schedule: YearDebt[]; years: YearFigures[]; profit: ProfitYear[]; statement: Statement }
/** The repayment schedule month by month, its totals by financial year, and the level instalment (EMI or principal). */
export interface Amortization { months: MonthRow[]; years: YearDebt[]; level: number }
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

export const PROJECTION_LABELS: Record<Exclude<keyof ProjectionYear, 'fy'>, string> = {
  pbdit: 'Profit before interest, depreciation and tax',
  depreciation: 'Depreciation',
  nonCash: 'Other non-cash charges',
  interestOther: 'Interest on other borrowings (working capital)',
  leaseRentals: 'Lease rentals',
  otherLoansInterest: 'Interest on other term loans',
  otherLoansPrincipal: 'Instalments of other term loans',
  taxPct: 'Tax rate (%)',
};
export const LOAN_LABELS: Record<keyof LoanTerms, string> = {
  amount: 'Loan amount',
  ratePct: 'Interest rate (% a year)',
  disbursed: 'Month the loan is drawn (like 2026-04)',
  moratoriumMonths: 'Moratorium in months (0 if none)',
  instalments: 'Number of instalments',
  frequency: 'How often instalments fall due (monthly or quarterly)',
  style: 'Instalment type (equal instalments of principal, or EMI)',
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
  if (l.style !== 'equal-principal' && l.style !== 'emi') needs.push(L.style);
  else if (l.style === 'emi' && l.frequency === 'quarterly') needs.push('Monthly instalments for an EMI (it is worked monthly only), or equal instalments of principal');
  return needs;
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
  // Either computation may pick a different year when two years tie; the lowest value must agree either way.
  if (!ratio(s.minimum?.dscr, c.minimum?.dscr) || (s.minimum && !ratio(c.rows.find((r) => r.fy === s.minimum?.fy)?.dscr, c.minimum?.dscr))) return 'the lowest year';
  return '';
}

// ---- Statement ----

function computeStatement(years: YearFigures[], def: Definition, data: Data): Statement {
  const { available, service } = componentsOf(def, data);
  const add = (y: YearFigures, cs: Component[]) => cs.reduce((s, c) => s + (y[c] as number), 0);
  const rows: Row[] = years.map((y) => {
    const a = add(y, available), s = add(y, service);
    return { fy: y.fy, available: a, service: s, counted: def.years === 'repayment' ? (y.principalTL as number) > 0 : s > 0, dscr: s > 0 ? a / s : undefined };
  });
  const used = rows.filter((r) => r.counted), notes: string[] = [];
  for (const r of used) if (r.available <= 0) notes.push(`Cash available is nil or negative in ${r.fy}.`);
  if (!used.length) {
    notes.push(`No year has ${def.years === 'repayment' ? 'a term-loan instalment' : 'interest or instalments due'}, so there is no average or lowest year.`);
    return { rows, notes };
  }
  const total = used.reduce((t, r) => ({ a: t.a + r.available, s: t.s + r.service }), { a: 0, s: 0 });
  const average = def.average === 'totals' ? total.a / total.s : used.reduce((t, r) => t + (r.dscr as number), 0) / used.length;
  const low = used.reduce((m, r) => ((r.dscr as number) < (m.dscr as number) ? r : m));
  return { rows, average, minimum: { dscr: low.dscr as number, fy: low.fy }, notes };
}

/** DSCR from the borrower's own yearly figures. `data` is for tests only. */
export function dscrStatement(years: YearFigures[], def: Definition, data: Data = DATA): Statement | Needs | Blocked {
  const needs = [...definitionNeeds(def, data), ...statementNeeds(years, def, data)];
  if (needs.length) return { needs };
  const s = computeStatement(years, def, data);
  const where = disagreement(s, statementCheck(years, def));
  return where ? blocked(where) : s;
}

// ---- Planning: the engine works out the loan's interest and the tax ----

/** Where the yearly schedule and its closed-form check part, or '' when they agree. */
function scheduleDisagrees(debt: YearDebt[], check: YearDebt[]): string {
  for (let i = 0; i < Math.max(debt.length, check.length); i++) {
    const a = debt[i], b = check[i];
    if (!a || !b || a.fy !== b.fy || !money(a.interest, b.interest) || !money(a.principal, b.principal) || !money(a.closing, b.closing))
      return `the loan schedule${a ? ` in ${a.fy}` : ''}`;
  }
  return '';
}

function plan(proj: ProjectionYear[], loan: LoanTerms, def: Definition): Plan | Needs | Blocked {
  const debt = schedule(loan);
  const needs = coverageNeeds(debt, proj);
  if (needs.length) return { needs };
  const off = scheduleDisagrees(debt, scheduleCheck(loan));
  if (off) return blocked(off);
  const byFy = new Map(debt.map((d) => [d.fy, d]));
  const profit: ProfitYear[] = [];
  const years: YearFigures[] = proj.map((y) => {
    const p = y as Required<ProjectionYear>, d = byFy.get(y.fy);
    const interestTL = (d?.interest ?? 0) + p.otherLoansInterest, principalTL = (d?.principal ?? 0) + p.otherLoansPrincipal;
    const pbt = p.pbdit - p.depreciation - p.nonCash - interestTL - p.interestOther;
    const tax = pbt > 0 ? pbt * p.taxPct / 100 : 0, pat = pbt - tax;
    profit.push({ fy: y.fy, pbdit: p.pbdit, depreciation: p.depreciation, nonCash: p.nonCash, interestTL, interestOther: p.interestOther, pbt, tax, pat });
    return {
      fy: y.fy, pat, depreciation: p.depreciation, nonCash: p.nonCash, interestTL, principalTL, interestOther: p.interestOther,
      ...(isNum(y.leaseRentals) ? { leaseRentals: y.leaseRentals } : {}),
    };
  });
  const statement = computeStatement(years, def, DATA), check = planCheck(proj, loan, def);
  const where = disagreement(statement, check)
    || profit.map((x, i) => (money(x.pbt, check.rows[i]?.pbt ?? NaN) && money(x.tax, check.rows[i]?.tax ?? NaN) ? '' : `the tax in ${x.fy}`)).find(Boolean);
  return where ? blocked(where) : { schedule: debt, years, profit, statement };
}

/** DSCR from projections and loan terms: the engine works out the loan's interest, the profit after tax and the DSCR. */
export function planStatement(proj: ProjectionYear[], loan: LoanInput, def: Definition): Plan | Needs | Blocked {
  const needs = [...definitionNeeds(def), ...loanNeeds(loan), ...projectionNeeds(proj, def)];
  return needs.length ? { needs } : plan(proj, loan as LoanTerms, def);
}

/** The repayment schedule, every month and by year, shown only when the closed-form check agrees with it. */
export function amortization(loan: LoanInput): Amortization | Needs | Blocked {
  const needs = loanNeeds(loan);
  if (needs.length) return { needs };
  const t = loan as LoanTerms, rows = months(t), check = monthsCheck(t);
  for (let i = 0; i < Math.max(rows.length, check.length); i++) {
    const a = rows[i], b = check[i];
    if (!a || !b || a.month !== b.month || (['opening', 'interest', 'principal', 'paid', 'closing'] as const).some((k) => !money(a[k], b[k])))
      return blocked(`the repayment schedule${a ? ` in ${a.month}` : ''}`);
  }
  const years = schedule(t), off = scheduleDisagrees(years, scheduleCheck(t));
  if (off) return blocked(off);
  const level = levelInstalment(t);
  return money(level, levelCheck(t)) ? { months: rows, years, level } : blocked('the instalment');
}

/** The financial years a loan runs over, and the months ('YYYY-MM') of its first and last instalments. */
export interface LoanTimeline { years: string[]; firstInstalment: string; lastInstalment: string }

/** When the loan runs: needs only the month drawn, the moratorium, the number of instalments and how often. */
export function loanTimeline(loan: LoanInput): LoanTimeline | Needs {
  const needs = loanNeeds({ ...loan, amount: 1, ratePct: 0, style: 'equal-principal' });
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
export function maxLoanAmount(proj: ProjectionYear[], loan: LoanInput, def: Definition, target: Target): AmountAnswer | NoAnswer | Needs | Blocked {
  const needs = [...definitionNeeds(def), ...loanNeeds({ ...loan, amount: 1 }), ...projectionNeeds(proj, def), ...targetNeeds(target)];
  if (needs.length) return { needs };
  const at = (amount: number) => must(plan(proj, { ...(loan as LoanTerms), amount }, def));
  return solve((): AmountAnswer | NoAnswer => {
    const first = shortfall(at(1).statement, target);
    if (first) return { none: `No loan amount meets the target: even at Rs. 1, ${limitText(first)}.` };
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
    // The answer must top an unbroken range from Rs. 1. A year too weak to cover its other debts can make the
    // average rise with the loan; then there is no single answer.
    for (const f of [0.75, 0.5, 0.25, 0.1]) {
      if (shortfall(at(Math.max(1, Math.floor(lo * f))).statement, target))
        return { none: 'No single answer: some smaller amounts miss the target, because a weak year pulls the average around. Set a target for the lowest year instead.' };
    }
    return { amount: lo, limitedBy: shortfall(at(lo + 1).statement, target) as Limit, plan: at(lo) };
  });
}

/** Fewest instalments whose DSCR meets the target, within the years the projections cover. */
export function shortestRepayment(proj: ProjectionYear[], loan: LoanInput, def: Definition, target: Target): TenureAnswer | NoAnswer | Needs | Blocked {
  const needs = [...definitionNeeds(def), ...loanNeeds({ ...loan, instalments: 1 }), ...projectionNeeds(proj, def), ...targetNeeds(target)];
  if (needs.length) return { needs };
  const last = proj.map((p) => p.fy).sort().at(-1) as string;
  return solve((): TenureAnswer | NoAnswer => {
    let tried = 0, limit: Limit | undefined;
    for (let n = 1; ; n++) {
      const terms = { ...(loan as LoanTerms), instalments: n };
      const end = monthAfter(terms.disbursed, termMonths(terms) - 1);
      if (fyOf(end.year, end.month) > last) break;
      const p = must(plan(proj, terms, def));
      limit = shortfall(p.statement, target);
      if (!limit) return { instalments: n, plan: p };
      tried = n;
    }
    if (!tried) return { none: `The projections end in ${last}, before the first instalment falls due. Add later years.` };
    return { none: `Even ${tried} instalments, the most the projections cover (to ${last}), miss the target: ${limitText(limit as Limit)}. Add later years to try a longer repayment.` };
  });
}
