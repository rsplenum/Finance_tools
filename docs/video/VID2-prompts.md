# VID2 — The prompts for the three sessions that build the films

The owner's implementation prompt of 02-11-2026, corrected against both repos and split into three rows, one session
each (D-UX-277, D-TECH-81). `VID2-script.md` (beside this file) decides the story, the picture and the words; this file
decides how they are built and checked. Each row's starter prompt (also in `docs/HANDOFF.md`'s Next table) is the first
message of its session; the session then reads section 0 and its own section here. Revised by the owner's review of
02-11-2026 (the script's last table: D-UX-289 to D-UX-292, D-TECH-83 to D-TECH-85).

| Row | Deliverable the owner opens | Budget | Branch, in both repos |
|---|---|---|---|
| VID2c | The four five-second middles, portrait and landscape drafts, and the studio's every-frame checks | L, Extra | `vid2c-middles` |
| VID2d | The DSCR 30-second film, portrait and landscape, full quality | M, Extra | `vid2d-dscr-film` |
| VID2e | The CMA, report and estimate films, and all four on their tool pages | L, Extra | `vid2e-films-site` |

Each row starts only after the row before has merged in both repos (the owner says "merge"); VID2c starts after the
owner's review (branch `vid2-review`) merges. VID2b's two PRs, Finance_tools #167 and video-studio #3, are merged.

---

## 0. Rules for every VID2 session

### 0.1 Two repos, each with its own job

- **First, check the row's references** (D-TECH-85): every path and decision number named in section 0, the row's own
  section and the script, once both repos are ready (the second bullet):

  ```bash
  cd /home/user/Finance_tools
  node scripts/doc-refs.mjs docs/video/VID2-prompts.md#0,<row's section> docs/video/VID2-script.md --studio /home/user/video-studio
  ```

  It prints each decision number with its title and each path found in neither repo. Confirm that each decision says
  what the row says of it and that each missing path is one the row makes. A wrong one is corrected in these docs
  first, with a decision line, before any build.
- Confirm both paths before anything else (`git rev-parse --show-toplevel` in each); in a cloud session Finance_tools is
  `/home/user/Finance_tools` and `rsplenum/video-studio`, attached with push access (`add_repo`), is
  `/home/user/video-studio`. Never assume one sits inside the other.
- Run `git status --short --branch` and `git log --oneline -5` in both. Create the row's branch from an up-to-date `main`
  in each and push it first: that is the claim (D-TECH-62). A branch and its PR are their maker's; never rewrite history,
  never merge.
- **Finance_tools** owns the story (`site/src/home/story.ts`), the export (`scripts/video-figures.mjs`) and its test,
  the authored words of the films (D-UX-285), the site's pages (VID2e) and every decision (`docs/DECISIONS.md`; the
  studio's `CLAUDE.md` says the same).
- **video-studio** owns the scenes, the video configs, the rendering, the checks and the output.

### 0.2 The data

- The export runs from the Finance_tools root, because it loads `story.ts` through Vite from the working directory and
  resolves a relative output path from there. To write into the studio:

  ```bash
  cd /home/user/Finance_tools
  node scripts/video-figures.mjs <dscr|cma|report|estimate> /home/user/video-studio/scenes/<tool>-middle/scene.json
  ```

  Run as `node scripts/video-figures.mjs <tool> scenes/...` it writes into Finance_tools, the wrong repo.
- The file is `{ from, tool, scene, figures }`, plus `fix` and `average` for the DSCR. Under `scene` (the `ToolScene`
  type in `story.ts`): `inputs` (the answers; the one with a `to` is the input that changes), `inputsLabel`, `level`
  (`text`, `n`, `label`, `at` least or most, `place` on the track), `hub` (`from`, `to`, `unit`, `work`), `panel`,
  `rows` (each `label`, `tag`, `judged`, `typed` and `fixed`, each `text`, `n`, `meets`, and the estimate's `from`),
  `weakest` (`typed`, `fixed`: row indices), `sum` (`typed`, `fixed`: `head`, `lead`, `result`), `chip` (`typed`,
  `fixed`), `statement` (`title`, `sub`, `verdict`, `lines` of `head` and `text`, `files`, `ready`) and `beats` (each
  `name`, `caption`). "Before" is always `typed` and "after" always `fixed`.
- `figures` is every string in the file that holds a digit, gathered by walking the whole file; the studio takes the
  numbers out of them (`numbersIn` in `lib/figures.mjs`). It is never written by hand. A field added to the export is in
  it automatically.
- A scene may compute geometry from `n` (lengths, positions, the scale), never a shown figure. Text on screen is only
  the export's strings, whole, each in an element that names its field: `data-field`, a path into the file such as
  `scene.rows.3.fixed.text` or `scene.sum.typed.result` (D-TECH-83). The field check of 0.5 holds the two equal.
- The same source gives a byte-identical file, on any day: the file holds no date (`from` is the source's name). The
  site's staleness check rests on this (section 3.2, D-TECH-84).
- No level is pinned for the films (D-TECH-84): the export reads today's levels from the engine's data, and a film whose
  data has moved is caught as stale, never frozen.
- If the file breaks a rule of the script's section 4 (an audited year judged, the estimate's level a least, a weakest
  row that is not the least or most of the judged rows), stop and report it; never correct it inside a scene.

### 0.3 Motion

- `window.studio = { ready, duration }`; `ready` resolves only after the fonts, the layout, every measurement and every
  animation exist.
- Motion by `element.animate` only, so that `ready` knows every animation. No timer, interval, `requestAnimationFrame`,
  CSS keyframe animation or transition, video element, random value or change to the page tied to the clock. Every
  frame is reproduced by pausing every animation and setting its `currentTime` (D-TECH-56).
- The shared helpers are `scenes/_shared/motion.js`; extend them only where a scene needs it.
- A figure that changes is two nodes, the old and the new, crossing by opacity and position, each naming its own
  field (`typed`, then `fixed`); no text set at a moment.
- The twelve sparks have fixed paths, the same on every render.

### 0.4 Look, type and frame

The script's section 7, with `looks/look-c.json`. Logical canvases 540 × 960 and 960 × 540, rendered at scale 2 (check
the video's `sizes` rather than assuming). No text under 22 logical px (D-UX-286); no text in the outer 5% of the
frame; red only on a row on the wrong side of its level and its anchored halo.

### 0.5 What the studio's checks prove

Until VID2c, the studio reads the visible text on every fourth frame (`scanEvery` in `lib/render.mjs`) and looks for
text cut by the frame only on the last one. From VID2c on (D-TECH-80), every rendered frame, draft and full quality,
in both orientations, is checked for:

1. **Figures:** every number in the visible text is in the video's `figures`, including a number seen for one frame.
2. **The frame:** no visible text crosses the frame or enters its outer 5%, measured on its rendered box after every
   transform of it and its parents, line by line.
3. **Text over text:** no two visible text boxes overlap (a value beside its bar, text inside its card and the level's
   label on its own line are not overlaps).
4. **Size:** no visible text under 22 logical px, after transforms (the 1.02 lean included).
5. **Seeking:** the scene has animations, every one paused and seekable, the last frame the same when rendered twice,
   and nothing changes with the wall clock.
6. **The file:** the frame size, H.264 `yuv420p`, the frame rate, the exact duration, and no audio stream
   (`lib/assemble.mjs`).
7. **Fields** (D-TECH-83): every visible text names its source field (`data-field`, 0.2) and its text equals that
   field of the scene's file, whole; a number must equal the number in its own field. A digit-bearing text that names
   no field, names a field the file lacks, or shows another field's value (the typed value in the changed state's
   node, one row's value on another) fails, on any frame. Item 1 stays as the net under it.

The number reader handles Indian grouping (12,47,185), decimals (1.25), percentages (17.3%), amounts with "Rs." and
"lakh", year ranges (2033-34), ratios and sums (3,14,983 ÷ 2,41,752 = 1.30) and signs (+31): a test for each form the
four stories use.

### 0.6 Never

- A figure typed, computed or reformatted in a scene; a number in the question or the CTA.
- Pricing, testimonials, acceptance or approval claims, comparisons, savings or guarantees (D-UX-155, D-UX-166).
- Music, voice or any audio stream.
- The professional title reserved by law (D-UX-18), anywhere on screen or in the shown metadata.
- Pages, campaigns or material aimed at the customers of the owner's employer bank, or any of that bank's names, data,
  forms or logos (D-BIZ-01).
- A pass claimed from a screenshot or a build alone: the checks' reports decide.

### 0.7 Every session's close

`docs/HANDOFF.md`'s "End of every session", in Finance_tools: `npm run verify -- --quick` at 0 violations, `npm test`
for the export's test, one line per decision in `docs/DECISIONS.md` (design choices and the owner's words included), a
trap for `docs/GOTCHAS.md`, the state line and the next row in `docs/HANDOFF.md`, `npm run cost` for "Budgets and
actuals", a commit and a draft PR in each repo touched, done when CI is green; the owner says "merge". In the studio:
`npm test` and the drafts of every video touched. Then report to the owner:

1. The branch, the commits, and the PRs in both repos (never a push, a PR or a merge that has not happened).
2. The files rendered and their reports, by tool and orientation.
3. A pass or fail table: figures, fields, frame, text over text, size, seeking, audio, frame size, codec, duration.
4. The scorecard of the script's section 10 for each video and orientation (D-UX-291): the five scores, one line of
   evidence each, scored on the frames at phone size.
5. Every open issue or exception, plainly.

---

## 1. VID2c — the four five-second middles and the every-frame checks

**Starter prompt:**

> Work from `vid2c-middles` in Finance_tools and rsplenum/video-studio (from `main`, pushed first). Read both CLAUDE.md
> files, `docs/video/VID2-script.md`, and sections 0 and 1 of `docs/video/VID2-prompts.md`. Budget L, at Extra. VID2c:
> the four five-second middles, portrait and landscape drafts, and the studio's every-frame checks. Finish per HANDOFF.

**Deliverable:** eight drafts (four tools, portrait and landscape) under the studio's `output/draft/`, with their contact
sheets and reports, for the owner's review; the studio's checks of D-TECH-80 with their failing fixtures.

### 1.1 Read

Finance_tools: `docs/HANDOFF.md`; `docs/GOTCHAS.md` grepped for `video-figures`, `story.ts` and the studio;
`docs/DECISIONS.md` for D-UX-153 to D-UX-156, D-UX-166 to D-UX-168, D-UX-254 to D-UX-261, D-UX-277 to D-UX-292,
D-TECH-56 to D-TECH-59, D-TECH-80 to D-TECH-85; `docs/archive/DESIGN-MOTION.md`; `docs/OWNER.md`'s "VID2 scenes" list;
`site/src/home/story.ts` from `SceneFig` to the estimate's scene. The studio: `.claude/skills/video-studio/SKILL.md`,
`video_production_skill.md`, `references/pipeline-prompt.md`, `looks/look-c.json`, `lib/render.mjs`,
`lib/figures.mjs`, `lib/assemble.mjs`, `test/check.test.mjs`, `scenes/_fixtures/`, `scenes/_shared/motion.js`, and
VID2b's draft (`scenes/dscr-middle/`, `videos/dscr-middle-c/`). No website is read (the fonts are in
`scenes/_shared/fonts`); if one is needed, D-TECH-35 first.

