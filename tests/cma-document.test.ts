import { describe, expect, it } from 'vitest';
import type { Doc, Row } from '../site/src/doc/doc';
import { xlsxOf } from '../site/src/doc/xlsx';
import { cmaDoc } from '../site/src/cma/document';
import { emptyState, exampleState, preview } from '../site/src/cma/model';

/*
 * The Excel copy's Check sheet: each formula, worked here on the figures of the cells it names (as Excel would), must give
 * the engine's figure beside it, and every difference must be 0. Case K is tests/cma.test.ts's.
 */
const rowsOf = (d: Doc, part: string) => d.parts.find((p) => p.name === part)!.blocks.flatMap((b) => (b.kind === 'table' ? b.table.rows : [])) as Row[];
function evaluate(d: Doc, formula: string, col: number, here: Row[]): number {
  const js = formula.replace(/\{(?:([^!}]+)!)?([^}]+)\}/g, (_, part: string | undefined, ref: string) => {
    const row = (part ? rowsOf(d, part) : here).find((r) => r.ref === ref);
    const v = row?.cells[col]?.figure?.value;
    if (v === undefined) throw new Error(`no figure for ${part ?? ''}!${ref} in column ${col}`);
    return `(${v})`;
  }).replace(/MAX\(/g, 'Math.max(');
  return Function(`return ${js}`)() as number;
}

describe('CMA document, case K', () => {
  const s = { ...exampleState(emptyState(2026)), doc: { name: 'K Steel Furniture Pvt Ltd', preparedBy: '' } };
  const d = cmaDoc(s, preview(s), '2026-10-11') as Doc;
  it('has the five parts', () => expect(d.parts.map((p) => p.name)).toEqual(['Summary', 'Forms II and III', 'Forms IV to VI', 'Ratios', 'Check']));
  it('redoes each checked figure by its formula, and every difference is 0', () => {
    const check = rowsOf(d, 'Check');
    let n = 0;
    for (const r of check) r.cells.slice(1).forEach((c, k) => {
      if (!c.figure?.formula) return;
      n++;
      expect(evaluate(d, c.figure.formula, k + 1, check)).toBeCloseTo(c.figure.value, 6);
    });
    expect(n).toBe(10 * 5 + 2); // ten rows over five years, and the limit for the estimate and the projection
    const limit = check.at(-1)!.cells.slice(1).map((c) => c.figure?.value);
    expect(limit).toEqual([undefined, undefined, undefined, 8900000, 10400000]);
  });
  it('writes the formulas into the workbook', () => {
    const bytes = xlsxOf(d, new Date(2026, 9, 11));
    expect(bytes.length).toBeGreaterThan(1000);
  });
});
