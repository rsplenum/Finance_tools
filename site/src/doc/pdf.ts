/**
 * The PDF file of a document laid out in layout.ts: A4 pages in IBM Plex Sans, embedded (cut to the letters a document
 * prints, so "₹" prints as itself in every reader), with bookmarks for its parts, links from the contents to them, and
 * its title shown in the reader's title bar. Pure: bytes in memory, no DOM. Loaded only at the download (download.ts).
 */
import type { Doc } from './doc';
import { CHARS, GLYPHS, METRICS, ADVANCES, type Font } from './face-metrics';
import { FACE_FILES } from './face-bytes';
import { textWidth, wrap } from './face';
import { Layout, lay, LEFT, MUTED, PAGE_H, PAGE_W, TOP, WIDTH, num } from './layout';

const utf16 = (t: string) => `<FEFF${[...t].map((ch) => {
  const c = ch.codePointAt(0) ?? 63;
  if (c < 0x10000) return c.toString(16).padStart(4, '0');
  const v = c - 0x10000;
  return (0xd800 + (v >> 10)).toString(16) + (0xdc00 + (v & 0x3ff)).toString(16);
}).join('').toUpperCase()}>`;
const pdfDate = (d: Date) => `D:${d.toISOString().replace(/[-:T]/g, '').slice(0, 14)}Z`;
const hex4 = (n: number) => n.toString(16).padStart(4, '0').toUpperCase();

/** What each glyph reads as when text is copied or searched: its first character (a CMap, a hundred lines a block). */
function toUnicode(): string {
  const seen = new Map<number, string>();
  [...CHARS].forEach((ch, i) => { if (!seen.has(GLYPHS[i])) seen.set(GLYPHS[i], ch); });
  const pairs = [...seen].sort((a, b) => a[0] - b[0]).map(([g, ch]) => `<${hex4(g)}> <${hex4(ch.charCodeAt(0))}>`);
  const blocks: string[] = [];
  for (let i = 0; i < pairs.length; i += 100) blocks.push(`${Math.min(100, pairs.length - i)} beginbfchar\n${pairs.slice(i, i + 100).join('\n')}\nendbfchar`);
  return ['/CIDInit /ProcSet findresource begin', '12 dict begin', 'begincmap',
    '/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def', '/CMapName /Adobe-Identity-UCS def', '/CMapType 2 def',
    '1 begincodespacerange', '<0000> <FFFF>', 'endcodespacerange', ...blocks, 'endcmap', 'CMapName currentdict /CMap defineresource pop', 'end', 'end'].join('\n');
}

