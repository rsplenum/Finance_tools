/**
 * The architect (engine/architect.ts) on fictional flats. The rooms, openings and measurements of a 2BHK of 1,000 sq ft
 * are worked by hand below; every estimate is also worked a second way (architect-check.ts) and shows nothing when the
 * two disagree. Rates come from the library (tests/library.test.ts); no figure here comes from the owner's office or
 * employer (D-BIZ-02). The owner's own fictional flat, worked at home, is still to come (HANDOFF).
 */
import { describe, it, expect } from 'vitest';
import { architect, architectNeeds, changeOf, choicesFor, cityFactor, levelRuns, overPackage, planOpenings, planRooms, strip, type ArchitectEstimate, type ArchitectInput, type Bhk, type Change, type Level, type LevelRuns, type Stage } from '../engine/architect';
import { architectCheck, checkRate } from '../engine/architect-check';
import { price } from '../engine/library';
import { inr } from '../engine/util';
import type { Blocked, Needs } from '../engine/dscr';

const SQ = 0.3048 * 0.3048;
const flat = (x: Partial<ArchitectInput> = {}): ArchitectInput => ({ kind: 'renovate', property: 'flat', city: 'pune', area: 1000, bhk: '2', level: 2, ...x });
const run = (x: Partial<ArchitectInput> = {}) => architect(flat(x)) as ArchitectEstimate;
const line = (e: ArchitectEstimate, key: string) => e.lines.find((l) => l.key === key);

describe('the rooms of a 2BHK of 1,000 sq ft, by hand', () => {
  // The rooms share 85% (850 sq ft) in proportion to 200 : 145 : 120 : 70 : 32.5 : 32.5 (600): living 283.33, main
  // bedroom 205.42, bedroom 170.00, kitchen 99.17, each bathroom 46.04; the passage 10% = 100; the balcony its own 50.
  const rooms = planRooms('2', 1000 * SQ);
  it('the areas', () => {
    expect(rooms.map((r) => [r.id, +(r.sqm / SQ).toFixed(2)])).toEqual([
      ['living', 283.33], ['bedroom-1', 205.42], ['bedroom-2', 170], ['kitchen', 99.17], ['bath-1', 46.04], ['bath-2', 46.04], ['passage', 100], ['balcony', 50],
    ]);
  });
  it('the living room is 1.3 times as long as it is wide: 26.3225 sq m is 5.8497 × 4.4998 m', () => {
    const r = rooms[0];
    expect([r.l.toFixed(4), r.b.toFixed(4)]).toEqual(['5.8497', '4.4998']);
  });
  it('the openings: one main door, two bedroom doors, two bathroom doors (the first to the main bedroom), the kitchen, the balcony; windows of 1.219 × 1.219 = 1.486 sq m, enough for a tenth of the floor: two in the living room (2.63 sq m needed), two in each bedroom (1.91 and 1.58 sq m), one in the kitchen; a ventilator in each bathroom', () => {
    const o = planOpenings(rooms);
    const count = (type: string) => o.filter((x) => x.type === type).length;
    expect([count('main'), count('bedroom'), count('bath'), count('kitchen'), count('balcony'), count('window'), count('kitchenWindow'), count('ventilator')]).toEqual([1, 2, 2, 1, 1, 6, 1, 2]);
    expect(o.find((x) => x.id === 'bath-1:bath')?.other).toBe('bedroom-1');
    expect(o.find((x) => x.id === 'bath-2:bath')?.other).toBe('passage');
  });
});

describe('measuring by IS 1200, by hand (the living room above, ceiling 2.9 m)', () => {
  const e = run();
  it('paint: walls 20.6990 m × 2.9 = 60.0272 sq m, less two windows of 1.486 sq m and the 3.15 sq m balcony door, plus that door\'s reveals (2 × 2.1 + 1.5) × 0.23 = 1.311; the kitchen opening, 1.89 sq m on its other side, is not deducted: 55.2163 sq m; with the 26.3225 sq m ceiling, 81.5388 sq m = 877.68 sq ft', () => {
    expect(line(e, 'living:paint:paint')?.qty).toBe(877.68);
  });
  it('the floor with skirting: 26.3225 sq m, and 100 mm of skirting along 20.6990 m less the 0.9 m kitchen opening and the 1.5 m balcony door = 1.8299 sq m: 28.1524 sq m = 303.03 sq ft', () => {
    expect(line(e, 'living:floor:floor-skirting')?.qty).toBe(303.03);
  });
  it('a bathroom\'s wall tiles at Standard, 8 ft (2.4384 m) high, less the 0.75 × 2.1 m door; the ventilator, under 0.5 sq m, is not deducted', () => {
    const b = planRooms('2', 1000 * SQ).find((r) => r.id === 'bath-1');
    const hand = 2 * ((b?.l ?? 0) + (b?.b ?? 0)) * 2.4384 - 0.75 * 2.1;
    expect(line(e, 'bath-1:wall-tile:bath-tiles')?.qty).toBe(+(hand / SQ).toFixed(2));
  });
  it('the kitchen counter: an L, the kitchen\'s length plus breadth less 0.6 m', () => {
    const k = planRooms('2', 1000 * SQ).find((r) => r.id === 'kitchen');
    expect(line(e, 'kitchen:cabinets:counter-run')?.qty).toBe(+((((k?.l ?? 0) + (k?.b ?? 0) - 0.6) / 0.3048).toFixed(2)));
  });
  it('points by the room: a 2BHK has 10 + 7 + 6 + 7 + 3 + 3 + 2 + 2 = 40', () => {
    expect(e.lines.filter((l) => l.family === 'wiring').reduce((s, l) => s + l.qty, 0)).toBe(40);
  });
});

