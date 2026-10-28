/**
 * The planning estimate (E1, E3, V1, L1): six questions, then the estimate worked out as an architect would, short by default
 * and deeper by tapping. The answer: the total and the level's range by its choices under it, the cost a sq ft with the
 * rates' line, the five levels (Compare and a new
 * house's stages closed under them), each section as one line with its amount, and the flags that can change the
 * decision, largest first. One tap away, each with its count: a section's switch, slider and items; the other things to
 * check; what the estimate assumes; the rooms (the bar of shares; rooms added or taken out; each one's size by a word or
 * typed, and its own level). Two taps: an item's drawer (the choices at the line's level, then each other level's and the
 * family's items at no level, each one tap away; brands, and how the line was worked out, with its sources). Then the
 * planning estimate to download; the bar at the bottom says what the
 * last change did. Figures: engine/architect.ts only, via plan-model.ts.
 */
import { questionsLeft } from '../verdict';
import { Fragment } from 'preact';
import { useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import { answerRule, BAR_ARROW, BUTTON, Choice, Counter, Dash, FILLED, Folded, goTo, HINT, LABEL, Section, SelectField, SourceNote, STATE, TextField, Tick, toAnswer, useAnswerPlace, InAppNote, useHomeCase, HomeCaseNote, useKept, KeptLine } from '../fields';
import { ESTIMATE_HOME } from './home-case';
import { AnswersColumn, foldGrid, SeeAnswer, useFold, type AnswerGroup } from '../Fold';
import { printable } from '../doc/pdf';
import { BRAND_NOTICE } from '../site';
import { isoDate, save, type FileKind } from '../download';
import { sharePlan } from './shared';
import { billDoc, billFileName, planDoc, planDocNeeds, planDocStatus, planFileName } from './plan-document';
import {
  BHK_CHOICES, CITY_CHOICES, EMPTY_PLAN, HOME_CHOICES, LEVEL_CHOICES, LEVEL_NAMES, RULE_HEIGHT, WORD_CHOICES, WORK_CHOICES, areaLabel, builds, checkedLine, floorsQuestion, drawerView, heightOf, plainOf, planPreview, sideUnit,
  withItem, withKind, withLevel, withPlotReset, withPlotSide, withAttached, withBalcony, withExtra, withBathAdded, withBathTakenOut, withBedroomAdded, withBedroomTakenOut, withBhk, withRoomLevel, withRoomReset, withRoomSide, withRoomWord, withSection, withSewer, withSlider, withUnit,
  type AreaUnit, type DrawerView, type LineView, type PlanFacts, type PlanPreview, type PlanState, type PlanView, type RoomView, type RungView, type SectionView, type WhyView,
  drawerBrands, groupKey,
} from './plan-model';
import type { Bhk, ExtraKind, Level } from '../../../engine/architect';

type Update = (f: (s: PlanState) => PlanState) => void;
// Tokens only (docs/DESIGN.md, Tokens); on paper they take the light page's values (global.css, `.paper`).
const MUTED = 'text-ink-muted';
const INK = 'text-ink';
/** A group set off by its fill, never a border all round (F3). */
const CARD = 'rounded-card bg-surface p-4';
const CHIP = 'flex cursor-pointer items-center gap-2 rounded-full border border-edge bg-field px-3 py-1.5 text-ink has-checked:border-ink has-checked:outline has-checked:outline-ink';
const RADIO = 'size-4 shrink-0 text-base accent-ink';
/**
 * One of a room's four size buttons: a radio, so the arrow keys move along them and a screen reader names the group. Set
 * off by its fill, the chosen one by the accent's outline, as Choice is in the new look (F3).
 */
const SEG = 'flex min-h-11 cursor-pointer items-center justify-center rounded-control bg-surface px-1 py-1 text-center text-sm leading-tight text-ink has-checked:font-semibold has-checked:outline-2 has-checked:-outline-offset-2 has-checked:outline-ink has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus';
/** A link inside a sentence keeps its line (F8). */
const LINK = 'text-link underline underline-offset-4';
/** A closed line's summary, standing alone: no line until hovered (F8); 24 px tall from global.css. */
const SUMMARY = 'cursor-pointer text-sm text-link underline-offset-4 hover:underline';
/**
 * The bar of shares' colours by kind: the four kinds of room in the reference palette's first four slots, in that order,
 * checked for colour-blind separation in light and dark; the passage and the inside walls in greys. Every part is also named
 * with its share in the list under the bar, so no colour is read alone. The colours are tokens (`--share-*`, global.css).
 */
const SHARE_COLOR: Record<string, string> = {
  living: 'bg-share-living', bedroom: 'bg-share-bedroom', kitchen: 'bg-share-kitchen', bath: 'bg-share-bath',
  pooja: 'bg-share-pooja', study: 'bg-share-study', utility: 'bg-share-utility', store: 'bg-share-store',
  passage: 'bg-share-passage', walls: 'bg-share-walls',
};

export function PlanEstimate() {
  const [s, setS] = useState<PlanState>(EMPTY_PLAN);
  const home = useHomeCase(setS, () => ESTIMATE_HOME);
  useKept('plan', s, setS, EMPTY_PLAN);
  const update: Update = (f) => setS(f);
  const p = useMemo(() => planPreview(s), [s]);
  const place = useAnswerPlace('pl-result');
  sharePlan(s, { first: p.needs.map(askedIn).find(Boolean), left: p.needs.length });
  // The six answers fold the first time the estimate works out (A8), and the answer takes the focus: from 1024 px to the
  // rail beside it, on a phone to "Edit answers" and its one line (OR9, LOOP1d); "See the answer" folds them again.
  const v = p.view, f = useFold(!!v && !p.blocked, 'pl-result-h'), first = useRef(false);
  useLayoutEffect(() => { if (v && !p.blocked && !first.current) { first.current = true; f.see(); } }, [v, p.blocked]);
  // A new package resets every section, item, brand and room level, so the tap can be undone from the bar (principle 8;
  // review finding 3); the level already chosen does nothing.
  const [undo, setUndo] = useState<{ before: PlanState; after: PlanState } | null>(null);
  const toLevel = (level: Level) => {
    if (level === s.level) return;
    const after = withLevel(s, level);
    setUndo(p.view ? { before: s, after } : null);
    setS(after);
  };
  const undone = () => {
    if (!undo) return;
    setS(undo.before); setUndo(null);
    // The Undo button goes, so the focus moves to the level chosen again (docs/DESIGN.md, Focus).
    requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-testid^="pl-strip-"][aria-pressed="true"]')?.focus());
  };
  const questions = <>
    <Questions s={s} update={update} p={p} toLevel={toLevel} see={v && !p.blocked && !f.fold ? f.see : undefined} />
    {p.blocked && <p data-testid="pl-blocked" role="alert" class={`mt-4 ${answerRule(true)} py-2 text-sm text-ink`}>{p.blocked}</p>}
  </>;
  // From 1024 px the questions and the sections stand left and the answer panel right (UX8, D-UX-106); folded, the rail
  // stands left and the answer and the sections take the rest. One tree folded or not (GOTCHAS, folding).
  return <div class={foldGrid(f, 'lg:grid lg:grid-cols-tool lg:gap-x-12')}>
    <AnswersColumn f={f} pre="pl" groups={() => (v ? railOf(s, v) : [])} summary={v?.summary} rows={3}
      unfolded={<><HomeCaseNote on={home} /><KeptLine />{questions}</>}>{questions}</AnswersColumn>
    {/* The answer as paper, there from load as its outline, and the one sheet with a shadow (docs/DESIGN-SITE.md, tool pages). */}
    <div class={f.fold ? 'lg:col-start-2 lg:row-start-1' : 'lg:col-start-2 lg:row-start-1 lg:row-end-3'}>{f.fold && <HomeCaseNote on={home} />}<section id="pl-result" aria-labelledby="pl-result-h" class={f.fold ? 'mt-4' : 'answer-panel mt-6 lg:mt-4'}>
      <h2 id="pl-result-h" tabIndex={-1} class="sr-only text-section">The estimate</h2>
      <div class="paper shadow-paper rounded-card p-3 sm:p-6">{v ? <Answer v={v} toLevel={toLevel} /> : <Outline p={p} />}</div>
    </section></div>
    {v && <div class={f.fold ? 'lg:col-start-2 lg:row-start-2' : 'lg:col-start-1 lg:row-start-2'}>
      <Sections s={s} v={v} update={update} />
      <Checks s={s} v={v} update={update} />
      <Rooms s={s} v={v} update={update} />
    </div>}
    <div class={f.fold ? 'lg:col-start-2 lg:row-start-3' : 'lg:col-span-2 lg:row-start-3'}>
      {v ? <Download s={s} p={p} update={update} />
        : <Folded id="pl-download" title="Download the planning estimate">A PDF, an Excel copy and a Word copy, once the six are answered.</Folded>}
    </div>
    {/* The answer bar (D-UX-84), from load as on every tool (UX8, review finding 13): text read out as it changes, one 44 px
        arrow to the answer; solid, no blur (principle 10). From 1024 px only what changed stays in sight, for its Undo. */}
    <div data-testid="pl-sticky" class={`sticky bottom-0 z-10 -mx-4 mt-10 border-t border-line bg-canvas px-4 sm:-mx-8 sm:px-8 lg:col-span-2 ${v?.change ? 'lg:pb-2' : 'lg:sr-only'}`}>
      {/* What changed (A8): one line after a change, said aloud as it comes; a new package can be undone beside it. */}
      {v && <div class="flex items-center gap-2">
        <p data-testid="pl-what-changed" aria-live="polite" class={`min-w-0 flex-1 pt-2 line-clamp-2 text-sm empty:hidden ${INK}`}>{v.change && <>
          <span class="font-medium">{v.change.text}</span>{v.change.items && <span class={MUTED}> · {v.change.items}</span>}
        </>}</p>
        {undo && s === undo.after && v.change && <button type="button" data-testid="pl-level-undo" class={`mt-2 shrink-0 ${BUTTON}`} onClick={undone}>Undo</button>}
      </div>}
      <div class="flex items-center gap-2 lg:sr-only">
        <p data-answer-echo aria-live="polite" class={`flex-1 py-2 text-sm font-medium ${INK}`}>{v
          ? <>Total <span data-testid="pl-sticky-total" class="whitespace-nowrap tabular-nums">{v.headline}</span></> : stillText(p)}</p>
        <a href="#pl-result" aria-label="To the estimate" onClick={toAnswer} class={`${BAR_ARROW} ${place === 'in' ? 'pointer-events-none opacity-0 focus-visible:opacity-100' : ''}`}><span aria-hidden="true">{place === 'above' ? '↑' : '↓'}</span></a>
      </div>
    </div>
  </div>;
}

