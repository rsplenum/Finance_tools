/**
 * The DSCR (NEW1, finished in NEW1b from Rahul's review of 12-11-2026): what DSCR is in a few words, then the eight
 * questions one a screen (so a phone's keyboard never hides the box), then the report: the reading in one sentence, the
 * figures a lender reads first, the DSCR by year against the level, the cash against the repayments, the ways that work
 * when it falls short, the answers as one sentence of tappable figures and the paper. Undo and Start over sit on top of
 * the report. Closed below: the working; Professional mode, which lists what we assumed and holds every setting; the
 * paper. Figures: the engine only, by way of `worked.ts` and `model.ts`.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { isoDate } from '../download';
import { goTo, useHomeCase } from '../fields';
import { Ask, type AskQuestion } from '../worked/Ask';
import { Bars } from '../worked/Bars';
import { useWorkedKept, over } from '../worked/kept';
import { Levels } from '../worked/Levels';
import { Fold, FactLine, MAIN, openFold, QUIET, Reading } from '../worked/parts';
import { DownloadSection, LenderLines, Professionals, Schedule, StatementTable, type Update } from './Calculator';
import { DSCR_HOME } from './home-case';
import { inr } from '../../../engine/util';
import { BORROWER_CHOICES, frontDoor, statusText, type Preview, type State } from './model';
import {
  ASSUMED_FACTS, applyOption, barsOf, changedFacts, exampleCase, exampleFacts, exampleNeeds, exampleState, FACTS, factProblem, factsOf, factText,
  markOf, optionsFor, previewOf, readingOf, WALK, withMine, writeFact, type Case, type FactId, type OptionCard,
} from './worked';
import { Room, Targets } from './Pictures';
import { N } from './words';

const thisMonth = () => isoDate(new Date()).slice(0, 7);
/** The kept case's shape is unchanged from NEW1: where it opens is worked out from it (`viewOf`). */
const KEPT_VERSION = 1;
/** The questions' order: who borrows, the business, then the loan, then the two that may be none. */
const ORDER: FactId[] = ['borrower', 'profit', 'growth', 'amount', 'rate', 'years', 'emis', 'depreciation'];

type View = { at: 'intro' } | { at: 'ask'; i: number; from: 'intro' | 'report'; single?: boolean } | { at: 'report' };
/** Two ways in (NEW1c, Rahul, 12-11-2026): Simple ends on the answer and says what it filled in; Professional on every field. */
type Mode = 'simple' | 'pro';
/** The kept case: the answers and, for a professional, the mode. */
type Kept = Case & { pro?: boolean };

/** Where a case opens: nothing answered, the start; every needed fact answered, the report; else the next question. */
function viewOf(c: Case): View {
  if (!c.mine.length) return { at: 'intro' };
  if (WALK.every((id) => c.mine.includes(id))) return { at: 'report' };
  return { at: 'ask', i: Math.max(0, ORDER.findIndex((id) => !c.mine.includes(id))), from: 'intro' };
}

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
  return { s, mine };
}

/** One question as the screen asks it: the borrower's answer in the box, empty while it is the example's. */
function questionOf(c: Case, id: FactId): AskQuestion {
  const mine = c.mine.includes(id), base = { id, question: N.ask.q[id], hint: N.ask.hint[id] };
  if (id === 'borrower') return { ...base, value: mine ? c.s.borrower ?? '' : '', choices: BORROWER_CHOICES.map((b) => ({ value: b.id, label: b.label })) };
  const unit = id === 'profit' || id === 'amount' || id === 'emis' || id === 'depreciation' ? '₹' : id === 'years' ? 'years' : '%';
  return { ...base, value: mine ? factText(c.s, id) : '', unit, none: ASSUMED_FACTS.includes(id) };
}

