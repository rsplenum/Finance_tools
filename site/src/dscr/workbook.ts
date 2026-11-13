/**
 * The Excel copy's model (WORKED-PAGE §5, the FAST Standard): Inputs, the Schedule of the new loan, Workings and the
 * Statement, every worked figure a formula from the inputs, then Checks, where the engine's figure stands beside the
 * model's and the difference is 0. The cells cache the engine's own figures (rule 12), recomputed here from the page's
 * state by the same engine calls the page makes; Excel works every formula again on opening. Nothing here computes a
 * figure shown to anyone: the formulas are the accountant's way to follow and test the engine's working.
 */
import {
  COMPONENTS, PLAN_SERVICE, amortization, componentsOf, dscrStatement, planStatement,
  type Amortization, type Component, type Definition, type Plan, type ProjectionYear, type Statement, type YearFigures,
} from '../../../engine/dscr';
import { PERIOD_MONTHS, stepOf, stepWeights, type LoanTerms } from '../../../engine/loan';
import { parseMonth } from '../../../engine/parse';
import { borrowerOf, taxSteps, type Borrower } from '../../../engine/tax';
import { inr } from '../../../engine/util';
import type { Block, Cell, Chart, Figure, Part, Row, Table } from '../doc/doc';
import {
  GROUP_TITLES, amountOf, definitionOf, loanInput, modeOf, monthText, numberOf, rowValues, rowsOf, runningLoan, yearsOf,
  type RowDef, type RowMode, type State,
} from './model';

export const SHEET = { inputs: 'Inputs', schedule: 'Schedule', workings: 'Workings', statement: 'Statement', checks: 'Checks' } as const;

/** What the engine works from and gives, for one state whose statement is shown. */
interface Model {
  def: Definition; years: string[]; rows: { r: RowDef; mode: RowMode; values: number[] }[];
  loan?: LoanTerms; am?: Amortization; plan?: Plan; statement: Statement; taxBy?: Borrower;
}

function modelOf(s: State): Model | undefined {
  const def = definitionOf(s) as Definition | undefined, y = yearsOf(s);
  if (!def || !y.years.length) return undefined;
  // The engine gets each row's figures as the page gives them, a missing one missing (it then asks for it and there is
  // no statement); only once there is one do the cells show a row with no figures (tax by who the borrower is) as 0.
  const raw = rowsOf(s).map((r) => ({ r, mode: modeOf(s, r) as RowMode, values: rowValues(s, r, y.years).values }));
  if (raw.some((x) => !x.mode)) return undefined;
  const rows = raw.map((x) => ({ ...x, values: x.values.map((v) => v ?? 0) }));
  const figures = (i: number) => Object.fromEntries(raw.map((x) => [x.r.key, x.values[i]]));
  if (s.source === 'own') {
    const st = dscrStatement(y.years.map((fy, i) => ({ fy, ...figures(i) }) as YearFigures), def);
    return 'rows' in st ? { def, years: y.years, rows, statement: st } : undefined;
  }
  const loan = loanInput(s) as LoanTerms, am = amortization(loan);
  const tax = rows.find((x) => x.r.key === 'taxPct'), taxBy = tax?.mode === 'borrower' ? borrowerOf(s.borrower) : undefined;
  // Tax by who the borrower is: its row has no figures, the engine works the tax out.
  const proj = y.years.map((fy, i) => ({ fy, ...figures(i), ...(taxBy ? { taxBy: taxBy.id, taxPct: undefined } : {}) }) as ProjectionYear);
  const plan = planStatement(proj, loan, def, y.start);
  return 'months' in am && 'statement' in plan ? { def, years: y.years, rows, loan, am, plan, statement: plan.statement, ...(taxBy ? { taxBy } : {}) } : undefined;
}

// ---- Cells ----

const EPOCH = Date.UTC(1899, 11, 30);
/** A month 'YYYY-MM' as Excel's serial number of its first day. */
const serial = (ym: string) => (Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1, 1) - EPOCH) / 864e5;
const textOf = (v: number, kind: Figure['kind'], d: number) =>
  !Number.isFinite(v) ? '' : kind === 'amount' ? inr(v, d) : kind === 'ratio' ? v.toFixed(d) : String(+v.toFixed(6));
