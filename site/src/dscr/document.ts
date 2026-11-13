/**
 * The DSCR statement as a document to download, one document written three times (site/src/doc/): a PDF for the lender,
 * an Excel copy for the accountant and a Word copy to edit (WORKED-PAGE §5, D-DOC-18 on trial). The PDF and the Word copy:
 * page 1 at a glance (who asks and for what, the two key figures beside the lender's level, no verdict, the chart, the
 * status and the contents); 1 the whole working, signed; 2 the sensitivity analysis when the lenders' tests have figures
 * (D1b); Annex 1 the basis; Annex 2 the repayment schedule. The Excel copy has the same parts as its sheets, every figure
 * a number as the engine gave it, never a formula (D-DOC-21). Built from the page's state and preview only, reusing
 * the statement and schedule views of model.ts: every figure is the engine's, none computed here.
 * While anything is missing the document says provisional and lists it; its own facts are asked beside the download, once.
 */
import DSCR from '../../../engine/data/dscr.json';
import { overdueNote, todayIso } from '../../../engine/review';
import { LENDER } from '../../../engine/lender';
import { COMPONENTS, OPTIONS, PLAN_SERVICE, componentsOf, targetNeeds, type Component, type Definition } from '../../../engine/dscr';
import { parseMonth } from '../../../engine/parse';
import { levelFor } from '../../../engine/ratios';
import type { Block, Cell, Chart, Doc, Figure, KeyFigure, Part, Table } from '../doc/doc';
import { forDocument } from '../doc/doc';
import { printable } from '../doc/face';
import { SITE_NAME } from '../site';
import {
  BORROWER_CHOICES, GROUP_TITLES, amountOf, definitionOf, loanRead, modeOf, monthText, numberOf, presetOf, rowsOf, runningLoan, statusText,
  targetOf, tidyAmount, yearsOf,
  type DocFacts, type LenderView, type OptionKey, type Preview, type RowDef, type RowMode, type ScheduleView, type State, type StatementView, type Years,
} from './model';
import { barsOf } from './worked';

/** What the document needs that the page does not ask: the borrower's name and the lender, in letters the PDF prints. */
export function docNeeds(f: DocFacts): string[] {
  const needs: string[] = [];
  const ask = (t: string, what: string) => {
    if (!t.trim()) needs.push(what);
    else if (!printable(t)) needs.push(`${what}, in English letters`);
  };
  ask(f.borrower, "The borrower's name");
  ask(f.lender, 'The lender');
  if (f.preparedBy.trim() && !printable(f.preparedBy)) needs.push('Prepared by, in English letters');
  if (f.address?.trim() && !printable(f.address)) needs.push('The address, in English letters');
  if (f.purpose?.trim() && !printable(f.purpose)) needs.push("The loan's purpose, in English letters");
  if (f.gstin?.trim() && !gstinOf(f.gstin)) needs.push('The GSTIN, as its 15 letters and digits');
  return needs;
}

/** A GSTIN as typed, in capitals without spaces, when it has a GSTIN's shape (2 digits, a PAN, 1, Z, 1); else undefined. */
export function gstinOf(t: string): string | undefined {
  const g = t.replace(/[\s-]/g, '').toUpperCase();
  return /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(g) ? g : undefined;
}

/**
 * Everything the document still needs: the page's own needs, then the document's. Not the lender's target: the document
 * does not show it (the owner, 02-10-2026), so its figures are complete without one.
 */
export function allNeeds(s: State, p: Preview): string[] {
  const target = new Set(targetNeeds(targetOf(s)));
  return [...p.needs.filter((n) => !target.has(n)), ...docNeeds(s.doc)];
}

/** "All questions answered", "2 questions left" counting the document's own facts, or, when only those are missing, that
 * the figures are complete (CMA review finding 14, UX5); for beside the download buttons. */
export const docStatus = (s: State, p: Preview) => {
  const all = allNeeds(s, p), own = docNeeds(s.doc).length;
  return !p.blocked && own && all.length === own ? forDocument(own) : statusText({ ...p, needs: all, assumed: [] });
};

/** The file's name: the borrower's, and "(provisional)" while anything is missing; "(example)" while a figure is the
 * worked page's example (NEW1, docs/WORKED-PAGE.md §3: the example's mark on every file made from it). */
