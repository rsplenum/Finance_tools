# A row's notes (D-TECH-66)

Two sessions that both edit the shared docs (`docs/DECISIONS.md`, `GOTCHAS.md`, `LESSONS.md`, `OWNER.md`, `HANDOFF.md`) conflict on nearly every merge. So a row's session never edits them: it writes everything they would get to one file, `docs/rows/<ROW>.md` (for example `docs/rows/HOME1e.md`), which no other session touches. The site check's neighbour, `npm run verify`'s "row notes" line, fails a branch that adds a notes file and also edits a shared doc.

Only the parts it needs, each under its own heading, in the shared doc's own format:

```
# HOME1e
## Decisions
| D-UX-135 | 24-10-2026 | the decision | why | U |
## Gotchas
- **The trap** (file, D-id): what happens and what to do.
## Lessons
| 24-10-2026 | context | what happened | rule | kept in | reach |
## Owner
- **What only the owner can do** (D-id): ...
## Cost
| 24-10-2026 | HOME1e: what was delivered | L | about 120 steps, ... |
## Handoff
The state line's new words; this row's new text in the Next table, or "done"; the next row (deliverable, budget, plan, starter prompt).
```

- A decision's ID comes from the range the row's line in `docs/HANDOFF.md` reserves; the check fails an ID that is already logged or in another notes file.
- Until it is folded, a decision lives here: grep `docs/rows/` along with `docs/DECISIONS.md`.
- The main conversation alone edits the shared docs. When the owner says "merge", it merges the PR, runs `npm run fold` on its own branch (each part goes to the end of its section, the cost line to the top of HANDOFF's table, keeping ten) and writes the printed handoffs into `docs/HANDOFF.md` by hand.
- Bring `main` into a PR only just before it merges, not after every other merge.