export function DscrWorked() {
  const [c, setC] = useState<Case>(() => exampleCase(thisMonth()));
  const [view, setView] = useState<View>({ at: 'intro' });
  const [mode, setMode] = useState<Mode>('simple');
  const home = useHomeCase<Case>((x) => { setC(x); setView({ at: 'report' }); }, () => ({ s: DSCR_HOME, mine: [] }));
  // The mode is kept with the answers, so a professional comes back to every field.
  const kept = useMemo<Kept>(() => (mode === 'pro' ? { ...c, pro: true } : c), [c, mode]);
  useWorkedKept<Kept>({
    tool: 'dscr', version: KEPT_VERSION, blank: () => exampleCase(thisMonth()), forward,
    isBlank: (x) => !x.mine.length && JSON.stringify(x.s) === JSON.stringify(exampleState(thisMonth())),
  }, kept, (x) => { setC({ s: x.s, mine: x.mine }); setMode(x.pro ? 'pro' : 'simple'); setView(viewOf(x)); });
  const p = useMemo(() => previewOf(c.s), [c.s]);
  const r = readingOf(c, p);
  const options = useMemo(() => (r.state === 'short' || r.state === 'cannot' ? optionsFor(c.s, p) : []), [c.s, p, r.state]);

  // Undo: every change made from the report, the last twenty; typing in Professional mode counts as one change a pause.
  const [past, setPast] = useState<Case[]>([]), last = useRef(0);
  const remember = (x: Case, typing = false) => {
    const now = Date.now();
    if (typing && now - last.current < 1500) { last.current = now; return; }
    last.current = typing ? now : 0;
    setPast((h) => [...h.slice(-19), x]);
  };
  const undo = () => { const h = past[past.length - 1]; if (!h) return; setPast(past.slice(0, -1)); setC(h); setUsed(undefined); last.current = 0; };
  const [used, setUsed] = useState<{ title: string }>();
  const [cleared, setCleared] = useState<Case>();
  const own = c.mine.length > 0 && !home;

  // A change from Professional mode: whatever fact it touched becomes the borrower's.
  const update: Update = (f) => { remember(c, true); setC((x) => { const s = f(x.s); return { s, mine: withMine(x.mine, changedFacts(x.s, s)) }; }); };
  const ask = (i: number, from: 'intro' | 'report', single = false) => {
    if (from === 'report' && !single) remember(c);
    setView({ at: 'ask', i, from, single });
  };
  const begin = (m: Mode) => { setMode(m); ask(0, 'intro'); };
  const answer = (i: number, t: string) => {
    if (view.at !== 'ask') return;
    const id = ORDER[i];
    if (view.single) remember(c);
    setC((x) => ({ s: writeFact(x.s, id, t), mine: withMine(x.mine, [id]) }));
    setUsed(undefined);
    if (view.single || i + 1 >= ORDER.length) setView({ at: 'report' });
    else setView({ ...view, i: i + 1 });
  };
  const back = () => {
    if (view.at !== 'ask') return;
    if (view.single) setView({ at: 'report' });
    else if (view.i > 0) setView({ ...view, i: view.i - 1 });
    else setView(view.from === 'report' ? { at: 'report' } : { at: 'intro' });
  };
  const use = (o: OptionCard) => { remember(c); setUsed({ title: o.title }); setC(applyOption(c, o)); };
  const startOver = () => { setCleared(c); setPast([]); setUsed(undefined); setC(exampleCase(thisMonth())); setView({ at: 'intro' }); };
  const example = () => { setC(exampleCase(thisMonth())); setView({ at: 'report' }); };
  // Professional mode, from the start: every fact the borrower's and empty, the stated assumptions kept.
  const [emptied, setEmptied] = useState<Case>();
  const empty = (): Case => ({ s: frontDoor(thisMonth()), mine: [...FACTS] });
  const isEmpty = c.mine.length === FACTS.length && JSON.stringify(c.s) === JSON.stringify(empty().s);
  const emptyForm = () => { remember(c); setEmptied(c); setC(empty()); setUsed(undefined); };

  // Into Professional mode from anywhere: at the field asked for (a Change beside an assumption, the lender's tests), else
  // at the top of the form, once the form is drawn.
  const [goal, setGoal] = useState<string>();
  const toPro = (where = '') => { setMode('pro'); setGoal(where); };
  useEffect(() => {
    if (goal === undefined || mode !== 'pro') return;
    setGoal(undefined);
    requestAnimationFrame(() => {
      if (goal) goTo(goal)(new Event('click'));
      else document.getElementById('more-options')?.scrollIntoView({ block: 'start' });
    });
  }, [goal, mode]);

  // A new screen starts at its top; the report's heading takes the focus, so a screen reader starts there too.
  const heading = useRef<HTMLHeadingElement>(null), first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (view.at === 'ask') return;
    scrollTo({ top: 0 });
    heading.current?.focus({ preventScroll: true });
  }, [view.at]);

  if (view.at === 'ask') {
    const id = ORDER[view.i];
    return <Ask q={questionOf(c, id)} at={view.i + 1} of={ORDER.length} single={view.single}
      words={{ ...N.ask, last: mode === 'pro' && !view.single ? N.ask.fields : N.ask.see }} problem={(t) => factProblem(id, t)} onBack={back}
      reads={(t) => (id === 'borrower' ? undefined : readBack(c, id, t))} onAnswer={(t) => answer(view.i, t)} />;
  }

  const target = c.s.target;
  if (view.at === 'intro') {
    const way = 'flex min-h-12 w-full flex-col items-start rounded-card px-5 py-4 text-left';
    return <section data-testid="intro" aria-labelledby="dscr-title" class="flex min-h-[70svh] flex-col justify-center pb-16 sm:min-h-0 sm:py-10">
      <h1 id="dscr-title" ref={heading} tabIndex={-1} class="font-display text-[2rem] leading-[1.1] font-semibold tracking-[-0.01em] text-ink text-balance outline-none sm:text-[2.75rem]">{N.title}</h1>
      <p data-testid="intro-lead" class="mt-4 max-w-[34rem] text-lg text-ink-muted text-pretty">{N.intro.lead(target.average.trim() || '1.50')}</p>
      <div role="group" aria-label="How to start" class="mt-7 grid max-w-[44rem] gap-3 sm:grid-cols-2">
        <button type="button" data-testid="start" class={`${way} bg-ink text-canvas hover:bg-ink/85`} onClick={() => begin('simple')}>
          <span class="text-lg font-semibold">{N.intro.simple}</span><span class="mt-0.5 text-base">{N.intro.simpleLine(ORDER.length)}</span></button>
        <button type="button" data-testid="start-pro" class={`${way} border border-line bg-surface text-ink hover:bg-ink/6`} onClick={() => begin('pro')}>
          <span class="text-lg font-semibold">{N.intro.pro}</span><span class="mt-0.5 text-base text-ink-muted">{N.intro.proLine(ORDER.length)}</span></button>
      </div>
      <div class="mt-2 -ml-3"><button type="button" data-testid="see-example" class={QUIET} onClick={example}>{N.intro.example}</button></div>
      {cleared && <p role="status" class="mt-6 flex flex-wrap items-center gap-x-2 text-base text-ink-muted">{N.report.overDone}
        <button type="button" data-testid="clear-undo" class={`${QUIET} -ml-1`} onClick={() => { setC(cleared); setView(viewOf(cleared)); setCleared(undefined); }}>{N.report.undo}</button></p>}
      <p data-testid="kept-line" class="mt-10 text-sm text-ink-muted">{KEPT}</p>
    </section>;
  }

  const left = exampleFacts(c), pencil = left.length > 0, pro = mode === 'pro';
  const mark = !pencil ? undefined : !c.mine.length ? (home ? N.report.home : N.report.example) : markOf(c);
  const levelN = Number(target.minimum);
  const levels = (p.marks ?? []).map((m) => ({
    key: m.fy, label: m.fy, n: m.n, text: m.dscr, below: m.counted && !m.meets, note: !m.counted ? N.years.part : undefined,
    spoken: `${m.fy}: DSCR ${m.dscr}${m.counted && !m.meets ? `, ${N.years.below} ${target.minimum}` : ''}`,
  }));
  const bars = barsOf(p).map((b) => ({
    key: b.fy, label: b.fy, a: b.cash, b: b.service, aText: b.cashText, bText: b.serviceText, tight: b.tight, note: b.part ? 'part year' : undefined,
    spoken: `${b.fy}${b.tight ? `, ${N.chart.tight}` : ''}${b.part ? `, ${b.part}` : ''}: ${N.chart.cash} ₹${b.cashText} lakh, ${N.chart.service} ₹${b.serviceText} lakh`,
  }));
  const tap = (id: string) => ask(ORDER.indexOf(id as FactId), 'report', true);
  const next = pencil ? { kind: 'ask', label: N.report.yours, go: () => ask(Math.max(0, ORDER.findIndex((id) => !c.mine.includes(id))), 'report') }
    : { kind: 'paper', label: N.report.paper, go: () => openFold('paper') };

  // The answer, the same in both modes: the reading, the figures a lender reads first and the two pictures.
  const answerShown = <>
    <Reading text={r.text} state={r.state} pencil={pencil} />
    <Tiles p={p} c={c} />
    {levels.length > 0 && Number.isFinite(levelN) && <div class="mt-6"><Levels title={N.years.title} level={levelN} lineName={N.years.line(target.minimum)} belowName={`${N.years.below} ${target.minimum}`} rows={levels} /></div>}
    {bars.length > 0 && <div class="mt-6"><Bars title={N.chart.title} aName={N.chart.cash} bName={N.chart.service} unit={N.chart.unit} tightName={N.chart.tight} rows={bars} /></div>}
  </>;
  // What to do next: the ways that work when it falls short, then the one next step.
  const nextStep = (facts: boolean) => <>
    {options.length > 0 && <Options options={options} onUse={use} />}
    {options.length === 0 && (r.state === 'short' || r.state === 'cannot') && <p class="mb-4 text-base text-ink-muted">{N.options.none}</p>}
    {used && <p role="status" data-testid="used" class="mb-4 flex flex-wrap items-center gap-x-2 text-base text-ink">{N.options.used(used.title)}
      <button type="button" data-testid="undo" class={QUIET} onClick={undo}>{N.options.undo}</button></p>}
    {facts && <FactLine facts={factsOf(c)} onTap={tap} label="Your answers, each one tappable" />}
    <div class="mt-5"><button type="button" data-testid="next" data-next={next.kind} class={MAIN} onClick={next.go}>{next.label}</button></div>
  </>;

  return <div data-testid="report" data-mode={mode} class="pb-24">
    <div key="top" class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <h1 id="dscr-title" ref={heading} tabIndex={-1} class="font-heading text-base font-semibold text-ink outline-none">{N.title}</h1>
      <ModeSwitch mode={mode} onPick={(m) => (m === 'pro' ? toPro() : setMode('simple'))} />
    </div>
    <nav key="nav" aria-label="Your answers" class="mt-1 -ml-3 flex flex-wrap items-center">
      {own && !pro && <button type="button" data-testid="change-answers" class={QUIET} onClick={() => ask(0, 'report')}>{N.report.change}</button>}
      {past.length > 0 && <button type="button" data-testid="report-undo" class={QUIET} onClick={undo}>{N.report.undo}</button>}
      {own ? <button type="button" data-testid="clear" class={QUIET} onClick={startOver}>{N.report.over}</button>
        : <button type="button" data-testid="back-start" class={QUIET} onClick={() => setView({ at: 'intro' })}>{N.ask.back}</button>}
    </nav>
    {mark && <p key="mark" data-testid="mark" class="mt-2 text-base text-ink-muted"><span class="mr-1.5 inline-flex items-center rounded-full bg-warn-tint px-2 py-0.5 text-sm font-semibold text-warn">{N.example}</span>{' '}
      {home && !c.mine.length ? <span data-testid="home-case">{mark.replace(/^Example: /, '')}</span> : mark.replace(/^Example: /, '')}</p>}
    {pro
      // Professional: every field, filled in, beside the answer it moves (on a phone, the DSCR stays in view as you type).
      ? <div key="pro" class="mt-4 lg:mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-x-12">
        <section id="more-options" aria-label={N.mode.pro} class="min-w-0">
          <Professionals s={c.s} update={update}
            bar={<div data-testid="pro-strip" aria-live="polite" class="flex flex-wrap items-center justify-between gap-x-3 lg:hidden">
              <p class="text-sm font-medium text-ink tabular-nums">{N.pro.strip(p.average ?? '—', p.lowest ?? '—')}</p>
              <a href="#pro-result" class={`${QUIET} -mr-3`}>{N.pro.see}</a>
            </div>}
            lead={<>
              <p class="mt-3 text-base text-ink-muted">{N.pro.lead}</p>
              {(!isEmpty || emptied) && <p class="mt-1 flex flex-wrap items-center gap-x-2 text-base text-ink-muted">{N.blank.lead}
                {!isEmpty && <button type="button" data-testid="dscr-clear" class={`${QUIET} -ml-1`} onClick={emptyForm}>{N.blank.go}</button>}
                {isEmpty && emptied && <button type="button" data-testid="dscr-clear-undo" class={`${QUIET} -ml-1`} onClick={() => { setC(emptied); setEmptied(undefined); }}>{N.blank.undo}</button>}</p>}
            </>}
            end={<a href="#pro-result" data-testid="pro-see" class={`${MAIN} lg:hidden`}>{N.pro.see}</a>} />
          {p.assumed.length > 0 && <details data-testid="why-all" class="mt-8">
            <summary class="inline-flex min-h-11 cursor-pointer items-center text-base font-medium text-link underline underline-offset-4">{N.pro.whyAll} ({p.assumed.length})</summary>
            <Assumed p={p} onChange={toPro} />
          </details>}
        </section>
        <div id="pro-result" class="mt-12 scroll-mt-14 lg:sticky lg:top-4 lg:mt-0 lg:max-h-[calc(100svh-2rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
          {answerShown}
          <div class="mt-6 flex flex-col">{nextStep(false)}</div>
        </div>
      </div>
      // Simple: the answer, the next step, and what we filled in, said once under it.
      : <div key="simple" class="mt-4 lg:mt-6 lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-x-16">
        <div>{answerShown}</div>
        <section id="front-door" aria-label="Your answers" class="mt-6 flex flex-col lg:mt-1">
          {nextStep(true)}
          <Filled p={p} onChange={toPro} />
        </section>
      </div>}

    <div key="folds" class="mt-12">
      <Fold id="working" title={N.folds.working}><Working c={c} p={p} toPro={toPro} update={(f) => { remember(c); setC((x) => { const s = f(x.s); return { s, mine: withMine(x.mine, changedFacts(x.s, s)) }; }); }} /></Fold>
      <Fold id="paper" title={N.folds.paper} class="border-b">
        <DownloadSection s={c.s} p={p} update={update} example={exampleNeeds(c)} bare />
      </Fold>
    </div>
    <p key="kept" data-testid="kept-line" class="mt-6 text-sm text-ink-muted">{KEPT}</p>
  </div>;
}

