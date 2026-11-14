# REPORT-GRADE: the project report at consultancy grade (14-11-2026)

The design brief for the report's rows (NEW2, WRITE1, PAPER2, PAY1 in `docs/WORKED-PAGE.md` §7). A design session: nothing in the product changed. A row's session reads §1, its own parts of §3 to §7, and §8. Where a line here stands in the way of a better report, set it aside and say so in one line; only `CLAUDE.md`'s hard lines do not bend.

- Rahul's page, with the before and after: https://claude.ai/artifact/9Uq9Tf7RuRo7HnF4j1ijHN
- The specimen, 15 pages: `docs/design-reference/report-specimen/specimen.pdf` (rebuild: §3).

## 1. Rahul's words (the contract)

- "the input fields panel is narrow, the user is dealing with the input fields panel so it should be in focus."
- "analyse whether this reports view compromises the commercial operation of the website as the final report can be copied or screenshot taken and some users might get crafty this way."
- "the 'draft the words' the phrase is so odd and it is presented as optional and hidden in the last step, remember this is not just financial projections, it is also techno economic viability in some cases, a comprehensive view of the project, promoter, business plan etc. … AI agent would be required to do that, obviously we are not saying we are authority on this but user can do revision of the literature as they wish."
- "elevate it to the level of KPMGs, McKinsey and company etc. level project report."
- "The report lacks the use of charts and figures in the reports and also lacks the option of user uploaded machine or process images and photos and user provided details on the literature of the report, we have to build on user data (in a reasonable and calculated way)."
- "I would hate to find out that the rules that are meant to avoid mistakes and retakes and redo work end up stifling creativity … Identify the limiting factors and engineer a solution if it doesn't exist."

## 2. What was measured (the worked example open, 14-11-2026)

- **The screen.** At 1440 × 900 the builder is 1,344 px: the questions 448 px, the report pane 856 px (`site/src/global.css`, `.builder`). The proposed screen, measured on a drawing: questions 856 px, companion 448 px.
- **The pane is the paper.** It holds all 11 parts: 1,862 words and 12 tables, selectable. The statements paste into Excel as a table. The browser's print gives a 5-page PDF with the DSCR. On a phone "See the report" opens the whole paper. The engine and the three writers ship to the browser, so a gate placed in the page is an honour gate.
- **The words.** "Draft the words" sits in the last step and reads as optional (`site/src/report/Report.tsx`, `STEPS`).
- **The paper.** Tables and text, one flat list of blocks; no exhibit, photo, risk table or what-if case.

## 3. The specimen

`docs/design-reference/report-specimen/`: `figures.ts` runs the engine on the worked example and three what-if cases; `build.cjs` draws the paper as one web document and prints it with Chromium; `screen.cjs` draws the proposed screen in its two states.

```
S=<a scratch folder>
node_modules/.bin/esbuild docs/design-reference/report-specimen/figures.ts --bundle --platform=node --format=cjs --loader:.json=json --resolve-extensions=.ts,.tsx,.js,.json '--define:import.meta.env={}' --outfile=$S/figures.cjs --log-level=error && node $S/figures.cjs > $S/figures.json
node docs/design-reference/report-specimen/build.cjs $S/figures.json $S/spec --pages
node docs/design-reference/report-specimen/screen.cjs $S/figures.json $S/spec
```

The build prints `{"pages":15,…,"overflow":[]}`; a page that runs over is named in `overflow`. It also writes three contact sheets (`sheet-1.png` to `sheet-3.png`): look at them once whenever the paper changes.

**What it is.** A4, a 25 mm left margin for filing, Figtree and Anek, the rupee sign. Page 1 the cover with one chart; 2 the project at a glance (a rail of six key figures, the summary, a strip of what goes in, what the unit does, what comes out and what it earns, five years in brief); 3 contents, how the report is prepared, how to read it; 4 to 10 the story (the business and its promoters; products, process and market; cost and means of finance; sales, costs and profit; can the unit repay; if things go worse; risks); 11 to 13 six statements; 14 ten numbered notes that the statement lines point to; 15 the declaration and the papers attached. Eleven exhibits, each with a number, a title that says the finding, its unit, and its source.