export function fileName(s: State, p: Preview, ext: 'pdf' | 'xlsx' | 'docx', example = false): string {
  const name = s.doc.borrower.replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60).trim();
  return `DSCR statement${name ? ` - ${name}` : ''}${example ? ' (example)' : allNeeds(s, p).length ? ' (provisional)' : ''}.${ext}`;
}

const dmy = (iso: string) => iso.split('-').reverse().join('-');
const lower = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);
const given = (t: string) => (t.trim() && printable(t) ? t.trim() : 'Still needed');

/** A cell showing the view's words, with the engine's figure beside them for the Excel copy. */
function cell(text: string, value: number | undefined, kind: Figure['kind']): Cell {
  if (value === undefined || !Number.isFinite(value)) return { text };
  return { text, figure: { value, kind, decimals: (text.split('.')[1] ?? '').length } };
}

/** The statement as the page shows it: the years across, the working down, and its Total column (StatementView). */
function statementTable(st: StatementView): Table {
  const kind = (l: { kind?: string }) => (l.kind === 'ratio' ? 'ratio' : 'amount');
  return {
    columns: [{ label: 'Rupees' }, ...st.years.map((fy, i) => (st.counted[i] ? { label: fy } : { label: fy, sub: 'not counted' })),
      ...(st.total ? [{ label: 'Total', ...(st.total.sub ? { sub: st.total.sub } : {}) }] : [])],
    freeze: 1,
    rows: st.lines.map((l) => (l.kind === 'head'
      ? { kind: 'head', cells: [{ text: l.label }] }
      : { ...(l.kind ? { kind: l.kind } : {}), cells: [{ text: l.label }, ...l.values.map((v, i) => cell(v, l.n?.[i], kind(l))),
        ...(st.total ? [l.total ? cell(l.total.text, l.total.n, kind(l)) : { text: '' }] : [])] })),
  };
}

const REPAID = { emi: 'EMI every month', monthly: 'Equal principal every month', stepped: 'Stepped every month, rising each year', quarterly: 'Equal principal every quarter' } as const;

/** The loan as entered, and as the engine reads it back (when the instalments fall, and what each is): two to a line. */
function loanFacts(s: State, p: Preview, y: Years): [string, string][][] {
  const l = s.loan, rate = numberOf(l.ratePct), month = parseMonth(l.disbursed), m = numberOf(l.moratoriumMonths), k = numberOf(l.instalments);
  const lines: [string, string][][] = [
    [['Amount', amountOf(l.amount) === undefined ? 'Still needed' : `₹${tidyAmount(l.amount)}`], ['Interest rate', rate === undefined ? 'Still needed' : `${rate}% a year`]],
    [['First drawn', month ? monthText(month) : 'Still needed'], ['Moratorium', m === undefined ? 'Still needed' : m ? `${m} month${m === 1 ? '' : 's'}, interest paid` : 'None']],
    [['Repaid', l.repayment ? REPAID[l.repayment] : 'Still needed'], ['Instalments', k === undefined ? 'Still needed' : `${k}${l.repayment ? ` ${l.repayment === 'quarterly' ? 'quarterly' : 'monthly'}` : ''}`]],
  ];
  const read = loanRead(y);
  if (read) lines.push([['When they fall', read]]);
  if (p.schedule) lines.push([['Each instalment', p.schedule.level]]);
  return lines;
}

/** The average and the lowest year, in a strip under the working. The verdict, the largest loan, the fewest instalments and the lender's target stay on the page. */
function keyFigures(s: State, def: Definition, p: Preview): KeyFigure[] {
  if (p.average === undefined) return [];
  // The lender's level (D-DOC-18): the target typed on the page, else the usual level (engine/data/ratios.json). No verdict.
  const t = targetOf(s), level = (typed: number | undefined, id: 'dscrAverage' | 'dscrLowest') => (typed !== undefined && Number.isFinite(typed)
    ? `Lender's level ${typed.toFixed(2)}` : `Usual level ${levelFor(id, 'fresh').toFixed(2)}`);
  return [
    { label: 'Average DSCR', value: p.average, level: level(t.average, 'dscrAverage'), note: lower(choiceLabel(def, 'average')) },
    { label: 'Lowest year', value: p.lowest ?? '', level: level(t.minimum, 'dscrLowest'), note: `in ${p.lowestYear}` },
  ];
}

