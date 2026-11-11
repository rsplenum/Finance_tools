# Lessons about checks and tests

Read this before adding, changing or fighting a check.

## What a check is for

A check answers one question: **does it work without breaking?** It guards what a machine can judge and a user would be hurt by:

- **Money**: every figure, worked a second way; the file says what the page said.
- **Law and truth**: the brand notices, the policy pages, the title "architect" never used, a claim on a page kept true by a test (`tests/privacy.test.ts` is the model, D-BIZ-22).
- **Privacy**: nothing typed leaves the device unasked; no figure reaches the AI.
- **Accessibility**: see `design.md`.
- **Flows**: a page loads without an error, a download opens, Undo and reload keep what was typed.
- **The question ceiling**: a default path asks only the inputs Rahul listed for it.

Everything else (the look, the wording, the order of sections, a count of words) is judged by eye, by Rahul and by users. A script may print it as a report. It never fails a build. (D-TECH-110)

## What we learned the hard way

- **A count that may only fall becomes a negotiation.** From 13-10-2026 twelve counts and nineteen look rules gated every page. Each was reasonable alone. Together, a design Rahul had chosen could not ship until three checks were taught to skip it, and Rahul was asked for leave to pass our own checks (D-UX-128, D-TECH-64). About thirty log entries exist only to record a count raised by hand. The counts had no evidence behind them: the user tests that were to prove them never ran. (`docs/archive/LOAD-MEASURE.md`)
- **A finding from a review is a lesson first.** "Each thing a review finds becomes a check in the same PR" grew the site check to 2,086 lines. A finding becomes a check only when it guards something in the list above.
- **A check holds figures and roles, never wording or ids.** A check that matches a whole sentence fails when a writer improves the sentence. A check that finds fields by `#fld-…` fails every line when a page is rebuilt, whether or not the new page works. That is how "replace the machinery" lost to the old page's shape. Find a field by its label, a result by its role, and assert the figure. (D-TECH-111)
- **A check that needs Rahul's leave to let a design change is red tape.** Change the check in the same commit and say so in the PR.
- **Passing checks is not the result.** See the end of `rahul.md`.

## Tests that test nothing

- A test asserts that its fixture exists and is the one meant, picked by its full key. No expectation sits inside an `if`.
- A check over many items collects every offender and asserts the list is empty, so one run names them all.
- When a component is removed, grep the checks for its selectors: a check that finds nothing passes in silence.
- A new measure is first run on a page whose answer is known.
- A count that moves when no words changed is a bug in the measure.
- A check tests each clause of what it claims: "44 px" tested only the corners.
- A field's label can change with the page's state (a year, a mode, a method). Before a check moves from ids to labels, record every label each field shows through one whole run; a field with more than one label keeps its id until its step is read by hand. (CHECKS1)
- A selector that finds nothing ends the whole site check with a timeout, so each wrong one costs a run. Change selectors from a recording, never by trial. (CHECKS1)

## Running them

- `npm run verify -- --quick` between steps; CI's full run decides. Run it once, in the background, with its output to a file. Never two runs chained in one call.
- Test the engine by its tests before a browser opens; let one script walk a page and print only what is needed. (D-UX-349)
- The traps of each check script are in `docs/GOTCHAS.md`: grep the script's name.
