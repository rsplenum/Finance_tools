/**
 * The quotation check (E4b, D-UX-36). Every figure is worked a second way outside the engine: by hand from the library's
 * files, Mumbai's factor as 5,000 × 6 ÷ 23,530 (its range's sum against the six cities' average sum) = 1.2749681.
 * Fixtures are picked by whole keys and item ids, never by part of one.
 */
import { describe, it, expect } from 'vitest';
import { architect, billOf, cityFactor, type ArchitectEstimate, type ArchitectInput } from '../engine/architect';
import { checkRate } from '../engine/architect-check';
import { price } from '../engine/library';
import { FAR_OUT, billFroms, matchWords, quoteCheck, quoteContext, TYPED_UNIT, type QuoteLine, type QuoteResult } from '../engine/quote';
import { R } from '../engine/architect';

const home = (x: Partial<ArchitectInput> = {}): ArchitectInput => ({ kind: 'renovate', property: 'flat', city: 'mumbai', bhk: '2', area: 1000, areaUnit: 'sqft', level: 3, ...x });
/** The bill's lines with their item, family and levels, by item id; each bill line once. */
function billLines(input: ArchitectInput) {
  const e = architect(input) as ArchitectEstimate, bill = billOf(e), froms = billFroms(e, bill);
  return { e, ctx: quoteContext(e), lines: bill.flatMap((s, i) => s.lines.map((b, j) => ({ b, from: froms[i][j] }))) };
}
const one = (lines: QuoteLine[], ctx: ReturnType<typeof quoteContext>): QuoteResult[] => quoteCheck(lines, ctx) as QuoteResult[];

describe('the quotation check', () => {
  const { ctx, lines } = billLines(home());
  const fc = lines.find((x) => x.b.entry === 'fc-gypsum') as (typeof lines)[number];
  const at = (rate: number | undefined, unit = 'sqft') => one([{ words: fc.b.item, unit, ...(rate === undefined ? {} : { rate }), from: fc.from }], ctx)[0];

  it('keeps 20% in the rules, with its reason', () => {
    expect(FAR_OUT).toBe(20);
    expect(R.quote.why).toContain('20%');
  });

  it('bands the false ceiling at Premium in Mumbai: Rs. 75–110 a sq ft fitted, × 1.2749681', () => {
    expect(fc.from).toEqual({ entry: 'fc-gypsum', family: 'false-ceiling', levels: [3] });
    // 75 × 1.2749681 = 95.6226; 110 × 1.2749681 = 140.2465.
    const r = at(120);
    expect([r.band, r.where, r.off, r.flagged, r.how, r.reported]).toEqual([{ low: 95.62, high: 140.25 }, 'within', 0, false, 'bill', false]);
  });

  it('flags only beyond 20%: Rs. 76.50 is 19.996% below Rs. 95.62, Rs. 76.49 is 20.006%', () => {
    // 0.8 × 95.62 = 76.496 and 1.2 × 140.25 = 168.30.
    expect([at(76.5).where, at(76.5).off, at(76.5).flagged]).toEqual(['below', 20, false]);
    expect([at(76.49).off, at(76.49).flagged]).toEqual([20, true]);
    expect([at(168.3).where, at(168.3).flagged]).toEqual(['above', false]);
    expect([at(168.31).off, at(168.31).flagged]).toEqual([20, true]);
    // 100 − 95.62 within; 47.81 is half of 95.62: 50% below.
    expect([at(47.81).off, at(47.81).flagged]).toEqual([50, true]);
  });

  it('turns the band into the unit typed, and leaves out a blank rate', () => {
    // 95.62 ÷ 0.09290304 = 1,029.2452; 140.25 ÷ 0.09290304 = 1,509.6383.
    expect(at(1200, 'sqm').band).toEqual({ low: 1029.25, high: 1509.64 });
    expect(at(1200, 'cum').where).toBe('other-unit');
    expect([at(undefined).where, at(undefined).band]).toEqual(['left-out', null]);
  });

  it('turns metres into running feet: kitchen units at Rs. 25,000–45,000 a metre come to Rs. 9,715.26 a running ft at the low end', () => {
    const k = lines.find((x) => x.b.entry === 'kc-acrylic') as (typeof lines)[number];
    // 25,000 × 1.2749681 = 31,874.20 a metre × 0.3048 = 9,715.26; the high end Rs. 22,000 × 1.2749681 = 28,049.30 a running ft.
    expect(one([{ words: 'x', unit: TYPED_UNIT[k.b.unit], rate: 20000, from: k.from }], ctx)[0].band).toEqual({ low: 9715.26, high: 28049.3 });
  });

  it('adds GST to the material of a rate quoted before it, never to its fixing labour, at either end', () => {
    // Athangudi tiles Rs. 80 + 10% wastage = 88 × 1.18 = 103.84, plus (25 + 8) × 1.2749681 = 42.07 of labour: 145.91.
    // High end: 250 × 1.1 × 1.18 = 324.50, plus (40 + 18) × 1.2749681 = 73.95: 398.45. With GST on the labour too, 153.49.
    const c = cityFactor('mumbai') as number;
    expect([price('fl-athangudi', c, 18, 0)?.rate, price('fl-athangudi', c, 18, 1)?.rate]).toEqual([145.91, 398.45]);
    expect([checkRate('fl-athangudi', 'mumbai', 0), checkRate('fl-athangudi', 'mumbai', 1)]).toEqual([145.91, 398.45]);
  });

  it('says when the item is still as reported', () => {
    const w = lines.find((x) => x.b.entry === 'fw-gvt-1200') as (typeof lines)[number];
    expect(one([{ words: 'x', unit: 'sqft', rate: 200, from: w.from }], ctx)[0].reported).toBe(true);
  });

  it('takes an item the user chose at its own level: Statuario marble at Ultra luxury', () => {
    const c = billLines(home({ level: 2, items: { 'living:floor:floor-skirting': 'fl-marble-statuario' } }));
    const s = c.lines.find((x) => x.b.entry === 'fl-marble-statuario') as (typeof c.lines)[number];
    expect(s.from.levels).toEqual([5]);
    // Level 5's floors in Mumbai: microcement Rs. 300 fitted × 1.2749681 = 382.49 the lowest; Calacatta the dearest, 2,379.24.
    expect(one([{ words: 'x', unit: 'sqft', rate: 1500, from: s.from }], c.ctx)[0].band).toEqual({ low: 382.49, high: 2379.24 });
  });
});

