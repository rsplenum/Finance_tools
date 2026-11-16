/**
 * The check page's parts (Rahul's notes of 15-11-2026, D-UX-372): the report as one summary whose figures edit where
 * they sit; the one table of benchmark ratios, a benchmark changed in the table itself (a wheel on a phone); and What if.
 * Every figure is the engine's, via model.ts, check.ts and engine/what-if.ts; nothing is worked out here.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import { parseMonth } from '../../../engine/parse';
import { levelFor, type RatioId } from '../../../engine/ratios';
import { whatIfTable, type WhatIfRow } from '../../../engine/what-if';
import { benchmarkFields, levelsOf, withBenchmark, type CheckRow, type ViableLine, type ViableView } from '../board-model';
import { BUTTON, HINT, SourceNote, TextField, Tick, goTo, useDraft } from '../fields';
import { plain, SHARED } from '../words';
import { summaryOf, type Box, type Pick, type SumLine, type SumSection } from './check';
import { amountOf, heldOf, inputOf, plainOf, type CarryView, type ReportPreview, type ReportState, type WorkView } from './model';
import { PLAIN, SHORT, W } from './words';

type Update = (f: (s: ReportState) => ReportState) => void;
const MUTED = 'text-ink-muted';

/** Is a box's text understood: the read-back under it when not. */
const misread = (b: Box, t: string) => {
  if (!t.trim() || b.kind === 'text') return undefined;
  if (b.kind === 'amount') return amountOf(t) === undefined ? 'Not understood. Type 6,00,000 or 6 L.' : undefined;
  if (b.kind === 'month') return parseMonth(t) ? undefined : 'Not understood. Type 2027-03 or Mar 2027.';
  return b.key === 'utilisation' || plainOf(t) !== undefined ? undefined : 'Not understood. Type a number, like 10.';
};

