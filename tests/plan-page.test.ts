/**
 * The planning estimate's page (site/src/estimate/plan.ts) and its document (plan-document.ts), on fictional flats: a
 * 2BHK of 1,000 sq ft in Pune, whose rooms, measurements and rates are worked by hand in tests/architect.test.ts and
 * tests/library.test.ts. Every figure on the page is the engine's; these tests check that the page and the document
 * word them faithfully, and the files are read back by readers written by others (scripts/read-doc.mjs).
 */
import { describe, it, expect } from 'vitest';
import { architect, levelRuns, strip, type ArchitectEstimate, type LevelRuns } from '../engine/architect';
import { NOTES, SPEND_SAVE } from '../engine/library';
import { inr } from '../engine/util';
import { docText } from '../site/src/doc/doc';
import { docxOf } from '../site/src/doc/docx';
import { pdfOf, printable } from '../site/src/doc/pdf';
import { xlsxOf } from '../site/src/doc/xlsx';
import {
  EMPTY_PLAN, areaLabel, drawerView, inputOf, planNeeds, planPreview, withItem, withKind, withLevel, withPlotReset, withPlotSide, withAttached, withBalcony, withBathAdded, withBathTakenOut, withBedroomAdded, withBedroomTakenOut, withBhk, withRoomLevel, withRoomReset, withRoomSide, withRoomWord, withSection, withSewer, withSlider, withUnit, type PlanState,
} from '../site/src/estimate/plan-model';
import { billDoc, billFileName, planDoc, planDocStatus, planFileName } from '../site/src/estimate/plan-document';
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
    expect(h.notes[0]).toMatch(/^A house: its rooms inside/);
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
  it('the drawer (L1): the choices at the line\'s level first under its name, its item marked and current; each other level\'s after, the cheapest level first, closed, each item once; how it was worked out', () => {
    const v = view(FLAT), d = drawerView(FLAT, v, 'living:floor:floor-skirting')!;
    expect(d.groups.map((g) => g.title)).toEqual(['At Standard: 8 choices', 'At Basic: 5 choices', 'At Premium: 8 choices', 'At Luxury: 6 choices', 'At Bespoke: 4 choices']);
    expect(d.groups.map((g) => g.open)).toEqual([true, false, false, false, false]);
    expect(d.groups[0].choices[0]).toMatchObject({ id: 'fl-gvt-800', mark: 'the level’s item', current: true });
    expect(d.groups[0].choices.slice(1).every((x) => x.mark === '' && !x.current)).toBe(true);
    expect(d.groups[1].choices[0]).toMatchObject({ id: 'fl-vit-dc-600', rate: 'Rs. 111.65 a sq ft', mark: 'the level’s item', current: false });
    expect(d.groups[2].choices.find((x) => x.id === 'fl-encaustic')).toMatchObject({ rate: 'No rate yet', usable: false });
    const ids = d.groups.flatMap((g) => g.choices.map((x) => x.id));
    expect(ids.length).toBe(new Set(ids).size);
    expect(d.how.quantity).toMatch(/floor .* sq m, and skirting/);
    expect(d.how.amount).toMatch(/^303\.03 sq ft × Rs\. [\d,.]+ = Rs\. [\d,]+$/);
  });
  it('the drawer follows the line\'s own level, names the package\'s level where it differs, and opens the level holding an item of your own', () => {
    const key = 'living:floor:floor-skirting';
    const slid = withSlider(FLAT, 'flooring', 4, view(FLAT).sections.find((x) => x.id === 'flooring')!.lines.map((l) => l.key));
    expect(drawerView(slid, view(slid), key)!.groups.map((g) => g.title)).toEqual(['At Luxury: 6 choices', 'At Basic: 5 choices', 'At Standard (the package): 8 choices', 'At Premium: 8 choices', 'At Bespoke: 4 choices']);
    const kota = withItem(FLAT, key, 'fl-kota');
    const d = drawerView(kota, view(kota), key)!;
    expect(d.groups.map((g) => g.open)).toEqual([true, true, false, false, false]);
    expect(d.groups[1].choices.find((x) => x.id === 'fl-kota')?.current).toBe(true);
    const fixed = drawerView(FLAT, view(FLAT), 'flat:debris:debris')!;
    expect(fixed.groups.map((g) => g.title)).toEqual(['At Standard: 1 choice']);
    expect(fixed.groups[0].choices[0]).toMatchObject({ mark: 'every level', current: true });
  });
});

