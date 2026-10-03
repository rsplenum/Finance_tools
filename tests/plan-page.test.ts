/**
 * The planning estimate's page (site/src/estimate/plan.ts) and its document (plan-document.ts), on fictional flats: a
 * 2BHK of 1,000 sq ft in Pune, whose rooms, measurements and rates are worked by hand in tests/architect.test.ts and
 * tests/library.test.ts. Every figure on the page is the engine's; these tests check that the page and the document
 * word them faithfully, and the files are read back by readers written by others (scripts/read-doc.mjs).
 */
import { describe, it, expect } from 'vitest';
import { architect, strip, type ArchitectEstimate } from '../engine/architect';
import { inr } from '../engine/util';
import { docText } from '../site/src/doc/doc';
import { docxOf } from '../site/src/doc/docx';
import { pdfOf, printable } from '../site/src/doc/pdf';
import { xlsxOf } from '../site/src/doc/xlsx';
import { EMPTY_PLAN, drawerView, inputOf, planNeeds, planPreview, withItem, withKind, withLevel, withSlider, type PlanState } from '../site/src/estimate/plan-model';
import { planDoc, planDocStatus, planFileName } from '../site/src/estimate/plan-document';
import { SITE_NAME } from '../site/src/site';
import { docxLines, pdfPages, workbook } from '../scripts/read-doc.mjs';

const TODAY = '2026-10-03', MADE = new Date('2026-10-03T10:00:00Z');
const FLAT: PlanState = { ...EMPTY_PLAN, kind: 'renovate', home: 'flat', city: 'pune', area: '1,000', bhk: '2', level: 2 };
const view = (s: PlanState) => planPreview(s).view!;

describe('the six questions', () => {
  it('nothing answered: the six, in the order asked', () => {
    expect(planNeeds(EMPTY_PLAN)).toEqual(['What the work is: repair or renovate, or interiors', 'Flat or house', 'Which city', 'The carpet area', 'How many bedrooms', 'Which level']);
    expect(planPreview({ ...FLAT, home: undefined }).needs).toEqual(['Flat or house']);
  });
  it('a carpet area not understood is asked again; one in sq m is the engine\'s too', () => {
    expect(planNeeds({ ...FLAT, area: 'nine hundred' })).toEqual(['The carpet area']);
    expect(inputOf({ ...FLAT, area: '92.9', unit: 'sqm' })).toMatchObject({ area: 92.9, areaUnit: 'sqm' });
    expect(view({ ...FLAT, area: '92.9', unit: 'sqm' }).area).toBe('92.9 sq m (999.97 sq ft)');
  });
  it('a ceiling height the engine does not take is not passed on, so the estimate stays and the field can be put right', () => {
    expect(inputOf({ ...FLAT, height: '3.1' }).heightM).toBe(3.1);
    for (const t of ['10', 'tall', '1.5']) {
      expect(inputOf({ ...FLAT, height: t }).heightM, t).toBeUndefined();
      expect(planPreview({ ...FLAT, height: t }).view, t).toBeDefined();
    }
  });
});

describe('the answer, worded from the engine', () => {
  const e = architect(inputOf(FLAT)) as ArchitectEstimate, v = view(FLAT);
  it('the answers in one line, the total and the cost a sq ft', () => {
    expect(v.summary.replace(/ /g, ' ')).toBe('Repair or renovate · Flat · Pune · 1,000 sq ft · 2 BHK · Standard');
    expect(v.total).toBe(inr(e.total));
    expect(v.perSqft).toBe(inr(e.perSqft));
    expect(v.words).toMatch(/^Rupees .* Only$/);
  });
  it('the five-level strip is the engine\'s, the package marked', () => {
    const s = strip(inputOf(FLAT)) as number[];
    expect(v.strip.map((x) => [x.name, x.n, x.current])).toEqual([
      ['Basic', s[0], false], ['Standard', s[1], true], ['Premium', s[2], false], ['Luxury', s[3], false], ['Bespoke', s[4], false],
    ]);
    expect(v.strip[1].n).toBe(e.total);
  });
  it('a card for every section; a renovation has ten on and interiors eight, Appliances and Smart home among them (D-UX-19)', () => {
    expect(v.sections.length).toBe(13);
    expect(v.sections.filter((x) => x.on).length).toBe(10);
    const i = view(withKind(FLAT, 'interiors'));
    expect(i.sections.filter((x) => x.on).map((x) => x.name)).toEqual(['Civil and repairs', 'Walls and paint', 'Ceiling', 'Kitchen', 'Wardrobes and storage', 'Electrical and lights', 'Appliances', 'Smart home and security']);
    expect(i.split?.map((x) => x.label)).toEqual(['Fixed works', 'Appliances']);
  });
  it('the bar holds each section with an amount, the largest the full width', () => {
    expect(v.bar.map((x) => x.id)).toEqual(v.sections.filter((x) => x.on && x.n > 0).map((x) => x.id));
    expect(Math.max(...v.bar.map((x) => x.width))).toBe(100);
  });
  it('each line as the engine gives it, numbered under its section', () => {
    const floor = v.sections.find((x) => x.id === 'flooring')!;
    expect(floor.lines[0]).toMatchObject({ no: `${floor.no}.1`, room: 'Living and dining', qty: '303.03', unit: 'sq ft' });
    expect(v.sections.flatMap((x) => x.lines).length).toBe(e.lines.length);
  });
  it('a house: the same rooms inside, said so', () => {
    const h = view({ ...FLAT, home: 'house' });
    expect(h.total).toBe(v.total);
    expect(h.flags[0]).toMatch(/^A house: its rooms inside/);
  });
});

