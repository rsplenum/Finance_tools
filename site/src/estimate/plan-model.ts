/**
 * The planning estimate's page (E1, E3), apart from the page (as dscr/model.ts): the six answers to the engine's input
 * (engine/architect.ts), and its answer to words, with the engine's exact figures beside them for the Excel copy. Pure,
 * no DOM. Every figure comes from the engine: the estimate, the five levels (the strip and Compare), the change from the
 * package, what the last change did and the drawer's rates are each worked out twice there; this file only words, groups
 * and orders them. The rooms' own sizes, and a new house's plot (E5), are typed in the page's unit and passed on in metres;
 * a room's size word (R1) is passed on as it is, Medium left out. Rooms added or taken out (R2) move the rooms' own sizes,
 * words, levels and items with them. The state, the questions and the changes are plan-state.ts's, re-exported here;
 * this file, with the library and the working, loads after the questions (plan-work.ts, UXR7).
 */
import {
  BATHS, CITIES, EXTRAS, FLOORS, FLOORS_ADDED, PARTS, R, billOf, WORK_KINDS, architect, changeOf, choicesFor, levelName, levelRuns, overPackage, planRooms,
  type ArchitectEstimate, type ArchitectInput, type Bhk, type Change, type Choice, type ExtraKind, type House, type Level, type LevelRuns, type Line, type Part, type RoomKind, type SizeWord, type Stage, type WorkKind,
} from '../../../engine/architect';
import { overdueNote, todayIso } from '../../../engine/review';
import { CLASSES, FT_PER_M, LIBRARY_DATE, LIBRARY_REVIEW_BY, NOTES, PER, SOURCE, SPEND_SAVE, SQFT_PER_SQM, namesBrand, type ItemKind, type Note, type Unit } from '../../../engine/library';
import { inr, lakhCrore, rupeesWords } from '../../../engine/util';

export * from './plan-state';
import { BHK_CHOICES, LEVEL_NAMES, dmy, groupKey, inputOf, planNeeds, plotRange, plotSideOf, qtyText, same, sideOf, sideRange, sideUnit, type Made, type PlanState } from './plan-state';


// ---- Words ----

const UNIT_SHORT: Record<Unit, string> = { sqft: 'sq ft', sqm: 'sq m', rft: 'rft', m: 'm', nos: 'nos', set: 'set', lot: 'lot', kg: 'kg', cum: 'cum', bag: 'bag', litre: 'litres' };
const UNIT_RATE = PER;
export const unitText = (u: Unit) => UNIT_SHORT[u];
/** Whole rupees, grouped the Indian way. */
const rupees = (n: number) => inr(n);
/** A rate to the paisa where it has paise. */
const rateText = (n: number) => inr(n, Number.isInteger(n) ? 0 : 2);
/** A line's quantity as estimates show it: areas and lengths to two places, counts whole. */
const lineQty = (n: number, u: Unit) => (['nos', 'set', 'lot', 'bag', 'kg', 'litre'].includes(u) && Number.isInteger(n) ? inr(n) : inr(n, 2));
export const rateWords = (n: number, u: Unit) => `₹${rateText(n)} ${UNIT_RATE[u]}`;
/** One rule for writing figures on screen (UX8, review finding 4): full rupees in tables, "₹" in the column head; a
 * summary chip (the strip, Compare) in lakh to two places, its unit in its group's head, so five fit across a phone. */
export const lakhs = (n: number) => inr(n / 1e5, 2);
/** The headline (UX8, review finding 5): as precise as the estimate, lakh to one place, crore to two; under a lakh to the
 * rupee. The bill and the documents keep the rupee, and the page says so. */
export const roundRupees = (n: number) => lakhCrore(n, { places: 1, about: false });
/** The kinds of item, on screen and in the documents alike: "Appliances" already names a section, so the kind takes
 * its own word (UX4, review finding 5; the documents since UX5, D-UX-87). */
