/**
 * The home page's DSCR story (AG1, D-UX-66): fictional case S of tests/dscr-plan.test.ts (a firm; Rs. 4,50,000 this year,
 * no growth; Rs. 12,00,000 at 12% for 5 years, drawn in October 2026) typed into the front door. Every figure is the
 * engine's, worked out when the page is built; tests/home-story.test.ts holds them to the figures worked by hand there.
 */
import { frontDoor, preview, withBorrower, type State } from '../dscr/model';
import { dscrViableOf } from '../dscr/levers';
import { EMPTY as REPORT_EMPTY, preview as reportPreview, viableOf, type ReportState } from '../report/model';
import { EMPTY_PLAN, planPreview, type PlanState } from '../estimate/plan-model';

const door = (instalments: string): State => {
  const s = withBorrower(frontDoor('2026-10'), 'firm');
  return { ...s, cells: { ...s.cells, pbdit: ['4,50,000'] }, modes: { ...s.modes, pbdit: 'grow' }, rates: { ...s.rates, pbdit: '0' },
    loan: { ...s.loan, amount: '12,00,000', ratePct: '12', instalments } };
};
export const STORY_CASE = door('60');
export const STORY_FIXED = door('80');

/** One picture of the story: each year's DSCR against the target, then the verdict, all in the engine's words. */
export interface StoryFrame {
  years: { fy: string; dscr: string; n: number; meets: boolean }[];
  average: string; lowest: string; lowestYear: string; meets: boolean; verdict: string;
}

function frame(s: State): StoryFrame {
  const p = preview(s), line = p.statement?.lines.find((l) => l.id === 'dscr');
  if (!p.statement || !line || !p.verdict || !p.average || !p.lowest || !p.lowestYear) throw new Error('The story case gives no statement.');
  const target = Number(s.target.minimum);
  const years = p.statement.years.map((fy, i) => ({ fy, dscr: line.values[i], n: line.n?.[i] ?? NaN, meets: (line.n?.[i] ?? 0) >= target }));
  return { years, average: p.average, lowest: p.lowest, lowestYear: p.lowestYear, meets: p.verdict.meets, verdict: p.verdict.text };
}

const years = (instalments: string) => `${Number(instalments) / 12} years`;
/** The seven questions of the front door as the story answers them (D-UX-10's seven, depreciation left out). */
export const STORY_INPUTS: { label: string; value: string }[] = [
  { label: 'Who borrows', value: 'A firm' },
  { label: "This year's profit before interest, depreciation and tax", value: `Rs. ${STORY_CASE.cells.pbdit?.[0]}` },
  { label: 'Growth in sales a year', value: `${STORY_CASE.rates.pbdit}%` },
  { label: 'EMIs already paid, a month', value: 'None' },
  { label: 'Loan amount', value: `Rs. ${STORY_CASE.loan.amount}` },
  { label: 'Interest rate', value: `${STORY_CASE.loan.ratePct}% a year` },
  { label: 'Term', value: years(STORY_CASE.loan.instalments) },
];
export const STORY_TARGET = { minimum: STORY_CASE.target.minimum, average: STORY_CASE.target.average };
export const STORY_TYPED = frame(STORY_CASE);
export const STORY_LONGER = frame(STORY_FIXED);
/** The lender's lever that fixes it: the engine's own sentence from "Make it viable". */
export const STORY_FIX = (() => {
  const l = dscrViableOf(STORY_CASE)?.lines.find((x) => x.id === 'more');
  if (!l?.move) throw new Error('The story case needs no longer repayment.');
  return { head: l.head, text: l.text, move: l.move };
})();

/** One line of a trailer: the pen writes `hand` and `title` lines; a `card` is set in type between them, as a trailer's
 *  title card cuts between its shots; `mark` is the part the marigold marker swipes across once the line is written. */
export interface TrailerLine { kind: 'title' | 'hand' | 'card'; text: string; mark?: string }
export interface Trailer { id: string; lines: TrailerLine[]; go: { href: string; text: string } }

/** The project report's case R (tests/report.test.ts, a box factory) with its sales cut to 70 lakh, so it misses, as
 *  worked by hand in tests/viable.test.ts. */
export const REPORT_CASE: ReportState = {
  ...REPORT_EMPTY, borrower: 'firm',
  cost: { ...REPORT_EMPTY.cost, building: '10 L', machinery: '20 L', furniture: '2 L', preliminary: '1 L' },
  loan: { amount: '25,00,000', ratePct: '10', disbursed: '2026-04', moratoriumMonths: '0', instalments: '60', repayment: 'monthly' },
  salesBy: 'typed', monthsToStart: '0', sales: '70,00,000', salesGrowth: '10', variablePct: '65', fixed: '18 L', fixedGrowth: '5', wcLimit: '5 L', wcRate: '11',
  doc: { name: 'Asha Packaging', activity: 'Manufacture of corrugated boxes', address: 'Plot 4, Example MIDC, Pune', lender: '', preparedBy: '' },
};
/** Make it viable's first change, the borrower's: higher sales, by the engine's step. */
export const REPORT_FIX = (() => {
  const l = viableOf(REPORT_CASE)?.lines.find((x) => x.id === 'sales');
  if (!l?.move || !l.bars) throw new Error('The report case needs no higher sales.');
  return { move: l.move, sales: l.bars.toText.replace(/^Rs\. /, ''), from: l.bars.nowText.replace(/^Rs\. /, '') };
})();
export const REPORT_FIXED: ReportState = { ...REPORT_CASE, sales: REPORT_FIX.sales };
/** The lowest year's sum from the report's DSCR table, cash available over debt service, and its level. */
export function reportSum(s: ReportState) {
  const p = reportPreview(s), t = p.view?.tables.find((x) => x.id === 'dscr'), c = p.checks?.find((x) => x.id === 'dscrLowest');
  const fy = c?.worst.split(' in ')[1], i = fy ? t?.columns.indexOf(fy) ?? -1 : -1, v = (label: string) => t?.rows.find((r) => r.label === label)?.values[i];
  const a = v('Cash available (A)'), b = v('Debt service (B)'), r = v('DSCR (A ÷ B)');
  if (!c || !a || !b || !r || !c.worst.startsWith(`${r} `)) throw new Error('The report case gives no lowest year.');
  return { text: `${a} ÷ ${b} = ${r}`, dscr: r, level: c.level.split(' ')[0], meets: c.verdict === 'meets' };
}
/** The project report as a trailer (AG3b, D-UX-78): the question; the loan and the first year's sales; the lowest year
 *  short of the lender's level; Make it viable's higher sales; the same sum meeting it, marked. */