### 1.2 The export (Finance_tools)

1. Turn `scripts/video-figures.mjs` into a function that builds a tool's file, and a thin command around it, so that a
   test can call it (VID2e's staleness check calls it too).
2. Add `changeTag` to every file: the change's tag as the engine gives it, or `null` (D-UX-282). The DSCR: `fix.move`.
   The report: `REPORT_FIX.move`, from `story.ts`. The CMA: `null` (its `to` already is the difference). The estimate:
   `null` (its change is words).
3. A vitest test, `scripts/video-figures.test.ts`, for each of the four tools:
   - the shape of section 0.2, with every field the middle reads;
   - `level.at` least for the DSCR, the CMA and the report, most for the estimate; each level equal to its source
     (`STORY_TARGET`, `LEVEL_CR`, the report's check, the story's budget), imported, never typed;
   - the CMA's audited rows `judged: false` with their tag; rows without `typed` only where the change adds them;
   - each `meets` agreeing with its `n` and the level, worked out again in the test (D-TECH-83): for a least,
     `meets` exactly when `n` ≥ `level.n`; for a most, exactly when `n` ≤ `level.n`; each with the scene's tolerance of
     1e-9; in both states, on every row that has the state;
   - `weakest` really the weakest (D-TECH-83): in each state, `weakest.typed` and `weakest.fixed` name a judged row
     that has that state, and no judged row in it has a lower `n` for a least (a higher for a most); an unjudged row
     (the CMA's audited) is never named;
   - every digit-bearing token of every string in the file found in `figures` (the studio's own reader, or the same
     pattern), and `changeTag` as D-UX-282 says;
   - two builds of the same tool identical.
4. Export the four files into the studio (section 0.2's command): `scenes/<tool>-middle/scene.json`.

### 1.3 The studio's checks, before any scene relies on them (D-TECH-80)

First, the studio's CI (D-TECH-82), so every studio PR runs the checks this row builds. Today it has none: no
`.github/workflows/`, its PRs checked by hand with `npm test`.

- `.github/workflows/ci.yml`, run on `pull_request` only, not on every push: the repo is private, so each run counts
  against the account's monthly Actions minutes.
- `runs-on: ubuntu-24.04`, never `ubuntu-latest` (Finance_tools' GOTCHAS: 26.04 broke Playwright's install).
- Node from a new `.node-version`; `npm ci` from a committed `package-lock.json` (there is none today).
- `npx playwright install --with-deps chromium` at the pinned 1.56.1, then `npm test`.
- The tests include one that scans each `scenes/<tool>-middle/` in both sizes from its committed `scene.json`. It
  seeks and measures in Chromium but encodes no video: no ffmpeg in CI, no renders (the tests already pass
  `encode: false`).
- The studio PR's check is green before the row ends, as Finance_tools' is (D-TECH-68).

1. In `lib/render.mjs`, check every rendered frame, not every fourth, for figures and fields (0.5, items 1 and 7), and
   on every frame for the frame, text over text and size (items 2 to 4); write the failures with their time and their text into the report.
   Keep it fast enough: one measurement per frame, in the page, returning only failures.
2. The seeking check (item 5) and the file check (item 6), in the existing phases.
3. Fixtures in `scenes/_fixtures/`, each a scene that must fail, with a test in `test/check.test.mjs` that it does:
   (a) a number not in `figures` shown for 100 ms mid-animation; (b) text that leaves through the top edge mid-animation
   and comes back; (c) text pushed past a side edge by a parent's scale; (d) two text blocks overlapping during a
   transition; (e) text under 22 px; (f) a number that is in `figures` but shown in a node naming another field (the
   typed value under `fixed`); (g) a digit-bearing text that names no field (D-TECH-83). The existing `wrong-figure`
   and `cut-text` fixtures keep failing as they do.
4. Tests for the number reader on every form of section 0.5.
5. `npm test` green, the test card's draft still passing.

### 1.4 The middle, once, for four tools

1. One shared component (in `scenes/_shared/`) builds the whole middle of the script's section 4 from a `scene.json`:
   the composition for both orientations, the panel, the rows, the bars on one scale with the break mark, the estimate's
   running totals (`from` to `n`), the level line, the card, the chip, the sum, the headline and caption, the lens and
   brackets, the mood light, the sparks and the sheen, and the clock with its swap at 2.50 s and its lens rule
   (D-UX-281). It takes its clock as start times, so the films can stretch them (D-UX-280). Every text it draws
   names its field (0.2).
2. Four scene folders, `scenes/<tool>-middle/`, each an `index.html` that loads the shared component and its own
   `scene.json`, and nothing else; VID2b's `scenes/dscr-middle/` becomes one of them.
3. Four configs, `videos/<tool>-middle-c/video.json`, as `videos/dscr-middle-c/video.json`: look C, both sizes, 5,000 ms,
   `figures` pointing at the scene's `scene.json`.
4. Check each draft against the script's "today" lines: the DSCR's 6 rows then 9, its lens moving; the CMA's three
   audited rows and two judged, its lens staying; the report's five rows, its lens staying; the estimate's running total
   crossing the budget at "Electrical and lights" as typed, its lens staying on the Total.

### 1.5 Render and review

1. `node studio.mjs make videos/<tool>-middle-c --draft` for each of the four, both sizes.
2. Read each contact sheet and report; fix only what they show, and render again. Score each draft on the script's
   scorecard (section 10, D-UX-291) and write it into the report.
3. No middle passes with any check red. The owner reviews the eight drafts; their word may change the middle before
   VID2d, and each change is a decision line.
4. Close per section 0.7. VID2d next.

**Done when:** each draft is green on every check of 0.5 in both orientations; a muted viewer finds the level, the
weakest row, the changed input and the cleared result in each; the owner has the eight drafts to open.

---

## 2. VID2d — the DSCR 30-second film

**Starter prompt:**

> Work from `vid2d-dscr-film` in Finance_tools and rsplenum/video-studio (from `main`, pushed first). Read both CLAUDE.md
> files, `docs/video/VID2-script.md`, and sections 0 and 2 of `docs/video/VID2-prompts.md`. Budget M, at Extra. VID2d:
> the DSCR 30-second film, portrait and landscape, drafts and then full quality. Finish per HANDOFF.

**Deliverable:** the DSCR film at 1080 × 1920 and 1920 × 1080, 30 s, with its reports, for the owner's approval of the
five chapters, which VID2e then reuses for the other three.

### 2.1 Read

As VID2c (1.1), plus the owner's word on VID2c's drafts (`docs/DECISIONS.md` after D-UX-288) and VID2c's shared
component.

### 2.2 The export (Finance_tools), for all four tools so VID2e only reads

1. The film's words in one place, `site/src/site.ts`, beside each tool's entry: its question and its CTA, as the
   script's section 2 gives them (D-UX-285). The export reads them, with the entry's own `what` (D-UX-289), into
   `film: { question, what, cta }`; VID2e's page links read the same.
2. Home's "Worked out on this device" from one constant that `site/src/home/How.astro` and the export both read
   (D-UX-284); exported as `film.onDevice`. Home's look and words unchanged (its site check passes as before).
3. The names of each tool's working for 3–8 s (D-UX-279), read from its document, never typed: the CMA's forms, the
   report's projected statements, the estimate's trades (its rows' labels), the DSCR's years (its typed rows' labels);
   exported as `film.working`.
4. The test of 1.2 extended to these fields; the four files exported again into the studio.

### 2.3 The film

1. `scenes/dscr-film/index.html`: one Web Animations timeline of 30,000 ms, the five chapters of the script's section 2.
   The middle is VID2c's shared component, its start times multiplied by 2.2 and moved to 8 s, its durations and
   staggers unchanged (D-UX-280: bars at 8.33 s, the swap at 13.50 s, the sheen at 17.46 s). Never an MP4 inside a
   scene.
2. 0–3 s: the question. 3–8 s: the question becomes the eyebrow and stays to 19 s; the working of section 3 takes shape
   from `inputs`, `hub` and `film.working`, the answers headed by `beats[1].name`; `film.what` beneath (D-UX-289); at
   8 s the working's rows become the panel's.
3. 19 s: the panel turns into the paper as one object, the same element, never a second sheet (D-UX-290): its chart and
   the card leave, its frame grows into the sheet, `panel` gives way to `title` and `sub`. 19–26 s: the proof, section
   5: the statement's `lines` on the paper in order, then `film.onDevice` under it, each `head` with its `text`,
   building up and staying, the last in by 24 s. No small tables: nothing on the paper but these, at the film's sizes.
4. 26–30 s: the same paper finished, its signatory area (`ready`) and the formats in `files`, the CTA beneath, settled
   by 27.5 s, still to 30 s.
5. `videos/dscr-film-c/video.json`: look C, both sizes, 30,000 ms, `figures` from the scene's file.

### 2.4 Render and review

1. `node studio.mjs make videos/dscr-film-c --draft`; fix only what the reports and the contact sheets show.
2. Then full quality (`node studio.mjs make videos/dscr-film-c`): 1080 × 1920 and 1920 × 1080, H.264 `yuv420p`, the
   configured frame rate, exactly 30 s, no audio, every check of 0.5 green.
3. Each caption held 5.5 s, each proof line at least 2 s, the end frame still from 27.5 s: check them on the frames.
   Score both orientations on the script's scorecard (D-UX-291); the owner's score decides.
4. Close per section 0.7. The owner approves the five chapters before VID2e copies them. VID2e next.

**Done when:** both files pass every check; a muted viewer answers the script's section 10 from the film alone; the owner
has both files to open.

---

## 3. VID2e — the other three films and the films on the site

**Starter prompt:**

> Work from `vid2e-films-site` in Finance_tools and rsplenum/video-studio (from `main`, pushed first). Read both CLAUDE.md
> files, `docs/video/VID2-script.md`, and sections 0 and 3 of `docs/video/VID2-prompts.md`. Budget L, at Extra. VID2e:
> the CMA, report and estimate films, then all four on their tool pages. Finish per HANDOFF.

**Deliverable:** the three films in both sizes, full quality; all four films on their tool pages in the branch's
preview, for the owner to open on a phone and a desktop.

### 3.1 The three films

1. `scenes/<tool>-film/` for the CMA, the report and the estimate: the DSCR film's chapters with the tool's own file, no
   fork of the animation code (a shared film component if VID2d has not made one).
2. Per tool, the script's section 4 stories: the CMA's audited years muted and never red; the report's same five years;
   the estimate's running totals and its maximum; the lens staying where the weakest row stays.
3. Drafts, then full quality, exactly as 2.4, every check green.

### 3.2 The films on the site (D-UX-288)

A design choice first, by `brief-first`: where on each tool page the film sits, with the tradeoffs, the owner's word
before building. Then:

1. Each tool page (`/dscr/`, `/cma/`, `/project-report/`, `/estimate/`) plays its own 30-second film; home keeps its live
   scenes and links each to its film ("Watch in 30 s", D-UX-153).
2. Below 1024 px, the portrait film in a frame that fits one phone screen under the sticky header (D-UX-255): at
   360 × 640 about 295 px wide. At 1024 px and above, the landscape film.
3. A still of the film's last frame first; the MP4 loads only on a tap (`preload="none"`), so the page's load on slow 3G
   does not grow (D-TECH-77; the load measure shows it). Each MP4 within Cloudflare Pages' file limit.
4. With reduced motion, the still and a tap to play.
5. Each film keeps its rendered data (D-TECH-84): `site/src/films/<tool>.json`, the very file its scene was rendered
   from (the studio's `scenes/<tool>-film/scene.json`), committed with the film. A test beside the export's
   (`scripts/video-figures.test.ts`, so CI's `npm test` runs it) exports each tool afresh and fails when the result
   differs from the kept file, naming the tool and the first field that differs, and saying the fix: export again,
   render the film again, replace the film and its file together. No level is pinned: a rule or a word that changes
   in the engine or `story.ts` makes the film stale, and CI says so before the site shows a film that disagrees with
   its tool.
6. The film's words as text for a screen reader: its question, its `what`, `beats[1].name`, `beats[2]` and
   `beats[3]`, the proof lines and the paper, read from the kept file, so they are the film's own.
7. Under the film, a real link with the CTA's words (`film.cta`, the same source) to the page's first question.
8. A site check: the frame fits under the header at 360 × 640 and 390 × 844, the still and the link exist, the default
   fields' count unchanged (D-UX-12). The critic reviews each page at 360 and 1280, light and dark.

### 3.3 Close

Section 0.7, with the full site check on CI. VID2's films are then done; the next row is HANDOFF's next.

**Done when:** the four films pass every check in both sizes; each tool page plays its film on a phone within one screen
and on a desktop, loads nothing until a tap, and reads to a screen reader; the owner has the preview to open.