/** The six answers as the rail shows them, in the words the estimate reads them back in (LOOP1d). */
const railOf = (s: PlanState, v: PlanView): AnswerGroup[] => [
  { title: 'The work', rows: [['What the work is', v.kind], [builds(s.kind) ? 'Floors' : 'Flat or house', v.home], ['City', v.city]] },
  { title: 'The home', rows: [[v.areaName, v.area], ['Bedrooms', v.bhk], ['Level', v.level]] },
];

/** The question each of the engine's needs is answered in, by its first words (engine/architect.ts). */
const ASKED: [string, string][] = [['What the work', 'fld-work'], ['How many floors', 'fld-floors'], ['Flat or house', 'fld-home'], ['Which city', 'fld-city'],
  ['The built-up', 'fld-carpet'], ['The carpet', 'fld-carpet'], ['How many bedrooms', 'fld-bhk'], ['Which level', 'fld-level']];
const askedIn = (need: string) => ASKED.find(([w]) => need.startsWith(w))?.[1];
const stillText = (p: PlanPreview) => (p.blocked ? 'No figures' : questionsLeft(p.needs.length));

/** Before the six answers, the estimate's outline (UX8, review finding 2): the total and the cost a sq ft as "—", never 0,
 * and one counter opening to a link to each question still to answer. */
function Outline({ p }: { p: PlanPreview }) {
  const first = p.needs.map(askedIn).find(Boolean);
  return <>
    <p class={`figure text-section ${INK}`}><Dash what="The total" to={first} /></p>
    <p class={`mt-1 ${MUTED}`}><Dash what="The cost a sq ft" to={first} /> a sq ft</p>
    <Counter id="pl-status" result={p.blocked ? 'blocked' : 'provisional'} text={stillText(p)} rule answer class="mt-2">
      {p.needs.length > 0 && <ul data-testid="pl-needs" class="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink-muted">{p.needs.map((n) => {
        const to = askedIn(n);
        return <li key={n}>{to ? <a href={`#${to}`} onClick={goTo(to)} class="inline-flex min-h-6 items-center text-link">{n}</a> : n}</li>;
      })}</ul>}
    </Counter>
  </>;
}

