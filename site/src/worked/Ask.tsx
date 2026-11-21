/**
 * One question a screen (NEW1b, Rahul's review of 12-11-2026: "one has to constantly adjust the scrolling to see what
 * input one is entering after the keyboard appears"). The question covers the whole screen, as an app's step does, with
 * nothing above it (the site's bar would push it down), so the box and Next stand in the top third, where a phone's
 * keyboard never reaches and nothing has to scroll: the step, the question, one plain hint, a large box (or the choices),
 * what the figure reads as, and Next straight under the box. Enter is Next, Escape is Back. The box is the same element
 * from step to step and Next does not take the focus, so the keyboard stays up through the questions. Each tool hands in
 * its questions, its checks and its read-back; nothing is worked out here.
 */
import type { ComponentChildren } from 'preact';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { MAIN, QUIET } from './parts';

export interface AskQuestion {
  id: string; question: string; hint: string;
  /** The answer so far, in the box. */
  value: string;
  unit?: string; inputMode?: 'decimal' | 'numeric' | 'text';
  /** A fact chosen, not typed (who the borrower is). */
  choices?: { value: string; label: string }[];
  /** A fact that may be nil: a None button, and an empty box is none. */
  none?: boolean;
}
/**
 * A figure that may be typed in its parts instead (the DSCR's profit: net profit, interest, depreciation, tax). The tool
 * adds them with its engine; a link swaps the one box for the parts and back.
 */
export interface AskParts {
  open: string; close: string; items: readonly string[];
  /** Under a part, when it needs a word (a loss with a minus). */
  under?: readonly (string | undefined)[];
  /** The total's label, and the tool's sum: the total in the box's words (`text`), as shown (`total`), or what is wrong. */
  totalLabel: string;
  sum: (parts: string[]) => { text?: string; total?: string; problem?: string; at?: number };
}
export interface AskWords { next: string; done: string; last: string; back: string; none: string; step: (i: number, n: number) => string; reads: (t: string) => string }

