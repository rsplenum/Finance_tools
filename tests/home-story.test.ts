/**
 * The home page's DSCR story (site/src/home/story.ts, AG1, D-UX-66): case S of tests/dscr-plan.test.ts typed into the
 * front door. The figures shown are the engine's; they are held here to the figures worked by hand in that file's header
 * (as typed: average 1.238074, lowest 1.002861 in 2030-31; 80 EMIs: average 1.514052, lowest 1.205230 in 2032-33; 20
 * more EMIs) and to the second computation, planCheck (engine/dscr-check.ts).
 * The scratch paper's lowest year (AG3, D-UX-74), 2032-33 with 80 EMIs, worked by closed form (model-worked): EMI
 * 21,862.6201; the first EMI in October 2026, so the year holds EMIs 67 to 78. Balance after k EMIs B(k) = L(1+r)^k −
 * EMI((1+r)^k − 1)/r: principal B(66) − B(78) = 2,41,217.02, interest 12 × EMI − principal = 21,134.42, service
 * 2,62,351.44; profit before tax 4,50,000 − 21,134.42 = 4,28,865.58, tax 31.2% of it 1,33,806.06, after tax 2,95,059.52,
 * cash available with the interest added back 3,16,193.94; DSCR 3,16,193.94 ÷ 2,62,351.44 = 1.205230.
 */
import { describe, expect, it } from 'vitest';
import { planCheck } from '../engine/dscr-check';
import { dscrCaseOf } from '../site/src/dscr/model';
import { DSCR_PAPER, STORY_CASE, STORY_FIX, STORY_FIXED, STORY_INPUTS, STORY_LONGER, STORY_TARGET, STORY_TYPED } from '../site/src/home/story';

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

describe('the scratch paper', () => {
  const step = (k: number) => DSCR_PAPER.steps[k].lines;
  const rupees = (v?: string) => Number(v?.replace(/,/g, ''));
  it('five steps, in the order the story goes', () =>
    expect(DSCR_PAPER.steps.map((s) => s.head)).toEqual(['What the firm typed', "Each year's DSCR, as typed", 'A longer repayment',
      "Each year's DSCR, with 80 instalments", 'The lowest year worked out, 2032‑33']));
  it("the answers and both rows of years are the story's own", () => {
    expect(step(0).map((l) => l.value)).toEqual(STORY_INPUTS.map((x) => x.value));
    expect(step(1)[0].years?.map((y) => y.value)).toEqual(STORY_TYPED.years.map((y) => y.dscr));
    expect(step(3)[0].years?.map((y) => y.value)).toEqual(STORY_LONGER.years.map((y) => y.dscr));
    expect(step(1).slice(1).map((l) => l.value ?? l.label)).toEqual(['1.00', '1.24', 'Below the target.']);
    expect(step(3).slice(1).map((l) => l.value ?? l.label)).toEqual(['1.21', '1.51', 'Meets the target.']);
    expect(step(2)[0].label).toBe(STORY_FIX.text);
  });
  it("the lowest year in the statement's own lines and marks", () =>
    expect(step(4).map((l) => [l.label, l.value, l.kind ?? ''])).toEqual([
      ['Profit before interest, depreciation and tax', '4,50,000', ''],
      ['Less: interest on term loans', '21,134', 'less'],
      ['Profit before tax', '4,28,866', 'sub'],
      ['Less: tax', '1,33,806', 'less'],
      ['Profit after tax', '2,95,060', 'sub'],
      ['Add: interest on term loans', '21,134', ''],
      ['Cash available (A)', '3,16,194', 'sub'],
      ['Term-loan instalments (principal)', '2,41,217', ''],
      ['Interest on term loans', '21,134', ''],
      ['Debt service (B)', '2,62,351', 'sub'],
      ['DSCR (A ÷ B), against 1.20', '1.21', 'total'],
    ]));
  it('each amount within a rupee of the closed form, and the DSCR counted from the lowest as typed', () => {
    const L = 1200000, r = 0.01, emi = L * r / (1 - (1 + r) ** -80), B = (k: number) => L * (1 + r) ** k - emi * ((1 + r) ** k - 1) / r;
    const principal = B(66) - B(78), interest = 12 * emi - principal, pbt = 450000 - interest, tax = 0.312 * pbt;
    const available = pbt - tax + interest, service = interest + principal;
    expect([principal, interest, available / service].map((x) => x.toFixed(2))).toEqual(['241217.02', '21134.42', '1.21']);
    expect((available / service).toFixed(6)).toBe('1.205230');
    const want = [450000, interest, pbt, tax, pbt - tax, interest, available, principal, interest, service];
    step(4).slice(0, -1).forEach((l, i) => expect(Math.abs(rupees(l.value) - want[i])).toBeLessThanOrEqual(0.5));
    expect(step(4).at(-1)).toMatchObject({ value: STORY_LONGER.lowest, from: STORY_TYPED.lowest, tick: true });
  });
});
