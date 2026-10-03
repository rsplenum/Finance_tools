/**
 * The planning estimate's page (E1, E3), apart from the page (as dscr/model.ts): the six answers to the engine's input
 * (engine/architect.ts), and its answer to words, with the engine's exact figures beside them for the Excel copy. Pure,
 * no DOM. Every figure comes from the engine: the estimate, the five levels (the strip and Compare), the change from the
 * package, what the last change did and the drawer's rates are each worked out twice there; this file only words, groups
 * and orders them. The rooms' own sizes, and a new house's plot (E5), are typed in the page's unit and passed on in metres.
 */
import {
  BHKS, CITIES, FLOORS, LEVELS, PLOT_SIDE, R, ROOM_SIDE, WORK_KINDS, architect, architectNeeds, changeOf, choicesFor, levelName, levelRuns, overPackage, planRooms,
  type ArchitectEstimate, type ArchitectInput, type Bhk, type Change, type Choice, type House, type Level, type LevelRuns, type Line, type Stage, type WorkKind,
} from '../../../engine/architect';
import { CLASSES, FT_PER_M, LIBRARY_DATE, PER, SOURCE, SQFT_PER_SQM, type ItemKind, type Unit } from '../../../engine/library';
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
  /** A room's own size by its id, its two sides as typed in the page's unit: feet for sq ft, metres for sq m (E3). */
  rooms: Record<string, { l: string; b: string }>;
  /** A room's own level by its id (A4, A8). */
  roomLevels: Record<string, Level>;
  /** A new house's plot, its two sides as typed in the page's unit; empty for the rule's plot round the outline (E5). */
  plot: { l: string; b: string };
  /** A new house: the city's sewer reaches the plot, so it takes the septic tank's place (E5). */
  sewer: boolean;
  /** The last change to the estimate, for What changed: its words, and the engine's input before and after it. */
  change?: Made;
  doc: PlanFacts;
}
export interface Made { what: string; before: ArchitectInput; after: ArchitectInput }

export const EMPTY_PLAN: PlanState = {
  area: '', unit: 'sqft', sections: {}, sliders: {}, items: {}, brands: {}, height: '', rooms: {}, roomLevels: {}, plot: { l: '', b: '' }, sewer: false,
  doc: { owner: '', property: '', lender: '', preparedBy: '' },
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
  const n = parseAmount(t.replace(/\s*(sq\.?\s*ft|sq\.?\s*m|sqft|sqm|ft|feet|m)\s*$/i, ''), false);
  return n === undefined || !(n > 0) ? null : n;
}

/** A ceiling height as typed, in metres, when it is one the engine takes (2 to 6 m); null when typed but not such a height. */
export function heightOf(t: string): number | null | undefined {
  const h = plainOf(t);
  return h === undefined ? undefined : h !== null && h >= 2 && h <= 6 ? h : null;
}

/** Metres in one of the page's length units. */
const METRES: Record<AreaUnit, number> = { sqft: 0.3048, sqm: 1 };
/** The length unit that goes with the area's: ft with sq ft, m with sq m. */
export const sideUnit = (u: AreaUnit) => (u === 'sqm' ? 'm' : 'ft');
/** The sides a room can take, in the page's unit, for the field's message: 1 to 98 ft, or 0.3 to 30 m. */
export const sideRange = (u: AreaUnit) => (u === 'sqm' ? [ROOM_SIDE.min, ROOM_SIDE.max] : [Math.ceil(ROOM_SIDE.min / 0.3048), Math.floor(ROOM_SIDE.max / 0.3048)]);

