/** READ1 (D-TECH-114): with only a Gemini key, /read and /draft ask Google's Gemini, with the same words and schema. */
import { describe, it, expect, vi, afterEach } from 'vitest';
import worker from '../src/index';
import { GEMINI } from '../src/ai';
import { SCHEMA as READ_SCHEMA, SYSTEM as READ_SYSTEM } from '../src/read';
import { SCHEMA as DRAFT_SCHEMA, SECTIONS, NOTES } from '../../engine/narrative';

const answer = { yearsAt: { page: 1, line: 4 }, unitsAt: { page: 1, line: 3 }, placements: [{ head: 'sales', column: 'current', at: [{ page: 2, line: 3, n: 1 }] }], totals: [] };
const draft = Object.fromEntries(SECTIONS.map((s) => [s.id, 'Words.']));
const kv = () => { const m = new Map<string, string>(); return { get: async (k: string) => m.get(k) ?? null, put: async (k: string, v: string) => void m.set(k, v) }; };
const envOf = (over: Record<string, unknown> = {}) => ({
  DB: {}, KV: kv(), EVENTS_LIMIT: {}, GEMINI_API_KEY: 'g-key',
  READ_MODEL: 'claude-opus-5-5', READ_EFFORT: 'medium', READ_PER_IP: '9', READ_PER_DAY: '9',
  DRAFT_MODEL: 'claude-opus-5-5', DRAFT_EFFORT: 'low', DRAFT_PER_IP: '9', DRAFT_PER_DAY: '9',
  GEMINI_READ_MODEL: 'gemini-test-pro', GEMINI_READ_THINKING: 'high', GEMINI_DRAFT_MODEL: 'gemini-test-flash', GEMINI_DRAFT_THINKING: '',
  READ_ORIGINS: '', ...over,
}) as unknown as Env;
const lines = [{ page: 1, line: 1, text: 'Revenue from operations 390.00 345.00' }];
const facts = { name: 'A', activity: 'B', address: 'C', constitution: 'D', scheme: 'E', products: [], covers: [], finance: [], notes: Object.fromEntries(NOTES.map((n) => [n.id, ''])) };
const post = (env: Env, path: string, body: unknown) =>
  worker.fetch(new Request(`https://api.test${path}`, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json', 'cf-connecting-ip': '1.2.3.4' } }) as Parameters<typeof worker.fetch>[0], env);

type Sent = { url: string; body: Record<string, any>; headers: Headers };
/** Google's generateContent, stubbed: records each request and answers with `text` as the model's reply. */
function mockGemini(text: unknown, over: { finishReason?: string; status?: number; parts?: unknown[] } = {}) {
  const sent: Sent[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    sent.push({ url: String(url), body: JSON.parse(String(init?.body)), headers: new Headers(init?.headers) });
    if (over.status) return new Response('{"error":{}}', { status: over.status });
    const parts = over.parts ?? [{ text: JSON.stringify(text) }];
    return Response.json({ candidates: [{ finishReason: over.finishReason ?? 'STOP', content: { role: 'model', parts } }] });
  }));
  return sent;
}
afterEach(() => vi.unstubAllGlobals());

describe('Gemini, when only its key is set', () => {
  it('reads a statement: the same words, prompt and schema, the key in its header, pointers passed on', async () => {
    const sent = mockGemini(answer);
    const r = await post(envOf(), '/api/read', { lines });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ answer });
    const { url, body, headers } = sent[0];
    expect(url).toBe(`${GEMINI}/gemini-test-pro:generateContent`);
    expect(headers.get('x-goog-api-key')).toBe('g-key');
    expect(url).not.toContain('g-key');
    expect(body.systemInstruction).toEqual({ parts: [{ text: READ_SYSTEM }] });
    expect(body.contents).toEqual([{ role: 'user', parts: [{ text: 'p1 l1: Revenue from operations 390.00 345.00 | [1] 390.00 [2] 345.00' }] }]);
    expect(body.generationConfig).toEqual({ responseMimeType: 'application/json', responseJsonSchema: READ_SCHEMA, maxOutputTokens: 32000, thinkingConfig: { thinkingLevel: 'HIGH' } });
  });
  it('drafts the words, with no thinking level when none is set', async () => {
    const sent = mockGemini(draft);
    const r = await post(envOf(), '/draft', facts);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ draft });
    expect(sent[0].url).toBe(`${GEMINI}/gemini-test-flash:generateContent`);
    expect(sent[0].body.generationConfig).toEqual({ responseMimeType: 'application/json', responseJsonSchema: DRAFT_SCHEMA, maxOutputTokens: 16000 });
  });
  it('takes the key under the spelling first saved, Gemini_API_key', async () => {
    const sent = mockGemini(answer);
    expect((await post(envOf({ GEMINI_API_KEY: undefined, Gemini_API_key: 'g-key-2' }), '/read', { lines })).status).toBe(200);
    expect(sent[0].headers.get('x-goog-api-key')).toBe('g-key-2');
  });
  it('reads only the answer, never a thought', async () => {
    mockGemini(null, { parts: [{ text: 'thinking…', thought: true }, { text: JSON.stringify(answer) }] });
    expect(await (await post(envOf(), '/read', { lines })).json()).toEqual({ answer });
  });
  it('says it could not read when Gemini stops short, refuses, answers outside the schema or fails', async () => {
    mockGemini(answer, { finishReason: 'MAX_TOKENS' });
    expect((await post(envOf(), '/read', { lines })).status).toBe(502);
    mockGemini(null, { finishReason: 'SAFETY', parts: [] });
    expect((await post(envOf(), '/read', { lines })).status).toBe(502);
    mockGemini({ ...answer, amount: 390 });
    expect((await post(envOf(), '/read', { lines })).status).toBe(502);
    mockGemini(answer, { status: 429 });
    const r = await post(envOf(), '/read', { lines });
    expect(r.status).toBe(502);
    expect(((await r.json()) as { error: string }).error).toMatch(/just now/);
  });
  it('logs only the kind of failure, never what was sent or the key', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockGemini(answer, { status: 500 });
    await post(envOf(), '/read', { lines });
    expect(log).toHaveBeenCalledWith('read failed', 'gemini', 500);
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/Revenue|g-key/);
    log.mockRestore();
  });
});

describe('which AI', () => {
  it('is Claude when both keys are set', async () => {
    const sent = mockGemini(answer);
    await post(envOf({ ANTHROPIC_API_KEY: 'a-key' }), '/read', { lines });
    expect(sent[0].url).toMatch(/api\.anthropic\.com\/v1\/messages/);
  });
  it('is named on /health, never the key; null with none', async () => {
    const health = async (over: Record<string, unknown>) => (await worker.fetch(new Request('https://api.test/health') as Parameters<typeof worker.fetch>[0], envOf(over))).json();
    expect(await health({})).toEqual({ ok: true, missing: [], ai: 'gemini' });
    expect(await health({ GEMINI_API_KEY: undefined })).toEqual({ ok: true, missing: [], ai: null });
    expect(await health({ ANTHROPIC_API_KEY: 'a-key' })).toEqual({ ok: true, missing: [], ai: 'anthropic' });
  });
});
