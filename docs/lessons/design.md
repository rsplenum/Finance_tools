# Design lessons: layout, look and flow

Read this when the work is a page's design. Start from the result wanted, not from these lines: they say what earlier pages taught us, and each one bends when a better page needs it. Say in a line which one you set aside. `rahul.md` comes first; `docs/DESIGN.md` has the tokens and shared parts as built.

## What a money tool's page owes its reader

Six first principles, from the review of Rahul's videos of the four tools (D-UX-105, 18-10-2026):

1. The answer sits where the eye rests.
2. Cause and effect are in view together: the control and the figure it moves.
3. Every figure carries its unit and its status (provisional, meets, misses).
4. Precision matches certainty: an estimate says "about".
5. A statement is a table that adds up.
6. Space goes to the data, not to the frame around it.

## Flow

- **Decisive facts first.** A short set of questions gives an answer early, marked provisional until complete. (Carried from an earlier project.)
- **The engine solves; the user picks.** Offer whole plans that work, each with its cost, none marked best. A user is never asked to combine levers to find a pass. (D-UX-229, D-UX-251, D-UX-346)
- **Every red line has a way forward** in reach of it: a button, never only a verdict. (D-UX-347)
- **One job a screen, said once.** A long scroll packed with every figure reads as "a mind bender". (D-UX-347)
- **A "No" hides its follow-up questions; a choice that changes the answer brings its own.**
- **Offer the better option when the default falls short** ("this gives less than asked; that gives more: use it?").
- **With every ratio passing, cash can still run out.** Say it apart from the ratios. (D-UX-247)
- **A question the answer needs is never dropped to look simple.** It goes behind a stated assumption the user can change. (D-UX-225; CLAUDE.md on questions)
- **The answer stays in view of the control that changes it.** A figure that changes out of sight is the one fault the load measure found for real: on a phone, a slider moved figures the reader could not see. (LOAD-MEASURE, 13-10-2026)
- **Few words stand before the first question.** A reader came to do something.
- **A sudden change needs a cause the reader saw.** Rahul found "the big shadow that appears suddenly"; no review or check had. Watch the page move, do not only measure it at rest. (D-UX-106)

## Figures and charts

- An amount is shown by position or length on one scale, and always also as a figure in words. Hue says only a kind (meets, misses, which room), never how much. Pies, areas and 3D read worse than bars. (Cleveland and McGill 1984, by way of `docs/archive/DESIGN-MATHS.md`; cited from the literature, not reread)
- Say only what changed: a changed figure shows was and now; a live region reads out the answer, not the page.
- A reference line must not cross the figures read against it: "1.06" read as "1.86". Figures side by side at 360 px run together ("1.331.311.29"). (AG1, AG2, 13-10-2026)
- Lakh and crore where a reader skims; full rupees where a lender reads. (D-UX-152)
- A number arrives whole. It never counts up through figures the engine never made. (D-UX-295)

## Typing into a form

- Keep what is being typed in a local draft until the field is left. A re-render from another field wiped a typed 0.
- A half-typed value never makes the whole state invalid: an invalid state rebuilt the screen and made it jump.
- A figure not understood is never taken as zero.

## The look

- Our own language, built by eye from a clear idea. The one design Rahul praised ("it's coming along nicely", home at AG3c) came from Rahul's direct notes and a look judged by eye, not from counts. (D-UX-83)
- A reference gives principles, structure and a level to reach; never its look to copy. (D-UX-68, D-UX-70, D-UX-357)
- A showcase gives a glimpse, like a trailer. Write its size (lines, seconds) before building it. (D-UX-76)
- Motion is there when it shows something: a cause, a change, a feeling that fits. Judge it by smoothness on a cheap phone, not by kilobytes. (D-UX-122, D-UX-166)
- An effect stays if the viewer would miss it, not merely notice it. (D-UX-330)
- In dark mode a result is a dark sheet, never a white block: Rahul read white paper in dark mode as a fault. (D-UX-91)
- The look as built on one day (pill shapes, one shadow, section padding, a byte cap) is a record, not a law. Several of those "rules" had to be bent by decision before a look Rahul chose could ship. (D-UX-119, D-UX-120, D-UX-128)

## Accessibility (these are checked, because a user is stopped when they fail)

- Mobile from the start: no sideways scroll at 320 px, 16 px in fields (a smaller field makes a phone zoom), tables become cards.
- Targets 24 px at least, 44 px for fields and main buttons on a phone. Focus is always seen, at 3:1, and not under a sticky band. Tab follows the eye.
- Nothing moves under reduced motion, and the page reads whole without it. Nothing flashes more than three times a second.
- A control's spoken name begins with its visible text (WCAG 2.5.3): "Basic 8.40 L" was named "Basic: Rs. 8,40,271".
- A link that covers a whole card shows focus on the whole card.
- A control hidden by its own timer needs the care of one the user removes. A mark hidden from screen readers must be decoration only.
- Dark mode without a flash on load. A token reset in one theme is looked at in the other: on paper in dark mode the filled button read 1.1:1.

## Reviewing a design

- Look at the page as a user would: at 360 px and on a desktop, light and dark, filled with a case that fails and a case with an optional answer left empty.
- Scroll it slowly, fast, and again after the motion ends. Walk across states and across tools: reload, back, the same figure in two tools.
- A fix on a shared part is looked at on every page that uses it.
- Ask what each section says that no other does.
- Show Rahul the new beside the old, as something they can open.
- For a paper's look, draw the target first as a web page and print it with Chromium (REPORT-GRADE, 14-11-2026: 15 pages with charts in about 25 steps, `docs/design-reference/report-specimen/`). It shows what our writers cannot yet do before a row is spent finding out, and gives the build row a picture to match. Look at a contact sheet of every page once; a count of words does not see a page that runs over.
