/**
 * The planning estimate's page (E1, E3), apart from the page (as dscr/model.ts): the six answers to the engine's input
 * (engine/architect.ts), and its answer to words, with the engine's exact figures beside them for the Excel copy. Pure,
 * no DOM. Every figure comes from the engine: the estimate, the five levels (the strip and Compare), the change from the
 * package, what the last change did and the drawer's rates are each worked out twice there; this file only words, groups
 * and orders them. The rooms' own sizes, and a new house's plot (E5), are typed in the page's unit and passed on in metres;
 * a room's size word (R1) is passed on as it is, Medium left out. Rooms added or taken out (R2) move the rooms' own sizes,
 * words, levels and items with them.
 */
import {
  BATHS, BHKS, CITIES, FLOORS, LEVELS, PLOT_SIDE, R, ROOM_SIDE, SIZE_WORDS, bathsOf, bedroomsOf, billOf, WORK_KINDS, architect, architectNeeds, changeOf, choicesFor, levelName, levelRuns, overPackage, planRooms, wordName,
  type ArchitectEstimate, type ArchitectInput, type Bhk, type Change, type Choice, type House, type Level, type LevelRuns, type Line, type RoomKind, type SizeWord, type Stage, type WorkKind,
} from '../../../engine/architect';
import { CLASSES, ENTRIES, FT_PER_M, LIBRARY_DATE, NOTES, PER, SOURCE, SPEND_SAVE, SQFT_PER_SQM, type ItemKind, type Note, type Unit } from '../../../engine/library';
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
  /** A room's size word by its id (R1); Medium is left out. */
  roomWords: Record<string, SizeWord>;
  /** The bathrooms in order (R2), each the id of the bedroom it is attached to or null for a common one; absent, the programme's. */
  baths?: (string | null)[];
  /** The balcony taken out (R2): false; absent, the programme's. */
  balcony?: boolean;
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
  area: '', unit: 'sqft', sections: {}, sliders: {}, items: {}, brands: {}, height: '', rooms: {}, roomLevels: {}, roomWords: {}, plot: { l: '', b: '' }, sewer: false,
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
    ...(Object.keys(s.roomWords).length ? { roomWords: s.roomWords } : {}), ...(s.baths ? { baths: s.baths } : {}), ...(s.balcony === false ? { balcony: false } : {}),
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
/**
 * A room's size word (R1): Medium is the plan's own, so it is left out. A word puts a typed size aside, the planned size
 * back at that word, and the other planned rooms share what is left.
 */
export function withRoomWord(s: PlanState, id: string, word: SizeWord, name: string): PlanState {
  const roomWords = { ...s.roomWords }, rooms = { ...s.rooms }, typed = !!rooms[id];
  if (word === 'medium') delete roomWords[id]; else roomWords[id] = word;
  delete rooms[id];
  return noted(s, { ...s, roomWords, rooms }, `${name} to ${wordName(word)}${typed ? ', in place of your size' : ''}`);
}
// ---- Rooms added and taken out (R2) ----

const BHK_ORDER: Bhk[] = ['1RK', '1', '2', '3', '4', '5'];
const bhkLabel = (bhk: Bhk) => BHK_CHOICES.find((b) => b.value === bhk)?.label ?? bhk;
/** The bathrooms as the estimate has them: the user's, or the programme's. */
const bathList = (s: PlanState): (string | null)[] => s.baths ?? (s.bhk ? bathsOf(s.bhk) : []);
/**
 * The state with every record kept by a room's id moved by `move` (an id to its new id, or null to drop it): the sizes,
 * words and levels by room, the items and brands by line (`<room>:<family>:<rule>`), and the bathrooms' bedrooms.
 */
