/**
 * The report's front door (NEW2b, docs/WORKED-PAGE.md §7, docs/CAPACITY-FIRST.md §4): five questions, one a screen, and
 * the largest loan the cash carries in the first minute. What the business makes, the project's cost, the loan wanted,
 * a year's sales at full running and what is left of them are the borrower's (ink); the rest stands on the worked
 * example's shape (example.ts) in pencil, listed on the check until changed or confirmed (rule 14, D-UX-358).
 *
 * Written over the example:
 * - the cost splits as the example's does, building 6 of every 26, machines the rest, so the two add up to the cost;
 * - sales are one line, a month's sales at full running (S / 12, to the paisa), until split into what is sold;
 * - what is left (PBDIT at full running, L) splits the costs as the example's do: fixed costs are 12 of every 101.76 of
 *   costs, the rest goes with sales. The share that goes with sales is rounded to two places, and the fixed costs are
 *   what then leaves exactly L: fixed a year = S × (1 − v) − L.
 * Pure: no DOM. tests/report-door.test.ts works each figure a second way.
 */
import { printable } from '../doc/face';
import { BORROWER_CHOICES, EMPTY, amountOf, type ReportState } from './model';
import { reportExample } from './example';
import { inr, lakhCrore } from '../../../engine/util';

export type DoorId = 'what' | 'cost' | 'loan' | 'sales' | 'left';
export const DOOR: DoorId[] = ['what', 'cost', 'loan', 'sales', 'left'];
export type DoorFacts = Partial<Record<DoorId, string>>;

/** The example's shape: building of the cost (6 L of 26 L) and fixed costs of all costs at full running (12 L of 1,01,76,000). */
const EXAMPLE = { building: 6, cost: 26, fixed: 12, costs: 101.76 };

const round = (n: number, places: number) => Math.round(n * 10 ** places) / 10 ** places;
/** An amount as the page's boxes hold it: Indian grouping, paise only when there are some. */
const text = (n: number) => inr(n, Number.isInteger(round(n, 2)) ? 0 : 2);

/** The cost split as the example's: building and machines, adding up to the cost. */
export function splitCost(c: number) {
  const building = Math.round((c * EXAMPLE.building) / EXAMPLE.cost);
  return { building, machinery: c - building };
}

/** The costs split as the example's, leaving `left` of `sales` at full running: the % that goes with sales, and fixed a year. */
export function splitCosts(sales: number, left: number) {
  const costs = sales - left, variablePct = round(((costs * (1 - EXAMPLE.fixed / EXAMPLE.costs)) / sales) * 100, 2);
  const fixedYear = Math.max(0, round(sales * (1 - variablePct / 100) - left, 2));
  return { variablePct, fixedYear, fixedMonth: round(fixedYear / 12, 2) };
}

/** What is wrong with an answer, in words, or nothing. */
export function doorProblem(id: DoorId, t: string, f: DoorFacts): string | undefined {
  if (id === 'what') {
    if (!t.trim()) return 'Say in a few words what the business makes or sells.';
    return printable(t) ? undefined : 'The report is in English: type this in English letters.';
  }
  const n = amountOf(t);
  if (n === undefined) return id === 'left' ? 'Type what is left, like 6 L. If nothing is left, type 0.' : 'Type an amount, like 25 L or 25,00,000.';
  if (Number.isNaN(n)) return 'Not read as an amount: type it like 25 L or 25,00,000.';
  if (id === 'left') {
    const s = amountOf(f.sales ?? '');
    if (n < 0) return 'Type what is left as a figure of nil or more; a loss leaves no cash to repay a loan.';
    if (s !== undefined && n >= s) return `More than the sales of ${lakhCrore(s)}: what is left comes out of the sales.`;
    return undefined;
  }
  if (n <= 0) return 'Type an amount above nil.';
  const c = amountOf(f.cost ?? '');
  if (id === 'loan' && c !== undefined && n > c) return `More than the project's cost of ${lakhCrore(c)}: a lender lends part of it, and you bring the rest.`;
  return undefined;
}

