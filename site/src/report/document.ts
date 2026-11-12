/**
 * The project report as a document to download, written three times (site/src/doc/), laid out as a lender reads a
 * project report (DOC1): a cover and a contents page; 1 the project at a glance (what is still needed, the key figures,
 * the proposal, the projections in brief); 2 the promoters and the business, with the report's words once ticked
 * (words.ts); 3 the cost of the project and its means of finance; 4 the basis of the projections; 5 the projected
 * statements; 6 DSCR, break-even, the key ratios and working capital; 7 the repayment schedule; an annex of how the
 * figures are worked out and the rules' sources; and the declaration, signed. Built from the page's state and preview
 * only: the tables are the page's (model.ts), every figure the engine's or as typed, none computed here.
 */
import { inr } from '../../../engine/util';
import { parseMonth } from '../../../engine/parse';
import { sureLower, sureText, type Marked } from '../../../engine/sure';
import { METHOD, MUDRA, PMEGP, REPORT_REVIEW_BY, WORKING_CAPITAL } from '../../../engine/report';
import { GUARANTEES } from '../../../engine/guarantee';
import { overdueNote, todayIso } from '../../../engine/review';
import { BORROWERS } from '../../../engine/tax';
import { soldBy } from '../../../engine/sold-by';
import type { Block, Cell, Doc, Table } from '../doc/doc';
import { forDocument } from '../doc/doc';
import { ALL_ANSWERED } from '../verdict';
import { printable } from '../doc/pdf';
import { monthText } from '../dscr/model';
import { SITE_NAME } from '../site';
import { ACTIVITY_CHOICES, AREA_CHOICES, CATEGORY_CHOICES, CGTMSE, HEADS, REPAYMENT_CHOICES, guaranteeOf, limitOf, plainOf, pmegpConditions, statusText, tidyAmount, wcByOf, withMode, type ReportFacts, type ReportPreview, type ReportState, type ReportWords, type ViewTable } from './model';
import { wordsNeeds, wordsSections } from './words';

/** How sure each rule the report rests on is (D-DATA-25, TRUST1): the tax by who the borrower is, the working-capital
 *  method, and the scheme and guarantee chosen. A mark never changes a figure. The levels the ratios are read against are
 *  the page's, not the report's: the report shows no level (DOC1). */
const sureRules = (s: ReportState) => {
  const who = BORROWERS.find((b) => b.id === s.borrower), gid = guaranteeOf(s);
  return [
    ...(who ? [`The tax for a ${who.label.replace(/^\w/, (c) => c.toLowerCase())}: ${sureLower(who)}.`] : []),
    `The working-capital method: ${sureLower(WORKING_CAPITAL as Marked)}.`,
    ...(s.scheme === 'pmegp' ? [`PMEGP's rules: ${sureLower(PMEGP as Marked)}.`] : s.scheme === 'mudra' ? [`Mudra's rules: ${sureLower(MUDRA as Marked)}.`] : []),
    ...(gid ? [`The guarantee fee (${gid.toUpperCase()}): ${sureLower(GUARANTEES[gid] as Marked)}.`] : []),
  ];
};

/** What the document still needs of the page's own fields, then of the report's words (words.ts). */
export function docNeeds(f: ReportFacts, w?: ReportWords): string[] {
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
  return [...needs, ...wordsNeeds(w)];
}
export const allNeeds = (s: ReportState, p: ReportPreview) => [...p.needs, ...(p.short ? [p.short] : []), ...docNeeds(s.doc, s.words)];
export const docStatus = (s: ReportState, p: ReportPreview) => {
  const own = docNeeds(s.doc, s.words).length;
  return own && statusText(p) === ALL_ANSWERED ? forDocument(own) : statusText(p, own);
};
export function fileName(s: ReportState, p: ReportPreview, ext: string): string {
  const name = s.doc.name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60).trim();
  return `Project report${name ? ` - ${name}` : ''}${allNeeds(s, p).length ? ' (provisional)' : ''}.${ext}`;
}

const dmy = (iso: string) => iso.split('-').reverse().join('-');
const ok = (t: string) => (t.trim() && printable(t) ? t.trim() : '');

