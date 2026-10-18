/** Form fields shared by the tool pages. A field keeps what is being typed to itself and hands it on only when it is left. */
import type { ComponentChildren } from 'preact';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { overdueNote, todayIso } from '../../engine/review';

// The shared parts' classes, in the tokens of docs/DESIGN.md. A field is 44 px tall and its edge 3:1 (WCAG 1.4.11); the
// focus ring comes from global.css.
export const INPUT = 'block min-h-11 w-full rounded-control border bg-field px-3 py-2 text-base text-ink placeholder:text-ink-muted focus:border-focus';
const BORDER = 'border-edge', BAD = 'border-bad';
const CHANGED = 'border-focus ring-2 ring-focus/40';
export const LABEL = 'block font-medium text-ink';
export const HINT = 'mt-1 text-sm text-ink-muted';
// In the new look (UX3) both are 44 px pills (F4): the main action in ink, the rest soft; never the accent's fill (F5).
export const BUTTON = 'rounded-control border border-accent bg-field px-3 py-1.5 text-sm font-medium text-link hover:bg-surface new:min-h-11 new:rounded-full new:border-0 new:bg-ink/6 new:px-4 new:text-ink new:hover:bg-ink/12';
/** The main action: the one accent fill on a screen, 44 px tall on a phone. */
export const FILLED = 'min-h-11 rounded-control border border-accent bg-accent px-3 py-1.5 text-sm font-medium text-on-accent hover:bg-accent-hover sm:min-h-0 new:rounded-full new:border-0 new:bg-ink new:px-5 new:text-canvas new:hover:bg-ink/85 new:sm:min-h-11';

/**
 * Text kept in a local draft while typing (a re-render from another field must not wipe it, lessons §4) and handed on
 * when the field is left or Enter is pressed. `tidy` rewrites it then, like 70 L → 70,00,000.
 */
export function useDraft(value: string, onCommit: (text: string) => void, tidy?: (text: string) => string) {
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  // Before the browser paints, so a value set from outside (a Use button) never shows the old text, even for a frame.
  useLayoutEffect(() => { if (document.activeElement !== ref.current) setDraft(value); }, [value]);
  const commit = () => {
    // Read the field itself: a change event can arrive before the draft has been re-rendered.
    const typed = ref.current?.value ?? draft, t = tidy ? tidy(typed) : typed;
    setDraft(t);
    if (t !== value) onCommit(t);
  };
  return {
    ref, value: draft,
    onInput: (e: Event) => setDraft((e.currentTarget as HTMLInputElement).value),
    onBlur: commit,
    // A month picker may hand over its value without the field being left.
    onChange: commit,
    onKeyDown: (e: KeyboardEvent) => { if (e.key === 'Enter') commit(); },
  };
}

interface TextProps {
  id: string;
  label: ComponentChildren;
  value: string;
  onCommit: (text: string) => void;
  tidy?: (text: string) => string;
  hint?: ComponentChildren;
  /** Shown under the field: a read-back or what is wrong. */
  said?: string;
  invalid?: boolean;
  type?: 'text' | 'month';
  inputMode?: 'decimal' | 'numeric' | 'text';
  placeholder?: string;
  class?: string;
}

export function TextField(p: TextProps) {
  const d = useDraft(p.value, p.onCommit, p.tidy);
  // A read-back saying the text was not understood marks the field wrong too, for screen readers and the error count (UD1).
  const bad = p.invalid || /^Not understood/.test(p.said ?? '');
  return <div class={p.class}>
    <label for={p.id} class={LABEL}>{p.label}</label>
    {p.hint && <p id={`${p.id}-hint`} class={HINT}>{p.hint}</p>}
    <input id={p.id} type={p.type ?? 'text'} inputMode={p.inputMode} autocomplete="off" spellcheck={false} enterkeyhint="done"
      placeholder={p.placeholder} aria-invalid={bad || undefined} aria-describedby={[p.hint && `${p.id}-hint`, p.said && `${p.id}-said`].filter(Boolean).join(' ') || undefined}
      {...d} class={`mt-1 ${INPUT} ${bad ? BAD : BORDER}`} />
    {/* The read-back, or the error beside its field in the error colour (GOV.UK Error message), tied to the field for a screen reader. */}
    {p.said && <p id={`${p.id}-said`} data-testid={`${p.id}-said`} aria-live="polite" class={`mt-1 text-sm break-words ${bad ? 'text-bad' : 'text-ink-muted'}`}>{p.said}</p>}
  </div>;
}

