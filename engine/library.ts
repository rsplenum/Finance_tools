/**
 * The library (D-UX-18): every material, finish, fitting and appliance the estimate can use, each with its
 * specification, brands, unit and reported rate (engine/data/library/*.json), and the labour that fixes them. A family is
 * a slot an architect fills (a floor finish, a WC and basin, a wardrobe); its five levels name one item each, and every
 * other item of the family is an alternative the user can pick. Pure, no DOM. A rate is the middle of the range its
 * sources report; every source is in engine/data/sources.json, with the day its page was read (E2) or why it was not.
 * architect-check.ts prices every item a second way. Some families carry teaching notes, and the sections where to spend
 * and where to save (T1, notes.json): words for the page's Why?, never an amount.
 */
import SOURCES from './data/sources.json';
import LABOUR from './data/library/labour.json';
import CIVIL from './data/library/civil.json';
import WATERPROOFING from './data/library/waterproofing.json';
import FLOORING from './data/library/flooring.json';
import WALLS from './data/library/walls.json';
import CEILING from './data/library/ceiling.json';
import BATHROOMS from './data/library/bathrooms.json';
import KITCHEN from './data/library/kitchen.json';
import WARDROBES from './data/library/wardrobes.json';
import DOORS from './data/library/doors.json';
import ELECTRICAL from './data/library/electrical.json';
import PLUMBING from './data/library/plumbing.json';
import APPLIANCES from './data/library/appliances.json';
import SMART from './data/library/smart.json';
import FURNITURE from './data/library/furniture.json';
import STRUCTURE from './data/library/structure.json';
import OUTSIDE from './data/library/outside.json';
import NOTES_FILE from './data/library/notes.json';

export type Unit = 'sqft' | 'sqm' | 'rft' | 'm' | 'nos' | 'set' | 'lot' | 'kg' | 'cum' | 'bag' | 'litre';
export type Basis = 'installed' | 'supply' | 'product' | 'set';
export type ItemKind = 'fixed' | 'movable' | 'appliance';
export type Band = [number, number];
export interface Count { id: string; n: number }
export interface Entry {
  id: string; family: string; name: string; spec: string; level?: number; brands?: string[]; unit: Unit; basis: Basis;
  /** The reported range, per unit, or per pack when `pack` is given. Missing: the rate is still to be found. */
  rate?: Band; pack?: { qty: number; unit: Unit; what?: string }; wastage?: number;
  /** Labour added per unit, by id in labour.json. */
  fix?: Count[];
  /** For a set: the items it is made of, each priced on its own. */
  parts?: Count[];
  /**
   * The tax basis, as the source states it: 'extra' when it quotes the rate before GST (the engine adds GST), 'incl' when
   * the price includes it (a retail listing), 'unstated' when the source does not say (taken as the price paid).
   */
  gst?: 'extra' | 'incl' | 'unstated';
  /** The day the rate was read, when it differs from its file's date. */
  date?: string;
  /** The day its rate was read on its source's page and found the same, or corrected to it (E2). */
  checked?: string;
  src: string[]; note?: string; file: string;
}
export interface Family { id: string; name: string; unit: Unit; levels?: (string | null)[]; fixed?: string; kind?: ItemKind; file: string }
export interface Labour { id: string; name: string; unit: Unit; rate: Band; src: string[]; note?: string; /** The day the rate was read, when it differs from its file's date. */ date?: string; /** The day it was read on its page (E2). */ checked?: string }
/**
 * A source: what it is, its address and its class. `checked` is the day its page was opened and read (E2); each item
 * citing it says for itself whether its figure matched, since a page can price a different thing. `unread` says why the
 * page could not be opened (a refused visit, a page gone), so the figures citing it stay as a search summary reported them.
 */
export interface Source { what: string; url: string; class: string; checked?: string; unread?: string }
/**
 * A teaching note (T1, D-UX-34): plain words with their sources, 'reported' until someone reads the pages and sets it
 * 'checked'; 'own' for our own rule, its reason given in the note. It holds no amount: the engine's figures are on the line.
 */
export interface Note { text: string; src: string[]; status: 'reported' | 'checked' | 'own' }
/** What a family's item is, why it costs what it does, and what to check when buying it or on site (T1). */
export interface FamilyNotes { what: Note; cost: Note; check: Note }
/** Where to spend, where to save (T1): what is hard to change later against what is easy to upgrade later, and why. */
export interface SpendSave extends Note { section: string; way: 'spend' | 'save'; /** The part of the section it is about, when not all of it. */ on?: string }
interface RawFile { title: string; date: string; families: Omit<Family, 'file'>[]; entries: (Omit<Entry, 'file' | 'fix'> & { fix?: (string | Count)[] })[] }

