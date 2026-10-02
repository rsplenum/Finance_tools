/**
 * The project report as a document to download, written three times (site/src/doc/): page 1 the project at a glance
 * (the business, the cost of the project and how it is financed, the DSCR), signed; then the projected profit and loss,
 * balance sheet and cash flow; then the DSCR, break-even, the key ratios and working capital; and an annex with the term
 * loan's repayment, the figures entered and how the figures are worked out. Built from the page's state and preview only:
 * the tables are the page's (model.ts), every figure the engine's, none computed here.
 */
import { parseMonth } from '../../../engine/parse';
import { METHOD } from '../../../engine/report';
import { BORROWERS } from '../../../engine/tax';
import type { Block, Cell, Doc, Table } from '../doc/doc';
import { printable } from '../doc/pdf';
import { monthText } from '../dscr/model';
import { SITE_NAME } from '../site';
import { HEADS, REPAYMENT_CHOICES, plainOf, statusText, tidyAmount, type ReportFacts, type ReportPreview, type ReportState, type ViewTable } from './model';

export function docNeeds(f: ReportFacts): string[] {
  const needs: string[] = [];
  const ask = (t: string, what: string, wanted = true) => {
    if (!t.trim()) { if (wanted) needs.push(what); }
    else if (!printable(t)) needs.push(`${what}, in English letters`);
  };
  ask(f.name, 'The business’s name');
  ask(f.activity, 'What the business does');
  ask(f.address, 'The business’s address');
  ask(f.lender, 'The lender', false);
  ask(f.preparedBy, 'Prepared by', false);
  return needs;
}
export const allNeeds = (s: ReportState, p: ReportPreview) => [...p.needs, ...docNeeds(s.doc)];
export const docStatus = (s: ReportState, p: ReportPreview) => statusText(p, docNeeds(s.doc).length);
export function fileName(s: ReportState, p: ReportPreview, ext: string): string {
  const name = s.doc.name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60).trim();
  return `Project report${name ? ` - ${name}` : ''}${allNeeds(s, p).length ? ' (provisional)' : ''}.${ext}`;
}

const dmy = (iso: string) => iso.split('-').reverse().join('-');
const ok = (t: string) => (t.trim() && printable(t) ? t.trim() : '');

/** A table of the page as a table of the document, the engine's figures beside the words for the Excel copy. */
function tableOf(v: ViewTable): Block[] {
  const t: Table = {
    columns: [{ label: v.first }, ...v.columns.map((label) => ({ label }))],
    rows: v.rows.map((r) => (r.kind === 'head'
      ? { kind: 'head', cells: [{ text: r.label }] }
      : { ...(r.kind ? { kind: r.kind } : {}), cells: [{ text: r.label }, ...r.values.map((text, i): Cell => {
        const x = r.n?.[i];
        return x === undefined || !Number.isFinite(x) || text === '—' ? { text } : { text, figure: { value: x, kind: r.fig ?? 'amount', decimals: (text.replace('%', '').split('.')[1] ?? '').length } };
      })] })),
  };
  return [{ kind: 'heading', text: v.title }, { kind: 'table', table: t }];
}

