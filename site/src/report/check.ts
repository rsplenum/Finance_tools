/**
 * The check page's summary (Rahul's notes of 15-11-2026, D-UX-372): the report as one readable summary, each figure
 * edited where it sits. The lines and their words are checkOf's (model.ts), as the engine works them; this adds to each
 * line what changes it, in place: a choice, or the boxes that hold its figures, and whether it is still in pencil, the
 * example's (door.ts). Worked lines (the interest before sales, the margin, the promoters' share, the totals) change
 * with what they are worked from and take no box. No figure is worked out here.
 */
import { HEADS } from '../../../engine/report';
import { soldBy } from '../../../engine/sold-by';
import { PENCIL, pencilLeft, type PencilId } from './door';
import {
  BORROWER_CHOICES, REPAYMENT_CHOICES, SCHEME_CHOICES, SECURITY_CHOICES, checkOf, wcByOf,
  type ReportPreview, type ReportState, type Repayment, type Scheme,
} from './model';

export type BoxKind = 'amount' | 'percent' | 'number' | 'text' | 'month';
/** A box in place of a figure: its words for a screen reader, what it holds, and the state with it typed. */
export interface Box { key: string; label: string; kind: BoxKind; unit?: string; text: string; set: (s: ReportState, t: string) => ReportState }
/** A choice in place of a line's words. */
export interface Pick { key: string; label: string; options: { value: string; label: string }[]; value: string; set: (s: ReportState, v: string) => ReportState }
export interface SumLine {
  id: string; label: string; value: string;
  /** A total, set off by its rule. */
  total?: boolean;
  /** Worked out from the lines above it: no box, the words say so. */
  worked?: boolean;
  /** Still the example's, not yet the borrower's (NEW2b): marked where it sits. */
  pencil?: boolean;
  edit?: { boxes?: Box[]; pick?: Pick };
}
export interface SumSection { id: string; title: string; to: string; lines: SumLine[] }

const simple = (s: ReportState) => s.mode === 'simple';
const box = (key: string, label: string, kind: BoxKind, text: string, set: Box['set'], unit?: string): Box => ({ key, label, kind, text, set, ...(unit ? { unit } : {}) });
const HEAD_OF = new Map(HEADS.map((h) => [h.label, h.id]));

