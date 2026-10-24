/**
 * Home's four intros (HOME1b, D-UX-114, D-UX-115): each tool types one fictional case on a terminal on the ink desk, the
 * inputs resolving, the years read against the lender's level, the verdict, Make it viable's change and the same reading
 * passing. Every figure is the engine's, worked out when the page is built, never here; tests/home-story.test.ts holds
 * them to the same cases worked by hand. Each intro's button opens its tool filled with the case (`?case=home`, the
 * cases in each tool's `home-case.ts`).
 */
import { dscrCaseOf, preview, type State } from '../dscr/model';
import { statementDoc } from '../dscr/document';
import { planCheck } from '../../../engine/dscr-check';
import { todayIso } from '../../../engine/review';
import { dscrViableOf } from '../dscr/levers';
import { door, DSCR_HOME } from '../dscr/home-case';
import { preview as reportPreview, viableOf, type ReportState } from '../report/model';
import { REPORT_HOME } from '../report/home-case';
import { planPreview, type PlanState } from '../estimate/plan-model';
import { ESTIMATE_HOME } from '../estimate/home-case';
import { columnsOf, inputOf, preview as cmaPreview, type CmaState } from '../cma/model';
import { cmaDoc } from '../cma/document';
import { reportDoc } from '../report/document';
import { planDoc } from '../estimate/plan-document';
import { inputOf as planInputOf } from '../estimate/plan-model';
import { architectCheck } from '../../../engine/architect-check';
import { applyCmaPlan, cmaViableOf } from '../cma/levers';
import { CMA_AS_TYPED, cmaViable } from '../../../engine/cma-plan';
import { CMA_HOME } from '../cma/home-case';
import { READY } from '../site';
import { lakhCrore } from '../../../engine/util';
import { parseAmount } from '../../../engine/parse';

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

/** A tool's block on home: its name, what it gives, for whom, and the button that opens it with the case; its story is
 *  its scene (SCENES, below). */
export interface Intro {
  id: 'dscr' | 'report' | 'estimate' | 'cma';
  /** The tool's name, what it gives and for whom, from site.ts and in plain words. */
  name: string; gives: string; forWhom: string;
  go: { href: string; text: string };
}
const tool = (href: string) => {
  const t = READY.find((r) => r.href === href);
  if (!t) throw new Error(`No tool at ${href}.`);
  return t;
};
const judge = (n: number, level: number, at: 'least' | 'most') => (at === 'least' ? n >= level - 1e-9 : n <= level + 1e-9);
/** An amount as typed or printed ("12,00,000", "18 L"), in lakh and crore for home (NUM1, D-UX-115); sums stay in full. */
const lc = (typed: string | undefined) => {
  const n = typed === undefined ? undefined : parseAmount(typed);
  if (n === undefined) throw new Error(`The story has no amount in "${typed}".`);
  return lakhCrore(n);
};

const DSCR_INTRO: Intro = {
  id: 'dscr', name: tool('/dscr/').name, gives: 'Seven answers give the statement a lender reads, year by year, and whether the loan passes.',
  forWhom: 'For a shop owner, a firm or its CA, before the bank sees it.',
  go: { href: '/dscr/?case=home', text: 'Open the DSCR statement with this case' },
};
const REPORT_INTRO: Intro = {
  id: 'report', name: tool('/project-report/').name, gives: 'What the project costs, how it is paid for and whether it can repay, every figure worked out twice.',
  forWhom: 'For a business starting or growing a unit, and the CA who prepares its papers.',
  go: { href: '/project-report/?case=home', text: 'Open the project report with this case' },
};
const ESTIMATE_INTRO: Intro = {
  id: 'estimate', name: tool('/estimate/').brief ?? tool('/estimate/').name, gives: 'What the work should cost, room by room at five quality levels, before you collect quotes.',
  forWhom: 'For a family building, renovating or doing up interiors.',
  go: { href: '/estimate/?case=home', text: 'Open the estimate with this case' },
};
const CMA_INTRO: Intro = {
  id: 'cma', name: tool('/cma/').name, gives: 'Forms I to VI, the ratios and the limit by the turnover method, from five years’ figures.',
  forWhom: 'For a business asking for cash credit or renewing it, and its CA.',
  go: { href: '/cma/?case=home', text: 'Open CMA data with this case' },
};

