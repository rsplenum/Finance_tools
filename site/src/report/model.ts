/**
 * The project report page's logic, apart from the page (as dscr/model.ts): typed text to the engine's input, and its
 * report to tables in words, with the engine's exact figures beside them for the Excel copy. The page and the document
 * show the same tables. Pure, no DOM. Figures: engine/report.ts only (with dscr.ts for profit, tax and DSCR).
 */
import { questionsLeft, verdictWords } from '../verdict';
import { ASSUMPTIONS, COST_HEADS, HEADS, costsOf, MUDRA, PMEGP, REPORT_REVIEW_BY, mudraLevel, mudraShort, projectReport, workedLimit, WORKING_CAPITAL, type Activity, type Area, type Category, type HeadId, type Report, type ReportInput, type ReportYear } from '../../../engine/report';
import { parseAmount, parseMonth } from '../../../engine/parse';
import { LEVELS, collateralNeeded, diagnose, type Levels, type RatioCheck } from '../../../engine/ratios';
import { makeViable, type Longer, type Outcome } from '../../../engine/viable';
import { AS_TYPED, LEVER_IDS, makePlan, withLevers, type LeverId, type Levers } from '../../../engine/plan';
import { fixOf } from '../../../engine/fix';
import { BORROWERS } from '../../../engine/tax';
import { inr } from '../../../engine/util';
import { GUARANTEES } from '../../../engine/guarantee';
import type { Draft, Dropped, NoteId } from '../../../engine/narrative';
import {
  inSentence, labelOf, listed, ratioAt, rowOf, upPct, upRupees, type BoardMove, type CheckRow, type ViableLine, type ViableView,
  benchmarksNote, levelsOf, ratiosWord, type BenchmarkText,
} from '../board-model';

export type Repayment = 'emi' | 'monthly' | 'quarterly';
export type Scheme = '' | 'pmegp' | 'mudra';
/** Simple mode (where the page opens, D-UX-112) asks a dozen plain questions and assumes the rest, listed; expert mode
 * asks every field. A state without a mode is expert's. */
export type Mode = 'simple' | 'expert';
/** The working-capital limit: worked out by the engine, the borrower's own, or none (D-UX-112). */
export type WcBy = 'worked' | 'typed' | 'none';
/** What backs the loan beside the project's own assets, asked in simple mode (D-UX-112). */
export type Security = 'property' | 'cgtmse' | 'neither';
export interface ReportFacts { name: string; activity: string; address: string; lender: string; preparedBy: string }
export interface ReportState {
  borrower?: string;
  cost: Record<HeadId, string>;
  loan: { amount: string; ratePct: string; disbursed: string; moratoriumMonths: string; instalments: string; repayment?: Repayment };
  subsidy: string; unsecured: string;
  /** The collateral's market value (D-UX-52), when property backs the loan. */
  collateral: string;
  /** Sales from one line per product, its use and the prices (the default, D-UX-109), or typed in expert mode. */
  salesBy: 'drivers' | 'typed'; products: ProductRow[]; utilisation: string; priceGrowth: string; monthsToStart: string;
  scheme: Scheme; category?: Category; area?: Area; activity?: Activity;
  /** PMEGP's conditions confirmed; on Mudra, a Tarun loan repaid (only then Tarun Plus, above Rs. 10 lakh). */
  pmegpConfirmed?: boolean; tarunRepaid?: boolean;
  /** CGTMSE's guarantee ticked, on a loan not under Mudra, and its concessions ticked (CGTMSE.groups, in order); a fee
   * rate typed from the sanction letter (% a year), over the scheme's, in expert mode. */
  cgtmse?: boolean; concessions?: boolean[]; feeRate: string;
  sales: string; salesGrowth: string; variablePct: string; fixed: string; fixedGrowth: string;
  days: { stock: string; debtors: string; creditors: string };
  wcLimit: string; wcRate: string;
  /** The most the promoters can bring in all, on the plan's board only (MV3): not an input of the report. */
  promotersMost: string;
  /** The benchmarks the user changed (BEN1), as typed; a ratio left out takes its default. Not an input of the report. */
  benchmarks?: BenchmarkText;
  doc: ReportFacts;
  mode?: Mode;
  /** Simple mode's own questions: the month sales start (the moratorium matches it), the years to repay from then, and
   * the fixed costs a month. */
  sellFrom?: string; years?: string; fixedMonth?: string;
  /** How the limit is set; a state with only a limit typed is 'typed'. */
  wcBy?: WcBy;
  security?: Security;
  /** Costs by head in expert mode, as typed (engine/data/report.json's costHeads): % of sales, or rupees a month. */
  heads?: { variable?: Record<string, string>; fixed?: Record<string, string> };
  /** The report's words (REP2, D-AI-02): the three notes, the sections as drafted and changed, and the borrower's tick. */
  words?: ReportWords;
}
/** The notes as typed; the six sections, by AI from them (`ai`) or as the borrower writes; what the check left out; the tick. */
export interface ReportWords { notes: Record<NoteId, string>; draft?: Draft; ai?: boolean; dropped?: Dropped[]; confirmed?: boolean }

/** A product or service as typed: what it is, how many a month at full running, its price a unit. */
export interface ProductRow { name: string; units: string; price: string }
export const NO_PRODUCT: ProductRow = { name: '', units: '', price: '' };
const DAYS = (ASSUMPTIONS.find((a) => a.id === 'days')?.value ?? {}) as Record<string, number>;
const assumed = (id: string) => ASSUMPTIONS.find((a) => a.id === id)?.value;
export const EMPTY: ReportState = {
  cost: Object.fromEntries(HEADS.map((h) => [h.id, ''])) as Record<HeadId, string>,
  loan: { amount: '', ratePct: '', disbursed: '', moratoriumMonths: '', instalments: '' },
  subsidy: '', unsecured: '', collateral: '', salesBy: 'drivers', products: [NO_PRODUCT], monthsToStart: '', scheme: '',
  utilisation: ((assumed('utilisation') ?? []) as number[]).join(', '), priceGrowth: String(assumed('price') ?? ''), sales: '', salesGrowth: '', variablePct: '', fixed: '', fixedGrowth: '',
  // Assumed until changed (engine/data/report.json), listed on the page.
  days: { stock: String(DAYS.stock ?? ''), debtors: String(DAYS.debtors ?? ''), creditors: String(DAYS.creditors ?? '') },
  wcLimit: '', wcRate: '', feeRate: '', promotersMost: '', doc: { name: '', activity: '', address: '', lender: '', preparedBy: '' },
};
export const BORROWER_CHOICES = BORROWERS.map((b) => ({ value: b.id, label: b.label }));
export const REPAYMENT_CHOICES: { value: Repayment; label: string }[] = [
  { value: 'emi', label: 'EMI every month' }, { value: 'monthly', label: 'Equal principal every month' }, { value: 'quarterly', label: 'Equal principal every quarter' },
];
export const SCHEME_CHOICES: { value: Scheme; label: string }[] = [{ value: '', label: 'None' }, { value: 'pmegp', label: 'PMEGP' }, { value: 'mudra', label: 'Mudra' }];
export const CGTMSE = GUARANTEES.cgtmse, CGFMU = GUARANTEES.cgfmu;
/** On Mudra, its level by the term loan and the limit typed; until both are typed, what it waits for. */
export function mudraLine(s: ReportState): string {
  const tl = amountOf(s.loan.amount), wc = limitOf(s);
  if (tl === undefined || wc === undefined) return 'Its level shows once the term loan and the working-capital limit are typed.';
  const v = mudraLevel(tl + wc);
  return v ? `${v.label}: the term loan and the limit come to Rs. ${rupees(tl + wc)}${v.onlyAfterTarun ? ', only for a borrower who has repaid a Tarun loan' : ''}.`
    : `The term loan and the limit come to Rs. ${rupees(tl + wc)}, above the Rs. ${rupees(MUDRA.mostInAll)} Mudra lends in all.`;
}
/** Mudra's Tarun Plus, which asks whether a Tarun loan was repaid: above Tarun's most, or once ticked. */
export const tarunAsked = (s: ReportState) => s.scheme === 'mudra' && (!!s.tarunRepaid || (amountOf(s.loan.amount) ?? 0) + (limitOf(s) ?? 0) > (MUDRA.levels.find((v) => v.id === 'tarun') as { upTo: number }).upTo);

