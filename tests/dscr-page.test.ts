/**
 * The DSCR page's words and figures, without a browser (site/src/dscr/model.ts). The figures are fictional case A
 * (docs/GOLDEN-CASES.md), worked by hand in tests/dscr.test.ts: model-worked until the owner confirms them.
 */
import { describe, it, expect } from 'vitest';
import {
  ASSUMED, BORROWER_CHOICES, START, barText, emisAsk, groupNeeds, loanRead, parseFy, preview, ratioText, rowsOf, statusText, tidyAmount, withBorrower, withPlanStart,
  withSource, withTaxRate, yearsOf,
  type Preview, type State,
} from '../site/src/dscr/model';

// Case A entered the way a user would: a "None" for other non-cash charges and other term loans, and one figure for
// working-capital interest and the tax rate, each answered once for every year.
const CASE_A: State = {
  ...START, source: 'plan', method: 'common',
  loan: { amount: '12 L', ratePct: '12', disbursed: '2026-04', moratoriumMonths: '6', instalments: '12', repayment: 'quarterly' },
  cells: { pbdit: ['5,00,000', '7,50,000', '8,00,000', '8,00,000'], depreciation: ['1,50,000', '1,30,000', '1,10,000', '1,00,000'], interestOther: ['50,000'], taxPct: ['25'] },
  modes: { pbdit: 'years', depreciation: 'years', nonCash: 'none', otherLoans: 'none', interestOther: 'same', taxPct: 'same' },
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
    expect(keys({ source: 'plan' })).toEqual(['pbdit', 'assetIncome', 'depreciation', 'nonCash', 'interestOther', 'otherLoansInterest', 'otherLoansPrincipal', 'existingEmis', 'taxPct']);
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
      // The exact figures beside the words, for the Excel copy (1% of 12,00,000 is 12,000).
      n: { opening: 1200000, interest: 12000, principal: 100000, paid: 112000, closing: 1100000 },
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
  it('who the borrower is sets the tax for every year: a company pays 25.168%', () => {
    // Case A's profit before tax 1,59,000, 4,68,000, 5,86,000 and 6,41,000 at 25.168%.
    const s = withBorrower({ ...CASE_A, modes: { ...CASE_A.modes, taxPct: 'years' }, cells: { ...CASE_A.cells, taxPct: ['', '30'] } }, 'company');
    expect([s.borrower, s.modes.taxPct]).toEqual(['company', 'borrower']);
    const p = preview(s);
    expect(p.needs).toEqual(['A target DSCR for the average, the lowest year, or both']);
    expect(line(p, 'tax')).toEqual(['40,017', '1,17,786', '1,47,484', '1,61,327']);
  });
  it('asks who the borrower is when the tax is to be worked out by it', () => {
    expect(preview({ ...CASE_A, modes: { ...CASE_A.modes, taxPct: 'borrower' } }).needs).toEqual(['Who the borrower is: it sets the tax', 'A target DSCR for the average, the lowest year, or both']);
  });
});

describe('a first year with interest only (the owner\'s report: "1 year is not available")', () => {
  // Drawn in October 2026 with 6 months' moratorium: 2026-27 has only interest, 50,00,000 × 10% ÷ 12 × 6 = 2,50,000.
  // The projections, typed year by year, start in 2027-28, so the first column is left empty.
  const LATE: State = {
    ...START, source: 'plan', method: 'common',
    loan: { amount: '50 L', ratePct: '10', disbursed: '2026-10', moratoriumMonths: '6', instalments: '60', repayment: 'emi' },
    cells: { pbdit: ['', '18 L', '20 L', '22 L', '24 L', '26 L'], depreciation: ['', '4 L', '3.5 L', '3 L', '2.6 L', '2.2 L'], interestOther: ['1 L'], taxPct: ['25.168'] },
    modes: { pbdit: 'years', depreciation: 'years', nonCash: 'none', otherLoans: 'none', interestOther: 'same', taxPct: 'same' },
    target: { average: '1.50', minimum: '1.20' },
  };
  it('asks which year the figures start in, and shows no statement until answered', () => {
    const p = preview(LATE);
    expect(p.needs).toEqual([
      'The first year of your figures: 2026-27 or 2027-28',
      'Profit before interest, depreciation and tax for 2026-27', 'Depreciation for 2026-27',
    ]);
    expect([p.leadingInterest, p.statement]).toEqual([[{ fy: '2026-27', amount: 'Rs. 2,50,000' }], undefined]);
  });
  it('starting in 2027-28 keeps each figure under its year, completes the preview and says what was left out', () => {
    const s = withPlanStart(LATE, '2027-28');
    expect(yearsOf(s).years).toEqual(['2027-28', '2028-29', '2029-30', '2030-31', '2031-32']);
    expect([s.cells.pbdit[0], s.cells.depreciation[4], s.cells.taxPct[0], s.cells.interestOther[0]]).toEqual(['18 L', '2.2 L', '25.168', '1 L']);
    const p = preview(s);
    expect([p.needs, p.statement?.years[0]]).toEqual([[], '2027-28']);
    expect(p.beforeStart).toBe('Left out: 2026-27, before your figures start. Its interest (Rs. 2,50,000) is taken as paid from the project cost (capitalised), not from profits.');
    expect(loanRead(yearsOf(s))).toMatch(/The loan runs over 2026-27 to 2031-32\.$/);
  });
  it('starting in 2026-27 asks for its figures; going back restores the columns', () => {
    expect(preview(withPlanStart(LATE, '2026-27')).needs).toEqual(['Profit before interest, depreciation and tax for 2026-27', 'Depreciation for 2026-27']);
    const back = withPlanStart(withPlanStart(LATE, '2027-28'), '2026-27');
    expect([back.cells.pbdit, yearsOf(back).years[0]]).toEqual([LATE.cells.pbdit, '2026-27']);
  });
});

