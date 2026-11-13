/**
 * Letters for the downloaded documents: which characters the face draws (face-metrics.ts, IBM Plex Sans), the glyph
 * that draws each, and the width of text, for the PDF writer and for sizing the Word copy's columns. `printable` says
 * whether a user's own text prints as typed.
 */
import { ADVANCES, CHARS, GLYPHS, type Font } from './face-metrics';

export type { Font };

const GLYPH = new Map<string, number>([...CHARS].map((ch, i) => [ch, GLYPHS[i]]));
/** Characters the face lacks, and what prints in their place: the spaces of other widths print as a space. */
const INSTEAD: Record<string, string> = {
  '\t': ' ', ' ': ' ', ' ': ' ', ' ': ' ', ' ': ' ', ' ': ' ', ' ': ' ', ' ': ' ', ' ': ' ',
  '​': '', '‌': '', '‍': '', '﻿': '',
};
const QUERY = GLYPH.get('?') ?? 0;

/** Whether text prints as typed: Latin letters, digits, the rupee sign and the usual signs. */
export const printable = (t: string) => [...t].every((ch) => GLYPH.has(ch) || ch in INSTEAD);

/** The glyphs that draw text; a character the face lacks prints as '?' (the page asks for printable text first). */
export function glyphs(t: string): number[] {
  const out: number[] = [];
  for (const ch of t) {
    const g = GLYPH.get(ch);
    if (g !== undefined) out.push(g);
    else for (const x of INSTEAD[ch] ?? '?') out.push(GLYPH.get(x) ?? QUERY);
  }
  return out;
}

/** The width of text in points (also how the Word copy sizes its columns). */
export function textWidth(t: string, font: Font, size: number): number {
  let w = 0;
  for (const g of glyphs(t)) w += ADVANCES[font][g];
  return (w * size) / 1000;
}

/** Lines no wider than `max`: words stay whole unless one alone is wider than the line. */
export function wrap(t: string, font: Font, size: number, max: number): string[] {
  const lines: string[] = [];
  for (const para of t.split('\n')) {
    let line = '';
    for (const word of para.split(/ +/)) {
      const next = line ? `${line} ${word}` : word;
      if (textWidth(next, font, size) <= max) { line = next; continue; }
      if (line) lines.push(line);
      line = word;
      while (line.length > 1 && textWidth(line, font, size) > max) {
        let k = line.length - 1;
        while (k > 1 && textWidth(line.slice(0, k), font, size) > max) k--;
        lines.push(line.slice(0, k));
        line = line.slice(k);
      }
    }
    lines.push(line);
  }
  return lines;
}
