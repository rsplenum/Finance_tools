/**
 * The specimen's figures (REPORT-GRADE, 14-11-2026): every number on the specimen report comes from here, and here every
 * number is the engine's (rule 12). The page's own worked example (site/src/report/example.ts, fictional) is run through
 * the engine as it stands and three more times with one input moved, for the what-if table. Nothing is worked out here:
 * this file only picks figures out of the engine's answer.
 */
import { projectReport, type Report } from '../../../engine/report';
import { reportExample } from '../../../site/src/report/example';
import { inputOf, preview, type ReportState } from '../../../site/src/report/model';
import { reportDoc } from '../../../site/src/report/document';

const run = (s: ReportState): Report => {
  const r = projectReport(inputOf(s));
  if ('blocked' in r || 'needs' in r) throw new Error(JSON.stringify(r).slice(0, 300));
  return r;
};
const pick = (r: Report) => ({
  start: r.start, cost: r.cost, fixedAssets: r.fixedAssets, marginMoney: r.marginMoney, projectCost: r.projectCost,
  finance: r.finance, idc: r.idc, wcLimit: r.wcLimit, average: r.average, lowest: r.lowest,
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

// The sales start is held at April 2027 so the specimen reads the same whenever it is made.
const base: ReportState = { ...reportExample(new Date(2026, 10, 14)), sellFrom: '2027-04' };
const scale = (t: string, by: number) => String(Math.round(Number(t.replace(/,/g, '')) * by));
const cases: [string, string, ReportState][] = [
  ['base', 'As projected', base],
  ['sales', 'Sales a tenth lower', { ...base, products: base.products.map((p) => ({ ...p, units: scale(p.units, 0.9) })) }],
  ['costs', 'Costs a tenth higher', { ...base, variablePct: '74.8', fixedMonth: '1.1 L' }],
  ['rate', 'Interest one point higher', { ...base, loan: { ...base.loan, ratePct: '11' } }],
];
const out = {
  paper: (reportDoc(base, preview(base), '14-11-2026')?.parts ?? []).map((p) => ({ name: p.name, section: p.section, blocks: p.blocks })),
  madeFrom: 'site/src/report/example.ts (fictional), through engine/report.ts',
  state: { name: base.doc.name, activity: base.doc.activity, address: base.doc.address, products: base.products, ratePct: base.loan.ratePct, years: base.years, variablePct: base.variablePct, fixedMonth: base.fixedMonth },
  base: pick(run(base)),
  whatIf: cases.map(([id, label, s]) => { const r = run(s); return { id, label, average: r.average, lowest: r.lowest, firstPat: r.years[0].pat, lowestCash: Math.min(...r.years.map((y) => y.cash)) }; }),
};
process.stdout.write(JSON.stringify(out));
