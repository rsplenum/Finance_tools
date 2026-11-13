/**
 * Guided steps (NEW1e, Rahul, 13-11-2026: "I don't want horizontal scroll instead of vertical scroll, the horizontal
 * journey grouped in to sensible and reasonable tabs and guided"). In place of NEW1d's track across: a rail of named steps
 * on top, one step's fields at a time, and a bar at the foot that stays in reach with the live answer, Back and "Next:
 * <the next step's name>". The rail and the bar are the project report's builder's (BUILD1, D-UX-340), one look for every
 * tool: the dot of the step in hand wears a ring that glides along the rail as the steps change, a step left behind takes
 * a tick, and a step comes in from the side it is reached from (none where motion is not wanted).
 *
 * Every step stays in the page, hidden but never removed, so a box keeps its answer and rule 17's count holds. A way to a
 * box in another step opens that step first: the `reveal` event a box sends when a link asks for it (`goTo`, fields.tsx),
 * or a click on a link to it. The page is shown at once, in the page itself, so the link's own jump and focus land on a
 * box that is there; the state follows.
 */
import type { ComponentChildren } from 'preact';
import { useRef, useState } from 'preact/hooks';
import { BUTTON, FILLED } from '../fields';

export interface Step { id: string; name: string; body: ComponentChildren }
export interface StepWords { label: string; step: (i: number, n: number) => string; next: (name: string) => string; back: string; done: string }

const NEXT = FILLED.replace('sm:min-h-0', '');

/** `bar` heads the bar at the foot (the live answer, on a phone); `lead` stands above the rail; `end` takes Next's place
 * on the last step. */
export function Steps({ steps, words, bar, lead, end }: { steps: Step[]; words: StepWords; bar?: ComponentChildren; lead?: ComponentChildren; end?: ComponentChildren }) {
  const n = steps.length;
  const [now, setNow] = useState(0), [back, setBack] = useState(false), [seen, setSeen] = useState<string[]>([]);
  const at = Math.min(now, n - 1), root = useRef<HTMLDivElement>(null), atNow = useRef(at);
  atNow.current = at;

  const flip = (i: number) => {
    if (i === atNow.current || !steps[i]) return;
    root.current?.querySelectorAll<HTMLElement>('[data-step-panel]').forEach((el) => { el.hidden = el.dataset.stepPanel !== steps[i].id; });
    setBack(i < atNow.current);
    setSeen((s) => (s.includes(steps[atNow.current].id) ? s : [...s, steps[atNow.current].id]));
    setNow(i);
    atNow.current = i;
  };
  const stepOf = (el: Element | null) => {
    const id = el?.closest<HTMLElement>('[data-step-panel]')?.dataset.stepPanel;
    return id ? steps.findIndex((s) => s.id === id) : -1;
  };
  // The rail, Back and Next: the page comes back up to the rail when it has gone by, and the step's heading takes the focus.
  const go = (i: number) => {
    flip(i);
    requestAnimationFrame(() => {
      const rail = root.current?.querySelector('[data-steps]');
      if (rail && rail.getBoundingClientRect().top < 0) rail.scrollIntoView({ block: 'start' });
      root.current?.querySelector<HTMLElement>(`[data-step-panel="${steps[i].id}"] [data-step-title]`)?.focus({ preventScroll: true });
    });
  };
  // A link to a box in another step opens that step first (the needs, a Change, a figure still to answer).
  const linked = (e: MouseEvent) => {
    const a = (e.target as HTMLElement).closest?.('a[href^="#"]') as HTMLAnchorElement | null;
    const to = a?.hash.length ? document.getElementById(decodeURIComponent(a.hash.slice(1))) : null;
    const i = stepOf(to);
    if (i >= 0) flip(i);
  };
  const reveal = { onreveal: (e: Event) => { const i = stepOf(e.target as Element); if (i >= 0) flip(i); } };
  const id = steps[at]?.id, nextStep = steps[at + 1];

  return <div ref={root} data-testid="steps" data-step-now={id} data-back={back ? '' : undefined} class="stepper" onClickCapture={linked} {...reveal}>
    {lead}
    {n > 1 && <nav aria-label={words.label} data-steps class="mt-4">
      <ol class="steps" style={{ '--n': n, '--i': at }}>
        {steps.map((s, i) => {
          const done = i !== at && seen.includes(s.id);
          return <li key={s.id} data-state={i === at ? 'now' : done ? 'done' : ''}>
            <button type="button" data-testid={`step-${s.id}`} aria-current={i === at ? 'step' : undefined} onClick={() => go(i)}>
              {/* The name a screen reader says holds the words that show (axe: label-content-name-mismatch). */}
              <span class="sr-only">{words.step(i + 1, n).replace(/ of \d+$/, '')} </span>
              <span class="step-dot">{done ? <><span aria-hidden="true">✓</span><span class="sr-only">{i + 1}</span></> : i + 1}</span>
              <span class="sr-only">: </span>
              <span class="step-name">{s.name}</span>
              {done && <span class="sr-only">, {words.done}</span>}
            </button>
          </li>;
        })}
      </ol>
    </nav>}
    <div class="step-panels">
      {steps.map((s, i) => <section key={s.id} data-step-panel={s.id} hidden={i !== at} aria-label={`${words.step(i + 1, n)}: ${s.name}`} class="step-panel">
        {n > 1 && <p data-step-title tabIndex={-1} class="step-count">{words.step(i + 1, n)}</p>}
        {s.body}
      </section>)}
    </div>
    {(n > 1 || bar || end) && <div data-builder-bar class="builder-bar">
      {bar}
      <div class="mt-1.5 flex items-center gap-2">
        {at > 0 && <button type="button" data-testid={`back-${id}`} class={BUTTON} onClick={() => go(at - 1)}><span aria-hidden="true">← </span>{words.back}</button>}
        {nextStep
          ? <button type="button" data-testid={`next-${id}`} class={`ml-auto ${NEXT}`} onClick={() => go(at + 1)}>{words.next(nextStep.name)}<span aria-hidden="true" class="step-arrow">→</span></button>
          : end && <span class="ml-auto">{end}</span>}
      </div>
    </div>}
  </div>;
}
