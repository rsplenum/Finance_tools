/**
 * The DSCR page: what it asks, and the preview it shows. Pure — no DOM. Every figure comes from engine/dscr.ts; this
 * file only turns typed text into the engine's inputs and the engine's answers into plain words. The page starts from
 * the assumptions in engine/data/defaults.json (the owner's request, D-UX-08), each listed with its reason until it is
 * changed (`assumedIn`); nothing else missing is filled in, and anything else missing is listed as needed.
 */
import DEFAULTS from '../../../engine/data/defaults.json';
import {
  BENCHMARKS, COMPONENTS, LOAN_LABELS, OPTIONS, PRESETS, PROJECTION_LABELS, amortization, componentsOf, dscrStatement, fyRange,
  isFy, limitText, loanTimeline, maxLoanAmount, planStatement, shortestRepayment, shortfall, targetNeeds,
  type Amortization, type Component, type Definition, type Limit, type LoanInput, type ProfitYear, type ProjectionYear, type Statement,
  type Target, type YearFigures,
} from '../../../engine/dscr';
import { fyOf } from '../../../engine/loan';
import { series } from '../../../engine/project';
import { parseAmount, parseMonth } from '../../../engine/parse';
import { TAX_RATES } from '../../../engine/tax';
import { inr, rs } from '../../../engine/util';

export type Source = 'own' | 'plan';
/** A preset's id from the data file, or 'choose' to answer the four choices one by one. */
export type Method = string;
/** One answer for two facts: an EMI is monthly; equal principal is monthly or quarterly. */
export type Repayment = 'emi' | 'monthly' | 'quarterly';
/** How a row is filled: one figure for every year, a first year that grows or falls by a %, a figure for each year, or none. */
export type RowMode = 'same' | 'grow' | 'fall' | 'years' | 'none';
export type OptionKey = keyof Definition;

export interface LoanText {
  amount: string; ratePct: string; disbursed: string; moratoriumMonths: string; instalments: string;
  repayment?: Repayment;
}

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
  /** Started from the assumptions (ASSUMED): switching back to working the figures out puts them back. */
  assume?: boolean;
  /** What only the document needs: asked beside the download, taken once for the PDF and the Excel copy. */
  doc: DocFacts;
}

/** The document's own facts. The borrower's name and the lender are needed; who prepared it is given only if wanted. */
export interface DocFacts { borrower: string; lender: string; preparedBy: string }

/** Nothing answered: what the tests start from. */
export const START: State = {
  choice: {}, firstYear: '', yearCount: '',
  loan: { amount: '', ratePct: '', disbursed: '', moratoriumMonths: '', instalments: '' },
  cells: {}, modes: {}, rates: {}, target: { average: '', minimum: '' }, doc: { borrower: '', lender: '', preparedBy: '' },
};

/** `planStart` when the figures start in the year the loan is first drawn, whichever year that turns out to be. */
export const LOAN_YEAR = 'loan';

type Assumption = (typeof DEFAULTS.assumptions)[number];
const ASSUMPTION = Object.fromEntries(DEFAULTS.assumptions.map((a) => [a.id, a])) as Record<string, Assumption>;
const assumedValue = <T,>(id: string) => ASSUMPTION[id].value as T;

/** How each line is given while its assumption holds: profit grows with sales; depreciation and other interest as this year. */
const ASSUMED_MODES: Record<string, RowMode> = {
  pbdit: 'grow', depreciation: 'same', interestOther: 'same', otherLoans: 'none', nonCash: 'none', leaseRentals: 'none', taxPct: 'same',
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
  /** A loss may be typed with a minus. */
  negative?: boolean;
  percent?: boolean;
  /** One line under the name, where the name alone may not be clear. */
  hint?: string;
}

