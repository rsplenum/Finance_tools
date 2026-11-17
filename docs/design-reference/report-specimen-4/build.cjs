/**
 * SPEC4 (docs/REPORT-REVIEW.md §11): SPEC3 redrawn to Rahul's review of it. The summary shows the first year's sales and
 * profit after tax; Chapter 10's risks lose "who acts" and "tested by"; Annex A.5 works each key ratio as a sum on paper.
 * SPEC3 (docs/REPORT-REVIEW.md §10, D-DOC-28): the specimen redrawn to Rahul's ten points, for SPEC2's two fictional cases.
 * The report is read by a person, start to finish. What helps a machine or a reviewer audit it stays here, in the marked
 * copy and the factory map, never on the reader's page: no evidence tags, no cross-reference marks, no reading guide.
 *  - Every figure is the engine's, read from figures.json (figures.ts); nothing is worked out here but where a mark sits.
 *  - Words come from pieces with named slots: fill() puts the engine's figure in and refuses any other digit (rule 12).
 *    The borrower's own typed words (cases.cjs) print as typed, through typed().
 *  - claim() keeps a sentence only when the figures bear it out; a failed claim prints nothing, or a plain label.
 *  - A figure shows where the reader needs it (D-DOC-27 set aside); a picture where it says the thing faster than a
 *    table, and never a picture, a table and a paragraph all saying the same numbers.
 *  - The chapters are the credit questions in story order, so the contents page is the guide. The acceptance test (the
 *    nine questions answered from the contents alone) and the plain-words check run here and print to the console.
 *  - Marked copies print, beside each block, the rule that chose it and the piece that wrote it; the last pages list
 *    them all (the factory map), and factory-<case>.json holds the same list for LIB1.
 *   node build.cjs <figures.json> <out dir>
 */
const fs = require('fs'), path = require('path');
const [, , figPath, out] = process.argv;
const ALL = JSON.parse(fs.readFileSync(figPath, 'utf8'));
const { cases: CASES, packs: PACKS } = require('./cases.cjs');
const root = path.resolve(__dirname, '../../..');
const font = (n) => fs.readFileSync(path.join(root, 'site/public/fonts', n)).toString('base64');
const hunt = (o, id) => { if (o && typeof o === 'object') { if (o.id === id) return o; for (const k in o) { const r = hunt(o[k], id); if (r) return r; } } };
const RAT = require(path.join(root, 'engine/data/ratios.json')), REPORT = require(path.join(root, 'engine/data/report.json'));
const LEVEL = { avg: hunt(RAT, 'dscrAverage').fresh, low: hunt(RAT, 'dscrLowest').fresh };
const ASSUMED = (id) => REPORT.assumptions.find((a) => a.id === id);
/** An assumption's reason in the report's words: the site's own instruction ("type …") stays on the site. */
const WHY = (id) => ASSUMED(id).why.split(/;\s*type /)[0].replace(/^./, (c) => c.toLowerCase());