/** The figures entered, each once, as typed. */
function entered(s: ReportState): [string, string][] {
  const pairs: [string, string][] = [];
  const amount = (t: string) => (t.trim() ? `Rs. ${tidyAmount(t)}` : 'None');
  const who = BORROWERS.find((b) => b.id === s.borrower);
  if (who) pairs.push(['Constitution', who.label]);
  for (const h of HEADS) if (s.cost[h.id].trim()) pairs.push([h.label, amount(s.cost[h.id])]);
  const l = s.loan, rep = REPAYMENT_CHOICES.find((r) => r.value === l.repayment)?.label ?? '';
  const month = parseMonth(l.disbursed), m = plainOf(l.moratoriumMonths);
  pairs.push(['Term loan', `${amount(l.amount)} at ${plainOf(l.ratePct)}% a year, first drawn in ${month ? monthText(month) : l.disbursed}; ${m ? `${m} months' moratorium` : 'no moratorium'}; ${plainOf(l.instalments)} instalments, ${rep.toLowerCase()}`]);
  if (s.subsidy.trim()) pairs.push(['Capital subsidy', amount(s.subsidy)]);
  if (s.unsecured.trim()) pairs.push(['Unsecured loans', amount(s.unsecured)]);
  pairs.push(['Sales in the first year', `${amount(s.sales)}, growing ${plainOf(s.salesGrowth)}% a year`]);
  pairs.push(['Materials and other variable costs', `${plainOf(s.variablePct)}% of sales`]);
  pairs.push(['Fixed costs in the first year', `${amount(s.fixed)}, growing ${plainOf(s.fixedGrowth)}% a year`]);
  pairs.push(['Stock, debtors and creditors', `${plainOf(s.days.stock)}, ${plainOf(s.days.debtors)} and ${plainOf(s.days.creditors)} days`]);
  pairs.push(['Working-capital limit sought', `${amount(s.wcLimit)}${plainOf(s.wcLimit) ? ` at ${plainOf(s.wcRate)}% a year` : ''}`]);
  return pairs;
}

export function reportDoc(s: ReportState, p: ReportPreview, today: string): Doc | undefined {
  const v = p.view;
  if (!v || p.blocked) return undefined;
  const f = s.doc, needs = allNeeds(s, p), name = ok(f.name), by = ok(f.preparedBy), table = (id: string) => tableOf(v.tables.find((t) => t.id === id) as ViewTable);
  const who = BORROWERS.find((b) => b.id === s.borrower)?.label ?? '';
  const facts: [string, string][][] = [[['Address', ok(f.address) || 'Still needed']], [['Constitution', who], ['Prepared on', dmy(today)]]];
  if (ok(f.lender)) facts.push([['Lender', ok(f.lender)]]);
  if (by) facts.push([['Prepared by', by]]);
  const first: Block[] = [
    { kind: 'title', text: name || 'Project report', sub: `Project report${ok(f.activity) ? `: ${ok(f.activity)}` : ''}, ${v.years[0]} to ${v.years[v.years.length - 1]}` },
    { kind: 'facts', lines: facts },
    ...(needs.length ? [{ kind: 'box', title: `Provisional: ${needs.length} still needed`, items: needs } as Block] : []),
    { kind: 'figures', items: v.key },
    ...table('cost'), ...table('finance'),
    { kind: 'signature', lines: [`For ${name || 'the business'}`, '', 'Authorised signatory', 'Date:', 'Place:'] },
  ];
  return {
    title: `Project report${name ? `, ${name}` : ''}`,
    header: `Project report${name ? ` · ${name}` : ''}`,
    ...(needs.length ? { mark: 'Provisional' } : {}),
    footer: `Made with ${SITE_NAME} on ${dmy(today)} from the figures entered; every figure worked out twice.`,
    workbookNote: 'Each cell holds the exact figure worked out on the page, shown in whole rupees; there are no formulas.',
    ...(by || name ? { author: by || name } : {}),
    creator: SITE_NAME,
    parts: [
      { name: 'Summary', blocks: first },
      { name: 'Projections', blocks: [{ kind: 'title', text: 'Projected financial statements', small: true }, ...table('pl'), ...table('bs'), ...table('cf')] },
      { name: 'DSCR and ratios', blocks: [{ kind: 'title', text: 'DSCR, break-even, ratios and working capital', small: true }, ...table('dscr'), ...table('bep'), ...table('ratios'), ...table('wc')] },
      { name: 'Annex', blocks: [
        { kind: 'title', text: 'Annex. The term loan, and the basis', small: true }, ...table('schedule'),
        { kind: 'heading', text: 'The figures entered' }, { kind: 'pairs', pairs: entered(s) },
        { kind: 'heading', text: 'How the figures are worked out' }, { kind: 'list', items: METHOD },
      ] },
    ],
  };
}
