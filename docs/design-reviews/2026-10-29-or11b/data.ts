/**
 * OR11b's mock-up figures (D-UX-244, D-UX-245): the report's one Make it work on two fictional cases, the worked example
 * (`?case=home`, Asha Packaging, case R at 70 lakh, tests/viable.test.ts) and case P at Rs. 150 a unit (drivers, PMEGP,
 * the same file), where more use of the capacity cannot reach. Every figure is a run of the engine (engine/report.ts,
 * ratios.ts, viable.ts, plan.ts, fix.ts); the scans below only move one input and ask the engine again. No figure in
 * the mock-up is typed by hand. Run: npx jiti docs/design-reviews/2026-10-29-or11b/data.ts (writes data.json beside it).
 */
import { writeFileSync } from 'node:fs';
import { projectReport, type Report, type ReportInput } from '../../../engine/report';
import { diagnose, LEVELS, type RatioId } from '../../../engine/ratios';
import { makeViable, type Viability } from '../../../engine/viable';
import { makePlan, withLevers, AS_TYPED, type Plan } from '../../../engine/plan';
import { fixOf } from '../../../engine/fix';
import { inputOf } from '../../../site/src/report/model';
import { REPORT_HOME } from '../../../site/src/report/home-case';
// Case P at Rs. 150 a unit, as in tests/viable.test.ts (a test file cannot be imported outside vitest).
const P: ReportInput = {
  taxBy: 'firm', cost: { land: 200000, building: 600000, machinery: 2000000, preliminary: 50000 },
  loan: { amount: 2400000, ratePct: 10, disbursed: '2026-10', moratoriumMonths: 6, instalments: 48, frequency: 'monthly', style: 'equal-principal' },
  capacity: 50000, price: 150, utilisationPct: [60, 70, 80], priceGrowthPct: 0, monthsToStart: 3, variablePct: 70, fixedCosts: 1200000, fixedGrowthPct: 5,
  days: { stock: 30, debtors: 30, creditors: 30 }, wcLimit: 300000, wcRatePct: 11, scheme: { id: 'pmegp', category: 'general', area: 'rural', activity: 'manufacturing' },
};

const isReport = (r: ReturnType<typeof projectReport>): r is Report => !('needs' in r) && !('blocked' in r);
const runOf = (x: ReportInput) => { const r = projectReport(x); if (!isReport(r)) return undefined; return { r, d: diagnose(r, x, 'fresh') }; };
const missesOf = (x: ReportInput) => runOf(x)?.d.misses.filter((id) => id !== 'securityCover') ?? ['none' as RatioId];
const works = (x: ReportInput) => missesOf(x).length === 0;
/** The least k in [a, b] (integers) at which `ok` holds, `ok` monotone; undefined if none. */
function least(a: number, b: number, ok: (k: number) => boolean) {
  if (!ok(b)) return undefined;
  while (b - a > 1) { const m = Math.floor((a + b) / 2); if (ok(m)) b = m; else a = m; }
  return ok(a) ? a : b;
}
const CAUSE: Record<string, string> = {
  dscrLowest: 'earns', dscrAverage: 'earns', interestCover: 'earns', currentRatio: 'cushion', tolTnw: 'own', debtEquity: 'own', facr: 'assets', securityCover: 'security',
};

