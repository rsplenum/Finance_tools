# CD1: why the DSCR film keeps coming out as a chart

03-11-2026. Rahul, on VID3d: "It illustrates a calculation. It doesn't tell a story." "Technical
correctness is not creative quality. A perfectly rendered mediocre idea is still a mediocre film." This
file uses VID3d as the case: its scene (studio `scenes/dscr-film/index.html`), its cue sheet and sound
(`videos/dscr-film/video.json`, `lib/sound.mjs`), its brief (`VID3-path.md`, `VID3d-film.md`) and the
decisions behind it. §2 is why; §3 is the test that would have stopped it; §4 is what changes.

## 1. What the film is, from its own cue sheet
22 cues, and every one is a chart event or a caption on one: rise, question, ask, fold, target, level,
every, red, cut, hunt, lock, year, line, change, cross, grow, hunt2, lock2, year2, line2, found, before.
In one line: *a ring finds the lowest bar;
the bars go up; the ring finds the lowest bar again.* The hunt and lock at 10 to 15 s happen again at 20
to 22 s. Nothing in the film wants anything, so nothing is at stake, so nothing can turn.

## 2. Why: seven causes, each with its evidence

1. **The only material was a chart.** The film reads one input, `scenes/dscr-middle/scene.json`: the
   site's DSCR chart exported in VID2b (keys `rows`, `level`, `weakest`, `panel`, `chip`, `sum`). Its
   borrower is `{"k":"Borrower","v":"A firm"}`. No person, want, fear or consequence exists anywhere in
   the film's inputs. The scene builds its columns from `s.rows`, the glass level from `s.level` and the
   ring from `s.weakest`: VID3d is the chart in 3D. The bars became columns, the threshold line became
   glass, the highlight became a ring.
2. **The ideas were product features, all from one hand.** `VID3-path.md` §7's three seeds: A is the
   chart's highlight, B is the form's count of seven inputs, C is the chart's columns with blocks. One
   session wrote all three in one pass; none has a person in it. Rahul could only pick the least bad
   (D-UX-299); nobody had the job of saying "none of these".
3. **A grammar was taken for an idea.** §2 and §5 of the path turned the reference films into rules
   (F1 to F8), and the film met them one by one: "one word" got WEAKEST, "felt before named" got haze
   over unlabelled years, "a payoff with wit" got the ring becoming the O of FOUND. Every rule ticked; the
   film still has no idea (D-UX-312).
4. **Every check guards correctness; the maker marks its own work.** The studio fails a stray figure,
   text at the edge, a fifth cut, the wrong codec. The scorecard (D-UX-291) is scored first by the session
   that made the film. `CLAUDE.md` rule 18: "Checks guard money, law and the page contract, never taste."
   So quality had one guard, Rahul, at the very end, after an L row and 1.5 h of renders.
5. **Pre-production was cut instead of fixed.** VID3a to VID3c had stages, but they were production in
   miniature: stills, frames and a kit of the same chart, which Rahul saw as slides. D-UX-307 then banned
   anything before the film ("no plan, stills, frames or tooling first"), so VID3d went from a picked seed
   straight to 245 steps of camera code. The stages were never the fault: they examined pixels, not ideas.
6. **The jobs were written as technique.** VID3d's row asked for "a new picture layer ... a camera
   (moves, depth, parallax) and transforms ... a bed under every second"; the "idea" section of
   `VID3d-film.md` is a list of camera moves. D-UX-309 noticed "three sessions built machinery"; the
   fourth built `world.js` (an orbit camera, fog, depth of field, a lens shift). Even VID3e's row, written
   after Rahul's verdict, jumps to "a track with a beat made in code ... show Rahul the whole film".
7. **The sound filled seconds; nobody designed it.** Two rules collided: "no melody" (R5, D-UX-299) and
   "a bed under every second" (D-UX-311). With melody banned, a drone and noise are all that is left to
   fill every second. `lib/sound.mjs` 110 to 121: "the air" is seeded white noise through a low-pass at
   500 to 1,600 Hz, swelling slowly; 135 to 144: the risers and whooshes are the same noise through a
   moving band. Filtered noise that swells is how wind is made: the film sounds like wind because it is
   wind. No line of the plan says what the viewer should feel at any second.

Under all seven: **the system is built to make a film correctly, and no one in it is answerable for
making it good.** No one owns the idea, and no one can stop it before production.

## 3. The test that would have stopped it (the calibration case)
The Executive Creative Reviewer's test (`.claude/agents/creative-reviewer.md`), applied to VID3d's
concept as it stood before any code:

| # | Question | VID3d | |
|---|---|---|---|
| 1 | The idea in one sentence, without the product, a chart or a technique | "The tool finds the weakest bar": needs the chart | fail |
| 2 | Someone to care about in 3 s | "A firm"; nobody on screen | fail |
| 3 | Something at stake, shown | the loan "could stop", told in words | fail |
| 4 | Every beat changes something | the hunt and lock happen twice | fail |
| 5 | One picture a viewer would describe tomorrow | a ring on a bar | fail |
| 6 | A turn the viewer did not see coming, still true | +31 instalments: a figure, not a turn | fail |
| 7 | The ending answers the opening | yes ("which year?" / "found") | pass |
| 8 | It reads with the sound off and the words gone | no: without the words it is bars | fail |
| 9 | Not a chart | it is a chart for 30 s | fail |
| 10 | Every sound has a story reason | the bed's reason was "every second" | fail |
| 11 | The first second stops a thumb | haze over columns | fail |
| 12 | Only we could make it | any bank could run it | fail |

One pass in twelve: rejected at the concept, before a line of code. A test that would pass VID3d is
broken, so this table is the reviewer's calibration: every new reviewer run checks itself against it.

## 4. What changes
- **A department before the studio** (the `creative-department` skill, seven agents in `.claude/agents/`):
  a human brief, three concepts from three directors who never see each other, a reviewer who wrote none
  of it and may reject all three, then the story, the world and the sound plan, the boards, an animatic,
  a second review, and only then production. The department can say no; only Rahul can say yes.
- **A gate in code**: the studio cannot render a film (draft or master) until
  `docs/video/films/<video>/GREENLIGHT.md` holds Rahul's own words (`.claude/hooks/film-gate.mjs`).
- **No sound until a plan is approved.** Silence over filler: the DSCR film has no sound until the Sound
  Designer's plan has Rahul's yes; noise beds, wind and whooshes as filler are out for good.
- **Set aside (rule 2)**: D-UX-307's "no plan, stills or frames first" for films (a concept and an
  animatic are the real things at their stage); `VID3-path.md` §4's "eight AI roles: not taken"; D-UX-311's
  bed; F1 to F8 as a checklist (they stay as craft notes, never the concept); `world.js` only where a
  story needs a camera.
