/**
 * The project report's case R (tests/report.test.ts, a box factory) with its sales cut to 70 lakh, so it misses, as
 * worked by hand in tests/viable.test.ts: home's intro types it and its button opens the page with it, in expert mode, as
 * it has no mode (HOME1b, D-UX-114).
 */
import { EMPTY, type ReportState } from './model';

export const REPORT_HOME: ReportState = {
  ...EMPTY, borrower: 'firm',
  cost: { ...EMPTY.cost, building: '10 L', machinery: '20 L', furniture: '2 L', preliminary: '1 L' },
  loan: { amount: '25,00,000', ratePct: '10', disbursed: '2026-04', moratoriumMonths: '0', instalments: '60', repayment: 'monthly' },
  salesBy: 'typed', monthsToStart: '0', sales: '70,00,000', salesGrowth: '10', variablePct: '65', fixed: '18 L', fixedGrowth: '5', wcLimit: '5 L', wcRate: '11',
  doc: { name: 'Asha Packaging', activity: 'Manufacture of corrugated boxes', address: 'Plot 4, Example MIDC, Pune', lender: '', preparedBy: '' },
};