/** A box in place of a figure: the figure's own words as its label, its unit after, committed on leaving or Enter. */
function InBox({ b, update, first, done, same }: { b: Box; update: Update; first: boolean; done: () => void; same?: string }) {
  const [said, setSaid] = useState<string>();
  const d = useDraft(b.text, (t) => { setSaid(misread(b, t)); update((x) => b.set(x, t)); });
  useEffect(() => { if (first) d.ref.current?.focus(); }, []);
  const pre = b.kind === 'amount';
  return <label class="sum-box">
    <span class={b.label === same ? 'sr-only' : 'sum-box-label'}>{b.label}</span>
    <span class="relative block">
      {pre && <span aria-hidden="true" class={`pointer-events-none absolute inset-y-0 left-3 flex items-center ${MUTED}`}>₹</span>}
      <input id={`sum-${b.key}`} data-testid={`sum-${b.key}`} type={b.kind === 'month' ? 'month' : 'text'} autocomplete="off" spellcheck={false} enterkeyhint="done"
        inputMode={b.kind === 'text' || b.kind === 'month' ? undefined : 'decimal'} aria-invalid={!!said || undefined} {...d}
        onKeyDown={(e) => { d.onKeyDown(e); if (e.key === 'Enter' || e.key === 'Escape') { if (e.key === 'Escape') d.onBlur(); done(); } }}
        class={`min-h-11 w-full rounded-control border bg-field py-2 text-base text-ink tabular-nums focus:border-focus ${pre ? 'pl-8' : 'pl-3'} ${b.unit && !pre ? 'pr-20' : 'pr-3'} ${said ? 'border-bad' : 'border-edge'}`} />
      {b.unit && <span aria-hidden="true" class={`pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm ${MUTED}`}>{b.unit}</span>}
    </span>
    {said && <span role="alert" class="mt-1 block text-sm text-bad">{said}</span>}
    {/* What the figure stands on, said with it: the example's values are not the borrower's until changed or kept. */}
    {!b.text.trim() && b.key === 'wcRate' && <span class={`mt-1 block text-xs ${MUTED}`}>Blank: the term loan's rate.</span>}
  </label>;
}

/** A choice in place of a line's words: its options as chips, one tap. */
function InPick({ k, update, done }: { k: Pick; update: Update; done: (keep: boolean) => void }) {
  return <fieldset class="sum-pick">
    <legend class="sr-only">{k.label}</legend>
    {k.options.map((o) => <label key={o.value} class="sum-chip" data-on={o.value === k.value || undefined}>
      <input type="radio" name={`sum-${k.key}`} value={o.value} checked={o.value === k.value} class="sr-only"
        onChange={() => { update((x) => k.set(x, o.value)); done(k.key === 'wcBy' && o.value === 'typed'); }} />
      {o.label}
    </label>)}
  </fieldset>;
}

/** One line of the summary: its words and figure; a figure that can change is a button, and tapped turns into its boxes. */
function Line({ l, update, open, setOpen }: { l: SumLine; update: Update; open: boolean; setOpen: (id?: string) => void }) {
  const close = () => setOpen(undefined);
  return <div data-testid={`rep-sum-${l.id}`} class="sum-line" data-total={l.total || undefined} data-open={open || undefined} data-pencil={l.pencil || undefined}>
    <span class="sum-label">{l.label}{l.pencil && <span class="sum-pencil" title="Still the example’s"> ✎<span class="sr-only"> in pencil, still the example’s</span></span>}</span>
    <span class="sr-only">: </span>
    {l.edit && !open && <button type="button" class="sum-value sum-edit" aria-label={`${l.label}: ${l.value}. Change it`} onClick={() => setOpen(l.id)}>{l.value}</button>}
    {(!l.edit || open) && <span class={`sum-value ${l.worked ? 'sum-worked' : ''}`}>{l.value}</span>}
    {open && l.edit && <div class="sum-editor">
      {l.edit.pick && <InPick k={l.edit.pick} update={update} done={(keep) => { if (!keep) close(); }} />}
      {l.edit.boxes && <div class="sum-boxes">{l.edit.boxes.map((b, i) => <InBox key={b.key} b={b} same={l.label} update={update} first={i === 0 && !l.edit?.pick} done={i === (l.edit?.boxes?.length ?? 1) - 1 ? close : () => {}} />)}</div>}
      <button type="button" data-testid="sum-done" class={`mt-2 ${BUTTON}`} onClick={close}>Done</button>
    </div>}
  </div>;
}

/** The answer in a line, beside what is being changed on a phone (the rest dims while a figure is edited). */
export const Live = ({ cv, work }: { cv?: CarryView; work?: string }) => <p data-testid="rep-live" aria-hidden="true" class="sum-live">
  {cv && <span class="tabular-nums">{cv.bar}</span>}{work && <span class={work === 'Works' ? 'text-good' : 'text-bad'}>{work === 'Works' ? '✓ ' : ''}{work}</span>}
</p>;

/** "Check your figures" (Rahul, 15-11-2026): the whole report as one summary that reads as a finished one; touch a figure
 * to change it where it sits, never a trip back. What is still the example's is marked where it is. */
export function Summary({ s, p, update, state, open, setOpen, live, scheme, toStep, assumed }: {
  s: ReportState; p: ReportPreview; update: Update; state: 'open' | 'lapsed' | 'done'; assumed: Assumption[];
  open?: string; setOpen: (id?: string) => void; live: preact.ComponentChildren; scheme: preact.ComponentChildren; toStep: (to: string) => (e: Event) => void;
}) {
  const secs = summaryOf(s, p), root = useRef<HTMLDivElement>(null);
  // A tap outside the line being changed finishes it (its box commits as it loses the focus).
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!(e.target as HTMLElement).closest?.('[data-open]')) setOpen(undefined); };
    document.addEventListener('pointerdown', away, true);
    return () => document.removeEventListener('pointerdown', away, true);
  }, [open]);
  const section = (g: SumSection) => {
    const here = g.lines.some((l) => l.id === open), pencil = g.lines.some((l) => l.pencil);
    return <section key={g.id} data-testid={`rep-confirm-${g.id}`} aria-labelledby={`sum-${g.id}-h`} class="sum-section dim-able" data-here={here || undefined}>
      {here && live}
      <div class="mb-1 flex items-center justify-between gap-2">
        <h4 id={`sum-${g.id}-h`} class="sum-title">{g.title}</h4>
        {pencil && <span data-testid={`rep-pencil-${g.id}`} class="sum-pencil-tag">✎ In pencil</span>}
        <a href={`#${g.to}`} onClick={toStep(g.to)} aria-label={`All of it: ${g.title}, in its step`} class={`ml-auto inline-flex min-h-6 items-center px-1 text-xs ${MUTED} underline underline-offset-4`}>All of it</a>
      </div>
      {g.lines.map((l) => <Line key={l.id} l={l} update={update} open={open === l.id} setOpen={setOpen} />)}
      {g.id === 'business' && scheme}
    </section>;
  };
  return <section id="check" data-testid="rep-summary" aria-labelledby="check-h" class="mt-8">
    <div class="flex flex-wrap items-baseline justify-between gap-x-3">
      <h3 id="check-h" class="text-title text-ink">Check your figures</h3>
      {state === 'done' && <p data-testid="rep-confirmed" class={`flex items-center gap-1.5 text-sm font-medium text-ink`}><Tick />Checked</p>}
    </div>
    <p class={`max-w-prose ${HINT}`}>Your report in one page. Tap an underlined figure to change it here; <span class="sum-pencil">✎</span> marks what is still the example’s.</p>
    <div ref={root} class="paper shadow-paper sum-paper mt-3 rounded-card">
      {secs.map(section)}
      <Assumed rows={assumed} />
    </div>
  </section>;
}