const KIND_WORD: Record<ItemKind, string> = { fixed: 'Fixed works', movable: 'Movable items', appliance: 'Equipment' };
/** The engine writes the carpet area in a flag as a bare number ("yours is 1000"); on screen it is grouped as every figure is (UX4, finding 10). */
const groupedFlag = (t: string) => t.replace(/\byours is (\d{4,})\b/g, (_, n: string) => `yours is ${inr(Number(n))}`);
export const TITLE: Record<WorkKind, string> = { build: 'Estimate of cost of construction', extend: 'Estimate of cost of an extension', renovate: 'Estimate of cost of renovation', interiors: 'Estimate of cost of interiors and furnishing' };
/** A part on its own (D-UX-276): its document's title, and what its cost a sq ft is of. */
const PART_TITLE: Record<Part, string> = { kitchen: 'Estimate of cost of kitchen renovation', bathrooms: 'Estimate of cost of bathroom renovation', paint: 'Estimate of cost of painting' };
const PER_NAME: Record<ArchitectEstimate['per'], string> = { 'built-up': 'Built-up area', carpet: 'Carpet area', kitchen: 'The kitchen’s floor', bathrooms: 'The bathrooms’ floors' };
/** A part's rooms, or null for every room. */
const partRooms = (e: ArchitectEstimate) => (e.part ? PARTS.find((x) => x.id === e.part)?.rooms ?? null : null);

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
  /** A line's item names a brand, so the brand notice goes with its items (D-BIZ-05); an open drawer's brands: `drawerBrands`. */
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
  /** R2: whether it can be taken out (a bedroom but a 1 RK's room, a bathroom but the last, the balcony, an added room); for a bedroom, whether a bathroom is attached to it. */
  out: boolean; bedroom: boolean; attached: boolean;
  /** The sides as typed (empty when not), and the planned ones for the fields' placeholders, in the page's unit. */
  l: string; b: string; planned: { l: string; b: string };
  /** Why a typed size is not used yet, or nothing. */
  bad?: string;
}
/** A part of the carpet area in the bar of shares (R1): its share in words, and its width on the bar out of 100. */
export interface ShareView { id: string; name: string; kind: RoomKind | 'walls'; share: string; width: number }
/** The size words for the buttons, in order. */
/** One amount in Compare: in lakh for the table, in full for its label; `mine` marks the level the estimate is at. */
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
  /** What the cost a sq ft is of: the area, or a part's own floor (D-UX-276). */
  perName: string;
  total: string; perSqft: string; words: string; n: { total: number; perSqft: number };
  /** The total as the headline shows it, rounded (UX8): `roundRupees`. */
  headline: string;
  strip: StripView[]; bar: BarView[]; sections: SectionView[];
  rooms: RoomView[]; roomsNote?: string; compare: CompareView; change?: ChangeView;
  /** The bar of shares: each room's, the passage's and the inside walls' share of the carpet area (R1). */
  shares: ShareView[];
  /** The rooms that can be added (R2): a bedroom up to 5, a bathroom up to the limit, the balcony when taken out; the added rooms not yet in, in order (R2b). */
  add: { bedroom: boolean; bath: boolean; balcony: boolean; extras: { kind: ExtraKind; name: string }[] };
  /** A new house's stages, adding up to the total, the loan they are for (an extension's too, E5b), and a new house's plot. */
  stages?: StageView[]; loan?: 'construction' | 'extension'; plot?: PlotView;
  /** Fixed works, movable items and appliances, when there is more than fixed works. */
  split?: { label: string; amount: string; n: number }[];
  /** What to check (V1): the flags that can change the decision, shown with the answer, and the rest, one tap away; each largest first. */
  assumed: AssumedView[]; flags: string[]; notes: string[]; unpriced: string[];
  /** One line by the total: a planning estimate, its rates as reported on their date for the city, and how many lines were checked against their pages (E2). */
  ratesLine: string; ratesDate: string;
  /** One line under the total (L1): the chosen level's range, from the cheapest priced choice at it in every item to the dearest; empty with no items. */
  range: { text: string; low: number; high: number; lines: number; of: number };
  /** The range as a bar on screen (UX8, review finding 5): its ends rounded as the headline, the total's place on it in
   * per cent when it lies between them, and the words under it; absent when no item offers a choice. */
  rangeBar?: { low: string; high: string; at?: number; text: string };
  /** Every source the lines and the assumptions use, numbered in order of first use, and what each class means; on the page only. */
  sources: SourceView[]; classes: { id: string; means: string }[];
  /** The bill of quantities for quotes (E4a): each item once with its rooms and summed quantity; no rate or amount of ours. */
  bill: BillView[];
}
export interface BillView { no: number; name: string; lines: { no: string; item: string; where: string; qty: string; unit: string; n: { qty: number } }[] }
/** `working`: every answer is in and the working is still loading (plan-work.ts). */
export interface PlanPreview { needs: string[]; blocked?: string; view?: PlanView; working?: true }

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
      ...(Math.round(d) !== 0 ? { over: { text: `₹${rupees(Math.abs(d))} ${d > 0 ? 'more' : 'less'} than ${pkg}`, n: d } } : {}),
      spec: specOf(ls), where: whereOf(ls, e), mixed: chosen + roomLevel, mixedText: mixedText ? `Mixed (${mixedText})` : '', lines,
      ...(SECTION_WHY.has(t.id) ? { why: SECTION_WHY.get(t.id) } : {}),
      brands: ls.some((l) => namesBrand(l.entryName, l.brands)),
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
  const kind = e.part ? (PARTS.find((x) => x.id === e.part)?.name ?? WORK_KINDS[e.kind].label) : WORK_KINDS[e.kind].label, bhk = BHK_CHOICES.find((b) => b.value === e.bhk)?.label ?? e.bhk;
  const home = e.house ? (e.house.added ? `${FLOORS_ADDED[e.house.floors - 1].label} added` : FLOORS[e.house.floors - 1].label) : e.property === 'house' ? 'House' : 'Flat';
  const roomsNote = e.flags.find((f) => f.text.startsWith('With your sizes'))?.text;
  return {
    rooms: roomsOf(s, e), ...(roomsNote ? { roomsNote } : {}), shares: sharesOf(e),
    add: addOf(s, e), compare: compareOf(e, runs, sections), ...(change ? { change: changeText(change) } : {}),
    ...(e.stages ? { stages: stageViews(e.stages), loan: e.house?.added ? 'extension' as const : 'construction' as const } : {}), ...(e.house && !e.house.added ? { plot: plotView(s, e.house) } : {}),
    // Each answer kept on one line (no-break spaces inside it), so a phone wraps only between answers.
    summary: [kind, home, city, s.unit === 'sqm' ? `${qtyText(sqm)} sq m` : `${qtyText(sqft)} sq ft`, bhk, pkg].map((x) => x.replace(/ /g, '\u00a0')).join(' · '),
    title: e.part ? PART_TITLE[e.part] : TITLE[e.kind], kind, home, city, area, bhk, level: pkg, areaName: e.house ? 'Built-up area' : 'Carpet area', perName: PER_NAME[e.per],
    total: rupees(e.total), perSqft: rupees(e.perSqft), words: rupeesWords(e.total), n: { total: e.total, perSqft: e.perSqft }, headline: roundRupees(e.total),
    strip: levels.map((n, i) => ({ level: (i + 1) as Level, name: LEVEL_NAMES[i], total: lakhs(n), full: rupees(n), n, current: i + 1 === e.level })),
    bar, sections, ...(split ? { split } : {}), assumed, flags: e.flags.filter((f) => f.decides).map((f) => groupedFlag(f.text)), notes: e.flags.filter((f) => !f.decides).map((f) => groupedFlag(f.text)),
    unpriced: e.unpriced.map((u) => `${u.roomName}, ${u.name.toLowerCase()}: ${u.entryName}`),
    ratesLine: `A planning estimate: rates as reported on ${dmy(e.ratesDate)} for ${listed ? city : 'another place, at the six cities’ average'}; ${e.lines.filter((l) => l.checked).length} of ${e.lines.length} lines verified at their pages${overdueNote(LIBRARY_REVIEW_BY, todayIso()) ? `. ${overdueNote(LIBRARY_REVIEW_BY, todayIso()).replace(/\.$/, '')}` : ''}`,
    range: rangeOf(e, runs), ...rangeBarOf(e, runs), bill: billView(s, e),
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
    ? `${at}, the choices run from ₹${rupees(r.low)} to ₹${rupees(r.high)}: the cheapest in each item to the dearest. ${r.lines} of the ${items(r.of)} offer a choice.`
    : `${at}, each of the ${items(r.of)} has one choice.`;
  return { text, low: r.low, high: r.high, lines: r.lines, of: r.of };
}

