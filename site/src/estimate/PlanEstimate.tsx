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
import { useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import { BUTTON, Choice, HINT, LABEL, Section, SelectField, SourceNote, TextField } from '../fields';
import { printable } from '../doc/pdf';
import { BRAND_NOTICE } from '../site';
import { isoDate, save, type FileKind } from '../download';
import { sharePlan } from './shared';
import { billDoc, billFileName, planDoc, planDocNeeds, planDocStatus, planFileName } from './plan-document';
import {
  BHK_CHOICES, CITY_CHOICES, EMPTY_PLAN, FLOOR_CHOICES, HOME_CHOICES, LEVEL_CHOICES, LEVEL_NAMES, RULE_HEIGHT, WORD_CHOICES, WORK_CHOICES, areaLabel, checkedLine, drawerView, heightOf, plainOf, planPreview, sideUnit,
  withItem, withKind, withLevel, withPlotReset, withPlotSide, withAttached, withBalcony, withBathAdded, withBathTakenOut, withBedroomAdded, withBedroomTakenOut, withBhk, withRoomLevel, withRoomReset, withRoomSide, withRoomWord, withSection, withSewer, withSlider, withUnit,
  type AreaUnit, type DrawerView, type LineView, type PlanFacts, type PlanPreview, type PlanState, type PlanView, type RoomView, type RungView, type SectionView, type WhyView,
} from './plan-model';
import type { Bhk, Level } from '../../../engine/architect';

type Update = (f: (s: PlanState) => PlanState) => void;
const MUTED = 'text-slate-600 dark:text-slate-300';
const INK = 'text-slate-900 dark:text-slate-100';
const CARD = 'rounded-lg border border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-900';
const CHIP = 'flex cursor-pointer items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-slate-900 has-checked:border-teal-700 has-checked:bg-teal-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:has-checked:border-teal-500 dark:has-checked:bg-teal-950';
const RADIO = 'size-4 shrink-0 text-base accent-teal-700 dark:accent-teal-500';
/** One of a room's four size buttons: a radio, so the arrow keys move along them and a screen reader names the group. */
/** "× Take out" on a room (R2): quieter than the buttons that add. */
const OUT = 'rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800';
const SEG = 'flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-slate-300 bg-white px-1 py-1 text-center text-[13px] leading-tight text-slate-900 has-checked:border-teal-700 has-checked:bg-teal-50 has-checked:font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-teal-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:has-checked:border-teal-500 dark:has-checked:bg-teal-950';
/**
 * The bar of shares' colours by kind: the four kinds of room in the reference palette's first four slots, in that order,
 * checked for colour-blind separation in light and dark; the passage and the inside walls in greys. Every part is also named
 * with its share in the list under the bar, so no colour is read alone.
 */
const SHARE_COLOR: Record<string, string> = {
  living: 'bg-[#2a78d6] dark:bg-[#3987e5]', bedroom: 'bg-[#eb6834] dark:bg-[#d95926]', kitchen: 'bg-[#1baf7a] dark:bg-[#199e70]', bath: 'bg-[#eda100] dark:bg-[#c98500]',
  passage: 'bg-slate-300 dark:bg-slate-600', walls: 'bg-slate-500 dark:bg-slate-400',
};

export function PlanEstimate() {
  const [s, setS] = useState<PlanState>(EMPTY_PLAN);
  const update: Update = (f) => setS(f);
  const p = useMemo(() => planPreview(s), [s]);
  sharePlan(s);
  const [editing, setEditing] = useState(true);
  const folded = useRef(false), result = useRef<HTMLHeadingElement>(null);
  // The questions fold into one line the first time the estimate works out (A8), and the answer takes the focus.
  useLayoutEffect(() => {
    if (p.view && !folded.current) { folded.current = true; setEditing(false); requestAnimationFrame(() => result.current?.focus()); }
  }, [p.view]);
  const v = p.view;
  return <div>
    {editing || !v
      ? <Questions s={s} update={update} p={p} done={v ? () => setEditing(false) : undefined} />
      : <div data-testid="pl-answers" class={`mt-6 flex flex-wrap items-center justify-between gap-2 ${CARD}`}>
        <p data-testid="pl-summary" class={`min-w-0 ${INK}`}>{v.summary}</p>
        <button type="button" data-testid="pl-change" class={BUTTON} onClick={() => setEditing(true)}>Change</button>
      </div>}
    {!v && !p.blocked && p.needs.length > 0 && p.needs.length < 6 &&
      <p data-testid="pl-needs" class={`mt-4 ${HINT}`}>Still to answer: {p.needs.join('; ').toLowerCase()}.</p>}
    {p.blocked && <p data-testid="pl-blocked" class="mt-4 text-sm text-red-700 dark:text-red-300">{p.blocked}</p>}
    {v && <>
      <Answer v={v} update={update} heading={result} />
      <Sections s={s} v={v} update={update} />
      <Checks s={s} v={v} update={update} />
      <Rooms s={s} v={v} update={update} />
      <Download s={s} p={p} update={update} />
      <div data-testid="pl-sticky" class="sticky bottom-0 z-10 -mx-4 mt-8 border-t border-slate-300 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-700 dark:bg-slate-950/95">
        {/* What changed (A8): one line after a change, said aloud as it comes. */}
        <p data-testid="pl-what-changed" aria-live="polite" class={`mb-2 line-clamp-2 text-sm empty:hidden ${INK}`}>{v.change && <>
          <span class="font-medium">{v.change.text}</span>{v.change.items && <span class={MUTED}> · {v.change.items}</span>}
        </>}</p>
        <div class="flex items-center justify-between gap-3">
          <p class={INK}>Total <span data-testid="pl-sticky-total" class="font-semibold tabular-nums">Rs. {v.total}</span></p>
          <a href="#pl-download" class={BUTTON}>Download</a>
        </div>
      </div>
    </>}
  </div>;
}

/** The six questions (A3): each in a block of its own, counted by the site check. */
function Questions({ s, update, p, done }: { s: PlanState; update: Update; p: PlanPreview; done?: () => void }) {
  const badArea = plainOf(s.area) === null;
  return <div id="six-questions">
    <div data-question>
      <Choice name="fld-work" legend="What is the work?" options={WORK_CHOICES} value={s.kind} columns onChange={(k) => update((x) => withKind(x, k))} />
    </div>
    <div data-question>
      {s.kind === 'build'
        ? <Choice name="fld-floors" legend="How many floors?" options={FLOOR_CHOICES} value={s.floors ? String(s.floors) : undefined} columns onChange={(f) => update((x) => ({ ...x, floors: Number(f) }))} />
        : <Choice name="fld-home" legend="Flat or house?" options={HOME_CHOICES} value={s.home} columns onChange={(home) => update((x) => ({ ...x, home }))} />}
    </div>
    <div data-question>
      <SelectField id="fld-city" class="mt-6" label="Which city?" value={s.city ?? ''} placeholder="Choose a city" options={CITY_CHOICES}
        onChange={(city) => update((x) => ({ ...x, city: city || undefined }))} />
    </div>
    <div data-question class="mt-6">
      <label for="fld-carpet" class={LABEL}>How big? {areaLabel(s.kind)}</label>
      <div class="mt-1 flex flex-wrap items-start gap-3">
        <TextField id="fld-carpet" class="w-40 [&>label]:sr-only" label={s.kind === 'build' ? 'Built-up area' : 'Carpet area'} inputMode="decimal" value={s.area} placeholder={s.kind === 'build' ? 'like 2000' : 'like 850'}
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
        onChange={(l) => update((x) => withLevel(x, Number(l) as Level))} />
    </div>
    {done && <button type="button" data-testid="pl-done" class={`mt-6 ${BUTTON}`} onClick={done}>Done</button>}
    {!done && p.needs.length === 6 && <p class={`mt-4 ${HINT}`}>The estimate appears as soon as the six are answered.</p>}
  </div>;
}

/** The answer (A8, V1, L1): the total and the level's range, the cost a sq ft and the rates' line, the five levels, Compare and a new house's stages. */
function Answer({ v, update, heading }: { v: PlanView; update: Update; heading: { current: HTMLHeadingElement | null } }) {
  return <section id="pl-result" aria-labelledby="pl-result-h" class="mt-6">
    <h2 id="pl-result-h" ref={heading} tabIndex={-1} class="sr-only">The estimate</h2>
    <p data-testid="pl-total" class={`text-3xl font-semibold tabular-nums ${INK}`}>Rs. {v.total}</p>
    {v.range.text && <p data-testid="pl-range" class={`mt-1 text-sm ${INK}`}>{v.range.text}</p>}
    <p class={`mt-1 ${MUTED}`}><span data-testid="pl-per-sqft" class="tabular-nums">Rs. {v.perSqft}</span> a sq ft of {v.areaName.toLowerCase()}</p>
    <p data-testid="pl-rates" class={`mt-1 text-sm ${MUTED}`}>{v.ratesLine}</p>
    <div role="group" aria-label="The total at each level; choose one to switch the package" class="mt-4 grid grid-cols-5 gap-1.5">
      {v.strip.map((x) => <button key={x.level} type="button" data-testid={`pl-strip-${x.level}`} aria-pressed={x.current} aria-label={`${x.name}: Rs. ${x.full}`}
        title={`Rs. ${x.full}`} onClick={() => update((s) => withLevel(s, x.level))}
        class={`rounded-md border px-1 py-1.5 text-center ${x.current ? 'border-teal-700 bg-teal-50 dark:border-teal-500 dark:bg-teal-950' : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900'}`}>
        <span class={`block text-xs ${x.current ? 'font-semibold' : ''} ${INK}`}>{x.name}</span>
        <span class={`block text-xs tabular-nums ${MUTED}`}>{x.total}</span>
      </button>)}
    </div>
    <p class={`mt-1 text-xs ${MUTED}`}>Each level as a package; tap one to switch.</p>
    <Compare v={v} />
    {v.stages && <Stages v={v} />}
  </section>;
}

/** A chevron for a line that opens, turned down when open; drawn, so it adds no word to the page. */
const CHEVRON = <svg aria-hidden="true" viewBox="0 0 20 20" class="size-4 shrink-0 text-slate-500 transition-transform group-open:rotate-90 dark:text-slate-400">
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
  const width = new Map(v.bar.map((b) => [b.id, b.width]));
  const list = [...v.sections.filter((x) => x.on).sort((a, b) => b.pkg - a.pkg), ...v.sections.filter((x) => !x.on)];
  return <section id="pl-sections" aria-labelledby="pl-sections-h" class="mt-6">
    <h2 id="pl-sections-h" class={`text-sm font-medium ${INK}`}>By section</h2>
    <ul data-testid="pl-bar" class="mt-1 divide-y divide-slate-200 dark:divide-slate-800">
      {list.map((x) => {
        // The section's own level, named on its line only when it differs from the package.
        const own = x.on && x.slider && (x.mixed > 0 || (x.level !== null && x.level !== s.level));
        return <li key={x.id}>
          <details id={`pl-card-${x.id}`} data-testid={`pl-card-${x.id}`} class="group"
            onToggle={(ev) => { const o = (ev.currentTarget as HTMLDetailsElement).open; setOpened((m) => (m[x.id] === o ? m : { ...m, [x.id]: o })); }}>
            <summary data-testid={`pl-bar-${x.id}`} class="flex cursor-pointer list-none items-center gap-2 rounded px-1 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 [&::-webkit-details-marker]:hidden">
              <span class="min-w-0 flex-1">
                <span class={`flex items-baseline justify-between gap-3 text-sm ${INK}`}>
                  <span class="min-w-0">{x.name}{x.on && x.lines.length > 0 && <> <span class={`ml-1 text-xs ${MUTED}`}>{x.lines.length} item{x.lines.length === 1 ? '' : 's'}</span></>}
                    {own && <> <span data-testid={`pl-own-${x.id}`} class={`ml-1 text-xs ${MUTED}`}>{x.mixed ? x.mixedText : x.levelName}</span></>}</span>
                  <span data-testid={`pl-amount-${x.id}`} class={`shrink-0 tabular-nums ${x.on ? '' : MUTED}`}>{x.on ? x.amount : 'Off'}</span>
                </span>
                {x.on && x.n > 0 && <span aria-hidden="true" class="mt-1 block h-1.5 rounded-r bg-teal-600 dark:bg-teal-400" style={{ width: `${width.get(x.id) ?? 1}%` }} />}
              </span>
              {CHEVRON}
            </summary>
            <div class="mb-3 rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
              <div class="flex items-center justify-between gap-3">
                <p class={`min-w-0 text-sm ${MUTED}`}>{x.on ? x.where : 'Not in this estimate'}</p>
                <label for={`fld-on-${x.id}`} class={`flex shrink-0 items-center gap-2 text-sm ${INK}`}>
                  <input type="checkbox" role="switch" id={`fld-on-${x.id}`} checked={x.on} onChange={(e) => update((st) => withSection(st, x.id, (e.currentTarget as HTMLInputElement).checked))}
                    class="size-5 text-base accent-teal-700 dark:accent-teal-500" />
                  <span><span class="sr-only">{x.name}: </span>{x.on ? 'On' : 'Off'}</span>
                </label>
              </div>
              {x.on && <>
                {x.slider ? <Slider s={s} x={x} update={update} /> : <p class={`mt-1 text-sm ${MUTED}`}>The same at every level</p>}
                {x.over && <p data-testid={`pl-over-${x.id}`} class={`mt-2 text-sm tabular-nums ${MUTED}`}>{x.over.text}</p>}
                {x.lines.length === 0 && <p data-testid={`pl-spec-${x.id}`} class={`mt-2 text-sm ${INK}`}>Nothing at this level</p>}
              </>}
              {opened[x.id] && x.why && <Why id={`pl-why-section-${x.id}`} about={x.name} title="Where to spend, where to save" w={x.why} />}
              {x.on && opened[x.id] && x.lines.length > 0 && <ol data-testid={`pl-items-${x.id}`} class="mt-2 divide-y divide-slate-200 dark:divide-slate-700">
                {x.lines.map((l) => <Item key={l.key} s={s} v={v} l={l} open={open === l.key} toggle={() => setOpen((k) => (k === l.key ? null : l.key))} update={update} />)}
              </ol>}
              {/* The brand notice where the section's brands show, in the items' own type (D-BIZ-03); closed with the answer, so V1's count is unchanged. */}
              {x.on && opened[x.id] && x.lines.length > 0 && x.brands && <p data-testid={`pl-brand-notice-${x.id}`} class={`mt-2 text-sm ${INK}`}>{BRAND_NOTICE}</p>}
            </div>
          </details>
        </li>;
      })}
    </ul>
    {v.split && <p data-testid="pl-split" class={`mt-3 text-sm ${INK}`}>{v.split.map((x) => `${x.label} Rs. ${x.amount}`).join(' · ')}</p>}
  </section>;
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
      class="mt-1 block w-full text-base accent-teal-700 dark:accent-teal-500" />
    <div aria-hidden="true" class="mt-0.5 grid grid-cols-5 text-center text-[11px] leading-tight">
      {LEVEL_NAMES.map((n, i) => <span key={n} class={i + 1 === s.level ? `font-semibold underline underline-offset-2 ${INK}` : MUTED}>{n}</span>)}
    </div>
  </div>;
}