/** The guarantee on the loans as chosen: CGFMU's on Mudra, CGTMSE's when ticked on another loan. */
export const guaranteeOf = (s: ReportState) => (s.scheme === 'mudra' ? 'cgfmu' : cgtmseOn(s) ? 'cgtmse' : undefined);
const simple = (s: ReportState) => s.mode === 'simple';
/** CGTMSE in simple mode is the backing chosen (with a property only when ticked in expert mode); in expert mode, the tick. */
const cgtmseOn = (s: ReportState) => (simple(s) ? s.security === 'cgtmse' || (s.security === 'property' && !!s.cgtmse) : !!s.cgtmse);
/** The collateral counted: in simple mode only with a property chosen; never on Mudra. */
const collateralText = (s: ReportState) => (s.scheme === 'mudra' || (simple(s) && s.security !== 'property') ? '' : s.collateral);
export const wcByOf = (s: ReportState): WcBy | undefined => s.wcBy ?? (s.wcLimit.trim() ? 'typed' : undefined);
/** The limit the report uses: as typed, worked out, or none; undefined while it waits for a figure. */
export const limitOf = (s: ReportState) => inputOf(s).wcLimit;
export { MUDRA };
export const CATEGORY_CHOICES: { value: Category; label: string }[] = [
  { value: 'general', label: 'General' }, { value: 'special', label: 'Special: SC, ST, OBC, minority, woman, ex-serviceman, a person with a disability and others the scheme names' },
];
export const AREA_CHOICES: { value: Area; label: string }[] = [{ value: 'urban', label: 'A town or city' }, { value: 'rural', label: 'A village' }];
export const ACTIVITY_CHOICES: { value: Activity; label: string }[] = [{ value: 'manufacturing', label: 'Manufacturing' }, { value: 'service', label: 'A service' }];
/** The assumptions listed on the page: the use of the capacity and the price only while sales come from the drivers. */
// Each still standing, and the days only those not typed over (review finding 8: the ledger never lists a value changed).
// The guarantee's only while there is one: CGTMSE's rate and slab only at its own rate, its limit only with one, its
// margin money only under PMEGP.
export function assumptionsOf(s: ReportState) {
  const days = (['stock', 'debtors', 'creditors'] as const).filter((k) => s.days[k] === EMPTY.days[k]);
  const g = guaranteeOf(s), own = !s.feeRate.trim(), limit = (limitOf(s) ?? 0) > 0;
  const shows: Record<string, boolean> = {
    simpleCost: HEADS.every((h) => SIMPLE_COST.includes(h.id) || !s.cost[h.id].trim()), simpleFunds: !s.unsecured.trim() && (s.scheme === 'pmegp' || !s.subsidy.trim()),
    simpleDrawn: !s.loan.disbursed.trim() && (s.loan.repayment ?? 'emi') === 'emi', simpleMoratorium: !s.loan.moratoriumMonths.trim(),
    simpleFixedGrowth: !s.fixedGrowth.trim(), simpleWcRate: !s.wcRate.trim() && limit,
    guaranteeFee: !!g && own, guaranteeFirst: !!g, cgtmseOther: g === 'cgtmse' && own, cgtmseRate: g === 'cgtmse' && own,
    cgtmseWc: g === 'cgtmse' && limit, cgtmsePmegp: g === 'cgtmse' && s.scheme === 'pmegp',
  };
  return ASSUMPTIONS.filter((a) => (shows[a.id] ?? true) && ('simple' in a ? simple(s) : true) && (s.salesBy === 'drivers' || (a.id !== 'utilisation' && a.id !== 'price'))
    && (a.id !== 'days' || days.length > 0) && (a.id !== 'utilisation' || s.utilisation === EMPTY.utilisation) && (a.id !== 'price' || s.priceGrowth === EMPTY.priceGrowth))
    .map((a) => (a.id === 'days' && days.length < 3 ? { ...a, shown: days.map((k) => `${k} ${EMPTY.days[k]} days`).join(', ') }
      : a.id === 'simpleFunds' && s.scheme === 'pmegp' ? { ...a, shown: 'No unsecured loans' } : a));
}
/** The fixed assets simple mode asks; the other heads are its assumption of none. */
export const SIMPLE_COST: HeadId[] = ['machinery', 'building'];
const thisMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const monthsFrom = (a: string, b: string) => (+b.slice(0, 4) - +a.slice(0, 4)) * 12 + (+b.slice(5, 7) - +a.slice(5, 7));
const addMonths = (a: string, n: number) => { const m = +a.slice(0, 4) * 12 + +a.slice(5, 7) - 1 + n; return `${Math.floor(m / 12)}-${String((m % 12) + 1).padStart(2, '0')}`; };
const figText = (n: number) => inr(n, Number.isInteger(n) ? 0 : 2);
const typedHeads = (h?: Record<string, string>) => Object.entries(h ?? {}).filter(([, t]) => t.trim());
const LABEL = Object.fromEntries([...COST_HEADS.variable, ...COST_HEADS.fixed].map((h) => [h.id, h.label]));

/** In simple mode, what it assumes or works out in place of the expert fields left empty (D-UX-112); a field typed in
 * expert mode is kept, and listed by `changedOf`. */
function simpleTerms(s: ReportState) {
  const drawn = s.loan.disbursed.trim() ? parseMonth(s.loan.disbursed) : thisMonth(), sell = s.sellFrom?.trim() ? parseMonth(s.sellFrom) : undefined;
  const toStart = drawn && sell ? monthsFrom(drawn, sell) : undefined, years = s.years?.trim() ? plainOf(s.years) : undefined, month = s.fixedMonth?.trim() ? amountOf(s.fixedMonth) : undefined;
  return { drawn, sell, toStart, instalments: years === undefined ? undefined : Math.round(years * 12), fixed: month === undefined ? undefined : month * 12 };
}

/** Simple mode's needs, in its words: its own questions in place of the expert fields they fill. */
export function simpleNeeds(s: ReportState): string[] {
  const t = simpleTerms(s), out: string[] = [];
  if (s.sellFrom?.trim() && !t.sell) out.push('When you will start selling: a month, such as March 2027');
  else if (t.toStart !== undefined && t.toStart < 0) out.push('When you will start selling: the month the loan is first drawn or later');
  if (s.scheme !== 'mudra' && !s.security) out.push('What backs the loan besides the project\'s own assets');
  return out;
}
const SIMPLE_WORDS: [string, string | undefined][] = [
  ['Months from the loan to the first sales', 'When you will start selling'], ['The term loan: the number of instalments', 'Years to repay'],
  ['Fixed costs in a full first year', 'Fixed costs a month'], ['The term loan: the moratorium', undefined], ['The working-capital limit: its interest rate', undefined],
];
const LIMIT_NEED = 'The working-capital limit: worked out, your own figure, or none';
const LIMIT_WAITS = 'The working-capital limit worked out: it waits for the sales, the costs and the days';
/** The engine's needs as the page asks them: the limit's choice in both modes, simple mode's questions in its own. */
export function needsWords(s: ReportState, needs: string[]): string[] {
  const t = simpleTerms(s), by = wcByOf(s), words = needs.map((n) => (!n.startsWith('The working-capital limit sought') || by === 'typed' ? n : by === 'worked' ? LIMIT_WAITS : LIMIT_NEED));
  if (!simple(s)) return words;
  const mapped = words.map((n) => { const w = SIMPLE_WORDS.find(([k]) => n.startsWith(k)); return w ? w[1] : n; })
    .filter((n): n is string => n !== undefined && !(t.toStart !== undefined && t.toStart < 0 && n === 'When you will start selling'));
  return [...new Set([...mapped, ...simpleNeeds(s)])];
}

export const MODE_CHOICES: { value: Mode; label: string; hint: string }[] = [
  { value: 'simple', label: 'Simple', hint: 'About a dozen questions; the rest assumed and listed' }, { value: 'expert', label: 'Expert', hint: 'Every figure, and costs by head' }];
export const WC_CHOICES: { value: WcBy; label: string }[] = [{ value: 'worked', label: 'Work it out for me' }, { value: 'typed', label: 'I will type my own' }, { value: 'none', label: 'None needed' }];
export const SECURITY_CHOICES: { value: Security; label: string; hint?: string }[] = [
  { value: 'property', label: 'Property', hint: 'Its market value counts in the security cover' },
  { value: 'cgtmse', label: 'A CGTMSE guarantee', hint: 'Its fee goes into the projections as a finance cost' }, { value: 'neither', label: 'Neither' }];
export { COST_HEADS };
/** The limit worked out, in words with the two figures it is the lower of (D-UX-112); figures from engine/report.ts. */
export function workedLine(s: ReportState): string | undefined {
  if (wcByOf(s) !== 'worked') return undefined;
  const w = workedLimit(inputOf(s));
  const { mpbfSharePct: share, turnoverBankPct: bank } = WORKING_CAPITAL;
  return w ? `Worked out: Rs. ${inr(w.limit)}. It is the lower of ${share}% of stock and debtors less creditors, Rs. ${inr(w.need)}, and ${bank}% of a full first year's sales, Rs. ${inr(w.turnover)}.`
    : 'Worked out once the sales, the costs and the days are in.';
}
/** A side's costs added up from its heads, in words, while any is typed (expert mode). */
export function headsSum(s: ReportState, side: 'variable' | 'fixed'): string | undefined {
  if (!typedHeads(s.heads?.[side]).length) return undefined;
  const c = costsOf(inputOf(s)), n = side === 'variable' ? c.variablePct : c.fixedCosts;
  if (n === undefined || !Number.isFinite(n)) return undefined;
  return side === 'variable' ? `Materials and other variable costs: ${+n.toFixed(2)}% of sales, the heads added up.` : `Fixed costs: Rs. ${figText(n)} in a full first year, the heads added up.`;
}