/** One thing the report assumes until changed (D-UX-32): what, its value in a few words, the whole of it and why. */
export interface Assumption { id: string; what: string; brief?: string; shown: string; why: string; to?: string; go?: (e: Event) => void }

/** What we assumed (Rahul, 15-11-2026: the list under "How this is worked out" opened into "a volcano of text"): the
 * summary's last section, set as its lines are, closed to its count. Each a line, its value in a few words; one that a
 * box changes is tapped to reach it. The whole of each, and why, under one "What each means". */
function Assumed({ rows }: { rows: Assumption[] }) {
  if (!rows.length) return null;
  return <section id="assumed" data-testid="rep-assumed-section" aria-labelledby="assumed-h" class="sum-section dim-able">
    <details data-testid="rep-assumed" class="group">
      <summary class="flex min-h-11 cursor-pointer items-center gap-2 [&::-webkit-details-marker]:hidden">
        <h4 id="assumed-h" class="sum-title">{SHARED.assumed}: {rows.length}</h4>
        <span class="ml-auto text-xs text-link underline underline-offset-4"><span class="group-open:hidden">{SHARED.show}</span><span class="hidden group-open:inline">{SHARED.hide}</span></span>
      </summary>
      {rows.map((r) => <div key={r.id} data-testid={`rep-assumed-${r.id}`} class="sum-line">
        <span class="sum-label">{r.what}</span><span class="sr-only">: </span>
        {r.to ? <a href={`#${r.to}`} onClick={r.go ?? goTo(r.to)} aria-label={`${r.brief ?? r.shown}: ${r.what}. Change it`} class="sum-value sum-edit no-underline">{r.brief ?? r.shown}</a>
          : <span class="sum-value">{r.brief ?? r.shown}</span>}
      </div>)}
      <div class="mt-2"><SourceNote what="What each means, and why">{rows.map((r) => <span key={r.id} class="mt-1 block"><b>{r.what}:</b> {r.shown}. {plain(r.why)}.</span>)}</SourceNote></div>
    </details>
  </section>;
}

// ——— The benchmark ratios ———

/** The wheel's figures: from about 0.4 to 2.5 times the default, by 0.05 (by 0.25 from a default of 3), and the one set. */
const wheelOf = (byDefault: number, now: number) => {
  const step = byDefault >= 3 ? 0.25 : 0.05, lo = Math.max(step, Math.round((byDefault * 0.4) / step) * step), hi = Math.round((byDefault * 2.5) / step) * step;
  const xs: number[] = [];
  for (let v = lo; v <= hi + 1e-9; v += step) xs.push(Math.round(v * 100) / 100);
  if (!xs.some((v) => Math.abs(v - now) < 1e-9)) { xs.push(now); xs.sort((a, b) => a - b); }
  return xs;
};
const ROW = 44;
/** The scroll wheel (Rahul, 15-11-2026): turned with a thumb, a detent a figure; on Android each detent clicks (the
 * vibration API), an iPhone turns silently (Safari has none; D-UX-372). A spin button for the keyboard and screen readers. */