const choiceLabel = (def: Definition, k: OptionKey) => (OPTIONS[k].choices as Record<string, { label: string }>)[def[k] as string].label;
const sum = (cs: Component[]) => cs.map((c) => lower(COMPONENTS[c])).join(' + ');

/**
 * Where a method comes from, for the lender: the data file's source without this site's own notes on how far it was
 * checked, or where its research is kept (the page shows those; the owner, 02-10-2026).
 */
export const sourceForLender = (t: string) => t
  .replace(/; docs\/[\w./-]+/g, '')
  .replace(/; not a regulation, and not checked against a primary source\.?$/, '')
  .replace(/\.? Read through summaries;[^.]*\.?$/, '');

/** The method in plain words, from the data file (engine/data/dscr.json), with its source. */
function methodBlocks(s: State, p: Preview, def: Definition): Block[] {
  const preset = presetOf(s.method), { available } = componentsOf(def);
  // Existing EMIs are debt service in full when the statement has them (PLAN_SERVICE).
  const service = [...componentsOf(def).service, ...(p.statement?.lines.some((l) => l.id === 'emis') ? PLAN_SERVICE : [])];
  const out: Block[] = [
    { kind: 'text', text: preset ? `${preset.label}.` : 'Chosen for this lender, one choice at a time.' },
    { kind: 'list', items: [
      DSCR.formula,
      `Cash available (A) = ${sum(available)}.`,
      `Debt service (B) = ${sum(service)}.`,
      `Years counted: ${lower(choiceLabel(def, 'years'))}.`,
      `The average: ${lower(choiceLabel(def, 'average'))}. The lowest year is the lowest DSCR among the years counted.`,
    ] },
  ];
  if (preset) out.push({ kind: 'text', text: `Source: ${sourceForLender(preset.source)}. Dated ${dmy(preset.date)}. ${overdueNote(DSCR.reviewBy, todayIso())}`.trim(), small: true });
  return out;
}

/** Which assumption (engine/data/defaults.json) answers a line of figures while it holds. */
const ASSUMPTION_OF: Record<string, string> = {
  pbdit: 'margin', assetIncome: 'asset', depreciation: 'depreciation', interestOther: 'interest', otherLoans: 'otherLoans', nonCash: 'nonCash', leaseRentals: 'nonCash', taxPct: 'tax',
};

/** A figure as typed, read back: ₹1,50,000, or 25%. */
function typed(t: string | undefined, percent?: boolean): string {
  const text = t?.trim() ?? '';
  if (!text) return 'still needed';
  const n = percent ? numberOf(text) : amountOf(text);
  return n === undefined ? `"${text}" (not understood)` : percent ? `${n}%` : `₹${tidyAmount(text)}`;
}

/** How a line was given, in words. */
function howGiven(s: State, r: RowDef, mode: RowMode | undefined, years: string[]): string {
  const cells = s.cells[r.key] ?? [], first = typed(cells[0], r.percent), rateText = s.rates[r.key]?.trim() ?? '';
  const rate = rateText ? (numberOf(rateText) === undefined ? `"${rateText}" (not understood)` : `${numberOf(rateText)}%`) : 'a rate still needed';
  switch (mode) {
    case 'same': return `${first} every year`;
    case 'grow': return r.key === 'pbdit' ? `${first} in ${years[0]}; sales growth ${rate} a year` : `${first} in ${years[0]}, then growing ${rate} a year`;
    case 'fall': return `${first} in ${years[0]}, then falling ${rate} a year (written-down value)`;
    case 'years': return years.map((fy, i) => `${fy}: ${typed(cells[i], r.percent)}`).join('; ');
    case 'none': return 'None';
    case 'emi': return emisGiven(s);
    case 'from': {
      const from = parseMonth(s.asset.from);
      return `${typed(s.asset.yearly)} a year from ${from ? monthText(from) : s.asset.from.trim() ? `"${s.asset.from.trim()}" (not understood)` : 'a month still needed'}`;
    }
    case 'borrower': {
      const b = BORROWER_CHOICES.find((x) => x.id === s.borrower);
      return b ? `Worked out for a ${b.label.toLowerCase()}: ${b.tax}` : 'Who the borrower is: still needed';
    }
    default: return 'Still needed';
  }
}

