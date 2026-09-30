/**
 * API Worker (D-TECH-01). Only a health route for now; Razorpay orders, webhook checks and download tokens come later.
 * Customer figures never reach this Worker: the calculations run in the browser.
 */
const BINDINGS = ['DB', 'KV'] as const;

export default {
  async fetch(req, env): Promise<Response> {
    const { pathname } = new URL(req.url);
    if (pathname !== '/health') return json({ error: 'not found' }, 404);
    if (req.method !== 'GET' && req.method !== 'HEAD') return json({ error: 'method not allowed' }, 405, { allow: 'GET, HEAD' });
    // A missing binding is reported by name, never assumed present.
    const missing = BINDINGS.filter((b) => !env[b]);
    return json({ ok: missing.length === 0, missing }, missing.length ? 503 : 200);
  },
} satisfies ExportedHandler<Env>;

function json(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}
