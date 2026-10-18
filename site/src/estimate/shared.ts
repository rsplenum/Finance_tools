/**
 * The planning estimate's answers, for the typed path's 'Start from the bill' (E4b): the two are separate islands on one
 * page, and an ES module is one instance per page, so the planning estimate leaves its latest state here as it renders,
 * with how many questions are still to answer and the first one's box, and the typed path hears each change (UX9, review
 * finding 7: the button knows before the click whether the bill can be made).
 */
import { useEffect, useState } from 'preact/hooks';
import type { PlanState } from './plan-model';

let latest: PlanState | null = null, first: string | undefined, left = 0;
const heard = new Set<() => void>();
export const sharePlan = (s: PlanState, ask: { first?: string; left: number }) => {
  if (latest === s && left === ask.left) return;
  latest = s; first = ask.first; left = ask.left;
  queueMicrotask(() => heard.forEach((f) => f()));
};
export const sharedPlan = () => latest;
export function useSharedPlan() {
  const [, tick] = useState(0);
  useEffect(() => { const f = () => tick((n) => n + 1); heard.add(f); f(); return () => { heard.delete(f); }; }, []);
  return { plan: latest, first, left };
}