function moveRooms(s: PlanState, move: (id: string) => string | null): PlanState {
  const byRoom = <T>(r: Record<string, T>) => Object.fromEntries(Object.entries(r).flatMap(([id, x]) => { const to = move(id); return to ? [[to, x]] : []; })) as Record<string, T>;
  const byLine = <T>(r: Record<string, T>) => Object.fromEntries(Object.entries(r).flatMap(([key, x]) => {
    const at = key.indexOf(':'), to = move(key.slice(0, at));
    return to ? [[`${to}${key.slice(at)}`, x]] : [];
  })) as Record<string, T>;
  return {
    ...s, rooms: byRoom(s.rooms), roomLevels: byRoom(s.roomLevels), roomWords: byRoom(s.roomWords), items: byLine(s.items), brands: byLine(s.brands),
    ...(s.baths ? { baths: s.baths.map((of) => (of === null ? null : move(of))) } : {}),
  };
}
/** Moves the rooms of a kind up past the one taken out: bedroom-3 to bedroom-2 when bedroom-2 goes, which is dropped. */
const without = (kind: 'bedroom' | 'bath', k: number) => (id: string): string | null => {
  const m = id.match(kind === 'bedroom' ? /^bedroom-(\d+)$/ : /^bath-(\d+)$/);
  if (!m) return id;
  const j = Number(m[1]);
  return j === k ? null : j > k ? `${kind}-${j - 1}` : id;
};

/** The bathrooms kept only when they differ from the programme's, as Medium is left out (R1): so a new count of bedrooms brings its own. */
function canon(s: PlanState): PlanState {
  if (!s.baths || !s.bhk || JSON.stringify(s.baths) !== JSON.stringify(bathsOf(s.bhk))) return s;
  const { baths: _, ...rest } = s;
  return rest;
}
/** A new count of bedrooms, from the question or the buttons: a bathroom of one's own attached to a bedroom now gone becomes common. */
export function withBhk(s: PlanState, bhk: Bhk): PlanState {
  const was = canon(s), beds = new Set(bedroomsOf(bhk));
  return canon({ ...was, bhk, ...(was.baths ? { baths: was.baths.map((of) => (of !== null && beds.has(of) ? of : null)) } : {}) });
}
/** + Bedroom (R2): the next count of bedrooms; the rooms are planned again for it. */
export function withBedroomAdded(s: PlanState): PlanState {
  const i = BHK_ORDER.indexOf(s.bhk as Bhk);
  if (i < 0 || i === BHK_ORDER.length - 1) return s;
  return noted(s, withBhk(s, BHK_ORDER[i + 1]), `A bedroom added, now ${bhkLabel(BHK_ORDER[i + 1])}`);
}
/** × on a bedroom (R2): one bedroom fewer, the later ones moving up with their own sizes, words, levels and items; a 1 BHK becomes a 1 RK. */
export function withBedroomTakenOut(s: PlanState, id: string, name: string): PlanState {
  const i = BHK_ORDER.indexOf(s.bhk as Bhk), k = Number(id.replace('bedroom-', ''));
  if (i <= 0 || !(k >= 1)) return s;
  return noted(s, withBhk(moveRooms(s, without('bedroom', k)), BHK_ORDER[i - 1]), `${name} taken out, now ${bhkLabel(BHK_ORDER[i - 1])}`);
}
/** + Bathroom (R2): a common bathroom more; the other rooms share what is left. */
export function withBathAdded(s: PlanState): PlanState {
  const baths = bathList(s);
  return baths.length >= BATHS.max ? s : noted(s, canon({ ...s, baths: [...baths, null] }), 'A bathroom added');
}
/** × on a bathroom (R2): the later ones move up with their own sizes, words, levels and items; one is always kept. */
export function withBathTakenOut(s: PlanState, id: string, name: string): PlanState {
  const baths = bathList(s), k = Number(id.replace('bath-', ''));
  if (baths.length <= BATHS.min || !(k >= 1 && k <= baths.length)) return s;
  return noted(s, canon({ ...moveRooms(s, without('bath', k)), baths: baths.filter((_, i) => i !== k - 1) }), `${name} taken out`);
}
/**
 * Attached bathroom on a bedroom (R2): on, the first common bathroom opens into the bedroom instead, or a new one is added
 * attached to it when none is common; off, its bathroom becomes common.
 */