/** Home's tools in the order of the site's list (site.ts), each once (D-UX-114). */
export const INTROS: Intro[] = READY.map((t) => [DSCR_INTRO, ESTIMATE_INTRO, REPORT_INTRO, CMA_INTRO].find((i) => tool(i.go.href.split('?')[0]).href === t.href) as Intro);

// ---- The four scenes in look C (HOME1d, HOME1e; D-UX-122 to D-UX-125, D-UX-135): each tool's whole story in five beats ----

/** A row's figure: as typed or after the change; `from`, where a running total starts (the estimate's trades). */
export interface SceneFig { text: string; n: number; meets: boolean; from?: number }
/** A row of the panel: a year, a trade or the total; `typed` absent for a year the typed case does not reach; `judged`
 *  false for a year shown but not read against the level (the CMA's audited years), named by its `tag`. */
export interface SceneRow { label: string; tag?: string; judged: boolean; typed?: SceneFig; fixed: SceneFig }
/** One beat: its name on the rail and the caption under the picture, which is also the screen reader's text. */
export interface SceneBeat { name: string; caption: string }
/** A tool's story as the scene tells it: what the borrower types, what the tool works out, the change that passes and the
 *  document they take, every figure the engine's and every statement line read off the document built for the case. */
export interface ToolScene {
  id: Intro['id'];
  /** The answers as cards, the one with `to` the change; and the list's name for a screen reader. */
  inputs: { k: string; v: string; to?: string }[]; inputsLabel: string;
  /** The level the rows are read against (`at` least or most), its words on the panel, and where it sits on a track. */
  level: { text: string; n: number; label: string; at: 'least' | 'most'; place: number };
  /** The hub: what the tool works through, before and after the change. */
  hub: { from: string; to: string; unit: string; work: string };
  panel: string; rows: SceneRow[];
  /** The weakest row's index, as typed and after the change. */
  weakest: { typed: number; fixed: number };
  /** The weakest row's sum: its heading, then the sum with its result apart. */
  sum: { typed: { head: string; lead: string; result: string }; fixed: { head: string; lead: string; result: string } };
  chip: { typed: string; fixed: string };
  statement: { title: string; sub: string; verdict: string; lines: { head: string; text: string }[]; files: string[]; ready: string };
  beats: SceneBeat[];
}

/** "2030-31  3,21,236 ÷ 3,20,320 = 1.00" as the sum's heading (with what is divided) and the sum, its result apart. */
const sumOf = (text: string, what: string) => {
  const [fy, sum] = text.split(/ {2}/), m = sum?.match(/^(.*= )([\d.]+)$/);
  if (!fy || !m) throw new Error(`The scene has no sum in "${text}".`);
  return { head: `${fy}: ${what}`, lead: m[1], result: m[2] };
};
/** A document's part by name, and its blocks of a kind. */
type DocOf = NonNullable<ReturnType<typeof statementDoc>>;
const partOf = (doc: DocOf | undefined, name: string) => doc?.parts.find((x) => x.name === name);
const blocksOf = <K extends DocOf['parts'][number]['blocks'][number]['kind']>(doc: DocOf | undefined, kind: K) =>
  (doc?.parts.flatMap((x) => x.blocks) ?? []).filter((b): b is Extract<typeof b, { kind: K }> => b.kind === kind);
const TWICE = 'every figure worked out twice';
/** A count of two to ten in words, as a caption says it. */
const said = (n: number, cap = false) => {
  const w = ['two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'][n - 2];
  if (!w) throw new Error(`No word for ${n}.`);
  return cap ? w[0].toUpperCase() + w.slice(1) : w;
};
/** A row of years from two readings of the same years. */
const yearRows = (typed: { label: string; text: string; n: number; judged?: boolean }[], fixed: typeof typed, level: number, at: 'least' | 'most') =>
  fixed.map((y, i): SceneRow => {
    const t = typed[i], judged = y.judged ?? true;
    if (t && t.label !== y.label) throw new Error('The change starts in another year.');
    return { label: y.label, ...(judged ? {} : { tag: 'audited' }), judged, fixed: { text: y.text, n: y.n, meets: judge(y.n, level, at) },
      ...(t ? { typed: { text: t.text, n: t.n, meets: judge(t.n, level, at) } } : {}) };
  });