/** The two ways in, switched on top of the report: Simple (the answer and what we filled in) and Professional (every field). */
function ModeSwitch({ mode, onPick }: { mode: Mode; onPick: (m: Mode) => void }) {
  return <div role="group" aria-label={N.mode.label} class="inline-flex rounded-full bg-ink/6 p-1">
    {(['simple', 'pro'] as const).map((m) => <button key={m} type="button" data-testid={`mode-${m}`} aria-pressed={mode === m}
      class={`min-h-11 rounded-full px-4 text-base text-ink ${mode === m ? 'bg-canvas font-semibold shadow-sm' : 'font-normal hover:bg-ink/6'}`}
      onClick={() => mode !== m && onPick(m)}>{m === 'simple' ? N.mode.simple : N.mode.pro}</button>)}
  </div>;
}

const KEPT = 'Your answers stay on this device, in this browser only.';

/** What a figure typed reads as, in the engine's words (₹6 lakh), or nothing when it is said as typed. */
function readBack(c: Case, id: FactId, t: string): string | undefined {
  if (factProblem(id, t) || !t.trim()) return undefined;
  const text = factsOf({ s: writeFact(c.s, id, t), mine: [...c.mine, id] }).find((f) => f.id === id)?.text;
  return text && text.replace(/[\s,%]/g, '') !== t.replace(/[\s,%]/g, '') ? text : undefined;
}

