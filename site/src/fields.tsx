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
        class="flex cursor-pointer items-start gap-3 rounded-card border border-edge bg-field p-3 has-checked:border-accent has-checked:bg-accent/10 new:border-0 new:bg-surface new:has-checked:outline-2 new:has-checked:outline-accent">
        <input type="radio" id={`${p.name}-${o.value}`} name={p.name} value={o.value} checked={p.value === o.value}
          onChange={() => p.onChange(o.value)} class="mt-1 size-4 shrink-0 accent-accent" />
        <span class="min-w-0">
          <span class="block text-ink">{o.label}</span>
          {o.hint && <span class="mt-0.5 block text-sm text-ink-muted">{o.hint}</span>}
        </span>
      </label>)}
    </div>
  </fieldset>;
}

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

export function Section(p: { id: string; title: string; children: ComponentChildren }) {
  // In the new look a section parts on the ledger rule and its heading takes the section size (F2).
  return <section id={p.id} aria-labelledby={`${p.id}-h`} class="mt-10 border-t border-line pt-6 new:mt-14 new:border-0 new:pt-0">
    <div data-ledger aria-hidden="true" class="hidden new:block new:mb-8" />
    <h2 id={`${p.id}-h`} class="text-lg font-semibold text-ink new:text-section new:font-medium">{p.title}</h2>
    {p.children}
  </section>;
}
