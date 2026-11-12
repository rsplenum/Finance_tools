/**
 * The DSCR, made new (NEW1, docs/WORKED-PAGE.md §4 and §7): a worked page, begun from a blank file. It opens on a marked
 * example that passes; the first phone screen holds the reading in one sentence (the cash first, the banker's term
 * second), one picture (cash against repayments by year, the tightest year marked), the facts as one sentence of
 * tappable figures, ink or pencil, and one next step. A tap opens one fact alone; "Use your own figures" walks them in
 * the ladder's order, and a figure shows from the first fact, marked with what it leaves out (rule 14, D-UX-358). When
 * it falls short, the engine's whole options that work, each as was → becomes, one tap to use and one to undo
 * (D-UX-346). Closed below: the working, what we assumed, For professionals (all the old page could do) and the paper.
 * Figures: the engine only, by way of `worked.ts` and `model.ts`.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { isoDate } from '../download';
import { useHomeCase } from '../fields';
import { Bars } from '../worked/Bars';
import { FactSheet, type SheetFact } from '../worked/FactSheet';
import { useWorkedKept, over } from '../worked/kept';
import { Fold, FactLine, MAIN, openFold, QUIET, Reading } from '../worked/parts';
import { DownloadSection, LenderLines, Professionals, Schedule, StatementTable, type Update } from './Calculator';
import { DSCR_HOME } from './home-case';
import { BORROWER_CHOICES, frontDoor, monthText, type Preview, type State } from './model';
import {
  ASSUMED_FACTS, applyOption, barsOf, changedFacts, exampleCase, exampleFacts, exampleNeeds, exampleState, FACTS, factProblem, factsOf, factText,
  markOf, nextOf, optionsFor, previewOf, readingOf, WALK, withMine, writeFact, type Case, type FactId, type OptionCard,
} from './worked';
import { N } from './words';

const thisMonth = () => isoDate(new Date()).slice(0, 7);
const KEPT_VERSION = 1;

/** The old page's draft (kept for the tab) brought forward: each fact it held is the borrower's; the rest stay the example's. */
function forward(old: { v: number; c: unknown } | { legacy: unknown }): Case | undefined {
  if (!('legacy' in old)) return undefined;
  const d = old.legacy as { s?: unknown } | null;
  if (!d || !d.s || typeof d.s !== 'object') return undefined;
  const month = thisMonth(), ex = exampleState(month);
  let s = over(frontDoor(month), d.s) as State;
  const mine: FactId[] = [];
  for (const id of FACTS) {
    if (factText(s, id).trim()) mine.push(id);
    else if (WALK.includes(id)) s = writeFact(s, id, factText(ex, id));
  }
  return { s, mine: mine.length ? mine : [] };
}

/** One fact as the sheet shows it. */
function sheetFact(c: Case, id: FactId): SheetFact {
  const t = factText(c.s, id), mine = c.mine.includes(id), shown = factsOf(c).find((f) => f.id === id)?.text ?? t;
  const base = { id, label: N.label[id], hint: N.hint[id] };
  if (id === 'borrower') return { ...base, value: c.s.borrower ?? '', choices: BORROWER_CHOICES.map((b) => ({ value: b.id, label: b.label })) };
  const pencil = !mine && !ASSUMED_FACTS.includes(id);
  const unit = id === 'profit' || id === 'amount' || id === 'emis' || id === 'depreciation' ? 'Rs.' : id === 'years' ? 'years' : '%';
  const range = id === 'years' ? { min: 1, max: 20, step: 0.5 } : id === 'rate' ? { min: 6, max: 24, step: 0.25 } : id === 'growth' ? { min: -10, max: 30, step: 1 } : undefined;
  return { ...base, value: pencil ? '' : t, unit, range, ...(pencil ? { example: shown, placeholder: N.sheet.example(t) } : {}) };
}

