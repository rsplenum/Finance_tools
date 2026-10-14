# FinSight's own look (D-UX-68 to D-UX-70; AG2 and AG3)

The owner, 14-10-2026, on AG2's extras and the five tradeoffs: accepted, and "Instead of a DSCR story we can do a project report story", "no compromise on the look and feel of the site. The limits can be reasonably adapted to do justice with the new look and feel and new design language", "we need to make it our own not a replica of antigravity.google. So think hard on how we can do that." Then, on a second source (a note on the look of Accounting Stuff's video "Income Statement: Explained in (Almost) 2 Minutes!", YouTube; the note was read, not the frames): "we need fusion of these aesthetics ... to arrive at our own unique design language."

## Two sources, one language
- **From antigravity.google: space.** Large type, wide sections, pills, restraint; a living field of marks; motion that stops; the dark rounded frame; the name in the foot.
- **From the video: paper.** A statement as a card with depth on a deep ground; a statement's own marks (brackets, single and double rules); the yellow highlighter; steps numbered and shown in turn; bold caps for short labels.
- **Ours: the bridge.** Neither goes from one to the other, and that is our work: a borrower's loose figures put in order into a statement a lender reads. So marks fall from the field and settle onto paper. The reference floats; ours has weight. Every motion goes from loose to settled, and it ends (F9). A part that does not serve that sentence is cut; the critic judges each part against it. Nothing of either source goes in the repo: no words, frames, code, font or footage.

## The load test (D-UX-70)
The owner, 14-10-2026, on a general analysis of the video's design by laws of perception: "It is us (you and I) who has to adapt this analysis to our purpose and take only the design elements that bring our point across to the user with minimal or zero cognitive load."

Our point: *your figures, put in order, and whether they clear.* The critic asks two things of every part: does it go from loose to settled, and if it gives the reader something to read, does it make that point quicker to see? A part that fails is cut. What asks nothing of the reader (the glow, the foot) is judged by the first question alone: zero load is not zero beauty. Each principle is taken only in our form, with its plain reason (the laws are not quoted):

| Principle | Our form |
|---|---|
| A figure stands clear of its ground | One thing to read per screen, the figure, with the most contrast; nothing textured or moving behind text |
| Colours from opposite families rest the eye | Ink and marigold sit opposite (blue and yellow), so marigold reads at once on ink. Each colour means one thing: ink the ground, marigold "look here, it is met", red the margin rule |
| A visible grid saves mapping | The ruled lines, and one column plan for every card: the label on the left, the amount always in the same right-hand column, learnt once |
| A bounded task holds attention | No timer: the size of the task shown instead, "1 of 5" on the story, the number of questions on a tool's card where that number is fixed; a time only if measured with people |
| A shadow reads as height | One shadow for all paper |
| The eye follows direction | Every motion ends at the figure that matters: marks fall toward it; the line of reading ends at the amount |
| Few new things at once | One card per step; at most three figures move (count or tick) in a step; a card that lands still counts as one |
| Short bold labels scan fast | Caps for labels of one to three words only |
| Equal-width digits keep columns still | Tabular figures wherever a figure stands in a column |
| The one different thing is remembered | One marigold highlight per screen; the double rule is not a highlight |
| A change of scene resets attention | The change from the light page to the ink desk; never a flash or a sound |
| A picture beside a word helps memory | The tool cards show the real thing in line drawings; the story's cards keep words, as a lender's page does |

