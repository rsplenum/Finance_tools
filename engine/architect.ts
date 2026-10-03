/**
 * The engine as the architect (D-UX-18). From six answers (the work, flat or house or the floors, city, area, bedrooms,
 * level) it plans the rooms, places the doors and windows, measures every surface by the IS 1200 rules, puts in what each
 * room needs at each level from the library, prices it for the city, and adds it up by section, by room and at all five
 * levels. For a new house it first draws the outline from the built-up area and the floors, takes the outer walls and the
 * stairs off it for the rooms, and adds the structure (rules of thumb a sq ft), the terrace, the outside walls and the
 * stair railing (D-UX-23).
 * Pure, no DOM. Every rule is in engine/data/architect.json with its source or reason, and every rate in
 * engine/data/library/ with its source. architect-check.ts works every figure a second way; nothing is returned unless
 * both agree.
 */
import RULES from './data/architect.json';
import { CFT_PER_CUM, choices, ENTRIES, FAMILIES, LIBRARY_DATE, LIBRARY_STATUS, ladder, per, price, SQFT_PER_SQM, type Entry, type ItemKind, type Unit } from './library';
import { inr } from './util';
import { architectCheck, checkRate, type ArchitectCheck } from './architect-check';
import type { Blocked, Needs } from './dscr';

export type WorkKind = 'build' | 'renovate' | 'interiors';
export type Bhk = '1RK' | '1' | '2' | '3' | '4' | '5';
export type Level = 1 | 2 | 3 | 4 | 5;
export type RoomKind = 'living' | 'bedroom' | 'kitchen' | 'bath' | 'passage' | 'balcony';
export type OpeningType = 'main' | 'bedroom' | 'bath' | 'kitchen' | 'balcony' | 'window' | 'kitchenWindow' | 'ventilator';

interface Sourced { src: string[]; why: string }
interface Valued extends Sourced { value: number }
export interface Slot { family: string; section: string; qty: string; kinds?: WorkKind[]; needs?: string; name?: string; maxLevel?: number }
interface ProgrammeRoom { kind: RoomKind; name: string; ref: number; master?: boolean; attached?: boolean }
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
  cities: { list: { id: string; name: string; cost: [number, number] }[] } & Sourced;
  gst: { pct: number } & Sourced;
  checks: { paintRatio: [number, number] } & Sourced;
  house: {
    shape: { aspect: number } & Sourced; slab: { m: number } & Sourced; parapet: { m: number } & Sourced; terraceUpturn: { m: number } & Sourced;
    stair: { w: number; l: number; going: number; gap: number } & Sourced;
    thumb: { cement: number; steel: number; sand: number; aggregate: number; bricks: number } & Sourced;
  };
  templates: Record<'flat' | RoomKind, Slot[]>;
}
export const R = RULES as unknown as Rules;
export const LEVELS = R.levels;
export const SECTIONS = R.sections;
export const WORK_KINDS = R.kinds;
export const CITIES = R.cities.list;
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
}

export interface Room { id: string; kind: RoomKind; name: string; master: boolean; attached: boolean; sqm: number; l: number; b: number }
export interface Opening { id: string; type: OpeningType; room: string; other: string | null; w: number; h: number; sill: number; door: boolean }
export interface Line {
  key: string; room: string | null; roomName: string; section: string; family: string; name: string;
  entry: string; entryName: string; spec: string; brands: string[]; level: Level | null; chosen: boolean;
  qty: number; unit: Unit; rate: number; amount: number; kind: ItemKind; how: string; rateHow: string[]; sources: string[]; note?: string;
}
export interface Unpriced { key: string; roomName: string; name: string; entryName: string; qty: number; unit: Unit }
export interface SectionTotal { id: string; name: string; on: boolean; slider: boolean; level: Level | null; amount: number; lines: number }
export interface Assumption { what: string; shown: string; why: string; src: string[] }
/** A new house's outline: lengths in metres, areas in sq m, each floor alike. */
export interface House { floors: number; builtSqm: number; footprint: number; l: number; b: number; wall: number; stair: number; carpetSqm: number; floorToFloor: number }
export interface ArchitectEstimate {
  kind: WorkKind; property: 'flat' | 'house'; city: string; cityName: string; cityFactor: number; bhk: Bhk; level: Level; heightM: number;
  carpetSqm: number; carpetSqft: number;
  /** A new house's outline, and the area the cost a sq ft is of: the built-up area for a new house, else the carpet area. */
  house: House | null; per: 'built-up' | 'carpet';
  rooms: Room[]; openings: Opening[]; lines: Line[]; unpriced: Unpriced[];
  sections: SectionTotal[]; byRoom: { room: string | null; name: string; amount: number }[];
  total: number; perSqft: number; split: Record<ItemKind, number>;
  assumptions: Assumption[]; flags: string[]; ratesDate: string;
}

