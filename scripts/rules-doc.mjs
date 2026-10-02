/**
 * Writes docs/RULES.md from engine/data, in plain words, so the rules the engine uses are the rules the owner reads.
 * `--check` (CI) fails when docs/RULES.md is out of date.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import dscr from '../engine/data/dscr.json' with { type: 'json' };
import tax from '../engine/data/tax.json' with { type: 'json' };
import defaults from '../engine/data/defaults.json' with { type: 'json' };

const date = (iso) => iso.split('-').reverse().join('-');
const rs = (n) => `Rs. ${n.toLocaleString('en-IN')}`;
const borrowerLabel = (id) => tax.borrowers.find((b) => b.id === id)?.label ?? id;
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
const emis = dscr.existingEmis;
out.push(`### ${emis.question}`, '', `By who the borrower is (${emis.source.charAt(0).toLowerCase() + emis.source.slice(1)}).`, '', '| Borrower | Counted | Asked as |', '|---|---|---|');
for (const [id, e] of Object.entries(emis.byBorrower)) out.push(`| ${borrowerLabel(id)} | ${e.counts} | ${e.ask} |`);
out.push(`| Not yet said | | ${emis.unknown} |`, '');
const slabs = (b) => b.slabs.length === 1 ? `${b.slabs[0][1]}% of income`
  : b.slabs.map(([from, pct], i) => (i === 0 ? `${pct}% up to ${rs(b.slabs[1][0])}` : `${pct}% above ${rs(from)}`)).join('; ');
const surcharge = (b) => b.surcharge.map(([from, pct]) => `${pct}% ${from ? `above ${rs(from)}` : 'on any income'}`).join('; ') || 'None';
const rebate = (b) => (b.rebate ? `Up to ${rs(b.rebate.max)} on income up to ${rs(b.rebate.incomeUpTo)}; above that, the tax is at most the income above ${rs(b.rebate.incomeUpTo)}` : 'None');
out.push(`## ${tax.title}`, '', `Dated ${date(tax.date)}. ${tax.status}`, '',
  'Who the borrower is sets the tax on profit before tax: the rates, less any rebate, then any surcharge (never more than the tax at its threshold plus the income above it: marginal relief), then the cess on both.', '',
  '| Borrower | Rates | Rebate | Surcharge | Cess | Law | Sources | Date | Checked |', '|---|---|---|---|---|---|---|---|---|');
for (const b of tax.borrowers)
  out.push(`| ${b.label}: ${b.who.charAt(0).toLowerCase() + b.who.slice(1)} | ${slabs(b)} | ${rebate(b)} | ${surcharge(b)} | ${b.cess}% | ${b.law} | ${b.source} (${b.kind}) | ${date(b.date)} | ${b.verified ? 'yes' : 'no'} |`);
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
