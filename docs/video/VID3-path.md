# VID3: the path to the reference films' level

The owner, 02-11-2026: "We want to elevate our video production system to the level in the two videos,
my analysis or the md files may fall short so do your own analysis and chart a path to get where we want
to go." Read in full: the two films (made with Opus 5.5: an inference explainer, 26 s, and a payments
promo, 15 s), the owner's analysis and the VID3 package of eight md files. This file replaces the rows
VID2c to VID2e (D-UX-293). What VID2 built stays: the export (`scripts/video-figures.mjs`), the figure
checks (D-TECH-83), the every-frame checks (D-TECH-80), the studio's CI (D-TECH-82).

## 1. The films, measured

Measured with ffmpeg on the files: a hard cut is a scene score over 0.22; a frame is still when it
moves less than 0.35 of 255 on average at 64×36; colours at 3 bits a channel; the tallest text is the
tallest band of ink rows at 320×180. Our column is VID2b's DSCR middle (studio `videos/dscr-middle-c`
and `-paper`, 6 s drafts).

| | Inference film | Payments film | Our DSCR middle |
|---|---|---|---|
| Length, rate | 26 s, 30 fps (made at 1080p, its corner says) | 15 s, 60 fps | 6 s, 30 fps draft |
| Hard cuts | 3, at 3.0, 4.0 and 4.5 s, all on its 120-beat grid | 4, as two quick flashes (7.1 and 13.4 s) | none |
| Frames still | 71%; holds of 1.5 s on average, the longest 3.0 s | 37%; the character keeps breathing | 65% (C), 75% (paper) |
| Tallest text | about a quarter of the frame (WAITING) | a word across the frame ("Handled.") | 3 to 4% |
| Things to read at once | 1 to 3 | 1 to 4 | about 25 |
| Colours covering 90% | 3: white, navy ink, one violet | 7: white, black, one blue, greys | 14 (look C's glows), 5 (paper) |
| Dark frames | none | 16%: one black frame as punctuation | all (C), none (paper) |
| Sound | a bed under every second, mean −20.5 dB (−19.5 LUFS) | a bed under every second, mean −17 dB (−14.3 LUFS) | none (R5) |

The sound row was corrected in VID3a (D-TECH-89): the two films' levels had been swapped. The studio's
`measure` now prints this table itself (`VID3a-stills.md` §3).

## 2. What makes them work

1. **One idea, carried by one word, and the name is the idea.** WAITING is struck through and becomes
   WASTE., then *muda* (無駄, Toyota's word for waste), which is the product's name. The payments
   film's word is "Handled." Everything else serves that word.
2. **The viewer feels the problem before it is named.** The inference film opens on a chat box whose
   "Thinking…" timer climbs to 6.71 s: you wait too. The payments film whispers "psst…".
3. **One thing per frame, at size.** A word or a number fills the frame, alone. Data shows as texture
   (a grid of cells, a stream of tokens) that nobody is asked to read, with one large figure on it.
4. **Change happens inside one space.** Three or four hard cuts a film; everything else transforms.
   Motion comes in short bursts, then holds long enough to read.
5. **Restraint.** One accent on a light ground; dark once, as punctuation.
6. **Rhythm.** Cuts and hits sit on a beat grid and sound runs under every second. Silent, the beat
   still shows: the film moves in even steps.
7. **A payoff with wit, tied to the promise.** "Your film 26.000 s. Your answer 0.038 s. We were done
   before the logo was." The film measures itself.

Under it, craft: three typefaces with one job each (a heavy sans for the hero, a serif for the name,
small labels); a chapter label in a corner ("01 — THE WAIT"); motion blur on a fast move; one ownable
texture (the payments film's halftone character).

Our middle is right and careful, but it is a dashboard: 25 things at 4% height, no idea, no hero, no
sound. The machinery is not the gap: the studio already seeks every frame, renders both sizes at
60 fps and checks every figure. The gap is direction (1, 2, 7), composition (3, 5) and rhythm (4, 6).

## 3. Taken from the owner's analysis and the VID3 package

- Concept before code; three directions that differ in idea, not palette; stills before motion; a 3 to
  5 s test of the signature moment before a whole film; the DSCR film as the benchmark first.
- Judged as a viewer would: would it stop a scroll, is there one moment to remember, can someone say
  what the tool does after it, does the ending answer the opening.
- Portrait and landscape composed separately, never one cropped from the other.
- A transition keeps meaning: a stream becomes a timeline, a layer a line item, the picture the
  document.
- Truth: every figure traced from the frame to its engine field (D-TECH-83); a level is read, never
  typed; fixtures that must fail (a stray number, the wrong year, the wrong weakest year, a total that
  does not add up, text off the safe area, a missing asset); a before and after only from the engine.
- Nothing generated stands for a figure, a table, a logo, a stamp, a signature, a lender's mark or the
  product's screen; each asset gets a register line (source, licence, purpose).
- Silence or a clean render is never approval; one wrong figure fails a film, and so does a correct
  film that cannot be read.
- On the site: a poster first, the video loaded late, reduced motion respected, a text alternative.

## 4. Not taken, and why

- **Image and video models, and ChatGPT for art direction.** A session has none of its own: using one
  means a paid outside service, a key in the environment's settings and an allowed host. They drift
  from frame to frame, so no render comes back the same; their licences vary; and the references look
  drawn in code. Every frame is drawn
  in code (HTML, SVG, canvas) from the engine's figures; one made asset at most, later, if an idea
  needs it.
- **Blender, Three.js, WebGL.** The references reach their level flat.
- ~~**Eight AI roles, seven documents, eight stages, seven gates.**~~ Overturned by CD1 (D-UX-313): the
  four gates checked how a film was made, never whether its idea was worth making. Films now pass the
  `creative-department` skill's seven roles and three gates before and after production.
- **A second scorecard.** D-UX-291's stays, with §6's measures beside it.
- **"Premium international SaaS".** The market is India (D-BIZ-01); the viewer is a borrower or a DSA
  on a phone.
- **Numbers that count up**, which both references use: a climbing number shows figures the engine
  never made (D-UX-295).
- **"No commits or PRs without permission".** The repo's way stands: draft PRs, the owner merges.

## 5. The film grammar (proposed; the owner answers in VID3a, D-UX-294)

- F1. **One line, one word.** Each film's idea fits one line and one word carries it on screen. The
  first 3 s make the viewer feel the borrower's moment before naming it.
- F2. **One focus.** At most three things to read at once besides the brand; each chapter has one hero
  at a fifth of the frame's height or more; no text under 22 px (D-UX-286).
- F3. **Few cuts, long holds.** Chapters change by transformation; at most four hard cuts in 30 s;
  each hold lasts its reading time (D-UX-259).
- F4. **The paper the borrower takes to the bank is the ground.** Light, with navy ink, one accent
  (marigold) and red only below a level: R1's colours in a new balance; dark at most once. Our own
  reason, not the references': the film ends in the document, and dark ink on paper reads on a phone.
  Figtree for words and one display face for the hero (OFL and bundled; Caladea and Anek, with Indian
  scripts, are already in).
- F5. **A beat clock.** Each film has a tempo; chapter starts, cuts and hits fall on its beats.
- F6. **Numbers arrive whole**: at their value, by mask, slide or scale, never counting up (D-UX-295).
- F7. **A payoff that is true.** The ending answers the opening, with a smile if it can, and every
  claim in it is checked against the product; a time is shown only if measured.
- F8. **Two masters.** The site's film is silent with no audio stream (`VID2-script.md` §8); a copy for
  social media carries sound: effects on the beat, and music only on the owner's word (R5 says none,
  D-TECH-56).

Kept as they are: R2 (no monospace: a chapter label, if used, is Figtree), R3's springs, R4, R6 to R10,
the 30-second master (D-UX-292), the films on the tool pages (D-UX-288).

## 6. The studio's upgrades: the smallest set (D-TECH-86)

1. `node studio.mjs measure <video>`: §1's table for any render, beside the references' numbers: cuts
   and their distance from the beat, frames still, holds, colours covering 90%, dark share, and from the
   page itself the things to read per frame and the tallest text. F2, F3 and F6 become checks; the
   rest prints.
2. A beat clock in `video.json` (`bpm`; chapters and keys in beats) and a cue sheet from the same clock.
3. A kinetic type kit in `scenes/_shared/` on the Web Animations API: mask reveal, strike-through,
   word swap, split, scale to fill.
4. Motion blur by averaging sub-frames, on fast moves only; the same frame every render.
5. Sound for the social copy: effects (and a bed, if allowed) placed from the cue sheet, mixed by
   ffmpeg, loudness checked near −14 LUFS; the site master keeps no audio stream.
6. Only if an idea asks: a seeded grain or print texture on canvas, as the films' own mark.

VID2c's carried work joins VID3c: the export's `changeTag` and its test (D-UX-282), the every-frame
checks (D-TECH-80), the path check (D-TECH-85).

## 7. Three seeds for the DSCR film (VID3a draws one still of each)

They differ in idea, not colour. Each claim is checked against the engine and the site before drawing.

- **A, "Find it first."** One weak year can stop a loan, and the tool finds it first. A circle hunts
  across the years and stops on one; the word WEAKEST, then that year, large. The engine's change
  (today's scene: 60 to 91 instalments; its tag from the export's `changeTag`, D-UX-282) lifts it over the level; payoff: the statement, "Found
  before the bank did."
- **B, "Seven answers."** The size of the ask is the idea. A huge 7; each answer drops in and the
  statement builds itself from them; payoff: the document and "Nothing more is asked." (the site's own
  line). A time ("in about a minute") only if measured.
- **C, "Every kist."** The word every borrower knows: the instalment. Each year carries its kists, one
  buckles, the change spreads them; payoff: "Every kist, every year." Warm and local, but a Hindi word
  does not land everywhere in India; an English master can say "instalment".

## 8. The rows (one fresh session each; they replace VID2c to VID2e)

| Row | What the owner opens | Budget |
|---|---|---|
| VID3a | Three stills, one per seed, both sizes, drawn in code from the engine's figures; `measure` and the gap table for our draft; the owner picks a seed and answers F1 to F8 | M, Extra |
| VID3b | The picked idea in five style frames (hook, problem, signature, proof, ending), both sizes; its tempo, beat sheet and type; the owner says yes | M, Extra |
| VID3c | The kit (beat clock, type, blur, checks) and the signature five seconds in motion, silent and with sound; VID2c's carried work | L, Extra |
| VID3d | The DSCR film, 30 s, both sizes, the silent master and the social copy, scored (D-UX-291) and measured: the benchmark; stop and judge | M, Extra |
| CD1 | Why VID3d came out as a chart, and the department that stops it (`CD1-diagnosis.md`, D-UX-313 to 315, D-TECH-101) | M, Extra |
| VID3e | The DSCR film, Gate 1 (`creative-department` stages 0 and 1): the brief, three concepts from three directors, the reviewer's verdicts; Rahul picks one or none. No code, no render | M, Extra |
| VID3f | The DSCR film, Gate 2: the story, the world, the sound plan, the boards, the animatic, the reviewer's verdict; Rahul's greenlight or not | M, Extra |
| VID3g | The DSCR film, production on the greenlight, then Gate 3 on the cut | L, Extra |
| VID3h | The CMA, report and estimate films, each through the department, one row per gate as the budget asks | L, Extra |
| VID3i | The films on their tool pages (D-UX-288) and the social copies | M, high |
