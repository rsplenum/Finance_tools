/**
 * A text PDF into numbered lines (U1, D-UX-48), on the phone: pdf.js reads the text pieces and engine/read.ts groups them
 * into lines. Only these lines leave the phone; the PDF itself never does. tests/read.test.ts runs the same code in node.
 */
import { READ, linesOfPage, looksScanned, type Line } from '../../../engine/read';

interface Piece { str?: string; transform?: number[]; width?: number }
export interface PdfDoc { numPages: number; getPage(n: number): Promise<{ getTextContent(): Promise<{ items: unknown[] }> }> }

export async function linesOfPdf(doc: PdfDoc): Promise<Line[]> {
  const out: Line[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const { items } = await (await doc.getPage(p)).getTextContent();
    out.push(...linesOfPage(p, (items as Piece[]).flatMap((i) => (typeof i.str === 'string' && i.transform ? [{ str: i.str, x: i.transform[4], y: i.transform[5], w: i.width ?? 0 }] : []))));
  }
  return out;
}

/** The file's lines, or what to tell the borrower when it cannot be read: not a PDF, scanned, or too long. */
export async function linesOfFile(file: File): Promise<Line[] | string> {
  const [pdfjs, worker] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  let lines: Line[];
  try { lines = await linesOfPdf(await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise); }
  catch { return 'This file could not be opened as a PDF: type the figures, or upload the PDF your CA sends.'; }
  if (looksScanned(lines)) return 'This looks scanned: type the figures, or upload the text PDF your CA sends.';
  if (lines.length > READ.maxLines || lines.reduce((s, l) => s + l.text.length, 0) > READ.maxChars) return 'This PDF is too long to read: upload the audited statements alone, or type the figures.';
  return lines;
}
