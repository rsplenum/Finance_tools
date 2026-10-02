/**
 * The project report page's model (site/src/report/model.ts) and its document (document.ts), on fictional case R typed
 * as text (worked by hand in tests/report.test.ts). The files are read back by readers written by others.
 */
import { describe, it, expect } from 'vitest';
import DATA from '../engine/data/report.json';
import { docText } from '../site/src/doc/doc';
import { docxOf } from '../site/src/doc/docx';
import { pdfOf } from '../site/src/doc/pdf';
import { xlsxOf } from '../site/src/doc/xlsx';
import { docStatus, fileName, reportDoc } from '../site/src/report/document';
import { EMPTY, preview, type ReportState } from '../site/src/report/model';
import { SITE_NAME } from '../site/src/site';
import { docxLines, pdfPages, workbook } from '../scripts/read-doc.mjs';

const TODAY = '2026-10-02', MADE = new Date('2026-10-02T10:00:00Z');
const R: ReportState = {
  ...EMPTY, borrower: 'firm',
  cost: { ...EMPTY.cost, building: '10 L', machinery: '20 L', furniture: '2 L', preliminary: '1 L' },
  loan: { amount: '25 L', ratePct: '10', disbursed: '2026-04', moratoriumMonths: '0', instalments: '60', repayment: 'monthly' },
  sales: '1.2 Cr', salesGrowth: '10', variablePct: '65', fixed: '18 L', fixedGrowth: '5', wcLimit: '5 L', wcRate: '11',
  doc: { name: 'Asha Packaging', activity: 'Manufacture of corrugated boxes', address: 'Plot 4, Example MIDC, Pune', lender: '', preparedBy: '' },
};
const row = (p: ReturnType<typeof preview>, table: string, label: string) => p.view!.tables.find((t) => t.id === table)!.rows.find((r) => r.label === label);

describe('the project report page', () => {
  it('asks who the borrower is first, then each missing fact; the days are assumed and listed', () => {
    const p = preview(EMPTY);
    expect(p.needs[0]).toBe('Who the borrower is: it sets the tax');
    expect(p.needs).not.toContain('Days of stock, 0 to 365');
    expect(EMPTY.days).toEqual({ stock: '30', debtors: '30', creditors: '30' });
    expect(DATA.assumptions.map((a) => a.id)).toEqual(['days', 'wcUsed', 'drawings', 'tax']);
  });
  it('case R as typed: the hand-worked first year in every table', () => {
    const p = preview(R);
    expect(p.needs).toEqual([]);
    expect(p.view!.key.map((k) => k.value)).toEqual(['Rs. 37,86,301', p.view!.key[1].value, p.view!.key[2].value]);
    expect(row(p, 'pl', 'Profit after tax')?.values[0]).toBe('11,54,407');
    expect(row(p, 'bs', 'Total liabilities')?.values[0]).toBe('55,81,804');
    expect(row(p, 'bs', 'Total assets')?.values[0]).toBe('55,81,804');
    expect(row(p, 'cf', 'Cash at the end of the year')?.values[0]).toBe('10,94,407');
    expect(row(p, 'dscr', 'DSCR (A ÷ B)')?.values[0]).toBe('2.51');
    expect(row(p, 'bep', 'Break-even, as a share of sales')?.values[0]).toBe('60.05%');
    expect(row(p, 'ratios', 'Current ratio')?.values[0]).toBe('2.39');
    expect(row(p, 'wc', 'Bank finance, second method (75% of current assets less creditors)')?.values[0]).toBe('5,79,452');
    expect(row(p, 'finance', 'Promoters’ contribution (33.97%)')?.values).toEqual(['12,86,301']);
  });
});

describe('the project report to download', () => {
  const p = preview(R), doc = reportDoc(R, p, TODAY)!, text = docText(doc), lines = text.split('\n');
  it('page 1: the business, the project at a glance, the cost and the finance, signed', () => {
    expect(lines.slice(3, 8)).toEqual([
      'Asha Packaging', 'Project report: Manufacture of corrugated boxes, 2026-27 to 2030-31', 'Address: Plot 4, Example MIDC, Pune',
      'Constitution: Partnership firm or LLP', 'Prepared on: 02-10-2026',
    ]);
    expect(lines).toContain('Cost of the project: Rs. 37,86,301');
    expect(lines).toContain('Total cost of the project | 37,86,301');
    expect(lines).toContain('For Asha Packaging');
    expect(doc.parts.map((x) => x.name)).toEqual(['Summary', 'Projections', 'DSCR and ratios', 'Annex']);
    expect(docStatus(R, p)).toBe('Complete');
    expect(fileName(R, p, 'pdf')).toBe('Project report - Asha Packaging.pdf');
  });
  it('carries no assumptions list and no jargon beyond the tables\' own names', () => {
    expect(text).not.toMatch(/assum|Tandon|Nayak|MPBF|checked/i);
  });
  it('holds no figure the page did not show or the user did not type', () => {
    const sources = [JSON.stringify(p), JSON.stringify(R), JSON.stringify(DATA), '02-10-2026', SITE_NAME].join('\n'), figures = text.match(/\d+(?:,\d+)*(?:\.\d+)?/g) ?? [];
    expect(figures.length).toBeGreaterThan(300);
    expect(figures.filter((f) => !sources.includes(f))).toEqual([]);
  });
  it('the PDF, the Excel copy and the Word copy read back the same', async () => {
    const pages = await pdfPages(pdfOf(doc, MADE));
    expect(pages[0]).toContain('Total cost of the project 37,86,301');
    expect(pages.join('\n')).toContain('Total assets 55,81,804');
    const book = await workbook(xlsxOf(doc, MADE));
    expect(book.map((x) => x.sheet)).toEqual(['Summary', 'Projections', 'DSCR and ratios', 'Annex']);
    const pat = book[1].data.find((r) => r[0] === 'Profit after tax')?.filter((c) => c !== null);
    expect((pat?.[1] as number).toFixed(2)).toBe('1154406.67');
    const { lines: word, messages } = await docxLines(docxOf(doc, MADE));
    expect(messages).toEqual([]);
    expect(word.some((l) => l.startsWith('Total assets | 55,81,804'))).toBe(true);
  });
  it('provisional while the business\'s address is missing, and said on every page', async () => {
    const s = { ...R, doc: { ...R.doc, address: '' } }, d = reportDoc(s, preview(s), TODAY)!;
    expect(docStatus(s, preview(s))).toBe('Provisional: 1 still needed');
    for (const page of await pdfPages(pdfOf(d, MADE))) expect(page.split('\n')[0]).toBe('Project report · Asha Packaging Provisional');
  });
});
