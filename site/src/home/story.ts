/**
 * Home's four intros (HOME1b, D-UX-114, D-UX-115): each tool types one fictional case on a terminal on the ink desk, the
 * inputs resolving, the years read against the lender's level, the verdict, Make it viable's change and the same reading
 * passing. Every figure is the engine's, worked out when the page is built, never here; tests/home-story.test.ts holds
 * them to the same cases worked by hand. Each intro's button opens its tool filled with the case (`?case=home`, the
 * cases in each tool's `home-case.ts`).
 */
import { preview, type State } from '../dscr/model';
import { dscrViableOf } from '../dscr/levers';
import { door, DSCR_HOME } from '../dscr/home-case';
import { preview as reportPreview, viableOf, type ReportState } from '../report/model';
import { REPORT_HOME } from '../report/home-case';
import { planPreview, type PlanState } from '../estimate/plan-model';
import { ESTIMATE_HOME } from '../estimate/home-case';
import { columnsOf, inputOf, preview as cmaPreview, type CmaState } from '../cma/model';
import { applyCmaPlan, cmaViableOf } from '../cma/levers';
import { CMA_AS_TYPED, cmaViable } from '../../../engine/cma-plan';
import { CMA_HOME } from '../cma/home-case';
import { READY } from '../site';

// ---- The DSCR: case S ----

export const STORY_CASE = DSCR_HOME;
export const STORY_FIXED = door('80');

/** One reading of the DSCR story: each year's DSCR against the target, then the verdict, all in the engine's words. */
export interface StoryFrame {
  years: { fy: string; dscr: string; n: number; meets: boolean }[];
  average: string; lowest: string; lowestYear: string; meets: boolean; verdict: string;
}
function frame(s: State): StoryFrame {
  const p = preview(s), line = p.statement?.lines.find((l) => l.id === 'dscr');
  if (!p.statement || !line || !p.verdict || !p.average || !p.lowest || !p.lowestYear) throw new Error('The story case gives no statement.');
  const target = Number(s.target.minimum);
  const years = p.statement.years.map((fy, i) => ({ fy, dscr: line.values[i], n: line.n?.[i] ?? NaN, meets: (line.n?.[i] ?? 0) >= target }));
  return { years, average: p.average, lowest: p.lowest, lowestYear: p.lowestYear, meets: p.verdict.meets, verdict: p.verdict.text };
}
export const STORY_TARGET = { minimum: STORY_CASE.target.minimum, average: STORY_CASE.target.average };
export const STORY_TYPED = frame(STORY_CASE);
export const STORY_LONGER = frame(STORY_FIXED);
/** The lender's lever that fixes it: the engine's own sentence from "Make it viable". */
export const STORY_FIX = (() => {
  const l = dscrViableOf(STORY_CASE)?.lines.find((x) => x.id === 'more');
  if (!l?.move) throw new Error('The story case needs no longer repayment.');
  return { head: l.head, text: l.text, move: l.move };
})();
/** The lowest year's sum from the statement: cash available over the debt service, and its DSCR. */
function dscrSum(s: State, f: StoryFrame) {
  const st = preview(s).statement, i = st?.years.indexOf(f.lowestYear) ?? -1, v = (id: string) => st?.lines.find((l) => l.id === id)?.values[i];
  const a = v('available'), b = v('service'), r = v('dscr');
  if (!a || !b || r !== f.lowest) throw new Error('The story case gives no lowest year.');
  return `${f.lowestYear}  ${a} ÷ ${b} = ${r}`;
}

// ---- The project report: case R at 70 lakh of sales ----

export const REPORT_CASE: ReportState = REPORT_HOME;
/** Make it viable's first change, the borrower's: higher sales, by the engine's step. */
export const REPORT_FIX = (() => {
  const l = viableOf(REPORT_CASE)?.lines.find((x) => x.id === 'sales');
  if (!l?.move || !l.bars) throw new Error('The report case needs no higher sales.');
  return { move: l.move, sales: l.bars.toText.replace(/^Rs\. /, ''), from: l.bars.nowText.replace(/^Rs\. /, '') };
})();
export const REPORT_FIXED: ReportState = { ...REPORT_CASE, sales: REPORT_FIX.sales };
/** The report's DSCR table read: each year's DSCR, and the lowest year's sum, cash available over debt service, with
 *  the lender's level it is read against. */