describe('sliders, items and brands', () => {
  it('a slider moves its section, says by how much against the package, and sets aside the items chosen in it', () => {
    const key = 'living:floor:floor-skirting';
    const mine = withItem(FLAT, key, 'fl-kota');
    const keys = view(mine).sections.find((x) => x.id === 'flooring')!.lines.map((l) => l.key);
    expect(view(mine).sections.find((x) => x.id === 'flooring')!.mixed).toBe(1);
    const up = withSlider(mine, 'flooring', 4, keys);
    expect(up.items[key]).toBeUndefined();
    expect(up.sliders.flooring).toBe(4);
    const f = view(up).sections.find((x) => x.id === 'flooring')!, base = view(FLAT).sections.find((x) => x.id === 'flooring')!;
    expect(f.levelName).toBe('Luxury');
    expect(f.over?.n).toBeCloseTo(f.n - base.n, 2);
    expect(f.over?.text).toBe(`Rs. ${inr(f.n - base.n)} more than Standard`);
    expect(withSlider(up, 'flooring', 2, keys).sliders.flooring).toBeUndefined();
  });
  it('a new package sets every section to it again', () => {
    const s = withLevel({ ...FLAT, sliders: { flooring: 5 }, items: { a: 'b' }, brands: { a: 'c' } }, 3);
    expect([s.level, s.sliders, s.items, s.brands]).toEqual([3, {}, {}, {}]);
  });
  it('a brand chosen is named for its line; one the item does not carry is not', () => {
    const key = 'living:floor:floor-skirting';
    const line = (s: PlanState) => view(s).sections.flatMap((x) => x.lines).find((l) => l.key === key)!;
    expect(line(FLAT).brands).toBe('Kajaria, Somany, Simpolo, Johnson or equivalent');
    expect(line({ ...FLAT, brands: { [key]: 'Somany' } }).brands).toBe('Brand: Somany');
    expect(line({ ...FLAT, brands: { [key]: 'Nobody' } }).brands).toBe('Kajaria, Somany, Simpolo, Johnson or equivalent');
  });
  it('the drawer: the five levels with the package marked, the line\'s item current, other choices, and how it was worked out', () => {
    const v = view(FLAT), d = drawerView(FLAT, v, 'living:floor:floor-skirting')!;
    expect(d.rungs.map((x) => x.label)).toEqual(['Basic', 'Standard', 'Premium', 'Luxury', 'Bespoke']);
    expect(d.rungs.map((x) => x.pkg)).toEqual([false, true, false, false, false]);
    expect(d.rungs[1].current).toBe(true);
    expect(d.rungs[0].rate).toBe('Rs. 114.09 a sq ft');
    expect(d.others.length).toBeGreaterThan(10);
    expect(d.how.quantity).toMatch(/floor .* sq m, and skirting/);
    expect(d.how.amount).toMatch(/^303\.03 sq ft × Rs\. [\d,.]+ = Rs\. [\d,]+$/);
  });
});

