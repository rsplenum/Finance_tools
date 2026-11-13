# The one plan: the worked page (PLAN2, 12-11-2026; D-UX-358)

The only plan a build session reads. It takes the best of the five plans before it (§6) and Rahul's answers of 12-11-2026 (§1). A row's session reads §1 to §5, its own row in §7, §8 and §9, and nothing else here. Where a line here stands in the way of a better page, set it aside and say so in one line; only `CLAUDE.md`'s hard lines do not bend.

## 1. Rahul's words (the contract)

On DEEP1's page, 12-11-2026:
- "It's a good direction but I have been asking to reduce cognitive load, asking the most high value inputs from the user and asking less of the user and doing more ourself."
- "the UI/UX is as much the product as the report."
- "The report lacks a lot, a lot. Most findings are just what I have been asking of claude for all this while. Let's see what it produces now."
- Rule 14: "decide in favour of user ease of understanding and reduction of cognitive load."
- The papers' two changes: "First lets see how it works then we will decide to keep it or tweak it."
- The test: "I will test it."
- "The reports are paid but not till final launch."
- "I have gemini key right now but I will get anthropic key later."
- "let's not dump the earlier four plans, let's take what's best and move."

So the measure of every row is one thing: **how little a borrower has to read, know, type and decide before they hold a right answer and a paper a lender takes.** The hard work is ours, never theirs ("so difficult to be simple", D-TECH-75).

## 2. What "better" means: the load a page puts on a person

Today (DEEP1, phone): every tool opens empty and asks before it gives; the answer starts 0.8 to 2.6 screens down and the download 4 to 9; 100 or more words on the opening screen; 10 to 29 fields showing; 24 to 32 buttons with the result; no chart; half the tap targets under 44 px.

The bar for every rebuilt tool, on a phone of 375 × 667 with the example open:

| Measure | Bar |
|---|---|
| Answers typed before a figure shows | none (the example); one for a figure about their own business |
| The reading, the picture and the next step | all on the first screen, no scroll |
| Words on the first screen | 60 or fewer; a stranger can say what the page is for in 15 seconds |
| Fields showing on opening | none: one fact opens at a time |
| Main buttons on a screen | one |
| The paper | one tap from anywhere on the page |
| Above "See the working" | two screens or fewer, in any state |
| Tap targets; type | 44 px or more; text 16 px, nothing under 14 px |
| A picture | one on the phone, the same one in each file |

These are aims, printed by `npm run look`, never a gate (D-TECH-110). Rahul's eye overrules every one of them. They are here so that a session cannot call a page simpler without showing it.

## 3. Ask less, do more

**The ladder.** For every fact a tool needs, take the first rung that holds. Only the last one costs the borrower anything.
1. **Work it out**: the engine can derive it from what is already known.
2. **Carry it**: it was given in another tool (the case, §7 CASE1).
3. **Read it**: it is in a paper the borrower already has (a statement, a quotation). The AI places each figure with its page and line, the engine cross-checks, the borrower confirms (rule 12). Needs READ1.
4. **Assume it, in pencil**: a stated assumption with its reason and source, in `engine/data/defaults.json` or `engine/data/architect.json` (rules 13, 14), shown on the page and changed in one tap.
5. **Ask it**: in the order of how much the answer moves the result. Let the engine say the order: move each input a tenth on the example and rank by the change in the reading.

A question the result needs is never dropped to look simple (D-UX-225): it moves down the ladder, to pencil.

**Ink, pencil, print.** Every figure on a screen is one of three, told apart by more than colour, each with a spoken name:
- **Ink**: the borrower typed or confirmed it.
- **Pencil**: not theirs yet. Either the example's (must be replaced or confirmed before the paper is Complete) or a stated assumption (may stand; its reason one tap away). Tap to change.
- **Print**: the engine worked it out. Tap to see how.

**Rule 14 as Rahul read it (D-UX-358).** A figure shows from the first fact, marked with what it leaves out: "Yours: the profit. Still the example's: the loan, the rate, the years." The result stays provisional, and any file made from it says so, until nothing asked stands on the example. An example's value is never passed off as the borrower's.

