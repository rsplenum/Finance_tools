/**
 * The report's words (REP2, D-AI-01, D-AI-02), apart from the page: the user's own inputs as words for the AI (never a
 * figure of the project), its answer checked (engine/narrative.ts), what the document still needs, and the words as
 * sections of the document once the borrower ticks them as true. Pure, no DOM.
 */
import { NOTES, SECTIONS, checkDraft, type NarrativeInput, type NoteId } from '../../../engine/narrative';
import { BORROWERS } from '../../../engine/tax';
import { PMEGP } from '../../../engine/report';
import { printable } from '../doc/pdf';
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
    products: s.salesBy !== 'typed' ? s.products.map((p) => p.name.trim()).filter(Boolean) : [],
    covers: HEADS.filter((h) => s.cost[h.id].trim() && !/^[0.,\s]*$/.test(s.cost[h.id])).map((h) => h.label),
    finance,
    notes: wordsOf(s).notes,
  };
}

/** The AI's answer, checked against what was sent: the new words, not yet ticked. */
export function drafted(w: ReportWords, answer: unknown, sent: NarrativeInput): ReportWords {
  const { draft, dropped } = checkDraft(answer, sent);
  return { notes: w.notes, draft, ai: true, dropped, confirmed: false };
}

const written = (w?: ReportWords) => SECTIONS.some((x) => w?.draft?.[x.id].trim());
/** What the document still needs from the words: the tick once there are any, then English letters. None without words. */
export function wordsNeeds(w?: ReportWords): string[] {
  if (!written(w)) return [];
  if (!w?.confirmed) return ['The report’s words: read them, then tick that they are true'];
  return SECTIONS.every((x) => printable(w.draft?.[x.id] ?? '')) ? [] : ['The report’s words, in English letters'];
}

/** The words as sections of the document, each with its heading; only once ticked, and a section left empty is left out. */
export function wordsSections(w?: ReportWords): [string, string][] {
  if (!w?.confirmed || !written(w)) return [];
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
  viable: 'Whole plans that pass every check, or one change at a time. Each changes your answers; you can undo it.',
  fix: 'Fix it for me',
  fixWait: 'Working it out…',
  fixLead: 'Up to three whole plans, each passing every check.',
  fixOne: 'One plan passes every check.',
  fixMany: 'These plans pass every check. Pick one.',
  fixUse: 'Use this plan',
  fixNone: 'No plan can be worked out for these figures.',
  fixNearest: 'The nearest',
  fixNearestLead: 'No plan within the limits passes every check. The nearest still leaves these short; each button goes to the figure to change.',
  one: 'Or change one thing',
  oneNone: 'No single change makes it work.',
  adjust: 'Adjust it yourself',
  bars: 'Each ratio in its worst year. The line is the level lenders commonly look for.',
  sliders: 'Each slider moves one figure, from your figures as they stand. Nothing above changes until you use it.',
  most: 'Without it, the sliders take no limit.',
};
