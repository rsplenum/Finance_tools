/**
 * Make it viable on the DSCR front door (MV5, D-UX-57): the borrower's DSCR against the target (the verdict, D-UX-47),
 * each lever alone, and the levers together in the owner's order (12-10-2026): a smaller loan, within the most the
 * borrower can bring; then the lender's longer repayment, the whole term within 180 months; then a higher profit for the
 * rest. The profit is this year's actual figure, so a plan never writes it: it stays a shortfall on the page.
 * Every trial runs the whole statement (`planStatement`, worked twice).
 */
import {
  loanTimeline, maxLoanAmount, planStatement, shortfall,
  type Blocked, type Definition, type Needs, type Plan, type ProjectionYear, type Statement, type Target,
} from './dscr';
import { PERIOD_MONTHS, termMonths, type LoanTerms } from './loan';
import { LEVELS } from './ratios';

/** The levers as changes from the typed figures: rupees less on the loan, instalments more, rupees more of the first
 * year's profit before interest, depreciation and tax (every year's in proportion). */
export interface DscrLevers { cut: number; more: number; profit: number }
export type DscrLeverId = keyof DscrLevers;
export const DSCR_LEVER_IDS: DscrLeverId[] = ['cut', 'more', 'profit'];
export const DSCR_AS_TYPED: DscrLevers = { cut: 0, more: 0, profit: 0 };

/** The case as typed: projections through the last year a 180-month term could reach, the first `shown` of them the
 * years the page shows as typed. */
export interface DscrCase { proj: ProjectionYear[]; shown: number; loan: LoanTerms; def: Definition; target: Target; start?: string }

/** The instalments a longer repayment may add, the whole term (the moratorium in it) within the longest. */
export const moreRoom = (l: LoanTerms) => Math.max(0, Math.floor((LEVELS.term.longestMonths - termMonths(l)) / PERIOD_MONTHS[l.frequency]));

/** The case with the levers applied: the loan, and the years its repayment covers (never fewer than shown as typed). */
export function withDscrLevers(c: DscrCase, l: DscrLevers): { proj: ProjectionYear[]; loan: LoanTerms } {
  const loan = { ...c.loan, amount: c.loan.amount - l.cut, instalments: c.loan.instalments + l.more };
  const t = loanTimeline(loan), last = 'years' in t ? t.years[t.years.length - 1] : '';
  const p0 = c.proj[0]?.pbdit ?? 0, f = l.profit && p0 > 0 ? (p0 + l.profit) / p0 : 1;
  const proj = c.proj.filter((y, i) => i < c.shown || y.fy <= last)
    .map((y, i) => (f === 1 || y.pbdit === undefined ? y : { ...y, pbdit: i === 0 ? p0 + l.profit : y.pbdit * f }));
  return { proj, loan };
}
export const runDscr = (c: DscrCase, l: DscrLevers) => { const y = withDscrLevers(c, l); return planStatement(y.proj, y.loan, c.def, c.start); };
const meets = (r: Plan | Needs | Blocked, t: Target) => 'statement' in r && !shortfall(r.statement, t);

/** How near a statement is to the target: the lesser of each level's ratio to it (1 meets); a year whose cash does not
 * cover the debt service, or a missing figure, is the farthest. */
export function nearness(s: Statement, t: Target): number {
  if (s.rows.some((r) => r.counted && r.available <= 0)) return -Infinity;
  return Math.min(t.minimum === undefined ? Infinity : (s.minimum?.dscr ?? -Infinity) / t.minimum,
    t.average === undefined ? Infinity : (s.average ?? -Infinity) / t.average);
}

/**
 * Cash to pay the loan that each level is short of (MV2b's shortfall in rupees): the lowest year's, target × its debt
 * service less its cash available; the average's, in total over the loan, by the totals method only. Each worked twice
 * (from the parts, and from the ratio) and withheld past a paisa; none when the level is met.
 */
export function cashShort(s: Statement, t: Target, def: Definition): { lowest?: { amount: number; fy: string }; average?: number } {
  const out: { lowest?: { amount: number; fy: string }; average?: number } = {}, close = (a: number, b: number) => Math.abs(a - b) <= 0.01;
  const low = s.minimum && s.rows.find((r) => r.fy === s.minimum?.fy);
  if (t.minimum !== undefined && low && low.dscr !== undefined && low.dscr < t.minimum) {
    const a = t.minimum * low.service - low.available, b = (t.minimum - low.dscr) * low.service;
    if (close(a, b)) out.lowest = { amount: a, fy: low.fy };
  }
  if (t.average !== undefined && def.average === 'totals' && s.total && s.average !== undefined && s.average < t.average) {
    const a = t.average * s.total.service - s.total.available, b = (t.average - s.average) * s.total.service;
    if (close(a, b)) out.average = a;
  }
  return out;
}

export interface Alone { needed?: number; none?: string }
export interface DscrViability { meets: boolean; cut: Alone; more: Alone; profit: Alone; room: number }

