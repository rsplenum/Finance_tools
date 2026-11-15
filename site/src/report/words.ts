/**
 * The report's words (REP2, D-AI-01, D-AI-02), apart from the page: the user's own inputs as words for the AI (never a
 * figure of the project), its answer checked (engine/narrative.ts), what the document still needs, and the words as
 * sections of the document once the borrower ticks them as true. Pure, no DOM.
 */
import { NOTES, SECTIONS, blanksOf, checkDraft, type NarrativeInput, type NoteId } from '../../../engine/narrative';
import { BORROWERS } from '../../../engine/tax';
import { PMEGP } from '../../../engine/report';
import { printable } from '../doc/face';
import { AREA_CHOICES, CATEGORY_CHOICES, HEADS, guaranteeOf, type ReportState, type ReportWords } from './model';

export const NO_NOTES = Object.fromEntries(NOTES.map((n) => [n.id, ''])) as Record<NoteId, string>;
export const wordsOf = (s: ReportState): ReportWords => s.words ?? { notes: NO_NOTES };

/** What the AI is given: the business as the user typed it, and the report's choices in words. */
export function narrativeOf(s: ReportState): NarrativeInput {
  const label = <T,>(c: { value: T; label: string }[], v?: T) => c.find((o) => o.value === v)?.label ?? '';
  const scheme = s.scheme === 'pmegp'
    ? [PMEGP.label, s.category && `${label(CATEGORY_CHOICES, s.category).split(':')[0].toLowerCase()} category`, s.area && `in ${label(AREA_CHOICES, s.area).toLowerCase()}`].filter(Boolean).join(', ')
    : s.scheme === 'mudra' ? 'Mudra, the Pradhan Mantri Mudra Yojana' : '';
  const g = guaranteeOf(s);
  const finance = [
    'The promoters’ own money',
    ...(s.scheme === 'pmegp' ? ['PMEGP’s margin money, a subsidy held against the loan'] : s.subsidy.trim() ? ['A capital subsidy'] : []),
    ...(s.unsecured.trim() ? ['Unsecured loans'] : []),
    `A term loan from a bank${g ? `, guaranteed under ${g.toUpperCase()}` : ''}`,
  ];
  return {
    name: s.doc.name.trim(), activity: s.doc.activity.trim(), address: s.doc.address.trim(),
    constitution: BORROWERS.find((b) => b.id === s.borrower)?.label ?? '', scheme,
    stage: s.salesBy === 'expansion' ? 'expansion' : 'new',
    products: s.salesBy !== 'typed' ? s.products.map((p) => p.name.trim()).filter(Boolean) : [],
    covers: HEADS.filter((h) => s.cost[h.id].trim() && !/^[0.,\s]*$/.test(s.cost[h.id])).map((h) => h.label),
    finance,
    notes: wordsOf(s).notes,
  };
}

/** The AI's answer, checked against what was sent: the new words, not yet ticked. */
export function drafted(w: ReportWords, answer: unknown, sent: NarrativeInput): ReportWords {
  const { draft, dropped, fromAnswers } = checkDraft(answer, sent);
  return { notes: w.notes, draft, ai: true, dropped, fromAnswers, confirmed: false };
}

const written = (w?: ReportWords) => SECTIONS.some((x) => w?.draft?.[x.id].trim());
/** The blanks still open in the words, all sections together (WORDS1): the tick waits until there are none. */
export const openBlanks = (w?: ReportWords): number => SECTIONS.reduce((n, x) => n + blanksOf(w?.draft?.[x.id] ?? '').length, 0);
/** Ticked, and no blank left open since: only then do the words count. */
export const wordsTrue = (w?: ReportWords): boolean => !!w?.confirmed && openBlanks(w) === 0;

/** What the document still needs from the words: its blanks filled, the tick, then English letters. None without words. */
export function wordsNeeds(w?: ReportWords): string[] {
  if (!written(w)) return [];
  const open = openBlanks(w);
  if (open) return [`The report’s words: fill in ${open === 1 ? 'the blank' : `the ${open} blanks`} in [brackets], then tick that they are true`];
  if (!w?.confirmed) return ['The report’s words: read them, then tick that they are true'];
  return SECTIONS.every((x) => printable(w.draft?.[x.id] ?? '')) ? [] : ['The report’s words, in English letters'];
}

