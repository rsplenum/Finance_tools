/**
 * What if (Rahul's note on the check page, 15-11-2026): each case's DSCRs worked a second way, from the worked example
 * retyped by hand with the case's figures (the prices, the costs, the rates typed as a borrower would), through the page's
 * own model, and compared to the engine's moved run. The case levels are engine/data/report.json's `whatIf`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WHAT_IF, whatIf } from '../engine/what-if';
import { inputOf, limitOf, preview, type ReportState } from '../site/src/report/model';
import { reportExample } from '../site/src/report/example';
import { projectReport } from '../engine/report';

const lowestOf = (s: ReportState) => { const r = projectReport(inputOf(s)); if ('needs' in r || 'blocked' in r) throw new Error('not worked'); return r; };

describe('what if', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-15T12:00:00')); });
  afterEach(() => { vi.useRealTimers(); });

  it('reads the cases from the dated data file', () => {
    expect(WHAT_IF.date).toBe('2026-11-15');
    expect(WHAT_IF.cases.map((c) => c.id)).toEqual(['sales', 'costs', 'rate', 'all']);
  });

  it('each case equals the example retyped by hand with its figures', () => {
    const s = reportExample(), rows = whatIf(inputOf(s)) ?? [];
    expect(rows).toHaveLength(4);
    // The example: two products at ₹220 a kg, variable costs 68% of sales, fixed ₹1,00,000 a month, the term loan at 10%
    // and the limit's rate left blank, which simple mode takes as the term loan's (stated on the page).
    expect(s.products.map((p) => p.price)).toEqual(['220', '220']);
    expect([s.variablePct, s.fixedMonth, s.loan.ratePct, s.wcRate]).toEqual(['68', '1 L', '10', '']);
    expect(inputOf({ ...s, loan: { ...s.loan, ratePct: '11' } }).wcRatePct).toBe(11);
    // The limit asked for stays as asked under every case (the facilities stand; the business does worse), so the hand
    // retype types it, where the example works it out from the sales.
    const limit = limitOf(s) as number;
    expect(Math.round(limit)).toBe(3_77_556);
    const h: ReportState = { ...s, wcBy: 'typed', wcLimit: String(limit) };
    expect(inputOf(h).wcLimit).toBe(limit);
    const sales: ReportState = { ...h, products: s.products.map((p) => ({ ...p, price: '198' })) }; // 220 less 10%
    const costs: ReportState = { ...h, variablePct: '74.8', fixedMonth: '1,10,000' }; // 68 and 1,00,000 up 10%
    const rate: ReportState = { ...h, loan: { ...s.loan, ratePct: '11' } };
    const all: ReportState = { ...sales, variablePct: '74.8', fixedMonth: '1,10,000', loan: { ...s.loan, ratePct: '11' } };
    for (const [id, t] of [['sales', sales], ['costs', costs], ['rate', rate], ['all', all]] as const) {
      const r = lowestOf(t), row = rows.find((x) => x.id === id);
      expect(row?.lowest, id).toBeCloseTo(r.lowest?.dscr as number, 9);
      expect(row?.average, id).toBeCloseTo(r.average as number, 9);
      expect(row?.lowestFy, id).toBe(r.lowest?.fy);
    }
  });

  it('each case lowers both DSCRs from the example as typed, and all three lower them most', () => {
    const s = reportExample(), r0 = lowestOf(s), rows = whatIf(inputOf(s)) ?? [];
    for (const row of rows) {
      expect(row.lowest as number).toBeLessThan(r0.lowest?.dscr as number);
      expect(row.average as number).toBeLessThan(r0.average as number);
    }
    const all = rows.find((x) => x.id === 'all') as (typeof rows)[number];
    for (const row of rows) expect(all.lowest as number).toBeLessThanOrEqual(row.lowest as number);
  });

  it('is undefined while the report cannot be worked', () => {
    expect(whatIf(inputOf({ ...reportExample(), variablePct: '' }))).toBeUndefined();
    expect(preview({ ...reportExample(), variablePct: '' }).needs.length).toBeGreaterThan(0);
  });
});
