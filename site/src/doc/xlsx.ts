/**
 * An Excel workbook (.xlsx) for documents made in the browser (doc.ts): one sheet per part, text as shared strings,
 * figures as numbers exactly as the engine gave them, shown with lakh and crore grouping. No formulas, so every figure
 * in the file is the engine's. A stored (uncompressed) zip written here; no library. Pure: bytes in memory, no DOM.
 */
import type { Block, Cell, Doc, Row } from './doc';

// ---- Zip, stored ----

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of data) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** A zip of the files as they are (method 0), dated `when`. */
export function zip(files: { name: string; data: Uint8Array }[], when: Date): Uint8Array<ArrayBuffer> {
  const time = (when.getHours() << 11) | (when.getMinutes() << 5) | (when.getSeconds() >> 1);
  const date = ((when.getFullYear() - 1980) << 9) | ((when.getMonth() + 1) << 5) | when.getDate();
  const parts: Uint8Array[] = [], central: Uint8Array[] = [];
  let offset = 0;
  for (const f of files) {
    const name = new TextEncoder().encode(f.name), crc = crc32(f.data), size = f.data.length;
    const local = new Uint8Array(30 + name.length), l = new DataView(local.buffer);
    [[0, 0x04034b50, 4], [4, 20, 2], [10, time, 2], [12, date, 2], [14, crc, 4], [18, size, 4], [22, size, 4], [26, name.length, 2]]
      .forEach(([pos, v, n]) => (n === 4 ? l.setUint32(pos, v, true) : l.setUint16(pos, v, true)));
    local.set(name, 30);
    const entry = new Uint8Array(46 + name.length), c = new DataView(entry.buffer);
    [[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [12, time, 2], [14, date, 2], [16, crc, 4], [20, size, 4], [24, size, 4], [28, name.length, 2], [42, offset, 4]]
      .forEach(([pos, v, n]) => (n === 4 ? c.setUint32(pos, v, true) : c.setUint16(pos, v, true)));
    entry.set(name, 46);
    parts.push(local, f.data);
    central.push(entry);
    offset += local.length + size;
  }
  const dirSize = central.reduce((a, x) => a + x.length, 0), end = new Uint8Array(22), e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true);
  e.setUint16(8, files.length, true);
  e.setUint16(10, files.length, true);
  e.setUint32(12, dirSize, true);
  e.setUint32(16, offset, true);
  const out = new Uint8Array(offset + dirSize + 22);
  let pos = 0;
  for (const p of [...parts, ...central, end]) { out.set(p, pos); pos += p.length; }
  return out;
}

// ---- The workbook ----

const MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PKG = 'http://schemas.openxmlformats.org/package/2006/relationships';
const HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
// XML 1.0 has no place for control characters other than tab and new line.
const xml = (t: string) => t.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Lakh and crore grouping ([>=1,00,00,000] 1,00,00,000; [>=1,00,000] 1,00,000; else 99,999), in rupees or to the paisa. */
const INDIAN = (dec: string) => `[>=10000000]##\\,##\\,##\\,##0${dec};[>=100000]##\\,##\\,##0${dec};##,##0${dec}`;
const FORMATS = [INDIAN(''), INDIAN('.00'), '0.0000'];

/** Cell styles, by index: plain, bold, title, muted, a bold heading on the right, text on the right; then each number format plain and in bold under a rule. */
const STYLE = { plain: 0, bold: 1, title: 2, muted: 3, headRight: 4, right: 5 } as const;
const NUMBER_FORMATS = [164, 165, 2, 166, 1]; // rupees, to the paisa, a ratio to 2 and to 4 decimals, a count
const numberStyle = (fmt: number, strong: boolean) => 6 + 2 * NUMBER_FORMATS.indexOf(fmt) + (strong ? 1 : 0);

