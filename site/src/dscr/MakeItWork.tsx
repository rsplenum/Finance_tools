/**
 * Make it work on the DSCR page (LOOP1b, D-UX-227 to D-UX-229): what the borrower can bring, the ready plans with their
 * cost (none marked best), then three linked sliders: the one moved stays where the borrower put it, one other follows,
 * the third stays. "See round N" writes the loan's three answers into the form, so the page's answer becomes the next
 * round. Figures: the engine's, worded in rounds.ts.
 */
import { useMemo, useState } from 'preact/hooks';
import { BUTTON, Choice, FILLED, HINT } from '../fields';
import type { Follower, Homes, LinkId, LinkTerms } from '../../../engine/dscr-linked';
import { LEVELS } from '../../../engine/ratios';
import { amountOf, type State } from './model';
import { moveOf, optionsOf, ownShortOf, roundKey, roundOf, setupOf, startOf, writeTerms, type Figures, type Live } from './rounds';

type Update = (f: (s: State) => State) => void;
type At = { on: string; live: Live; homes: Homes; order: Follower[]; moved?: LinkId };
const tone = (ok: boolean) => (ok ? 'text-link' : 'text-bad');

export function FiguresLine({ f, pre }: { f: Figures; pre: string }) {
  return <p data-testid={`${pre}-figures`} class="text-sm tabular-nums">
    <span class={tone(f.lowOk)}>Lowest year {f.lowest}{f.lowestFy ? ` (${f.lowestFy})` : ''}</span>
    {' · '}<span class={tone(f.avgOk)}>average {f.average}</span>
    {' · '}<span class={`font-medium ${tone(f.works)}`}>{f.works ? 'meets the bank’s figures' : 'does not meet them yet'}</span>
  </p>;
}

/** Worked on a tap; any figure changed but the loan's three answers keeps it open on the new answer. */
export function MakeItWork({ s, update, see, round }: { s: State; update: Update; see: (t: LinkTerms) => void; round: number }) {
  const key = roundKey(s);
  const [open, setOpen] = useState<string>();
  const u = useMemo(() => (open === key ? setupOf(s) : undefined), [open, key, s]);
  const m = amountOf(s.ownMost ?? ''), most = m ?? 0, asked = m !== undefined;
  const plans = useMemo(() => (u && asked ? optionsOf(u, most) : []), [u, asked, most]);
  const levers = useMemo(() => u?.levers(most) ?? [], [u, most]);
  // The sliders' place, kept against the terms they started from: a new answer from the form starts them afresh.
  const start = u ? JSON.stringify(u.typed) : '';
  const [at, setAt] = useState<At>();
  const here: At | undefined = at && at.on === start + most ? at : u ? (() => { const l = startOf(u, u.typed); return l && { on: start + most, live: l, homes: {}, order: [] }; })() : undefined;

  if (open !== key) {
    // The one filled button on a short result (docs/DESIGN.md, principle 6); it removes itself, so the focus moves on (WCAG 2.4.3).
    return <button type="button" data-testid="dscr-viable" class={`mt-2 ${FILLED}`} onClick={() => {
      setOpen(key); setAt(undefined);
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-testid="dscr-plan"]')?.focus());
    }}>Make it work</button>;
  }
  if (!u) return <p data-testid="dscr-plan" tabIndex={-1} class="mt-2 text-sm text-ink">Answer the loan’s amount, repayment and rate first.</p>;

  const move = (id: LinkId, v: number, done: boolean) => {
    if (!here) return;
    const l = moveOf(u, most, { ...here.live.terms, [id]: v }, id, here.homes, here.order, done);
    if (!l) return;
    const f = id === 'ratePct' ? undefined : (id as Follower);
    const homes = done && f ? { ...here.homes, [f]: l.terms[f] } : here.homes;
    const order = done && f ? [...here.order.filter((x) => x !== f), f] : here.order;
    setAt({ on: start + most, live: l, homes, order, moved: id });
  };
  const from = (t: LinkTerms) => { const l = startOf(u, t); if (l) setAt({ on: start + most, live: l, homes: { amount: t.amount, instalments: t.instalments }, order: [] }); };
  const live = here?.live;

  return <div data-testid="dscr-plan" tabIndex={-1} class="mt-6 border-t-2 border-ink pt-4">
    <h3 class="text-title text-ink">Make it work</h3>
    <Choice name="dscr-own" legend="Can you bring some of your own money into the project?" columns
      options={u.choices} value={asked ? String(most) : undefined} onChange={(ownMost) => update((x) => ({ ...x, ownMost }))} />
    {asked && <>
      <h4 class="mt-4 text-sm font-medium text-ink">Ready plans</h4>
      <p class={HINT}>Each meets the bank’s figures. Their cost differs; which suits you is yours to weigh.</p>
      {(() => { const w = ownShortOf(u, most, plans); return w && <p data-testid="dscr-plans-own-short" class="mt-1 text-sm text-ink">{w}</p>; })()}
      {plans.length === 0 && <p data-testid="dscr-plans-none" class="mt-2 text-sm text-bad">No plan within the limits meets the bank’s figures. The sliders show how near each lever comes.</p>}
      <ul data-testid="dscr-plans" class="mt-2 grid gap-2 sm:grid-cols-3">{plans.map((o) => <li key={o.id} data-testid={`dscr-plan-${o.id}`} class="rounded-card border border-line p-3 new:border-0 new:bg-surface">
        <h5 class="font-medium text-ink">{o.title}</h5>
        <dl class="mt-1 text-sm tabular-nums">{o.lines.map(([k, v]) => <div key={k} class="flex justify-between gap-2"><dt class="text-ink-muted">{k}</dt><dd class="text-right text-ink">{v}</dd></div>)}</dl>
        {o.more && <p class={HINT}>{o.more}</p>}
        <button type="button" data-testid={`dscr-plan-from-${o.id}`} class={`mt-2 scroll-mb-40 ${BUTTON}`} onClick={() => from(o.terms)}>Start from this plan</button>
      </li>)}</ul>

      <h4 class="mt-4 text-sm font-medium text-ink">Try it with your own hands</h4>
      <p class={HINT}>Move one: it stays where you put it, one other follows to keep the plan meeting the bank’s figures, and the third stays.</p>
      {live && <ul class="mt-2 space-y-2">{levers.map((l) => {
        const v = live.terms[l.id], badge = here?.moved === l.id ? 'You set this' : live.follower === l.id ? 'Follows' : undefined;
        return <li key={l.id} data-testid={`dscr-lever-${l.id}`} class="rounded-lg border border-line p-3 new:border-0 new:bg-surface">
          <div class="flex items-baseline justify-between gap-2">
            <label for={`dscr-slider-${l.id}`} class="font-medium text-ink">{l.label}
              {badge && <span data-testid={`dscr-badge-${l.id}`} class="ml-2 rounded-full bg-canvas px-2 py-0.5 text-xs font-normal text-ink-muted">{badge}</span>}</label>
            <span data-testid={`dscr-move-${l.id}`} class="shrink-0 text-lg font-semibold tabular-nums text-ink">{l.words(v)}</span>
          </div>
          <input id={`dscr-slider-${l.id}`} type="range" min={l.min} max={l.max} step={l.step} value={v} aria-valuetext={l.words(v)}
            onInput={(e) => move(l.id, Number((e.currentTarget as HTMLInputElement).value), false)}
            onChange={(e) => move(l.id, Number((e.currentTarget as HTMLInputElement).value), true)} class="mt-2 h-6 w-full scroll-mb-40 accent-ink" />
          <div class="flex justify-between text-xs text-ink-muted tabular-nums"><span>{l.ends[0]}</span><span>{l.ends[1]}</span></div>
          {l.id === 'ratePct' && <p class={HINT}>The rate is the bank’s to offer; moving it shows what a better rate would do, and it never moves on its own. It goes no lower than {LEVELS.rate.floorPct}%, RBI’s policy repo rate.</p>}
        </li>;
      })}</ul>}
      {live && <div data-testid="dscr-plan-line" aria-live="polite" class="sticky bottom-10 mt-2 border-t border-line bg-canvas py-2">
        <FiguresLine f={live.fig} pre="dscr-plan" />
        <p class="text-sm tabular-nums text-ink">{live.instalment} · interest over the loan {live.interest}</p>
        {live.stop && <p data-testid="dscr-plan-stop" class="text-sm text-bad">{live.stop}</p>}
      </div>}
      {live && <button type="button" data-testid="dscr-plan-use" class={`mt-2 ${FILLED}`} onClick={() => see(live.terms)}>See round {round}</button>}
      <p class={HINT}>This writes the loan, its repayment and its rate into the form above, so the whole answer and the downloads follow it. Your earlier rounds stay listed to go back to.</p>
    </>}
  </div>;
}

