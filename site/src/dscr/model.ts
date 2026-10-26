/**
 * The DSCR page: what it asks, and the preview it shows. Pure — no DOM. Every figure comes from engine/dscr.ts; this
 * file only turns typed text into the engine's inputs and the engine's answers into plain words. The page starts from
 * the assumptions in engine/data/defaults.json (the owner's request, D-UX-08), each listed with its reason until it is
 * changed (`assumedIn`); nothing else missing is filled in, and anything else missing is listed as needed.
 */
import { ALL_ANSWERED, questionsLeft, verdictWords, workWords } from '../verdict';
import DEFAULTS from '../../../engine/data/defaults.json';
import DSCR from '../../../engine/data/dscr.json';
import {
  BENCHMARKS, COMPONENTS, LOAN_LABELS, OPTIONS, PLAN_SERVICE, PRESETS, PROJECTION_LABELS, amortization, componentsOf, dscrStatement, fyRange,
  isFy, limitText, loanTimeline, maxLoanAmount, planStatement, shortestRepayment, shortfall, targetNeeds,
  type Amortization, type Component, type Definition, type Limit, type LoanInput, type ProfitTotals, type ProfitYear, type ProjectionYear, type Statement,
  type Target, type YearFigures, type Plan,
} from '../../../engine/dscr';
import { LENDER, auditedYear, cashCheck, promotersRepaid, stressTests, type AuditedInput, type LenderYear, type Summary } from '../../../engine/lender';
import { PERIOD_MONTHS, fyOf, monthAfter, type LoanTerms } from '../../../engine/loan';
import type { DscrCase } from '../../../engine/dscr-plan';
import { LEVELS } from '../../../engine/ratios';
import { emisByYear, fromMonth, series, type RunningLoan } from '../../../engine/project';
import { parseAmount, parseMonth } from '../../../engine/parse';
import { BORROWERS, borrowerOf, taxSummary } from '../../../engine/tax';
import { inr, rs } from '../../../engine/util';
import { SURE, leastSure, type Marked } from '../../../engine/sure';

export type Source = 'own' | 'plan';
/** A preset's id from the data file, or 'choose' to answer the four choices one by one. */
export type Method = string;
/** One answer for two facts: an EMI is monthly; equal principal is monthly or quarterly. */
export type Repayment = 'emi' | 'monthly' | 'quarterly';
/**
 * How a row is filled: one figure for every year, a first year that grows or falls by a %, a figure for each year, or
 * none; EMIs a month (loans already running), a yearly figure from a month (the new asset), or by who the borrower is (tax).
 */
export type RowMode = 'same' | 'grow' | 'fall' | 'years' | 'none' | 'emi' | 'from' | 'borrower';
export type OptionKey = keyof Definition;

export interface LoanText {
  amount: string; ratePct: string; disbursed: string; moratoriumMonths: string; instalments: string;
  repayment?: Repayment;
}
/** A loan already running, as typed: its EMI a month, and the month of its last EMI when it ends (empty: it runs on). */
export interface RunningText { emi: string; last: string }

export interface State {
  source?: Source;
  method?: Method;
  /** The four choices, when the user picks them one by one. */
  choice: Partial<Definition>;
  /** Own figures: the first year and how many. */
  firstYear: string;
  yearCount: string;
  /** From the loan terms: the loan, and how many years to show when more than the loan runs over. */
  loan: LoanText;
  planYears?: number;
  /** The first year of the projections, when operations start after the loan's first year (only a year with no instalment is left out). */
  planStart?: string;
  /** What was typed for each row, by year number (not by year name, so moving the first year keeps the figures). */
  cells: Record<string, string[]>;
  modes: Record<string, RowMode>;
  /** The % a year for rows that grow or fall. */
  rates: Record<string, string>;
  target: { average: string; minimum: string };
  /** Who the borrower is (an id in engine/data/tax.json): it sets the tax, and which existing EMIs count (D-POL-06). */
  borrower?: string;
  /** Loans already running, when given as EMIs a month. */
  running: RunningText[];
  /** The new asset's extra income a year, and the month it starts running, as typed. */
  asset: { yearly: string; from: string };
  /** Started from the assumptions (ASSUMED): switching back to working the figures out puts them back. */
  assume?: boolean;
  /** Started from the front door (frontDoor): the month the loan is taken as drawn in, until changed. */
  door?: { month: string };
  /** What only the document needs: asked beside the download, taken once for the PDF, the Excel copy and the Word copy. */
  doc: DocFacts;
  /** Make it viable (MV5): the most the borrower can bring in, typed on the board only. */
  ownMost?: string;
  /** D1, the lenders' tests, under More options; absent until one is typed (D-UX-47). */
  lender?: LenderText;
}

/**
 * The lenders' tests as typed: this year's sales (they follow the profit's row: grow at its rate, stay the same, or each
 * year), promoters' loans repaid each year, working capital as a % of sales, replacement capex a year (the same every
 * year), and the last audited year's five figures.
 */
export interface LenderText { sales: string[]; promoters: string[]; wcPct: string; capex: string; audited: Record<keyof AuditedInput, string> }
export const NO_LENDER: LenderText = { sales: [], promoters: [], wcPct: '', capex: '', audited: { sales: '', pbdit: '', depreciation: '', interest: '', tax: '' } };

/**
 * The document's own facts. The borrower's name and the lender are needed; who prepared it, the address, the loan's purpose
 * and a GSTIN are given only if wanted (D-DOC-10), the last three under one closed line.
 */
export interface DocFacts { borrower: string; lender: string; preparedBy: string; address?: string; purpose?: string; gstin?: string }

/** Nothing answered: what the tests start from. */
export const START: State = {
  choice: {}, firstYear: '', yearCount: '',
  loan: { amount: '', ratePct: '', disbursed: '', moratoriumMonths: '', instalments: '' },
  cells: {}, modes: {}, rates: {}, target: { average: '', minimum: '' }, doc: { borrower: '', lender: '', preparedBy: '' },
  running: [{ emi: '', last: '' }], asset: { yearly: '', from: '' },
};

/** `planStart` when the figures start in the year the loan is first drawn, whichever year that turns out to be. */
export const LOAN_YEAR = 'loan';

type Assumption = (typeof DEFAULTS.assumptions)[number];
const ASSUMPTION = Object.fromEntries(DEFAULTS.assumptions.map((a) => [a.id, a])) as Record<string, Assumption>;
const assumedValue = <T,>(id: string) => ASSUMPTION[id].value as T;

/** How each line is given while its assumption holds: profit grows with sales; depreciation and other interest as this year. */
const ASSUMED_MODES: Record<string, RowMode> = {
  pbdit: 'grow', assetIncome: 'none', depreciation: 'same', interestOther: 'same', otherLoans: 'none', nonCash: 'none', leaseRentals: 'none', taxPct: 'same',
};

/**
 * Where the page starts (the owner, 30-09-2026: "work everything out from this year's figures and sales growth, and
 * assume the rest"): every assumption in engine/data/defaults.json already answered, so only the loan and this year's
 * figures are asked. Each shows on the page with its reason until it is changed.
 */
export const ASSUMED: State = {
  ...START,
  assume: true,
  source: 'plan',
  method: assumedValue<string>('method'),
  modes: { ...ASSUMED_MODES },
  cells: { taxPct: [String(assumedValue<number>('tax'))] },
  target: {
    average: assumedValue<{ average: number }>('target').average.toFixed(2),
    minimum: assumedValue<{ minimum: number }>('target').minimum.toFixed(2),
  },
  planStart: LOAN_YEAR,
};

/**
 * The front door (D-UX-10): the assumptions as above, the loan drawn in `month` (this month, as 2026-10) and repaid by EMI
 * every month with no moratorium, and no interest on working capital or depreciation until given (the profit asked is
 * before all interest; depreciation is an optional field). Each shows on the page until changed.
 */
