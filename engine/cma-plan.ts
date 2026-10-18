/**
 * Make it viable on the CMA (D-UX-52, MV4, D-UX-56): the lender's levels (D-UX-51), a fresh or enhanced loan's or a
 * renewal's as the borrower says, read against the estimate's and the projection's figures, each ratio in its worse year,
 * with the rupees a missed one needs (as engine/ratios.ts does for the project report); then the levers, each alone (the
 * board) and together (the plan), in D-UX-52's order:
 * - the promoters' loans kept in the business till the bank is repaid, counted as the owners' funds (money already in);
 * - capital the promoters bring by the estimate's year end, cutting the bank's working-capital borrowing (past nil, it is
 *   cash), up to the most they can bring in all (one optional figure; without it the plan assumes none);
 * - sales higher in the projection: materials and other direct costs in step, stock, debtors and creditors at the same
 *   days, tax at the projection's own rate, the bank's borrowing taking up the difference (past nil, cash);
 * - the lender's: every term loan's remaining repayment over more months, equal instalments assumed, what remains at most
 *   the longest term (180 months): less falls due within 12 months, and what is not repaid in the projection stays as
 *   loan, the bank's borrowing less by as much;
 * - the collateral last, which moves only the security cover.
 * Interest stays as typed throughout. Each change is written into the typed figures (`withCmaLevers`), every balance sheet
 * still balancing, and the whole CMA (engine/cma.ts, with its second computation) runs again at every trial. A step never
 * trades a level already met for another. Pure, no DOM.
 */
import DATA from './data/ratios.json';
import { cma, type Cma, type CmaInput, type CmaYear, type Figures } from './cma';
import { checkHead, levelFor, type Case, type Levels, type RatioCheck, type RatioId, type Shortfall } from './ratios';
import type { Blocked, Needs } from './dscr';

const RATIOS = DATA.ratios;
const EPS = 1e-9;
const isCma = (r: Cma | Needs | Blocked): r is Cma => !('needs' in r) && !('blocked' in r);
/** The estimate's and the projection's years: those a lender reads the levels against. */
const ahead = (r: Cma) => r.years.filter((y) => y.kind !== 'audited');
export const levelOf = (id: RatioId, c: Case, lv?: Levels) => levelFor(id, c, lv);

export interface CmaDiagnosis { checks: RatioCheck[]; misses: RatioId[] }

/** Worked twice: `a` from the ratio's parts, `b` by another route; withheld when they differ by more than a paisa. */
const twice = (a: number, b: number | undefined, of: Shortfall) => (b === undefined || Math.abs(a - b) <= 0.01 ? { short: { amount: a, of } } : {});

/** The rupees a missed ratio needs in its worse year `y` (for the average DSCR, over both years), the rest as it is. */
function shortfall(id: RatioId, level: number, ys: CmaYear[], y: CmaYear | undefined) {
  if (id === 'dscrAverage') {
    const used = ys.filter((k) => k.dscr !== undefined), service = used.reduce((s, k) => s + (k.service as number), 0);
    return twice(level * service - used.reduce((s, k) => s + k.available, 0), used.reduce((s, k) => s + level * (k.service as number) - k.available, 0), 'cash');
  }
  if (!y) return {};
  switch (id) {
    case 'dscrLowest': return twice(level * (y.service as number) - y.available, y.dscr === undefined ? undefined : (level - y.dscr) * (y.service as number), 'cash');
    case 'interestCover': return twice(level * y.interest - y.pbdit, y.interestCover === undefined ? undefined : (level - y.interestCover) * y.interest, 'pbdit');
    case 'currentRatio': return twice(level * y.currentLiabilities - y.currentAssets, y.currentRatio === undefined ? undefined : (level - y.currentRatio) * y.currentLiabilities, 'currentAssets');
    // Net worth at or below nil has no ratio: the second route reads the outside liabilities off the balance sheet's total.
    case 'tolTnw': return twice(y.outside / level - y.netWorth, (y.assets - y.netWorth) / level - y.netWorth, 'netWorth');
    case 'debtEquity': return twice(y.termLiabilities / level - y.netWorth, y.debtEquity === undefined ? undefined : y.netWorth * (y.debtEquity / level - 1), 'netWorth');
    case 'facr': return twice(level * y.f.termLoans - y.f.netBlock, y.facr === undefined ? undefined : (level - y.facr) * y.f.termLoans, 'fixedAssets');
    case 'securityCover': return twice(level * y.secured - y.security, y.securityCover === undefined ? undefined : (level - y.securityCover) * y.secured, 'security');
  }
  return {};
}

