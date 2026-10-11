/**
 * Reading an audited statement into the CMA heads (U1, D-UX-44, D-UX-48). The statement's text lines, numbered by page
 * and line, go to an AI that only points: for each head and each year column, the line or lines and which number on the
 * line. This file does the rest, so no figure is ever an AI's: it copies the digits from the line pointed to, adds a head
 * printed on several lines, applies the units the statement states, maps the year ends to the page's audited years, and
 * checks the sums against the totals the statement itself prints. A pointer that does not land on a number is dropped
 * and said. Nothing here counts on the page until the borrower ticks it (site/src/cma/Read.tsx). Pure, no DOM.
 */
import DATA from './data/read.json';
import { HEADS, YEARS, fyLabels, type HeadId, type YearId } from './cma';

export const READ = DATA;
export type Column = 'current' | 'previous';
export type TotalId = keyof typeof DATA.totals;
export interface Line { page: number; line: number; text: string }
/** A number as printed: its digits without commas, how many after the point, and whether it is in brackets or signed. */
export interface Num { raw: string; digits: string; frac: number; negative: boolean }
export interface At { page: number; line: number }
/** Where a figure is printed: the line, and the n-th number on it (from 1). */
export interface Pointer extends At { n: number }
/** The AI's whole answer: pointers only, never an amount. A page of 0 means not found. */
export interface Answer {
  yearsAt: At; unitsAt: At;
  placements: { head: string; column: Column; at: Pointer[] }[];
  totals: { total: string; column: Column; at: Pointer }[];
}

const NUM = /\(?-?\d[\d,]*(?:\.\d+)?\)?/g;
export function numbersOf(text: string): Num[] {
  return [...text.matchAll(NUM)].map(([m]) => {
    const raw = m.replace(/,+$/, '');
    const body = raw.replace(/[(),-]/g, ''), [whole, part = ''] = body.split('.');
    return { raw, digits: whole + part, frac: part.length, negative: (raw.startsWith('(') && raw.endsWith(')')) || raw.startsWith('-') };
  });
}
const roundPaise = (x: number) => Math.round(x * 100) / 100;
/** Rupees from a printed number and the statement's units (1 for rupees, 100000 for lakh), in whole-number steps. */
export const valueOf = (n: Num, mult: number) => (n.negative ? -1 : 1) * roundPaise((Number(n.digits) * mult) / 10 ** n.frac);

/** The lines as the AI is shown them: each number on a line numbered, so a pointer names it without copying it. */
export const promptLines = (lines: Line[]) =>
  lines.map((l) => { const ns = numbersOf(l.text); return `p${l.page} l${l.line}: ${l.text}${ns.length ? ' | ' + ns.map((x, i) => `[${i + 1}] ${x.raw}`).join(' ') : ''}`; }).join('\n');

/** The units the statement states, from the words on the line pointed to; undefined when none is named. */
export function unitOf(text: string) {
  return DATA.units.find((u) => new RegExp(`(^|[^a-z])(${u.match})`, 'i').test(text));
}
/** The year ends a header line names, the statement's own year first: "31 March 2026 … 2025" or "2025-26 … 2024-25". */
export function yearEndsOf(text: string): number[] {
  const spans = [...text.matchAll(/\b(20\d\d)\s*[-–]\s*(\d\d)\b/g)].map((m) => Number(m[1]) + 1);
  const ends = spans.length ? spans : [...text.matchAll(/\b(20\d\d)\b/g)].map((m) => Number(m[1]));
  return ends.filter((y, i) => ends.indexOf(y) === i);
}

export interface ReadRef extends Pointer { raw: string; text: string }
export interface ReadFigure { year: YearId; head: HeadId; value: number; at: ReadRef[] }
export interface CheckResult {
  id: string; what: string; state: 'ties' | 'differs' | 'missing';
  sum?: number; printed?: number; diff?: number; missing: string[]; heads: HeadId[];
}
export interface ReadYear { year: YearId; fy: string; column: Column; checks: CheckResult[]; ties: boolean }
export interface Read {
  years: ReadYear[]; figures: ReadFigure[];
  /** The units used: from the statement's words, or the borrower's choice; undefined until one of them gives it. */
  unit?: { mult: number; word: string; from: 'statement' | 'chosen' };
  /** What could not be used, in words: a pointer off the page, a year not among the page's, a head given twice. */
  notes: string[];
}