export const frontDoor = (month: string): State => ({
  ...ASSUMED, door: { month },
  modes: { ...ASSUMED.modes, depreciation: 'none', interestOther: 'none' },
  loan: { ...ASSUMED.loan, disbursed: month, moratoriumMonths: '0', repayment: 'emi' },
});

/** The assumptions about the figures belong to working them out: own yearly figures leave them, and coming back restores them. */
export function withSource(s: State, source: Source): State {
  const modes = { ...s.modes };
  for (const [k, m] of Object.entries(ASSUMED_MODES)) {
    if (source === 'own' && modes[k] === m) delete modes[k];
    if (source === 'plan' && s.assume && modes[k] === undefined) modes[k] = m;
  }
  return { ...s, source, modes };
}

export const COMMON = PRESETS[0];
export const presetOf = (id?: string) => PRESETS.find((p) => p.id === id);
export const OPTION_KEYS = Object.keys(OPTIONS) as OptionKey[];
export const MAX_YEARS = 30;

// ---- Reading what was typed ----

/** An amount: 1,50,000, 1.5 L or -50,000. */
export const amountOf = (t?: string) => (t?.trim() ? parseAmount(t) : undefined);
/** A plain number: 12, 12.5% or 1.20. */
export const numberOf = (t?: string) => (t?.trim() ? parseAmount(t.replace(/%\s*$/, ''), false) : undefined);

/** A financial year: 2026-27, 2026-2027 or FY 2026-27 → '2026-27'. */
export function parseFy(text: string): string | undefined {
  const m = /^\s*(?:fy\s*)?(\d{4})\s*[-–/]\s*(\d{2}|\d{4})\s*$/i.exec(text);
  if (!m || (m[2].length === 4 && Number(m[2]) !== Number(m[1]) + 1)) return undefined;
  const fy = `${m[1]}-${m[2].slice(-2)}`;
  return isFy(fy) ? fy : undefined;
}

/** How an amount reads back once the field is left: 70 L → 70,00,000. Text that is not understood stays as typed. */
export function tidyAmount(t: string): string {
  const n = amountOf(t);
  return n === undefined ? t.trim() : inr(n, Number.isInteger(n) ? 0 : 2);
}

// ---- What the page asks ----

export function definitionOf(s: State): Partial<Definition> | undefined {
  return s.method === 'choose' ? s.choice : (presetOf(s.method)?.choice as Definition | undefined);
}

const complete = (d?: Partial<Definition>): d is Definition => !!d && OPTION_KEYS.every((k) => d[k] !== undefined);

/** The start questions left to answer; the figures are asked only once these narrow them. */
export function startNeeds(s: State): string[] {
  const needs: string[] = [];
  if (!s.source) needs.push('Where the yearly figures come from');
  if (!s.method) needs.push('How DSCR is worked out');
  if (s.method === 'choose') for (const k of OPTION_KEYS) if (!s.choice[k]) needs.push(`Choose: ${OPTIONS[k].question}`);
  return needs;
}

export interface RowDef {
  /** The engine's name for the figure; the fields are fld-<key>-<year>, fld-<key>-rate and fld-<key>-<answer>. */
  key: string;
  label: string;
  /** Rows sharing a mode key switch together (the interest and instalments of other term loans). */
  modeKey: string;
  /** The answers offered, first shown first. With `ask`, nothing is taken until one is picked (None is taken only as answered, or as assumed in engine/data/defaults.json). */
  modes: RowMode[];
  ask?: boolean;
  /** In a block of rows answered together: the answers that use this row; in the block's other answers it is nil. */
  only?: RowMode[];
  /** A loss may be typed with a minus. */
  negative?: boolean;
  percent?: boolean;
  /** One line under the name, where the name alone may not be clear. */
  hint?: string;
}

const row = (key: string, label: string, modes: RowMode[], extra: Partial<RowDef> = {}): RowDef => ({ key, label, modeKey: key, modes, ...extra });
const OPTIONAL: RowMode[] = ['none', 'same', 'years'];
/** Loans already running: none, their EMIs a month, or a CA's interest and instalments a year. */
const RUNNING: RowMode[] = ['none', 'emi', 'same', 'years'];
/** Titles of the blocks of rows answered together. */
export const GROUP_TITLES: Record<string, string> = { otherLoans: 'Loans already running' };
export const titleOf = (r: RowDef) => GROUP_TITLES[r.modeKey] ?? r.label;

/**
 * The rows of the yearly figures, from where they come from and the method: only what changes the answer. When the page
 * works the figures out, each row takes one or two answers (a figure and a % a year); a figure for each year is a choice.
 */
export function rowsOf(s: State): RowDef[] {
  const def = definitionOf(s);
  if (!s.source || !complete(def)) return [];
  if (s.source === 'own') {
    const { available, service } = componentsOf(def), used = new Set<string>([...available, ...service]);
    const extra: Partial<Record<Component, [RowMode[], Partial<RowDef>]>> = {
      pat: [['years', 'same', 'grow'], { negative: true, hint: 'After interest, depreciation and tax. A loss with a minus.' }],
      depreciation: [['years', 'same', 'fall'], {}],
      nonCash: [OPTIONAL, { ask: true, hint: HINTS.nonCash }], interestOther: [OPTIONAL, { ask: true }], leaseRentals: [OPTIONAL, { ask: true, hint: HINTS.leaseRentals }],
      interestTL: [['years', 'same'], { hint: 'On every term loan, this one included.' }], principalTL: [['years', 'same'], { hint: 'Principal repaid in the year, every term loan.' }],
    };
    return (Object.keys(COMPONENTS) as Component[]).filter((c) => used.has(c)).map((c) => row(c, COMPONENTS[c], extra[c]?.[0] ?? ['years'], extra[c]?.[1]));
  }
  const L = PROJECTION_LABELS;
  return [
    row('pbdit', L.pbdit, ['grow', 'same', 'years'], { negative: true, hint: 'Sales less every cost except interest, depreciation and tax.' }),
    row('assetIncome', L.assetIncome, ['none', 'from'], { hint: 'What the asset adds to profit before interest, depreciation and tax, after its own running costs.' }),
    row('depreciation', L.depreciation, ['same', 'fall', 'years', 'none'], { hint: 'The same every year (straight line), or falling by its rate (written-down value).' }),
    row('nonCash', L.nonCash, OPTIONAL, { ask: true, hint: HINTS.nonCash }),
    row('interestOther', L.interestOther, ['none', 'same', 'grow', 'years'], { ask: true, hint: 'Cash credit or overdraft interest.' }),
    ...(def.leases === 'yes' ? [row('leaseRentals', L.leaseRentals, OPTIONAL, { ask: true, hint: HINTS.leaseRentals })] : []),
    row('otherLoansInterest', L.otherLoansInterest, RUNNING, { modeKey: 'otherLoans', ask: true, only: ['same', 'years'], hint: 'Loans the borrower already repays, besides this one.' }),
    row('otherLoansPrincipal', L.otherLoansPrincipal, RUNNING, { modeKey: 'otherLoans', ask: true, only: ['same', 'years'] }),
    row('existingEmis', L.existingEmis, RUNNING, { modeKey: 'otherLoans', ask: true, only: ['emi'] }),
    row('taxPct', L.taxPct, ['borrower', 'same', 'years'], { percent: true, hint: 'On profit before tax; nil in a year with a loss.' }),
  ];
}

const HINTS = {
  nonCash: 'Amortisation, amounts written off, deferred tax.',
  leaseRentals: 'Lease payments in the year. Under Ind AS 116, leave right-of-use depreciation and lease interest out of the rows above.',
};

/** The answer picked for a row, or the first offered; undefined while a row that must be asked has no answer. */
export const modeOf = (s: State, r: RowDef): RowMode | undefined => {
  const m = s.modes[r.modeKey];
  return m && r.modes.includes(m) ? m : r.ask ? undefined : r.modes[0];
};

export interface RowValues { values: (number | undefined)[]; needs: string[]; blocked?: string }

/** Asked when the tax is to be worked out by who the borrower is, and that is not yet answered. */
export const BORROWER_NEED = 'Who the borrower is: it sets the tax';

