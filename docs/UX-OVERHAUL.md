# The report builder's rebuild (UX2, 10-11-2026; D-UX-346 to D-UX-349)

Rahul, 10-11-2026: "The 'make it work' doesn't work on project report. The sections … a long long vertical scroll and so jam packed with information that it almost a mind bender … make a detailed intuitive UI/UX even if it means overhauling the whole damn thing … make a detailed plan that opus 5.5 can implement."

Three rows, one fresh session each, in this order: **FIX1**, **RESULT1**, **STEPS1**. A session reads §2, its own row's section and §8, and nothing else here. The picture of every screen: `docs/design-reviews/2026-11-10-ux2/mock.html` (a hand-made stand-in; its blanks are figures only the engine may fill). Rahul's page: https://claude.ai/artifact/5HSrsyaP6dD49kMukjJkz5.

## 1. What was measured
The builder at 390 × 844, expert mode, a case shaped like the one Rahul tried (a part first year, prices held flat, a loan of 73% of the cost; five of eight benchmarks miss and cash runs out):

| Step | Phone screens | Words | Boxes |
|---|---|---|---|
| The business | 2.9 | 198 | 10 |
| The cost | 2.9 | 202 | 9 |
| The loan | 5.5 | 529 | 30 |
| Sales and costs | 4.7 | 366 | 23 |
| Check | 9.3 (12.6 with the sliders open) | 1,187 | 11, and 15 buttons, 13 links, 14 fold-outs |
| Download | 1.6 | 139 | 0 |