export function withAttached(s: PlanState, bedroom: string, on: boolean, name: string): PlanState {
  const baths = [...bathList(s)], at = baths.indexOf(on ? null : bedroom);
  if (on === baths.includes(bedroom)) return s;
  if (!on) { baths[at] = null; return noted(s, canon({ ...s, baths }), `${name}'s bathroom made common`); }
  if (at < 0 && baths.length >= BATHS.max) return s;
  if (at >= 0) baths[at] = bedroom; else baths.push(bedroom);
  return noted(s, canon({ ...s, baths }), at >= 0 ? `${baths.length > 1 ? `Bathroom ${at + 1}` : 'The bathroom'} attached to ${name}` : `A bathroom added, attached to ${name}`);
}
/** × on the balcony, or + Balcony to put it back (R2). */
export function withBalcony(s: PlanState, on: boolean): PlanState {
  const { balcony: _, ...rest } = s;
  return noted(s, on ? rest : { ...s, balcony: false }, on ? 'The balcony put back' : 'The balcony taken out');
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
  /** The level whose item the line takes, for the drawer's first choices (L1). */
  at: Level;
  qty: string; unit: string; rate: string; amount: string; n: { qty: number; rate: number; amount: number };
  kind: string; how: string; rateHow: string[]; sources: SourceView[]; note?: string; /** The day its rate was read on its page (E2). */ checked?: string;
  /** What the item is, why it costs what it does and what to check (T1), when its family has notes. */
  why?: WhyView;
}
/**
 * A line's or a section's Why? (T1, D-UX-34): notes in plain words, each under its label, shown only when tapped; their
 * sources in order of first use, our own rule said apart, and whether a note is still as reported.
 */
