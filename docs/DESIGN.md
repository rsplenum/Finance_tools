# Design system (DT1, D-UX-58)

What every page is held to, read whole by the designer and the critic (`.claude/agents/`). AI agents have no taste of their own: the look comes from these rules, the measured checks, the usage numbers and the owner's judgement of the preview link. A rule stays only with its evidence; a "law" without a source counts for nothing. The owner's input behind it, with the rows that do not hold: `docs/design-inputs/cognitive-matrix.md`. Proposed rules wait in `docs/DESIGN-LESSONS.md` until accepted. The site is Astro, Preact and Tailwind 4; the tokens are in `site/src/global.css`.

**Reference sites** (the owner's matrix, 13-10-2026; the owner may name others, `docs/OWNER.md`): GOV.UK for forms, questions and errors; Our World in Data for labels on charts and one colour per thing; Linear for speed and quiet dark surfaces; Stripe's docs for an explanation beside what it explains; ciechanow.ski for a control beside its effect. Borrow their patterns, never their look. In order: reuse a pattern here, adapt one, invent only when none fits, and test a new one before it is reused.

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
10. **No decoration that carries no meaning**: no shadow, gradient, blur or icon that tells nothing. Friction: the eye spends effort on it. Evidence: Tufte's data-ink principle (1983); GOV.UK uses no decorative elevation.
11. **No pure black behind white text in dark mode** (the canvas is slate-950). Evidence: Material Design, "Dark theme" (dark grey over black); a guideline, not research.
12. **Plain words on screen**, the owner's words; a CA's terms in the documents. Evidence: GOV.UK, "Writing for GOV.UK"; LESSONS-CARRIED §1.

Not rules, for want of evidence: rounded corners read faster; a 1 px border with a shadow for depth; a fixed 8 px grid over the 4 px scale.

## Tokens (`site/src/global.css`)
A token is a role, not a colour, and needs no `dark:` twin. New work uses tokens only: the site check counts raw palette classes (`text-slate-600`) and arbitrary values (`text-[11px]`) and fails if either grows (`scripts/design-baseline.json`); UX2 to UX4 bring both to nil, then the check asks nil.

| Token | Use | Light | Dark |
|---|---|---|---|
| `canvas` | the page | white | slate-950 |
| `surface` | a panel set off from the page | slate-50 | slate-900 |
| `field` | inside a field | white | slate-900 |
| `ink` / `ink-muted` | text / hints and second lines | 17.8 / 7.6:1 | 18.4 / 13.6:1 |
| `line` | dividers that only group (never a control's edge) | slate-200 | slate-800 |
| `edge` | a field's edge | 4.8:1 | 7.7:1 |
| `accent` / `on-accent` / `accent-hover` | the main action and the chosen option / its text | 5.4:1 | 10.8:1 |
| `link` | links | 7.5:1 | 13.8:1 |
| `focus` | the focus ring, 2 px, offset 2 px | 3.7:1 | 10.8:1 |
| `good` `warn` `bad` (+ `-tint` grounds) | meets, a caution, misses or wrong | 7.1, 9.1, 6.4:1 | 14.4, 16.2, 10.5:1 |

Ratios on canvas, measured by `node scripts/design-review.mjs --tokens` (every pair but `line`, which marks no control, is at least 3.5:1, on surface and on the tints too). Colour never carries meaning alone: a miss says "Misses" in words.
- **Type**: the system font; 16 px for body and fields (16 px also stops phones zooming); 14 px (`text-sm`) for hints, second lines and table cells; 12 px (`text-xs`) only for labels inside a chart. Headings: h1 `text-2xl` (`sm:text-3xl` on the home page), h2 `text-lg`, h3 `text-base`, all `font-semibold`. Figures in tables use `tabular-nums`, right-aligned (GOV.UK Table, numeric cells). WCAG sets no minimum size; these are the house sizes.
- **Space**: Tailwind's 4 px scale; use 1, 2, 3, 4, 6, 8, 10, 12 (4 to 48 px). Related things sit closer than unrelated ones (Gestalt proximity).
- **Radius**: `rounded-control` (6 px) for fields and buttons, `rounded-card` (8 px) for panels, `rounded-full` for status pills. For consistency only.
- **Motion**: none needed to understand anything; 150 ms at most; none under reduced motion (global.css).

## Shared parts (`site/src/fields.tsx` and its neighbours)
- **Field** (`TextField`, `INPUT`): label above, hint between label and field, the field 44 px tall with a 3:1 edge, the read-back or error under it. Never a placeholder as the label or the only hint (NN/g, "Placeholders in form fields are harmful", 2014); a format example ("like 12 L") may sit in the field only where a read-back under it confirms what was understood. An error says what is wrong and how to put it right, beside the field (GOV.UK Error message).
- **Choice** (radio cards): one question, the options as whole clickable cards; the chosen card takes the accent edge.
- **Buttons**: `FILLED`, the main action, one a screen, 44 px tall on a phone; `BUTTON`, outlined, for the rest; a text link for moving about.
- **Result panel**: the answer first in words and one figure, then its status pill (provisional, meets, misses).
- **Table**: a table at 640 px and wider, cards below; numbers right-aligned; the total last and bold.
- **Drawer and "Why?"**: closed `<details>`, opened by a tap; never holds a field the default path needs.
- **Download row**: the formats in a row with what each is for; provisional until what it needs is in, and says so.
- **Notice**: a line on the `warn` or `bad` tint, in words first.

## Page templates
- **Tool page** (DSCR, CMA, estimate, report): h1 and one line of what it gives; the default questions; the answer; the tables; More options (closed); the download. One column, `max-w-3xl`.
- **Home**: what each tool gives in one line each, linked.

## States, the critic's checklist
Each tool is reviewed empty, partly filled, provisional (a fact missing), with an error, with a result, and at the download, with focus and hover on its controls; at 360 px (the common Indian Android width) and on a desktop, light and dark. `npm run design-review -- /dscr/` drives them and prints what it measures as text; screenshots (`--shots <dir>`) only for the pages a change touches. A page's states are listed in `scripts/design-review.mjs`.

## Measured checks (`scripts/design-checks.mjs`, in the site check)
On every page at 360 and 1280 px, light and dark: axe-core with no WCAG 2.2 A or AA violation; text at 4.5:1 and large text at 3:1 (WCAG 1.4.3); a field's edge and the focus ring at 3:1 (1.4.11, 2.4.7); every target at least 24 by 24 px or spaced (2.5.8); fields and accent buttons 44 px tall on a phone (2.5.5, AAA, as a house rule); every control reached by Tab (2.1.1); no sideways scroll at 320 px (1.4.10); nothing moving under reduced motion (2.3.3); the token ratchet. A defect the checks cannot see goes to the critic.

## Acceptable and unacceptable
- Acceptable: the DSCR's verdict in a sentence with the average and the lowest year beside it, the years marked against the target. Unacceptable: the verdict only as a colour, or below the table.
- Acceptable: "Short by Rs. 4,19,502 of cash to pay the loan" on the bar it explains. Unacceptable: a legend under the chart naming the bar's colours.
- Acceptable: one filled "Make it viable", the rest outlined or links. Unacceptable: three filled buttons in a row.
- Acceptable: a hint under the label ("Leave empty if none."). Unacceptable: the same hint as greyed text inside the field.
- Unacceptable anywhere: `text-[11px]`, a `#hex` class, `outline-none` without a ring, a field edge of slate-300.

## How the team works
The designer (`.claude/agents/designer.md`) reads this file and the open lessons, proposes two or three options when the choice is the owner's, and builds with the tokens and shared parts. The checks run. The critic (`.claude/agents/critic.md`) reviews on its own, ranks each finding blocker, significant or polish, and checks that each fix works. A finding that recurs, or a rule the owner states, becomes a lesson; an accepted lesson moves here and leaves the queue. The owner sets the direction and judges the preview link. The agents never merge.
