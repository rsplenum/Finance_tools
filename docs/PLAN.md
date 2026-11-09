# The plan from Rahul's thirteen questions (PLAN1, 09-11-2026; D-BIZ-27)

A proposal until Rahul says yes, row by row. Rahul's page, with the reasons in full: the link in `docs/HANDOFF.md`. Measured on `main` at a215461, built and opened in a browser at 390 px and 1280 px.

## What is missing, in one line
The site works like four calculators; a borrower needs a guided service. Three gaps make that feeling:

1. **No guidance.** Each tool is one long page. The project report is 33 boxes and 18 phone screens once filled; the CMA's answer sits 12 screens down. There is no beginning, middle and end.
2. **The screen talks like its builder.** "Assumed until changed: 12", "No box here changes these", "Does not work yet", "not yet checked" six times on the DSCR page. The DSCR page holds 3,615 words with every part open; the report page shows 1,024 before any part is opened. Two internal codes reach the screen (D-UX-47 on the DSCR page, D-DATA-09 on the estimate).
3. **The reward is hidden.** The paper is what people come for, and it shows only at the foot, after a check step. Home shows how the site works ("worked out in your browser"), not the paper a lender will read.

Two more hold everything back: nothing is saved (closing the tab clears the work) and each tool asks the same facts again.

## The one big move
**The builder: answer on one side, watch the real paper fill in on the other.** One topic a step (the business, the cost, the loan, sales and costs, check, download), a progress line, Back and Next, the paper live beside it (on a phone, one tap to peek at it). The same questions as today (rule 17 holds); a new shape. It answers questions 1, 9, 10, 11 and 12 together: the hero film becomes the builder in use.

## The rows, in order
Sizes as in HANDOFF (S about 60 steps, M about 120, L about 200). Each is one fresh session and one thing Rahul opens.

