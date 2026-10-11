/**
 * U1 (D-UX-48): reading the fictional statement K (tests/fixtures/statement-k.ts, worked by hand there) with pdf.js, a
 * reader written by others, then pointing as an AI would and letting engine/read.ts copy, add and check. Reading it gives
 * back case K's 2025-26 and 2024-25 (tests/cma.test.ts), so the CMA from read figures is case K's limit of 104 L.
 */
import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { cma, type CmaInput } from '../engine/cma';
import { looksScanned, numbersOf, place, promptLines, valueOf, yearEndsOf, type Answer, type Column, type Line } from '../engine/read';
import { EXAMPLE } from '../site/src/cma/example';
import { linesOfPdf } from '../site/src/cma/pdf-lines';
import { POINTS_K, TOTALS_K, statementK } from './fixtures/statement-k';

const L = 100000;
const linesOf = async (bytes: Uint8Array) => linesOfPdf(await getDocument({ data: bytes.slice(), verbosity: 0 }).promise);
const pdf = statementK(), lines = await linesOf(pdf);
const find = (label: string) => { const l = lines.find((x) => x.text.startsWith(label)); if (!l) throw new Error(`no line ${label}`); return l; };
/** The pointer an honest reader gives: this year's figure is the second-last number on the line, last year's the last. */
const point = (label: string, c: Column) => { const l = find(label), n = numbersOf(l.text).length; return { page: l.page, line: l.line, n: c === 'current' ? n - 1 : n }; };
const answerK = (): Answer => ({
  yearsAt: { page: find('Particulars').page, line: find('Particulars').line },
  unitsAt: { page: find('All amounts').page, line: find('All amounts').line },
  placements: (['current', 'previous'] as Column[]).flatMap((column) => POINTS_K.map(([head, labels]) => ({ head, column, at: labels.map((l) => point(l, column)) }))),
  totals: (['current', 'previous'] as Column[]).flatMap((column) => TOTALS_K.map(([total, label]) => ({ total, column, at: point(label, column) }))),
});
// The site check uploads the same file and has its pretend Worker answer with the same pointers.
writeFileSync(new URL('./fixtures/statement-k.pdf', import.meta.url), pdf);
writeFileSync(new URL('./fixtures/statement-k.answer.json', import.meta.url), JSON.stringify(answerK()) + '\n');

describe('the printed numbers', () => {
  it('reads brackets as minus and Indian commas, in exact rupees', () => {
    const [a, b] = numbersOf('Changes in inventories (3.00) 12,34,567.50');
    expect(a).toEqual({ raw: '(3.00)', digits: '300', frac: 2, negative: true });
    expect(valueOf(a, L)).toBe(-300000);
    expect(valueOf(b, 1)).toBe(1234567.5);
    expect(valueOf(numbersOf('23.60')[0], L)).toBe(2360000); // 23.6 × 100000 in floating point is 2360000.0000000005
  });
  it('finds the year ends either way a header gives them', () => {
    expect(yearEndsOf('Particulars Note 31 March 2026 31 March 2025')).toEqual([2026, 2025]);
    expect(yearEndsOf('Particulars 2025-26 2024-25')).toEqual([2026, 2025]);
  });
  it('shows the AI each number on a line by its place, so it points and never copies', () => {
    expect(promptLines([find('Share capital')])).toBe('p1 l6: Share capital 1 30.00 30.00 | [1] 1 [2] 30.00 [3] 30.00');
    expect(looksScanned(lines)).toBe(false);
    expect(looksScanned([{ page: 1, line: 1, text: 'Scanned by CamScanner' }])).toBe(true);
  });
});

