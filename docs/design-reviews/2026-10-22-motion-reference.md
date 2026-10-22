# The motion the owner wants: a reference (HOME1c, D-UX-119)

The owner's reference is a 60 s YouTube short, "This Free AI Tool Reverse-Engineers Apps Without Source Code" (youtube.com/shorts/jWWSAetwJho). They sent a screen recording of it and a Gemini analysis ("Analyzing Motion Graphics", 8 pages) on 22-10-2026. Eighteen frames, one a second from 0:14, are in `2026-10-22-motion-reference.jpg` beside this file. The owner asked for home's terminal intros at "that level and depth and sophistication".

## What the short does, in the motion idiom

- **Look**: near-black matte ground with lots of empty space. One accent colour (red-orange), plus a soft radial glow behind whatever is active. Glass cards with 1 px borders. Skeleton bars stand in for text.
- **Hub and spoke** (0:08): a centre node, with sources on the left and tools on the right. Bezier curves draw themselves (stroke-dashoffset), lit pulses travel along them, and a ripple rings the node that receives.
- **Lens on a tree** (0:03): a magnifier glides along a node tree while the accent traces the active branch.
- **HUD brackets** (0:13): four corner brackets snap onto one control, and its card lifts with a glow.
- **Typewriter in a prompt box** (0:16), with a caret.
- **Laser scan** (0:18): a line sweeps down skeleton code, and the rows it passes light up.
- **Lift and slot** (0:25): a part lifts out of one window, leaving a dashed placeholder, and springs into another. Badges drop in staggered.
- **Glitch crossfade** (0:01): a window turns into code through a horizontal tear.
- **Radial dial** (0:39): a ring turns, with nodes lit inside.
- **Springs everywhere**: a small overshoot, then rest. No move is linear.

## What it maps to on home

Every figure stays the engine's (`story.ts`). The motion carries the depth; the finished state still reads as today's text.

- **Hub and spoke**: the case's inputs flow into the engine, and out come the years. Pulses carry the figures, and the ring marks the verdict.
- **Lens and trace**: the lens runs down the years and stops on the weakest year (DSCR 1.00 in 2030-31), traced in red. The other three tools have a weakest line of their own.
- **Brackets**: the brackets snap onto the input the fix changes (term 60 → 80 instalments), then onto the verdict.
- **Lift and slot**: the fix's new value lifts out and slots in, and the bars re-spring.
- **Scan**: a scan line passes the year rows as each one is judged.
- **Left out**: the kinetic captions (narration for a video) and the glitch (it reads as an error on a page about money).

## Where it meets the rules (the owner's tradeoffs, D-UX-119)

- **F9 (everything stops within 5 s) and "never loops"** (D-UX-115, DESIGN-MOTION.md): the short never stops. Recommended: about 10 s per tool, played once when it comes into view, never looping, with a replay button.
- **One highlight** (marigold): in the short, red is the accent; here red means "misses". Recommended: marigold for the glow and the pulses, red only for what fails.
- **Live, not video**: Remotion renders a video file. That is heavy, can't be read by a screen reader, and its figures go stale when the engine changes. Recommended: SVG plus the Web Animations API, built from `story.ts`.
- **No library**: GSAP adds about 25 KB. Recommended: a small spring and timeline helper of our own, kept under WEIGHT_CAP.
- **Reduced motion and no script**: the finished state, as today.
- **360 px**: the hub and spoke turns vertical.