/** The six questions (A3): each in a block of its own, counted by the site check. */
function Questions({ s, update, p, toLevel, see }: { s: PlanState; update: Update; p: PlanPreview; toLevel: (l: Level) => void; see?: () => void }) {
  const badArea = plainOf(s.area) === null;
  return <div id="six-questions">
    <div data-question>
      <Choice name="fld-work" legend="What is the work?" options={WORK_CHOICES} value={s.kind} columns onChange={(k) => update((x) => withKind(x, k))} />
    </div>
    <div data-question>
      {builds(s.kind)
        ? <Choice name="fld-floors" legend={floorsQuestion(s.kind).legend} options={floorsQuestion(s.kind).options} value={s.floors ? String(s.floors) : undefined} columns onChange={(f) => update((x) => ({ ...x, floors: Number(f) }))} />
        : <Choice name="fld-home" legend="Flat or house?" options={HOME_CHOICES} value={s.home} columns onChange={(home) => update((x) => ({ ...x, home }))} />}
    </div>
    <div data-question>
      <SelectField id="fld-city" class="mt-6" label="Which city?" value={s.city ?? ''} placeholder="Choose a city" options={CITY_CHOICES}
        onChange={(city) => update((x) => ({ ...x, city: city || undefined }))} />
    </div>
    <div data-question class="mt-6">
      <label for="fld-carpet" class={LABEL}>How big? {areaLabel(s.kind)}</label>
      <div class="mt-1 flex flex-wrap items-start gap-3">
        <TextField id="fld-carpet" class="w-40 [&>label]:sr-only" label={builds(s.kind) ? 'Built-up area' : 'Carpet area'} inputMode="decimal" value={s.area} placeholder={s.kind === 'build' ? 'like 2000' : s.kind === 'extend' ? 'like 1000' : 'like 850'}
          invalid={badArea} said={badArea ? 'Not understood. Type a number, like 850.' : undefined} onCommit={(area) => update((x) => ({ ...x, area }))} />
        <fieldset class="mt-2 flex gap-2">
          <legend class="sr-only">Unit of the area</legend>
          {(['sqft', 'sqm'] as AreaUnit[]).map((u) => <label key={u} for={`fld-carpetUnit-${u}`} class={CHIP}>
            <input type="radio" id={`fld-carpetUnit-${u}`} name="fld-carpetUnit" checked={s.unit === u} onChange={() => update((x) => withUnit(x, u))} class={RADIO} />
            {u === 'sqft' ? 'sq ft' : 'sq m'}
          </label>)}
        </fieldset>
      </div>
    </div>
    <div data-question>
      <fieldset id="fld-bhk" class="mt-6 min-w-0">
        <legend class={LABEL}>How many bedrooms?</legend>
        <div class="mt-2 flex flex-wrap gap-2">
          {BHK_CHOICES.map((b) => <label key={b.value} for={`fld-bhk-${b.value}`} class={CHIP}>
            <input type="radio" id={`fld-bhk-${b.value}`} name="fld-bhk" checked={s.bhk === b.value} onChange={() => update((x) => withBhk(x, b.value as Bhk))} class={RADIO} />
            {b.label}
          </label>)}
        </div>
      </fieldset>
    </div>
    <div data-question>
      <Choice name="fld-level" legend="Which level?" options={LEVEL_CHOICES} value={s.level ? String(s.level) : undefined} columns
        onChange={(l) => toLevel(Number(l) as Level)} />
    </div>
    <SeeAnswer pre="pl" onSee={see} />
    {p.needs.length === 6 && <p class={`mt-4 ${HINT}`}>The estimate appears as soon as the six are answered.</p>}
  </div>;
}

/** The answer (A8, V1, L1): the total rounded and the level's range as a bar, the cost a sq ft, the exact total and the
 * rates' line, the five levels, Compare and a new house's stages. */
function Answer({ v, toLevel }: { v: PlanView; toLevel: (l: Level) => void }) {
  return <>
    {/* The answer in words and its figure, marked for the load measure (docs/LOAD-MEASURE.md, count 8). As precise as the
        estimate (UX8, review finding 5): rounded here, to the rupee in the bill and the documents, as the page says. */}
    <div data-answer class={answerRule(true)}>
      <p data-testid="pl-total" data-result={'ready'} class={`figure text-section ${INK}`}>{v.headline}</p>
      {v.rangeBar ? <Range r={v.rangeBar} /> : v.range.text && <p data-testid="pl-range" class={`mt-1 text-sm ${INK}`}>{v.range.text}</p>}
      <p class={`mt-1 ${MUTED}`}><span data-testid="pl-per-sqft" class="whitespace-nowrap tabular-nums">Rs. {v.perSqft}</span> a sq ft of {v.areaName.toLowerCase()}</p>
      <p data-testid="pl-exact" class={`mt-1 text-sm ${MUTED}`}>Exact: <span class="whitespace-nowrap tabular-nums">Rs. {v.total}</span>, as in the bill and the documents.</p>
    </div>
    <p data-testid="pl-rates" class={`mt-2 flex items-start gap-1.5 text-sm ${MUTED}`}><Tick />{v.ratesLine}</p>
    {/* Edged, never filled: the chosen level takes an edge in ink (UX7: the accent is for links alone) (principle 6; F4 asks a filled control to be a pill).
        The five totals read as a chart's labels: 12 px on a phone, where "Standard" at 14 px overflows its fifth of 360 px. */}
    <div role="group" aria-label="The total at each level; choose one to switch the package" class="-mx-1 mt-4 grid grid-cols-5 gap-0.5 sm:mx-0 sm:gap-1">
      {v.strip.map((x) => <button key={x.level} type="button" data-testid={`pl-strip-${x.level}`} aria-pressed={x.current} onClick={() => toLevel(x.level)}
        class={`min-h-11 min-w-0 rounded-control px-0 text-center ${x.current ? 'border-2 border-ink py-1' : 'border border-edge py-1.25'}`}>
        <span class={`block text-xs leading-tight sm:text-sm ${x.current ? "font-semibold" : ""} ${INK}`}>{x.name}</span>
        <span class={`block text-xs leading-tight tabular-nums sm:text-sm ${MUTED}`}>{x.total}<span class="sr-only"> (Rs. {x.full})</span></span>
      </button>)}
    </div>
    <p class={`mt-1 text-sm ${MUTED}`}>Each level as a package, in Rs. lakh; tap one to switch.</p>
    <Compare v={v} />
    {v.stages && <Stages v={v} />}
  </>;
}

/** The level's range as a bar (UX8, review finding 5): its ends rounded as the headline, the total a mark on it. */
function Range({ r }: { r: NonNullable<PlanView['rangeBar']> }) {
  return <figure class="mt-3">
    <div aria-hidden="true" class="relative h-1.5 rounded-full bg-line">
      {r.at !== undefined && <span class="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink" style={{ left: `${r.at.toFixed(1)}%` }} />}
    </div>
    <p class={`mt-1 flex justify-between gap-3 text-sm tabular-nums ${INK}`}><span>{r.low}</span><span>{r.high}</span></p>
    <figcaption data-testid="pl-range" class={`text-sm ${MUTED}`}>{r.text}</figcaption>
  </figure>;
}

/** A chevron for a line that opens, turned down when open; drawn, so it adds no word to the page. */
const CHEVRON = <svg aria-hidden="true" viewBox="0 0 20 20" class="size-4 shrink-0 text-ink-muted transition-transform group-open:rotate-90">
  <path fill="currentColor" d="M7.3 4.3a1 1 0 0 1 1.4 0l5 5a1 1 0 0 1 0 1.4l-5 5a1 1 0 1 1-1.4-1.4L11.6 10 7.3 5.7a1 1 0 0 1 0-1.4z" />
