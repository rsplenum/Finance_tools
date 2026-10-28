/**
 * The answers folded once given (OR9, LOOP1c, D-UX-231), one part for every tool: on a desktop a narrow rail of the
 * answers beside the result, which opens in place to change them; on a phone an "Edit answers" button that opens them
 * as a sheet. The tool hands in its answers as groups of label and value, as typed, and the fields to change them; the
 * part draws, works nothing out. One shape for the four tools (UXR5, LOOP1d): `useFold` keeps the state, `AnswersColumn`
 * draws the column, `foldGrid` the page's grid.
 */
import type { ComponentChildren } from 'preact';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { BUTTON, FILLED, opensAnswers } from './fields';

export interface AnswerGroup { title: string; rows: [string, string][] }
const WIDE = '(min-width: 64rem)';

/** Whether the page is wide enough for the rail (1024 px, as the answer panel beside the questions, UX8). */
export function useWide(): boolean {
  const [wide, setWide] = useState(() => typeof matchMedia === 'function' && matchMedia(WIDE).matches);
  useEffect(() => {
    const q = matchMedia(WIDE), on = () => setWide(q.matches);
    q.addEventListener('change', on);
    return () => q.removeEventListener('change', on);
  }, []);
  return wide;
}

export type Fold = ReturnType<typeof useFold>;

/**
 * The fold's state (OR9, D-UX-231): folded when the tool asks (See the answer, Make it work, or the estimate's first
 * answer), kept while the answers are open to change even with one emptied, and undone when they close with one
 * missing, so the page shows what is needed. `answer` is the element the focus goes to on folding; `on`, whether the
 * page can fold at all (the DSCR's front door only).
 */
export function useFold(ready: boolean, answer: string, on = true) {
  const [folded, setFolded] = useState(false), [editing, setEditing] = useState(false), wide = useWide();
  const fold = folded && on && (ready || editing);
  useEffect(() => { if (folded && !fold) setFolded(false); }, [folded, fold]);
  // A link to an answer while they are folded opens them first (fields.tsx, goTo).
  useEffect(() => (fold && !editing ? opensAnswers(() => setEditing(true)) : undefined), [fold, editing]);
  return {
    fold, editing, wide,
    open: () => setEditing(true),
    done: () => { setEditing(false); if (!ready) setFolded(false); },
    unfold: () => { setFolded(false); setEditing(false); },
    /** Folds without moving the focus, as Make it work does from its own button. */
    keep: () => { if (ready) setFolded(true); },
    /** Folds and takes the focus to the answer. */
    see: () => { setFolded(true); setEditing(false); requestAnimationFrame(() => document.getElementById(answer)?.focus()); },
  };
}

/** The page's grid: the tool's own (`unfolded`), or the rail beside the answer, wider while open to change. */
export const foldGrid = (f: Fold, unfolded: string) =>
  (f.fold ? `lg:grid lg:gap-x-10 ${f.editing && f.wide ? 'lg:grid-cols-rail-open' : 'lg:grid-cols-rail'}` : unfolded);

const SPANS = { 2: 'lg:row-end-3', 3: 'lg:row-end-4' } as const;

/**
 * The answers' place on the page, the first child of its grid: unfolded, the tool's own questions (`unfolded`); folded,
 * the rail from 1024 px, which opens in place to change them, and on a phone "Edit answers" and the sheet. `children`
 * are the fields to change them; `rows`, how many of the grid's rows the rail runs beside. Always three children, the
 * absent ones holes, so the answer after them never remounts (GOTCHAS, folding).
 */
export function AnswersColumn({ f, pre, groups, summary, rows, unfolded, children }: {
  f: Fold; pre: string; groups: () => AnswerGroup[]; summary?: string; rows: 2 | 3; unfolded: ComponentChildren; children: ComponentChildren;
}) {
  return <>
    <div class={f.fold ? `hidden lg:col-start-1 lg:row-start-1 ${SPANS[rows]} lg:block` : 'lg:col-start-1 lg:row-start-1'}>
      {f.fold ? <div class="lg:sticky lg:top-18 lg:max-h-rail lg:overflow-y-auto lg:overscroll-contain lg:pt-4 lg:pb-10">
        {f.editing && f.wide ? <AnswersOpen pre={pre} onDone={f.done}>{children}</AnswersOpen> : <AnswersRail pre={pre} groups={groups()} onChange={f.open} />}
      </div> : unfolded}
    </div>
    {f.fold ? <EditAnswers pre={pre} summary={summary} onOpen={f.open} /> : null}
    {f.fold && !f.wide ? <AnswersSheet pre={pre} open={f.editing} onClose={f.done}>{children}</AnswersSheet> : null}
  </>;
}

/** Under the answers once the answer is ready and they are not folded: the one way to fold them (a plain button, so one filled button a screen stays). */
export function SeeAnswer({ pre, onSee }: { pre: string; onSee?: () => void }) {
  return onSee ? <button type="button" data-testid={`${pre}-fold`} class={`mt-4 ${BUTTON}`} onClick={onSee}>See the answer</button> : null;
}

