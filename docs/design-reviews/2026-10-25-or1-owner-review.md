# OR1 — the owner's review of the project report (25-10-2026)

The owner used the project report on the UXR2 preview (`uxr2-drafts.finance-tools-9if.pages.dev`), simple mode, proprietor, building Rs. 50,00,000 and plant Rs. 2,50,00,000, and recorded 40 seconds of the right-hand panel (frames every 5 s: `2026-10-25-or1-frames.jpg`; the recording itself is not kept in the repo). Their verdict: "I am unable to understand the project report; make it viable does nothing; the output is complicated and a user can't fix it." They will use every module and report back; each report is recorded like this one. **"This will not be used by AI, it will be used by common people."** Most points hold across all four tools (marked *all*).

## What the recording shows
- The panel reads "It misses one of the default benchmark ratios: Fixed-asset cover" and, right under it, "✓ Complete".
- Fixed-asset cover: 0.50 in 2036-37 against 1.20, "short by Rs. 94,63,429 of net fixed assets". Every other ratio meets.
- "The term loan runs 181 months with its moratorium, beyond the 180 months an MSME term loan commonly runs at most."
- The plan: after "Use this plan" the panel still says "With these changes: Misses 1: fixed-asset cover". Each lever reads "Alone: … meets none of the levels missed", except a smaller term loan (at most Rs. 1,03,31,366, promoters bringing Rs. 1,39,35,203 more). A paragraph of "limits kept" (promoters' money not typed, capacity at most 85%, term within 180 months, …) explains why it stops.
- Likely cause, to prove in OR2 before any fix: a 15-year term (with the holiday inside it) outlives the plant's written-down value, so the loan left in year 11 is about twice the net block. Sales, costs, collateral and the working-capital limit cannot move that ratio; only a shorter term, a smaller loan or more of the promoters' money can, and two of those are capped or need a figure the borrower was never asked for. The plan never says so in one line.

## The owner's points
| # | Point (the owner's words, shortened) | Where | Also |
|---|---|---|---|
| O1 | The PMEGP conditions are hard to read. Not everybody is from the North-East; "a ready-built, leased or rented shed counts … for at most 3 years" is not understood. Points 1, 4 and 5 are clear. | `engine/data/report.json` conditions, report simple mode | *all*: every list of conditions |
| O2 | "Term loan sanctioned": it is not sanctioned yet. | `Report.tsx:180`, `document.ts:93` | *all*: lender's words for things not yet done |
| O3 | No moratorium (holiday) is asked; the holiday is taken inside the 15 years. | simple mode hides `fld-tl-moratorium` (site check line 1334 enforces it) | DSCR, CMA |
| O4 | No repayment type: EMI, or a negotiated (stepped) repayment, less in the early years and rising as the project matures. The tool should work out which is cheaper and which is viable. | `REPAYMENT_CHOICES` (expert only: EMI, equal principal monthly or quarterly); no stepped schedule in the engine | DSCR |
| O5 | Security: collateral or CGTMSE, but not hybrid (part immovable collateral, part CGTMSE cover), which general MSME loans can have. | `SECURITY_CHOICES`, `fld-cgtmse` | CMA |
| O6 | Sales: only a price a unit. Manufacturing also sells by weight; services are priced differently. | product lines, `Report.tsx:207–216` | CMA's sales |
| O7 | "Provisional: 1 still to answer" is not intuitive. | `model.ts:510` and its copies | *all* (UXR1 S7, P4) |
| O8 | "Misses Fixed-asset cover" and "✓ Complete" right below it: confusing. | the panel's status line | *all* (UXR1 S5) |
| O9 | No way to fix it: the "make it viable" button is at the bottom. | the plan section | *all* tools with levers |
| O10 | "Change the benchmarks" shows empty boxes with the default under each: do I fill all of them or only the one I change? Show every box filled with its default; a changed box stands out, with its default under it. | the benchmark fields | *all* assumption boxes |
| O11 | "Make it viable" does nothing: after the plan, it still fails. | `engine/plan.ts` | DSCR, CMA levers |
| O12 | The plan should open with one set of viable values on sliders; the user accepts or moves a slider, and the others move (within reason) so it stays viable. Each lever keeps a floor or ceiling unless overridden on purpose (the owner's examples: sales at most 10 or 15 times, interest down to 2%). All the combinations (more of the promoters' money, a lower project cost, a larger loan with higher sales, …) to be worked out in general and coded. | `engine/plan.ts`, `dscr/levers.ts`, `cma/levers.ts` | DSCR, CMA |
| O13 | Before the report: show what was collected (the business, the project cost and its means of finance, production, variable and fixed costs) and the benchmarks it will be judged against, with "these are standard; a bank's credit manager, a CA or a DSA may change them"; the user confirms; then the report. | none yet | *all* |
| O14 | The side panel is narrow. Once the inputs are in, the result should take the centre and the inputs fold, in a classy way, to a narrow rail on the left. | page layout | *all* (UXR1 S3, S17; UXR5) |
| O15 | The output is complicated; a user cannot fix it. | the panel's words | *all* |

## Synopsis
1. **Words** (O1, O2, O7, O8, O15): lender's and engine's language on a page for common people; a tick beside a failure.
2. **Missing loan terms** (O3, O4, O5): the holiday, a stepped repayment and hybrid security, each changing the answer, are not asked or not offered.
3. **Sales that fit the business** (O6): price by piece only.
4. **Defaults shown as empty boxes** (O10).
5. **The fix does not fix** (O9, O11, O12): the plan is far down, ends still failing, and its levers move one at a time.
6. **No moment of review** (O13) and **the result squeezed into a side panel** (O14).

## The plan
Each row is one session (D-TECH-62), with its deliverable on a preview. Where an UXR1 row covers the same ground, the two are done together, never twice.

| Row | Deliverable | Points | Budget | With |
|---|---|---|---|---|
| OR2 | **Why it fails, in one line, and the term as a lever**: prove the cause of the 0.50 (the term against the net block; the depreciation used for the balance sheet); the panel names the binding cause and the lever that moves it ("Shorten the term to 9 years, or bring Rs. X more"); a shorter term joins the levers; the button sits beside the miss | O9, O11 | M, Extra | — |
| OR3 | **Words for common people**: the PMEGP conditions as plain checks, shown only when they apply (the trading one only for trading, the shed one only with a rented or leased shed: "Renting a ready-built shed? Up to 3 years' rent counts in the project cost, not the shed"); "Term loan you will ask for"; "1 question left: answer it" with a link to the box; the status ("All answered") apart from the verdict ("Works" / "Does not work yet: 1 ratio short"), never a tick beside a miss; a sweep of the four tools for the same faults | O1, O2, O7, O8, O15 | M, high, writer | UXR3 |
| OR4 | **Every assumption box filled with its default**: a changed box tinted and tagged, its default and a reset under it; the same part on all four tools | O10 | S, high, designer | — |
| OR5 | **The holiday and the repayment, compared**: simple mode asks the holiday's months and the years to repay after it (the total read back, checked against the scheme's cap); the engine adds a stepped schedule; EMI, equal principal and stepped are compared on interest paid and the lowest-year DSCR, and the cheapest that meets the targets is proposed | O3, O4 | L, Extra | DSCR's loan terms |
| OR6 | **Sold by**: each product or service line picks its unit (piece, kg, tonne, litre, metre, sq ft, hour, day, job, month); "how many a month" and "the price" follow its unit; the raw material per unit follows the same unit | O6 | M, high | CMA's sales |
| OR7 | **Hybrid security**: part collateral, part CGTMSE; the cover and its fee on the part not backed by collateral, from CGTMSE's own documents in `docs/inbox/` | O5 | M, Extra | — |
| OR8 | **Check and confirm**: one page of what was collected and the benchmarks, the line for a credit manager, CA or DSA, a confirm; the report and its downloads after it | O13 | M, high | UXR5 |
| OR9 | **The result takes the centre**: once answered, the result widens and the inputs fold to a narrow rail of sections on the left (on a phone, an "Edit answers" sheet); one shared part for the four tools | O14 | L, designer and critic | UXR4, UXR5 |
| OR10 | **A plan of linked sliders**: the solver opens on one viable set; moving a slider re-solves the others within their bounds, stops at the least that stays viable and says why; bounds and the order the levers give way in a dated data file, each overridable; one solver for the report, the DSCR and the CMA | O12 | L, Extra (may split in two) | — |

