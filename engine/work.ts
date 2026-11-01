/**
 * The report's one Make it work (OR11d; D-UX-249 to D-UX-252, the owner's yes to OR11b's mock-up): what holds the loan
 * back, then each way that makes it work alone, the ways that keep the loan as asked first and the ways that change the
 * loan after, then the ways that do not reach, each with the levels it leaves short. Every way is the whole report run
 * again (engine/report.ts) with one change, so each figure keeps the report's second computation; each carries the
 * figures "Use this" writes (`change`), and a way that needs an answer the borrower has not given (the plant's sales at
 * full running, the larger plant's cost) says so and stays provisional (D-UX-252 (1)).
 *
 * Keep the loan: typed sales, the least higher sales (engine/viable.ts) and the least of them with a repayment longer by
 * whole years, the lender's to give (the plant they need read against the busiest year at the most use a plan takes,
 * D-UX-252 (2)); by the drivers, the first year's use of the capacity alone (the later years as typed, none below it),
 * else more use in every year, else one line that more use cannot carry it, and then the price and a larger plant, at the
 * use as typed when more use can reach and at the most use in every year when it cannot; faster growth; the promoters'
 * money kept in the business as cash at the start; and a better margin, lower variable costs, shown however far it goes
 * (D-UX-252 (4)). Fixed costs are no way (D-UX-250 (4)). Change the loan: the fix beside the miss (engine/fix.ts), the
 * typed repayment first, then the lender's terms and a smaller working-capital limit when one alone meets every level.
 * The rest do not reach, each with its reason (D-UX-252 (3)). The security cover is set aside: the collateral meets it.
 * Pure, no DOM.
 */
import { diagnose, LEVELS, termMonths, type Diagnosis, type Levels, type RatioCheck, type RatioId } from './ratios';
import { costsOf, projectReport, type Report, type ReportInput } from './report';
import type { Blocked, Needs } from './dscr';
import { fixOf } from './fix';
import { makeViable, type Viability } from './viable';
import { AS_TYPED, GRID, salesLimit, withLevers } from './plan';

/** What holds a loan back: the cause each benchmark ratio's miss names (D-UX-249 (a)). */
export type Cause = 'earns' | 'cushion' | 'own' | 'assets';
export const CAUSE_OF: Partial<Record<RatioId, Cause>> = {
  dscrLowest: 'earns', interestCover: 'earns', dscrAverage: 'earns', currentRatio: 'cushion', tolTnw: 'own', debtEquity: 'own', facr: 'assets',
};
const CAUSES: Cause[] = ['earns', 'cushion', 'own', 'assets'];
export interface Held { cause: Cause; checks: RatioCheck[] }

export type WayId = 'sales' | 'salesLonger' | 'use1' | 'use' | 'price' | 'capacity' | 'growth' | 'cash' | 'variable' | 'fix' | 'wc' | 'moratorium' | 'instalments' | 'loan';
/** The figures a way writes into the answers, by the report's own inputs: sales (typed, or today's in an expansion), the
 * use by year, the one price or the capacity, or each product's price and units a month, the growth a year, variable
 * costs (%), the promoters' money kept as cash at the start, the machinery's cost (the larger plant's, when given), and
 * the loan's amount, instalments, holiday and the working-capital limit. */
export interface Change {
  sales?: number; utilisationPct?: number[]; price?: number; capacity?: number; products?: { unitsMonth: number; price: number }[];
  salesGrowthPct?: number; priceGrowthPct?: number; variablePct?: number; cashAtStart?: number; machinery?: number;
  amount?: number; instalments?: number; moratoriumMonths?: number; wcLimit?: number;
}
/** A question a way leaves open: the plant's sales a year at full running, which typed sales do not give, against the
 * least it needs (`within` once given); or the larger plant's cost of machinery and building, worked at today's cost of
 * the project until it is given. */
