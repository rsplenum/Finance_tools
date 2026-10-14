/**
 * The home page's DSCR story (AG1, D-UX-66): fictional case S of tests/dscr-plan.test.ts (a firm; Rs. 4,50,000 this year,
 * no growth; Rs. 12,00,000 at 12% for 5 years, drawn in October 2026) typed into the front door. Every figure is the
 * engine's, worked out when the page is built; tests/home-story.test.ts holds them to the figures worked by hand there.
 */
import { frontDoor, preview, withBorrower, type State } from '../dscr/model';
import { dscrViableOf } from '../dscr/levers';
import { workedYear, type Paper } from './paper';

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

const verdictHead = (f: StoryFrame) => `${f.verdict.split(':')[0]}.`;
const nbYear = (t: string) => t.replace(/(\d{4})-(\d{2})/g, '$1‑$2');
/** The DSCR story as one scratch paper (AG3, D-UX-74): the seven answers; each year as typed and its verdict; the
 *  lender's change; each year with it; the lowest year worked out in the statement's own lines, its DSCR counted from the
 *  lowest as typed and ticked. */
export const DSCR_PAPER: Paper = (() => {
  const st = preview(STORY_FIXED).statement, i = st?.years.indexOf(STORY_LONGER.lowestYear) ?? -1;
  if (!st || i < 0) throw new Error('The story case gives no statement.');
  const worked = workedYear(st.lines, i, ['pbt', 'Profit after tax', 'available', 'service'], 'dscr');
  const dscr = worked[worked.length - 1];
  Object.assign(dscr, { label: `${dscr.label}, against ${STORY_TARGET.minimum}`, from: STORY_TYPED.lowest, tick: true });
  const each = (f: StoryFrame) => [
    { kind: 'years' as const, years: f.years.map((y) => ({ fy: nbYear(y.fy), value: y.dscr })) },
    { label: `Lowest year, ${nbYear(f.lowestYear)}, against ${STORY_TARGET.minimum}`, value: f.lowest },
    { label: `Average, against ${STORY_TARGET.average}`, value: f.average },
    { kind: 'text' as const, label: verdictHead(f) },
  ];
  return {
    id: 'dscr', tab: 'DSCR', kicker: 'Case S',
    title: `A firm asks for Rs. ${STORY_CASE.loan.amount} over ${years(STORY_CASE.loan.instalments)}`,
    steps: [
      { head: 'What the firm typed', lines: STORY_INPUTS.map((x) => ({ label: x.label, value: x.value })) },
      { head: `Each year's DSCR, as typed`, lines: each(STORY_TYPED) },
      { head: STORY_FIX.head, lines: [{ kind: 'text', label: STORY_FIX.text }] },
      { head: `Each year's DSCR, with ${STORY_FIXED.loan.instalments} instalments`, lines: each(STORY_LONGER) },
      { head: `The lowest year worked out, ${nbYear(STORY_LONGER.lowestYear)}`, lines: worked },
    ],
    go: { href: '/dscr/', text: 'Try it with your figures' },
  };
})();
