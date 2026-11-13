/**
 * A Word file (.docx) for documents made in the browser (doc.ts), to edit: the PDF's layout page for page, on A4 in Arial
 * (the Helvetica of Word), with real Word tables split into the same column groups as the PDF's (pdf.ts `measure`), the
 * header and footer on every page with its number, and each part from a new page. Word letters are not limited to
 * Latin. A stored zip (zip.ts); no library. Pure: bytes in memory, no DOM.
 */
import type { Block, Chart, Cover, Doc, Row, Table } from './doc';
import { WIDTH, measure, sectionPages } from './layout';
import { CHART_REL, CHART_TYPE, CHART_URI, chartSize, chartXml, emu, tightLine } from './chart';
import { zip } from './zip';

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const WP = 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing';
const DML = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PKG = 'http://schemas.openxmlformats.org/package/2006/relationships';
const HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const xml = (t: string) => t.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Points to twentieths of a point (twips); the page's text is as wide as the PDF's. */
const tw = (pt: number) => Math.round(pt * 20);
const TEXT_W = tw(WIDTH), MUTED = '545454', SHADE = 'ECECEC', NAVY = '1C335C', SIZE = 19; // half-points: 9.5 pt, as the PDF

// ---- Runs and paragraphs ----

interface Run { bold?: boolean; size?: number; color?: string; spacing?: number }
/** A run of text; its properties in the schema's order (bold, colour, letter spacing, size). */
function run(text: string, r: Run = {}): string {
  const props = `${r.bold ? '<w:b/>' : ''}${r.color ? `<w:color w:val="${r.color}"/>` : ''}${r.spacing ? `<w:spacing w:val="${r.spacing}"/>` : ''}${r.size ? `<w:sz w:val="${r.size}"/><w:szCs w:val="${r.size}"/>` : ''}`;
  return `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ''}<w:t xml:space="preserve">${xml(text)}</w:t></w:r>`;
}
interface Para { style?: string; keepNext?: boolean; pageBreak?: boolean; before?: number; after?: number; hanging?: number; right?: boolean; gap?: number }
/** A paragraph; its properties in the schema's order (style, keep with next, page break, spacing, indent, alignment). */
function para(runs: string, p: Para = {}): string {
  const props = (p.style ? `<w:pStyle w:val="${p.style}"/>` : '') + (p.keepNext ? '<w:keepNext/>' : '') + (p.pageBreak ? '<w:pageBreakBefore/>' : '')
    + (p.before !== undefined || p.after !== undefined ? `<w:spacing${p.before !== undefined ? ` w:before="${p.before}"` : ''}${p.after !== undefined ? ` w:after="${p.after}"` : ''}/>` : '')
    + (p.hanging || p.gap ? `<w:ind${p.hanging ? ` w:left="${p.hanging}" w:hanging="${p.hanging}"` : ''}${p.gap ? ` w:right="${p.gap}"` : ''}/>` : '') + (p.right ? '<w:jc w:val="right"/>' : '');
  return `<w:p>${props ? `<w:pPr>${props}</w:pPr>` : ''}${runs}</w:p>`;
}
/** An empty paragraph only `after` twips tall (its mark in a 4-point font): space between blocks. */
const spacer = (after: number) => `<w:p><w:pPr><w:spacing w:before="0" w:after="${after}" w:line="240" w:lineRule="auto"/><w:rPr><w:sz w:val="8"/><w:szCs w:val="8"/></w:rPr></w:pPr></w:p>`;
const bullet = (text: string, r: Run = {}) => para(`${run('•', r)}<w:r>${r.size ? `<w:rPr><w:sz w:val="${r.size}"/></w:rPr>` : ''}<w:tab/></w:r>${run(text, r)}`, { hanging: 220, after: 30 });

// ---- Tables ----

