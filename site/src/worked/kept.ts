/**
 * The worked page's answers kept on this device as they are typed (docs/WORKED-PAGE.md §4): under one key per tool,
 * with a version, and a step that brings an older draft forward, so a new field never drops what was typed. What is
 * kept is laid over the blank case, so a field added later takes its blank value and the rest stay. A visit with the
 * home page's fictional case (`?case=home`) is not kept and does not touch what is. One shape for NEW1 to NEW4.
 */
import { useEffect, useLayoutEffect, useRef } from 'preact/hooks';

/** A kept draft: its version and the tool's whole case. */
interface Kept<C> { v: number; c: C }

/** `kept` laid over `blank`: blank's keys, each taking kept's value where both are objects alike, or kept's where the types agree. */
export function over<T>(blank: T, kept: unknown): T {
  if (Array.isArray(blank)) return (Array.isArray(kept) ? kept : blank) as T;
  if (blank && typeof blank === 'object') {
    if (!kept || typeof kept !== 'object' || Array.isArray(kept)) return blank;
    const k = kept as Record<string, unknown>, out: Record<string, unknown> = { ...k };
    for (const [key, b] of Object.entries(blank as Record<string, unknown>)) out[key] = key in k ? over(b, k[key]) : b;
    return out as T;
  }
  // A missing value in the blank (an optional field) takes whatever was kept.
  if (blank === undefined || blank === null) return (kept ?? blank) as T;
  return (typeof kept === typeof blank ? kept : blank) as T;
}

export const homeAsked = () => { try { return new URLSearchParams(location.search).get('case') === 'home'; } catch { return false; } };

export interface KeptSpec<C> {
  /** The tool's key: the draft is kept as `worked:<tool>`. */
  tool: string;
  /** Raise when the case changes meaning; `forward` then brings the older one up. */
  version: number;
  /** The case a page opens on, which a kept draft is laid over. */
  blank: () => C;
  /** Brings a draft of an older version, or the old page's draft (`draft:<tool>:v1`, by its own shape), forward; undefined drops it. */
  forward?: (old: { v: number; c: unknown } | { legacy: unknown }) => C | undefined;
  /** Whether a case is the blank one: then nothing is kept (Clear removes the draft). */
  isBlank?: (c: C) => boolean;
}

/** Puts back what was kept once the page wakes (the page served stays the example), then keeps every change. */
export function useWorkedKept<C>(spec: KeptSpec<C>, c: C, set: (c: C) => void) {
  const key = `worked:${spec.tool}`, ready = useRef(false), off = useRef(false);
  useEffect(() => {
    off.current = homeAsked();
    if (!off.current) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const d = JSON.parse(raw) as Kept<unknown>;
          const got = d.v === spec.version ? over(spec.blank(), d.c) : spec.forward?.({ v: d.v, c: d.c });
          if (got) set(got); else localStorage.removeItem(key);
        } else {
          // The old page's draft, kept for the tab (fields.tsx useKept): brought forward once, then left alone.
          const legacy = sessionStorage.getItem(`draft:${spec.tool}:v1`);
          const got = legacy ? spec.forward?.({ legacy: JSON.parse(legacy) }) : undefined;
          if (got) set(got);
        }
      } catch { /* no storage, or a broken draft: the example */ }
    }
    ready.current = true;
  }, []);
  // Written as soon as the change is drawn, so a reload straight after the last tap still finds it.
  useLayoutEffect(() => {
    if (!ready.current || off.current) return;
    try {
      if (spec.isBlank?.(c)) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify({ v: spec.version, c } satisfies Kept<C>));
    } catch { /* storage full or blocked: the answers stay for this view only */ }
  }, [c]);
}
