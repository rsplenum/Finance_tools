/**
 * Independent second computation of every estimate figure (CLAUDE.md), written apart from estimate.ts on purpose: the
 * heads' totals grouped afresh from the raw items, the total as a product (works × (1 + GST) × (1 + contingency))
 * instead of a sum of parts, and the cost per sq ft from that product. estimate.ts shows no figure unless both agree.
 */
import type { Item } from './estimate';

export interface EstimateCheck { heads: Map<string, number>; works: number; total: number; perSqft?: number }

export function estimateCheck(items: Item[], gstPct: number, contingencyPct: number, area?: number): EstimateCheck {
  const heads = new Map<string, number>();
  for (const it of items) heads.set(it.head, (heads.get(it.head) ?? 0) + (it.quantity as number) * (it.rate as number));
  let works = 0;
  for (const v of heads.values()) works += v;
  const total = works * (1 + gstPct / 100) * (1 + contingencyPct / 100);
  return { heads, works, total, ...(area ? { perSqft: total / area } : {}) };
}
