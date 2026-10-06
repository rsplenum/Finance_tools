// The cost guard (D-TECH-32). Every step re-reads the whole conversation, at a tenth of the input price while the
// prompt cache is warm; this hook tells the session what that costs at the moments it can act on it.
//   prompt  (UserPromptSubmit) in a big conversation, after how many steps a new session pays for itself; after an
//           hour with no step, that the cache has lapsed and this step writes the whole conversation again; and when
//           the message itself is big (a pasted page), that it will be re-read at every later step.
//   tool    (PostToolUse) when one tool result is big, that it will be re-read at every later step.
//   --self-test  its cases, run by `npm run verify`.
// It reads the hook's JSON on stdin and the end of the session's transcript, prints nothing unless it has something
// to say, and never fails the session: any error ends it silently.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const FRESH = 60000; // a new session's context once it has read CLAUDE.md and HANDOFF (docs/GOTCHAS.md)
const LAPSE = 3600e3; // the prompt cache lives an hour after its last use
const BIG = 8000; // tokens in one tool result or message
// Characters a token: the median of 251 tool results of 8,000 characters or more in this project's log, against the
// next step's real token count (06-10-2026; 10th percentile 2.08, 90th 2.85). The usual 4 understates tokens by 40%.
const PER_TOKEN = 2.3;
const k = (x) => `${Math.round(x / 1000)}k`;

// The main conversation's last step: its context in tokens and its time, from the transcript's last 2 MB.
function lastStep(file) {
  const size = fs.statSync(file).size, len = Math.min(size, 2 ** 21), buf = Buffer.alloc(len);
  const fd = fs.openSync(file, 'r');
  try { fs.readSync(fd, buf, 0, len, size - len); } finally { fs.closeSync(fd); }
  const lines = buf.toString('utf8').split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    let o;
    try { o = JSON.parse(lines[i]); } catch { continue; }
    const u = o.type === 'assistant' && !o.isSidechain && o.message?.usage;
    const ctx = u ? (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0) : 0;
    if (ctx > 0) return { ctx, at: Date.parse(o.timestamp) || null };
  }
  return null;
}

// A new session writes its start to the cache at twice the input price (2 × FRESH); each later step then re-reads
// a tenth of (ctx − FRESH) less. So it pays for itself after 2 × FRESH ÷ (0.1 × (ctx − FRESH)) steps.
function promptNote(step, now, prompt = '') {
  const notes = [], pasted = prompt.length / PER_TOKEN, idle = step?.at ? now - step.at : 0;
  if (pasted >= BIG) notes.push(`This message is about ${k(pasted)} tokens, re-read at every later step until a compaction: if it holds a page, tell the owner once that its address, for an agent to read, costs less next time.`);
  if (step && idle >= LAPSE && step.ctx >= 1.5 * FRESH)
    notes.push(`${Math.round(idle / 60000)} min since the last step, so the prompt cache has lapsed and this step writes all ${k(step.ctx)} tokens of this conversation again, about twenty times the cost of a cached step; a new session would write about ${k(FRESH)}. Unless this message needs this conversation, say so to the owner in one line, with a starter prompt for a new session, before doing more.`);
  else if (step && step.ctx >= 2 * FRESH) {
    const even = Math.round((2 * FRESH) / (0.1 * (step.ctx - FRESH)));
    notes.push(`This conversation holds ${k(step.ctx)} tokens, re-read at every step; a new session starts at about ${k(FRESH)} and pays for itself after about ${even} steps. If this message starts work longer than that (a feature always is), say so to the owner in one line, with a starter prompt for a new session, and wait for their word unless they gave it in this conversation; a shorter ask goes ahead.`);
  }
  return notes.length ? `Cost guard (D-TECH-32): ${notes.join(' ')}` : '';
}

