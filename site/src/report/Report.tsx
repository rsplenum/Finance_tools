/**
 * The project report for a term loan with working capital. Who the borrower is (it sets the tax); the cost of the
 * project by head; the term loan and any other funds (the promoters' share is worked out); the loan's terms; sales and
 * costs; working capital. Then the report as the engine works it out, provisional while anything is missing, table by
 * table; what it assumes until changed; and the three downloads. Figures: engine/report.ts only, via model.ts.
 */
import { Fragment, type ComponentChildren } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { parseMonth } from '../../../engine/parse';
import { SOLD_BY, soldBy } from '../../../engine/sold-by';
import { verdictWords, workWords } from '../verdict';
import { Paper, sheetId, still } from '../Paper';
import { answerRule, BUTTON, reach, Choice, Counter, Dash, FILLED, goTo, HINT, How, Ledger, SelectField, STATE, TextField, Tick, InAppNote, Verdict, useHomeCase, useStart, StartLine, MoreOptions, useKept } from '../fields';
import { W } from './words';
import { SHARED } from '../words';
import { REPORT_HOME } from './home-case';
import { reportExample } from './example';
import { Bar, Benchmarks, Lever, PlanLever, targetOf } from '../Board';
import { benchmarkFields, inSentence, listed, withBenchmark } from '../board-model';
import { printable } from '../doc/face';
import { sectionPages } from '../doc/layout';
import { isoDate } from '../download';
import { monthText } from '../dscr/model';
import { overdueNote, todayIso } from '../../../engine/review';
import { sureLower, type Marked } from '../../../engine/sure';
import { allNeeds, docNeeds, docStatus, fileName, paperDoc, PARTS, reportDoc } from './document';
import { Words } from './Words';
import { FixIt } from './FixIt';
import { CheckStep } from '../CheckStep';
import { Downloads } from '../Downloads';
import {
  CGFMU, CGTMSE, MUDRA, PMEGP, PMEGP_SHED, REPORT_REVIEW_BY, pmegpConditions, ACTIVITY_CHOICES, AREA_CHOICES, BORROWER_CHOICES, CATEGORY_CHOICES, EMPTY, HEADS, NO_PRODUCT, REPAYMENT_CHOICES, SCHEME_CHOICES,
  COST_HEADS, MODE_CHOICES, SECURITY_CHOICES, SIMPLE_COST, WC_CHOICES, changedOf, headsSum, holidayAssumed, periodLine, repaymentView, wcByOf, withMode, workedLine, type Mode,
  AS_TYPED, COLLATERAL_HINT, withProperty, amountOf, applyPlan, applySolution, assumptionsOf, boardOf, applyWay, answerPending, PENDING, workView, guaranteeOf, mudraLine, plainOf, planOf, preview, sameLevers, statusText, tarunAsked, tidyAmount, undoPlan, viableOf,
  checkKey, checkOf, carryView, applyCloser, type CarryCloser, type CarryView, type FixCard, type LeverId, type Levers, type PlanChange, type WorkCard, type WorkView, type PlanView, type ReportFacts, type ReportPreview, type ReportState,
  type ViableView, type ViewRow, type ViewTable,
} from './model';

type Update = (f: (s: ReportState) => ReportState) => void;
const MUTED = 'text-ink-muted';
const SALES_BY: { value: ReportState['salesBy']; label: string }[] = [
  { value: 'drivers', label: 'Each product: how many a month and its price' }, { value: 'typed', label: 'Sales I type, with their growth' },
  { value: 'expansion', label: 'Today\'s sales and a new line' }];
const bad = (t: string, read: (t: string) => unknown) => !!t.trim() && read(t) === undefined;
const notUnderstood = (t: string, read: (t: string) => unknown, example: string) => (bad(t, read) ? `Not understood. Type ${example}.` : undefined);
/** A control that removes itself hands the focus on, after the render (WCAG 2.4.3; docs/DESIGN.md, Focus). */
const focusNext = (sel: string) => requestAnimationFrame(() => document.querySelector<HTMLElement>(sel)?.focus());
// The box that changes an assumption, if one does (review finding 8); in simple mode, it opens expert mode first.
const ASSUMED_BOX: Record<string, string> = {
  days: 'fld-days-stock', utilisation: 'fld-utilisation', price: 'fld-priceGrowth', simpleCost: 'fld-cost-land', simpleFunds: 'fld-unsecured', simpleDrawn: 'fld-tl-disbursed',
  simpleMoratorium: 'fld-tl-moratorium', simpleFixedGrowth: 'fld-fixedGrowth', simpleWcRate: 'fld-wcRate',
};
/** Of those, the boxes simple mode asks too (OR5: the holiday), reached without switching. */
const IN_SIMPLE = new Set(['fld-tl-moratorium']);
/** The box each of the engine's needs is typed in, by the first words of the need (engine/report.ts, and model.ts's words
 * in simple mode): each missing figure is a link to its box (UX8, review finding 2), in expert mode when only it has one. */
const BOXES: [string, string][] = [
  ['When you will start selling', 'fld-sellFrom'], ['Repayment period after the holiday', 'fld-years'], ['Holiday before the first instalment', 'fld-tl-moratorium'], ['Fixed costs a month', 'fld-fixedMonth'], ['What backs the loan', 'fld-security'],
  ['The working-capital limit: worked', 'fld-wcBy'], ['The working-capital limit worked', 'fld-wcBy'], ['Costs by head', 'rep-heads'],
  ['Who the borrower', 'fld-borrower'], ['Cost of the project', 'cost'], ['The term loan: its amount', 'fld-tl-amount'],
  ['The term loan: its interest', 'fld-tl-rate'], ['The term loan: the month', 'fld-tl-disbursed'], ['The term loan: the moratorium', 'fld-tl-moratorium'],
  ['The term loan: the number', 'fld-tl-instalments'], ['The term loan: how', 'fld-tl-repayment'], ['Capital subsidy', 'fld-subsidy'],
  ['Unsecured', 'fld-unsecured'], ['Sales in', 'fld-sales'], ['Sales: growth', 'fld-salesGrowth'], ['Use of the capacity', 'fld-utilisation'], ['The price: growth', 'fld-priceGrowth'],
  ['Today\'s sales in', 'fld-sales'], ['Today\'s sales: growth', 'fld-salesGrowth'], ['The new line: its use', 'fld-utilisation'], ['The new line: its price\'s growth', 'fld-priceGrowth'],
  ['Months from', 'fld-monthsToStart'], ['PMEGP: the borrower', 'fld-category'], ['PMEGP: a town', 'fld-area'], ['PMEGP: manufacturing', 'fld-activity'],
  ['Materials', 'fld-variablePct'], ['Fixed costs in', 'fld-fixed'], ['Fixed costs: growth', 'fld-fixedGrowth'], ['Days of stock', 'fld-days-stock'],
  ['Days of debtors', 'fld-days-debtors'], ['Days of creditors', 'fld-days-creditors'], ['The working-capital limit you will ask for', 'fld-wcLimit'],
  ['The working-capital limit: its', 'fld-wcRate'], ['The collateral', 'fld-collateral'], ['Your own money kept', 'fld-cashAtStart'], ['Today\'s loans: their', 'fld-existingEmis'],
  ['The plant: what it can sell', 'fld-pending'], ['The larger plant: its cost', 'fld-pending'],
  ['Mudra: the term loan and', 'fld-tl-amount'], ['Mudra: the loans come', 'fld-tarun'], ['CGTMSE: the loans', 'fld-cgtmse'], ['CGTMSE: the collateral', 'fld-collateral'], ['The guarantee fee', 'fld-feeRate'],
];
// What a line is sold by (OR6), its picks in the engine's order.
const UNIT_PICKS = SOLD_BY.map((u) => ({ value: u.id, label: u.label }));
// A product's line (D-UX-109): "Sales, line 2: the price a unit" is the price's box on the second line.
const LINE_FACT: [string, string][] = [['what', 'name'], ['how many', 'units'], ['the price', 'price']];
const boxOf = (need: string): [string, string] | undefined => {
  const m = /^(?:Sales, line|The new line, product) (\d+): (.*)$/.exec(need), fact = m && LINE_FACT.find(([w]) => m[2].startsWith(w));
  return fact ? [need, `fld-product-${Number((m as RegExpExecArray)[1]) - 1}-${fact[1]}`] : BOXES.find(([w]) => need.startsWith(w));
};
/** The document's own facts and their boxes, among the questions (D-UX-216); the report's words land on the download. */
const DOC_BOXES: [string, string][] = [['The business’s name', 'fld-rep-name'], ['What the business does', 'fld-rep-activity'],
  ['The business’s address', 'fld-rep-address'], ['The lender', 'fld-rep-lender'], ['Prepared by', 'fld-rep-preparedBy']];
const docBox = (need: string) => DOC_BOXES.find(([w]) => need.startsWith(w))?.[1];
/** A fact the document still needs, a link to its box when it has one. */
const docItem = (n: string) => {
  const to = docBox(n);
  return <li key={n}>{to ? <a href={`#${to}`} onClick={goTo(to)} class="inline-flex min-h-6 items-center text-link">{n}</a> : n}</li>;
};
/** "Answer it" beside the status (OR3, the owner's O7): the first question with a box, then the document's own facts,
 * which stand among the questions (the owner: three left that could not be seen); all answered, the check until done. */
function goOf(s: ReportState, p: ReportPreview, toBox: (need: string) => (e: Event) => void, ok: boolean) {
  const n = p.needs.find((x) => boxOf(x));
  if (n) return { to: (boxOf(n) as [string, string])[1], what: n, onClick: toBox(n) };
  if (p.needs.length || !p.view || p.blocked) return undefined;
  const d = docNeeds(s.doc, s.words)[0], to = d && (docBox(d) ?? (ok ? 'download' : undefined));
  if (to) return { to, what: d, onClick: goTo(to) };
  // All questions answered, the check is a step of its own, not a question left (OR11's O1).
  return ok ? undefined : { to: 'check', label: 'check your figures before the download' };
}
/** One tone a meaning (docs/archive/DESIGN-SITE.md, Colours): good meets, warn provisional, bad misses. */

/** The answer in words (review finding 3): the model's own sentence when a level misses; else what meets and what it cannot
 * read yet. Words only, from the model's checks; no figure. */
