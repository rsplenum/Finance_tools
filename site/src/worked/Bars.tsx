/**
 * The picture (docs/WORKED-PAGE.md §4 part 3): two amounts a year, as bars by length on one scale, each also a figure at
 * its end, the tightest year marked. No reference line crosses a figure (`docs/lessons/design.md`). Drawn from rows the
 * tool's view builder hands in; nothing worked out here but each bar's share of the longest.
 */
export interface BarRow { key: string; label: string; a: number; b: number; aText: string; bText: string; tight?: boolean; note?: string; spoken: string }

export function Bars(p: { title: string; aName: string; bName: string; unit: string; tightName: string; rows: BarRow[] }) {
  const most = Math.max(1, ...p.rows.flatMap((r) => [r.a, r.b]));
  // The longest bar leaves room for its figure; a bar never shorter than a sliver, so a small amount still shows.
  const width = (n: number) => ({ width: `max(3px, calc((100% - 3.5rem) * ${Math.max(0, n) / most}))` });
  return <figure data-testid="bars" class="m-0">
    <figcaption class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
      <span class="sr-only">{p.title}, {p.unit}.</span>
      <span aria-hidden="true" class="inline-flex items-center gap-1.5"><span class="h-2 w-4 rounded-sm bg-ink" />{p.aName}</span>
      <span aria-hidden="true" class="inline-flex items-center gap-1.5"><span class="h-2 w-4 rounded-sm bg-ink-muted/45" />{p.bName}</span>
      <span aria-hidden="true" class="ml-auto">{p.unit}</span>
    </figcaption>
    <ul class="mt-1.5 space-y-0.5">
      {p.rows.map((r) => <li key={r.key} data-testid={`bar-${r.key}`} aria-label={r.spoken}
        class={`grid grid-cols-[4.75rem_1fr] items-center gap-x-2 rounded-control py-px pr-1 ${r.tight ? 'bg-warn-tint' : ''}`}>
        <span aria-hidden="true" class="pl-1.5 text-sm leading-[1.0625rem] text-ink tabular-nums">{r.label}
          {(r.tight || r.note) && <span class={`block ${r.tight ? 'font-semibold text-warn' : 'text-ink-muted'}`}>{r.tight ? p.tightName : r.note}</span>}
        </span>
        <span aria-hidden="true" class="grid">
          <span class="flex h-[1.0625rem] items-center gap-1.5"><span class="h-2 rounded-sm bg-ink motion-safe:transition-[width] motion-safe:duration-300" style={width(r.a)} />
            <span class="text-sm leading-none font-semibold text-ink tabular-nums">{r.aText}</span></span>
          <span class="flex h-[1.0625rem] items-center gap-1.5"><span class="h-2 rounded-sm bg-ink-muted/45 motion-safe:transition-[width] motion-safe:duration-300" style={width(r.b)} />
            <span class="text-sm leading-none text-ink-muted tabular-nums">{r.bText}</span></span>
        </span>
      </li>)}
    </ul>
  </figure>;
}