/** The index of a judged row with the least (or most) figure. */
const weakestOf = (rows: SceneRow[], k: 'typed' | 'fixed', at: 'least' | 'most') => rows.reduce((w, r, i) => {
  const x = r[k], y = w < 0 ? undefined : rows[w][k];
  return !r.judged || !x ? w : !y || (at === 'least' ? x.n < y.n : x.n > y.n) ? i : w;
}, -1);

export const DSCR_SCENE: ToolScene = (() => {
  const l = STORY_CASE.loan, f = STORY_FIXED.loan, T = STORY_TYPED, L = STORY_LONGER;
  const level = { text: STORY_TARGET.minimum, n: Number(STORY_TARGET.minimum), label: `target ${STORY_TARGET.minimum}`, at: 'least' as const, place: 0.45 };
  if (T.meets || !L.meets || !L.years.every((y) => y.meets)) throw new Error('The scene needs a case that misses and a change that passes every year.');
  const rows = yearRows(T.years.map((y) => ({ label: y.fy, text: y.dscr, n: y.n })), L.years.map((y) => ({ label: y.fy, text: y.dscr, n: y.n })), level.n, 'least');
  // The document as the borrower downloads it, made from the longer repayment: what the last beat shows is what it holds.
  const p = preview(STORY_FIXED), doc = statementDoc(STORY_FIXED, p, todayIso());
  const title = doc?.parts[0].blocks.find((b) => b.kind === 'title'), basis = partOf(doc, 'Basis'), schedule = partOf(doc, 'Repayment schedule');
  const dated = basis?.blocks.flatMap((b) => (b.kind === 'text' ? [b.text.match(/Dated (\d\d-\d\d-\d{4})/)?.[1]] : [])).find(Boolean);
  const months = p.schedule?.years.reduce((a, y) => a + y.months.length, 0);
  const signed = blocksOf(doc, 'signature').length > 0;
  if (!doc || title?.kind !== 'title' || !title.sub || !dated || !schedule || months !== Number(f.instalments) || !signed || !partOf(doc, 'Check')) throw new Error('The scene\'s statement lacks a part it shows.');
  // Each year's DSCR worked the second way (engine/dscr-check.ts); the largest difference, as the statement rounds a DSCR.
  const c = dscrCaseOf(STORY_FIXED), k = c && planCheck(c.proj, c.loan, c.def);
  const diff = Math.max(...L.years.map((y, i) => Math.abs(y.n - Number(k?.rows[i]?.dscr))));
  if (!k || !(diff < 0.005)) throw new Error('The two computations disagree on the scene\'s case.');
  const what = 'cash available ÷ debt service';
  return {
    id: 'dscr', inputsLabel: 'The seven answers',
    inputs: [{ k: 'Borrower', v: 'A firm' }, { k: 'Profit a year', v: lc(STORY_CASE.cells.pbdit?.[0]) }, { k: 'Growth', v: `${STORY_CASE.rates.pbdit}%` },
      { k: 'EMIs now', v: 'None' }, { k: 'Loan', v: lc(l.amount) }, { k: 'Rate', v: `${l.ratePct}%` },
      { k: 'Term', v: `${l.instalments} instalments`, to: `${f.instalments} instalments` }],
    level, hub: { from: l.instalments, to: f.instalments, unit: 'months', work: 'worked out' }, panel: 'DSCR, year by year', rows,
    weakest: { typed: rows.findIndex((r) => r.label === T.lowestYear), fixed: rows.findIndex((r) => r.label === L.lowestYear) },
    sum: { typed: sumOf(dscrSum(STORY_CASE, T), what), fixed: sumOf(dscrSum(STORY_FIXED, L), what) },
    chip: { typed: `Below target ${level.text}`, fixed: `Meets ${level.text}` },
    statement: {
      title: 'DSCR statement', sub: title.sub, verdict: L.verdict,
      lines: [
        { head: 'Worked out twice', text: `Every DSCR worked out a second way, and again by formula in the Excel copy: difference ${diff.toFixed(2)}.` },
        { head: 'Its basis', text: `Annex 1: the rule used, with its source, dated ${dated}.` },
        { head: 'Every instalment', text: `Annex 2: the repayment schedule, all ${months} months.` },
        { head: 'Ready to sign', text: 'Signatory, date and place lines, in each copy.' },
      ],
      files: ['PDF', 'Excel', 'Word'], ready: 'Ready to take to your lender',
    },
    beats: [
      { name: 'The bank\'s question', caption: `The bank asks: does the cash cover the instalments ${level.text} times in every year, and ${STORY_TARGET.average} on average?` },
      { name: 'Seven answers', caption: 'You type seven answers. Nothing more is asked.' },
      { name: 'Every year worked out', caption: `The weakest year, ${T.lowestYear}, is ${T.lowest} against the target ${level.text}.` },
      { name: 'The change that passes', caption: `Over ${f.instalments} instalments, every year clears ${level.text}; the weakest, ${L.lowestYear}, is ${L.lowest}.` },
      { name: 'The statement for the lender', caption: 'The statement, ready to take to your lender: PDF, Excel and Word.' },
    ],
  };
})();