/** The range drawn (UX8): from the cheapest choice to the dearest, rounded as the headline, the total marked on it. */
function rangeBarOf(e: ArchitectEstimate, runs: LevelRuns): { rangeBar?: PlanView['rangeBar'] } {
  const r = runs.range;
  if (!r.of || !r.lines || !(r.high > r.low)) return {};
  const at = e.total >= r.low && e.total <= r.high ? ((e.total - r.low) / (r.high - r.low)) * 100 : undefined;
  const pkg = Math.abs(e.total - runs.totals[e.level - 1]) >= 0.005 ? ' as a package' : '';
  return { rangeBar: { low: roundRupees(r.low), high: roundRupees(r.high), ...(at === undefined ? {} : { at }),
    text: `At ${levelName(e.level)}${pkg}: the cheapest choice in each item to the dearest; ${r.lines} of the ${r.of} items offer one.` } };
}

/** The rooms that can be added (R2); a part's own kind of room only (D-UX-276). */
function addOf(s: PlanState, e: ArchitectEstimate): PlanView['add'] {
  const only = partRooms(e), may = (k: RoomKind) => !only || only.includes(k);
  return {
    bedroom: may('bedroom') && e.bhk !== '5', bath: may('bath') && e.rooms.filter((r) => r.kind === 'bath').length < BATHS.max,
    balcony: may('balcony') && R.programmes[e.bhk].balcony > 0 && s.balcony === false,
    extras: R.extras.filter((x) => may(x.kind) && !s.extras?.includes(x.kind)).map((x) => ({ kind: x.kind, name: x.name })),
  };
}

