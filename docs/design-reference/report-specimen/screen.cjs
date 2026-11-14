/**
 * The desktop screen the report's builder aims at (REPORT-GRADE, 14-11-2026): the questions hold the stage and the
 * report keeps company at the side. A drawing, not the page: NEW2 builds it. Every figure is read from figures.json.
 *   node screen.cjs <figures.json> <specimen out dir, with pages/>
 */
const fs = require('fs'), path = require('path');
const [, , figPath, out] = process.argv;
const F = JSON.parse(fs.readFileSync(figPath, 'utf8')), B = F.base, Y = B.years;
const root = path.resolve(__dirname, '../../..');
const font = (n) => fs.readFileSync(path.join(root, 'site/public/fonts', n)).toString('base64');
const img = (n) => 'data:image/jpeg;base64,' + fs.readFileSync(path.join(out, 'pages', n)).toString('base64');
const hunt = (o, id) => { if (o && typeof o === 'object') { if (o.id === id) return o; for (const k in o) { const r = hunt(o[k], id); if (r) return r; } } };
const LOW = hunt(require(path.join(root, 'engine/data/ratios.json')), 'dscrLowest').fresh;
const BASIS = Object.fromEntries(F.paper.find((p) => p.name.includes('Basis')).blocks.filter((b) => b.kind === 'pairs').flatMap((b) => b.pairs));
const lk = (v) => (v / 1e5).toFixed(2), x2 = (v) => v.toFixed(2);

const chart = (() => {
  const w = 396, h = 132, base = 104, top = 22, max = 16, band = w / 5, y = (v) => base - (v / 1e5 / max) * (base - top);
  let s = `<line x1="0" y1="${base}" x2="${w}" y2="${base}" stroke="#cbd5e1"/>`;
  Y.forEach((yr, i) => {
    const cx = band * (i + 0.5), low = yr.fy === B.lowest.fy, a = y(yr.available);
    s += `<path d="M${cx - 15},${base}V${a + 3}Q${cx - 15},${a} ${cx - 12},${a}H${cx + 12}Q${cx + 15},${a} ${cx + 15},${a + 3}V${base}Z" fill="${low ? '#d97706' : '#0d9488'}"/>`;
    s += `<line x1="${cx - 26}" y1="${y(yr.service)}" x2="${cx + 26}" y2="${y(yr.service)}" stroke="#0f172a" stroke-width="2.2" stroke-linecap="round"/>`;
    s += `<text x="${cx}" y="${a - 6}" text-anchor="middle" font-size="12" font-weight="650" fill="#0f172a">${x2(yr.dscr)}</text><text x="${cx}" y="${base + 16}" text-anchor="middle" font-size="10.5" fill="#64748b">${yr.fy}</text>`;
  });
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" role="img">${s}</svg>`;
})();
const OUTLINE = [['The project at a glance', 'ok', 'Ready'], ['The business and its promoters', 'you', '2 photos to add'], ['Products, process and market', 'you', '3 photos to add'], ['Cost of the project and how it is paid for', 'ok', 'Ready'], ['Sales, costs and profit', 'now', 'You are here'], ['Can the unit repay the loan?', 'ok', 'Ready'], ['If things go worse than planned', 'ok', 'Ready'], ['Risks and what the partners will do', 'you', 'Write-up to read']];
const greek = (n) => `<div class="pg gk"><i style="width:55%"></i><i style="width:80%;height:7px"></i>${Array.from({ length: n }, (_, i) => `<i style="width:${[92, 86, 95, 70, 88, 60][i % 6]}%"></i>`).join('')}<b></b></div>`;
const tick = '<svg viewBox="0 0 16 16" width="14" height="14"><path d="M3.5 8.5l3 3 6-6.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const lock = '<svg viewBox="0 0 16 16" width="13" height="13"><rect x="3" y="7" width="10" height="7" rx="1.5" fill="currentColor"/><path d="M5.5 7V5a2.5 2.5 0 015 0v2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
const STEPS = ['The business', 'The cost', 'The loan', 'Sales and costs', 'The write-up', 'Check and download'];

