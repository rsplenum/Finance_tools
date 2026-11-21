/**
 * DSCR row C, point 6: the loan asks the whole tenure, the holiday inside it, and works the instalments from it.
 * Every figure here is worked by hand (fictional case A′ of tests/dscr-page.test.ts): a tenure of 42 months with a
 * 6-month holiday leaves 36 months, 12 quarters; the same 42 months with no holiday is 14 quarters; with 5 months'
 * holiday 37 months is not whole quarters, so it is asked again.
 */
import { describe, it, expect } from 'vitest';
import { ASSUMED, TENURE_LABEL, changeLoan, preview, tenureText, withInstalments, withYears, yearsText, type State } from '../site/src/dscr/model';

const LOAN = { amount: '12 L', ratePct: '12', disbursed: '2026-04', moratoriumMonths: '6', instalments: '', repayment: 'quarterly' } as State['loan'];
// Case A′ with working-capital interest held at 50,000 (Same every year): average 1.16 (tests/dscr-page.test.ts).
const A2: State = {
  ...ASSUMED,
  loan: { ...LOAN, instalments: '12' },
  cells: { ...ASSUMED.cells, pbdit: ['5,00,000'], depreciation: ['1,50,000'], interestOther: ['50,000'] },
  modes: { ...ASSUMED.modes, interestOther: 'same' },
  rates: { pbdit: '10' },
};

describe('the whole tenure, the holiday inside it', () => {
  it('works the instalments: 42 months less a 6-month holiday is 12 quarterly instalments', () => {
    const l = changeLoan(LOAN, { tenure: '42' });
    expect([l.tenure, l.instalments]).toEqual(['42', '12']);
  });
  it('keeps the tenure as typed when the holiday or the repayment changes', () => {
    const l = changeLoan(changeLoan(LOAN, { tenure: '42' }), { moratoriumMonths: '0' });
    expect([l.tenure, l.instalments]).toEqual(['42', '14']);
    const m = changeLoan(l, { repayment: 'emi' });
    expect([m.tenure, m.instalments]).toEqual(['42', '42']);
  });
  it('shows the tenure of instalments set another way: 12 quarters after 6 months is 42 months', () => {
    expect(tenureText({ ...LOAN, instalments: '12' })).toBe('42');
    // A change elsewhere pins that tenure, so the holiday moving keeps 42 months.
    expect(changeLoan({ ...LOAN, instalments: '12' }, { moratoriumMonths: '0' })).toMatchObject({ tenure: '42', instalments: '14' });
  });
  it('a solver writing instalments drops the typed tenure, which then follows them', () => {
    const l = withInstalments(changeLoan(LOAN, { tenure: '42' }), '14');
    expect([l.tenure, tenureText(l)]).toEqual([undefined, '48']);
  });
  it('asks again when the months after the holiday are not whole quarters', () => {
    const p = preview({ ...A2, loan: changeLoan(LOAN, { tenure: '42', moratoriumMonths: '5' }) });
    expect(p.needs).toContain(`${TENURE_LABEL}: the months after the holiday must make whole quarters, one or more`);
    expect(preview({ ...A2, loan: changeLoan(LOAN, { tenure: '' }) }).needs).toContain(TENURE_LABEL);
  });
  it('the figures read the same from the tenure as from the instalments', () => {
    const a = preview(A2), b = preview({ ...A2, loan: changeLoan(LOAN, { tenure: '42' }) });
    expect([b.average, b.lowest]).toEqual([a.average, a.lowest]);
    expect(a.average).toBe('1.16');
  });
});

describe("the front door's years: the whole tenure in years", () => {
  it('4 years with a 6-month holiday is a tenure of 48 months, 14 quarterly instalments', () => {
    const l = withYears(LOAN, '4');
    expect([l.tenure, l.instalments, yearsText(l)]).toEqual(['48', '14', '4']);
  });
  it('5 years of monthly instalments with no holiday is 60', () => {
    const l = withYears({ ...LOAN, moratoriumMonths: '0', repayment: 'emi' }, '5');
    expect([l.tenure, l.instalments]).toEqual(['60', '60']);
  });
  it('42 months reads as 3.5 years', () => {
    expect(yearsText(changeLoan(LOAN, { tenure: '42' }))).toBe('3.5');
  });
});