**Rule 17 holds.** The ceiling on what a default path asks does not rise; the ladder only lowers what is asked. The site check keeps its count.

## 4. The page: every tool, the same five parts

**Changed by Rahul on 12-11-2026 (D-UX-359), after trying NEW1 on a phone:** the page opens on what the tool answers in a line and Start, the example one quiet tap away; the questions come one a screen over the whole screen (`site/src/worked/Ask.tsx`), then the reading, the picture and the next step; Undo and Start over stand beside the reading. **Then (D-UX-360):** a choice of two ways in, Simple and Professional, with the same eight questions. Simple ends on the reading and lists what it filled in, each with Why and Change. Professional ends on every field, filled in, beside the reading. A switch on the report moves between them. The years against the target are shown once, in the chart. Parts 1 and 5 below read in that light; the rest stands.

1. **It opens working.** A fictional example that passes, marked "Example" on the page, on every figure that is its own and on any file made from it. One button: "Use your own figures".
2. **The reading.** One sentence, the largest thing on the screen, plain words first and the banker's term second (UX2 rule 5). The cash comes first (D-POL-12): what the business can carry, beside what is asked. Three states: it carries it; it carries Rs. … of the Rs. … asked; as it stands it cannot. Never a bare ratio, never "3 of 8".
3. **The picture.** One chart that shows the reading (the DSCR: cash for the loan against the repayments, year by year, the tightest year marked). Amounts by length on one scale, each also as a figure; a reference line never crosses the figures read against it (`docs/lessons/design.md`).
4. **The next step.** One button. When it falls short: the engine's whole options that work, each as was → becomes, applied in one tap and undone in one tap; the borrower picks, never combines (D-UX-346). When it works: the paper.
5. **The facts, in one line.** The few facts read as a sentence with each figure tappable ("A firm earning Rs. … a year wants Rs. … at …% over … years"), ink or pencil. A tap opens one fact alone: a large field, a slider where the fact has a range, one plain hint. The reading and the picture stay in view above it and move as it moves (cause and effect together). "Use your own figures" walks the facts one at a time in the ladder's order; the borrower may stop after any one and still hold a marked figure.

**Changed on 13-11-2026 (D-UX-362, D-UX-363, D-UX-364), after Rahul's phone notes on NEW1d:** on screen the paper is **the report** and the working **How it adds up**; what was filled in is grouped cards in plain words, a tap for the reason; Professional's fields are guided steps, one at a time, with the project report's rail; what one tool irons out goes to every tool.

Under these, closed until tapped: **See the working** (the statement that adds up, the schedule, every print figure's how), **What we assumed** (each pencil with its reason and source), **For professionals** (the method's choices, year-by-year figures, the lender's tests: everything today's page can do stays reachable here). Nothing a tool can do today is lost; it moves out of the borrower's path.

Also, for every tool: said once (what one place shows, no other in view repeats); every red line has a button; no internal code or builder's word on a screen; a number arrives whole; motion only to show a cause, none under reduced motion; light and dark; the desktop is its own layout (the reading and the picture hold the left, the facts and the next step the right, the working below), not a stretched phone; answers are kept on the device as they are typed, under a shape with a version and a step that brings an older one forward (so a new field never drops a draft); a reload, Back, a double tap on Download and an odd input ("-5", twenty 9s) each do the sensible thing and say so.

The screen is begun from a blank file. A tool's model and document code (`model.ts`, `levers.ts`, `document.ts`) are reused where they serve the new page and cut where they only served the old layout; no layout or markup is carried over from the old screen. The look is made by eye on this real screen, ours (D-TECH-75): take no page's look, ours of yesterday included.

## 5. The paper: the same reading, printed