</svg>;

/**
 * The sections (V1): one line each with its count of items and its amount, the largest in the package first and those
 * off last, so a slider moves no line. A tap opens the section: its switch, its slider and its items, each with Change
 * for its drawer. The items, and the section's Why? (T1), are drawn only while the section is open.
 */
function Sections({ s, v, update }: { s: PlanState; v: PlanView; update: Update }) {
  const [opened, setOpened] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState<string | null>(null);
  // The open drawer, and its other levels opened or closed by a tap: the brand notice follows what they show (D-BIZ-05).
  const [groups, setGroups] = useState<Record<string, boolean>>({});
  const setGroup = (k: string, o: boolean) => setGroups((m) => (m[k] === o ? m : { ...m, [k]: o }));
  const d = useMemo(() => (open ? drawerView(s, v, open) : undefined), [open, s, v]);
  const width = new Map(v.bar.map((b) => [b.id, b.width]));
  const list = [...v.sections.filter((x) => x.on).sort((a, b) => b.pkg - a.pkg), ...v.sections.filter((x) => !x.on)];
  return <Section id="pl-sections" title="By section">
    {/* A table's figures in full rupees, the unit in the column's head (UX8, review finding 4); over the amounts, clear of the chevron. */}
    <p class={`mt-4 pr-7 text-right text-sm ${MUTED}`}>Rs.</p>
    <ul data-testid="pl-bar" class="divide-y divide-line">
      {list.map((x) => {
        // The section's own level, named on its line only when it differs from the package.
        const own = x.on && x.slider && (x.mixed > 0 || (x.level !== null && x.level !== s.level));
        return <li key={x.id}>
          <details id={`pl-card-${x.id}`} data-testid={`pl-card-${x.id}`} class="group"
            onToggle={(ev) => { const o = (ev.currentTarget as HTMLDetailsElement).open; setOpened((m) => (m[x.id] === o ? m : { ...m, [x.id]: o })); }}>
            <summary data-testid={`pl-bar-${x.id}`} class="flex cursor-pointer list-none items-center gap-2 rounded-control px-1 py-2 hover:bg-surface [&::-webkit-details-marker]:hidden">
              <span class="min-w-0 flex-1">
                <span class={`flex items-baseline justify-between gap-3 text-sm ${INK}`}>
                  <span class="min-w-0">{x.name}{x.on && x.lines.length > 0 && <> <span class={`ml-1 text-sm ${MUTED}`}>{x.lines.length} item{x.lines.length === 1 ? '' : 's'}</span></>}
                    {own && <> <span data-testid={`pl-own-${x.id}`} class={`ml-1 text-sm ${MUTED}`}>{x.mixed ? x.mixedText : x.levelName}</span></>}</span>
                  <span data-testid={`pl-amount-${x.id}`} class={`shrink-0 tabular-nums ${x.on && x.n !== 0 ? '' : MUTED}`}>{!x.on ? 'Off' : x.n === 0 ? 'Nothing at this level' : x.amount}</span>
                </span>
                {x.on && x.n > 0 && <span aria-hidden="true" class="mt-1 block h-1.5 rounded-r bg-ink-muted" style={{ width: `${width.get(x.id) ?? 1}%` }} />}
              </span>
              {CHEVRON}
            </summary>
            <div class="mb-3 rounded-control bg-surface p-3">
              <div class="flex items-center justify-between gap-3">
                <p class={`min-w-0 text-sm ${MUTED}`}>{x.on ? x.where : 'Not in this estimate'}</p>
                <label for={`fld-on-${x.id}`} class={`flex shrink-0 items-center gap-2 text-sm ${INK}`}>
                  <input type="checkbox" role="switch" id={`fld-on-${x.id}`} checked={x.on} onChange={(e) => update((st) => withSection(st, x.id, (e.currentTarget as HTMLInputElement).checked))}
                    class="size-5 text-base accent-ink" />
                  <span><span class="sr-only">{x.name}: </span>{x.on ? 'On' : 'Off'}</span>
                </label>
              </div>
              {x.on && <>
                {x.slider ? <Slider s={s} x={x} update={update} /> : <p class={`mt-1 text-sm ${MUTED}`}>The same at every level</p>}
                {x.over && <p data-testid={`pl-over-${x.id}`} class={`mt-2 text-sm tabular-nums ${MUTED}`}>{x.over.text}</p>}
                {x.lines.length === 0 && <p data-testid={`pl-spec-${x.id}`} class={`mt-2 text-sm ${INK}`}>Nothing at this level</p>}
              </>}
              {opened[x.id] && x.why && <Why id={`pl-why-section-${x.id}`} about={x.name} title="Where to spend, where to save" w={x.why} />}
              {x.on && opened[x.id] && x.lines.length > 0 && <ol data-testid={`pl-items-${x.id}`} class="mt-2 divide-y divide-line">
                {x.lines.map((l) => <Item key={l.key} s={s} l={l} open={open === l.key} d={open === l.key ? d : undefined} groups={groups} setGroup={setGroup} toggle={() => setOpen((k) => (k === l.key ? null : l.key))} update={update} />)}
              </ol>}
              {/* The brand notice where a brand shows in the section, in the items' own type (D-BIZ-03): a line's item names one, or the open drawer shows one (D-BIZ-05). Closed with the answer, so V1's count is unchanged. */}
              {x.on && opened[x.id] && x.lines.length > 0 && (x.brands || (!!d && drawerBrands(x.lines.find((l) => l.key === d.key), d, groups))) && <p data-testid={`pl-brand-notice-${x.id}`} class={`mt-2 text-sm ${INK}`}>{BRAND_NOTICE}</p>}
            </div>
          </details>
        </li>;
      })}
    </ul>
    {v.split && <p data-testid="pl-split" class={`mt-3 text-sm ${INK}`}>{v.split.map((x, i) => <Fragment key={x.label}>{i ? ' · ' : ''}{x.label} <span class="whitespace-nowrap">Rs. {x.amount}</span></Fragment>)}</p>}
  </Section>;
}

