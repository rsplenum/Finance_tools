/**
 * Why the DSCR plan does not work yet: the target's two levels as bars when it misses (MV5, D-UX-57), then Make it work
 * (LOOP1b, MakeItWork.tsx): the ready plans with their cost and the linked sliders. Figures: engine/ only.
 */
import { useMemo } from 'preact/hooks';
import { Bar } from '../Board';
import type { LinkTerms } from '../../../engine/dscr-linked';
import type { LenderView, State } from './model';
import { dscrLevelsOf } from './levers';
import { MakeItWork } from './MakeItWork';

type Update = (f: (s: State) => State) => void;

export function Levels({ s, lender, update, see, round, onOpen }: { s: State; lender?: LenderView; update: Update; see: (t: LinkTerms) => void; round: number; onOpen?: () => void }) {
  const lv = useMemo(() => dscrLevelsOf(s, lender), [s, lender]);
  if (!lv?.misses) return null;
  return <div data-testid="dscr-levels" class="mt-4">
    <h3 class="text-title text-ink">Why it does not work yet</h3>
    <ul class="mt-1 divide-y divide-line">{lv.checks.map((c) => <Bar key={c.id} c={c} pre="dscr" />)}</ul>
    <MakeItWork s={s} update={update} see={see} round={round} onOpen={onOpen} />
  </div>;
}
