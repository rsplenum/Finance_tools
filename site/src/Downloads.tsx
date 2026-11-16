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
/** Each file as a card (the report's check, Rahul's review of 16-11-2026, point 1): what it is, and who it is for. */
const CARDS: Record<FileKind | 'print', [string, string, string]> = {
  pdf: ['PDF', 'To hand to the lender', 'PDF'], xlsx: ['Excel', 'For your accountant: every table, to work on', 'XLS'],
  docx: ['Word', 'To edit the words before you send it', 'DOC'], print: ['Print', 'The PDF, opened to print', '⎙'],
};

export function Downloads({ pre, doc, name, quiet, cards }: { pre: string; doc: (today: string) => Doc | undefined; name: (kind: FileKind) => string;
  /** No filled button: the screen's one main action is elsewhere (the report when it misses a check, CHECK1). */
  quiet?: boolean;
  /** Each file a card with its use, the PDF first and marked as the one for the lender. */
  cards?: boolean }) {
  const id = (k: string) => (pre ? `${pre}-${k}` : k);
  useEffect(() => void warm(), []);
  const now = () => new Date(), take = (kind: FileKind | 'print') => () => {
    const d = now();
    if (kind === 'print') openPdf(doc(isoDate(d)), d); else save(doc(isoDate(d)), kind, name(kind), d);
  };
  if (cards) return <ul class="dl-cards mt-3">
    {([...KINDS.map(([k]) => k), 'print'] as const).map((kind) => {
      const [title, use, tag] = CARDS[kind], main = kind === 'pdf' && !quiet;
      return <li key={kind}><button type="button" data-testid={id(kind === 'print' ? 'print' : `download-${kind}`)} data-main={main || undefined}
        aria-label={kind === 'print' ? 'Print' : `Download ${title}: ${use}`} class="dl-card" onClick={take(kind)}>
        <span class="dl-tag" data-kind={kind} aria-hidden="true">{tag}</span>
        <span class="min-w-0 flex-1"><span class="dl-title">{kind === 'print' ? 'Print' : `Download ${title}`}</span><span class="dl-use">{use}</span></span>
        <span class="dl-arrow" aria-hidden="true">{kind === 'print' ? '→' : '↓'}</span>
      </button></li>;
    })}
  </ul>;
  return <div class="mt-3 flex flex-wrap gap-2">
    {KINDS.map(([kind, label]) => <button key={kind} type="button" data-testid={id(`download-${kind}`)} class={kind === 'pdf' && !quiet ? FILLED : BUTTON}
      onClick={() => { const now = new Date(); save(doc(isoDate(now)), kind, name(kind), now); }}>{label}</button>)}
    <button type="button" data-testid={id('print')} class={BUTTON} onClick={() => { const now = new Date(); openPdf(doc(isoDate(now)), now); }}>Print</button>
  </div>;
}