/** What expert mode set apart from simple mode's assumptions, listed in simple mode with its value (D-UX-112). */
export function changedOf(s: ReportState): string[] {
  if (!simple(s)) return [];
  const out: string[] = [], x = inputOf(s);
  const others = HEADS.filter((h) => !SIMPLE_COST.includes(h.id) && s.cost[h.id].trim());
  if (others.length) out.push(`The cost of the project: ${others.map((h) => `${h.label.toLowerCase()} Rs. ${s.cost[h.id]}`).join(', ')}`);
  if (s.scheme !== 'pmegp' && s.subsidy.trim()) out.push(`A capital subsidy of Rs. ${s.subsidy}`);
  if (s.unsecured.trim()) out.push(`Unsecured loans of Rs. ${s.unsecured}`);
  if (s.loan.disbursed.trim()) out.push(`The loan first drawn in ${s.loan.disbursed}`);
  if ((s.loan.repayment ?? 'emi') !== 'emi') out.push(`Repaid by ${(REPAYMENT_CHOICES.find((c) => c.value === s.loan.repayment) as { label: string }).label.toLowerCase()}`);
  if (s.loan.moratoriumMonths.trim()) out.push(`A moratorium of ${s.loan.moratoriumMonths} months`);
  if (s.salesBy === 'typed') out.push('Sales typed by year, in place of the products');
  else {
    if (s.utilisation !== EMPTY.utilisation) out.push(`Use of the capacity by year: ${s.utilisation}%`);
    if (s.priceGrowth !== EMPTY.priceGrowth) out.push(`Prices growing ${s.priceGrowth}% a year`);
  }
  const days = (['stock', 'debtors', 'creditors'] as const).filter((k) => s.days[k] !== EMPTY.days[k]);
  if (days.length) out.push(`Days of ${days.map((k) => `${k} ${s.days[k]}`).join(', ')}`);
  const v = typedHeads(s.heads?.variable), f = typedHeads(s.heads?.fixed);
  if (v.length || f.length) out.push(`Costs by head: ${[...v.map(([id, t]) => `${LABEL[id].toLowerCase()} ${t}%`), ...f.map(([id, t]) => `${LABEL[id].toLowerCase()} Rs. ${t} a month`)].join(', ')}`);
  if (s.fixedGrowth.trim()) out.push(`Fixed costs growing ${s.fixedGrowth}% a year`);
  if (s.wcRate.trim() && (x.wcLimit ?? 0) > 0) out.push(`The limit's rate: ${s.wcRate}%`);
  if (guaranteeOf(s) === 'cgtmse' && s.security === 'property') out.push('A CGTMSE guarantee beside the property');
  if (guaranteeOf(s) && s.feeRate.trim()) out.push(`A guarantee fee of ${s.feeRate}% a year`);
  if (guaranteeOf(s) === 'cgtmse' && (s.concessions ?? []).some(Boolean)) out.push('CGTMSE\'s concessions ticked');
  return out;
}

/** Switching modes: into expert, simple mode's answers and assumptions written into the fields they stand for; into
 * simple, the fields simple mode asks in its own words taken back, and those at its assumptions emptied again. */
export function withMode(s: ReportState, mode: Mode): ReportState {
  if ((s.mode ?? 'expert') === mode) return s;
  if (mode === 'expert') {
    // Each assumption is written beside the answer it goes with, so the figures do not change; one not yet reached stays asked.
    const t = simpleTerms(s), keep = (a: string, b?: string) => (a.trim() || b === undefined ? a : b), has = (x?: string) => !!x?.trim(), wc = wcByOf(s);
    const g = s.scheme === 'mudra' ? {} : s.security === 'property' ? {} : s.security ? { cgtmse: s.security === 'cgtmse', collateral: '' } : {};
    return {
      ...s, ...g, mode, monthsToStart: t.toStart !== undefined && t.toStart >= 0 ? String(t.toStart) : s.monthsToStart,
      loan: { ...s.loan, disbursed: keep(s.loan.disbursed, has(s.sellFrom) ? t.drawn : undefined), moratoriumMonths: keep(s.loan.moratoriumMonths, t.toStart !== undefined && t.toStart >= 0 ? String(t.toStart) : undefined),
        instalments: t.instalments !== undefined && Number.isFinite(t.instalments) ? String(t.instalments) : s.loan.instalments, repayment: s.loan.repayment ?? (has(s.years) ? 'emi' : undefined) },
      fixed: t.fixed !== undefined && Number.isFinite(t.fixed) ? figText(t.fixed) : s.fixed,
      fixedGrowth: keep(s.fixedGrowth, has(s.fixedMonth) ? String(assumed('simpleFixedGrowth')) : undefined),
      wcRate: wc === 'worked' || wc === 'typed' ? keep(s.wcRate, s.loan.ratePct.trim() || undefined) : s.wcRate,
    };
  }
  const drawn = parseMonth(s.loan.disbursed), toStart = plainOf(s.monthsToStart), n = plainOf(s.loan.instalments), f = amountOf(s.fixed);
  const sell = drawn && toStart !== undefined && Number.isInteger(toStart) ? addMonths(drawn, toStart) : s.sellFrom;
  const security: Security | undefined = s.scheme === 'mudra' ? s.security : s.collateral.trim() ? 'property' : s.cgtmse ? 'cgtmse' : s.security ? 'neither' : undefined;
  return {
    ...s, mode, sellFrom: sell, monthsToStart: '', security,
    years: n !== undefined && Number.isFinite(n) ? String(+(n / 12).toFixed(2)) : s.years, fixedMonth: f !== undefined && Number.isFinite(f) ? figText(+(f / 12).toFixed(2)) : s.fixedMonth, fixed: '',
    loan: { ...s.loan, disbursed: drawn === thisMonth() ? '' : s.loan.disbursed, moratoriumMonths: s.loan.moratoriumMonths.trim() === s.monthsToStart.trim() ? '' : s.loan.moratoriumMonths, instalments: '' },
    fixedGrowth: s.fixedGrowth.trim() === String(assumed('simpleFixedGrowth')) ? '' : s.fixedGrowth, wcRate: s.wcRate.trim() === s.loan.ratePct.trim() ? '' : s.wcRate,
  };
}
export { ASSUMPTIONS, HEADS, PMEGP, REPORT_REVIEW_BY };

export const amountOf = (t: string) => (t.trim() ? parseAmount(t) : undefined);
export const plainOf = (t: string) => (t.trim() ? parseAmount(t.replace(/%\s*$/, ''), false) : undefined);
export const tidyAmount = (t: string) => { const n = amountOf(t); return n === undefined ? t : inr(n, Number.isInteger(n) ? 0 : 2); };

export function inputOf(s: ReportState): ReportInput {
  const x = fieldsOf(s), v = typedHeads(s.heads?.variable), f = typedHeads(s.heads?.fixed);
  // Costs by head (expert mode): a side with a head typed is added up from its heads, in place of its total.
  if (v.length || f.length) x.costHeads = { variable: Object.fromEntries(v.map(([id, t]) => [id, plainOf(t) ?? NaN])), fixed: Object.fromEntries(f.map(([id, t]) => [id, amountOf(t) ?? NaN])) };
  if (v.length) x.variablePct = undefined;
  if (f.length) x.fixedCosts = undefined;
  if (simple(s)) {
    const t = simpleTerms(s);
    x.loan = { ...x.loan, disbursed: t.drawn, moratoriumMonths: s.loan.moratoriumMonths.trim() ? x.loan.moratoriumMonths : t.toStart, instalments: t.instalments,
      ...(s.loan.repayment ? {} : { frequency: 'monthly', style: 'emi' }) };
    x.monthsToStart = t.toStart !== undefined && t.toStart < 0 ? undefined : t.toStart;
    if (!f.length) x.fixedCosts = t.fixed;
    if (!s.fixedGrowth.trim()) x.fixedGrowthPct = assumed('simpleFixedGrowth') as number;
    if (!s.wcRate.trim()) x.wcRatePct = x.loan.ratePct;
  }
  const by = wcByOf(s);
  x.wcLimit = by === 'none' ? 0 : by === 'worked' ? workedLimit(x)?.limit : by === 'typed' ? x.wcLimit : undefined;
  return x;
}

/** The input as the expert fields hold it. */
function fieldsOf(s: ReportState): ReportInput {
  const opt = (t: string) => (t.trim() ? amountOf(t) ?? NaN : undefined);
  const r = s.loan.repayment;
  return {
    taxBy: s.borrower,
    cost: Object.fromEntries(HEADS.map((h) => [h.id, opt(s.cost[h.id])]).filter(([, v]) => v !== undefined)),
    loan: {
      amount: amountOf(s.loan.amount), ratePct: plainOf(s.loan.ratePct), disbursed: parseMonth(s.loan.disbursed), moratoriumMonths: plainOf(s.loan.moratoriumMonths),
      instalments: plainOf(s.loan.instalments), ...(r ? { frequency: r === 'quarterly' ? 'quarterly' : 'monthly', style: r === 'emi' ? 'emi' : 'equal-principal' } : {}),
    },
    subsidy: s.scheme === 'pmegp' ? undefined : opt(s.subsidy), unsecured: opt(s.unsecured), collateral: opt(collateralText(s)),
    salesBy: s.salesBy, monthsToStart: plainOf(s.monthsToStart),
    ...(s.salesBy === 'typed' ? { sales: amountOf(s.sales), salesGrowthPct: plainOf(s.salesGrowth) } : {
      products: s.products.map((p) => ({ name: p.name, unitsMonth: plainOf(p.units), price: amountOf(p.price) })),
      priceGrowthPct: plainOf(s.priceGrowth),
      utilisationPct: s.utilisation.split(/[,\s]+/).filter(Boolean).map((t) => plainOf(t) ?? NaN),
    }),
    ...(s.scheme === 'pmegp' ? { scheme: { id: 'pmegp' as const, category: s.category, area: s.area, activity: s.activity, confirmed: !!s.pmegpConfirmed } }
      : s.scheme === 'mudra' ? { scheme: { id: 'mudra' as const, tarunRepaid: !!s.tarunRepaid } } : {}),
    ...(guaranteeOf(s) ? { guarantee: { ...(guaranteeOf(s) === 'cgtmse' ? { cgtmse: true, concessions: (s.concessions ?? []).filter(Boolean).length } : {}),
      ...(s.feeRate.trim() ? { ratePct: plainOf(s.feeRate) ?? NaN } : {}) } } : {}), variablePct: plainOf(s.variablePct), fixedCosts: amountOf(s.fixed), fixedGrowthPct: plainOf(s.fixedGrowth),
    days: { stock: plainOf(s.days.stock), debtors: plainOf(s.days.debtors), creditors: plainOf(s.days.creditors) },
    wcLimit: amountOf(s.wcLimit), wcRatePct: plainOf(s.wcRate),
  };
}