/** The CMA's scene (HOME1e, D-UX-138): case W, the current ratio of each year, the capital that lifts the weakest year ahead
 *  to the fresh limit's level, and the CMA data the bank reads. */
export const CMA_SCENE: ToolScene = (() => {
  const r = cmaRead(CMA_CASE), f = cmaRead(CMA_FIXED), v = CMA_CASE.figures;
  const level = { text: LEVEL_CR.text, n: LEVEL_CR.n, label: `level ${LEVEL_CR.text}`, at: 'least' as const, place: 0.8 };
  if (r.meets || !f.meets || r.worst.fy !== f.worst.fy || r.limit.text !== f.limit.text) throw new Error('The CMA scene needs a case that misses and capital that meets it.');
  const rows = yearRows(r.years, f.years, level.n, 'least'), audited = rows.filter((x) => !x.judged).length;
  const doc = cmaDoc(CMA_FIXED, cmaPreview(CMA_FIXED), todayIso()), title = doc?.parts[0].blocks.find((b) => b.kind === 'title');
  const forms = blocksOf(doc, 'heading').filter((h) => /^Form [IVX]+\. /.test(h.text)).length;
  const sure = blocksOf(doc, 'heading').some((h) => h.text === 'How sure the rules are');
  if (!doc || title?.kind !== 'title' || !title.sub || forms !== 6 || !partOf(doc, 'Check') || !partOf(doc, 'Ratios') || !sure
    || !blocksOf(doc, 'signature').length || !doc.footer?.includes(TWICE)) throw new Error('The CMA scene\'s document lacks a part it shows.');
  const what = 'current assets ÷ current liabilities', first = rows[0].label, last = rows.at(-1)?.label;
  return {
    id: 'cma', inputsLabel: 'The case\'s figures',
    inputs: [{ k: 'Business', v: 'Electrical goods' }, { k: 'Years', v: `${said(rows.length, true)}, from ${first}` }, { k: 'Audited', v: `${said(audited, true)} years` },
      { k: `Sales, ${first}`, v: lc(v.a1.sales) }, { k: `Sales, ${last}`, v: lc(v.proj.sales) }, { k: 'Limit now', v: lc(CMA_CASE.existingLimit) },
      { k: 'Promoters’ capital', v: 'As in the accounts', to: `+${lakhCrore(CMA_FIX.n)}` }],
    level, hub: { from: String(forms), to: String(forms), unit: 'forms', work: 'worked out' }, panel: 'Current ratio, year by year', rows,
    weakest: { typed: weakestOf(rows, 'typed', 'least'), fixed: weakestOf(rows, 'fixed', 'least') },
    sum: { typed: sumOf(r.worst.sum, what), fixed: sumOf(f.worst.sum, what) },
    chip: { typed: `Below level ${level.text}`, fixed: `Meets ${level.text}` },
    statement: {
      title: 'CMA data', sub: title.sub,
      verdict: `The current ratio meets ${level.text} in every year ahead; the limit by the turnover method, ${f.limit.fy}, is ${lc(f.limit.text)}.`,
      lines: [
        { head: 'Worked out twice', text: 'Every figure worked out a second way; the Excel copy’s Check sheet redoes the main ones by formula.' },
        { head: 'Forms I to VI', text: `The limit, the operating statement, the balance sheet, working capital and the funds flow, ${first} to ${last}.` },
        { head: 'Its basis', text: 'The ratios a lender reads, each rule’s level with how sure it is.' },
        { head: 'Ready to sign', text: 'Signatory, date and place lines, in each copy.' },
      ],
      files: ['PDF', 'Excel'], ready: 'Ready to take to your bank',
    },
    beats: [
      { name: 'The bank\'s question', caption: `For a larger limit, the bank reads the current ratio of each year ahead: ${level.text} at least.` },
      { name: `${said(rows.length, true)} years’ figures`, caption: `You type ${said(rows.length)} years’ figures: ${said(audited)} from the audited accounts, ${said(rows.length - audited)} ahead.` },
      { name: 'Every form worked out', caption: `Forms I to VI worked out: the weakest year ahead, ${r.worst.fy}, is ${r.worst.text} against ${level.text}.` },
      { name: 'The change that passes', caption: `With ${lakhCrore(CMA_FIX.n)} more capital from the promoters, ${f.worst.fy} is ${f.worst.text}.` },
      { name: 'The CMA data for the bank', caption: 'The CMA data, ready to take to your bank: PDF and Excel.' },
    ],
  };
})();

