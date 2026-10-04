/**
 * The engine as the architect (D-UX-18). From six answers (the work, flat or house or the floors, city, area, bedrooms,
 * level) it plans the rooms, places the doors and windows, measures every surface by the IS 1200 rules, puts in what each
 * room needs at each level from the library, prices it for the city, and adds it up by section, by room and at all five
 * levels. For a new house it first draws the outline from the built-up area and the floors, takes the outer walls and the
 * stairs off it for the rooms, and adds the structure (rules of thumb a sq ft), the terrace, the outside walls, the stairs
 * with the cabin over the one to the terrace (D-UX-23), the outside works round the plot and the water, and splits the cost
 * into the stages a construction loan pays by (E5). A room can take the user's own size and its own level (E3): the size
 * replaces the planned one, and the level stands above the section's slider for every line in the room. A room's size word
 * (R1) moves it along its reported range, and the planned rooms share the area by those sizes. The bathrooms can be more or
 * fewer than the programme's, each common or attached to a bedroom, and the balcony can be taken out (R2). A level is a band
 * of choices (L1): a line can take the item its family names at that level or any other the library puts there, and the
 * package's range runs from the cheapest priced choice at the level in every line to the dearest.
 * Pure, no DOM. Every rule is in engine/data/architect.json with its source or reason, and every rate in
 * engine/data/library/ with its source. architect-check.ts works every figure a second way; nothing is returned unless
 * both agree.
 */
import RULES from './data/architect.json';
import { CFT_PER_CUM, choices, ENTRIES, FAMILIES, FT_PER_M, LIBRARY_DATE, LIBRARY_STATUS, ladder, per, price, SQFT_PER_SQM, type Entry, type Family, type ItemKind, type Unit } from './library';
import { inr } from './util';
import { architectCheck, checkRate, type ArchitectCheck } from './architect-check';
import type { Blocked, Needs } from './dscr';

export type WorkKind = 'build' | 'renovate' | 'interiors';
export type Bhk = '1RK' | '1' | '2' | '3' | '4' | '5';
export type Level = 1 | 2 | 3 | 4 | 5;
export type RoomKind = 'living' | 'bedroom' | 'kitchen' | 'bath' | 'passage' | 'balcony';
/** A room's size by a word (R1): where it sits on the room's reported range. */
export type SizeWord = 'compact' | 'medium' | 'above' | 'spacious';
export type OpeningType = 'main' | 'bedroom' | 'bath' | 'kitchen' | 'balcony' | 'window' | 'kitchenWindow' | 'ventilator';

interface Sourced { src: string[]; why: string }
interface Valued extends Sourced { value: number }
export interface Slot { family: string; section: string; qty: string; kinds?: WorkKind[]; needs?: string; name?: string; maxLevel?: number }
/** A room of a programme, with its reported range of sizes in sq ft: its size word puts it along the range (R1). */
interface ProgrammeRoom { kind: RoomKind; name: string; range: [number, number]; master?: boolean; attached?: boolean }
export interface Programme extends Sourced { rooms: ProgrammeRoom[]; balcony: number; typical: [number, number] | null }
type Size = { w: number; h: number; sill?: number } & Sourced;
export interface Rules {
  title: string; date: string; status: string;
  levels: { n: Level; name: string; owner: string; means: string }[];
  /** A section with `kinds` is shown only for those kinds of work. */
  sections: { id: string; name: string; slider: boolean; kinds?: WorkKind[] }[];
  kinds: Record<WorkKind, { label: string; on: string[]; why: string }>;
  programmes: Record<Bhk, Programme>;
  bathrooms: { rule: string } & Sourced;
  shares: { passage: Valued; walls: Valued };
  /** The size words, each a point along a room's range: 0 its bottom, 1 its top (R1). */
  sizes: { words: { id: SizeWord; name: string; at: number }[] } & Sourced;
  aspect: Record<RoomKind, number> & Sourced;
  height: { m: number } & Sourced;
  minimums: { habitable: number; kitchen: number; bath: number } & Sourced;
  openings: Record<OpeningType, Size> & { windowShare: Valued; walls: { internal: number; external: number } & Sourced };
  is1200: { noDeduction: number; oneFace: number } & Sourced;
  skirting: { m: number } & Sourced;
  tileHeights: { mm: (number | 'ceiling')[]; existing: number } & Sourced;
  waterproofing: { upturn: number; showerWidth: number; showerHeight: number; balconyUpturn: number } & Sourced;
  showerScreen: { w: number; h: number } & Sourced;
  kitchen: { layout: string; depth: number; dado: number } & Sourced;
  wardrobes: { mainWidth: number; otherWidth: number; clearance: number; height: number; loft: number; fullHeightFrom: number; units: Record<string, { w: number; h: number; from: number; room: RoomKind }> } & Sourced;
  falseCeiling: { byLevel: { rooms: string[]; cover: 'none' | 'border' | 'full' }[]; border: number; coveInset: number } & Sourced;
  feature: { living: number; master: number } & Sourced;
  points: Record<RoomKind, Partial<Record<'lights' | 'fans' | 'sockets' | 'power' | 'ac' | 'tv' | 'exhaust' | 'masterExtra', number>>> & Sourced;
  plumbing: Record<'bath' | 'kitchen' | 'balcony', { supply: number; drain: number }> & Sourced;
  ac: { from: number; allBedroomsFrom: number } & Sourced;
  debris: { sqftPerLot: number } & Sourced;
  makingGood: { share: number } & Sourced;
  cities: { list: { id: string; name: string; cost: [number, number] }[]; range: { for: string; upTo: number } & Sourced } & Sourced;
  gst: { pct: number } & Sourced;
  checks: { paintRatio: [number, number] } & Sourced;
  quote: { farOut: number } & Sourced;
  house: {
    shape: { aspect: number } & Sourced; slab: { m: number } & Sourced; parapet: { m: number } & Sourced; terraceUpturn: { m: number } & Sourced;
    stair: { w: number; l: number; going: number; gap: number; flight: number; treads: number; landing: number } & Sourced;
    cabin: { h: number } & Sourced;
    thumb: { cement: number; steel: number; sand: number; aggregate: number; bricks: number } & Sourced;
    plot: { front: number; rear: number; side: number } & Sourced;
    outside: { wall: number; gate: { w: number; h: number } } & Sourced;
    water: {
      persons: { by: Record<Bhk, number>; lpcd: number } & Sourced; sump: { days: number; step: number } & Sourced;
      tank: { days: number; sizes: number[] } & Sourced; septic: { litres: Record<Bhk, number> } & Sourced; rwh: Sourced;
    };
    stages: { shares: Record<'foundation' | 'frame' | 'walls', [number, number]>; list: { id: string; name: string; what: string }[] } & Sourced;
  };
  templates: Record<'flat' | RoomKind, Slot[]>;
}
export const R = RULES as unknown as Rules;
export const LEVELS = R.levels;
export const SECTIONS = R.sections;
export const WORK_KINDS = R.kinds;
export const CITIES = R.cities.list;
/** The four size words, in order (R1). */
export const SIZE_WORDS = R.sizes.words;
const WORD_AT = new Map(R.sizes.words.map((w) => [w.id, w.at]));
export const BHKS: { id: Bhk; label: string }[] = [
  { id: '1RK', label: '1 RK' }, { id: '1', label: '1 BHK' }, { id: '2', label: '2 BHK' }, { id: '3', label: '3 BHK' }, { id: '4', label: '4 BHK' }, { id: '5', label: '5 BHK' },
];
/** A new house's floors (A3): the ground floor only, or up to three more. */
export const FLOORS: { n: number; label: string }[] = [{ n: 1, label: 'Ground only' }, { n: 2, label: 'G+1' }, { n: 3, label: 'G+2' }, { n: 4, label: 'G+3' }];

export interface ArchitectInput {
  kind?: WorkKind;
  property?: 'flat' | 'house';
  /** For a new house: its floors, 1 (the ground floor only) to 4 (G+3). */
  floors?: number;
  /** A city's id from the list, or 'other'. */
  city?: string;
  /** The carpet area, or for a new house the built-up area of all floors, in `areaUnit` (sq ft unless said). */
  area?: number;
  areaUnit?: 'sqft' | 'sqm';
  bhk?: Bhk;
  level?: Level;
  /** Sections switched on or off against the kind's own list. */
  sections?: Record<string, boolean>;
  /** A section's own level (its slider), against the package level. */
  sliders?: Record<string, Level>;
  /** A line's own item, by the line's key: the user's choice of brand or quality. */
  items?: Record<string, string>;
  /** The ceiling height in metres, against the rule's. */
  heightM?: number;
  /** A room's own size, by the room's id (living, bedroom-2, bath-1…): its two sides in metres, the longer one its length. */
  rooms?: Record<string, { l: number; b: number }>;
  /** A room's own level, by the room's id: above the section's slider and below a line's own item (A4). */
  roomLevels?: Record<string, Level>;
  /** A room's size word, by the room's id (R1): Medium when not given; the passage and the balcony take none. */
  roomWords?: Record<string, SizeWord>;
  /** The bathrooms in order (R2): each the id of the bedroom it is attached to, or null for a common one; absent, the programme's. */
  baths?: (string | null)[];
  /** The balcony (R2): false takes it out; absent or true, the programme's, if it has one. */
  balcony?: boolean;
  /** For a new house: the plot's two sides in metres, the longer one its length; else the plot is the outline with the rule's margins. */
  plot?: { l: number; b: number };
  /** For a new house: the city's sewer reaches the plot, so a sewer connection takes the septic tank's place. */
  sewer?: boolean;
}
/** The sides a room's own size can take, in metres. */
export const ROOM_SIDE = { min: 0.3, max: 30 };
/** How many bathrooms a home can take (R2). */
export const BATHS = { min: 1, max: 8 };
/** The sides a plot can take, in metres. */
export const PLOT_SIDE = { min: 3, max: 300 };

export interface Room {
  id: string; kind: RoomKind; name: string; master: boolean; attached: boolean; sqm: number; l: number; b: number;
  /** The size is the user's own, not the plan's. */
  typed: boolean;
  /** The room's own level, or null when its lines follow the sections. */
  level: Level | null;
  /** The room's size word, which sets its share of the area when it is planned; null for the passage and the balcony. */
  word: SizeWord | null;
  /** A bathroom's bedroom when it is attached to one, its door opening into it; null for a common one, and for other rooms. */
  of: string | null;
}
export interface Opening { id: string; type: OpeningType; room: string; other: string | null; w: number; h: number; sill: number; door: boolean }
export interface Line {
  key: string; room: string | null; roomName: string; section: string; family: string; name: string;
  entry: string; entryName: string; spec: string; brands: string[]; level: Level | null; chosen: boolean;
  /** The level whose item the line takes: its room's, its section's or the package's, no higher than the slot allows (L1). */
  at: Level;
  qty: number; unit: Unit; rate: number; amount: number; kind: ItemKind; how: string; rateHow: string[]; sources: string[]; note?: string;
  /** The day its rate, and each part's, was last read on its page (E2); none while any is as reported. */
  checked?: string;
}
export interface Unpriced { key: string; roomName: string; section: string; name: string; entry: string; entryName: string; spec: string; brands: string[]; qty: number; unit: Unit; at: Level; chosen: boolean }
export interface SectionTotal { id: string; name: string; on: boolean; slider: boolean; level: Level | null; amount: number; lines: number }
export interface Assumption { what: string; shown: string; why: string; src: string[] }
/**
 * Something to check (A8). `decides` when the answers raised it, a figure outside what the rules or the sources expect or
 * an item with no rate, so it can change the decision; the rest hold for every estimate of its kind. `n` is the rupees of
 * the estimate it is about (the total, a section, a room's items), so the largest come first (V1).
 */
