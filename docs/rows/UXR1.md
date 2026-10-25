# UXR1
## Lessons
| 24-10-2026 | UXR1 review | 0 measured defects on all four pages, yet a reload lost every answer, and two tools judged the same ratio against different targets (1.20, 1.25) | A review walks across states and across tools (reload, back, the same figure in two tools), not only page by page | docs/design-reviews/2026-10-24-uxr1-terms.html | here |
## Owner
- **Storage for answers kept on this device** (UXR2): sessionStorage (this tab only; recommended) or localStorage (until cleared, needs a "Forget my answers" control); and the privacy line's wording.
- **Lowest-year DSCR target** (UXR3): `engine/data/dscr.json` says 1.20, `engine/data/ratios.json` says 1.25. One value, or name the lender norm each tool uses.
- **Order of the rows UXR2–UXR7**, and whether VID2's screens wait for UXR3 and UXR4 (recommended: record the screens after both).
## Cost
| 24-10-2026 | UXR1: terms of reference and the UI/UX review report of the four tools (Artifact https://claude.ai/artifact/SbLyB3sNM24wfMFvVUQHyc) | L | about 60 steps of 200, one compaction, 2 agents (critic, writer) 15% of the cost |
## Handoff
State line: the four tools were reviewed against "so simple to be difficult" (UXR1); there is 1 blocker (answers lost on reload) and 20 significant findings, set out in `docs/design-reviews/2026-10-24-uxr1-report.html`.
UXR1: done.
New rows for the Next table, in the recommended order (the report has the "Done when" bar and a starter prompt for each):
| UXR2 | Answers kept on this device (B1) | M, high | owner: sessionStorage or localStorage |
| UXR3 | One vocabulary: verdict words, labels, jargon once, the 1.20/1.25 target (touches VID2's screens) | M, high + writer | owner: 1.20 or 1.25 |
| UXR4 | Answer first, said once: the band hides beside the card, labelled estimate headline, the report's answer up | S–M, Extra | — |
| UXR5 | One shape for four tools: Clear all, More options, the worked example, the same four downloads | M, Extra | — |
| UXR6 | The CMA on a phone: one year or form at a time | L, Extra | — |
| UXR7 | The estimate loads fast: ≤300 kB first-load JS | M, high | — |
Next row: UXR2. Starter prompt: "Row UXR2 (M, high): answers kept on this device. Read docs/design-reviews/2026-10-24-uxr1-report.html (B1) and docs/rows/UXR1.md. Branch uxr2-drafts from main, push first. Owner's answer on storage: <sessionStorage|localStorage>. Add one shared draft hook in site/src/fields.tsx used by the four tools; Clear all empties it; one privacy line on each page; a check that reloads each tool and counts the filled fields. npm run verify, notes in docs/rows/UXR2.md, draft PR."