function verdictOf(p: ReportPreview): { head: string; work: string; text: string; tone: 'good' | 'warn' | 'bad' } | undefined {
  if (!p.view || p.blocked) return undefined;
  const c = p.checks ?? [], named = (v: string) => c.filter((k) => k.verdict === v).map((k) => inSentence(k.label));
  const wait = named('wait'), missed = named('misses').length, head = verdictWords('benchmark', c.length, missed, wait.length);
  const work = workWords(missed, wait.length, p.runsOut);
  if (p.misses) return { head, work, text: p.misses, tone: 'bad' };
  const whose = p.benchmarks ? ', yours where you changed them' : '';
  return wait.length ? { head, work, text: `${head}${whose}: ${listed(wait)}.`, tone: 'warn' } : { head, work, text: `${head}${whose}.`, tone: 'good' };
}

/** The answer bar's words (D-UX-84): the lowest DSCR as the model gives it, the verdict and the status, counting the
 * document's own facts as its file does (UXR3, UXR1's S4). */
function barText(s: ReportState, p: ReportPreview, c?: CarryView) {
  if (p.blocked || !p.view) return statusText(p);
  const lowest = p.view.key.find((k) => k.check === 'dscrLowest');
  const said = p.checks?.length ? verdictOf(p)?.work : undefined;
  // What the business carries leads once worked (CAP1); the lowest DSCR stands in while it is.
  return [c ? c.bar : lowest && `Lowest DSCR ${lowest.value}`, said, docStatus(s, p)].filter(Boolean).join(' · ');
}

/** The builder's steps (BUILD1, D-UX-340): one topic a step, in the order a report is made. */
const STEPS = [['business', 'The business'], ['cost', 'The cost'], ['loan', 'The loan'], ['sales', 'Sales and costs'], ['check', 'Check'], ['download', 'Download']] as const;
type StepId = typeof STEPS[number][0];
/** The step last open on this device, beside the answers saved there (D-UX-341); the first step is not kept. */
const STEP_KEY = 'report-step';
const savedStep = (): StepId | undefined => { try { return localStorage.getItem('draft:report:v1') ? STEPS.find(([id]) => id === localStorage.getItem(STEP_KEY))?.[0] : undefined; } catch { return undefined; } };
const saveStep = (id: StepId) => { try { if (id === 'business') localStorage.removeItem(STEP_KEY); else localStorage.setItem(STEP_KEY, id); } catch { /* the step is a convenience */ } };
/** The step a box is asked in, by its id, for the count on the progress line; a link finds its step in the page itself. */
const stepOfBox = (id: string): StepId => /^fld-(rep-|borrower)/.test(id) ? 'business' : id === 'cost' || id.startsWith('fld-cost-') ? 'cost' : id === 'fld-pending' ? 'check'
  : /^fld-(tl-|years|scheme|category|area|activity|pmegp|tarun|subsidy|unsecured|cashAtStart|existingEmis|security|collateral|cgtmse|concession|feeRate|wc|days-)/.test(id) ? 'loan' : 'sales';
/** What each step still needs: the engine's needs by their boxes, and the first page's facts on the first step. */
function leftOf(s: ReportState, p: ReportPreview): Record<StepId, number> {
  const out: Record<StepId, number> = { business: 0, cost: 0, loan: 0, sales: 0, check: 0, download: 0 };
  for (const n of p.needs) { const b = boxOf(n); out[b ? stepOfBox(b[1]) : 'sales']++; }
  out.business += docNeeds(s.doc, s.words).filter(docBox).length;
  return out;
}
/** The part of the paper a step fills: where the paper stands while the step is open. */
const partOf = (step: StepId, figures: boolean) => ({ business: PARTS.cover, cost: PARTS.cost, loan: figures ? PARTS.repayment : PARTS.cost, sales: PARTS.basis, check: PARTS.glance, download: PARTS.cover })[step];
/** The one filled button of a step: the way on. */
const NEXT = FILLED.replace('sm:min-h-0', '');
/** A group of questions in a step: named only where the step holds more than one. */
function Group({ id, title, children }: { id: string; title?: string; children: ComponentChildren }) {
  return <section id={id} aria-labelledby={title ? `${id}-h` : undefined} class={title ? 'mt-10' : 'mt-2'}>
    {title && <h3 id={`${id}-h`} class="text-lg font-medium text-ink">{title}</h3>}
    {children}
  </section>;
}

/** The mode last picked on this device (D-UX-112): the page opens in simple mode until expert is picked. */
const MODE_KEY = 'report-mode';
const savedMode = (): Mode => { try { return localStorage.getItem(MODE_KEY) === 'expert' ? 'expert' : 'simple'; } catch { return 'simple'; } };
const saveMode = (m: Mode) => { try { localStorage.setItem(MODE_KEY, m); } catch { /* the mode is a convenience */ } };

