# REFORM1 ledger: every rule read, and what becomes of it

Rahul's ask (11-11-2026): the rules were meant as lessons and have become red tape. Read all of them, cut, merge, and make them cheap to fetch and free to bend. This file is the working record: what was read, whole, and the verdict on each part. It is evidence, not a rule; no session needs to read it.

## 1. Read whole (ticked as read)

- [x] `CLAUDE.md` (22 rules, 7.2 KB)
- [x] `docs/HANDOFF.md`, `docs/DEEP1.md`
- [x] `docs/LESSONS-CARRIED.md` (92 lines)
- [x] `docs/LESSONS.md` (57 rows)
- [x] `docs/DESIGN-LESSONS.md` (11 open)
- [x] Skills: `brief-first`, `lessons`, `money-maths-checks`, `lender-documents`, `gear-up`, `gear-down`
- [x] Hooks: `cost-guard`, `session-guard`, `film-gate`; `.claude/settings.json`
- [x] `scripts/verify.mjs`, `doc-sizes.mjs`, `doc-refs.mjs`, `review-dates.mjs`; `.github/workflows/ci.yml`
- [x] `docs/GOTCHAS.md` lines 1 to 135
- [x] `docs/GOTCHAS.md` lines 136 to 201
- [x] `docs/DECISIONS.md`, all 555 entries: POL, UX, TECH, DOC, DATA, AI, BIZ (§6 has a verdict for each)
- [x] `docs/RULES.md` (generated) and `scripts/rules-doc.mjs`; `docs/DESIGN.md`, `DESIGN-SITE.md`, `DESIGN-MATHS.md`, `DESIGN-MOTION.md`, `LOAD-MEASURE.md`
- [x] Agents: `critic`, `designer`, `writer`, `researcher`, `fetcher`
- [x] `portable/`: `README.md`, `pack.mjs`, `working-practice/SKILL.md`, `working-practice/carried.md`
- [x] The check scripts: `site-check.mjs` (2,086 lines), `forbidden-checks.mjs`, `design-checks.mjs`, `load-measure.mjs`, `site-pages.mjs`, `stepped.mjs` and the small tools (§12)
- [x] `docs/rows/README.md`

**Not read whole, said plainly:**
- The pack's copies of `brief-first`, `money-maths-checks` and `lender-documents`: only the lines that differ from the project's copies, which were read whole (§13).
- The two baseline files (`load-baseline.json`, the design baseline): data, read by their keys.
- Plans and history, which hold no rules: `docs/PROJECT.md`, `PRODUCT.md`, `docs/OWNER.md`, `docs/PLAN.md`, `docs/CAPACITY-FIRST.md`, `docs/UX-OVERHAUL.md`, `docs/V2.md`, `docs/ROADMAP.md`, `docs/HANDOFF-ARCHIVE.md`; `docs/LIBRARY.md` (generated).
- The `impeccable` plugin's agents and skill: not this repo's.
- The video studio's repo: out of this session's reach.

## 2. What each file is, and what it costs

| File | Size | Read when | Finding |
|---|---|---|---|
| `CLAUDE.md` | 7.2 KB | every step | 22 rules citing about 40 decision IDs. Rules 6, 7, 8, 9, 10 are session bookkeeping. Rule 2 says lessons never bind; rules 17 and 18 then bind by check. |
| `docs/HANDOFF.md` | 10 KB | every session, whole | State line is one 2,400-character paragraph of history. "End of every session" is five bookkeeping steps touching six files and an online tracker. |
| `docs/LESSONS-CARRIED.md` | 8 KB | §1 and §8 every session | From another project (Sept). About half is already in `CLAUDE.md` or a skill word for word. |
| `docs/LESSONS.md` | 28 KB | by the `lessons` skill | 57 rows. Each row also lives in one to three other places ("Kept in"). |
| `docs/GOTCHAS.md` | 85 KB | grep | The right shape (traps by file, never read whole). But about 30 of its lines are traps of the checks themselves, and several repeat. |
| `docs/DECISIONS.md` | 532 KB | grep, by ID | 555 entries, about 950 characters each. Header says "Never re-decide". |
| Hooks | 4 run | every prompt, every tool call, every Bash, every session start and stop | Cost guard warns on every result over 8k tokens. |
| `npm run verify` | 12 checks | every change | About 15 minutes in full; the site check is a 187 KB script. |

## 3. Lessons files: verdict by row

### `docs/LESSONS-CARRIED.md`
- §1 How the owner works: keep as five lines (low tokens, draft PR, plain words, lists are examples, creativity expected). "One feature per session" and "handoff every session" become guidance, not law.
- §2 Product principles: these are the hard lines (engine only, never default a fact, dated data). Already in `CLAUDE.md` 12 to 14 and `money-maths-checks`. Keep once.
- §3 Calculation reliability: keep, in `money-maths-checks` only.
- §4 UI lessons: technical traps (drafts, half-typed values, mobile). Keep as lessons in the design guide; already enforced by tests.
- §5 Engineering workflow: "one line in DECISIONS, regenerated docs, every change" is the source of the bookkeeping. Loosen.
- §6 AI use, §7 Environment: traps; fold into `GOTCHAS` by grep key.
- §8 Mistakes table: six rows, all restated elsewhere. Merge into the lessons.

### `docs/LESSONS.md` (57 rows), grouped
- **Money and sources (12 rows)**: 04-10 L2 bundles, plural listing, tax basis, search summary is a lead, fill only missing, tax on its part, recount a figure, illustrative pages, worked figure travels with its case, derived price, chart judged from figures. All already in `money-maths-checks`. Keep there only.
- **Tests that test nothing (5 rows)**: fixture exists, collect every offender, checks that find nothing, a new measure on a known page, a count that moves is a bug. Keep as one short lesson set "Checks".
- **Session cost and tooling (14 rows)**: compaction sizes, cost guard, `pgrep`, chained verify, effort names, hooks, agent loading, token ratio. Mostly environment facts that expire. Fold to `GOTCHAS`; retire the rules built on them where the measured gain is gone.
- **What Rahul sees (12 rows)**: UX2b "I don't even notice", AG3 "a trailer not a saga", HOME1 "redundancies", HOME1c "spruced up the Hollywood hacker", VID3c "powerpoint", 03-11 "they have become your chains", CD1 "illustrates a calculation", UX2 "mind bender", UX4 "not reference". These are the valuable ones: nine times checks passed and Rahul rejected the result. One lesson: **passing checks is not the result**.
- **Process of sessions (6 rows)**: notes and folds, rule copies, one row at a time, where work lives. Mostly superseded by D-TECH-70. Retire.
- **Film (5 rows)**: belong to the studio repo (D-TECH-102). Move out.
- **Wording (3 rows)**: a status names what it counts; notice triggers; name a setting as Rahul's screen does. Keep in the writing guide.

### `docs/DESIGN-LESSONS.md`
11 "proposed" lessons, none decided since 13-10-2026 to 22-10-2026. A queue nobody empties. Six are accessibility facts (keep as lessons in the design guide), five are proposals for more checks (drop the proposals).

## 4. `docs/GOTCHAS.md` lines 1 to 135

- Engine and data traps (lines 5 to 20, 50, 52, 58, 64 to 67, 110, 111, 113): real, tied to files, keep.
- Environment traps (21 to 41, 47 to 49, 51, 53, 57, 60 to 63, 78, 108, 109, 115, 117, 118, 125): keep, merge repeats.
- **Traps of the checks themselves** (6, 45, 59, 72 to 77, 82, 87 to 93, 102, 104 to 107, 116, 129 to 131): about 30 lines. Each is the cost of a check, paid by a later session. They shrink when the checks shrink.
- Session-process traps (23, 128, 132, 133): retire with the row machinery, keep "check `git log origin/<branch>` before a reset".
- Repeats: `pkill -f` kills its own shell (30, 53, 71, 94); vitest `--root /` (53, 57); Playwright imported by path (39, 77, 118); Chromium and the proxy's certificate (48, 49, 77, 117); verify takes 15 minutes (95, and `LESSONS`); LibreOffice (31, and `lender-documents`).

## 5. `docs/GOTCHAS.md` lines 136 to 201

