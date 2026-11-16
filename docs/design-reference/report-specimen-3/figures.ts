/**
 * SPEC2's figures (docs/REPORT-REVIEW.md §4): every number on the two specimens comes from here, and here every number is
 * the engine's (rule 12). Two fictional cases (rule 15): the page's worked example (roasted snacks) and a service case (a
 * linen laundry). Each is run through the engine as it stands, then again whole for each scenario in cases.cjs, and for
 * the project's worth. Nothing is worked out here: this file only picks figures out of the engine's answers.
 *   esbuild … figures.ts → node figures.cjs > figures.json (docs/REPORT-GRADE.md §3 has the command)
 */
import { projectReport, type Report } from '../../../engine/report';
import { worthOf } from '../../../engine/worth';
import { reportExample } from '../../../site/src/report/example';
import { EMPTY, inputOf, preview, type ReportState } from '../../../site/src/report/model';
import { reportDoc } from '../../../site/src/report/document';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const CASES = require('./cases.cjs') as { cases: Record<string, { scenarios: Scenario[] }> };

interface Scenario { id: string; label: string; volume?: number; variablePts?: number; ratePts?: number; lateMonths?: number }

const run = (s: ReportState): Report => {
  const r = projectReport(inputOf(s));
  if ('blocked' in r || 'needs' in r) throw new Error(JSON.stringify(r).slice(0, 300));
  return r;
};
const pick = (r: Report) => ({
  start: r.start, cost: r.cost, fixedAssets: r.fixedAssets, marginMoney: r.marginMoney, projectCost: r.projectCost, cashShort: r.cashShort,
  finance: r.finance, idc: r.idc, wcLimit: r.wcLimit, average: r.average, lowest: r.lowest, interestBeforeStart: r.interestBeforeStart,
  loanInterest: r.loanInterest, firstInstalment: r.firstInstalment, lastInstalment: r.lastInstalment,
  years: r.years.map((y) => ({
    fy: y.fy, months: y.months, utilisationPct: y.utilisationPct, products: y.products, sales: y.sales, variable: y.variable, fixed: y.fixed,
    pbdit: y.pbdit, depreciation: y.depreciation, tlInterest: y.tlInterest, wcInterest: y.wcInterest, pbt: y.pbt, tax: y.tax, pat: y.pat,
    netWorth: y.netWorth, termLoan: y.termLoan, wcLoan: y.wcLoan, netBlock: y.netBlock, cash: y.cash, stock: y.stock, debtors: y.debtors,
    available: y.available, service: y.service, principal: y.principal, dscr: y.dscr, counted: y.counted,
    contribution: y.contribution, fixedAll: y.fixedAll, bepPct: y.bepPct, bepSales: y.bepSales, cashBepPct: y.cashBepPct,
    currentRatio: y.currentRatio, debtEquity: y.debtEquity, tolTnw: y.tolTnw, interestCover: y.interestCover, netMarginPct: y.netMarginPct, facr: y.facr,
  })),
});

// The sales start is held so the specimens read the same whenever they are made.
const snacks: ReportState = { ...reportExample(new Date(2026, 10, 16)), sellFrom: '2027-04' };
const laundry: ReportState = {
  ...EMPTY, mode: 'simple', borrower: 'proprietor',
  cost: { ...EMPTY.cost, building: '4 L', machinery: '30 L' },
  products: [{ name: 'Hotel linen, washed and pressed', units: '9,000', price: '38', unit: 'kg' }, { name: 'Hospital linen, washed and disinfected', units: '4,000', price: '48', unit: 'kg' }],
  sellFrom: '2027-04', variablePct: '40', fixedMonth: '1.3 L',
  loan: { ...EMPTY.loan, amount: '26 L', ratePct: '10.5' }, years: '6', wcBy: 'worked', security: 'neither',
  doc: { name: 'Nirmal Linen Care', activity: 'Commercial laundry', address: 'Example nagar, Indore', lender: '', preparedBy: '' },
};

/** A scenario moves the inputs it names and nothing else; the engine then works the whole report again. */
const moved = (s: ReportState, c: Scenario): ReportState => {
  const scale = (t: string) => String(Math.round(Number(t.replace(/,/g, '')) * (1 + (c.volume ?? 0) / 100)));
  const late = (ym: string, k: number) => { const [y, m] = ym.split('-').map(Number), d = new Date(y, m - 1 + k, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
  return {
    ...s,
    products: s.products.map((p) => ({ ...p, units: scale(p.units) })),
    variablePct: String(Number(s.variablePct) + (c.variablePts ?? 0)),
    loan: { ...s.loan, ratePct: String(Number(s.loan.ratePct) + (c.ratePts ?? 0)) },
    sellFrom: c.lateMonths ? late(s.sellFrom as string, c.lateMonths) : s.sellFrom,
  };
};

const caseOf = (id: string, s: ReportState) => {
  const r = run(s), w = worthOf(r, inputOf(s));
  return {
    id,
    state: { name: s.doc.name, activity: s.doc.activity, address: s.doc.address, borrower: s.borrower, products: s.products, ratePct: s.loan.ratePct, years: s.years, variablePct: s.variablePct, fixedMonth: s.fixedMonth, cost: s.cost, sellFrom: s.sellFrom },
    paper: (reportDoc(s, preview(s), '16-11-2026')?.parts ?? []).map((p) => ({ name: p.name, section: p.section, blocks: p.blocks })),
    base: pick(r),
    worth: 'why' in w ? { why: w.why } : { ratePct: w.ratePct, project: { irrPct: w.project.irrPct, npv: w.project.npv, why: w.project.why }, promoters: { irrPct: w.promoters.irrPct, npv: w.promoters.npv, why: w.promoters.why } },
    scenarios: CASES.cases[id].scenarios.map((c) => {
      const x = c.id === 'base' ? r : run(moved(s, c));
      return { id: c.id, label: c.label, average: x.average, lowest: x.lowest, cashShort: x.cashShort, lowestCash: Math.min(...x.years.map((y) => y.cash)), pat1: x.years[0].pat, dscr: x.years.map((y) => y.dscr), sales: x.years.map((y) => y.sales) };
    }),
  };
};

process.stdout.write(JSON.stringify({ madeFrom: 'engine/report.ts and engine/worth.ts, on two fictional cases', snacks: caseOf('snacks', snacks), laundry: caseOf('laundry', laundry) }));