export function reportSum(s: ReportState) {
  const p = reportPreview(s), t = p.view?.tables.find((x) => x.id === 'dscr'), c = p.checks?.find((x) => x.id === 'dscrLowest');
  const fy = c?.worst.split(' in ')[1], i = fy ? t?.columns.indexOf(fy) ?? -1 : -1, row = (label: string) => t?.rows.find((r) => r.label === label);
  const v = (label: string) => row(label)?.values[i], a = v('Cash available (A)'), b = v('Debt service (B)'), r = v('DSCR (A ÷ B)');
  const d = row('DSCR (A ÷ B)');
  if (!c || !t || !d || !fy || !a || !b || !r || !c.worst.startsWith(`${r} `)) throw new Error('The report case gives no lowest year.');
  const level = c.level.split(' ')[0];
  return { text: `${fy}  ${a} ÷ ${b} = ${r}`, dscr: r, level, meets: c.verdict === 'meets',
    years: t.columns.flatMap((col, k) => (/^\d{4}-\d{2}$/.test(col) ? [{ label: col, text: d.values[k], n: d.n?.[k] ?? NaN }] : [])),
    cost: p.view?.tables.find((x) => x.id === 'cost')?.rows.find((x) => x.label === 'Total cost of the project')?.values[0] };
}

// ---- The planning estimate: the Pune flat ----

export const ESTIMATE_CASE: PlanState = ESTIMATE_HOME;
export const ESTIMATE_FIXED: PlanState = { ...ESTIMATE_CASE, roomLevels: { 'bedroom-1': 1, 'bedroom-2': 1 } };
/** The story's own budget, not a figure worked out. */
export const ESTIMATE_BUDGET = { n: 12_00_000, text: '12,00,000' };
export function estimateTotal(s: PlanState) {
  const v = planPreview(s).view;
  if (!v) throw new Error('The estimate case gives no total.');
  return { text: v.total, n: v.n.total, level: v.level };
}

// ---- CMA data: case W ----

export const CMA_CASE: CmaState = CMA_HOME;
/** Make it viable's capital: the least the promoters bring that meets every level missed, the engine's. */
export const CMA_FIX = (() => {
  const l = cmaViableOf(CMA_CASE)?.lines.find((x) => x.id === 'capital');
  const n = l?.move ? Number(l.move.replace(/[^\d]/g, '')) : NaN;
  if (!l?.move || !Number.isFinite(n) || n <= 0 || l.still.length) throw new Error('The CMA case is not met by capital alone.');
  return { move: l.move, n, text: l.text };
})();
export const CMA_FIXED: CmaState = applyCmaPlan(CMA_CASE, { ...CMA_AS_TYPED, capital: CMA_FIX.n }).s;
/** The CMA read: each year's current ratio (the audited years shown, not judged), the worse year ahead with its sum, and the
 *  turnover-method limit for the projection, from the check table the Excel copy redoes. */
export function cmaRead(s: CmaState) {
  const v = cmaPreview(s).view, t = v?.check, row = (label: string) => t?.rows.find((r) => r.label.startsWith(label));
  const cr = row('Current ratio'), nwc = row('Net working capital'), lim = row('The limit by the turnover method');
  if (!v || !t || !cr || !nwc || !lim) throw new Error('The CMA case gives no ratios.');
  const kinds = columnsOf(s.startYear).map((c) => (c.kind === 'audited' ? 'audited' : 'ahead'));
  const ahead = cr.n?.map((n, k) => ({ n: n ?? NaN, k })).filter((x) => kinds[x.k] === 'ahead') ?? [];
  const worst = ahead.reduce((a, x) => (x.n < a.n ? x : a));
  const fys = columnsOf(s.startYear).map((c) => c.fy), fy = fys[worst.k], ca = CA(s, worst.k), cl = CL(s, worst.k);
  return {
    years: fys.map((col, k) => ({ label: col, text: cr.values[k], n: cr.n?.[k] ?? NaN, judged: kinds[k] === 'ahead' })),
    worst: { fy, text: cr.values[worst.k], n: worst.n, sum: `${fy}  ${ca} ÷ ${cl} = ${cr.values[worst.k]}` },
    limit: { fy: fys.at(-1) as string, text: lim.values.at(-1) as string },
    meets: worst.n >= LEVEL_CR.n - 1e-9,
  };
}
/** A fresh limit's current ratio, the level the engine reads case W against (engine/data/ratios.json). */
const LEVEL_CR = (() => {
  const v = cmaViable(inputOf(CMA_CASE), 'fresh'), k = 'diagnosis' in v ? v.diagnosis.checks.find((c) => c.id === 'currentRatio') : undefined;
  if (!k) throw new Error('The CMA case reads no current ratio.');
  return { n: k.level, text: k.level.toFixed(2) };
})();
/** The current assets and liabilities of year `k`, as Form IV prints them. */
const formRow = (s: CmaState, k: number, label: string) => {
  const v = cmaPreview(s).view, r = v?.tables.flatMap((x) => x.rows).find((x) => x.label === label);
  if (!r) throw new Error(`The CMA has no row "${label}".`);
  return r.values[k];
};
const CA = (s: CmaState, k: number) => formRow(s, k, 'Total current assets');
const CL = (s: CmaState, k: number) => formRow(s, k, 'Total current liabilities');