/** A loan already running, read: an EMI not understood is missing; a last month typed but not understood is passed on to be asked again. */
export const runningLoan = (t: RunningText): RunningLoan =>
  ({ emi: amountOf(t.emi), ...(t.last.trim() ? { last: parseMonth(t.last) ?? t.last.trim() } : {}) });

/** A row's figure for each year: typed, or worked out by the engine from one or two answers. */
export function rowValues(s: State, r: RowDef, years: string[]): RowValues {
  const n = years.length, mode = modeOf(s, r), missing: (number | undefined)[] = Array(n).fill(undefined);
  if (!mode) return { values: missing, needs: [`${titleOf(r)}: none, or how much`] };
  if (mode === 'none' || (r.only && !r.only.includes(mode))) return { values: Array(n).fill(0), needs: [] };
  // The tax then comes from who the borrower is (`taxBy`), not from a rate.
  if (mode === 'borrower') return { values: missing, needs: borrowerOf(s.borrower) ? [] : [BORROWER_NEED] };
  const read = r.percent ? numberOf : amountOf, text = s.cells[r.key] ?? [];
  if (mode === 'years') return { values: years.map((_, i) => read(text[i])), needs: [] }; // the engine names each missing year
  const out = mode === 'emi' ? emisByYear(s.running.map(runningLoan), years, titleOf(r))
    : mode === 'from' ? fromMonth(amountOf(s.asset.yearly), parseMonth(s.asset.from), years, r.label)
      : series({ kind: mode, first: read(text[0]), pct: numberOf(s.rates[r.key]) }, n, r.label, years[0] ?? '');
  return 'needs' in out ? { values: missing, needs: out.needs } : 'blocked' in out ? { values: missing, needs: [], blocked: out.blocked } : { values: out, needs: [] };
}

/** Who the borrower can be, with the tax and the EMIs each answer brings (engine/data/tax.json, dscr.json). */
const EMIS_BY = DSCR.existingEmis.byBorrower as Record<string, { counts: string; ask: string }>;
export const BORROWER_CHOICES = BORROWERS.map((b) => ({ id: b.id, label: b.label, who: b.who, tax: taxSummary(b), emis: EMIS_BY[b.id]?.counts ?? '' }));
/** What to give as EMIs a month, by who the borrower is (D-POL-06). */
export const emisAsk = (s: State) => EMIS_BY[s.borrower ?? '']?.ask ?? DSCR.existingEmis.unknown;
/** Saying who the borrower is works out the tax for that borrower, in place of a rate. */
export const withBorrower = (s: State, id: string): State => ({ ...s, borrower: id, modes: { ...s.modes, taxPct: 'borrower' } });

export function loanInput(s: State): LoanInput {
  const l = s.loan, r = l.repayment;
  return {
    amount: amountOf(l.amount), ratePct: numberOf(l.ratePct), disbursed: parseMonth(l.disbursed),
    moratoriumMonths: numberOf(l.moratoriumMonths), instalments: numberOf(l.instalments),
    // An EMI is worked monthly only (docs/RULES.md), so one answer gives both the type and how often.
    ...(r ? { style: r === 'emi' ? 'emi' : 'equal-principal', frequency: r === 'quarterly' ? 'quarterly' : 'monthly' } as const : {}),
  };
}

/** The one question for how the loan is repaid replaces the engine's two lines for it. */
const REPAYMENT_NEED = 'How the loan is repaid (EMI, or equal principal every month or quarter)';
const oneRepaymentNeed = (needs: string[]) => {
  const two = [LOAN_LABELS.frequency, LOAN_LABELS.style];
  const at = needs.findIndex((n) => two.includes(n));
  return at < 0 ? needs : [...needs.slice(0, at).filter((n) => !two.includes(n)), REPAYMENT_NEED, ...needs.slice(at).filter((n) => !two.includes(n))];
};

/** Empty means not set; typed but not understood is passed on as not a number, so the engine asks for it. */
export function targetOf(s: State): Target {
  const t: Target = {};
  if (s.target.average.trim()) t.average = numberOf(s.target.average) ?? NaN;
  if (s.target.minimum.trim()) t.minimum = numberOf(s.target.minimum) ?? NaN;
  return t;
}

export interface Years {
  /** The years asked for, and anything still needed to know them. */
  years: string[];
  needs: string[];
  /** From the loan terms: the years it runs over; how many of those are asked for; its first and last instalments. */
  loanSpan?: string[];
  loanYears?: number;
  firstInstalment?: string;
  lastInstalment?: string;
  /** Loan years before the first instalment's year, which the figures may leave out; those left out; the year the figures start. */
  leading: string[];
  skipped: string[];
  start?: string;
  /** When the loan's first year has no instalment: the years the figures may start in, the one chosen, and whether that is still to answer. */
  startChoices: string[];
  chosenStart?: string;
  startNeeded: boolean;
}

const fyOfMonth = (ym: string) => fyOf(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)));

/** The years of the figures: typed for own figures; for projections, the years the loan runs over, and any added. */
export function yearsOf(s: State): Years {
  if (s.source === 'own') {
    const first = parseFy(s.firstYear), count = numberOf(s.yearCount), needs: string[] = [];
    if (!first) needs.push('The first year, like 2026-27');
    if (count === undefined || !Number.isInteger(count) || count < 1 || count > MAX_YEARS) needs.push(`The number of years, 1 to ${MAX_YEARS}`);
    return { years: needs.length ? [] : fyRange(first as string, count as number), needs, leading: [], skipped: [], startChoices: [], startNeeded: false };
  }
  const t = loanTimeline(loanInput(s));
  if ('needs' in t) return { years: [], needs: [], leading: [], skipped: [], startChoices: [], startNeeded: false }; // the loan's own needs say what is missing
  const all = fyRange(t.years[0], Math.min(MAX_YEARS, Math.max(t.years.length, s.planYears ?? 0)));
  const due = fyOfMonth(t.firstInstalment), leading = t.years.filter((fy) => fy < due);
  // A first year with interest only (a loan drawn late in the year) may come before the operations the figures describe.
  const startChoices = leading.length ? [t.years[0], ...leading.slice(1), due] : [];
  const chosen = s.planStart === LOAN_YEAR && startChoices.length ? startChoices[0]
    : s.planStart !== undefined && startChoices.includes(s.planStart) ? s.planStart : undefined;
  const skip = chosen && chosen > t.years[0] ? all.indexOf(chosen) : 0;
  return {
    years: all.slice(skip), needs: [], loanSpan: t.years, loanYears: t.years.length - skip,
    firstInstalment: t.firstInstalment, lastInstalment: t.lastInstalment,
    leading, skipped: all.slice(0, skip), ...(skip ? { start: chosen } : {}),
    startChoices, ...(chosen ? { chosenStart: chosen } : {}), startNeeded: startChoices.length > 0 && !chosen,
  };
}

/**
 * Start the figures in a later year (or back at the loan's first year when `start` is undefined). What was typed moves
 * with its year, so each figure stays under the year it was typed for; one figure for every year stays as it is.
 */
export function withPlanStart(s: State, start?: string): State {
  const next: State = { ...s, planStart: start }, shift = yearsOf(next).skipped.length - yearsOf(s).skipped.length;
  if (!shift) return next;
  // Only a figure typed for each year moves; one figure (for every year, or the first year of a rule) stays first.
  const byYear = new Set(rowsOf(s).filter((r) => modeOf(s, r) === 'years').map((r) => r.key));
  const cells = Object.fromEntries(Object.entries(s.cells).map(([k, v]) =>
    [k, !byYear.has(k) ? v : shift > 0 ? v.slice(shift) : [...Array<string>(-shift).fill(''), ...v]]));
  return { ...next, cells };
}

/** An assumption the answer still rests on: what, as assumed, why, and where on the page to change it. */
export interface AssumedLine { id: string; what: string; shown: string; why: string; where: string }