const fig = (value: number, kind: Figure['kind'], decimals: number, formula?: string, extra: Partial<Figure> = {}): Cell =>
  ({ text: textOf(value, kind, decimals), figure: { value, kind, decimals, ...(formula ? { formula } : {}), ...extra } });
const amount = (v: number, f?: string, d = 0) => fig(v, 'amount', d, f);
const ratio = (v: number | undefined, f?: string) => fig(v ?? NaN, 'ratio', 2, f);
const count = (v: number, f?: string, extra: Partial<Figure> = {}) => fig(v, 'count', 0, f, extra);
const input = (v: number, kind: Figure['kind'] = 'amount', d = 0): Cell => fig(v, kind, d, undefined, { input: true });
const words = (text: string): Cell => ({ text });
const table = (t: Table): Block => ({ kind: 'table', table: t });
const title = (text: string, line: string): Block[] => [{ kind: 'title', text, small: true }, { kind: 'text', text: line, small: true }];
const I = (ref: string, col = 1) => `{${SHEET.inputs}!${ref}@$${col}}`;
const W = (ref: string) => `{${SHEET.workings}!${ref}}`;

const HOW: Record<string, string> = {
  years: 'A figure for each year', same: 'The same every year', grow: 'Grows by the % each year', fall: 'Falls by the % each year', none: 'None',
};

// ---- Inputs ----

/** Year columns of the yearly figures start after the line, how, the figure and the %. */
const YEAR_AT = 4;

