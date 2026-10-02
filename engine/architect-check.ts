/**
 * Independent second computation of the architect's estimate (CLAUDE.md), written apart from architect.ts on purpose:
 * the rooms from one scale factor on the reference areas, each room's breadth before its length, walls as four sides,
 * a foot as 0.3048 m (dividing, where architect.ts multiplies), the library priced by walking it afresh (the middle of
 * a range as its low end plus half its width, the city's factor from the sums of the ranges), and the total added up
 * room by room before the sections. architect.ts shows no figure unless both agree.
 */
import RULES from './data/architect.json';
import { ENTRIES, FAMILIES, LABOUR_ITEMS, type Entry, type Unit } from './library';
import type { ArchitectInput, Rules, RoomKind } from './architect';

export interface CheckLine { qty: number; rate: number; amount: number }
export interface ArchitectCheck { lines: Map<string, CheckLine>; sections: Map<string, number>; total: number }

const Q = RULES as unknown as Rules;
const FOOT = 0.3048, SQ_FOOT = FOOT * FOOT;
const round2 = (x: number) => Math.round(x * 100) / 100;

interface Space { id: string; kind: RoomKind; master: boolean; attached: boolean; sqm: number; len: number; wide: number }
interface Hole { w: number; h: number; sill: number; door: boolean; owner: string; other: string | null; kind: string }

