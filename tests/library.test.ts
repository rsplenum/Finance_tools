/**
 * The library (engine/library.ts, engine/data/library/) and the architect's rules (engine/data/architect.json): every
 * value has a source, every level of every family names an item with a rate, every slot's quantity fits its family's
 * unit. A rate is the middle of its reported range, worked by hand below.
 */
import { describe, it, expect } from 'vitest';
import { CLASSES, ENTRIES, FAMILIES, FILES, LABOUR_ITEMS, NOTES, NOTES_DATE, SOURCE, SPEND_SAVE, choices, ladder, price, type Note } from '../engine/library';
import { R, architect, dimensionOf, type ArchitectEstimate, type ArchitectInput } from '../engine/architect';
import { checkRate } from '../engine/architect-check';

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
      for (const [c, b] of Object.entries(e.byCity ?? {})) {
        expect(R.cities.list.some((x) => x.id === c), `${where}: no city ${c}`).toBe(true);
        expect(b[0] > 0 && b[1] >= b[0] && e.src.length > 0, `${where}: ${c}'s own charge`).toBe(true);
      }
      if (e.wastage !== undefined) expect(e.wastage >= 0 && e.wastage < 0.5, where).toBe(true);
      if (e.pack) expect(e.pack.qty > 0 && UNITS.includes(e.pack.unit), where).toBe(true);
      for (const f of e.fix ?? []) expect(LABOUR_ITEMS.has(f.id), `${where} labour ${f.id}`).toBe(true);
    }
  });
  it('an item checked against its pages cites only pages that were read (E2), every one named in one run', () => {
    const unread = [...ENTRIES.values()].filter((e) => e.checked).flatMap((e) => e.src.filter((s) => s !== 'own' && !SOURCE[s]?.checked).map((s) => `${e.id} cites ${s}`));
    expect(unread).toEqual([]);
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
  it('every choice in the families grown in L2, and every part of their sets, states its tax basis; no part says GST is extra, since only a set\'s own basis adds GST (D-DATA-08)', () => {
    const grown = ['cabinets', 'counter', 'wardrobe', 'sofa', 'bed', 'dining', 'kitchen-unit', 'sanitary', 'cp', 'main-door', 'room-door', 'windows', 'lights', 'wiring'];
    for (const f of grown) {
      expect(choices(f).length, f).toBeGreaterThan(0);
      for (const e of choices(f)) {
        expect(e.gst, e.id).toMatch(/^(extra|incl|unstated)$/);
        for (const p of e.parts ?? []) expect(ENTRIES.get(p.id)?.gst, `${e.id}: ${p.id}`).toMatch(/^(incl|unstated)$/);
      }
    }
    for (const e of ENTRIES.values()) for (const p of e.parts ?? []) expect(ENTRIES.get(p.id)?.gst, `${e.id}: ${p.id}`).not.toBe('extra');
  });
});