describe('L1 on the page: the level\'s range under the total', () => {
  it('from the cheapest priced choice at the level in every item to the dearest, with how many items offer a choice; "as a package" when the estimate is not the package', () => {
    const r = (levelRuns(inputOf(FLAT)) as LevelRuns).range, v = view(FLAT);
    expect(r.low < v.n.total && v.n.total < r.high).toBe(true);
    expect(v.range.text).toBe(`At Standard, the choices run from Rs. ${inr(r.low)} to Rs. ${inr(r.high)}: the cheapest in each item to the dearest. ${r.lines} of the ${r.of} items offer a choice.`);
    const slid = withSlider(FLAT, 'flooring', 4, v.sections.find((x) => x.id === 'flooring')!.lines.map((l) => l.key));
    expect(view(slid).range.text).toBe(v.range.text.replace('At Standard,', 'At Standard as a package,'));
  });
  it('says so when no item offers a choice at the level', () => {
    const all = view(FLAT).sections.map((x) => x.id), only = (id: string) => ({ ...FLAT, sections: Object.fromEntries(all.map((x) => [x, x === id])) });
    expect(view(only('plumbing')).range.text).toBe('At Standard, each of the 7 items has one choice.');
    expect(view(only('nothing')).range.text).toBe('');
  });
});

