/** Health route: 200 when both bindings are present, 503 naming the missing one otherwise. */
import { describe, it, expect } from 'vitest';
import worker from '../src/index';

const bound = { DB: {}, KV: {} } as unknown as Env;
const call = (path: string, env = bound, method = 'GET') =>
  worker.fetch(new Request(`https://api.test${path}`, { method }) as Parameters<typeof worker.fetch>[0], env);

describe('health route', () => {
  it('is ok with both bindings', async () => {
    const r = await call('/health');
    expect(r.status).toBe(200);
    expect(r.headers.get('cache-control')).toBe('no-store');
    expect(await r.json()).toEqual({ ok: true, missing: [] });
  });
  it('names a missing binding and is not ok', async () => {
    const r = await call('/health', { DB: {} } as unknown as Env);
    expect(r.status).toBe(503);
    expect(await r.json()).toEqual({ ok: false, missing: ['KV'] });
  });
  it('rejects other methods and unknown paths', async () => {
    expect((await call('/health', bound, 'POST')).status).toBe(405);
    expect((await call('/')).status).toBe(404);
  });
});
