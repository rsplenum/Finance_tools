/**
 * Fictional case W (HOME1b, D-UX-114), in lakh, oldest year first: a wholesale trader of electrical goods asking a bank
 * for a larger cash credit, its own godown in the fixed assets, no term loan. Home's CMA intro types it, and its button
 * opens the CMA filled with it. Every figure shown is the engine's; tests/home-story.test.ts holds them to the same case
 * worked by hand: the current ratio 97.9 ÷ 94.55 = 1.0354 in the estimate's year, short of a fresh limit's 1.10, and
 * Rs. 5,55,000 of capital brought in, the bank's borrowing less by as much, bringing it to 97.9 ÷ 89 = 1.10. Nobody's
 * real data.
 */
import { inr } from '../../../engine/util';
import { HEADS, YEARS, type CmaState, type Grid } from './model';

const ROWS: Record<string, number[]> = {
  sales: [200, 220, 250, 280, 310], otherIncome: [0, 0, 0, 0, 0], materials: [160, 176, 200, 224, 248], otherDirect: [4, 4.4, 5, 5.6, 6.2],
  employees: [8, 9, 10, 11, 12], sga: [6, 6.5, 7, 7.5, 8], depreciation: [1, 1.2, 1.4, 1.6, 1.8], wcInterest: [4, 4.5, 5, 5.5, 6],
  tlInterest: [0, 0, 0, 0, 0], tax: [4.25, 4.6, 5.4, 6.2, 7], drawings: [10, 11, 13, 15, 18],
  capital: [10, 10, 10, 10, 10], reserves: [10.75, 13.55, 16.75, 20.35, 23.35], promoterLoans: [0, 0, 0, 0, 0], termLoans: [0, 0, 0, 0, 0],
  tlDue12: [0, 0, 0, 0, 0], bankWc: [55.25, 58.45, 63.75, 68.65, 74.15], creditors: [16, 17.6, 20, 22.4, 24.8], otherCl: [3, 3, 3.5, 3.5, 4],
  netBlock: [22, 23, 24, 25, 26], nonCurrent: [2, 2, 2, 2, 2], stock: [32, 35.2, 40, 44.8, 49.6], debtors: [34, 37.4, 42.5, 47.6, 52.7],
  cash: [3, 3, 3, 3, 3], otherCa: [2, 2, 2.5, 2.5, 3],
};
/** The years from 2023-24 (audited) to 2027-28 (projection); a fresh limit, as the levels for it; the limit now 65 lakh. */
export const CMA_HOME: CmaState = {
  startYear: 2026, existingLimit: inr(65_00_000), quasi: false, loanCase: 'fresh', collateral: '', promotersMost: '',
  doc: { name: 'Example Electricals', preparedBy: '' },
  figures: Object.fromEntries(YEARS.map((y, k) => [y.id, Object.fromEntries(HEADS.map((h) => [h.id, inr(Math.round(ROWS[h.id][k] * 100_000))]))])) as Grid,
};