type Read = 'currentRatio' | 'tolTnw' | 'debtEquity' | 'interestCover' | 'facr' | 'securityCover';
const NA: Partial<Record<RatioId, string>> = {
  dscrAverage: 'No term loan falls due in these years', dscrLowest: 'No term loan falls due in these years',
  interestCover: 'No interest to pay in these years', facr: 'No term loan in these years', securityCover: 'Nothing borrowed to secure',
};

/** Each ratio against its level `c` (or the user's, `lv`, BEN1) in its worse year of the estimate and the projection. */
export function cmaDiagnose(r: Cma, x: CmaInput, c: Case, lv?: Levels): CmaDiagnosis {
  const ys = ahead(r), checks: RatioCheck[] = [];
  const push = (k: RatioCheck) => checks.push(k.meets === false ? { ...k, ...shortfall(k.id, k.level, ys, ys.find((y) => y.fy === k.fy)) } : k);
  const meets = (v: number, level: number, at: 'least' | 'most') => (at === 'least' ? v >= level - EPS : v <= level + EPS);
  for (const d of RATIOS) {
    const id = d.id as RatioId, base: RatioCheck = checkHead(id, c, lv), { at, level } = base;
    if (id === 'dscrAverage' || id === 'dscrLowest') {
      const used = ys.filter((y) => y.dscr !== undefined);
      if (!used.length) { push({ ...base, na: NA[id] }); continue; }
      if (id === 'dscrAverage') {
        const v = used.reduce((s, y) => s + y.available, 0) / used.reduce((s, y) => s + (y.service as number), 0);
        push({ ...base, worst: v, meets: meets(v, level, at) });
      } else {
        const w = used.reduce((a, y) => ((y.dscr as number) < (a.dscr as number) ? y : a));
        push({ ...base, worst: w.dscr, fy: w.fy, meets: meets(w.dscr as number, level, at) });
      }
      continue;
    }
    if (id === 'tolTnw' || id === 'debtEquity') {
      const sunk = ys.find((y) => y.netWorth <= 0);
      if (sunk) { push({ ...base, fy: sunk.fy, meets: false, why: `net worth is at or below nil in ${sunk.fy}` }); continue; }
    }
    if (id === 'securityCover' && x.collateral === undefined) {
      // No collateral typed (as the report, D-UX-93): the business's own assets may meet the level alone, read once; short of
      // it, the cover waits for the collateral's value. cmaCollateralNeeded() is its second computation (0 when it meets).
      const own = ys.filter((y) => y.securityCover !== undefined && Number.isFinite(y.securityCover));
      const w = own.length ? own.reduce((a, y) => ((y.securityCover as number) < (a.securityCover as number) ? y : a)) : undefined;
      push(w && meets(w.securityCover as number, level, at) ? { ...base, worst: w.securityCover, fy: w.fy, meets: true, own: true } : base);
      continue;
    }
    let w: CmaYear | undefined;
    for (const y of ys) {
      const v = y[id as Read];
      if (v !== undefined && Number.isFinite(v) && (!w || (at === 'least' ? v < (w[id as Read] as number) : v > (w[id as Read] as number)))) w = y;
    }
    push(w ? { ...base, worst: w[id as Read], fy: w.fy, meets: meets(w[id as Read] as number, level, at) } : { ...base, ...(NA[id] ? { na: NA[id] } : {}) });
  }
  return { checks, misses: checks.filter((k) => k.meets === false).map((k) => k.id) };
}

/** The collateral's market value, to the rupee, whose realisable sale value brings the security cover to its level in both
 * years (0 if none is needed): in closed form, then checked by the CMA itself with it, and a rupee less missing. */
