// What a Claude Code session cost, and what compacting at other sizes would have changed.
// Usage: node session-cost.mjs [transcript.jsonl]
// Without a path it reads the newest transcript of the current folder's project (~/.claude/projects/<folder>/).
// Costs are in units of one fresh input token at the usual price ratios: cache read 0.1, 5-minute cache write 1.25,
// 1-hour cache write 2, output 5. Main conversation only (no subagents). An estimate to compare sizes, not a bill.
// Where compaction fires (Claude Code 2.1, read from its code and confirmed in a session's log): it starts the summary
// once the context reaches 80% of (window - 20k), and the work waits for it; it never lets the context pass window - 33k.
// So a window of 200000 compacts at about 144k. The 80% can change with Claude Code's version or remote settings,
// which is why this script prints where compactions really fired.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';

function newestTranscript() {
  const dir = path.join(os.homedir(), '.claude', 'projects', process.cwd().replace(/[^A-Za-z0-9]/g, '-'));
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl')).map((f) => path.join(dir, f)) : [];
  if (!files.length) throw new Error(`No transcript in ${dir}; pass its path.`);
  return files.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
}

const file = process.argv[2] || newestTranscript();
const seq = [], byId = new Map(), summaries = [];
let last = null, active = 0;
for await (const line of readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity })) {
  let o;
  try { o = JSON.parse(line); } catch { continue; }
  if (o.isSidechain) continue;
  const ts = Date.parse(o.timestamp) || null;
  if (o.type === 'system' && o.subtype === 'compact_boundary') {
    const m = o.compactMetadata || {};
    seq.push({ compact: true, auto: m.trigger === 'auto', at: m.preTokens, pause: m.durationMs ? m.durationMs / 1000 : last && ts ? (ts - last) / 1000 : null });
  } else if (o.isCompactSummary) {
    const c = o.message?.content;
    summaries.push((typeof c === 'string' ? c : JSON.stringify(c ?? '')).length / 4);
  } else if (o.type === 'assistant' && o.message?.usage) {
    const id = o.message.id || o.uuid;
    if (!byId.has(id)) { byId.set(id, {}); seq.push(byId.get(id)); }
    byId.get(id).u = o.message.usage;
  }
  if (ts) { if (last && ts - last > 0 && ts - last < 600e3) active += (ts - last) / 1000; last = ts; }
}

const n = (x) => x || 0;
const ctx = (u) => n(u.input_tokens) + n(u.cache_read_input_tokens) + n(u.cache_creation_input_tokens);
const written = (u) => n(u.input_tokens) + n(u.cache_creation_input_tokens);
const writeCost = (u) => { const h = n(u.cache_creation?.ephemeral_1h_input_tokens); return 2 * h + 1.25 * (n(u.cache_creation_input_tokens) - h); };
const cost = (u, read) => 0.1 * read + writeCost(u) + n(u.input_tokens) + 5 * n(u.output_tokens);
const sum = (a) => a.reduce((s, x) => s + x, 0), avg = (a) => sum(a) / a.length;
const k = (x) => `${Math.round(x / 1000)}k`, pc = (x) => `${Math.round(Math.abs(x) * 100)}%`;

const steps = seq.filter((x) => x.u && ctx(x.u) > 0), isStep = new Set(steps);
const compactions = seq.filter((x) => x.compact);
if (!steps.length) throw new Error('No steps with token counts in this transcript.');
const ctxs = steps.map((x) => ctx(x.u)), floor = Math.min(...ctxs), peak = Math.max(...ctxs);
const bases = [];
let afterCompact = false;
for (const x of seq) {
  if (x.compact) afterCompact = true;
  else if (afterCompact && isStep.has(x)) { bases.push(x.u); afterCompact = false; }
}
const base = bases.length ? avg(bases.map(ctx)) : floor + 15000;
const baseWrite = bases.length ? avg(bases.map((u) => n(u.cache_creation_input_tokens))) : base;
const summary = summaries.length ? avg(summaries) : 5000;
const parts = {
  read: sum(steps.map((x) => 0.1 * n(x.u.cache_read_input_tokens))),
  write: sum(steps.map((x) => writeCost(x.u))),
  input: sum(steps.map((x) => n(x.u.input_tokens))),
  output: sum(steps.map((x) => 5 * n(x.u.output_tokens))),
};
const total = parts.read + parts.write + parts.input + parts.output;

// Replay the session as if it had also compacted whenever the context reached `cap`. Each step still adds what it
// really added. A compaction costs one read of the context, the summary's output and the new base's cache write,
// plus `reread` tokens of files read again afterwards. A real compaction resets the replay to the real context.
function replay(cap, reread) {
  let s = 0, prev = 0, fresh = true, units = 0, count = compactions.length;
  for (const x of seq) {
    if (x.compact) { fresh = true; continue; }
    if (!isStep.has(x)) continue;
    const c = ctx(x.u);
    if (fresh) { s = c; fresh = false; }
    else {
      s = Math.max(floor, s + c - prev);
      if (s >= cap) { count++; units += 0.1 * s + 5 * summary + 2 * baseWrite + 2 * reread; s = base + reread; }
    }
    prev = c;
    units += cost(x.u, Math.max(0, s - written(x.u)));
  }
  return { count, every: Math.round(steps.length / (count + 1)), change: units / total - 1, extra: count - compactions.length };
}

const auto = compactions.filter((x) => x.auto), timed = (auto.length ? auto : compactions).filter((x) => x.pause > 0);
const pause = timed.length ? avg(timed.map((x) => x.pause)) : 120;
console.log(`${path.basename(file)}: ${steps.length} steps over about ${(active / 3600).toFixed(1)} working hours`);
console.log(`Context per step: start ${k(ctxs[0])}, average ${k(avg(ctxs))}, peak ${k(peak)}`);
console.log(`Compactions: ${compactions.length}, ${auto.length} automatic${auto.length ? ` (fired at ${auto.map((x) => k(x.at || 0)).join(', ')})` : ''}; each paused the work about ${Math.round(pause)} s${timed.length ? '' : ' (assumed)'}; context after one ${k(base)}${bases.length ? '' : ' (estimated)'}`);
console.log(`Cost: re-reading the context ${pc(parts.read / total)}, writing it to the cache ${pc(parts.write / total)}, output ${pc(parts.output / total)}, fresh input ${pc(parts.input / total)}`);
console.log('With another window setting, against this session (a range: no files re-read after each compaction, or 15k):');
const word = (x) => (Math.abs(x) < 0.005 ? 'no change' : `${pc(x)} ${x < 0 ? 'cheaper' : 'dearer'}`);
const range = (a, b) => (a === b ? `${a}` : `${Math.min(a, b)}-${Math.max(a, b)}`);
for (const win of [145000, 170000, 200000, 230000, 260000, 290000, 340000]) {
  const cap = 0.8 * (win - 20000);
  if (cap >= peak) continue;
  const a = replay(cap, 0), b = replay(cap, 15000);
  const mins = (r) => Math.round((r.count * pause) / 60 / Math.max(0.1, active / 3600));
  console.log(`  ${win}: compacts at about ${k(cap)}, one every ${range(b.every, a.every)} steps; ${word(a.change)} to ${word(b.change)}; pauses about ${range(mins(a), mins(b))} min per working hour`);
}
console.log('A replay cannot undo a real compaction, so settings above where this session compacted show no change.');