function Wheel({ id, label, values, value, set }: { id: string; label: string; values: number[]; value: number; set: (v: number) => void }) {
  const box = useRef<HTMLDivElement>(null), at = useRef(values.findIndex((v) => Math.abs(v - value) < 1e-9)), timer = useRef<number>();
  const [i, setI] = useState(at.current);
  useLayoutEffect(() => { const k = values.findIndex((v) => Math.abs(v - value) < 1e-9); at.current = k; setI(k); if (box.current) box.current.scrollTop = k * ROW; }, [value, values.length]);
  const settle = () => { clearTimeout(timer.current); timer.current = window.setTimeout(() => { if (Math.abs(values[at.current] - value) > 1e-9) set(values[at.current]); }, 160); };
  const onScroll = () => {
    const k = Math.max(0, Math.min(values.length - 1, Math.round((box.current?.scrollTop ?? 0) / ROW)));
    if (k !== at.current) { at.current = k; setI(k); if ('vibrate' in navigator) navigator.vibrate(6); }
    settle();
  };
  const by = (n: number) => { const k = Math.max(0, Math.min(values.length - 1, at.current + n)); box.current?.scrollTo({ top: k * ROW, behavior: 'smooth' }); };
  return <div class="wheel">
    <div ref={box} id={id} data-testid={id} role="spinbutton" tabIndex={0} aria-label={`${label}: turn to set the benchmark`} aria-valuenow={values[i]} aria-valuemin={values[0]} aria-valuemax={values[values.length - 1]}
      aria-valuetext={values[i]?.toFixed(2)} class="wheel-track" onScroll={onScroll}
      onKeyDown={(e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); by(e.key === 'ArrowUp' ? -1 : 1); } }}>
      {values.map((v, k) => <div key={v} class="wheel-item" data-at={k === i || undefined} onClick={() => box.current?.scrollTo({ top: k * ROW, behavior: 'smooth' })}>{v.toFixed(2)}</div>)}
    </div>
    <div aria-hidden="true" class="wheel-lens" />
  </div>;
}

/** A benchmark's figure, short: "1.25 or more" reads as "1.25+" in the table's narrow column, the words for a screen reader. */
/** "2.07 in 2027-28": the figure, and what it is read on (the year, the loan's life) under it. */
const figOf = (t = ''): [string, string] => { const m = /^(\S+)\s+(.*)$/.exec(t); return m ? [m[1], m[2]] : [t, '']; };
const short = (c: CheckRow) => c.level.replace(/ or more$/, '+').replace(/ or less$/, ' max');

/** The benchmark ratios (Rahul, 15-11-2026): one table, each ratio's benchmark, the business's figure and ✓ or ✗, in place
 * of the list at the top. A benchmark changes in the table itself; the row it moves lights up. What misses is said under
 * the table by its cause, with the rupees short (D-UX-237). */
