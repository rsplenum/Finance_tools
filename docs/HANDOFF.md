# Handoff — start here in a new session
State at 03-10-2026: P0 to P1g are on `main` (PRs #2 to #6), which Cloudflare Pages builds: the DSCR engine, the calculator at `/dscr/`, the statement to download (D-DOC-01, D-DOC-02, D-TECH-13), free for now, and P1e: existing EMIs as debt service, the tax by who the borrower is (a proprietor's slab rates), and the new asset's income, each worked out twice and shown on the current page in the smallest way (D-POL-07 to 09, D-UX-11, D-TECH-15). The interest rule is in the owner's words (D-POL-10).
- **P1g, merged in PR #6 on 02-10-2026:**
  - the downloads laid out as a CA's DSCR statement: page 1 has the whole working, every line, then the average and the lowest year, signed; Annex 1 is the basis, Annex 2 the repayment schedule (D-DOC-04);
  - a Word copy as the third download (D-DOC-06);
  - the lender's target, how far the method was checked and the planning rules left out of the documents, kept on the page (D-DOC-05).
  - a Total column in the statement, on the page and in the downloads: the engine adds each line over the years counted, checked twice (D-DOC-07).
- **Also in PR #6 (02-10-2026), the owner's "finish the project today":**
  - the construction or renovation estimate at `/estimate/` (D-UX-13);
  - the project report at `/project-report/` (D-UX-14);
  - the DSCR front door (P1f, D-UX-15): eight fields, everything else under a closed More options, results first, Print.
  Each tool has its own engine, worked out twice, and downloads in PDF, Excel and Word. PR #6 is merged, so all of it is on the live site.
- **R2a (draft PR, 03-10-2026), the owner's "merge and proceed with the next":** rooms by buttons of the kinds the library has (D-UX-29, D-TECH-21):
  - **+ Bedroom and a bedroom's ×** change the bedrooms answer; the later bedrooms move up with their sizes, words, levels, items and brands. A 1 BHK's × makes a 1 RK.
  - **+ Bathroom and a bathroom's ×** (1 to 8), each a common bathroom of the programme's range; the rooms share the area with it. **Attached bathroom** on a bedroom opens the first common bathroom into it, or adds one.
  - **The balcony's ×** and + Balcony (outside the shared area, so no room moves).
  - Your example builds in a few taps: a 1 BHK with the bathroom attached to the bedroom and no balcony. The new kinds (Study, Pooja room, Utility, Store) are R2b, after your answer to the plan's §6 question 3.
- **R1, merged in PR #14 on 03-10-2026, the owner's "merge and proceed with the next":** the planning estimate's Rooms by size words (D-UX-28, D-TECH-20, D-DATA-07):
  - **Four buttons on each room** (Compact, Medium, Above medium, Spacious) put it at the bottom, middle, three quarters or top of its reported range; the planned rooms share the area by those sizes, so a word sets the room's share and the others take up the difference. The passage and the balcony keep the rules' sizes.
  - **A typed size keeps E3's rule**: it moves no other room; a word on a typed room puts the size aside. Each room's own size and level now sit behind one line under its buttons, open when set.
  - **The bar of shares** above the rooms, with the same as a list; **What changed** names the knock-on ("Living and dining to Spacious: the other rooms 3.2% smaller · Rs. … more"); a room below the Code's minimum is flagged under its buttons and in what to check, never changed.
  - **Each room's range** in `architect.json` (`programmes` `range`, `sizes`), from the sources already cited, Medium its middle, so no estimate moved. The 1 RK's ranges are our own: no source gave its rooms.
  - Every new figure worked twice: the sizes, the shares (in closed form in the check) and the knock-on. The plan's 1BHK of 600 sq ft by hand: living 221.20, bedroom 159.76, kitchen 79.88, bathroom 49.16 sq ft; shares 37, 27, 13, 8, 10 and 5%.
- **E5, merged in PR #13 on 03-10-2026, the owner's "merge and proceed":** the rest of a new house on the planning estimate (D-UX-27, D-POL-11, D-TECH-19, D-DATA-06):
  - **Outside works**, a section with a slider: the compound wall round the plot, painted on both faces, the gate and the paving by level.
  - **Water**: a sump of three days, an overhead tank of a day, a septic tank by the BHK with a soak pit, a rainwater recharge pit; a switch for the city's sewer, whose connection has no rate yet (flagged, left out of the total).
  - **The plot**, under What the estimate assumes: the outline with 3 m in front, 1.5 m behind and 1 m each side, its two sides changeable; never a seventh question.
  - **The stairs**: a well on every floor (the ground floor alone too), the top one rising to a cabin on the terrace that joins the structure; the railing on every stair, the treads, risers and landings finished by level, the well's walls painted, a door to the terrace.
  - **Stages for a construction loan**, closed under the strip, and in the documents as Annex 2, pointed to from page 1 (the assumptions become Annex 3 for a new house): the structure by Brick&Bolt's published shares, each floor's slab alike, the rest from the estimate's own lines; never a lender's norms.
  - Every new figure worked twice. A G+1 of 2,000 sq ft, 3 BHK, in Pune at Basic now comes to about Rs. 2,072 a sq ft, inside Pune's reported Rs. 1,800–2,900.
- **E3, merged in PR #12 on 03-10-2026, the owner's "merge and proceed":** on the planning estimate's page (D-UX-25, D-TECH-18, D-DATA-05):
  - **Rooms**, closed under the cards: each room's size and area; its sides changeable (ft, or m with sq m) and a level of its own, for any room. A size replaces the planned one and the others keep theirs, flagged when they no longer fit the carpet area; a room's level stands above the slider and below an item of one's own (A4).
  - **What changed**, in the bar at the bottom: the last change and what it did to the total, with the items it brought in.
  - **Compare**, closed under the strip: each section that is on and the total at the five levels, the estimate's own level marked, "Yours" where it differs.
  - **Furniture and Soft furnishings**, on for Interiors (ten sections on now) and off for Repair and a new house: a sofa and a dining set, a bed and a mattress in each bedroom, curtains for each window; the movable items apart on the page and in the abstract.
  - Every new figure worked twice: the rooms' sizes, the split, Compare's runs and What changed. The six questions stay the only fields on the default path.
  - A 2BHK of 1,000 sq ft in Pune as interiors at Standard: furniture Rs. 2,03,469, soft furnishings Rs. 39,539.70, worked by hand in the tests.
- **Rooms by buttons, a plan (D-UX-26, `docs/ROOM-PICKER-PLAN.md`), R1 built (above), R2 and R3 not:** the user who knows the floor area picks the rooms by buttons and a size for each (Compact, Medium, Above medium, Spacious); the rooms share the area; sizing on a 2D plan and seeing in 3D come with the design mode. Phases R1 to R3.
- **PR #11, merged on 03-10-2026, the owner's follow-ups to E1:**
  - **Build a new house** (D-UX-23, E5 brought forward, thin): a third answer to the first question; the second asks How many floors? (Ground only to G+3); the area is the built-up area of all floors. Still six questions.
    - The engine draws the outline and takes the outer walls and stairs off it for the rooms.
    - It adds the Structure, the same at every level: anti-termite treatment; cement, steel, sand, aggregate and bricks by rules of thumb a sq ft; labour by stage.
    - It adds Terrace, exterior and stairs: an APP membrane at every level, the outside paint and the stair railing by level.
    - The cost a sq ft is of the built-up area. What is not in yet is flagged.
    - A G+1 of 2,000 sq ft, 3 BHK, in Pune: Rs. 34.4 lakh at Basic, Rs. 39.4 lakh at Standard.
  - **The documents** (D-DOC-09): no sources annex and no [n] marks; Annex 1 the detailed estimate, Annex 2 what the estimate assumes, one line each. The sources stay on the page.
  - **Money to the paisa, half up, in both computations** (D-TECH-17); the house's library (D-DATA-04): 318 items, 86 families, 192 sources.
  - **`docs/DESIGN-MODE-FEASIBILITY.md`** (D-UX-24): the plan for the owner's design mode (library at scale, value of upgrades, the basics locked, choice by element, 2D plans, 3D in the browser, legal and business challenges, phases), with six decisions for the owner.
- **E1, the planning estimate's page at `/estimate/`** (D-UX-21, D-DOC-08), merged in PR #10 on 03-10-2026:
  - six questions and no other field, folding into one line as the sixth is answered;
  - the answer first: the total, the cost a sq ft, the five-level strip (a tap switches the package) and the total by section;
  - a card for each of the 13 sections, with its slider of five stops, its main items, its amount and the change from the package;
  - the item drawer: the family's five levels and other items, brands as chips, how the line was worked out, its sources;
  - what the estimate assumes (the ceiling height changeable there) and what to check;
  - the planning estimate as PDF, Excel and Word: page 1 the abstract and the total in words, Annex 1 every line, Annex 2 what it assumes (D-DOC-09).
  - The typed quotation is the second path, under a closed "Have a contractor's quotation?".
  - Level 5 is "Bespoke" on screen (D-UX-20). A house's rooms inside are estimated as a flat's, flagged (D-UX-22).
  - Done when the owner tries it on a phone and a desktop and says it feels simple.
- **The estimate's engine, as the architect, and its library** (D-UX-18, blueprint version 3 A0), merged in PR #8 on 02-10-2026. Version 2 of the blueprint (D-UX-17) is merged (PR #7).
  - `engine/architect.ts` works the estimate out from six answers (the work, flat, city, carpet area, bedrooms, level). It plans the rooms, places doors and windows, measures by IS 1200, puts in what each room needs at each section's level, prices it for the city and adds it up by section and room and at all five levels. `engine/architect-check.ts` works it all a second way.
  - The rules are in `engine/data/architect.json` (in plain words in `docs/RULES.md`). The library has 312 items in 79 families, 17 kinds of labour and 183 sources, in `engine/data/library/` (in plain words in `docs/LIBRARY.md`).
  - Every rate is "as reported" through search summaries, not yet checked (the network blocks the pages). So the estimate is a planning estimate (A7, A18).
  - A flat, or a house's rooms inside, for repair or renovation and for interiors; a new house (D-UX-23, and since E5 its plot, outside works, water, stairs and stages, D-UX-27). Furniture and soft furnishings are in the estimate since E3. Adding a floor, a renovated house's own works, a borewell and CPWD's plinth-area check are still to come (A17).
  - **The owner's answers (D-UX-19, D-UX-20):** the levels are Basic, Standard, Premium, Luxury and Bespoke on screen; movable items are sections of their own, on for Interiors and off for Repair (Appliances, Smart home, and since E3 Furniture and Soft furnishings).
  - For the page (D-TECH-16): `overPackage` (each section against the package) and `choicesFor` (the drawer's items), with every rate worked twice through `checkRate`.
  - The tool never calls itself an architect (Architects Act s. 37; CLAUDE.md).
  - B12 critiques Gemini's second note.
- **The owner is not satisfied with the page.** An outside review (Gemini, reading `main` before PR #2 was merged) and the owner's own words: it should ask seven inputs, not ten plus method choices. The engine's maths stands; the review's own formula taxes profit before interest. **Next:** the owner tries the three tools on the live site, then payment (P1d) once the business entity, GST and Razorpay account exist. The front door is done when the owner says it feels simple (D-UX-15).
- **Skills** in `.claude/skills/` (D-TECH-14): `brief-first` (now with the finish line, the owner saying it feels simple, and what to refuse; D-UX-12), `money-maths-checks`, `lender-documents`. The owner's rule, now in CLAUDE.md: give the tradeoffs of every request.

The test figures are model-worked until the owner confirms fictional cases A and A′ (`docs/GOLDEN-CASES.md`); nothing from the owner's office, ever (D-BIZ-02). Keep this file short and current.

## Where things are
- Live site: https://finance-tools-9if.pages.dev (Pages project `finance-tools`, built from `main`); each branch previews at `https://<branch>.finance-tools-9if.pages.dev`, linked on its pull request. Worker: not deployed (placeholder IDs). Repo: rsplenum/Finance_tools. Study report (private): https://claude.ai/code/artifact/4bad29bb-5d80-4b27-9386-be3f2581c068
- Read order: `CLAUDE.md` → this file → the `docs/DECISIONS.md` sections you need → `docs/PROJECT.md` only for the why. The rules in plain words: `docs/RULES.md`; the estimate's library: `docs/LIBRARY.md` (both generated). Cloudflare settings: `docs/CLOUDFLARE.md`.

## What works now
- `engine/util.ts` (EMI, formats, words) and `engine/parse.ts` (amounts, dates, months), tested against textbook figures.
- DSCR engine:
  - `engine/loan.ts`: the loan month by month (`months`), and by financial year (`schedule`).
  - `engine/dscr.ts`:
    - `dscrStatement` from the borrower's own figures;
    - `planStatement` from projections and loan terms, with the profit build-up and tax; per year it also takes the new asset's income (`assetIncome`, added to profit), existing EMIs (`existingEmis`, debt service in full under every method, `PLAN_SERVICE`) and, in place of a rate, who the borrower is (`taxBy`);
    - `amortization`, `maxLoanAmount`, `shortestRepayment` and `loanTimeline`;
    - an optional first year of figures (`start`) that leaves out an interest-only first year by the user's choice (D-POL-04);
  - `engine/project.ts`: yearly figures from one or two answers (the same, grows by %, falls by %), checked in closed form (D-TECH-12). The page asks a few answers per line, not every year (D-UX-07). Also `emisByYear` (EMIs a month to each year, up to each loan's last EMI) and `fromMonth` (a yearly figure from the month it starts running);
    - a list of facts needed instead of figures.
  - `engine/tax.ts`: `taxOn` by borrower (slabs, rebate and marginal relief, surcharge and marginal relief, cess), `taxSummary`, `BORROWERS`.
  - `engine/dscr-check.ts`: the second computation, closed-form month by month; `taxCheck`, `emisCheck`, `fromMonthCheck`. Figures are withheld if it disagrees.
  - Data: the method, three presets and which existing EMIs count by borrower (`existingEmis`) in `engine/data/dscr.json`; the tax by borrower (proprietor, firm or LLP, company; secondary sources) in `engine/data/tax.json`.
- DSCR page (D-UX-03 to 06, D-TECH-09 and 11):
  - Files:
    - `site/src/dscr/model.ts`: pure; typed text to engine to words, with the statement and schedule views; unit-tested.
    - `Calculator.tsx`: the island.
    - `site/src/fields.tsx`: fields that keep a draft until left.
    - In `model.ts`: `ASSUMED` (the starting state, from `engine/data/defaults.json`), `assumedIn` and `withSource`. The statement and schedule views carry the engine's exact figures (`n`) beside the words, for the Excel copy.
  - Fields are `fld-…`; answers have `data-testid`:
    - assumptions: `dscr-assumed`, `assumed-<id>`;
    - summary: `dscr-status`, `dscr-needs`, `dscr-average`, `dscr-lowest`, `dscr-verdict`, `dscr-largest`, `dscr-fewest`, `answer-bar`;
    - statement: `dscr-<year>`, `available-<year>`, `service-<year>`, `pbt-<year>`, `tax-<year>`, `card-<year>`;
    - schedule: `schedule-<year>`, `month-<YYYY-MM>`;
    - loan read-back: `loan-level`, `loan-dates`, `amount-read`;
    - who the borrower is: `fld-borrowerType-<proprietor|firm|company>`; `tax-by` (the tax line's words);
    - loans already running: the mode `fld-otherLoansInterest-emi`, then `fld-emi-<n>`, `fld-emiLast-<n>`, `add-loan`, `remove-loan`, `emis-ask`, `readback-existingEmis`;
    - the new asset: the mode `fld-assetIncome-from`, then `fld-assetIncome-yearly`, `fld-assetIncome-start`, `readback-assetIncome`;
    - statement lines shown only when not nil: `asset-<year>`, `emis-<year>`;
    - buttons: `clear-all`;
    - download: fields `fld-borrower`, `fld-lender`, `fld-preparedBy`; `doc-status`, `doc-needs`, `doc-wait`, `download-pdf`, `download-xlsx`, `download-docx`.
- The planning estimate (E1, a new house, E3 and E5): `engine/architect.ts` (+ `architect-check.ts`, `library.ts`, `data/architect.json` with `house` (plot, outside, water, cabin, stages), `data/library/` with `structure.json`, `furniture.json` and `outside.json`; `planRooms` (the rooms by their size words, R1, and the user's bathrooms and balcony, R2a; `wordOf`, `sizeAt`, `SIZE_WORDS`, `bathsOf`, `bedroomsOf`, `BATHS`), `houseOf` (the outline and the plot), `measureHouse`, `stagesOf` and `stageShare` (the stages), `sectionFor`, `ownRooms`, `levelRuns` (the strip and Compare), `changeOf` (What changed, with the knock-on of a word as `others`); the estimate's `shares` (the bar) and `below` (the rooms under the Code's minimum)); page `site/src/estimate/plan-model.ts` (pure: answers to the engine's input, its answer to words, the drawer), `PlanEstimate.tsx` (the island) and `plan-document.ts` (the three files); tests `tests/architect.test.ts`, `tests/library.test.ts` and `tests/plan-page.test.ts` (a 2BHK of 1,000 sq ft in Pune; the living room's floor at Basic worked by hand, 303.03 sq ft × Rs. 114.09; a new G+1 house of 2,000 sq ft, its outline, structure, terrace, outside walls and railing by hand, and Brick&Bolt's worked 1,000 sq ft house; E5's plot, compound wall, gate, paving, sump, tank, septic tank, rainwater pit, stairs and stages by hand; R1's 1BHK of 600 sq ft with the living room Spacious and the bedroom Above medium, its shares and knock-ons, and R2a's same flat with the bathroom attached and no balcony, its skirting, by hand).
  - Fields: `fld-work-<build|renovate|interiors>`, `fld-home-<flat|house>` (or `fld-floors-<1…4>` for a new house), `fld-city`, `fld-carpet`, `fld-carpetUnit-<sqft|sqm>`, `fld-bhk-<1RK…5>`, `fld-level-<1…5>`, each question in a `[data-question]` block inside `#six-questions`; `fld-on-<section>`, `fld-slider-<section>`, `fld-height`, `fld-plot-<l|b>` and `fld-sewer` (a new house), `fld-roomword-<room>-<compact|medium|above|spacious>`, `fld-attached-<bedroom>`, `fld-room-<room>-<l|b>`, `fld-roomlevel-<room>`, `fld-pl-<owner|property|lender|preparedBy>`.
  - Answers: `pl-summary`, `pl-change`, `pl-done`, `pl-total`, `pl-per-sqft`, `pl-strip-<1…5>`, `pl-compare` (`pl-compare-<section>`, `pl-compare-total`), `pl-stages` (`pl-stage-<id>`: `foundation`, `slab-<n>`, `walls`, `finishing`, `outside`, `movable`; `pl-stages-total`), `pl-plot-change`, `pl-plot-reset`, `pl-plot-bad`, `pl-bar-<section>`, `pl-rates`, `pl-split`, `pl-card-<section>`, `pl-level-<section>`, `pl-spec-<section>`, `pl-amount-<section>`, `pl-over-<section>`, `pl-items-<section>`, `pl-line-<key>`, `pl-open-<key>`, `pl-drawer`, `pl-brand-<brand>`, `pl-how`, `pl-rooms` (`pl-shares` with `pl-share-<room|walls>`, `pl-room-<room>`, `pl-room-size-<room>`, `pl-room-words-<room>`, `pl-room-below-<room>`, `pl-room-more-<room>`, `pl-room-out-<room>`, `pl-room-add` with `pl-room-add-<bedroom|bath|balcony>`, `pl-room-bad-<room>`, `pl-room-reset-<room>`, `pl-rooms-note`), `pl-assumed-<i>`, `pl-flags`, `pl-doc-status`, `pl-download-<pdf|xlsx|docx>`, `pl-what-changed`, `pl-sticky-total`. A line's key is `<room>:<family>:<rule>`; a room's id is `living`, `bedroom-<n>`, `kitchen`, `bath-<n>`, `passage` or `balcony`.
- The typed quotation (the second path): `engine/estimate.ts` (+ `estimate-check.ts`, `data/estimate.json`); page `site/src/estimate/` (`model.ts`, `Estimate.tsx`, `document.ts`), under `#typed-path`; tests `tests/estimate*.test.ts` (fictional case E).
- Project report: `engine/report.ts` (+ `report-check.ts`, `data/report.json`; it calls `planStatement`); page `site/src/report/` (the page's tables in `model.ts` `viewOf` are the document's); tests `tests/report*.test.ts` (fictional case R, year 1 worked by hand). Shared: `site/src/download.ts` (the three files), `SelectField` in `site/src/fields.tsx`.
- The document (P1c, laid out in P1g):
  - `site/src/dscr/document.ts`: `statementDoc` builds it from the state and the preview: page 1, then `basisPart` (Annex 1) and `schedulePart` (Annex 2); `docNeeds`, `allNeeds` (not the target), `docStatus`, `fileName`, `sourceForLender`.
  - `site/src/doc/`: `doc.ts` (blocks, `docText` for tests), `pdf.ts` (PDF writer, `printable`, `measure`), `xlsx.ts` (Excel writer), `docx.ts` (Word writer), `zip.ts` (the stored zip of both). Pure, no DOM.
  - `scripts/read-doc.mjs`: reads the files back with pdf.js, read-excel-file, mammoth and JSZip, for the tests and the site check.
- `site/`: home, `/dscr/`, 404; dark mode without a flash. `worker/`: `GET /health`.
- Checks, all in CI:
  - `npm test` (294, including the simulation and the documents read back by pdf.js, read-excel-file and mammoth);
  - `npm run typecheck`;
  - `npm run rules-doc -- --check`;
  - `npm run build`;
  - `npm run worker:build`;
  - `npm run check:site`: 0 violations. It drives the planning estimate (six questions counted, the answer, a slider and what it changed, the strip, Compare, the rooms by size words (the bar of shares, Spacious and its knock-on, the arrow keys, a word in place of a typed size) and by buttons (a bathroom attached, added and taken out, the balcony out and back, a bedroom added and taken out), with a size and a level of their own, the drawer, interiors with the movable items apart, a new house with its six questions and eighteen sections, its stages, a plot of its own and the sewer, the three files read back, in light and dark), the typed quotation, and the calculator with case A, the quick path, a proprietor with EMIs and the new asset, and own figures, downloads the PDF, the Excel copy and the Word copy at 390 px (provisional, then complete) and reads them back, failing on anything kept to the page (the target, the verdict, the assumptions); about 20 s.

## Next — one fresh session per item
| # | Session | Starter prompt (paste as the first message) |
|---|---|---|
| P1d | Payment for the download (after P1f, and after the owner's Phase 0 items: business entity, GST, Razorpay account) | "Work from `main`. Read CLAUDE.md, docs/HANDOFF.md, docs/DECISIONS.md (D-TECH-01, D-TECH-06, D-DOC-01) and docs/CLOUDFLARE.md. P1d: payment for the DSCR statement download, through Razorpay and the Worker. Ask me first, in one message: the price; whether the Worker stays separate or moves beside the site as Pages Functions; and, since the document is made in the browser, whether payment only unlocks the two buttons (anyone reading the page's code could still make the file) or the file must come from the server. Then build it: the order made in the Worker, the payment verified by its signature, and the buttons unlocked for that statement only. Test with Razorpay's test keys, set only in the environment settings, never in the repo. The preview stays free. Finish per HANDOFF." |
| R2b | Rooms by buttons, the new kinds of room (`docs/ROOM-PICKER-PLAN.md` R2b; recommended next, after your answer to its §6 question 3) | "Work from `main`. Read CLAUDE.md, docs/HANDOFF.md, docs/ROOM-PICKER-PLAN.md and the brief-first skill. R2b on the planning estimate's Rooms: + Study, + Pooja room, + Utility and + Store beside R2a's buttons, in this order: <your order>. Each new kind of room gets its reported range in architect.json for R1's size words, with its source, and its items at the five levels, each with its source in the library (the plan's §3: a study's desk unit in Wardrobes' board and finish, a pooja room's stone floor and cladding, door and light, a utility's tap, drain and washing machine point, a store's shelves); a room's × takes it out. The rooms share the area as in R1, and typed sizes keep E3's rule. Every figure worked out twice. The six questions stay the only fields on the default path. Finish per HANDOFF." |
| E4 | A quotation in hand, and the bill of quantities for quotes (A9) | "Work from `main`. Read CLAUDE.md, docs/HANDOFF.md, docs/ESTIMATE-BLUEPRINT.md (A9, A15, A17 E4) and the brief-first skill. E4 on the planning estimate's page: the bill of quantities to download (the estimate's lines with their specifications and quantities, the rate and amount columns blank, for two or three contractors to quote like for like), and a quotation typed in (the existing typed path) matched line by line to the library's range at each level, flagged where a rate is far outside it, with what the quotation leaves out. Every figure worked out twice in the engine. The six questions stay the only fields on the default path. Finish per HANDOFF." |
| E2 | Check the library against its sources (needs the network hosts below) | "Work from `main`. Read CLAUDE.md, docs/HANDOFF.md and docs/LIBRARY.md. Open each source in engine/data/sources.json, check each level item's figure against its page, fix any that differ, and mark the source checked; replace a rate with CPWD's DSR 2023 item where one fits, with the city's index. Report what changed. Finish per HANDOFF." |

## End of every session
1. `npm test` (includes the simulation; `npm run sim` prints it: 0 violations), `npm run typecheck`, `npm run rules-doc`, `npm run build`, `npm run check:site` (0 violations). One line in `docs/DECISIONS.md` per decision.
2. Update this file (state + next), commit, draft PR. The branch preview builds itself (link on the PR); open it and say so.

## Waiting on the owner
- **Try the R2a PR on a phone and a desktop** (its preview): a 1 BHK of 600 sq ft, then open Rooms under the cards. Make the living room Spacious and the bedroom Above medium, tick "Attached bathroom" on the bedroom, take out the balcony, and try + Bedroom and + Bathroom; read the line at the bottom after each. It is done when you say it feels simple. R1, the size buttons and the bar of shares, is on the live site.
- **Try E5 on the live site** (merged): Build a new house, open "Stages for a construction loan" under the five levels, read the Outside works and Water cards, change the plot under What the estimate assumes, tick the sewer, and download the PDF (the stages are Annex 2). Also try E3 on the live site: Interiors with Furniture and Soft furnishings, Rooms, the bar at the bottom, Compare. Each is done when you say it feels simple. Rates stay as reported until E2 checks them; Bespoke repeats Luxury's furniture and paving granite until dearer ones are found; the sewer connection has no rate until your city's charges are added.
- **Check E5's stage shares**: the structure split 23.81% foundation and plinth, 42.86% frame and slabs, 33.33% walls and plaster (Brick&Bolt's published middles, `docs/RULES.md`). Say if a public source you trust splits it otherwise; a lender's own schedule stays out (D-POL-11).
- **Read `docs/ROOM-PICKER-PLAN.md` and answer its four decisions (§6):** R1 is built on the recommendations for the four words (Compact, Medium, Above medium, Spacious) and typed sizes against words (a typed size moves no other room), so say if either should change. Still open: the area fixed or following the rooms (R3), and which extra rooms first (R2b, the next session: give the order in its starter prompt). The 1 RK's room ranges are our own until a public source is found.
- **Read `docs/DESIGN-MODE-FEASIBILITY.md` and answer its six decisions (§12):** who comes first, how a plan is entered, 3D viewer or editor first, how the library grows, how it pays, and the mode's name.
- **Your fictional flat for E1's test:** the prompt gave a house's address without room sizes or quantities, so it could not be a test. The address is kept out of the repo; the page asks for the property's address at download. For a test, send a flat's carpet area, bedrooms, level and city, with the room sizes and a few quantities and amounts you worked at home.
- **Cities:** a place outside the six cities uses their average, likely high for a smaller city. Adding smaller cities needs a sourced cost a sq ft for each (E2, once the network allows).
- **Try the three downloads on the live site.** Open the Word copy in Word itself and the Excel copy in Excel: they were checked with mammoth, read-excel-file and LibreOffice, not with Microsoft Office.
- **Try P1e on the live site**: who the borrower is, EMIs a month, the new asset's income.
- **Try the front door (P1f)** on the live site, on a phone and a desktop: it is done when you say it feels simple. Then the estimate and the project report, with your own fictional cases.
- **Work fictional case P** (`docs/GOLDEN-CASES.md`: a proprietor with EMIs and a new asset) at home, as for A and A′.
- **Check the tax by borrower** (`docs/RULES.md`, "Tax by borrower"): a proprietor's new-regime slab rates for 2026-27, the firm's surcharge above Rs. 1 crore, and the assumption that a proprietor's business profit is their only income. Read from secondary sources only.
- **Still open on the downloads:**
  - is anything missing that a lender expects on them (the loan's purpose, the borrower's address, a GSTIN)?
  - do the borrower's signature block and "Not a CA's certificate" suit?
  - should the Excel copy carry formulas that redo the working (D-DOC-02)?
- **Check the page's assumptions** (`docs/RULES.md`, "What the page assumes until you change it"), above all the tax rate of 31.2% and profit growing with sales.
- **Work fictional cases A and A′** (`docs/GOLDEN-CASES.md`) in your own Excel at home, or send public worked examples with their source. Never office files (D-BIZ-02).
- **Read `docs/RULES.md` and `docs/DSCR-RESEARCH.md`.** From general knowledge and published material only (never an employer's norms), say:
  - whether the four choices and the three presets (common, RBI 2020, Schedule III) are right and in the right order;
  - whether you know published lender norms that use the simple average, and which lenders' published norms matter first;
  - whether the tax rates by borrower hold for FY 2026-27.

  The page shows the method as "not yet checked" until then.
- **Network settings:** allow `rbi.org.in`, `rbidocs.rbi.org.in`, `icai.org` and `bcasonline.org` so a session can read the primary texts (the research used secondary sources); `incometaxindia.gov.in`, `incometax.gov.in`, `indiabudget.gov.in` and `egazette.gov.in` for the tax rates; and `developers.cloudflare.com` and `pages.dev` so it can check `docs/CLOUDFLARE.md` and open previews itself. For the estimate's primary texts and its library (`docs/ESTIMATE-BLUEPRINT.md` A7, B9), allow `indiacode.nic.in`, `cpwd.gov.in`, `bis.gov.in`, `coa.gov.in`, `cbic-gst.gov.in`, `labour.gov.in`, `archive.org` and `law.resource.org`, and the brands' and firms' sites, or give the library's sessions full network access. All are blocked now.
- The Worker (`docs/CLOUDFLARE.md` §2: create D1 + KV, send the IDs) can wait until the payment session.
- Business entity, GST registration and Razorpay account (Phase 0).
- Before payments: keep the separate Worker (D-TECH-01) or move the API beside the site as Pages Functions (same address, separate preview data per branch)? Branch previews of a separate Worker share the live D1 and KV. Decide with the Cloudflare docs open.
- A product name and domain (the site says "Loan document tools" for now); at launch remove the `noindex` in `site/public/_headers`.
- First region and cities for construction rates (Phase 2): now the cities the estimate's library is checked for first (A7).
- Main customer first, for the price (P1d): DSAs (plans) or borrowers (one-off). The page is built for a borrower first (D-UX-10).

## Gotchas
- **Money rounds to the paisa half up, with a millionth of a paisa added, in both computations** (D-TECH-17). A new rounding helper must do the same, or an exact half (a brick's 9 × 1.065 = 9.585) rounds apart in the two and blocks the estimate.
- **A section with `kinds` in `architect.json` is shown only for those kinds** (`sectionFor`): the page lists `e.sections`, never the whole rule book's list.
- **A new house has a stair well on every floor, the ground floor alone too** (the stair to the terrace, E5), and the cabin's 11.25 sq m joins the structure's rules of thumb: Brick&Bolt's per-sq-ft test is on the built-up area plus the cabin.
- **A tank is measured in litres** (the unit `litre`, the dimension `volume`), and an item supplied and fixed with a `pack` has its pack divided out before the city's factor, in `library.ts` and `checkRate` alike. A fixed item with no rate (the sewer connection) is unpriced and flagged; the library test allows that only with a note saying why.
- **A bathroom list equal to the plan's is left out** (`canon` in `plan-model.ts`), as Medium is, so a new count of bedrooms brings its own bathrooms. A room's × moves every record kept by the later rooms' ids (`moveRooms`): sizes, words, levels, items and brands.
- **When editing a file by script, pass a function to `String.replace`**: a `$` followed by a backquote in the replacement text inserts all the text before the match, and duplicated half of `plan-model.ts` once.
- **A room's size word (R1) is left out of the input at Medium** (`withRoomWord`), and a word puts a typed size aside. The planned sizes depend on the words, so anything that plans the rooms passes them: `planRooms(bhk, carpet, words)` (the page's placeholders too). Each room in Rooms holds its own `details`, so a check opens the Rooms with `:scope > summary`.
- **A room's own size is text in the page's unit in the state, metres in the engine's input** (`inputOf`); a new area unit turns the typed sides (`withUnit`). A side out of range, or one side alone, is not passed on, and the field says why.
- **What changed shows only while the estimate is the one the change made** (`inputOf(state)` equals `change.after`); every `with…` helper notes its change through `noted`, and an answer typed in the six questions makes the line go.
- One session at a time per checkout; check `git log origin/<branch>` and `git status` before any reset.
- The session's git proxy caps concurrent git operations: one clone or fetch at a time.
- Astro runs from inside `site/` (the npm scripts do this): `astro dev --root site` finds no pages in Astro 7.3. The dev server logs to `site/.astro/dev.log`.
- `.astro` files are not type-checked (TypeScript 7): keep logic in `.ts`/`.tsx`.
- Worker runtime types are generated by `npm run typecheck` (or `npm run worker:types`) and gitignored.
- `npm run check:site` needs `npm run build` first. Playwright is pinned to the container's Chromium (1.56.1); if a container ships another version, set `CHROMIUM_PATH=/opt/pw-browsers/chromium`.
- Vitest 5 hides console output from passing tests; `npm run sim` shows the simulation's per-seed summary (about 10 s).
- Stop background servers by PID: `pkill -f 'wrangler dev'` also matches the calling shell.
- The container's LibreOffice is only its core, so it loads no file ("source file could not be loaded"). `apt-get install -y libreoffice-writer libreoffice-calc` adds what it needs, in each new container. Then `soffice --headless -env:UserInstallation=file://<scratch>/lo --convert-to pdf` prints a .docx or .xlsx to a PDF. To look at a PDF page, render it in Node with pdf.js and `@napi-rs/canvas` (in `node_modules`), with `standardFontDataUrl` set to `node_modules/pdfjs-dist/standard_fonts/`.
- `new Blob([bytes])` needs `Uint8Array<ArrayBuffer>` in TypeScript 7: the writers return that type.
- pdf.js in Node: `getDocument(...)` returns a task; call `task.destroy()`, not the document's.
- A field's `change` event (a month picker, or Playwright's `fill`) can arrive before Preact re-renders the draft: commit from the input's own value, as `useDraft` in `site/src/fields.tsx` does. Preact runs `useEffect` only after the next frame (or 35 ms): use `useLayoutEffect` where a field must show a change at once, and make checks wait for what they read (`expectText`, `expectValue`).
- No two files whose names differ only in case (`plan.ts` beside `Plan.tsx`): esbuild fails on them, and macOS and Windows cannot hold both.
- `toLocaleString` with options builds a formatter each call and made the estimate ten times slower: share one `Intl.NumberFormat` (`engine/library.ts`).
- The estimate's questions fold as the sixth is answered, so a check clicks the last radio (`page.click`): `page.check` waits for a radio that is gone.
- Scratch scripts outside the repo cannot import `playwright` by name; import `node_modules/playwright/index.mjs` by path.
- WebFetch goes through the same network policy: rbi.org.in, bcasonline.org and srbatliboi.in were refused, while WebSearch works. Mark anything read only through search results as secondary.
- A row's answers are radios `fld-<key>-<answer>`: a field of that row must not reuse one (the new asset's month is `fld-assetIncome-start`, since `fld-assetIncome-from` is the radio).
- Expected figures in tests: round the exact value once. 6,15,500 ÷ 2,09,000 is 2.94498, which shows as 2.94; rounding 2.9450 again gives a wrong 2.95.