describe('brand names (D-BIZ-03, docs/TRADEMARKS.md)', () => {
  it('an item named after a brand is checked against its page, never as reported (rule 3); else its name is generic and the brand an example', () => {
    const word = (b: string) => new RegExp(`\\b${b.split(/\s+/)[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    const named = [...ENTRIES.values()].filter((x) => (x.brands ?? []).some((b) => word(b).test(x.name)));
    expect(named.length).toBeGreaterThan(30);
    expect(named.filter((x) => !x.checked).map((x) => `${x.id}: ${x.name}`)).toEqual([]);
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
  it('the city scales labour, not the product: the same tile in Pune (× 0.915427) is 70.00 + 45.50 × 0.915427 = 111.65', () => {
    // Pune's middle 1,795 against the six cities' average middle 11,765 ÷ 6 = 1,960.83: 0.915427. 45.50 × 0.915427 = 41.6519.
    expect(price('fl-vit-dc-600', 1795 / (11765 / 6), 18)?.rate).toBe(111.65);
  });
  it('GST is added to the material its source quotes before GST, not to the labour that fixes it (E2): glazed vitrified 600 mm, 57.50 + 12% = 64.40, + 18% = 75.992, + laying 32.50 + adhesive 13 = 121.49', () => {
    expect(price('fl-gvt-600', 1, 18)?.rate).toBe(121.49);
  });
  it('a rate quoted before GST has 18% added: 8 mm shower glass, the middle of Rs. 440–660 is 550, with GST 649.00', () => {
    expect(price('ss-8-fixed', 1, 18)?.rate).toBe(649);
  });
  it('a set adds its parts: Jaquar Continental accessories, towel rail 1,513 (1,450–1,576) + 699 + robe hook 530 (380–680) = 2,742', () => {
    expect(price('acc-continental', 1, 18)?.rate).toBe(2742);
  });
  it('an item still to be found has no rate', () => {
    expect(price('fl-encaustic', 1, 18)).toBeNull();
  });
  it('a city\'s own charge stands as it is: the sewer connection in Chennai (× 1,830 ÷ 1,960.83 = 0.933277 for other rates) is the middle of Rs. 24,500–26,500, 25,500; none yet in Mumbai', () => {
    const chennai = 1830 / (11765 / 6), at = (end?: 0 | 1) => price('sewer-connection', chennai, 18, end, 'chennai')?.rate;
    expect([at(), at(0), at(1)]).toEqual([25500, 24500, 26500]);
    expect([checkRate('sewer-connection', 'chennai'), checkRate('sewer-connection', 'chennai', 0), checkRate('sewer-connection', 'chennai', 1)]).toEqual([25500, 24500, 26500]);
    expect([price('sewer-connection', 1.2749681, 18, undefined, 'mumbai'), checkRate('sewer-connection', 'mumbai'), price('sewer-connection', 1, 18)]).toEqual([null, null, null]);
  });
});

// T1 (D-UX-34): words for the page's Why?, never an amount; each note with its sources, reported until its pages are read (E2).
describe('T1: what it is, why it costs what it does, what to check; where to spend, where to save', () => {
  const words = (x: string) => x.split(/\s+/).filter(Boolean).length;
  const fair = (n: Note, where: string) => {
    expect(n.text.length, where).toBeGreaterThan(0);
    expect(words(n.text), `${where}: short`).toBeLessThanOrEqual(50);
    expect(n.src.length, where).toBeGreaterThan(0);
    for (const s of n.src) expect(SOURCE[s], `${where}: source ${s}`).toBeDefined();
    // Our own rule alone is 'own'; a note with an outside source is reported until its pages are read, then checked (E2).
    if (n.src.every((s) => s === 'own')) expect(n.status, where).toBe('own');
    else expect(['reported', 'checked'], where).toContain(n.status);
    if (n.status === 'checked') for (const s of n.src) if (s !== 'own') expect(SOURCE[s].checked, `${where}: ${s} read`).toBeDefined();
    expect(n.text, `${where}: no amount: the line's figures are the engine's`).not.toMatch(/\bRs\.?\s*\d|₹|\b(lakh|crore)s?\b|\d\/-/i);
    expect(n.text, `${where}: no verdict on safety`).not.toMatch(/\b(safe|safer|safely|safety|unsafe|guarantee)/i);
    expect(n.text, `${where}: never "architect" (D-UX-18)`).not.toMatch(/architect/i);
  };
  it('dated; every note names a family in the library, and has the three notes, each short, sourced and marked', () => {
    expect(NOTES_DATE).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (const [id, n] of NOTES) {
      expect(FAMILIES.has(id), id).toBe(true);
      expect(Object.keys(n).sort(), id).toEqual(['check', 'cost', 'what']);
      for (const k of ['what', 'cost', 'check'] as const) fair(n[k], `${id}.${k}`);
    }
  });
  it('the five families that cost the most in each of V1\'s two cases, as the engine works them out, all have notes', () => {
    const cases: ArchitectInput[] = [
      { kind: 'interiors', property: 'flat', city: 'pune', area: 1000, bhk: '2', level: 2 },
      { kind: 'build', floors: 2, city: 'pune', area: 2000, bhk: '3', level: 4 },
    ];
    const top = cases.map((input) => {
      const e = architect(input) as ArchitectEstimate, by = new Map<string, number>();
      for (const l of e.lines) by.set(l.family, (by.get(l.family) ?? 0) + l.amount);
      return [...by].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([f]) => f);
    });
    // On 04-10-2026, largest first: wardrobe, cabinets, paint, sofa, carpentry; floor, exterior paint, CP fittings, cabinets, steel.
    // A rate change may reorder them; a family new to a top five fails here, and below until it has notes.
    expect(top.map((x) => [...x].sort())).toEqual([['cabinets', 'carpentry', 'paint', 'sofa', 'wardrobe'], ['cabinets', 'cp', 'exterior-paint', 'floor', 'steel']]);
    for (const f of top.flat()) expect(NOTES.has(f), f).toBe(true);
  });
  it('a 12 mm bar\'s weight in the steel note, worked two ways: 12² ÷ 162 = 0.8889 and π/4 × 0.012² m² × 7,850 kg a cu m = 0.8878, both 0.89 kg a metre', () => {
    const rule = (12 * 12) / 162, density = (Math.PI / 4) * 0.012 * 0.012 * 7850;
    expect(rule).toBeCloseTo(0.8889, 4);
    expect(density).toBeCloseTo(0.8878, 4);
    expect(rule.toFixed(2)).toBe('0.89');
    expect(density.toFixed(2)).toBe('0.89');
    expect(NOTES.get('steel')?.check.text).toContain('A 12 mm bar weighs about 0.89 kg a metre');
  });
  it('where to spend, where to save: each rule names a section, short, sourced and marked; the owner\'s examples are all there', () => {
    const sections = new Set(R.sections.map((x) => x.id));
    for (const r of SPEND_SAVE) {
      const where = `${r.section} ${r.way}${r.on ? ` on ${r.on}` : ''}`;
      expect(sections.has(r.section), where).toBe(true);
      expect(['spend', 'save'], where).toContain(r.way);
      fair(r, where);
    }
    const said = (way: string) => SPEND_SAVE.filter((r) => r.way === way).map((r) => `${r.section}${r.on ? `: ${r.on}` : ''}`);
    // The owner, 04-10-2026: hard to change later, the structure, waterproofing, wiring and plumbing; easy to upgrade later, paint, lights and furniture.
    expect(said('spend')).toEqual(expect.arrayContaining(['structure', 'waterproofing', 'electrical: the wiring', 'plumbing']));
    expect(said('save')).toEqual(expect.arrayContaining(['walls', 'electrical: the light fittings', 'furniture']));
  });
});
