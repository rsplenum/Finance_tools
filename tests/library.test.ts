/**
 * The library (engine/library.ts, engine/data/library/) and the architect's rules (engine/data/architect.json): every
 * value has a source, every level of every family names an item with a rate, every slot's quantity fits its family's
 * unit. A rate is the middle of its reported range, worked by hand below.
 */
import { describe, it, expect } from 'vitest';
import { CLASSES, ENTRIES, FAMILIES, FILES, LABOUR_ITEMS, SOURCE, choices, ladder, price } from '../engine/library';
import { R, dimensionOf } from '../engine/architect';

const UNITS = ['sqft', 'sqm', 'rft', 'm', 'nos', 'set', 'lot', 'kg', 'cum', 'bag', 'litre'];

describe('the library: every value has a source', () => {
  it('ids are unique across the files', () => {
    const ids = FILES.flatMap((f) => f.entries.map((e) => e.id));
    expect(ids.length).toBe(new Set(ids).size);
    const fams = FILES.flatMap((f) => f.families.map((x) => x.id));
    expect(fams.length).toBe(new Set(fams).size);
  });
  it('is large: at least 250 items in at least 60 families', () => {
    expect(ENTRIES.size).toBeGreaterThanOrEqual(250);
    expect(FAMILIES.size).toBeGreaterThanOrEqual(60);
  });
  it('every file is dated', () => {
    for (const f of FILES) expect(f.date, f.title).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it('every item: a family, a unit, a basis; a rate from low to high with its sources, or a note that it is still to be found', () => {
    for (const e of ENTRIES.values()) {
      const where = `${e.id} (${e.file})`;
      expect(FAMILIES.has(e.family), where).toBe(true);
      expect(UNITS, where).toContain(e.unit);
      expect(['installed', 'supply', 'product', 'set'], where).toContain(e.basis);
      if (e.level !== undefined) expect(e.level >= 1 && e.level <= 5, where).toBe(true);
      for (const s of e.src) expect(SOURCE[s], `${where} cites ${s}`).toBeDefined();
      if (e.basis === 'set') {
        expect(e.parts?.length, where).toBeGreaterThan(0);
        for (const p of e.parts ?? []) { expect(ENTRIES.has(p.id), `${where} part ${p.id}`).toBe(true); expect(p.n, where).toBeGreaterThan(0); }
      } else if (e.rate) {
        expect(e.rate[0], where).toBeGreaterThan(0);
        expect(e.rate[1], where).toBeGreaterThanOrEqual(e.rate[0]);
        expect(e.src.length, where).toBeGreaterThan(0);
      } else expect(e.note, `${where} has no rate and no note`).toBeTruthy();
      if (e.wastage !== undefined) expect(e.wastage >= 0 && e.wastage < 0.5, where).toBe(true);
      if (e.pack) expect(e.pack.qty > 0 && UNITS.includes(e.pack.unit), where).toBe(true);
      for (const f of e.fix ?? []) expect(LABOUR_ITEMS.has(f.id), `${where} labour ${f.id}`).toBe(true);
    }
  });
  it('every labour rate runs from low to high and has its sources', () => {
    for (const l of LABOUR_ITEMS.values()) {
      expect(l.rate[1], l.id).toBeGreaterThanOrEqual(l.rate[0]);
      expect(l.src.length, l.id).toBeGreaterThan(0);
      for (const s of l.src) expect(SOURCE[s], `${l.id} cites ${s}`).toBeDefined();
    }
  });
  it('every source has a class, and a link unless it is our own rule', () => {
    for (const [id, s] of Object.entries(SOURCE)) {
      expect(CLASSES[s.class], id).toBeDefined();
      if (s.class !== 'O') expect(s.url, id).toMatch(/^https:\/\//);
    }
  });
});

describe('the five levels of every family', () => {
  it('name five places, each an item with a rate, in the family\'s own unit', () => {
    for (const fam of FAMILIES.values()) {
      if (fam.fixed) {
        expect(ENTRIES.has(fam.fixed), fam.id).toBe(true);
        // A fixed item without a rate says why in its note (the sewer connection: each city's own charges).
        if (ENTRIES.get(fam.fixed)?.note && !ENTRIES.get(fam.fixed)?.rate && ENTRIES.get(fam.fixed)?.basis !== 'set') expect(price(fam.fixed, 1, 18)).toBeNull();
        else expect(price(fam.fixed, 1, 18), `${fam.id}: ${fam.fixed} has no rate`).not.toBeNull();
        expect((ENTRIES.get(fam.fixed) as { unit: string }).unit, fam.id).toBe(fam.unit);
      }
      if (!fam.levels) continue;
      expect(fam.levels.length, fam.id).toBe(5);
      expect(fam.levels.some((x) => x), `${fam.id} has nothing at any level`).toBe(true);
      for (let lv = 1; lv <= 5; lv++) {
        const id = ladder(fam, lv);
        if (!id) continue;
        expect(ENTRIES.has(id), `${fam.id} level ${lv}: ${id}`).toBe(true);
        expect(price(id, 1, 18), `${fam.id} level ${lv}: ${id} has no rate`).not.toBeNull();
        expect((ENTRIES.get(id) as { unit: string }).unit, `${fam.id} level ${lv}`).toBe(fam.unit);
      }
    }
  });
  it('a family\'s choices start with its levels\' items and include its alternatives', () => {
    const floors = choices('floor').map((e) => e.id);
    expect(floors).toContain('fl-vit-dc-600');
    expect(floors).toContain('fl-kota');
    expect(floors.length).toBeGreaterThan(20);
  });
});

describe('the rules: every slot fits its family', () => {
  it('every slot names a family in the library and a section, and its quantity fits the family\'s unit', () => {
    const sections = new Set(R.sections.map((s) => s.id));
    const kind = { area: ['sqft', 'sqm'], length: ['rft', 'm'], count: ['nos', 'set', 'lot'], material: ['bag', 'kg', 'cum', 'nos'], volume: ['litre'] };
    for (const [room, slots] of Object.entries(R.templates)) for (const s of slots) {
      const fam = FAMILIES.get(s.family);
      expect(fam, `${room}: ${s.family}`).toBeDefined();
      expect(sections.has(s.section), `${room}: ${s.section}`).toBe(true);
      expect(kind[dimensionOf(s.qty)], `${room}: ${s.family} by ${s.qty}`).toContain(fam?.unit);
    }
  });
  it('every choice at a level (L1) is priced by a unit its slot takes, of the same unit as the level\'s item (or its pair: sq ft and sq m, ft and m), as both computations require', () => {
    const kind = { area: ['sqft', 'sqm'], length: ['rft', 'm'], count: ['nos', 'set', 'lot'], material: ['bag', 'kg', 'cum', 'nos'], volume: ['litre'] };
    const pair = (u: string) => (u === 'sqft' || u === 'sqm' ? 'area' : u === 'rft' || u === 'm' ? 'length' : u);
    for (const [room, slots] of Object.entries(R.templates)) for (const s of slots) {
      const fam = FAMILIES.get(s.family);
      if (!fam) continue;
      for (const level of [1, 2, 3, 4, 5] as const) {
        const named = ladder(fam, level);
        if (!named) continue;
        for (const e of choices(fam.id).filter((x) => x.id === named || x.level === level)) {
          expect(kind[dimensionOf(s.qty)], `${room}: ${s.family} at ${level}, ${e.id}`).toContain(e.unit);
          expect(pair(e.unit), `${room}: ${s.family} at ${level}, ${e.id}`).toBe(pair((ENTRIES.get(named) as { unit: string }).unit));
        }
      }
    }
  });
  it('every rule names its sources and its reason, and every source exists', () => {
    const found: string[] = [];
    const walk = (v: unknown, path: string) => {
      if (!v || typeof v !== 'object') return;
      if (Array.isArray(v)) { v.forEach((x, i) => walk(x, `${path}[${i}]`)); return; }
      const o = v as Record<string, unknown>;
      if (Array.isArray(o.src)) {
        found.push(path);
        expect(o.why, `${path} has no reason`).toBeTruthy();
        expect((o.src as string[]).length, `${path} has no source`).toBeGreaterThan(0);
        for (const s of o.src as string[]) expect(SOURCE[s], `${path} cites ${s}`).toBeDefined();
      }
      for (const [k, x] of Object.entries(o)) if (k !== 'src') walk(x, `${path}.${k}`);
    };
    walk(R, 'rules');
    expect(found.length).toBeGreaterThanOrEqual(39);
  });
});

describe('rates, worked by hand', () => {
  it('a tile: the middle of Rs. 30–95 is 62.50, with 12% wastage 70.00, plus laying 32.50 and adhesive 13.00 = 115.50 a sq ft', () => {
    expect(price('fl-vit-dc-600', 1, 18)?.rate).toBe(115.5);
  });
  it('a box price: Rs. 2,800 (the middle of 2,000–3,600) for 2.56 sq m = 27.5556 sq ft is 101.61 a sq ft; with 12% wastage 113.81, plus 90 and 13 = 216.81', () => {
    expect(price('fl-slab-800x1600', 1, 18)?.rate).toBe(216.81);
  });
  it('the city scales labour, not the product: the same tile in Pune (× 0.96907) is 70.00 + 45.50 × 0.96907 = 114.09', () => {
    // Pune's middle 2,350 against the six cities' average middle 2,425: 0.969072. 45.50 × 0.969072 = 44.0928.
    expect(price('fl-vit-dc-600', 2350 / 2425, 18)?.rate).toBe(114.09);
  });
  it('a rate quoted before GST has 18% added: 8 mm shower glass, the middle of Rs. 440–660 is 550, with GST 649.00', () => {
    expect(price('ss-8-fixed', 1, 18)?.rate).toBe(649);
  });
  it('a set adds its parts: Jaquar Continental accessories 1,397 + 699 + 600 = 2,696', () => {
    expect(price('acc-continental', 1, 18)?.rate).toBe(2696);
  });
  it('an item still to be found has no rate', () => {
    expect(price('fl-granite', 1, 18)).toBeNull();
  });
});
