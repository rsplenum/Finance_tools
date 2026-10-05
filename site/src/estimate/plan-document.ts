/**
 * The planning estimate as a document to download (A15), written three times (site/src/doc/): page 1 the facts, the
 * abstract of cost by section, the total in figures and words and the cost a sq ft, signed; Annex 1 every item under its
 * section with its quantity, rate and amount; for a new house, Annex 2 its stages for a construction loan (E5); then what
 * the estimate assumes, one line each. Annexes are numbered in order with no gap (D-DOC-09). Built from the page's state and preview only: every figure
 * is the engine's, and none is computed here. The flags, the five-level strip, the change from the package and the sources stay on the page.
 */
import type { Block, Cell, Doc, Figure, Table } from '../doc/doc';
import { printable } from '../doc/pdf';
import { BRAND_NOTICE, BRAND_NOTICE_SHORT, SITE_NAME } from '../site';
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
/** Assumptions page 1 already shows: the city and the rates' date in the facts, the sections in the abstract. */
const ON_PAGE_1 = ['City', 'Rates', 'Sections'];
const ok = (t: string) => (t.trim() && printable(t) ? t.trim() : '');
/** Whether the estimate's lines name a brand: only then the brand notice and the words on brands (D-BIZ-05). */
const branded = (v: NonNullable<PlanPreview['view']>) => v.sections.some((x) => x.no > 0 && x.lines.some((l) => l.brands));
/** The brand notice (D-BIZ-03) where a line names a brand: in the body's type, never smaller or lighter than the brands. */
const brandNotice = (v: NonNullable<PlanPreview['view']>, text = BRAND_NOTICE): Block[] => (branded(v) ? [{ kind: 'text', text }] : []);
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
    [['Work', `${v.kind}, ${['Flat', 'House'].includes(v.home) ? v.home.toLowerCase() : v.home}, ${v.bhk}`], [v.areaName, v.area]],
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
    { kind: 'title', text: v.title, sub: `Planning estimate prepared with ${SITE_NAME} on ${dmy(today)}.` },
    { kind: 'facts', lines: facts },
  ];
  if (needs.length) blocks.push({ kind: 'box', title: `Provisional: ${needs.length} still needed`, items: needs });
  blocks.push({ kind: 'table', table: abstract });
  blocks.push({ kind: 'text', text: `In words: ${v.words}` });
  blocks.push({ kind: 'figures', items: [
    { label: 'Total estimated cost', value: `Rs. ${v.total}` },
    { label: 'Cost per sq ft', value: `Rs. ${v.perSqft}`, note: `of ${v.areaName.toLowerCase()}` },
  ] });
  if (v.split) blocks.push({ kind: 'table', table: { columns: [{ label: 'Of the total' }, { label: 'Rupees' }], rows: v.split.map((x) => ({ cells: [{ text: x.label }, cell(x.amount, x.n)] })) } });
  // A new house: its stages for a construction loan are an annex of their own, so page 1 stays the signed abstract.
  if (v.stages) blocks.push({ kind: 'text', text: 'The stages of construction, for a construction loan\'s payments, are in Annex 2.' });
  blocks.push({ kind: 'signature', lines: [`For ${by || 'the engineer or architect who adopts this estimate'}`, '', 'Signature and seal', 'Name and registration number:', 'Date:', 'Place:'] });

  const detail: Table = {
    columns: [{ label: 'Item' }, { label: 'Level' }, { label: 'Quantity' }, { label: 'Unit' }, { label: 'Rate' }, { label: 'Amount' }],
    rows: [
      ...sections.flatMap((x) => [
        { kind: 'head' as const, cells: [{ text: `${x.no}. ${x.name}` }] },
        ...x.lines.map((l) => ({ cells: [
          { text: `${l.no} ${l.room}: ${l.item}. ${l.spec}${l.brands ? `. ${l.brands}` : ''}` },
          { text: l.level || 'All' }, cell(l.qty, l.n.qty, 'quantity'), { text: l.unit }, cell(l.rate, l.n.rate), cell(l.amount, l.n.amount),
        ] })),
        { kind: 'total' as const, cells: [{ text: `Total of ${x.name.toLowerCase()}` }, { text: '' }, { text: '' }, { text: '' }, { text: '' }, cell(x.amount, x.n)] },
      ]),
      { kind: 'ratio' as const, cells: [{ text: 'Total estimated cost' }, { text: '' }, { text: '' }, { text: '' }, { text: '' }, cell(v.total, v.n.total)] },
    ],
    size: 'small',
  };

  // A new house's stages (E5): what each covers, its amount, its share of the total and the share by its end.
  const stages: Table | undefined = v.stages && {
    columns: [{ label: 'Stage' }, { label: 'Rupees' }, { label: 'Share' }, { label: 'By then' }],
    rows: [
      ...v.stages.map((x) => ({ cells: [{ text: x.name }, cell(x.amount, x.n), { text: x.share }, { text: x.upTo }] })),
      { kind: 'total' as const, cells: [{ text: 'Total estimated cost' }, cell(v.total, v.n.total), { text: '100%' }, { text: '' }] },
    ],
  };
  const assumedNo = stages ? 3 : 2;

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
        { kind: 'text', text: `In rupees; amounts rounded to the rupee, totals from the exact figures. Each rate includes fixing, wastage and the city’s labour.${branded(v) ? ' "Or equivalent" means any brand of the same level.' : ''}`, small: true },
        ...brandNotice(v),
        { kind: 'table', table: detail },
      ] },
      ...(stages ? [{ name: 'Stages', blocks: [
        { kind: 'title' as const, text: 'Annex 2. Stages of construction', small: true },
        { kind: 'text' as const, text: 'For planning a construction loan\'s payments: the structure split by published shares of a house\'s cost (foundation and plinth, the frame and slabs alike for each floor, the walls and plaster); the finishing, the outside works and the water from the estimate\'s own items. Not a lender\'s own schedule.', small: true },
        { kind: 'table' as const, table: stages },
        { kind: 'list' as const, items: (v.stages ?? []).map((x) => `${x.name}: ${x.what}.`), small: true },
      ] }] : []),
      { name: 'Assumptions', blocks: [
        { kind: 'title', text: `Annex ${assumedNo}. What the estimate assumes`, small: true },
        { kind: 'pairs', pairs: v.assumed.filter((a) => !ON_PAGE_1.includes(a.what)).map((a): [string, string] => [a.what, a.shown]) },
      ] },
    ],
  };
}