/** The summary: checkOf's groups, each line with its way to change it in place. Empty while the report shows no figures. */
export function summaryOf(s: ReportState, p: ReportPreview): SumSection[] {
  const left = new Set<PencilId>(pencilLeft(s)), pen = (...ids: PencilId[]) => ids.some((id) => left.has(id));
  const groups = checkOf(s, p);
  return groups.map((g) => ({ id: g.id, title: g.title, to: g.to, lines: g.lines.map((l, i): SumLine => {
    const base: SumLine = { id: `${g.id}-${i}`, label: l.label, value: l.value };
    const worked = (): SumLine => ({ ...base, worked: true, ...(/^Total/.test(l.label) ? { total: true } : {}) });
    switch (g.id) {
      case 'business':
        if (l.label === 'Who the borrower is') return { ...base, id: 'borrower', pencil: pen('borrower'), edit: { pick: { key: 'borrower', label: l.label, options: BORROWER_CHOICES, value: s.borrower ?? '', set: (x, v) => ({ ...x, borrower: v }) } } };
        if (l.label === 'A government scheme') return { ...base, id: 'scheme', edit: { pick: { key: 'scheme', label: l.label, options: SCHEME_CHOICES, value: s.scheme, set: (x, v) => ({ ...x, scheme: v as Scheme }) } } };
        if (l.label === 'What backs the loan') return { ...base, id: 'security', pencil: pen('security'), ...(simple(s) && s.scheme !== 'mudra'
          ? { edit: { pick: { key: 'security', label: l.label, options: SECURITY_CHOICES.map(({ value, label }) => ({ value, label })), value: s.security ?? '', set: (x, v) => ({ ...x, security: v as ReportState['security'] }) } } } : {}) };
        if (l.label === 'The collateral’s market value') return { ...base, id: 'collateral', edit: { boxes: [box('collateral', l.label, 'amount', s.collateral, (x, t) => ({ ...x, collateral: t }))] } };
        return base;
      case 'cost': {
        const head = HEAD_OF.get(l.label);
        if (head) return { ...base, id: `cost-${head}`, pencil: (head === 'building' || head === 'machinery') && pen('split'),
          edit: { boxes: [box(`cost-${head}`, l.label, 'amount', s.cost[head], (x, t) => ({ ...x, cost: { ...x.cost, [head]: t } }))] } };
        return worked();
      }
      case 'finance':
        if (l.label === 'Term loan') return { ...base, id: 'loan-amount', edit: { boxes: [box('loan-amount', 'Term loan', 'amount', s.loan.amount, (x, t) => ({ ...x, loan: { ...x.loan, amount: t } }))] } };
        if (/^Capital subsidy/.test(l.label) && s.scheme !== 'pmegp') return { ...base, id: 'subsidy', edit: { boxes: [box('subsidy', l.label, 'amount', s.subsidy, (x, t) => ({ ...x, subsidy: t }))] } };
        if (/^Unsecured/.test(l.label)) return { ...base, id: 'unsecured', edit: { boxes: [box('unsecured', l.label, 'amount', s.unsecured, (x, t) => ({ ...x, unsecured: t }))] } };
        return worked();
      case 'loan':
        if (l.label === 'Interest rate') return { ...base, id: 'rate', pencil: pen('rate'), edit: { boxes: [box('rate', 'Interest rate', 'percent', s.loan.ratePct, (x, t) => ({ ...x, loan: { ...x.loan, ratePct: t } }), '% a year')] } };
        if (l.label === 'Loan period') return { ...base, id: 'period', pencil: pen('sellFrom', 'years'), edit: { boxes: simple(s)
          ? [box('sellFrom', 'Sales start in', 'month', s.sellFrom ?? '', (x, t) => ({ ...x, sellFrom: t })), box('years', 'Years to repay after the holiday', 'number', s.years ?? '', (x, t) => ({ ...x, years: t }), 'years')]
          : [box('moratorium', 'Holiday before the first instalment', 'number', s.loan.moratoriumMonths, (x, t) => ({ ...x, loan: { ...x.loan, moratoriumMonths: t } }), 'months'),
            box('instalments', 'Number of instalments', 'number', s.loan.instalments, (x, t) => ({ ...x, loan: { ...x.loan, instalments: t } }))] } };
        if (l.label === 'How it is repaid') return { ...base, id: 'repayment', edit: { pick: { key: 'repayment', label: l.label, options: REPAYMENT_CHOICES, value: s.loan.repayment ?? (simple(s) ? 'emi' : ''),
          set: (x, v) => ({ ...x, loan: { ...x.loan, repayment: v as Repayment } }) } } };
        return base;
      case 'sales': {
        if (l.label === 'Use of the capacity') return { ...base, id: 'utilisation', edit: { boxes: [box('utilisation', 'Use of the capacity by year (%)', 'text', s.utilisation, (x, t) => ({ ...x, utilisation: t }), '%')] } };
        if (l.label === 'Sales in a full first year' || l.label === 'Today\'s sales in a full first year') return { ...base, id: 'sales', edit: { boxes: [box('sales', l.label, 'amount', s.sales, (x, t) => ({ ...x, sales: t }))] } };
        if (/growth a year$/.test(l.label)) return { ...base, id: 'salesGrowth', edit: { boxes: [box('salesGrowth', l.label, 'percent', s.salesGrowth, (x, t) => ({ ...x, salesGrowth: t }), '%')] } };
        // A product's line: the count and the price, in the order checkOf lists them after today's sales.
        const k = i - (s.salesBy === 'expansion' ? 2 : 0), pr = s.products[k];
        if (!pr || s.salesBy === 'typed') return base;
        const u = soldBy(pr.unit), at = (f: 'units' | 'price') => (x: ReportState, t: string) => ({ ...x, products: x.products.map((q, j) => (j === k ? { ...q, [f]: t } : q)) });
        return { ...base, id: `product-${k}`, edit: { boxes: [box(`product-${k}-units`, `${l.label}: ${u.many} a month at full running`, 'number', pr.units, at('units'), u.many),
          box(`product-${k}-price`, `${l.label}: price ${u.per}`, 'amount', pr.price, at('price'), u.per)] } };
      }
      case 'costs':
        if (l.label === 'Materials and other variable costs') return Object.keys(s.heads?.variable ?? {}).some((h) => s.heads?.variable?.[h]?.trim()) ? base
          : { ...base, id: 'variable', pencil: pen('costs'), edit: { boxes: [box('variablePct', l.label, 'percent', s.variablePct, (x, t) => ({ ...x, variablePct: t }), '% of sales')] } };
        if (l.label === 'Fixed costs') {
          if (Object.values(s.heads?.fixed ?? {}).some((t) => t?.trim())) return base;
          return { ...base, id: 'fixed', pencil: pen('costs'), edit: { boxes: [simple(s)
            ? box('fixedMonth', 'Fixed costs a month', 'amount', s.fixedMonth ?? '', (x, t) => ({ ...x, fixedMonth: t }), 'a month')
            : box('fixed', 'Fixed costs in a full first year', 'amount', s.fixed, (x, t) => ({ ...x, fixed: t }))] } };
        }
        if (/growth a year$/.test(l.label)) return { ...base, id: 'fixedGrowth', edit: { boxes: [box('fixedGrowth', l.label, 'percent', s.fixedGrowth, (x, t) => ({ ...x, fixedGrowth: t }), '%')] } };
        return base;
      case 'wc':
        if (l.label === 'The working-capital limit') return { ...base, id: 'wcLimit', pencil: pen('wc'), edit: { pick: { key: 'wcBy', label: 'The working-capital limit',
          options: [{ value: 'worked', label: 'Worked out' }, { value: 'typed', label: 'My own' }, { value: 'none', label: 'None' }], value: wcByOf(s) ?? '', set: (x, v) => ({ ...x, wcBy: v as ReportState['wcBy'] }) },
          ...(wcByOf(s) === 'typed' ? { boxes: [box('wcLimit', 'The limit you will ask for', 'amount', s.wcLimit, (x, t) => ({ ...x, wcLimit: t }))] } : {}) } };
        if (l.label === 'Its interest rate') return { ...base, id: 'wcRate', edit: { boxes: [box('wcRate', 'The limit’s interest rate', 'percent', s.wcRate, (x, t) => ({ ...x, wcRate: t }), '% a year')] } };
        return base;
      case 'document': {
        const f = l.label === 'Business’s name' ? 'name' : l.label === 'What the business does' ? 'activity' : l.label === 'Business’s address' ? 'address'
          : l.label === 'Lender' ? 'lender' : l.label === 'Prepared by' ? 'preparedBy' : undefined;
        return f ? { ...base, id: `doc-${f}`, edit: { boxes: [box(`doc-${f}`, l.label, 'text', s.doc[f], (x, t) => ({ ...x, doc: { ...x.doc, [f]: t } }))] } } : base;
      }
    }
    return base;
  }) }));
}

/** The words for what is still in pencil, for the line under the answer: "3 figures still the example's". */
export const pencilCount = (s: ReportState) => pencilLeft(s).length;
export { PENCIL };