export interface Flag { text: string; decides: boolean; n: number }
/** A new house's plot: its sides in metres (the longer one its length), whether they are the user's, and whether the outline fits in it. */
export interface Plot { l: number; b: number; sqm: number; own: boolean; fits: boolean }
/** A new house's outline: lengths in metres, areas in sq m, each floor alike; a stair on each floor and a cabin over the top one. */
export interface House { floors: number; builtSqm: number; footprint: number; l: number; b: number; wall: number; stair: number; carpetSqm: number; floorToFloor: number; cabin: number; plot: Plot }
/** A stage of a new house for a construction loan's payments: what is done by then, and its amount (E5). */
export interface Stage { id: string; name: string; what: string; amount: number; share: number }
/** A part of the carpet area: a room, the passage, or the inside walls (id 'walls'); its share of the carpet area. */
export interface RoomShare { id: string; name: string; kind: RoomKind | 'walls'; share: number }
export interface ArchitectEstimate {
  kind: WorkKind; property: 'flat' | 'house'; city: string; cityName: string; cityFactor: number; bhk: Bhk; level: Level; heightM: number;
  carpetSqm: number; carpetSqft: number;
  /** A new house's outline, and the area the cost a sq ft is of: the built-up area for a new house, else the carpet area. */
  house: House | null; per: 'built-up' | 'carpet';
  rooms: Room[]; openings: Opening[]; lines: Line[]; unpriced: Unpriced[];
  /** The rooms and the passage (not the balcony), and what the carpet area leaves for them after the inside walls; sq m. */
  roomsSqm: number; plannedSqm: number;
  sections: SectionTotal[]; byRoom: { room: string | null; name: string; amount: number }[];
  total: number; perSqft: number; split: Record<ItemKind, number>;
  /** A new house's stages, adding up to the total; null for other work. */
  stages: Stage[] | null;
  /** Each room's share of the carpet area, the passage's and the inside walls' (not the balcony, which is outside it): the bar of shares (R1). */
  shares: RoomShare[];
  /** The rooms below the Code's minimum: the minimum in sq m, by the room's id. Flagged, never changed. */
  below: Record<string, number>;
  /** Largest first; the page shows those that decide with the answer and the rest one tap away (V1). */
  assumptions: Assumption[]; flags: Flag[]; ratesDate: string;
  /** The range by the choices at each line's level (L1), when asked for: the package's, in `levelRuns`. */
  range?: LevelRange;
}
/**
 * A level as a band of choices (L1): the estimate with the cheapest priced choice at each line's level in every line, and
 * with the dearest, each at the middle of its rate on the line's quantity; `lines` of the `of` lines priced offer more than
 * one. A line with an item of the user's own counts at that item; the items with no rate yet are left out, as from the total.
 */
export interface LevelRange { low: number; high: number; lines: number; of: number }

const LEVEL_NAMES = R.levels.map((l) => l.name);
// To the paisa, half up, an exact half kept from floating point (as library.ts).
const r2 = (x: number) => Math.round(x * 100 + 1e-6) / 100;
const f2 = (x: number) => x.toFixed(2);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const AREA_RULES = ['floor', 'floor-skirting', 'paint', 'feature', 'false-ceiling', 'bath-tiles', 'dado', 'wp-bath', 'wp-balcony', 'counter-top', 'wardrobe', 'loft', 'windows', 'shower-screen', 'protect', 'carpet', 'making-good', 'built-up', 'plinth', 'terrace', 'exterior-walls', 'stair-finish', 'stair-walls', 'compound-paint', 'gate', 'paving'];
const LENGTH_RULES = ['cove', 'counter-run', 'stair-railing', 'compound-wall'];
const VOLUME_RULES = ['sump', 'tank', 'septic'];
/** 'material': a structure's rule of thumb, in the material's own unit (bags, kg, cu m, bricks). 'volume': a tank's litres. */
export type Dimension = 'area' | 'length' | 'count' | 'material' | 'volume';
export const dimensionOf = (rule: string): Dimension => (AREA_RULES.includes(rule) || rule.startsWith('unit:') ? 'area' : LENGTH_RULES.includes(rule) ? 'length' : rule.startsWith('struct:') ? 'material' : VOLUME_RULES.includes(rule) ? 'volume' : 'count');
const UNIT_OF: Record<Dimension, Unit[]> = { area: ['sqft', 'sqm'], length: ['rft', 'm'], count: ['nos', 'set', 'lot'], material: ['bag', 'kg', 'cum', 'nos'], volume: ['litre'] };

/** The city's factor: the middle of its construction cost against the average of the listed cities' middles. Null for a place not listed. */
export function cityFactor(id: string): number | null {
  const c = R.cities.list.find((x) => x.id === id);
  if (!c) return null;
  const mids = R.cities.list.map((x) => (x.cost[0] + x.cost[1]) / 2);
  return (c.cost[0] + c.cost[1]) / 2 / (mids.reduce((t, m) => t + m, 0) / mids.length);
}

/** A size word, or Medium for none or one not known. */
export const wordOf = (w: string | undefined): SizeWord => (w !== undefined && WORD_AT.has(w as SizeWord) ? (w as SizeWord) : 'medium');
/** A room's size on its reported range at a size word, in sq ft: the bottom plus the word's share of the range's width (R1). */
export const sizeAt = (range: [number, number], w: SizeWord) => range[0] + (WORD_AT.get(w) as number) * (range[1] - range[0]);

/** A planned room before its size: its id, kind, name and reported range; a bathroom's bedroom when it is attached to one. */
interface Planned { id: string; kind: RoomKind; name: string; range: [number, number]; master: boolean; of: string | null }

/** The ids of a BHK's bedrooms, the main one first: bedroom-1, bedroom-2… */
export const bedroomsOf = (bhk: Bhk): string[] => R.programmes[bhk].rooms.filter((r) => r.kind === 'bedroom').map((_, i) => `bedroom-${i + 1}`);
/** The programme's bathrooms (R2): each the id of the bedroom it is attached to (the main bedroom's for one marked attached), or null. */
export function bathsOf(bhk: Bhk): (string | null)[] {
  const p = R.programmes[bhk], main = p.rooms.filter((r) => r.kind === 'bedroom').findIndex((r) => r.master);
  return p.rooms.filter((r) => r.kind === 'bath').map((r) => (r.attached ? `bedroom-${main + 1}` : null));
}

/**
 * A BHK's rooms before their sizes (R2): the living room, the bedrooms and the kitchen as the programme has them, then the
 * programme's bathrooms, or the user's: each of the programme's bathroom range, common or attached to a bedroom, and named
 * by its place ("Bathroom 2 (attached to Bedroom 2)").
 */
function programmeOf(bhk: Bhk, baths?: (string | null)[]): Planned[] {
  const p = R.programmes[bhk], own = p.rooms.filter((r) => r.kind === 'bath');
  let bed = 0;
  const out: Planned[] = p.rooms.filter((r) => r.kind !== 'bath')
    .map((r) => ({ id: r.kind === 'bedroom' ? `bedroom-${++bed}` : r.kind, kind: r.kind, name: r.name, range: r.range, master: !!r.master, of: null }));
  if (!baths) { const of = bathsOf(bhk); return [...out, ...own.map((r, i) => ({ id: `bath-${i + 1}`, kind: r.kind, name: r.name, range: r.range, master: false, of: of[i] }))]; }
  const main = out.find((r) => r.master)?.id, nameOf = (id: string) => out.find((r) => r.id === id)?.name ?? id;
  return [...out, ...baths.map((of, i): Planned => ({
    id: `bath-${i + 1}`, kind: 'bath', range: own[0].range, master: false, of,
    name: `${baths.length > 1 ? `Bathroom ${i + 1}` : 'Bathroom'}${of === null ? '' : of === main ? ' (attached)' : ` (attached to ${nameOf(of)})`}`,
  }))];
}

/**
 * The rooms of a flat: its programme's rooms, with the user's bathrooms if given (R2), sharing the carpet area left after
 * the passage and the walls in proportion to their sizes at their words (Medium, the middle of each reported range, unless a
 * word is given: R1); the passage its share of the carpet area; a balcony at its own size, unless taken out (R2).
 */
export function planRooms(bhk: Bhk, carpetSqm: number, words: Record<string, SizeWord> = {}, layout: Pick<ArchitectInput, 'baths' | 'balcony'> = {}): Room[] {
  const p = R.programmes[bhk], list = programmeOf(bhk, layout.baths);
  const share = 1 - R.shares.passage.value - R.shares.walls.value;
  const sizes = list.map((r) => sizeAt(r.range, wordOf(words[r.id])));
  const sum = sizes.reduce((t, x) => t + x, 0);
  const out = list.map((r, i) => room(r.id, r.kind, r.name, (carpetSqm * share * sizes[i]) / sum, r.master, r.of, wordOf(words[r.id])));
  out.push(room('passage', 'passage', 'Passage and foyer', carpetSqm * R.shares.passage.value, false, null, null));
  if (p.balcony > 0 && layout.balcony !== false) out.push(room('balcony', 'balcony', 'Balcony', p.balcony / SQFT_PER_SQM, false, null, null));
  return out;
}
function room(id: string, kind: RoomKind, name: string, sqm: number, master: boolean, of: string | null, word: SizeWord | null): Room {
  const l = Math.sqrt(sqm * R.aspect[kind]);
  return { id, kind, name, master, attached: of !== null, of, sqm, l, b: sqm / l, typed: false, level: null, word };
}

/** The user's own sizes and levels on the planned rooms (E3): a size's longer side is the room's length. */
export function ownRooms(rooms: Room[], input: Pick<ArchitectInput, 'rooms' | 'roomLevels'>): Room[] {
  return rooms.map((r) => {
    const size = input.rooms?.[r.id], level = input.roomLevels?.[r.id] ?? null;
    if (!size) return { ...r, level };
    const l = Math.max(size.l, size.b), b = Math.min(size.l, size.b);
    return { ...r, l, b, sqm: l * b, typed: true, level };
  });
}

/**
 * A new house's outline from its built-up area (sq m) and floors: each floor a rectangle of the rule's proportions, its
 * outer walls one brick thick, and a stair well on each floor, the top one rising to a cabin on the terrace. The carpet
 * area left for the rooms is the built-up area less the outer walls' and the stairs' footprints (A5, A13). The plot is
 * the user's, or the outline with the rule's margins round it (E5).
 */
export function houseOf(builtSqm: number, floors: number, H: number, own?: { l: number; b: number }): House {
  const s = R.house, t = R.openings.walls.external / 1000, m = s.plot;
  const footprint = builtSqm / floors, l = Math.sqrt(footprint * s.shape.aspect), b = footprint / l;
  const wall = 2 * t * (l + b) - 4 * t * t, stair = s.stair.w * s.stair.l;
  const pl = own ? Math.max(own.l, own.b) : l + m.front + m.rear, pb = own ? Math.min(own.l, own.b) : b + 2 * m.side;
  const plot = { l: pl, b: pb, sqm: pl * pb, own: !!own, fits: l <= pl + 1e-9 && b <= pb + 1e-9 };
  return { floors, builtSqm, footprint, l, b, wall, stair, carpetSqm: builtSqm - floors * (wall + stair), floorToFloor: H + s.slab.m, cabin: stair, plot };
}