Why Make it work does not work:
1. `engine/work.ts` tries one change at a time. When no single change passes, every way lands under "Ways that do not reach here" and the page says "Combine one with a way above" and stops.
2. The solver that combines changes exists (`engine/plan.ts` `makePlan`) but the page opens it as typed since D-UX-264: eight sliders, "No slider moved yet". The borrower is made the solver.
3. `makePlan` only lengthens the holiday and the repayment. Fixed-asset cover (assets left ÷ loan left) is mended by a smaller loan, a shorter holiday or a faster repayment; nothing tries the last two, yet five cards end "Leaves fixed-asset cover short".
4. Interest cover is judged in the part first year (a few months of sales at the first year's use against a full interest charge). No change mends that: `makePlan`, solved, with the promoters bringing up to Rs. 2 crore, still misses it; so did all 972 trials of a grid over the loan, the holiday, the repayment, the price, its growth and the cash.
5. The late years fail by an assumption no one sees: prices held flat while fixed costs grow 5% a year. On Rahul's screen the DSCR falls from 2.48 to 0.58 and "price growth 1.2% a year" alone mends it.
6. Nonsense reaches the screen: "it would need 105.4%, 123%, 140.5%" (use of the plant above 100%).

What the screens do wrong: the Check step holds eight jobs (the answer, why, the fixes, ways to repay, the sliders, check your figures, benchmarks, assumptions); the bad news is said five times (headline, count, bar, cards, ways); the button that unlocks the paper ("These are right: show the report") sits nine screens down, after the fixes; Download is a locked door ("Go to Check"); the DSCR by year is a grid of numbers; on a desktop the same long column sits in a 435 px card beside the paper.

## 2. The rules of the rebuild (every row)
1. **One job a screen.** A sub-screen is at most 1.5 phone screens at 390 × 844 with the worked example loaded. Longer means split, never fold.
2. **Say it once.** A miss is said in one place (the ring and its list). The sticky bar is one line.
3. **The engine solves, the borrower picks.** Never "combine these yourself". A fix is a whole plan that passes, shown as was → becomes, applied in one tap, undone in one tap.
4. **Every red line has a button**: it mends it, or goes to its box. No red without a way out.
5. **Plain words first, the banker's term second.** "Earns enough to repay, every year" then "lowest DSCR 0.58, the bank wants 1.25". The term's meaning opens on a tap.
6. **Show, then tell**: a chart or a bar before a sentence; a sentence before a table.
7. **A professional's depth lives in a drawer** ("For professionals"): benchmarks, the method, year-by-year figures. It never sits on the borrower's path.
8. **Nothing typed is lost; nothing new is asked.** The default field count (rule 17) does not grow; boxes move between sub-screens only.
9. **The paper is the reward.** It is one tap away on every screen and shows what the last answer changed.

## 3. FIX1: the engine finds plans that pass (L, Extra)
Rahul opens: the preview, their own case typed in, "Fix it for me", plans that pass, one applied. Done when Rahul says Make it work works.

### 3.1 The part first year (Rahul's answer of 10-11-2026: it stays judged; built, D-UX-350)
Rahul's rule: interest is paid in those months too, so the part year is judged, on its own months of sales and its own months of interest; nothing is printed "not judged". Term-loan interest before the first sale goes to the project's cost, which the margin shares; a first year of sales under 180 days takes half the year's depreciation. Cash running out is judged in every year. A new unit whose first months earn less than their costs misses interest cover whatever the loan: only a plan that raises use or price passes, else the nearest names it.

### 3.2 `engine/solve.ts` (new, pure, no DOM)
Built on what exists; nothing is worked twice: `withLevers` and the limits of `engine/plan.ts`, `withChange` of `engine/work.ts`, `projectReport`, `diagnose`.

```ts
export type MoveId = 'loan' | 'cash' | 'wc' | 'moratorium' | 'instalments' | 'use' | 'price' | 'priceGrowth';
export interface Move { id: MoveId; from: number; to: number }            // in the box's own unit
export interface Solution {
  id: 'borrowLess' | 'earnMore' | 'balanced';
  moves: Move[]; input: ReportInput;                                       // the report's inputs with the moves written in
  works: boolean; still: RatioId[]; runsOut?: string;                      // every level met and cash never short, or what is left
  report: Report; diagnosis: Diagnosis;
  promoters: { now: number; plan: number; more: number };
}
export interface Solved { base: { report: Report; diagnosis: Diagnosis }; plans: Solution[] }
export function solve(x: ReportInput, o?: { levels?: Levels; promotersMost?: number }): Solved | Needs | Blocked;
```

The moves and their limits (limits in `engine/data/solve.json`, each with source and date; ours are marked placeholders and listed in `docs/OWNER.md`):
- `loan`: smaller, the promoters bringing the difference, down to `leastLoan` (plan.ts); within `promotersMost` when given, else unbounded and the plan says "you bring Rs. … more".
- `cash`: the promoters' cash at the start, up; counts in the same total.
- `wc`: a smaller working-capital limit (plan.ts's lever).
- `moratorium`: shorter or longer, in steps of the instalment's months, from 0 to the typed months plus the term's room.
- `instalments`: fewer or more, the whole term within `LEVELS.term.longestMonths`.
- `use`: the use of the plant up, no year above `salesLimit` (85%).
- `price`: the price a unit up, at most `priceMostPct` (placeholder 10).
- `priceGrowth`: prices rising a year, from the typed figure to at most `priceGrowthMostPct` (placeholder 5).
Never a move: variable costs, fixed costs, the rate, the collateral (the security cover's own fix stays as it is).

The three plans differ by the moves they may use:
- **Borrow less**: `loan`, `cash`, `wc`, `moratorium`, `instalments`.
- **Earn more**: `use`, `price`, `priceGrowth`, `moratorium`, `instalments`; the loan as typed.
- **Balanced**: all of them.

The search, the same for each plan, deterministic:
1. Score a run: the sum over missed levels of the shortfall as a share of the level (the gap ÷ the level; for TOL ÷ net worth and debt-equity, the excess ÷ the level), plus the cash shortfall ÷ the project's cost. 0 means it works.
2. Each move has a grid of 20 steps across its range. From the typed figures, try one step of every allowed move; take the step that lowers the score most per step; repeat until the score is 0 or no step lowers it. A step that turns a level met into missed is taken only if the score still falls.
3. Trim: walk each move back toward the typed figure, one step at a time, largest move first, while the score stays 0. Then halve the last step of each move to the box's rounding (rupees to the thousand, months to the instalment's, per cent to 0.1).
4. Runs are memoised by the moves' values. Budget: at most 600 report runs a plan; three plans under 1.5 seconds on the test machine.
5. Plans with the same moves collapse to one. A case that already works returns no plans. A plan that ends above 0 is returned with `works: false`, `still` and `runsOut`; the page shows only the nearest of them (the lowest score).

Also in this row: `engine/work.ts` never prints a use above 100% (`useCannot.needed` capped; the words "use alone cannot reach it").

### 3.3 Tests (`tests/solve.test.ts`; the `money-maths-checks` skill)
1. Second computation: for every plan with `works`, `diagnose(projectReport(plan.input))` run afresh in the test meets every level and cash never runs out.
2. Least: one grid step back on any move of a working plan fails.
3. The fixture `tests/fixtures/solve-part-year.json` (fictional: "Sample Metals", shaped as §1): Earn more and Balanced work; Borrow less alone does not, and its nearest names interest cover in the part year.
4. Limits: no use above 85%, no term above 180 months, no loan below `leastLoan`, the promoters within `promotersMost`.
5. A case that works returns `plans: []`. A hopeless case returns only `works: false`.
6. The same input gives the same plans (run twice, deep equal). The run count stays within the budget.
7. `tests/work.test.ts`: no way's words carry a use above 100%.

### 3.4 The page, the least that makes it real (RESULT1 makes it beautiful)
- `site/src/report/model.ts`: `solvedOf(s)` (memoised on `checkKey`-like input) and `applySolution(s, sol): ReportState`, writing each move into its box as typed text (as `applyPlan` does), a round logged as today (`Rounds`).
- `site/src/report/FixIt.tsx` (new): the button "Fix it for me" under the verdict; on tap the plans as cards: a title, was → becomes a move, "You bring Rs. … more" when more than 0, "Passes all N checks", the button "Use this plan". Applied: the verdict updates, a strip "Before: 3 of 8. Now: 8 of 8" and "Undo" (the earlier round). None works: one card, "The nearest", with what stays short, each with its button to its box.
- Out of the Check step: "Ways that do not reach here", "Changes that do not reach alone", and the board's "No slider moved yet" opening. The ways that pass alone stay, under "Or change one thing". The sliders stay behind "Adjust it yourself" and open on the chosen plan.
- The solve runs after the tap, in `setTimeout` slices with "Working it out…", so typing never waits on it.
- Words in `site/src/report/words.ts`. `scripts/site-check.mjs`: the `rep-` ids that go are removed with their lines; new flow lines: a failing example → Fix it → a plan applied → the verdict meets → Undo restores.

## 4. RESULT1: Result, and Review and download (L, Extra)
Rahul opens: the preview on a phone and a desktop, beside today's. Done when Rahul says it is better.

Steps become: The business, The cost, The loan, Sales and costs, **Result**, **Review and download** (`STEPS` in `site/src/report/Report.tsx`; the saved `report-step` ids `check` and `download` stay as ids).

### 4.1 Result (the mock's screens 2 to 4)
In order, on one screen:
1. **The ring** (`site/src/Ring.tsx`, new, SVG, no library): one arc a check, green met, red missed, grey "cannot be read yet"; in its centre "3 of 8". `role="img"` with the count as its label.
2. **The headline**, three states: "Ready for the bank" / "Not ready for the bank yet" / "Nearly: N things to fill". One sentence of cause under it, from the engine's causes (`Held.cause`): own → "The loan is large for the money you bring in"; earns → "From 2035-36 the earnings fall below the instalments" (the first year under the level); cushion → "Cash runs short in 2027-28"; assets → "The loan is repaid slower than the machines lose value". At most two, joined by "and".
3. **Can it repay each year?** (`site/src/YearBars.tsx`, new, SVG): a bar a year of DSCR, the level as a line with its label, bars under it red and marked "short", the first and the lowest labelled. Under it a table of the same figures for a screen reader (`sr-only`) and "See the figures".
4. **The cash line**, only when cash runs out: "Cash runs short in 2027-28 by Rs. 3,78,577" and its button ("Bring it as your own money" → the box).
5. **The one filled button**: "Fix it for me" when not ready; "Review and download" when ready.
6. **"See all 8 checks"**: a sheet from the foot on a phone, a side panel on a desktop (`site/src/Sheet.tsx`, new; focus kept inside, Esc closes). A row a check: the dot, the plain name, the figure against the level, the year. A tap opens what it means in two lines and the banker's term. The plain names (in `words.ts`):

| Id | Plain name |
|---|---|
| dscrAverage | Earns enough to repay, on average |
| dscrLowest | Earns enough to repay, every year |
| interestCover | Profit covers the interest |
| tolTnw | All debts against your own money |
| debtEquity | Long-term loans against your own money |
| facr | Machines and building against the loan left |
| currentRatio | Stock and dues against bills to pay |
| securityCover | Security against the loans |

7. **Fix it** (FIX1's panel, now designed): three cards side by side on a desktop, a swipe row on a phone with dots; each card: the title, one line of what it means ("A smaller loan; you bring more"), the moves as was → becomes with the change in colour, the cost in one line (the interest over the loan, was → becomes), "Use this plan". Applied: the ring animates to its new count (200 ms, none under `prefers-reduced-motion`), the strip "Before … Now …", "Undo".
8. **Adjust it yourself**: the board's levers ordered by the causes found (the levers that mend a miss first, the rest under "More levers"), the ring and the bars live above them, pinned.

Gone from this step: "What holds it back" cards (the sheet says it), the three lists of ways (the plans), Ways to repay (to The loan, STEPS1; until then it sits under "Adjust it yourself"), benchmarks and their editing (to "For professionals" at the foot, closed), "Assumed until changed" (stays inside "How this is worked out"), Check your figures (to the next step).

### 4.2 Review and download (the mock's screen 5)
1. "Check your figures" (`site/src/CheckStep.tsx`): each group one line (its name and its main figure) that opens in place to the figures and "Change"; all closed at first.
2. One tick: "These figures are right". It unlocks the three downloads on the same screen; no trip to another step, no "Go to Check".
3. PDF, Word, Excel (`site/src/Downloads.tsx`), the paper's first page beside them; "Provisional" explained in one line when the report does not yet pass, with "Fix it" back to Result.
4. A change to any answer after the tick clears it, as today (`checkKey`).

### 4.3 Around the steps
- The sticky bar: one line: a small ring, "3 of 8", the step's Next. No second line.
- Desktop (≥ 1024 px): the questions' column 560 px, the paper beside it; on Result the paper gives way to the ring, the bars and the plans across the full width, the paper one tap away.
- The paper's peek (`site/src/Paper.tsx`): opens at the section the step fills; what the last answer changed is marked for 2 seconds.

## 5. STEPS1: steps 1 to 4 (L, Extra)
Rahul opens: the preview. Done when Rahul says it is better.
- **Sub-screens** inside a step, the dots showing them: The loan → "The loan" (amount, rate, term, holiday, way to repay), "Security", "Working capital"; Sales and costs → "What you sell", "What it costs"; The cost → "What you buy", "Before you start". No box is added or dropped (rule 17: the count is asserted as today).
- **The money bar** on The cost and The loan: one bar, your money against the loan, the 25% mark on it, live as figures are typed (the engine's `finance`).
- **Ways to repay** on "The loan": three cards (equal instalments, equal principal, stepped) each with its first instalment and whether it passes, from `engine/repayment.ts`.
- **A nudge at the box**: when a box's figure is what a missed check turns on (the loan against own money; prices held flat), one line under it with the plan's button (the engine's own figures and level: "With this loan, long-term loans are 5.87 times your own money; the bank's level is 4.00").
- **Prices flat, said once**: on "What you sell", "Prices stay the same every year; costs rise 5% a year" with "Change" beside it: the hidden cause in §1.5 becomes a visible choice.
- **Words on a tap**: a term (DSCR, margin, moratorium) underlined; a tap gives two lines (`site/src/words.ts`).
- **Empty and half-filled**: each sub-screen says what is left ("2 to fill") beside its dot; Next is never dead: it goes on, and Result lists what is missing with a button to each.

## 6. What makes it more than tabs
F1 Fix it for me (FIX1). F2 the ring (RESULT1). F3 the yearly bars (RESULT1). F4 was → becomes with Undo (FIX1). F5 every red line has a button (RESULT1). F6 the money bar (STEPS1). F7 the nudge at the box (STEPS1). F8 the paper marks what changed (RESULT1). F9 words on a tap (STEPS1). F10 review in place, no locked door (RESULT1). F11 "For professionals" drawer (RESULT1). F12 plain names for the eight checks (RESULT1).

## 7. Keeping the rows cheap
- Read this file's own section; grep, never read whole, `site/src/report/Report.tsx` (900+ lines), `model.ts` (1,086) and `scripts/site-check.mjs` (2,000+).
- Engine first, by tests (`npx vitest run tests/solve.test.ts`), no browser until they pass.
- One script walks the builder and prints text and counts (`scripts/stepped.mjs`); a screenshot only for Rahul's before and after, two a row.
- `npm run verify -- --quick` once at the end, in the background; no agent unless the row stalls.
- The look is not gated (D-TECH-110): spend nothing making a taste count pass.

## 8. Traps
- Six steps are mounted and five hidden (`scripts/stepped.mjs`; GOTCHAS, "The report's builder").
- `engine/work.ts` and `engine/repayment.ts` both export `Way` (GOTCHAS).
- Saved answers: `draft:report:v1` holds `{shape, s}`; a new field in `ReportState` changes the shape and drops old drafts: add none in these rows.
- A plan writes typed text into boxes: round as the box shows it and re-run, so the paper's figure is the plan's (plan.ts rounds sales up and costs down for this reason).
- `site-check.mjs` holds 170 `rep-` ids: remove a line with the thing it guards, in the same commit; a money or law line is never dropped, it moves to the new place.
- The fixture is fictional; never Rahul's case by name (rules 15 and 19).
