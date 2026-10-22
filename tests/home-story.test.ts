/**
 * Home's four intros (HOME1b, D-UX-114; site/src/home/story.ts): each tool's fictional case, its figures the engine's,
 * held here to the same case worked by hand.
 * The DSCR, case S of tests/dscr-plan.test.ts typed into the front door (as typed: average 1.238074, lowest 1.002861 in
 * 2030-31; 80 EMIs: average 1.514052, lowest 1.205230 in 2032-33; 20 more EMIs), and the second computation, planCheck
 * (engine/dscr-check.ts). Each sum is the lowest year's cash available over its debt service, by closed form
 * (model-worked): with 80 EMIs, 2032-33, EMI 21,862.6201, the first in October 2026, so the year holds EMIs 67 to 78.
 * Balance after k EMIs B(k) = L(1+r)^k − EMI((1+r)^k − 1)/r: principal B(66) − B(78) = 2,41,217.02, interest
 * 12 × EMI − principal = 21,134.42, service 2,62,351.44; profit before tax 4,50,000 − 21,134.42 = 4,28,865.58, tax
 * 31.2% of it 1,33,806.06, cash available with the interest added back 3,16,193.94; DSCR 1.205230. As typed, 2030-31
 * with 60 EMIs: EMIs 43 to 54, the same steps give 3,21,236 ÷ 3,20,320 = 1.002861.
 * The project report, case R at 70 lakh of sales, its first year (2026-27) the lowest, as worked by hand in
 * tests/viable.test.ts: available 5,95,000, service 7,27,083.33, DSCR 0.8183; Make it viable's sales of 82,11,000 give
 * profit before tax 0.35 × 82,11,000 − 18,00,000 − 4,20,000 − 20,000 − 2,27,083.33 − 55,000 = 3,51,766.67, tax 31.2%
 * 1,09,751.20, available with depreciation, the preliminary expenses and the interest added back 9,09,098.80; DSCR
 * 9,09,098.80 ÷ 7,27,083.33 = 1.250336.
 * The estimate, the flat of tests/plan-page.test.ts, each total also worked the second way (engine/architect-check.ts);
 * the 12 lakh is the case's budget.
 * CMA data, case W (site/src/cma/home-case.ts), in lakh (model-worked from the case's own rows): current assets are
 * stock 16% + debtors 17% of sales + cash 3 + other; current liabilities the bank's 55.25 to 74.15 + creditors 8% of
 * sales + other. 2026-27 (sales 280): 44.8 + 47.6 + 3 + 2.5 = 97.9 over 68.65 + 22.4 + 3.5 = 94.55, 1.0354, below the
 * fresh limit's 1.10. 2027-28 (sales 310): 108.3 over 102.95, 1.0520. The capital that lifts 2026-27 to 1.10 is
 * 94.55 − 97.9 ÷ 1.1 = 5.5500 lakh (Rs. 5,55,000), which repays the bank: 97.9 ÷ 89 = 1.1000, and 108.3 ÷ 97.4 =
 * 1.1119 in 2027-28. The turnover-method limit for 2027-28: 25% of 310 = 77.5, less the larger of 5% of sales (15.5)
 * and the net working capital (108.3 − 102.95 = 5.35), so 62 lakh. Each year balances: capital + reserves + current
 * liabilities = net block + 2 + current assets (95, 103.1, 113.5, 124.9, 135.05).
 */
import { describe, expect, it } from 'vitest';
import { planCheck } from '../engine/dscr-check';
import { dscrCaseOf } from '../site/src/dscr/model';
import { architectCheck } from '../engine/architect-check';
import { inputOf } from '../site/src/estimate/plan-model';
import { preview as reportPreview } from '../site/src/report/model';
import { CMA_FIX, ESTIMATE_BUDGET, ESTIMATE_CASE, ESTIMATE_FIXED, INTROS, REPORT_CASE, REPORT_FIX, REPORT_FIXED } from '../site/src/home/story';
import { STORY_CASE, STORY_FIX, STORY_FIXED, STORY_LONGER, STORY_TARGET, STORY_TYPED } from '../site/src/home/story';
import { READY } from '../site/src/site';

const check = (s: typeof STORY_CASE) => { const c = dscrCaseOf(s)!; return planCheck(c.proj, c.loan, c.def); };
const intro = (id: string) => INTROS.find((i) => i.id === id)!;
const sumOf = (t: string) => t.match(/[\d,]+(?= ÷)|(?<=÷ )[\d,]+/g)!.map((v) => Number(v.replace(/,/g, '')));