export function cmaCollateralNeeded(r: Cma, x: CmaInput, c: Case, lv?: Levels): number | undefined {
  const level = levelOf('securityCover', c, lv), pct = DATA.collateral.rsvPct, rsvNow = ((x.collateral ?? 0) * pct) / 100;
  const need = Math.max(0, ...ahead(r).filter((y) => y.secured > EPS).map((y) => level * y.secured - (y.security - rsvNow)));
  if (need <= EPS) return 0;
  const mv = Math.ceil((need * 100) / pct - 1e-6);
  const cover = (m: number) => {
    const t = cma({ ...x, collateral: m });
    return isCma(t) ? Math.min(...ahead(t).filter((y) => y.securityCover !== undefined).map((y) => y.securityCover as number)) : NaN;
  };
  for (const m of [mv, mv + 1]) if (cover(m) >= level - EPS && !(cover(m - 1) >= level - EPS)) return m;
  return undefined;
}

// ---- The levers ----

export const CMA_LEVER_IDS = ['quasi', 'capital', 'sales', 'months', 'collateral'] as const;
export type CmaLeverId = (typeof CMA_LEVER_IDS)[number];
/** Each lever as a change from the typed figures, 0 being as typed: the promoters' loans counted as the owners' funds (1);
 * rupees of capital brought in; sales higher in the projection, in tenths of a per cent; months more on every term loan's
 * remaining repayment; rupees more collateral at market value. */
export type CmaLevers = Record<CmaLeverId, number>;
export const CMA_AS_TYPED: CmaLevers = { quasi: 0, capital: 0, sales: 0, months: 0, collateral: 0 };
export const GRID = 1000;
const MAX_TENTHS = 99 * GRID;
const up = (v: number) => Math.ceil(v - 1e-6), down = (v: number) => Math.floor(v + 1e-6);

/** A gap in a balance sheet: more to fund raises the bank's working-capital borrowing; less lowers it, past nil the cash. */
function fund(f: Figures, gap: number) {
  if (gap >= 0) { f.bankWc += gap; return; }
  const cut = Math.min(-gap, f.bankWc);
  f.bankWc -= cut;
  f.cash += -gap - cut;
}
const pbtOf = (f: Figures) => f.sales + f.otherIncome - f.materials - f.otherDirect - f.employees - f.sga - f.depreciation - f.wcInterest - f.tlInterest;
/** The months the term loans have left at a year's end, equal instalments assumed: 12 × outstanding ÷ what falls due. */
const monthsLeft = (f: Figures) => (f.tlDue12 > 0 ? (12 * f.termLoans) / f.tlDue12 : undefined);
/** The months every term loan's repayment may still grow: what remains from the estimate's end, at most the longest. */
export function monthsRoom(x: CmaInput): number {
  const e = monthsLeft(x.figures.est as Figures), p = monthsLeft(x.figures.proj as Figures);
  if (e === undefined && p === undefined) return 0;
  return Math.max(0, Math.floor(DATA.term.longestMonths - Math.max(e ?? 0, p === undefined ? 0 : p + 12) + 1e-6));
}

/** The CMA's inputs with the levers written into the estimate's and the projection's figures, each balance sheet still
 * balancing; sales, costs, stock and debtors rounded up and creditors down to the rupee, so the figures a plan writes into
 * the page are those it was worked on, and never kinder. */
export function withCmaLevers(x: CmaInput, l: CmaLevers): CmaInput {
  const E = x.figures.est as Figures | undefined, P = x.figures.proj as Figures | undefined;
  if (!E || !P) return x;
  const e = { ...E }, p = { ...P };
  if (l.sales && P.sales > 0) {
    const sales = up(P.sales * (1 + l.sales / GRID)), g = sales / P.sales;
    const materials = up(P.materials * g), otherDirect = up(P.otherDirect * g);
    const cos = P.materials + P.otherDirect + P.depreciation, cos2 = materials + otherDirect + P.depreciation;
    const stock = cos > 0 ? up((P.stock * cos2) / cos) : P.stock, debtors = up(P.debtors * g), creditors = down(P.creditors * g);
    const pbt = pbtOf(P), pbt2 = pbt + (sales - P.sales) - (materials - P.materials) - (otherDirect - P.otherDirect);
    const tax = pbt > 0 ? Math.max(0, up((P.tax * pbt2) / pbt)) : P.tax, more = pbt2 - tax - (pbt - P.tax);
    Object.assign(p, { sales, materials, otherDirect, stock, debtors, creditors, tax, reserves: P.reserves + more });
    fund(p, stock - P.stock + (debtors - P.debtors) - (creditors - P.creditors) - more);
  }
  if (l.months) {
    const nE = monthsLeft(E), nP = monthsLeft(P);
    if (nE !== undefined) {
      const due = Math.min(E.tlDue12, up((12 * E.termLoans) / (nE + l.months))), kept = E.tlDue12 - due;
      e.tlDue12 = due;
      p.termLoans += kept;
      fund(p, -kept);
    }
    if (nP !== undefined) p.tlDue12 = Math.min(p.termLoans, up((12 * p.termLoans) / (nP + l.months)));
  }
  if (l.capital) for (const f of [e, p]) { f.capital += l.capital; fund(f, -l.capital); }
  return {
    ...x, figures: { ...x.figures, est: e, proj: p },
    ...(l.quasi ? { quasiEquity: true } : {}), ...(l.collateral ? { collateral: (x.collateral ?? 0) + l.collateral } : {}),
  };
}

