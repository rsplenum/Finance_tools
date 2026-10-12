/**
 * The shape of interaction data (UD1, D-TECH-37), shared by the site, which sends it, and the Worker, which checks it
 * before storing. A batch says which steps a visit used and when, never what was typed: no figure, name, GSTIN or
 * address, no IP, no cookie, and no id kept past the tab (the visit is a random tag made when the page opens and kept
 * only in memory). Pure: no DOM, no Worker types.
 */

/** The events: the page opened, a field changed (by its name), a closed part opened ("More options" among them), a
 * button tapped (by its name: "Make it viable", "Use this plan", Undo), the result shown (ready, provisional or blocked),
 * a download (its format, or print), an error shown (the field marked wrong, by name), and leaving (the last step). */
export const KINDS = ['open', 'field', 'more', 'tap', 'result', 'download', 'error', 'leave'] as const;
export type Kind = (typeof KINDS)[number];

/** Screen width, in three bands only: an exact width helps tell one visitor from another. */
export const WIDTHS = ['phone', 'tablet', 'desktop'] as const;

/** One event: its kind, the name of what it touched, and the milliseconds since the page opened. */
export interface Ev { e: Kind; f?: string; t: number }
export interface Batch { v: 1; page: string; from: string; w: (typeof WIDTHS)[number]; visit: string; ev: Ev[] }

/** A name is an element's own id, letters, digits, - and _ only, and never a run of five or more digits: a typed
 * amount has no place in one, so a name that looks like one is dropped (the site check types known figures too). */
export const nameOk = (f: string) => /^[A-Za-z0-9_-]{1,48}$/.test(f) && !/\d{5}/.test(f);
export const PAGE = /^\/[a-z0-9/-]{0,60}$/;
export const MAX_EVENTS = 50;
export const MAX_BYTES = 16_384;
const DAY = 86_400_000;

/** The batch if every part of it has the shape above, else why not. Anything more than the shape is refused, not
 * dropped quietly, so a change on the site that sends more is seen. */
export function check(x: unknown): { ok: true; batch: Batch } | { ok: false; why: string } {
  const b = x as Partial<Batch> | null;
  if (!b || typeof b !== 'object' || Array.isArray(b)) return { ok: false, why: 'not an object' };
  const keys = Object.keys(b).sort().join();
  if (keys !== 'ev,from,page,v,visit,w') return { ok: false, why: `keys ${keys}` };
  if (b.v !== 1) return { ok: false, why: 'version' };
  if (typeof b.page !== 'string' || !PAGE.test(b.page)) return { ok: false, why: 'page' };
  if (typeof b.from !== 'string' || !(b.from === '' || b.from === 'search' || b.from === 'other' || PAGE.test(b.from))) return { ok: false, why: 'from' };
  if (!WIDTHS.includes(b.w as never)) return { ok: false, why: 'width' };
  if (typeof b.visit !== 'string' || !/^[0-9a-f]{8}$/.test(b.visit)) return { ok: false, why: 'visit' };
  if (!Array.isArray(b.ev) || !b.ev.length || b.ev.length > MAX_EVENTS) return { ok: false, why: 'events' };
  for (const ev of b.ev as Partial<Ev>[]) {
    if (!ev || typeof ev !== 'object') return { ok: false, why: 'event' };
    const k = Object.keys(ev).sort().join();
    if (k !== 'e,t' && k !== 'e,f,t') return { ok: false, why: `event keys ${k}` };
    if (!KINDS.includes(ev.e as Kind)) return { ok: false, why: 'kind' };
    if (ev.f !== undefined && (typeof ev.f !== 'string' || !nameOk(ev.f))) return { ok: false, why: 'name' };
    if (!Number.isInteger(ev.t) || (ev.t as number) < 0 || (ev.t as number) > DAY) return { ok: false, why: 'time' };
  }
  return { ok: true, batch: b as Batch };
}