Rahul's word: build both changes, then they keep or tweak (D-DOC-18, on trial; D-DOC-03 stands). The Excel half is settled: no formulas, because the reports are the business and a sheet that works its figures out is a calculator for other reports (D-DOC-21; D-DOC-02 stands).
- **PDF.** Page 1 at a glance: who asks and for what, the key figures beside the lender's level (no verdict: the lender decides, D-DOC-03), the one chart, the status (Complete, or Provisional with what is missing, or Example). Then the working whole, as now ("the presentation needs working not curtailing the calculation", D-DOC-04). "₹" through one embedded face with tabular figures; bookmarks, a title, links from page 1 to each part.
- **Excel.** The same reading as the PDF, for an accountant to check with their own formulas: page 1's figures, the statement, the sensitivity analysis, the basis, the repayment schedule; a label and a unit on every line; frozen headings; the engine's figures as numbers in lakh and crore formats, and not one formula (D-DOC-21).
- **Word.** The same reading and chart, heading styles, "₹", for a consultant to edit.
- Made on the device, loaded only at the Download tap. "Extremely professional and polished, no childish or unnecessary items" (D-DOC-17).
- The papers are free until the final launch and paid from then (D-BIZ-26, D-BIZ-29): keep the download behind one function so PAY1 can put the gate there.

## 6. The best of the five plans

| Plan | Kept, and where | Left |
|---|---|---|
| PLAN1, 09-11 (`docs/PLAN.md`) | The paper is the reward, in reach on every screen (§4); plain words, one words file a page, ready for Hindi (§8); saved as typed (§4); the report paper's full list (PAPER2); home sells the result, the films and the new modules after the tools | Six fixed steps as a page's shape: steps hide the answer |
| UX2, 10-11 (`docs/UX-OVERHAUL.md`) | Its nine rules (§2 there) whole; the solver that finds whole plans, built (`engine/solve.ts`) | RESULT1 and STEPS1 as rows of their own: NEW2 takes them in |
| UX3, 10-11 (`docs/CAPACITY-FIRST.md`) | The cash sets the loan: "can carry Rs. … of Rs. … asked" leads (§4); one limit, one lever, then the bank's other checks; the engine answers before a screen is drawn; handles on the result; starting shapes by trade (NEW2); a saved shape with a version; IDC1 | DESK1 and DOOR1 as rows: NEW1 and NEW2 take them in |
| UX4, 11-11 (`docs/V2.md`) | Opens alive; an answer in the first minute; one chart kit for the screen and the three files; checks on words and roles; light bookkeeping | `/v2/` beside the old site; named cells; a look picked as a row of its own |
| DEEP1, 11-11 (`docs/DEEP1-FINDINGS.md`) | The measures (§2 here); ink, pencil, print; the paper as the same reading; one case; a row is a whole tool | Five outside people now (Rahul tests); reviews by our own agents as a step |

## 7. The rows, in order

One fresh session each, on its own branch. Every row is a whole thing Rahul opens on a phone beside the live site; done when Rahul says it is better.

| # | Row | Size | Rahul opens |
|---|---|---|---|
| 1 | **NEW1** The DSCR, made new | L, Extra | `/dscr/` on the branch preview |
| 2 | **PAPER1** The DSCR's three files | L, Extra | the PDF, Excel and Word copies |
| 3 | **READ1** The Worker reads and drafts with the Gemini key | M, high | the CMA's "Read a statement" and the report's "Draft the words", working |
| 4 | **NEW2** The project report's screen | L, Extra | `/project-report/` on the preview |
| 5 | **IDC1**, then **PAPER2** the report's files | M; L, Extra | the cost page each way; the three files |
| 6 | **NEW3** The CMA from the audited statement | L, Extra | `/cma/` on the preview |
| 7 | **NEW4** The estimate and its files | L, Extra | `/estimate/` on the preview |
| 8 | **CASE1** One business, typed once | L, Extra | a case made in one tool filling the others |
| 9 | **PAY1** What is paid, at the final launch | M, high | the gate, on the preview |