/** A run of the CMA: the levels it misses and meets, or nothing when it cannot be worked. */
interface Run { x: CmaInput; r: Cma; d: CmaDiagnosis; met: Set<RatioId> }
const runOf = (x: CmaInput, c: Case, lv?: Levels): Run | undefined => {
  const r = cma(x);
  if (!isCma(r)) return undefined;
  const d = cmaDiagnose(r, x, c, lv);
  return { x, r, d, met: new Set(d.checks.filter((k) => k.meets).map((k) => k.id)) };
};
/** The levels missed apart from the security cover, which the collateral meets last; and those met. */
const open = (u: Run) => u.d.misses.filter((id) => id !== 'securityCover');
const keptOf = (u: Run) => [...u.met].filter((id) => id !== 'securityCover');
const meetsAll = (t: RatioId[]) => (u: Run | undefined) => !!u && t.every((id) => u.met.has(id));

/** The least of a lever, to the unit, that meets every level in `t`, from `lo` (missing) to `hi` (meeting). */
function least(lo: number, hi: number, ok: (n: number) => boolean) {
  while (hi - lo > 1) {
    const m = Math.floor((lo + hi) / 2);
    if (ok(m)) hi = m; else lo = m;
  }
  return hi;
}

/** Higher sales: the least on the 0.1% grid that meets the most of the levels missed, keeping every level met. Sales can
 * lower the current ratio (the bank funds the larger stock and debtors), so the reach is read at doubling steps and the
 * best step's levels are the target. Undefined when none helps. */
function salesStep(at: (k: number) => Run | undefined, missed: RatioId[], kept: RatioId[]): { k: number; u: Run } | undefined {
  const steps: number[] = [];
  for (let k = 1; k < MAX_TENTHS; k *= 2) steps.push(k);
  steps.push(MAX_TENTHS);
  let best: { k: number; prev: number; target: RatioId[] } | undefined;
  for (const [i, k] of steps.entries()) {
    const u = at(k);
    if (!u || !kept.every((id) => u.met.has(id))) continue;
    const fixed = missed.filter((id) => u.met.has(id));
    if (fixed.length && (!best || fixed.length > best.target.length - kept.length)) best = { k, prev: i ? steps[i - 1] : 0, target: [...kept, ...fixed] };
  }
  if (!best) return undefined;
  const ok = meetsAll(best.target), k = least(best.prev, best.k, (n) => ok(at(n)));
  const u = at(k);
  return u && ok(u) ? { k, u } : undefined;
}

/** A longer repayment: the fewest months more, within the room, that meet the most of the levels missed without losing a
 * level met (a longer loan leaves more outstanding, so the fixed-asset cover and debt-equity can fall). */
function monthsStep(at: (m: number) => Run | undefined, room: number, missed: RatioId[], kept: RatioId[]): { m: number; u: Run } | undefined {
  let best: { m: number; u: Run; n: number } | undefined;
  for (let m = 1; m <= room; m++) {
    const u = at(m);
    if (!u || !kept.every((id) => u.met.has(id))) continue;
    const n = missed.filter((id) => u.met.has(id)).length;
    if (n && (!best || n > best.n)) best = { m, u, n };
  }
  return best && { m: best.m, u: best.u };
}

// ---- Each lever alone: the board ----

