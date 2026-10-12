/**
 * Make it viable on the DSCR front door (MV5, D-UX-57), in words for the page: the borrower's DSCR against the target as
 * bars, with the lenders' tests of D1 against 1.00 (never the verdict); each lever alone (the board); the levers together
 * in the owner's order (the plan, as sliders); and "Use this plan", which writes the loan and the term, never the profit
 * (this year's actual figure), with an undo. Every figure comes from engine/dscr-plan.ts; none of this goes into the
 * downloads.
 */
import type { Statement, Target } from '../../../engine/dscr';
import {
  DSCR_AS_TYPED, cashShort, dscrViable, makeDscrPlan, runDscr,
  type DscrCase, type DscrLeverId, type DscrLevers, type DscrViability,
} from '../../../engine/dscr-plan';
import { LENDER } from '../../../engine/lender';
import { LEVELS } from '../../../engine/ratios';
import { inr } from '../../../engine/util';
import { listed, upPct, upRupees, type BoardMove, type CheckRow, type ViableLine, type ViableView } from '../board-model';
import { amountOf, dscrCaseOf, numberOf, type LenderView, type State } from './model';

const rs = (n: number) => `Rs. ${inr(n)}`;
/** A ratio to two places, or four when two would read as meeting a level it misses (1.4996 against 1.50). */
const ratio = (x: number, level: number) => ((Number(x.toFixed(2)) >= level) === (x >= level) ? x.toFixed(2) : x.toFixed(4));
/** Where the bar ends: the level at the middle, full past twice the level. */
const bar = (x: number | undefined, level: number) => (x === undefined ? 0 : Math.max(0, Math.min(100, (x / (2 * level)) * 100)));
const AVERAGE = 'Average DSCR', LOWEST = 'Lowest year’s DSCR';
const freq = (c: DscrCase) => (c.loan.frequency === 'quarterly' ? 'quarterly' : 'monthly');
const per = (c: DscrCase) => (c.loan.frequency === 'quarterly' ? 3 : 1);
const unit = (k: number) => `instalment${k === 1 ? '' : 's'}`;
/** A term in years and months: "6 years 8 months". */
const termText = (m: number) => [Math.floor(m / 12) && `${Math.floor(m / 12)} year${Math.floor(m / 12) === 1 ? '' : 's'}`, m % 12 && `${m % 12} month${m % 12 === 1 ? '' : 's'}`].filter(Boolean).join(' ');
const months = (c: DscrCase, more: number) => c.loan.moratoriumMonths + (c.loan.instalments + more) * per(c);

/** The two levels of the target as bars, each with the cash it is short of in its worst year (or over the loan). */
function targetRows(st: Statement, t: Target, c: DscrCase): CheckRow[] {
  const k = cashShort(st, t, c.def), out: CheckRow[] = [];
  const row = (id: string, label: string, level: number, x: number | undefined, where: string, short?: string): CheckRow => ({
    id, label, level: `${level.toFixed(2)} or more`, worst: x === undefined ? '—' : `${ratio(x, level)} ${where}`,
    verdict: x === undefined ? 'wait' : x >= level ? 'meets' : 'misses', bar: bar(x, level), at: 'least', ...(short ? { short } : {}),
  });
  if (t.average !== undefined) out.push(row('average', AVERAGE, t.average, st.average, 'over the loan',
    k.average ? `Short by Rs. ${upRupees(k.average)} of cash to pay the loan, in total over the loan.` : undefined));
  if (t.minimum !== undefined) out.push(row('lowest', LOWEST, t.minimum, st.minimum?.dscr, `in ${st.minimum?.fy ?? ''}`,
    k.lowest ? `Short by Rs. ${upRupees(k.lowest.amount)} of cash to pay the loan in ${k.lowest.fy}.` : undefined));
  return out;
}
const asTyped = (c: DscrCase) => { const r = runDscr(c, DSCR_AS_TYPED); return 'statement' in r ? r.statement : undefined; };
const missed = (c: DscrCase) => { const st = asTyped(c); return st ? targetRows(st, c.target, c).filter((k) => k.verdict === 'misses').map((k) => k.label) : []; };

export interface DscrLevelsView { checks: CheckRow[]; misses: boolean; foot: string }
/** The bars as typed: the target's two levels, then each of the lenders' tests that has figures (D1). */
export function dscrLevelsOf(s: State, lender?: LenderView): DscrLevelsView | undefined {
  const c = dscrCaseOf(s), st = c && asTyped(c);
  if (!c || !st) return undefined;
  const checks = targetRows(st, c.target, c), floor = LENDER.floor.value;
  const misses = checks.some((k) => k.verdict === 'misses');
  (lender?.stress ?? []).forEach((l, i) => checks.push({
    id: `stress-${LENDER.stress[i]?.id ?? i}`, label: `${l.label}: lowest year`, level: `${floor.toFixed(2)} or more, a lender’s test`, worst: `${l.lowest} in ${l.lowestYear}`,
    verdict: l.below ? 'misses' : 'meets', bar: bar(l.low, floor), at: 'least',
  }));
  return { checks, misses, foot: FOOT };
}
const FOOT = 'The line is the target (change it under More options; each lender sets its own). The lenders’ tests against 1.00 are our own and never decide the verdict.';

