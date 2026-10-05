/**
 * Writes docs/RULES.md from engine/data, in plain words, so the rules the engine uses are the rules the owner reads.
 * `--check` (CI) fails when docs/RULES.md is out of date.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import dscr from '../engine/data/dscr.json' with { type: 'json' };
import tax from '../engine/data/tax.json' with { type: 'json' };
import defaults from '../engine/data/defaults.json' with { type: 'json' };
import estimate from '../engine/data/estimate.json' with { type: 'json' };
import report from '../engine/data/report.json' with { type: 'json' };
import architect from '../engine/data/architect.json' with { type: 'json' };
import sources from '../engine/data/sources.json' with { type: 'json' };
import labour from '../engine/data/library/labour.json' with { type: 'json' };
import { readdirSync } from 'node:fs';

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

// The construction or renovation estimate (engine/estimate.ts).
out.push(`## ${estimate.title}`, '', `Dated ${date(estimate.date)}. ${estimate.status}`, '');
for (const kind of Object.values(estimate.kinds))
  out.push(`**${kind.label}**: ${kind.heads.map((h) => `${h.label} (${h.unit})`).join('; ')}.`, '');
out.push(`Units: ${estimate.units.map((u) => `${u.id} (${u.what})`).join(', ')}.`, '', ...estimate.method.map((m) => `- ${m}`), '');

// The project report (engine/report.ts).
out.push(`## ${report.title}`, '', `Dated ${date(report.date)}. ${report.status}`, '');
out.push('| Head of the project | Depreciation a year |', '|---|---|', ...report.heads.map((h) => `| ${h.label} | ${h.id === 'preliminary' ? `written off over ${report.preliminaryYears} years` : h.depreciationPct ? `${h.depreciationPct}% on the written-down value` : 'none'} |`), '');
out.push(report.depreciationSource, '', `Working capital: ${report.workingCapital.source}`, '');
out.push('**What the page assumes until you change it**', '', ...report.assumptions.map((a) => `- **${a.what}**: ${a.shown}. ${a.why}.`), '');
out.push('**How the figures are worked out**', '', ...report.method.map((m) => `- ${m}`), '');

// The architect's rules (engine/architect.ts): what the estimate assumes from six answers.
const A = architect;
const cite = (ids) => (ids?.length ? ` (${ids.map((i) => (i === 'own' ? 'our rule' : sources.sources[i]?.what ?? i)).join('; ')})` : '');
const levelName = (n) => A.levels[n - 1].name;
out.push(`## ${A.title}`, '', `Dated ${date(A.date)}. ${A.status}`, '', '**The five levels**', '', '| On screen | Your word | What it means |', '|---|---|---|',
  ...A.levels.map((l) => `| ${l.name} | ${l.owner} | ${l.means} |`), '');
out.push('**Sections on for each kind of work**', '', ...Object.values(A.kinds).map((k) => `- **${k.label}**: ${k.on.map((id) => A.sections.find((x) => x.id === id).name).join(', ')}. ${k.why}`), '');
out.push('**The rooms for each BHK** (each room\'s reported range in sq ft; only the sizes\' proportions are used, shared out over your carpet area)', '', '| BHK | Rooms | Balcony | Usual carpet area | Why |', '|---|---|---|---|---|');
for (const [id, p] of Object.entries(A.programmes))
  out.push(`| ${id === '1RK' ? '1 RK' : `${id} BHK`} | ${p.rooms.map((r) => `${r.name} ${r.range[0]}–${r.range[1]}`).join('; ')} | ${p.balcony || 'none'} | ${p.typical ? `${p.typical[0]}–${p.typical[1]}` : '—'} | ${p.why}${cite(p.src)} |`);
out.push('', `**A room\'s size by a word** (R1): ${A.sizes.words.map((w) => `${w.name} ${w.at}`).join(', ')} of the way up the range. ${A.sizes.why}${cite(A.sizes.src)}`);
out.push('', '**A room of your own size or level** (E3): a size you give a room replaces the planned one, its longer side the length, and the other rooms keep theirs; the page flags when the rooms no longer fit the carpet area. A room\'s own level stands above the section\'s slider and below an item of your own (A4), and moves only the sections with a slider: the structure, waterproofing and plumbing stay as they are.', '');
out.push(`**Rooms by buttons** (R2): + Bedroom and a bedroom's × change the bedrooms answer, the later bedrooms moving up with what is theirs. + Bathroom adds a common bathroom of the programme's bathroom range, from 1 to 8, and the rooms share the area with it; a bathroom attached to a bedroom opens into it, so its door comes off that bedroom's skirting instead of the passage's. The balcony can be taken out; it is outside the area the rooms share, so no room moves.`, '');
const rule = (label, text, x) => `- **${label}**: ${text} ${x.why}${cite(x.src)}`;
out.push('**How the rooms are drawn and measured**', '',
  rule('Bathrooms', A.bathrooms.rule, A.bathrooms),
  rule('Passage and foyer', `${A.shares.passage.value * 100}% of the carpet area.`, A.shares.passage),
  rule('Internal walls', `${A.shares.walls.value * 100}% of the carpet area.`, A.shares.walls),
  rule('Proportions', `length ÷ breadth: ${['living', 'bedroom', 'kitchen', 'bath', 'passage', 'balcony'].map((k) => `${k === 'bath' ? 'bathroom' : k} ${A.aspect[k]}`).join(', ')}.`, A.aspect),
  rule('Ceiling height', `${A.height.m} m.`, A.height),
  rule('The Code\'s minimums', `habitable room ${A.minimums.habitable} sq m, kitchen ${A.minimums.kitchen} sq m, bath and WC ${A.minimums.bath} sq m.`, A.minimums),
  ...['main', 'bedroom', 'bath', 'kitchen', 'balcony', 'window', 'kitchenWindow', 'ventilator'].map((k) => rule(`Opening: ${k === 'kitchenWindow' ? 'kitchen window' : k === 'main' ? 'main door' : k === 'window' || k === 'ventilator' ? k : `${k} door`}`, `${A.openings[k].w} × ${A.openings[k].h} mm${A.openings[k].sill ? `, sill ${A.openings[k].sill} mm` : ''}.`, A.openings[k])),
  rule('Windows', `at least ${A.openings.windowShare.value * 100}% of a habitable room's floor.`, A.openings.windowShare),
  rule('IS 1200 deductions', `none up to ${A.is1200.noDeduction} sq m; one face up to ${A.is1200.oneFace} sq m; both faces and the reveals above.`, A.is1200),
  rule('Skirting', `${A.skirting.m * 1000} mm high.`, A.skirting),
  rule('Bathroom wall tiles', `${A.tileHeights.mm.map((h, i) => `${levelName(i + 1)} ${h === 'ceiling' ? 'to the ceiling' : `${h} mm`}`).join(', ')}.`, A.tileHeights),
  rule('Waterproofing', `${A.waterproofing.upturn * 1000} mm up the walls; the shower ${A.waterproofing.showerWidth} m wide to ${A.waterproofing.showerHeight} m; a balcony ${A.waterproofing.balconyUpturn * 1000} mm.`, A.waterproofing),
  rule('Shower glass', `${A.showerScreen.w} × ${A.showerScreen.h} m.`, A.showerScreen),
  rule('Kitchen', `an ${A.kitchen.layout}-shaped counter ${A.kitchen.depth * 1000} mm deep; tiles ${A.kitchen.dado * 1000} mm above it.`, A.kitchen),
  rule('Wardrobes and storage', `main bedroom ${A.wardrobes.mainWidth} mm wide, others ${A.wardrobes.otherWidth} mm; ${A.wardrobes.height} mm high with a ${A.wardrobes.loft} mm loft, floor to ceiling from ${levelName(A.wardrobes.fullHeightFrom)}.`, A.wardrobes),
  rule('False ceiling', `${A.falseCeiling.byLevel.map((x, i) => `${levelName(i + 1)}: ${x.cover === 'none' ? 'none' : `${x.cover === 'border' ? `a ${A.falseCeiling.border} m border` : 'the whole ceiling'} in ${x.rooms.join(', ')}`}`).join('; ')}.`, A.falseCeiling),
  rule('Feature wall', `the living room from ${levelName(A.feature.living)}, the main bedroom from ${levelName(A.feature.master)}.`, A.feature),
  rule('Electrical points', ['living', 'bedroom', 'kitchen', 'bath', 'passage', 'balcony'].map((k) => `${k === 'bath' ? 'bathroom' : k}: ${Object.entries(A.points[k]).map(([n, v]) => `${n === 'masterExtra' ? 'main bedroom +' : `${n} `}${v}`).join(', ')}`).join('; ') + '.', A.points),
  rule('Plumbing points', ['bath', 'kitchen', 'balcony'].map((k) => `${k === 'bath' ? 'bathroom' : k}: ${A.plumbing[k].supply} water, ${A.plumbing[k].drain} drainage`).join('; ') + '.', A.plumbing),
  rule('Air conditioners', `from ${levelName(A.ac.from)} in the living room and main bedroom, from ${levelName(A.ac.allBedroomsFrom)} in every bedroom.`, A.ac),
  rule('Debris', `one lot per bathroom and per ${A.debris.sqftPerLot} sq ft of floor taken up.`, A.debris),
  rule('Making good', `${A.makingGood.share * 100}% of the walls.`, A.makingGood),
  rule('Cities', A.cities.list.map((c) => `${c.name} Rs. ${c.cost[0].toLocaleString('en-IN')}–${c.cost[1].toLocaleString('en-IN')} a sq ft`).join('; ') + '.', A.cities),
  rule('The cities\' ranges', `read as for a house ${A.cities.range.for}; a new house is flagged with the answer outside its city's range at ${levelName(1)} to ${levelName(A.cities.range.upTo)}, and below it at any level (V1).`, A.cities.range),
  rule('GST', `${A.gst.pct}%.`, A.gst),
  rule('Check', `paint ${A.checks.paintRatio[0]}–${A.checks.paintRatio[1]} × the carpet area.`, A.checks),
  '');
const H = A.house;
const W = H.water, sh = H.stages.shares, mid = (r) => (r[0] + r[1]) / 2, whole = mid(sh.foundation) + mid(sh.frame) + mid(sh.walls);
const pct = (r) => `${((mid(r) / whole) * 100).toFixed(2)}%`, byBhk = (o) => Object.entries(o).map(([k, n]) => `${k === '1RK' ? '1 RK' : `${k}BHK`} ${n.toLocaleString('en-IN')}`).join(', ');
out.push('**A new house** (D-UX-23, E5): the outline from the built-up area and the floors, the rooms from what is left, the structure by rules of thumb; the plot round it, the outside works, the water, and the stages a construction loan pays by', '',
  rule('Outline', `each floor ${H.shape.aspect} times as long as it is wide, the outer walls ${A.openings.walls.external} mm.`, H.shape),
  rule('Floor to floor', `the ceiling height plus a ${H.slab.m * 1000} mm slab.`, H.slab),
  rule('Parapet', `${H.parapet.m} m, painted on both faces.`, H.parapet),
  rule('Terrace', `waterproofed inside the parapet and ${H.terraceUpturn.m * 1000} mm up it.`, H.terraceUpturn),
  rule('Stairs', `a ${H.stair.w} × ${H.stair.l} m well on each floor, the top one rising to the terrace; two flights ${H.stair.flight} m wide of ${H.stair.treads} treads, ${H.stair.going} m along; a ${H.stair.landing} m landing; ${H.stair.gap} m between the flights.`, H.stair),
  rule('Stair cabin', `on the well's outline, ${H.cabin.h} m high, its area added to the structure's.`, H.cabin),
  rule('Structure', `for each sq ft of built-up area and of the stair cabin: ${H.thumb.cement} bags of cement, ${H.thumb.steel} kg of steel, ${H.thumb.sand} cft of sand, ${H.thumb.aggregate} cft of aggregate, ${H.thumb.bricks} bricks.`, H.thumb),
  rule('Plot', `the outline with ${H.plot.front} m in front, ${H.plot.rear} m behind and ${H.plot.side} m on each side, until you type your plot's size.`, H.plot),
  rule('Outside works', `a compound wall ${H.outside.wall} m high round the plot less a ${H.outside.gate.w} m gate ${H.outside.gate.h} m high, painted on both faces; the open ground round the house paved.`, H.outside),
  rule('Household', `${byBhk(W.persons.by)} people, ${W.persons.lpcd} litres a day each.`, W.persons),
  rule('Sump', `${W.sump.days} days' water, rounded up to the next ${W.sump.step.toLocaleString('en-IN')} litres.`, W.sump),
  rule('Overhead tank', `${W.tank.days === 1 ? 'a day\'s' : `${W.tank.days} days'`} water, the next size of ${W.tank.sizes.map((x) => x.toLocaleString('en-IN')).join(', ')} litres.`, W.tank),
  rule('Septic tank', `${byBhk(W.septic.litres)} litres, with a soak pit; the sewer connection in its place where the sewer reaches the plot.`, W.septic),
  rule('Rainwater harvesting', 'one recharge pit with a filter.', W.rwh),
  rule('Stages', `the structure ${pct(sh.foundation)} to the foundation and plinth, ${pct(sh.frame)} to the frame and slabs (alike for each floor), ${pct(sh.walls)} to the walls and plaster; the finishing, the outside works and water, and any movable items from the estimate's own lines.`, H.stages),
  '');
out.push('**What each room gets** (the library\'s family, its section, and how it is measured)', '');
for (const [room, slots] of Object.entries(A.templates))
  out.push(`- **${room === 'flat' ? 'The whole flat or house' : room === 'bath' ? 'Each bathroom' : `Each ${room}`}**: ${slots.map((x) => `${x.name ?? x.family} (${A.sections.find((s) => s.id === x.section).name.toLowerCase()}, by ${x.qty}${x.kinds ? `, ${x.kinds.join(' and ')} only` : ''})`).join('; ')}.`);
out.push('', 'The library of materials, finishes and fittings, with every rate and its source, is in `docs/LIBRARY.md`.', '');

const text = out.join('\n');

// The library (engine/library.ts): every item, its levels, its rate and its source.
const dir = new URL('../engine/data/library/', import.meta.url);
const order = ['civil', 'waterproofing', 'flooring', 'walls', 'ceiling', 'bathrooms', 'kitchen', 'wardrobes', 'doors', 'electrical', 'plumbing', 'appliances', 'smart', 'furniture', 'structure', 'outside'];
const files = order.map((n) => JSON.parse(readFileSync(new URL(`${n}.json`, dir), 'utf8')));
if (readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'labour.json' && f !== 'notes.json').length !== order.length) throw new Error('A library file is missing from rules-doc');
// T1's notes (D-UX-34): what a family is, why it costs what it does and what to check; where to spend, where to save.
const notes = JSON.parse(readFileSync(new URL('notes.json', dir), 'utf8'));
const entries = new Map(files.flatMap((f) => f.entries.map((e) => [e.id, e])));
const labourById = new Map(labour.labour.map((l) => [l.id, l]));
const UNIT = { sqft: 'sq ft', sqm: 'sq m', rft: 'running ft', m: 'm', nos: 'each', set: 'set', lot: 'lot', kg: 'kg', cum: 'cu m', bag: 'bag', litre: 'litre' };
const money = (x) => x.toLocaleString('en-IN');
const range = (r) => (r[0] === r[1] ? `Rs. ${money(r[0])}` : `Rs. ${money(r[0])}–${money(r[1])}`);
const numbered = [];
const ref = (ids) => ids.filter((i) => i !== 'own').map((i) => { if (!numbered.includes(i)) numbered.push(i); return `[${numbered.indexOf(i) + 1}]`; }).join('') + (ids.includes('own') ? ' our rule' : '');
const fixes = (fx) => (fx ?? []).map((f) => (typeof f === 'string' ? { id: f, n: 1 } : f));
function rateText(e) {
  const u = UNIT[e.unit];
  if (e.basis === 'set') return `${e.parts.map((p) => `${p.n > 1 ? `${p.n} × ` : ''}${entries.get(p.id).name}`).join(' + ')}${fixes(e.fix).length ? `, fixed by ${fixes(e.fix).map((f) => `${f.n > 1 ? `${f.n} × ` : ''}${labourById.get(f.id).name.toLowerCase()}`).join(' and ')}` : ''}`;
  // A city's own charge stands as it is (byCity); the cities it does not name take the rate, or none yet.
  const own = Object.entries(e.byCity ?? {}).map(([c, r]) => `${A.cities.list.find((x) => x.id === c)?.name ?? c} ${range(r)}`);
  if (own.length && !e.rate) return `${own.join('; ')} a ${u}, each city's own charge; other cities to be found${GST[e.gst] ?? ''}${e.date ? `; read ${date(e.date)}` : ''}`;
  if (!e.rate) return 'Rate to be found';
  if (own.length) throw new Error(`rules-doc: ${e.id} has both a rate and cities' own charges; word them`);
  const base = e.pack ? `${range(e.rate)} for ${e.pack.what ?? 'a pack'} of ${e.pack.qty} ${UNIT[e.pack.unit]}` : `${range(e.rate)} a ${u}`;
  const lab = fixes(e.fix).map((f) => `${f.n > 1 ? `${f.n} × ` : ''}${labourById.get(f.id).name.toLowerCase()} ${range(labourById.get(f.id).rate)}`);
  const kind = e.basis === 'installed' ? ', supplied and fixed' : e.basis === 'product' ? '' : ', material';
  return `${base}${kind}${e.wastage ? `, ${+(e.wastage * 100).toFixed(2)}% wastage` : ''}${lab.length ? `; plus ${lab.join(' and ')}` : ''}${GST[e.gst] ?? ''}${e.date ? `; read ${date(e.date)}` : ''}`;
}
// The tax basis as the source states it; the engine adds GST only to a rate quoted before it.
const GST = { extra: '; plus GST', incl: '; incl. GST', unstated: '; GST not stated: taken as the price paid' };
const cell = (x) => String(x ?? '').replace(/\|/g, '/');
const noteText = (x) => { const r = ref(x.src).trim(); return `${x.text} ${r === 'our rule' ? '(our rule)' : r}${x.status === 'reported' ? ' (as reported)' : ''}`; };
let banded = 0, leveled = 0;
/** The items with no check of their own. A set has no rate of its own, so only its parts are checked against their pages, and the page reads it as checked when every part is (`checkedOn` in engine/architect.ts). */
function unchecked() {
  const un = [...entries.values()].filter((e) => !e.checked);
  const unread = (e) => e.src.some((id) => sources.sources[id]?.unread);
  const shown = (e) => { const d = [e.rate || e.byCity ? e.checked : '', ...(e.parts ?? []).map((p) => shown(entries.get(p.id)))]; return d.includes(undefined) ? undefined : d.filter(Boolean).sort().at(-1); };
  const sets = un.filter((e) => e.parts), single = un.filter((e) => !e.parts);
  if (sets.some((e) => e.rate) || single.some((e) => !e.src.length)) throw new Error('rules-doc: a set has a rate of its own or a single item cites no page; reword "Not checked"');
  const none = sets.filter((e) => !e.src.length);
  return `Not checked: ${un.length} items. ${single.length} are single items: ${single.filter((e) => !unread(e)).length} cite a page that prices another thing or basis, and ${single.filter(unread).length} cite a page that could not be opened. ${sets.length} are sets priced from their parts, so only their parts are checked: ${sets.filter(shown).length} read as checked on the page, since every part is, and ${none.length} cite no page of their own and take their parts' (${none.map((e) => e.id).join(', ')}). So a line says "As reported" for ${[...entries.values()].filter((e) => !shown(e)).length} items.`;
}
const lib = ['# The library', '', 'Generated from `engine/data/library/` by `npm run rules-doc`; edit the data files, not this page.', '',
  `Dated ${date(sources.date)}. ${sources.status}`, '',
  `${entries.size} items in ${files.reduce((t, f) => t + f.families.length, 0)} families, from ${Object.keys(sources.sources).length} sources. The estimate uses the middle of each range. A family's five levels name one item each (${A.levels.map((l) => l.name).join(', ')}); every other item in the family is an alternative you can choose instead. A level is a band of choices (L1): the item it names and every other item usually at it; the estimate's range at a level runs from the cheapest priced choice at it in every line to the dearest.`, '',
  // E2: how much was read on its page, as counts; each source below says which.
  `Checked against their pages: ${[...entries.values()].filter((e) => e.checked).length} of ${entries.size} items, ${Object.values(sources.sources).filter((s) => s.checked).length} sources; ${Object.values(sources.sources).filter((s) => s.unread).length} sources could not be opened.`, '',
  // E4: the items with no check of their own, counted here so a doc quoting them can copy the count (docs/LESSONS.md).
  unchecked(), ''];
