/**
 * Tax by borrower, worked by hand below (each line also checked in exact fractions apart from the engine), and the
 * engine's two computations (tax.ts, and taxCheck in dscr-check.ts) against those figures. The rates are from secondary
 * sources (engine/data/tax.json): model-worked, not yet checked against the Act.
 */
import { describe, it, expect } from 'vitest';
import DSCR from '../engine/data/dscr.json';
import { taxCheck } from '../engine/dscr-check';
import { BORROWERS, borrowerOf, taxOn, taxSummary, type Borrower } from '../engine/tax';

const of = (id: string) => borrowerOf(id) as Borrower;
/** Both computations, rounded to the paisa. */
const both = (income: number, id: string) => [taxOn(income, of(id)), taxCheck(income, of(id))].map((t) => Math.round(t * 100) / 100);

describe('a proprietor: the new regime\'s slab rates, the rebate and the cess', () => {
  it('nothing up to Rs. 12,00,000: the rebate takes the whole tax', () => {
    // 8,00,000: 4,00,000 at 5% = 20,000, all rebated. 12,00,000: 20,000 + 4,00,000 at 10% = 60,000, the most rebated.
    for (const income of [0, 300000, 800000, 1200000]) expect(both(income, 'proprietor')).toEqual([0, 0]);
    expect(both(-500000, 'proprietor')).toEqual([0, 0]);
  });
  it('just above Rs. 12,00,000, never more than the income above it (marginal relief), plus 4% cess', () => {
    // 12,50,000: slab tax 60,000 + 50,000 at 15% = 67,500, but at most 50,000 (the income above 12,00,000); cess 2,000.
    expect(both(1250000, 'proprietor')).toEqual([52000, 52000]);
    // 13,00,000: 60,000 + 15,000 = 75,000, less than 1,00,000, so no relief; cess 3,000.
    expect(both(1300000, 'proprietor')).toEqual([78000, 78000]);
  });
  it('a rupee either side of each limit', () => {
    // 11,99,999: rebated to nil. 12,00,001: slab tax 60,000.15, but at most the 1 rupee above the limit; cess 0.04.
    expect(both(1199999, 'proprietor')).toEqual([0, 0]);
    expect(both(1200001, 'proprietor')).toEqual([1.04, 1.04]);
    // 50,00,001: 10,80,000.30 + 10% = 11,88,000.33, but at most 10,80,000 + 1 = 10,80,001; cess 43,200.04.
    expect(both(5000001, 'proprietor')).toEqual([1123201.04, 1123201.04]);
    // A firm at 1,00,00,001: 30,00,000.30 + 12%, but at most 30,00,000 + 1 = 30,00,001; cess 1,20,000.04.
    expect(both(10000001, 'firm')).toEqual([3120001.04, 3120001.04]);
  });
  it('the slabs up to 30%', () => {
    // 15,00,000: 60,000 + 3,00,000 at 15% = 1,05,000; cess 4,200.
    expect(both(1500000, 'proprietor')).toEqual([109200, 109200]);
    // 24,00,000: 20,000 + 40,000 + 60,000 + 80,000 + 1,00,000 = 3,00,000; cess 12,000.
    expect(both(2400000, 'proprietor')).toEqual([312000, 312000]);
    // 30,00,000: 3,00,000 + 6,00,000 at 30% = 4,80,000; cess 19,200.
    expect(both(3000000, 'proprietor')).toEqual([499200, 499200]);
  });
  it('the surcharge above Rs. 50,00,000 and Rs. 1 crore, with marginal relief at each', () => {
    // 50,00,000 exactly: 3,00,000 + 26,00,000 at 30% = 10,80,000, no surcharge; cess 43,200.
    expect(both(5000000, 'proprietor')).toEqual([1123200, 1123200]);
    // 51,00,000: 11,10,000 + 10% = 12,21,000, but at most 10,80,000 + 1,00,000 = 11,80,000; cess 47,200.
    expect(both(5100000, 'proprietor')).toEqual([1227200, 1227200]);
    // 60,00,000: 13,80,000 + 10% = 15,18,000 (the relief limit, 20,80,000, does not bite); cess 60,720.
    expect(both(6000000, 'proprietor')).toEqual([1578720, 1578720]);
    // 1,01,00,000: 26,10,000 + 15% = 30,01,500, but at most 25,80,000 + 10% + 1,00,000 = 29,38,000; cess 1,17,520.
    expect(both(10100000, 'proprietor')).toEqual([3055520, 3055520]);
  });
});

describe('a firm or LLP and a company: the rates as before', () => {
  it('a firm pays 31.2%, and 34.944% above Rs. 1 crore, with marginal relief just above it', () => {
    // 50,00,000 at 30% = 15,00,000; cess 60,000. 2,00,00,000: 60,00,000 + 12% = 67,20,000; cess 2,68,800.
    expect(both(5000000, 'firm')).toEqual([1560000, 1560000]);
    expect(both(20000000, 'firm')).toEqual([6988800, 6988800]);
    // 1,02,00,000: 30,60,000 + 12% = 34,27,200, but at most 30,00,000 + 2,00,000 = 32,00,000; cess 1,28,000.
    expect(both(10200000, 'firm')).toEqual([3328000, 3328000]);
  });
  it('a company on the concessional rate pays 25.168% on any profit', () => {
    // 10,00,000 at 22% = 2,20,000; 10% surcharge 22,000; 4% cess 9,680.
    expect(both(1000000, 'company')).toEqual([251680, 251680]);
    expect(taxOn(123456789, of('company')) / 123456789).toBeCloseTo(0.25168, 12);
  });
  it('read back in plain words from the rates', () => {
    expect(BORROWERS.map((b) => [b.id, taxSummary(b)])).toEqual([
      ['proprietor', 'slab rates of 5% to 30% with 4% cess, nothing up to Rs. 12,00,000 of profit'],
      ['firm', '31.2%; 34.944% above Rs. 1,00,00,000'],
      ['company', '25.168%'],
    ]);
  });
});

describe('the data', () => {
  it('each borrower is dated, sourced and marked not yet checked; each says which EMIs count', () => {
    for (const b of BORROWERS) {
      expect([b.date, b.source.length > 0, b.law.length > 0, b.verified, b.kind]).toEqual([expect.stringMatching(/^2026-/), true, true, false, 'secondary']);
      expect(Object.keys(DSCR.existingEmis.byBorrower)).toContain(b.id);
    }
    expect(Object.keys(DSCR.existingEmis.byBorrower)).toEqual(BORROWERS.map((b) => b.id));
  });
  it('the tax never falls as the profit grows, and both computations agree across the range', () => {
    for (const b of BORROWERS) {
      let before = 0;
      for (let income = -100000; income <= 30000000; income += 12345) {
        const t = taxOn(income, b);
        expect(t).toBeGreaterThanOrEqual(before - 1e-6);
        expect(Math.abs(t - taxCheck(income, b))).toBeLessThan(1e-6);
        before = t;
      }
    }
  });
});
