/**
 * Independent second computation of the architect's estimate (CLAUDE.md), written apart from architect.ts on purpose:
 * the rooms from one scale factor on their sizes along their ranges (the top's part plus the bottom's, by the size word),
 * each room's share of the carpet area in closed form, each room's breadth before its length, walls as four sides,
 * a foot as 0.3048 m (dividing, where architect.ts multiplies), the library priced by walking it afresh (the middle of
 * a range as its low end plus half its width, the city's factor from the sums of the ranges), and the total added up
 * room by room before the sections. A new house's outline is drawn breadth first, its outer walls as the outline less the
 * rectangle inside them, cubic feet turned to cubic metres by multiplying by a foot cubed, and its sides added one by one.
 * A room's own size is put in after the plan, its breadth the shorter side; a room's own level is looked up before the
 * section's slider. The split into fixed works, movable items and appliances is added up row by row. A new house's plot
 * is drawn side by side, its stairs part by part (the landings as the well less the flights and their gap), its tanks
 * filled a step at a time, and its stages taken from the sections and the rows as this computation adds them up. The
 * user's bathrooms (R2) are put after the programme's other rooms with the range of its last bathroom, each door opening
 * into the bedroom named or the passage. The range by the choices at a level (L1) walks the library afresh for each line:
 * every item of the family (its own, or one a level names) that the family names at the line's level or that is usually at
 * it, of the same kind of unit as the item named, priced on the quantity in its own unit; the cheapest and the dearest
 * after sorting the amounts.
 * architect.ts shows no figure unless both agree.
 */
import RULES from './data/architect.json';
import { ENTRIES, FAMILIES, LABOUR_ITEMS, type Entry, type ItemKind, type Unit } from './library';
import type { ArchitectInput, Rules, RoomKind, WorkKind } from './architect';

export interface CheckLine { qty: number; rate: number; amount: number }
export interface ArchitectCheck {
  lines: Map<string, CheckLine>; sections: Map<string, number>; total: number; split: Record<ItemKind, number>;
  rooms: Map<string, { sqm: number; len: number; wide: number }>; roomsSqm: number; plannedSqm: number;
  /** A new house's stages by id; empty for other work. */
  stages: Map<string, number>;
  /** Each room's share of the carpet area, the passage's and the inside walls' (id walls), by id; not the balcony's (R1). */
  shares: Map<string, number>;
  /** The range by the choices at each line's level (L1), when asked for. */
  range?: { low: number; high: number; lines: number; of: number };
}

const Q = RULES as unknown as Rules;
const FOOT = 0.3048, SQ_FOOT = FOOT * FOOT;
// To the paisa, half up, an exact half kept from floating point.
const round2 = (x: number) => Math.round(x * 100 + 1e-6) / 100;

interface Space { id: string; kind: RoomKind; master: boolean; of: string | null; sqm: number; len: number; wide: number }
interface Hole { w: number; h: number; sill: number; door: boolean; owner: string; other: string | null; kind: string }

