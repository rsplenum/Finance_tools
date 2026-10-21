/**
 * The guarantee fee on the loans (SCH1): CGFMU's on a Mudra loan, CGTMSE's on another loan to a small enterprise when
 * ticked. A finance cost, year by year, pro rata by months in the first year (the owner, 21-10-2026). Worked here a
 * month at a time from the loan's schedule; report-check.ts works it again bill by bill from the closed-form balances.
 * Rates and rules: engine/data/report.json (guarantees). Pure, no DOM.
 */
import DATA from './data/report.json';
import type { MonthRow } from './loan';
import { monthsOf } from './project';

export const GUARANTEES = DATA.guarantees;
export type GuaranteeId = keyof typeof GUARANTEES;

/** CGTMSE's rate a year (%): the standard rate for the slab of the whole cover, less 10% for each concession ticked, to
 * two decimals as its Annexure II rounds them (0.37 less 10% is 0.33); none above its largest cover. */
export function cgtmseRate(cover: number, concessions: number): number | undefined {
  const g = GUARANTEES.cgtmse, slab = g.slabs.find((s) => cover <= s.upTo), f = 10 ** g.rateDecimals;
  return slab ? Math.round(slab.ratePct * (1 - (g.concessionPct * concessions) / 100) * f + 1e-9) / f : undefined;
}

export interface FeeIn {
  id: GuaranteeId; ratePct: number;
  /** The term loan month by month as it is repaid (engine/loan.ts months), and the amount guaranteed: the sanctioned. */
  months: MonthRow[]; guaranteed: number;
  /** PMEGP's margin money, held as a deposit against the loan for `heldMonths` from the first draw and then set off: in
   * the outstanding until then (the upper figure). */
  held: number; heldMonths: number;
  /** The working-capital limit, fully used from `start`, the month of the first sales. */
  limit: number; start: string;
  fys: string[];
}
export interface FeeYear { fy: string; termLoan: number; workingCapital: number; total: number }

/** The fee in each of `fys`, a month at a time. CGFMU: in the year of the first draw on the amount sanctioned, from that
 * month; later, a full year on what is outstanding on 1 April. CGTMSE: on the amount guaranteed for the first twelve
 * months, then on what was outstanding on the 31 December before each year (the amount guaranteed if not yet drawn), in
 * every month the loan runs. The limit: on the whole limit, every month from the first sales. */
export function guaranteeFee(x: FeeIn): FeeYear[] {
  const m = x.ratePct / 1200, drawn = x.months[0].month, drawFy = x.months[0].fy;
  const at = new Map(x.months.map((r, k) => [r.month, { r, k }]));
  // The outstanding at the end of a month, with the margin money while it is held.
  const outstanding = (ym: string) => { const a = at.get(ym) as { r: MonthRow; k: number }; return a.r.closing + (a.k < x.heldMonths ? x.held : 0); };
  const december = (fy: string) => {
    const ym = `${Number(fy.slice(0, 4)) - 1}-12`;
    return ym < drawn ? x.guaranteed : at.has(ym) ? outstanding(ym) : 0;
  };
  return x.fys.map((fy) => {
    let termLoan = 0;
    const april = at.get(`${fy.slice(0, 4)}-04`);
    for (const ym of monthsOf(fy)) {
      if (ym < drawn) continue;
      if (x.id === 'cgfmu') termLoan += m * (fy === drawFy ? x.guaranteed : april ? april.r.opening : 0);
      else {
        const a = at.get(ym);
        if (a) termLoan += m * (a.k < 12 ? x.guaranteed : december(fy));
      }
    }
    const workingCapital = monthsOf(fy).filter((ym) => ym >= x.start).length * m * x.limit;
    return { fy, termLoan, workingCapital, total: termLoan + workingCapital };
  });
}
