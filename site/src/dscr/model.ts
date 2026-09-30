/**
 * The DSCR page: what it asks, and the preview it shows. Pure — no DOM. Every figure comes from engine/dscr.ts; this
 * file only turns typed text into the engine's inputs and the engine's answers into plain words. Nothing missing is
 * filled in: a "None" or "Same every year" is the user's own answer, and anything else missing is listed as needed.
 */
import {
  BENCHMARKS, COMPONENTS, LOAN_LABELS, OPTIONS, PRESETS, PROJECTION_LABELS, amortization, componentsOf, dscrStatement, fyRange,
  isFy, limitText, loanTimeline, maxLoanAmount, planStatement, shortestRepayment, shortfall, targetNeeds,
  type Amortization, type Component, type Definition, type Limit, type LoanInput, type ProfitYear, type ProjectionYear, type Statement,
  type Target, type YearFigures,
} from '../../../engine/dscr';
import { parseAmount, parseMonth } from '../../../engine/parse';
import { TAX_RATES } from '../../../engine/tax';
import { inr, rs } from '../../../engine/util';

export type Source = 'own' | 'plan';
/** A preset's id from the data file, or 'choose' to answer the four choices one by one. */
export type Method = string;
/** One answer for two facts: an EMI is monthly; equal principal is monthly or quarterly. */
export type Repayment = 'emi' | 'monthly' | 'quarterly';
/** How a row is filled: a figure for each year, one figure for every year, or none in any year. */
export type RowMode = 'years' | 'same' | 'none';
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
  /** What was typed for each row, by year number (not by year name, so moving the first year keeps the figures). */
  cells: Record<string, string[]>;
  modes: Record<string, RowMode>;
  target: { average: string; minimum: string };
}

export const START: State = {
  choice: {}, firstYear: '', yearCount: '',
  loan: { amount: '', ratePct: '', disbursed: '', moratoriumMonths: '', instalments: '' },
  cells: {}, modes: {}, target: { average: '', minimum: '' },
};

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
  /** The engine's name for the figure; the fields are fld-<key>-<year>. */
  key: string;
  label: string;
  /** Rows sharing a mode key switch together (the interest and instalments of other term loans). */
  modeKey: string;
  /** Answers offered besides a figure for each year. */
  modes: RowMode[];
  /** A loss may be typed with a minus. */
  negative?: boolean;
  percent?: boolean;
  /** One line under the name, where the name alone may not be clear. */
  hint?: string;
}

const row = (key: string, label: string, extra: Partial<RowDef> = {}): RowDef => ({ key, label, modeKey: key, modes: [], ...extra });
const OPTIONAL: RowMode[] = ['none', 'same'];

/** The rows of the yearly figures, from where they come from and the method: only what changes the answer. */
export function rowsOf(s: State): RowDef[] {
  const def = definitionOf(s);
  if (!s.source || !complete(def)) return [];
  if (s.source === 'own') {
    const { available, service } = componentsOf(def), used = new Set<string>([...available, ...service]);
    const extra: Partial<Record<Component, Partial<RowDef>>> = {
      pat: { negative: true, hint: 'After interest, depreciation and tax. A loss with a minus.' },
      nonCash: { modes: OPTIONAL, hint: HINTS.nonCash }, interestOther: { modes: OPTIONAL }, leaseRentals: { modes: OPTIONAL, hint: HINTS.leaseRentals },
      interestTL: { hint: 'On every term loan, this one included.' }, principalTL: { hint: 'Principal repaid in the year, every term loan.' },
    };
    return (Object.keys(COMPONENTS) as Component[]).filter((c) => used.has(c)).map((c) => row(c, COMPONENTS[c], extra[c]));
  }
  const L = PROJECTION_LABELS;
  return [
    row('pbdit', L.pbdit, { negative: true, hint: 'Sales less every cost except interest, depreciation and tax. A loss with a minus.' }),
    row('depreciation', L.depreciation),
    row('nonCash', L.nonCash, { modes: OPTIONAL, hint: HINTS.nonCash }),
    row('interestOther', L.interestOther, { modes: OPTIONAL, hint: 'Cash credit or overdraft interest.' }),
    ...(def.leases === 'yes' ? [row('leaseRentals', L.leaseRentals, { modes: OPTIONAL, hint: HINTS.leaseRentals })] : []),
    row('otherLoansInterest', L.otherLoansInterest, { modeKey: 'otherLoans', modes: ['none'], hint: 'Term loans already running, besides this one.' }),
    row('otherLoansPrincipal', L.otherLoansPrincipal, { modeKey: 'otherLoans', modes: ['none'] }),
    row('taxPct', L.taxPct, { modes: ['same'], percent: true, hint: 'On profit before tax; nil in a year with a loss.' }),
  ];
}

