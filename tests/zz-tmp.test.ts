import { it } from 'vitest';
import { projectReport, type Report } from '../engine/report';
it('x', () => {
  for (const f of [1300000, 1400000, 1500000]) {
  const s = projectReport({ taxBy: 'firm', cost: { building: 1000000, machinery: 2000000, preliminary: 100000 },
  loan: { amount: 2600000, ratePct: 10, disbursed: '2026-10', moratoriumMonths: 9, instalments: 48, frequency: 'monthly', style: 'equal-principal' },
  capacity: 40000, price: 150, utilisationPct: [60, 70, 80], priceGrowthPct: 0, monthsToStart: 7, variablePct: 55, fixedCosts: f, fixedGrowthPct: 5,
  days: { stock: 30, debtors: 30, creditors: 30 }, wcLimit: 0, scheme: { id: 'pmegp', category: 'special', area: 'urban', activity: 'service', confirmed: true } } as any) as Report;
  console.log(f, s.years.map((y) => `${y.fy} cash ${y.cash.toFixed(2)} pat ${y.pat.toFixed(2)} dep ${y.depreciation.toFixed(2)} tl ${y.termLoan.toFixed(2)}`).join('\n'));
  }
});