function inputsPart(s: State, m: Model): Part {
  const blocks: Block[] = title(SHEET.inputs, 'What the model works from, as entered on the page. Inputs are in blue on a pale yellow fill: type over one and every sheet works again.');
  const { loan, am } = m;
  if (loan && am) {
    const step = loan.style === 'stepped' ? Number((stepOf(loan) * 100).toFixed(1)) : 0;
    const how = loan.style === 'emi' ? 'EMI every month' : loan.style === 'stepped' ? 'Stepped every month, rising each year'
      : `Equal principal every ${loan.frequency === 'quarterly' ? 'quarter' : 'month'}`;
    blocks.push({ kind: 'heading', text: 'The new loan' }, table({
      columns: [{ label: 'Input' }, { label: 'Value' }, { label: 'Unit', wrap: 1 }],
      rows: [
        { ref: 'amount', cells: [words('Amount'), input(loan.amount), words('Rupees')] },
        { ref: 'rate', cells: [words('Interest rate'), input(loan.ratePct, 'quantity'), words('% a year, charged monthly')] },
        { ref: 'drawn', cells: [words('First drawn'), { text: monthText(loan.disbursed), figure: { value: serial(loan.disbursed), kind: 'month', decimals: 0, input: true } }, words('Month')] },
        { ref: 'mor', cells: [words('Moratorium'), input(loan.moratoriumMonths, 'count'), words('Months of interest only')] },
        { ref: 'n', cells: [words('Instalments'), input(loan.instalments, 'count'), words('Number')] },
        { ref: 'every', cells: [words('Months from one instalment to the next'),
          loan.style === 'equal-principal' ? input(PERIOD_MONTHS[loan.frequency], 'count') : count(PERIOD_MONTHS[loan.frequency]), words(how)] },
        ...(loan.style === 'stepped' ? [{ ref: 'step', cells: [words('Step'), input(step, 'quantity'), words("% a year, from the site's rule for stepped loans")] }] : []),
      ],
    }));
  }
  // The yearly figures: one figure (and a %) or a figure for each year.
  const plain = m.rows.filter((x) => x.mode !== 'emi' && x.mode !== 'from' && x.mode !== 'borrower' && !(x.r.only && !x.r.only.includes(x.mode)));
  const shown = plain.filter((x, k) => !(x.r.modeKey !== x.r.key && x.mode === 'none' && plain.findIndex((y) => y.r.modeKey === x.r.modeKey) !== k));
  blocks.push({ kind: 'heading', text: 'The yearly figures' }, table({
    unit: m.rows.some((x) => x.r.percent) ? 'Rupees a year; the tax rate in %' : 'Rupees a year',
    columns: [{ label: 'Line' }, { label: 'How', wrap: 1 }, { label: 'Figure' }, { label: '% a year' }, ...m.years.map((label) => ({ label }))],
    freeze: 1,
    rows: shown.map(({ r, mode, values }) => {
      const kind: Figure['kind'] = r.percent ? 'quantity' : 'amount', none = mode === 'none';
      const label = none && r.modeKey !== r.key ? GROUP_TITLES[r.modeKey] ?? r.label : r.label;
      const pct = mode === 'grow' || mode === 'fall' ? numberOf(s.rates[r.key]) ?? 0 : undefined;
      return { ref: `in_${r.key}`, cells: [words(label), words(HOW[mode] ?? ''),
        mode === 'same' || mode === 'grow' || mode === 'fall' ? input(values[0], kind) : words(''),
        pct === undefined ? words('') : input(pct, 'quantity'),
        ...m.years.map((_, i) => (mode === 'years' ? input(values[i], kind) : words('')))] };
    }),
  }));
  const asset = m.rows.find((x) => x.mode === 'from');
  if (asset) blocks.push({ kind: 'heading', text: asset.r.label }, table({
    columns: [{ label: 'Input' }, { label: 'Value' }, { label: 'Unit', wrap: 1 }],
    rows: [
      { ref: 'assetYearly', cells: [words('A full year'), input(amountOf(s.asset.yearly) ?? 0), words('Rupees')] },
      { ref: 'assetFrom', cells: [words('Starts running'), { text: monthText(parseMonth(s.asset.from) ?? s.asset.from), figure: { value: serial(parseMonth(s.asset.from) ?? ''), kind: 'month', decimals: 0, input: true } }, words('Month: a twelfth of the year for each month from then')] },
    ],
  }));
  if (m.rows.some((x) => x.mode === 'emi')) blocks.push({ kind: 'heading', text: GROUP_TITLES.otherLoans }, table({
    columns: [{ label: 'Loan' }, { label: 'EMI a month' }, { label: 'Last EMI' }],
    rows: s.running.map(runningLoan).map((l, j) => ({ ref: `run_${j}`, cells: [words(`Loan ${j + 1}`), input(l.emi ?? 0),
      l.last ? { text: monthText(l.last), figure: { value: serial(l.last), kind: 'month', decimals: 0, input: true } } : words('Runs on')] })),
  }));
  const b = m.taxBy;
  if (b) blocks.push({ kind: 'heading', text: `The tax: ${b.label}` }, { kind: 'text', text: `${b.law}; as of ${b.date}.`, small: true }, table({
    columns: [{ label: 'Line' }, { label: 'Rupees' }, { label: '%' }],
    rows: [
      ...b.slabs.map(([from, rate], k) => ({ ref: `slab_${k}`, cells: [words(k ? 'Slab from' : 'First slab from'), input(from), input(rate, 'quantity')] })),
      ...(b.rebate ? [
        { ref: 'rebateUpTo', cells: [words('Rebate: on profit up to'), input(b.rebate.incomeUpTo), words('')] },
        { ref: 'rebateMax', cells: [words('Rebate: at most'), input(b.rebate.max), words('')] },
      ] : []),
      ...b.surcharge.map(([from, rate], j) => ({ ref: `sur_${j}`, cells: [words('Surcharge on profit above'), input(from), input(rate, 'quantity')] })),
      { ref: 'cess', cells: [words('Cess on the tax and surcharge'), words(''), input(b.cess, 'quantity')] },
    ],
  }));
  return { name: SHEET.inputs, sheetOnly: true, blocks };
}

// ---- Schedule ----

