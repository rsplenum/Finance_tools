# Design system (DT1, D-UX-58)

What every page is held to, read whole by the designer and the critic (`.claude/agents/`). The look comes from these rules, the measured checks, the usage numbers and the owner's judgement of the preview, not from an agent's taste. A rule stays only with its evidence. The owner's inputs, and the rows that do not hold: `docs/design-inputs/cognitive-matrix.md`. Proposed rules wait in `docs/DESIGN-LESSONS.md` until accepted. Astro, Preact and Tailwind 4; the tokens in `site/src/global.css`.

The look is FinSight's own (D-UX-72, `docs/design-reference/finsight.md`; how it lands on each page: `docs/DESIGN-SITE.md`), on every page (`look="new"` in `site/src/Base.astro`, listed in `NEW_LOOK`). Its rules win where they differ, except on accessibility, figures and the law.

**Reference sites** (the owner's matrix, `docs/design-inputs/cognitive-matrix.md`): GOV.UK (forms, errors), Our World in Data (chart labels), Linear (speed), Stripe's docs (an explanation beside its subject), ciechanow.ski (a control beside its effect). Borrow patterns, never looks.

## Principles
Each: the friction it removes; its evidence.
1. **Answer first.** The result the user came for shows above the tables and without opening More options. Friction: hunting for the point. Evidence: NN/g, "Inverted pyramid: writing for comprehension"; the owner's brief (`brief-first`, D-UX-10).
2. **Ask only what changes the answer**; the rest is a stated assumption or sits under one closed More options. Friction: questions that change nothing. Evidence: NN/g, "Progressive disclosure" (2006); GOV.UK Service Manual, "Structuring forms" (know why you ask each question); the owner's ceiling on fields (D-UX-12).
3. **One thing per page where a flow has steps** (a single tool page that answers as you type is one thing). Friction: losing one's place. Evidence: GOV.UK Service Manual, "Structuring forms" (start with one thing per page).
4. **A control beside the figure it changes** (Make it viable's sliders, the estimate's). Friction: split attention, holding one in mind while looking for the other. Evidence: Chandler and Sweller (1992), the split-attention effect.
5. **Labels on the chart or table**, at the end of the bar or line, never in a distant legend; one colour per thing across a page. Friction: the same split attention. Evidence: Chandler and Sweller (1992); Our World in Data's practice.
6. **One accent colour, kept for the main action and the chosen option**; one filled button a screen. Friction: searching for what to do. Evidence: GOV.UK Design System, Button (avoid more than one primary button on a page).
7. **Lines of 45 to 75 characters** for running text (`max-w-prose` or the page's `max-w-3xl` column). Friction: losing the line on the return sweep. Evidence: Bringhurst, *The Elements of Typographic Style*; WCAG 1.4.8 (AAA) caps at 80.
8. **A reset always in reach**: Clear all, Undo after "Use this plan", every change reversible. Friction: fear of trying. Evidence: Nielsen's heuristic 3, "User control and freedom" (NN/g).
9. **An answer within 100 ms** of leaving a field: the engine runs in the page, no spinner. Friction: waiting breaks the flow of thought. Evidence: Nielsen, "Response times: the 3 important limits" (NN/g, 1993).
10. **Every element says something, or goes** (the owner, 18-10-2026): no shadow, gradient, blur, icon, box or space that tells nothing; each size, gap and colour from the maths in `docs/DESIGN-MATHS.md`. Evidence: Tufte's data-ink principle (1983).
11. **No pure black behind white text in dark mode** (the canvas is a dark grey). Evidence: Material Design, "Dark theme" (a guideline).
12. **Plain words on screen**, the owner's words; a CA's terms in the documents. Evidence: GOV.UK, "Writing for GOV.UK"; LESSONS-CARRIED §1.


## FinSight's rules (AG2, D-UX-72)
The brief: `docs/design-reference/finsight.md`. *Tested*: by `scripts/forbidden-checks.mjs` (thresholds beside each check) in the site check; the rest are the critic's.
- **F1 Type**: Figtree for text; Anek (Ek Type, OFL) for headings, `figure` (wide, tabular) and `caps` (condensed, labels of one to three words). *Tested*.
- **F2 Small headings**: h1 `text-hero`, h2 `text-section` or `text-statement`, h3 `text-title`; not a fold's line or an sr-only one (D-UX-106). *Tested*.
- **F3 Boxed cards**: a panel is set off by its fill, never a border all round. *Tested*.
- **F4 Square buttons**: a filled link or button is a 44 px pill. *Tested*.
- **F5 Accent-filled buttons**: pills are `bg-ink text-canvas`, soft `bg-ink/5`, or on a desk `bg-on-desk`; the accent keeps to the tool pages. *Tested*.
- **F6 A narrow page**: sections run to `max-w-7xl`; running text `max-w-prose`. *Tested*.
- **F7 Tight sections**: `py-16 sm:py-24` or more; the story's `py-16` and the hero's `pb-24` by the owner's word (D-UX-81). *Tested*.
- **F8 Lone links underlined**: the bar's, the foot's, titles' and pills' carry no line; one in a sentence does. *Tested*.
- **F9 Motion that does not end**: settle, tick and count only, loose to settled; what moves by itself stops within 5 s; the story lands whole with "Show it all"; nothing moves under reduced motion; a block lands once its top is in view; scrolled through, all shows. *Tested*.
- **F10 Words or figures only once moved**: headings and counted figures are in the page, as the engine gave them, from the start. *Tested*.
- **F11 A tool two taps away**: every tool in the top bar, in the first screen. *Tested*.
- **F12 A one-line foot**: it links every tool, says what happens to the figures, the name large on a ledger rule. *Tested*.
- **F13 Another order**: hero, story, tools, uses, figures, try, closing (D-UX-78). *Tested*.
- **F14 Anything from another site.** *Tested*.
- **F15 A heavy page**: home 168 KB unzipped (14-10-2026, D-UX-81), cap 170 KB. *Tested*, printed.
- **F16 Another's own**: the reference's words, images, footage, logo, font or code; a custom cursor; a hijacked scroll. The critic's.
- **F17 Shadows**: only paper (`shadow-paper`) casts one. *Tested*.
- **F18 Faint tags**: a tag under 4.5:1 on its fill as it comes into view, a fade counted, light and dark (D-UX-81). *Tested*.
- **F19 Tab against the eye**: the next control in the page's order sits left in the same row, or above in the same column, at 360, 1024 or 1280 (WCAG 2.4.3; D-UX-81). *Tested*.

Colour: ink, ledger red (the margin rule only, never a figure) and marigold (highlighter, ticks, glow), one highlight per screen; the critic's. Principle 6 yields: two ink pills may share a screen, never an accent fill; principle 10 yields for the glow (never behind a figure, still under reduced motion).

## Tokens (`site/src/global.css`)
A token is a role, needing no `dark:` twin. New work uses tokens only: the site check counts raw palette classes (`text-slate-600`) and arbitrary values (`text-[11px]`) and fails if either grows (`scripts/design-baseline.json`); both stand at nil from UX6.

Tokens and their use: `canvas` the page; `surface` a panel set off from it; `field` inside a field; `ink` / `ink-muted` text / hints and second lines; `line` dividers that only group (never a control's edge); `edge` a field's edge; `accent` / `on-accent` / `accent-hover` the chosen option (on the tool pages) / its text; `link`; `focus` the ring, 2 px, offset 2 px; `good` `warn` `bad` (+ `-tint` grounds) meets, provisional or a caution, misses or wrong; `stage` / `on-stage` the closing panel / its text; `spark-1` to `-3` the fields' dashes only (ink, red, marigold); `desk` `paper` `margin` `marigold` the ink desk, paper, the ledger red, the highlighter.

Ratios: `node scripts/design-review.mjs --tokens` (every pair but `line` at least 3.5:1, on surface and the tints too). Colour never carries meaning alone: a miss says "Misses" in words.
- **Type**: F1 and F2; 16 px for body and fields (it stops phones zooming); 14 px (`text-sm`) for hints, second lines and table cells; 12 px (`text-xs`) only for labels in a chart. Figures in tables: `tabular-nums`, right-aligned (GOV.UK Table).
- **Space**: Tailwind's 4 px scale; use 1, 2, 3, 4, 6, 8, 10, 12 (4 to 48 px). Related things sit closer than unrelated ones (Gestalt proximity).
- **Radius**: `rounded-control` (6 px) for fields, `rounded-card` (8 px) for panels, `rounded-full` for buttons (F4) and status pills.
- **Motion**: never needed to understand anything; F9; the moves in `docs/DESIGN-MOTION.md`.

## Shared parts (`site/src/fields.tsx` and its neighbours)
- **Field** (`TextField`, `INPUT`): label above, hint between label and field, the field 44 px tall with a 3:1 edge, the read-back or error under it. Never a placeholder as the label or the only hint (NN/g, "Placeholders in form fields are harmful", 2014); a format example ("like 12 L") may sit in the field only where a read-back under it confirms what was understood. An error says what is wrong and how to fix it, beside the field (GOV.UK).
- **Choice** (radio cards): one question, the options as whole clickable cards; the chosen card takes the accent edge.
- **Buttons**: pills (F4); `FILLED`, in ink, the page's main act, one a screen; `BUTTON` for the rest; a text link for moving about.
- **Table**: a table at 640 px and wider, cards below; numbers right-aligned; the total last and bold.
- **Drawer and "Why?"**: closed `<details>`, opened by a tap; never holds a field the default path needs.
- **Download row**: the formats in a row with what each is for; provisional until what it needs is in, and says so.
- **Notice**: a line on the `warn` or `bad` tint, in words first.
- **Focus**: a control that removes or replaces itself ("Make it viable", "How far can sales fall?") moves the focus to what replaces it, a box with `tabIndex={-1}` focused after the render; the design check fails a state whose last step leaves the focus on the page (WCAG 2.4.3; lesson 1).
- **Targets**: a link that stands alone (not in a sentence) and every `<summary>` at least 24 px tall (`min-h-6`; global.css gives it to summaries); a sticky band leaves a `scroll-padding-bottom` of its height, so Tab never stops under it (WCAG 2.5.8, 2.4.11; lesson 1).

## Page templates
Tool pages: `docs/DESIGN-SITE.md`. Home: FinSight's order (F13); each tool's words are `site/src/site.ts`'s `what` and `gives` (D-UX-65).

## States, the critic's checklist
Each tool is reviewed empty, partly filled, provisional (a fact missing), with an error, with a result, missing a default benchmark ratio, an optional input empty, at the download, with focus and hover; at 360 px and on a desktop, 1024 too for a change in `lg:`, light and dark. `npm run design-review -- /dscr/` drives the states listed in `scripts/design-review.mjs` and prints what it measures; screenshots (`--shots <dir>`) only for pages a change touches.

## Measured checks (`scripts/design-checks.mjs`, in the site check)
On every page at 360 and 1280 px, light and dark: axe-core (WCAG 2.2 A and AA), text 4.5:1 and large 3:1, edges and focus 3:1, targets 24 px, 44 px on a phone, every control by Tab, the focus kept and never under a sticky band, no sideways scroll at 320 px, still under reduced motion, the token ratchet. What they cannot see goes to the critic.

## Acceptable and unacceptable
- Acceptable: the DSCR's verdict in a sentence with the average and the lowest year beside it, the years marked against the target. Unacceptable: the verdict only as a colour, or below the table.
- Acceptable: "Short by Rs. 4,19,502 of cash to pay the loan" on the bar it explains. Unacceptable: a legend under the chart naming the bar's colours.
- Acceptable: one filled "Make it viable", the rest outlined or links. Unacceptable: three filled buttons in a row.
- Unacceptable anywhere: `text-[11px]`, a `#hex` class, `outline-none` without a ring, a raw palette class.

## How the team works
Each agent reads this file and the open lessons. The designer offers two or three options when the choice is the owner's and builds with the tokens and parts; the critic reviews alone, ranks findings and checks each fix; the writer puts words plain against `docs/LOAD-MEASURE.md`; the researcher turns test notes into ranked findings. A recurring finding or the owner's rule becomes a lesson; accepted, it moves here. Agents never merge.
