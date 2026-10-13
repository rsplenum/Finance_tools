// The files every session reads whole stay short (D-TECH-29): each step re-sends them.
import { statSync } from 'node:fs';

// The design team's agents read docs/DESIGN.md whole on every run, and its lessons queue (D-UX-58).
const caps = { 'docs/HANDOFF.md': 10240, 'CLAUDE.md': 7168, 'docs/DESIGN.md': 12288, 'docs/DESIGN-LESSONS.md': 6144 };
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
