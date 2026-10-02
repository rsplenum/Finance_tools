/**
 * Construction and renovation estimates: each item's amount is its quantity × its rate; the abstract of cost adds the
 * items up by head; GST is added when the rates leave it out, and contingency on the works with GST; the cost per sq ft
 * is the total ÷ the built-up area. Pure, no DOM. No rate is ever supplied: every estimate states its own basis
 * (engine/data/estimate.json). estimate-check.ts works every figure a second way; nothing is returned unless both agree.
 */
import DATA from './data/estimate.json';
import type { Blocked, Needs } from './dscr';
import { estimateCheck, type EstimateCheck } from './estimate-check';

export type EstimateKind = keyof typeof DATA.kinds;
export const KINDS = DATA.kinds;
export const UNITS = DATA.units;
export const METHOD = DATA.method;

/** An item as entered: its head (an id from the data file), what it is, how much, in what unit, at what rate. */
export interface Item { head: string; description: string; quantity?: number; unit?: string; rate?: number }
export interface EstimateInput {
  kind?: EstimateKind;
  items: Item[];
  /** Built-up area in sq ft: needed for new construction, for the cost per sq ft. */
  area?: number;
  /** A rate to add, or 'included' when the rates already include GST. */
  gstPct?: number | 'included';
  /** A percentage for unforeseen work, or 'none'. */
  contingencyPct?: number | 'none';
}
/** An item worked out: numbered by head (2.1 is the first item of the second head used); `index`, its place as entered. */
export interface ItemAmount { no: string; index: number; head: string; description: string; quantity: number; unit: string; rate: number; amount: number }
export interface HeadTotal { head: string; label: string; no: number; amount: number }
export interface Estimate {
  items: ItemAmount[]; heads: HeadTotal[]; works: number;
  gstPct?: number; gst: number; contingencyPct?: number; contingency: number; total: number; perSqft?: number;
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const money = (a: number, b: number) => Math.abs(a - b) <= Math.max(0.01, 1e-9 * Math.max(Math.abs(a), Math.abs(b)));
const blocked = (where: string): Blocked => ({ blocked: `The two computations disagree on ${where}, so no figures are shown. Please report this.` });

/** An item with nothing typed in it is left out; one with anything typed needs the rest. */
export const isBlank = (it: Item) => !it.description.trim() && it.quantity === undefined && it.rate === undefined;

/** What is missing, in the order it is asked; empty when the estimate can be worked out. */
export function estimateNeeds(input: EstimateInput): string[] {
  const needs: string[] = [];
  if (!input.kind) needs.push('What the estimate is for: new construction, or renovation or repair');
  const heads = input.kind ? KINDS[input.kind].heads.map((h) => h.id) : [];
  const items = input.items.filter((it) => !isBlank(it));
  if (!items.length) needs.push('At least one item, with its quantity and rate');
  input.items.forEach((it, i) => {
    if (isBlank(it)) return;
    const n = `Item ${i + 1}`;
    if (input.kind && !heads.includes(it.head)) needs.push(`${n}: its head`);
    if (!it.description.trim()) needs.push(`${n}: what it is`);
    if (!isNum(it.quantity) || it.quantity <= 0) needs.push(`${n}: the quantity, more than 0`);
    if (!it.unit?.trim()) needs.push(`${n}: the unit`);
    if (!isNum(it.rate) || it.rate < 0) needs.push(`${n}: the rate`);
  });
  if (input.kind === 'construction' && !(isNum(input.area) && input.area > 0)) needs.push('The built-up area in sq ft');
  if (input.gstPct === undefined) needs.push('GST: included in the rates, or the rate to add');
  else if (input.gstPct !== 'included' && !(input.gstPct >= 0 && input.gstPct <= 100)) needs.push('GST: a rate from 0 to 100%');
  if (input.contingencyPct === undefined) needs.push('Contingency: none, or a percentage');
  else if (input.contingencyPct !== 'none' && !(input.contingencyPct >= 0 && input.contingencyPct <= 100)) needs.push('Contingency: a percentage from 0 to 100');
  return needs;
}

/** The estimate, or what is needed, or blocked when the two computations disagree. `check` is for tests only. */
export function estimate(input: EstimateInput, check: typeof estimateCheck = estimateCheck): Estimate | Needs | Blocked {
  const needs = estimateNeeds(input);
  if (needs.length) return { needs };
  const kind = KINDS[input.kind as EstimateKind], items = input.items.filter((it) => !isBlank(it)), index = new Map(input.items.map((it, i) => [it, i]));
  // Heads in the data file's order, numbered as they are used; items in the order entered.
  const used = kind.heads.filter((h) => items.some((it) => it.head === h.id));
  const heads: HeadTotal[] = [], out: ItemAmount[] = [];
  used.forEach((h, k) => {
    let amount = 0, j = 0;
    for (const it of items) {
      if (it.head !== h.id) continue;
      const a = (it.quantity as number) * (it.rate as number);
      out.push({ no: `${k + 1}.${++j}`, index: index.get(it) as number, head: h.id, description: it.description.trim(), quantity: it.quantity as number, unit: (it.unit as string).trim(), rate: it.rate as number, amount: a });
      amount += a;
    }
    heads.push({ head: h.id, label: h.label, no: k + 1, amount });
  });
  const works = out.reduce((t, it) => t + it.amount, 0);
  const gstPct = input.gstPct === 'included' ? undefined : input.gstPct as number, gst = gstPct ? (works * gstPct) / 100 : 0;
  const contingencyPct = input.contingencyPct === 'none' ? undefined : input.contingencyPct as number;
  const contingency = contingencyPct ? ((works + gst) * contingencyPct) / 100 : 0, total = works + gst + contingency;
  const e: Estimate = {
    items: out, heads, works, ...(gstPct !== undefined ? { gstPct } : {}), gst, ...(contingencyPct !== undefined ? { contingencyPct } : {}), contingency, total,
    ...(isNum(input.area) && input.area > 0 ? { perSqft: total / input.area } : {}),
  };
  const where = disagreement(e, check(items, gstPct ?? 0, contingencyPct ?? 0, isNum(input.area) && input.area > 0 ? input.area : undefined));
  return where ? blocked(where) : e;
}

function disagreement(e: Estimate, c: EstimateCheck): string {
  for (const h of e.heads) if (!money(h.amount, c.heads.get(h.head) ?? NaN)) return `the head ${h.label}`;
  if (c.heads.size !== e.heads.length || !money(e.works, c.works)) return 'the total of the works';
  if (!money(e.total, c.total)) return 'the total';
  if ((e.perSqft === undefined) !== (c.perSqft === undefined) || (e.perSqft !== undefined && !money(e.perSqft, c.perSqft as number))) return 'the cost per sq ft';
  return '';
}
