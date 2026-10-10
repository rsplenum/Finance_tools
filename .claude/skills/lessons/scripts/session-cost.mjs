// What a Claude Code session cost, what compacting at other sizes would have changed, and where re-reading went beyond the plan.
// Usage: node session-cost.mjs [transcript.jsonl]
// Without a path it reads the newest transcript of the current folder's project (~/.claude/projects/<folder>/).
// Costs are in units of one fresh input token at the usual price ratios: cache read 0.1, 5-minute cache write 1.25,
// 1-hour cache write 2, output 5. The main conversation, then its agents apart (their logs beside it). An estimate to compare sizes, not a bill.
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
const seq = [], byId = new Map(), summaries = [], uses = new Map();
let last = null, active = 0, merged = -1, gap = [];
// What came into the context between two steps (tool results, a message, a file it named, Claude Code's notes), in
// characters, to name what a step added; an image counts as about 1,600 tokens (3,700 characters), not its data.
const chars = (c) => (Array.isArray(c) ? c : [c ?? '']).reduce((t, b) => t + (typeof b === 'string' ? b.length
  : b?.type === 'image' ? 3700 : b?.type === 'text' ? (b.text || '').length : JSON.stringify(b ?? '').length), 0);
for await (const line of readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity })) {
  let o;
  try { o = JSON.parse(line); } catch { continue; }
  if (o.isSidechain) continue;
  const ts = Date.parse(o.timestamp) || null;
  const content = Array.isArray(o.message?.content) ? o.message.content : [];
  if (o.type === 'system' && o.subtype === 'compact_boundary') {
    const m = o.compactMetadata || {};
    seq.push({ compact: true, auto: m.trigger === 'auto', at: m.preTokens, pause: m.durationMs ? m.durationMs / 1000 : last && ts ? (ts - last) / 1000 : null });
    gap = [];
  } else if (o.isCompactSummary) {
    const c = o.message?.content;
    summaries.push((typeof c === 'string' ? c : JSON.stringify(c ?? '')).length / 4);
  } else if (o.type === 'assistant' && o.message?.usage) {
    const id = o.message.id || o.uuid;
    if (!byId.has(id)) { byId.set(id, { ts, added: gap }); seq.push(byId.get(id)); gap = []; }
    byId.get(id).u = o.message.usage;
    for (const c of content) if (c.type === 'tool_use') uses.set(c.id, { name: c.name, what: c.input?.file_path || c.input?.description || '' });
  } else if (o.type === 'user') {
    for (const c of typeof o.message?.content === 'string' ? [o.message.content] : content) {
      const use = c?.type === 'tool_result' && uses.get(c.tool_use_id);
      if (use) gap.push({ chars: chars(c.content), name: use.name, what: use.what });
      else if (c?.type !== 'tool_result') gap.push({ chars: chars(c), name: o.isMeta ? 'a skill or a note from Claude Code' : 'a message typed or pasted' });
      if (use && /merge_pull_request$/.test(use.name) && !c.is_error) merged = seq.length;
    }
  } else if (o.type === 'attachment' && o.attachment) {
    gap.push({ chars: JSON.stringify(o.attachment).length, name: o.attachment.type === 'file' ? 'a file named in a message' : 'a note from Claude Code' });
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

// Where re-reading went beyond the plan: cache misses (the context written again, not after a compaction), what was
// added to the context and re-read most (each until the next compaction), and the steps after the last merge.
const stepCost = (x) => cost(x.u, n(x.u.cache_read_input_tokens));
const misses = [];
let prior = null, compacted = false;
for (const x of seq) {
  if (x.compact) { compacted = true; continue; }
  if (!isStep.has(x)) continue;
  const w = n(x.u.cache_creation_input_tokens);
  if (prior && !compacted && ctx(x.u) >= 20000 && w >= 0.5 * ctx(x.u)) misses.push({ idle: x.ts && prior.ts ? x.ts - prior.ts : 0, extra: writeCost(x.u) - 0.1 * w });
  prior = x; compacted = false;
}
if (misses.length) console.log(`Cache misses: ${misses.length}, ${misses.filter((m) => m.idle >= 3600e3).length} after a break of over an hour (the cache lives an hour); ${pc(sum(misses.map((m) => m.extra)) / total)} of the cost`);
// What came in before a step is that step's context less the one before it and that one's output, counted in the
// model's own tokens; it is re-read at each later step until a compaction. The label names its biggest parts.
const until = new Array(seq.length + 1).fill(0);
for (let i = seq.length - 1; i >= 0; i--) until[i] = seq[i].compact ? 0 : until[i + 1] + (isStep.has(seq[i]) ? 1 : 0);
const added = [];
let before = null;
seq.forEach((x, i) => {
  if (x.compact) { before = null; return; }
  if (!isStep.has(x)) return;
  const tokens = before ? ctx(x.u) - ctx(before.u) - n(before.u.output_tokens) : 0, reads = until[i] - 1;
  if (tokens > 0) added.push({ parts: x.added, tokens, reads, units: 0.1 * tokens * reads });
  before = x;
});
const label = ({ parts }) => {
  const big = [...parts].sort((a, b) => b.chars - a.chars).filter((p, i) => i === 0 || p.chars >= 1000);
  const name = (p) => `${p.name.replace(/^mcp__\w+?__/, '')}${p.what ? ` (${String(p.what).split('/').pop().slice(0, 30)})` : ''}`;
  return big.length ? `${big.slice(0, 2).map(name).join(' with ')}${big.length > 2 ? ` and ${big.length - 2} more` : ''}` : 'notes';
};
const heavy = added.sort((a, b) => b.units - a.units).slice(0, 3);
if (heavy.length) console.log(`Added and re-read most: ${heavy.map((r) => `${label(r)} ${k(r.tokens)} tokens, re-read ${r.reads} times, ${((100 * r.units) / total).toFixed(1)}% of the cost`).join('; ')}`);
if (merged >= 0) {
  const after = seq.slice(merged).filter((x) => isStep.has(x));
  console.log(`After the last merge: ${after.length} steps, ${pc(sum(after.map(stepCost)) / total)} of the cost (work there longer than a new session's break-even belongs in a new session)`);
}

// The session's agents: their logs sit beside the transcript in <session>/subagents/. Each is priced the same way;
// their share is of the session's whole cost, main conversation and agents together.
async function usages(f) {
  const seen = new Map();
  for await (const line of readline.createInterface({ input: fs.createReadStream(f), crlfDelay: Infinity })) {
    let o;
    try { o = JSON.parse(line); } catch { continue; }
    if (o.type === 'assistant' && o.message?.usage) seen.set(o.message.id || o.uuid, o.message.usage);
  }
  return [...seen.values()].filter((u) => ctx(u) > 0);
}
const priced = (us) => sum(us.map((u) => cost(u, n(u.cache_read_input_tokens))));
const outPerStep = avg(steps.map((x) => n(x.u.output_tokens)));
console.log(`Output a step: ${Math.round(outPerStep)} tokens on average`);
const agentDir = path.join(file.replace(/\.jsonl$/, ''), 'subagents');
const agentFiles = fs.existsSync(agentDir) ? fs.readdirSync(agentDir).filter((f) => f.endsWith('.jsonl')).map((f) => path.join(agentDir, f)) : [];
if (agentFiles.length) {
  const runs = await Promise.all(agentFiles.map(usages)), agentCost = sum(runs.map(priced)), agentSteps = sum(runs.map((r) => r.length));
  console.log(`Agents: ${agentFiles.length}, ${agentSteps} steps, ${pc(agentCost / (agentCost + total))} of the session's cost; one agent costs about ${pc(agentCost / agentFiles.length / total)} of the main conversation's`);
}