describe('a new house: G+1, 2,000 sq ft built up, 3 BHK, in Pune at Basic, by hand (D-UX-23)', () => {
  const house = (x: Partial<ArchitectInput> = {}) => architect({ kind: 'build', floors: 2, city: 'pune', area: 2000, bhk: '3', level: 1, ...x }) as ArchitectEstimate;
  const e = house();
  it('the outline: 1,000 sq ft (92.9030 sq m) a floor, 1.25 times as long as wide, is 10.7763 × 8.6210 m; its 230 mm outer walls take 2 × 0.23 × 19.3973 − 4 × 0.23² = 8.7112 sq m and the stair 2.5 × 4.5 = 11.25 sq m a floor, so 185.8061 − 2 × 19.9612 = 145.8837 sq m (1,570.28 sq ft) is left for the rooms', () => {
    expect([e.house?.l.toFixed(4), e.house?.b.toFixed(4), e.house?.wall.toFixed(4)]).toEqual(['10.7763', '8.6210', '8.7112']);
    expect(e.carpetSqft.toFixed(2)).toBe('1570.28');
    // A house of the ground floor only has its stair to the terrace too: 92.9030 − 8.7112 − 11.25 = 72.9419 sq m (785.14 sq ft).
    expect(house({ floors: 1, area: 1000 }).house?.stair).toBe(11.25);
    expect(house({ floors: 1, area: 1000 }).carpetSqft.toFixed(2)).toBe('785.14');
  });
  it('the structure, against Brick&Bolt\'s worked 1,000 sq ft house (350–450 bags of cement, 3–4 t of steel, 1,200–1,600 cft of sand, 1,500–2,000 cft of aggregate, 8,000–10,000 bricks): the middle of each a sq ft, on the 1,000 sq ft and the stair cabin\'s 11.25 sq m = 121.0940 sq ft, so 1,121.0940 sq ft: 448.44 bags, 3,923.83 kg, 1,569.53 cft = 44.44 cu m, 1,961.91 cft = 55.56 cu m and 10,089.85 bricks', () => {
    const g = house({ floors: 1, area: 1000 });
    const qty = ['cement:struct:cement', 'steel:struct:steel', 'sand:struct:sand', 'coarse-aggregate:struct:aggregate', 'brick:struct:bricks'].map((k) => line(g, `flat:${k}`)?.qty);
    expect(qty).toEqual([448.44, 3923.83, 44.44, 55.56, 10089.85]);
    // A sq ft, each is still Brick&Bolt's middle.
    expect([qty[0] as number / 1121.094, qty[1] as number / 1121.094, qty[4] as number / 1121.094].map((x) => x.toFixed(3))).toEqual(['0.400', '3.500', '9.000']);
  });
  it('the rates: cement Rs. 387.50 + 3.5% wastage = 401.06 a bag; steel 57 + 4% = 59.28 a kg; a brick 9 + 6.5% = 9.585, half up 9.59; RCC labour 180 × Pune\'s 0.969072 = 174.43 a sq ft; on 2,000 + 121.0940 = 2,121.0940 sq ft', () => {
    expect(line(e, 'flat:cement:struct:cement')).toMatchObject({ qty: 848.44, rate: 401.06, amount: 340275.35 });
    expect(line(e, 'flat:steel:struct:steel')).toMatchObject({ qty: 7423.83, rate: 59.28, amount: 440084.64 });
    expect(line(e, 'flat:brick:struct:bricks')).toMatchObject({ qty: 19089.85, rate: 9.59, amount: 183071.66 });
    expect(line(e, 'flat:labour-rcc:built-up')).toMatchObject({ qty: 2121.09, rate: 174.43, amount: 369981.73 });
    expect(checkRate('mu-brick', 'pune')).toBe(9.59);
  });
  it('the terrace: inside the parapet 10.3163 × 8.1610 = 84.19 sq m, and 36.9547 m × 0.3 m up it = 11.09 sq m: 95.28 sq m = 1,025.57 sq ft, an APP membrane at every level', () => {
    expect(line(e, 'flat:roof-waterproofing:terrace')).toMatchObject({ qty: 1025.57, entry: 'wp-app', level: null });
    expect(line(house({ level: 5 }), 'flat:roof-waterproofing:terrace')?.entry).toBe('wp-app');
  });
  it('the outside walls: 38.7947 m × (2 × 3.05 + 1.0 m of parapet) = 275.44 sq m, the parapet\'s inside 36.9547 × 1.0 = 36.95 sq m, and the stair cabin\'s outside 14 m × 2.7 m = 37.80 sq m: 350.20 sq m = 3,769.49 sq ft of economy emulsion at Basic', () => {
    expect(line(e, 'flat:exterior-paint:exterior-walls')).toMatchObject({ qty: 3769.49, entry: 'ex-ace' });
  });
  it('the stair railing: a stair on each floor, the top one to the terrace, each two flights of √(2.2² + 1.525²) = 2.6769 m and 0.3 m at the landing: 2 × 5.6538 = 11.3075 m = 37.10 rft; a house of one floor has one, 18.55 rft', () => {
    expect(line(e, 'flat:railing:stair-railing')).toMatchObject({ qty: 37.1, entry: 'rl-ms' });
    expect(line(house({ floors: 1, area: 1000 }), 'flat:railing:stair-railing')?.qty).toBe(18.55);
  });
  it('the sections: the structure, waterproofing, the terrace and outside, and every finish and service inside; no civil repairs; new wiring and a board', () => {
    expect(e.sections.map((x) => x.id)).toEqual(['structure', 'waterproofing', 'exterior', 'flooring', 'walls', 'ceiling', 'bathrooms', 'kitchen', 'wardrobes', 'doors', 'electrical', 'plumbing', 'outside', 'water', 'appliances', 'smart', 'furniture', 'furnishings']);
    expect(e.sections.filter((x) => x.on).length).toBe(13);
    expect(e.lines.filter((l) => l.family === 'wiring').length).toBeGreaterThan(0);
    expect(line(e, 'flat:db:one')).toBeDefined();
    expect(run().sections.map((x) => x.id)).not.toContain('structure');
  });
  it('the structure is the same at every level; the strip moves only what is above it', () => {
    const lv = (n: Level) => house({ level: n }).sections.find((x) => x.id === 'structure')?.amount;
    expect(new Set([1, 2, 3, 4, 5].map((n) => lv(n as Level))).size).toBe(1);
    const s = strip({ kind: 'build', floors: 2, city: 'pune', area: 2000, bhk: '3', level: 1 }) as number[];
    expect(s[0]).toBe(e.total);
    expect(s.every((x, i) => i === 0 || x > s[i - 1])).toBe(true);
  });
  it('the cost a sq ft is of the built-up area; the flags say the structure is by rules of thumb, how the rooms are planned, what is not in yet and the city\'s reported range', () => {
    expect(e.per).toBe('built-up');
    expect(e.perSqft).toBeCloseTo(e.total / 2000, 2);
    for (const start of ['The structure\'s materials and labour are rules of thumb', 'The rooms are planned as one home of 1570 sq ft', 'Not in this estimate yet: a borewell', 'The compound wall runs round all four sides'])
      expect(e.flags.some((f) => f.text.startsWith(start)), start).toBe(true);
    // With the outside works and the water in (E5), Basic comes inside Pune's reported Rs. 1,800–2,900 a sq ft, so no range flag; Bespoke goes above it.
    expect(e.perSqft > 1800 && e.perSqft < 2900).toBe(true);
    expect(e.flags.some((f) => f.text.startsWith('This estimate comes to'))).toBe(false);
    // V1: the range is read as a standard finish's, so above it at Bespoke is a note, not a flag with the answer.
    const top = house({ level: 5 }), range = top.flags.find((f) => f.text.includes('houses in Pune'));
    expect(range).toEqual({ text: `At Bespoke this estimate comes to Rs. ${Math.round(top.perSqft).toLocaleString('en-IN')} a sq ft of built-up area; houses in Pune built to a standard finish are reported at Rs. 1,800–2,900 a sq ft (as reported), and dearer finishes cost more.`, decides: false, n: top.total });
    expect(e.flags.some((f) => f.text.startsWith('A house: its rooms inside'))).toBe(false);
  });
  it('the second computation draws the house its own way and agrees line by line', () => {
    const c = architectCheck({ kind: 'build', floors: 2, city: 'pune', area: 2000, bhk: '3', level: 1 });
    for (const l of e.lines) expect(c.lines.get(l.key)?.qty, l.key).toBeCloseTo(l.qty, 2);
  });
  it('a built-up area too small for its floors is asked for again', () => {
    expect(architect({ kind: 'build', floors: 4, city: 'pune', area: 600, bhk: '2', level: 1 })).toEqual({ needs: ['A larger built-up area: the outer walls and stairs of 4 floors take more than half of it'] });
  });
});

