/**
 * A ratio by year against the level a lender looks for (NEW1b): one bar a year on one scale from 0, the level a thin ink
 * line across the bars only. Each year's figure sits in its own column on the right, so the line never crosses a figure
 * (docs/lessons/design.md), and a year below the level says so in words, not by colour alone. One series: the title names
 * it and the caption names the line. Drawn from rows the tool's view builder hands in; nothing worked out here but each
 * bar's share of the scale.
 */
export interface LevelRow { key: string; label: string; n: number; text: string; below: boolean; note?: string; spoken: string }

export function Levels(p: { title: string; level: number; lineName: string; belowName: string; rows: LevelRow[] }) {
  const most = Math.max(p.level * 1.3, ...p.rows.map((r) => r.n));
  const at = (n: number) => `${(Math.max(0, Math.min(n, most)) / most) * 100}%`;
  return <figure data-testid="levels" class="m-0">
    <figcaption class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <span class="text-base font-semibold text-ink">{p.title}</span>
      <span class="inline-flex items-center gap-1.5 text-sm text-ink-muted"><span aria-hidden="true" class="h-3.5 w-0.5 rounded-full bg-ink" />{p.lineName}</span>
    </figcaption>
    <ul class="mt-2 space-y-1.5">
      {p.rows.map((r) => <li key={r.key} data-testid={`level-${r.key}`} aria-label={r.spoken} title={r.spoken}
        class="grid grid-cols-[4.75rem_minmax(0,1fr)_3.75rem] items-center gap-x-2 rounded-control hover:bg-ink/4">
        <span aria-hidden="true" class="text-sm leading-tight text-ink tabular-nums">{r.label}{r.note && <span class="block text-ink-muted">{r.note}</span>}</span>
        <span aria-hidden="true" class="relative h-6">
          <span class="absolute inset-y-1 left-0 rounded-r-[4px] bg-accent motion-safe:transition-[width] motion-safe:duration-300" style={{ width: at(r.n) }} />
          <span class="absolute -inset-y-0.5 w-0.5 -translate-x-1/2 rounded-full bg-ink shadow-[0_0_0_2px_var(--canvas)]" style={{ left: at(p.level) }} />
        </span>
        <span aria-hidden="true" class="text-right text-sm leading-tight tabular-nums">
          <span class="font-semibold text-ink">{r.text}</span>{r.below && <span class="block text-xs font-medium text-bad">{p.belowName}</span>}</span>
      </li>)}
    </ul>
  </figure>;
}
