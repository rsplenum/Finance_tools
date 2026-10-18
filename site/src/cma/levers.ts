/**
 * A lender's levels and "Make it viable" on the CMA (D-UX-52, MV4, D-UX-56), in words for the page: each ratio as a bar
 * against the level of a fresh or enhanced limit or a renewal, as the borrower says (D-UX-51); each lever alone (the
 * board); the levers together (the plan, as sliders); and "Use this plan", which writes the plan's figures into the
 * estimate's and the projection's columns, with an undo. Every figure comes from engine/cma-plan.ts; none of this goes into
 * the downloads.
 */
import { cma, type CmaInput, type Figures } from '../../../engine/cma';
import {
  CMA_AS_TYPED, CMA_LEVER_IDS, cmaCollateralNeeded, cmaDiagnose, cmaViable, makeCmaPlan, withCmaLevers,
  type CmaLeverId, type CmaLevers, type CmaOutcome, type CmaViability,
} from '../../../engine/cma-plan';
import { LEVELS, type RatioCheck } from '../../../engine/ratios';
import { inr } from '../../../engine/util';
import { inSentence, labelOf, listed, rowOf, upRupees, type BoardMove, type CheckRow, type ViableLine, type ViableView } from '../board-model';
import { HEADS, amountOf, columnsOf, inputOf, type CmaState } from './model';

export const CASE_CHOICES = [
  { value: 'fresh' as const, label: 'A fresh or enhanced limit', hint: 'A new limit, or more than the one now.' },
  { value: 'renewal' as const, label: 'A renewal', hint: 'The same limit again.' },
];
export const COLLATERAL_HINT = `Property or deposits offered as security. Its realisable sale value, ${LEVELS.collateral.rsvPct}% of it, counts in the security cover.`;

const rs = (n: number) => `Rs. ${inr(n)}`;
const pct = (t: number) => `${(Math.abs(t) / 10).toFixed(1)}%`;
const fyOf = (s: CmaState) => { const c = columnsOf(s.startYear); return { e: c[3].fy, p: c[4].fy }; };
const fig = (x: CmaInput, id: 'est' | 'proj') => x.figures[id] as Figures;
const FOOT = (c: string) => `The levels: ${c === 'renewal' ? 'a renewal’s' : 'a fresh or enhanced limit’s'} benchmarks, said to follow RBI and not yet checked against an RBI publication; each lender sets its own. They are read on the estimate and the projection, each ratio in its worse year. Each change is worked by the engine on these figures; change them only to what the business can really reach.`;
const caseOf = (s: CmaState) => (s.loanCase || undefined) as 'fresh' | 'renewal' | undefined;
/** The rows for the bars: the security cover reads once on the business's own assets when they reach the level alone
 * (D-UX-93, as the report); short of it, it waits, under More options, for the collateral (0 if none). */
const rowsOf = (ks: RatioCheck[], s: CmaState) => {
  const { e, p } = fyOf(s);
  return ks.map((k): CheckRow => {
    const r = rowOf(k, `over ${e} and ${p}`);
    if (k.own) return { ...r, worst: r.worst.replace('project’s', 'business’s') };
    return r.verdict === 'wait' && k.id === 'securityCover' ? { ...r, worst: 'Waits for the collateral’s value, 0 if none: under More options' } : r;
  });
};

/** The bars, or what they wait on: the CMA's figures, then whether the limit is fresh or a renewal. */
export interface LevelsView { ask?: string; checks?: CheckRow[]; misses?: string; missCount?: number; collateralNote?: string; foot?: string }
export function levelsOf(s: CmaState): LevelsView | undefined {
  const x = inputOf(s), r = cma(x), c = caseOf(s);
  if ('needs' in r || 'blocked' in r) return undefined;
  if (!c) return { ask: 'Needed to read it against a lender’s levels: whether the limit is fresh or enhanced, or a renewal (above).' };
  const d = cmaDiagnose(r, x, c), sc = d.checks.find((k) => k.id === 'securityCover') as RatioCheck;
  const need = sc.meets ? undefined : cmaCollateralNeeded(r, x, c);
  return {
    checks: rowsOf(d.checks, s), foot: FOOT(c), missCount: d.misses.length,
    ...(d.misses.length ? { misses: `It misses ${d.misses.length === 1 ? 'one' : d.misses.length} of a lender’s levels: ${listed(d.misses.map(labelOf))}.` } : {}),
    ...(need === undefined || need === 0 ? {} : {
      collateralNote: `Security cover: collateral with a market value of ${rs(need)} or more brings it to ${sc.level.toFixed(2)}.`,
    }),
  };
}

// ---- Each lever alone: the board ----

