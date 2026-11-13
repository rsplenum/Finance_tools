/**
 * The three files every tool offers, made in the browser: a PDF, an Excel copy and a Word copy of the same document
 * (site/src/doc/). The writers, with the PDF's face, load apart from the page (PAPER1): Downloads warms them when it
 * shows, so the tap writes the file at once (no await before the click, so that phones allow the download).
 */
import type { Doc } from './doc/doc';
import { track } from './events';

/** Each file's type. */
export const TYPES = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
} as const;
export type FileKind = keyof typeof TYPES;
type Writers = Record<FileKind, (doc: Doc, made: Date) => Uint8Array<ArrayBuffer>>;

let writers: Writers | undefined, loading: Promise<Writers> | undefined;
/** Loads the three writers once; Downloads calls it when it shows. */
export function warm(): Promise<Writers> {
  return (loading ??= Promise.all([import('./doc/pdf'), import('./doc/xlsx'), import('./doc/docx')])
    .then(([p, x, d]) => (writers = { pdf: p.pdfOf, xlsx: x.xlsxOf, docx: d.docxOf })));
}
/** Runs with the writers: in the tap itself once they are loaded (the usual case), else as soon as they are. */
function withWriters(go: (w: Writers) => void) {
  if (writers) go(writers);
  else void warm().then(go);
}

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

/** Print: the same PDF, opened in a new tab to print from (one layout, not a second one for the web page). */
export function openPdf(doc: Doc | undefined, now: Date) {
  if (!doc) return;
  track('download', 'print');
  const url = (w: Writers) => {
    const u = URL.createObjectURL(new Blob([w.pdf(doc, now)], { type: TYPES.pdf }));
    setTimeout(() => URL.revokeObjectURL(u), 60_000);
    return u;
  };
  if (writers) {
    window.open(url(writers), '_blank', 'noopener');
    return;
  }
  // Not loaded yet: open the tab in the tap, as browsers allow only then, and show the PDF in it once written.
  const tab = window.open('', '_blank');
  if (tab) tab.opener = null;
  void warm().then((w) => (tab ? tab.location.replace(url(w)) : window.open(url(w), '_blank', 'noopener')));
}

/** Writes the document as one of the three files and saves it; nothing while there is no document. */
export function save(doc: Doc | undefined, kind: FileKind, name: string, now: Date) {
  if (!doc) return;
  track('download', kind);
  withWriters((w) => download(w[kind](doc, now), name, TYPES[kind]));
}
