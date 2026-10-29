/**
 * The report's words (REP2, D-AI-01, D-AI-02), apart from the page: the user's own inputs as words for the AI (never a
 * figure of the project), its answer checked (engine/narrative.ts), what the document still needs, and the words as a
 * part of the document once the borrower ticks them as true. Pure, no DOM.
 */
import { NOTES, SECTIONS, checkDraft, type NarrativeInput, type NoteId } from '../../../engine/narrative';
import { BORROWERS } from '../../../engine/tax';
import { PMEGP } from '../../../engine/report';
import type { Block, Part } from '../doc/doc';
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

/** The words as a part of the document, each section with its heading; only once ticked, and a section left empty is left out. */
export function wordsPart(w?: ReportWords): Part | undefined {
  if (!w?.confirmed || !written(w)) return undefined;
  const blocks: Block[] = [{ kind: 'title', text: 'About the project', small: true }];
  for (const x of SECTIONS) {
    const t = w.draft?.[x.id].trim();
    if (t) blocks.push({ kind: 'heading', text: x.label }, { kind: 'text', text: t });
  }
  return { name: 'About the project', blocks };
}