describe('E5: a new house\'s plot, outside works, water, stairs and stages, by hand (G+1, 2,000 sq ft, 3 BHK, Pune, Basic)', () => {
  const input: ArchitectInput = { kind: 'build', floors: 2, city: 'pune', area: 2000, bhk: '3', level: 1 };
  const house = (x: Partial<ArchitectInput> = {}) => architect({ ...input, ...x }) as ArchitectEstimate;
  const e = house();
  it('the plot: the outline 10.7763 × 8.6210 m with 3 m in front, 1.5 m behind and 1 m each side, 15.2763 × 10.6210 m = 162.2504 sq m (50.12 × 34.85 ft, 1,746 sq ft)', () => {
    expect([e.house?.plot.l.toFixed(4), e.house?.plot.b.toFixed(4), e.house?.plot.sqm.toFixed(4), e.house?.plot.own, e.house?.plot.fits]).toEqual(['15.2763', '10.6210', '162.2504', false, true]);
    expect(e.assumptions.find((a) => a.what === 'The plot')?.shown).toBe('50.12 × 34.85 ft, 1,746 sq ft: the house\'s outline with 3 m in front, 1.5 m behind and 1 m on each side');
  });
  it('the compound wall: round the plot 2 × (15.2763 + 10.6210) = 51.7947 m less the 3 m gate, 48.7947 m = 160.09 rft at Rs. 1,350 × 0.969072 = 1,308.25: Rs. 2,09,437.74; its paint on both faces 2 × 48.7947 × 1.5 = 146.3841 sq m = 1,575.67 sq ft', () => {
    expect(line(e, 'flat:compound-wall:compound-wall')).toMatchObject({ qty: 160.09, rate: 1308.25, amount: 209437.74, section: 'outside' });
    expect(line(e, 'flat:exterior-paint:compound-paint')).toMatchObject({ qty: 1575.67, entry: 'ex-ace', section: 'outside' });
  });
  it('the gate 3 × 1.5 m = 48.44 sq ft of MS at Rs. 292.50 × 0.969072 = 283.45: Rs. 13,730.32; the paving 162.2504 − 92.9030 = 69.3473 sq m = 746.45 sq ft of 60 mm pavers at Rs. 60 + 13 × 0.969072 = 72.60: Rs. 54,192.27', () => {
    expect(line(e, 'flat:gate:gate')).toMatchObject({ qty: 48.44, rate: 283.45, amount: 13730.32, entry: 'gt-ms' });
    expect(line(e, 'flat:paving:paving')).toMatchObject({ qty: 746.45, rate: 72.6, amount: 54192.27, entry: 'pv-concrete-60' });
    expect(line(house({ level: 3 }), 'flat:gate:gate')?.entry).toBe('gt-ss');
  });
  it('the water for 5 people at 135 litres a day: a sump of 3 days, 2,025 litres up to 3,000 at Rs. 22.50 × 0.969072 = 21.80 a litre (Rs. 65,400); a tank of a day, 675 litres, the next size 750 at Rs. 9.50 (Rs. 7,125); a 3BHK\'s septic tank of 7,250 litres at Rs. 92,500 ÷ 7,250 × 0.969072 = 12.36 (Rs. 89,610); a recharge pit 11,500 × 0.969072 + 3,500 + 6,000 + 11,500 × 0.969072 = Rs. 31,788.66', () => {
    expect(line(e, 'flat:sump:sump')).toMatchObject({ qty: 3000, unit: 'litre', rate: 21.8, amount: 65400 });
    expect(line(e, 'flat:overhead-tank:tank')).toMatchObject({ qty: 750, rate: 9.5, amount: 7125 });
    expect(line(e, 'flat:septic:septic')).toMatchObject({ qty: 7250, rate: 12.36, amount: 89610 });
    expect(line(e, 'flat:rwh:rwh')).toMatchObject({ qty: 1, rate: 31788.66, amount: 31788.66 });
    expect(line(e, 'flat:sewer:sewer')).toBeUndefined();
    expect(e.sections.find((x) => x.id === 'water')?.amount).toBe(193923.66);
  });
  it('a 1BHK takes 3 people: a sump of 1,215 litres up to 2,000, a tank of 405 up to 500 and a 4,500-litre septic tank', () => {
    const one = house({ bhk: '1' });
    expect([line(one, 'flat:sump:sump')?.qty, line(one, 'flat:overhead-tank:tank')?.qty, line(one, 'flat:septic:septic')?.qty]).toEqual([2000, 500, 4500]);
  });
  it('where the sewer reaches the plot, a sewer connection takes the septic tank\'s place, without a rate yet, and is flagged', () => {
    const w = house({ sewer: true });
    expect(line(w, 'flat:septic:septic')).toBeUndefined();
    expect(w.unpriced.map((u) => u.key)).toContain('flat:sewer:sewer');
    expect(w.flags.some((f) => f.text.includes('Sewer connection has no rate yet'))).toBe(true);
    expect(w.total).toBeCloseTo(e.total - 89610, 2);
    expect(w.assumptions.find((a) => a.what === 'Water')?.shown).toContain('the city\'s sewer in place of a septic tank');
  });
  it('the stairs: two, each treads 2 × 1.1 × 2.2 = 4.84, risers 1.1 × 3.05 = 3.355, the landing 1.2 × 2.5 = 3 and the floor\'s landing 1.1 × 2.5 = 2.75 sq m: 13.945; 27.89 sq m = 300.21 sq ft of Kota stone at Rs. 135 × 0.969072 = 130.82: Rs. 39,273.47; the well\'s walls 14 m × (2 × 3.05 + 2.7) = 123.2 sq m = 1,326.11 sq ft; a WPC door to the terrace', () => {
    expect(line(e, 'flat:stair-finish:stair-finish')).toMatchObject({ qty: 300.21, rate: 130.82, amount: 39273.47, entry: 'stf-kota', section: 'exterior' });
    expect(line(e, 'flat:paint:stair-walls')).toMatchObject({ qty: 1326.11, section: 'exterior' });
    expect(line(e, 'flat:bath-door:terrace-door')).toMatchObject({ qty: 1, entry: 'bd-wpc' });
    expect(line(house({ level: 2 }), 'flat:stair-finish:stair-finish')?.entry).toBe('stf-granite');
  });
  it('the stages add up to the total: the structure split 12.5 : 22.5 : 17.5 (Brick&Bolt\'s middles), each floor\'s slab alike, the walls taking what is left; the finishes, the outside works and the water from the lines', () => {
    const st = e.stages as Stage[], S = e.sections.find((x) => x.id === 'structure')?.amount as number;
    expect(st.map((x) => x.id)).toEqual(['foundation', 'slab-1', 'slab-2', 'walls', 'finishing', 'outside']);
    expect(st.map((x) => x.name)).toEqual(['Foundation and plinth', 'Ground floor roof slab', 'First floor roof slab', 'Walls and plaster', 'Finishing', 'Outside works and water']);
    const f = Math.round((S * 12.5 / 52.5) * 100) / 100, slab = Math.round((S * 22.5 / 52.5 / 2) * 100) / 100;
    expect(st[0].amount).toBe(f);
    expect(st[1].amount).toBe(slab);
    expect(st[2].amount).toBe(slab);
    expect(st[3].amount).toBeCloseTo(S - f - 2 * slab, 2);
    const outside = e.sections.filter((x) => x.id === 'outside' || x.id === 'water').reduce((t, x) => t + x.amount, 0);
    expect(st[5].amount).toBeCloseTo(outside, 2);
    expect(st.reduce((t, x) => t + x.amount, 0)).toBeCloseTo(e.total, 2);
    expect(st.reduce((t, x) => t + x.share, 0)).toBeCloseTo(1, 9);
    const top = house({ level: 5 }).stages as Stage[];
    expect(top.slice(0, 4).map((x) => x.amount)).toEqual(st.slice(0, 4).map((x) => x.amount));
    expect(top[4].amount).toBeGreaterThan(st[4].amount);
  });
  it('a house of one floor has one roof slab; movable items switched on are a stage of their own', () => {
    expect((house({ floors: 1, area: 1000 }).stages as Stage[]).map((x) => x.name)).toEqual(['Foundation and plinth', 'Roof slab', 'Walls and plaster', 'Finishing', 'Outside works and water']);
    const m = house({ sections: { furniture: true } });
    expect((m.stages as Stage[]).at(-1)).toMatchObject({ id: 'movable', amount: m.split.movable });
  });
  it('your own plot, 30 × 40 ft (9.144 × 12.192 m): the compound wall 2 × 21.336 − 3 = 39.672 m = 130.16 rft, the paving 111.4836 − 92.9030 = 18.5806 sq m = 200 sq ft; a plot smaller than the outline is flagged, and a side out of range asked again', () => {
    const own = house({ plot: { l: 12.192, b: 9.144 } });
    expect(line(own, 'flat:compound-wall:compound-wall')?.qty).toBe(130.16);
    expect(line(own, 'flat:paving:paving')?.qty).toBe(200);
    expect(own.house?.plot).toMatchObject({ own: true, fits: true });
    const small = house({ plot: { l: 10, b: 8 } });
    expect(small.house?.plot.fits).toBe(false);
    expect(small.flags.some((f) => f.text.startsWith('Your plot, 32.81 × 26.25 ft, is smaller than the house\'s outline, 35.36 × 28.28 ft'))).toBe(true);
    expect(line(small, 'flat:paving:paving')).toBeUndefined();
    expect(architectNeeds({ ...input, plot: { l: 2, b: 9 } })).toEqual(['Each side of the plot from 3 to 300 m']);
  });
  it('the second computation agrees on every new line and every stage, and a stage that differs blocks the estimate', () => {
    const c = architectCheck(input);
    for (const k of ['flat:compound-wall:compound-wall', 'flat:paving:paving', 'flat:sump:sump', 'flat:overhead-tank:tank', 'flat:septic:septic', 'flat:stair-finish:stair-finish', 'flat:paint:stair-walls', 'flat:exterior-paint:compound-paint'])
      expect(c.lines.get(k)?.qty, k).toBeCloseTo(line(e, k)?.qty as number, 2);
    for (const st of e.stages as Stage[]) expect(c.stages.get(st.id), st.id).toBeCloseTo(st.amount, 1);
    const wrong = (i: ArchitectInput) => { const x = architectCheck(i); x.stages.set('walls', (x.stages.get('walls') ?? 0) + 5); return x; };
    expect(architect(input, wrong)).toEqual({ blocked: 'The two computations disagree on the stage Walls and plaster, so no figures are shown. Please report this.' });
  });
  it('the flags: the compound wall and the water are no longer among what is left out; the rainwater pit and the margins to check; risers above 190 mm', () => {
    expect(e.flags.some((f) => f.text.startsWith('Not in this estimate yet: a borewell; the plan\'s approval fees'))).toBe(true);
    expect(e.flags.some((f) => f.text.includes('the compound wall, gate and paving;'))).toBe(false);
    expect(e.flags.some((f) => f.text.startsWith('Rainwater harvesting is one recharge pit'))).toBe(true);
    expect(e.flags.some((f) => f.text.startsWith('The stairs\' risers'))).toBe(false);
    expect(house({ heightM: 3.5 }).flags.some((f) => f.text.startsWith('The stairs\' risers come to 203 mm'))).toBe(true);
  });
});

