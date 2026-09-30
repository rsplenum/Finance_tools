/**
 * The DSCR statement to download (site/src/dscr/document.ts), tested on its text: the document as built, the PDF as
 * pdf.js reads it back, and the Excel copy as read-excel-file reads it back (scripts/read-doc.mjs). Figures: fictional
 * cases A and A′ (docs/GOLDEN-CASES.md), worked by hand in tests/dscr.test.ts and tests/dscr-page.test.ts; model-worked
 * until the owner confirms them.
 */
import { describe, it, expect } from 'vitest';
import DSCR from '../engine/data/dscr.json';
import DEFAULTS from '../engine/data/defaults.json';
import { docText, type Doc } from '../site/src/doc/doc';
import { pdfOf, printable } from '../site/src/doc/pdf';
import { crc32, xlsxOf } from '../site/src/doc/xlsx';
import { docNeeds, docStatus, fileName, statementDoc } from '../site/src/dscr/document';
import { ASSUMED, START, preview, tidyAmount, type State } from '../site/src/dscr/model';
import { SITE_NAME } from '../site/src/site';
import { pdfPages, workbook } from '../scripts/read-doc.mjs';

const TODAY = '2026-09-30', MADE = new Date('2026-09-30T10:00:00Z');
const FACTS = { borrower: 'Asha Traders', lender: 'Example Bank, Pune branch', preparedBy: '' };
const LOAN_A = { amount: '12 L', ratePct: '12', disbursed: '2026-04', moratoriumMonths: '6', instalments: '12', repayment: 'quarterly' } as const;

// Fictional case A′, the owner's quick path: case A's loan and this year's figures; the rest as assumed. Worked by hand
// in tests/dscr-page.test.ts: cash available 4,00,392, 4,22,624, 4,45,488, 4,73,072 against debt service 3,41,000,
// 5,02,000, 4,54,000, 2,09,000; DSCR 1.17, 0.84, 0.98, 2.26; average 1.16, lowest 0.84 in 2027-28.
const A2: State = {
  ...ASSUMED, loan: { ...LOAN_A }, doc: FACTS,
  cells: { ...ASSUMED.cells, pbdit: ['5,00,000'], depreciation: ['1,50,000'], interestOther: ['50,000'] },
  rates: { pbdit: '10' },
};
// Fictional case A as a CA's projection (tests/dscr-page.test.ts), with no target and nothing typed for the document.
const CASE_A: State = {
  ...START, source: 'plan', method: 'common', loan: { ...LOAN_A },
  cells: { pbdit: ['5,00,000', '7,50,000', '8,00,000', '8,00,000'], depreciation: ['1,50,000', '1,30,000', '1,10,000', '1,00,000'], interestOther: ['50,000'], taxPct: ['25'] },
  modes: { pbdit: 'years', depreciation: 'years', nonCash: 'none', otherLoans: 'none', interestOther: 'same', taxPct: 'same' },
};

const build = (s: State) => {
  const p = preview(s), doc = statementDoc(s, p, TODAY);
  if (!doc) throw new Error('no document');
  return { p, doc, text: docText(doc), lines: docText(doc).split('\n') };
};

describe('what the document asks that the page does not', () => {
  it('the borrower\'s name and the lender, each once; who prepared it only if wanted', () => {
    expect(docNeeds({ borrower: '', lender: ' ', preparedBy: '' })).toEqual(["The borrower's name", 'The lender']);
    expect(docNeeds(FACTS)).toEqual([]);
    expect(docNeeds({ ...FACTS, preparedBy: 'R. Iyer & Co.' })).toEqual([]);
  });
  it('asks for English letters where the PDF could not print the name as typed', () => {
    expect(printable('Müller & Söhne (Pune) – 2nd unit')).toBe(true);
    expect(printable('श्री गणेश ट्रेडर्स')).toBe(false);
    expect(docNeeds({ ...FACTS, borrower: 'श्री गणेश ट्रेडर्स' })).toEqual(["The borrower's name, in English letters"]);
  });
  it('names the file after the borrower, and says provisional while anything is missing', () => {
    expect(fileName(A2, preview(A2), 'pdf')).toBe('DSCR statement - Asha Traders.pdf');
    expect(fileName({ ...A2, doc: { ...FACTS, borrower: ' A/B: Traders ' } }, preview(A2), 'xlsx')).toBe('DSCR statement - A B Traders.xlsx');
    expect(fileName(CASE_A, preview(CASE_A), 'pdf')).toBe('DSCR statement (provisional).pdf');
  });
  it('makes no document until the statement shows figures', () => {
    expect(statementDoc(ASSUMED, preview(ASSUMED), TODAY)).toBeUndefined();
  });
});

