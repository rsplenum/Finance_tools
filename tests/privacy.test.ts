import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CAP_DAYS as WORKER_CAP_DAYS } from '../worker/src/caps';
import { KEEP_DAYS as WORKER_KEEP_DAYS } from '../worker/src/events';
import { KINDS, WIDTHS } from '../worker/src/event-shape';
import { CAP_DAYS, KEEP_DAYS, privacySections } from '../site/src/privacy';

// Each fact the privacy page states, held against the code that makes it true (PRIV1, D-BIZ-07).
const read = (p: string) => readFileSync(p, 'utf8');
const filesOf = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
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
  it('states the Worker’s own keeping times', () => {
    expect(KEEP_DAYS).toBe(WORKER_KEEP_DAYS);
    expect(CAP_DAYS).toBe(WORKER_CAP_DAYS);
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
  it('sets no cookie and keeps only the two choices it names in the browser', () => {
    for (const f of [...site, ...worker]) expect(read(f), f).not.toMatch(/document\.cookie|set-cookie/i);
    const stores = site.filter((f) => /localStorage\.setItem|sessionStorage|indexedDB/.test(read(f)));
    expect(stores.sort()).toEqual(['site/src/report/Report.tsx', 'site/src/theme.ts']);
  });
  it('sends to our server only the counts, a statement’s lines and the draft’s inputs', () => {
    const calls = site.filter((f) => /\bfetch\(|sendBeacon/.test(read(f)));
    expect(calls.sort()).toEqual(['site/src/cma/Read.tsx', 'site/src/events.ts', 'site/src/report/Words.tsx']);
    expect(read('site/src/cma/Read.tsx')).toMatch(/JSON\.stringify\(\{ lines \}\)/);
    const keys = read('engine/narrative.ts').match(/export interface NarrativeInput \{([^}]+)\}/)?.[1].match(/\w+(?=:)/g);
    expect(keys).toEqual(['name', 'activity', 'address', 'constitution', 'scheme', 'products', 'covers', 'finance', 'notes']);
  });
  it('logs only the kind of an AI failure, and no request', () => {
    for (const f of ['worker/src/read.ts', 'worker/src/draft.ts']) {
      const logs = read(f).match(/console\.\w+\([^\n]*/g) ?? [];
      expect(logs.length, f).toBe(1);
      expect(logs[0]).toMatch(/e\.status : \(e as Error\)\?\.name\)/);
    }
    expect(worker.filter((f) => /console\./.test(read(f))).sort()).toEqual(['worker/src/draft.ts', 'worker/src/read.ts']);
    expect(read('worker/wrangler.jsonc')).toMatch(/"invocation_logs": false/);
  });
});
