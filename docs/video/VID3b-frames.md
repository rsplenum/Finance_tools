# VID3b: the DSCR film, seed A, in five style frames

02-11-2026. The owner's answers to VID3a (D-UX-299): seed A, "Find it first"; yes to F1 to F8, with F2's hero
at a fifth of the shorter side (D-UX-297); the social copy with effects only, no music. Made in the studio
(rsplenum/video-studio, `vid3b-frames`): `node studio.mjs still videos/dscr-frames` writes the ten PNGs into
`output/stills/` and passes all 50 checks (figures, the frame's edge, F2's three, at each size). The scene is
`scenes/dscr-frames/index.html`; its tempo and chapters are in `videos/dscr-frames/video.json`.

## 1. One line, one word, one mark
- Line: one weak year can stop a loan, and the tool finds it before the bank does.
- Word: WEAKEST. It lands in the signature and stays through the proof while its year changes under it.
- The opening asks what the ending answers (F7): "WHICH YEAR could stop your loan?" and "FOUND before the
  bank did."
- The mark: a marigold ring. It hunts across the years, locks on the weakest, hunts again after the change,
  then flies into the payoff as the O of FOUND. It is our own device, not the references'.

## 2. The five frames (each at the moment its chapter holds)
| Chapter | To read (at most 3) | Hero's ink, portrait / landscape | The picture | Figures, from `scene.json` |
|---|---|---|---|---|
| 1. Hook | WHICH YEAR · could stop your loan? | 113 / 118 px | the six years as bars, no target, no labels; the two strong years run off the top (D-UX-298). The viewer hunts for the weak one before anything is named (F1) | none |
| 2. Problem | 1.25 · The bank's target, in every year. | 160 / 131 px | the dashed target in marigold; the four years under it in red | `level.text`; `rows[].typed.meets` |
| 3. Signature | WEAKEST · 2030-31 · 1.00 against 1.25 | 109 / 118 px | the ring locked on 2030-31, the rings it passed fainter, the other red years dimmed | `rows[weakest.typed].label`, `.typed.text` |
| 4. Proof | WEAKEST · 2033-34 · +31 instalments: 1.30 against 1.25 | 109 / 118 px | nine years, all over the target; a faint ring where it stood (2030-31), the lock on 2033-34 | `fix.move`, `rows[weakest.fixed].label`, `.fixed.text` |
| 5. Ending | FOUND · before the bank did. · DSCR statement | 134 / 118 px | the ring as the O; the years have become the statement in their column: its title and its signatory, date and place lines | `statement.title` |

Each size is composed on its own (§3 of the path). Landscape: the hook and the problem share one space, the
words above and the years across the foot; the cut opens two columns, words left and years right, kept to the
end. Portrait: words above, years below; the cut puts the years on top, where the statement rises at the end.

## 3. Tempo and beat sheet
**96 bpm**: a beat is 0.625 s and a bar of four 2.5 s, so the 30-second master (D-UX-292) is 12 whole bars,
48 beats. Chapters run 2, 2, 3, 3 and 2 bars (`chapters` in `video.json`, in beats). One hard cut, on the beat
(F3 allows four); no dark frame (F4 allows one). Sound is for the social copy only (F8).

