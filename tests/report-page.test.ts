/**
 * The project report page's model (site/src/report/model.ts) and its document (document.ts), on fictional case R typed
 * as text (worked by hand in tests/report.test.ts). The files are read back by readers written by others.
 */
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import DATA from '../engine/data/report.json';
import { docText } from '../site/src/doc/doc';
import { docxOf } from '../site/src/doc/docx';
import { pdfOf } from '../site/src/doc/pdf';
import { xlsxOf } from '../site/src/doc/xlsx';
import { docStatus, fileName, reportDoc } from '../site/src/report/document';
import { AS_TYPED, EMPTY, applyPlan, assumptionsOf, boardOf, changedOf, fixView, inputOf, planOf, preview, statusText, undoPlan, viableOf, withMode, type ReportState } from '../site/src/report/model';
import { withLevers } from '../engine/plan';
import { F } from './fix.test';
import { benchmarkFields, levelsOf, withBenchmark } from '../site/src/board-model';
import { sameValue } from '../site/src/amount';
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
// Case P by products (tests/report.test.ts) as typed: two lines, three months to the first sales, PMEGP.
const P: ReportState = {
  ...EMPTY, borrower: 'firm', scheme: 'pmegp', category: 'general', area: 'rural', activity: 'manufacturing', pmegpConfirmed: true,
  cost: { ...EMPTY.cost, land: '2 L', building: '6 L', machinery: '20 L', preliminary: '50,000' },
  loan: { amount: '24 L', ratePct: '10', disbursed: 'Oct 2026', moratoriumMonths: '6', instalments: '48', repayment: 'monthly' },
  products: [{ name: 'Roasted chana', units: '2,500', price: '200' }, { name: 'Roasted peanuts', units: '1,500', price: '200' }], monthsToStart: '3', variablePct: '70', fixed: '12 L', fixedGrowth: '5', wcLimit: '3 L', wcRate: '11',
  doc: { name: 'Meera Foods', activity: 'Roasted snacks', address: 'Example village, Nashik', lender: '', preparedBy: '' },
};
const row = (p: ReturnType<typeof preview>, table: string, label: string) => p.view!.tables.find((t) => t.id === table)!.rows.find((r) => r.label === label);

describe('the project report page', () => {
  it('asks who the borrower is first, then each missing fact; the days are assumed and listed', () => {
    const p = preview(EMPTY);
    expect(p.needs[0]).toBe('Who the borrower is: it sets the tax');
    expect(p.needs).not.toContain('Days of stock, 0 to 365');
    expect(EMPTY.days).toEqual({ stock: '30', debtors: '30', creditors: '30' });
    expect(DATA.assumptions.map((a) => a.id)).toEqual(['simpleCost', 'simpleFunds', 'simpleDrawn', 'simpleMoratorium', 'simpleFixedGrowth', 'simpleWcRate', 'days', 'wcUsed', 'drawings', 'tax', 'utilisation', 'price',
      'guaranteeFee', 'guaranteeFirst', 'cgtmseOther', 'cgtmseRate', 'cgtmseWc', 'cgtmsePmegp']);
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
    expect(p.view!.key.find((k) => k.label === 'PMEGP margin money')?.value).toBe('Rs. 7,80,856');
    expect([row(p, 'sales', 'Units sold')?.values[0], row(p, 'sales', 'Total sales')?.values.slice(0, 2)]).toEqual(['4,500', ['14,40,000', '67,20,000']]);
    expect(row(p, 'pl', 'Months of sales')?.values).toEqual(['3', '12', '12', '12', '12']);
    expect(row(p, 'pl', 'Use of the capacity')?.values).toEqual(['60%', '70%', '80%', '80%', '80%']);
    expect(row(p, 'cf', 'Cash at the end of the year')?.values[0]).toBe('42,793');
  });
  it('PMEGP asks its three facts; cash below nil names the year and the amount, and keeps it provisional', () => {
    expect(preview({ ...P, category: undefined, area: undefined, activity: undefined }).needs.length).toBe(3);
    const q = preview({ ...P, fixed: '25 L' });
    expect(q.short).toBe('Cash goes below nil in 2030-31: Rs. 49,07,813 short at its lowest. The promoters would need that much more, or the costs or loans be changed, to keep it at nil or above.');
    expect(statusText(q)).toBe('Provisional: 1 still to answer');
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
    expect(text).not.toMatch(/assum|Tandon|Nayak|MPBF|(?<!cross-)checked/i);
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
    expect(docStatus(s, preview(s))).toBe('Figures complete; for the document, 1 still to answer');
    for (const page of await pdfPages(pdfOf(d, MADE))) expect(page.split('\n')[0]).toBe('Project report · Asha Packaging Provisional');
  });
});

