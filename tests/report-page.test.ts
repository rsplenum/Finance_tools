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
import { AS_TYPED, EMPTY, applyPlan, assumptionsOf, boardOf, inputOf, planOf, preview, statusText, undoPlan, viableOf, type ReportState } from '../site/src/report/model';
import { withLevers } from '../engine/plan';
import { SITE_NAME } from '../site/src/site';
import { docxLines, pdfPages, workbook } from '../scripts/read-doc.mjs';

const TODAY = '2026-10-02', MADE = new Date('2026-10-02T10:00:00Z');
const R: ReportState = {
  ...EMPTY, borrower: 'firm',
  cost: { ...EMPTY.cost, building: '10 L', machinery: '20 L', furniture: '2 L', preliminary: '1 L' },
  loan: { amount: '25 L', ratePct: '10', disbursed: '2026-04', moratoriumMonths: '0', instalments: '60', repayment: 'monthly' },
  salesBy: 'typed', monthsToStart: '0', sales: '1.2 Cr', salesGrowth: '10', variablePct: '65', fixed: '18 L', fixedGrowth: '5', wcLimit: '5 L', wcRate: '11',
  doc: { name: 'Asha Packaging', activity: 'Manufacture of corrugated boxes', address: 'Plot 4, Example MIDC, Pune', lender: '', preparedBy: '' },
};
// Case P (tests/report.test.ts) as typed: the capacity, its price, three months to the first sales, PMEGP.
const P: ReportState = {
  ...EMPTY, borrower: 'firm', scheme: 'pmegp', category: 'general', area: 'rural', activity: 'manufacturing',
  cost: { ...EMPTY.cost, land: '2 L', building: '6 L', machinery: '20 L', preliminary: '50,000' },
  loan: { amount: '24 L', ratePct: '10', disbursed: 'Oct 2026', moratoriumMonths: '6', instalments: '48', repayment: 'monthly' },
  capacity: '50,000', price: '200', monthsToStart: '3', variablePct: '70', fixed: '12 L', fixedGrowth: '5', wcLimit: '3 L', wcRate: '11',
  doc: { name: 'Meera Foods', activity: 'Roasted snacks', address: 'Example village, Nashik', lender: '', preparedBy: '' },
};
const row = (p: ReturnType<typeof preview>, table: string, label: string) => p.view!.tables.find((t) => t.id === table)!.rows.find((r) => r.label === label);

