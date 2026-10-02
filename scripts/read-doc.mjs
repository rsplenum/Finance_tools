/**
 * Reads a downloaded document back with readers written by others, so the tests check the files as a PDF reader, a
 * spreadsheet and a word processor read them, not as our own writers meant them: pdf.js (Firefox's PDF reader) for the
 * PDF's text, page by page; read-excel-file for the workbook's sheets and cells; mammoth for the Word file's paragraphs
 * and tables, and JSZip for its header and footer (mammoth reads only the body). Used by tests/dscr-document.test.ts and
 * the site check.
 */
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import readExcelFile from 'read-excel-file/node';
import mammoth from 'mammoth';
import JSZip from 'jszip';

/** The text of each page, a line per row of text (top to bottom, left to right), spaces collapsed. */
export async function pdfPages(bytes) {
  const task = getDocument({ data: new Uint8Array(bytes), isEvalSupported: false, disableFontFace: true, verbosity: 0 }), doc = await task.promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const { items } = await (await doc.getPage(i)).getTextContent();
    const rows = new Map();
    for (const it of items) {
      if (!('str' in it) || !it.str.trim()) continue;
      const y = Math.round(it.transform[5]);
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y).push([it.transform[4], it.str]);
    }
    pages.push([...rows.entries()].sort((a, b) => b[0] - a[0])
      .map(([, xs]) => xs.sort((a, b) => a[0] - b[0]).map((x) => x[1]).join(' ').replace(/\s+/g, ' ').trim()).join('\n'));
  }
  await task.destroy();
  return pages;
}

/** The workbook's sheets: { sheet: name, data: rows of strings and numbers }. */
export async function workbook(bytes) {
  return readExcelFile(Buffer.from(bytes));
}

const plain = (h) => h.replace(/<\/p>\s*<p>/g, ' ').replace(/<[^>]+>/g, '')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

/**
 * The Word file's body as mammoth reads it: a line per paragraph or heading, and a line per table row with its cells
 * joined by " | " (a cell's paragraphs by spaces). `messages`: anything mammoth could not read.
 */
export async function docxLines(bytes) {
  const { value: html, messages } = await mammoth.convertToHtml({ buffer: Buffer.from(bytes) }, { styleMap: ["p[style-name='Title'] => h1:fresh"] });
  const lines = [];
  for (const [, tr, , inner] of html.matchAll(/<tr>(.*?)<\/tr>|<(p|h\d)>(.*?)<\/\2>/g)) {
    if (tr !== undefined) lines.push([...tr.matchAll(/<t[dh][^>]*>(.*?)<\/t[dh]>/g)].map((c) => plain(c[1])).join(' | '));
    else if (plain(inner)) lines.push(plain(inner));
  }
  return { lines, messages };
}

/** The text of one part of the Word file (like word/header1.xml), as JSZip reads it: the words of its runs, and its fields. */
export async function docxPart(bytes, name) {
  const zip = await JSZip.loadAsync(Buffer.from(bytes)), x = await zip.file(name)?.async('string');
  if (x === undefined) return undefined;
  return [...x.matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>|<w:instrText[^>]*>([^<]*)<\/w:instrText>|<w:tab\/>/g)]
    .map((m) => (m[1] ?? (m[2] !== undefined ? `{${m[2].trim()}}` : '\t'))).join('');
}
