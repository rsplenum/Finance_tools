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

/** What is still to answer, in the same words in every tool (UXR3, UXR1's P4): "1 question left", "3 questions left";
 * the word "provisional" stays only as the documents' mark. */
export const questionsLeft = (n: number) => `${n} question${n === 1 ? '' : 's'} left`;

/** The verdict's head in plain words (OR3, the owner's O8 and O15): "Works", "Does not work yet: 1 ratio short", or, while
 * a ratio cannot be read, "Works so far: 1 ratio not read yet". It stands apart from the status, which says only whether
 * every question is answered; the detail under it keeps the pattern above. Cash below nil (the report's, OR11's O1) is a
 * result, not a question, so it joins the verdict: "Does not work yet: 4 ratios short and cash below nil". */
export function workWords(missed: number, waiting = 0, cashBelowNil = false): string {
  const ratios = (n: number) => `${n} ratio${n === 1 ? '' : 's'}`;
  if (missed || cashBelowNil) return `Does not work yet: ${[missed && `${ratios(missed)} short`, cashBelowNil && 'cash below nil'].filter(Boolean).join(' and ')}`;
  return waiting ? `Works so far: ${ratios(waiting)} not read yet` : 'Works';
}

/** The status once every question is answered (OR3, the owner's O7 and O8): never "Complete" beside a miss. */
export const ALL_ANSWERED = 'All answered';
