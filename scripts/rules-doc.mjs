/**
 * Writes docs/RULES.md from engine/data, in plain words, so the rules the engine uses are the rules the owner reads.
 * `--check` (CI) fails when docs/RULES.md is out of date.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import dscr from '../engine/data/dscr.json' with { type: 'json' };
import tax from '../engine/data/tax.json' with { type: 'json' };
import defaults from '../engine/data/defaults.json' with { type: 'json' };

const date = (iso) => iso.split('-').reverse().join('-');
const list = (ids) => {
  const names = ids.map((id) => dscr.components[id].toLowerCase());
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names.join('');
};
const checked = (x) => (x.verified ? 'checked' : 'not yet checked');

const out = [
  '# Rules',
  '',
  'Generated from `engine/data/` by `npm run rules-doc`; edit the data file, not this page.',
  '',
  `## ${dscr.title}`,
  '',
  `Dated ${date(dscr.date)}. ${dscr.status}`,
  '',
  dscr.formula,
  '',
  `- **Cash available** always includes ${list(dscr.base.available)}.`,
  `- **Debt service** always includes ${list(dscr.base.service)}.`,
  '',
  'Four choices set the rest. The engine never picks one for you.',
  '',
];
for (const [key, option] of Object.entries(dscr.options)) {
  out.push(`**${option.question}** (\`${key}\`)`, '');
  for (const [id, c] of Object.entries(option.choices))
    out.push(`- ${c.label}${c.adds.length ? `: adds ${list(c.adds)} to both cash available and debt service` : ''} (\`${id}\`)`);
  out.push('');
}
out.push('The lowest year is the lowest DSCR among the years that count.', '', '### Presets', '');
for (const p of dscr.presets) {
  const picks = Object.entries(p.choice).map(([k, v]) => dscr.options[k].choices[v].label.toLowerCase()).join('; ');
  out.push(`- **${p.label}**: ${picks}. Source: ${p.source} (${date(p.date)}, ${checked(p)}).`);
}
out.push('', '### Benchmarks', '', 'Shown as examples only, never used unless chosen. Each lender sets its own.', '',
  '| What | Value | Source | Date | Checked |', '|---|---|---|---|---|');
for (const b of dscr.benchmarks) out.push(`| ${b.what} | ${b.value.toFixed(2)} | ${b.source} | ${date(b.date)} | ${b.verified ? 'yes' : 'no'} |`);
out.push('', `### ${dscr.planning.label}`, '', ...dscr.planning.rules.map((r) => `- ${r}`), '');
out.push(`## ${tax.title}`, '', `Dated ${date(tax.date)}. ${tax.status}`, '',
  '| Borrower | Rate | Working | Law | Source | Date | Checked |', '|---|---|---|---|---|---|---|');
for (const t of tax.rates)
  out.push(`| ${t.label} | ${t.pct}% | ${t.base}%${t.surcharge ? ` + ${t.surcharge}% surcharge` : ''} + ${t.cess}% cess | ${t.law} | ${t.source} | ${date(t.date)} | ${t.verified ? 'yes' : 'no'} |`);
out.push('');
out.push(`## ${defaults.title}`, '', `Dated ${date(defaults.date)}. ${defaults.status}`, '', '| What | Assumed | Why |', '|---|---|---|');
for (const a of defaults.assumptions) out.push(`| ${a.what} | ${a.shown} | ${a.why} |`);
out.push('');

const text = out.join('\n');
const path = new URL('../docs/RULES.md', import.meta.url);
if (process.argv.includes('--check')) {
  let current = '';
  try { current = readFileSync(path, 'utf8'); } catch { /* missing counts as out of date */ }
  if (current !== text) { console.error('docs/RULES.md is out of date: run npm run rules-doc'); process.exit(1); }
  console.log('docs/RULES.md is up to date');
} else {
  writeFileSync(path, text);
  console.log('wrote docs/RULES.md');
}