Home, the films and the new modules wait until the tools are right. CHECKS2 is done inside each rebuilt page. Rahul tests each row as it lands; five outside people when Rahul chooses (never the employer bank's customers, rule 20).

### NEW1: the DSCR
- **Asks, in the ladder's order:** this year's profit first, then the loan wanted, the years, the rate, who the borrower is; growth, the month drawn and the rest stay pencil as `frontDoor` in `site/src/dscr/model.ts` assumes them today. The ceiling stays the site check's (8 at the front door: Rahul's seven and depreciation).
- **Does itself:** the reading in its three states from `maxLoanAmount` and `planStatement`; when short, the whole options from `dscrOptions` (a longer term, more of your own money, a mix) with `applyDscrPlan` and `undoDscrPlan`; a slider's stops from `follow` and `stopAt` (`engine/dscr-linked.ts`). No new engine figure should be needed; if one is, it is an engine function with a second computation first.
- **The example:** a fictional case that passes, round figures (`docs/GOLDEN-CASES.md`, `site/src/dscr/home-case.ts`).
- **Today's three files still download** from the new page, the Example mark on them when they are the example's; PAPER1 remakes them.
- **The pattern must fit the other three:** build the shared parts (the reading, the fact line and its sheet, ink, pencil and print, the chart, the folds) where NEW2 to NEW4 can take them, and only as far as the DSCR needs.
- **If the budget runs short:** the first screen whole and right before the folds; the folds may carry today's content plainly; say what is left as the next row.
- Traps: home embeds the DSCR's intro (`tests/home-story.test.ts`); the site check's `/dscr/` lines move to labels and roles, and a money, law or ceiling line is never dropped; grep `docs/GOTCHAS.md` for `dscr/`.

### PAPER1: the DSCR's three files
- As §5. First a short bake-off on page 1 (20 steps at most): our own writer grown (`site/src/doc/pdf.ts`: an embedded TrueType face, vector bars, outlines) against a library loaded at the tap. Take whichever makes the better page; the `lender-documents` skill's "no library" is a lesson, not a line.
- The face: open licence, with "₹" and tabular figures, taken from an npm package (no host to allow), its licence beside it. The screen moves from "Rs." to "₹" in the same row, never mixed.
- `Doc` (`site/src/doc/doc.ts`) gains a chart block and a key-figures block that the three writers and the screen all draw from one description.
- No formula anywhere: the writer keeps no way to write one, and a test opens every Excel copy (DSCR and CMA, each golden case) and finds none, every figure the engine's.
- Read back with `scripts/read-doc.mjs`; look at page 1 as a picture once.

### READ1: the Worker speaks Gemini
- `worker/src/read.ts` and `worker/src/draft.ts` call Anthropic only. Add the Gemini path behind one small function, chosen by which secret is set (`GEMINI_API_KEY`, `ANTHROPIC_API_KEY`); the model's name is a var in `worker/wrangler.jsonc`, read from Google's own page that day, never from memory (`npm run hosts -- ai.google.dev` first). The same schema, caps and engine cross-check (`engine/read.ts`); the AI works out nothing (rule 12).
- Tests with the call stubbed; Rahul tries `tests/fixtures/statement-k.pdf` on the preview.
- The privacy page names who reads the lines: its words change with the provider (a draft for the lawyer).

### NEW2: the project report's screen
- **Asks first:** what the business makes or sells, the project's cost and the loan wanted, a year's sales and what is left of it. From those: "can carry Rs. … of Rs. … asked" (`engine/capacity.ts` `carry`), the rest standing on the example or on the trade's shape, in pencil.
- **Does itself:** the closers and FIX1's whole plans as the next step (`engine/solve.ts`); "The bank will also look at" as one short list, third; starting shapes by trade from public model profiles, each figure with its source, only where the profile is in `docs/inbox/` (else the example's shape); the words drafted once READ1 is in. The remaining answers are walked by topic in the ladder's order, each topic 1.5 phone screens or fewer.
- The paper's page 1 shows beside the answers at a size that reads (never an A4 sheet shrunk into a pane).
- Read `docs/CAPACITY-FIRST.md` §1, §4, §5.3, §7 and `docs/UX-OVERHAUL.md` §2, §4.2, §4.3, §8. If it will not fit one L, the reading and the next step come first and the walk is the next row.