**What it is not.** It is drawn by hand, not the product's output. The photo places are empty frames. The example's story (the partners' trade, the buyers, the six process steps, the six risks) is light fiction with no figure in it. It asks for and prints no PAN or GSTIN (rule 19): where `docs/PLAN.md`'s list names them, the paper prints a ruled blank for the promoter to fill by hand.

## 4. Figure slots: how AI words carry the engine's figures (rule 12)

Today a draft may hold no figure (D-AI-02), so its words read thin. The answer keeps rule 12 to the letter and sets that line of D-AI-02 aside, **on Rahul's yes** (§8).

- **A slot** is a name in the text: `{dscr.low}`, `{dscr.low.fy}`, `{loan}`. The writer, a person or the AI, never types a digit. The catalogue is one pure engine function (the specimen's `SLOT` in `build.cjs` is the start), each value formatted as the paper prints it.
- **`fill(text, slots)`** puts the engine's figure in each slot, and throws on an unknown slot and on any digit outside a slot. Three things are not figures: a cross-reference ("note 2", "Exhibit 10", "Section 8"), the user's own typed words, and a blank still to fill (D-AI-03).
- **A finding** ties a sentence to a test on the engine's figures: `claim(ok, sentence)`. When the test fails the sentence does not print and the title falls back to a plain label. Exhibit titles come from findings. Each finding is tested true and false. No finding is a verdict on the loan (D-DOC-03).
- **The AI sees no amount.** `worker/src/draft.ts` sends the slot names with a plain line on each, and the engine's findings as words ("above the usual level"), never a value: what leaves the device stays as D-AI-02 has it. The Worker runs `fill`'s digit check on the reply before it returns, and the page runs it again.
- **On the screen** a slot shows as its figure. The user may move or delete it, never retype its value.

Proven on the specimen: the build stopped once on a stray "Section 8" (now a cross-reference) and stops on any typed figure.

## 5. The paper as a web document, printed (PAPER2, PAY1)

Our PDF writer draws text, tables and bars, and each new look costs three writers and the screen. The specimen's way: one pure function (no DOM, no Worker API) returns the paper as HTML and CSS with inline SVG charts (`@page{size:210mm 297mm;margin:0}`, fixed pages); a browser prints it. Measured here: 15 pages in about 0.3 s, about 1 MB with the fonts. Not yet tried on Cloudflare.

- **Where it prints.** Live: the Worker sends the HTML to Cloudflare Browser Run's `/pdf` (its own words: "The /pdf endpoint instructs the browser to generate a PDF of a webpage or custom HTML"; free "Browser hours: 10 minutes per day" and Quick Actions "1 every 10 seconds"; paid "10 hours per month, then $0.09 per additional hour"; the body up to 50 MB; read 14-11-2026, pages dated 21-04-2026 and 14-10-2026). The token is a Worker secret (rule 19). The row measures the time and the cost there before it leans on them.
- **In dev, in CI and for the row's review:** the same function printed by Playwright, as `build.cjs` does. The Worker has no preview on a branch, so this is how Rahul sees the row's paper before a merge.
- **The builder stays off the site.** It lives where only the Worker and the scripts import it, and a test finds none of it in the built site's JavaScript. This is what keeps the paid paper out of the browser.
- **New parts,** one description each, drawn the same on screen and on paper: an exhibit, a key-figure rail, a photo, a note reference, a chart.
- **Word and Excel keep our writers.** Word carries the write-up to edit, with each chart as a picture made from the same SVG. Excel holds the figures as numbers, no formula (D-DOC-21).
- **The look check.** A contact sheet of every page, looked at once per change to the paper, and a test that no page runs over. Text checks still guard every figure.
- **Before the layout is fixed,** read at source what could not be read today: SEBI's listing rules, Schedule V (the page did not open), and the integrated-reporting framework's own text (IFRS's page gave only the six capitals: "financial, manufactured, intellectual, human, social and relationship, and natural"). Until then the specimen's order (story first, statements and notes behind, a highlights page, risks beside the answer to each) rests on general knowledge of annual reports.
- **If Rahul says no to the server (§8):** the builder ships to the browser and the browser's own print makes the PDF; the gate is then an honour gate, and that is said plainly.

## 6. The screen: a shop window, not the workshop (NEW2)

- **On a desktop the questions hold about two-thirds.** A step line of six across the top, larger type, the engine's read-back under each answer.
- **The side is a companion, never the paper:** the reading (lowest and average DSCR beside the usual level), one chart (cash against the payment due), the report's outline with what each section still needs, and the pages as small pictures. This is "a size that reads": the reading and the chart, not a shrunk A4 sheet.
- **Before the download:** page 1 is real and marked "Sample"; the other pages are drawn with no text in the page, so there is nothing to select, copy or print. **After:** the PDF and its pictures. Until PAY1 every paper is free (D-BIZ-26, D-BIZ-29), so every user sees the open state; the locked state is built and can be seen for review.
- **A phone:** the same companion as the sheet behind "See the report".
- **Honest limits, to say to Rahul and never hide:** a buyer can pass on their own PDF, which names their business on every page; the engine runs in the browser, so a programmer can work the statements out again. The design, the exhibits and the write-up stay behind the gate.

## 7. The write-up (WRITE1)

- **A step of its own,** fifth of six: The business, The cost, The loan, Sales and costs, **The write-up**, **Check and download**.
- **Who writes what.** The engine writes what reads the figures (the summary's findings, cost and finance, sales and profit, repayment, if things go worse), as findings with slots. The AI drafts what describes (the business and its promoters; products, process and market; the risks and what the promoters will do), from the answers already given, with WORDS1's blanks for what only the borrower knows (D-AI-03). The user reads, changes and confirms each section; an unconfirmed section stays out of the paper, and the check step lists what is left.
- **Nothing required** (rule 17: the count does not rise; Rahul's to confirm). Offered under each section: the user's own notes, deeper detail where the loan needs it (raw materials, power and water, people, the timetable), and photos.
- **Photos** (the promoters, the site, the machines, the product): chosen or taken on the device, decoded, made smaller (the long edge about 1,600 px) and saved again as JPEG, which drops the location data, then kept in IndexedDB with a caption. Nothing is sent until the download, and then only on Rahul's yes (§8). The privacy page's words change with it: a draft for the lawyer.
- **No market figure of ours** (rule 13): the market is the promoter's words; sourced public figures are a later row.
- **Names.** The paper is the promoters' project report, prepared by them with FinSight's help on the words, with no opinion on the loan. Never a "TEV study": lenders use that name for an independent consultant's report. Never an architect (rule 21).

## 8. Waits on Rahul

1. **May the paper be made on our server at the download?** The answers and photos travel for the seconds it takes and nothing is kept; the reading stays on the device. Recommended: yes. Without it the gate is an honour gate.
2. **May AI words carry the engine's figures through slots?** Recommended: yes.
3. When their rows come: the price and what one payment covers; the name "The write-up"; that its step has no required question.

## 9. What held us back, and the answer to each

| Limit | Where it came from | Answer |
|---|---|---|
| AI words hold no figure | Rule 12 as built (D-AI-02) | Figure slots (§4) |
| A new look costs three writers and the screen | The "no library" lesson; our PDF writer | The paper as a web document, printed (§5) |
| A report is a flat list of blocks | `site/src/doc/doc.ts` | Exhibit, rail, photo, note reference, chart |
| Titles are labels | Habit; fear of a wrong sentence | Findings with `claim()` and a plain fallback |
| No one looks at the paper | "Text assertions over screenshots" | A contact sheet per change, and the overflow test |
| Few questions, a full report | Rule 17 | The write-up asks nothing; the AI drafts from what is typed |
| Photos do not fit the store | The browser's small store | Smaller on the device, into IndexedDB |
| No market figures | Rule 13 | The promoter's words; none invented |
| The Worker has no branch preview | Cloudflare's shape | One pure builder, printed by Playwright for review |
| No picture of "good" to build toward | Each row began from what existed | The specimen |
