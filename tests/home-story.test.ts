/**
 * The home page's DSCR story (site/src/home/story.ts, AG1, D-UX-66): case S of tests/dscr-plan.test.ts typed into the
 * front door. The figures shown are the engine's; they are held here to the figures worked by hand in that file's header
 * (as typed: average 1.238074, lowest 1.002861 in 2030-31; 80 EMIs: average 1.514052, lowest 1.205230 in 2032-33; 20
 * more EMIs) and to the second computation, planCheck (engine/dscr-check.ts).
 * The trailer's two sums (AG3, D-UX-77), each the lowest year's cash available over its debt service, worked by closed
 * form (model-worked). As typed, 2030-31 with 60 EMIs: EMIs 43 to 54, so principal B(42) − B(54) on the 60-month
 * schedule, and the same steps as below give 3,21,236 ÷ 3,20,320 = 1.002861. With 80 EMIs, 2032-33: EMI
 * 21,862.6201; the first EMI in October 2026, so the year holds EMIs 67 to 78. Balance after k EMIs B(k) = L(1+r)^k −
 * EMI((1+r)^k − 1)/r: principal B(66) − B(78) = 2,41,217.02, interest 12 × EMI − principal = 21,134.42, service
 * 2,62,351.44; profit before tax 4,50,000 − 21,134.42 = 4,28,865.58, tax 31.2% of it 1,33,806.06, after tax 2,95,059.52,
 * cash available with the interest added back 3,16,193.94; DSCR 3,16,193.94 ÷ 2,62,351.44 = 1.205230.
 */
import { describe, expect, it } from 'vitest';
import { planCheck } from '../engine/dscr-check';
import { dscrCaseOf } from '../site/src/dscr/model';
import { write } from '../site/src/home/pen';
import { DSCR_TRAILER, STORY_CASE, STORY_FIX, STORY_FIXED, STORY_INPUTS, STORY_LONGER, STORY_TARGET, STORY_TYPED } from '../site/src/home/story';

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

describe('the trailer', () => {
  const lines = DSCR_TRAILER.lines;
  it('seven lines: the question, the case, the sum as typed, the change, the sum that passes', () =>
    expect(lines.map((l) => [l.kind, l.text])).toEqual([
      ['title', 'Will the loan pass?'],
      ['hand', 'Profit 4,50,000 a year'],
      ['hand', 'Loan 12,00,000 · 12% · 5 years'],
      ['card', 'Lowest year · target 1.20'],
      ['hand', '3,21,236 ÷ 3,20,320 = 1.00'],
      ['card', 'Over 80 instalments'],
      ['hand', '3,16,194 ÷ 2,62,351 = 1.21 ✓'],
    ]));
  it('the marker swipes the result that passes, and the sums are the lowest years the engine finds', () => {
    expect(lines.at(-1)?.mark).toBe(STORY_LONGER.lowest);
    expect([STORY_TYPED.lowestYear, STORY_LONGER.lowestYear]).toEqual(['2030-31', '2032-33']);
  });
  it('each sum within a rupee of the closed form', () => {
    const L = 1200000, r = 0.01;
    const year = (n: number, from: number) => {
      const emi = L * r / (1 - (1 + r) ** -n), B = (k: number) => L * (1 + r) ** k - emi * ((1 + r) ** k - 1) / r;
      const principal = B(from) - B(from + 12), interest = 12 * emi - principal, pbt = 450000 - interest;
      return [pbt - 0.312 * pbt + interest, interest + principal];
    };
    const sums = [lines[4].text, lines[6].text].map((t) => t.match(/[\d,]+(?= ÷)|(?<=÷ )[\d,]+/g)!.map((v) => Number(v.replace(/,/g, ''))));
    for (const [k, want] of [year(60, 42), year(80, 66)].entries()) {
      sums[k].forEach((v, i) => expect(Math.abs(v - want[i])).toBeLessThanOrEqual(0.5));
      expect((want[0] / want[1]).toFixed(2)).toBe(['1.00', '1.21'][k]);
    }
    expect((year(60, 42)[0] / year(60, 42)[1]).toFixed(6)).toBe('1.002861');
    expect((year(80, 66)[0] / year(80, 66)[1]).toFixed(6)).toBe('1.205230');
  });
  it('the pen has every letter the trailer writes', () => {
    for (const l of lines.filter((x) => x.kind !== 'card')) expect(write(l.text).strokes.length).toBeGreaterThan(l.text.replace(/\s/g, '').length - 1);
  });
});