function caseOf(name: string, x: ReportInput) {
  const u = runOf(x)!, r = u.r, d = u.d, v = makeViable(x) as Viability, f = fixOf(x);
  const misses = d.checks.filter((c) => c.meets === false).map((c) => ({ id: c.id, label: c.label, cause: CAUSE[c.id], at: c.at, level: c.level, worst: c.worst, fy: c.fy ?? null, short: c.short ?? null }));
  const salesOf = (y: ReportInput) => (runOf(y)?.r.years ?? []).map((k) => ({ fy: k.fy, months: k.months, sales: k.sales, use: k.utilisationPct ?? null }));
  // The picture, year by year (D-UX-250): the engine's DSCR (none in a year without instalments) and interest cover.
  const byYear = r.years.map((k) => ({ fy: k.fy, months: k.months, dscr: k.counted ? k.dscr ?? null : null, ic: k.interestCover ?? null }));
  const still = (y: ReportInput) => missesOf(y);

  // Keep the loan. Sales: the engine's single change (viable.ts), and its years.
  const s = v.sales ?? null, salesX = s ? withLevers(x, { ...AS_TYPED, sales: s.tenths }) : undefined;
  // Sales only as far as interest cover needs, then the lender's longer repayment for the rest: the plan with sales held.
  const icOk = (t: number) => !missesOf(withLevers(x, { ...AS_TYPED, sales: t })).includes('interestCover');
  const tIc = s ? least(0, s.tenths, icOk) : undefined;
  const mixed = tIc !== undefined && tIc < (s?.tenths ?? 0) ? makePlan(x, { held: { sales: tIc } }) as Plan : undefined;
  // Faster growth: the growth a year (in tenths of a per cent) that meets every level, the first year as typed.
  const g0 = x.salesBy === 'typed' ? (x.salesGrowthPct ?? 0) : (x.priceGrowthPct ?? 0), gKey = x.salesBy === 'typed' ? 'salesGrowthPct' : 'priceGrowthPct';
  const gOk = (k: number) => works({ ...x, [gKey]: k / 10 });
  const growth = least(Math.round(g0 * 10), 1000, gOk);
  // Lower costs: variable costs as a share of sales, in tenths of a point; fixed costs, by the plan's lever (tenths of a %).
  const vOk = (k: number) => works({ ...x, variablePct: (x.variablePct as number) - k / 10 });
  const varDown = least(0, Math.round((x.variablePct as number) * 10) - 1, vOk);
  const fOk = (k: number) => works(withLevers(x, { ...AS_TYPED, fixed: k }));
  const fixedDown = least(0, 999, fOk);
  const fixedX = fixedDown === undefined ? undefined : withLevers(x, { ...AS_TYPED, fixed: fixedDown });

  // Some of both: for each longer repayment in whole years, the least higher sales that then meets every level.
  const n0 = x.loan.instalments as number, room = LEVELS.term.longestMonths - (x.loan.moratoriumMonths as number);
  const both = [12, 24, 36, 48, 60].map((m) => n0 + m).filter((n) => n <= room).map((n) => {
    const t = s ? least(0, s.tenths, (k) => works(withLevers(x, { ...AS_TYPED, sales: k, instalments: n - n0 }))) : undefined;
    return { instalments: n, tenths: t ?? null, still: t === undefined ? still(withLevers(x, { ...AS_TYPED, sales: s?.tenths ?? 0, instalments: n - n0 })) : [] };
  });
  // By the drivers: every year at the most use a plan takes (85%), then the least price, and the least capacity at today's
  // price and today's cost of the project (the larger plant's cost is the question the card asks), that meet every level.
  const at85 = x.salesBy === 'typed' ? undefined : { ...x, utilisationPct: (x.utilisationPct as number[]).map(() => LEVELS.capacity.mostUsePct) };
  const price85 = at85 && least(Math.round((x.price as number) * 100), Math.round((x.price as number) * 1000), (k) => works({ ...at85, price: k / 100 }));
  const cap85 = at85 && least(x.capacity as number, (x.capacity as number) * 20, (k) => works({ ...at85, capacity: k }));
  // And at 85% use with the loan kept as typed otherwise: the largest term loan, in whole Rs. 1,000, that meets every level.
  const tl = x.loan.amount as number;
  const cut85 = at85 && least(0, Math.floor(tl / 1000) - 1, (k) => works({ ...at85, loan: { ...x.loan, amount: tl - k * 1000 } }));
  const plan = makePlan(x) as Plan;
  // A new line by its capacity (D-UX-251): the least use in the first year of sales, the later years as typed (none below
  // it, none above the most a plan takes), in tenths of a per cent; then the least capacity and the least price at the use
  // as typed. Each is a run of the engine.
  const u0 = x.utilisationPct as number[] | undefined, most100 = LEVELS.capacity.mostUsePct;
  const firstUse = (k: number) => (u0 as number[]).map((p, i) => (i === 0 ? k / 10 : Math.min(most100, Math.max(p, k / 10))));
  const use1 = u0 && least(Math.round(u0[0] * 10), most100 * 10, (k) => works({ ...x, utilisationPct: firstUse(k) }));
  const capT = u0 && least(x.capacity as number, (x.capacity as number) * 20, (k) => works({ ...x, capacity: k }));
  const priceT = u0 && least(Math.round((x.price as number) * 100), Math.round((x.price as number) * 1000), (k) => works({ ...x, price: k / 100 }));
  const fill = u0 ? {
    use1: use1 === undefined ? null : { pct: use1 / 10, use: firstUse(use1), years: salesOf({ ...x, utilisationPct: firstUse(use1) }) },
    use1None: use1 === undefined ? still({ ...x, utilisationPct: firstUse(most100 * 10) }) : null,
    capacity: capT ?? null, price: priceT === undefined ? null : priceT / 100,
    holiday12: still({ ...x, loan: { ...x.loan, moratoriumMonths: (x.loan.moratoriumMonths as number) + 12 } }),
  } : null;
  // Typed sales have no capacity: the sales a plant must make at full use so that the busiest year is at the most use a
  // plan takes (growth read as more made, the cautious reading), rounded up to the rupee. The engine takes it in OR11c.
  const most = LEVELS.capacity.mostUsePct / 100, capNeed = (y: ReportInput) => Math.ceil(Math.max(...salesOf(y).map((k) => k.sales)) / most - 1e-6);
  const best = both.filter((b) => b.tenths !== null).sort((a, b) => (a.tenths as number) - (b.tenths as number))[0];
  const bestX = best && withLevers(x, { ...AS_TYPED, sales: best.tenths as number, instalments: best.instalments - n0 });

  return {
    name, loan: x.loan.amount, instalments: x.loan.instalments, moratorium: x.loan.moratoriumMonths, wcLimit: x.wcLimit, salesBy: x.salesBy ?? 'drivers',
    price: x.price ?? null, capacity: x.capacity ?? null, use: x.utilisationPct ?? null, variablePct: x.variablePct, fixedCosts: x.fixedCosts, growthPct: g0,
    promoters: r.finance.promoter, projectCost: r.projectCost, years: salesOf(x),
    misses, byYear, fill, cash: r.cashShort ?? null, mostUse: LEVELS.capacity.mostUsePct, longest: LEVELS.term.longestMonths,
    keep: {
      sales: s && { tenths: s.tenths, fy: s.fy, now: s.now, needed: s.needed, price: s.price ?? null, use: s.use ?? null, still: still(salesX!), years: salesOf(salesX!), cashNeed: s.cashNeed ?? null },
      salesNone: v.salesNone ?? null,
      mixed: mixed && { salesTenths: tIc, instalments: (x.loan.instalments as number) + mixed.levers.instalments, moratorium: (x.loan.moratoriumMonths as number) + mixed.levers.moratorium,
        levers: mixed.levers, works: mixed.works, still: mixed.still, promotersMore: mixed.promoters.more, years: salesOf(withLevers(x, mixed.levers)) },
      growth: growth === undefined ? null : { pct: growth / 10, still: still({ ...x, [gKey]: growth / 10 }) },
      growthAtMost: still({ ...x, [gKey]: 100 }),
      variable: varDown === undefined ? null : { pct: (x.variablePct as number) - varDown / 10 },
      both, best: best && bestX ? { ...best, years: salesOf(bestX), capNeed: x.salesBy === 'typed' ? capNeed(bestX) : null } : null,
      salesCapNeed: s && x.salesBy === 'typed' ? capNeed(salesX!) : null,
      at85: at85 ? { still: still(at85), years: salesOf(at85), price: price85 === undefined ? null : price85 / 100, capacity: cap85 ?? null, loan: cut85 === undefined ? null : tl - cut85 * 1000 } : null,
      fixed: fixedX ? { tenths: fixedDown, now: x.fixedCosts, needed: fixedX.fixedCosts } : null,
    },
    plan: { levers: plan.levers, works: plan.works, still: plan.still, fromFix: plan.fromFix, promoters: plan.promoters },
    change: {
      loan: v.loan ?? null, loanNone: v.loanNone ?? null,
      wc: v.wc ?? null, wcNone: v.wcNone ?? null,
      moratorium: v.moratorium ?? null, moratoriumNone: v.moratoriumNone ?? null,
      instalments: v.instalments ?? null, instalmentsNone: v.instalmentsNone ?? null,
      fixes: (f?.fixes ?? []).map((k) => ({ instalments: k.instalments, loan: k.loan, strain: k.strain })),
    },
  };
}

const home = caseOf('Asha Packaging (the worked example)', inputOf(REPORT_HOME));
const p = caseOf('Case P at Rs. 150 a unit', P);
// The worked example by its capacity (D-UX-251): a fictional line of 5,00,000 boxes a year at Rs. 25 a box, filling up
// 55%, 70%, 85%, the price 5% a year; all else as the worked example.
const fillX: ReportInput = { ...inputOf(REPORT_HOME), salesBy: undefined, sales: undefined, salesGrowthPct: undefined, capacity: 500000, price: 25, utilisationPct: [55, 70, 85], priceGrowthPct: 5 };
const fillCase = caseOf('Asha Packaging, a new line filling up', fillX);
writeFileSync(new URL('./data.json', import.meta.url), JSON.stringify({ home, p, fill: fillCase }, null, 1));
console.log(JSON.stringify({ fill: { ...fillCase, years: undefined, keep: undefined, plan: undefined } }, (k, val) => (typeof val === 'number' ? Math.round(val * 100) / 100 : val)).slice(0, 6000));