interface CellOpt { width: number; span?: number; fill?: string; top?: string; bottom?: string; margin?: number }
const border = (side: 'top' | 'bottom', spec?: string) => (spec ? `<w:${side} w:val="single" ${spec}/>` : '');
/** A cell: its width, span, borders and shading in the schema's order; at least one paragraph inside. */
function cell(content: string, c: CellOpt): string {
  const borders = c.top || c.bottom ? `<w:tcBorders>${border('top', c.top)}${border('bottom', c.bottom)}</w:tcBorders>` : '';
  return `<w:tc><w:tcPr><w:tcW w:w="${c.width}" w:type="dxa"/>${c.span && c.span > 1 ? `<w:gridSpan w:val="${c.span}"/>` : ''}${borders}`
    + `${c.fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${c.fill}"/>` : ''}</w:tcPr>${content || para('')}</w:tc>`;
}
/** A table without borders of its own: fixed columns, a little padding either side. */
function table(widths: number[], rows: string[], pad = 100): string {
  return `<w:tbl><w:tblPr><w:tblW w:w="${widths.reduce((a, x) => a + x, 0)}" w:type="dxa"/><w:tblLayout w:type="fixed"/>`
    + `<w:tblCellMar><w:left w:w="${pad}" w:type="dxa"/><w:right w:w="${pad}" w:type="dxa"/></w:tblCellMar></w:tblPr>`
    + `<w:tblGrid>${widths.map((x) => `<w:gridCol w:w="${x}"/>`).join('')}</w:tblGrid>${rows.join('')}</w:tbl>`;
}
const row = (cells: string, opts: { header?: boolean } = {}) => `<w:tr><w:trPr><w:cantSplit/>${opts.header ? '<w:tblHeader/>' : ''}</w:trPr>${cells}</w:tr>`;

/** The space kept between a label and its value where a table has no padding: a long label wraps, never runs into the value. */
const LABEL_GAP = 160;
const RULE = 'w:sz="4" w:space="0" w:color="8C8C8C"', HEAVY = 'w:sz="8" w:space="0" w:color="4D4D4D"', UNDER = 'w:sz="6" w:space="0" w:color="595959"';

/** A table of figures, split into the PDF's column groups, the first column repeated; its header repeats on each page. */
function figuresTable(t: Table): string {
  const m = measure(t), size = t.size === 'small' ? 16 : 17, out: string[] = [];
  m.groups.forEach((g, gi) => {
    const spare = WIDTH - m.keyW - g.reduce((a, j) => a + m.colW[j], 0), extra = Math.max(0, Math.min(22, spare / g.length));
    const widths = [tw(m.keyW), ...g.map((j) => tw(m.colW[j] + extra))], all = widths.reduce((a, x) => a + x, 0);
    const text = (s: string, r: Run = {}, right = false) => para(run(s, { size, ...r }), { right, after: 0 });
    const head = row(cell(text(t.columns[0].label, { bold: true }), { width: widths[0], bottom: UNDER })
      + g.map((j, k) => {
        const c = t.columns[j + 1];
        return cell(text(c.label, { bold: true }, !c.wrap) + (c.sub ? text(c.sub, { color: MUTED, size: size - 2 }, !c.wrap) : ''), { width: widths[k + 1], bottom: UNDER });
      }).join(''), { header: true });
    const body = t.rows.map((r: Row) => {
      if (r.kind === 'head') return row(cell(text(r.cells[0]?.text ?? '', { bold: true }), { width: all, span: g.length + 1, fill: SHADE }));
      const strong = !!r.kind, ratio = r.kind === 'ratio';
      const edge = (num: boolean) => (ratio ? { top: HEAVY, bottom: HEAVY } : r.kind && num ? { top: RULE } : {});
      return row(cell(text(r.cells[0]?.text ?? '', { bold: strong }), { width: widths[0], ...edge(false) })
        + g.map((j, k) => cell(text(r.cells[j + 1]?.text ?? '', { bold: strong }, !t.columns[j + 1].wrap), { width: widths[k + 1], ...edge(true) })).join(''));
    });
    if (gi) out.push(spacer(160));
    out.push(table(widths, [head, ...body]));
  });
  return out.join('');
}

// ---- Blocks ----

/** A page break of its own. */
const pageBreak = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';

/** The cover: the kind of document, the name large, what it is for, its facts, any mark; then a new page. */
function cover(c: Cover): string {
  const key = tw(110);
  return spacer(2400) + para(run(c.kicker.toUpperCase(), { bold: true, size: 20, color: NAVY, spacing: 40 }), { after: 240 })
    + para(run(c.title, { bold: true, size: 60 }), { after: 120 })
    + (c.sub ? para(run(c.sub, { size: 28, color: MUTED }), { after: 360 }) : '')
    + c.lines.map((l) => para(run(l, { size: 22 }), { after: 80 })).join('')
    + spacer(1600)
    + table([key, TEXT_W - key], c.facts.map(([k, v], i) => row(cell(para(run(k, { size: 20, color: MUTED }), { before: 40, after: 60, gap: LABEL_GAP }), { width: key, ...(i ? {} : { top: RULE }) })
      + cell(para(run(v, { size: 20 }), { before: 40, after: 60 }), { width: TEXT_W - key, ...(i ? {} : { top: RULE }) }))), 0)
    + (c.mark ? spacer(240) + block({ kind: 'box', title: c.mark.title, items: [c.mark.text] }, false, [], []) : '')
    + pageBreak;
}

/** The contents as a Word field over the Heading 1 paragraphs, showing the PDF's pages until Word updates it (F9). */
function contents(title: string, entries: [string, number][]): string {
  const f = (type: string) => `<w:r><w:fldChar w:fldCharType="${type}"/></w:r>`;
  const lines = entries.map(([t, page], i) => para((i ? '' : f('begin') + '<w:r><w:instrText xml:space="preserve"> TOC \\o "1-1" \\h \\z \\u </w:instrText></w:r>' + f('separate'))
    + run(t, { bold: /^\d/.test(t) }) + '<w:r><w:tab/></w:r>' + run(String(page)), { style: 'TOC1' }));
  return para(run(title), { style: 'TOCHeading' }) + lines.join('') + `<w:p>${f('end')}</w:p>`;
}

/** A chart, inline across the text's width and kept with the line under it that names the amber year; `k` counts the charts from 0. */
function chart(c: Chart, k: number): string {
  const { w, h } = chartSize(c, WIDTH), alt = `${c.title} (${c.unit}). ${c.rows.map((r) => `${r.label}: ${c.names[0]} ${r.texts[0]}, ${c.names[1]} ${r.texts[1]}`).join('; ')}.`;
  const tight = tightLine(c);
  return spacer(80) + `<w:p><w:pPr><w:keepNext/><w:spacing w:after="40"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">`
    + `<wp:extent cx="${emu(w)}" cy="${emu(h)}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${k + 1}" name="Chart ${k + 1}" descr="${xml(alt)}"/>`
    + `<wp:cNvGraphicFramePr/><a:graphic xmlns:a="${DML}"><a:graphicData uri="${CHART_URI}"><c:chart xmlns:c="${CHART_URI}" r:id="rIdChart${k + 1}"/></a:graphicData></a:graphic>`
    + '</wp:inline></w:drawing></w:r></w:p>' + (tight ? para(run(tight, { size: 16, color: MUTED }), { after: 120 }) : spacer(120));
}