function schedulePart(m: Model): Part | undefined {
  const { loan, am } = m;
  if (!loan || !am) return undefined;
  const rows = am.months, N = rows.length, stepped = loan.style === 'stepped';
  const at = (k: number, c: number) => `{m${k}@${c}}`, L = `{level@$1}`;
  const range = (c: number) => `{m1@$${c}}:{m${N}@$${c}}`;
  const weights = stepped ? stepWeights(loan.instalments, loan.ratePct / 1200, 1 + stepOf(loan)) : [];
  const step = `(1+${I('step')}/100)^INT((${at(0, 5)}-1)/12)`;
  const level = loan.style === 'emi' ? `IF(${I('rate')}=0,${I('amount')}/${I('n')},${I('amount')}*(${I('rate')}/1200)*(1+${I('rate')}/1200)^${I('n')}/((1+${I('rate')}/1200)^${I('n')}-1))`
    : stepped ? `${I('amount')}/SUM(${range(9)})` : `${I('amount')}/${I('n')}`;
  const levelLabel = loan.style === 'emi' ? 'EMI' : stepped ? "Each instalment in the first year" : 'Principal of each instalment';
  return {
    name: SHEET.schedule, sheetOnly: true,
    blocks: [
      ...title(SHEET.schedule, `The new loan month by month. Interest is charged each month on the balance at its start; ${loan.style === 'equal-principal'
        ? 'each instalment repays the same principal' : stepped ? "each instalment is the first year's, raised by the step each year" : 'each EMI is the same'}, and the last clears the balance.`),
      table({ columns: [{ label: 'Line' }, { label: 'Rupees' }], rows: [{ ref: 'level', cells: [words(levelLabel), amount(am.level, level, 2)] }] }),
      table({
        size: 'small', freeze: 2, unit: 'Rupees',
        columns: [{ label: 'No.' }, { label: 'Month' }, { label: 'Year from April' }, { label: 'Balance at start' }, { label: 'Interest' }, { label: 'Instalment' },
          { label: 'Principal' }, { label: 'Paid' }, { label: 'Balance at end' }, ...(stepped ? [{ label: 'Present value per rupee of the first' }] : [])],
        rows: rows.map((r, j): Row => {
          const k = j + 1, c = (col: number) => at(k, col), since = `${c(0)}-${I('mor')}`;
          const principal = loan.style === 'equal-principal' ? L : stepped ? `${L}*${step.replace(at(0, 5), c(5))}-${c(4)}` : `${L}-${c(4)}`;
          return { ref: `m${k}`, cells: [
            count(k, k > 1 ? `${at(k - 1, 0)}+1` : undefined),
            { text: monthText(r.month), figure: { value: serial(r.month), kind: 'month', decimals: 0, formula: `DATE(YEAR(${I('drawn')}),MONTH(${I('drawn')})+${c(0)}-1,1)` } },
            count(Number(r.fy.slice(0, 4)), `YEAR(${c(1)})-IF(MONTH(${c(1)})<4,1,0)`),
            amount(r.opening, k > 1 ? at(k - 1, 8) : I('amount')),
            amount(r.interest, `${c(3)}*${I('rate')}/1200`),
            count(r.instalment ?? 0, `IF(AND(${since}>0,MOD(${since},${I('every')})=0),(${since})/${I('every')},0)`, { hideZero: true }),
            amount(r.principal, `IF(${c(5)}=0,0,IF(${c(5)}=${I('n')},${c(3)},${principal}))`),
            amount(r.paid, `${c(4)}+${c(6)}`),
            amount(r.closing, `${c(3)}-${c(6)}`),
            ...(stepped ? [fig(r.instalment ? weights[r.instalment - 1] : 0, 'ratio', 6,
              `IF(${c(5)}=0,0,${step.replace(at(0, 5), c(5))}/(1+${I('rate')}/1200)^${c(5)})`)] : []),
          ] };
        }),
      }),
    ],
  };
}

// ---- Workings ----

/** A line of the yearly figures, worked from its inputs: as typed each year, the same, or grown or fallen by the %. */
function lineFormula(x: Model['rows'][number], i: number): string | undefined {
  const k = x.r.key, inp = (col: number | string) => `{${SHEET.inputs}!in_${k}@${col}}`;
  switch (x.mode) {
    case 'years': return inp(YEAR_AT + i);
    case 'same': return inp('$2');
    case 'grow': case 'fall': return i ? `{${k}@-1}*(1${x.mode === 'grow' ? '+' : '-'}${inp('$3')}/100)` : inp('$2');
    case 'from': return `${I('assetYearly')}/12*MAX(0,MIN(12,{fyStart}*12+16-YEAR(${I('assetFrom')})*12-MONTH(${I('assetFrom')})))`;
    default: return undefined;
  }
}

