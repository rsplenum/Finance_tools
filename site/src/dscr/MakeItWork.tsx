/**
 * Make it work on the DSCR page (LOOP1b, D-UX-227 to D-UX-229): the shared part (site/src/MakeItWork.tsx) with the DSCR
 * page's plans and moves (rounds.ts linkedOf). "See round N" writes the loan's three answers into the form, so the page's
 * answer becomes the next round. Figures: the engine's, worded in rounds.ts.
 */
import { useMemo } from 'preact/hooks';
import type { LinkTerms } from '../../../engine/dscr-linked';
import { MakeItWork as Part, Rounds as RoundList } from '../MakeItWork';
import { amountOf, type State } from './model';
import { linkedOf, roundKey, roundsOf, setupOf } from './rounds';

type Update = (f: (s: State) => State) => void;

/** Worked on a tap; any figure changed but the loan's three answers keeps it open on the new answer. */
export function MakeItWork({ s, update, see, round, onOpen }: { s: State; update: Update; see: (t: LinkTerms) => void; round: number; onOpen?: () => void }) {
  const link = useMemo(() => { const u = setupOf(s); return u && linkedOf(u); }, [s]);
  return <Part pre="dscr" on={roundKey(s)} link={link} missing="Answer the loan’s amount, repayment and rate first." most={amountOf(s.ownMost ?? '')}
    setMost={(ownMost) => update((x) => ({ ...x, ownMost }))} see={see} round={round} onOpen={onOpen} />;
}

/** The rounds tried (LOOP1b): kept while nothing but the loan's three answers changes (roundKey). */
export function Rounds({ s, list, back }: { s: State; list: LinkTerms[]; back: (t: LinkTerms) => void }) {
  const views = useMemo(() => roundsOf(s, list), [s, list]);
  return <RoundList pre="dscr" list={views} back={back} />;
}
