// VID2b (D-UX-254): hands the video studio one tool's story as home tells it, every figure the engine's.
// `node scripts/video-figures.mjs <dscr|cma|report|estimate> <out.json>` writes the tool's scene (SCENES in
// site/src/home/story.ts, worked out by the engine when this runs) and `figures`, every number its words hold,
// which the studio's check holds the video to (rsplenum/video-studio, lib/figures.mjs).
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'vite';

const [tool, out] = process.argv.slice(2);
if (!tool || !out) throw new Error('Usage: node scripts/video-figures.mjs <dscr|cma|report|estimate> <out.json>');
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent', optimizeDeps: { noDiscovery: true } });
try {
  const s = await vite.ssrLoadModule('/site/src/home/story.ts');
  const scene = s.SCENES[tool];
  if (!scene) throw new Error(`No scene "${tool}"; there are ${Object.keys(s.SCENES).join(', ')}.`);
  const extra = tool === 'dscr' ? { fix: s.STORY_FIX, average: { target: s.STORY_TARGET.average, typed: s.STORY_TYPED.average, fixed: s.STORY_LONGER.average } } : {};
  const strings = [];
  const walk = (v) => (typeof v === 'string' ? strings.push(v) : v && typeof v === 'object' && Object.values(v).forEach(walk));
  walk({ scene, extra });
  const figures = [...new Set(strings.filter((x) => /\d/.test(x)))];
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, JSON.stringify({ from: 'Finance_tools site/src/home/story.ts', tool, scene, ...extra, figures }, null, 1) + '\n');
  console.log(`${tool}: ${scene.rows.length} rows, ${figures.length} strings with figures -> ${out}`);
} finally {
  await vite.close();
}