function workingsPart(s: State, m: Model): Part {
  const { years, plan } = m, blocks: Block[] = [];
  const running = s.running.map(runningLoan);
  const rows: Row[] = [];
  const across = (label: string, ref: string, values: number[], f: (i: number) => string | undefined, kind: Figure['kind'] = 'amount', total = false): Row =>
    ({ ref, ...(total ? { kind: 'total' as const } : {}), cells: [words(label), ...values.map((v, i) => fig(v, kind, kind === 'quantity' ? 2 : 0, f(i)))] });
  if (plan) rows.push({ ref: 'fyStart', cells: [words('Year from April'), ...years.map((fy) => count(Number(fy.slice(0, 4))))] });
  for (const x of m.rows) {
    if (x.mode === 'borrower') continue;
    const off = x.r.only && !x.r.only.includes(x.mode);
    const emiMonths = (j: number) => {
      const last = running[j]?.last;
      return last ? `MAX(0,MIN(12,YEAR(${I(`run_${j}`, 2)})*12+MONTH(${I(`run_${j}`, 2)})-{fyStart}*12-3))` : '12';
    };
    const f = (i: number) => (off || x.mode === 'none' ? undefined
      : x.mode === 'emi' ? running.map((_, j) => `${I(`run_${j}`)}*${emiMonths(j)}`).join('+')
        : lineFormula(x, i));
    rows.push(across(x.r.percent ? `${x.r.label}` : x.r.label, x.r.key, x.values, f, x.r.percent ? 'quantity' : 'amount'));
  }
  if (plan && m.am) {
    const N = m.am.months.length, sum = (c: number) => `SUMIF({${SHEET.schedule}!m1@$2}:{${SHEET.schedule}!m${N}@$2},{fyStart},{${SHEET.schedule}!m1@$${c}}:{${SHEET.schedule}!m${N}@$${c}})`;
    const debt = new Map(plan.schedule.map((d) => [d.fy, d]));
    const has = (k: string) => m.rows.some((x) => x.r.key === k);
    const plus = (...refs: string[]) => refs.filter(has).map((r) => `+{${r}}`).join('');
    const minus = (...refs: string[]) => refs.filter(has).map((r) => `-{${r}}`).join('');
    rows.push(
      across('Interest on the new loan (Schedule)', 'newInterest', years.map((fy) => debt.get(fy)?.interest ?? 0), () => sum(4)),
      across('Principal of the new loan (Schedule)', 'newPrincipal', years.map((fy) => debt.get(fy)?.principal ?? 0), () => sum(6)),
      across(COMPONENTS.interestTL, 'interestTL', plan.years.map((y) => y.interestTL ?? 0), () => `{newInterest}${plus('otherLoansInterest')}`),
      across(COMPONENTS.principalTL, 'principalTL', plan.years.map((y) => y.principalTL ?? 0), () => `{newPrincipal}${plus('otherLoansPrincipal')}`),
      across('Profit before tax', 'pbt', plan.profit.map((p) => p.pbt), () => `{pbdit}${plus('assetIncome')}${minus('depreciation', 'nonCash')}-{interestTL}${minus('interestOther')}`, 'amount', true),
    );
    const b = m.taxBy;
    if (!b) rows.push(across('Tax', 'tax', plan.profit.map((p) => p.tax), () => 'IF({pbt}>0,{pbt}*{taxPct}/100,0)'));
    else {
      const st = plan.profit.map((p) => taxSteps(p.pbt, b)), sl = b.slabs.length;
      rows.push(across('Profit taxed (nil on a loss)', 'income', st.map((t) => t.income), () => 'MAX(0,{pbt})'));
      b.slabs.forEach(([from, rate], k) => rows.push(across(`Tax on the slab from ${inr(from)} at ${rate}%`, `band_${k}`, st.map((t) => t.bands[k]),
        () => `MAX(0,${k + 1 < sl ? `MIN({income},${I(`slab_${k + 1}`)})` : '{income}'}-${I(`slab_${k}`)})*${I(`slab_${k}`, 2)}/100`)));
      rows.push(across('Tax by the slabs', 'slabTax', st.map((t) => t.slabs), () => b.slabs.map((_, k) => `{band_${k}}`).join('+')));
      let r = 'slabTax';
      if (b.rebate) {
        rows.push(across('After the rebate', 'rebated', st.map((t) => t.rebated),
          () => `IF({income}<=${I('rebateUpTo')},MAX(0,{slabTax}-${I('rebateMax')}),MIN({slabTax},{income}-${I('rebateUpTo')}))`));
        r = 'rebated';
      }
      if (b.surcharge.length) {
        const nest = (j: number): string => (j < 0 ? `{${r}}`
          : `IF({income}>${I(`sur_${j}`)},MIN({${r}}*(1+${I(`sur_${j}`, 2)}/100),{cap_${j}@$1}+({income}-${I(`sur_${j}`)})),${nest(j - 1)})`);
        rows.push(across('With the surcharge, and its relief', 'surcharged', st.map((t) => t.surcharged), () => nest(b.surcharge.length - 1)));
        r = 'surcharged';
      }
      rows.push(across('Cess', 'cessTax', st.map((t) => t.cess), () => `{${r}}*${I('cess', 2)}/100`),
        across('Tax', 'tax', plan.profit.map((p) => p.tax), () => `IF({pbt}>0,{${r}}+{cessTax},0)`));
    }
    rows.push(across(COMPONENTS.pat, 'pat', plan.profit.map((p) => p.pat), () => '{pbt}-{tax}', 'amount', true));
  }
  blocks.push(...title(SHEET.workings, plan
    ? "Each year's figures worked from the inputs: the lines as entered, the new loan's interest and principal from the Schedule, the profit and the tax."
    : "Each year's figures worked from the inputs."),
  table({ unit: 'Rupees', freeze: 1, columns: [{ label: 'Line' }, ...years.map((label) => ({ label }))], rows }));
  const b = m.taxBy;
  if (plan && b?.surcharge.length) {
    // The relief: above a threshold the tax and surcharge are never more than the tax at the threshold (with the
    // surcharge below it) plus the profit above it. That tax at each threshold, by the same slabs.
    const caps = taxSteps(0, b).caps, sl = b.slabs.length;
    const capRows: Row[] = b.surcharge.map(([from], j) => {
      const T = I(`sur_${j}`), bands = b.slabs.map((_, k) => `MAX(0,${k + 1 < sl ? `MIN(${T},${I(`slab_${k + 1}`)})` : T}-${I(`slab_${k}`)})*${I(`slab_${k}`, 2)}/100`).join('+');
      const rebated = b.rebate ? `IF(${T}<=${I('rebateUpTo')},MAX(0,${bands}-${I('rebateMax')}),MIN(${bands},${T}-${I('rebateUpTo')}))` : `(${bands})`;
      return { ref: `cap_${j}`, cells: [words(`At ${inr(from)}`), amount(caps[j], j ? `${rebated}*(1+${I(`sur_${j - 1}`, 2)}/100)` : rebated)] };
    });
    blocks.push({ kind: 'heading', text: "The surcharge's relief: the tax at each threshold" }, table({ columns: [{ label: 'Threshold' }, { label: 'Rupees' }], rows: capRows }));
  }
  return { name: SHEET.workings, sheetOnly: true, blocks };
}

