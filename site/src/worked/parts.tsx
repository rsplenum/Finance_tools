/**
 * The worked page's shared parts (docs/WORKED-PAGE.md §4), drawn the same on all four tools (NEW1 to NEW4): the reading,
 * the facts as one sentence of tappable figures, the one next step and the folds. Each draws what it is handed and works
 * nothing out: the tool's view builder (like `dscr/worked.ts`) says the figures, from its engine.
 */
import type { ComponentChildren } from 'preact';

/** Ink once the borrower typed or confirmed it; pencil while it is the example's or a stated assumption (§3). */
export type FactKind = 'ink' | 'example' | 'assumed';
export interface FactShown { id: string; kind: FactKind; text: string; spoken: string; before?: string; after?: string }

/**
 * The reading (§4 part 2): one sentence, the largest thing on the screen, the cash first; the banker's term under it.
 * The sentence says the state in words; no tinted side rule repeats it (a coloured stripe reads as decoration, not news).
 * `state` and `pencil` stay on the element for checks.
 */
export function Reading(p: { text: string; banker?: string; state: 'carries' | 'short' | 'cannot' | 'wait'; pencil: boolean; children?: ComponentChildren }) {
  return <div data-testid="reading" data-answer data-state={p.state} data-pencil={p.pencil ? '' : undefined}>
    <p data-testid="reading-text" role="status" class="font-display text-[1.5rem] leading-[1.2] font-semibold tracking-[-0.01em] text-ink text-balance sm:text-[2rem]">{p.text}</p>
    {p.banker && <p data-testid="reading-banker" class="mt-2 text-base text-ink-muted text-pretty">{p.banker}</p>}
    {p.children}
  </div>;
}

/** Ink is a solid line under the figure; pencil a dashed, muted one. Each figure is a button 44 px tall in its line. */
const FACT = 'cursor-pointer rounded-sm px-0.5 py-[0.6rem] -my-[0.6rem] underline underline-offset-[0.3em] hover:bg-ink/6 focus-visible:bg-ink/6';
const KIND: Record<FactKind, string> = {
  ink: 'font-semibold text-ink decoration-2 decoration-ink',
  example: 'text-ink-muted decoration-dashed decoration-1 decoration-ink-muted',
  assumed: 'text-ink-muted decoration-dotted decoration-1 decoration-ink-muted',
};

/** The facts as one sentence (§4 part 5), each figure tappable and named aloud with whose it is. */
export function FactLine(p: { facts: FactShown[]; open?: string; onTap: (id: string) => void; label: string }) {
  return <p data-testid="facts" aria-label={p.label} class="text-lg leading-[2.75rem] text-ink text-pretty">
    {p.facts.map((f) => <span key={f.id}>{f.before}<button type="button" data-fact={f.id} data-kind={f.kind} aria-label={f.spoken}
      aria-expanded={p.open === f.id} class={`${FACT} ${KIND[f.kind]} ${p.open === f.id ? 'bg-ink/10' : ''}`} onClick={() => p.onTap(f.id)}>{f.text}</button>{f.after}</span>)}
  </p>;
}

/** The one main button a screen has (§4 part 4): ink filled, 44 px, the full width on a phone. */
export const MAIN = 'inline-flex min-h-12 w-full items-center justify-center rounded-full bg-ink px-6 text-base font-semibold text-canvas hover:bg-ink/85 sm:w-auto';
/** A quiet action beside it: a text button 44 px tall. */
export const QUIET = 'inline-flex min-h-11 items-center rounded-full px-3 text-base font-medium text-link underline underline-offset-4 hover:bg-ink/6';

/**
 * A fold (§4: closed until tapped), 44 px to tap, with its title as the page's next heading level and, if given, one
 * line under it on what is inside. Opening one by a link (`#id`) opens it first.
 */
export function Fold(p: { id: string; title: string; sub?: string; open?: boolean; onToggle?: (open: boolean) => void; children: ComponentChildren; class?: string }) {
  return <details id={p.id} open={p.open} class={`group border-t border-line ${p.class ?? ''}`}
    onToggle={(e) => p.onToggle?.((e.currentTarget as HTMLDetailsElement).open)}>
    <summary class="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 py-3 [&::-webkit-details-marker]:hidden">
      <span><h2 class="font-heading text-xl font-semibold text-ink">{p.title}</h2>{p.sub && <span class="block text-sm text-ink-muted">{p.sub}</span>}</span>
      <span aria-hidden="true" class="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-ink/6 text-ink transition-transform group-open:rotate-180 motion-reduce:transition-none">
        <svg viewBox="0 0 16 16" class="size-4" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M4 6l4 4 4-4" /></svg>
      </span>
    </summary>
    <div class="pb-8">{p.children}</div>
  </details>;
}

/** Opens a fold by its id and brings it into view: the paper one tap from anywhere (§4). */
export function openFold(id: string, focus = true) {
  const d = document.getElementById(id);
  if (!(d instanceof HTMLDetailsElement)) return;
  d.open = true;
  requestAnimationFrame(() => {
    d.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    if (focus) d.querySelector('summary')?.focus({ preventScroll: true });
  });
}
