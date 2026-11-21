/**
 * DSCR row A: loans already running given by their terms, and more than one new term loan (engine/dscr.ts plan(),
 * engine/dscr-check.ts runningCheck). Fictional case R, model-worked by hand and again by a separate Python loop:
 * - A company taxed at a flat 25%; profit before interest, depreciation and tax ₹9,00,000 every year, nothing else.
 * - New loan: ₹10,00,000 at 12%, drawn 2026-04, no holiday, 60 monthly equal instalments of principal (16,666.67).
 *   Interest is 1% of each month's opening balance: 2026-27, 1% × (12 × 10,00,000 − 16,666.67 × (0 + … + 11) = 11,00,000)
 *   = 1,09,000; 2027-28, 1% × (1,20,00,000 − 16,666.67 × 210) = 85,000. Principal 2,00,000 a year.
 * - Running loan: ₹6,00,000 at 12%, drawn 2025-04, 36 months, no holiday, equal principal monthly (16,666.67), so it ends
 *   in March 2028. 2026-27 is its months 12 to 23: 1% × (72,00,000 − 16,666.67 × 210) = 37,000; 2027-28, months 24 to
 *   35: 1% × (72,00,000 − 16,666.67 × 354) = 13,000. Principal 2,00,000 a year. Its balance in April 2026 is 4,00,000.
 * - 2026-27: interest on term loans 1,46,000; profit before tax 7,54,000; tax 1,88,500; profit after tax 5,65,500; cash
 *   available (interest added back) 7,11,500; debt service 4,00,000 + 1,46,000 = 5,46,000; DSCR 1.303114.
 * - 2027-28: interest 98,000; profit before tax 8,02,000; tax 2,00,500; after tax 6,01,500; cash 6,99,500; service
 *   4,98,000; DSCR 1.404618.
 * - The old way (the running loan as EMIs paid, 2,37,000 in 2026-27, its interest not set against tax): profit before
 *   tax 7,91,000, tax 1,97,750, cash 5,93,250 + 1,09,000 = 7,02,250 against the same 5,46,000: 1.286172. The DSCR was low
 *   by the tax on the running loan's interest, 37,000 × 25% = 9,250, and no more (point 1).
 */
import { describe, it, expect } from 'vitest';
import { amortization, fyRange, planStatement, maxLoanAmount, runningNeeds, type Definition, type LoanInput, type Plan, type ProjectionYear } from '../engine/dscr';
import type { LoanTerms, RunningTerms } from '../engine/loan';
import { START, loanInput, preview, type Preview, type State } from '../site/src/dscr/model';

const COMMON: Definition = { interest: 'term-loans', leases: 'no', years: 'repayment', average: 'totals' };
const proj = (over: Partial<ProjectionYear> = {}): ProjectionYear[] => fyRange('2026-27', 5).map((fy) => ({
  fy, pbdit: 900000, assetIncome: 0, depreciation: 0, nonCash: 0, interestOther: 0, otherLoansInterest: 0, otherLoansPrincipal: 0, existingEmis: 0, taxPct: 25, ...over,
}));
const NEW: LoanInput = { amount: 1000000, ratePct: 12, disbursed: '2026-04', moratoriumMonths: 0, instalments: 60, frequency: 'monthly', style: 'equal-principal' };
const RUNNING: RunningTerms = { amount: 600000, ratePct: 12, start: '2025-04', tenureMonths: 36, holidayMonths: 0, frequency: 'monthly', style: 'equal-principal' };
const run = (loan: LoanInput, p = proj()) => planStatement(p, loan, COMMON) as Plan;

