// The files every session reads whole stay short (D-TECH-29): each step re-sends them.
import { statSync } from 'node:fs';

// HANDOFF and PROJECT are read whole by a session; CLAUDE.md is paid for at every step.
const caps = { 'docs/HANDOFF.md': 10240, 'CLAUDE.md': 6144, 'docs/PROJECT.md': 4096 };
let bad = 0;
for (const [f, cap] of Object.entries(caps)) {
  const n = statSync(f).size;
  if (n > cap) {
    bad++;
    console.log(`${f}: ${n} bytes, over its cap of ${cap}: move history to docs/HANDOFF-ARCHIVE.md, to-dos to docs/OWNER.md, traps to docs/GOTCHAS.md, lessons to docs/lessons/`);
  }
}
console.log(`doc sizes: ${bad} violations`);
process.exit(bad ? 1 : 0);
