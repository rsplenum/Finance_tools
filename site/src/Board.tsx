/**
 * The board (D-UX-51, D-UX-52), shared by the project report and the CMA: each ratio as a bar against its level, each
 * lever's card worked alone, and each lever's slider in the plan. Test ids carry the page's prefix (`rep`, `cma`).
 * Words and figures come from board-model.ts and the page's own model; none is worked out here.
 */
import type { ComponentChildren } from 'preact';
import type { BoardMove, CheckRow, ViableLine } from './board-model';

const MUTED = 'text-ink-muted';
const TONE = { meets: 'bg-good', misses: 'bg-bad', wait: 'bg-line' } as const;
const INK = { meets: 'text-good', misses: 'text-bad', wait: MUTED } as const;

/** One ratio as a bar against its level (MV2b): the track runs from nil to twice the level, so the level is the line at the
 * middle; a bar at the end of the track says "off the scale" under its end, so 3.62 and 2.51 are not read as one (report
 * finding 11). Under it the rupees its worst year is short, from the engine; `children`, the row's own link (the report's
 * collateral). */
export function Bar({ c, pre = 'rep', children }: { c: CheckRow; pre?: string; children?: ComponentChildren }) {
  const off = c.verdict !== 'wait' && c.bar >= 100;
  return <li data-testid={`${pre}-check-${c.id}`} class="py-1.5">
    <p class="text-sm text-ink">{c.label}</p>
    <div aria-hidden="true" class="relative mt-1 h-3 rounded-full bg-surface">
      <div class={`h-3 rounded-full ${TONE[c.verdict]}`} style={{ width: `${c.verdict === 'misses' ? Math.max(c.bar, 3) : c.bar}%` }} />
      <div class="absolute -inset-y-1 left-1/2 w-0.5 bg-ink" />
    </div>
    <div class="mt-0.5 flex items-baseline justify-between gap-3">
      <p class="text-sm"><span class={`tabular-nums ${INK[c.verdict]}`}>{c.verdict === 'misses' ? 'Misses: ' : c.verdict === 'meets' ? 'Meets: ' : ''}{c.worst}</span>
        <span class={`text-xs ${MUTED}`}> · target {c.level}{c.at === 'most' ? ', a shorter bar is better' : ''}</span></p>
      {off && <p data-testid={`${pre}-off-${c.id}`} class={`shrink-0 text-xs ${MUTED}`}>off the scale</p>}
    </div>
    {c.short && <p data-testid={`${pre}-short-${c.id}`} class="text-sm font-medium text-bad">{c.short}</p>}
    {children}
  </li>;
}

/** A lever on the board: how far it moves, now against needed, and the ratios it brings to their level. */
export function Lever({ l, pre = 'rep' }: { l: ViableLine; pre?: string }) {
  const most = l.bars ? Math.max(l.bars.now, l.bars.to, 1e-9) : 1, w = (x: number) => `${Math.max(0, (x / most) * 100)}%`;
  return <li data-testid={`${pre}-viable-${l.id}`} class={`rounded-lg border p-3 new:border-0 ${l.reach?.out ? 'border-bad new:bg-bad-tint' : 'border-line new:bg-surface'}`}>
    <div class="flex items-baseline justify-between gap-2">
      <span class="font-medium text-ink">{l.head}</span>
      {l.move && <span data-testid={`${pre}-move-${l.id}`} class="shrink-0 text-lg font-semibold tabular-nums text-ink">{l.move}</span>}
    </div>
    {l.bars && <div class="mt-1 space-y-1 text-xs tabular-nums">
      {[['Now', l.bars.now, l.bars.nowText, 'bg-ink-muted'], ['Needed', l.bars.to, l.bars.toText, l.reach?.out ? 'bg-bad' : 'bg-good']].map(([k, x, t, tone]) =>
        <div key={k as string} class="flex items-center gap-2">
          <span class={`w-14 shrink-0 ${MUTED}`}>{k}</span>
          <div aria-hidden="true" class="h-2.5 flex-1 rounded-full bg-surface"><div class={`h-2.5 rounded-full ${tone}`} style={{ width: w(x as number) }} /></div>
          <span class="w-24 shrink-0 text-right text-ink">{t}</span>
        </div>)}
    </div>}
    <Said l={l} pre={pre} />
  </li>;
}

/** What MV2b's board says of a lever worked alone: within reach or not, the ratios it meets and leaves, in words. */
export function Said({ l, alone, pre = 'rep' }: { l: ViableLine; alone?: boolean; pre?: string }) {
  return <>
    {l.reach && <p data-testid={`${pre}-reach-${l.id}`} class={`mt-1.5 text-sm font-medium ${l.reach.out ? 'text-bad' : 'text-warn'}`}>{l.reach.text}</p>}
    {(l.fixes.length > 0 || l.still.length > 0) && <ul class="mt-1.5 flex flex-wrap gap-1 text-xs">
      {alone && <li class={`py-0.5 ${MUTED}`}>Alone:</li>}
      {l.fixes.map((f) => <li key={f} class="rounded-full bg-good-tint px-2 py-0.5 text-good">✓ {f}</li>)}
      {l.still.map((f) => <li key={f} class="rounded-full bg-bad-tint px-2 py-0.5 text-bad">✗ {f}</li>)}
    </ul>}
    <p class="mt-1.5 text-sm text-ink">{alone && <span class={MUTED}>Alone: </span>}<span data-testid={`${pre}-text-${l.id}`}>{l.text}</span></p>
    {l.note && <p class={`mt-0.5 text-sm ${MUTED}`}>{l.note}</p>}
  </>;
}

/** A lever in the plan (MV3): its slider, set where the plan puts it; how far it moves and the figure it gives, live;
 * and what it does alone (MV2b). A lever that is on or off (`toggle`) is a checkbox. */
export function PlanLever({ id, head, m, value, alone, set, pre = 'rep', toggle }: {
  id: string; head: string; m: BoardMove; value: number; alone?: ViableLine; set: (n: number) => void; pre?: string; toggle?: boolean;
}) {
  return <li data-testid={`${pre}-lever-${id}`} class={`rounded-lg border p-3 new:border-0 ${alone?.reach?.out ? 'border-bad new:bg-bad-tint' : 'border-line new:bg-surface'}`}>
    <div class="flex items-baseline justify-between gap-2">
      {toggle
        ? <label class="flex items-start gap-2 font-medium text-ink"><input id={`${pre}-slider-${id}`} type="checkbox" class="mt-1" checked={value > 0}
          onChange={(e) => set((e.currentTarget as HTMLInputElement).checked ? 1 : 0)} />{head}</label>
        : <label for={`${pre}-slider-${id}`} class="font-medium text-ink">{head}</label>}
      <span data-testid={`${pre}-move-${id}`} class="shrink-0 text-lg font-semibold tabular-nums text-ink">{m.move}</span>
    </div>
    {!toggle && m.max > 0 && <input id={`${pre}-slider-${id}`} type="range" min={m.min ?? 0} max={m.max} step={1} value={value} aria-valuetext={`${m.move}: ${m.to}`}
      onInput={(e) => set(Number((e.currentTarget as HTMLInputElement).value))} class="mt-2 h-6 w-full accent-accent" />}
    <p data-testid={`${pre}-to-${id}`} class="text-sm tabular-nums text-ink">{m.to}</p>
    {alone && <Said l={alone} alone pre={pre} />}
  </li>;
}
