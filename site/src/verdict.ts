/** One verdict pattern for every tool (UXR3, UXR1's S5): "Meets all 6 benchmarks", "Misses 2 of 6 benchmarks", "Meets
 * 4 of 6 benchmarks; 2 not read yet". The DSCR's own levels are "targets" (the borrower types them); the CMA's and the
 * report's are "benchmarks" (a lender's usual levels). Words only: the counts come from the engine's checks. */
export type VerdictNoun = 'target' | 'benchmark';

export function verdictWords(noun: VerdictNoun, total: number, missed: number, waiting = 0): string {
  const many = (n: number) => `${noun}${n === 1 ? '' : 's'}`;
  if (missed) return total === 1 ? `Misses the ${noun}` : `Misses ${missed} of ${total} ${many(total)}`;
  if (waiting) return `Meets ${total - waiting} of ${total} ${many(total)}; ${waiting} not read yet`;
  return total === 1 ? `Meets the ${noun}` : total === 2 ? `Meets both ${many(2)}` : `Meets all ${total} ${many(total)}`;
}

/** The test's pattern: every verdict a tool shows starts this way. */
export const VERDICT_PATTERN = /^(Meets|Misses) (the|both|all \d+|\d+ of \d+) (target|benchmark)s?(; \d+ not read yet)?$/;