// What the session sees of a Write or an Edit is a line, though the hook is handed the whole file, and it never sees
// the diff of files a shell command changed (bashEditDiff) or an edit's patch; an image costs its pixels (at most a
// few thousand tokens), not the length of its data, so its data counts as about 1,600 tokens.
const IMAGE = Math.round(1600 * PER_TOKEN), UNSEEN = new Set(['bashEditDiff', 'structuredPatch', 'originalFile']);
function toolNote(input) {
  if (/^(Write|Edit|MultiEdit|NotebookEdit)$/.test(input.tool_name || '')) return '';
  const seen = (key, v) => (UNSEEN.has(key) ? undefined : typeof v === 'string' && v.length > IMAGE && /^[A-Za-z0-9+/]+=*$/.test(v) ? 'x'.repeat(IMAGE) : v);
  const tokens = JSON.stringify(input.tool_response ?? '', seen).length / PER_TOKEN;
  if (tokens < BIG) return '';
  return `Cost guard (D-TECH-32): that ${input.tool_name || 'tool'} result was about ${k(tokens)} tokens, re-read at every later step until a compaction. Next time print only what is needed (a script or grep, Read with offset and limit, minimal_output on GitHub tools) or hand the reading to an agent.`;
}

async function hook(mode) {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  const input = JSON.parse(raw);
  const [event, text] = mode === 'prompt'
    ? ['UserPromptSubmit', promptNote(input.transcript_path ? lastStep(input.transcript_path) : null, Date.now(), input.prompt || '')]
    : ['PostToolUse', toolNote(input)];
  if (text) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: event, additionalContext: text } }));
}

function selfTest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cost-guard-')), file = path.join(dir, 't.jsonl');
  const now = Date.parse('2026-10-06T12:00:00Z'), cases = [];
  const step = (ctx, minsAgo, more = {}) => JSON.stringify({ type: 'assistant', timestamp: new Date(now - minsAgo * 60e3).toISOString(),
    message: { id: `m${ctx}`, usage: { input_tokens: 10, cache_read_input_tokens: ctx - 1010, cache_creation_input_tokens: 1000 } }, ...more });
  const note = (...lines) => { fs.writeFileSync(file, `${lines.join('\n')}\n`); return promptNote(lastStep(file), now); };
  const check = (name, got, want) => cases.push({ name, got, ok: want instanceof RegExp ? want.test(got) : got === want });
  const owner = JSON.stringify({ type: 'user', timestamp: new Date(now).toISOString(), message: { content: 'next' } });
  check('a big conversation: 20 steps at 120k', note(step(80000, 30), step(120000, 2), owner), /holds 120k tokens.*after about 20 steps/);
  check('a bigger one: 13 steps at 150k', note(step(150000, 2)), /after about 13 steps/);
  check('an hour with no step: the cache has lapsed', note(step(150000, 90)), /90 min since the last step.*all 150k tokens/);
  check('a small conversation: silent', note(step(80000, 2)), '');
  check("an agent's step and a torn line are skipped", note(step(150000, 2), step(900000, 1, { isSidechain: true }), '{"type":"assis'), /holds 150k/);
  check('a long pasted message', promptNote(null, now, 'word '.repeat(5000)), /This message is about 11k tokens/);
  check('a big tool result: 40,002 characters', toolNote({ tool_name: 'Read', tool_response: 'a line of text\n'.repeat(2500) }), /that Read result was about 17k tokens/);
  check('a result just under 8k tokens: silent', toolNote({ tool_name: 'Bash', tool_response: 'abc def\n'.repeat(2000) }), '');
  check('a small tool result: silent', toolNote({ tool_name: 'Bash', tool_response: { stdout: 'ok' } }), '');
  check('an image read: its pixels, not its data', toolNote({ tool_name: 'Read', tool_response: { type: 'image', file: { base64: 'iVBO'.repeat(100000) } } }), '');
  check("a shell command's edit diff, never seen: silent", toolNote({ tool_name: 'Bash', tool_response: { stdout: 'ok', bashEditDiff: 'a line of text\n'.repeat(5000) } }), '');
  check('an Edit of a big file: silent', toolNote({ tool_name: 'Edit', tool_response: { originalFile: 'x'.repeat(40000) } }), '');
  fs.rmSync(dir, { recursive: true, force: true });
  const bad = cases.filter((c) => !c.ok);
  for (const c of bad) console.log(`FAIL ${c.name}: ${JSON.stringify(c.got).slice(0, 160)}`);
  console.log(`cost guard: ${cases.length - bad.length} of ${cases.length} cases, ${bad.length} violations`);
  process.exitCode = bad.length ? 1 : 0;
}

if (process.argv[2] === '--self-test') selfTest();
else hook(process.argv[2]).catch(() => {});
