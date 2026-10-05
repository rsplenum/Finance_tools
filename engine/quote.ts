/**
 * A contractor's quotation against the library (E4b, D-UX-36). Each line is matched to a family and a level: a line taken
 * from the bill of quantities by its item, exactly; a line typed by hand by its words, where one family fits best, else
 * not matched until the user picks one. Its rate, taken as the price paid with any GST in it, is set against the band at
 * that level: the lowest to the highest reported price of the level's choices (each range's low end, and its high end,
 * labour's too), with wastage, fixing and the city, in the line's own unit. A rate more than `farOut`% below the band's low
 * end or above its high end is flagged to check; a line with no rate is left out of the quotation. Pure, no DOM.
 * architect-check.ts (`quoteAgain`) matches, bands and flags every line a second way; nothing is returned unless both agree.
 */
import { R, bandOf, checkedOn, cityFactor, type ArchitectEstimate, type BillSection, type Level } from './architect';
import { quoteAgain, type QuoteAgain } from './architect-check';
import type { Blocked } from './dscr';
import { CFT_PER_CUM, ENTRIES, FAMILIES, ladder, per, price, sameKind, type Entry, type Family, type Unit } from './library';

/** Where a line of the quotation came from on the bill: its item, its family and the levels the estimate put it at; no levels for an item at no level, which is set against its own range. */
export interface BillFrom { entry: string; family: string; levels: Level[] }
/** What the check needs from the planning estimate, kept when the bill is taken in: the city, the package's level, and the levels each family is at in it. */
export interface QuoteContext { city: string; level: Level; families: Record<string, Level[]> }
/** A line as typed: its words, its unit (one of the typed path's units), its rate as paid, if any; from the bill, or a family the user picked. */
export interface QuoteLine { words: string; unit: string; rate?: number; from?: BillFrom; pick?: string }
export type Where = 'not-matched' | 'left-out' | 'other-unit' | 'no-band' | 'below' | 'within' | 'above';
export interface QuoteResult {
  family: string | null; how: 'bill' | 'picked' | 'words' | null; levels: Level[];
  /** The item the line is matched to: the bill's, or the family's at its level. */
  item: string | null;
  /** The band in the line's unit, to the paisa; null where there is none to set the rate against. */
  band: { low: number; high: number } | null;
  where: Where;
  /** How far outside the band, in whole per cent of its nearer end; 0 within it. */
  off: number;
  flagged: boolean;
  /** The item's rate, or a part's, is still as reported, not yet read on its page (E2). */
  reported: boolean;
}

export const FAR_OUT = R.quote.farOut;

/** The typed path's units (engine/data/estimate.json) as the library's, with how many of the library's unit make one. */
const TYPED: Record<string, [Unit, number]> = {
  sqft: ['sqft', 1], sqm: ['sqm', 1], rft: ['rft', 1], rmt: ['m', 1], cum: ['cum', 1], cft: ['cum', 1 / CFT_PER_CUM],
  kg: ['kg', 1], MT: ['kg', 1000], nos: ['nos', 1], set: ['set', 1], LS: ['lot', 1], bag: ['bag', 1], litre: ['litre', 1],
};
/** The library's units as the typed path's, for a bill line's card. */
export const TYPED_UNIT: Record<Unit, string> = { sqft: 'sqft', sqm: 'sqm', rft: 'rft', m: 'rmt', cum: 'cum', kg: 'kg', nos: 'nos', set: 'set', lot: 'LS', bag: 'bag', litre: 'litre' };
const ALL_UNITS = Object.keys(TYPED_UNIT) as Unit[];
const r2 = (x: number) => Math.round(x * 100 + 1e-6) / 100;

/** The levels the estimate puts each family at, from its lines and the items with no rate yet. */
export function quoteContext(e: ArchitectEstimate): QuoteContext {
  const families: Record<string, Level[]> = {};
  const add = (key: string, at: Level) => { const f = key.split(':')[1]; (families[f] ??= []).includes(at) || families[f].push(at); };
  for (const l of e.lines) add(l.key, l.at);
  for (const u of e.unpriced) add(u.key, u.at);
  for (const f of Object.keys(families)) families[f].sort();
  return { city: e.city, level: e.level, families };
}