export interface CmaOutcome { fixes: RatioId[]; still: RatioId[] }
export interface CmaViability {
  diagnosis: CmaDiagnosis; meets: boolean;
  quasi?: CmaOutcome & { loans: number }; quasiNone?: string;
  capital?: CmaOutcome & { needed: number }; capitalNone?: string;
  /** Sales in the projection: the least higher (`tenths` > 0), or, when every level meets, how far they can fall (< 0). */
  sales?: CmaOutcome & { tenths: number; fy: string; now: number; needed: number }; salesNone?: string;
  months?: CmaOutcome & { needed: number; dueNow: number; due: number; room: number }; monthsNone?: string;
  /** The collateral's market value that brings the security cover to its level, and the value typed, if any. */
  collateral?: { now?: number; needed: number };
}

export function cmaViable(x: CmaInput, c: Case, lv?: Levels): CmaViability | Needs | Blocked {
  const base = cma(x);
  if (!isCma(base)) return base;
  const u0 = runOf(x, c, lv) as Run, missed = u0.d.misses, kept = keptOf(u0), d = u0.d;
  const out: CmaViability = { diagnosis: d, meets: !missed.length };
  const outcome = (u: Run): CmaOutcome => ({ fixes: missed.filter((id) => u.met.has(id)), still: u.d.misses });
  const lever = (l: Partial<CmaLevers>) => runOf(withCmaLevers(x, { ...CMA_AS_TYPED, ...l }), c, lv);
  const none = (what: string) => `${what} alone meets none of the levels missed.`;
  const P = x.figures.proj as Figures, E = x.figures.est as Figures;

  const sc = d.checks.find((k) => k.id === 'securityCover');
  if (sc?.meets !== true) {
    const n = cmaCollateralNeeded(base, x, c, lv);
    if (n !== undefined) out.collateral = { ...(x.collateral !== undefined ? { now: x.collateral } : {}), needed: n };
  }

  // Sales: as typed and meeting every level, how far they can fall with every level still met (a margin of safety).
  if (!missed.length) {
    if (!(P.sales > 0)) return out;
    const ok = (k: number) => meetsAll(kept)(lever({ sales: k }));
    // Doubling down from nil till a fall misses (at most 99.9%), then halving between the last that meets and the first
    // that misses: the lowest that still meets every level.
    const floor = -(GRID - 1);
    let hi = 0, lo = -1;
    while (lo > floor && ok(lo)) { hi = lo; lo = Math.max(floor, lo * 2); }
    const k = ok(lo) ? lo : least(lo, hi, ok);
    const u = lever({ sales: k }) as Run;
    out.sales = { tenths: k, fy: (base.years.at(-1) as CmaYear).fy, now: P.sales, needed: (u.x.figures.proj as Figures).sales, ...outcome(u) };
    return out;
  }

  if (!x.quasiEquity && (E.promoterLoans > 0 || P.promoterLoans > 0)) {
    const u = lever({ quasi: 1 });
    if (u && missed.some((id) => u.met.has(id))) out.quasi = { loans: P.promoterLoans, ...outcome(u) };
    else out.quasiNone = none('Counting the promoters’ loans as the owners’ funds');
  }

  // Capital: every ratio rises with it or stays, so the least to the rupee that meets what the most could reach.
  const far = lever({ capital: 1e11 }), target = far ? [...far.met] : [];
  if (!missed.some((id) => target.includes(id))) out.capitalNone = none('Capital brought in');
  else {
    const ok = (n: number) => meetsAll(target)(lever({ capital: n }));
    let hi = 1;
    while (!ok(hi) && hi < 1e11) hi *= 2;
    const n = least(0, Math.min(hi, 1e11), ok), u = lever({ capital: n }) as Run;
    out.capital = { needed: n, ...outcome(u) };
  }

  if (!(P.sales > 0)) out.salesNone = 'No sales are typed for the projection.';
  else {
    const s = salesStep((k) => lever({ sales: k }), missed, kept);
    if (!s) out.salesNone = none('Higher sales in the projection');
    else out.sales = { tenths: s.k, fy: (base.years.at(-1) as CmaYear).fy, now: P.sales, needed: (s.u.x.figures.proj as Figures).sales, ...outcome(s.u) };
  }

  const room = monthsRoom(x), longest = DATA.term.longestMonths;
  if (monthsLeft(E) === undefined && monthsLeft(P) === undefined) out.monthsNone = 'No term loan falls due within 12 months to spread.';
  else if (room < 1) out.monthsNone = `What the term loans have left already runs to ${longest} months or more.`;
  else {
    const m = monthsStep((n) => lever({ months: n }), room, missed, kept);
    if (!m) out.monthsNone = `A longer repayment within ${longest} months meets none of the levels missed without losing one met.`;
    else out.months = { needed: m.m, dueNow: E.tlDue12, due: (m.u.x.figures.est as Figures).tlDue12, room, ...outcome(m.u) };
  }
  return out;
}

