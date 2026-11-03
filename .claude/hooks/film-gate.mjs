// The film gate's door here (CD2, D-TECH-102). The gate lives in the studio, where films are made
// (rsplenum/video-studio `.claude/hooks/film-gate.mjs`, its cases in the studio's `npm test`); a session started
// in Finance_tools runs it through this hook, so a render from here is gated too. The studio is found from the
// command (its last `cd`, or the folder of `studio.mjs` in it), else the hook's cwd, else `$VIDEO_STUDIO_DIR`,
// else `../video-studio` beside this repo. A studio without its gate (an old branch) renders nothing from here.
//   --self-test  its cases, run by `npm run verify`.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const RENDER = /(?:studio\.mjs['"]?\s+(?:make|render|still|board)|npm\s+run\s+make)\b/;
const deny = (reason) => JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } });

/** The hook's stdout for this call: the studio gate's answer, a stop, or '' to let it through. */
export function run(raw, fallback = [process.env.VIDEO_STUDIO_DIR, path.join(HERE, '..', 'video-studio')]) {
  const hook = JSON.parse(raw), command = hook.tool_input?.command ?? '', cwd = hook.cwd || process.cwd();
  if (!/studio\.mjs|npm\s+run\s+make/.test(command)) return '';
  const cd = [...command.matchAll(/\bcd\s+(['"]?)([^'"\s;&|]+)\1/g)].at(-1)?.[2];
  const at = /([^\s'"]*)studio\.mjs/.exec(command)?.[1];
  const studio = [cd && path.resolve(cwd, cd), at && path.resolve(cwd, at), cwd, ...fallback].filter(Boolean).find((d) => fs.existsSync(path.join(d, 'studio.mjs')));
  if (!studio) return '';
  const gate = path.join(studio, '.claude', 'hooks', 'film-gate.mjs');
  if (!fs.existsSync(gate)) return RENDER.test(command) ? deny(`The studio at ${studio} has no film gate (.claude/hooks/film-gate.mjs): check out its main, which holds it, before any render (CD2).`) : '';
  return spawnSync(process.execPath, [gate], { input: raw, encoding: 'utf8', timeout: 8000 }).stdout ?? '';
}

function selfTest() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'film-door-'));
  const put = (p, t) => { fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true }); fs.writeFileSync(path.join(root, p), t); };
  put('gated/studio.mjs', ''); put('bare/studio.mjs', '');
  put('gated/.claude/hooks/film-gate.mjs', `process.stdout.write(${JSON.stringify(deny('the studio gate'))})`);
  const r = (command, cwd = root) => run(JSON.stringify({ tool_input: { command }, cwd }), []);
  const said = (out) => (/"permissionDecision":"deny"/.test(out) ? (/the studio gate/.test(out) ? 'gate' : 'stop') : 'pass');
  const cases = [
    ['a render in the studio goes to its gate', r(`cd ${root}/gated && node studio.mjs make videos/a-film --draft`), 'gate'],
    ['a render named by the studio path goes to its gate', r(`node ${root}/gated/studio.mjs board videos/a-film`), 'gate'],
    ['a render from the studio folder goes to its gate', r('npm run make -- videos/a-film', `${root}/gated`), 'gate'],
    ['a studio without its gate renders nothing', r(`cd ${root}/bare && node studio.mjs make videos/a-film`), 'stop'],
    ['a studio without its gate still runs its tests', r(`cd ${root}/bare && node studio.mjs measure videos/a-film`), 'pass'],
    ['a command that is not the studio\'s passes', r('npm run verify -- --quick'), 'pass'],
    ['no studio here, nothing to render', r('node studio.mjs make videos/a-film'), 'pass'],
  ];
  fs.rmSync(root, { recursive: true, force: true });
  const bad = cases.filter(([, got, want]) => said(got) !== want);
  for (const [name, got] of bad) console.log(`FAIL ${name}: ${got || '(passed)'}`);
  console.log(`film gate door: ${cases.length - bad.length} of ${cases.length} cases`);
  process.exit(bad.length ? 1 : 0);
}

async function main() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  process.stdout.write(run(raw));
}

if (process.argv.includes('--self-test')) selfTest();
else main().catch(() => {});
