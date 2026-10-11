/** POST /read (D-UX-48): off without the key, inputs checked, capped per address and per day, the AI's pointers passed on. */
import { describe, it, expect, vi, afterEach } from 'vitest';
import worker from '../src/index';
import { SCHEMA, SYSTEM } from '../src/read';

const answer = { yearsAt: { page: 1, line: 4 }, unitsAt: { page: 1, line: 3 }, placements: [{ head: 'sales', column: 'current', at: [{ page: 2, line: 3, n: 1 }] }], totals: [] };
const kv = () => { const m = new Map<string, string>(); return { m, get: async (k: string) => m.get(k) ?? null, put: async (k: string, v: string) => void m.set(k, v) }; };
const envOf = (over: Record<string, unknown> = {}) => ({
  DB: {}, KV: kv(), ANTHROPIC_API_KEY: 'test-key', READ_MODEL: 'claude-opus-5-5', READ_EFFORT: 'medium',
  READ_PER_IP: '2', READ_PER_DAY: '3', READ_ORIGINS: 'https://finance-tools-9if.pages.dev,.finance-tools-9if.pages.dev', ...over,
}) as unknown as Env;
const lines = [{ page: 1, line: 1, text: 'Revenue from operations 390.00 345.00' }];
const post = (env: Env, body: unknown = { lines }, path = '/api/read', headers: Record<string, string> = {}) =>
  worker.fetch(new Request(`https://api.test${path}`, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json', 'cf-connecting-ip': '1.2.3.4', ...headers } }) as Parameters<typeof worker.fetch>[0], env);

/** The Messages API, mocked: records each request body and answers with the pointers as the model's text. */
function mockApi(reply: Record<string, unknown> = { stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(answer) }] }) {
  const sent: { url: string; body: Record<string, unknown>; headers: Headers }[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    sent.push({ url: String(url), body: JSON.parse(String(init?.body)), headers: new Headers(init?.headers) });
    return new Response(JSON.stringify({ id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-opus-5-5', usage: { input_tokens: 1, output_tokens: 1 }, ...reply }), { status: 200, headers: { 'content-type': 'application/json' } });
  }));
  return sent;
}
afterEach(() => vi.unstubAllGlobals());

describe('read route', () => {
  it('is off, in words, until the key is set', async () => {
    const r = await post(envOf({ ANTHROPIC_API_KEY: undefined }));
    expect(r.status).toBe(503);
    expect(((await r.json()) as { error: string }).error).toMatch(/not switched on/);
  });
  it('passes the pointers on, asking for pointers only', async () => {
    const sent = mockApi();
    const r = await post(envOf());
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ answer });
    const { body, headers, url } = sent[0];
    expect(url).toMatch(/\/v1\/messages/);
    expect(body.model).toBe('claude-opus-5-5');
    expect(body.output_config).toEqual({ effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } });
    expect(body.fallbacks).toBe('default');
    expect(headers.get('anthropic-beta')).toContain('server-side-fallback-2026-07-01');
    expect((body.messages as { content: string }[])[0].content).toBe('p1 l1: Revenue from operations 390.00 345.00 | [1] 390.00 [2] 345.00');
    expect(SYSTEM).toMatch(/never write, add, subtract or work out an amount/);
  });
  it('sends no fallback or effort for a model without them', async () => {
    const sent = mockApi();
    await post(envOf({ READ_MODEL: 'claude-haiku-5-5', READ_EFFORT: '' }));
    expect(sent[0].body.fallbacks).toBeUndefined();
    expect(sent[0].body.output_config).toEqual({ format: { type: 'json_schema', schema: SCHEMA } });
  });
  it('refuses bad or oversized lines before calling the model', async () => {
    const sent = mockApi();
    expect((await post(envOf(), { lines: [] })).status).toBe(400);
    expect((await post(envOf(), { lines: [{ page: 0, line: 1, text: 'x' }] })).status).toBe(400);
    expect((await post(envOf(), { lines: [{ page: 1, line: 1, text: 'x'.repeat(300001) }] })).status).toBe(400);
    expect(sent.length).toBe(0);
  });
  it('caps reads per address and per day', async () => {
    mockApi();
    const env = envOf();
    expect((await post(env)).status).toBe(200);
    expect((await post(env)).status).toBe(200);
    expect((await post(env)).status).toBe(429); // the address's 2 are used
    expect((await post(env, { lines }, '/read', { 'cf-connecting-ip': '5.6.7.8' })).status).toBe(200);
    expect((await post(env, { lines }, '/read', { 'cf-connecting-ip': '9.9.9.9' })).status).toBe(429); // the day's 3 are used
  });
  it('says the statement could not be read when the model stops short', async () => {
    mockApi({ stop_reason: 'max_tokens', content: [{ type: 'text', text: '{' }] });
    expect((await post(envOf())).status).toBe(502);
  });
  it('allows only the site’s origins to call from another host', async () => {
    mockApi();
    const ok = await post(envOf(), { lines }, '/read', { origin: 'https://ccr-x.finance-tools-9if.pages.dev' });
    expect(ok.headers.get('access-control-allow-origin')).toBe('https://ccr-x.finance-tools-9if.pages.dev');
    const other = await post(envOf(), { lines }, '/read', { origin: 'https://someone.pages.dev' });
    expect(other.headers.get('access-control-allow-origin')).toBeNull();
    const pre = await worker.fetch(new Request('https://api.test/api/read', { method: 'OPTIONS', headers: { origin: 'https://finance-tools-9if.pages.dev' } }) as Parameters<typeof worker.fetch>[0], envOf());
    expect(pre.status).toBe(204);
    expect(pre.headers.get('access-control-allow-methods')).toBe('POST');
  });
});
