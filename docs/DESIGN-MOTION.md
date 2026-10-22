# Motion vocabulary (D-UX-115)
How things move on the site. It came from the owner's video, a Gemini note and a Remotion file (21-10-2026), and replaces AG1 to AG3's pen strokes and ledger dashes on home. What we take from it is the choreography. The dark neon look, the glass and the blur stay out, because they say nothing (principle 10). The look stays ink on paper.

Five moves:
- **Draw**: a line draws itself from start to end (stroke-dashoffset), 600 to 800 ms, easing out.
- **Settle**: a box arrives with a small overshoot, then rests, 500 to 700 ms.
- **Pulse**: one marigold dot runs a line once, 600 to 800 ms, to show where something goes. It is the screen's one highlight.
- **Stagger**: siblings start 100 to 150 ms apart, never all at once.
- **Type**: a tool's terminal intro types one worked case, every figure from the engine.
- **Lens and brackets** (HOME1c): a ring reads a column and stops on the year that decides; corner brackets snap to what the eye should hold, red for a miss, marigold for the change.
- **Spring**: what lands goes a little past its place and back (`cubic-bezier(0.34, 1.45, 0.64, 1)`).

Rules for all five:
- Each move runs once and never loops.
- Everything stops within 5 s (F9); an explainer, played once when seen, within 10 s (8.4 s, D-UX-121).
- Nothing flashes more than three times a second.
- Nothing moves under reduced motion; the page shows the finished state.
- The page reads whole with "Show it all".

Built in SVG and CSS with a few lines of script: no canvas for a diagram, no Remotion on the site. Remotion is for promotional videos, in a session of their own.

Home after HOME1b:
- The hero's "how it works" diagram (your answers, worked out in your browser, the four tools) uses draw, settle, pulse and stagger. It has no links and plays on each visit.
- Each tool's block types its intro.
- The closing panel keeps its dashes, without the pointer's stir.

Reference: the comparison at https://claude.ai/artifact/BRkgWAYyrJP3Sr2KRfiGqU (settles at 3.3 s).

HOME1c (D-UX-121): the DSCR's intro is a five-beat explainer with a caption a beat and one button ("Show it all", then "Play it again"). Before and after: https://claude.ai/artifact/Eq5xHQnD3M9QsGtpAyLzP3.