/** One block; `newPage` for the first block of every part after the first; `entries`, the contents' lines; `charts`, the charts so far. */
function block(b: Block, newPage: boolean, entries: [string, number][], charts: Chart[]): string {
  switch (b.kind) {
    case 'cover':
      return cover(b);
    case 'contents':
      return contents(b.title, entries);
    case 'title':
      return para(run(b.text), { style: b.small ? 'Heading1' : 'Title', pageBreak: newPage })
        + (b.sub ? para(run(b.sub, { size: 21, color: MUTED }), { after: 160 }) : '');
    case 'heading':
      return para(run(b.text), { style: 'Heading2' });
    case 'text':
      return para(run(b.text, b.small ? { size: 16, color: MUTED } : {}), { after: 60 });
    case 'list':
      return b.items.map((i) => bullet(i, b.small ? { size: 16, color: MUTED } : {})).join('') + spacer(60);
    case 'pairs': {
      const key = tw(132);
      return table([key, TEXT_W - key], b.pairs.map(([k, v]) => row(cell(para(run(k, { color: MUTED }), { after: 40, gap: LABEL_GAP }), { width: key })
        + cell(para(run(v), { after: 40 }), { width: TEXT_W - key }))), 0) + spacer(120);
    }
    case 'facts': {
      // Four columns: a name and its value, twice; a fact alone runs across the three after its name.
      const key = tw(78), value = Math.round(TEXT_W / 2) - key, widths = [key, value, key, TEXT_W - 2 * key - value];
      const pair = (k: string, v: string, span: number, width: number) => cell(para(run(k, { color: MUTED }), { after: 40, gap: LABEL_GAP }), { width: key })
        + cell(para(run(v), { after: 40 }), { width, span });
      return table(widths, b.lines.map((line) => row(line.length > 1
        ? pair(line[0][0], line[0][1], 1, widths[1]) + pair(line[1][0], line[1][1], 1, widths[3])
        : pair(line[0][0], line[0][1], 3, TEXT_W - key))), 0) + spacer(120);
    }
    case 'figures': {
      const w = Math.floor(TEXT_W / Math.max(1, b.items.length));
      return spacer(120) + table(b.items.map(() => w), [row(b.items.map((f) => cell(
        para(run(f.label, { size: 16, color: MUTED }), { before: 100, after: 0 }) + para(run(f.value, { bold: true, size: 28 }), { after: 0 })
          + (f.level ? para(run(f.level, { bold: true, size: 17 }), { after: 0 }) : '')
          + para(run(f.note ?? '', { size: 16, color: MUTED }), { after: 100 }),
        { width: w, fill: SHADE })).join(''))], 160) + spacer(160);
    }
    case 'box':
      return table([TEXT_W], [row(cell(para(run(b.title, { bold: true }), { before: 80, after: 40 }) + b.items.map((i) => bullet(i)).join('') + para('', { after: 40 }),
        { width: TEXT_W, fill: 'FFF4DC', top: 'w:sz="6" w:space="0" w:color="D99E33"', bottom: 'w:sz="6" w:space="0" w:color="D99E33"' }))], 160) + spacer(160);
    case 'table':
      return spacer(80) + (b.table.unit ? para(run(b.table.unit, { size: 15, color: MUTED }), { keepNext: true, right: true, after: 40 }) : '')
        + figuresTable(b.table) + spacer(80);
    case 'chart':
      return chart(b.chart, charts.push(b.chart) - 1);
    case 'signature':
      // Kept together on one page, with room to sign above "Authorised signatory".
      return b.lines.map((l, i) => para(run(l), { keepNext: i < b.lines.length - 1, before: i === 0 ? 480 : i === 2 ? 480 : 120, after: 0 })).join('');
  }
}

