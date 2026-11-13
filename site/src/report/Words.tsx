/**
 * The report's words (REP2, D-AI-01, D-AI-02): one closed fold under the document's fields. Three notes the user may type
 * (the promoter, the process, the market); AI drafts six short sections from them and the page's own answers (words.ts),
 * never a figure; the check drops a sentence with a figure or a claim a new business cannot have and says so. A note left
 * empty is drafted from the other answers (WORDS1), and what only the borrower knows comes as a blank, shown in its
 * sentence as a box to fill in; the tick waits until none is open. The borrower changes what is not right and ticks the
 * words as true, and only then do they go in the document. Off, or the day's drafts used up, the boxes stay open to write in.
 */
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { NARRATIVE, NOTES, SECTIONS, fillBlank, piecesOf, type Draft, type NarrativeInput, type SectionId } from '../../../engine/narrative';
import { BUTTON, HINT, INPUT, LABEL } from '../fields';
import type { ReportState, ReportWords } from './model';
import { drafted, narrativeOf, openBlanks, wordsNeeds, wordsOf, wordsTrue } from './words';

type Update = (f: (s: ReportState) => ReportState) => void;
const API = `${(import.meta.env.PUBLIC_API_URL ?? '').replace(/\/+$/, '')}/api/draft`;
const BLANK = Object.fromEntries(SECTIONS.map((x) => [x.id, ''])) as Draft;

async function ask(sent: NarrativeInput): Promise<{ draft: unknown } | string> {
  try {
    const r = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(sent) });
    const body = await r.json().catch(() => ({})) as { draft?: unknown; error?: string };
    if (r.ok && body.draft) return { draft: body.draft };
    // No Worker behind the site yet: the page itself answers 404 or 405.
    return body.error ?? (r.status === 404 || r.status === 405 ? 'Drafting the words is not switched on yet: write them yourself.' : 'The words could not be drafted just now: write them yourself, or try again.');
  } catch { return 'The drafting could not be reached: write the words yourself, or try again.'; }
}

/** A box of several lines that keeps what is typed to itself and hands it on when left (as fields.tsx's useDraft). */
function Area(p: { id: string; label: string; hint?: string; value: string; max: number; rows: number; onCommit: (t: string) => void }) {
  const [text, setText] = useState(p.value);
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => { if (document.activeElement !== ref.current) setText(p.value); }, [p.value]);
  return <div class="mt-4">
    <label for={p.id} class={LABEL}>{p.label}</label>
    {p.hint && <p id={`${p.id}-hint`} class={HINT}>{p.hint}</p>}
    <textarea ref={ref} id={p.id} rows={p.rows} maxLength={p.max} value={text} aria-describedby={p.hint ? `${p.id}-hint` : undefined}
      onInput={(e) => setText((e.currentTarget as HTMLTextAreaElement).value)}
      onBlur={() => { const t = ref.current?.value ?? text; if (t !== p.value) p.onCommit(t); }}
      class={`${INPUT} mt-1 border-edge`} />
  </div>;
}

const FROM = 'Drafted from your other answers, as you left its note empty.';

/**
 * A section with blanks open: its sentences as they read, each blank a box in its place, labelled by what it asks for.
 * A blank filled joins the words when left; once none is open the section is a box of words again. Each box is keyed by
 * what it asks and the blanks after it, so filling them in order keeps the next one where the finger is.
 */
function Fill(p: { id: SectionId; label: string; from: boolean; text: string; onCommit: (t: string) => void }) {
  const [edit, setEdit] = useState(false);
  const pieces = piecesOf(p.text), total = pieces.filter((x) => 'blank' in x).length;
  if (edit || !total) return <Area id={`fld-rep-words-${p.id}`} label={p.label} hint={p.from ? FROM : undefined} rows={4} max={NARRATIVE.maxSection}
    value={p.text} onCommit={p.onCommit} />;
  return <div class="mt-4" data-testid={`rep-words-fill-${p.id}`}>
    <p id={`rep-words-${p.id}-label`} class={LABEL}>{p.label}</p>
    {p.from && <p class={HINT}>{FROM}</p>}
    <p class="mt-2 leading-relaxed text-ink">{pieces.map((x) => ('blank' in x
      ? <input key={`${x.blank}|${total - x.k}`} type="text" id={`fld-rep-blank-${p.id}-${x.k}`} data-testid="rep-words-blank"
          aria-label={x.blank} aria-describedby={`rep-words-${p.id}-label`} placeholder={x.blank} size={Math.max(x.blank.length + 1, 8)} maxLength={200}
          class="m-0.5 inline-block min-h-11 max-w-full rounded-control border-0 border-b-2 border-dashed border-accent bg-surface px-2 py-1 align-baseline text-base text-ink placeholder:text-ink-muted focus:border-solid focus:border-focus"
          onChange={(e) => { const t = (e.currentTarget as HTMLInputElement).value.trim(); if (t) p.onCommit(fillBlank(p.text, x.k, t)); }}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur(); }} />
      : x.text))}</p>
    <button type="button" class="mt-1 min-h-11 text-sm font-medium text-link underline underline-offset-4" onClick={() => setEdit(true)}>Change the words</button>
  </div>;
}