const WHERE: Record<string, string> = {
  method: 'method', target: 'target', tax: 'row-taxPct', proprietorTax: 'row-taxPct', margin: 'row-pbdit', asset: 'row-assetIncome',
  depreciation: 'row-depreciation', interest: 'row-interestOther', interestNone: 'row-interestOther', otherLoans: 'row-otherLoans', nonCash: 'row-nonCash',
  start: 'start-question', loanStart: 'fld-disbursed', promoters: 'fld-lender-promoters-0',
};

/** The assumptions (engine/data/defaults.json) still as assumed; one that makes no difference to these figures is not listed. */
export function assumedIn(s: State, y: Years = yearsOf(s)): AssumedLine[] {
  // Only a page that started from the assumptions has any; answers given from a blank start are the user's own.
  if (!s.assume) return [];
  const plan = s.source === 'plan', at = (key: string) => s.modes[key] === ASSUMED_MODES[key];
  const target = assumedValue<Target>('target');
  const holds: Record<string, boolean> = {
    method: s.method === assumedValue<string>('method'),
    target: numberOf(s.target.average) === target.average && numberOf(s.target.minimum) === target.minimum,
    tax: plan && at('taxPct') && numberOf(s.cells.taxPct?.[0]) === assumedValue<number>('tax'),
    proprietorTax: plan && s.modes.taxPct === 'borrower' && s.borrower === 'proprietor',
    margin: plan && at('pbdit'),
    asset: plan && at('assetIncome'),
    depreciation: plan && at('depreciation'),
    interest: plan && at('interestOther'),
    interestNone: plan && !!s.door && s.modes.interestOther === 'none',
    loanStart: plan && !!s.door && s.loan.disbursed === s.door.month && s.loan.moratoriumMonths === '0' && s.loan.repayment === 'emi',
    otherLoans: plan && at('otherLoans'),
    nonCash: plan && at('nonCash') && (definitionOf(s)?.leases !== 'yes' || at('leaseRentals')),
    start: plan && s.planStart === LOAN_YEAR && y.startChoices.length > 0,
    promoters: plan && !(s.lender?.promoters ?? []).some((t) => t.trim()),
  };
  return DEFAULTS.assumptions.filter((a) => holds[a.id]).map((a) => ({ id: a.id, what: a.what, shown: a.shown, why: a.why, where: WHERE[a.id] }));
}

// ---- The preview ----

/** One line of the DSCR statement: a figure for each year, in words (`values`) and as the engine gave it (`n`, for the Excel copy). */
/** A line of the statement: the words for each year, the engine's exact figures in `n`, and its Total column. */
export interface Line {
  label: string; values: string[]; n?: (number | undefined)[]; kind?: 'head' | 'total' | 'ratio';
  id?: 'pbdit' | 'asset' | 'pbt' | 'tax' | 'available' | 'emis' | 'service' | 'dscr';
  total?: { text: string; n: number };
}
/**
 * The statement as chartered accountants lay it out: the years across, the working down. `total` when the average is
 * total A ÷ total B: a Total column of the years counted (`sub` says so when a year is not counted).
 */
export interface StatementView { years: string[]; counted: boolean[]; lines: Line[]; total?: { sub?: string } }
type Money<K extends string> = Record<K, string> & { n: Record<K, number> };
/** A month and a year of the schedule: rounded rupees in words, and the engine's exact figures in `n`. */
export type MonthView = Money<'opening' | 'interest' | 'principal' | 'paid' | 'closing'> & { ym: string; month: string; instalment?: number };
export type ScheduleYear = Money<'interest' | 'principal' | 'closing'> & { fy: string; months: MonthView[] };
/** The repayment schedule: the instalment in words, then each year with its months. */
export interface ScheduleView { level: string; years: ScheduleYear[] }

export interface Preview {
  /** The start questions are answered, so the figures can be asked. */
  started: boolean;
  needs: string[];
  /** The assumptions the answer still rests on. */
  assumed: AssumedLine[];
  blocked?: string;
  statement?: StatementView;
  schedule?: ScheduleView;
  average?: string;
  /** The engine's average, unrounded, for the Excel copy's Check sheet. */
  averageN?: number;
  lowest?: string;
  lowestYear?: string;
  notCounted?: string;
  notes: string[];
  /** `missed`: how many of the targets fall short, for the plain head (OR3). */
  verdict?: { meets: boolean; text: string; missed: number };
  /** Largest loan on these terms; `amount` when it differs from the one entered, to offer it. */
  largest?: { text: string; amount?: number };
  fewest?: { text: string; instalments?: number };
  /** The loan's years with interest only and no instalment, and that interest, to ask which year the figures start in. */
  leadingInterest?: { fy: string; amount: string }[];
  /** The years left out because the figures start later, in words. */
  beforeStart?: string;
  /** The instalment (the EMI, or the first instalment) and the interest over the whole loan, in words. */
  loanLine?: { instalment: string; totalInterest: string };
  /** A year that pays fewer instalments than a full year: "7 of 12 instalments". */
  partYears?: Record<string, string>;
  /** Each year's DSCR against the target for the lowest year, while one is set. */
  marks?: { fy: string; dscr: string; meets: boolean; counted: boolean }[];
  /** DSCR as lenders test it, beside the borrower's: it never changes the verdict (D-UX-47). */
  lender?: LenderView;
}

/** A DSCR line beside the borrower's: average and lowest year, `below` under 1.00 (the cash does not cover the debt service). */
export interface LenderLine {
  label: string; average: string; lowest: string; lowestYear: string; below: boolean; meets?: boolean; low: number;
  /** The engine's figures behind the words, for the Excel copy. */
  n: { average: number; lowest: number };
}
/** A year of the cash check in words, with the engine's figures in `n` (the cover absent where there is no debt service). */
export interface CashRowView {
  fy: string; available: string; wc: string; capex: string; service: string; left: string; cover: string; short: boolean;
  n: { available: number; wc: number; capex: number; service: number; left: number; cover?: number };
}
/** A line of the last audited year beside the first year of figures; `n` and `nNext` the engine's figures (a margin in per cent). */
export interface AuditedRowView { id: string; label: string; audited: string; next?: string; n: number; nNext?: number }
/** A year of the DSCR with promoters' loans repaid: words, and the engine's figures in `n`. */
export interface PromoterYearView { fy: string; counted: boolean; available: string; repaid: string; service: string; dscr: string; n: { available: number; repaid: number; service: number; dscr?: number } }
export interface LenderView {
  /** The two stress lines, or what they need (`ask` when only sales are missing). */
  stress: LenderLine[]; ask?: string; needs: string[];
  notStressed?: string;
  /** Promoters' loans: the assumption while none is repaid, else the DSCR with the repayment counted. */
  promoters: { assumed: string } | { line: LenderLine; years: PromoterYearView[] };
  /** Shown once any of its figures is typed. */
  cash?: { rows: CashRowView[]; text: string } | { needs: string[] };
  audited?: { fy: string; nextFy?: string; rows: AuditedRowView[]; flags: string[] } | { needs: string[] };
  blocked?: string;
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const monthText = (ym: string) => `${MONTH_NAMES[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
export const monthShort = (ym: string) => `${MONTH_NAMES[Number(ym.slice(5, 7)) - 1].slice(0, 3)} ${ym.slice(0, 4)}`;
const andList = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}` : xs[0] ?? '');
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** When the loan's instalments fall, read back in words so the moratorium can be checked. */
export function loanRead(y: Years): string {
  const l = y.loanSpan;
  if (!y.firstInstalment || !y.lastInstalment || !l?.length) return '';
  const span = l.length > 1 ? `${l[0]} to ${l[l.length - 1]}` : l[0];
  return y.firstInstalment === y.lastInstalment
    ? `One instalment, at the end of ${monthText(y.firstInstalment)}. The loan runs over ${span}.`
    : `First instalment at the end of ${monthText(y.firstInstalment)}, the last at the end of ${monthText(y.lastInstalment)}. The loan runs over ${span}.`;
}