describe('a few answers instead of every year (the owner: "that is the job it is supposed to do")', () => {
  // 50 L at 10%, EMI over 60 months from April 2027 (drawn April 2027, no moratorium): 5 years, 2027-28 to 2031-32.
  const SHORT: State = {
    ...START, source: 'plan', method: 'common',
    loan: { amount: '50 L', ratePct: '10', disbursed: '2027-04', moratoriumMonths: '0', instalments: '60', repayment: 'emi' },
    cells: { pbdit: ['18 L'], depreciation: ['4 L'], interestOther: ['1 L'] }, rates: { pbdit: '10' },
    modes: { nonCash: 'none', otherLoans: 'none', interestOther: 'same' }, target: { average: '1.50', minimum: '1.20' },
  };
  it('profit grows from one figure and one rate; depreciation and interest are one figure each', () => {
    const s = withTaxRate(SHORT, '25.168'), p = preview(s);
    expect(p.needs).toEqual([]);
    // 18,00,000 growing 10% a year: 19,80,000, 21,78,000, 23,95,800, 26,35,380.
    expect(line(p, 'pbdit')).toEqual(['18,00,000', '19,80,000', '21,78,000', '23,95,800', '26,35,380']);
    expect(line(p, 'Less: depreciation')).toEqual(['4,00,000', '4,00,000', '4,00,000', '4,00,000', '4,00,000']);
  });
  it('names each missing answer once, never a line per year', () => {
    const p = preview({ ...SHORT, rates: {}, modes: { otherLoans: 'none', interestOther: 'same' } });
    expect(p.needs).toEqual([
      'Profit before interest, depreciation and tax: growth a year (%)',
      'Other non-cash charges: none, or how much',
      'Who the borrower is: it sets the tax',
      'A target DSCR for the average, the lowest year, or both',
    ].filter((n) => !n.startsWith('A target')));
  });
  it('depreciation on the written-down value falls by its rate: 9,00,000 at 15% gives 7,65,000 then 6,50,250', () => {
    const s = withTaxRate({ ...SHORT, cells: { ...SHORT.cells, depreciation: ['9 L'] }, rates: { pbdit: '10', depreciation: '15' }, modes: { ...SHORT.modes, depreciation: 'fall' } }, '25.168');
    expect(line(preview(s), 'Less: depreciation')?.slice(0, 3)).toEqual(['9,00,000', '7,65,000', '6,50,250']);
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

describe('this year\'s figures and sales growth; the rest assumed (the owner: "assume the rest")', () => {
  // Fictional case A′: case A's loan, and only this year's figures (engine/data/defaults.json assumes the rest).
  // Profit before interest, depreciation and tax 5,00,000 growing 10% with sales: 5,50,000, 6,05,000, 6,65,500.
  // Depreciation 1,50,000 and working-capital interest 50,000 every year; tax 31.2% (assumed).
  // 2026-27: before tax 5,00,000 − 1,50,000 − 1,41,000 − 50,000 = 1,59,000; tax 49,608; cash 5,00,000 − 50,000 − 49,608 = 4,00,392
  //   against 3,41,000 = 1.17. 2027-28: before tax 2,48,000, tax 77,376, cash 4,22,624 / 5,02,000 = 0.84.
  //   2028-29: 3,51,000, 1,09,512, 4,45,488 / 4,54,000 = 0.98. 2029-30: 4,56,500, 1,42,428, 4,73,072 / 2,09,000 = 2.26.
  //   Average 17,41,576 / 15,06,000 = 1.16; lowest 0.84 in 2027-28.
  const A2: State = {
    ...ASSUMED,
    loan: { amount: '12 L', ratePct: '12', disbursed: '2026-04', moratoriumMonths: '6', instalments: '12', repayment: 'quarterly' },
    cells: { ...ASSUMED.cells, pbdit: ['5,00,000'], depreciation: ['1,50,000'], interestOther: ['50,000'] },
    rates: { pbdit: '10' },
  };
  it('opens with the method and the target answered, asking only the loan', () => {
    const p = preview(ASSUMED);
    expect(p.started).toBe(true);
    expect(p.needs.some((n) => /target|DSCR is worked out|Where the yearly figures/.test(n))).toBe(false);
    expect(p.needs[0]).toBe('Loan amount');
  });
  it('works everything out from this year\'s figures and lists what it assumed', () => {
    const p = preview(A2);
    expect(p.needs).toEqual([]);
    expect(line(p, 'pbdit')).toEqual(['5,00,000', '5,50,000', '6,05,000', '6,65,500']);
    expect(line(p, 'tax')).toEqual(['49,608', '77,376', '1,09,512', '1,42,428']);
    expect(line(p, 'dscr')).toEqual(['1.17', '0.84', '0.98', '2.26']);
    expect([p.average, p.lowest, p.lowestYear, p.verdict?.meets]).toEqual(['1.16', '0.84', '2027-28', false]);
    expect(p.assumed.map((a) => a.id)).toEqual(['method', 'target', 'tax', 'margin', 'asset', 'depreciation', 'interest', 'otherLoans', 'nonCash']);
    expect(statusText(p)).toBe('Complete, on 9 assumptions');
  });
  it('an assumption that is changed leaves the list', () => {
    const s = withTaxRate({ ...A2, target: { average: '1.25', minimum: '1.20' } }, '25.168');
    expect(preview(s).assumed.map((a) => a.id)).toEqual(['method', 'margin', 'asset', 'depreciation', 'interest', 'otherLoans', 'nonCash']);
  });
  it('own yearly figures take none of the assumptions about the figures; coming back restores them', () => {
    const own = withSource(A2, 'own');
    expect(own.modes).toEqual({});
    expect(preview(own).assumed.map((a) => a.id)).toEqual(['method', 'target']);
    expect(withSource(own, 'plan').modes).toEqual(A2.modes);
    expect(withSource(START, 'plan').modes).toEqual({});
  });
  it('a loan drawn in October: the figures start in its first year until that is changed', () => {
    const oct: State = { ...A2, loan: { ...A2.loan, disbursed: '2026-10' } };
    const p = preview(oct);
    expect([yearsOf(oct).chosenStart, yearsOf(oct).startNeeded]).toEqual(['2026-27', false]);
    expect(p.needs).toEqual([]);
    expect(p.assumed.map((a) => a.id)).toContain('start');
    expect(preview(withPlanStart(oct, '2027-28')).assumed.map((a) => a.id)).not.toContain('start');
  });
});

describe('who the borrower is, loans already running and the new asset (P1e)', () => {
  // Fictional case A′ (above): case A's loan; profit before interest, depreciation and tax 5,00,000 growing 10%;
  // depreciation 1,50,000 and working-capital interest 50,000 every year.
  const A2: State = {
    ...ASSUMED,
    loan: { amount: '12 L', ratePct: '12', disbursed: '2026-04', moratoriumMonths: '6', instalments: '12', repayment: 'quarterly' },
    cells: { ...ASSUMED.cells, pbdit: ['5,00,000'], depreciation: ['1,50,000'], interestOther: ['50,000'] },
    rates: { pbdit: '10' },
  };
  it('a proprietor pays no tax on these profits (under Rs. 12,00,000): the DSCR rises from 1.16 to 1.41', () => {
    // Profit before tax 1,59,000 to 4,56,500, all under 12,00,000: no tax. Cash 4,50,000, 5,00,000, 5,55,000, 6,15,500
    // against 3,41,000, 5,02,000, 4,54,000, 2,09,000: 1.32, 1.00 (0.9960), 1.22, 2.94 (2.94498: rounded from 2.9450 it would wrongly read 2.95);
    // average 21,20,500 / 15,06,000 = 1.41.
    const p = preview(withBorrower(A2, 'proprietor'));
    expect(line(p, 'tax')).toEqual(['0', '0', '0', '0']);
    expect(line(p, 'dscr')).toEqual(['1.32', '1.00', '1.22', '2.94']);
    expect([p.average, p.lowest, p.lowestYear]).toEqual(['1.41', '1.00', '2027-28']);
    // The assumed rate gives way to the proprietor's own assumption: the new regime, the business's profit the only income.
    expect(p.assumed.map((a) => a.id)).toEqual(['method', 'target', 'proprietorTax', 'margin', 'asset', 'depreciation', 'interest', 'otherLoans', 'nonCash']);
  });
  it('the borrower says which EMIs to give', () => {
    expect([emisAsk(A2), ...BORROWER_CHOICES.map((b) => emisAsk(withBorrower(A2, b.id)))]).toEqual([
      'EMIs a month on loans already running: all of a proprietor\'s, business and personal; a firm\'s, LLP\'s or company\'s own loans only',
      'All EMIs a month, business and personal (home, car, personal loans)',
      'EMIs a month on the firm\'s own loans',
      'EMIs a month on the company\'s own loans',
    ]);
    expect(BORROWER_CHOICES.map((b) => [b.id, b.tax])).toEqual([
      ['proprietor', 'slab rates of 5% to 30% with 4% cess, nothing up to Rs. 12,00,000 of profit'], ['firm', '31.2%; 34.944% above Rs. 1,00,00,000'], ['company', '25.168%'],
    ]);
  });
  it('EMIs a month are debt service every month, until the last EMI when it is given', () => {
    // 20,000 a month running on and 15,000 a month to June 2027: 4,20,000, then 2,40,000 + 45,000 = 2,85,000, then 2,40,000.
    // 2026-27: cash 4,00,392 (the 31.2% assumed) against 3,41,000 + 4,20,000 = 7,61,000: 0.53.
    const s: State = { ...A2, modes: { ...A2.modes, otherLoans: 'emi' }, running: [{ emi: '20,000', last: '' }, { emi: 'about 15', last: '2027-06' }] };
    expect(preview(s).needs).toEqual(['Loans already running: the EMI a month of loan 2']);
    const p = preview({ ...s, running: [{ emi: '20,000', last: '' }, { emi: '15,000', last: 'Jun 2027' }] });
    expect(line(p, 'emis')).toEqual(['4,20,000', '2,85,000', '2,40,000', '2,40,000']);
    expect(line(p, 'service')).toEqual(['7,61,000', '7,87,000', '6,94,000', '4,49,000']);
    expect(line(p, 'dscr')).toEqual(['0.53', '0.54', '0.64', '1.05']);
    expect(p.assumed.map((a) => a.id)).not.toContain('otherLoans');
  });
  it('the new asset\'s income counts from the month it starts running', () => {
    // 3,60,000 a year from October 2026: 1,80,000 in 2026-27 (6 months), then 3,60,000. 2026-27: before tax 3,39,000,
    // tax 1,05,768, cash 5,24,232 against 3,41,000: 1.54.
    const s: State = { ...A2, modes: { ...A2.modes, assetIncome: 'from' }, asset: { yearly: '3.6 L', from: '' } };
    expect(preview(s).needs).toEqual(['Extra income from the new asset: the month it starts running, like 2026-10']);
    const p = preview({ ...s, asset: { yearly: '3.6 L', from: '2026-10' } });
    expect(line(p, 'asset')).toEqual(['1,80,000', '3,60,000', '3,60,000', '3,60,000']);
    expect(line(p, 'pbt')).toEqual(['3,39,000', '6,08,000', '7,11,000', '8,16,500']);
    expect(line(p, 'dscr')).toEqual(['1.54', '1.34', '1.53', '3.45']);
    expect(p.assumed.map((a) => a.id)).not.toContain('asset');
  });
  it('fictional case P through the page gives the engine\'s figures (tests/dscr.test.ts)', () => {
    const P: State = withBorrower({
      ...A2,
      cells: { ...A2.cells, pbdit: ['15 L'], depreciation: ['2 L'], interestOther: ['1 L'] },
      modes: { ...A2.modes, otherLoans: 'emi', assetIncome: 'from' },
      running: [{ emi: '25,000', last: '' }, { emi: '15,000', last: '2027-12' }], asset: { yearly: '3,60,000', from: '2026-10' },
    }, 'proprietor');
    const p = preview(P);
    expect(p.needs).toEqual([]);
    expect(line(p, 'tax')).toEqual(['40,560', '1,26,464', '1,70,768', '2,20,350']);
    expect(line(p, 'available')).toEqual(['15,39,440', '17,83,536', '19,04,232', '20,36,150']);
    expect(line(p, 'dscr')).toEqual(['1.88', '1.90', '2.53', '4.00']);
    expect([p.average, p.lowest, p.lowestYear]).toEqual(['2.40', '1.88', '2026-27']);
  });
});
