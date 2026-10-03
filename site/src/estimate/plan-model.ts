/**
 * The planning estimate's page (E1), apart from the page (as dscr/model.ts): the six answers to the engine's input
 * (engine/architect.ts), and its answer to words, with the engine's exact figures beside them for the Excel copy. Pure,
 * no DOM. Every figure comes from the engine: the estimate, the five-level strip, the change from the package and the
 * drawer's rates are each worked out twice there; this file only words, groups and orders them.
 */
import {
  BHKS, CITIES, FLOORS, LEVELS, R, WORK_KINDS, architect, architectNeeds, choicesFor, levelName, overPackage, strip,
  type ArchitectEstimate, type ArchitectInput, type Bhk, type Choice, type Level, type Line, type WorkKind,
} from '../../../engine/architect';
import { CLASSES, LIBRARY_DATE, PER, SOURCE, SQFT_PER_SQM, type ItemKind, type Unit } from '../../../engine/library';
import { parseAmount } from '../../../engine/parse';
import { inr, rupeesWords } from '../../../engine/util';

export type Home = 'flat' | 'house';
export type AreaUnit = 'sqft' | 'sqm';
/** What only the document needs, asked beside the download. */
export interface PlanFacts { owner: string; property: string; lender: string; preparedBy: string }
export interface PlanState {
  kind?: WorkKind; home?: Home;
  /** A new house's floors, asked instead of flat or house (A3). */
  floors?: number;
  city?: string;
  /** The carpet area as typed, or a new house's built-up area of all floors, in `unit`. */
  area: string; unit: AreaUnit; bhk?: Bhk;
  /** The package: the level chosen in question 6, or on the strip. */
  level?: Level;
  /** Against the package: sections switched on or off, a section's own level, a line's own item. */
  sections: Record<string, boolean>; sliders: Record<string, Level>; items: Record<string, string>;
  /** A brand chosen for a line, named in the documents. It does not change the rate: brands are priced by level (A4). */
  brands: Record<string, string>;
  /** The ceiling height in metres as typed; empty for the rule's. */
  height: string;
  doc: PlanFacts;
}

export const EMPTY_PLAN: PlanState = {
  area: '', unit: 'sqft', sections: {}, sliders: {}, items: {}, brands: {}, height: '', doc: { owner: '', property: '', lender: '', preparedBy: '' },
};

// ---- The six questions (A3) ----

export const WORK_CHOICES: { value: WorkKind; label: string; hint: string }[] = [
  { value: 'build', label: WORK_KINDS.build.label, hint: 'On your plot: the structure, the terrace and outside walls, and every finish inside' },
  { value: 'renovate', label: WORK_KINDS.renovate.label, hint: 'Floors, walls, bathrooms, kitchen, doors, wiring and plumbing renewed' },
  { value: 'interiors', label: WORK_KINDS.interiors.label, hint: 'Wardrobes, kitchen, ceilings, lights, paint and appliances in a finished home' },
];
export const HOME_CHOICES: { value: Home; label: string; hint?: string }[] = [
  { value: 'flat', label: 'Flat' },
  { value: 'house', label: 'House', hint: 'The rooms inside, worked out as for a flat' },
];
export const FLOOR_CHOICES = FLOORS.map((f) => ({ value: String(f.n), label: f.label, hint: f.n === 1 ? 'One storey' : `${f.n} storeys` }));
export const OTHER_CITY = 'other';
export const CITY_CHOICES = [...CITIES.map((c) => ({ value: c.id, label: c.name })), { value: OTHER_CITY, label: 'Another place (the six cities’ average)' }];
export const BHK_CHOICES = BHKS.map((b) => ({ value: b.id, label: b.id === '5' ? '5+ BHK' : b.label }));
export const LEVEL_CHOICES = LEVELS.map((l) => ({ value: String(l.n), label: l.name, hint: l.means }));
export const LEVEL_NAMES = LEVELS.map((l) => l.name);

/** A number as typed: 850 or 1,150.5; null when not understood, undefined when empty. */
export function plainOf(t: string): number | null | undefined {
  if (!t.trim()) return undefined;
  const n = parseAmount(t.replace(/\s*(sq\.?\s*ft|sq\.?\s*m|sqft|sqm|m)\s*$/i, ''), false);
  return n === undefined || !(n > 0) ? null : n;
}

