/**
 * Simulation (`npm run sim`; also part of `npm test`). Generated cases on every seed, each checked against invariants,
 * with one fact dropped every time to prove a missing fact is reported, never assumed. Must end with 0 violations.
 */
import { describe, it, expect } from 'vitest';
import {
  LOAN_LABELS, PROJECTION_LABELS, amortization, loanTimeline, maxLoanAmount, planStatement, shortestRepayment,
  type Definition, type Plan, type ProjectionYear, type Statement, type Target,
} from '../engine/dscr';
import { fyOf, type LoanTerms } from '../engine/loan';

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];
const CASES = 250;

function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCase(rnd: () => number) {
  const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)];
  const int = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
  const first = int(2025, 2030), years = int(2, 12), offset = int(0, 11), moratoriumMonths = int(0, 24);
  const frequency = pick(['monthly', 'quarterly'] as const);
  const style = frequency === 'monthly' ? pick(['equal-principal', 'emi'] as const) : 'equal-principal';
  const most = Math.floor((years * 12 - offset - moratoriumMonths) / (frequency === 'monthly' ? 1 : 3));
  if (most < 1) return undefined;
  const drawn = new Date(Date.UTC(first, 3 + offset, 1));
  const loan: LoanTerms = {
    amount: Math.round(1e5 * Math.exp(rnd() * Math.log(5000))),
    ratePct: pick([0, 7.5, 9, 10.25, 12, 14, 18]),
    disbursed: `${drawn.getUTCFullYear()}-${String(drawn.getUTCMonth() + 1).padStart(2, '0')}`,
    moratoriumMonths, instalments: int(1, most), frequency, style,
  };
  const size = loan.amount;
  const proj: ProjectionYear[] = Array.from({ length: years }, (_, i) => ({
    fy: `${first + i}-${String((first + i + 1) % 100).padStart(2, '0')}`,
    pbdit: Math.round(size * (rnd() * 0.8 - 0.05)),
    depreciation: Math.round(size * rnd() * 0.1),
    nonCash: rnd() < 0.7 ? 0 : Math.round(size * rnd() * 0.02),
    interestOther: Math.round(size * rnd() * 0.05),
    leaseRentals: Math.round(size * rnd() * 0.03),
    otherLoansInterest: rnd() < 0.6 ? 0 : Math.round(size * rnd() * 0.03),
    otherLoansPrincipal: rnd() < 0.6 ? 0 : Math.round(size * rnd() * 0.1),
    taxPct: pick([0, 25.17, 26, 30, 31.2, 34.94]),
  }));
  const def: Definition = {
    interest: pick(['term-loans', 'all-borrowings', 'none'] as const),
    leases: pick(['no', 'yes'] as const),
    years: pick(['repayment', 'debt-service'] as const),
    average: pick(['totals', 'mean'] as const),
  };
  const target: Target = pick([{ average: 1 + rnd() * 1.5 }, { minimum: 1 + rnd() }, { average: 1.2 + rnd(), minimum: 1 + rnd() * 0.5 }]);
  return { loan, proj, def, target };
}

/** The target test, written apart from the engine's own. */
function meets(s: Statement, t: Target): boolean {
  const used = s.rows.filter((x) => x.counted);
  if (!used.length || used.some((x) => x.available <= 0)) return false;
  if (t.minimum !== undefined && !(s.minimum && s.minimum.dscr >= t.minimum)) return false;
  return t.average === undefined || (s.average !== undefined && s.average >= t.average);
}

