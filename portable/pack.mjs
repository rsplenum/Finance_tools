/**
 * The owner's portable skill pack (D-TECH-27): the general skills the owner uploads to their claude.ai account,
 * from where they load in the owner's sessions of every project. `--check` only
 * checks the pack; with no flag it also writes one zip per skill to portable/dist/ (not committed), with the
 * skill's folder at the zip's root, as claude.ai asks. It fails when a skill's name differs from its folder,
 * a description is empty or over claude.ai's 200 characters, or a file names something of this project.
 * It runs when the pack is made (`npm run pack-skills`), not in `npm run verify`: a skill's wording never fails the
 * site's build, and no lesson has to be kept word for word in two files (REFORM1).
 */
import { cpSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = join(import.meta.dirname, '..');
// Each skill's master copy, and the files added to its folder from elsewhere in the repo.
const skills = {
  'working-practice': { dir: 'portable/skills/working-practice', add: { 'fetcher.md': '.claude/agents/fetcher.md' } },
  'brief-first': { dir: 'portable/skills/brief-first' },
  'money-maths-checks': { dir: 'portable/skills/money-maths-checks' },
  'lender-documents': { dir: 'portable/skills/lender-documents' },
  lessons: { dir: '.claude/skills/lessons' },
};
// Words that belong to this project only: decision and session ids, its folders, its names and examples.
const projectWords = [/\bD-[A-Z]+-\d+/, /\b[EVLTP]\d\d?[a-f]?\b/, /\b(engine|site|tests|worker)\//, /architect/i, /finance[-_ ]?tools/i, /pages\.dev/, /rsplenum/i, /planning estimate/i, /\bBHK\b/, /\bPune\b/];

const problems = [];
for (const [name, { dir, add = {} }] of Object.entries(skills)) {
  const skill = readFileSync(join(root, dir, 'SKILL.md'), 'utf8');
  const field = (k) => skill.match(new RegExp(`^${k}: (.*)$`, 'm'))?.[1].trim() ?? '';
  if (field('name') !== name) problems.push(`${name}: its name reads "${field('name')}"`);
  const d = field('description').length;
  if (!d || d > 200) problems.push(`${name}: a description of ${d} characters (claude.ai takes 1 to 200)`);
  const own = readdirSync(join(root, dir), { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).map((e) => join(e.parentPath, e.name));
  for (const path of [...own, ...Object.values(add).map((p) => join(root, p))]) {
    const t = readFileSync(path, 'utf8');
    t.split('\n').forEach((line, i) => {
      const w = projectWords.find((re) => re.test(line));
      if (w) problems.push(`${path.slice(root.length + 1)}:${i + 1} names this project ("${line.match(w)[0]}")`);
    });
  }
}
if (!process.argv.includes('--check') && !problems.length) {
  const dist = join(root, 'portable/dist');
  rmSync(dist, { recursive: true, force: true });
  for (const [name, { dir, add = {} }] of Object.entries(skills)) {
    cpSync(join(root, dir), join(dist, 'stage', name), { recursive: true });
    for (const [to, from] of Object.entries(add)) cpSync(join(root, from), join(dist, 'stage', name, to));
    let r = spawnSync('zip', ['-qr', join(dist, `${name}.zip`), name], { cwd: join(dist, 'stage') });
    if (r.error) r = spawnSync('python3', ['-m', 'zipfile', '-c', join(dist, `${name}.zip`), name], { cwd: join(dist, 'stage') });
    if (r.status !== 0) problems.push(`${name}: the zip failed (${r.error?.message ?? r.stderr})`);
  }
  rmSync(join(dist, 'stage'), { recursive: true, force: true });
}
for (const p of problems) console.log(p);
console.log(`skill pack: ${Object.keys(skills).length} skills, ${problems.length} violations${process.argv.includes('--check') || problems.length ? '' : '; zips in portable/dist/'}`);
process.exit(problems.length ? 1 : 0);
