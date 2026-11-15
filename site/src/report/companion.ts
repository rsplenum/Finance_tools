/**
 * The companion beside the questions (NEW2, docs/WORKED-PAGE.md §7, docs/REPORT-GRADE.md §6): what the report reads so
 * far, its one picture, its outline with what each section still needs, and whether its pages are open. Nothing is
 * worked out here: the picture's rows are the engine's own DSCR table (model.ts), the reading is the engine's carry line
 * and checks, and the outline only counts the needs the engine and the document already list (rule 12).
 */
import type { BarRow } from '../worked/Bars';
import type { CarryView, ReportPreview, ReportState } from './model';
import { docNeeds, PARTS } from './document';
import { wordsNeeds, wordsTrue } from './words';

/** The steps a report is made in, by id: the outline sends each section to the step that fills it. */
export type StepKey = 'business' | 'cost' | 'loan' | 'sales' | 'words' | 'check';

const inLakh = (n: number) => (n / 1e5).toFixed(2);

/**
 * The picture (one chart, docs/WORKED-PAGE.md §4 part 3): the cash a year has for the loan (A) against what is due on it
 * (B), from the DSCR table the engine fills. Only a year below the usual level for the lowest DSCR (`level`) is marked:
 * a year that meets it is not called the tightest (Rahul's review of NEW2, point 6). A year with nothing due says so.
 */
export function chartRows(p: ReportPreview, level?: number): BarRow[] {
  const t = p.view?.tables.find((x) => x.id === 'dscr');
  if (!t || p.blocked) return [];
  const row = (label: string) => t.rows.find((r) => r.label === label);
  const a = row('Cash available (A)'), b = row('Debt service (B)'), d = row('DSCR (A ÷ B)');
  if (!a?.n || !b?.n || !d?.n) return [];
  const years = t.columns.filter((c) => c !== 'Total');
  return years.flatMap((fy, i) => {
    const cash = a.n![i], due = b.n![i];
    if (cash === undefined || due === undefined) return [];
    const x = d.n![i], tight = level !== undefined && due > 0 && x !== undefined && Number.isFinite(x) && x < level, note = due ? undefined : 'nothing due';
    return [{
      key: fy, label: fy, a: cash, b: due, aText: inLakh(cash), bText: inLakh(due), ...(tight ? { tight } : {}), ...(note ? { note } : {}),
      spoken: `${fy}: cash for the loan ₹${inLakh(cash)} lakh, due ₹${inLakh(due)} lakh${tight ? `, below the usual ${level}` : ''}${note ? `, ${note}` : ''}`,
    }];
  });
}

/** The reading at the side's head: the loan carried, then the lowest and the average DSCR beside the usual level. */
export interface Reading { line?: string; figures: { label: string; value: string; level: string; ok: boolean }[]; wait?: string }
export function readingOf(p: ReportPreview, cv: CarryView | undefined): Reading {
  if (p.blocked) return { figures: [], wait: 'No figures while the two computations disagree.' };
  if (!p.view) {
    const n = p.needs.length;
    return { figures: [], wait: n ? `The figures show once ${n === 1 ? 'one more answer is' : `${n} more answers are`} in.` : 'The figures show as you answer.' };
  }
  const pick = (id: string, label: string) => {
    const c = p.checks?.find((x) => x.id === id);
    return c?.value ? [{ label, value: c.value, level: c.level, ok: c.verdict !== 'misses' }] : [];
  };
  return { line: cv?.bar, figures: [...pick('dscrLowest', 'Lowest DSCR'), ...pick('dscrAverage', 'Average DSCR')] };
}

/** A section of the report as the outline lists it: its name, the step that fills it, and what it still needs. */
export interface OutlineItem { part: string; title: string; step: StepKey; state: 'ready' | 'open' | 'optional'; here: boolean; text: string }
const many = (n: number, one: string, more: string) => (n === 1 ? `1 ${one}` : `${n} ${more}`);

/**
 * The outline (REPORT-GRADE §6): each section of the paper, sent to the step that fills it. `left` is what each step
 * still needs (the page's own count on the progress line); `ok` is the figures checked and confirmed.
 */
export function outlineOf(s: ReportState, p: ReportPreview, left: Record<StepKey, number>, ok: boolean, step: StepKey): OutlineItem[] {
  const figures = !!p.view && !p.blocked, w = s.words, before = left.cost + left.loan + left.sales;
  const own = docNeeds(s.doc, w).length - wordsNeeds(w).length;
  const figured = (n: number) => (p.blocked ? 'Waits on the figures to agree' : !figures ? `Waits on ${many(n || 1, 'answer', 'answers')}` : ok ? 'Ready' : 'Check the figures');
  const items: Omit<OutlineItem, 'state' | 'here'>[] = [
    { part: PARTS.cover, title: 'Cover', step: 'business', text: own ? many(own, 'fact to add', 'facts to add') : 'Ready' },
    { part: PARTS.glance, title: 'At a glance', step: 'check', text: figured(before) },
    { part: PARTS.business, title: 'The business', step: 'words', text: wordsNeeds(w).length ? 'Words to finish' : wordsTrue(w) ? 'Ready' : 'Words to write, if you like' },
    { part: PARTS.cost, title: 'Cost and finance', step: 'cost', text: left.cost + left.loan ? many(left.cost + left.loan, 'answer to give', 'answers to give') : 'Ready' },
    { part: PARTS.basis, title: 'Basis of the figures', step: 'sales', text: left.sales ? many(left.sales, 'answer to give', 'answers to give') : 'Ready' },
    { part: PARTS.statements, title: 'Statements', step: 'check', text: figured(before) },
    { part: PARTS.ratios, title: 'DSCR and ratios', step: 'check', text: figured(before) },
    { part: PARTS.repayment, title: 'Repayment', step: 'loan', text: figured(before) },
  ];
  // "You are here" once: at the first section the step in hand fills.
  const at = items.findIndex((x) => x.step === step);
  return items.map((x, i) => ({ ...x, here: i === at, state: x.text === 'Ready' ? 'ready' : x.text.endsWith('if you like') ? 'optional' : 'open' }));
}