describe('the PMEGP report to download', () => {
  const p = preview(P), doc = reportDoc(P, p, TODAY)!, text = docText(doc);
  it('names the scheme, the drivers and the rules used, with their source and date', () => {
    expect(text).toContain('Scheme: PMEGP; general category; a village; manufacturing');
    expect(text).toContain('Sales: Roasted chana: 2,500 a month at full running, at Rs. 200 a unit');
    expect(text).toContain('Sales by product');
    expect(text).toContain('Months from the loan to the first sales: 3');
    expect(text).toContain('PMEGP: the rules used');
    expect(text).toContain('The guideline of 2023: verified at its source on 20-10-2026.');
    expect(docStatus(P, p)).toBe('Complete');
  });
});

// Case R on Mudra (SCH1): a term loan of 12 lakh and a limit of 3 lakh, 15 lakh in all, so Tarun Plus. CGFMU's fee in
// 2026-27, the year of the first draw (April 2026), worked by hand: 1% of 12,00,000 for 12 months, 12,000, and 1% of the
// 3,00,000 limit from the first sales, 3,000: 15,000. With the promoters' most at 5 lakh: the cost of the project is
// case R's fixed assets and preliminary, 33,00,000, and its margin for working capital, the gap of 9,86,301 (case R's
// 4,86,301 margin with its 5,00,000 limit) less this 3,00,000 limit, 6,86,301: 39,86,301. Less 5,00,000 and Mudra's
// 20,00,000 less the limit, 17,00,000, it leaves 17,86,301 unfunded.
const M: ReportState = { ...R, scheme: 'mudra', tarunRepaid: true, loan: { ...R.loan, amount: '12 L' }, wcLimit: '3 L', collateral: '10 L' };
describe('the Mudra report (SCH1)', () => {
  const p = preview(M), text = docText(reportDoc(M, p, TODAY)!);
  it('names its level, takes no collateral and carries CGFMU\'s fee as a finance cost', () => {
    expect(p.needs).toEqual([]);
    expect(inputOf(M).collateral).toBeUndefined();
    expect(p.view!.key.find((k) => k.label === 'Mudra')?.value).toBe('Tarun Plus');
    expect(p.view!.key.find((k) => k.label === 'Guarantee fee (CGFMU)')?.value).toBe('1% a year');
    expect(row(p, 'pl', 'Less: guarantee fee (CGFMU)')?.values[0]).toBe('15,000');
    expect(row(p, 'finance', 'Term loan under Mudra (Tarun Plus), with no collateral')?.values).toEqual(['12,00,000']);
    expect(assumptionsOf(M).map((a) => a.id)).toContain('guaranteeFee');
    expect(text).toContain('Scheme: Mudra; a Tarun loan taken and repaid');
    expect(text).toContain('Mudra: the rules used');
    expect(text).toContain('The guarantee fee: CGFMU');
  });
  it('says when the promoters\' most and Mudra\'s 20 lakh cannot fund the project, and stops above Tarun unticked', () => {
    expect(planOf({ ...M, promotersMost: '5 L' })?.mudraShort).toContain('leave Rs. 17,86,301 of the project unfunded');
    expect(planOf({ ...M, promotersMost: '30 L' })?.mudraShort).toBeUndefined();
    expect(preview({ ...M, tarunRepaid: false }).needs[0]).toMatch(/^Mudra: the loans come to Rs\. 15,00,000, above Tarun's/);
  });
});

// Make it viable (D-UX-50, D-UX-52): case R with sales of 70 lakh misses; the figures are worked by hand in
// tests/viable.test.ts, with the 20 lakh limit's collateral.
describe('changed benchmarks on the page (BEN1)', () => {
  const weak = { ...R, sales: '70 L' };
  it('reads a figure or "5:1", leaves a blank or a wrong one to its default, and resets to untouched', () => {
    expect(levelsOf({ tolTnw: '5:1', dscrLowest: ' 0.8 ', currentRatio: 'abc', facr: '0', interestCover: '' })).toEqual({ tolTnw: 5, dscrLowest: 0.8 });
    expect(withBenchmark(withBenchmark(undefined, 'dscrLowest', '1.1'), 'dscrLowest', ' ')).toBeUndefined();
    const f = benchmarkFields('renewal', { currentRatio: 'x' });
    expect([f.length, f[0].byDefault, f[0].hint, f[0].error?.slice(0, 15), f.find((d) => d.id === 'dscrLowest')?.byDefault]).toEqual([8, '1.00', 'At least this.', 'Not understood.', '1.25']);
    // A box holds its default (OR4): the same figure typed back, however written, is the default.
    expect([sameValue('1.2', '1.20'), sameValue('60,70, 80', '60, 70, 80'), sameValue('', '0'), sameValue('1.3', '1.25')]).toEqual([true, true, false, false]);
  });
  it('a looser benchmark flips the verdict, says its default and warns', () => {
    const p = preview({ ...weak, benchmarks: { dscrLowest: '0.8', currentRatio: '0.9' } });
    expect(p.checks?.filter((c) => c.byDefault).map((c) => `${c.id} ${c.level} ${c.verdict} default ${c.byDefault} ${c.looser}`)).toEqual([
      'currentRatio 0.90 or more meets default 1.10 true', 'dscrLowest 0.80 or more meets default 1.25 true']);
    expect(p.misses).toBe('Misses 2 of 8 benchmarks: average DSCR and interest cover.');
    expect(p.benchmarks).toBe('Your benchmarks for current ratio and DSCR in the lowest year, in place of the defaults. Looser than the default for current ratio and DSCR in the lowest year: a pass here is one a bank may not give.');
    expect(preview(weak).benchmarks).toBeUndefined();
  });
});

describe('the lender\'s levels and make it viable, in words', () => {
  const weak = { ...R, sales: '70 L' };
  it('each ratio against its level in its worst year, and what misses', () => {
    const p = preview(weak);
    expect(p.checks?.map((c) => `${c.label} | ${c.level} | ${c.verdict} ${c.worst}`)).toEqual([
      'Current ratio | 1.10 or more | misses 0.94 in 2026-27', 'Total outside liabilities ÷ net worth | 5.00 or less | meets 3.58 in 2026-27',
      'Term loan ÷ net worth (debt-equity) | 4.00 or less | meets 2.49 in 2026-27', 'Average DSCR | 1.50 or more | misses 1.26 over the loan',
      'DSCR in the lowest year | 1.25 or more | misses 0.82 in 2026-27', 'Interest cover | 1.50 or more | misses 0.74 in 2026-27',
      'Fixed-asset cover | 1.20 or more | meets 1.39 in 2026-27', 'Security cover | 1.20 or more | meets 1.49 in 2026-27 on the project’s own assets',
    ]);
    expect([p.misses, p.collateralNote, p.longTerm]).toEqual(['Misses 4 of 8 benchmarks: current ratio, average DSCR, DSCR in the lowest year and interest cover.',
      undefined, undefined]);
    // The bars (the level at the middle) and the rupees short, rounded up from tests/viable.test.ts's hand figures.
    expect(p.checks?.map((c) => [c.id, c.bar.toFixed(1), c.short])).toEqual([
      ['currentRatio', '42.5', 'Short by Rs. 1,44,139 of current assets (stock, debtors and cash) in 2026-27.'], ['tolTnw', '35.8', undefined], ['debtEquity', '31.1', undefined],
      ['dscrAverage', '42.2', expect.stringMatching(/^Short by Rs\. [\d,]+ of cash to pay the loan, in total over the loan\.$/)],
      ['dscrLowest', '32.7', 'Short by Rs. 3,13,855 of cash to pay the loan in 2026-27.'], ['interestCover', '24.8', 'Short by Rs. 2,13,125 of profit before interest and tax in 2026-27.'],
      ['facr', '57.9', undefined], ['securityCover', '62.2', undefined],
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
    expect(viableOf(R)?.lines.map((l) => l.text)).toEqual(['To Rs. 82,20,000 in 2026-27 (from Rs. 1,20,00,000), and every ratio still meets its level.']);
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
    expect([b?.works, b?.verdict, b?.line]).toEqual([true, 'With these changes it meets every default benchmark ratio.', 'Meets every benchmark']);
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

// The fix beside the miss (OR2) on case F as typed on the page (tests/fix.test.ts works its figures by hand): the owner's
// OR1 figures, only the fixed-asset cover missing.
const FS: ReportState = {
  ...EMPTY, borrower: 'proprietor', cost: { ...EMPTY.cost, building: '50 L', machinery: '2.5 Cr' },
  loan: { amount: '2.5 Cr', ratePct: '9.3', disbursed: '2026-10', moratoriumMonths: '1', instalments: '180', repayment: 'emi' },
  products: [{ name: 'Widgets', units: '10,000', price: '1,500' }], monthsToStart: '1', utilisation: '60, 70, 80', priceGrowth: '0',
  variablePct: '60', fixed: '1.2 Cr', fixedGrowth: '5', wcLimit: '53 L', wcRate: '9.3',
};
describe('the fix beside the miss, in words, and used (OR2)', () => {
  it('names the cause in a line, then the two fixes, the least strained first', () => {
    expect(inputOf(FS)).toEqual(F);
    const f = fixView(FS);
    expect(f?.cause).toEqual(['Fixed-asset cover falls to 0.50 in 2035-36, against its benchmark of 1.20: the fixed assets, written down each year, lose value faster than the term loan is repaid.']);
    expect(f?.lead).toBe('Either change makes it work:');
    expect(f?.fixes.map((x) => x.text)).toEqual([
      'Repay in 10 years instead of 15 years and borrow Rs. 1,75,00,000 instead of Rs. 2,50,00,000: the promoters bring Rs. 75,00,000 more.',
      'Keep the repayment at 15 years and borrow Rs. 1,03,20,000 instead of Rs. 2,50,00,000: the promoters bring Rs. 1,46,80,000 more.']);
  });
  it('"Use this" writes the repayment and the loan, and then every level meets', () => {
    for (const [k, was] of [[0, ['Term loan: 2.5 Cr → 1,75,00,000', 'Instalments: 180 → 120']], [1, ['Term loan: 2.5 Cr → 1,03,20,000']]] as const) {
      const { s, changes } = applyPlan(FS, fixView(FS)!.fixes[k].levers);
      expect(changes.map((c) => `${c.label}: ${c.was} → ${c.now}`)).toEqual(was);
      expect([preview(s).misses, fixView(s)]).toEqual([undefined, undefined]);
    }
  });
  it('"Make it viable" opens on the same fix, asks once for the promoters\' Rs. 75,00,000 more, and works (OR2b)', () => {
    const q = planOf(FS)!, b = boardOf(q, q.levers);
    expect(q.ask).toBe('This needs Rs. 75,00,000 more from the promoters: can you bring it?');
    expect(q.levers).toEqual(fixView(FS)!.fixes[0].levers);
    expect(b.steps).toEqual(['A term loan of Rs. 1,75,00,000 (now Rs. 2,50,00,000), the promoters bringing the rest.', '120 instalments (now 180).']);
    expect([b.works, b.line, b.moves.instalments.move, b.moves.instalments.min]).toEqual([true, 'Meets every benchmark', '60 fewer', 12 - 180]);
    expect(q.cards.find((c) => c.id === 'instalments')?.head).toBe('A shorter repayment');
    // Typed, the box asks no more; within the most the plan stays; under it the plan says what the fix needs.
    expect(planOf({ ...FS, promotersMost: '2 Cr' })?.ask).toBeUndefined();
    expect(planOf({ ...FS, promotersMost: '2 Cr' })?.levers).toEqual(q.levers);
    const short = planOf({ ...FS, promotersMost: '1 Cr' })!;
    expect(short.short).toMatch(/^The first change above that makes it work needs the promoters to bring Rs\. 1,60,76,7\d\d in all, more than the Rs\. 1,00,00,000 they can\.$/);
    expect(boardOf(short, short.levers).works).toBe(false);
    // At the slider's end, 12 instalments, the lowest-year DSCR still meets; "Use this plan" writes the same as "Use this".
    expect(boardOf(q, { ...q.levers, instalments: q.fewest }).checks?.find((c) => c.id === 'dscrLowest')?.verdict).toBe('meets');
    expect(applyPlan(FS, q.levers).changes.map((c) => `${c.label}: ${c.was} → ${c.now}`)).toEqual(['Term loan: 2.5 Cr → 1,75,00,000', 'Instalments: 180 → 120']);
  });
  it('says so when neither a shorter repayment nor a smaller loan meets it', () => {
    const f = fixView({ ...FS, products: [{ name: 'Widgets', units: '10,000', price: '600' }] });
    expect(f?.cause.some((c) => c.startsWith('Current ratio falls to ') && c.endsWith(': the current assets are thin against the short-term debts.'))).toBe(true);
    expect([f?.fixes, f?.lead, f?.none]).toEqual([[], undefined, 'Neither a shorter repayment nor a smaller term loan meets it: “Make it viable” works out what else can.']);
  });
});

// Simple mode (D-UX-112) on case P's products, the day being 15-10-2026: sales from January 2027, so the loan is drawn
// this month with a moratorium of 3 months; 4 years to repay (48 EMIs); fixed costs 1,00,000 a month (12,00,000 a year)
// growing 5%; the limit at the loan's rate, worked out: 96,00,000 a year at full running × 60% = 57,60,000; the need
// (22.5 × 57,60,000 − 7.5 × 40,32,000) ÷ 365 = 2,72,219.18 (again: 75% × (3,31,397.26 + 4,73,424.66) − 3,31,397.26),
// below the turnover method's 11,52,000.
describe('simple and expert modes', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-15T10:00:00Z')); });
  afterEach(() => { vi.useRealTimers(); });
  const S: ReportState = {
    ...EMPTY, mode: 'simple', borrower: 'firm', cost: { ...EMPTY.cost, building: '6 L', machinery: '20 L' }, products: P.products, sellFrom: '2027-01',
    variablePct: '70', fixedMonth: '1 L', loan: { ...EMPTY.loan, amount: '20 L', ratePct: '10' }, years: '4', wcBy: 'worked', security: 'neither', doc: P.doc,
  };
  it('the fix writes whole years to repay in simple mode (OR2)', () => {
    const T: ReportState = { ...FS, mode: 'simple', sellFrom: '2026-11', fixed: '', fixedMonth: '10 L', loan: { ...EMPTY.loan, amount: '2.5 Cr', ratePct: '9.3' }, years: '15', wcBy: 'typed', security: 'neither' };
    const f = fixView(T)!, { s, changes } = applyPlan(T, f.fixes[0].levers);
    expect(inputOf(T).loan).toEqual(F.loan);
    expect(changes.map((c) => `${c.label}: ${c.was} → ${c.now}`)).toEqual(['Term loan: 2.5 Cr → 1,75,00,000', 'Instalments: 180 → 120']);
    expect([s.years, preview(s).misses]).toEqual(['10', undefined]);
  });
  it('simple mode fills what it assumes, and works the limit out', () => {
    const x = inputOf(S);
    expect(x.loan).toEqual({ amount: 2000000, ratePct: 10, disbursed: '2026-10', moratoriumMonths: 3, instalments: 48, frequency: 'monthly', style: 'emi' });
    expect([x.monthsToStart, x.fixedCosts, x.fixedGrowthPct, x.wcRatePct, x.collateral, x.guarantee]).toEqual([3, 1200000, 5, 10, undefined, undefined]);
    expect(x.wcLimit?.toFixed(2)).toBe('272219.18');
    expect(preview(S).view).toBeDefined();
    expect(assumptionsOf(S).map((a) => a.id).slice(0, 6)).toEqual(['simpleCost', 'simpleFunds', 'simpleDrawn', 'simpleMoratorium', 'simpleFixedGrowth', 'simpleWcRate']);
    expect(assumptionsOf({ ...S, mode: 'expert' }).map((a) => a.id)).not.toContain('simpleCost');
  });
  it('asks in its own words, and never assumes the backing', () => {
    const n = preview({ ...EMPTY, mode: 'simple' }).needs;
    expect(n).toEqual(expect.arrayContaining(['When you will start selling', 'Years to repay', 'Fixed costs a month', 'The working-capital limit: worked out, your own figure, or none', 'What backs the loan besides the project\'s own assets']));
    expect(n.filter((t) => /moratorium|first drawn|limit: its interest|Fixed costs: growth/.test(t))).toEqual([]);
    expect(preview({ ...S, security: undefined }).needs).toEqual(['What backs the loan besides the project\'s own assets']);
    expect(preview({ ...S, sellFrom: '2026-08' }).needs).toEqual(['When you will start selling: the month the loan is first drawn or later']);
    expect(inputOf({ ...S, security: 'cgtmse' }).guarantee).toEqual({ cgtmse: true, concessions: 0 });
    expect(inputOf({ ...S, security: 'neither', collateral: '30 L' }).collateral).toBeUndefined();
  });
  it('switching writes the answers into the expert fields and takes them back', () => {
    const e = withMode(S, 'expert');
    expect([e.loan.disbursed, e.loan.moratoriumMonths, e.loan.instalments, e.loan.repayment, e.monthsToStart, e.fixed, e.fixedGrowth, e.wcRate, e.cgtmse])
      .toEqual(['2026-10', '3', '48', 'emi', '3', '12,00,000', '5', '10', false]);
    expect(inputOf(e)).toEqual(inputOf(S));
    const back = withMode(e, 'simple');
    expect([back.sellFrom, back.years, back.fixedMonth, back.loan.disbursed, back.loan.moratoriumMonths, back.fixedGrowth, back.wcRate]).toEqual(['2027-01', '4', '1,00,000', '', '', '', '']);
    expect([inputOf(back), changedOf(back)]).toEqual([inputOf(S), []]);
    const six = withMode({ ...e, loan: { ...e.loan, moratoriumMonths: '6' }, days: { ...e.days, debtors: '45' } }, 'simple');
    expect(changedOf(six)).toEqual(['A moratorium of 6 months', 'Days of debtors 45']);
    expect(assumptionsOf(six).map((a) => a.id)).not.toContain('simpleMoratorium');
    const early = withMode({ ...EMPTY, mode: 'simple', borrower: 'firm', loan: { ...EMPTY.loan, ratePct: '10' } }, 'expert');
    expect([early.loan.disbursed, early.loan.repayment, early.loan.moratoriumMonths, early.fixedGrowth, early.wcRate]).toEqual(['', undefined, '', '', '']);
  });
  it('the plan writes simple mode\'s own fields', () => {
    const l = { ...AS_TYPED, fixed: 33, instalments: 7 }, { s, changes } = applyPlan(S, l), want = withLevers(inputOf(S), l);
    expect(changes.map((c) => c.field)).toEqual(['fld-fixedMonth', 'fld-years']);
    expect(inputOf(s).loan.instalments).toBe(want.loan.instalments);
    expect(Math.abs((inputOf(s).fixedCosts as number) - (want.fixedCosts as number))).toBeLessThan(1);
  });
  it('costs by head are named in the profit and loss, and add up to the same profit', () => {
    const H: ReportState = { ...R, variablePct: '', fixed: '', heads: { variable: { materials: '55', power: '6', otherVariable: '4' },
      fixed: { wages: '80,000', rent: '25,000', repairs: '10,000', insurance: '5,000', admin: '30,000' } } };
    const p = preview(H), labels = p.view!.tables.find((t) => t.id === 'pl')!.rows.map((r) => r.label);
    expect(labels.slice(labels.indexOf('Sales') + 1, labels.indexOf('Sales') + 9)).toEqual(['Less: materials', 'Less: power and fuel', 'Less: other variable costs',
      'Less: wages and salaries', 'Less: rent', 'Less: repairs and maintenance', 'Less: insurance', 'Less: admin and other overheads']);
    expect([row(p, 'pl', 'Less: materials')?.values[0], row(p, 'pl', 'Profit after tax')?.values[0]]).toEqual(['66,00,000', row(preview(R), 'pl', 'Profit after tax')?.values[0]]);
  });
});