const row = (key: string, label: string, modes: RowMode[], extra: Partial<RowDef> = {}): RowDef => ({ key, label, modeKey: key, modes, ...extra });
const OPTIONAL: RowMode[] = ['none', 'same', 'years'];

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
    row('depreciation', L.depreciation, ['same', 'fall', 'years'], { hint: 'The same every year (straight line), or falling by its rate (written-down value).' }),
    row('nonCash', L.nonCash, OPTIONAL, { ask: true, hint: HINTS.nonCash }),
    row('interestOther', L.interestOther, ['none', 'same', 'grow', 'years'], { ask: true, hint: 'Cash credit or overdraft interest.' }),
    ...(def.leases === 'yes' ? [row('leaseRentals', L.leaseRentals, OPTIONAL, { ask: true, hint: HINTS.leaseRentals })] : []),
    row('otherLoansInterest', L.otherLoansInterest, OPTIONAL, { modeKey: 'otherLoans', ask: true, hint: 'Term loans already running, besides this one.' }),
    row('otherLoansPrincipal', L.otherLoansPrincipal, OPTIONAL, { modeKey: 'otherLoans', ask: true }),
    row('taxPct', L.taxPct, ['same', 'years'], { percent: true, hint: 'On profit before tax; nil in a year with a loss.' }),
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

/** A row's figure for each year: typed, or worked out by the engine from one or two answers. */
export function rowValues(s: State, r: RowDef, years: string[]): RowValues {
  const n = years.length, mode = modeOf(s, r), missing: (number | undefined)[] = Array(n).fill(undefined);
  if (!mode) return { values: missing, needs: [`${r.label}: none, or how much`] };
  if (mode === 'none') return { values: Array(n).fill(0), needs: [] };
  const read = r.percent ? numberOf : amountOf, text = s.cells[r.key] ?? [];
  if (mode === 'years') return { values: years.map((_, i) => read(text[i])), needs: [] }; // the engine names each missing year
  const out = series({ kind: mode, first: read(text[0]), pct: numberOf(s.rates[r.key]) }, n, r.label, years[0] ?? '');
  return 'needs' in out ? { values: missing, needs: out.needs } : 'blocked' in out ? { values: missing, needs: [], blocked: out.blocked } : { values: out, needs: [] };
}

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
  method: 'method', target: 'target', tax: 'row-taxPct', margin: 'row-pbdit', depreciation: 'row-depreciation',
  interest: 'row-interestOther', otherLoans: 'row-otherLoans', nonCash: 'row-nonCash', start: 'start-question',
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
    margin: plan && at('pbdit'),
    depreciation: plan && at('depreciation'),
    interest: plan && at('interestOther'),
    otherLoans: plan && at('otherLoans'),
    nonCash: plan && at('nonCash') && (definitionOf(s)?.leases !== 'yes' || at('leaseRentals')),
    start: plan && s.planStart === LOAN_YEAR && y.startChoices.length > 0,
  };
  return DEFAULTS.assumptions.filter((a) => holds[a.id]).map((a) => ({ id: a.id, what: a.what, shown: a.shown, why: a.why, where: WHERE[a.id] }));
}

// ---- The preview ----

/** One line of the DSCR statement: a figure for each year, in words (`values`) and as the engine gave it (`n`, for the Excel copy). */
export interface Line { label: string; values: string[]; n?: (number | undefined)[]; kind?: 'head' | 'total' | 'ratio'; id?: 'pbdit' | 'pbt' | 'tax' | 'available' | 'service' | 'dscr' }
/** The statement as chartered accountants lay it out: the years across, the working down. */
export interface StatementView { years: string[]; counted: boolean[]; lines: Line[] }
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
  lowest?: string;
  lowestYear?: string;
  notCounted?: string;
  notes: string[];
  verdict?: { meets: boolean; text: string };
  /** Largest loan on these terms; `amount` when it differs from the one entered, to offer it. */
  largest?: { text: string; amount?: number };
  fewest?: { text: string; instalments?: number };
  /** The loan's years with interest only and no instalment, and that interest, to ask which year the figures start in. */
  leadingInterest?: { fy: string; amount: string }[];
  /** The years left out because the figures start later, in words. */
  beforeStart?: string;
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
  if (dry) return { meets: false, text: `Below the target: ${limitText(dry)}.` };
  const parts: { ok: boolean; text: string }[] = [];
  if (t.minimum !== undefined)
    parts.push({ ok: !shortfall(st, { minimum: t.minimum }), text: `the lowest year, ${st.minimum.fy}, is ${ratioText(st.minimum.dscr, t.minimum)} against ${targetText(t.minimum)}` });
  if (t.average !== undefined)
    parts.push({ ok: !shortfall(st, { average: t.average }), text: `the average is ${ratioText(st.average, t.average)} against ${targetText(t.average)}` });
  const short = parts.filter((p) => !p.ok);
  return short.length
    ? { meets: false, text: `Below the target: ${short.map((p) => p.text).join('; ')}.` }
    : { meets: true, text: `Meets the target: ${parts.map((p) => p.text).join('; ')}.` };
}