// Formatting only.
const lk = (v) => (v / 1e5).toFixed(2), lakh = (v) => `₹${lk(v)} lakh`, inr = (v) => '₹' + Math.round(v).toLocaleString('en-IN');
const x2 = (v) => v.toFixed(2), p1 = (v) => v.toFixed(1) + '%', num = (v) => Math.round(v).toLocaleString('en-IN');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const lc = (s) => s.replace(/^./, (c) => c.toLowerCase());
const C = { ink: '#0f172a', mut: '#475569', faint: '#64748b', line: '#cbd5e1', hair: '#e2e8f0', teal: '#0d9488', tealD: '#0f766e', tealL: '#99d5cd', slate: '#334155', slateL: '#94a3b8', amber: '#d97706', amberL: '#fcd9a8', red: '#b91c1c' };
const svg = (w, h, b) => `<svg viewBox="0 0 ${w} ${h}" role="img" xmlns="http://www.w3.org/2000/svg">${b}</svg>`;
const T = (x, y, s, o = {}) => `<text x="${x}" y="${y}" font-size="${o.z || 9}"${o.b ? ' font-weight="650"' : ''} text-anchor="${o.a || 'start'}" fill="${o.f || C.ink}">${s}</text>`;
const ln = (x1, y1, x2_, y2, s, w = 1, d = '') => `<line x1="${x1}" y1="${y1}" x2="${x2_}" y2="${y2}" stroke="${s}" stroke-width="${w}"${d ? ` stroke-dasharray="${d}"` : ''}/>`;
const rc = (x, y, w, h, f, o = '') => `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(w, 0).toFixed(1)}" height="${Math.max(h, 0).toFixed(1)}" fill="${f}"${o}/>`;
const WORDS = ['None', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'];

// How firm a buyer is, firmest first, in words a reader cannot misread (point 7).
const FIRM = [['order', 'Written order', 'A dated order, with a quantity'], ['letter', 'Letter of intent', 'Signed, but no quantity is binding'], ['trial', 'Tried samples', 'Has tried the product; no promise yet'], ['enquiry', 'Enquiry only', 'Has asked; nothing more']];

/** The rules the drawing uses: when each applies. LIB1 writes them as dated rule files (engine/data/report/rules/). */
const RULES = {
  cover: 'Every report: the request and the contents on the first page, no chart', summary: 'Every report: one page, no verdict on the loan (D-DOC-03)',
  'summary.favour': 'Findings that hold on the engine’s figures, or confirmed facts; three to five, never padded',
  'summary.watch': 'Findings that miss a usual level or fall short in a case, then the risks’ first rows; three to five',
  'summary.todo': 'Papers still to come and items still open',
  'ch.people': 'Every report', 'ch.what': 'Every report; “make” for goods, “do” for a service', 'ch.why': 'New unit or expansion',
  'ch.buyers': 'Buyers as the borrower names them, by how firm they are', 'ch.prices': 'Competitors’ price bands as the borrower lists them; no market figure of ours (rule 13)',
  'ch.unit': 'A unit with a capacity (manufacturing or service)', 'ch.site': 'A unit with premises', 'ch.inputs': 'Every report',
  'ch.timeline': 'A loan drawn before sales start', 'ch.cost': 'Every report', 'ch.sales': 'Every report; products when sales are by product',
  'ch.repay': 'A term loan', 'ch.cases': 'A term loan; the cases from the trade’s rule file', 'ch.risks': 'Every report: each risk with what it hits, an early sign and a response (who acts and the case that tests it stay in the data)',
  'ch.assume': 'Every report: each assumption with its value and what backs it, in words', 'ch.close': 'Every report',
  'annex.a': 'Every report: the full statements, less those a chapter already gives', 'annex.a.ratios': 'Every report with a balance sheet: each key ratio worked as a sum, every line copied from the statements', 'annex.b': 'A unit with machines',
};

/** The acceptance test (§10, point 1): each credit question answered by a chapter whose title names it. Never printed. */
const ACCEPT = [['What is being set up?', 2], ['Who will run it?', 1], ['Who will buy?', 3], ['How much can be made and sold?', 4, 7], ['What backs the sales plan?', 3, 11], ['How much money, and where does it go?', 6], ['What cash pays the instalments?', 8], ['What can go wrong?', 9, 10], ['What is still unverified?', 11, 12]];
/** Words of the factory, never on the reader's page (point 5). */
const FACTORY_WORDS = /\b(exhibits?|pencil|the register|rule thirteen|trade pack|LIB\d|provenance|evidence class|tightest first|slot|the engine)\b/i;

function build(id, marked) {
  const F = ALL[id], K = CASES[id], PK = PACKS[K.trade], B = F.base, Y = B.years, S = Object.fromEntries(F.scenarios.map((s) => [s.id, s]));
  const part = (n) => F.paper.find((p) => p.name.includes(n));
  const pairsOf = (n) => Object.fromEntries(part(n).blocks.filter((b) => b.kind === 'pairs').flatMap((b) => b.pairs));
  const tableAfter = (n, h) => { const bs = part(n).blocks; const i = bs.findIndex((b) => b.kind === 'heading' && b.text.includes(h)); return (i < 0 ? bs.find((b) => b.kind === 'table') : bs[i + 1]).table; };
  const GL = pairsOf('glance'), BASIS = pairsOf('Basis'), FACTS = pairsOf('Business');
  const terms = GL['Term loan'];
  const [, DRAWN] = /first drawn in ([A-Za-z]+ \d+)/.exec(terms), [, MOR] = /(\d+) months' moratorium/.exec(terms), [, N] = /(\d+) instalments/.exec(terms);
  const low = B.lowest, one = K.promoters.length === 1, svc = K.service;
  const who = one ? K.promoters[0].name.split(' ')[0] : 'The partners', whoL = one ? who : 'the partners', whose = one ? `${who}’s` : 'the partners’';
  const monthName = (ym) => new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1, 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' });
  const reading = low.dscr < 1 ? 'short' : low.dscr >= LEVEL.low && B.average >= LEVEL.avg ? 'comfortable' : 'tight';

  const SLOT = {
    cost: lakh(B.projectCost), loan: lakh(B.finance.termLoan), promoter: lakh(B.finance.promoter), 'promoter.pct': x2(B.finance.promoterPct) + '%', wc: lakh(B.wcLimit),
    rate: F.state.ratePct + '%', n: N, mor: MOR, drawn: DRAWN, start: monthName(F.state.sellFrom), instalment: inr(B.firstInstalment), idc: inr(B.idc.total ?? B.idc),
    'dscr.avg': x2(B.average), 'dscr.low': x2(low.dscr), 'dscr.low.fy': low.fy, 'level.avg': x2(LEVEL.avg), 'level.low': x2(LEVEL.low),
    'fy.1': Y[0].fy, 'fy.last': Y[Y.length - 1].fy, 'use.1': Y[0].utilisationPct + '%', 'use.3': Y[2].utilisationPct + '%',
    'bep.1': p1(Y[0].bepPct), 'bep.3': p1(Y[2].bepPct), 'irr.project': F.worth.project?.irrPct !== undefined ? p1(F.worth.project.irrPct) : '',
    'down.low': x2(S.down.lowest.dscr), 'down.low.fy': S.down.lowest.fy, 'severe.low': x2(S.severe.lowest.dscr), 'severe.low.fy': S.severe.lowest.fy,
    'down.short': S.down.cashShort ? lakh(S.down.cashShort.need) : '', 'severe.short': S.severe.cashShort ? lakh(S.severe.cashShort.need) : '',
    var: F.state.variablePct + '%',
  };
  /** Words with slots in, figures out: any digit outside a slot stops the build, unless it numbers a chapter, page or annex. */
  const fill = (s) => {
    const bare = s.replace(/\{[a-z0-9.-]+\}/g, '').replace(/\b(?:chapters?|annex|page) [A-B]?\d*(?:(?:, | and | to )\d+)*/gi, '').replace(/<[^>]+>/g, '');
    if (/\d/.test(bare)) throw new Error(`${id}: a figure outside a slot: ${bare}`);
    return s.replace(/\{([a-z0-9.-]+)\}/g, (m, k) => { if (!(k in SLOT) || SLOT[k] === '') throw new Error(`${id}: no such slot: ${k}`); return `<span class="slot">${SLOT[k]}</span>`; });
  };
  /** A finding: printed only when the engine's figures bear it out. */
  const claim = (ok, s, fallback = '') => (ok ? fill(s) : fallback);
  const typed = (s) => `<span class="typed">${esc(s)}</span>`;
  const eng = (s) => `<span class="slot">${s}</span>`, es = (s) => `<tspan class="slot">${s}</tspan>`;

  // The factory's marks: the rule that chose a block and the piece that wrote it (shown on the marked copy only).
  const used = [];
  const M = (rule, piece, html, cls = '') => {
    if (!RULES[rule] && !rule.startsWith('pack.')) throw new Error('No such rule: ' + rule);
    used.push({ rule, piece });
    return `<div class="pc ${cls}" data-m="${rule}&#10;${piece}">${html}</div>`;
  };
  const P = (rule, piece, html) => M(rule, piece, `<p>${html}</p>`);
  /** A picture or table: its title says what it shows in plain words; a short note under it says where it comes from. */
  const fig = (rule, piece, title, body, note = '') => M(rule, piece, `<figure class="fg"><h3>${title}</h3>${body}${note ? `<div class="note">${note}</div>` : ''}</figure>`);

  // Pages, and the chapters' places for the contents.
  const pages = [], toc = [];
  const page = (section, body, cls = '') => { pages.push({ section, body, cls }); };
  const chap = (no, title, lede, mid = false) => { toc.push([String(no), title, pages.length + 1]); return `<div class="chap${mid ? ' mid' : ''}"><span class="no">${no}</span><h2 class="act">${title}</h2></div>${lede ? `<p class="lede">${lede}</p>` : ''}`; };
  const h3 = (t) => `<h3 class="sh">${t}</h3>`;
  const facts = (rule, piece, rows) => M(rule, piece, `<table class="fx">${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${typed(v)}</td></tr>`).join('')}</table>`);
  const yrs = Y.map((y) => `<th class="r">${y.fy}</th>`).join('');
  const T_WHAT = svc ? 'What it will do, and why here and now' : 'What it will make, and why here and now';

  // ---------------- Pictures ----------------
  /** Where the money goes and who pays: two columns of the same height, each line labelled with its amount and its backing. */
  const moneyPic = () => {
    const costNote = (c) => (K.costEv[c.id] && K.costEv[c.id][0] === 'quote' ? 'On the ' + lc(K.costEv[c.id][1]) : { idc: `Before the first sale; paid by ${whoL}`, margin: `${one ? 'The proprietor’s' : 'The owners’'} share of the money held in stock and owed by buyers` }[c.id] || '');
    const uses = B.cost.map((c) => ({ label: c.label, v: c.amount, note: costNote(c) }));
    const funds = [{ label: one ? 'The proprietor' : 'The partners', v: B.finance.promoter, note: `${x2(B.finance.promoterPct)}% of the cost, from savings` }, { label: 'Term loan from the bank', v: B.finance.termLoan, note: `Repaid over ${N} months` }];
    const W = 540, H = 262, top = 30, hc = 200, total = B.projectCost, xa = 262, xb = 352, cw = 44;
    const col = (items, x, fills, side) => {
      let y0 = top, s = '';
      const marks = items.map((it, i) => { const h = (it.v / total) * hc, m = { it, y: y0, h, mid: y0 + h / 2, f: fills[i % fills.length] }; y0 += h; return m; });
      marks.forEach((m) => { s += rc(x, m.y, cw, m.h, m.f, ' stroke="#fff" stroke-width="0.8"'); });
      // Labels: three lines each, pushed apart so they never overlap, then pulled back inside the picture.
      const gap = 30, lo = top + 8, hi = top + hc - 22; const ys = marks.map((m) => Math.min(Math.max(m.mid - 8, lo), hi));
      for (let i = 1; i < ys.length; i++) ys[i] = Math.max(ys[i], ys[i - 1] + gap);
      ys[ys.length - 1] = Math.min(ys[ys.length - 1], hi);
      for (let i = ys.length - 2; i >= 0; i--) ys[i] = Math.min(ys[i], ys[i + 1] - gap);
      marks.forEach((m, i) => {
        const tx = side === 'l' ? x - 12 : x + cw + 12, a = side === 'l' ? 'end' : 'start', ex = side === 'l' ? x - 2 : x + cw + 2;
        s += `<polyline fill="none" stroke="${C.slateL}" stroke-width="0.6" points="${ex},${m.mid.toFixed(1)} ${(side === 'l' ? x - 8 : x + cw + 8)},${(ys[i] + 3).toFixed(1)}"/>`;
        s += T(tx, ys[i], esc(m.it.label), { z: 8.4, b: 1, a }) + T(tx, ys[i] + 10.5, es(lakh(m.it.v)), { z: 8.4, a, f: C.tealD }) + T(tx, ys[i] + 20, esc(m.it.note), { z: 6.9, a, f: C.faint });
      });
      return s;
    };
    let s = T(xa + cw, top - 14, 'What the money buys', { z: 8, b: 1, a: 'end', f: C.mut }) + T(xb, top - 14, 'Who pays', { z: 8, b: 1, f: C.mut });
    s += col(uses, xa, ['#475569', '#64748b', '#94a3b8', '#cbd5e1'], 'l') + col(funds, xb, [C.teal, '#1e3a5f'], 'r');
    s += `<path d="M${xa + cw + 4},${top + hc / 2} L${xb - 4},${top + hc / 2}" stroke="${C.slateL}" stroke-width="0.8" marker-end="url(#ar)"/><defs><marker id="ar" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="${C.slateL}"/></marker></defs>`;
    s += ln(xa - 4, top + hc + 6, xb + cw + 4, top + hc + 6, C.ink, 0.8) + T((xa + xb + cw) / 2, top + hc + 20, `Cost of the project, and the money that meets it: ${es(lakh(total))}`, { z: 8.6, b: 1, a: 'middle' });
    return svg(W, H, s);
  };

  /** Buyers by how firm they are, firmest on the left. */
  const buyersPic = () => `<div class="firm"><div class="firm-scale"><span>Firmer</span><i></i><span>Looser</span></div><div class="firm-cols">${FIRM.map(([k, name, what], i) => {
    const bs = K.buyers.filter((b) => b.status === k);
    return `<div class="firm-col f${i}"><div class="firm-h"><b>${name}</b><span>${what}</span></div>${bs.length ? bs.map((b) => `<div class="buyer"><b>${typed(b.who)}</b><span>${typed(b.note)}</span>${b.date !== '—' ? `<em>${typed(b.date)}</em>` : ''}</div>`).join('') : '<div class="buyer none">None yet</div>'}</div>`;
  }).join('')}</div></div>`;

  /** The price ladder: what buyers pay today, band by band, and where this unit's price sits. */
  const priceLadder = () => {
    const unit = F.state.products[0].unit || 'unit', comps = K.competitors.filter((c) => c[3]), ours = {};
    Y[0].products.forEach((p, i) => { (ours[p.price] ||= []).push(F.state.products[i].name); });
    const hiAll = Math.max(...comps.map((c) => c[3][1] ?? c[3][0] * 1.2), ...Object.keys(ours).map(Number));
    const step = hiAll > 200 ? 50 : hiAll > 60 ? 10 : 5, max = Math.ceil((hiAll * 1.22) / step) * step;
    const W = 540, l = 214, r = W - 14, rowH = 24, top = 40, H = top + comps.length * rowH + 26, x = (v) => l + (v / max) * (r - l);
    let s = '';
    for (let v = 0; v <= max; v += step) s += ln(x(v), top - 6, x(v), top + comps.length * rowH, C.hair, 0.6) + (v % (step * 2) === 0 || max / step <= 8 ? T(x(v), top + comps.length * rowH + 12, '₹' + v, { z: 7, a: 'middle', f: C.faint }) : '');
    const priceXs = Object.keys(ours).map((v) => x(Number(v))), clash = (a, b) => priceXs.some((px) => px > a && px < b);
    comps.forEach(([w, , , [lo, hi]], i) => {
      const y = top + i * rowH + 6;
      s += T(l - 8, y + 9, esc(w.length > 50 ? w.slice(0, 48).replace(/\s\S*$/, '') + '…' : w), { z: 7.8, a: 'end', f: C.mut });
      s += hi === null ? `<rect x="${x(lo).toFixed(1)}" y="${y}" width="${(r - x(lo)).toFixed(1)}" height="12" fill="url(#fade)"/>` + T(x(lo) + 4, y + 9, `above ₹${lo}`, { z: 7.2, f: C.ink }) : rc(x(lo), y, x(hi) - x(lo), 12, C.slateL) + (clash(x(hi), x(hi) + 52) ? T(x(lo) - 4, y + 9, `₹${lo} to ₹${hi}`, { z: 7.2, a: 'end', f: C.ink }) : T(x(hi) + 4, y + 9, `₹${lo} to ₹${hi}`, { z: 7.2, f: C.ink }));
    });
    const prices = Object.keys(ours).map(Number).sort((a, b) => a - b);
    prices.forEach((pr, j) => {
      const names = ours[pr], lbl = names.length === F.state.products.length && names.length > 1 ? `Our price, ${names.length === 2 ? 'both' : 'all ' + WORDS[names.length].toLowerCase()} products: ₹${num(pr)} a ${unit}` : `Our price, ${lc(names.join(' and '))}: ₹${num(pr)}`;
      const ty = 12 + j * 12;
      const right = x(pr) > (l + r) / 2;
      s += ln(x(pr), ty + 3, x(pr), top + comps.length * rowH, C.teal, 1.6) + T(x(pr) + (right ? 4 : -4), ty, es(lbl), { z: 7.6, b: 1, a: right ? 'end' : 'start', f: C.tealD });
    });
    s += `<defs><linearGradient id="fade"><stop offset="0" stop-color="${C.slateL}"/><stop offset="1" stop-color="${C.slateL}" stop-opacity="0"/></linearGradient></defs>`;
    return svg(W, H, s);
  };

  /** The process, step by step, with the slowest step marked: it sets how much the unit can do in a day. */
  const processPic = () => `<div class="proc">${PK.process.map(([h, t]) => `<div class="${h === K.slowest ? 'slow' : ''}"><b>${esc(h)}</b><span>${esc(t)}</span>${h === K.slowest ? '<em>Slowest step: sets the day’s output</em>' : ''}</div>`).join('')}</div>`;

  /** From the first draw of the loan to the first sale, month by month. */
  const MON = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const ym = (t, yr) => { const m = /([A-Za-z]{3})[a-z]*(?:\s+(\d{4}))?/.exec(t); return { m: MON.indexOf(m[1].toLowerCase()), y: m[2] ? Number(m[2]) : yr }; };
  const at = (t, yr) => { const v = ym(t, yr); return v.y * 12 + v.m; };
  const span = (w) => { const [a, b] = w.split(' to '); const end = at(b || a); const yEnd = Math.floor(end / 12); let s0 = at(a, yEnd); if (s0 > end) s0 -= 12; return [s0, end]; };
  const timelinePic = () => {
    const d0 = at(DRAWN), sale = at(monthName(F.state.sellFrom)), n = sale - d0 + 1;
    const rows = [[d0, d0, 'Loan first drawn', 'dot'], ...K.timetable.map(([w, t]) => [...span(w), t, 'bar']), [sale, sale, 'First sales; instalments begin', 'dot']];
    const W = 540, l = 200, r = W - 8, top = 22, rowH = 17, H = top + rows.length * rowH + 6, cw = (r - l) / n, x = (m) => l + (m - d0) * cw;
    let s = '';
    for (let i = 0; i < n; i++) { const m = d0 + i; s += rc(l + i * cw, top - 4, cw - 1, rows.length * rowH + 2, i % 2 ? '#f8fafc' : '#f1f5f9') + T(l + i * cw + cw / 2, top - 9, `${MON[m % 12].replace(/^./, (c) => c.toUpperCase())} ${String(Math.floor(m / 12)).slice(2)}`, { z: 7.4, a: 'middle', f: C.mut }); }
    rows.forEach(([a, b, t, k], i) => {
      const y = top + i * rowH + 4;
      s += T(l - 8, y + 7, esc(t), { z: 7.8, a: 'end', b: k === 'dot', f: k === 'dot' ? C.ink : C.mut });
      s += k === 'dot' ? `<circle cx="${(x(a) + cw / 2).toFixed(1)}" cy="${y + 4}" r="4" fill="${C.teal}"/>` : rc(x(a) + 2, y, (b - a + 1) * cw - 5, 9, C.slateL, ' rx="2"');
    });
    return svg(W, H, s);
  };

  /** A bar chart, one bar a year: used for sales against break-even and for the cover against the usual level. */
  const salesBep = () => {
    const W = 540, H = 150, l = 34, r = W - 8, top = 14, base = H - 30, n = Y.length, max = Math.max(...Y.map((y) => Math.max(y.sales, y.bepSales))) * 1.12;
    const bw = Math.min(56, ((r - l) / n) * 0.55), x = (i) => l + ((i + 0.5) * (r - l)) / n, y = (v) => base - (v / max) * (base - top);
    const step = max / 1e5 > 120 ? 25 : max / 1e5 > 40 ? 10 : 5;
    let s = '';
    for (let v = 0; v <= max / 1e5; v += step) s += ln(l, y(v * 1e5), r, y(v * 1e5), v ? C.hair : C.line) + T(l - 4, y(v * 1e5) + 3, String(v), { z: 7, a: 'end', f: C.faint });
    Y.forEach((yr, i) => {
      const under = yr.sales < yr.bepSales;
      s += rc(x(i) - bw / 2, y(yr.sales), bw, base - y(yr.sales), under ? C.amberL : C.tealL);
      s += ln(x(i) - bw / 2 - 7, y(yr.bepSales), x(i) + bw / 2 + 7, y(yr.bepSales), C.ink, 1.8);
      s += T(x(i), y(Math.max(yr.sales, yr.bepSales)) - 5, es(lk(yr.sales)), { z: 7.8, b: 1, a: 'middle' });
      s += T(x(i), base + 11, yr.fy, { z: 7.6, a: 'middle', f: C.mut }) + T(x(i), base + 21, `break-even at ${es(p1(yr.bepPct))}`, { z: 6.9, a: 'middle', f: under ? C.red : C.faint });
    });
    return svg(W, H, s);
  };
  const coverBars = () => {
    const W = 540, H = 186, l = 30, r = W - 92, top = 14, base = H - 20, bars = [...Y.map((y) => [y.fy, y.dscr]), ['Over the loan', B.average]], n = bars.length;
    const max = Math.max(3, Math.ceil(Math.max(...bars.map((b) => b[1])) + 0.3)), bw = Math.min(48, ((r - l) / n) * 0.5), x = (i) => l + ((i + 0.5) * (r - l)) / n + (i === n - 1 ? 6 : 0), y = (v) => base - (Math.max(v, 0) / max) * (base - top);
    let s = '';
    for (let t = 0; t <= max; t++) s += ln(l, y(t), r, y(t), t ? C.hair : C.line) + T(l - 4, y(t) + 3, t + '×', { z: 7, a: 'end', f: C.faint });
    s += ln(x(n - 1) - bw, top, x(n - 1) - bw, base, C.line, 0.6, '2 2');
    bars.forEach(([lbl, v], i) => {
      const f = v < 1 ? C.red : v < LEVEL.low ? C.amber : i === n - 1 ? C.tealD : C.teal;
      s += rc(x(i) - bw / 2, y(v), bw, base - y(v), f) + T(x(i), y(v) - 4, es(x2(v)), { z: 8, b: 1, a: 'middle' }) + T(x(i), base + 11, lbl, { z: 7.6, a: 'middle', f: C.mut, b: i === n - 1 });
    });
    s += ln(l, y(LEVEL.low), r + 4, y(LEVEL.low), C.ink, 1, '4 2') + T(r + 8, y(LEVEL.low) - 1, `usual in any one`, { z: 7, f: C.ink }) + T(r + 8, y(LEVEL.low) - 10, '', {}) + T(r + 8, y(LEVEL.low) + 7, `year, ${x2(LEVEL.low)}`, { z: 7, f: C.ink });
    s += ln(l, y(1), r + 4, y(1), C.red, 0.8, '1.5 2') + T(r + 8, y(1) + 9, 'just enough, 1.00', { z: 7, f: C.red });
    return svg(W, H, s);
  };
  /** The three cases' cover by year, the base's years only. */
  const casesLines = () => {
    const W = 540, H = 170, l = 30, r = W - 110, top = 10, base = H - 20, n = Y.length;
    const max = Math.max(3, Math.ceil(Math.max(...F.scenarios.flatMap((s) => s.dscr.slice(0, n))))), x = (i) => l + 14 + (i * (r - l - 28)) / (n - 1), y = (v) => base - (Math.max(v, 0) / max) * (base - top);
    let s = [...Array(max + 1).keys()].map((t) => ln(l, y(t), r, y(t), t ? C.hair : C.line) + T(l - 4, y(t) + 3, t + '×', { z: 7, a: 'end', f: C.faint })).join('');
    s += ln(l, y(LEVEL.low), r, y(LEVEL.low), C.ink, 1, '4 2') + ln(l, y(1), r, y(1), C.red, 0.8, '1.5 2');
    const col = { base: C.teal, down: C.slate, severe: C.amber }, ends = [];
    F.scenarios.forEach((sc) => {
      const v = sc.dscr.slice(0, n);
      s += `<polyline fill="none" stroke="${col[sc.id]}" stroke-width="${sc.id === 'base' ? 2.4 : 1.6}" points="${v.map((d, i) => `${x(i).toFixed(1)},${y(d).toFixed(1)}`).join(' ')}"/>` + v.map((d, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(d).toFixed(1)}" r="2" fill="${col[sc.id]}"/>`).join('');
      ends.push([y(v[n - 1]), sc.label, col[sc.id]]);
    });
    ends.sort((a, b) => a[0] - b[0]); for (let i = 1; i < ends.length; i++) ends[i][0] = Math.max(ends[i][0], ends[i - 1][0] + 11);
    s += ends.map(([yy, t, c]) => T(r + 8, yy + 3, esc(t), { z: 7.8, b: 1, f: c })).join('');
    s += T(r + 8, y(LEVEL.low) + 3, '', {}) + Y.map((yr, i) => T(x(i), base + 12, yr.fy, { z: 7.4, a: 'middle', f: C.mut })).join('');
    return svg(W, H, s);
  };
  /** The summary's picture: the lowest year and the whole loan, each against its usual level. */
  const coverGauge = () => {
    const W = 260, H = 74, l = 100, r = W - 10, max = Math.max(3, Math.ceil(Math.max(low.dscr, B.average) + 0.2)), x = (v) => l + (Math.max(v, 0) / max) * (r - l);
    const row = (yy, label, v, lvl) => { const f = v < 1 ? C.red : v < lvl ? C.amber : C.teal; return T(l - 6, yy + 8, label, { z: 7.4, a: 'end', f: C.mut }) + rc(l, yy, x(v) - l, 11, f) + T(x(v) + 3, yy + 8.5, es(x2(v)), { z: 8, b: 1 }) + ln(x(lvl), yy - 3, x(lvl), yy + 14, C.ink, 1.2, '2 1.5'); };
    let s = row(6, `Lowest year, ${low.fy}`, low.dscr, LEVEL.low) + row(30, 'Over the loan', B.average, LEVEL.avg);
    for (let t = 0; t <= max; t++) s += T(x(t), 60, t + '×', { z: 6.8, a: 'middle', f: C.faint });
    s += T(l, 71, 'dashes: what lenders usually look for', { z: 6.6, f: C.faint });
    return svg(W, H, s);
  };

  // ---------------- The chapters, in story order (point 10) ----------------
  // 1. Who will run the business; 2. What it will make, and why here and now
  page('Who will run it · What and why', chap(1, 'Who will run the business') +
    `<div class="people">${K.promoters.map((p) => M('ch.people', 'fact.promoter v2', `<div class="person"><div class="nm">${esc(p.name)}</div><div class="rl">${esc(p.role)}</div><p>${typed(p.past)}</p><p><b>Brings:</b> ${typed(lc(p.brings))}.</p></div>`)).join('')}</div>` +
    P('ch.people', 'promoters.share v2', fill(`${one ? 'The proprietor brings' : 'Together the partners bring'} {promoter}, {promoter.pct} of what the project costs. The bank is asked for the rest as a term loan (Chapter 6).`)) +
    h3('The business') + facts('ch.people', 'table.enterprise v2', K.enterprise) +
    P('ch.people', 'fact.privacy v2', fill('Registration numbers, PAN and GSTIN are on the papers themselves and are not printed in this report.')) +
    chap(2, T_WHAT, '', true) +
    P('ch.what', 'what.products v1', `${typed(F.state.name)} will ${svc ? 'offer' : 'make and sell'} ${WORDS[F.state.products.length].toLowerCase()} ${svc ? 'services' : 'products'}: ${F.state.products.map((p) => typed(lc(p.name))).join(F.state.products.some((p) => p.name.includes(',')) ? '; and ' : ' and ')}, ${fill('priced by the')} ${esc(F.state.products[0].unit || 'piece')}.`) +
    K.why.map(([h, t]) => M('ch.why', `why.${h.split(' ')[1]} v2`, `<p><b>${h}?</b> ${typed(t)}</p>`)).join(''));

  // 3. Who will buy, and at what price
  const written = K.buyers.filter((b) => b.status === 'order' || b.status === 'letter');
  page('Who will buy, and at what price', chap(3, 'Who will buy, and at what price', fill(`Who has said they will buy, how firmly, and how the price compares with what buyers pay today.`)) +
    fig('ch.buyers', 'picture.buyers-by-firmness v1', claim(written.length > 0, `${written.length === 1 ? 'One buyer has' : WORDS[written.length] + ' buyers have'} put ${svc ? 'their work' : 'an order or intent'} in writing; the rest are leads`, 'Who has said they will buy'), buyersPic(), `As ${one ? who + ' names' : 'the partners name'} them, at ${esc(K.date)}. A written order or a letter can be shown to the lender; samples and enquiries are leads, not sales.`) +
    M(`pack.${K.trade}`, `pack.${K.trade}.buyers v2`, `<p>${fill(PK.buyers)}</p>`) +
    fig('ch.prices', 'picture.price-ladder v1', 'Where the price sits against what buyers pay today', priceLadder(), `Price bands from ${whose} own survey of who sells to these buyers today; not checked independently.`) +
    M('ch.prices', 'market.reading v2', `<p>${typed(K.market)}</p>`) +
    P('ch.prices', 'market.limit v2', fill('The report gives no figure for the size of the market or its growth: none could be backed by a source. What backs the sales is the buyers above.')));

  // 4. How the unit will work
  const opsRow = (k) => (K.ops.find((o) => o[0] === k) || [])[1];
  page('How the unit will work', chap(4, 'How the unit will work', fill('The steps the work goes through, how much the unit can do, the site, what it buys and who does the work.')) +
    fig('ch.unit', 'picture.process v1', `The ${svc ? 'work' : 'product'} goes through ${WORDS[PK.process.length].toLowerCase()} steps; ${lc(K.slowest)} is the slowest`, processPic(), `${esc(opsRow('The slowest step') || '')}. ${one ? 'The proprietor has' : 'The partners have'} confirmed the unit will run this way.`) +
    `<div class="two">${M('ch.unit', 'table.capacity v2', `<div>${h3('How much it can do')}<table class="reg"><tr><th>${svc ? 'Service' : 'Product'}</th><th class="r">At full running, a month</th></tr>${F.state.products.map((p) => `<tr><td>${esc(p.name)}</td><td class="r">${eng(`${p.units} ${p.unit}`)}</td></tr>`).join('')}</table><p class="small" style="margin-top:2mm">${fill(`A new unit rarely runs full at once: the plan uses {use.1} of this in the first year and {use.3} from the third (Chapter 7).`)}</p></div>`)}
${M('ch.unit', 'table.operating v2', `<div>${h3('How it runs')}<table class="fx tight">${K.ops.filter((o) => o[0] !== 'The slowest step').map(([k, v]) => `<tr><td>${esc(k)}</td><td>${typed(v)}</td></tr>`).join('')}</table></div>`)}</div>` +
    M(`pack.${K.trade}`, `pack.${K.trade}.usual v2`, `<p class="aside">${fill(PK.usual)}</p>`) +
    `<div class="two">${M('ch.site', 'table.site v2', `<div>${h3('The site')}${`<table class="fx tight">${K.site.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${typed(v)}</td></tr>`).join('')}</table>`}</div>`)}${M('ch.inputs', 'table.inputs-people v2', `<div>${h3('What it buys, and from whom')}<table class="fx tight">${K.inputs.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${typed(v)}</td></tr>`).join('')}</table>${h3('Who does the work')}<table class="fx tight">${K.people.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${typed(v)}</td></tr>`).join('')}</table></div>`)}</div>`);

  // 5. From the loan to the first sale; 6. What it costs and how it is paid for
  page('From the loan to the first sale · What it costs', chap(5, 'From the loan to the first sale') +
    fig('ch.timeline', 'picture.timeline v1', fill(`{mor} months from the first draw of the loan to the first sale`), timelinePic(), `The loan’s dates are worked out by FinSight; the steps between are ${whose} plan.`) +
    P('ch.timeline', 'timeline.reading v2', fill(`In these months the unit earns nothing. The interest due on the loan meanwhile, {idc}, is paid by ${whoL} and counted in the cost of the project.`)) +
    chap(6, 'What it costs and how it is paid for', '', true) +
    fig('ch.cost', 'picture.money-in-out v1', fill(`${one ? 'The proprietor pays' : 'The partners pay'} {promoter.pct} of the cost; the bank is asked for the rest`), moneyPic()) +
    P('ch.cost', 'cost.loan v2', fill(`The term loan of {loan} is repaid in {n} monthly instalments of {instalment} from {start}, at {rate} a year.`)) +
    P('ch.cost', 'cost.wc v2', fill(`Alongside, the bank is asked for a working-capital limit of {wc}: money the unit draws as it needs, to carry stock and to wait for buyers to pay. Its size follows from the days of stock and credit in Chapter 11.`)));

  // 7. Sales and profit
  const plRow = (label, f, cls = '') => `<tr class="${cls}"><td>${label}</td>${Y.map((y) => `<td>${eng(f(y))}</td>`).join('')}</tr>`;
  page('Sales and profit', chap(7, 'Sales and profit', fill(`What the unit sells each year, what that costs, and what is left. Break-even is the level of sales at which the business makes neither a profit nor a loss.`)) +
    fig('ch.sales', 'table.sales-profit v1', claim(Y[0].pat > 0, `A profit from the first year, ${'{fy.1}'}, growing as the unit fills`, claim(Y[0].pat <= 0, `A loss in the first year, {fy.1}; a profit from the second`, 'Sales and profit, year by year')),
      `<table class="five"><tr><th>₹ lakh, unless stated</th>${yrs}</tr>${plRow('Share of capacity used', (y) => y.utilisationPct + '%', 'ratio')}${F.state.products.map((p, i) => `<tr class="hd"><td colspan="${Y.length + 1}">${esc(p.name)}</td></tr>${plRow(`Sold, ${p.unit}`, (y) => num(y.products[i].units))}${plRow(`Price, ₹ a ${p.unit}`, (y) => num(y.products[i].price))}${plRow('Sales', (y) => lk(y.products[i].sales))}`).join('')}