const body = (open) => `<header><div class="brand">FinSight</div><div class="crumb">Project report<span>${F.state.name}</span></div><div class="saved">Saved on this device</div></header>
<main><section class="ask">
<ol class="steps">${STEPS.map((s, i) => `<li class="${i < 3 ? 'done' : i === 3 ? 'now' : ''}"><i>${i < 3 ? tick : i + 1}</i>${s}</li>`).join('')}</ol>
<h1>What will the unit sell, and what will it cost to run?</h1><p class="sub">Your best estimate is enough. Each answer shows in the report beside you.</p>
<div class="grp"><label>What you make and sell</label>
<div class="prod head"><span>Product</span><span>At full running, a month</span><span>Price</span><span></span></div>
${F.state.products.map((p, i) => `<div class="prod"><div class="in ${i === 1 ? 'focus' : ''}">${p.name}</div><div class="in">${p.units}<em>${p.unit}</em></div><div class="in"><em class="pre">₹</em>${p.price}<em>a ${p.unit}</em></div><span class="rb">${Y[0].fy}: ₹${lk(Y[0].products[i].sales)} lakh</span></div>`).join('')}
<button class="add">+ Add a product</button></div>
<div class="pair"><div class="grp"><label>Materials and other costs that move with sales</label><div class="in w">${F.state.variablePct}<em>% of sales</em></div><span class="rb">${Y[0].fy}: ₹${lk(Y[0].variable)} lakh</span></div>
<div class="grp"><label>Fixed costs a month: rent, wages, power</label><div class="in w"><em class="pre">₹</em>${F.state.fixedMonth}</div><span class="rb">A full first year: ${BASIS['Fixed costs in a full first year']}</span></div></div>
<div class="more"><span>More options</span><em>How fast the unit fills · price growth · stock and debtor days. Stated assumptions apply until you change them.</em><b>+</b></div>
<div class="nav"><button class="ghost">Back</button><button class="go">Next: the write-up</button></div>
</section>
<aside class="side"><div class="shead"><b>Your report</b><span class="chip">${open ? 'Draft · 15 pages' : 'Preview'}</span></div>
<div class="read"><div><span>Lowest DSCR</span><strong>${x2(B.lowest.dscr)}</strong><em>in ${B.lowest.fy} · read against ${x2(LOW)}</em></div><div><span>Average DSCR</span><strong>${x2(B.average)}</strong><em>over the loan</em></div><div><span>Sales, ${Y[0].fy}</span><strong>₹${lk(Y[0].sales)} L</strong><em>changes as you type</em></div></div>
<div class="cap">Cash for the loan against the payment due, times covered</div>${chart}
<ol class="outline">${OUTLINE.map(([t, st, n], i) => `<li class="${st}"><i>${st === 'ok' ? tick : i + 1}</i><div><b>${t}</b><span>${n}</span></div></li>`).join('')}</ol>
<div class="pages">${open ? ['p01.jpg', 'p02.jpg', 'p07.jpg', 'p08.jpg'].map((p) => `<div class="pg"><img src="${img(p)}"></div>`).join('') : `<div class="pg"><img src="${img('p01.jpg')}"><u>Sample</u></div>${greek(7)}${greek(9)}${greek(6)}`}</div>
<div class="unlock">${open ? '<button class="go sm">Open the full report</button><span>PDF, Word and Excel at the last step</span>' : `<span class="lk">${lock}</span><span><b>The first page is real.</b> The other 14 open with the download.</span>`}</div>
</aside></main>`;