/** A target as typed: 1.5 → 1.50, 1.255 stays 1.255. */
export const targetText = (t: number) => (Math.abs(t * 100 - Math.round(t * 100)) < 1e-9 ? t.toFixed(2) : String(t));

/** A DSCR to two decimals, or four where two would put it on the wrong side of the target (1.4996 against 1.50). */
export function ratioText(x: number, target?: number): string {
  const two = x.toFixed(2);
  return target !== undefined && Number.isFinite(target) && x < target !== Number(two) < target ? x.toFixed(4) : two;
}

/**
 * Engine needs like "Depreciation for 2026-27", grouped: "Depreciation for 2026-27 and 2027-28", or "for every year".
 * Figures follow the order of the rows (`labels`); anything else keeps its place ahead of them.
 */
export function groupNeeds(needs: string[], years: string[], labels: string[] = []): string[] {
  const groups = new Map<string, { head: string; tail: string; fys: string[] }>(), order: string[] = [];
  for (const n of needs) {
    const m = /^(.*) for (\d{4}-\d{2})(.*)$/.exec(n), key = m ? `${m[1]}\u0000${m[3]}` : n;
    if (!groups.has(key)) { groups.set(key, { head: m ? m[1] : n, tail: m ? m[3] : '', fys: [] }); order.push(key); }
    if (m) groups.get(key)!.fys.push(m[2]);
  }
  order.sort((a, b) => labels.indexOf(groups.get(a)!.head) - labels.indexOf(groups.get(b)!.head));
  return order.map((k) => {
    const g = groups.get(k)!;
    if (!g.fys.length) return g.head;
    return `${g.head} for ${years.length > 1 && g.fys.length === years.length ? 'every year' : andList(g.fys)}${g.tail}`;
  });
}

const limitedBy = (l: Limit) =>
  l.kind === 'minimum' ? `the lowest year, ${l.fy}` : l.kind === 'average' ? 'the average' : `cash available in ${l.fy}`;

/** Whether the statement meets the target and, if not, what falls short: the lowest year, the average, or both. */
function verdictOf(st: Statement, t: Target): Preview['verdict'] {
  if (!st.minimum || st.average === undefined) return undefined; // no year counts; the engine's note says why
  const dry = shortfall(st, {});
  if (dry) return { meets: false, missed: 1, text: `${verdictWords('target', 1, 1)}: ${limitText(dry)}.` };
  const parts: { ok: boolean; text: string }[] = [];
  if (t.minimum !== undefined)
    parts.push({ ok: !shortfall(st, { minimum: t.minimum }), text: `the lowest year, ${st.minimum.fy}, is ${ratioText(st.minimum.dscr, t.minimum)} against ${targetText(t.minimum)}` });
  if (t.average !== undefined)
    parts.push({ ok: !shortfall(st, { average: t.average }), text: `the average is ${ratioText(st.average, t.average)} against ${targetText(t.average)}` });
  const short = parts.filter((p) => !p.ok);
  return short.length
    ? { meets: false, missed: short.length, text: `${verdictWords('target', parts.length, short.length)}: ${short.map((p) => p.text).join('; ')}.` }
    : { meets: true, missed: 0, text: `${verdictWords('target', parts.length, 0)}: ${parts.map((p) => p.text).join('; ')}.` };
}

const lower = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

/**
 * The statement's lines, from the engine's figures: the profit build-up when the page works it out, then A, B, DSCR. With
 * the average by totals, each line carries its total over the years counted, and the DSCR line the average.
 */
function statementView(st: Statement, t: Target, def: Definition, parts: YearFigures[], profit?: ProfitYear[], profitTotal?: ProfitTotals): StatementView {
  const sums = def.average === 'totals' && st.total && st.average !== undefined ? st.total : undefined;
  const sum = (n?: number) => (sums && n !== undefined ? { total: { text: inr(n), n } } : {});
  const amounts = (n: (number | undefined)[], total?: number) => ({ values: n.map((x) => inr(x)), n, ...sum(total) });
  const { available } = componentsOf(def), lines: Line[] = [];
  // Existing EMIs and the new asset's income are lines only where they are not nil in every year.
  const service = [...componentsOf(def).service, ...(profit ? PLAN_SERVICE.filter((c) => parts.some((y) => (y[c] ?? 0) !== 0)) : [])];
  if (profit) {
    const pc = (k: Exclude<keyof ProfitYear, 'fy'>) => amounts(profit.map((y) => y[k]), profitTotal?.[k]);
    lines.push(
      { label: 'Profit', values: [], kind: 'head' },
      { label: PROJECTION_LABELS.pbdit, ...pc('pbdit'), id: 'pbdit' },
      ...(profit.some((y) => y.assetIncome !== 0) ? [{ label: 'Add: extra income from the new asset', ...pc('assetIncome'), id: 'asset' } as Line] : []),
      { label: 'Less: depreciation', ...pc('depreciation') },
      { label: 'Less: other non-cash charges', ...pc('nonCash') },
      { label: 'Less: interest on term loans', ...pc('interestTL') },
      { label: 'Less: interest on working capital', ...pc('interestOther') },
      { label: 'Profit before tax', ...pc('pbt'), kind: 'total', id: 'pbt' },
      { label: 'Less: tax', ...pc('tax'), id: 'tax' },
      { label: 'Profit after tax', ...pc('pat'), kind: 'total' },
    );
  }
  const figure = (c: Component) => amounts(parts.map((y) => y[c]), sums?.figures[c]);
  lines.push({ label: 'Cash available for debt service', values: [], kind: 'head' });
  available.forEach((c, i) => lines.push({ label: i ? `Add: ${lower(COMPONENTS[c])}` : COMPONENTS[c], ...figure(c) }));
  lines.push(
    { label: 'Cash available (A)', ...amounts(st.rows.map((r) => r.available), sums?.available), kind: 'total', id: 'available' },
    { label: 'Debt service', values: [], kind: 'head' },
    ...service.map((c): Line => ({ label: COMPONENTS[c], ...figure(c), ...(c === 'existingEmis' ? { id: 'emis' as const } : {}) })),
    { label: 'Debt service (B)', ...amounts(st.rows.map((r) => r.service), sums?.service), kind: 'total', id: 'service' },
    {
      label: 'DSCR (A ÷ B)', values: st.rows.map((r) => (r.dscr === undefined ? '—' : ratioText(r.dscr, r.counted ? t.minimum : undefined))), n: st.rows.map((r) => r.dscr),
      kind: 'ratio', id: 'dscr', ...(sums ? { total: { text: ratioText(st.average as number, t.average), n: st.average as number } } : {}),
    },
  );
  return {
    years: st.rows.map((r) => r.fy), counted: st.rows.map((r) => r.counted), lines,
    ...(sums ? { total: st.rows.every((r) => r.counted) ? {} : { sub: 'years counted' } } : {}),
  };
}

function fillStatement(p: Preview, st: Statement, t: Target, def: Definition, parts: YearFigures[], profit?: ProfitYear[], profitTotal?: ProfitTotals) {
  p.statement = statementView(st, t, def, parts, profit, profitTotal);
  if (t.minimum !== undefined) p.marks = st.rows.filter((r) => r.dscr !== undefined)
    .map((r) => ({ fy: r.fy, dscr: ratioText(r.dscr as number, t.minimum), meets: (r.dscr as number) >= (t.minimum as number), counted: r.counted }));
  const skipped = st.rows.filter((r) => !r.counted).map((r) => r.fy);
  if (skipped.length && st.rows.length > skipped.length)
    p.notCounted = `Not counted: ${andList(skipped)} (${def.years === 'repayment' ? 'no term-loan instalment' : 'no interest or instalments due'}).`;
  if (st.average !== undefined && st.minimum) {
    p.average = ratioText(st.average, t.average);
    p.averageN = st.average;
    p.lowest = ratioText(st.minimum.dscr, t.minimum);
    p.lowestYear = st.minimum.fy;
  }
  p.notes = st.notes;
}

const rupees = (n: number) => rs(n, Math.abs(n - Math.round(n)) < 0.005 ? 0 : 2);