/** Loans already running, as typed: each EMI a month, and when it ends; then which EMIs these are, by who the borrower is. */
function emisGiven(s: State): string {
  const loans = s.running.map((t) => {
    const l = runningLoan(t), last = l.last && /^\d{4}-\d{2}$/.test(l.last) ? `, the last in ${monthText(l.last)}` : l.last ? `, the last in "${l.last}" (not understood)` : ', running on';
    return `${typed(t.emi)} a month${last}`;
  });
  const counts = BORROWER_CHOICES.find((b) => b.id === s.borrower)?.emis;
  return `EMIs of ${loans.join('; ')}${counts ? `. ${counts}` : ''}`;
}

/** The figures as entered, each once. The page's assumptions are not listed (the owner, D-DOC-03), so a line they leave at None is left out. */
function enteredPairs(s: State, p: Preview, y: Years): [string, string][] {
  const held = new Set(p.assumed.map((a) => a.id)), pairs: [string, string][] = [], done = new Set<string>();
  if (s.source === 'own') pairs.push(['Years', y.years.length > 1 ? `${y.years[0]} to ${y.years[y.years.length - 1]}` : y.years[0]]);
  const who = BORROWER_CHOICES.find((b) => b.id === s.borrower);
  if (s.source === 'plan' && who) pairs.push(['The borrower', who.label]);
  for (const r of rowsOf(s)) {
    const mode = modeOf(s, r), assumed = held.has(ASSUMPTION_OF[r.modeKey] ?? '');
    // In a block of rows answered together, only the rows its answer uses.
    if (mode && mode !== 'none' && r.only && !r.only.includes(mode)) continue;
    if (assumed && mode === 'none') continue;
    if (mode === 'none') {
      if (!done.has(r.modeKey)) pairs.push([GROUP_TITLES[r.modeKey] ?? r.label, 'None']);
      done.add(r.modeKey);
      continue;
    }
    pairs.push([mode === 'emi' ? GROUP_TITLES[r.modeKey] ?? r.label : r.label, howGiven(s, r, mode, y.years)]);
  }
  return pairs;
}

/** Annex 2, the repayment schedule (ScheduleView): by year, then month by month. The loan and its instalment are on page 1. */
function schedulePart(sch: ScheduleView): Part {
  const money = (text: string, value: number) => cell(text, value, 'amount');
  const table = (t: Table): Block => ({ kind: 'table', table: t });
  return {
    name: 'Repayment schedule', section: 'Annex 2. Repayment schedule',
    blocks: [
      { kind: 'title', text: 'Annex 2. Repayment schedule', small: true },
      { kind: 'text', text: 'In rupees, rounded; totals use the exact figures.', small: true },
      { kind: 'heading', text: 'By year' },
      table({
        columns: [{ label: 'Year' }, { label: 'Interest' }, { label: 'Principal' }, { label: 'Balance at year end' }],
        rows: sch.years.map((y) => ({ cells: [{ text: y.fy }, money(y.interest, y.n.interest), money(y.principal, y.n.principal), money(y.closing, y.n.closing)] })),
      }),
      { kind: 'heading', text: 'Month by month' },
      table({
        size: 'small',
        columns: ['Month', 'Instalment', 'Balance at start', 'Interest', 'Principal', 'Paid', 'Balance at end'].map((label) => ({ label })),
        rows: sch.years.flatMap((y) => [
          { kind: 'head' as const, cells: [{ text: y.fy }] },
          ...y.months.map((m) => ({ cells: [
            { text: m.month }, cell(m.instalment ? String(m.instalment) : '', m.instalment, 'count'),
            money(m.opening, m.n.opening), money(m.interest, m.n.interest), money(m.principal, m.n.principal), money(m.paid, m.n.paid), money(m.closing, m.n.closing),
          ] })),
        ]),
      }),
    ],
  };
}

// ---- The sensitivity analysis (D1b): the lenders' tests of D-UX-47 as the page shows them ----

const STATEMENT_PART = 'DSCR statement', SENSITIVITY = 'Sensitivity';
/** An amount as the view words it, without its "₹" (the table says rupees), and the engine's figure. */
const money = (text: string, value: number): Cell => ({ text: text.replace(/^₹ ?/, ''), figure: { value, kind: 'amount', decimals: 0 } });
const ratio = (text: string, value: number | undefined): Cell => (value === undefined || !Number.isFinite(value) ? { text }
  : { text, figure: { value, kind: 'ratio', decimals: (text.split('.')[1] ?? '').length } });