/** Doors and windows: each in its own room's wall, a door's other side named; enough windows for a tenth of a habitable room's floor. */
export function planOpenings(rooms: Room[]): Opening[] {
  const out: Opening[] = [];
  const has = (id: string) => rooms.some((r) => r.id === id);
  const add = (type: OpeningType, roomId: string, other: string | null, n = 1) => {
    const s = R.openings[type];
    for (let i = 0; i < n; i++)
      out.push({ id: `${roomId}:${type}${n > 1 ? `-${i + 1}` : ''}`, type, room: roomId, other, w: s.w / 1000, h: s.h / 1000, sill: (s.sill ?? 0) / 1000, door: !['window', 'kitchenWindow', 'ventilator'].includes(type) });
  };
  const win = R.openings.window, winSqm = (win.w / 1000) * (win.h / 1000);
  const windows = (r: Room) => Math.max(1, Math.ceil((r.sqm * R.openings.windowShare.value) / winSqm - 1e-9));
  for (const r of rooms) {
    if (r.kind === 'passage') add('main', r.id, null);
    if (r.kind === 'bedroom') { add('bedroom', r.id, has('passage') ? 'passage' : null); add('window', r.id, null, windows(r)); }
    if (r.kind === 'living') { add('window', r.id, null, windows(r)); if (has('balcony')) add('balcony', r.id, 'balcony'); }
    if (r.kind === 'kitchen') { add('kitchen', r.id, has('living') ? 'living' : 'passage'); add('kitchenWindow', r.id, null); }
    if (r.kind === 'bath') { add('bath', r.id, r.of ?? 'passage'); add('ventilator', r.id, null); }
  }
  return out;
}

/** What the estimate needs before it can be worked out, in the order asked. */
export function architectNeeds(input: ArchitectInput): string[] {
  const needs: string[] = [];
  const build = input.kind === 'build', floorsOk = isNum(input.floors) && Number.isInteger(input.floors) && input.floors >= 1 && input.floors <= 4;
  if (!input.kind || !(input.kind in R.kinds)) needs.push('What the work is: build a new house, repair or renovate, or interiors');
  if (build && !floorsOk) needs.push('How many floors');
  if (!input.city) needs.push('Which city');
  const areaOk = isNum(input.area) && input.area > 0;
  if (!areaOk) needs.push(build ? 'The built-up area of all floors' : 'The carpet area');
  if (!input.bhk || !(input.bhk in R.programmes)) needs.push('How many bedrooms');
  if (!input.level || !(input.level >= 1 && input.level <= 5)) needs.push('Which level');
  const heightOk = input.heightM === undefined || (input.heightM >= 2 && input.heightM <= 6);
  if (!heightOk) needs.push('A ceiling height from 2 to 6 m');
  const side = (x: unknown) => isNum(x) && x >= ROOM_SIDE.min && x <= ROOM_SIDE.max;
  if (Object.values(input.rooms ?? {}).some((x) => !side(x?.l) || !side(x?.b))) needs.push(`Each side of a room from ${ROOM_SIDE.min} to ${ROOM_SIDE.max} m`);
  if (Object.values(input.roomLevels ?? {}).some((x) => ![1, 2, 3, 4, 5].includes(x))) needs.push('A room\'s level from 1 to 5');
  if (Object.values(input.roomWords ?? {}).some((x) => !WORD_AT.has(x))) needs.push(`A room\'s size: ${R.sizes.words.map((w) => w.name).join(', ').replace(/, ([^,]*)$/, ' or $1')}`);
  if (input.baths !== undefined && input.bhk && input.bhk in R.programmes) {
    const beds = new Set(bedroomsOf(input.bhk)), of = Array.isArray(input.baths) ? input.baths.filter((x) => x !== null) : [];
    const ok = Array.isArray(input.baths) && input.baths.length >= BATHS.min && input.baths.length <= BATHS.max
      && of.every((x) => typeof x === 'string' && beds.has(x)) && new Set(of).size === of.length;
    if (!ok) needs.push(`Bathrooms from ${BATHS.min} to ${BATHS.max}, each common or attached to one of the home\'s bedrooms, one to a bedroom`);
  }
  if (input.balcony !== undefined && typeof input.balcony !== 'boolean') needs.push('The balcony: in or out');
  const plotSide = (x: unknown) => isNum(x) && x >= PLOT_SIDE.min && x <= PLOT_SIDE.max;
  if (input.plot && (!plotSide(input.plot.l) || !plotSide(input.plot.b))) needs.push(`Each side of the plot from ${PLOT_SIDE.min} to ${PLOT_SIDE.max} m`);
  if (build && floorsOk && areaOk && heightOk) {
    const sqm = input.areaUnit === 'sqm' ? (input.area as number) : (input.area as number) / SQFT_PER_SQM;
    const h = houseOf(sqm, input.floors as number, input.heightM ?? R.height.m);
    if (h.carpetSqm < sqm / 2) needs.push(`A larger built-up area: the outer walls and stairs of ${h.floors} floors take more than half of it`);
  }
  return needs;
}

/**
 * The estimate, or what is needed, or blocked when the two computations disagree. With `banded`, also its range by the
 * choices at each line's level (L1), worked twice too. `check` is for tests only.
 */
export function architect(input: ArchitectInput, check: typeof architectCheck = architectCheck, banded = false): ArchitectEstimate | Needs | Blocked {
  const needs = architectNeeds(input);
  if (needs.length) return { needs };
  const e = work(input, banded);
  const where = disagreement(e, check(input, banded));
  return where ? { blocked: `The two computations disagree on ${where}, so no figures are shown. Please report this.` } : e;
}

/** The package at a level: every slider, room level and own item set aside; the sizes and the sections on stay. */
const packageAt = (input: ArchitectInput, level: Level): ArchitectInput => ({ ...input, level, sliders: {}, items: {}, roomLevels: {} });

/**
 * The total and each section's amount with the whole estimate at each of the five levels (the strip and Compare), and the
 * chosen level's range by its choices (L1).
 */
export interface LevelRuns { totals: number[]; sections: Record<string, number[]>; range: LevelRange }

/**
 * The estimate as a package at each of the five levels: its total and each section's amount, for the strip and Compare;
 * and at the chosen level, its range from the cheapest priced choice at the level in every line to the dearest (L1).
 * Each run is worked twice, as every estimate is (its lines, sections, total and range against the second computation).
 */
export function levelRuns(input: ArchitectInput, check: typeof architectCheck = architectCheck): LevelRuns | Needs | Blocked {
  const totals: number[] = [], sections: Record<string, number[]> = {};
  let range: LevelRange | undefined;
  for (const level of [1, 2, 3, 4, 5] as Level[]) {
    const e = architect(packageAt(input, level), check, level === input.level);
    if (!('total' in e)) return e;
    totals.push(e.total);
    for (const s of e.sections) (sections[s.id] ??= []).push(s.amount);
    range ??= e.range;
  }
  return { totals, sections, range: range as LevelRange };
}

/** The total at each of the five levels, the sliders, room levels and own items set aside; or what blocks it. */
export function strip(input: ArchitectInput, check: typeof architectCheck = architectCheck): number[] | Needs | Blocked {
  const runs = levelRuns(input, check);
  return 'totals' in runs ? runs.totals : runs;
}

interface Ctx {
  input: ArchitectInput; kind: WorkKind; home: 'flat' | 'house'; H: number; carpetSqm: number; rooms: Room[]; openings: Opening[];
  /** A section's level, in a room when given: the room's own level, else the section's slider, else the package (A4). */
  on: (section: string) => boolean; levelOf: (section: string, r?: Room | null) => Level; house: House | null; bhk: Bhk;
}
/** Whether a section is shown for a kind of work. */
export const sectionFor = (section: string, kind: WorkKind) => { const k = R.sections.find((x) => x.id === section)?.kinds; return !k || k.includes(kind); };

