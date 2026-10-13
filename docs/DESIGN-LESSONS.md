# Design lessons: a queue, not an attic (D-UX-58)

A lesson waits here until it is decided, then leaves: accepted lessons move into `docs/DESIGN.md` (a rule) or `site/src/global.css` (a token) in the same commit; rejected and superseded ones are deleted, their line kept in `docs/DECISIONS.md` if they mattered. `npm run verify` caps this file at 6 KB. Accepted only on evidence: a principle with its source, a defect that repeats, an accessibility rule, the user tests, the usage numbers or the owner's word.

Each entry: **observation**; evidence; root cause; the rule proposed; scope; status (proposed, accepted, superseded or rejected) with the date.

## Open

1. **A control that removes itself drops the focus to the page.** "Make it viable" replaced itself with the plan and left the focus on `body` (the first review, 13-10-2026; fixed there by focusing the plan's box). Evidence: WCAG 2.4.3 (focus order). Root cause: a button that hides on click, with nothing told where the focus goes. Rule proposed: a control that removes or replaces itself moves the focus to what replaces it (a box with `tabIndex={-1}`, focused after the render). Scope: every page. Status: proposed, 13-10-2026.
