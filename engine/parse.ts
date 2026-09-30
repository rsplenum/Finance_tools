/** Indian-style input: "70 L", "1.2 Cr", "7,00,000"; dates typed as dd-mm-yyyy. Pure — no DOM. */

const UNITS: Record<string, number> = { l: 1e5, lac: 1e5, lacs: 1e5, lakh: 1e5, lakhs: 1e5, cr: 1e7, crore: 1e7, crores: 1e7, k: 1e3 };

/** Parse an amount; `units` allows L / Cr / K suffixes. Returns undefined when the entry is not understood. */
export function parseAmount(s: string, units = true): number | undefined {
  const t = s.trim().toLowerCase().replace(/^(rs\.?|inr|₹)\s*/, '').replace(/[,\s]/g, '').replace(/\.$/, '');
  const m = /^(-?(?:\d+\.?\d*|\.\d+))([a-z]*)$/.exec(t);
  if (!m) return undefined;
  const n = Number(m[1]);
  if (!m[2]) return n;
  const k = units ? UNITS[m[2]] : undefined;
  return k === undefined ? undefined : Math.round(n * k * 100) / 100;
}

/** Parse dd-mm-yyyy (also / or . separators) or yyyy-mm-dd to ISO yyyy-mm-dd; undefined when not a real date. */
export function parseDate(s: string): string | undefined {
  const t = s.trim();
  const a = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(t), b = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  if (!a && !b) return undefined;
  const [y, mo, d] = a ? [+a[3], +a[2], +a[1]] : [+b![1], +b![2], +b![3]];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return undefined;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** ISO yyyy-mm-dd → dd-mm-yyyy for display. */
export const showDate = (iso?: string) => iso ? iso.split('-').reverse().join('-') : '';

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

/** Parse a month: 2026-04 (as a month field gives it), 04-2026, 4/2026, Apr 2026 or April 2026 → '2026-04'; undefined when not understood. */
export function parseMonth(s: string): string | undefined {
  const t = s.trim().toLowerCase();
  let x: RegExpExecArray | null, y: number, m: number;
  if ((x = /^(\d{4})[-/.](\d{1,2})$/.exec(t))) [y, m] = [+x[1], +x[2]];
  else if ((x = /^(\d{1,2})[-/. ](\d{4})$/.exec(t))) [y, m] = [+x[2], +x[1]];
  else if ((x = /^([a-z]{3,9})\.?[-/ ,]*(\d{4})$/.exec(t))) [y, m] = [+x[2], MONTHS.findIndex((n) => n.startsWith(x![1])) + 1];
  else return undefined;
  return m >= 1 && m <= 12 && y >= 1900 && y <= 2200 ? `${y}-${String(m).padStart(2, '0')}` : undefined;
}