export function architectCheck(input: ArchitectInput): ArchitectCheck {
  const kind = input.kind as 'renovate' | 'interiors', level = input.level as number;
  const carpet = input.areaUnit === 'sqm' ? (input.area as number) : (input.area as number) * SQ_FOOT;
  const H = input.heightM ?? Q.height.m;
  const cityList = Q.cities.list, cityAt = cityList.find((c) => c.id === input.city);
  const city = cityAt ? ((cityAt.cost[0] + cityAt.cost[1]) * cityList.length) / cityList.reduce((s, c) => s + c.cost[0] + c.cost[1], 0) : 1;

  // The rooms: one scale factor on the reference areas; the breadth first, then the length.
  const prog = Q.programmes[input.bhk as keyof Rules['programmes']];
  const scale = (carpet * (1 - Q.shares.walls.value - Q.shares.passage.value)) / prog.rooms.map((r) => r.ref).reduce((a, b) => a + b, 0);
  const spaces: Space[] = [];
  const counter: Record<string, number> = {};
  const make = (id: string, k: RoomKind, sqm: number, master = false, attached = false) => {
    const wide = Math.sqrt(sqm / Q.aspect[k]);
    spaces.push({ id, kind: k, master, attached, sqm, len: sqm / wide, wide });
  };
  for (const r of prog.rooms) {
    counter[r.kind] = (counter[r.kind] ?? 0) + 1;
    make(r.kind === 'bedroom' || r.kind === 'bath' ? `${r.kind}-${counter[r.kind]}` : r.kind, r.kind, r.ref * scale, !!r.master, !!r.attached);
  }
  make('passage', 'passage', Q.shares.passage.value * carpet);
  if (prog.balcony > 0) make('balcony', 'balcony', prog.balcony * SQ_FOOT);
  const exists = (id: string) => spaces.some((s) => s.id === id);
  const masterId = spaces.find((s) => s.master)?.id;

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
    if (s.kind === 'bath') { put('bath', s.id, s.attached && masterId ? masterId : 'passage'); put('ventilator', s.id, null); }
  }

  const sectionOn = (sec: string) => input.sections?.[sec] ?? Q.kinds[kind].on.includes(sec);
  const sliding = (sec: string) => !!Q.sections.find((x) => x.id === sec)?.slider;
  const levelAt = (sec: string) => (sliding(sec) ? input.sliders?.[sec] ?? level : level);
  const sides = (s: Space) => [s.len, s.wide, s.len, s.wide];
  const wallRun = (s: Space) => sides(s).reduce((a, b) => a + b, 0);
  const tile = () => {
    if (!sectionOn('bathrooms')) return Math.min(H, Q.tileHeights.existing / 1000);
    const v = Q.tileHeights.mm[levelAt('bathrooms') - 1];
    return v === 'ceiling' ? H : Math.min(H, v / 1000);
  };
  const run = (s: Space) => s.wide + s.len - Q.kitchen.depth;
  const feature = (s: Space) => {
    if (!sectionOn('walls')) return 0;
    const lv = levelAt('walls');
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
        const roof = s.kind === 'bath' && sectionOn('bathrooms') && familyAt('bath-ceiling', levelAt('bathrooms')) ? 0 : s.sqm;
        if (s.kind === 'bath') {
          const th = tile();
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
        const th = tile();
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

  // The library priced afresh.
  const middle = (b: [number, number]) => b[0] + (b[1] - b[0]) / 2;
  const unitsIn = (qtyIn: number, from: Unit, to: Unit) => (from === to ? qtyIn : from === 'sqm' && to === 'sqft' ? qtyIn / SQ_FOOT : from === 'sqft' && to === 'sqm' ? qtyIn * SQ_FOOT : NaN);
  const rateOf = (id: string): number | null => {
    const e = ENTRIES.get(id) as Entry;
    let labour = 0;
    for (const f of e.fix ?? []) labour += f.n * middle((LABOUR_ITEMS.get(f.id) as { rate: [number, number] }).rate);
    labour *= city;
    let own: number;
    if (e.basis === 'set') {
      own = 0;
      for (const p of e.parts ?? []) { const r = rateOf(p.id); if (r === null) return null; own += r * p.n; }
    } else if (!e.rate) return null;
    else if (e.basis === 'installed') own = middle(e.rate) * city;
    else {
      const each = e.pack ? middle(e.rate) / unitsIn(e.pack.qty, e.pack.unit, e.unit) : middle(e.rate);
      own = e.basis === 'supply' ? each + each * (e.wastage ?? 0) : each;
    }
    return own + labour;
  };
  const priced = (id: string) => { const r = rateOf(id); return r === null ? null : round2(ENTRIES.get(id)?.gst === 'extra' ? r + (r * Q.gst.pct) / 100 : r); };

  const lines = new Map<string, CheckLine>(), bySpace = new Map<string, { section: string; amount: number }[]>();
  const visit = (slot: Rules['templates']['flat'][number], s: Space | null) => {
    if (!sectionOn(slot.section)) return;
    if (slot.kinds && !slot.kinds.includes(kind)) return;
    if (slot.needs && !sectionOn(slot.needs)) return;
    const lv = Math.min(levelAt(slot.section), slot.maxLevel ?? 5);
    const key = [s ? s.id : 'flat', slot.family, slot.qty].join(':');
    const chosen = input.items?.[key];
    const id = chosen && ENTRIES.has(chosen) ? chosen : familyAt(slot.family, lv);
    if (!id) return;
    const base = qty(slot.qty, s, lv);
    if (!(base > 0)) return;
    const e = ENTRIES.get(id) as Entry;
    const isArea = ['sqft', 'sqm'].includes(e.unit), isLength = ['rft', 'm'].includes(e.unit);
    const inUnit = isArea ? (e.unit === 'sqft' ? base / SQ_FOOT : base) : isLength ? (e.unit === 'rft' ? base / FOOT : base) : base;
    const rate = priced(id);
    if (rate === null) return;
    const q = round2(inUnit);
    const amount = round2(q * rate);
    lines.set(key, { qty: q, rate, amount });
    const where = s ? s.id : 'flat';
    bySpace.set(where, [...(bySpace.get(where) ?? []), { section: slot.section, amount }]);
  };
  for (const s of spaces) for (const slot of Q.templates[s.kind]) visit(slot, s);
  for (const slot of Q.templates.flat) visit(slot, null);

  // Room by room first, then the sections from the same rows, then the total from the rooms.
  const sections = new Map<string, number>();
  let total = 0;
  for (const rows of bySpace.values()) {
    let roomTotal = 0;
    for (const row of rows) { roomTotal += row.amount; sections.set(row.section, (sections.get(row.section) ?? 0) + row.amount); }
    total += roomTotal;
  }
  return { lines, sections, total };
}
