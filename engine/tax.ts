/**
 * Tax by borrower (engine/data/tax.json, dated, with sources): who the borrower is sets the tax on a year's profit
 * before tax. A proprietor pays the new regime's slab rates, with the rebate and its marginal relief; a firm or LLP and a
 * company pay their rates; each with any surcharge (and its marginal relief) and the cess. Pure — no DOM. dscr-check.ts
 * works the tax out a second way, and the plan shows no figure unless both agree.
 */
import TAX from './data/tax.json';
import { rs } from './util';

/** The income from which a rate applies, and the rate (%). */
export type Band = [number, number];
export interface Borrower {
  id: string;
  label: string;
  who: string;
  slabs: Band[];
  rebate?: { incomeUpTo: number; max: number };
  surcharge: Band[];
  cess: number;
  law: string;
  source: string;
  kind: string;
  date: string;
  verified: boolean;
}

export const BORROWERS = TAX.borrowers as Borrower[];
export const TAX_STATUS = TAX.status;
export const borrowerOf = (id?: string) => BORROWERS.find((b) => b.id === id);

/** The slab rates by the ready reckoner: the tax up to the start of the income's slab, then that slab's rate on the rest. */
function slabTax(income: number, slabs: Band[]): number {
  let k = 0, upTo = 0;
  for (; k + 1 < slabs.length && income > slabs[k + 1][0]; k++) upTo += ((slabs[k + 1][0] - slabs[k][0]) * slabs[k][1]) / 100;
  return upTo + ((income - slabs[k][0]) * slabs[k][1]) / 100;
}

/** Income-tax after the rebate: less the rebate up to its limit of income, and above the limit never more than the income above it. */
function afterRebate(income: number, b: Borrower): number {
  const t = slabTax(income, b.slabs);
  if (!b.rebate) return t;
  return income <= b.rebate.incomeUpTo ? Math.max(0, t - b.rebate.max) : Math.min(t, income - b.rebate.incomeUpTo);
}

/**
 * The tax on a year's profit before tax, nil on a loss: income-tax after any rebate; the surcharge of the highest
 * threshold the income passes, but never more than the tax at that threshold plus the income above it (marginal relief);
 * then the cess on both.
 */
export function taxOn(income: number, b: Borrower): number {
  if (!(income > 0)) return 0;
  let tax = afterRebate(income, b), passed = -1;
  b.surcharge.forEach(([from], i) => { if (income > from) passed = i; });
  if (passed >= 0) {
    const [from, pct] = b.surcharge[passed], below = passed > 0 ? b.surcharge[passed - 1][1] : 0;
    tax = Math.min(tax * (1 + pct / 100), afterRebate(from, b) * (1 + below / 100) + (income - from));
  }
  return tax * (1 + b.cess / 100);
}

/** The tax in one line of plain words, from the rates: "25.168%", "31.2%; 34.944% above Rs. 1,00,00,000", or the slab rates. */
export function taxSummary(b: Borrower): string {
  const cess = 1 + b.cess / 100, pct = (x: number) => `${+x.toFixed(3)}%`;
  if (b.slabs.length > 1) {
    const rates = b.slabs.map(([, r]) => r).filter((r) => r > 0);
    return `slab rates of ${rates[0]}% to ${rates[rates.length - 1]}% with ${b.cess}% cess${b.rebate ? `, nothing up to ${rs(b.rebate.incomeUpTo)} of profit` : ''}`;
  }
  const at = (surcharge: number) => pct(b.slabs[0][1] * (1 + surcharge / 100) * cess);
  const always = b.surcharge.find(([from]) => from === 0)?.[1] ?? 0;
  return [at(always), ...b.surcharge.filter(([from]) => from > 0).map(([from, s]) => `${at(s)} above ${rs(from)}`)].join('; ');
}