/** Whether the lenders' tests have a figure to show: a stress line, promoters' loans repaid, the cash check or the audited year. */
const hasFigures = (v: LenderView) => v.stress.length > 0 || 'line' in v.promoters || (!!v.cash && 'rows' in v.cash) || (!!v.audited && 'rows' in v.audited);

/** The page after page 1: each test as the page shows it, by line; our own tests, never the verdict (D-UX-47). */
function sensitivityPart(v: LenderView, years: string[]): Part {
  const lines = [...v.stress, ...('line' in v.promoters ? [v.promoters.line] : [])];
  const blocks: Block[] = [
    { kind: 'title', text: '2. Sensitivity analysis', small: true },
    { kind: 'text', text: "Our own tests beside the DSCR in section 1, not a lender's norm: each lender sets its own cases. They do not change that DSCR.", small: true },
  ];
  if (v.blocked) blocks.push({ kind: 'box', title: 'Not shown', items: [v.blocked] });
  if (lines.length) {
    const below = lines.filter((l) => l.below).map((l) => l.label);
    blocks.push({ kind: 'heading', text: 'The DSCR under stress' }, { kind: 'table', table: {
      columns: [{ label: 'Test' }, { label: 'Average' }, { label: 'Lowest year' }, { label: 'In' }],
      rows: lines.map((l) => ({ cells: [{ text: l.label }, ratio(l.average, l.n.average), ratio(l.lowest, l.n.lowest), { text: l.lowestYear }] })),
    } });
    if (below.length) blocks.push({ kind: 'text', text: `In the lowest year the cash does not cover the debt service: ${below.join('; ')}.` });
  }
  const notes = [
    ...(v.stress.length ? LENDER.stress.map((x) => `${x.label}: ${x.how}.`) : []),
    ...(v.ask ? [`The DSCR with the ${LENDER.stress.map((c) => c.label.toLowerCase()).join(' and with ')} needs this year's sales.`] : []),
    ...('assumed' in v.promoters ? [`${v.promoters.assumed}.`] : []),
    ...(v.notStressed ? [`${v.notStressed}.`] : []),
    ...(lines.length ? [`${LENDER.floor.why}.`] : []),
  ];
  if (notes.length) blocks.push({ kind: 'list', items: notes, small: true });
  if (v.needs.length) blocks.push({ kind: 'box', title: 'Still needed for these tests', items: v.needs });
  const across = (counted: boolean[]): Table['columns'] => [{ label: 'Rupees' }, ...years.map((fy, i) => (counted[i] ? { label: fy } : { label: fy, sub: 'not counted' }))];

  if ('line' in v.promoters) {
    const y = v.promoters.years;
    blocks.push({ kind: 'heading', text: "Promoters' loans repaid, year by year" }, { kind: 'table', table: { columns: across(y.map((r) => r.counted)), rows: [
      { cells: [{ text: 'Cash available (A)' }, ...y.map((r) => money(r.available, r.n.available))] },
      { cells: [{ text: "Promoters' loans repaid" }, ...y.map((r) => money(r.repaid, r.n.repaid))] },
      { kind: 'total', cells: [{ text: "Debt service with them (B + promoters' loans)" }, ...y.map((r) => money(r.service, r.n.service))] },
      { kind: 'ratio', cells: [{ text: 'DSCR (A ÷ B)' }, ...y.map((r) => ratio(r.dscr, r.n.dscr))] },
    ] } });
  }
  const c = v.cash;
  if (c && 'rows' in c) blocks.push({ kind: 'heading', text: 'Cash after working capital and replacement capex' }, { kind: 'text', text: c.text },
    { kind: 'table', table: { columns: across(c.rows.map(() => true)), rows: [
      { cells: [{ text: 'Cash available (A)' }, ...c.rows.map((r) => money(r.available, r.n.available))] },
      { cells: [{ text: "Less: working capital's growth" }, ...c.rows.map((r) => money(r.wc, r.n.wc))] },
      { cells: [{ text: 'Less: replacement capex' }, ...c.rows.map((r) => money(r.capex, r.n.capex))] },
      { cells: [{ text: 'Less: debt service (B)' }, ...c.rows.map((r) => money(r.service, r.n.service))] },
      { kind: 'total', cells: [{ text: 'Cash left' }, ...c.rows.map((r) => money(r.left, r.n.left))] },
      { kind: 'ratio', cells: [{ text: 'Cover: (A less working capital and capex) ÷ B' }, ...c.rows.map((r) => ratio(r.cover, r.n.cover))] },
    ] } });
  else if (c) blocks.push({ kind: 'box', title: 'The cash check still needs', items: c.needs });
  const a = v.audited;
  if (a && 'rows' in a) {
    const pct = (r: { id: string }) => r.id === 'margin';
    const fig = (text: string, n: number | undefined, r: { id: string }) => (n === undefined ? { text } : pct(r) ? ratio(text, n) : money(text.replace(/ \(.*\)$/, ''), n));
    blocks.push({ kind: 'heading', text: 'The last audited year beside the first year of figures' }, { kind: 'table', table: {
      columns: [{ label: 'Rupees' }, { label: a.fy, sub: 'audited' }, ...(a.nextFy ? [{ label: a.nextFy, sub: 'projected' }] : [])],
      rows: a.rows.map((r) => ({ ...(r.id === 'pbt' || r.id === 'accrual' ? { kind: 'total' as const } : {}),
        cells: [{ text: r.label }, fig(r.audited, r.n, r), ...(a.nextFy ? [r.next === undefined ? { text: '' } : fig(r.next, r.nNext, r)] : [])] })),
    } });
    const growth = a.rows.find((r) => r.id === 'sales')?.next?.match(/\(([^)]*)\)$/)?.[1];
    const said = [...(growth ? [`Sales growth into ${a.nextFy}: ${growth}.`] : []), ...a.flags.map((f) => `${f}.`)];
    if (said.length) blocks.push({ kind: 'list', items: said, small: true });
  }
  else if (a) blocks.push({ kind: 'box', title: 'The last audited year still needs', items: a.needs });
  return { name: SENSITIVITY, section: '2. Sensitivity analysis', blocks };
}