/** One line of a section, and its drawer when opened. */
function Item({ s, v, l, open, toggle, update }: { s: PlanState; v: PlanView; l: LineView; open: boolean; toggle: () => void; update: Update }) {
  const d = useMemo(() => (open ? drawerView(s, v, l.key) : undefined), [open, s, v, l.key]);
  return <li data-testid={`pl-line-${l.key}`} class="py-2">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class={`text-sm ${INK}`}><span class={MUTED}>{l.room}:</span> {l.item}{l.chosen ? ' (your choice)' : ''}</p>
        <p class={`text-xs tabular-nums ${MUTED}`}>{l.qty} {l.unit} × Rs. {l.rate} = <span class={`font-medium ${INK}`}>Rs. {l.amount}</span></p>
      </div>
      <button type="button" data-testid={`pl-open-${l.key}`} aria-expanded={open} class={`shrink-0 ${BUTTON}`} onClick={toggle}>{open ? 'Close' : 'Change'}</button>
    </div>
    {l.why && <Why id={`pl-why-${l.key}`} about={`${l.room}, ${l.name.toLowerCase()}`} w={l.why} />}
    {open && d && <Drawer s={s} l={l} d={d} update={update} />}
  </li>;
}

/**
 * A line's or a section's Why? (T1, D-UX-34): closed until tapped, never in the answer. The notes, each under its label, then
 * their sources, linked, and whether they are still as reported. No amount: the line's figures are the engine's.
 */