const LEVEL_NAMES = R.levels.map((l) => l.name);
// To the paisa, half up, an exact half kept from floating point (as library.ts).
const r2 = (x: number) => Math.round(x * 100 + 1e-6) / 100;
const f2 = (x: number) => x.toFixed(2);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const AREA_RULES = ['floor', 'floor-skirting', 'paint', 'feature', 'false-ceiling', 'bath-tiles', 'dado', 'wp-bath', 'wp-balcony', 'counter-top', 'wardrobe', 'loft', 'windows', 'shower-screen', 'protect', 'carpet', 'making-good', 'built-up', 'plinth', 'terrace', 'exterior-walls'];
const LENGTH_RULES = ['cove', 'counter-run', 'stair-railing'];
/** 'material': a structure's rule of thumb, in the material's own unit (bags, kg, cu m, bricks). */
export type Dimension = 'area' | 'length' | 'count' | 'material';
export const dimensionOf = (rule: string): Dimension => (AREA_RULES.includes(rule) || rule.startsWith('unit:') ? 'area' : LENGTH_RULES.includes(rule) ? 'length' : rule.startsWith('struct:') ? 'material' : 'count');
const UNIT_OF: Record<Dimension, Unit[]> = { area: ['sqft', 'sqm'], length: ['rft', 'm'], count: ['nos', 'set', 'lot'], material: ['bag', 'kg', 'cum', 'nos'] };

/** The city's factor: the middle of its construction cost against the average of the listed cities' middles. Null for a place not listed. */
export function cityFactor(id: string): number | null {
  const c = R.cities.list.find((x) => x.id === id);
  if (!c) return null;
  const mids = R.cities.list.map((x) => (x.cost[0] + x.cost[1]) / 2);
  return (c.cost[0] + c.cost[1]) / 2 / (mids.reduce((t, m) => t + m, 0) / mids.length);
}

/** The rooms of a flat: its programme's rooms scaled to the carpet area left after the passage and the walls; a balcony at its own size. */
export function planRooms(bhk: Bhk, carpetSqm: number): Room[] {
  const p = R.programmes[bhk];
  const share = 1 - R.shares.passage.value - R.shares.walls.value;
  const refs = p.rooms.reduce((t, r) => t + r.ref, 0);
  const out: Room[] = [];
  let bed = 0, bath = 0;
  for (const r of p.rooms) {
    const id = r.kind === 'bedroom' ? `bedroom-${++bed}` : r.kind === 'bath' ? `bath-${++bath}` : r.kind;
    out.push(room(id, r.kind, r.name, (carpetSqm * share * r.ref) / refs, !!r.master, !!r.attached));
  }
  out.push(room('passage', 'passage', 'Passage and foyer', carpetSqm * R.shares.passage.value, false, false));
  if (p.balcony > 0) out.push(room('balcony', 'balcony', 'Balcony', p.balcony / SQFT_PER_SQM, false, false));
  return out;
}
function room(id: string, kind: RoomKind, name: string, sqm: number, master: boolean, attached: boolean): Room {
  const l = Math.sqrt(sqm * R.aspect[kind]);
  return { id, kind, name, master, attached, sqm, l, b: sqm / l };
}

/**
 * A new house's outline from its built-up area (sq m) and floors: each floor a rectangle of the rule's proportions, its
 * outer walls one brick thick, and from two floors up a stair well on each floor. The carpet area left for the rooms is
 * the built-up area less the outer walls' and the stairs' footprints (A5, A13).
 */
