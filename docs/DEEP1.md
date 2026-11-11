# DEEP1: the deep dive, redone at the depth Rahul asked (11-11-2026)

The only brief a DEEP1 session reads first. Size L, effort Extra. D-UX-357.

## 1. What Rahul asked, in their words

"Do a deep dive of the website to identify the following and then prepare a detailed plan to overhaul our approach to solve the hardest problem, which is, how to build an Intuitive UI/UX and a world class pdf, excel or docx report for all the four tools."

- "What is the limiting factors that are holding back the UI/UX from being intuitive and really sophisticated and featureful yet simple to use and understand."
- "What are the limiting factors that prevent us from incorporating features that make user life easier and deliver greater value to the user which in turn will translate into greater value for us."
- "Take inspiration from the best books on UI/UX design and award winning designs templates."
- "Why are we falling behind, we are also trying to build a business around project finsight."
- "I am trying to build a business, I need the best UI/UX. I don't want you copying these but take inspiration and create something of our own."

## 2. Why this is a redo

UX4 (the first pass: `docs/V2.md`, D-UX-356, page https://claude.ai/artifact/BCbfRMWuQE8K9ihss8srTZ) fell short in four ways. Do not repeat them.

1. It read Rahul's two links (Mollick's article on Fable 5.2, and the Prebid Brief demo) as design references. Rahul: "What I sent you is not reference for UI/UX design." They show the **depth of research** to match. Use neither as a design source.
2. It walked only the project report end to end. Rahul asked for all four tools.
3. It opened only the report's three files. There are twelve: PDF, Excel and Word for each tool.
4. It took the books from memory and looked at no award-winning work.

The measures in `docs/V2.md` §1 stand as a baseline. Its proposal (version 2 beside version 1, the rows in §6, the rule edits in §7) is set back: DEEP1 keeps, changes or drops each part on the evidence, and says which.

## 3. What Rahul opens at the end

One page (an Artifact) that answers the four questions in plain words, with the evidence beside each answer, and the plan. In the repo: `docs/DEEP1-FINDINGS.md` (the evidence, short) and the plan's rows in `docs/HANDOFF.md`. `docs/V2.md` is rewritten or retired by what DEEP1 finds.

## 4. The work, in order

1. **Audit all four tools** (DSCR statement, CMA data, project report, construction estimate), on the branch preview or `npm run dev`: every step and every state (empty, part filled, a failing case typed as a user would, the passing worked example, an error), at 360 px and on a desktop. Count for each: questions before the first figure, screens, words, buttons, dead ends. One script walks the pages and prints only the counts; look at screens only where a count surprises.
2. **Open all twelve files.** For each: the first page (does it say the finding?), the order, tables against charts, what a lender, an accountant and the borrower each need, what is missing (no chart, no ₹ sign, `Figure.formula` unused in the Excel copy). Read `lender-documents` first.
3. **First-visit and comprehension checks** with the Better_Design tools (`check-first-visit`, `check-comprehension`, `review-dashboard-structure`, `inspect-spacing`; load with ToolSearch; they need no web hosts).
4. **Research, read from the source, never from memory.** Quote the line and give its address. Where a book is not readable online, use the author's own site and say "from the author's site, not the book".
   - Books and their authors' sites: lawsofux.com, www.nngroup.com (Norman, Nielsen), www.lukew.com (forms, mobile first), practicaltypography.com, worrydream.com (Magic Ink, explorable explanations), www.refactoringui.com, baymard.com, design-system.service.gov.uk (one thing per page), developer.apple.com (Human Interface Guidelines), m3.material.io.
   - Award-winning work: developer.apple.com (Apple Design Awards), winners.webbyawards.com, www.red-dot.org, ifdesign.com; shipped flows through Better_Design `get-inspiration`. For each piece: what makes it good, as a principle we can use. Copy no layout, words or art.
   - World-class papers, public samples only: www.sidbi.in, www.rbi.org.in, www.fast-standard.org (spreadsheet models). Never anything from Rahul's office or employer bank, not even anonymised (D-BIZ-02, rule 20).
5. **The limiting factors**, two ranked lists (the UI/UX; the features and value), each factor with its evidence from steps 1 to 4 and its root cause in how we work (our rules, checks, pipeline, session shape), not only in the code.
6. **Our own direction**: what FinSight should feel like and why, drawn from the research but ours. Describe it and sketch it on the page; the built screens are the plan's first row.
7. **The plan to overhaul the approach**: rows with sizes, what Rahul opens after each, and which rules or checks change (as a proposal: `CLAUDE.md` is edited only on Rahul's yes). One part on how value to the user becomes value to the business.

## 5. Hosts (checked 11-11-2026 with `npm run hosts`)

Open: every host named in §4, and mobbin.com, www.figma.com, dribbble.com, www.behance.net. Allowed but not answering from here (the site's side): www.awwwards.com, www.kviconline.gov.in, www.nabard.org, dcmsme.gov.in; try each once, then go on without it and say so. Any new host: rule 9 first.

## 6. Traps

- `CHROMIUM_PATH=/opt/pw-browsers/chromium` for `npm run verify -- --quick`; `git fetch origin main` first or it checks every page and runs over ten minutes.
- Figures on the page come from the engine only (rule 12); never from WebFetch (rule 8).
- Never call the tool, a page or a paper an architect (rule 21).
- `docs/HANDOFF.md` is capped at 10,240 bytes: move history to the archive.
- Read a link for why Rahul sent it, and say that reading in one line before building on it (`brief-first` §1).
- The budget is one L session. If the audit alone fills it, stop at the findings page, hand off the research and the plan as the next row, and tell Rahul.