${plRow('Sales', (y) => lk(y.sales), 'tot')}${plRow('Materials and other costs that move with sales', (y) => lk(y.variable))}${plRow('Fixed costs: staff, rent, upkeep', (y) => lk(y.fixed))}${plRow('Earnings before interest, depreciation and tax', (y) => lk(y.pbdit), 'tot')}${plRow('Interest on the term loan', (y) => lk(y.tlInterest))}${plRow('Interest on the working-capital limit', (y) => lk(y.wcInterest))}${plRow('Depreciation', (y) => lk(y.depreciation))}${plRow('Profit before tax', (y) => lk(y.pbt))}${plRow('Tax', (y) => lk(y.tax))}${plRow('Profit after tax', (y) => lk(y.pat), 'tot')}</table>`, `Prices are held where they are in every year; fixed costs ${esc((BASIS['Fixed costs in a full first year'].split(', ')[1] || '').replace(/^growing/, 'grow'))}.`) +
    fig('ch.sales', 'picture.sales-breakeven v1', claim(Y[0].bepPct > 100, 'The first year’s sales stop short of break-even; from the second year they clear it', claim(Y[2].bepPct < Y[0].bepPct, 'Sales clear break-even in every year, by more each year', 'Sales against break-even, year by year')), salesBep(), 'Bars: sales, ₹ lakh. Black line: the sales needed to break even. Under each year, break-even as a share of that year’s sales.') +
    (SLOT['irr.project'] ? P('ch.sales', 'worth.reading v2', fill(`Taken over the years of the loan, the project earns back its cost with a return of {irr.project} a year (its internal rate of return); the loan costs {rate}. Annex A gives the working.`)) : ''));

  // 8. Can the business repay the loan?
  const READINGS = {
    comfortable: 'In every year the business earns at least {dscr.low} times what it must pay the bank, above the {level.low} lenders usually look for. Over the whole loan it earns {dscr.avg} times what is due, against the usual {level.avg}.',
    tight: low.fy === Y[0].fy
      ? 'The business can pay in every year, but the first year is thin: in {dscr.low.fy} it earns {dscr.low} times what it must pay, below the {level.low} lenders usually look for in any one year. Over the whole loan it earns {dscr.avg} times, against the usual {level.avg}. Chapter 9 shows what happens if the first year goes worse.'
      : 'The business can pay in every year, with the least room in {dscr.low.fy}: {dscr.low} times what it must pay, below the {level.low} lenders usually look for in any one year. Over the whole loan it earns {dscr.avg} times, against the usual {level.avg}.',
    short: 'In {dscr.low.fy} the business does not earn enough to pay the bank: it earns {dscr.low} times what is due. The gap must come from the owners, or the loan’s size or term must change before it is asked for.',
  };
  const dsRow = (label, f, cls = '') => `<tr class="${cls}"><td>${label}</td>${Y.map((y) => `<td>${eng(lk(f(y)))}</td>`).join('')}</tr>`;
  page('Can the business repay the loan?', chap(8, 'Can the business repay the loan?', fill(`Lenders measure this with the debt service coverage ratio, the DSCR: the cash a year’s business leaves to pay the loan, divided by what the bank is owed that year in interest and instalments. At one the business earns just enough; lenders usually look for at least {level.low} in any one year and {level.avg} over the whole loan.`)) +
    fig('ch.repay', 'picture.cover-by-year v1', { comfortable: fill('The business covers what it owes the bank with room in every year'), tight: fill('Enough to pay in every year; the room is thin in {dscr.low.fy}'), short: fill('In {dscr.low.fy} the business cannot pay from its own cash') }[reading], coverBars(), 'DSCR, times, each year and over the whole loan. Teal: at or above the usual level; amber: below it but enough to pay; red: not enough.') +
    M('ch.repay', `reading.dscr.${reading} v2`, `<div class="reading"><p>${fill(READINGS[reading])}</p></div>`) +
    fig('ch.repay', 'table.cash-for-loan v2', 'Where the cash for the loan comes from, and what is owed', `<table class="five"><tr><th>₹ lakh</th>${yrs}</tr>${dsRow('Profit after tax', (y) => y.pat)}${dsRow('add back depreciation, which is not paid out', (y) => y.depreciation)}${dsRow('add back interest on the term loan', (y) => y.tlInterest)}${dsRow('Cash left to pay the loan', (y) => y.available, 'tot')}${dsRow('Interest on the term loan', (y) => y.tlInterest)}${dsRow('Instalments of the loan', (y) => y.principal)}${dsRow('Owed to the bank in the year', (y) => y.service, 'tot')}</table>`, 'The cover each year is the first total divided by the second, as in the picture above.'));

  // 9. If things go worse
  const lateNote = F.scenarios.some((x) => x.dscr.length > Y.length);
  page('If things go worse', chap(9, 'If things go worse', fill(`Three cases, each worked again in full: what changes, what happens to the cover and the cash, and what ${whoL} would do.`)) +
    fig('ch.cases', 'picture.three-cases v1', claim(!S.severe.cashShort && S.severe.lowest.dscr >= 1, 'The loan is paid in every year in all three cases', claim(!S.down.cashShort, 'Paid in every year if things go worse; not if they go much worse', 'If things go worse, the first year cannot pay from its own cash')), casesLines(),
      `DSCR, times, by year. Dashed black: the usual level in any one year; dotted red: just enough to pay.${lateNote ? ' A late start moves the last instalments into one more year, not drawn here.' : ''}`) +
    M('ch.cases', 'table.cases v2', `<table class="reg sc"><tr><th>Case, and what changes</th><th class="r">Lowest year’s DSCR</th><th class="r">DSCR over the loan</th><th class="r">Cash at the lowest year end</th><th>What ${whoL} would do</th></tr>${F.scenarios.map((s) => {
      const sc = K.scenarios.find((c) => c.id === s.id), base = s.id === 'base';
      const cash = s.cashShort ? `<span class="neg">${eng(lk(s.cashShort.need))} short</span><br><small>first in ${s.cashShort.first}</small>` : eng(lk(s.lowestCash));
      return `<tr class="${base ? 'base' : ''}"><td><b>${esc(s.label)}</b><br><small>${esc(sc.why)}</small></td><td class="r">${eng(x2(s.lowest.dscr))}<br><small>${s.lowest.fy}</small></td><td class="r">${eng(x2(s.average))}</td><td class="r">${cash}</td><td>${base ? '<small>As planned</small>' : typed(K.respond[s.id])}</td></tr>`;
    }).join('')}</table><p class="small" style="margin-top:2mm">${fill('Cash in ₹ lakh. Each case moves only what it names; the tax, the working capital and the cash all follow from it. How big each case is, is assumed for this kind of business (Chapter 11).')}</p>`));

  // 10. What could go wrong, and what is done about it
  page('What could go wrong', chap(10, 'What could go wrong, and what is done about it', fill('Each risk, what it would hit, the first sign that it is happening, and what is done about it.')) +
    M('ch.risks', 'table.risks v3', `<table class="reg risk"><tr><th>Risk, and what it would hit</th><th>First sign</th><th>What is done</th></tr>${K.risks.map((r) => `<tr><td><b>${esc(r.risk)}</b><br><small>Hits: ${esc(lc(r.threatens))}</small></td><td>${typed(r.sign)}</td><td>${typed(r.response)}</td></tr>`).join('')}</table>`));

  // 11. What the figures assume
  const backs = (k) => (K.costEv[k] ? 'On the ' + lc(K.costEv[k][1]) : '');
  const useYears = Y.map((y) => `${y.utilisationPct}% in ${y.fy}`).filter((t, i, a) => i < 3 || t.split(' ')[0] !== a[i - 1].split(' ')[0]);
  const assume = [
    ['When sales start', eng(monthName(F.state.sellFrom)), `${one ? 'The proprietor’s' : 'The partners’'} plan (Chapter 5); the first instalment falls in the same month`],
    ['How much the unit can do at full running', F.state.products.map((p) => eng(`${p.units} ${p.unit} a month of ${lc(p.name)}`)).join('<br>'), `${opsRow('The line') ? 'The line as quoted: ' + esc(lc(opsRow('The line'))) + '; ' : ''}${lc(backs('machinery'))}`],
    ['Share of the capacity used', useYears.map(eng).join(', '), `Assumed: ${esc(WHY('utilisation'))}`],
    ['Prices', F.state.products.map((p, i) => eng(`₹${num(Y[0].products[i].price)} a ${p.unit}`) + ` ${esc(lc(p.name))}`).join('<br>'), `${one ? 'The proprietor’s' : 'The partners’'} price, set against what buyers pay today (Chapter 3); held flat in every year`],
    ['Materials and other costs that move with sales', eng(esc(BASIS['Materials and other variable costs'])), `${one ? 'The proprietor’s' : 'The partners’'} own estimate, from their buying; not yet on quotations`],
    ['Fixed costs in a full first year', eng(esc(BASIS['Fixed costs in a full first year'])), `${one ? 'The proprietor’s' : 'The partners’'} own estimate: staff, rent, the fixed part of power, upkeep`],
    ['Days of stock, of credit to buyers, of credit from suppliers', eng(esc(BASIS['Stock, debtors and creditors'])), `Assumed: ${esc(WHY('days'))}`],
    ['The working-capital limit', esc(ASSUMED('wcUsed').shown), `Assumed: ${esc(WHY('wcUsed'))}`],
    ['Interest rate', eng(SLOT.rate + ' a year'), 'As the lender has indicated; the sanction letter decides'],
    ['Money the owners take out', esc(ASSUMED('drawings').shown), `Assumed: ${esc(WHY('drawings'))}`],
    ['Tax', esc(ASSUMED('tax').shown), `At the rates for a ${esc(lc(FACTS.Constitution || F.state.borrower))}`],
    ['Building and machines', `${eng(lakh(B.cost.find((c) => c.id === 'building').amount))} and ${eng(lakh(B.cost.find((c) => c.id === 'machinery').amount))}`, `${backs('building')}; ${lc(backs('machinery'))}`],
    ['How much worse the cases in Chapter 9 go', esc(K.scenarios.filter((c) => c.id !== 'base').map((c) => `${c.label}: ${lc(c.why.split(': ')[1] || c.why)}`).join('. ')), 'Assumed: sizes chosen for this kind of business, to be set from a dated source'],
  ];
  page('What the figures assume', chap(11, 'What the figures assume', fill('Every figure in this report follows from these. Each says its value and what backs it: a paper, the owners’ own estimate, or an assumption with its reason.')) +
    M('ch.assume', 'table.assumptions v2', `<table class="reg asm"><tr><th>What</th><th>Value</th><th>What backs it</th></tr>${assume.map(([a, v, b]) => `<tr><td><b>${a}</b></td><td>${v}</td><td>${b}</td></tr>`).join('')}</table>`));

  // 12. What is still to be done, and the declaration
  page('Still to be done · Declaration', chap(12, 'What is still to be done, and the declaration') +
    P('ch.close', `close.${reading} v2`, fill({
      comfortable: `${one ? 'The proprietor asks' : 'The partners ask'} a term loan of {loan} and a working-capital limit of {wc} for a project costing {cost}. On what the figures assume, the business pays the bank with room in every year, and Chapter 9 shows how much room is left if things go worse.`,
      tight: `${one ? 'The proprietor asks' : 'The partners ask'} a term loan of {loan} and a working-capital limit of {wc} for a project costing {cost}. On what the figures assume, the loan is paid in every year, with the least room in {dscr.low.fy}; Chapter 9 shows the money ${whoL} would need to find if things go worse.`,
      short: `${one ? 'The proprietor asks' : 'The partners ask'} a term loan of {loan} for a project costing {cost}. On what the figures assume, the cash falls short of what is owed in {dscr.low.fy}; the report shows where, and by how much.`,
    }[reading])) +
    `<div class="two">${M('ch.close', 'table.open v2', `<div>${h3('Still to be done')}<table class="reg"><tr><th>What</th><th>Who</th><th>By when</th></tr>${K.conditions.map(([w, o, b]) => `<tr><td>${esc(w)}</td><td>${esc(o)}</td><td>${esc(b)}</td></tr>`).join('')}</table></div>`)}