- Engine and page traps (136 to 142, 144 to 148, 150 to 159, 195 to 201): real, keep.
- **The video studio's traps (172 to 193)**: films, sound, the tour. They belong in rsplenum/video-studio (D-TECH-102). Move out.
- More traps of the checks themselves (145, 148, 149, 152 to 154, 165, 166, 194 to 196).
- Process traps (143 a rule read from an open PR, 160 tracker rows by id, 169 to 171 git fetch and worktree, 185, 186): retire with the row machinery.
- Line 194 (LOOSE1, D-TECH-110) already splits the checks into `look` (reports) and `violations` (gates). The reform builds on it.

## 6. `docs/DECISIONS.md`: verdict by entry

Classes: **H** hard line (money, law, privacy). **F** product fact: how the code is; the code and its tests are the record, nobody needs to read the entry to work. **L** lesson: informs, bends. **P** process rule. **S** superseded or dead. **Hist** history only.

### POL (15 entries, lines 10 to 24): all read
All fifteen are how the engine works out money, most in Rahul's own words (D-POL-05, 06, 07, 10, 12, 13, 15). Class F with an H core: they are the method, not red tape. Keep whole, as the method record, fetched by engine file. D-POL-03 is research (Hist). D-POL-04's offer is superseded by D-UX-07 and D-UX-08 (the engine part stands).