/** The figures a lender reads first, each against the level they look for: the engine's own words and figures; each a
 * "—" until every figure is understood (UX8, D-UX-106). */
function Tiles({ p, c }: { p: Preview; c: Case }) {
  if (p.blocked) return null;
  const t = c.s.target, emi = /^EMI (.+) a month$/.exec(p.loanLine?.instalment ?? '');
  const tile = 'rounded-card bg-surface px-3.5 py-3';
  return <dl data-testid="tiles" class="mt-5 grid grid-cols-2 gap-2">
    <div class={tile}><dt class="text-sm text-ink-muted">{N.tiles.average}</dt>
      <dd><span data-testid="dscr-average" class="block text-[1.75rem] leading-tight font-semibold text-ink tabular-nums">{p.average ?? '—'}</span>
        {t.average.trim() && <span class="text-sm text-ink-muted">{N.tiles.against(t.average)}</span>}</dd></div>
    <div class={tile}><dt class="text-sm text-ink-muted">{N.tiles.lowest}</dt>
      <dd><span data-testid="dscr-lowest" class="block text-[1.75rem] leading-tight font-semibold text-ink tabular-nums">{p.lowest ?? '—'}</span>
        <span class="text-sm text-ink-muted">{p.lowestYear && <span data-testid="dscr-lowest-year" class="whitespace-nowrap">{N.tiles.inYear(p.lowestYear)}</span>}
          {t.minimum.trim() && <>{p.lowestYear ? ' · ' : ''}{N.tiles.against(t.minimum)}</>}</span></dd></div>
    {c.s.source === 'plan' && <>
      <div class={tile}><dt class="text-sm text-ink-muted">{emi ? N.tiles.emi : 'Each instalment'}</dt>
        <dd data-testid="dscr-instalment" class={`font-semibold text-ink tabular-nums ${emi || !p.loanLine ? 'text-xl' : 'text-base'}`}>{emi ? emi[1] : p.loanLine?.instalment ?? '—'}</dd></div>
      <div class={tile}><dt class="text-sm text-ink-muted">{N.tiles.interest}</dt>
        <dd data-testid="dscr-total-interest" class="text-xl font-semibold text-ink tabular-nums">{p.loanLine?.totalInterest ?? '—'}</dd></div>
    </>}
  </dl>;
}

