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
- **Results land as paper.** The answer, and the statement or forms behind it, sit on `.paper` with `shadow-paper`, the
  only shadow (F17); in dark mode it is a sheet of ink a step above the page, never white (D-UX-91). A result is there at once, never settling in: it
  changes as the figures are typed.
- **The answer first.** On the default path the results follow its questions, before More options. A long page has an
  answer bar pinned to the foot: the answer as text, read out as it changes, and one 44 px arrow to the results
  (D-UX-84), never a long link lying over the fields.
- **Buttons:** pills at least 44 px (F4); one filled, in ink, for the page's main act (Download PDF); the rest neutral;
  never filled in the accent (F5).
- **The heading** (D-UX-94, after Zerodha Varsity's module head): the tool's place in caps ("Tool 1 of 4") beside
  home's drawing for the tool on its glow, still; the h1; one line of what the page needs, then what it gives.
- **Drawings:** the heading's, the foot's wordmark and the ledger rules only; the trailers stay home's.
- **Codes:** one channel a meaning, and no two meanings in near hues (`docs/DESIGN-MATHS.md`, the Extra codes count: nil).

## Downloads (PDF, Excel, Word)
Plain: the documents keep their own layout and type (`docs/DESIGN.md`, Documents; the `lender-documents` skill). The new
look never reaches a lender's page; a line left off a phone's cards stays in the document.