/** Rounded rupees for the screen, with the exact figures beside them. */
function money<K extends string>(from: Record<K, number>, keys: readonly K[]): Money<K> {
  const words = Object.fromEntries(keys.map((k) => [k, inr(from[k])])) as Record<K, string>;
  return { ...words, n: Object.fromEntries(keys.map((k) => [k, from[k]])) as Record<K, number> };
}

/** The repayment schedule in words and rupees: every month, grouped by financial year with the year's totals. */
function scheduleView(a: Amortization, repayment?: Repayment): ScheduleView {
  return {
    level: repayment === 'emi'
      ? `EMI ${rs(a.level, 2)} a month, interest included; banks round it up to the next rupee.`
      : `Principal ${rupees(a.level)} a ${repayment === 'quarterly' ? 'quarter' : 'month'}, and interest on the balance every month.`,
    years: a.years.map((y) => ({
      fy: y.fy, ...money(y, ['interest', 'principal', 'closing'] as const),
      months: a.months.filter((m) => m.fy === y.fy).map((m) => ({
        ym: m.month, month: monthShort(m.month), ...money(m, ['opening', 'interest', 'principal', 'paid', 'closing'] as const),
        ...(m.instalment ? { instalment: m.instalment } : {}),
      })),
    })),
  };
}

export function preview(s: State): Preview {
  const p: Preview = { started: false, needs: startNeeds(s), assumed: [], notes: [] };
  const def = definitionOf(s);
  if (p.needs.length || !complete(def)) return p;
  p.started = true;
  const rows = rowsOf(s), y = yearsOf(s), target = targetOf(s), tNeeds = targetNeeds(target), labels = rows.map((x) => x.label);
  p.assumed = assumedIn(s, y);
  // Rows are asked only once there are years to ask them for.
  const vals = rows.map((r) => (y.years.length ? rowValues(s, r, y.years) : { values: [], needs: [] } as RowValues));
  const figures = (i: number) => Object.fromEntries(rows.map((r, k) => [r.key, vals[k].values[i]]));
  p.blocked = vals.find((v) => v.blocked)?.blocked;
  /** The engine's needs with each row's own: a row worked out from one or two answers names what is missing once. */
  const merged = (engine: string[]) => {
    const ruled = rows.filter((_, k) => vals[k].needs.length).map((r) => r.label);
    const lines = groupNeeds(engine.filter((n) => !ruled.some((l) => n.startsWith(`${l} for `))), y.years, labels);
    const rowOf = (line: string) => labels.find((l) => line.startsWith(`${l} for `));
    // Rows answered together ask once ("Loans already running: none, or how much").
    return [...new Set([...lines.filter((l) => !rowOf(l)), ...rows.flatMap((r, k) => (vals[k].needs.length ? vals[k].needs : lines.filter((l) => rowOf(l) === r.label)))])];
  };

  if (s.source === 'own') {
    if (y.needs.length) { p.needs.push(...y.needs, ...tNeeds); return p; }
    const own = y.years.map((fy, i) => ({ fy, ...figures(i) }) as YearFigures), r = dscrStatement(own, def);
    if ('needs' in r) p.needs.push(...merged(r.needs));
    else if ('blocked' in r) p.blocked ??= r.blocked;
    else {
      fillStatement(p, r, target, def, own);
      if (!tNeeds.length) p.verdict = verdictOf(r, target);
    }
    p.needs.push(...tNeeds);
    return p;
  }

  const loan = loanInput(s);
  // The repayment schedule needs only the loan terms, so it is shown before the projections are in.
  const am = amortization(loan);
  if ('months' in am) {
    p.schedule = scheduleView(am, s.loan.repayment);
    const first = am.months.find((m) => m.instalment), perYear = loan.frequency === 'quarterly' ? 4 : 12;
    p.loanLine = {
      instalment: loan.style === 'emi' ? `EMI ${rs(am.level, 2)} a month` : `First instalment ${rs(first?.paid ?? 0)}, then less as the balance falls`,
      totalInterest: rs(am.totalInterest),
    };
    const count = new Map<string, number>();
    for (const m of am.months) if (m.instalment) count.set(m.fy, (count.get(m.fy) ?? 0) + 1);
    p.partYears = Object.fromEntries([...count].filter(([, n]) => n < perYear).map(([fy, n]) => [fy, `${n} of ${perYear} instalments`]));
  }
  else if ('blocked' in am) p.blocked = am.blocked;
  if ('months' in am && y.leading.length)
    p.leadingInterest = am.years.filter((d) => y.leading.includes(d.fy)).map((d) => ({ fy: d.fy, amount: rs(d.interest) }));
  // By who the borrower is, the tax is worked out for that borrower in place of a rate.
  const tax = rows.find((r) => r.key === 'taxPct'), taxBy = tax && modeOf(s, tax) === 'borrower' ? borrowerOf(s.borrower)?.id : undefined;
  const proj = y.years.map((fy, i) => ({ fy, ...figures(i), ...(taxBy ? { taxBy } : {}) }) as ProjectionYear);
  const r = planStatement(proj, loan, def, y.start);
  // A first year with interest only may come before the operations the figures describe: which year the figures start in
  // decides what the first year's figure means: it is asked, unless the loan's first year is assumed (D-UX-08).
  if (y.startNeeded) p.needs.push(`The first year of your figures: ${y.startChoices.join(' or ')}`);
  // Until the loan's dates are in there are no years to ask for; the loan's own needs say what is missing.
  if ('needs' in r) p.needs.push(...oneRepaymentNeed(merged(r.needs.filter((n) => y.years.length || n !== 'At least one year of figures'))));
  else if ('blocked' in r) p.blocked ??= r.blocked;
  else if (!y.startNeeded) {
    fillStatement(p, r.statement, target, def, r.years, r.profit, r.profitTotal);
    if (!tNeeds.length) p.verdict = verdictOf(r.statement, target);
    const b = r.beforeStart;
    if (b.length) p.beforeStart = `Left out: ${andList(b.map((x) => x.fy))}, before your figures start. ${b.length > 1 ? 'Their' : 'Its'} interest `
      + `(${andList(b.map((x) => rs(x.interest)))}) is taken as paid from the project cost (capitalised), not from profits.`;
    p.lender = lenderView(s, proj, loan, def, y, r, target);
  }
  p.needs.push(...tNeeds);
  if (tNeeds.length || !y.years.length || p.blocked || y.startNeeded) return p;

  const { amount, ...terms } = loan;
  const most = maxLoanAmount(proj, terms, def, target, y.start);
  if ('amount' in most) p.largest = {
    text: `The largest loan on these terms is ${rs(most.amount)}, limited by ${limitedBy(most.limitedBy)}.`,
    ...(most.amount !== amount ? { amount: most.amount } : {}),
  };
  else if ('none' in most) p.largest = { text: most.none };
  else if ('blocked' in most) p.blocked = most.blocked;

  if (amount !== undefined) {
    // On the front door the later years follow the growth, so the repayment may run past the years shown, within the
    // longest term (MV5: the same years as Make it viable).
    const long = dscrCaseOf(s)?.proj, past = !!long && long.length > proj.length;
    const few = shortestRepayment(long ?? proj, { ...loan, instalments: undefined }, def, target, y.start);
    if (past && ('none' in few || ('instalments' in few
      && (loan.moratoriumMonths ?? 0) + few.instalments * PERIOD_MONTHS[loan.frequency ?? 'monthly'] > LEVELS.term.longestMonths))) {
      p.fewest = { text: `No repayment within ${LEVELS.term.longestMonths} months meets the target.` };
    } else if ('instalments' in few) p.fewest = {
      text: `The fewest instalments for ${rs(amount)} are ${few.instalments} ${loan.frequency === 'quarterly' ? 'quarterly' : 'monthly'}.`,
      ...(few.instalments !== loan.instalments ? { instalments: few.instalments } : {}),
    };
    else if ('none' in few) p.fewest = { text: few.none };
    else if ('blocked' in few) p.blocked = few.blocked;
  }
  return p;
}