/** The rooms as planned or sized, in the page's unit, each with its own level; a part's own only (D-UX-276). */
function roomsOf(s: PlanState, e: ArchitectEstimate): RoomView[] {
  const ft = s.unit !== 'sqm', side = (m: number) => qtyText(ft ? m * FT_PER_M : m), unit = sideUnit(s.unit);
  const planned = new Map(planRooms(e.bhk, e.carpetSqm, s.roomWords, { baths: s.baths, balcony: s.balcony, extras: s.extras }).map((r) => [r.id, r]));
  const baths = e.rooms.filter((r) => r.kind === 'bath').length;
  const [lo, hi] = sideRange(s.unit), only = partRooms(e);
  return e.rooms.filter((r) => !only || only.includes(r.kind)).map((r) => {
    const typed = s.rooms[r.id] ?? { l: '', b: '' }, p = planned.get(r.id) ?? r;
    const l = sideOf(typed.l, s.unit), b = sideOf(typed.b, s.unit), any = !!(typed.l.trim() || typed.b.trim());
    const bad = !any ? undefined : l === null || b === null ? `Out of range. Type each side from ${lo} to ${hi} ${unit}.` : l === undefined || b === undefined ? 'One side is missing. Type both sides.' : undefined;
    return {
      id: r.id, name: r.name, size: `${side(r.l)} × ${side(r.b)} ${unit}`, area: ft ? `${inr(Math.round(r.sqm * SQFT_PER_SQM))} sq ft` : `${qtyText(r.sqm)} sq m`,
      typed: r.typed, level: r.level, word: r.word, l: typed.l, b: typed.b, planned: { l: side(p.l), b: side(p.b) }, ...(bad ? { bad } : {}),
      out: r.kind === 'bedroom' ? e.bhk !== '1RK' : r.kind === 'bath' ? baths > 1 : r.kind === 'balcony' || (EXTRAS as string[]).includes(r.kind), bedroom: r.kind === 'bedroom',
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
  const bad = !any ? undefined : l === null || b === null ? `Out of range. Type each side from ${lo} to ${hi} ${unit}.` : l === undefined || b === undefined ? 'One side is missing. Type both sides.' : undefined;
  return { l: s.plot.l, b: s.plot.b, planned: { l: side(h.l + m.front + m.rear), b: side(h.b + 2 * m.side) }, own: h.plot.own, ...(bad ? { bad } : {}) };
}

/** Compare: each section that is on, and the total, at the five levels; the estimate's own level marked, and its own amount where it differs. */
function compareOf(e: ArchitectEstimate, runs: LevelRuns, sections: SectionView[]): CompareView {
  const cells = (ns: number[], at: number): CompareCell[] => ns.map((n, i) => ({ text: lakhs(n), full: rupees(n), n, mine: i + 1 === at }));
  const differs = (now: number, ns: number[], at: number) => Math.abs(now - ns[at - 1]) >= 0.005;
  const rows = sections.filter((x) => x.on && (runs.sections[x.id] ?? []).some((n) => n > 0)).map((x) => {
    const ns = runs.sections[x.id], at = x.level ?? e.level;
    return { id: x.id, name: x.name, cells: cells(ns, at), ...(differs(x.n, ns, at) ? { yours: `Yours: ₹${x.amount}` } : {}) };
  });
  return { rows, totals: cells(runs.totals, e.level), ...(differs(e.total, runs.totals, e.level) ? { yours: `Yours: ₹${rupees(e.total)}` } : {}) };
}

/** "Bathrooms to Luxury: ₹6,71,648 more", and the items it brought in, up to three; any it brought in without a rate yet. */
function changeText(c: Change & { what: string }): ChangeView {
  const names = [...new Set(c.swaps.flatMap((x) => (x.to ? [x.to] : [])))];
  const by = Math.round(c.by) === 0 ? 'no change in the total' : `₹${rupees(Math.abs(c.by))} ${c.by > 0 ? 'more' : 'less'}`;
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

/**
 * Whether an open drawer shows a brand (D-BIZ-05): the line's brands at its top, or a choice's chips or name in a group on
 * show (the first always; another while open, as it opened or as tapped). Only then does its section show the brand notice.
 */
export const drawerBrands = (l: LineView | undefined, d: DrawerView, open: Record<string, boolean>) =>
  !!l && (!!l.brands || d.groups.some((g) => (open[groupKey(d.key, g)] ?? g.open)
    && g.choices.some((x) => (x.usable && x.brands.length > 0) || namesBrand(x.name, x.brands))));

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
      rate: [...line.rateHow, `= ₹${line.rate} ${UNIT_RATE[unitOf(line.unit)]}`],
      amount: `${line.qty} ${line.unit} × ₹${line.rate} = ₹${line.amount}`,
    },
  };
}
const unitOf = (short: string) => (Object.keys(UNIT_SHORT) as Unit[]).find((u) => UNIT_SHORT[u] === short) ?? 'nos';

