import { describe, expect, it } from 'vitest';
import type { Doc, Row } from '../site/src/doc/doc';
import { xlsxOf } from '../site/src/doc/xlsx';
import { cmaDoc, docStatus } from '../site/src/cma/document';
import { emptyState, exampleState, preview } from '../site/src/cma/model';
import { formulaParts, workbook } from '../scripts/read-doc.mjs';

/*
 * The CMA document, case K (tests/cma.test.ts's): the PDF's parts are the Excel copy's sheets, and the Excel copy holds
 * the engine's figures as numbers, never a formula (D-DOC-21).
 */
const rowsOf = (d: Doc, part: string) => d.parts.find((p) => p.name === part)!.blocks.flatMap((b) => (b.kind === 'table' ? b.table.rows : [])) as Row[];

describe('CMA document, case K', () => {
  const s = { ...exampleState(emptyState(2026)), doc: { name: 'K Steel Furniture Pvt Ltd', preparedBy: '' } };
  const d = cmaDoc(s, preview(s), '2026-10-11') as Doc;
  it('beside the download: complete with the name; without it, the figures complete and the name still needed (review finding 14)', () => {
    expect(docStatus(s, preview(s))).toBe('All questions answered');
    const t = { ...s, doc: { ...s.doc, name: '' } };
    expect(docStatus(t, preview(t))).toBe('1 question left, for the document');
  });
  it('has the four parts, and no Check sheet', () => expect(d.parts.map((p) => p.name)).toEqual(['Summary', 'Forms II and III', 'Forms IV to VI', 'Ratios']));
  it('gives the limit by the turnover method for the estimate and the projection (Form V)', () => {
    const limit = rowsOf(d, 'Forms IV to VI').find((r) => r.cells[0].text === 'The limit: the lower of the two')!;
    expect(limit.cells.slice(1).map((c) => c.figure?.value)).toEqual([8900000, 10400000]);
  });
  it('writes a workbook of the same sheets, every figure a number and not one formula', async () => {
    const bytes = xlsxOf(d, new Date(2026, 9, 11));
    expect((await workbook(bytes)).map((x) => x.sheet)).toEqual(['Summary', 'Forms II and III', 'Forms IV to VI', 'Ratios']);
    expect(await formulaParts(bytes)).toEqual([]);
  });
});
