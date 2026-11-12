# DEEP1: the findings and the plan (11-11-2026)

> Folded into `docs/WORKED-PAGE.md` (PLAN2, 12-11-2026; D-UX-358), the one plan a build session reads. Read here only the sections that file names.

Rahul's page: https://claude.ai/artifact/BuSQecNbGtRHGqskqEj7fU. The brief: `docs/DEEP1.md` (D-UX-357). Rahul answered §7 on 12-11-2026 (D-UX-358, D-DOC-18, D-BIZ-29, D-TECH-114): the direction stands, with the load on the borrower as its measure; §1 to §4 are the evidence.

## 1. What was looked at
- All four tools in every state of `STATES` (`scripts/design-checks.mjs`) at 360 px and 1280 px: 66 walks, counted by script (screens, words, fields, buttons, where the answer starts, charts, type sizes).
- All twelve files (PDF, Excel, Word for each tool) from the worked examples, read back with `scripts/read-doc.mjs` and JSZip; page 1 of each PDF looked at.
- Five first-visit conditions on each tool at 375 × 667 (hurry, odd input, reload, double tap, Back), and a comprehension count of each opening screen.
- Read at source and quoted word for word on the page: Laws of UX, Nielsen Norman Group (heuristics; progressive disclosure; "12 Design Recommendations for Calculator and Quiz Tools"), Luke Wroblewski, Butterick's Practical Typography, Bret Victor (Magic Ink, Explorable Explanations), Refactoring UI (the authors' site, not the book), Baymard, GOV.UK Design System, Apple's Human Interface Guidelines, the FAST Standard 02c; Apple Design Award citations 2024 to 2026; four shipped web flows, as principles.
- Not found or blocked, so not used: Webby winners and criteria, iF, Awwwards, Red Dot jury statements, a public SIDBI report template, RBI form names.
- Rahul's two links (Mollick's article, the Prebid Brief demo) are the depth of research to match, not design sources.

## 2. Measures (today's build; phone 360 × 780 unless said)
| | DSCR | CMA | Report | Estimate |
|---|---|---|---|---|
| Opens | empty, "5 questions left" | empty, "3 left" | empty, "13 left", six steps | empty, "6 left" |
| Fields on opening | 10 | 29 (129 at 1280 px) | step 1 | 24 |
| Words before the first field | 144 | 128 | | |
| Words on the opening screen; seconds to explain (mark 15) | 101; 40 | 100; 39 | 109; 42 | 116; 42 |
| Answer starts, screens down, after the example (375 × 667) | 2.6 | 1.4 | 1.0 | 0.8 |
| Download PDF, screens down | 7.7 | 8.9 | 5 taps of Next | 4.3 |
| Result state: screens; words; buttons | 7.3; 543; 24 | 9; 693; 28 | 2,137 words, 12 tables at 1280 px | 5.2; 32 buttons (plan: 822 words, 53 buttons) |
| Charts on a phone; at 1280 px | 0; 1 | 0; 1 | 0; 0 | 0; 1 |
| Tap targets under 44 px high | 22 of 38 | 20 of 66 | 16 of 35 | 29 of 47 |

Also: the DSCR page shows no figure with four of five questions answered; the report's paper pane at 1280 px has type from 9.76 px, 67 to 92% of its letters under 14 px, 13 to 18 sizes; twenty 9s in a money box are rewritten with no word, "-5" as a bank limit is not marked; a double tap on Download saves two files and says nothing; Back leaves the report from any step; a reload keeps the answers. Pages load and answer in about 0.1 s: speed is not a limit.

