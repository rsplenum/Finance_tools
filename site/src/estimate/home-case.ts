/**
 * The planning estimate's flat (tests/plan-page.test.ts): a 2BHK of 1,000 sq ft in Pune, done up at Standard. Home's
 * intro types it and its button opens the page with it (HOME1b, D-UX-114).
 */
import { EMPTY_PLAN, type PlanState } from './plan-model';

export const ESTIMATE_HOME: PlanState = { ...EMPTY_PLAN, kind: 'renovate', home: 'flat', city: 'pune', area: '1,000', bhk: '2', level: 2 };
