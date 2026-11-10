/**
 * Fix it for me (FIX1, D-UX-346, D-UX-351): whole plans that meet every level. The cases are fictional and model-worked
 * (tests/fixtures/solve-part-year.json: "Sample Metals"); every plan is re-read here by a fresh run of the report, the
 * binding figures by hand in closed form, never taken from the solver's own word.
 */
import { describe, expect, it } from 'vitest';
import FX from './fixtures/solve-part-year.json';
import { diagnose, LEVELS, termMonths } from '../engine/ratios';
import { projectReport, type Report, type ReportInput } from '../engine/report';
import { MOVE_IDS, SOLVE, solve, type Move, type Solution, type Solved } from '../engine/solve';

const S = FX.input as ReportInput;
/** The same unit with fuller margins: only interest cover in the part first year misses. */
const H: ReportInput = { ...S, variablePct: 60, fixedCosts: 2400000, utilisationPct: [55, 65, 75] };
const solved = (x: ReportInput, o?: Parameters<typeof solve>[1]) => solve(x, o) as Solved;
const fresh = (x: ReportInput) => { const r = projectReport(x) as Report; return { r, d: diagnose(r, x, 'fresh') }; };
const works = (x: ReportInput) => { const { r, d } = fresh(x); return !d.misses.length && !r.cashShort; };
const by = (s: Solved, id: string) => s.plans.find((p) => p.id === id) as Solution;
const moves = (p: Solution) => p.moves.map((m) => [m.id, m.from, m.to]);

/** A plan's inputs written here from its moves, apart from the solver, with move `one` a unit of its box back toward the
 * typed figure: Rs. 1,000, a month, an instalment, 0.1 of a point of use in every year under the most, 0.1% of the
 * typed price (written up to the paisa), 0.1 of a point of growth. */
function written(x: ReportInput, ms: Move[], one?: Move): ReportInput {
  const y: ReportInput = { ...x, loan: { ...x.loan } }, most = LEVELS.capacity.mostUsePct, r1 = (v: number) => Math.round(v * 10) / 10;
  for (const m of ms) {
    const dir = Math.sign(m.to - m.from), b = m === one ? 1 : 0;
    if (m.id === 'loan') y.loan.amount = m.to - dir * 1000 * b;
    if (m.id === 'cash') y.cashAtStart = m.to - dir * 1000 * b;
    if (m.id === 'wc') y.wcLimit = m.to - dir * 1000 * b;
    if (m.id === 'moratorium') y.loan.moratoriumMonths = m.to - dir * b;
    if (m.id === 'instalments') y.loan.instalments = m.to - dir * b;
    if (m.id === 'use') y.utilisationPct = (x.utilisationPct as number[]).map((u) => (u >= most ? u : Math.min(most, r1(u + (m.to - m.from) - b / 10))));
    if (m.id === 'price') { const k = Math.round((m.to / m.from - 1) * 1000) - b; y.price = k ? Math.ceil((x.price as number) * (1 + k / 1000) * 100 - 1e-6) / 100 : x.price; }
    if (m.id === 'priceGrowth') y.priceGrowthPct = r1(m.to - b / 10);
  }
  return y;
}

/** H's 2026-27 by hand. Sales run from January 2027, three months (under 180 days: half the year's depreciation of
 * 12,50,000: 10% of 30,00,000, 15% of 60,00,000, 10% of 5,00,000). The loan is drawn in June 2026; its interest for
 * the seven months to December goes to the project's cost and is written off with the 2,00,000 of preliminary expenses
 * over five years (D-UX-350). The first instalment of 72 falls at the end of December, so January to March carry
 * interest on the loan less one, two and three instalments, with December's on the whole. The limit of 20,00,000 at
 * 11.5% for three months is 57,500. Sales at full use are 1,20,000 × 250 = 3,00,00,000 a year; 60% is variable. */
const icH = (loan: number, use = 55) => {
  const month = (loan * 0.11) / 12, sales = (30000000 * use * 3) / 100 / 12;
  return (sales * 0.4 - 600000 - 625000 - (200000 + 7 * month) / 5) / (month * (4 - (1 + 2 + 3) / 72 - 1) + 57500);
};