export type Ask = { id: 'plantSales'; need: number; given?: number; within?: boolean } | { id: 'plantCost'; given?: number };
export interface WayYear { fy: string; months: number; sales: number; use?: number }
export interface Way {
  id: WayId; by: 'borrower' | 'lender';
  change: Change;
  /** The levels missed as typed that it meets; those missed with it (the security cover aside), none when it reaches. */
  fixes: RatioId[]; still: RatioId[];
  /** Cash still running out with it: the promoters' money more it would need at the start. */
  cashNeed?: number;
  ask?: Ask;
  /** By the drivers, the price or the plant worked with every year at the most use a plan takes. */
  at85?: boolean;
  /** The promoters' money more it takes (a smaller loan, the fix, the larger plant's cost). */
  promotersMore?: number;
  years: WayYear[];
}
export interface Work {
  diagnosis: Diagnosis;
  /** The levels missed as typed, the security cover aside; `meets` when none is. */
  missed: RatioId[]; meets: boolean;
  /** The misses under their causes, earnings first; the average DSCR last within them (D-UX-250 (1)). */
  held: Held[];
  /** The picture year by year: the DSCR where the year is counted, and the interest cover. */
  years: { fy: string; months: number; dscr?: number; interestCover?: number }[];
  cash?: Report['cashShort'];
  keep: Way[]; change: Way[]; not: Way[];
  /** By the drivers, when more use of the capacity cannot carry the loan even at the most a plan takes in every year: the
   * levels left short there, and the use it would need at the same price (engine/viable.ts). */
  useCannot?: { still: RatioId[]; needed?: number[] };
}
export interface WorkInput {
  levels?: Levels;
  /** Typed sales: what the plant can sell in a year running full, if the borrower gives it. */
  plantSales?: number;
  /** The larger plant's cost of machinery and building in all, if given: the machinery takes what it adds. */
  plantCost?: number;
}

const EPS = 1e-6;
const isReport = (r: ReturnType<typeof projectReport>): r is Report => !('needs' in r) && !('blocked' in r);
const up = (v: number, places: number) => Math.ceil(v * 10 ** places - EPS) / 10 ** places;

/** The machinery's cost with a larger plant costing `plantCost` in machinery and building: the building as typed, the
 * machinery the rest, never below nil (the page's question, D-UX-251 (b)). */
export const plantMachinery = (x: ReportInput, plantCost: number) => Math.max(0, plantCost - (x.cost.building ?? 0));

/** The report's inputs with a way's change. */
export function withChange(x: ReportInput, c: Change): ReportInput {
  const y: ReportInput = { ...x, loan: { ...x.loan }, cost: { ...x.cost } };
  for (const k of ['sales', 'utilisationPct', 'price', 'capacity', 'salesGrowthPct', 'priceGrowthPct', 'variablePct', 'cashAtStart', 'wcLimit'] as const)
    if (c[k] !== undefined) (y as unknown as Record<string, unknown>)[k] = c[k];
  if (c.products) y.products = (x.products ?? []).map((p, i) => ({ ...p, ...c.products?.[i] }));
  if (c.machinery !== undefined) y.cost.machinery = c.machinery;
  if (c.amount !== undefined) y.loan.amount = c.amount;
  if (c.instalments !== undefined) y.loan.instalments = c.instalments;
  if (c.moratoriumMonths !== undefined) y.loan.moratoriumMonths = c.moratoriumMonths;
  return y;
}

/** The least whole k in [a, b] at which `ok` holds, `ok` rising with k; undefined when it fails at b. */
function least(a: number, b: number, ok: (k: number) => boolean): number | undefined {
  if (b < a || !ok(b)) return undefined;
  if (ok(a)) return a;
  while (b - a > 1) {
    const m = Math.floor((a + b) / 2);
    if (ok(m)) b = m; else a = m;
  }
  return b;
}

interface Run { r: Report; misses: RatioId[] }

