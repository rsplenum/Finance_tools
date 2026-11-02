# VID3a: three stills of the DSCR film and the studio's measure

02-11-2026. The row from `VID3-path.md` §8: one still per seed (§7), portrait and landscape, drawn in code
from the engine's figures, and the measure (§6.1) with the gap table for VID2b's draft. Made in the studio
(rsplenum/video-studio #4): `node studio.mjs still videos/dscr-stills` writes the six PNGs into
`output/stills/`; `node studio.mjs measure videos/dscr-middle-c videos/dscr-middle-paper --draft --table`
prints the table below.

## 1. The stills
On the paper ground of F4 (look-paper's tokens: paper, navy ink, marigold, red only below the level),
Anek Latin condensed for the hero and Figtree for the words, both OFL and already bundled. Each still has
three things to read and one hero, and every figure is read from `scenes/dscr-middle/scene.json` (the
export of `story.ts`). The studio passes all 30 checks: figures, the frame's edge and F2, at each size.

- **A, "Find it first."** The years as bars under the dashed level 1.25. A marigold ring has hunted
  across them (its fainter rings stay on the years it passed) and stopped on the weakest. To read:
  WEAKEST (118 px of ink in landscape, 22% of the shorter side), 2030-31, "1.00 against 1.25".
- **B, "Seven answers."** A 7 at 66 to 71% of the shorter side, "answers." and the site's own line
  "Nothing more is asked." Beside them the statement builds itself: four answers already sit in the
  page as its lines, three are still falling in. The answers are texture, never text.
- **C, "Every kist."** Each year's cash is drawn as an open column with its kists as a solid block at
  the foot (DSCR = cash ÷ debt service, so the block is one unit tall in every year). In 2030-31 the
  column ends at the block, with nothing to spare. To read: kist (30%), "Each year's cash must carry
  its kists 1.25 times." and "2030-31: 1.00". Of the three, C takes the longest to read.

In A and C the two strong years (2.07 and 1.94) run off the top and fade. The scale stops at 1.36 times
the level, so the story stays at the level; no bar carries a value.

## 2. Each claim, checked against the engine and the site
- A: "one weak year can stop a loan" is the bank's question in `story.ts` ("1.25 times in every
  year"). At 60 instalments four years fall below it (1.09, 1.06, 1.03, 1.00), so the still draws all
  four in red, three of them pale, and rings the weakest (`weakest.typed`). The change to 91
  instalments lifts every year, 2030-31 to 1.39 and the weakest, 2033-34, to 1.30. "Found before the
  bank did" holds because the borrower runs the tool before applying.
- B: 7 is `scene.inputs.length`, the front door's seven answers (D-UX-10). It sits on the still's
  allow list with that reason. "Nothing more is asked." is `story.ts`:288. No time is shown, since
  none was measured.
- C: a DSCR of 1.00 means the cash covers its kists exactly once. The still therefore says "must carry
  1.25 times", never "cannot carry". The export holds no instalments per year, so C draws no monthly
  ticks; if C is picked, VID3b adds them to the export from the engine's schedule.

## 3. The gap table (the references beside VID2b's 6-second drafts)
| | Inference film | Payments film | dscr-middle-c portrait | dscr-middle-c landscape | dscr-middle-paper portrait | dscr-middle-paper landscape |
|---|---|---|---|---|---|---|
| Length, rate | 26.05 s, 30 fps | 15.06 s, 60 fps | 6 s, 30 fps | 6 s, 30 fps | 6 s, 30 fps | 6 s, 30 fps |
| Hard cuts | 3, at 3, 4, 4.5 s | 4, at 7.08, 7.12, 13.35, 13.37 s | none | none | none | none |
| Cuts off the beat | 0.03, 0.03, 0.03 s (beat at 120 bpm) | 0.25, 0.21, 0.10, 0.08 s (beat at 88.2 bpm) | no beat | no beat | no beat | no beat |
| Frames still | 71% | 36% | 65% | 64% | 73% | 74% |
| Holds (mean, longest) | 11: 1.44 s, 2.97 s | 3: 0.43 s, 0.47 s | 3: 1.06 s, 1.47 s | 3: 1.07 s, 1.47 s | 4: 0.89 s, 1.43 s | 4: 0.9 s, 1.43 s |
| Tallest band of ink | 11% of the shorter side | 52% of the shorter side | 6% of the shorter side | 7% of the shorter side | 6% of the shorter side | 5% of the shorter side |
| Things to read at once | 1 to 3, by eye (VID3-path §1) | 1 to 4, by eye | 29 | 29 | 29 | 29 |
| Tallest text (page) | – | – | 32 px, 6% | 26 px, 5% | 32 px, 6% | 27 px, 5% |
| Smallest text (page) | – | – | 12 px | 12 px | 12 px | 12 px |
| Texts gone before read | – | – | 1 | 1 | 1 | 1 |
| Colours covering 90% | 3 | 7 | 13 | 14 | 5 | 5 |
| Dark frames | 0% | 16% | 100% | 100% | 0% | 0% |
| Sound | -20.5 dB mean, -19.5 LUFS | -17 dB mean, -14.3 LUFS | a silent track | a silent track | a silent track | a silent track |

The references' "things to read" were counted by eye (§1); the measure counts our pages from the DOM,
one per block of text. The ink band is the median frame's tallest band of rows holding ink, shapes
included. Pages are measured four times a second.

What the table says: our draft fails F2 three ways (29 things to read against 3, a hero at 5 to 6% of
the shorter side against 20%, text down to 12 px against 22) and F3 once (the weakest-year caption
leaves after 2.25 s of the 3.33 s its words need). It passes F6 and the cut limit. The direction gap,
§2 of `VID3-path.md`, holds; the stills meet F2 at both sizes.

## 4. For the owner (`docs/OWNER.md`)
Pick a seed; answer F1 to F8; and say yes or no to F2 measured against the shorter side. A fifth of
a portrait frame's height is 192 px of ink, and no 7-letter word fits that in 540 px of width.