const LABEL = Object.fromEntries(HEADS.map((h) => [h.id, h.label])) as Record<HeadId, string>;
const isHead = (h: string): h is HeadId => h in LABEL;

/**
 * The figures the answer points to, for the page's audited years from `startYear` (the year now running). `chosen` is
 * the units the borrower picked, which wins over the statement's words.
 */
export function place(lines: Line[], answer: Answer, startYear: number, chosen?: number): Read {
  const notes: string[] = [];
  const byAt = new Map(lines.map((l) => [`${l.page}:${l.line}`, l]));
  const lineAt = (a: At) => (a.page > 0 ? byAt.get(`${a.page}:${a.line}`) : undefined);
  const where = (a: At) => `page ${a.page}, line ${a.line}`;

  // The years: the header line's year ends, mapped to the audited years a1 (oldest) to a3 (the one before this year).
  const fy = fyLabels(startYear), audited = YEARS.filter((y) => y.kind === 'audited').map((y) => y.id as YearId);
  const head = lineAt(answer.yearsAt), ends = head ? yearEndsOf(head.text) : [];
  const yearOf: Partial<Record<Column, YearId>> = {};
  if (!ends.length) notes.push('The years the statement is for were not found: type the figures, or try the statement again.');
  (['current', 'previous'] as Column[]).forEach((c, k) => {
    const end = ends[k];
    if (end === undefined) return;
    if (k === 1 && end !== ends[0] - 1) { notes.push(`The second column is for the year ended March ${end}, not the year before; it is left out.`); return; }
    const id = audited[end - (startYear - audited.length + 1)];
    if (id) yearOf[c] = id;
    else notes.push(`The ${c === 'current' ? "statement's year" : 'year before'}, ended March ${end}, is not one of the audited years here (${audited.map((a) => fy[a]).join(', ')}).`);
  });

  // The units: the borrower's choice, else the words on the line pointed to.
  const said = lineAt(answer.unitsAt), fromWords = said ? unitOf(said.text) : undefined;
  const choice = chosen !== undefined ? DATA.unitChoices.find((u) => u.mult === chosen) : undefined;
  const unit = choice ? { ...choice, from: 'chosen' as const } : fromWords ? { mult: fromWords.mult, word: fromWords.word, from: 'statement' as const } : undefined;
  if (!unit) notes.push('The units were not found: say whether the figures are in rupees, thousand, lakh or crore.');

  // A pointer counts only when it lands on a number; its digits are copied from the line, never taken from the AI.
  const refOf = (p: Pointer, what: string): ReadRef | undefined => {
    const l = lineAt(p), n = l ? numbersOf(l.text)[p.n - 1] : undefined;
    if (!l || !n) { notes.push(`${what}: ${where(p)}${l ? `, number ${p.n},` : ''} holds no such figure, so it is left out.`); return undefined; }
    return { ...p, raw: n.raw, text: l.text };
  };
  const num = (r: ReadRef) => numbersOf(r.text)[r.n - 1];

  const figures: ReadFigure[] = [], seen = new Set<string>();
  for (const pl of answer.placements) {
    const year = yearOf[pl.column];
    if (!isHead(pl.head) || !year || !unit) { if (!isHead(pl.head)) notes.push(`"${pl.head}" is not a head here; left out.`); continue; }
    const key = `${year}:${pl.head}`;
    if (seen.has(key)) { notes.push(`${LABEL[pl.head]}, ${fy[year]}: pointed to twice; the first kept.`); continue; }
    const at = pl.at.filter((p, i) => pl.at.findIndex((q) => q.page === p.page && q.line === p.line && q.n === p.n) === i)
      .map((p) => refOf(p, `${LABEL[pl.head]}, ${fy[year]}`));
    if (!at.length || at.some((r) => !r)) continue; // a head with any line off its number is not read at all
    seen.add(key);
    const refs = at as ReadRef[];
    figures.push({ year, head: pl.head, value: roundPaise(refs.reduce((s, r) => s + valueOf(num(r), unit.mult), 0)), at: refs });
  }

  // The checks, year by year, against the totals the statement prints.
  const years: ReadYear[] = [];
  for (const column of ['current', 'previous'] as Column[]) {
    const year = yearOf[column];
    if (!year || !unit) continue;
    const got = new Map(figures.filter((f) => f.year === year).map((f) => [f.head, f]));
    const printed = new Map<string, ReadRef>();
    for (const t of answer.totals) if (t.column === column && t.total in DATA.totals && !printed.has(t.total)) {
      const r = refOf(t.at, `${DATA.totals[t.total as TotalId]}, ${fy[year]}`);
      if (r) printed.set(t.total, r);
    }
    const checks: CheckResult[] = DATA.checks.map((c) => {
      const plus = c.plus as HeadId[], minus = ('minus' in c ? c.minus : []) as HeadId[], heads = [...plus, ...minus];
      const total = printed.get(c.total);
      const missing = [...heads.filter((h) => !got.has(h)).map((h) => LABEL[h]), ...(total ? [] : [`the printed ${DATA.totals[c.total as TotalId].toLowerCase()}`])];
      if (missing.length || !total) return { id: c.id, what: c.what, state: 'missing', missing, heads };
      const sum = roundPaise(plus.reduce((s, h) => s + got.get(h)!.value, 0) - minus.reduce((s, h) => s + got.get(h)!.value, 0));
      const value = valueOf(num(total), unit.mult), diff = roundPaise(sum - value);
      const parts = heads.flatMap((h) => got.get(h)!.at).concat(total);
      return { id: c.id, what: c.what, state: Math.abs(diff) <= tolerance(parts, num, unit.mult) ? 'ties' : 'differs', sum, printed: value, diff, missing: [], heads };
    });
    const l = printed.get('liabilities'), a = printed.get('assets');
    checks.push(l && a
      ? (() => { const lv = valueOf(num(l), unit.mult), av = valueOf(num(a), unit.mult), diff = roundPaise(lv - av);
        return { id: 'balance', what: 'The balance sheet’s two printed totals are equal', state: Math.abs(diff) <= tolerance([l, a], num, unit.mult) / 2 ? 'ties' : 'differs', sum: lv, printed: av, diff, missing: [], heads: [] } as CheckResult; })()
      : { id: 'balance', what: 'The balance sheet’s two printed totals are equal', state: 'missing', missing: ['the printed totals'], heads: [] });
    years.push({ year, fy: fy[year], column, checks, ties: checks.every((c) => c.state === 'ties') });
  }
  return { years, figures, unit, notes };
}