/** A figure in the yearly table: labelled by its year, named for screen readers by its row and year. `month`: a month, like 2028-03. */
/** A cell of a grid; `changed`, what the cell was before a plan wrote it, marks it until undone or kept. */
export function CellInput(p: { id: string; name: string; value: string; onCommit: (t: string) => void; tidy?: (t: string) => string; invalid?: boolean; decimal?: boolean; month?: boolean; changed?: string }) {
  const d = useDraft(p.value, p.onCommit, p.tidy);
  const wrong = p.month ? 'Not understood. Type 2028-03 or Mar 2028.' : 'Not understood. Type 1,50,000 or 1.5 L.';
  // The error shows under the cell and is tied to it, not left in a tooltip (WCAG 3.3.1; docs/DESIGN.md, Field; UX1).
  return <>
    <input id={p.id} type={p.month ? 'month' : 'text'} inputMode={p.decimal ? 'decimal' : undefined} autocomplete="off" spellcheck={false} enterkeyhint="next"
      aria-label={p.name} aria-invalid={p.invalid || undefined} aria-describedby={p.invalid ? `${p.id}-error` : undefined} placeholder={p.month ? 'like 2028-03' : undefined}
      title={p.invalid ? wrong : p.changed}
      data-changed={p.changed === undefined ? undefined : 'plan'}
      {...d} class={`${INPUT.replace('px-3', 'px-2')} ${p.invalid ? BAD : p.changed !== undefined ? CHANGED : BORDER} ${p.month ? '' : 'text-right tabular-nums'} min-w-28`} />
    {p.invalid && <p id={`${p.id}-error`} aria-live="polite" class="mt-1 text-sm text-bad">{wrong}</p>}
  </>;
}

