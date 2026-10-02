/**
 * The DSCR statement as a document to download, one document written three times (site/src/doc/): a PDF for the lender,
 * an Excel copy for the accountant and a Word copy to edit. Laid out as a chartered accountant's statement (P1g): page 1
 * the whole working, signed; Annex 1 the basis; Annex 2 the repayment schedule. Built from the page's state and preview
 * only, reusing the statement and schedule views of model.ts: every figure is the engine's, and none is computed here.
 * While anything is missing the document says provisional and lists it; its own facts are asked beside the download, once.
 */
import DSCR from '../../../engine/data/dscr.json';
import { COMPONENTS, OPTIONS, PLAN_SERVICE, componentsOf, targetNeeds, type Component, type Definition } from '../../../engine/dscr';
import { parseMonth } from '../../../engine/parse';
import type { Block, Cell, Doc, Figure, KeyFigure, Part, Table } from '../doc/doc';
import { printable } from '../doc/pdf';
import { SITE_NAME } from '../site';
import {
  BORROWER_CHOICES, GROUP_TITLES, amountOf, definitionOf, loanRead, modeOf, monthText, numberOf, presetOf, rowsOf, runningLoan, statusText,
  targetOf, tidyAmount, yearsOf,
  type DocFacts, type OptionKey, type Preview, type RowDef, type RowMode, type ScheduleView, type State, type StatementView, type Years,
} from './model';

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
  return needs;
}

/**
 * Everything the document still needs: the page's own needs, then the document's. Not the lender's target: the document
 * does not show it (the owner, 02-10-2026), so its figures are complete without one.
 */
export function allNeeds(s: State, p: Preview): string[] {
  const target = new Set(targetNeeds(targetOf(s)));
  return [...p.needs.filter((n) => !target.has(n)), ...docNeeds(s.doc)];
}

/** "Complete", or "Provisional: 2 still needed" counting the document's own facts, for beside the download buttons. */
export const docStatus = (s: State, p: Preview) => statusText({ ...p, needs: allNeeds(s, p), assumed: [] });

/** The file's name: the borrower's, and "(provisional)" while anything is missing. */
export function fileName(s: State, p: Preview, ext: 'pdf' | 'xlsx' | 'docx'): string {
  const name = s.doc.borrower.replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60).trim();
  return `DSCR statement${name ? ` - ${name}` : ''}${allNeeds(s, p).length ? ' (provisional)' : ''}.${ext}`;
}

const dmy = (iso: string) => iso.split('-').reverse().join('-');
const lower = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);
const given = (t: string) => (t.trim() && printable(t) ? t.trim() : 'Still needed');

/** A cell showing the view's words, with the engine's figure beside them for the Excel copy. */
function cell(text: string, value: number | undefined, kind: Figure['kind']): Cell {
  if (value === undefined || !Number.isFinite(value)) return { text };
  return { text, figure: { value, kind, decimals: (text.split('.')[1] ?? '').length } };
}

/** The statement as the page shows it: the years across, the working down (StatementView). */
function statementTable(st: StatementView): Table {
  return {
    columns: [{ label: 'Rupees' }, ...st.years.map((fy, i) => (st.counted[i] ? { label: fy } : { label: fy, sub: 'not counted' }))],
    rows: st.lines.map((l) => (l.kind === 'head'
      ? { kind: 'head', cells: [{ text: l.label }] }
      : { ...(l.kind ? { kind: l.kind } : {}), cells: [{ text: l.label }, ...l.values.map((v, i) => cell(v, l.n?.[i], l.kind === 'ratio' ? 'ratio' : 'amount'))] })),
  };
}

const REPAID = { emi: 'EMI every month', monthly: 'Equal principal every month', quarterly: 'Equal principal every quarter' } as const;

/** The loan as entered, and as the engine reads it back (when the instalments fall, and what each is): two to a line. */
function loanFacts(s: State, p: Preview, y: Years): [string, string][][] {
  const l = s.loan, rate = numberOf(l.ratePct), month = parseMonth(l.disbursed), m = numberOf(l.moratoriumMonths), k = numberOf(l.instalments);
  const lines: [string, string][][] = [
    [['Amount', amountOf(l.amount) === undefined ? 'Still needed' : `Rs. ${tidyAmount(l.amount)}`], ['Interest rate', rate === undefined ? 'Still needed' : `${rate}% a year`]],
    [['First drawn', month ? monthText(month) : 'Still needed'], ['Moratorium', m === undefined ? 'Still needed' : m ? `${m} month${m === 1 ? '' : 's'}, interest paid` : 'None']],
    [['Repaid', l.repayment ? REPAID[l.repayment] : 'Still needed'], ['Instalments', k === undefined ? 'Still needed' : `${k}${l.repayment ? ` ${l.repayment === 'quarterly' ? 'quarterly' : 'monthly'}` : ''}`]],
  ];
  const read = loanRead(y);
  if (read) lines.push([['When they fall', read]]);
  if (p.schedule) lines.push([['Each instalment', p.schedule.level]]);
  return lines;
}

