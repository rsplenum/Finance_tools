// The files every session reads whole stay short (D-TECH-29): each step re-sends them.
import { statSync } from 'node:fs';

// The design team's agents read docs/DESIGN.md whole on every run, and its lessons queue (D-UX-58).
// DESIGN.md holds 14 KB while the forbidden list (D-UX-67) sits beside the old look's rules; 12 KB again once UX4 retires them.
const caps = { 'docs/HANDOFF.md': 10240, 'CLAUDE.md': 7168, 'docs/DESIGN.md': 14336, 'docs/DESIGN-LESSONS.md': 6144, 'docs/DESIGN-MATHS.md': 8192 };
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
