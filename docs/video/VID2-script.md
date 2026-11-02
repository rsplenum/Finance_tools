# VID2 — Four 30-second product explainers: the production script

The owner's script of 02-11-2026, corrected against the repo as the owner asked ("write the corrected versions as
recommended", D-UX-277). It decides the story, the picture and the words; `VID2-prompts.md` (beside this file) decides
how three sessions build it (D-TECH-81). Each change from the owner's draft is listed at the end with its decision.

**Production master:** 30 seconds, silent, caption-led (D-UX-153)
**Deliverables:** portrait 1080 × 1920 and landscape 1920 × 1080 for each tool, then the films on the site (D-UX-288)
**Visual system:** Look C — navy, glass, Figtree, marigold; red only where a value is on the wrong side of its level (D-UX-278)
**Story principle:** show a real financial question, make the governing relationship visible, reveal the weakest point,
change one input, recalculate, then show the actual document.

Every figure on screen comes from the tool's exported scene (`scripts/video-figures.mjs`, from `site/src/home/story.ts`,
worked out by the engine). This script holds no figure; where it names one (as "today"), it is for checking a draft,
never for typing into a scene.

---

## 1. Creative direction

These are not four feature tours and not four advertisements with a shared chart pasted into them. Each film makes one
financial relationship understandable in a single viewing. The four share one chart grammar in the middle so that a
viewer who has seen one can read the next; what makes each its own is its question, its working (3–8 s), its data and
its document (D-UX-279).

The emotional sequence is:

1. **Orientation:** a question the viewer recognises.
2. **Comprehension:** the tool's own working takes shape from the viewer's answers, and one line says how little is asked.
3. **Tension:** the data appears; one weak point is unmistakable.
4. **Agency:** one input changes and the same calculation is run again.
5. **Resolution:** the new result is legible, and the actual document takes shape.

The sophistication comes from the clarity of the model, the restraint of the layout, the quality of the typography, and
motion that makes cause and effect visible (D-UX-166, D-UX-167). It stays cool (D-UX-261): the mood light, the lens, the
sparks and the sheen are kept, each with its job (D-UX-260). No financial-industry theatre, gratuitous particles,
cinematic camera shake, decorative dashboards, artificial data or a parade of feature labels.

**The viewer should finish thinking:** "I understand what this tool works out, I can see why the first result missed,
and I can see what changed."

## 2. Master clock — 30 seconds

The four films share this clock (D-UX-154, D-UX-280). Only the tool's question, working, data and document differ.

| Time | Chapter | Picture and movement | On-screen copy |
|---|---|---|---|
| 0–3 s | **The question** | Begin in near-stillness. The question enters with a measured rise; one fine marigold rule resolves beneath it. No logo animation, no title card. | The tool's question (below). |
| 3–8 s | **What it is** | The question contracts into the eyebrow and stays there to 19 s. The tool's own working takes shape from the viewer's answers (section 3); the eye moves from the answers to what the tool works out. | The tool's `beats[1].caption` (D-UX-283). |
| 8–19 s | **The picture: find → change → clear** | The five-second middle (section 4), its start times stretched 2.2×, each movement at its own speed (D-UX-280). | `beats[2]` and `beats[3]`: name as the headline, caption beneath. |
| 19–26 s | **The proof** | The chart resolves into the document. Its own lines build up one by one and stay (section 5). No flight through a fake interface. | The statement's `lines`, and the on-device line (D-UX-284). |
| 26–30 s | **The paper and one action** | The finished document rests in a glass card; the real formats; one button-like CTA settles beneath. The end frame holds long enough to read. | `statement.title`, `statement.files`, the CTA (below). |

### The question and the action

Authored words, not data: they carry no digit (D-UX-154). The CTA uses "Start", the verb of the site's own link
("Start a DSCR statement", `site/src/pages/index.astro`), with each tool's name as `site/src/site.ts` gives it; the page
under each film carries a real link with the same words (D-UX-285, D-UX-288).