/** The document as a PDF file. */
export function pdfOf(doc: Doc, made: Date): Uint8Array<ArrayBuffer> {
  const { L, sections, starts } = lay(doc);
  // The contents' lines: each section, a leader of dots, and the page it starts on; each line a link to its part.
  const links = new Map<number, { rect: number[]; page: number; y: number }[]>();
  if (L.contents) {
    const on = L.contents.page, at = new Layout([L.pages[on]]), { ys, size } = L.contents;
    sections.forEach((x, i) => {
      const page = String((starts.get(x) ?? 0) + 1), t = x.section as string, top = /^\d/.test(t);
      at.text(LEFT, ys[i], t, top ? 'B' : 'R', size);
      const from = LEFT + textWidth(t, top ? 'B' : 'R', size) + 8, to = LEFT + WIDTH - textWidth(page, 'R', size) - 8, dot = textWidth('.', 'R', size) + 2.2;
      if (to > from) at.text(from, ys[i], '.'.repeat(Math.floor((to - from) / dot)), 'R', size, MUTED, 2.2);
      at.right(LEFT + WIDTH, ys[i], page, 'R', size);
      const target = L.tops.get(x);
      if (target) links.set(on, [...(links.get(on) ?? []), { rect: [LEFT, ys[i] - size * 0.35, LEFT + WIDTH, ys[i] + size * 0.95], ...target }]);
    });
  }
  // What every page carries but a cover: the header (cut to one line before its mark), the footer and the page number.
  const n = L.pages.length, foot = wrap(doc.footer, 'R', 7.5, WIDTH - 70).slice(0, 2);
  const head = wrap(doc.header, 'R', 8, WIDTH - (doc.mark ? textWidth(doc.mark, 'B', 8) + 20 : 0))[0];
  L.pages.forEach((ops, i) => {
    if (L.bare.has(i)) return;
    const at = new Layout([ops]);
    at.text(LEFT, PAGE_H - 36, head, 'R', 8, MUTED);
    if (doc.mark) at.right(LEFT + WIDTH, PAGE_H - 36, doc.mark, 'B', 8);
    at.rule(LEFT, LEFT + WIDTH, PAGE_H - 42, 0.5, 0.7);
    at.rule(LEFT, LEFT + WIDTH, 44, 0.5, 0.7);
    foot.forEach((line, k) => at.text(LEFT, 34 - k * 9.5, line, 'R', 7.5, MUTED));
    at.right(LEFT + WIDTH, 34, `Page ${i + 1} of ${n}`, 'R', 7.5, MUTED);
  });

  // Objects by number; a number is taken before its object is written, so objects can point at each other.
  const objects: string[] = [];
  const take = () => objects.push('');
  const put = (k: number, body: string) => { objects[k - 1] = body; return k; };
  const catalog = take(), pages = take(), info = take(), outlines = take();
  const fonts = (['R', 'B'] as Font[]).map((f) => {
    const m = METRICS[f], name = `/${f === 'R' ? 'PLXSNR' : 'PLXSNB'}+${m.name}`, bytes = atob(FACE_FILES[f]);
    const file = put(take(), `<< /Length ${bytes.length} /Length1 ${bytes.length} >>\nstream\n${bytes}\nendstream`);
    const descriptor = put(take(), `<< /Type /FontDescriptor /FontName ${name} /Flags 32 /FontBBox [${m.bbox.join(' ')}] /ItalicAngle 0 /Ascent ${m.ascent} /Descent ${m.descent} /CapHeight ${m.capHeight} /StemV ${m.stemV} /FontFile2 ${file} 0 R >>`);
    const cid = put(take(), `<< /Type /Font /Subtype /CIDFontType2 /BaseFont ${name} /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${descriptor} 0 R /DW 1000 /W [0 [${ADVANCES[f].join(' ')}]] /CIDToGIDMap /Identity >>`);
    const cmap = toUnicode(), unicode = put(take(), `<< /Length ${cmap.length} >>\nstream\n${cmap}\nendstream`);
    return put(take(), `<< /Type /Font /Subtype /Type0 /BaseFont ${name} /Encoding /Identity-H /DescendantFonts [${cid} 0 R] /ToUnicode ${unicode} 0 R >>`);
  });
  const pageNos = L.pages.map(() => take());
  // A link's or a bookmark's target: the part's page, scrolled to a little above its first line.
  const dest = (t: { page: number; y: number }) => `[${pageNos[t.page]} 0 R /XYZ 0 ${num(Math.min(PAGE_H, t.y + (t.y >= TOP ? 36 : 14)))} null]`;
  L.pages.forEach((ops, i) => {
    const content = ops.join('\n'), stream = put(take(), `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    const annots = (links.get(i) ?? []).map((l) => put(take(), `<< /Type /Annot /Subtype /Link /Rect [${l.rect.map(num).join(' ')}] /Border [0 0 0] /Dest ${dest(l)} >>`));
    put(pageNos[i], `<< /Type /Page /Parent ${pages} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 ${fonts[0]} 0 R /F2 ${fonts[1]} 0 R >> >> /Contents ${stream} 0 R${annots.length ? ` /Annots [${annots.map((a) => `${a} 0 R`).join(' ')}]` : ''} >>`);
  });
  // Bookmarks: the first page's part (unless it is a section itself), then each section, in order.
  const marks: { title: string; page: number; y: number }[] = [];
  const first = doc.parts[0], firstTop = first && L.tops.get(first);
  if (first && firstTop && !first.section && sections.length) marks.push({ title: first.name, ...firstTop });
  for (const x of sections) { const t = L.tops.get(x); if (t) marks.push({ title: x.section as string, ...t }); }
  const items = marks.map(() => take());
  marks.forEach((m, i) => put(items[i], `<< /Title ${utf16(m.title)} /Parent ${outlines} 0 R${i ? ` /Prev ${items[i - 1]} 0 R` : ''}${i < items.length - 1 ? ` /Next ${items[i + 1]} 0 R` : ''} /Dest ${dest(m)} >>`));
  put(outlines, items.length ? `<< /Type /Outlines /First ${items[0]} 0 R /Last ${items[items.length - 1]} 0 R /Count ${items.length} >>` : '<< /Type /Outlines /Count 0 >>');
  put(catalog, `<< /Type /Catalog /Pages ${pages} 0 R /Outlines ${outlines} 0 R${items.length ? ' /PageMode /UseOutlines' : ''} /ViewerPreferences << /DisplayDocTitle true >> /Lang (en-IN) >>`);
  put(pages, `<< /Type /Pages /Kids [${pageNos.map((k) => `${k} 0 R`).join(' ')}] /Count ${n} >>`);
  put(info, `<< /Title ${utf16(doc.title)}${doc.author ? ` /Author ${utf16(doc.author)}` : ''} /Creator ${utf16(doc.creator)} /Producer ${utf16(doc.creator)} /CreationDate (${pdfDate(made)}) >>`);

  // Every character above is below 256 (the font files are bytes as characters), so a character is a byte and the
  // offsets count characters.
  let out = '%PDF-1.7\n%âãÏÓ\n';
  const offsets = objects.map((o, i) => {
    const at = out.length;
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
    return at;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Uint8Array.from(out, (c) => c.charCodeAt(0));
}
