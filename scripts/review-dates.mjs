/**
 * Review-by dates (Q2, D-TECH-34, D-DATA-19): every data file under engine/data/ carries `reviewBy` beside its `date`.
 * Fails when one is missing, not after its date, more than a year after it, or passed; warns in its last 30 days.
 * The dates live in the files (costs 6 months from their date, tax to the end of its tax year, the rest 12 months);
 * this only reads them. REVIEW_TODAY=YYYY-MM-DD tries another day.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const WARN_DAYS = 30;
const today = process.env.REVIEW_TODAY ?? new Date().toISOString().slice(0, 10);
const iso = /^\d{4}-\d{2}-\d{2}$/;
const addDays = (d, n) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const addYear = (d) => `${Number(d.slice(0, 4)) + 1}${d.slice(4)}`;

const files = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? files(join(dir, e.name)) : e.name.endsWith('.json') ? [join(dir, e.name)] : []);

const bad = [];
const soon = [];
const all = files('engine/data');
for (const f of all) {
  const { date, reviewBy } = JSON.parse(readFileSync(f, 'utf8'));
  if (!iso.test(reviewBy ?? '')) bad.push(`${f}: no reviewBy (YYYY-MM-DD) beside its date`);
  else if (!(reviewBy > date)) bad.push(`${f}: reviewBy ${reviewBy} is not after its date ${date}`);
  else if (reviewBy > addYear(date)) bad.push(`${f}: reviewBy ${reviewBy} is more than a year after its date ${date}`);
  else if (today > reviewBy) bad.push(`${f}: due for review since ${reviewBy}: check its figures against their sources, then move its date and reviewBy`);
  else if (addDays(today, WARN_DAYS) >= reviewBy) soon.push(`${f}: due for review by ${reviewBy}`);
}
for (const l of [...bad, ...soon.map((s) => `warning: ${s}`)]) console.log(l);
console.log(`${all.length} data files, ${soon.length} due within ${WARN_DAYS} days, ${bad.length} violations`);
process.exit(bad.length ? 1 : 0);