export function ReportCalculator() {
  const [s, setS] = useState<ReportState>({ ...EMPTY, mode: 'simple' });
  useEffect(() => { if (savedMode() === 'expert') setS((x) => withMode(x, 'expert')); }, []);
  const home = useHomeCase(setS, () => REPORT_HOME);
  const update: Update = (f) => setS(f);
  const p = useMemo(() => preview(s), [s]);
  const period = useMemo(() => periodLine(s), [s]);
  const simple = s.mode === 'simple', blank = { ...EMPTY, mode: s.mode };
  const typed = JSON.stringify(s) !== JSON.stringify(blank);
  useKept('report', s, setS, blank, true);
  const toMode = (m: Mode) => { saveMode(m); update((x) => withMode(x, m)); };
  // The mode sits in More options (UXR5b, S12): open while expert, and never shut under the hand that picks Simple.
  const [more, setMore] = useState(!simple);
  useEffect(() => { if (!simple) setMore(true); }, [simple]);
  // A box only expert mode has: switch to it, then focus the box.
  // Opens the step a box is in before the focus goes to it (set once the steps are drawn, below).
  const into = useRef<(el: Element) => void>(() => {});
  const toExpert = (id: string) => (e: Event) => { e.preventDefault(); toMode('expert'); requestAnimationFrame(() => reach(id, (el) => { into.current(el); el.focus(); })); };
  // "Use this plan" (MV3): the fields it wrote, each marked with what it was, until undone or kept.
  const [used, setUsed] = useState<PlanChange[]>([]);
  const use = (l: Levers) => { const a = applyPlan(s, l); setS(a.s); setUsed(a.changes); };
  // Make it work's Use this (OR11d): one way's figures, with the same undo.
  const useWay = (w: WorkCard) => { const a = applyWay(s, w); setS(a.s); setUsed(a.changes); };
  // Fix it for me's Use this plan (FIX1): a whole plan's figures under the same undo, the banner saying the checks before and now.
  const [fixNote, setFixNote] = useState<{ on: PlanChange[]; text: string }>();
  const useFix = (c: FixCard) => { const a = applySolution(s, c); setS(a.s); setUsed(a.changes); setFixNote({ on: a.changes, text: c.counts }); focusNext('#report-h'); };
  // What the business can carry (CAP1): the whole report run a few dozen times, so worked once the figures rest, shown only
  // on the figures it was worked on; a closer's Use this goes under the same undo.
  const cbase = useMemo(() => JSON.stringify({ ...s, doc: undefined, words: undefined }), [s]);
  const [carried, setCarried] = useState<{ on: string; v: CarryView | undefined }>();
  const live = !!p.view && !p.blocked;
  useEffect(() => {
    if (!live) return;
    const t = setTimeout(() => setCarried({ on: cbase, v: carryView(s) }), 200);
    return () => clearTimeout(t);
  }, [cbase, live]);
  const cv = live && carried?.on === cbase ? carried.v : undefined;
  const useCloser = (k: CarryCloser) => { const a = applyCloser(s, k); setS(a.s); setUsed(a.changes); focusNext('#report-h'); };
  // Its question answered: the line that said it was open gives way to what the answer wrote, under the same undo.
  const answer = (t: string) => { const a = answerPending(s, t); setS(a.s); setUsed((u) => [...u.filter((c) => c.key !== 'pending'), ...a.changes]); };
  // Check and confirm (OR8): the page's own state, never the draft's (a field there drops older drafts, useKept), so a
  // reload asks again. The tables show once checked; a download only on the figures as checked.
  const key = useMemo(() => checkKey(s), [s]);
  const [checked, setChecked] = useState<string>();
  const [seen, setSeen] = useState(false);
  const ok = checked === key;
  const confirm = () => { setChecked(key); setSeen(true); focusNext('[data-testid="rep-confirmed"] > summary'); };
  const undo = () => { setS((x) => undoPlan(x, used)); setUsed([]); };
  // Clear all, with an undo until the next figure is typed (review finding 5), as on every tool (UXR5b, S16).
  const c = useStart('rep', s, setS, () => blank, () => reportExample(), () => { setUsed([]); setChecked(undefined); setSeen(false); });
  // The security cover's row links to the collateral field (review finding 4); in simple mode, property is chosen first.
  const toCollateral = (e: Event) => { e.preventDefault(); if (simple && !withProperty(s)) update((x) => ({ ...x, security: 'property' })); requestAnimationFrame(() => reach('fld-collateral', (el) => { into.current(el); el.focus(); })); };
  // A missing figure's link: to its box, in expert mode when only it has one.
  const toBox = (need: string) => (e: Event) => {
    const b = boxOf(need);
    if (!b) return;
    return document.getElementById(b[1]) ? goTo(b[1])(e) : toExpert(b[1])(e);
  };
  // The nearest plan's buttons: to the figure's box, in expert mode when only it has one.
  const toField = (id: string) => (e: Event) => (id === 'fld-collateral' ? toCollateral(e) : document.getElementById(id) ? goTo(id)(e) : toExpert(id)(e));
  const mark = (id: string, hint?: string) => { const c = used.find((u) => u.field === id); return c ? `Changed by the plan; it was ${c.was || 'empty'}.${hint ? ` ${hint}` : ''}` : hint; };
  // Each setter builds on the latest state (x), never on the one this render saw.
  const amount = (id: string, label: string, value: string, set: (x: ReportState, t: string) => ReportState, hint?: string) =>
    <TextField id={id} label={label} unit="₹" hint={mark(id, hint)} inputMode="decimal" value={value} tidy={tidyAmount}
      invalid={bad(value, amountOf)} said={notUnderstood(value, amountOf, '10,00,000 or 10 L')} onCommit={(t) => update((x) => set(x, t))} />;
  // A figure with its unit in the box and no example there (UX9, review finding 6); one the page assumes says so in the box.
  const percent = (id: string, label: string, value: string, set: (x: ReportState, t: string) => ReportState, unit?: string, assumed?: string, hint?: string) =>
    <TextField id={id} label={label} unit={unit} byDefault={assumed || undefined} hint={mark(id, hint)} inputMode="decimal" value={value}
      invalid={bad(value, plainOf)} said={notUnderstood(value, plainOf, 'a number, like 10')} onCommit={(t) => update((x) => set(x, t))} />;
  const tick = (id: string, label: string, on: boolean, set: (x: ReportState, v: boolean) => ReportState, hint?: string) =>
    <label class="mt-4 flex items-start gap-2 text-ink">
      <input id={id} type="checkbox" class="mt-1" checked={on} onChange={(e) => { const v = (e.currentTarget as HTMLInputElement).checked; update((x) => set(x, v)); }} />
      <span>{label}{hint && <span class={`block text-sm ${MUTED}`}>{hint}</span>}</span>
    </label>;
  const g = guaranteeOf(s);
  const hv = headsSum(s, 'variable'), hf = headsSum(s, 'fixed'), by = wcByOf(s), changed = changedOf(s), worked = workedLine(s);
  const sum = (testid: string, text: string) => <p data-testid={testid} class="mt-2 self-end text-ink @md:col-span-1">{text}</p>;
  const hybridBack = p.hybrid && <p data-testid="rep-hybrid" aria-live="polite" class="mt-2 text-sm text-ink">{p.hybrid}</p>;
  const collateralBox = () => amount('fld-collateral', 'Collateral: its market value', s.collateral, (x, collateral) => ({ ...x, collateral }), `Property offered beside the project's assets. ${COLLATERAL_HINT}`);
  // The builder (BUILD1, D-UX-340): one topic a step, every step in the page from load so its answers and its boxes
  // stay (rule 17's count is of them all); only the step in hand shows. The paper stands beside from 1024 px, and on a
  // phone behind "See the paper".
  const root = useRef<HTMLDivElement>(null), pane = useRef<HTMLDivElement>(null), peek = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<StepId>('business');
  // Shown at once, in the page itself, so a link's own jump and focus land on a box that is there; the state follows.
  const flip = (id: StepId, keep = true) => {
    root.current?.querySelectorAll<HTMLElement>('[data-step]').forEach((el) => { el.hidden = el.dataset.step !== id; });
    setStep(id);
    if (keep) saveStep(id);
  };
  into.current = (el) => { const at = el.closest<HTMLElement>('[data-step]'); if (at?.hidden) flip(at.dataset.step as StepId); };
  // The progress line, Back and Next: the step's heading takes the focus, and the page comes back up to the line.
  const go = (id: StepId) => {
    flip(id);
    requestAnimationFrame(() => {
      const line = root.current?.querySelector('[data-steps]');
      if (line && line.getBoundingClientRect().top < 0) line.scrollIntoView();
      document.getElementById(`step-${id}-h`)?.focus({ preventScroll: true });
    });
  };
  // A link to a box in another step opens that step first (the needs, a dash, Change, the check's lines).
  const linked = (e: MouseEvent) => {
    const a = (e.target as HTMLElement).closest?.('a[href^="#"]') as HTMLAnchorElement | null;
    const to = a && document.getElementById(decodeURIComponent(a.hash.slice(1)));
    if (to) into.current(to);
  };
  // The step last open comes back with the answers saved on this device; home's case opens on its answer.
  useEffect(() => { const t = savedStep(); if (t && !home) flip(t, false); }, []);
  useEffect(() => { if (home) flip('check', false); }, [home]);
  // The paper: the document the PDF is written from (document.ts), a draft until the figures are checked.
  const [today, setToday] = useState(''), [wide, setWide] = useState(true), [large, setLarge] = useState(false);
  useEffect(() => {
    setToday(isoDate(new Date()));
    const m = matchMedia('(min-width: 64rem)'), set = () => { setWide(m.matches); if (m.matches && peek.current?.open) peek.current.close(); };
    set();
    m.addEventListener('change', set);
    return () => m.removeEventListener('change', set);
  }, []);
  const figures = !!p.view && !p.blocked;
  const paper = useMemo(() => { const d = paperDoc(s, p, today); return ok || d.mark ? d : { ...d, mark: 'Draft' }; }, [s, p, today, ok]);
  const pages = useMemo(() => sectionPages(paper), [paper]);
  // The paper stands at the part the step fills.
  const stand = (smooth: boolean) => {
    const box = wide ? pane.current : peek.current?.querySelector<HTMLElement>('[data-paper-scroll]'), el = document.getElementById(sheetId(partOf(step, figures)));
    if (box && el) box.scrollTo({ top: box.scrollTop + el.getBoundingClientRect().top - box.getBoundingClientRect().top - 12, behavior: smooth && !still() ? 'smooth' : 'auto' });
  };
  useEffect(() => { stand(true); }, [step, wide, figures]);
  /** A tap on the paper brings it close where it was tapped, and a second tap takes it back: the phone's way to read a line. */
  const zoom = (e: MouseEvent) => {
    const box = (e.currentTarget as HTMLElement).parentElement!, sheet = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const fx = (e.clientX - sheet.left) / sheet.width, fy = (e.clientY - sheet.top) / sheet.height, x = e.clientX - box.getBoundingClientRect().left, y = e.clientY - box.getBoundingClientRect().top;
    const inner = e.currentTarget as HTMLElement;
    setLarge(!large);
    requestAnimationFrame(() => { const r = inner.getBoundingClientRect(); box.scrollTo({ left: Math.max(0, fx * r.width - x + 12), top: Math.max(0, fy * r.height - y + 12) }); });
  };
  const see = () => { peek.current?.showModal(); requestAnimationFrame(() => stand(false)); };
  const sheets = <div data-testid="rep-paper"><Paper doc={paper} pages={pages} label="Your project report so far" /></div>;
  const left = leftOf(s, p), at = STEPS.findIndex(([id]) => id === step), back = STEPS[at - 1], next = STEPS[at + 1];
  const stepOf = (id: StepId, body: ComponentChildren) => {
    const i = STEPS.findIndex(([x]) => x === id);
    return <section data-step={id} hidden={step !== id} aria-labelledby={`step-${id}-h`} class="@container">
      <p class={`text-sm ${MUTED}`}>Step {i + 1} of {STEPS.length}</p>
      <h2 id={`step-${id}-h`} tabIndex={-1} class="text-lg font-semibold text-ink outline-none new:text-title new:font-medium">{STEPS[i][1]}</h2>
      {body}
    </section>;
  };
  return <div ref={root} data-builder class="builder" onClickCapture={linked}>
    <div class="builder-ask">
      <StartLine c={c} home={home} />
      <nav aria-label="Steps" data-steps class="mt-4">
        <ol class="steps" style={{ '--n': STEPS.length, '--i': at }}>{STEPS.map(([id, name], i) => {
          const open = figures || p.needs.length ? left[id] : 0, done = id === 'check' ? ok : id !== 'download' && typed && !p.blocked && !left[id];
          return <li key={id} data-state={id === step ? 'now' : done ? 'done' : ''}>
            <button type="button" data-testid={`rep-step-${id}`} aria-current={id === step ? 'step' : undefined}
              onClick={() => go(id)}>
              {/* The name a screen reader says holds the words that show (axe: label-content-name-mismatch): "Step 1: The business, done". */}
              <span class="sr-only">Step </span>
              <span class="step-dot">{done && id !== step ? <><span aria-hidden="true">✓</span><span class="sr-only">{i + 1}</span></> : i + 1}</span>
              <span class="sr-only">: </span>
              <span class="step-name">{name}</span>
              <span class="sr-only">{done ? ', done' : open && typed ? `, ${open} still needed` : ''}</span>
            </button>
          </li>;
        })}</ol>
      </nav>
      <div class="mt-6">
        {stepOf('business', <>
          <Facts s={s} update={update} />
    <Choice name="fld-borrower" legend="Who is the borrower? It sets the tax." options={BORROWER_CHOICES} value={s.borrower} columns
      onChange={(borrower) => update((x) => ({ ...x, borrower }))} />
        </>)}
        {stepOf('cost', <Group id="cost">
      <p class={`mt-2 ${HINT}`}>{W.cost}</p>
      <div class="mt-4 grid gap-4 @md:grid-cols-2">
        {HEADS.filter((h) => !simple || SIMPLE_COST.includes(h.id)).map((h) => <Fragment key={h.id}>{amount(`fld-cost-${h.id}`, h.label, s.cost[h.id], (x, t) => ({ ...x, cost: { ...x.cost, [h.id]: t } }),
          h.id === 'building' && s.scheme === 'pmegp' ? PMEGP_SHED : undefined)}</Fragment>)}
      </div>
        </Group>)}
        {stepOf('loan', <>
          <Group id="finance">
      <p class={`mt-2 ${HINT}`}>{W.promoters}</p>
      <Choice name="fld-scheme" legend="A government scheme" options={SCHEME_CHOICES} value={s.scheme} columns
        onChange={(scheme) => update((x) => ({ ...x, scheme }))} />
      {s.scheme === 'pmegp' && <>
        <p class={`mt-2 ${HINT}`}>The margin money is worked out by the scheme's rules, the guideline of 2023: {sureLower(PMEGP as Marked)}. {overdueNote(REPORT_REVIEW_BY, todayIso())}</p>
        <Choice name="fld-category" legend="The borrower's category" options={CATEGORY_CHOICES} value={s.category}
          onChange={(category) => update((x) => ({ ...x, category }))} />
        <Choice name="fld-area" legend="Where the unit is" options={AREA_CHOICES} value={s.area} columns
          onChange={(area) => update((x) => ({ ...x, area }))} />
        <Choice name="fld-activity" legend="What it does" options={ACTIVITY_CHOICES} value={s.activity} columns
          onChange={(activity) => update((x) => ({ ...x, activity }))} />
        <p class="mt-4 font-medium text-ink">PMEGP finances the project only if each of these holds:</p>
        <ul data-testid="rep-pmegp-conditions" class="mt-2 list-disc space-y-1 pl-5 text-ink">{pmegpConditions(s).map((c) => <li key={c}>{c}</li>)}</ul>
        {tick('fld-pmegp-confirmed', 'Each of these holds for my project', !!s.pmegpConfirmed, (x, pmegpConfirmed) => ({ ...x, pmegpConfirmed }))}
      </>}
      {s.scheme === 'mudra' && <div data-testid="rep-mudra">
        <p class={`mt-2 ${HINT}`}>Mudra lends up to ₹{tidyAmount(String(MUDRA.mostInAll))} in all, the term loan and the working-capital limit together, at the bank's own rate: {MUDRA.levels.map((v) => `${v.label} up to ₹${tidyAmount(String(v.upTo))}`).join(', ')}.</p>
        <p data-testid="rep-mudra-level" class="mt-2 font-medium text-ink">{mudraLine(s)}</p>
        <p data-testid="rep-mudra-collateral" class={`mt-2 ${HINT}`}>No collateral needed up to ₹{tidyAmount(String(MUDRA.collateralFreeUpTo))}: {CGFMU.label.split(',')[0]} guarantees the loan, for a fee of {CGFMU.ratePct}% a year, in the projections as a finance cost. Apply on <a class="text-link underline underline-offset-4" href={MUDRA.apply.url} target="_blank" rel="noopener noreferrer">{MUDRA.apply.label}</a>.</p>
        {tarunAsked(s) && tick('fld-tarun', 'The borrower has taken and repaid a Tarun loan', !!s.tarunRepaid, (x, tarunRepaid) => ({ ...x, tarunRepaid }), `Only then Tarun Plus, above ₹${tidyAmount(String(MUDRA.levels[MUDRA.levels.length - 2].upTo))}.`)}
      </div>}
      <div class="mt-4 grid gap-4 @md:grid-cols-2">
        {amount('fld-tl-amount', 'Term loan you will ask for', s.loan.amount, (x, t) => ({ ...x, loan: { ...x.loan, amount: t } }))}
        {!simple && s.scheme !== 'pmegp' && amount('fld-subsidy', 'Capital subsidy, if any', s.subsidy, (x, subsidy) => ({ ...x, subsidy }))}
        {!simple && amount('fld-unsecured', 'Unsecured loans, if any', s.unsecured, (x, unsecured) => ({ ...x, unsecured }))}
        {!simple && amount('fld-cashAtStart', 'Your own money kept in the business, if any', s.cashAtStart ?? '', (x, cashAtStart) => ({ ...x, cashAtStart }),
          'Cash at the start, beyond your share of the project.')}
        {!simple && s.salesBy === 'expansion' && amount('fld-existingEmis', 'Today’s loans: their instalments a year, if any', s.existingEmis ?? '',
          (x, existingEmis) => ({ ...x, existingEmis }), 'Taken to run through the new loan.')}
      </div>
          </Group>
          <Group id="loan">
      <div class="mt-4 grid gap-4 @md:grid-cols-2">
        {percent('fld-tl-rate', 'Interest rate (% a year)', s.loan.ratePct, (x, ratePct) => ({ ...x, loan: { ...x.loan, ratePct } }), '%')}
        {/* The holiday and the repayment after it, read back in all (D-UX-174); in simple mode the holiday runs to the first
            sales until typed (D-UX-112), and the way to repay is compared below the figures (OR5). */}
        {simple ? <>
          <TextField id="fld-tl-moratorium" label="Holiday before the first instalment (months)" unit="months" byDefault={holidayAssumed(s)} keepBlank
            hint={mark('fld-tl-moratorium', 'Interest only; no instalments.')} inputMode="decimal" value={s.loan.moratoriumMonths} invalid={bad(s.loan.moratoriumMonths, plainOf)}
            said={notUnderstood(s.loan.moratoriumMonths, plainOf, 'a number, like 6')} onCommit={(moratoriumMonths) => update((x) => ({ ...x, loan: { ...x.loan, moratoriumMonths } }))} />
          {percent('fld-years', 'Repayment period after it (years)', s.years ?? '', (x, years) => ({ ...x, years }), 'years')}
        </> : <>
          <TextField id="fld-tl-disbursed" label="Month the loan is first drawn" type="month" value={s.loan.disbursed}
            said={s.loan.disbursed.trim() ? (parseMonth(s.loan.disbursed) ? monthText(parseMonth(s.loan.disbursed) as string) : 'Not understood. Type 2026-04 or Apr 2026.') : undefined}
            onCommit={(disbursed) => update((x) => ({ ...x, loan: { ...x.loan, disbursed } }))} />
          {percent('fld-tl-moratorium', 'Holiday before the first instalment (months; 0 if none)', s.loan.moratoriumMonths, (x, moratoriumMonths) => ({ ...x, loan: { ...x.loan, moratoriumMonths } }), 'months')}
          {percent('fld-tl-instalments', 'Number of instalments', s.loan.instalments, (x, instalments) => ({ ...x, loan: { ...x.loan, instalments } }))}
        </>}
      </div>
      {period && <p data-testid="rep-period" class="mt-2 text-sm text-ink">{period.text}{period.checks.map((c) =>
        <span key={c.text} class={c.within ? '' : 'text-bad'}> {c.text}</span>)}</p>}
      {!simple && <Choice name="fld-tl-repayment" legend="How it is repaid" options={REPAYMENT_CHOICES} value={s.loan.repayment}
        onChange={(repayment) => update((x) => ({ ...x, loan: { ...x.loan, repayment } }))} />}
      {simple && s.scheme !== 'mudra' && <>
        <Choice name="fld-security" legend="What backs the loan besides the project's own assets?" options={SECURITY_CHOICES} value={s.security}
          onChange={(security) => update((x) => ({ ...x, security }))} />
        {withProperty(s) && <div class="mt-4 grid gap-4 @md:grid-cols-2">{collateralBox()}</div>}
        {s.security === 'hybrid' && hybridBack}
      </>}
            {!simple && <>
              {s.scheme !== 'mudra' && <div class="mt-4 grid gap-4 @md:grid-cols-2">{collateralBox()}</div>}
      {s.scheme !== 'mudra' && tick('fld-cgtmse', 'CGTMSE guarantees the loans', !!s.cgtmse, (x, cgtmse) => ({ ...x, cgtmse }),
        `A government scheme that guarantees small-business loans. Its fee, ${CGTMSE.slabs[0].ratePct}% to ${CGTMSE.slabs[CGTMSE.slabs.length - 1].ratePct.toFixed(2)}% a year by the loans in all, goes into the projections as a finance cost. Beside collateral, it guarantees only the part the collateral does not back.`)}
      {s.scheme !== 'mudra' && s.cgtmse && <fieldset class="mt-4">
        <legend class="font-medium text-ink">Concessions that apply, each {CGTMSE.concessionPct}% off the fee</legend>
        {CGTMSE.groups.map((t, k) => <Fragment key={k}>{tick(`fld-concession-${k}`, t, !!s.concessions?.[k], (x, v) => ({ ...x, concessions: CGTMSE.groups.map((_, i) => (i === k ? v : !!x.concessions?.[i])) }))}</Fragment>)}
      </fieldset>}
      {s.scheme !== 'mudra' && s.cgtmse && hybridBack}
      {g && <div class="mt-4 grid gap-4 @md:grid-cols-2">
        {percent('fld-feeRate', 'The guarantee fee, if the lender quotes another rate (% a year)', s.feeRate, (x, feeRate) => ({ ...x, feeRate }), '%', undefined,
          g === 'cgfmu' ? `Left empty, CGFMU's ${CGFMU.ratePct}% a year.` : 'Left empty, CGTMSE’s rate for the loans in all, less the concessions ticked.')}
      </div>}
            </>}
          </Group>
          <Group id="wc" title="Working capital">
      <Choice name="fld-wcBy" legend="The working-capital limit (cash credit)" options={WC_CHOICES} value={by} columns
        onChange={(wcBy) => update((x) => ({ ...x, wcBy }))} />
      {worked && <p data-testid="rep-worked" class="mt-2 text-ink">{worked}</p>}
      <div class="mt-4 grid gap-4 @md:grid-cols-2">
        {(simple ? by === 'typed' : by !== 'worked' && by !== 'none') && amount('fld-wcLimit', 'Working-capital limit you will ask for', s.wcLimit, (x, wcLimit) => ({ ...x, wcLimit }))}
        {!simple && <>
          {percent('fld-wcRate', 'Its interest rate (% a year)', s.wcRate, (x, wcRate) => ({ ...x, wcRate }), '%')}
          {(['stock', 'debtors', 'creditors'] as const).map((k) => <Fragment key={k}>
            {percent(`fld-days-${k}`, `Days of ${k}`, s.days[k], (x, t) => ({ ...x, days: { ...x.days, [k]: t } }), 'days', EMPTY.days[k])}
          </Fragment>)}
        </>}
      </div>
      {changed.length > 0 && <div data-testid="rep-changed" class="mt-6 rounded-card bg-surface px-4 py-3">
        <p class="font-medium text-ink">Set in expert mode, and used:</p>
        <ul class="mt-2 list-disc space-y-1 pl-5 text-ink">{changed.map((c) => <li key={c}>{c}</li>)}</ul>
        <button type="button" data-testid="rep-to-expert" class="mt-2 min-h-11 text-link underline underline-offset-4" onClick={() => toMode('expert')}>Change them in expert mode</button>
      </div>}
          </Group>
        </>)}
        {stepOf('sales', <Group id="operations">
      {!simple && <Choice name="fld-salesBy" legend="Sales come from" options={SALES_BY} value={s.salesBy} columns
        onChange={(salesBy) => update((x) => ({ ...x, salesBy }))} />}
      {/* One line per product or service (D-UX-109): what it is, how many a month at full running, its price; they add up to sales. */}
      {s.salesBy !== 'typed' && <>
        {s.products.map((pr, k) => {
          const set = (f: keyof typeof pr) => (x: ReportState, t: string) => ({ ...x, products: x.products.map((q, i) => (i === k ? { ...q, [f]: t } : q)) });
          const u = soldBy(pr.unit);
          return <fieldset key={k} data-testid={`rep-product-${k}`} class="mt-4">
            <legend class="font-medium text-ink">{s.salesBy === 'expansion' ? (s.products.length > 1 ? `The new line: product or service ${k + 1}` : 'What the new line sells')
              : s.products.length > 1 ? `Product or service ${k + 1}` : 'What it sells'}</legend>
            {/* What it is sold by (OR6): the count and the price take its words; it changes no sum. */}
            <div class="mt-2 grid gap-4 @md:grid-cols-2">
              <TextField id={`fld-product-${k}-name`} label="What it is" value={pr.name} onCommit={(t) => update((x) => set('name')(x, t))} />
              <SelectField id={`fld-product-${k}-unit`} label="Sold by" value={u.id} options={UNIT_PICKS} onChange={(t) => update((x) => set('unit')(x, t))} />
              {percent(`fld-product-${k}-units`, `How many ${u.many} a month at full running`, pr.units, set('units'))}
              {amount(`fld-product-${k}-price`, `Price ${u.per}`, pr.price, set('price'))}
            </div>
            {k > 0 && <button type="button" data-testid={`rep-product-remove-${k}`} class="mt-2 min-h-11 text-link underline underline-offset-4"
              onClick={() => update((x) => ({ ...x, products: x.products.filter((_, i) => i !== k) }))}>Remove this line</button>}
          </fieldset>;
        })}
        <button type="button" data-testid="rep-product-add" class="mt-2 min-h-11 text-link underline underline-offset-4"
          onClick={() => update((x) => ({ ...x, products: [...x.products, NO_PRODUCT] }))}>Add another product or service</button>
      </>}
      {simple && s.salesBy === 'typed' && <p class="mt-4 text-ink">Sales are typed by year in expert mode.</p>}
      <div class="mt-4 grid gap-4 @md:grid-cols-2">
        {simple ? <TextField id="fld-sellFrom" label="When will you start selling?" type="month" value={s.sellFrom ?? ''}
            hint={W.holiday}
            said={s.sellFrom?.trim() ? (parseMonth(s.sellFrom) ? monthText(parseMonth(s.sellFrom) as string) : 'Not understood. Type 2027-03 or Mar 2027.') : undefined}
            onCommit={(sellFrom) => update((x) => ({ ...x, sellFrom }))} />
          : percent('fld-monthsToStart', 'Months from the loan to the first sales (0 if at once)', s.monthsToStart, (x, monthsToStart) => ({ ...x, monthsToStart }), 'months')}
        {hv ? sum('rep-variable-sum', hv) : percent('fld-variablePct', 'Materials and other variable costs (% of sales)', s.variablePct, (x, variablePct) => ({ ...x, variablePct }), '%')}
        {hf ? sum('rep-fixed-sum', hf) : simple ? amount('fld-fixedMonth', 'Fixed costs a month', s.fixedMonth ?? '', (x, fixedMonth) => ({ ...x, fixedMonth }), 'Salaries, rent and other overheads.')
          : amount('fld-fixed', 'Fixed costs in a full first year', s.fixed, (x, fixed) => ({ ...x, fixed }), 'Salaries, rent and other overheads.')}
        {!simple && percent('fld-fixedGrowth', 'Fixed costs: growth a year (%)', s.fixedGrowth, (x, fixedGrowth) => ({ ...x, fixedGrowth }), '%')}
      </div>
      {!simple && <fieldset id="rep-heads" class="mt-6">
        <legend class="font-medium text-ink">Costs by head, if you have them</legend>
        <p class={`mt-1 ${HINT}`}>{W.heads}</p>
        <div class="mt-2 grid gap-4 @md:grid-cols-2">
          {COST_HEADS.variable.map((h) => <Fragment key={h.id}>{percent(`fld-head-${h.id}`, `${h.label} (% of sales)`, s.heads?.variable?.[h.id] ?? '',
            (x, t) => ({ ...x, heads: { ...x.heads, variable: { ...x.heads?.variable, [h.id]: t } } }), '%', undefined, 'hint' in h ? h.hint : undefined)}</Fragment>)}
          {COST_HEADS.fixed.map((h) => <Fragment key={h.id}>{amount(`fld-head-${h.id}`, `${h.label} a month`, s.heads?.fixed?.[h.id] ?? '',
            (x, t) => ({ ...x, heads: { ...x.heads, fixed: { ...x.heads?.fixed, [h.id]: t } } }))}</Fragment>)}
        </div>
      </fieldset>}
      {!simple && <>
      <div class="mt-4 grid gap-4 @md:grid-cols-2">
        {s.salesBy === 'expansion' && <>
          {amount('fld-sales', 'Today\'s sales in a full first year', s.sales, (x, sales) => ({ ...x, sales }), 'What the business sells now, every month of each year, without the new line.')}
          {percent('fld-salesGrowth', 'Today\'s sales: growth a year (%)', s.salesGrowth, (x, salesGrowth) => ({ ...x, salesGrowth }), '%')}
        </>}
        {s.salesBy !== 'typed' ? <>
          <TextField id="fld-utilisation" label={s.salesBy === 'expansion' ? 'The new line\'s use by year (%)' : 'Use of the capacity by year (%)'} unit="%" byDefault={EMPTY.utilisation || undefined} hint={mark('fld-utilisation', 'One a year from the first sales, like 60, 70, 80; the last holds after.')} value={s.utilisation}
            onCommit={(utilisation) => update((x) => ({ ...x, utilisation }))} />
          {percent('fld-priceGrowth', s.salesBy === 'expansion' ? 'The price: growth a year once the line is full (%)' : 'The price: growth a year (%)', s.priceGrowth, (x, priceGrowth) => ({ ...x, priceGrowth }), '%', EMPTY.priceGrowth)}
        </> : <>
          {amount('fld-sales', 'Sales in a full first year', s.sales, (x, sales) => ({ ...x, sales }))}
          {percent('fld-salesGrowth', 'Sales: growth a year (%)', s.salesGrowth, (x, salesGrowth) => ({ ...x, salesGrowth }), '%')}
        </>}
          </div>
          </>}
        </Group>)}
        {stepOf('check', <>
          <Result s={s} p={p} cv={cv} useCloser={useCloser} update={update} use={use} useWay={useWay} useFix={useFix} toField={toField} answer={answer} used={used} counts={fixNote?.on === used ? fixNote.text : undefined} undo={undo} keep={() => setUsed([])} toCollateral={toCollateral} toBox={toBox} ok={ok} />
          {figures && <CheckStep pre="rep" groups={checkOf(s, p)} to="benchmarks" state={ok ? 'done' : checked ? 'lapsed' : 'open'}
            benchmarks={(p.checks ?? []).map((c) => ({ label: c.label, value: c.byDefault === undefined ? c.level : `${c.level}, yours (default ${c.byDefault}${c.looser ? ', looser than a bank may accept' : ''})` }))}
            confirm={seen ? 'These are right' : 'These are right: show the report'} onConfirm={confirm} />}
          {p.view && (ok || seen) && p.view.tables.map((t) => <ReportTable key={t.id} t={t} />)}
          <How><p>{SHARED.twice}</p><p>{W.bars}</p><Ledger inside id="assumed" testid="rep-assumed" rows={assumptionsOf(s).map((a) => {
            const to = ASSUMED_BOX[a.id];
            return { ...a, to, go: to && simple && !IN_SIMPLE.has(to) ? toExpert(to) : undefined };
          })} /></How>
        </>)}
        {stepOf('download', <Download s={s} p={p} update={update} ok={ok} />)}
      </div>
      {/* The mode is the report's More options (UXR1's S12, S19): under the questions of each step, closed while simple. */}
      <div hidden={at > 4}>
        <MoreOptions what="every figure, and the costs by head" open={more} onToggle={setMore}>
          <Choice name="fld-mode" legend="How much to ask" options={MODE_CHOICES} value={s.mode ?? 'expert'} columns onChange={toMode} />
        </MoreOptions>
      </div>
      {/* The answer on every step (D-UX-84), read out as it changes, with the way on: Back, the paper on a phone, Next. */}
      <div data-builder-bar class="builder-bar">
        <p data-testid="rep-answer-bar" data-answer aria-live="polite" class="text-sm font-medium text-ink">{barText(s, p, cv)}</p>
        <div class="mt-1.5 flex items-center gap-2">
          {back && <button type="button" data-testid="rep-back" class={BUTTON} onClick={() => go(back[0])}>Back</button>}
          <button type="button" data-testid="rep-peek" class={`${BUTTON} lg:hidden`} onClick={see}>See the report</button>
          {next && <button type="button" data-testid="rep-next" class={`ml-auto ${step === 'check' && figures && !ok ? BUTTON : NEXT}`} onClick={() => go(next[0])}>Next<span class="max-sm:sr-only">: {next[1]}</span></button>}
        </div>
      </div>
    </div>
    <div ref={pane} class="builder-paper" role="region" aria-label="Your report so far" tabIndex={0}>{wide && sheets}</div>
    <dialog ref={peek} data-testid="rep-peek-sheet" aria-labelledby="peek-h" class="peek">
      <div class="peek-head">
        <h2 id="peek-h" class="mr-auto font-medium text-ink">Your report so far</h2>
        <button type="button" data-testid="rep-peek-size" class={BUTTON} aria-pressed={large} onClick={() => setLarge(!large)}>Larger</button>
        <button type="button" data-testid="rep-peek-close" class={NEXT} onClick={() => peek.current?.close()}>Back to the questions</button>
      </div>
      <div data-paper-scroll class="peek-body"><div class={large ? 'peek-large' : ''} onClick={zoom}>{!wide && sheets}</div></div>
    </dialog>
  </div>;
}