${M('ch.close', 'table.papers v2', `<div>${h3('Papers with this report')}<table class="reg"><tr><th>Paper</th><th>Dated</th></tr>${K.papers.filter((p) => p[2] === 'held').map(([w, d]) => `<tr><td>${esc(w)}</td><td class="nw">${typed(d)}</td></tr>`).join('')}</table></div>`)}</div>` +
    `<div class="two" style="margin-top:3mm">${M('ch.close', 'is-and-is-not v2', `<div>${h3('What this report is')}<p>${fill(`${one ? 'The proprietor’s' : 'The partners’'} own project report, made using FinSight. FinSight works out every figure from the facts ${whoL} gave; the words are ${whose} own or chosen for them, and confirmed by them.`)}</p>${h3('What it is not')}<p>${fill(`Not an opinion on the loan, a valuation, an audit or an independent study. Facts given as ${whose} own estimate are not checked by FinSight. The lender decides.`)}</p></div>`)}
${M('ch.close', 'declaration v2', `<div>${h3('Declaration')}<p>${fill(`${one ? 'I declare' : 'We declare'} that the facts in this report are true to the best of ${one ? 'my' : 'our'} knowledge, that the papers with it are true copies, and that ${one ? 'I' : 'we'} will tell the lender of any change before sanction.`)}</p><div class="sign">${K.promoters.map((p) => `<div><span class="for">${esc(p.name)}</span></div>`).join('')}<div class="pl">Place and date ____________________</div></div></div>`)}</div>`);

  // ---------------- The annexes ----------------
  const stTable = (T0) => `<table class="st"><tr>${T0.columns.map((c) => `<th>${c.label}</th>`).join('')}</tr>${T0.rows.map((r) => r.kind === 'head' ? `<tr class="hd"><td colspan="${T0.columns.length}">${r.cells[0].text}</td></tr>` : `<tr class="${r.kind === 'total' ? 'tot' : r.kind === 'ratio' ? 'ratio' : ''}">${r.cells.map((c) => `<td>${c.text}</td>`).join('')}</tr>`).join('')}</table>`;
  // A.5: each key ratio worked as a sum on paper, so a reader checks it by copying, not by working it out (SPEC4).
  // Every line is the engine's own figure for the year; the totals are the engine's two sides of the ratio
  // (ratioParts), and the answer is the engine's ratio. Nothing is added or divided here.
  const RT = (rid) => hunt(RAT, rid);
  const usual = (r) => r && { at: r.at, v: r.fresh };
  const WORK = [
    { id: 'currentRatio', name: 'Current ratio', what: 'What the business owns that turns to cash within a year, against what it owes within a year.', from: 'the balance sheet, A.2',
      top: [['Stock', 'stock'], ['Debtors', 'debtors'], ['Cash and bank', 'cash']], topName: 'Owns, turning to cash within a year', bottom: [['Working-capital loan', 'wcLoan'], ['Creditors', 'creditors']], bottomName: 'Owes within a year', level: usual(RT('currentRatio')) },
    { id: 'debtEquity', name: 'Term loan ÷ net worth', what: 'What the bank has lent for every rupee the owners have in the business.', from: 'the balance sheet, A.2',
      top: [['Term loan', 'termLoan']], bottom: [['Net worth', 'netWorth']], level: usual(RT('debtEquity')) },
    { id: 'tolTnw', name: 'Total outside liabilities ÷ net worth', what: 'All the business owes to others, for every rupee the owners have in it.', from: 'the balance sheet, A.2',
      top: [['Unsecured loans', 'unsecured'], ['Term loan', 'termLoan'], ['Working-capital loan', 'wcLoan'], ['Creditors', 'creditors']], topName: 'Owed to others', bottom: [['Net worth', 'netWorth']], level: usual(RT('tolTnw')) },
    { id: 'interestCover', name: 'Interest cover', what: 'How many times the profit before interest and tax pays the year’s interest.', from: 'profit and loss, A.1',
      top: [['Profit before tax', 'pbt'], ['Interest on the term loan', 'tlInterest'], ['Interest on working capital', 'wcInterest'], ['Guarantee fee', 'guaranteeFee']], topName: 'Profit before interest and tax',
      bottom: [['Interest on the term loan', 'tlInterest'], ['Interest on working capital', 'wcInterest'], ['Guarantee fee', 'guaranteeFee']], bottomName: 'All interest', level: usual(RT('interestCover')) },
    { id: 'netMarginPct', name: 'Net profit margin', what: 'What is left as profit after tax from each hundred rupees of sales: the top divided by the bottom, times a hundred.', from: 'profit and loss, A.1',
      top: [['Profit after tax', 'pat']], bottom: [['Sales', 'sales']], pct: true },
    { id: 'facr', name: 'Net fixed assets ÷ term loan', what: 'The building and machines, after wear, against the term loan still owed.', from: 'the balance sheet, A.2',
      top: [['Net fixed assets', 'netBlock']], bottom: [['Term loan', 'termLoan']], level: usual(RT('facr')), none: 'Loan repaid' },
    { id: 'dscr', name: 'Debt service coverage (DSCR)', what: 'The cash the year leaves to pay the loan, against what the bank is owed that year.', from: 'A.4, where each side is built up',
      top: [['Cash available (A)', 'available']], bottom: [['Debt service (B)', 'service']], level: { at: 'least', v: LEVEL.low } },
  ];
  const workBlock = (w) => {
    const live = (rows) => rows.filter(([, k]) => Y.some((y) => Math.round(y[k]) !== 0));
    const top = live(w.top), bot = live(w.bottom), cols = Y.length + 1;
    const ans = (y) => (w.id === 'dscr' ? y.dscr : y[w.id]);
    const line = (cls, label, f, sign = '') => `<tr class="${cls}"><td><i>${sign}</i>${label}</td>${Y.map((y) => `<td>${f(y)}</td>`).join('')}</tr>`;
    const side = (rows, name, key, cls) => rows.map(([l, k], i) => line(cls, l, (y) => (ans(y) === undefined ? '' : eng(num(y[k]))), i ? '+' : '')).join('') + (rows.length > 1 ? line(cls + ' wtot', name, (y) => (ans(y) === undefined ? '' : eng(num(y.ratioParts[w.id][key]))), '=') : '');
    // The reader's check: the rounded lines must add to the rounded total, and top ÷ bottom must give the answer shown.
    Y.forEach((y) => {
      if (ans(y) === undefined) return;
      const P0 = y.ratioParts[w.id];
      for (const [rows, key] of [[top, 'top'], [bot, 'bottom']]) if (rows.length > 1 && Math.abs(rows.reduce((a, [, k]) => a + Math.round(y[k]), 0) - Math.round(P0[key])) > 1) console.warn(`${id} ${w.id} ${y.fy}: the ${key} lines do not add to the total in rupees`);
      const shown = w.pct ? Math.round(P0.top) / Math.round(P0.bottom) * 100 : Math.round(P0.top) / Math.round(P0.bottom);
      if (shown.toFixed(2) !== ans(y).toFixed(2)) console.warn(`${id} ${w.id} ${y.fy}: the rupees shown give ${shown.toFixed(2)}, the answer is ${ans(y).toFixed(2)}`);
    });
    const miss = (v) => w.level && (w.level.at === 'least' ? v < w.level.v : v > w.level.v);
    const res = Y.map((y) => { const v = ans(y); return v === undefined ? `<td class="nil">${w.none || 'Not counted'}</td>` : `<td class="${miss(v) ? 'miss' : ''}">${eng(w.pct ? v.toFixed(2) + '%' : x2(v))}</td>`; }).join('');
    const lvl = w.level ? ` Usual for a new loan: ${w.level.at === 'least' ? 'at least' : 'at most'} ${eng(x2(w.level.v))}.` : '';
    return `<table class="wk"><tr class="wh"><td colspan="${cols}"><b>${w.name}</b> <span>${w.what}${lvl} Lines from ${w.from}.</span></td></tr><tr class="yr"><td></td>${yrs.replace(/<th class="r">/g, '<td>').replace(/<\/th>/g, '</td>')}</tr>${side(top, w.topName, 'top', 't')}<tr class="div"><td><i>÷</i>divided by</td><td colspan="${Y.length}"></td></tr>${side(bot, w.bottomName, 'bottom', 'b')}<tr class="res"><td><i>=</i>${w.name}</td>${res}</tr></table>`;
  };
  const sched = (no, title, T0) => `<figure class="fg sched"><h3><span class="sno">${no}</span> ${title}</h3>${stTable(T0)}</figure>`;
  const annexHead = (l, t, lede) => { toc.push([l, t, pages.length + 1]); return `<div class="chap"><span class="no">${l}</span><h2 class="act">${t}</h2></div>${lede ? `<p class="lede">${lede}</p>` : ''}`; };
  page('Annex A · Financial statements', annexHead('A', 'Financial statements', fill('The full statements, in rupees, year by year. Sales by product are in Chapter 7.')) +
    M('annex.a', 'statement.pl-bs v2', sched('A.1', 'Profit and loss', tableAfter('Statements', '5.2')) + sched('A.2', 'Balance sheet, at each year end', tableAfter('Statements', '5.3'))), 'stp');
  page('Annex A · Financial statements', M('annex.a', 'statement.cf-dscr v2', sched('A.3', 'Cash flow', tableAfter('Statements', '5.4')) + sched('A.4', 'Debt service coverage, as the lender works it', tableAfter('DSCR', '6.1'))), 'stp');
  page('Annex A · Financial statements', M('annex.a.ratios', 'statement.ratios-worked v1', `<figure class="fg sched"><h3><span class="sno">A.5</span> Key ratios, worked out</h3><p class="wk-lede">${fill('Each ratio is set out as a sum on paper. The lines above the rule are added; the lines below it are added; the top is divided by the bottom. Every line is copied from the statements, in rupees, so it can be found there. Rupees are rounded, so a total can differ by a rupee from its lines added.')}</p>${WORK.slice(0, 3).map(workBlock).join('')}</figure>`), 'stp');
  page('Annex A · Financial statements', M('annex.a.ratios', 'statement.ratios-worked v1', `<figure class="fg sched"><h3><span class="sno">A.5</span> Key ratios, worked out (continued)</h3>${WORK.slice(3).map(workBlock).join('')}</figure>`), 'stp');
  page('Annex A · Financial statements', M('annex.a', 'statement.wc-worth-repay v2', sched('A.6', 'Working capital', tableAfter('DSCR', '6.4')) + sched('A.7', 'The project’s return, discounted', tableAfter('DSCR', '6.5')) + sched('A.8', 'Repayment of the term loan', tableAfter('Repayment', ''))), 'stp');
  page('Annex B · Machines and photographs', annexHead('B', 'Machines and photographs') +
    M('annex.b', 'table.machines v2', `<table class="reg"><tr><th>Machine</th><th>What it does</th><th>Priced on</th></tr>${K.machines.map(([a, b, c]) => `<tr><td><b>${esc(a)}</b></td><td>${esc(b)}</td><td>${typed(c)}</td></tr>`).join('')}</table>`) +
    M('annex.b', 'photos v2', `${h3('Photographs')}<div class="photos">${K.photos.map((p) => `<div class="photo"><b>${esc(p)}</b><span>Added by the borrower; none in this specimen</span></div>`).join('')}</div>`));

  /** The summary's size picture: each year's sales as a column, its profit after tax the teal part at the foot (a loss in red,
   * below the line). The first year is labelled in full, so the reader sees the business's size at once. */
  const sizePic = () => {
    const W = 600, H = 100, l = 6, base = 84, top = 20, max = Math.max(...Y.map((y) => y.sales)), lossMax = Math.max(0, ...Y.map((y) => -y.pat));
    const h = (v) => (v / max) * (base - top), room = W - 290 - l, cw = Math.min(46, (room * 0.8) / Y.length), gap = (room - Y.length * cw) / (Y.length - 1);
    let g = ln(l - 4, base, l + Y.length * cw + (Y.length - 1) * gap + 4, base, C.ink, 0.8);
    Y.forEach((y, i) => {
      const x = l + i * (cw + gap), first = i === 0, sh = h(y.sales), ph = h(Math.abs(y.pat));
      g += rc(x, base - sh, cw, sh, first ? '#94a3b8' : C.hair);
      g += y.pat >= 0 ? rc(x, base - ph, cw, ph, first ? C.teal : C.tealL) : rc(x, base, cw, ph, C.red);
      g += T(x + cw / 2, base - sh - 4, es(lk(y.sales)), { z: 7.4, a: 'middle', b: first, f: first ? C.ink : C.mut });
      g += T(x + cw / 2, base + (y.pat < 0 ? ph : 0) + 11, esc(y.fy), { z: 7, a: 'middle', b: first, f: first ? C.ink : C.faint });
    });
    const y1 = Y[0], lx = W - 236, loss = y1.pat < 0, months = y1.months < 12 ? `, ${es(y1.months)} months of sales` : '';
    g += T(lx, top + 2, `In the first year, ${es(y1.fy)}${months}`, { z: 8, b: 1, f: C.mut });
    g += rc(lx, top + 14, 9, 9, '#94a3b8') + T(lx + 14, top + 22, 'Projected sales', { z: 8, f: C.mut }) + T(W - 2, top + 22, es(lakh(y1.sales)), { z: 13, b: 1, a: 'end' });
    g += rc(lx, top + 38, 9, 9, loss ? C.red : C.teal) + T(lx + 14, top + 46, loss ? 'Projected loss after tax' : 'Projected profit after tax', { z: 8, f: C.mut }) + T(W - 2, top + 46, es(lakh(Math.abs(y1.pat))), { z: 13, b: 1, a: 'end', f: loss ? C.red : C.tealD });
    g += T(lx, top + 70, 'Columns: sales in ₹ lakh. The coloured foot of each', { z: 7, f: C.faint }) + T(lx, top + 79, `is the profit after tax${lossMax ? '; red below the line, a loss' : ''}.`, { z: 7, f: C.faint });
    return svg(W, H + (lossMax ? h(lossMax) : 0), g);
  };

  // ---------------- The summary and the cover, now that the chapters have their pages ----------------
  const OFFSET = 2; for (const t of toc) t[2] += OFFSET;
  const pageOf = (n) => toc.find((t) => t[0] === String(n))[2];
  const favour = [
    claim(low.dscr >= LEVEL.low, '') !== '' && [fill('In every year the business earns at least {dscr.low} times what it owes the bank, above the usual {level.low}.'), 8],
    !S.severe.cashShort && [fill('Even if things go much worse, the business does not run out of cash in any year.'), 9],
    written.length > 0 && [`${written.length === 1 ? 'One buyer has' : WORDS[written.length] + ' buyers have'} put it in writing: ${written.map((b) => typed(lc(b.who))).join(' and ')}.`, 3],
    [`${one ? 'The proprietor knows' : 'Both partners know'} the trade: ${typed(lc(K.promoters[0].past.replace(/\.$/, '')))}.`, 1],
    claim(Y[2].bepPct < Y[0].bepPct && Y[0].bepPct <= 100, '') !== '' && [fill('Break-even falls from {bep.1} of sales in the first year to {bep.3} by the third.'), 7],
    [fill('The building and the machines are priced on dated quotations.'), 6],
  ].filter(Boolean).slice(0, 5);
  const watch = [
    low.dscr < LEVEL.low && [fill('In {dscr.low.fy} the business earns {dscr.low} times what it owes the bank, below the usual {level.low}.'), 8],
    Y[0].bepPct > 100 && [fill(`The first year’s sales stop short of break-even, which needs {bep.1} of them: a loss ${whoL} must carry.`), 7],
    S.down.cashShort && [fill(`If things go worse, cash runs short by {down.short} in the first year; ${whoL} would put it in.`), 9],
    S.severe.cashShort ? [fill(`If things go much worse, cash runs short by {severe.short}: ${lc(K.respond.severe)}.`), 9] : [fill('If things go much worse, the cover falls to {severe.low} in {severe.low.fy}.'), 9],
    [fill(`The first year needs {use.1} of capacity sold; ${written.length ? lc(WORDS[written.length]) + ' of the buyers' : 'none of the buyers'} ${written.length === 1 ? 'has' : 'have'} put it in writing.`), 3],
    [esc(K.risks[0].risk) + '.', 10],
  ].filter(Boolean).slice(0, 5);
  const li = ([t, ch]) => `<li>${t} <span class="see">page ${pageOf(ch)}</span></li>`;
  const summary = `<div class="kick">Summary</div><h2 class="act">${esc(K.oneLine)}, at ${esc(F.state.address)}</h2>
