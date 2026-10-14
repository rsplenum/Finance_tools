/**
 * The home page's DSCR story (AG1, D-UX-66): fictional case S of tests/dscr-plan.test.ts (a firm; Rs. 4,50,000 this year,
 * no growth; Rs. 12,00,000 at 12% for 5 years, drawn in October 2026) typed into the front door. Every figure is the
 * engine's, worked out when the page is built; tests/home-story.test.ts holds them to the figures worked by hand there.
 */
import { frontDoor, preview, withBorrower, type State } from '../dscr/model';
import { dscrViableOf } from '../dscr/levers';

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