describe('the estimate', () => {
  it('asks for what it needs, in order', () => {
    expect(architectNeeds({})).toEqual(['What the work is: build a new house, repair or renovate, or interiors', 'Which city', 'The carpet area', 'How many bedrooms', 'Which level']);
    expect(architectNeeds({ kind: 'build' })).toEqual(['How many floors', 'Which city', 'The built-up area of all floors', 'How many bedrooms', 'Which level']);
  });
  it('a house: its rooms inside, worked out as a flat\'s and flagged, with the lines for the whole of it named so', () => {
    const h = run({ property: 'house' }), f = run();
    expect(h.total).toBe(f.total);
    expect(h.property).toBe('house');
    expect(h.flags.some((x) => x.text.startsWith('A house: its rooms inside are worked out as a flat\'s'))).toBe(true);
    expect(f.flags.some((x) => x.text.startsWith('A house'))).toBe(false);
    expect(h.lines.filter((l) => l.room === null).map((l) => l.roomName)).toEqual(f.lines.filter((l) => l.room === null).map(() => 'Whole house'));
  });
  it('adds up: each line is its quantity × its rate, the sections are the lines, the total is the sections, the cost per sq ft is the total ÷ the carpet area', () => {
    const e = run();
    for (const l of e.lines) expect(Math.abs(l.amount - l.qty * l.rate)).toBeLessThanOrEqual(0.005 + 1e-9);
    for (const s of e.sections) expect(s.amount).toBeCloseTo(e.lines.filter((l) => l.section === s.id).reduce((t, l) => t + l.amount, 0), 2);
    expect(e.total).toBeCloseTo(e.sections.reduce((t, s) => t + s.amount, 0), 2);
    expect(e.perSqft).toBeCloseTo(e.total / 1000, 2);
    expect(e.split.fixed + e.split.movable + e.split.appliance).toBeCloseTo(e.total, 1);
  });
  it('shows nothing when the second computation disagrees', () => {
    const wrong = (input: ArchitectInput) => { const c = architectCheck(input); c.total += 100; return c; };
    expect((architect(flat(), wrong) as Blocked).blocked).toMatch(/disagree on the total/);
    const wrongLine = (input: ArchitectInput) => { const c = architectCheck(input); const k = 'living:paint:paint'; const x = c.lines.get(k); if (x) c.lines.set(k, { ...x, qty: x.qty + 1 }); return c; };
    expect((architect(flat(), wrongLine) as Blocked).blocked).toMatch(/quantity of Living and dining/);
  });
  it('the sections follow the kind: a renovation strips and rebuilds; interiors fit out', () => {
    const r = run(), i = run({ kind: 'interiors' });
    const on = (e: ArchitectEstimate) => e.sections.filter((s) => s.on).map((s) => s.id);
    expect(on(r)).toEqual(['civil', 'waterproofing', 'flooring', 'walls', 'ceiling', 'bathrooms', 'kitchen', 'doors', 'electrical', 'plumbing']);
    expect(on(i)).toEqual(['civil', 'walls', 'ceiling', 'kitchen', 'wardrobes', 'electrical', 'appliances', 'smart', 'furniture', 'furnishings']);
    expect(i.lines.some((l) => l.family === 'demolish-floor' || l.family === 'wiring')).toBe(false);
  });
  it('a slider moves one section and nothing else; an item of the user\'s own replaces the level\'s', () => {
    const base = run(), up = run({ sliders: { bathrooms: 4 } });
    for (const s of base.sections) if (s.id !== 'bathrooms' && s.id !== 'walls') expect(up.sections.find((x) => x.id === s.id)?.amount, s.id).toBe(s.amount);
    expect(up.sections.find((s) => s.id === 'bathrooms')?.amount).toBeGreaterThan(base.sections.find((s) => s.id === 'bathrooms')?.amount as number);
    const kota = run({ items: { 'living:floor:floor-skirting': 'fl-kota' } });
    expect(line(kota, 'living:floor:floor-skirting')?.entry).toBe('fl-kota');
    expect(line(kota, 'living:floor:floor-skirting')?.chosen).toBe(true);
  });
  it('a section switched off leaves the estimate', () => {
    const e = run({ sections: { kitchen: false } });
    expect(e.lines.some((l) => l.section === 'kitchen')).toBe(false);
  });
  it('a chosen item with no rate yet is left out and named', () => {
    const e = run({ items: { 'living:floor:floor-skirting': 'fl-granite' } });
    expect(line(e, 'living:floor:floor-skirting')).toBeUndefined();
    expect(e.unpriced.map((u) => u.entryName)).toEqual(['Granite flooring']);
    expect(e.flags.some((f) => f.text.includes('Granite flooring has no rate yet'))).toBe(true);
  });
  it('flags a room below the Code\'s minimum, and a place with no city figure', () => {
    const tiny = run({ area: 450, bhk: '3' });
    expect(tiny.flags.some((f) => f.text.includes('below the Code'))).toBe(true);
    const other = run({ city: 'other' });
    expect(other.cityFactor).toBe(1);
    expect(other.flags.map((f) => f.text)).toContain('No city figure for your city: the rates are used as they are.');
  });
  it('the city factor: Mumbai\'s middle 2,850 against the average 2,425 is 1.1753; Pune\'s 2,350 is 0.9691', () => {
    expect(cityFactor('mumbai')?.toFixed(4)).toBe('1.1753');
    expect(cityFactor('pune')?.toFixed(4)).toBe('0.9691');
    expect(cityFactor('nowhere')).toBeNull();
  });
});

describe('every flat, kind, level and city works out, and both computations agree', () => {
  const bhks: Bhk[] = ['1RK', '1', '2', '3', '4', '5'];
  const areas: Record<Bhk, number> = { '1RK': 350, '1': 520, '2': 850, '3': 1150, '4': 1600, '5': 2200 };
  it('the five-level strip rises from Basic to Bespoke', () => {
    for (const bhk of bhks) for (const kind of ['renovate', 'interiors'] as const) for (const city of ['mumbai', 'pune', 'other']) {
      const s = strip(flat({ bhk, kind, city, area: areas[bhk] })) as number[];
      expect(Array.isArray(s), `${bhk} ${kind} ${city}: ${JSON.stringify(s)}`).toBe(true);
      for (let i = 1; i < 5; i++) expect(s[i], `${bhk} ${kind} ${city} level ${i + 1}`).toBeGreaterThan(s[i - 1]);
    }
  });
  it('sliders set at random never block', () => {
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const sections = ['flooring', 'walls', 'ceiling', 'bathrooms', 'kitchen', 'wardrobes', 'doors', 'electrical', 'appliances', 'smart', 'furniture', 'furnishings'];
    for (let n = 0; n < 60; n++) {
      const sliders = Object.fromEntries(sections.map((s) => [s, (1 + Math.floor(rnd() * 5)) as Level]));
      const onOff = Object.fromEntries(sections.map((s) => [s, rnd() > 0.2]));
      const e = architect(flat({ bhk: bhks[n % 6], area: areas[bhks[n % 6]] * (0.8 + rnd() * 0.5), level: (1 + (n % 5)) as Level, sliders, sections: onOff, kind: n % 2 ? 'renovate' : 'interiors', heightM: 2.75 + rnd() * 0.5 }));
      expect('total' in e, JSON.stringify(e).slice(0, 200)).toBe(true);
    }
  });
});

