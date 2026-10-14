# antigravity.google, read for its structure (AG1, D-UX-66, D-UX-67)

Read on 13-10-2026 with Playwright at 390 and 1440 px, after the page had settled (it is built by script). Measured as text; the screenshots stayed in the session's scratchpad for the designer and are not kept. Nothing of Google's is taken: no words, images, video, logo, font or code. What is borrowed is the order of the sections, their rhythm and what each does for the reader.

## The reference, section by section
Heights in screens at 1440 px (390 px where it differs). Type: Google Sans Flex; display type at weight 450, tracking about -0.02em. Ink rgb(18, 19, 23), second lines rgb(69, 71, 77). Buttons are pills, about 10 by 24 px of padding, 44 to 47 px tall: ink filled, or a soft grey fill.

| # | Section | Height | What it does |
|---|---|---|---|
| - | Top bar | - | Logo, menus, one ink pill, a language pill; fixed, it steps out of the way while reading down. A one-line notice under it can be closed. |
| 1 | Hero | 1.0 (0.61) | A field of short dashes on a canvas that moves with the pointer; a small logo; the h1, 72 px (44 px on a phone), typed with a caret; one ink pill. |
| 2 | Film | 0.89 | A rounded light panel with a "play" pill: the product shown working. |
| 3 | Statement | 1.0 | A row of round chips, then one sentence at 54 px (34 px), typed. |
| 4 | Features | 3.1 | Four rows: a 42 px title as a link and a short text on the left, a picture of the feature on the right; a soft pill after the last. |
| 5 | Uses | 1.4 | A two-line heading and a line under it; a row of cards that slides sideways, with previous and next buttons. |
| 6 | Two ways in | 0.93 | Two columns: a small label, a heading, a grey line, a pill each. |
| 7 | Latest | 0.87 | A row of square cards: the newest posts. |
| 8 | Closing | 0.95 | A black rounded panel, coloured dashes, a white typed heading, white pills. |
| - | Foot | - | A line, columns of links, the name across the page in very large type, a bottom row. |

Motion besides: smooth scrolling taken over by script, a custom cursor, blocks rising into view.

## Ours (`site/src/pages/index.astro`, `site/src/home/`)

| # | Theirs | Ours (`data-ag`) | What it shows |
|---|---|---|---|
| - | Top bar | the new look's top bar (`Base.astro`) | FinSight; the four tools by their short names (on a phone, a second row); the theme; the ink pill "Start a DSCR"; the notice: CMA data, the newest tool. Steps away while reading down, back on the way up or on focus. |
| 1 | Hero | `hero` | Dashes in a ring around the words (`spark` tokens), drifting in over 2.4 s, then moving only away from the pointer; the h1 typed in 1.6 s; the answer in words (`data-answer`); the ink pill and a soft pill to the tools. |
| 2 | Film | `story` | In place of a film, a DSCR statement building from the seven answers: fictional case S (a firm; Rs. 4,50,000 this year, no growth; Rs. 12,00,000 at 12% for 5 years), the answers one by one, each year's bar against the 1.20 line, the engine's verdict, Make it viable's longer repayment (+20 instalments) and the bars again, meeting the target. Every figure is the engine's (`story.ts`), held by `tests/home-story.test.ts` to the hand working of `tests/dscr-plan.test.ts` and to `planCheck`. "Stop and show it all" ends it. |
| 3 | Statement | `statement` | Chips of what the tools give, drifting with the scroll; the sentence: worked out in your browser, from rules with their sources and dates, what you type not sent. |
| 4 | Features | `tools` | The four tools, one row each: the name as the link, `what` and `gives` (D-UX-65), and a picture made from the page's own facts: the story's bars, the estimate's five levels (`architect.json`), the report's three statements, the CMA's six forms. |
| 5 | Uses | `uses` | Four people and the tool each needs: a shop owner, a family building, a chartered accountant, a business renewing its cash credit. Cards scroll sideways; Previous and Next. |
| 6 | Two ways in | `try` | For borrowers (the DSCR, ink pill); for CAs and DSAs (the project report and CMA data, soft pill). No prices. |
| 7 | Latest | `checked` | The rule files behind the figures, newest first, each with its date and review-by date (`engine/data/*.json`). |
| 8 | Closing | `closing` | The `stage` panel, dashes drifting in, a typed heading, an on-stage pill and a soft one. |
| - | Foot | the new look's foot | "Loan papers, worked out."; the tools; what happens to the figures; FinSight across the page, rising a letter at a time; the year. |

Not taken: the custom cursor and the smooth scroll taken over by script (heavy, and against keyboard and phone users); the film (the story is lighter and shows our own figures); Google Sans (Figtree, open, of a like round geometric feel); the language pill (one language today). The forbidden list built from this reading: `docs/DESIGN.md`, "The forbidden list".
