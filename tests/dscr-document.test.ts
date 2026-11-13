/**
 * The DSCR statement to download (site/src/dscr/document.ts), tested on its text: the document as built, the PDF as
 * pdf.js reads it back, the Excel copy as read-excel-file reads it back, and the Word copy as mammoth reads it back
 * (scripts/read-doc.mjs). The three read alike, part for part, and the Excel copy holds the engine's figures as numbers,
 * never a formula (D-DOC-21). Figures: fictional cases A and A′ (docs/GOLDEN-CASES.md), worked
 * by hand in tests/dscr.test.ts and tests/dscr-page.test.ts; model-worked until the owner confirms them.
 */
import { describe, it, expect } from 'vitest';
import DSCR from '../engine/data/dscr.json';
import DEFAULTS from '../engine/data/defaults.json';
import { PRESETS } from '../engine/dscr';
import { levelFor } from '../engine/ratios';
import { docText, type Doc, type Row } from '../site/src/doc/doc';
import { docxOf } from '../site/src/doc/docx';
import { pdfOf } from '../site/src/doc/pdf';
import { printable } from '../site/src/doc/face';
import { xlsxOf } from '../site/src/doc/xlsx';
import { crc32, zip } from '../site/src/doc/zip';
import { docNeeds, docStatus, fileName, gstinOf, sourceForLender, statementDoc } from '../site/src/dscr/document';
import { ASSUMED, BORROWER_CHOICES, START, preview, tidyAmount, withBorrower, type Preview, type State } from '../site/src/dscr/model';
import { barsOf, exampleState } from '../site/src/dscr/worked';
import { SITE_NAME } from '../site/src/site';
import { docxLines, docxPart, formulaParts, pdfPages, workbook, zipPart } from '../scripts/read-doc.mjs';

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
// Own yearly figures, no loan typed: 2026-27 has no instalment, so it is not counted. By hand: A 1,50,000, 1,60,000,
// 1,60,000 against B 50,000, 1,40,000, 1,20,000; by totals 3,20,000 ÷ 2,60,000 = 1.231; by mean (1,60,000 ÷ 1,40,000 +
// 1,60,000 ÷ 1,20,000) ÷ 2 = (1.142857 + 1.333333) ÷ 2 = 1.238095. 2026-27's DSCR, 1,50,000 ÷ 50,000 = 3.00, is left out.
const OWN: State = {
  ...START, source: 'own', method: 'common', firstYear: '2026-27', yearCount: '3', doc: FACTS,
  cells: { pat: ['60,000', '80,000', '1,00,000'], depreciation: ['40,000', '40,000', '40,000'], interestTL: ['50,000', '40,000', '20,000'], principalTL: ['0', '1,00,000', '1,00,000'] },
  modes: { nonCash: 'none' }, target: { average: '1.5', minimum: '' },
};
const MEAN: State = { ...OWN, method: 'choose', choice: { interest: 'term-loans', leases: 'no', years: 'repayment', average: 'mean' } };
// Fictional case P (tests/dscr.test.ts): a proprietor; EMIs of 25,000 a month running on and 15,000 a month to December
// 2027; the new asset's 3,60,000 a year from October 2026.
const P: State = withBorrower({
  ...A2,
  cells: { ...A2.cells, pbdit: ['15 L'], depreciation: ['2 L'], interestOther: ['1 L'] },
  modes: { ...A2.modes, otherLoans: 'emi', assetIncome: 'from' },
  running: [{ emi: '25,000', last: '' }, { emi: '15,000', last: '2027-12' }], asset: { yearly: '3,60,000', from: '2026-10' },
}, 'proprietor');

const build = (s: State) => {
  const p = preview(s), doc = statementDoc(s, p, TODAY);
  if (!doc) throw new Error('no document');
  const text = docText(doc);
  return { p, doc, text, lines: text.split('\n') };
};
/**
 * Where every figure on paper may come from: the page's own figures and chart (in lakh, as the page draws it), what the
 * user typed, the dated data and the lender's usual levels from engine/data/ratios.json.
 */
const sourcesOf = (s: State, p: Preview, more: string[] = []) => [JSON.stringify(p), JSON.stringify(s), JSON.stringify(DSCR), JSON.stringify(DEFAULTS),
  JSON.stringify(barsOf(p)), levelFor('dscrAverage', 'fresh').toFixed(2), levelFor('dscrLowest', 'fresh').toFixed(2), tidyAmount(s.loan.amount),
  ...Object.values(s.cells).flat().map(tidyAmount), '30-09-2026', SITE_NAME, ...more].join('\n');
