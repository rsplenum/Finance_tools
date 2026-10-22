/**
 * Fictional case S of tests/dscr-plan.test.ts (AG1, D-UX-66), as home's DSCR intro types it and its button opens the
 * page with it (HOME1b, D-UX-114): a firm; Rs. 4,50,000 this year, no growth; Rs. 12,00,000 at 12% for 5 years, drawn in
 * October 2026. `door('80')` is the same case over 80 instalments, Make it viable's answer.
 */
import { frontDoor, withBorrower, type State } from './model';

export const door = (instalments: string): State => {
  const s = withBorrower(frontDoor('2026-10'), 'firm');
  return { ...s, cells: { ...s.cells, pbdit: ['4,50,000'] }, modes: { ...s.modes, pbdit: 'grow' }, rates: { ...s.rates, pbdit: '0' },
    loan: { ...s.loan, amount: '12,00,000', ratePct: '12', instalments } };
};
export const DSCR_HOME = door('60');
