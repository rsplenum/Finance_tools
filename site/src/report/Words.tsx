/**
 * The report's words (REP2, D-AI-01, D-AI-02): one closed fold under the document's fields. Three notes the user may type
 * (the promoter, the process, the market); AI drafts six short sections from them and the page's own answers (words.ts),
 * never a figure; the check drops a sentence with a figure or a claim a new business cannot have and says so; the
 * borrower changes what is not right and ticks the words as true, and only then do they go in the document. Off, or the
 * day's drafts used up, the boxes stay open to write in.
 */
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { NARRATIVE, NOTES, SECTIONS, type Draft, type NarrativeInput, type SectionId } from '../../../engine/narrative';
import { BUTTON, HINT, INPUT, LABEL } from '../fields';
import type { ReportState, ReportWords } from './model';
import { drafted, narrativeOf, wordsNeeds, wordsOf } from './words';

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
  const dropped = w.dropped ?? [];
  return <details data-testid="rep-words" class="mt-6 border-t border-line pt-3">
    <summary class="flex min-h-11 cursor-pointer flex-wrap items-center gap-x-2 font-medium text-ink">The report’s words
      <span data-testid="rep-words-state" class="text-sm font-normal text-ink-muted">{w.confirmed && !need ? 'ticked as true: in the document' : need ? 'not yet in the document' : 'optional'}</span></summary>
    <p class={HINT}>An introduction, the products, the process, the market, the promoter and a conclusion, in simple words. AI drafts them from your answers and these notes, without a figure; you change what is wrong and tick that they are true. What you type goes to Anthropic’s AI to draft and is not kept.</p>
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
      {SECTIONS.map((x) => <Area key={`${x.id}-${w.ai ? 'ai' : 'own'}`} id={`fld-rep-words-${x.id}`} label={x.label} rows={4} max={NARRATIVE.maxSection}
        value={w.draft?.[x.id] ?? ''} onCommit={(t) => set((y) => ({ ...y, draft: { ...(y.draft ?? BLANK), [x.id as SectionId]: t } }))} />)}
      <label class="mt-4 flex items-start gap-2 text-ink">
        <input id="fld-rep-words-true" data-testid="rep-words-true" type="checkbox" class="mt-1" checked={!!w.confirmed}
          onChange={(e) => { const v = (e.currentTarget as HTMLInputElement).checked; set((x) => ({ ...x, confirmed: v })); }} />
        <span>I have read these words and they are true</span>
      </label>
    </>}
  </details>;
}