export interface WhyView { items: { label: string; text: string }[]; sources: { id: string; what: string; url: string }[]; own: boolean; reported: boolean }
export interface SectionView {
  id: string; no: number; name: string; on: boolean; slider: boolean; level: Level | null; levelName: string;
  amount: string; n: number; over?: { text: string; n: number };
  /** The section's amount in the package at the estimate's level: the list's order, steady while a slider moves (V1). */
  pkg: number;
  /** The section's main items at this level, in one line, and where they go. */
  spec: string; where: string;
  /** Lines with an item of the user's own, and lines at a room's own level; "Mixed (…)" when either is not nil. */
  mixed: number; mixedText: string; lines: LineView[];
  /** Where to spend, where to save (T1), when the section has a rule, on or off. */
  why?: WhyView;
  /** A brand can show in it, on a line or among the choices in its drawers: the brand notice goes with its items (D-BIZ-03). */
  brands: boolean;
}
export interface StripView { level: Level; name: string; total: string; full: string; n: number; current: boolean }
export interface BarView { id: string; name: string; amount: string; n: number; width: number }
export interface AssumedView { what: string; shown: string; why: string; sources: SourceView[] }
/** A room in the list (A8): its size and area now, its sides as typed and as planned, its own level. */
export interface RoomView {
  id: string; name: string; size: string; area: string; typed: boolean; level: Level | null;
  /** The room's size word, its buttons' choice (none checked while the size is typed); null for the passage and the balcony. */
  word: SizeWord | null;
  /** The Code's minimum when the room is below it: flagged, never changed. */
  below?: string;
  /** R2: whether it can be taken out (a bedroom but a 1 RK's room, a bathroom but the last, the balcony); for a bedroom, whether a bathroom is attached to it. */
  out: boolean; bedroom: boolean; attached: boolean;
  /** The sides as typed (empty when not), and the planned ones for the fields' placeholders, in the page's unit. */
  l: string; b: string; planned: { l: string; b: string };
  /** Why a typed size is not used yet, or nothing. */
  bad?: string;
}
/** A part of the carpet area in the bar of shares (R1): its share in words, and its width on the bar out of 100. */
export interface ShareView { id: string; name: string; kind: RoomKind | 'walls'; share: string; width: number }
/** The size words for the buttons, in order. */
export const WORD_CHOICES: { value: SizeWord; label: string }[] = SIZE_WORDS.map((w) => ({ value: w.id, label: w.name }));
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
  /** The bar of shares: each room's, the passage's and the inside walls' share of the carpet area (R1). */
  shares: ShareView[];
  /** The rooms that can be added (R2): a bedroom up to 5, a bathroom up to the limit, the balcony when taken out. */
  add: { bedroom: boolean; bath: boolean; balcony: boolean };
  /** A new house's stages, adding up to the total, and its plot. */
  stages?: StageView[]; plot?: PlotView;
  /** Fixed works, movable items and appliances, when there is more than fixed works. */
  split?: { label: string; amount: string; n: number }[];
  /** What to check (V1): the flags that can change the decision, shown with the answer, and the rest, one tap away; each largest first. */
  assumed: AssumedView[]; flags: string[]; notes: string[]; unpriced: string[];
  /** One line by the total: a planning estimate, its rates as reported on their date for the city, and how many lines were checked against their pages (E2). */
  ratesLine: string; ratesDate: string;
  /** One line under the total (L1): the chosen level's range, from the cheapest priced choice at it in every item to the dearest; empty with no items. */
  range: { text: string; low: number; high: number; lines: number; of: number };
  /** Every source the lines and the assumptions use, numbered in order of first use, and what each class means; on the page only. */
  sources: SourceView[]; classes: { id: string; means: string }[];
  /** The bill of quantities for quotes (E4a): each item once with its rooms and summed quantity; no rate or amount of ours. */
  bill: BillView[];
}
export interface BillView { no: number; name: string; lines: { no: string; item: string; where: string; qty: string; unit: string; n: { qty: number } }[] }
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
      amount: rupees(t.amount), n: t.amount, pkg: runs.sections[t.id]?.[e.level - 1] ?? t.amount,
      ...(Math.round(d) !== 0 ? { over: { text: `Rs. ${rupees(Math.abs(d))} ${d > 0 ? 'more' : 'less'} than ${pkg}`, n: d } } : {}),
      spec: specOf(ls), where: whereOf(ls, e), mixed: chosen + roomLevel, mixedText: mixedText ? `Mixed (${mixedText})` : '', lines,
      ...(SECTION_WHY.has(t.id) ? { why: SECTION_WHY.get(t.id) } : {}),
      brands: ls.some((l) => l.brands.length > 0 || BRANDED.has(l.family)),
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
  const roomsNote = e.flags.find((f) => f.text.startsWith('With your sizes'))?.text;
  return {
    rooms: roomsOf(s, e), ...(roomsNote ? { roomsNote } : {}), shares: sharesOf(e),
    add: { bedroom: e.bhk !== '5', bath: e.rooms.filter((r) => r.kind === 'bath').length < BATHS.max, balcony: R.programmes[e.bhk].balcony > 0 && s.balcony === false }, compare: compareOf(e, runs, sections), ...(change ? { change: changeText(change) } : {}),
    ...(e.stages ? { stages: stageViews(e.stages) } : {}), ...(e.house ? { plot: plotView(s, e.house) } : {}),
    // Each answer kept on one line (no-break spaces inside it), so a phone wraps only between answers.
    summary: [kind, home, city, s.unit === 'sqm' ? `${qtyText(sqm)} sq m` : `${qtyText(sqft)} sq ft`, bhk, pkg].map((x) => x.replace(/ /g, '\u00a0')).join(' · '),
    title: TITLE[e.kind], kind, home, city, area, bhk, level: pkg, areaName: e.per === 'built-up' ? 'Built-up area' : 'Carpet area',
    total: rupees(e.total), perSqft: rupees(e.perSqft), words: rupeesWords(e.total), n: { total: e.total, perSqft: e.perSqft },
    strip: levels.map((n, i) => ({ level: (i + 1) as Level, name: LEVEL_NAMES[i], total: shortRupees(n), full: rupees(n), n, current: i + 1 === e.level })),
    bar, sections, ...(split ? { split } : {}), assumed, flags: e.flags.filter((f) => f.decides).map((f) => f.text), notes: e.flags.filter((f) => !f.decides).map((f) => f.text),
    unpriced: e.unpriced.map((u) => `${u.roomName}, ${u.name.toLowerCase()}: ${u.entryName}`),
    ratesLine: `A planning estimate: rates as reported on ${dmy(e.ratesDate)} for ${listed ? city : 'another place, at the six cities’ average'}; ${e.lines.filter((l) => l.checked).length} of ${e.lines.length} lines checked against their pages`,
    range: rangeOf(e, runs), bill: billView(s, e),
    ratesDate: dmy(LIBRARY_DATE), sources: [...numbered.values()],
    classes: Object.entries(CLASSES).filter(([id]) => [...numbered.values()].some((x) => x.cls === id)).map(([id, means]) => ({ id, means })),
  };
}

