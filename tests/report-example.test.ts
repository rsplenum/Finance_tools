/**
 * The page's worked example (site/src/report/example.ts, D-UX-342), model-worked until the owner confirms. Opened on
 * 15-10-2026: three months on is January, under six months of 2026-27, so sales start in April 2027; the loan is drawn
 * in October 2026 with a holiday of 6 months, then 60 EMIs. Its first year, 2027-28, by hand:
 *   Full running: (3,000 + 2,000) kg × Rs. 220 × 12 = 1,32,00,000; at 60% in the first year: 79,20,000.
 *   Variable costs at 68%: 53,85,600. Fixed costs 1,00,000 × 12 = 12,00,000. Before interest, depreciation and tax: 13,34,400.
 *   Depreciation: machinery 15% of 20,00,000 = 3,00,000; building 10% of 6,00,000 = 60,000; 3,60,000 in all.
 *   Interest before sales: 18,00,000 × 10% × 6 ÷ 12 = 90,000, written off over five years: 18,000 a year.
 *   EMI: 18,00,000 × (0.1 ÷ 12) ÷ (1 − (1 + 0.1 ÷ 12)^−60) = 38,244.68; twelve of them 4,58,936. Their interest, month by
 *   month on the balance (the loop below), 1,66,854; so principal 2,92,083.
 *   Working capital: debtors, 30 days of sales, 6,50,958.90; stock and creditors, 30 days of variable costs, 4,42,652.05
 *   each. The limit: 75% × (6,50,958.90 + 4,42,652.05) − 4,42,652.05 = 3,77,556.16 (again: (22.5 × 79,20,000 − 7.5 ×
 *   53,85,600) ÷ 365). Its interest at the loan's 10%: 37,755.62.
 *   Profit before tax: 13,34,400 − 3,60,000 − 18,000 − 1,66,853.59 − 37,755.62 = 7,51,790.79. Tax on a firm, 30% and 4%
 *   cess (31.2%): 2,34,558.73. After tax: 5,17,232.06.
 *   Cash for repayment: 5,17,232.06 + 3,60,000 + 18,000 + 1,66,853.59 = 10,62,085.65; ÷ 4,58,936.2 = 2.31.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { inputOf, preview } from '../site/src/report/model';
import { allNeeds, paperDoc } from '../site/src/report/document';
import { exampleSellFrom, reportExample } from '../site/src/report/example';

const rs = (n: number) => Math.round(n).toLocaleString('en-IN');
const cell = (p: ReturnType<typeof preview>, table: string, label: string, at = 0) => p.view!.tables.find((t) => t.id === table)!.rows.find((r) => r.label === label)!.values[at];

describe('the project report’s worked example', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('starts selling three months on, or in April when the first year would be under six months', () => {
    const on = (d: string) => exampleSellFrom(new Date(`${d}T12:00:00`));
    expect([on('2026-10-15'), on('2026-12-01'), on('2027-01-31'), on('2027-04-10'), on('2027-07-20'), on('2027-08-01')])
      .toEqual(['2027-04', '2027-04', '2027-04', '2027-07', '2027-10', '2028-04']);
  });

  it('on 15-10-2026: the first year as worked by hand, by a second route', () => {
    vi.setSystemTime(new Date('2026-10-15T12:00:00'));
    const s = reportExample(), p = preview(s);
    expect(inputOf(s).loan).toEqual({ amount: 1800000, ratePct: 10, disbursed: '2026-10', moratoriumMonths: 6, instalments: 60, frequency: 'monthly', style: 'emi' });
    // The second route, from the typed figures alone.
    const sales = (3000 + 2000) * 220 * 12 * 0.6, variable = sales * 0.68, fixed = 100000 * 12, ebitda = sales - variable - fixed;
    const r = 0.1 / 12, emi = 1800000 * r / (1 - (1 + r) ** -60);
    let balance = 1800000, interest = 0;
    for (let m = 0; m < 12; m++) { const i = balance * r; interest += i; balance -= emi - i; }
    const depreciation = 0.15 * 2000000 + 0.10 * 600000, writeOff = 1800000 * 0.1 * 6 / 12 / 5;
    const limit = 0.75 * (sales * 30 / 365 + variable * 30 / 365) - variable * 30 / 365, wcInterest = limit * 0.1;
    const pbt = ebitda - depreciation - writeOff - interest - wcInterest, tax = pbt * 0.312, pat = pbt - tax;
    const cash = pat + depreciation + writeOff + interest, dscr = cash / (emi * 12);
    expect([rs(sales), rs(ebitda), rs(emi * 12), rs(interest), rs(limit), rs(pbt), rs(tax), rs(cash), dscr.toFixed(2)])
      .toEqual(['79,20,000', '13,34,400', '4,58,936', '1,66,854', '3,77,556', '7,51,791', '2,34,559', '10,62,086', '2.31']);
    expect(limit).toBeCloseTo((22.5 * sales - 7.5 * variable) / 365, 6);
    // The engine's tables say the same.
    expect([cell(p, 'pl', 'Sales'), cell(p, 'pl', 'Profit before interest, depreciation and tax'), cell(p, 'dscr', 'Debt service (B)'), cell(p, 'pl', 'Less: interest on the term loan'),
      cell(p, 'wc', 'Limit applied for'), cell(p, 'pl', 'Profit before tax'), cell(p, 'pl', 'Less: tax'), cell(p, 'dscr', 'Cash available (A)'), cell(p, 'dscr', 'DSCR (A ÷ B)')])
      .toEqual([rs(sales), rs(ebitda), rs(emi * 12), rs(interest), rs(limit), rs(pbt), rs(tax), rs(cash), dscr.toFixed(2)]);
    expect(p.view!.key.map((k) => `${k.label}: ${k.value}`)).toEqual(['Cost of the project: Rs. 29,63,403', 'Average DSCR: 2.91', 'Lowest DSCR: 2.31']);
  });

  it('its paper states every line: the limit as worked out, simple mode’s months and fixed costs, nothing "undefined"', () => {
    vi.setSystemTime(new Date('2026-10-15T12:00:00'));
    const s = reportExample(), text = JSON.stringify(paperDoc(s, preview(s), '2026-10-15'));
    expect(text).not.toMatch(/undefined|NaN/);
    // The limit is the engine's (Rs. 3,77,556 in the hand working above), at the loan's rate as simple mode assumes.
    expect(text).toContain('["Working-capital limit applied for","Rs. 3,77,556 at 10% a year"]');
    // April 2027 is six months from October 2026; Rs. 1 L a month is Rs. 12,00,000 a year, growing 5% (defaults.json).
    expect(text).toContain('["Months from the loan to the first sales","6"]');
    expect(text).toContain('["Fixed costs in a full first year","Rs. 12,00,000, growing 5% a year"]');
  });
  it('passes every check and needs nothing more, whichever month it is opened in', () => {
    for (let m = 0; m < 24; m++) {
      vi.setSystemTime(new Date(2026, 10 + m, 15, 12));
      const s = reportExample(), p = preview(s);
      expect([m, p.misses, p.short, p.runsOut, p.blocked, allNeeds(s, p), p.checks?.every((c) => c.verdict === 'meets')]).toEqual([m, undefined, undefined, undefined, undefined, [], true]);
    }
  });
});