function Why({ id, about, title, w }: { id: string; about: string; title?: string; w: WhyView }) {
  return <details data-testid={id} class="mt-1 text-xs">
    <summary class="inline-flex cursor-pointer items-center gap-1 text-teal-800 underline-offset-4 hover:underline dark:text-teal-300">
      <span aria-hidden="true">ⓘ</span> Why?<span class="sr-only"> {about}</span>
    </summary>
    <div class={`mt-1 space-y-1 ${INK}`}>
      {title && <p class="font-medium">{title}</p>}
      {w.items.map((x, i) => <p key={i}><span class="font-medium">{x.label}:</span> {x.text}</p>)}
      <p class={MUTED}>{w.sources.length
        ? <>Sources: {w.sources.map((x, i) => <span key={x.id}>{i ? '; ' : ''}{x.url
          ? <a href={x.url} target="_blank" rel="noopener noreferrer" class="text-teal-800 underline dark:text-teal-300">{x.what}</a> : x.what}</span>)}
          {w.own ? '; and our own rule' : ''}.{w.reported ? ' As reported, not yet checked.' : ` Checked against ${w.sources.length === 1 ? 'its page' : 'their pages'}.`}</>
        : 'Our own rule, with its reason given.'}</p>
    </div>
  </details>;
}

/**
 * The item drawer (A8, L1): the choices at the line's level first, under the level's name with their count; each other level's
 * and the family's items at no level one tap away, open when they hold the line's item; brands as chips; how the line was
 * worked out.
 */
