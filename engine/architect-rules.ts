/**
 * The architect's rules that the six questions need (UXR7): the rules file's lists, what the estimate still needs, a new
 * house's outline, the programme's bedrooms and bathrooms, the size words' and levels' names. Only engine/data/architect.json,
 * never the library, so the estimate's page can ask its questions before the library loads. Pure, no DOM; architect.ts
 * re-exports all of it, so nothing that imports the engine changes.
 */
import RULES from './data/architect.json';
import { SQFT_PER_SQM } from './units';
import type { ArchitectInput, Bhk, ExtraKind, House, Rules, SizeWord, WorkKind } from './architect';

export const R = RULES as unknown as Rules;
export const LEVELS = R.levels;
export const SECTIONS = R.sections;
export const WORK_KINDS = R.kinds;
export const CITIES = R.cities.list;
/** The four size words, in order (R1). */
export const SIZE_WORDS = R.sizes.words;
export const WORD_AT = new Map(R.sizes.words.map((w) => [w.id, w.at]));
export const BHKS: { id: Bhk; label: string }[] = [
  { id: '1RK', label: '1 RK' }, { id: '1', label: '1 BHK' }, { id: '2', label: '2 BHK' }, { id: '3', label: '3 BHK' }, { id: '4', label: '4 BHK' }, { id: '5', label: '5 BHK' },
];
/** A new house's floors (A3): the ground floor only, or up to three more. */
export const FLOORS: { n: number; label: string }[] = [{ n: 1, label: 'Ground only' }, { n: 2, label: 'G+1' }, { n: 3, label: 'G+2' }, { n: 4, label: 'G+3' }];
/** An extension's floors being added on top (E5b): one or two. */
export const FLOORS_ADDED: { n: number; label: string }[] = R.house.extension.floors.map((n) => ({ n, label: n === 1 ? 'One floor' : 'Two floors' }));
/** Whether a kind of work builds a house's floors: a new house, or an extension's floors on top. */
export const builds = (kind?: WorkKind) => kind === 'build' || kind === 'extend';

/** The sides a room's own size can take, in metres. */
export const ROOM_SIDE = { min: 0.3, max: 30 };
/** The rooms a home may add (R2b), in the order they are planned and offered. */
export const EXTRAS: ExtraKind[] = R.extras.map((x) => x.kind);
/** How many bathrooms a home can take (R2). */
export const BATHS = { min: 1, max: 8 };
/** The sides a plot can take, in metres. */
export const PLOT_SIDE = { min: 3, max: 300 };

export const LEVEL_NAMES = R.levels.map((l) => l.name);

export const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

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

/** The ids of a BHK's bedrooms, the main one first: bedroom-1, bedroom-2… */
export const bedroomsOf = (bhk: Bhk): string[] => R.programmes[bhk].rooms.filter((r) => r.kind === 'bedroom').map((_, i) => `bedroom-${i + 1}`);
/** The programme's bathrooms (R2): each the id of the bedroom it is attached to (the main bedroom's for one marked attached), or null. */
export function bathsOf(bhk: Bhk): (string | null)[] {
  const p = R.programmes[bhk], main = p.rooms.filter((r) => r.kind === 'bedroom').findIndex((r) => r.master);
  return p.rooms.filter((r) => r.kind === 'bath').map((r) => (r.attached ? `bedroom-${main + 1}` : null));
}

/**
 * A new house's outline from its built-up area (sq m) and floors: each floor a rectangle of the rule's proportions, its
 * outer walls one brick thick, and a stair well on each floor, the top one rising to a cabin on the terrace. The carpet
 * area left for the rooms is the built-up area less the outer walls' and the stairs' footprints (A5, A13). The plot is
 * the user's, or the outline with the rule's margins round it (E5).
 */
export function houseOf(builtSqm: number, floors: number, H: number, own?: { l: number; b: number }, added = false): House {
  const s = R.house, t = R.openings.walls.external / 1000, m = s.plot;
  const footprint = builtSqm / floors, l = Math.sqrt(footprint * s.shape.aspect), b = footprint / l;
  const wall = 2 * t * (l + b) - 4 * t * t, stair = s.stair.w * s.stair.l;
  const pl = own ? Math.max(own.l, own.b) : l + m.front + m.rear, pb = own ? Math.min(own.l, own.b) : b + 2 * m.side;
  const plot = { l: pl, b: pb, sqm: pl * pb, own: !!own, fits: l <= pl + 1e-9 && b <= pb + 1e-9 };
  return { floors, added, builtSqm, footprint, l, b, wall, stair, carpetSqm: builtSqm - floors * (wall + stair), floorToFloor: H + s.slab.m, cabin: stair, plot };
}

/** What the estimate needs before it can be worked out, in the order asked. */
export function architectNeeds(input: ArchitectInput): string[] {
  const needs: string[] = [];
  const build = builds(input.kind), extend = input.kind === 'extend', most = extend ? Math.max(...R.house.extension.floors) : FLOORS.length;
  const floorsOk = isNum(input.floors) && Number.isInteger(input.floors) && input.floors >= 1 && input.floors <= most;
  if (!input.kind || !(input.kind in R.kinds)) needs.push('What the work is: build a new house, add a floor or rooms, repair or renovate, or interiors');
  if (build && !floorsOk) needs.push(extend ? 'How many floors are being added' : 'How many floors');
  if (!input.city) needs.push('Which city');
  const areaOk = isNum(input.area) && input.area > 0;
  if (!areaOk) needs.push(extend ? 'The built-up area being added' : build ? 'The built-up area of all floors' : 'The carpet area');
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
  if (input.extras !== undefined && !(Array.isArray(input.extras) && input.extras.every((x) => EXTRAS.includes(x)) && new Set(input.extras).size === input.extras.length))
    needs.push(`The added rooms: ${R.extras.map((x) => x.name.toLowerCase()).join(', ')}, each at most once`);
  const plotSide = (x: unknown) => isNum(x) && x >= PLOT_SIDE.min && x <= PLOT_SIDE.max;
  if (input.plot && (!plotSide(input.plot.l) || !plotSide(input.plot.b))) needs.push(`Each side of the plot from ${PLOT_SIDE.min} to ${PLOT_SIDE.max} m`);
  if (build && floorsOk && areaOk && heightOk) {
    const sqm = input.areaUnit === 'sqm' ? (input.area as number) : (input.area as number) / SQFT_PER_SQM;
    const h = houseOf(sqm, input.floors as number, input.heightM ?? R.height.m, undefined, extend);
    if (h.carpetSqm < sqm / 2) needs.push(`A larger built-up area: the outer walls and stairs of ${h.floors} floor${h.floors > 1 ? 's' : ''} take more than half of it`);
  }
  return needs;
}

/** A size word's name: "Above medium". */
export const wordName = (w: SizeWord) => R.sizes.words.find((x) => x.id === w)?.name ?? '';

export const levelName = (n: number) => LEVEL_NAMES[n - 1] ?? '';