// ---- The intros ----

/** A bar of an intro's chart: a year (or the total) and its figure; `judged` false for a year shown but not read. */
export interface IntroBar { label: string; text: string; n: number; judged: boolean; meets: boolean }
/** One reading: the bars against the level, the lowest year's sum and the verdict. */
export interface IntroPhase { bars: IntroBar[]; sum: string; meets: boolean; verdict: string }
export interface Intro {
  id: 'dscr' | 'report' | 'estimate' | 'cma';
  /** The tool's name, what it gives and for whom, from site.ts and in plain words. */
  name: string; gives: string; forWhom: string;
  /** The terminal's title, its command, the inputs typed, and the line while it works. */
  title: string; command: string; inputs: [string, string][]; working: string;
  /** The level the bars are read against: `at` least (a ratio) or most (a budget). */
  level: { n: number; text: string; word: string; at: 'least' | 'most' };
  typed: IntroPhase; fix: string; fixed: IntroPhase;
  /** A line the case adds beside the verdict, such as the CMA's limit. */
  aside?: string;
  go: { href: string; text: string };
}
const tool = (href: string) => {
  const t = READY.find((r) => r.href === href);
  if (!t) throw new Error(`No tool at ${href}.`);
  return t;
};
const judge = (n: number, level: number, at: 'least' | 'most') => (at === 'least' ? n >= level - 1e-9 : n <= level + 1e-9);
const yearsOf = (instalments: string) => `${Number(instalments) / 12} years`;

const DSCR_INTRO: Intro = (() => {
  const l = STORY_CASE.loan, level = { n: Number(STORY_TARGET.minimum), text: STORY_TARGET.minimum, word: 'target', at: 'least' as const };
  const phase = (s: State, f: StoryFrame): IntroPhase => ({
    bars: f.years.map((y) => ({ label: y.fy, text: y.dscr, n: y.n, judged: true, meets: y.meets })),
    sum: dscrSum(s, f), meets: f.meets, verdict: f.meets ? 'Passes' : `Below target ${level.text}`,
  });
  return {
    id: 'dscr', name: tool('/dscr/').name, gives: 'Seven answers give the statement a lender reads, year by year, and whether the loan passes.',
    forWhom: 'For a shop owner, a firm or its CA, before the bank sees it.',
    title: 'dscr · case S (fictional)', command: '$ dscr --case S',
    inputs: [['borrower', 'A firm'], ['profit / yr', `Rs. ${STORY_CASE.cells.pbdit?.[0]}`], ['growth', `${STORY_CASE.rates.pbdit}%`], ['EMIs now', 'None'],
      ['loan', `Rs. ${l.amount}`], ['rate', `${l.ratePct}%`], ['term', `${l.instalments} instalments (${yearsOf(l.instalments)})`]],
    working: `› working ${yearsOf(l.instalments)}, month by month`,
    level, typed: phase(STORY_CASE, STORY_TYPED),
    fix: `› make it viable · term → ${STORY_FIXED.loan.instalments} instalments`, fixed: phase(STORY_FIXED, STORY_LONGER),
    go: { href: '/dscr/?case=home', text: 'Open the DSCR statement with this case' },
  };
})();

