# FinSight's look, page by page

`docs/DESIGN.md` holds the design system and FinSight's rules (F1–F19); `docs/design-reference/finsight.md` the brief. This
file says how the look lands on each kind of page (D-UX-82). A page in the new look sets `look="new"` in
`site/src/Base.astro` and is listed in `NEW_LOOK` (`scripts/forbidden-checks.mjs`), which holds F1–F12, F14, F17 and F19
on it; F13 (our order) and F15 (the weight cap) are home's alone.

## Home (`/`)
The pitch: the hero, the story with its trailers, the tools, the figures, the closing. It sets the type, the colours, the
drawings and the motion the other pages borrow. The owner's word (D-UX-83): it stands as the reference.

## Tool pages (`/dscr/`, `/cma/`, `/estimate/`, `/project-report/`)
- **Type:** the h1 in `text-hero`, each section's h2 in `text-section` with its ledger rule above; the line under the h1
  is body size in `text-ink-muted` (the lead size is home's pitch). Figures that answer use `figure`.
- **Colours:** tokens only, one channel a meaning (UX7, D-UX-104). The accent (`--link`) colours links only; a chosen
  option takes an edge in ink. Good, warn and bad colour the words for meets, provisional and misses, never a ground, an
  edge or a bar. No raw palette class (the ratchet in `scripts/design-baseline.json`).
- **The answer's state** (UX7): the answer, as the paper's heading where it is a sentence, carries a 4 px rule in ink,
  solid when final and dashed while provisional (`answerRule` in `site/src/fields.tsx`); the line under it says
  "Complete" after the auditor's tick (`Tick`), or what is still needed in the warning's words.
- **Ratios** (`site/src/Board.tsx`): a bar in ink against the benchmark's one line; a miss's gap dashed.
- **Inputs stay still.** Fields, choices and More options do not move, settle or draw. No box with a border on all
  four sides (F3): a group sits on `bg-surface`, a plan or a note takes one rule (`border-t-2` or `border-l-4`).
- **Results land as paper.** The answer sits on `.paper` with `shadow-paper`, the one shadow on a tool page (F17), in
  the quieter `--shadow-sheet` (`[data-tool]`, UX8); the statements and forms behind it are paper lying flat. In dark mode
  it is a sheet of ink a step above the page, never white (D-UX-91). It is there from load, never arriving: before the
  figures it is the answer's outline, "—" for each figure not yet known (never 0), each a link to its box (`Dash`), and
  one counter of what is still needed, opening to the links (`Counter`) (UX8, D-UX-106).
- **Side by side from 1024 px** (UX8): the questions left, the answer panel right, pinned below the header and
  scrolling inside itself (`answer-panel`, `grid-cols-tool`; `grid-cols-tool-grid` where the panel is 24 rem); the
  statements, the assumptions and the download run the full width below. A sticky panel sits in a wrapper spanning the
  questions' rows, so it stops before the next row. Under 1024 px one column, the answer after its questions.
- **One bottom-bar rule** (UX8): under 1024 px every tool has the answer bar pinned to the foot from load: the answer as
  text, read out as it changes, and one 44 px arrow to it (D-UX-84; `BAR`, `BAR_ARROW`). From 1024 px it keeps only its
  words for a screen reader (the estimate's line of what changed stays, for its Undo).
  On the DSCR, the report and the CMA its words come back at the foot while the panel is out of view, without the
  arrow; on a phone the arrow points where the answer is, ↑ or ↓ (UX9, D-UX-107; `AnswerBar`).
- **A box and its unit** (UX9): the unit inside the box, "Rs." before, "%", "years", "months" or "days" after; one hint
  line below that the read-back takes over; no placeholders, the example in the hint; a default that still stands reads
  "30 · assumed" (`TextField`'s `unit` and `assumed`). Fields side by side align label, box and hint (`grid-rows-subgrid`).
- **What is assumed** (UX9): one closed line "Assumed until changed: N" (D-UX-32) opening to a ledger, a row each of
  what, the value and Change to its box; the reasons behind "Why these" (`Ledger`).
- **The CMA's years** (UX9): the five years as columns across the full width from 1024 px, a card a year below, with the
  engine's gross and net profit, both totals and "Balances" or "Differs by Rs. X" under each; audited years under a solid
  rule, the estimate dashed, the projection dashed and lighter.
- **Empty folds** (UX8): a section that cannot be used yet is one line, its heading in body size (`Folded`); the foot's
  wordmark is small on a tool page.
- **One rule for figures** (UX8): full rupees in tables, "Rs." in the column head; a summary chip in lakh to two places,
  its unit in the group's head; a unit on every figure alone; a headline as precise as the figure, the estimate's
  rounded with its range as a bar and the exact figure beside it, as in the bill and the documents.
- **Buttons:** pills at least 44 px (F4); one filled, in ink, for the page's main act (Download PDF); the rest neutral;
  never filled in the accent (F5).
- **The heading** (D-UX-94, after Zerodha Varsity's module head): the tool's place in caps ("Tool 1 of 4") beside
  home's drawing for the tool on its glow, still; the h1; one line of what the page needs, then what it gives.
- **Drawings:** the heading's, the foot's wordmark and the ledger rules only; the trailers stay home's.
- **Codes:** one channel a meaning, and no two meanings in near hues (`docs/DESIGN-MATHS.md`, the Extra codes count: nil).

## Downloads (PDF, Excel, Word)
Plain: the documents keep their own layout and type (`docs/DESIGN.md`, Documents; the `lender-documents` skill). The new
look never reaches a lender's page; a line left off a phone's cards stays in the document.
