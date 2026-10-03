/**
 * The planning estimate's page (site/src/estimate/plan.ts) and its document (plan-document.ts), on fictional flats: a
 * 2BHK of 1,000 sq ft in Pune, whose rooms, measurements and rates are worked by hand in tests/architect.test.ts and
 * tests/library.test.ts. Every figure on the page is the engine's; these tests check that the page and the document
 * word them faithfully, and the files are read back by readers written by others (scripts/read-doc.mjs).
 */
import { describe, it, expect } from 'vitest';
import { architect, levelRuns, strip, type ArchitectEstimate, type LevelRuns } from '../engine/architect';
import { inr } from '../engine/util';
import { docText } from '../site/src/doc/doc';
import { docxOf } from '../site/src/doc/docx';
import { pdfOf, printable } from '../site/src/doc/pdf';
import { xlsxOf } from '../site/src/doc/xlsx';
import {
  EMPTY_PLAN, areaLabel, drawerView, inputOf, planNeeds, planPreview, withItem, withKind, withLevel, withRoomLevel, withRoomReset, withRoomSide, withSection, withSlider, withUnit, type PlanState,
} from '../site/src/estimate/plan-model';
import { planDoc, planDocStatus, planFileName } from '../site/src/estimate/plan-document';
import { SITE_NAME } from '../site/src/site';
import { docxLines, pdfPages, workbook } from '../scripts/read-doc.mjs';

const TODAY = '2026-10-03', MADE = new Date('2026-10-03T10:00:00Z');
const FLAT: PlanState = { ...EMPTY_PLAN, kind: 'renovate', home: 'flat', city: 'pune', area: '1,000', bhk: '2', level: 2 };
const view = (s: PlanState) => planPreview(s).view!;