describe('fictional case A′, complete: the statement for the lender', () => {
  const { p, doc, text, lines } = build(A2);
  it('heads it with the borrower, the lender, the date and the status', () => {
    expect(lines.slice(3, 10)).toEqual([
      'DSCR statement', 'Debt service coverage ratio, 2026-27 to 2029-30',
      'Borrower: Asha Traders', 'Lender: Example Bank, Pune branch', 'Prepared on: 30-09-2026', 'Status: Complete, on 8 assumptions', 'The result',
    ]);
    expect(doc.header).toBe('DSCR statement · Asha Traders');
    expect(doc.mark).toBeUndefined();
    expect(text).not.toMatch(/provisional|still needed/i);
  });
  it('gives the average, the lowest year, the target and what limits the result', () => {
    expect(lines.slice(10, 16)).toEqual([
      'Average DSCR: 1.16', 'Lowest year: 0.84 in 2027-28', "The lender's target: Average 1.50, lowest year 1.20",
      'Below the target: the lowest year, 2027-28, is 0.84 against 1.20; the average is 1.16 against 1.50.',
      p.largest?.text, p.fewest?.text,
    ]);
    expect(p.largest?.text).toMatch(/limited by the lowest year, 2027-28\.$/);
  });
  it('shows the year-wise statement as the page does', () => {
    expect(text).toContain('Rupees | 2026-27 | 2027-28 | 2028-29 | 2029-30');
    expect(text).toContain('Cash available (A) | 4,00,392 | 4,22,624 | 4,45,488 | 4,73,072');
    expect(text).toContain('Debt service (B) | 3,41,000 | 5,02,000 | 4,54,000 | 2,09,000');
    expect(text).toContain('DSCR (A ÷ B) | 1.17 | 0.84 | 0.98 | 2.26');
    for (const l of p.statement!.lines) expect(text).toContain(l.kind === 'head' ? l.label : [l.label, ...l.values].join(' | '));
  });
  it('states the method in plain words, with its source', () => {
    expect(text).toContain('Common term-loan DSCR (not yet checked against a published source).');
    expect(lines).toContain('Cash available (A) = profit after tax + depreciation + other non-cash charges (amortisation, amounts written off) + interest on term loans.');
    expect(lines).toContain('Debt service (B) = term-loan instalments (principal) + interest on term loans.');
    expect(lines).toContain('Years counted: years with a term-loan instalment.');
    expect(lines).toContain('The average: total cash available ÷ total debt service. The lowest year is the lowest DSCR among the years counted.');
    for (const rule of DSCR.planning.rules) expect(lines).toContain(rule);
  });
  it('lists the facts entered once, and every assumption still in use with its reason', () => {
    expect(lines).toContain('Amount: Rs. 12,00,000');
    expect(lines).toContain('Repaid: Equal principal every quarter');
    expect(lines).toContain('Instalments: 12 quarterly');
    expect(lines).toContain('Each instalment: Principal Rs. 1,00,000 a quarter, and interest on the balance every month.');
    expect(lines).toContain('Profit before interest, depreciation and tax: Rs. 5,00,000 in 2026-27; sales growth 10% a year');
    expect(lines).toContain('Depreciation: Rs. 1,50,000 in 2026-27');
    // The tax rate and the lines answered None are the assumptions', so they are listed there, not as entered.
    expect(text).not.toMatch(/^Tax rate \(%\):/m);
    expect(p.assumed).toHaveLength(8);
    for (const a of p.assumed) expect(lines).toContain(`${a.what}: ${a.shown}. ${a.why}.`);
  });
  it('adds the repayment schedule by year and by month', () => {
    expect(doc.parts.map((x) => x.name)).toEqual(['Statement', 'Repayment schedule']);
    expect(text).toContain('2026-27 | 1,41,000 | 2,00,000 | 10,00,000');
    // December 2026, by hand: interest 1% of 12,00,000 = 12,000; the first quarterly instalment of 1,00,000.
    expect(text).toContain('Dec 2026 | 1 | 12,00,000 | 12,000 | 1,00,000 | 1,12,000 | 11,00,000');
  });
  it('holds no figure the page did not already show or the user did not type (none is computed for the document)', () => {
    const s = A2, sources = [JSON.stringify(p), JSON.stringify(s), JSON.stringify(DSCR), JSON.stringify(DEFAULTS), tidyAmount(s.loan.amount),
      ...Object.values(s.cells).flat().map(tidyAmount), '30-09-2026', SITE_NAME].join('\n');
    const figures = text.match(/\d+(?:,\d+)*(?:\.\d+)?/g) ?? [];
    expect(figures.length).toBeGreaterThan(300);
    expect(figures.filter((f) => !sources.includes(f))).toEqual([]);
  });
  it('prints every character in the PDF', () => {
    expect(lines.filter((l) => !printable(l))).toEqual([]);
  });
});