export function architectCheck(input: ArchitectInput, banded = false): ArchitectCheck {
  const kind = input.kind as WorkKind, level = input.level as number;
  const typed = input.areaUnit === 'sqm' ? (input.area as number) : (input.area as number) * SQ_FOOT;
  const H = input.heightM ?? Q.height.m;

  // A new house: the outline breadth first, the outer walls as the outline less the rectangle inside them, the stair wells.
  const thick = Q.openings.walls.external / 1000;
  let shell: { floors: number; built: number; foot: number; len: number; wide: number; storey: number; well: number; plotLen: number; plotWide: number } | null = null;
  let carpet = typed;
  if (kind === 'build') {
    const floors = input.floors as number, foot = typed / floors;
    const wide = Math.sqrt(foot / Q.house.shape.aspect), len = foot / wide;
    const ring = len * wide - (len - thick * 2) * (wide - thick * 2);
    const well = Q.house.stair.l * Q.house.stair.w, m = Q.house.plot;
    carpet = typed - floors * ring - floors * well;
    // The plot side by side: the user's two sides sorted, or the outline's breadth and length with the margins added.
    const own = input.plot ? [input.plot.l, input.plot.b].sort((a, b) => a - b) : null;
    const plotWide = own ? own[0] : m.side + wide + m.side, plotLen = own ? own[1] : m.front + len + m.rear;
    shell = { floors, built: typed, foot, len, wide, storey: Q.house.slab.m + H, well, plotLen, plotWide };
  }

  // The rooms: each one's size at its word along its range (Medium unless given), one scale factor on those sizes; the
  // breadth first, then the length.
  const prog = Q.programmes[input.bhk as keyof Rules['programmes']];
  const medium = Q.sizes.words.find((w) => w.id === 'medium') as { at: number };
  // The programme's rooms other than the bathrooms, then the bathrooms: the user's list (each the bedroom it opens into, or
  // null) or the programme's, the one marked attached opening into the main bedroom; each of the last bathroom's range.
  const counter: Record<string, number> = {};
  const others = prog.rooms.filter((r) => r.kind !== 'bath').map((r) => {
    counter[r.kind] = (counter[r.kind] ?? 0) + 1;
    return { kind: r.kind, master: !!r.master, of: null as string | null, range: r.range, id: r.kind === 'bedroom' ? `bedroom-${counter[r.kind]}` : r.kind };
  });
  const programmeBaths = prog.rooms.filter((r) => r.kind === 'bath'), mainBedroom = others.find((x) => x.master)?.id ?? null;
  const bathList = input.baths ?? programmeBaths.map((r) => (r.attached ? mainBedroom : null));
  const lastRange = programmeBaths[programmeBaths.length - 1].range;
  const listed = [...others, ...bathList.map((of, i) => ({ kind: 'bath' as RoomKind, master: false, of, range: lastRange, id: `bath-${i + 1}` }))].map((x) => {
    const w = Q.sizes.words.find((y) => y.id === input.roomWords?.[x.id]) ?? medium;
    return { ...x, size: x.range[1] * w.at + x.range[0] * (1 - w.at) };
  });
  const open = 1 - Q.shares.walls.value - Q.shares.passage.value, sizes = listed.map((x) => x.size).reduce((a, b) => a + b, 0);
  const scale = (carpet * open) / sizes;
  const spaces: Space[] = [];
  const make = (id: string, k: RoomKind, sqm: number, master = false, of: string | null = null) => {
    const wide = Math.sqrt(sqm / Q.aspect[k]);
    spaces.push({ id, kind: k, master, of, sqm, len: sqm / wide, wide });
  };
  for (const x of listed) make(x.id, x.kind, x.size * scale, x.master, x.of);
  make('passage', 'passage', Q.shares.passage.value * carpet);
  if (prog.balcony > 0 && input.balcony !== false) make('balcony', 'balcony', prog.balcony * SQ_FOOT);
  // Each room's share of the carpet area in closed form: a planned room its part of the open share by its size, the
  // passage its rule; a room of the user's own size, that size over the carpet area. The balcony is outside the carpet area.
  const shares = new Map<string, number>(listed.map((x) => [x.id, (open * x.size) / sizes]));
  shares.set('passage', Q.shares.passage.value);
  // A room's own size after the plan: the shorter side its breadth.
  for (const s of spaces) {
    const own = input.rooms?.[s.id];
    if (own) {
      s.wide = Math.min(own.b, own.l); s.len = Math.max(own.b, own.l); s.sqm = s.wide * s.len;
      if (shares.has(s.id)) shares.set(s.id, s.sqm / carpet);
    }
  }
  shares.set('walls', Q.shares.walls.value);
  const exists = (id: string) => spaces.some((s) => s.id === id);

  // Openings, listed by the room whose wall they are in.
  const holes: Hole[] = [];
  const size = (t: keyof Rules['openings']) => Q.openings[t] as { w: number; h: number; sill?: number };
  const put = (t: 'main' | 'bedroom' | 'bath' | 'kitchen' | 'balcony' | 'window' | 'kitchenWindow' | 'ventilator', owner: string, other: string | null) => {
    const s = size(t);
    holes.push({ w: s.w / 1000, h: s.h / 1000, sill: (s.sill ?? 0) / 1000, door: t !== 'window' && t !== 'kitchenWindow' && t !== 'ventilator', owner, other, kind: t });
  };
  const winArea = (size('window').w * size('window').h) / 1e6;
  for (const s of spaces) {
    const nWin = Math.max(1, Math.ceil((s.sqm / winArea) * Q.openings.windowShare.value - 1e-9));
    if (s.kind === 'passage') put('main', s.id, null);
    if (s.kind === 'bedroom') { put('bedroom', s.id, exists('passage') ? 'passage' : null); for (let i = 0; i < nWin; i++) put('window', s.id, null); }
    if (s.kind === 'living') { for (let i = 0; i < nWin; i++) put('window', s.id, null); if (exists('balcony')) put('balcony', s.id, 'balcony'); }
    if (s.kind === 'kitchen') { put('kitchen', s.id, exists('living') ? 'living' : 'passage'); put('kitchenWindow', s.id, null); }
    if (s.kind === 'bath') { put('bath', s.id, s.of ?? 'passage'); put('ventilator', s.id, null); }
  }

  const shown = (sec: string) => { const only = Q.sections.find((x) => x.id === sec)?.kinds; return only === undefined || only.includes(kind); };
  const sectionOn = (sec: string) => shown(sec) && (input.sections?.[sec] ?? Q.kinds[kind].on.includes(sec));
  const sliding = (sec: string) => !!Q.sections.find((x) => x.id === sec)?.slider;
  const levelAt = (sec: string, s: Space | null = null) => {
    if (!sliding(sec)) return level;
    const own = s ? input.roomLevels?.[s.id] : undefined;
    return own ?? input.sliders?.[sec] ?? level;
  };
  const sides = (s: Space) => [s.len, s.wide, s.len, s.wide];
  const wallRun = (s: Space) => sides(s).reduce((a, b) => a + b, 0);
  const tile = (s: Space) => {
    if (!sectionOn('bathrooms')) return Math.min(H, Q.tileHeights.existing / 1000);
    const v = Q.tileHeights.mm[levelAt('bathrooms', s) - 1];
    return v === 'ceiling' ? H : Math.min(H, v / 1000);
  };
  const run = (s: Space) => s.wide + s.len - Q.kitchen.depth;
  const feature = (s: Space) => {
    if (!sectionOn('walls')) return 0;
    const lv = levelAt('walls', s);
    return s.kind === 'living' && lv >= Q.feature.living ? s.len * H : s.kind === 'bedroom' && s.master && lv >= Q.feature.master ? s.wide * H : 0;
  };
  const familyAt = (fam: string, lv: number) => { const f = FAMILIES.get(fam); return f ? (f.fixed ?? f.levels?.[lv - 1] ?? null) : null; };
  const cover = (s: Space, lv: number) => {
    const spec = Q.falseCeiling.byLevel[lv - 1];
    return spec.rooms.includes(s.kind) || (s.master && spec.rooms.includes('master')) ? spec.cover : 'none';
  };
  const wardrobeW = (s: Space) => Math.min((s.master ? Q.wardrobes.mainWidth : Q.wardrobes.otherWidth) / 1000, Math.max(0, s.len - Q.wardrobes.clearance / 1000));
  const small = Q.is1200.noDeduction, big = Q.is1200.oneFace;

  // A quantity in its base unit: square metres, metres or a count.
  const qty = (rule: string, s: Space | null, lv: number): number => {
    if (!s) {
      if (shell) {
        const hs = Q.house, st = hs.stair, builtFeet = (shell.built + shell.well) / SQ_FOOT;
        const li = shell.len - thick * 2, bi = shell.wide - thick * 2, insideRun = [li, bi, li, bi].reduce((a, b) => a + b, 0);
        const wellRun = [st.w, st.l, st.w, st.l].reduce((a, b) => a + b, 0);
        const outsideRun = [shell.len, shell.wide, shell.len, shell.wide].reduce((a, b) => a + b, 0);
        const plotRun = [shell.plotLen, shell.plotWide, shell.plotLen, shell.plotWide].reduce((a, b) => a + b, 0) - hs.outside.gate.w;
        const water = hs.water, people = water.persons.by[input.bhk as keyof typeof water.persons.by], perDay = water.persons.lpcd * people;
        if (rule === 'built-up') return shell.built + shell.well;
        if (rule === 'plinth') return shell.foot;
        if (rule.startsWith('struct:')) {
          const k = rule.replace('struct:', '') as keyof Rules['house']['thumb'];
          const n = (hs.thumb[k] as number) * builtFeet;
          return k === 'sand' || k === 'aggregate' ? n * FOOT * FOOT * FOOT : n;
        }
        if (rule === 'terrace') return li * bi + insideRun * hs.terraceUpturn.m;
        if (rule === 'exterior-walls') return outsideRun * shell.storey * shell.floors + outsideRun * hs.parapet.m + insideRun * hs.parapet.m + wellRun * hs.cabin.h;
        if (rule === 'stair-railing') return shell.floors * (Math.hypot(st.going, shell.storey / 2) * 2 + st.gap);
        if (rule === 'stair-finish') {
          // Tread by tread and riser by riser; the landings as the well less the two flights and the gap between them.
          const tread = st.going / st.treads, riser = shell.storey / (2 * (st.treads + 1));
          const steps = 2 * st.treads * tread * st.flight + 2 * (st.treads + 1) * riser * st.flight;
          const landings = st.w * st.l - 2 * st.flight * st.going - st.gap * st.going;
          return (steps + landings) * shell.floors;
        }
        if (rule === 'stair-walls') return wellRun * shell.storey * shell.floors + wellRun * hs.cabin.h;
        if (rule === 'terrace-door') return 1;
        if (rule === 'compound-wall') return Math.max(0, plotRun);
        if (rule === 'compound-paint') return Math.max(0, plotRun) * hs.outside.wall + Math.max(0, plotRun) * hs.outside.wall;
        if (rule === 'gate') return hs.outside.gate.h * hs.outside.gate.w;
        if (rule === 'paving') return Math.max(0, shell.plotLen * shell.plotWide - shell.foot);
        if (rule === 'sump') { let v = 0; while (v < perDay * water.sump.days - 1e-9) v += water.sump.step; return v; }
        if (rule === 'tank') { const fit = water.tank.sizes.filter((x) => x >= perDay * water.tank.days - 1e-9); return fit.length ? Math.min(...fit) : Math.max(...water.tank.sizes); }
        if (rule === 'septic') return input.sewer ? 0 : water.septic.litres[input.bhk as keyof typeof water.septic.litres];
        if (rule === 'sewer') return input.sewer ? 1 : 0;
        if (rule === 'rwh') return 1;
      }
      if (rule === 'one') return 1;
      if (rule === 'carpet') return carpet;
      if (rule === 'protect') return spaces.reduce((a, x) => a + (x.kind === 'bath' || x.kind === 'balcony' ? 0 : x.sqm), 0);
      if (rule === 'making-good') return spaces.reduce((a, x) => a + (x.kind === 'balcony' ? 0 : wallRun(x) * H), 0) * Q.makingGood.share;
      if (rule === 'debris') {
        const nb = sectionOn('bathrooms') && kind === 'renovate' ? spaces.filter((x) => x.kind === 'bath').length : 0;
        const takenUp = sectionOn('flooring') && kind === 'renovate' ? spaces.reduce((a, x) => a + (x.kind === 'bath' ? 0 : x.sqm), 0) / SQ_FOOT : 0;
        return nb + Math.ceil(takenUp / Q.debris.sqftPerLot - 1e-9);
      }
      throw new Error(rule);
    }
    const own = holes.filter((o) => o.owner === s.id);
    switch (rule) {
      case 'floor': return s.sqm;
      case 'floor-skirting': {
        const doorWidths = holes.filter((o) => o.door && (o.owner === s.id || o.other === s.id)).reduce((a, o) => a + o.w, 0);
        return s.sqm + Math.max(0, wallRun(s) - doorWidths) * Q.skirting.m;
      }
      case 'paint': {
        if (s.kind === 'balcony') return 0;
        const roof = s.kind === 'bath' && sectionOn('bathrooms') && familyAt('bath-ceiling', levelAt('bathrooms', s)) ? 0 : s.sqm;
        if (s.kind === 'bath') {
          const th = tile(s);
          const cut = own.filter((o) => o.w * o.h > small).reduce((a, o) => a + o.w * Math.max(0, o.sill + o.h - Math.max(o.sill, th)), 0);
          return Math.max(0, sides(s).reduce((a, x) => a + x * Math.max(0, H - th), 0) - cut) + roof;
        }
        let net = sides(s).reduce((a, x) => a + x * H, 0);
        for (const o of holes) {
          const a = o.w * o.h, thick = (o.other === null || o.other === 'balcony' ? Q.openings.walls.external : Q.openings.walls.internal) / 1000;
          if (o.owner === s.id) { if (a > small) net -= a; if (a > big) net += thick * (o.h + o.h + o.w + (o.door ? 0 : o.w)); }
          if (o.other === s.id && a > big) net -= a;
        }
        if (s.kind === 'kitchen') net -= run(s) * Q.kitchen.dado;
        return Math.max(0, net - feature(s)) + roof;
      }
      case 'feature': return feature(s);
      case 'false-ceiling': {
        const c = cover(s, lv);
        if (c === 'none') return 0;
        if (c === 'full') return s.sqm;
        const inner = Math.max(0, s.len - Q.falseCeiling.border * 2) * Math.max(0, s.wide - Q.falseCeiling.border * 2);
        return s.sqm - inner;
      }
      case 'cove': return cover(s, lv) === 'none' ? 0 : sides(s).reduce((a, x) => a + Math.max(0, x - Q.falseCeiling.coveInset * 2), 0);
      case 'bath-tiles': {
        const th = tile(s);
        const cut = own.filter((o) => o.w * o.h > small).reduce((a, o) => a + o.w * Math.max(0, Math.min(o.sill + o.h, th) - o.sill), 0);
        return Math.max(0, sides(s).reduce((a, x) => a + x * th, 0) - cut);
      }
      case 'dado': return run(s) * Q.kitchen.dado;
      case 'wp-bath': return s.sqm + wallRun(s) * Q.waterproofing.upturn + Q.waterproofing.showerWidth * (Q.waterproofing.showerHeight - Q.waterproofing.upturn);
      case 'wp-balcony': return s.sqm + wallRun(s) * Q.waterproofing.balconyUpturn;
      case 'counter-run': return run(s);
      case 'counter-top': return run(s) * Q.kitchen.depth;
      case 'wardrobe': return wardrobeW(s) * (lv >= Q.wardrobes.fullHeightFrom ? H : Q.wardrobes.height / 1000);
      case 'loft': return lv >= Q.wardrobes.fullHeightFrom ? 0 : wardrobeW(s) * (Q.wardrobes.loft / 1000);
      case 'windows': return own.filter((o) => o.kind === 'window' || o.kind === 'kitchenWindow').reduce((a, o) => a + o.w * o.h, 0);
      case 'window-count': return own.filter((o) => o.kind === 'window').length;
      case 'shower-screen': return Q.showerScreen.w * Q.showerScreen.h;
      case 'door': return own.filter((o) => o.kind === s.kind).length;
      case 'main-door': return s.kind === 'passage' ? 1 : 0;
      case 'one': return 1;
      case 'ac': return s.kind === 'living' ? (lv >= Q.ac.from ? 1 : 0) : s.kind !== 'bedroom' ? 0 : lv >= (s.master ? Q.ac.from : Q.ac.allBedroomsFrom) ? 1 : 0;
      case 'points': {
        const p = Q.points[s.kind] as Record<string, number>;
        let n = 0;
        for (const k of Object.keys(p)) if (k !== 'masterExtra') n += p[k];
        return n + (s.master ? p.masterExtra ?? 0 : 0);
      }
      case 'light-points': return (Q.points[s.kind] as Record<string, number>).lights ?? 0;
      case 'fan-points': return (Q.points[s.kind] as Record<string, number>).fans ?? 0;
      case 'exhaust-points': return (Q.points[s.kind] as Record<string, number>).exhaust ?? 0;
      case 'supply-points': return (Q.plumbing as Record<string, { supply: number }>)[s.kind]?.supply ?? 0;
      case 'drain-points': return (Q.plumbing as Record<string, { drain: number }>)[s.kind]?.drain ?? 0;
      default: {
        const u = Q.wardrobes.units[rule.replace('unit:', '')];
        return u && s.kind === u.room && lv >= u.from ? (u.w * u.h) / 1e6 : 0;
      }
    }
  };

  const priced = (id: string) => checkRate(id, input.city);

  const lines = new Map<string, CheckLine>(), bySpace = new Map<string, { section: string; amount: number; kind: ItemKind }[]>();
  // An area or a length in a unit of its kind: square feet and feet by dividing; litres, counts and materials as they are.
  const unitKind = (u: Unit) => (u === 'sqft' || u === 'sqm' ? 'area' : u === 'rft' || u === 'm' ? 'length' : u);
  const inUnitOf = (base: number, u: Unit) => (u === 'sqft' ? base / SQ_FOOT : u === 'rft' ? base / FOOT : base);
  let low = 0, high = 0, offering = 0;
  // The items at a level for a family and a kind of unit, found once a run; and each rate once a run.
  const found = new Map<string, string[]>(), rates = new Map<string, number | null>();
  const rateFor = (x: string) => { if (!rates.has(x)) rates.set(x, priced(x)); return rates.get(x) as number | null; };
  const visit = (slot: Rules['templates']['flat'][number], s: Space | null) => {
    if (!sectionOn(slot.section)) return;
    if (slot.kinds && !slot.kinds.includes(kind)) return;
    if (slot.needs && !sectionOn(slot.needs)) return;
    const lv = Math.min(levelAt(slot.section, s), slot.maxLevel ?? 5);
    const key = [s ? s.id : 'flat', slot.family, slot.qty].join(':');
    const chosen = input.items?.[key];
    const id = chosen && ENTRIES.has(chosen) ? chosen : familyAt(slot.family, lv);
    if (!id) return;
    const base = qty(slot.qty, s, lv);
    if (!(base > 0)) return;
    const e = ENTRIES.get(id) as Entry;
    const rate = priced(id);
    if (rate === null) return;
    const q = round2(inUnitOf(base, e.unit));
    const amount = round2(q * rate);
    lines.set(key, { qty: q, rate, amount });
    if (banded) {
      // The choices at the level: an item of the user's own stands alone; else the family's items named here or usually here.
      const amounts: number[] = [];
      if (chosen && ENTRIES.has(chosen)) amounts.push(amount);
      else {
        const at = `${slot.family}:${lv}:${unitKind(e.unit)}`;
        if (!found.has(at)) {
          const f = FAMILIES.get(slot.family), names = new Set([f?.fixed, ...(f?.levels ?? [])]);
          found.set(at, [...ENTRIES.values()].filter((x) => (x.family === slot.family || names.has(x.id)) && (x.id === id || x.level === lv) && unitKind(x.unit) === unitKind(e.unit)).map((x) => x.id));
        }
        for (const x of found.get(at) as string[]) {
          const r = rateFor(x);
          if (r !== null) amounts.push(round2(round2(inUnitOf(base, (ENTRIES.get(x) as Entry).unit)) * r));
        }
      }
      amounts.sort((a, b) => a - b);
      low += amounts[0]; high += amounts[amounts.length - 1]; if (amounts.length > 1) offering++;
    }
    const where = s ? s.id : 'flat';
    bySpace.set(where, [...(bySpace.get(where) ?? []), { section: slot.section, amount, kind: FAMILIES.get(slot.family)?.kind ?? 'fixed' }]);
  };
  for (const s of spaces) for (const slot of Q.templates[s.kind]) visit(slot, s);
  for (const slot of Q.templates.flat) visit(slot, null);

  // Room by room first, then the sections and the split from the same rows, then the total from the rooms.
  const sections = new Map<string, number>(), split: Record<ItemKind, number> = { fixed: 0, movable: 0, appliance: 0 };
  let total = 0;
  for (const rows of bySpace.values()) {
    let roomTotal = 0;
    for (const row of rows) { roomTotal += row.amount; sections.set(row.section, (sections.get(row.section) ?? 0) + row.amount); split[row.kind] += row.amount; }
    total += roomTotal;
  }
  const rooms = new Map(spaces.map((s) => [s.id, { sqm: s.sqm, len: s.len, wide: s.wide }]));
  let roomsSqm = 0;
  for (const s of spaces) if (s.kind !== 'balcony') roomsSqm += s.wide * s.len;

  // A new house's stages: the structure by the published shares (each the low end plus half the width of its range, over
  // their sum), each floor's slab alike; the finishing as its own rows added up; the outside works and water; movable items.
  const stages = new Map<string, number>();
  if (shell) {
    const sh = Q.house.stages.shares, half = (b: [number, number]) => b[0] + (b[1] - b[0]) / 2;
    const whole = half(sh.foundation) + half(sh.frame) + half(sh.walls), structure = sections.get('structure') ?? 0;
    let finishing = 0, outside = 0;
    for (const rows of bySpace.values()) for (const row of rows) {
      if (row.section === 'outside' || row.section === 'water') outside += row.amount;
      else if (row.section !== 'structure' && row.kind !== 'movable') finishing += row.amount;
    }
    const put = (id: string, x: number) => { if (Math.abs(x) >= 0.005) stages.set(id, x); };
    put('foundation', (structure * half(sh.foundation)) / whole);
    for (let i = 1; i <= shell.floors; i++) put(`slab-${i}`, (structure * half(sh.frame)) / whole / shell.floors);
    put('walls', (structure * half(sh.walls)) / whole);
    put('finishing', finishing);
    put('outside', outside);
    put('movable', split.movable);
  }
  return {
    lines, sections, total, split, rooms, roomsSqm, plannedSqm: carpet - carpet * Q.shares.walls.value, stages, shares,
    ...(banded ? { range: { low, high, lines: offering, of: lines.size } } : {}),
  };
}