/** Five stops, snapping; the package's stop marked. Moving it sets every item of the section to that level. */
function Slider({ s, x, update }: { s: PlanState; x: SectionView; update: Update }) {
  const level = (x.level ?? s.level ?? 2) as Level;
  return <div class="mt-2">
    <label for={`fld-slider-${x.id}`} class={`text-sm ${INK}`}>
      Level: <span data-testid={`pl-level-${x.id}`} class="font-medium">{x.mixed ? x.mixedText : x.levelName}</span>
      {!x.mixed && level === s.level && <span class={MUTED}> (the package)</span>}
    </label>
    <input type="range" id={`fld-slider-${x.id}`} min={1} max={5} step={1} value={level} aria-valuetext={x.mixed ? `Mixed, around ${x.levelName}` : x.levelName}
      onInput={(e) => update((st) => withSlider(st, x.id, Number((e.currentTarget as HTMLInputElement).value) as Level, x.lines.map((l) => l.key)))}
      class="mt-1 block w-full text-base accent-ink" />
    <div aria-hidden="true" class="mt-0.5 grid grid-cols-5 text-center text-xs leading-tight">
      {LEVEL_NAMES.map((n, i) => <span key={n} class={i + 1 === s.level ? `font-semibold underline underline-offset-2 ${INK}` : MUTED}>{n}</span>)}
    </div>
  </div>;
}

/** One line of a section, and its drawer when opened. */
function Item({ s, l, open, d, groups, setGroup, toggle, update }: { s: PlanState; l: LineView; open: boolean; d?: DrawerView; groups: Record<string, boolean>; setGroup: (k: string, o: boolean) => void; toggle: () => void; update: Update }) {
  return <li data-testid={`pl-line-${l.key}`} class="py-2">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class={`text-sm ${INK}`}><span class={MUTED}>{l.room}:</span> {l.item}{l.chosen ? ' (your choice)' : ''}</p>
        <p class={`text-sm tabular-nums ${MUTED}`}>{l.qty} {l.unit} × <span class="whitespace-nowrap">Rs. {l.rate}</span> = <span class={`whitespace-nowrap font-medium ${INK}`}>Rs. {l.amount}</span></p>
      </div>
      <button type="button" data-testid={`pl-open-${l.key}`} aria-expanded={open} class={`shrink-0 ${BUTTON}`} onClick={toggle}>{open ? 'Close' : 'Change'}</button>
    </div>
    {l.why && <Why id={`pl-why-${l.key}`} about={`${l.room}, ${l.name.toLowerCase()}`} w={l.why} />}
    {open && d && <Drawer s={s} l={l} d={d} groups={groups} setGroup={setGroup} update={update} />}
  </li>;
}

/**
 * A line's or a section's Why? (T1, D-UX-34): closed until tapped, never in the answer. The notes, each under its label, then
 * their sources, linked, and whether they are still as reported. No amount: the line's figures are the engine's.
 */
function Why({ id, about, title, w }: { id: string; about: string; title?: string; w: WhyView }) {
  return <details data-testid={id} class="mt-1 text-sm">
    <summary class="inline-flex cursor-pointer items-center gap-1 text-link underline-offset-4 hover:underline">
      <span aria-hidden="true">ⓘ</span> Why?<span class="sr-only"> {about}</span>
    </summary>
    <div class={`mt-1 space-y-1 ${INK}`}>
      {title && <p class="font-medium">{title}</p>}
      {w.items.map((x, i) => <p key={i}><span class="font-medium">{x.label}:</span> {x.text}</p>)}
      <p class={MUTED}>{w.sources.length
        ? <>Sources: {w.sources.map((x, i) => [i ? '; ' : '', x.url
          ? <a key={x.id} href={x.url} target="_blank" rel="noopener noreferrer" class={LINK}>{x.what}</a> : x.what])}
          {w.own ? '; and our own rule' : ''}.{w.reported ? ' Needs review: as reported, not confirmed.' : ` Verified at ${w.sources.length === 1 ? 'its page' : 'their pages'}.`}</>
        : 'Our own rule, with its reason given.'}</p>
    </div>
  </details>;
}

/**
 * The item drawer (A8, L1): the choices at the line's level first, under the level's name with their count; each other level's
 * and the family's items at no level one tap away, open when they hold the line's item; brands as chips; how the line was
 * worked out.
 */
function Drawer({ s, l, d, groups, setGroup, update }: { s: PlanState; l: LineView; d: DrawerView; groups: Record<string, boolean>; setGroup: (k: string, o: boolean) => void; update: Update }) {
  const name = `fld-item-${l.key}`;
  const choose = (x: RungView, brand?: string) => update((st) => withItem(st, l.key, x.id, brand, `${l.room}, ${l.name.toLowerCase()}: ${x.name}`));
  const rung = (x: RungView, i: string) => <li key={x.id} class="py-2">
    <label for={`${name}-${i}`} class={`flex items-start gap-3 ${x.usable ? 'cursor-pointer' : 'opacity-70'}`}>
      <input type="radio" id={`${name}-${i}`} name={name} checked={x.current} disabled={!x.usable} onChange={() => { if (!x.current) choose(x); }} class={`mt-1 ${RADIO}`} />
      <span class="min-w-0">
        <span class={`block text-sm ${INK}`}>{x.name} · <span class="tabular-nums">{x.rate}</span>{x.mark && <span class={MUTED}> ({x.mark})</span>}</span>
        <span class={`block text-sm ${MUTED}`}>{x.spec}</span>
      </span>
    </label>
    {x.brands.length > 0 && x.usable && <div class="mt-1 ml-7 flex flex-wrap gap-1.5">
      {x.brands.map((b) => {
        const on = x.current && l.brand === b;
        return <button key={b} type="button" data-testid={`pl-brand-${b}`} aria-pressed={on} onClick={() => choose(x, on ? undefined : b)}
          class={`rounded-full text-sm ${INK} ${on ? 'border-2 border-ink px-2.75 py-0.75 font-medium' : 'border border-edge px-3 py-1'}`}>{b}</button>;
      })}
    </div>}
  </li>;
  return <div data-testid="pl-drawer" class="mt-2 rounded-control bg-field p-3">
    <p class={`text-sm ${INK}`}><span class="font-medium">{l.name}</span> · {l.kind}{l.brands ? ` · ${l.brands}` : ''}</p>
    <fieldset class="mt-1 min-w-0">
      <legend class="sr-only">The item for {l.room.toLowerCase()}, {l.name.toLowerCase()}</legend>
      {d.groups.map((g, gi) => {
        const list = <ol class="divide-y divide-line">{g.choices.map((x, i) => rung(x, `${gi}-${i}`))}</ol>;
        return gi === 0
          ? <div key={g.title} data-testid={`pl-choices-${g.level ?? 'other'}`}><p class={`mt-1 text-sm font-medium ${INK}`}>{g.title}</p>{list}</div>
          : <details key={g.title} data-testid={`pl-choices-${g.level ?? 'other'}`} class="mt-1" open={groups[groupKey(d.key, g)] ?? g.open} onToggle={(ev) => setGroup(groupKey(d.key, g), (ev.currentTarget as HTMLDetailsElement).open)}>
            <summary class={SUMMARY}>{g.title}</summary>{list}
          </details>;
      })}
    </fieldset>
    {l.chosen && <button type="button" data-testid="pl-item-reset" class={`mt-2 ${BUTTON}`} onClick={() => update((st) => withItem(st, l.key, null, undefined, `${l.room}, ${l.name.toLowerCase()}: back to the level’s item`))}>Back to the level’s item</button>}
    <details class="mt-2" open>
      <summary class={`cursor-pointer text-sm font-medium ${INK}`}>How we worked this out</summary>
      <ul data-testid="pl-how" class={`mt-1 list-disc space-y-0.5 pl-5 text-sm ${INK}`}>
        <li>Quantity: {d.how.quantity}</li>
        <li>Rate: {d.how.rate.join('; ')}</li>
        <li>Amount: {d.how.amount}</li>
      </ul>
      {l.sources.length > 0 && <p class={`mt-1 text-sm ${MUTED}`}>Sources: {l.sources.map((x, i) => [i ? '; ' : '', x.url
        ? <a key={x.id} href={x.url} target="_blank" rel="noopener noreferrer" class={LINK}>{x.what}</a> : x.what])}. {checkedLine(l)}</p>}
      {l.note && <p class={`mt-1 text-sm ${MUTED}`}>{l.note}</p>}
    </details>
  </div>;
}