describe('case R: a loan already running, by its terms', () => {
  const plan = run({ ...NEW, alongside: { running: [RUNNING] } });
  const row = (fy: string) => plan.statement.rows.find((r) => r.fy === fy);

  it('charges its interest in the profit, adds it back and counts its principal, as worked by hand', () => {
    expect('statement' in plan).toBe(true);
    const p = plan.profit[0];
    expect([p.interestNew, p.interestRunning, p.interestTL]).toEqual([expect.closeTo(109000, 2), expect.closeTo(37000, 2), expect.closeTo(146000, 2)]);
    expect([p.pbt, p.tax, p.pat]).toEqual([expect.closeTo(754000, 2), expect.closeTo(188500, 2), expect.closeTo(565500, 2)]);
    expect([row('2026-27')?.available, row('2026-27')?.service]).toEqual([expect.closeTo(711500, 2), expect.closeTo(546000, 2)]);
    expect(row('2026-27')?.dscr).toBeCloseTo(1.303114, 6);
    expect(row('2027-28')?.dscr).toBeCloseTo(1.404618, 6);
  });

  it('takes each year apart: new and running, interest and principal', () => {
    const s = plan.split[1];
    expect([s.fy, s.interestNew, s.interestRunning, s.principalNew, s.principalRunning])
      .toEqual(['2027-28', expect.closeTo(85000, 2), expect.closeTo(13000, 2), expect.closeTo(200000, 2), expect.closeTo(200000, 2)]);
    // After March 2028 the running loan is repaid.
    expect(plan.split[2].interestRunning + plan.split[2].principalRunning).toBe(0);
    // The schedule is still the new loan's own, the one the solvers move.
    expect(plan.schedule[0].interest).toBeCloseTo(109000, 2);
  });

  it('is low only by the tax on the running interest when the loan is given as EMIs paid (point 1)', () => {
    const old = run(NEW, proj()).statement; // the same years with the running loan as EMIs below
    const withEmis = run(NEW, proj().map((y) => ({ ...y, existingEmis: y.fy === '2026-27' ? 237000 : y.fy === '2027-28' ? 213000 : 0 })));
    expect(withEmis.statement.rows[0].dscr).toBeCloseTo(1.286172, 6);
    expect(plan.statement.rows[0].available - withEmis.statement.rows[0].available).toBeCloseTo(37000 * 0.25, 2);
    expect(old.rows[0].service).toBeCloseTo(309000, 2);
  });

  it('gives the same figures from its balance today as from the amount when taken', () => {
    const { amount: _, ...rest } = RUNNING;
    const byBalance = run({ ...NEW, alongside: { running: [{ ...rest, balance: 400000, asOf: '2026-04' }] } });
    byBalance.statement.rows.forEach((r, i) => expect(r.dscr).toBeCloseTo(plan.statement.rows[i].dscr as number, 9));
  });
});

describe('more than one new term loan (point 2)', () => {
  it('adds up each schedule: two loans on the same equal-principal terms are one loan of their sum', () => {
    const two = run({ ...NEW, alongside: { loans: [{ ...(NEW as LoanTerms), amount: 500000 }] } });
    const one = run({ ...NEW, amount: 1500000 });
    two.statement.rows.forEach((r, i) => {
      expect(r.available).toBeCloseTo(one.statement.rows[i].available, 4);
      expect(r.service).toBeCloseTo(one.statement.rows[i].service, 4);
    });
    expect(two.split[0].interestNew).toBeCloseTo(109000 * 1.5, 2);
    // The second loan stays as typed when the solver moves the first.
    const most = maxLoanAmount(proj(), { ...NEW, alongside: { loans: [{ ...(NEW as LoanTerms), amount: 500000 }] } }, COMMON, { minimum: 1.25 });
    const alone = maxLoanAmount(proj(), NEW, COMMON, { minimum: 1.25 });
    expect('amount' in most && 'amount' in alone && most.amount < alone.amount).toBe(true);
  });

  it('names what a second loan still needs, and the repayment schedule shows the first alone', () => {
    const r = planStatement(proj(), { ...NEW, alongside: { loans: [{ amount: 500000 } as LoanTerms] } }, COMMON);
    expect('needs' in r && r.needs).toContain('New term loan 2: interest rate (% a year)');
    expect('months' in amortization({ ...NEW, alongside: { loans: [{ amount: 500000 } as LoanTerms] } })).toBe(true);
  });
});

