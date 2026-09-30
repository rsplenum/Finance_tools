/**
 * The DSCR page's words and figures, without a browser (site/src/dscr/model.ts). The figures are fictional case A
 * (docs/GOLDEN-CASES.md), worked by hand in tests/dscr.test.ts: model-worked until the owner confirms them.
 */
import { describe, it, expect } from 'vitest';
import {
  START, TAX_CHOICES, barText, groupNeeds, loanRead, parseFy, preview, ratioText, rowsOf, tidyAmount, withTaxRate, yearsOf,
  type Preview, type State,
} from '../site/src/dscr/model';

// Case A entered the way a user would: a "None" for other non-cash charges and other term loans, and one figure for
// working-capital interest and the tax rate, each answered once for every year.
const CASE_A: State = {
  ...START, source: 'plan', method: 'common',
  loan: { amount: '12 L', ratePct: '12', disbursed: '2026-04', moratoriumMonths: '6', instalments: '12', repayment: 'quarterly' },
  cells: { pbdit: ['5,00,000', '7,50,000', '8,00,000', '8,00,000'], depreciation: ['1,50,000', '1,30,000', '1,10,000', '1,00,000'], interestOther: ['50,000'], taxPct: ['25'] },
  modes: { nonCash: 'none', otherLoans: 'none', interestOther: 'same', taxPct: 'same' },
};
const TARGETS = { average: '1.50', minimum: '1.20' };
/** A line of the DSCR statement, by its id or its label. */
const line = (p: Preview, key: string) => p.statement?.lines.find((l) => l.id === key || l.label === key)?.values;

describe('the start questions come first', () => {
  it('asks nothing else until where the figures come from and the method are answered', () => {
    const p = preview(START);
    expect([p.started, p.needs]).toEqual([false, ['Where the yearly figures come from', 'How DSCR is worked out']]);
    expect(preview({ ...START, source: 'own', method: 'choose', choice: { interest: 'none' } }).needs).toEqual([
      'Choose: Are lease rentals added back and counted as debt service?',
      'Choose: Which years count towards the average and the lowest year?',
      'Choose: How is the average worked out?',
    ]);
  });
  it('asks only for the figures the method uses', () => {
    const keys = (s: Partial<State>) => rowsOf({ ...START, method: 'common', ...s }).map((r) => r.key);
    expect(keys({ source: 'own' })).toEqual(['pat', 'depreciation', 'nonCash', 'interestTL', 'principalTL']);
    expect(keys({ source: 'own', method: 'choose', choice: { interest: 'all-borrowings', leases: 'yes', years: 'repayment', average: 'mean' } }))
      .toEqual(['pat', 'depreciation', 'nonCash', 'interestTL', 'principalTL', 'interestOther', 'leaseRentals']);
    expect(keys({ source: 'own', method: 'choose', choice: { interest: 'none', leases: 'no', years: 'repayment', average: 'mean' } }))
      .toEqual(['pat', 'depreciation', 'nonCash', 'principalTL']);
    expect(keys({ source: 'plan' })).toEqual(['pbdit', 'depreciation', 'nonCash', 'interestOther', 'otherLoansInterest', 'otherLoansPrincipal', 'taxPct']);
  });
});