| Tool | 0–3 s — the question | 26–30 s — the action |
|---|---|---|
| **DSCR** | "Will the cash cover the instalments every year?" | "Start a DSCR statement" |
| **CMA** | "Will working capital support the limit ahead?" | "Start your CMA data" |
| **Project report** | "Can this project support the borrowing it needs?" | "Start a project report" |
| **Estimate** | "Can this home stay within the budget?" | "Start a construction estimate" |

The CTA is drawn in the MP4 and is not a link; the accessible link is on the page (D-UX-288). The owner's "what it is"
sentences are not used: the working in the picture shows what the tool is, and `beats[1]` says how little is asked,
which is the proof of "I can use this without being a finance expert" (D-UX-166, D-UX-283). If the owner later wants the
"what" said in words, the source is the tool's `what` line in `site/src/site.ts`, never a new sentence.

## 3. What it is (3–8 s): each tool's own working

Built only from what the tool's scene exports (D-UX-279): the answers (`inputs`, each `k` and `v`; the one with `to`
shows its typed `v` here and changes only in the middle), the hub (`hub`: `from`, `unit`, `work`) and the names of the
working's parts. No drawing the data does not hold.

- **DSCR:** the seven answers gather into the hub ("worked out" over the term's months), and the years' labels of the
  typed case line up, empty, as the panel's rows. Only the typed case's years: the longer term's years arrive in the
  middle.
- **CMA:** the case's figures fill Forms I to VI, each form named as the CMA document names it, with the audited years
  marked as such; the hub counts the forms worked out.
- **Project report:** the project's answers feed five years ahead and the three projected statements the report holds
  (profit and loss, balance sheet, cash flow), named as the report's document names them.
- **Estimate:** the six answers become the trades, one row each, and the hub counts the items priced. No floor plan:
  the case holds no plan, and a drawn one would be decoration (D-UX-260, D-UX-279).

At 8 s the working's rows become the panel's rows, so the picture continues instead of cutting.

## 4. The five-second middle — exact choreography

Built first as a standalone, seekable **5,000 ms** scene for each tool (VID2c). Its content is read from the tool's
generated `scene.json`; the animation code may calculate geometry, positions and interpolation from the `n` values, but
never supplies, retypes or computes a figure that is shown.

### Composition

Logical canvases at the studio's scale 2: portrait 540 × 960 (renders 1080 × 1920), landscape 960 × 540 (renders
1920 × 1080). No text in the outer 5% of the frame. No text under **22 logical px** in either orientation, so that a
portrait film shown 295 px wide on a 360 × 640 phone, under the site's header, still reads at 12 px (D-UX-286).

**Portrait:**

- Stack the scene: eyebrow, headline, data panel, then the change card.
- The chart stays the visual centre of gravity, never a small dashboard floating in empty space.
- The full row set fits the frame: reserve the room for the post-change row count before the new rows arrive, so they
  never push the card out of the canvas.

**Landscape:**

- The data panel on the left, **540 logical px** wide.
- The eyebrow, the swapping headline, the change card, the status chip, the weakest row's sum and the caption in the
  right-hand column.
- No decorative title band at the panel's expense: the chart is the evidence; the right column explains the change.

**Panel anatomy, both orientations:**