const introAt = lib.length - 4;
for (const f of files) {
  lib.push(`## ${f.title}`, '', `Dated ${date(f.date)}; an item read on another day says so.`, '');
  if (f.status) lib.push(f.status, '');
  for (const fam of f.families) {
    const own = f.entries.filter((e) => e.family === fam.id);
    const ladderIds = fam.fixed ? [fam.fixed] : fam.levels ?? [];
    lib.push(`### ${fam.name} (${UNIT[fam.unit]}${fam.kind && fam.kind !== 'fixed' ? `, ${fam.kind}` : ''})`, '');
    const n = notes.families[fam.id];
    if (n) lib.push(...[['What it is', n.what], ['Why it costs what it does', n.cost], ['What to check', n.check]].map(([k, x]) => `- **${k}**: ${noteText(x)}`), '');
    if (fam.fixed || fam.levels) {
      lib.push('| Level | Item | Specification | Brands, as examples | Rate | Sources |', '|---|---|---|---|---|---|');
      if (fam.fixed) { const e = entries.get(fam.fixed); lib.push(`| Every level | ${cell(e.name)} | ${cell(e.spec)} | ${cell((e.brands ?? []).join(', '))} | ${cell(rateText(e))} | ${ref(e.src)} |`); }
      else fam.levels.forEach((id, i) => { const e = id && entries.get(id); lib.push(e ? `| ${A.levels[i].name} | ${cell(e.name)} | ${cell(e.spec)} | ${cell((e.brands ?? []).join(', '))} | ${cell(rateText(e))} | ${ref(e.src)} |` : `| ${A.levels[i].name} | None at this level | | | | |`); });
      lib.push('');
      // The choices at each level (L1): the item the level names and the family's other items usually at it.
      const named = new Set(ladderIds.filter(Boolean)), mine = [...entries.values()].filter((e) => e.family === fam.id || named.has(e.id));
      const band = A.levels.map((l, i) => { const at = fam.fixed ?? fam.levels[i]; return new Set([...(at ? [at] : []), ...mine.filter((e) => e.level === i + 1).map((e) => e.id)]).size; });
      if (Math.max(...band) > 1) { banded++; lib.push(`Choices at each level: ${A.levels.map((l, i) => `${l.name} ${band[i]}`).join(', ')}.`, ''); }
      leveled++;
    }
    const others = own.filter((e) => !ladderIds.includes(e.id));
    if (others.length) {
      lib.push(fam.fixed || fam.levels ? 'Also in the library:' : 'In the library:', '', '| Item | Usual level | Specification | Rate | Sources |', '|---|---|---|---|---|');
      for (const e of others) lib.push(`| ${cell(e.name)} | ${e.level ? A.levels[e.level - 1].name : '—'} | ${cell(e.spec)}${e.note ? ` ${cell(e.note)}` : ''} | ${cell(rateText(e))} | ${ref(e.src)} |`);
      lib.push('');
    }
  }
}
lib[introAt] += ` ${banded} of the ${leveled} families with levels offer more than one choice at a level. ${Object.keys(notes.families).length} families carry notes (T1): what each is, why it costs what it does and what to check, shown behind a line's Why? on the planning estimate.`;
lib.push('## Where to spend, where to save', '', `Dated ${date(notes.date)}. ${notes.status} The planning estimate shows each under its section's Why?.`, '',
  ...notes.spendSave.map((r) => `- **${A.sections.find((x) => x.id === r.section).name}: ${r.way} ${r.on ? `on ${r.on}` : 'here'}.** ${noteText(r)}`), '');