/** A ceiling height as typed, in metres, when it is one the engine takes (2 to 6 m); null when typed but not such a height. */
export function heightOf(t: string): number | null | undefined {
  const h = plainOf(t);
  return h === undefined ? undefined : h !== null && h >= 2 && h <= 6 ? h : null;
}

/** The engine's input from the answers. A height not understood is not passed on: the rule's stays until it is typed again. */
export function inputOf(s: PlanState): ArchitectInput {
  const area = plainOf(s.area), h = heightOf(s.height);
  return {
    kind: s.kind, property: s.kind === 'build' ? 'house' : s.home, ...(s.kind === 'build' && s.floors ? { floors: s.floors } : {}),
    city: s.city, ...(typeof area === 'number' ? { area } : {}), areaUnit: s.unit, bhk: s.bhk, level: s.level,
    sections: s.sections, sliders: s.sliders, items: s.items, ...(typeof h === 'number' ? { heightM: h } : {}),
  };
}

/** What is still needed, in the order asked. A new house's floors come from the engine; the others ask flat or house. */
export function planNeeds(s: PlanState): string[] {
  const needs = architectNeeds(inputOf(s));
  if (!s.home && s.kind !== 'build') needs.splice(s.kind ? 0 : 1, 0, 'Flat or house');
  return needs;
}
/** The area question's words, by the kind (A3). */
export const areaLabel = (kind?: WorkKind) => (kind === 'build' ? 'Built-up area of all floors' : 'Carpet area, as in your agreement');

// ---- Changes, as the page makes them ----

/** A new kind: its own sections on (D-UX-19); the sliders and items stay. */
export const withKind = (s: PlanState, kind: WorkKind): PlanState => ({ ...s, kind, sections: {} });
/** A new package, from question 6 or the strip: every section at that level again. */
export const withLevel = (s: PlanState, level: Level): PlanState => ({ ...s, level, sliders: {}, items: {}, brands: {} });
/** A section's slider moved: its lines all follow it, so the items chosen in it are set aside (A4). */
export function withSlider(s: PlanState, section: string, level: Level, keysIn: string[]): PlanState {
  const items = { ...s.items }, brands = { ...s.brands };
  for (const k of keysIn) { delete items[k]; delete brands[k]; }
  const sliders = { ...s.sliders };
  if (level === s.level) delete sliders[section]; else sliders[section] = level;
  return { ...s, sliders, items, brands };
}
export const withSection = (s: PlanState, section: string, on: boolean): PlanState => ({ ...s, sections: { ...s.sections, [section]: on } });
/** A line's own item (null: back to the level's), and a brand of it or none. */
export function withItem(s: PlanState, key: string, entry: string | null, brand?: string): PlanState {
  const items = { ...s.items }, brands = { ...s.brands };
  if (entry === null) delete items[key]; else items[key] = entry;
  if (brand) brands[key] = brand; else delete brands[key];
  return { ...s, items, brands };
}

// ---- Words ----

