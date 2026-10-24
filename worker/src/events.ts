/**
 * POST /e (UD1, D-TECH-37): a batch of interaction events from the site's own pages, checked against its shape
 * (event-shape.ts) and stored in D1, one row per event. Nothing from the request but the batch is kept: no IP, no user
 * agent, no headers. A batch from an origin not on READ_ORIGINS is refused. The site sends nothing until it is built
 * with PUBLIC_API_URL (or PUBLIC_EVENTS=on), so this answers only once the Worker is live. An origin can be forged, so
 * batches are also capped per address by Cloudflare's rate limiter (SEC1, D-TECH-54): held in memory for a minute, never
 * stored; a burst past it is refused before the body is read.
 */
import { capped } from './body';
import { MAX_BYTES, check } from './event-shape';

const INSERT = 'INSERT INTO events (at, visit, page, came, width, kind, name, ms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
/** How long rows are kept: about 13 months, a year's funnels against the year before. */
export const KEEP_DAYS = 400;

export async function events(req: Request, env: Env, allowed: boolean): Promise<Response> {
  if (!allowed) return new Response(null, { status: 403 });
  if (!env.EVENTS_LIMIT) return new Response(null, { status: 503 });
  if (!(await env.EVENTS_LIMIT.limit({ key: req.headers.get('cf-connecting-ip') ?? 'unknown' })).success) return new Response(null, { status: 429 });
  const text = await capped(req, MAX_BYTES);
  if (text === undefined) return new Response(null, { status: 413 });
  let body: unknown;
  try { body = JSON.parse(text); } catch { return new Response(null, { status: 400 }); }
  const r = check(body);
  if (!r.ok) return new Response(r.why, { status: 400 });
  if (!env.DB) return new Response(null, { status: 503 });
  const { batch: b } = r;
  const at = new Date().toISOString().slice(0, 16);
  const stmt = env.DB.prepare(INSERT);
  await env.DB.batch(b.ev.map((e) => stmt.bind(at, b.visit, b.page, b.from, b.w, e.e, e.f ?? null, e.t)));
  return new Response(null, { status: 204 });
}

/** The nightly cron: rows past KEEP_DAYS are deleted. */
export async function prune(env: Env): Promise<void> {
  const before = new Date(Date.now() - KEEP_DAYS * 86_400_000).toISOString().slice(0, 16);
  await env.DB.prepare('DELETE FROM events WHERE at < ?').bind(before).run();
}