Order recommended: OR2 first (the broken promise), then OR3 and OR4 (cheap, and they clear most of the confusion), then OR5, OR6, OR7, then OR8, OR9 and OR10, which change the page's shape and want the earlier rows' fields in place.

## Tradeoffs for the owner
1. **More questions on the default path** (O3, O6): the holiday and a unit raise the default field count, which D-UX-10 and D-UX-12 cap and the site check counts. Recommended: ask the holiday (it changes the answer most); the unit as a pick inside the product line, starting at "piece"; the repayment type never asked, the tool proposes one and the borrower may switch.
2. **A stepped repayment costs more interest**, and lenders look hard at a schedule loaded at the end. Recommended: compare all three, propose the cheapest that meets the targets, and cap the last year's share of principal in a data file, listed as an assumption.
3. **Linked sliders need a rule for which lever gives way first**: many sets are viable. Recommended: you set the order once (for example costs and sales first, the promoters' money last) and the bounds (your 10 or 15 times sales, 2% interest), each overridable with a note on the page.
4. **The depreciation behind the fixed-asset cover**: written-down value at tax rates shrinks the net block fast and can fail this ratio on its own; straight-line book depreciation would not. Recommended: OR2 checks which the engine uses and puts the choice to you with the figures of both, before any change.
5. **A confirm step is one more click**: recommended only before the report and its downloads; the live verdict stays as you type.

## Waiting on the owner
- "Years to repay": counted after the holiday (recommended: the way borrowers say it) or including it?
- The bounds: what "sales 10x or 15x" measures (sales to the project cost, to the capacity, or to the first year?) and "interest 2%" (a floor on the rate, or 2 points below the typed rate?).
- The order the levers give way in (tradeoff 3).
- The order of the rows against Saturday 31-10 (D-BIZ-21).
