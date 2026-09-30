/** Base arithmetic, checked against textbook figures (not figures this code produced). */
import { describe, it, expect } from 'vitest';
import { emi, inr, words } from '../engine/util';
import { parseAmount, parseDate, parseMonth } from '../engine/parse';

describe('loan maths', () => {
  it('EMI of Rs.10,00,000 at 12% for 12 months is Rs.88,848.79, rounded up to Rs.88,849', () => {
    expect(emi(1000000, 12, 12)).toBe(88849);
  });
});
describe('Indian formats', () => {
  it('lakh / crore grouping and words', () => {
    expect(inr(12345678)).toBe('1,23,45,678');
    expect(words(150000)).toMatch(/One Lakh Fifty Thousand/i);
  });
  it('70 L, 1.2 Cr, 7,00,000 and dd-mm-yyyy', () => {
    expect(parseAmount('70 L')).toBe(7000000);
    expect(parseAmount('1.2 Cr')).toBe(12000000);
    expect(parseAmount('7,00,000')).toBe(700000);
    expect(parseDate('13-11-1975')).toBe('1975-11-13');
    expect(parseDate('31-02-2026')).toBeUndefined();
  });
});
describe('months', () => {
  it('as a month field gives them, and as people type them', () => {
    expect(['2026-04', '04-2026', '4/2026', 'Apr 2026', 'april 2026', 'Sept. 2026'].map(parseMonth))
      .toEqual(['2026-04', '2026-04', '2026-04', '2026-04', '2026-04', '2026-09']);
    expect(['13-2026', 'Ap 2026', 'April', '2026'].map(parseMonth)).toEqual([undefined, undefined, undefined, undefined]);
  });
});