/** What a table's figures are in, said above it. */
const UNITS: Record<string, string> = {
  sales: 'Units as stated; amounts in rupees', ratios: 'Ratios in times; margin in per cent', glance: 'Amounts in rupees; DSCR in times',
};
/** The first column's name as a lender's report has it; "Rupees" goes to the unit above the table. */
const firstOf = (t: string) => (['Rupees', 'Item', 'Source', 'Value'].includes(t) ? 'Particulars' : t);

/** A table of the page as a table of the document, numbered, the engine's figures beside the words for the Excel copy. */
function tableOf(v: ViewTable, no?: string): Block[] {
  const t: Table = {
    unit: UNITS[v.id] ?? 'Amounts in rupees',
    columns: [{ label: firstOf(v.first) }, ...v.columns.map((label) => ({ label: label === 'Rupees' ? 'Amount' : label }))],
    rows: v.rows.map((r) => (r.kind === 'head'
      ? { kind: 'head', cells: [{ text: r.label }] }
      : { ...(r.kind ? { kind: r.kind } : {}), cells: [{ text: r.label }, ...r.values.map((text, i): Cell => {
        const x = r.n?.[i];
        return x === undefined || !Number.isFinite(x) || text === '—' ? { text } : { text, figure: { value: x, kind: r.fig ?? 'amount', decimals: (text.replace('%', '').split('.')[1] ?? '').length } };
      })] })),
  };
  return [...(no === '' ? [] : [{ kind: 'heading', text: no ? `${no} ${v.title}` : v.title } as Block]), { kind: 'table', table: t }];
}

const amount = (t: string) => (t.trim() ? `Rs. ${tidyAmount(t)}` : 'None');

