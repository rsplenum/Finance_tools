/**
 * Linked sliders on the DSCR page (the owner's O12, OR10, LOOP1): the loan's amount, its instalments and its rate, as
 * the borrower holds them, and the rest re-solved so the plan meets the target. The solver opens on one set that works;
 * a slider the borrower moves is held, and the others give way from what was typed, never past their bounds:
 * - the instalments only lengthen, the whole term (the holiday in it) within the longest lenders allow (180 months);
 * - the loan only shrinks, by no more than the borrower said they can bring, in steps of `step` rupees;
 * - the rate is the lender's, so the solver never moves it: the borrower may hold it (a rate offered), within its floor.
 * The least strained lever gives way first (D-UX-176): its share of its room used (the instalments added out of those
 * the longest allows, the rupees cut out of the most the borrower can bring); on a tie the instalments, which cost the
 * promoters nothing. When neither alone is enough, the repayment goes to the longest, then the least cut that meets,
 * then the fewest instalments with that cut. Every trial runs the whole statement (`runDscr`, worked twice).
 */
import { amortization, maxLoanAmount, shortfall, type Blocked, type Needs, type Plan } from './dscr';
import { moreRoom, runDscr, withDscrLevers, type DscrCase } from './dscr-plan';

export interface LinkTerms { amount: number; instalments: number; ratePct: number }
export type LinkId = keyof LinkTerms;
/** `most`: rupees more the borrower can bring (0 when none); `step`: the loan's slider step, rupees. */
export interface LinkBounds { most: number; step: number }
export interface Linked { terms: LinkTerms; works: boolean; moved: ('amount' | 'instalments')[]; plan: Plan }

const caseAt = (c: DscrCase, rate: number): DscrCase => ({ ...c, loan: { ...c.loan, ratePct: rate } });
/** The statement for a set of terms, from the case as typed. */
export function linkedAt(c: DscrCase, t: LinkTerms): Plan | Needs | Blocked {
  return runDscr(caseAt(c, t.ratePct), { cut: c.loan.amount - t.amount, more: t.instalments - c.loan.instalments, profit: 0 });
}
const works = (r: Plan | Needs | Blocked, c: DscrCase) => 'statement' in r && !shortfall(r.statement, c.target);

/** The fewest instalments, from `from` to `last`, that meet with the rest of `t`; undefined when none does. */
function fewest(c: DscrCase, t: LinkTerms, from: number, last: number): number | undefined {
  for (let k = from; k <= last; k++) if (works(linkedAt(c, { ...t, instalments: k }), c)) return k;
  return undefined;
}
/** The largest loan, from `floor` to `t.amount` in whole steps, that meets with the rest of `t`; undefined when none. */
function largest(c: DscrCase, t: LinkTerms, floor: number, step: number): number | undefined {
  const y = withDscrLevers(caseAt(c, t.ratePct), { cut: 0, more: t.instalments - c.loan.instalments, profit: 0 });
  const { amount: _, ...terms } = y.loan, most = maxLoanAmount(y.proj, terms, c.def, c.target, c.start);
  if (!('amount' in most)) return undefined;
  const a = Math.min(t.amount, Math.floor(most.amount / step) * step);
  return a >= floor && a > 0 ? a : undefined;
}

/**
 * The plan with `held` as the borrower set it and the rest re-solved from the case as typed. `works` is false when no
 * set within the bounds meets the target; `plan` is then the nearest the bounds allow (the longest repayment, all the
 * borrower can bring), which the page uses to say why the slider stops.
 */