/** Annex 1, the basis: the figures entered, each once, and how DSCR is worked out. */
function basisPart(s: State, p: Preview, def: Definition, y: Years): Part {
  const entered = enteredPairs(s, p, y);
  return {
    name: 'Basis', section: 'Annex 1. The basis',
    blocks: [
      { kind: 'title', text: 'Annex 1. The basis', small: true },
      ...(entered.length ? [{ kind: 'heading', text: s.source === 'plan' ? 'The business figures entered' : 'The figures entered' } as Block, { kind: 'pairs', pairs: entered } as Block] : []),
      { kind: 'heading', text: 'How DSCR is worked out' },
      ...methodBlocks(s, p, def),
    ],
  };
}

/**
 * The document, or undefined while there is no statement to show (the page says why). `today` is the date it is made
 * on, as 2026-09-30. `example`: a figure is still the worked page's example, so every page is marked Example.
 */
export function statementDoc(s: State, p: Preview, today: string, example = false): Doc | undefined {
  const st = p.statement, def = definitionOf(s) as Definition | undefined;
  if (!st || p.blocked || !def) return undefined;
  const f = s.doc, needs = allNeeds(s, p), y = yearsOf(s), years = st.years;
  const borrower = f.borrower.trim() && printable(f.borrower) ? f.borrower.trim() : '';
  const by = f.preparedBy.trim() && printable(f.preparedBy) ? f.preparedBy.trim() : '';
  const facts: [string, string][][] = [[['Lender', given(f.lender)], ['Prepared on', dmy(today)]]];
  const ok = (t?: string) => (t?.trim() && printable(t) ? t.trim().replace(/\s+/g, ' ') : ''), gstin = f.gstin && gstinOf(f.gstin);
  // The address on a line of its own (it is long); the purpose and the GSTIN two to a line.
  const two = ([['Purpose', ok(f.purpose)], ['GSTIN', gstin ?? '']] as [string, string][]).filter((x) => x[1]);
  if (ok(f.address)) facts.push([['Address', ok(f.address)]]);
  if (two.length) facts.push(two);
  if (by) facts.push([['Prepared by', by]]);

  const lender = p.lender && hasFigures(p.lender) ? p.lender : undefined;
  const status = example ? 'Example' : needs.length ? `Provisional: ${needs.length} still needed` : 'Complete';
  const bars = barsOf(p), plan = s.source === 'plan';
  const chart: Chart | undefined = bars.length ? {
    title: plan ? 'Cash available against repayments due' : 'Cash available against debt service', unit: '₹ lakh',
    names: ['Cash available', plan ? 'Repayments due' : 'Debt service'], tightName: 'tightest', scale: 100000, decimals: 2,
    rows: bars.map((b) => ({ label: b.fy, values: [b.cash, b.service] as [number, number], texts: [b.cashText, b.serviceText] as [string, string],
      ...(b.tight ? { tight: true } : {}), ...(b.part ? { note: b.part } : !b.counted ? { note: 'not counted' } : {}) })),
  } : undefined;
  const key = keyFigures(s, def, p);

  // Page 1 at a glance (WORKED-PAGE §5): who asks and for what, the key figures beside the lender's level (no verdict:
  // the lender decides, D-DOC-03), the chart, the status, and the contents, each line a link to its part.
  const asked = loanAsked(s);
  const glance: Block[] = [
    { kind: 'title', text: borrower || 'DSCR statement', sub: `Debt service coverage ratio (DSCR), ${years.length > 1 ? `${years[0]} to ${years[years.length - 1]}` : years[0]}` },
    { kind: 'facts', lines: [facts[0], ...(asked ? [[['Loan asked', asked]] as [string, string][]] : []), ...facts.slice(1), [['Status', status]]] },
  ];
  if (needs.length) glance.push({ kind: 'box', title: `${example ? 'Example' : 'Provisional'}: ${needs.length} still needed`, items: needs });
  if (key.length) glance.push({ kind: 'figures', items: key });
  if (chart) glance.push({ kind: 'chart', chart });
  glance.push({ kind: 'contents', title: 'Contents', compact: true });

  // 1. The statement: the whole working as the page shows it, every line, and the answer under it; signed.
  const blocks: Block[] = [{ kind: 'title', text: '1. The statement', small: true }];
  if (plan) blocks.push({ kind: 'heading', text: 'The loan' }, { kind: 'facts', lines: loanFacts(s, p, y) });
  blocks.push({ kind: 'table', table: statementTable(st) });
  const notes = [p.beforeStart, p.notCounted, ...p.notes].filter((x): x is string => !!x);
  if (notes.length) blocks.push({ kind: 'list', items: notes, small: true });
  if (key.length) blocks.push({ kind: 'figures', items: key.map(({ level: _, ...k }) => k) });
  if (lender) blocks.push({ kind: 'text', text: 'The sensitivity analysis in section 2 tests this DSCR as a lender may; it does not change it.', small: true });
  blocks.push({ kind: 'signature', lines: [`For ${borrower || 'the borrower'}`, '', 'Authorised signatory', 'Date:', 'Place:'] });

  return {
    title: `DSCR statement${borrower ? `, ${borrower}` : ''}`,
    header: `DSCR statement${borrower ? ` · ${borrower}` : ''}`,
    ...(example ? { mark: 'Example' } : needs.length ? { mark: 'Provisional' } : {}),
    footer: `Made with ${SITE_NAME} on ${dmy(today)} from the figures entered; every figure worked out twice. Not a CA's certificate.`,
    workbookNote: 'Each cell holds the exact figure worked out on the page, shown in whole rupees; there are no formulas.',
    ...(by || borrower ? { author: by || borrower } : {}),
    creator: SITE_NAME,
    parts: [
      { name: 'At a glance', blocks: glance },
      { name: STATEMENT_PART, section: '1. The statement', blocks },
      ...(lender ? [sensitivityPart(lender, years)] : []),
      basisPart(s, p, def, y),
      ...(p.schedule ? [schedulePart(p.schedule)] : []),
    ],
  };
}

/** The loan asked for, in one line: "₹50,00,000 at 10.5% a year, 84 EMIs every month"; undefined for own figures. */
function loanAsked(s: State): string | undefined {
  if (s.source !== 'plan') return undefined;
  const l = s.loan, amount = amountOf(l.amount), rate = numberOf(l.ratePct), k = numberOf(l.instalments);
  if (amount === undefined) return undefined;
  return [`₹${tidyAmount(l.amount)}`, rate === undefined ? '' : ` at ${rate}% a year`,
    k === undefined || !l.repayment ? '' : `, ${k} instalments, ${lower(REPAID[l.repayment])}`].join('');
}
