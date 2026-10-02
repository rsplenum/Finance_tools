/**
 * An Excel workbook (.xlsx) for documents made in the browser (doc.ts): one sheet per part, laid out like the PDF and set
 * up to print on A4, one page wide. Text as shared strings; figures as numbers exactly as the engine gave them, shown
 * with lakh and crore grouping. No formulas, so every figure in the file is the engine's. A stored zip (zip.ts); no
 * library. Pure: bytes in memory, no DOM.
 */
import type { Block, Cell, Doc, Row } from './doc';
import { zip } from './zip';

const MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PKG = 'http://schemas.openxmlformats.org/package/2006/relationships';
const HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
// XML 1.0 has no place for control characters other than tab and new line.
const xml = (t: string) => t.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---- Styles ----

/** Lakh and crore grouping ([>=1,00,00,000] 1,00,00,000; [>=1,00,000] 1,00,000; else 99,999), in rupees or to the paisa. */
const INDIAN = (dec: string) => `[>=10000000]##\\,##\\,##\\,##0${dec};[>=100000]##\\,##\\,##0${dec};##,##0${dec}`;
const FORMATS = [INDIAN(''), INDIAN('.00'), '0.0000'];
/** Number formats: rupees, to the paisa, a ratio to 2 and to 4 decimals, a count. */
const NUMBER_FORMATS = [164, 165, 2, 166, 1];

// Fonts: plain, bold, the title, muted, an annex's title, a key figure. Fills: none, gray125 (required), shaded, amber.
// Borders: none, a rule above, a rule below, rules above and below.
const FONTS = ['<sz val="11"/>', '<b/><sz val="11"/>', '<b/><sz val="16"/>', '<sz val="10"/><color rgb="FF545454"/>', '<b/><sz val="13"/>', '<b/><sz val="14"/>']
  .map((f) => `<font>${f}<name val="Calibri"/><family val="2"/></font>`);
const FILLS = ['<patternFill patternType="none"/>', '<patternFill patternType="gray125"/>',
  '<patternFill patternType="solid"><fgColor rgb="FFECECEC"/><bgColor indexed="64"/></patternFill>',
  '<patternFill patternType="solid"><fgColor rgb="FFFFF4DC"/><bgColor indexed="64"/></patternFill>'].map((f) => `<fill>${f}</fill>`);
const RULE = '<color rgb="FF444444"/>';
const BORDERS = [['', ''], [`<top style="thin">${RULE}</top>`, ''], ['', `<bottom style="thin">${RULE}</bottom>`], [`<top style="thin">${RULE}</top>`, `<bottom style="thin">${RULE}</bottom>`]]
  .map(([top, bottom]) => `<border><left/><right/>${top || '<top/>'}${bottom || '<bottom/>'}<diagonal/></border>`);

/** Every cell sits at the top of its row, so a figure stays level with the first line of a name that wraps. */
interface Xf { font?: number; fill?: number; border?: number; fmt?: number; align?: 'right'; wrap?: boolean }
const xfs: Xf[] = [];
const style = (x: Xf) => xfs.push(x) - 1;
const S = {
  plain: style({}), bold: style({ font: 1 }), title: style({ font: 2 }), muted: style({ font: 3 }), annex: style({ font: 4 }),
  wrap: style({ wrap: true }), mutedWrap: style({ font: 3, wrap: true }), boldWrap: style({ font: 1, wrap: true }),
  headLeft: style({ font: 1, border: 2 }), headRight: style({ font: 1, border: 2, align: 'right', wrap: true }),
  group: style({ font: 1, fill: 2 }), right: style({ align: 'right' }), ratioLabel: style({ font: 1, border: 3 }), ratioRight: style({ font: 1, border: 3, align: 'right' }),
  figLabel: style({ font: 3, fill: 2 }), figValue: style({ font: 5, fill: 2 }), figNote: style({ font: 3, fill: 2 }),
  boxTitle: style({ font: 1, fill: 3 }), boxItem: style({ fill: 3, wrap: true }),
};
/** A figure's style: its number format, plain, in bold under a rule (a total), or in bold between two (a ratio). */
const NUMBER = NUMBER_FORMATS.map((fmt) => [style({ fmt }), style({ fmt, font: 1, border: 1 }), style({ fmt, font: 1, border: 3 })]);