/** A room's side as typed, in metres, when it is one the engine takes; null when typed but not such a side. */
export function sideOf(t: string, u: AreaUnit): number | null | undefined {
  const n = plainOf(t);
  if (typeof n !== 'number') return n;
  const m = n * METRES[u];
  return m >= ROOM_SIDE.min - 1e-9 && m <= ROOM_SIDE.max + 1e-9 ? m : null;
}
/** The sides a plot can take, in the page's unit, for the field's message: 10 to 984 ft, or 3 to 300 m. */
export const plotRange = (u: AreaUnit) => (u === 'sqm' ? [PLOT_SIDE.min, PLOT_SIDE.max] : [Math.ceil(PLOT_SIDE.min / 0.3048), Math.floor(PLOT_SIDE.max / 0.3048)]);
/** A plot's side as typed, in metres, when it is one the engine takes; null when typed but not such a side. */
export function plotSideOf(t: string, u: AreaUnit): number | null | undefined {
  const n = plainOf(t);
  if (typeof n !== 'number') return n;
  const m = n * METRES[u];
  return m >= PLOT_SIDE.min - 1e-9 && m <= PLOT_SIDE.max + 1e-9 ? m : null;
}
/** The plot in metres, when both sides are typed and understood. */
function plotOf(s: PlanState): { l: number; b: number } | undefined {
  const l = plotSideOf(s.plot.l, s.unit), b = plotSideOf(s.plot.b, s.unit);
  return typeof l === 'number' && typeof b === 'number' ? { l, b } : undefined;
}
/** The rooms' own sizes in metres: only those with both sides typed and understood. */
function roomSizes(s: PlanState): Record<string, { l: number; b: number }> {
  const out: Record<string, { l: number; b: number }> = {};
  for (const [id, x] of Object.entries(s.rooms)) {
    const l = sideOf(x.l, s.unit), b = sideOf(x.b, s.unit);
    if (typeof l === 'number' && typeof b === 'number') out[id] = { l, b };
  }
  return out;
}

/**
 * The engine's input from the answers. A height or a room's size not understood is not passed on: the rule's, or the
 * planned size, stays until it is typed again.
 */
