/**
 * Make it work, one part for every tool (LOOP1c, D-UX-227 to D-UX-229, D-UX-230): what the borrower can bring, the ready
 * plans with their cost (none marked best), then linked sliders (the one moved stays, one other follows, the rest stay),
 * "See round N" and the rounds tried. The tool hands in a `Linked` (its engine's plans and moves, in words) and the
 * part draws them; it works out no figure (CLAUDE.md). The DSCR page's is site/src/dscr/MakeItWork.tsx.
 */
import { useMemo, useState } from 'preact/hooks';
import { BUTTON, Choice, FILLED, HINT } from './fields';

/** One line of figures, its parts joined by " · ": `ok` reads in the link's tone, `bad` in the miss's. */
export type Said = { text: string; tone?: 'ok' | 'bad'; strong?: boolean }[];
export interface Lever { id: string; label: string; min: number; max: number; step: number; ends: [string, string]; words: (v: number) => string; note?: string }
export interface Plan<T> { id: string; title: string; terms: T; lines: [string, string][]; more?: string }
/** Where the sliders stand: each lever's value, which one followed the last move, the figures, and why a move stopped. */
export interface Live<T> { terms: T; values: Record<string, number>; follower?: string; figures: Said; lines: string[]; stop?: string }
/** A tool's Make it work. `P` is the sliders' place as the tool keeps it (its homes and order); the part only holds it. */
export interface Linked<T, P> {
  /** The terms it starts from; a new value starts the sliders afresh. */
  from: string;
  question: string;
  choices: { value: string; label: string }[];
  plans: (most: number) => Plan<T>[];
  /** Why a plan is missing, said above them. */
  plansNote?: (most: number, shown: Plan<T>[]) => string | undefined;
  levers: (most: number) => Lever[];
  begin: (t: T | undefined, most: number) => P | undefined;
  move: (at: P, id: string, v: number, done: boolean, most: number) => P | undefined;
  view: (at: P) => Live<T>;
}

const tone = (t?: 'ok' | 'bad') => (t === 'ok' ? 'text-link' : t === 'bad' ? 'text-bad' : 'text-ink');
export function SaidLine({ said, testid, class: c = '' }: { said: Said; testid?: string; class?: string }) {
  return <p data-testid={testid} class={`text-sm tabular-nums ${c}`}>{said.map((x, i) => <>{i > 0 && ' · '}<span class={`${tone(x.tone)}${x.strong ? ' font-medium' : ''}`}>{x.text}</span></>)}</p>;
}

/**
 * Worked on a tap. `on` names the case apart from the terms the sliders move: a change of it closes the part, any other
 * keeps it open on the new answer. `most` is what the borrower can bring, kept by the tool (undefined until asked).
 */
