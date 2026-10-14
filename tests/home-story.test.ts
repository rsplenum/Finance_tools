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
 * The project report's trailer (AG3b, D-UX-78): case R at 70 lakh of sales, its first year (2026-27) the lowest, as worked
 * by hand in tests/viable.test.ts: available 5,95,000, service 7,27,083.33, DSCR 0.8183; Make it viable's sales of
 * 82,11,000 (the threshold 82,09,984.08 rounded up to its step). At 82,11,000 (model-worked, the same steps): profit
 * before tax 0.35 × 82,11,000 − 18,00,000 − 4,20,000 − 20,000 − 2,27,083.33 − 55,000 = 3,51,766.67, tax 31.2% of it
 * 1,09,751.20, after tax 2,42,015.47; available with depreciation, the preliminary expenses and the interest added back
 * 9,09,098.80; DSCR 9,09,098.80 ÷ 7,27,083.33 = 1.250336. The estimate's trailer: the flat of tests/plan-page.test.ts,
 * each total also worked the second way (engine/architect-check.ts); the 12 lakh is the story's budget.
 */
import { describe, expect, it } from 'vitest';
import { planCheck } from '../engine/dscr-check';
import { dscrCaseOf } from '../site/src/dscr/model';
import { write } from '../site/src/home/pen';
import { architectCheck } from '../engine/architect-check';
import { inputOf } from '../site/src/estimate/plan-model';
import { preview as reportPreview } from '../site/src/report/model';
import { ESTIMATE_BUDGET, ESTIMATE_CASE, ESTIMATE_FIXED, ESTIMATE_TRAILER, REPORT_CASE, REPORT_FIX, REPORT_FIXED, REPORT_TRAILER, TRAILERS } from '../site/src/home/story';
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
      ['card', 'Stretch it to 80 instalments'],
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

describe('the project report\'s trailer', () => {
  const lines = REPORT_TRAILER.lines;
  it('seven lines: the question, the loan, the sales, the lowest year short of its level, higher sales, the sum that meets it', () =>
    expect(lines.map((l) => [l.kind, l.text])).toEqual([
      ['title', 'Will the bank lend?'],
      ['hand', 'Loan 25,00,000 · 10% · 5 years'],
      ['hand', 'Sales 70,00,000 in year one'],
      ['card', 'Lowest year · level 1.25'],
      ['hand', '5,95,000 ÷ 7,27,083 = 0.82'],
      ['card', 'Sales up 17.3%, to 82,11,000'],
      ['hand', '9,09,099 ÷ 7,27,083 = 1.25 ✓'],
    ]));
  it('the change is Make it viable\'s, the lowest year is the first, and the marker swipes the ratio that meets', () => {
    expect(REPORT_FIX).toEqual({ move: '+17.3%', sales: '82,11,000', from: '70,00,000' });
    for (const s of [REPORT_CASE, REPORT_FIXED]) expect(reportPreview(s).checks?.find((c) => c.id === 'dscrLowest')?.worst).toMatch(/ in 2026-27$/);
    expect(reportPreview(REPORT_CASE).checks?.find((c) => c.id === 'dscrLowest')?.verdict).toBe('misses');
    expect(reportPreview(REPORT_FIXED).checks?.find((c) => c.id === 'dscrLowest')?.verdict).toBe('meets');
    expect(lines.at(-1)?.mark).toBe('1.25');
  });
  it('each sum within a rupee of the hand-worked first year', () => {
    const interest = (12 * 2500000 - 2500000 / 60 * 66) * 10 / 1200;
    const year1 = (sales: number) => {
      const pbt = 0.35 * sales - 1800000 - 420000 - 20000 - interest - 55000, pat = pbt > 0 ? pbt * (1 - 0.312) : pbt;
      return [pat + 420000 + 20000 + interest, 500000 + interest];
    };
    const sums = [lines[4].text, lines[6].text].map((t) => t.match(/[\d,]+(?= ÷)|(?<=÷ )[\d,]+/g)!.map((v) => Number(v.replace(/,/g, ''))));
    for (const [k, want] of [year1(7000000), year1(8211000)].entries()) {
      sums[k].forEach((v, i) => expect(Math.abs(v - want[i])).toBeLessThanOrEqual(0.5));
      expect((want[0] / want[1]).toFixed(2)).toBe(['0.82', '1.25'][k]);
    }
    expect((year1(7000000)[0] / year1(7000000)[1]).toFixed(4)).toBe('0.8183');
    expect((year1(8211000)[0] / year1(8211000)[1]).toFixed(6)).toBe('1.250336');
  });
});

describe('the estimate\'s trailer', () => {
  const lines = ESTIMATE_TRAILER.lines, total = (t: string) => Number(t.replace(/^Total |[ ,✓]/g, ''));
  it('seven lines: the question with its budget, the flat, Standard over it, Basic bedrooms within it', () =>
    expect(lines.map((l) => [l.kind, l.text])).toEqual([
      ['title', 'Will 12 lakh do it?'],
      ['hand', '2BHK flat · 1,000 sq ft'],
      ['hand', 'Renovate it in Pune'],
      ['card', 'Standard in every room'],
      ['hand', 'Total 12,47,185'],
      ['card', 'Basic in the two bedrooms'],
      ['hand', 'Total 11,65,322 ✓'],
    ]));
  it('each total within a rupee of the second computation, over the budget and then within it', () => {
    const [at, fixed] = [ESTIMATE_CASE, ESTIMATE_FIXED].map((s) => architectCheck(inputOf(s)).total);
    expect(Math.abs(total(lines[4].text) - at)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(total(lines[6].text) - fixed)).toBeLessThanOrEqual(0.5);
    expect([at > ESTIMATE_BUDGET.n, fixed <= ESTIMATE_BUDGET.n]).toEqual([true, true]);
    expect(lines.at(-1)?.mark).toBe('11,65,322');
  });
});

describe('the three trailers', () => {
  it('in order down the page, each seven lines ending on a marked line, each with a button to its tool', () => {
    expect(TRAILERS.map((t) => [t.id, t.lines.length, Boolean(t.lines.at(-1)?.mark), t.go.href])).toEqual([
      ['dscr', 7, true, '/dscr/'], ['report', 7, true, '/project-report/'], ['estimate', 7, true, '/estimate/']]);
  });
  it('the pen has every letter each writes, and throws on one it lacks', () => {
    for (const t of TRAILERS) for (const l of t.lines.filter((x) => x.kind !== 'card')) expect(write(l.text).strokes.length).toBeGreaterThan(0);
    expect(() => write('₹')).toThrow(/no "₹"/);
  });
  it('each stroke, sent in moves from the point before, stays inside its line', () => {
    const line = write('Will 12 lakh do it? ✓'), pts: number[][] = [];
    for (const { d } of line.strokes) {
      let x = 0, y = 0;
      for (const [, c, a] of d.matchAll(/([Mlc])([^Mlc]*)/g)) {
        const v = (a.match(/-?\d+/g) ?? []).map(Number), n = c === 'c' ? 6 : 2;
        if (c === 'M') { [x, y] = v; pts.push([x, y]); continue; }
        for (let i = 0; i < v.length; i += n) { const [dx, dy] = v.slice(i + n - 2, i + n); x += dx; y += dy; pts.push([x, y]); }
      }
    }
    expect(pts.every(([x, y]) => x >= -5 && x <= line.w + 5 && y >= line.top - 1 && y <= line.bottom + 1)).toBe(true);
    expect(Math.max(...pts.map(([x]) => x))).toBeGreaterThan(line.w - 70);
  });
});
