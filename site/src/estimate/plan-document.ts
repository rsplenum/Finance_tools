/**
 * The planning estimate as a document to download (A15), written three times (site/src/doc/): page 1 the facts, the
 * abstract of cost by section, the total in figures and words and the cost a sq ft, signed; Annex 1 every item under its
 * section with its quantity, rate and amount; Annex 3 what the estimate assumes and the sources of its rates. Built from
 * the page's state and preview only: every figure is the engine's, and none is computed here. The flags, the five-level
 * strip and the change from the package stay on the page.
 */
import type { Block, Cell, Doc, Figure, Table } from '../doc/doc';
import { printable } from '../doc/pdf';
import { SITE_NAME } from '../site';
import { statusText, type PlanFacts, type PlanPreview, type PlanState } from './plan-model';

/** What the document needs that the page does not ask: the owner's name and the property, in letters the PDF prints. */
export function planDocNeeds(f: PlanFacts): string[] {
  const needs: string[] = [];
  const ask = (t: string, what: string, wanted = true) => {
    if (!t.trim()) { if (wanted) needs.push(what); }
    else if (!printable(t)) needs.push(`${what}, in English letters`);
  };
  ask(f.owner, "The owner's name");
  ask(f.property, 'The property’s address');
  ask(f.lender, 'The lender', false);
  ask(f.preparedBy, 'Prepared by', false);
  return needs;
}

export const planAllNeeds = (s: PlanState, p: PlanPreview) => [...p.needs, ...planDocNeeds(s.doc)];
export const planDocStatus = (s: PlanState, p: PlanPreview) => statusText(p, planDocNeeds(s.doc));

export function planFileName(s: PlanState, p: PlanPreview, ext: string): string {
  const name = s.doc.owner.replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60).trim();
  return `Planning estimate${name ? ` - ${name}` : ''}${planAllNeeds(s, p).length ? ' (provisional)' : ''}.${ext}`;
}

const dmy = (iso: string) => iso.split('-').reverse().join('-');
const ok = (t: string) => (t.trim() && printable(t) ? t.trim() : '');
const cell = (text: string, value: number, kind: Figure['kind'] = 'amount'): Cell =>
  ({ text, figure: { value, kind, decimals: (text.split('.')[1] ?? '').length } });

