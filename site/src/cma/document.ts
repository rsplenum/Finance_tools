/**
 * The CMA data as a document to download, written as a PDF and an Excel workbook (site/src/doc/): page 1 Form I with the
 * limit, what to look at and what is still needed, signed; then Forms II and III; Forms IV to VI; the ratios; and a check
 * whose cells in the Excel copy are formulas on Forms II and III beside the engine's figures, for a lender to re-check
 * them. Built from the page's state and preview only: the tables are the page's (model.ts), every figure the engine's.
 */
import type { Block, Cell, Doc, Table } from '../doc/doc';
import { printable } from '../doc/pdf';
import { SITE_NAME } from '../site';
import { ASSUMPTIONS, statusText, type CmaFacts, type CmaPreview, type CmaState, type ViewTable } from './model';

export function docNeeds(f: CmaFacts): string[] {
  const needs: string[] = [];
  if (!f.name.trim()) needs.push('The business’s name');
  else if (!printable(f.name)) needs.push('The business’s name, in English letters');
  if (f.preparedBy.trim() && !printable(f.preparedBy)) needs.push('Prepared by, in English letters');
  return needs;
}
export const allNeeds = (s: CmaState, p: CmaPreview) => [...p.needs, ...docNeeds(s.doc)];
export const docStatus = (s: CmaState, p: CmaPreview) => statusText(p, docNeeds(s.doc).length);
export function fileName(s: CmaState, p: CmaPreview, ext: string): string {
  const name = s.doc.name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60).trim();
  return `CMA data${name ? ` - ${name}` : ''}${allNeeds(s, p).length ? ' (provisional)' : ''}.${ext}`;
}

const dmy = (iso: string) => iso.split('-').reverse().join('-');
const ok = (t: string) => (t.trim() && printable(t) ? t.trim() : '');

/** A table of the page as a table of the document: the engine's figures beside the words, and the rows' names and formulas for the Excel copy. */
function tableOf(v: ViewTable): Block[] {
  const t: Table = {
    columns: [{ label: v.first }, ...v.columns.map((label) => ({ label }))],
    rows: v.rows.map((r) => (r.kind === 'head'
      ? { kind: 'head', cells: [{ text: r.label }] }
      : { ...(r.kind ? { kind: r.kind } : {}), ...(r.ref ? { ref: r.ref } : {}), cells: [{ text: r.label }, ...r.values.map((text, i): Cell => {
        const x = r.n?.[i];
        return x === undefined || !Number.isFinite(x) || text === '—' ? { text }
          : { text, figure: { value: x, kind: r.fig ?? 'amount', decimals: (text.replace('%', '').split('.')[1] ?? '').length, ...(r.formula ? { formula: r.formula } : {}) } };
      })] })),
  };
  return [{ kind: 'heading', text: v.title }, { kind: 'table', table: t }];
}

export function cmaDoc(s: CmaState, p: CmaPreview, today: string): Doc | undefined {
  const v = p.view;
  if (!v || p.blocked) return undefined;
  const needs = allNeeds(s, p), name = ok(s.doc.name), by = ok(s.doc.preparedBy), table = (id: string) => tableOf(v.tables.find((t) => t.id === id) as ViewTable);
  const facts: [string, string][][] = [[['Years', `${v.years[0]} to ${v.years[v.years.length - 1]}`], ['Prepared on', dmy(today)]]];
  if (by) facts.push([['Prepared by', by]]);
  const first: Block[] = [
    { kind: 'title', text: name || 'CMA data', sub: `Credit monitoring arrangement data, ${v.years[0]} to ${v.years[v.years.length - 1]}` },
    { kind: 'facts', lines: facts },
    ...(needs.length ? [{ kind: 'box', title: `Provisional: ${needs.length} still needed`, items: needs } as Block] : []),
    { kind: 'figures', items: v.key },
    ...table('form1'),
    ...(v.flags.length ? [{ kind: 'box', title: 'To look at', items: v.flags } as Block] : []),
    { kind: 'signature', lines: [`For ${name || 'the business'}`, '', 'Authorised signatory', 'Date:', 'Place:'] },
  ];
  return {
    title: `CMA data${name ? `, ${name}` : ''}`,
    header: `CMA data${name ? ` · ${name}` : ''}`,
    ...(needs.length ? { mark: 'Provisional' } : {}),
    footer: `Made with ${SITE_NAME} on ${dmy(today)} from the figures entered; every figure worked out twice.`,
    workbookNote: 'Each cell holds the exact figure worked out on the page, in whole rupees. The Check sheet redoes the main figures by formulas on the Forms II and III sheet, beside the figures, with their differences.',
    ...(by || name ? { author: by || name } : {}),
    creator: SITE_NAME,
    parts: [
      { name: 'Summary', blocks: first },
      { name: 'Forms II and III', blocks: [{ kind: 'title', text: 'Operating statement and balance sheet', small: true }, ...table('form2'), ...table('form3')] },
      { name: 'Forms IV to VI', blocks: [{ kind: 'title', text: 'Working capital, the limit and the funds flow', small: true }, ...table('form4'), ...table('form5'), ...table('form6')] },
      { name: 'Ratios', blocks: [{ kind: 'title', text: 'Ratios', small: true }, ...table('ratios'),
        { kind: 'heading', text: 'Assumed until changed' }, { kind: 'list', items: ASSUMPTIONS.map((a) => `${a.what}: ${a.shown}. ${a.why}.`) }] },
      { name: 'Check', blocks: [{ kind: 'title', text: 'Check', small: true }, ...tableOf(v.check)] },
    ],
  };
}
