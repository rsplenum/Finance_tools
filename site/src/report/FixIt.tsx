/**
 * The mixes of smaller changes (FIX1, D-UX-346, D-UX-351; CHECK1): the last part of "Make it work", after the single
 * ways. One quiet button gives up to three whole plans that pass every check, each a card of its moves as "was →
 * becomes" with "Use this", the same words as every way above it. When no single way works (`auto`) the mixes are
 * worked without the tap, since they are then the only answer. When none passes within the limits, one card, "The
 * nearest", says what stays short, each with a link to its box. The plans come from engine/solve.ts through model.ts;
 * nothing is worked here. The search runs the report some hundreds of times, so it starts after "Working it out…" has
 * painted, and shows only on the answers it was worked on.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { BUTTON, HINT } from '../fields';
import { W } from './words';
import { solvedOf, type FixCard, type FixView, type ReportState } from './model';

export function FixIt({ s, useFix, toField, auto }: { s: ReportState; useFix: (c: FixCard) => void; toField: (id: string) => (e: Event) => void;
  /** No single way makes it work: the mixes are worked at once, and nothing takes the focus as they arrive. */
  auto?: boolean }) {
  const on = useMemo(() => JSON.stringify(s), [s]);
  const [got, setGot] = useState<{ on: string; v: FixView | undefined }>();
  const [asked, setAsked] = useState<string>();
  const wanted = auto || asked === on;
  useEffect(() => {
    if (!wanted || got?.on === on) return;
    const t = setTimeout(() => {
      setGot({ on, v: solvedOf(s) });
      if (!auto) requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-testid="rep-fix-plans"]')?.focus());
    }, 50);
    return () => clearTimeout(t);
  }, [wanted, on]);
  const v = got?.on === on ? got : undefined;
  if (!v) return <div class="mt-4">
    {wanted ? <p data-testid="rep-fix-wait" role="status" class="text-sm text-ink">{W.fixWait}</p>
      : <><button type="button" data-testid="rep-fix" class={BUTTON} onClick={() => setAsked(on)}>{W.mixAsk}</button>
        <p class={HINT}>{W.mixLead}</p></>}
  </div>;
  const f = v.v;
  return <div data-testid="rep-fix-plans" tabIndex={-1} class="mt-4">
    {!f ? <p data-testid="rep-fix-none" class="text-sm text-ink">{W.fixNone}</p>
      : f.plans.length ? <>
        {auto ? <p class="text-sm text-ink">{W.mixOnly}</p> : <h4 class="font-medium text-ink">{W.mix}</h4>}
        <ul class="mt-2 space-y-2">{f.plans.map((c) => <li key={c.id} data-testid={`rep-fix-plan-${c.id}`} class="rounded-control bg-surface p-3">
          <p class="font-medium text-ink">{c.title}</p>
          <ul data-testid={`rep-fix-moves-${c.id}`} class="mt-1 space-y-0.5 text-sm text-ink tabular-nums">{c.lines.map((t) => <li key={t}>{t}</li>)}</ul>
          {c.brings && <p data-testid={`rep-fix-brings-${c.id}`} class="mt-1 text-sm text-ink">{c.brings}</p>}
          <p data-testid={`rep-fix-passes-${c.id}`} class="mt-1 text-sm text-good">{c.passes}</p>
          <button type="button" data-testid={`rep-fix-use-${c.id}`} class={`mt-2 ${BUTTON}`} onClick={() => useFix(c)}>{W.use}</button>
        </li>)}</ul>
      </> : <div data-testid="rep-fix-nearest" class="rounded-control bg-surface p-3">
        <p class="font-medium text-ink">{W.fixNearest}</p>
        <p class="mt-1 text-sm text-ink">{W.fixNearestLead}</p>
        <ul class="mt-1 space-y-1 text-sm">{f.nearest?.still.map((t) => <li key={t.text} class="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span class="text-bad">{t.text}</span>
          <a href={`#${t.field}`} class={BUTTON} onClick={toField(t.field)}>{t.box}</a>
        </li>)}</ul>
      </div>}
  </div>;
}