const lower = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

/** The statement's lines, from the engine's figures: the profit build-up when the page works it out, then A, B, DSCR. */
function statementView(st: Statement, t: Target, def: Definition, parts: YearFigures[], profit?: ProfitYear[]): StatementView {
  const amounts = (n: (number | undefined)[]) => ({ values: n.map((x) => inr(x)), n });
  const { available, service } = componentsOf(def), lines: Line[] = [];
  if (profit) {
    const pc = (k: Exclude<keyof ProfitYear, 'fy'>) => amounts(profit.map((y) => y[k]));
    lines.push(
      { label: 'Profit', values: [], kind: 'head' },
      { label: PROJECTION_LABELS.pbdit, ...pc('pbdit'), id: 'pbdit' },
      { label: 'Less: depreciation', ...pc('depreciation') },
      { label: 'Less: other non-cash charges', ...pc('nonCash') },
      { label: 'Less: interest on term loans', ...pc('interestTL') },
      { label: 'Less: interest on working capital', ...pc('interestOther') },
      { label: 'Profit before tax', ...pc('pbt'), kind: 'total', id: 'pbt' },
      { label: 'Less: tax', ...pc('tax'), id: 'tax' },
      { label: 'Profit after tax', ...pc('pat'), kind: 'total' },
    );
  }
  lines.push({ label: 'Cash available for debt service', values: [], kind: 'head' });
  available.forEach((c, i) => lines.push({ label: i ? `Add: ${lower(COMPONENTS[c])}` : COMPONENTS[c], ...amounts(parts.map((y) => y[c])) }));
  lines.push(
    { label: 'Cash available (A)', ...amounts(st.rows.map((r) => r.available)), kind: 'total', id: 'available' },
    { label: 'Debt service', values: [], kind: 'head' },
    ...service.map((c) => ({ label: COMPONENTS[c], ...amounts(parts.map((y) => y[c])) })),
    { label: 'Debt service (B)', ...amounts(st.rows.map((r) => r.service)), kind: 'total', id: 'service' },
    { label: 'DSCR (A ÷ B)', values: st.rows.map((r) => (r.dscr === undefined ? '—' : ratioText(r.dscr, r.counted ? t.minimum : undefined))), n: st.rows.map((r) => r.dscr), kind: 'ratio', id: 'dscr' },
  );
  return { years: st.rows.map((r) => r.fy), counted: st.rows.map((r) => r.counted), lines };
}