const HINTS = {
  nonCash: 'Amortisation, amounts written off, deferred tax.',
  leaseRentals: 'Lease payments in the year. Under Ind AS 116, leave right-of-use depreciation and lease interest out of the rows above.',
};

export const modeOf = (s: State, r: RowDef): RowMode => {
  const m = s.modes[r.modeKey];
  return m && r.modes.includes(m) ? m : 'years';
};

function cellValue(s: State, r: RowDef, i: number): number | undefined {
  const mode = modeOf(s, r);
  if (mode === 'none') return 0;
  const text = s.cells[r.key]?.[mode === 'same' ? 0 : i];
  return r.percent ? numberOf(text) : amountOf(text);
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

export interface Years { years: string[]; needs: string[]; loanYears?: number; firstInstalment?: string; lastInstalment?: string }

/** The years of the figures: typed for own figures; for projections, the years the loan runs over, and any added. */
export function yearsOf(s: State): Years {
  if (s.source === 'own') {
    const first = parseFy(s.firstYear), count = numberOf(s.yearCount), needs: string[] = [];
    if (!first) needs.push('The first year, like 2026-27');
    if (count === undefined || !Number.isInteger(count) || count < 1 || count > MAX_YEARS) needs.push(`The number of years, 1 to ${MAX_YEARS}`);
    return { years: needs.length ? [] : fyRange(first as string, count as number), needs };
  }
  const t = loanTimeline(loanInput(s));
  if ('needs' in t) return { years: [], needs: [] }; // the loan's own needs list what is missing
  return {
    years: fyRange(t.years[0], Math.min(MAX_YEARS, Math.max(t.years.length, s.planYears ?? 0))),
    needs: [], loanYears: t.years.length, firstInstalment: t.firstInstalment, lastInstalment: t.lastInstalment,
  };
}

// ---- The preview ----

/** One line of the DSCR statement: a figure for each year. */
export interface Line { label: string; values: string[]; kind?: 'head' | 'total' | 'ratio'; id?: 'pbt' | 'tax' | 'available' | 'service' | 'dscr' }
/** The statement as chartered accountants lay it out: the years across, the working down. */
export interface StatementView { years: string[]; counted: boolean[]; lines: Line[] }
export interface MonthView { ym: string; month: string; opening: string; interest: string; principal: string; paid: string; closing: string; instalment?: number }
export interface ScheduleYear { fy: string; interest: string; principal: string; closing: string; months: MonthView[] }
/** The repayment schedule: the instalment in words, then each year with its months. */
export interface ScheduleView { level: string; years: ScheduleYear[] }

export interface Preview {
  /** The start questions are answered, so the figures can be asked. */
  started: boolean;
  needs: string[];
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
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const monthText = (ym: string) => `${MONTH_NAMES[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
export const monthShort = (ym: string) => `${MONTH_NAMES[Number(ym.slice(5, 7)) - 1].slice(0, 3)} ${ym.slice(0, 4)}`;
const andList = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}` : xs[0] ?? '');
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** When the loan's instalments fall, read back in words so the moratorium can be checked. */
export function loanRead(y: Years): string {
  if (!y.firstInstalment || !y.lastInstalment || !y.loanYears) return '';
  const span = y.loanYears > 1 ? `${y.years[0]} to ${y.years[y.loanYears - 1]}` : y.years[0];
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
  const money = (xs: (number | undefined)[]) => xs.map((n) => inr(n));
  const { available, service } = componentsOf(def), lines: Line[] = [];
  if (profit) {
    const pc = (k: Exclude<keyof ProfitYear, 'fy'>) => money(profit.map((y) => y[k]));
    lines.push(
      { label: 'Profit', values: [], kind: 'head' },
      { label: PROJECTION_LABELS.pbdit, values: pc('pbdit') },
      { label: 'Less: depreciation', values: pc('depreciation') },
      { label: 'Less: other non-cash charges', values: pc('nonCash') },
      { label: 'Less: interest on term loans', values: pc('interestTL') },
      { label: 'Less: interest on working capital', values: pc('interestOther') },
      { label: 'Profit before tax', values: pc('pbt'), kind: 'total', id: 'pbt' },
      { label: 'Less: tax', values: pc('tax'), id: 'tax' },
      { label: 'Profit after tax', values: pc('pat'), kind: 'total' },
    );
  }
  lines.push({ label: 'Cash available for debt service', values: [], kind: 'head' });
  available.forEach((c, i) => lines.push({ label: i ? `Add: ${lower(COMPONENTS[c])}` : COMPONENTS[c], values: money(parts.map((y) => y[c])) }));
  lines.push(
    { label: 'Cash available (A)', values: money(st.rows.map((r) => r.available)), kind: 'total', id: 'available' },
    { label: 'Debt service', values: [], kind: 'head' },
    ...service.map((c) => ({ label: COMPONENTS[c], values: money(parts.map((y) => y[c])) })),
    { label: 'Debt service (B)', values: money(st.rows.map((r) => r.service)), kind: 'total', id: 'service' },
    { label: 'DSCR (A ÷ B)', values: st.rows.map((r) => (r.dscr === undefined ? '—' : ratioText(r.dscr, r.counted ? t.minimum : undefined))), kind: 'ratio', id: 'dscr' },
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

/** The repayment schedule in words and rupees: every month, grouped by financial year with the year's totals. */
function scheduleView(a: Amortization, repayment?: Repayment): ScheduleView {
  return {
    level: repayment === 'emi'
      ? `EMI ${rs(a.level, 2)} a month, interest included; banks round it up to the next rupee.`
      : `Principal ${rupees(a.level)} a ${repayment === 'quarterly' ? 'quarter' : 'month'}, and interest on the balance every month.`,
    years: a.years.map((y) => ({
      fy: y.fy, interest: inr(y.interest), principal: inr(y.principal), closing: inr(y.closing),
      months: a.months.filter((m) => m.fy === y.fy).map((m) => ({
        ym: m.month, month: monthShort(m.month), opening: inr(m.opening), interest: inr(m.interest), principal: inr(m.principal), paid: inr(m.paid),
        closing: inr(m.closing), ...(m.instalment ? { instalment: m.instalment } : {}),
      })),
    })),
  };
}

export function preview(s: State): Preview {
  const p: Preview = { started: false, needs: startNeeds(s), notes: [] };
  const def = definitionOf(s);
  if (p.needs.length || !complete(def)) return p;
  p.started = true;
  const rows = rowsOf(s), y = yearsOf(s), target = targetOf(s), tNeeds = targetNeeds(target);
  const figures = (i: number) => Object.fromEntries(rows.map((r) => [r.key, cellValue(s, r, i)]));

  if (s.source === 'own') {
    if (y.needs.length) { p.needs.push(...y.needs, ...tNeeds); return p; }
    const own = y.years.map((fy, i) => ({ fy, ...figures(i) }) as YearFigures), r = dscrStatement(own, def);
    if ('needs' in r) p.needs.push(...groupNeeds(r.needs, y.years, rows.map((x) => x.label)));
    else if ('blocked' in r) p.blocked = r.blocked;
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
  const proj = y.years.map((fy, i) => ({ fy, ...figures(i) }) as ProjectionYear);
  const r = planStatement(proj, loan, def);
  // Until the loan's dates are in there are no years to ask for; the loan's own needs say what is missing.
  if ('needs' in r) p.needs.push(...oneRepaymentNeed(groupNeeds(r.needs.filter((n) => y.years.length || n !== 'At least one year of figures'), y.years, rows.map((x) => x.label))));
  else if ('blocked' in r) p.blocked ??= r.blocked;
  else {
    fillStatement(p, r.statement, target, def, r.years, r.profit);
    if (!tNeeds.length) p.verdict = verdictOf(r.statement, target);
  }
  p.needs.push(...tNeeds);
  if (tNeeds.length || !y.years.length || p.blocked) return p;

  const { amount, ...terms } = loan;
  const most = maxLoanAmount(proj, terms, def, target);
  if ('amount' in most) p.largest = {
    text: `The largest loan on these terms is ${rs(most.amount)}, limited by ${limitedBy(most.limitedBy)}.`,
    ...(most.amount !== amount ? { amount: most.amount } : {}),
  };
  else if ('none' in most) p.largest = { text: most.none };
  else if ('blocked' in most) p.blocked = most.blocked;

  if (amount !== undefined) {
    const few = shortestRepayment(proj, { ...loan, instalments: undefined }, def, target);
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
  parts.push(p.needs.length ? `provisional: ${p.needs.length} still needed` : 'complete');
  return cap(parts.join(' · '));
}

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