const head = (label: string, key: string | number) => <p key={key} class={`pt-2 text-xs font-semibold tracking-wide uppercase ${MUTED}`}>{label}</p>;
const line = (label: string, value: string | undefined, kind: ViewRow['kind'], key: string | number) =>
  <p key={key} class={`flex justify-between gap-3 py-0.5 text-ink ${kind ? 'font-semibold' : ''}`}><span>{label}</span><span class="text-right tabular-nums">{value}</span></p>;

/** One of the report's tables as paper, its years across from 640 px; below, a card a year naming its rows (review finding 7,
 * docs/DESIGN.md, Table). The repayment's rows are its years, so a card a row; a table of one column stays a table. */
function ReportTable({ t }: { t: ViewTable }) {
  const cols = t.columns.length + 1, byRow = t.first === 'Year', cards = t.columns.length > 1;
  return <details open={t.id === 'cost' || t.id === 'finance' || t.id === 'dscr'} class="paper mt-4 rounded-card">
    <summary class="flex min-h-11 cursor-pointer items-center px-4 py-2 font-medium text-ink">{t.title}</summary>
    <div class={`overflow-x-auto px-4 pb-4 ${cards ? 'max-sm:hidden' : ''}`} tabIndex={0} role="region" aria-label={t.title}>
      <table data-testid={`rep-${t.id}`} class="w-full border-collapse text-sm">
        <thead><tr class="border-b border-line">
          <th scope="col" class="py-2 pr-3 text-left font-medium text-ink-muted">{t.first}</th>
          {t.columns.map((c) => <th key={c} scope="col" class="px-2 py-2 text-right font-medium whitespace-nowrap text-ink-muted">{c}</th>)}
        </tr></thead>
        <tbody>
          {t.rows.map((r, i) => r.kind === 'head'
            ? <tr key={i}><th colSpan={cols} scope="colgroup" class="pt-3 pb-1 text-left text-xs font-semibold tracking-wide text-ink-muted uppercase">{r.label}</th></tr>
            : <tr key={i} class={`border-b border-line ${r.kind ? 'border-t border-t-ink/25' : ''}`}>
              <th scope="row" class={`min-w-48 py-1.5 pr-3 text-left ${r.kind ? 'font-semibold' : 'font-normal'} text-ink`}>{r.label}</th>
              {r.values.map((x, k) => <td key={k} class={`px-2 py-1.5 text-right whitespace-nowrap tabular-nums ${r.kind ? 'font-semibold' : ''} text-ink`}>{x}</td>)}
            </tr>)}
        </tbody>
      </table>
    </div>
    {cards && <div class="space-y-3 px-4 pb-4 text-sm sm:hidden">
      {byRow
        ? t.rows.map((r, i) => <div key={i} data-testid={`rep-${t.id}-card-${i}`} class="rounded-control bg-surface p-3">
          <p class="font-medium text-ink">{r.label}</p>
          <div class="mt-1">{t.columns.map((c, k) => line(c, r.values[k], undefined, k))}</div>
        </div>)
        : t.columns.map((c, k) => <div key={c} data-testid={`rep-${t.id}-card-${k}`} class="rounded-control bg-surface p-3">
          <p class="font-medium text-ink">{c}</p>
          <div class="mt-1">{t.rows.map((r, i) => (r.kind === 'head' ? head(r.label, i) : line(r.label, r.values[k], r.kind, i)))}</div>
        </div>)}
    </div>}
  </details>;
}

