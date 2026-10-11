/**
 * DSCR as lenders test it (D1, D-UX-47): beside the borrower's DSCR, the sales price 5% lower and costs 10% higher
 * (each alone), promoters' loans repaid, the cash check after working capital's growth and replacement capex, and the
 * last audited year. Pure — no DOM. The percentages are data (engine/data/dscr.json `lender`), our own tests and not a
 * lender's norm. Each stressed DSCR runs through planStatement (which checks itself against dscr-check.ts), and
 * lender-check.ts works every change a second way; nothing is returned unless both agree. Nothing here changes the verdict.
 */
import DATA from './data/dscr.json';
import { planStatement, type Definition, type Needs, type Blocked, type Plan, type ProjectionYear, type LoanInput, type Row } from './dscr';
import { auditedCheck, cashCheckTotal, promotersCheck, stressCheck } from './lender-check';
import type { LoanTerms } from './loan';

export const LENDER = DATA.lender;
export type StressId = (typeof DATA.lender.stress)[number]['id'];

/** What the lenders' tests need beyond the plan, a value for each year of figures where it is yearly. */
export interface LenderYear { fy: string; sales?: number; capex?: number; promoterLoans?: number }
export interface AuditedInput { sales?: number; pbdit?: number; depreciation?: number; interest?: number; tax?: number }

export interface Summary { average?: number; minimum?: { dscr: number; fy: string }; rows: Row[] }
export interface StressLine extends Summary { id: StressId; label: string; pct: number; belowFloor: boolean }
export interface CashRow { fy: string; available: number; wcGrowth: number; capex: number; service: number; left: number; counted: boolean; cover?: number }
export interface CashCheck { rows: CashRow[]; lowest?: { cover: number; fy: string }; short: string[] }
export interface Audited {
  fy: string; sales: number; pbdit: number; depreciation: number; interest: number; tax: number; pbt: number; pat: number; accrual: number; margin: number;
  /** The first year of figures beside it, where its sales are given. */
  next?: { fy: string; salesGrowth: number; margin: number; pbditGrowth?: number };
  flags: string[];
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const money = (a: number, b: number) => Math.abs(a - b) <= Math.max(0.01, 1e-9 * Math.max(Math.abs(a), Math.abs(b)));
const same = (a?: number, b?: number) => (a === undefined || b === undefined ? a === b : Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b)));
const blocked = (where: string): Blocked => ({ blocked: `The two computations disagree on ${where}, so no figures are shown. Please report this.` });
const summary = (p: Plan): Summary => ({ average: p.statement.average, minimum: p.statement.minimum, rows: p.statement.rows });
const prevFy = (fy: string) => { const y = Number(fy.slice(0, 4)) - 1; return `${y}-${String((y + 1) % 100).padStart(2, '0')}`; };

/** The years the plan uses: from `start` when the figures start later than the loan. */
const used = <T extends { fy: string }>(xs: T[], start?: string) => (start ? xs.filter((x) => x.fy >= start) : xs);

/** Sales for every year of figures, or what is missing. A negative sales figure is asked again. */
function salesNeeds(extra: LenderYear[], proj: ProjectionYear[], start?: string): string[] {
  const by = new Map(extra.map((e) => [e.fy, e.sales]));
  return used(proj, start).flatMap((p) => {
    const v = by.get(p.fy);
    return !isNum(v) ? [`Sales for ${p.fy}`] : v < 0 ? [`Sales for ${p.fy}, as zero or more`] : [];
  });
}

/**
 * The two stress lines: the plan again with profit before interest, depreciation and tax cut by each case. Tax is
 * worked out again on the lower profit. Needs sales for every year of figures; never changes the verdict.
 */
export function stressTests(proj: ProjectionYear[], loan: LoanInput, def: Definition, extra: LenderYear[], start?: string): StressLine[] | Needs | Blocked {
  const needs = salesNeeds(extra, proj, start);
  if (needs.length) return { needs };
  const sales = new Map(extra.map((e) => [e.fy, e.sales as number]));
  const out: StressLine[] = [];
  for (const c of LENDER.stress) {
    const k = c.pct / 100;
    const cut = proj.map((p) => {
      const s = sales.get(p.fy), pbdit = p.pbdit as number;
      if (!isNum(s)) return p; // a year before the figures start, left out of the plan
      return { ...p, pbdit: c.id === 'price' ? pbdit - k * s : pbdit - k * (s - pbdit) };
    });
    const r = planStatement(cut, loan, def, start);
    if ('needs' in r || 'blocked' in r) return r;
    const check = stressCheck(used(proj, start), loan as LoanTerms, def, sales, c.id as StressId, c.pct);
    const s = summary(r);
    if (!same(s.average, check.average) || !same(s.minimum?.dscr, check.minimum?.dscr)) return blocked(`the ${c.label.toLowerCase()} line`);
    out.push({ id: c.id as StressId, label: c.label, pct: c.pct, ...s, belowFloor: !!s.minimum && s.minimum.dscr < LENDER.floor.value });
  }
  return out;
}