/** The words as sections of the document, each with its heading; only once ticked with no blank open, a section left empty left out. */
export function wordsSections(w?: ReportWords): [string, string][] {
  if (!w || !wordsTrue(w) || !written(w)) return [];
  return SECTIONS.flatMap((x): [string, string][] => {
    const t = w.draft?.[x.id].trim();
    return t ? [[x.label, t]] : [];
  });
}

// The page's own words, in one place, ready for a second language (WORDS1, D-UX-344). Sentences built around a figure
// stay with the model that builds them.
export const W = {
  kind: 'A report for a new term loan',
  title: 'Project report',
  lead: 'The report a lender asks for with a new term loan. Keep your costs and expected sales at hand.',
  cost: 'Leave a head empty if there is none. The working-capital margin is added for you.',
  promoters: 'The promoters bring in the rest.',
  holiday: 'The holiday runs until then, unless you type another.',
  heads: 'A side with heads typed is added up from them.',
  pending: 'Answer this to finish the report.',
  // The Check step (CHECK1): one flow, each thing said once. The answer, why, the ways that make it work in one list
  // under one button's words, then the fine-tuning.
  toWork: 'See the ways to make it work',
  work: 'Make it work',
  workLead: 'Each way below meets every benchmark on its own. Pick one: it changes your answers, and you can undo it.',
  workLeadCash: 'Each way below keeps the cash from running out. Pick one: it changes your answers, and you can undo it.',
  workLeadBoth: 'Each way below meets every benchmark and keeps the cash from running out, on its own. Pick one: it changes your answers, and you can undo it.',
  workWait: 'Working out the ways…',
  workNone: 'No way can be worked out for these figures.',
  keep: 'Keep the loan you asked for',
  less: 'Or change the loan', lessOnly: 'Change the loan',
  repay: 'Repay another way',
  use: 'Use this',
  mix: 'A mix of smaller changes',
  mixAsk: 'Show mixes of smaller changes',
  mixLead: 'Several small changes together, where one large change is too much.',
  mixOnly: 'No single change makes it work. These mixes do: each passes every check.',
  fixWait: 'Working it out…',
  fixNone: 'No plan can be worked out for these figures.',
  fixNearest: 'The nearest',
  fixNearestLead: 'No plan within the limits passes every check. The nearest still leaves these short; each button goes to the figure to change.',
  met: 'What it meets',
  cash: 'Not enough cash in hand',
  years: 'Year by year, against',
  tune: 'Fine-tune it yourself',
  ways: 'Ways to repay',
  room: 'How far can sales fall, costs rise or the rate climb?',
  // The download when a benchmark misses or cash runs out: said plainly, the way to mend it first (D-DOC-03: not blocked).
  docMiss: 'A lender reads the same on its pages.',
  docAs: 'Or download it as it stands',
  adjust: 'Try your own changes',
  bars: 'Each ratio in its worst year. The line is the level lenders commonly look for.',
  sliders: 'Each slider moves one figure, from your figures as they stand. The score stays in view as you move them; nothing changes until you use it.',
  most: 'Without it, the sliders take no limit.',
};

/** The benchmarks in plain words (docs/UX-OVERHAUL.md §4.1): said first, the banker's name after. */
export const PLAIN: Record<string, string> = {
  dscrAverage: 'Earns enough to repay, on average', dscrLowest: 'Earns enough to repay, every year', interestCover: 'Profit covers the interest',
  tolTnw: 'All debts against your own money', debtEquity: 'Long-term loans against your own money', facr: 'Machines and building against the loan left',
  currentRatio: 'Stock and dues against bills to pay', securityCover: 'Security against the loans',
};
/** The same in two or three words, for the score that stays in view under the sliders. */
export const SHORT: Record<string, string> = {
  dscrAverage: 'Repays, on average', dscrLowest: 'Repays, every year', interestCover: 'Interest cover', tolTnw: 'All debts',
  debtEquity: 'Long-term loans', facr: 'Assets to loan', currentRatio: 'Short-term cushion', securityCover: 'Security',
};