/** Make it work (OR11d, D-UX-244 to D-UX-253), under the verdict when a level misses or cash runs out: what holds it back,
 * by cause with its ratios' bars, then the ways that keep the loan as asked, those that change it, and those that do not
 * reach behind one closed line each (D-UX-252 (3)). Use this writes a way into the answers, with an undo; a card's question
 * (the plant's sales, the larger plant's cost) may stay open, and the report stays provisional until it is answered
 * (D-UX-252 (1)). It runs the report a few hundred times, so it is worked after the figures rest. Below, under the same
 * heading: the other ratios, the ways to repay, and the sliders from the figures as typed (D-UX-182 retired). With every
 * level met, how far sales can fall (D-UX-50). The two DSCRs are read on the key figures, so their bars are not repeated. */
function Viable({ s, p, update, use, useWay, useFix, toField, answer, toCollateral }: {
  s: ReportState; p: ReportPreview; update: Update; use: (l: Levers) => void; useWay: (c: WorkCard) => void; useFix: (c: FixCard) => void;
  toField: (id: string) => (e: Event) => void; answer: (t: string) => void; toCollateral: (e: Event) => void;
}) {
  const [worked, setV] = useState<{ on: string; v: ViableView }>();
  const [planned, setPlan] = useState<{ on: string; plan: PlanView | undefined }>();
  const [lv, setLv] = useState<Levers>(AS_TYPED);
  const [touched, setTouched] = useState<LeverId[]>([]);
  const base = useMemo(() => JSON.stringify({ ...s, promotersMost: '', plantSales: '', plantCost: '' }), [s]);
  // The room and the sliders show only on the figures they were worked on, read at render: a reset in an effect ran after
  // paint and could undo a tap that landed between a figure's render and that effect (the site check's intermittent miss, UX6).
  const v = worked?.on === base ? worked.v : undefined, plan = planned?.on === base ? planned.plan : undefined;
  const replan = (ids: LeverId[], at: Levers) => {
    const q = planOf(s, Object.fromEntries(ids.map((id) => [id, at[id]])));
    setPlan({ on: base, plan: q }); setTouched(ids); if (q) setLv(q.levers);
  };
  useEffect(() => { if (plan) replan(touched, lv); }, [s.promotersMost]);
  const b = useMemo(() => (plan ? boardOf(plan, lv) : undefined), [plan, lv]);
  // Make it work (OR11d) runs the report a few hundred times (a quarter to a third of a second), so it is worked after the
  // figures rest and paint, and shown only on the figures it was worked on; the cards' questions are among them.
  const wbase = useMemo(() => JSON.stringify({ ...s, promotersMost: '' }), [s]);
  const [work, setWork] = useState<{ on: string; w: WorkView | undefined }>();
  // It shows when a level misses or cash runs out (D-UX-247): the cash way mends the second alone. The security cover is
  // set aside: its collateral note says what meets it (engine/work.ts).
  const ask = !!p.short || !!p.checks?.some((c) => c.verdict === 'misses' && c.id !== 'securityCover');
  useEffect(() => {
    if (!ask) return;
    const t = setTimeout(() => setWork({ on: wbase, w: workView(s) }), 250);
    return () => clearTimeout(t);
  }, [wbase, ask]);
  const w = ask && work?.on === wbase ? work.w : undefined;
  // The ways to repay compared (OR5): three runs of the report, worked with the figures.
  const ways = useMemo(() => (p.view ? repaymentView(s) : undefined), [base, !!p.view]);
  const move = (id: LeverId, n: number) => { setLv((l) => ({ ...l, [id]: n })); if (!touched.includes(id)) setTouched([...touched, id]); };
  const onKey = new Set(p.view?.key.map((k) => k.check).filter(Boolean));
  // The ratios under a cause in Make it work are not listed again below (D-UX-237: a figure is said once).
  const held = new Set(w?.held.flatMap((h) => h.rows.map((r) => r.id)));
  const group = (by: 'borrower' | 'lender', title?: string) => {
    const ls = v?.lines.filter((l) => l.by === by) ?? [];
    return ls.length > 0 && <>
      {title && <h4 class="mt-3 text-sm font-medium text-ink">{title}</h4>}
      <ul class="mt-2 space-y-2">{ls.map((l) => <Lever key={l.id} l={l} />)}</ul>
    </>;
  };
  const cards = (by: 'borrower' | 'lender', title: string) => {
    const cs = plan && b ? plan.cards.filter((c) => c.by === by) : [];
    return cs.length > 0 && b && <>
      <h4 class="mt-3 text-sm font-medium text-ink">{title}</h4>
      <ul class="mt-1 space-y-2">{cs.map((c) => <PlanLever key={c.id} id={c.id} head={c.head} m={b.moves[c.id]} value={lv[c.id]} set={(n) => move(c.id, n)} />)}</ul>
    </>;
  };
  const tone = (ok: boolean) => (ok ? 'text-good' : 'text-bad');
  const wayCard = (c: WorkCard, n: number, usable: boolean) => <li key={c.key} data-testid={`rep-work-${c.key}`} class="rounded-control bg-surface p-3">
    <p class="font-medium text-ink">{c.head}</p>
    <p data-testid={`rep-work-text-${c.key}`} class="mt-1 text-sm text-ink">{c.text}</p>
    {c.notes.map((t) => <p key={t} class={`mt-1 ${HINT}`}>{t}</p>)}
    <p data-testid={`rep-work-chips-${c.key}`} class="mt-1 text-sm">{c.reaches ? <span class="text-good">{n ? `Meets all ${n}` : 'Cash stays at nil or above'}</span>
      : <>{c.fixes.length > 0 && <span class="text-good">Meets {listed(c.fixes.map(inSentence))}. </span>}<span class="text-bad">Leaves {listed(c.still.map(inSentence))} short</span></>}</p>
    {c.ask && <div class="mt-2">
      <TextField id={`fld-${c.ask.id}-${c.key}`} label={c.ask.label} hint={c.ask.hint} unit="₹" inputMode="decimal" value={c.ask.value} tidy={tidyAmount}
        invalid={bad(c.ask.value, amountOf)} said={notUnderstood(c.ask.value, amountOf, '50,00,000 or 50 L')}
        onCommit={(t) => update((x) => ({ ...x, [c.ask?.id as string]: t }))} />
      <p data-testid={`rep-work-ask-${c.key}`} class={`mt-1 ${HINT}`}>{c.ask.note}</p>
    </div>}
    {usable && <button type="button" data-testid={`rep-work-use-${c.key}`} class={`mt-2 ${FILLED}`} onClick={() => useWay(c)}>Use this</button>}
  </li>;
  // The room when every level meets (D-UX-50): how far sales can fall, under the ways to repay.
  const viable = !v && <button type="button" data-testid="rep-viable" class={`mt-4 ${BUTTON}`} onClick={() => {
    const x = viableOf(s); if (x) setV({ on: base, v: x });
    // The button removes itself, so the focus moves to what replaces it (WCAG 2.4.3; DESIGN-LESSONS lesson 1).
    focusNext('[data-testid="rep-viable-box"]');
  }}>How far can sales fall?</button>;
  const pending = s.pending ? PENDING[s.pending] : undefined;
  return <div class="mt-6">
    {pending && <div data-testid="rep-pending" class="mb-4 rounded-control border-l-4 border-warn bg-surface p-3">
      <TextField id="fld-pending" label={pending.label} hint={`${W.pending} ${pending.hint}`}
        unit="₹" inputMode="decimal" value="" tidy={tidyAmount} onCommit={answer} />
    </div>}
    {ask && <div data-testid="rep-work" tabIndex={-1}>
      <h3 class="text-title text-ink">Make it work</h3>
      <p class="mt-1 text-sm text-ink">{W.viable}</p>
      <FixIt s={s} useFix={useFix} toField={toField} />
      {!w ? <p data-testid="rep-work-wait" class={`mt-2 ${HINT}`}>{work?.on === wbase ? 'No way can be worked out for these figures.' : 'Working out the ways…'}</p> : <>
        <h4 class="mt-4 font-medium text-ink">What holds it back</h4>
        <p class={HINT}>{w.misses ? `${w.misses} ratio${w.misses === 1 ? '' : 's'} short, ${w.held.length === 1 ? 'one cause' : `${w.held.length} causes`}${w.cash ? ', and cash runs out, as said above' : ''}.`
          : 'Every ratio meets its level, but cash runs out, as said above.'}</p>
        {w.held.map((h) => <div key={h.cause} data-testid={`rep-cause-${h.cause}`} class="mt-2">
          <p class="font-medium text-bad">{h.head}</p>
          <p class="text-sm text-ink">{h.text}</p>
          <ul class="mt-1 divide-y divide-line">{h.rows.map((c) => <Bar key={c.id} c={c} pre="rep-work" />)}</ul>
        </div>)}
        {w.years.length > 0 && <>
          <h4 class="mt-3 text-sm font-medium text-ink">Year by year, the DSCR against {w.dscrLevel}</h4>
          <ul data-testid="rep-work-years" class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm tabular-nums">{w.years.map((y) => <li key={y.fy}>
            <span class={MUTED}>{y.fy}{y.months < 12 ? ` (${y.months} months)` : ''}</span> <span class={tone(y.meets)}>{y.dscr}</span></li>)}</ul>
        </>}
        {/* The ways that pass alone (D-UX-352): those that do not reach are no longer listed. */}
        <h4 data-testid="rep-work-one-h" class="mt-6 font-medium text-ink">{W.one}</h4>
        {w.keep.length + w.change.length > 0 ? <ul data-testid="rep-work-one" class="mt-2 space-y-2">{[...w.keep, ...w.change].map((c) => wayCard(c, w.misses, true))}</ul>
          : <p data-testid="rep-work-one-none" class="mt-1 text-sm text-ink">{W.oneNone}</p>}
        {w.useCannot && <p data-testid="rep-work-use-cannot" class="mt-2 text-sm text-ink">{w.useCannot}</p>}
      </>}
    </div>}
    {p.checks && <div data-testid="rep-checks" class={ask ? 'mt-6' : ''}>
      <h3 class="text-title text-ink">{ask ? 'The other benchmark ratios' : `${p.misses || p.checks.some((c) => c.verdict === 'wait') ? 'Against' : 'Meets'} the ${p.benchmarks ? '' : 'default '}benchmark ratios`}</h3>
      {p.benchmarks && <p data-testid="rep-benchmarks-note" class="mt-1 text-sm text-warn">{p.benchmarks}</p>}
      <ul class="mt-1 divide-y divide-line">{p.checks.filter((c) => !onKey.has(c.id) && !held.has(c.id)).map((c) => <Bar key={c.id} c={c}>
        {/* Met on the project's own assets, the cover reads once: no note, no ask (UX5b, the critic's finding 3). */}
        {c.id === 'securityCover' && (p.collateralNote || (!s.collateral.trim() && c.verdict !== 'meets')) && <p data-testid="rep-collateral-note" class={HINT}>
          {p.collateralNote}{!s.collateral.trim() && <>{p.collateralNote ? ' ' : ''}<a href="#fld-collateral" data-testid="rep-to-collateral" onClick={toCollateral}
            class="text-link underline underline-offset-4">Type its market value</a>.</>}</p>}
      </Bar>)}</ul>
      {/* How to read the bars, under them as a chart its key (UX9b, the UX9 critic). */}
      <Benchmarks pre="rep" fields={benchmarkFields('fresh', s.benchmarks)} reset={() => update((t) => ({ ...t, benchmarks: undefined }))}
        set={(id, t) => update((u) => ({ ...u, benchmarks: withBenchmark(u.benchmarks, id, t) }))} />
    </div>}
    {ways && <div data-testid="rep-repayment" tabIndex={-1} class="mt-6">
      <h3 class="text-title text-ink">Ways to repay</h3>
      <p data-testid="rep-repayment-lead" class="mt-1 text-sm text-ink">{ways.lead}</p>
      <ul class="mt-1 divide-y divide-line">{ways.rows.map((r) => <li key={r.value} data-testid={`rep-way-${r.value}`} class="py-2">
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span class="text-sm font-medium text-ink">{r.label}</span>
          {r.proposed && <span class="text-sm text-good">Proposed</span>}
          {r.least && <span class="text-sm text-ink-muted">Least interest</span>}
          {r.now ? <span class="text-sm text-ink-muted">In use</span> : <button type="button" data-testid={`rep-way-use-${r.value}`} class={r.proposed ? FILLED : BUTTON}
            onClick={() => { update((x) => ({ ...x, loan: { ...x.loan, repayment: r.value } })); focusNext('[data-testid="rep-repayment"]'); }}>Use this</button>}
        </div>
        <p class="mt-1 text-sm text-ink">Interest over the loan {r.interest}; {r.instalments}.</p>
        {r.lines.map((l) => <p key={l.text} class={`text-sm ${l.meets === undefined ? 'text-ink-muted' : tone(l.meets)}`}>{l.text}</p>)}
      </li>)}</ul>
      {ways.notes.map((n) => <p key={n} class={HINT}>{n}</p>)}
    </div>}
    {!p.misses && viable}
    {v && !p.misses && <div data-testid="rep-viable-box" tabIndex={-1} class="mt-6 border-t-2 border-ink pt-4">
      <h3 class="text-title text-ink">{v.title}</h3>
      {/* The title says "the room" once (review finding 10), so the borrower's group takes no heading of its own. */}
      {group('borrower', v.meets ? undefined : 'Your changes')}
      {group('lender', 'The lender’s, if it agrees')}
      <p class={`mt-2 max-w-prose ${HINT}`}>{v.foot}</p>
    </div>}
    {/* The sliders, under the same heading (the mock-up's words): each lever from the figures as typed, together. */}
    {p.misses && !plan && <button type="button" data-testid="rep-levers" class={`mt-6 ${BUTTON}`}
      onClick={() => { replan([], AS_TYPED); focusNext('[data-testid="rep-plan"]'); }}>{W.adjust}</button>}
    {p.misses && plan && b && <div data-testid="rep-plan" tabIndex={-1} class="mt-6 border-t-2 border-ink pt-4">
      <h3 class="text-title text-ink">{W.adjust}</h3>
      <p class={HINT}>{W.sliders}</p>
      <TextField id="fld-promotersMost" class="mt-3" label="The most the promoters can bring in all, if known" hint={W.most}
        unit="₹" inputMode="decimal" value={s.promotersMost} tidy={tidyAmount} invalid={bad(s.promotersMost, amountOf)}
        said={notUnderstood(s.promotersMost, amountOf, '10,00,000 or 10 L')} onCommit={(promotersMost) => update((x) => ({ ...x, promotersMost }))} />
      {b.steps.length > 0 && <ol data-testid="rep-plan-steps" class="mt-3 list-decimal space-y-0.5 pl-5 text-sm text-ink">{b.steps.map((t) => <li key={t}>{t}</li>)}</ol>}
      {b.promoters && <p data-testid="rep-plan-promoters" class={`mt-1 text-sm ${b.over ? 'font-medium text-bad' : 'text-ink'}`}>{b.promoters}</p>}
      <p data-testid="rep-plan-verdict" class={`mt-2 text-sm font-medium ${tone(b.works)}`}>{b.verdict}</p>
      {b.still.length > 0 && <ul data-testid="rep-plan-still" class="mt-0.5 list-disc space-y-0.5 pl-5 text-sm text-bad">{b.still.map((t) => <li key={t}>{t}</li>)}</ul>}
      <p data-testid="rep-plan-limits" class={HINT}>{plan.limits}{plan.atLimit ? ` ${plan.atLimit}` : ''}</p>
      {plan.mudraShort && <p data-testid="rep-mudra-short" class={`mt-2 ${STATE} text-warn`}>{plan.mudraShort}</p>}
      <div class="mt-3 flex flex-wrap gap-2">
        {b.steps.length > 0 && <button type="button" data-testid="rep-plan-use" class={FILLED} onClick={() => use(lv)}>Use these changes</button>}
        {!sameLevers(lv, AS_TYPED) && <button type="button" data-testid="rep-plan-back" class={BUTTON} onClick={() => replan([], AS_TYPED)}>Back to as typed</button>}
      </div>
      {b.checks && <div data-testid="rep-plan-checks" class="mt-3">
        <h4 class="text-sm font-medium text-ink">With these changes</h4>
        <ul class="mt-1 divide-y divide-line">{b.checks.map((c) => <Bar key={c.id} c={c} pre="rep-plan" />)}</ul>
      </div>}
      {cards('borrower', 'Your changes')}
      {cards('lender', 'The lender’s, if it agrees')}
      {/* Above the page's answer bar, which is pinned to the foot too. */}
      <p data-testid="rep-plan-line" data-pinned-line aria-live="polite" class={`sticky bottom-12 lg:bottom-0 mt-2 border-t border-line bg-paper py-2 text-sm font-medium ${tone(b.works)}`}>With these changes: {b.line}</p>
    </div>}
  </div>;
}

