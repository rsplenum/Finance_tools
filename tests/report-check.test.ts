/**
 * The check page's summary (site/src/report/check.ts, D-UX-372): each figure changes where it sits, and what it changes
 * is worked by the engine, never here. Worked by hand on the fictional worked example: its machinery and its total cost
 * are read from the summary; typing 25,00,000 for the machinery moves the total by 25,00,000 less the machinery it had,
 * and nothing else in the cost.
 */
import { describe, expect, it } from 'vitest';
import { preview } from '../site/src/report/model';
import { reportExample } from '../site/src/report/example';
import { summaryOf } from '../site/src/report/check';

const rupees = (t: string) => Number(t.replace(/[^\d.]/g, ''));
const today = new Date('2026-11-15T12:00:00+05:30');

describe('the check page summary', () => {
  const s = reportExample(today), p = preview(s), sum = summaryOf(s, p);
  const cost = sum.find((g) => g.id === 'cost')!;

  it('gives every typed cost head a box, and the total none', () => {
    const mach = cost.lines.find((l) => l.id === 'cost-machinery')!;
    expect(mach.edit?.boxes?.[0]?.key).toBe('cost-machinery');
    const total = cost.lines.find((l) => l.total)!;
    expect(total.worked).toBe(true);
    expect(total.edit).toBeUndefined();
  });

  it('moves the total by the change in the machinery, as typed in place', () => {
    const before = cost.lines.find((l) => l.total)!, mach = cost.lines.find((l) => l.id === 'cost-machinery')!;
    const s2 = mach.edit!.boxes![0]!.set(s, '2500000');
    const after = summaryOf(s2, preview(s2)).find((g) => g.id === 'cost')!;
    expect(rupees(after.lines.find((l) => l.id === 'cost-machinery')!.value)).toBe(2500000);
    expect(rupees(after.lines.find((l) => l.total)!.value)).toBe(rupees(before.value) + 2500000 - rupees(mach.value));
  });

  it('changes the scheme from its chips and leaves the rest as it was', () => {
    const scheme = sum.find((g) => g.id === 'business')!.lines.find((l) => l.id === 'scheme')!;
    const s2 = scheme.edit!.pick!.set(s, 'mudra');
    expect(s2.scheme).toBe('mudra');
    expect({ ...s2, scheme: s.scheme }).toEqual(s);
  });
});
