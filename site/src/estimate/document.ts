/**
 * The estimate as a document to download, in the format lenders use, written three times (site/src/doc/): page 1 the
 * abstract of cost by head and the total, signed; Annex 1 the detailed estimate, item by item, with how the totals are
 * worked out. Built from the page's state and preview only: every figure is the engine's, and none is computed here.
 */
import { KINDS, METHOD } from '../../../engine/estimate';
import type { Block, Cell, Doc, Figure, Table } from '../doc/doc';
import { printable } from '../doc/pdf';
import { SITE_NAME } from '../site';
import { plainOf, quantityText, statusText, type EstimateFacts, type EstimatePreview, type EstimateState } from './model';

/** What the document needs that the page does not ask: the borrower's name and the property, in letters the PDF prints. */
export function docNeeds(f: EstimateFacts): string[] {
  const needs: string[] = [];
  const ask = (t: string, what: string, wanted = true) => {
    if (!t.trim()) { if (wanted) needs.push(what); }
    else if (!printable(t)) needs.push(`${what}, in English letters`);
  };
  ask(f.borrower, "The borrower's name");
  ask(f.property, 'The property’s address');
  ask(f.lender, 'The lender', false);
  ask(f.preparedBy, 'Prepared by', false);
  return needs;
}

export const allNeeds = (s: EstimateState, p: EstimatePreview) => [...p.needs, ...docNeeds(s.doc)];
export const docStatus = (s: EstimateState, p: EstimatePreview) => statusText(p, docNeeds(s.doc));

export function fileName(s: EstimateState, p: EstimatePreview, ext: string): string {
  const name = s.doc.borrower.replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60).trim();
  return `Estimate${name ? ` - ${name}` : ''}${allNeeds(s, p).length ? ' (provisional)' : ''}.${ext}`;
}

const dmy = (iso: string) => iso.split('-').reverse().join('-');
const ok = (t: string) => (t.trim() && printable(t) ? t.trim() : '');
const cell = (text: string, value: number, kind: Figure['kind'] = 'amount'): Cell =>
  ({ text, figure: { value, kind, decimals: (text.split('.')[1] ?? '').length } });

/** The document, or undefined while the page shows no estimate. `today` as 2026-10-02. */
export function estimateDoc(s: EstimateState, p: EstimatePreview, today: string): Doc | undefined {
  const v = p.view;
  if (!v || p.blocked || !s.kind) return undefined;
  const f = s.doc, needs = allNeeds(s, p), borrower = ok(f.borrower), by = ok(f.preparedBy), area = plainOf(s.area);
  const what = `${KINDS[s.kind].label}${area ? `, built-up area ${quantityText(area)} sq ft` : ''}`;
  const facts: [string, string][][] = [[['Property', ok(f.property) || 'Still needed']], [['Lender', ok(f.lender) || 'Not given'], ['Prepared on', dmy(today)]]];
  if (by) facts.push([['Prepared by', by]]);
  facts.push([['Rates', s.basis.trim()]]);

  const abstract: Table = {
    columns: [{ label: 'Abstract of cost' }, { label: 'Rupees' }],
    rows: [
      ...v.heads.map((h) => ({ cells: [{ text: `${h.no}. ${h.label}` }, cell(h.amount, h.n)] })),
      ...v.totals.map((t) => ({ ...(t.id === 'works' ? { kind: 'total' as const } : t.id === 'total' ? { kind: 'ratio' as const } : {}), cells: [{ text: t.label }, cell(t.amount, t.n)] })),
    ],
  };
  const blocks: Block[] = [
    { kind: 'title', text: borrower || 'Estimate of cost', sub: `Estimate of cost: ${what.charAt(0).toLowerCase()}${what.slice(1)}` },
    { kind: 'facts', lines: facts },
  ];
  if (needs.length) blocks.push({ kind: 'box', title: `Provisional: ${needs.length} still needed`, items: needs });
  blocks.push({ kind: 'table', table: abstract });
  blocks.push({ kind: 'figures', items: [
    { label: 'Total estimated cost', value: `Rs. ${v.total}` },
    ...(v.perSqft ? [{ label: 'Cost per sq ft', value: `Rs. ${v.perSqft}`, note: 'of built-up area' }] : []),
  ] });
  blocks.push({ kind: 'signature', lines: [`For ${by || 'the engineer or architect'}`, '', 'Signature and seal', 'Date:', 'Place:'] });

  const detail: Table = {
    columns: [{ label: 'Item' }, { label: 'Quantity' }, { label: 'Unit' }, { label: 'Rate' }, { label: 'Amount' }],
    rows: v.heads.flatMap((h) => [
      { kind: 'head' as const, cells: [{ text: `${h.no}. ${h.label}` }] },
      ...h.items.map((it) => ({ cells: [{ text: `${it.no} ${it.description}` }, cell(it.quantity, it.n.quantity, 'quantity'), { text: it.unit }, cell(it.rate, it.n.rate), cell(it.amount, it.n.amount)] })),
      { kind: 'total' as const, cells: [{ text: `Total of ${h.label.toLowerCase()}` }, { text: '' }, { text: '' }, { text: '' }, cell(h.amount, h.n)] },
    ]),
  };
  return {
    title: `Estimate of cost${borrower ? `, ${borrower}` : ''}`,
    header: `Estimate of cost${borrower ? ` · ${borrower}` : ''}`,
    ...(needs.length ? { mark: 'Provisional' } : {}),
    footer: `Made with ${SITE_NAME} on ${dmy(today)} from the quantities and rates entered; every figure worked out twice.`,
    workbookNote: 'Each cell holds the exact figure worked out on the page, shown in whole rupees; there are no formulas.',
    ...(by || borrower ? { author: by || borrower } : {}),
    creator: SITE_NAME,
    parts: [
      { name: 'Estimate', blocks },
      { name: 'Detailed estimate', blocks: [
        { kind: 'title', text: 'Annex 1. Detailed estimate', small: true },
        { kind: 'text', text: 'In rupees; amounts rounded, totals from the exact figures.', small: true },
        { kind: 'table', table: detail },
        { kind: 'heading', text: 'How the totals are worked out' },
        { kind: 'list', items: METHOD },
      ] },
    ],
  };
}
