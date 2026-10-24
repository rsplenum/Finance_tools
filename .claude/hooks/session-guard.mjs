// The session guard (D-TECH-62). Before this conversation starts another cloud session (create_session), it stops
// the call when the row in the new session's title already has a session:
//   - a branch for the row is on GitHub (`sec1`, `sec1-worker`, `num1-numbering`): a session claimed it;
//   - this container started a session for the same row in the last 12 hours;
//   - three sessions were started here in the last 5 hours: more at once runs into the usage limit.
// `[owner-ok]` in the title lets the call through when the owner asked for it. A title with no row (an errand) passes.
//   --self-test  its cases, run by `npm run verify`.
// It reads the hook's JSON on stdin and never fails the session: any error lets the call through silently.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const HOUR = 3600e3;
const LEDGER = path.join(process.env.CLAUDE_PROJECT_DIR || process.cwd(), '.claude', 'sessions-started.json');

export function rowOf(title = '', prompt = '') {
  const m = /\b([A-Z]{2,8}\d+[a-z]?)\b/.exec(title) || /\b([A-Z]{2,8}\d+[a-z]?):/.exec(prompt);
  return m ? m[1] : null;
}

/** The reason to stop the call, or null to let it through. */
export function decide({ title = '', prompt = '' }, branches, ledger, now) {
  if (title.includes('[owner-ok]')) return null;
  const row = rowOf(title, prompt);
  if (!row) return null;
  const id = row.toLowerCase();
  const claimed = branches.filter((b) => b === id || b.startsWith(`${id}-`));
  const rule = 'One session per row, started only from the owner\'s main conversation (D-TECH-62). Tell the owner, and add [owner-ok] to the title only on their word.';
  if (claimed.length) return `${row} already has a branch on GitHub (${claimed.join(', ')}): a session owns it. Send that session a message or read its PR instead. ${rule}`;
  if (ledger.some((e) => e.row === row && now - e.at < 12 * HOUR)) return `${row} already got a session from here in the last 12 hours. ${rule}`;
  const recent = ledger.filter((e) => now - e.at < 5 * HOUR).length;
  if (recent >= 3) return `${recent} sessions were started from here in the last 5 hours; a fourth at once runs into the usage limit and stops them mid-work. ${rule}`;
  return null;
}

function remoteBranches() {
  const out = execFileSync('git', ['ls-remote', '--heads', 'origin'], { encoding: 'utf8', timeout: 8000, stdio: ['ignore', 'pipe', 'ignore'] });
  return out.split('\n').map((l) => l.split('refs/heads/')[1]).filter(Boolean).map((b) => b.toLowerCase());
}

function readLedger() {
  try { return JSON.parse(fs.readFileSync(LEDGER, 'utf8')); } catch { return []; }
}

async function main() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  const input = JSON.parse(raw).tool_input ?? {};
  const ledger = readLedger();
  const now = Date.now();
  const reason = decide(input, remoteBranches(), ledger, now);
  if (reason) {
    process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } }));
    return;
  }
  const row = rowOf(input.title, input.prompt);
  if (row) fs.writeFileSync(LEDGER, JSON.stringify([...ledger.filter((e) => now - e.at < 24 * HOUR), { row, at: now }]) + '\n');
}

function selfTest() {
  const now = Date.now();
  const cases = [
    ['a claimed row stops', decide({ title: 'SEC1: harden the Worker' }, ['main', 'sec1-worker'], [], now), true],
    ['a branch only alike passes', decide({ title: 'SEC1: harden the Worker' }, ['sec10-x', 'trust1-marks'], [], now), false],
    ['a row from the prompt', decide({ title: 'Indian numbering', prompt: 'Budget S. NUM1: Indian numbering.' }, ['num1-numbering'], [], now), true],
    ['the same row twice from here', decide({ title: 'NUM1: numbering' }, [], [{ row: 'NUM1', at: now - HOUR }], now), true],
    ['the same row a day later', decide({ title: 'NUM1: numbering' }, [], [{ row: 'NUM1', at: now - 13 * HOUR }], now), false],
    ['a fourth at once', decide({ title: 'MAP1: the site map' }, [], ['A1', 'B1', 'C1'].map((row) => ({ row, at: now - HOUR })), now), true],
    ['the owner\'s word', decide({ title: 'SEC1 again [owner-ok]' }, ['sec1'], [], now), false],
    ['an errand without a row', decide({ title: 'fetch the RBI pages' }, ['sec1'], [], now), false],
  ];
  const bad = cases.filter(([, got, stop]) => Boolean(got) !== stop);
  for (const [name, got] of bad) console.log(`FAIL ${name}: ${got}`);
  console.log(`session guard: ${cases.length - bad.length} of ${cases.length} cases`);
  process.exit(bad.length ? 1 : 0);
}

if (process.argv.includes('--self-test')) selfTest();
else main().catch(() => {});