## 3. The limiting factors, ranked
**The screens.** 1 The page asks before it gives (rule 14 read as "show nothing until every fact is in"; the engine's input list became the page). 2 The answer is far from the questions and the download farther (each row added a block to one long page; nobody owned the page). 3 Too much at once ("never cut the working" applied to the screen; rule 17 counts boxes, not words, buttons or screens). 4 No picture (our file writers cannot draw; checks are text). 5 Four tools, four ways of working (each built in its own run of sessions; only colour and type are shared). 6 When a case fails the way forward is one button among 25, and the report's failing step has none (each fix was added to one tool as a feature). 7 Small type and targets (an A4 page shrunk into a pane). 8 Rough edges a stranger meets (our checks run our own cases).

**The value.** 1 Nothing is kept: three tools forget on closing the tab; no list of cases (the privacy promise was built as "keep nothing"). 2 One business is typed four times (the engine is shared, the pages' answers are not). 3 The reader of documents is built and switched off (the Worker's key, D-TECH-112) while the CMA asks up to 129 figures. 4 The papers are correct but plain (§4). 5 No way to hand a case to someone: only Download and Print. 6 Latin letters only on the PDF, "Rs." never "₹". 7 We cannot see where people stop: taps are recorded, never counted into "reached a figure, took the paper"; no outside person has used a tool.

**Why we fall behind.** We were our own judge (26 reviews by our own agents; green nine times and rejected by Rahul). We build from the engine outward. We work in small slices on what exists. Safety rules became the shape of pages. Process took the budget (this is the fifth plan). No feature has had to earn its place: nothing saved, paid for or counted.

## 4. The twelve files
| | DSCR | CMA | Report | Estimate |
|---|---|---|---|---|
| PDF pages | 5 | 8 | 9 | 8 |
| Page 1 | the whole working; the average and lowest year fall on page 2 | three key figures, Form I, "To look at": the best of the four | a cover of 75 words | the abstract by nine heads, the total and the cost a sq ft |
| Excel sheets; formulas | 4; 18 (Check) | 5; 52 (Check) | 10; 0 | 3; 0 |
| Word tables | 8 | 16 | 18, with a contents field | 6 |

All: Helvetica not embedded, no chart or picture, "Rs.", no bookmarks, links, title or tags in the PDF; no frozen panes, charts or input colours in Excel; Arial and no picture in Word. The figures are right and the working is whole.

## 5. The direction: the worked page
1. **It opens working**: a marked example, already answered; the user makes it theirs, the figure that moves the answer most first; a figure from the first fact, marked with what it leaves out.
2. **One reading, one picture, one next step** at the top of every tool: the finding in a sentence, the chart that shows it, what would change it. The working sits one tap below.
3. **Ink, pencil, print**: every figure is typed (ink), assumed and said so (pencil, tap to change) or worked out by the engine (print, tap to see how). Rules 12 and 14 made visible.
4. **The paper is the same reading, printed**: page 1 at a glance (what is asked, key figures, one chart, no verdict), then the working in full; a workbook an accountant can follow (FAST: inputs, workings, statement, checks; labels and units on every line; no Excel names).
5. **One business, typed once**: a case kept on the device and as a file; all four tools read it.

## 6. The rows, in order (each a whole thing begun from a blank page)
| Row | What is made | Size |
|---|---|---|
| NEW1 | The DSCR made new at its real address on a branch preview; takes in DESK1, DOOR1 and V2's LOOK1 | L, Extra |
| PAPER1 | The DSCR's three files: page 1 at a glance with a chart; "₹" through one embedded face; bookmarks and a title; Excel as a model with the engine's figures beside it, differences 0; Word in step | L, Extra |
| TEST1 | Five outside people on the new DSCR and today's other three; Rahul's two hours; never the employer bank's customers | M |
| NEW2, PAPER2 | The project report: six steps become one reading with its facts under it; then its files; take in STEPS1, REPORT2 | L, L, Extra |
| NEW3 | The CMA from the audited statement (read, shown with page and line, confirmed); the grid stays for those who type; needs the AI key | L, Extra |
| NEW4 | The estimate in the same pattern, with "fit my budget", and its files; BUILD2 and EASE1 fold into NEW2 to NEW4 | L, Extra |
| CASE1 | One case across the four tools, saved, opened and sent as a file; takes in FILE1 | L, Extra |
| PAY1 | What is free and what is paid, once Rahul decides it; the finish count from the Worker's `/api/e` | M |

IDC1 stays as it is. CHECKS2 is done inside each rebuilt page. The films and the home page wait until the tools are right.

## 7. Proposals on rules and checks (none made)
- Rule 14's reading: a provisional figure shows from the first fact, marked with what it leaves out.
- Rule 17: the ceiling stays; `npm run look` also prints, and never fails on, answers before the first figure, screens down to the answer on a phone, words on the first screen.
- D-DOC-03: page 1 carries key figures and one chart; the verdict stays on the screen. D-DOC-02: the Excel copy becomes a model with formulas; the cost is a second copy of the method, guarded by a test that the Check differences are 0 on the golden cases. The PDF embeds one face with "₹" (100 KB or more).
- A row is a whole tool, its screen then its paper. The judge is Rahul and outside people; reviews by our own agents stop being a step. No new plan until NEW1 and PAPER1 are judged.
- Rahul's: yes or no to the direction and NEW1; rule 14's reading; the papers' two changes; the AI key before NEW3; five people for TEST1; what is free and paid (the page offers: the reading free; a borrower pays for a finished paper; one who makes many pays for saved cases, their name on the paper, the reading of documents).

`docs/V2.md` holds the verdict on each part of the first pass.