- Eyebrow: in the standalone middle, `statement.title`; in the film, the question, from 3 s to 19 s (D-UX-280).
- Headline: `beats[2].name`, then `beats[3].name`; the caption under it: `beats[2].caption`, then `beats[3].caption`.
- Panel heading: `panel`. Level label: `level.label`.
- One row per year, form-year or trade: label, bar, value (`typed.text`, then `fixed.text`). A row without `typed` is
  absent before the change, never drawn as zero. A row with `judged: false` shows its `tag` (the CMA's "audited") and
  is muted; it never turns red.
- A dashed marigold rule at the level, drawn once, unlike any bar or baseline.
- The change card: the input with a `to` (`k`, `v` → `to`), its tag (D-UX-282), the status chip (`chip.typed`, then
  `chip.fixed`), the weakest row's sum (`sum.typed`, then `sum.fixed`: its `head`, then `lead` and `result`).

**Bars:** one scale for the typed and the changed states, set from the level's `n` and `place`; never re-scaled between
them. A bar beyond the scale is clipped with a clear break mark, its printed value exact. The estimate's bars are running
totals: each runs from its `from` to its `n`, its printed value the trade's own amount; the Total row is the whole. A
running total is never printed: it is geometry only (D-UX-281).

### Animation clock

Times from the start of the middle. Web Animations API only. Between 0 and 2.50 s the headline, caption, chip and sum
show their typed state; at 2.50 s all four swap with the change (D-UX-281).

| Time | Event | Direction |
|---|---|---|
| 0.00–0.15 s | Establish | The typed state composed and still: the panel, its rows' labels, the level, the headline and caption of `beats[2]`, the card with the typed value. Never a blank loading screen. |
| 0.15 s | Bars arrive | Bars spring to their typed lengths, **90 ms apart**. |
| 1.25 s | Failure becomes legible | Only rows with `meets: false` turn red: below the level for a least (DSCR, CMA, report), over the budget for a most (the estimate's running totals that cross it). |
| 1.45 s | Find the weak point | The row at `weakest.typed` shudders once. Four corner brackets spring onto it and pulse twice. The panel leans in to scale 1.02. The mood light turns a restrained red, anchored to that row. |
| 2.50 s | The intervention | The input flips from `v` to `to`; its tag appears; the chip, the sum, the headline and the caption swap to their changed state. |
| 2.90 s | Recalculate | Bars spring to their changed lengths, **70 ms apart**. Rows that exist only after the change slide into their reserved room. Out-of-scale bars get the break mark. |
| 3.65 s | The new weakest point | The brackets and the glow turn marigold. When `weakest.fixed` differs from `weakest.typed`, the lens glides to it first; when they are the same row, it stays and only turns marigold (D-UX-281). |
| 4.05 s | Clear | **Twelve** small sparks rise from the level line at that row. The mood light warms to marigold. The only celebratory motion. |
| 4.30 s | Finish | One soft sheen crosses the panel. All movement settles; the resolved state holds to the end. |

The panel's 1.02 lean changes no geometry and pushes no text out of the frame. The chart's scale never changes between
the failed and the corrected state: the viewer compares like with like.

In the 30-second film these start times are multiplied by 2.2 and added to 8 s; each movement's duration and each
stagger keep their five-second values, so a spring feels as it does in the draft and the time gained is reading time
after it (D-UX-259, D-UX-280):

| Event | Middle | Film |
|---|---|---|
| Bars arrive | 0.15 s | 8.33 s |
| Failure | 1.25 s | 10.75 s |
| Find | 1.45 s | 11.19 s |
| Change, swap | 2.50 s | 13.50 s |
| Recalculate | 2.90 s | 14.38 s |
| New weakest | 3.65 s | 16.03 s |
| Sparks | 4.05 s | 16.91 s |
| Sheen | 4.30 s | 17.46 s |
| End | 5.00 s | 19.00 s |

Each caption then holds 5.5 s: `beats[2]`'s from 8 to 13.5 s, `beats[3]`'s from 13.5 to 19 s.

### The four data stories

Semantic rules, not values: the generated file is the only source. "Today" is the exported scene of 02-11-2026, for
checking a draft.

**DSCR — repayment capacity by year**

- Each judged year's DSCR against the generated minimum (`level`, the story's target from `STORY_TARGET`).
- The changing input is the term (`inputs` entry with `to`); its tag is the engine's own move (`fix.move`).
- The longer term adds years: they arrive only with the recalculation, never as zero before it.
- The final year's high value may exceed the scale: clamp the bar, add the break mark, keep the exact figure.
- The weakest year moves after the change, so this is the one film where the lens glides. Today: 6 rows, then 9; the
  weakest 2030-31, then 2033-34.

**CMA — current ratio across the years**

- One row per year. The audited years (`judged: false`, `tag` "audited") are context, muted, never red.
- Only the projected years are judged, against the fresh limit's level (`LEVEL_CR`, `engine/data/ratios.json`).
- The changing input is the promoters' capital; its `to` already is the difference, so it carries no second tag (D-UX-282).
- The evidence is the weakest projected year's current assets ÷ current liabilities (`sum`).
- Today: 5 rows, 2 judged; the weakest is the same year before and after, so the lens stays.

**Project report — projected repayment capacity**

- The projected yearly DSCR against the report's level (the engine's check, through `reportSum`).
- The changing input is year one's sales; its tag is the engine's own move (`REPORT_FIX.move`, exported, D-UX-282). No
  growth rate or delta made up in the scene.
