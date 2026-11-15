/**
 * The companion beside the questions (NEW2, docs/WORKED-PAGE.md §7, docs/REPORT-GRADE.md §6): never the paper itself.
 * What the report reads so far, its one picture, its outline (each section a way to the step that fills it) and its
 * pages as small pictures, open or, before the gate, the first one real and the rest blank. Beside the questions from
 * 1024 px; on a phone behind "See the report". Every figure is the engine's (companion.ts).
 */
import type { Doc } from '../doc/doc';
import { Paper, sheetCount } from '../Paper';
import { Bars } from '../worked/Bars';
import { BUTTON, FILLED } from '../fields';
import { chartRows, outlineOf, readingOf, type StepKey } from './companion';
import type { CarryView, ReportPreview, ReportState } from './model';

export function Companion({ s, p, cv, left, ok, step, go, paper, pages, open, onOpen, sheet }: {
  s: ReportState; p: ReportPreview; cv?: CarryView; left: Record<StepKey, number>; ok: boolean; step: StepKey; go: (id: StepKey) => void;
  paper: Doc; pages: [string, number][]; open: boolean; onOpen: () => void;
  /** In the sheet on a phone, whose own head names it: no second heading. */
  sheet?: boolean;
}) {
  const r = readingOf(p, cv), rows = chartRows(p), items = outlineOf(s, p, left, ok, step), n = sheetCount(paper);
  const chip = open ? paper.mark ?? 'Ready' : 'Sample';
  return <div data-testid="rep-companion" class="companion">
    <div class="flex items-center gap-2">
      {!sheet && <h2 class="text-base font-semibold text-ink">Your report</h2>}
      <span data-testid="rep-chip" class="rounded-full bg-ink/6 px-2.5 py-0.5 text-xs font-medium text-ink-muted">{chip}</span>
    </div>
    <div data-testid="rep-reading" class="mt-3 border-b border-line pb-3" aria-live="polite">
      {r.wait ? <p class="text-sm text-ink-muted">{r.wait}</p> : <>
        {r.line && <p data-testid="rep-reading-line" class="text-lg leading-snug font-semibold text-ink">{r.line}</p>}
        {r.figures.length > 0 && <dl class="mt-2 grid grid-cols-2 gap-3">{r.figures.map((f) => <div key={f.label}>
          <dt class="text-xs text-ink-muted">{f.label}</dt>
          <dd class={`text-xl font-semibold tabular-nums ${f.ok ? 'text-ink' : 'text-bad'}`}>{f.value}</dd>
          <dd class="text-xs text-ink-muted">Usual: {f.level}</dd>
        </div>)}</dl>}
      </>}
    </div>
    {rows.length > 0 && <div data-testid="rep-chart" class="mt-3 border-b border-line pb-3">
      <p class="mb-1 text-sm font-medium text-ink">Cash for the loan against what is due</p>
      <Bars title="Cash for the loan against what is due, each year" aName="Cash for the loan" bName="Due on the loan" unit="₹ lakh" tightName="tightest" rows={rows} />
    </div>}
    <h3 class="mt-4 text-sm font-semibold text-ink">What the report holds</h3>
    <ol data-testid="rep-outline" class="mt-1 border-t border-line">{items.map((x) => <li key={x.part} class="border-b border-line">
      <button type="button" data-testid="rep-outline-item" aria-current={x.here ? 'step' : undefined} onClick={() => go(x.step)}
        class={`grid min-h-11 w-full grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-2 py-1 text-left text-sm hover:bg-ink/6 ${x.here ? 'font-semibold' : ''}`}>
        <span aria-hidden="true" class={x.state === 'ready' ? 'text-good' : 'text-ink-muted'}>{x.state === 'ready' ? '✓' : '○'}</span>
        <span class="text-ink">{x.title}</span>
        <span class={`text-xs ${x.state === 'open' ? 'text-warn' : 'text-ink-muted'}`}>{x.here && <span class="font-normal text-ink-muted">You are here · </span>}{x.text}</span>
      </button>
    </li>)}</ol>
    <h3 class="mt-4 text-sm font-semibold text-ink">The pages</h3>
    {/* Small pictures of the pages, a mouse's way in; the button below is everyone's. */}
    <div data-testid="rep-thumbs" class={`thumbs mt-2${open ? ' cursor-zoom-in' : ''}`} data-locked={open ? undefined : ''} aria-hidden="true" onClick={open ? onOpen : undefined}>
      {open ? <Paper doc={paper} pages={pages} label="" bare /> : <>
        <Paper doc={paper} pages={pages} label="" bare only={1} />
        {Array.from({ length: Math.max(0, n - 1) }, (_, i) => <div key={i} class="sheet paper shadow-paper thumb-ghost"><div class="sheet-in"><div class="sheet-ghost">
          {Array.from({ length: 12 }, (_, k) => <span key={k} />)}</div></div></div>)}
      </>}
    </div>
    {open
      ? <button type="button" data-testid="rep-open-paper" class={`mt-3 ${FILLED}`} onClick={onOpen}>Open the full report</button>
      : <div data-testid="rep-locked" class="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
        <span>The first page is real. The other {n - 1} open with the download.</span>
        <button type="button" class={BUTTON} onClick={() => go('check')}>Go to the download</button>
      </div>}
  </div>;
}