describe('what a running loan needs', () => {
  it('asks for each term, never assumes one', () => {
    expect(runningNeeds({})).toEqual(expect.arrayContaining(['The amount when taken, or the balance today', 'Interest rate (% a year)', 'Month it was first drawn (like 2024-04)']));
    expect(runningNeeds({ ...RUNNING, balance: 1 })).toContain('The amount when taken or the balance today, not both');
    const { amount: _, ...rest } = RUNNING;
    expect(runningNeeds({ ...rest, balance: 100, asOf: '2028-06' })[0]).toMatch(/repaid by now/);
    expect(runningNeeds({ ...RUNNING, tenureMonths: 35, frequency: 'quarterly' })[0]).toMatch(/whole quarters/);
    expect(runningNeeds(RUNNING)).toEqual([]);
  });
});

describe('the page: case R typed, the running loan under More options by its terms', () => {
  const PAGE_R: State = {
    ...START, source: 'plan', method: 'common', target: { average: '1.25', minimum: '1.10' },
    loan: { amount: '10 L', ratePct: '12', disbursed: '2026-04', moratoriumMonths: '0', instalments: '60', repayment: 'monthly' },
    cells: { pbdit: ['9,00,000'], taxPct: ['25'] },
    modes: { pbdit: 'same', depreciation: 'none', nonCash: 'none', otherLoans: 'terms', interestOther: 'none', taxPct: 'same' },
    runningTerms: [{ by: 'amount', figure: '6 L', ratePct: '12', start: '2025-04', tenure: '36', holiday: '0', repayment: 'monthly' }],
  };
  const line = (p: Preview, key: string) => p.statement?.lines.find((l) => l.id === key || l.label === key);

  it('names the new loan and the running loan apart, with the hand-worked figures', () => {
    const p = preview(PAGE_R);
    expect(p.needs).toEqual([]);
    expect(line(p, 'Less: interest on the new term loan')?.values.slice(0, 2)).toEqual(['1,09,000', '85,000']);
    expect(line(p, 'Less: interest on loans already running')?.values.slice(0, 3)).toEqual(['37,000', '13,000', '0']);
    expect(line(p, 'Add: interest on loans already running')?.values.slice(0, 2)).toEqual(['37,000', '13,000']);
    expect(line(p, 'Instalments on loans already running (principal)')?.values.slice(0, 3)).toEqual(['2,00,000', '2,00,000', '0']);
    expect(line(p, 'Instalments on the new term loan (principal)')?.values[0]).toBe('2,00,000');
    expect(line(p, 'dscr')?.n?.[0]).toBeCloseTo(1.303114, 6);
    expect(line(p, 'dscr')?.n?.[1]).toBeCloseTo(1.404618, 6);
    // Each split line's Total is the engine's, and the two make up the term loans' total.
    const t = (l: string) => line(p, l)?.total?.n ?? NaN;
    expect(t('Interest on the new term loan') + t('Interest on loans already running')).toBeCloseTo(109000 + 85000 + 61000 + 37000 + 13000 + 37000 + 13000, 2);
  });

  it('asks the holiday’s interest of a running loan with a holiday, and never assumes it', () => {
    const p = preview({ ...PAGE_R, runningTerms: [{ ...PAGE_R.runningTerms![0], tenure: '39', holiday: '3' }] });
    expect(p.needs).toContain('Loan already running 1: interest in the holiday (paid each month, or added to the loan)');
    expect(p.statement).toBeUndefined();
  });

  it('counts a second new term loan, and says "new term loans"', () => {
    const p = preview({ ...PAGE_R, modes: { ...PAGE_R.modes, otherLoans: 'none' }, newLoans: [{ ...PAGE_R.loan, amount: '5 L' }] });
    expect(line(p, 'Less: interest on the new term loans')?.values[0]).toBe('1,63,500');
    expect(line(p, 'Less: interest on loans already running')).toBeUndefined();
    expect(loanInput({ ...PAGE_R, newLoans: [{ ...PAGE_R.loan, amount: '5 L' }] }).alongside?.loans?.[0].amount).toBe(500000);
  });

  it('leaves running terms out unless they are how the running loans are given', () => {
    expect(loanInput({ ...PAGE_R, modes: { ...PAGE_R.modes, otherLoans: 'emi' } }).alongside).toBeUndefined();
  });
});