/** The rounds tried (LOOP1b): each the loan's three answers the borrower saw, its figures and what it changed from the
 * first; a tap on an earlier one writes it back. Kept while nothing but those three answers changes (roundKey). */
export function Rounds({ s, list, back }: { s: State; list: LinkTerms[]; back: (t: LinkTerms) => void }) {
  const now = setupOf(s)?.typed, same = (a: LinkTerms, b?: LinkTerms) => !!b && a.amount === b.amount && a.instalments === b.instalments && a.ratePct === b.ratePct;
  const views = useMemo(() => list.map((t, i) => roundOf(writeTerms(s, t), i ? list[0] : undefined)), [list, s]);
  return <div data-testid="dscr-rounds" class="mt-4">
    <h3 class="text-title text-ink">Your rounds</h3>
    <ol class="mt-1 divide-y divide-line">{views.map((r, i) => r && <li key={i} data-testid={`dscr-round-${i + 1}`} class="py-2">
      <div class="flex items-baseline justify-between gap-2">
        <p class="font-medium text-ink">Round {i + 1}{same(r.terms, now) ? ' (on the page now)' : ''}</p>
        {!same(r.terms, now) && <button type="button" data-testid={`dscr-round-back-${i + 1}`} class={BUTTON} onClick={() => back(r.terms)}>Go back to this</button>}
      </div>
      <p class="text-sm text-ink">{i === 0 ? 'The loan as you typed it.' : r.changed.length ? `You ${r.changed.join('; ')}.` : 'As round 1.'}</p>
      <p class="text-sm tabular-nums text-ink">{r.instalment} · interest over the loan {r.interest}</p>
      <FiguresLine f={r.fig} pre={`dscr-round-${i + 1}`} />
    </li>)}</ol>
  </div>;
}