function work(input: ArchitectInput, banded = false): ArchitectEstimate {
  const kind = input.kind as WorkKind, bhk = input.bhk as Bhk, level = input.level as Level;
  const home = kind === 'build' || input.property === 'house' ? 'house' : 'flat', whole = `Whole ${home}`;
  const typedSqm = input.areaUnit === 'sqm' ? (input.area as number) : (input.area as number) / SQFT_PER_SQM;
  const factor = cityFactor(input.city as string);
  const city = factor ?? 1;
  const H = input.heightM ?? R.height.m;
  const house = kind === 'build' ? houseOf(typedSqm, input.floors as number, H, input.plot) : null;
  const carpetSqm = house ? house.carpetSqm : typedSqm;
  const rooms = ownRooms(planRooms(bhk, carpetSqm, input.roomWords, input), input), openings = planOpenings(rooms);
  const on = (s: string) => sectionFor(s, kind) && (input.sections?.[s] ?? R.kinds[kind].on.includes(s));
  const slider = (s: string) => R.sections.find((x) => x.id === s)?.slider ?? false;
  const levelOf = (s: string, r?: Room | null): Level => (slider(s) ? r?.level ?? input.sliders?.[s] ?? level : level);
  const ctx: Ctx = { input, kind, home, H, carpetSqm, rooms, openings, on, levelOf, house, bhk };

  const lines: Line[] = [], unpriced: Unpriced[] = [], band = { low: 0, high: 0, lines: 0 };
  // Each choice's rate once a run (L1): the rooms share their families.
  const rates = new Map<string, number | null>(), rateOf = (id: string) => { if (!rates.has(id)) rates.set(id, price(id, city, R.gst.pct)?.rate ?? null); return rates.get(id) as number | null; };
  const place = (slot: Slot, r: Room | null) => {
    if (!on(slot.section) || (slot.kinds && !slot.kinds.includes(kind)) || (slot.needs && !on(slot.needs))) return;
    const fam = FAMILIES.get(slot.family);
    if (!fam) throw new Error(`No family ${slot.family} in the library`);
    const isSlider = slider(slot.section) && !fam.fixed;
    const lv = Math.min(levelOf(slot.section, r), slot.maxLevel ?? 5) as Level;
    const key = `${r?.id ?? 'flat'}:${slot.family}:${slot.qty}`;
    const own = input.items?.[key];
    const id = own && ENTRIES.has(own) ? own : ladder(fam, lv);
    if (!id) return;
    const m = measure(slot.qty, r, lv, ctx);
    if (m.base <= 0) return;
    const ent = ENTRIES.get(id) as Entry;
    const dim = dimensionOf(slot.qty);
    if (!UNIT_OF[dim].includes(ent.unit)) throw new Error(`${id} is priced by ${ent.unit}, but ${slot.qty} gives ${dim}`);
    const qtyIn = (u: Unit) => r2(dim === 'count' || dim === 'material' || dim === 'volume' ? m.base : m.base * per(dim === 'area' ? 'sqm' : 'm', u));
    const qty = qtyIn(ent.unit);
    const roomName = r?.name ?? whole;
    const name = slot.name ?? fam.name;
    const p = price(id, city, R.gst.pct);
    if (!p) { unpriced.push({ key, roomName, section: slot.section, name, entry: id, entryName: ent.name, spec: ent.spec, brands: ent.brands ?? [], qty, unit: ent.unit, at: lv, chosen: !!own && ENTRIES.has(own) }); return; }
    const chosen = !!own && ENTRIES.has(own), amount = r2(qty * p.rate);
    lines.push({
      key, room: r?.id ?? null, roomName, section: slot.section, family: slot.family, name, entry: id, entryName: ent.name, spec: ent.spec,
      brands: ent.brands ?? [], level: isSlider ? lv : null, chosen, at: lv, qty, unit: ent.unit, rate: p.rate, amount,
      kind: fam.kind ?? 'fixed', how: m.how, rateHow: p.how, sources: [...new Set([...ent.src, ...partSources(ent)])], ...(ent.note ? { note: ent.note } : {}), ...(checkedOn(ent) ? { checked: checkedOn(ent) } : {}),
    });
    if (!banded) return;
    // The choices at the line's level (L1), each at the middle of its rate on the line's quantity in its own unit.
    let low = amount, high = amount, n = 1;
    if (!chosen) {
      [low, high, n] = [Infinity, -Infinity, 0];
      for (const b of bandOf(fam, lv, UNIT_OF[dim])) {
        const rate = rateOf(b);
        if (rate === null) continue;
        const x = r2(qtyIn((ENTRIES.get(b) as Entry).unit) * rate);
        [low, high, n] = [Math.min(low, x), Math.max(high, x), n + 1];
      }
    }
    band.low += low; band.high += high; band.lines += n > 1 ? 1 : 0;
  };
  for (const r of rooms) for (const slot of R.templates[r.kind]) place(slot, r);
  for (const slot of R.templates.flat) place(slot, null);

  const sections: SectionTotal[] = R.sections.filter((s) => sectionFor(s.id, kind)).map((s) => {
    const ls = lines.filter((l) => l.section === s.id);
    return { id: s.id, name: s.name, on: on(s.id), slider: s.slider, level: s.slider ? levelOf(s.id) : null, amount: r2(ls.reduce((t, l) => t + l.amount, 0)), lines: ls.length };
  });
  const byRoom = [...rooms.map((r) => ({ room: r.id as string | null, name: r.name })), { room: null, name: whole }]
    .map((x) => ({ ...x, amount: r2(lines.filter((l) => l.room === x.room).reduce((t, l) => t + l.amount, 0)) }));
  const total = r2(sections.reduce((t, s) => t + s.amount, 0));
  const carpetSqft = carpetSqm * SQFT_PER_SQM;
  const roomsSqm = rooms.filter((r) => r.kind !== 'balcony').reduce((t, r) => t + r.sqm, 0), plannedSqm = carpetSqm * (1 - R.shares.walls.value);
  const perSqft = r2(total / (house ? house.builtSqm * SQFT_PER_SQM : carpetSqft));
  const split = { fixed: 0, movable: 0, appliance: 0 } as Record<ItemKind, number>;
  for (const l of lines) split[l.kind] = r2(split[l.kind] + l.amount);
  const cityName = R.cities.list.find((c) => c.id === input.city)?.name ?? 'Other';
  const stages = house ? stagesOf(house, sections, split, total) : null;
  // The bar of shares: each room's share of the carpet area (the balcony is outside it), and the inside walls' (R1).
  const shares: RoomShare[] = [
    ...rooms.filter((r) => r.kind !== 'balcony').map((r) => ({ id: r.id, name: r.name, kind: r.kind, share: r.sqm / carpetSqm })),
    { id: 'walls', name: 'Inside walls', kind: 'walls' as const, share: R.shares.walls.value },
  ];
  const below = belowCode(rooms);
  return {
    kind, property: home, city: input.city as string, cityName, cityFactor: city, bhk, level, heightM: H, carpetSqm, carpetSqft,
    house, per: house ? 'built-up' : 'carpet',
    rooms, openings, lines, unpriced, roomsSqm, plannedSqm, sections, byRoom, total, perSqft, split, stages, shares, below,
    assumptions: assumptions(ctx, bhk, cityName, factor), flags: flags(ctx, bhk, carpetSqft, lines, unpriced, factor, perSqft, roomsSqm, plannedSqm, below), ratesDate: LIBRARY_DATE,
    ...(banded ? { range: { low: r2(band.low), high: r2(band.high), lines: band.lines, of: lines.length } } : {}),
  };
}

/**
 * The choices at a level (L1): the item the family names at that level, then its other items usually at that level, each
 * priced by a unit the line's quantity can take. Ids, the level's item first.
 */
export function bandOf(fam: Family, level: Level, units: Unit[]): string[] {
  const key = `${fam.id}:${level}:${units.join(',')}`;
  let ids = BANDS.get(key);
  if (!ids) {
    const named = ladder(fam, level);
    ids = [...(named ? [named] : []), ...choices(fam.id).filter((e) => e.level === level && e.id !== named).map((e) => e.id)].filter((id) => units.includes((ENTRIES.get(id) as Entry).unit));
    BANDS.set(key, ids);
  }
  return ids;
}
// The library does not change while the page runs, so each family's choices at a level are found once.
const BANDS = new Map<string, string[]>();

/** A size word's name: "Above medium". */
export const wordName = (w: SizeWord) => R.sizes.words.find((x) => x.id === w)?.name ?? '';
/** Whether any room has a size word other than Medium. */
const worded = (rooms: Room[]) => rooms.some((r) => r.word !== null && r.word !== 'medium');
/** The Code's minimum for a kind of room in sq m, or 0 where it sets none (the passage and the balcony). */
const codeMinimum = (kind: RoomKind) => (kind === 'living' || kind === 'bedroom' ? R.minimums.habitable : kind === 'kitchen' ? R.minimums.kitchen : kind === 'bath' ? R.minimums.bath : 0);
/** The rooms below the Code's minimum, by id: the minimum in sq m. */
function belowCode(rooms: Room[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rooms) { const want = codeMinimum(r.kind); if (want && r.sqm < want - 1e-9) out[r.id] = want; }
  return out;
}

/** The floors' names, for the slabs' stages. */
const FLOOR_NAMES = ['Ground floor', 'First floor', 'Second floor', 'Third floor'];
/** A stage's share of the structure: the middle of its reported share of a house's cost, over the three middles. */
export function stageShare(id: 'foundation' | 'frame' | 'walls'): number {
  const sh = R.house.stages.shares, m = (k: 'foundation' | 'frame' | 'walls') => (sh[k][0] + sh[k][1]) / 2;
  return m(id) / (m('foundation') + m('frame') + m('walls'));
}

/**
 * A new house's stages for a construction loan (E5): the structure split by the published shares (foundation and plinth,
 * each floor's frame and slab alike, the walls and plaster taking what is left so the three add up to the structure), then
 * the finishes, the outside works and water, and any movable items from the estimate's own lines. Stages of nil are left out.
 */
function stagesOf(h: House, sections: SectionTotal[], split: Record<ItemKind, number>, total: number): Stage[] {
  const amt = (id: string) => sections.find((x) => x.id === id)?.amount ?? 0, list = R.house.stages.list;
  const named = (id: string) => list.find((x) => x.id === id) as { id: string; name: string; what: string };
  const S = amt('structure'), foundation = r2(S * stageShare('foundation')), slab = r2((S * stageShare('frame')) / h.floors);
  const walls = r2(S - foundation - slab * h.floors), outside = r2(amt('outside') + amt('water')), movable = split.movable;
  const finishing = r2(total - S - outside - movable);
  const slabs = Array.from({ length: h.floors }, (_, i) => ({
    id: `slab-${i + 1}`, name: h.floors === 1 ? 'Roof slab' : `${FLOOR_NAMES[i]} ${named('slab').name}`, what: named('slab').what, amount: slab,
  }));
  const rows = [{ ...named('foundation'), amount: foundation }, ...slabs, { ...named('walls'), amount: walls }, { ...named('finishing'), amount: finishing }, { ...named('outside'), amount: outside }, { ...named('movable'), amount: movable }];
  return rows.filter((x) => Math.abs(x.amount) >= 0.005).map((x) => ({ ...x, share: total > 0 ? x.amount / total : 0 }));
}

/** The day an item's rate was read on its page, with its parts' (E2): the latest, or none while any is unread. */
export const checkedOn = (e: Entry): string | undefined => {
  const days = [e.rate ? e.checked : '', ...(e.parts ?? []).map((p) => checkedOn(ENTRIES.get(p.id) as Entry))];
  return days.includes(undefined) ? undefined : days.filter(Boolean).sort().at(-1);
};
const partSources = (e: Entry): string[] => (e.parts ?? []).flatMap((p) => { const x = ENTRIES.get(p.id) as Entry; return [...x.src, ...partSources(x)]; });

// ---- Measuring, by the rules in engine/data/architect.json. Lengths in metres, areas in square metres. ----

const perimeter = (r: Room) => 2 * (r.l + r.b);
const area = (o: Opening) => o.w * o.h;
const external = (o: Opening) => o.other === null || o.other === 'balcony';
/** IS 1200: the area an opening takes off its own room's face. */
const ownDeduction = (o: Opening) => (area(o) <= R.is1200.noDeduction ? 0 : area(o));
/** IS 1200: the area an opening takes off the other room's face: only an opening over 3 sq m. */
const otherDeduction = (o: Opening) => (area(o) > R.is1200.oneFace ? area(o) : 0);
/** IS 1200: an opening over 3 sq m adds its reveals: the jambs and the head, and the sill of a window. */
const reveals = (o: Opening) => (area(o) > R.is1200.oneFace ? (2 * o.h + o.w + (o.door ? 0 : o.w)) * ((external(o) ? R.openings.walls.external : R.openings.walls.internal) / 1000) : 0);

function tileHeight(ctx: Ctx, r: Room): number {
  if (!ctx.on('bathrooms')) return Math.min(R.tileHeights.existing / 1000, ctx.H);
  const t = R.tileHeights.mm[ctx.levelOf('bathrooms', r) - 1];
  return t === 'ceiling' ? ctx.H : Math.min(t / 1000, ctx.H);
}
const counterRun = (r: Room) => r.l + r.b - R.kitchen.depth;
const featureArea = (r: Room, ctx: Ctx) => {
  if (!ctx.on('walls')) return 0;
  const lv = ctx.levelOf('walls', r);
  if (r.kind === 'living' && lv >= R.feature.living) return r.l * ctx.H;
  if (r.kind === 'bedroom' && r.master && lv >= R.feature.master) return r.b * ctx.H;
  return 0;
};
const bathHasCeiling = (ctx: Ctx, r: Room) => { const f = FAMILIES.get('bath-ceiling'); return ctx.on('bathrooms') && !!f && !!ladder(f, ctx.levelOf('bathrooms', r)); };
const doorsOf = (r: Room, ctx: Ctx) => ctx.openings.filter((o) => o.door && (o.room === r.id || o.other === r.id));
function ceilingCover(r: Room, lv: Level): 'none' | 'border' | 'full' {
  const spec = R.falseCeiling.byLevel[lv - 1];
  const inRooms = spec.rooms.includes(r.kind) || (spec.rooms.includes('master') && r.master);
  return inRooms ? spec.cover : 'none';
}
function wardrobeWidth(r: Room): number {
  const want = (r.master ? R.wardrobes.mainWidth : R.wardrobes.otherWidth) / 1000;
  return Math.min(want, Math.max(0, r.l - R.wardrobes.clearance / 1000));
}

