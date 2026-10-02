/**
 * The DSCR statement to download (site/src/dscr/document.ts), tested on its text: the document as built, the PDF as
 * pdf.js reads it back, the Excel copy as read-excel-file reads it back, and the Word copy as mammoth reads it back
 * (scripts/read-doc.mjs). Figures: fictional cases A and A′ (docs/GOLDEN-CASES.md), worked by hand in tests/dscr.test.ts
 * and tests/dscr-page.test.ts; model-worked until the owner confirms them.
 */
import { describe, it, expect } from 'vitest';
import DSCR from '../engine/data/dscr.json';
import DEFAULTS from '../engine/data/defaults.json';
import { PRESETS } from '../engine/dscr';
import { docText, type Doc } from '../site/src/doc/doc';
import { docxOf } from '../site/src/doc/docx';
import { pdfOf, printable } from '../site/src/doc/pdf';
import { xlsxOf } from '../site/src/doc/xlsx';
import { crc32 } from '../site/src/doc/zip';
import { docNeeds, docStatus, fileName, sourceForLender, statementDoc } from '../site/src/dscr/document';
import { ASSUMED, BORROWER_CHOICES, START, preview, tidyAmount, withBorrower, type State } from '../site/src/dscr/model';
import { SITE_NAME } from '../site/src/site';
import { docxLines, docxPart, pdfPages, workbook } from '../scripts/read-doc.mjs';

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
  it('heads it with the borrower\'s name, the lender and the date; no status line once complete', () => {
    expect(lines.slice(3, 8)).toEqual([
      'Asha Traders', 'Debt service coverage ratio (DSCR), 2026-27 to 2029-30', 'Lender: Example Bank, Pune branch', 'Prepared on: 30-09-2026', 'The loan',
    ]);
    expect(doc.header).toBe('DSCR statement · Asha Traders');
    expect(doc.mark).toBeUndefined();
    expect(text).not.toMatch(/provisional|still needed|^Status:/im);
  });
  it('gives the average and the lowest year under the working; the verdict, the largest loan, the fewest instalments and the target stay on the page', () => {
    const at = (l: string) => lines.indexOf(l);
    expect(lines).toContain('Average DSCR: 1.16 total cash available ÷ total debt service');
    expect(lines).toContain('Lowest year: 0.84 in 2027-28');
    expect(at('Average DSCR: 1.16 total cash available ÷ total debt service')).toBeGreaterThan(at('DSCR (A ÷ B) | 1.17 | 0.84 | 0.98 | 2.26'));
    expect(at('For Asha Traders')).toBeGreaterThan(at('Lowest year: 0.84 in 2027-28'));
    for (const t of [p.verdict?.text, p.largest?.text, p.fewest?.text]) {
      expect(t).toBeTruthy();
      expect(text).not.toContain(t);
    }
    expect(text).not.toMatch(/target/i);
  });
  it('shows the whole working as the page does, every line, nil lines too', () => {
    expect(text).toContain('Rupees | 2026-27 | 2027-28 | 2028-29 | 2029-30');
    expect(text).toContain('Cash available (A) | 4,00,392 | 4,22,624 | 4,45,488 | 4,73,072');
    expect(text).toContain('Debt service (B) | 3,41,000 | 5,02,000 | 4,54,000 | 2,09,000');
    expect(text).toContain('DSCR (A ÷ B) | 1.17 | 0.84 | 0.98 | 2.26');
    for (const l of p.statement!.lines) expect(lines).toContain(l.kind === 'head' ? l.label : [l.label, ...l.values, l.total?.text].join(' | '));
    // The Total column, worked by hand: 4,00,392 + 4,22,624 + 4,45,488 + 4,73,072 = 17,41,576; 3,41,000 + 5,02,000 +
    // 4,54,000 + 2,09,000 = 15,06,000; 17,41,576 ÷ 15,06,000 = 1.1564, the average.
    expect(lines).toContain('Rupees | 2026-27 | 2027-28 | 2028-29 | 2029-30 | Total');
    expect(lines).toContain('Cash available (A) | 4,00,392 | 4,22,624 | 4,45,488 | 4,73,072 | 17,41,576');
    expect(lines).toContain('Debt service (B) | 3,41,000 | 5,02,000 | 4,54,000 | 2,09,000 | 15,06,000');
    expect(lines).toContain('DSCR (A ÷ B) | 1.17 | 0.84 | 0.98 | 2.26 | 1.16');
  });
  it('states the method in plain words, with its source; not how far this site checked it, and not the planning rules', () => {
    expect(lines).toContain('Common term-loan DSCR.');
    expect(lines).toContain('Cash available (A) = profit after tax + depreciation + other non-cash charges (amortisation, amounts written off) + interest on term loans.');
    expect(lines).toContain('Debt service (B) = term-loan instalments (principal) + interest on term loans.');
    expect(lines).toContain('Years counted: years with a term-loan instalment.');
    expect(lines).toContain('The average: total cash available ÷ total debt service. The lowest year is the lowest DSCR among the years counted.');
    expect(lines).toContain('Source: How chartered accountants and banks work DSCR for term loans, as described in public articles (bankingfinance.in, finpab.com). Dated 30-09-2026.');
    expect(text).not.toMatch(/checked|could not be opened|summaries|docs\//i);
    expect(text).not.toContain('How the figures are built');
    for (const rule of DSCR.planning.rules) expect(text).not.toContain(rule);
  });
  it('words every method\'s source for the lender: where it comes from, without this site\'s notes on checking it', () => {
    for (const x of PRESETS) {
      const t = sourceForLender(x.source);
      expect(t).not.toMatch(/checked|could not be opened|summaries|docs\//i);
      expect(x.source.startsWith(t.slice(0, 40))).toBe(true);
    }
    expect(sourceForLender(PRESETS[1].source)).toMatch(/^RBI circular DOR\.No\.BP\.BC\/13\/21\.04\.048\/2020-21 of 7 September 2020: .*period of the loan$/);
  });
  it('lists the facts entered once, and not the page\'s assumptions', () => {
    expect(lines).toContain('Amount: Rs. 12,00,000');
    expect(lines).toContain('Repaid: Equal principal every quarter');
    expect(lines).toContain('Instalments: 12 quarterly');
    expect(lines).toContain('Each instalment: Principal Rs. 1,00,000 a quarter, and interest on the balance every month.');
    expect(lines).toContain('Profit before interest, depreciation and tax: Rs. 5,00,000 in 2026-27; sales growth 10% a year');
    expect(lines).toContain('Depreciation: Rs. 1,50,000 every year');
    expect(lines).toContain('Tax rate (%): 31.2% every year');
    // The assumptions are listed on the page only (the owner, D-DOC-03); the lines they leave at None are left out.
    expect(p.assumed).toHaveLength(9);
    expect(text).not.toContain('Assumed until changed');
    for (const a of p.assumed) expect(text).not.toContain(a.why);
    expect(text).not.toMatch(/^(Extra income from the new asset|Loans already running|Other non-cash charges[^:]*):/m);
  });
  it('puts the basis and the repayment schedule in two annexes, each from a new page', () => {
    expect(doc.parts.map((x) => x.name)).toEqual(['DSCR statement', 'Basis', 'Repayment schedule']);
    expect(doc.parts.map((x) => x.blocks[0].kind === 'title' && x.blocks[0].text)).toEqual(['Asha Traders', 'Annex 1. The basis', 'Annex 2. Repayment schedule']);
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
  it('fictional case A′: the whole working, the result and the signature on the first page; the annexes after', async () => {
    const { p, doc } = build(A2), pages = await pdfPages(pdfOf(doc, MADE));
    expect(pages.length).toBeGreaterThanOrEqual(3);
    const first = pages[0].split('\n');
    expect(first.slice(0, 5)).toEqual([
      'DSCR statement · Asha Traders', 'Asha Traders', 'Debt service coverage ratio (DSCR), 2026-27 to 2029-30', 'Lender Example Bank, Pune branch Prepared on 30-09-2026', 'The loan',
    ]);
    expect(first).toContain('Amount Rs. 12,00,000 Interest rate 12% a year');
    // The strip: the names, then the figures, then the notes, each a row of text.
    const strip = first.indexOf('Average DSCR Lowest year');
    expect(first.slice(strip, strip + 3)).toEqual(['Average DSCR Lowest year', '1.16 0.84', 'total cash available ÷ total debt service in 2027-28']);
    expect(first.slice(-5, -1)).toEqual(['For Asha Traders', 'Authorised signatory', 'Date:', 'Place:']);
    expect(first.join('\n')).not.toMatch(/Below the target|target/i);
    expect(pages[1].split('\n')[1]).toBe('Annex 1. The basis');
    expect(pages[2].split('\n')[1]).toBe('Annex 2. Repayment schedule');
    expect(first).toContain('Cash available (A) 4,00,392 4,22,624 4,45,488 4,73,072 17,41,576');
    expect(first).toContain('DSCR (A ÷ B) 1.17 0.84 0.98 2.26 1.16');
    // Every figure of the statement, on the first page, in the order the page shows it, with its total.
    for (const l of p.statement!.lines) if (l.values.length) expect(first.some((x) => x.endsWith([...l.values, l.total?.text].join(' ')))).toBe(true);
    pages.forEach((page, i) => expect(page).toMatch(new RegExp(`Page ${i + 1} of ${pages.length}$`)));
    const all = pages.join('\n');
    expect(all).toContain('Dec 2026 1 12,00,000 12,000 1,00,000 1,12,000 11,00,000');
    expect(all).toContain('Sep 2029 12 1,00,000 1,000 1,00,000 1,01,000 0');
    expect(all).not.toContain('Provisional');
  });
  it('fictional case A, provisional: marked on every page, with what is still needed; not the target, which it does not show', async () => {
    const { doc, lines } = build(CASE_A);
    expect(lines.slice(4, 6)).toEqual(['DSCR statement', 'Debt service coverage ratio (DSCR), 2026-27 to 2029-30']);
    expect(lines).toContain('Lender: Still needed');
    const box = lines.indexOf('Provisional: 2 still needed');
    expect(lines.slice(box + 1, box + 3)).toEqual(["The borrower's name", 'The lender']);
    // The page still asks for a target (for its verdict); the document is complete without one.
    expect(preview(CASE_A).needs).toEqual(['A target DSCR for the average, the lowest year, or both']);
    expect(docStatus(CASE_A, preview(CASE_A))).toBe('Provisional: 2 still needed');
    expect(docStatus({ ...CASE_A, doc: FACTS }, preview({ ...CASE_A, doc: FACTS }))).toBe('Complete');
    expect(fileName({ ...CASE_A, doc: FACTS }, preview({ ...CASE_A, doc: FACTS }), 'docx')).toBe('DSCR statement - Asha Traders.docx');
    const pages = await pdfPages(pdfOf(doc, MADE));
    for (const page of pages) expect(page.split('\n')[0]).toBe('DSCR statement Provisional');
    expect(pages[0]).toContain("• The borrower's name");
    // Case A by hand (tests/dscr.test.ts): cash available 4,10,250 and 5,83,000 against 3,41,000 and 5,02,000 in the
    // first two years; DSCR 1.2031, 1.1614, 1.3293 and 2.8218; average 1.45, lowest 1.16 in 2027-28.
    expect(pages[0]).toContain('Cash available (A) 4,10,250 5,83,000 6,03,500 5,89,750');
    expect(pages[0]).toContain('DSCR (A ÷ B) 1.20 1.16 1.33 2.82');
    expect(pages[0]).toContain('1.45 1.16');
  });
  it('a long loan: the year columns split into tables that fit the page, every year kept', async () => {
    const s: State = { ...A2, loan: { amount: '50 L', ratePct: '10', disbursed: '2027-04', moratoriumMonths: '0', instalments: '144', repayment: 'emi' } };
    const { p, doc } = build(s), years = p.statement!.years;
    expect(years).toHaveLength(12);
    const text = (await pdfPages(pdfOf(doc, MADE))).join('\n').split('\n');
    const dscr = text.filter((l) => l.startsWith('DSCR (A ÷ B) ')).map((l) => l.slice('DSCR (A ÷ B) '.length).split(' '));
    expect(dscr.length).toBeGreaterThan(1);
    const row = p.statement!.lines.find((l) => l.id === 'dscr')!;
    expect(dscr.flat()).toEqual([...row.values, row.total?.text]);
  });
});

describe('the Excel copy, read back by read-excel-file', () => {
  it('fictional case A′: the engine\'s figures as numbers, a sheet for each part', async () => {
    const { p, doc } = build(A2), book = await workbook(xlsxOf(doc, MADE));
    expect(book.map((x) => x.sheet)).toEqual(['DSCR statement', 'Basis', 'Repayment schedule']);
    const rows = book[0].data, row = (label: string) => rows.find((r) => r[0] === label)?.filter((c) => c !== null);
    expect(rows[0][0]).toBe('Asha Traders');
    expect(row('Lender')).toEqual(['Lender', 'Example Bank, Pune branch']);
    expect(row('Status')).toBeUndefined();
    expect(row('Average DSCR')).toEqual(['Average DSCR', '1.16', 'total cash available ÷ total debt service']);
    expect(row('Lowest year')).toEqual(['Lowest year', '0.84', 'in 2027-28']);
    expect(row('Rupees')).toEqual(['Rupees', '2026-27', '2027-28', '2028-29', '2029-30', 'Total']);
    expect(row('Cash available (A)')).toEqual(['Cash available (A)', 400392, 422624, 445488, 473072, 1741576]);
    expect(row('Debt service (B)')).toEqual(['Debt service (B)', 341000, 502000, 454000, 209000, 1506000]);
    // The DSCR as the engine gave it, not rounded: 4,00,392 ÷ 3,41,000 and so on, and the average 17,41,576 ÷ 15,06,000.
    expect(row('DSCR (A ÷ B)')).toEqual(['DSCR (A ÷ B)', 400392 / 341000, 422624 / 502000, 445488 / 454000, 473072 / 209000, 1741576 / 1506000]);
    for (const l of p.statement!.lines) if (l.n) expect(row(l.label)?.slice(1)).toEqual([...l.n, l.total?.n]);
    expect(rows.flat()).toContain('Each cell holds the exact figure worked out on the page, shown in whole rupees; there are no formulas.');
    expect(book[1].data.flat()).toContain('Common term-loan DSCR.');
    const months = book[2].data;
    expect(months.find((r) => r[0] === 'Dec 2026')).toEqual(['Dec 2026', 1, 1200000, 12000, 100000, 112000, 1100000]);
    expect(months.filter((r) => /^[A-Z][a-z]{2} \d{4}$/.test(String(r[0])))).toHaveLength(42);
  });
  it('own yearly figures: no loan and no schedule, the figures as entered, the years not counted said once', async () => {
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
    expect(lines.join('\n')).not.toMatch(/target/i);
    expect(lines).not.toContain('The loan');
    const book = await workbook(xlsxOf(doc, MADE));
    expect(book.map((x) => x.sheet)).toEqual(['DSCR statement', 'Basis']);
    // The Total column leaves out 2026-27, not counted: 1,60,000 + 1,60,000.
    expect(book[0].data.find((r) => r[0] === 'Rupees')?.filter((c) => c !== null)).toEqual(['Rupees', '2026-27 (not counted)', '2027-28', '2028-29', 'Total (years counted)']);
    expect(book[0].data.find((r) => r[0] === 'Cash available (A)')?.filter((c) => c !== null)).toEqual(['Cash available (A)', 150000, 160000, 160000, 320000]);
  });
  it('a stored zip that any reader opens: the checksum is the standard one', () => {
    expect(crc32(new TextEncoder().encode('123456789')).toString(16)).toBe('cbf43926');
  });
});

describe('the Word copy, read back by mammoth', () => {
  it('fictional case A′: the same page 1, as Word tables; the annexes each from a new page', async () => {
    const { p, doc } = build(A2), bytes = docxOf(doc, MADE), { lines, messages } = await docxLines(bytes);
    expect(messages).toEqual([]);
    expect(lines.slice(0, 5)).toEqual([
      'Asha Traders', 'Debt service coverage ratio (DSCR), 2026-27 to 2029-30', 'Lender | Example Bank, Pune branch | Prepared on | 30-09-2026', 'The loan',
      'Amount | Rs. 12,00,000 | Interest rate | 12% a year',
    ]);
    expect(lines).toContain('Rupees | 2026-27 | 2027-28 | 2028-29 | 2029-30 | Total');
    for (const l of p.statement!.lines) expect(lines).toContain(l.kind === 'head' ? l.label : [l.label, ...l.values, l.total?.text].join(' | '));
    expect(lines).toContain('Average DSCR 1.16 total cash available ÷ total debt service | Lowest year 0.84 in 2027-28');
    expect(lines).toContain('Annex 1. The basis');
    expect(lines).toContain('Dec 2026 | 1 | 12,00,000 | 12,000 | 1,00,000 | 1,12,000 | 11,00,000');
    expect(lines.join('\n')).not.toMatch(/target|checked|Provisional/i);
    // The header and footer on every page: the borrower, and the page number as Word counts it.
    expect(await docxPart(bytes, 'word/header1.xml')).toBe('DSCR statement · Asha Traders');
    expect(await docxPart(bytes, 'word/footer1.xml')).toMatch(/^Made with .+ Not a CA's certificate\.\tPage \{PAGE\}1 of \{NUMPAGES\}1$/);
  });
  it('fictional case A, provisional: "Provisional" in the header of every page, and what is still needed', async () => {
    const { doc } = build(CASE_A), bytes = docxOf(doc, MADE), { lines } = await docxLines(bytes);
    expect(await docxPart(bytes, 'word/header1.xml')).toBe('DSCR statement\tProvisional');
    expect(lines).toContain("Provisional: 2 still needed • The borrower's name • The lender");
  });
  it('holds no figure the page did not already show or the user did not type', async () => {
    const { p, doc } = build(A2), { lines } = await docxLines(docxOf(doc, MADE));
    const sources = [JSON.stringify(p), JSON.stringify(A2), JSON.stringify(DSCR), JSON.stringify(DEFAULTS), tidyAmount(A2.loan.amount),
      ...Object.values(A2.cells).flat().map(tidyAmount), '30-09-2026', SITE_NAME].join('\n');
    const figures = lines.join('\n').match(/\d+(?:,\d+)*(?:\.\d+)?/g) ?? [];
    expect(figures.length).toBeGreaterThan(300);
    expect(figures.filter((f) => !sources.includes(f))).toEqual([]);
  });
  it('a long loan: the year columns split into tables that fit the page, as in the PDF, every year kept', async () => {
    const s: State = { ...A2, loan: { amount: '50 L', ratePct: '10', disbursed: '2027-04', moratoriumMonths: '0', instalments: '144', repayment: 'emi' } };
    const { p, doc } = build(s), { lines } = await docxLines(docxOf(doc, MADE));
    const dscr = lines.filter((l) => l.startsWith('DSCR (A ÷ B) | ')).map((l) => l.split(' | ').slice(1));
    expect(dscr.length).toBeGreaterThan(1);
    const row = p.statement!.lines.find((l) => l.id === 'dscr')!;
    expect(dscr.flat()).toEqual([...row.values, row.total?.text]);
  });
  it('keeps Word\'s letters beyond Latin, which the PDF cannot print', async () => {
    const { doc } = build(A2), named: Doc = { ...doc, header: 'DSCR statement · श्री गणेश ट्रेडर्स' };
    expect(await docxPart(docxOf(named, MADE), 'word/header1.xml')).toBe('DSCR statement · श्री गणेश ट्रेडर्स');
  });
});

describe('one document, three files', () => {
  it('the PDF, the Excel copy and the Word copy carry the same words', async () => {
    const { doc } = build(A2), pdf = (await pdfPages(pdfOf(doc, MADE))).join('\n'), word = (await docxLines(docxOf(doc, MADE))).lines.join('\n');
    const cells = (await workbook(xlsxOf(doc, MADE))).flatMap((x) => x.data.flat()).filter((c): c is string => typeof c === 'string');
    for (const t of ['Asha Traders', 'Example Bank, Pune branch', 'Debt service coverage ratio (DSCR), 2026-27 to 2029-30', 'Common term-loan DSCR.', 'Annex 1. The basis', 'Annex 2. Repayment schedule'])
      expect([pdf.includes(t), cells.some((c) => c.includes(t)), word.includes(t)]).toEqual([true, true, true]);
    const doc2: Doc = { ...doc, parts: doc.parts.slice(0, 2) };
    expect((await pdfPages(pdfOf(doc2, MADE))).join('\n')).not.toContain('Repayment schedule');
  });
});

describe('fictional case P: who the borrower is, loans already running and the new asset, in the document', () => {
  // Worked by hand in tests/dscr.test.ts: a proprietor; EMIs of 25,000 a month running on and 15,000 a month to December
  // 2027; the new asset's 3,60,000 a year from October 2026.
  const P: State = withBorrower({
    ...A2,
    cells: { ...A2.cells, pbdit: ['15 L'], depreciation: ['2 L'], interestOther: ['1 L'] },
    modes: { ...A2.modes, otherLoans: 'emi', assetIncome: 'from' },
    running: [{ emi: '25,000', last: '' }, { emi: '15,000', last: '2027-12' }], asset: { yearly: '3,60,000', from: '2026-10' },
  }, 'proprietor');
  const { p, text, lines } = build(P);
  it('holds no figure the page did not already show or the user did not type', () => {
    // The page shows each borrower's tax in words (BORROWER_CHOICES); the EMIs and the asset's income are typed.
    const sources = [JSON.stringify(p), JSON.stringify(P), JSON.stringify(DSCR), JSON.stringify(DEFAULTS), JSON.stringify(BORROWER_CHOICES), tidyAmount(P.loan.amount),
      ...Object.values(P.cells).flat().map(tidyAmount), ...P.running.map((l) => tidyAmount(l.emi)), tidyAmount(P.asset.yearly), '30-09-2026', SITE_NAME].join('\n');
    const figures = text.match(/\d+(?:,\d+)*(?:\.\d+)?/g) ?? [];
    expect(figures.length).toBeGreaterThan(300);
    expect(figures.filter((f) => !sources.includes(f))).toEqual([]);
  });
  it('says who the borrower is, how the tax and the EMIs were given, and the new asset', () => {
    expect(lines).toContain('The borrower: Proprietor');
    expect(lines).toContain("Loans already running: EMIs of Rs. 25,000 a month, running on; Rs. 15,000 a month, the last in December 2027. All of the proprietor's EMIs, business and personal: one cash flow pays them");
    expect(lines).toContain('Extra income from the new asset: Rs. 3,60,000 a year from October 2026');
    expect(lines).toContain('Tax rate (%): Worked out for a proprietor: slab rates of 5% to 30% with 4% cess, nothing up to Rs. 12,00,000 of profit');
    expect(text).not.toContain("A proprietor's tax: The new regime's slab rates");
  });
  it('carries the new lines of the statement, with the engine\'s figures', () => {
    expect(text).toContain('Add: extra income from the new asset | 1,80,000 | 3,60,000 | 3,60,000 | 3,60,000');
    expect(text).toContain('Existing EMIs (interest and principal) | 4,80,000 | 4,35,000 | 3,00,000 | 3,00,000');
    expect(text).toContain('Less: tax | 40,560 | 1,26,464 | 1,70,768 | 2,20,350');
    expect(text).toContain('DSCR (A ÷ B) | 1.88 | 1.90 | 2.53 | 4.00');
    expect(lines).toContain('Debt service (B) = term-loan instalments (principal) + interest on term loans + existing EMIs (interest and principal).');
  });
});