const figuresIn = (t: string) => t.match(/\d+(?:,\d+)*(?:\.\d+)?/g) ?? [];

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
  it('the address, the purpose and a GSTIN only if given; a GSTIN must have its shape', () => {
    expect(docNeeds({ ...FACTS, address: '12 MIDC Road, Bhosari, Pune 411026', purpose: 'A new CNC machine', gstin: '27abcde1234f1z5' })).toEqual([]);
    expect(gstinOf(' 27 ABCDE 1234 F1Z5 ')).toBe('27ABCDE1234F1Z5');
    expect(docNeeds({ ...FACTS, gstin: '27ABCDE1234F1Y5' })).toEqual(['The GSTIN, as its 15 letters and digits']);
    expect(docNeeds({ ...FACTS, address: 'पुणे', purpose: 'मशीन' })).toEqual(['The address, in English letters', "The loan's purpose, in English letters"]);
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
  it('opens at a glance: who asks and for what, the status, the key figures beside the lender\'s level, the chart, the contents', () => {
    expect(lines.slice(3, 11)).toEqual([
      'Asha Traders', 'Debt service coverage ratio (DSCR), 2026-27 to 2029-30', 'Lender: Example Bank, Pune branch', 'Prepared on: 30-09-2026',
      'Loan asked: ₹12,00,000 at 12% a year, 12 instalments, equal principal every quarter', 'Status: Complete',
      "Average DSCR: 1.16 Lender's level 1.50 total cash available ÷ total debt service", "Lowest year: 0.84 Lender's level 1.25 in 2027-28",
    ]);
    // The chart in lakh, as the page draws it: 4,22,624 is 4.23 lakh against 5,02,000, 5.02, in 2027-28, the tightest.
    expect(lines).toContain('2027-28 (tightest): 4.23 | 5.02');
    const contents = lines.indexOf('Contents');
    expect(lines.slice(contents, contents + 4)).toEqual(['Contents', '1. The statement', 'Annex 1. The basis', 'Annex 2. Repayment schedule']);
    expect(doc.header).toBe('DSCR statement · Asha Traders');
    expect(doc.mark).toBeUndefined();
    expect(text).not.toMatch(/provisional|still needed/i);
  });
  it('gives the average and the lowest year again under the working; no verdict, and the largest loan, the fewest instalments and the target stay on the page', () => {
    const at = (l: string) => lines.lastIndexOf(l);
    expect(lines).toContain('Average DSCR: 1.16 total cash available ÷ total debt service');
    expect(lines).toContain('Lowest year: 0.84 in 2027-28');
    expect(at('Average DSCR: 1.16 total cash available ÷ total debt service')).toBeGreaterThan(at('DSCR (A ÷ B) | 1.17 | 0.84 | 0.98 | 2.26 | 1.16'));
    expect(at('DSCR (A ÷ B) | 1.17 | 0.84 | 0.98 | 2.26 | 1.16')).toBeGreaterThan(at('1. The statement'));
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
    expect(lines).toContain('Amount: ₹12,00,000');
    expect(lines).toContain('Repaid: Equal principal every quarter');
    expect(lines).toContain('Instalments: 12 quarterly');
    expect(lines).toContain('Each instalment: Principal ₹1,00,000 a quarter, and interest on the balance every month.');
    expect(lines).toContain('Profit before interest, depreciation and tax: ₹5,00,000 in 2026-27; sales growth 10% a year');
    expect(lines).toContain('Depreciation: ₹1,50,000 every year');
    expect(lines).toContain('Tax rate (%): 31.2% every year');
    // The assumptions are listed on the page only (the owner, D-DOC-03); the lines they leave at None are left out.
    expect(p.assumed).toHaveLength(10);
    expect(text).not.toContain('Assumed until changed');
    for (const a of p.assumed) expect(text).not.toContain(a.why);
    expect(text).not.toMatch(/^(Extra income from the new asset|Loans already running|Other non-cash charges[^:]*):/m);
  });
  it('reads alike in all three files: page 1, the statement and two annexes, each a page and a sheet (D-DOC-21)', () => {
    expect(doc.parts.map((x) => x.name)).toEqual(['At a glance', 'DSCR statement', 'Basis', 'Repayment schedule']);
    expect(doc.parts.map((x) => x.blocks[0].kind === 'title' && x.blocks[0].text)).toEqual(['Asha Traders', '1. The statement', 'Annex 1. The basis', 'Annex 2. Repayment schedule']);
    expect(text).toContain('2026-27 | 1,41,000 | 2,00,000 | 10,00,000');
    // December 2026, by hand: interest 1% of 12,00,000 = 12,000; the first quarterly instalment of 1,00,000.
    expect(text).toContain('Dec 2026 | 1 | 12,00,000 | 12,000 | 1,00,000 | 1,12,000 | 11,00,000');
  });
  it('holds no figure on paper the page did not already show or the user did not type (none is computed for the document)', () => {
    const figures = figuresIn(text), sources = sourcesOf(A2, p);
    expect(figures.length).toBeGreaterThan(300);
    expect(figures.filter((f) => !sources.includes(f))).toEqual([]);
  });
  it('prints every character in the PDF', () => {
    expect(lines.filter((l) => !printable(l))).toEqual([]);
  });
});