const chips = (o: CmaOutcome) => ({ fixes: o.fixes.map(labelOf), still: o.still.map(labelOf) });
const none = { fixes: [], still: [] };

export function cmaViableOf(s: CmaState): ViableView | undefined {
  const c = caseOf(s), x = inputOf(s);
  if (!c) return undefined;
  const v = cmaViable(x, c);
  if ('needs' in v || 'blocked' in v) return undefined;
  const lines: ViableLine[] = [], { e } = fyOf(s), sl = v.sales;
  if (v.meets) {
    if (sl) lines.push({ by: 'borrower', id: 'sales', head: 'Sales can fall', ...none, ...(sl.tenths < 0 ? {
      move: pct(sl.tenths), bars: { now: sl.now, to: sl.needed, nowText: rs(sl.now), toText: `Rs. ${upRupees(sl.needed)}` },
      text: `Sales in ${sl.fy} can fall ${pct(sl.tenths)}, to Rs. ${upRupees(sl.needed)} (from ${rs(sl.now)}), and every ratio still meets its level.`,
    } : { text: 'Sales cannot fall at all before a ratio misses its level.' }) });
  } else {
    lines.push(...boardLines(v, e));
  }
  return {
    meets: v.meets, title: v.meets ? 'Every ratio meets a lender’s level: the room' : 'The levers: any one of these alone', lines, foot: FOOT(c),
  };
}

function boardLines(v: CmaViability, e: string): ViableLine[] {
  const out: ViableLine[] = [], push = (l: Omit<ViableLine, 'by'>, by: ViableLine['by'] = 'borrower') => out.push({ ...l, by });
  if (v.quasi) push({ id: 'quasi', head: HEAD.quasi, move: 'Count them', ...chips(v.quasi),
    text: `The promoters’ loans of ${rs(v.quasi.loans)} kept in the business till the bank is repaid, counted as the owners’ funds.` });
  else if (v.quasiNone) push({ id: 'quasi', head: HEAD.quasi, text: v.quasiNone, ...none });
  if (v.capital) push({ id: 'capital', head: HEAD.capital, move: `+${rs(v.capital.needed)}`, ...chips(v.capital),
    text: `The promoters bring ${rs(v.capital.needed)} more as capital by the end of ${e}, the bank’s working-capital borrowing less by as much.` });
  else if (v.capitalNone) push({ id: 'capital', head: HEAD.capital, text: v.capitalNone, ...none });
  const sl = v.sales;
  if (sl) push({ id: 'sales', head: HEAD.sales, move: `+${pct(sl.tenths)}`, ...chips(sl),
    bars: { now: sl.now, to: sl.needed, nowText: rs(sl.now), toText: rs(sl.needed) },
    text: `Sales ${pct(sl.tenths)} higher in ${sl.fy}: ${rs(sl.needed)} instead of ${rs(sl.now)}, with costs, stock, debtors and creditors in step.` });
  else if (v.salesNone) push({ id: 'sales', head: HEAD.sales, text: v.salesNone, ...none });
  const cl = v.collateral;
  if (cl && cl.now !== undefined && cl.needed > cl.now) push({ id: 'collateral', head: HEAD.collateral, move: `+${rs(cl.needed - cl.now)}`,
    bars: { now: cl.now, to: cl.needed, nowText: rs(cl.now), toText: rs(cl.needed) },
    text: `Collateral with a market value of ${rs(cl.needed)} (now ${rs(cl.now)}), for the security cover.`,
    fixes: [labelOf('securityCover')], still: v.diagnosis.misses.filter((id) => id !== 'securityCover').map(labelOf) });
  const m = v.months;
  if (m) push({ id: 'months', head: HEAD.months, move: `+${m.needed} months`, ...chips(m),
    bars: { now: m.dueNow, to: m.due, nowText: rs(m.dueNow), toText: rs(m.due) },
    text: `Every term loan’s remaining repayment over ${m.needed} months more: ${rs(m.due)} falls due within 12 months of ${e}’s end instead of ${rs(m.dueNow)}, the whole within ${LEVELS.term.longestMonths} months.` }, 'lender');
  else if (v.monthsNone) push({ id: 'months', head: HEAD.months, text: v.monthsNone, ...none }, 'lender');
  return out;
}

// ---- The levers together: the plan, as sliders ----

const HEAD: Record<CmaLeverId, string> = {
  quasi: 'The promoters’ loans kept in the business', capital: 'Capital brought in', sales: 'Higher sales in the projection',
  months: 'A longer repayment', collateral: 'More collateral',
};
export interface CmaCard { id: CmaLeverId; by: 'borrower' | 'lender'; head: string; toggle?: boolean }
export interface CmaPlanView {
  x: CmaInput; c: 'fresh' | 'renewal'; levers: CmaLevers; cards: CmaCard[]; limits: string; atLimit?: string;
  most?: number; room: number; alone: Partial<Record<CmaLeverId, number>>; fy: { e: string; p: string };
}

