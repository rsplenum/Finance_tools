/** POST /e (UD1, D-TECH-37): a batch of the right shape from the site's own origin is stored, one row per event, with
 * nothing from the request but the batch; anything else is refused and nothing is written. */
import { describe, it, expect } from 'vitest';
import worker from '../src/index';
import { KEEP_DAYS } from '../src/events';

const SITE = 'https://finance-tools-9if.pages.dev';
/** Cloudflare's rate limiter, mocked: `limit` calls a key may make before it says no; the keys it was given. */
function limiter(limit = 30) {
  const n = new Map<string, number>();
  return { keys: n, limit: async ({ key }: { key: string }) => { n.set(key, (n.get(key) ?? 0) + 1); return { success: n.get(key)! <= limit }; } };
}
function envOf(db = true, EVENTS_LIMIT: unknown = limiter()) {
  const rows: unknown[][] = [], runs: unknown[][] = [];
  const DB = {
    prepare: (sql: string) => ({ sql, bind: (...a: unknown[]) => ({ sql, a, run: async () => { runs.push([sql, ...a]); } }) }),
    batch: async (stmts: { a: unknown[] }[]) => { for (const s of stmts) rows.push(s.a); },
  };
  return { env: { READ_ORIGINS: `${SITE},.finance-tools-9if.pages.dev`, ...(db ? { DB } : {}), ...(EVENTS_LIMIT ? { EVENTS_LIMIT } : {}) } as unknown as Env, rows, runs };
}
const good = { v: 1, page: '/dscr/', from: '/', w: 'phone', visit: '0a1b2c3d', ev: [
  { e: 'open', t: 0 }, { e: 'field', f: 'fld-loanAmount', t: 4200 }, { e: 'result', f: 'dscr-status-ready', t: 61000 }, { e: 'download', f: 'pdf', t: 70000 },
] };
const post = (env: Env, body: unknown = good, origin = SITE, path = '/api/e') =>
  worker.fetch(new Request(`https://api.test${path}`, { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'content-type': 'text/plain', origin, 'cf-connecting-ip': '1.2.3.4', 'user-agent': 'Phone/1' } }) as Parameters<typeof worker.fetch>[0], env);

describe('POST /e', () => {
  it('stores each event as a row, with no IP or user agent', async () => {
    const { env, rows } = envOf();
    const r = await post(env);
    expect(r.status).toBe(204);
    expect(r.headers.get('access-control-allow-origin')).toBe(SITE);
    expect(rows.length).toBe(4);
    expect(rows[1].slice(1)).toEqual(['0a1b2c3d', '/dscr/', '/', 'phone', 'field', 'fld-loanAmount', 4200]);
    expect(rows[0][6]).toBeNull();
    expect(String(rows[0][0])).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d$/);
    expect(JSON.stringify(rows)).not.toMatch(/1\.2\.3\.4|Phone/);
    expect((await post(env, good, SITE, '/e')).status).toBe(204);
  });
  it('refuses another origin, a wrong shape, a figure as a name, and anything more than the shape', async () => {
    const { env, rows } = envOf();
    expect((await post(env, good, 'https://elsewhere.example')).status).toBe(403);
    expect((await post(env, 'not json')).status).toBe(400);
    expect((await post(env, { ...good, amount: 1200000 })).status).toBe(400);
    expect((await post(env, { ...good, ev: [{ e: 'field', f: 'loan-1200000', t: 1 }] })).status).toBe(400);
    expect((await post(env, { ...good, ev: [{ e: 'field', f: '12 L', t: 1 }] })).status).toBe(400);
    expect((await post(env, { ...good, ev: [{ e: 'field', f: 'fld-x', t: 1, value: '12 L' }] })).status).toBe(400);
    expect((await post(env, { ...good, ev: [{ e: 'typed', t: 1 }] })).status).toBe(400);
    expect((await post(env, { ...good, visit: 'abc' })).status).toBe(400);
    expect((await post(env, { ...good, ev: Array(51).fill({ e: 'open', t: 0 }) })).status).toBe(400);
    expect((await post(env, 'x'.repeat(20_000))).status).toBe(413);
    expect(rows.length).toBe(0);
  });
  it('caps a burst from one address, keyed by the address alone, and takes nothing without the limiter (SEC1)', async () => {
    const lim = limiter(2), { env, rows } = envOf(true, lim);
    expect((await post(env)).status).toBe(204);
    expect((await post(env)).status).toBe(204);
    expect((await post(env)).status).toBe(429);
    expect(rows.length).toBe(8);
    expect([...lim.keys.keys()]).toEqual(['1.2.3.4']);
    expect((await post(envOf(true, null).env)).status).toBe(503);
  });
  it('refuses a body over the cap with no header, or with a header that lies (SEC1)', async () => {
    const { env, rows } = envOf();
    const big = JSON.stringify({ ...good, page: 'x'.repeat(20_000) });
    const raw = (body: BodyInit, headers: Record<string, string> = {}) => worker.fetch(new Request('https://api.test/e', { method: 'POST', body, headers: { origin: SITE, ...headers }, duplex: 'half' } as RequestInit) as Parameters<typeof worker.fetch>[0], env);
    expect((await raw(new Blob([big]).stream())).status).toBe(413);
    expect((await raw(big, { 'content-length': '10' })).status).toBe(413);
    expect(rows.length).toBe(0);
  });
  it('says so without a database, and refuses GET', async () => {
    expect((await post(envOf(false).env)).status).toBe(503);
    const r = await worker.fetch(new Request('https://api.test/e') as Parameters<typeof worker.fetch>[0], envOf().env);
    expect(r.status).toBe(405);
  });
  it('deletes rows past the keeping time each night', async () => {
    const { env, runs } = envOf();
    await worker.scheduled({} as ScheduledController, env);
    expect(runs[0][0]).toBe('DELETE FROM events WHERE at < ?');
    const days = (Date.now() - Date.parse(`${runs[0][1]}Z`)) / 86_400_000;
    expect(Math.round(days)).toBe(KEEP_DAYS);
  });
});
