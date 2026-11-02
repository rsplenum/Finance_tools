/**
 * The planning estimate's answers as the page keeps them (UXR7): the state, the six questions' choices, the engine's input
 * and what is still needed, and every change the page makes. Only the rules (engine/architect-rules.ts), never the library
 * or the working, so the page can ask its questions while plan-model.ts, the estimate in words, loads after them
 * (plan-work.ts). plan-model.ts re-exports all of it. Pure, no DOM.
 */
import { ALL_ANSWERED, questionsLeft } from '../verdict';
import {
  BATHS, BHKS, CITIES, EXTRAS, FLOORS, FLOORS_ADDED, LEVELS, PLOT_SIDE, R, ROOM_SIDE, SIZE_WORDS, bathsOf, bedroomsOf, WORK_KINDS, PARTS, architectNeeds, builds, wordName,
} from '../../../engine/architect-rules';
import type { ArchitectInput, Bhk, ExtraKind, Level, Part, SizeWord, WorkKind } from '../../../engine/architect';
import { parseAmount } from '../../../engine/parse';
import { inr } from '../../../engine/util';
import type { ChoiceGroup, LineView, PlanPreview } from './plan-model';
export type Home = 'flat' | 'house';
export type AreaUnit = 'sqft' | 'sqm';
/** What only the document needs, asked beside the download. */
export interface PlanFacts { owner: string; property: string; lender: string; preparedBy: string }
export interface PlanState {
  kind?: WorkKind; home?: Home;
  /** One part of a renovation on its own (D-UX-276): the kitchen, the bathrooms or the painting. */
  part?: Part;
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
  /** The rooms added (R2b), in the buttons' order; absent, none. */
  extras?: ExtraKind[];
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
  { value: 'extend', label: WORK_KINDS.extend.label, hint: 'One or two floors on your house: the structure, the stair and tank carried up, and every finish inside' },
  { value: 'renovate', label: WORK_KINDS.renovate.label, hint: 'Floors, walls, bathrooms, kitchen, doors, wiring and plumbing renewed' },
  { value: 'interiors', label: WORK_KINDS.interiors.label, hint: 'Wardrobes, kitchen, ceilings, lights, paint and appliances in a finished home' },
];
/** The parts a renovation can be asked for on its own, under the first question (D-UX-276). */
export const PART_CHOICES: { value: Part; label: string }[] = PARTS.map((x) => ({ value: x.id, label: x.label }));
export const HOME_CHOICES: { value: Home; label: string; hint?: string }[] = [
  { value: 'flat', label: 'Flat' },
  { value: 'house', label: 'House', hint: 'The rooms inside, worked out as for a flat' },
];
export const FLOOR_CHOICES = FLOORS.map((f) => ({ value: String(f.n), label: f.label, hint: f.n === 1 ? 'One storey' : `${f.n} storeys` }));
/** An extension's floors (E5b), asked in the same place. */
export { builds };
export const ADDED_CHOICES = FLOORS_ADDED.map((f) => ({ value: String(f.n), label: f.label, hint: 'On top of the house' }));
/** The second question for a kind that builds floors: its words and choices. */
export const floorsQuestion = (kind?: WorkKind) => (kind === 'extend' ? { legend: 'How many floors are you adding?', options: ADDED_CHOICES } : { legend: 'How many floors?', options: FLOOR_CHOICES });
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
  const area = plainOf(s.area), h = heightOf(s.height), rooms = roomSizes(s), plot = s.kind === 'build' ? plotOf(s) : undefined, floors = builds(s.kind) && s.floors;
  return {
    kind: s.kind, ...(s.kind === 'renovate' && s.part ? { part: s.part } : {}), property: builds(s.kind) ? 'house' : s.home, ...(floors ? { floors } : {}),
    city: s.city, ...(typeof area === 'number' ? { area } : {}), areaUnit: s.unit, bhk: s.bhk, level: s.level,
    sections: s.sections, sliders: s.sliders, items: s.items, ...(typeof h === 'number' ? { heightM: h } : {}),
    ...(Object.keys(rooms).length ? { rooms } : {}), ...(Object.keys(s.roomLevels).length ? { roomLevels: s.roomLevels } : {}),
    ...(Object.keys(s.roomWords).length ? { roomWords: s.roomWords } : {}), ...(s.baths ? { baths: s.baths } : {}), ...(s.balcony === false ? { balcony: false } : {}),
    ...(s.extras?.length ? { extras: s.extras } : {}), ...(plot ? { plot } : {}), ...(s.kind === 'build' && s.sewer ? { sewer: true } : {}),
  };
}