// ---- Statement ----

function statementPart(m: Model, chart?: Chart): Part {
  const { def, years, statement: st } = m, Y = years.length;
  const { available, service } = componentsOf(def), extra = m.plan ? PLAN_SERVICE : [];
  const figs: YearFigures[] = m.plan ? m.plan.years : years.map((fy, i) => ({ fy, ...Object.fromEntries(m.rows.map((x) => [x.r.key, x.values[i]])) }) as YearFigures);
  const line = (p: string, c: Component): Row => ({ ref: `${p}_${c}`, cells: [words(COMPONENTS[c]), ...figs.map((y) => amount(y[c] ?? 0, W(c)))] });
  const sum = (p: string, cs: Component[]) => cs.map((c) => `{${p}_${c}}`).join('+');
  const span = (ref: string) => `{${ref}@$1}:{${ref}@$${Y}}`;
  const instalments = ['principalTL', ...extra].map((c) => `{B_${c}}`).join('+');
  const rows: Row[] = [
    { kind: 'head', cells: [words('Cash available (A)')] },
    ...available.map((c) => line('A', c)),
    { kind: 'total', ref: 'available', cells: [words('Cash available (A)'), ...st.rows.map((r) => amount(r.available, sum('A', available)))] },
    { kind: 'head', cells: [words('Debt service (B)')] },
    ...[...service, ...extra].map((c) => line('B', c)),
    { kind: 'total', ref: 'service', cells: [words('Debt service (B)'), ...st.rows.map((r) => amount(r.service, sum('B', [...service, ...extra])))] },
    { kind: 'ratio', ref: 'dscr', cells: [words('DSCR (A ÷ B)'), ...st.rows.map((r) => ratio(r.dscr, 'IF({service}>0,{available}/{service},"")'))] },
    { ref: 'counted', cells: [words(def.years === 'repayment' ? 'Counted: a year with a term-loan instalment (1)' : 'Counted: a year with debt service (1)'),
      ...st.rows.map((r) => count(r.counted ? 1 : 0, def.years === 'repayment' ? `IF(${instalments}>0,1,0)` : 'IF({service}>0,1,0)'))] },
    { ref: 'dscrCounted', cells: [words('DSCR of the years counted'), ...st.rows.map((r) => ratio(r.counted ? r.dscr : undefined, 'IF({counted}=1,{dscr},"")'))] },
    { ref: 'cashLakh', cells: [words('Cash available, in lakh (the chart)'), ...st.rows.map((r) => ratio(r.available / 1e5, '{available}/100000'))] },
    { ref: 'serviceLakh', cells: [words('Debt service, in lakh (the chart)'), ...st.rows.map((r) => ratio(r.service / 1e5, '{service}/100000'))] },
  ];
  const blocks: Block[] = [
    ...title(SHEET.statement, 'The DSCR from the Workings: cash available (A) over the debt service (B) each year, the average over the years counted and the lowest year.'),
    table({ unit: 'Rupees', freeze: 1, headRef: 'fy', columns: [{ label: 'Rupees' }, ...years.map((label) => ({ label }))], rows }),
  ];
  if (st.average !== undefined && st.minimum) {
    const average = def.average === 'totals' ? `SUMIF(${span('counted')},1,${span('available')})/SUMIF(${span('counted')},1,${span('service')})`
      : `SUM(${span('dscrCounted')})/COUNT(${span('dscrCounted')})`;
    blocks.push({ kind: 'heading', text: 'The answer' }, table({ columns: [{ label: 'Line' }, { label: 'DSCR' }], rows: [
      { ref: 'average', cells: [words(def.average === 'totals' ? 'Average: total A ÷ total B, years counted' : 'Average: the mean of the years counted'), ratio(st.average, average)] },
      { ref: 'lowest', cells: [words('Lowest year'), ratio(st.minimum.dscr, `MIN(${span('dscrCounted')})`)] },
      { ref: 'lowestYear', cells: [words('In'), { text: st.minimum.fy, figure: { value: NaN, kind: 'count', decimals: 0, result: st.minimum.fy,
        formula: `INDEX(${span('fy')},MATCH({lowest@$1},${span('dscrCounted')},0))` } }] },
    ] }));
  }
  if (chart) blocks.push({ kind: 'chart', chart: { ...chart, sheet: { labels: span('fy'), a: span('cashLakh'), b: span('serviceLakh') } } });
  return { name: SHEET.statement, sheetOnly: true, blocks };
}

