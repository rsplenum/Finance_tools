/**
 * Interaction data (UD1, D-TECH-37): which steps a visit uses, sent in batches to the Worker's `POST /e`, never what is
 * typed. Names come from the elements themselves (an input's id, a group's name, a button's test id), never from a
 * value or a label. Nothing is sent while the Worker is not live (no `PUBLIC_API_URL` or `PUBLIC_EVENTS=on` at build),
 * nor when the browser asks not to be tracked (Global Privacy Control or Do Not Track). No cookie, no storage: the
 * visit's tag lives in this tab's memory only. The shape and its checks: worker/src/event-shape.ts.
 */
import { MAX_EVENTS, nameOk, type Batch, type Ev, type Kind } from '../../worker/src/event-shape';

declare global { interface Window { __EVENTS__?: string } interface Navigator { globalPrivacyControl?: boolean } }

// A trailing slash, as a copied address often has, would make `//api/e`, which the Worker answers 404 (DEP1).
const API = (import.meta.env.PUBLIC_API_URL ?? '').replace(/\/+$/, '');
/** Where batches go, or nothing while the Worker is not live. The site check sets `window.__EVENTS__` to catch them. */
function target(): string | undefined {
  if (navigator.globalPrivacyControl || navigator.doNotTrack === '1') return undefined;
  if (window.__EVENTS__) return window.__EVENTS__;
  return API || import.meta.env.PUBLIC_EVENTS === 'on' ? `${API}/api/e` : undefined;
}

/** An element's name: a radio's group, else its id, else its test id; undefined when there is none fit to send. */
export function nameOf(el: Element | null): string | undefined {
  if (!el) return undefined;
  const raw = (el instanceof HTMLInputElement && el.type === 'radio' && el.name) || el.id || el.getAttribute('data-testid') || '';
  return nameOk(raw) ? raw : undefined;
}

let queue: Ev[] = [];
let url: string | undefined;
let batch: Omit<Batch, 'ev'>;
let opened = 0;
let last = 'open';
let left = false;
let timer: ReturnType<typeof setTimeout> | undefined;

/** Adds an event; a name that is not fit to send drops the event, never the check. */
export function track(e: Kind, f?: string) {
  if (!url || (f !== undefined && !nameOk(f))) return;
  const ev: Ev = { e, t: Math.max(0, Math.round(performance.now() - opened)) };
  if (f !== undefined) ev.f = f;
  queue.push(ev);
  if (e !== 'leave') { last = (f ? `${e}-${f}` : e).slice(0, 48); left = false; }
  if (queue.length >= MAX_EVENTS) flush();
  else if (!timer) timer = setTimeout(flush, 20_000);
}

function flush() {
  clearTimeout(timer);
  timer = undefined;
  if (!url || !queue.length) return;
  const body = JSON.stringify({ ...batch, ev: queue.splice(0, MAX_EVENTS) } satisfies Batch);
  // text/plain needs no preflight, so a beacon may go to the Worker's own address; the Worker reads it as JSON.
  const blob = new Blob([body], { type: 'text/plain' });
  if (!navigator.sendBeacon?.(url, blob)) fetch(url, { method: 'POST', body: blob, keepalive: true }).catch(() => {});
  if (queue.length) flush();
}

/** Where the visit came from: a page of this site, a search engine, or another site (never which one). */
function cameFrom(): string {
  try {
    const r = new URL(document.referrer);
    if (r.origin === location.origin) return r.pathname.slice(0, 61);
    return /(^|\.)(google|bing|duckduckgo|yahoo|ecosia|yandex)\./.test(r.hostname) ? 'search' : 'other';
  } catch { return ''; }
}

/** Starts recording on this page, once. */
export function start() {
  url = target();
  if (!url || batch) return;
  opened = performance.now();
  const visit = [...crypto.getRandomValues(new Uint8Array(4))].map((b) => b.toString(16).padStart(2, '0')).join('');
  const w = innerWidth < 640 ? 'phone' : innerWidth < 1024 ? 'tablet' : 'desktop';
  const from = cameFrom();
  batch = { v: 1, page: location.pathname.slice(0, 61), from: from === location.pathname ? '' : from, w, visit };
  track('open');
  const field = (ev: Event) => {
    const el = ev.target as Element;
    if (el.matches?.('input, select, textarea')) track('field', nameOf(el));
  };
  document.addEventListener('change', field, true);
  document.addEventListener('toggle', (ev) => {
    const d = ev.target as HTMLDetailsElement;
    if (d instanceof HTMLDetailsElement && d.open) track('more', nameOf(d));
  }, true);
  document.addEventListener('click', (ev) => {
    const b = (ev.target as Element).closest?.('button[data-testid]');
    if (b) track('tap', nameOf(b));
  }, true);
  // The result's state and an error shown, read from the page's own marks: `data-result` on each tool's status
  // (ready, provisional, blocked) and `aria-invalid` on a field. Each is sent when it first appears or changes.
  const seen = new Map<string, string>();
  const scan = () => {
    for (const el of document.querySelectorAll('[data-result]')) {
      const f = nameOf(el), state = el.getAttribute('data-result') ?? '';
      if (f && seen.get(f) !== state) { seen.set(f, state); track('result', `${f}-${state}`); }
    }
    const bad = new Set<string>();
    for (const el of document.querySelectorAll('[aria-invalid="true"]')) { const f = nameOf(el); if (f) bad.add(f); }
    for (const f of bad) if (!seen.has(`!${f}`)) { seen.set(`!${f}`, ''); track('error', f); }
    for (const k of seen.keys()) if (k.startsWith('!') && !bad.has(k.slice(1))) seen.delete(k);
  };
  let pending = false;
  new MutationObserver(() => { if (!pending) { pending = true; requestAnimationFrame(() => { pending = false; scan(); }); } })
    .observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-result', 'aria-invalid'] });
  scan();
  // Leaving (or hiding the tab): the last step, once until the next step, and the batch sent.
  const away = () => { if (!left) { left = true; track('leave', last); } flush(); };
  addEventListener('pagehide', away);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') away(); });
}