export function linked(c: DscrCase, b: LinkBounds, held: Partial<LinkTerms> = {}): Linked | Needs | Blocked {
  const t: LinkTerms = { amount: c.loan.amount, instalments: c.loan.instalments, ratePct: c.loan.ratePct, ...held };
  const longest = c.loan.instalments + moreRoom(c.loan), floor = Math.max(0, c.loan.amount - b.most);
  const done = (x: LinkTerms, moved: Linked['moved']): Linked | Needs | Blocked => {
    const r = linkedAt(c, x);
    return 'statement' in r ? { terms: x, works: !shortfall(r.statement, c.target), moved, plan: r } : r;
  };
  const first = linkedAt(c, t);
  if (!('statement' in first)) return first;
  if (!shortfall(first.statement, c.target)) return { terms: t, works: true, moved: [], plan: first };
  const freeK = held.instalments === undefined, freeA = held.amount === undefined && b.most > 0;
  const k = freeK ? fewest(c, t, t.instalments + 1, longest) : undefined;
  const a = freeA ? largest(c, t, floor, b.step) : undefined;
  const strainK = k === undefined ? Infinity : (k - t.instalments) / Math.max(1, longest - t.instalments);
  const strainA = a === undefined ? Infinity : (t.amount - a) / b.most;
  if (k !== undefined && strainK <= strainA) return done({ ...t, instalments: k }, ['instalments']);
  if (a !== undefined) return done({ ...t, amount: a }, ['amount']);
  if (!freeK && !freeA) return done(t, []);
  // Neither alone: the longest repayment, then the least cut that meets, then the fewest instalments with that cut.
  const long = freeK ? { ...t, instalments: Math.max(t.instalments, longest) } : t;
  const a2 = freeA ? largest(c, long, floor, b.step) : undefined;
  if (a2 === undefined) return done(freeA ? { ...long, amount: floor } : long, [...(freeK ? ['instalments' as const] : []), ...(freeA ? ['amount' as const] : [])]);
  const k2 = freeK ? fewest(c, { ...long, amount: a2 }, t.instalments + 1, long.instalments) ?? long.instalments : t.instalments;
  return done({ ...t, amount: a2, instalments: k2 }, [...(freeK ? ['instalments' as const] : []), 'amount']);
}

/** The two levers the solver may move; the rate is the lender's. */
export type Follower = 'amount' | 'instalments';
/** Where each lever gives way from: its value as the borrower last set it, else as typed. */
export type Homes = Partial<Record<Follower, number>>;

/**
 * Which lever answers a move (LOOP1b, D-UX-228; the owner, 27-10-2026: the sliders show the tradeoffs through the
 * borrower's own hands): one lever answers and the third stays where it is. The loan answers the repayment, the repayment
 * answers the loan, and a move of the rate is answered by `prefer` (the page passes the lever the borrower set longest
 * ago). With nothing to bring, the loan stays as typed and only the repayment answers.
 */
export function followerOf(moving: LinkId, most: number, prefer: Follower = 'instalments'): Follower | undefined {
  if (moving === 'instalments') return most > 0 ? 'amount' : undefined;
  if (moving === 'amount') return 'instalments';
  return prefer === 'amount' && most > 0 ? 'amount' : 'instalments';
}

export interface Followed { terms: LinkTerms; works: boolean; follower?: Follower; plan: Plan }

/**
 * `t` as the borrower holds it after moving `moving`. The follower gives way from its home as little as it must (the
 * repayment lengthens, the whole term within 180 months; the loan shrinks, by no more than the borrower can bring) and
 * comes back to its home when the rest makes room, so the two move together both ways; the third lever stays as `t` has
 * it. When the follower at its bound is not enough, `works` is false and `terms` holds that bound: the page then stops
 * the slider (`stopAt`).
 */
export function follow(c: DscrCase, b: LinkBounds, t: LinkTerms, moving: LinkId, homes: Homes = {}, prefer?: Follower): Followed | Needs | Blocked {
  const f = followerOf(moving, b.most, prefer);
  const longest = c.loan.instalments + moreRoom(c.loan), floor = Math.max(0, c.loan.amount - b.most);
  let x = t;
  if (f === 'instalments') {
    const home = Math.min(longest, homes.instalments ?? c.loan.instalments);
    x = { ...t, instalments: fewest(c, t, home, longest) ?? longest };
  } else if (f === 'amount') {
    const home = Math.min(c.loan.amount, Math.max(floor, homes.amount ?? c.loan.amount));
    x = { ...t, amount: largest(c, { ...t, amount: home }, floor, b.step) ?? floor };
  }
  const r = linkedAt(c, x);
  return 'statement' in r ? { terms: x, works: works(r, c), follower: f, plan: r } : r;
}

/** The way a lever moves to make room: a longer repayment, a smaller loan, a lower rate. */
const easier: Record<LinkId, 1 | -1> = { instalments: 1, amount: -1, ratePct: -1 };
/**
 * Where a slider let go at a set that does not work stops: among `values` (the slider's stops), the nearest to `t[moving]`
 * at which `follow` works, on a tie the side that makes room; undefined when none does. Every candidate is tried in full,
 * nearest first, since room does not grow one way: a longer repayment can miss the average where a shorter one met it,
 * as the last part-year's weight changes (case S meets at 80 to 82 EMIs, misses at 83 to 90, meets from 91).
 */