- The evidence is the weakest year's cash available ÷ debt service (`sum`).
- The same years and scale before and after; the changed values are the recalculated case's, never an interpolation.
- Today: 5 rows, all judged; the weakest is year one before and after, so the lens stays.

**Estimate — the running total against a budget**

- Each trade continues from the running total before it (`from` to `n`); the Total row is the whole amount.
- The level is a **maximum** (`at: 'most'`, the story's own budget). Red marks a row whose running total has crossed
  above the budget (`meets: false`); a row at or under it stays neutral.
- The changing input is the two bedrooms' level, words only (`v` → `to`), with no money tag (D-UX-282).
- The weakest row is the Total; its figure is the exported total, never a sum made in the scene. The trades' printed
  amounts are rounded, so they can add to a rupee more than the Total: one more reason to print no running total.
- Today: as typed, the running total crosses the budget at "Electrical and lights", so it, "Plumbing" and the Total turn
  red; after the change, none. The weakest is the Total before and after, so the lens stays.

## 5. The proof and the end card — 19–30 s

This section shows the work; it never announces that the product is trustworthy (D-UX-155, D-UX-166).

**19–26 s, the proof:** the chart resolves into a clean document sheet built from the generated statement. Its items
enter in order, one after another, and stay, so all are on screen together before 26 s; each shows its `head` large and
its `text` beneath, and the last enters by 24 s so it holds at least 2 s:

1. "Worked out twice", with its difference.
2. The tool's substance: every instalment, Forms I to VI, five years ahead, or every item.
3. The basis or the assumptions, where the statement has them (the DSCR statement has none since D-UX-259).
4. Home's own words, "Worked out on this device" (the label in `site/src/home/How.astro`), read from one source that
   home and the export share, never retyped (D-UX-284).

The "Ready to sign" line belongs to the paper (26–30 s), as its signatory area. Never "bank-approved", "accepted
everywhere", "guaranteed", "best", "error-free", a comparison, a testimonial, a price or a saving.

**26–30 s, the paper and one action:** `statement.title`, the paper's small line (`statement.sub`), only the formats in
`statement.files`, and the one CTA from section 2. The paper looks inspectable: its title, several ruled sections, a
visible working or check area, and a restrained signatory area where the document has one. No made-up contents and no
official seal. The CTA settles by 27.5 s and the frame holds still to 30 s.

## 6. No 25-second cut, for now

The 30-second master is the only cut (D-UX-287). A shorter one, if ever needed, is its own row with its own clock and
checks, never the 30-second master sped up.

## 7. Look and typography

- Background: navy `#0B1020`; a deeper navy may give depth.
- Primary text: soft white `#F3F4F8`; secondary text: muted `#9AA3B5`.
- Accent: marigold `#F0B53D` for the level line, the focus brackets, the cleared state, the sparks and the one sheen.
- Red: `#F87171` only on a row or figure on the wrong side of its level, and its low-opacity mood halo anchored to that
  row. No decorative red borders, icons or general red lighting.
- Typeface: Figtree for headings, body and figures. No monospace.
- Glass: the restrained translucent panels, soft edges and blur of Look C (`looks/look-c.json` in the studio). No nested
  cards.
- Strong typographic contrast and stable alignment: values line up to compare down the rows; labels never compete with
  them. Nothing under 22 logical px (section 4).
- No fake app screenshot, terminal, cursor, typewriter effect, glowing grid, coins, handshakes, stock buildings or a
  collage of finance icons.

## 8. Sound and audience

- No music, voice-over, synthetic speech or ambient soundtrack. The MP4 has no audio stream at all, not a silent track.
- For a general public audience across India: business owners, professionals and people planning work on a home. Never
  written, aimed or framed for the customers of the owner's employer bank (D-BIZ-01); no bank's name, logo, uniform,
  branch, form, customer data or material.
- The professional title reserved by law (CLAUDE.md, D-UX-18) appears nowhere: not in the copy, the labels, the CTA or
  any metadata the video shows.

## 9. On-screen copy rules

- Each text beat is one sentence or one phrase, one or two lines.
- The question and the CTA carry no digit.
- Every numeric token on screen is in the scene's `figures`: years, decimals, percentages, amounts, sums, levels, tags,
  counts, the card's values, and any digit inside a label, including one shown for a single frame.
- No number typed into HTML, CSS `content`, SVG text or a JavaScript string to put it on screen. Geometry may use numeric
  constants; shown text may not.
- Exact values as the source gives them: no reformatting, rounding, abbreviating or localising in the scene.
- No placeholder zero: a missing value is absent, or a dash the source itself gives.
- `beats[1]` to `beats[3]` and the statement's lines are used word for word.

## 10. Review standard

Without pausing, a muted viewer can answer:

- What question does this tool answer?
- What is being compared with what?
- Which row failed, and why?
- Which single input changed?
- Did the recalculated result clear the same level?
- What document is produced?

If a viewer cannot find the level, the weakest row or the changed input, simplify the scene before adding motion.

## Changes from the owner's draft of 02-11-2026

| Change | Why | Decision |
|---|---|---|
| Look C stated as the owner's pick, over VID2b's editorial-paper draft | The script names it; the pick was not yet recorded | D-UX-278 |
| One shared chart at 8–19 s; each tool's own working at 3–8 s, from its data only; no floor plan | D-UX-154 asked for a picture per tool; the draft shared one chart | D-UX-279 |
| Chapters: "The picture" at 8–19 s, "The proof" at 19–26 s | The draft named 8–19 s "the proof"; D-UX-166 names 19–26 s so | D-UX-280 |
| The middle stretched by its start times, each movement at its own speed | A 2.2× stretch of durations is slow motion; D-UX-259 added reading time instead | D-UX-280 |
| The question stays as the eyebrow from 3 to 19 s in the film | One eyebrow instead of a second swap at 8 s; the title comes with the paper | D-UX-280 |
| Headline, caption, chip and sum swap at 2.50 s | The draft timed no swap | D-UX-281 |
| The lens glides only when the weakest row changes (today, DSCR only) | In the CMA, the report and the estimate the weakest row stays | D-UX-281 |
| The change's tag: the engine's own string or none; the estimate's words only | Only DSCR exported a delta; a money tag for the estimate would be a figure made outside the engine | D-UX-282 |
| `beats[1]` replaces the "what it is" sentences | It shows that little is asked; the working shows what the tool is | D-UX-283 |
| The proof adds the on-device line; its items build up and stay | "My information is handled with care" (D-UX-166) had no beat; seven seconds of single lines is too fast to read | D-UX-284 |
| DSCR question reworded; the CTAs use "Start" and the site's tool names | Cash covers instalments, not years; the site says instalments; "Build a building estimate" repeated itself | D-UX-285 |
| Nothing under 22 logical px | The film is watched on a phone, often 295 px wide, not at 1080 px | D-UX-286 |
| No 25-second cut for now | Its clock contradicted "do not accelerate" and doubles the checks | D-UX-287 |
| The films on the site: their own row | The draft ended at the MP4s; D-UX-153 puts them on each tool's page | D-UX-288 |
| The supplied MP4's paragraph dropped | No later session can find that file; the drafts are in the studio (`videos/dscr-middle-c`) | D-UX-277 |
