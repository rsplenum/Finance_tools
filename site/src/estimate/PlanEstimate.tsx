/**
 * The planning estimate (E1): six questions, then the estimate worked out as an architect would. The total, the cost a
 * sq ft and the five levels come first; then the total by section, a card for each section with its slider, the items
 * with their drawer (the family's five levels and its other items, brands, and how each line was worked out), what the
 * estimate assumes, what to check, and the planning estimate to download. Figures: engine/architect.ts only, via plan-model.ts.
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import { BUTTON, Choice, HINT, LABEL, Section, SelectField, SourceNote, TextField } from '../fields';
import { printable } from '../doc/pdf';
import { isoDate, save, type FileKind } from '../download';
import { planDoc, planDocNeeds, planDocStatus, planFileName } from './plan-document';
import {
  BHK_CHOICES, CITY_CHOICES, EMPTY_PLAN, HOME_CHOICES, LEVEL_CHOICES, LEVEL_NAMES, RULE_HEIGHT, WORK_CHOICES, drawerView, heightOf, plainOf, planPreview,
  withItem, withKind, withLevel, withSection, withSlider,
  type AreaUnit, type DrawerView, type LineView, type PlanFacts, type PlanPreview, type PlanState, type PlanView, type RungView, type SectionView,
} from './plan-model';
import type { Bhk, Level } from '../../../engine/architect';

type Update = (f: (s: PlanState) => PlanState) => void;
const MUTED = 'text-slate-600 dark:text-slate-300';
const INK = 'text-slate-900 dark:text-slate-100';
const CARD = 'rounded-lg border border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-900';
const CHIP = 'flex cursor-pointer items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-slate-900 has-checked:border-teal-700 has-checked:bg-teal-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:has-checked:border-teal-500 dark:has-checked:bg-teal-950';
const RADIO = 'size-4 shrink-0 text-base accent-teal-700 dark:accent-teal-500';

export function PlanEstimate() {
  const [s, setS] = useState<PlanState>(EMPTY_PLAN);
  const update: Update = (f) => setS(f);
  const p = useMemo(() => planPreview(s), [s]);
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
      <Cards s={s} v={v} update={update} />
      <Assumed s={s} v={v} update={update} />
      <Flags v={v} />
      <Download s={s} p={p} update={update} />
      <div data-testid="pl-sticky" class="sticky bottom-0 z-10 -mx-4 mt-8 flex items-center justify-between gap-3 border-t border-slate-300 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-700 dark:bg-slate-950/95">
        <p class={INK}>Total <span data-testid="pl-sticky-total" class="font-semibold tabular-nums">Rs. {v.total}</span></p>
        <a href="#pl-download" class={BUTTON}>Download</a>
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
      <Choice name="fld-home" legend="Flat or house?" options={HOME_CHOICES} value={s.home} columns onChange={(home) => update((x) => ({ ...x, home }))} />
    </div>
    <div data-question>
      <SelectField id="fld-city" class="mt-6" label="Which city?" value={s.city ?? ''} placeholder="Choose a city" options={CITY_CHOICES}
        onChange={(city) => update((x) => ({ ...x, city: city || undefined }))} />
    </div>
    <div data-question class="mt-6">
      <label for="fld-carpet" class={LABEL}>How big? Carpet area, as in your agreement</label>
      <div class="mt-1 flex flex-wrap items-start gap-3">
        <TextField id="fld-carpet" class="w-40 [&>label]:sr-only" label="Carpet area" inputMode="decimal" value={s.area} placeholder="like 850"
          invalid={badArea} said={badArea ? 'Not understood. Type a number, like 850.' : undefined} onCommit={(area) => update((x) => ({ ...x, area }))} />
        <fieldset class="mt-2 flex gap-2">
          <legend class="sr-only">Unit of the carpet area</legend>
          {(['sqft', 'sqm'] as AreaUnit[]).map((u) => <label key={u} for={`fld-carpetUnit-${u}`} class={CHIP}>
            <input type="radio" id={`fld-carpetUnit-${u}`} name="fld-carpetUnit" checked={s.unit === u} onChange={() => update((x) => ({ ...x, unit: u }))} class={RADIO} />
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
            <input type="radio" id={`fld-bhk-${b.value}`} name="fld-bhk" checked={s.bhk === b.value} onChange={() => update((x) => ({ ...x, bhk: b.value as Bhk }))} class={RADIO} />
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

/** The answer: the total, the cost a sq ft, the five levels and the total by section (A8). */
function Answer({ v, update, heading }: { v: PlanView; update: Update; heading: { current: HTMLHeadingElement | null } }) {
  return <section id="pl-result" aria-labelledby="pl-result-h" class="mt-6">
    <h2 id="pl-result-h" ref={heading} tabIndex={-1} class="sr-only">The estimate</h2>
    <p data-testid="pl-total" class={`text-3xl font-semibold tabular-nums ${INK}`}>Rs. {v.total}</p>
    <p class={`mt-1 ${MUTED}`}><span data-testid="pl-per-sqft" class="tabular-nums">Rs. {v.perSqft}</span> a sq ft of carpet area</p>
    <div role="group" aria-label="The total at each level; choose one to switch the package" class="mt-4 grid grid-cols-5 gap-1.5">
      {v.strip.map((x) => <button key={x.level} type="button" data-testid={`pl-strip-${x.level}`} aria-pressed={x.current} aria-label={`${x.name}: Rs. ${x.full}`}
        title={`Rs. ${x.full}`} onClick={() => update((s) => withLevel(s, x.level))}
        class={`rounded-md border px-1 py-1.5 text-center ${x.current ? 'border-teal-700 bg-teal-50 dark:border-teal-500 dark:bg-teal-950' : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900'}`}>
        <span class={`block text-xs ${x.current ? 'font-semibold' : ''} ${INK}`}>{x.name}</span>
        <span class={`block text-xs tabular-nums ${MUTED}`}>{x.total}</span>
      </button>)}
    </div>
    <p class={`mt-1 text-xs ${MUTED}`}>Each level as a package; tap one to switch.</p>
    <h3 class={`mt-5 text-sm font-medium ${INK}`}>By section</h3>
    <ul data-testid="pl-bar" class="mt-1 space-y-1">
      {[...v.bar].sort((a, b) => b.n - a.n).map((x) => <li key={x.id}>
        <a href={`#pl-card-${x.id}`} data-testid={`pl-bar-${x.id}`} class="block rounded px-1 py-0.5 hover:bg-slate-50 dark:hover:bg-slate-800">
          <span class={`flex justify-between gap-3 text-sm ${INK}`}><span>{x.name}</span><span class="tabular-nums">{x.amount}</span></span>
          <span aria-hidden="true" class="mt-0.5 block h-1.5 rounded-r bg-teal-600 dark:bg-teal-400" style={{ width: `${x.width}%` }} />
        </a>
      </li>)}
    </ul>
    {v.split && <p data-testid="pl-split" class={`mt-3 text-sm ${INK}`}>{v.split.map((x) => `${x.label} Rs. ${x.amount}`).join(' · ')}</p>}
    <p data-testid="pl-rates" class={`mt-3 text-sm ${MUTED}`}>{v.ratesLine}</p>
  </section>;
}

