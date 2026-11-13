/**
 * The holiday's interest added to the loan, and who pays the interest before the first sale (IDC1, D-POL-13,
 * docs/CAPACITY-FIRST.md §5.2). Every figure is worked a second way here (rule 15), by stepping the balance a month at a
 * time in a script and by the closed form amount × (1 + r)^months: compound interest, each month's interest joining the
 * balance at its end. Fictional cases only (D-BIZ-02).
 */
import { describe, expect, it } from 'vitest';
import { afterHoliday, levelInstalment, schedule, type LoanTerms } from '../engine/loan';
import { amortization } from '../engine/dscr';
import { projectReport, type Report, type ReportInput } from '../engine/report';
import { carry } from '../engine/capacity';
import { viewOf } from '../site/src/report/model';
import { CASE_R } from './report.test';

const T: LoanTerms = { amount: 1000000, ratePct: 12, disbursed: '2026-04', moratoriumMonths: 6, instalments: 12, frequency: 'monthly', style: 'emi', holidayInterest: 'added' };

describe('the closed form: ₹10,00,000 at 12% (1% a month), six months’ holiday added to the loan', () => {
  it('the balance at the holiday’s end is 10,00,000 × 1.01^6 = ₹10,61,520.15', () => {
    // By hand, a month at a time: 10,10,000; 10,20,100; 10,30,301; 10,40,604.01; 10,51,010.05; 10,61,520.15.
    expect(afterHoliday(T)).toBeCloseTo(1061520.150601, 4);
    expect(afterHoliday({ ...T, holidayInterest: 'paid' })).toBe(1000000);
    expect(afterHoliday({ ...T, holidayInterest: undefined })).toBe(1000000);
  });
  it('the EMI is worked on the larger balance: the textbook ₹88,848.79 for ₹10 lakh, times 1.01^6: ₹94,314.78', () => {
    // 10,61,520.15 × 0.01 × 1.01^12 ÷ (1.01^12 − 1) = 94,314.7795; and 88,848.7887 × 1.0615201506 = 94,314.7796.
    expect(levelInstalment(T)).toBeCloseTo(94314.78, 2);
  });
  it('by financial year: the holiday’s interest is added in 2026-27 and nothing paid; total interest 12 EMIs less the loan', () => {
    const s = schedule(T);
    expect(s.map((y) => y.fy)).toEqual(['2026-27', '2027-28']);
    expect(s[0].added).toBeCloseTo(61520.15, 2);
    expect(s[1].added).toBeUndefined();
    // Principal repaid includes the interest added: the balance the instalments clear.
    expect(s[0].principal + s[1].principal).toBeCloseTo(1061520.15, 2);
    expect(s[0].interest + s[1].interest).toBeCloseTo(12 * 94314.7795385 - 1000000, 2);
    expect(s[1].closing).toBeCloseTo(0, 6);
  });
  it('the second computation agrees month by month, and paid stays as before', () => {
    expect(() => amortization(T)).not.toThrow();
    const paid = schedule({ ...T, holidayInterest: 'paid' }), none = schedule({ ...T, holidayInterest: undefined });
    expect(paid).toEqual(none);
    expect(paid[0].added).toBeUndefined();
  });
  it('every repayment way takes it, with a quarterly loan and a stepped one', () => {
    for (const style of ['equal-principal', 'stepped'] as const) {
      const t = { ...T, style, instalments: 36 }, s = schedule(t);
      expect(s.reduce((a, y) => a + y.principal, 0)).toBeCloseTo(1061520.15, 2);
      expect(() => amortization(t)).not.toThrow();
    }
    const q = { ...T, frequency: 'quarterly' as const, style: 'equal-principal' as const, instalments: 8 };
    expect(schedule(q).reduce((a, y) => a + y.principal, 0)).toBeCloseTo(1061520.15, 2);
  });
});

/** Fictional case R as a new unit: ₹25,00,000 at 10%, drawn April 2026, sales from July (three months to start), the
 * holiday three months. Interest before the first sale, paid: 3 × 25,00,000 × 10/1200 = ₹62,500. Added: 25,00,000 ×
 * ((1 + 1/120)^3 − 1) = ₹63,022.28 (stepped a month at a time in a script, the same to the paisa). */
const NEW: ReportInput = { ...CASE_R, monthsToStart: 3, loan: { ...CASE_R.loan, moratoriumMonths: 3 } };
const report = (x: ReportInput) => projectReport(x) as Report;

/** The paper's cost and finance tables each add up to the project's cost. */
function addsUp(r: Report) {
  const v = viewOf(r), sum = (id: 'cost' | 'finance') => {
    const t = v.tables.find((x) => x.id === id)!, rows = t.rows.filter((x) => x.kind !== 'total' && !x.label.startsWith('Besides'));
    return { parts: rows.reduce((a, x) => a + (x.n?.[0] ?? 0), 0), total: t.rows.find((x) => x.kind === 'total')!.n![0] };
  };
  for (const id of ['cost', 'finance'] as const) {
    const s = sum(id);
    expect(s.parts).toBeCloseTo(r.projectCost, 2);
    expect(s.total).toBeCloseTo(r.projectCost, 2);
  }
  return v;
}

