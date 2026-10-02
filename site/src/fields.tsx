/** Form fields shared by the tool pages. A field keeps what is being typed to itself and hands it on only when it is left. */
import type { ComponentChildren } from 'preact';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';

export const INPUT = 'block w-full rounded-md border bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-500 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/30 focus:outline-none dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400';
const BORDER = 'border-slate-300 dark:border-slate-600', BAD = 'border-red-600 dark:border-red-400';
export const LABEL = 'block font-medium text-slate-900 dark:text-slate-100';
export const HINT = 'mt-1 text-sm text-slate-600 dark:text-slate-300';
export const BUTTON = 'rounded-md border border-teal-700 bg-white px-3 py-1.5 text-sm font-medium text-teal-800 hover:bg-teal-50 dark:border-teal-500 dark:bg-slate-900 dark:text-teal-300 dark:hover:bg-slate-800';

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
  return <div class={p.class}>
    <label for={p.id} class={LABEL}>{p.label}</label>
    {p.hint && <p id={`${p.id}-hint`} class={HINT}>{p.hint}</p>}
    <input id={p.id} type={p.type ?? 'text'} inputMode={p.inputMode} autocomplete="off" spellcheck={false} enterkeyhint="done"
      placeholder={p.placeholder} aria-invalid={p.invalid || undefined} aria-describedby={p.hint ? `${p.id}-hint` : undefined}
      {...d} class={`mt-1 ${INPUT} ${p.invalid ? BAD : BORDER}`} />
    {p.said && <p data-testid={`${p.id}-said`} aria-live="polite" class="mt-1 text-sm break-words text-slate-700 dark:text-slate-300">{p.said}</p>}
  </div>;
}

/** A figure in the yearly table: labelled by its year, named for screen readers by its row and year. `month`: a month, like 2028-03. */
export function CellInput(p: { id: string; name: string; value: string; onCommit: (t: string) => void; tidy?: (t: string) => string; invalid?: boolean; decimal?: boolean; month?: boolean }) {
  const d = useDraft(p.value, p.onCommit, p.tidy);
  return <input id={p.id} type={p.month ? 'month' : 'text'} inputMode={p.decimal ? 'decimal' : undefined} autocomplete="off" spellcheck={false} enterkeyhint="next"
    aria-label={p.name} aria-invalid={p.invalid || undefined} placeholder={p.month ? 'like 2028-03' : undefined}
    title={p.invalid ? (p.month ? 'Not understood: type 2028-03 or Mar 2028' : 'Not understood: type 1,50,000 or 1.5 L') : undefined}
    {...d} class={`${INPUT} ${p.invalid ? BAD : BORDER} px-2 ${p.month ? '' : 'text-right tabular-nums'} sm:min-w-28`} />;
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
        class="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-300 bg-white p-3 has-checked:border-teal-700 has-checked:bg-teal-50 dark:border-slate-700 dark:bg-slate-900 dark:has-checked:border-teal-500 dark:has-checked:bg-teal-950">
        <input type="radio" id={`${p.name}-${o.value}`} name={p.name} value={o.value} checked={p.value === o.value}
          onChange={() => p.onChange(o.value)} class="mt-1 size-4 shrink-0 accent-teal-700 dark:accent-teal-500" />
        <span class="min-w-0">
          <span class="block text-slate-900 dark:text-slate-100">{o.label}</span>
          {o.hint && <span class="mt-0.5 block text-sm text-slate-600 dark:text-slate-300">{o.hint}</span>}
        </span>
      </label>)}
    </div>
  </fieldset>;
}

/** A source and date, behind an icon (lessons §1: no citations in the running text). */
export function SourceNote(p: { what: string; children: ComponentChildren }) {
  return <details class="mt-1 text-sm text-slate-600 dark:text-slate-300">
    <summary class="inline-flex cursor-pointer items-center gap-1 text-teal-800 underline-offset-4 hover:underline dark:text-teal-300">
      <span aria-hidden="true">ⓘ</span> {p.what}
    </summary>
    <p class="mt-1">{p.children}</p>
  </details>;
}

export function Section(p: { id: string; title: string; children: ComponentChildren }) {
  return <section id={p.id} aria-labelledby={`${p.id}-h`} class="mt-10 border-t border-slate-200 pt-6 dark:border-slate-800">
    <h2 id={`${p.id}-h`} class="text-lg font-semibold text-slate-900 dark:text-slate-100">{p.title}</h2>
    {p.children}
  </section>;
}
