/**
 * A trailer's lines as the pen's pictures (AG3, D-UX-77; AG3b, D-UX-78): one SVG a written line, its strokes in writing
 * order and the marigold marker under the part it swipes. Trailer.astro puts the DSCR one in the page; the others are
 * sent as `/trailers/<id>.json` (pages/trailers/[id].json.ts) and put in as the reader nears them, so home's first load
 * stays within F15.
 */
import { write, PEN } from './pen';
import type { Trailer, TrailerLine } from './story';

// The pen's size, in ems of the page's type to the pen's em, and its line in the pen's units (PEN.EM to the em).
const SIZE = { title: 2, hand: 1.4 }, STROKE = { title: 5.6, hand: 6.4 }, PAD = 6;

/** A written line's width at its own size, in ems; a card has none. */
const widthOf = (l: TrailerLine) => (l.kind === 'card' ? 0 : (write(l.text).w + 2 * PAD) / PEN.EM * SIZE[l.kind]);

/** A written line as an SVG; a card is set in type, so it has none. */
export function lineSvg(l: TrailerLine): string | null {
  if (l.kind === 'card') return null;
  const pen = write(l.text), from = l.mark ? l.text.lastIndexOf(l.mark) : -1;
  if (l.mark && from < 0) throw new Error(`The mark "${l.mark}" is not in "${l.text}".`);
  const box = { x: -PAD, y: pen.top - PAD, w: pen.w + 2 * PAD, h: pen.bottom - pen.top + 2 * PAD };
  const mark = from < 0 ? '' : `<rect data-mark x="${pen.x[from] - 3}" y="${PEN.BASE - PEN.CAP - 8}" width="${pen.x[from + l.mark!.length] - pen.x[from] + 2}" height="${PEN.CAP + 14}" rx="4" fill="var(--marigold)" stroke="none"/>`;
  return `<svg aria-hidden="true" viewBox="${box.x} ${box.y} ${box.w} ${box.h}" style="width:${widthOf(l).toFixed(2)}em" class="block h-auto max-w-full" fill="none" stroke="currentColor" stroke-width="${STROKE[l.kind]}" stroke-linecap="round" stroke-linejoin="round">${mark}${pen.strokes.map((s) => `<path d="${s.d}"/>`).join('')}</svg>`;
}

/** A trailer's lines as SVGs, in its order, and what `/trailers/<id>.json` sends. */
export const svgsOf = (t: Trailer) => t.lines.map(lineSvg);
/** Each pen line's width and shape, for a trailer whose strokes come later, so the sheet keeps its size when they do. */
export const holdsOf = (t: Trailer) => t.lines.map((l) => {
  if (l.kind === 'card') return undefined;
  const pen = write(l.text);
  return `--w:${widthOf(l).toFixed(2)}em;--r:${((pen.w + 2 * PAD) / (pen.bottom - pen.top + 2 * PAD)).toFixed(2)}`;
});
export const strokesOf = (t: Trailer) => ({ id: t.id, lines: svgsOf(t) });