/** The fewest instalments more, from 1 to the room, that meet the target; or none, with the longest's lowest year. */
function fewestMore(c: DscrCase, l: DscrLevers, room: number): Alone & { best?: number } {
  let best = 0, bestAt = nearnessAt(c, l);
  for (let k = 1; k <= room; k++) {
    const r = runDscr(c, { ...l, more: k });
    if (!('statement' in r)) return { none: 'The figures for the later years are needed to try a longer repayment.', best };
    if (!shortfall(r.statement, c.target)) return { needed: k, best: k };
    const n = nearness(r.statement, c.target);
    if (n > bestAt + 1e-12) { best = k; bestAt = n; }
  }
  return room < 1 ? { none: `The repayment already runs ${LEVELS.term.longestMonths} months, the longest.`, best }
    : { none: `Even ${room} more instalment${room === 1 ? '' : 's'}, the whole term ${LEVELS.term.longestMonths} months, miss the target.`, best };
}
function nearnessAt(c: DscrCase, l: DscrLevers) { const r = runDscr(c, l); return 'statement' in r ? nearness(r.statement, c.target) : -Infinity; }

/** The least rupees more of this year's profit (every year's in proportion) that meet the target; none for a loss. */
function leastProfit(c: DscrCase, l: DscrLevers): Alone {
  const p0 = c.proj[0]?.pbdit;
  if (p0 === undefined || !(p0 > 0)) return { none: 'This year’s profit is nil or a loss, so there is no figure to raise in proportion.' };
  const ok = (add: number) => {
    const r = runDscr(c, { ...l, profit: add });
    if (!('statement' in r)) throw new Error('no statement');
    return !shortfall(r.statement, c.target);
  };
  try {
    if (ok(l.profit)) return { needed: l.profit };
    let lo = l.profit, hi = l.profit + Math.max(1, Math.ceil(p0 / 8));
    while (!ok(hi)) { lo = hi; hi = 2 * hi; if (hi > 1e13) return { none: 'No profit meets the target.' }; }
    while (hi - lo > 1) { const mid = Math.floor((lo + hi) / 2); if (ok(mid)) hi = mid; else lo = mid; }
    return { needed: hi };
  } catch { return { none: 'The figures for every year are needed.' }; }
}

/** The loan's cut that meets the target with the other levers as given: the typed amount less the largest loan. */
function leastCut(c: DscrCase, l: DscrLevers): Alone {
  const y = withDscrLevers(c, { ...l, cut: 0 }), { amount, ...terms } = y.loan;
  const most = maxLoanAmount(y.proj, terms, c.def, c.target, c.start);
  if ('amount' in most) return { needed: Math.max(0, amount - most.amount) };
  return { none: 'none' in most ? most.none : 'The loan’s figures are needed.' };
}

/** Each lever alone, the rest as typed. */
export function dscrViable(c: DscrCase): DscrViability | Needs | Blocked {
  const r = runDscr(c, DSCR_AS_TYPED);
  if (!('statement' in r)) return r;
  const room = moreRoom(c.loan), { best: _, ...more } = fewestMore(c, DSCR_AS_TYPED, room);
  return { meets: !shortfall(r.statement, c.target), cut: leastCut(c, DSCR_AS_TYPED), more, profit: leastProfit(c, DSCR_AS_TYPED), room };
}

export interface DscrPlan { levers: DscrLevers; works: boolean; atLimit: ('cut' | 'more')[]; room: number; plan: Plan; most?: number }

/**
 * The levers together, in the owner's order, each lever in `held` kept as the borrower set it:
 * 1. A smaller loan, by no more than the borrower's most (none without it), and never to nil: all of that room, unless
 *    less meets the target.
 * 2. More instalments, within 180 months: the fewest that meet; if none meets, the number that comes nearest (the
 *    fewest of equals), so the profit left to find is least.
 * 3. The profit, the least that meets with the two above (shown, never written).
 */
export function makeDscrPlan(c: DscrCase, o: { most?: number; held?: Partial<DscrLevers> } = {}): DscrPlan | Needs | Blocked {
  const held = o.held ?? {}, room = moreRoom(c.loan);
  const first = runDscr(c, { ...DSCR_AS_TYPED, ...held });
  if (!('statement' in first)) return first;
  const l: DscrLevers = { ...DSCR_AS_TYPED, ...held };
  const done = () => meets(runDscr(c, l), c.target);
  if (held.cut === undefined && !done() && o.most !== undefined) {
    const need = leastCut(c, l), most = Math.min(Math.floor(o.most), c.loan.amount - 1);
    l.cut = Math.max(0, need.needed !== undefined && need.needed <= most ? need.needed : most);
  }
  if (held.more === undefined && !done()) { const m = fewestMore(c, l, room); l.more = m.needed ?? m.best ?? 0; }
  if (held.profit === undefined && !done()) l.profit = leastProfit(c, l).needed ?? 0;
  const r = runDscr(c, l);
  if (!('statement' in r)) return r;
  return {
    levers: l, works: !shortfall(r.statement, c.target), room, plan: r, ...(o.most !== undefined ? { most: o.most } : {}),
    atLimit: [...(o.most !== undefined && l.cut > 0 && l.cut >= Math.min(Math.floor(o.most), c.loan.amount - 1) ? ['cut' as const] : []),
      ...(room > 0 && l.more >= room ? ['more' as const] : [])],
  };
}
