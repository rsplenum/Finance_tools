# Lessons carried from the credit-appraisal project (Sep 2026)

What worked, what went wrong, and the rule each taught. Nothing here is bank content: no circular text, no bank rule, no customer data.

## 1. How the owner works (keep these without being told)
- **Low token use.** One feature per session. Grep before reading; never read a large PDF or source text whole. Check the UI with text assertions, and take screenshots only for layout questions.
- **Handoff every session.** End each session by updating `docs/HANDOFF.md` and giving a starter prompt the owner can paste into a fresh session.
- **Draft PRs.** The owner says "merge the PR" when they have tried it. No hourly PR check-ins unless asked.
- **Plain words on screen.** No clause codes like "p.10 Ch-1 §3.1(e)" in the UI. Sources sit behind an icon. Formal documents keep citations.
- **Ask first what narrows later questions.** Purpose, product and type come first. Enter each fact once and show it elsewhere read-only.
- **A list the owner gives is examples, never the full set.** Generalise from it, and say which cases you added.
- **Where the rules are silent, flag; do not restrict.** Raise a review item for a human instead of blocking.
- **Creativity is expected.** Propose your own design ideas and criticise your own work. Don't wait to be told everything; the owner said so bluntly when too much depended on their input.
- **"Intuitive" means short and clear, never diluted.** Cut repeated and explanatory text, and keep every fact that matters. What doesn't change the answer is counted in one line, not listed.
- **Test against the owner's own worked figures.** The first live test showed the maths "way off" while every model-written test passed. The owner's Excel sheet is the truth.

- **Legal condition (settled 30-09-2026):** market across India online, but never sell directly to the customers of the owner's employer bank (D-BIZ-01).

## 2. Product principles
- **Numbers come from deterministic code, never from an AI.** Amounts, eligibility and approvals are computed; AI may only draft text or read documents into facts a human confirms.
- **Never default a missing fact.** Show "needed: X" and keep the figure provisional until X is entered.
- **Quoted figures become commitments.** Block the quote (e.g. an indicative sheet) while any fact it depends on is missing or the second computation disagrees.
- **Rules and rates live in one data module**, each with its source and date. Bank- or client-specific values sit in a separate config, marked unverified until supplied.
- **Show what limits the answer.** For example: "limited by X in month N; Y has Rs. Z of room."
- **Stress tests and prudence flags are shown, never applied silently.** Prudence is tagged as prudence, not policy.

## 3. Calculation reliability (how the maths was made trustworthy)
- **Golden cases from real worked figures**, anonymised, compared to the rupee. One example: Rs.7,00,18,520 against the Excel's Rs.7,00,18,523.50, a Rs.3.50 gap explained by rounding.
- **A second, independent computation** of every quoted figure, written separately. Any disagreement blocks the output.
- **Property tests:** the result is monotone in income, tenure and rate; the balance reaches 0; every monthly constraint holds.
- **A simulation harness:** thousands of generated cases, invariants checked, a random fact dropped each time. Run every seed, not just one: a bug showed only on seed 4.
- **Understand the domain method before coding it.** Most of the rework came from misreading how practitioners do the calculation, e.g. tiered EMI:
  - Maximum = present value of each tier's surplus.
  - At a lower amount, every tier pays the same share of its surplus.
  - Tiers end where the income runs out.
- **Sub-rupee rounding matters at the edges:**
  - The last month's remainder must not push the instalment over the month's limit.
  - A Rs.1 loan must still show an instalment above 0.
- **Keep solvers monotone.** When the maximum is the least of per-constraint bisections, every constraint must be monotone in the principal.

## 4. UI / UX lessons
- **Decisive facts first.** A short set of screens gives the answer early, provisional until complete. An "answer so far" bar shows what is known after each step.
- **A "No" hides the follow-up questions.**
- **Keep what is being typed in a local draft until the field is left.** A re-render from another field must not wipe it (bug: a typed 0 vanished).
- **A half-typed value must never make the whole state invalid.** Required text fields default to "" in the schema; an invalid state rebuilt the screen and made it jump.
- **Every choice that changes the answer needs its follow-up questions.** Example: "record found" must ask what was found.
- **Offer the better option when the default falls short.** Example: "EMI gives less than asked; tiered gives more — use it?"
- **Mobile from the start:**
  - no horizontal scroll at 390 px;
  - 16 px inputs;
  - tables become cards on phones.
- **Dark mode:** every element carries `dark:` classes, and the toggle cycles Auto → Light → Dark without a flash on load.

## 5. Engineering workflow
- **Every change runs:** tests, typecheck, simulation (0 violations), regenerated docs. Then one line in `DECISIONS.md` and a commit.
- **DECISIONS.md is an indexed log**, with IDs by area (POL, UX, TECH, DOC, DATA, AI). It keeps later sessions from re-deciding settled questions.
- **HANDOFF.md is short and current:** state, next items with starter prompts, gotchas, and what waits on the owner.
- **Data-driven rules:** a rules document is generated from the code (`npm run rules-doc`), so docs never drift.
- **Browser checks:** Playwright scripts use text assertions and stable ids on inputs (`fld-<path>`) and on results (`data-testid`).
- **Reproduce before fixing.** Examples: the zero-vanishing bug and the jumping screen were each found by driving the page, not by reading code.
- **When a regression appears, check the commit before yours.** A worktree at the previous commit proved the simulation failures were new.

## 6. AI use
- **Where AI helped:**
  - reading documents into facts with cited evidence;
  - drafting narrative;
  - a second reader for key fields;
  - adversarial "weak file" tests;
  - a lessons register of reviewed rules that only raise questions.
- **Cost measured, not guessed:** log usage per run, e.g. about $2–3 per file for full reading.
- **Customer data:** decide which AI service may see documents before any real document is sent. Anonymise first and keep the identity map out of git.
- **New models (e.g. "never hallucinates" claims):** check what the claim actually means, and trial the model on synthetic data against ground truth before relying on it.

## 7. Session and environment gotchas (Claude Code on the web)
- **One session at a time per checkout.** Never `git reset` / `checkout -B` without checking `git log origin/<branch>` and `git status`; one reset dropped another session's commit.
- **Publishing a claude.ai page from a new session:** the first publish is refused, and the live copy is saved locally.
  1. Grep the saved copy to confirm it is an older build.
  2. Read its first lines.
  3. Publish again.
- **Container network is policy-controlled.** A blocked host (403 from the proxy) is fixed in the environment settings, not in code.
- **Shell safety-check failures are transient.** Retry once, then carry on with file tools.
- **Secrets go in environment settings, never in the repo.**

## 8. Mistakes and the rule each left
| Mistake | Rule |
| --- | --- |
| Tests written from the model's own understanding passed while the method was wrong | Golden tests come from the owner's worked figures |
| Tiered option showed "Rs. 0 / does not work" when a later period had no income | Model the domain boundary (tiers end where income ends) |
| Long explanatory paragraphs, the same label repeated on every option | State a thing once; list only what changes the answer |
| The owner's list treated as complete | Generalise; lists are examples |
| Invented page references in generated text | Cite only what was looked up; say "approximate" otherwise |
| Asked the owner for things already in the rules text | Search the source before asking |