const REPORT_INTRO: Intro = (() => {
  const l = REPORT_CASE.loan, weak = reportSum(REPORT_CASE), fixed = reportSum(REPORT_FIXED);
  if (!weak.cost) throw new Error('The report case gives no project cost.');
  const level = { n: Number(weak.level), text: weak.level, word: 'level', at: 'least' as const };
  const phase = (r: ReturnType<typeof reportSum>): IntroPhase => ({
    bars: r.years.map((y) => ({ ...y, judged: true, meets: judge(y.n, level.n, 'least') })),
    sum: r.text, meets: r.meets, verdict: r.meets ? 'Passes' : `Below level ${level.text}`,
  });
  return {
    id: 'report', name: tool('/project-report/').name, gives: 'What the project costs, how it is paid for and whether it can repay, every figure worked out twice.',
    forWhom: 'For a business starting or growing a unit, and the CA who prepares its papers.',
    title: 'project report · case R (fictional)', command: '$ project-report --case R',
    inputs: [['borrower', 'A firm'], ['project cost', `Rs. ${weak.cost}`],
      ['loan', `Rs. ${l.amount}`], ['rate', `${l.ratePct}%`], ['term', `${l.instalments} instalments`], ['sales, year 1', `Rs. ${REPORT_FIX.from}`],
      ['variable costs', `${REPORT_CASE.variablePct}% of sales`], ['fixed costs', `Rs. ${REPORT_CASE.fixed} a year`]],
    working: '› working the projected accounts, year by year',
    level, typed: phase(weak),
    fix: `› make it viable · sales ${REPORT_FIX.move} → Rs. ${REPORT_FIX.sales}`, fixed: phase(fixed),
    go: { href: '/project-report/?case=home', text: 'Open the project report with this case' },
  };
})();

const ESTIMATE_INTRO: Intro = (() => {
  const s = ESTIMATE_CASE, at = estimateTotal(s), fixed = estimateTotal(ESTIMATE_FIXED), b = ESTIMATE_BUDGET;
  const level = { n: b.n, text: b.text, word: 'budget', at: 'most' as const };
  const phase = (t: ReturnType<typeof estimateTotal>, label: string): IntroPhase => {
    const meets = judge(t.n, b.n, 'most');
    return { bars: [{ label, text: t.text, n: t.n, judged: true, meets }], sum: `total  ${t.text}`, meets, verdict: meets ? 'Within budget' : `Over budget ${b.text}` };
  };
  return {
    id: 'estimate', name: tool('/estimate/').brief ?? tool('/estimate/').name, gives: 'What the work should cost, room by room at five quality levels, before you collect quotes.',
    forWhom: 'For a family building, renovating or doing up interiors.',
    title: 'estimate · a Pune flat (fictional)', command: '$ estimate --flat pune',
    inputs: [['work', 'Renovate'], ['home', 'A flat'], ['city', 'Pune'], ['carpet area', `${s.area} sq ft`], ['rooms', `${s.bhk}BHK`], ['level', at.level], ['budget', `Rs. ${b.text}`]],
    working: '› pricing each room at the level chosen',
    level, typed: phase(at, `${at.level} everywhere`),
    fix: '› bring it within budget · Basic in the two bedrooms', fixed: phase(fixed, 'Basic bedrooms'),
    go: { href: '/estimate/?case=home', text: 'Open the estimate with this case' },
  };
})();

const CMA_INTRO: Intro = (() => {
  const r = cmaRead(CMA_CASE), f = cmaRead(CMA_FIXED), level = { n: LEVEL_CR.n, text: LEVEL_CR.text, word: 'level', at: 'least' as const };
  const phase = (x: ReturnType<typeof cmaRead>): IntroPhase => ({
    bars: x.years.map((y) => ({ ...y, meets: judge(y.n, level.n, 'least') })),
    sum: x.worst.sum, meets: x.meets, verdict: x.meets ? 'Passes' : `Below level ${level.text}`,
  });
  const v = CMA_CASE.figures;
  return {
    id: 'cma', name: tool('/cma/').name, gives: 'Forms I to VI, the ratios and the limit by the turnover method, from five years’ figures.',
    forWhom: 'For a business asking for cash credit or renewing it, and its CA.',
    title: 'cma · case W (fictional)', command: '$ cma --case W',
    inputs: [['business', 'Electrical goods, wholesale'], ['years', `${r.years[0].label} to ${r.years.at(-1)?.label}, 3 audited`], ['sales, first year', `Rs. ${v.a1.sales}`],
      ['sales, projected', `Rs. ${v.proj.sales}`], ['limit now', `Rs. ${CMA_CASE.existingLimit}`], ['asking', 'A larger limit']],
    working: '› working Forms I to VI and the ratios',
    level, typed: phase(r), aside: `› limit by the turnover method, ${r.limit.fy}: Rs. ${r.limit.text}`,
    fix: `› make it viable · capital ${CMA_FIX.move}`, fixed: phase(f),
    go: { href: '/cma/?case=home', text: 'Open CMA data with this case' },
  };
})();

/** Home's tools in the order of the site's list (site.ts), each once (D-UX-114). */
export const INTROS: Intro[] = READY.map((t) => [DSCR_INTRO, ESTIMATE_INTRO, REPORT_INTRO, CMA_INTRO].find((i) => tool(i.go.href.split('?')[0]).href === t.href) as Intro);