export function MakeItWork<T, P>({ pre, on, link, missing, most, setMost, see, round, onOpen }: {
  pre: string; on: string; link?: Linked<T, P>; missing: string; most?: number; setMost: (v: string) => void; see: (t: T) => void; round: number;
  /** Told when the part opens: a page that folds its answers then (OR9) does it here. */
  onOpen?: () => void;
}) {
  const [open, setOpen] = useState<string>();
  const asked = most !== undefined, m = most ?? 0, u = open === on ? link : undefined;
  const plans = useMemo(() => (u && asked ? u.plans(m) : []), [u, asked, m]);
  const levers = useMemo(() => u?.levers(m) ?? [], [u, m]);
  type At = { on: string; p: P; moved?: string };
  const [at, setAt] = useState<At>();
  const key = u ? `${u.from}|${m}` : '';
  const here: At | undefined = at && at.on === key ? at : u ? (() => { const p = u.begin(undefined, m); return p && { on: key, p }; })() : undefined;
  const id = (x: string) => `${pre}-${x}`;

  if (open !== on) {
    // The one filled button on a short result (docs/DESIGN.md, principle 6); it removes itself, so the focus moves on (WCAG 2.4.3).
    return <button type="button" data-testid={id('viable')} class={`mt-2 ${FILLED}`} onClick={() => {
      setOpen(on); setAt(undefined); onOpen?.();
      requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-testid="${id('plan')}"]`)?.focus());
    }}>Make it work</button>;
  }
  if (!u) return <p data-testid={id('plan')} tabIndex={-1} class="mt-2 text-sm text-ink">{missing}</p>;

  const move = (l: string, v: number, done: boolean) => {
    const p = here && u.move(here.p, l, v, done, m);
    if (p) setAt({ on: key, p, moved: l });
  };
  const start = (t: T) => { const p = u.begin(t, m); if (p) setAt({ on: key, p }); };
  const live = here && u.view(here.p), note = asked ? u.plansNote?.(m, plans) : undefined;

  return <div data-testid={id('plan')} tabIndex={-1} class="mt-6 border-t-2 border-ink pt-4">
    <h3 class="text-title text-ink">Make it work</h3>
    <Choice name={id('own')} legend={u.question} columns options={u.choices} value={asked ? String(m) : undefined} onChange={setMost} />
    {asked && <>
      <h4 class="mt-4 text-sm font-medium text-ink">Ready plans</h4>
      <p class={HINT}>Each meets the bank’s figures. Their cost differs; which suits you is yours to weigh.</p>
      {note && <p data-testid={id('plans-own-short')} class="mt-1 text-sm text-ink">{note}</p>}
      {plans.length === 0 && <p data-testid={id('plans-none')} class="mt-2 text-sm text-bad">No plan within the limits meets the bank’s figures. The sliders show how near each lever comes.</p>}
      <ul data-testid={id('plans')} class="mt-2 grid gap-2 sm:grid-cols-3">{plans.map((o) => <li key={o.id} data-testid={id(`plan-${o.id}`)} class="rounded-card border border-line p-3 new:border-0 new:bg-surface">
        <h5 class="font-medium text-ink">{o.title}</h5>
        <dl class="mt-1 text-sm tabular-nums">{o.lines.map(([k, v]) => <div key={k} class="flex justify-between gap-2"><dt class="text-ink-muted">{k}</dt><dd class="text-right text-ink">{v}</dd></div>)}</dl>
        {o.more && <p class={HINT}>{o.more}</p>}
        <button type="button" data-testid={id(`plan-from-${o.id}`)} class={`mt-2 scroll-mb-40 ${BUTTON}`} onClick={() => start(o.terms)}>Start from this plan</button>
      </li>)}</ul>

      <h4 class="mt-4 text-sm font-medium text-ink">Try it with your own hands</h4>
      <p class={HINT}>Move one: it stays where you put it, one other follows to keep the plan meeting the bank’s figures, and the rest stay.</p>
      {live && <ul class="mt-2 space-y-2">{levers.map((l) => {
        const v = live.values[l.id], badge = here?.moved === l.id ? 'You set this' : live.follower === l.id ? 'Follows' : undefined;
        return <li key={l.id} data-testid={id(`lever-${l.id}`)} class="rounded-lg border border-line p-3 new:border-0 new:bg-surface">
          <div class="flex items-baseline justify-between gap-2">
            <label for={id(`slider-${l.id}`)} class="font-medium text-ink">{l.label}
              {badge && <span data-testid={id(`badge-${l.id}`)} class="ml-2 rounded-full bg-canvas px-2 py-0.5 text-xs font-normal text-ink-muted">{badge}</span>}</label>
            <span data-testid={id(`move-${l.id}`)} class="shrink-0 text-lg font-semibold tabular-nums text-ink">{l.words(v)}</span>
          </div>
          <input id={id(`slider-${l.id}`)} type="range" min={l.min} max={l.max} step={l.step} value={v} aria-valuetext={l.words(v)}
            onInput={(e) => move(l.id, Number((e.currentTarget as HTMLInputElement).value), false)}
            onChange={(e) => move(l.id, Number((e.currentTarget as HTMLInputElement).value), true)} class="mt-2 h-6 w-full scroll-mb-40 accent-ink" />
          <div class="flex justify-between text-xs text-ink-muted tabular-nums"><span>{l.ends[0]}</span><span>{l.ends[1]}</span></div>
          {l.note && <p class={HINT}>{l.note}</p>}
        </li>;
      })}</ul>}
      {live && <div data-testid={id('plan-line')} aria-live="polite" class="sticky bottom-10 mt-2 border-t border-line bg-canvas py-2">
        <SaidLine said={live.figures} testid={id('plan-figures')} />
        {live.lines.map((x) => <p key={x} class="text-sm tabular-nums text-ink">{x}</p>)}
        {live.stop && <p data-testid={id('plan-stop')} class="text-sm text-bad">{live.stop}</p>}
      </div>}
      {live && <button type="button" data-testid={id('plan-use')} class={`mt-2 ${FILLED}`} onClick={() => see(live.terms)}>See round {round}</button>}
      <p class={HINT}>This writes the plan into your answers, so the whole answer and the downloads follow it. Your earlier rounds stay listed to go back to.</p>
    </>}
  </div>;
}

/** A round tried: what it changed from the first, its figures, and whether it is the one on the page now. */
export interface RoundView<T> { terms: T; changed: string; lines: string[]; figures: Said; now: boolean }
/** The rounds tried (LOOP1b): a tap on an earlier one writes it back. */
export function Rounds<T>({ pre, list, back }: { pre: string; list: RoundView<T>[]; back: (t: T) => void }) {
  return <div data-testid={`${pre}-rounds`} class="mt-4">
    <h3 class="text-title text-ink">Your rounds</h3>
    <ol class="mt-1 divide-y divide-line">{list.map((r, i) => <li key={i} data-testid={`${pre}-round-${i + 1}`} class="py-2">
      <div class="flex items-baseline justify-between gap-2">
        <p class="font-medium text-ink">Round {i + 1}{r.now ? ' (on the page now)' : ''}</p>
        {!r.now && <button type="button" data-testid={`${pre}-round-back-${i + 1}`} class={BUTTON} onClick={() => back(r.terms)}>Go back to this</button>}
      </div>
      <p class="text-sm text-ink">{r.changed}</p>
      {r.lines.map((x) => <p key={x} class="text-sm tabular-nums text-ink">{x}</p>)}
      <SaidLine said={r.figures} testid={`${pre}-round-${i + 1}-figures`} />
    </li>)}</ol>
  </div>;
}
