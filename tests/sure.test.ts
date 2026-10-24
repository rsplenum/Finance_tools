import { describe, expect, it } from 'vitest';
import { leastSure, sureText, unmarked } from '../engine/sure';

// TRUST1 (D-DATA-25): every value in engine/data/ is marked, so this fails a file or a sourced block without its mark.
declare global { interface ImportMeta { glob: (p: string, o: { eager: true; import: 'default' }) => Record<string, unknown> } }
const files = import.meta.glob('../engine/data/*.json', { eager: true, import: 'default' });

describe('how sure each figure is', () => {
  it('marks every data file and every block with a source', () => {
    expect(Object.keys(files).length).toBeGreaterThan(10);
    expect(Object.entries(files).flatMap(([f, d]) => unmarked(f.replace('../engine/data/', ''), d))).toEqual([]);
  });
  it('fails a block without its mark, the old flag, and verified without its day', () => {
    expect(unmarked('x.json', { sure: 'review', a: { source: 's' }, b: { source: 's', sure: 'verified' }, c: { source: 's', sure: 'illustrative', verified: false } }))
      .toEqual(['x.json.a: no mark', 'x.json.b: verified without the day it was read', 'x.json.c: the old flag, in place of a mark']);
  });
  it('says the least sure of several, and the day a verified page was read', () => {
    expect(sureText({ sure: 'verified', read: '2026-10-20' })).toBe('Verified at its source on 20-10-2026');
    expect(leastSure([{ sure: 'verified', read: '2026-10-21' }, { sure: 'verified', read: '2026-10-20' }])).toEqual({ sure: 'verified', read: '2026-10-20' });
    expect(leastSure([{ sure: 'verified', read: '2026-10-21' }, { sure: 'illustrative' }]).sure).toBe('illustrative');
  });
});
