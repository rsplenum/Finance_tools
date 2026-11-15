/**
 * The companion beside the report's questions (NEW2, site/src/report/companion.ts). It works out nothing: the picture's
 * rows are the engine's DSCR table in lakh, and its tightest year must be the year the engine's own lowest-DSCR check
 * names (a second path to the same year); the reading is the checks' own figures; the outline counts needs already listed.
 */
import { describe, expect, it } from 'vitest';
import { EMPTY, preview } from '../site/src/report/model';
import { reportExample } from '../site/src/report/example';
import { chartRows, outlineOf, readingOf, type StepKey } from '../site/src/report/companion';

const none: Record<StepKey, number> = { business: 0, cost: 0, loan: 0, sales: 0, words: 0, check: 0 };

describe('the companion', () => {
  it('draws the DSCR table as bars, the tightest year the one the lowest-DSCR check names', () => {
    const s = reportExample(new Date(2026, 9, 15)), p = preview(s), rows = chartRows(p);
    const t = p.view!.tables.find((x) => x.id === 'dscr')!, a = t.rows.find((r) => r.label === 'Cash available (A)')!;
    expect(rows.length).toBeGreaterThan(2);
    rows.forEach((r) => {
      const i = t.columns.indexOf(r.label);
      expect(r.a).toBe(a.n![i]);
      expect(r.aText).toBe((a.n![i]! / 100000).toFixed(2));
    });
    const tight = rows.filter((r) => r.tight);
    expect(tight).toHaveLength(1);
    const low = p.checks!.find((c) => c.id === 'dscrLowest')!;
    expect(low.worst).toContain(`in ${tight[0].label}`);
  });

  it('reads the lowest and average DSCR as the checks give them, and waits without figures', () => {
    const s = reportExample(new Date(2026, 9, 15)), p = preview(s), r = readingOf(p, undefined);
    expect(r.figures.map((f) => f.label)).toEqual(['Lowest DSCR', 'Average DSCR']);
    expect(r.figures[0].value).toBe(p.checks!.find((c) => c.id === 'dscrLowest')!.value);
    const blank = readingOf(preview(EMPTY), undefined);
    expect(blank.figures).toEqual([]);
    expect(blank.wait).toMatch(/^The figures show/);
  });

  it('sends each section to its step, ready only once the figures are confirmed', () => {
    const s = reportExample(new Date(2026, 9, 15)), p = preview(s);
    const before = outlineOf(s, p, none, false, 'check'), after = outlineOf(s, p, none, true, 'loan');
    expect(before.find((x) => x.title === 'At a glance')!.here).toBe(true);
    expect(before.find((x) => x.title === 'Statements')).toMatchObject({ step: 'check', here: false, text: 'Check the figures', state: 'open' });
    expect(after.find((x) => x.title === 'Statements')).toMatchObject({ here: false, text: 'Ready', state: 'ready' });
    expect(after.find((x) => x.title === 'Repayment')!.here).toBe(true);
    const empty = outlineOf(EMPTY, preview(EMPTY), { ...none, cost: 2, sales: 3 }, false, 'business');
    expect(empty[0]).toMatchObject({ title: 'Cover', text: '3 facts to add', here: true });
    expect(empty.find((x) => x.title === 'Cost and finance')!.text).toBe('2 answers to give');
    expect(empty.find((x) => x.title === 'Statements')!.text).toBe('Waits on 5 answers');
  });
});