### UX 01 to 33 (lines 28 to 60): all read
- F, keep as record only: 04 (two decimals, four near the target), 05, 06, 07, 08 (stated assumptions), 09, 13, 14, 15, 18 (the engine as the architect, the library), 20, 21, 22, 23, 25, 27, 28, 29, 32, 33.
- H inside F: 18's last part (never "architect" on screen, Architects Act s. 37).
- S: 02 (placeholder), 03 (start questions, replaced by 08 and 15), 11 (replaced by 15), 16 (replaced by 17), 17 (replaced by 18 and 21), 19 (level 5 renamed by 20), 24 and 26 (plans; 24 paused by 31).
- Hist: 30 (another AI's plan triaged).
- L: 10 and 12 (a default path asks only Rahul's listed inputs: a ceiling on questions; done is Rahul trying it), 31 (3D is a product of its own; the estimate teaches a lay person; "luxury does not mean one configuration").
- **Rules that bind by check, born here**: 01 (mobile, dark, contrast, titles: stays a gate, it is "works without breaking"), 15 and 21 (field counts fail the check: the gate rule 17 names), 32 (a 400-word budget fails the check: taste, should report, not gate).

### UX 34 to 49 and 153 to 158 (lines 62 to 83): all read
(The file is not in ID order: D-UX-153 follows D-UX-49.)
- F: 34, 35, 36, 37, 38, 41, 45, 46 (126 fields counted by the check), 47, 49 (33 default fields counted), 157 (answers in sessionStorage).
- H inside F: 44 and 48 (the AI only points at figures, never works one out; nothing counts until the borrower ticks it; a file leaves the device only when the borrower picks the AI option; lines never logged), 158 (uploaded documents are never saved).
- L, worth keeping as a line each: 40 (levels never sold as paid places; a curator, never scraping), 155 ("why ours" is shown from what the document has, never claimed; no "accepted by all banks").
- S or Hist: 39 (answered, built in 41), 42 (an order of work, overtaken by D-BIZ-20, 24, 28), 43 (a proposal, answered by 44).
- Film (153, 154, 156): the studio's, move out with D-TECH-102.

### UX 159 to 206 (lines 84 to 131): all read
- F: 159, 160 (a draft holds inputs, never results: the engine-only line again), 161, 162, 172, 174 (holiday plus repayment, Rahul's), 175 (every lever bounded, in dated data), 176, 177, 178, 179 to 181, 182 to 185, 186, 187 to 191, 193 to 201, 203, 204, 206.
- L, in Rahul's words, the kind worth keeping: **167** ("sophistication is earned, not dressed up": calm hierarchy, microcopy with consequences, complexity disclosed, visuals that read as proof, never makes the user feel stupid), 166 (show, never claim; motion only when it reveals something), 170 (interaction coherence before visual ambition), 194 (nothing called sanctioned before it is), 200 (plain words on the page, the lender's words in the document).
- S: 163 (replaced by 172), 165, 168 (a film choice), 171 (a note that four IDs were never recorded), 170's part 3 ("no new visual work before UXR5": expired).
- **Entries that exist only because a check's number moved**: 169, 192, 202, 205 (word budgets and load baselines raised by hand). Four log lines, each a session's time, to record a count. Pure cost of the checks.
- Checks born here: 164 and 173 (the reload check: "works without breaking", keep as a gate).

### UX 207 to 247 (lines 132 to 172): all read
- F: 208 to 211, 213, 214, 216, 228 to 236, 238 to 243, 245, 246, 247.
- **Commit messages logged as decisions**: 217 to 224 (eight CSS polish lines: a pill's width, a line's wrap). The git log already holds them. Class F, and the pattern to stop: a change is not a decision.
- Count bookkeeping again: 207, 212, and parts of 233, 238, 240, 241 ("load raised by hand").
- L, Rahul's words: **225** (correctness first; a question the report needs goes behind a stated assumption, never dropped), **237** ("avoid avoidable repetition: it clutters"), 228 ("the sliders are a means of showing the tradeoffs … through their own hands"), 229 (several plans with their cost, none marked best), 247 (with every ratio passing, cash can still run out: say it apart).
- S: 215 (replaced by 216), 226 (replaced by 228). Hist: 227 (a proposal), 244 (a review's findings).

### UX 248 to 275 (lines 173 to 200): all read
- F: 248, 253, 262 to 275 (the report's Make it work, the CMA's years, links to boxes, the estimate's loading).
- Hist: 249, 250, 252 (a mock-up and its rounds, built as 262 and 265), 254 (a queue order).
- S: 260 (undone in part by 261), 182 (retired by 264).
- L, Rahul's words: **251** ("the less we ask a user how to fix it, the better … give options … the user will choose"), **255** (a video is a video; a scene fits one phone screen; "the fault was the design's, which measured width and never height"), **259** (too fast to follow: reading time), **261** ("don't kill the cool stuff … the whole point of video is coolness … this video lacks emotions"; a tradeoff between plain and cool goes to cool).
- 260 then 261 is the pattern in small: a rule taken too far ("everything must have a purpose") stripped the life out, and Rahul put it back the same day.
- Film (254, 256, 257, 258): home's scenes; the facts stay with the code, the rule 258 (a scene held to the phone's screen) is a "works without breaking" gate.
- Count bookkeeping inside: 253, 257, 259, 265, 271.

### UX 276 to 311 (lines 201 to 236): all read
- F: 276 (just one part: kitchen, bathrooms, painting).
- **The two that matter most, Rahul's words, already the spirit of this reform: 307** ("I ask you to make things better and you come up with a minor iterative attempt with a list of tradeoffs like what we have is so sacred") **and 309** ("Lessons learned supposed to make you better, they have become your chains"; "build what you originally wanted, even if that means throwing away what it has built"). They head the new lessons.
- **Thirty film entries in a row, 277 to 306** (a script's corrections, a clock, a grammar F1 to F8, type sizes, a beat count), each logged "as recommended, accepted", and then set aside by Rahul on 03-11 (307 to 309: "powerpoint presentation slides with sound effects"; "three sessions built machinery"). Class S or Hist, and the studio's by D-TECH-102. This is the log's failure in one block: thirty careful rules and the result was rejected.
- L from them: 293 (the gap was direction, composition and rhythm, not machinery), 295 (a number arrives whole, never counts up through figures the engine never made: the engine-only line in a film).
- S: 283 (replaced by 289), 287 (revised by 292), 308 (replaced by 309). Film facts for the studio: 310, 311.

### UX 312 to 327 (lines 237 to 252): all read
- All film, the studio's by D-TECH-102. Hist: 316 to 320 (rounds of a film that was then replaced), 321, 324, 326 (replaced by 327).
- P, the studio's: 313 (a department of seven agents and three gates), 315 (twelve questions).
- L, Rahul's words: 312 ("you have just stretched the same one line idea"; a rule applied to a chart is not a concept), 314 ("silence is better than inappropriate sound"), 322 ("the script is the soul, the visual is the body"), 323 (choosing one idea never cancels another), **325 ("the rules are a floor, not the film")**, 327 (say what each feature does for the user; the lender may be our user too, never pitch against them).

### TECH 01 to 18 (lines 256 to 273): all read
- F, the build's shape: 01, 02 (Cloudflare from day one: `CLAUDE.md` rule 22), 04 to 07, 09 to 13, 16, 17.
- H inside F: 08, 15, 18 (every figure worked twice and withheld on a difference; the simulation). Keep, in `money-maths-checks`.
- P: 03 (read `LESSONS-CARRIED` §1 and §8 every session: retire the every-session read), 14 (skills that load by relevance: the right way to fetch, keep).

### TECH 19 to 31 and 66 to 75 (lines 275 to 297): all read
(The file is not in ID order: TECH 32 to 65 sit at lines 401 to 551, mixed with UX 49 to 152.)
- F with H inside (the second computation of each new figure; the code and its tests are the record): 19, 20, 21, 22, 24.
- P, keep short: 23 (compaction window; **the original intent, in the entry itself: "A lesson only stops repeated work or a repeated mistake, never a rule on how to design or what to try"**), 26 (gears), 29 (one deliverable, a budget), 68 (quick verify between steps, CI decides), 70 (one row at a time).
- P, loosen: 27 (the portable pack is checked word for word against `LESSONS.md` by verify: a check on paperwork), 30 (the tracker: a second record of the handoff, written by hand each session), 74 ("the checks are tripwires; the owner's try is the gate" is the lesson; its last clause, "each thing it finds becomes a check in the same PR", is the ratchet that grew the checks: drop the clause).
- L, head of the lessons: **75** (the lens, Rahul's words). Its reading says "it decides how, never what is allowed: the repo's rules and the law stand": that line is where lessons became stone. Reform: the law and the money stand; the rest informs.
- Hist: 25, 28 (measurements). F: 31 (payments, waiting), 71, 72 (Impeccable). Studio's: 67, 73.
- S: 66, 69 (both replaced by 70).

### TECH 76 to 107 (lines 298 to 329): all read
- F, this repo: 76 (the estimate's working as its own chunk), 77 (how speed is measured: "a tool, not a check"), 79 (the load baseline's raise and lower), 84 (a film on the site keeps its rendered data; CI fails when stale).
- P, keep: **98** (plain words, recommend, don't survey: rules 1 and 3).
- P, loosen: 85 and 96 (a script that checks the paths and numbers a row names before it starts: a check on our own paperwork, born of rows written far ahead of the code).
- Studio's (25 of the 32 entries; they belong in rsplenum/video-studio by D-TECH-102 and cost this repo's readers for nothing): 80 to 83, 86 to 95, 97, 99 to 102, 105 to 107. Inside them, H: 83 (each number on screen names its engine field and must equal it). L: 106 (Rahul: a film builds a mental model, shows a chosen few, leaves the viewer curious; never simplistic), and its own finding of why our films fell short: "rules setting the look".
- Hist: 78, 81, 82, 89, 103, 104 (how branches were stacked, which PR merged first).

### TECH 108 to 112, DOC 01 to 17, DATA 01 to 08 (lines 330 to 367): all read
- Studio's: 108. L, studio: **109 (Rahul: "update the gate rules so they enable rather than add friction")**: the same reform Rahul now asks for the whole repo, already made once for the films.
- P, keep as the base of the reform: **110** (LOOSE1: the look reports, money, law, the field count and accessibility gate), **111** (the engine answers before a screen is drawn; design rows are looked at; check lines hold on words, roles and figures, not ids; its own measure: 184 of the site check's 2,075 lines hang on the report's ids, "342 UX decisions and 26 reviews with no outside user").
- H: 112 (a key is a Worker secret, never in chat: rule 19).
- DOC, all F with Rahul's words; the record of what each paper holds, fetched by `lender-documents` and by file: 01 (S in part: 03, 05, 07 amend it), 02, 04 (**Rahul: "the presentation needs working not curtailing the calculation"**), 06, 07 (**"I want no compromises in calculations"**), 08 (S in part: 09), 10 to 14 (Check sheets of formulas beside the engine's numbers), 15, 16, 17 (**"no childish or unnecessary items"**; it sets earlier entries aside "for this document only": proof that entries bend when Rahul says so).
- H inside DOC: no figure is computed in a document (01, 15); a test fails on any figure the page did not show.
- DATA 01 to 08: F. 01 (`docs/RULES.md` is generated and CI fails on drift: keep the generation, it is 71 KB nobody should read whole), 02, 03 (rates and assumptions as dated data: rule 13, H), 04 to 08 (the library's contents at a date: Hist; the data files are the record).

### DATA 09 to 19 and 28 to 31, AI 01, BIZ 01 to 06 (lines 368 to 397): all read
- Hist (what a round of price checking found, item by item; the data files carry each value with its source, date and `checked`): DATA 09, 10, 11, 14, 15, 16, 17, 18. Lessons inside, already in `lender-documents` or the data: a page that calls its price illustrative is a lead, not a check; a rate on another basis is never forced.
- F: DATA 12 (Rahul: "err on the side of creativity"), 13, 28 (stepped instalment, marked illustrative), 29, 30, 31 (verified values with their paragraphs: keep with the data file, `engine/data/report.json` and `ratios.json`).
- P, keep: DATA 19 (review-by dates on data files; a real guard on stale rates).
- H: AI 01 (AI drafts words from the user's own inputs, marked a draft, never a figure, never a claim a new business cannot have).
- **H, the law, keep whole and first: BIZ 01 (the employer condition), BIZ 02 (nothing from the office, ever)**, BIZ 03 (brand names under rules: `docs/TRADEMARKS.md` is the record), 04 and 05 (the notice where a brand shows; Rahul: "where the related word or info not displayed what is the need for disclaimer": a lesson against needless warnings).
- F, waiting on Rahul: BIZ 06 (a name to check; superseded in part by later BIZ entries on the name).

### BIZ 07 to 09, TECH 32 to 35b, UX 49b to 57 (lines 398 to 415): all read
- H, law and privacy: BIZ 07 (policy pages; Rahul's details shown as little as the law needs; no PAN or GSTIN in the public repo), BIZ 08's five tests for an SEO page (Google's spam rules; no per-bank formats by BIZ 01).
- F: BIZ 08 (the plan itself: `docs/SEO-PLAN.md` is the record), BIZ 09 (Finline as a benchmark: what a rival gets wrong; "not a source for any rule or rate").
- P: TECH 32 (the cost guard: keep the break-even and stale-cache lines, they save money; the "big tool result" warning fires on every honest read of a long file and is noise when Rahul asks for a file to be read whole: raise its bar or make it once a session), TECH 35 and 35b (name blocked hosts before the work: rule 9, keep; Rahul: "you try to access them and you fail every time and you waste my tokens").
- F with H inside (worked twice): TECH 33.
- Hist: TECH 34 (an outside SWOT triaged; what was left and why is still useful: grep by topic).
- F, the "Make it viable" family, Rahul's design (**"be audacious and intuitive … what makes this project unviable and what levers we can pull"**; "the borrower makes most compromises, not the lender"): UX 50, 52 to 57. D-TECH-111 says these modules (`viable`, `plan`) retire as CAP1's screens replace them: S when they go.
- H in data: UX 51 (the benchmark ratios, Rahul's, unverified, naming no bank), UX 49b and 49c (PMEGP "not yet checked" and "paused": dated facts in `engine/data/report.json`, take out when the new guideline is read).

### DATA 20 to 21, TECH 36 to 39, UX 58 to 73 (lines 416 to 437): all read
- H in data: DATA 20, 21 (tax rates checked against the Act's own pages; **"A figure counts only from the page itself"**, after an AI summary named sections the pages did not hold: the root of rule 8's "never a figure from WebFetch").
- H, privacy: TECH 37 (interaction data never holds what is typed; no third-party analytics), TECH 38 (as built; a test fails if a typed figure reaches a batch).
- P: TECH 36 (the roadmap; Rahul: "Avoid the avoidable. No compromise on quality"), TECH 39 (answers stand: rule 10; meant to stop re-examining settled answers, it now reads as "never revisit": keep the saving, say that Rahul or new evidence reopens anything).
- **Where the red tape began, 13-10-2026**: UX 58, 59 (the design team, a ratchet "which may fall, never grow"), 61 ("each count may only shrink"; capped memory files, "each rule with its check"), 62, 63 (the load measure as a gate: "a count that rose fails"; "a count that fell fails until the baseline is lowered"), 66, 67 (**a forbidden list F1 to F16 "the design team is held to"**, at Rahul's ask, after "I don't even notice any improvements in design"). Each was reasonable alone. Together they made every design change a negotiation with counts. LOOSE1 (TECH 110) has already moved them from gates to reports: these seven are S as gates, L as measures.
- L, Rahul's words, for the head of the design lessons: **71 ("Our goal is to enable the user to gather what they need quickly … not that we spoon feed them each figure one by one"; "beauty has a separate utility … beauty should be married with function")**, 68 ("we need to make it our own not a replica"; "no compromise on the look and feel of the site. The limits can be reasonably adapted"), 69 (fusion of two looks into our own language), 70 ("take only the design elements that bring our point across"), 73 ("Don't compromise on quality and creativity and aesthetics while trimming").
- F: 64 (S by 65, then by 66), 65 (each home card says what the tool is and what ours gives; never "free", never "nothing leaves your browser": H, a truthful claim), 72 (AG2 as built), 60 (reviews; Hist).

### UX 74 to 93, TECH 40 to 46 (lines 438 to 464): all read
- L, Rahul's words: **76 ("Major design overreach spotted: … a glimpse of what is our offering like a trailer not a saga"; "Don't be verbose in the glimpse"; no cursive font)**, 77 ("How does movie directors stuff the entire movie of 90 minutes in a 2 minute trailor … figutr that out. We were developing a really good bespoke style"), 78 ("hiding it behind tabs defeats the whole purpose"), 83 ("it's coming along nicely": home at AG3c is the one design Rahul praised: it came from Rahul's direct notes and a look built by eye, not from counts), 91 (dark mode: results are a dark sheet, never white).
- F, as built: 74, 75 (S by 76), 79, 80, 81, 82, 84, 86, 87, 88 (one word for one idea everywhere; "Provisional" only when figures may change), 89, 92, 93 (H inside: second computation).
- **Waste pattern, again**: 84, 86, 87, 89, 90 each spend a third of their text on "load counts raised: words shown 912 → 917 …". 90 exists only because "the roadmap's bar of no higher load counts needed the owner's word": Rahul was asked to approve a counter. This is what LOOSE1 ended; none of it needs reading again. Hist.
- P/Hist: 85, TECH 42 (roadmap redrawn), 46.
- F, traps of the tooling, already in GOTCHAS: TECH 40, 41 (CI annotations), 43 (axe from the page top), 44, 45 (S: network set back at RC1).

### UX 94 to 111, TECH 47 to 53, DATA 22 to 23 (lines 465 to 491): all read
- F, as built (code and tests are the record): UX 94, 96, 97, 99 (words: "the default benchmark ratios", the word lender leaves the benchmarks), 100, 101, 104, 106 (**Rahul's find, "the big shadow that appears suddenly", missed by the review and by every check**), 107, 108, 109.
- L: UX 98 (Rahul: every element says something, or goes), 103 (voice on web headings only, documents formal; proof by method, never invented quotes: the last is H, a truthful claim), 105 (six first principles for a financial tool: the answer where the eye rests; cause and effect together; units and status on every figure; precision to match certainty; statements as tables that add up; space to the data: good, short, worth keeping at the head of the tool-page lessons), **110 (Rahul: "Never trade completeness or accuracy for speed: the edge is all three together")**, 111 (Rahul: "I am not in favour of dropping the 'make it viable' feature").
- S as a gate, L as a measure: UX 95 (the design as a model; "Extra codes … may only fall").
- H in data, with paragraphs and files (`docs/inbox/`): DATA 22 (PMEGP against KVIC's guideline), 23 (Mudra and CGFMU, CGTMSE's fee slabs): keep with `engine/data/report.json`; nobody reads them unless touching schemes.
- F, traps and deploy facts: TECH 47 (a board cleared in an effect lost a fast tap: a real bug the flaky check found), 48 to 50 (the Worker: `docs/CLOUDFLARE.md` is the record), 51 (downloads timed on a slow phone; the in-app browser note: a real "works without breaking" guard, keep).
- P: TECH 53 (bulk reading may go to Gemini, checked by quote). Hist: TECH 52, UX 102.

### BIZ 10 to 17, DATA 24, UX 112 to 126, AI 02 (lines 492 to 516): all read
- F, the business record (`docs/PROJECT.md`, `docs/ROADMAP.md` hold it): BIZ 10, 11 (whom we serve first, what is free and what is paid, the price, ads never inside a tool or a document, the languages and markets after launch: Rahul's decisions, keep in PROJECT.md, not as rules). L inside 11: truth over speed as the edge.
- Hist (the record is `docs/NAME-SEARCH.md` and `docs/OWNER.md`): BIZ 12, 13, 14, 15 (the name), BIZ 16 (REV1; its one live point, ads against "We set no cookies", is H: a claim on the page must stay true), BIZ 17 (COMP1's row; L in Rahul's words: "ultimately it's our custom engineering and features that is going to increase our throughput and acquire customers").
- H in data and tests: DATA 24 (Mudra's levels, the guarantee fees by CGFMU's FAQ and CGTMSE's CGS-I, worked bill by bill): `engine/data/report.json`, `engine/guarantee.ts`, `tests/mudra.test.ts` are the record. Its last sentence is a load count raised by hand: waste.
- H: AI 02 (the report's words as a draft: never an amount to the AI; a sentence with a figure the user did not type is dropped; the words count only once the borrower ticks they are true; nothing sent is logged). F for the model, effort and caps (Worker settings).
- F: UX 112, 113 (simple and expert modes; "Simple mode asks whether collateral is offered; it does not assume it" is rule 14 at work). Both carry load counts raised by hand.
- L, Rahul's words: UX 114 ("I don't want replication on homepage"), **116 ("We created them for thinking innovative design and they produced a home page design full of redundancies and visual noise. Need to review their worth and work")**, **122 ("you just spruced up the Hollywood hacker … I thought you will give me a new thing to compare"; "why are we compromising quality? How large is the size 160kb with 5g": quality is not cut to fit a cap; motion is judged by smoothness on a cheap phone, not kilobytes)**, 124 (each quality shown by what the paper really has, never claimed in words; "ready to take to your lender", never "accepted" or a bank's name: the last is H), 126 (a scene shows only what the document has: H, truthful).
- Hist (home's intros, each replaced by the next): UX 115, 117, 118, 119, 120, 121 (rejected), 123, 125. Evidence for the reform: 117 and 119 log counts and caps moved by hand "with the owner's leave"; 120 widens F9 from 5 s to 10 s by decision. A check that needs Rahul's leave to let a design change is the red tape.

### UX 127 to 129, 135, 150 to 152, TECH 54 to 64, BIZ 18 to 20, DATA 25 to 27 (lines 517 to 540): all read
- Evidence of the red tape, Hist otherwise: UX 127 (checks rewritten for one scene), 128 (**three checks taught to skip `[data-scene]` so a look Rahul chose could ship; an attribute renamed only because F10 misread it**), 129 and 151 (counts raised, each with its own decision line), TECH 64 (a baseline written by hand "on the owner's word" because the tool refused). Rahul was asked for leave to pass our own checks.
- F, config and code are the record: TECH 55, 60 (CI), TECH 54, 61 (the Worker hardened; `worker/test/sec1.test.ts`), TECH 63 (`--quick` checks only touched pages: a cost saver, keep), UX 150 (the DSCR's "Next:" and "What to check next"), UX 152 (lakh and crore where a reader skims, full rupees where a lender reads; a rounded figure says "about"; worked twice: the last two are H, in `tests/indian-numbering.test.ts`).
- H in code and tests: DATA 25, 26 (how sure each figure is: four marks; **only a session that read the primary page promotes a value**; a mark never changes a figure; label, never block), 27 (the DSCR statement keeps DOC 05: Rahul's word).
- P, kept by a hook, nothing to read: TECH 62 (one session per row; Rahul: "dont let this mess happen again").
- Studio, not this repo's rules: TECH 56, 57, 58, 59 (H inside: other people's work is not republished; nothing aimed at the employer bank's customers).
- Hist: BIZ 18 (the outside audit; kept in `docs/design-reviews/`), 19, 20 (the Monday timeline, off since BIZ 24), UX 135.

### UX 136 to 144, 328 to 331, BIZ 21 to 28, TECH 65 (lines 541 to 562): all read
- Hist (home's four scenes, since rebuilt): UX 136 to 141. Waste: 142 (a check taught to leave out every scene), 143 (counts written by hand). L, Rahul's words in 144 and BIZ 21: "no compromise on design"; "no compromise on quality and accuracy & precision".
- F, code and tests are the record: TECH 65 (the site map), BIZ 22 (**the privacy page, each line tied to code and held by `tests/privacy.test.ts`: H, a claim kept true by a test, not by memory: the model for every hard line**).
- Standing direction, Rahul's (belongs in `docs/PROJECT.md`, three lines): BIZ 24 ("we have a prototype, not the final product": the UI and UX come first, every timeline is off), 25 ("So domain, legal, terms are on me. Rest is on you": the root of "ask only what is truly Rahul's"), 26 (the downloads are free at launch), 28 (the plan stands, `docs/PLAN.md`). L in 27: "the UI/UX is as much the product as the reports"; the finding "four calculators where a borrower needs a guided service".
- Hist: BIZ 21 (the deadline), 23 (the SWOT's rows), 27 (superseded by 28).
- Studio (films): UX 328, 329, 331 Hist. L, Rahul's taste for every film and page, in 330: "Do it tastefully and in a subtle way that lands"; an effect stays only if the viewer would miss it, not notice it.

### UX 332 to 357 (lines 563 to 588): all read. `docs/DECISIONS.md` is now read whole, lines 1 to 588
- Studio (films), Hist here: UX 332, 334, 335, 336, 337, 338, 339. L, Rahul's words in 332: "You just made a very shallow video"; a figure in a caption is read off the page, never typed into a script (H: a figure on screen is the engine's).
- L, Rahul's words: 333 ("extremely professional and polished, no childish or unnecessary items"), 346 ("The 'make it work' doesn't work on project report": **the engine solves, whole plans that pass; the borrower picks, never combines**), 347 ("a long long vertical scroll and so jam packed … a mind bender": one job a screen, say it once, every red line has a button), 349 ("the cost is killing me": the engine by tests before a browser opens, one script walks the page), 350 ("How can we ignore the ICR for first part year…": **Rahul's money rule, H in the engine and tests**), 353 (the borrower's question is how much the business can carry; "a page is welded to its checks and its saved shape; no outside user has tried it"), 357 (the two links show depth of research; take principles, make our own).
- F, code and tests are the record: 340 (the builder), 341 (answers saved on the device; the privacy page says so: H part), 342 (the worked example that passes), 343 (a real fault found only when the paper was shown live), 344, 345 (plain words, one "How this is worked out" a page; codes never reach the screen), 348, 351, 352 (Fix it for me), 354, 355 (capacity first on the page).
- S: 356 (UX4, set back by 357); 347's ring and 348 as first written (given way by 353, 354).
- UX 130 to 134 and 145 to 149: checked by grep below.
- UX 130 to 134 and 145 to 149 do not exist (gaps in the numbering; grep finds no such line). 555 entries in all.

## 7. The design team's files (read whole: the five agents, `docs/DESIGN.md`, `docs/DESIGN-SITE.md`)

- **`.claude/agents/designer.md`: the line that shuts creativity out, in so many words: "You have no taste of your own: the look comes from written rules, measured checks and the owner's judgement, so you work only from those."** Also "A choice no rule covers is a proposal: put it to the caller with two or three options" (against CLAUDE.md rule 3: recommend, don't survey) and "the site check counts them and fails if the count grows" (stale since LOOSE1). Verdict: rewrite. The designer starts from the result (rule 2), uses the lessons as what was learned, and is held only to the hard lines (figures from the engine, the field count, accessibility, the law).
- `critic.md`: sound as a method (evidence for each finding; ranks; never edits). Its step 1, "Read `docs/DESIGN.md` whole", and its ranking "breaks a principle of DESIGN.md" make the doc a rulebook. Verdict: keep; point it at what the user meets (the answer first, a way forward from every red line, readable at 360 px) and at accessibility; taste findings are notes for Rahul, not blockers.
- `writer.md`: "judged by the load measure … A count that rose is undone or explained": a count as the judge. Verdict: keep the plain-words lessons (the owner's words first; sentences of 25 words or fewer; an error says what is wrong and how to put it right); the count reports.
- `researcher.md`, `fetcher.md`: narrow tools, sound. Keep as they are (the fetcher's "never work out a figure", "public pages only" are the hard lines at work).
- `docs/DESIGN.md` (12 KB, read whole by designer and critic each time): opens "What every page is held to".
  - Principles 1 to 12, each with the friction it removes and its evidence: **keep as lessons** (the best-written part of the corpus). 6 (one accent, one filled button) and 11 are taste: they bend.
  - F1 to F19, "FinSight's rules": F14 (nothing from another site), F16 (nothing of another's own: H, licence), F19 (Tab order, WCAG) and F9's "nothing moves under reduced motion" (WCAG) stay as checks. F1 to F8, F10 to F13, F15, F17: the look as built on one day (pills, no bordered box, section padding, one shadow): **L at most; several already had to be bent by decision (UX 119, 120, 128, 142)**. F13, F15's figure and F18 are stale.
  - Tokens, shared parts: F (the code is the record); the accessibility lines in them (44 px targets, focus kept, 3:1 edges, 16 px in fields) stay as checks.
  - "Acceptable and unacceptable", "How the team works": merge into the agents.
- `docs/DESIGN-SITE.md` (6 KB): the tool pages as built before the builder (BUILD1, D-UX-340); parts are stale ("the story with its trailers", "Side by side from 1024 px" as the only layout). Verdict: F and Hist; archive. A page's layout is in its code.
- `docs/DESIGN-MATHS.md` (6 KB): the theory behind the counts (reading time, Hick, Fitts, one code a meaning, Cleveland and McGill, Shannon). Its own §5 says "the aims are hypotheses until the owner's tests back them"; no test has. Its sources are "cited from the literature and not reopened". Verdict: L, short: keep §3 (an amount by position or length and always also as a figure in words; hue says only a kind; no pies) and §4 (say only what changed); the "Extra codes … lets it only fall" gate is S (LOOSE1).
- `docs/DESIGN-MOTION.md` (4 KB): five moves and their rules, then four paragraphs of home's history (HOME1b, 1d, 1e, 1f). Verdict: the accessibility lines are H as checks (nothing flashes more than three times a second; nothing moves under reduced motion; the page reads whole); "runs once, never loops", "within 5 s" are L (already bent twice); the history is Hist.

## 8. The portable pack (read whole: `portable/README.md`, `portable/pack.mjs`; the skills next)
- `pack.mjs --check` runs in every `npm run verify`: it fails when a lesson marked `any` in `docs/LESSONS.md` is not in the pack **word for word**, or a pack file names this project. So one lesson must be kept identical in two files by hand, and a reworded lesson breaks the build. Verdict: P, bookkeeping. Keep the pack and `npm run pack-skills`; take `--check` out of `verify` (run it only when packing).

## 9. `docs/LOAD-MEASURE.md` (18 KB, read whole)
- The paper that began the counts (13-10-2026). Its own words: "Each count may only shrink"; "The counts are proxies: they cannot say whether a page is clear. People decide that"; §7.1 "A ratchet also blocks good additions: a Clear all button adds a control. *Recommend:* all twelve … so every rise is a decision someone wrote down." **That recommendation, mine, is the source of the "load counts raised" entries all through `docs/DECISIONS.md`.** §6 promised to drop any count the five tests did not back; the tests never ran, so twelve unproved counts stood as gates for four weeks, until LOOSE1.
- Its sources are marked [S]: "read only through search results, because their hosts are blocked". The design rules that bound every page rest on research nobody here read. DEEP1 reads them from the source.
- Verdict: S as a gate (done by LOOSE1; §5 already says so). Keep `npm run load` as a report a session may ask for. Keep one gate, the questions count (rule 17), but without "a line in `docs/DECISIONS.md` naming why" and the `--raise … <D-id>` ceremony: the count lives in one data file, and Rahul's yes in the PR is the record. Archive the paper; three lessons go to the design topic: the answer in view of the control that changes it; words before the first question; a figure that changes out of sight.

## 10. `portable/skills/working-practice/SKILL.md` (10 KB, read whole; loads at the start of every session in every project)
- Already carries the reform's spirit in its own lines: "lessons and past decisions inform, never bind"; "Bold first … what exists is a draft, not a rule"; "Propose your own ideas and criticise your own work".
- And the lines that undo it: under the lens, **"It decides how, never what is allowed: the repo's rules and the law stand"** (the lens is told it cannot touch a rule); "Once given, an answer is final"; "every change passes it" (verify); Records: "one line per decision … so later sessions do not decide it again"; "never read a large file … whole" (a cost rule that taught sessions to skim: the fault Rahul named on 11-11-2026).
- Verdict: rewrite the four lines. The lens decides how and may set a lesson aside, saying so in a line; only the hard lines and the law stand. "An answer is final" becomes "do not reopen a settled answer unasked; reopen it when it blocks the result or Rahul asks". Records: decisions are a dated log to grep, not a law book. Reading: grep first, but read whole what the task is about.
- Tokens section (7 bullets), Effort (4), Claude Code on the web (5): P. Sound, but the break-even formula, the 2.3 characters a token and the settings line are set-up facts, not practice: move to a reference file read when setting up a repo.

## 11. `portable/skills/working-practice/carried.md` (14.5 KB, 46 rows, read whole)
- Every row is a third copy: the rule is in `docs/LESSONS.md` (marked `any`), in this table, and in a skill's body, and `pack.mjs --check` holds the copies equal word for word. Verdict: one home. The pack keeps the skill bodies; `carried.md` becomes the pack's only lesson list; `docs/LESSONS.md` keeps only this project's lessons; the word-for-word check goes.
- By kind: 13 are small traps of a tool or a test (keep, grep only: `textContent`, a plural listing, GST on part of a rate, the AAC peak, a check chained twice); 9 are about tokens and sessions (merge to four lines); 8 are Rahul's corrections on design and briefs (**these are the lessons that matter: "spruced up", "lessons have become your chains", "PowerPoint style", every check passed and Rahul saw slides, the two links**: head of the new lessons); the rest are money and sources (stay with `money-maths-checks`).
- The row of 03-10-2026 ("Give a page's answer a word budget that the site check fails on") is the first ratchet, and is S since LOOSE1.

## 12. The check scripts, read whole: what each line guards

Classes: **W** works without breaking (a user is stopped or misled), **A** accessibility (WCAG, a law in many places and a real user stopped), **M** money, **Law**, **C** the page contract (rule 17's field count), **T** taste (the look on one day), **Self** exists to keep a check or a doc in step with another.

### `scripts/forbidden-checks.mjs` (291 lines)
| Lines | Check | Class | Verdict |
|---|---|---|---|
| 34–37 | F1 fonts are Figtree and Anek | T | already report only (LOOSE1); delete: a new look changes it on day one |
| 38–39 | F17 only paper casts a shadow | T | delete |
| 41–44 | F2 h1 at 40/64 px, h2 at 26/40 | T | delete |
| 45–50 | F3 no bordered box | T | delete |
| 52–65 | F4 pill 44 px, F5 never the accent, F8 underline | T (44 px is A, and `design-checks` already holds it) | delete |
| 66–80 | F13 section order, each tool once, F6 width 1100, F7 height 0.4 | T | delete |
| 81–90 | F11 every tool in the top bar, F12 the foot | T / W (a tool that cannot be reached) | keep one line in the site check: every Ready tool is linked from home |
| 95–99, 232–235 | F9 motion stops in 6 s; F10 words whole from the start | A (WCAG 2.2.2) for F9; F10 is T | keep F9 under reduced motion and the 5 s rule; drop F10 |
| 106–118, 250–256 | F19 Tab follows the eye | A (2.4.3) | keep |
| 127–142, 246, 285 | "unfinished": every scene played, every line whole, no "Show it all" | Self: written for home's scenes of one day (`data-ln`, `data-kv` … ten attributes) | keep only "under reduced motion the content is all there"; the rest goes with the scenes |
| 151–193 | `sceneFrame`: a scene held at each time fits the phone, no text cut or overlapping | W for that one scene | keep while the scenes stand, as the scene's own test, not the site's |
| 236 | F14 no request to another host | Law / privacy (the claim "nothing leaves your browser") | **keep, hard** |
| 237 | F15 home weighs 160 KB at most | T dressed as speed: Rahul, D-UX-122: "why are we compromising quality? How large is the size 160kb with 5g" | turn into a printed figure; the gate is a slow phone's time to the first answer, measured, not a byte count |
| 262–288 | scrolled through at 360×740 and 320×256: nothing still hidden, chart figures do not overlap | W | keep (a block that never shows is a broken page) |

Of 19 rules here, 4 guard a user (F9, F14, F19, nothing hidden) and 15 hold a look. LOOSE1 already made the 15 report only, but they still run on every page at two widths, still print, and the file's own header still calls them "FinSight's rules".

### `scripts/design-checks.mjs` (430 lines)
| Lines | Check | Class | Verdict |
|---|---|---|---|
| 22–34, 426–428 | `tokenCounts`: raw colour classes and arbitrary values against a baseline | T / Self | delete with `design-baseline.json`'s two counts |
| 37–58 | field edge 3:1 (WCAG 1.4.11) | A | keep |
| 59–75 | targets 24 px (2.5.8) | A | keep |
| 76–87 | 44 px on a phone for fields and accent buttons | A-adjacent (Apple, Material) | keep |
| 92–101, 416–420 | nothing moves under reduced motion | A | keep |
| 107–165 | Tab reaches every control, focus seen at 3:1, not under a sticky band | A | keep |
| 168–196 | `measure`: axe (WCAG 2.2 A, AA) plus the above | A | keep |
| 199–360 | `STATES`: each page's states driven by `#fld-…` ids | W, but tied to ids: a rebuilt page breaks every state (D-TECH-111) | keep the states, find fields by label and role |
| 363–367 | focus not lost after a step (2.4.3) | A | keep |
| 388–425 | the walk: 4 pages × states × 2 widths × 2 schemes; the baseline's `known` lines | A; `known` is Self | keep; empty `known` once and drop the mechanism |
| 410–415 | no sideways scroll at 320 px (1.4.10) | A / W | keep |

This file is sound: it is almost all accessibility. Its only red tape is the token ratchet and the `known` baseline.

### `scripts/load-measure.mjs` (437 lines) and `scripts/load-baseline.json` (41 KB)
Fourteen counts per page (words before the first question, words shown, words in all, words with the plan, long sentences, abbreviations, questions, controls, answer at, gap, text styles, colours, extra codes, out of sight).
| Count | Class | Verdict |
|---|---|---|
| `questions` | C (rule 17) | **keep as the one gate**; drop the `--raise <page> questions <D-id>` ceremony that refuses until a DECISIONS row exists (lines 380–383): the number lives in one small file, changed in the same commit as the page, and Rahul sees it in the PR |
| `outOfSight` (a control whose figures all move where the reader cannot see) | W | keep as a report on the result page: it is the one count that found real defects |
| `answerAt`, `gap` | W-adjacent | print, no baseline |
| the other ten (words ×4, long, abbr, controls, styles, colours, codes) | T | print on demand (`npm run load -- --text`); **no baseline, no rose/fell lines in the site check** |

`load-baseline.json` holds 14 numbers for every page plus a `raised` log: it changes with almost every page edit, which is why so many DECISIONS rows end "load counts raised". The colour-hue code (lines 90–152, 60 lines of OKLCH maths) and the font probe (lines 264–272, 406–413) exist only so a baseline holds across machines. Verdict: the baseline shrinks to `{ page: questions }`; the measure stays as a tool a designer runs when wanted.

### The small scripts (all read whole)
| Script | What it is | Verdict |
|---|---|---|
| `site-pages.mjs` | which pages a change touches, for `--quick` | keep: it saves time |
| `design-review.mjs` | drives a page's states, prints the first screen and the measured defects | keep as a tool; no rule in it |
| `stepped.mjs` | lets a script reach a field on a hidden step | keep while checks find fields by id; goes when they find by label |
| `words-dump.mjs` | a page's text as a file; also finds a `D-…` code on screen | keep as a tool |
| `speed.mjs` | time until a page is usable on a slow phone, "never a check" | keep: this, not F15's byte cap, is the honest speed measure |
| `hosts.mjs` | which web hosts are open | keep (rule 9 in one command) |
| `serve-dist.mjs`, `read-doc.mjs` | serve the build; read PDF, Excel, Word back with readers written by others | keep: `read-doc` is what makes "the file says what the page said" testable |
| `video-figures.mjs` | hands the studio the engine's figures | keep (studio) |
| `usage.mjs` | the funnel from the Worker's data | keep: the only outside evidence the repo has |
None of these is red tape: they are tools.

### `scripts/site-check.mjs` (2,086 lines, 187 KB), read in order
| Lines | Check | Class | Verdict |
|---|---|---|---|
| 54–60 | the brand notice word for word; no image but the favicon | Law (D-BIZ-03) | keep |
| 61–79 | footer links the five policy pages; draft mark; contact email on Contact only; no PAN or GSTIN | Law / privacy (D-BIZ-07) | keep |
| 80–107 | sitemap.xml, robots.txt, /site-map/ | W (search) | keep |
| 110–135 | `open`: a script error, a console error, a missing file, not HTTP 200, an island that did not start | **W: the heart of "works without breaking"** | keep |
| 138–183 | sideways scroll, title, description, one h1, inputs 16 px, contrast, follows the system theme | A / W (contrast repeats axe) | keep; drop the duplicate contrast walk |
| 185–208 | no theme flash; the toggle cycles Auto, Light, Dark and remembers | W | keep, but it reads the toggle's words ("Auto"): hold the state, not the label |
| 214–236 | `expectText`, `saver`: each download under 1,500 ms on a slow phone | W | keep |
| 237–283 | helpers; case A typed through `#fld-…` ids | M (a golden case through the page) | keep the case; find fields by label |
| 285–419 | DSCR, case A through the detailed form: figures by year, totals, the schedule, the verdict, the largest loan, cards on a phone, tables at 1024, "Use Rs. 11,11,295", a figure not understood never taken as zero, tax by borrower, Clear all and undo | **M** (figures, never zero) and W; but about 40 lines assert a whole sentence word for word ("Misses 2 of 2 targets: the lowest year, 2027-28, is 1.16 against 1.25; …", "All questions answered, on 7 assumptions") | keep the figures (1.45, 1.16, 21,86,500, 11,11,295) read by role or test id; a sentence is checked for its figures, never its wording, so a writer can change words without a red check |
| 421–470 | a loan drawn in October: interest only in year 1, the figures' first year | M | keep, figures only |
| 472–508 | "a few answers": profit grows from one figure; "4 fields asked for a 5-year loan; want 4" | M + C | keep the figures; the field count is rule 17's and lives in one place, not here too |
| 510–601 | the quick path (case A′); the statement's downloads: provisional mark on every page, named files, a Devanagari name asked again, GSTIN shape, the PDF's lines, annexes, `ONLY_ON_THE_PAGE` words absent from the three files, Excel sheets and cells, Word header | **M and the paper's promise** (the file says what the page said; provisional says so) | keep: this is the paid product's test. Loosen page order ("annexes start pages 2 and 3") and the sheet-name list, which fix a layout |
| 603–684 | DSCR: who the borrower is, EMIs a month, the new asset from October, own yearly figures (0.83, 1.26, 1.23, 1.14; "a typed 0 stays"; the loan amount not asked when it does not change the answer) | M | keep the figures; three lines hold whole sentences ("Worked out: Rs. 4,20,000 in 2026-27; …", the verdict line): check the figures in them |
| 686–724 | the front door: 8 fields, More options closed on load, the textbook EMI (88,848.79; 66,185), the lenders' lines do not change the borrower's DSCR | **C** (rule 17) and M | keep; but the count of 8 is asserted three times here and again in the load measure: one place. "S8: the line to More options is under the last field" is a layout taste (T): drop |
| 726–799 | Make it work (case S): the plans by closed form (20,145.98; 20,962.39; 20,905.97), the stop, round 2, round 1 restored, the sheet on a phone, the rail at 1280 | M and W (a flow that must not break) | keep the figures and the round trip; the six regexes that glue labels to figures ("Repay over7 years 7 months…Each instalmentRs. …") break on any relabel: assert each figure by its role |
| 801–899 | the estimate: 6 questions, the answers folded, headline and exact total, the strip, 15 sections with 10 on, the living room floor by hand (303.03 × 111.65 = 33,833), the drawer's levels, the downloads read back (PDF, Excel, Word, the bill with no rate and no total), the brand notice word for word in each file | M, C, **Law** (D-BIZ-03, 05) | keep the figures, the file read-backs and the notice. "main details[open] = 0", the drawer's level list as an exact array of strings ("At Standard: 8 choices"…) and the strip's shape are the page's look and its data today: T, drop or loosen to "the level's choices are there" |
| 900–1100 | the estimate, continued: the bill taken into the typed path (rates against the library's band: 27% above, within the band; "Door" not matched until picked), the slider, the strip and Undo, Compare, the rooms (shares, size words, a typed size, a room's own level), rooms by buttons, one part on its own (kitchen 8 sections with 6 on, painting 2), interiors (10 on), a new house (18 with 13 on, 6 stages to 100.0%), the sewer (84,680 less), an extension (17 with 12 on, 5 stages) | M (the bands, 84,680, the stages adding to 100%), **C** (six questions on every kind of work, asserted five times), W (every flow reaches its answer) | keep the figures and the six-question count (once, in one helper). About 45 lines pin the wording of "What changed" by regex (`^Living and dining to Spacious: the other rooms 3\.2% smaller · Rs\. …`), the fold line by its dots, "open on load" for four closed lines, and section counts (15/10, 8/6, 2, 18/13, 17/12) that are the engine's data and already tested in `tests/architect.test.ts`: assert that a change is announced with its amount, not how the sentence reads; take section counts from the engine |
| 1102–1146 | V1: the 400-word budget (already moved to `look` by LOOSE1), flags shown, no field with the answer, no Why? before a tap, the Why?'s four parts by regex with the sources' state | T (the budget), C (no field with the answer), M-adjacent (sources marked as reported) | the budget stays a report; keep "no field besides the document's facts" (rule 17) and "sources say reported or verified" (rule 13); drop "none before any tap" and the ⓘ regex (look) |
| 1148–1196 | the estimate typed from a quotation, by hand (2,81,750; 50,715; 3,32,465; 277.05) and its three files read back | **M** and the paper | keep whole; this is the model of a good check: figures in, figures out, the files opened |
| 1198–1221 | `REP_DEFAULT = 31` with a 14-line comment telling the count's history (35, 25, 26, 27, 28, 33, 31, each by its D-UX id) | **C** (rule 17), wrapped in ceremony | keep one number; the history is `git log`'s. This comment is the red tape in miniature: seven decisions logged to move one count |
| 1222–1408 | the project report, case R: 37,86,301; 11,54,407; 55,81,804 both sides; DSCR 2.51; the check before the tables and downloads (OR8); benchmarks reset; how far sales can fall (82,20,000; 31.5%); Make it work at 70 L (82,11,000; 1,41,43,206; 9,35,000), Use this and Undo; what the business can carry; the sliders (70,07,000); the collateral (4,36,226); the three files read back; the words (D-AI-02: no figure sent to the AI, dropped sentences said, in the files only once ticked); the paper beside the questions | **M**, **Law/AI line** (rule 12: `/lakh|Rs\.|\d,\d/` never in what is sent to the draft), W | keep the figures, the AI line (hard), Undo and the check-before-download. About 40 lines pin sentences ("Your figures changed since you checked them: check them again.", "Earns too little for this loan", "Or change one thing", "Default 1.25. Reset DSCR in the lowest year to the default") and negative look rules ("the lowest DSCR is shown twice", "a key figure still says its shortfall in rupees (D-UX-237)", "the sliders open with a step said before one is moved", the Excel sheet names as one joined string): each was a review finding turned into a check (D-TECH-74). Verdict: a finding becomes a lesson; it becomes a check only when it guards money, law or a broken flow |
| 1410–1623 | the project report's other cases, each by hand in `tests/`: P with PMEGP (margin money 7,80,856; cash 83,271; sales 14,40,000; cash runs out 48,67,334 short; machinery 34,00,000), F (1,11,40,000; 1,72,20,000; 180 → 132), Fix it for me (54,66,000; 18,00,000; 251.25; "Before: 3 of 8. Now: 8 of 8."; Undo), Mudra (Tarun Plus at 15 L; CGFMU 15,000; CGTMSE 8,250; above 20 L it stops), simple mode (the limit 2,72,219 against 11,52,000; hybrid security 17,72,219; expert after simple reads 3, 48, 3, 12,00,000) | **M** throughout, and scheme rules (rule 13) | keep every figure and every Undo. Loosen: the ways to repay as an ordered id list, the loan-period sentence whole, labels by `startsWith` ("How many kg a month at full running") |
| 1625–1667 | home: the four tool blocks, one link each with `?case=home`; the scenes fit a phone at six instants (`sceneFrame`); each tool opens filled from home | W (home leads to each tool, filled) and T (the block order, the instants in ms) | keep "each Ready tool is reached from home and opens filled"; the order of blocks and the six instants are the film's own test, not the site's gate |
| 1668–1746 | the builder (six steps, Next/Back, focus to the heading, the draft kept on the device and cleared, the worked example passes); the estimate's and the CMA's rail and sheet; "download within three screens" (already `look`); "the verdict above the fold at 1280 px" | W, A (focus moves), privacy (D-UX-341: the draft on the device, gone on Clear all) and T | keep the reload, Clear all, focus, Esc. "want 6 steps", "above the fold ending before 900 px", "the years run across in the open rail (want cards)", the rail's text as one regex: T, drop |
| 1748–1895 | CMA data: 127 default fields; case K (limit 1,04,00,000; 2,96,80,000 both sides; DSCR 5.84; sales can fall 8.4% to 4,76,32,000); the files read back, 52 formulas on the Check sheet, no levels in the PDF; case M's plan (2,52,48,000; 3,11,112; 5,45,455; Undo); reading an audited statement (only the text lines leave the page, 8 checks tie, nothing filled before a tick, a scan asked to be typed and nothing sent) | **M**, **C**, and the **hard line** of rule 12 and D-UX-44/48 (AI reads, the borrower confirms) | keep whole. Loosen only the year-button choreography on a phone (which year shows after which tap), the "Close" label, "marks 12 cells" |
| 1897–1908 | review-by dates: nothing flagged in time, flagged a year on (D-DATA-19) | M (rule 13: dated data) | keep |
| 1910–1959 | interaction data: the steps only, never a typed figure in any form; nothing sent on a build without the Worker (D-TECH-37) | **privacy, hard** | keep whole |
| 1961–1977 | WhatsApp's in-app browser: the way out to the phone's browser | W | keep |
| 1979–2032 | answers kept: only drafts in the tab, no document, nothing in localStorage but preferences (the report's draft on the device), a reload keeps them, home's case does not overwrite them, Clear all empties them | **privacy** (D-UX-173, 341) and W | keep whole |
| 2034–2067 | UXR5's "Done when": nothing before the first question but the intro (a walk of every `p, h2, h3, button, a, summary, ul` before the first field), one closed More options, the example says it is fictional, four downloads, Clear all with undo | C and W, with one T | keep the example marked fictional (rule 15), the downloads, Clear all and undo, one More options. "Nothing stands before the first question" is a layout rule that fails any page with a new idea above its form (it already needed an exception for the builder, lines 2048–2049): move to `look` |
| 2069–2086 | calls `designChecks`, `loadCheck`, `forbiddenChecks`; prints the totals; exit 1 on any violation | Self | keep the calls that survive §12's verdicts; the four summary lines shrink with them |

**The site check in one view.** 2,086 lines. By my count of the blocks above: about 60% guards money, the files, privacy, law and flows that must not break (keep); about 10% is the field count of rule 17, said in eleven places (one helper); about 30% holds wording, order, counts of sections and "closed on load" (the look, or the engine's data already tested in `tests/`). It finds every field by `#fld-…` id and every result by `data-testid` (184 of its lines on the report alone, D-TECH-111), so a page rebuilt from scratch fails all of it at once whether or not it works. That is the mechanism by which "start from the result, replace the machinery" (CLAUDE.md rule 2) loses to the check every time: the check is the old page's shape.

**Verdict for the site check:** split it in two files. `site-check.mjs` keeps what must hold for any page that does this job: the golden cases in (by label and role), the figures out (by role and by the figure itself), the three files opened and read, the notices, the privacy lines, the field ceiling, Undo and reload. `scripts/look-report.mjs` holds everything else and never fails a build. A new page passes the first by doing the job, with no id to match.

## 13. The rest, and what REFORM1 built

**`docs/RULES.md` and `scripts/rules-doc.mjs`.** Not red tape. `RULES.md` is generated from `engine/data/`: the lending rules the product applies, in plain words, each with its source and date. They are product facts (class F), and the check only says the page is in step with the data. Keep both as they are.

**The same skill kept twice.** Three skills live in the project and in the pack, and have drifted: `brief-first` (74 lines here, 63 in the pack), `money-maths-checks` (56, 48), `lender-documents` (51, 56). The project's copy runs here; the pack's runs elsewhere. Verdict: one source. The pack's copy is the general one, and the project's adds only what is this project's. Not done in REFORM1 (it changes what loads in every project, and the pack must be uploaded by Rahul); a small row of its own.

**The `lessons` skill** said "turns a mistake or a correction into a rule kept at the place that enforces it" and named a check as the strongest place. That one sentence is how lessons became rules: every lesson was pushed toward a script. Rewritten: a lesson informs and bends, is kept by topic, and becomes a check only when a machine can judge it and it guards money, law, privacy, accessibility or a broken flow.

**What REFORM1 built (11-11-2026, D-TECH-113).**

| | Before | After |
|---|---|---|
| `CLAUDE.md`, paid for at every step | 22 rules of equal weight, 7.2 KB | 8 lines that do not bend, 14 lessons that do, 6.1 KB |
| Read by every session beyond `CLAUDE.md` and the handoff | §1 and §8 of `LESSONS-CARRIED.md` | nothing |
| Lessons and design rules | 7 files, 76.7 KB (`LESSONS-CARRIED`, `LESSONS`, `DESIGN-LESSONS`, `DESIGN-SITE`, `DESIGN-MATHS`, `DESIGN-MOTION`, `LOAD-MEASURE`) | 6 topic files, 21.6 KB, in `docs/lessons/`; a session fetches the one or two its work touches; the seven are in `docs/archive/` |
| `docs/DECISIONS.md` | 555 entries, 532 KB, each read as binding | 356 live, 356 KB, a log to grep that informs; 200 in `docs/archive/DECISIONS-RETIRED.md` |
| `docs/GOTCHAS.md` | 85 KB | 78 KB; the studio's 18 traps in `docs/archive/GOTCHAS-STUDIO.md` |
| `docs/DESIGN.md` | "the rules" | "the site as built": a record, and where a better page differs, the page wins |
| Agents (`designer`, `critic`, `writer`) | told to obey the design system and its counts | told to use judgement, start from the result, be bold; taste is a note for Rahul, never a blocker |
| `npm run verify` | 12 checks | 11: the pack's word-for-word check is out (it runs with `npm run pack-skills`) |
| Raising a page's question count | a logged decision id, checked by script | Rahul's word, said in the PR |
| Size caps | on files that are only grepped too | only on the three read whole: `CLAUDE.md`, the handoff, `PROJECT.md` |
| A lesson's road | lesson → rule → check | lesson, by topic; a check only for money, law, privacy, accessibility or a broken flow |

**Not done here, by design.** The checks themselves (§12's verdicts) are CHECKS1, the next row: they need full runs before and after, and they are the larger half of the cost. The skills kept twice (above). The plans (`PLAN.md`, `CAPACITY-FIRST.md`, `UX-OVERHAUL.md`, `V2.md`) hold "traps" lines that read like rules; DEEP1 replaces the plan, so they were left.

**How to tell it worked.** A row's session reads `CLAUDE.md`, the handoff and one or two topic files, then builds. A design change is argued on the page, never against a document. When a session sets a lesson aside it says so in a line, and Rahul overrules or does not. If a session is again found reading rules for most of its steps, the reform has slipped: cut, do not add.