function Drawer({ s, l, d, update }: { s: PlanState; l: LineView; d: DrawerView; update: Update }) {
  const name = `fld-item-${l.key}`;
  const choose = (x: RungView, brand?: string) => update((st) => withItem(st, l.key, x.id, brand, `${l.room}, ${l.name.toLowerCase()}: ${x.name}`));
  const rung = (x: RungView, i: string) => <li key={x.id} class="py-2">
    <label for={`${name}-${i}`} class={`flex items-start gap-3 ${x.usable ? 'cursor-pointer' : 'opacity-70'}`}>
      <input type="radio" id={`${name}-${i}`} name={name} checked={x.current} disabled={!x.usable} onChange={() => { if (!x.current) choose(x); }} class={`mt-1 ${RADIO}`} />
      <span class="min-w-0">
        <span class={`block text-sm ${INK}`}>{x.name} · <span class="tabular-nums">{x.rate}</span>{x.mark && <span class={MUTED}> ({x.mark})</span>}</span>
        <span class={`block text-xs ${MUTED}`}>{x.spec}</span>
      </span>
    </label>
    {x.brands.length > 0 && x.usable && <div class="mt-1 ml-7 flex flex-wrap gap-1.5">
      {x.brands.map((b) => {
        const on = x.current && l.brand === b;
        return <button key={b} type="button" data-testid={`pl-brand-${b}`} aria-pressed={on} onClick={() => choose(x, on ? undefined : b)}
          class={`rounded-full border px-2.5 py-0.5 text-xs ${on ? 'border-teal-700 bg-teal-50 text-teal-900 dark:border-teal-500 dark:bg-teal-950 dark:text-teal-100' : `border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900 ${INK}`}`}>{b}</button>;
      })}
    </div>}
  </li>;
  return <div data-testid="pl-drawer" class="mt-2 rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
    <p class={`text-sm ${INK}`}><span class="font-medium">{l.name}</span> · {l.kind}{l.brands ? ` · ${l.brands}` : ''}</p>
    <fieldset class="mt-1 min-w-0">
      <legend class="sr-only">The item for {l.room.toLowerCase()}, {l.name.toLowerCase()}</legend>
      {d.groups.map((g, gi) => {
        const list = <ol class="divide-y divide-slate-200 dark:divide-slate-700">{g.choices.map((x, i) => rung(x, `${gi}-${i}`))}</ol>;
        return gi === 0
          ? <div key={g.title} data-testid={`pl-choices-${g.level ?? 'other'}`}><p class={`mt-1 text-sm font-medium ${INK}`}>{g.title}</p>{list}</div>
          : <details key={g.title} data-testid={`pl-choices-${g.level ?? 'other'}`} class="mt-1" open={g.open}>
            <summary class={`cursor-pointer text-sm text-teal-800 dark:text-teal-300`}>{g.title}</summary>{list}
          </details>;
      })}
    </fieldset>
    {l.chosen && <button type="button" data-testid="pl-item-reset" class={`mt-2 ${BUTTON}`} onClick={() => update((st) => withItem(st, l.key, null, undefined, `${l.room}, ${l.name.toLowerCase()}: back to the level’s item`))}>Back to the level’s item</button>}
    <details class="mt-2" open>
      <summary class={`cursor-pointer text-sm font-medium ${INK}`}>How we worked this out</summary>
      <ul data-testid="pl-how" class={`mt-1 list-disc space-y-0.5 pl-5 text-xs ${INK}`}>
        <li>Quantity: {d.how.quantity}</li>
        <li>Rate: {d.how.rate.join('; ')}</li>
        <li>Amount: {d.how.amount}</li>
      </ul>
      {l.sources.length > 0 && <p class={`mt-1 text-xs ${MUTED}`}>Sources: {l.sources.map((x, i) => <span key={x.id}>{i ? '; ' : ''}{x.url
        ? <a href={x.url} target="_blank" rel="noopener noreferrer" class="text-teal-800 underline dark:text-teal-300">{x.what}</a> : x.what}</span>)}. {checkedLine(l)}</p>}
      {l.note && <p class={`mt-1 text-xs ${MUTED}`}>{l.note}</p>}
    </details>
  </div>;
}

