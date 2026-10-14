/// <reference types="vite/client" />
/**
 * The pen that writes home's trailers (AG3, D-UX-77): EMS Nixish, a single-stroke font (each letter a pen's path, not an
 * outline; OFL, `pen/OFL.txt`), laid out when the page is built. A line of text becomes one row of strokes, each stroke
 * one pen-down, in the order a hand writes them; home.ts draws them one after another. The words stay in the page as
 * text for screen readers and search; the strokes are a picture of them.
 */
import FONT from './pen/EMSNixish.svg?raw';

/** The font's units: 1000 to the em; the baseline 800 below the top; capitals 500 high. Letters stand a little closer
 *  than the font sets them (TRACK), as a quick hand writes. */
const EM = 1000, BASE = 800, CAP = 500, TRACK = 50;
/** The page gets the strokes at a tenth of the font's units (a hundred to the em): finer than a screen shows, and lighter. */
const OUT = 10;
const unescape = (s: string) => s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&quot;/g, '"')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&apos;/g, "'");
const GLYPHS = (() => {
  const g = new Map<string, { w: number; d: string }>(), dflt = Number(FONT.match(/<font[^>]*horiz-adv-x="([\d.]+)"/)?.[1] ?? 378);
  for (const m of FONT.matchAll(/<glyph\b([^>]*)\/?>/g)) {
    const u = m[1].match(/unicode="([^"]*)"/)?.[1];
    if (u !== undefined) g.set(unescape(u), { w: Number(m[1].match(/horiz-adv-x="([\d.]+)"/)?.[1] ?? dflt), d: m[1].match(/\bd="([^"]*)"/)?.[1] ?? '' });
  }
  return g;
})();
/** A tick, which the font lacks: one stroke, in the font's units. */
const TICK = { w: 620, d: 'M 60 330 L 230 120 L 560 640' };

export interface PenLine {
  /** The line's width in the page's units, PEN.EM to the em (as are all the others). */
  w: number;
  /** One entry a pen-down, in writing order: the path, and the index of the character it belongs to. */
  strokes: { d: string; at: number }[];
  /** Where each character starts and ends along the line, for a mark across some of them. */
  x: number[];
  /** The strokes' top and bottom. */
  top: number; bottom: number;
}

/** A rounded path rewritten in moves from the point before: the same points in fewer digits, since home sends every
 *  stroke in its HTML. A line that goes nowhere is dropped, unless it is the stroke's only one. */
function rel(d: string): string {
  let cx = 0, cy = 0, out = '', last = '';
  for (const [, c, args] of d.matchAll(/([MLC])([^MLC]*)/g)) {
    const v = (args.match(/-?\d+/g) ?? []).map(Number), n = c === 'C' ? 6 : 2, cmd = c === 'C' ? 'c' : 'l';
    let i = 0;
    if (c === 'M') { [cx, cy] = v; out += `M${cx} ${cy}`; last = 'M'; i = 2; }
    for (; i < v.length; i += n) {
      const seg = v.slice(i, i + n).map((p, j) => p - (j % 2 ? cy : cx));
      if (cmd === 'l' && !seg[0] && !seg[1] && (i + n < v.length || last !== 'M')) continue;
      out += (last === cmd ? (seg[0] < 0 ? '' : ' ') : cmd) + seg.map((p, j) => (j && p >= 0 ? ' ' : '') + p).join('');
      last = cmd; cx = v[i + n - 2]; cy = v[i + n - 1];
    }
  }
  return out;
}

/** Lays a line out in the pen's strokes; `✓` is drawn as a tick. A character the font lacks is a mistake, not a gap. */
export function write(text: string): PenLine {
  const strokes: PenLine['strokes'] = [], x: number[] = [];
  let ox = 0, top = BASE - CAP, bottom = BASE;
  [...text].forEach((ch, at) => {
    const g = ch === '✓' ? TICK : GLYPHS.get(ch);
    if (!g) throw new Error(`The pen has no "${ch}" for "${text}".`);
    x.push(ox);
    for (const part of g.d.split(/(?=M)/).map((s) => s.trim()).filter(Boolean)) {
      let n = 0;
      const d = part.replace(/-?[\d.]+/g, (v) => {
        if (n++ % 2 === 0) return String(Math.round((Number(v) + ox) / OUT));
        const y = BASE - Number(v); top = Math.min(top, y); bottom = Math.max(bottom, y); return String(Math.round(y / OUT));
      });
      strokes.push({ d: rel(d), at });
    }
    ox += g.w - TRACK;
  });
  x.push(ox);
  const o = (v: number) => Math.round(v / OUT);
  return { w: o(ox), strokes, x: x.map(o), top: o(top), bottom: o(bottom) };
}
/** The page's units, a tenth of the font's. */
export const PEN = { EM: EM / OUT, BASE: BASE / OUT, CAP: CAP / OUT };
