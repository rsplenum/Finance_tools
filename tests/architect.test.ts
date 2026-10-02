/**
 * The architect (engine/architect.ts) on fictional flats. The rooms, openings and measurements of a 2BHK of 1,000 sq ft
 * are worked by hand below; every estimate is also worked a second way (architect-check.ts) and shows nothing when the
 * two disagree. Rates come from the library (tests/library.test.ts); no figure here comes from the owner's office or
 * employer (D-BIZ-02). The owner's own fictional flat, worked at home, is still to come (HANDOFF).
 */
import { describe, it, expect } from 'vitest';
import { architect, architectNeeds, cityFactor, planOpenings, planRooms, strip, type ArchitectEstimate, type ArchitectInput, type Bhk, type Level } from '../engine/architect';
import { architectCheck } from '../engine/architect-check';
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

describe('the estimate', () => {
  it('asks for what it needs, in order', () => {
    expect(architectNeeds({})).toEqual(['What the work is: repair or renovate, or interiors', 'Which city', 'The carpet area', 'How many bedrooms', 'Which level']);
    expect((architect({ ...flat(), property: 'house' }) as Needs).needs).toEqual(['A house comes later (E5): for now the estimate is for a flat']);
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
  it('the five-level strip rises from Basic to Ultra luxury', () => {
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
