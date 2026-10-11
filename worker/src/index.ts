/**
 * API Worker (D-TECH-01). A health route, and POST /read (U1, D-UX-48), which sends an audited statement's text lines
 * to an AI that only points to where each figure is printed; the figures are still worked in the browser by the engine,
 * and the lines are never logged or stored. Razorpay orders, webhook checks and download tokens come later. Every path
 * also answers under /api, so the site can call it at its own /api/* (docs/OWNER.md).
 */
import { read, type ReadEnv } from './read';

const BINDINGS = ['DB', 'KV'] as const;

export default {
  async fetch(req, env: ReadEnv): Promise<Response> {
    const pathname = new URL(req.url).pathname.replace(/^\/api(?=\/)/, '');
    const cors = corsOf(req, env);
    if (pathname === '/read') {
      if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...cors, 'access-control-allow-methods': 'POST', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400' } });
      if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405, { allow: 'POST', ...cors });
      return read(req, env, (body, status, headers = {}) => json(body, status, { ...cors, ...headers }));
    }
    if (pathname !== '/health') return json({ error: 'not found' }, 404);
    if (req.method !== 'GET' && req.method !== 'HEAD') return json({ error: 'method not allowed' }, 405, { allow: 'GET, HEAD' });
    // A missing binding is reported by name, never assumed present.
    const missing = BINDINGS.filter((b) => !env[b]);
    return json({ ok: missing.length === 0, missing }, missing.length ? 503 : 200);
  },
} satisfies ExportedHandler<ReadEnv>;

/** The site's own origins may call from another host (a preview, the Worker's own address); the list is READ_ORIGINS. */
function corsOf(req: Request, env: Env): Record<string, string> {
  const origin = req.headers.get('origin');
  const allowed = String(env.READ_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean);
  const host = (() => { try { return new URL(origin ?? '').hostname; } catch { return ''; } })();
  const ok = origin && allowed.some((a) => (a.startsWith('.') ? host.endsWith(a) : a === origin));
  return ok ? { 'access-control-allow-origin': origin, vary: 'origin' } : {};
}

function json(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}