export function Words({ s, update }: { s: ReportState; update: Update }) {
  const w = wordsOf(s), set = (f: (w: ReportWords) => ReportWords) => update((x) => ({ ...x, words: f(wordsOf(x)) }));
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const can = !!s.doc.name.trim() && !!s.doc.activity.trim(), need = wordsNeeds(w)[0];
  const go = async () => {
    const sent = narrativeOf(s);
    setBusy(true); setError('');
    const r = await ask(sent);
    setBusy(false);
    if (typeof r === 'string') { setError(r); set((x) => (x.draft ? x : { ...x, draft: BLANK, ai: false })); }
    else set((x) => drafted(x, r.draft, sent));
  };
  const dropped = w.dropped ?? [], open = openBlanks(w);
  return <details data-testid="rep-words" class="mt-6 border-t border-line pt-3">
    <summary class="flex min-h-11 cursor-pointer flex-wrap items-center gap-x-2 font-medium text-ink">The report’s words
      <span data-testid="rep-words-state" class="text-sm font-normal text-ink-muted">{wordsTrue(w) && !need ? 'ticked as true: in the document' : need ? 'not yet in the document' : 'optional'}</span></summary>
    <p class={HINT}>An introduction, the products, the process, the market, the promoter and a conclusion, in simple words. AI drafts them from your answers and any notes you add, without a figure, and leaves a blank for what only you know. You fill the blanks, change what is wrong and tick that they are true. What you type goes to an AI, Google’s or Anthropic’s, to draft, and we do not keep it.</p>
    {NOTES.map((n) => <Area key={n.id} id={`fld-rep-note-${n.id}`} label={`${n.label}, if you like`} hint={n.hint} rows={3} max={NARRATIVE.maxNote}
      value={w.notes[n.id]} onCommit={(t) => set((x) => ({ ...x, notes: { ...x.notes, [n.id]: t } }))} />)}
    <div class="mt-4 flex flex-wrap items-center gap-2">
      <button type="button" data-testid="rep-words-draft" class={BUTTON} disabled={!can || busy} onClick={go}>
        {busy ? 'Drafting…' : w.ai ? 'Draft again' : 'Draft the words'}</button>
      {!can && <span class="text-sm text-ink-muted">Type the business’s name and what it does above first.</span>}
    </div>
    {error && <p data-testid="rep-words-error" role="status" class="mt-2 text-sm text-warn">{error}</p>}
    {w.draft && <>
      <p data-testid="rep-words-by" class="mt-4 text-sm font-medium text-ink">{w.ai ? 'Draft by AI from your answers: read every line and change what is not right.' : 'Your own words: a box left empty stays out.'}</p>
      {dropped.length > 0 && <div data-testid="rep-words-dropped" class="mt-2 text-sm text-ink-muted">
        <p>{dropped.length === 1 ? '1 sentence was' : `${dropped.length} sentences were`} left out:</p>
        <ul class="mt-1 list-disc space-y-0.5 pl-5">{dropped.map((d, k) => <li key={k}>“{d.sentence}”: {d.why}.</li>)}</ul>
      </div>}
      {SECTIONS.map((x) => <Fill key={`${x.id}-${w.ai ? 'ai' : 'own'}`} id={x.id} label={x.label} from={!!w.ai && !!w.fromAnswers?.includes(x.id)}
        text={w.draft?.[x.id] ?? ''} onCommit={(t) => set((y) => ({ ...y, draft: { ...(y.draft ?? BLANK), [x.id as SectionId]: t } }))} />)}
      {open > 0 && <p data-testid="rep-words-open" class="mt-4 text-sm text-ink-muted">{open === 1 ? 'Fill in the blank above first.' : `Fill in the ${open} blanks above first.`}</p>}
      <label class={`mt-4 flex items-start gap-2 ${open ? 'text-ink-muted' : 'text-ink'}`}>
        <input id="fld-rep-words-true" data-testid="rep-words-true" type="checkbox" class="mt-1" checked={wordsTrue(w)} disabled={open > 0}
          onChange={(e) => { const v = (e.currentTarget as HTMLInputElement).checked; set((x) => ({ ...x, confirmed: v })); }} />
        <span>I have read these words and they are true</span>
      </label>
    </>}
  </details>;
}