describe('what the page shows beside the estimate', () => {
  it('the change from the package: nil with no slider; with Flooring at Luxury, Flooring\'s amount less its amount at Standard, and nothing else', () => {
    const none = overPackage(flat()) as Record<string, number>;
    expect(Object.values(none).every((x) => x === 0)).toBe(true);
    const base = run(), up = run({ sliders: { flooring: 4 } });
    const over = overPackage(flat({ sliders: { flooring: 4 } })) as Record<string, number>;
    const at = (e: ArchitectEstimate, id: string) => e.sections.find((s) => s.id === id)?.amount as number;
    expect(over.flooring).toBeCloseTo(at(up, 'flooring') - at(base, 'flooring'), 2);
    expect(over.flooring).toBeGreaterThan(0);
    for (const [id, x] of Object.entries(over)) if (id !== 'flooring') expect(x, id).toBe(0);
    // An item of the user's own counts as a change from the package too.
    const kota = overPackage(flat({ items: { 'living:floor:floor-skirting': 'fl-kota' } })) as Record<string, number>;
    expect(kota.flooring).toBeCloseTo(at(run({ items: { 'living:floor:floor-skirting': 'fl-kota' } }), 'flooring') - at(base, 'flooring'), 2);
  });
  it('the change from the package shows nothing when the second computation disagrees', () => {
    const wrong = (input: ArchitectInput) => { const c = architectCheck(input); if (input.sliders?.flooring) c.sections.set('flooring', (c.sections.get('flooring') ?? 0) + 100); return c; };
    expect('blocked' in (overPackage(flat({ sliders: { flooring: 4 } }), wrong) as Blocked)).toBe(true);
    expect((overPackage({}) as Needs).needs.length).toBe(5);
  });
  it('the item drawer: the family\'s five levels, the line\'s own item among them at its rate, and the other items priced by a unit the line can take', () => {
    const e = run(), key = 'living:floor:floor-skirting', l = line(e, key);
    const c = choicesFor(flat(), key);
    expect(c?.ladder.length).toBe(5);
    expect(c?.ladder[1]?.id).toBe(l?.entry);
    expect(c?.ladder[1]?.rate).toBe(l?.rate);
    for (const x of [...(c?.ladder ?? []), ...(c?.others ?? [])]) {
      if (!x) continue;
      expect(['sqft', 'sqm'], x.id).toContain(x.unit);
      if (x.rate !== null) expect(x.rate, x.id).toBe(price(x.id, cityFactor('pune') as number, 18)?.rate);
      if (x.rate !== null) expect(x.rate, x.id).toBe(checkRate(x.id, 'pune'));
    }
    expect(c?.others.some((x) => x.id === 'fl-kota')).toBe(true);
    expect(c?.others.find((x) => x.id === 'fl-granite')?.rate).toBeNull();
    expect(c?.others.some((x) => c.ladder.some((y) => y?.id === x.id))).toBe(false);
    expect(choicesFor(flat(), 'living:nothing:floor')).toBeNull();
  });
  it('the item drawer leaves out a rate the two computations disagree on', () => {
    const c = choicesFor(flat(), 'living:floor:floor-skirting', (id, city) => (checkRate(id, city) ?? 0) + 1);
    expect(c?.ladder.every((x) => x === null || x.rate === null)).toBe(true);
  });
});

describe('E3: a room of your own size and level, the furniture and soft furnishings, Compare and What changed', () => {
  const FT = 0.3048;
  it('a room\'s own size: the living room as 16 × 20 ft is 6.096 × 4.8768 m (the longer side its length), 320 sq ft; its floor with skirting along 21.9456 m less the 0.9 m kitchen opening and the 1.5 m balcony door, 1.95456 sq m: 31.6835 sq m = 341.04 sq ft; a tenth of its 29.73 sq m is more than two windows\' 2.9719 sq m, so three; the other rooms keep their sizes', () => {
    const e = run({ rooms: { living: { l: 16 * FT, b: 20 * FT } } });
    const living = e.rooms.find((r) => r.id === 'living');
    expect([living?.l.toFixed(4), living?.b.toFixed(4), living?.typed]).toEqual(['6.0960', '4.8768', true]);
    expect(line(e, 'living:floor:floor-skirting')?.qty).toBe(341.04);
    expect(e.openings.filter((o) => o.room === 'living' && o.type === 'window').length).toBe(3);
    expect(+((e.rooms.find((r) => r.id === 'bedroom-1')?.sqm ?? 0) / SQ).toFixed(2)).toBe(205.42);
    expect(e.flags.map((f) => f.text)).toContain('With your sizes the rooms and the passage come to 987 sq ft, against the 950 sq ft the carpet area leaves for them after the inside walls: check the sizes, or the carpet area.');
    expect(e.assumptions.find((a) => a.what === 'Rooms')?.shown).toMatch(/^Living and dining 320 sq ft \(20 × 16 ft, your size\); Main bedroom 205 sq ft/);
  });
  it('a room\'s own level stands above the section\'s slider and below an item\'s own choice (A4): the first bathroom at Luxury tiles to the ceiling, 2.9 m less the door, while the second keeps 8 ft; the waterproofing does not move', () => {
    const e = run({ roomLevels: { 'bath-1': 4 } }), base = run();
    const b = planRooms('2', 1000 * SQ).find((r) => r.id === 'bath-1');
    const hand = 2 * ((b?.l ?? 0) + (b?.b ?? 0)) * 2.9 - 0.75 * 2.1;
    expect(line(e, 'bath-1:wall-tile:bath-tiles')).toMatchObject({ level: 4, qty: +(hand / SQ).toFixed(2) });
    expect(line(e, 'bath-2:wall-tile:bath-tiles')).toEqual(line(base, 'bath-2:wall-tile:bath-tiles'));
    expect(line(e, 'bath-1:waterproofing:wp-bath')).toEqual(line(base, 'bath-1:waterproofing:wp-bath'));
    expect(line(e, 'bath-1:sanitary:one')?.level).toBe(4);
    const slid = run({ sliders: { bathrooms: 1 }, roomLevels: { 'bath-1': 4 } });
    expect([line(slid, 'bath-1:sanitary:one')?.level, line(slid, 'bath-2:sanitary:one')?.level]).toEqual([4, 1]);
    const own = run({ roomLevels: { 'bath-1': 4 }, items: { 'bath-1:sanitary:one': line(base, 'bath-1:sanitary:one')?.entry as string } });
    expect(line(own, 'bath-1:sanitary:one')).toMatchObject({ entry: line(base, 'bath-1:sanitary:one')?.entry, chosen: true });
  });
  it('a bedroom of its own level: the second bedroom at Luxury gets its own AC with Appliances on, the first stays at the package', () => {
    const e = run({ kind: 'interiors', roomLevels: { 'bedroom-2': 4 } });
    expect(line(e, 'bedroom-2:ac:ac')).toMatchObject({ qty: 1, level: 4 });
    expect(line(run({ kind: 'interiors' }), 'bedroom-2:ac:ac')).toBeUndefined();
    expect(e.assumptions.find((a) => a.what === 'Rooms')?.shown).toMatch(/; Bedroom 2 170 sq ft, at Luxury;/);
  });
  it('the furniture and soft furnishings for interiors at Standard, by hand: a sofa 70,000, a dining set 48,000, a bed 25,234.50 and a mattress 17,500 in each bedroom, 2,03,469; curtains for 6 windows at 5,000 + 1.5 m of rod at 850 + fitting 325 × Pune\'s 0.969072 = 6,589.95 each, 39,539.70; all movable', () => {
    const e = run({ kind: 'interiors' });
    const at = (id: string) => e.sections.find((s) => s.id === id)?.amount;
    expect(line(e, 'living:sofa:one')).toMatchObject({ entry: 'sf-mid', qty: 1, rate: 70000, kind: 'movable' });
    expect(line(e, 'bedroom-1:bed:one')?.rate).toBe(25234.5);
    expect(line(e, 'living:curtains:window-count')).toMatchObject({ entry: 'crt-set-mid', qty: 2, rate: 6589.95, amount: 13179.9 });
    expect([at('furniture'), at('furnishings')]).toEqual([203469, 39539.7]);
    expect(e.split.movable).toBe(243008.7);
    expect(run().sections.find((s) => s.id === 'furniture')).toMatchObject({ on: false, amount: 0 });
  });
  it('the split is worked twice: a second computation that disagrees on it shows nothing', () => {
    const wrong = (input: ArchitectInput) => { const c = architectCheck(input); c.split.movable += 100; return c; };
    expect((architect(flat({ kind: 'interiors' }), wrong) as Blocked).blocked).toMatch(/disagree on the movable items/);
    const wrongRoom = (input: ArchitectInput) => { const c = architectCheck(input); const r = c.rooms.get('living'); if (r) c.rooms.set('living', { ...r, sqm: r.sqm + 0.01 }); return c; };
    expect((architect(flat(), wrongRoom) as Blocked).blocked).toMatch(/size of Living and dining/);
  });
  it('a room\'s size and level must be ones the engine takes', () => {
    expect(architectNeeds(flat({ rooms: { living: { l: 0.1, b: 5 } } }))).toEqual(['Each side of a room from 0.3 to 30 m']);
    expect(architectNeeds(flat({ roomLevels: { living: 7 as Level } }))).toEqual(['A room\'s level from 1 to 5']);
  });
  it('Compare: each section and the total at each of the five levels as a package, the sizes kept and the sliders, room levels and own items set aside', () => {
    const runs = levelRuns(flat()) as LevelRuns, l4 = run({ level: 4 });
    expect(runs.totals).toEqual(strip(flat()));
    expect(runs.sections.flooring[3]).toBe(l4.sections.find((s) => s.id === 'flooring')?.amount);
    expect(levelRuns(flat({ sliders: { flooring: 5 }, roomLevels: { 'bath-1': 5 }, items: { 'living:floor:floor-skirting': 'fl-kota' } }))).toEqual(runs);
    expect((levelRuns(flat({ rooms: { living: { l: 6, b: 5 } } })) as LevelRuns).totals[1]).toBe(run({ rooms: { living: { l: 6, b: 5 } } }).total);
  });
  it('What changed: the new total less the old, worked twice, and the items that changed, came or went', () => {
    const base = run(), up = run({ sliders: { bathrooms: 4 } });
    const c = changeOf(flat(), flat({ sliders: { bathrooms: 4 } })) as Change;
    expect(c.by).toBe(Math.round((up.total - base.total) * 100) / 100);
    expect(c.swaps.length).toBeGreaterThan(0);
    expect(c.swaps.every((x) => x.roomName.startsWith('Bathroom'))).toBe(true);
    const on = changeOf(flat(), flat({ sections: { furniture: true } })) as Change;
    expect(on.swaps.find((x) => x.name === 'Sofa')).toEqual({ roomName: 'Living and dining', name: 'Sofa', from: null, to: '3-seater sofa, mid-range' });
    expect(on.by).toBe(203469);
    const sized = changeOf(flat(), flat({ rooms: { living: { l: 16 * FT, b: 20 * FT } } })) as Change;
    expect(sized.swaps).toEqual([]);
    const wrong = (input: ArchitectInput) => { const k = architectCheck(input); if (input.sliders?.bathrooms) k.total += 100; return k; };
    expect('blocked' in (changeOf(flat(), flat({ sliders: { bathrooms: 4 } }), wrong) as Blocked)).toBe(true);
  });
});

