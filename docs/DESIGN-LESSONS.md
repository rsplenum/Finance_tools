# Design lessons: a queue, not an attic (D-UX-58)

A lesson waits here until it is decided, then leaves: accepted lessons move into `docs/DESIGN.md` (a rule) or `site/src/global.css` (a token) in the same commit; rejected and superseded ones are deleted, their line kept in `docs/DECISIONS.md` if they mattered. `npm run verify` caps this file at 6 KB. Accepted only on evidence: a principle with its source, a defect that repeats, an accessibility rule, the user tests, the usage numbers or the owner's word.

Each entry: **observation**; evidence; root cause; the rule proposed; scope; status (proposed, accepted, superseded or rejected) with the date.

## Open

1. **A control's spoken name rewrites the figure it shows.** The estimate's level buttons showed "Basic 8.40 L" and were named "Basic: Rs. 8,40,271" (UX1, 13-10-2026; fixed there). Evidence: WCAG 2.5.3 (label in name). Root cause: an `aria-label` written for a fuller figure. Rule proposed: a control's name begins with its visible text; more detail goes after it, as hidden text. Scope: every page. Status: proposed, 13-10-2026.
2. **Principle 7 contradicts the column.** The `max-w-3xl` column holds about 100 characters of 14 px text (the home page at 1280, UX1). Evidence: principle 7's own 45 to 75. Rule proposed: running text takes `max-w-prose`; `max-w-3xl` is for tables and panels. Scope: every page. Status: proposed, 13-10-2026.
3. **Links take the accent.** The home page's and the DSCR's links use `text-teal-700`, the accent's colour, not `text-link`; the ratchet counts the class but not the wrong role (UX1). Evidence: principle 6. Rule proposed: links use `text-link`, and the site check flags a teal class on an `<a>`. Scope: every page. Status: proposed, 13-10-2026.