/**
 * The chosen level's range in one line (L1): the package at that level, from the cheapest priced choice at it in every item to
 * the dearest, and how many items offer more than one; "as a package" when the estimate is not the package. Empty when no
 * section is on.
 */
function rangeOf(e: ArchitectEstimate, runs: LevelRuns): PlanView['range'] {
  const r = runs.range, name = levelName(e.level), items = (n: number) => `${n} item${n === 1 ? '' : 's'}`;
  const at = `At ${name}${Math.abs(e.total - runs.totals[e.level - 1]) >= 0.005 ? ' as a package' : ''}`;
  const text = !r.of ? '' : r.lines
    ? `${at}, the choices run from Rs. ${rupees(r.low)} to Rs. ${rupees(r.high)}: the cheapest in each item to the dearest. ${r.lines} of the ${items(r.of)} offer a choice.`
    : `${at}, each of the ${items(r.of)} has one choice.`;
  return { text, low: r.low, high: r.high, lines: r.lines, of: r.of };
}

/** The rooms as planned or sized, in the page's unit, each with its own level. */
function roomsOf(s: PlanState, e: ArchitectEstimate): RoomView[] {
  const ft = s.unit !== 'sqm', side = (m: number) => qtyText(ft ? m * FT_PER_M : m), unit = sideUnit(s.unit);
  const planned = new Map(planRooms(e.bhk, e.carpetSqm, s.roomWords, { baths: s.baths, balcony: s.balcony }).map((r) => [r.id, r]));
  const baths = e.rooms.filter((r) => r.kind === 'bath').length;
  const [lo, hi] = sideRange(s.unit);
  return e.rooms.map((r) => {
    const typed = s.rooms[r.id] ?? { l: '', b: '' }, p = planned.get(r.id) ?? r;
    const l = sideOf(typed.l, s.unit), b = sideOf(typed.b, s.unit), any = !!(typed.l.trim() || typed.b.trim());
    const bad = !any ? undefined : l === null || b === null ? `Type each side from ${lo} to ${hi} ${unit}.` : l === undefined || b === undefined ? 'Type both sides.' : undefined;
    return {
      id: r.id, name: r.name, size: `${side(r.l)} × ${side(r.b)} ${unit}`, area: ft ? `${inr(Math.round(r.sqm * SQFT_PER_SQM))} sq ft` : `${qtyText(r.sqm)} sq m`,
      typed: r.typed, level: r.level, word: r.word, l: typed.l, b: typed.b, planned: { l: side(p.l), b: side(p.b) }, ...(bad ? { bad } : {}),
      out: r.kind === 'bedroom' ? e.bhk !== '1RK' : r.kind === 'bath' ? baths > 1 : r.kind === 'balcony', bedroom: r.kind === 'bedroom',
      attached: r.kind === 'bedroom' && e.rooms.some((x) => x.of === r.id),
      ...(e.below[r.id] ? { below: `Below the Code's ${e.below[r.id]} sq m (${inr(Math.round(e.below[r.id] * SQFT_PER_SQM))} sq ft) for this room.` } : {}),
    };
  });
}

