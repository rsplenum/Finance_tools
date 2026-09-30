/**
 * Yearly figures from one or two answers, so the page never asks for every year: one figure for every year, or a first
 * year that grows, or falls, by a percentage a year (depreciation on the written-down value falls by its rate). Pure —
 * no DOM. Checked against a closed form (dscr-check.ts); figures are withheld unless both agree.
 */
import type { Blocked, Needs } from './dscr';
import { seriesCheck } from './dscr-check';

export type SeriesKind = 'same' | 'grow' | 'fall';
export interface Rule { kind: SeriesKind; first?: number; pct?: number }

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const close = (a: number, b: number) => Math.abs(a - b) <= Math.max(0.01, 1e-9 * Math.max(Math.abs(a), Math.abs(b)));

/** `count` yearly figures from the rule; `label` and `firstYear` name what is missing. */
export function series(rule: Rule, count: number, label: string, firstYear: string): number[] | Needs | Blocked {
  const needs: string[] = [];
  if (!isNum(rule.first)) needs.push(rule.kind === 'same' ? `${label}, one figure for every year` : `${label} in ${firstYear}`);
  if (rule.kind !== 'same') {
    const what = rule.kind === 'grow' ? 'growth' : 'fall';
    if (!isNum(rule.pct)) needs.push(`${label}: ${what} a year (%)`);
    else if (rule.kind === 'fall' && (rule.pct < 0 || rule.pct > 100)) needs.push(`${label}: ${what} a year, 0 to 100%`);
  }
  if (needs.length) return { needs };
  const first = rule.first as number, pct = rule.kind === 'same' ? 0 : (rule.pct as number);
  const step = rule.kind === 'fall' ? 1 - pct / 100 : 1 + pct / 100;
  const out: number[] = [];
  for (let k = 0, v = first; k < count; k++, v *= step) out.push(v);
  const check = seriesCheck(rule.kind, first, pct, count);
  return out.every((v, k) => close(v, check[k])) ? out : { blocked: `The two computations disagree on ${label}, so no figures are shown. Please report this.` };
}