function Result({ s, p, cv, useCloser, update, use, useWay, useFix, toField, answer, used, counts, undo, keep, toCollateral, toBox, ok }: {
  s: ReportState; p: ReportPreview; cv?: CarryView; useCloser: (k: CarryCloser) => void; update: Update; use: (l: Levers) => void; useWay: (w: WorkCard) => void; useFix: (c: FixCard) => void; toField: (id: string) => (e: Event) => void;
  answer: (t: string) => void; used: PlanChange[]; counts?: string; undo: () => void; keep: () => void;
  toCollateral: (e: Event) => void; toBox: (need: string) => (e: Event) => void; ok: boolean;
}) {
  const v = p.view, verdict = verdictOf(p), own = v && !p.blocked && !p.needs.length ? docNeeds(s.doc, s.words) : [];
  const result = p.blocked ? 'blocked' : p.needs.length ? 'provisional' : 'ready';
  // Before the figures, the report's outline: its key figures with "—" for each not yet known, never 0 (UX8, review finding 2).
  const first = p.needs.map(boxOf).find(Boolean)?.[1];
  const key = v?.key ?? [{ label: 'Cost of the project' }, { label: 'Average DSCR', check: 'dscrAverage' }, { label: 'Lowest DSCR', check: 'dscrLowest' }];
  return <section id="report" aria-labelledby="report-h" class="mt-4">
    <h2 id="report-h" tabIndex={-1} class="sr-only">The project report</h2>
    {used.length > 0 && <div data-testid="rep-used" role="status" class="mb-3 rounded-control border-l-4 border-ink bg-surface p-3">
      <p class="font-medium text-ink">Used: these figures changed.</p>
      {counts && <p data-testid="rep-used-counts" class="mt-1 text-sm font-medium text-good">{counts}</p>}
      <ul class="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink tabular-nums">{used.map((c) => <li key={c.key}>{c.text ?? `${c.label}: ${c.was || 'none'} → ${c.now}`}</li>)}</ul>
      <div class="mt-2 flex flex-wrap gap-2">
        <button type="button" data-testid="rep-undo" class={BUTTON} onClick={undo}>Undo</button>
        <button type="button" data-testid="rep-keep" class={BUTTON} onClick={keep}>Keep these</button>
      </div>
    </div>}
    {/* The answer as paper, there from load (docs/archive/DESIGN-SITE.md): the verdict in words and the key figures above the
        status (review finding 3); one tone a meaning, and the status plain when complete, never green under a miss. */}
    <div class="paper shadow-paper rounded-card p-4 sm:p-6">
      {cv && <Carries c={cv} use={useCloser} />}
      {/* The answer is the paper's heading (UX7): a flat claim, its rule solid once final and dashed while provisional. */}
      {verdict && <Verdict id={p.misses ? 'rep-misses' : 'rep-verdict'} work={verdict.work} text={verdict.text} rule={answerRule(!p.blocked && !p.needs.length)} />}
      {p.short && <p data-testid="rep-short" class="mt-3 text-sm font-medium text-bad">{p.short}</p>}
      <Counter id="rep-status" result={result} text={v ? docStatus(s, p) : statusText(p)} rule={!verdict} answer={!verdict} class={verdict ? 'mt-2' : ''}
        plain={!!verdict} go={goOf(s, p, toBox, ok)}>
        {/* One child, so the status stays one line when nothing is left (Counter reads any child as a list). */}
        {p.needs.length > 0 ? <ul data-testid="rep-needs" class="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink-muted">{p.needs.map((n) => {
          const b = boxOf(n);
          return <li key={n}>{b ? <a href={`#${b[1]}`} onClick={toBox(n)} class="inline-flex min-h-6 items-center text-link">{n}</a> : n}</li>;
        })}</ul> : own.length > 0 && <ul data-testid="rep-doc-left" class="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink-muted">{own.map(docItem)}</ul>}
      </Counter>
      {p.blocked && <p role="alert" class={`mt-3 ${answerRule(true)} text-ink`}>{p.blocked}</p>}
      {!p.blocked && <dl class="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-2">
        {key.map((k, i) => {
          const c = k.check && v ? p.checks?.find((x) => x.id === k.check) : undefined;
          return <div key={k.label} data-testid={c ? `rep-check-${c.id}` : undefined} class={`rounded-control bg-surface p-3 ${k.check ? '' : 'lg:col-span-2'}`}>
            <dt class={`text-sm ${MUTED}`}>{k.label}</dt>
            <dd data-testid={`rep-key-${i}`} class="figure text-2xl text-ink">{'value' in k ? k.value : <Dash what={k.label} to={i ? first : 'cost'} />}</dd>
            {'note' in k && k.note && <dd class={`text-sm ${MUTED}`}>{k.note}</dd>}
            {c && <dd class="mt-1 text-sm"><span class={c.verdict === 'meets' ? 'text-good' : c.verdict === 'misses' ? 'text-bad' : MUTED}>
              {c.verdict === 'meets' ? 'Meets' : c.verdict === 'misses' ? 'Misses' : 'Not yet read'}</span><span class={MUTED}> · {targetOf(c)}</span></dd>}
          </div>;
        })}
      </dl>}
      {p.flags.length > 0 && <ul data-testid="rep-flags" class="mt-3 list-disc space-y-0.5 pl-5 text-sm text-warn">{p.flags.map((n) => <li key={n}>{n}</li>)}</ul>}
      {v && !p.blocked && <Viable s={s} p={p} update={update} use={use} useWay={useWay} useFix={useFix} toField={toField} answer={answer} toCollateral={toCollateral} />}
    </div>
  </section>;
}