| # | Row | Size | Rahul opens | Done when |
|---|---|---|---|---|
| 1 | **LOOSE1** Free the look from the checks before rebuilding: the taste counts (words, styles, colours, the word baselines) become a report, not a gate; money, law, the field count and accessibility stay gates. Delete `tests/zz-tmp.test.ts`. Nothing in `engine/` or its tests is touched | S, high | the PR's list of what moved | `npm run verify` green; each moved check named |
| 2 | **BUILD1** The project report as the builder, real and clickable, with the live paper; saved on the device as it is typed; the worked example a project that passes | L, Extra | the preview on a phone and a desktop | Rahul says it is better |
| 3 | **WORDS1** Plain words on all four tools and home: one short line a question; sources, dates and reasons move to one "How this is worked out" part and the paper's annex; no internal codes; every string in one file per page, ready for Hindi. Targets: words shown at most half of today's | M, high | before and after, page by page | Rahul says it reads simply |
| 4 | **BUILD2** The same builder for the DSCR, the CMA and the estimate | L, Extra | the preview | Rahul says it is better |
| 5 | **HOME2** Home sells the result: the paper in the first screen, two doors (a business owner; someone who prepares files for clients), sample papers to open, who runs it, and the hero loop (row 9) | M, Extra | the preview | Rahul says it is better |
| 6 | **TEST1** Five people use it (Rahul's two hours, `docs/design-reviews/2026-10-13-test-script.md`), the `researcher` ranks what they met, the blockers are fixed | M, high | the ranked findings | no blocker open |
| 7 | **REPORT2** The project report's paper made full (list below), with charts and the rupee sign | L, Extra | the PDF, Word and Excel | Rahul's read; every new figure worked twice |
| 8 | **FILE1** "My file": the business entered once feeds all four papers; several files for a consultant; save to a file and open it again. Sign-in and saving online come with payment | L, Extra | the preview | a file made once fills four papers |
| 9 | **HERO1** The hero loop: 15 to 20 seconds, silent, the builder in use (type, verdict, paper), a desktop cut and a phone cut | M, high | the two loops on home's preview | Rahul's yes |
| 10 | **FILMS4** Four walk-throughs of 45 to 60 seconds, one a tool, captions, in the hero's grammar; Rahul's voice if wanted | L, high | four films | Rahul's yes |
| 11 | **LAUNCH** as in `docs/ROADMAP.md` (the name, the domain, the lawyer are Rahul's, D-BIZ-25); the papers free (D-BIZ-26) | S, high | the live site | indexed |

New modules follow launch, in the order below. The 4:32 tour (VID6b) goes on a "Full demo" link as it is once Rahul says yes; its phone cut (VID6c) is parked, since row 9 gives the phone its own loop.

## The project report's paper (row 7)
Today: nine pages; cover, contents, seven sections, annex, declaration. Clean, but thin: "Promoters and the business" is four lines, pages stand half empty, there is no chart, and amounts read "Rs." because the PDF's built-in fonts have no rupee sign. To add, each from the borrower's answers or a stated assumption, never invented:

- The promoters: name, age, education, experience, share, and each one's own net worth if given.
- The unit: Udyam number, PAN, GSTIN, premises (owned or rented), power, water, licences held and applied for.
- The products, the process, the market and the competition (the AI draft, REP2, once the Worker's key is set).
- Machinery, one line each: maker, supplier, quotation, cost. Raw materials and their suppliers. People: posts, numbers, monthly pay.
- When the work happens: a month-by-month schedule to the first sale.
- Depreciation, asset by asset. Working capital: how the limit is worked. The security offered.
- What if: sales 10% lower, costs 10% higher, the rate 1% higher, each with its DSCR.
- Risks and what the promoter will do about each. Strengths and weaknesses, in the borrower's own words.
- Charts: sales and profit, DSCR by year against the target, break-even, where the money goes.
- A page of papers to attach, by scheme.

## What would make each tool more useful (question 2)
- **All four:** save and come back; one file for all four; a consultant's name and logo on the paper; a list of papers to carry, by loan; share by WhatsApp; Hindi on screen first, then other languages.
- **DSCR:** what-if rows (sales, rate, tenure); several loans side by side; last year's figures read from a statement.
- **CMA:** figures pasted or read from Excel or a Tally export; last year's CMA rolled forward for a renewal; the second method above Rs. 5 crore.
- **Estimate:** a factory shed or shop (it then fills "building" in the project report); more cities; a stage-by-stage payment plan to hand a contractor.
- **Project report:** a starting shape by trade (a bakery, a dal mill), examples marked as examples; more schemes (CGTMSE, Stand-Up India, PMFME); a month-by-month cash plan for the first year.

## What holds the launch back (question 3)
1. Nobody outside has used it. The five tests are not done and `noindex` is on. Row 6; nothing teaches more.
2. The three gaps above. Rows 2 to 5.
3. Nothing is saved. Rows 2 and 8.
4. The first example a visitor loads on the project report fails (lowest DSCR 0.82, cash runs out, the paper stamped Provisional). Row 2.
5. No reason to trust: no About page, no sample paper, no name behind it. Row 5.
6. Rahul's own: the name and its trademark search, the domain, the lawyer (D-BIZ-25). Payment does not block (D-BIZ-26).
7. The AI parts are built but off: the Worker's key is not set.
8. The films took about twenty sessions. Rows 9 and 10 replace that road.

## What the code cannot yet do (question 4)
1. Each tool keeps its answers alone, in the tab. There is no shared file, so no saving, no steps across pages, no fact carried between tools. Row 8 builds the one model.
2. The PDF, Word and Excel writers are our own and small, which is good, but the PDF has no rupee sign, no chart, no logo and no Indian script. Row 7 adds a font and charts. Hindi on paper needs text shaping: later, by printing the page through Cloudflare's browser.
3. Words sit inside the page code. Row 3 moves them to one file a page, which Hindi needs anyway.
4. No sign-in, no payment. The Worker has D1 and KV ready; both come with payment, after launch.
5. The checks pin exact words and layout (`scripts/site-check.mjs` is 2,007 lines), so every change to the look pays a toll. Row 1.
6. Films live in a second repo with 25-minute renders. Rows 9 and 10 record the real site and stay short.

## The engineering review (question 6): careful, nothing deleted in this session
**The code is lean. The weight is in the process around it.** Every source file is used; the one stray is `tests/zz-tmp.test.ts`.

- **Keep as they are:** the engine in pure TypeScript and its tests (6,633 lines guarded by 7,193); the dated data files; Astro, Preact and Tailwind on Pages; the Worker; our own document writers; the checks on money, law, the field count and accessibility; `fetcher`.
- **Change (row 1, each named in its PR):** the taste counts from gate to report; `docs/DECISIONS.md` (502 KB, 528 decisions, 329 of them on the look) split into "rules that bind today" and an archive; the film department's three gates kept for a story film only, since a product walk-through needs Rahul's yes alone.
- **Leave for DTR1:** which of the nine agents earn their keep.

## New modules (question 5), best first
Viability is a judgement to test with real users, not a measured fact.

| Module | What it gives | Who pays | Work |
|---|---|---|---|
| Stock and book-debt statement | the monthly statement a cash-credit borrower gives the bank, with the drawing power | every cash-credit borrower, monthly: a reason to come back | S to M; fits the engine |
| Net worth statement | a promoter's or guarantor's assets and liabilities, to sign | borrowers, CAs | S |
| The loan file's list and covering letter | what to carry, by loan and scheme | free; brings people in | S |
| Bank statement reader | a year's statements read into inflows, outflows, average balance, returns and EMIs | DSAs and CAs, per file | L; many bank layouts; read in the browser, so nothing leaves the device |
| The banker's-eye monthly report | reads a Tally, Zoho or Excel export and shows the business as a lender would: cash, debtors, the cycle, DSCR against the target, early warnings | owners and their CAs, by the month | L, then more; needs sign-in and stored data |
| Scheme finder | which loan or subsidy fits | free; search traffic | M; the rules need upkeep |
| Renewal pack | the yearly renewal: CMA, stock statement, provisional figures, with a reminder | cash-credit borrowers, yearly | M; mostly re-use |

**The accounting idea:** not a second Tally. Books need GST e-invoices, e-way bills, TDS, stock and payroll, each changing every year, against settled low-cost rivals, with support and data duties one owner cannot carry. Build the half that is missing in the market and fits what we have: do not keep the books, read them (the banker's-eye report above). If its users then ask to enter sales and purchases, add that. **Hosting:** Cloudflare Workers holds for all of this (D1, one database a customer; R2 for files; Queues for imports). Move to Postgres only for a true ledger. Agents call the engine as their tool; no AI works out a figure (rule 12).

## The films (questions 7 and 12)
Why they did not land: the job was never fixed. A hero film has five seconds to say what this is and whether it is for me. We made a story film, then a calculation film, then a 4:32 tour, each judged by gates and scores before Rahul saw it move.

- **Hero:** 15 to 20 seconds, silent, looping: three numbers typed, the verdict, the paper. The real site recorded (the studio already drives it), no invented world.
- **One a tool:** 45 to 60 seconds, the same grammar, captions.
- **The tour:** a "Full demo" link, as it is.
- **The loop for making them:** three five-second tests side by side on the first day; Rahul picks; then the cut. Rahul sees motion within the first 30 steps, not after a render.

## Telling an agent what you want (question 13): show, pick, point
1. Send what you like, not what you want: a link or a screen recording, a time and "this bit".
2. Never describe from nothing: the session builds two or three real versions, far apart; you pick or mix.
3. Point: a screenshot with a circle, or "0:07 too fast". No design words needed.
4. Talk while you use it: a phone screen recording with your voice is the richest note there is.
5. A page of motion words, each one moving (hold, cut, pan, zoom, ease, stagger), so "more hold, less zoom" means the same to both. Row 9 opens with it.
6. Your picks kept in one file with their pictures, read by every design session, so no session starts from nothing.

## Rahul's to decide
1. Yes to the builder as the one big move (rows 2 to 5)?
2. Five people before more polish (row 6): who and when?
3. The films: stop the long road, take rows 9 and 10?
4. Accounting: the banker's-eye report first, not books?