export function billFileName(s: PlanState, ext: string): string {
  const name = s.doc.owner.replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60).trim();
  return `Bill of quantities${name ? ` - ${name}` : ''}.${ext}`;
}

/**
 * The bill of quantities for contractors to quote like for like (E4a, D-UX-36): each item once, with its specification,
 * its rooms and its quantity from the engine; the rate, the amount, the make offered and every total left blank. None of
 * our levels, rates or totals, so a contractor is not anchored to them. Undefined while the page shows no estimate.
 */
export function billDoc(s: PlanState, p: PlanPreview, today: string): Doc | undefined {
  const v = p.view;
  if (!v || p.blocked) return undefined;
  const owner = ok(s.doc.owner), property = ok(s.doc.property);
  const facts: [string, string][][] = [
    ...(owner ? [[['Owner', owner] as [string, string]]] : []),
    ...(property ? [[['Property', property] as [string, string]]] : []),
    [['Work', `${v.kind}, ${['Flat', 'House'].includes(v.home) ? v.home.toLowerCase() : v.home}, ${v.bhk}`], [v.areaName, v.area]],
    [['City', v.city]],
  ];
  const blank = (n: number) => Array.from({ length: n }, () => ({ text: '' }));
  const bill: Table = {
    columns: [{ label: 'No.' }, { label: 'Item and specification', wrap: 3 }, { label: 'Where', wrap: 2 }, { label: 'Quantity' }, { label: 'Unit' },
      { label: 'Rate' }, { label: 'Amount' }, { label: 'Make offered' }],
    rows: [
      ...v.bill.flatMap((x) => [
        { kind: 'head' as const, cells: [{ text: `${x.no}. ${x.name}` }] },
        ...x.lines.map((l) => ({ cells: [{ text: l.no }, { text: l.item }, { text: l.where }, cell(l.qty, l.n.qty, 'quantity'), { text: l.unit }, ...blank(3)] })),
        { kind: 'total' as const, cells: [{ text: '' }, { text: `Total of ${x.name.toLowerCase()}` }, ...blank(6)] },
      ]),
      { kind: 'total' as const, cells: [{ text: '' }, { text: 'Total of all sections' }, ...blank(6)] },
      { cells: [{ text: '' }, { text: 'GST, if not included in the rates' }, ...blank(6)] },
      { kind: 'ratio' as const, cells: [{ text: '' }, { text: 'Total quoted, with GST' }, ...blank(6)] },
    ],
    size: 'small',
  };
  return {
    title: `Bill of quantities${owner ? `, ${owner}` : ''}`,
    header: `Bill of quantities${owner ? ` · ${owner}` : ''}`,
    footer: `Made with ${SITE_NAME} on ${dmy(today)}: the quantities worked out from the answers given; the rates and amounts are the contractor's.`,
    workbookNote: 'The quantities are the exact figures worked out on the page; Rate, Amount and Make offered are for the contractor to fill in.',
    ...(owner ? { author: owner } : {}),
    creator: SITE_NAME,
    parts: [{ name: 'Bill of quantities', blocks: [
      { kind: 'title', text: 'Bill of quantities', sub: `For quotations: ${v.title.toLowerCase()}. Prepared with ${SITE_NAME} on ${dmy(today)}.` },
      { kind: 'facts', lines: facts },
      { kind: 'text', text: `Please quote a rate for supplying and fixing each item, with its wastage, and the amount for its quantity, and say whether your rates include GST. ${branded(v) ? 'Where brands are named, any make of the same quality will do: write the make you offer.' : 'Write the make you offer.'} Leave a line blank if you do not quote for it.` },
      ...brandNotice(v, BRAND_NOTICE_SHORT),
      { kind: 'text', text: 'The quantities are planned from the floor area and the rooms, not measured on site: check them when you visit.', small: true },
      { kind: 'table', table: bill },
      { kind: 'signature', lines: ['Quoted by', '', 'Name of the contractor or firm:', 'GSTIN, if registered:', 'Signature and date:', 'Rates valid until:'] },
    ] }],
  };
}