export function inputOf(s: PlanState): ArchitectInput {
  const area = plainOf(s.area), h = heightOf(s.height), rooms = roomSizes(s), plot = s.kind === 'build' ? plotOf(s) : undefined;
  return {
    kind: s.kind, property: s.kind === 'build' ? 'house' : s.home, ...(s.kind === 'build' && s.floors ? { floors: s.floors } : {}),
    city: s.city, ...(typeof area === 'number' ? { area } : {}), areaUnit: s.unit, bhk: s.bhk, level: s.level,
    sections: s.sections, sliders: s.sliders, items: s.items, ...(typeof h === 'number' ? { heightM: h } : {}),
    ...(Object.keys(rooms).length ? { rooms } : {}), ...(Object.keys(s.roomLevels).length ? { roomLevels: s.roomLevels } : {}),
    ...(plot ? { plot } : {}), ...(s.kind === 'build' && s.sewer ? { sewer: true } : {}),
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

const same = (a: ArchitectInput, b: ArchitectInput) => JSON.stringify(a) === JSON.stringify(b);
/** The state after a change to the estimate, the change noted for What changed; one that leaves the input as it was keeps the last. */
function noted(s: PlanState, next: PlanState, what: string): PlanState {
  const before = inputOf(s), after = inputOf(next);
  return { ...next, change: same(before, after) ? s.change : { what, before, after } };
}
const sectionName = (id: string) => R.sections.find((x) => x.id === id)?.name ?? id;

/** A new kind: its own sections on (D-UX-19); the sliders and items stay. */
export const withKind = (s: PlanState, kind: WorkKind): PlanState => ({ ...s, kind, sections: {} });
/** A new package, from question 6 or the strip: every section and room at that level again. */
export const withLevel = (s: PlanState, level: Level): PlanState =>
  noted(s, { ...s, level, sliders: {}, items: {}, brands: {}, roomLevels: {} }, `Every section to ${LEVEL_NAMES[level - 1]}`);
/** A section's slider moved: its lines all follow it, so the items chosen in it are set aside (A4). */
export function withSlider(s: PlanState, section: string, level: Level, keysIn: string[]): PlanState {
  const items = { ...s.items }, brands = { ...s.brands };
  for (const k of keysIn) { delete items[k]; delete brands[k]; }
  const sliders = { ...s.sliders };
  if (level === s.level) delete sliders[section]; else sliders[section] = level;
  return noted(s, { ...s, sliders, items, brands }, `${sectionName(section)} to ${LEVEL_NAMES[level - 1]}`);
}
export const withSection = (s: PlanState, section: string, on: boolean): PlanState =>
  noted(s, { ...s, sections: { ...s.sections, [section]: on } }, `${sectionName(section)} switched ${on ? 'on' : 'off'}`);
/** A line's own item (null: back to the level's), and a brand of it or none; `what` names the change for What changed. */
export function withItem(s: PlanState, key: string, entry: string | null, brand?: string, what = 'An item of your own'): PlanState {
  const items = { ...s.items }, brands = { ...s.brands };
  if (entry === null) delete items[key]; else items[key] = entry;
  if (brand) brands[key] = brand; else delete brands[key];
  return noted(s, { ...s, items, brands }, what);
}
/** A new unit for the area: the rooms' sides typed so far are turned into it. */
export function withUnit(s: PlanState, unit: AreaUnit): PlanState {
  if (unit === s.unit) return s;
  const turn = (t: string) => { const n = plainOf(t); return typeof n === 'number' ? qtyText((n * METRES[s.unit]) / METRES[unit]) : t; };
  const rooms = Object.fromEntries(Object.entries(s.rooms).map(([id, x]) => [id, { l: turn(x.l), b: turn(x.b) }]));
  return { ...s, unit, rooms, plot: { l: turn(s.plot.l), b: turn(s.plot.b) } };
}
/** A side of a new house's plot as typed; both sides empty: back to the rule's plot round the outline (E5). */
export function withPlotSide(s: PlanState, side: 'l' | 'b', text: string): PlanState {
  const plot = { ...s.plot, [side]: text };
  return noted(s, { ...s, plot }, plot.l.trim() || plot.b.trim() ? `The plot to ${plot.l.trim()} × ${plot.b.trim()} ${sideUnit(s.unit)}` : 'The plot back to the planned one');
}
export const withPlotReset = (s: PlanState): PlanState => noted(s, { ...s, plot: { l: '', b: '' } }, 'The plot back to the planned one');
/** Whether the city's sewer reaches a new house's plot: then a sewer connection takes the septic tank's place. */
export const withSewer = (s: PlanState, on: boolean): PlanState =>
  noted(s, { ...s, sewer: on }, on ? 'The sewer in place of a septic tank' : 'A septic tank in place of the sewer');
/** A side of a room's own size as typed (`name` for What changed); both sides empty: back to the planned size. */
export function withRoomSide(s: PlanState, id: string, side: 'l' | 'b', text: string, name: string): PlanState {
  const x = { ...(s.rooms[id] ?? { l: '', b: '' }), [side]: text }, rooms = { ...s.rooms, [id]: x };
  if (!x.l.trim() && !x.b.trim()) delete rooms[id];
  return noted(s, { ...s, rooms }, rooms[id] ? `${name} to ${x.l.trim()} × ${x.b.trim()} ${sideUnit(s.unit)}` : `${name} back to its planned size`);
}
export function withRoomReset(s: PlanState, id: string, name: string): PlanState {
  const rooms = { ...s.rooms };
  delete rooms[id];
  return noted(s, { ...s, rooms }, `${name} back to its planned size`);
}
/** A room's own level, or null for the sections' levels again. */
export function withRoomLevel(s: PlanState, id: string, level: Level | null, name: string): PlanState {
  const roomLevels = { ...s.roomLevels };
  if (level === null) delete roomLevels[id]; else roomLevels[id] = level;
  return noted(s, { ...s, roomLevels }, level === null ? `${name} back to the sections' levels` : `${name} at ${LEVEL_NAMES[level - 1]}`);
}

// ---- Words ----

const UNIT_SHORT: Record<Unit, string> = { sqft: 'sq ft', sqm: 'sq m', rft: 'rft', m: 'm', nos: 'nos', set: 'set', lot: 'lot', kg: 'kg', cum: 'cum', bag: 'bag', litre: 'litres' };
const UNIT_RATE = PER;
export const unitText = (u: Unit) => UNIT_SHORT[u];
/** Whole rupees, grouped the Indian way. */
const rupees = (n: number) => inr(n);
/** A rate to the paisa where it has paise. */
const rateText = (n: number) => inr(n, Number.isInteger(n) ? 0 : 2);
/** A quantity to two places, without trailing zeros: 12.5, 40. */
export const qtyText = (n: number) => inr(n, 2).replace(/\.?0+$/, '');
/** A line's quantity as estimates show it: areas and lengths to two places, counts whole. */
const lineQty = (n: number, u: Unit) => (['nos', 'set', 'lot', 'bag', 'kg', 'litre'].includes(u) && Number.isInteger(n) ? inr(n) : inr(n, 2));
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
  /** Lines with an item of the user's own, and lines at a room's own level; "Mixed (…)" when either is not nil. */
  mixed: number; mixedText: string; lines: LineView[];
}
export interface StripView { level: Level; name: string; total: string; full: string; n: number; current: boolean }
export interface BarView { id: string; name: string; amount: string; n: number; width: number }
export interface AssumedView { what: string; shown: string; why: string; sources: SourceView[] }
/** A room in the list (A8): its size and area now, its sides as typed and as planned, its own level. */
export interface RoomView {
  id: string; name: string; size: string; area: string; typed: boolean; level: Level | null;
  /** The sides as typed (empty when not), and the planned ones for the fields' placeholders, in the page's unit. */
  l: string; b: string; planned: { l: string; b: string };
  /** Why a typed size is not used yet, or nothing. */
  bad?: string;
}
/** One amount in Compare: in lakhs for the table, in full for its label; `mine` marks the level the estimate is at. */
export interface CompareCell { text: string; full: string; n: number; mine: boolean }
/** Compare (A8): each section on and the total, at the five levels as a package; "Yours" where the estimate differs. */
export interface CompareView { rows: { id: string; name: string; cells: CompareCell[]; yours?: string }[]; totals: CompareCell[]; yours?: string }
/** What changed (A8): the last change and what it did to the total, and the items it brought in. */
export interface ChangeView { text: string; n: number; items: string }
/** A new house's stage for a construction loan (E5): its amount, its share of the total and the share paid by its end. */
export interface StageView { id: string; name: string; what: string; amount: string; n: number; share: string; upTo: string }
/** A new house's plot for its fields (E5): the sides as typed and the planned ones, in the page's unit; why a typed size is not used yet. */
export interface PlotView { l: string; b: string; planned: { l: string; b: string }; own: boolean; bad?: string }
export interface PlanView {
  summary: string; title: string; kind: string; home: string; city: string; area: string; bhk: string; level: string;
  /** "Carpet area", or "Built-up area" for a new house: the area typed and the one the cost a sq ft is of. */
  areaName: string;
  total: string; perSqft: string; words: string; n: { total: number; perSqft: number };
  strip: StripView[]; bar: BarView[]; sections: SectionView[];
  rooms: RoomView[]; roomsNote?: string; compare: CompareView; change?: ChangeView;
  /** A new house's stages, adding up to the total, and its plot. */
  stages?: StageView[]; plot?: PlotView;
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
  const runs = levelRuns(input);
  if (isStop(runs)) return stopped(runs);
  const over = overPackage(input);
  if (isStop(over)) return stopped(over);
  // What the last change did, while the estimate is still the one it made; a change from no estimate says nothing.
  const c = s.change && same(s.change.after, input) ? changeOf(s.change.before, s.change.after) : undefined;
  if (c && 'blocked' in c) return stopped(c);
  return { needs: [], view: viewOf(s, e, runs, over, c && 'by' in c ? { what: (s.change as Made).what, ...c } : undefined) };
}
type Stop = { needs: string[] } | { blocked: string };
const isStop = (x: object): x is Stop => Array.isArray((x as { needs?: unknown }).needs) || typeof (x as { blocked?: unknown }).blocked === 'string';
const stopped = (x: Stop): PlanPreview => ('blocked' in x ? { needs: [], blocked: x.blocked } : { needs: x.needs });

function viewOf(s: PlanState, e: ArchitectEstimate, runs: LevelRuns, over: Record<string, number>, change?: Change & { what: string }): PlanView {
  const levels = runs.totals;
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
    // Rooms at a level of their own, other than the section's, with a line in it that follows that level.
    const ownLevel = (room: string | null) => e.rooms.find((r) => r.id === room)?.level ?? null;
    const chosen = ls.filter((l) => l.chosen).length;
    const roomLevel = new Set(ls.filter((l) => !l.chosen && l.level !== null && ownLevel(l.room) !== null && ownLevel(l.room) !== t.level).map((l) => l.room)).size;
    const mixedText = [chosen ? `${chosen} chosen` : '', roomLevel ? `${roomLevel} room${roomLevel > 1 ? 's' : ''} at ${roomLevel > 1 ? 'their' : 'its'} own level` : ''].filter(Boolean).join(', ');
    return {
      id: t.id, no: sectionNo, name: t.name, on: t.on, slider: t.slider, level: t.level, levelName: t.level ? levelName(t.level) : '',
      amount: rupees(t.amount), n: t.amount,
      ...(Math.round(d) !== 0 ? { over: { text: `Rs. ${rupees(Math.abs(d))} ${d > 0 ? 'more' : 'less'} than ${pkg}`, n: d } } : {}),
      spec: specOf(ls), where: whereOf(ls, e), mixed: chosen + roomLevel, mixedText: mixedText ? `Mixed (${mixedText})` : '', lines,
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
  const roomsNote = e.flags.find((f) => f.startsWith('With your sizes'));
  return {
    rooms: roomsOf(s, e), ...(roomsNote ? { roomsNote } : {}), compare: compareOf(e, runs, sections), ...(change ? { change: changeText(change) } : {}),
    ...(e.stages ? { stages: stageViews(e.stages) } : {}), ...(e.house ? { plot: plotView(s, e.house) } : {}),
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

/** The rooms as planned or sized, in the page's unit, each with its own level. */
function roomsOf(s: PlanState, e: ArchitectEstimate): RoomView[] {
  const ft = s.unit !== 'sqm', side = (m: number) => qtyText(ft ? m * FT_PER_M : m), unit = sideUnit(s.unit);
  const planned = new Map(planRooms(e.bhk, e.carpetSqm).map((r) => [r.id, r]));
  const [lo, hi] = sideRange(s.unit);
  return e.rooms.map((r) => {
    const typed = s.rooms[r.id] ?? { l: '', b: '' }, p = planned.get(r.id) ?? r;
    const l = sideOf(typed.l, s.unit), b = sideOf(typed.b, s.unit), any = !!(typed.l.trim() || typed.b.trim());
    const bad = !any ? undefined : l === null || b === null ? `Type each side from ${lo} to ${hi} ${unit}.` : l === undefined || b === undefined ? 'Type both sides.' : undefined;
    return {
      id: r.id, name: r.name, size: `${side(r.l)} × ${side(r.b)} ${unit}`, area: ft ? `${inr(Math.round(r.sqm * SQFT_PER_SQM))} sq ft` : `${qtyText(r.sqm)} sq m`,
      typed: r.typed, level: r.level, l: typed.l, b: typed.b, planned: { l: side(p.l), b: side(p.b) }, ...(bad ? { bad } : {}),
    };
  });
}

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
/** The stages in words: each one's share of the total, and the share paid by its end. */
function stageViews(st: Stage[]): StageView[] {
  let upTo = 0;
  return st.map((x) => { upTo += x.share; return { id: x.id, name: x.name, what: x.what, amount: rupees(x.amount), n: x.amount, share: pct(x.share), upTo: pct(upTo) }; });
}
/** The plot's fields: as typed, the planned sides for the placeholders, and why a typed size is not used yet. */
function plotView(s: PlanState, h: House): PlotView {
  const ft = s.unit !== 'sqm', side = (m: number) => qtyText(ft ? m * FT_PER_M : m), m = R.house.plot, unit = sideUnit(s.unit);
  const [lo, hi] = plotRange(s.unit), l = plotSideOf(s.plot.l, s.unit), b = plotSideOf(s.plot.b, s.unit), any = !!(s.plot.l.trim() || s.plot.b.trim());
  const bad = !any ? undefined : l === null || b === null ? `Type each side from ${lo} to ${hi} ${unit}.` : l === undefined || b === undefined ? 'Type both sides.' : undefined;
  return { l: s.plot.l, b: s.plot.b, planned: { l: side(h.l + m.front + m.rear), b: side(h.b + 2 * m.side) }, own: h.plot.own, ...(bad ? { bad } : {}) };
}

/** Compare: each section that is on, and the total, at the five levels; the estimate's own level marked, and its own amount where it differs. */
function compareOf(e: ArchitectEstimate, runs: LevelRuns, sections: SectionView[]): CompareView {
  const cells = (ns: number[], at: number): CompareCell[] => ns.map((n, i) => ({ text: shortRupees(n), full: rupees(n), n, mine: i + 1 === at }));
  const differs = (now: number, ns: number[], at: number) => Math.abs(now - ns[at - 1]) >= 0.005;
  const rows = sections.filter((x) => x.on && (runs.sections[x.id] ?? []).some((n) => n > 0)).map((x) => {
    const ns = runs.sections[x.id], at = x.level ?? e.level;
    return { id: x.id, name: x.name, cells: cells(ns, at), ...(differs(x.n, ns, at) ? { yours: `Yours: Rs. ${x.amount}` } : {}) };
  });
  return { rows, totals: cells(runs.totals, e.level), ...(differs(e.total, runs.totals, e.level) ? { yours: `Yours: Rs. ${rupees(e.total)}` } : {}) };
}

/** "Bathrooms to Luxury: Rs. 6,71,648 more", and the items it brought in, up to three. */
function changeText(c: Change & { what: string }): ChangeView {
  const names = [...new Set(c.swaps.flatMap((x) => (x.to ? [x.to] : [])))];
  const by = Math.round(c.by) === 0 ? 'no change in the total' : `Rs. ${rupees(Math.abs(c.by))} ${c.by > 0 ? 'more' : 'less'}`;
  return { text: `${c.what}: ${by}`, n: c.by, items: names.length ? `${names.slice(0, 3).join(' · ')}${names.length > 3 ? ` · and ${names.length - 3} more` : ''}` : '' };
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