describe('The part first year on Sample Metals with fuller margins (case H)', () => {
  const s = solved(H);
  it('misses interest cover alone, as the hand working says', () => {
    expect(s.base.diagnosis.misses).toEqual(['interestCover']);
    expect(s.base.report.cashShort).toBeUndefined();
    expect(icH(7500000).toFixed(4)).toBe('1.1191');
    expect(s.base.report.years[0].interestCover).toBeCloseTo(icH(7500000), 9);
  });

  it('Borrow less: Rs. 56,43,000, the least cut to the thousand, by hand', () => {
    const p = by(s, 'borrowLess');
    expect([p.works, moves(p)]).toEqual([true, [['loan', 7500000, 5643000]]]);
    expect([icH(5643000).toFixed(5), icH(5644000).toFixed(5)]).toEqual(['1.50011', '1.49986']);
    expect(fresh(p.input).r.years[0].interestCover).toBeCloseTo(icH(5643000), 9);
    // The promoters bring the cut less seven months of its interest, no longer in the project's cost.
    expect(p.promoters.more).toBeCloseTo(1857000 * (1 - (7 * 0.11) / 12), 6);
    expect(Math.round(p.promoters.more)).toBe(1737843);
  });

  it('Earn more: 58.3% use in the first year, by hand; the promoters bring 45 days of the added sales', () => {
    const p = by(s, 'earnMore');
    expect([p.works, moves(p)]).toEqual([true, [['use', 55, 58.3]]]);
    expect(p.input.utilisationPct).toEqual([58.3, 68.3, 78.3]);
    expect([icH(7500000, 58.3).toFixed(5), icH(7500000, 58.2).toFixed(5)]).toEqual(['1.50279', '1.49116']);
    expect(fresh(p.input).r.years[0].interestCover).toBeCloseTo(icH(7500000, 58.3), 9);
    expect(p.promoters.more).toBeCloseTo((30000000 * 0.033 * 45) / 365, 6);
  });

  it('Balanced: a little of both, less of each than either alone', () => {
    const p = by(s, 'balanced');
    expect([p.works, moves(p)]).toEqual([true, [['loan', 7500000, 7343000], ['use', 55, 58]]]);
    expect([icH(7343000, 58).toFixed(5), icH(7344000, 58).toFixed(5), icH(7343000, 57.9).toFixed(5)]).toEqual(['1.50012', '1.49991', '1.48830']);
    expect(fresh(p.input).r.years[0].interestCover).toBeCloseTo(icH(7343000, 58), 9);
  });

  it('keeps within the most the promoters can bring: Borrow less no longer works, and comes last', () => {
    const now = s.base.report.finance.promoter + s.base.report.finance.kept, m = solved(H, { promotersMost: now + 500000 });
    expect(m.plans.map((p) => [p.id, p.works])).toEqual([['earnMore', true], ['balanced', true], ['borrowLess', false]]);
    for (const p of m.plans) expect(p.promoters.plan).toBeLessThanOrEqual(now + 500000 + 0.005);
    expect(by(m, 'borrowLess').still).toEqual(['interestCover']);
  });

  it('a case that works needs no plan', () => {
    const x = { ...H, loan: { ...H.loan, amount: 5000000 } };
    expect(works(x)).toBe(true);
    expect(solved(x).plans).toEqual([]);
  });
});

describe('Sample Metals as typed: five of eight levels miss and the cash runs out', () => {
  const s = solved(S);
  it('reads the case as it stands', () => {
    expect(s.base.diagnosis.misses).toEqual(['currentRatio', 'tolTnw', 'dscrAverage', 'dscrLowest', 'interestCover']);
    expect(s.base.diagnosis.checks.length).toBe(8);
    expect(s.base.report.cashShort?.first).toBe('2026-27');
    expect(s.base.report.finance.termLoan / s.base.report.projectCost).toBeCloseTo(0.73, 1);
    // Three months at 50% use: 37,50,000 of sales × 32% = 12,00,000 against 9,00,000 fixed, 6,25,000 depreciation and the write-off.
    expect(s.base.report.years[0].interestCover).toBeCloseTo((1200000 - 900000 - 625000 - 136250) / (200520.83333333334 + 57500), 9);
  });

  it('two plans work; Borrow less cannot mend months that earn less than their own costs, and is the nearest', () => {
    expect(s.plans.map((p) => [p.id, p.works])).toEqual([['earnMore', true], ['balanced', true], ['borrowLess', false]]);
    expect(moves(by(s, 'earnMore'))).toEqual([['use', 50, 85], ['price', 250, 251.25]]);
    expect(moves(by(s, 'balanced'))).toEqual([['loan', 7500000, 5466000], ['wc', 2000000, 1800000], ['use', 50, 80.5]]);
    const near = by(s, 'borrowLess');
    expect([near.still, near.runsOut]).toEqual([['interestCover'], undefined]);
    // By hand: profit before interest in the three months is below nil whatever the loan.
    expect(1200000 - 900000 - 625000).toBeLessThan(0);
    expect(near.score).toBeGreaterThan(0);
  });
});