function runSeed(seed: number): { cases: number; violations: string[]; seen: Record<string, number> } {
  const rnd = random(seed), violations: string[] = [];
  let cases = 0;
  const seen: Record<string, number> = { amount: 0, noAmount: 0, instalments: 0, noInstalments: 0, lateStart: 0 };
  while (cases < CASES) {
    const c = makeCase(rnd);
    if (!c) continue;
    cases++;
    const { loan, proj, def, target } = c, id = `seed ${seed} case ${cases}`;
    const bad = (m: string) => violations.push(`${id}: ${m}`);
    const planAt = (l: LoanTerms): Plan | undefined => {
      const r = planStatement(proj, l, def);
      if ('statement' in r) return r;
      bad(`no figures for complete facts: ${JSON.stringify(r)}`);
      return undefined;
    };
    const p = planStatement(proj, loan, def);
    if (!('statement' in p)) { bad(`no figures for complete facts: ${JSON.stringify(p)}`); continue; }

    // Schedule: repays exactly the loan, never negative, nothing owed at the end.
    const paid = p.schedule.reduce((s, y) => s + y.principal, 0);
    if (Math.abs(paid - loan.amount) > Math.max(0.01, loan.amount * 1e-9)) bad(`repaid ${paid} of ${loan.amount}`);
    if (p.schedule.some((y) => y.interest < -1e-9 || y.principal < -1e-9)) bad('negative interest or principal');
    if (Math.abs(p.schedule[p.schedule.length - 1].closing) > 0.01) bad('balance left at the end');

    // When the loan runs (the page's years and read-back): the schedule's years, the first instalment in the first year
    // that repays principal, the last in the last year.
    const when = loanTimeline(loan), fyOfMonth = (ym: string) => fyOf(Number(ym.slice(0, 4)), Number(ym.slice(5)));
    if ('needs' in when) bad(`no timeline for complete terms: ${when.needs.join('; ')}`);
    else {
      const fys = p.schedule.map((y) => y.fy);
      if (when.years.join() !== fys.join()) bad(`timeline years ${when.years.join()} against the schedule's ${fys.join()}`);
      if (fyOfMonth(when.firstInstalment) !== p.schedule.find((y) => y.principal > 0)?.fy) bad(`first instalment ${when.firstInstalment} not in the first year that repays`);
      if (fyOfMonth(when.lastInstalment) !== fys[fys.length - 1]) bad(`last instalment ${when.lastInstalment} not in the last year`);
    }

    // Month by month: shown for complete terms (so both computations agree), repays exactly the loan, and adds up to the
    // yearly schedule.
    const am = amortization(loan);
    if (!('months' in am)) bad(`no repayment schedule for complete terms: ${JSON.stringify(am)}`);
    else {
      const repaid = am.months.reduce((t, m) => t + m.principal, 0);
      if (Math.abs(repaid - loan.amount) > Math.max(0.01, loan.amount * 1e-9)) bad(`schedule repays ${repaid} of ${loan.amount}`);
      p.schedule.forEach((y) => {
        const inYear = am.months.filter((m) => m.fy === y.fy), interest = inYear.reduce((t, m) => t + m.interest, 0);
        if (Math.abs(interest - y.interest) > Math.max(0.01, y.interest * 1e-9)) bad(`${y.fy}: months add to interest ${interest}, the year says ${y.interest}`);
      });
      if (am.months.filter((m) => m.instalment).length !== loan.instalments) bad('instalment count differs from the terms');
    }

    // Figures that start after an interest-only first year: that year is left out, with its interest, and every other
    // year's figures stay exactly as they were.
    if (p.schedule.length > 1 && p.schedule[0].principal === 0 && proj[0].fy === p.schedule[0].fy) {
      seen.lateStart++;
      const later = planStatement(proj.slice(1), loan, def, p.schedule[1].fy);
      if (!('statement' in later)) bad(`starting in ${p.schedule[1].fy} gave ${JSON.stringify(later).slice(0, 120)}`);
      else {
        if (later.beforeStart.length !== 1 || later.beforeStart[0].fy !== p.schedule[0].fy || Math.abs(later.beforeStart[0].interest - p.schedule[0].interest) > 0.01) bad('left-out year or its interest differs from the schedule');
        later.statement.rows.forEach((x, i) => {
          const same = p.statement.rows[i + 1];
          if (x.fy !== same.fy || Math.abs(x.available - same.available) > 0.01 || Math.abs(x.service - same.service) > 0.01) bad(`${x.fy} changed when ${p.schedule[0].fy} was left out`);
        });
      }
    }

    // Statement: the lowest year is the lowest counted DSCR, and the average lies between the lowest and the highest.
    const counted = p.statement.rows.filter((x) => x.counted).map((x) => x.dscr as number);
    if (counted.length) {
      const lo = Math.min(...counted), hi = Math.max(...counted), avg = p.statement.average as number;
      if (Math.abs((p.statement.minimum?.dscr as number) - lo) > 1e-12) bad('lowest year is not the lowest');
      if (avg < lo - 1e-9 * Math.abs(lo) || avg > hi + 1e-9 * Math.abs(hi)) bad(`average ${avg} outside ${lo}..${hi}`);
    }

    // A larger loan never raises a DSCR that is 1 or more.
    const bigger = planAt({ ...loan, amount: Math.ceil(loan.amount * 1.1) });
    if (bigger) bigger.statement.rows.forEach((x, i) => {
      const before = p.statement.rows[i];
      if (x.counted && (x.dscr as number) >= 1 && (x.dscr as number) > (before.dscr as number) + 1e-9 * Math.abs(before.dscr as number))
        bad(`${x.fy}: DSCR rose from ${before.dscr} to ${x.dscr} with a larger loan`);
    });

    // Largest loan: meets the target, and one rupee more does not.
    const { amount: _, ...terms } = loan;
    const most = maxLoanAmount(proj, terms, def, target);
    if ('amount' in most) {
      seen.amount++;
      const at = planAt({ ...loan, amount: most.amount }), above = planAt({ ...loan, amount: most.amount + 1 });
      if (at && !meets(at.statement, target)) bad(`largest loan ${most.amount} misses the target`);
      if (above && meets(above.statement, target)) bad(`one rupee above the largest loan ${most.amount} still meets the target`);
    } else if ('none' in most) {
      seen.noAmount++;
      const tiny = planAt({ ...loan, amount: 1 });
      if (tiny && meets(tiny.statement, target) && !/^No (single answer|upper limit)/.test(most.none)) bad(`"${most.none}" though Rs. 1 meets the target`);
    } else bad(`largest loan gave ${JSON.stringify(most)}`);

    // Shortest repayment (every third case, on a quarter of the loan so that answers exist): meets the target, and every
    // shorter repayment misses it.
    if (cases % 3 === 0) {
      const small = { ...loan, amount: Math.max(1, Math.round(loan.amount / 4)) };
      const short = shortestRepayment(proj, { ...small, instalments: undefined }, def, target);
      const check = (n: number) => { const q = planAt({ ...small, instalments: n }); return q ? meets(q.statement, target) : false; };
      if ('instalments' in short) {
        seen.instalments++;
        if (!check(short.instalments)) bad(`${short.instalments} instalments miss the target`);
        for (let n = 1; n < short.instalments; n++) if (check(n)) { bad(`${n} instalments already meet the target, answer ${short.instalments}`); break; }
      } else if ('none' in short) seen.noInstalments++;
      else bad(`shortest repayment gave ${JSON.stringify(short)}`);
    }

    // Drop one fact: the engine must name it and show no figures.
    const loanKeys = Object.keys(LOAN_LABELS) as (keyof LoanTerms)[];
    const projKeys = (Object.keys(PROJECTION_LABELS) as (keyof typeof PROJECTION_LABELS)[]).filter((k) => k !== 'leaseRentals' || def.leases === 'yes');
    let dropped: ReturnType<typeof planStatement>, expected: string;
    if (rnd() < 0.3) {
      const k = loanKeys[Math.floor(rnd() * loanKeys.length)];
      dropped = planStatement(proj, { ...loan, [k]: undefined }, def);
      expected = LOAN_LABELS[k];
    } else {
      const i = Math.floor(rnd() * proj.length), k = projKeys[Math.floor(rnd() * projKeys.length)];
      dropped = planStatement(proj.map((y, j) => (j === i ? { ...y, [k]: undefined } : y)), loan, def);
      expected = `${PROJECTION_LABELS[k]} for ${proj[i].fy}`;
    }
    if (!('needs' in dropped) || !dropped.needs.some((n) => n.startsWith(expected))) bad(`dropping "${expected}" gave ${JSON.stringify(dropped).slice(0, 120)}`);
  }
  return { cases, violations, seen };
}

describe('simulation', () => {
  for (const seed of SEEDS) {
    it(`seed ${seed}`, () => {
      const { cases, violations, seen } = runSeed(seed);
      console.log(`simulation seed ${seed}: ${cases} cases, ${violations.length} violations (largest loan found ${seen.amount}, none ${seen.noAmount}; shortest repayment found ${seen.instalments}, none ${seen.noInstalments}; interest-only first year left out ${seen.lateStart})`);
      expect(violations.slice(0, 10)).toEqual([]);
    }, 60000);
  }
});
