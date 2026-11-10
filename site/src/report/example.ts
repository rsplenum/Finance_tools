/**
 * The page's worked example (BUILD1, D-UX-342): a fictional snack maker whose project passes every check, in simple mode,
 * so the builder shows a report a lender would read. Home's intro keeps its own case, which misses (home-case.ts).
 *
 * Simple mode draws the loan this month, so the example's sales start is set from today: three months on, or the next
 * April when that would leave the first financial year under six months of sales. A first year of a few months carries
 * its interest on a few months' sales and misses interest cover: true of such a year, and not what an example is for.
 * tests/report-example.test.ts works its first year by hand and holds it passing for every month it can be opened in.
 */
import { EMPTY, type ReportState } from './model';

/** The month sales start, as the page's month field holds it (2027-04). */
export function exampleSellFrom(today: Date): string {
  const d = new Date(today.getFullYear(), today.getMonth() + 3, 1);
  if (d.getMonth() < 3) d.setMonth(3); else if (d.getMonth() > 9) d.setMonth(15);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export const reportExample = (today = new Date()): ReportState => ({
  ...EMPTY, mode: 'simple', borrower: 'firm',
  cost: { ...EMPTY.cost, building: '6 L', machinery: '20 L' },
  products: [{ name: 'Roasted chana', units: '3,000', price: '220', unit: 'kg' }, { name: 'Roasted peanuts', units: '2,000', price: '220', unit: 'kg' }],
  sellFrom: exampleSellFrom(today), variablePct: '68', fixedMonth: '1 L',
  loan: { ...EMPTY.loan, amount: '18 L', ratePct: '10' }, years: '5', wcBy: 'worked', security: 'neither',
  doc: { name: 'Meera Foods', activity: 'Roasted snacks', address: 'Example village, Nashik', lender: '', preparedBy: '' },
});