/** The engine's plan, with the levers in `held` kept as the borrower set them; none until the case is said. */
export function cmaPlanOf(s: CmaState, held: Partial<CmaLevers> = {}): CmaPlanView | undefined {
  const c = caseOf(s), x = inputOf(s), m = amountOf(s.promotersMost);
  if (!c) return undefined;
  const most = m !== undefined && Number.isFinite(m) && m >= 0 ? m : undefined;
  const q = makeCmaPlan(x, c, { ...(most !== undefined ? { promotersMost: most } : {}), held });
  if ('needs' in q || 'blocked' in q) return undefined;
  const E = fig(x, 'est'), P = fig(x, 'proj'), v = cmaViable(x, c), room = q.limits.monthsRoom;
  const alone = 'diagnosis' in v ? { capital: v.capital?.needed, collateral: v.collateral?.needed } : {};
  const show: Record<CmaLeverId, boolean> = {
    quasi: !x.quasiEquity && (E.promoterLoans > 0 || P.promoterLoans > 0), capital: true, sales: P.sales > 0, months: room >= 1,
    collateral: x.collateral !== undefined || q.levers.collateral > 0,
  };
  return {
    x, c, levers: q.levers, room, alone, fy: fyOf(s), ...(most !== undefined ? { most } : {}),
    cards: CMA_LEVER_IDS.filter((id) => show[id]).map((id) => ({ id, by: id === 'months' ? 'lender' : 'borrower', head: HEAD[id], ...(id === 'quasi' ? { toggle: true } : {}) })),
    limits: `The limits kept: ${most !== undefined ? `the promoters bring at most ${rs(most)} of capital` : 'no more capital from the promoters, since the most they can bring is not typed'}; every term loan within ${LEVELS.term.longestMonths} months; interest as typed; sales with no limit known, so a lender will test them against the market.`,
    ...(q.atLimit.length ? { atLimit: `At the limit: ${listed(q.atLimit.map((id) => (id === 'capital' ? 'the promoters’ money' : 'the term')))}.` } : {}),
  };
}

/** The board at the sliders (one run of the CMA): the bars, the verdict, the plan in steps. */
export interface CmaBoard {
  checks?: CheckRow[]; works: boolean; verdict: string; still: string[]; line: string; steps: string[];
  promoters?: string; over?: boolean; moves: Record<CmaLeverId, BoardMove>;
}

