/**
 * Fix it for me (FIX1, D-UX-346, D-UX-351): one tap under the verdict gives up to three whole plans that pass every
 * check, each a card of its moves as "was → becomes" with "Use this plan". When none passes within the limits, one card,
 * "The nearest", says what stays short, each with a link to its box. The plans come from engine/solve.ts through
 * model.ts; nothing is worked here. The search runs the report some hundreds of times, so it starts only on the tap,
 * after "Working it out…" has painted, and shows only on the answers it was worked on.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { BUTTON, FILLED, HINT } from '../fields';
import { W } from './words';
import { solvedOf, type FixCard, type FixView, type ReportState } from './model';

export function FixIt({ s, useFix, toField }: { s: ReportState; useFix: (c: FixCard) => void; toField: (id: string) => (e: Event) => void }) {
  const on = useMemo(() => JSON.stringify(s), [s]);
  const [got, setGot] = useState<{ on: string; v: FixView | undefined }>();
  const [asked, setAsked] = useState<string>();
  useEffect(() => {
    if (asked !== on || got?.on === on) return;
    const t = setTimeout(() => {
      setGot({ on, v: solvedOf(s) });
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-testid="rep-fix-plans"]')?.focus());
    }, 50);
    return () => clearTimeout(t);
  }, [asked, on]);
  const v = got?.on === on ? got : undefined;
  if (!v) return <div class="mt-3">
    {asked === on ? <p data-testid="rep-fix-wait" role="status" class="text-sm text-ink">{W.fixWait}</p>
      : <button type="button" data-testid="rep-fix" class={FILLED} onClick={() => setAsked(on)}>{W.fix}</button>}
    <p class={HINT}>{W.fixLead}</p>
  </div>;
  const f = v.v;
  return <div data-testid="rep-fix-plans" tabIndex={-1} class="mt-3">
    {!f ? <p data-testid="rep-fix-none" class="text-sm text-ink">{W.fixNone}</p>
      : f.plans.length ? <>
        <p class="text-sm text-ink">{f.plans.length === 1 ? W.fixOne : W.fixMany}</p>
        <ul class="mt-2 space-y-2">{f.plans.map((c) => <li key={c.id} data-testid={`rep-fix-plan-${c.id}`} class="rounded-control bg-surface p-3">
          <p class="font-medium text-ink">{c.title}</p>
          <ul data-testid={`rep-fix-moves-${c.id}`} class="mt-1 space-y-0.5 text-sm text-ink tabular-nums">{c.lines.map((t) => <li key={t}>{t}</li>)}</ul>
          {c.brings && <p data-testid={`rep-fix-brings-${c.id}`} class="mt-1 text-sm text-ink">{c.brings}</p>}
          <p data-testid={`rep-fix-passes-${c.id}`} class="mt-1 text-sm text-good">{c.passes}</p>
          <button type="button" data-testid={`rep-fix-use-${c.id}`} class={`mt-2 ${FILLED}`} onClick={() => useFix(c)}>{W.fixUse}</button>
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
