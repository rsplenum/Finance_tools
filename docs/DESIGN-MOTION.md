# Motion vocabulary (D-UX-115)
How things move on the site. It came from the owner's video, a Gemini note and a Remotion file (21-10-2026), and replaces AG1 to AG3's pen strokes and ledger dashes on home. What we take from it is the choreography. The dark neon look, the glass and the blur stay out, because they say nothing (principle 10). The look stays ink on paper.

Five moves:
- **Draw**: a line draws itself from start to end (stroke-dashoffset), 600 to 800 ms, easing out.
- **Settle**: a box arrives with a small overshoot, then rests, 500 to 700 ms.
- **Pulse**: one marigold dot runs a line once, 600 to 800 ms, to show where something goes. It is the screen's one highlight.
- **Stagger**: siblings start 100 to 150 ms apart, never all at once.
- **Type**: a tool's terminal intro types one worked case, every figure from the engine.

Rules for all five:
- Each move runs once and never loops.
- Everything stops within 5 s (F9); the DSCR's scene, five beats, within 13 s of coming into view (D-UX-125).
- Nothing flashes more than three times a second.
- Nothing moves under reduced motion; the page shows the finished state.
- The page reads whole with "Show it all".
- Every move is a Web Animations API animation, never a requestAnimationFrame loop or a timer that changes state, so `document.getAnimations()` can pause and seek it (the video studio does).

Built in SVG and CSS with a few lines of script: no canvas for a diagram, no Remotion on the site. Remotion is for promotional videos, in a session of their own.

Home after HOME1b:
- The hero's "how it works" diagram (your answers, worked out in your browser, the four tools) uses draw, settle, pulse and stagger. It has no links and plays on each visit.
- Each tool's block types its intro.
- The closing panel keeps its dashes, without the pointer's stir.

Home after HOME1d (D-UX-125): the DSCR's block is a scene in look C, the one place the glass and the dark ground come in (D-UX-122): the bank's question, the seven answers wired into the hub, every year's DSCR with a lens on the weakest, the term changed to 80 and the bars re-springing, then the statement for the lender. Springs are CSS `linear()` easings; it ends by cancelling every animation, leaving the HTML's last beat, with "Play it again" (site/src/home/scene.ts).

Reference: the comparison at https://claude.ai/artifact/BRkgWAYyrJP3Sr2KRfiGqU (settles at 3.3 s).
