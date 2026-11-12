/**
 * One fact alone (docs/WORKED-PAGE.md §4 part 5): a sheet along the bottom of the screen, not a dialog that hides the
 * page, so the reading and the picture stay in view above it and move as the figure is typed (cause and effect
 * together). A large field, a slider where the fact has a range, one plain hint. While a fact is the example's the field
 * is empty with the example as its placeholder, and "Keep …: it is mine" takes the example's figure as the borrower's.
 * The figure is handed on as soon as it is understood (`onLive`); what is not understood is said under the field and
 * never taken. Escape or Close puts the focus back on the figure that opened it.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { MAIN, QUIET } from './parts';

export interface SheetFact {
  id: string; label: string; hint: string;
  /** The field's text: the borrower's figure, or empty while it is the example's. */
  value: string;
  /** The example's figure as the sentence reads it (Rs. 6 lakh), on the keep button; absent once it is theirs. */
  example?: string;
  /** In the empty field while the fact is the example's: "Example: 6,00,000". */
  placeholder?: string;
  unit?: string; inputMode?: 'decimal' | 'numeric';
  range?: { min: number; max: number; step: number };
  /** A fact chosen, not typed (who the borrower is). */
  choices?: { value: string; label: string }[];
}
export interface SheetWords { next: string; skip: string; done: string; close: string; keep: (v: string) => string; step: (i: number, n: number) => string }