## The rules of the look
1. **The ledger rule.** The ruled lines and double margin rule of an Indian account book, drawn as thin lines from tokens: sections part on a ledger rule, the ink desk is ruled. Lines only: no paper texture, no picture of a book.
2. **Paper on ink.** The page is light and airy (the space). The deep ink desks (the story, two ways in) give the rhythm. On them the statement is paper: white rounded cards with a soft shadow. Only paper casts a shadow; everything else stays flat. In dark mode the page turns ink and the cards stay paper, a little dimmed: a document is always paper.
3. **Ink, ledger red, marigold.** Indigo ink (the desks, the dark mode), ledger red (the margin rule only), marigold (the highlighter, the settling marks, the glow), in place of the spark tokens' Tailwind teal, sky and indigo. Each pair tested for contrast in light and dark. Red never touches a figure: it would read as a loss.
4. **Figures are the heroes, in a statement's marks.** Tabular figures, Indian grouping (12,00,000), set large. A deduction in brackets with "Less:" on its line, a single rule under a subtotal, a double rule under a total: on home's story only; the downloads keep their form unless `lender-documents` changes it with its own D-id. The h1 is whole and still from the start.
5. **Three motion verbs, no others.** *Settle*: a mark or a card falls onto a rule and comes to rest with a small spring, 600 to 900 ms. *Tick*: a line drawn when a rule is met: the double rule under a balancing total, or the marigold highlighter across a figure that clears its line (the DSCR over 1.20). *Count*: a figure runs to the engine's value in Indian grouping, the value in the page from the start (F10). No floating, no orbiting the pointer, no typing.
6. **The hero's field falls.** The dashes drift, then fall and settle into ledger rows behind the words; the pointer stirs them and they settle back.
7. **Two ways in gather into what each gives.** For borrowers, the dashes rise into bars and the highlighter ticks the ones that clear the 1.20 line; for CAs and DSAs, they settle into the rows of a statement. Settled within 5 s; drawn at rest under reduced motion.
8. **The glow.** A still gradient in ink, red and marigold behind each tool's picture only, never behind a figure; no blur that moves (cheap phones). Principle 10 yields there alone. The tool pictures are our own line drawings in ink (a building site, a shop or works), not photos.
9. **The story is the project report's** (AG3). Fictional case R (`tests/report.test.ts`, worked by hand): what the borrower types, then the report's pages landing as paper on the ink desk, numbered (1) to (5): the cost of the project and how it is financed, the profit and loss, the cash flow, the balance sheet balancing (tick), the DSCR (count, then tick). Every figure the engine's, held to case R's hand working by a test like `tests/home-story.test.ts`. Five steps at most on a phone; the desk is the dark rounded frame, in the film's place; "Stop and show it all" stays.
10. **Our order.** The borrower's path: hero, story, the four tools, who it is for, what happens to your figures, two ways in, the rules behind the figures, closing. F13 tests this order, not the reference's.
11. **The foot.** FinSight's letters drop and settle onto a ledger rule (the reference lifts them).
12. **A voice in type.** Figtree stays for text. Try Ek Type's Anek (Indian make, Latin and Devanagari, SIL OFL) for headings and figures: wide for the large figures, condensed in caps for labels of one to three words (never a sentence or a button). Keep it only if the critic and the owner find it better. No serif: a fashion serif says luxury, not lending, and its hairlines break on cheap screens. `npm run hosts` before fetching it.
13. **One busy thing, one highlight per screen.** The field and the cards never move on the same screen; the load test above holds for every part.
14. **Dropped.** From the reference: the typed headings and caret, the icon bubbles in an arc, the field that flees the pointer, the custom cursor, the language pill, the sideways card row where a grid reads better. From the video: the presenter, the countdown timer, the red flash and buzzer (sound never plays by itself), plaster and chalkboard textures (a faint still grain on the ink desk may be tried, kept only if the critic and the owner prefer it), the fashion serif, the stock footage.

## Limits, adapted to the look
F15's cap is set from the measured weight with a margin and recorded with its reason; the load measure's counts move only with a D-id (`docs/LOAD-MEASURE.md` §5); `docs/DESIGN.md` keeps 14 KB until UX4, its forbidden list rewritten as FinSight's rules (F10 holds for counted figures; F13 takes our order). On phones the notice line scrolls away with the page (UX3).