const STYLES = () => `${HEAD}<styleSheet xmlns="${MAIN}">
<numFmts count="${FORMATS.length}">${FORMATS.map((f, i) => `<numFmt numFmtId="${164 + i}" formatCode="${xml(f)}"/>`).join('')}</numFmts>
<fonts count="${FONTS.length}">${FONTS.join('')}</fonts>
<fills count="${FILLS.length}">${FILLS.join('')}</fills>
<borders count="${BORDERS.length}">${BORDERS.join('')}</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="${xfs.length}">${xfs.map((x) => {
  const align = `<alignment${x.align ? ` horizontal="${x.align}"` : ''} vertical="top"${x.wrap ? ' wrapText="1"' : ''}/>`;
  return `<xf numFmtId="${x.fmt ?? 0}" fontId="${x.font ?? 0}" fillId="${x.fill ?? 0}" borderId="${x.border ?? 0}" xfId="0"`
    + `${x.fmt ? ' applyNumberFormat="1"' : ''}${x.font ? ' applyFont="1"' : ''}${x.fill ? ' applyFill="1"' : ''}${x.border ? ' applyBorder="1"' : ''} applyAlignment="1">${align}</xf>`;
}).join('\n')}</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

// ---- Sheets ----

type XCell = { text: string; style: number } | { value: number; style: number } | { style: number };
/**
 * A row of cells. `across`: its first cell runs across every column of the sheet, wrapped (its height estimated); `span`:
 * a fact, its value across the columns after its name; `table`: a table's row, which sets the columns' widths.
 */
interface XRow { cells: XCell[]; across?: boolean; span?: number; size?: number; table?: boolean }

/** Column letters: 0 → A, 26 → AA. */
const column = (i: number): string => (i < 26 ? String.fromCharCode(65 + i) : column(Math.floor(i / 26) - 1) + column(i % 26));

function numberCell(c: Cell, kind?: Row['kind']): XCell {
  const f = c.figure, k = kind === 'ratio' ? 2 : kind ? 1 : 0;
  if (!f || !Number.isFinite(f.value)) return { text: c.text, style: kind === 'ratio' ? S.ratioRight : S.right };
  const fmt = f.kind === 'count' ? 1 : f.kind === 'ratio' ? (f.decimals > 2 ? 166 : 2) : f.decimals > 0 ? 165 : 164;
  return { value: f.value === 0 ? 0 : f.value, style: NUMBER[NUMBER_FORMATS.indexOf(fmt)][k] };
}

/** The rows of one sheet, from a part's blocks: text across the sheet, facts as name and value, tables across. */
function sheetRows(blocks: Block[], notes: string[] = []): XRow[] {
  const rows: XRow[] = [], blank = () => rows.push({ cells: [] });
  const line = (text: string, s: number = S.wrap, size = 11) => rows.push({ cells: [{ text, style: s }], across: true, size });
  const fact = (k: string, v: string) => rows.push({ cells: [{ text: k, style: S.mutedWrap }, { text: v, style: S.wrap }], span: 1 });
  for (const b of blocks) {
    if (b.kind === 'title') {
      rows.push({ cells: [{ text: b.text, style: b.small ? S.annex : S.title }] });
      if (b.sub) line(b.sub, S.mutedWrap, 10);
      for (const n of notes.splice(0)) line(n, S.mutedWrap, 10);
      blank();
    } else if (b.kind === 'heading') { if (rows.length && rows[rows.length - 1].cells.length) blank(); rows.push({ cells: [{ text: b.text, style: S.bold }] }); }
    else if (b.kind === 'text') line(b.text, b.small ? S.mutedWrap : S.wrap, b.small ? 10 : 11);
    else if (b.kind === 'list') for (const i of b.items) line(`• ${i}`, b.small ? S.mutedWrap : S.wrap, b.small ? 10 : 11);
    else if (b.kind === 'pairs') for (const [k, v] of b.pairs) fact(k, v);
    else if (b.kind === 'facts') for (const [k, v] of b.lines.flat()) fact(k, v);
    else if (b.kind === 'figures') {
      blank();
      for (const f of b.items) rows.push({ cells: [{ text: f.label, style: S.figLabel }, { text: f.value, style: S.figValue }, { text: f.note ?? '', style: S.figNote }] });
    } else if (b.kind === 'box') { line(b.title, S.boxTitle); for (const i of b.items) line(`• ${i}`, S.boxItem); }
    else if (b.kind === 'signature') { blank(); for (const l of b.lines) { if (l) rows.push({ cells: [{ text: l, style: S.plain }] }); else blank(); } }
    else {
      const t = b.table, width = t.columns.length;
      blank();
      rows.push({ cells: t.columns.map((c, i) => ({ text: c.sub ? `${c.label} (${c.sub})` : c.label, style: i ? S.headRight : S.headLeft })), table: true });
      for (const r of t.rows) rows.push({ cells: tableRow(r, width), table: r.kind !== 'head' });
    }
  }
  return rows;
}

/** A group's name shaded across the table; a ratio between rules; totals in bold under a rule. */
const tableRow = (r: Row, width: number): XCell[] => r.kind === 'head'
  ? [{ text: r.cells[0]?.text ?? '', style: S.group }, ...Array.from({ length: width - 1 }, () => ({ style: S.group }))]
  : r.cells.map((c, i) => (i ? numberCell(c, r.kind) : { text: c.text, style: r.kind === 'ratio' ? S.ratioLabel : r.kind ? S.boldWrap : S.wrap }));

/**
 * Widths in characters: the first column as wide as the names in it (within limits; a longer one wraps), the others as
 * their tables' figures and headings; a sheet without a table has one wide column for the values.
 */
function widths(rows: XRow[]): number[] {
  const table = rows.filter((r) => r.table), len = (c?: XCell) => (c && 'text' in c ? c.text.length : c && 'value' in c ? 12 : 0);
  const first = Math.min(46, Math.max(18, ...rows.filter((r) => r.table || r.span !== undefined).map((r) => len(r.cells[0]) + 2)));
  if (!table.length) return [first, 70];
  const cols = Math.max(...table.map((r) => r.cells.length));
  return [first, ...Array.from({ length: cols - 1 }, (_, j) => Math.min(21, Math.max(11, ...table.map((r) => len(r.cells[j + 1]) + 3))))];
}

/** One sheet: no gridlines, A4 one page wide (landscape when its table is wide), the document's header and footer. */
function sheetXml(doc: Doc, rows: XRow[], shared: (t: string) => number): string {
  const w = widths(rows), last = w.length - 1, merges: string[] = [];
  const total = w.reduce((a, x) => a + x, 0);
  const data = rows.map((r, i) => {
    const n = i + 1;
    let ht = '';
    // Text across the sheet, and a fact's value across the columns after its name, merged and wrapped; a table's names
    // wrap in the first column. A merged cell does not grow with its text, so each row is made as tall as its lines.
    const from = r.across ? 0 : r.span !== undefined ? 1 : -1;
    if (from >= 0 && last > from) merges.push(`${column(from)}${n}:${column(last)}${n}`);
    const chars = (c: XCell | undefined, cols: number[], small: boolean) =>
      Math.ceil((c && 'text' in c ? c.text.length : 0) / (cols.reduce((a, x) => a + x, 0) * (small ? 1.4 : 1.2)));
    const lines = Math.max(1,
      from >= 0 ? chars(r.cells[from], w.slice(from), r.size === 10) : 1,
      r.span !== undefined ? chars(r.cells[0], [w[0]], true) : 1,
      r.table ? chars(r.cells[0], [w[0]], false) : 1);
    if (lines > 1) ht = ` ht="${(lines * (r.size === 10 && from >= 0 ? 13.2 : 14.6) + 1.2).toFixed(1)}" customHeight="1"`;
    const cells = r.cells.map((c, j) => {
      const ref = `${column(j)}${n}`;
      if ('value' in c) return `<c r="${ref}" s="${c.style}"><v>${c.value}</v></c>`;
      if (!('text' in c) || !c.text) return `<c r="${ref}" s="${c.style}"/>`;
      return `<c r="${ref}" s="${c.style}" t="s"><v>${shared(c.text)}</v></c>`;
    }).join('');
    return cells ? `<row r="${n}"${ht}>${cells}</row>` : '';
  }).join('');
  // Header and footer codes: &L left, &R right, &P the page, &N the pages; a literal & is &&.
  const hf = (t: string) => xml(t.replace(/&/g, '&&'));
  return `${HEAD}<worksheet xmlns="${MAIN}" xmlns:r="${REL}"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>`
    + '<sheetViews><sheetView showGridLines="0" workbookViewId="0"/></sheetViews>'
    + `<cols>${w.map((x, i) => `<col min="${i + 1}" max="${i + 1}" width="${x}" customWidth="1"/>`).join('')}</cols>`
    + `<sheetData>${data}</sheetData>`
    + (merges.length ? `<mergeCells count="${merges.length}">${merges.map((m) => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : '')
    + '<pageMargins left="0.5" right="0.5" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>'
    + `<pageSetup paperSize="9" orientation="${total > 120 ? 'landscape' : 'portrait'}" fitToWidth="1" fitToHeight="0"/>`
    + `<headerFooter><oddHeader>&amp;L&amp;8${hf(doc.header)}${doc.mark ? `&amp;R&amp;8&amp;B${hf(doc.mark)}` : ''}</oddHeader>`
    + `<oddFooter>&amp;L&amp;8${hf(doc.footer)}&amp;R&amp;8Page &amp;P of &amp;N</oddFooter></headerFooter></worksheet>`;
}