/** The quantity a rule gives for a room (or the flat when `r` is null), in its base unit, and how it was worked out. */
function measure(rule: string, r: Room | null, lv: Level, ctx: Ctx): { base: number; how: string } {
  const H = ctx.H, t = (x: number) => f2(x);
  if (r === null) {
    if (ctx.house) { const m = measureHouse(rule, ctx.house, ctx); if (m) return m; }
    if (rule === 'one') return { base: 1, how: `One for the ${ctx.home}` };
    if (rule === 'carpet') return { base: ctx.carpetSqm, how: `The carpet area: ${t(ctx.carpetSqm)} sq m` };
    if (rule === 'protect') {
      const a = ctx.rooms.filter((x) => x.kind !== 'bath' && x.kind !== 'balcony').reduce((s, x) => s + x.sqm, 0);
      return { base: a, how: `The floors of the rooms, the passage and the kitchen: ${t(a)} sq m` };
    }
    if (rule === 'making-good') {
      const walls = ctx.rooms.filter((x) => x.kind !== 'balcony').reduce((s, x) => s + perimeter(x) * H, 0);
      return { base: walls * R.makingGood.share, how: `${R.makingGood.share * 100}% of the walls' ${t(walls)} sq m` };
    }
    if (rule === 'debris') {
      const baths = ctx.on('bathrooms') && ctx.kind === 'renovate' ? ctx.rooms.filter((x) => x.kind === 'bath').length : 0;
      const floorSqft = ctx.on('flooring') && ctx.kind === 'renovate' ? ctx.rooms.filter((x) => x.kind !== 'bath').reduce((s, x) => s + x.sqm, 0) * SQFT_PER_SQM : 0;
      const lots = baths + Math.ceil(floorSqft / R.debris.sqftPerLot - 1e-9);
      return { base: lots, how: `${baths} for the bathrooms and ${lots - baths} for ${Math.round(floorSqft)} sq ft of floor taken up` };
    }
    throw new Error(`No rule ${rule} for the whole flat`);
  }
  const P = perimeter(r), dims = `${t(r.l)} × ${t(r.b)} m`;
  switch (rule) {
    case 'floor': return { base: r.sqm, how: `${dims} floor: ${t(r.sqm)} sq m` };
    case 'floor-skirting': {
      const run = Math.max(0, P - doorsOf(r, ctx).reduce((s, o) => s + o.w, 0)), sk = run * R.skirting.m;
      return { base: r.sqm + sk, how: `${dims} floor ${t(r.sqm)} sq m, and skirting ${t(run)} m long × ${R.skirting.m} m = ${t(sk)} sq m` };
    }
    case 'paint': {
      let walls: number, how: string;
      if (r.kind === 'balcony') return { base: 0, how: '' };
      if (r.kind === 'bath') {
        const th = tileHeight(ctx, r);
        let above = P * Math.max(0, H - th);
        for (const o of ctx.openings.filter((x) => x.room === r.id && area(x) > R.is1200.noDeduction)) above -= o.w * Math.max(0, o.sill + o.h - Math.max(o.sill, th));
        walls = Math.max(0, above);
        how = `walls above the tiles: ${t(P)} m × ${t(Math.max(0, H - th))} m = ${t(walls)} sq m`;
      } else {
        const gross = P * H;
        let ded = 0, rev = 0;
        for (const o of ctx.openings) {
          if (o.room === r.id) { ded += ownDeduction(o); rev += reveals(o); } else if (o.other === r.id) ded += otherDeduction(o);
        }
        const dado = r.kind === 'kitchen' ? counterRun(r) * R.kitchen.dado : 0, feat = featureArea(r, ctx);
        walls = Math.max(0, gross - ded + rev - dado - feat);
        how = `walls ${t(P)} m × ${t(H)} m = ${t(gross)} sq m, less ${t(ded)} sq m of openings (IS 1200)${rev ? `, plus ${t(rev)} sq m of reveals` : ''}${dado ? `, less ${t(dado)} sq m of tiles above the counter` : ''}${feat ? `, less the ${t(feat)} sq m feature wall` : ''}`;
      }
      const ceiling = r.kind === 'bath' && bathHasCeiling(ctx, r) ? 0 : r.sqm;
      return { base: walls + ceiling, how: `${how}; ceiling ${t(ceiling)} sq m` };
    }
    case 'feature': { const a = featureArea(r, ctx); return { base: a, how: `${r.kind === 'living' ? 'The longer wall' : 'The wall behind the bed'}: ${t(r.kind === 'living' ? r.l : r.b)} × ${t(H)} m` }; }
    case 'false-ceiling': {
      const c = ceilingCover(r, lv), bd = R.falseCeiling.border;
      if (c === 'none') return { base: 0, how: '' };
      const a = c === 'full' ? r.sqm : r.sqm - Math.max(0, r.l - 2 * bd) * Math.max(0, r.b - 2 * bd);
      return { base: a, how: c === 'full' ? `The whole ceiling, ${dims}: ${t(a)} sq m` : `A ${bd} m border around ${dims}: ${t(a)} sq m` };
    }
    case 'cove': {
      if (ceilingCover(r, lv) === 'none') return { base: 0, how: '' };
      const i = R.falseCeiling.coveInset, len = 2 * (Math.max(0, r.l - 2 * i) + Math.max(0, r.b - 2 * i));
      return { base: len, how: `Around the ceiling ${i} m in from the walls: ${t(len)} m` };
    }
    case 'bath-tiles': {
      const th = tileHeight(ctx, r);
      let a = P * th;
      for (const o of ctx.openings.filter((x) => x.room === r.id && area(x) > R.is1200.noDeduction)) a -= o.w * Math.max(0, Math.min(o.sill + o.h, th) - o.sill);
      return { base: Math.max(0, a), how: `${t(P)} m of wall × ${t(th)} m high, less the door: ${t(Math.max(0, a))} sq m` };
    }
    case 'dado': { const run = counterRun(r), a = run * R.kitchen.dado; return { base: a, how: `${t(run)} m of counter × ${R.kitchen.dado} m: ${t(a)} sq m` }; }
    case 'wp-bath': {
      const w = R.waterproofing, a = r.sqm + P * w.upturn + w.showerWidth * (w.showerHeight - w.upturn);
      return { base: a, how: `floor ${t(r.sqm)} sq m + ${t(P)} m × ${w.upturn} m up the walls + the shower ${w.showerWidth} × ${t(w.showerHeight - w.upturn)} m: ${t(a)} sq m` };
    }
    case 'wp-balcony': { const a = r.sqm + P * R.waterproofing.balconyUpturn; return { base: a, how: `floor ${t(r.sqm)} sq m + ${t(P)} m × ${R.waterproofing.balconyUpturn} m: ${t(a)} sq m` }; }
    case 'counter-run': { const run = counterRun(r); return { base: run, how: `An L along two walls: ${t(r.l)} + ${t(r.b)} − ${R.kitchen.depth} m = ${t(run)} m` }; }
    case 'counter-top': { const run = counterRun(r), a = run * R.kitchen.depth; return { base: a, how: `${t(run)} m × ${R.kitchen.depth} m deep: ${t(a)} sq m` }; }
    case 'wardrobe': {
      const w = wardrobeWidth(r), h = lv >= R.wardrobes.fullHeightFrom ? H : R.wardrobes.height / 1000;
      return { base: w * h, how: `${t(w)} m wide × ${t(h)} m high: ${t(w * h)} sq m of front` };
    }
    case 'loft': {
      if (lv >= R.wardrobes.fullHeightFrom) return { base: 0, how: '' };
      const w = wardrobeWidth(r), h = R.wardrobes.loft / 1000;
      return { base: w * h, how: `${t(w)} m wide × ${t(h)} m: ${t(w * h)} sq m` };
    }
    case 'windows': {
      const ws = ctx.openings.filter((o) => o.room === r.id && (o.type === 'window' || o.type === 'kitchenWindow'));
      const a = ws.reduce((s, o) => s + area(o), 0);
      return { base: a, how: `${ws.length} window${ws.length === 1 ? '' : 's'} of ${t(ws[0]?.w ?? 0)} × ${t(ws[0]?.h ?? 0)} m: ${t(a)} sq m` };
    }
    case 'window-count': {
      const n = ctx.openings.filter((o) => o.room === r.id && o.type === 'window').length, w = R.openings.window;
      return { base: n, how: `${n} window${n === 1 ? '' : 's'} of ${f2(w.w / 1000)} × ${f2(w.h / 1000)} m` };
    }
    case 'shower-screen': { const s = R.showerScreen; return { base: s.w * s.h, how: `${s.w} × ${s.h} m across the shower` }; }
    case 'door': { const n = ctx.openings.filter((o) => o.room === r.id && o.type === r.kind).length; return { base: n, how: `${n} door` }; }
    case 'main-door': return { base: r.kind === 'passage' ? 1 : 0, how: `The ${ctx.home}'s main door` };
    case 'one': return { base: 1, how: `One in ${r.name.toLowerCase()}` };
    case 'ac': {
      const n = r.kind === 'living' || r.master ? (lv >= R.ac.from ? 1 : 0) : r.kind === 'bedroom' && lv >= R.ac.allBedroomsFrom ? 1 : 0;
      return { base: n, how: `${n} split AC` };
    }
    case 'points': case 'light-points': case 'fan-points': case 'exhaust-points': {
      const p = R.points[r.kind];
      const n = rule === 'light-points' ? p.lights ?? 0 : rule === 'fan-points' ? p.fans ?? 0 : rule === 'exhaust-points' ? p.exhaust ?? 0
        : Object.entries(p).reduce((s, [k, v]) => s + (k === 'masterExtra' ? (r.master ? v ?? 0 : 0) : v ?? 0), 0);
      return { base: n, how: `${n} ${rule === 'points' ? '' : `${rule.split('-')[0]} `}point${n === 1 ? '' : 's'}, by the rule for a ${r.kind === 'bath' ? 'bathroom' : r.kind}` };
    }
    case 'supply-points': case 'drain-points': {
      const p = (R.plumbing as Record<string, { supply: number; drain: number } | undefined>)[r.kind];
      const n = p ? (rule === 'supply-points' ? p.supply : p.drain) : 0;
      return { base: n, how: `${n} ${rule === 'supply-points' ? 'water' : 'drainage'} points` };
    }
    default:
      if (rule.startsWith('unit:')) {
        const u = R.wardrobes.units[rule.slice(5)];
        if (!u) throw new Error(`No unit ${rule}`);
        if (r.kind !== u.room || lv < u.from) return { base: 0, how: '' };
        const a = (u.w / 1000) * (u.h / 1000);
        return { base: a, how: `${f2(u.w / 1000)} × ${f2(u.h / 1000)} m of front: ${t(a)} sq m` };
      }
      throw new Error(`No rule ${rule}`);
  }
}

/**
 * A new house's own quantities: the structure's materials by the rules of thumb a sq ft of built-up area and the stair
 * cabin (in their own units), its labour on the same area and the anti-termite treatment on the plinth, the terrace inside
 * the parapet with the upturn, the outside walls of every floor, the parapet and the cabin, and each floor's stair (its
 * railing, finish and walls). Round the plot: the compound wall, its paint, the gate and the paving. The water: the sump,
 * the overhead tank, the septic tank or the sewer connection, and the rainwater recharge pit. Null for a rule that is not
 * the house's.
 */
