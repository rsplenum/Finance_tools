/**
 * The specimen report (REPORT-GRADE, 14-11-2026): the look and order PAPER2 aims at, drawn by hand as a web document and
 * printed to PDF by Chromium, the same way Cloudflare's Browser Run prints HTML. Every figure is read from figures.json
 * (the engine's, made by figures.ts): nothing is worked out here but where a mark sits. The write-up is written with
 * named slots ({dscr.low}); fill() puts the engine's figure in each and refuses any other digit (rule 12), and claim()
 * refuses a sentence the figures do not bear out.
 *   node build.cjs <figures.json> <out dir> [--pages]
 */
const fs = require('fs'), path = require('path');
const [, , figPath, out, flag] = process.argv;
const F = JSON.parse(fs.readFileSync(figPath, 'utf8')), B = F.base, Y = B.years, W = Object.fromEntries(F.whatIf.map((w) => [w.id, w]));
const root = path.resolve(__dirname, '../../..');
const font = (n) => fs.readFileSync(path.join(root, 'site/public/fonts', n)).toString('base64');
const hunt = (o, id) => { if (o && typeof o === 'object') { if (o.id === id) return o; for (const k in o) { const r = hunt(o[k], id); if (r) return r; } } };
const RAT = require(path.join(root, 'engine/data/ratios.json'));
const LEVEL = { avg: hunt(RAT, 'dscrAverage').fresh, low: hunt(RAT, 'dscrLowest').fresh };
const part = (n) => F.paper.find((p) => p.name.includes(n));
const pairsOf = (n) => Object.fromEntries(part(n).blocks.filter((b) => b.kind === 'pairs').flatMap((b) => b.pairs));
const tableAfter = (n, h) => { const bs = part(n).blocks; return bs[bs.findIndex((b) => b.kind === 'heading' && b.text.includes(h)) + 1].table; };
const terms = Object.entries(pairsOf('glance')).find(([k]) => k === 'Term loan')[1];
const [, DRAWN] = /first drawn in ([A-Za-z]+ \d+)/.exec(terms), [, MOR] = /(\d+) months' moratorium/.exec(terms), [, N] = /(\d+) instalments/.exec(terms);
const BASIS = pairsOf('Basis'), FACTS = pairsOf('Business');

// The engine's figures, as words. Formatting only.
const lk = (v) => (v / 1e5).toFixed(2), lakh = (v) => `₹${lk(v)} lakh`, inr = (v) => '₹' + Math.round(v).toLocaleString('en-IN');
const x2 = (v) => v.toFixed(2), p1 = (v) => v.toFixed(1) + '%';
const SLOT = {
  cost: lakh(B.projectCost), loan: lakh(B.finance.termLoan), promoter: lakh(B.finance.promoter), 'promoter.pct': x2(B.finance.promoterPct) + '%',
  rate: F.state.ratePct + '%', n: N, mor: MOR, drawn: DRAWN, instalment: inr(B.firstInstalment), wc: lakh(B.wcLimit), idc: inr(B.idc.total), margin: lakh(B.marginMoney),
  'dscr.avg': x2(B.average), 'dscr.low': x2(B.lowest.dscr), 'dscr.low.fy': B.lowest.fy, 'level.avg': x2(LEVEL.avg), 'level.low': x2(LEVEL.low),
  'fy.1': Y[0].fy, 'fy.2': Y[1].fy, 'fy.3': Y[2].fy, 'fy.5': Y[4].fy, 'use.1': Y[0].utilisationPct + '%', 'use.3': Y[2].utilisationPct + '%',
  'sales.1': lakh(Y[0].sales), 'sales.3': lakh(Y[2].sales), 'pat.1': lakh(Y[0].pat), 'pat.3': lakh(Y[2].pat), 'pbdit.3': lakh(Y[2].pbdit), 'pbdit.5': lakh(Y[4].pbdit),
  'bep.1': p1(Y[0].bepPct), 'bep.3': p1(Y[2].bepPct), 'cash.5': lakh(Y[4].cash), 'service': lakh(Y[0].service), 'cover.1': x2(Y[0].interestCover),
  var: F.state.variablePct + '%', 'fixed.basis': BASIS['Fixed costs in a full first year'], days: BASIS['Stock, debtors and creditors'],
  'wi.sales.low': x2(W.sales.lowest.dscr), 'wi.costs.low': x2(W.costs.lowest.dscr), 'wi.rate.low': x2(W.rate.lowest.dscr), 'wi.costs.avg': x2(W.costs.average),
  'p1.units': Y[0].products[0].units.toLocaleString('en-IN'), 'p2.units': Y[0].products[1].units.toLocaleString('en-IN'),
};
/** Words with slots in, figures out: any digit outside a slot stops the build, unless it is the number of a note, exhibit, statement, section or page. */
const fill = (s) => {
  const bare = s.replace(/\{[a-z0-9.]+\}/g, '').replace(/\b(?:notes?|exhibits?|statements?|sections?|page) \d+(?:(?:, | and | to )\d+)*/gi, '').replace(/<[^>]+>/g, '');
  if (/\d/.test(bare)) throw new Error('A figure outside a slot: ' + bare);
  return s.replace(/\{([a-z0-9.]+)\}/g, (m, k) => { if (!(k in SLOT)) throw new Error('No such slot: ' + k); return `<span class="slot">${SLOT[k]}</span>`; });
};
const claim = (ok, s) => { if (!ok) throw new Error('The figures do not bear this out: ' + s); return fill(s); };
const P = (s) => `<p>${fill(s)}</p>`;

// Marks.
const C = { ink: '#0f172a', mut: '#475569', faint: '#64748b', line: '#cbd5e1', hair: '#e2e8f0', teal: '#0d9488', tint: '#cdeae6', slate: '#334155', grey: '#94a3b8', greyl: '#d5dde8', amber: '#d97706' };
const svg = (w, h, b, cls = '') => `<svg class="${cls}" viewBox="0 0 ${w} ${h}" role="img" xmlns="http://www.w3.org/2000/svg">${b}</svg>`;
const T = (x, y, s, o = {}) => `<text x="${x}" y="${y}" font-size="${o.z || 9}"${o.b ? ' font-weight="650"' : ''}${o.d ? ' font-family="Anek" font-weight="500"' : ''} text-anchor="${o.a || 'start'}" fill="${o.f || C.ink}">${s}</text>`;
const R = (x, y, w, h, f) => `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${Math.max(h, 0).toFixed(1)}" fill="${f}"/>`;
const col = (x, y, w, h, f, r = 3) => `<path d="M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z" fill="${f}"/>`;
const ln = (x1, y1, x2, y2, s, w = 1) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${s}" stroke-width="${w}" stroke-linecap="round"/>`;
const grid = (l, r, y, ticks, unit = '') => ticks.map((t) => ln(l, y(t), r, y(t), t ? C.hair : C.line, 1) + T(l - 5, y(t) + 3, t + unit, { z: 8, a: 'end', f: C.faint })).join('');
const L = (v) => v / 1e5;

