/**
 * Pages for the downloaded documents (doc.ts): A4, laid out once for the PDF (pdf.ts), whose page numbers the Word copy's
 * contents also shows. Text in the embedded face (face.ts), rules, shaded boxes and strips, facts two to a line, a chart
 * of bars, and tables whose rows continue on the next page with their header, and whose columns split into further
 * tables when there are too many for the width. Pure: drawing operators in memory, no DOM.
 */
import type { Block, Chart, Cover, Doc, Part, Row, Table } from './doc';
import { glyphs, textWidth, wrap, type Font } from './face';

// ---- Pages ----

export const PAGE_W = 595.28, PAGE_H = 841.89, LEFT = 42, WIDTH = PAGE_W - 2 * LEFT, TOP = PAGE_H - 60, BOTTOM = 60;
export const INK = '0.1 g', MUTED = '0.33 g', SHADE = '0.925 g', NAVY = '0.11 0.2 0.36 rg', NAVY_LINE = '0.11 0.2 0.36 RG';
export const num = (x: number) => String(Math.round(x * 100) / 100);
/** Text as the face's glyph numbers, two bytes each (Identity-H). */
const hex = (t: string) => glyphs(t).map((g) => g.toString(16).padStart(4, '0')).join('');

export class Layout {
  pages: string[][] = [];
  y = TOP;
  /** Pages without the running header and footer (a cover). */
  bare = new Set<number>();
  /** Where the contents' lines go, drawn once every part's page is known, and their size. */
  contents?: { page: number; ys: number[]; size: number };
  /** Each part's top: its page and the height its first line starts at (a bookmark's and a contents link's target). */
  tops = new Map<Part, { page: number; y: number }>();
  /** A document of numbered sections: an annex's (small) title in navy over a rule, kept with what follows. */
  sectioned = false;
  /** A new layout, or one that draws on pages already laid out. */
  constructor(pages?: string[][]) { if (pages) this.pages = pages; else this.newPage(); }
  newPage() { this.pages.push([]); this.y = TOP; }
  get ops() { return this.pages[this.pages.length - 1]; }
  /** A new page unless `h` more points fit on this one. */
  room(h: number) { if (this.y - h < BOTTOM && this.y < TOP) this.newPage(); }
  /** `spacing`: extra points between letters (a cover's kicker). */
  text(x: number, baseline: number, t: string, font: Font, size: number, color = INK, spacing = 0) {
    this.ops.push(`BT ${color} /F${font === 'B' ? 2 : 1} ${num(size)} Tf${spacing ? ` ${num(spacing)} Tc` : ''} ${num(x)} ${num(baseline)} Td <${hex(t)}> Tj${spacing ? ' 0 Tc' : ''} ET`);
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

/** The cover: the kind of document, the name large, what it is for, and its facts at the foot; then a new page. */
function cover(L: Layout, c: Cover) {
  L.bare.add(L.pages.length - 1);
  L.shade(0, PAGE_H, PAGE_W, 10, NAVY);
  let y = PAGE_H - 170;
  L.text(LEFT, y, c.kicker.toUpperCase(), 'B', 10, NAVY, 2);
  y -= 16;
  L.ops.push(`${NAVY_LINE} 2 w ${num(LEFT)} ${num(y)} m ${num(LEFT + 46)} ${num(y)} l S`);
  y -= 22;
  for (const line of wrap(c.title, 'B', 30, WIDTH)) { L.text(LEFT, y - 26, line, 'B', 30); y -= 37; }
  if (c.sub) for (const line of wrap(c.sub, 'R', 14, WIDTH)) { L.text(LEFT, y - 16, line, 'R', 14, MUTED); y -= 20; }
  y -= 18;
  for (const t of c.lines) for (const line of wrap(t, 'R', 11, WIDTH)) { L.text(LEFT, y - 11, line, 'R', 11); y -= 16; }
  // The facts at the foot, above any mark: a rule, then each name and its value.
  const key = 110, rows = c.facts.map(([k, v]) => ({ k, v: wrap(v, 'R', 10, WIDTH - key) }));
  const markH = c.mark ? 18 + 13 * (1 + wrap(c.mark.text, 'R', 9.5, WIDTH - 24).length) : 0;
  let f = BOTTOM + 20 + (markH ? markH + 22 : 0) + rows.reduce((a, r) => a + r.v.length * 14 + 5, 0);
  L.rule(LEFT, LEFT + WIDTH, f + 12, 0.6, 0.6);
  for (const r of rows) {
    L.text(LEFT, f - 10, r.k, 'R', 10, MUTED);
    r.v.forEach((t, i) => L.text(LEFT + key, f - 10 - i * 14, t, 'R', 10));
    f -= r.v.length * 14 + 5;
  }
  if (c.mark) {
    const top = BOTTOM + 20 + markH, lines = wrap(c.mark.text, 'R', 9.5, WIDTH - 24);
    L.ops.push(`1 0.96 0.86 rg 0.85 0.62 0.2 RG 0.8 w ${num(LEFT)} ${num(top - markH)} ${num(WIDTH)} ${num(markH)} re B`);
    L.text(LEFT + 12, top - 9 - 10, c.mark.title, 'B', 10.5);
    lines.forEach((t, i) => L.text(LEFT + 12, top - 9 - 10 - 15 - i * 13, t, 'R', 9.5));
  }
  L.newPage();
}

/** One block from the cursor down; `next` lets a heading stay with the table after it; `entries`, the contents' lines. */
function block(L: Layout, b: Block, next: Block | undefined, entries: string[]) {
  switch (b.kind) {
    case 'cover':
      cover(L, b);
      return;
    case 'contents': {
      // Whole, a page of its own after a cover; compact, a short list on page 1. Each line links to its part.
      const [head, size, gap] = b.compact ? [12, SIZE, 16] : [17, 11, 24];
      if (b.compact) { L.y -= 9; L.room(head + 12 + entries.length * gap); }
      L.text(LEFT, L.y - head, b.title, 'B', head);
      L.y -= head * (b.compact ? 1.8 : 2.35);
      L.contents = { page: L.pages.length - 1, ys: entries.map((_, i) => L.y - size - i * gap), size };
      L.y -= entries.length * gap;
      return;
    }
    case 'title': {
      const size = b.small ? 14 : 17;
      const navy = b.small && L.sectioned;
      if (navy) L.room(size * 1.3 + 90);
      for (const line of wrap(b.text, 'B', size, WIDTH)) { L.text(LEFT, L.y - size, line, 'B', size, navy ? NAVY : INK); L.y -= size * 1.3; }
      if (navy) { L.y -= 1; L.ops.push(`${NAVY_LINE} 0.8 w ${num(LEFT)} ${num(L.y)} m ${num(LEFT + WIDTH)} ${num(L.y)} l S`); L.y -= 6; }
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
      // A shaded strip: each figure's name, the figure in large bold, the lender's level and its note.
      const pad = 8, w = WIDTH / Math.max(1, b.items.length);
      const notes = b.items.map((f) => [...(f.level ? wrap(f.level, 'B', 8, w - 2 * pad) : []), ...(f.note ? wrap(f.note, 'R', 8, w - 2 * pad) : [])]);
      const h = 2 * pad + 11 + 17 + 10.5 * Math.max(0, ...notes.map((n) => n.length));
      L.y -= 6;
      L.room(h + 6);
      L.shade(LEFT, L.y, WIDTH, h);
      b.items.forEach((f, i) => {
        const x = LEFT + i * w + pad;
        L.text(x, L.y - pad - 8, f.label, 'R', 8, MUTED);
        L.text(x, L.y - pad - 11 - 13, f.value, 'B', 14);
        const level = f.level ? wrap(f.level, 'B', 8, w - 2 * pad).length : 0;
        notes[i].forEach((t, k) => L.text(x, L.y - pad - 28 - 8 - k * 10.5, t, k < level ? 'B' : 'R', 8, k < level ? INK : MUTED));
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
    case 'chart':
      chart(L, b.chart);
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

// ---- A chart: two bars a year, like the page's (Bars.tsx) ----

const BAR_A = '0.1 g', BAR_B = '0.62 0.65 0.7 rg', WARN_TINT = '1 0.96 0.86 rg', WARN = '0.6 0.36 0 rg';

/** Each year's two amounts as bars from a common start, the figure at each bar's end, the tightest year shaded and named. */
function chart(L: Layout, c: Chart) {
  const label = 76, room = 64, most = Math.max(1, ...c.rows.flatMap((r) => r.values)), span = WIDTH - label - room;
  const bar = c.rows.length > 10 ? 5 : 7, gap = 2, row = 2 * bar + gap + (c.rows.length > 10 ? 6 : 9);
  L.y -= 10;
  L.room(16 + 16 + Math.min(c.rows.length, 6) * row);
  L.text(LEFT, L.y - 11, c.title, 'B', 11);
  L.right(LEFT + WIDTH, L.y - 11, c.unit, 'R', 8, MUTED);
  L.y -= 19;
  // The key: a swatch and a name for each bar.
  let x = LEFT;
  c.names.forEach((name, i) => {
    L.ops.push(`${i ? BAR_B : BAR_A} ${num(x)} ${num(L.y - 7.5)} 10 5 re f`);
    L.text(x + 14, L.y - 8, name, 'R', 8, MUTED);
    x += 14 + textWidth(name, 'R', 8) + 16;
  });
  L.y -= 16;
  for (const r of c.rows) {
    L.room(row);
    const top = L.y, note = r.tight ? c.tightName : r.note;
    if (r.tight) L.shade(LEFT - 4, top + 2, WIDTH + 8, row - 2, WARN_TINT);
    L.text(LEFT, top - 8.5, r.label, r.tight ? 'B' : 'R', 8.5);
    if (note) L.text(LEFT, top - 18, wrap(note, 'B', 7, label - 6)[0], r.tight ? 'B' : 'R', 7, r.tight ? WARN : MUTED);
    r.values.forEach((v, i) => {
      const y = top - 2 - i * (bar + gap), w = Math.max(1.5, (Math.max(0, v) / most) * span);
      L.ops.push(`${i ? BAR_B : BAR_A} ${num(LEFT + label)} ${num(y - bar)} ${num(w)} ${num(bar)} re f`);
      L.text(LEFT + label + w + 4, y - bar + 0.5, r.texts[i], i ? 'R' : 'B', 7.5, i ? MUTED : INK);
    });
    L.y -= row;
  }
  L.y -= 6;
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
  return m.headerH + 8 + (t.unit ? 11 : 0) + t.rows.reduce((a, r) => a + rowHeight(t, r, m, WIDTH), 0);
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
    if (t.unit) { L.room(m.headerH + 3 * lh + 11); L.right(end, L.y - 7.5, t.unit, 'R', 7.5, MUTED); L.y -= 11; }
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

/** The document laid out: its pages, and the page each part starts on. */
export function lay(doc: Doc) {
  const L = new Layout(), parts = doc.parts.filter((p) => !p.sheetOnly), sections = parts.filter((p) => p.section), starts = new Map<Part, number>();
  L.sectioned = sections.length > 0;
  parts.forEach((part, i) => {
    if (i && part.flow) { L.y -= 22; L.room(160); }
    else if (i && L.y < TOP) L.newPage();
    starts.set(part, L.pages.length - 1);
    L.tops.set(part, { page: L.pages.length - 1, y: L.y });
    part.blocks.forEach((b, k) => block(L, b, part.blocks[k + 1], sections.map((x) => x.section as string)));
  });
  return { L, sections, starts };
}

/** The contents' lines with the PDF page each starts on (the Word copy's contents field shows them until Word updates it). */
export function sectionPages(doc: Doc): [string, number][] {
  const { sections, starts } = lay(doc);
  return sections.map((x) => [x.section as string, (starts.get(x) ?? 0) + 1]);
}

