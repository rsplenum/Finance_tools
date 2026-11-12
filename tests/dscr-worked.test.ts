/**
 * The DSCR made new (NEW1, docs/WORKED-PAGE.md §4, §7): the worked page's view, as data. The example is worked a second
 * time by hand here (rule 15): the EMI by its closed form, each financial year's interest and principal by stepping the
 * balance, the tax at 31.2% on profit before tax, cash available = profit before interest, depreciation and tax less
 * tax, and the largest loan solved directly from the binding year, since a year's interest and principal scale with the loan.
 */
import { describe, expect, it } from 'vitest';
import {
  applyOption, barsOf, exampleCase, exampleNeeds, factProblem, factsOf, factText, markOf, nextOf, optionsFor, previewOf, readingOf, writeFact, type Case,
} from '../site/src/dscr/worked';
import { door } from '../site/src/dscr/home-case';

const c = exampleCase('2026-11'), p = previewOf(c.s);

/** By hand: Rs. 12,00,000 at 1% a month over 60, drawn and first paid in November 2026; years April to March. */
function byHand(amount: number) {
  const r = 0.01, n = 60, emi = (amount * r * (1 + r) ** n) / ((1 + r) ** n - 1);
  const years: { fy: string; i: number; p: number }[] = [];
  let bal = amount;
  for (let k = 0; k < n; k++) {
    const m = 10 + k, y = 2026 + Math.floor(m / 12), month = m % 12; // month 0 = January; November 2026 is m = 10
    const fyStart = month >= 3 ? y : y - 1, fy = `${fyStart}-${String((fyStart + 1) % 100).padStart(2, '0')}`;
    const i = bal * r, pr = emi - i;
    bal -= pr;
    const at = years.find((x) => x.fy === fy) ?? (years.push({ fy, i: 0, p: 0 }), years[years.length - 1]);
    at.i += i; at.p += pr;
  }
  return { emi, years };
}
const TAX = 0.312, profitIn = (y: number) => 600000 * 1.05 ** y;

describe('the example (a firm: Rs. 6 lakh a year, growing 5%; Rs. 12 lakh at 12% over 5 years)', () => {
  const h = byHand(1200000);
  it('the EMI and each year, worked twice', () => {
    expect(h.emi).toBeCloseTo(26693.34, 2);
    const st = p.statement!, a = st.lines.find((l) => l.id === 'available')!, b = st.lines.find((l) => l.id === 'service')!;
    expect(st.years).toEqual(h.years.map((x) => x.fy));
    h.years.forEach((x, y) => {
      const pbdit = profitIn(y), cash = pbdit - TAX * (pbdit - x.i), service = x.i + x.p;
      expect(Math.abs(a.n![y]! - cash)).toBeLessThan(2);
      expect(Math.abs(b.n![y]! - service)).toBeLessThan(2);
    });
    // 2027-28 by hand: 6,30,000 less tax at 31.2% on 6,30,000 − 1,24,466 = 4,72,273; ÷ 3,20,320 = 1.47.
    expect(p.lowest).toBe('1.47');
    expect(p.lowestYear).toBe('2027-28');
    const sumA = h.years.reduce((t, x, y) => t + profitIn(y) - TAX * (profitIn(y) - x.i), 0), sumB = h.years.reduce((t, x) => t + x.i + x.p, 0);
    expect((sumA / sumB).toFixed(2)).toBe(p.average);
    expect(p.average).toBe('1.83');
  });
  it('the largest loan it carries, solved directly: about Rs. 14.39 lakh', () => {
    // Per rupee of loan a year's interest i and debt service s; cash = 0.688 × profit + 0.312 × interest. The lowest
    // year's level 1.25 and the average's 1.50 each give a loan; the smaller holds.
    const per = h.years.map((x) => ({ i: x.i / 1200000, s: (x.i + x.p) / 1200000 }));
    const each = per.map((x, y) => ((1 - TAX) * profitIn(y)) / (1.25 * x.s - TAX * x.i));
    const sum = (f: (x: { i: number; s: number }, y: number) => number) => per.reduce((t, x, y) => t + f(x, y), 0);
    const avg = ((1 - TAX) * sum((_, y) => profitIn(y))) / (1.5 * sum((x) => x.s) - TAX * sum((x) => x.i));
    const most = Math.min(...each, avg);
    expect(Math.abs(p.largest!.amount! - most)).toBeLessThan(50);
    expect(readingOf(c, p)).toEqual({
      state: 'carries', text: 'The example firm can carry up to about Rs. 14.39 lakh, more than the Rs. 12 lakh asked.',
      banker: 'Banks call this the DSCR: 1.83 on average, 1.47 in 2027-28, the tightest year. Lenders often ask for 1.50 and 1.25.',
    });
  });
  it('the picture: cash against repayments, the tightest year marked', () => {
    const bars = barsOf(p);
    expect(bars.map((x) => `${x.fy} ${x.cashText} ${x.serviceText}${x.tight ? ' tight' : ''}`)).toEqual([
      '2026-27 4.31 1.33', '2027-28 4.72 3.20 tight', '2028-29 4.86 3.20', '2029-30 5.00 3.20', '2030-31 5.14 3.20', '2031-32 5.29 1.87']);
    expect(bars[0].part).toBe('5 of 12 instalments');
  });
  it('the facts as one sentence, every one the example’s; the mark; one next step', () => {
    const f = factsOf(c);
    expect(f.map((x) => `${x.before ?? ''}[${x.text}]${x.after ?? ''}`).join('')).toBe(
      '[A firm] earning [Rs. 6 lakh] a year, growing [5%] a year, borrows [Rs. 12 lakh] at [12%] over [5 years]. [No other loans]; [no depreciation].');
    expect(f.length).toBeLessThanOrEqual(8); // the front door's ceiling (rule 17)
    expect(f.filter((x) => x.kind === 'example').map((x) => x.id)).toEqual(['borrower', 'profit', 'growth', 'amount', 'rate', 'years']);
    expect(f.filter((x) => x.kind === 'assumed').map((x) => x.id)).toEqual(['emis', 'depreciation']);
    expect(markOf(c)).toBe('Example: a fictional firm. Tap any figure to make it yours.');
    expect(nextOf(c, readingOf(c, p), 0)).toEqual({ kind: 'own', label: 'Use your own figures' });
    expect(exampleNeeds(c)).toHaveLength(6);
  });
});