/** A card for each section: on or off, its slider of five stops, its line of specification, its amount and its items. */
function Cards({ s, v, update }: { s: PlanState; v: PlanView; update: Update }) {
  const [shown, setShown] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState<string | null>(null);
  return <Section id="pl-sections" title="Sections">
    <ul class="mt-4 space-y-3">
      {v.sections.map((x) => <li key={x.id}>
        <article id={`pl-card-${x.id}`} data-testid={`pl-card-${x.id}`} aria-labelledby={`pl-card-${x.id}-h`} class={CARD}>
          <div class="flex items-center justify-between gap-3">
            <h3 id={`pl-card-${x.id}-h`} class={`font-medium ${INK}`}>{x.name}</h3>
            <label for={`fld-on-${x.id}`} class={`flex items-center gap-2 text-sm ${INK}`}>
              <input type="checkbox" role="switch" id={`fld-on-${x.id}`} checked={x.on} onChange={(e) => update((st) => withSection(st, x.id, (e.currentTarget as HTMLInputElement).checked))}
                class="size-5 text-base accent-teal-700 dark:accent-teal-500" />
              {x.on ? 'On' : 'Off'}
            </label>
          </div>
          {x.on && <>
            {x.slider ? <Slider s={s} x={x} update={update} /> : <p class={`mt-1 text-sm ${MUTED}`}>The same at every level</p>}
            <p data-testid={`pl-spec-${x.id}`} class={`mt-2 text-sm ${INK}`}>{x.spec || 'Nothing at this level'}</p>
            {x.where && <p class={`text-sm ${MUTED}`}>{x.where}</p>}
            <div class="mt-2 flex flex-wrap items-baseline justify-between gap-2">
              <p data-testid={`pl-amount-${x.id}`} class={`font-semibold tabular-nums ${INK}`}>Rs. {x.amount}</p>
              {x.over && <p data-testid={`pl-over-${x.id}`} class={`text-sm tabular-nums ${MUTED}`}>{x.over.text}</p>}
            </div>
            {x.lines.length > 0 && <button type="button" data-testid={`pl-items-${x.id}`} aria-expanded={!!shown[x.id]} class={`mt-2 ${BUTTON}`}
              onClick={() => setShown((m) => ({ ...m, [x.id]: !m[x.id] }))}>{shown[x.id] ? 'Hide the items' : `See the ${x.lines.length} item${x.lines.length === 1 ? '' : 's'}`}</button>}
            {shown[x.id] && <ol class="mt-3 divide-y divide-slate-200 dark:divide-slate-800">
              {x.lines.map((l) => <Item key={l.key} s={s} v={v} l={l} open={open === l.key} toggle={() => setOpen((k) => (k === l.key ? null : l.key))} update={update} />)}
            </ol>}
          </>}
        </article>
      </li>)}
    </ul>
  </Section>;
}

