/**
 * The three files every tool offers, made in the browser in the tap itself (no await before the click, so that phones
 * allow the download): a PDF, an Excel copy and a Word copy of the same document (site/src/doc/).
 */
import type { Doc } from './doc/doc';
import { docxOf } from './doc/docx';
import { pdfOf } from './doc/pdf';
import { xlsxOf } from './doc/xlsx';

/** Each file: its writer and its type. */
export const FILES = {
  pdf: { write: pdfOf, type: 'application/pdf' },
  xlsx: { write: xlsxOf, type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  docx: { write: docxOf, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
} as const;
export type FileKind = keyof typeof FILES;

/** Today in the browser's time zone, as 2026-10-02. */
export const isoDate = (d: Date) => [d.getFullYear(), d.getMonth() + 1, d.getDate()].map((n) => String(n).padStart(2, '0')).join('-');

/** Hands the file to the browser to save. */
export function download(bytes: Uint8Array<ArrayBuffer>, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Writes the document as one of the three files and saves it; nothing while there is no document. */
export function save(doc: Doc | undefined, kind: FileKind, name: string, now: Date) {
  if (doc) download(FILES[kind].write(doc, now), name, FILES[kind].type);
}