export function stopAt(c: DscrCase, b: LinkBounds, t: LinkTerms, moving: LinkId, values: number[], homes: Homes = {}, prefer?: Follower): number | undefined {
  const at = t[moving], far = (v: number) => Math.abs(v - at);
  const order = values.filter((v) => v !== at).sort((p, q) => far(p) - far(q) || (q - p) * easier[moving]);
  return order.find((v) => { const r = follow(c, b, { ...t, [moving]: v }, moving, homes, prefer); return 'terms' in r && r.works; });
}

export type OptionId = 'longer' | 'own' | 'mix';
/** A ready plan: its terms, the borrower's own money, the level instalment, the interest over the loan and the total paid out. */
export interface DscrOption { id: OptionId; terms: LinkTerms; own: number; level: number; interest: number; paidOut: number; plan: Plan }

/**
 * The ready plans set side by side before the sliders (LOOP1b, D-UX-229; the owner, 27-10-2026: plans and their added
 * cost, to weigh the choices), each at the rate as typed:
 * - longer: the loan as typed, repaid over the fewest instalments that meet;
 * - own: the repayment as typed and the largest loan that meets, the rest the borrower's own money;
 * - mix: half the money `own` needs (in whole steps), then the fewest instalments that meet with it; when bringing alone
 *   cannot meet, all the borrower can bring and the fewest instalments that meet with it.
 * Each reads its level instalment, the interest over the loan and the total paid out (the borrower's money and every
 * payment on the loan, worked from the schedule and checked against the loan and its interest). None is marked best (the
 * owner's answer): bringing money always saves interest, but it is cash the business no longer has.
 */
export function dscrOptions(c: DscrCase, b: LinkBounds): DscrOption[] {
  const typed: LinkTerms = { amount: c.loan.amount, instalments: c.loan.instalments, ratePct: c.loan.ratePct };
  const longest = typed.instalments + moreRoom(c.loan), floor = Math.max(0, typed.amount - b.most);
  const at = (id: OptionId, t: LinkTerms): DscrOption[] => {
    const r = linkedAt(c, t), am = amortization({ ...c.loan, amount: t.amount, instalments: t.instalments, ratePct: t.ratePct });
    if (!('statement' in r) || !works(r, c) || !('months' in am)) return [];
    const own = typed.amount - t.amount, paid = am.months.reduce((s, m) => s + m.paid, 0);
    if (Math.abs(paid - (t.amount + am.totalInterest)) > 0.5) return []; // the two routes disagree: withheld
    return [{ id, terms: t, own, level: am.level, interest: am.totalInterest, paidOut: own + paid, plan: r }];
  };
  const k = fewest(c, typed, typed.instalments + 1, longest);
  const longer = k === undefined ? [] : at('longer', { ...typed, instalments: k });
  const a = b.most > 0 ? largest(c, typed, floor, b.step) : undefined;
  const own = a === undefined || a === typed.amount ? [] : at('own', { ...typed, amount: a });
  let mix: DscrOption[] = [];
  if (a !== undefined && a < typed.amount) {
    const half = Math.floor((typed.amount - a) / 2 / b.step) * b.step, m = typed.amount - half;
    const km = half > 0 ? fewest(c, { ...typed, amount: m }, typed.instalments + 1, longest) : undefined;
    if (km !== undefined) mix = at('mix', { ...typed, amount: m, instalments: km });
  } else if (b.most > 0 && floor > 0) {
    const km = fewest(c, { ...typed, amount: floor }, typed.instalments + 1, longest);
    if (km !== undefined && km !== k) mix = at('mix', { ...typed, amount: floor, instalments: km });
  }
  return [...longer, ...own, ...mix];
}

/**
 * What the borrower could bring, asked only under "Make it work" as four choices sized to the loan (D-UX-227): none, then
 * about 5%, 15% and 25% of it, in whole steps (Rs. 1, 3 and 5 lakh on a loan of Rs. 20 lakh, the mock-up's choices).
 */
export function ownChoices(amount: number, step: number): number[] {
  const xs = [0.05, 0.15, 0.25].map((f) => Math.max(step, Math.round((amount * f) / step) * step)).filter((x) => x < amount);
  return [0, ...xs.filter((x, i) => xs.indexOf(x) === i)];
}