/** Five stops, snapping; the package's stop marked. Moving it sets every item of the section to that level. */
function Slider({ s, x, update }: { s: PlanState; x: SectionView; update: Update }) {
  const level = (x.level ?? s.level ?? 2) as Level;
  return <div class="mt-2">
    <label for={`fld-slider-${x.id}`} class={`text-sm ${INK}`}>
      Level: <span data-testid={`pl-level-${x.id}`} class="font-medium">{x.mixed ? `Mixed (${x.mixed} chosen)` : x.levelName}</span>
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
    {open && d && <Drawer s={s} l={l} d={d} update={update} />}
  </li>;
}

/** The item drawer (A8): the family's five levels, its other items, brands as chips, and how the line was worked out. */
function Drawer({ s, l, d, update }: { s: PlanState; l: LineView; d: DrawerView; update: Update }) {
  const name = `fld-item-${l.key}`;
  const choose = (x: RungView, brand?: string) => update((st) => withItem(st, l.key, x.id, brand));
  const rung = (x: RungView, label: string, i: string) => <li key={x.id + i} class="py-2">
    <label for={`${name}-${i}`} class={`flex items-start gap-3 ${x.usable ? 'cursor-pointer' : 'opacity-70'}`}>
      <input type="radio" id={`${name}-${i}`} name={name} checked={x.current} disabled={!x.usable} onChange={() => { if (!x.current) choose(x); }} class={`mt-1 ${RADIO}`} />
      <span class="min-w-0">
        <span class={`block text-sm ${INK}`}><span class="font-medium">{label}</span>: {x.name} · <span class="tabular-nums">{x.rate}</span></span>
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
      <ol class="divide-y divide-slate-200 dark:divide-slate-700">{d.rungs.map((x) => rung(x, d.fixed ? 'Every level' : `${x.label}${x.pkg ? ' (package)' : ''}`, String(x.level)))}</ol>
      {d.others.length > 0 && <details class="mt-1">
        <summary class={`cursor-pointer text-sm text-teal-800 dark:text-teal-300`}>Other choices ({d.others.length})</summary>
        <ol class="divide-y divide-slate-200 dark:divide-slate-700">{d.others.map((x, i) => rung(x, x.label, `o${i}`))}</ol>
      </details>}
    </fieldset>
    {l.chosen && <button type="button" data-testid="pl-item-reset" class={`mt-2 ${BUTTON}`} onClick={() => update((st) => withItem(st, l.key, null))}>Back to the level’s item</button>}
    <details class="mt-2" open>
      <summary class={`cursor-pointer text-sm font-medium ${INK}`}>How we worked this out</summary>
      <ul data-testid="pl-how" class={`mt-1 list-disc space-y-0.5 pl-5 text-xs ${INK}`}>
        <li>Quantity: {d.how.quantity}</li>
        <li>Rate: {d.how.rate.join('; ')}</li>
        <li>Amount: {d.how.amount}</li>
      </ul>
      {l.sources.length > 0 && <p class={`mt-1 text-xs ${MUTED}`}>Sources: {l.sources.map((x, i) => <span key={x.id}>{i ? '; ' : ''}{x.url
        ? <a href={x.url} target="_blank" rel="noopener noreferrer" class="text-teal-800 underline dark:text-teal-300">{x.what}</a> : x.what}</span>)}. As reported, not yet checked.</p>}
      {l.note && <p class={`mt-1 text-xs ${MUTED}`}>{l.note}</p>}
    </details>
  </div>;
}

