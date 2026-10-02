/**
 * The estimate page's logic, apart from the page (as dscr/model.ts): typed text to the engine's input, and its answer to
 * words, with the engine's exact figures beside them for the Excel copy. Pure, no DOM. Figures: engine/estimate.ts only.
 */
import { KINDS, UNITS, estimate, type Estimate, type EstimateKind, type Item } from '../../../engine/estimate';
import { parseAmount } from '../../../engine/parse';
import { inr } from '../../../engine/util';

export interface ItemText { head: string; description: string; quantity: string; unit: string; rate: string }
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