export function Ratios({ s, p, update, head, w, emphasis, setEmphasis, collateral }: {
  s: ReportState; p: ReportPreview; update: Update; head: string; w?: WorkView; emphasis: boolean; setEmphasis: (on: boolean) => void; collateral: (c: CheckRow) => preact.ComponentChildren;
}) {
  const checks = p.checks ?? [], [at, setAt] = useState<string>(), fields = benchmarkFields('fresh', s.benchmarks);
  const changed = fields.some((f) => f.value.trim());
  // The rows a change moved: their figure, level or verdict differs from the last render's (the highlight, 1.6 s).
  const was = useRef<Record<string, string>>({}), [moved, setMoved] = useState<string[]>([]);
  const sig = checks.map((c) => `${c.id}:${c.level}:${c.worst}:${c.verdict}`).join('|');
  useEffect(() => {
    const now = Object.fromEntries(checks.map((c) => [c.id, `${c.level}:${c.worst}:${c.verdict}`]));
    const m = Object.keys(was.current).length ? checks.filter((c) => was.current[c.id] !== undefined && was.current[c.id] !== now[c.id]).map((c) => c.id) : [];
    was.current = now;
    if (!m.length) return;
    setMoved(m);
    const t = setTimeout(() => setMoved([]), 1600);
    return () => clearTimeout(t);
  }, [sig]);
  const held = heldOf(checks);
  const set = (id: string, t: string) => update((u) => ({ ...u, benchmarks: withBenchmark(u.benchmarks, id, t) }));
  const mark = (c: CheckRow) => (c.verdict === 'meets' ? ['✓', 'Meets', 'text-good'] : c.verdict === 'misses' ? ['✗', 'Misses', 'text-bad'] : ['–', 'Not read yet', MUTED]);
  return <section id="benchmarks" data-testid="rep-checks" tabIndex={-1} aria-labelledby="benchmarks-h" class="dim-able mt-10" data-emphasis={emphasis || undefined}>
    {/* No "Change the benchmarks" beside the heading (Rahul's review of the check, 16-11-2026, point 2): the line under it
        says to tap one. Fine-tune's link lights the benchmarks up a moment, until one is tapped. */}
    <h3 id="benchmarks-h" class="text-title text-ink">The benchmark ratios</h3>
    <p data-testid={p.misses ? 'rep-misses' : 'rep-verdict'} class={`mt-1 font-medium ${p.misses ? 'text-bad' : 'text-ink'}`}>{head}</p>
    <p class={HINT}>Each bank sets its own: tap a benchmark to change it.</p>
    {p.benchmarks && <p data-testid="rep-benchmarks-note" class="mt-1 text-sm text-warn">{p.benchmarks}</p>}
    <div class="paper mt-3 overflow-hidden rounded-card">
      <table class="ratio-table w-full border-collapse text-sm">
        <thead><tr>
          <th scope="col" class="text-left">Ratio</th><th scope="col" class="text-right">Benchmark</th><th scope="col" class="text-right">Your business</th>
          <th scope="col" class="w-8"><span class="sr-only">Meets or misses</span></th>
        </tr></thead>
        <tbody>{checks.map((c) => {
          const [sign, said, ink] = mark(c), f = fields.find((x) => x.id === c.id), open = at === c.id;
          const def = Number(f?.byDefault), now = c.byDefault === undefined ? def : Number(c.level.split(' ')[0]);
          return [<tr key={c.id} data-testid={`rep-check-${c.id}`} data-moved={moved.includes(c.id) || undefined} data-verdict={c.verdict}>
            <th scope="row" class="text-left font-normal"><span class="block text-ink">{PLAIN[c.id] ?? c.label}</span><span class={`block text-xs ${MUTED}`}>{c.label}</span></th>
            <td class="text-right">
              <button type="button" data-testid={`rep-bm-${c.id}`} aria-expanded={open} aria-label={`${short(c)}: the benchmark for ${c.label} (${c.level}). Change it`}
                class="bm-cell" data-own={c.byDefault !== undefined || undefined} onClick={() => { setAt(open ? undefined : c.id); setEmphasis(false); }}>{short(c)}</button>
              {c.byDefault !== undefined && <span class={`block text-xs ${c.looser ? 'text-warn' : MUTED}`}>yours; {c.byDefault}{c.looser ? ', looser' : ''}</span>}
            </td>
            <td class={`text-right tabular-nums ${ink}`}><span class="sr-only">{said}: </span>{figOf(c.worst)[0]}{figOf(c.worst)[1] && <span class={`block text-xs ${MUTED}`}>{figOf(c.worst)[1]}</span>}</td>
            <td class={`text-center text-base font-semibold ${ink}`} aria-hidden="true">{sign}</td>
          </tr>,
          open && f && <tr key={`${c.id}-edit`} class="bm-edit"><td colSpan={4}>
            <div class="flex flex-wrap items-end gap-4">
              <div class="lg:hidden pointer-coarse:block"><Wheel id={`rep-wheel-${c.id}`} label={PLAIN[c.id] ?? c.label} values={wheelOf(def, now)} value={now} set={(v) => set(c.id, Math.abs(v - def) < 1e-9 ? '' : v.toFixed(2))} /></div>
              <div class="min-w-40 flex-1"><TextField id={`fld-bm-${c.id}`} label={c.label} hint={f.hint} value={f.value} byDefault={f.byDefault} keepBlank
                onCommit={(t) => set(c.id, t)} inputMode="decimal" said={f.error} invalid={!!f.error} /></div>
              <button type="button" data-testid={`rep-bm-done-${c.id}`} class={BUTTON} onClick={() => setAt(undefined)}>Done</button>
            </div>
          </td></tr>,
          c.id === 'securityCover' && collateral(c) && <tr key="collateral"><td colSpan={4} class="pt-0">{collateral(c)}</td></tr>];
        })}</tbody>
      </table>
    </div>
    {changed && <button type="button" data-testid="rep-benchmarks-reset" class={`mt-3 ${BUTTON}`} onClick={() => update((t) => ({ ...t, benchmarks: undefined }))}>Reset to defaults</button>}
    {held.map((h) => <div key={h.cause} data-testid={`rep-cause-${h.cause}`} class="mt-4">
      <p class="font-medium text-bad">{h.head}</p>
      <p class="text-sm text-ink">{h.text}</p>
      <ul class="mt-1 space-y-0.5 text-sm">{h.rows.filter((c) => c.short).map((c) => <li key={c.id} data-testid={`rep-short-${c.id}`} class="text-bad">
        <span class="text-ink">{SHORT[c.id] ?? c.label}:</span> {c.short}</li>)}</ul>
      {h.cause === 'earns' && w && w.years.length > 0 && <>
        <p class={`mt-1 text-xs ${MUTED}`}>{W.years} {w.dscrLevel}</p>
        <ul data-testid="rep-work-years" class="flex flex-wrap gap-x-4 gap-y-0.5 text-sm tabular-nums">{w.years.map((y) => <li key={y.fy}>
          <span class={MUTED}>{y.fy}{y.months < 12 ? ` (${y.months} months)` : ''}</span> <span class={y.meets ? 'text-good' : 'text-bad'}>{y.dscr}</span></li>)}</ul>
      </>}
    </div>)}
    {p.short && <div data-testid="rep-cause-cash" class="mt-4">
      <p class="font-medium text-bad">{W.cash}</p>
      <p data-testid="rep-short" class="text-sm text-ink">{p.short}</p>
    </div>}
  </section>;
}

