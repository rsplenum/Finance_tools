/**
 * The DSCR page: what it asks, and the preview it shows. Pure — no DOM. Every figure comes from engine/dscr.ts; this
 * file only turns typed text into the engine's inputs and the engine's answers into plain words. Nothing missing is
 * filled in: a "None" or "Same every year" is the user's own answer, and anything else missing is listed as needed.
 */
import {
  BENCHMARKS, COMPONENTS, OPTIONS, PRESETS, PROJECTION_LABELS, componentsOf, dscrStatement, fyRange, isFy, limitText,
  loanTimeline, maxLoanAmount, planStatement, shortestRepayment, shortfall, targetNeeds,
  type Component, type Definition, type Limit, type LoanInput, type ProjectionYear, type Statement, type Target, type YearFigures,
} from '../../../engine/dscr';
import type { Frequency, RepaymentStyle } from '../../../engine/loan';
import { parseAmount, parseMonth } from '../../../engine/parse';
import { inr, rs } from '../../../engine/util';

export type Source = 'own' | 'plan';
export type Method = 'preset' | 'choose';
/** How a row is filled: a figure for each year, one figure for every year, or none in any year. */
export type RowMode = 'years' | 'same' | 'none';
export type OptionKey = keyof Definition;

export interface LoanText {
  amount: string; ratePct: string; disbursed: string; moratoriumMonths: string; instalments: string;
  style?: RepaymentStyle; frequency?: Frequency;
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
  return s.method === 'preset' ? (COMMON.choice as Definition) : s.method === 'choose' ? s.choice : undefined;
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
}

const row = (key: string, label: string, extra: Partial<RowDef> = {}): RowDef => ({ key, label, modeKey: key, modes: [], ...extra });
const OPTIONAL: RowMode[] = ['none', 'same'];

/** The rows of the yearly figures, from where they come from and the method: only what changes the answer. */
export function rowsOf(s: State): RowDef[] {
  const def = definitionOf(s);
  if (!s.source || !complete(def)) return [];
  if (s.source === 'own') {
    const { available, service } = componentsOf(def), used = new Set<string>([...available, ...service]);
    return (Object.keys(COMPONENTS) as Component[]).filter((c) => used.has(c)).map((c) =>
      row(c, COMPONENTS[c], c === 'pat' ? { negative: true } : ['nonCash', 'interestOther', 'leaseRentals'].includes(c) ? { modes: OPTIONAL } : {}));
  }
  const L = PROJECTION_LABELS;
  return [
    row('pbdit', L.pbdit, { negative: true }),
    row('depreciation', L.depreciation),
    row('nonCash', L.nonCash, { modes: OPTIONAL }),
    row('interestOther', L.interestOther, { modes: OPTIONAL }),
    ...(def.leases === 'yes' ? [row('leaseRentals', L.leaseRentals, { modes: OPTIONAL })] : []),
    row('otherLoansInterest', L.otherLoansInterest, { modeKey: 'otherLoans', modes: ['none'] }),
    row('otherLoansPrincipal', L.otherLoansPrincipal, { modeKey: 'otherLoans', modes: ['none'] }),
    row('taxPct', L.taxPct, { modes: ['same'], percent: true }),
  ];
}

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
  const l = s.loan;
  return {
    amount: amountOf(l.amount), ratePct: numberOf(l.ratePct), disbursed: parseMonth(l.disbursed),
    moratoriumMonths: numberOf(l.moratoriumMonths), instalments: numberOf(l.instalments),
    // An EMI is worked monthly only (docs/RULES.md), so choosing it answers how often.
    frequency: l.style === 'emi' ? 'monthly' : l.frequency, style: l.style,
  };
}

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

export interface PreviewRow { fy: string; values: string[]; dscr: string; counted: boolean }
export interface Preview {
  /** The start questions are answered, so the figures can be asked. */
  started: boolean;
  needs: string[];
  blocked?: string;
  columns: string[];
  rows: PreviewRow[];
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

function fillStatement(p: Preview, st: Statement, t: Target, years: YearFigures[] | undefined, def: Definition) {
  p.columns = years ? ['Profit after tax', 'Interest on term loans', 'Term-loan instalments', 'Cash available', 'Debt service'] : ['Cash available', 'Debt service'];
  p.rows = st.rows.map((r, i) => {
    const y = years?.[i];
    return {
      fy: r.fy, counted: r.counted, dscr: r.dscr === undefined ? '—' : ratioText(r.dscr, r.counted ? t.minimum : undefined),
      values: [...(y ? [y.pat, y.interestTL, y.principalTL] : []), r.available, r.service].map((n) => inr(n)),
    };
  });
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

export function preview(s: State): Preview {
  const p: Preview = { started: false, needs: startNeeds(s), columns: [], rows: [], notes: [] };
  const def = definitionOf(s);
  if (p.needs.length || !complete(def)) return p;
  p.started = true;
  const rows = rowsOf(s), y = yearsOf(s), target = targetOf(s), tNeeds = targetNeeds(target);
  const figures = (i: number) => Object.fromEntries(rows.map((r) => [r.key, cellValue(s, r, i)]));

  if (s.source === 'own') {
    if (y.needs.length) { p.needs.push(...y.needs, ...tNeeds); return p; }
    const r = dscrStatement(y.years.map((fy, i) => ({ fy, ...figures(i) }) as YearFigures), def);
    if ('needs' in r) p.needs.push(...groupNeeds(r.needs, y.years, rows.map((x) => x.label)));
    else if ('blocked' in r) p.blocked = r.blocked;
    else {
      fillStatement(p, r, target, undefined, def);
      if (!tNeeds.length) p.verdict = verdictOf(r, target);
    }
    p.needs.push(...tNeeds);
    return p;
  }

  const loan = loanInput(s);
  const proj = y.years.map((fy, i) => ({ fy, ...figures(i) }) as ProjectionYear);
  const r = planStatement(proj, loan, def);
  // Until the loan's dates are in there are no years to ask for; the loan's own needs say what is missing.
  if ('needs' in r) p.needs.push(...groupNeeds(r.needs.filter((n) => y.years.length || n !== 'At least one year of figures'), y.years, rows.map((x) => x.label)));
  else if ('blocked' in r) p.blocked = r.blocked;
  else {
    fillStatement(p, r.statement, target, r.years, def);
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

/** The common method in one line: "Interest on term loans; lease rentals left out; …". */
export const PRESET_TEXT = cap(OPTION_KEYS
  .map((k) => choicesOf(k).find((c) => c.value === (COMMON.choice as Record<string, string>)[k])?.label.toLowerCase())
  .join('; '));
