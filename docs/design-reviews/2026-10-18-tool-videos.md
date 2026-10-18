# Design review: the four tools from the owner's videos (UX7's look, 18-10-2026)

From four screen recordings by the owner on the UX7 branch preview (PR #81), at 768×480: DSCR (19 s), estimate (68 s), CMA (23 s), project report (19 s). DSCR, CMA and the report stay on the empty page, so their results are not judged here; contrast was not measurable from the video. Times are the video's. Handed to UX8 (D-UX-105) unless marked.

Judged against six first principles for a tool that turns a borrower's figures into an answer they trust and hand on:
1. The answer is the product: where the eye rests, from the moment it exists.
2. Cause and effect seen together: change a figure, see the answer move, without scrolling.
3. Every figure carries its unit and status (audited, estimate, projection; final or provisional); one kind of number is written one way everywhere.
4. Precision matches certainty.
5. Statements are tables that add up: years across, items down, subtotals in the grid, sources equal to uses.
6. Space and weight go to the data, not to decoration, empty sections or headings.

| # | Tool | Rank | Finding | Evidence | Status |
|---|---|---|---|---|---|
| 1 | All four | Blocker | The answer is far from the questions while half the desktop is empty: one column about half the width | DSCR's results three screens below the first box; the estimate scrolled up and down six times between "Which level?" and "Still to answer" (0:16–0:48); the report asks 15 figures in four sections before any answer | UX8: questions left, a fixed answer panel right from 1024 px; phones keep the column and the bottom bar |
| 2 | DSCR, report, CMA | Blocker | Before the figures, the result is a to-do list, never a preview | DSCR says "Provisional: 5 still needed" three times (bar, card, list; 0:08); the report's result is a list of 15 (0:10); the CMA's a list of 3 | UX8: the statement's outline with "—" for each missing figure, each a link to its box, one counter; blanks stay blank (never 0) |
| 3 | CMA | Significant | The five-year table scrolls sideways in the narrow column; labels wrap to two or three lines; no subtotals or balance check while typing | Only four years fit, 2027-28 behind a scrollbar (0:04–0:12) | UX9: full width; gross and net profit and assets against liabilities from the engine; "balances / differs by Rs. X" once a year's column is complete; audited solid, estimate dashed, projection lighter |
| 4 | Estimate | Significant | One screen writes figures four ways | "Rs. 21,38,356" (headline), "21.38 L" (levels), "4,74,877" with no unit (by section), "Rs. 2,489 a sq ft" | UX8: full rupees in tables with "Rs." in the column head; lakh to two decimals in summary chips; a unit on every figure that stands alone |
| 5 | Estimate | Significant | The headline is exact to the rupee; the estimate is not | The page's own range: Rs. 17,36,582 to Rs. 24,90,247, about 19% below to 16% above Rs. 21,38,356 | UX8: "Rs. 21.4 lakh" on screen with the range as a bar; exact figures in the bill and the documents, and the page says which |
| 6 | DSCR, report | Significant | Boxes misalign; examples inside the box look like typed values; defaults look typed | DSCR's "EMIs already paid" hint is three lines beside a one-line hint; "like 10 L or 10,00,000" in every money box of the report; "Like 10." above the box elsewhere; the report's days show "30" as if typed | UX9: unit inside the box (Rs., %, years), the hint below in one slot, no placeholders, a default as "30 · assumed" |
| 7 | Estimate | Significant | "Start from the bill" errors after the click, then asks a question already answered | "Answer the six questions at the top of the page first" (0:12); "New construction / Renovation or repair" after "What is the work?" | UX9: reuse the answer; say before the click what the button needs, or jump to the first unanswered question |
| 8 | DSCR, CMA, report | Significant | Assumptions written as prose: values cannot be scanned | DSCR's nine sentences of links (0:10–0:14); paragraphs on the CMA and the report | UX9: a ledger of what, assumed value and Change; reasons behind "Why" (D-UX-32's one line with the count everywhere) |
| 9 | All four | Significant | The frame outweighs the content: hero-size headings over empty sections, a full-screen wordmark in every footer, while questions, hints and figures are the smallest, faintest text | "Results" with nothing in it; "Download" that cannot be used yet; every video scrolls into the wordmark | UX8: a section shows when it has content or folds to one line; the wordmark small; the size budget to the answer |
| 10 | All four | Polish | The red tick on each heading's ledger rule reads as a text cursor or a glitch | Every video | UX9 |
| 11 | Estimate | Polish | Native `title` tooltips with rupee figures stay over other rows as the page scrolls; never on touch | 0:54–0:60; `site/src/estimate/PlanEstimate.tsx` lines 186, 372, 424 | UX9: the figure in the visible text or an `aria-label` only |
| 12 | All four | Polish | The menu marks no current page; "Start a DSCR statement" in the other tools' header | Every video | UX9 |
| 13 | CMA, report | Polish | The bottom bar shows from the start on DSCR, only after typing on the CMA and the report | `site/src/cma/Cma.tsx:88`, `site/src/report/Report.tsx:179` | UX8: one rule for all four |
| 14 | Estimate | Polish | "A 2 BHK is usually 650–850 sq ft; yours is 859" flags a 1% overshoot: warnings that teach people to ignore warnings | The "To check" section | UX9: a tolerance, or a quieter tone |

Keep: Indian digit grouping; the estimate's stack of total, range, rate a sq ft and where the rates come from; its section bars, sorted largest first and to scale (Doors 2,96,695 over Bathrooms 4,74,877 is 0.625, the bars 522 over 836 px, 0.624); the summary line with Change; "Fill with the worked example"; "Read a statement (PDF)".

## Tradeoffs, each with a recommendation
1. **Side by side from 1024 px.** It fixes findings 1 to 3 but doubles the layouts the critic checks, and the screen no longer looks like the single-column paper. Recommended: it is the root of most findings.
2. **An outline in place of the to-do list.** Readers may take blanks for figures. Recommended, with "—" never 0 and "Provisional" kept.
3. **A rounded headline on screen.** Lenders and accountants check exact sums. Recommended on screen only; exact in tables and documents, and the page says which.
4. **Live subtotals and a balance check in the CMA.** They catch typos early, but "does not balance" mid-entry alarms. Recommended once a year's column is complete; the subtotals from the engine.
5. **One "still needed" list, not three.** The list is also the keyboard and screen-reader path to each missing box. Recommended: keep the links in one place, opened from the counter.
