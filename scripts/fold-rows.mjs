/**
 * A row's notes (D-TECH-66): each row's session writes its decisions, traps, lessons, the owner's to-dos,
 * its cost line and its handoff to `docs/rows/<ROW>.md` only, so two sessions never edit the same lines of
 * the shared docs and their PRs stop conflicting. `npm run fold` (the main conversation, as it merges: D-TECH-69)
 * moves every notes file into the shared docs and prints each one's handoff to write into HANDOFF by hand.
 * `--check` (in verify) checks the notes' form, that no decision ID is taken twice, and that a branch
 * that adds a notes file leaves the shared docs alone.
 */
import { readFileSync, writeFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const DIR = 'docs/rows';
const SHARED = ['docs/DECISIONS.md', 'docs/GOTCHAS.md', 'docs/LESSONS.md', 'docs/OWNER.md', 'docs/HANDOFF.md'];
const PARTS = ['Decisions', 'Gotchas', 'Lessons', 'Owner', 'Cost', 'Handoff'];
const AREAS = ['POL', 'UX', 'TECH', 'DOC', 'DATA', 'AI', 'BIZ'];
const KEEP = 10; // cost lines kept in HANDOFF; older ones move to the archive

const read = (f) => readFileSync(f, 'utf8');
const files = () => (existsSync(DIR) ? readdirSync(DIR).filter((f) => f.endsWith('.md') && f !== 'README.md').sort() : []);

/** The notes file's parts: { Decisions: [lines], ... }, and the problems with its form. */
function parse(name) {
  const parts = {}, bad = [];
  let cur = null;
  for (const line of read(`${DIR}/${name}`).split('\n')) {
    const h = line.match(/^## (.+?)\s*$/);
    if (h) {
      cur = h[1];
      if (!PARTS.includes(cur)) bad.push(`${name}: "## ${cur}" is not one of ${PARTS.join(', ')}`);
      parts[cur] ??= [];
    } else if (cur && line.trim()) parts[cur].push(line);
  }
  for (const l of parts.Decisions ?? []) {
    const m = l.match(/^\| D-([A-Z]+)-\d+ \|/);
    if (!m || !AREAS.includes(m[1])) bad.push(`${name}: a decision line starts "| D-<${AREAS.join('|')}>-<n> |": ${l.slice(0, 60)}`);
  }
  for (const l of parts.Cost ?? []) if ((l.match(/\|/g) ?? []).length !== 5) bad.push(`${name}: a cost line is "| date | row | budget | actual |": ${l.slice(0, 60)}`);
  return { parts, bad };
}

const ids = (lines) => lines.map((l) => l.match(/^\| (D-[A-Z]+-\d+) \|/)?.[1]).filter(Boolean);

/** Lines inserted after the last table row of the `## <heading>` section. */
function intoSection(text, heading, lines) {
  const rows = text.split('\n');
  const start = rows.findIndex((r) => r.trim() === `## ${heading}`);
  if (start < 0) throw new Error(`no "## ${heading}" section`);
  let last = start;
  for (let i = start + 1; i < rows.length && !rows[i].startsWith('## '); i++) if (rows[i].startsWith('|')) last = i;
  rows.splice(last + 1, 0, ...lines);
  return rows.join('\n');
}

/** Lines inserted at the top of the first table after `heading`, below its separator; returns the table's rows too. */
function topOfTable(text, heading, lines) {
  const rows = text.split('\n');
  const start = rows.findIndex((r) => r.startsWith(heading));
  const sep = rows.findIndex((r, i) => i > start && /^\|[-| ]+\|$/.test(r));
  if (start < 0 || sep < 0) throw new Error(`no table under "${heading}"`);
  rows.splice(sep + 1, 0, ...lines);
  return rows;
}

const append = (text, lines) => `${text.trimEnd()}\n${lines.join('\n')}\n`;

function check() {
  const bad = [], seen = new Map(), logged = new Set(ids(read('docs/DECISIONS.md').split('\n')));
  for (const f of files()) {
    const { parts, bad: b } = parse(f);
    bad.push(...b);
    for (const id of ids(parts.Decisions ?? [])) {
      if (logged.has(id)) bad.push(`${f}: ${id} is already in docs/DECISIONS.md`);
      if (seen.has(id)) bad.push(`${f}: ${id} is also in ${seen.get(id)}`);
      seen.set(id, f);
    }
  }
  // A row's branch adds its notes file and leaves the shared docs to the fold (skipped without origin/main).
  const git = (a) => spawnSync('git', a, { encoding: 'utf8' });
  const base = git(['merge-base', 'origin/main', 'HEAD']).stdout.trim();
  if (base) {
    const added = git(['diff', '--name-only', '--diff-filter=A', base, '--', DIR]).stdout.split('\n')
      .concat(git(['ls-files', '--others', '--exclude-standard', DIR]).stdout.split('\n')).filter((f) => f && !f.endsWith('README.md'));
    const touched = git(['diff', '--name-only', base, '--', ...SHARED]).stdout.split('\n').filter(Boolean);
    if (added.length && touched.length) bad.push(`this branch adds ${added.join(', ')} and also changes ${touched.join(', ')}: a row's branch writes its notes file only (docs/rows/README.md)`);
  }
  for (const b of bad) console.log(b);
  console.log(`row notes: ${files().length} files, ${bad.length} violations`);
  process.exit(bad.length ? 1 : 0);
}

function fold() {
  const list = files();
  if (!list.length) return console.log('row notes: nothing to fold');
  let dec = read('docs/DECISIONS.md'), got = read('docs/GOTCHAS.md'), les = read('docs/LESSONS.md'), own = read('docs/OWNER.md');
  let hand = read('docs/HANDOFF.md'), arch = read('docs/HANDOFF-ARCHIVE.md');
  const handoffs = [];
  for (const f of list) {
    const { parts, bad } = parse(f);
    if (bad.length) throw new Error(bad.join('\n'));
    for (const l of parts.Decisions ?? []) dec = intoSection(dec, l.match(/^\| D-([A-Z]+)-/)[1], [l]);
    if (parts.Gotchas?.length) got = append(got, parts.Gotchas);
    if (parts.Lessons?.length) les = append(les, parts.Lessons);
    if (parts.Owner?.length) own = append(own, parts.Owner);
    if (parts.Cost?.length) {
      const rows = topOfTable(hand, '## Budgets and actuals', parts.Cost);
      const sep = rows.findIndex((r, i) => i > rows.findIndex((x) => x.startsWith('## Budgets and actuals')) && /^\|[-| ]+\|$/.test(r));
      let end = sep + 1;
      while (rows[end]?.startsWith('|')) end++;
      const old = rows.splice(sep + 1 + KEEP, Math.max(0, end - sep - 1 - KEEP));
      hand = rows.join('\n');
      if (old.length) arch = topOfTable(arch, '## Budgets and actuals', old).join('\n');
    }
    handoffs.push(`${f}:\n${(parts.Handoff ?? ['(no handoff)']).join('\n')}`);
    rmSync(`${DIR}/${f}`);
  }
  writeFileSync('docs/DECISIONS.md', dec);
  writeFileSync('docs/GOTCHAS.md', got);
  writeFileSync('docs/LESSONS.md', les);
  writeFileSync('docs/OWNER.md', own);
  writeFileSync('docs/HANDOFF.md', hand);
  writeFileSync('docs/HANDOFF-ARCHIVE.md', arch);
  console.log(`row notes: folded ${list.join(', ')}. Write each handoff into docs/HANDOFF.md (the state line and the rows):\n\n${handoffs.join('\n\n')}`);
}

process.argv.includes('--check') ? check() : fold();