/** The document, or undefined while the page shows no estimate. `today` as 2026-10-03. */
export function planDoc(s: PlanState, p: PlanPreview, today: string): Doc | undefined {
  const v = p.view;
  if (!v || p.blocked) return undefined;
  const f = s.doc, needs = planAllNeeds(s, p), owner = ok(f.owner), by = ok(f.preparedBy);
  const sections = v.sections.filter((x) => x.no > 0);

  const facts: [string, string][][] = [
    [['Owner', owner || 'Still needed']],
    [['Property', ok(f.property) || 'Still needed']],
    [['Work', `${v.kind}, ${v.home.toLowerCase()}, ${v.bhk}`], ['Carpet area', v.area]],
    [['City', v.city], ['Level', v.level]],
    [['Lender', ok(f.lender) || 'Not given'], ['Rates as of', v.ratesDate]],
  ];
  if (by) facts.push([['Prepared by', by]]);

  const abstract: Table = {
    columns: [{ label: 'Abstract of cost' }, { label: 'Rupees' }],
    rows: [
      ...sections.map((x) => ({ cells: [{ text: `${x.no}. ${x.name}` }, cell(x.amount, x.n)] })),
      { kind: 'ratio' as const, cells: [{ text: 'Total estimated cost' }, cell(v.total, v.n.total)] },
    ],
  };
  const blocks: Block[] = [
    { kind: 'title', text: v.title, sub: `Planning estimate prepared with ${SITE_NAME} on ${dmy(today)}; rates from the sources in Annex 3.` },
    { kind: 'facts', lines: facts },
  ];
  if (needs.length) blocks.push({ kind: 'box', title: `Provisional: ${needs.length} still needed`, items: needs });
  blocks.push({ kind: 'table', table: abstract });
  blocks.push({ kind: 'text', text: `In words: ${v.words}` });
  blocks.push({ kind: 'figures', items: [
    { label: 'Total estimated cost', value: `Rs. ${v.total}` },
    { label: 'Cost per sq ft', value: `Rs. ${v.perSqft}`, note: 'of carpet area' },
  ] });
  if (v.split) blocks.push({ kind: 'table', table: { columns: [{ label: 'Of the total' }, { label: 'Rupees' }], rows: v.split.map((x) => ({ cells: [{ text: x.label }, cell(x.amount, x.n)] })) } });
  blocks.push({ kind: 'signature', lines: [`For ${by || 'the engineer or architect who adopts this estimate'}`, '', 'Signature and seal', 'Name and registration number:', 'Date:', 'Place:'] });

  const detail: Table = {
    columns: [{ label: 'Item' }, { label: 'Level' }, { label: 'Quantity' }, { label: 'Unit' }, { label: 'Rate' }, { label: 'Amount' }],
    rows: [
      ...sections.flatMap((x) => [
        { kind: 'head' as const, cells: [{ text: `${x.no}. ${x.name}` }] },
        ...x.lines.map((l) => ({ cells: [
          { text: `${l.no} ${l.room}: ${l.item}. ${l.spec}${l.brands ? `. ${l.brands}` : ''}${l.sources.length ? ` ${l.sources.map((r) => `[${r.no}]`).join('')}` : ''}` },
          { text: l.level || 'All' }, cell(l.qty, l.n.qty, 'quantity'), { text: l.unit }, cell(l.rate, l.n.rate), cell(l.amount, l.n.amount),
        ] })),
        { kind: 'total' as const, cells: [{ text: `Total of ${x.name.toLowerCase()}` }, { text: '' }, { text: '' }, { text: '' }, { text: '' }, cell(x.amount, x.n)] },
      ]),
      { kind: 'ratio' as const, cells: [{ text: 'Total estimated cost' }, { text: '' }, { text: '' }, { text: '' }, { text: '' }, cell(v.total, v.n.total)] },
    ],
    size: 'small',
  };

  return {
    title: `${v.title}${owner ? `, ${owner}` : ''}`,
    header: `Planning estimate${owner ? ` · ${owner}` : ''}`,
    ...(needs.length ? { mark: 'Provisional' } : {}),
    footer: `Made with ${SITE_NAME} on ${dmy(today)}: the rooms, quantities and rates worked out from the answers given, every figure worked out twice.`,
    workbookNote: 'Each cell holds the exact figure worked out on the page, shown in whole rupees; there are no formulas.',
    ...(by || owner ? { author: by || owner } : {}),
    creator: SITE_NAME,
    parts: [
      { name: 'Estimate', blocks },
      { name: 'Detailed estimate', blocks: [
        { kind: 'title', text: 'Annex 1. Detailed estimate', small: true },
        { kind: 'text', text: 'In rupees; amounts rounded to the rupee, totals from the exact figures. Each rate includes fixing, wastage and the city’s labour; brands are examples at the level, and "or equivalent" means any brand of the same level. The numbers in brackets are the sources in Annex 3.', small: true },
        { kind: 'table', table: detail },
      ] },
      { name: 'Assumptions and sources', blocks: [
        { kind: 'title', text: 'Annex 3. Assumptions and sources', small: true },
        { kind: 'heading', text: 'What the estimate assumes' },
        { kind: 'list', items: v.assumed.map((a) => `${a.what}: ${a.shown}. ${a.why}`), small: true },
        { kind: 'heading', text: 'Sources of the rates and rules' },
        { kind: 'text', text: `Each rate is the middle of the range its sources report, read on ${v.ratesDate}. Each source is listed with its class so that it can be checked.`, small: true },
        { kind: 'list', items: v.classes.map((c) => `Class ${c.id}: ${c.means}`), small: true },
        { kind: 'list', items: v.sources.map((x) => `[${x.no}] ${x.what}${x.cls ? ` (class ${x.cls})` : ''}${x.url ? `: ${x.url}` : ''}`), small: true },
      ] },
    ],
  };
}