/** The engine's whole options that work (D-UX-346): was → becomes, each used in one tap. */
function Options({ options, onUse }: { options: OptionCard[]; onUse: (o: OptionCard) => void }) {
  return <div data-testid="options" class="mb-6">
    <h2 class="font-heading text-xl font-semibold text-ink">{N.options.title}</h2>
    <p class="mt-1 text-base text-ink-muted">{N.options.lead}</p>
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

/** See the working, as pictures (PIC1, Rahul, 13-11-2026: "A picture or graphics speaks a thousand words"): where it
 * stands, each target as a bar against its level, the room to move, the other checks, the statement that adds up and the
 * schedule. Each year against the target is the chart's, above, and is not said again here (Rahul, 12-11-2026). */
function Working({ p, update, toPro }: { c: Case; p: Preview; update: Update; toPro: (where?: string) => void }) {
  return <div>
    <p data-testid="dscr-status" data-result={p.blocked ? 'blocked' : p.needs.length ? 'provisional' : 'ready'} class="mb-1 text-base text-ink">{statusText(p)}</p>
    {p.needs.length > 0 && <ul data-testid="dscr-needs" class="mb-3 list-disc space-y-0.5 pl-5 text-base text-ink-muted">{p.needs.map((n) => <li key={n}>{n}</li>)}</ul>}
    {p.blocked && <p data-testid="dscr-blocked" role="alert" class="text-bad">{p.blocked}</p>}
    {p.verdict && <Targets v={p.verdict} />}
    <Room p={p} onAmount={(n) => update((x) => ({ ...x, loan: { ...x.loan, amount: inr(n) } }))}
      onFewest={(n) => update((x) => ({ ...x, loan: { ...x.loan, instalments: String(n) } }))} />
    {p.lender && <LenderLines v={p.lender} openMore={() => toPro('lender')} />}
    {p.statement && <StatementTable st={p.statement} parts={p.partYears} />}
    {p.beforeStart && <p data-testid="dscr-before-start" class="mt-2 text-sm text-ink-muted">{p.beforeStart}</p>}
    {p.notCounted && <p data-testid="dscr-not-counted" class="mt-2 text-sm text-ink-muted">{p.notCounted}</p>}
    {p.notes.length > 0 && <ul data-testid="dscr-notes" class="mt-2 space-y-0.5 text-sm text-warn">{p.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
    {p.schedule && <Schedule sch={p.schedule} />}
  </div>;
}

/** A reason as the borrower reads it: the pointer to our own files (its source, kept in the data) left off the screen. */
const plain = (why: string) => why.replace(/\s*\([^()]*\b[\w/.-]+\.(?:md|json)\)/g, '');

/** What we filled in (NEW1e, then PIC1, Rahul, 13-11-2026: "text is the worst way to display verbose information"):
 * each assumption a chip of a few words, under its group as a borrower thinks of them; a tap opens it in place, the
 * whole line, the reason, and Change to its box in Professional mode. A figure in a chip is the data file's own. */
function Assumed({ p, onChange }: { p: Preview; onChange: (where?: string) => void }) {
  const F = N.filled;
  const rows = p.assumed.map((a) => {
    const what = F.plain[a.id]?.[0] ?? a.what, shown = F.plain[a.id]?.[1] ?? a.shown, chip = F.chip[a.id];
    // Without a chip of its own words the chip is the figure itself (the tax rate, the target), and is not said twice.
    return { ...a, why: plain(a.why), what, chip: chip ?? (F.figure[a.id]?.(a.shown) ?? a.shown), line: chip ? `${what}: ${shown}.` : `${what}.` };
  });
  if (!rows.length) return null;
  const groups = (Object.keys(F.groups) as (keyof typeof F.groups)[]).map((g) => [g, rows.filter((a) => (F.of[a.id] ?? 'profit') === g)] as const).filter(([, r]) => r.length);
  return <div data-testid="dscr-assumed" class="assumed-groups">
    {groups.map(([g, list]) => <section key={g} aria-labelledby={`assumed-${g}`}>
      <h3 id={`assumed-${g}`} class="assumed-head">{F.groups[g]}</h3>
      <ul class="assumed-chips">
        {list.map((a) => <li key={a.id} data-testid={`assumed-${a.id}`}>
          <details class="assumed">
            <summary class="assumed-chip">{a.chip}<svg aria-hidden="true" viewBox="0 0 16 16" class="assumed-chev"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" /></svg></summary>
            <div class="assumed-body">
              <p class="font-medium text-ink">{a.line}</p>
              <p class="mt-1">{a.why}.</p>
              {a.where && <a href={`#${a.where}`} class={`${QUIET} -ml-3`} onClick={(e) => { e.preventDefault(); onChange(a.where); }}>{F.change1}<span class="sr-only">: {a.what}</span></a>}
            </div>
          </details>
        </li>)}
      </ul>
    </section>)}
  </div>;
}

/** Simple mode says what it filled in from the answers (Rahul, 12-11-2026), and the way to change it. */
function Filled({ p, onChange }: { p: Preview; onChange: (where?: string) => void }) {
  if (!p.assumed.length) return null;
  return <section data-testid="filled" aria-labelledby="filled-title" class="mt-8">
    <h2 id="filled-title" class="font-heading text-lg font-semibold text-ink">{N.filled.title}</h2>
    <p class="mt-1 text-base text-ink-muted">{N.filled.lead(p.assumed.length)}</p>
    <div class="mt-3"><Assumed p={p} onChange={onChange} /></div>
    <button type="button" data-testid="to-pro" onClick={() => onChange()} class={QUIET}>{N.filled.change}</button>
  </section>;
}