// ---- The report as tables, for the page and the document alike ----

export type RowKind = 'head' | 'total' | 'ratio';
/** A row: its words for each column, and the engine's exact figures (`fig`: rupees, or a ratio or percentage). */
export interface ViewRow { label: string; values: string[]; n?: (number | undefined)[]; kind?: RowKind; fig?: 'ratio' }
/** A table: `first` heads the column naming each row; `columns` head the others (the years, or "Rupees"). */
export interface ViewTable { id: string; title: string; first: string; columns: string[]; rows: ViewRow[] }

const rupees = (x: number) => inr(x);
const ratio = (x?: number) => (x === undefined || !Number.isFinite(x) ? '—' : x.toFixed(2));
const pct = (x?: number) => (x === undefined || !Number.isFinite(x) ? '—' : `${x.toFixed(2)}%`);

/** A row of amounts, one for each year, from a field of the report's years. */
const line = (ys: ReportYear[], label: string, f: (y: ReportYear) => number, kind?: RowKind): ViewRow =>
  ({ label, values: ys.map((y) => rupees(f(y))), n: ys.map(f), ...(kind ? { kind } : {}) });
const head = (label: string): ViewRow => ({ label, values: [], kind: 'head' });
const ratios = (ys: ReportYear[], label: string, f: (y: ReportYear) => number | undefined, show = ratio): ViewRow =>
  ({ label, values: ys.map((y) => show(f(y))), n: ys.map(f), fig: 'ratio' });

/** `key`: the answer's figures; `check`, the lender's ratio (CheckRow's id) a figure is read against, said beside it on the page. */
export interface ReportView { tables: ViewTable[]; key: { label: string; value: string; note?: string; check?: string }[]; years: string[] }

/** The costs in the profit and loss: by head where typed (D-UX-112), each side's total otherwise. */
const costRows = (ys: ReportYear[]): ViewRow[] => {
  const hv = ys[0]?.heads?.variable ?? [], hf = ys[0]?.heads?.fixed ?? [];
  const by = (side: 'variable' | 'fixed', i: number) => (y: ReportYear) => y.heads?.[side][i]?.amount ?? 0;
  return [
    ...(hv.length ? hv.map((h, i) => line(ys, `Less: ${h.label.toLowerCase()}`, by('variable', i))) : [line(ys, 'Less: materials and other variable costs', (y) => y.variable)]),
    ...(hf.length ? hf.map((h, i) => line(ys, `Less: ${h.label.toLowerCase()}`, by('fixed', i))) : [line(ys, 'Less: fixed costs', (y) => y.fixed)]),
  ];
};

