/**
 * The estimate engine (engine/estimate.ts) on fictional cases worked by hand below: a house of 1,200 sq ft (case E) and
 * a flat's renovation. The rates are illustrative, from no source (D-BIZ-02).
 */
import { describe, it, expect } from 'vitest';
import { estimate, estimateNeeds, type Estimate, type Item } from '../engine/estimate';
import type { Blocked, Needs } from '../engine/dscr';

const item = (head: string, description: string, quantity: number, unit: string, rate: number): Item => ({ head, description, quantity, unit, rate });
// Fictional case E: a house of 1,200 sq ft, rates including GST.
export const CASE_E: Item[] = [
  item('earthwork', 'Excavation for foundations', 45, 'cum', 350),               //    15,750
  item('pcc', 'PCC 1:4:8 under footings', 6, 'cum', 6200),                        //    37,200
  item('rcc', 'RCC M20 in footings, columns, beams and slabs', 28, 'cum', 9500),  //  2,66,000
  item('steel', 'Steel bars Fe 500', 3200, 'kg', 78),                             //  2,49,600
  item('masonry', 'Brickwork in cement mortar 1:6', 60, 'cum', 7800),             //  4,68,000
  item('plaster', 'Cement plaster 12 mm', 520, 'sqm', 380),                       //  1,97,600
  item('flooring', 'Vitrified tiles', 1100, 'sqft', 110),                         //  1,21,000
  item('joinery', 'Doors and windows, complete', 1, 'LS', 185000),                //  1,85,000
  item('painting', 'Interior and exterior painting', 1600, 'sqm', 140),           //  2,24,000
  item('plumbing', 'Water supply, drainage and fittings', 1, 'LS', 140000),       //  1,40,000
  item('electrical', 'Wiring, switches and fittings', 1, 'LS', 120000),           //  1,20,000
];
const E = (x: Partial<Parameters<typeof estimate>[0]> = {}) => estimate({ kind: 'construction', items: CASE_E, area: 1200, gstPct: 'included', contingencyPct: 3, ...x });

describe('fictional case E: a house of 1,200 sq ft', () => {
  // By hand: 15,750 + 37,200 + 2,66,000 + 2,49,600 + 4,68,000 + 1,97,600 + 1,21,000 + 1,85,000 + 2,24,000 + 1,40,000 +
  // 1,20,000 = 20,24,150. Contingency 3% = 60,724.50; total 20,84,874.50; per sq ft 20,84,874.50 ÷ 1,200 = 1,737.40.
  it('the items, the heads, the works and the total', () => {
    const e = E() as Estimate;
    expect(e.items.map((x) => [x.no, x.amount])).toEqual([
      ['1.1', 15750], ['2.1', 37200], ['3.1', 266000], ['4.1', 249600], ['5.1', 468000], ['6.1', 197600], ['7.1', 121000], ['8.1', 185000],
      ['9.1', 224000], ['10.1', 140000], ['11.1', 120000],
    ]);
    expect(e.heads.map((h) => h.label)).toEqual(['Earthwork', 'Plain concrete', 'Reinforced concrete', 'Reinforcement steel', 'Masonry', 'Plastering',
      'Flooring and tiling', 'Doors and windows', 'Painting', 'Plumbing and sanitary', 'Electrical']);
    expect([e.works, e.gst, e.contingency, e.total]).toEqual([2024150, 0, 60724.5, 2084874.5]);
    expect(e.perSqft?.toFixed(2)).toBe('1737.40');
  });
  it('GST added at 18% when the rates leave it out: 3,64,347; contingency 3% of 23,88,497 = 71,654.91; total 24,60,151.91', () => {
    const e = E({ gstPct: 18 }) as Estimate;
    expect([e.gst, e.contingency].map((x) => x.toFixed(2))).toEqual(['364347.00', '71654.91']);
    expect(e.total.toFixed(2)).toBe('2460151.91');
  });
  it('two items under one head are numbered 1.1 and 1.2 and added up there', () => {
    const e = E({ items: [...CASE_E, item('earthwork', 'Filling in plinth', 30, 'cum', 250)] }) as Estimate;
    expect(e.items.slice(0, 2).map((x) => [x.no, x.description, x.amount])).toEqual([['1.1', 'Excavation for foundations', 15750], ['1.2', 'Filling in plinth', 7500]]);
    expect(e.heads[0].amount).toBe(23250);
  });
});

describe('a renovation', () => {
  // By hand: 25,000 + 450 × 95 = 42,750 + 300 × 120 = 36,000 + 40,000 = 1,43,750; no contingency; no area, so no per sq ft.
  it('needs no area, and adds no contingency when there is none', () => {
    const e = estimate({ kind: 'renovation', gstPct: 'included', contingencyPct: 'none', items: [
      item('dismantling', 'Removing old tiles', 1, 'LS', 25000), item('flooring', 'Vitrified tiles', 450, 'sqft', 95),
      item('painting', 'Interior painting', 300, 'sqm', 120), item('electrical', 'Rewiring', 1, 'LS', 40000),
    ] }) as Estimate;
    expect([e.works, e.contingency, e.total, e.perSqft]).toEqual([143750, 0, 143750, undefined]);
  });
});

describe('a missing fact is never assumed', () => {
  it('names what is needed and shows no figures', () => {
    expect(estimateNeeds({ items: [] })).toEqual([
      'What the estimate is for: new construction, or renovation or repair', 'At least one item, with its quantity and rate',
      'GST: included in the rates, or the rate to add', 'Contingency: none, or a percentage',
    ]);
    const r = estimate({ kind: 'construction', items: [{ head: 'rcc', description: 'RCC', quantity: 0, unit: 'cum' }, { head: '', description: '' }], gstPct: 'included', contingencyPct: 'none' }) as Needs;
    expect(r.needs).toEqual(['Item 1: the quantity, more than 0', 'Item 1: the rate', 'The built-up area in sq ft']);
  });
});

describe('the second computation guards every figure', () => {
  it('blocks the estimate when the two computations disagree', () => {
    const r = E({}) as Estimate, wrong = estimate({ kind: 'construction', items: CASE_E, area: 1200, gstPct: 'included', contingencyPct: 3 },
      (items, g, c, a) => ({ heads: new Map(r.heads.map((h) => [h.head, h.amount])), works: r.works, total: r.total + 1, perSqft: a ? (r.total + 1) / a : undefined }));
    expect((wrong as Blocked).blocked).toMatch(/disagree on the total/);
  });
});