### PAPER2, NEW3, NEW4, CASE1, PAY1
- **PAPER2:** §5 for the report, with the list in `docs/PLAN.md` ("The project report's paper") and what-if rows, each an engine function worked twice. IDC1 runs before it, as its row in `docs/HANDOFF.md` says.
- **NEW3:** the first figure from one fact (the sales expected, by the turnover method in `engine/data/cma.json`); then "Give us the audited statement": read, shown with page and line, cross-checked, confirmed; the years ahead start as the engine's projection on stated assumptions, in pencil; the grid stays under For professionals for those who type. Rahul's, before it is built: may a year be confirmed with one tap once the engine's checks tie, each figure still shown with its page and line (D-UX-44 says each figure is confirmed)?
- **NEW4:** the same five parts; "fit my budget" as whole options from an engine function; the cost by head as the picture; its files as §5. Never "architect" (rule 21).
- **CASE1:** the device's list of cases; a case saved, opened and sent as a file; every tool reads it; the preparer's name on the paper.
- **PAY1:** the gate at the download, at the final launch; Rahul sets the price; the finish count from the Worker's `/api/e`.

## 8. How a build session works

1. **Read:** `CLAUDE.md`, `docs/HANDOFF.md`, this file as its first line says, `docs/lessons/rahul.md` and `docs/lessons/design.md`, the `brief-first` skill; `lender-documents` for a paper row; `money-maths-checks` only if `engine/` is touched. Grep `docs/GOTCHAS.md` and `docs/DECISIONS.md`; never read them whole.
2. **Write the screen's words first:** the reading in each state, the fact line, the one button, in the tool's words file. If the first screen needs more than 60 words, the design is not done.
3. **Engine before screen:** a screen shows only what a function in `engine/` returns (rule 12). A new figure gets its test and its second computation before any markup (rule 15).
4. **Phone first**, at 375 × 667, then the desktop, then dark.
5. **Show early:** when the first screen works, about a third of the way in, push, and give Rahul the preview's address; go on without waiting.
6. **Look at it.** Open the real page and scroll it; at most six pictures a row, two of them for Rahul (the phone, before and after). Run `npm run look` on the page before and after, and put §2's table, today against new, in the pull request.
7. **Checks guard money, law, privacy, accessibility, the question ceiling and flows that break; never taste** (rule 18). Lines for the old screen go with it in the same commit; a rebuilt page's lines find things by label and role. `npm run verify -- --quick` once at the end (`CHROMIUM_PATH=/opt/pw-browsers/chromium`; `git fetch origin main` first).
8. **No review by our own agents as a step.** Rahul is the judge. The `writer` may be asked for words, the `critic` once for accessibility.
9. **Bookkeeping is five lines:** the state line and the next row in `docs/HANDOFF.md`, the cost line, a decision only for what Rahul decided or a choice on money, law or the product's shape, a lesson or a trap only if there is one.
10. **Tell Rahul:** what to open, five things to try on a phone, the budget against the actual, the next row's starter prompt. Plain, short words.

Refuse these, each of which has been rejected before: the old page with new paint; one more block on a long page; a list of tradeoffs in place of the bold version; a count offered as proof that it is better; a question dropped, or a missing fact filled silently, to look simple; a borrower asked to combine levers; red with no button; the same thing said twice in view; a builder's word or a code on a screen; a new plan. When simple for the user and simple to build pull apart, the user wins.

## 9. The lines that bite here

Rule 12: no AI works out a figure; a read figure carries its page and line and waits for the borrower's yes. Rule 13: every level and rate from a dated data file, never typed into code (the 1.25 is `ratios.json`'s and the borrower may change it). Rule 14 as §3 reads it. Rule 15: fictional cases and public worked examples only, each figure worked twice; nothing from Rahul's office. Rule 19: no PAN, GSTIN or key in the repo; the key is a Worker secret (D-TECH-112). Rule 20: nothing aimed at the employer bank's customers. Rule 21: never "architect".

## 10. Rahul's

- Test each row on a phone and say "better", or what is not.
- The Gemini key into the Worker as the secret `GEMINI_API_KEY` before READ1 (`docs/OWNER.md`, "The AI key"); the Anthropic key when it comes.
- Keep or tweak the papers' two changes, after PAPER1.
- NEW3's one question above. The price, before PAY1.
