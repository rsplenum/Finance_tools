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

## The script, and each move tied to its word

The motion explains what is said, so it is not decoration (the owner, 22-10-2026). I couldn't hear the audio, so I rebuilt the script from the burned-in captions, read at two frames a second. The captions run one or two words at a time, centred under the picture. The moves are listed with the word they land on.

> You can now reverse-engineer any software [title] with an **AI coding agent** [three tool icons inside snapped brackets] … figure out how **features** work [the lens on the tree, the branch traced] **without the original source code** [a code wall, bracketed]. The project is called REA [its page]. It **connects** [lines draw out from R] **AI coding agents** [icons on the left] to **professional reverse engineering** [tools on the right] tools **like Ghidra** [a ripple on Ghidra]. Here's how it works. **You point your coding agent** [an icon, a dashed line drawing] at a **compiled application**, and **ask it how a particular feature works** [typed into a prompt box, a red dot on send]. Instead of **just guessing** [the code wall], **it can analyze** [the lens sweeps] the **software**, trace **its** logic [a node tree lights up, path by path] and **explain** what it **finds** [a document builds] with **supporting evidence** [brackets snap onto two lines]. And here's where it gets useful. **You can take what you've learned to build similar features in your own projects** [a part lifts and slots into a second window, with a ring]. … **understanding** how an **old game works**, **exploring software you can't customize**, or **recreating** features **you've always wanted in another app** [one example scene each]. Of course, it **won't recover the exact original source code** [code turns into code], and **results depend on the software being analyzed** [a radial dial over R]. REA is open source, so you can check out the repo. Link in the comment below.

**What this means for home**: each intro becomes a short script, about five lines, one beat per phrase, and each move starts on its word. A caption line under the picture carries the narration in text. Home has no sound: a browser blocks sound that starts by itself, and a voice would need recording in each language. The caption is the screen reader's text and the finished state's summary. A voice can be a later choice.

## The owner's motion analysis (HOME1d, D-UX-123)

The owner's "First-Principles Motion Analysis" is beside this file (`2026-10-22-motion-analysis.html`). Its four reference images were lost; the frames above stand in for them. What HOME1d takes from it:

- **Springs**, underdamped, damping ratio about 0.7: the hub at mass 0.8, stiffness 130, damping 13; the cards at 0.6, 150, 14; the brackets' snap at stiffness 180, damping 12, the card's shadow growing from 10 to 40 px.
- **Stagger**: 60 ms (4 frames at 60 fps) between cards.
- **Wires**: Hermite beziers with flat tangents at both ends (weight 0.55 of the run), drawn by stroke-dashoffset over 30 frames, ease-out-expo; then a pulse travels along each, looping every 2 s.
- **Lift and slot** in three phases: lift (above the rest), travel, snap with a small overshoot, leaving a dashed ghost.
- **Glass**: a 12 to 24 px backdrop blur, 1 px borders at 8 % white, a matte ground.

What it does not change: its red accent (red means "below the target" on home; marigold leads), its monospace typewriter (a home trap), the glitch (reads as an error on a page about money), and Remotion (D-TECH-56 keeps one seekable scene for home and video, so a figure cannot drift between two copies).
