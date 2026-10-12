/**
 * The board's words for a lender's levels (D-UX-51) and "Make it viable" (D-UX-52), shared by the project report
 * (report/model.ts) and the CMA (cma/viable.ts): each ratio as a bar against its level, each lever's card and slider.
 * Words only: every figure comes from the engine (engine/ratios.ts, engine/cma-plan.ts).
 */
import { LEVELS, type RatioCheck, type RatioId, type Shortfall } from '../../engine/ratios';
import { inr } from '../../engine/util';

const rupees = (x: number) => inr(x);

/** A ratio against its level (D-UX-51), in words: the level, its worst year, and whether it meets. */
export interface CheckRow {
  id: string; label: string; level: string; worst: string; verdict: 'meets' | 'misses' | 'wait';
  /** The bar (MV2b): the ratio's length on a track from 0 to twice its level, so the level sits at the middle; 0 to 100. */
  bar: number; at: 'least' | 'most';
  /** When it misses: the rupees its worst year needs, in words (engine/ratios.ts). */
  short?: string;
}

export const levelText = (c: RatioCheck) => `${c.level.toFixed(2)} or ${c.at === 'least' ? 'more' : 'less'}`;
/** A ratio to two places, or four when two would read as meeting a level it misses (1.0996 against 1.10). */
export const ratioAt = (x: number, c: RatioCheck) => {
  const two = Number(x.toFixed(2)), reads = c.at === 'least' ? two >= c.level : two <= c.level;
  return reads === !!c.meets ? x.toFixed(2) : x.toFixed(4);
};
/** A label inside a sentence: lower case, but DSCR stays DSCR. */
export const inSentence = (label: string) => (/^[A-Z][A-Z]/.test(label) ? label : label[0].toLowerCase() + label.slice(1));
export const listed = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
/** What a ratio's shortfall is more of, in plain words (engine/ratios.ts's `short.of`). */
const SHORT_OF: Record<Shortfall, string> = {
  cash: 'cash to pay the loan', profit: 'profit before interest and tax', currentAssets: 'current assets (stock, debtors and cash)',
  netWorth: 'net worth (the promoters’ money and the profit kept)', fixedAssets: 'net fixed assets', security: 'security',
  pbdit: 'profit before interest, depreciation and tax',
};
const shortText = (k: RatioCheck, over: string) => k.short && k.short.amount > 0
  ? `Short by Rs. ${upRupees(k.short.amount)} of ${SHORT_OF[k.short.of]}${k.fy ? ` in ${k.fy}` : `, in total ${over}`}.` : undefined;
/** Where the bar ends: 0 at nil or below, the level at the middle, full past twice the level (or net worth at or below nil). */
export const barOf = (k: RatioCheck) => (k.why ? 100 : k.worst === undefined ? 0 : Math.max(0, Math.min(100, (k.worst / (2 * k.level)) * 100)));
export const labelOf = (id: RatioId) => inSentence(LEVELS.ratios.find((r) => r.id === id)?.label ?? id);

/** A ratio's row; `over`, the years an average is read over, in words. */
export const rowOf = (k: RatioCheck, over = 'over the loan'): CheckRow => ({
  id: k.id, label: k.label, level: levelText(k),
  worst: k.na ? k.na : k.why ? `Net worth at or below nil in ${k.fy}` : k.worst === undefined ? (k.id === 'securityCover' ? 'Type the collateral’s value' : '—') : `${ratioAt(k.worst, k)}${k.fy ? ` in ${k.fy}` : ` ${over}`}`,
  verdict: k.meets === undefined ? 'wait' : k.meets ? 'meets' : 'misses', bar: barOf(k), at: k.at,
  ...(shortText(k, over) ? { short: shortText(k, over) } : {}),
});

/** A figure the business must reach, shown rounded up so it never reads below what meets: rupees, or a percentage to 0.1. */
export const upRupees = (x: number) => rupees(Math.ceil(x - 1e-6));
export const upPct = (x: number) => (Math.ceil(x * 10 - 1e-6) / 10).toFixed(1);

/** A lever's card on the board: how far it moves, now against needed, the ratios it brings to their level and leaves. */
export interface ViableLine {
  id: string; by: 'borrower' | 'lender'; head: string; text: string; note?: string;
  /** How far it moves, in one figure ("+17.3%", "Rs. 15,64,221 less", "+6 months"); none when no answer. */
  move?: string;
  /** Now and needed, for two bars side by side; the longer is the full width. */
  bars?: { now: number; to: number; nowText: string; toText: string };
  fixes: string[]; still: string[];
  /** Sales beyond full capacity are out of reach; beyond the most a plan takes, a warning. */
  reach?: { out: boolean; text: string };
}
export interface ViableView { meets: boolean; title: string; lines: ViableLine[]; foot: string }
/** Each lever at the slider: how far it moves, the figure it gives, and the slider's end. */
export interface BoardMove { move: string; to: string; max: number; min?: number }