const UNIT_SHORT: Record<Unit, string> = { sqft: 'sq ft', sqm: 'sq m', rft: 'rft', m: 'm', nos: 'nos', set: 'set', lot: 'lot', kg: 'kg', cum: 'cum', bag: 'bag' };
const UNIT_RATE = PER;
export const unitText = (u: Unit) => UNIT_SHORT[u];
/** Whole rupees, grouped the Indian way. */
const rupees = (n: number) => inr(n);
/** A rate to the paisa where it has paise. */
const rateText = (n: number) => inr(n, Number.isInteger(n) ? 0 : 2);
/** A quantity to two places, without trailing zeros: 12.5, 40. */
export const qtyText = (n: number) => inr(n, 2).replace(/\.?0+$/, '');
/** A line's quantity as estimates show it: areas and lengths to two places, counts whole. */
const lineQty = (n: number, u: Unit) => (['nos', 'set', 'lot', 'bag', 'kg'].includes(u) && Number.isInteger(n) ? inr(n) : inr(n, 2));
export const rateWords = (n: number, u: Unit) => `Rs. ${rateText(n)} ${UNIT_RATE[u]}`;
/** A total in lakhs or crores for the strip, where five must fit across a phone: 8.46 L, 1.23 Cr. */
export function shortRupees(n: number): string {
  if (n >= 1e7) return `${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `${(n / 1e5).toFixed(2)} L`;
  return inr(n);
}
const dmy = (iso: string) => iso.split('-').reverse().join('-');
const KIND_WORD: Record<ItemKind, string> = { fixed: 'Fixed works', movable: 'Movable items', appliance: 'Appliances' };
export const TITLE: Record<WorkKind, string> = { build: 'Estimate of cost of construction', renovate: 'Estimate of cost of renovation', interiors: 'Estimate of cost of interiors and furnishing' };

/** A source, numbered in order of first use; `cls` is its class (1 to 4, R or O) in sources.json. */
export interface SourceView { id: string; no: number; what: string; url: string; cls: string }
export interface LineView {
  key: string; no: string; room: string; name: string; entry: string; item: string; spec: string;
  /** "Kajaria, Somany or equivalent", or the brand chosen. */
  brands: string; brand?: string; level: string; chosen: boolean;
  qty: string; unit: string; rate: string; amount: string; n: { qty: number; rate: number; amount: number };
  kind: string; how: string; rateHow: string[]; sources: SourceView[]; note?: string;
}
export interface SectionView {
  id: string; no: number; name: string; on: boolean; slider: boolean; level: Level | null; levelName: string;
  amount: string; n: number; over?: { text: string; n: number };
  /** The section's main items at this level, in one line, and where they go. */
  spec: string; where: string;
  /** Lines with an item of the user's own. */
  mixed: number; lines: LineView[];
}
export interface StripView { level: Level; name: string; total: string; full: string; n: number; current: boolean }
export interface BarView { id: string; name: string; amount: string; n: number; width: number }
export interface AssumedView { what: string; shown: string; why: string; sources: SourceView[] }
export interface PlanView {
  summary: string; title: string; kind: string; home: string; city: string; area: string; bhk: string; level: string;
  /** "Carpet area", or "Built-up area" for a new house: the area typed and the one the cost a sq ft is of. */
  areaName: string;
  total: string; perSqft: string; words: string; n: { total: number; perSqft: number };
  strip: StripView[]; bar: BarView[]; sections: SectionView[];
  /** Fixed works, movable items and appliances, when there is more than fixed works. */
  split?: { label: string; amount: string; n: number }[];
  assumed: AssumedView[]; flags: string[]; unpriced: string[];
  ratesLine: string; ratesDate: string;
  /** Every source the lines and the assumptions use, numbered in order of first use, and what each class means; on the page only. */
  sources: SourceView[]; classes: { id: string; means: string }[];
}
export interface PlanPreview { needs: string[]; blocked?: string; view?: PlanView }

/** The estimate so far: what is still needed, or the estimate in words. */
export function planPreview(s: PlanState): PlanPreview {
  const needs = planNeeds(s);
  if (needs.length) return { needs };
  const input = inputOf(s), e = architect(input);
  if (!('total' in e)) return stopped(e);
  const levels = strip(input);
  if (!Array.isArray(levels)) return stopped(levels);
  const over = overPackage(input);
  if (isStop(over)) return stopped(over);
  return { needs: [], view: viewOf(s, e, levels, over) };
}
type Stop = { needs: string[] } | { blocked: string };
const isStop = (x: object): x is Stop => Array.isArray((x as { needs?: unknown }).needs) || typeof (x as { blocked?: unknown }).blocked === 'string';
const stopped = (x: Stop): PlanPreview => ('blocked' in x ? { needs: [], blocked: x.blocked } : { needs: x.needs });

function viewOf(s: PlanState, e: ArchitectEstimate, levels: number[], over: Record<string, number>): PlanView {
  const numbered = new Map<string, SourceView>();
  const sourceOf = (id: string): SourceView => {
    let v = numbered.get(id);
    if (!v) {
      const x = SOURCE[id];
      v = { id, no: numbered.size + 1, what: x?.what ?? id, url: x?.url ?? '', cls: x?.class ?? '' };
      numbered.set(id, v);
    }
    return v;
  };
  const pkg = levelName(e.level);
  let no = 0;
  const sections: SectionView[] = e.sections.map((t) => {
    const ls = e.lines.filter((l) => l.section === t.id);
    const sectionNo = t.on && ls.length ? ++no : 0;
    const lines = ls.map((l, i) => lineView(s, l, `${sectionNo}.${i + 1}`, sourceOf));
    const d = over[t.id] ?? 0;
    return {
      id: t.id, no: sectionNo, name: t.name, on: t.on, slider: t.slider, level: t.level, levelName: t.level ? levelName(t.level) : '',
      amount: rupees(t.amount), n: t.amount,
      ...(Math.round(d) !== 0 ? { over: { text: `Rs. ${rupees(Math.abs(d))} ${d > 0 ? 'more' : 'less'} than ${pkg}`, n: d } } : {}),
      spec: specOf(ls), where: whereOf(ls, e), mixed: ls.filter((l) => l.chosen).length, lines,
    };
  });
  const shown = sections.filter((x) => x.on && x.n > 0), most = Math.max(1, ...shown.map((x) => x.n));
  const bar = shown.map((x) => ({ id: x.id, name: x.name, amount: x.amount, n: x.n, width: Math.max(1, (x.n / most) * 100) }));
  const split = e.split.movable || e.split.appliance
    ? (['fixed', 'movable', 'appliance'] as ItemKind[]).filter((k) => e.split[k]).map((k) => ({ label: KIND_WORD[k], amount: rupees(e.split[k]), n: e.split[k] }))
    : undefined;
  const assumed = e.assumptions.map((a) => ({ what: a.what, shown: a.shown, why: a.why, sources: a.src.filter((x) => x !== 'own').map(sourceOf) }));
  const listed = CITIES.some((c) => c.id === e.city), city = listed ? e.cityName : 'Another place';
  // The area as typed: the carpet area, or a new house's built-up area.
  const sqm = e.house ? e.house.builtSqm : e.carpetSqm, sqft = e.house ? e.house.builtSqm * SQFT_PER_SQM : e.carpetSqft;
  const area = s.unit === 'sqm' ? `${qtyText(sqm)} sq m (${qtyText(sqft)} sq ft)` : `${qtyText(sqft)} sq ft (${qtyText(sqm)} sq m)`;
  const kind = WORK_KINDS[e.kind].label, bhk = BHK_CHOICES.find((b) => b.value === e.bhk)?.label ?? e.bhk;
  const home = e.house ? FLOORS[e.house.floors - 1].label : e.property === 'house' ? 'House' : 'Flat';
  return {
    // Each answer kept on one line (no-break spaces inside it), so a phone wraps only between answers.
    summary: [kind, home, city, s.unit === 'sqm' ? `${qtyText(sqm)} sq m` : `${qtyText(sqft)} sq ft`, bhk, pkg].map((x) => x.replace(/ /g, '\u00a0')).join(' · '),
    title: TITLE[e.kind], kind, home, city, area, bhk, level: pkg, areaName: e.per === 'built-up' ? 'Built-up area' : 'Carpet area',
    total: rupees(e.total), perSqft: rupees(e.perSqft), words: rupeesWords(e.total), n: { total: e.total, perSqft: e.perSqft },
    strip: levels.map((n, i) => ({ level: (i + 1) as Level, name: LEVEL_NAMES[i], total: shortRupees(n), full: rupees(n), n, current: i + 1 === e.level })),
    bar, sections, ...(split ? { split } : {}), assumed, flags: e.flags,
    unpriced: e.unpriced.map((u) => `${u.roomName}, ${u.name.toLowerCase()}: ${u.entryName}`),
    ratesLine: `Planning estimate · rates as of ${dmy(e.ratesDate)} for ${listed ? city : 'another place, at the six cities’ average'}`,
    ratesDate: dmy(LIBRARY_DATE), sources: [...numbered.values()],
    classes: Object.entries(CLASSES).filter(([id]) => [...numbered.values()].some((x) => x.cls === id)).map(([id, means]) => ({ id, means })),
  };
}

function lineView(s: PlanState, l: Line, no: string, sourceOf: (id: string) => SourceView): LineView {
  const chosen = s.brands[l.key] && l.brands.includes(s.brands[l.key]) ? s.brands[l.key] : undefined;
  const brands = chosen ? `Brand: ${chosen}` : l.brands.length ? `${l.brands.join(', ')} or equivalent` : '';
  return {
    key: l.key, no, room: l.roomName, name: l.name, entry: l.entry, item: l.entryName, spec: l.spec, brands, ...(chosen ? { brand: chosen } : {}),
    level: l.level ? levelName(l.level) : '', chosen: l.chosen,
    qty: lineQty(l.qty, l.unit), unit: unitText(l.unit), rate: rateText(l.rate), amount: rupees(l.amount), n: { qty: l.qty, rate: l.rate, amount: l.amount },
    kind: KIND_WORD[l.kind], how: l.how, rateHow: l.rateHow, sources: l.sources.filter((x) => x !== 'own').map(sourceOf), ...(l.note ? { note: l.note } : {}),
  };
}

/** The section's main items, the largest first, in one line. */
function specOf(ls: Line[]): string {
  const names: string[] = [];
  for (const l of [...ls].sort((a, b) => b.amount - a.amount)) if (!names.includes(l.entryName)) names.push(l.entryName);
  return names.slice(0, 3).join(' · ');
}
/** Where the section's lines go: the rooms by name, up to three. */
function whereOf(ls: Line[], e: ArchitectEstimate): string {
  const rooms = [...new Set(ls.filter((l) => l.room !== null).map((l) => l.roomName))];
  const whole = `the whole ${e.property}`;
  if (!rooms.length) return ls.length ? `For ${whole}` : '';
  const named = rooms.length <= 3 ? rooms.join(', ').replace(/, ([^,]*)$/, ' and $1') : `${rooms.length} rooms`;
  return `In ${named}${ls.some((l) => l.room === null) ? `, and for ${whole}` : ''}`;
}

/** "Complete", or "Provisional: 2 still needed". */
export const statusText = (p: PlanPreview, more: string[] = []) =>
  p.blocked ? 'No figures' : p.needs.length + more.length ? `Provisional: ${p.needs.length + more.length} still needed` : 'Complete';

// ---- The item drawer ----

export interface RungView {
  id: string; label: string; name: string; spec: string; brands: string[]; rate: string; usable: boolean; current: boolean;
}
export interface DrawerView {
  key: string; fixed: boolean;
  /** The family's item at each level, named by the level; the package's level marked. */
  rungs: (RungView & { level: Level; pkg: boolean })[];
  others: RungView[];
  how: { quantity: string; rate: string[]; amount: string };
}

/** The drawer for one line of the estimate: its ladder of five levels, the family's other items, and how it was worked out. */
export function drawerView(s: PlanState, v: PlanView, key: string): DrawerView | undefined {
  const line = v.sections.flatMap((x) => x.lines).find((l) => l.key === key);
  const c = line && choicesFor(inputOf(s), key);
  if (!line || !c) return undefined;
  const rung = (x: Choice, label: string): RungView => ({
    id: x.id, label, name: x.name, spec: x.spec, brands: x.brands, rate: x.rate === null ? 'No rate yet' : rateWords(x.rate, x.unit),
    usable: x.rate !== null, current: x.id === line.entry,
  });
  const rungs = c.fixed
    ? c.ladder.filter((x): x is Choice => !!x).map((x) => ({ ...rung(x, 'Every level'), level: s.level as Level, pkg: true }))
    : c.ladder.flatMap((x, i) => (x ? [{ ...rung(x, LEVEL_NAMES[i]), level: (i + 1) as Level, pkg: i + 1 === s.level }] : []));
  const others = c.others.map((x) => rung(x, x.level ? `Usually ${LEVEL_NAMES[x.level - 1]}` : 'Also in the library'));
  return {
    key, fixed: c.fixed, rungs, others,
    how: {
      quantity: line.how,
      rate: [...line.rateHow, `= Rs. ${line.rate} ${UNIT_RATE[unitOf(line.unit)]}`],
      amount: `${line.qty} ${line.unit} × Rs. ${line.rate} = Rs. ${line.amount}`,
    },
  };
}
const unitOf = (short: string) => (Object.keys(UNIT_SHORT) as Unit[]).find((u) => UNIT_SHORT[u] === short) ?? 'nos';

/** The ceiling height the estimate uses, for the assumption's field. */
export const RULE_HEIGHT = R.height.m;