export function viewOf(r: Report): ReportView {
  const ys = r.years, years = ys.map((y) => y.fy), any = (f: (y: ReportYear) => number) => ys.some((y) => Math.abs(f(y)) > 0.005);
  const t = r.plan.statement.total, pt = r.plan.profitTotal, total = (x?: number) => (t && x !== undefined ? rupees(x) : '');
  const cost: ViewTable = {
    id: 'cost', title: 'Cost of the project', first: 'Item', columns: ['Rupees'],
    rows: [...r.cost.map((c) => ({ label: c.label, values: [rupees(c.amount)], n: [c.amount] })),
      { label: 'Total cost of the project', values: [rupees(r.projectCost)], n: [r.projectCost], kind: 'total' }],
  };
  const f = r.finance, sc = r.scheme, g = r.guarantee, subsidyLabel = sc ? 'PMEGP margin money' : 'Capital subsidy';
  const finance: ViewTable = {
    id: 'finance', title: 'Means of finance', first: 'Source', columns: ['Rupees'],
    rows: [
      { label: `Promoters’ contribution (${f.promoterPct.toFixed(2)}%)`, values: [rupees(f.promoter)], n: [f.promoter] },
      ...(sc ? [{ label: `PMEGP margin money, ${sc.ratePct}% of Rs. ${rupees(sc.base)}: a deposit for ${PMEGP.lockInYears} years, then set off against the loan`, values: [rupees(f.subsidy)], n: [f.subsidy] }]
        : f.subsidy ? [{ label: 'Capital subsidy', values: [rupees(f.subsidy)], n: [f.subsidy] }] : []),
      ...(f.unsecured ? [{ label: 'Unsecured loans', values: [rupees(f.unsecured)], n: [f.unsecured] }] : []),
      { label: sc ? `Term loan: Rs. ${rupees(sc.sanctioned)} sanctioned, less the margin money` : r.mudra ? `Term loan under Mudra (${r.mudra.level.label}), with no collateral` : 'Term loan', values: [rupees(f.termLoan)], n: [f.termLoan] },
      { label: 'Total means of finance', values: [rupees(f.total)], n: [f.total], kind: 'total' },
    ],
  };
  // Sales by product (D-UX-109): each line's units sold, price a unit and sales a year; the lines add up to the sales.
  const whole = (x: number) => (Math.abs(x - Math.round(x)) < 1e-6 ? inr(Math.round(x)) : inr(x, 2));
  const names = ys[0].products?.map((p) => p.name) ?? [];
  const sales: ViewTable | undefined = names.length ? {
    id: 'sales', title: 'Sales by product', first: 'Rupees', columns: years,
    rows: [...names.flatMap((name, i) => [head(name),
      { label: 'Units sold', values: ys.map((y) => whole((y.products as NonNullable<ReportYear['products']>)[i].units)), n: ys.map((y) => (y.products as NonNullable<ReportYear['products']>)[i].units), fig: 'ratio' as const },
      { label: 'Price a unit', values: ys.map((y) => whole((y.products as NonNullable<ReportYear['products']>)[i].price)), n: ys.map((y) => (y.products as NonNullable<ReportYear['products']>)[i].price) },
      line(ys, 'Sales', (y) => (y.products as NonNullable<ReportYear['products']>)[i].sales)]),
    line(ys, 'Total sales', (y) => y.sales, 'total')],
  } : undefined;
  const pl: ViewTable = {
    id: 'pl', title: 'Projected profit and loss', first: 'Rupees', columns: years,
    rows: [
      ...(ys.some((y) => y.months < 12) ? [{ label: 'Months of sales', values: ys.map((y) => String(y.months)), n: ys.map((y) => y.months), fig: 'ratio' as const }] : []),
      ...(ys.some((y) => y.utilisationPct !== undefined) ? [ratios(ys, 'Use of the capacity', (y) => y.utilisationPct, (x) => (x === undefined ? '—' : `${x}%`))] : []),
      line(ys, 'Sales', (y) => y.sales), ...costRows(ys),
      line(ys, 'Profit before interest, depreciation and tax', (y) => y.pbdit, 'total'),
      line(ys, 'Less: depreciation', (y) => y.depreciation), line(ys, 'Less: preliminary expenses written off', (y) => y.preliminary),
      line(ys, 'Less: interest on the term loan', (y) => y.tlInterest), line(ys, 'Less: interest on working capital', (y) => y.wcInterest),
      ...(g ? [line(ys, `Less: guarantee fee (${g.id.toUpperCase()})`, (y) => y.guaranteeFee)] : []),
      line(ys, 'Profit before tax', (y) => y.pbt, 'total'), line(ys, 'Less: tax', (y) => y.tax), line(ys, 'Profit after tax', (y) => y.pat, 'total'),
    ],
  };
  const bs: ViewTable = {
    id: 'bs', title: 'Projected balance sheet, at each year end', first: 'Rupees', columns: years,
    rows: [
      head('Liabilities'), line(ys, 'Capital', (y) => y.capital), ...(any((y) => y.subsidy) ? [line(ys, subsidyLabel, (y) => y.subsidy)] : []),
      line(ys, 'Profit retained', (y) => y.retained), line(ys, 'Net worth', (y) => y.netWorth, 'total'),
      ...(any((y) => y.unsecured) ? [line(ys, 'Unsecured loans', (y) => y.unsecured)] : []), line(ys, 'Term loan', (y) => y.termLoan),
      line(ys, 'Working-capital loan', (y) => y.wcLoan), line(ys, 'Creditors', (y) => y.creditors), line(ys, 'Total liabilities', (y) => y.liabilities, 'total'),
      head('Assets'), line(ys, 'Fixed assets at cost', (y) => y.grossBlock), line(ys, 'Less: depreciation to date', (y) => y.accumulated),
      line(ys, 'Net fixed assets', (y) => y.netBlock, 'total'), ...(any((y) => y.preliminaryLeft) || any((y) => y.preliminary) ? [line(ys, 'Preliminary expenses not written off', (y) => y.preliminaryLeft)] : []),
      line(ys, 'Stock', (y) => y.stock), line(ys, 'Debtors', (y) => y.debtors), line(ys, 'Cash and bank', (y) => y.cash), line(ys, 'Total assets', (y) => y.assets, 'total'),
    ],
  };
  const cf: ViewTable = {
    id: 'cf', title: 'Projected cash flow', first: 'Rupees', columns: years,
    rows: [
      head('Sources'), line(ys, 'Capital brought in', (y) => y.flow.capital), ...(any((y) => y.flow.subsidy) ? [line(ys, subsidyLabel, (y) => y.flow.subsidy)] : []),
      ...(any((y) => y.flow.unsecured) ? [line(ys, 'Unsecured loans', (y) => y.flow.unsecured)] : []), line(ys, 'Term loan drawn', (y) => y.flow.termLoan),
      line(ys, 'Profit after tax', (y) => y.flow.pat), line(ys, 'Depreciation', (y) => y.flow.depreciation), line(ys, 'Preliminary expenses written off', (y) => y.flow.preliminary),
      line(ys, 'Working-capital loan', (y) => y.flow.wcLoan), line(ys, 'Increase in creditors', (y) => y.flow.creditors), line(ys, 'Total sources', (y) => y.flow.sources, 'total'),
      head('Uses'), line(ys, 'Fixed assets', (y) => y.flow.fixedAssets), line(ys, 'Preliminary expenses', (y) => y.flow.preliminarySpent),
      line(ys, 'Increase in stock', (y) => y.flow.stock), line(ys, 'Increase in debtors', (y) => y.flow.debtors), line(ys, 'Term loan repaid', (y) => y.flow.repaid),
      line(ys, 'Total uses', (y) => y.flow.uses, 'total'),
      line(ys, 'Net cash flow', (y) => y.flow.net), line(ys, 'Cash at the start of the year', (y) => y.flow.opening), line(ys, 'Cash at the end of the year', (y) => y.flow.closing, 'total'),
    ],
  };
  // The DSCR, with its Total column from the engine (the average is total A ÷ total B).
  const withTotal = (row: ViewRow, x?: number, text?: string): ViewRow => (t ? { ...row, values: [...row.values, text ?? total(x)], n: [...(row.n ?? []), x] } : row);
  const dscr: ViewTable = {
    id: 'dscr', title: 'Debt service coverage ratio (DSCR)', first: 'Rupees', columns: [...years, ...(t ? ['Total'] : [])],
    rows: [
      head('Cash available for debt service'),
      withTotal(line(ys, 'Profit after tax', (y) => y.pat), pt?.pat), withTotal(line(ys, 'Add: depreciation', (y) => y.depreciation), pt?.depreciation),
      withTotal(line(ys, 'Add: preliminary expenses written off', (y) => y.preliminary), pt?.nonCash), withTotal(line(ys, 'Add: interest on the term loan', (y) => y.tlInterest), pt?.interestTL),
      withTotal(line(ys, 'Cash available (A)', (y) => y.available, 'total'), t?.available),
      head('Debt service'),
      withTotal(line(ys, 'Principal', (y) => y.principal), t?.figures.principalTL), withTotal(line(ys, 'Interest on the term loan', (y) => y.tlInterest), t?.figures.interestTL),
      withTotal(line(ys, 'Debt service (B)', (y) => y.service, 'total'), t?.service),
      withTotal({ label: 'DSCR (A ÷ B)', values: ys.map((y) => ratio(y.dscr)), n: ys.map((y) => y.dscr), kind: 'ratio', fig: 'ratio' }, r.average, ratio(r.average)),
    ],
  };
  const bep: ViewTable = {
    id: 'bep', title: 'Break-even', first: 'Rupees', columns: years,
    rows: [
      line(ys, 'Sales', (y) => y.sales), line(ys, 'Contribution (sales less variable costs)', (y) => y.contribution),
      line(ys, 'Fixed costs, with depreciation, write-off and interest', (y) => y.fixedAll),
      { label: 'Break-even sales', values: ys.map((y) => (y.bepSales === undefined ? '—' : rupees(y.bepSales))), n: ys.map((y) => y.bepSales), kind: 'total' },
      ratios(ys, 'Break-even, as a share of sales', (y) => y.bepPct, pct), ratios(ys, 'Cash break-even, as a share of sales', (y) => y.cashBepPct, pct),
    ],
  };
  const keyRatios: ViewTable = {
    id: 'ratios', title: 'Key ratios', first: 'Ratio', columns: years,
    rows: [
      ratios(ys, 'Current ratio', (y) => y.currentRatio), ratios(ys, 'Term loan ÷ net worth', (y) => y.debtEquity),
      ratios(ys, 'Total outside liabilities ÷ net worth', (y) => y.tolTnw), ratios(ys, 'Interest cover', (y) => y.interestCover),
      ratios(ys, 'Net profit margin', (y) => y.netMarginPct, pct), ratios(ys, 'Net fixed assets ÷ term loan', (y) => y.facr), ratios(ys, 'DSCR', (y) => y.dscr),
      ...(r.collateral ? [ratios(ys, 'Security cover, with the collateral at its realisable value', (y) => y.securityCover)] : []),
    ],
  };
  const c = r.collateral, collateral: ViewTable | undefined = c && {
    id: 'collateral', title: 'Collateral', first: 'Value', columns: ['Rupees'],
    rows: [
      { label: 'Market value', values: [rupees(c.market)], n: [c.market] },
      { label: `Realisable sale value, ${LEVELS.collateral.rsvPct}% of it: counted in the security cover`, values: [rupees(c.rsv)], n: [c.rsv] },
      { label: `Distress sale value, ${LEVELS.collateral.dsvPct}% of it`, values: [rupees(c.dsv)], n: [c.dsv] },
    ],
  };
  const wc: ViewTable = {
    id: 'wc', title: 'Working capital', first: 'Rupees', columns: years,
    rows: [
      line(ys, 'Stock', (y) => y.stock), line(ys, 'Debtors', (y) => y.debtors), line(ys, 'Current assets', (y) => y.currentAssets, 'total'),
      line(ys, 'Less: creditors', (y) => y.creditors), line(ys, 'Working-capital gap', (y) => y.gap, 'total'),
      line(ys, 'Bank finance, second method (75% of current assets less creditors)', (y) => y.mpbf),
      line(ys, 'By turnover: working capital, 25% of sales', (y) => y.turnoverNeed), line(ys, 'By turnover: bank finance, 20% of sales', (y) => y.turnoverBank),
      line(ys, 'Limit sought', () => r.wcLimit, 'total'),
    ],
  };
  const schedule: ViewTable = {
    id: 'schedule', title: 'Repayment of the term loan', first: 'Year', columns: ['Interest', 'Principal', 'Balance at year end'],
    rows: r.plan.schedule.map((d) => ({ label: d.fy, values: [rupees(d.interest), rupees(d.principal), rupees(d.closing)], n: [d.interest, d.principal, d.closing] })),
  };
  return {
    years, tables: [cost, finance, ...(collateral ? [collateral] : []), ...(sales ? [sales] : []), pl, bs, cf, dscr, bep, keyRatios, wc, schedule],
    key: [
      { label: 'Cost of the project', value: `Rs. ${rupees(r.projectCost)}` },
      ...(sc ? [{ label: 'PMEGP margin money', value: `Rs. ${rupees(sc.subsidy)}`, note: `${sc.ratePct}% of Rs. ${rupees(sc.base)}, set off after ${PMEGP.lockInYears} years` }] : []),
      ...(r.mudra ? [{ label: 'Mudra', value: r.mudra.level.label, note: `Rs. ${rupees(r.mudra.total)} in all, the term loan and the limit; no collateral up to Rs. ${rupees(r.mudra.collateralFreeUpTo)}` }] : []),
      ...(g ? [{ label: `Guarantee fee (${g.id.toUpperCase()})`, value: `${g.ratePct}% a year`, note: `Rs. ${rupees(g.total)} over the loan${g.beforeStart > 0.005 ? `, Rs. ${rupees(g.beforeStart)} of it before sales start` : ''}` }] : []),
      ...(r.average !== undefined ? [{ label: 'Average DSCR', value: ratio(r.average), note: 'total A ÷ total B', check: 'dscrAverage' }] : []),
      ...(r.lowest ? [{ label: 'Lowest DSCR', value: ratio(r.lowest.dscr), note: `in ${r.lowest.fy}`, check: 'dscrLowest' }] : []),
    ],
  };
}

/** `short`: cash below nil, which keeps the report provisional; `flags`: the scheme's rules to look at, never a decision;
 * `checks`: each lender's ratio against its level, `misses` their summary when any misses, with "Make it viable" beside it
 * (D-UX-50, D-UX-52); `collateralNote`: what the security cover needs; `longTerm`: a term past the longest. */
export interface ReportPreview {
  needs: string[]; blocked?: string; view?: ReportView; short?: string; flags: string[];
  checks?: CheckRow[]; misses?: string; collateralNote?: string; longTerm?: string;
  /** Which benchmarks are the user's, and a looser one's warning (BEN1). */
  benchmarks?: string;
}


export function preview(s: ReportState): ReportPreview {
  const x = inputOf(s), r = projectReport(x);
  if ('blocked' in r) return { needs: [], blocked: r.blocked, flags: [] };
  if ('needs' in r) return { needs: needsWords(s, r.needs), flags: [] };
  const asks = simple(s) ? simpleNeeds(s) : [];
  if (asks.length) return { needs: asks, flags: [] };
  const lv = levelsOf(s.benchmarks), c = r.cashShort, d = diagnose(r, x, 'fresh', lv), checks = d.checks.map((k) => rowOf(k)), own = benchmarksNote(d.checks);
  const sc = d.checks.find((k) => k.id === 'securityCover') as RatioCheck, need = sc.meets ? undefined : collateralNeeded(r, x, 'fresh', lv);
  const collateralNote = need === undefined ? undefined : need === 0
    ? `Security cover: the project’s own assets reach ${sc.level.toFixed(2)} without collateral.`
    : `Security cover: collateral with a market value of Rs. ${rupees(need)} or more brings it to ${sc.level.toFixed(2)}.`;
  return {
    needs: [], view: viewOf(r), flags: r.scheme?.flags ?? [], checks,
    ...(d.misses.length ? { misses: `${verdictWords('benchmark', d.checks.length, d.misses.length, d.checks.filter((k) => k.meets === undefined).length)}: ${listed(d.misses.map(labelOf))}.` } : {}),
    ...(collateralNote ? { collateralNote } : {}), ...(own ? { benchmarks: own } : {}),
    ...(d.term.months > d.term.longest ? { longTerm: `The term loan runs ${d.term.months} months with its moratorium, beyond the ${d.term.longest} months an MSME term loan commonly runs at most.` } : {}),
    ...(c ? { short: `Cash goes below nil in ${c.fy}: Rs. ${rupees(c.need)} short at its lowest. The promoters would need that much more, or the costs or loans be changed, to keep it at nil or above.` } : {}),
  };
}