// ---- Make it viable (MV5, D-UX-57) ----

/** The projections for the given years, or none while any row needs a figure for them. */
function projFor(s: State, years: string[]): ProjectionYear[] | undefined {
  const rows = rowsOf(s), vals = rows.map((r) => rowValues(s, r, years));
  if (vals.some((v) => v.needs.length || v.blocked)) return undefined;
  const tax = rows.find((r) => r.key === 'taxPct'), taxBy = tax && modeOf(s, tax) === 'borrower' ? borrowerOf(s.borrower)?.id : undefined;
  return years.map((fy, i) => ({ fy, ...Object.fromEntries(rows.map((r, k) => [r.key, vals[k].values[i]])), ...(taxBy ? { taxBy } : {}) }) as ProjectionYear);
}

/** The case "Make it viable" works on: the projections through the last year a 180-month term could reach (only the
 * years shown while a row is typed year by year), once the loan, the method and the target are in. */
export function dscrCaseOf(s: State): DscrCase | undefined {
  const def = definitionOf(s), y = yearsOf(s), target = targetOf(s), l = loanInput(s);
  if (s.source !== 'plan' || !complete(def) || !y.years.length || y.startNeeded || targetNeeds(target).length) return undefined;
  if ([l.amount, l.ratePct, l.moratoriumMonths, l.instalments].some((x) => x === undefined || !Number.isFinite(x)) || !l.disbursed || !l.style || !l.frequency) return undefined;
  const loan = l as LoanTerms, end = monthAfter(loan.disbursed, LEVELS.term.longestMonths - 1), last = fyOf(end.year, end.month);
  const count = Number(last.slice(0, 4)) - Number(y.years[0].slice(0, 4)) + 1;
  // A row typed year by year has no figure past the years typed: then only the years shown.
  const long = projFor(s, fyRange(y.years[0], Math.max(y.years.length, count)));
  const keys = long ? (Object.keys(long[0]) as (keyof ProjectionYear)[]).filter((k) => long[0][k] !== undefined) : [];
  const full = long?.every((x) => keys.every((k) => x[k] !== undefined));
  const proj = (full ? long : undefined) ?? projFor(s, y.years);
  return proj && { proj, shown: y.years.length, loan, def, target, ...(y.start ? { start: y.start } : {}) };
}

// ---- DSCR as lenders test it (D1, D-UX-47) ----

const pct1 = (x: number) => `${(x * 100).toFixed(1)}%`;

/** Sales for each year: they follow the profit's row, growing at its rate, the same every year, or typed for each year. */
export function salesByYear(s: State, years: string[]): (number | undefined)[] {
  const t = s.lender?.sales ?? [], r = rowsOf(s).find((x) => x.key === 'pbdit'), mode = r && modeOf(s, r);
  if (mode === 'years') return years.map((_, i) => amountOf(t[i]));
  const first = amountOf(t[0]);
  if (first === undefined || (mode !== 'grow' && mode !== 'same')) return years.map(() => undefined);
  const out = series({ kind: mode, first, pct: numberOf(s.rates.pbdit) }, years.length, 'Sales', years[0] ?? '');
  return Array.isArray(out) ? out : years.map(() => undefined);
}

function lenderLine(label: string, x: Summary, target?: Target): LenderLine | undefined {
  if (x.average === undefined || !x.minimum) return undefined;
  const floor = LENDER.floor.value;
  return {
    label, average: ratioText(x.average, target?.average ?? floor), lowest: ratioText(x.minimum.dscr, target?.minimum ?? floor), lowestYear: x.minimum.fy,
    below: x.minimum.dscr < floor, low: x.minimum.dscr, n: { average: x.average, lowest: x.minimum.dscr }, ...(target ? { meets: !shortfall({ ...x, notes: [] }, target) } : {}),
  };
}

/** The lines beside the borrower's DSCR, each from the engine; none of them changes the verdict. */
function lenderView(s: State, proj: ProjectionYear[], loan: LoanInput, def: Definition, y: Years, plan: Plan, target: Target): LenderView {
  const l = s.lender ?? NO_LENDER, sales = salesByYear(s, y.years);
  const extra: LenderYear[] = y.years.map((fy, i) => ({
    fy, ...(sales[i] !== undefined ? { sales: sales[i] } : {}),
    // A year left blank among the repayments is none: the field says so.
    promoterLoans: amountOf(l.promoters[i]) ?? 0, ...(amountOf(l.capex) !== undefined ? { capex: amountOf(l.capex) } : {}),
  }));
  const v: LenderView = { stress: [], needs: [], promoters: { assumed: LENDER.promoters.assumed } };
  const st = stressTests(proj, loan, def, extra, y.start);
  if ('blocked' in st) v.blocked = st.blocked;
  else if ('needs' in st) {
    if (!l.sales.some((t) => t.trim())) v.ask = `Add this year's sales under More options to see the DSCR with the ${LENDER.stress.map((c) => c.label.toLowerCase()).join(' and with ')}.`;
    else v.needs = st.needs;
  }
  else v.stress = st.flatMap((x) => lenderLine(x.label, x) ?? []);
  if (proj.some((p) => (p.assetIncome ?? 0) > 0)) v.notStressed = LENDER.notStressed;
  const pr = promotersRepaid(proj, loan, def, extra, y.start);
  if (pr && 'blocked' in pr) v.blocked ??= pr.blocked;
  else if (pr && 'needs' in pr) v.needs.push(...pr.needs);
  else if (pr) {
    const line = lenderLine(LENDER.promoters.repaid, pr, target.average !== undefined && target.minimum !== undefined ? target : undefined);
    const by = new Map(extra.map((e) => [e.fy, e.promoterLoans ?? 0]));
    if (line) v.promoters = { line, years: pr.rows.map((r) => {
      const repaid = by.get(r.fy) ?? 0;
      return { fy: r.fy, counted: r.counted, available: rs(r.available), repaid: rs(repaid), service: rs(r.service), dscr: r.dscr === undefined ? '—' : ratioText(r.dscr, LENDER.floor.value),
        n: { available: r.available, repaid, service: r.service, ...(r.dscr !== undefined ? { dscr: r.dscr } : {}) } };
    }) };
  }
  if (l.wcPct.trim() || l.capex.trim()) {
    const c = cashCheck(plan, extra, numberOf(l.wcPct), amountOf(l.audited.sales));
    if ('blocked' in c) v.blocked ??= c.blocked;
    else if ('needs' in c) v.cash = { needs: c.needs };
    else v.cash = {
      rows: c.rows.map((r) => ({
        fy: r.fy, available: rs(r.available), wc: rs(r.wcGrowth), capex: rs(r.capex), service: rs(r.service), left: rs(r.left),
        cover: r.cover !== undefined ? ratioText(r.cover, LENDER.floor.value) : 'not counted', short: r.left < 0,
        n: { available: r.available, wc: r.wcGrowth, capex: r.capex, service: r.service, left: r.left, ...(r.cover !== undefined ? { cover: r.cover } : {}) },
      })),
      text: c.short.length ? `Cash falls short of the instalments in ${andList(c.short)}, after working capital and replacement capex.`
        : `Cash covers the instalments every year, after working capital and replacement capex${c.lowest ? `: lowest cover ${ratioText(c.lowest.cover, LENDER.floor.value)} in ${c.lowest.fy}` : ''}.`,
    };
  }
  if (Object.values(l.audited).some((t) => t.trim())) {
    const typed = Object.fromEntries(Object.entries(l.audited).map(([k, t]) => [k, amountOf(t)])) as AuditedInput;
    const first = plan.years[0], i = y.years.indexOf(first?.fy ?? '');
    const a = auditedYear(typed, first && { fy: first.fy, pbdit: proj[i]?.pbdit, sales: sales[i] });
    if ('blocked' in a) v.blocked ??= a.blocked;
    else if ('needs' in a) v.audited = { needs: a.needs };
    else {
      const n = a.next, f = proj[i];
      v.audited = {
        fy: a.fy, ...(n ? { nextFy: n.fy } : {}), flags: a.flags,
        rows: [
          { id: 'sales', label: 'Sales', audited: rs(a.sales), n: a.sales, ...(n ? { next: `${rs(sales[i] as number)} (${n.salesGrowth >= 0 ? '+' : ''}${pct1(n.salesGrowth)})`, nNext: sales[i] as number } : {}) },
          { id: 'pbdit', label: PROJECTION_LABELS.pbdit, audited: rs(a.pbdit), n: a.pbdit, ...(n && f ? { next: rs(f.pbdit as number), nNext: f.pbdit as number } : {}) },
          { id: 'margin', label: 'Margin (that profit ÷ sales)', audited: pct1(a.margin), n: a.margin * 100, ...(n ? { next: pct1(n.margin), nNext: n.margin * 100 } : {}) },
          { id: 'depreciation', label: 'Depreciation', audited: rs(a.depreciation), n: a.depreciation },
          { id: 'interest', label: 'Interest', audited: rs(a.interest), n: a.interest },
          { id: 'pbt', label: 'Profit before tax', audited: rs(a.pbt), n: a.pbt },
          { id: 'tax', label: 'Tax', audited: rs(a.tax), n: a.tax },
          { id: 'pat', label: 'Profit after tax', audited: rs(a.pat), n: a.pat },
          { id: 'accrual', label: 'Cash accrual (profit after tax + depreciation)', audited: rs(a.accrual), n: a.accrual },
        ],
      };
    }
  }
  return v;
}