/** The answers as a rail: each group's labels over their values, then the one way back to change them. */
export function AnswersRail({ pre, groups, onChange }: { pre: string; groups: AnswerGroup[]; onChange: () => void }) {
  return <nav data-testid={`${pre}-rail`} aria-labelledby={`${pre}-rail-h`} class="text-sm">
    <h2 id={`${pre}-rail-h`} class="text-xs font-medium tracking-wide text-ink-muted uppercase">Your answers</h2>
    {groups.map((g) => <div key={g.title} class="border-t border-line py-2 first-of-type:border-0">
      <h3 class="font-medium text-ink">{g.title}</h3>
      <dl class="mt-1">{g.rows.map(([k, v]) => <div key={k} class="mt-1"><dt class="text-ink-muted">{k}</dt><dd class="font-medium tabular-nums text-ink">{v}</dd></div>)}</dl>
    </div>)}
    <button type="button" data-testid={`${pre}-rail-change`} class={`mt-2 ${BUTTON}`} onClick={onChange}>Change an answer</button>
  </nav>;
}

/** The answers open to change, in the rail's place on a desktop: the result beside follows each answer as it is left. */
export function AnswersOpen({ pre, onDone, children }: { pre: string; onDone: () => void; children: ComponentChildren }) {
  // The focus goes in with the answers, as a dialog's would (WCAG 2.4.3); Done hands it back to "Change an answer".
  // A link that opened them to land on one answer keeps its focus there.
  const done = useRef<HTMLButtonElement>(null), box = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!box.current?.contains(document.activeElement)) done.current?.focus(); }, []);
  return <div ref={box} data-testid={`${pre}-rail-open`}>
    <div class="flex items-center justify-between gap-2">
      <h2 class="text-xs font-medium tracking-wide text-ink-muted uppercase">Your answers</h2>
      <button ref={done} type="button" data-testid={`${pre}-rail-done`} class={FILLED} onClick={() => {
        onDone(); requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-testid="${pre}-rail-change"]`)?.focus());
      }}>Done</button>
    </div>
    {children}
  </div>;
}

/** On a phone, the one way to the answers: a button that stays at the top while the result scrolls, beside the answers
 * in one line where the tool has one (`summary`, the estimate's). */
export function EditAnswers({ pre, summary, onOpen }: { pre: string; summary?: string; onOpen: () => void }) {
  return <div class="sticky top-0 z-10 -mx-4 flex items-center justify-end gap-3 bg-canvas/90 px-4 py-2 backdrop-blur-sm sm:-mx-8 sm:px-8 lg:hidden">
    {summary && <p data-testid={`${pre}-summary`} class="min-w-0 flex-1 text-sm text-ink line-clamp-2">{summary}</p>}
    <button type="button" data-testid={`${pre}-edit`} class={`shrink-0 ${BUTTON}`} onClick={onOpen}>Edit answers</button>
  </div>;
}

/** The answers as a sheet from the foot of a phone's screen: a modal dialog, so the keys stay in it and Esc closes it. */
export function AnswersSheet({ pre, open, onClose, children }: { pre: string; open: boolean; onClose: () => void; children: ComponentChildren }) {
  const ref = useRef<HTMLDialogElement>(null);
  // Opened before the frame is drawn, so the answers never sit in a closed dialog where Esc cannot reach them.
  useLayoutEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  // A sheet that goes (the window widened) after the browser closed it but before its close event came closes its answers too.
  const last = useRef({ open, onClose });
  last.current = { open, onClose };
  useEffect(() => { const d = ref.current; return () => { if (last.current.open && d && !d.open) last.current.onClose(); }; }, []);
  // Esc fires cancel at once and close a little later, by then perhaps after the sheet has gone (a widened window).
  return <dialog ref={ref} data-testid={`${pre}-sheet`} aria-labelledby={`${pre}-sheet-h`} onCancel={onClose} onClose={onClose}
    onClick={(e) => { if (e.target === ref.current) onClose(); }}
    class="m-0 mt-auto max-h-sheet w-full max-w-none overflow-y-auto overscroll-contain rounded-t-2xl bg-canvas p-0 text-ink shadow-paper backdrop:bg-ink/45">
    {/* The padding is inside, so a tap on the dialog itself is a tap on the scrim. */}
    {open && <div class="px-4 pt-4 pb-safe sm:px-8">
      <div class="flex items-center justify-between gap-2">
        <h2 id={`${pre}-sheet-h`} class="text-title text-ink">Your answers</h2>
        <button type="button" data-testid={`${pre}-sheet-done`} class={FILLED} onClick={onClose}>Done</button>
      </div>
      <p class="mt-1 text-sm text-ink-muted">The answer behind follows each change.</p>
      {children}
    </div>}
  </dialog>;
}