/** Half a printed unit for each figure in a sum: what rounding each to the units printed can leave. */
function tolerance(refs: ReadRef[], num: (r: ReadRef) => Num, mult: number) {
  return refs.reduce((s, r) => s + (0.5 * mult) / 10 ** num(r).frac, 0);
}

/** A PDF page's text pieces (pdf.js: the string, where it starts, its width) into lines, top to bottom, numbered from 1. */
export function linesOfPage(page: number, items: { str: string; x: number; y: number; w: number }[]): Line[] {
  const rows: (typeof items)[] = [];
  for (const it of [...items].filter((i) => i.str.trim()).sort((a, b) => b.y - a.y || a.x - b.x)) {
    const row = rows.at(-1);
    if (row && Math.abs(row[0].y - it.y) <= 2) row.push(it); else rows.push([it]);
  }
  return rows.map((r, k) => {
    const text = r.sort((a, b) => a.x - b.x).reduce((t, it, i) => t + (i && it.x - (r[i - 1].x + r[i - 1].w) > 1 ? ' ' : '') + it.str, '');
    return { page, line: k + 1, text: text.replace(/\s+/g, ' ').trim() };
  });
}

/** Has the statement any text to read? A scanned PDF has (almost) none: it is asked to be typed instead. */
export const looksScanned = (lines: Line[]) => lines.reduce((s, l) => s + l.text.replace(/\s/g, '').length, 0) < DATA.scannedBelow;