/** Compare (A8): each section that is on, and the total, at the five levels as a package; the estimate's own level marked. */
function Compare({ v }: { v: PlanView }) {
  const cell = (c: PlanView['compare']['totals'][number], name: string, i: number) => <td key={i} aria-label={`${name}, ${LEVEL_NAMES[i]}: Rs. ${c.full}${c.mine ? ', your level' : ''}`}
    class={`px-1 py-1 text-right ${c.mine ? 'rounded-control bg-surface font-semibold' : ''}`}>{c.text}</td>;
  return <details data-testid="pl-compare" class="mt-3">
    <summary class={SUMMARY}>Compare the five levels, section by section</summary>
    <div class="mt-2 overflow-x-auto">
      <table class={`w-full text-sm tabular-nums ${INK}`}>
        <caption class={`text-left text-sm ${MUTED}`}>Each section at each level as a package, in Rs. lakh; yours marked.</caption>
        <thead><tr class={MUTED}><th scope="col" class="py-1 pr-1 text-left font-normal">Section</th>{LEVEL_NAMES.map((n) => <th key={n} scope="col" class="px-1 py-1 text-right font-normal">{n}</th>)}</tr></thead>
        <tbody class="divide-y divide-line">
          {v.compare.rows.map((r) => <tr key={r.id} data-testid={`pl-compare-${r.id}`}>
            <th scope="row" class="py-1 pr-1 text-left font-normal">{r.name}{r.yours && <span class={`block text-sm ${MUTED}`}>{r.yours}</span>}</th>
            {r.cells.map((c, i) => cell(c, r.name, i))}
          </tr>)}
          <tr data-testid="pl-compare-total" class="font-semibold">
            <th scope="row" class="py-1 pr-1 text-left">Total{v.compare.yours && <span class={`block text-sm font-normal ${MUTED}`}>{v.compare.yours}</span>}</th>
            {v.compare.totals.map((c, i) => cell(c, 'Total', i))}
          </tr>
        </tbody>
      </table>
    </div>
  </details>;
}

/** A new house's stages for a construction loan (E5), or an extension's (E5b): what each stage covers, its amount, its share and the share by its end. */
function Stages({ v }: { v: PlanView }) {
  const st = v.stages ?? [];
  return <details data-testid="pl-stages" class="mt-2">
    <summary class={SUMMARY}>Stages for {v.loan === 'extension' ? 'an extension' : 'a construction'} loan</summary>
    <div class="mt-2 overflow-x-auto">
      <table class={`w-full text-sm tabular-nums ${INK}`}>
        <caption class={`text-left text-sm ${MUTED}`}>The structure split by published shares; the rest from the estimate's own items. For planning a loan's payments, not a lender's own schedule.</caption>
        <thead><tr class={MUTED}><th scope="col" class="py-1 pr-1 text-left font-normal">Stage</th><th scope="col" class="px-1 py-1 text-right font-normal">Rs.</th>
          <th scope="col" class="px-1 py-1 text-right font-normal">Share</th><th scope="col" class="px-1 py-1 text-right font-normal">By then</th></tr></thead>
        <tbody class="divide-y divide-line">
          {st.map((x) => <tr key={x.id} data-testid={`pl-stage-${x.id}`}>
            <th scope="row" class="py-1 pr-1 text-left font-normal">{x.name}<span class={`block text-sm ${MUTED}`}>{x.what}</span></th>
            <td class="px-1 py-1 text-right">{x.amount}</td><td class="px-1 py-1 text-right">{x.share}</td><td class="px-1 py-1 text-right">{x.upTo}</td>
          </tr>)}
          <tr data-testid="pl-stages-total" class="font-semibold">
            <th scope="row" class="py-1 pr-1 text-left">Total</th><td class="px-1 py-1 text-right">{v.total}</td><td class="px-1 py-1 text-right">100%</td><td />
          </tr>
        </tbody>
      </table>
    </div>
  </details>;
}

/** How the carpet area is shared (R1): a bar of the rooms, the passage and the inside walls, and the same as a list. */
function Shares({ v }: { v: PlanView }) {
  return <figure data-testid="pl-shares" class="mt-3">
    <figcaption class={`text-sm font-medium ${INK}`}>How your carpet area is shared</figcaption>
    <div aria-hidden="true" class="mt-1.5 flex h-4 w-full gap-0.5 overflow-hidden rounded bg-surface">
      {v.shares.map((x) => <span key={x.id} class={`h-full shrink-0 ${SHARE_COLOR[x.kind]}`} style={{ width: `calc(${x.width.toFixed(3)}% - 2px)` }} />)}
    </div>
    <ul class="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
      {v.shares.map((x) => <li key={x.id} data-testid={`pl-share-${x.id}`} class={`flex items-baseline gap-1.5 ${INK}`}>
        <span aria-hidden="true" class={`inline-block size-2.5 shrink-0 rounded-sm ${SHARE_COLOR[x.kind]}`} />
        <span class="min-w-0">{x.name}</span><span class="ml-auto tabular-nums">{x.share}</span>
      </li>)}
    </ul>
  </figure>;
}

/**
 * The rooms (A8, R1, R2, R2b): how the carpet area is shared; a bedroom, a bathroom, the balcony, a pooja room, a study, a utility or a store room added or taken out, a bathroom
 * attached to a bedroom; each room's size by four buttons (Compact, Medium, Above medium, Spacious) or typed, and its own
 * level. Closed until opened: not on the default path.
 */
