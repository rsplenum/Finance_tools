/**
 * Home's four scenes (HOME1b, HOME1e; D-UX-114, D-UX-135; site/src/home/story.ts): each tool's fictional case, its figures the engine's,
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
import { CMA_FIX, CMA_SCENE, ESTIMATE_BUDGET, ESTIMATE_CASE, ESTIMATE_FIXED, ESTIMATE_SCENE, INTROS, REPORT_CASE, REPORT_FIX, REPORT_FIXED, REPORT_SCENE, SCENES } from '../site/src/home/story';
import { DSCR_SCENE, STORY_CASE, STORY_FIX, STORY_FIXED, STORY_LONGER, STORY_TARGET, STORY_TYPED } from '../site/src/home/story';
import { READY } from '../site/src/site';

const check = (s: typeof STORY_CASE) => { const c = dscrCaseOf(s)!; return planCheck(c.proj, c.loan, c.def); };
const sumOf = (t: string) => t.match(/[\d,]+(?= ÷)|(?<=÷ )[\d,]+/g)!.map((v) => Number(v.replace(/,/g, '')));

describe('the DSCR as typed', () => {
  it('six years, each DSCR as the engine words it', () =>
    expect(STORY_TYPED.years.map((y) => `${y.fy} ${y.dscr}`)).toEqual(
      ['2026-27 2.07', '2027-28 1.09', '2028-29 1.06', '2029-30 1.03', '2030-31 1.00', '2031-32 1.94']));
  it('misses both levels, as worked by hand', () => {
    expect([STORY_TYPED.average, STORY_TYPED.lowest, STORY_TYPED.lowestYear, STORY_TYPED.meets]).toEqual(['1.24', '1.00', '2030-31', false]);
    expect(STORY_TYPED.verdict).toBe('Misses 2 of 2 targets: the lowest year, 2030-31, is 1.00 against 1.25; the average is 1.24 against 1.50.');
    expect(Math.min(...STORY_TYPED.years.map((y) => y.n))).toBeCloseTo(1.002861, 6);
  });
  it('the second computation agrees', () => {
    const k = check(STORY_CASE);
    expect(k.average).toBeCloseTo(1.238074, 6);
    expect([k.minimum?.dscr.toFixed(6), k.minimum?.fy]).toEqual(['1.002861', '2030-31']);
    STORY_TYPED.years.forEach((y, i) => expect(y.n).toBeCloseTo(k.rows[i].dscr as number, 9));
    expect(STORY_TARGET).toEqual({ minimum: '1.25', average: '1.50' });
  });
});

describe('the DSCR with the longer repayment', () => {
  it('31 more EMIs, in the engine words of Make it viable', () => {
    expect(STORY_FIX.move).toBe('+31 instalments');
    expect(STORY_FIX.text).toBe('91 monthly instalments, 7 years 7 months in all, meet the target, if the lender agrees (at most 180 months).');
  });
  it('meets both levels, as worked by hand and by the second computation', () => {
    expect([STORY_LONGER.average, STORY_LONGER.lowest, STORY_LONGER.lowestYear, STORY_LONGER.meets]).toEqual(['1.63', '1.30', '2033-34', true]);
    const k = check(STORY_FIXED);
    expect(k.average).toBeCloseTo(1.627672, 6);
    expect([k.minimum?.dscr.toFixed(6), k.minimum?.fy]).toEqual(['1.302918', '2033-34']);
  });
});

// The scenes (HOME1d, HOME1e; D-UX-125, D-UX-135 to D-UX-139): the same cases and changes, the same hand-worked sums, and
// each last beat read off the document built for the case.
const sum = (x: { lead: string; result: string }) => `${x.lead}${x.result}`;

describe('the DSCR scene', () => {
  const s = DSCR_SCENE;
  it('the seven inputs of the front door (D-UX-10) in lakh (NUM1), the term changed to 91, and the target', () => {
    expect(s.inputs.map((i) => i.v)).toEqual(['A firm', 'Rs. 4.5 lakh', '0%', 'None', 'Rs. 12 lakh', '12%', '60 instalments']);
    expect(s.inputs.filter((i) => i.to).map((i) => i.to)).toEqual(['91 instalments']);
    expect([s.level.text, s.level.label, s.hub.from, s.hub.to]).toEqual(['1.25', 'target 1.25', '60', '91']);
  });
  it('the weakest year before and after, as worked by hand', () => {
    expect([sum(s.sum.typed), sum(s.sum.fixed)]).toEqual(['3,21,236 ÷ 3,20,320 = 1.00', '3,14,983 ÷ 2,41,752 = 1.30']);
    expect([s.sum.typed.head, s.sum.fixed.head]).toEqual(['2030-31: cash available ÷ debt service', '2033-34: cash available ÷ debt service']);
    expect([s.rows[s.weakest.typed].label, s.rows[s.weakest.fixed].label]).toEqual(['2030-31', '2033-34']);
    expect(s.rows.map((y) => y.typed?.text ?? '')).toEqual(['2.07', '1.09', '1.06', '1.03', '1.00', '1.94', '', '', '']);
    expect(s.rows.map((y) => y.typed?.meets)).toEqual([true, false, false, false, false, true, undefined, undefined, undefined]);
    expect(s.rows.every((y) => y.fixed.meets && y.judged)).toBe(true);
  });
  it('each sum within a rupee of the closed form', () => {
    const L = 1200000, r = 0.01;
    const year = (n: number, from: number) => {
      const emi = L * r / (1 - (1 + r) ** -n), B = (k: number) => L * (1 + r) ** k - emi * ((1 + r) ** k - 1) / r;
      const principal = B(from) - B(from + 12), interest = 12 * emi - principal, pbt = 450000 - interest;
      return [pbt - 0.312 * pbt + interest, interest + principal];
    };
    const sums = [s.sum.typed, s.sum.fixed].map((x) => sumOf(sum(x)));
    for (const [k, want] of [year(60, 42), year(91, 78)].entries()) sums[k].forEach((v, i) => expect(Math.abs(v - want[i])).toBeLessThanOrEqual(0.5));
    expect((year(60, 42)[0] / year(60, 42)[1]).toFixed(6)).toBe('1.002861');
    expect((year(91, 78)[0] / year(91, 78)[1]).toFixed(6)).toBe('1.302918');
  });
  it('the statement beat: verdict, both computations, the basis, every instalment, the signature lines', () => {
    expect(s.statement.verdict).toBe('Meets both targets: the lowest year, 2033-34, is 1.30 against 1.25; the average is 1.63 against 1.50.');
    expect(s.statement.lines.map((l) => l.head)).toEqual(['Worked out twice', 'Its basis', 'Every instalment', 'Ready to sign']);
    expect(s.statement.lines.map((l) => l.text).join(' ')).toMatch(/difference 0\.00\..*dated 30-09-2026\..*all 91 months\./);
    expect(s.statement.files).toEqual(['PDF', 'Excel', 'Word']);
  });
  it('five beats, each caption\'s figures the scene\'s own', () => {
    expect(s.beats.map((b) => b.name)).toEqual(['The bank\'s question', 'Seven answers', 'Every year worked out', 'The change that passes', 'The statement for the lender']);
    expect(s.beats[2].caption).toContain('2030-31, is 1.00 against the target 1.25');
    expect(s.beats[3].caption).toContain('the weakest, 2033-34, is 1.30');
  });
});

describe('the project report scene', () => {
  const p = REPORT_SCENE;
  it('Make it viable\'s higher sales, the lowest year the first, short of its level and then meeting it', () => {
    expect(REPORT_FIX).toEqual({ move: '+17.3%', sales: '82,11,000', from: '70,00,000' });
    for (const s of [REPORT_CASE, REPORT_FIXED]) expect(reportPreview(s).checks?.find((c) => c.id === 'dscrLowest')?.worst).toMatch(/ in 2026-27$/);
    expect([p.level.text, sum(p.sum.typed), p.chip.typed, sum(p.sum.fixed), p.chip.fixed]).toEqual([
      '1.25', '5,95,000 ÷ 7,27,083 = 0.82', 'Below level 1.25', '9,09,099 ÷ 7,27,083 = 1.25', 'Meets 1.25']);
    expect(p.rows.map((b) => b.typed?.text)).toEqual(['0.82', '1.02', '1.24', '1.54', '1.92']);
    expect(p.rows.map((b) => b.fixed.text)).toEqual(['1.25', '1.49', '1.81', '2.21', '2.73']);
    expect([p.weakest.typed, p.weakest.fixed]).toEqual([0, 0]);
  });
  it('its amounts in lakh (NUM1); the sales the one card that changes', () => {
    expect(p.inputs.map((i) => i.v)).toEqual(['Rs. 33 lakh', 'Rs. 25 lakh', '10%', '60 instalments', '65% of sales', 'Rs. 18 lakh a year', 'Rs. 70 lakh']);
    expect(p.inputs.filter((i) => i.to).map((i) => i.to)).toEqual(['Rs. 82.11 lakh']);
  });
  it('each sum within a rupee of the hand-worked first year', () => {
    const interest = (12 * 2500000 - 2500000 / 60 * 66) * 10 / 1200;
    const year1 = (sales: number) => {
      const pbt = 0.35 * sales - 1800000 - 420000 - 20000 - interest - 55000, pat = pbt > 0 ? pbt * (1 - 0.312) : pbt;
      return [pat + 420000 + 20000 + interest, 500000 + interest];
    };
    const sums = [p.sum.typed, p.sum.fixed].map((x) => sumOf(sum(x)));
    for (const [k, want] of [year1(7000000), year1(8211000)].entries()) sums[k].forEach((v, i) => expect(Math.abs(v - want[i])).toBeLessThanOrEqual(0.5));
    expect((year1(7000000)[0] / year1(7000000)[1]).toFixed(4)).toBe('0.8183');
    expect((year1(8211000)[0] / year1(8211000)[1]).toFixed(6)).toBe('1.250336');
  });
  it('the report beat: every test met, read off the report built for the case', () => {
    expect(p.statement.verdict).toMatch(/^Meets all eight tests a lender reads: the lowest DSCR is 1\.25 against 1\.25; the project costs about Rs\. 34\.75 lakh\.$/);
    expect(reportPreview(REPORT_FIXED).checks?.map((c) => c.verdict)).toEqual(Array(8).fill('meets'));
    expect(p.statement.files).toEqual(['PDF', 'Excel', 'Word']);
  });
});

describe('the estimate scene', () => {
  const e = ESTIMATE_SCENE, total = (t: string) => Number(t.replace(/[^\d]/g, '')), last = e.rows.length - 1;
  it('its budget in lakh (NUM1); the two bedrooms the one card that changes', () => {
    expect([e.level.text, e.level.at, e.inputs.find((i) => i.to)?.k, e.inputs.find((i) => i.to)?.to]).toEqual(['Rs. 12 lakh', 'most', 'The two bedrooms', 'Basic']);
  });
  it('Standard everywhere over the budget, Basic bedrooms within it, each total the second computation\'s', () => {
    expect([e.rows[last].label, e.rows[last].typed?.text, e.rows[last].fixed.text, e.chip.typed, e.chip.fixed]).toEqual(
      ['Total', '12,47,185', '11,65,322', 'Over budget Rs. 12 lakh', 'Within budget Rs. 12 lakh']);
    const [at, fixed] = [ESTIMATE_CASE, ESTIMATE_FIXED].map((s) => architectCheck(inputOf(s)).total);
    expect(Math.abs(total(sum(e.sum.typed)) - at)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(total(sum(e.sum.fixed)) - fixed)).toBeLessThanOrEqual(0.5);
    expect([at > ESTIMATE_BUDGET.n, fixed <= ESTIMATE_BUDGET.n]).toEqual([true, true]);
    expect([e.weakest.typed, e.weakest.fixed]).toEqual([last, last]);
  });
  it('a running total: each trade starts where the one before ends, and the trades add up to the total', () => {
    for (const k of ['typed', 'fixed'] as const) {
      const trades = e.rows.slice(0, last).map((r) => r[k]!);
      trades.forEach((t, i) => expect(t.from).toBe(i ? trades[i - 1].n : 0));
      expect(Math.abs(trades.reduce((a, t) => a + total(t.text), 0) - total(e.rows[last][k]!.text))).toBeLessThanOrEqual(trades.length / 2);
      expect(Math.abs(trades[trades.length - 1].n - e.rows[last][k]!.n)).toBeLessThanOrEqual(0.5);
    }
    // As typed, the trades that cross the budget are the last ones; after the change, none does.
    const miss = e.rows.map((r) => !r.typed?.meets);
    expect(miss.slice(miss.indexOf(true)).every(Boolean)).toBe(true);
    expect(e.rows.every((r) => r.fixed.meets)).toBe(true);
  });
  it('the estimate beat: the second computation\'s difference, every item and the assumptions', () => {
    expect(e.statement.lines.map((l) => l.text).join(' ')).toMatch(/difference Rs\. 0\..*each of the \d+ items/);
    expect(e.statement.verdict).toBe('Rs. 11,65,322 in all, within the budget of Rs. 12 lakh, in figures and in words.');
  });
});

describe('the CMA scene, case W', () => {
  const c = CMA_SCENE;
  const sales = [200, 220, 250, 280, 310], bank = [55.25, 58.45, 63.75, 68.65, 74.15], otherCl = [3, 3, 3.5, 3.5, 4], otherCa = [2, 2, 2.5, 2.5, 3];
  const ca = (k: number) => 0.33 * sales[k] + 3 + otherCa[k], cl = (k: number) => bank[k] + 0.08 * sales[k] + otherCl[k];
  it('each year balances, as the case is written', () => {
    const reserves = [10.75, 13.55, 16.75, 20.35, 23.35];
    sales.forEach((_, k) => expect(10 + reserves[k] + cl(k)).toBeCloseTo(22 + k + 2 + ca(k), 9));
  });
  it('the current ratio by hand: the estimate below the fresh limit\'s 1.10, the audited years shown, not judged', () => {
    expect((ca(3) / cl(3)).toFixed(4)).toBe('1.0354');
    expect(c.level.text).toBe('1.10');
    expect(c.rows.map((b) => [b.label, b.typed?.text, b.judged, b.tag])).toEqual([
      ['2023-24', (ca(0) / cl(0)).toFixed(2), false, 'audited'], ['2024-25', (ca(1) / cl(1)).toFixed(2), false, 'audited'],
      ['2025-26', (ca(2) / cl(2)).toFixed(2), false, 'audited'], ['2026-27', '1.04', true, undefined], ['2027-28', (ca(4) / cl(4)).toFixed(2), true, undefined]]);
    expect([sum(c.sum.typed), c.sum.typed.head, c.chip.typed]).toEqual(['97,90,000 ÷ 94,55,000 = 1.04', '2026-27: current assets ÷ current liabilities', 'Below level 1.10']);
    expect([c.weakest.typed, c.weakest.fixed]).toEqual([3, 3]);
  });
  it('the capital that meets it, by hand, and the ratio it gives', () => {
    expect(CMA_FIX.n).toBe(Math.ceil((cl(3) - ca(3) / 1.1) * 1e5 - 1e-6));
    expect(CMA_FIX.n).toBe(555000);
    expect([sum(c.sum.fixed), c.chip.fixed]).toEqual(['97,90,000 ÷ 89,00,000 = 1.10', 'Meets 1.10']);
    expect(c.rows.at(-1)?.fixed.text).toBe((ca(4) / (cl(4) - 5.55)).toFixed(2));
    expect(c.inputs.filter((i) => i.to).map((i) => i.to)).toEqual(['+Rs. 5.55 lakh']);
  });
  it('the turnover-method limit for the projection, by hand', () => {
    const lim = 0.25 * sales[4] - Math.max(0.05 * sales[4], ca(4) - cl(4));
    expect(lim).toBeCloseTo(62, 9);
    expect(c.statement.verdict).toContain('the limit by the turnover method, 2027-28, is Rs. 62 lakh.');
  });
  it('its amounts in lakh and crore (NUM1): sales 200 and 310 lakh are 2 and 3.1 crore', () => {
    expect(c.inputs.map((i) => i.v).slice(3, 6)).toEqual(['Rs. 2 crore', 'Rs. 3.1 crore', 'Rs. 65 lakh']);
    expect(c.statement.files).toEqual(['PDF', 'Excel']);
  });
});

describe('the four tools', () => {
  it('each tool once, in the site\'s order, each button opening its tool with the case', () => {
    expect(INTROS.map((i) => i.go.href.split('?')[0])).toEqual(READY.map((t) => t.href));
    expect(INTROS.every((i) => i.go.href.endsWith('?case=home'))).toBe(true);
    expect(new Set(INTROS.map((i) => i.id)).size).toBe(4);
  });
  it('each scene: short of its level as typed, meeting it after one changed card, in five beats', () => {
    for (const s of Object.values(SCENES)) {
      const w = s.rows[s.weakest.typed], f = s.rows[s.weakest.fixed];
      expect([s.id, w.typed?.meets, f.fixed.meets, s.inputs.filter((i) => i.to).length, s.beats.length]).toEqual([s.id, false, true, 1, 5]);
      expect(s.rows.filter((r) => r.judged).every((r) => r.fixed.meets)).toBe(true);
      expect(s.statement.lines[0].head).toBe('Worked out twice');
    }
  });
});
