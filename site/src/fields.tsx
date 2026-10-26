/** Form fields shared by the tool pages. A field keeps what is being typed to itself and hands it on only when it is left. */
import { sameValue } from './amount';
import type { ComponentChildren } from 'preact';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { overdueNote, todayIso } from '../../engine/review';
import { inAppBrowser, intentUrl } from './in-app';

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
  /** Shown under the field in the hint's slot: a read-back or what is wrong. */
  said?: string;
  invalid?: boolean;
  type?: 'text' | 'month';
  inputMode?: 'decimal' | 'numeric' | 'text';
  /** Inside the box (UX9, review finding 6): "Rs." before the figure; any other, like "%" or "days", after it. */
  unit?: string;
  /** The estimate's own; the tools' boxes take none, since an example in the box looks typed (review finding 6). */
  placeholder?: string;
  /** The value the page assumes (OR4, O10): the box tagged "assumed" while it holds it, tinted and tagged "changed" once it
   * does not, with the default and a reset under it. */
  byDefault?: string;
  /** The state keeps a blank for the default: the box shows the default while blank, and the default typed back is a blank. */
  keepBlank?: boolean;
  class?: string;
}


/**
 * A box with its label above and one slot below (UX9, review finding 6): what was read or what is wrong, or else the
 * hint, so boxes side by side line up. In a grid of fields it takes three of the grid's rows (a subgrid), so the boxes
 * share a line however their labels wrap.
 */
