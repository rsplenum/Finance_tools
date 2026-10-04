/**
 * The estimate page's logic, apart from the page (as dscr/model.ts): typed text to the engine's input, and its answer to
 * words, with the engine's exact figures beside them for the Excel copy. Pure, no DOM. Figures: engine/estimate.ts only.
 */
import { KINDS, UNITS, estimate, type Estimate, type EstimateKind, type Item } from '../../../engine/estimate';
import { R, architect, billOf, levelName } from '../../../engine/architect';
import { FAMILIES } from '../../../engine/library';
import { FAR_OUT, TYPED_UNIT, billFroms, quoteCheck, quoteContext, type BillFrom, type QuoteContext, type QuoteResult } from '../../../engine/quote';
import { inputOf as planInput, planNeeds, type PlanState } from './plan-model';
import { parseAmount } from '../../../engine/parse';
import { inr } from '../../../engine/util';

export interface ItemText {
  head: string; description: string; quantity: string; unit: string; rate: string;
  /** From the bill of quantities (E4b): its number there, and its item, family and levels. */
  no?: string; from?: BillFrom;
  /** A family the user picked for a line typed by hand that its words did not match. */
  pick?: string;
}
/** What only the document needs, asked beside the download. */
export interface EstimateFacts { borrower: string; property: string; lender: string; preparedBy: string }
export interface EstimateState {
  kind?: EstimateKind;
  /** Built-up area in sq ft. */
  area: string;
  /** Where the rates come from, in the user's words. */
  basis: string;
  items: ItemText[];
  gst?: 'included' | 'add';
  gstPct: string;
  contingency?: 'none' | 'add';
  contingencyPct: string;
  doc: EstimateFacts;
  /** Kept when the bill is taken in (E4b): the city and levels its lines are checked at against the library. */
  quote?: QuoteContext;
}

export const blankItem = (): ItemText => ({ head: '', description: '', quantity: '', unit: '', rate: '' });
export const EMPTY: EstimateState = {
  area: '', basis: '', items: [blankItem()], gstPct: '', contingencyPct: '', doc: { borrower: '', property: '', lender: '', preparedBy: '' },
};

export const KIND_CHOICES = (Object.keys(KINDS) as EstimateKind[]).map((k) => ({ value: k, label: KINDS[k].label }));
export const UNIT_CHOICES = UNITS.map((u) => ({ value: u.id, label: `${u.id} (${u.what})` }));
export const headsOf = (kind?: EstimateKind) => (kind ? KINDS[kind].heads : []);

/** A figure as typed: 1,850 or 1.85 L for rates; plain numbers for quantities and percentages. */
export const rateOf = (t: string) => (t.trim() ? parseAmount(t) : undefined);
export const plainOf = (t: string) => (t.trim() ? parseAmount(t.replace(/%\s*$/, ''), false) : undefined);
/** A rate tidied as it is read back: 1.85 L → 1,85,000; 450.5 stays 450.50. */
export function tidyRate(t: string): string {
  const n = rateOf(t);
  return n === undefined ? t : inr(n, Number.isInteger(n) ? 0 : 2);
}

/** A head chosen for an item: its unit too, while the unit is still empty. */
export function withHead(s: EstimateState, i: number, head: string): EstimateState {
  const unit = headsOf(s.kind).find((h) => h.id === head)?.unit ?? '';
  return { ...s, items: s.items.map((it, k) => (k === i ? { ...it, head, unit: it.unit || unit } : it)) };
}

/** The engine's input from what is typed. */
export function inputOf(s: EstimateState) {
  const items: Item[] = s.items.map((it) => ({
    head: it.head, description: it.description, unit: it.unit,
    ...(plainOf(it.quantity) !== undefined ? { quantity: plainOf(it.quantity) } : {}), ...(rateOf(it.rate) !== undefined ? { rate: rateOf(it.rate) } : {}),
  }));
  const pct = (choice: string | undefined, add: string, text: string) => (choice === undefined ? undefined : choice === add ? plainOf(text) ?? NaN : choice);
  return {
    kind: s.kind, items, ...(plainOf(s.area) !== undefined ? { area: plainOf(s.area) } : {}),
    gstPct: pct(s.gst, 'add', s.gstPct) as number | 'included' | undefined,
    contingencyPct: pct(s.contingency, 'add', s.contingencyPct) as number | 'none' | undefined,
  };
}

const rupees = (n: number) => inr(n);
const pctText = (n: number) => `${+n.toFixed(2)}%`;
/** A number as typed and read back, without grouping beyond the engine's own: 1,100 sq ft; 12.5 cum. */
export const quantityText = (n: number) => (Number.isInteger(n) ? inr(n) : String(+n.toFixed(3)));