describe('R1: a room\'s size by a word, along its reported range; the rooms share the area', () => {
  const FT = 0.3048;
  // A 1BHK of 600 sq ft, as in docs/ROOM-PICKER-PLAN.md: the living room Spacious (the top of 120–180, so 180) and the
  // bedroom Above medium (100 + three quarters of 40, so 130); the kitchen (65) and the bathroom (40) Medium, the middle
  // of 50–80 and 30–50. The rooms share 85% of 600 = 510 sq ft in proportion to 180 : 130 : 65 : 40 (415): living
  // 91,800 / 415 = 221.2048, bedroom 66,300 / 415 = 159.7590, kitchen 33,150 / 415 = 79.8795, bathroom 20,400 / 415 =
  // 49.1566 sq ft; the passage 10% = 60, the balcony its own 40. Shares of the carpet area: 153 / 415 = 36.87%, 110.5 /
  // 415 = 26.63%, 55.25 / 415 = 13.31%, 34 / 415 = 8.19%, the passage 10% and the inside walls 5%: 100% in all.
  const one = (x: Partial<ArchitectInput> = {}): ArchitectInput => flat({ kind: 'interiors', bhk: '1', area: 600, ...x });
  const picked = { living: 'spacious', 'bedroom-1': 'above' } as const;
  it('the plan\'s example, by hand: each room\'s size and its share of the carpet area', () => {
    const e = architect(one({ roomWords: picked })) as ArchitectEstimate;
    expect(e.rooms.map((r) => [r.id, r.word, (r.sqm / SQ).toFixed(4)])).toEqual([
      ['living', 'spacious', '221.2048'], ['bedroom-1', 'above', '159.7590'], ['kitchen', 'medium', '79.8795'], ['bath-1', 'medium', '49.1566'],
      ['passage', null, '60.0000'], ['balcony', null, '40.0000'],
    ]);
    expect(e.shares.map((x) => [x.id, (x.share * 100).toFixed(2)])).toEqual([
      ['living', '36.87'], ['bedroom-1', '26.63'], ['kitchen', '13.31'], ['bath-1', '8.19'], ['passage', '10.00'], ['walls', '5.00'],
    ]);
    expect(e.shares.reduce((t, x) => t + x.share, 0)).toBeCloseTo(1, 12);
    expect(e.assumptions.find((a) => a.what === 'Rooms')?.shown).toBe('Living and dining 221 sq ft, Spacious; Bedroom 160 sq ft, Above medium; Kitchen 80 sq ft; Bathroom 49 sq ft; Passage and foyer 60 sq ft; Balcony 40 sq ft');
    expect(e.assumptions.find((a) => a.what === 'Rooms')?.why).toMatch(/Compact at the bottom, Medium in the middle \(the plan's own\), Above medium three quarters of the way up, Spacious at the top/);
  });
  it('the knock-on in What changed, worked twice: Spacious takes 375 to 405, so the others are 375 / 405 of their size, 7.41% smaller; Above medium on the bedroom then takes 405 to 415, 2.41% smaller', () => {
    const spacious = changeOf(one(), one({ roomWords: { living: 'spacious' } })) as Change;
    expect(spacious.others).toBeCloseTo(-2 / 27, 12);
    const then = changeOf(one({ roomWords: { living: 'spacious' } }), one({ roomWords: picked })) as Change;
    expect(then.others).toBeCloseTo(-2 / 83, 12);
    expect((changeOf(one({ roomWords: picked }), one()) as Change).others).toBeCloseTo(415 / 375 - 1, 12);
    // No knock-on where no other room moved: a slider, a size typed (E3), or a new carpet area, which moves every room.
    expect((changeOf(one(), one({ sliders: { flooring: 4 } })) as Change).others).toBeUndefined();
    expect((changeOf(one(), one({ rooms: { living: { l: 16 * FT, b: 14 * FT } } })) as Change).others).toBeUndefined();
    expect((changeOf(one(), one({ area: 700 })) as Change).others).toBeUndefined();
  });
  it('a size typed keeps E3\'s rule: it moves no other room, words or not; a word on another room moves only the rooms planned, by 600 / 620 in a 2BHK', () => {
    const word = run({ roomWords: { living: 'spacious' } }), typed = run({ roomWords: { living: 'spacious' }, rooms: { living: { l: 16 * FT, b: 20 * FT } } });
    expect(typed.rooms.filter((r) => r.id !== 'living').map((r) => r.sqm)).toEqual(word.rooms.filter((r) => r.id !== 'living').map((r) => r.sqm));
    // The kitchen typed, then the living room Spacious (220 of 180–220): 200 + 145 + 120 + 70 + 32.5 + 32.5 = 600 becomes
    // 620, so each planned room is 600 / 620 of its size (3.23% smaller) and the living room 850 × 220 / 620 = 301.6129 sq ft.
    const kitchen = { kitchen: { l: 10 * FT, b: 8 * FT } };
    const c = changeOf(flat({ rooms: kitchen }), flat({ rooms: kitchen, roomWords: { living: 'spacious' } })) as Change;
    expect(c.others).toBeCloseTo(600 / 620 - 1, 12);
    const after = run({ rooms: kitchen, roomWords: { living: 'spacious' } });
    expect([(after.rooms[0].sqm / SQ).toFixed(4), (after.rooms.find((r) => r.id === 'kitchen')!.sqm / SQ).toFixed(4)]).toEqual(['301.6129', '80.0000']);
  });
  it('a room squeezed below the Code\'s minimum is flagged, never changed: a 1BHK of 450 sq ft with the bedroom Compact and the rest Spacious gives the bedroom 382.5 × 100 / 410 = 93.29 sq ft, 8.67 sq m, under 9.5', () => {
    const e = architect(one({ area: 450, roomWords: { living: 'spacious', 'bedroom-1': 'compact', kitchen: 'spacious', 'bath-1': 'spacious' } })) as ArchitectEstimate;
    expect((e.rooms[1].sqm / SQ).toFixed(2)).toBe('93.29');
    expect(e.below).toEqual({ 'bedroom-1': 9.5 });
    expect(e.flags.map((f) => f.text)).toContain('Bedroom works out at 8.67 sq m with the sizes picked, below the Code\'s 9.5 sq m: make it larger, or another room smaller.');
    expect((architect(one({ area: 450 })) as ArchitectEstimate).below).toEqual({});
  });
  it('each kind of room\'s range is in the rules with its source, Medium its middle; a word must be one of the four', () => {
    for (const bhk of ['1RK', '1', '2', '3', '4', '5'] as Bhk[]) {
      const p = planRooms(bhk, 100);
      expect(p.filter((r) => r.word !== null).every((r) => r.word === 'medium'), bhk).toBe(true);
    }
    expect(architectNeeds(flat({ roomWords: { living: 'huge' as 'spacious' } }))).toEqual(['A room\'s size: Compact, Medium, Above medium or Spacious']);
    // A word for a room the flat does not have, or for the passage, changes nothing.
    expect(run({ roomWords: { 'bedroom-3': 'spacious', passage: 'compact' } }).total).toBe(run().total);
  });
  it('the shares are worked twice: a second computation that disagrees on one shows nothing; the words stay in Compare\'s package', () => {
    const wrong = (input: ArchitectInput) => { const c = architectCheck(input); c.shares.set('kitchen', (c.shares.get('kitchen') ?? 0) + 1e-6); return c; };
    expect((architect(flat(), wrong) as Blocked).blocked).toMatch(/share of Kitchen/);
    const words = { roomWords: { living: 'spacious', kitchen: 'compact' } } as const;
    expect((levelRuns(flat(words)) as LevelRuns).totals[1]).toBe(run(words).total);
  });
  it('words set at random never block, and the planned rooms with the passage and the walls fill the carpet area', () => {
    let seed = 11;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const words = ['compact', 'medium', 'above', 'spacious'] as const, areas: Record<Bhk, number> = { '1RK': 350, '1': 520, '2': 850, '3': 1150, '4': 1600, '5': 2200 };
    for (let n = 0; n < 24; n++) {
      const bhk = (['1RK', '1', '2', '3', '4', '5'] as Bhk[])[n % 6], ids = planRooms(bhk, 100).filter((r) => r.word !== null).map((r) => r.id);
      const roomWords = Object.fromEntries(ids.filter(() => rnd() > 0.4).map((id) => [id, words[Math.floor(rnd() * 4)]]));
      const e = architect(flat({ bhk, area: areas[bhk], roomWords, kind: n % 3 ? 'renovate' : 'interiors', level: (1 + (n % 5)) as Level }));
      expect('total' in e, JSON.stringify(e).slice(0, 200)).toBe(true);
      expect((e as ArchitectEstimate).shares.reduce((t, x) => t + x.share, 0)).toBeCloseTo(1, 12);
    }
  });
});

describe('R2: rooms by buttons; bathrooms added, taken out or attached to a bedroom, and the balcony taken out', () => {
  // The owner's example ("one living room, one master bedroom with attached bathroom, one kitchen"): a 1BHK of 600 sq ft
  // renovated at Standard in Pune, the living room Spacious and the bedroom Above medium as in R1, the bathroom attached to
  // the bedroom and the balcony taken out. The balcony is outside the area the rooms share, so the rooms keep R1's sizes:
  // living 221.2048, bedroom 159.7590, kitchen 79.8795, bathroom 49.1566 and the passage 60 sq ft. The bedroom, 14.84210 sq m
  // at 1.2 to 1, is 4.22025 × 3.51688 m, 15.47425 m round; its skirting runs round it less its own 0.9 m door and now the
  // bathroom's 0.75 m door: (15.47425 − 1.65) × 0.1 = 1.38243 sq m, with the floor 16.22453 sq m = 174.64 sq ft (175.45 with
  // the bathroom common). The passage, 60 sq ft at 3 to 1, 10.90486 m round, no longer loses the bathroom's door from its
  // skirting: 69.69 sq ft against 68.89.
  const home = (x: Partial<ArchitectInput> = {}) => flat({ bhk: '1', area: 600, roomWords: { living: 'spacious', 'bedroom-1': 'above' }, ...x });
  it('the owner\'s example by hand: the rooms keep R1\'s sizes, the bathroom opens into the bedroom, and the skirting follows its door', () => {
    const e = architect(home({ baths: ['bedroom-1'], balcony: false })) as ArchitectEstimate, common = architect(home({ balcony: false })) as ArchitectEstimate;
    expect(e.rooms.map((r) => [r.id, r.name, r.of, (r.sqm / SQ).toFixed(4)])).toEqual([
      ['living', 'Living and dining', null, '221.2048'], ['bedroom-1', 'Bedroom', null, '159.7590'], ['kitchen', 'Kitchen', null, '79.8795'],
      ['bath-1', 'Bathroom (attached)', 'bedroom-1', '49.1566'], ['passage', 'Passage and foyer', null, '60.0000'],
    ]);
    expect(e.openings.find((o) => o.id === 'bath-1:bath')?.other).toBe('bedroom-1');
    expect(e.openings.some((o) => o.type === 'balcony') || e.lines.some((l) => l.room === 'balcony')).toBe(false);
    const sk = (x: ArchitectEstimate, room: string) => line(x, `${room}:floor:floor-skirting`)?.qty;
    expect([sk(e, 'bedroom-1'), sk(common, 'bedroom-1'), sk(e, 'passage'), sk(common, 'passage')]).toEqual([174.64, 175.45, 69.69, 68.89]);
    expect(e.assumptions.find((a) => a.what === 'Rooms')?.shown).toBe('Living and dining 221 sq ft, Spacious; Bedroom 160 sq ft, Above medium; Kitchen 80 sq ft; Bathroom (attached) 49 sq ft; Passage and foyer 60 sq ft; no balcony, taken out');
    expect([e.assumptions.find((a) => a.what === 'Bathrooms')?.shown, common.assumptions.find((a) => a.what === 'Bathrooms')?.shown]).toEqual(['1, as you chose', '1']);
  });
  it('a bathroom added takes its share from the others: a 1BHK of 600 sq ft at Medium, 150 + 120 + 65 + 40 + 40 = 415, each bathroom 510 × 40 / 415 = 49.1566 sq ft and the others 375 / 415 of their size; one taken out of a 2BHK leaves 567.5, the others 600 / 567.5', () => {
    const plain = flat({ bhk: '1', area: 600 });
    const e = architect({ ...plain, baths: [null, null] }) as ArchitectEstimate;
    expect(e.rooms.filter((r) => r.kind === 'bath').map((r) => [r.id, r.name, (r.sqm / SQ).toFixed(4)])).toEqual([['bath-1', 'Bathroom 1', '49.1566'], ['bath-2', 'Bathroom 2', '49.1566']]);
    expect((changeOf(plain, { ...plain, baths: [null, null] }) as Change).others).toBeCloseTo(375 / 415 - 1, 12);
    expect((changeOf(flat(), flat({ baths: ['bedroom-1'] })) as Change).others).toBeCloseTo(600 / 567.5 - 1, 12);
    expect(run({ baths: ['bedroom-1'] }).rooms.find((r) => r.kind === 'bath')?.name).toBe('Bathroom (attached)');
  });
  it('the programme\'s own bathrooms given as the user\'s change nothing; a bathroom attached to another bedroom is named for it and opens into it', () => {
    const own = run({ baths: ['bedroom-1', null] }), plan = run();
    expect([own.total, own.rooms.map((r) => r.name)]).toEqual([plan.total, plan.rooms.map((r) => r.name)]);
    const e = run({ baths: [null, 'bedroom-2', 'bedroom-1'] });
    expect(e.rooms.filter((r) => r.kind === 'bath').map((r) => r.name)).toEqual(['Bathroom 1', 'Bathroom 2 (attached to Bedroom 2)', 'Bathroom 3 (attached)']);
    expect(e.openings.filter((o) => o.type === 'bath').map((o) => o.other)).toEqual(['passage', 'bedroom-2', 'bedroom-1']);
  });
  it('the balcony taken out: its lines and the living room\'s door to it go, and the rooms keep their sizes, the balcony being outside the area they share', () => {
    const out = run({ balcony: false }), plan = run(), kept = plan.rooms.filter((r) => r.id !== 'balcony');
    expect([out.rooms.map((r) => r.id), out.rooms.map((r) => r.sqm)]).toEqual([kept.map((r) => r.id), kept.map((r) => r.sqm)]);
    expect([out.lines.some((l) => l.room === 'balcony'), out.openings.some((o) => o.type === 'balcony'), out.total < plan.total]).toEqual([false, false, true]);
    expect((changeOf(flat(), flat({ balcony: false })) as Change).others).toBeUndefined();
  });
  it('the bathrooms must be ones the home can take', () => {
    const need = 'Bathrooms from 1 to 8, each common or attached to one of the home\'s bedrooms, one to a bedroom';
    for (const baths of [[], ['bedroom-3'], ['bedroom-1', 'bedroom-1'], Array(9).fill(null), ['bedroom-01']] as (string | null)[][])
      expect(architectNeeds(flat({ baths })), JSON.stringify(baths)).toEqual([need]);
    expect(architectNeeds(flat({ baths: ['bedroom-2', 'bedroom-1', null, null, null, null, null, null] }))).toEqual([]);
  });
  it('bathrooms, balconies and words set at random never block, and the rooms still fill the carpet area', () => {
    let seed = 13;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const areas: Record<Bhk, number> = { '1RK': 350, '1': 520, '2': 850, '3': 1150, '4': 1600, '5': 2200 };
    for (let n = 0; n < 24; n++) {
      const bhk = (['1RK', '1', '2', '3', '4', '5'] as Bhk[])[n % 6], beds = planRooms(bhk, 100).filter((r) => r.kind === 'bedroom').map((r) => r.id);
      const free = [...beds], baths = Array.from({ length: 1 + Math.floor(rnd() * 5) }, () => (free.length && rnd() > 0.5 ? (free.splice(Math.floor(rnd() * free.length), 1)[0] as string) : null));
      const e = architect(flat({ bhk, area: areas[bhk], baths, balcony: rnd() > 0.5, roomWords: { kitchen: 'spacious', 'bath-1': 'compact' }, kind: n % 3 ? 'renovate' : 'interiors' }));
      expect('total' in e, `${bhk} ${JSON.stringify(baths)}: ${JSON.stringify(e).slice(0, 160)}`).toBe(true);
      expect((e as ArchitectEstimate).shares.reduce((t, x) => t + x.share, 0)).toBeCloseTo(1, 12);
    }
  });
});

describe('V1: the flags that can change the decision, largest first', () => {
  const FT = 0.3048;
  const build = (x: Partial<ArchitectInput>) => architect({ kind: 'build', floors: 2, city: 'pune', area: 2000, bhk: '3', level: 1, ...x }) as ArchitectEstimate;
  const decides = (e: ArchitectEstimate) => e.flags.filter((f) => f.decides).map((f) => f.text);
  it('each flag is about some rupees of the estimate, and they come largest first', () => {
    for (const e of [run(), build({}), build({ level: 4 }), run({ kind: 'interiors' })]) {
      expect(e.flags.length).toBeGreaterThan(0);
      for (let i = 1; i < e.flags.length; i++) expect(e.flags[i - 1].n).toBeGreaterThanOrEqual(e.flags[i].n);
    }
  });
  it('a 2BHK flat of 1,000 sq ft as interiors: its area against the usual decides, the whole estimate; the furniture and soft furnishings are notes, each its section', () => {
    const e = run({ kind: 'interiors', level: 2 }), sec = (id: string) => e.sections.find((x) => x.id === id)?.amount;
    expect(e.flags.map((f) => [f.text.slice(0, 30), f.decides, f.n])).toEqual([
      ['A 2 BHK is usually 650–850 sq ', true, e.total], ['The furniture is a sofa and a ', false, sec('furniture')], ['The soft furnishings are curta', false, sec('furnishings')],
    ]);
  });
  it('the rates as reported are no longer a flag: the page says so by the total', () => {
    expect(run().flags.some((f) => f.text.startsWith('Rates are as reported'))).toBe(false);
  });
  it('a new house\'s standing notes never decide: the structure, the rooms, the compound, the rainwater pit, what is not in yet, its bedrooms\' usual area and the paint', () => {
    const e = build({});
    expect(decides(e)).toEqual([]);
    for (const start of ['The structure\'s materials', 'The rooms are planned as one home', 'The compound wall', 'Rainwater harvesting', 'Not in this estimate yet', 'A 3 BHK is usually', 'The walls and ceilings to paint'])
      expect(e.flags.find((f) => f.text.startsWith(start))?.decides, start).toBe(false);
  });
  it('the city\'s range decides outside it at Basic or Standard and below it at any level; above it at Premium and up it is a note', () => {
    // A G+0 of 900 sq ft, 2 BHK, comes to Rs. 3,180 a sq ft at Standard, above Pune's Rs. 1,800–2,900; a G+2 of 4,000 sq ft
    // at Basic to Rs. 1,751, below it.
    const small = build({ floors: 1, area: 900, bhk: '2', level: 2 }), big = build({ floors: 3, area: 4000, bhk: '4', level: 1 }), prem = build({ floors: 1, area: 900, bhk: '2', level: 3 });
    expect(decides(small)).toEqual([`This estimate comes to Rs. ${inr(Math.round(small.perSqft))} a sq ft of built-up area; houses in Pune built to a standard finish are reported at Rs. 1,800–2,900 a sq ft (as reported).`]);
    expect(small.perSqft > 2900 && big.perSqft < 1800 && prem.perSqft > 2900).toBe(true);
    expect(decides(big)).toEqual([`This estimate comes to Rs. ${inr(Math.round(big.perSqft))} a sq ft of built-up area; houses in Pune built to a standard finish are reported at Rs. 1,800–2,900 a sq ft (as reported).`]);
    expect(decides(prem)).toEqual([]);
    expect(prem.flags.find((f) => f.text.startsWith('At Premium this estimate comes to'))?.decides).toBe(false);
  });
  it('what your own figures raise decides: a plot smaller than the house, risers above the Code, sizes that do not add up, a place with no city figure, an item with no rate', () => {
    expect(build({ plot: { l: 10, b: 8 } }).flags.find((f) => f.text.startsWith('Your plot'))?.decides).toBe(true);
    expect(build({ heightM: 3.5 }).flags.find((f) => f.text.startsWith('The stairs\' risers'))?.decides).toBe(true);
    expect(run({ rooms: { living: { l: 16 * FT, b: 20 * FT } } }).flags.find((f) => f.text.startsWith('With your sizes'))?.decides).toBe(true);
    expect(run({ city: 'other' }).flags.find((f) => f.text.startsWith('No city figure'))?.decides).toBe(true);
    const granite = run({ items: { 'living:floor:floor-skirting': 'fl-granite' } }).flags.find((f) => f.text.includes('has no rate yet'));
    expect([granite?.decides, granite?.n]).toEqual([true, 0]);
  });
});