// ---- Checks ----

/**
 * The model against the engine, year by year and for the answer: each difference 0. Each is rounded to 6 places, so that
 * the last bit of a sum added in another order does not show as -0; a paisa or a DSCR off by 0.000001 still shows.
 */
function checkBlocks(m: Model): Block[] {
  const { years, statement: st, plan } = m;
  const engine = (label: string, ref: string, values: (number | undefined)[], kind: 'amount' | 'ratio') =>
    ({ ref: `e_${ref}`, cells: [words(`${label}, as the page gives it`), ...values.map((v) => (v === undefined ? words('—') : kind === 'ratio' ? ratio(v) : amount(v)))] } as Row);
  const diff = (ref: string, model: string, values: (number | undefined)[], kind: 'amount' | 'ratio'): Row =>
    ({ ref: `d_${ref}`, cells: [words('Difference: the model less the page (0)'), ...values.map((v) => (v === undefined ? words('—')
      : fig(0, kind, kind === 'ratio' ? 2 : 0, `ROUND(${model}-{e_${ref}},6)`)))] });
  const pairs: [string, string, string, (number | undefined)[], 'amount' | 'ratio'][] = [
    ['Cash available (A)', 'available', `{${SHEET.statement}!available}`, st.rows.map((r) => r.available), 'amount'],
    ['Debt service (B)', 'service', `{${SHEET.statement}!service}`, st.rows.map((r) => r.service), 'amount'],
    ['DSCR', 'dscr', `{${SHEET.statement}!dscr}`, st.rows.map((r) => r.dscr), 'ratio'],
    ...(plan ? [
      [COMPONENTS.interestTL, 'interestTL', W('interestTL'), plan.years.map((y) => y.interestTL), 'amount'],
      [COMPONENTS.principalTL, 'principalTL', W('principalTL'), plan.years.map((y) => y.principalTL), 'amount'],
      ['Tax', 'tax', W('tax'), plan.profit.map((p) => p.tax), 'amount'],
    ] as typeof pairs : []),
  ];
  const Y = years.length, span = (ref: string) => `{${ref}@$1}:{${ref}@$${Y}}`;
  const rows = pairs.flatMap(([label, ref, model, values, kind]) => [engine(label, ref, values, kind), diff(ref, model, values, kind)]);
  const blocks: Block[] = [{ kind: 'heading', text: 'The model against the page' },
    table({ unit: 'Rupees', freeze: 1, columns: [{ label: 'Check' }, ...years.map((label) => ({ label }))], rows })];
  const ends: string[] = pairs.map(([, ref]) => `MAX(${span(`d_${ref}`)}),-MIN(${span(`d_${ref}`)})`);
  if (st.average !== undefined && st.minimum) {
    const S = (ref: string) => `{${SHEET.statement}!${ref}@$1}`;
    blocks.push(table({ columns: [{ label: 'Check' }, { label: 'Model' }, { label: 'Page' }, { label: 'Difference' }], rows: [
      { ref: 'k_average', cells: [words('Average DSCR'), ratio(st.average, S('average')), ratio(st.average), fig(0, 'ratio', 2, 'ROUND({k_average@1}-{k_average@2},6)')] },
      { ref: 'k_lowest', cells: [words('Lowest DSCR'), ratio(st.minimum.dscr, S('lowest')), ratio(st.minimum.dscr), fig(0, 'ratio', 2, 'ROUND({k_lowest@1}-{k_lowest@2},6)')] },
      { ref: 'k_year', cells: [words('Year of the lowest (0 when the same)'), { text: st.minimum.fy, figure: { value: NaN, kind: 'count', decimals: 0, result: st.minimum.fy, formula: S('lowestYear') } },
        words(st.minimum.fy), count(0, 'IF({k_year@1}={k_year@2},0,1)')] },
    ] }));
    ends.push('ABS({k_average@$3})', 'ABS({k_lowest@$3})', '{k_year@$3}');
  }
  blocks.push(table({ columns: [{ label: 'Check' }, { label: 'Largest' }], rows: [
    { ref: 'largest', kind: 'total', cells: [words('Largest difference anywhere (0 when the model and the page agree)'), fig(0, 'ratio', 2, `MAX(${ends.join(',')})`)] },
  ] }));
  return blocks;
}

/**
 * The model's sheets, in order (Inputs, Schedule, Workings, Statement), and the Checks sheet's first blocks; undefined
 * while there is no statement. `chart`: the page's chart, drawn again on the Statement sheet from its cells; `head`: who
 * asks, for what and the status, at the top of the Inputs sheet, since page 1 is the PDF's and the Word copy's alone.
 */
export function workbookOf(s: State, chart?: Chart, head: Block[] = []): { sheets: Part[]; checks: Block[] } | undefined {
  const m = modelOf(s);
  if (!m) return undefined;
  const sched = schedulePart(m), inputs = inputsPart(s, m);
  return { sheets: [{ ...inputs, blocks: [...head, ...inputs.blocks] }, ...(sched ? [sched] : []), workingsPart(s, m), statementPart(m, chart)], checks: checkBlocks(m) };
}