export function houseOf(builtSqm: number, floors: number, H: number): House {
  const s = R.house, t = R.openings.walls.external / 1000;
  const footprint = builtSqm / floors, l = Math.sqrt(footprint * s.shape.aspect), b = footprint / l;
  const wall = 2 * t * (l + b) - 4 * t * t, stair = floors >= 2 ? s.stair.w * s.stair.l : 0;
  return { floors, builtSqm, footprint, l, b, wall, stair, carpetSqm: builtSqm - floors * (wall + stair), floorToFloor: H + s.slab.m };
}

/** Doors and windows: each in its own room's wall, a door's other side named; enough windows for a tenth of a habitable room's floor. */
export function planOpenings(rooms: Room[]): Opening[] {
  const out: Opening[] = [];
  const has = (id: string) => rooms.some((r) => r.id === id);
  const master = rooms.find((r) => r.master);
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
    if (r.kind === 'bath') { add('bath', r.id, r.attached && master ? master.id : 'passage'); add('ventilator', r.id, null); }
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
  if (build && floorsOk && areaOk && heightOk) {
    const sqm = input.areaUnit === 'sqm' ? (input.area as number) : (input.area as number) / SQFT_PER_SQM;
    const h = houseOf(sqm, input.floors as number, input.heightM ?? R.height.m);
    if (h.carpetSqm < sqm / 2) needs.push(`A larger built-up area: the outer walls and stairs of ${h.floors} floors take more than half of it`);
  }
  return needs;
}

/** The estimate, or what is needed, or blocked when the two computations disagree. `check` is for tests only. */
export function architect(input: ArchitectInput, check: typeof architectCheck = architectCheck): ArchitectEstimate | Needs | Blocked {
  const needs = architectNeeds(input);
  if (needs.length) return { needs };
  const e = work(input);
  const where = disagreement(e, check(input));
  return where ? { blocked: `The two computations disagree on ${where}, so no figures are shown. Please report this.` } : e;
}

/** The total at each of the five levels, the sliders and the user's own items set aside; or what blocks it. */
export function strip(input: ArchitectInput, check: typeof architectCheck = architectCheck): number[] | Needs | Blocked {
  const out: number[] = [];
  for (const level of [1, 2, 3, 4, 5] as Level[]) {
    const e = architect({ ...input, level, sliders: {}, items: {} }, check);
    if (!('total' in e)) return e;
    out.push(e.total);
  }
  return out;
}

interface Ctx {
  input: ArchitectInput; kind: WorkKind; home: 'flat' | 'house'; H: number; carpetSqm: number; rooms: Room[]; openings: Opening[];
  on: (section: string) => boolean; levelOf: (section: string) => Level; house: House | null;
}
/** Whether a section is shown for a kind of work. */
export const sectionFor = (section: string, kind: WorkKind) => { const k = R.sections.find((x) => x.id === section)?.kinds; return !k || k.includes(kind); };

