/** SEC1 (D-TECH-54, audit S1-S3): a body's size counted from its bytes, the AI's answer checked on the server, and
 * batches capped per address; each refusal tested before the model or the database is reached. */
import { describe, it, expect, vi, afterEach } from 'vitest';
import worker from '../src/index';
import { fits } from '../src/shape';
import { SCHEMA } from '../src/read';
import { NOTES, SCHEMA as DRAFT_SCHEMA, SECTIONS } from '../../engine/narrative';

const SITE = 'https://finance-tools-9if.pages.dev';
const kv = () => { const m = new Map<string, string>(); return { get: async (k: string) => m.get(k) ?? null, put: async (k: string, v: string) => void m.set(k, v) }; };
const envOf = (over: Record<string, unknown> = {}) => ({
  DB: { prepare: () => ({ bind: () => ({}) }), batch: async () => {} }, KV: kv(), ANTHROPIC_API_KEY: 'test-key',
  READ_MODEL: 'claude-opus-5-5', READ_EFFORT: 'medium', READ_PER_IP: '9', READ_PER_DAY: '9',
  DRAFT_MODEL: 'claude-opus-5-5', DRAFT_EFFORT: 'low', DRAFT_PER_IP: '9', DRAFT_PER_DAY: '9',
  READ_ORIGINS: `${SITE},.finance-tools-9if.pages.dev`, EVENTS_LIMIT: { limit: async () => ({ success: true }) }, ...over,
}) as unknown as Env;
type Init = RequestInit & { duplex?: 'half' };
const call = (path: string, env: Env, init: Init) =>
  worker.fetch(new Request(`https://api.test${path}`, { method: 'POST', ...init, headers: { 'cf-connecting-ip': '1.2.3.4', ...(init.headers as Record<string, string>) } }) as Parameters<typeof worker.fetch>[0], env);
/** A body sent as a stream, so it carries no Content-Length at all. */
const stream = (text: string) => new ReadableStream({ start(c) { const b = new TextEncoder().encode(text); for (let i = 0; i < b.length; i += 65_536) c.enqueue(b.slice(i, i + 65_536)); c.close(); } });

function mockApi(text: string) {
  const sent: unknown[] = [];
  vi.stubGlobal('fetch', vi.fn(async (_u: unknown, init?: RequestInit) => {
    sent.push(init?.body);
    return new Response(JSON.stringify({ id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-opus-5-5', usage: { input_tokens: 1, output_tokens: 1 }, stop_reason: 'end_turn', content: [{ type: 'text', text }] }), { status: 200, headers: { 'content-type': 'application/json' } });
  }));
  return sent;
}
afterEach(() => vi.unstubAllGlobals());

const big = JSON.stringify({ lines: [{ page: 1, line: 1, text: 'x'.repeat(1_000_000) }] });
const facts = { name: 'A', activity: 'B', address: 'C', constitution: 'D', scheme: 'E', products: [], covers: [], finance: [], notes: Object.fromEntries(NOTES.map((n) => [n.id, ''])) };

describe('a body is counted by its bytes', () => {
  it('refuses a body too long with no Content-Length, before the model', async () => {
    const sent = mockApi('{}');
    for (const path of ['/read', '/draft']) {
      const r = await call(path, envOf(), { body: stream(big), duplex: 'half', headers: { 'content-type': 'application/json' } });
      expect(r.status).toBe(413);
    }
    const e = await call('/e', envOf(), { body: stream('x'.repeat(20_000)), duplex: 'half', headers: { origin: SITE } });
    expect(e.status).toBe(413);
    expect(sent.length).toBe(0);
  });
  it('refuses a body longer than its Content-Length says', async () => {
    const sent = mockApi('{}');
    const r = await call('/read', envOf(), { body: big, headers: { 'content-type': 'application/json', 'content-length': '20' } });
    expect(r.status).toBe(413);
    expect(sent.length).toBe(0);
  });
});

describe('the AI’s answer is checked on the server', () => {
  it('refuses a read answer outside its schema', async () => {
    const lines = JSON.stringify({ lines: [{ page: 1, line: 1, text: 'Revenue 390.00' }] });
    for (const bad of ['not json', '{"yearsAt":{"page":1,"line":1}}', JSON.stringify({ yearsAt: { page: 1, line: 1 }, unitsAt: { page: 1, line: 1 }, placements: [{ head: 'invented', column: 'current', at: [] }], totals: [] }), JSON.stringify({ yearsAt: { page: 1.5, line: 1 }, unitsAt: { page: 1, line: 1 }, placements: [], totals: [], amount: 12 })]) {
      mockApi(bad);
      const r = await call('/read', envOf(), { body: lines, headers: { 'content-type': 'application/json' } });
      expect(r.status).toBe(502);
      expect(JSON.stringify(await r.json())).not.toMatch(/invented|amount/);
    }
  });
  it('refuses a draft with a section missing, added or not words', async () => {
    const ids = SECTIONS.map((s) => s.id), all = Object.fromEntries(ids.map((id) => [id, 'Words.']));
    const { [ids[0]]: _, ...short } = all;
    for (const bad of [short, { ...all, extra: 'x' }, { ...all, [ids[0]]: 12 }]) {
      mockApi(JSON.stringify(bad));
      const r = await call('/draft', envOf(), { body: JSON.stringify(facts), headers: { 'content-type': 'application/json' } });
      expect(r.status).toBe(502);
    }
    mockApi(JSON.stringify(all));
    const ok = await call('/draft', envOf(), { body: JSON.stringify(facts), headers: { 'content-type': 'application/json' } });
    expect(ok.status).toBe(200);
  });
  it('fits only what the schema allows', () => {
    const good = { yearsAt: { page: 1, line: 4 }, unitsAt: { page: 0, line: 0 }, placements: [{ head: 'sales', column: 'previous', at: [{ page: 2, line: 3, n: 1 }] }], totals: [] };
    expect(fits(good, SCHEMA)).toBe(true);
    expect(fits({ ...good, placements: [{ ...good.placements[0], column: 'next' }] }, SCHEMA)).toBe(false);
    expect(fits(null, DRAFT_SCHEMA)).toBe(false);
    expect(fits([], DRAFT_SCHEMA)).toBe(false);
  });
});

describe('batches are capped per address', () => {
  it('refuses a burst past the limiter, keyed by address, before reading or storing', async () => {
    const keys: string[] = []; let n = 0; const rows: unknown[] = [];
    const env = envOf({
      EVENTS_LIMIT: { limit: async ({ key }: { key: string }) => { keys.push(key); return { success: ++n <= 2 }; } },
      DB: { prepare: () => ({ bind: (...a: unknown[]) => a }), batch: async (s: unknown[]) => void rows.push(...s) },
    });
    const batch = JSON.stringify({ v: 1, page: '/dscr/', from: '/', w: 'phone', visit: '0a1b2c3d', ev: [{ e: 'open', t: 0 }] });
    const codes = [];
    for (let i = 0; i < 4; i++) codes.push((await call('/e', env, { body: batch, headers: { origin: SITE, 'content-type': 'text/plain' } })).status);
    expect(codes).toEqual([204, 204, 429, 429]);
    expect(rows.length).toBe(2);
    expect(keys).toEqual(Array(4).fill('1.2.3.4'));
  });
  it('says so without the limiter', async () => {
    const r = await call('/e', envOf({ EVENTS_LIMIT: undefined }), { body: '{}', headers: { origin: SITE } });
    expect(r.status).toBe(503);
  });
});