/** The project report's scene (HOME1e, D-UX-139): case R at 70 lakh of sales, its DSCR year by year, the sales that pass
 *  every test, and the report the lender reads. */
export const REPORT_SCENE: ToolScene = (() => {
  const l = REPORT_CASE.loan, weak = reportSum(REPORT_CASE), fixed = reportSum(REPORT_FIXED), p = reportPreview(REPORT_FIXED);
  const level = { text: weak.level, n: Number(weak.level), label: `level ${weak.level}`, at: 'least' as const, place: 0.45 };
  const average = p.checks?.find((c) => c.id === 'dscrAverage')?.level.split(' ')[0], tests = p.checks ?? [];
  if (weak.meets || !fixed.meets || !average || !tests.length || tests.some((c) => c.verdict !== 'meets')) throw new Error('The report scene needs a case that misses and sales that pass every test.');
  const rows = yearRows(weak.years, fixed.years, level.n, 'least');
  const doc = reportDoc(REPORT_FIXED, p, todayIso()), title = doc?.parts[0].blocks.find((b) => b.kind === 'title');
  const heads = blocksOf(doc, 'heading').map((h) => h.text), has = (h: string) => heads.includes(h);
  if (!doc || title?.kind !== 'title' || !title.sub?.startsWith('Project report: ') || !partOf(doc, 'Annex') || !blocksOf(doc, 'signature').length || !doc.footer?.includes(TWICE)
    || !['Projected profit and loss', 'Projected balance sheet, at each year end', 'Projected cash flow', 'Repayment of the term loan', 'How the figures are worked out'].every(has))
    throw new Error('The report scene\'s document lacks a part it shows.');
  const what = 'cash available ÷ debt service', c = REPORT_CASE.cost, typedCost = ['building', 'machinery', 'furniture', 'preliminary'] as const;
  const assets = typedCost.reduce((a, k) => a + (parseAmount(c[k]) ?? NaN), 0);
  return {
    id: 'report', inputsLabel: 'The project\'s answers',
    inputs: [{ k: 'Assets and set-up', v: lakhCrore(assets) }, { k: 'Loan', v: lc(l.amount) }, { k: 'Rate', v: `${l.ratePct}%` }, { k: 'Term', v: `${l.instalments} instalments` },
      { k: 'Variable costs', v: `${REPORT_CASE.variablePct}% of sales` }, { k: 'Fixed costs', v: `${lc(REPORT_CASE.fixed)} a year` },
      { k: 'Sales, year 1', v: lc(REPORT_FIX.from), to: lc(REPORT_FIX.sales) }],
    level, hub: { from: String(rows.length), to: String(rows.length), unit: 'years', work: 'projected' }, panel: 'DSCR, year by year', rows,
    weakest: { typed: weakestOf(rows, 'typed', 'least'), fixed: weakestOf(rows, 'fixed', 'least') },
    sum: { typed: sumOf(weak.text, what), fixed: sumOf(fixed.text, what) },
    chip: { typed: `Below level ${level.text}`, fixed: `Meets ${level.text}` },
    statement: {
      title: 'Project report', sub: title.sub.replace(/^Project report: /, ''),
      verdict: `Meets all ${said(tests.length)} tests a lender reads: the lowest DSCR is ${fixed.dscr} against ${level.text}; the project costs ${lc(fixed.cost)}.`,
      lines: [
        { head: 'Worked out twice', text: 'Every figure worked out a second way, and shown only when both agree.' },
        { head: `${said(rows.length, true)} years ahead`, text: 'Profit and loss, balance sheet and cash flow, with break-even and the key ratios.' },
        { head: 'Its basis', text: 'Annex: the loan’s repayment, the figures entered and how each is worked out.' },
        { head: 'Ready to sign', text: 'Signatory, date and place lines, in each copy.' },
      ],
      files: ['PDF', 'Excel', 'Word'], ready: 'Ready to take to your lender',
    },
    beats: [
      { name: 'The lender\'s question', caption: `For a term loan, the lender asks: does the project’s cash cover the instalments ${level.text} times in every year, and ${average} on average?` },
      { name: 'What you type', caption: 'You type what the project costs, the loan, and a year’s sales and costs.' },
      { name: `${said(rows.length, true)} years projected`, caption: `The first year, ${weak.years[weakestOf(rows, 'typed', 'least')].label}, is ${weak.dscr} against ${level.text}.` },
      { name: 'The change that passes', caption: `With sales of ${lc(REPORT_FIX.sales)}, ${REPORT_FIX.move.replace(/^\+/, '')} more, it is ${fixed.dscr}, and all ${said(tests.length)} tests pass.` },
      { name: 'The report for the lender', caption: 'The project report, ready to take to your lender: PDF, Excel and Word.' },
    ],
  };
})();