/** What is still needed, in the order asked. A new house's floors come from the engine; the others ask flat or house. */
export function planNeeds(s: PlanState): string[] {
  const needs = architectNeeds(inputOf(s));
  if (!s.home && !builds(s.kind)) needs.splice(s.kind ? 0 : 1, 0, 'Flat or house');
  return needs;
}
/** The area question's words, by the kind (A3). */
export const areaLabel = (kind?: WorkKind) => (kind === 'extend' ? 'Built-up area being added' : kind === 'build' ? 'Built-up area of all floors' : 'Carpet area, the floor inside the walls');

/** A quantity to two places, without trailing zeros: 12.5, 40. */
export const qtyText = (n: number) => inr(n, 2).replace(/\.?0+$/, '');

// ---- Changes, as the page makes them ----

export const same = (a: ArchitectInput, b: ArchitectInput) => JSON.stringify(a) === JSON.stringify(b);
/** The state after a change to the estimate, the change noted for What changed; one that leaves the input as it was keeps the last. */
function noted(s: PlanState, next: PlanState, what: string): PlanState {
  const before = inputOf(s), after = inputOf(next);
  return { ...next, change: same(before, after) ? s.change : { what, before, after } };
}
const sectionName = (id: string) => R.sections.find((x) => x.id === id)?.name ?? id;

/** A new kind: its own sections on (D-UX-19); the sliders and items stay. A whole kind leaves a part. */
export const withKind = (s: PlanState, kind: WorkKind): PlanState => ({ ...s, kind, part: undefined, sections: {}, ...(kind === 'extend' && (s.floors ?? 0) > FLOORS_ADDED.length ? { floors: undefined } : {}) });
/** One part on its own (D-UX-276): a renovation, with the part's own sections on. */
export const withPart = (s: PlanState, part: Part): PlanState => ({ ...s, kind: 'renovate', part, sections: {} });
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
/**
 * + Pooja room, + Study, + Utility or + Store room (R2b), or its × to take it out: the other rooms share the area again,
 * and what was kept by the room's id (its size, word, level and items) goes with it.
 */
export function withExtra(s: PlanState, kind: ExtraKind, on: boolean): PlanState {
  const now = s.extras ?? [], name = R.extras.find((x) => x.kind === kind)?.name ?? kind;
  if (on === now.includes(kind)) return s;
  const extras = on ? EXTRAS.filter((k) => k === kind || now.includes(k)) : now.filter((k) => k !== kind);
  const { extras: _, ...rest } = on ? s : moveRooms(s, (id) => (id === kind ? null : id));
  return noted(s, extras.length ? { ...rest, extras } : rest, on ? `${name} added` : `${name} taken out`);
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

/** A date as the page writes it: 31-10-2026. */
export const dmy = (iso: string) => iso.split('-').reverse().join('-');

export const WORD_CHOICES: { value: SizeWord; label: string }[] = SIZE_WORDS.map((w) => ({ value: w.id, label: w.name }));

export function checkedLine(l: LineView): string {
  return l.checked ? `Verified at ${l.sources.length === 1 ? 'its page' : 'their pages'} on ${dmy(l.checked)}.` : 'Needs review: as reported, not confirmed.';
}

/** "All questions answered", or "2 questions left". */
export const statusText = (p: PlanPreview, more: string[] = []) =>
  p.blocked ? 'No figures' : p.needs.length + more.length ? questionsLeft(p.needs.length + more.length) : ALL_ANSWERED;

/** A drawer group's key in the page's record of the groups opened or closed by a tap. */
export const groupKey = (key: string, g: ChoiceGroup) => `${key}:${g.level ?? 'other'}`;

/** The ceiling height the estimate uses, for the assumption's field. */
export const RULE_HEIGHT = R.height.m;