const STYLES = `${HEAD}<styleSheet xmlns="${MAIN}">
<numFmts count="${FORMATS.length}">${FORMATS.map((f, i) => `<numFmt numFmtId="${164 + i}" formatCode="${xml(f)}"/>`).join('')}</numFmts>
<fonts count="4"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="14"/><name val="Calibri"/><family val="2"/></font><font><sz val="10"/><color rgb="FF595959"/><name val="Calibri"/><family val="2"/></font></fonts>
<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top style="thin"/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="${6 + 2 * NUMBER_FORMATS.length}">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="right"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="right"/></xf>
${NUMBER_FORMATS.map((f) => `<xf numFmtId="${f}" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="${f}" fontId="1" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>`).join('\n')}
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

type XCell = { text: string; style: number } | { value: number; style: number };

/** Column letters: 0 → A, 26 → AA. */
const column = (i: number): string => (i < 26 ? String.fromCharCode(65 + i) : column(Math.floor(i / 26) - 1) + column(i % 26));

function numberCell(c: Cell, strong: boolean): XCell {
  const f = c.figure;
  if (!f || !Number.isFinite(f.value)) return { text: c.text, style: STYLE.right };
  const fmt = f.kind === 'count' ? 1 : f.kind === 'ratio' ? (f.decimals > 2 ? 166 : 2) : f.decimals > 0 ? 165 : 164;
  return { value: f.value === 0 ? 0 : f.value, style: numberStyle(fmt, strong) };
}

/** The rows of one sheet, from a part's blocks: text down the first column, tables across. `notes` follow the title. */
function sheetRows(blocks: Block[], notes: string[] = []): XCell[][] {
  const rows: XCell[][] = [], line = (text: string, style: number = STYLE.plain) => rows.push([{ text, style }]);
  for (const b of blocks) {
    if (b.kind === 'title') { line(b.text, STYLE.title); if (b.sub) line(b.sub, STYLE.muted); for (const n of notes.splice(0)) line(n, STYLE.muted); rows.push([]); }
    else if (b.kind === 'heading') { if (rows.length && rows[rows.length - 1].length) rows.push([]); line(b.text, STYLE.bold); }
    else if (b.kind === 'text') line(b.text, b.small ? STYLE.muted : STYLE.plain);
    else if (b.kind === 'list') for (const i of b.items) line(`• ${i}`, b.small ? STYLE.muted : STYLE.plain);
    else if (b.kind === 'pairs') for (const [k, v] of b.pairs) rows.push([{ text: k, style: STYLE.muted }, { text: v, style: STYLE.plain }]);
    else if (b.kind === 'box') { line(b.title, STYLE.bold); for (const i of b.items) line(`• ${i}`); }
    else if (b.kind === 'signature') { rows.push([]); for (const l of b.lines) { line(l); rows.push([]); } }
    else {
      const t = b.table;
      rows.push(t.columns.map((c, i) => ({ text: c.sub ? `${c.label} (${c.sub})` : c.label, style: i ? STYLE.headRight : STYLE.bold })));
      for (const r of t.rows) rows.push(tableRow(r));
      rows.push([]);
    }
  }
  return rows;
}

const tableRow = (r: Row): XCell[] => r.kind === 'head'
  ? [{ text: r.cells[0]?.text ?? '', style: STYLE.bold }]
  : r.cells.map((c, i) => (i ? numberCell(c, !!r.kind) : { text: c.text, style: r.kind ? STYLE.bold : STYLE.plain }));

/** The document as an Excel workbook. */
export function xlsxOf(doc: Doc, made: Date): Uint8Array<ArrayBuffer> {
  const strings: string[] = [], index = new Map<string, number>();
  const shared = (t: string) => {
    if (!index.has(t)) { index.set(t, strings.length); strings.push(t); }
    return index.get(t)!;
  };
  let used = 0;
  const sheets = doc.parts.map((part, i) => {
    // The footer the PDF prints on every page is said once, under the first title, with the note about the cells.
    const rows = sheetRows(part.blocks, i ? [] : [doc.footer, doc.workbookNote ?? ''].filter(Boolean)), widest = Math.max(2, ...rows.map((r) => r.length));
    const data = rows.map((r, i) => {
      const cells = r.map((c, j) => {
        const ref = `${column(j)}${i + 1}`;
        if ('value' in c) return `<c r="${ref}" s="${c.style}"><v>${c.value}</v></c>`;
        if (!c.text) return '';
        used++;
        return `<c r="${ref}" s="${c.style}" t="s"><v>${shared(c.text)}</v></c>`;
      }).join('');
      return cells ? `<row r="${i + 1}">${cells}</row>` : '';
    }).join('');
    return `${HEAD}<worksheet xmlns="${MAIN}" xmlns:r="${REL}"><cols><col min="1" max="1" width="48" customWidth="1"/>`
      + `<col min="2" max="${widest}" width="16" customWidth="1"/></cols><sheetData>${data}</sheetData></worksheet>`;
  });
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
    { name: 'xl/styles.xml', data: enc(STYLES) },
    { name: 'xl/sharedStrings.xml', data: enc(`${HEAD}<sst xmlns="${MAIN}" count="${used}" uniqueCount="${strings.length}">`
      + strings.map((t) => `<si><t xml:space="preserve">${xml(t)}</t></si>`).join('') + '</sst>') },
  ], made);
}