describe('the PDF, read back by pdf.js', () => {
  it('fictional case A′: the statement and the result on the first page, the schedule after', async () => {
    const { p, doc } = build(A2), pages = await pdfPages(pdfOf(doc, MADE));
    expect(pages.length).toBeGreaterThanOrEqual(3);
    const first = pages[0].split('\n');
    expect(first.slice(0, 5)).toEqual(['DSCR statement · Asha Traders', 'DSCR statement', 'Debt service coverage ratio, 2026-27 to 2029-30', 'Borrower Asha Traders', 'Lender Example Bank, Pune branch']);
    expect(first).toContain('Average DSCR 1.16');
    expect(first).toContain('Lowest year 0.84 in 2027-28');
    expect(first).toContain('Below the target: the lowest year, 2027-28, is 0.84 against 1.20; the average is 1.16 against 1.50.');
    expect(first).toContain('Cash available (A) 4,00,392 4,22,624 4,45,488 4,73,072');
    expect(first).toContain('DSCR (A ÷ B) 1.17 0.84 0.98 2.26');
    // Every figure of the statement, on the first page, in the order the page shows it.
    for (const l of p.statement!.lines) if (l.values.length) expect(first.some((x) => x.endsWith(l.values.join(' ')))).toBe(true);
    pages.forEach((page, i) => expect(page).toMatch(new RegExp(`Page ${i + 1} of ${pages.length}$`)));
    const all = pages.join('\n');
    expect(all).toContain('Dec 2026 1 12,00,000 12,000 1,00,000 1,12,000 11,00,000');
    expect(all).toContain('Sep 2029 12 1,00,000 1,000 1,00,000 1,01,000 0');
    expect(all).not.toContain('Provisional');
  });
  it('fictional case A, provisional: marked on every page, with what is still needed', async () => {
    const { doc, lines } = build(CASE_A);
    expect(lines).toContain('Status: Provisional: 3 still needed');
    expect(lines).toContain('Borrower: Still needed');
    expect(lines).toContain("The lender's target: Still needed");
    const box = lines.indexOf('Provisional: 3 still needed');
    expect(lines.slice(box + 1, box + 4)).toEqual(['A target DSCR for the average, the lowest year, or both', "The borrower's name", 'The lender']);
    expect(docStatus(CASE_A, preview(CASE_A))).toBe('Provisional: 3 still needed');
    const pages = await pdfPages(pdfOf(doc, MADE));
    for (const page of pages) expect(page.split('\n')[0]).toBe('DSCR statement Provisional');
    expect(pages[0]).toContain('• A target DSCR for the average, the lowest year, or both');
    // Case A by hand (tests/dscr.test.ts): cash available 4,10,250 and 5,83,000 against 3,41,000 and 5,02,000 in the
    // first two years; DSCR 1.2031, 1.1614, 1.3293 and 2.8218; average 1.45, lowest 1.16 in 2027-28.
    expect(pages[0]).toContain('Cash available (A) 4,10,250 5,83,000 6,03,500 5,89,750');
    expect(pages[0]).toContain('DSCR (A ÷ B) 1.20 1.16 1.33 2.82');
    expect(pages[0]).toContain('Average DSCR 1.45');
  });
  it('a long loan: the year columns split into tables that fit the page, every year kept', async () => {
    const s: State = { ...A2, loan: { amount: '50 L', ratePct: '10', disbursed: '2027-04', moratoriumMonths: '0', instalments: '144', repayment: 'emi' } };
    const { p, doc } = build(s), years = p.statement!.years;
    expect(years).toHaveLength(12);
    const text = (await pdfPages(pdfOf(doc, MADE))).join('\n').split('\n');
    const dscr = text.filter((l) => l.startsWith('DSCR (A ÷ B) ')).map((l) => l.slice('DSCR (A ÷ B) '.length).split(' '));
    expect(dscr.length).toBeGreaterThan(1);
    expect(dscr.flat()).toEqual(p.statement!.lines.find((l) => l.id === 'dscr')!.values);
  });
});