export function FactSheet(p: {
  fact: SheetFact; words: SheetWords;
  problem: (t: string) => string | undefined;
  /** Every change as typed: the page writes it when it is understood, and puts the example back when the field is emptied. */
  onLive: (t: string) => void;
  onKeep: () => void;
  /** The walk through the facts (Use your own figures): Next and Skip for now, with where it stands. */
  walk?: { at: number; of: number; onNext: () => void; onSkip: () => void };
  onClose: () => void;
}) {
  const f = p.fact, [text, setText] = useState(f.value), [said, setSaid] = useState<string>();
  const input = useRef<HTMLInputElement>(null), first = useRef<HTMLButtonElement>(null), opener = useRef<Element | null>(null), away = useRef(false);
  // A new fact starts from its own figure; the focus goes into the sheet and comes back to the figure when it closes.
  useLayoutEffect(() => { setText(f.value); setSaid(undefined); }, [f.id]);
  useEffect(() => {
    if (!opener.current) opener.current = document.activeElement;
    (input.current ?? first.current)?.focus({ preventScroll: true });
  }, [f.id]);
  useEffect(() => () => { const o = opener.current; if (!away.current && o instanceof HTMLElement && o.isConnected) o.focus({ preventScroll: true }); }, []);
  // The focus moved on to the page (Tab, or a tap on another control): the sheet closes and the focus stays where it went,
  // so nothing focused sits hidden under the sheet (WCAG 2.4.11). A tap on plain text or a switch of app keeps it open.
  const out = (e: FocusEvent) => {
    const to = e.relatedTarget;
    if (to instanceof Element && !(e.currentTarget as Element).contains(to)) { away.current = true; p.onClose(); }
  };
  const change = (t: string) => { setText(t); const bad = t.trim() ? p.problem(t) : undefined; setSaid(bad); if (!bad) p.onLive(t); };
  // Next and Done take the figure if it is understood; an empty field leaves the example standing.
  const go = (then: () => void) => {
    const bad = text.trim() ? p.problem(text) : undefined;
    if (bad) { setSaid(bad); input.current?.focus(); return; }
    then();
  };
  const n = Number(text.replace(/,/g, '')), slider = f.range && Number.isFinite(n) ? Math.min(f.range.max, Math.max(f.range.min, n)) : f.range?.min;
  const fieldId = `sheet-${f.id}`, hintId = `${fieldId}-hint`;
  return <div role="dialog" aria-modal="false" aria-labelledby={`${fieldId}-label`} data-testid="sheet"
    onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); p.onClose(); } }} onFocusOut={out}
    class="fixed inset-x-0 bottom-0 z-30 max-h-[62svh] overflow-y-auto rounded-t-panel border-t border-line bg-canvas px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-12px_40px_-12px_oklch(0.2_0.03_270/0.35)] sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[26rem] sm:rounded-panel sm:border">
    <div class="flex items-start justify-between gap-3">
      <div>
        {p.walk && <p data-testid="sheet-step" class="text-sm text-ink-muted">{p.words.step(p.walk.at, p.walk.of)}</p>}
        <label id={`${fieldId}-label`} for={f.choices ? undefined : fieldId} class="block text-base font-semibold text-ink">{f.label}</label>
      </div>
      <button type="button" data-testid="sheet-close" aria-label={p.words.close} onClick={p.onClose}
        class="-mt-1 -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink hover:bg-ink/6">
        <svg aria-hidden="true" viewBox="0 0 16 16" class="size-4" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M4 4l8 8M12 4l-8 8" /></svg>
      </button>
    </div>
    {f.choices
      ? <div role="radiogroup" aria-labelledby={`${fieldId}-label`} aria-describedby={hintId} class="mt-3 grid gap-2">
        {f.choices.map((c, i) => <button key={c.value} ref={i === 0 ? first : undefined} type="button" role="radio" aria-checked={f.value === c.value}
          data-testid={`sheet-choice-${c.value}`} onClick={() => { setText(c.value); p.onLive(c.value); }}
          class={`min-h-12 rounded-control border px-4 text-left text-base ${f.value === c.value ? 'border-ink bg-ink text-canvas font-semibold' : 'border-edge bg-field text-ink hover:bg-ink/6'}`}>{c.label}</button>)}
      </div>
      : <div class="mt-3">
        <div class="relative">
          {f.unit === 'Rs.' && <span aria-hidden="true" class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xl text-ink-muted">Rs.</span>}
          <input ref={input} id={fieldId} data-testid="sheet-field" type="text" inputMode={f.inputMode ?? 'decimal'} autoComplete="off" enterKeyHint={p.walk ? 'next' : 'done'}
            value={text} placeholder={f.placeholder} aria-describedby={hintId} aria-invalid={!!said}
            onInput={(e) => change((e.currentTarget as HTMLInputElement).value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); go(p.walk ? p.walk.onNext : p.onClose); } }}
            class={`min-h-14 w-full min-w-0 rounded-control border border-edge bg-field text-2xl font-semibold text-ink tabular-nums outline-none placeholder:font-normal placeholder:text-ink-muted/80 focus:border-focus focus:ring-2 focus:ring-focus ${f.unit === 'Rs.' ? 'pl-12' : 'pl-3'} ${f.unit && f.unit !== 'Rs.' ? 'pr-20' : 'pr-3'}`} />
          {f.unit && f.unit !== 'Rs.' && <span aria-hidden="true" class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xl text-ink-muted">{f.unit}</span>}
        </div>
        {f.range && <input type="range" data-testid="sheet-slider" aria-label={f.label} min={f.range.min} max={f.range.max} step={f.range.step} value={slider}
          onInput={(e) => change((e.currentTarget as HTMLInputElement).value)} class="mt-3 h-11 w-full cursor-pointer accent-[var(--ink)]" />}
      </div>}
    <p id={hintId} data-testid="sheet-said" aria-live="polite" class={`mt-2 text-sm ${said ? 'font-medium text-bad' : 'text-ink-muted'}`}>{said ?? f.hint}</p>
    {f.example && !f.choices && <button type="button" data-testid="sheet-keep" class={`${QUIET} -ml-3 mt-1`} onClick={p.onKeep}>{p.words.keep(f.example)}</button>}
    <div class="mt-3 flex flex-wrap items-center gap-2">
      {p.walk
        ? <><button type="button" data-testid="sheet-next" class={MAIN} onClick={() => go(p.walk!.onNext)}>{p.words.next}</button>
          <button type="button" data-testid="sheet-skip" class={QUIET} onClick={p.walk.onSkip}>{p.words.skip}</button></>
        : <button type="button" data-testid="sheet-done" class={MAIN} onClick={() => go(p.onClose)}>{p.words.done}</button>}
    </div>
  </div>;
}
