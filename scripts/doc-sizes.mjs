// The files every session reads whole stay short (D-TECH-29): each step re-sends them.
import { statSync } from 'node:fs';

// The design team's agents read docs/DESIGN.md whole on every run, and its lessons queue (D-UX-58).
// DESIGN.md back to 12 KB once UX6 retired the old look's rules.
// The vision stays on one page (VIS1, D-BIZ-11).
const caps = { 'docs/HANDOFF.md': 10240, 'CLAUDE.md': 7168, 'docs/DESIGN.md': 12288, 'docs/DESIGN-LESSONS.md': 6144, 'docs/DESIGN-MATHS.md': 8192, 'docs/PROJECT.md': 4096 };
let bad = 0;
for (const [f, cap] of Object.entries(caps)) {
  const n = statSync(f).size;
  if (n > cap) {
    bad++;
    console.log(`${f}: ${n} bytes, over its cap of ${cap}: move history to docs/HANDOFF-ARCHIVE.md, to-dos to docs/OWNER.md, traps to docs/GOTCHAS.md, a design lesson accepted or dropped out of the queue`);
  }
}
console.log(`doc sizes: ${bad} violations`);
process.exit(bad ? 1 : 0);