describe('the project report page', () => {
  it('asks who the borrower is first, then each missing fact; the days are assumed and listed', () => {
    const p = preview(EMPTY);
    expect(p.needs[0]).toBe('Who the borrower is: it sets the tax');
    expect(p.needs).not.toContain('Days of stock, 0 to 365');
    expect(EMPTY.days).toEqual({ stock: '30', debtors: '30', creditors: '30' });
    expect(DATA.assumptions.map((a) => a.id)).toEqual(['days', 'wcUsed', 'drawings', 'tax', 'utilisation', 'price']);
    expect(assumptionsOf(EMPTY).length).toBe(6);
    expect(assumptionsOf({ ...EMPTY, salesBy: 'typed' }).map((a) => a.id)).toEqual(['days', 'wcUsed', 'drawings', 'tax']);
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
  it('case P as typed: the drivers, three months of sales and the PMEGP margin money', () => {
    const p = preview(P);
    expect([p.needs, p.flags, p.short]).toEqual([[], [DATA.schemes.pmegp.notice], undefined]);
    expect(p.view!.key.find((k) => k.label === 'PMEGP margin money')?.value).toBe('Rs. 7,85,788');
    expect(row(p, 'pl', 'Months of sales')?.values).toEqual(['3', '12', '12', '12', '12']);
    expect(row(p, 'pl', 'Use of the capacity')?.values).toEqual(['60%', '70%', '80%', '80%', '80%']);
    expect(row(p, 'cf', 'Cash at the end of the year')?.values[0]).toBe('61,039');
  });
  it('PMEGP asks its three facts; cash below nil names the year and the amount, and keeps it provisional', () => {
    expect(preview({ ...P, category: undefined, area: undefined, activity: undefined }).needs.length).toBe(3);
    const q = preview({ ...P, fixed: '25 L' });
    expect(q.short).toBe('Cash goes below nil in 2030-31: Rs. 45,18,203 short at its lowest. The promoters would need that much more, or the costs or loans be changed, to keep it at nil or above.');
    expect(statusText(q)).toBe('Provisional: 1 still needed');
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

describe('the PMEGP report to download', () => {
  const p = preview(P), doc = reportDoc(P, p, TODAY)!, text = docText(doc);
  it('names the scheme, the drivers and the rules used, with their source and date', () => {
    expect(text).toContain('Scheme: PMEGP; general category; a village; manufacturing');
    expect(text).toContain('Capacity: 50,000 units a year at Rs. 200 a unit, the price growing 0% a year');
    expect(text).toContain('Months from the loan to the first sales: 3');
    expect(text).toContain('PMEGP: the rules used');
    expect(text).toContain('As read on 11-10-2026; not yet checked against KVIC');
    expect(docStatus(P, p)).toBe('Complete');
  });
});

// Make it viable (D-UX-50, D-UX-52): case R with sales of 70 lakh misses; the figures are worked by hand in
// tests/viable.test.ts, with the 20 lakh limit's collateral.
describe('the lender\'s levels and make it viable, in words', () => {
  const weak = { ...R, sales: '70 L' };
  it('each ratio against its level in its worst year, and what misses', () => {
    const p = preview(weak);
    expect(p.checks?.map((c) => `${c.label} | ${c.level} | ${c.verdict} ${c.worst}`)).toEqual([
      'Current ratio | 1.10 or more | misses 0.94 in 2026-27', 'Total outside liabilities ÷ net worth | 5.00 or less | meets 3.58 in 2026-27',
      'Term loan ÷ net worth (debt-equity) | 4.00 or less | meets 2.49 in 2026-27', 'Average DSCR | 1.50 or more | misses 1.26 over the loan',
      'DSCR in the lowest year | 1.25 or more | misses 0.82 in 2026-27', 'Interest cover | 1.50 or more | misses 0.74 in 2026-27',
      'Fixed-asset cover | 1.20 or more | meets 1.39 in 2026-27', 'Security cover | 1.20 or more | wait Type the collateral’s value',
    ]);
    expect([p.misses, p.collateralNote, p.longTerm]).toEqual(['It misses 4 of a lender’s levels: current ratio, average DSCR, DSCR in the lowest year and interest cover.',
      'Security cover: the project’s own assets reach 1.20 without collateral.', undefined]);
    // The bars (the level at the middle) and the rupees short, rounded up from tests/viable.test.ts's hand figures.
    expect(p.checks?.map((c) => [c.id, c.bar.toFixed(1), c.short])).toEqual([
      ['currentRatio', '42.5', 'Short by Rs. 1,44,139 of current assets (stock, debtors and cash) in 2026-27.'], ['tolTnw', '35.8', undefined], ['debtEquity', '31.1', undefined],
      ['dscrAverage', '42.2', expect.stringMatching(/^Short by Rs\. [\d,]+ of cash to pay the loan, in total over the loan\.$/)],
      ['dscrLowest', '32.7', 'Short by Rs. 3,13,855 of cash to pay the loan in 2026-27.'], ['interestCover', '24.8', 'Short by Rs. 2,13,125 of profit before interest and tax in 2026-27.'],
      ['facr', '57.9', undefined], ['securityCover', '0.0', undefined],
    ]);
  });
  it('the borrower\'s changes first, then the lender\'s, each a card with how far it moves and what it fixes', () => {
    const v = viableOf(weak);
    expect(v?.lines.map((l) => [l.by, l.text])).toEqual([
      ['borrower', 'Sales 17.3% higher in every year: Rs. 82,11,000 in 2026-27 instead of Rs. 70,00,000.'],
      ['borrower', 'A term loan of at most Rs. 9,35,779 (now Rs. 25,00,000), the promoters bringing Rs. 15,64,221 more.'],
      ['borrower', 'A working-capital limit of at most Rs. 3,80,877 (now Rs. 5,00,000), the promoters bringing Rs. 1,19,123 more as margin.'],
      ['lender', expect.stringMatching(/^A moratorium of \d+ months \(now 0\), the whole term within 180 months\.$/)],
      ['lender', expect.stringMatching(/^\d+ monthly instalments, .+ \(now 60\), the whole term within 180 months\.$/)],
    ]);
    expect(v?.lines.map((l) => [l.head, l.move])).toEqual([['Higher sales', '+17.3%'], ['A smaller term loan', 'Rs. 15,64,221 less'], ['A smaller working-capital limit', 'Rs. 1,19,123 less'],
      ['A longer moratorium', expect.stringMatching(/^\+\d+ months?$/)], ['A longer repayment', expect.stringMatching(/^\+\d+ instalments?$/)]]);
    expect(v?.lines[0].bars).toEqual({ now: expect.closeTo(7000000, 6), to: expect.closeTo(8211000, 6), nowText: 'Rs. 70,00,000', toText: 'Rs. 82,11,000' });
    expect([v?.lines[0].reach, v?.lines[2].fixes, v?.lines[2].still]).toEqual([undefined, ['current ratio'], ['average DSCR', 'DSCR in the lowest year', 'interest cover']]);
    expect(v?.lines[2].note).toMatch(/^Cash still goes below nil/);
    expect([v?.lines[3].fixes, v?.lines[3].still]).toEqual([['current ratio', 'average DSCR', 'DSCR in the lowest year'], ['interest cover', 'fixed-asset cover']]);
  });
  it('as typed, it meets and says how far sales can fall', () => {
    expect(preview(R).misses).toBeUndefined();
    expect(viableOf(R)?.lines.map((l) => l.text)).toEqual(['Sales can fall 31.5%, to Rs. 82,20,000 in 2026-27 (from Rs. 1,20,00,000), and every ratio still meets its level.']);
  });
  it('the collateral typed: its values in the report, the security cover read, and the collateral it needs', () => {
    const s = { ...R, wcLimit: '20 L', collateral: '3 L' }, p = preview(s), v = viableOf(s);
    expect(p.checks?.at(-1)).toEqual({ id: 'securityCover', label: 'Security cover', level: '1.20 or more', worst: '1.17 in 2026-27', verdict: 'misses', at: 'least',
      bar: expect.closeTo(48.7, 1), short: expect.stringMatching(/^Short by Rs\. 1,22,60[34] of security in 2026-27\.$/) });
    expect(p.view?.tables.find((t) => t.id === 'collateral')?.rows.map((r) => r.values[0])).toEqual(['3,00,000', '2,70,000', '2,40,000']);
    expect(v?.lines.find((l) => l.id === 'collateral')?.text).toBe('Collateral with a market value of Rs. 4,36,226 (now Rs. 3,00,000), for the security cover.');
    expect(v?.lines.find((l) => l.id === 'wc')?.text).toBe('A working-capital limit of at most Rs. 18,97,831 (now Rs. 20,00,000), with no more margin from the promoters.');
  });
  it('a term past 180 months is named', () => {
    expect(preview({ ...R, loan: { ...R.loan, moratoriumMonths: '12', instalments: '170' } }).longTerm).toBe('The term loan runs 182 months with its moratorium, beyond the 180 months an MSME term loan commonly runs at most.');
  });
});

// The combined plan (MV3) on case R at 70 lakh, the promoters able to bring 12 lakh in all: the levers worked by hand in
// tests/plan.test.ts (a limit 1,19,123 less, a term loan 1,23,260 less, sales 14.3% higher), here in words and written back.
describe('the plan on the board, in words, used and undone', () => {
  const weak: ReportState = { ...R, sales: '70 L', promotersMost: '12 L' };
  const q = planOf(weak), b = q && boardOf(q, q.levers);
  it('the steps in order, the promoters within their most, the limits kept', () => {
    expect(q?.levers).toEqual({ ...AS_TYPED, wc: 119123, promoters: 123260, sales: 143 });
    expect(b?.steps).toEqual([
      'A working-capital limit of Rs. 3,80,877 (now Rs. 5,00,000).',
      'A term loan of Rs. 23,76,740 (now Rs. 25,00,000), the promoters bringing the rest.',
      'Sales of Rs. 80,01,000 in a full first year (now Rs. 70,00,000), 14.3% higher.']);
    expect([b?.works, b?.verdict, b?.line]).toEqual([true, 'With these changes it meets every lender’s level that can be read.', 'Meets every level']);
    expect(b?.promoters).toBe('The promoters bring Rs. 11,99,999 in all (now Rs. 8,75,342), within the Rs. 12,00,000 they can.');
    expect(q?.atLimit).toBe('At the limit: the promoters’ money.');
    expect(q?.limits).toMatch(/^The limits kept: the promoters bring at most Rs\. 12,00,000 in all; sales with no limit known/);
    expect(q?.cards.map((c) => c.id)).toEqual(['wc', 'promoters', 'unsecured', 'fixed', 'sales', 'moratorium', 'instalments']);
    expect([b?.moves.sales.move, b?.moves.sales.to, b?.moves.fixed.move]).toEqual(['+14.3%', 'Rs. 80,01,000 in a full first year', 'As typed']);
  });
  it('a slider moved back: still misses, named with its shortfall; the most passed is said', () => {
    const c = q && boardOf(q, { ...q.levers, sales: 100 });
    expect(c?.works).toBe(false);
    expect(c?.line).toBe('Misses 1: DSCR in the lowest year');
    expect(c?.still[0]).toMatch(/^DSCR in the lowest year: 1\.1\d in 2026-27, level 1\.25 or more\. Short by Rs\. [\d,]+ of cash to pay the loan in 2026-27\.$/);
    expect(q && boardOf(q, { ...q.levers, promoters: 200000 }).promoters).toMatch(/: Rs\. 76,7\d\d more than the Rs\. 12,00,000 they can\.$/);
  });
  it('"Use this plan" writes the engine\'s figures, and undo puts back only those still as written', () => {
    const { s, changes } = applyPlan(weak, q!.levers);
    expect(changes.map((c) => `${c.label}: ${c.was} → ${c.now}`)).toEqual(['Term loan: 25 L → 23,76,740', 'Working-capital limit: 5 L → 3,80,877', 'Sales: 70 L → 80,01,000']);
    expect(inputOf(s)).toEqual(withLevers(inputOf(weak), q!.levers));
    expect(undoPlan(s, changes)).toEqual(weak);
    expect(undoPlan({ ...s, wcLimit: '4 L' }, changes)).toEqual({ ...weak, wcLimit: '4 L' });
  });
  it('every lever written back is the figure the engine worked on, by the drivers too', () => {
    const all = { wc: 1000, promoters: 50000, unsecured: 25000, fixed: 33, sales: 77, collateral: 150000, moratorium: 3, instalments: 7 };
    for (const t of [{ ...weak, collateral: '2 L' }, P]) expect(inputOf(applyPlan(t, all).s)).toEqual(withLevers(inputOf(t), all));
    expect(applyPlan(P, { ...AS_TYPED, sales: 100 }).changes.map((c) => c.now)).toEqual(['66, 77, 85']);
  });
});