const css = `
@font-face{font-family:Figtree;font-weight:300 900;src:url(data:font/woff2;base64,${font('figtree-latin.woff2')}) format('woff2')}
@font-face{font-family:Figtree;font-weight:300 500;src:url(data:font/woff2;base64,${font('rupee-regular.woff2')}) format('woff2');unicode-range:U+20B9}
@font-face{font-family:Figtree;font-weight:600 900;src:url(data:font/woff2;base64,${font('rupee-semibold.woff2')}) format('woff2');unicode-range:U+20B9}
@font-face{font-family:Anek;font-weight:500;font-stretch:75% 125%;src:url(data:font/woff2;base64,${font('anek-latin.woff2')}) format('woff2')}
*{box-sizing:border-box}body{margin:0;font-family:Figtree,sans-serif;color:#0f172a;background:#f8fafc;font-variant-numeric:tabular-nums;width:1440px;height:900px;overflow:hidden}
header{height:56px;display:flex;align-items:center;gap:20px;padding:0 48px;background:#fff;border-bottom:1px solid #e2e8f0}.brand{font-family:Anek;font-weight:500;font-size:22px;font-stretch:110%}.crumb{font-size:14px;color:#475569}.crumb span{color:#0f172a;font-weight:650;margin-left:10px;padding-left:10px;border-left:1px solid #cbd5e1}.saved{margin-left:auto;font-size:13px;color:#64748b}
main{display:grid;grid-template-columns:minmax(0,1fr) 448px;gap:40px;padding:28px 48px 0;height:844px}
.steps{list-style:none;display:flex;gap:6px;margin:0 0 30px;padding:0}.steps li{display:flex;align-items:center;gap:8px;font-size:13.5px;color:#64748b;padding:0 14px 0 0}.steps i{font-style:normal;display:grid;place-items:center;width:24px;height:24px;border-radius:50%;border:1.5px solid #cbd5e1;font-size:12px;font-weight:650}
.steps .done{color:#334155}.steps .done i{background:#ccfbf1;border-color:#ccfbf1;color:#0f766e}.steps .now{color:#0f172a;font-weight:650}.steps .now i{background:#0f172a;border-color:#0f172a;color:#fff}
h1{font-family:Anek;font-weight:500;font-size:38px;line-height:1.1;letter-spacing:-.01em;margin:0 0 8px;font-stretch:96%}.sub{font-size:16px;color:#475569;margin:0 0 28px}
.grp{margin-bottom:24px}label{display:block;font-size:15.5px;font-weight:650;margin-bottom:9px}
.prod{display:grid;grid-template-columns:1.5fr 1.1fr 1fr 150px;gap:12px;align-items:center;margin-bottom:10px}.prod.head{font-size:12.5px;color:#64748b;margin-bottom:6px}
.in{height:50px;border:1.5px solid #cbd5e1;border-radius:10px;background:#fff;display:flex;align-items:center;gap:8px;padding:0 14px;font-size:17px}.in em{font-style:normal;color:#64748b;font-size:14px;margin-left:auto}.in em.pre{margin:0;font-size:17px}.in.w{max-width:300px}
.in.focus{border-color:#0f766e;box-shadow:0 0 0 4px #ccfbf1}.rb{font-size:13px;color:#0f766e;font-weight:600}.grp>.rb{display:block;margin-top:8px}
.add{border:0;background:none;color:#0f766e;font:650 14.5px Figtree;padding:6px 0}.pair{display:grid;grid-template-columns:1fr 1fr;gap:28px}
.more{display:grid;grid-template-columns:auto 1fr auto;gap:14px;align-items:center;border:1.5px solid #e2e8f0;border-radius:10px;background:#fff;padding:14px 16px;font-size:14.5px;margin-bottom:26px}.more span{font-weight:650}.more em{font-style:normal;color:#64748b;font-size:13px}.more b{font-size:20px;color:#475569;font-weight:400}
.nav{display:flex;gap:12px;justify-content:flex-end}.go{border:0;background:#0f766e;color:#fff;font:650 16px Figtree;height:50px;padding:0 26px;border-radius:10px}.ghost{border:1.5px solid #cbd5e1;background:#fff;font:600 16px Figtree;height:50px;padding:0 22px;border-radius:10px;color:#334155}.go.sm{height:40px;font-size:14px;padding:0 16px}
.side{background:#fff;border:1px solid #e2e8f0;border-radius:14px 14px 0 0;border-bottom:0;padding:18px 20px 0;display:flex;flex-direction:column}
.shead{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}.shead b{font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#0f766e}.chip{font-size:11.5px;font-weight:650;color:#92400e;border:1px solid #d97706;border-radius:5px;padding:2px 8px}
.read{display:grid;grid-template-columns:1.25fr 1fr 1.15fr;gap:14px;padding-bottom:12px;border-bottom:1px solid #e2e8f0}.read span{font-size:12px;color:#475569;display:block}.read strong{font-family:Anek;font-weight:500;font-size:30px;line-height:1.1;display:block}.read em{font-style:normal;font-size:11px;color:#64748b;display:block;line-height:1.3}
.cap{font-size:11.5px;color:#64748b;margin:10px 0 2px}
.outline{list-style:none;margin:6px 0 0;padding:0;border-top:1px solid #e2e8f0}.outline li{display:grid;grid-template-columns:22px 1fr;gap:10px;align-items:center;padding:5px 0;border-bottom:1px solid #f1f5f9}.outline i{font-style:normal;display:grid;place-items:center;width:20px;height:20px;border-radius:50%;font-size:11px;font-weight:650;background:#f1f5f9;color:#475569}
.outline li>div{display:flex;justify-content:space-between;align-items:baseline;gap:10px}.outline b{font-size:13px;font-weight:600;line-height:1.25}.outline span{font-size:11.5px;color:#64748b;white-space:nowrap}.outline .ok i{background:#ccfbf1;color:#0f766e}.outline .now{background:#f0fdfa;margin:0 -20px;padding:5px 20px}.outline .now i{background:#0f172a;color:#fff}.outline .now span{color:#0f766e;font-weight:650}.outline .you span{color:#92400e}
.pages{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:12px}.pg{aspect-ratio:210/297;border:1px solid #cbd5e1;border-radius:3px;background:#fff;position:relative;overflow:hidden;box-shadow:0 1px 3px #0f172a14}.pg img{width:100%;display:block}
.pg u{position:absolute;left:-30%;right:-30%;top:42%;text-align:center;text-decoration:none;transform:rotate(-24deg);background:#d97706e6;color:#fff;font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;padding:2px 0}
.gk{padding:12px 9px;display:flex;flex-direction:column;gap:5px}.gk i{height:3px;border-radius:2px;background:#e2e8f0;display:block}.gk b{margin-top:auto;height:26%;border-radius:2px;background:linear-gradient(#f1f5f9,#e2e8f0)}
.unlock{display:flex;align-items:center;gap:10px;font-size:12.5px;color:#475569;padding:11px 0 14px}.unlock b{color:#0f172a}.lk{display:grid;place-items:center;width:26px;height:26px;border-radius:50%;background:#f1f5f9;color:#475569;flex:none}
`;
(async () => {
  const { chromium } = require('playwright');
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const res = {};
  for (const [name, open] of [['screen-locked', false], ['screen-open', true]]) {
    const f = path.join(out, name + '.html');
    fs.writeFileSync(f, `<!doctype html><html lang="en-IN"><head><meta charset="utf-8"><title>${name}</title><style>${css}</style></head><body>${body(open)}</body></html>`);
    const pg = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
    await pg.goto('file://' + path.resolve(f)); await pg.evaluate(() => document.fonts.ready);
    res[name] = await pg.evaluate(() => { const r = (s) => Math.round(document.querySelector(s).getBoundingClientRect().width), o = document.querySelector('.side'); return { ask: r('.ask'), side: r('.side'), sideOver: o.scrollHeight - o.clientHeight, askBottom: Math.round(document.querySelector('.nav').getBoundingClientRect().bottom) }; });
    await pg.screenshot({ path: path.join(out, name + '.jpg'), type: 'jpeg', quality: 88 });
    await pg.close();
  }
  await b.close(); console.log(JSON.stringify(res));
})();
