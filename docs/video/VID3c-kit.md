# VID3c: the kit and the signature in motion

Row VID3c, 02-11-2026, at Extra (`docs/HANDOFF.md`). The owner's yes to VID3b's frames, with its five tradeoffs as
recommended (D-UX-304): one hard cut (at 10 s), 96 bpm, no product name on screen until D-BIZ-15 clears, the
proof's one combined line ("+31 instalments: 1.30 against 1.25") and the spare ending. Decisions: D-UX-304 to
D-UX-306, D-TECH-91 to D-TECH-96. The studio's side: rsplenum/video-studio, branch `vid3c-kit`.

## What to open
The signature (bars 5 to 7, 10 to 17.5 s) in both sizes, sent in the session; remade by
`node studio.mjs make videos/dscr-film --window signature` in the studio (output/ stays out of git):
- `output/dscr-film-signature-portrait.mp4` and `-landscape.mp4`: the site's masters, silent (no audio stream, F8).
- `output/dscr-film-signature-portrait-social.mp4` and `-landscape-social.mp4`: the social copies, with effects.

## The kit (the studio)
- **The beat clock** (`lib/clock.mjs`, D-TECH-91): `bpm`, `chapters` and `cues` in `videos/dscr-film/video.json`,
  positions as "bar.beat+n"; the scene reads it at `/__studio/clock.json`; `node studio.mjs cues <video>
  [--window <name>]` prints the cue sheet; `--window` renders a chapter or a span at film time.
- **Tracks, masks, swaps, fill, land** (`scenes/_shared/kit.js`, D-TECH-92): one Web Animation per element and
  property over the whole film, so any frame seeks the same from anywhere (R4).
- **Motion blur** (`lib/png.mjs`, D-TECH-93): 6 sub-frames over a 180-degree trailing shutter, only in the moves
  the clock marks; 62 of the signature master's 450 frames.
- **Every frame checked** (`lib/frame.mjs`, `lib/measure.mjs`, D-TECH-94): the frame's edge and outer 5%, text
  over text, text under 22 px, F2 (legible text only), F3 (reading time; a line may grow), F6 (numbers by their
  place), the sign-aware number reader, and seeking. `scenes/_fixtures/every-frame` holds five faults that each
  last a moment, with a clean last frame; `npm test` proves each is caught (18 tests). The grammar judges only
  films on the beat clock; the test card and the older scenes print it as notes (D-TECH-97).
- **Sound in code** (`lib/sound.mjs`, `sound/effects.json`, D-TECH-95): effects only, no music (R5), placed on the
  clock, the gain set against an AAC round trip, the peaks held by a look-ahead true-peak limiter.

## The signature's cue sheet
| Bar.beat | s | Chapter | Cue | On screen | Effect |
|---|---|---|---|---|---|
| 5.1 | 10.00 | signature | cut | the cut: two columns; the ring appears on the first year | knock -6 dB |
| 5.1+0.5 | 10.31 | signature | hunt ×7, 0.5 beat apart, to 12.19 s | the ring hops, year to year and back (motion blur, 0.2 beat) | tick, rising |
| 6.1 | 12.50 | signature | lock | the ring locks on 2030-31; WEAKEST lands, filling its line; the other red years dim (motion blur, 0.2 beat) | lock |
| 6.3 | 13.75 | signature | year | 2030-31 slides in, red | knock -8 dB |
| 7.1 | 15.00 | signature | line | "1.00 against 1.25"; held to 17.5 s |  |

## The spread, drafted first (the proof window, 17.5 to 25 s; finished in VID3d, D-UX-306)
| Bar.beat | s | Chapter | Cue | On screen | Effect |
|---|---|---|---|---|---|
| 8.1+0.5 | 17.81 | proof | change | the line leaves; "+31 instalments:" arrives in marigold where it stood | chime |
| 8.3+0.25 | 18.91 | proof | cross ×4, 0.25 beat apart, to 19.38 s | each red year rises and turns navy as it clears the target | tick, rising |
| 8.3+0.75 | 19.22 | proof | spread | the six years spread into nine (motion blur, 0.75 beat) |  |
| 8.4+0.25 | 19.53 | proof | grow ×3, 0.25 beat apart, to 19.84 s | the three new years rise from the foot | tick, rising |
| 9.1 | 20.00 | proof | hunt2 ×8, 0.25 beat apart, to 21.09 s | the ring hunts again, on sixteenths, across the nine; a faint ring stays on 2030-31 (motion blur, 0.15 beat) | tick -3 dB |
| 9.3 | 21.25 | proof | lock2 | the ring locks on 2033-34 (motion blur, 0.15 beat) | lock -2 dB |
| 9.3+0.5 | 21.56 | proof | year2 | the year swaps: 2030-31 leaves, 2033-34 arrives in navy | knock -8 dB |
| 9.4+0.5 | 22.19 | proof | line2 | "1.30 against 1.25" arrives whole under the change; held to 25.0 s |  |

## The effects register (each made in code; `sound/effects.json`)
| Effect | Made from | Licence | Purpose |
|---|---|---|---|
| tick | made in code: a 1.9 kHz sine and a burst of seeded noise, both decaying fast | the studio's own; no third-party audio | a soft tick: each year rising, each hop of the ring, the falling and rising runs |
| knock | made in code: two low sines, 180 and 330 Hz, decaying | the studio's own; no third-party audio | a low knock as WHICH YEAR rises |
| thud | made in code: a sine sweeping from 120 to 50 Hz, decaying | the studio's own; no third-party audio | a thud as the bank's target drops and settles |
| chime | made in code: 880 Hz with two partials (1.5 and 3 times), a slow decay | the studio's own; no third-party audio | a soft chime as the engine's change arrives |
| lock | made in code: a 2.6 kHz click with seeded noise, over a sine sweeping from 110 to 48 Hz | the studio's own; no third-party audio | the lock, the film's one sound: a hard click and a low thump as the ring locks on the weakest year |

## Results
Both windows, both sizes, every check: 0 failing. The signature's masters: 1080x1920 and 1920x1080, 60 fps,
450 of 450 frames, each seeked with every animation paused; every number one of the engine's (none unknown);
at most 3 things to read at once; WEAKEST stands 123 px in portrait and 118 px in landscape (a fifth of the
shorter side is 108); no text under 30 px; one hard cut in the film's 30 s; no text across the frame, in its
outer 5% or over other text on any frame. The social copies: -14.4 LUFS and -1.4 dBTP after AAC; after the mix
the lock leads the ticks by 8.6 dB, the knock between them. The proof's draft passed the same checks.

What it took: the first scene build died on a name declared twice (nothing animated, GOTCHAS); the first social
copy peaked at 0.1 dBTP after AAC, then a transient on the window's first sample slipped past the limiter
(both fixed, D-TECH-95).

## Left for VID3d
The hook, the problem and the ending in motion (their cues are in `video.json`, marked for VID3d: rise,
question, ask, target, level, every, red, before); the spread finished at master quality; the whole 30 s film
in both sizes, silent and with effects, measured beside the reference films. The studio's own CI (D-TECH-82)
is still to come.