/** What the estimate assumes, each with its reason (D-UX-08, D-UX-18); the ceiling height can be changed here. */
function Assumed({ s, v, update }: { s: PlanState; v: PlanView; update: Update }) {
  const [height, setHeight] = useState(false);
  const bad = heightOf(s.height) === null;
  return <Section id="pl-assumed" title="What the estimate assumes">
    <ul class="mt-3 space-y-2">
      {v.assumed.map((a, i) => <li key={a.what} data-testid={`pl-assumed-${i}`} class={`text-sm ${INK}`}>
        <span class="font-medium">{a.what}:</span> {a.shown}
        {a.what === 'Ceiling height' && !height && <> <button type="button" data-testid="pl-height-change" class="text-teal-800 underline dark:text-teal-300" onClick={() => setHeight(true)}>Change</button></>}
        {a.what === 'Ceiling height' && height && <TextField id="fld-height" class="mt-2 max-w-xs" label="Ceiling height, in metres" inputMode="decimal" value={s.height}
          placeholder={`like ${RULE_HEIGHT}`} invalid={bad} said={bad ? `Type a height from 2 to 6 metres, like 3. Until then the estimate uses ${RULE_HEIGHT} m.` : undefined} onCommit={(t) => update((x) => ({ ...x, height: t }))} />}
        <SourceNote what="Why">{a.why}{a.sources.length ? ` Sources: ${a.sources.map((x) => x.what).join('; ')}.` : ''}</SourceNote>
      </li>)}
    </ul>
  </Section>;
}

function Flags({ v }: { v: PlanView }) {
  return <Section id="pl-flags" title="To check">
    <ul data-testid="pl-flags" class="mt-3 list-disc space-y-1 rounded-md border border-amber-300 bg-amber-50 py-3 pr-3 pl-8 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
      {v.flags.map((f) => <li key={f}>{f}</li>)}
    </ul>
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
  const field = (id: keyof PlanFacts, label: string, hint?: string) =>
    <TextField id={`fld-pl-${id}`} label={label} hint={hint} value={f[id]} said={english(f[id])} invalid={!!english(f[id])} onCommit={(t) => set({ [id]: t })} />;
  return <Section id="pl-download" title="Download the planning estimate">
    <p class={`mt-2 ${HINT}`}>A PDF for the lender, an Excel copy and a Word copy to edit, made in your browser from the figures above: the abstract by section, every item (Annex 1) and what the estimate assumes (Annex 2).</p>
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
  </Section>;
}

