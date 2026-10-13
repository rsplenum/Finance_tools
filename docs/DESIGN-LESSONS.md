# Design lessons: a queue, not an attic (D-UX-58)

A lesson waits here until it is decided, then leaves: accepted lessons move into `docs/DESIGN.md` (a rule) or `site/src/global.css` (a token) in the same commit; rejected and superseded ones are deleted, their line kept in `docs/DECISIONS.md` if they mattered. `npm run verify` caps this file at 6 KB. Accepted only on evidence: a principle with its source, a defect that repeats, an accessibility rule, the user tests, the usage numbers or the owner's word.

Each entry: **observation**; evidence; root cause; the rule proposed; scope; status (proposed, accepted, superseded or rejected) with the date.

## Open

1. **Links styled as blocks fall under 24 px.** The "Provisional: n still needed ↓" pill and the result lines that jump to a section are 16 to 20 px tall at 360 px and on a desktop (the first review, 13-10-2026). Evidence: WCAG 2.5.8 (AA). Root cause: a link outside a sentence is sized by its text alone, with no part for it. Rule proposed: a link that stands alone (not inside a sentence) is at least 24 px tall, as a shared `JUMP` class. Scope: every page. Status: proposed, 13-10-2026.