describe('the DSCR as typed', () => {
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
    expect(STORY_TARGET).toEqual({ minimum: '1.20', average: '1.50' });
  });
});

describe('the DSCR with the longer repayment', () => {
  it('20 more EMIs, in the engine words of Make it viable', () => {
    expect(STORY_FIX.move).toBe('+20 instalments');
    expect(STORY_FIX.text).toBe('80 monthly instalments, 6 years 8 months in all, meet the target, if the lender agrees (at most 180 months).');
  });
  it('meets both levels, as worked by hand and by the second computation', () => {
    expect([STORY_LONGER.average, STORY_LONGER.lowest, STORY_LONGER.lowestYear, STORY_LONGER.meets]).toEqual(['1.51', '1.21', '2032-33', true]);
    const k = check(STORY_FIXED);
    expect(k.average).toBeCloseTo(1.514052, 6);
    expect([k.minimum?.dscr.toFixed(6), k.minimum?.fy]).toEqual(['1.205230', '2032-33']);
  });
});

describe('the DSCR intro', () => {
  const d = intro('dscr');
  it('the seven inputs of the front door (D-UX-10), the sums and the verdicts', () => {
    expect(d.inputs.map(([, v]) => v)).toEqual(['A firm', 'Rs. 4,50,000', '0%', 'None', 'Rs. 12,00,000', '12%', '60 instalments (5 years)']);
    expect([d.typed.sum, d.typed.verdict, d.fixed.sum, d.fixed.verdict]).toEqual([
      '2030-31  3,21,236 ÷ 3,20,320 = 1.00', 'BELOW TARGET 1.20', '2032-33  3,16,194 ÷ 2,62,351 = 1.21', 'PASSES']);
    expect(d.typed.bars.map((b) => b.meets)).toEqual([true, false, false, false, false, true]);
    expect(d.fix).toBe('› make it viable · term → 80 instalments');
  });
  it('each sum within a rupee of the closed form', () => {
    const L = 1200000, r = 0.01;
    const year = (n: number, from: number) => {
      const emi = L * r / (1 - (1 + r) ** -n), B = (k: number) => L * (1 + r) ** k - emi * ((1 + r) ** k - 1) / r;
      const principal = B(from) - B(from + 12), interest = 12 * emi - principal, pbt = 450000 - interest;
      return [pbt - 0.312 * pbt + interest, interest + principal];
    };
    const sums = [d.typed.sum, d.fixed.sum].map(sumOf);
    for (const [k, want] of [year(60, 42), year(80, 66)].entries()) sums[k].forEach((v, i) => expect(Math.abs(v - want[i])).toBeLessThanOrEqual(0.5));
    expect((year(60, 42)[0] / year(60, 42)[1]).toFixed(6)).toBe('1.002861');
    expect((year(80, 66)[0] / year(80, 66)[1]).toFixed(6)).toBe('1.205230');
  });
});

describe('the project report intro', () => {
  const p = intro('report');
  it('Make it viable\'s higher sales, the lowest year the first, short of its level and then meeting it', () => {
    expect(REPORT_FIX).toEqual({ move: '+17.3%', sales: '82,11,000', from: '70,00,000' });
    for (const s of [REPORT_CASE, REPORT_FIXED]) expect(reportPreview(s).checks?.find((c) => c.id === 'dscrLowest')?.worst).toMatch(/ in 2026-27$/);
    expect([p.level.text, p.typed.sum, p.typed.verdict, p.fixed.sum, p.fixed.verdict]).toEqual([
      '1.25', '2026-27  5,95,000 ÷ 7,27,083 = 0.82', 'BELOW LEVEL 1.25', '2026-27  9,09,099 ÷ 7,27,083 = 1.25', 'PASSES']);
    expect(p.typed.bars.map((b) => b.text)).toEqual(['0.82', '1.02', '1.24', '1.54', '1.92']);
    expect(p.fixed.bars.map((b) => b.text)).toEqual(['1.25', '1.49', '1.81', '2.21', '2.73']);
  });
  it('each sum within a rupee of the hand-worked first year', () => {
    const interest = (12 * 2500000 - 2500000 / 60 * 66) * 10 / 1200;
    const year1 = (sales: number) => {
      const pbt = 0.35 * sales - 1800000 - 420000 - 20000 - interest - 55000, pat = pbt > 0 ? pbt * (1 - 0.312) : pbt;
      return [pat + 420000 + 20000 + interest, 500000 + interest];
    };
    const sums = [p.typed.sum, p.fixed.sum].map(sumOf);
    for (const [k, want] of [year1(7000000), year1(8211000)].entries()) sums[k].forEach((v, i) => expect(Math.abs(v - want[i])).toBeLessThanOrEqual(0.5));
    expect((year1(7000000)[0] / year1(7000000)[1]).toFixed(4)).toBe('0.8183');
    expect((year1(8211000)[0] / year1(8211000)[1]).toFixed(6)).toBe('1.250336');
  });
});