// ——— What if ———

/** A DSCR to two places, or four when two would read as meeting a level it misses (board-model's ratioAt, for the DSCR). */
const dscr = (x: number | undefined, level: number, misses: boolean) => {
  if (x === undefined) return '—';
  const two = x.toFixed(2);
  return misses && Number(two) >= level ? x.toFixed(4) : two;
};
/** What if (Rahul, 15-11-2026: "Sensitivity Analysis — Sales / Cost / ROI", ROI the rate of interest): the report run
 * again with sales lower, costs higher and the rate higher, each alone and all three at once, against the same benchmarks.
 * Set as the ratio table is (Rahul's second note, 15-11-2026): the case and what it misses in a line under it, the two
 * DSCRs, ✓ or ✗; every row two lines, nothing wider than a phone, no note under it. */
/** "Average DSCR" reads "average DSCR" inside a line; "DSCR in the lowest year" stays. */
const lowerFirst = (x: string) => (/^[A-Z][a-z]/.test(x) ? x[0].toLowerCase() + x.slice(1) : x);
/** How far each can go before a benchmark misses (D-UX-50), in What if (Rahul's review of the check, 16-11-2026, point 3:
 * the room and What if asked the same question twice on one screen): under each case that moves one thing, the engine's
 * break point, and a gauge of how much of that room the case's own test takes. */
