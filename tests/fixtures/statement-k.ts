/**
 * A fictional audited statement made for U1's tests (D-UX-48): case K's company (tests/cma.test.ts, site/src/cma/example.ts)
 * for the year ended 31 March 2026 with 31 March 2025 beside it, in lakh, laid out the way a small company's Schedule III
 * statement is, with notes that split the heads a CMA needs. Nobody's real figures. Its heads were worked by hand from
 * case K's 2025-26 and 2024-25 figures, so that reading it gives back case K's a3 and a2 (the test checks that):
 *   materials 256.00 + (3.00) = 253 (prev 226.50 + (2.50) = 224); finance costs 7.00 + 2.50 = 9.50 (6.00 + 3.00 = 9.00);
 *   tax 9.60 + 0.50 = 10.10 (8.30 + 0.50 = 8.80); total expenses 256 − 3 + 39 + 25 + 9.5 + 7 + 19 = 352.50 (312.00);
 *   PBT 393 − 352.5 = 40.50 (347 − 312 = 35.00); profit 40.5 − 10.1 = 30.40 (35 − 8.8 = 26.20);
 *   reserves 11.20 + 30.40 − 18.00 = 23.60 (0 + 26.20 − 15.00 = 11.20);
 *   term loan 12.00 non-current + 6.00 current = 18 (18.00 + 6.00 = 24); other current 7.50 + 2.50 = 10 (6.80 + 2.20 = 9);
 *   total equity and liabilities 30 + 23.6 + 27 + 66 + 32 + 7.5 + 2.5 = 188.60 (30 + 11.2 + 33 + 58 + 28 + 6.8 + 2.2 = 169.20);
 *   total assets 62 + 6 + 46 + 43 + 23.6 + 8 = 188.60 (60 + 5 + 40 + 38 + 19.2 + 7 = 169.20).
 */
import type { Doc, Row } from '../../site/src/doc/doc';
import { pdfOf } from '../../site/src/doc/pdf';

const row = (label: string, note: string, cur: string, prev: string, kind?: Row['kind']): Row =>
  ({ cells: [{ text: label }, { text: note }, { text: cur }, { text: prev }], ...(kind ? { kind } : {}) });
const head = (label: string): Row => ({ cells: [{ text: label }, { text: '' }, { text: '' }, { text: '' }], kind: 'head' });
const COLS = [{ label: 'Particulars' }, { label: 'Note' }, { label: '31 March 2026' }, { label: '31 March 2025' }];
const table = (rows: Row[]) => ({ kind: 'table' as const, table: { columns: COLS, rows } });