${M('summary', 'summary.request v2', `<p class="lede">${fill(`${esc(F.state.name)} asks a term loan of {loan} and a working-capital limit of {wc} for a project costing {cost}. ${one ? `${esc(K.promoters[0].name)}, the proprietor, brings` : 'The partners bring'} {promoter}, {promoter.pct} of the cost. Sales start in {start}.`)}</p>`)}
${M('summary', 'summary.size v2', `<div class="size"><div class="kick">How big the business is: sales and profit after tax, year by year</div>${sizePic()}</div>`)}
<div class="sum">${M('summary', 'summary.money v2', `<div class="kfs">${[['What the project costs', B.projectCost], ['Term loan asked', B.finance.termLoan], [one ? 'The proprietor brings' : 'The partners bring', B.finance.promoter], ['Working-capital limit asked', B.wcLimit]].map(([l, v]) => `<div class="kf"><div class="l">${l}</div><div class="v">${eng(lakh(v))}</div></div>`).join('')}</div>`)}
${M('summary', 'summary.repay v2', `<div class="can"><div class="kick">Can it repay?</div>${coverGauge()}<p>${fill(READINGS[reading])} <span class="see">page ${pageOf(8)}</span></p></div>`)}</div>
<div class="two b2">${M('summary.favour', 'summary.favour v2', `<div>${h3('In its favour')}<ul class="bl">${favour.map(li).join('')}</ul></div>`)}${M('summary.watch', 'summary.watch v2', `<div>${h3('To watch')}<ul class="bl">${watch.map(li).join('')}</ul></div>`)}</div>
${M('summary.todo', 'summary.todo v2', `${h3('Still to be done')}<ul class="bl cols">${K.conditions.map(([w, o, b]) => `<li>${esc(w)} <span class="who">${esc(o)}, ${esc(lc(b))}</span></li>`).join('')}</ul><p class="small">${fill('This summary states what the report finds. It gives no opinion on the loan: the lender decides.')} <span class="see">page ${pageOf(12)}</span></p>`)}`;
  const contents = `<div class="toc">${[['', 'Summary', 2], ...toc].map(([n, t, p]) => `<div class="${/^[A-B]$/.test(n) ? 'back' : ''}"><span>${/^[A-B]$/.test(n) ? 'Annex ' + n : n}</span><span>${t}</span><span>${p}</span></div>`).join('')}</div>`;
  const cover = `<section class="page cover"><div class="cv-top"><span class="kick">${esc(K.kind)} · ${esc(K.purpose.toLowerCase())}</span><i class="tag">Specimen · a fictional business</i></div>