/** Compare (A8): each section that is on, and the total, at the five levels as a package; the estimate's own level marked. */
function Compare({ v }: { v: PlanView }) {
  const cell = (c: PlanView['compare']['totals'][number], name: string, i: number) => <td key={i} aria-label={`${name}, ${LEVEL_NAMES[i]}: Rs. ${c.full}${c.mine ? ', your level' : ''}`} title={`Rs. ${c.full}`}
    class={`px-1 py-1 text-right ${c.mine ? 'rounded bg-teal-50 font-semibold text-teal-900 ring-1 ring-teal-700 dark:bg-teal-950 dark:text-teal-100 dark:ring-teal-500' : ''}`}>{c.text}</td>;
  return <details data-testid="pl-compare" class="mt-3">
    <summary class="cursor-pointer text-sm text-teal-800 dark:text-teal-300">Compare the five levels, section by section</summary>
    <div class="mt-2 overflow-x-auto">
      <table class={`w-full text-xs tabular-nums ${INK}`}>
        <caption class={`text-left text-xs ${MUTED}`}>Each section at each level as a package, in lakhs where large; yours marked.</caption>
        <thead><tr class={MUTED}><th scope="col" class="py-1 pr-1 text-left font-normal">Section</th>{LEVEL_NAMES.map((n) => <th key={n} scope="col" class="px-1 py-1 text-right font-normal">{n}</th>)}</tr></thead>
        <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
          {v.compare.rows.map((r) => <tr key={r.id} data-testid={`pl-compare-${r.id}`}>
            <th scope="row" class="py-1 pr-1 text-left font-normal">{r.name}{r.yours && <span class={`block text-[11px] ${MUTED}`}>{r.yours}</span>}</th>
            {r.cells.map((c, i) => cell(c, r.name, i))}
          </tr>)}
          <tr data-testid="pl-compare-total" class="font-semibold">
            <th scope="row" class="py-1 pr-1 text-left">Total{v.compare.yours && <span class={`block text-[11px] font-normal ${MUTED}`}>{v.compare.yours}</span>}</th>
            {v.compare.totals.map((c, i) => cell(c, 'Total', i))}
          </tr>
        </tbody>
      </table>
    </div>
  </details>;
}