/** `o.levels`: the benchmarks the user changed (BEN1). */
export function makeWork(x: ReportInput, o: WorkInput = {}): Work | Needs | Blocked {
  const base = projectReport(x);
  if (!isReport(base)) return base;
  const lv = o.levels, diagnosis = diagnose(base, x, 'fresh', lv);
  const set = (ids: RatioId[]) => ids.filter((id) => id !== 'securityCover');
  const missed = set(diagnosis.misses);
  const memo = new Map<string, Run | undefined>();
  const run = (y: ReportInput): Run | undefined => {
    const key = JSON.stringify(y);
    if (memo.has(key)) return memo.get(key);
    const r = projectReport(y), u = isReport(r) ? { r, misses: set(diagnose(r, y, 'fresh', lv).misses) } : undefined;
    memo.set(key, u);
    return u;
  };
  const meetsAll = (u?: Run) => !!u && !u.misses.length;
  const yearsOf = (r: Report): WayYear[] => r.years.map((k) => ({ fy: k.fy, months: k.months, sales: k.sales, ...(k.utilisationPct !== undefined ? { use: k.utilisationPct } : {}) }));
  const wayOf = (id: WayId, change: Change, u: Run, extra: Partial<Way> = {}): Way => ({
    id, by: id === 'fix' || id === 'wc' || id === 'loan' ? 'borrower' : id === 'moratorium' || id === 'instalments' || id === 'salesLonger' ? 'lender' : 'borrower',
    change, fixes: missed.filter((m) => !u.misses.includes(m)), still: u.misses, ...(u.r.cashShort ? { cashNeed: u.r.cashShort.need } : {}), ...extra, years: yearsOf(u.r),
  });
  /** One lever from a to b (b its farthest): the least k that meets every level missed, else the least that meets every
   * level it can reach there; none when it reaches none. `cash`: cash running out is a level of its own (the cash way). */
  const lever = (a: number, b: number, at: (k: number) => ReportInput, cash = false) => {
    const okCash = (u?: Run) => !cash || !u?.r.cashShort;
    const far = run(at(b));
    if (!far) return undefined;
    const all = least(a, b, (k) => { const u = run(at(k)); return meetsAll(u) && okCash(u); });
    if (all !== undefined) return { k: all, u: run(at(all)) as Run, reaches: true };
    const target = missed.filter((m) => !far.misses.includes(m));
    if (!target.length && !(cash && base.cashShort && !far.r.cashShort)) return { k: b, u: far, reaches: false, none: true };
    const k = least(a, b, (k) => { const u = run(at(k)); return !!u && target.every((m) => !u.misses.includes(m)) && okCash(u); }) ?? b;
    return { k, u: run(at(k)) as Run, reaches: false };
  };
  const keep: Way[] = [], change: Way[] = [], not: Way[] = [];
  const out: Work = {
    diagnosis, missed, meets: !missed.length,
    held: CAUSES.map((cause) => ({ cause, checks: diagnosis.checks.filter((c) => c.meets === false && CAUSE_OF[c.id] === cause).sort((p, q) => (p.fy ? 0 : 1) - (q.fy ? 0 : 1)) }))
      .filter((h) => h.checks.length),
    years: base.years.map((k) => ({ fy: k.fy, months: k.months, ...(k.counted && k.dscr !== undefined ? { dscr: k.dscr } : {}), ...(k.interestCover !== undefined ? { interestCover: k.interestCover } : {}) })),
    ...(base.cashShort ? { cash: base.cashShort } : {}), keep, change, not,
  };
  const most = LEVELS.capacity.mostUsePct, typed = x.salesBy === 'typed', perYear = x.loan.frequency === 'quarterly' ? 4 : 12;
  const room = LEVELS.term.longestMonths - termMonths(x);
  // The cash way also mends cash running out when every ratio meets (D-UX-247).
  if (!missed.length && !base.cashShort) return out;
  const place = (w: Way, reaches: boolean, to: Way[]) => (reaches ? to : not).push(w);

  const v = missed.length ? makeViable(x, lv) as Viability : undefined;
  if (v) {
    // ---- Keep the loan ----
    if (typed) {
      const need = (r: Report) => Math.ceil(Math.max(...r.years.map((k) => k.sales)) / (most / 100) - EPS);
      const plant = (r: Report): Ask => {
        const n = need(r), g = o.plantSales;
        return { id: 'plantSales', need: n, ...(g !== undefined ? { given: g, within: g >= n } : {}) };
      };
      const at = (k: number) => withLevers(x, { ...AS_TYPED, sales: k });
      const s = v.sales, sU = s ? run(at(s.tenths)) : undefined;
      if (s && sU) place(wayOf('sales', { sales: at(s.tenths).sales }, sU, { ask: plant(sU.r) }), meetsAll(sU), keep);
      // Some more sales with a repayment longer by whole years (D-UX-249 (b)): the least sales for each, the least of
      // them kept, on a tie the shorter repayment; shown only when it asks less than higher sales alone.
      const n0 = x.loan.instalments as number, cap = s && meetsAll(sU) ? s.tenths : 99 * GRID;
      let best: { k: number; n: number } | undefined;
      for (let y = 1; y <= 5 && y * 12 <= room; y++) {
        const n = y * perYear, atN = (k: number) => withLevers(x, { ...AS_TYPED, sales: k, instalments: n });
        const hi = best ? best.k - 1 : cap;
        if (hi < 0 || !meetsAll(run(atN(hi)))) continue;
        best = { k: least(0, hi, (k) => meetsAll(run(atN(k)))) as number, n };
      }
      if (best && (!meetsAll(sU) || best.k < (s?.tenths ?? Infinity))) {
        const y = withLevers(x, { ...AS_TYPED, sales: best.k, instalments: best.n }), u = run(y) as Run;
        keep.push(wayOf('salesLonger', { sales: y.sales, instalments: n0 + best.n }, u, { ask: plant(u.r) }));
      }
      const g0 = x.salesGrowthPct as number, g = lever(Math.round(g0 * 10), 1000, (k) => ({ ...x, salesGrowthPct: k / 10 }));
      if (g) place(wayOf('growth', { salesGrowthPct: g.k / 10 }, g.u), g.reaches, keep);
    } else {
      const u0 = x.utilisationPct as number[];
      const firstUse = (k: number) => u0.map((p, i) => (i === 0 ? k / 10 : Math.min(most, Math.max(p, k / 10))));
      let reached = false;
      if (u0[0] < most) {
        const f = lever(Math.round(u0[0] * 10), most * 10, (k) => ({ ...x, utilisationPct: firstUse(k) }));
        if (f?.reaches) { keep.push(wayOf('use1', { utilisationPct: firstUse(f.k) }, f.u)); reached = true; }
      }
      const lim = salesLimit(x) ?? 0;
      if (!reached && lim > 0) {
        const at = (k: number) => withLevers(x, { ...AS_TYPED, sales: k }), f = lever(0, lim, at);
        if (f?.reaches) { keep.push(wayOf('use', { utilisationPct: at(f.k).utilisationPct }, f.u)); reached = true; }
      }
      const x85: ReportInput = reached ? x : { ...x, utilisationPct: u0.map(() => most) };
      if (!reached) {
        const u = run(x85);
        out.useCannot = { still: u?.misses ?? missed, ...(v.sales?.use ? { needed: v.sales.use.needed } : {}) };
      }
      const use85 = reached ? {} : { utilisationPct: x85.utilisationPct as number[] }, at85 = !reached;
      // The price: the one price to the paise, or every product's price by the same share (tenths of a per cent).
      const prods = x.products;
      if (prods && prods.length > 1) {
        const at = (k: number): ReportInput => ({ ...x85, products: prods.map((p) => ({ ...p, price: up((p.price as number) * (1 + k / GRID), 2) })) });
        const f = lever(0, 9 * GRID, at);
        if (f) place(wayOf('price', { ...use85, products: (at(f.k).products ?? []).map((p) => ({ unitsMonth: p.unitsMonth as number, price: p.price as number })) }, f.u, { at85 }), f.reaches, keep);
      } else {
        const p0 = (prods ? prods[0].price : x.price) as number, at = (k: number): ReportInput => (prods ? { ...x85, products: [{ ...prods[0], price: k / 100 }] } : { ...x85, price: k / 100 });
        const f = lever(Math.round(p0 * 100), Math.round(p0 * 1000), at);
        if (f) place(wayOf('price', { ...use85, ...(prods ? { products: [{ unitsMonth: prods[0].unitsMonth as number, price: f.k / 100 }] } : { price: f.k / 100 }) }, f.u, { at85 }), f.reaches, keep);
      }
      // A larger plant: its capacity, worked at today's cost of the project until its cost is given (D-UX-245 (4)).
      const given = o.plantCost, mach = given !== undefined ? plantMachinery(x, given) : undefined;
      const xc: ReportInput = mach !== undefined ? { ...x85, cost: { ...x.cost, machinery: mach } } : x85;
      const ask: Ask = { id: 'plantCost', ...(given !== undefined ? { given } : {}) }, costed = mach !== undefined ? { machinery: mach } : {};
      const more = (u: Run) => u.r.finance.promoter + u.r.finance.kept - base.finance.promoter - base.finance.kept;
      if (prods && prods.length > 1) {
        const at = (k: number): ReportInput => ({ ...xc, products: prods.map((p) => ({ ...p, unitsMonth: up((p.unitsMonth as number) * (1 + k / GRID), 0) })) });
        const f = lever(0, 19 * GRID, at);
        if (f) place(wayOf('capacity', { ...use85, ...costed, products: (at(f.k).products ?? []).map((p) => ({ unitsMonth: p.unitsMonth as number, price: p.price as number })) }, f.u, { at85, ask, promotersMore: more(f.u) }), f.reaches, keep);
      } else {
        const c0 = (prods ? prods[0].unitsMonth : x.capacity) as number, at = (k: number): ReportInput => (prods ? { ...xc, products: [{ ...prods[0], unitsMonth: k }] } : { ...xc, capacity: k });
        const f = lever(Math.ceil(c0), Math.ceil(c0 * 20), at);
        if (f) place(wayOf('capacity', { ...use85, ...costed, ...(prods ? { products: [{ unitsMonth: f.k, price: prods[0].price as number }] } : { capacity: f.k }) }, f.u, { at85, ask, promotersMore: more(f.u) }), f.reaches, keep);
      }
      if (x.salesBy !== 'expansion') {
        const g0 = x.priceGrowthPct as number, g = lever(Math.round(g0 * 10), 1000, (k) => ({ ...x, priceGrowthPct: k / 10 }));
        if (g) place(wayOf('growth', { priceGrowthPct: g.k / 10 }, g.u), g.reaches, keep);
      }
    }
  }
  // The promoters' money kept in the business as cash at the start, in whole Rs. 1,000: it mends the cushion, the own
  // money and the cash, never the earnings (D-UX-249 (d)).
  const k0 = (x.cashAtStart ?? 0) / 1000, cashMost = Math.ceil(Math.max(base.projectCost, 1e7) * 10 / 1000);
  const c = lever(Math.floor(k0), Math.floor(k0) + cashMost, (k) => ({ ...x, cashAtStart: k * 1000 }), true);
  if (c && !c.none) place(wayOf('cash', { cashAtStart: c.k * 1000 }, c.u, { promotersMore: c.k * 1000 - (x.cashAtStart ?? 0) }), c.reaches, keep);
  else if (c) not.push(wayOf('cash', { cashAtStart: (x.cashAtStart ?? 0) + base.projectCost }, c.u));
  if (!v) return out;
  // A better margin: variable costs lower by tenths of a point, the same sales (D-UX-250 (3)).
  const v0 = costsOf(x).variablePct as number, vp = (k: number) => Math.round((v0 - k / 10) * 1e4) / 1e4;
  const vm = lever(0, Math.floor(v0 * 10), (k) => ({ ...x, variablePct: vp(k) }));
  if (vm && !vm.none) place(wayOf('variable', { variablePct: vp(vm.k) }, vm.u), vm.reaches, keep);

  // ---- Change the loan ----
  const f = fixOf(x, lv);
  const fixes = (f?.fixes ?? []).slice().sort((p, q) => q.instalments.needed - p.instalments.needed);
  for (const k of fixes) {
    const y = withLevers(x, k.levers), u = run(y) as Run;
    change.push(wayOf('fix', { amount: y.loan.amount, ...(k.instalments.needed !== k.instalments.now ? { instalments: k.instalments.needed } : {}) }, u, { promotersMore: k.loan.more }));
  }
  if (!v) return out;
  const alone = (id: WayId, c: Change, more?: number) => {
    const u = run(withChange(x, c));
    if (u) place(wayOf(id, c, u, more !== undefined ? { promotersMore: more } : {}), meetsAll(u), change);
  };
  if (v.moratorium) alone('moratorium', { moratoriumMonths: v.moratorium.needed });
  if (v.instalments) alone('instalments', { instalments: v.instalments.needed });
  if (v.wc) alone('wc', { wcLimit: v.wc.largest }, v.wc.more);
  if (!fixes.length && v.loan) alone('loan', { amount: v.loan.largest }, v.loan.more);
  // The lender's terms and a smaller limit that reach none of the levels missed: their farthest, for the line that says so.
  const far = (id: WayId, c: Change) => { const u = run(withChange(x, c)); if (u) not.push(wayOf(id, c, u)); };
  const n0 = x.loan.instalments as number, m0 = x.loan.moratoriumMonths as number, step = 12 / perYear;
  if (!v.moratorium && room > 0) far('moratorium', { moratoriumMonths: m0 + room });
  if (!v.instalments && room >= step) far('instalments', { instalments: n0 + Math.floor(room / step) });
  if (!v.wc && (x.wcLimit as number) > 0) far('wc', { wcLimit: 0 });
  return out;
}