/** The library's files, in the order of the estimate's sections. */
export const FILES = [CIVIL, WATERPROOFING, FLOORING, WALLS, CEILING, BATHROOMS, KITCHEN, WARDROBES, DOORS, ELECTRICAL, PLUMBING, APPLIANCES, SMART, FURNITURE, STRUCTURE, OUTSIDE] as unknown as RawFile[];
export const SOURCE: Record<string, Source> = SOURCES.sources;
export const CLASSES: Record<string, string> = SOURCES.classes;
export const LIBRARY_DATE = SOURCES.date;
export const LIBRARY_STATUS = SOURCES.status;
/** The teaching notes by family, and where to spend and where to save by section, in the estimate's order (T1). */
export const NOTES = new Map<string, FamilyNotes>(Object.entries(NOTES_FILE.families as Record<string, FamilyNotes>));
export const SPEND_SAVE = NOTES_FILE.spendSave as SpendSave[];
export const NOTES_DATE = NOTES_FILE.date;

const counts = (xs?: (string | Count)[]): Count[] | undefined => xs?.map((x) => (typeof x === 'string' ? { id: x, n: 1 } : x));
export const FAMILIES = new Map<string, Family>();
export const ENTRIES = new Map<string, Entry>();
for (const f of FILES) {
  for (const fam of f.families) FAMILIES.set(fam.id, { ...fam, file: f.title });
  for (const e of f.entries) ENTRIES.set(e.id, { ...e, fix: counts(e.fix), file: f.title });
}
export const LABOUR_ITEMS = new Map<string, Labour>((LABOUR.labour as Labour[]).map((l) => [l.id, l]));

/** The id of the item a family puts at a level (1 to 5), or null when it has nothing at that level. */
export function ladder(family: Family, level: number): string | null {
  if (family.fixed) return family.fixed;
  return family.levels?.[level - 1] ?? null;
}

/** Exact conversions from 1 ft = 0.3048 m. */
export const SQFT_PER_SQM = 1 / (0.3048 * 0.3048);
export const FT_PER_M = 1 / 0.3048;
export const CFT_PER_CUM = 1 / (0.3048 * 0.3048 * 0.3048);
const AREA: Unit[] = ['sqft', 'sqm'], LENGTH: Unit[] = ['rft', 'm'];
/** How many of `to` make one `from`; only between units of the same kind. */
export function per(from: Unit, to: Unit): number {
  if (from === to) return 1;
  if (from === 'sqm' && to === 'sqft') return SQFT_PER_SQM;
  if (from === 'sqft' && to === 'sqm') return 1 / SQFT_PER_SQM;
  if (from === 'm' && to === 'rft') return FT_PER_M;
  if (from === 'rft' && to === 'm') return 1 / FT_PER_M;
  throw new Error(`No conversion from ${from} to ${to}`);
}
export const sameKind = (a: Unit, b: Unit) => a === b || (AREA.includes(a) && AREA.includes(b)) || (LENGTH.includes(a) && LENGTH.includes(b));

export const mid = (b: Band) => (b[0] + b[1]) / 2;
// To the paisa, half up: a millionth of a paisa added so that an exact half (9 × 1.065 = 9.585) is not lost to floating point.
const r2 = (x: number) => Math.round(x * 100 + 1e-6) / 100;
// One formatter for every call: toLocaleString builds a new one each time, which made pricing slow on a phone.
const INR = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
const inr = (x: number) => INR.format(x);
/** A unit as the working says it: Rs. 75 a sq ft, Rs. 500 each. */
export const PER: Record<Unit, string> = { sqft: 'a sq ft', sqm: 'a sq m', rft: 'a running ft', m: 'a metre', nos: 'each', set: 'a set', lot: 'a lot', kg: 'a kg', cum: 'a cu m', bag: 'a bag', litre: 'a litre' };
const UNIT_WORD: Record<Unit, string> = { sqft: 'sq ft', sqm: 'sq m', rft: 'running ft', m: 'm', nos: 'nos', set: 'sets', lot: 'lots', kg: 'kg', cum: 'cu m', bag: 'bags', litre: 'litres' };

/** An item's rate and how it was worked out. `rate` is in rupees per unit, to the paisa. */
export interface Price { rate: number; how: string[] }

/**
 * The rate of an item for a city: the middle of its reported range; for a material, per unit (a pack's price divided by
 * what the pack covers), plus its wastage, plus the labour that fixes it; for a set, its parts added up. The city's
 * factor scales labour and rates that include labour, never the price of a product, which is the same across India.
 * GST is added only to a rate quoted before it, and only to what that source quotes: never to the labour that fixes a
 * material, which has its own source (E2). Null when the item, or a part of it, has no rate yet.
 */
