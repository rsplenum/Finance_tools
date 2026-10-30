# UXA1: the UI/UX Pro Max skill as a trial (30-10-2026)

Deliverable: `docs/design-reviews/2026-10-30-uxa1-report.html`. Budget S, high.

## Decisions
- The owner's word: a trial only; keep only what proves useful. The skill (github.com/nextlevelbuilder/ui-ux-pro-max-skill, MIT, commit 28b3b8d) was read in the scratchpad, never installed; its colours, fonts and styles are not used (its finance picks are glass and OLED dark, against DESIGN.md).
- About 20 of its ~75 web rules are already enforced by `scripts/design-checks.mjs`; the rest pass but three.
- New: the hint "5 L" on fields with `inputmode="decimal"`, which a phone keypad cannot type (significant, to UXR3); prose 100-137 ch a line at 1280 on the CMA (polish); `autocomplete="off"` on the report's business name and address (polish).
- Recommended: three lines in the critic agent's list, nothing else; waits on the owner's word.

## For GOTCHAS
- `inputmode="decimal"` gives iPhone digits and a point only: no comma, no letters. A hint must be typeable on it.

## Next
UXR3 takes the keypad hint with the target answer.