/** An item's own level: the one it is usually at, else the first the family names it at; null for an item at no level. */
function ownLevel(fam: Family, id: string): Level | null {
  const e = ENTRIES.get(id) as Entry;
  if (e.level) return e.level as Level;
  const at = (fam.levels ?? []).indexOf(id);
  return at >= 0 ? ((at + 1) as Level) : null;
}

/**
 * Each bill line's item, family and levels: the level each of its rooms' lines takes, or, for an item the user chose, the
 * item's own level. The family is its first line's; no levels where the user chose an item at no level.
 */
export function billFroms(e: ArchitectEstimate, bill: BillSection[]): BillFrom[][] {
  const at = new Map<string, { at: Level; chosen: boolean }>([...e.lines, ...e.unpriced].map((l) => [l.key, { at: l.at, chosen: l.chosen }]));
  return bill.map((s) => s.lines.map((b) => {
    const family = b.keys[0].split(':')[1], fam = FAMILIES.get(family) as Family, levels: Level[] = [];
    let own = false;
    for (const k of b.keys) {
      const x = at.get(k) as { at: Level; chosen: boolean };
      const lv = x.chosen ? ownLevel(fam, b.entry) : x.at;
      if (lv === null) own = true;
      else if (!levels.includes(lv)) levels.push(lv);
    }
    return { entry: b.entry, family, levels: own ? [] : levels.sort() };
  }));
}

// A line's words: lower case, the words in brackets left out, each made singular; a family's are its name's, less these.
const STOP = new Set(['a', 'an', 'and', 'the', 'of', 'by', 'one', 'for', 'on', 'in', 'to', 'with', 'or', 'finish']);
function wordsOf(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.toLowerCase().replace(/\([^)]*\)/g, ' ').split(/[^a-z]+/)) {
    if (!raw || STOP.has(raw)) continue;
    let w = raw;
    if (w.endsWith('ies')) w = `${w.slice(0, -3)}y`;
    else if (w.endsWith('ches') || w.endsWith('shes') || w.endsWith('xes') || w.endsWith('sses')) w = w.slice(0, -2);
    else if (w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
    if (!out.includes(w)) out.push(w);
  }
  return out;
}
const FAMILY_WORDS = new Map<string, string[]>([...FAMILIES.values()].map((f) => [f.id, wordsOf(f.name)]));

/**
 * The family a line typed by hand is, by its words: the families with every word of their name in the line come first,
 * then those with the most; matched only where one family comes first. Null when none, or more than one, does.
 */
export function matchWords(text: string): string | null {
  const have = new Set(wordsOf(text));
  let best: string | null = null, bestKey = [0, 0], tie = false;
  for (const [id, ws] of FAMILY_WORDS) {
    const n = ws.filter((w) => have.has(w)).length;
    if (!n) continue;
    const key = [n === ws.length ? 1 : 0, n];
    const cmp = key[0] - bestKey[0] || key[1] - bestKey[1];
    if (cmp > 0) { best = id; bestKey = key; tie = false; }
    else if (cmp === 0) tie = true;
  }
  return tie ? null : best;
}

/**
 * The band at the levels given, in the line's unit: the lowest low end and the highest high end of the choices at those
 * levels (an item at no level, its own) priced in a unit of the same kind. 'none' when no choice has a rate yet; 'unit'
 * when every priced choice is in another kind of unit.
 */