/** The collateral field's hint: what its values are (engine/data/ratios.json, the owner's figures). */
export const COLLATERAL_HINT = `Its realisable sale value, ${LEVELS.collateral.rsvPct}% of it, counts in the security cover; its distress sale value, ${LEVELS.collateral.dsvPct}%, is shown.`;

export const statusText = (p: ReportPreview, more = 0) => {
  const n = p.needs.length + (p.short ? 1 : 0) + more;
  return p.blocked ? 'No figures' : n ? questionsLeft(n) : 'Complete';
};

const years = (n: number, perYear: number) => {
  const y = Math.floor(n / perYear), m = ((n % perYear) * 12) / perYear;
  return [y ? `${y} year${y > 1 ? 's' : ''}` : '', m ? `${m} month${m > 1 ? 's' : ''}` : ''].filter(Boolean).join(' ');
};

/** "Make it viable" (D-UX-50, D-UX-52) as a board (MV2b): the engine's changes (engine/viable.ts), each alone, the rest as
 * typed, the borrower's first, then the lender's. Each card: the lever, how far it moves (and a bar of now against needed),
 * the ratios it brings to their level and those it leaves short, and whether it is within reach. */
/** Cash below nil that a change leaves. */
const cashLeft = (o: Outcome) => (o.cashNeed ? `Cash still goes below nil: the promoters would need Rs. ${upRupees(o.cashNeed)} more.` : undefined);
const chips = (o: Outcome) => ({ fixes: o.fixes.map(labelOf), still: o.still.map(labelOf) });

export function viableOf(s: ReportState): ViableView | undefined {
  const lv = levelsOf(s.benchmarks), v = makeViable(inputOf(s), lv);
  if ('needs' in v || 'blocked' in v) return undefined;
  const lines: ViableLine[] = [], sl = v.sales, push = (l: Omit<ViableLine, 'by'>, by: ViableLine['by'] = 'borrower') => lines.push({ ...l, by });
  const none = { fixes: [], still: [] }, rs = (x: number) => `Rs. ${rupees(x)}`;
  const smaller = (id: string, head: string, l: NonNullable<typeof v.loan>, text: string) =>
    push({ id, head, text, move: `${rs(l.now - l.largest)} less`, bars: { now: l.now, to: l.largest, nowText: rs(l.now), toText: rs(l.largest) }, note: cashLeft(l), ...chips(l) });
  if (sl && v.meets) {
    push({ id: 'sales', head: 'Sales can fall', ...none, ...(sl.tenths < 0 ? {
      move: `${(-sl.tenths / 10).toFixed(1)}%`, bars: { now: sl.now, to: sl.needed, nowText: rs(sl.now), toText: `Rs. ${upRupees(sl.needed)}` },
      // The fall is the card's figure (`move`), so the words do not repeat it (review finding 10).
      text: `To Rs. ${upRupees(sl.needed)} in ${sl.fy} (from Rs. ${rupees(sl.now)}), and every ratio still meets its level.`,
    } : { text: 'Sales cannot fall at all before a ratio misses its level.' }) });
  } else if (sl) {
    const u = sl.use, distinct = u ? u.needed.filter((x, k) => k === 0 || Math.abs(x - u.needed[k - 1]) > 1e-9) : [], top = u ? Math.max(...u.needed) : 0;
    push({ id: 'sales', head: 'Higher sales', move: `+${(sl.tenths / 10).toFixed(1)}%`, ...chips(sl),
      bars: { now: sl.now, to: sl.needed, nowText: rs(sl.now), toText: `Rs. ${upRupees(sl.needed)}` },
      text: `Sales ${(sl.tenths / 10).toFixed(1)}% higher in every year: Rs. ${upRupees(sl.needed)} in ${sl.fy} instead of Rs. ${rupees(sl.now)}.`,
      ...(u?.overFull ? { reach: { out: true, text: `Out of reach at this capacity: it needs ${upPct(top)}% of it. Only a higher price or a larger capacity can carry it.` } }
        : u?.overMost ? { reach: { out: false, text: `Above the ${LEVELS.capacity.mostUsePct}% use of the capacity a plan takes at most: give the reason it can.` } } : {}),
      note: [
        sl.price && u ? `That is a price of Rs. ${(Math.ceil(sl.price.needed * 100 - 1e-6) / 100).toFixed(2)} a unit (now Rs. ${sl.price.now}) at the same use, or the use of the capacity at ${distinct.map((x) => `${upPct(x)}%`).join(', then ')} at the same price.`
          : u ? `That is every price ${(sl.tenths / 10).toFixed(1)}% higher at the same use, or the use of the capacity at ${distinct.map((x) => `${upPct(x)}%`).join(', then ')} at the same prices.` : '',
        cashLeft(sl) ?? '',
      ].filter(Boolean).join(' ') || undefined });
  } else if (v.salesNone) push({ id: 'sales', head: 'Higher sales', text: v.salesNone, ...none });
  if (v.loan) smaller('loan', 'A smaller term loan', v.loan, `A term loan of at most Rs. ${rupees(v.loan.largest)} (now Rs. ${rupees(v.loan.now)}), the promoters bringing Rs. ${upRupees(v.loan.more)} more.`);
  else if (v.loanNone) push({ id: 'loan', head: 'A smaller term loan', text: v.loanNone, ...none });
  if (v.wc) smaller('wc', 'A smaller working-capital limit', v.wc, `A working-capital limit of at most Rs. ${rupees(v.wc.largest)} (now Rs. ${rupees(v.wc.now)}), ${v.wc.more >= 0.5 ? `the promoters bringing Rs. ${upRupees(v.wc.more)} more as margin` : 'with no more margin from the promoters'}.`);
  else if (v.wcNone) push({ id: 'wc', head: 'A smaller working-capital limit', text: v.wcNone, ...none });
  if (v.collateral && v.collateral.now !== undefined && v.collateral.needed > v.collateral.now) {
    const c = v.collateral as { now: number; needed: number };
    push({ id: 'collateral', head: 'More collateral', move: `+${rs(c.needed - c.now)}`, bars: { now: c.now, to: c.needed, nowText: rs(c.now), toText: rs(c.needed) },
      text: `Collateral with a market value of Rs. ${rupees(c.needed)} (now Rs. ${rupees(c.now)}), for the security cover.`,
      fixes: [labelOf('securityCover')], still: v.diagnosis.misses.filter((id) => id !== 'securityCover').map(labelOf) });
  }
  const longest = LEVELS.term.longestMonths;
  const longer = (id: string, head: string, l: Longer, unit: string, text: string) =>
    push({ id, head, text, move: `+${l.needed - l.now} ${unit}${l.needed - l.now > 1 ? 's' : ''}`, bars: { now: l.now, to: l.needed, nowText: String(l.now), toText: String(l.needed) }, note: cashLeft(l), ...chips(l) }, 'lender');
  if (v.moratorium) longer('moratorium', 'A longer moratorium', v.moratorium, 'month', `A moratorium of ${v.moratorium.needed} months (now ${v.moratorium.now}), the whole term within ${longest} months.`);
  else if (v.moratoriumNone) push({ id: 'moratorium', head: 'A longer moratorium', text: v.moratoriumNone, ...none }, 'lender');
  if (v.instalments) {
    const i = v.instalments, every = i.perYear === 4 ? 'quarterly' : 'monthly';
    longer('repayment', 'A longer repayment', i, 'instalment', `${i.needed} ${every} instalments, ${years(i.needed, i.perYear)} (now ${i.now}), the whole term within ${longest} months.`);
  } else if (v.instalmentsNone) push({ id: 'repayment', head: 'A longer repayment', text: v.instalmentsNone, ...none }, 'lender');
  return {
    meets: v.meets, title: v.meets ? 'Every ratio meets a lender’s level: the room' : 'The levers: any one of these alone', lines,
    foot: `${ratiosWord(lv) === 'default benchmark ratios' ? 'The default benchmark ratios' : 'The benchmark ratios: yours where you changed them, else the defaults'}: a fresh or enhanced loan’s, said to follow RBI and not yet checked against an RBI publication; each bank sets its own. Each change is worked alone by the engine, the rest as typed. Change the figures above only to what the business can really reach: a lender tests sales against the market and the capacity.`,
  };
}

// ---- The fix beside the miss (OR2, D-UX-177): why it fails, in a line, and the repayment and the loan that fix it ----

/** What each ratio falls behind when it misses: the cause the line names. */
const CAUSE: Partial<Record<RatioCheck['id'], string>> = {
  dscrLowest: 'the cash the business earns falls short of the instalments and interest due',
  dscrAverage: 'the cash the business earns falls short of the instalments and interest due',
  interestCover: 'the profit is thin against the interest',
  currentRatio: 'the current assets are thin against the short-term debts',
  tolTnw: 'the outside liabilities are large against the promoters’ own money',
  debtEquity: 'the term loan is large against the promoters’ own money',
  facr: 'the fixed assets, written down each year, lose value faster than the term loan is repaid',
};
/** `cause`: a sentence for each level missed (the security cover aside); `lead` and `fixes`: the changes that meet them
 * all, each with the plan's levers for "Use this"; `none` when a shorter repayment and a smaller loan cannot. */
