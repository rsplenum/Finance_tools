/**
 * Make it work on the DSCR page (LOOP1b, D-UX-227 to D-UX-229), in words for the page: what the borrower can bring (four
 * choices sized to the loan), the ready plans with their cost, the linked sliders (one answers the one moved, the third
 * stays) and the rounds tried. Every figure is the engine's (engine/dscr-linked.ts, engine/dscr.ts); this file only words
 * them. None of it goes into the downloads.
 */
import { amortization, shortfall, type Statement, type Target } from '../../../engine/dscr';
import {
  dscrOptions, follow, followerOf, linkedAt, ownChoices, stopAt,
  type DscrOption, type Follower, type Homes, type LinkId, type LinkTerms, type OptionId,
} from '../../../engine/dscr-linked';
import { moreRoom, type DscrCase } from '../../../engine/dscr-plan';
import { LEVELS } from '../../../engine/ratios';
import { inr } from '../../../engine/util';
import { dscrCaseOf, type State } from './model';

export const STEP = 10000;
const rs = (n: number, d = 0) => `Rs. ${inr(n, d)}`;
/** Enough decimals that a ratio never reads as meeting a level it misses (money-maths-checks). */
const ratio = (x: number, level: number) => ((Number(x.toFixed(2)) >= level) === (x >= level) ? x.toFixed(2) : x.toFixed(4));
const per = (c: DscrCase) => (c.loan.frequency === 'quarterly' ? 3 : 1);
export function termWords(months: number): string {
  const y = Math.floor(months / 12), m = months % 12;
  return [y && `${y} year${y === 1 ? '' : 's'}`, m && `${m} month${m === 1 ? '' : 's'}`].filter(Boolean).join(' ') || '0 months';
}
const termOf = (c: DscrCase, k: number) => termWords(k * per(c));
const pct = (r: number) => `${Number(r.toFixed(2))}%`;
const typedOf = (c: DscrCase): LinkTerms => ({ amount: c.loan.amount, instalments: c.loan.instalments, ratePct: c.loan.ratePct });

/** The instalment in words, as the answer reads it (model.ts's loan line). */
function instalment(c: DscrCase, t: LinkTerms): { level: number; text: string; interest: number } | undefined {
  const a = amortization({ ...c.loan, ...t });
  if (!('months' in a)) return undefined;
  const text = c.loan.style === 'emi' ? `EMI ${rs(a.level, 2)} a month` : c.loan.style === 'stepped' ? `${rs(a.level, 2)} a month in the first year`
    : `Principal ${rs(a.level)} a ${c.loan.frequency === 'quarterly' ? 'quarter' : 'month'}`;
  return { level: a.level, text, interest: a.totalInterest };
}

export interface Figures { lowest: string; lowestFy?: string; lowOk: boolean; average: string; avgOk: boolean; works: boolean }
export function figuresOf(st: Statement, t: Target): Figures {
  const lo = st.minimum?.dscr, av = st.average, tl = t.minimum ?? 0, ta = t.average ?? 0;
  return {
    lowest: lo === undefined ? '–' : ratio(lo, tl), lowestFy: st.minimum?.fy, lowOk: lo !== undefined && lo >= tl,
    average: av === undefined ? '–' : ratio(av, ta), avgOk: av !== undefined && av >= ta, works: !shortfall(st, t),
  };
}

export interface Lever { id: LinkId; label: string; min: number; max: number; step: number; ends: [string, string]; words: (v: number) => string; values: number[] }
export interface Setup { c: DscrCase; typed: LinkTerms; choices: { value: string; label: string }[]; levers: (most: number) => Lever[]; typedInterest?: number }
const range = (lo: number, hi: number, step: number, d = 0) => { const xs: number[] = []; for (let i = 0; lo + i * step <= hi + 1e-9; i++) xs.push(Number((lo + i * step).toFixed(d))); return xs; };

export function setupOf(s: State): Setup | undefined {
  const c = dscrCaseOf(s);
  if (!c) return undefined;
  const typed = typedOf(c), longest = typed.instalments + moreRoom(c.loan), first = 12 / per(c);
  const floorPct = LEVELS.rate.floorPct, top = Math.max(14, Math.ceil(typed.ratePct + 3));
  return {
    c, typed, typedInterest: instalment(c, typed)?.interest,
    choices: ownChoices(typed.amount, STEP).map((x) => ({ value: String(x), label: x ? `Up to ${rs(x)}` : 'No' })),
    levers: (most) => {
      const floor = Math.max(0, typed.amount - most), a: Lever[] = [
        { id: 'instalments', label: 'Repay over', min: Math.min(first, typed.instalments), max: longest, step: 1, words: (k) => termOf(c, k),
          ends: [termOf(c, Math.min(first, typed.instalments)), termOf(c, longest)], values: range(Math.min(first, typed.instalments), longest, 1) },
      ];
      if (most > 0) a.push({ id: 'amount', label: 'The loan', min: floor, max: typed.amount, step: STEP, words: (x) => rs(x), ends: [rs(floor), rs(typed.amount)], values: range(floor, typed.amount, STEP) });
      a.push({ id: 'ratePct', label: 'Interest rate', min: floorPct, max: top, step: 0.05, words: pct, ends: [pct(floorPct), pct(top)], values: range(floorPct, top, 0.05, 2) });
      return a;
    },
  };
}

