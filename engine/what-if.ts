/**
 * What if (Rahul's note on the check page, 15-11-2026: "Sensitivity Analysis — Sales / Cost / ROI"): the whole report run
 * again under each case in engine/data/report.json's `whatIf`, and read by the same benchmarks. Sales move by every
 * product's price (or the typed sales), costs by the variable share and the fixed costs together, the rate by points on
 * the term loan and the working-capital limit together: the room's own moves (engine/viable.ts), so the two agree. Each
 * run is projectReport, which checks itself; the tests work one case a second way, from a state typed by hand.
 */
import DATA from './data/report.json';
import { diagnose, type Levels, type RatioId } from './ratios';
import { costsOf, projectReport, type ReportInput } from './report';
import { scaled } from './viable';

export const WHAT_IF = DATA.whatIf;
type Case = (typeof DATA.whatIf.cases)[number] & { salesPct?: number; costsPct?: number; ratePoints?: number };
export interface WhatIfRow {
  id: string; label: string;
  /** The DSCR in the lowest year and over the loan; undefined when the case cannot be read. */
  lowest?: number; lowestFy?: string; average?: number;
  /** The benchmarks missed under the case; `cashShort`, the first year cash runs out, if it does. */
  misses: RatioId[]; cashShort?: string;
}

/** The input moved by one case: none of its parts left out. */
export function moved(x: ReportInput, c: { salesPct?: number; costsPct?: number; ratePoints?: number }): ReportInput {
  let y = c.salesPct ? scaled(x, 1 + c.salesPct / 100) : x;
  if (c.costsPct) {
    const cs = costsOf(y), f = 1 + c.costsPct / 100;
    y = { ...y, variablePct: (cs.variablePct as number) * f, fixedCosts: (cs.fixedCosts as number) * f };
  }
  if (c.ratePoints) {
    const wc = (y.wcLimit ?? 0) > 0 && y.wcRatePct !== undefined;
    y = { ...y, loan: { ...y.loan, ratePct: (y.loan.ratePct as number) + c.ratePoints }, ...(wc ? { wcRatePct: (y.wcRatePct as number) + c.ratePoints } : {}) };
  }
  return y;
}

/** The report as typed, then each case: the lowest and average DSCR and the benchmarks missed. Undefined when the report
 * as typed cannot be worked. */
export function whatIfTable(x: ReportInput, lv?: Levels): { typed: WhatIfRow; rows: WhatIfRow[] } | undefined {
  const base = projectReport(x);
  if ('needs' in base || 'blocked' in base) return undefined;
  const row = (id: string, label: string, y: ReportInput): WhatIfRow => {
    const r = projectReport(y);
    if ('needs' in r || 'blocked' in r) return { id, label, misses: [] };
    const d = diagnose(r, y, 'fresh', lv);
    return {
      id, label, lowest: r.lowest?.dscr, lowestFy: r.lowest?.fy, average: r.average, misses: d.misses,
      ...(r.cashShort ? { cashShort: r.cashShort.first } : {}),
    };
  };
  return { typed: row('typed', 'As planned', x), rows: (WHAT_IF.cases as Case[]).map((c) => row(c.id, c.label, moved(x, c))) };
}

/** Each case's lowest and average DSCR and the benchmarks it misses; undefined when the report as typed cannot be worked. */
export const whatIf = (x: ReportInput, lv?: Levels): WhatIfRow[] | undefined => whatIfTable(x, lv)?.rows;
