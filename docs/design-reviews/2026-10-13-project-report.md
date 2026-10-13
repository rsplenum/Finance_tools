# Design review: `/project-report/` (UX1, 13-10-2026)

By the critic, against `docs/DESIGN.md`: the seven states of `npm run design-review -- /project-report/` on fictional case R (empty, partly, provisional without the repayment, error, result, plan, download) at 360 px and 1280 px, light and dark, two probes and three screenshots. Fixed in UX1 unless marked UX4 (`docs/ROADMAP.md`, row 7).

| # | Rank | Finding | Evidence | Status |
|---|---|---|---|---|
| 1 | Blocker | The year tables scroll sideways at 360 px but Tab could not reach them | axe scrollable-region-focusable; WCAG 2.1.1 | Fixed: each table is a named region in the Tab order |
| 2 | Blocker | "How far can sales fall?" removed itself and the focus fell to the page | WCAG 2.4.3; lesson 1, recurred | Fixed as on `/cma/`; the design check now fails it |
| 3 | Significant | The answer is not first: a "Complete" pill and eight bars, the key figures 820 px lower, no verdict in words | Principle 1; DESIGN, Result panel | UX4: a verdict line and the three key figures above the pill |
| 4 | Significant | Security cover has no figure while the pill says Complete; its field is under More options, 3,000 px up | Principles 4, 12 | UX4: the cover from the project's own assets on the bar; the field or a link on the row |
| 5 | Significant | No reset anywhere on the page | Principle 8 | UX4: Clear all beside the result |
| 6 | Significant | "Meets", the bars, the Complete pill, More options and the "used" box all take the accent | Principle 6; the `good` tokens | UX4 |
| 7 | Significant | The DSCR table at 360 px is 697 px wide in a 326 px box; no cards below 640 px | DESIGN, Table | UX4 |
| 8 | Significant | After the last field the answer is 1,000 px further down with nothing saying it has arrived | Principle 1 | UX4: a status line under the last section |
| 9 | Polish | The average and lowest DSCR shown twice (bars and cards) | Principle 10 | UX4 |
| 10 | Polish | The plan says "the room" three times and 31.5% twice | Principle 12 | UX4 |
| 11 | Polish | Bars stop at twice the level, so 3.62 and 2.51 look the same | Principle 5 | UX4: "off the scale" at the cap |
| 12 | Polish | Raw palette classes throughout | DESIGN, Tokens; the ratchet | UX4 |

Not seen by any check before this review: 2 to 12.
