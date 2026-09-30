/**
 * Reads a downloaded document back with readers written by others, so the tests check the files as a PDF reader and a
 * spreadsheet read them, not as our own writers meant them: pdf.js (Firefox's PDF reader) for the PDF's text, page by
 * page, and read-excel-file for the workbook's sheets and cells. Used by tests/dscr-document.test.ts and the site check.
 */
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import readExcelFile from 'read-excel-file/node';

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