export interface ItemView { no: string; index: number; description: string; quantity: string; unit: string; rate: string; amount: string; n: { quantity: number; rate: number; amount: number } }
export interface HeadView { no: number; label: string; amount: string; n: number; items: ItemView[] }
/** A line of the abstract after the heads: the works, GST, contingency, the total. */
export interface TotalLine { id: 'works' | 'gst' | 'contingency' | 'total'; label: string; amount: string; n: number }
export interface EstimateView { heads: HeadView[]; totals: TotalLine[]; total: string; perSqft?: string; n: { total: number; perSqft?: number } }
export interface EstimatePreview { needs: string[]; blocked?: string; view?: EstimateView; amounts: Record<number, string> }

/** The estimate so far: what is still needed, or the estimate in words. */
export function preview(s: EstimateState): EstimatePreview {
  const r = estimate(inputOf(s)), needs = 'needs' in r ? [...r.needs] : [];
  if (!s.basis.trim()) needs.push('Where the rates come from (like a contractor’s quotation and its date)');
  if ('blocked' in r) return { needs, blocked: r.blocked, amounts: {} };
  if ('needs' in r) return { needs, amounts: {} };
  return { needs, view: viewOf(r), amounts: Object.fromEntries(r.items.map((it) => [it.index, rupees(it.amount)])) };
}

function viewOf(e: Estimate): EstimateView {
  const heads = e.heads.map((h): HeadView => ({
    no: h.no, label: h.label, amount: rupees(h.amount), n: h.amount,
    items: e.items.filter((it) => it.head === h.head).map((it) => ({
      no: it.no, index: it.index, description: it.description, quantity: quantityText(it.quantity), unit: it.unit,
      rate: inr(it.rate, Number.isInteger(it.rate) ? 0 : 2), amount: rupees(it.amount), n: { quantity: it.quantity, rate: it.rate, amount: it.amount },
    })),
  }));
  const totals: TotalLine[] = [{ id: 'works', label: 'Total of the works', amount: rupees(e.works), n: e.works }];
  if (e.gstPct !== undefined) totals.push({ id: 'gst', label: `Add: GST at ${pctText(e.gstPct)}`, amount: rupees(e.gst), n: e.gst });
  if (e.contingencyPct !== undefined) totals.push({ id: 'contingency', label: `Add: contingency at ${pctText(e.contingencyPct)}`, amount: rupees(e.contingency), n: e.contingency });
  totals.push({ id: 'total', label: 'Total estimated cost', amount: rupees(e.total), n: e.total });
  return { heads, totals, total: rupees(e.total), ...(e.perSqft !== undefined ? { perSqft: rupees(e.perSqft) } : {}), n: { total: e.total, ...(e.perSqft !== undefined ? { perSqft: e.perSqft } : {}) } };
}

/** "Complete", or "Provisional: 2 still needed". */
export const statusText = (p: EstimatePreview, more: string[] = []) =>
  p.blocked ? 'No figures' : p.needs.length + more.length ? `Provisional: ${p.needs.length + more.length} still needed` : 'Complete';

// ---- Start from the bill, and each line against the library (E4b, D-UX-36). ----

/** The head a bill line goes under: by its section, a few by their family; Other works where none fits. */
const HEAD: Record<EstimateKind, { sections: Record<string, string>; families: Record<string, string> }> = {
  construction: {
    sections: { structure: 'rcc', civil: 'masonry', waterproofing: 'waterproofing', exterior: 'painting', flooring: 'flooring', walls: 'painting', bathrooms: 'plumbing', doors: 'joinery', electrical: 'electrical', plumbing: 'plumbing', water: 'plumbing' },
    families: { steel: 'steel', brick: 'masonry', 'aac-block': 'masonry', 'labour-masonry': 'masonry', 'labour-plaster': 'plaster', 'labour-foundation': 'earthwork', 'anti-termite': 'earthwork', plaster: 'plaster', 'roof-waterproofing': 'waterproofing', 'stair-finish': 'flooring', railing: 'other' },
  },
  renovation: {
    sections: { civil: 'masonry', waterproofing: 'waterproofing', flooring: 'flooring', walls: 'painting', bathrooms: 'toilets', kitchen: 'kitchen', doors: 'joinery', electrical: 'electrical', plumbing: 'plumbing' },
    families: { 'demolish-floor': 'dismantling', 'demolish-bath': 'dismantling', debris: 'dismantling' },
  },
};

/**
 * The bill of quantities as the typed path's items (E4b): each line's item, brand and rooms in its words, its quantity
 * and unit, its rate left for the contractor's; the planning estimate's area for a new house typed in sq ft; GST as
 * included, since every rate is taken as paid. A message instead while the planning estimate is not worked out.
 */
export function fromBill(s: EstimateState, plan: PlanState | null): EstimateState | string {
  if (!plan || planNeeds(plan).length) return 'Answer the six questions at the top of the page first: the bill is made from them.';
  const e = architect(planInput(plan));
  if (!('total' in e)) return 'The planning estimate shows no figures yet, so there is no bill to start from.';
  const kind: EstimateKind = e.kind === 'build' ? 'construction' : 'renovation', map = HEAD[kind];
  const bill = billOf(e, plan.brands), froms = billFroms(e, bill);
  const items = bill.flatMap((sec, i) => sec.lines.map((b, j): ItemText => ({
    head: map.families[froms[i][j].family] ?? map.sections[sec.id] ?? 'other',
    description: `${b.item}${b.brand ? `, ${b.brand}` : ''} (${b.rooms.join(', ')})`,
    quantity: String(b.qty), unit: TYPED_UNIT[b.unit], rate: '', no: `${i + 1}.${j + 1}`, from: froms[i][j],
  })));
  return { ...s, kind, items, gst: 'included', quote: quoteContext(e), area: e.kind === 'build' && plan.unit === 'sqft' ? plan.area : s.area };
}