/** The average and the lowest year, in a strip under the working. The verdict, the largest loan, the fewest instalments and the lender's target stay on the page. */
function keyFigures(def: Definition, p: Preview): KeyFigure[] {
  if (p.average === undefined) return [];
  return [
    { label: 'Average DSCR', value: p.average, note: lower(choiceLabel(def, 'average')) },
    { label: 'Lowest year', value: p.lowest ?? '', note: `in ${p.lowestYear}` },
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
  if (preset) out.push({ kind: 'text', text: `Source: ${sourceForLender(preset.source)}. Dated ${dmy(preset.date)}.`, small: true });
  return out;
}

/** Which assumption (engine/data/defaults.json) answers a line of figures while it holds. */
const ASSUMPTION_OF: Record<string, string> = {
  pbdit: 'margin', assetIncome: 'asset', depreciation: 'depreciation', interestOther: 'interest', otherLoans: 'otherLoans', nonCash: 'nonCash', leaseRentals: 'nonCash', taxPct: 'tax',
};

/** A figure as typed, read back: Rs. 1,50,000, or 25%. */
function typed(t: string | undefined, percent?: boolean): string {
  const text = t?.trim() ?? '';
  if (!text) return 'still needed';
  const n = percent ? numberOf(text) : amountOf(text);
  return n === undefined ? `"${text}" (not understood)` : percent ? `${n}%` : `Rs. ${tidyAmount(text)}`;
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
    name: 'Repayment schedule',
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

/** Annex 1, the basis: the figures entered, each once, and how DSCR is worked out. */
function basisPart(s: State, p: Preview, def: Definition, y: Years): Part {
  const entered = enteredPairs(s, p, y);
  return {
    name: 'Basis',
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
 * on, as 2026-09-30.
 */
export function statementDoc(s: State, p: Preview, today: string): Doc | undefined {
  const st = p.statement, def = definitionOf(s) as Definition | undefined;
  if (!st || p.blocked || !def) return undefined;
  const f = s.doc, needs = allNeeds(s, p), y = yearsOf(s), years = st.years;
  const borrower = f.borrower.trim() && printable(f.borrower) ? f.borrower.trim() : '';
  const by = f.preparedBy.trim() && printable(f.preparedBy) ? f.preparedBy.trim() : '';
  const facts: [string, string][][] = [[['Lender', given(f.lender)], ['Prepared on', dmy(today)]]];
  if (by) facts.push([['Prepared by', by]]);

  // Page 1: who and what, then the whole working as the page shows it, every line, and the answer under it; signed.
  const blocks: Block[] = [
    { kind: 'title', text: borrower || 'DSCR statement', sub: `Debt service coverage ratio (DSCR), ${years.length > 1 ? `${years[0]} to ${years[years.length - 1]}` : years[0]}` },
    { kind: 'facts', lines: facts },
  ];
  if (needs.length) blocks.push({ kind: 'box', title: `Provisional: ${needs.length} still needed`, items: needs });
  if (s.source === 'plan') blocks.push({ kind: 'heading', text: 'The loan' }, { kind: 'facts', lines: loanFacts(s, p, y) });
  blocks.push({ kind: 'table', table: statementTable(st) });
  const notes = [p.beforeStart, p.notCounted, ...p.notes].filter((x): x is string => !!x);
  if (notes.length) blocks.push({ kind: 'list', items: notes, small: true });
  const key = keyFigures(def, p);
  if (key.length) blocks.push({ kind: 'figures', items: key });
  blocks.push({ kind: 'signature', lines: [`For ${borrower || 'the borrower'}`, '', 'Authorised signatory', 'Date:', 'Place:'] });

  return {
    title: `DSCR statement${borrower ? `, ${borrower}` : ''}`,
    header: `DSCR statement${borrower ? ` · ${borrower}` : ''}`,
    ...(needs.length ? { mark: 'Provisional' } : {}),
    footer: `Made with ${SITE_NAME} on ${dmy(today)} from the figures entered; every figure worked out twice. Not a CA's certificate.`,
    workbookNote: 'Each cell holds the exact figure worked out on the page, shown in whole rupees; there are no formulas.',
    ...(by || borrower ? { author: by || borrower } : {}),
    creator: SITE_NAME,
    parts: [{ name: 'DSCR statement', blocks }, basisPart(s, p, def, y), ...(p.schedule ? [schedulePart(p.schedule)] : [])],
  };
}