lib.push('## Labour', '', '| Labour | Rate | Sources |', '|---|---|---|', ...labour.labour.map((l) => `| ${l.name} | ${range(l.rate)} a ${UNIT[l.unit]}${l.date ? `; read ${date(l.date)}` : ''} | ${ref(l.src)} |`), '');
lib.push('## Sources', '', ...numbered.map((id, i) => { const s = sources.sources[id]; return `${i + 1}. [${s.what}](${s.url}) (class ${s.class}: ${sources.classes[s.class]})${s.checked ? `. Read on ${date(s.checked)}` : s.unread ? `. Not opened: ${s.unread.replace(/\.$/, '')}` : ''}`; }), '');
const libText = lib.join('\n');

const docs = [[new URL('../docs/RULES.md', import.meta.url), text, 'docs/RULES.md'], [new URL('../docs/LIBRARY.md', import.meta.url), libText, 'docs/LIBRARY.md']];
if (process.argv.includes('--check')) {
  let stale = false;
  for (const [path, body, name] of docs) {
    let current = '';
    try { current = readFileSync(path, 'utf8'); } catch { /* missing counts as out of date */ }
    if (current !== body) { console.error(`${name} is out of date: run npm run rules-doc`); stale = true; } else console.log(`${name} is up to date`);
  }
  if (stale) process.exit(1);
} else {
  for (const [path, body, name] of docs) { writeFileSync(path, body); console.log(`wrote ${name}`); }
}