describe('statement K read into the CMA heads', () => {
  const r = place(lines, answerK(), 2026);
  it('gives back case K for 2025-26 and 2024-25, every head, in lakh', () => {
    expect(r.notes).toEqual([]);
    expect(r.unit).toEqual({ mult: L, word: 'lakh', from: 'statement' });
    expect(r.years.map((y) => [y.year, y.fy, y.column])).toEqual([['a3', '2025-26', 'current'], ['a2', '2024-25', 'previous']]);
    expect(r.figures).toHaveLength(50);
    for (const f of r.figures) expect([f.head, f.year, f.value]).toEqual([f.head, f.year, Math.round(EXAMPLE.rows[f.head][f.year === 'a3' ? 2 : 1] * L)]);
    const materials = r.figures.find((f) => f.head === 'materials' && f.year === 'a3')!;
    expect(materials.at.map((a) => [a.page, a.line, a.raw])).toEqual([[2, 7, '256.00'], [2, 8, '(3.00)']]); // 256 − 3 = 253 L
  });
  it('ties every check to the totals the statement prints', () => {
    for (const y of r.years) {
      expect(y.ties).toBe(true);
      expect(y.checks.map((c) => [c.id, c.state, c.diff])).toEqual([['liabilities', 'ties', 0], ['assets', 'ties', 0], ['profit', 'ties', 0], ['balance', 'ties', 0]]);
    }
    expect(r.years[0].checks[0].printed).toBe(18860000); // 188.60 L
  });
  it('makes case K’s limit once the read years stand beside the rest', () => {
    const figures: CmaInput['figures'] = {};
    ['a1', 'a2', 'a3', 'est', 'proj'].forEach((id, k) => { figures[id as 'a1'] = Object.fromEntries(Object.entries(EXAMPLE.rows).map(([h, v]) => [h, v[k] * L])); });
    for (const f of r.figures) figures[f.year]![f.head] = f.value;
    const c = cma({ startYear: 2026, figures, existingLimit: EXAMPLE.existingLimit });
    expect('limit' in c && c.limit).toBe(10400000);
  });
});

describe('a misread is caught, never placed silently', () => {
  it('a figure pointed to the wrong line fails its check by the difference', () => {
    const a = answerK(), p = a.placements.find((x) => x.head === 'creditors' && x.column === 'current')!;
    p.at = [point('Other current liabilities', 'current')]; // 7.50 for 32.00
    const y = place(lines, a, 2026).years[0];
    expect(y.ties).toBe(false);
    expect(y.checks[0]).toMatchObject({ id: 'liabilities', state: 'differs', diff: -2450000 }); // 7.5 − 32 = −24.5 L
    expect(place(lines, a, 2026).years[1].ties).toBe(true);
  });
  it('a pointer to no number drops the head, says so, and leaves its check waiting', () => {
    const a = answerK(), p = a.placements.find((x) => x.head === 'stock' && x.column === 'previous')!;
    p.at = [{ ...p.at[0], n: 9 }];
    const r = place(lines, a, 2026);
    expect(r.notes).toEqual(['Stock, 2024-25: page 1, line 17, number 9, holds no such figure, so it is left out.']);
    expect(r.figures.some((f) => f.head === 'stock' && f.year === 'a2')).toBe(false);
    expect(r.years[1].checks[1]).toMatchObject({ id: 'assets', state: 'missing', missing: ['Stock'] });
  });
  it('without the units named, nothing is placed until the borrower says them', () => {
    const a = { ...answerK(), unitsAt: { page: 0, line: 0 } };
    const r = place(lines, a, 2026);
    expect(r.unit).toBeUndefined();
    expect(r.figures).toEqual([]);
    expect(r.notes).toEqual(['The units were not found: say whether the figures are in rupees, thousand, lakh or crore.']);
    expect(place(lines, a, 2026, L).figures).toHaveLength(50);
  });
  it('a year outside the page’s audited years is left out, by name', () => {
    const r = place(lines, answerK(), 2028); // audited 2025-26 to 2027-28: 2025-26 is the oldest, 2024-25 is not there
    expect(r.years.map((y) => y.year)).toEqual(['a1']);
    expect(r.notes).toEqual(['The year before, ended March 2025, is not one of the audited years here (2025-26, 2026-27, 2027-28).']);
  });
});
