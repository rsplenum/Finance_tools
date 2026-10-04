/**
 * A PDF writer for documents made in the browser (doc.ts): A4 pages, text in the standard Helvetica fonts (every PDF
 * reader has them, so no font file is embedded), rules, shaded boxes and strips, facts two to a line, and tables whose
 * rows continue on the next page with their header, and whose columns split into further tables when there are too many
 * for the width. Pure: bytes in memory, no DOM. Text is WinAnsi (Latin letters); `printable` says whether a user's text
 * prints as typed.
 */
import type { Block, Doc, Row, Table } from './doc';

// ---- Letters: WinAnsi codes, and Helvetica widths in thousandths of the size (Adobe's AFM files) ----

/** WinAnsi codes 128-159; 32-126 and 160-255 are the character's own code. */
const WIN: Record<string, number> = {
  '€': 128, '‚': 130, 'ƒ': 131, '„': 132, '…': 133, '†': 134, '‡': 135, 'ˆ': 136, '‰': 137, 'Š': 138, '‹': 139, 'Œ': 140, 'Ž': 142,
  '‘': 145, '’': 146, '“': 147, '”': 148, '•': 149, '–': 150, '—': 151, '˜': 152, '™': 153, 'š': 154, '›': 155, 'œ': 156, 'ž': 158, 'Ÿ': 159,
};
/** Characters with no WinAnsi code, and what prints in their place. */
const INSTEAD: Record<string, string> = {
  '−': '-', '‑': '-', '′': "'", '″': '"', '₹': 'Rs.', ' ': ' ', ' ': ' ', ' ': ' ',
  '≤': '<=', '≥': '>=', '→': '->', '\t': ' ',
};

const codeOf = (ch: string): number | undefined => {
  const c = ch.codePointAt(0) ?? 0;
  return (c >= 32 && c <= 126) || (c >= 160 && c <= 255) ? c : WIN[ch];
};

/** Whether text prints as typed: Latin letters, digits and the usual signs. */
export const printable = (t: string) => [...t].every((ch) => codeOf(ch) !== undefined || ch in INSTEAD);

/** WinAnsi codes for text; a character with none prints as '?' (the page asks for printable text first). */
function encode(t: string): number[] {
  const out: number[] = [];
  for (const ch of t) {
    const c = codeOf(ch);
    if (c !== undefined) out.push(c);
    else for (const x of INSTEAD[ch] ?? '?') out.push(x.charCodeAt(0));
  }
  return out;
}

/** Widths from 32 upwards; "556*10" is ten of 556, and 0 marks a code with no character. */
const widths = (spec: string) => {
  const w = Array<number>(256).fill(0);
  let c = 32;
  for (const part of spec.trim().split(/\s+/)) {
    const [v, n = '1'] = part.split('*');
    for (let k = 0; k < Number(n); k++) w[c++] = Number(v);
  }
  if (c !== 256) throw new Error(`font widths: ${c - 32} of 224`);
  return w;
};
const HELVETICA = widths(`278 278 355 556 556 889 667 191 333 333 389 584 278 333 278 278 556*10 278 278 584 584 584 556 1015
  667 667 722 722 667 611 778 722 278 500 667 556 833 722 778 667 778 722 667 611 722 667 944 667 667 611 278 278 278 469 556 333
  556 556 500 556 556 278 556 556 222 222 500 222 833 556 556 556 556 333 500 278 556 500 722 500 500 500 334 260 334 584 0
  556 0 222 556 333 1000 556 556 333 1000 667 333 1000 0 611 0 0 222 222 333 333 350 556 1000 333 1000 500 333 944 0 500 667
  278 333 556 556 556 556 260 556 333 737 370 556 584 333 737 333 400 584 333 333 333 556 537 278 333 333 365 556 834 834 834 611
  667*6 1000 722 667*4 278*4 722 722 778*5 584 778 722*4 667 667 611 556*6 889 500 556*4 278*4 556 556 556*5 584 611 556*4 500 556 500`);
const HELVETICA_BOLD = widths(`278 333 474 556 556 889 722 238 333 333 389 584 278 333 278 278 556*10 333 333 584 584 584 611 975
  722 722 722 722 667 611 778 722 278 556 722 611 833 722 778 667 778 722 667 611 722 667 944 667 667 611 333 278 333 584 556 333
  556 611 556 611 556 333 611 611 278 278 556 278 889 611 611 611 611 389 556 333 611 556 778 556 556 500 389 280 389 584 0
  556 0 278 556 500 1000 556 556 333 1000 667 333 1000 0 611 0 0 278 278 500 500 350 556 1000 333 1000 556 333 944 0 500 667
  278 333 556 556 556 556 280 556 333 737 370 556 584 333 737 333 400 584 333 333 333 611 556 278 333 333 365 556 834 834 834 611
  722*6 1000 722 667*4 278*4 722 722 778*5 584 778 722*4 667 667 611 556*6 889 556 556*4 278*4 611 611 611*5 584 611 611*4 556 611 556`);

