/**
 * The answers folded once given (OR9, LOOP1c, D-UX-231), one part for every tool: on a desktop a narrow rail of the
 * answers beside the result, which opens in place to change them; on a phone an "Edit answers" button that opens them
 * as a sheet. The tool hands in its answers as groups of label and value, as typed, and the fields to change them; the
 * part draws, works nothing out.
 */
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { BUTTON, FILLED } from './fields';

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
  const done = useRef<HTMLButtonElement>(null);
  useEffect(() => done.current?.focus(), []);
  return <div data-testid={`${pre}-rail-open`}>
    <div class="flex items-center justify-between gap-2">
      <h2 class="text-xs font-medium tracking-wide text-ink-muted uppercase">Your answers</h2>
      <button ref={done} type="button" data-testid={`${pre}-rail-done`} class={FILLED} onClick={() => {
        onDone(); requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-testid="${pre}-rail-change"]`)?.focus());
      }}>Done</button>
    </div>
    {children}
  </div>;
}

/** On a phone, the one way to the answers: a button that stays at the top while the result scrolls. */
export function EditAnswers({ pre, onOpen }: { pre: string; onOpen: () => void }) {
  return <div class="sticky top-0 z-10 -mx-4 flex justify-end bg-canvas/90 px-4 py-2 backdrop-blur-sm sm:-mx-8 sm:px-8 lg:hidden">
    <button type="button" data-testid={`${pre}-edit`} class={BUTTON} onClick={onOpen}>Edit answers</button>
  </div>;
}

/** The answers as a sheet from the foot of a phone's screen: a modal dialog, so the keys stay in it and Esc closes it. */
export function AnswersSheet({ pre, open, onClose, children }: { pre: string; open: boolean; onClose: () => void; children: ComponentChildren }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
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