/** The document as an Excel workbook. */
export function xlsxOf(doc: Doc, made: Date): Uint8Array<ArrayBuffer> {
  const strings: string[] = [], index = new Map<string, number>();
  let used = 0;
  const shared = (t: string) => {
    used++;
    if (!index.has(t)) { index.set(t, strings.length); strings.push(t); }
    return index.get(t)!;
  };
  // The footer the PDF prints on every page is also said once, under the first title, with the note about the cells.
  const sheets = doc.parts.map((part, i) => sheetXml(doc, sheetRows(part.blocks, i ? [] : [doc.footer, doc.workbookNote ?? ''].filter(Boolean)), shared));
  const names = doc.parts.map((p) => p.name.replace(/[[\]:*?/\\]/g, ' ').slice(0, 31));
  const enc = (t: string) => new TextEncoder().encode(t);
  return zip([
    { name: '[Content_Types].xml', data: enc(`${HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
      + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
      + sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')
      + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
      + '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>'
      + '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>') },
    { name: '_rels/.rels', data: enc(`${HEAD}<Relationships xmlns="${PKG}"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/>`
      + `<Relationship Id="rId2" Type="${PKG}/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`) },
    { name: 'docProps/core.xml', data: enc(`${HEAD}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" `
      + 'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
      + `<dc:title>${xml(doc.title)}</dc:title><dc:creator>${xml(doc.author ?? doc.creator)}</dc:creator>`
      + `<dcterms:created xsi:type="dcterms:W3CDTF">${made.toISOString().slice(0, 19)}Z</dcterms:created></cp:coreProperties>`) },
    { name: 'xl/workbook.xml', data: enc(`${HEAD}<workbook xmlns="${MAIN}" xmlns:r="${REL}"><sheets>`
      + names.map((n, i) => `<sheet name="${xml(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') + '</sheets></workbook>') },
    { name: 'xl/_rels/workbook.xml.rels', data: enc(`${HEAD}<Relationships xmlns="${PKG}">`
      + sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${REL}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')
      + `<Relationship Id="rId${sheets.length + 1}" Type="${REL}/styles" Target="styles.xml"/>`
      + `<Relationship Id="rId${sheets.length + 2}" Type="${REL}/sharedStrings" Target="sharedStrings.xml"/></Relationships>`) },
    ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: enc(s) })),
    { name: 'xl/styles.xml', data: enc(STYLES()) },
    { name: 'xl/sharedStrings.xml', data: enc(`${HEAD}<sst xmlns="${MAIN}" count="${used}" uniqueCount="${strings.length}">`
      + strings.map((t) => `<si><t xml:space="preserve">${xml(t)}</t></si>`).join('') + '</sst>') },
  ], made);
}