// ---- The levers together: the plan ----

/** The ratios capital moves (interest stays as typed, so the DSCR, interest cover and fixed-asset cover do not). */
const CAPITAL_MOVES: RatioId[] = ['currentRatio', 'tolTnw', 'debtEquity'];

export interface CmaPlan {
  levers: CmaLevers;
  /** The levers the plan takes to their limit. */
  atLimit: CmaLeverId[];
  /** True when every ratio that can be read meets its level with the plan; `still`, those that miss. */
  works: boolean; still: RatioId[];
  cma: Cma; diagnosis: CmaDiagnosis;
  limits: { promotersMost?: number; monthsRoom: number };
}
export interface CmaPlanInput {
  /** The most the promoters can bring in all, if the borrower gives it. */
  promotersMost?: number;
  /** Levers the borrower has set: kept as they are, the rest worked around them. */
  held?: Partial<CmaLevers>;
  /** The benchmarks the user changed (BEN1), over the case's defaults. */
  levels?: Levels;
}

export function makeCmaPlan(x: CmaInput, c: Case, o: CmaPlanInput = {}): CmaPlan | Needs | Blocked {
  const base = cma(x);
  if (!isCma(base)) return base;
  const held = o.held ?? {}, most = o.promotersMost, free = (id: CmaLeverId) => held[id] === undefined;
  const E = x.figures.est as Figures, P = x.figures.proj as Figures, room = monthsRoom(x);
  const l: CmaLevers = { ...CMA_AS_TYPED, ...held }, atLimit: CmaLeverId[] = [];
  const at = (k: Partial<CmaLevers>) => runOf(withCmaLevers(x, { ...l, ...k }), c, o.levels);
  let cur = at({});
  if (!cur) return { blocked: 'The levers as set leave no figures.' };

  // The promoters' loans already in, counted as their funds, when debt-equity or TOL/TNW misses.
  if (free('quasi') && !x.quasiEquity && (E.promoterLoans > 0 || P.promoterLoans > 0) && open(cur).some((id) => id === 'tolTnw' || id === 'debtEquity')) {
    const u = at({ quasi: 1 });
    if (u && keptOf(cur).every((id) => u.met.has(id))) { l.quasi = 1; cur = u; }
  }
  // Capital, within the promoters' most: the least that meets what the most can reach; all of it while a ratio capital
  // moves still misses, since that leaves less for the later steps.
  if (free('capital') && most !== undefined && most >= 1 && open(cur).length) {
    const far = at({ capital: Math.floor(most) }), kept = keptOf(cur), was = open(cur);
    const t = far ? [...kept, ...was.filter((id) => far.met.has(id))] : [];
    if (far && t.length > kept.length) {
      const ok = meetsAll(t), n = least(0, Math.floor(most), (v) => ok(at({ capital: v })));
      const u = at({ capital: n }) as Run;
      const moved = open(far).some((id) => CAPITAL_MOVES.includes(id));
      l.capital = moved ? Math.floor(most) : n; cur = moved ? far : u;
      if (moved) atLimit.push('capital');
    }
  }
  if (free('sales') && P.sales > 0 && open(cur).length) {
    const s = salesStep((k) => at({ sales: k }), open(cur), keptOf(cur));
    if (s) { l.sales = s.k; cur = s.u; }
  }
  if (free('months') && room >= 1 && open(cur).length) {
    const m = monthsStep((n) => at({ months: n }), room, open(cur), keptOf(cur));
    if (m) { l.months = m.m; cur = m.u; if (m.m === room) atLimit.push('months'); }
  }
  if (free('collateral') && cur.d.checks.find((k) => k.id === 'securityCover')?.meets !== true) {
    const n = cmaCollateralNeeded(cur.r, cur.x, c, o.levels), had = x.collateral ?? 0;
    if (n !== undefined && n > had) { l.collateral = n - had; cur = at({}) as Run; }
  }
  return {
    levers: l, atLimit, works: !cur.d.misses.length, still: cur.d.misses, cma: cur.r, diagnosis: cur.d,
    limits: { ...(most !== undefined ? { promotersMost: most } : {}), monthsRoom: room },
  };
}
