# FinSight's own look (D-UX-68; AG2 and AG3)

The owner, 14-10-2026, on AG2's extras and the five tradeoffs: accepted, and "Instead of a DSCR story we can do a project report story", "no compromise on the look and feel of the site. The limits can be reasonably adapted to do justice with the new look and feel and new design language", "we need to make it our own not a replica of antigravity.google. So think hard on how we can do that."

antigravity.google stays a source of rhythm (large type, wide sections, pills, motion that stops), never a template. What follows is ours; the designer holds each item, the critic judges it.

## The idea: figures settle
The reference floats: its marks lift away from the pointer and its words type themselves. Our work is the opposite: a borrower's loose figures put in order, into a statement a lender reads. So our motion has weight. Marks fall and settle onto ruled lines, into columns, under a target line; every motion ends in order, and it ends (F9).

## The rules of the look
1. **The ledger rule.** The ruled lines and double margin rule of an Indian account book, drawn as thin lines from tokens: sections part on a ledger rule, the story's panel is a dark ruled page. Lines only: no paper texture, no picture of a book (weight; and it would look like any ledger app).
2. **Ink, ledger red, marigold.** Indigo ink (the stage and the dark panel), ledger red (the margin rule only), marigold (the settling marks, the glow), in place of the spark tokens' Tailwind teal, sky and indigo. Each pair tested for contrast in light and dark. Red never touches a figure: it would read as a loss.
3. **Figures are the heroes.** Tabular figures, Indian grouping (12,00,000) set large. The hero shows a figure being worked out. The typed heading and its caret go (they are the reference's): the h1 is whole and still from the start.
4. **Three motion verbs, no others.** *Settle*: marks fall onto a rule and come to rest with a small give, 600 to 900 ms. *Tick*: a line drawn when a rule is met (the 1.20 line, the balance sheet balancing). *Count*: a figure runs to the engine's value in Indian grouping, the value in the page from the start (F10). No floating, no orbiting the pointer, no typing.
5. **The hero's field falls.** The dashes fall from above and settle into ledger rows behind the words; the pointer stirs them and they settle back. Gravity, where the reference has none.
6. **Two ways in gather into what each gives.** In place of the reference's rings: for borrowers, the dashes rise into bars that clear the 1.20 line; for CAs and DSAs, they settle into the rows of a statement. Settled within 5 s; drawn at rest under reduced motion.
7. **The glow.** A still gradient in ink, red and marigold behind each tool's picture only, never behind a figure; no blur that moves (cheap phones). Principle 10 yields there alone.
8. **The story is the project report's** (AG3). Fictional case R (`tests/report.test.ts`, worked by hand): what the borrower types, then the report's pages assembling: the cost of the project and how it is financed, the profit and loss, the cash flow, the balance sheet balancing (tick), the DSCR. Every figure the engine's, held to case R's hand working by a test like `tests/home-story.test.ts`. Five beats at most on a phone; on the dark rounded ruled panel, in the film's place; "Stop and show it all" stays.
9. **Our order.** The borrower's path: hero, story, the four tools, who it is for, what happens to your figures, two ways in, the rules behind the figures, closing. F13 tests this order, not the reference's.
10. **The foot.** FinSight's letters drop and settle onto a ledger rule (the reference lifts them).
11. **A voice in type.** Figtree stays for text. Try one open display face of Indian make with Latin and Devanagari for headings and figures (Ek Type's Anek, SIL OFL), ready for Hindi later; keep it only if the critic and the owner find it better. `npm run hosts` before fetching it.
12. **Dropped from the reference:** the typed headings and caret, the icon bubbles in an arc, the field that flees the pointer, the custom cursor, the language pill; the sideways card row where a grid reads better.

## Limits, adapted to the look
F15's cap is set from the measured weight with a margin and recorded with its reason; the load measure's counts move only with a D-id (`docs/LOAD-MEASURE.md` §5); `docs/DESIGN.md` keeps 14 KB until UX4, its forbidden list rewritten as FinSight's rules (F10 holds for counted figures; F13 takes our order). On phones the notice line scrolls away with the page (UX3).