describe('the Excel copy, read back by read-excel-file', () => {
  it('fictional case A′: the engine\'s figures as numbers, the schedule on its own sheet', async () => {
    const { p, doc } = build(A2), book = await workbook(xlsxOf(doc, MADE));
    expect(book.map((x) => x.sheet)).toEqual(['Statement', 'Repayment schedule']);
    const rows = book[0].data, row = (label: string) => rows.find((r) => r[0] === label)?.filter((c) => c !== null);
    expect(row('Borrower')).toEqual(['Borrower', 'Asha Traders']);
    expect(row('Status')).toEqual(['Status', 'Complete, on 8 assumptions']);
    expect(row('Rupees')).toEqual(['Rupees', '2026-27', '2027-28', '2028-29', '2029-30']);
    expect(row('Cash available (A)')).toEqual(['Cash available (A)', 400392, 422624, 445488, 473072]);
    expect(row('Debt service (B)')).toEqual(['Debt service (B)', 341000, 502000, 454000, 209000]);
    // The DSCR as the engine gave it, not rounded: 4,00,392 ÷ 3,41,000 and so on.
    expect(row('DSCR (A ÷ B)')).toEqual(['DSCR (A ÷ B)', 400392 / 341000, 422624 / 502000, 445488 / 454000, 473072 / 209000]);
    for (const l of p.statement!.lines) if (l.n) expect(row(l.label)?.slice(1)).toEqual(l.n);
    expect(rows.flat()).toContain('Each cell holds the exact figure worked out on the page, shown in whole rupees; there are no formulas.');
    const months = book[1].data;
    expect(months.find((r) => r[0] === 'Dec 2026')).toEqual(['Dec 2026', 1, 1200000, 12000, 100000, 112000, 1100000]);
    expect(months.filter((r) => /^[A-Z][a-z]{2} \d{4}$/.test(String(r[0])))).toHaveLength(42);
  });
  it('own yearly figures: one sheet, the figures as entered, the years not counted said once', async () => {
    const OWN: State = {
      ...START, source: 'own', method: 'common', firstYear: '2026-27', yearCount: '3', doc: FACTS,
      cells: { pat: ['60,000', '80,000', '1,00,000'], depreciation: ['40,000', '40,000', '40,000'], interestTL: ['50,000', '40,000', '20,000'], principalTL: ['0', '1,00,000', '1,00,000'] },
      modes: { nonCash: 'none' }, target: { average: '1.5', minimum: '' },
    };
    const { doc, lines } = build(OWN);
    expect(lines).toContain('Years: 2026-27 to 2028-29');
    expect(lines).toContain('Profit after tax: 2026-27: Rs. 60,000; 2027-28: Rs. 80,000; 2028-29: Rs. 1,00,000');
    expect(lines).toContain('Other non-cash charges (amortisation, amounts written off): None');
    expect(lines).toContain('Not counted: 2026-27 (no term-loan instalment).');
    expect(lines).toContain("The lender's target: Average 1.50");
    expect(lines).not.toContain('The loan');
    const book = await workbook(xlsxOf(doc, MADE));
    expect(book.map((x) => x.sheet)).toEqual(['Statement']);
    expect(book[0].data.find((r) => r[0] === 'Cash available (A)')?.filter((c) => c !== null)).toEqual(['Cash available (A)', 150000, 160000, 160000]);
  });
  it('a stored zip that any reader opens: the checksum is the standard one', () => {
    expect(crc32(new TextEncoder().encode('123456789')).toString(16)).toBe('cbf43926');
  });
});

describe('one document, two files', () => {
  it('the PDF and the Excel copy carry the same words', async () => {
    const { doc } = build(A2), pdf = (await pdfPages(pdfOf(doc, MADE))).join('\n');
    const cells = (await workbook(xlsxOf(doc, MADE))).flatMap((x) => x.data.flat()).filter((c): c is string => typeof c === 'string');
    for (const t of ['Asha Traders', 'Example Bank, Pune branch', 'Complete, on 8 assumptions', 'Common term-loan DSCR (not yet checked against a published source).'])
      expect([pdf.includes(t), cells.some((c) => c.includes(t))]).toEqual([true, true]);
    const doc2: Doc = { ...doc, parts: doc.parts.slice(0, 1) };
    expect((await pdfPages(pdfOf(doc2, MADE))).join('\n')).not.toContain('Repayment schedule');
  });
});
