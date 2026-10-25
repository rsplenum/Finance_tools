/**
 * Make it viable on the DSCR front door, as the page says it (site/src/dscr/levers.ts, MV5, D-UX-57): fictional case S of
 * tests/dscr-plan.test.ts typed into the front door (a firm; Rs. 4,50,000 this year, no growth; Rs. 12,00,000 at 12% for
 * 5 years, drawn in October 2026), with the targets typed as worked there (1.50 and 1.20; the default lowest year is 1.25
 * from UXR3). Every figure is the engine's, worked by hand there.
 */
import { describe, it, expect } from 'vitest';
import { frontDoor, preview, withBorrower, type State } from '../site/src/dscr/model';
import { applyDscrPlan, dscrBoardOf, dscrLevelsOf, dscrPlanOf, dscrViableOf, undoDscrPlan } from '../site/src/dscr/levers';
import { dscrCaseOf } from '../site/src/dscr/model';

const door = (pbdit: string, x: Partial<State> = {}): State => {
  const s = withBorrower(frontDoor('2026-10'), 'firm');
  return { ...s, cells: { ...s.cells, pbdit: [pbdit] }, modes: { ...s.modes, pbdit: 'grow' }, rates: { ...s.rates, pbdit: '0' },
    loan: { ...s.loan, amount: '12,00,000', ratePct: '12', instalments: '60' }, target: { average: '1.5', minimum: '1.2' }, ...x };
};
const S = door('4,50,000');

describe('case S on the front door', () => {
  it('reaches the last year a 180-month term could', () => {
    const c = dscrCaseOf(S)!;
    expect([c.proj.length, c.proj[0].fy, c.proj.at(-1)?.fy, c.shown, c.proj.every((y) => y.pbdit === 450000)]).toEqual([16, '2026-27', '2041-42', 6, true]);
  });
  it('the fewest instalments read the same later years as the board', () => {
    expect(preview(S).fewest).toEqual({ text: 'The fewest instalments for Rs. 12,00,000 are 80 monthly.', instalments: 80 });
    expect(preview(door('2,50,000')).fewest?.text).toBe('No repayment within 180 months meets the target.');
  });
  it('the bars, each with the cash it is short of', () => {
    const l = dscrLevelsOf(S)!;
    expect(l.misses).toBe(true);
    expect(l.checks.map((k) => [k.id, k.worst, k.verdict, k.short])).toEqual([
      ['average', '1.24 over the loan', 'misses', 'Short by Rs. 4,19,502 of cash to pay the loan, in total over the loan.'],
      ['lowest', '1.00 in 2030-31', 'misses', 'Short by Rs. 63,148 of cash to pay the loan in 2030-31.'],
    ]);
  });
  it('each change alone', () => {
    const v = dscrViableOf(S)!;
    expect(v.lines.map((l) => [l.id, l.move, l.text])).toEqual([
      ['cut', 'Rs. 2,21,072 less', 'A loan of Rs. 9,78,928, the largest on these terms, meets the target: you bring the rest, or buy less.'],
      ['profit', '+22.6%', 'This year’s profit before interest, depreciation and tax of Rs. 5,51,624, every later year in step, meets the target.'],
      ['more', '+20 instalments', '80 monthly instalments, 6 years 8 months in all, meet the target, if the lender agrees (at most 180 months).'],
    ]);
  });
  it('the plan without the most: 20 more instalments; used, then undone', () => {
    const q = dscrPlanOf(S)!, b = dscrBoardOf(q, q.levers);
    expect([q.levers, q.cards.map((c) => c.id), b.works, b.steps, b.verdict]).toEqual([{ cut: 0, more: 20, profit: 0 }, ['cut', 'more', 'profit'], true,
      ['80 monthly instalments, 6 years 8 months in all (now 5 years), if the lender agrees.'], 'With these changes it meets the target.']);
    const u = applyDscrPlan(S, q.levers);
    expect([u.s.loan.instalments, u.s.loan.amount, u.changes]).toEqual(['80', '12,00,000', [{ key: 'instalments', label: 'Number of instalments', was: '60', now: '80' }]]);
    expect(undoDscrPlan(u.s, u.changes).loan.instalments).toBe('60');
  });
  it('with Rs. 1,00,000 of the borrower’s own: all of it, then 10 more', () => {
    const q = dscrPlanOf({ ...S, ownMost: '1 L' })!, b = dscrBoardOf(q, q.levers);
    expect([q.levers, q.atLimit, b.own]).toEqual([{ cut: 100000, more: 10, profit: 0 }, 'At the limit: your money.', 'You bring Rs. 1,00,000 in place of the loan, within the Rs. 1,00,000 you can.']);
    expect(applyDscrPlan(S, q.levers).s.loan).toMatchObject({ amount: '11,00,000', instalments: '70' });
  });
  it('the profit is shown, never written', () => {
    const q = dscrPlanOf(S, { more: 0 })!, b = dscrBoardOf(q, q.levers);
    expect([q.levers, b.verdict]).toEqual([{ cut: 0, more: 0, profit: 101624 }, 'With these changes it meets the target, but only with the higher profit, which the plan does not write.']);
    expect(applyDscrPlan(S, q.levers).changes).toEqual([]);
  });
});
