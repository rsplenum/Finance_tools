/** Yearly figures from one or two answers, against figures worked by hand (not produced by this code). */
import { describe, it, expect } from 'vitest';
import { emisByYear, fromMonth, series } from '../engine/project';

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

describe('existing EMIs by the months of each year they are paid in', () => {
  const YEARS = ['2026-27', '2027-28', '2028-29'];
  it('one runs on: 12 EMIs every year; one ends in June 2027: 3 EMIs (April, May, June) in 2027-28, then none', () => {
    // 20,000 × 12 = 2,40,000 every year; 15,000 × 12 = 1,80,000 in 2026-27, 15,000 × 3 = 45,000 in 2027-28.
    expect(emisByYear([{ emi: 20000 }, { emi: 15000, last: '2027-06' }], YEARS, 'EMIs')).toEqual([420000, 285000, 240000]);
  });
  it('an EMI whose last month is March pays the whole year; one that ended before the figures counts nowhere', () => {
    expect(emisByYear([{ emi: 10000, last: '2027-03' }], YEARS, 'EMIs')).toEqual([120000, 0, 0]);
    expect(emisByYear([{ emi: 10000, last: '2025-12' }], YEARS, 'EMIs')).toEqual([0, 0, 0]);
    expect(emisByYear([{ emi: 10000, last: '2026-04' }], YEARS, 'EMIs')).toEqual([10000, 0, 0]);
  });
  it('names what is missing, by loan when there are several, and never takes a missing EMI as nil', () => {
    expect(emisByYear([], YEARS, 'EMIs')).toEqual({ needs: ['EMIs: the EMI a month'] });
    expect(emisByYear([{}], YEARS, 'EMIs')).toEqual({ needs: ['EMIs: the EMI a month'] });
    expect(emisByYear([{ emi: 5000 }, { emi: -1, last: 'June' }], YEARS, 'EMIs')).toEqual({
      needs: ['EMIs: the EMI a month of loan 2, as zero or more', 'EMIs: the month of the last EMI of loan 2, like 2028-03'],
    });
  });
});

describe('a yearly figure from the month it starts running', () => {
  const YEARS = ['2026-27', '2027-28', '2028-29'];
  it('6,00,000 a year from October 2026: 6 months (October to March) in 2026-27, 3,00,000, then 6,00,000 a year', () => {
    expect(r(fromMonth(600000, '2026-10', YEARS, 'Asset'))).toEqual([300000, 600000, 600000]);
  });
  it('from March 2027: one month, 50,000; from April 2026 or earlier, the whole year; after the years, nothing', () => {
    expect(r(fromMonth(600000, '2027-03', YEARS, 'Asset'))).toEqual([50000, 600000, 600000]);
    expect(r(fromMonth(600000, '2025-11', YEARS, 'Asset'))).toEqual([600000, 600000, 600000]);
    expect(r(fromMonth(600000, '2029-04', YEARS, 'Asset'))).toEqual([0, 0, 0]);
  });
  it('names what is missing', () => {
    expect(fromMonth(undefined, undefined, YEARS, 'Asset')).toEqual({ needs: ['Asset, a year', 'Asset: the month it starts running, like 2026-10'] });
  });
});