/** Each lever alone, the rest as typed: the borrower's (the loan, the profit), then the lender's (the repayment). */
export function dscrViableOf(s: State): ViableView | undefined {
  const c = dscrCaseOf(s), v = c && dscrViable(c);
  if (!c || !v || !('cut' in v)) return undefined;
  const miss = missed(c), a = c.loan.amount, n = c.loan.instalments, p = c.proj[0]?.pbdit ?? 0;
  const said = (x: { needed?: number; none?: string }, line: Omit<ViableLine, 'fixes' | 'still' | 'text'>, text: (k: number) => string): ViableLine =>
    x.needed !== undefined && x.needed > 0 ? { ...line, text: text(x.needed), fixes: miss, still: [] }
      : { id: line.id, by: line.by, head: line.head, text: x.needed === 0 ? 'Meets the target as typed.' : x.none ?? 'No answer.', fixes: [], still: x.needed === 0 ? [] : miss };
  const lines = [
    said(v.cut, { id: 'cut', by: 'borrower', head: 'A smaller loan' }, (k) => `A loan of ${rs(a - k)}, the largest on these terms, meets the target: you bring the rest, or buy less.`),
    said(v.profit, { id: 'profit', by: 'borrower', head: 'A higher profit', note: 'Shown only: a plan never writes the profit, which is what the business earns.' },
      (k) => `This year’s profit before interest, depreciation and tax of ${rs(p + k)}, every later year in step, meets the target.`),
    said(v.more, { id: 'more', by: 'lender', head: 'A longer repayment' },
      (k) => `${n + k} ${freq(c)} instalments, ${termText(months(c, k))} in all, meet the target, if the lender agrees (at most ${LEVELS.term.longestMonths} months).`),
  ].map((l) => ({ ...l, ...moveOf(c, l.id as DscrLeverId, v) }));
  return { meets: v.meets, title: v.meets ? 'It meets the target' : 'Make it viable: each change alone', lines, foot: FOOT };

  function moveOf(c: DscrCase, id: DscrLeverId, v: DscrViability): Pick<ViableLine, 'move' | 'bars'> {
    const k = v[id].needed;
    if (!k) return {};
    if (id === 'cut') return { move: `${rs(k)} less`, bars: { now: a, to: a - k, nowText: rs(a), toText: rs(a - k) } };
    if (id === 'profit') return { move: `+${upPct((k / p) * 100)}%`, bars: { now: p, to: p + k, nowText: rs(p), toText: `Rs. ${upRupees(p + k)}` } };
    return { move: `+${k} ${unit(k)}`, bars: { now: months(c, 0), to: months(c, k), nowText: termText(months(c, 0)), toText: termText(months(c, k)) } };
  }
}

// ---- The plan (D-UX-55's sliders) ----

export interface DscrCard { id: DscrLeverId; by: 'borrower' | 'lender'; head: string }
export interface DscrPlanView { c: DscrCase; levers: DscrLevers; cards: DscrCard[]; limits: string; atLimit?: string; most?: number; room: number; alone: DscrViability }

/** The engine's plan, with the levers in `held` kept as the borrower set them. */
export function dscrPlanOf(s: State, held: Partial<DscrLevers> = {}): DscrPlanView | undefined {
  const c = dscrCaseOf(s), m = amountOf(s.ownMost ?? '');
  if (!c) return undefined;
  const most = m !== undefined && Number.isFinite(m) && m >= 0 ? m : undefined;
  const q = makeDscrPlan(c, { ...(most !== undefined ? { most } : {}), held }), alone = dscrViable(c);
  if (!('levers' in q) || !('cut' in alone)) return undefined;
  const cards: DscrCard[] = [
    { id: 'cut', by: 'borrower', head: 'A smaller loan' },
    ...(q.room >= 1 ? [{ id: 'more', by: 'lender', head: 'A longer repayment' } as const] : []),
    ...((c.proj[0]?.pbdit ?? 0) > 0 ? [{ id: 'profit', by: 'borrower', head: 'A higher profit (shown, never written)' } as const] : []),
  ];
  return {
    c, levers: q.levers, cards, room: q.room, alone, ...(most !== undefined ? { most } : {}),
    limits: `The limits kept: ${most !== undefined ? `you bring at most ${rs(most)} in place of the loan` : 'no more of your own money, since the most you can bring is not typed'}; the whole repayment within ${LEVELS.term.longestMonths} months; the interest rate as typed; the profit as typed, a higher one only shown.`,
    ...(q.atLimit.length ? { atLimit: `At the limit: ${listed(q.atLimit.map((id) => (id === 'cut' ? 'your money' : 'the term')))}.` } : {}),
  };
}