const UNIT_PER: Record<string, string> = { sqft: 'a sq ft', sqm: 'a sq m', rmt: 'a running metre', rft: 'a running ft', cum: 'a cu m', cft: 'a cu ft', kg: 'a kg', MT: 'a tonne', nos: 'each', set: 'a set', LS: 'a lot', bag: 'a bag', litre: 'a litre' };
const money = (n: number) => inr(n, Number.isInteger(n) ? 0 : 2);
const levelsText = (r: QuoteResult) => {
  if (r.family && FAMILIES.get(r.family)?.fixed) return 'the band';
  if (!r.levels.length) return 'the item’s own range';
  return `the band at ${r.levels.map(levelName).join(' and ')}`;
};
export interface CheckLine { text: string; flagged: boolean; where: QuoteResult['where'] }
export interface QuoteView {
  /** By the item's place in the list: its line against the library. */
  lines: Record<number, CheckLine>;
  /** Lines to check, left out and not matched, each by its item's words. */
  flagged: string[]; leftOut: string[]; unmatched: string[];
  blocked?: string;
}
/** The rule and the GST line, listed on the page with the check (D-UX-36). */
export const QUOTE_RULE = `A rate is flagged to check when it is more than ${FAR_OUT}% below the low end, or above the high end, of the band at its line’s level: the lowest to the highest reported price of the level’s choices, with wastage, fixing and your city.`;
export const QUOTE_WHY = R.quote.why.replace(/^.*?\.\s*(?=The bands)/, '');
export const QUOTE_GST = 'Each rate is taken as the price you pay. Where a quotation adds GST on top, add it to each rate before you type it.';
export const FAMILY_CHOICES = [...FAMILIES.values()].map((f) => ({ value: f.id, label: f.name })).sort((a, b) => a.label.localeCompare(b.label));

/** One line's words: where its rate sits, or why it is not compared, and whether its item is still as reported. */
function checkLine(r: QuoteResult, unit: string): CheckLine {
  const name = r.family ? FAMILIES.get(r.family)?.name ?? '' : '';
  const by = r.how === 'words' ? `Matched by its words to ${name}. ` : r.how === 'picked' ? `Taken as ${name}. ` : '';
  const reported = r.reported ? ' Its item’s rate is as reported, not yet checked against its page.' : '';
  const band = r.band ? `Rs. ${money(r.band.low)}–${money(r.band.high)} ${UNIT_PER[unit] ?? `a ${unit}`}` : '';
  const at = levelsText(r);
  const text = r.where === 'not-matched' ? 'Not matched to the library: pick what it is to compare its rate.'
    : r.where === 'left-out' ? `${by}Left out of the quotation: no rate.`
    : r.where === 'other-unit' ? `${by}Not compared: the library prices this by another unit.`
    : r.where === 'no-band' ? `${by}Not compared: the library has no rate at this level yet.`
    : r.where === 'within' ? `${by}Within ${at}: ${band}.${reported}`
    : r.flagged ? `${by}Check this rate: ${r.off}% ${r.where} ${at} (${band}).${reported}`
    : `${by}${r.off}% ${r.where} ${at} (${band}), within the ${FAR_OUT}% allowed.${reported}`;
  return { text, flagged: r.flagged, where: r.where };
}

/** Every line typed against the library, once the bill is taken in; undefined before. */
export function quoteView(s: EstimateState): QuoteView | undefined {
  if (!s.quote) return undefined;
  // A card with nothing typed in it is left out, as from the estimate.
  const at = s.items.map((it, i) => [it, i] as const).filter(([it]) => it.description.trim() || it.quantity.trim() || it.rate.trim());
  const r = quoteCheck(at.map(([it]) => ({ words: it.description, unit: it.unit, ...(rateOf(it.rate) !== undefined ? { rate: rateOf(it.rate) } : {}), ...(it.from ? { from: it.from } : {}), ...(it.pick ? { pick: it.pick } : {}) })), s.quote);
  if ('blocked' in r) return { lines: {}, flagged: [], leftOut: [], unmatched: [], blocked: r.blocked };
  const v: QuoteView = { lines: {}, flagged: [], leftOut: [], unmatched: [] };
  r.forEach((x, k) => {
    const [it, i] = at[k], line = checkLine(x, it.unit), name = it.description.trim() || `Item ${i + 1}`;
    v.lines[i] = line;
    if (line.flagged) v.flagged.push(name);
    if (x.where === 'left-out') v.leftOut.push(name);
    if (x.where === 'not-matched') v.unmatched.push(name);
  });
  return v;
}