function measureHouse(rule: string, h: House, ctx: Ctx): { base: number; how: string } | null {
  const s = R.house, t = R.openings.walls.external / 1000, built = h.builtSqm + h.cabin, sqft = built * SQFT_PER_SQM;
  const floors = `${h.floors} floor${h.floors > 1 ? 's' : ''}`, st = s.stair, stairs = `${h.floors} stair${h.floors > 1 ? 's' : ''}`;
  if (rule === 'built-up') return { base: built, how: `The built-up area of ${floors}, ${f2(h.builtSqm)} sq m, and the stair cabin on the terrace, ${f2(h.cabin)} sq m: ${f2(built)} sq m` };
  if (rule === 'plinth') return { base: h.footprint, how: `The ground floor's outline, ${f2(h.l)} × ${f2(h.b)} m: ${f2(h.footprint)} sq m` };
  if (rule.startsWith('struct:')) {
    const what = rule.slice(7) as 'cement' | 'steel' | 'sand' | 'aggregate' | 'bricks', each = s.thumb[what], n = each * sqft;
    const on = `${f2(sqft)} sq ft of built-up area and stair cabin`;
    if (what === 'sand' || what === 'aggregate') return { base: n / CFT_PER_CUM, how: `${each} cft a sq ft × ${on} = ${f2(n)} cft = ${f2(n / CFT_PER_CUM)} cu m` };
    const word = what === 'cement' ? 'bags' : what === 'steel' ? 'kg' : 'bricks';
    return { base: n, how: `${each} ${word} a sq ft × ${on} = ${f2(n)} ${word}` };
  }
  const li = h.l - 2 * t, bi = h.b - 2 * t, inner = 2 * (li + bi), well = 2 * (st.w + st.l);
  if (rule === 'terrace') {
    const roof = li * bi, edge = inner * s.terraceUpturn.m;
    return { base: roof + edge, how: `The roof inside the parapet, ${f2(li)} × ${f2(bi)} m = ${f2(roof)} sq m, and ${f2(inner)} m × ${s.terraceUpturn.m} m up the parapet = ${f2(edge)} sq m` };
  }
  if (rule === 'exterior-walls') {
    // IS 1200: openings up to 3 sq m come off one face only, the inside's (as `paint` measures it), so none off the outside.
    const P = 2 * (h.l + h.b), up = h.floors * h.floorToFloor + s.parapet.m, cabin = well * s.cabin.h, a = P * up + inner * s.parapet.m + cabin;
    return { base: a, how: `Outside ${f2(P)} m × (${floors} × ${f2(h.floorToFloor)} m + a ${f2(s.parapet.m)} m parapet) = ${f2(P * up)} sq m, the parapet's inside ${f2(inner)} m × ${f2(s.parapet.m)} m = ${f2(inner * s.parapet.m)} sq m, and the stair cabin's outside ${f2(well)} m × ${f2(s.cabin.h)} m = ${f2(cabin)} sq m; openings come off the inside only (IS 1200)` };
  }
  if (rule === 'stair-railing') {
    const flight = Math.sqrt(st.going ** 2 + (h.floorToFloor / 2) ** 2), len = h.floors * (2 * flight + st.gap);
    return { base: len, how: `${stairs}, the top one to the terrace, each two flights of ${f2(flight)} m (${f2(st.going)} m along, ${f2(h.floorToFloor / 2)} m up) and ${f2(st.gap)} m at the landing: ${f2(len)} m` };
  }
  if (rule === 'stair-finish') {
    const treads = 2 * st.flight * st.going, risers = st.flight * h.floorToFloor, landing = st.landing * st.w, top = (st.l - st.going - st.landing) * st.w;
    const each = treads + risers + landing + top;
    return { base: h.floors * each, how: `${stairs}, each: treads 2 × ${f2(st.flight)} × ${f2(st.going)} m = ${f2(treads)} sq m, risers ${f2(st.flight)} m × ${f2(h.floorToFloor)} m = ${f2(risers)} sq m, the landing ${f2(st.landing)} × ${f2(st.w)} m = ${f2(landing)} sq m and the floor's landing ${f2(st.l - st.going - st.landing)} × ${f2(st.w)} m = ${f2(top)} sq m: ${f2(each)} sq m; ${f2(h.floors * each)} sq m` };
  }
  if (rule === 'stair-walls') {
    const up = h.floors * h.floorToFloor + s.cabin.h, a = well * up;
    return { base: a, how: `The stair well's walls, ${f2(well)} m round, from the ground floor to the cabin's roof (${floors} × ${f2(h.floorToFloor)} m + ${f2(s.cabin.h)} m = ${f2(up)} m): ${f2(a)} sq m, openings not taken off` };
  }
  if (rule === 'terrace-door') return { base: 1, how: 'One, from the stair cabin to the terrace' };
  const o = s.outside, P = 2 * (h.plot.l + h.plot.b), wall = Math.max(0, P - o.gate.w);
  const plotWords = `${f2(h.plot.l)} × ${f2(h.plot.b)} m${h.plot.own ? ', your size' : ''}`;
  if (rule === 'compound-wall') return { base: wall, how: `Round the plot (${plotWords}), 2 × (${f2(h.plot.l)} + ${f2(h.plot.b)}) m = ${f2(P)} m, less the ${f2(o.gate.w)} m gate: ${f2(wall)} m` };
  if (rule === 'compound-paint') return { base: 2 * wall * o.wall, how: `Both faces of ${f2(wall)} m of wall, ${f2(o.wall)} m high: ${f2(2 * wall * o.wall)} sq m` };
  if (rule === 'gate') return { base: o.gate.w * o.gate.h, how: `A gate ${f2(o.gate.w)} m wide and ${f2(o.gate.h)} m high: ${f2(o.gate.w * o.gate.h)} sq m` };
  if (rule === 'paving') {
    const open = h.plot.sqm - h.footprint;
    return { base: Math.max(0, open), how: `The plot, ${plotWords} = ${f2(h.plot.sqm)} sq m, less the house's ${f2(h.footprint)} sq m: ${f2(open)} sq m` };
  }
  const w = s.water, people = w.persons.by[ctx.bhk], day = people * w.persons.lpcd;
  if (rule === 'sump') {
    const need = day * w.sump.days, litres = Math.ceil(need / w.sump.step - 1e-9) * w.sump.step;
    return { base: litres, how: `${people} people × ${w.persons.lpcd} litres a day × ${w.sump.days} days = ${inr(need)} litres, rounded up to ${inr(litres)} litres` };
  }
  if (rule === 'tank') {
    const need = day * w.tank.days, litres = w.tank.sizes.find((x) => x >= need - 1e-9) ?? w.tank.sizes[w.tank.sizes.length - 1];
    return { base: litres, how: `${people} people × ${w.persons.lpcd} litres a day${w.tank.days !== 1 ? ` × ${w.tank.days} days` : ''} = ${inr(need)} litres; the next size sold, ${inr(litres)} litres` };
  }
  if (rule === 'septic') {
    const litres = ctx.input.sewer ? 0 : w.septic.litres[ctx.bhk];
    return { base: litres, how: `HouseYog's tank for a ${BHKS.find((x) => x.id === ctx.bhk)?.label}: ${inr(litres)} litres, with a soak pit` };
  }
  if (rule === 'sewer') return { base: ctx.input.sewer ? 1 : 0, how: 'One connection from the house\'s drain to the city\'s sewer' };
  if (rule === 'rwh') return { base: 1, how: 'One recharge pit with a filter, for the roof\'s water' };
  return null;
}

function assumptions(ctx: Ctx, bhk: Bhk, cityName: string, factor: number | null): Assumption[] {
  const p = R.programmes[bhk], sqft = (x: number) => Math.round(x * SQFT_PER_SQM);
  const m = ctx.input.areaUnit === 'sqm', side = (x: number) => String(+(m ? x : x * FT_PER_M).toFixed(2));
  const word = (r: Room) => (!r.typed && r.word && r.word !== 'medium' ? `, ${wordName(r.word)}` : '');
  const noBalcony = p.balcony > 0 && ctx.input.balcony === false ? '; no balcony, taken out' : '';
  const rooms = ctx.rooms.map((r) => `${r.name} ${sqft(r.sqm)} sq ft${r.typed ? ` (${side(r.l)} × ${side(r.b)} ${m ? 'm' : 'ft'}, your size)` : ''}${word(r)}${r.level ? `, at ${levelName(r.level)}` : ''}`).join('; ') + noBalcony;
  const own = ctx.rooms.some((r) => r.typed) ? ' A size you typed is used as it is, and the other rooms keep their planned sizes.' : '';
  const words = worded(ctx.rooms) ? ` ${R.sizes.why}` : '';
  const baths = ctx.rooms.filter((r) => r.kind === 'bath').length;
  const on = R.sections.filter((s) => ctx.on(s.id)).map((s) => s.name).join(', ');
  const h = ctx.house;
  return [
    ...(h ? houseAssumed(ctx, h, side, m) : []),
    { what: 'Rooms', shown: rooms, why: `${p.why}${words} ${R.shares.passage.why} ${R.shares.walls.why}${own}`, src: [...new Set([...p.src, ...R.shares.passage.src, ...(words ? R.sizes.src : [])])] },
    { what: 'Bathrooms', shown: `${baths}${ctx.input.baths ? ', as you chose' : ''}`, why: R.bathrooms.why, src: R.bathrooms.src },
    { what: 'Ceiling height', shown: `${f2(ctx.H)} m`, why: R.height.why, src: R.height.src },
    { what: 'Sections', shown: on, why: R.kinds[ctx.kind].why, src: ['own'] },
    { what: 'City', shown: factor === null ? `${cityName}: no city figure, so the rates are used as they are` : `${cityName}: labour and fitted rates × ${factor.toFixed(3)}`, why: R.cities.why, src: R.cities.src },
    { what: 'Rates', shown: `As reported on ${LIBRARY_DATE.split('-').reverse().join('-')}, the middle of each range`, why: LIBRARY_STATUS, src: [] },
    { what: 'Doors and windows', shown: 'Main door 1000 mm, bedroom doors 900 mm, bathroom doors 750 mm, all 2100 mm high; 4 × 4 ft windows, at least a tenth of each room\'s floor', why: `${R.openings.windowShare.why}`, src: [...R.openings.main.src, ...R.openings.windowShare.src] },
    { what: 'Electrical points', shown: 'By the room: a 2BHK about 40, a 3BHK about 50', why: R.points.why, src: R.points.src },
  ];
}