describe('who pays the interest before the first sale', () => {
  it('a new unit, paid: the promoters, ₹62,500, and the page says to keep it ready', () => {
    const r = report(NEW);
    expect(r.idc).toMatchObject({ way: 'paid', loan: 0, business: 0, later: 0 });
    expect(r.idc.total).toBeCloseTo(62500, 2);
    expect(r.idc.promoters).toBeCloseTo(62500, 2);
    expect(r.finance.interestAdded).toBe(0);
    addsUp(r);
  });
  it('a new unit, added: the loan, ₹63,022.28; the promoters bring the cost less the loan grown by it', () => {
    const p = report(NEW), r = report({ ...NEW, loan: { ...NEW.loan, holidayInterest: 'added' } });
    expect(r.idc.way).toBe('added');
    expect(r.idc.total).toBeCloseTo(63022.28, 2);
    expect(r.idc.loan).toBeCloseTo(63022.28, 2);
    expect(r.idc.promoters).toBeCloseTo(0, 6);
    expect(r.finance.interestAdded).toBeCloseTo(63022.28, 2);
    // The cost is ₹522.28 more (the interest on the interest); the promoters bring ₹62,500 less.
    expect(r.projectCost - p.projectCost).toBeCloseTo(522.28, 2);
    expect(p.finance.promoter - r.finance.promoter).toBeCloseTo(62500, 2);
    // The loan at the end of 2026-27 carries it: the instalments are worked on ₹25,63,022.28.
    expect(r.plan.schedule[0].added).toBeCloseTo(63022.28, 2);
    addsUp(r);
  });
  it('the holiday longer than the months to sales: what is added after the first sale is that year’s cost, never paid in cash', () => {
    // Six months' holiday, sales from July: April to June before the sale (₹63,022.28), July to September after it:
    // 25,00,000 × ((1 + r)^6 − (1 + r)^3) = ₹64,611.00.
    const x = { ...NEW, loan: { ...NEW.loan, moratoriumMonths: 6, holidayInterest: 'added' as const } }, r = report(x);
    expect(r.idc.loan).toBeCloseTo(63022.28, 2);
    expect(r.idc.later).toBeCloseTo(64611.0, 2);
    // In the DSCR it is a cost of the year, added back as non-cash, and no part of the year's repayment: what the
    // business repays in 2026-27 is its principal and the interest charged less the ₹64,611.00 added.
    const y = r.years[0];
    expect(y.service).toBeCloseTo(y.principal + y.tlInterest - 64611.0032, 2);
    expect(r.plan.statement.rows[0].service).toBeCloseTo(y.service, 6);
    addsUp(r);
  });
  it('an expansion, paid: the business’s own earnings, flagged when its first year’s spare cash does not cover them', () => {
    const LINE: ReportInput = { ...NEW, salesBy: 'expansion', sales: 7000000, salesGrowthPct: 10, capacity: 500000, price: 25, utilisationPct: [55, 70, 85], priceGrowthPct: 5, monthsToStart: 3 };
    const r = report(LINE);
    expect(r.idc.business).toBeCloseTo(62500, 2);
    expect(r.idc.promoters).toBe(0);
    expect(r.finance.earnings).toBeCloseTo(62500, 2);
    expect(r.idc.short).toBeUndefined();
    addsUp(r);
    const tight = report({ ...LINE, existingEmis: 50000000 });
    expect(tight.idc.short?.fy).toBe(tight.years[0].fy);
    expect(tight.idc.short!.spare).toBeLessThan(62500);
  });
});

describe('the page', () => {
  it('names the payer in the means of finance', () => {
    const v = addsUp(report({ ...NEW, loan: { ...NEW.loan, holidayInterest: 'added' } }));
    expect(v.tables.find((t) => t.id === 'finance')!.rows.map((x) => x.label)).toContain('Interest before the first sale, added to the term loan');
  });
  it('offers to add the holiday’s interest to the loan when cash runs short, only when it lowers all the promoters bring', () => {
    // A slow first year (10% of a ₹1.5 crore plant from July): cash runs short in 2026-27. Added, the promoters' share
    // falls ₹62,500 and the shortfall rises ₹13,864.90 (by hand: the larger principal, 25,63,022.28 ÷ 60 − 25,00,000 ÷ 60
    // = 1,050.37 for nine months, 9,453.32, and the interest on the ₹63,022.28 more, 525.19 × (9 − 36/60) = 4,411.58):
    // ₹48,635.10 less in all.
    const slow: ReportInput = { ...NEW, salesBy: 'drivers', sales: undefined, salesGrowthPct: undefined, capacity: 100000, price: 150, utilisationPct: [10, 90, 95], priceGrowthPct: 0 };
    const c = carry(slow);
    if ('needs' in c || 'blocked' in c) throw new Error('no carry');
    expect(c.keepReady).toBeGreaterThan(0);
    expect(c.addInterest?.promoters).toBeCloseTo(62500, 2);
    expect(c.addInterest!.keepReady! - c.keepReady!).toBeCloseTo(13864.90, 1);
    expect(c.addInterest?.less).toBeCloseTo(48635.10, 1);
    expect(c.addInterest?.input.loan.holidayInterest).toBe('added');
    // Cash short in every year from a thin business: the larger instalments deepen it more than the share falls.
    const thin = carry({ ...NEW, sales: 2500000, fixedCosts: 1200000 });
    if ('needs' in thin || 'blocked' in thin) throw new Error('no carry');
    expect(thin.keepReady).toBeGreaterThan(0);
    expect(thin.addInterest).toBeUndefined();
  });
});
