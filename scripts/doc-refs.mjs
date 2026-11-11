// D-TECH-85: a row first checks every path and decision number named in it. For each file (optionally only some of
// its "## <n>." sections) this prints each decision number named, with its title from docs/DECISIONS.md (or the retired entries in docs/archive/), and each
// path in backticks found in neither repo, so the session judges in one look whether each decision says what the row
// says and whether each missing path is one the row makes.
// `node scripts/doc-refs.mjs docs/video/VID2-prompts.md#0,1 docs/video/VID2-script.md [--studio /home/user/video-studio]`
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const at = args.indexOf('--studio');
const roots = [process.cwd(), ...(at >= 0 ? [args[at + 1]] : [])];
const files = args.filter((a, i) => at < 0 || (i !== at && i !== at + 1));
if (!files.length) throw new Error('Usage: node scripts/doc-refs.mjs <file>[#<section>,...] ... [--studio <dir>]');

const decisions = new Map();
for (const line of ['docs/DECISIONS.md', 'docs/archive/DECISIONS-RETIRED.md'].flatMap((f) => fs.readFileSync(f, 'utf8').split('\n'))) {
  const m = line.match(/^\| (D-[A-Z]+-\d+) \| [^|]+ \| \*\*(.+?)\*\*/);
  if (m) decisions.set(m[1], m[2]);
}
const TOOLS = ['dscr', 'cma', 'report', 'estimate'];
const exists = (p) => {
  const tries = p.includes('<tool>') ? TOOLS.map((t) => p.replaceAll('<tool>', t)) : [p];
  if (tries.some((t) => /<[^>]+>/.test(t))) return true; // another placeholder: not checkable
  return tries.every((t) => roots.some((r) => fs.existsSync(path.join(r, t))));
};

let bad = 0;
for (const arg of files) {
  const [file, want] = arg.split('#');
  let text = fs.readFileSync(file, 'utf8');
  if (want) {
    const keep = new Set(want.split(','));
    text = text.split(/^(?=## )/m).filter((s) => keep.has((s.match(/^## (\d+)\./) || [])[1])).join('');
  }
  const ids = [...new Set(text.match(/D-[A-Z]+-\d+/g) || [])];
  const paths = [...new Set([...text.matchAll(/`([^`\s]+)`/g)].map((m) => m[1].split(/[:#]/)[0])
    .filter((p) => /\//.test(p) && !/^https?:|^\/\/|^\.\.\.|^rsplenum\/|^\/.*\/$|[()=]/.test(p) && !p.startsWith('/home/user/')))];
  console.log(`${arg}: ${ids.length} decisions, ${paths.length} paths`);
  for (const id of ids) {
    const title = decisions.get(id);
    if (!title) bad++;
    console.log(`  ${id}  ${title ? title.slice(0, 110) : 'MISSING from docs/DECISIONS.md'}`);
  }
  for (const p of paths.filter((p) => !exists(p))) console.log(`  not found: ${p}`);
}
if (bad) process.exitCode = 1;
