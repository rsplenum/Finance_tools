/** POST /draft (REP2, SEC1): the body capped as it is read, whatever its header says, and a reply that strays from the
 * schema refused on the server. */
import { describe, it, expect, vi, afterEach } from 'vitest';
import worker from '../src/index';
import { MAX_BYTES } from '../src/draft';
import REPLY from '../../tests/fixtures/draft-r.json';

const input = {
  name: 'Asha Packaging', activity: 'Manufacture of corrugated boxes', address: 'Plot 4, Example MIDC, Pune',
  constitution: 'Partnership firm or LLP', scheme: '', products: [], covers: ['Plant and machinery'], finance: ['A term loan from a bank'], notes: REPLY.notes,
};
const kv = () => { const m = new Map<string, string>(); return { get: async (k: string) => m.get(k) ?? null, put: async (k: string, v: string) => void m.set(k, v) }; };
const envOf = () => ({ DB: {}, KV: kv(), ANTHROPIC_API_KEY: 'test-key', DRAFT_MODEL: 'claude-opus-5-5', DRAFT_EFFORT: 'low', DRAFT_PER_IP: '3', DRAFT_PER_DAY: '50', READ_ORIGINS: '' }) as unknown as Env;
const post = (env: Env, body: BodyInit = JSON.stringify(input), headers: Record<string, string> = {}) =>
  worker.fetch(new Request('https://api.test/api/draft', { method: 'POST', body, headers: { 'content-type': 'application/json', 'cf-connecting-ip': '1.2.3.4', ...headers }, duplex: 'half' } as RequestInit) as Parameters<typeof worker.fetch>[0], env);
function mockApi(text: string) {
  const calls = vi.fn(async () => new Response(JSON.stringify({ id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-opus-5-5', usage: { input_tokens: 1, output_tokens: 1 }, stop_reason: 'end_turn', content: [{ type: 'text', text }] }), { status: 200, headers: { 'content-type': 'application/json' } }));
  vi.stubGlobal('fetch', calls);
  return calls;
}
/** A body sent in pieces with no Content-Length, as a client that leaves the header out would. */
const stream = (s: string) => new ReadableStream({ start(c) { const b = new TextEncoder().encode(s); for (let i = 0; i < b.length; i += 65536) c.enqueue(b.slice(i, i + 65536)); c.close(); } });
afterEach(() => vi.unstubAllGlobals());

describe('draft route', () => {
  it('passes on words that fit the schema', async () => {
    mockApi(JSON.stringify(REPLY.draft));
    const r = await post(envOf());
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ draft: REPLY.draft });
  });
  it('refuses a body over the cap with no header, or with a header that lies, before calling the model', async () => {
    const calls = mockApi(JSON.stringify(REPLY.draft));
    const big = JSON.stringify({ ...input, name: 'x'.repeat(MAX_BYTES) });
    expect((await post(envOf(), stream(big))).status).toBe(413);
    expect((await post(envOf(), big, { 'content-length': '10' })).status).toBe(413);
    expect((await post(envOf(), stream(JSON.stringify(input)))).status).toBe(200); // a small body with no header still reads
    expect(calls).toHaveBeenCalledTimes(1);
  });
  it('refuses a reply that strays from the schema: a key missing, one added, a number for words, not JSON', async () => {
    const { conclusion: _, ...short } = REPLY.draft;
    for (const bad of [short, { ...REPLY.draft, extra: 'x' }, { ...REPLY.draft, market: 5 }, ['x']]) {
      mockApi(JSON.stringify(bad));
      expect((await post(envOf())).status).toBe(502);
    }
    mockApi('{"introduction":');
    expect((await post(envOf())).status).toBe(502);
  });
});