describe('the six questions', () => {
  it('nothing answered: the six, in the order asked', () => {
    expect(planNeeds(EMPTY_PLAN)).toEqual(['What the work is: build a new house, repair or renovate, or interiors', 'Flat or house', 'Which city', 'The carpet area', 'How many bedrooms', 'Which level']);
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
  it('a card for every section; a renovation has ten on and interiors ten, Appliances, Smart home, Furniture and Soft furnishings among them (D-UX-19)', () => {
    expect(v.sections.length).toBe(15);
    expect(v.sections.filter((x) => x.on).length).toBe(10);
    const i = view(withKind(FLAT, 'interiors'));
    expect(i.sections.filter((x) => x.on).map((x) => x.name)).toEqual(['Civil and repairs', 'Walls and paint', 'Ceiling', 'Kitchen', 'Wardrobes and storage', 'Electrical and lights', 'Appliances', 'Smart home and security', 'Furniture', 'Soft furnishings']);
    expect(i.split?.map((x) => x.label)).toEqual(['Fixed works', 'Movable items', 'Appliances']);
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

describe('a new house on the page (D-UX-23)', () => {
  const HOUSE: PlanState = { ...EMPTY_PLAN, kind: 'build', floors: 2, city: 'pune', area: '2,000', bhk: '3', level: 1, doc: { owner: 'Asha Rao', property: 'Plot 12, Example Layout, Pune', lender: '', preparedBy: '' } };
  it('asks how many floors instead of flat or house, and the built-up area of all floors: still six questions', () => {
    expect(planNeeds({ ...EMPTY_PLAN, kind: 'build' })).toEqual(['How many floors', 'Which city', 'The built-up area of all floors', 'How many bedrooms', 'Which level']);
    expect(areaLabel('build')).toBe('Built-up area of all floors');
    expect(inputOf(HOUSE)).toMatchObject({ kind: 'build', property: 'house', floors: 2, area: 2000 });
  });
  it('the summary, the area typed and the cost a sq ft of it; sixteen sections, the structure first and eleven on', () => {
    const v = view(HOUSE);
    expect(v.summary.replace(/ /g, ' ')).toBe('Build a new house · G+1 · Pune · 2,000 sq ft · 3 BHK · Basic');
    expect([v.area, v.areaName, v.title]).toEqual(['2,000 sq ft (185.81 sq m)', 'Built-up area', 'Estimate of cost of construction']);
    expect(v.sections.map((x) => x.id)[0]).toBe('structure');
    expect([v.sections.length, v.sections.filter((x) => x.on).length]).toEqual([16, 11]);
    expect(view(FLAT).sections.length).toBe(15);
  });
  it('the document: titled for construction, the floors in the work, the built-up area, the cost a sq ft of it, the cement by hand, and the house in Annex 2', () => {
    const p = planPreview(HOUSE), lines = docText(planDoc(HOUSE, p, TODAY)!).split('\n');
    for (const want of ['Estimate of cost of construction', 'Work: Build a new house, G+1, 3 BHK', 'Built-up area: 2,000 sq ft (185.81 sq m)', `Cost per sq ft: Rs. ${p.view!.perSqft} of built-up area`])
      expect(lines, want).toContain(want);
    expect(lines.find((l) => l.includes('Whole house: OPC 53-grade cement'))).toMatch(/\| All \| 800 \| bag \| 401\.06 \| 3,20,848$/);
    const at = lines.indexOf('Annex 2. What the estimate assumes');
    expect(lines.slice(at + 1).map((l) => l.split(':')[0])).toEqual(['The house', 'Floor to floor', 'Structure', 'Rooms', 'Bathrooms', 'Ceiling height', 'Doors and windows', 'Electrical points']);
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

describe('E3 on the page: the rooms, What changed, Compare and the movable sections', () => {
  const e = architect(inputOf(FLAT)) as ArchitectEstimate;
  const total = (s: PlanState) => (architect(inputOf(s)) as ArchitectEstimate).total;
  const more = (s: PlanState) => { const by = Math.round((total(s) - e.total) * 100) / 100; return `Rs. ${inr(Math.abs(by))} ${by > 0 ? 'more' : 'less'}`; };
  it('the rooms with their planned sizes in feet; a size typed in feet reaches the engine in metres, the longer side its length, and What changed says what it did', () => {
    const v = view(FLAT);
    expect(v.rooms.map((r) => r.id)).toEqual(['living', 'bedroom-1', 'bedroom-2', 'kitchen', 'bath-1', 'bath-2', 'passage', 'balcony']);
    expect(v.rooms[0]).toMatchObject({ name: 'Living and dining', size: '19.19 × 14.76 ft', area: '283 sq ft', typed: false, level: null, l: '', b: '', planned: { l: '19.19', b: '14.76' } });
    const half = withRoomSide(FLAT, 'living', 'l', '16', 'Living and dining'), sized = withRoomSide(half, 'living', 'b', '20', 'Living and dining');
    expect([inputOf(half).rooms, view(half).rooms[0].bad, view(half).change]).toEqual([undefined, 'Type both sides.', undefined]);
    expect(inputOf(sized).rooms).toEqual({ living: { l: 16 * 0.3048, b: 20 * 0.3048 } });
    const sv = view(sized);
    expect(sv.rooms[0]).toMatchObject({ size: '20 × 16 ft', area: '320 sq ft', typed: true, l: '16', b: '20' });
    expect(sv.roomsNote).toBe('With your sizes the rooms and the passage come to 987 sq ft, against the 950 sq ft the carpet area leaves for them after the inside walls: check the sizes, or the carpet area.');
    expect(sv.change).toEqual({ text: `Living and dining to 16 × 20 ft: ${more(sized)}`, n: Math.round((total(sized) - e.total) * 100) / 100, items: '' });
    expect(view(withRoomReset(sized, 'living', 'Living and dining')).rooms[0].typed).toBe(false);
  });
  it('a side out of range is not passed on and the field says why; a new unit turns the sides typed into it', () => {
    const tiny = withRoomSide(withRoomSide(FLAT, 'living', 'l', '0.5', 'L'), 'living', 'b', '12', 'L');
    expect([inputOf(tiny).rooms, view(tiny).rooms[0].bad]).toEqual([undefined, 'Type each side from 1 to 98 ft.']);
    const sized = withRoomSide(withRoomSide(FLAT, 'living', 'l', '16', 'L'), 'living', 'b', '20', 'L');
    expect(withUnit(sized, 'sqm').rooms.living).toEqual({ l: '4.88', b: '6.1' });
    expect(view({ ...withUnit(sized, 'sqm'), area: '92.9' }).rooms[0].size).toBe('6.1 × 4.88 m');
  });
  it('a room\'s own level: the first bathroom at Luxury; its sections read Mixed; What changed names the items it brought in; a new package sets it aside', () => {
    const s = withRoomLevel(FLAT, 'bath-1', 4, 'Bathroom 1 (attached)'), v = view(s);
    expect(v.rooms.find((r) => r.id === 'bath-1')?.level).toBe(4);
    expect(v.sections.find((x) => x.id === 'bathrooms')?.mixedText).toBe('Mixed (1 room at its own level)');
    expect(view(withSlider(FLAT, 'electrical', 4, [])).sections.find((x) => x.id === 'electrical')?.mixed).toBe(0);
    expect(v.change?.text).toBe(`Bathroom 1 (attached) at Luxury: ${more(s)}`);
    expect(v.change?.items).toMatch(/^Matt porcelain slabs, 800 × 1600 mm · Porcelain slabs on the walls, 800 × 1600 mm · Imported sanitaryware · and \d+ more$/);
    expect(view(withLevel(s, 3)).rooms.find((r) => r.id === 'bath-1')?.level).toBeNull();
  });
  it('Compare: the sections that are on, the five levels across, the estimate\'s own level marked; Yours where the estimate differs from the package', () => {
    const v = view(FLAT), runs = levelRuns(inputOf(FLAT)) as LevelRuns;
    expect(v.compare.rows.find((r) => r.id === 'flooring')?.cells.map((c) => [c.n, c.mine])).toEqual(runs.sections.flooring.map((n, i) => [n, i === 1]));
    expect(v.compare.rows.some((r) => r.id === 'furniture')).toBe(false);
    expect([v.compare.totals.map((c) => c.n), v.compare.yours]).toEqual([runs.totals, undefined]);
    const up = withSlider(FLAT, 'flooring', 4, []), uv = view(up), floor = uv.compare.rows.find((r) => r.id === 'flooring');
    expect([floor?.cells.findIndex((c) => c.mine), floor?.yours, uv.compare.yours]).toEqual([3, undefined, `Yours: Rs. ${uv.total}`]);
    expect(uv.change?.text).toBe(`Flooring to Luxury: ${more(up)}`);
  });
  it('Furniture switched on for a renovation: What changed names the pieces; the line goes when the answers change', () => {
    const s = withSection(FLAT, 'furniture', true), v = view(s);
    expect(v.change).toEqual({ text: 'Furniture switched on: Rs. 2,03,469 more', n: 203469, items: '3-seater sofa, mid-range · 6-seater dining set · Queen bed with hydraulic storage · and 1 more' });
    expect(view({ ...s, city: 'mumbai' }).change).toBeUndefined();
  });
  it('interiors: the movable items apart on the page and in the abstract (D-UX-19)', () => {
    const i = withKind(FLAT, 'interiors'), p = planPreview(i), lines = docText(planDoc(i, p, TODAY)!).split('\n');
    expect(p.view?.split?.find((x) => x.label === 'Movable items')?.n).toBe(243008.7);
    expect(lines).toContain('Movable items | 2,43,009');
    expect(lines).toContain('8. Furniture | 2,03,469');
    expect(lines).toContain('9. Soft furnishings | 39,540');
  });
});
