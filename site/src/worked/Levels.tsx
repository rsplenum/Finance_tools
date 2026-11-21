/**
 * A ratio by year against the level a lender looks for (NEW1b): one bar a year on one scale from 0, the level a thin ink
 * line across the bars only. Each year's figure sits in its own column on the right, so the line never crosses a figure
 * (docs/lessons/design.md). A year below the level is told three ways, never by colour alone: its bar in the warning
 * colour, a ↓ beside its figure on the same line, and the count said once above (Rahul, 21-11-2026: no word wrapped
 * under each figure). One series: the title names it and the caption names the line. Drawn from rows the tool's view builder hands in; nothing worked out here but each
 * bar's share of the scale.
 */
export interface LevelRow { key: string; label: string; n: number; text: string; below: boolean; note?: string; spoken: string }

export function Levels(p: { title: string; level: number; lineName: string; belowLine?: string; rows: LevelRow[] }) {
  const most = Math.max(p.level * 1.3, ...p.rows.map((r) => r.n));
  const at = (n: number) => `${(Math.max(0, Math.min(n, most)) / most) * 100}%`;
  return <figure data-testid="levels" class="m-0">
    <figcaption class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <span class="text-base font-semibold text-ink">{p.title}</span>
      <span class="inline-flex items-center gap-1.5 text-sm text-ink-muted"><span aria-hidden="true" class="h-3.5 w-0.5 rounded-full bg-ink" />{p.lineName}</span>
      {p.belowLine && <span data-testid="levels-below" class="w-full text-sm font-medium text-bad"><span aria-hidden="true">↓ </span>{p.belowLine}</span>}
    </figcaption>
    <ul class="mt-2 space-y-1.5">
      {p.rows.map((r) => <li key={r.key} data-testid={`level-${r.key}`} aria-label={r.spoken} title={r.spoken}
        class="grid grid-cols-[4.75rem_minmax(0,1fr)_3.5rem] items-center gap-x-2 rounded-control hover:bg-ink/4">
        <span aria-hidden="true" class="text-sm leading-tight text-ink tabular-nums">{r.label}{r.note && <span class="block text-ink-muted">{r.note}</span>}</span>
        <span aria-hidden="true" class="relative h-6">
          <span class={`absolute inset-y-1 left-0 rounded-r-[4px] motion-safe:transition-[width] motion-safe:duration-300 ${r.below ? 'bg-bad' : 'bg-accent'}`} style={{ width: at(r.n) }} />
          <span class="absolute -inset-y-0.5 w-0.5 -translate-x-1/2 rounded-full bg-ink shadow-[0_0_0_2px_var(--canvas)]" style={{ left: at(p.level) }} />
        </span>
        <span aria-hidden="true" class="text-right text-sm leading-tight whitespace-nowrap tabular-nums">
          {r.below && <span class="mr-0.5 font-semibold text-bad">↓</span>}<span class={`font-semibold ${r.below ? 'text-bad' : 'text-ink'}`}>{r.text}</span></span>
      </li>)}
    </ul>
  </figure>;
}

/**
 * The same picture drawn large for a band of the ink desk (DSCR-D), the page's twin of page 1 of the paper: one row a
 * year, its bar on one scale from 0, the level one marigold line down every row (rows touch, so it reads as one line),
 * each figure in its own column so the line never crosses one. With motion allowed the bars grow in turn once in view
 * toward figures already there, whole (D-UX-295; global.css, "Grow"); without it, all stands at rest.
 */
export function LevelBand(p: { level: number; lineName: string; belowLine?: string; rows: LevelRow[] }) {
  const most = Math.max(p.level * 1.3, ...p.rows.map((r) => r.n));
  const at = (n: number) => `${(Math.max(0, Math.min(n, most)) / most) * 100}%`;
  return <figure data-testid="levels" data-settle data-grow class="m-0">
    <figcaption class="flex flex-wrap items-center gap-x-4 gap-y-1 text-base text-ink-muted">
      <span class="inline-flex items-center gap-2"><span aria-hidden="true" class="h-4 w-0.5 shrink-0 rounded-full bg-marigold" />{p.lineName}</span>
      {p.belowLine && <span data-testid="levels-below" class="font-medium text-bad"><span aria-hidden="true">↓ </span>{p.belowLine}</span>}
    </figcaption>
    <ul class="mt-4">
      {p.rows.map((r, i) => <li key={r.key} data-testid={`level-${r.key}`} aria-label={r.spoken} title={r.spoken} style={{ '--i': i }}
        class="grid grid-cols-[5rem_minmax(0,1fr)_4.5rem] items-stretch gap-x-3">
        <span aria-hidden="true" class="self-center py-1.5 text-base leading-tight text-ink tabular-nums">{r.label}{r.note && <span class="block text-sm text-ink-muted">{r.note}</span>}</span>
        <span aria-hidden="true" class="relative min-h-11">
          <span data-bar class={`absolute inset-y-2.5 left-0 rounded-r-md ${r.below ? 'bg-bad' : 'bg-ink'}`} style={{ width: at(r.n) }} />
          <span class="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-marigold shadow-[0_0_0_2px_var(--canvas)]" style={{ left: at(p.level) }} />
        </span>
        <span aria-hidden="true" class="self-center text-right leading-tight whitespace-nowrap">
          {r.below && <span class="mr-1 text-base font-semibold text-bad">↓</span>}<span class={`figure text-xl ${r.below ? 'text-bad' : 'text-ink'}`}>{r.text}</span></span>
      </li>)}
    </ul>
  </figure>;
}
