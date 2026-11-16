/**
 * The companion beside the questions (NEW2, docs/WORKED-PAGE.md §7, docs/REPORT-GRADE.md §6): never the paper itself.
 * What the report reads so far, its one picture, its outline (each section a way to the step that fills it) and its
 * pages as small pictures, open or, before the gate, the first one real and the rest blank. Beside the questions from
 * 1024 px; on a phone behind "See the report". Every figure is the engine's (companion.ts).
 */
import type { ComponentChildren } from 'preact';
import type { Doc } from '../doc/doc';
import { Paper, sheetCount } from '../Paper';
import { Bars } from '../worked/Bars';
import { FILLED } from '../fields';
import { Outline } from './CheckPage';
import { chartRows, outlineOf, readingOf, type StepKey } from './companion';
import type { CarryView, ReportPreview, ReportState } from './model';
import { levelFor } from '../../../engine/ratios';
import { levelsOf } from '../board-model';

/** The report sample while the pages are locked (Rahul's review of the check, 16-11-2026): its first three pages, the
 * cover, the contents and the report at a glance, real; the rest open with the download. */
export const SAMPLE = 3;
export const SAMPLE_WORDS = 'View report sample';
export const lockedWords = (n: number) => (n > SAMPLE ? `Pages 1 to ${SAMPLE} show here. The other ${n - SAMPLE} open with the download.` : 'Every page shows here.');

export function Companion({ s, p, cv, left, ok, step, go, paper, pages, open, onOpen, sheet, check }: {
  s: ReportState; p: ReportPreview; cv?: CarryView; left: Record<StepKey, number>; ok: boolean; step: StepKey; go: (id: StepKey) => void;
  paper: Doc; pages: [string, number][]; open: boolean; onOpen: () => void;
  /** In the sheet on a phone, whose own head names it: no second heading. */
  sheet?: boolean;
  /** On the check from 1024 px (Rahul's desktop note, 15-11-2026; D-UX-374): the panel keeps its column and its place, and
   * its top holds the answer, then the check page's parts as links and the pages. The rest of the panel is the page beside. */
  check?: { answer: ComponentChildren; parts?: { id: string; label: string; mark?: string }[] };
}) {
  const head = <div class="flex items-center gap-2">
    {!sheet && <h2 class="text-base font-semibold text-ink">Your report</h2>}
    <span data-testid="rep-chip" class="rounded-full bg-ink/6 px-2.5 py-0.5 text-xs font-medium text-ink-muted">{open ? paper.mark ?? 'Ready' : 'Sample'}</span>
  </div>;
  if (check) return <div data-testid="rep-companion" data-check class="companion">
    {head}
    <div class="mt-3">{check.answer}</div>
    {check.parts && <div class="mt-5"><Outline items={check.parts} /></div>}
    {check.parts && <button type="button" data-testid="rep-pages" class={`mt-4 ${FILLED}`} onClick={onOpen}>{open ? 'See the pages' : SAMPLE_WORDS}</button>}
  </div>;
  const r = readingOf(p, cv), level = levelFor('dscrLowest', 'fresh', levelsOf(s.benchmarks)), rows = chartRows(p, level), items = outlineOf(s, p, left, ok, step), n = sheetCount(paper);
  return <div data-testid="rep-companion" class="companion">
    {head}
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
      <Bars title="Cash for the loan against what is due, each year" aName="Cash for the loan" bName="Due on the loan" unit="₹ lakh" tightName={`below ${level}`} rows={rows} />
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
    <div data-testid="rep-thumbs" class="thumbs mt-2 cursor-zoom-in" data-locked={open ? undefined : ''} aria-hidden="true" onClick={onOpen}>
      <Paper doc={paper} pages={pages} label="" bare only={open ? undefined : SAMPLE} />
    </div>
    {/* Locked (before PAY1): the sample's three pages are real (Rahul's review of the check, 16-11-2026: the cover, the
        contents and the report at a glance), the rest blank until the download. */}
    {!open && <p data-testid="rep-locked" class="mt-2 text-sm text-ink-muted">{lockedWords(n)}</p>}
    <button type="button" data-testid="rep-open-paper" class={`mt-3 ${FILLED}`} onClick={onOpen}>{open ? 'Open the full report' : SAMPLE_WORDS}</button>
  </div>;
}