/** The bar of shares: each part's share of the carpet area in whole per cent, and its width, the bar kept to 100 when sizes typed overrun it. */
function sharesOf(e: ArchitectEstimate): ShareView[] {
  const sum = e.shares.reduce((t, x) => t + x.share, 0), full = Math.max(1, sum);
  return e.shares.map((x) => ({ id: x.id, name: x.name, kind: x.kind, share: `${Math.round(x.share * 100)}%`, width: (x.share / full) * 100 }));
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

/** "Bathrooms to Luxury: Rs. 6,71,648 more", and the items it brought in, up to three; any it brought in without a rate yet. */
function changeText(c: Change & { what: string }): ChangeView {
  const names = [...new Set(c.swaps.flatMap((x) => (x.to ? [x.to] : [])))];
  const by = Math.round(c.by) === 0 ? 'no change in the total' : `Rs. ${rupees(Math.abs(c.by))} ${c.by > 0 ? 'more' : 'less'}`;
  const others = c.others === undefined ? '' : `the other rooms ${+(Math.abs(c.others) * 100).toFixed(1)}% ${c.others < 0 ? 'smaller' : 'larger'} · `;
  const still = !c.unpriced?.length ? '' : c.unpriced.length === 1 ? `; the ${c.unpriced[0].toLowerCase()} is still to be priced` : `; ${c.unpriced.length} lines are still to be priced`;
  return { text: `${c.what}: ${others}${by}${still}`, n: c.by, items: names.length ? `${names.slice(0, 3).join(' · ')}${names.length > 3 ? ` · and ${names.length - 3} more` : ''}` : '' };
}

/** The bill's lines in words (E4a): the item and its specification, its brands or the one chosen, then where it goes. */
function billView(s: PlanState, e: ArchitectEstimate): BillView[] {
  return billOf(e, s.brands).map((x, i) => ({
    no: i + 1, name: x.name,
    lines: x.lines.map((l, j) => ({
      // The specification alone where it starts by naming the item ("Deep cleaning. Deep cleaning of the whole home …").
      no: `${i + 1}.${j + 1}`, item: [l.spec.toLowerCase().startsWith(l.item.split(',')[0].toLowerCase()) ? '' : l.item, l.spec, l.brand ? `Brand: ${l.brand}` : l.brands.length ? `${l.brands.join(', ')} or equivalent` : ''].filter(Boolean).join('. '),
      where: l.rooms.join(', '), qty: lineQty(l.qty, l.unit), unit: unitText(l.unit), n: { qty: l.qty },
    })),
  }));
}

/** The families with an item that names a brand: their drawers show brands, whatever the line's own item (D-BIZ-03). */
const BRANDED = new Set([...ENTRIES.values()].filter((x) => x.brands?.length).map((x) => x.family));

function lineView(s: PlanState, l: Line, no: string, sourceOf: (id: string) => SourceView): LineView {
  const chosen = s.brands[l.key] && l.brands.includes(s.brands[l.key]) ? s.brands[l.key] : undefined;
  const brands = chosen ? `Brand: ${chosen}` : l.brands.length ? `${l.brands.join(', ')} or equivalent` : '';
  return {
    key: l.key, no, room: l.roomName, name: l.name, entry: l.entry, item: l.entryName, spec: l.spec, brands, ...(chosen ? { brand: chosen } : {}),
    level: l.level ? levelName(l.level) : '', chosen: l.chosen, at: l.at,
    qty: lineQty(l.qty, l.unit), unit: unitText(l.unit), rate: rateText(l.rate), amount: rupees(l.amount), n: { qty: l.qty, rate: l.rate, amount: l.amount },
    kind: KIND_WORD[l.kind], how: l.how, rateHow: l.rateHow, sources: l.sources.filter((x) => x !== 'own').map(sourceOf), ...(l.note ? { note: l.note } : {}), ...(l.checked ? { checked: l.checked } : {}),
    ...(FAMILY_WHY.has(l.family) ? { why: FAMILY_WHY.get(l.family) } : {}),
  };
}

/** Whether a line's rate was read on its pages (E2), with the day. */
export function checkedLine(l: LineView): string {
  return l.checked ? `Checked against ${l.sources.length === 1 ? 'its page' : 'their pages'} on ${dmy(l.checked)}.` : 'As reported, not yet checked.';
}

/** The notes behind a Why?, each under its label (T1); their sources apart from our own rule, in order of first use. */
function whyOf(items: { label: string; note: Note }[]): WhyView {
  const ids = [...new Set(items.flatMap((x) => x.note.src))];
  return {
    items: items.map((x) => ({ label: x.label, text: x.note.text })),
    sources: ids.filter((id) => id !== 'own').map((id) => ({ id, what: SOURCE[id]?.what ?? id, url: SOURCE[id]?.url ?? '' })),
    own: ids.includes('own'), reported: items.some((x) => x.note.status === 'reported'),
  };
}
const NOTE_LABELS = [['what', 'What it is'], ['cost', 'Why it costs what it does'], ['check', 'What to check']] as const;
const FAMILY_WHY = new Map([...NOTES].map(([id, n]) => [id, whyOf(NOTE_LABELS.map(([k, label]) => ({ label, note: n[k] })))]));
const SECTION_WHY = new Map([...new Set(SPEND_SAVE.map((r) => r.section))].map((id) => [id, whyOf(SPEND_SAVE.filter((r) => r.section === id)
  .map((r) => ({ label: `${r.way === 'spend' ? 'Spend' : 'Save'} ${r.on ? `on ${r.on}` : 'here'}`, note: r })))]));

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
  id: string; name: string; spec: string; brands: string[]; rate: string; usable: boolean; current: boolean;
  /** "every level" for an item a family has at every level; "the level’s item" for the item its level names among others; else empty. */
  mark: string;
}
/** The choices at a level (L1), or the family's items at no level (`level` null). */
export interface ChoiceGroup { level: Level | null; title: string; open: boolean; choices: RungView[] }
export interface DrawerView {
  key: string; fixed: boolean;
  /**
   * The choices at the line's level first, "At Luxury: 6 choices", then each other level's, cheapest level first, and the
   * family's items at no level last; each item once. A group holding the line's item is open.
   */
  groups: ChoiceGroup[];
  how: { quantity: string; rate: string[]; amount: string };
}

