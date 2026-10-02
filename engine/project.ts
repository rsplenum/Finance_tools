/**
 * Yearly figures from one or two answers, so the page never asks for every year: one figure for every year, or a first
 * year that grows, or falls, by a percentage a year (depreciation on the written-down value falls by its rate); the EMIs
 * of loans already running, by the months of each year they are paid in; and a yearly figure from the month it starts
 * (the new asset's income). Pure — no DOM. Each is checked against a closed form (dscr-check.ts); figures are withheld
 * unless both agree.
 */
import type { Blocked, Needs } from './dscr';
import { emisCheck, fromMonthCheck, seriesCheck } from './dscr-check';

export type SeriesKind = 'same' | 'grow' | 'fall';
export interface Rule { kind: SeriesKind; first?: number; pct?: number }
/** A loan already running: its EMI a month, and the month of its last EMI ('YYYY-MM') when it ends. */
export interface RunningLoan { emi?: number; last?: string }

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isMonth = (s?: string): s is string => typeof s === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
const close = (a: number, b: number) => Math.abs(a - b) <= Math.max(0.01, 1e-9 * Math.max(Math.abs(a), Math.abs(b)));
const agree = (out: number[], check: number[], label: string): number[] | Blocked =>
  out.length === check.length && out.every((v, k) => close(v, check[k])) ? out : { blocked: `The two computations disagree on ${label}, so no figures are shown. Please report this.` };

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
  return agree(out, seriesCheck(rule.kind, first, pct, count), label);
}

/** The twelve months of financial year '2026-27', April to March, as 'YYYY-MM'. */
function monthsOf(fy: string): string[] {
  const first = Number(fy.slice(0, 4)) * 12 + 3;
  return Array.from({ length: 12 }, (_, k) => `${Math.floor((first + k) / 12)}-${String(((first + k) % 12) + 1).padStart(2, '0')}`);
}

/**
 * The EMIs of loans already running, paid in each year: every loan's EMI for each month of the year, or only up to the
 * month of its last EMI when that is given. With several loans, what is missing names the loan by its number.
 */
export function emisByYear(loans: RunningLoan[], years: string[], label: string): number[] | Needs | Blocked {
  const needs: string[] = [], of = (i: number) => (loans.length > 1 ? ` of loan ${i + 1}` : '');
  if (!loans.length) needs.push(`${label}: the EMI a month`);
  loans.forEach((l, i) => {
    if (!isNum(l.emi)) needs.push(`${label}: the EMI a month${of(i)}`);
    else if (l.emi < 0) needs.push(`${label}: the EMI a month${of(i)}, as zero or more`);
    if (l.last !== undefined && !isMonth(l.last)) needs.push(`${label}: the month of the last EMI${of(i)}, like 2028-03`);
  });
  if (needs.length) return { needs };
  const paid = loans as { emi: number; last?: string }[];
  const out = years.map((fy) => monthsOf(fy).reduce((t, ym) => t + paid.reduce((s, l) => s + (l.last === undefined || ym <= l.last ? l.emi : 0), 0), 0));
  return agree(out, emisCheck(paid, years), label);
}

/** A yearly figure from the month it starts running ('YYYY-MM'): a twelfth of it for each month of the year from then on. */
export function fromMonth(yearly: number | undefined, start: string | undefined, years: string[], label: string): number[] | Needs | Blocked {
  const needs: string[] = [];
  if (!isNum(yearly)) needs.push(`${label}, a year`);
  else if (yearly < 0) needs.push(`${label}, a year, as zero or more`);
  if (!isMonth(start)) needs.push(`${label}: the month it starts running, like 2026-10`);
  if (needs.length) return { needs };
  const a = yearly as number, from = start as string;
  const out = years.map((fy) => monthsOf(fy).reduce((t, ym) => t + (ym >= from ? a / 12 : 0), 0));
  return agree(out, fromMonthCheck(a, from, years), label);
}