/** A new house's own assumptions: its outline and stairs, the floors, the plot, the structure, the outside works, the water and the stages. */
function houseAssumed(ctx: Ctx, h: House, side: (x: number) => string, m: boolean): Assumption[] {
  const hs = R.house, th = hs.thumb, w = hs.water, sqft = (x: number) => Math.round(x * SQFT_PER_SQM);
  const area = (x: number) => (m ? `${f2(x)} sq m` : `${inr(sqft(x))} sq ft`), unit = m ? 'm' : 'ft';
  const people = w.persons.by[ctx.bhk], day = people * w.persons.lpcd;
  const sump = Math.ceil((day * w.sump.days) / w.sump.step - 1e-9) * w.sump.step, tank = w.tank.sizes.find((x) => x >= day * w.tank.days - 1e-9) ?? w.tank.sizes[w.tank.sizes.length - 1];
  const pct = (x: number) => `${(x * 100).toFixed(2)}%`, P = 2 * (h.plot.l + h.plot.b), wall = Math.max(0, P - hs.outside.gate.w);
  const plot = `${side(h.plot.l)} × ${side(h.plot.b)} ${unit}, ${area(h.plot.sqm)}`;
  return [
    { what: 'The house', shown: `${FLOORS[h.floors - 1].label}: ${h.floors} floor${h.floors > 1 ? 's' : ''} of ${sqft(h.footprint)} sq ft, ${f2(h.l)} × ${f2(h.b)} m outside with ${R.openings.walls.external} mm outer walls, and a ${hs.stair.w} × ${hs.stair.l} m stair on each floor, the top one rising to a ${f2(hs.cabin.h)} m cabin on the terrace; ${sqft(h.carpetSqm)} sq ft of carpet area left for the rooms`, why: `${hs.shape.why} ${hs.stair.why} ${hs.cabin.why}`, src: [...hs.shape.src, ...hs.stair.src, ...hs.cabin.src] },
    { what: 'Floor to floor', shown: `${f2(h.floorToFloor)} m: the ceiling and a ${hs.slab.m * 1000} mm slab; a ${f2(hs.parapet.m)} m parapet on the terrace`, why: `${hs.slab.why} ${hs.parapet.why}`, src: [...hs.slab.src, ...hs.parapet.src] },
    { what: 'The plot', shown: h.plot.own ? `${plot}, your size${h.plot.fits ? '' : ', smaller than the house\'s outline'}` : `${plot}: the house's outline with ${hs.plot.front} m in front, ${hs.plot.rear} m behind and ${hs.plot.side} m on each side`, why: hs.plot.why, src: hs.plot.src },
    { what: 'Structure', shown: `For each sq ft of built-up area and of the stair cabin: ${th.cement} bags of cement, ${th.steel} kg of steel, ${th.sand} cft of sand, ${th.aggregate} cft of aggregate and ${th.bricks} bricks, and the labour by stage`, why: th.why, src: th.src },
    { what: 'Outside works', shown: `A brick compound wall ${f2(hs.outside.wall)} m high round the plot, ${f2(wall)} m with a ${f2(hs.outside.gate.w)} m gate, painted on both faces; the open ground round the house paved, ${area(Math.max(0, h.plot.sqm - h.footprint))}`, why: hs.outside.why, src: hs.outside.src },
    { what: 'Water', shown: `${people} people at ${w.persons.lpcd} litres a day: a sump of ${inr(sump)} litres (${w.sump.days} days), an overhead tank of ${inr(tank)} litres (a day), ${ctx.input.sewer ? 'the city\'s sewer in place of a septic tank' : `a septic tank of ${inr(w.septic.litres[ctx.bhk])} litres with a soak pit`}, and a rainwater recharge pit`, why: `${w.persons.why} ${w.sump.why} ${w.tank.why} ${w.septic.why} ${w.rwh.why}`, src: [...new Set([...w.persons.src, ...w.sump.src, ...w.tank.src, ...w.septic.src, ...w.rwh.src])] },
    { what: 'Stages', shown: `The structure split ${pct(stageShare('foundation'))} to the foundation and plinth, ${pct(stageShare('frame'))} to the frame and slabs, alike for each floor, and ${pct(stageShare('walls'))} to the walls and plaster; the finishes, outside works and water from the estimate's own lines`, why: hs.stages.why, src: hs.stages.src },
  ];
}

function flags(ctx: Ctx, bhk: Bhk, carpetSqft: number, lines: Line[], unpriced: Unpriced[], factor: number | null, perSqft: number, roomsSqm: number, plannedSqm: number, below: Record<string, number>): Flag[] {
  const out: Flag[] = [];
  const sqft = (x: number) => inr(Math.round(x * SQFT_PER_SQM)), picked = worded(ctx.rooms);
  // What each flag is about, in rupees, to put the largest first: the whole estimate, a section, the rooms' items or a room's.
  const sum = (f: (l: Line) => boolean) => r2(lines.filter(f).reduce((t, l) => t + l.amount, 0));
  const total = sum(() => true), section = (id: string) => sum((l) => l.section === id), inRooms = sum((l) => l.room !== null);
  const check = (text: string, n: number) => out.push({ text, decides: true, n });
  const note = (text: string, n: number) => out.push({ text, decides: false, n });
  for (const r of ctx.rooms) {
    const want = below[r.id];
    if (want) check(r.typed
      ? `${r.name} is ${f2(r.sqm)} sq m as you sized it, below the Code's ${want} sq m.`
      : picked
        ? `${r.name} works out at ${f2(r.sqm)} sq m with the sizes picked, below the Code's ${want} sq m: make it larger, or another room smaller.`
        : `${r.name} works out at ${f2(r.sqm)} sq m, below the Code's ${want} sq m: is the carpet area right for ${BHKS.find((b) => b.id === bhk)?.label}?`, sum((l) => l.room === r.id));
  }
  if (ctx.rooms.some((r) => r.typed) && sqft(roomsSqm) !== sqft(plannedSqm)) check(`With your sizes the rooms and the passage come to ${sqft(roomsSqm)} sq ft, against the ${sqft(plannedSqm)} sq ft the carpet area leaves for them after the inside walls: check the sizes, or the carpet area.`, inRooms);
  if (ctx.on('furniture')) note(`The furniture is ${ctx.rooms.some((r) => r.kind === 'living') ? 'a sofa and a dining set for the living room, and ' : ''}a bed and a mattress for each bedroom; side tables, a study desk, rugs and bed linen are not in yet.`, section('furniture'));
  if (ctx.on('furnishings')) note(`The soft furnishings are curtains for each window of ${ctx.rooms.some((r) => r.kind === 'living') ? 'the living room and ' : ''}the bedrooms; blinds and cushions are not in yet.`, section('furnishings'));
  if (ctx.home === 'house' && !ctx.house) note('A house: its rooms inside are worked out as a flat\'s of the same carpet area and bedrooms. The terrace, the outside walls, the compound and the water tank are not in this estimate yet.', total);
  if (ctx.house) {
    const h = ctx.house, riser = h.floorToFloor / (2 * (R.house.stair.treads + 1)), unit = ctx.input.areaUnit === 'sqm' ? 'm' : 'ft';
    const side = (x: number) => (unit === 'm' ? f2(x) : f2(x * FT_PER_M));
    note('The structure\'s materials and labour are rules of thumb for each sq ft of built-up area (as reported). A structural engineer\'s design and quantities replace them; more floors, poor soil or seismic zone IV or V usually need more steel. IS 456\'s lowest grade of reinforced concrete is M25 in the ground and the rain, and M30 in coastal air, as in Mumbai and Chennai (as reported).', section('structure'));
    note(`The rooms are planned as one home of ${Math.round(carpetSqft)} sq ft of carpet area, the built-up area less the outer walls and the stairs; how they sit on each floor is not drawn yet.`, inRooms);
    if (!h.plot.fits) check(`Your plot, ${side(h.plot.l)} × ${side(h.plot.b)} ${unit}, is smaller than the house's outline, ${side(h.l)} × ${side(h.b)} ${unit}: check the plot's size, or the built-up area and the floors.`, section('outside'));
    note('The compound wall runs round all four sides of the plot and the paving covers all the open ground round the house: take off a side that a neighbour\'s wall already closes, or a garden left unpaved.', section('outside'));
    if (riser > 0.19 + 1e-9) check(`The stairs' risers come to ${Math.round(riser * 1000)} mm, above the Code's 190 mm for a house: a floor this tall needs more steps than the rule's ${2 * (R.house.stair.treads + 1)}.`, section('exterior'));
    note('Rainwater harvesting is one recharge pit with a filter: many cities require it on a new house and some size it by the roof, so check your city\'s rule.', section('water'));
    note('Not in this estimate yet: a borewell; the plan\'s approval fees, the labour cess and the electricity and water connections.', total);
    // The cities' range is read as a standard finish's (V1): outside it at Basic or Standard, or below it at any level,
    // the estimate is out of line and the flag goes with the answer; above it at Premium and up is to be expected.
    const c = R.cities.list.find((x) => x.id === ctx.input.city), range = R.cities.range, level = ctx.input.level as Level;
    if (c && (perSqft < c.cost[0] || perSqft > c.cost[1])) {
      const reported = `houses in ${c.name} ${range.for} are reported at Rs. ${inr(c.cost[0])}–${inr(c.cost[1])} a sq ft (as reported)`;
      if (perSqft < c.cost[0] || level <= range.upTo) check(`This estimate comes to Rs. ${inr(perSqft)} a sq ft of built-up area; ${reported}.`, total);
      else note(`At ${LEVEL_NAMES[level - 1]} this estimate comes to Rs. ${inr(perSqft)} a sq ft of built-up area; ${reported}, and dearer finishes cost more.`, total);
    }
  }
  // A flat's usual carpet area for its bedrooms: off it, the area typed may be the wrong one (V1). A new house's rooms are
  // what its floors leave, so the range is only a note there.
  const typical = R.programmes[bhk].typical;
  if (typical && (carpetSqft < typical[0] || carpetSqft > typical[1])) (ctx.house ? note : check)(`A ${BHKS.find((b) => b.id === bhk)?.label} is usually ${typical[0]}–${typical[1]} sq ft of carpet area; yours is ${Math.round(carpetSqft)}.`, total);
  // The paint against the carpet area checks the sizes typed; with the rooms as planned (and a house's stair walls) it is a note.
  const paint = lines.filter((l) => l.family === 'paint').reduce((s, l) => s + l.qty, 0);
  const ratio = paint / carpetSqft, [lo, hi] = R.checks.paintRatio;
  if (paint > 0 && (ratio < lo || ratio > hi)) (ctx.rooms.some((r) => r.typed) ? check : note)(`The walls and ceilings to paint come to ${ratio.toFixed(2)} times the carpet area, outside the usual ${lo}–${hi}: check the room sizes.`, sum((l) => l.family === 'paint'));
  if (factor === null) check('No city figure for your city: the rates are used as they are.', total);
  // An item with no rate is not in any amount: it comes after the flags with one.
  for (const u of unpriced) check(`${u.roomName}, ${u.name.toLowerCase()}: ${u.entryName} has no rate yet, so it is left out of the total.`, 0);
  // Sorted by what each is about, largest first; Array.prototype.sort is stable, so equal ones keep the order above.
  return out.sort((a, b) => b.n - a.n);
}