export function DscrWorked() {
  const [c, setC] = useState<Case>(() => exampleCase(thisMonth()));
  const home = useHomeCase<Case>(setC, () => ({ s: DSCR_HOME, mine: [] }));
  useWorkedKept({
    tool: 'dscr', version: KEPT_VERSION, blank: () => exampleCase(thisMonth()), forward,
    isBlank: (x) => !x.mine.length && JSON.stringify(x.s) === JSON.stringify(exampleState(thisMonth())),
  }, c, setC);
  const p = useMemo(() => previewOf(c.s), [c.s]);
  const r = readingOf(c, p);
  const options = useMemo(() => (r.state === 'short' || r.state === 'cannot' ? optionsFor(c.s, p) : []), [c.s, p, r.state]);
  const next = nextOf(c, r, options.length);
  const facts = factsOf(c), mark = markOf(c), pencil = exampleFacts(c).length > 0;
  const [sheet, setSheet] = useState<{ id: FactId; walk: boolean; base: Case }>();
  const [showOptions, setShowOptions] = useState(false);
  const [used, setUsed] = useState<{ title: string; before: Case }>();
  const [cleared, setCleared] = useState<Case>();
  // On a phone the sheet covers the lower half: the reading and the picture are brought up above it, to move as it moves.
  useEffect(() => {
    if (!sheet || matchMedia('(min-width: 1024px)').matches) return;
    const top = document.getElementById('reading-top');
    if (top && Math.abs(top.getBoundingClientRect().top) > 16) top.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [sheet?.id]);

  // A change from For professionals: whatever fact it touched becomes the borrower's.
  const update: Update = (f) => setC((x) => { const s = f(x.s); return { s, mine: withMine(x.mine, changedFacts(x.s, s)) }; });
  const open = (id: FactId, walk = false) => { setShowOptions(false); setSheet({ id, walk, base: c }); };
  const live = (id: FactId, t: string) => {
    if (!sheet) return;
    setUsed(undefined);
    const b = sheet.base;
    // Emptied: the example's figure stands again; for a stated assumption, empty is the borrower's "none".
    if (!t.trim() && !ASSUMED_FACTS.includes(id)) setC(b);
    else setC({ s: writeFact(b.s, id, t), mine: withMine(b.mine, [id]) });
  };
  /** The walk's next fact: the ladder's order, after `id`, still the example's. */
  const after = (id: FactId, x: Case) => WALK.slice(WALK.indexOf(id) + 1).find((f) => !x.mine.includes(f));
  const step = (id: FactId, x: Case) => { const n = after(id, x); setSheet(n ? { id: n, walk: true, base: x } : undefined); };
  const keep = (id: FactId) => { const x = { ...c, mine: withMine(c.mine, [id]) }; setC(x); if (sheet?.walk) step(id, x); else setSheet(undefined); };
  const go = () => {
    if (next.kind === 'paper') return openFold('paper');
    if (next.kind === 'options') { setSheet(undefined); setShowOptions((o) => !o); return; }
    const first = exampleFacts(c)[0] ?? WALK[0];
    open(first, true);
  };
  const use = (o: OptionCard) => { setUsed({ title: o.title, before: c }); setC(applyOption(c, o)); setShowOptions(false); };
  const clear = () => { setCleared(c); setC(exampleCase(thisMonth())); setSheet(undefined); setUsed(undefined); };

  const bars = barsOf(p).map((b) => ({
    key: b.fy, label: b.fy, a: b.cash, b: b.service, aText: b.cashText, bText: b.serviceText, tight: b.tight, note: b.part ? 'part year' : undefined,
    spoken: `${b.fy}${b.tight ? `, ${N.chart.tight}` : ''}${b.part ? `, ${b.part}` : ''}: ${N.chart.cash} Rs. ${b.cashText} lakh, ${N.chart.service} Rs. ${b.serviceText} lakh`,
  }));
  const walkAt = sheet?.walk ? { at: WALK.indexOf(sheet.id) + 1, of: WALK.length } : undefined;

  return <div class={sheet ? 'pb-[60svh]' : 'pb-24'}>
    <div class="flex items-center justify-between gap-3">
      <h1 class="font-heading text-base font-semibold text-ink">{N.title}</h1>
      <a href="#paper" data-testid="paper-link" class={`${QUIET} -my-2.5 -mr-2 shrink-0 px-2`} onClick={(e) => { e.preventDefault(); openFold('paper'); }}>{N.paperLink}</a>
    </div>
    <div class="mt-3 lg:mt-6 lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-x-16">
      <div id="reading-top" class="scroll-mt-3">
        <Reading text={r.text} banker={r.banker} state={r.state} pencil={pencil} />
        {bars.length > 0 && <div class="mt-3"><Bars title={N.chart.title} aName={N.chart.cash} bName={N.chart.service} unit={N.chart.unit} tightName={N.chart.tight} rows={bars} /></div>}
      </div>
      {/* On a phone the next step comes straight under the picture, so the first screen holds all three; the facts follow it. */}
      <section id="front-door" aria-label="Your figures" class="mt-3 flex flex-col lg:mt-1">
        <div class="order-2 mt-6 lg:order-1 lg:mt-0">
          {mark && <p data-testid="mark" class="text-base text-ink-muted"><span class="mr-1.5 inline-flex items-center rounded-full bg-warn-tint px-2 py-0.5 text-sm font-semibold text-warn">{N.example}</span>{' '}{mark.replace(/^Example: /, '')}</p>}
          <FactLine facts={facts} open={sheet?.id} onTap={(id) => open(id as FactId)} label="The facts" />
        </div>
        <div class="order-1 lg:order-2 lg:mt-6">
          <button type="button" data-testid="next" data-next={next.kind} aria-expanded={next.kind === 'options' ? showOptions : undefined} class={MAIN} onClick={go}>{next.label}</button>
          {used && <p role="status" data-testid="used" class="mt-3 flex flex-wrap items-center gap-x-2 text-base text-ink">{N.options.used(used.title)}
            <button type="button" data-testid="undo" class={QUIET} onClick={() => { setC(used.before); setUsed(undefined); }}>{N.options.undo}</button></p>}
          {showOptions && <Options options={options} onUse={use} />}
        </div>
        {sheet && <FactSheet key={sheet.walk ? 'walk' : sheet.id} fact={sheetFact(c, sheet.id)} words={N.sheet}
          problem={(t) => factProblem(sheet.id, t)} onLive={(t) => live(sheet.id, t)} onKeep={() => keep(sheet.id)}
          walk={walkAt && { ...walkAt, onNext: () => step(sheet.id, c), onSkip: () => step(sheet.id, c) }}
          onClose={() => setSheet(undefined)} />}
      </section>
    </div>

    <div class="mt-12">
      <Fold id="working" title={N.folds.working}><Working c={c} p={p} /></Fold>
      <Fold id="assumed" title={N.folds.assumed}><Assumed c={c} p={p} /></Fold>
      <Fold id="more-options" title={N.folds.pro}><Professionals s={c.s} update={update} /></Fold>
      <Fold id="paper" title={N.folds.paper} class="border-b">
        <DownloadSection s={c.s} p={p} update={update} example={exampleNeeds(c)} bare />
      </Fold>
    </div>
    <p data-testid="kept-line" class="mt-6 text-sm text-ink-muted">Your figures are saved on this device, in this browser only.{' '}
      {c.mine.length > 0 && !home && <button type="button" data-testid="clear" class={QUIET} onClick={clear}>Start again from the example</button>}
      {cleared && !c.mine.length && <button type="button" data-testid="clear-undo" class={QUIET} onClick={() => { setC(cleared); setCleared(undefined); }}>Undo</button>}
    </p>
  </div>;
}

/** The engine's whole options that work (D-UX-346): was → becomes, each used in one tap. */
function Options({ options, onUse }: { options: OptionCard[]; onUse: (o: OptionCard) => void }) {
  return <div data-testid="options" class="mt-5">
    <h2 class="font-heading text-xl font-semibold text-ink">{N.options.title}</h2>
    <p class="mt-1 text-base text-ink-muted">{options.length ? N.options.lead : N.options.none}</p>
    <ul class="mt-3 space-y-3">
      {options.map((o) => <li key={o.id} data-testid={`option-${o.id}`} class="rounded-card border border-line bg-surface p-4">
        <h3 class="font-semibold text-ink">{o.title}</h3>
        <dl class="mt-2 space-y-1 text-base">
          {o.rows.map((x) => <div key={x.label} class="flex flex-wrap justify-between gap-x-3">
            <dt class="text-ink-muted">{x.label}</dt>
            <dd class="text-right tabular-nums text-ink">{x.was && <><span class="text-ink-muted line-through decoration-1">{x.was}</span><span aria-hidden="true" class="mx-1.5 text-ink-muted">→</span><span class="sr-only"> becomes </span></>}
              <span class={x.was ? 'font-semibold' : ''}>{x.now}</span></dd>
          </div>)}
        </dl>
        {o.more && <p class="mt-2 text-sm text-ink-muted">{o.more}</p>}
        <button type="button" data-testid={`use-${o.id}`} class="mt-3 inline-flex min-h-11 items-center rounded-full bg-ink/8 px-5 font-semibold text-ink hover:bg-ink/14" onClick={() => onUse(o)}>{N.options.use}</button>
      </li>)}
    </ul>
  </div>;
}

/** See the working: the key figures, the statement that adds up, the lender's tests and the schedule. */
function Working({ c, p }: { c: Case; p: Preview }) {
  const toPro = () => openFold('more-options');
  const cell = 'rounded-control bg-surface p-3';
  return <div>
    {p.blocked && <p data-testid="dscr-blocked" role="alert" class="text-bad">{p.blocked}</p>}
    {!p.blocked && <dl class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div class={cell}><dt class="text-sm text-ink-muted">Average DSCR</dt><dd data-testid="dscr-average" class="text-2xl font-semibold text-ink tabular-nums">{p.average ?? '—'}</dd></div>
      <div class={cell}><dt class="text-sm text-ink-muted">Lowest year</dt><dd class="text-ink"><span data-testid="dscr-lowest" class="text-2xl font-semibold tabular-nums">{p.lowest ?? '—'}</span>
        {p.lowestYear && <>{' '}<span data-testid="dscr-lowest-year" class="whitespace-nowrap text-sm">in {p.lowestYear}</span></>}</dd></div>
      {c.s.source === 'plan' && <>
        <div class={cell}><dt class="text-sm text-ink-muted">Each instalment</dt><dd data-testid="dscr-instalment" class="font-semibold text-ink tabular-nums">{p.loanLine?.instalment ?? '—'}</dd></div>
        <div class={cell}><dt class="text-sm text-ink-muted">Interest over the whole loan</dt><dd data-testid="dscr-total-interest" class="font-semibold text-ink tabular-nums">{p.loanLine?.totalInterest ?? '—'}</dd></div>
      </>}
    </dl>}
    {p.verdict && <p data-testid="dscr-verdict" class="mt-4 text-ink">{p.verdict.text}</p>}
    {p.largest && <p data-testid="dscr-largest" class="mt-2 text-ink">{p.largest.text}</p>}
    {p.fewest && <p data-testid="dscr-fewest" class="mt-2 text-ink">{p.fewest.text}</p>}
    {p.marks && p.marks.length > 0 && <ul data-testid="dscr-marks" class="mt-4 flex flex-wrap gap-2 text-sm">
      {p.marks.map((m) => <li key={m.fy} data-testid={`mark-${m.fy}`} class={`rounded-full bg-surface px-2.5 py-0.5 ${!m.counted ? 'text-ink-muted' : m.meets ? 'text-good' : 'text-bad'}`}>
        {m.fy}: {m.dscr}, {!m.counted ? 'not counted' : m.meets ? 'meets the target' : 'below the target'}</li>)}
    </ul>}
    {p.lender && <LenderLines v={p.lender} openMore={toPro} />}
    {p.statement && <StatementTable st={p.statement} parts={p.partYears} />}
    {p.beforeStart && <p data-testid="dscr-before-start" class="mt-2 text-sm text-ink-muted">{p.beforeStart}</p>}
    {p.notCounted && <p data-testid="dscr-not-counted" class="mt-2 text-sm text-ink-muted">{p.notCounted}</p>}
    {p.notes.length > 0 && <ul data-testid="dscr-notes" class="mt-2 space-y-0.5 text-sm text-warn">{p.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
    {p.schedule && <Schedule sch={p.schedule} />}
  </div>;
}

/** A reason as the borrower reads it: the pointer to our own files (its source, kept in the data) left off the screen. */
const plain = (why: string) => why.replace(/\s*\([^()]*\b[\w/.-]+\.(?:md|json)\)/g, '');

/** What we assumed: each pencil with its reason, the example's facts still standing, and when the loan is taken as drawn. */
function Assumed({ c, p }: { c: Case; p: Preview }) {
  const left = exampleFacts(c), shown = factsOf(c);
  const s = c.s, drawn = s.door && s.loan.disbursed === s.door.month;
  return <div class="space-y-6">
    {left.length > 0 && <div data-testid="assumed-example">
      <h3 class="font-semibold text-ink">{N.assumed.example}</h3>
      <ul class="mt-1 space-y-1 text-base text-ink">{left.map((id) => <li key={id} class="flex justify-between gap-3">
        <span class="text-ink-muted">{N.label[id]}</span><button type="button" class="text-right text-link underline underline-offset-4" onClick={() => document.querySelector<HTMLButtonElement>(`[data-fact="${id}"]`)?.click()}>{shown.find((f) => f.id === id)?.text}</button>
      </li>)}</ul>
    </div>}
    {drawn && <p data-testid="fd-loan-note" class="text-base text-ink">{N.assumed.drawn(monthText(s.door!.month))}</p>}
    <dl data-testid="dscr-assumed" class="space-y-3">
      {p.assumed.map((a) => <div key={a.id} data-testid={`assumed-${a.id}`}>
        <dt class="font-medium text-ink">{a.what}: <span class="font-normal">{a.shown}</span></dt>
        <dd class="text-sm text-ink-muted">{plain(a.why)}. <a href="#more-options" class="text-link underline underline-offset-4" onClick={(e) => { e.preventDefault(); openFold('more-options'); }}>Change</a></dd>
      </div>)}
    </dl>
  </div>;
}
