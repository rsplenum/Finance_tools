/**
 * LOOP1's mock-up figures: fictional case B (a proprietor's bakery), worked by the engine on the DSCR front door's
 * state, every statement worked twice inside the engine (dscr-check.ts). Run: npx jiti docs/design-reviews/2026-10-27-loop1/data.ts
 * It writes data.json beside it; mockup.html embeds that file. No figure in the mock-up is typed by hand.
 */
import { writeFileSync } from 'node:fs';
import { frontDoor, withBorrower, dscrCaseOf, type State } from '../../../site/src/dscr/model';
import { cashShort } from '../../../engine/dscr-plan';
import { linked, linkedAt, type LinkTerms } from '../../../engine/dscr-linked';
import { annuity } from '../../../engine/loan';
import type { Plan } from '../../../engine/dscr';

let s: State = withBorrower(frontDoor('2026-11'), 'proprietor');
s = { ...s, cells: { ...s.cells, pbdit: ['6,00,000'], depreciation: ['60,000'] }, modes: { ...s.modes, pbdit: 'grow', depreciation: 'same', otherLoans: 'emi' },
  rates: { ...s.rates, pbdit: '8' }, running: [{ emi: '5,000', last: '' }], loan: { ...s.loan, amount: '20,00,000', ratePct: '11.5', instalments: '60' } };
const c = dscrCaseOf(s);
if (!c) throw new Error('case incomplete');
const STEP = 10000, RATE_FLOOR = 9, MOSTS = [0, 100000, 300000, 500000];

const r2 = (x: number) => Math.round(x * 100) / 100, r4 = (x: number) => Math.round(x * 10000) / 10000;
function view(t: LinkTerms, p: Plan) {
  const st = p.statement;
  return {
    a: t.amount, k: t.instalments, r: t.ratePct, emi: r2(annuity(t.amount, t.ratePct / 1200, t.instalments)),
    low: st.minimum && { d: r4(st.minimum.dscr), fy: st.minimum.fy }, avg: st.average === undefined ? null : r4(st.average),
    interest: r2(p.schedule.reduce((x, y) => x + y.interest, 0)),
    // A year: fy, profit before interest, depreciation and tax, tax, cash available, the new loan's payments, the EMIs
    // already paid, debt service, DSCR (all the engine's).
    rows: st.rows.map((x) => {
      const pr = p.profit.find((y) => y.fy === x.fy), yr = p.years.find((y) => y.fy === x.fy);
      return [x.fy, r2(pr?.pbdit ?? 0), r2(pr?.tax ?? 0), r2(x.available), r2((yr?.interestTL ?? 0) + (yr?.principalTL ?? 0)), r2(yr?.existingEmis ?? 0), r2(x.service), x.dscr === undefined ? null : r4(x.dscr)];
    }),
  };
}
function point(most: number, held: Partial<LinkTerms>) {
  const l = linked(c!, { most, step: STEP }, held);
  if (!('terms' in l)) throw new Error(JSON.stringify(l));
  return { ...view(l.terms, l.plan), works: l.works, moved: l.moved };
}
const typed: LinkTerms = { amount: c.loan.amount, instalments: c.loan.instalments, ratePct: c.loan.ratePct };
const p0 = linkedAt(c, typed);
if (!('statement' in p0)) throw new Error('typed');
const longest = 180 - c.loan.moratoriumMonths;
const first = p0.profit[0], low = p0.statement.minimum!, lowP = p0.profit.find((x) => x.fy === low.fy)!, lowY = p0.years.find((x) => x.fy === low.fy)!;
const out = {
  case: { borrower: 'proprietor', profit: 600000, growthPct: 8, depreciation: 60000, emis: 5000, start: '2026-11', ...typed },
  target: c.target, rateFloor: RATE_FLOOR, step: STEP, longest,
  round1: { ...view(typed, p0), works: false, moved: [], short: cashShort(p0.statement, c.target, c.def),
    first: { fy: first.fy, pbdit: first.pbdit, tax: first.tax, interestTL: r2(first.interestTL) },
    lowYear: { fy: low.fy, pbdit: r2(lowP.pbdit), depreciation: lowP.depreciation, interestTL: r2(lowP.interestTL), pbt: r2(lowP.pbt), tax: r2(lowP.tax), pat: r2(lowP.pat),
      principalTL: r2(lowY.principalTL), existingEmis: lowY.existingEmis } },
  grids: Object.fromEntries(MOSTS.map((most) => {
    const amount: Record<number, unknown> = {}, instalments: Record<number, unknown> = {}, rate: Record<string, unknown> = {};
    for (let a = Math.max(STEP, typed.amount - most); a <= typed.amount; a += STEP) amount[a] = point(most, { amount: a });
    for (let k = 12; k <= longest; k++) instalments[k] = point(most, { instalments: k });
    for (let r = RATE_FLOOR * 100; r <= 1400; r += 25) rate[(r / 100).toFixed(2)] = point(most, { ratePct: r / 100 });
    return [most, { open: point(most, {}), amount, instalments, rate }];
  })),
};
writeFileSync(new URL('./data.json', import.meta.url), JSON.stringify(out));
const o = out.grids[300000].open;
console.log('round1', out.round1.low, out.round1.avg, out.round1.short, 'emi', out.round1.emi, 'interest', out.round1.interest);
console.log('open@3L', o.a, o.k, o.r, o.works, o.low, o.avg, o.moved, 'interest', o.interest);
for (const m of MOSTS) { const g = out.grids[m] as any; const ks = Object.values(g.instalments).filter((x: any) => x.works) as any[]; console.log(m, 'open', g.open.a, g.open.k, g.open.moved, 'shortest held k that works', ks[0]?.k, ks[0]?.a); }