describe('fictional case A from the loan terms', () => {
  it('reads the loan back and takes the years from it', () => {
    const y = yearsOf(CASE_A);
    expect(y.years).toEqual(['2026-27', '2027-28', '2028-29', '2029-30']);
    expect(loanRead(y)).toBe('First instalment at the end of December 2026, the last at the end of September 2029. The loan runs over 2026-27 to 2029-30.');
  });
  it('shows the statement and stays provisional until the target is in', () => {
    const p = preview(CASE_A);
    expect(p.needs).toEqual(['A target DSCR for the average, the lowest year, or both']);
    expect([p.average, p.lowest, p.lowestYear]).toEqual(['1.45', '1.16', '2027-28']);
    // The statement in the CA layout: profit build-up, then cash available (A), debt service (B) and DSCR.
    expect(p.statement?.years).toEqual(['2026-27', '2027-28', '2028-29', '2029-30']);
    expect(line(p, 'pbt')).toEqual(['1,59,000', '4,68,000', '5,86,000', '6,41,000']);
    expect(line(p, 'tax')).toEqual(['39,750', '1,17,000', '1,46,500', '1,60,250']);
    expect(line(p, 'Profit after tax')).toEqual(['1,19,250', '3,51,000', '4,39,500', '4,80,750']);
    expect(line(p, 'Add: interest on term loans')).toEqual(['1,41,000', '1,02,000', '54,000', '9,000']);
    expect(line(p, 'Term-loan instalments (principal)')).toEqual(['2,00,000', '4,00,000', '4,00,000', '2,00,000']);
    expect(line(p, 'available')).toEqual(['4,10,250', '5,83,000', '6,03,500', '5,89,750']);
    expect(line(p, 'service')).toEqual(['3,41,000', '5,02,000', '4,54,000', '2,09,000']);
    expect(line(p, 'dscr')).toEqual(['1.20', '1.16', '1.33', '2.82']);
    expect(p.statement?.lines.filter((l) => l.kind === 'head').map((l) => l.label)).toEqual(['Profit', 'Cash available for debt service', 'Debt service']);
    expect([p.verdict, p.largest, p.fewest]).toEqual([undefined, undefined, undefined]);
    expect(barText(p)).toBe('Average 1.45 · lowest 1.16 in 2027-28 · provisional: 1 still needed');
  });
  it('says what limits the result and offers the loan that meets the target', () => {
    const p = preview({ ...CASE_A, target: TARGETS });
    expect(p.needs).toEqual([]);
    expect(p.verdict).toEqual({ meets: false, text: 'Below the target: the lowest year, 2027-28, is 1.16 against 1.20; the average is 1.45 against 1.50.' });
    expect(p.largest).toEqual({ text: 'The largest loan on these terms is Rs. 11,59,646, limited by the lowest year, 2027-28.', amount: 1159646 });
    // More instalments add interest, which pulls the average further below 1.50 within these four years.
    expect(p.fewest).toEqual({ text: 'Even 14 instalments, the most the projections cover (to 2029-30), miss the target: the average is below the target. Add later years to try a longer repayment.' });
    expect(barText(p)).toBe('Average 1.45 · lowest 1.16 in 2027-28 · below the target · complete');
  });
  it('meets the target at the largest loan, with nothing more to offer', () => {
    const p = preview({ ...CASE_A, loan: { ...CASE_A.loan, amount: '11,59,646' }, target: TARGETS });
    expect(p.verdict).toEqual({ meets: true, text: 'Meets the target: the lowest year, 2027-28, is 1.20 against 1.20; the average is 1.50 against 1.50.' });
    expect(p.largest).toEqual({ text: 'The largest loan on these terms is Rs. 11,59,646, limited by the lowest year, 2027-28.' });
    expect(p.fewest).toEqual({ text: 'The fewest instalments for Rs. 11,59,646 are 12 quarterly.' });
  });
  it('offers the fewest instalments for a lowest-year target alone: 13', () => {
    const p = preview({ ...CASE_A, target: { average: '', minimum: '1.2' } });
    expect(p.fewest).toEqual({ text: 'The fewest instalments for Rs. 12,00,000 are 13 quarterly.', instalments: 13 });
    expect(p.verdict?.text).toBe('Below the target: the lowest year, 2027-28, is 1.16 against 1.20.');
  });
  it('asks for a later year only once one is added, and the offers stay within the years given', () => {
    const more = { ...CASE_A, planYears: 5, target: TARGETS };
    expect(yearsOf(more).years).toEqual(['2026-27', '2027-28', '2028-29', '2029-30', '2030-31']);
    expect(preview(more).needs).toEqual(['Profit before interest, depreciation and tax for 2030-31', 'Depreciation for 2030-31']);
    expect(preview(more).largest).toBeUndefined();
    expect(yearsOf({ ...CASE_A, planYears: 3 }).years).toHaveLength(4); // never fewer than the loan runs over
  });
  it('finds the largest loan before the amount is typed', () => {
    const p = preview({ ...CASE_A, loan: { ...CASE_A.loan, amount: '' }, target: TARGETS });
    expect(p.needs).toEqual(['Loan amount']);
    expect(p.largest?.amount).toBe(1159646);
    expect(p.fewest).toBeUndefined();
  });
});

