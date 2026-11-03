# VID3d: the DSCR film, 30 seconds, in one world

> **Rejected** (D-UX-312): "It illustrates a calculation. It doesn't tell a story." Kept as the record of what was built, and as the case the creative department was made from: `CD1-diagnosis.md` says why it failed, and its §3 is the reviewer's calibration. Its sound (a noise bed that read as wind) is out (D-UX-314). Nothing here is a model for the next film.

03-11-2026. Rahul's word (D-UX-309): start from the film's idea and the reference films' language
(`VID3-path.md` §2), not from the site's chart or VID3c's kit; a new picture layer with a camera, depth and
moves from one space into the next; a sound bed under every second. Made in the studio
(rsplenum/video-studio, `vid3d-film`): `node studio.mjs make videos/dscr-film [--draft]`. The scene is
`scenes/dscr-film/index.html` on `scenes/_shared/world.js`; its clock, cues and bed are in
`videos/dscr-film/video.json`.

## 1. The idea, in the references' language
- One idea, one word: one weak year can stop a loan; WEAKEST carries it from the lock to the proof.
- Felt before named: the hook shows six years standing in haze and asks WHICH YEAR could stop your loan,
  before any target is drawn.
- One thing at full size: the camera goes to each thing in turn (the question, the level, the weakest year,
  the change) instead of shrinking a chart to fit.
- Change inside one space: the film never cuts to a new picture. The years stand on the DSCR statement, the
  bank's target is a glass level across them, and the camera travels through that one world: from the low
  angle of the hook, along the level, into the hunt, out over nine years, and up to the sky.
- The payoff with wit: the camera rises to look straight down, and the ground the years stood on was the
  statement all along; the ring that hunted becomes the O of FOUND, "before the bank did."

## 2. The picture layer (`world.js`)
One CSS 3D space (x right, y down, z toward the viewer, the ground at y = 0) seen through one camera: an
orbit around a point (`at`, `dist`, `yaw`, `pitch`, `roll`, `fov`), keyed on the clock and eased between
keys, with a handheld drift always on; fog by depth, depth of field by distance from the focus plane, and a
lens shift (`shift`: the picture's centre moved across the frame, so words and years share the frame
without the camera turning). Every frame is a pure function of its time (`seek(ms)`). Each size has its own
camera track, composed on its own: portrait looks up at the years and rises to a top-down statement;
landscape keeps the words left and the years right after the cut, and ends at a high angle.

Kept from the studio: frame capture, motion blur, encoding, the every-frame checks and the sound mix.
Dropped: VID3c's kit (`kit.js`) and the exported chart scenes; the film needs neither.

## 3. Beat sheet (96 bpm, 12 bars, 48 beats)
| Bar.beat | s | In the world | Sound (social copy) |
|---|---|---|---|
| 1.1 | 0.0 | six years rise off the statement, a tick each, the camera low and close | bed: an open drone and air |
| 1.3 to 2.4 | 1.3 to 4.7 | WHICH YEAR, sharp over the hazy years; "could stop your loan?" | a knock; a whoosh into the question |
| 3.1 to 4.3 | 5.0 to 8.8 | the glass level drops in at 1.25; four years stay under it and turn red, one a beat | a riser into it, a thud; the drone darkens, a pulse starts |
| 5.1 | 10.0 | the camera swings over the years; the ring hunts along the level | a riser into the swing, ticks |
| 6.1 to 7.1 | 12.5 to 15.0 | the lock: WEAKEST looms over 2030-31; "1.00 against 1.25" | the lock, a whoosh on the pull-back |
| 8.1 to 8.4 | 17.8 to 19.7 | "+31 instalments": the years rise through the level, six become nine | a chime; the drone lifts a tone, the air opens |
| 9.1 to 9.4 | 20.3 to 22.2 | the ring hunts again and locks on 2033-34; WEAKEST follows it; "1.30 against 1.25" | quick ticks, the lock |
| 11.1 to 12.4 | 25.0 to 30.0 | the camera rises: the statement from above, FOUND with the ring as its O, "before the bank did." | a riser, the lock softer, a whoosh; the bed fades in the last 0.8 s |

## 4. Sound
A bed under every second, made in code (`lib/sound.mjs` `bed()`; its register line in `sound/effects.json`):
a drone of detuned sine pairs whose chord changes by chapter, seeded air through a moving filter, a soft
low pulse under the problem and the hunt, risers into the turns and whooshes on the big camera moves; no
melody. It ducks 6 dB under each effect, so the hits stand on it. This overrides "effects only, no music"
(R5, D-UX-299) by Rahul's word in this row. The mix: −14 LUFS, true peak at most −1 dBTP after AAC.

## 5. Figures, checked against the engine
The figures are VID3b's (§5 there), read from `scenes/dscr-middle/scene.json`: 1.25 the target; 2030-31 the
weakest at 60 instalments (3,21,236 ÷ 3,20,320 = 1.0029, shown 1.00); "+31 instalments" `fix.move`;
2033-34 the weakest at 91 (3,14,983 ÷ 2,41,752 = 1.3029, shown 1.30). The studio fails any other number.
Never "will": the question says "could".