function Rooms({ s, v, update }: { s: PlanState; v: PlanView; update: Update }) {
  const unit = sideUnit(s.unit);
  const levels = [{ value: '', label: 'As the sections' }, ...LEVEL_CHOICES.map((l) => ({ value: l.value, label: l.label }))];
  // Each field is named by its room for a screen reader; on screen the room's name is the heading above.
  const named = (r: RoomView, what: string) => <><span class="sr-only">{r.name}, </span>{what}</>;
  const side = (r: RoomView, which: 'l' | 'b') => <TextField id={`fld-room-${r.id}-${which}`} class="w-24" label={named(r, `${which === 'l' ? 'Length' : 'Breadth'}, ${unit}`)} inputMode="decimal"
    value={r[which]} placeholder={r.planned[which]} invalid={!!r.bad} onCommit={(t) => update((x) => withRoomSide(x, r.id, which, t, r.name))} />;
  return <Section id="pl-rooms" title="Rooms">
    <details data-testid="pl-rooms" class="mt-2">
      <summary class={SUMMARY}>{v.rooms.length} rooms: add or take out a room, size each, give one its own level</summary>
      <p class={`mt-3 text-sm ${MUTED}`}>The rooms share the carpet area: a room made larger takes its extra from the others, and a size you type moves no other room. To make them all larger, change the area.</p>
      <Shares v={v} />
      {v.roomsNote && <p data-testid="pl-rooms-note" class="mt-3 text-sm text-warn">{v.roomsNote}</p>}
      <ul class="mt-2 divide-y divide-line">
        {v.rooms.map((r) => <li key={r.id} data-testid={`pl-room-${r.id}`} class="py-3">
          <div class="flex flex-wrap items-baseline justify-between gap-x-3">
            <h3 class={`font-medium ${INK}`}>{r.name}</h3>
            <p data-testid={`pl-room-size-${r.id}`} class={`text-sm tabular-nums ${MUTED}`}>{r.size} · {r.area}{r.typed ? ' · your size' : ''}{r.level ? ` · ${LEVEL_NAMES[r.level - 1]}` : ''}</p>
          </div>
          {r.word && <fieldset data-testid={`pl-room-words-${r.id}`} class="mt-2 min-w-0">
            <legend class="sr-only">{r.name}, size{r.typed ? ': your size for now' : ''}</legend>
            <div class="grid grid-cols-4 gap-1">
              {WORD_CHOICES.map((w) => <label key={w.value} for={`fld-roomword-${r.id}-${w.value}`} class={SEG}>
                <input type="radio" class="sr-only" id={`fld-roomword-${r.id}-${w.value}`} name={`fld-roomword-${r.id}`} value={w.value}
                  checked={!r.typed && r.word === w.value} onChange={() => update((x) => withRoomWord(x, r.id, w.value, r.name))} />
                {w.label}
              </label>)}
            </div>
          </fieldset>}
          {r.below && <p data-testid={`pl-room-below-${r.id}`} class="mt-1 text-sm text-warn">{r.below}</p>}
          {(r.bedroom || r.out) && <div class="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            {r.bedroom ? <label for={`fld-attached-${r.id}`} class={`flex min-h-11 cursor-pointer items-center gap-2 text-sm ${INK}`}>
              <input type="checkbox" id={`fld-attached-${r.id}`} checked={r.attached} class={RADIO}
                onChange={(ev) => update((x) => withAttached(x, r.id, (ev.currentTarget as HTMLInputElement).checked, r.name))} />
              <span><span class="sr-only">{r.name}: </span>Attached bathroom</span>
            </label> : <span />}
            {r.out && <button type="button" data-testid={`pl-room-out-${r.id}`} class={BUTTON} aria-label={`Take out ${r.name}`}
              onClick={() => update((x) => (r.id.startsWith('bedroom-') ? withBedroomTakenOut(x, r.id, r.name) : r.id.startsWith('bath-') ? withBathTakenOut(x, r.id, r.name) : r.id === 'balcony' ? withBalcony(x, false) : withExtra(x, r.id as ExtraKind, false)))}>× Take out</button>}
          </div>}
          {/* A size typed and a level of the room's own, behind one line (R1): open when either is set. */}
          <details data-testid={`pl-room-more-${r.id}`} class="mt-2" open={r.typed || !!r.bad || r.level !== null}>
            <summary class={SUMMARY}><span class="sr-only">{r.name}: </span>Your own size or level</summary>
            <div class="mt-1 flex flex-wrap items-end gap-x-3 gap-y-2">
              {side(r, 'l')}{side(r, 'b')}
              <SelectField id={`fld-roomlevel-${r.id}`} class="w-40" label={named(r, 'Level')} value={r.level ? String(r.level) : ''} options={levels}
                onChange={(lv) => update((x) => withRoomLevel(x, r.id, lv ? (Number(lv) as Level) : null, r.name))} />
              {r.typed && <button type="button" data-testid={`pl-room-reset-${r.id}`} class={BUTTON} onClick={() => update((x) => withRoomReset(x, r.id, r.name))}>Planned size</button>}
            </div>
            {r.bad && <p data-testid={`pl-room-bad-${r.id}`} class="mt-1 text-sm text-bad">{r.bad} Until then the planned size is used.</p>}
          </details>
        </li>)}
      </ul>
      {(v.add.bedroom || v.add.bath || v.add.balcony || v.add.extras.length > 0) && <div data-testid="pl-room-add" class="mt-2 flex flex-wrap gap-2">
        {v.add.bedroom && <button type="button" data-testid="pl-room-add-bedroom" class={BUTTON} onClick={() => update(withBedroomAdded)}>+ Bedroom</button>}
        {v.add.bath && <button type="button" data-testid="pl-room-add-bath" class={BUTTON} onClick={() => update(withBathAdded)}>+ Bathroom</button>}
        {v.add.balcony && <button type="button" data-testid="pl-room-add-balcony" class={BUTTON} onClick={() => update((x) => withBalcony(x, true))}>+ Balcony</button>}
        {v.add.extras.map((x) => <button key={x.kind} type="button" data-testid={`pl-room-add-${x.kind}`} class={BUTTON} onClick={() => update((y) => withExtra(y, x.kind, true))}>+ {x.name}</button>)}
      </div>}
    </details>
  </Section>;
}

/**
 * What the estimate assumes, each with its reason (D-UX-08, D-UX-18), behind one line with its count (V1, the owner's
 * answer of 03-10-2026); the ceiling height, a new house's plot and its sewer can be changed here.
 */