/** The estimate's scene (HOME1e, D-UX-137): the Pune flat at Standard, its running total trade by trade against the family's
 *  budget, Basic in the two bedrooms, and the estimate they take along. */
export const ESTIMATE_SCENE: ToolScene = (() => {
  const s = ESTIMATE_CASE, a = planPreview(s).view, b = planPreview(ESTIMATE_FIXED).view, B = ESTIMATE_BUDGET;
  if (!a || !b || a.bar.length !== b.bar.length || a.bar.some((x, i) => x.id !== b.bar[i].id)) throw new Error('The estimate scene\'s trades differ.');
  const level = { text: lakhCrore(B.n), n: B.n, label: `budget ${lakhCrore(B.n)}`, at: 'most' as const, place: 0.8 };
  // Each trade's bar runs from the total before it to the total with it; the last row is the total, from nothing.
  let atA = 0, atB = 0;
  const rows: SceneRow[] = a.bar.map((x, i) => {
    const y = b.bar[i], fa = atA, fb = atB;
    atA += x.n; atB += y.n;
    return { label: x.name, judged: true, typed: { text: x.amount, n: atA, from: fa, meets: judge(atA, B.n, 'most') }, fixed: { text: y.amount, n: atB, from: fb, meets: judge(atB, B.n, 'most') } };
  });
  if (Math.abs(atA - a.n.total) > 0.5 || Math.abs(atB - b.n.total) > 0.5) throw new Error('The trades do not add up to the total.');
  rows.push({ label: 'Total', judged: true, typed: { text: a.total, n: a.n.total, meets: judge(a.n.total, B.n, 'most') }, fixed: { text: b.total, n: b.n.total, meets: judge(b.n.total, B.n, 'most') } });
  const total = rows.length - 1;
  if (rows[total].typed?.meets || !rows[total].fixed.meets) throw new Error('The estimate scene needs a total over the budget and a change within it.');
  // The document and the second computation (engine/architect-check.ts), as the estimate page shows them.
  const doc = planDoc(ESTIMATE_FIXED, planPreview(ESTIMATE_FIXED), todayIso()), title = doc?.parts[0].blocks.find((x) => x.kind === 'title');
  const diff = Math.abs(architectCheck(planInputOf(ESTIMATE_FIXED)).total - b.n.total), annex = partOf(doc, 'Detailed estimate'), assumed = partOf(doc, 'Assumptions');
  const words = blocksOf(doc, 'text').some((x) => x.text.startsWith('In words: Rupees'));
  if (!doc || title?.kind !== 'title' || !annex || !assumed || !words || !blocksOf(doc, 'signature').length || !doc.footer?.includes(TWICE) || !(diff < 0.5) || !b.range)
    throw new Error('The estimate scene\'s document lacks a part it shows.');
  const items = b.range.of, where = b.summary.split(' · ').slice(1, 5).join(' · ');
  return {
    id: 'estimate', inputsLabel: 'The six answers',
    inputs: [{ k: 'Work', v: 'Renovate' }, { k: 'Home', v: 'A flat' }, { k: 'City', v: 'Pune' }, { k: 'Carpet area', v: `${s.area} sq ft` },
      { k: 'Rooms', v: `${s.bhk} BHK` }, { k: 'Level', v: a.level }, { k: 'The two bedrooms', v: a.level, to: 'Basic' }],
    level, hub: { from: String(a.range?.of ?? items), to: String(items), unit: 'items', work: 'priced' }, panel: 'Running total, trade by trade', rows,
    weakest: { typed: total, fixed: total },
    sum: { typed: { head: `The total, against the budget of Rs. ${B.text}`, lead: 'Rs. ', result: a.total }, fixed: { head: `The total, against the budget of Rs. ${B.text}`, lead: 'Rs. ', result: b.total } },
    chip: { typed: `Over budget ${level.text}`, fixed: `Within budget ${level.text}` },
    statement: {
      title: title.text, sub: where, verdict: `Rs. ${b.total} in all, within the budget of ${level.text}, in figures and in words.`,
      lines: [
        { head: 'Worked out twice', text: `The total worked out a second way: difference Rs. ${Math.round(diff)}.` },
        { head: 'Every item', text: `Annex 1: the detailed estimate, each of the ${items} items with its quantity and rate.` },
        { head: 'What it assumes', text: 'Annex 2: every assumption, stated until you change it.' },
        { head: 'Ready to sign', text: 'Signatory, date and place lines, in each copy.' },
      ],
      files: ['PDF', 'Excel', 'Word'], ready: 'Ready for quotes and your lender',
    },
    beats: [
      { name: 'The family\'s question', caption: `A family has ${level.text} to do up a ${s.bhk} BHK flat in Pune: what will the work cost?` },
      { name: 'Six answers', caption: 'You answer six questions. Nothing more is asked.' },
      { name: 'Every trade priced', caption: `${items} items priced, trade by trade: at ${a.level} the total is ${lakhCrore(a.n.total)}, over the budget.` },
      { name: 'The change that fits', caption: `Basic in the two bedrooms: ${lakhCrore(b.n.total)}, within the budget.` },
      { name: 'The estimate to take along', caption: 'The estimate, ready for quotes and your lender: PDF, Excel and Word.' },
    ],
  };
})();

/** Home's scenes by tool. */
export const SCENES: Record<Intro['id'], ToolScene> = { dscr: DSCR_SCENE, cma: CMA_SCENE, report: REPORT_SCENE, estimate: ESTIMATE_SCENE };