export function price(id: string, city: number, gstPct: number, end?: 0 | 1): Price | null {
  const raw = rawPrice(id, city, end);
  if (!raw) return null;
  const e = ENTRIES.get(id) as Entry;
  let rate = raw.rate;
  const how = [...raw.how];
  if (e.gst === 'extra') {
    rate = (rate - raw.labour) * (1 + gstPct / 100) + raw.labour;
    how.push(raw.labour ? `GST ${gstPct}% added to the material, not the labour: the source quotes before GST` : `GST ${gstPct}% added: the source quotes before GST`);
  }
  else if (e.gst === 'incl') how.push('GST included in the price, as listed');
  else if (e.gst === 'unstated') how.push('GST not stated by the source: taken as the price paid');
  return { rate: r2(rate), how };
}

/** The rate before GST, and the part of it that is labour fixing a material (from its own source). */
function rawPrice(id: string, city: number, end?: 0 | 1): { rate: number; labour: number; how: string[] } | null {
  // The middle of each range, or its low (0) or high (1) end for a level's band (E4b); the working's words say the middle.
  const mid = (b: Band) => (end === undefined ? (b[0] + b[1]) / 2 : b[end]);
  const e = ENTRIES.get(id);
  if (!e) throw new Error(`No item ${id} in the library`);
  const how: string[] = [];
  let base = 0, labour = 0;
  if (e.basis === 'set') {
    for (const p of e.parts ?? []) {
      const part = rawPrice(p.id, city, end);
      if (!part) return null;
      base += p.n * part.rate;
      labour += p.n * part.labour;
      how.push(`${p.n} × ${(ENTRIES.get(p.id) as Entry).name} at Rs. ${inr(r2(part.rate))}`);
    }
  } else {
    if (!e.rate) return null;
    const m = mid(e.rate);
    if (e.basis === 'installed') {
      const each = e.pack ? m / (e.pack.qty * per(e.pack.unit, e.unit)) : m;
      base = each * city;
      how.push(e.pack
        ? `Rs. ${inr(m)}, the middle of Rs. ${inr(e.rate[0])}–${inr(e.rate[1])} for ${e.pack.what ?? 'a pack'} covering ${e.pack.qty} ${UNIT_WORD[e.pack.unit]}, supplied and fixed: Rs. ${inr(r2(each))} ${PER[e.unit]}${city !== 1 ? `, × ${city.toFixed(3)} for the city` : ''}`
        : `Rs. ${inr(m)}, the middle of Rs. ${inr(e.rate[0])}–${inr(e.rate[1])} ${PER[e.unit]}, supplied and fixed${city !== 1 ? `, × ${city.toFixed(3)} for the city` : ''}`);
    } else {
      const each = e.pack ? m / (e.pack.qty * per(e.pack.unit, e.unit)) : m;
      const w = e.basis === 'supply' ? e.wastage ?? 0 : 0;
      base = each * (1 + w);
      how.push(e.pack
        ? `Rs. ${inr(m)} for ${e.pack.what ?? 'a pack'} covering ${e.pack.qty} ${UNIT_WORD[e.pack.unit]}: Rs. ${inr(r2(each))} ${PER[e.unit]}`
        : `Rs. ${inr(m)}, the middle of Rs. ${inr(e.rate[0])}–${inr(e.rate[1])} ${PER[e.unit]}`);
      if (w) how.push(`${+(w * 100).toFixed(2)}% wastage`);
    }
  }
  for (const f of e.fix ?? []) {
    const l = LABOUR_ITEMS.get(f.id);
    if (!l) throw new Error(`No labour ${f.id} for ${id}`);
    base += f.n * mid(l.rate) * city;
    labour += f.n * mid(l.rate) * city;
    how.push(`${f.n > 1 ? `${f.n} × ` : ''}${l.name.charAt(0).toLowerCase() + l.name.slice(1)} at Rs. ${inr(mid(l.rate))}${city !== 1 ? ` × ${city.toFixed(3)}` : ''}`);
  }
  return { rate: base, labour, how };
}

/** The items a family can take: its own and any item a level names, the level's item first. */
export function choices(familyId: string): Entry[] {
  const fam = FAMILIES.get(familyId);
  if (!fam) return [];
  const named = new Set([...(fam.levels ?? []), fam.fixed].filter((x): x is string => !!x));
  return [...ENTRIES.values()].filter((e) => e.family === familyId || named.has(e.id)).sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
}