// ---- The package ----

/** The styles; a document of numbered sections has its Heading 1 in navy over a rule, and the contents' styles. */
const STYLES = (sectioned: boolean) => `${HEAD}<w:styles xmlns:w="${W}">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Arial" w:cs="Arial"/><w:sz w:val="${SIZE}"/><w:szCs w:val="${SIZE}"/><w:lang w:val="en-IN"/></w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="252" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:after="40"/></w:pPr><w:rPr><w:b/><w:sz w:val="34"/><w:szCs w:val="34"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/>${sectioned ? `<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="3" w:color="${NAVY}"/></w:pBdr>` : ''}<w:spacing w:after="200"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/>${sectioned ? `<w:color w:val="${NAVY}"/>` : ''}<w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr></w:style>
${sectioned ? `<w:style w:type="paragraph" w:styleId="TOCHeading"><w:name w:val="TOC Heading"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:after="360"/></w:pPr><w:rPr><w:b/><w:sz w:val="34"/><w:szCs w:val="34"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="TOC1"><w:name w:val="toc 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:tabs><w:tab w:val="right" w:leader="dot" w:pos="${TEXT_W}"/></w:tabs><w:spacing w:after="200"/></w:pPr><w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:style>` : ''}
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="200" w:after="100"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:style>
<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>
</w:styles>`;

/** The header or footer of every page: a line of muted text, a right tab, and the mark or the page number. */
function band(kind: 'hdr' | 'ftr', text: string, right: string): string {
  const edge = kind === 'hdr' ? `<w:bottom w:val="single" w:sz="4" w:space="4" w:color="B3B3B3"/>` : `<w:top w:val="single" w:sz="4" w:space="4" w:color="B3B3B3"/>`;
  return `${HEAD}<w:${kind} xmlns:w="${W}" xmlns:r="${R}"><w:p><w:pPr><w:pBdr>${edge}</w:pBdr><w:tabs><w:tab w:val="right" w:pos="${TEXT_W}"/></w:tabs></w:pPr>`
    + `${run(text, { size: 15, color: MUTED })}${right}</w:p></w:${kind}>`;
}
const field = (code: string) => `<w:r><w:rPr><w:sz w:val="15"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:rPr><w:sz w:val="15"/></w:rPr><w:instrText xml:space="preserve"> ${code} </w:instrText></w:r>`
  + `<w:r><w:rPr><w:sz w:val="15"/></w:rPr><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:rPr><w:sz w:val="15"/></w:rPr><w:t>1</w:t></w:r><w:r><w:rPr><w:sz w:val="15"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r>`;
const tab = (size: number) => `<w:r><w:rPr><w:sz w:val="${size}"/></w:rPr><w:tab/></w:r>`;

/** The document as a Word file. */
export function docxOf(doc: Doc, made: Date): Uint8Array<ArrayBuffer> {
  // A part that flows runs on under the one before it; a cover's page has no header or footer (`titlePg`).
  const entries = doc.parts.some((p) => p.section) ? sectionPages(doc) : [], covered = doc.parts.some((p) => p.blocks.some((b) => b.kind === 'cover'));
  const charts: Chart[] = [];
  const body = doc.parts.map((part, i) => (i && part.flow ? spacer(360) : '')
    + part.blocks.map((b, k) => block(b, i > 0 && k === 0 && !part.flow, entries, charts)).join('')).join('');
  const sect = `<w:sectPr><w:headerReference w:type="default" r:id="rId2"/>${covered ? '<w:headerReference w:type="first" r:id="rId4"/>' : ''}`
    + `<w:footerReference w:type="default" r:id="rId3"/>${covered ? '<w:footerReference w:type="first" r:id="rId5"/>' : ''}`
    + `<w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1200" w:right="840" w:bottom="1200" w:left="840" w:header="600" w:footer="560" w:gutter="0"/>${covered ? '<w:titlePg/>' : ''}</w:sectPr>`;
  const blank = (kind: 'hdr' | 'ftr') => `${HEAD}<w:${kind} xmlns:w="${W}" xmlns:r="${R}"><w:p/></w:${kind}>`;
  const enc = (t: string) => new TextEncoder().encode(t);
  return zip([
    { name: '[Content_Types].xml', data: enc(`${HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
      + '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
      + '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
      + '<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>'
      + '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>'
      + (covered ? '<Override PartName="/word/header2.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>'
        + '<Override PartName="/word/footer2.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>' : '')
      + charts.map((_, k) => `<Override PartName="/word/charts/chart${k + 1}.xml" ContentType="${CHART_TYPE}"/>`).join('')
      + '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>') },
    { name: '_rels/.rels', data: enc(`${HEAD}<Relationships xmlns="${PKG}"><Relationship Id="rId1" Type="${R}/officeDocument" Target="word/document.xml"/>`
      + `<Relationship Id="rId2" Type="${PKG}/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`) },
    { name: 'docProps/core.xml', data: enc(`${HEAD}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" `
      + 'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
      + `<dc:title>${xml(doc.title)}</dc:title><dc:creator>${xml(doc.author ?? doc.creator)}</dc:creator>`
      + `<dcterms:created xsi:type="dcterms:W3CDTF">${made.toISOString().slice(0, 19)}Z</dcterms:created></cp:coreProperties>`) },
    { name: 'word/_rels/document.xml.rels', data: enc(`${HEAD}<Relationships xmlns="${PKG}">`
      + `<Relationship Id="rId1" Type="${R}/styles" Target="styles.xml"/><Relationship Id="rId2" Type="${R}/header" Target="header1.xml"/>`
      + `<Relationship Id="rId3" Type="${R}/footer" Target="footer1.xml"/>`
      + (covered ? `<Relationship Id="rId4" Type="${R}/header" Target="header2.xml"/><Relationship Id="rId5" Type="${R}/footer" Target="footer2.xml"/>` : '')
      + charts.map((_, k) => `<Relationship Id="rIdChart${k + 1}" Type="${CHART_REL}" Target="charts/chart${k + 1}.xml"/>`).join('')
      + '</Relationships>') },
    { name: 'word/document.xml', data: enc(`${HEAD}<w:document xmlns:w="${W}" xmlns:r="${R}" xmlns:wp="${WP}"><w:body>${body}${sect}</w:body></w:document>`) },
    { name: 'word/styles.xml', data: enc(STYLES(entries.length > 0)) },
    { name: 'word/header1.xml', data: enc(band('hdr', doc.header, doc.mark ? `${tab(15)}${run(doc.mark, { bold: true, size: 15 })}` : '')) },
    { name: 'word/footer1.xml', data: enc(band('ftr', doc.footer, `${tab(15)}${run('Page ', { size: 15, color: MUTED })}${field('PAGE')}${run(' of ', { size: 15, color: MUTED })}${field('NUMPAGES')}`)) },
    ...(covered ? [{ name: 'word/header2.xml', data: enc(blank('hdr')) }, { name: 'word/footer2.xml', data: enc(blank('ftr')) }] : []),
    ...charts.map((c, k) => ({ name: `word/charts/chart${k + 1}.xml`, data: enc(chartXml(c)) })),
  ], made);
}