export const REPORT_TRAILER: Trailer = (() => {
  const l = REPORT_CASE.loan, weak = reportSum(REPORT_CASE), fixed = reportSum(REPORT_FIXED);
  return {
    id: 'report',
    lines: [
      { kind: 'title', text: 'Will the bank fund the factory?' },
      { kind: 'hand', text: `Loan ${l.amount} · ${l.ratePct}% · ${years(l.instalments)}` },
      { kind: 'hand', text: `Sales ${REPORT_FIX.from} in year one` },
      { kind: 'card', text: `Lowest year · level ${weak.level}` },
      { kind: 'hand', text: weak.text },
      { kind: 'card', text: `Sales up ${REPORT_FIX.move.replace('+', '')}, to ${REPORT_FIX.sales}` },
      { kind: 'hand', text: `${fixed.text} ✓`, mark: fixed.dscr },
    ],
    go: { href: '/project-report/', text: 'Try it with your project' },
  };
})();

/** The planning estimate's flat (tests/plan-page.test.ts): a 2BHK of 1,000 sq ft in Pune, done up at Standard; then
 *  its two bedrooms at Basic. The 12 lakh is the story's own budget, not a figure worked out. */
export const ESTIMATE_CASE: PlanState = { ...EMPTY_PLAN, kind: 'renovate', home: 'flat', city: 'pune', area: '1,000', bhk: '2', level: 2 };
export const ESTIMATE_FIXED: PlanState = { ...ESTIMATE_CASE, roomLevels: { 'bedroom-1': 1, 'bedroom-2': 1 } };
export const ESTIMATE_BUDGET = { n: 12_00_000, text: '12 lakh' };
export function estimateTotal(s: PlanState) {
  const v = planPreview(s).view;
  if (!v) throw new Error('The estimate case gives no total.');
  return { text: v.total, level: v.level };
}
/** The estimate as a trailer (AG3b, D-UX-78): the question with its budget; the flat; Standard in every room, over it;
 *  Basic in the bedrooms; the total within it, marked. */
export const ESTIMATE_TRAILER: Trailer = (() => {
  const s = ESTIMATE_CASE, at = estimateTotal(s), fixed = estimateTotal(ESTIMATE_FIXED);
  return {
    id: 'estimate',
    lines: [
      { kind: 'title', text: `Can we redo the flat in ${ESTIMATE_BUDGET.text}?` },
      { kind: 'hand', text: `${s.bhk}BHK flat · ${s.area} sq ft` },
      { kind: 'hand', text: 'Renovate it in Pune' },
      { kind: 'card', text: `${at.level} in every room` },
      { kind: 'hand', text: `Total ${at.text}` },
      { kind: 'card', text: 'Basic in the two bedrooms' },
      { kind: 'hand', text: `Total ${fixed.text} ✓`, mark: fixed.text },
    ],
    go: { href: '/estimate/', text: 'Try it with your home' },
  };
})();

/** The DSCR story as a trailer (AG3, D-UX-77): the question; who asks for what; the lowest year as typed, cash over
 *  the EMIs, short of the target; the lender's change; the same sum passing, marked. Every figure the engine's. */
export const DSCR_TRAILER: Trailer = (() => {
  const sum = (s: State, f: StoryFrame) => {
    const st = preview(s).statement, i = st?.years.indexOf(f.lowestYear) ?? -1, v = (id: string) => st?.lines.find((l) => l.id === id)?.values[i];
    const a = v('available'), b = v('service'), r = v('dscr');
    if (!a || !b || r !== f.lowest) throw new Error('The story case gives no lowest year.');
    return `${a} ÷ ${b} = ${r}`;
  };
  const l = STORY_CASE.loan;
  return {
    id: 'dscr',
    lines: [
      { kind: 'title', text: 'Will the loan pass?' },
      { kind: 'hand', text: `Profit ${STORY_CASE.cells.pbdit?.[0]} a year` },
      { kind: 'hand', text: `Loan ${l.amount} · ${l.ratePct}% · ${years(l.instalments)}` },
      { kind: 'card', text: `Lowest year · target ${STORY_TARGET.minimum}` },
      { kind: 'hand', text: sum(STORY_CASE, STORY_TYPED) },
      { kind: 'card', text: `Stretch it to ${STORY_FIXED.loan.instalments} instalments` },
      { kind: 'hand', text: `${sum(STORY_FIXED, STORY_LONGER)} ✓`, mark: STORY_LONGER.lowest },
    ],
    go: { href: '/dscr/', text: 'Try it with your figures' },
  };
})();

/** Home's trailers in the order they play down the page (D-UX-78), under each tool's name; all but the first are fetched. */
export const TRAILERS = [DSCR_TRAILER, REPORT_TRAILER, ESTIMATE_TRAILER];
export const LAZY_TRAILERS = TRAILERS.slice(1);