/** Cash for the loan against the payment due, a year a column. The cover's picture and Exhibit 7. */
function cashChart(w, h, big) {
  const l = big ? 0 : 30, r = w, top = big ? 44 : 40, base = h - (big ? 26 : 58), max = 16, y = (v) => base - (v / max) * (base - top), band = (r - l) / 5, cw = big ? 92 : 34;
  let s = big ? '' : grid(l, r, y, [0, 4, 8, 12, 16]);
  Y.forEach((yr, i) => {
    const cx = l + band * (i + 0.5), low = yr.fy === B.lowest.fy, a = L(yr.available);
    s += big ? R(cx - cw / 2, y(a), cw, base - y(a), C.tint) + R(cx - cw / 2, y(a), cw, 3, C.teal) : col(cx - cw / 2, y(a), cw, base - y(a), low ? C.amber : C.teal);
    if (big) s += T(cx, y(a) - 9, lk(yr.available), { z: 22, a: 'middle', d: 1 }) + T(cx, base + 17, yr.fy, { z: 11, a: 'middle', f: C.mut });
    else {
      s += ln(cx - 28, y(L(yr.service)), cx + 28, y(L(yr.service)), C.ink, 2.4) + T(cx, y(a) - 7, x2(yr.dscr) + '×', { z: 11.5, a: 'middle', b: 1 });
      if (low) s += T(cx, y(a) - 21, 'Tightest year', { z: 8, a: 'middle', f: '#92400e', b: 1 });
      s += T(cx, base + 14, yr.fy, { z: 9, a: 'middle', f: C.mut }) + T(cx, base + 31, lk(yr.available), { z: 9, a: 'middle' }) + T(cx, base + 45, lk(yr.service), { z: 9, a: 'middle', f: C.mut });
    }
  });
  if (big) s += ln(0, y(L(Y[0].service)), w, y(L(Y[0].service)), C.ink, 1.6) + ln(0, base, w, base, C.ink, 1);
  else s += ln(l, base, r, base, C.grey, 1) + ln(l, base + 20, r, base + 20, C.hair, 1) + T(l - 5, base + 31, 'Cash', { z: 8, a: 'end', f: C.faint }) + T(l - 5, base + 45, 'Due', { z: 8, a: 'end', f: C.faint });
  return svg(w, h, s);
}
/** Each year's sales, split into what they cost and what is left. */
function salesChart(w, h) {
  const l = 30, r = w, top = 22, base = h - 22, max = 120, y = (v) => base - (v / max) * (base - top), band = (r - l) / 5, cw = 50;
  let s = grid(l, r, y, [0, 40, 80, 120]);
  Y.forEach((yr, i) => {
    const x = l + band * (i + 0.5) - cw / 2, v = L(yr.variable), f = L(yr.fixed), p = L(yr.pbdit);
    s += R(x, y(v) + 1, cw, base - y(v) - 1, C.greyl) + R(x, y(v + f) + 1, cw, y(v) - y(v + f) - 1, C.grey) + col(x, y(v + f + p), cw, y(v + f) - y(v + f + p), C.teal);
    s += T(x + cw / 2, y(v + f + p) - 6, lk(yr.sales), { z: 10.5, a: 'middle', b: 1 }) + T(x + cw / 2, y(v + f + p / 2) + 3.4, lk(yr.pbdit), { z: 9, a: 'middle', f: '#fff', b: 1 });
    s += T(x + cw / 2, base + 14, yr.fy, { z: 9, a: 'middle', f: C.mut });
  });
  return svg(w, h, s + ln(l, base, r, base, C.grey, 1));
}
/** The term loan left and the cash in hand, at each year end. */
function runoffChart(w, h) {
  const l = 30, r = w - 104, top = 18, base = h - 22, max = 45, y = (v) => base - (v / max) * (base - top), x = (i) => l + 24 + (i * (r - l - 30)) / 4;
  const line = (k, c) => `<polyline fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" points="${Y.map((yr, i) => `${x(i).toFixed(1)},${y(L(yr[k])).toFixed(1)}`).join(' ')}"/>` + Y.map((yr, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(L(yr[k])).toFixed(1)}" r="3.6" fill="${c}" stroke="#fff" stroke-width="2"/>`).join('');
  let s = grid(l, r, y, [0, 15, 30, 45]) + line('termLoan', C.slate) + line('cash', C.teal);
  s += Y.map((yr, i) => T(x(i), base + 14, yr.fy, { z: 9, a: 'middle', f: C.mut })).join('');
  s += T(x(0), y(L(Y[0].termLoan)) - 9, lk(Y[0].termLoan), { z: 9.5, a: 'middle', b: 1 }) + T(x(0), y(L(Y[0].cash)) + 15, lk(Y[0].cash), { z: 9.5, a: 'middle', b: 1 });
  s += T(x(1), y(L(Y[1].cash)) - 9, lk(Y[1].cash), { z: 9.5, a: 'middle', b: 1 }) + T(x(1), y(L(Y[1].termLoan)) + 15, lk(Y[1].termLoan), { z: 9.5, a: 'middle', b: 1 });
  s += T(x(4) + 10, y(L(Y[4].cash)) + 1, lk(Y[4].cash), { z: 10.5, b: 1 }) + T(x(4) + 10, y(L(Y[4].cash)) + 13, 'Cash and bank', { z: 8.5, f: C.mut });
  s += T(x(4) + 10, y(0) - 4, lk(Y[4].termLoan), { z: 10.5, b: 1 }) + T(x(4) + 38, y(0) - 4, 'Term loan left', { z: 8.5, f: C.mut });
  return svg(w, h, s + ln(l, base, r, base, C.grey, 1));
}
/** The lowest year's cover in each case, against the level. */
function whatIfChart(w, h) {
  const l = 150, r = w - 40, x = (v) => l + (v / 3) * (r - l), rows = F.whatIf, rh = (h - 44) / rows.length;
  let s = [0, 1, 2, 3].map((t) => ln(x(t), 22, x(t), h - 20, t ? C.hair : C.grey, 1) + T(x(t), h - 7, t + '×', { z: 8, a: 'middle', f: C.faint })).join('');
  rows.forEach((c, i) => {
    const yy = 28 + i * rh, v = c.lowest.dscr, worst = c.id === 'costs';
    s += T(0, yy + 12, c.label, { z: 9.5, b: c.id === 'base' }) + R(l, yy + 2, x(v) - l, 14, c.id === 'base' ? C.slate : worst ? C.amber : C.teal) + T(x(v) + 6, yy + 13, x2(v), { z: 10.5, b: 1 });
  });
  s += ln(x(LEVEL.low), 12, x(LEVEL.low), h - 20, C.ink, 1.6) + T(x(LEVEL.low) + 5, 10, `${x2(LEVEL.low)}: the level read against`, { z: 8.5, b: 1 });
  return svg(w, h, s);
}
/** How much of each year's sales it takes to cover every cost. */
function bepChart(w, h) {
  const l = 56, r = w - 96, rh = (h - 6) / 5;
  return svg(w, h, Y.map((yr, i) => {
    const yy = 3 + i * rh, cut = l + ((r - l) * yr.bepPct) / 100;
    return T(0, yy + 14, yr.fy, { z: 9, f: C.mut }) + R(l, yy + 2, cut - l - 1, 17, C.slate) + R(cut + 1, yy + 2, r - cut - 1, 17, C.tint) + T(cut - 6, yy + 14, p1(yr.bepPct), { z: 9.5, a: 'end', f: '#fff', b: 1 }) + T(r + 8, yy + 14, `of ${lk(yr.sales)}`, { z: 9, f: C.mut });
  }).join(''));
}
function useChart(w, h) {
  const base = h - 20, top = 22, band = w / 5, y = (v) => base - (v / 100) * (base - top);
  return svg(w, h, ln(0, y(100), w, y(100), C.hair, 1) + T(w, y(100) - 4, 'Full running', { z: 8, a: 'end', f: C.faint }) + Y.map((yr, i) => { const cx = band * (i + 0.5); return col(cx - 12, y(yr.utilisationPct), 24, base - y(yr.utilisationPct), C.teal) + T(cx, y(yr.utilisationPct) - 6, yr.utilisationPct + '%', { z: 10, a: 'middle', b: 1 }) + T(cx, base + 13, yr.fy, { z: 8.5, a: 'middle', f: C.mut }); }).join('') + ln(0, base, w, base, C.grey, 1));
}
/** Two bars of one length: what the money buys, and where it comes from. */
function fundsBar(items, colours) {
  let x = 0; const w = 640;
  return svg(w, 24, items.map((it, i) => { const ww = (it.amount / B.projectCost) * w, s = R(x + (i ? 1.5 : 0), 0, ww - (i ? 1.5 : 0), 24, colours[i]); x += ww; return s; }).join(''));
}
const legend = (items) => `<div class="lg">${items.map(([c, t, kind]) => `<span><i class="${kind || ''}" style="background:${c}"></i>${t}</span>`).join('')}</div>`;
const photo = (what, cls = '') => `<div class="photo ${cls}"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 7h3l1.5-2h7L17 7h3v12H4z" fill="none" stroke="#64748b" stroke-width="1.3" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.4" fill="none" stroke="#64748b" stroke-width="1.3"/></svg><b>The promoter’s photo</b><span>${what}</span></div>`;

// Statements: the report's own tables (site/src/report/document.ts), restyled. Their text is the engine's, untouched.
function statement(T0, notes = {}) {
  const head = `<tr><th>${T0.columns[0].label}</th><th class="nt">Note</th>${T0.columns.slice(1).map((c) => `<th>${c.label}</th>`).join('')}</tr>`;
  const rows = T0.rows.map((r) => {
    const lab = r.cells[0].text, k = Object.keys(notes).find((n) => lab.startsWith(n));
    if (r.kind === 'head') return `<tr class="hd"><td colspan="${T0.columns.length + 1}">${lab}</td></tr>`;
    return `<tr class="${r.kind === 'total' ? 'tot' : r.kind === 'ratio' ? 'ratio' : ''}"><td>${lab}</td><td class="nt">${k ? notes[k] : ''}</td>${r.cells.slice(1).map((c) => `<td>${c.text}</td>`).join('')}</tr>`;
  }).join('');
  return `<table class="st">${head}${rows}</table>`;
}
const exhibit = (no, title, sub, body, src) => `<figure class="ex"><div class="no">Exhibit ${no}</div><h3>${title}</h3>${sub ? `<div class="sub">${sub}</div>` : ''}${body}${src ? `<div class="src">${src}</div>` : ''}</figure>`;
const stat = (no, title, unit, body) => `<figure class="ex"><div class="no">Statement ${no}</div><h3>${title}</h3><div class="sub">${unit}</div>${body}</figure>`;
const kf = (l, v, s) => `<div class="kf"><div class="l">${l}</div><div class="v">${v}</div>${s ? `<div class="s">${s}</div>` : ''}</div>`;
let pageNo = 0;
const page = (section, body, cls = '') => { pageNo += 1; return `<section class="page ${cls}"><div class="run"><span><b>${F.state.name}</b> · Project report</span><span>${section}<i class="tag">Example</i></span></div>${body}<div class="foot"><span>Figures worked out by FinSight’s engine on the basis in the notes. An example: ${F.state.name} is a fictional business.</span><span class="pg">${String(pageNo).padStart(2, '0')}</span></div></section>`; };
const head = (k, t, lede) => `<div class="kick">${k}</div><h2 class="act">${t}</h2>${lede ? `<p class="lede">${lede}</p>` : ''}`;
const miniRows = (rows) => `<table class="mini">${rows.map(([a, b, c]) => `<tr class="${c || ''}"><td>${a}</td><td>${b}</td></tr>`).join('')}</table>`;
const costRows = tableAfter('Cost', '3.1').rows.map((r) => [r.cells[0].text, r.cells[1].text, r.kind === 'total' ? 'tot' : '']);
const meansRows = tableAfter('Cost', '3.2').rows.map((r) => [r.cells[0].text, r.cells[1].text, r.kind === 'total' ? 'tot' : '']);
const fy = `${Y[0].fy} to ${Y[4].fy}`;
const dscrs = Y.map((y) => y.dscr);

const pages = [];
// 1. Cover
pageNo += 1;
pages.push(`<section class="page cover"><div class="cv-top"><span class="kick">Project report</span><i class="tag">Example · a fictional business</i></div>
<h1>${F.state.name}</h1><p class="cv-sub">A unit to roast and pack chana and peanuts<br>${F.state.address}</p>
<div class="cv-facts">${kf('Term loan asked', lakh(B.finance.termLoan), `at ${SLOT.rate} a year, ${N} monthly instalments`)}${kf('Working-capital limit asked', lakh(B.wcLimit))}${kf('Cost of the project', lakh(B.projectCost), `the promoters bring ${SLOT['promoter.pct']}`)}</div>
<div class="cv-art"><div class="cv-cap"><b>The cash the unit earns for the loan, year by year</b><span>₹ lakh. The line is the payment due each year, ${lakh(Y[0].service)}.</span></div>${cashChart(640, 356, true)}</div>
<div class="cv-foot"><div><b>Projections for ${fy}</b><br>${FACTS.Constitution} · Prepared by the promoters on 14 November 2026</div><div>Figures worked out by FinSight’s engine from the promoters’ facts.<br>This report gives no opinion on the loan: the lender decides.</div></div></section>`);

// 2. At a glance
pages.push(page('The project at a glance', head('1 · The project at a glance', fill('A {cost} unit to roast and pack snacks at Nashik, asking a term loan of {loan}')) + `<div class="cols"><div class="rail">
${kf('Cost of the project', lakh(B.projectCost))}${kf('Term loan asked', lakh(B.finance.termLoan), `${SLOT.rate} a year · ${N} instalments`)}${kf('The promoters bring', lakh(B.finance.promoter), `${SLOT['promoter.pct']} of the cost`)}${kf('Average DSCR', SLOT['dscr.avg'], `read against ${SLOT['level.avg']}`)}${kf('Lowest DSCR', SLOT['dscr.low'], `in ${B.lowest.fy} · read against ${SLOT['level.low']}`)}${kf('Break-even', SLOT['bep.1'], `of sales in ${Y[0].fy}`)}</div><div>
${P(`${F.state.name}, a partnership firm, proposes a unit at ${F.state.address}, to roast, season and pack chana and peanuts for shops and wholesalers in the district.`)}
${P('The project costs {cost}. The partners bring {promoter} ({promoter.pct}) and ask a term loan of {loan} at {rate} a year, repaid in {n} monthly instalments of {instalment} once sales start, {mor} months after the loan is first drawn. A working-capital limit of {wc} is asked alongside.')}
<p>${claim(Math.min(...dscrs) === B.lowest.dscr, 'On the basis set out in the notes, the cash the unit earns for the loan covers each year’s payment at least {dscr.low} times, in {dscr.low.fy}, and {dscr.avg} times on average over the loan.')}</p>
<div class="flow4"><div><em>Goes in</em>Raw chana and groundnut, salt and spices, packing material, power</div><div><em>What the unit does</em>Cleans, roasts, seasons, cools and packs, on one roasting line</div><div><em>Comes out in ${Y[0].fy}</em>${Y[0].products.map((p) => `${p.name}: ${p.units.toLocaleString('en-IN')} ${p.unit}`).join('<br>')}</div><div><em>What it earns in ${Y[0].fy}</em>Sales ${lakh(Y[0].sales)}<br>Profit after tax ${lakh(Y[0].pat)}</div></div>
${exhibit(1, claim(Math.min(...dscrs) > 2 && Y[2].sales > Y[0].sales, 'Sales reach {sales.3} by the third year, and the loan is covered more than twice over in every year'), 'Amounts in ₹ lakh; DSCR in times', `<table class="five"><tr><th></th>${Y.map((y) => `<th>${y.fy}</th>`).join('')}</tr>${[['Sales', 'sales'], ['Profit before interest, depreciation and tax', 'pbdit'], ['Profit after tax', 'pat'], ['Cash available for the loan', 'available'], ['Payment due on the loan', 'service']].map(([l, k]) => `<tr><td>${l}</td>${Y.map((y) => `<td>${lk(y[k])}</td>`).join('')}</tr>`).join('')}<tr class="ratio"><td>DSCR</td>${Y.map((y) => `<td>${x2(y.dscr)}</td>`).join('')}</tr></table>`, 'Source: Statements 1 and 2. The basis of every line is in the notes.')}
</div></div>`));

// 3. Contents
const TOC = [['1', 'The project at a glance', 2], ['2', 'The business and its promoters', 4], ['3', 'Products, process and market', 5], ['4', 'Cost of the project and how it is paid for', 6], ['5', 'Sales, costs and profit', 7], ['6', 'Can the unit repay the loan?', 8], ['7', 'If things go worse than planned', 9], ['8', 'Risks and what the partners will do', 10], ['', 'Statements 1 to 6', 11], ['', 'Notes: the basis of the figures', 14], ['', 'Declaration and papers attached', 15]];
pages.push(page('Contents', `<div class="kick">Contents</div><div class="toc">${TOC.map(([n, t, p]) => `<div class="${n ? '' : 'back'}"><span>${n}</span><span>${t}</span><span>${String(p).padStart(2, '0')}</span></div>`).join('')}</div>
<div class="two" style="margin-top:14mm"><div><div class="kick">How this report is prepared</div>
<p>This report is prepared by the partners of ${F.state.name} to support their application for the loan.</p>
<p>Every figure is worked out by FinSight’s engine from the facts the partners gave. The words are the partners’ own, drafted with FinSight’s help and read and confirmed by them.</p>
<p>The figures for ${Y[0].fy} onwards are projections on the basis in the notes. They are an honest estimate, not a promise. The report gives no opinion on the loan: the lender decides.</p></div>
<div><div class="kick">How to read it</div>
<p><b>Each exhibit says its finding in its title.</b> A reader short of time can read the titles alone, front to back.</p>
<p><b>The small numbers point to the notes.</b> Each line of a statement names the note that gives its basis, as in a company’s annual accounts.</p>
<p><b>The statements sit at the back</b>, in full, in rupees. The exhibits in front are drawn from them, in ₹ lakh.</p></div></div>`));

// 4. Business
pages.push(page('The business and its promoters', head('2 · The business and its promoters', 'Two partners from the snack trade, making and selling their own roasted snacks from Nashik') + `<div class="cols"><div class="rail">
${miniRows(Object.entries(FACTS))}${photo('The partners', 'tall')}</div><div>
${P(`<b>Who they are.</b> ${F.state.name} is a partnership firm set up to make roasted snacks. Its partners have worked in the snack trade in Nashik district: one buying pulses and groundnut at the market yards, the other selling packed snacks to shops. They will run the unit themselves. One looks after buying and the roasting floor; the other after orders, delivery and collection.`)}
${P('<b>Where the unit stands.</b> The unit is at Example village, close to the Nashik market yards where chana and groundnut are traded, and to the towns where the snacks will sell. The building is a single shed with a roasting hall, a packing room and a store.')}
${P('<b>Why it starts this size.</b> The firm opens with two products that share one roasting line and sells within the district. It plans to run at {use.1} of its capacity in the first year and {use.3} by the third (note 2), so the loan does not rest on a full house from the first month.')}
<div class="photos two">${photo('The site at Example village')}${photo('The shed, as built or as planned')}</div>
${exhibit(2, fill('From the first draw of the loan to the first sale takes {mor} months'), '', `<div class="time"><div><em>${DRAWN}</em>Term loan first drawn</div><div class="wide"><em>${MOR} months</em>Building, machines, trial runs. Interest in these months, ${SLOT.idc}, is paid by the partners.</div><div><em>${Y[0].fy}</em>First sales</div><div class="wide"><em>${N} instalments</em>${SLOT.instalment} a month, principal and interest</div></div>`, 'Source: the terms of the loan asked. Note 9.')}
</div></div>`));

// 5. Products, process, market
const prod = F.state.products.map((p, i) => `<tr><td>${p.name}</td><td>${p.units} ${p.unit} a month</td><td>₹${p.price} a ${p.unit}</td><td>${Y[0].products[i].units.toLocaleString('en-IN')} ${p.unit}</td><td>${lk(Y[0].products[i].sales)}</td></tr>`).join('');
pages.push(page('Products, process and market', head('3 · Products, process and market', 'Two products from one roasting line, sold to shops within the district') + `
${exhibit(3, 'Raw chana and groundnut become packed snacks in six steps on one line', '', `<div class="proc">${['Raw material in|Chana and groundnut from the market yards, weighed and stored', 'Cleaning and grading|Stones, dust and broken grain taken out', 'Roasting|In the roaster, batch by batch', 'Seasoning|Salt and spices added while warm', 'Cooling|On trays, so the packs stay crisp', 'Packing and dispatch|Weighed, sealed, boxed and sent out'].map((s, i) => { const [a, b] = s.split('|'); return `<div><i>${i + 1}</i><b>${a}</b><span>${b}</span></div>`; }).join('')}</div><div class="photos three">${photo('The roaster')}${photo('The packing machine')}${photo('The finished packs')}</div>`, 'The steps are as the partners described them. Machines are as in the suppliers’ quotations (attached).')}
<div class="two wide-left"><div>${exhibit(4, fill('At full running the line makes two products at one price'), `Sales in ${Y[0].fy} in ₹ lakh`, `<table class="five left2"><tr><th>Product</th><th>At full running</th><th>Price</th><th>Sold in ${Y[0].fy}</th><th>Sales</th></tr>${prod}<tr class="tot"><td>Total</td><td></td><td></td><td></td><td>${lk(Y[0].sales)}</td></tr></table>`, 'Source: Statement 1. Notes 1 and 2.')}</div>
<div>${exhibit(5, fill('The unit fills to {use.3} of its capacity by the third year'), 'Use of the capacity', useChart(220, 120), 'Note 2.')}</div></div>
<div class="two">${P('<b>Who buys.</b> Roasted chana and peanuts are everyday snacks, sold loose and in small packs by grocery shops, tea stalls and sweet shops. The firm will sell under its own name to shops and wholesalers in Nashik district, delivering with its own vehicle.')}${P('<b>Why they will buy.</b> Buyers are many and small, and no one buyer is expected to take a large share. The firm competes on freshness and steady supply. Shops that stock the packs are expected to order again each week.')}</div>`));

// 6. Cost and finance
pages.push(page('Cost of the project and how it is paid for', head('4 · Cost of the project and how it is paid for', fill('The partners bring {promoter.pct} of a {cost} project; a term loan of {loan} pays for the rest')) + `
${exhibit(6, 'Two-thirds of the money buys plant and machinery; the loan is smaller than the machines it pays for', 'Each bar is the whole cost of the project. Amounts in ₹ lakh.', `<div class="fund"><em>What the money buys</em>${fundsBar([B.cost[1], B.cost[0], B.cost[3], B.cost[2]], [C.teal, '#5fbdb3', '#a5dbd4', C.tint])}${legend([[C.teal, `${B.cost[1].label} <b>${lk(B.cost[1].amount)}</b>`], ['#5fbdb3', `${B.cost[0].label} <b>${lk(B.cost[0].amount)}</b>`], ['#a5dbd4', `${B.cost[3].label} <b>${lk(B.cost[3].amount)}</b>`], [C.tint, `Interest before sales start <b>${lk(B.cost[2].amount)}</b>`]])}
<em>Where it comes from</em>${fundsBar([{ amount: B.finance.termLoan }, { amount: B.finance.promoter }], [C.slate, C.teal])}${legend([[C.slate, `Term loan <b>${lk(B.finance.termLoan)}</b>`], [C.teal, `The partners’ own money <b>${lk(B.finance.promoter)}</b> (${SLOT['promoter.pct']})`]])}</div>`, 'Source: the tables below. Notes 8 and 9.')}
<div class="two"><div><div class="kick">Cost of the project, in rupees</div>${miniRows(costRows)}</div><div><div class="kick">Means of finance, in rupees</div>${miniRows(meansRows)}
<div class="kick" style="margin-top:6mm">Loans asked</div>${miniRows([['Term loan', `${inr(B.finance.termLoan)} at ${SLOT.rate} a year`], ['Repayment', `${N} monthly instalments of ${SLOT.instalment}, after ${MOR} months`], ['Working-capital limit', `${inr(B.wcLimit)} at ${SLOT.rate} a year`]])}</div></div>
<div class="two" style="margin-top:5mm">${P('<b>The machines.</b> Plant and machinery is the largest head, at the prices in the suppliers’ quotations, which are attached. The building is a shed with a roasting hall, a packing room and a store.')}${P('<b>Before sales start.</b> Interest on the term loan in the months before the first sale, {idc}, is paid by the partners and counted in the cost (note 9). The margin for working capital, {margin}, is part of the cost of the project (note 8).')}</div>`));

// 7. Performance
pages.push(page('Sales, costs and profit', head('5 · Sales, costs and profit', claim(Y[2].sales > Y[0].sales && Y[2].pat > Y[0].pat, 'Sales rise from {sales.1} to {sales.3} as the unit fills its capacity, and profit after tax reaches {pat.3}')) + `
${exhibit(7, claim(Y.every((y) => y.pbdit > 0), 'Of every year’s sales, what is left after running costs is enough to carry the loan'), 'Each column is the year’s sales, in ₹ lakh, split into what they cost and what is left', legend([[C.teal, 'Left before interest, depreciation and tax'], [C.grey, 'Fixed costs'], [C.greyl, 'Materials and other variable costs']]) + salesChart(640, 250), 'Source: Statement 1. Notes 1 to 4.')}
<table class="five"><tr><th>₹ lakh</th>${Y.map((y) => `<th>${y.fy}</th>`).join('')}</tr>${[['Sales', 'sales'], ['Materials and other variable costs', 'variable'], ['Fixed costs', 'fixed'], ['Profit before interest, depreciation and tax', 'pbdit'], ['Profit after tax', 'pat']].map(([l, k]) => `<tr class="${k === 'pat' ? 'tot' : ''}"><td>${l}</td>${Y.map((y) => `<td>${lk(y[k])}</td>`).join('')}</tr>`).join('')}<tr><td>Net profit margin</td>${Y.map((y) => `<td>${p1(y.netMarginPct)}</td>`).join('')}</tr></table>
<div class="two" style="margin-top:7mm">${P('<b>What drives sales.</b> Sales follow the capacity in use (note 2), at prices held level over the five years (note 1). No growth in price is counted on.')}<p>${claim(Y[4].pbdit < Y[2].pbdit && Y[4].sales === Y[2].sales, '<b>What drives profit.</b> Variable costs stay at {var} of sales (note 3). Fixed costs grow each year (note 4) while sales hold from the third year, so profit before interest, depreciation and tax eases from {pbdit.3} to {pbdit.5}. The projection does not hide this.')}</p></div>`));

// 8. Repayment
pages.push(page('Can the unit repay the loan?', head('6 · Can the unit repay the loan?', fill('The cash the unit earns covers every year’s payment at least {dscr.low} times')) + `<div class="cols"><div class="rail">
${kf('Average DSCR', SLOT['dscr.avg'], `read against ${SLOT['level.avg']}`)}${kf('Lowest DSCR', SLOT['dscr.low'], `in ${B.lowest.fy} · read against ${SLOT['level.low']}`)}${kf('Payment due each year', lakh(Y[0].service), `${SLOT.instalment} a month`)}${kf('Interest cover', SLOT['cover.1'], `in ${Y[0].fy}`)}
<p class="railnote">The levels are FinSight’s default benchmarks (note 10). A lender may read against its own.</p></div><div>
${exhibit(8, claim(B.lowest.fy === Y[0].fy, 'The tightest year is the first, {dscr.low.fy}, and even then the cash is {dscr.low} times the payment'), 'Columns: cash available for the loan. Line: the payment due. ₹ lakh; DSCR in times above each column.', legend([[C.teal, 'Cash available for the loan'], [C.ink, 'Payment due: principal and interest', 'bar']]) + cashChart(470, 250), 'Source: Statement 2.')}
${exhibit(9, claim(Y[1].cash > Y[1].termLoan && Y[0].cash < Y[0].termLoan && Y[4].termLoan === 0, 'By the end of {fy.2} the cash in hand is more than the loan left; the loan is cleared in {fy.5}'), 'At each year end, ₹ lakh', runoffChart(470, 190), 'Source: Statement 3.')}
</div></div>`));

// 9. What if
pages.push(page('If things go worse than planned', head('7 · If things go worse than planned', claim(W.costs.lowest.dscr > LEVEL.low, 'With costs a tenth higher, the lowest year’s cover is {wi.costs.low}: thinner, and still above the level of {level.low}')) + `
${exhibit(10, claim(F.whatIf.every((w) => w.lowest.dscr > LEVEL.low), 'In each case tried, the lowest year still clears the level'), 'DSCR in the lowest year. Each case is the whole projection worked again with one input changed.', whatIfChart(640, 150) + `<table class="five" style="margin-top:3mm"><tr><th>The case</th><th>Average DSCR</th><th>Lowest DSCR</th><th>Profit after tax, ${Y[0].fy}</th><th>Lowest cash and bank</th></tr>${F.whatIf.map((w) => `<tr class="${w.id === 'base' ? 'tot' : ''}"><td>${w.label}</td><td>${x2(w.average)}</td><td>${x2(w.lowest.dscr)} in ${w.lowest.fy}</td><td>${lk(w.firstPat)}</td><td>${lk(w.lowestCash)}</td></tr>`).join('')}</table>`, 'Amounts in ₹ lakh. “Costs a tenth higher” raises both the variable and the fixed costs by a tenth.')}
${exhibit(11, claim(Y[2].bepPct > 45 && Y[2].bepPct < 55, 'The unit covers all its costs at {bep.1} of first-year sales, and at about half of sales from the third year'), 'Dark: the share of the year’s sales needed to cover every cost. Light: sales beyond that. Sales in ₹ lakh.', bepChart(640, 132), 'Source: Statement 2. Costs here include depreciation and interest.')}
<div class="two">${P('<b>What hurts most.</b> Of the three cases, higher costs bite hardest: the average cover falls to {wi.costs.avg} and the lowest to {wi.costs.low}. Section 8 says what the partners will do about raw-material prices.')}${P('<b>What hurts least.</b> A rate one point higher moves the lowest cover only to {wi.rate.low}. The unit’s cash is far more sensitive to its own costs and sales than to the price of the loan.')}</div>`));

// 10. Risks
const RISKS = [['Raw chana and groundnut prices swing with the season', fill('The margin thins. Costs a tenth higher take the lowest cover to {wi.costs.low} (Exhibit 10).'), 'Buy at the market yards in season and hold stock within the working-capital limit. Revise pack prices when the market moves.'], ['Sales build more slowly than planned', fill('Sales a tenth lower take the lowest cover to {wi.sales.low} (Exhibit 10).'), 'Start with the shops the partners already supply. Add towns one at a time. The plan counts on only part of the capacity in the first two years (note 2).'], ['A power cut or a roaster breakdown stops the line', 'Lost days of production in a month.', 'A service agreement with the machine’s supplier, common spares kept at the unit, and stock of finished packs for a few days’ orders.'], ['Shops pay late', fill('Cash is tied up beyond the days planned (note 8).'), 'Collect on delivery rounds each week. Stop supply to a shop that falls behind.'], ['Food-safety rules', 'A lapse can stop sales.', 'Keep the food-safety registration current, keep batch records, and train the workers in clean handling.'], ['The unit depends on its two partners', 'Work suffers if one is away.', 'Each partner knows both buying and selling. A senior worker is trained to run the roasting floor.']];
pages.push(page('Risks and what the partners will do', head('8 · Risks and what the partners will do', 'The two risks that matter most are raw-material prices and the first years’ sales; each has a stated answer') + `
<table class="risk"><tr><th>The risk</th><th>What it would do</th><th>What the partners will do</th></tr>${RISKS.map(([a, b, c], i) => `<tr><td><i>${i + 1}</i><b>${a}</b></td><td>${b}</td><td>${c}</td></tr>`).join('')}</table>
<p class="railnote" style="margin-top:6mm;max-width:120mm">The figures in the middle column are the engine’s what-if cases. The words are the partners’. The report does not rank the risks or score them: the lender forms its own view.</p>`));

// 11 to 13. Statements
const plNotes = { 'Use of the capacity': '2', Sales: '1, 2', 'Less: materials': '3', 'Less: fixed': '4', 'Less: depreciation': '5', 'Less: preliminary': '5', 'Less: interest': '6', 'Less: tax': '7' };
pages.push(page('Statements', `${stat(1, 'Projected profit and loss', tableAfter('Statements', '5.2').unit, statement(tableAfter('Statements', '5.2'), plNotes))}${stat(2, 'Debt service coverage', tableAfter('ratios', '6.1').unit, statement(tableAfter('ratios', '6.1'), { 'DSCR (A': '10', 'Add: depreciation': '5', 'Add: preliminary': '5', 'Interest on the term loan': '6' }))}`, 'stp'));
pages.push(page('Statements', `${stat(3, 'Projected balance sheet, at each year end', tableAfter('Statements', '5.3').unit, statement(tableAfter('Statements', '5.3'), { Stock: '8', Debtors: '8', Creditors: '8', 'Term loan': '6', 'Less: depreciation': '5' }))}${stat(4, 'Key ratios', tableAfter('ratios', '6.3').unit, statement(tableAfter('ratios', '6.3'), { DSCR: '10' }))}`, 'stp'));
pages.push(page('Statements', `${stat(5, 'Projected cash flow', tableAfter('Statements', '5.4').unit, statement(tableAfter('Statements', '5.4'), {}))}${stat(6, 'Working capital', tableAfter('ratios', '6.4').unit, statement(tableAfter('ratios', '6.4'), { Stock: '8', Debtors: '8', 'Less: creditors': '8' }))}<p class="railnote">The full report also carries the sales by product, the break-even working and the repayment schedule, instalment by instalment.</p>`, 'stp'));

// 14. Notes
const NOTES = [['Sales', `${Object.entries(BASIS).filter(([k]) => k.startsWith('Sales:')).map(([k, v]) => `${k.replace('Sales: ', '')}: ${v}`).join('. ')}. The prices: ${BASIS['The prices'].toLowerCase()}.`], ['Use of the capacity', `${BASIS['Use of the capacity']}, and held there.`], ['Materials and other variable costs', `${BASIS['Materials and other variable costs']}, the same share every year.`], ['Fixed costs', `In a full first year: ${BASIS['Fixed costs in a full first year']}.`], ['Depreciation and write-off', 'Depreciation is on the written-down value. Preliminary expenses are written off in five equal parts.'], ['Interest', `The term loan at ${SLOT.rate} a year, from its repayment schedule. Working capital: the limit at ${SLOT.rate} a year.`], ['Tax', 'Worked out for a partnership firm or LLP. The rule was verified at its source on 12-10-2026.'], ['Stock, debtors and creditors', `${BASIS['Stock, debtors and creditors']}, of a full year’s figures. The margin for working capital, part of the cost of the project, comes from these.`], ['The months before sales', `${BASIS['Months from the loan to the first sales']} months from the loan to the first sales. The term loan is first drawn in ${DRAWN}. Interest in these months, ${SLOT.idc}, is paid by the partners and counted in the cost of the project.`], ['The levels', `DSCR is read against ${SLOT['level.avg']} on average and ${SLOT['level.low']} in the lowest year. These are FinSight’s default benchmarks; a lender may read against its own.`]];
pages.push(page('Notes', head('Notes · The basis of the figures', 'Ten notes carry every assumption behind the projections') + `<div class="notes">${NOTES.map(([t, s], i) => `<div><i>${i + 1}</i><div><b>${t}</b><p>${s}</p></div></div>`).join('')}</div>
<p class="railnote" style="margin-top:6mm;max-width:130mm">How the figures are worked out: sales are the capacity, its use and the price; profit before interest, depreciation and tax is sales less variable and fixed costs; interest on the term loan is from its repayment schedule. The full working is in the annex of the full report and in the Excel copy.</p>`));

// 15. Declaration
const dec = part('Declaration').blocks;
pages.push(page('Declaration', head('Declaration and papers attached', 'The partners stand behind the facts; the papers behind them are attached') + `<div class="two"><div><div class="kick">Declaration</div><p>${dec.find((b) => b.kind === 'text').text.replace('section 4', 'the notes')}</p>
<div class="sign">${dec.find((b) => b.kind === 'signature').lines.filter(Boolean).map((l, i) => `<div class="${i === 0 ? 'for' : ''}">${l}</div>`).join('')}</div></div>
<div><div class="kick">Papers attached</div><ol class="papers">${['Quotations for the plant and machinery', 'Estimate for the building and civil works', 'The partnership deed', 'Udyam registration', 'Food-safety registration', 'Identity and address papers of the partners', 'Bank statements of the partners'].map((t) => `<li>${t}</li>`).join('')}</ol>
<p class="railnote">The list is the partners’. A lender may ask for more.</p></div></div>`));

const css = `
@font-face{font-family:Figtree;font-weight:300 900;src:url(data:font/woff2;base64,${font('figtree-latin.woff2')}) format('woff2')}
@font-face{font-family:Figtree;font-weight:300 500;src:url(data:font/woff2;base64,${font('rupee-regular.woff2')}) format('woff2');unicode-range:U+20B9}
@font-face{font-family:Figtree;font-weight:600 900;src:url(data:font/woff2;base64,${font('rupee-semibold.woff2')}) format('woff2');unicode-range:U+20B9}
@font-face{font-family:Anek;font-weight:500;font-stretch:75% 125%;src:url(data:font/woff2;base64,${font('anek-latin.woff2')}) format('woff2')}
@page{size:210mm 297mm;margin:0}
*{box-sizing:border-box}html,body{margin:0;padding:0}
body{font-family:Figtree,sans-serif;font-size:9.3pt;line-height:1.5;color:#0f172a;-webkit-print-color-adjust:exact;print-color-adjust:exact;font-variant-numeric:tabular-nums lining-nums}
.page{width:210mm;height:297mm;padding:14mm 16mm 12mm 25mm;position:relative;display:flex;flex-direction:column;break-after:page;overflow:hidden;background:#fff}
.run{display:flex;justify-content:space-between;align-items:center;font-size:7pt;color:#64748b;padding-bottom:2.6mm;border-bottom:.5pt solid #cbd5e1;margin-bottom:9mm}.run b{color:#0f172a;font-weight:650}
.tag{font-style:normal;font-size:6.2pt;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#92400e;border:.6pt solid #d97706;border-radius:1mm;padding:.4mm 1.6mm;margin-left:3mm}
.foot{margin-top:auto;display:flex;justify-content:space-between;align-items:baseline;font-size:6.5pt;color:#64748b;padding-top:2.6mm;border-top:.5pt solid #cbd5e1}.foot .pg{font-family:Anek;font-weight:500;font-size:10.5pt;color:#0f172a}
.kick{font-size:6.9pt;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#0f766e;margin:0 0 2.6mm}
.act{font-family:Anek;font-weight:500;font-stretch:94%;font-size:21pt;line-height:1.1;letter-spacing:-.008em;margin:0 0 7mm;max-width:158mm;text-wrap:balance}
.lede{font-size:10.4pt;line-height:1.45;color:#475569;margin:0 0 6mm;max-width:140mm}
p{margin:0 0 3mm}p b{font-weight:650}
.cols{display:grid;grid-template-columns:38mm minmax(0,1fr);column-gap:7mm}.two{display:grid;grid-template-columns:1fr 1fr;column-gap:8mm}.two.wide-left{grid-template-columns:1.55fr 1fr}
.kf{padding:2.4mm 0 2.6mm;border-top:.5pt solid #cbd5e1}.kf:first-child{border-top:1.2pt solid #0f172a}.kf .l{font-size:7pt;color:#475569}.kf .v{font-family:Anek;font-weight:500;font-size:19pt;line-height:1.12;font-stretch:100%}.kf .s{font-size:6.7pt;color:#64748b}
.railnote{font-size:7.2pt;line-height:1.45;color:#64748b}
.ex{margin:0 0 6.5mm;border-top:1.2pt solid #0f172a;padding-top:2mm}.ex .no{font-size:6.5pt;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#0f766e}
.ex h3{font-size:10.6pt;font-weight:650;line-height:1.25;margin:.7mm 0 .5mm;text-wrap:balance}.ex .sub{font-size:7.3pt;color:#64748b;margin-bottom:2.6mm}
.ex .src{font-size:6.7pt;color:#64748b;margin-top:2.2mm;padding-top:1.3mm;border-top:.5pt solid #e2e8f0}.ex svg{display:block;width:100%;height:auto}svg text{font-family:Figtree}
.lg{display:flex;flex-wrap:wrap;gap:1mm 5mm;font-size:7.4pt;color:#475569;margin:0 0 2mm}.lg span{display:inline-flex;align-items:center;gap:1.4mm}.lg i{width:2.6mm;height:2.6mm;border-radius:.4mm;display:inline-block}.lg i.bar{height:.8mm;width:5mm;border-radius:0}.lg b{color:#0f172a;font-weight:650}
table{border-collapse:collapse;width:100%}
.five{font-size:8pt}.five th{font-size:6.9pt;font-weight:600;color:#475569;text-align:right;padding:1.3mm 0 1.3mm 2mm;border-bottom:.8pt solid #0f172a}.five td{text-align:right;padding:1.3mm 0 1.3mm 2mm;border-bottom:.5pt solid #e2e8f0}
.five th:first-child,.five td:first-child{text-align:left;padding-left:0}.five tr.tot td{font-weight:650}.five tr.ratio td{font-weight:650;background:#f1f8f7;border-bottom:.8pt solid #0f172a}
.five.left2 th:nth-child(2),.five.left2 td:nth-child(2){text-align:left}
.mini{font-size:8pt}.mini td{padding:1.3mm 0;border-bottom:.5pt solid #e2e8f0;vertical-align:top}.mini td:last-child{text-align:right;padding-left:3mm}.mini tr:first-child td{border-top:.8pt solid #0f172a}.mini tr.tot td{font-weight:650;border-bottom:.8pt solid #0f172a}
.rail .mini td{display:block;text-align:left!important;padding:0;border:0}.rail .mini td:first-child{font-size:6.9pt;color:#475569;padding-top:2mm;border-top:.5pt solid #cbd5e1}.rail .mini tr:first-child td:first-child{border-top:1.2pt solid #0f172a}.rail .mini td:last-child{font-weight:650;padding-bottom:2mm;font-size:8.4pt;color:#0f172a}
.st{font-size:7.5pt}.st th{font-size:6.6pt;font-weight:600;color:#475569;text-align:right;padding:1.1mm 0 1.1mm 1.5mm;border-bottom:.8pt solid #0f172a}.st td{text-align:right;padding:1.02mm 0 1.02mm 1.5mm;border-bottom:.5pt solid #e2e8f0}
.st th:first-child,.st td:first-child{text-align:left;padding-left:0;width:36%}.st .nt{width:9mm;text-align:center;color:#0f766e;font-size:6.6pt;font-weight:650}.st tr.tot td{font-weight:650;border-top:.6pt solid #0f172a;border-bottom:.6pt solid #0f172a}
.st tr.hd td{font-weight:700;color:#0f766e;font-size:6.4pt;letter-spacing:.12em;text-transform:uppercase;padding-top:2.6mm;text-align:left}.st tr.ratio td{font-weight:650;background:#f1f8f7}.stp .ex{margin-bottom:6mm}.stp .run{margin-bottom:6mm}
.flow4{display:grid;grid-template-columns:repeat(4,1fr);margin:5mm 0 7mm;border-top:1.2pt solid #0f172a;border-bottom:.5pt solid #cbd5e1}.flow4 div{font-size:7.6pt;line-height:1.4;padding:2.4mm 3mm 3mm 0;position:relative}.flow4 div+div{padding-left:4.4mm}
.flow4 div+div::before{content:"";position:absolute;left:0;top:3.2mm;width:2.2mm;height:2.2mm;border-top:1pt solid #0d9488;border-right:1pt solid #0d9488;transform:rotate(45deg) translate(-40%,40%)}
.flow4 em,.time em,.fund em{display:block;font-style:normal;font-size:6.5pt;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#0f766e;margin-bottom:1.2mm}
.photo{border:.6pt dashed #94a3b8;background:repeating-linear-gradient(135deg,#f8fafc 0 3mm,#f1f5f9 3mm 6mm);border-radius:1mm;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.6mm;font-size:7pt;color:#64748b;aspect-ratio:3/2;text-align:center;padding:2mm}.photo b{color:#475569;font-weight:650}.photo svg{width:5.5mm!important;height:5.5mm!important;flex:none}.photo.tall{aspect-ratio:4/5;margin-top:5mm}
.photos{display:grid;gap:4mm;margin:4mm 0 7mm}.photos.two{grid-template-columns:1fr 1fr}.photos.three{grid-template-columns:repeat(3,1fr);margin:4mm 0 0}.photos.three .photo{aspect-ratio:16/9}
.time{display:grid;grid-template-columns:1fr 2.1fr 1fr 2.1fr;gap:1mm}.time div{font-size:7.4pt;line-height:1.4;padding:2mm 2.4mm;background:#f1f5f9}.time div.wide{background:#cdeae6}.time div:nth-child(4){background:#e2e8f0}
.proc{display:grid;grid-template-columns:repeat(6,1fr);gap:0;margin-top:1mm}.proc div{position:relative;padding:0 3mm 0 0;font-size:7.3pt;line-height:1.38}.proc i{font-style:normal;font-family:Anek;font-weight:500;font-size:15pt;color:#0f766e;display:block;border-top:2pt solid #0d9488;padding-top:1mm;margin-right:-3mm}.proc div:last-child i{margin-right:0}.proc b{display:block;font-size:8pt;font-weight:650;margin-bottom:.6mm}.proc span{color:#475569}
.fund svg{height:6mm!important}.fund em{margin:3mm 0 1.4mm}.fund .lg{margin:1.6mm 0 0}
.risk{font-size:8.1pt;line-height:1.42}.risk th{font-size:6.9pt;font-weight:600;color:#475569;text-align:left;padding:1.4mm 4mm 1.4mm 0;border-bottom:.8pt solid #0f172a}.risk td{vertical-align:top;padding:3mm 4mm 3mm 0;border-bottom:.5pt solid #cbd5e1;width:33%}.risk td:first-child{width:30%;padding-left:8mm;position:relative}.risk td i{position:absolute;left:0;top:2.2mm;font-style:normal;font-family:Anek;font-weight:500;font-size:14pt;color:#0f766e}.risk b{font-weight:650}
.notes{display:grid;grid-template-columns:1fr 1fr;column-gap:9mm}.notes>div{display:grid;grid-template-columns:8mm 1fr;padding:2.6mm 0;border-top:.5pt solid #cbd5e1}.notes>div:nth-child(-n+2){border-top:1.2pt solid #0f172a}.notes i{font-style:normal;font-family:Anek;font-weight:500;font-size:14pt;line-height:1;color:#0f766e}.notes b{font-size:8.4pt;font-weight:650}.notes p{font-size:8pt;line-height:1.45;margin:.6mm 0 0;color:#334155}
.toc div{display:grid;grid-template-columns:10mm 1fr auto;align-items:baseline;padding:2.5mm 0;border-bottom:.5pt solid #cbd5e1;font-size:10.5pt}.toc div:first-child{border-top:1.2pt solid #0f172a}.toc span:first-child,.toc span:last-child{font-family:Anek;font-weight:500;font-size:12pt;color:#0f766e}.toc span:last-child{color:#0f172a}.toc .back{color:#475569;font-size:9.4pt}
.sign{margin-top:16mm;font-size:8.6pt;line-height:1.9}.sign .for{font-weight:650;border-top:.6pt solid #0f172a;padding-top:14mm;margin-top:0;display:inline-block;min-width:60mm}.sign div:nth-child(2){margin-top:0}
.papers{margin:0;padding:0;list-style:none;counter-reset:p}.papers li{counter-increment:p;display:grid;grid-template-columns:8mm 1fr;padding:2.1mm 0;border-bottom:.5pt solid #cbd5e1;font-size:8.8pt}.papers li:first-child{border-top:1.2pt solid #0f172a}.papers li::before{content:counter(p);font-family:Anek;font-weight:500;color:#0f766e;font-size:11pt;line-height:1.2}
.cover{padding-top:20mm}.cv-top{display:flex;justify-content:space-between;align-items:center}.cv-top .kick{margin:0;font-size:8pt}
.cover h1{font-family:Anek;font-weight:500;font-stretch:112%;font-size:60pt;line-height:.98;letter-spacing:-.02em;margin:30mm 0 5mm}.cv-sub{font-size:14pt;line-height:1.35;color:#475569;margin:0 0 14mm}
.cv-facts{display:grid;grid-template-columns:repeat(3,1fr);column-gap:7mm}.cv-facts .kf{border-top:1.2pt solid #0f172a}.cv-facts .kf .v{font-size:22pt}
.cv-art{margin-top:auto}.cv-cap{display:flex;justify-content:space-between;align-items:baseline;font-size:7.4pt;color:#64748b;margin-bottom:1mm}.cv-cap b{font-size:6.9pt;letter-spacing:.15em;text-transform:uppercase;color:#0f766e}.cv-art svg{display:block;width:100%}
.cv-foot{display:grid;grid-template-columns:1fr 1fr;column-gap:8mm;font-size:7.6pt;line-height:1.5;color:#475569;padding-top:4mm;margin-top:5mm;border-top:.5pt solid #cbd5e1}.cv-foot b{color:#0f172a;font-weight:650}.cv-foot div:last-child{text-align:right}
body.slots .slot{background:#fde68a;box-shadow:0 0 0 .5mm #fde68a;border-radius:.5mm}
body.sheet{display:grid;grid-template-columns:repeat(5,210mm);gap:6mm;padding:6mm;background:#475569;width:max-content}
`;
const html = `<!doctype html><html lang="en-IN"><head><meta charset="utf-8"><title>${F.state.name}: project report (specimen)</title><style>${css}</style></head><body>${pages.join('\n')}</body></html>`;
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'specimen.html'), html);