describe('what is still needed', () => {
  it('lists the loan terms first, and no years until the loan says which', () => {
    const p = preview({ ...START, source: 'plan', method: 'common' });
    expect(p.needs).toEqual([
      'Loan amount', 'Interest rate (% a year)', 'Month the loan is drawn (like 2026-04)', 'Moratorium in months (0 if none)',
      'Number of instalments', 'How the loan is repaid (EMI, or equal principal every month or quarter)',
      'A target DSCR for the average, the lowest year, or both',
    ]);
  });
  it('groups a figure missing in several years into one line', () => {
    const cells = { ...CASE_A.cells, depreciation: [], pbdit: ['5,00,000', '', '8,00,000', 'lots'] };
    expect(preview({ ...CASE_A, cells, target: TARGETS }).needs).toEqual([
      'Profit before interest, depreciation and tax for 2027-28 and 2029-30',
      'Depreciation for every year',
    ]);
    expect(groupNeeds(['Projections for 2029-30: the loan is still running then', 'Tax rate (%) for 2026-27, as 100 or less'], ['2026-27']))
      .toEqual(['Projections for 2029-30: the loan is still running then', 'Tax rate (%) for 2026-27, as 100 or less']);
  });
  it('takes one answer for how the loan is repaid: an EMI is monthly', () => {
    const s: State = { ...CASE_A, loan: { ...CASE_A.loan, repayment: 'emi', instalments: '36' } };
    expect(yearsOf(s).years).toEqual(['2026-27', '2027-28', '2028-29', '2029-30']);
    expect(preview(s).needs).toEqual(['A target DSCR for the average, the lowest year, or both']);
  });
  it('asks for a target it cannot read, and never one below 1.00', () => {
    expect(preview({ ...CASE_A, target: { average: 'high', minimum: '0.9' } }).needs).toEqual([
      'Target for the average',
      'Target for the lowest year, 1.00 or more: below 1 the earnings would not cover the debt service',
    ]);
  });
});

describe('own yearly figures', () => {
  // tests/dscr.test.ts, "which years count": 2026-27 has interest but no instalment.
  const OWN: State = {
    ...START, source: 'own', method: 'common', firstYear: '2026-27', yearCount: '3',
    cells: { pat: ['60,000', '80,000', '1,00,000'], depreciation: ['40,000', '40,000', '40,000'], interestTL: ['50,000', '40,000', '20,000'], principalTL: ['0', '1,00,000', '1,00,000'] },
    modes: { nonCash: 'none' }, target: { average: '1.5', minimum: '' },
  };
  it('counts only the years with an instalment, and says so in one line', () => {
    const p = preview(OWN);
    expect([p.average, p.lowest, p.lowestYear]).toEqual(['1.23', '1.14', '2027-28']);
    expect([line(p, 'dscr'), p.statement?.counted]).toEqual([['3.00', '1.14', '1.33'], [false, true, true]]);
    expect(p.statement?.lines.some((l) => l.label === 'Profit')).toBe(false); // own figures start from profit after tax
    expect(line(p, 'available')).toEqual(['1,50,000', '1,60,000', '1,60,000']);
    expect(p.notCounted).toBe('Not counted: 2026-27 (no term-loan instalment).');
    expect(p.verdict).toEqual({ meets: false, text: 'Below the target: the average is 1.23 against 1.50.' });
    expect(p.largest).toBeUndefined();
  });
  it('asks for the years before the figures', () => {
    expect(preview({ ...OWN, firstYear: '2026', yearCount: '0' }).needs).toEqual(['The first year, like 2026-27', 'The number of years, 1 to 30']);
  });
});