/** Promoters' loans repaid as given: the repayment is debt service in full, beside the loan's, as existing EMIs are. */
export function promotersRepaid(proj: ProjectionYear[], loan: LoanInput, def: Definition, extra: LenderYear[], start?: string): Summary | Needs | Blocked | undefined {
  const by = new Map(extra.map((e) => [e.fy, e.promoterLoans]));
  const rows = used(proj, start);
  if (!rows.some((p) => isNum(by.get(p.fy)) && (by.get(p.fy) as number) > 0)) return undefined;
  const needs = rows.flatMap((p) => { const v = by.get(p.fy); return !isNum(v) ? [`Promoters' loans repaid in ${p.fy}`] : v < 0 ? [`Promoters' loans repaid in ${p.fy}, as zero or more`] : []; });
  if (needs.length) return { needs };
  const plus = proj.map((p) => (isNum(by.get(p.fy)) ? { ...p, existingEmis: (p.existingEmis ?? 0) + (by.get(p.fy) as number) } : p));
  const r = planStatement(plus, loan, def, start);
  if ('needs' in r || 'blocked' in r) return r;
  const check = promotersCheck(rows, loan as LoanTerms, def, by as Map<string, number>), s = summary(r);
  return same(s.average, check.average) && same(s.minimum?.dscr, check.minimum?.dscr) ? s : blocked('the promoters\' loans line');
}

/**
 * The cash check: each year's cash available less the growth in working capital (`wcPct` of the rise in sales over the
 * year before; the first year's over the last audited year's sales) and replacement capex, against the debt service.
 */
export function cashCheck(p: Plan, extra: LenderYear[], wcPct: number | undefined, salesBefore: number | undefined): CashCheck | Needs | Blocked {
  const by = new Map(extra.map((e) => [e.fy, e]));
  const rows = p.statement.rows, needs: string[] = [];
  if (!isNum(wcPct) || wcPct < 0) needs.push('Working capital needed, as a % of sales');
  if (!isNum(salesBefore)) needs.push("The last audited year's sales, for the first year's growth in working capital");
  for (const r of rows) {
    const e = by.get(r.fy);
    if (!isNum(e?.sales)) needs.push(`Sales for ${r.fy}`);
    if (!isNum(e?.capex)) needs.push(`Replacement capex for ${r.fy} (none, or how much)`);
    else if (e.capex < 0) needs.push(`Replacement capex for ${r.fy}, as zero or more`);
  }
  if (needs.length) return { needs };
  let before = salesBefore as number;
  const out: CashRow[] = rows.map((r) => {
    const e = by.get(r.fy) as Required<LenderYear>;
    const wcGrowth = (wcPct as number) / 100 * (e.sales - before);
    before = e.sales;
    const left = r.available - wcGrowth - e.capex - r.service;
    return { fy: r.fy, available: r.available, wcGrowth, capex: e.capex, service: r.service, left, counted: r.counted, ...(r.service > 0 ? { cover: (r.available - wcGrowth - e.capex) / r.service } : {}) };
  });
  const counted = out.filter((r) => r.counted && r.cover !== undefined);
  const low = counted.length ? counted.reduce((m, r) => ((r.cover as number) < (m.cover as number) ? r : m)) : undefined;
  const check = cashCheckTotal(p, extra, wcPct as number, salesBefore as number);
  const total = out.reduce((t, r) => t + r.left, 0);
  if (!money(total, check.left) || out.some((r, i) => !money(r.left, check.rows[i]))) return blocked('the cash check');
  return { rows: out, ...(low ? { lowest: { cover: low.cover as number, fy: low.fy } } : {}), short: out.filter((r) => r.left < 0).map((r) => r.fy) };
}

/** The last audited year from its five figures, and the first year of figures beside it. A projected margin above it is flagged. */
export function auditedYear(a: AuditedInput, first?: { fy: string; pbdit?: number; sales?: number }): Audited | Needs | Blocked {
  const names: Record<keyof AuditedInput, string> = { sales: 'sales', pbdit: 'profit before interest, depreciation and tax', depreciation: 'depreciation', interest: 'interest', tax: 'tax' };
  const needs = (Object.keys(names) as (keyof AuditedInput)[]).flatMap((k) => {
    const v = a[k];
    return !isNum(v) ? [`The last audited year's ${names[k]}`] : k !== 'pbdit' && v < 0 ? [`The last audited year's ${names[k]}, as zero or more`] : [];
  });
  if (!first) needs.push('The first year of figures');
  if (needs.length) return { needs };
  const x = a as Required<AuditedInput>, f = first as { fy: string; pbdit?: number; sales?: number };
  if (x.sales === 0) return { needs: ["The last audited year's sales, above zero"] };
  const pbt = x.pbdit - x.depreciation - x.interest, pat = pbt - x.tax, accrual = pat + x.depreciation, margin = x.pbdit / x.sales;
  const check = auditedCheck(x);
  if (!money(pat, check.pat) || !money(accrual, check.accrual)) return blocked('the last audited year');
  const flags: string[] = [];
  let next: Audited['next'];
  if (isNum(f.sales) && f.sales > 0 && isNum(f.pbdit)) {
    next = { fy: f.fy, salesGrowth: f.sales / x.sales - 1, margin: f.pbdit / f.sales, ...(x.pbdit > 0 ? { pbditGrowth: f.pbdit / x.pbdit - 1 } : {}) };
    if (next.margin > margin) flags.push(`The margin in ${f.fy} is above the last audited year's: a lender will ask why`);
  }
  return { fy: prevFy(f.fy), sales: x.sales, pbdit: x.pbdit, depreciation: x.depreciation, interest: x.interest, tax: x.tax, pbt, pat, accrual, margin, ...(next ? { next } : {}), flags };
}