/** The city's factor the check's way: the sum of its range against the average of every listed city's sum; 1 for a place not listed. */
function cityOf(id: string | undefined): number {
  const cityList = Q.cities.list, cityAt = cityList.find((c) => c.id === id);
  return cityAt ? ((cityAt.cost[0] + cityAt.cost[1]) * cityList.length) / cityList.reduce((s, c) => s + c.cost[0] + c.cost[1], 0) : 1;
}

/**
 * An item's rate for a city, priced afresh by walking the library (the middle of a range as its low end plus half its
 * width, labour before the material, GST added as a share of the material alone, never of its fixing labour): the second computation of every rate the
 * estimate and the item drawer show. Null when the item, or a part of it, has no rate yet.
 */
export function checkRate(id: string, cityId: string | undefined): number | null {
  const city = cityOf(cityId);
  const middle = (b: [number, number]) => b[0] + (b[1] - b[0]) / 2;
  const unitsIn = (qtyIn: number, from: Unit, to: Unit) => (from === to ? qtyIn : from === 'sqm' && to === 'sqft' ? qtyIn / SQ_FOOT : from === 'sqft' && to === 'sqm' ? qtyIn * SQ_FOOT : NaN);
  // [the material, the labour that fixes it], kept apart so that GST falls on the material only.
  const rateOf = (id: string): [number, number] | null => {
    const e = ENTRIES.get(id) as Entry;
    let labour = 0;
    for (const f of e.fix ?? []) labour += f.n * middle((LABOUR_ITEMS.get(f.id) as { rate: [number, number] }).rate);
    labour *= city;
    let own: number;
    if (e.basis === 'set') {
      own = 0;
      for (const p of e.parts ?? []) { const r = rateOf(p.id); if (r === null) return null; own += r[0] * p.n; labour += r[1] * p.n; }
    } else if (!e.rate) return null;
    else if (e.basis === 'installed') own = (e.pack ? middle(e.rate) / unitsIn(e.pack.qty, e.pack.unit, e.unit) : middle(e.rate)) * city;
    else {
      const each = e.pack ? middle(e.rate) / unitsIn(e.pack.qty, e.pack.unit, e.unit) : middle(e.rate);
      own = e.basis === 'supply' ? each + each * (e.wastage ?? 0) : each;
    }
    return [own, labour];
  };
  if (!ENTRIES.has(id)) return null;
  const r = rateOf(id);
  return r === null ? null : round2((ENTRIES.get(id)?.gst === 'extra' ? r[0] + (r[0] * Q.gst.pct) / 100 : r[0]) + r[1]);
}