/** The board at the sliders (one run of the statement): the bars, the verdict, the plan in steps. */
export interface DscrBoard {
  checks: CheckRow[]; works: boolean; verdict: string; still: string[]; line: string; steps: string[];
  own?: string; over?: boolean; moves: Record<DscrLeverId, BoardMove>;
}

export function dscrBoardOf(q: DscrPlanView, l: DscrLevers): DscrBoard {
  const c = q.c, a = c.loan.amount, n = c.loan.instalments, p = c.proj[0]?.pbdit ?? 0;
  const moves: Record<DscrLeverId, BoardMove> = {
    cut: { move: l.cut ? `${rs(l.cut)} less` : 'As typed', to: `A loan of ${rs(a - l.cut)} (now ${rs(a)})`, max: Math.max(0, Math.floor(a) - 1, l.cut) },
    more: { move: l.more ? `+${l.more} ${unit(l.more)}` : 'As typed', to: `${n + l.more} ${freq(c)} instalments, ${termText(months(c, l.more))} in all (now ${termText(months(c, 0))})`, max: Math.max(q.room, l.more) },
    profit: {
      move: l.profit ? `+${upPct((l.profit / p) * 100)}%` : 'As typed', to: `This year’s profit of ${rs(p + l.profit)} (now ${rs(p)})`,
      max: Math.max(Math.ceil(p), 2 * (q.alone.profit.needed ?? 0), l.profit),
    },
  };
  const steps = [
    l.cut && `A loan of ${rs(a - l.cut)}, ${rs(l.cut)} less: you bring the rest, or buy less.`,
    l.more && `${n + l.more} ${freq(c)} instalments, ${termText(months(c, l.more))} in all (now ${termText(months(c, 0))}), if the lender agrees.`,
    l.profit && `This year’s profit before interest, depreciation and tax of ${rs(p + l.profit)} (now ${rs(p)}), ${upPct((l.profit / p) * 100)}% higher, every later year in step: shown only, never written.`,
  ].filter((x): x is string => !!x);
  const r = runDscr(c, l), over = q.most !== undefined && l.cut > q.most + 1e-6;
  const own = l.cut ? `You bring ${rs(l.cut)} in place of the loan${q.most === undefined ? '' : over
    ? `: Rs. ${upRupees(l.cut - q.most)} more than the ${rs(q.most)} you can` : `, within the ${rs(q.most)} you can`}.` : undefined;
  if (!('statement' in r)) {
    const why = 'blocked' in r ? r.blocked : `No figures with these changes: ${r.needs.join('; ')}.`;
    return { checks: [], works: false, verdict: why, still: [], line: 'No figures', steps, moves, ...(own ? { own, over } : {}) };
  }
  const checks = targetRows(r.statement, c.target, c), miss = checks.filter((k) => k.verdict === 'misses');
  return {
    checks, works: !miss.length, steps, moves, ...(own ? { own, over } : {}),
    still: miss.map((k) => `${k.label}: ${k.worst}, target ${k.level}.${k.short ? ` ${k.short}` : ''}`),
    verdict: miss.length ? 'With these changes it still misses the target.'
      : l.profit ? 'With these changes it meets the target, but only with the higher profit, which the plan does not write.' : 'With these changes it meets the target.',
    line: miss.length ? `Misses: ${listed(miss.map((k) => k.label))}` : l.profit ? 'Meets the target, with the higher profit' : 'Meets the target',
  };
}
export const sameDscrLevers = (a: DscrLevers, b: DscrLevers) => a.cut === b.cut && a.more === b.more && a.profit === b.profit;

// ---- "Use this plan": the loan and the term written, never the profit, and an undo ----

export interface DscrChange { key: 'amount' | 'instalments'; label: string; was: string; now: string }
const put = (s: State, k: DscrChange['key'], t: string): State => ({ ...s, loan: { ...s.loan, [k]: t } });

export function applyDscrPlan(s: State, l: DscrLevers): { s: State; changes: DscrChange[] } {
  const a = amountOf(s.loan.amount), n = numberOf(s.loan.instalments), changes: DscrChange[] = [];
  if (l.cut && a !== undefined) { const x = a - l.cut; changes.push({ key: 'amount', label: 'Loan amount', was: s.loan.amount, now: inr(x, Number.isInteger(x) ? 0 : 2) }); }
  if (l.more && n !== undefined) changes.push({ key: 'instalments', label: 'Number of instalments', was: s.loan.instalments, now: String(n + l.more) });
  return { s: changes.reduce((t, c) => put(t, c.key, c.now), s), changes };
}
/** Undo: each field the plan wrote back as it was, unless it has been changed since. */
export const undoDscrPlan = (s: State, changes: DscrChange[]) => changes.reduce((t, c) => (t.loan[c.key] === c.now ? put(t, c.key, c.was) : t), s);
export { DSCR_AS_TYPED, type DscrLeverId, type DscrLevers };