describe('a line typed by hand', () => {
  const { ctx } = billLines(home());
  it('is matched by its words where one family fits best', () => {
    expect(['Vitrified floor tiles', 'Main door, teak', 'Chimney 90 cm', 'Labour for plaster', 'WC and basin'].map(matchWords))
      .toEqual(['floor', 'main-door', 'chimney', 'labour-plaster', 'sanitary']);
    expect(['Door', 'Kitchen sink mixer', 'Miscellaneous'].map(matchWords)).toEqual([null, null, null]);
  });
  it('takes the level the estimate puts its family at, and says not matched otherwise until one is picked', () => {
    // The floor at Premium in Mumbai: granite Rs. 110 fitted × 1.2749681 = 140.25 the lowest, terrazzo Rs. 450 = 573.74 the dearest.
    // Rs. 600 is 26.26 over 573.74: 4.58%, within the 20%.
    const [floor, door, picked] = one([
      { words: 'Vitrified floor tiles', unit: 'sqft', rate: 600 }, { words: 'Door', unit: 'nos', rate: 9000 }, { words: 'Door', unit: 'nos', rate: 9000, pick: 'main-door' },
    ], ctx);
    expect([floor.family, floor.how, floor.levels, floor.band, floor.where, floor.off, floor.flagged]).toEqual(['floor', 'words', [3], { low: 140.25, high: 573.74 }, 'above', 5, false]);
    expect([door.family, door.where]).toEqual([null, 'not-matched']);
    expect([picked.family, picked.how]).toEqual(['main-door', 'picked']);
  });
});

describe('the two computations', () => {
  it('agree on every bill line at every level, city and kind, at rates from far below to far above', () => {
    for (const kind of ['renovate', 'interiors', 'build'] as const) for (const level of [1, 2, 3, 4, 5] as const) for (const city of ['pune', 'delhi', 'other']) {
      const { ctx, lines } = billLines(home({ kind, level, city, ...(kind === 'build' ? { floors: 2 } : {}) }));
      const q = lines.flatMap(({ b, from }, i) => [0.1, 0.79, 1, 1.21, 3].map((m) => ({ words: b.item, unit: TYPED_UNIT[b.unit], rate: (i + 1) * 97.13 * m, from })));
      expect('blocked' in quoteCheck(q, ctx)).toBe(false);
    }
  });
  it('block the check where they disagree', () => {
    const { ctx } = billLines(home());
    const r = quoteCheck([{ words: 'Vitrified floor tiles', unit: 'sqft', rate: 600 }], ctx, () => [{ family: 'floor', band: [140.25, 574.74], where: 'above', off: 5, flagged: false }]);
    expect(r).toEqual({ blocked: 'The two computations disagree on the band of line 1, so the quotation is not checked. Please report this.' });
  });
});
