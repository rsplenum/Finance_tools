import { describe, expect, it } from 'vitest';
import { earliest, overdue, overdueNote, todayIso } from '../engine/review';
import { LIBRARY_REVIEW_BY } from '../engine/library';
import TAX from '../engine/data/tax.json';

describe('review-by dates (Q2, D-DATA-19)', () => {
  it('counts the day itself as in time and the day after as passed', () => {
    expect(overdue('2027-03-31', '2027-03-31')).toBe(false);
    expect(overdue('2027-03-31', '2027-04-01')).toBe(true);
    expect(overdueNote('2027-03-31', '2027-03-31')).toBe('');
    expect(overdueNote('2027-03-31', '2027-04-01')).toBe('Due for review since 31-03-2027.');
  });
  it('reads today in the viewer\'s own time zone', () => {
    expect(todayIso(new Date(2027, 0, 5, 23, 59))).toBe('2027-01-05');
  });
  it('takes the earliest of several files for a page built from them', () => {
    expect(earliest(['2027-10-02', '2027-04-02', '2027-04-04'])).toBe('2027-04-02');
    expect(LIBRARY_REVIEW_BY).toBe('2027-04-02');
  });
  it('holds tax to the end of its tax year', () => {
    expect(TAX.reviewBy).toBe('2027-03-31');
  });
});