describe('a new house on the page (D-UX-23)', () => {
  const HOUSE: PlanState = { ...EMPTY_PLAN, kind: 'build', floors: 2, city: 'pune', area: '2,000', bhk: '3', level: 1, doc: { owner: 'Asha Rao', property: 'Plot 12, Example Layout, Pune', lender: '', preparedBy: '' } };
  it('asks how many floors instead of flat or house, and the built-up area of all floors: still six questions', () => {
    expect(planNeeds({ ...EMPTY_PLAN, kind: 'build' })).toEqual(['How many floors', 'Which city', 'The built-up area of all floors', 'How many bedrooms', 'Which level']);
    expect(areaLabel('build')).toBe('Built-up area of all floors');
    expect(inputOf(HOUSE)).toMatchObject({ kind: 'build', property: 'house', floors: 2, area: 2000 });
  });
  it('the summary, the area typed and the cost a sq ft of it; eighteen sections, the structure first and thirteen on', () => {
    const v = view(HOUSE);
    expect(v.summary.replace(/ /g, ' ')).toBe('Build a new house · G+1 · Pune · 2,000 sq ft · 3 BHK · Basic');
    expect([v.area, v.areaName, v.title]).toEqual(['2,000 sq ft (185.81 sq m)', 'Built-up area', 'Estimate of cost of construction']);
    expect(v.sections.map((x) => x.id)[0]).toBe('structure');
    expect([v.sections.length, v.sections.filter((x) => x.on).length]).toEqual([18, 13]);
    expect(view(FLAT).sections.length).toBe(15);
  });
  it('the document: titled for construction, the floors in the work, the built-up area, the cost a sq ft of it, the cement by hand, and the house in Annex 2', () => {
    const p = planPreview(HOUSE), lines = docText(planDoc(HOUSE, p, TODAY)!).split('\n');
    for (const want of ['Estimate of cost of construction', 'Work: Build a new house, G+1, 3 BHK', 'Built-up area: 2,000 sq ft (185.81 sq m)', `Cost per sq ft: Rs. ${p.view!.perSqft} of built-up area`])
      expect(lines, want).toContain(want);
    // 0.4 bags a sq ft × 2,121.0940 sq ft (the built-up area and the stair cabin) = 848.44 bags × Rs. 372.60 = 3,16,128.74 (architect.test.ts).
    expect(lines.find((l) => l.includes('Whole house: OPC 53-grade cement'))).toMatch(/\| All \| 848\.44 \| bag \| 372\.60 \| 3,16,129$/);
    const at = lines.indexOf('Annex 3. What the estimate assumes');
    expect(lines.slice(at + 1).map((l) => l.split(':')[0])).toEqual(['The house', 'Floor to floor', 'The plot', 'Structure', 'Outside works', 'Water', 'Stages', 'Rooms', 'Bathrooms', 'Ceiling height', 'Doors and windows', 'Electrical points']);
  });
  it('E5: the stages on the page, each with its share and the share by its end, adding up to the total; in the document as Annex 2, pointed to from page 1', () => {
    const v = view(HOUSE), st = v.stages!;
    expect(st.map((x) => x.name)).toEqual(['Foundation and plinth', 'Ground floor roof slab', 'First floor roof slab', 'Walls and plaster', 'Finishing', 'Outside works and water']);
    expect(st.at(-1)?.upTo).toBe('100.0%');
    expect(st.reduce((t, x) => t + x.n, 0)).toBeCloseTo(v.n.total, 2);
    for (const x of st) expect(x.amount).toBe(inr(Math.round(x.n)));
    const lines = docText(planDoc(HOUSE, planPreview(HOUSE), TODAY)!).split('\n');
    for (const x of st) expect(lines, x.name).toContain(`${x.name} | ${x.amount} | ${x.share} | ${x.upTo}`);
    expect(lines).toContain(`Total estimated cost | ${v.total} | 100% | `);
    expect(lines).toContain('The stages of construction, for a construction loan\'s payments, are in Annex 2.');
    const annex = lines.indexOf('Annex 2. Stages of construction');
    expect(annex).toBeGreaterThan(lines.indexOf('Annex 1. Detailed estimate'));
    expect(lines.indexOf('Foundation and plinth | ' + st[0].amount + ' | ' + st[0].share + ' | ' + st[0].upTo)).toBeGreaterThan(annex);
    expect(lines).toContain(`${st[0].name}: ${st[0].what}.`);
    expect(view(FLAT).stages).toBeUndefined();
  });
  it('E5: the plot typed in ft, in the page\'s unit; one side alone or out of range is not passed on, and says why; back to the planned plot', () => {
    expect(view(HOUSE).plot).toEqual({ l: '', b: '', planned: { l: '50.12', b: '34.85' }, own: false });
    const half = withPlotSide(HOUSE, 'l', '40'), both = withPlotSide(half, 'b', '30');
    expect(inputOf(half).plot).toBeUndefined();
    expect(view(half).plot?.bad).toBe('Type both sides.');
    expect(inputOf(both).plot).toEqual({ l: 12.192, b: 9.144 });
    expect(view(both).plot?.own).toBe(true);
    expect(view(both).change?.text).toMatch(/^The plot to 40 × 30 ft: Rs\. [\d,]+ less$/);
    expect(view(withPlotSide(both, 'b', '5')).plot?.bad).toBe('Type each side from 10 to 984 ft.');
    expect(withUnit(both, 'sqm').plot).toEqual({ l: '12.19', b: '9.14' });
    expect(inputOf(withPlotReset(both)).plot).toBeUndefined();
    expect(inputOf({ ...FLAT, plot: { l: '40', b: '30' } }).plot).toBeUndefined();
  });
  it('E5: the sewer in place of the septic tank, noted in What changed; only for a new house', () => {
    const w = withSewer(HOUSE, true);
    expect(inputOf(w).sewer).toBe(true);
    // The septic tank's 84,680 out, the sewer connection's 23,343.39 in (architect.test.ts): 61,336.61, shown as 61,337.
    expect(view(w).change?.text).toBe('The sewer in place of a septic tank: Rs. 61,337 less');
    expect(inputOf({ ...FLAT, sewer: true }).sewer).toBeUndefined();
  });
});