/** A new house's stages for a construction loan (E5): what each stage covers, its amount, its share and the share by its end. */
function Stages({ v }: { v: PlanView }) {
  const st = v.stages ?? [];
  return <details data-testid="pl-stages" class="mt-2">
    <summary class="cursor-pointer text-sm text-teal-800 dark:text-teal-300">Stages for a construction loan</summary>
    <div class="mt-2 overflow-x-auto">
      <table class={`w-full text-xs tabular-nums ${INK}`}>
        <caption class={`text-left text-xs ${MUTED}`}>The structure split by published shares; the rest from the estimate's own items. For planning a loan's payments, not a lender's own schedule.</caption>
        <thead><tr class={MUTED}><th scope="col" class="py-1 pr-1 text-left font-normal">Stage</th><th scope="col" class="px-1 py-1 text-right font-normal">Rupees</th>
          <th scope="col" class="px-1 py-1 text-right font-normal">Share</th><th scope="col" class="px-1 py-1 text-right font-normal">By then</th></tr></thead>
        <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
          {st.map((x) => <tr key={x.id} data-testid={`pl-stage-${x.id}`}>
            <th scope="row" class="py-1 pr-1 text-left font-normal">{x.name}<span class={`block text-[11px] ${MUTED}`}>{x.what}</span></th>
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
    <div aria-hidden="true" class="mt-1.5 flex h-4 w-full gap-[2px] overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
      {v.shares.map((x) => <span key={x.id} title={`${x.name} ${x.share}`} class={`h-full shrink-0 ${SHARE_COLOR[x.kind]}`} style={{ width: `calc(${x.width.toFixed(3)}% - 2px)` }} />)}
    </div>
    <ul class="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[13px] sm:grid-cols-3">
      {v.shares.map((x) => <li key={x.id} data-testid={`pl-share-${x.id}`} class={`flex items-baseline gap-1.5 ${INK}`}>
        <span aria-hidden="true" class={`inline-block size-2.5 shrink-0 rounded-sm ${SHARE_COLOR[x.kind]}`} />
        <span class="min-w-0">{x.name}</span><span class="ml-auto tabular-nums">{x.share}</span>
      </li>)}
    </ul>
  </figure>;
}

/**
 * The rooms (A8, R1, R2): how the carpet area is shared; a bedroom, a bathroom or the balcony added or taken out, a bathroom
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
  return <section id="pl-rooms" aria-labelledby="pl-rooms-h" class="mt-6">
    <details data-testid="pl-rooms">
      <summary class="cursor-pointer text-sm text-teal-800 dark:text-teal-300"><h2 id="pl-rooms-h" class="inline font-medium">Rooms ({v.rooms.length})</h2>: add or take out a room, size each, give one its own level</summary>
      <p class={`mt-3 text-sm ${MUTED}`}>The rooms share the carpet area: a room made larger takes its extra from the others, and a size you type moves no other room. To make them all larger, change the area.</p>
      <Shares v={v} />
      {v.roomsNote && <p data-testid="pl-rooms-note" class="mt-3 text-sm text-amber-900 dark:text-amber-200">{v.roomsNote}</p>}
      <ul class="mt-2 divide-y divide-slate-200 dark:divide-slate-800">
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
          {r.below && <p data-testid={`pl-room-below-${r.id}`} class="mt-1 text-sm text-amber-900 dark:text-amber-200">{r.below}</p>}
          {(r.bedroom || r.out) && <div class="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            {r.bedroom ? <label for={`fld-attached-${r.id}`} class={`flex min-h-11 cursor-pointer items-center gap-2 text-sm ${INK}`}>
              <input type="checkbox" id={`fld-attached-${r.id}`} checked={r.attached} class={RADIO}
                onChange={(ev) => update((x) => withAttached(x, r.id, (ev.currentTarget as HTMLInputElement).checked, r.name))} />
              <span><span class="sr-only">{r.name}: </span>Attached bathroom</span>
            </label> : <span />}
            {r.out && <button type="button" data-testid={`pl-room-out-${r.id}`} class={OUT} aria-label={`Take out ${r.name}`}
              onClick={() => update((x) => (r.id.startsWith('bedroom-') ? withBedroomTakenOut(x, r.id, r.name) : r.id.startsWith('bath-') ? withBathTakenOut(x, r.id, r.name) : withBalcony(x, false)))}>× Take out</button>}
          </div>}
          {/* A size typed and a level of the room's own, behind one line (R1): open when either is set. */}
          <details data-testid={`pl-room-more-${r.id}`} class="mt-2" open={r.typed || !!r.bad || r.level !== null}>
            <summary class="cursor-pointer text-sm text-teal-800 dark:text-teal-300"><span class="sr-only">{r.name}: </span>Your own size or level</summary>
            <div class="mt-1 flex flex-wrap items-end gap-x-3 gap-y-2">
              {side(r, 'l')}{side(r, 'b')}
              <SelectField id={`fld-roomlevel-${r.id}`} class="w-40" label={named(r, 'Level')} value={r.level ? String(r.level) : ''} options={levels}
                onChange={(lv) => update((x) => withRoomLevel(x, r.id, lv ? (Number(lv) as Level) : null, r.name))} />
              {r.typed && <button type="button" data-testid={`pl-room-reset-${r.id}`} class={BUTTON} onClick={() => update((x) => withRoomReset(x, r.id, r.name))}>Planned size</button>}
            </div>
            {r.bad && <p data-testid={`pl-room-bad-${r.id}`} class="mt-1 text-sm text-red-700 dark:text-red-300">{r.bad} Until then the planned size is used.</p>}
          </details>
        </li>)}
      </ul>
      {(v.add.bedroom || v.add.bath || v.add.balcony) && <div data-testid="pl-room-add" class="mt-2 flex flex-wrap gap-2">
        {v.add.bedroom && <button type="button" data-testid="pl-room-add-bedroom" class={BUTTON} onClick={() => update(withBedroomAdded)}>+ Bedroom</button>}
        {v.add.bath && <button type="button" data-testid="pl-room-add-bath" class={BUTTON} onClick={() => update(withBathAdded)}>+ Bathroom</button>}
        {v.add.balcony && <button type="button" data-testid="pl-room-add-balcony" class={BUTTON} onClick={() => update((x) => withBalcony(x, true))}>+ Balcony</button>}
      </div>}
    </details>
  </section>;
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
    <summary class="cursor-pointer text-sm text-teal-800 dark:text-teal-300">What the estimate assumes ({v.assumed.length})</summary>
    <ul class="mt-3 space-y-2">
      {v.assumed.map((a, i) => <li key={a.what} data-testid={`pl-assumed-${i}`} class={`text-sm ${INK}`}>
        <span class="font-medium">{a.what}:</span> {a.shown}
        {a.what === 'Ceiling height' && !height && <> <button type="button" data-testid="pl-height-change" class="text-teal-800 underline dark:text-teal-300" onClick={() => setHeight(true)}>Change</button></>}
        {a.what === 'Ceiling height' && height && <TextField id="fld-height" class="mt-2 max-w-xs" label="Ceiling height, in metres" inputMode="decimal" value={s.height}
          placeholder={`like ${RULE_HEIGHT}`} invalid={bad} said={bad ? `Type a height from 2 to 6 metres, like 3. Until then the estimate uses ${RULE_HEIGHT} m.` : undefined} onCommit={(t) => update((x) => ({ ...x, height: t }))} />}
        {a.what === 'The plot' && plot && !plotOpen && !plot.own && !plot.bad && <> <button type="button" data-testid="pl-plot-change" class="text-teal-800 underline dark:text-teal-300" onClick={() => setPlot(true)}>Change</button></>}
        {a.what === 'The plot' && plot && (plotOpen || plot.own || plot.bad) && <div class="mt-2 flex flex-wrap items-end gap-x-3 gap-y-2">
          {plotSide('l')}{plotSide('b')}
          {plot.own && <button type="button" data-testid="pl-plot-reset" class={BUTTON} onClick={() => update(withPlotReset)}>Planned plot</button>}
        </div>}
        {a.what === 'The plot' && plot?.bad && <p data-testid="pl-plot-bad" class="mt-1 text-sm text-red-700 dark:text-red-300">{plot.bad} Until then the planned plot is used.</p>}
        {a.what === 'Water' && <label for="fld-sewer" class="mt-2 flex items-center gap-2 text-sm">
          <input type="checkbox" id="fld-sewer" checked={s.sewer} onChange={(e) => update((x) => withSewer(x, (e.currentTarget as HTMLInputElement).checked))} class="h-4 w-4 accent-teal-700" />
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
  return <section id="pl-checks" aria-labelledby="pl-checks-h" class="mt-6">
    <h2 id="pl-checks-h" class={`text-sm font-medium ${INK}`}>To check</h2>
    {v.flags.length > 0 && <ul data-testid="pl-flags" class="mt-2 list-disc space-y-1 rounded-md border border-amber-300 bg-amber-50 py-3 pr-3 pl-8 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
      {v.flags.map((f) => <li key={f}>{f}</li>)}
    </ul>}
    {v.notes.length > 0 && <details data-testid="pl-notes" class="mt-2">
      <summary class="cursor-pointer text-sm text-teal-800 dark:text-teal-300">Other things to check ({v.notes.length})</summary>
      <ul class={`mt-2 list-disc space-y-1 pl-5 text-sm ${INK}`}>{v.notes.map((f) => <li key={f}>{f}</li>)}</ul>
    </details>}
    <Assumed s={s} v={v} update={update} />
  </section>;
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
      {field('lender', 'Lender, if known')}
      {field('preparedBy', 'Prepared by', 'An engineer or architect who adopts it, with registration number. Leave empty for a planning estimate.')}
    </div>
    <div class="mt-5">
      <p data-testid="pl-doc-status" class={`inline-block rounded-full px-2.5 py-0.5 text-sm font-medium ${own.length
        ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200' : 'bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-200'}`}>{planDocStatus(s, p)}</p>
      {own.length > 0 && <ul data-testid="pl-doc-needs" class="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-700 dark:text-slate-300">{own.map((n) => <li key={n}>{n}</li>)}</ul>}
      <div class="mt-3 flex flex-wrap gap-2">
        <button type="button" data-testid="pl-download-pdf" class={BUTTON} onClick={() => go('pdf')}>Download PDF</button>
        <button type="button" data-testid="pl-download-xlsx" class={BUTTON} onClick={() => go('xlsx')}>Download Excel</button>
        <button type="button" data-testid="pl-download-docx" class={BUTTON} onClick={() => go('docx')}>Download Word</button>
      </div>
    </div>
    <div class="mt-5">
      <p class={HINT}>A bill of quantities for two or three contractors to quote like for like: each item, where it goes and how much, with the rates left blank.</p>
      <div class="mt-3 flex flex-wrap gap-2">
        <button type="button" data-testid="pl-bill-pdf" class={BUTTON} onClick={() => bill('pdf')}>Bill as PDF</button>
        <button type="button" data-testid="pl-bill-xlsx" class={BUTTON} onClick={() => bill('xlsx')}>Bill as Excel</button>
        <button type="button" data-testid="pl-bill-docx" class={BUTTON} onClick={() => bill('docx')}>Bill as Word</button>
      </div>
    </div>
  </Section>;
}