export function TextField(p: TextProps) {
  const fixed = p.byDefault, shown = fixed !== undefined && p.keepBlank && !p.value.trim() ? fixed : p.value;
  const commit = (t: string) => p.onCommit(fixed !== undefined && (sameValue(t, fixed) || (p.keepBlank && !t.trim())) ? (p.keepBlank ? '' : fixed) : t);
  const d = useDraft(shown, commit, p.tidy);
  const changed = fixed !== undefined && !sameValue(shown, fixed);
  // A read-back saying the text was not understood marks the field wrong too, for screen readers and the error count (UD1).
  const bad = p.invalid || /^Not understood/.test(p.said ?? '');
  const tag = changed ? 'changed' : fixed !== undefined ? 'assumed' : '';
  const pre = p.unit === 'Rs.', after = [pre ? '' : p.unit, tag].filter(Boolean).join(' · ');
  const pad = `${pre ? 'pl-11' : 'pl-3'} ${!after ? 'pr-3' : after.length < 4 ? 'pr-10' : after.length < 10 ? 'pr-24' : 'pr-36'}`;
  const slot = p.said ? 'said' : changed ? 'default' : p.hint ? 'hint' : '', UNIT = 'pointer-events-none absolute inset-y-0 flex items-center text-ink-muted';
  return <div class={`grid grid-rows-subgrid row-span-3 content-start gap-0 ${p.class ?? ''}`}>
    <label for={p.id} class={`${LABEL} self-end`}>{p.label}</label>
    <div class="relative mt-1">
      {pre && <span id={`${p.id}-pre`} class={`${UNIT} left-3`}>Rs.</span>}
      {after && <span id={`${p.id}-unit`} class={`${UNIT} right-3 text-sm`}>{after}</span>}
      <input id={p.id} type={p.type ?? 'text'} inputMode={p.inputMode} autocomplete="off" spellcheck={false} enterkeyhint="done"
        placeholder={p.placeholder} aria-invalid={bad || undefined} aria-describedby={[pre && `${p.id}-pre`, after && `${p.id}-unit`, slot && `${p.id}-${slot}`].filter(Boolean).join(' ') || undefined}
        data-changed={changed ? 'own' : undefined} {...d} class={`${INPUT.replace('px-3', pad)} ${bad ? BAD : BORDER} ${changed ? 'bg-warn-tint' : ''}`} />
    </div>
    {/* The read-back, or the error beside its field in the error colour (GOV.UK Error message), tied to the field for a screen reader. */}
    {p.said ? <p id={`${p.id}-said`} data-testid={`${p.id}-said`} aria-live="polite" class={`mt-1 text-sm break-words ${bad ? 'text-bad' : 'text-ink-muted'}`}>{p.said}</p>
      : changed ? <p id={`${p.id}-default`} data-testid={`${p.id}-default`} class={HINT}>Default {fixed}{p.unit && p.unit !== 'Rs.' ? ` ${p.unit}` : ''}.{' '}
        <button type="button" data-testid={`${p.id}-reset`} class="text-link underline underline-offset-4" onClick={() => commit(fixed!)}>Reset<span class="sr-only"> {typeof p.label === 'string' ? p.label : ''} to the default</span></button></p>
      : p.hint && <p id={`${p.id}-hint`} class={HINT}>{p.hint}</p>}
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

/** The verdict as the paper's heading (OR3, the owner's O8 and O15): its plain head, "Works" or "Does not work yet: 1 ratio
 * short", and under it the detail in the model's words, which keeps the tool's own test id. A tick only beside "Works". */
export function Verdict(p: { id: string; work: string; text: string; rule: string }) {
  const ok = p.work === 'Works', bad = p.work.startsWith('Does not');
  return <h3 data-testid={`${p.id}-work`} data-answer class={`text-title ${bad ? 'text-bad' : 'text-ink'} ${p.rule}`}>
    <span class="flex items-center gap-2">{ok && <Tick />}{p.work}</span><span class="sr-only">. </span>
    <span data-testid={p.id} class="mt-1 block font-display text-base font-normal text-ink first-letter:uppercase">{p.text}</span></h3>;
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
  if (!to) return <span aria-label={`${what}: still to answer`} class="text-ink-muted">—</span>;
  return <a href={`#${to}`} onClick={goTo(to)} aria-label={`${what}: still to answer, to its box`}
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
export function Counter(p: { id: string; result: 'blocked' | 'provisional' | 'ready'; text: string; rule?: boolean; answer?: boolean; class?: string; children?: ComponentChildren;
  /** The verdict stands apart (OR3, the owner's O8): the status then carries no tick, so none stands beside a miss. */
  plain?: boolean;
  /** The first box still to answer (OR3, the owner's O7): "1 question left: answer it", the link to it. */
  go?: { to: string; what?: string; onClick?: (e: Event) => void } }) {
  const tone = p.result === 'blocked' ? 'text-bad' : p.result === 'provisional' ? 'text-warn' : 'text-ink';
  const state = <span data-testid={p.id} data-answer={p.answer || undefined} data-result={p.result} class={`${STATE} ${tone}`}>{p.result === 'ready' && !p.plain && <Tick />}{p.text}</span>;
  const box = `${p.class ?? ''} ${p.rule ? answerRule(p.result === 'ready') : ''}`;
  const go = p.go && <a data-testid={`${p.id}-go`} href={`#${p.go.to}`} onClick={p.go.onClick} aria-label={p.go.what ? `Answer it: ${p.go.what}` : undefined}
    class="inline-flex min-h-11 items-center text-link underline underline-offset-4">answer it</a>;
  // The last answer, committed as Tab leaves its box, turns the list into the state alone and takes the summary away just
  // as Tab moves to it: the state takes the focus, so Tab goes on from there, not from the top (WCAG 2.4.3; UX8's critic).
  const summary = useRef<HTMLElement>(null), line = useRef<HTMLParagraphElement>(null), had = useRef(false);
  if (typeof document !== 'undefined') had.current = summary.current?.isConnected ?? false;
  useLayoutEffect(() => { if (had.current && !p.children && tabbing && document.activeElement === document.body) line.current?.focus(); });
  const which = <span class="text-sm text-link"><span class="group-open:hidden">Show which</span><span class="hidden group-open:inline">Hide</span></span>;
  if (!p.children) return <p ref={line} tabIndex={-1} class={`${box} ${go ? 'flex flex-wrap items-center gap-x-1' : ''}`}>{state}{go && <><span aria-hidden="true" class={`-ml-1 text-sm font-medium ${tone}`}>:</span>{go}</>}</p>;
  // With a link the state and "answer it" share a line above the list's own toggle: a link inside a summary would nest
  // one control in another.
  if (go) return <div class={box}><p class="flex flex-wrap items-center gap-x-1">{state}<span aria-hidden="true" class={`-ml-1 text-sm font-medium ${tone}`}>:</span>{go}</p>
    <details class="group"><summary ref={summary} class="flex min-h-11 cursor-pointer items-center [&::-webkit-details-marker]:hidden">{which}</summary>
      <div class="pb-1">{p.children}</div></details></div>;
  return <details class={`group ${box}`}>
    <summary ref={summary} class="flex min-h-11 cursor-pointer flex-wrap items-center gap-x-2 [&::-webkit-details-marker]:hidden">{state}{which}</summary>
    <div class="pb-1">{p.children}</div>
  </details>;
}

/** A section with nothing in it yet folds to one line (UX8, review finding 9): its heading in body size and what it waits for. */
export function Folded(p: { id: string; title: string; children: ComponentChildren; class?: string }) {
  return <section id={p.id} data-folded aria-labelledby={`${p.id}-h`} class={`mt-10 flex flex-wrap items-baseline gap-x-2 border-t border-line pt-3 text-sm ${p.class ?? ''}`}>
    <h2 id={`${p.id}-h`} class="font-medium text-ink">{p.title}</h2><p class="text-ink-muted">{p.children}</p>
  </section>;
}

/** One thing the page assumes until changed: what, the value as assumed, why, and the box that changes it if there is one. */
export interface LedgerRow { id: string; what: string; shown: string; why: string; to?: string; go?: (e: Event) => void }

/**
 * What is assumed, as a ledger (UX9, review finding 8): one line with the count (D-UX-32), opening to a row each of what,
 * the value assumed and Change, so the values can be scanned; the reasons behind one "Why these". The rows no box changes
 * come after, under their own line, so a row without Change does not read as one missing it (UX9b, the UX9 critic).
 */
export function Ledger(p: { id: string; testid: string; title: string; rows: LedgerRow[]; row?: string; class?: string }) {
  if (!p.rows.length) return null;
  const list = (rows: LedgerRow[]) => rows.length > 0 && <ul class="text-sm">
    {rows.map((r) => <li key={r.id} data-testid={`${p.row ?? `${p.testid}-`}${r.id}`} class="grid gap-x-4 border-b border-line py-2 sm:grid-cols-ledger">
      <span class="font-medium text-ink">{r.what}<span class="sr-only">: </span></span> <span class="text-ink">{r.shown}</span>{' '}
      {r.to ? <a href={`#${r.to}`} onClick={r.go ?? goTo(r.to)} aria-label={`Change: ${r.what}`} class="text-link underline underline-offset-4 sm:text-right">Change</a> : <span />}
    </li>)}
  </ul>;
  return <section id={p.id} data-folded aria-labelledby={`${p.id}-h`} class={`mt-10 border-t border-line pt-3 ${p.class ?? ''}`}>
    <details data-testid={p.testid} class="group">
      <summary class="flex min-h-11 cursor-pointer flex-wrap items-baseline gap-x-2 text-sm [&::-webkit-details-marker]:hidden">
        <h2 id={`${p.id}-h`} class="font-medium text-ink">{p.title}: {p.rows.length}</h2>
        <span class="text-link"><span class="group-open:hidden">Show</span><span class="hidden group-open:inline">Hide</span></span>
      </summary>
      {list(p.rows.filter((r) => r.to))}
      {p.rows.some((r) => !r.to) && <><h3 class="mt-4 text-sm font-medium text-ink-muted">No box here changes these</h3>{list(p.rows.filter((r) => !r.to))}</>}
      <SourceNote what="Why these">{p.rows.map((r) => <span key={r.id} class="mt-1 block"><b>{r.what}:</b> {r.why}.</span>)}</SourceNote>
    </details>
  </section>;
}

/** The answer bar (D-UX-84) under 1024 px, from load on every tool (UX8, review finding 13); from 1024 px the answer panel
 * stands beside the questions, so the bar keeps only its words for a screen reader, and its arrow goes. */
export const BAR = 'sticky bottom-0 z-10 -mx-4 mt-10 flex items-center gap-2 border-t border-line bg-canvas px-4 sm:-mx-8 sm:px-8 lg:sr-only';
export const BAR_ARROW = 'inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink hover:bg-surface lg:hidden';

/** Where the answer is from what is in view (UX9, UX8's critic): the bar's arrow points to it, and from 1024 px the bar
 * shows while the answer panel is out of view (the forms and the CMA's full-width years under it), its words alone while
 * it is in view. A pinned panel counts as above once it starts to slide up with the end of the questions, so the bar's
 * words come back as it goes, not after it has gone under the header (UX9b, the UX9 critic). */
export function useAnswerPlace(id: string) {
  const [place, setPlace] = useState<'in' | 'above' | 'below'>('in');
  useEffect(() => {
    // On scroll, not an IntersectionObserver: a jump past the answer (a link, Tab) crosses no threshold, so it fires none.
    let frame = 0;
    const look = () => { frame = 0; const r = document.getElementById(id)?.getBoundingClientRect();
      if (!r) return;
      const css = getComputedStyle(document.getElementById(id) as HTMLElement), pin = css.position === 'sticky' ? parseFloat(css.top) : NaN;
      setPlace(r.bottom <= 0 || r.top < pin - 1 ? 'above' : r.top >= innerHeight ? 'below' : 'in'); };
    const soon = () => { frame ||= requestAnimationFrame(look); };
    look();
    addEventListener('scroll', soon, { passive: true });
    addEventListener('resize', soon);
    return () => { removeEventListener('scroll', soon); removeEventListener('resize', soon); cancelAnimationFrame(frame); };
  }, [id]);
  return place;
}

/** The answer bar of DSCR, the CMA and the report: the answer as text, read out as it changes, and the one 44 px arrow
 * to it, shown while it is out of view (UX9b: an arrow to what is on screen leads nowhere) and on focus, so a Tab walk
 * still meets it, pointing up once it is above (D-UX-84, UX3: only the arrow is a target, so a field under the bar can be tapped).
 * From 1024 px the words come back while the panel is out of view, without the arrow: a control there and gone by
 * the scroll is one a Tab walk misses (UX9). */
export function AnswerBar(p: { to: string; label: string; testid: string; text: string }) {
  const place = useAnswerPlace(p.to), out = place !== 'in';
  return <div class={`${out ? BAR.replace(' lg:sr-only', '') : BAR} lg:col-span-2`}>
    <p data-testid={p.testid} data-answer-echo aria-live="polite" class="flex-1 py-2 text-sm font-medium text-ink">{p.text}</p>
    <a href={`#${p.to}`} aria-label={p.label} onClick={toAnswer} class={`${BAR_ARROW} ${out ? '' : 'pointer-events-none opacity-0 focus-visible:opacity-100'}`}><span aria-hidden="true">{place === 'above' ? '↑' : '↓'}</span></a>
  </div>;
}

/** The line under an answer that says its state: the tick and "All answered" in ink, or what is still needed in the warning's
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

/** A hint's rule behind "Why" (UX9b, the UX9 critic): the hint stays one line, as its neighbours' do, so boxes side by side
 * line up; a button, not a disclosure, since it sits inside the hint's paragraph. */
export function Why({ id, children }: { id: string; children: ComponentChildren }) {
  const [open, setOpen] = useState(false);
  return <>{' '}<button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}
    class="inline-flex min-h-6 cursor-pointer items-center text-link underline underline-offset-4">Why</button>
    <span id={id} hidden={!open} class="mt-1 block">{children}</span></>;
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

/** Q1: under the download buttons, only in an app's own browser, which may not save files: the way out to the phone's. */
export function InAppNote({ id }: { id: string }) {
  const [where, setWhere] = useState<'android' | 'ios'>();
  useEffect(() => setWhere(inAppBrowser(navigator.userAgent)), []);
  if (!where) return null;
  return <p data-testid={id} class={HINT}>
    This app’s own browser may not save files.{' '}
    {where === 'android'
      ? <a class="font-medium text-link underline" href={intentUrl(new URL(location.href))}>Open this page in your browser</a>
      : <>Tap ⋯ or the share icon, then Open in Safari.</>}
  </p>;
}

/**
 * A tool opened from home's intro (HOME1b, D-UX-114: `?case=home`) starts filled with that intro's fictional case, put in
 * after the page wakes so the page served stays the blank one; the note says so for the visit.
 */
const homeAsked = () => { try { return new URLSearchParams(location.search).get('case') === 'home'; } catch { return false; } };
export function useHomeCase<T>(set: (s: T) => void, made: () => T) {
  const [on, setOn] = useState(false);
  useEffect(() => { if (homeAsked()) { set(made()); setOn(true); } }, []);
  return on;
}

/** The line on what is kept (D-UX-163, one sentence: D-UX-172): under each tool's lead; on the estimate, with its questions (D-UX-169). */
export const KEPT_LINE = 'Your answers are kept only in this browser tab, and closing the tab clears them.';
export const KeptLine = () => <p data-testid="kept-line" class="mt-2 max-w-prose text-sm text-ink-muted">{KEPT_LINE}</p>;

/** The draft's version (D-UX-159): raise it when a tool's inputs change meaning, so an old draft is dropped. */
const DRAFT_VERSION = 1;
/** The keys of a blank state, nested, as one line: a draft made for other fields is dropped, never half-filled. */
const shapeOf = (x: unknown): string => Array.isArray(x) ? '[]'
  : x && typeof x === 'object' ? `{${Object.keys(x).sort().map((k) => `${k}:${shapeOf((x as Record<string, unknown>)[k])}`).join(',')}}` : '';
/**
 * A tool's answers kept in this browser tab (UXR2, D-UX-157 to D-UX-161): what was typed comes back after a reload, Back
 * or a phone dropping the tab, and goes when the tab closes. The state holds inputs only, never results or documents
 * (D-UX-158, D-UX-160); a blank state, as after Clear all, empties the draft. A visit with home's fictional case is not
 * kept and does not touch the draft (D-UX-162). Put back after the page wakes, so the page served stays the blank one.
 */
export function useKept<T>(tool: string, s: T, set: (s: T) => void, blank: T) {
  const key = `draft:${tool}:v${DRAFT_VERSION}`, shape = shapeOf(blank), empty = JSON.stringify(blank);
  const ready = useRef(false), off = useRef(false);
  useEffect(() => {
    off.current = homeAsked();
    if (!off.current) {
      try {
        const d = JSON.parse(sessionStorage.getItem(key) ?? 'null') as { shape: string; s: T } | null;
        if (d && d.shape === shape) set(d.s); else if (d) sessionStorage.removeItem(key);
      } catch { /* no storage or a broken draft: the blank page */ }
    }
    ready.current = true;
  }, []);
  // Written as soon as the change is drawn, so a reload straight after the last field still finds it.
  useLayoutEffect(() => {
    if (!ready.current || off.current) return;
    try {
      if (JSON.stringify(s) === empty) sessionStorage.removeItem(key);
      else sessionStorage.setItem(key, JSON.stringify({ shape, s }));
    } catch { /* storage full or blocked: the answers stay for this view only */ }
  }, [s]);
}
export const HomeCaseNote = ({ on }: { on: boolean }) => on ? (
  <p role="status" data-testid="home-case" class="mt-2 text-sm font-medium text-ink">Filled with the fictional case from the home page. Every figure is an example: change each to your own.</p>
) : null;
