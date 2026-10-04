/**
 * The planning estimate's answers, for the typed path's 'Start from the bill' (E4b): the two are separate islands on one
 * page, and an ES module is one instance per page, so the planning estimate leaves its latest state here as it renders.
 */
import type { PlanState } from './plan-model';

let latest: PlanState | null = null;
export const sharePlan = (s: PlanState) => { latest = s; };
export const sharedPlan = () => latest;