/** A choice from a list, as a select; `placeholder` is the empty first option. */
export function SelectField(p: { id: string; label: ComponentChildren; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void; placeholder?: string; class?: string; invalid?: boolean }) {
  return <div class={p.class}>
    <label for={p.id} class={LABEL}>{p.label}</label>
    <select id={p.id} value={p.value} aria-invalid={p.invalid || undefined} onChange={(e) => p.onChange((e.currentTarget as HTMLSelectElement).value)}
      class={`mt-1 ${INPUT} ${p.invalid ? BAD : BORDER}`}>
      {p.placeholder !== undefined && <option value="">{p.placeholder}</option>}
      {p.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>;
}

export interface Option<T extends string> { value: T; label: string; hint?: ComponentChildren }

/** One choice from a few, as cards; `name` is the field id, each card fld-<name>-<value>. */
export function Choice<T extends string>(p: { name: string; legend: string; options: Option<T>[]; value?: T; onChange: (v: T) => void; columns?: boolean }) {
  return <fieldset id={p.name} class="mt-6 min-w-0">
    <legend class={LABEL}>{p.legend}</legend>
    <div class={`mt-2 grid gap-2 ${p.columns ? 'sm:grid-cols-2' : ''}`}>
      {p.options.map((o) => <label key={o.value} for={`${p.name}-${o.value}`}
        class="flex cursor-pointer items-start gap-3 rounded-card border border-edge bg-field p-3 has-checked:border-accent has-checked:bg-accent/10 new:border-0 new:bg-surface new:has-checked:bg-surface new:has-checked:outline-2 new:has-checked:outline-ink">
        <input type="radio" id={`${p.name}-${o.value}`} name={p.name} value={o.value} checked={p.value === o.value}
          onChange={() => p.onChange(o.value)} class="mt-1 size-4 shrink-0 accent-ink" />
        <span class="min-w-0">
          <span class="block text-ink">{o.label}</span>
          {o.hint && <span class="mt-0.5 block text-sm text-ink-muted">{o.hint}</span>}
        </span>
      </label>)}
    </div>
  </fieldset>;
}

/** The answer's rule (UX7, D-UX-104): ink, solid once the result is final, dashed while it is provisional, so its outline
 * tells the state before its words do; the colour never does (docs/DESIGN-MATHS.md §2). */
export const answerRule = (final: boolean) => `border-l-4 border-ink pl-3 ${final ? '' : 'border-dashed'}`;

/** The auditor's tick (UX7, D-UX-104): a drawn tick in ink, set before the pencil note that says a result is final. Only
 * a final result takes it; a provisional one says what it waits for instead. */
export const Tick = () => <svg aria-hidden="true" viewBox="0 0 20 16" class="mt-0.5 h-4 w-5 shrink-0 text-ink" fill="none" stroke="currentColor"
  stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9.6c1.5.9 2.9 2.3 4.1 3.9C8.8 8.7 12.9 4.1 18.4 1.6" /></svg>;

/** A verdict as a flat claim (UX7, after The Whole Truth's headings): the words before its first colon large, the facts
 * after it in body size under them; the text reads the same, colon and all, to a screen reader and a test. */
export function Claim({ text }: { text: string }) {
  const at = text.indexOf(': ');
  if (at < 0) return <>{text}</>;
  return <><span>{text.slice(0, at)}</span><span class="sr-only">:</span> <span class="mt-1 block font-display text-base font-normal first-letter:uppercase">{text.slice(at + 2)}</span></>;
}

/** Takes the focus to a box, so a link to a missing figure lands where it is typed: a field itself, or in a group of
 * them (a fieldset, a form's grid) the first one still empty. */
export const goTo = (id: string) => (e: Event) => {
  const el = document.getElementById(id), boxes = el?.matches('input, select, textarea') ? [] : [...(el?.querySelectorAll('input, select, textarea') ?? [])] as HTMLInputElement[];
  const to = boxes.length ? boxes.find((b) => b.type !== 'radio' && !b.value) ?? boxes[0] : el;
  if (!to) return;
  e.preventDefault();
  (to as HTMLElement).focus();
};

/** A figure not yet known (UX8, D-UX-106): "—", never 0, a link to the box that fills it when there is one. */
export function Dash({ to, what }: { to?: string; what: string }) {
  if (!to) return <span aria-label={`${what}: still needed`} class="text-ink-muted">—</span>;
  return <a href={`#${to}`} onClick={goTo(to)} aria-label={`${what}: still needed, to its box`}
    class="inline-flex min-h-6 min-w-6 items-center text-link underline-offset-4 hover:underline">—</a>;
}

/** Whether the last key was Tab (and no pointer since): only then does a lost focus come back to the counter. */
let tabbing = false;
if (typeof window !== 'undefined') {
  addEventListener('keydown', (e) => { tabbing = e.key === 'Tab'; }, true);
  addEventListener('pointerdown', () => { tabbing = false; }, true);
}

/**
 * The one count of what is still needed (UX8, review finding 2 and its tradeoff 5): the state as the summary, opening to
 * the list of links to each missing box; final or blocked, the state alone. `id` names the state for the tests and UD1;
 * `answer` marks it as the page's answer (the load measure's one) where no verdict stands above it.
 */
export function Counter(p: { id: string; result: 'blocked' | 'provisional' | 'ready'; text: string; rule?: boolean; answer?: boolean; class?: string; children?: ComponentChildren }) {
  const tone = p.result === 'blocked' ? 'text-bad' : p.result === 'provisional' ? 'text-warn' : 'text-ink';
  const state = <span data-testid={p.id} data-answer={p.answer || undefined} data-result={p.result} class={`${STATE} ${tone}`}>{p.result === 'ready' && <Tick />}{p.text}</span>;
  const box = `${p.class ?? ''} ${p.rule ? answerRule(p.result === 'ready') : ''}`;
  // The last answer, committed as Tab leaves its box, turns the list into the state alone and takes the summary away just
  // as Tab moves to it: the state takes the focus, so Tab goes on from there, not from the top (WCAG 2.4.3; UX8's critic).
  const summary = useRef<HTMLElement>(null), line = useRef<HTMLParagraphElement>(null), had = useRef(false);
  if (typeof document !== 'undefined') had.current = summary.current?.isConnected ?? false;
  useLayoutEffect(() => { if (had.current && !p.children && tabbing && document.activeElement === document.body) line.current?.focus(); });
  if (!p.children) return <p ref={line} tabIndex={-1} class={box}>{state}</p>;
  return <details class={`group ${box}`}>
    <summary ref={summary} class="flex min-h-11 cursor-pointer flex-wrap items-center gap-x-2 [&::-webkit-details-marker]:hidden">{state}
      <span class="text-sm text-link"><span class="group-open:hidden">Show which</span><span class="hidden group-open:inline">Hide</span></span></summary>
    <div class="pb-1">{p.children}</div>
  </details>;
}

/** A section with nothing in it yet folds to one line (UX8, review finding 9): its heading in body size and what it waits for. */
export function Folded(p: { id: string; title: string; children: ComponentChildren; class?: string }) {
  return <section id={p.id} data-folded aria-labelledby={`${p.id}-h`} class={`mt-10 flex flex-wrap items-baseline gap-x-2 border-t border-line pt-3 text-sm ${p.class ?? ''}`}>
    <h2 id={`${p.id}-h`} class="font-medium text-ink">{p.title}</h2><p class="text-ink-muted">{p.children}</p>
  </section>;
}

/** The answer bar (D-UX-84) under 1024 px, from load on every tool (UX8, review finding 13); from 1024 px the answer panel
 * stands beside the questions, so the bar keeps only its words for a screen reader, and its arrow goes. */
export const BAR = 'sticky bottom-0 z-10 -mx-4 mt-10 flex items-center gap-2 border-t border-line bg-canvas px-4 sm:-mx-8 sm:px-8 lg:sr-only';
export const BAR_ARROW = 'inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink hover:bg-surface lg:hidden';

/** The line under an answer that says its state: the tick and "Complete" in ink, or what is still needed in the warning's
 * words, or why there is none in the bad's; one colour a meaning, on text only. */
export const STATE = 'flex items-start gap-1.5 text-sm font-medium';

/** A source and date, behind an icon (lessons §1: no citations in the running text). */
export function SourceNote(p: { what: string; children: ComponentChildren; /** The data file's review-by date: once passed, said beside the summary (Q2, D-DATA-19). */ reviewBy?: string }) {
  const due = p.reviewBy ? overdueNote(p.reviewBy, todayIso()) : '';
  return <details class="mt-1 text-sm text-ink-muted">
    <summary class="inline-flex min-h-6 cursor-pointer items-center gap-1 text-link underline-offset-4 hover:underline">
      <span aria-hidden="true">ⓘ</span> {p.what}
    </summary>
    {due && <span data-testid="review-due" class="ml-2 text-warn">{due}</span>}
    <p class="mt-1">{p.children}</p>
  </details>;
}

/** The answer bar's arrow: it takes the focus to the results as well as the eye, so Tab goes on from there (UX5c). */
export function toAnswer(e: MouseEvent) {
  const t = document.getElementById((e.currentTarget as HTMLAnchorElement).hash.slice(1));
  if (!t) return;
  e.preventDefault();
  if (!t.hasAttribute('tabindex')) t.setAttribute('tabindex', '-1');
  t.focus();
}

export function Section(p: { id: string; title: string; children: ComponentChildren }) {
  // In the new look a section parts on the ledger rule and its heading takes the section size (F2).
  return <section id={p.id} aria-labelledby={`${p.id}-h`} class="mt-10 border-t border-line pt-6 new:mt-14 new:border-0 new:pt-0">
    <div data-ledger aria-hidden="true" class="hidden new:block new:mb-8" />
    <h2 id={`${p.id}-h`} class="text-lg font-semibold text-ink new:text-section new:font-medium">{p.title}</h2>
    {p.children}
  </section>;
}