const ROOM: Record<string, string> = { sales: 'Holds until sales fall', costs: 'Holds until costs rise', rate: 'Holds until the rate climbs' };
function Room({ l, by }: { l: ViableLine; by?: number }) {
  if (!l.move || l.at === undefined) return <span data-testid={`rep-room-${l.id}`} class={`room ${l.text.includes('cannot') ? 'text-bad' : MUTED}`}>{l.text.includes('cannot') ? 'No room: any change misses a benchmark' : l.text}</span>;
  const share = by === undefined || l.at <= 0 ? undefined : Math.min(1, by / l.at);
  return <span data-testid={`rep-room-${l.id}`} class="room">
    <span class="room-said">{ROOM[l.id]} <b data-testid={`rep-room-move-${l.id}`} class="tabular-nums">{l.move.replace(/^\+/, '')}</b></span>
    {share !== undefined && <span class="room-gauge" aria-hidden="true"><span class="room-fill" style={{ width: `${share * 100}%` }} /></span>}
  </span>;
}
export function WhatIf({ s, names, room }: { s: ReportState; names: Record<string, string>; room?: ViableView }) {
  const on = JSON.stringify({ ...s, promotersMost: '', plantSales: '', plantCost: '', doc: '', words: '' });
  const t = useMemo(() => whatIfTable(inputOf(s), levelsOf(s.benchmarks)), [on]);
  if (!t) return null;
  const lv = levelsOf(s.benchmarks), low = levelFor('dscrLowest', 'fresh', lv), avg = levelFor('dscrAverage', 'fresh', lv);
  const lineOf = (id: string) => room?.lines.find((l) => l.id === id && ROOM[id]);
  const row = (r: WhatIfRow) => {
    const bad = r.misses.length > 0 || !!r.cashShort, ink = bad ? 'text-bad' : 'text-good';
    const miss = (id: string) => r.misses.includes(id as RatioId);
    // In a line, so every row is two: one benchmark by name, more by their count; the ratio table above names them.
    const n = r.misses.length, said = bad ? [n === 1 ? `Misses ${lowerFirst(names[r.misses[0]] ?? SHORT[r.misses[0]] ?? r.misses[0])}` : n ? `Misses ${n} benchmarks` : '', r.cashShort ? 'cash runs short' : '']
      .filter(Boolean).join('; ').replace(/^c/, 'C') : 'Meets every benchmark';
    return <tr key={r.id} data-testid={`rep-whatif-${r.id}`} data-verdict={bad ? 'misses' : 'meets'}>
      <th scope="row" class="text-left font-normal"><span class="block text-ink">{r.label}</span><span class={`block text-xs ${bad ? 'text-bad' : MUTED}`}>{said}</span>
        {lineOf(r.id) && <Room l={lineOf(r.id) as ViableLine} by={r.by} />}</th>
      <td class={`text-right tabular-nums ${miss('dscrLowest') ? 'text-bad' : 'text-ink'}`}>{dscr(r.lowest, low, miss('dscrLowest'))}</td>
      <td class={`text-right tabular-nums ${miss('dscrAverage') ? 'text-bad' : 'text-ink'}`}>{dscr(r.average, avg, miss('dscrAverage'))}</td>
      <td class={`text-center text-base font-semibold ${ink}`}><span aria-hidden="true">{bad ? '✗' : '✓'}</span><span class="sr-only">{bad ? 'Misses' : 'Meets'}</span></td>
    </tr>;
  };
  return <section id="what-if" data-testid="rep-whatif" aria-labelledby="what-if-h" class="dim-able mt-10">
    <h3 id="what-if-h" class="text-title text-ink">What if</h3>
    <p class={`max-w-prose ${HINT}`}>{room ? 'Your report with one thing worse, then all three at once; under each, how far it can go before a benchmark misses.' : 'Your report with one thing worse, then all three at once.'}</p>
    <div class="paper mt-3 overflow-hidden rounded-card">
      <table class="ratio-table whatif-table w-full border-collapse text-sm">
        <thead><tr>
          <th scope="col" class="text-left">If</th>
          <th scope="col" class="text-right">Lowest DSCR<span class="block font-normal">{low.toFixed(2)}+</span></th>
          <th scope="col" class="text-right">Average DSCR<span class="block font-normal">{avg.toFixed(2)}+</span></th>
          <th scope="col" class="w-8"><span class="sr-only">Meets or misses</span></th>
        </tr></thead>
        <tbody>{[t.typed, ...t.rows].map(row)}</tbody>
      </table>
    </div>
    {room && <details data-testid="rep-room-more" class="mt-2">
      <summary class="cursor-pointer py-1 text-sm font-medium text-link underline underline-offset-4">The figures behind it</summary>
      <ul class="mt-1 space-y-1.5 text-sm text-ink">{room.lines.filter((l) => ROOM[l.id]).map((l) => <li key={l.id} data-testid={`rep-room-text-${l.id}`}>{l.text}</li>)}</ul>
      <p class={`max-w-prose ${HINT}`}>{room.foot}</p>
    </details>}
  </section>;
}

/** The check page's parts, as links, under the answer in the "Your report" panel on a desktop: what is in pencil marked. */
export function Outline({ items }: { items: { id: string; label: string; mark?: string }[] }) {
  return <nav aria-label="In this report" data-testid="rep-parts" class="check-outline">
    <p class={`text-xs font-semibold tracking-wide uppercase ${MUTED}`}>In this report</p>
    <ol class="mt-1">{items.map((i) => <li key={i.id}><a href={`#${i.id}`} class="check-outline-link">{i.label}{i.mark && <span class="sum-pencil"> {i.mark}</span>}</a></li>)}</ol>
  </nav>;
}