/** The drawer for one line of the estimate: the choices at its level and at the others (L1), and how it was worked out. */
export function drawerView(s: PlanState, v: PlanView, key: string): DrawerView | undefined {
  const line = v.sections.flatMap((x) => x.lines).find((l) => l.key === key);
  const c = line && choicesFor(inputOf(s), key);
  if (!line || !c) return undefined;
  const named = (lv: Level) => (c.fixed ? c.ladder[0] : c.ladder[lv - 1])?.id;
  const shown = new Set<string>(), groups: ChoiceGroup[] = [];
  const group = (level: Level | null, xs: Choice[]) => {
    const fresh = xs.filter((x) => !shown.has(x.id));
    if (!fresh.length) return;
    for (const x of fresh) shown.add(x.id);
    const n = `${fresh.length} choice${fresh.length === 1 ? '' : 's'}`;
    const title = level === null ? `Also in the library: ${n}` : `At ${LEVEL_NAMES[level - 1]}${level === s.level && level !== line.at ? ' (the package)' : ''}: ${n}`;
    groups.push({
      level, title, open: !groups.length || fresh.some((x) => x.id === line.entry),
      choices: fresh.map((x) => ({
        id: x.id, name: x.name, spec: x.spec, brands: x.brands, rate: x.rate === null ? 'No rate yet' : rateWords(x.rate, x.unit),
        usable: x.rate !== null, current: x.id === line.entry,
        mark: level === null || x.id !== named(level) ? '' : c.fixed ? 'every level' : fresh.length > 1 ? 'the level’s item' : '',
      })),
    });
  };
  for (const lv of [line.at, ...([1, 2, 3, 4, 5] as Level[]).filter((x) => x !== line.at)]) group(lv, c.levels[lv - 1]);
  group(null, c.others);
  return {
    key, fixed: c.fixed, groups,
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
