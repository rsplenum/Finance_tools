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
import { maxLoanAmount, shortfall, type Blocked, type Needs, type Plan } from './dscr';
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