export function cmaBoardOf(q: CmaPlanView, l: CmaLevers, s: CmaState): CmaBoard {
  const x = q.x, y = withCmaLevers(x, l), { e, p } = q.fy, had = x.collateral ?? 0;
  const E = fig(x, 'est'), P = fig(x, 'proj'), E2 = fig(y, 'est'), P2 = fig(y, 'proj');
  const moves: Record<CmaLeverId, BoardMove> = {
    quasi: { move: l.quasi ? 'Counted' : 'As typed', to: `${rs(P.promoterLoans)} in ${p}, ${l.quasi ? 'counted as the owners’ funds' : 'counted as loans'}`, max: 1 },
    capital: { move: `+${rs(l.capital)}`, to: `Capital of ${rs(E2.capital)} in ${e} (now ${rs(E.capital)})`, max: q.most ?? Math.max(1000000, 2 * (q.alone.capital ?? 0)) },
    sales: { move: `+${pct(l.sales)}`, to: `Sales of ${rs(P2.sales)} in ${p} (now ${rs(P.sales)})`, max: 1000 },
    months: { move: `+${l.months} month${l.months === 1 ? '' : 's'}`, to: `${rs(E2.tlDue12)} due within 12 months of ${e}’s end (now ${rs(E.tlDue12)})`, max: q.room },
    collateral: { move: `+${rs(l.collateral)}`, to: `A market value of ${rs(had + l.collateral)}`, max: Math.max(1000000, 2 * (q.alone.collateral ?? 0), had) },
  };
  for (const id of CMA_LEVER_IDS) moves[id] = { ...moves[id], max: Math.max(0, moves[id].max, l[id]), ...(l[id] ? {} : { move: 'As typed' }) };
  const step: Record<CmaLeverId, () => string> = {
    quasi: () => `The promoters’ loans (${rs(P.promoterLoans)} in ${p}) kept in the business till the bank is repaid, counted as the owners’ funds.`,
    capital: () => `Capital of ${rs(l.capital)} more brought in by the end of ${e}, the bank’s working-capital borrowing less by as much.`,
    sales: () => `Sales of ${rs(P2.sales)} in ${p} (now ${rs(P.sales)}), ${pct(l.sales)} higher, with costs, stock, debtors and creditors in step.`,
    months: () => `Every term loan’s remaining repayment over ${l.months} months more: ${rs(E2.tlDue12)} due within 12 months of ${e}’s end (now ${rs(E.tlDue12)}), if the lender agrees.`,
    collateral: () => `Collateral with a market value of ${rs(had + l.collateral)} (now ${had ? rs(had) : 'none'}).`,
  };
  const steps = CMA_LEVER_IDS.filter((id) => l[id]).map((id) => step[id]()), r = cma(y);
  if ('needs' in r || 'blocked' in r) {
    const why = 'blocked' in r ? r.blocked : `No figures with these changes: ${r.needs.join('; ')}.`;
    return { works: false, verdict: why, still: [], line: 'No figures', steps, moves };
  }
  const d = cmaDiagnose(r, y, q.c), checks = rowsOf(d.checks, s), miss = checks.filter((k) => k.verdict === 'misses');
  const over = q.most !== undefined && l.capital > q.most + 1e-6;
  return {
    checks, works: !miss.length, steps, moves, over,
    still: miss.map((k) => `${k.label}: ${k.worst}, level ${k.level}.${k.short ? ` ${k.short}` : ''}`),
    verdict: miss.length ? `With these changes it still misses ${miss.length === 1 ? 'one' : miss.length} of a lender’s levels.`
      : `With these changes it meets every lender’s level${checks.some((k) => k.verdict === 'wait') ? ' that can be read' : ''}.`,
    line: miss.length ? `Misses ${miss.length}: ${listed(miss.map((k) => inSentence(k.label)))}` : 'Meets every level',
    ...(l.capital ? { promoters: `The promoters bring ${rs(l.capital)} more as capital${q.most === undefined ? '' : over
      ? `: Rs. ${upRupees(l.capital - q.most)} more than the ${rs(q.most)} they can` : `, within the ${rs(q.most)} they can`}.` } : {}),
  };
}
export const sameCmaLevers = (a: CmaLevers, b: CmaLevers) => CMA_LEVER_IDS.every((id) => a[id] === b[id]);
export { CMA_AS_TYPED, type CmaLeverId, type CmaLevers };

// ---- "Use this plan": the plan's figures written into the columns, and an undo ----

/** A field the plan writes: a cell of the estimate's or the projection's column, the promoters' loans, or the collateral. */
export interface CmaChange { key: string; field: string; label: string; was: string; now: string }
const get = (s: CmaState, k: string) => {
  if (k === 'quasi') return s.quasi ? 'Counted as the owners’ funds' : 'As loans';
  if (k === 'collateral') return s.collateral;
  const [id, h] = k.split('.') as ['est' | 'proj', keyof Figures];
  return s.figures[id][h];
};
const put = (s: CmaState, k: string, t: string): CmaState => {
  if (k === 'quasi') return { ...s, quasi: t === 'Counted as the owners’ funds' };
  if (k === 'collateral') return { ...s, collateral: t };
  const [id, h] = k.split('.') as ['est' | 'proj', keyof Figures];
  return { ...s, figures: { ...s.figures, [id]: { ...s.figures[id], [h]: t } } };
};

export function applyCmaPlan(s: CmaState, l: CmaLevers): { s: CmaState; changes: CmaChange[] } {
  const x = inputOf(s), y = withCmaLevers(x, l), { e, p } = fyOf(s), text = (n: number) => inr(n, Number.isInteger(n) ? 0 : 2);
  const changes: CmaChange[] = [];
  for (const [id, fy] of [['est', e], ['proj', p]] as const) {
    for (const h of HEADS) {
      const a = fig(x, id)[h.id], b = fig(y, id)[h.id];
      if (Math.abs(a - b) > 1e-9) changes.push({ key: `${id}.${h.id}`, field: `fld-cma-${id}-${h.id}`, label: `${h.label}, ${fy}`, was: s.figures[id][h.id], now: text(b) });
    }
  }
  if (l.quasi && !s.quasi) changes.push({ key: 'quasi', field: 'fld-cma-quasi', label: 'Promoters’ loans', was: get(s, 'quasi'), now: 'Counted as the owners’ funds' });
  if (l.collateral) changes.push({ key: 'collateral', field: 'fld-cma-collateral', label: 'Collateral', was: s.collateral, now: text(y.collateral ?? 0) });
  return { s: changes.reduce((t, c) => put(t, c.key, c.now), s), changes };
}
/** Undo: each field the plan wrote back as it was, unless it has been changed since. */
export const undoCmaPlan = (s: CmaState, changes: CmaChange[]) => changes.reduce((t, c) => (get(t, c.key) === c.now ? put(t, c.key, c.was) : t), s);