export interface FixView { cause: string[]; lead?: string; fixes: { text: string; levers: Levers }[]; none?: string }

export function fixView(s: ReportState): FixView | undefined {
  const f = fixOf(inputOf(s), levelsOf(s.benchmarks));
  if (!f) return undefined;
  const cause = f.diagnosis.checks.filter((k) => f.missed.includes(k.id)).map((k) => (k.why ? `${k.label} fails: ${k.why}.`
    : `${k.label} ${k.at === 'least' ? 'falls to' : 'rises to'} ${ratioAt(k.worst as number, k)}${k.fy ? ` in ${k.fy}` : ' over the loan'}, against its benchmark of ${k.level.toFixed(2)}: ${CAUSE[k.id]}.`));
  const fixes = f.fixes.map(({ instalments: i, loan: l, levers }) => {
    const term = i.needed < i.now ? `Repay in ${years(i.needed, i.perYear)} instead of ${years(i.now, i.perYear)}` : `Keep the repayment at ${years(i.now, i.perYear)}`;
    return { text: `${term}${l.needed < l.now ? ` and borrow Rs. ${rupees(l.needed)} instead of Rs. ${rupees(l.now)}: the promoters bring Rs. ${upRupees(l.more)} more` : ''}.`, levers };
  });
  return fixes.length ? { cause, lead: fixes.length > 1 ? 'Either change makes it work:' : 'This change makes it work:', fixes }
    : { cause, fixes, none: 'Neither a shorter repayment nor a smaller term loan meets it: “Make it viable” works out what else can.' };
}

// ---- The combined plan (MV3, D-UX-52): the levers together, as sliders on the board ----

const HEAD: Record<LeverId, string> = {
  wc: 'A smaller working-capital limit', promoters: 'A smaller term loan', unsecured: 'More unsecured loans', fixed: 'Lower fixed costs',
  sales: 'Higher sales', collateral: 'More collateral', moratorium: 'A longer moratorium', instalments: 'A longer repayment',
};
/** Each lever's card worked alone on MV2b's board (viableOf), by its id there. */
export const ALONE: Partial<Record<LeverId, string>> = { wc: 'wc', promoters: 'loan', sales: 'sales', collateral: 'collateral', moratorium: 'moratorium', instalments: 'repayment' };
const LIMIT_OF: Record<LeverId, string> = {
  wc: 'the promoters’ money', promoters: 'the promoters’ money', unsecured: '', fixed: '', sales: 'the use of the capacity', collateral: '', moratorium: 'the term', instalments: 'the term',
};
/** The slider for lower fixed costs runs to half: no limit is known, the borrower sets it. */
const FIXED_MOST = 500;

export interface PlanCard { id: LeverId; by: 'borrower' | 'lender'; head: string }
/** The engine's plan (engine/plan.ts) for the board: the levers it sets, the cards in its order and the limits it kept. */
export interface PlanView {
  x: ReportInput; lv: Levels; levers: Levers; cards: PlanCard[]; limits: string; atLimit?: string;
  most?: number; promotersNow: number; leastLoan: number; termRoom: number; monthsEach: number; salesMost?: number;
  /** The instalments lever at its lowest (0 or less): the lowest-year DSCR still meets there (OR2b). */
  fewest: number;
  /** When the plan is the fix and the promoters' most is not typed: the question its box asks, once (OR2b, D-UX-183). */
  ask?: string;
  /** When the fix was passed over: it needs more of the promoters' money than their most (OR2b). */
  short?: string;
  /** On Mudra, when the promoters' most and Mudra's Rs. 20 lakh in all cannot fund the project (D-UX-111). */
  mudraShort?: string;
}

/** The plan, with the levers in `held` kept as the borrower set them; none while the report has no figures. */
export function planOf(s: ReportState, held: Partial<Levers> = {}): PlanView | undefined {
  const x = inputOf(s), m = amountOf(s.promotersMost), most = m !== undefined && Number.isFinite(m) && m >= 0 ? m : undefined;
  const lv = levelsOf(s.benchmarks), q = makePlan(x, { ...(most !== undefined ? { promotersMost: most } : {}), held, levels: lv });
  if ('needs' in q || 'blocked' in q) return undefined;
  const L = q.limits, room = (x.loan.amount as number) - L.leastLoan;
  const show: Record<LeverId, boolean> = {
    wc: (x.wcLimit ?? 0) > 0, promoters: room >= 1, unsecured: room >= 1, fixed: (x.fixedCosts ?? 0) > 0, sales: L.sales !== 0,
    collateral: x.collateral !== undefined || q.levers.collateral > 0, moratorium: L.termRoom >= 1, instalments: L.termRoom >= L.monthsEach || L.fewest < 0,
  };
  const head = (id: LeverId) => (id !== 'instalments' || L.fewest >= 0 ? HEAD[id] : L.termRoom >= L.monthsEach ? 'A shorter or longer repayment' : 'A shorter repayment');
  const limited = [...new Set(q.atLimit.map((id) => LIMIT_OF[id]).filter(Boolean))];
  const r = x.scheme?.id === 'mudra' && most !== undefined ? projectReport(x) : undefined;
  const short = r && !('needs' in r) && !('blocked' in r) ? mudraShort(r, most as number) : undefined;
  return {
    ...(short !== undefined ? { mudraShort: `On Mudra, the promoters’ Rs. ${rupees(most as number)} and Mudra’s Rs. ${rupees(MUDRA.mostInAll)} in all leave Rs. ${rupees(short)} of the project unfunded. A loan to a small enterprise outside Mudra, which CGTMSE can guarantee, can be larger: choose None for the scheme, then a CGTMSE guarantee.` } : {}),
    ...(q.fixNeeds !== undefined && most !== undefined ? { short: `The first change above that makes it work needs the promoters to bring Rs. ${upRupees(q.fixNeeds)} in all, more than the Rs. ${rupees(most)} they can.` } : {}),
    ...(q.fromFix && most === undefined && q.promoters.more > 0 ? { ask: `This needs Rs. ${upRupees(q.promoters.more)} more from the promoters: can you bring it?` } : {}),
    x, lv, levers: q.levers, cards: LEVER_IDS.filter((id) => show[id]).map((id) => ({ id, by: id === 'moratorium' || id === 'instalments' ? 'lender' : 'borrower', head: head(id) })),
    limits: `The limits kept: ${most !== undefined ? `the promoters bring at most Rs. ${rupees(most)} in all` : 'no more of the promoters’ money, since the most they can bring is not typed'}; ${L.sales === undefined
      ? 'sales with no limit known, so a lender will test them against the market' : `the use of the capacity at most ${LEVELS.capacity.mostUsePct}% in any year`}; the whole term within ${LEVELS.term.longestMonths} months; unsecured loans and fixed costs only as you set them.`,
    ...(limited.length ? { atLimit: `At the limit: ${listed(limited)}.` } : {}),
    ...(most !== undefined ? { most } : {}), promotersNow: q.promoters.now, leastLoan: L.leastLoan, termRoom: L.termRoom, monthsEach: L.monthsEach, fewest: L.fewest,
    ...(L.sales !== undefined ? { salesMost: L.sales } : {}),
  };
}

/** The board at the sliders (one run of the report): the bars, the verdict, the plan in steps, the promoters' money. */
export interface BoardView {
  checks?: CheckRow[]; works: boolean; verdict: string; still: string[]; line: string;
  steps: string[]; promoters?: string; over?: boolean; moves: Record<LeverId, BoardMove>;
}

