# The project report's patterns, for every tool

What the project report's page settled with Rahul between 12 and 16 November 2026 (NEW1 to NPV1, D-UX-360 to D-UX-375), written so the DSCR, the estimate, the CMA and any new tool can take the same answers instead of finding them again (D-UX-364: what one tool irons out carries to the others).

Read it before designing or rebuilding a tool's page. Each pattern says what it is, why (Rahul's word or the decision), where it lives, and what another tool needs to take it. These are lessons, not law: where a page can do better, set one aside in a line and say so. `docs/DESIGN.md` holds the tokens and the older shared parts; `docs/lessons/design.md` the general lessons.

## 1. The journey

**Front door: a few decisive questions, then the answer.** A blank page opens on the question the user came with ("How much loan can your project carry?") and "Start: five questions", one a screen, each read back under its box. The answers land on the answer itself; everything not asked is filled from the worked example's shape and marked in pencil (✎) until changed or confirmed, and the result stays a draft till then (rule 14). The full steps stay below the door for whoever goes straight in. *Why:* D-UX-371; the answer early, never a wall of fields. *Where:* `site/src/worked/Ask.tsx` (shared), `site/src/report/door.ts` (`DOOR`, `PENCIL`, `pencilLeft`), `tests/report-door.test.ts`. *To reuse:* a tool's own `door.ts` naming its three to five decisive facts and its pencil list; the fill-in rule worked twice in a test.

**Steps, one word each.** The progress line reads one word a step (Business, Cost, Loan, Sales, Write-up, Check); the step's heading keeps the full name. One step shows at a time, read down the page; the others are hidden, never removed, so a box keeps its answer and the question count holds. A bar at the foot holds Back and "Next: <the next step's name>". A Change link or a missing fact opens the step that holds its box. *Why:* D-UX-362 (Rahul: no sideways scroll, "sensible and reasonable tabs and guided"), D-UX-367 (six full names do not fit 328 px). *Where:* `site/src/worked/Steps.tsx` (shared with the DSCR's Professional), `.steps` and `.step-name` in `site/src/global.css`; the site check drives it with `scripts/stepped.mjs`.

**Two columns on a laptop: the questions, and a companion.** From 1024 px the questions take the wide column; beside them a sticky "Your report" panel: the answer (the largest loan, Works or not), one picture, the report's parts as links with what each still needs (✎ counted), the pages as small pictures. It keeps its place and width on every step, Check included. On a phone "See the report" opens it. The companion is never the paper itself. *Why:* D-UX-369; D-UX-374 round 3 (Rahul: the panel vanished at Check, and a rail took the left). *Where:* `site/src/report/Companion.tsx`, `companion.ts`; "The builder" in `global.css`.

**One answer bar.** At the foot, the verdict with a tick or a cross in words a borrower uses ("Can repay the full ₹X loan", "Can repay ₹Y of the ₹X loan"), the one main act ("Get the report", then "Download") and "View report sample". It folds away while the page's own verdict is in view and takes it up once scrolled past, so "Works" is never twice on a screen. The progress status shows only while a question is left. *Why:* D-UX-368 (4), D-UX-375, Rahul's word of 16-11-2026. *Where:* `BarStatus` in `site/src/report/Report.tsx`.

## 2. The check page: the answer, then the report as it will read

**The answer on top.** The largest loan the business can repay, the verdict in a word with its tick (no rule or box beside it), then what to keep ready of one's own. "Scroll to find out" shows only under a miss, and leads to the reasons and "Make it work". A cap that is not the repaying is said as itself ("the project's cost stops it"). *Why:* D-UX-372; Rahul's word of 16-11-2026; principle 1 in `docs/DESIGN.md`. *Where:* `Answer`, `Carries` in `Report.tsx`.

**"Check your figures" is the finished report as one statement.** Words at the left, the figure at the right, a hairline between lines, totals under a rule; no dotted leaders, no cards. A figure that can change is in the link colour with one thin underline, and opens into its box or its choices where it sits, under a soft tint, never a trip back to its step; the open box takes no extra height from the line. A figure still the example's carries ✎ in its line and its section. The hint says "underlined", never a colour. *Why:* D-UX-372, D-UX-374 (Rahul: the dotted leaders looked ugly), D-UX-375 (5). *Where:* `Summary`, `Line`, `InBox`, `InPick` in `site/src/report/CheckPage.tsx`; "The summary" and "Editing in place" in `global.css`. *To reuse:* any tool whose result is a document (the CMA, the estimate, the DSCR's statement): build the summary from the document's own parts, so the screen and the file never differ.

**What we assumed, as the summary's last part.** Grouped as a borrower thinks of it; each in a few words with its value, ruled like a term sheet; the reason and Change one tap away. *Why:* D-UX-363, D-UX-366 (Rahul: chips looked "idea crippled"; drawn from GOV.UK's summary list and RBI's Key Facts Statement), D-UX-374. *Where:* `Assumed` in `CheckPage.tsx`; the `brief` lines in `engine/data/report.json`.

**Confirm at the end, never a block.** "These are right" stands in the download's place and says once what it unlocks. A report that misses says so before its file, with the way back to "Make it work"; the file stays one tap away, marked provisional. *Why:* D-UX-374, D-UX-368 (6), D-DOC-03. *Where:* `Download` in `Report.tsx`.

**Focus while changing a figure, on a phone.** On a touch screen under 1024 px the rest of the page dims to 35% and the answer rides in a strip above the line being changed. No blur (it smears the figures read against, and costs a cheap phone frames); nothing dims on a desktop. *Why:* D-UX-372 (a). *Where:* "Focus by dimming" and "The answer beside what is changed" in `global.css`.

## 3. Figures, tables and pictures

