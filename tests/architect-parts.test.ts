/**
 * One part of a renovation on its own (D-UX-276): just the kitchen, just the bathrooms, just painting. Each part is
 * checked against a second run of the engine on the whole home, line by line, and its whole-home lines by hand.
 */
import { describe, it, expect } from 'vitest';
import { architect, type ArchitectEstimate, type ArchitectInput } from '../engine/architect';
import { EMPTY_PLAN, planNeeds, planPreview, withKind, withPart, type PlanState } from '../site/src/estimate/plan-model';

const BASE: ArchitectInput = { kind: 'renovate', property: 'flat', city: 'pune', area: 850, areaUnit: 'sqft', bhk: '2', level: 2 };
const run = (x: Partial<ArchitectInput> = {}) => {
  const e = architect({ ...BASE, ...x });
  if (!('total' in e)) throw new Error(JSON.stringify(e));
  return e as ArchitectEstimate;
};
const sum = (ls: { amount: number }[]) => Math.round(ls.reduce((t, l) => t + l.amount, 0) * 100) / 100;
const whole = run(), kitchen = run({ part: 'kitchen' }), baths = run({ part: 'bathrooms' }), paint = run({ part: 'paint' });
const own = (e: ArchitectEstimate, family: string) => e.lines.find((l) => l.room === null && l.family === family);
const roomsOf = (e: ArchitectEstimate, kind: string) => e.rooms.filter((r) => r.kind === kind).map((r) => r.id as string | null);

describe('one part on its own (D-UX-276), on a 2BHK of 850 sq ft in Pune at Standard', () => {
  it('the kitchen alone prices its room line for line as the whole renovation does, in the sections it has on', () => {
    const on = kitchen.sections.filter((s) => s.on).map((s) => s.id), ids = roomsOf(whole, 'kitchen');
    expect(on).toEqual(['civil', 'flooring', 'walls', 'kitchen', 'electrical', 'plumbing']);
    expect(kitchen.lines.filter((l) => l.room !== null).every((l) => ids.includes(l.room))).toBe(true);
    expect(sum(kitchen.lines.filter((l) => l.room !== null))).toBe(sum(whole.lines.filter((l) => ids.includes(l.room) && on.includes(l.section))));
    expect(sum(kitchen.lines.filter((l) => l.room !== null))).toBe(302164.59);
  });
  it('the kitchen\'s whole-flat lines by hand: its floor of 7.83 sq m is 84.29 sq ft; covered 84.29 × 2.20 = 185.44, cleaned 84.29 × 10.53 = 887.57, one lot of debris 7,323.42, and a tenth of its 32.66 sq m of walls made good, 35.16 sq ft × 27.46 = 965.49', () => {
    expect(own(kitchen, 'protection')).toMatchObject({ qty: 84.29, amount: 185.44 });
    expect(own(kitchen, 'cleaning')).toMatchObject({ qty: 84.29, amount: 887.57 });
    expect(own(kitchen, 'debris')).toMatchObject({ qty: 1, amount: 7323.42 });
    expect(own(kitchen, 'making-good')).toMatchObject({ qty: 35.16, amount: 965.49 });
    expect(kitchen.lines.filter((l) => l.room === null).length).toBe(4);
    // 3,02,164.59 + 185.44 + 887.57 + 7,323.42 + 965.49
    expect(kitchen.total).toBe(311526.51);
  });
  it('the kitchen\'s cost a sq ft is of its own floor', () => {
    const sqft = whole.rooms.filter((r) => r.kind === 'kitchen').reduce((t, r) => t + r.sqm, 0) * 10.7639104;
    expect(kitchen.per).toBe('kitchen');
    expect(kitchen.perSqft).toBeCloseTo(kitchen.total / sqft, 2);
  });
  it('the doors and the appliances are shown off, and switched on are priced', () => {
    expect(kitchen.sections.filter((s) => !s.on).map((s) => s.id)).toEqual(['doors', 'appliances']);
    expect(run({ part: 'kitchen', sections: { doors: true, appliances: true } }).total).toBeGreaterThan(kitchen.total);
  });
  it('the bathrooms alone price both bathrooms line for line as the whole renovation does; by hand, cleaned 78.27 × 10.53 = 824.18, two lots of debris 2 × 7,323.42 = 14,646.84, made good 48.94 × 27.46 = 1,343.89, no floor covered', () => {
    const on = baths.sections.filter((s) => s.on).map((s) => s.id), ids = roomsOf(whole, 'bath');
    expect(on).toEqual(['civil', 'waterproofing', 'walls', 'bathrooms', 'electrical', 'plumbing']);
    expect(sum(baths.lines.filter((l) => l.room !== null))).toBe(sum(whole.lines.filter((l) => ids.includes(l.room) && on.includes(l.section))));
    expect(own(baths, 'cleaning')).toMatchObject({ qty: 78.27, amount: 824.18 });
    expect(own(baths, 'debris')).toMatchObject({ qty: 2, amount: 14646.84 });
    expect(own(baths, 'making-good')).toMatchObject({ qty: 48.94, amount: 1343.89 });
    expect(own(baths, 'protection')).toBeUndefined();
    // 3,09,397.26 + 824.18 + 14,646.84 + 1,343.89
    expect(baths.total).toBe(326212.17);
    expect(baths.per).toBe('bathrooms');
  });
  it('painting alone shows two sections and prices the walls as a renovation that keeps the bathrooms does (their tiles left at 7 ft); covered 729.23 × 2.20 = 1,604.31 and cleaned 850 × 10.53 = 8,950.50', () => {
    expect(paint.sections.map((s) => s.id)).toEqual(['civil', 'walls']);
    const keep = run({ sections: { bathrooms: false } });
    expect(paint.sections[1].amount).toBe(keep.sections.find((s) => s.id === 'walls')!.amount);
    expect(own(paint, 'protection')).toMatchObject({ qty: 729.23, amount: 1604.31 });
    expect(own(paint, 'cleaning')).toMatchObject({ qty: 850, amount: 8950.5 });
    expect(paint.lines.filter((l) => l.room === null).length).toBe(2);
    // 69,259.41 + 1,604.31 + 8,950.50
    expect(paint.total).toBe(79814.22);
    expect(paint.per).toBe('carpet');
  });
  it('a part is a renovation\'s only: with interiors it is asked again', () => {
    expect(architect({ ...BASE, kind: 'interiors', part: 'kitchen' })).toEqual({ needs: ['One part with repair or renovate: kitchen, bathrooms or painting'] });
  });
  it('a part is not held to a whole home\'s paint against its carpet area', () => {
    for (const e of [kitchen, baths, paint]) expect(e.flags.filter((f) => f.text.startsWith('The walls and ceilings to paint')), e.part!).toEqual([]);
  });
  it('a part\'s assumption names it', () => {
    expect(kitchen.assumptions.find((a) => a.what === 'Sections')!.why).toMatch(/^Just the kitchen: /);
    expect(whole.assumptions.find((a) => a.what === 'Sections')!.why).not.toMatch(/^Just/);
  });
});