export const STATEMENT_K: Doc = {
  title: 'K Steel Furniture Private Limited: financial statements 2025-26',
  header: 'K Steel Furniture Private Limited (fictional, made for a test)',
  footer: 'Fictional statement for testing; not a real company',
  creator: 'finance-tools test',
  parts: [
    { name: 'Balance sheet', blocks: [
      { kind: 'title', text: 'Balance sheet as at 31 March 2026' },
      { kind: 'text', text: 'All amounts in Rs. lakh unless stated otherwise' },
      table([
        head('Equity and liabilities'),
        row('Share capital', '1', '30.00', '30.00'),
        row('Reserves and surplus', '2', '23.60', '11.20'),
        row('Long-term borrowings', '3', '27.00', '33.00'),
        row('Short-term borrowings', '4', '66.00', '58.00'),
        row('Trade payables', '', '32.00', '28.00'),
        row('Other current liabilities', '', '7.50', '6.80'),
        row('Short-term provisions', '', '2.50', '2.20'),
        row('Total equity and liabilities', '', '188.60', '169.20', 'total'),
        head('Assets'),
        row('Property, plant and equipment', '', '62.00', '60.00'),
        row('Non-current investments', '', '6.00', '5.00'),
        row('Inventories', '', '46.00', '40.00'),
        row('Trade receivables', '', '43.00', '38.00'),
        row('Cash and bank balances', '', '23.60', '19.20'),
        row('Short-term loans and advances', '', '8.00', '7.00'),
        row('Total assets', '', '188.60', '169.20', 'total'),
      ]),
    ] },
    { name: 'Profit and loss', blocks: [
      { kind: 'title', text: 'Statement of profit and loss for the year ended 31 March 2026' },
      table([
        row('Revenue from operations (net of GST)', '', '390.00', '345.00'),
        row('Other income', '', '3.00', '2.00'),
        row('Total income', '', '393.00', '347.00', 'total'),
        row('Cost of materials consumed', '', '256.00', '226.50'),
        row('Changes in inventories of finished goods', '', '(3.00)', '(2.50)'),
        row('Direct expenses (wages, power)', '', '39.00', '34.00'),
        row('Employee benefits expense', '', '25.00', '22.00'),
        row('Finance costs', '5', '9.50', '9.00'),
        row('Depreciation', '', '7.00', '6.00'),
        row('Other expenses', '', '19.00', '17.00'),
        row('Total expenses', '', '352.50', '312.00', 'total'),
        row('Profit before tax', '', '40.50', '35.00'),
        row('Current tax', '', '9.60', '8.30'),
        row('Deferred tax', '', '0.50', '0.50'),
        row('Profit for the year', '', '30.40', '26.20', 'total'),
      ]),
    ] },
    { name: 'Notes', blocks: [
      { kind: 'title', text: 'Notes to the financial statements' },
      table([
        head('1 Share capital'),
        row('Equity shares of Rs. 10 each, fully paid', '', '30.00', '30.00'),
        head('2 Reserves and surplus'),
        row('Opening balance', '', '11.20', '0.00'),
        row('Add: profit for the year', '', '30.40', '26.20'),
        row('Less: dividend paid', '', '18.00', '15.00'),
        row('Closing balance', '', '23.60', '11.20', 'total'),
        head('3 Long-term borrowings'),
        row('Term loan from bank, secured', '', '12.00', '18.00'),
        row('Unsecured loans from directors', '', '15.00', '15.00'),
        head('4 Short-term borrowings'),
        row('Cash credit from bank, secured', '', '60.00', '52.00'),
        row('Current maturities of long-term debt', '', '6.00', '6.00'),
        head('5 Finance costs'),
        row('Interest on cash credit', '', '7.00', '6.00'),
        row('Interest on term loan', '', '2.50', '3.00'),
      ]),
    ] },
  ],
};

export const statementK = () => pdfOf(STATEMENT_K, new Date('2026-06-30T00:00:00Z'));

/** What a reader would point to for each head, by the line's opening words and the number on it (1 = this year's). */
export const POINTS_K: [head: string, labels: string[]][] = [
  ['sales', ['Revenue from operations']], ['otherIncome', ['Other income']],
  ['materials', ['Cost of materials consumed', 'Changes in inventories']], ['otherDirect', ['Direct expenses']],
  ['employees', ['Employee benefits']], ['sga', ['Other expenses']], ['depreciation', ['Depreciation']],
  ['wcInterest', ['Interest on cash credit']], ['tlInterest', ['Interest on term loan']], ['tax', ['Current tax', 'Deferred tax']],
  ['drawings', ['Less: dividend paid']], ['capital', ['Share capital']], ['reserves', ['Reserves and surplus']],
  ['promoterLoans', ['Unsecured loans from directors']], ['termLoans', ['Term loan from bank', 'Current maturities']],
  ['tlDue12', ['Current maturities']], ['bankWc', ['Cash credit from bank']], ['creditors', ['Trade payables']],
  ['otherCl', ['Other current liabilities', 'Short-term provisions']], ['netBlock', ['Property, plant']],
  ['nonCurrent', ['Non-current investments']], ['stock', ['Inventories']], ['debtors', ['Trade receivables']],
  ['cash', ['Cash and bank balances']], ['otherCa', ['Short-term loans and advances']],
];
export const TOTALS_K: [total: string, label: string][] = [['liabilities', 'Total equity and liabilities'], ['assets', 'Total assets'], ['profit', 'Profit for the year']];