describe('a figure from the first fact (rule 14, D-UX-358)', () => {
  it('the profit typed: the reading is "your business", marked with what it leaves out', () => {
    const one: Case = { s: writeFact(c.s, 'profit', '5 L'), mine: ['profit'] };
    expect(factText(one.s, 'profit')).toBe('5,00,000');
    const r = readingOf(one, previewOf(one.s));
    expect(r.text.startsWith('Your business can carry')).toBe(true);
    expect(markOf(one)).toBe('Yours: the profit. Still the example’s: the loan, the years, the rate, who borrows and the growth.');
    expect(nextOf(one, r, 0)).toEqual({ kind: 'continue', label: 'Next: the loan' });
    expect(factsOf(one).find((x) => x.id === 'profit')!.spoken).toBe('This year’s profit before interest, depreciation and tax: Rs. 5 lakh, yours');
  });
  it('every fact the borrower’s: no mark, the paper next, nothing listed for the paper', () => {
    const all: Case = { s: c.s, mine: ['profit', 'amount', 'years', 'rate', 'borrower', 'growth'] };
    expect(markOf(all)).toBeUndefined();
    expect(nextOf(all, readingOf(all, p), 0)).toEqual({ kind: 'paper', label: 'Get the paper' });
    expect(exampleNeeds(all)).toEqual([]);
  });
});

describe('when it falls short: the home page’s case S (Rs. 4,50,000 a year, no growth; Rs. 12 lakh at 12% over 5 years)', () => {
  const s: Case = { s: door('60'), mine: [] }, ps = previewOf(s.s);
  it('the reading gives the loan it carries beside the one asked', () => {
    const r = readingOf(s, ps);
    expect(r.state).toBe('short');
    expect(r.text).toBe('The example firm can carry about Rs. 9.56 lakh of the Rs. 12 lakh asked.');
  });
  it('whole options that work, as was → becomes; one applied meets, and its facts become the borrower’s', () => {
    const o = optionsFor(s.s, ps);
    expect(o.map((x) => x.id)).toEqual(['longer', 'own', 'mix']);
    expect(o[0].rows.find((x) => x.label === 'Repay over')).toEqual({ label: 'Repay over', was: '5 years', now: '7 years 7 months' });
    expect(nextOf(s, readingOf(s, ps), o.length)).toEqual({ kind: 'options', label: 'See ways to make it work' });
    for (const x of o) {
      const after = applyOption(s, x), pa = previewOf(after.s);
      expect(pa.verdict!.meets).toBe(true);
      expect(after.mine.length).toBeGreaterThan(0);
    }
  });
});

describe('odd input is said back and never taken', () => {
  it.each([
    ['amount', '-5', 'Type a figure of 0 or more.'], ['amount', '0', 'Type the loan you want, more than 0.'],
    ['amount', '9'.repeat(20), 'That is more than this page takes. Check the figure.'], ['profit', 'lots', 'Not understood. Type 6 L, 1.2 Cr or 6,00,000.'],
    ['rate', '0', 'Type a number from 0.01 to 40.'], ['years', '', 'Type a figure, or Skip for now.'], ['emis', '', undefined], ['growth', '-3', undefined],
  ] as const)('%s "%s"', (id, t, want) => expect(factProblem(id, t)).toBe(want));
  it('a loss: as it stands it cannot carry the loan', () => {
    const loss: Case = { s: writeFact(c.s, 'profit', '-1 L'), mine: ['profit'] };
    expect(readingOf(loss, previewOf(loss.s)).state).toBe('cannot');
  });
});