/** The answer so far, in one line, for the bar that stays in view. */
export function barText(p: Preview): string {
  if (p.blocked) return 'No figures: the two computations disagree.';
  const parts: string[] = [];
  if (p.average) parts.push(`Average ${p.average}`, `lowest ${p.lowest} in ${p.lowestYear}`);
  if (p.verdict) parts.push(workWords(p.verdict.missed).toLowerCase());
  parts.push(p.needs.length ? questionsLeft(p.needs.length) : statusText(p).toLowerCase());
  return cap(parts.join(' · '));
}

/** "All answered", or "All answered, on 7 assumptions" while any still holds. */
/** The front door's needs by the labels it shows, in its order, each linked to its field (design review 5, UX4). */
export const FRONT: [RegExp, string, string][] = [
  [/^Who the borrower is/, 'Who is the borrower?', 'fld-fd-borrower'],
  [/^(This year’s profit|Profit before interest, depreciation and tax (in|for) )/, 'This year’s profit before interest, depreciation and tax', 'fld-fd-profit'],
  [/^(Growth in sales|Profit before interest, depreciation and tax: growth)/, 'Growth in sales a year (%)', 'fld-fd-growth'],
  [/^Loan amount$/, 'Loan amount', 'fld-fd-amount'],
  [/^Interest rate/, 'Interest rate (% a year)', 'fld-fd-rate'],
  [/^Number of instalments$/, 'Years to repay', 'fld-fd-years'],
];
export const frontAt = (n: string, first?: string) => FRONT.findIndex(([m], i) => m.test(n) && (i !== 1 || !first || !/\d{4}-\d{2}$/.test(n) || n.endsWith(first)));
/** On the front door every missing fact shows at once: the profit and its growth before the loan's dates give the years. */
export const withFrontNeeds = (s: State, p: Preview, first?: string): Preview => {
  if (s.source !== 'plan' || !s.door || !p.needs.length) return p;
  const needs = [...p.needs], grows = (s.modes.pbdit ?? 'grow') === 'grow';
  if (grows && !(s.cells.pbdit?.[0] ?? '').trim() && !needs.some((n) => frontAt(n, first) === 1)) needs.push(FRONT[1][1]);
  if (grows && !(s.rates.pbdit ?? '').trim() && !needs.some((n) => frontAt(n, first) === 2)) needs.push(FRONT[2][1]);
  const at = (n: string) => { const i = frontAt(n, first); return i < 0 ? FRONT.length : i; };
  return { ...p, needs: needs.map((n, i) => [n, i] as const).sort((a, b) => at(a[0]) - at(b[0]) || a[1] - b[1]).map(([n]) => n) };
};
export const statusText = (p: Preview) =>
  p.blocked ? 'No figures' : p.needs.length ? questionsLeft(p.needs.length)
    : p.assumed.length ? `${ALL_ANSWERED}, on ${p.assumed.length} assumption${p.assumed.length > 1 ? 's' : ''}` : ALL_ANSWERED;

/** The commonly quoted targets from the data file, offered as examples and used only when chosen. */
export const EXAMPLE_TARGETS = {
  average: BENCHMARKS.find((b) => b.target === 'average'),
  minimum: BENCHMARKS.find((b) => b.target === 'minimum'),
};

/** The choices for one of the four questions, as the data file words them. */
export const choicesOf = (k: OptionKey) =>
  Object.entries(OPTIONS[k].choices as Record<string, { label: string }>).map(([value, c]) => ({ value, label: c.label }));

/** A preset in one line: "Interest on term loans; lease rentals left out; …". */
export const presetText = (id: string) => cap(OPTION_KEYS
  .map((k) => choicesOf(k).find((c) => c.value === (presetOf(id)?.choice as Record<string, string> | undefined)?.[k])?.label.toLowerCase())
  .join('; '));

/** One rate typed for every year. */
export const withTaxRate = (s: State, pct: string): State =>
  ({ ...s, modes: { ...s.modes, taxPct: 'same' }, cells: { ...s.cells, taxPct: [pct, ...(s.cells.taxPct ?? []).slice(1)] } });

/** What the verdict rests on that came from our data, each with how sure it is (D-DATA-25, TRUST1): the method, the
 *  target when it is the examples, the tax when it is worked out by who the borrower is. What the borrower typed is theirs. */
export function dscrMarks(s: State): { what: string; mark: Marked; check: string }[] {
  const out: { what: string; mark: Marked; check: string }[] = [];
  const m = presetOf(s.method);
  if (m) out.push({ what: 'the method', mark: m as Marked, check: 'ask your lender how it works DSCR out' });
  const t = targetOf(s), a = EXAMPLE_TARGETS.average, n = EXAMPLE_TARGETS.minimum;
  const ex = [t.average !== undefined && a && t.average === a.value && a, t.minimum !== undefined && n && t.minimum === n.value && n].filter(Boolean) as Marked[];
  if (ex.length) out.push({ what: 'the target', mark: leastSure(ex), check: 'ask your lender for its own target' });
  const b = s.source === 'plan' && s.modes.taxPct === 'borrower' ? borrowerOf(s.borrower) : undefined;
  if (b) out.push({ what: 'the tax', mark: b, check: 'ask your CA to confirm the tax' });
  return out;
}

/** How sure, in plain words (UXR3, UXR1's P4; the marks of D-DATA-26): "The method: two or more sources agree. The target:
 * an example, not your lender's rule." */
const PLAIN_SURE = { verified: 'checked at its source', 'cross-checked': 'two or more sources agree', illustrative: 'an example, not your lender’s rule', review: 'not yet confirmed at its source' } as const;
export const sureLine = (ms: { what: string; mark: Marked }[]) =>
  ms.map((x) => `${x.what.charAt(0).toUpperCase()}${x.what.slice(1)}: ${PLAIN_SURE[x.mark.sure]}${x.mark.sure === 'verified' && x.mark.read ? ` on ${x.mark.read.split('-').reverse().join('-')}` : ''}.`).join(' ');

/** The one thing to check next once nothing is still to answer: the least sure item the verdict rests on, else the figures typed. */
export const checkNext = (ms: { what: string; mark: Marked; check: string }[]) => {
  const worst = [...ms].sort((x, y) => SURE.indexOf(y.mark.sure) - SURE.indexOf(x.mark.sure))[0];
  return `What to check next: ${worst && worst.mark.sure !== 'verified' ? worst.check : 'the figures you typed, against your accounts'}.`;
};
