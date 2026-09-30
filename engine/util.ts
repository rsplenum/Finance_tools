/** Pure helpers: dates, finance, Indian formatting. No policy here. */

export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Completed years and months between two dates (a <= b). */
export function ageYM(dob: string, on: string): { y: number; m: number; totalMonths: number } {
  const a = parseDate(dob), b = parseDate(on);
  let months = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  if (b.getUTCDate() < a.getUTCDate()) months -= 1;
  return { y: Math.floor(months / 12), m: months % 12, totalMonths: months };
}

export function monthsBetween(from: string, to: string): number {
  return ageYM(from, to).totalMonths;
}

export function ymText(totalMonths: number): string {
  const y = Math.floor(totalMonths / 12), m = totalMonths % 12;
  return `${y} Years ${String(m).padStart(2, '0')} Months`;
}

export function addMonths(d: string, n: number): string {
  const x = parseDate(d);
  const t = new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + n, x.getUTCDate()));
  return t.toISOString().slice(0, 10);
}

export function fmtDate(d?: string): string {
  if (!d) return '—';
  const [y, m, dd] = d.split('-');
  return `${dd}-${m}-${y}`;
}

/** Monthly-rest EMI (interest compounded monthly). Rounded up to the next rupee. */
export function emi(principal: number, annualPct: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualPct / 1200;
  if (r === 0) return Math.ceil(principal / months);
  const f = Math.pow(1 + r, months);
  return Math.ceil((principal * r * f) / (f - 1));
}

/** Largest principal serviceable by `emiAmount` (inverse of emi, not rounded). */
export function principalFromEmi(emiAmount: number, annualPct: number, months: number): number {
  if (emiAmount <= 0 || months <= 0) return 0;
  const r = annualPct / 1200;
  if (r === 0) return emiAmount * months;
  const f = Math.pow(1 + r, months);
  return (emiAmount * (f - 1)) / (r * f);
}

/** Outstanding after k EMIs paid. */
export function outstandingAfter(principal: number, annualPct: number, months: number, k: number): number {
  const r = annualPct / 1200;
  const e = emi(principal, annualPct, months);
  if (r === 0) return Math.max(0, principal - e * k);
  const f = Math.pow(1 + r, k);
  return Math.max(0, principal * f - (e * (f - 1)) / r);
}

export const LAKH = 100000;
export const CRORE = 10000000;

/** 12345678.9 -> '1,23,45,678.90' (Indian grouping). */
export function inr(n: number | undefined, decimals = 0): string {
  if (n === undefined || n === null || Number.isNaN(n)) return '—';
  const neg = n < 0;
  const fixed = Math.abs(n).toFixed(decimals);
  const [int, dec] = fixed.split('.');
  const last3 = int.slice(-3);
  const rest = int.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  const s = (rest ? rest + ',' : '') + last3 + (dec ? '.' + dec : '');
  return (neg ? '-' : '') + s;
}
export const rs = (n?: number, d = 0) => (n === undefined ? '—' : `Rs. ${inr(n, d)}`);
export const lakhs = (n?: number) => (n === undefined ? '—' : `Rs. ${(n / LAKH).toFixed(2)} Lakhs`);
/** Ratio as a percentage without float noise: 0.55 → '55%', 0.125 → '12.5%'. */
export const pctOf = (ratio: number) => `${+(ratio * 100).toFixed(2)}%`;
export const pct = (n?: number, d = 2) => (n === undefined ? '—' : `${n.toFixed(d)}%`);

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
  'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
function two(n: number): string { return n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : ''); }
function three(n: number): string {
  const h = Math.floor(n / 100), r = n % 100;
  return [h ? ONES[h] + ' Hundred' : '', r ? two(r) : ''].filter(Boolean).join(' and ');
}
/** Indian-system words: 94520000 -> 'Nine Crore Forty Five Lakh Twenty Thousand'. */
export function words(n: number): string {
  n = Math.round(n);
  if (n === 0) return 'Zero';
  const parts: string[] = [];
  const cr = Math.floor(n / CRORE); n %= CRORE;
  const lk = Math.floor(n / LAKH); n %= LAKH;
  const th = Math.floor(n / 1000); n %= 1000;
  if (cr) parts.push(words(cr) + ' Crore');
  if (lk) parts.push(two(lk) + ' Lakh');
  if (th) parts.push(two(th) + ' Thousand');
  if (n) parts.push(three(n));
  return parts.join(' ');
}
export const rupeesWords = (n: number) => `Rupees ${words(n)} Only`;
