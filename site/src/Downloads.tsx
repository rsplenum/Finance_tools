/**
 * The four ways to take a tool's document, the same on all four tools (UXR5b, UXR1's P10): a PDF, an Excel copy, a Word
 * copy and Print, the same PDF opened to print (download.ts). The writers load when the buttons show, so each file is
 * made in the tap itself and phones allow the download.
 */
import type { Doc } from './doc/doc';
import { useEffect } from 'preact/hooks';
import { isoDate, openPdf, save, warm, type FileKind } from './download';
import { BUTTON, FILLED } from './fields';

const KINDS: [FileKind, string][] = [['pdf', 'Download PDF'], ['xlsx', 'Download Excel'], ['docx', 'Download Word']];

/** `doc` makes the document for today's date; `name`, its file's name. `pre` starts the test ids (none on the DSCR). */
export function Downloads({ pre, doc, name }: { pre: string; doc: (today: string) => Doc | undefined; name: (kind: FileKind) => string }) {
  const id = (k: string) => (pre ? `${pre}-${k}` : k);
  useEffect(() => void warm(), []);
  return <div class="mt-3 flex flex-wrap gap-2">
    {KINDS.map(([kind, label]) => <button key={kind} type="button" data-testid={id(`download-${kind}`)} class={kind === 'pdf' ? FILLED : BUTTON}
      onClick={() => { const now = new Date(); save(doc(isoDate(now)), kind, name(kind), now); }}>{label}</button>)}
    <button type="button" data-testid={id('print')} class={BUTTON} onClick={() => { const now = new Date(); openPdf(doc(isoDate(now)), now); }}>Print</button>
  </div>;
}