export type Font = 'R' | 'B';
const FONTS: Record<Font, number[]> = { R: HELVETICA, B: HELVETICA_BOLD };

/** The width of text in points (also how the Word copy sizes its columns). */
export function textWidth(t: string, font: Font, size: number): number {
  let w = 0;
  for (const c of encode(t)) w += FONTS[font][c] || 556;
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

// ---- Pages ----

export const PAGE_W = 595.28, PAGE_H = 841.89, LEFT = 42, WIDTH = PAGE_W - 2 * LEFT, TOP = PAGE_H - 60, BOTTOM = 60;
const INK = '0.1 g', MUTED = '0.33 g', SHADE = '0.925 g';
const num = (x: number) => String(Math.round(x * 100) / 100);
const esc = (codes: number[]) => codes.map((c) =>
  c === 40 || c === 41 || c === 92 ? `\\${String.fromCharCode(c)}` : c < 32 || c > 126 ? `\\${c.toString(8).padStart(3, '0')}` : String.fromCharCode(c)).join('');

class Layout {
  pages: string[][] = [];
  y = TOP;
  /** A new layout, or one that draws on pages already laid out. */
  constructor(pages?: string[][]) { if (pages) this.pages = pages; else this.newPage(); }
  newPage() { this.pages.push([]); this.y = TOP; }
  get ops() { return this.pages[this.pages.length - 1]; }
  /** A new page unless `h` more points fit on this one. */
  room(h: number) { if (this.y - h < BOTTOM && this.y < TOP) this.newPage(); }
  text(x: number, baseline: number, t: string, font: Font, size: number, color = INK) {
    this.ops.push(`BT ${color} /F${font === 'B' ? 2 : 1} ${num(size)} Tf ${num(x)} ${num(baseline)} Td (${esc(encode(t))}) Tj ET`);
  }
  right(x: number, baseline: number, t: string, font: Font, size: number, color = INK) {
    this.text(x - textWidth(t, font, size), baseline, t, font, size, color);
  }
  rule(x1: number, x2: number, y: number, width = 0.5, gray = 0.6) {
    this.ops.push(`${gray} G ${width} w ${num(x1)} ${num(y)} m ${num(x2)} ${num(y)} l S`);
  }
  /** A filled band from the top `y` down `h` points. */
  shade(x: number, y: number, w: number, h: number, fill = SHADE) {
    this.ops.push(`${fill} ${num(x)} ${num(y - h)} ${num(w)} ${num(h)} re f`);
  }
  /** Lines of text from the cursor down, each on the page it fits. */
  lines(lines: string[], x: number, size: number, font: Font = 'R', color = INK) {
    const lh = size * 1.38;
    for (const line of lines) {
      this.room(lh);
      this.text(x, this.y - size, line, font, size, color);
      this.y -= lh;
    }
  }
}

const SIZE = 9.5, LH = SIZE * 1.38;
/** A table this short (its header and rows) is kept on one page, with its heading; a longer one runs on. */
const KEEP = (TOP - BOTTOM) * 0.6;

/** One block from the cursor down; `next` lets a heading stay with the table after it. */
function block(L: Layout, b: Block, next?: Block) {
  switch (b.kind) {
    case 'title': {
      const size = b.small ? 14 : 17;
      for (const line of wrap(b.text, 'B', size, WIDTH)) { L.text(LEFT, L.y - size, line, 'B', size); L.y -= size * 1.3; }
      L.y -= 3;
      if (b.sub) L.lines(wrap(b.sub, 'R', 10.5, WIDTH), LEFT, 10.5, 'R', MUTED);
      L.y -= 8;
      return;
    }
    case 'heading': {
      L.y -= 9;
      // Never the last line of a page, and on the same page as a short table after it.
      const table = next?.kind === 'table' ? groupHeight(next.table) : 0;
      L.room(18 + (table && table < KEEP ? table : 3 * LH));
      L.text(LEFT, L.y - 12, b.text, 'B', 12);
      L.y -= 19;
      return;
    }
    case 'text': {
      const size = b.small ? 8 : SIZE;
      L.lines(wrap(b.text, 'R', size, WIDTH), LEFT, size, 'R', b.small ? MUTED : INK);
      L.y -= 3;
      return;
    }
    case 'list': {
      const size = b.small ? 8 : SIZE, lh = size * 1.38;
      for (const item of b.items) {
        const lines = wrap(item, 'R', size, WIDTH - 11);
        lines.forEach((line, i) => {
          L.room(lh);
          if (!i) L.text(LEFT + 1, L.y - size, '•', 'R', size, b.small ? MUTED : INK);
          L.text(LEFT + 11, L.y - size, line, 'R', size, b.small ? MUTED : INK);
          L.y -= lh;
        });
        L.y -= 1.5;
      }
      L.y -= 3;
      return;
    }
    case 'pairs': {
      const key = 132;
      for (const [k, v] of b.pairs) {
        const kl = wrap(k, 'R', SIZE, key - 10), vl = wrap(v, 'R', SIZE, WIDTH - key), n = Math.max(kl.length, vl.length);
        L.room(Math.min(n, 3) * LH);
        for (let i = 0; i < n; i++) {
          L.room(LH);
          if (kl[i]) L.text(LEFT, L.y - SIZE, kl[i], 'R', SIZE, MUTED);
          if (vl[i]) L.text(LEFT + key, L.y - SIZE, vl[i], 'R', SIZE);
          L.y -= LH;
        }
        L.y -= 2;
      }
      L.y -= 3;
      return;
    }
    case 'facts': {
      // Two to a line: each fact's name in a column of its own, its value beside it; one fact alone runs across.
      const key = 78, half = WIDTH / 2;
      for (const line of b.lines) {
        const cols = line.map(([k, v], i) => {
          const x = LEFT + i * half, w = line.length > 1 ? half - key - 8 : WIDTH - key;
          return { x, k: wrap(k, 'R', SIZE, key - 6), v: wrap(v, 'R', SIZE, w) };
        });
        const n = Math.max(...cols.map((c) => Math.max(c.k.length, c.v.length)));
        L.room(n * LH);
        for (const c of cols) {
          c.k.forEach((t, i) => L.text(c.x, L.y - SIZE - i * LH, t, 'R', SIZE, MUTED));
          c.v.forEach((t, i) => L.text(c.x + key, L.y - SIZE - i * LH, t, 'R', SIZE));
        }
        L.y -= n * LH + 1.5;
      }
      L.y -= 4;
      return;
    }
    case 'figures': {
      // A shaded strip: each figure's name, the figure in large bold, and its note.
      const pad = 8, w = WIDTH / Math.max(1, b.items.length), notes = b.items.map((f) => (f.note ? wrap(f.note, 'R', 8, w - 2 * pad) : []));
      const h = 2 * pad + 11 + 17 + 10.5 * Math.max(0, ...notes.map((n) => n.length));
      L.y -= 6;
      L.room(h + 6);
      L.shade(LEFT, L.y, WIDTH, h);
      b.items.forEach((f, i) => {
        const x = LEFT + i * w + pad;
        L.text(x, L.y - pad - 8, f.label, 'R', 8, MUTED);
        L.text(x, L.y - pad - 11 - 13, f.value, 'B', 14);
        notes[i].forEach((t, k) => L.text(x, L.y - pad - 28 - 8 - k * 10.5, t, 'R', 8, MUTED));
      });
      L.y -= h + 8;
      return;
    }
    case 'box': {
      const pad = 8, items = b.items.map((i) => wrap(i, 'R', SIZE, WIDTH - 2 * pad - 11));
      const h = 2 * pad + LH * (1 + items.reduce((a, l) => a + l.length, 0));
      L.room(h + 6);
      L.ops.push(`1 0.96 0.86 rg 0.85 0.62 0.2 RG 0.8 w ${num(LEFT)} ${num(L.y - h)} ${num(WIDTH)} ${num(h)} re B`);
      let y = L.y - pad;
      L.text(LEFT + pad, y - SIZE, b.title, 'B', SIZE);
      y -= LH;
      for (const lines of items) lines.forEach((line, i) => {
        if (!i) L.text(LEFT + pad + 1, y - SIZE, '•', 'R', SIZE);
        L.text(LEFT + pad + 11, y - SIZE, line, 'R', SIZE);
        y -= LH;
      });
      L.y -= h + 8;
      return;
    }
    case 'table':
      L.y -= 4;
      table(L, b.table);
      return;
    case 'signature':
      L.y -= 18;
      L.room(b.lines.length * 1.6 * LH);
      for (const line of b.lines) {
        if (line) L.text(LEFT, L.y - SIZE, line, 'R', SIZE);
        L.y -= 1.6 * LH;
      }
  }
}

const bold = (r: Row): Font => (r.kind ? 'B' : 'R');

/** A table's measures: the first column's width, the others', and the groups of columns that fit the width (the Word copy splits the same way). */
export function measure(t: Table) {
  const size = t.size === 'small' ? 7.8 : 8.5, lh = size * 1.42, pad = 5;
  const body = t.rows.filter((r) => r.kind !== 'head');
  // The first column as wide as its longest name, within limits (a longer one wraps); a head row runs across the table.
  const keyW = Math.min(190, Math.max(52, textWidth(t.columns[0].label, 'B', size), ...body.map((r) => textWidth(r.cells[0]?.text ?? '', bold(r), size)))) + pad;
  const colW = t.columns.slice(1).map((c, j) => (c.wrap ? 0 : Math.max(40, textWidth(c.label, 'B', size), c.sub ? textWidth(c.sub, 'R', size - 1) : 0,
    ...body.map((r) => textWidth(r.cells[j + 1]?.text ?? '', bold(r), size))) + 2 * pad));
  // Columns of words share what the others leave, so the table fits the width.
  const shares = t.columns.slice(1).reduce((a, c) => a + (c.wrap ?? 0), 0);
  if (shares) {
    const left = WIDTH - keyW - colW.reduce((a, w) => a + w, 0);
    t.columns.slice(1).forEach((c, j) => { if (c.wrap) colW[j] = Math.max(40, Math.floor((left * c.wrap) / shares)); });
  }
  // Columns in groups that fit the width, each group a table of its own with the first column repeated.
  const groups: number[][] = [];
  let used = WIDTH;
  colW.forEach((w, j) => {
    if (used + w > WIDTH) { groups.push([]); used = keyW; }
    groups[groups.length - 1].push(j);
    used += w;
  });
  const hasSub = t.columns.some((c) => c.sub), headerH = lh * (hasSub ? 2 : 1) + 4;
  return { size, lh, pad, keyW, colW, groups, hasSub, headerH };
}

/** A row's lines: its first cell's, and each column of words'. */
const rowLines = (t: Table, r: Row, m: ReturnType<typeof measure>) => Math.max(wrap(r.cells[0]?.text ?? '', bold(r), m.size, m.keyW - m.pad).length,
  ...t.columns.slice(1).map((c, j) => (c.wrap ? wrap(r.cells[j + 1]?.text ?? '', bold(r), m.size, m.colW[j] - 2 * m.pad).length : 1)));
/** Rows as tall as their lines; a head row a line more. */
const rowHeight = (t: Table, r: Row, m: ReturnType<typeof measure>, width: number) => r.kind === 'head'
  ? wrap(r.cells[0]?.text ?? '', 'B', m.size, width - 6).length * m.lh + 6
  : rowLines(t, r, m) * m.lh + (r.kind === 'ratio' ? 6 : r.kind ? 2 : 0);

/** The height of one group of columns: the header and every row. */
function groupHeight(t: Table): number {
  const m = measure(t);
  return m.headerH + 8 + t.rows.reduce((a, r) => a + rowHeight(t, r, m, WIDTH), 0);
}

function table(L: Layout, t: Table) {
  const m = measure(t), { size, lh, pad, keyW, colW, groups, hasSub } = m, whole = groupHeight(t);
  groups.forEach((g, gi) => {
    if (gi) L.y -= 12;
    if (whole < KEEP) L.room(whole);
    const spare = WIDTH - keyW - g.reduce((a, j) => a + colW[j], 0), extra = Math.max(0, Math.min(22, spare / g.length));
    const rights: number[] = [];
    g.reduce((x, j) => { rights.push(x + colW[j] + extra); return x + colW[j] + extra; }, LEFT + keyW);
    const end = rights[rights.length - 1];
    const header = () => {
      const h = m.headerH - 2;
      L.room(h + 2 * lh);
      L.text(LEFT, L.y - size, t.columns[0].label, 'B', size);
      g.forEach((j, k) => {
        const c = t.columns[j + 1];
        if (c.wrap) L.text(rights[k] - colW[j] - extra + pad, L.y - size, c.label, 'B', size);
        else L.right(rights[k] - pad, L.y - size, c.label, 'B', size);
        if (c.sub) L.right(rights[k] - pad, L.y - size - lh, c.sub, 'R', size - 1, MUTED);
      });
      L.y -= h;
      L.rule(LEFT, end, L.y, 0.7, 0.35);
      L.y -= 2;
    };
    header();
    for (const r of t.rows) {
      if (r.kind === 'head') {
        // A group's name on a shaded band across the table.
        const lines = wrap(r.cells[0]?.text ?? '', 'B', size, end - LEFT - 6), h = rowHeight(t, r, m, end - LEFT);
        if (L.y - h - lh < BOTTOM) { L.newPage(); header(); }
        L.y -= 2;
        L.shade(LEFT, L.y, end - LEFT, h - 2);
        L.y -= 2;
        lines.forEach((line) => { L.text(LEFT + 3, L.y - size, line, 'B', size); L.y -= lh; });
        L.y -= 2;
        continue;
      }
      const f = bold(r), lines = wrap(r.cells[0]?.text ?? '', f, size, keyW - pad);
      if (L.y - rowHeight(t, r, m, end - LEFT) < BOTTOM) { L.newPage(); header(); }
      if (r.kind === 'ratio') { L.rule(LEFT, end, L.y, 0.8, 0.3); L.y -= 3; }
      else if (r.kind) { L.rule(LEFT + keyW, end, L.y, 0.5, 0.55); L.y -= 2; }
      lines.forEach((line, i) => L.text(LEFT, L.y - size - i * lh, line, f, size));
      g.forEach((j, k) => {
        const text = r.cells[j + 1]?.text ?? '';
        if (!t.columns[j + 1].wrap) return L.right(rights[k] - pad, L.y - size, text, f, size);
        wrap(text, f, size, colW[j] - 2 * pad).forEach((line, i) => L.text(rights[k] - colW[j] - extra + pad, L.y - size - i * lh, line, f, size));
      });
      L.y -= rowLines(t, r, m) * lh;
      if (r.kind === 'ratio') { L.y -= 1; L.rule(LEFT, end, L.y, 0.8, 0.3); L.y -= 2; }
    }
    L.y -= 8;
  });
}

// ---- The file ----

/** UTF-16 text for the document's properties (any letters). */
const utf16 = (t: string) => `<FEFF${[...t].map((ch) => {
  const c = ch.codePointAt(0) ?? 63;
  if (c < 0x10000) return c.toString(16).padStart(4, '0');
  const v = c - 0x10000;
  return (0xd800 + (v >> 10)).toString(16) + (0xdc00 + (v & 0x3ff)).toString(16);
}).join('').toUpperCase()}>`;
const pdfDate = (d: Date) => `D:${d.toISOString().replace(/[-:T]/g, '').slice(0, 14)}Z`;

/** The document as a PDF file. */
export function pdfOf(doc: Doc, made: Date): Uint8Array<ArrayBuffer> {
  const L = new Layout();
  doc.parts.forEach((part, i) => {
    if (i && L.y < TOP) L.newPage();
    part.blocks.forEach((b, k) => block(L, b, part.blocks[k + 1]));
  });
  // What every page carries: the header (cut to one line before its mark), the footer and the page number.
  const n = L.pages.length, foot = wrap(doc.footer, 'R', 7.5, WIDTH - 70).slice(0, 2);
  const head = wrap(doc.header, 'R', 8, WIDTH - (doc.mark ? textWidth(doc.mark, 'B', 8) + 20 : 0))[0];
  L.pages.forEach((ops, i) => {
    const at = new Layout([ops]);
    at.text(LEFT, PAGE_H - 36, head, 'R', 8, MUTED);
    if (doc.mark) at.right(LEFT + WIDTH, PAGE_H - 36, doc.mark, 'B', 8);
    at.rule(LEFT, LEFT + WIDTH, PAGE_H - 42, 0.5, 0.7);
    at.rule(LEFT, LEFT + WIDTH, 44, 0.5, 0.7);
    foot.forEach((line, k) => at.text(LEFT, 34 - k * 9.5, line, 'R', 7.5, MUTED));
    at.right(LEFT + WIDTH, 34, `Page ${i + 1} of ${n}`, 'R', 7.5, MUTED);
  });

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${L.pages.map((_, i) => `${6 + 2 * i} 0 R`).join(' ')}] /Count ${n} >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    `<< /Title ${utf16(doc.title)}${doc.author ? ` /Author ${utf16(doc.author)}` : ''} /Creator ${utf16(doc.creator)} /Producer ${utf16(doc.creator)} /CreationDate (${pdfDate(made)}) >>`,
  ];
  for (const [i, ops] of L.pages.entries()) {
    const content = ops.join('\n');
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${7 + 2 * i} 0 R >>`,
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    );
  }
  // Every character above is below 256, so a character is a byte and the offsets count characters.
  let out = '%PDF-1.4\n%âãÏÓ\n';
  const offsets = objects.map((o, i) => {
    const at = out.length;
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
    return at;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Uint8Array.from(out, (c) => c.charCodeAt(0));
}