describe('the planning estimate to download', () => {
  // At Basic, the living room's floor is 303.03 sq ft (architect.test.ts) of the tile priced at Rs. 114.09 in Pune
  // (library.test.ts): 303.03 × 114.09 = 34,572.69, shown as 34,573.
  const s: PlanState = { ...FLAT, level: 1, doc: { owner: 'Asha Rao', property: 'Flat 4, Example Towers, Pune', lender: '', preparedBy: '' } };
  const p = planPreview(s), doc = planDoc(s, p, TODAY)!, lines = docText(doc).split('\n');
  it('page 1: the title by the kind, the facts, the abstract by section and the total in figures and words, signed', () => {
    expect(lines.slice(3, 11)).toEqual([
      'Estimate of cost of renovation', `Planning estimate prepared with ${SITE_NAME} on 03-10-2026.`,
      'Owner: Asha Rao', 'Property: Flat 4, Example Towers, Pune', 'Work: Repair or renovate, flat, 2 BHK', 'Carpet area: 1,000 sq ft (92.9 sq m)', 'City: Pune', 'Level: Basic',
    ]);
    expect(lines).toContain(`Total estimated cost | ${p.view!.total}`);
    expect(lines).toContain(`In words: ${p.view!.words}`);
    expect(lines).toContain(`Cost per sq ft: Rs. ${p.view!.perSqft} of carpet area`);
    expect(planDocStatus(s, p)).toBe('Complete');
    expect(planFileName(s, p, 'pdf')).toBe('Planning estimate - Asha Rao.pdf');
  });
  it('Annex 1: every line under its section, with its level, quantity, unit, rate and amount; the living room\'s floor as worked by hand', () => {
    const floor = lines.find((l) => l.includes('Living and dining: Double-charge vitrified tiles'))!;
    expect(floor).toMatch(/\| Basic \| 303\.03 \| sq ft \| 114\.09 \| 34,573$/);
    expect(floor).toContain('Kajaria, Somany, Johnson, Nitco, Orientbell or equivalent');
    expect(lines.filter((l) => /^\d+\.\d+ /.test(l)).length).toBe(p.view!.sections.reduce((t, x) => t + x.lines.length, 0));
  });
  it('Annex 2: what the estimate assumes, one line each, with no reasons and no sources (owner, 03-10-2026)', () => {
    const at = lines.indexOf('Annex 2. What the estimate assumes');
    expect(at).toBeGreaterThan(0);
    expect(lines.slice(at + 1).map((l) => l.split(':')[0])).toEqual(['Rooms', 'Bathrooms', 'Ceiling height', 'Doors and windows', 'Electrical points']);
    expect(lines).toContain('Ceiling height: 2.90 m');
    const text = docText(doc);
    for (const x of ['Annex 3', 'Class 2', 'http', '[1]', 'sources', 'the middle of each room']) expect(text).not.toContain(x);
  });
  it('leaves out the flags, the five levels and the change from the package (A15)', () => {
    const text = docText(doc);
    for (const x of ['not yet checked against them', 'Bespoke', 'more than', 'Each level as a package']) expect(text).not.toContain(x);
  });
  it('holds no figure the page did not show or the user did not type, and only letters the PDF prints', () => {
    const sources = [JSON.stringify(p), JSON.stringify(s), '03-10-2026', SITE_NAME].join('\n'), figures = docText(doc).match(/\d+(?:,\d+)*(?:\.\d+)?/g) ?? [];
    expect(figures.length).toBeGreaterThan(300);
    expect(figures.filter((f) => !sources.includes(f))).toEqual([]);
    expect(docText(doc).split('\n').filter((l) => !printable(l))).toEqual([]);
  });
  it('the PDF, the Excel copy and the Word copy read back the same', async () => {
    const pages = await pdfPages(pdfOf(doc, MADE));
    expect(pages[0]).toContain(`Total estimated cost ${p.view!.total}`);
    expect(pages.some((x) => x.includes('Annex 1. Detailed estimate'))).toBe(true);
    expect(pages.some((x) => x.includes('Annex 2. What the estimate assumes'))).toBe(true);
    const book = await workbook(xlsxOf(doc, MADE));
    expect(book.map((x) => x.sheet)).toEqual(['Estimate', 'Detailed estimate', 'Assumptions']);
    expect(book[0].data.find((r) => r[0] === 'Total estimated cost')?.filter((c) => c !== null)).toEqual(['Total estimated cost', p.view!.n.total]);
    const row = book[1].data.find((r) => typeof r[0] === 'string' && r[0].includes('Living and dining: Double-charge vitrified tiles'))?.filter((c) => c !== null);
    expect(row?.slice(1)).toEqual(['Basic', 303.03, 'sq ft', 114.09, 34572.69]);
    const { lines: word, messages } = await docxLines(docxOf(doc, MADE));
    expect(messages).toEqual([]);
    expect(word).toContain(`Total estimated cost | ${p.view!.total}`);
  });
  it('provisional while the owner\'s name is missing, and said on every page', async () => {
    const t = { ...s, doc: { ...s.doc, owner: '' } }, d = planDoc(t, planPreview(t), TODAY)!;
    expect(planDocStatus(t, planPreview(t))).toBe('Provisional: 1 still needed');
    for (const page of await pdfPages(pdfOf(d, MADE))) expect(page.split('\n')[0]).toBe('Planning estimate Provisional');
  });
});
