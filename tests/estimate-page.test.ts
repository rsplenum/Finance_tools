/**
 * The estimate page's model (site/src/estimate/model.ts) and its document (document.ts), on fictional case E typed as
 * text: a house of 1,200 sq ft, worked by hand in tests/estimate.test.ts. The files are read back by readers written by
 * others (scripts/read-doc.mjs).
 */
import { describe, it, expect } from 'vitest';
import { docText } from '../site/src/doc/doc';
import { docxOf } from '../site/src/doc/docx';
import { pdfOf } from '../site/src/doc/pdf';
import { xlsxOf } from '../site/src/doc/xlsx';
import { docStatus, estimateDoc, fileName } from '../site/src/estimate/document';
import { EMPTY, preview, withHead, type EstimateState, type ItemText } from '../site/src/estimate/model';
import { SITE_NAME } from '../site/src/site';
import { docxLines, pdfPages, workbook } from '../scripts/read-doc.mjs';

const TODAY = '2026-10-02', MADE = new Date('2026-10-02T10:00:00Z');
const item = (head: string, description: string, quantity: string, unit: string, rate: string): ItemText => ({ head, description, quantity, unit, rate });
const E: EstimateState = {
  ...EMPTY, kind: 'construction', area: '1,200', basis: 'Contractor’s quotation of 25-09-2026', gst: 'included', contingency: 'add', contingencyPct: '3',
  doc: { borrower: 'Asha Traders', property: 'Plot 12, Example Nagar, Pune', lender: 'Example Bank, Pune branch', preparedBy: '' },
  items: [
    item('earthwork', 'Excavation for foundations', '45', 'cum', '350'), item('pcc', 'PCC 1:4:8 under footings', '6', 'cum', '6,200'),
    item('rcc', 'RCC M20 in footings, columns, beams and slabs', '28', 'cum', '9,500'), item('steel', 'Steel bars Fe 500', '3,200', 'kg', '78'),
    item('masonry', 'Brickwork in cement mortar 1:6', '60', 'cum', '7,800'), item('plaster', 'Cement plaster 12 mm', '520', 'sqm', '380'),
    item('flooring', 'Vitrified tiles', '1,100', 'sqft', '110'), item('joinery', 'Doors and windows, complete', '1', 'LS', '1.85 L'),
    item('painting', 'Interior and exterior painting', '1,600', 'sqm', '140'), item('plumbing', 'Water supply, drainage and fittings', '1', 'LS', '1,40,000'),
    item('electrical', 'Wiring, switches and fittings', '1', 'LS', '1,20,000'),
  ],
};

describe('the estimate page', () => {
  it('asks what the estimate is for, then each missing fact; a blank item card asks nothing', () => {
    expect(preview(EMPTY).needs).toEqual([
      'What the estimate is for: new construction, or renovation or repair', 'At least one item, with its quantity and rate',
      'GST: included in the rates, or the rate to add', 'Contingency: none, or a percentage', 'Where the rates come from (like a contractor’s quotation and its date)',
    ]);
    expect(preview({ ...E, basis: '' }).needs).toEqual(['Where the rates come from (like a contractor’s quotation and its date)']);
  });
  it('a head chosen sets its usual unit while the unit is empty', () => {
    const s = withHead({ ...EMPTY, kind: 'construction' }, 0, 'steel');
    expect(s.items[0]).toEqual({ head: 'steel', description: '', quantity: '', unit: 'kg', rate: '' });
    expect(withHead({ ...s, items: [{ ...s.items[0], unit: 'MT' }] }, 0, 'rcc').items[0].unit).toBe('MT');
  });
  it('case E as typed: each item\'s amount on its card, the abstract, the total and the cost per sq ft', () => {
    const p = preview(E);
    expect(p.needs).toEqual([]);
    expect(p.amounts[7]).toBe('1,85,000');
    expect(p.view!.totals.map((t) => [t.label, t.amount])).toEqual([
      ['Total of the works', '20,24,150'], ['Add: contingency at 3%', '60,725'], ['Total estimated cost', '20,84,875'],
    ]);
    expect(p.view!.perSqft).toBe('1,737');
  });
});

describe('the estimate to download', () => {
  const p = preview(E), doc = estimateDoc(E, p, TODAY)!, lines = docText(doc).split('\n');
  it('page 1: the borrower, the property, the rates\' basis, the abstract of cost and the total, signed', () => {
    expect(lines.slice(3, 9)).toEqual([
      'Asha Traders', 'Estimate of cost: new construction, built-up area 1,200 sq ft', 'Property: Plot 12, Example Nagar, Pune',
      'Lender: Example Bank, Pune branch', 'Prepared on: 02-10-2026', 'Rates: Contractor’s quotation of 25-09-2026',
    ]);
    expect(lines).toContain('1. Earthwork | 15,750');
    expect(lines).toContain('Total of the works | 20,24,150');
    expect(lines).toContain('Total estimated cost | 20,84,875');
    expect(lines).toContain('Cost per sq ft: Rs. 1,737 of built-up area');
    expect(docStatus(E, p)).toBe('Complete');
    expect(fileName(E, p, 'pdf')).toBe('Estimate - Asha Traders.pdf');
  });
  it('Annex 1: every item numbered under its head, with its quantity, unit, rate and amount, and each head\'s total', () => {
    expect(lines).toContain('1.1 Excavation for foundations | 45 | cum | 350 | 15,750');
    expect(lines).toContain('8.1 Doors and windows, complete | 1 | LS | 1,85,000 | 1,85,000');
    expect(lines).toContain('Total of reinforcement steel |  |  |  | 2,49,600');
  });
  it('holds no figure the page did not show or the user did not type', () => {
    const sources = [JSON.stringify(p), JSON.stringify(E), '02-10-2026', SITE_NAME].join('\n'), figures = docText(doc).match(/\d+(?:,\d+)*(?:\.\d+)?/g) ?? [];
    expect(figures.length).toBeGreaterThan(60);
    expect(figures.filter((f) => !sources.includes(f))).toEqual([]);
  });
  it('the PDF, the Excel copy and the Word copy read back the same', async () => {
    const pages = await pdfPages(pdfOf(doc, MADE));
    expect(pages[0]).toContain('Total estimated cost 20,84,875');
    expect(pages[1]).toContain('Annex 1. Detailed estimate');
    const book = await workbook(xlsxOf(doc, MADE));
    expect(book.map((x) => x.sheet)).toEqual(['Estimate', 'Detailed estimate']);
    expect(book[0].data.find((r) => r[0] === 'Total estimated cost')?.filter((c) => c !== null)).toEqual(['Total estimated cost', 2084874.5]);
    expect(book[1].data.find((r) => r[0] === '1.1 Excavation for foundations')?.filter((c) => c !== null)).toEqual(['1.1 Excavation for foundations', 45, 'cum', 350, 15750]);
    const { lines: word, messages } = await docxLines(docxOf(doc, MADE));
    expect(messages).toEqual([]);
    expect(word).toContain('Total estimated cost | 20,84,875');
    expect(word).toContain('4.1 Steel bars Fe 500 | 3,200 | kg | 78 | 2,49,600');
  });
  it('provisional while the property is missing, and said on every page', async () => {
    const s = { ...E, doc: { ...E.doc, property: '' } }, d = estimateDoc(s, preview(s), TODAY)!;
    expect(docStatus(s, preview(s))).toBe('Provisional: 1 still needed');
    for (const page of await pdfPages(pdfOf(d, MADE))) expect(page.split('\n')[0]).toBe('Estimate of cost · Asha Traders Provisional');
  });
});