/** The proposal as typed: the scheme, the guarantee, the loans, any subsidy, the collateral. */
function proposal(s: ReportState): [string, string][] {
  const pairs: [string, string][] = [];
  // Simple mode's loan as expert mode's fields hold it: its month, holiday and instalments as assumed or worked out.
  const e = withMode(s, 'expert'), l = e.loan, rep = REPAYMENT_CHOICES.find((r) => r.value === l.repayment)?.label ?? '';
  const month = parseMonth(l.disbursed), m = plainOf(l.moratoriumMonths);
  if (s.scheme === 'pmegp') {
    const label = <T,>(c: { value: T; label: string }[], v?: T) => c.find((o) => o.value === v)?.label ?? '';
    pairs.push(['Scheme', `PMEGP; ${label(CATEGORY_CHOICES, s.category).split(':')[0].toLowerCase()} category; ${label(AREA_CHOICES, s.area).toLowerCase()}; ${label(ACTIVITY_CHOICES, s.activity).toLowerCase()}; its conditions ${s.pmegpConfirmed ? 'confirmed' : 'not yet confirmed'}`]);
  }
  if (s.scheme === 'mudra') pairs.push(['Scheme', `Mudra; ${s.tarunRepaid ? 'a Tarun loan taken and repaid' : 'no Tarun loan repaid'}`]);
  pairs.push([s.scheme === 'pmegp' ? 'Term loan applied for' : 'Term loan', `${amount(l.amount)} at ${plainOf(l.ratePct)}% a year, first drawn in ${month ? monthText(month) : l.disbursed}; ${m ? `${m} months' moratorium` : 'no moratorium'}; ${plainOf(l.instalments)} instalments, ${rep.toLowerCase()}`]);
  // The limit as the page holds it: typed, or worked out by the engine (D-UX-112), with its rate as assumed. A worked limit
  // read "None" here while the cover gave its figure, and simple mode's rate read "undefined" (BUILD1: the live paper showed it).
  const worked = wcByOf(s) === 'worked', lim = worked ? limitOf(s) : undefined, rate = plainOf(e.wcRate);
  const limit = worked ? (lim ? `Rs. ${inr(lim)}` : 'Worked out once the questions are answered') : amount(s.wcLimit);
  pairs.push(['Working-capital limit applied for', `${limit}${(worked ? lim : plainOf(s.wcLimit)) && rate !== undefined ? ` at ${rate}% a year` : ''}`]);
  const g = guaranteeOf(s);
  if (g) pairs.push(['Guarantee', `${g === 'cgfmu' ? 'CGFMU' : 'CGTMSE'}${g === 'cgtmse' ? `; concessions: ${CGTMSE.groups.filter((_, k) => s.concessions?.[k]).map((t) => t.split(',')[0].toLowerCase()).join('; ') || 'none'}` : ''}${s.feeRate.trim() ? `; its fee at ${plainOf(s.feeRate)}% a year, as the lender quotes` : ''}`]);
  if (s.subsidy.trim()) pairs.push(['Capital subsidy', amount(s.subsidy)]);
  if (s.unsecured.trim()) pairs.push(['Unsecured loans', amount(s.unsecured)]);
  if (s.collateral.trim()) pairs.push(['Collateral: market value', amount(s.collateral)]);
  return pairs;
}

/** The basis of the projections as typed: sales, the costs, the working capital's days. */
function basis(s: ReportState): [string, string][] {
  // Simple mode's months, fixed costs and their growth as expert mode's fields hold them (as the proposal's loan above):
  // read raw, they printed "undefined" on a simple report's paper.
  const pairs: [string, string][] = [], e = withMode(s, 'expert'), months = plainOf(e.monthsToStart), growth = plainOf(e.fixedGrowth);
  if (s.salesBy === 'typed') pairs.push(['Sales in a full first year', `${amount(s.sales)}, growing ${plainOf(s.salesGrowth)}% a year`]);
  else {
    if (s.salesBy === 'expansion') pairs.push(['Today\'s sales in a full first year', `${amount(s.sales)}, growing ${plainOf(s.salesGrowth)}% a year`]);
    for (const pr of s.products) {
      const u = soldBy(pr.unit);
      pairs.push([`Sales: ${pr.name.trim()}`, `${pr.units.trim()} ${u.many} a month at full running, at Rs. ${tidyAmount(pr.price)} ${u.per}`]);
    }
    pairs.push(['The prices', `Growing ${plainOf(s.priceGrowth)}% a year${s.salesBy === 'expansion' ? ' once the new line is full' : ''}`]);
    pairs.push([s.salesBy === 'expansion' ? 'The new line\'s use' : 'Use of the capacity', `${s.utilisation.split(/[,\s]+/).filter(Boolean).join('%, ')}% by year from the first sales`]);
  }
  pairs.push(['Months from the loan to the first sales', months === undefined ? 'Still needed' : `${months}`]);
  pairs.push(['Materials and other variable costs', `${plainOf(s.variablePct)}% of sales`]);
  pairs.push(['Fixed costs in a full first year', `${amount(e.fixed)}${growth === undefined ? '' : `, growing ${growth}% a year`}`]);
  pairs.push(['Stock, debtors and creditors', `${plainOf(s.days.stock)}, ${plainOf(s.days.debtors)} and ${plainOf(s.days.creditors)} days`]);
  return pairs;
}

/** The method as a lender reads it: the page's own guard ("or no figures are shown") is the site's, not the report's. */
const method = () => [...METHOD.map((t) => t.replace(/, or no figures are shown\./, '.')),
  'Every figure in this report is worked out twice, by two separate methods, and shown only when the two agree.'];

/** The parts by name (a sheet in the Excel copy; a place on the page's live paper, Paper.tsx), and each section's title. */
export const PARTS = { cover: 'Cover', glance: '1 At a glance', business: '2 Business', cost: '3 Cost and finance', basis: '4 Basis', statements: '5 Statements', ratios: '6 DSCR and ratios', repayment: '7 Repayment' } as const;
const TITLES = ['The project at a glance', 'Promoters and the business', 'Cost of the project and means of finance', 'The basis of the projections', 'Projected financial statements',
  'DSCR, break-even, ratios and working capital', 'Repayment of the term loan'];
const whoOf = (s: ReportState) => BORROWERS.find((b) => b.id === s.borrower);
const numbered = (k: number, t: string) => ({ kind: 'title', text: `${k}. ${t}`, small: true }) as Block;
/** The cover, from the report's own facts: `lines` under the name, the lender's after them; `mark` while anything is open. */
function coverOf(s: ReportState, lines: string[], mark: { title: string; text: string } | undefined, today: string): Block {
  const f = s.doc, name = ok(f.name), by = ok(f.preparedBy), lender = ok(f.lender), activity = ok(f.activity);
  return {
    kind: 'cover', kicker: 'Project report', title: name || 'Project report', ...(activity ? { sub: activity } : {}),
    lines: [...lines, lender ? `Submitted to ${lender}` : ''].filter(Boolean),
    facts: [['Address', ok(f.address) || 'Still needed'], ['Constitution', whoOf(s)?.label ?? ''], ...(by ? [['Prepared by', by] as [string, string]] : []), ['Prepared on', dmy(today)]],
    ...(mark ? { mark } : {}),
  };
}
/** Section 2's lines: who the business is, as typed. */
const businessPairs = (s: ReportState): [string, string][] => {
  const f = s.doc, lender = ok(f.lender);
  return [['Name', ok(f.name) || 'Still needed'], ['Constitution', whoOf(s)?.label ?? ''], ['Activity', ok(f.activity) || 'Still needed'], ['Address', ok(f.address) || 'Still needed'], ...(lender ? [['Lender', lender] as [string, string]] : [])];
};
const headOf = (s: ReportState, today: string) => {
  const name = ok(s.doc.name), by = ok(s.doc.preparedBy);
  return { title: `Project report${name ? `, ${name}` : ''}`, header: name ? `${name} · Project report` : 'Project report', footer: `Prepared on ${dmy(today)}${by ? ` by ${by}` : ''}`, ...(by || name ? { author: by || name } : {}), creator: SITE_NAME };
};

/**
 * The paper before the report has its figures (BUILD1, D-UX-340): the same cover and the same parts under the same
 * titles, for the page's live paper only, never a file. What was typed is read back as typed; a part the engine has yet
 * to work out stands as faint lines (`ghost`) under one line that says what it waits for. No figure is worked out here.
 */
export function draftDoc(s: ReportState, p: ReportPreview, today: string): Doc {
  const left = p.blocked ? [p.blocked] : p.needs, n = left.length;
  const waits = n ? `Worked out once the questions are answered: ${n} still to go.` : 'Worked out once the questions are answered.';
  const wait = (k: number, name: string, blocks: Block[], ghost: number, flow = false) =>
    ({ name, section: `${k}. ${TITLES[k - 1]}`, blocks: [numbered(k, TITLES[k - 1]), ...blocks, { kind: 'text', text: waits, small: true } as Block], ghost, ...(flow ? { flow } : {}) });
  const typed = HEADS.filter((h) => plainOf(s.cost[h.id] ?? '') !== undefined || s.cost[h.id]?.trim()).map((h) => [h.label, amount(s.cost[h.id])] as [string, string]);
  const asked = [...(s.loan.amount.trim() ? [['Term loan asked for', amount(s.loan.amount)] as [string, string]] : []), ...(s.loan.ratePct.trim() ? [['Interest rate', `${s.loan.ratePct.trim().replace(/%$/, '')}% a year`] as [string, string]] : [])];
  const sells = s.salesBy === 'typed' ? [] : s.products.filter((pr) => pr.name.trim()).map((pr) => [`Sells: ${pr.name.trim()}`, [pr.units.trim() && `${pr.units.trim()} ${soldBy(pr.unit).many} a month at full running`, pr.price.trim() && `Rs. ${tidyAmount(pr.price)} ${soldBy(pr.unit).per}`].filter(Boolean).join(', at ') || 'Still needed'] as [string, string]);
  return {
    ...headOf(s, today), mark: 'Draft',
    parts: [
      { name: PARTS.cover, blocks: [coverOf(s, [], { title: p.blocked ? 'No figures yet' : 'Draft: it fills in as you answer', text: p.blocked ?? 'Each answer goes into this report as you give it. The figures are worked out once the questions are answered.' }, today), { kind: 'contents', title: 'Contents' }] },
      wait(1, PARTS.glance, n && !p.blocked ? [{ kind: 'box', title: `Still needed: ${n}`, items: left }] : [], 4),
      { name: PARTS.business, section: `2. ${TITLES[1]}`, flow: true, blocks: [numbered(2, TITLES[1]), { kind: 'pairs', pairs: businessPairs(s) }] },
      wait(3, PARTS.cost, typed.length || asked.length ? [{ kind: 'pairs', pairs: [...typed, ...asked] }] : [], 6),
      wait(4, PARTS.basis, sells.length ? [{ kind: 'pairs', pairs: sells }] : [], 4, true),
      wait(5, PARTS.statements, [], 14),
      wait(6, PARTS.ratios, [], 10),
      wait(7, PARTS.repayment, [], 6, true),
    ],
  };
}
/** The paper the page shows beside the questions: the report itself once it has figures, its draft until then. */
export const paperDoc = (s: ReportState, p: ReportPreview, today: string): Doc => reportDoc(s, p, today) ?? draftDoc(s, p, today);

export function reportDoc(s: ReportState, p: ReportPreview, today: string): Doc | undefined {
  const v = p.view;
  if (!v || p.blocked) return undefined;
  const f = s.doc, needs = allNeeds(s, p), name = ok(f.name);
  const has = (id: string) => v.tables.some((t) => t.id === id), get = (id: string) => v.tables.find((t) => t.id === id) as ViewTable;
  const gid = guaranteeOf(s), words = wordsSections(s.words), who = BORROWERS.find((b) => b.id === s.borrower), period = `${v.years[0]} to ${v.years[v.years.length - 1]}`;
  // The figures as the page shows them, read off its tables by name: none worked out here.
  const shown = (id: string, label: (l: string) => boolean) => get(id).rows.find((r) => label(r.label));
  const loan = shown('finance', (l) => l.startsWith('Term loan')), limit = shown('wc', (l) => l === 'Limit applied for'), promoters = shown('finance', (l) => l.startsWith('Promoters'));
  const asks = [loan && `Term loan of Rs. ${loan.values[0]}`, limit && limit.n?.[0] ? `working-capital limit of Rs. ${limit.values[0]}` : ''].filter(Boolean).join(' and a ');
  const n = numbered;
  // The projections in brief: the rows a lender looks for first, year by year, as the statements show them.
  const brief = ([['pl', 'Sales'], ['pl', 'Profit after tax'], ['dscr', 'Cash available (A)'], ['dscr', 'Debt service (B)'], ['dscr', 'DSCR (A ÷ B)'], ['cf', 'Cash at the end of the year']] as const)
    .map(([id, label]) => shown(id, (l) => l === label)).filter((r) => r !== undefined);
  const glance: ViewTable = { id: 'glance', title: 'The projections in brief', first: 'Rupees', columns: v.years,
    rows: brief.map((r) => ({ ...r, kind: r.label.startsWith('DSCR') ? 'ratio' : undefined, values: r.values.slice(0, v.years.length), n: r.n?.slice(0, v.years.length) })) };
  const we = who?.id === 'proprietor' ? 'I' : 'We', our = who?.id === 'proprietor' ? 'my' : 'our';
  const cover = coverOf(s, [asks ? `${asks}` : '', `Projections for ${period}`], needs.length ? { title: `Provisional: ${needs.length} still needed`, text: 'What is still needed is listed in section 1, The project at a glance. The report is to be submitted once it is complete.' } : undefined, today);
  const sec = (k: number, name: string, blocks: Block[], flow = false) => ({ name, section: `${k}. ${TITLES[k - 1]}`, blocks: [n(k, TITLES[k - 1]), ...blocks], ...(flow ? { flow } : {}) });
  return {
    ...headOf(s, today),
    ...(needs.length ? { mark: 'Provisional' } : {}),
    workbookNote: 'Each cell holds the exact figure of the report, shown in whole rupees; there are no formulas.',
    parts: [
      { name: PARTS.cover, blocks: [cover, { kind: 'contents', title: 'Contents' }] },
      sec(1, PARTS.glance, [
        ...(needs.length ? [{ kind: 'box', title: `Provisional: ${needs.length} still needed`, items: needs } as Block] : []),
        ...(p.flags.length ? [{ kind: 'box', title: 'PMEGP: to look at', items: p.flags } as Block] : []),
        { kind: 'figures', items: v.key.map(({ label, value, note }) => (label === 'Average DSCR' ? { label, value } : { label, value, ...(note ? { note } : {}) })) },
        { kind: 'heading', text: '1.1 The proposal' },
        { kind: 'pairs', pairs: [...(promoters ? [[promoters.label, `Rs. ${promoters.values[0]}`] as [string, string]] : []), ...proposal(s)] },
        ...tableOf(glance, '1.2'),
      ]),
      sec(2, PARTS.business, [
        { kind: 'pairs', pairs: businessPairs(s) },
        ...words.flatMap(([label, text], i): Block[] => [{ kind: 'heading', text: `2.${i + 1} ${label}` }, { kind: 'text', text }]),
      ], true),
      sec(3, PARTS.cost, [...tableOf(get('cost'), '3.1'), ...tableOf(get('finance'), '3.2'), ...(has('collateral') ? tableOf(get('collateral'), '3.3') : [])]),
      sec(4, PARTS.basis, [{ kind: 'pairs', pairs: basis(s) }], true),
      (() => { let k = 0; const no = () => `5.${++k}`; return sec(5, PARTS.statements, [...(has('sales') ? tableOf(get('sales'), no()) : []), ...tableOf(get('pl'), no()), ...tableOf(get('bs'), no()), ...tableOf(get('cf'), no())]); })(),
      sec(6, PARTS.ratios, [...tableOf(get('dscr'), '6.1'), ...tableOf(get('bep'), '6.2'), ...tableOf(get('ratios'), '6.3'), ...tableOf(get('wc'), '6.4')]),
      sec(7, PARTS.repayment, tableOf(get('schedule'), ''), true),
      { name: 'Annex', section: 'Annex. How the figures are worked out, and the rules’ sources', blocks: [
        { kind: 'title', text: 'Annex. How the figures are worked out, and the rules’ sources', small: true },
        { kind: 'heading', text: 'How the figures are worked out' }, { kind: 'list', items: method() },
        { kind: 'heading', text: 'The rules used, and how sure each is' }, { kind: 'list', items: sureRules(s) },
        ...(s.scheme === 'pmegp' ? [{ kind: 'heading', text: 'PMEGP: the rules used' } as Block, { kind: 'list', items: [...PMEGP.rules, PMEGP.ours,
          `Source: ${PMEGP.source}. The guideline of 2023: ${sureLower(PMEGP as Marked)}. ${overdueNote(REPORT_REVIEW_BY, todayIso())}`.trim()] } as Block,
          { kind: 'heading', text: 'PMEGP: its conditions' } as Block, { kind: 'list', items: [...pmegpConditions(s, 'guideline'), `${s.pmegpConfirmed ? 'Confirmed by the borrower' : 'Not yet confirmed by the borrower'}. Source: ${PMEGP.conditionsSource}`] } as Block] : []),
        ...(s.scheme === 'mudra' ? [{ kind: 'heading', text: 'Mudra: the rules used' } as Block, { kind: 'list', items: [...MUDRA.rules, `Apply on ${MUDRA.apply.label}: ${MUDRA.apply.url}.`, `Source: ${MUDRA.source} ${sureText(MUDRA as Marked)}.`] } as Block] : []),
        ...(gid ? [{ kind: 'heading', text: `The guarantee fee: ${gid.toUpperCase()}` } as Block, { kind: 'list', items: [...(p.hybrid ? [p.hybrid] : []), `Source: ${GUARANTEES[gid].source} ${sureText(GUARANTEES[gid] as Marked)}.`] } as Block] : []),
      ] },
      { name: 'Declaration', section: 'Declaration', flow: true, blocks: [
        { kind: 'title', text: 'Declaration', small: true },
        { kind: 'text', text: `${we} declare that the information in this report is true to the best of ${our} knowledge and belief, and that the projections are ${our} honest estimate on the basis set out in section 4.` },
        { kind: 'signature', lines: [`For ${name || 'the business'}`, '', 'Authorised signatory', 'Date:', 'Place:'] },
      ] },
    ],
  };
}
