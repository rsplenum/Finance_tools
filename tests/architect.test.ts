/**
 * The architect (engine/architect.ts) on fictional flats. The rooms, openings and measurements of a 2BHK of 1,000 sq ft
 * are worked by hand below; every estimate is also worked a second way (architect-check.ts) and shows nothing when the
 * two disagree. Rates come from the library (tests/library.test.ts); no figure here comes from the owner's office or
 * employer (D-BIZ-02). The owner's own fictional flat, worked at home, is still to come (HANDOFF).
 */
import { describe, it, expect } from 'vitest';
import { architect, architectNeeds, choicesFor, cityFactor, overPackage, planOpenings, planRooms, strip, type ArchitectEstimate, type ArchitectInput, type Bhk, type Level } from '../engine/architect';
import { architectCheck, checkRate } from '../engine/architect-check';
import { price } from '../engine/library';
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
    expect(house({ floors: 1, area: 1000 }).house?.stair).toBe(0);
  });
  it('the structure, against Brick&Bolt\'s worked 1,000 sq ft house (350–450 bags of cement, 3–4 t of steel, 1,200–1,600 cft of sand, 1,500–2,000 cft of aggregate, 8,000–10,000 bricks): the middle of each, 1,400 cft = 39.64 cu m and 1,750 cft = 49.55 cu m', () => {
    const g = house({ floors: 1, area: 1000 });
    expect(['cement:struct:cement', 'steel:struct:steel', 'sand:struct:sand', 'coarse-aggregate:struct:aggregate', 'brick:struct:bricks'].map((k) => line(g, `flat:${k}`)?.qty)).toEqual([400, 3500, 39.64, 49.55, 9000]);
  });
  it('the rates: cement Rs. 387.50 + 3.5% wastage = 401.06 a bag; steel 57 + 4% = 59.28 a kg; a brick 9 + 6.5% = 9.585, half up 9.59; RCC labour 180 × Pune\'s 0.969072 = 174.43 a sq ft', () => {
    expect(line(e, 'flat:cement:struct:cement')).toMatchObject({ qty: 800, rate: 401.06, amount: 320848 });
    expect(line(e, 'flat:steel:struct:steel')).toMatchObject({ qty: 7000, rate: 59.28, amount: 414960 });
    expect(line(e, 'flat:brick:struct:bricks')).toMatchObject({ qty: 18000, rate: 9.59, amount: 172620 });
    expect(line(e, 'flat:labour-rcc:built-up')).toMatchObject({ qty: 2000, rate: 174.43, amount: 348860 });
    expect(checkRate('mu-brick', 'pune')).toBe(9.59);
  });
  it('the terrace: inside the parapet 10.3163 × 8.1610 = 84.19 sq m, and 36.9547 m × 0.3 m up it = 11.09 sq m: 95.28 sq m = 1,025.57 sq ft, an APP membrane at every level', () => {
    expect(line(e, 'flat:roof-waterproofing:terrace')).toMatchObject({ qty: 1025.57, entry: 'wp-app', level: null });
    expect(line(house({ level: 5 }), 'flat:roof-waterproofing:terrace')?.entry).toBe('wp-app');
  });
  it('the outside walls: 38.7947 m × (2 × 3.05 + 1.0 m of parapet) = 275.44 sq m, and the parapet\'s inside 36.9547 × 1.0 = 36.95 sq m: 312.40 sq m = 3,362.61 sq ft of economy emulsion at Basic', () => {
    expect(line(e, 'flat:exterior-paint:exterior-walls')).toMatchObject({ qty: 3362.61, entry: 'ex-ace' });
  });
  it('the stair railing: one stair of two flights of √(2.2² + 1.525²) = 2.6769 m and 0.3 m at the landing, 5.6538 m = 18.55 rft; none in a house of one floor', () => {
    expect(line(e, 'flat:railing:stair-railing')).toMatchObject({ qty: 18.55, entry: 'rl-ms' });
    expect(line(house({ floors: 1, area: 1000 }), 'flat:railing:stair-railing')).toBeUndefined();
  });
  it('the sections: the structure, waterproofing, the terrace and outside, and every finish and service inside; no civil repairs; new wiring and a board', () => {
    expect(e.sections.map((x) => x.id)).toEqual(['structure', 'waterproofing', 'exterior', 'flooring', 'walls', 'ceiling', 'bathrooms', 'kitchen', 'wardrobes', 'doors', 'electrical', 'plumbing', 'appliances', 'smart']);
    expect(e.sections.filter((x) => x.on).length).toBe(11);
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
    for (const start of ['The structure\'s materials and labour are rules of thumb', 'The rooms are planned as one home of 1570 sq ft', 'Not in this estimate yet: the compound wall', `This estimate comes to Rs. ${Math.round(e.perSqft).toLocaleString('en-IN')} a sq ft of built-up area; houses in Pune are reported at Rs. 1,800–2,900`])
      expect(e.flags.some((f) => f.startsWith(start)), start).toBe(true);
    expect(e.flags.some((f) => f.startsWith('A house: its rooms inside'))).toBe(false);
  });
  it('the second computation draws the house its own way and agrees line by line', () => {
    const c = architectCheck({ kind: 'build', floors: 2, city: 'pune', area: 2000, bhk: '3', level: 1 });
    for (const l of e.lines) expect(c.lines.get(l.key)?.qty, l.key).toBeCloseTo(l.qty, 2);
  });
  it('a built-up area too small for its floors is asked for again', () => {
    expect(architect({ kind: 'build', floors: 4, city: 'pune', area: 600, bhk: '2', level: 1 })).toEqual({ needs: ['A larger built-up area: the outer walls and stairs of 4 floors take more than half of it'] });
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
    expect(h.flags.some((x) => x.startsWith('A house: its rooms inside are worked out as a flat\'s'))).toBe(true);
    expect(f.flags.some((x) => x.startsWith('A house'))).toBe(false);
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
    expect(on(i)).toEqual(['civil', 'walls', 'ceiling', 'kitchen', 'wardrobes', 'electrical', 'appliances', 'smart']);
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
    expect(e.flags.some((f) => f.includes('Granite flooring has no rate yet'))).toBe(true);
  });
  it('flags a room below the Code\'s minimum, and a place with no city figure', () => {
    const tiny = run({ area: 450, bhk: '3' });
    expect(tiny.flags.some((f) => f.includes('below the Code'))).toBe(true);
    const other = run({ city: 'other' });
    expect(other.cityFactor).toBe(1);
    expect(other.flags).toContain('No city figure for your city: the rates are used as they are.');
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
    const sections = ['flooring', 'walls', 'ceiling', 'bathrooms', 'kitchen', 'wardrobes', 'doors', 'electrical', 'appliances', 'smart'];
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