/** What the business can carry, first (CAP1, docs/CAPACITY-FIRST.md §4 rule 1): the figure beside the loan asked, one bar
 * (the loan carried in ink, the gap to the loan asked dashed, the asked a line, as the ratios' bars), the tightest year,
 * and the changes that close the gap, each alone with its Use this. */
function Carries({ c, use }: { c: CarryView; use: (k: CarryCloser) => void }) {
  return <div data-testid="rep-carry" class="mb-4">
    <p data-testid="rep-carry-line" class="text-title text-ink">{c.line}</p>
    <div aria-hidden="true" class="relative mt-2 h-3 rounded-full bg-surface">
      <div class="h-3 rounded-full bg-ink-muted" style={{ width: `${c.share}%` }} />
      {c.gap && <div class="absolute inset-y-0 rounded-full border-2 border-dashed border-ink-muted" style={{ left: `${c.share}%`, width: `${c.asked - c.share}%` }} />}
      <div class="absolute -inset-y-1 w-0.5 bg-ink" style={{ left: `calc(${c.asked}% - 2px)` }} />
    </div>
    <p data-testid="rep-carry-how" class="mt-1 text-sm text-ink-muted">{c.how}</p>
    {c.keepReady && <p data-testid="rep-carry-ready" class="mt-1 text-sm font-medium text-warn">{c.keepReady}</p>}
    {c.closers.length > 0 && <>
      <h3 class="mt-3 text-sm font-medium text-ink">What closes the gap, each alone</h3>
      <ul data-testid="rep-carry-closers" class="mt-1 divide-y divide-line">{c.closers.map((k) => <li key={k.id} data-testid={`rep-carry-${k.id}`} class="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
        <span class="text-sm text-ink tabular-nums">{k.text}</span>
        <span class={`text-sm ${k.closes ? 'text-good' : MUTED}`}>{k.reach}</span>
        {k.change && <button type="button" data-testid={`rep-carry-use-${k.id}`} class={`ml-auto ${BUTTON}`} onClick={() => use(k)}>Use this</button>}
      </li>)}</ul>
    </>}
    {c.after && <p data-testid="rep-carry-after" class="mt-1 text-sm text-ink">{c.after}</p>}
  </div>;
}

