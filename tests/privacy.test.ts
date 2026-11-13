import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { KINDS, WIDTHS } from '../worker/src/event-shape';
import { CAP_DAYS, KEEP_DAYS, privacySections } from '../site/src/privacy';

// Each fact the privacy page states, held against the code that makes it true (PRIV1, D-BIZ-07).
const read = (p: string) => readFileSync(p, 'utf8');
const filesOf = (dir: string): string[] => readdirSync(dir).flatMap((f: string): string[] => {
  const p = `${dir}/${f}`;
  return statSync(p).isDirectory() ? filesOf(p) : /\.(ts|tsx|astro|mjs)$/.test(f) ? [p] : [];
});
const site = filesOf('site/src'), worker = filesOf('worker/src');
const text = privacySections(true).flatMap((s) => s.p.flat()).join(' ');

describe('the privacy page against the code', () => {
  it('ties every section to files that exist', () => {
    for (const s of privacySections(false)) {
      expect(s.src.length, s.h).toBeGreaterThan(0);
      for (const f of s.src) expect(existsSync(f), `${s.h}: ${f}`).toBe(true);
    }
  });
  it('names each company whose AI the Worker can call, and Google only on its paid terms (READ1)', () => {
    const ai = read('worker/src/ai.ts');
    expect(ai).toContain('generativelanguage.googleapis.com');
    expect(ai).toContain("from '@anthropic-ai/sdk'");
    expect(text).toMatch(/Google \(Gemini\) or Anthropic \(Claude\)/);
    expect(text).toMatch(/Google only on its paid terms/);
    expect(read('site/src/report/Words.tsx')).toMatch(/Google’s or Anthropic’s/);
  });
  it('states the Worker’s own keeping times', () => {
    // The Worker's modules need its own types, so their numbers are read from the source.
    expect(read('worker/src/events.ts')).toContain(`export const KEEP_DAYS = ${KEEP_DAYS};`);
    expect(read('worker/src/caps.ts')).toContain(`export const CAP_DAYS = ${CAP_DAYS};`);
    expect(read('worker/src/caps.ts')).toMatch(/expirationTtl: CAP_DAYS \* 86400/);
    const limit = read('worker/wrangler.jsonc').match(/"EVENTS_LIMIT".*"period": (\d+)/)?.[1];
    expect(limit).toBe('60');
    expect(text).toMatch(/counted for one minute/);
  });
  it('lists what a count holds, and no more', () => {
    const cols = read('worker/src/events.ts').match(/INSERT INTO events \(([^)]+)\)/)?.[1].split(', ');
    expect(cols).toEqual(['at', 'visit', 'page', 'came', 'width', 'kind', 'name', 'ms']);
    expect([...WIDTHS]).toEqual(['phone', 'tablet', 'desktop']);
    expect([...KINDS]).toEqual(['open', 'field', 'more', 'tap', 'result', 'download', 'error', 'leave']);
    expect(read('worker/src/events.ts')).not.toMatch(/user-agent/i);
  });
  it('sets no cookie and keeps in the browser only the two choices, the tab’s answers and the report’s answers it names', () => {
    for (const f of [...site, ...worker]) expect(read(f), f).not.toMatch(/document\.cookie|set-cookie/i);
    const stores = site.filter((f) => /localStorage\.setItem|sessionStorage|indexedDB/.test(read(f)));
    expect(stores.sort()).toEqual(['site/src/fields.tsx', 'site/src/report/Report.tsx', 'site/src/theme.ts', 'site/src/worked/kept.ts']);
    // Answers stay on the device for two tools: the project report (D-UX-341) and the DSCR made new (NEW1,
    // docs/WORKED-PAGE.md §4, under `worked:dscr`): the pages and the privacy page say so.
    const device = site.filter((f) => /useKept\([^)]*, true\)/.test(read(f)));
    expect(device).toEqual(['site/src/report/Report.tsx']);
    expect(read('site/src/fields.tsx')).toMatch(/const store = \(\) => device \? localStorage : sessionStorage;/);
    expect(read('site/src/pages/project-report.astro')).toMatch(/kept="device"/);
    expect(text).toMatch(/On the project report they are saved in your browser until you press Clear all/);
    expect(read('site/src/worked/kept.ts')).toMatch(/const key = `worked:\$\{spec\.tool\}`/);
    expect(read('site/src/dscr/Worked.tsx')).toMatch(/tool: 'dscr'/);
    expect(text).toMatch(/on the DSCR until you press Start again from the example/);
  });
  it('sends to our server only the counts, a statement’s lines and the draft’s inputs', () => {
    const calls = site.filter((f) => /\bfetch\(|sendBeacon/.test(read(f)));
    expect(calls.sort()).toEqual(['site/src/cma/Read.tsx', 'site/src/events.ts', 'site/src/report/Words.tsx']);
    expect(read('site/src/cma/Read.tsx')).toMatch(/JSON\.stringify\(\{ lines \}\)/);
    const keys = read('engine/narrative.ts').match(/export interface NarrativeInput \{([^}]+)\}/)?.[1].match(/\w+(?=:)/g);
    expect(keys).toEqual(['name', 'activity', 'address', 'constitution', 'scheme', 'products', 'covers', 'finance', 'notes']);
  });
  it('logs only the kind of an AI failure, and no request', () => {
    // Every AI call goes through ai.ts (READ1): the route's name, the provider, and a status or an error's kind.
    expect(read('worker/src/ai.ts').match(/console\.\w+\([^\n]*/g)).toEqual([
      "console.error(`${job.name} failed`, 'anthropic', e instanceof Anthropic.APIError ? e.status : (e as Error)?.name);",
      "console.error(`${job.name} failed`, 'gemini', r.status);",
      "console.error(`${job.name} failed`, 'gemini', (e as Error)?.name);",
    ]);
    expect(worker.filter((f) => /console\./.test(read(f))).sort()).toEqual(['worker/src/ai.ts']);
    expect(read('worker/wrangler.jsonc')).toMatch(/"invocation_logs": false/);
  });
});