function fillStatement(p: Preview, st: Statement, t: Target, def: Definition, parts: YearFigures[], profit?: ProfitYear[]) {
  p.statement = statementView(st, t, def, parts, profit);
  const skipped = st.rows.filter((r) => !r.counted).map((r) => r.fy);
  if (skipped.length && st.rows.length > skipped.length)
    p.notCounted = `Not counted: ${andList(skipped)} (${def.years === 'repayment' ? 'no term-loan instalment' : 'no interest or instalments due'}).`;
  if (st.average !== undefined && st.minimum) {
    p.average = ratioText(st.average, t.average);
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
    return [...lines.filter((l) => !rowOf(l)), ...rows.flatMap((r, k) => (vals[k].needs.length ? vals[k].needs : lines.filter((l) => rowOf(l) === r.label)))];
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
  if ('months' in am) p.schedule = scheduleView(am, s.loan.repayment);
  else if ('blocked' in am) p.blocked = am.blocked;
  if ('months' in am && y.leading.length)
    p.leadingInterest = am.years.filter((d) => y.leading.includes(d.fy)).map((d) => ({ fy: d.fy, amount: rs(d.interest) }));
  const proj = y.years.map((fy, i) => ({ fy, ...figures(i) }) as ProjectionYear);
  const r = planStatement(proj, loan, def, y.start);
  // A first year with interest only may come before the operations the figures describe: which year the figures start in
  // decides what the first year's figure means: it is asked, unless the loan's first year is assumed (D-UX-08).
  if (y.startNeeded) p.needs.push(`The first year of your figures: ${y.startChoices.join(' or ')}`);
  // Until the loan's dates are in there are no years to ask for; the loan's own needs say what is missing.
  if ('needs' in r) p.needs.push(...oneRepaymentNeed(merged(r.needs.filter((n) => y.years.length || n !== 'At least one year of figures'))));
  else if ('blocked' in r) p.blocked ??= r.blocked;
  else if (!y.startNeeded) {
    fillStatement(p, r.statement, target, def, r.years, r.profit);
    if (!tNeeds.length) p.verdict = verdictOf(r.statement, target);
    const b = r.beforeStart;
    if (b.length) p.beforeStart = `Left out: ${andList(b.map((x) => x.fy))}, before your figures start. ${b.length > 1 ? 'Their' : 'Its'} interest `
      + `(${andList(b.map((x) => rs(x.interest)))}) is taken as paid from the project cost (capitalised), not from profits.`;
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
    const few = shortestRepayment(proj, { ...loan, instalments: undefined }, def, target, y.start);
    if ('instalments' in few) p.fewest = {
      text: `The fewest instalments for ${rs(amount)} are ${few.instalments} ${loan.frequency === 'quarterly' ? 'quarterly' : 'monthly'}.`,
      ...(few.instalments !== loan.instalments ? { instalments: few.instalments } : {}),
    };
    else if ('none' in few) p.fewest = { text: few.none };
    else if ('blocked' in few) p.blocked = few.blocked;
  }
  return p;
}

/** The answer so far, in one line, for the bar that stays in view. */
export function barText(p: Preview): string {
  if (p.blocked) return 'No figures: the two computations disagree.';
  const parts: string[] = [];
  if (p.average) parts.push(`Average ${p.average}`, `lowest ${p.lowest} in ${p.lowestYear}`);
  if (p.verdict) parts.push(p.verdict.meets ? 'meets the target' : 'below the target');
  parts.push(p.needs.length ? `provisional: ${p.needs.length} still needed` : statusText(p).toLowerCase());
  return cap(parts.join(' · '));
}

/** "Complete", or "Complete, on 7 assumptions" while any still holds. */
export const statusText = (p: Preview) =>
  p.blocked ? 'No figures' : p.needs.length ? `Provisional: ${p.needs.length} still needed`
    : p.assumed.length ? `Complete, on ${p.assumed.length} assumption${p.assumed.length > 1 ? 's' : ''}` : 'Complete';

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

/** The tax rates the page can fill in for every year, by kind of borrower (engine/data/tax.json). */
export const TAX_CHOICES = TAX_RATES.map((t) => ({ id: t.id, label: t.label, pct: String(t.pct), verified: t.verified }));
export const withTaxRate = (s: State, pct: string): State =>
  ({ ...s, modes: { ...s.modes, taxPct: 'same' }, cells: { ...s.cells, taxPct: [pct, ...(s.cells.taxPct ?? []).slice(1)] } });
