import { describe, expect, it } from 'vitest';
import { lakhCrore } from '../engine/util';
import { parseAmount } from '../engine/parse';

// NUM1 (D-UX-115): lakh and crore in headings, verdicts and home's intros. Every expected text worked by hand:
// a lakh is 1,00,000 and a crore 1,00,00,000; the figure over the unit, rounded half up at the places shown.
describe('lakh and crore (NUM1)', () => {
  it('says a round figure exactly and a rounded one with "about"', () => {
    expect(lakhCrore(12_00_000)).toBe('Rs. 12 lakh'); // 12,00,000 / 1,00,000 = 12
    expect(lakhCrore(4_50_000)).toBe('Rs. 4.5 lakh'); // 4.50, the zero dropped
    expect(lakhCrore(12_34_567)).toBe('about Rs. 12.35 lakh'); // 12.34567 → 12.35
    expect(lakhCrore(12_47_185)).toBe('about Rs. 12.47 lakh'); // home's estimate total, 12.47185 → 12.47
    expect(lakhCrore(2_00_00_000)).toBe('Rs. 2 crore');
    expect(lakhCrore(3_10_00_000)).toBe('Rs. 3.1 crore');
    expect(lakhCrore(1_23_45_678)).toBe('about Rs. 1.23 crore'); // 1.2345678 → 1.23
  });
  it('keeps the full rupee under a lakh and moves to crore when the lakh rounds to a hundred', () => {
    expect(lakhCrore(85_000)).toBe('Rs. 85,000');
    expect(lakhCrore(99_999)).toBe('Rs. 99,999');
    expect(lakhCrore(1_00_000)).toBe('Rs. 1 lakh');
    expect(lakhCrore(99_99_999)).toBe('about Rs. 1 crore'); // 99.99999 lakh is 100.00, so 1.00 crore
    expect(lakhCrore(99_94_321)).toBe('about Rs. 99.94 lakh');
    expect(lakhCrore(-5_55_000)).toBe('-Rs. 5.55 lakh');
  });
  it('takes the places asked for and leaves "about" out where the page states the rounding', () => {
    // The estimate's headline (UX8): lakh to one place, crore to two.
    expect(lakhCrore(21_38_356, { places: 1, about: false })).toBe('Rs. 21.4 lakh');
    expect(lakhCrore(17_36_582, { places: 1, about: false })).toBe('Rs. 17.4 lakh');
    expect(lakhCrore(1_23_45_678, { places: 1, about: false })).toBe('Rs. 1.23 crore');
  });
  it('reads back within half a step, by the input parser, over many figures (the second route)', () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    for (let k = 0; k < 2000; k++) {
      const n = Math.round(10 ** (3 + rnd() * 7));
      const t = lakhCrore(n), back = parseAmount(t.replace(/^about /, '').replace(/ (lakh|crore)$/, ' $1'));
      const step = n >= 99_99_500 ? 1e5 : n >= 1e5 ? 1e3 : 1;
      expect(Math.abs((back ?? NaN) - n)).toBeLessThanOrEqual(step / 2);
      expect(t.startsWith('about ')).toBe(back !== n);
    }
  });
});
