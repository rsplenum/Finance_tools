/**
 * The home page's DSCR story (site/src/home/story.ts, AG1, D-UX-66): case S of tests/dscr-plan.test.ts typed into the
 * front door. The figures shown are the engine's; they are held here to the figures worked by hand in that file's header
 * (as typed: average 1.238074, lowest 1.002861 in 2030-31; 80 EMIs: average 1.514052, lowest 1.205230 in 2032-33; 20
 * more EMIs) and to the second computation, planCheck (engine/dscr-check.ts).
 */
import { describe, expect, it } from 'vitest';
import { planCheck } from '../engine/dscr-check';
import { dscrCaseOf } from '../site/src/dscr/model';
import { STORY_CASE, STORY_FIX, STORY_FIXED, STORY_INPUTS, STORY_LONGER, STORY_TARGET, STORY_TYPED } from '../site/src/home/story';

const check = (s: typeof STORY_CASE) => { const c = dscrCaseOf(s)!; return planCheck(c.proj, c.loan, c.def); };

describe('the story as typed', () => {
  it('six years, each DSCR as the engine words it', () =>
    expect(STORY_TYPED.years.map((y) => `${y.fy} ${y.dscr}`)).toEqual(
      ['2026-27 2.07', '2027-28 1.09', '2028-29 1.06', '2029-30 1.03', '2030-31 1.00', '2031-32 1.94']));
  it('misses both levels, as worked by hand', () => {
    expect([STORY_TYPED.average, STORY_TYPED.lowest, STORY_TYPED.lowestYear, STORY_TYPED.meets]).toEqual(['1.24', '1.00', '2030-31', false]);
    expect(STORY_TYPED.verdict).toBe('Below the target: the lowest year, 2030-31, is 1.00 against 1.20; the average is 1.24 against 1.50.');
    expect(Math.min(...STORY_TYPED.years.map((y) => y.n))).toBeCloseTo(1.002861, 6);
  });
  it('the second computation agrees', () => {
    const k = check(STORY_CASE);
    expect(k.average).toBeCloseTo(1.238074, 6);
    expect([k.minimum?.dscr.toFixed(6), k.minimum?.fy]).toEqual(['1.002861', '2030-31']);
    STORY_TYPED.years.forEach((y, i) => expect(y.n).toBeCloseTo(k.rows[i].dscr as number, 9));
  });
  it('the seven inputs and the target', () => {
    expect(STORY_INPUTS.map((x) => x.value)).toEqual(['A firm', 'Rs. 4,50,000', '0%', 'None', 'Rs. 12,00,000', '12% a year', '5 years']);
    expect(STORY_TARGET).toEqual({ minimum: '1.20', average: '1.50' });
  });
});

describe('the story with the longer repayment', () => {
  it('20 more EMIs, in the engine words of Make it viable', () => {
    expect(STORY_FIX.move).toBe('+20 instalments');
    expect(STORY_FIX.text).toBe('80 monthly instalments, 6 years 8 months in all, meet the target, if the lender agrees (at most 180 months).');
  });
  it('meets both levels, as worked by hand and by the second computation', () => {
    expect(STORY_LONGER.years.map((y) => y.fy)).toEqual(['2026-27', '2027-28', '2028-29', '2029-30', '2030-31', '2031-32', '2032-33', '2033-34']);
    expect([STORY_LONGER.average, STORY_LONGER.lowest, STORY_LONGER.lowestYear, STORY_LONGER.meets]).toEqual(['1.51', '1.21', '2032-33', true]);
    expect(STORY_LONGER.verdict).toBe('Meets the target: the lowest year, 2032-33, is 1.21 against 1.20; the average is 1.51 against 1.50.');
    const k = check(STORY_FIXED);
    expect(k.average).toBeCloseTo(1.514052, 6);
    expect([k.minimum?.dscr.toFixed(6), k.minimum?.fy]).toEqual(['1.205230', '2032-33']);
  });
});
