/** Yearly figures from one or two answers, against figures worked by hand (not produced by this code). */
import { describe, it, expect } from 'vitest';
import { series } from '../engine/project';

const r = (xs: unknown) => (xs as number[]).map((x) => Math.round(x * 100) / 100);

describe('yearly figures from a rule', () => {
  it('grows: 18,00,000 at 10% a year is 19,80,000, 21,78,000, 23,95,800 and 26,35,380', () => {
    expect(r(series({ kind: 'grow', first: 1800000, pct: 10 }, 5, 'PBDIT', '2027-28'))).toEqual([1800000, 1980000, 2178000, 2395800, 2635380]);
  });
  it('falls like written-down-value depreciation: 60 L of machinery at 15% gives 9,00,000, 7,65,000, 6,50,250, 5,52,712.50', () => {
    expect(r(series({ kind: 'fall', first: 900000, pct: 15 }, 4, 'Depreciation', '2027-28'))).toEqual([900000, 765000, 650250, 552712.5]);
  });
  it('the same every year, and a fall of 0% is the same too', () => {
    expect(series({ kind: 'same', first: 50000 }, 3, 'Interest', '2027-28')).toEqual([50000, 50000, 50000]);
    expect(series({ kind: 'fall', first: 50000, pct: 0 }, 2, 'Interest', '2027-28')).toEqual([50000, 50000]);
  });
  it('names what is missing, and never assumes a rate', () => {
    expect(series({ kind: 'grow' }, 5, 'PBDIT', '2027-28')).toEqual({ needs: ['PBDIT in 2027-28', 'PBDIT: growth a year (%)'] });
    expect(series({ kind: 'same' }, 5, 'Depreciation', '2027-28')).toEqual({ needs: ['Depreciation, one figure for every year'] });
    expect(series({ kind: 'fall', first: 1, pct: 120 }, 5, 'Depreciation', '2027-28')).toEqual({ needs: ['Depreciation: fall a year, 0 to 100%'] });
  });
});