<h1>${esc(F.state.name)}</h1><p class="cv-sub">${esc(K.oneLine)}<br>${esc(F.state.address)}</p>
${M('cover', 'cover v3', `<table class="cvt"><tr><td>The request</td><td>${fill('A term loan of {loan} and a working-capital limit of {wc}, for a project costing {cost}')}</td></tr><tr><td>${one ? 'Proprietor' : 'Partners'}</td><td>${K.promoters.map((p) => esc(p.name)).join(' and ')} · ${esc(FACTS.Constitution || '')}</td></tr><tr><td>Date</td><td>${esc(K.date)}</td></tr><tr><td>Report</td><td>No. ${esc(K.reportNo)}, version ${K.version}</td></tr></table>`)}
${M('cover', 'contents v3', `<div class="kick" style="margin-top:9mm">Contents</div>${contents}`)}
<div class="cv-foot">Prepared by ${one ? 'the proprietor' : 'the partners'}. Made using FinSight</div></section>`;

  // Assemble: the cover with the contents, the summary, then the chapters and annexes.
  const bodyPages = pages.splice(0);
  const runHead = (section) => `<div class="run"><span><b>${esc(F.state.name)}</b> · Project report</span><span>${section}<i class="tag">Specimen</i></span></div>`;
  const pg = (section, body, n, cls = '') => `<section class="page ${cls}">${runHead(section)}${body}<div class="foot"><span>Made using FinSight</span><span class="pg">${n}</span></div></section>`;
  const html = [cover, pg('Summary', summary, 2), ...bodyPages.map((p, i) => pg(p.section, p.body, i + 1 + OFFSET, p.cls))];
  const total = html.length;

  // The acceptance test: each credit question answered by a chapter listed in the contents (never printed).
  const accept = ACCEPT.map(([q, ...chs]) => { const found = chs.map((c) => toc.find((t) => t[0] === String(c))); if (found.some((f) => !f)) throw new Error(`${id}: no chapter for “${q}”`); return [q, found.map((f) => `${f[0]} ${f[1]} (p. ${f[2]})`).join('; ')]; });

  if (marked) {
    const byRule = {};
    for (const u of used) (byRule[u.rule] ||= new Set()).add(u.piece);
    const rows = Object.entries(byRule).map(([r, ps]) => `<tr><td><b>${r}</b><br><small>${esc(RULES[r] || 'How units of this kind usually work (' + PK.name.toLowerCase() + '), never this borrower’s fact until confirmed; its words await a source (LIB2)')}</small></td><td>${[...ps].map((p) => `<code>${p}</code>`).join(' ')}</td></tr>`);
    const half = Math.ceil(rows.length * 0.62);
    const map = (rs, first) => `${first ? `<div class="kick">The factory map</div><h2 class="act">The rules and pieces that made this report</h2><p class="lede">Each block in this copy is marked in the margin with the rule that chose it and the piece that wrote it. Engine figures are on yellow; the borrower’s typed words on lilac. LIB1 builds these as dated rule and library files; the same answers make the same report.</p>` : ''}<table class="reg map"><tr><th>Rule, and when it applies</th><th>Pieces it chose here</th></tr>${rs.join('')}</table>`;
    const acc = `<h3 class="sh" style="margin-top:5mm">The acceptance test: the nine credit questions, from the contents alone</h3><table class="reg map">${accept.map(([q, a]) => `<tr><td>${q}</td><td>${esc(a)}</td></tr>`).join('')}</table>`;
    html.push(pg('The factory map', map(rows.slice(0, half), true), total + 1), pg('The factory map', map(rows.slice(half), false) + acc + `<p class="small" style="margin-top:4mm">${used.length} blocks; ${Object.keys(byRule).length} rules; ${new Set(used.map((u) => u.piece)).size} pieces.</p>`, total + 2));
    fs.writeFileSync(path.join(out, `factory-${id}.json`), JSON.stringify({ case: id, reading, rules: Object.fromEntries(Object.entries(byRule).map(([r, ps]) => [r, { when: RULES[r] || 'trade pack', pieces: [...ps] }])), acceptance: Object.fromEntries(accept) }, null, 1));
  }
  const htmlOut = html.join('\n');
  if (!marked) { const words = htmlOut.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' '); const m = FACTORY_WORDS.exec(words); if (m) throw new Error(`${id}: a factory word on the reader’s page: “${m[0]}” in …${words.slice(Math.max(0, m.index - 60), m.index + 40)}…`); }
  return { html: `<!doctype html><html lang="en-IN"><head><meta charset="utf-8"><title>${esc(F.state.name)}: project report (SPEC4)</title><style>${css}</style></head><body class="${marked ? 'marked' : ''}">${htmlOut}</body></html>`, pages: html.length, reading, accept };
}

const css = `
@font-face{font-family:Figtree;font-weight:300 900;src:url(data:font/woff2;base64,${font('figtree-latin.woff2')}) format('woff2')}
@font-face{font-family:Figtree;font-weight:300 500;src:url(data:font/woff2;base64,${font('rupee-regular.woff2')}) format('woff2');unicode-range:U+20B9}
@font-face{font-family:Figtree;font-weight:600 900;src:url(data:font/woff2;base64,${font('rupee-semibold.woff2')}) format('woff2');unicode-range:U+20B9}
@font-face{font-family:Anek;font-weight:500;font-stretch:75% 125%;src:url(data:font/woff2;base64,${font('anek-latin.woff2')}) format('woff2')}
@page{size:210mm 297mm;margin:0}
*{box-sizing:border-box}html,body{margin:0;padding:0}
body{font-family:Figtree,sans-serif;font-size:9.3pt;line-height:1.5;color:#0f172a;-webkit-print-color-adjust:exact;print-color-adjust:exact;font-variant-numeric:tabular-nums lining-nums}
.page{width:210mm;height:297mm;padding:13mm 16mm 11mm 22mm;position:relative;display:flex;flex-direction:column;break-after:page;overflow:hidden;background:#fff}
.run{display:flex;justify-content:space-between;align-items:center;font-size:6.8pt;color:#64748b;padding-bottom:2.4mm;border-bottom:.5pt solid #cbd5e1;margin-bottom:6mm}.run b{color:#0f172a;font-weight:650}
.tag{font-style:normal;font-size:6pt;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#92400e;border:.6pt solid #d97706;border-radius:1mm;padding:.4mm 1.6mm;margin-left:3mm}
.foot{margin-top:auto;display:flex;justify-content:space-between;align-items:baseline;font-size:7pt;color:#64748b;padding-top:2.4mm;border-top:.5pt solid #cbd5e1}.foot .pg{font-family:Anek;font-weight:500;font-size:10pt;color:#0f172a}
.kick{font-size:6.8pt;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#0f766e;margin:0 0 2.2mm}
.chap{display:flex;align-items:baseline;gap:4mm;border-top:1.4pt solid #0f172a;padding-top:2.4mm;margin-bottom:3mm}.chap.mid{margin-top:7mm}.chap .no{font-family:Anek;font-weight:500;font-size:19pt;color:#0f766e;min-width:7mm}
.act{font-family:Anek;font-weight:500;font-stretch:94%;font-size:19pt;line-height:1.12;margin:0 0 3mm;max-width:165mm;text-wrap:balance}.chap .act{margin:0}
.lede{font-size:10pt;line-height:1.45;color:#475569;margin:0 0 4.5mm;max-width:160mm}
p{margin:0 0 2.6mm;max-width:165mm}p b{font-weight:650}.small{font-size:7.6pt;color:#64748b}.aside{color:#475569;font-size:8.6pt;border-left:1.5pt solid #cbd5e1;padding-left:3mm}
.sh{font-size:8pt;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#334155;margin:4mm 0 1.6mm}
.two{display:grid;grid-template-columns:1fr 1fr;column-gap:8mm}
.fg{margin:1mm 0 4.5mm}.fg h3{font-size:10.6pt;font-weight:650;line-height:1.28;margin:0 0 2mm;text-wrap:balance}.fg svg{display:block;width:100%;height:auto}svg text{font-family:Figtree}
.fg .note{font-size:7.2pt;color:#64748b;margin-top:1.6mm;line-height:1.4}
table{border-collapse:collapse;width:100%}
.five{font-size:8pt}.five th{font-size:6.9pt;font-weight:600;color:#475569;text-align:right;padding:1.1mm 0 1.1mm 2mm;border-bottom:.8pt solid #0f172a;vertical-align:bottom}.five td{text-align:right;padding:.8mm 0 .8mm 2mm;border-bottom:.5pt solid #e2e8f0}
.five th:first-child,.five td:first-child{text-align:left;padding-left:0}.five tr.tot td{font-weight:650;border-top:.6pt solid #0f172a}.five tr.ratio td{font-weight:650;background:#f1f8f7}.five tr.hd td{font-weight:700;color:#0f766e;font-size:6.8pt;letter-spacing:.06em;text-transform:uppercase;padding-top:2.2mm;text-align:left}
.reg{font-size:8pt;line-height:1.4}.reg th{font-size:6.9pt;font-weight:600;color:#475569;text-align:left;padding:1.2mm 3mm 1.2mm 0;border-bottom:.8pt solid #0f172a;vertical-align:bottom}.reg td{vertical-align:top;padding:1.6mm 3mm 1.6mm 0;border-bottom:.5pt solid #e2e8f0}.reg .r{text-align:right}
.reg small{color:#64748b;font-size:7pt}.reg.risk td{font-size:7.8pt}.reg.risk td:first-child{width:25%}.reg.sc tr.base td{background:#f8fafc}.reg.sc td:first-child{width:36%}.reg.sc td:last-child{width:27%}
.asm td:first-child{width:27%}.asm td:nth-child(2){width:30%}.map td:first-child{width:46%}.map code{display:inline-block;font-size:6.6pt;background:#f1f5f9;border-radius:.6mm;padding:.2mm 1mm;margin:0 .6mm .8mm 0}
.fx{font-size:8.2pt}.fx td{padding:1.4mm 3mm 1.4mm 0;border-bottom:.5pt solid #e2e8f0;vertical-align:top}.fx tr:first-child td{border-top:.8pt solid #0f172a}.fx td:first-child{width:30%;color:#475569}.fx.tight{font-size:7.8pt}.fx.tight td:first-child{width:34%}
.neg{color:#b91c1c;font-weight:650}.nw{white-space:nowrap}
.people{display:grid;grid-template-columns:1fr 1fr;column-gap:8mm;margin-bottom:2mm}.person{border-top:.6pt solid #cbd5e1;padding-top:2mm}.person .nm{font-family:Anek;font-weight:500;font-size:14pt}.person .rl{font-size:7.6pt;color:#0f766e;font-weight:600;margin-bottom:1.6mm}
.reading{background:#f1f8f7;border-left:2pt solid #0d9488;padding:3mm 4mm 1mm;margin:0 0 4mm}
.firm-scale{display:flex;align-items:center;gap:3mm;font-size:6.8pt;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#475569;margin-bottom:1.6mm}.firm-scale i{flex:1;height:1.6mm;border-radius:1mm;background:linear-gradient(90deg,#0f766e,#99d5cd 55%,#e2e8f0)}
.firm-cols{display:grid;grid-template-columns:repeat(4,1fr);gap:2mm}.firm-col{display:flex;flex-direction:column;gap:1.6mm}.firm-h{padding:1.8mm 2.2mm;color:#fff;background:#0f766e;line-height:1.3}.firm-h b{display:block;font-size:8.2pt}.firm-h span{font-size:6.8pt;opacity:.9}
.f1 .firm-h{background:#14897d}.f2 .firm-h{background:#99d5cd;color:#0f172a}.f3 .firm-h{background:#e2e8f0;color:#0f172a}
.buyer{border:.6pt solid #cbd5e1;padding:1.8mm 2.2mm;font-size:7.6pt;line-height:1.35;display:flex;flex-direction:column;gap:.8mm}.buyer b{font-weight:650}.buyer span{color:#475569}.buyer em{font-style:normal;font-size:6.8pt;color:#64748b}.buyer.none{color:#94a3b8;border-style:dashed}
.proc{display:grid;grid-template-columns:repeat(6,1fr);gap:1.4mm}.proc div{position:relative;padding:2.2mm 2.4mm;background:#f1f5f9;font-size:7.4pt;line-height:1.35;display:flex;flex-direction:column;gap:.8mm}.proc b{font-size:8.2pt;font-weight:650}.proc span{color:#475569}
.proc div:not(:last-child)::after{content:'';position:absolute;right:-1.4mm;top:50%;margin-top:-1.4mm;border:1.4mm solid transparent;border-left-color:#94a3b8;border-right:0;z-index:1}
.proc div.slow{background:#fef3c7;outline:1pt solid #d97706}.proc em{font-style:normal;font-size:6.6pt;font-weight:700;color:#92400e;letter-spacing:.04em;text-transform:uppercase;margin-top:auto}
.photos{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm}.photo{border:.6pt dashed #94a3b8;background:repeating-linear-gradient(135deg,#f8fafc 0 3mm,#f1f5f9 3mm 6mm);border-radius:1mm;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.6mm;font-size:6.8pt;color:#64748b;aspect-ratio:4/3;text-align:center;padding:2mm}.photo b{color:#475569}
.sum{display:grid;grid-template-columns:52mm minmax(0,1fr);column-gap:8mm;margin-bottom:1mm}.kfs{display:flex;flex-direction:column}
.kf{padding:1.6mm 0 1.8mm;border-top:.5pt solid #cbd5e1}.kf:first-child{border-top:1.2pt solid #0f172a}.kf .l{font-size:7pt;color:#475569}.kf .v{font-family:Anek;font-weight:500;font-size:15pt;line-height:1.12}
p.wk-lede{font-size:7.8pt;color:#475569;margin:0 0 2.4mm;max-width:150mm}
table.wk{width:100%;border-collapse:collapse;font-size:7.2pt;margin:0 0 3.2mm;break-inside:avoid;font-variant-numeric:tabular-nums}table.wk td{text-align:right;padding:.45mm 0 .45mm 1.4mm}table.wk td:first-child{text-align:left;padding-left:0;width:36%}
table.wk tr.wh td{text-align:left;padding:0 0 .8mm;border-bottom:.8pt solid #0f172a;font-size:7.4pt}table.wk tr.wh b{font-weight:700;margin-right:1.2mm}table.wk tr.wh span{color:#475569}
table.wk tr.yr td{font-size:6.3pt;font-weight:600;color:#64748b;padding-top:.8mm}
table.wk i{display:inline-block;width:3.6mm;font-style:normal;font-weight:700;color:#94a3b8}
table.wk tr.t td{background:#f0f9f8}table.wk tr.t td:first-child{box-shadow:inset 1.2pt 0 0 #0d9488;padding-left:1.4mm}table.wk tr.b td{background:#f8fafc}table.wk tr.b td:first-child{box-shadow:inset 1.2pt 0 0 #64748b;padding-left:1.4mm}
table.wk tr.wtot td{font-weight:650;border-top:.5pt solid #94a3b8}
table.wk tr.div td{padding:.3mm 0;font-size:6.6pt;color:#0f766e;font-weight:700;text-transform:uppercase;letter-spacing:.08em;border-top:1.2pt solid #0f766e}table.wk tr.div td:first-child{padding-left:1.4mm}table.wk tr.div i{color:#0f766e;font-size:9pt;text-transform:none}
table.wk tr.res td{font-weight:700;font-size:8.2pt;border-top:.8pt solid #0f172a;padding-top:.8mm}table.wk tr.res td.miss{color:#b45309}table.wk tr.res td.miss::before{content:"below usual ";font-size:5.8pt;font-weight:600}table.wk tr.res td.nil{font-weight:400;font-size:6.6pt;color:#64748b}
.size{border-top:1.2pt solid #0f172a;padding:1.2mm 0 0;margin:0 0 1.6mm}.size .kick{margin:0}.size svg{display:block;width:100%;height:auto}
.can{border-top:1.2pt solid #0f172a;padding-top:1.6mm}.can svg{display:block;width:100%;max-width:120mm;height:auto;margin:0 0 2mm}.can p{font-size:8.6pt}
.b2{margin-top:1mm}.bl{margin:0;padding:0;list-style:none}.bl li{font-size:8.2pt;line-height:1.4;padding:1.4mm 0;border-top:.5pt solid #e2e8f0}.bl li:first-child{border-top:.8pt solid #0f172a}.see{color:#0f766e;font-weight:650;font-size:7.2pt;white-space:nowrap}.who{color:#64748b;font-size:7.4pt}
.bl.cols{display:grid;grid-template-columns:1fr 1fr;column-gap:8mm;margin-bottom:2mm}.bl.cols li:nth-child(2){border-top:.8pt solid #0f172a}
.toc div{display:grid;grid-template-columns:18mm 1fr auto;align-items:baseline;padding:.85mm 0;border-bottom:.5pt solid #e2e8f0;font-size:9.6pt}.toc div:first-child{border-top:1.2pt solid #0f172a}.toc span:first-child{font-family:Anek;font-weight:500;font-size:10.5pt;color:#0f766e}.toc span:last-child{font-family:Anek;font-weight:500;font-size:10.5pt}.toc .back{color:#475569}
.sched h3{font-size:9.4pt}.sno{font-family:Anek;font-weight:500;color:#0f766e;margin-right:1.5mm}
table.st{font-size:7pt}table.st th{font-size:6.3pt;font-weight:600;color:#475569;text-align:right;padding:.9mm 0 .9mm 1.4mm;border-bottom:.8pt solid #0f172a}table.st td{text-align:right;padding:.7mm 0 .7mm 1.4mm;border-bottom:.5pt solid #e2e8f0}table.st th:first-child,table.st td:first-child{text-align:left;padding-left:0;width:38%}table.st tr.tot td{font-weight:650;border-top:.6pt solid #0f172a}table.st tr.hd td{font-weight:700;color:#0f766e;font-size:6.1pt;letter-spacing:.12em;text-transform:uppercase;padding-top:2mm;text-align:left}table.st tr.ratio td{font-weight:650;background:#f1f8f7}
.stp .fg{margin-bottom:3mm}
.sign{margin-top:7mm;font-size:8.4pt;line-height:1.9;display:grid;gap:7mm}.sign .for{font-weight:650;border-top:.6pt solid #0f172a;padding-top:1mm;display:inline-block;min-width:55mm}
.cover{padding-top:20mm}.cv-top{display:flex;justify-content:space-between;align-items:center}.cv-top .kick{margin:0;font-size:8pt}
.cover h1{font-family:Anek;font-weight:500;font-stretch:112%;font-size:48pt;line-height:.98;letter-spacing:-.02em;margin:22mm 0 4mm}.cv-sub{font-size:13pt;line-height:1.35;color:#475569;margin:0 0 10mm}
.cvt{font-size:9.2pt;max-width:160mm}.cvt td{padding:2.2mm 0;border-top:.5pt solid #cbd5e1;vertical-align:top}.cvt tr:first-child td{border-top:1.2pt solid #0f172a}.cvt td:first-child{width:34mm;color:#475569;font-size:7.6pt;letter-spacing:.08em;text-transform:uppercase;font-weight:650;padding-top:2.6mm}
.cv-foot{margin-top:auto;font-size:7.8pt;color:#475569;padding-top:3mm;border-top:.5pt solid #cbd5e1}
.pc{position:relative}
body.marked .pc::before{content:attr(data-m);white-space:pre-line;position:absolute;left:-19.5mm;top:.4mm;width:17.5mm;font:600 4.5pt/1.3 Figtree,sans-serif;color:#7c3aed;letter-spacing:.01em;word-break:break-all;border-left:.8pt solid #a78bfa;padding-left:.8mm}
body.marked .pc .pc::before{display:none}
body.marked .slot{background:#fef3c7;border-radius:.4mm;box-shadow:0 0 0 .3mm #fef3c7}body.marked .typed{background:#ede9fe;border-radius:.4mm;box-shadow:0 0 0 .3mm #ede9fe}
body.marked svg .slot{fill:#a16207}
body.sheet{display:grid;grid-template-columns:repeat(6,210mm);gap:6mm;padding:6mm;background:#475569;width:max-content}
`;

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const { chromium } = require(path.join(root, 'node_modules/playwright'));
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const report = {};
  for (const id of ['snacks', 'laundry']) for (const marked of [true, false]) {
    const r = build(id, marked), name = `spec4-${id}${marked ? '-marked' : ''}`;
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
    report[name] = { pages: r.pages, reading: r.reading, kb: Math.round(fs.statSync(path.join(out, name + '.pdf')).size / 1024), overflow: over };
    if (!marked) report[name].acceptance = 'nine of nine questions answered by a chapter in the contents';
  }
  await b.close();
  console.log(JSON.stringify(report));
})().catch((e) => { console.error(e.message); process.exit(1); });