function work(input: ArchitectInput): ArchitectEstimate {
  const kind = input.kind as WorkKind, bhk = input.bhk as Bhk, level = input.level as Level;
  const home = kind === 'build' || input.property === 'house' ? 'house' : 'flat', whole = `Whole ${home}`;
  const typedSqm = input.areaUnit === 'sqm' ? (input.area as number) : (input.area as number) / SQFT_PER_SQM;
  const factor = cityFactor(input.city as string);
  const city = factor ?? 1;
  const H = input.heightM ?? R.height.m;
  const house = kind === 'build' ? houseOf(typedSqm, input.floors as number, H) : null;
  const carpetSqm = house ? house.carpetSqm : typedSqm;
  const rooms = planRooms(bhk, carpetSqm), openings = planOpenings(rooms);
  const on = (s: string) => sectionFor(s, kind) && (input.sections?.[s] ?? R.kinds[kind].on.includes(s));
  const slider = (s: string) => R.sections.find((x) => x.id === s)?.slider ?? false;
  const levelOf = (s: string): Level => (slider(s) ? input.sliders?.[s] ?? level : level);
  const ctx: Ctx = { input, kind, home, H, carpetSqm, rooms, openings, on, levelOf, house };

  const lines: Line[] = [], unpriced: Unpriced[] = [];
  const place = (slot: Slot, r: Room | null) => {
    if (!on(slot.section) || (slot.kinds && !slot.kinds.includes(kind)) || (slot.needs && !on(slot.needs))) return;
    const fam = FAMILIES.get(slot.family);
    if (!fam) throw new Error(`No family ${slot.family} in the library`);
    const isSlider = slider(slot.section) && !fam.fixed;
    const lv = Math.min(levelOf(slot.section), slot.maxLevel ?? 5) as Level;
    const key = `${r?.id ?? 'flat'}:${slot.family}:${slot.qty}`;
    const own = input.items?.[key];
    const id = own && ENTRIES.has(own) ? own : ladder(fam, lv);
    if (!id) return;
    const m = measure(slot.qty, r, lv, ctx);
    if (m.base <= 0) return;
    const ent = ENTRIES.get(id) as Entry;
    const dim = dimensionOf(slot.qty);
    if (!UNIT_OF[dim].includes(ent.unit)) throw new Error(`${id} is priced by ${ent.unit}, but ${slot.qty} gives ${dim}`);
    const qty = r2(dim === 'count' || dim === 'material' ? m.base : m.base * per(dim === 'area' ? 'sqm' : 'm', ent.unit));
    const roomName = r?.name ?? whole;
    const name = slot.name ?? fam.name;
    const p = price(id, city, R.gst.pct);
    if (!p) { unpriced.push({ key, roomName, name, entryName: ent.name, qty, unit: ent.unit }); return; }
    lines.push({
      key, room: r?.id ?? null, roomName, section: slot.section, family: slot.family, name, entry: id, entryName: ent.name, spec: ent.spec,
      brands: ent.brands ?? [], level: isSlider ? lv : null, chosen: !!own && ENTRIES.has(own), qty, unit: ent.unit, rate: p.rate, amount: r2(qty * p.rate),
      kind: fam.kind ?? 'fixed', how: m.how, rateHow: p.how, sources: [...new Set([...ent.src, ...partSources(ent)])], ...(ent.note ? { note: ent.note } : {}),
    });
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
  const perSqft = r2(total / (house ? house.builtSqm * SQFT_PER_SQM : carpetSqft));
  const split = { fixed: 0, movable: 0, appliance: 0 } as Record<ItemKind, number>;
  for (const l of lines) split[l.kind] = r2(split[l.kind] + l.amount);
  const cityName = R.cities.list.find((c) => c.id === input.city)?.name ?? 'Other';
  return {
    kind, property: home, city: input.city as string, cityName, cityFactor: city, bhk, level, heightM: H, carpetSqm, carpetSqft,
    house, per: house ? 'built-up' : 'carpet',
    rooms, openings, lines, unpriced, sections, byRoom, total, perSqft, split,
    assumptions: assumptions(ctx, bhk, cityName, factor), flags: flags(ctx, bhk, carpetSqft, lines, unpriced, factor, perSqft), ratesDate: LIBRARY_DATE,
  };
}

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

function tileHeight(ctx: Ctx): number {
  if (!ctx.on('bathrooms')) return Math.min(R.tileHeights.existing / 1000, ctx.H);
  const t = R.tileHeights.mm[ctx.levelOf('bathrooms') - 1];
  return t === 'ceiling' ? ctx.H : Math.min(t / 1000, ctx.H);
}
const counterRun = (r: Room) => r.l + r.b - R.kitchen.depth;
const featureArea = (r: Room, ctx: Ctx) => {
  if (!ctx.on('walls')) return 0;
  const lv = ctx.levelOf('walls');
  if (r.kind === 'living' && lv >= R.feature.living) return r.l * ctx.H;
  if (r.kind === 'bedroom' && r.master && lv >= R.feature.master) return r.b * ctx.H;
  return 0;
};
const bathHasCeiling = (ctx: Ctx) => { const f = FAMILIES.get('bath-ceiling'); return ctx.on('bathrooms') && !!f && !!ladder(f, ctx.levelOf('bathrooms')); };
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
    if (ctx.house) { const m = measureHouse(rule, ctx.house); if (m) return m; }
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
        const th = tileHeight(ctx);
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
      const ceiling = r.kind === 'bath' && bathHasCeiling(ctx) ? 0 : r.sqm;
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
      const th = tileHeight(ctx);
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
 * A new house's own quantities: the structure's materials by the rules of thumb a sq ft of built-up area (in their own
 * units), its labour and the anti-termite treatment by area, the terrace inside the parapet with the upturn, the outside
 * walls of every floor and the parapet, and the stair railing between floors. Null for a rule that is not the house's.
 */
function measureHouse(rule: string, h: House): { base: number; how: string } | null {
  const s = R.house, t = R.openings.walls.external / 1000, sqft = h.builtSqm * SQFT_PER_SQM;
  const floors = `${h.floors} floor${h.floors > 1 ? 's' : ''}`;
  if (rule === 'built-up') return { base: h.builtSqm, how: `The built-up area of ${floors}: ${f2(h.builtSqm)} sq m` };
  if (rule === 'plinth') return { base: h.footprint, how: `The ground floor's outline, ${f2(h.l)} × ${f2(h.b)} m: ${f2(h.footprint)} sq m` };
  if (rule.startsWith('struct:')) {
    const what = rule.slice(7) as 'cement' | 'steel' | 'sand' | 'aggregate' | 'bricks', each = s.thumb[what], n = each * sqft;
    if (what === 'sand' || what === 'aggregate') return { base: n / CFT_PER_CUM, how: `${each} cft a sq ft × ${f2(sqft)} sq ft of built-up area = ${f2(n)} cft = ${f2(n / CFT_PER_CUM)} cu m` };
    const word = what === 'cement' ? 'bags' : what === 'steel' ? 'kg' : 'bricks';
    return { base: n, how: `${each} ${word} a sq ft × ${f2(sqft)} sq ft of built-up area = ${f2(n)} ${word}` };
  }
  const li = h.l - 2 * t, bi = h.b - 2 * t, inner = 2 * (li + bi);
  if (rule === 'terrace') {
    const roof = li * bi, edge = inner * s.terraceUpturn.m;
    return { base: roof + edge, how: `The roof inside the parapet, ${f2(li)} × ${f2(bi)} m = ${f2(roof)} sq m, and ${f2(inner)} m × ${s.terraceUpturn.m} m up the parapet = ${f2(edge)} sq m` };
  }
  if (rule === 'exterior-walls') {
    // IS 1200: openings up to 3 sq m come off one face only, the inside's (as `paint` measures it), so none off the outside.
    const P = 2 * (h.l + h.b), up = h.floors * h.floorToFloor + s.parapet.m, a = P * up + inner * s.parapet.m;
    return { base: a, how: `Outside ${f2(P)} m × (${floors} × ${f2(h.floorToFloor)} m + a ${f2(s.parapet.m)} m parapet) = ${f2(P * up)} sq m, and the parapet's inside ${f2(inner)} m × ${f2(s.parapet.m)} m = ${f2(inner * s.parapet.m)} sq m; openings come off the inside only (IS 1200)` };
  }
  if (rule === 'stair-railing') {
    const runs = h.floors - 1;
    if (runs < 1) return { base: 0, how: '' };
    const flight = Math.sqrt(s.stair.going ** 2 + (h.floorToFloor / 2) ** 2), len = runs * (2 * flight + s.stair.gap);
    return { base: len, how: `${runs} stair${runs > 1 ? 's' : ''}, each two flights of ${f2(flight)} m (${f2(s.stair.going)} m along, ${f2(h.floorToFloor / 2)} m up) and ${f2(s.stair.gap)} m at the landing: ${f2(len)} m` };
  }
  return null;
}

function assumptions(ctx: Ctx, bhk: Bhk, cityName: string, factor: number | null): Assumption[] {
  const p = R.programmes[bhk], sqft = (x: number) => Math.round(x * SQFT_PER_SQM);
  const rooms = ctx.rooms.map((r) => `${r.name} ${sqft(r.sqm)} sq ft`).join('; ');
  const baths = ctx.rooms.filter((r) => r.kind === 'bath').length;
  const on = R.sections.filter((s) => ctx.on(s.id)).map((s) => s.name).join(', ');
  const h = ctx.house, hs = R.house, th = hs.thumb;
  return [
    ...(h ? [
      { what: 'The house', shown: `${FLOORS[h.floors - 1].label}: ${h.floors} floor${h.floors > 1 ? 's' : ''} of ${sqft(h.footprint)} sq ft, ${f2(h.l)} × ${f2(h.b)} m outside with ${R.openings.walls.external} mm outer walls${h.stair ? `, and a ${hs.stair.w} × ${hs.stair.l} m stair on each floor` : ''}; ${sqft(h.carpetSqm)} sq ft of carpet area left for the rooms`, why: `${hs.shape.why}${h.stair ? ` ${hs.stair.why}` : ''}`, src: [...hs.shape.src, ...(h.stair ? hs.stair.src : [])] },
      { what: 'Floor to floor', shown: `${f2(h.floorToFloor)} m: the ceiling and a ${hs.slab.m * 1000} mm slab; a ${f2(hs.parapet.m)} m parapet on the terrace`, why: `${hs.slab.why} ${hs.parapet.why}`, src: [...hs.slab.src, ...hs.parapet.src] },
      { what: 'Structure', shown: `For each sq ft of built-up area: ${th.cement} bags of cement, ${th.steel} kg of steel, ${th.sand} cft of sand, ${th.aggregate} cft of aggregate and ${th.bricks} bricks, and the labour by stage`, why: th.why, src: th.src },
    ] : []),
    { what: 'Rooms', shown: rooms, why: `${p.why} ${R.shares.passage.why} ${R.shares.walls.why}`, src: [...p.src, ...R.shares.passage.src] },
    { what: 'Bathrooms', shown: `${baths}`, why: R.bathrooms.why, src: R.bathrooms.src },
    { what: 'Ceiling height', shown: `${f2(ctx.H)} m`, why: R.height.why, src: R.height.src },
    { what: 'Sections', shown: on, why: R.kinds[ctx.kind].why, src: ['own'] },
    { what: 'City', shown: factor === null ? `${cityName}: no city figure, so the rates are used as they are` : `${cityName}: labour and fitted rates × ${factor.toFixed(3)}`, why: R.cities.why, src: R.cities.src },
    { what: 'Rates', shown: `As reported on ${LIBRARY_DATE.split('-').reverse().join('-')}, the middle of each range`, why: LIBRARY_STATUS, src: [] },
    { what: 'Doors and windows', shown: 'Main door 1000 mm, bedroom doors 900 mm, bathroom doors 750 mm, all 2100 mm high; 4 × 4 ft windows, at least a tenth of each room\'s floor', why: `${R.openings.windowShare.why}`, src: [...R.openings.main.src, ...R.openings.windowShare.src] },
    { what: 'Electrical points', shown: 'By the room: a 2BHK about 40, a 3BHK about 50', why: R.points.why, src: R.points.src },
  ];
}

function flags(ctx: Ctx, bhk: Bhk, carpetSqft: number, lines: Line[], unpriced: Unpriced[], factor: number | null, perSqft: number): string[] {
  const out: string[] = [];
  const min = R.minimums;
  for (const r of ctx.rooms) {
    const want = r.kind === 'living' || r.kind === 'bedroom' ? min.habitable : r.kind === 'kitchen' ? min.kitchen : r.kind === 'bath' ? min.bath : 0;
    if (want && r.sqm < want - 1e-9) out.push(`${r.name} works out at ${f2(r.sqm)} sq m, below the Code's ${want} sq m: is the carpet area right for ${BHKS.find((b) => b.id === bhk)?.label}?`);
  }
  if (ctx.home === 'house' && !ctx.house) out.push('A house: its rooms inside are worked out as a flat\'s of the same carpet area and bedrooms. The terrace, the outside walls, the compound and the water tank are not in this estimate yet.');
  if (ctx.house) {
    out.push('The structure\'s materials and labour are rules of thumb for each sq ft of built-up area (as reported). A structural engineer\'s design and quantities replace them; more floors, poor soil or seismic zone IV or V usually need more steel.');
    out.push(`The rooms are planned as one home of ${Math.round(carpetSqft)} sq ft of carpet area, the built-up area less the outer walls${ctx.house.stair ? ' and the stairs' : ''}; how they sit on each floor is not drawn yet.`);
    out.push(`Not in this estimate yet: the compound wall, gate and paving; the sump, overhead tank, septic tank or sewer connection, borewell and rainwater harvesting; ${ctx.house.stair ? 'the stairs\' finish, ' : ''}a stair to the terrace and its cabin; the plan's approval fees, the labour cess and the electricity and water connections.`);
    const c = R.cities.list.find((x) => x.id === ctx.input.city);
    if (c && (perSqft < c.cost[0] || perSqft > c.cost[1])) out.push(`This estimate comes to Rs. ${inr(perSqft)} a sq ft of built-up area; houses in ${c.name} are reported at Rs. ${inr(c.cost[0])}–${inr(c.cost[1])} a sq ft (as reported), and this estimate leaves out the outside works and the water.`);
  }
  const typical = R.programmes[bhk].typical;
  if (typical && (carpetSqft < typical[0] || carpetSqft > typical[1])) out.push(`A ${BHKS.find((b) => b.id === bhk)?.label} is usually ${typical[0]}–${typical[1]} sq ft of carpet area; yours is ${Math.round(carpetSqft)}.`);
  const paint = lines.filter((l) => l.family === 'paint').reduce((s, l) => s + l.qty, 0);
  const ratio = paint / carpetSqft, [lo, hi] = R.checks.paintRatio;
  if (paint > 0 && (ratio < lo || ratio > hi)) out.push(`The walls and ceilings to paint come to ${ratio.toFixed(2)} times the carpet area, outside the usual ${lo}–${hi}: check the room sizes.`);
  if (factor === null) out.push('No city figure for your city: the rates are used as they are.');
  for (const u of unpriced) out.push(`${u.roomName}, ${u.name.toLowerCase()}: ${u.entryName} has no rate yet, so it is left out of the total.`);
  out.push('Rates are as reported by their sources and not yet checked against them: a planning estimate, until a contractor, architect or engineer adopts it.');
  return out;
}

const money = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;
function disagreement(e: ArchitectEstimate, c: ArchitectCheck): string {
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
  return '';
}

export const levelName = (n: number) => LEVEL_NAMES[n - 1] ?? '';

/**
 * Each section's amount less the same section in the package (every slider and own item set aside), for "Rs. X more
 * than the package". Worked twice: from the two estimates, and from the second computation's sections of the same two
 * inputs; blocked when they disagree.
 */
export function overPackage(input: ArchitectInput, check: typeof architectCheck = architectCheck): Record<string, number> | Needs | Blocked {
  const now = architect(input, check);
  if (!('total' in now)) return now;
  const pkgInput: ArchitectInput = { ...input, sliders: {}, items: {} };
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

/** An item the drawer offers: its specification, brands and unit, and its rate for the city (null: no rate yet). */
export interface Choice { id: string; name: string; spec: string; brands: string[]; unit: Unit; level: number | null; rate: number | null; how: string[] }
/** What a line can be: the family's item at each of the five levels (null where it has none), and its other items. */
export interface Choices { key: string; family: string; fixed: boolean; ladder: (Choice | null)[]; others: Choice[] }

/**
 * The item drawer for a line of the estimate: the family's five-level ladder and every other item of the family that is
 * priced by a unit the line's quantity can take, each with its rate for the city. Each rate is worked twice (library.ts
 * and architect-check.ts); a rate the two disagree on is left out as if it had none. Null for a key not in the estimate.
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
  const named = new Set(ladderIds.filter((x): x is string => !!x));
  const others = choices(fam.id).filter((e) => !named.has(e.id)).map((e) => choice(e.id)).filter((c): c is Choice => !!c);
  return { key, family: fam.id, fixed: !!fam.fixed, ladder: ladderIds.map((id) => (id ? choice(id) : null)), others };
}