| Bar.beat | s | On screen | Effect (social copy) |
|---|---|---|---|
| 1.1 | 0.00 | The six years rise from the foot, an eighth (0.31 s) apart; no target yet | a soft tick each |
| 1.3 | 1.25 | WHICH YEAR rises through a mask | a low knock |
| 2.1 | 2.50 | "could stop your loan?" slides up; held to 5.0 s | |
| 3.1 | 5.00 | The question leaves; the dashed target drops and settles at its height | a thud |
| 3.2 | 5.63 | 1.25 arrives whole beside it (F6) | |
| 3.3 | 6.25 | "The bank's target, in every year." | |
| 3.4 to 4.3 | 6.88 to 8.75 | The four years under the target turn red, one a beat, left to right; held to 10.0 s | a tick each, falling |
| 5.1 | 10.00 | **The cut**: two columns; the ring appears on 2026-27 and hunts on eighths across the six years and back; motion blur on each hop | a tick each hop |
| 6.1 | 12.50 | The ring locks (its stroke 3 to 7 px) and WEAKEST lands, scaled to fill its line; the other red years dim | **the lock**: a hard click and a low thump, the film's one sound |
| 6.3 | 13.75 | 2030-31 slides in, red | |
| 7.1 | 15.00 | "1.00 against 1.25"; held to 17.5 s | |
| 8.1 | 17.50 | "+31 instalments:" arrives in marigold where the figure was | a soft chime |
| 8.3 | 18.75 | The six years spread into nine and rise over the target, each turning from red to navy as it crosses | a rising run of ticks |
| 9.1 | 20.00 | The ring hunts again, on sixteenths, across the nine | quick ticks |
| 9.3 | 21.25 | It locks on 2033-34: the year swaps from 2030-31 (red to navy) and "1.30 against 1.25" arrives whole; held to 25.0 s | the lock |
| 11.1 | 25.00 | The ring flies into the hero as the O of FOUND; WEAKEST's letters fall away; the nine years fold into the statement, which rises in their column | the lock, softer |
| 11.3 | 26.25 | "before the bank did."; held to 30.0 s, the sheet settling with its one shadow | the last bar silent |

Each text stays at least its words ÷ 3 s (F3): the shortest margin is "could stop your loan?", 2.5 s on screen
for 1.3 s of reading.

## 4. Type and colour
| Role | Face | Size (font px, portrait / landscape) |
|---|---|---|
| Hero | Anek Latin 800, 75% width, capitals, line height 0.82, one line (two in the portrait hook) | 164 to 240 / 176 to 196; ink 109 to 160 px, at least a fifth of the shorter side (108 px) |
| A year | Anek Latin 700, 75% width | 72 / 78 |
| A line | Figtree 600, sentence case, its figure in 800 | 30 (34 at the ending); never under 22 (D-UX-286) |
| The statement's title | Figtree 700 | 30 |

Paper #F4EEE3, navy ink #1F2547, marigold #B07A0C for the target, the ring and the change, red #A3322A only
for a year under the target, the statement's sheet #FFFDF8. Marigold on the paper is 3.2:1, so it carries only
large or bold text. Caladea, look-paper's serif figures, is left out (F4: one display face), and so are chapter
labels: the signature and the proof already show three things to read.

## 5. Each claim, checked against the engine
- The export was run again from the engine (`scripts/video-figures.mjs dscr`): identical to the studio's
  `scenes/dscr-middle/scene.json`.
- Hook: "could stop your loan" is the bank's question in every year (`story.ts`, "The bank's question"), and at
  60 instalments four years fall below it; "could", never "will".
- Problem: 1.25 is `level.text`, "target" the site's own word (`level.label`); the four years are 2027-28 to
  2030-31 (`typed.meets` false).
- Signature: 2030-31 is `rows[weakest.typed]`; a second computation, 3,21,236 ÷ 3,20,320 = 1.0029, gives 1.00.
- Proof: "+31 instalments" is `fix.move` (D-UX-282), 91 − 60 = 31. At 91 instalments the loan runs nine years
  and every one meets 1.25; the weakest is 2033-34 at 1.30 (3,14,983 ÷ 2,41,752 = 1.3029). At 60 instalments
  2033-34 was not a year of the loan, so the film never says the change lifted it: the ring moves to it
  (D-UX-303). 2030-31 itself rises to 1.39.
- Ending: "Found before the bank did." holds because the borrower runs the tool before applying (VID3a §2).
  The sheet carries only what every copy has: the title and the signatory, date and place lines
  (`statement.lines[2]`); no chart, since the statement has none, and no lines standing for text (D-UX-290).
- No number counts (F6); no time is shown (F7).

## 6. For VID3c
The kit reads `bpm` and `chapters` from `video.json` and writes the cue sheet from §3; the type moves are the
mask reveal, the word swap and scale to fill; blur goes on the hunt's hops and the spread. The signature
(bars 5 to 7, 10 to 17.5 s) is the five-second test, silent and with its effects. The effects are made in code
(ffmpeg's tones and noise) unless the owner names a library, each with a register line (source, licence,
purpose). The proof's spread from six years to nine is the hardest move: draft it first.
