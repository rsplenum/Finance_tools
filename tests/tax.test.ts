/** Each tax rate the page fills in is its own working: base × (1 + surcharge) × (1 + cess), worked here apart from the data. */
import { describe, it, expect } from 'vitest';
import { TAX_RATES } from '../engine/tax';

describe('tax rates', () => {
  it('match their working', () => {
    for (const t of TAX_RATES) expect(t.pct).toBeCloseTo(t.base * (1 + t.surcharge / 100) * (1 + t.cess / 100), 9);
  });
  it('22% + 10% surcharge + 4% cess is 25.168%; 30% + 4% cess is 31.2%; with 12% surcharge 34.944%', () => {
    expect(TAX_RATES.map((t) => t.pct)).toEqual([25.168, 31.2, 34.944]);
  });
});