describe('the PDF, read back by pdf.js', () => {
  it('fictional case A′: page 1 at a glance; the statement and the signature on page 2; the annexes after; bookmarks and links', async () => {
    const { p, doc } = build(A2), bytes = pdfOf(doc, MADE), pages = await pdfPages(bytes);
    expect(pages).toHaveLength(5);
    const first = pages[0].split('\n');
    expect(first.slice(0, 6)).toEqual([
      'DSCR statement · Asha Traders', 'Asha Traders', 'Debt service coverage ratio (DSCR), 2026-27 to 2029-30', 'Lender Example Bank, Pune branch Prepared on 30-09-2026',
      'Loan asked ₹12,00,000 at 12% a year, 12 instalments, equal principal every quarter', 'Status Complete',
    ]);
    // The strip: the names, the figures, the lender's levels (no verdict), then the notes, each a row of text.
    const strip = first.indexOf('Average DSCR Lowest year');
    expect(first.slice(strip, strip + 4)).toEqual(['Average DSCR Lowest year', '1.16 0.84', "Lender's level 1.50 Lender's level 1.25", 'total cash available ÷ total debt service in 2027-28']);
    expect(first).toContain('Cash available against repayments due ₹ lakh');
    expect(first.filter((l) => /^(1\. |Annex )/.test(l)).map((l) => l.replace(/[ .]+(\d+)$/, ' … $1'))).toEqual(['1. The statement … 2', 'Annex 1. The basis … 3', 'Annex 2. Repayment schedule … 4']);
    const second = pages[1].split('\n');
    expect(second[1]).toBe('1. The statement');
    expect(second).toContain('Amount ₹12,00,000 Interest rate 12% a year');
    expect(second).toContain('Cash available (A) 4,00,392 4,22,624 4,45,488 4,73,072 17,41,576');
    expect(second).toContain('DSCR (A ÷ B) 1.17 0.84 0.98 2.26 1.16');
    // Every figure of the statement, in the order the page shows it, with its total.
    for (const l of p.statement!.lines) if (l.values.length) expect(second.some((x) => x.endsWith([...l.values, l.total?.text].join(' ')))).toBe(true);
    const under = second.indexOf('Average DSCR Lowest year');
    expect(second.slice(under, under + 3)).toEqual(['Average DSCR Lowest year', '1.16 0.84', 'total cash available ÷ total debt service in 2027-28']);
    expect(second.slice(-5, -1)).toEqual(['For Asha Traders', 'Authorised signatory', 'Date:', 'Place:']);
    expect(pages[2].split('\n')[1]).toBe('Annex 1. The basis');
    expect(pages[3].split('\n')[1]).toBe('Annex 2. Repayment schedule');
    pages.forEach((page, i) => expect(page).toMatch(new RegExp(`Page ${i + 1} of ${pages.length}$`)));
    const all = pages.join('\n');
    expect(all).toContain('Dec 2026 1 12,00,000 12,000 1,00,000 1,12,000 11,00,000');
    expect(all).toContain('Sep 2029 12 1,00,000 1,000 1,00,000 1,01,000 0');
    expect(all).not.toMatch(/Provisional|target/i);
    // A bookmark for each part and a link from page 1's contents to each; "₹" from the one embedded face.
    const raw = new TextDecoder('latin1').decode(bytes);
    expect(raw.match(/\/Subtype \/Link/g)).toHaveLength(3);
    expect(raw).toMatch(/\/Type \/Outlines \/First \d+ 0 R \/Last \d+ 0 R \/Count 4/);
    expect(raw).toContain('/DisplayDocTitle true');
    expect(raw.match(/\/FontFile2/g)?.length).toBeGreaterThan(0);
  });
  it('fictional case A, provisional: marked on every page, with what is still needed; the usual levels when no target is typed', async () => {
    const { doc, lines } = build(CASE_A);
    expect(lines.slice(4, 6)).toEqual(['DSCR statement', 'Debt service coverage ratio (DSCR), 2026-27 to 2029-30']);
    expect(lines).toContain('Lender: Still needed');
    expect(lines).toContain('Status: Provisional: 2 still needed');
    const box = lines.indexOf('Provisional: 2 still needed');
    expect(lines.slice(box + 1, box + 3)).toEqual(["The borrower's name", 'The lender']);
    // No target typed: the lender's usual levels, from engine/data/ratios.json, named as such.
    expect(lines).toContain(`Average DSCR: 1.45 Usual level ${levelFor('dscrAverage', 'fresh').toFixed(2)} total cash available ÷ total debt service`);
    expect(lines).toContain(`Lowest year: 1.16 Usual level ${levelFor('dscrLowest', 'fresh').toFixed(2)} in 2027-28`);
    // The page still asks for a target (for its verdict); the document is complete without one.
    expect(preview(CASE_A).needs).toEqual(['A target DSCR for the average, the lowest year, or both']);
    expect(docStatus(CASE_A, preview(CASE_A))).toBe('2 questions left, for the document');
    expect(docStatus({ ...CASE_A, doc: FACTS }, preview({ ...CASE_A, doc: FACTS }))).toBe('All questions answered');
    expect(fileName({ ...CASE_A, doc: FACTS }, preview({ ...CASE_A, doc: FACTS }), 'docx')).toBe('DSCR statement - Asha Traders.docx');
    const pages = await pdfPages(pdfOf(doc, MADE));
    for (const page of pages) expect(page.split('\n')[0]).toBe('DSCR statement Provisional');
    expect(pages[0]).toContain("• The borrower's name");
    expect(pages[0]).toContain('1.45 1.16');
    // Case A by hand (tests/dscr.test.ts): cash available 4,10,250 and 5,83,000 against 3,41,000 and 5,02,000 in the
    // first two years; DSCR 1.2031, 1.1614, 1.3293 and 2.8218; average 1.45, lowest 1.16 in 2027-28.
    expect(pages[1]).toContain('Cash available (A) 4,10,250 5,83,000 6,03,500 5,89,750');
    expect(pages[1]).toContain('DSCR (A ÷ B) 1.20 1.16 1.33 2.82');
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

type Sheet = { sheet: string; data: unknown[][] };
const sheetOf = (book: Sheet[], name: string) => book.find((x) => x.sheet === name)!.data;
/** The row a label starts, without its empty cells; when the label also heads a section, the row with figures. */
const rowOf = (data: unknown[][], label: string) => data.filter((r) => r[0] === label).map((r) => r.filter((c) => c !== null)).filter((r) => r.length > 1).pop();

describe('the Excel copy, read back by read-excel-file', () => {
  it("fictional case A′: the PDF's parts as sheets, page 1 on top, the engine's figures as numbers and not one formula", async () => {
    const { p, doc } = build(A2), bytes = xlsxOf(doc, MADE), book: Sheet[] = await workbook(bytes);
    expect(book.map((x) => x.sheet)).toEqual(['At a glance', 'DSCR statement', 'Basis', 'Repayment schedule']);
    expect(await formulaParts(bytes)).toEqual([]);
    const glance = sheetOf(book, 'At a glance'), g = (l: string) => rowOf(glance, l);
    expect(glance.slice(0, 2).map((r) => r[0])).toEqual(['Asha Traders', 'Debt service coverage ratio (DSCR), 2026-27 to 2029-30']);
    expect(g('Lender')?.slice(0, 2)).toEqual(['Lender', 'Example Bank, Pune branch']);
    expect(g('Loan asked')).toEqual(['Loan asked', '₹12,00,000 at 12% a year, 12 instalments, equal principal every quarter']);
    expect(g('Status')).toEqual(['Status', 'Complete']);
    expect(doc.workbookNote).toBe('Each cell holds the exact figure worked out on the page, shown in whole rupees; there are no formulas.');
    expect(glance.flat()).toContain(doc.workbookNote);
    const statement = sheetOf(book, 'DSCR statement'), row = (l: string) => rowOf(statement, l);
    expect(row('Rupees')).toEqual(['Rupees', '2026-27', '2027-28', '2028-29', '2029-30', 'Total']);
    expect(row('Cash available (A)')).toEqual(['Cash available (A)', 400392, 422624, 445488, 473072, 1741576]);
    expect(row('Debt service (B)')).toEqual(['Debt service (B)', 341000, 502000, 454000, 209000, 1506000]);
    // The DSCR as the engine gave it, not rounded: 4,00,392 ÷ 3,41,000 and so on, and the average 17,41,576 ÷ 15,06,000.
    expect(row('DSCR (A ÷ B)')).toEqual(['DSCR (A ÷ B)', 400392 / 341000, 422624 / 502000, 445488 / 454000, 473072 / 209000, 1741576 / 1506000]);
    for (const l of p.statement!.lines) if (l.n) expect(row(l.label)?.slice(1)).toEqual([...l.n, l.total?.n]);
    expect(sheetOf(book, 'Basis').flat()).toContain('Common term-loan DSCR.');
    // The loan month by month: 42 months, April 2026 to September 2029; December 2026 as worked by hand above.
    const months = sheetOf(book, 'Repayment schedule');
    expect(months.find((r) => r[0] === 'Dec 2026')?.filter((c) => c !== null)).toEqual(['Dec 2026', 1, 1200000, 12000, 100000, 112000, 1100000]);
    expect(months.filter((r) => /^[A-Z][a-z]{2} \d{4}$/.test(String(r[0])))).toHaveLength(42);
  });
  it('own yearly figures: no loan and no schedule, the figures as entered, the years not counted said once', async () => {
    const { doc, lines } = build(OWN);
    expect(lines).toContain('Years: 2026-27 to 2028-29');
    expect(lines).toContain('Profit after tax: 2026-27: ₹60,000; 2027-28: ₹80,000; 2028-29: ₹1,00,000');
    expect(lines).toContain('Other non-cash charges (amortisation, amounts written off): None');
    expect(lines).toContain('Not counted: 2026-27 (no term-loan instalment).');
    expect(lines.join('\n')).not.toMatch(/target/i);
    expect(lines).not.toContain('The loan');
    const bytes = xlsxOf(doc, MADE), book: Sheet[] = await workbook(bytes);
    expect(book.map((x) => x.sheet)).toEqual(['At a glance', 'DSCR statement', 'Basis']);
    expect(await formulaParts(bytes)).toEqual([]);
    // The Total column leaves out 2026-27, not counted: 1,60,000 + 1,60,000.
    const statement = sheetOf(book, 'DSCR statement');
    expect(rowOf(statement, 'Rupees')).toEqual(['Rupees', '2026-27 (not counted)', '2027-28', '2028-29', 'Total (years counted)']);
    expect(rowOf(statement, 'Cash available (A)')).toEqual(['Cash available (A)', 150000, 160000, 160000, 320000]);
  });
  it('a stored zip that any reader opens: the checksum is the standard one', () => {
    expect(crc32(new TextEncoder().encode('123456789')).toString(16)).toBe('cbf43926');
  });
  it('the formula finder finds a formula in a cell or a chart, so its empty answer above means none (D-DOC-21)', async () => {
    const part = (name: string, x: string) => ({ name, data: new TextEncoder().encode(x) });
    const plain = '<sheetData><row r="1"><c r="A1"><v>1</v></c></row></sheetData><fonts count="1"/><fills count="1"/>';
    expect(await formulaParts(zip([part('xl/worksheets/sheet1.xml', plain)], MADE))).toEqual([]);
    expect(await formulaParts(zip([part('xl/worksheets/sheet1.xml', '<c r="A1"><f>B1+C1</f><v>2</v></c>'),
      part('xl/charts/chart1.xml', "<c:numRef><c:f>'Sheet'!$B$1</c:f></c:numRef>"), part('xl/styles.xml', plain)], MADE))).toEqual(['xl/worksheets/sheet1.xml', 'xl/charts/chart1.xml']);
  });
});

describe('the Word copy, read back by mammoth', () => {
  it('fictional case A′: the same page 1 and statement, as Word tables with heading styles; the annexes each from a new page', async () => {
    const { p, doc } = build(A2), bytes = docxOf(doc, MADE), { lines, messages } = await docxLines(bytes);
    expect(messages).toEqual([]);
    expect(lines.slice(0, 11)).toEqual([
      'Asha Traders', 'Debt service coverage ratio (DSCR), 2026-27 to 2029-30', 'Lender | Example Bank, Pune branch | Prepared on | 30-09-2026',
      'Loan asked | ₹12,00,000 at 12% a year, 12 instalments, equal principal every quarter', 'Status | Complete',
      "Average DSCR 1.16 Lender's level 1.50 total cash available ÷ total debt service | Lowest year 0.84 Lender's level 1.25 in 2027-28",
      'In amber: 2027-28, the tightest year.', 'Contents', '1. The statement 2', 'Annex 1. The basis 3', 'Annex 2. Repayment schedule 4',
    ]);
    expect(lines).toContain('Amount | ₹12,00,000 | Interest rate | 12% a year');
    expect(lines).toContain('Rupees | 2026-27 | 2027-28 | 2028-29 | 2029-30 | Total');
    for (const l of p.statement!.lines) expect(lines).toContain(l.kind === 'head' ? l.label : [l.label, ...l.values, l.total?.text].join(' | '));
    expect(lines).toContain('Average DSCR 1.16 total cash available ÷ total debt service | Lowest year 0.84 in 2027-28');
    expect(lines).toContain('Annex 1. The basis');
    expect(lines).toContain('Dec 2026 | 1 | 12,00,000 | 12,000 | 1,00,000 | 1,12,000 | 11,00,000');
    expect(lines.join('\n')).not.toMatch(/target|checked|Provisional/i);
    // The chart as a Word chart; the parts as headings a reader can navigate.
    expect(await zipPart(bytes, 'word/charts/chart1.xml')).toMatch(/<c:barChart>/);
    expect(await zipPart(bytes, 'word/document.xml')).toMatch(/<w:pStyle w:val="Heading1"\/>/);
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
    const figures = figuresIn(lines.join('\n')), sources = sourcesOf(A2, p);
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
  it('the same words in each file, part for part', async () => {
    const { doc } = build(A2), pdf = (await pdfPages(pdfOf(doc, MADE))).join('\n'), word = (await docxLines(docxOf(doc, MADE))).lines.join('\n');
    const cells = (await workbook(xlsxOf(doc, MADE))).flatMap((x: Sheet) => x.data.flat()).filter((c: unknown): c is string => typeof c === 'string');
    const where = (t: string) => [pdf.includes(t), cells.some((c) => c.includes(t)), word.includes(t)];
    for (const t of ['Asha Traders', 'Example Bank, Pune branch', 'Debt service coverage ratio (DSCR), 2026-27 to 2029-30', '₹12,00,000 at 12% a year, 12 instalments, equal principal every quarter'])
      expect(where(t)).toEqual([true, true, true]);
    for (const t of ['Common term-loan DSCR.', 'Annex 1. The basis', 'Annex 2. Repayment schedule', 'Authorised signatory']) expect(where(t)).toEqual([true, true, true]);
    const doc2: Doc = { ...doc, parts: doc.parts.slice(0, 2) };
    expect((await pdfPages(pdfOf(doc2, MADE))).join('\n')).not.toContain('Repayment schedule');
  });
  it('not one formula in any Excel copy, whatever the case: every figure a number as the engine gave it (D-DOC-21)', async () => {
    for (const c of [A2, CASE_A, OWN, MEAN, P, CASE_AL, exampleState('2026-09')]) expect(await formulaParts(xlsxOf(build(c).doc, MADE))).toEqual([]);
  });
});

describe('fictional case P: who the borrower is, loans already running and the new asset, in the document', () => {
  const { p, text, lines } = build(P);
  it('holds no figure the page did not already show or the user did not type', () => {
    // The page shows each borrower's tax in words (BORROWER_CHOICES); the EMIs and the asset's income are typed.
    const sources = sourcesOf(P, p, [JSON.stringify(BORROWER_CHOICES), ...P.running.map((l) => tidyAmount(l.emi)), tidyAmount(P.asset.yearly)]);
    const figures = figuresIn(text);
    expect(figures.length).toBeGreaterThan(300);
    expect(figures.filter((f) => !sources.includes(f))).toEqual([]);
  });
  it('says who the borrower is, how the tax and the EMIs were given, and the new asset', () => {
    expect(lines).toContain('The borrower: Proprietor');
    expect(lines).toContain("Loans already running: EMIs of ₹25,000 a month, running on; ₹15,000 a month, the last in December 2027. All of the proprietor's EMIs, business and personal: one cash flow pays them");
    expect(lines).toContain('Extra income from the new asset: ₹3,60,000 a year from October 2026');
    expect(lines).toContain('Tax rate (%): Worked out for a proprietor: slab rates of 5% to 30% with 4% cess, nothing up to ₹12,00,000 of profit');
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

// Fictional case A with the lenders' tests typed (D1b): sales 25,00,000, 30,00,000, 32,00,000 and 32,00,000; promoters'
// loans of 1,00,000 repaid in 2027-28 and 2028-29; working capital 20% of the rise in sales; replacement capex 50,000 a
// year; the last audited year (2025-26) sales 22,00,000, that profit 4,40,000, depreciation 1,60,000, interest 70,000, tax
// 60,000. Worked by hand from case A's statement (cash available 4,10,250, 5,83,000, 6,03,500, 5,89,750 against debt
// service 3,41,000, 5,02,000, 4,54,000, 2,09,000; interest 1,91,000, 1,52,000, 1,04,000, 59,000, of which 50,000 a year
// on other loans; tax 25%):
// - price 5% lower: that profit less 1,25,000, 1,50,000, 1,60,000, 1,60,000 gives profit before tax 34,000, 3,18,000,
//   4,26,000, 4,81,000; less 25% tax, plus depreciation and term-loan interest, cash 3,16,500, 4,70,500, 4,83,500,
//   4,69,750: 3,16,500 ÷ 3,41,000 = 0.928 the lowest, in 2026-27; 17,40,250 ÷ 15,06,000 = 1.156 on average;
// - costs 10% higher: costs 20,00,000, 22,50,000, 24,00,000, 24,00,000, so that profit less 2,00,000, 2,25,000,
//   2,40,000, 2,40,000; profit before tax -41,000 (no tax), 2,43,000, 3,46,000, 4,01,000; cash 2,50,000, 4,14,250,
//   4,23,500, 4,09,750: 2,50,000 ÷ 3,41,000 = 0.733 the lowest; 14,97,500 ÷ 15,06,000 = 0.994 on average;
// - promoters' loans repaid: 5,83,000 ÷ 6,02,000 = 0.968 the lowest, in 2027-28; 21,86,500 ÷ 17,06,000 = 1.282;
// - the cash check: working capital's growth 20% of 3,00,000, 5,00,000, 2,00,000, 0 = 60,000, 1,00,000, 40,000, 0;
//   cash left 4,10,250 - 60,000 - 50,000 - 3,41,000 = -40,750, then -69,000, 59,500, 3,30,750; cover 3,00,250 ÷ 3,41,000
//   = 0.88, 4,33,000 ÷ 5,02,000 = 0.86, 5,13,500 ÷ 4,54,000 = 1.13, 5,39,750 ÷ 2,09,000 = 2.58;
// - the audited year: profit before tax 4,40,000 - 1,60,000 - 70,000 = 2,10,000; after tax 1,50,000; cash accrual
//   3,10,000; margin 4,40,000 ÷ 22,00,000 = 20.0%, and 5,00,000 ÷ 25,00,000 = 20.0% in 2026-27; sales up 13.6%.
const CASE_AL: State = {
  ...CASE_A, doc: FACTS,
  lender: { sales: ['25,00,000', '30,00,000', '32,00,000', '32,00,000'], promoters: ['', '1,00,000', '1,00,000', ''], wcPct: '20', capex: '50,000',
    audited: { sales: '22,00,000', pbdit: '4,40,000', depreciation: '1,60,000', interest: '70,000', tax: '60,000' } },
};
const rowsOf = (d: Doc, part: string) => d.parts.find((x) => x.name === part)!.blocks.flatMap((b) => (b.kind === 'table' ? b.table.rows : [])) as Row[];

describe('fictional case A with the lenders\' tests: the sensitivity analysis (D1b)', () => {
  const { p, doc, text, lines } = build(CASE_AL);
  it('puts it in section 2, after the statement, which points to it', () => {
    expect(doc.parts.map((x) => x.name)).toEqual(['At a glance', 'DSCR statement', 'Sensitivity', 'Basis', 'Repayment schedule']);
    expect(lines).toContain('The sensitivity analysis in section 2 tests this DSCR as a lender may; it does not change it.');
    expect(lines.filter((l) => l === '2. Sensitivity analysis')).toHaveLength(2);
    // Without a test that has figures (case A′: nothing typed), no section and no pointer.
    const a2 = build(A2);
    expect(a2.doc.parts.map((x) => x.name)).not.toContain('Sensitivity');
    expect(a2.text).not.toMatch(/sensitivity/i);
  });
  it('shows each test as the page does, with the figures worked by hand above', () => {
    expect(lines).toContain('Test | Average | Lowest year | In');
    expect(lines).toContain('Sales price 5% lower | 1.16 | 0.93 | 2026-27');
    expect(lines).toContain('Costs 10% higher | 0.99 | 0.73 | 2026-27');
    expect(lines).toContain("Promoters' loans repaid as given, counted in debt service as a lender would | 1.28 | 0.97 | 2027-28");
    expect(lines).toContain("Promoters' loans repaid | 0 | 1,00,000 | 1,00,000 | 0");
    expect(lines).toContain("Debt service with them (B + promoters' loans) | 3,41,000 | 6,02,000 | 5,54,000 | 2,09,000");
    expect(lines).toContain('Cash left | -40,750 | -69,000 | 59,500 | 3,30,750');
    expect(lines).toContain('Cover: (A less working capital and capex) ÷ B | 0.88 | 0.86 | 1.13 | 2.58');
    expect(lines).toContain('Profit before tax | 2,10,000 | ');
    expect(lines).toContain('Cash accrual (profit after tax + depreciation) | 3,10,000 | ');
    expect(lines).toContain('Margin (that profit ÷ sales) | 20.0% | 20.0%');
    expect(lines).toContain('Sales growth into 2026-27: +13.6%.');
    expect(text).toContain('In the lowest year the cash does not cover the debt service: Sales price 5% lower; Costs 10% higher;');
    expect(text).toContain("Our own tests beside the DSCR in section 1, not a lender's norm");
    // The Excel copy's figures are the engine's, exact: the hand fractions above.
    const sens = rowsOf(doc, 'Sensitivity'), fig = (label: string) => sens.find((r) => r.cells[0].text === label)!.cells.slice(1).map((c) => c.figure?.value);
    expect(fig('Sales price 5% lower')[0]).toBeCloseTo(1740250 / 1506000, 10);
    expect(fig('Sales price 5% lower')[1]).toBeCloseTo(316500 / 341000, 10);
    expect(fig('Costs 10% higher')[0]).toBeCloseTo(1497500 / 1506000, 10);
    expect(fig('Costs 10% higher')[1]).toBeCloseTo(250000 / 341000, 10);
    expect(fig('Cash left')).toEqual([-40750, -69000, 59500, 330750]);
    expect(fig('Cover: (A less working capital and capex) ÷ B')).toEqual([300250 / 341000, 433000 / 502000, 513500 / 454000, 539750 / 209000]);
  });
  it('holds no figure on paper the page did not already show or the user did not type (none is computed for the document)', () => {
    const sources = sourcesOf(CASE_AL, p);
    expect(figuresIn(text).filter((f) => !sources.includes(f))).toEqual([]);
  });
  it('the PDF and the Word copy: the sensitivity analysis on page 3, after the statement', async () => {
    const pages = await pdfPages(pdfOf(doc, MADE)), all = pages.join('\n');
    expect(pages[1]).toContain('The sensitivity analysis in section 2 tests this DSCR as a lender may; it does not change it.');
    expect(pages[1]).toMatch(/Authorised signatory/);
    expect(pages[2].split('\n')[1]).toBe('2. Sensitivity analysis');
    expect(pages[2]).toContain('Sales price 5% lower 1.16 0.93 2026-27');
    expect(pages[2]).toContain('Cash left -40,750 -69,000 59,500 3,30,750');
    expect(all).not.toMatch(/redone/);
    const word = (await docxLines(docxOf(doc, MADE))).lines.join('\n');
    expect(word).toContain('2. Sensitivity analysis');
    expect(word).not.toMatch(/redone/);
  });
  it('the Excel copy: the Sensitivity sheet after the statement, its figures as numbers and not one formula', async () => {
    const bytes = xlsxOf(doc, MADE), book: Sheet[] = await workbook(bytes);
    expect(book.map((x) => x.sheet)).toEqual(['At a glance', 'DSCR statement', 'Sensitivity', 'Basis', 'Repayment schedule']);
    expect(rowOf(sheetOf(book, 'Sensitivity'), 'Cash left')).toEqual(['Cash left', -40750, -69000, 59500, 330750]);
    expect(await formulaParts(bytes)).toEqual([]);
  });
});

describe('the address, the purpose and the GSTIN in the header (D2)', () => {
  const MORE = { ...A2, doc: { ...FACTS, address: '12 MIDC Road, Bhosari, Pune 411026', purpose: 'A new CNC machine', gstin: '27abcde1234f1z5' } };
  it('printed beside the lender when given, the GSTIN in capitals; none when not given', async () => {
    const { lines, doc } = build(MORE);
    expect(lines).toContain('Address: 12 MIDC Road, Bhosari, Pune 411026');
    expect(lines).toContain('Purpose: A new CNC machine');
    expect(lines).toContain('GSTIN: 27ABCDE1234F1Z5');
    expect(build(A2).text).not.toMatch(/Address|Purpose|GSTIN/);
    const head = (await pdfPages(pdfOf(doc, MADE)))[0].split('\n').slice(3, 8);
    expect(head).toEqual([
      'Lender Example Bank, Pune branch Prepared on 30-09-2026', 'Loan asked ₹12,00,000 at 12% a year, 12 instalments, equal principal every quarter',
      'Address 12 MIDC Road, Bhosari, Pune 411026', 'Purpose A new CNC machine GSTIN 27ABCDE1234F1Z5', 'Status Complete',
    ]);
  });
  it('a GSTIN without its shape is left out, and the document says so', () => {
    const { lines, p } = build({ ...MORE, doc: { ...MORE.doc, gstin: '27ABCDE1234' } });
    expect(lines.join('\n')).not.toContain('GSTIN:');
    expect(docStatus({ ...MORE, doc: { ...MORE.doc, gstin: '27ABCDE1234' } }, p)).toBe('1 question left, for the document');
  });
});