const money = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;
function disagreement(e: ArchitectEstimate, c: ArchitectCheck): string {
  for (const r of e.rooms) {
    const x = c.rooms.get(r.id);
    if (!x || Math.abs(x.sqm - r.sqm) > 1e-6 || Math.abs(x.len - r.l) > 1e-6 || Math.abs(x.wide - r.b) > 1e-6) return `the size of ${r.name}`;
  }
  if (c.rooms.size !== e.rooms.length) return 'the rooms';
  if (Math.abs(c.roomsSqm - e.roomsSqm) > 1e-6 || Math.abs(c.plannedSqm - e.plannedSqm) > 1e-6) return 'the area of the rooms';
  if (c.shares.size !== e.shares.length) return 'the shares of the carpet area';
  for (const x of e.shares) if (Math.abs((c.shares.get(x.id) ?? NaN) - x.share) > 1e-9) return `the share of ${x.name}`;
  if (c.lines.size !== e.lines.length) return 'the number of items';
  for (const l of e.lines) {
    const x = c.lines.get(l.key);
    if (!x) return `${l.roomName}, ${l.name}`;
    if (Math.abs(x.qty - l.qty) > 0.011) return `the quantity of ${l.roomName}, ${l.name}`;
    if (!money(x.rate, l.rate, 0.011)) return `the rate of ${l.roomName}, ${l.name}`;
    if (!money(x.amount, l.amount, 0.02 + l.rate * 0.011)) return `the amount of ${l.roomName}, ${l.name}`;
  }
  for (const s of e.sections) if (!money(s.amount, c.sections.get(s.id) ?? 0, 0.01 * (s.lines + 1) + 1e-6 * s.amount)) return `the section ${s.name}`;
  if (!money(e.total, c.total, 0.01 * (e.lines.length + 1) + 1e-6 * e.total)) return 'the total';
  for (const k of ['fixed', 'movable', 'appliance'] as ItemKind[]) {
    const n = e.lines.filter((l) => l.kind === k).length;
    if (!money(e.split[k], c.split[k], 0.01 * (n + 1) + 1e-6 * e.split[k])) return `the ${k === 'fixed' ? 'fixed works' : k === 'movable' ? 'movable items' : 'appliances'}`;
  }
  const stages = e.stages ?? [];
  if (stages.length !== c.stages.size) return 'the stages';
  for (const st of stages) if (!money(st.amount, c.stages.get(st.id) ?? NaN, 0.01 * (e.lines.length + 1) + 1e-6 * Math.abs(st.amount))) return `the stage ${st.name}`;
  if (e.range) {
    const r = c.range, tol = 0.01 * (e.range.of + 1) + 1e-6 * e.range.high;
    if (!r || r.lines !== e.range.lines || r.of !== e.range.of) return 'the items that offer a choice';
    if (!money(e.range.low, r.low, tol) || !money(e.range.high, r.high, tol)) return 'the range by the choices at the level';
  }
  return '';
}

export const levelName = (n: number) => LEVEL_NAMES[n - 1] ?? '';

/**
 * Each section's amount less the same section in the package (every slider, room level and own item set aside), for "Rs. X more
 * than the package". Worked twice: from the two estimates, and from the second computation's sections of the same two
 * inputs; blocked when they disagree.
 */
export function overPackage(input: ArchitectInput, check: typeof architectCheck = architectCheck): Record<string, number> | Needs | Blocked {
  const now = architect(input, check);
  if (!('total' in now)) return now;
  const pkgInput: ArchitectInput = { ...input, sliders: {}, items: {}, roomLevels: {} };
  const pkg = architect(pkgInput, check);
  if (!('total' in pkg)) return pkg;
  const c1 = check(input), c0 = check(pkgInput);
  const out: Record<string, number> = {};
  for (const s of now.sections) {
    const was = pkg.sections.find((x) => x.id === s.id) as SectionTotal;
    const over = r2(s.amount - was.amount), again = (c1.sections.get(s.id) ?? 0) - (c0.sections.get(s.id) ?? 0);
    if (!money(over, again, 0.01 * (s.lines + was.lines + 2) + 1e-6 * (s.amount + was.amount))) return { blocked: `The two computations disagree on the change in ${s.name}, so no figures are shown. Please report this.` };
    out[s.id] = over;
  }
  return out;
}

/** A line whose item changed, came or went: the item before and after (null when there was none, or is none). */
export interface Swap { roomName: string; name: string; from: string | null; to: string | null }
/**
 * What a change did (A8, "What changed"): the new total less the old, and the lines whose item changed, came or went;
 * and when a size word moved one room's share (R1), how much the other planned rooms changed: -0.074 for 7.4% smaller.
 */
export interface Change { by: number; swaps: Swap[]; others?: number }

/**
 * What a change did, from the estimate before it to the estimate after: the change in the total, worked twice (from the
 * two estimates, and from the second computation's totals of the same two inputs), and the lines whose item changed,
 * came or went. Blocked when the two computations disagree.
 */
export function changeOf(before: ArchitectInput, after: ArchitectInput, check: typeof architectCheck = architectCheck): Change | Needs | Blocked {
  const was = architect(before, check);
  if (!('total' in was)) return was;
  const now = architect(after, check);
  if (!('total' in now)) return now;
  const c0 = check(before), c1 = check(after);
  const by = r2(now.total - was.total), again = c1.total - c0.total;
  if (!money(by, again, 0.01 * (was.lines.length + now.lines.length + 2) + 1e-6 * (was.total + now.total))) return { blocked: 'The two computations disagree on what the change did, so no figures are shown. Please report this.' };
  const old = new Map(was.lines.map((l) => [l.key, l])), keys = new Set(now.lines.map((l) => l.key));
  const swaps: Swap[] = [];
  for (const l of now.lines) {
    const o = old.get(l.key);
    if (!o || o.entry !== l.entry) swaps.push({ roomName: l.roomName, name: l.name, from: o ? o.entryName : null, to: l.entryName });
  }
  for (const o of was.lines) if (!keys.has(o.key)) swaps.push({ roomName: o.roomName, name: o.name, from: o.entryName, to: null });
  // The knock-on of a size word, worked again from the second computation's rooms before and after.
  const others = knockOn(was, now);
  if (others !== undefined && othersOf(was, now).some((id) => !(Math.abs((c1.rooms.get(id)?.sqm ?? NaN) / (c0.rooms.get(id)?.sqm ?? NaN) - 1 - others) <= 1e-9)))
    return { blocked: 'The two computations disagree on how the other rooms changed, so no figures are shown. Please report this.' };
  return { by, swaps, ...(others !== undefined ? { others } : {}) };
}

/** The planned rooms a change left alone: in both estimates, of the same size word, and not of the user's own size in either. */
function othersOf(was: ArchitectEstimate, now: ArchitectEstimate): string[] {
  if (was.bhk !== now.bhk || Math.abs(was.carpetSqm - now.carpetSqm) > 1e-9) return [];
  const old = new Map(was.rooms.map((r) => [r.id, r]));
  return now.rooms.filter((r) => { const o = old.get(r.id); return !!o && r.word !== null && o.word === r.word && !r.typed && !o.typed; }).map((r) => r.id);
}
/**
 * The knock-on of a size word (R1): the other planned rooms' change in size, alike for each of them since they share what is
 * left; undefined when the carpet area, the bedrooms or no other room changed, or when they did not all change alike.
 */
function knockOn(was: ArchitectEstimate, now: ArchitectEstimate): number | undefined {
  const ids = othersOf(was, now);
  if (!ids.length) return undefined;
  const size = (e: ArchitectEstimate, id: string) => (e.rooms.find((r) => r.id === id) as Room).sqm;
  const ratios = ids.map((id) => size(now, id) / size(was, id));
  if (ratios.some((x) => Math.abs(x - ratios[0]) > 1e-9) || Math.abs(ratios[0] - 1) <= 1e-12) return undefined;
  return ratios[0] - 1;
}

/** An item the drawer offers: its specification, brands and unit, and its rate for the city (null: no rate yet). */
export interface Choice { id: string; name: string; spec: string; brands: string[]; unit: Unit; level: number | null; rate: number | null; how: string[] }
/**
 * What a line can be (L1): the family's item at each of the five levels (null where it has none); the choices at each level,
 * the level's item first and then the family's other items usually at that level; and the family's items at no level that
 * no level names.
 */
export interface Choices { key: string; family: string; fixed: boolean; ladder: (Choice | null)[]; levels: Choice[][]; others: Choice[] }

/**
 * The item drawer for a line of the estimate: the family's five-level ladder, the choices at each level and every other
 * item of the family, each priced by a unit the line's quantity can take, with its rate for the city. Each rate is worked
 * twice (library.ts and architect-check.ts); a rate the two disagree on is left out as if it had none. Null for a key not
 * in the estimate.
 */
export function choicesFor(input: ArchitectInput, key: string, rate2: typeof checkRate = checkRate): Choices | null {
  const parts = key.split(':'), rule = parts.slice(2).join(':'), fam = FAMILIES.get(parts[1]);
  if (!fam || parts.length < 3) return null;
  const units = UNIT_OF[dimensionOf(rule)], city = cityFactor(input.city ?? '') ?? 1;
  const choice = (id: string): Choice | null => {
    const e = ENTRIES.get(id);
    if (!e || !units.includes(e.unit)) return null;
    const p = price(id, city, R.gst.pct), again = rate2(id, input.city);
    const ok = !!p && again !== null && Math.abs(p.rate - again) <= 0.011;
    return { id, name: e.name, spec: e.spec, brands: e.brands ?? [], unit: e.unit, level: e.level ?? null, rate: ok ? (p as { rate: number }).rate : null, how: ok ? (p as { how: string[] }).how : [] };
  };
  const ladderIds = fam.fixed ? [fam.fixed] : [1, 2, 3, 4, 5].map((lv) => ladder(fam, lv));
  const levels = ([1, 2, 3, 4, 5] as Level[]).map((lv) => bandOf(fam, lv, units).map(choice).filter((c): c is Choice => !!c));
  const banded = new Set(levels.flat().map((c) => c.id));
  const others = choices(fam.id).filter((e) => !banded.has(e.id)).map((e) => choice(e.id)).filter((c): c is Choice => !!c);
  return { key, family: fam.id, fixed: !!fam.fixed, ladder: ladderIds.map((id) => (id ? choice(id) : null)), levels, others };
}

/**
 * A line of the bill of quantities for contractors to quote (E4a, D-UX-36): one item, its rooms and its quantity summed
 * over them. `brand` when the user chose one: rooms with another brand, or none, are a line of their own. The items with no rate yet are in it too, since a
 * contractor prices them all. No rate and no amount: the bill carries no figure of ours but the quantities.
 */
export interface BillLine { entry: string; item: string; spec: string; brands: string[]; brand?: string; rooms: string[]; qty: number; unit: Unit; keys: string[] }
export interface BillSection { id: string; name: string; lines: BillLine[] }

/** The bill of quantities: the estimate's sections in order, each item once in the order first met, the priced before those with no rate yet. */
export function billOf(e: ArchitectEstimate, brands: Record<string, string> = {}): BillSection[] {
  type Part = { key: string; roomName: string; section: string; entry: string; entryName: string; spec: string; brands: string[]; qty: number; unit: Unit };
  const parts: Part[] = [...e.lines, ...e.unpriced];
  return e.sections.filter((t) => t.on).map((t) => {
    const by = new Map<string, BillLine>();
    for (const p of parts.filter((x) => x.section === t.id)) {
      const brand = brands[p.key] && p.brands.includes(brands[p.key]) ? brands[p.key] : '';
      const id = `${p.entry}|${p.unit}|${brand}`;
      const b = by.get(id) ?? { entry: p.entry, item: p.entryName, spec: p.spec, brands: p.brands, ...(brand ? { brand } : {}), rooms: [], qty: 0, unit: p.unit, keys: [] };
      if (!b.rooms.includes(p.roomName)) b.rooms.push(p.roomName);
      b.qty = r2(b.qty + p.qty);
      b.keys.push(p.key);
      by.set(id, b);
    }
    return { id: t.id, name: t.name, lines: [...by.values()] };
  }).filter((x) => x.lines.length);
}