describe('the repayment schedule (fictional case A)', () => {
  it('reads the instalment back, and shows every month by year', () => {
    const sch = preview(CASE_A).schedule!;
    expect(sch.level).toBe('Principal Rs. 1,00,000 a quarter, and interest on the balance every month.');
    expect(sch.years.map((y) => [y.fy, y.interest, y.principal, y.closing])).toEqual([
      ['2026-27', '1,41,000', '2,00,000', '10,00,000'], ['2027-28', '1,02,000', '4,00,000', '6,00,000'],
      ['2028-29', '54,000', '4,00,000', '2,00,000'], ['2029-30', '9,000', '2,00,000', '0'],
    ]);
    expect(sch.years[0].months.find((m) => m.ym === '2026-12')).toEqual({
      ym: '2026-12', month: 'Dec 2026', opening: '12,00,000', interest: '12,000', principal: '1,00,000', paid: '1,12,000', closing: '11,00,000', instalment: 1,
    });
  });
  it('is shown as soon as the loan terms are in, before any projections', () => {
    const p = preview({ ...CASE_A, cells: {}, modes: {} });
    expect([p.schedule?.years.length, p.statement]).toEqual([4, undefined]);
  });
  it('an EMI is read back to the paisa', () => {
    const emi: State = { ...CASE_A, loan: { ...CASE_A.loan, amount: '10 L', moratoriumMonths: '0', instalments: '12', repayment: 'emi' } };
    expect(preview(emi).schedule?.level).toBe('EMI Rs. 88,848.79 a month, interest included; banks round it up to the next rupee.');
  });
});

describe('one answer for several questions', () => {
  it('each preset answers the four choices, and they change the rows asked', () => {
    const keys = (method: string) => rowsOf({ ...START, source: 'own', method }).map((r) => r.key);
    expect(keys('rbi-2020')).toEqual(['pat', 'depreciation', 'nonCash', 'interestTL', 'principalTL', 'interestOther']);
    expect(keys('schedule-iii')).toEqual(['pat', 'depreciation', 'nonCash', 'interestTL', 'principalTL', 'interestOther', 'leaseRentals']);
  });
  it('the borrower sets the tax rate for every year', () => {
    const company = TAX_CHOICES.find((t) => t.id === 'company')!;
    const s = withTaxRate({ ...CASE_A, modes: { ...CASE_A.modes, taxPct: 'years' }, cells: { ...CASE_A.cells, taxPct: ['', '30'] } }, company.pct);
    expect([s.modes.taxPct, s.cells.taxPct[0]]).toEqual(['same', '25.168']);
    expect(preview(s).needs).toEqual(['A target DSCR for the average, the lowest year, or both']);
  });
});

describe('reading and showing', () => {
  it('financial years', () => {
    expect(['2026-27', '2026-2027', 'FY 2026-27', '2026-28', '2026', '2026-2028'].map(parseFy))
      .toEqual(['2026-27', '2026-27', '2026-27', undefined, undefined, undefined]);
  });
  it('amounts read back once the field is left', () => {
    expect(['150000', '1.5 L', '-50000', '1234.5', 'lots'].map(tidyAmount)).toEqual(['1,50,000', '1,50,000', '-50,000', '1,234.50', 'lots']);
  });
  it('a DSCR just below its target never shows as the target', () => {
    expect([ratioText(1.4996, 1.5), ratioText(1.5, 1.5), ratioText(1.4951), ratioText(1.2031, 1.2)]).toEqual(['1.4996', '1.50', '1.50', '1.20']);
  });
});