describe('the estimate intro', () => {
  const e = intro('estimate'), total = (t: string) => Number(t.replace(/[^\d]/g, ''));
  it('Standard everywhere over the budget, Basic bedrooms within it, each total the second computation\'s', () => {
    expect([e.typed.sum, e.typed.verdict, e.fixed.sum, e.fixed.verdict]).toEqual(['total  12,47,185', 'OVER BUDGET 12,00,000', 'total  11,65,322', 'WITHIN BUDGET']);
    const [at, fixed] = [ESTIMATE_CASE, ESTIMATE_FIXED].map((s) => architectCheck(inputOf(s)).total);
    expect(Math.abs(total(e.typed.sum) - at)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(total(e.fixed.sum) - fixed)).toBeLessThanOrEqual(0.5);
    expect([at > ESTIMATE_BUDGET.n, fixed <= ESTIMATE_BUDGET.n]).toEqual([true, true]);
  });
});

describe('the CMA intro, case W', () => {
  const c = intro('cma');
  const sales = [200, 220, 250, 280, 310], bank = [55.25, 58.45, 63.75, 68.65, 74.15], otherCl = [3, 3, 3.5, 3.5, 4], otherCa = [2, 2, 2.5, 2.5, 3];
  const ca = (k: number) => 0.33 * sales[k] + 3 + otherCa[k], cl = (k: number) => bank[k] + 0.08 * sales[k] + otherCl[k];
  it('each year balances, as the case is written', () => {
    const reserves = [10.75, 13.55, 16.75, 20.35, 23.35];
    sales.forEach((_, k) => expect(10 + reserves[k] + cl(k)).toBeCloseTo(22 + k + 2 + ca(k), 9));
  });
  it('the current ratio by hand: the estimate below the fresh limit\'s 1.10, the audited years shown, not judged', () => {
    expect((ca(3) / cl(3)).toFixed(4)).toBe('1.0354');
    expect(c.level.text).toBe('1.10');
    expect(c.typed.bars.map((b) => [b.label, b.text, b.judged])).toEqual([
      ['2023-24', (ca(0) / cl(0)).toFixed(2), false], ['2024-25', (ca(1) / cl(1)).toFixed(2), false], ['2025-26', (ca(2) / cl(2)).toFixed(2), false],
      ['2026-27', '1.04', true], ['2027-28', (ca(4) / cl(4)).toFixed(2), true]]);
    expect([c.typed.sum, c.typed.verdict]).toEqual(['2026-27  97,90,000 ÷ 94,55,000 = 1.04', 'BELOW LEVEL 1.10']);
  });
  it('the capital that meets it, by hand, and the ratio it gives', () => {
    expect(CMA_FIX.n).toBe(Math.ceil((cl(3) - ca(3) / 1.1) * 1e5 - 1e-6));
    expect(CMA_FIX.n).toBe(555000);
    expect([c.fixed.sum, c.fixed.verdict]).toEqual(['2026-27  97,90,000 ÷ 89,00,000 = 1.10', 'PASSES']);
    expect(c.fixed.bars.at(-1)?.text).toBe((ca(4) / (cl(4) - 5.55)).toFixed(2));
  });
  it('the turnover-method limit for the projection, by hand', () => {
    const lim = 0.25 * sales[4] - Math.max(0.05 * sales[4], ca(4) - cl(4));
    expect(lim).toBeCloseTo(62, 9);
    expect(c.aside).toBe('› limit by the turnover method, 2027-28: Rs. 62,00,000');
  });
});

describe('the four intros', () => {
  it('each tool once, in the site\'s order, each button opening its tool with the case', () => {
    expect(INTROS.map((i) => i.go.href.split('?')[0])).toEqual(READY.map((t) => t.href));
    expect(INTROS.every((i) => i.go.href.endsWith('?case=home'))).toBe(true);
    expect(new Set(INTROS.map((i) => i.id)).size).toBe(4);
  });
  it('each reads short of its level as typed and meets it after the change', () =>
    expect(INTROS.map((i) => [i.typed.meets, i.fixed.meets])).toEqual(INTROS.map(() => [false, true])));
});