describe('the page with a part (D-UX-276)', () => {
  const S: PlanState = { ...EMPTY_PLAN, kind: 'renovate', home: 'flat', city: 'pune', area: '850', bhk: '2', level: 2 };
  const view = (s: PlanState) => planPreview(s).view!;
  it('a part is a renovation of that part, named in the summary, the title and the cost a sq ft', () => {
    const v = view(withPart(S, 'kitchen'));
    expect(v.summary.replace(/ /g, ' ')).toBe('Just the kitchen · Flat · Pune · 850 sq ft · 2 BHK · Standard');
    expect(v.title).toBe('Estimate of cost of kitchen renovation');
    expect(v.perName).toBe('The kitchen’s floor');
    expect(v.areaName).toBe('Carpet area');
    expect(v.n.total).toBe(311526.51);
  });
  it('the rooms are the part\'s own, and only its own kind can be added', () => {
    const k = view(withPart(S, 'kitchen')), b = view(withPart(S, 'bathrooms')), p = view(withPart(S, 'paint'));
    expect(k.rooms.map((r) => r.name)).toEqual(['Kitchen']);
    expect(k.add).toEqual({ bedroom: false, bath: false, balcony: false, extras: [] });
    expect(b.rooms.length).toBe(2);
    expect(b.add).toMatchObject({ bedroom: false, bath: true, balcony: false, extras: [] });
    expect(p.rooms.length).toBe(view(S).rooms.length);
    expect(p.title).toBe('Estimate of cost of painting');
  });
  it('a whole kind leaves the part; a part sets the kind', () => {
    const k = withPart({ ...S, kind: 'interiors' }, 'paint');
    expect(k).toMatchObject({ kind: 'renovate', part: 'paint' });
    expect(withKind(k, 'interiors').part).toBeUndefined();
    expect(view(withKind(k, 'renovate')).summary.replace(/ /g, ' ')).toBe('Repair or renovate · Flat · Pune · 850 sq ft · 2 BHK · Standard');
  });
  it('a part asks nothing more', () => {
    expect(planNeeds(withPart({ ...EMPTY_PLAN }, 'bathrooms'))).toEqual(['Flat or house', 'Which city', 'The carpet area', 'How many bedrooms', 'Which level']);
  });
});