/** What an answer reads as, worked by the same code that writes it into the report. */
export function doorReads(id: DoorId, t: string, f: DoorFacts): string | undefined {
  if (id === 'what') return undefined;
  const n = amountOf(t);
  if (n === undefined || Number.isNaN(n) || doorProblem(id, t, f)) return undefined;
  if (id === 'cost') { const c = splitCost(n); return `${lakhCrore(n)}: ${lakhCrore(c.building)} building and ${lakhCrore(c.machinery)} machines, a guess you can change`; }
  const c = amountOf(f.cost ?? '');
  if (id === 'loan') return c ? `${lakhCrore(n)}, ${+((n / c) * 100).toFixed(2)}% of the cost` : lakhCrore(n);
  if (id === 'sales') return `${lakhCrore(n)} a year, ${lakhCrore(n / 12)} a month`;
  const s = amountOf(f.sales ?? '');
  return s ? `${lakhCrore(n)}, ${+((n / s) * 100).toFixed(2)}% of sales` : lakhCrore(n);
}

/** The facts still the example's after the door, with the box that holds each: in pencil until changed or confirmed. */
export type PencilId = 'borrower' | 'split' | 'rate' | 'years' | 'sellFrom' | 'costs' | 'wc' | 'security';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const month = (ym = '') => (/^\d{4}-\d{2}$/.test(ym) ? `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}` : ym);
const lower = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);
const lakh = (t: string) => { const n = amountOf(t); return n === undefined || Number.isNaN(n) ? t : lakhCrore(n); };
export const PENCIL: Record<PencilId, { box: string; of: (s: ReportState) => string; words: (s: ReportState) => string }> = {
  borrower: { box: 'fld-borrower', of: (s) => s.borrower ?? '', words: (s) => `the borrower, ${lower(BORROWER_CHOICES.find((b) => b.value === s.borrower)?.label ?? '')}` },
  split: { box: 'fld-cost-building', of: (s) => `${s.cost.building}|${s.cost.machinery}`, words: (s) => `the cost's split, ${lakh(s.cost.building)} building and ${lakh(s.cost.machinery)} machines` },
  sellFrom: { box: 'fld-sellFrom', of: (s) => s.sellFrom ?? '', words: (s) => `sales from ${month(s.sellFrom)}` },
  costs: { box: 'fld-variablePct', of: (s) => `${s.variablePct}|${s.fixedMonth}`, words: (s) => `costs of ${s.variablePct}% of sales and ${lakh(s.fixedMonth ?? '')} a month fixed` },
  rate: { box: 'fld-tl-rate', of: (s) => s.loan.ratePct, words: (s) => `interest at ${s.loan.ratePct}% a year` },
  years: { box: 'fld-years', of: (s) => s.years ?? '', words: (s) => `${s.years} years to repay` },
  wc: { box: 'fld-wcBy', of: (s) => `${s.wcBy ?? ''}|${s.wcLimit}`, words: () => 'a working-capital limit worked from the days of stock and credit' },
  security: { box: 'fld-security', of: (s) => s.security ?? '', words: () => 'nothing backing the loan beside the project' },
};
const PENCIL_IDS = Object.keys(PENCIL) as PencilId[];

/** The report from the answers given so far, the example's figures standing for the rest; `pencil` holds each fact as the example wrote it. */
export function doorState(f: DoorFacts, today = new Date()): ReportState {
  const x = reportExample(today), cost = amountOf(f.cost ?? ''), sales = amountOf(f.sales ?? ''), left = amountOf(f.left ?? '');
  const what = (f.what ?? '').trim();
  let s: ReportState = { ...x, doc: { ...EMPTY.doc, activity: what } };
  if (cost !== undefined && cost > 0) { const c = splitCost(cost); s = { ...s, cost: { ...s.cost, building: text(c.building), machinery: text(c.machinery) } }; }
  if (f.loan?.trim()) s = { ...s, loan: { ...s.loan, amount: f.loan.trim() } };
  if (sales !== undefined && sales > 0) {
    s = { ...s, products: [{ name: what || 'Sales', units: '1', price: text(round(sales / 12, 2)), unit: 'month' }] };
    if (left !== undefined && left >= 0 && left < sales) { const k = splitCosts(sales, left); s = { ...s, variablePct: String(k.variablePct), fixedMonth: text(k.fixedMonth) }; }
  }
  return { ...s, pencil: Object.fromEntries(PENCIL_IDS.map((id) => [id, PENCIL[id].of(s)])) };
}

/** The facts still in pencil: written by the door and not changed since. */
export const pencilLeft = (s: ReportState): PencilId[] => (s.pencil ? PENCIL_IDS.filter((id) => s.pencil?.[id] !== undefined && s.pencil[id] === PENCIL[id].of(s)) : []);