describe('Every plan, on every case', () => {
  const cases: [string, ReportInput, Parameters<typeof solve>[1]?][] = [
    ['S', S], ['H', H], ['H, odd rupees', { ...H, loan: { ...H.loan, amount: 7512345 }, wcLimit: 1234567 }],
    ['H at the most use', { ...H, utilisationPct: [85, 85, 85], variablePct: 75 }],
    ['hopeless', { ...S, variablePct: 97 }],
  ];
  const all = cases.map(([name, x, o]) => ({ name, x, s: solved(x, o) }));

  it('a plan that works meets every level and never runs out of cash, read afresh; its inputs are its moves written in', () => {
    for (const { x, s } of all) for (const p of s.plans) {
      expect(p.input).toEqual(written(x, p.moves));
      const { r, d } = fresh(p.input);
      expect(p.works).toBe(!d.misses.length && !r.cashShort);
      expect([p.still, p.runsOut]).toEqual([d.misses, r.cashShort?.first]);
      expect(p.works).toBe(p.score === 0);
    }
    expect(all.flatMap(({ s }) => s.plans.filter((p) => p.works)).length).toBeGreaterThanOrEqual(10);
  });

  it('is the least: one unit back on any move misses again', () => {
    for (const { x, s } of all) for (const p of s.plans.filter((q) => q.works)) for (const m of p.moves) expect([p.id, m.id, works(written(x, p.moves, m))]).toEqual([p.id, m.id, false]);
  });

  it('keeps the limits: use, the term, the loan, the price, the holiday', () => {
    for (const { x, s } of all) for (const p of s.plans) {
      const y = p.input, tl = x.loan.amount as number;
      for (const u of y.utilisationPct as number[]) expect(u).toBeLessThanOrEqual(LEVELS.capacity.mostUsePct);
      expect(termMonths(y)).toBeLessThanOrEqual(LEVELS.term.longestMonths);
      expect(y.loan.amount as number).toBeGreaterThanOrEqual(tl * (1 - SOLVE.loanCutMostPct / 100));
      expect(y.loan.amount as number).toBeLessThanOrEqual(tl);
      expect(y.price as number).toBeLessThanOrEqual((x.price as number) * (1 + SOLVE.priceMostPct / 100) + 0.005);
      expect(y.priceGrowthPct ?? 0).toBeLessThanOrEqual(SOLVE.priceGrowthMostPct);
      expect(y.loan.moratoriumMonths as number).toBeLessThanOrEqual(SOLVE.moratoriumMostMonths);
      expect(y.loan.instalments as number).toBeGreaterThanOrEqual(1);
      expect(y.wcLimit as number).toBeGreaterThanOrEqual(0);
      // Never a move: costs, the rate, the collateral, the plant.
      expect([y.variablePct, y.fixedCosts, y.loan.ratePct, y.capacity, y.cost]).toEqual([x.variablePct, x.fixedCosts, x.loan.ratePct, x.capacity, x.cost]);
      for (const m of p.moves) expect(MOVE_IDS).toContain(m.id);
      expect(p.moves.every((m) => m.to !== m.from)).toBe(true);
    }
  });

  it('a hopeless case has only plans that do not work, the nearest first', () => {
    const { s } = all[4];
    expect(s.plans.length).toBeGreaterThan(0);
    expect(s.plans.every((p) => !p.works && p.still.length > 0)).toBe(true);
    expect(s.plans.map((p) => p.score)).toEqual([...s.plans.map((p) => p.score)].sort((a, b) => a - b));
  });

  it('is the same on a second run, within its runs', () => {
    for (const { x, s } of all) {
      const again = solved(x);
      expect(again.plans.map((p) => [p.id, p.moves, p.works, p.still, p.score, p.runs])).toEqual(s.plans.map((p) => [p.id, p.moves, p.works, p.still, p.score, p.runs]));
      for (const p of s.plans) expect(p.runs).toBeLessThanOrEqual(SOLVE.runsMost);
      expect(new Set(s.plans.map((p) => p.moves.map((m) => m.id).join())).size).toBe(s.plans.length);
    }
  });

  it('asks for what the report asks for', () => {
    expect(solve({ ...S, loan: { ...S.loan, amount: undefined } } as ReportInput)).toHaveProperty('needs');
  });
});