function Assumed({ s, v, update }: { s: PlanState; v: PlanView; update: Update }) {
  const [height, setHeight] = useState(false), [plotOpen, setPlot] = useState(false);
  const bad = heightOf(s.height) === null, unit = sideUnit(s.unit), plot = v.plot;
  const plotSide = (which: 'l' | 'b') => plot && <TextField id={`fld-plot-${which}`} class="w-28" label={`Plot ${which === 'l' ? 'length' : 'width'}, ${unit}`} inputMode="decimal"
    value={plot[which]} placeholder={plot.planned[which]} invalid={!!plot.bad} onCommit={(t) => update((x) => withPlotSide(x, which, t))} />;
  return <details id="pl-assumed" data-testid="pl-assumed" class="mt-2">
    <summary class={SUMMARY}>What the estimate assumes ({v.assumed.length})</summary>
    <ul class="mt-3 space-y-2">
      {v.assumed.map((a, i) => <li key={a.what} data-testid={`pl-assumed-${i}`} class={`text-sm ${INK}`}>
        <span class="font-medium">{a.what}:</span> {a.shown}
        {a.what === 'Ceiling height' && !height && <> <button type="button" data-testid="pl-height-change" class={LINK} onClick={() => setHeight(true)}>Change</button></>}
        {a.what === 'Ceiling height' && height && <TextField id="fld-height" class="mt-2 max-w-xs" label="Ceiling height, in metres" inputMode="decimal" value={s.height}
          byDefault={String(RULE_HEIGHT)} keepBlank invalid={bad} said={bad ? `Not understood. Type a height from 2 to 6 metres, like 3. Until then the estimate uses ${RULE_HEIGHT} m.` : undefined} onCommit={(t) => update((x) => ({ ...x, height: t }))} />}
        {a.what === 'The plot' && plot && !plotOpen && !plot.own && !plot.bad && <> <button type="button" data-testid="pl-plot-change" class={LINK} onClick={() => setPlot(true)}>Change</button></>}
        {a.what === 'The plot' && plot && (plotOpen || plot.own || plot.bad) && <div class="mt-2 flex flex-wrap items-end gap-x-3 gap-y-2">
          {plotSide('l')}{plotSide('b')}
          {plot.own && <button type="button" data-testid="pl-plot-reset" class={BUTTON} onClick={() => update(withPlotReset)}>Planned plot</button>}
        </div>}
        {a.what === 'The plot' && plot?.bad && <p data-testid="pl-plot-bad" class="mt-1 text-sm text-bad">{plot.bad} Until then the planned plot is used.</p>}
        {a.what === 'Water' && s.kind === 'build' && <label for="fld-sewer" class="mt-2 flex items-center gap-2 text-sm">
          <input type="checkbox" id="fld-sewer" checked={s.sewer} onChange={(e) => update((x) => withSewer(x, (e.currentTarget as HTMLInputElement).checked))} class="h-4 w-4 accent-ink" />
          The city's sewer reaches my plot
        </label>}
        <SourceNote what="Why">{a.why}{a.sources.length ? ` Sources: ${a.sources.map((x) => x.what).join('; ')}.` : ''}</SourceNote>
      </li>)}
    </ul>
  </details>;
}

/**
 * What to check (V1): the flags that can change the decision, largest first, with the answer; one tap away, each with its
 * count, the other things to check and what the estimate assumes.
 */
function Checks({ s, v, update }: { s: PlanState; v: PlanView; update: Update }) {
  return <Section id="pl-checks" title="To check">
    {v.flags.length > 0 && <ul data-testid="pl-flags" class="mt-2 list-disc space-y-1 rounded-control border-l-4 border-ink-muted bg-surface py-3 pr-3 pl-8 text-sm text-ink">
      {v.flags.map((f) => <li key={f}>{f}</li>)}
    </ul>}
    {v.notes.length > 0 && <details data-testid="pl-notes" class="mt-2">
      <summary class={SUMMARY}>Other things to check ({v.notes.length})</summary>
      <ul class={`mt-2 list-disc space-y-1 pl-5 text-sm ${INK}`}>{v.notes.map((f) => <li key={f}>{f}</li>)}</ul>
    </details>}
    <Assumed s={s} v={v} update={update} />
  </Section>;
}

/** The document's own facts, asked once, then the planning estimate as a PDF, an Excel copy and a Word copy. */
function Download({ s, p, update }: { s: PlanState; p: PlanPreview; update: Update }) {
  const f = s.doc, set = (patch: Partial<PlanFacts>) => update((x) => ({ ...x, doc: { ...x.doc, ...patch } }));
  const english = (t: string) => (t.trim() && !printable(t) ? 'The document is in English: type this in English letters.' : undefined);
  const own = planDocNeeds(f);
  const go = (kind: FileKind) => {
    const now = new Date();
    save(planDoc(s, p, isoDate(now)), kind, planFileName(s, p, kind), now);
  };
  const bill = (kind: FileKind) => {
    const now = new Date();
    save(billDoc(s, p, isoDate(now)), kind, billFileName(s, kind), now);
  };
  const field = (id: keyof PlanFacts, label: string, hint?: string) =>
    <TextField id={`fld-pl-${id}`} label={label} hint={hint} value={f[id]} said={english(f[id])} invalid={!!english(f[id])} onCommit={(t) => set({ [id]: t })} />;
  return <Section id="pl-download" title="Download the planning estimate">
    <p class={`mt-2 ${HINT}`}>A PDF for the lender, with Excel and Word copies to edit, made in your browser: every item and what the estimate assumes.</p>
    <div class="mt-4 grid gap-4 sm:grid-cols-2">
      {field('owner', 'Owner’s name')}
      {field('property', 'Property’s address')}
      {field('lender', 'Lender', 'The bank or finance company, and the branch, if known.')}
      {field('preparedBy', 'Prepared by', 'An engineer or architect who adopts it, with registration number, if any. Leave empty for a planning estimate.')}
    </div>
    <div class="mt-5">
      <p data-testid="pl-doc-status" class={`${STATE} ${own.length ? 'text-warn' : 'text-ink'}`}>{!own.length && <Tick />}{planDocStatus(s, p)}</p>
      {own.length > 0 && <ul data-testid="pl-doc-needs" class="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink">{own.map((n) => <li key={n}>{n}</li>)}</ul>}
      <div class="mt-3 flex w-fit flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
        <button type="button" data-testid="pl-download-pdf" class={FILLED} onClick={() => go('pdf')}>Download PDF</button>
        <button type="button" data-testid="pl-download-xlsx" class={BUTTON} onClick={() => go('xlsx')}>Download Excel</button>
        <button type="button" data-testid="pl-download-docx" class={BUTTON} onClick={() => go('docx')}>Download Word</button>
      </div>
      <InAppNote id="pl-in-app" />
    </div>
    <div class="mt-5">
      <p class={HINT}>A bill of quantities for two or three contractors to quote like for like: each item, where it goes and how much, with the rates left blank.</p>
      <div class="mt-3 flex w-fit flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
        <button type="button" data-testid="pl-bill-pdf" class={BUTTON} onClick={() => bill('pdf')}>Bill as PDF</button>
        <button type="button" data-testid="pl-bill-xlsx" class={BUTTON} onClick={() => bill('xlsx')}>Bill as Excel</button>
        <button type="button" data-testid="pl-bill-docx" class={BUTTON} onClick={() => bill('docx')}>Bill as Word</button>
      </div>
    </div>
  </Section>;
}