export function Ask(p: {
  q: AskQuestion; at: number; of: number; words: AskWords;
  /** Editing one answer from the report: Done goes back to it. */
  single?: boolean;
  problem: (t: string) => string | undefined;
  /** What a figure typed reads as (₹6 lakh), from the tool's engine; undefined when it says nothing new. */
  reads: (t: string) => string | undefined;
  /** The figure in its parts, when the question offers them. */
  parts?: AskParts;
  /** Help in the room under Next: the tool's own words and pictures for this question. */
  help?: ComponentChildren;
  onAnswer: (t: string, parts?: string[]) => void;
  onBack: () => void;
}) {
  const q = p.q, [text, setText] = useState(q.value), [said, setSaid] = useState<string>();
  const [split, setSplit] = useState(false), [vals, setVals] = useState<string[]>([]);
  const top = useRef<HTMLElement>(null), box = useRef<HTMLInputElement>(null), first = useRef<HTMLButtonElement>(null);
  const partBoxes = useRef<(HTMLInputElement | null)[]>([]);
  useLayoutEffect(() => { setText(q.value); setSaid(undefined); setSplit(false); setVals([]); }, [q.id]);
  // While the questions show, the rest of the page is put away, not just covered: nothing behind them scrolls, takes a
  // Tab or is read aloud. Each element beside the questions' own line of parents is hidden, and shown again after.
  useLayoutEffect(() => {
    const put: [HTMLElement, string][] = [];
    for (let at = top.current; at && at !== document.body; at = at.parentElement) {
      for (const el of at.parentElement?.children ?? []) {
        if (el === at || !(el instanceof HTMLElement) || /^(SCRIPT|STYLE|TEMPLATE)$/.test(el.tagName)) continue;
        put.push([el, el.style.display]); el.style.display = 'none'; el.inert = true;
      }
    }
    return () => put.forEach(([el, d]) => { el.style.display = d; el.inert = false; });
  }, []);
  // Each question from its top, the focus in its box as it appears (not a frame later).
  useLayoutEffect(() => {
    top.current?.scrollTo({ top: 0 });
    (box.current ?? first.current)?.focus({ preventScroll: true });
  }, [q.id]);
  const go = (t: string) => {
    const bad = p.problem(t);
    if (bad) { setSaid(bad); box.current?.focus({ preventScroll: true }); return; }
    // The box stays and keeps the focus, so it never fires its own change: an answer given counts as one (UD1's steps).
    if (box.current && t !== q.value) box.current.dispatchEvent(new Event('change', { bubbles: true }));
    p.onAnswer(t);
  };
  // The parts, added by the tool: the first wrong one takes the focus; else the total is the answer.
  const goParts = () => {
    const r = p.parts!.sum(vals);
    if (r.problem || r.text === undefined) { setSaid(r.problem); partBoxes.current[r.at ?? 0]?.focus({ preventScroll: true }); return; }
    p.onAnswer(r.text, vals);
  };
  const swap = (on: boolean) => {
    setSplit(on); setSaid(undefined);
    requestAnimationFrame(() => (on ? partBoxes.current[0] : box.current)?.focus({ preventScroll: true }));
  };
  // A tap on Next or None keeps the focus in a box, so a phone's keyboard does not drop and rise between questions.
  const keep = (e: MouseEvent) => { if (document.activeElement instanceof HTMLInputElement && top.current?.contains(document.activeElement)) e.preventDefault(); };
  const sum = split && p.parts ? p.parts.sum(vals) : undefined;
  const id = `ask-${q.id}`, hintId = `${id}-hint`, read = !said && text.trim() ? p.reads(text) : undefined;
  const label = p.single ? p.words.done : p.at === p.of ? p.words.last : p.words.next;
  return <section ref={top} data-testid="ask" data-step={q.id} role="dialog" aria-modal="true" aria-labelledby="ask-q"
    onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); p.onBack(); } }}
    class="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-canvas">
    <div class="mx-auto max-w-xl px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-10 sm:pt-12">
    <div class="flex min-h-11 items-center justify-between gap-3">
      <button type="button" data-testid="ask-back" class="-ml-3 inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-base font-medium text-link hover:bg-ink/6" onClick={p.onBack}>
        <svg aria-hidden="true" viewBox="0 0 16 16" class="size-4" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M10 3L5 8l5 5" /></svg>{p.words.back}</button>
      {!p.single && <p data-testid="ask-step" class="text-sm text-ink-muted tabular-nums">{p.words.step(p.at, p.of)}</p>}
    </div>
    {!p.single && <div aria-hidden="true" class="mt-1 flex gap-1">{Array.from({ length: p.of }, (_, i) =>
      <span key={i} class={`h-1 flex-1 rounded-full ${i < p.at ? 'bg-ink' : 'bg-ink/12'}`} />)}</div>}
    <h1 id="ask-q" class="mt-4 font-display text-[1.5rem] leading-[1.2] font-semibold text-ink text-balance sm:text-[2rem]">
      {q.choices ? q.question : <label for={id}>{q.question}</label>}</h1>
    <p id={hintId} class="mt-1.5 text-base text-ink-muted">{q.hint}</p>
    {q.choices
      ? <div role="radiogroup" aria-labelledby="ask-q" aria-describedby={hintId} class="mt-4 grid gap-2">
        {q.choices.map((c, i) => <button key={c.value} ref={i === 0 ? first : undefined} type="button" role="radio" aria-checked={text === c.value}
          data-testid={`ask-choice-${c.value}`} onClick={() => { setText(c.value); go(c.value); }}
          class={`min-h-14 rounded-control border px-4 text-left text-lg ${text === c.value ? 'border-ink bg-ink font-semibold text-canvas' : 'border-edge bg-field text-ink hover:bg-ink/6'}`}>{c.label}</button>)}
      </div>
      : split && p.parts ? <div role="group" aria-labelledby="ask-q" data-testid="ask-parts" class="mt-4 overflow-hidden rounded-control border border-edge bg-field">
        {p.parts.items.map((label, i) => <div key={label} class="border-b border-line px-4 py-2">
          <div class="flex min-h-11 items-center gap-3">
            <label for={`${id}-part-${i}`} class="flex-1 text-base text-ink"><span aria-hidden="true" class="inline-block w-4 text-ink-muted">{i ? '+' : ''}</span>{label}</label>
            <span aria-hidden="true" class="text-lg text-ink-muted">₹</span>
            <input ref={(el) => { partBoxes.current[i] = el; }} id={`${id}-part-${i}`} data-testid={`ask-part-${i}`} type="text" inputMode="decimal" autoComplete="off"
              enterKeyHint={i < p.parts!.items.length - 1 ? 'next' : 'done'} value={vals[i] ?? ''} aria-describedby={p.parts!.under?.[i] ? `${id}-under-${i}` : undefined}
              onInput={(e) => { const v = [...vals]; v[i] = (e.currentTarget as HTMLInputElement).value; setVals(v); setSaid(undefined); }}
              onKeyDown={(e) => { if (e.key !== 'Enter') return; e.preventDefault(); if (i < p.parts!.items.length - 1) partBoxes.current[i + 1]?.focus({ preventScroll: true }); else goParts(); }}
              class="min-h-11 w-36 min-w-0 rounded-control border border-edge bg-canvas px-3 text-right text-xl font-semibold text-ink tabular-nums outline-none focus:border-focus focus:ring-2 focus:ring-focus sm:w-44" />
          </div>
          {p.parts!.under?.[i] && <p id={`${id}-under-${i}`} class="pl-4 text-sm text-ink-muted">{p.parts!.under[i]}</p>}
        </div>)}
        <div class="flex min-h-14 items-center gap-3 bg-ink/6 px-4">
          <p class="flex-1 text-base font-semibold text-ink"><span aria-hidden="true" class="inline-block w-4">=</span>{p.parts.totalLabel}</p>
          <output data-testid="ask-parts-total" aria-live="polite" class="text-xl font-semibold text-ink tabular-nums">{sum?.total ?? '—'}</output>
        </div>
      </div>
      : <div class="relative mt-4">
        {q.unit === '₹' && <span aria-hidden="true" class="pointer-events-none absolute inset-y-0 left-4 flex items-center text-2xl text-ink-muted">₹</span>}
        <input ref={box} id={id} data-testid="ask-field" type="text" inputMode={q.inputMode ?? 'decimal'} autoComplete="off" enterKeyHint={p.single || p.at === p.of ? 'done' : 'next'}
          value={text} aria-describedby={`${hintId} ask-said`} aria-invalid={!!said}
          onInput={(e) => { setText((e.currentTarget as HTMLInputElement).value); setSaid(undefined); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); go(text); } }}
          class={`min-h-16 w-full min-w-0 rounded-control border border-edge bg-field text-[1.75rem] font-semibold text-ink tabular-nums outline-none focus:border-focus focus:ring-2 focus:ring-focus ${q.unit === '₹' ? 'pl-16' : 'pl-4'} ${q.unit && q.unit !== '₹' ? 'pr-24' : 'pr-4'}`} />
        {q.unit && q.unit !== '₹' && <span aria-hidden="true" class="pointer-events-none absolute inset-y-0 right-4 flex items-center text-2xl text-ink-muted">{q.unit}</span>}
      </div>}
    <p id="ask-said" data-testid="ask-said" aria-live="polite" class={`mt-1.5 min-h-6 text-base ${said ? 'font-medium text-bad' : 'text-ink-muted'}`}>{said ?? (read && !split ? p.words.reads(read) : '')}</p>
    {!q.choices && <div class="mt-2 flex flex-wrap items-center gap-3">
      <button type="button" data-testid="ask-next" class={MAIN} onMouseDown={keep} onClick={() => (split ? goParts() : go(text))}>{label}</button>
      {q.none && !split && <button type="button" data-testid="ask-none" class={QUIET} onMouseDown={keep} onClick={() => { setText(''); go(''); }}>{p.words.none}</button>}
      {p.parts && <button type="button" data-testid="ask-split" aria-expanded={split} class={QUIET} onClick={() => swap(!split)}>{split ? p.parts.close : p.parts.open}</button>}
    </div>}
    {p.help && <div data-testid="ask-help" class="mt-10">{p.help}</div>}
    </div>
  </section>;
}