**One table of the benchmark ratios.** Ratio, benchmark, your business, ✓ or ✗; it replaces any list of passes at the top. A benchmark is tapped to change in the table; on a phone a scroll wheel turns beside its box (it clicks on Android, silent on an iPhone); the row a change moved is lit for 1.6 s. *Why:* D-UX-372, D-UX-373, D-UX-375. *Where:* `Ratios`, `Wheel` in `CheckPage.tsx`; "The benchmark ratios" and "The wheel" in `global.css`. *To reuse:* the CMA's ratios and the DSCR's targets fit it as they are.

**What if: the plan, then each shock alone, then all together.** "As planned", sales 10% lower, costs 10% higher, the rate a point higher, and all three, against the same benchmarks, each with one line saying what it misses. Under each one-thing case its break point (how far it can go before a benchmark fails) and a bar of how much of that room the test takes, red once past. "The figures behind it" folds a small table (now, how far it holds) and the caveat in one line. These are our tests, never the verdict. *Why:* D-UX-372, D-UX-375 (the separate "How far" button folded in), Rahul's second look of 16-11-2026. *Where:* `engine/what-if.ts`, `engine/viable.ts`, `whatIf` in `engine/data/report.json`; `WhatIf`, `Room` in `CheckPage.tsx`.

**Returns as ruled lines.** NPV and IRR: on a phone a ruled line each, the name with the banker's term at the left and the figure at the right; three across on a wider panel; no boxes, no inset; the NPV's sign said in its name. *Why:* Rahul's second look of 16-11-2026 (the tiles of D-UX-375 (7) gave way). *Where:* `WorthTiles` in `Report.tsx`; `engine/worth.ts`.

**Quiet pictures.** Ink and grey; red only for a miss, green only in the met mark, and the words say it too. A picture is the engine's own rows on one scale, never a new figure. *Why:* D-UX-366 (Rahul: colour bars "brought down the sophistication"). *Where:* `site/src/worked/Bars.tsx`, `Levels.tsx` (shared).

## 4. Ways to mend it

**"Make it work" is the only place a way is offered.** Whole ways that pass every benchmark: those keeping the loan first, then those changing it, then the mixes; each button "Use this", used at once, its open question asked on top. Never a change that leaves a benchmark short. *Why:* D-UX-368 (2, 3); `docs/lessons/design.md` ("the engine solves; the user picks"). *Where:* `Work`, `FixIt.tsx`; `engine/viable.ts`.

**"Fine-tune it yourself": one list of three rows alike.** The sliders, the ways to repay, the benchmarks; always there, opening on the report as it stands. While a slider moves, the score pinned above the bar is a small ratio table. Three ways in sit together: Make it work, Fine-tune, "Or choose the benchmarks". *Why:* D-UX-368 (5), D-UX-372, D-UX-374, D-UX-375. *Where:* `Tune` in `Report.tsx`.

**Choices as cards, none marked best.** Each way to repay is a card: the first instalment, a small picture of its shape over the years, the interest against the dearest way; the one in use is framed and marked. *Why:* D-UX-375 (8). *Where:* `Ways`, `Shape` in `Report.tsx`. *To reuse:* any choice between plans (the estimate's finishes, a scheme).

## 5. The report and its files

**"The report", never "the paper".** On screen it is "Get the report", "See the report". *Why:* D-UX-363.

**A sample before the download.** The first three pages (cover, contents, at a glance) show beside the files; the rest are blank sheets that open with the download ("View report sample" in the bar). `?paper=open` shows the whole; PAY1 changes `paperOpen()` alone. *Why:* D-UX-370 (1), D-UX-375. *Where:* `SAMPLE`, `lockedWords` in `Companion.tsx`; `Sample` in `Report.tsx`.

**Files as cards, each saying who it is for.** The PDF for the lender first, then the Excel copy for an accountant and the Word copy to edit. *Why:* D-UX-375. *Where:* `site/src/Downloads.tsx` (shared with the DSCR); the `lender-documents` skill for what the files say.

## 6. Tried and turned down

So no tool tries them again without a new reason: a track that scrolls sideways (D-UX-361, undone by D-UX-362); a rail that takes the panel's place on a laptop (D-UX-374 round 2, undone in round 3); dotted leaders; colour bars on every figure (PIC1) and assumption chips (D-UX-365, undone by D-UX-366); NPV and IRR in boxed tiles; a separate "How far" button beside What if; "Change the benchmarks" under the ratio table; "Meets all 8 benchmarks" as a list on top; the verdict twice on one screen; blur to focus a field; two half-fixes beside the largest loan (D-UX-368 (3)).

## 7. Taking a pattern to another tool

- **Shared already** (`site/src/worked/`): `Steps`, `Ask`, `Bars`, `Levels`, and from `parts.tsx` `Reading`, `FactLine`, `Fold`, `MAIN`, `QUIET`.
- **The report's own for now** (`site/src/report/`): the door, the companion, `Summary` and its in-place boxes, `Ratios` and `Wheel`, `WhatIf` and `Room`, `Ways`, the sample and the file cards.
- The row that brings one to a second tool lifts it into `site/src/worked/` in the same PR, with its CSS named for the part, not the page, and its words passed in (each tool keeps its own `words.ts`). The report then uses the shared copy, so a later fix lands in both.
- Figures stay the engine's: a lifted part takes the tool's engine output and computes nothing (rule 12).
- The question ceiling holds (rule 17): a door asks only the tool's listed questions; the rest is pencil or sits under More options.
- Where each fits next: the DSCR (the summary as a statement, the ratio table, What if, the answer bar's tick), the CMA (the door, the summary, the ratio table with its wheel), the estimate (the door and pencil, the summary, choices as cards). Words in the estimate never call the tool an architect (rule 21).
