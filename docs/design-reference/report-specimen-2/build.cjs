/**
 * SPEC2 (docs/REPORT-REVIEW.md §4, D-DOC-24 to D-DOC-26): the specimen redrawn as the factory would make it, for two
 * fictional cases. It is a drawing, not the product: the rules and pieces here are the shapes LIB1 builds to.
 *  - Every figure is the engine's, read from figures.json (figures.ts); nothing is worked out here but where a mark sits.
 *  - Words come from pieces with named slots: fill() puts the engine's figure in and refuses any other digit (rule 12).
 *    The borrower's own typed words (cases.cjs) print as typed, through typed().
 *  - claim() keeps a sentence only when the figures bear it out; a failed claim prints nothing, or a plain label.
 *  - Each exhibit carries its contract (question, finding as title, unit, period, source, meaning), and a figure is shown
 *    by one exhibit only: a second showing must be a marked reference to the first, or the build stops. The brief and
 *    the annexes' schedules are summaries and records, and point back by reference.
 *  - Marked copies print, beside each block, the rule that chose it and the piece that wrote it; the last pages list
 *    them all (the factory map), and factory-<case>.json holds the same list for LIB1.
 *   node build.cjs <figures.json> <out dir>
 */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const [, , figPath, out] = process.argv;
const ALL = JSON.parse(fs.readFileSync(figPath, 'utf8'));
const { cases: CASES, packs: PACKS } = require('./cases.cjs');
const root = path.resolve(__dirname, '../../..');
const font = (n) => fs.readFileSync(path.join(root, 'site/public/fonts', n)).toString('base64');
const hunt = (o, id) => { if (o && typeof o === 'object') { if (o.id === id) return o; for (const k in o) { const r = hunt(o[k], id); if (r) return r; } } };
const RAT = require(path.join(root, 'engine/data/ratios.json')), REPORT = require(path.join(root, 'engine/data/report.json'));
const LEVEL = { avg: hunt(RAT, 'dscrAverage').fresh, low: hunt(RAT, 'dscrLowest').fresh };
const ASSUMED = (id) => REPORT.assumptions.find((a) => a.id === id);

// Formatting only.
const lk = (v) => (v / 1e5).toFixed(2), lakh = (v) => `₹${lk(v)} lakh`, inr = (v) => '₹' + Math.round(v).toLocaleString('en-IN');
const x2 = (v) => v.toFixed(2), p1 = (v) => v.toFixed(1) + '%', num = (v) => Math.round(v).toLocaleString('en-IN');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const C = { ink: '#0f172a', mut: '#475569', faint: '#64748b', line: '#cbd5e1', hair: '#e2e8f0', teal: '#0d9488', slate: '#334155', amber: '#d97706', red: '#b91c1c' };
const svg = (w, h, b) => `<svg viewBox="0 0 ${w} ${h}" role="img" xmlns="http://www.w3.org/2000/svg">${b}</svg>`;
const T = (x, y, s, o = {}) => `<text x="${x}" y="${y}" font-size="${o.z || 9}"${o.b ? ' font-weight="650"' : ''} text-anchor="${o.a || 'start'}" fill="${o.f || C.ink}">${s}</text>`;
const ln = (x1, y1, x2_, y2, s, w = 1, d = '') => `<line x1="${x1}" y1="${y1}" x2="${x2_}" y2="${y2}" stroke="${s}" stroke-width="${w}"${d ? ` stroke-dasharray="${d}"` : ''} stroke-linecap="round"/>`;

const EV = { engine: 'Engine', paper: 'Paper', quote: 'Quotation', buyer: 'Buyer', word: 'Promoters’ word', pencil: 'Pencil', missing: 'Missing' };
const STATUS = { order: 'Order', letter: 'Letter', trial: 'Trial', enquiry: 'Enquiry' };

/** The rules the drawing uses: when each applies. LIB1 writes them as dated rule files (engine/data/report/rules/). */
const RULES = {
  cover: 'Every report', brief: 'Every report: one page, no verdict on the loan (D-DOC-03)',
  'brief.strength': 'Findings that hold on the engine’s figures, or confirmed facts; three to five, never padded',
  'brief.risk': 'Findings that miss a level or fall short in a scenario, then the register’s first rows; three to five',
  'brief.open': 'Papers still to come and conditions still open', contents: 'Every report',
  'ch.promoters': 'Every report', 'ch.why': 'New unit or expansion', 'ch.products': 'Sales by product; buyers by status',
  'ch.market': 'Every report: competitors and price bands as the promoters list them; no market figure of ours (rule 13)',
  'ch.operating': 'A unit with a capacity (manufacturing or service)', 'ch.site': 'A unit with premises', 'ch.inputs': 'Every report',
  'ch.timetable': 'A loan drawn before sales start', 'ch.cost': 'Every report', 'ch.sales': 'Sales by product (drivers)',
  'ch.profit': 'Every report', 'ch.repay': 'A term loan', 'ch.scenarios': 'A term loan; the cases from the trade’s rule file',
  'ch.risks': 'Every report: rows from the trade pack and the promoters, each tied to an assumption', 'ch.register': 'Every report',
  'ch.close': 'Every report', 'annex.a': 'Every report', 'annex.b': 'A unit with machines', 'annex.c': 'Every report',
};