describe('the planning estimate to download', () => {
  // At Basic, the living room's floor is 303.03 sq ft (architect.test.ts) of the tile priced at Rs. 111.65 in Pune
  // (library.test.ts): 303.03 × 111.65 = 33,833.30, shown as 33,833.
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
    expect(floor).toMatch(/\| Basic \| 303\.03 \| sq ft \| 111\.65 \| 33,833$/);
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
    expect(row?.slice(1)).toEqual(['Basic', 303.03, 'sq ft', 111.65, 33833.3]);
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

describe('the bill of quantities to download (E4a, D-UX-36)', () => {
  // The same flat at Basic: the living room's floor is 303.03 sq ft of double-charge vitrified tiles (architect.test.ts);
  // the bill's line for that tile is every room's quantity of it, added again here from the detailed estimate's lines.
  const s: PlanState = { ...FLAT, level: 1, doc: { owner: 'Asha Rao', property: 'Flat 4, Example Towers, Pune', lender: '', preparedBy: '' } };
  const p = planPreview(s), v = p.view!, doc = billDoc(s, p, TODAY)!, text = docText(doc), lines = text.split('\n');
  const tiles = v.sections.flatMap((x) => x.lines).filter((l) => l.item.startsWith('Double-charge vitrified tiles') && l.key.endsWith(':floor:floor-skirting'));
  const floor = lines.find((l) => l.includes('Double-charge vitrified tiles') && l.includes('Living and dining'))!;
  it('a line at the top asks for supply and fixing with wastage and whether GST is included; the eight columns', () => {
    expect(text).toContain('Please quote a rate for supplying and fixing each item, with its wastage');
    expect(text).toContain('say whether your rates include GST');
    expect(lines).toContain('No. | Item and specification | Where | Quantity | Unit | Rate | Amount | Make offered');
    expect(billFileName(s, 'xlsx')).toBe('Bill of quantities - Asha Rao.xlsx');
  });
  it('one line for the floor tiles of the rooms that have them, its quantity their sum, with brands "or equivalent"; rate and amount blank', () => {
    expect(tiles.length).toBeGreaterThan(1);
    expect(tiles[0].n.qty).toBe(303.03);
    const sum = tiles.reduce((t, l) => t + Math.round(l.n.qty * 100), 0) / 100;
    expect(floor).toContain(`| ${tiles.map((l) => l.room).join(', ')} | ${inr(sum, 2)} | sq ft |  |  | `);
    expect(floor).toContain('Kajaria, Somany, Johnson, Nitco, Orientbell or equivalent');
    expect(lines.filter((l) => l.includes('Double-charge vitrified tiles') && l.includes('Living and dining'))).toHaveLength(1);
  });
  it('none of our levels, rates or totals; section totals blank; only figures the page shows', () => {
    for (const x of ['| Basic |', 'Level', '111.65', '33,833', v.total]) expect(text).not.toContain(x);
    expect(lines.filter((l) => l.includes('| Total of ') && l.endsWith('|  |  |  |  |  | '))).toHaveLength(v.bill.length + 1);
    const sources = [JSON.stringify(p), JSON.stringify(s), '03-10-2026', SITE_NAME].join('\n'), figures = text.match(/\d+(?:,\d+)*(?:\.\d+)?/g) ?? [];
    expect(figures.filter((f) => !sources.includes(f))).toEqual([]);
    expect(lines.filter((l) => !printable(l))).toEqual([]);
  });
  it('the PDF, the Excel copy and the Word copy read back the same', async () => {
    const pages = (await pdfPages(pdfOf(doc, MADE))).join('\n');
    expect(pages).toContain('Bill of quantities');
    expect(pages).toContain('Make offered');
    const book = await workbook(xlsxOf(doc, MADE));
    expect(book.map((x) => x.sheet)).toEqual(['Bill of quantities']);
    const row = book[0].data.find((r) => typeof r[1] === 'string' && r[1].startsWith('Double-charge vitrified tiles') && String(r[2]).startsWith('Living and dining'));
    expect(row?.[3]).toBe(tiles.reduce((t, l) => t + Math.round(l.n.qty * 100), 0) / 100);
    const { lines: word, messages } = await docxLines(docxOf(doc, MADE));
    expect(messages).toEqual([]);
    expect(word.some((l) => l.includes('Double-charge vitrified tiles') && l.includes('Living and dining'))).toBe(true);
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
    expect(v.change).toEqual({ text: 'Furniture switched on: Rs. 1,88,974 more', n: 188974, items: '3-seater sofa, mid-range · 6-seater dining set · Queen bed with hydraulic storage · and 1 more' });
    expect(view({ ...s, city: 'mumbai' }).change).toBeUndefined();
  });
  it('interiors: the movable items apart on the page and in the abstract (D-UX-19)', () => {
    const i = withKind(FLAT, 'interiors'), p = planPreview(i), lines = docText(planDoc(i, p, TODAY)!).split('\n');
    expect(p.view?.split?.find((x) => x.label === 'Movable items')?.n).toBe(228409.06);
    expect(lines).toContain('Movable items | 2,28,409');
    expect(lines).toContain('8. Furniture | 1,88,974');
    expect(lines).toContain('9. Soft furnishings | 39,435');
  });
});

describe('R1 on the page: four size buttons on each room, the bar of shares and the knock-on', () => {
  const e = architect(inputOf(FLAT)) as ArchitectEstimate;
  const total = (s: PlanState) => (architect(inputOf(s)) as ArchitectEstimate).total;
  const more = (s: PlanState, from: PlanState) => { const by = Math.round((total(s) - total(from)) * 100) / 100; return `Rs. ${inr(Math.abs(by))} ${by > 0 ? 'more' : 'less'}`; };
  it('every room Medium at first, the passage and the balcony without words; the bar shares the carpet area: 28, 21, 17, 10, 5, 5, the passage 10 and the walls 5', () => {
    const v = view(FLAT);
    expect(v.rooms.map((r) => [r.id, r.word])).toEqual([['living', 'medium'], ['bedroom-1', 'medium'], ['bedroom-2', 'medium'], ['kitchen', 'medium'], ['bath-1', 'medium'], ['bath-2', 'medium'], ['passage', null], ['balcony', null]]);
    expect(v.shares.map((x) => [x.name, x.share])).toEqual([
      ['Living and dining', '28%'], ['Main bedroom', '21%'], ['Bedroom 2', '17%'], ['Kitchen', '10%'], ['Bathroom 1 (attached)', '5%'], ['Bathroom 2', '5%'], ['Passage and foyer', '10%'], ['Inside walls', '5%'],
    ]);
    expect(v.shares.reduce((t, x) => t + x.width, 0)).toBeCloseTo(100, 9);
    e.shares.forEach((x, i) => expect(v.shares[i].width).toBeCloseTo(x.share * 100, 9));
  });
  it('a word reaches the engine and What changed names the knock-on: the living room Spacious, 200 to 220 of 600, the others 600 / 620 of their size, 3.2% smaller', () => {
    const s = withRoomWord(FLAT, 'living', 'spacious', 'Living and dining'), v = view(s);
    expect(inputOf(s).roomWords).toEqual({ living: 'spacious' });
    expect(v.rooms[0]).toMatchObject({ word: 'spacious', area: '302 sq ft', typed: false });
    expect(v.shares[0].share).toBe('30%');
    expect(v.change?.text).toBe(`Living and dining to Spacious: the other rooms 3.2% smaller · ${more(s, FLAT)}`);
    // Medium again is the plan's own: left out, and the others grow back by 620 / 600, 3.3% larger.
    const back = withRoomWord(s, 'living', 'medium', 'Living and dining');
    expect([inputOf(back).roomWords, view(back).change?.text]).toEqual([undefined, `Living and dining to Medium: the other rooms 3.3% larger · ${more(back, s)}`]);
    // A new package keeps the words: they are sizes, not levels.
    expect(inputOf(withLevel(s, 4)).roomWords).toEqual({ living: 'spacious' });
  });
  it('a word on a room of one\'s own size puts the size aside, and says so; a size typed leaves no word checked', () => {
    const sized = withRoomSide(withRoomSide(FLAT, 'living', 'l', '16', 'Living and dining'), 'living', 'b', '20', 'Living and dining');
    expect(view(sized).rooms[0]).toMatchObject({ typed: true, word: 'medium' });
    const s = withRoomWord(sized, 'living', 'above', 'Living and dining');
    expect([s.rooms.living, inputOf(s).rooms, view(s).rooms[0].typed]).toEqual([undefined, undefined, false]);
    expect(view(s).change?.text).toMatch(/^Living and dining to Above medium, in place of your size: the other rooms 1\.6% smaller · Rs\. [\d,]+ (more|less)$/);
    // Sizes typed past the carpet area keep the bar to its width; the note says why. The living room typed is 320 of 1,000
    // sq ft, 32%; the others keep 205.42 + 170 + 99.17 + 46.04 × 2 and the passage 100, so with it 986.67 sq ft, and the
    // walls' 50 make 1,036.67, 103.67%: the living room takes 32 / 1.036667 = 30.87% of the bar.
    const v = view(sized);
    expect(v.shares.reduce((t, x) => t + x.width, 0)).toBeCloseTo(100, 9);
    expect([v.shares[0].share, v.shares[0].width.toFixed(2)]).toEqual(['32%', '30.87']);
  });
  it('a room below the Code\'s minimum is named under its buttons and in what to check, never changed', () => {
    const tight = { ...FLAT, area: '600', roomWords: { living: 'spacious', 'bedroom-1': 'spacious', 'bedroom-2': 'compact', kitchen: 'spacious', 'bath-1': 'spacious', 'bath-2': 'spacious' } } as PlanState;
    const v = view(tight), bed = v.rooms.find((r) => r.id === 'bedroom-2');
    expect(bed?.below).toBe('Below the Code\'s 9.5 sq m (102 sq ft) for this room.');
    expect(v.flags.some((f) => f.startsWith('Bedroom 2 works out at') && f.endsWith('with the sizes picked, below the Code\'s 9.5 sq m: make it larger, or another room smaller.'))).toBe(true);
  });
});

describe('R2 on the page: rooms by buttons', () => {
  const total = (s: PlanState) => (architect(inputOf(s)) as ArchitectEstimate).total;
  const by = (s: PlanState, from: PlanState) => { const x = Math.round((total(s) - total(from)) * 100) / 100; return `Rs. ${inr(Math.abs(x))} ${x > 0 ? 'more' : 'less'}`; };
  it('the owner\'s example: a 1BHK whose bathroom is attached to the bedroom, and no balcony; ticking it off brings the plan back', () => {
    const one: PlanState = { ...FLAT, bhk: '1', area: '600' };
    const s = withAttached(one, 'bedroom-1', true, 'Bedroom');
    expect([s.baths, inputOf(s).baths, view(s).change?.text]).toEqual([['bedroom-1'], ['bedroom-1'], `The bathroom attached to Bedroom: ${by(s, one)}`]);
    const v = view(s);
    expect(v.rooms.find((r) => r.id === 'bedroom-1')).toMatchObject({ bedroom: true, attached: true, out: true });
    expect(v.rooms.find((r) => r.id === 'bath-1')).toMatchObject({ name: 'Bathroom (attached)', out: false });
    const none = withBalcony(s, false);
    expect([inputOf(none).balcony, view(none).rooms.some((r) => r.id === 'balcony'), view(none).add]).toEqual([false, false, { bedroom: true, bath: true, balcony: true }]);
    expect(view(none).change?.text).toBe(`The balcony taken out: ${by(none, s)}`);
    const back = withAttached(withBalcony(none, true), 'bedroom-1', false, 'Bedroom');
    expect([back.baths, back.balcony, view(back).change?.text]).toEqual([undefined, undefined, `Bedroom's bathroom made common: ${by(back, withBalcony(none, true))}`]);
  });
  it('+ Bathroom and its ×: a common bathroom more, the others sharing what is left; taken out again, the plan\'s own is back', () => {
    const s = withBathAdded(FLAT);
    expect([s.baths, view(s).rooms.filter((r) => r.id.startsWith('bath-')).map((r) => r.name)]).toEqual([['bedroom-1', null, null], ['Bathroom 1 (attached)', 'Bathroom 2', 'Bathroom 3']]);
    // 200 + 145 + 120 + 70 + 32.5 + 32.5 = 600, and a bathroom more at 32.5 makes 632.5: the others 600 / 632.5 of their
    // size, 5.1% smaller; taken out again, 632.5 / 600, 5.4% larger.
    expect(view(s).change?.text).toMatch(/^A bathroom added: the other rooms 5\.1% smaller · Rs\. [\d,]+ (more|less)$/);
    const out = withBathTakenOut(s, 'bath-3', 'Bathroom 3');
    expect([out.baths, view(out).change?.text]).toEqual([undefined, `Bathroom 3 taken out: the other rooms 5.4% larger · ${by(out, s)}`]);
  });
  it('× on a bathroom moves the later ones up, with their own words, sizes, levels and items; one bathroom is always kept', () => {
    const three: PlanState = { ...FLAT, bhk: '3', area: '1,200', roomWords: { 'bath-3': 'spacious' }, roomLevels: { 'bath-2': 4, 'bath-3': 5 }, items: { 'bath-3:wc:count': 'x' }, brands: { 'bath-2:wc:count': 'Jaquar' } };
    const s = withBathTakenOut(three, 'bath-2', 'Bathroom 2');
    expect([s.baths, s.roomWords, s.roomLevels, s.items, s.brands]).toEqual([['bedroom-1', null], { 'bath-2': 'spacious' }, { 'bath-2': 5 }, { 'bath-2:wc:count': 'x' }, {}]);
    const one: PlanState = { ...FLAT, bhk: '1' };
    expect(withBathTakenOut(one, 'bath-1', 'Bathroom')).toBe(one);
    expect(view(one).rooms.find((r) => r.id === 'bath-1')?.out).toBe(false);
  });
  it('+ Bedroom and its ×: the bedrooms answer follows; the later bedrooms move up with what is theirs, and a bathroom attached to the one taken out becomes common', () => {
    const up = withBedroomAdded(FLAT);
    expect([up.bhk, view(up).change?.text, view(up).summary]).toEqual(['3', `A bedroom added, now 3 BHK: ${by(up, FLAT)}`, view({ ...FLAT, bhk: '3' }).summary]);
    const three: PlanState = { ...up, roomWords: { 'bedroom-3': 'compact' }, baths: ['bedroom-1', 'bedroom-2', 'bedroom-3'], rooms: { 'bedroom-2': { l: '12', b: '10' } } };
    const s = withBedroomTakenOut(three, 'bedroom-2', 'Bedroom 2');
    expect([s.bhk, s.roomWords, s.baths, s.rooms]).toEqual(['2', { 'bedroom-2': 'compact' }, ['bedroom-1', null, 'bedroom-2'], {}]);
    expect(view(s).change?.text).toBe(`Bedroom 2 taken out, now 2 BHK: ${by(s, three)}`);
    expect(withBedroomAdded({ ...FLAT, bhk: '5' }).bhk).toBe('5');
    const rk = withBedroomTakenOut({ ...FLAT, bhk: '1' }, 'bedroom-1', 'Bedroom');
    expect([rk.bhk, view(rk).rooms.find((r) => r.id === 'bedroom-1')?.out]).toEqual(['1RK', false]);
  });
  it('a new count of bedrooms from the question keeps the bathrooms of one\'s own, made common where their bedroom is gone, and brings the plan\'s own when they were the plan\'s', () => {
    expect(withBhk({ ...FLAT, bhk: '3', baths: ['bedroom-3', null] }, '2').baths).toEqual([null, null]);
    expect(withBhk({ ...FLAT, baths: ['bedroom-1', null] }, '3').baths).toBeUndefined();
  });
});

describe('V1 on the page: short by default', () => {
  const interiors = view(withKind(FLAT, 'interiors'));
  it('the flags that can change the decision go with the answer and the rest one tap away, each largest first', () => {
    expect(interiors.flags).toEqual(['A 2 BHK is usually 650–850 sq ft of carpet area; yours is 1000.']);
    expect(interiors.notes.map((f) => f.slice(0, 26))).toEqual(['The furniture is a sofa an', 'The soft furnishings are c']);
  });
  it('the rates as reported in one line by the total, for the city or another place', () => {
    expect(interiors.ratesLine).toMatch(/^A planning estimate: rates as reported on \d\d-\d\d-\d{4} for Pune; \d+ of \d+ lines checked against their pages$/);
    expect(view({ ...FLAT, city: 'other' }).ratesLine).toMatch(/for another place, at the six cities’ average; \d+ of \d+ lines checked against their pages$/);
    expect([...interiors.flags, ...interiors.notes].some((f) => f.startsWith('Rates are as reported'))).toBe(false);
  });
  it('each section\'s amount in the package orders the list, steady while its slider moves', () => {
    const e = architect(inputOf(FLAT)) as ArchitectEstimate, runs = levelRuns(inputOf(FLAT)) as LevelRuns, v = view(FLAT);
    for (const x of v.sections.filter((y) => y.on)) expect(x.pkg, x.id).toBe(runs.sections[x.id][e.level - 1]);
    const floor = v.sections.find((x) => x.id === 'flooring')!;
    const moved = view(withSlider(FLAT, 'flooring', 4, floor.lines.map((l) => l.key))).sections.find((x) => x.id === 'flooring')!;
    expect([moved.n > floor.n, moved.pkg]).toEqual([true, floor.pkg]);
  });
});

describe('T1 on the page: a line\'s and a section\'s Why?, never in the answer or the documents (D-UX-34)', () => {
  // V1's two cases: a 2 BHK flat's interiors of 1,000 sq ft at Standard, and a G+1 3 BHK house of 2,000 sq ft at Luxury, in Pune.
  const FLAT_IN: PlanState = { ...EMPTY_PLAN, kind: 'interiors', home: 'flat', city: 'pune', area: '1,000', bhk: '2', level: 2 };
  const HOUSE: PlanState = { ...EMPTY_PLAN, kind: 'build', floors: 2, city: 'pune', area: '2,000', bhk: '3', level: 4, doc: { owner: 'Asha Rao', property: 'Plot 12, Example Layout, Pune', lender: '', preparedBy: '' } };
  const v = view(FLAT_IN), h = view(HOUSE);
  const section = (x: typeof v, id: string) => x.sections.find((y) => y.id === id)!;
  const notesOf = (family: string) => (['what', 'cost', 'check'] as const).map((k) => NOTES.get(family)![k]);
  it('a line whose family has notes: what it is, why it costs what it does, what to check, then their sources, linked and checked against them (E2)', () => {
    const l = section(v, 'wardrobes').lines.find((x) => x.key === 'bedroom-1:wardrobe:wardrobe')!;
    expect(l.why!.items).toEqual(notesOf('wardrobe').map((n, i) => ({ label: ['What it is', 'Why it costs what it does', 'What to check'][i], text: n.text })));
    expect(l.why!.sources.map((x) => x.id)).toEqual([...new Set(notesOf('wardrobe').flatMap((n) => n.src))].filter((x) => x !== 'own'));
    expect(l.why!.sources.every((x) => x.url.startsWith('https://') && x.what.length > 0)).toBe(true);
    expect(l.why).toMatchObject({ own: true, reported: false });
    // The steel's check cites our own rule (ask the structural engineer), said apart from the sources.
    const steel = section(h, 'structure').lines.find((x) => x.key === 'flat:steel:struct:steel')!;
    expect(steel.why).toMatchObject({ own: true, reported: false });
    expect(steel.why!.sources.map((x) => x.id)).not.toContain('own');
  });
  it('every line of the top five families in both cases has a Why?; a line of a family with no notes yet has none', () => {
    for (const [x, input] of [[v, FLAT_IN], [h, HOUSE]] as const) {
      const family = new Map((architect(inputOf(input)) as ArchitectEstimate).lines.map((l) => [l.key, l.family]));
      for (const l of x.sections.flatMap((y) => y.lines)) expect(!!l.why, l.key).toBe(NOTES.has(family.get(l.key)!));
    }
    const counter = section(v, 'kitchen').lines.find((x) => x.key === 'kitchen:counter:counter-top')!;
    expect([counter.name.length > 0, NOTES.has('counter'), counter.why]).toEqual([true, false, undefined]);
  });
  it('a section with a rule says where to spend and where to save, on or off; one with none has no Why?', () => {
    const rule = (id: string) => SPEND_SAVE.filter((r) => r.section === id).map((r) => r.text);
    expect(section(v, 'walls').why!.items).toEqual([{ label: 'Save here', text: rule('walls')[0] }]);
    expect(section(v, 'electrical').why!.items.map((x) => x.label)).toEqual(['Spend on the wiring', 'Save on the light fittings']);
    expect(section(v, 'waterproofing')).toMatchObject({ on: false, why: { items: [{ label: 'Spend here', text: rule('waterproofing')[0] }], reported: false } });
    expect(section(h, 'structure').why!.items[0]).toEqual({ label: 'Spend here', text: rule('structure')[0] });
    // Our own rule alone: no source to list, and nothing as reported.
    expect(section(v, 'furniture').why).toMatchObject({ sources: [], own: true, reported: false });
    expect(section(v, 'kitchen').why).toBeUndefined();
  });
  it('the documents stay as they are: no note, label or rule in the PDF, the Excel or the Word', () => {
    const text = docText(planDoc(HOUSE, planPreview(HOUSE), TODAY)!);
    for (const n of [...NOTES.values()].flatMap((x) => [x.what, x.cost, x.check]).concat(SPEND_SAVE)) expect(text).not.toContain(n.text);
    expect(text).not.toMatch(/What it is|Why it costs|What to check|Where to spend/);
  });
});