/** The report's first page (D-UX-216): its own facts among the questions, before the check, so none is left unseen. They
 * change no figure, so a change to one does not ask for the check again (`checkKey`). */
function Facts({ s, update }: { s: ReportState; update: Update }) {
  const f = s.doc, set = (patch: Partial<ReportFacts>) => update((x) => ({ ...x, doc: { ...x.doc, ...patch } }));
  const english = (t: string) => (t.trim() && !printable(t) ? 'The document is in English: type this in English letters.' : undefined);
  const field = (id: keyof ReportFacts, label: string, hint?: string) =>
    <TextField id={`fld-rep-${id}`} label={label} hint={hint} value={f[id]} said={english(f[id])} invalid={!!english(f[id])} onCommit={(t) => set({ [id]: t })} />;
  return <Group id="facts">
    <div class="mt-4 grid gap-4 @md:grid-cols-2">
      {field('name', 'Business’s name')}
      {field('activity', 'What the business does', 'Like “Manufacture of corrugated boxes”.')}
      {field('address', 'Business’s address')}
      {field('lender', 'Lender', SHARED.lender)}
      {field('preparedBy', 'Prepared by', SHARED.preparedBy)}
    </div>
  </Group>;
}

function Download({ s, p, update, ok }: { s: ReportState; p: ReportPreview; update: Update; ok: boolean }) {
  const own = docNeeds(s.doc, s.words), ready = !!p.view && !p.blocked && ok;
  // Before the report shows figures the section is one line (UX8, review finding 9).
  if (!ready) return <Group id="download"><p data-testid="rep-doc-wait" class="mt-2 text-ink">{p.blocked
    ? 'No document while the two computations disagree.' : `A PDF, an Excel copy and a Word copy, once ${p.view ? 'you have checked your figures' : 'the report shows figures'}.`}
    {!p.blocked && <> <a href="#report" data-testid="rep-to-check" class="text-link underline underline-offset-4">Go to Check</a></>}</p></Group>;
  return <Group id="download">
    <p class={`mt-2 ${HINT}`}>{SHARED.files}</p>
    <Words s={s} update={update} />
    <div class="mt-5">
        {/* No tick while the file is marked provisional, as when cash runs out (D-UX-49); a quiet line says why (D-UX-247). */}
        <p data-testid="rep-doc-status" class={`${STATE} ${own.length ? 'text-warn' : 'text-ink'}`}>{!allNeeds(s, p).length && <Tick />}{docStatus(s, p)}</p>
        {p.runsOut && <p data-testid="rep-doc-why" class={`mt-1 ${HINT}`}>The file is marked provisional while cash runs out in {p.runsOut}, as the answer says.</p>}
        {own.length > 0 && <ul data-testid="rep-doc-needs" class="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink-muted">{own.map(docItem)}</ul>}
        <Downloads pre="rep" doc={(today) => reportDoc(s, p, today)} name={(kind) => fileName(s, p, kind)} />
        <InAppNote id="rep-in-app" />
      </div>
  </Group>;
}
