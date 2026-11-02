/**
 * The estimate's working, loaded after the questions (UXR7, UXR1's S18): plan-model.ts with the engine and its library
 * (some 400 kB of script) is its own chunk, fetched as the page wakes, so the six questions can be answered at once and
 * the estimate is there by the time they are. Until it loads, an estimate with every answer in says it is working; if
 * the chunk cannot load, it says so and asks for a reload. Every figure is still the engine's.
 */
import { useEffect, useState } from 'preact/hooks';
import { planNeeds, type PlanState } from './plan-state';
import type { PlanPreview } from './plan-model';

export type Work = typeof import('./plan-model');
/** The counter's words while the working loads. */
export const WORKING = 'Working it out';
export const LOAD_FAILED = 'The rates did not load: check the connection, then reload the page. Your answers are kept.';

let work: Work | undefined, failed = false, loading: Promise<Work> | undefined;
const load = () => (loading ??= import('./plan-model').then((m) => (work = m), (e) => { failed = true; throw e; }));
// Fetched as the island's script runs, before it hydrates, so the download overlaps the first render.
if (typeof window !== 'undefined') load().catch(() => {});

/** The working: undefined while it loads, null when it could not. Every island that calls this shares one load. */
export function useWork(): Work | null | undefined {
  const [w, set] = useState<Work | null | undefined>(work ?? (failed ? null : undefined));
  useEffect(() => {
    if (w) return;
    let live = true;
    load().then((m) => live && set(m), () => live && set(null));
    return () => { live = false; };
  }, []);
  return w;
}

/** The estimate so far: what is still needed, then the engine's estimate once the working is in. */
export function previewOf(s: PlanState, w: Work | null | undefined): PlanPreview {
  if (w) return w.planPreview(s);
  const needs = planNeeds(s);
  if (needs.length) return { needs };
  return w === null ? { needs: [], blocked: LOAD_FAILED } : { needs: [], working: true };
}