export function boardOf(q: PlanView, l: Levers): BoardView {
  const x = q.x, y = withLevers(x, l), rs = (n?: number) => `Rs. ${rupees(n ?? 0)}`, had = x.collateral ?? 0;
  const room = (x.loan.amount as number) - q.leastLoan, typed = x.salesBy === 'typed', pct = (t: number) => `${(t / 10).toFixed(1)}%`;
  const uses = (u?: number[]) => (u ?? []).map((p) => `${p}%`).join(', ');
  const moves: Record<LeverId, BoardMove> = {
    wc: { move: `${rs(l.wc)} less`, to: `A limit of ${rs(y.wcLimit)}`, max: x.wcLimit ?? 0 },
    promoters: { move: `${rs(l.promoters)} less`, to: `A term loan of ${rs(y.loan.amount)}`, max: room - l.unsecured },
    unsecured: { move: `${rs(l.unsecured)} more`, to: `Unsecured loans of ${rs(y.unsecured)}, a term loan of ${rs(y.loan.amount)}`, max: room - l.promoters },
    fixed: { move: `${pct(l.fixed)} lower`, to: `${rs(y.fixedCosts)} in a full first year`, max: FIXED_MOST },
    sales: { move: `+${pct(l.sales)}`, to: typed ? `${rs(y.sales)} in a full first year` : `The use of the capacity at ${uses(y.utilisationPct)}`, max: q.salesMost ?? Math.max(GRID_UP, q.levers.sales) },
    collateral: { move: `${rs(l.collateral)} more`, to: `A market value of ${rs(had + l.collateral)}`, max: Math.max(1000000, 2 * q.levers.collateral, had) },
    moratorium: { move: `+${l.moratorium} month${l.moratorium === 1 ? '' : 's'}`, to: `A moratorium of ${y.loan.moratoriumMonths} months`, max: q.termRoom - l.instalments * q.monthsEach },
    instalments: { move: l.instalments < 0 ? `${-l.instalments} fewer` : `+${l.instalments}`, to: `${y.loan.instalments} instalments`, max: Math.floor((q.termRoom - l.moratorium) / q.monthsEach), min: q.fewest },
  };
  for (const id of LEVER_IDS) {
    const m = moves[id];
    moves[id] = { ...m, max: Math.max(0, m.max, l[id]), ...(m.min !== undefined ? { min: Math.min(0, m.min, l[id]) } : {}), ...(l[id] ? {} : { move: 'As typed' }) };
  }
  const step: Record<LeverId, () => string> = {
    wc: () => `A working-capital limit of ${rs(y.wcLimit)} (now ${rs(x.wcLimit)}).`,
    promoters: () => `A term loan of ${rs(y.loan.amount)} (now ${rs(x.loan.amount)}), the promoters bringing the rest.`,
    unsecured: () => `Unsecured loans of ${rs(y.unsecured)} (now ${rs(x.unsecured)}), the term loan less by as much.`,
    fixed: () => `Fixed costs of ${rs(y.fixedCosts)} in a full first year (now ${rs(x.fixedCosts)}), ${pct(l.fixed)} lower.`,
    sales: () => (typed ? `Sales of ${rs(y.sales)} in a full first year (now ${rs(x.sales)}), ${pct(l.sales)} higher.` : `The use of the capacity at ${uses(y.utilisationPct)} (now ${uses(x.utilisationPct)}).`),
    collateral: () => `Collateral with a market value of ${rs(had + l.collateral)} (now ${had ? rs(had) : 'none'}).`,
    moratorium: () => `A moratorium of ${y.loan.moratoriumMonths} months (now ${x.loan.moratoriumMonths}), if the lender agrees.`,
    instalments: () => `${y.loan.instalments} instalments (now ${x.loan.instalments})${l.instalments > 0 ? ', if the lender agrees' : ''}.`,
  };
  const steps = LEVER_IDS.filter((id) => l[id]).map((id) => step[id]()), r = projectReport(y);
  if ('needs' in r || 'blocked' in r) {
    const why = 'blocked' in r ? r.blocked : `No figures with these changes: ${r.needs.join('; ')}.`;
    return { works: false, verdict: why, still: [], line: 'No figures', steps, moves };
  }
  const d = diagnose(r, y, 'fresh', q.lv), checks = d.checks.map((k) => rowOf(k)), miss = checks.filter((c) => c.verdict === 'misses');
  const p = r.finance.promoter, over = q.most !== undefined && p > q.most + 1e-6, cash = r.cashShort;
  const still = [...miss.map((c) => `${c.label}: ${c.worst}, level ${c.level}.${c.short ? ` ${c.short}` : ''}`),
    ...(cash ? [`Cash goes below nil in ${cash.fy}: Rs. ${upRupees(cash.need)} short at its lowest.`] : [])];
  return {
    checks, works: !miss.length, still, steps, moves, over,
    verdict: miss.length ? `With these changes it still does not work as structured: it misses ${miss.length === 1 ? 'one' : miss.length} of the ${ratiosWord(q.lv)}.`
      : `With these changes it meets every ${ratiosWord(q.lv).replace('ratios', 'ratio')}${checks.some((c) => c.verdict === 'wait') ? ' that can be read' : ''}.`,
    line: miss.length ? `Misses ${miss.length}: ${listed(miss.map((c) => inSentence(c.label)))}` : 'Meets every benchmark',
    promoters: `The promoters bring ${rs(p)} in all (now ${rs(q.promotersNow)})${q.most === undefined ? '' : over
      ? `: Rs. ${upRupees(p - q.most)} more than the ${rs(q.most)} they can` : `, within the ${rs(q.most)} they can`}.`,
  };
}
/** Typed sales have no known limit: the slider runs to double, or the plan's if more. */
const GRID_UP = 1000;

/** A field "Use this plan" writes: its place in the state, its input on the page, its name in the banner (MV3). */
type Key = 'loan.amount' | 'unsecured' | 'wcLimit' | 'fixed' | 'sales' | 'utilisation' | 'collateral' | 'loan.moratoriumMonths' | 'loan.instalments';
export interface PlanChange { key: Key; field: string; label: string; was: string; now: string }
const WRITES: { key: Key; field: string; label: string; by: LeverId[] }[] = [
  { key: 'loan.amount', field: 'fld-tl-amount', label: 'Term loan', by: ['promoters', 'unsecured'] },
  { key: 'unsecured', field: 'fld-unsecured', label: 'Unsecured loans', by: ['unsecured'] },
  { key: 'wcLimit', field: 'fld-wcLimit', label: 'Working-capital limit', by: ['wc'] },
  { key: 'fixed', field: 'fld-fixed', label: 'Fixed costs', by: ['fixed'] },
  { key: 'sales', field: 'fld-sales', label: 'Sales', by: ['sales'] },
  { key: 'utilisation', field: 'fld-utilisation', label: 'Use of the capacity', by: ['sales'] },
  { key: 'collateral', field: 'fld-collateral', label: 'Collateral', by: ['collateral'] },
  { key: 'loan.moratoriumMonths', field: 'fld-tl-moratorium', label: 'Moratorium', by: ['moratorium'] },
  { key: 'loan.instalments', field: 'fld-tl-instalments', label: 'Instalments', by: ['instalments'] },
];
// The limit, fixed costs and instalments as the report uses them: worked out, added up from the heads or from simple
// mode's own questions, which "Use this plan" writes back in their place (D-UX-112).
const SIMPLE_FIELD: Partial<Record<Key, string>> = { fixed: 'fld-fixedMonth', 'loan.instalments': 'fld-years' };
const get = (s: ReportState, k: Key) => {
  if (k === 'wcLimit' && wcByOf(s) !== 'typed') return figText(limitOf(s) ?? 0);
  if (k === 'fixed' && (simple(s) || typedHeads(s.heads?.fixed).length)) { const f = costsOf(inputOf(s)).fixedCosts; return f === undefined ? '' : figText(f); }
  if (k === 'loan.instalments' && simple(s)) { const n = inputOf(s).loan.instalments; return n === undefined ? '' : String(n); }
  return k.startsWith('loan.') ? s.loan[k.slice(5) as 'amount'] : s[k as 'sales'];
};
const put = (s: ReportState, k: Key, t: string): ReportState => {
  const n = amountOf(t), f = typedHeads(s.heads?.fixed), month = f.reduce((a, [, h]) => a + (amountOf(h) ?? 0), 0);
  if (k === 'wcLimit') return { ...s, wcLimit: t, ...(wcByOf(s) === 'typed' ? {} : { wcBy: 'typed' as const }) };
  if (k === 'fixed' && f.length && month > 0 && n !== undefined) {
    return { ...s, heads: { ...s.heads, fixed: Object.fromEntries(f.map(([id, h]) => [id, figText(+(((amountOf(h) ?? 0) * n) / (12 * month)).toFixed(2))])) } };
  }
  if (k === 'fixed' && simple(s)) return { ...s, fixedMonth: n === undefined ? t : figText(+(n / 12).toFixed(2)) };
  if (k === 'loan.instalments' && simple(s)) return { ...s, years: t.trim() ? String(+(+t / 12).toFixed(2)) : '' };
  if (k === 'collateral' && simple(s)) return { ...s, collateral: t, security: 'property' };
  return k.startsWith('loan.') ? { ...s, loan: { ...s.loan, [k.slice(5)]: t } } : { ...s, [k]: t };
};
/** The same figure, give or take the paise a split into heads or months leaves. */
const same = (a: string, b: string) => a === b || Math.abs((amountOf(a) ?? NaN) - (amountOf(b) ?? NaN)) < 1;

/** "Use this plan": the plan's figures (engine/plan.ts's withLevers) written into the fields, and what each was. */
export function applyPlan(s: ReportState, l: Levers): { s: ReportState; changes: PlanChange[] } {
  const y = withLevers(inputOf(s), l), fig = (n?: number) => inr(n ?? 0, Number.isInteger(n) ? 0 : 2);
  const text: Record<Key, () => string> = {
    'loan.amount': () => fig(y.loan.amount), unsecured: () => fig(y.unsecured), wcLimit: () => fig(y.wcLimit), fixed: () => fig(y.fixedCosts),
    sales: () => fig(y.sales), utilisation: () => (y.utilisationPct ?? []).join(', '), collateral: () => fig(y.collateral),
    'loan.moratoriumMonths': () => String(y.loan.moratoriumMonths), 'loan.instalments': () => String(y.loan.instalments),
  };
  const changes = WRITES.filter((w) => w.by.some((id) => l[id]) && (w.key === 'sales' ? s.salesBy === 'typed' : w.key !== 'utilisation' || s.salesBy === 'drivers'))
    .map((w) => ({ key: w.key, field: (simple(s) && SIMPLE_FIELD[w.key]) || w.field, label: w.label, was: get(s, w.key), now: text[w.key]() })).filter((c) => !same(c.was, c.now));
  return { s: changes.reduce((t, c) => put(t, c.key, c.now), s), changes };
}
/** Undo: each field the plan wrote back as it was, unless it has been changed since. */
export const undoPlan = (s: ReportState, changes: PlanChange[]) => changes.reduce((t, c) => (same(get(t, c.key), c.now) ? put(t, c.key, c.was) : t), s);
export const sameLevers = (a: Levers, b: Levers) => LEVER_IDS.every((id) => a[id] === b[id]);
export { AS_TYPED, LEVER_IDS, inSentence, type BoardMove, type CheckRow, type LeverId, type Levers, type ViableLine, type ViableView };