function bandIn(fam: Family, levels: Level[], entry: string | null, city: number, cityId: string, typed: [Unit, number]): { low: number; high: number } | 'none' | 'unit' {
  const ids = levels.length ? [...new Set(levels.flatMap((lv) => bandOf(fam, lv, ALL_UNITS)))] : entry ? [entry] : [];
  let low = Infinity, high = -Infinity, priced = false;
  for (const id of ids) {
    const lo = price(id, city, R.gst.pct, 0, cityId), hi = price(id, city, R.gst.pct, 1, cityId), u = (ENTRIES.get(id) as Entry).unit;
    if (!lo || !hi) continue;
    priced = true;
    if (!sameKind(u, typed[0])) continue;
    // A rate per u, per the line's unit: as many u as make one of it.
    const k = typed[1] * per(typed[0], u);
    low = Math.min(low, lo.rate * k); high = Math.max(high, hi.rate * k);
  }
  return low <= high ? { low: r2(low), high: r2(high) } : priced ? 'unit' : 'none';
}

/** Each line matched, banded and flagged; or blocked when the second computation disagrees on any. `check` is for tests only. */
export function quoteCheck(lines: QuoteLine[], ctx: QuoteContext, check: typeof quoteAgain = quoteAgain): QuoteResult[] | Blocked {
  const city = cityFactor(ctx.city) ?? 1;
  const out = lines.map((q): QuoteResult => {
    const how = q.from && FAMILIES.has(q.from.family) ? 'bill' : q.pick && FAMILIES.has(q.pick) ? 'picked' : null;
    const family = how === 'bill' ? (q.from as BillFrom).family : how === 'picked' ? (q.pick as string) : matchWords(q.words);
    const none = { band: null, off: 0, flagged: false };
    if (!family) return { family: null, how: null, levels: [], item: null, reported: false, where: 'not-matched', ...none };
    const fam = FAMILIES.get(family) as Family;
    const levels = how === 'bill' ? (q.from as BillFrom).levels : ctx.families[family] ?? [ctx.level];
    const items = how === 'bill' ? [(q.from as BillFrom).entry] : levels.map((lv) => ladder(fam, lv)).filter((x): x is string => !!x);
    const base = { family, how: how ?? 'words', levels, item: items[0] ?? null, reported: items.some((id) => !checkedOn(ENTRIES.get(id) as Entry)) } as const;
    if (q.rate === undefined) return { ...base, where: 'left-out', ...none };
    const typed = TYPED[q.unit];
    const band = typed ? bandIn(fam, levels, how === 'bill' ? (q.from as BillFrom).entry : null, city, ctx.city, typed) : 'unit';
    if (band === 'unit') return { ...base, where: 'other-unit', ...none };
    if (band === 'none') return { ...base, where: 'no-band', ...none };
    // In whole paise, so that a rate exactly 20% out is not flagged by a rounding.
    const p = Math.round(q.rate * 100), lo = Math.round(band.low * 100), hi = Math.round(band.high * 100);
    const where: Where = p < lo ? 'below' : p > hi ? 'above' : 'within';
    const off = where === 'below' ? Math.round(((lo - p) / lo) * 100) : where === 'above' ? Math.round(((p - hi) / hi) * 100) : 0;
    const flagged = where === 'below' ? p * 100 < lo * (100 - FAR_OUT) : where === 'above' ? p * 100 > hi * (100 + FAR_OUT) : false;
    return { ...base, band, where, off, flagged };
  });
  const why = disagreement(out, check(lines, ctx));
  return why ? { blocked: `The two computations disagree on ${why}, so the quotation is not checked. Please report this.` } : out;
}

function disagreement(out: QuoteResult[], again: QuoteAgain[]): string {
  if (again.length !== out.length) return 'the number of lines';
  for (let i = 0; i < out.length; i++) {
    const a = out[i], b = again[i], n = `line ${i + 1}`;
    if (a.family !== b.family) return `what ${n} is`;
    if ((a.band === null) !== (b.band === null) || (a.band && b.band && (Math.abs(a.band.low - b.band[0]) > 0.011 || Math.abs(a.band.high - b.band[1]) > 0.011))) return `the band of ${n}`;
    if (a.where !== b.where || a.flagged !== b.flagged || Math.abs(a.off - b.off) > 0.5 + 1e-9) return `where ${n} sits`;
  }
  return '';
}
