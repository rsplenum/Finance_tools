// The film gate (CD1, D-TECH-101). Before a Bash call runs the studio's picture-making commands on a film
// (`studio.mjs make|render|still|board videos/<video>`, or `npm run make -- videos/<video>`, draft or master),
// it stops the call unless the creative department's last gate is passed: `docs/video/films/<video>/GREENLIGHT.md`
// holds `greenlit: DD-MM-YYYY`, `Rahul: "<Rahul's own words>"` and a `sound:` line. With `sound: none` it
// also stops a render whose `video.json` switches the sound phase on. The studio's test card passes.
//   --self-test  its cases, run by `npm run verify`.
// It reads the hook's JSON on stdin; an error inside the gate lets the call through silently, as the session guard does.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const EXEMPT = new Set(['test-card']);
const RUN = /(?:studio\.mjs['"]?\s+(?:make|render|still|board)|npm\s+run\s+make)\b([^;&|\n]*)/g;
const HOW = 'A film is made only after the creative department passes it (the creative-department skill): brief, three concepts, review, Rahul\'s pick, story, world, sound plan, boards, animatic, review, then Rahul\'s greenlight in Rahul\'s own words. Tell Rahul which gate the film is at; never write GREENLIGHT.md without Rahul\'s words.';

/** The studio folder a command runs in: the last `cd`, else the folder of studio.mjs in it, else the cwd. */
function studioDir(command, cwd) {
  const cds = [...command.matchAll(/\bcd\s+(['"]?)([^'"\s;&|]+)\1/g)];
  if (cds.length) return path.resolve(cwd, cds.at(-1)[2]);
  const s = /([^\s'"]*)studio\.mjs/.exec(command);
  return s && s[1] ? path.resolve(cwd, s[1]) : cwd;
}

/** The reason to stop the call, or null to let it through. */
export function decide(command = '', { root, cwd = process.cwd() }) {
  for (const m of command.matchAll(RUN)) {
    const name = /\bvideos\/([\w.-]+)/.exec(m[1])?.[1];
    if (!name || EXEMPT.has(name)) continue;
    const file = path.join(root, 'docs', 'video', 'films', name, 'GREENLIGHT.md');
    let g = '';
    try { g = fs.readFileSync(file, 'utf8'); } catch { return `No greenlight for the film "${name}" (docs/video/films/${name}/GREENLIGHT.md): it is still in creative development, so the studio may not render it, not even a draft. ${HOW}`; }
    const missing = [[/^greenlit:\s*\d\d-\d\d-\d{4}/m, 'greenlit: DD-MM-YYYY'], [/^Rahul:\s*["“].+["”]/m, 'Rahul: "<Rahul\'s words>"'], [/^sound:\s*\S/m, 'sound: none, or the approved plan']].filter(([re]) => !re.test(g)).map(([, w]) => w);
    if (missing.length) return `The greenlight for "${name}" lacks ${missing.join(', ')}. ${HOW}`;
    if (/^sound:\s*none\b/im.test(g)) {
      try {
        const v = JSON.parse(fs.readFileSync(path.join(studioDir(command, cwd), 'videos', name, 'video.json'), 'utf8'));
        if (v.phases?.sound) return `The greenlight for "${name}" says sound: none, but its video.json switches the sound phase on. Switch it off (and drop its bed) before rendering: no sound without a plan Rahul approved (CD1).`;
      } catch { /* no video.json found from here: the render itself will say */ }
    }
  }
  return null;
}

async function main() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  const hook = JSON.parse(raw);
  const reason = decide(hook.tool_input?.command ?? '', { root: process.env.CLAUDE_PROJECT_DIR || hook.cwd || process.cwd(), cwd: hook.cwd || process.cwd() });
  if (reason) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } }));
}

function selfTest() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'film-gate-'));
  const studio = path.join(root, 'studio');
  const put = (p, t) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, t); };
  const film = (name, text) => put(path.join(root, 'docs', 'video', 'films', name, 'GREENLIGHT.md'), text);
  const video = (name, sound) => put(path.join(studio, 'videos', name, 'video.json'), JSON.stringify({ phases: { render: true, sound } }));
  film('ok-film', 'greenlit: 04-11-2026\nRahul: "Yes, make it."\nsound: docs/video/films/ok-film/sound.md\n');
  film('quiet', 'greenlit: 04-11-2026\nRahul: "Make it, silent."\nsound: none\n');
  film('unsigned', 'greenlit: 04-11-2026\nsound: none\n');
  video('quiet', false); video('loud', true);
  film('loud', 'greenlit: 04-11-2026\nRahul: "Go."\nsound: none\n');
  const d = (cmd) => decide(cmd, { root, cwd: root });
  const cases = [
    ['a film with no greenlight stops', d('cd /x && node studio.mjs make videos/dscr-film'), true],
    ['its draft stops too', d('node studio.mjs make videos/dscr-film --draft'), true],
    ['a board stops', d('node studio.mjs board videos/dscr-film --at 1000'), true],
    ['npm run make stops', d('npm run make -- videos/dscr-film'), true],
    ['a greenlight without Rahul\'s words stops', d('node studio.mjs make videos/unsigned'), true],
    ['a greenlit film passes', d('node studio.mjs make videos/ok-film'), false],
    ['silent and sound off passes', d(`cd ${studio} && node studio.mjs make videos/quiet`), false],
    ['sound none with sound on stops', d(`cd ${studio} && node studio.mjs make videos/loud --draft`), true],
    ['the test card passes', d('node studio.mjs make videos/test-card'), false],
    ['the studio\'s tests pass', d('cd /x && npm test'), false],
    ['a measure passes', d('node studio.mjs measure videos/dscr-film --draft'), false],
    ['two renders, one blocked', d('node studio.mjs make videos/ok-film && node studio.mjs make videos/dscr-film'), true],
  ];
  fs.rmSync(root, { recursive: true, force: true });
  const bad = cases.filter(([, got, stop]) => Boolean(got) !== stop);
  for (const [name, got] of bad) console.log(`FAIL ${name}: ${got}`);
  console.log(`film gate: ${cases.length - bad.length} of ${cases.length} cases`);
  process.exit(bad.length ? 1 : 0);
}

if (process.argv.includes('--self-test')) selfTest();
else main().catch(() => {});
