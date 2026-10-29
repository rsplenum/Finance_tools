# OR11 — the owner's review of the project report (29-10-2026)

The owner used the project report on a phone with the fictional worked example (`?case=home`: Asha Packaging; cost of the project Rs. 33,75,342; term loan Rs. 25,00,000 over 60 monthly instalments; sales typed, Rs. 70,00,000; expert mode) and sent four screenshots. The page reads "Does not work yet: 4 ratios short", cash below nil in 2027-28 (Rs. 1,75,955 short), and "1 question left: check your figures". More points will follow: they go below as O5 onward, and into OR11b's mock-up when they touch the answer.

## The owner's points
| # | Point (the owner's words, shortened) |
|---|---|
| O1 | After filling the form it says "1 question left: check your figures". Is confirming the figures the question left? It is not clear. |
| O2 | "See the answer" takes you just below: on a phone the answer sits right below it anyway, so the button's purpose is not clear. |
| O3 | The explanation under "Why it does not work yet" reads as long prose: good, but not understood at a glance. It needs a better visual. |
| O4 | "Make it viable" changes the loan from 25 lakh to 9 lakh. Will a borrower call that "made viable" and accept it? Most of the loan is gone. Make it viable should address the limiting factors in a way that meets the borrower's needs. It should show that unless the fundamental factor is fixed (sales, operating capacity and so on), the present loan is unviable, and which fixes make it viable. A lower loan and a lower working-capital limit are two options if the borrower chooses them. If they want neither, they must address the business's fundamental limits: production capacity, growth and capital. Two "Use this" buttons and one "Make it viable" button confuse. The owner expected many "Use this" buttons under one "Make it viable" umbrella, since there may be several ways. |

## What the page does, and why
Checked on a local build of `main` at 8fc610c, 390 × 844, and with the model on the same case (`viableOf`, `planOf`, `fixView`).

- **O1: the "1 question" is not the check.** `statusText` (`site/src/report/model.ts:605`) adds one for `p.short`, which is cash going below nil. That is a result, not a question. `goOf` (`site/src/report/Report.tsx:83`) links the check instead, because the check is the only step left. So the count and its link name different things, and after the check "1 question left" stays with no link. The same count shows in the answer bar (`barText`) and in "The project report below has its figures. 1 question left." (`arrived`).
- **O2: two controls do one job, and neither says it.** In expert mode the questions run about 7,200 px on a phone. "See the answer" sits at their foot, and the answer starts right under it. The tap folds the questions behind "Edit answers" (D-UX-231) and lands at the top. The focus goes to a heading only a screen reader sees, and the visible title lands under the sticky tabs (screenshot 3). The answer bar already has its own ↓ arrow to the answer, which does not fold. On a phone, folding is what the button does, and "see" is what it says.
- **O3: one miss is said three times, and the causes are not grouped.** There are four red sentences (`fixView`, `model.ts:686`), each "<ratio> falls to X in <year>, against its benchmark of Y: <cause>". Three of them have one cause: the business earns too little for this loan (average DSCR 1.26 against 1.50, lowest year 0.82 against 1.25, interest cover 0.74 against 1.50). The current ratio (0.94 against 1.10) has another. The misses also show in the key figures (the two DSCR cards with "Short by Rs.") and as bars under the sentences (D-UX-237: avoid repetition).
- **O4: three sets of buttons answer one miss, and the first answer is "borrow less".**
  - "Either change makes it work" (OR2, D-UX-177, `engine/fix.ts`) is worked on two levers only: the repayment, never longer, and the loan, never larger. Its two fixes are "Repay in 3 years instead of 5 years and borrow Rs. 10,03,000" (the filled "Use this") and "Keep 5 years and borrow Rs. 9,35,000". Both cut the loan by more than 60%, and the first also shortens the repayment, which a borrower reads as harder, not easier.
  - "Make it viable" (MV3, `engine/plan.ts`) opens here on higher sales, Rs. 82,11,000 in the first year (+17.3%), with the loan kept. Its cards beside that offer a smaller term loan of at most Rs. 9,35,779. Whenever sales cannot reach, the plan falls back to the fix above (the head of `plan.ts`, D-UX-182). With sales typed, no capacity is known, so +17.3% is shown with no check that the plant can make it.
  - "Ways to repay" (OR5) has a "Use this" for each way, and on this case none of them fixes the miss.
- **Seen in the screenshots:** "More options" wraps onto two lines with a wide gap before its colon at 390 px (screenshot 2).

## The direction (recommended; the owner decides each point in "Choices")
- **O3 and O4: one umbrella below the verdict on a miss.** It replaces the fix lines, the separate "Make it viable" button and the board's separate plan:
  1. *What limits it*, as a picture: the misses grouped under their cause in a few words ("Earns too little for this loan", "Thin short-term cushion"). Each miss is a row: the ratio, its worst year, a bar from its value to its target, and the gap in rupees where the engine gives one. Cash below nil is its own row (O1). Nothing is repeated from the key figures.
  2. *Keep the loan you asked for (Rs. 25,00,000)*: the ways that fix the cause, each a card with what changes, by how much, whether it is within reach, and its own "Use this". The candidates are higher sales (by the use of the capacity up to 85%, or by the price), faster growth, lower costs, more of the promoters' money kept in the business, and more capacity at its cost. Where no way reaches, the card says so plainly: "At Rs. 25,00,000 this plant cannot carry the loan: it would need …".
  3. *Or change the loan*: a smaller term loan, a smaller working-capital limit, or the lender's longer repayment or holiday, each a card with the own money it takes and its "Use this".
  4. The ways to repay (OR5) and the sliders stay under it. They become the shared Make it work part (D-UX-230) once the report has a linked solver (D-UX-232).
- **O1:** the status counts only questions with a box. The check reads as its own step ("All answered · check your figures before the download"). Cash below nil leaves the count and joins the verdict and the umbrella's first block.
- **O2:** on a phone, the answer bar becomes the one way to the answer. Its arrow, named "See the answer", folds the questions and lands on the verdict from anywhere in the form. The button under the last question is shown only from 1024 px, where it folds to the rail. The landing keeps the title clear of the sticky tabs.

## Choices for the owner
1. **The order of the ways.** Keep-the-loan ways first and change-the-loan ways after (recommended, the owner's words), or ranked by least strain (D-UX-177's rule, which picked the loan cut here). Either way the loan cut stays one tap away.
2. **One name.** "Make it work" on all four tools (recommended: one vocabulary, UXR3, and it pairs with "Does not work yet"), or "Make it viable" kept on the report.
3. **Capacity when sales are typed.** With sales typed, +17.3% has no ceiling. Ask the plant's capacity inside the umbrella, only when a sales way shows (recommended: the default path's count stays, D-UX-12), or keep "a lender will test sales against the market".
4. **More capacity costs money.** Show it as a way that needs one answer, the cost of the larger plant, and keep the result provisional until that answer is given (recommended: never assume a missing fact, CLAUDE.md). The alternative is to scale the machinery's cost by the capacity added, which is an assumption a lender may reject.
5. **"See the answer" on a phone.** The answer bar's arrow does the job and the button goes (recommended: one control, which reaches the answer from anywhere), or the button stays, renamed to say it folds ("Done: hide the questions").

## Rows
OR11a (O1, O2 and the More options wrap) and OR11b (O3 and O4, a mock-up for the owner's yes before code; it replaces LOOP1e) are in `docs/HANDOFF.md`. OR11b's session writes OR11c, the build.