const TITLES: Record<OptionId, string> = { longer: 'Repay over longer', own: 'Bring your own money', mix: 'Some of both' };
export interface OptionView { id: OptionId; title: string; terms: LinkTerms; lines: [string, string][]; more: string }
/** Why "Bring your own money" is missing: on the repayment as typed it takes more than the borrower can bring. */
export function ownShortOf(u: Setup, most: number, shown: OptionView[]): string | undefined {
  if (most <= 0 || shown.some((o) => o.id === 'own')) return undefined;
  const all = dscrOptions(u.c, { most: u.typed.amount, step: STEP }).find((o) => o.id === 'own');
  return all ? `Your own money alone would need ${rs(all.own)} over ${termOf(u.c, u.typed.instalments)}, more than the ${rs(most)} you can bring.`
    : `Your own money alone does not meet the bank’s figures over ${termOf(u.c, u.typed.instalments)}.`;
}
/** The ready plans in words: what each changes and its cost beside the plan as typed; none marked best (D-UX-229). */
export function optionsOf(u: Setup, most: number): OptionView[] {
  return dscrOptions(u.c, { most, step: STEP }).map((o: DscrOption) => {
    const i = instalment(u.c, o.terms), d = o.interest - (u.typedInterest ?? o.interest);
    return {
      id: o.id, title: TITLES[o.id], terms: o.terms,
      lines: [
        ['Repay over', termOf(u.c, o.terms.instalments)], ['The loan', rs(o.terms.amount)], ['Your own money', o.own ? rs(o.own) : 'None'],
        ['Each instalment', i?.text.replace(/^EMI /, '') ?? '–'], ['Interest over the loan', rs(o.interest)], ['Total you pay out', rs(o.paidOut)],
      ],
      more: u.typedInterest === undefined ? '' : `${rs(Math.abs(d))} ${d >= 0 ? 'more' : 'less'} interest than the loan as you typed it.`,
    };
  });
}

export interface Live { terms: LinkTerms; follower?: Follower; fig: Figures; instalment: string; interest: string; stop?: string }
/** The follower for a move of the rate: the lever the borrower set longest ago (`order` lists the last set last). */
export const preferOf = (order: Follower[]): Follower => (order[order.length - 1] === 'instalments' ? 'amount' : 'instalments');

/** One move of a slider: the follower answers; on release (`done`) a set that does not work stops at the nearest that does. */
export function moveOf(u: Setup, most: number, t: LinkTerms, moving: LinkId, homes: Homes, order: Follower[], done: boolean): Live | undefined {
  const b = { most, step: STEP }, prefer = preferOf(order);
  let r = follow(u.c, b, t, moving, homes, prefer), stop: string | undefined;
  if (!('terms' in r)) return undefined;
  if (done && !r.works) {
    const L = u.levers(most).find((l) => l.id === moving)!, v = stopAt(u.c, b, t, moving, L.values, homes, prefer);
    const f = followerOf(moving, most, prefer), even = f === 'amount' ? `, even with the loan at ${rs(Math.max(0, u.typed.amount - most))}` : f === 'instalments' ? `, even repaid over ${termOf(u.c, u.typed.instalments + moreRoom(u.c.loan))}` : '';
    stop = v === undefined ? `At ${L.words(t[moving])} no plan within the limits meets the bank’s figures${even}.`
      : `Stopped at ${L.words(v)}: at ${L.words(t[moving])} it does not meet the bank’s figures${even}.`;
    if (v !== undefined) { const q = follow(u.c, b, { ...t, [moving]: v }, moving, homes, prefer); if ('terms' in q) r = q; }
  }
  const i = instalment(u.c, r.terms);
  return { terms: r.terms, follower: r.follower, fig: figuresOf(r.plan.statement, u.c.target), instalment: i?.text ?? '–', interest: i ? rs(i.interest) : '–', stop };
}
/** The sliders' first place: a ready plan, or the loan as typed. */
export function startOf(u: Setup, t: LinkTerms): Live | undefined {
  const r = linkedAt(u.c, t), i = instalment(u.c, t);
  return 'statement' in r ? { terms: t, fig: figuresOf(r.statement, u.c.target), instalment: i?.text ?? '–', interest: i ? rs(i.interest) : '–' } : undefined;
}

/** The loan's three answers written back, as the borrower would type them. */
export function writeTerms(s: State, t: LinkTerms): State {
  return { ...s, loan: { ...s.loan, amount: inr(t.amount, Number.isInteger(t.amount) ? 0 : 2), instalments: String(t.instalments), ratePct: String(Number(t.ratePct.toFixed(2))) } };
}

// ---- The rounds: each plan the borrower saw, kept while nothing but the loan's three answers changes ----

export interface RoundView { terms: LinkTerms; fig: Figures; interest: string; instalment: string; changed: string[] }
/** Everything but the loan's amount, instalments and rate: rounds are kept while it holds. */
export const roundKey = (s: State) => JSON.stringify({ ...s, loan: { ...s.loan, amount: '', instalments: '', ratePct: '' }, ownMost: '' });
export function roundOf(s: State, first?: LinkTerms): RoundView | undefined {
  const u = setupOf(s);
  if (!u) return undefined;
  const v = startOf(u, u.typed);
  if (!v) return undefined;
  const t = u.typed, changed: string[] = [];
  if (first) {
    if (t.instalments !== first.instalments) changed.push(`repay over ${termOf(u.c, t.instalments)} instead of ${termOf(u.c, first.instalments)}`);
    if (t.amount !== first.amount) changed.push(`borrow ${rs(t.amount)} instead of ${rs(first.amount)}${t.amount < first.amount ? `: ${rs(first.amount - t.amount)} of your own money` : ''}`);
    if (t.ratePct !== first.ratePct) changed.push(`at ${pct(t.ratePct)} instead of ${pct(first.ratePct)}`);
  }
  return { terms: t, fig: v.fig, interest: v.interest, instalment: v.instalment, changed };
}