(async () => {
  const { chromium } = require('playwright');
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] }), pg = await b.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 1.6 });
  await pg.goto('file://' + path.resolve(out, 'specimen.html')); await pg.evaluate(() => document.fonts.ready);
  const over = await pg.evaluate(() => [...document.querySelectorAll('.page')].map((p, i) => [i + 1, p.scrollHeight - p.clientHeight, p.scrollWidth - p.clientWidth]).filter((x) => x[1] > 1 || x[2] > 1));
  const t0 = Date.now(); await pg.pdf({ path: path.join(out, 'specimen.pdf'), preferCSSPageSize: true, printBackground: true }); const ms = Date.now() - t0;
  if (flag === '--pages') {
    fs.mkdirSync(path.join(out, 'pages'), { recursive: true });
    const els = await pg.$$('.page');
    for (let i = 0; i < els.length; i++) await els[i].screenshot({ path: path.join(out, 'pages', `p${String(i + 1).padStart(2, '0')}.jpg`), type: 'jpeg', quality: 86 });
    await pg.evaluate(() => document.body.classList.add('slots')); await els[1].screenshot({ path: path.join(out, 'pages', 'p02-slots.jpg'), type: 'jpeg', quality: 86 });
  }
  const sh = await b.newPage({ viewport: { width: 4200, height: 1200 }, deviceScaleFactor: 0.5 });
  await sh.goto('file://' + path.resolve(out, 'specimen.html')); await sh.evaluate(() => { document.body.classList.add('sheet'); return document.fonts.ready; });
  const rowH = 1123 + 23; for (let r = 0; r < Math.ceil(pages.length / 5); r++) await sh.screenshot({ path: path.join(out, `sheet-${r + 1}.png`), fullPage: true, clip: { x: 0, y: r * rowH, width: 4107, height: rowH + 23 } });
  await b.close();
  console.log(JSON.stringify({ pages: pages.length, pdfMs: ms, pdfKb: Math.round(fs.statSync(path.join(out, 'specimen.pdf')).size / 1024), overflow: over }));
})();