function build(id, marked) {
  const F = ALL[id], K = CASES[id], PK = PACKS[K.trade], B = F.base, Y = B.years, S = Object.fromEntries(F.scenarios.map((s) => [s.id, s]));
  const part = (n) => F.paper.find((p) => p.name.includes(n));
  const pairsOf = (n) => Object.fromEntries(part(n).blocks.filter((b) => b.kind === 'pairs').flatMap((b) => b.pairs));
  const tableAfter = (n, h) => { const bs = part(n).blocks; const i = bs.findIndex((b) => b.kind === 'heading' && b.text.includes(h)); return (i < 0 ? bs.find((b) => b.kind === 'table') : bs[i + 1]).table; };
  const GL = pairsOf('glance'), BASIS = pairsOf('Basis'), FACTS = pairsOf('Business');
  const terms = GL['Term loan'];
  const [, DRAWN] = /first drawn in ([A-Za-z]+ \d+)/.exec(terms), [, MOR] = /(\d+) months' moratorium/.exec(terms), [, N] = /(\d+) instalments/.exec(terms);
  const low = B.lowest, sorted = [...Y].sort((a, b) => a.dscr - b.dscr), one = K.promoters.length === 1;
  const who = one ? K.promoters[0].name.split(' ')[0] : 'The partners', whoL = one ? who : 'the partners';
  const fingerprint = crypto.createHash('sha256').update(JSON.stringify(F.state)).digest('hex').slice(0, 12);
  const monthName = (ym) => new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1, 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' });

  const SLOT = {
    cost: lakh(B.projectCost), loan: lakh(B.finance.termLoan), promoter: lakh(B.finance.promoter), 'promoter.pct': x2(B.finance.promoterPct) + '%', wc: lakh(B.wcLimit),
    rate: F.state.ratePct + '%', n: N, mor: MOR, drawn: DRAWN, start: monthName(F.state.sellFrom), instalment: inr(B.firstInstalment), idc: inr(B.idc.total ?? B.idc),
    'dscr.avg': x2(B.average), 'dscr.low': x2(low.dscr), 'dscr.low.fy': low.fy, 'level.avg': x2(LEVEL.avg), 'level.low': x2(LEVEL.low),
    'fy.1': Y[0].fy, 'fy.3': Y[2].fy, 'fy.last': Y[Y.length - 1].fy, 'use.1': Y[0].utilisationPct + '%', 'use.3': Y[2].utilisationPct + '%',
    'bep.1': p1(Y[0].bepPct), 'bep.3': p1(Y[2].bepPct), 'pat.1': lakh(Y[0].pat), 'pat.3': lakh(Y[2].pat),
    'irr.project': F.worth.project?.irrPct !== undefined ? p1(F.worth.project.irrPct) : '', 'worth.rate': F.worth.ratePct + '%',
    'down.low': x2(S.down.lowest.dscr), 'down.low.fy': S.down.lowest.fy, 'severe.low': x2(S.severe.lowest.dscr), 'severe.low.fy': S.severe.lowest.fy,
    'down.short': S.down.cashShort ? lakh(S.down.cashShort.need) : '', 'severe.short': S.severe.cashShort ? lakh(S.severe.cashShort.need) : '',
    var: F.state.variablePct + '%', trade: PK.name.toLowerCase(),
  };
  /** Words with slots in, figures out: any digit outside a slot stops the build, unless it numbers a chapter, exhibit, annex or register line. */
  const fill = (s) => {
    const bare = s.replace(/\{[a-z0-9.-]+\}/g, '').replace(/\b(?:chapters?|exhibits?|annex|statements?|page) [A-C]?\.?\d+(?:\.\d+)?(?:(?:, | and | to )\d+)*/gi, '').replace(/\b[A-C]\.?\d+\b/g, '').replace(/\bLIB\d\b/g, '').replace(/<[^>]+>/g, '');
    if (/\d/.test(bare)) throw new Error(`${id}: a figure outside a slot: ${bare}`);
    return s.replace(/\{([a-z0-9.-]+)\}/g, (m, k) => { if (!(k in SLOT) || SLOT[k] === '') throw new Error(`${id}: no such slot: ${k}`); return `<span class="slot">${SLOT[k]}</span>`; });
  };
  /** A finding: printed only when the engine's figures bear it out. */
  const claim = (ok, s, fallback = '') => (ok ? fill(s) : fallback);
  const typed = (s) => `<span class="typed">${esc(s)}</span>`;
  const ev = (k, extra) => `<span class="ev ev-${k}">${EV[k]}${extra ? ` · ${esc(extra)}` : ''}</span>`;

  // The factory's marks: the rule that chose a block and the piece that wrote it.
  const used = [];
  const M = (rule, piece, html, cls = '') => {
    if (!RULES[rule] && !rule.startsWith('pack.')) throw new Error('No such rule: ' + rule);
    used.push({ rule, piece });
    return `<div class="pc ${cls}" data-m="${rule}&#10;${piece}">${html}</div>`;
  };
  const P = (rule, piece, html) => M(rule, piece, `<p>${html}</p>`);

  // One figure, one exhibit: fg() registers a figure to the exhibit drawing it; ref() points back to one already shown.
  const shown = new Map(); let curEx = null;
  const fg = (k, v) => { if (curEx !== null) { if (shown.has(k) && shown.get(k) !== curEx) throw new Error(`${id}: ${k} shown in exhibits ${shown.get(k)} and ${curEx}`); shown.set(k, curEx); } return v; };
  const ref = (k, v) => { if (!shown.has(k)) throw new Error(`${id}: a reference to ${k}, which no exhibit shows`); return `<span class="ref">${v}<sup>${shown.get(k)}</sup></span>`; };
  let exNo = 0; const exKey = {};
  const exhibit = (rule, piece, c, body) => {
    exNo += 1; curEx = exNo; exKey[piece.replace(/^exhibit\.| v\d+$/g, '')] = exNo; const b = body(); curEx = null;
    return M(rule, piece, `<figure class="ex"><div class="no">Exhibit ${exNo}</div><h3>${c.finding}</h3><div class="sub"><b>Question</b> ${c.question} · ${c.unit} · ${c.period}</div>${b}<div class="src"><b>Source</b> ${c.source}${c.meaning ? ` <span class="sep">·</span> <b>What it means</b> ${c.meaning}` : ''}</div></figure>`);
  };
  const exNoNext = () => exNo + 1;

  // Pages, and the chapters' places for the contents.
  const pages = [], toc = [];
  const page = (section, body, cls = '') => { pages.push({ section, body, cls }); };
  const chap = (no, title, lede) => { toc.push([String(no), title, pages.length + 1]); return `<div class="kick">Chapter ${no}</div><h2 class="act">${title}</h2>${lede ? `<p class="lede">${lede}</p>` : ''}`; };
  const sub = (no, title) => { toc.push([String(no), title, pages.length + 1]); return `<div class="kick" style="margin-top:7mm">Chapter ${no}</div><h2 class="act sm">${title}</h2>`; };
  const facts = (rule, piece, rows) => M(rule, piece, `<table class="fx">${rows.map(([k, v, e, x]) => `<tr><td>${esc(k)}</td><td>${typed(v)}</td><td>${ev(e, x)}</td></tr>`).join('')}</table>`);

  // ---------------- The body, built first, so the brief and the contents can point into it ----------------
  // 1. Promoters and the enterprise
  page('Promoters and the enterprise', chap(1, one ? 'The proprietor and the enterprise' : 'The promoters and the enterprise', fill(`Who will run the unit, what they bring, and what the enterprise already holds`)) +
    `<div class="people">${K.promoters.map((p) => M('ch.promoters', 'fact.promoter v1', `<div class="person"><div class="nm">${esc(p.name)}</div><div class="rl">${esc(p.role)}</div><p>${typed(p.past)} ${ev(p.ev)}</p><p><b>Brings.</b> ${typed(p.brings)} ${ev('word')}</p></div>`)).join('')}</div>` +
    P('ch.promoters', 'promoters.share v1', fill(`${one ? 'The proprietor brings' : 'Together the partners bring'} {promoter}, {promoter.pct} of the project’s cost; the rest is the term loan (Exhibit @@sources-uses@@).`) + ' ' + ev('engine')) +
    `<div class="kick" style="margin-top:6mm">The enterprise</div>` + facts('ch.promoters', 'table.enterprise v1', K.enterprise) +
    P('ch.promoters', 'fact.privacy v1', fill('Registration numbers, PAN and GSTIN are on the papers in Annex C and are not printed in the report.')));

  // 2. Why, 3. Products and customers
  page('Why this project · Products and customers', chap(2, 'Why this project, here, now') +
    K.why.map(([h, t, e]) => M('ch.why', `why.${h.split(' ')[1]} v1`, `<p><b>${h}.</b> ${typed(t)} ${ev(e)}</p>`)).join('') +
    sub(3, 'Products and customers') +
    M('ch.products', 'table.products v1', `<table class="fx">${F.state.products.map((p) => `<tr><td>${esc(p.name)}</td><td>${typed('Sold by the ' + (p.unit || 'piece'))}</td><td>${ev('word')}</td></tr>`).join('')}</table>`) +
    exhibit('ch.products', 'exhibit.buyers v1', {
      finding: claim(K.buyers.some((b) => b.status === 'order' || b.status === 'letter'), `${K.buyers.filter((b) => b.status === 'order' || b.status === 'letter').length === 1 ? 'One buyer has' : 'Buyers have'} put ${one ? 'their' : 'their'} interest in writing; the rest are at trial or enquiry`, 'Who has said they will buy'),
      question: 'Who has said they will buy, and how firmly?', unit: 'Buyers as the promoters name them', period: `As at ${K.date}`, source: 'The promoters; the written ones are in Annex C', meaning: 'An order or a letter is evidence; a trial or an enquiry is a lead, not a sale',
    }, () => `<table class="reg"><tr><th>Buyer</th><th>Status</th><th>Dated</th><th>What they said</th></tr>${K.buyers.map((b) => `<tr><td>${esc(b.who)}</td><td><span class="st st-${b.status}">${STATUS[b.status]}</span></td><td>${typed(b.date)}</td><td>${typed(b.note)}</td></tr>`).join('')}</table>`));

  // 4. Market and competition
  page('Market and competition', chap(4, 'Market and competition', 'What buyers pay today, and where these products sit') +
    exhibit('ch.market', 'exhibit.competitors v1', {
      finding: 'The products are priced between loose local supply and established names', question: 'Who else sells to these buyers, and at what price?', unit: 'Price bands as the promoters list them', period: `As at ${K.date}`,
      source: 'The promoters’ own survey; not independently verified', meaning: 'The price in Exhibit @@sales-build@@ sits inside the band buyers already pay',
    }, () => `<table class="reg"><tr><th>Who sells today</th><th>Price band</th><th>Note</th></tr>${K.competitors.map(([w, b, n]) => `<tr><td>${esc(w)}</td><td>${typed(b)}</td><td>${typed(n)}</td></tr>`).join('')}</table>`) +
    M('ch.market', 'market.reading v1', `<p>${typed(K.market)} ${ev('word')}</p>`) +
    M(`pack.${K.trade}`, `pack.${K.trade}.buyers v1`, `<p><b>How such units usually sell.</b> ${fill(PK.buyers)} <span class="ev ev-pack">Trade pack · source to come (LIB2)</span></p>`) +
    P('ch.market', 'market.limit v1', fill('No market size or growth figure is given: the report carries none it cannot source (rule thirteen of how FinSight works). A lender who wants one will find the buyers’ papers in Annex C.')));

  // 5. Operating plan, 6. Site and services
  page('Operating plan · Site and services', chap(5, 'The operating plan', 'How much the unit can make, and what sets the pace') +
    exhibit('ch.operating', 'exhibit.capacity v1', {
      finding: 'One line sets the capacity; its slowest machine sets the day', question: 'How much can the unit make at full running?', unit: 'Units a month at full running', period: 'From the first year of sales',
      source: 'The promoters, on the maker’s quotation', meaning: 'Exhibit @@sales-build@@ sells a share of this, rising year by year',
    }, () => `<table class="reg"><tr><th>Product</th><th class="r">At full running, a month</th></tr>${F.state.products.map((p, i) => `<tr><td>${esc(p.name)}</td><td class="r">${fg(`cap.${i}`, `${p.units} ${p.unit}`)}</td></tr>`).join('')}</table>`) +
    facts('ch.operating', 'table.operating v1', K.ops) +
    M(`pack.${K.trade}`, `pack.${K.trade}.usual v1`, `<p><b>How such units usually run.</b> ${fill(PK.usual)} <span class="ev ev-pack">Trade pack · source to come (LIB2)</span></p>`) +
    sub(6, 'Site and services') + facts('ch.site', 'table.site v1', K.site));

  // 7. Inputs and people, 8. Timetable
  page('Inputs and people · Timetable', chap(7, 'Inputs, suppliers and people') + facts('ch.inputs', 'table.inputs v1', K.inputs) +
    `<div class="kick" style="margin-top:5mm">People</div>` + facts('ch.inputs', 'table.people v1', K.people) +
    sub(8, 'The timetable') +
    exhibit('ch.timetable', 'exhibit.timetable v1', {
      finding: fill(`From the first draw of the loan to the first sale takes {mor} months`), question: 'When is the money drawn, and when does the unit start earning?', unit: 'Months', period: `${DRAWN} to ${monthName(F.state.sellFrom)}`,
      source: 'The loan’s dates from the engine; the steps between, the promoters’', meaning: fill(`Interest before the first sale, {idc}, is part of the cost (Exhibit @@sources-uses@@)`),
    }, () => `<div class="time">${[[DRAWN, 'Loan first drawn', 'engine'], ...K.timetable.map(([w, t]) => [w, t, 'word']), [monthName(F.state.sellFrom), 'First sales; instalments begin', 'engine']].map(([w, t, e]) => `<div class="${e}"><em>${esc(w)}</em>${esc(t)}<span>${ev(e)}</span></div>`).join('')}</div>`));

  // 9. Cost and means of finance
  const costEv = (cid) => K.costEv[cid] || ['engine', 'Worked out by the engine'];
  page('Cost and means of finance', chap(9, 'Cost of the project and means of finance', 'What the money buys, and where it comes from') +
    exhibit('ch.cost', 'exhibit.sources-uses v1', {
      finding: fill(`The term loan meets the cost the promoters do not, and the promoters bring {promoter.pct}`), question: 'How much money is needed, where does it go, and who puts it in?', unit: '₹ lakh', period: 'Before the first sale',
      source: 'The engine, on the costs as quoted; each line’s paper beside it', meaning: 'Every line is backed by a paper or worked out by the engine; none is pencil',
    }, () => `<div class="two cost"><table class="reg"><tr><th>What the money buys</th><th class="r">₹ lakh</th><th>Evidence</th></tr>${B.cost.map((c) => `<tr><td>${esc(c.label)}</td><td class="r">${fg(`cost.${c.id}`, lk(c.amount))}</td><td>${ev(...costEv(c.id))}</td></tr>`).join('')}<tr class="tot"><td>Cost of the project</td><td class="r">${fg('cost.total', lk(B.projectCost))}</td><td></td></tr></table>
<table class="reg"><tr><th>Where it comes from</th><th class="r">₹ lakh</th><th>Evidence</th></tr><tr><td>${one ? 'The proprietor' : 'The promoters'}</td><td class="r">${fg('fin.promoter', lk(B.finance.promoter))}</td><td>${ev('word', 'bank statements to come')}</td></tr><tr><td>Term loan asked</td><td class="r">${fg('fin.tl', lk(B.finance.termLoan))}</td><td>${ev('engine')}</td></tr><tr class="tot"><td>Means of finance</td><td class="r">${fg('fin.total', lk(B.finance.total))}</td><td></td></tr>
<tr><td colspan="3" class="gap"></td></tr><tr><td>Working-capital limit asked, alongside</td><td class="r">${fg('wc', lk(B.wcLimit))}</td><td>${ev('engine')}</td></tr></table></div>`) +
    P('ch.cost', 'cost.reading v1', fill(`The loan is drawn in {drawn} and repaid in {n} monthly instalments of {instalment} from {start}, at {rate} a year. Interest in the {mor} months before the first sale is paid by ${whoL} and counted in the cost. The working-capital limit is sized by the engine on the stock, debtors and creditors in the register (Chapter 15).`) + ' ' + ev('engine')));

  // 10. Sales build-up
  const yrs = Y.map((y) => `<th class="r">${y.fy}</th>`).join('');
  page('Sales build-up', chap(10, 'The sales build-up', 'Sales from units and price, product by product, and the share of capacity each year needs') +
    exhibit('ch.sales', 'exhibit.sales-build v1', {
      finding: fill(`The first year needs {use.1} of capacity, rising to {use.3} by the third`), question: 'How much must be sold, of what, at what price, to reach the sales in the plan?', unit: 'Units; ₹ a unit; ₹ lakh', period: `${Y[0].fy} to ${Y[Y.length - 1].fy}`,
      source: 'The engine, on the capacity in Exhibit @@capacity@@, the prices and the use of the capacity in the register', meaning: 'The first year rests on the buyers in Exhibit @@buyers@@; the later years on new ones',
    }, () => `<table class="five"><tr><th></th>${yrs}</tr><tr class="ratio"><td>Use of the capacity</td>${Y.map((y) => `<td>${fg(`use.${y.fy}`, y.utilisationPct + '%')}</td>`).join('')}</tr>${F.state.products.map((p, i) => `<tr class="hd"><td colspan="${Y.length + 1}">${esc(p.name)}</td></tr><tr><td>Sold, ${p.unit}</td>${Y.map((y) => `<td>${fg(`units.${i}.${y.fy}`, num(y.products[i].units))}</td>`).join('')}</tr><tr><td>Price, ₹ a ${p.unit}</td>${Y.map((y) => `<td>${fg(`price.${i}.${y.fy}`, num(y.products[i].price))}</td>`).join('')}</tr><tr><td>Sales, ₹ lakh</td>${Y.map((y) => `<td>${fg(`sales.${i}.${y.fy}`, lk(y.products[i].sales))}</td>`).join('')}</tr>`).join('')}<tr class="tot"><td>Sales, ₹ lakh</td>${Y.map((y) => `<td>${fg(`sales.${y.fy}`, lk(y.sales))}</td>`).join('')}</tr></table>`) +
    P('ch.sales', 'sales.note v1', fill(`The use of the capacity is the stated assumption until a figure of the ${one ? 'proprietor’s' : 'partners’'} own replaces it: ${esc(ASSUMED('utilisation').why.toLowerCase())}. Prices are held flat over the years.`) + ' ' + ev('pencil', 'register A3')));

  // 11. Costs and earnings
  const reading = B.lowest.dscr < 1 ? 'short' : B.lowest.dscr >= LEVEL.low && B.average >= LEVEL.avg ? 'comfortable' : 'tight';
  page('Costs and earnings', chap(11, 'Costs and earnings', 'What the sales cost, what they earn before the loan, and where the unit breaks even') +
    exhibit('ch.profit', 'exhibit.costs v1', {
      finding: claim(Y[2].bepPct < Y[0].bepPct, `Break-even falls from {bep.1} of sales in the first year to {bep.3} by the third`, 'Costs, earnings and break-even, year by year'),
      question: 'How much of each year’s sales goes in costs, and how far can sales fall before a loss?', unit: '₹ lakh; % of sales', period: `${Y[0].fy} to ${Y[Y.length - 1].fy}`,
      source: 'The engine, on the costs in the register', meaning: claim(Y[0].bepPct > 100, 'The first year’s sales do not cover its costs: a loss to be met by the promoters’ money', 'The margin of safety grows as the unit fills'),
    }, () => `<table class="five"><tr><th></th>${yrs}</tr><tr><td>Materials and other variable costs</td>${Y.map((y) => `<td>${fg(`var.${y.fy}`, lk(y.variable))}</td>`).join('')}</tr><tr><td>Fixed costs</td>${Y.map((y) => `<td>${fg(`fixed.${y.fy}`, lk(y.fixed))}</td>`).join('')}</tr><tr class="tot"><td>Earnings before interest, depreciation and tax</td>${Y.map((y) => `<td>${fg(`pbdit.${y.fy}`, lk(y.pbdit))}</td>`).join('')}</tr><tr><td>Interest on the working-capital limit</td>${Y.map((y) => `<td>${fg(`wci.${y.fy}`, lk(y.wcInterest))}</td>`).join('')}</tr><tr><td>Tax</td>${Y.map((y) => `<td>${fg(`tax.${y.fy}`, lk(y.tax))}</td>`).join('')}</tr><tr class="ratio"><td>Break-even, % of sales</td>${Y.map((y) => `<td>${fg(`bep.${y.fy}`, p1(y.bepPct))}</td>`).join('')}</tr><tr><td>Cash break-even, % of sales</td>${Y.map((y) => `<td>${fg(`cbep.${y.fy}`, p1(y.cashBepPct))}</td>`).join('')}</tr></table>`) +
    P('ch.profit', 'profit.where v1', fill('Profit after tax, depreciation and the term loan’s interest are in Exhibit @@dscr@@, where they start the working of what pays the loan.')) +
    (SLOT['irr.project'] ? P('ch.profit', 'worth.reading v1', fill(`Discounted at the loan’s rate, {worth.rate}, the project returns {irr.project} a year on its cost over the years of the loan (Annex A, statement A.5).`) + ' ' + ev('engine')) : ''));

  // 12. What cash pays the debt
  const READINGS = {
    comfortable: 'In every year the cash the unit earns for the loan covers the payment due at least {dscr.low} times, above the {level.low} lenders usually look for in any one year; over the loan it covers it {dscr.avg} times, against the usual {level.avg}.',
    tight: 'The cover is tightest in {dscr.low.fy}, at {dscr.low} times: enough to pay, but below the {level.low} lenders usually look for in any one year. Over the loan it is {dscr.avg} times, against the usual {level.avg}. The first year is where a lender will look hardest, and Chapter 13 shows what happens if it goes worse.',
    short: 'In {dscr.low.fy} the cash the unit earns does not cover the payment due: it covers it {dscr.low} times. The shortfall must come from the promoters, or the loan’s size or term must change before it is asked for.',
  };
  page('What cash pays the debt', chap(12, 'What cash pays the debt', 'The years in order of cover, the tightest first') +
    exhibit('ch.repay', 'exhibit.dscr v1', {
      finding: fill(`The tightest year is {dscr.low.fy}, covered {dscr.low} times`), question: 'What cash pays the instalments, and how much room is left in each year?', unit: '₹ lakh; times', period: 'The years of the loan, tightest first',
      source: 'The engine; the usual levels from FinSight’s ratio rules, with their sources', meaning: { comfortable: 'Room in every year', tight: 'The first year is thin; the later years carry room', short: 'A year the unit cannot pay from its own cash' }[reading],
    }, () => `<table class="five"><tr><th></th>${sorted.map((y) => `<th class="r">${y.fy}${y.fy === low.fy ? '<br><span class="tight">tightest</span>' : ''}</th>`).join('')}<th class="r">Over the loan</th></tr>
<tr><td>Profit after tax</td>${sorted.map((y) => `<td>${fg(`pat.${y.fy}`, lk(y.pat))}</td>`).join('')}<td></td></tr><tr><td>add Depreciation</td>${sorted.map((y) => `<td>${fg(`dep.${y.fy}`, lk(y.depreciation))}</td>`).join('')}<td></td></tr><tr><td>add Interest on the term loan</td>${sorted.map((y) => `<td>${fg(`tli.${y.fy}`, lk(y.tlInterest))}</td>`).join('')}<td></td></tr>
<tr class="tot"><td>Cash for the loan</td>${sorted.map((y) => `<td>${fg(`avail.${y.fy}`, lk(y.available))}</td>`).join('')}<td></td></tr><tr><td>Interest on the term loan</td>${sorted.map((y) => `<td>${ref(`tli.${y.fy}`, lk(y.tlInterest))}</td>`).join('')}<td></td></tr><tr><td>Instalments of the loan</td>${sorted.map((y) => `<td>${fg(`prin.${y.fy}`, lk(y.principal))}</td>`).join('')}<td></td></tr>
<tr class="tot"><td>Payment due</td>${sorted.map((y) => `<td>${fg(`due.${y.fy}`, lk(y.service))}</td>`).join('')}<td></td></tr><tr class="ratio"><td>DSCR, times</td>${sorted.map((y) => `<td>${fg(`dscr.${y.fy}`, x2(y.dscr))}</td>`).join('')}<td>${fg('dscr.avg', x2(B.average))}</td></tr></table>`) +
    M('ch.repay', `reading.dscr.${reading} v1`, `<div class="reading"><div class="kick">The reading · one of three</div><p>${fill(READINGS[reading])} ${ev('engine')}</p></div>`) +
    P('ch.repay', 'reading.dscr.how v1', fill('The cover is the year’s cash for the loan divided by its payment due. It is a reading of the projections, not an opinion on the loan: the lender decides.')));

  // 13. Scenarios
  const scRows = F.scenarios.map((s) => {
    const sc = K.scenarios.find((c) => c.id === s.id), base = s.id === 'base';
    const lowC = base ? ref(`dscr.${s.lowest.fy}`, x2(s.lowest.dscr)) : fg(`sc.${s.id}.low`, x2(s.lowest.dscr));
    const avgC = base ? ref('dscr.avg', x2(s.average)) : fg(`sc.${s.id}.avg`, x2(s.average));
    const short = s.cashShort ? `<span class="neg">${fg(`sc.${s.id}.short`, lk(s.cashShort.need))} short</span><br><small>first in ${s.cashShort.first}</small>` : `None; lowest year end ${fg(`sc.${s.id}.cash`, lk(s.lowestCash))}`;
    return `<tr class="${base ? 'base' : ''}"><td><b>${s.label}</b><br><small>${esc(sc.why)}</small></td><td class="r">${avgC}</td><td class="r">${lowC}<br><small>${s.lowest.fy}</small></td><td class="r">${short}</td><td>${base ? '—' : typed(K.respond[s.id])} ${base ? '' : ev('word')}</td></tr>`;
  }).join('');
  page('If things go worse', chap(13, 'If things go worse', 'Three cases, each worked again whole by the engine') +
    exhibit('ch.scenarios', 'exhibit.scenarios v1', {
      finding: claim(!S.severe.cashShort, 'Even in the severe-but-plausible case, cash stays above nil in every year', claim(!S.down.cashShort, 'The downside holds; the severe case runs short of cash', 'The downside already runs short of cash; the severe case needs the loan changed')),
      question: 'What happens to the cover and the cash if the plan goes worse, and what would the promoters do?', unit: 'Times; ₹ lakh', period: 'The years of the loan',
      source: 'The engine, each case a whole recomputation; the sizes of the cases are pencil (register A13)', meaning: 'A case that runs short names the money the promoters must find',
    }, () => `<table class="reg sc"><tr><th>Case and why</th><th class="r">Average DSCR</th><th class="r">Lowest DSCR</th><th class="r">Cash short, ₹ lakh</th><th>What the promoters would do</th></tr>${scRows}</table>`) +
    P('ch.scenarios', 'scenarios.how v1', fill('Each case moves the inputs it names at once and nothing else; the engine works the whole report again, so the cover, the tax, the working capital and the cash all follow. Values in grey point back to the exhibit that shows them.')));

  // 14. Risks
  page('Risks', chap(14, 'Risks and what is done about them', 'Each risk tied to the assumption it threatens and the case that tests it') +
    exhibit('ch.risks', 'exhibit.risk-register v1', {
      finding: `${K.risks.length} risks, each with an early sign, a response and an owner`.replace(/^\d+/, ['None', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven'][K.risks.length]), question: 'What can go wrong, how would it show, and who acts?', unit: 'Words', period: 'Over the loan',
      source: 'The trade pack’s usual risks, confirmed and added to by the promoters', meaning: 'A risk no case tests is named as such',
    }, () => `<table class="reg risk"><tr><th>Risk</th><th>Threatens</th><th>Early sign</th><th>Response</th><th>Owner</th><th>Tested by</th></tr>${K.risks.map((r) => `<tr><td><b>${esc(r.risk)}</b></td><td>${esc(r.threatens)}</td><td>${typed(r.sign)}</td><td>${typed(r.response)}</td><td>${esc(r.owner)}</td><td>${esc(r.scenario)}</td></tr>`).join('')}</table>`));

  // 15. Assumption and evidence register
  const regRows = [
    ['A1', 'When sales start', monthName(F.state.sellFrom), 'word', 'The promoters’ plan; the loan’s holiday matches it'],
    ['A2', 'What is sold, at full running', `Exhibit ${shown.get('cap.0')}`, 'quote', 'On the maker’s quotation'],
    ['A3', 'Use of the capacity', `Exhibit ${shown.get(`use.${Y[0].fy}`)}`, 'pencil', ASSUMED('utilisation').why],
    ['A4', 'Prices', `Exhibit ${shown.get(`price.0.${Y[0].fy}`)}`, 'word', 'Inside the bands buyers pay (Exhibit @@competitors@@)'],
    ['A5', 'Materials and other variable costs', BASIS['Materials and other variable costs'], 'word', 'From the promoters’ buying; not yet on quotations'],
    ['A6', 'Fixed costs', BASIS['Fixed costs in a full first year'], 'word', 'Staff, rent, power’s fixed part, upkeep'],
    ['A7', 'Stock, debtors and creditors', BASIS['Stock, debtors and creditors'] + ' days', 'pencil', ASSUMED('days').why || 'The stated assumption'],
    ['A8', 'The working-capital limit', ASSUMED('wcUsed').shown, 'pencil', ASSUMED('wcUsed').why],
    ['A9', 'Interest rate', SLOT.rate + ' a year', 'word', 'As the lender indicated; the sanction letter decides'],
    ['A10', 'Drawings', ASSUMED('drawings').shown, 'pencil', ASSUMED('drawings').why],
    ['A11', 'Tax', ASSUMED('tax').shown, 'engine', 'At the rates in FinSight’s tax rules, for a ' + (FACTS.Constitution || F.state.borrower).toLowerCase()],
    ['A12', 'Building and machines', 'Exhibit ' + shown.get('cost.machinery'), 'quote', 'Dated quotations, Annex C'],
    ['A13', 'The cases in Chapter 13', 'Exhibit ' + shown.get('sc.down.avg'), 'pencil', 'Sizes chosen for the trade; LIB1 moves them to a dated rule file'],
  ];
  page('Assumption and evidence register', chap(15, 'The assumption and evidence register', 'Every assumption the figures rest on, its value, and what backs it') +
    M('ch.register', 'table.register v1', `<table class="reg regi"><tr><th></th><th>Assumption</th><th>Value</th><th>Evidence</th><th>Basis</th></tr>${regRows.map(([n, a, v, e, b]) => `<tr><td class="rn">${n}</td><td>${a}</td><td>${esc(v)}</td><td>${ev(e)}</td><td>${esc(b)}</td></tr>`).join('')}</table>`) +
    M('ch.register', 'legend.evidence v1', `<div class="legend">${Object.keys(EV).map((k) => `${ev(k)} ${{ engine: 'worked out by FinSight’s engine', paper: 'a dated paper, in Annex C', quote: 'a dated quotation', buyer: 'a buyer’s order, letter, trial or enquiry', word: 'the promoters’ statement, not yet on paper', pencil: 'a stated assumption, with its reason', missing: 'still to come' }[k]}`).join('<br>')}</div>`));

  // 16. Conclusion, conditions, declaration
  page('Conclusion and declaration', chap(16, 'Conclusion, conditions and declaration') +
    P('ch.close', `close.${reading} v1`, fill({
      comfortable: `${one ? 'The proprietor asks' : 'The partners ask'} a term loan of {loan} and a working-capital limit of {wc} for a {cost} project. On the basis in Chapter 15 the cash the unit earns covers the loan in every year, and the cases in Chapter 13 show how much room there is.`,
      tight: `${one ? 'The proprietor asks' : 'The partners ask'} a term loan of {loan} and a working-capital limit of {wc} for a {cost} project. On the basis in Chapter 15 the loan is paid in every year, with the least room in {dscr.low.fy}; Chapter 13 shows the money ${whoL} would need to find if the plan goes worse.`,
      short: `${one ? 'The proprietor asks' : 'The partners ask'} a term loan of {loan} for a {cost} project. On the basis in Chapter 15 the cash falls short of the payment in {dscr.low.fy}; the report shows where, and by how much.`,
    }[reading])) +
    exhibit('ch.close', 'exhibit.conditions v1', {
      finding: 'What is still open before the loan can be sanctioned', question: 'What remains to be done, by whom, and by when?', unit: 'Items', period: `As at ${K.date}`, source: 'The papers to come in Annex C and the register’s open items', meaning: 'Each item is the borrower’s to close; none changes a figure unless its paper differs',
    }, () => `<table class="reg"><tr><th>Open item</th><th>Who</th><th>By when</th></tr>${K.conditions.map(([w, o, b]) => `<tr><td>${esc(w)}</td><td>${esc(o)}</td><td>${esc(b)}</td></tr>`).join('')}</table>`) +
    `<div class="two" style="margin-top:4mm">${M('ch.close', 'is-and-is-not v1', `<div><div class="kick">What this report is</div><p>${fill(`The ${one ? 'proprietor’s' : 'promoters’'} own project report, prepared with FinSight. Every figure is worked out by FinSight’s engine from the facts given; every word is chosen from FinSight’s library by rules on those facts and confirmed by the ${one ? 'proprietor' : 'promoters'}.`)}</p><div class="kick">What it is not</div><p>${fill('Not an opinion on the loan, a valuation, an audit or an independent study of the project’s viability. Facts marked as the promoters’ word or pencil are not verified by FinSight.')}</p></div>`)}
${M('ch.close', 'declaration v1', `<div><div class="kick">Declaration</div><p>${fill(`${one ? 'I declare' : 'We declare'} that the facts in this report are true to the best of ${one ? 'my' : 'our'} knowledge, that the papers in Annex C are true copies, and that ${one ? 'I' : 'we'} will tell the lender of any change before sanction.`)}</p><div class="sign">${K.promoters.map((p) => `<div><span class="for">${esc(p.name)}</span></div>`).join('')}<div class="pl">Place and date ____________________</div></div></div>`)}</div>`);

  // ---------------- The annexes ----------------
  const stTable = (T0) => `<table class="st"><tr>${T0.columns.map((c) => `<th>${c.label}</th>`).join('')}</tr>${T0.rows.map((r) => r.kind === 'head' ? `<tr class="hd"><td colspan="${T0.columns.length}">${r.cells[0].text}</td></tr>` : `<tr class="${r.kind === 'total' ? 'tot' : r.kind === 'ratio' ? 'ratio' : ''}">${r.cells.map((c) => `<td>${c.text}</td>`).join('')}</tr>`).join('')}</table>`;
  const sched = (no, title, T0) => `<figure class="ex sched"><div class="no">Statement ${no}</div><h3>${title}</h3><div class="sub">In rupees; the engine’s, as worked</div>${stTable(T0)}</figure>`;
  const annexHead = (l, t, lede) => { toc.push([l, t, pages.length + 1]); return `<div class="kick">Annex ${l}</div><h2 class="act">${t}</h2>${lede ? `<p class="lede">${lede}</p>` : ''}`; };
  page('Annex A · Financial schedules', annexHead('A', 'Financial schedules', 'The full record behind Chapters 9 to 13, in rupees. Schedules repeat the chapters’ figures by design: they are the record, not an exhibit.') +
    M('annex.a', 'schedule.sales-pl v1', sched('A.1', 'Sales by product', tableAfter('Statements', '5.1')) + sched('A.2', 'Projected profit and loss', tableAfter('Statements', '5.2'))), 'stp');
  page('Annex A · Financial schedules', M('annex.a', 'schedule.bs-cf v1', sched('A.3', 'Projected balance sheet, at each year end', tableAfter('Statements', '5.3')) + sched('A.4', 'Projected cash flow', tableAfter('Statements', '5.4'))), 'stp');
  page('Annex A · Financial schedules', M('annex.a', 'schedule.ratios v1', sched('A.5', 'The project’s worth, discounted', tableAfter('DSCR', '6.5')) + sched('A.6', 'Key ratios', tableAfter('DSCR', '6.3')) + sched('A.7', 'Working capital', tableAfter('DSCR', '6.4'))), 'stp');
  page('Annex A · Financial schedules', M('annex.a', 'schedule.dscr-repay v1', sched('A.8', 'Debt service coverage, as the lender works it', tableAfter('DSCR', '6.1')) + sched('A.9', 'Break-even', tableAfter('DSCR', '6.2')) + sched('A.10', 'Repayment of the term loan', tableAfter('Repayment', ''))), 'stp');
  page('Annex B · Technical schedules', annexHead('B', 'Technical schedules', 'The machines and the process, as quoted and as such units usually run') +
    M('annex.b', 'schedule.machines v1', `<table class="reg"><tr><th>Item</th><th>What it does</th><th>Paper</th></tr>${K.machines.map(([a, b, c]) => `<tr><td><b>${esc(a)}</b></td><td>${esc(b)}</td><td>${typed(c)}</td></tr>`).join('')}</table>`) +
    M(`pack.${K.trade}`, `pack.${K.trade}.process v1`, `<div class="kick" style="margin-top:7mm">The process, as such units usually run it <span class="ev ev-pack">Trade pack · source to come (LIB2)</span></div><div class="proc">${PK.process.map(([h, t], i) => `<div><i>${['One', 'Two', 'Three', 'Four', 'Five', 'Six'][i]}</i><b>${h}</b><span>${t}</span></div>`).join('')}</div>`) +
    P('annex.b', 'process.confirm v1', fill(`${one ? 'The proprietor has' : 'The promoters have'} confirmed that the unit will run this way; a step they change is shown as theirs.`) + ' ' + ev('word')));
  page('Annex C · Evidence pack', annexHead('C', 'Evidence pack', 'Every paper the report relies on, with its date; what is still to come') +
    M('annex.c', 'table.papers v1', `<table class="reg"><tr><th></th><th>Paper</th><th>Dated</th><th>Status</th></tr>${K.papers.map(([w, d, s], i) => `<tr><td class="rn">C${i + 1}</td><td>${esc(w)}</td><td>${typed(d)}</td><td><span class="st ${s === 'held' ? 'st-letter' : 'st-enquiry'}">${s === 'held' ? 'Held' : 'To come'}</span></td></tr>`).join('')}</table>`) +
    M('annex.c', 'photos v1', `<div class="kick" style="margin-top:7mm">Photographs the borrower adds</div><div class="photos">${K.photos.map((p) => `<div class="photo"><b>${esc(p)}</b><span>Added on the device; none yet in this specimen</span></div>`).join('')}</div>`));

  // ---------------- The brief, the contents and the cover, now that the body exists ----------------
  const writtenBuyers = K.buyers.filter((b) => b.status === 'order' || b.status === 'letter');
  const strengths = [
    claim(low.dscr >= LEVEL.low, `The cash the unit earns covers the loan’s payment at least {dscr.low} times in every year, above the usual {level.low}.`) && [fill(`The cash the unit earns covers the loan’s payment at least {dscr.low} times in every year, above the usual {level.low}.`), 'engine', 12],
    !S.severe.cashShort && [fill('Even in the severe-but-plausible case, cash stays above nil in every year.'), 'engine', 13],
    writtenBuyers.length > 0 && [`${writtenBuyers.length === 1 ? 'One buyer has' : ['', '', 'Two', 'Three', 'Four'][writtenBuyers.length] + ' buyers have'} put their interest in writing: ${writtenBuyers.map((b) => typed(b.who.replace(/^./, (c) => c.toLowerCase()))).join(' and ')}.`, 'buyer', 3],
    [`${one ? 'The proprietor knows' : 'Both partners know'} the trade: ${typed(K.promoters[0].past.replace(/\.$/, '').replace(/^./, (c) => c.toLowerCase()))}.`, 'word', 1],
    claim(Y[2].bepPct < Y[0].bepPct && Y[0].bepPct <= 100, 'Break-even falls from {bep.1} of sales in the first year to {bep.3} by the third.') && [fill('Break-even falls from {bep.1} of sales in the first year to {bep.3} by the third.'), 'engine', 11],
    ['The machines are priced on a dated quotation.', 'quote', 9],
  ].filter(Boolean).slice(0, 5);
  const risks = [
    low.dscr < LEVEL.low && [fill('The cover in {dscr.low.fy}, {dscr.low}, is below the usual {level.low}.'), 'engine', 12],
    Y[0].bepPct > 100 && [fill('The first year’s sales do not reach break-even ({bep.1}): a loss ' + (one ? who : 'the promoters') + ' must carry.'), 'engine', 11],
    S.down.cashShort && [fill(`In the downside case cash runs short by {down.short}; ${whoL} would put it in.`), 'engine', 13],
    S.severe.cashShort ? [fill(`In the severe case cash runs short by {severe.short}; Chapter 13 shows what ${whoL} would do.`), 'engine', 13] : [fill('In the severe case the cover falls to {severe.low} in {severe.low.fy}.'), 'engine', 13],
    [fill(`The first year needs {use.1} of capacity, and the buyers in writing are ${K.buyers.filter((b) => b.status === 'order').length ? 'a trial order and a letter' : 'two letters'}.`), 'buyer', 10],
    [esc(K.risks[0].risk) + '.', 'word', 14],
  ].filter(Boolean).slice(0, 5);
  const open = K.conditions.slice(0, 4);
  const chapPage = (n) => toc.find((t) => t[0] === String(n))[2];
  const li = ([t, e, ch]) => `<li>${t} ${ev(e)} <span class="see">→ ${ch}</span></li>`;
  const briefChart = () => {
    const w = 300, h = 150, l = 26, r = w - 6, top = 10, base = h - 22, max = Math.max(3, Math.ceil(Math.max(...F.scenarios.flatMap((s) => s.dscr.slice(0, Y.length))))), n = Y.length;
    const x = (i) => l + 8 + (i * (r - l - 16)) / (n - 1), y = (v) => base - (Math.max(v, 0) / max) * (base - top);
    let s = [...Array(max + 1).keys()].map((t) => ln(l, y(t), r, y(t), t ? C.hair : C.line) + T(l - 4, y(t) + 3, t + '×', { z: 7.5, a: 'end', f: C.faint })).join('');
    s += ln(l, y(LEVEL.low), r, y(LEVEL.low), C.ink, 1.1, '3 2') + T(r, y(LEVEL.low) - 3, `usual level in any year`, { z: 7, a: 'end', f: C.mut });
    const col = { base: C.teal, down: C.slate, severe: C.amber };
    F.scenarios.forEach((sc) => { s += `<polyline fill="none" stroke="${col[sc.id]}" stroke-width="${sc.id === 'base' ? 2.2 : 1.5}" points="${sc.dscr.slice(0, Y.length).map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}"/>`; });
    s += Y.map((yr, i) => T(x(i), base + 13, yr.fy.slice(2), { z: 7.5, a: 'middle', f: C.mut })).join('');
    return svg(w, h, s);
  };
  const briefBody = `<div class="kick">The brief</div><h2 class="act">${esc(K.oneLine)}, at ${esc(F.state.address)}</h2>
${M('brief', 'brief.proposed v1', `<p class="lede">${fill(`${esc(F.state.name)} asks a term loan of {loan} and a working-capital limit of {wc} for a project costing {cost}. ${one ? 'The proprietor brings' : 'The partners bring'} {promoter}, {promoter.pct} of the cost. Sales start in {start}.`)}</p>`)}
<div class="brief"><div class="rail">${M('brief', 'brief.rail v1', `${[['Cost of the project', 'cost.total', lk(B.projectCost)], ['Term loan asked', 'fin.tl', lk(B.finance.termLoan)], [one ? 'The proprietor brings' : 'The promoters bring', 'fin.promoter', lk(B.finance.promoter)], ['Working-capital limit', 'wc', lk(B.wcLimit)]].map(([l, k, v]) => `<div class="kf"><div class="l">${l}, ₹ lakh</div><div class="v">${ref(k, v)}</div></div>`).join('')}<div class="kf"><div class="l">The cover, lowest and average</div><div class="v">${ref(`dscr.${low.fy}`, x2(low.dscr))} · ${ref('dscr.avg', x2(B.average))}</div><div class="s">usual ${x2(LEVEL.low)} and ${x2(LEVEL.avg)}</div></div>`)}</div>
<div><div class="two b2">${M('brief.strength', 'brief.strengths v1', `<div><div class="kick">Strengths</div><ul class="bl">${strengths.map(li).join('')}</ul></div>`)}${M('brief.risk', 'brief.risks v1', `<div><div class="kick">Risks</div><ul class="bl">${risks.map(li).join('')}</ul></div>`)}</div>
<div class="two b2">${M('brief', 'brief.ready v1', `<div><div class="kick">What is ready</div><ul class="bl sm">${K.papers.filter((p) => p[2] === 'held').slice(0, 5).map(([w, d]) => `<li>${esc(w)} <span class="see">${typed(d)}</span></li>`).join('')}</ul></div>`)}${M('brief.open', 'brief.open v1', `<div><div class="kick">Still open</div><ul class="bl sm">${open.map(([w, o, b]) => `<li>${esc(w)} <span class="see">${esc(o)}, ${esc(b.toLowerCase())}</span></li>`).join('')}</ul></div>`)}</div>
${M('brief', 'brief.chart v1', `<figure class="ex bc"><div class="no">The one chart</div><h3>${fill(claim(!S.severe.cashShort && S.severe.lowest.dscr >= 1, 'The loan is paid in every year in all three cases', 'The cover in three cases, year by year'))}</h3><div class="sub">DSCR, times, by year · base, downside, severe but plausible · the dashed line is the usual level in any one year</div><div class="lg"><span><i style="background:${C.teal}"></i>Base</span><span><i style="background:${C.slate}"></i>Downside</span><span><i style="background:${C.amber}"></i>Severe but plausible</span></div>${briefChart()}<div class="src"><b>Source</b> The engine; Exhibits @@dscr@@ and @@scenarios@@ hold the figures${F.scenarios.some((x) => x.dscr.length > Y.length) ? '. A late start moves the last instalments into a further year, not drawn' : ''}</div></figure>`)}</div></div>
${M('brief', 'brief.no-verdict v1', `<p class="small">${fill('This brief states what the report finds and what is still open; it gives no opinion on the loan. Each line points to the chapter that shows it.')}</p>`)}`;
  // The arrows name chapters; the contents page gives their pages.
  const QUESTIONS = [['What is being set up?', '2, 3'], ['Who will run it?', '1'], ['Who will buy?', '3, 4'], ['How much can be made and sold?', '5, 10'], ['What backs the sales plan?', '3, Annex C'], ['How much money, where does it go?', '9'], ['What cash pays the instalments?', '12'], ['What can go wrong?', '13, 14'], ['What is still unverified?', '15, 16']];
  const contents = () => `<div class="kick">Contents</div><div class="toc">${toc.map(([n, t, p]) => `<div class="${/^[A-C]$/.test(n) ? 'back' : ''}"><span>${/^[A-C]$/.test(n) ? 'Annex ' + n : n}</span><span>${t}</span><span>${String(p).padStart(2, '0')}</span></div>`).join('')}</div>
<div class="two" style="margin-top:5mm">${M('contents', 'where-to-find v1', `<div><div class="kick">Where to find the answers a credit officer asks</div><table class="reg q">${QUESTIONS.map(([q, c]) => `<tr><td>${q}</td><td class="r">${c.split(', ').map((x) => /Annex/.test(x) ? x : `Ch. ${x} · p. ${chapPage(x)}`).join('<br>')}</td></tr>`).join('')}</table></div>`)}
${M('contents', 'how-to-read v1', `<div><div class="kick">How to read it</div><p><b>The brief is one page.</b> ${fill('It gives the strengths, the risks and what is open, each pointing to its chapter.')}</p><p><b>Each exhibit says its finding in its title,</b> ${fill('and under it the question it answers, its unit, its period and its source.')}</p><p><b>A figure is shown once.</b> ${fill('Where it is needed again it appears in grey with the exhibit it comes from.')}</p><p><b>Every fact carries its evidence:</b> ${ev('engine')} ${ev('paper')} ${ev('quote')} ${ev('buyer')} ${ev('word')} ${ev('pencil')} ${ev('missing')}</p></div>`)}</div>`;
  const cover = `<section class="page cover"><div class="cv-top"><span class="kick">${K.kind}</span><i class="tag">Specimen · a fictional business</i></div>
<h1>${esc(F.state.name)}</h1><p class="cv-sub">${esc(K.oneLine)}<br>${esc(F.state.address)}</p>
${M('cover', 'cover v1', `<table class="cvt"><tr><td>Promoters</td><td>${K.promoters.map((p) => esc(p.name)).join(', ')} · ${esc(FACTS.Constitution || '')}</td></tr><tr><td>Kind of report</td><td>${esc(K.kind)} · ${esc(K.purpose)} · ${esc(K.funding)}</td></tr><tr><td>Date</td><td>${esc(K.date)}</td></tr><tr><td>Report</td><td>No. ${esc(K.reportNo)} · version ${K.version} · made from answers ${fingerprint}</td></tr></table>`)}
<div class="cv-foot">${M('cover', 'prepared-by v1', `<div><b>Prepared by ${one ? 'the proprietor' : 'the promoters'}, with FinSight.</b> Every figure is worked out by FinSight’s engine from the facts given. FinSight gives no opinion on the loan: the lender decides.</div>`)}</div></section>`;

  // Assemble: cover, brief, contents, then the body (the contents counts pages, so its place is fixed first).
  const bodyPages = pages.splice(0);
  for (const t of toc) t[2] += 3;
  const runHead = (section) => `<div class="run"><span><b>${esc(F.state.name)}</b> · ${esc(K.kind)} · ${esc(K.reportNo)} v${K.version}</span><span>${section}<i class="tag">Specimen</i></span></div>`;
  const total = bodyPages.length + 3 + (marked ? 2 : 0);
  const pg = (section, body, n, cls = '') => `<section class="page ${cls}">${runHead(section)}${body}<div class="foot"><span>Figures by FinSight’s engine; words from FinSight’s library, confirmed by the ${one ? 'proprietor' : 'promoters'}. Made from answers ${fingerprint}.</span><span class="pg">${n} / ${total}</span></div></section>`;
  const html = [cover, pg('The brief', briefBody, 2), pg('Contents', contents(), 3), ...bodyPages.map((p, i) => pg(p.section, p.body, i + 4, p.cls))];
  if (marked) {
    const byRule = {};
    for (const u of used) (byRule[u.rule] ||= new Set()).add(u.piece);
    const rows = Object.entries(byRule).map(([r, ps]) => `<tr><td><b>${r}</b><br><small>${esc(RULES[r] || 'The trade pack for ' + PK.name.toLowerCase() + ': how such units usually work, never this borrower’s fact until confirmed')}</small></td><td>${[...ps].map((p) => `<code>${p}</code>`).join(' ')}</td></tr>`);
    const half = Math.ceil(rows.length / 2);
    const map = (rs, first) => `${first ? `<div class="kick">The factory map</div><h2 class="act">The rules and pieces that made this report</h2><p class="lede">${fill('Each block in this copy is marked in the margin with the rule that chose it and the piece that wrote it. LIB1 builds these as dated rule and library files; the same answers make the same report.')}</p>` : ''}<table class="reg map"><tr><th>Rule, and when it applies</th><th>Pieces it chose here</th></tr>${rs.join('')}</table>`;
    html.push(pg('The factory map', map(rows.slice(0, half), true), total - 1), pg('The factory map', map(rows.slice(half), false) + `<p class="small" style="margin-top:5mm">${used.length} blocks; ${Object.keys(byRule).length} rules; ${new Set(used.map((u) => u.piece)).size} pieces. Exhibits: ${exNo}, each figure shown by one.</p>`, total));
    fs.writeFileSync(path.join(out, `factory-${id}.json`), JSON.stringify({ case: id, reading, rules: Object.fromEntries(Object.entries(byRule).map(([r, ps]) => [r, { when: RULES[r] || 'trade pack', pieces: [...ps] }])), exhibits: exNo, figuresShown: shown.size }, null, 1));
  }
  const htmlOut = html.join('\n').replace(/@@([a-z-]+)@@/g, (m, k) => { if (!exKey[k]) throw new Error(`${id}: no exhibit ${k}`); return exKey[k]; });
  return { html: `<!doctype html><html lang="en-IN"><head><meta charset="utf-8"><title>${esc(F.state.name)}: project report (SPEC2)</title><style>${css}</style></head><body class="${marked ? 'marked' : ''}">${htmlOut}</body></html>`, pages: html.length, reading, exhibits: exNo };
}

const css = `
@font-face{font-family:Figtree;font-weight:300 900;src:url(data:font/woff2;base64,${font('figtree-latin.woff2')}) format('woff2')}
@font-face{font-family:Figtree;font-weight:300 500;src:url(data:font/woff2;base64,${font('rupee-regular.woff2')}) format('woff2');unicode-range:U+20B9}
@font-face{font-family:Figtree;font-weight:600 900;src:url(data:font/woff2;base64,${font('rupee-semibold.woff2')}) format('woff2');unicode-range:U+20B9}
@font-face{font-family:Anek;font-weight:500;font-stretch:75% 125%;src:url(data:font/woff2;base64,${font('anek-latin.woff2')}) format('woff2')}
@page{size:210mm 297mm;margin:0}
*{box-sizing:border-box}html,body{margin:0;padding:0}
body{font-family:Figtree,sans-serif;font-size:9.1pt;line-height:1.48;color:#0f172a;-webkit-print-color-adjust:exact;print-color-adjust:exact;font-variant-numeric:tabular-nums lining-nums}
.page{width:210mm;height:297mm;padding:13mm 16mm 11mm 25mm;position:relative;display:flex;flex-direction:column;break-after:page;overflow:hidden;background:#fff}
.run{display:flex;justify-content:space-between;align-items:center;font-size:6.8pt;color:#64748b;padding-bottom:2.4mm;border-bottom:.5pt solid #cbd5e1;margin-bottom:7mm}.run b{color:#0f172a;font-weight:650}
.tag{font-style:normal;font-size:6pt;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#92400e;border:.6pt solid #d97706;border-radius:1mm;padding:.4mm 1.6mm;margin-left:3mm}
.foot{margin-top:auto;display:flex;justify-content:space-between;align-items:baseline;gap:6mm;font-size:6.3pt;color:#64748b;padding-top:2.4mm;border-top:.5pt solid #cbd5e1}.foot .pg{font-family:Anek;font-weight:500;font-size:10pt;color:#0f172a;white-space:nowrap}
.kick{font-size:6.8pt;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#0f766e;margin:0 0 2.2mm}
.act{font-family:Anek;font-weight:500;font-stretch:94%;font-size:19pt;line-height:1.12;margin:0 0 4mm;max-width:160mm;text-wrap:balance}.act.sm{font-size:15pt;margin-bottom:3mm}
.lede{font-size:10pt;line-height:1.45;color:#475569;margin:0 0 5mm;max-width:150mm}
p{margin:0 0 2.6mm}p b{font-weight:650}.small{font-size:7.4pt;color:#64748b}
.two{display:grid;grid-template-columns:1fr 1fr;column-gap:7mm}
.kf{padding:2mm 0 2.2mm;border-top:.5pt solid #cbd5e1}.kf:first-child{border-top:1.2pt solid #0f172a}.kf .l{font-size:6.8pt;color:#475569}.kf .v{font-family:Anek;font-weight:500;font-size:17pt;line-height:1.12}.kf .s{font-size:6.6pt;color:#64748b}
.ex{margin:0 0 5mm;border-top:1.2pt solid #0f172a;padding-top:2mm}.ex .no{font-size:6.4pt;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#0f766e}
.ex h3{font-size:10.4pt;font-weight:650;line-height:1.25;margin:.6mm 0 .5mm;text-wrap:balance}.ex .sub{font-size:7pt;color:#64748b;margin-bottom:2.4mm}.ex .sub b,.ex .src b{color:#334155;font-weight:650}
.ex .src{font-size:6.8pt;color:#64748b;margin-top:2mm;padding-top:1.3mm;border-top:.5pt solid #e2e8f0}.ex .sep{margin:0 1mm}.ex svg{display:block;width:100%;height:auto}svg text{font-family:Figtree}
.lg{display:flex;flex-wrap:wrap;gap:1mm 5mm;font-size:7pt;color:#475569;margin:0 0 1mm}.lg span{display:inline-flex;align-items:center;gap:1.4mm}.lg i{width:4mm;height:1mm;display:inline-block}
table{border-collapse:collapse;width:100%}
.five{font-size:7.9pt}.five th{font-size:6.8pt;font-weight:600;color:#475569;text-align:right;padding:1.2mm 0 1.2mm 2mm;border-bottom:.8pt solid #0f172a;vertical-align:bottom}.five td{text-align:right;padding:1.2mm 0 1.2mm 2mm;border-bottom:.5pt solid #e2e8f0}
.five th:first-child,.five td:first-child{text-align:left;padding-left:0}.five tr.tot td{font-weight:650;border-top:.6pt solid #0f172a}.five tr.ratio td{font-weight:650;background:#f1f8f7}.five tr.hd td{font-weight:700;color:#0f766e;font-size:6.6pt;letter-spacing:.1em;text-transform:uppercase;padding-top:2.4mm;text-align:left}
.tight{font-size:6pt;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#92400e}
.reg{font-size:7.9pt;line-height:1.38}.reg th{font-size:6.7pt;font-weight:600;color:#475569;text-align:left;padding:1.2mm 3mm 1.2mm 0;border-bottom:.8pt solid #0f172a;vertical-align:bottom}.reg td{vertical-align:top;padding:1.6mm 3mm 1.6mm 0;border-bottom:.5pt solid #e2e8f0}.reg .r{text-align:right}.reg tr.tot td{font-weight:650;border-top:.6pt solid #0f172a}.reg td.gap{border:0;padding:1.5mm}
.reg small{color:#64748b;font-size:6.8pt}.reg .rn{font-family:Anek;font-weight:500;color:#0f766e;width:9mm}.reg.risk td{font-size:7.5pt}.reg.risk td:first-child{width:22%}.reg.sc tr.base td{background:#f8fafc}.reg.sc td:first-child{width:38%}
.regi td:nth-child(3){width:28%}.regi td:nth-child(4){width:17%;white-space:nowrap}.map td:first-child{width:46%}.map code{display:inline-block;font-size:6.6pt;background:#f1f5f9;border-radius:.6mm;padding:.2mm 1mm;margin:0 .6mm .8mm 0}
.q td{font-size:7.6pt;padding-top:1.1mm;padding-bottom:1.1mm}.q td.r{white-space:nowrap;color:#0f766e;font-weight:600}
.fx{font-size:8pt}.fx td{padding:1.5mm 3mm 1.5mm 0;border-bottom:.5pt solid #e2e8f0;vertical-align:top}.fx tr:first-child td{border-top:.8pt solid #0f172a}.fx td:first-child{width:30%;color:#475569}.fx td:last-child{width:24%;text-align:right;padding-right:0}
.ev{display:inline-block;font-size:5.9pt;font-weight:700;letter-spacing:.06em;text-transform:uppercase;border-radius:.8mm;padding:.15mm 1.1mm;vertical-align:.25mm;white-space:nowrap;border:.5pt solid}
.ev-engine{color:#0f766e;border-color:#5eead4;background:#f0fdfa}.ev-paper,.ev-quote{color:#1e40af;border-color:#93c5fd;background:#eff6ff}.ev-buyer{color:#6b21a8;border-color:#d8b4fe;background:#faf5ff}.ev-word{color:#334155;border-color:#cbd5e1;background:#f8fafc}.ev-pencil{color:#92400e;border-color:#fcd34d;background:#fffbeb}.ev-missing{color:#b91c1c;border-color:#fca5a5;background:#fef2f2}.ev-pack{color:#475569;border-color:#cbd5e1;background:#fff;border-style:dashed}
.st{display:inline-block;font-size:6.4pt;font-weight:700;letter-spacing:.06em;text-transform:uppercase;border-radius:.8mm;padding:.2mm 1.3mm}.st-order,.st-letter{background:#0f766e;color:#fff}.st-trial{background:#cdeae6;color:#0f172a}.st-enquiry{background:#f1f5f9;color:#475569;border:.5pt solid #cbd5e1}
.ref{color:#94a3b8}.ref sup{font-size:5.4pt;margin-left:.3mm;color:#94a3b8}.neg{color:#b91c1c;font-weight:650}
.people{display:grid;grid-template-columns:1fr 1fr;column-gap:7mm;margin-bottom:3mm}.person{border-top:1.2pt solid #0f172a;padding-top:2mm}.person .nm{font-family:Anek;font-weight:500;font-size:14pt}.person .rl{font-size:7.4pt;color:#0f766e;font-weight:600;margin-bottom:2mm}
.reading{background:#f1f8f7;border-left:2pt solid #0d9488;padding:3mm 4mm 1mm;margin:0 0 4mm}
.time{display:grid;grid-template-columns:repeat(${6},1fr);gap:1mm}.time div{font-size:7.3pt;line-height:1.35;padding:2mm 2.2mm;background:#f1f5f9;display:flex;flex-direction:column;gap:1mm}.time div.engine{background:#cdeae6}.time em{display:block;font-style:normal;font-size:6.4pt;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#0f766e}.time span{margin-top:auto}
.proc{display:grid;grid-template-columns:repeat(6,1fr);margin-top:1mm}.proc div{padding:0 3mm 0 0;font-size:7.2pt;line-height:1.36}.proc i{font-style:normal;font-family:Anek;font-weight:500;font-size:11pt;color:#0f766e;display:block;border-top:2pt solid #0d9488;padding-top:1mm;margin-right:-3mm}.proc b{display:block;font-size:7.9pt;font-weight:650;margin:.6mm 0}.proc span{color:#475569}
.photos{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm}.photo{border:.6pt dashed #94a3b8;background:repeating-linear-gradient(135deg,#f8fafc 0 3mm,#f1f5f9 3mm 6mm);border-radius:1mm;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.6mm;font-size:6.8pt;color:#64748b;aspect-ratio:4/3;text-align:center;padding:2mm}.photo b{color:#475569}
.brief{display:grid;grid-template-columns:36mm minmax(0,1fr);column-gap:7mm}.b2{margin-bottom:3mm}.bl{margin:0;padding:0;list-style:none}.bl li{font-size:7.9pt;line-height:1.38;padding:1.4mm 0;border-top:.5pt solid #e2e8f0}.bl li:first-child{border-top:1pt solid #0f172a}.bl .see{color:#0f766e;font-weight:650;font-size:7pt;white-space:nowrap}.bl.sm li{font-size:7.5pt}.ex.bc{margin:1mm 0 2mm}.ex.bc svg{max-height:41mm}
.toc div{display:grid;grid-template-columns:16mm 1fr auto;align-items:baseline;padding:.9mm 0;border-bottom:.5pt solid #cbd5e1;font-size:9.4pt}.toc div:first-child{border-top:1.2pt solid #0f172a}.toc span:first-child,.toc span:last-child{font-family:Anek;font-weight:500;font-size:10.5pt;color:#0f766e}.toc span:last-child{color:#0f172a}.toc .back{color:#475569}
.st,.sched{}.sched .st{font-size:7pt}
table.st th{font-size:6.3pt;font-weight:600;color:#475569;text-align:right;padding:.9mm 0 .9mm 1.4mm;border-bottom:.8pt solid #0f172a}table.st td{text-align:right;padding:.75mm 0 .75mm 1.4mm;border-bottom:.5pt solid #e2e8f0}table.st th:first-child,table.st td:first-child{text-align:left;padding-left:0;width:38%}table.st tr.tot td{font-weight:650;border-top:.6pt solid #0f172a}table.st tr.hd td{font-weight:700;color:#0f766e;font-size:6.1pt;letter-spacing:.12em;text-transform:uppercase;padding-top:2mm;text-align:left}table.st tr.ratio td{font-weight:650;background:#f1f8f7}
.stp .ex{margin-bottom:3mm}.two.cost{grid-template-columns:1fr;row-gap:4mm}.two.cost .ev{white-space:normal}.stp .ex h3{font-size:9.4pt}
.sign{margin-top:8mm;font-size:8.4pt;line-height:1.9;display:grid;gap:8mm}.sign .for{font-weight:650;border-top:.6pt solid #0f172a;padding-top:1mm;display:inline-block;min-width:55mm}
.cover{padding-top:22mm}.cv-top{display:flex;justify-content:space-between;align-items:center}.cv-top .kick{margin:0;font-size:8pt}
.cover h1{font-family:Anek;font-weight:500;font-stretch:112%;font-size:54pt;line-height:.98;letter-spacing:-.02em;margin:46mm 0 5mm}.cv-sub{font-size:13.5pt;line-height:1.35;color:#475569;margin:0 0 18mm}
.cvt{font-size:9pt;max-width:150mm}.cvt td{padding:2.4mm 0;border-top:.5pt solid #cbd5e1;vertical-align:top}.cvt tr:first-child td{border-top:1.2pt solid #0f172a}.cvt td:first-child{width:36mm;color:#475569;font-size:7.6pt;letter-spacing:.08em;text-transform:uppercase;font-weight:650;padding-top:2.8mm}
.cv-foot{margin-top:auto;font-size:7.8pt;line-height:1.5;color:#475569;padding-top:4mm;border-top:.5pt solid #cbd5e1}.cv-foot b{color:#0f172a;font-weight:650}
.legend{font-size:7.4pt;line-height:2;color:#475569;margin-top:4mm}
.pc{position:relative}
body.marked .pc::before{content:attr(data-m);white-space:pre-line;position:absolute;left:-22mm;top:.4mm;width:19.5mm;font:600 4.6pt/1.3 Figtree,sans-serif;color:#7c3aed;letter-spacing:.01em;word-break:break-all;border-left:.8pt solid #a78bfa;padding-left:.8mm}
body.marked .pc .pc::before{display:none}
body.marked .slot{background:#fef3c7;border-radius:.4mm;box-shadow:0 0 0 .3mm #fef3c7}body.marked .typed{background:#ede9fe;border-radius:.4mm;box-shadow:0 0 0 .3mm #ede9fe}
body.sheet{display:grid;grid-template-columns:repeat(6,210mm);gap:6mm;padding:6mm;background:#475569;width:max-content}
`;

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const { chromium } = require(path.join(root, 'node_modules/playwright'));
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const report = {};
  for (const id of ['snacks', 'laundry']) for (const marked of [true, false]) {
    const r = build(id, marked), name = `spec2-${id}${marked ? '-marked' : ''}`;
    fs.writeFileSync(path.join(out, name + '.html'), r.html);
    const pg = await b.newPage({ viewport: { width: 794, height: 1123 } });
    await pg.goto('file://' + path.resolve(out, name + '.html')); await pg.evaluate(() => document.fonts.ready);
    const over = await pg.evaluate(() => [...document.querySelectorAll('.page')].map((p, i) => [i + 1, p.scrollHeight - p.clientHeight, p.scrollWidth - p.clientWidth]).filter((x) => x[1] > 1 || x[2] > 1));
    await pg.pdf({ path: path.join(out, name + '.pdf'), preferCSSPageSize: true, printBackground: true });
    if (marked) {
      const sh = await b.newPage({ viewport: { width: 4900, height: 1200 }, deviceScaleFactor: 0.45 });
      await sh.goto('file://' + path.resolve(out, name + '.html')); await sh.evaluate(() => { document.body.classList.add('sheet'); return document.fonts.ready; });
      await sh.screenshot({ path: path.join(out, `sheet-${id}.png`), fullPage: true }); await sh.close();
    }
    await pg.close();
    report[name] = { pages: r.pages, reading: r.reading, exhibits: r.exhibits, kb: Math.round(fs.statSync(path.join(out, name + '.pdf')).size / 1024), overflow: over };
  }
  await b.close();
  console.log(JSON.stringify(report));
})().catch((e) => { console.error(e.message); process.exit(1); });
