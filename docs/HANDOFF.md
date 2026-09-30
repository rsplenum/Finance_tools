# Handoff — start here in a new session
State at 30-09-2026: P0 (site + Worker skeleton) is on `main`, which Cloudflare Pages builds. **P1a (the DSCR engine) and P1b (the DSCR calculator at `/dscr/`) are done on draft PR #2.**
- **The page** asks two start questions, then the loan (or the years), the year-wise figures and the lender's target.
- **It shows** a free preview that stays provisional and lists what is still needed: the DSCR statement in the layout CAs use, and the repayment schedule month by month.
- **The owner's research request** (how CAs, consultants and CFAs make DSCR; what Ind AS says) is answered in `docs/DSCR-RESEARCH.md`.

The test figures are model-worked until the owner confirms fictional case A (`docs/GOLDEN-CASES.md`); nothing from the owner's office, ever (D-BIZ-02). Next is **P1c, the DSCR statement download**. Keep this file short and current.

## Where things are
- Live site: https://finance-tools-9if.pages.dev (Pages project `finance-tools`, built from `main`); each branch previews at `https://<branch>.finance-tools-9if.pages.dev`, linked on its pull request. Worker: not deployed (placeholder IDs). Repo: rsplenum/Finance_tools. Study report (private): https://claude.ai/code/artifact/4bad29bb-5d80-4b27-9386-be3f2581c068
- Read order: `CLAUDE.md` → this file → the `docs/DECISIONS.md` sections you need → `docs/PROJECT.md` only for the why. DSCR method in plain words: `docs/RULES.md` (generated). Cloudflare settings: `docs/CLOUDFLARE.md`.

## What works now
- `engine/util.ts` (EMI, formats, words) and `engine/parse.ts` (amounts, dates, months), tested against textbook figures.
- DSCR engine:
  - `engine/loan.ts`: the loan month by month (`months`), and by financial year (`schedule`).
  - `engine/dscr.ts`:
    - `dscrStatement` from the borrower's own figures;
    - `planStatement` from projections and loan terms, with the profit build-up and tax;
    - `amortization`, `maxLoanAmount`, `shortestRepayment` and `loanTimeline`;
    - a list of facts needed instead of figures.
  - `engine/dscr-check.ts`: the second computation, closed-form month by month. Figures are withheld if it disagrees.
  - Data: the method and three presets in `engine/data/dscr.json`; tax rates by borrower in `engine/data/tax.json`.
- DSCR page (D-UX-03 to 06, D-TECH-09 and 11):
  - Files:
    - `site/src/dscr/model.ts`: pure; typed text to engine to words, with the statement and schedule views; unit-tested.
    - `Calculator.tsx`: the island.
    - `site/src/fields.tsx`: fields that keep a draft until left.
  - Fields are `fld-…`; answers have `data-testid`:
    - summary: `dscr-status`, `dscr-needs`, `dscr-average`, `dscr-lowest`, `dscr-verdict`, `dscr-largest`, `dscr-fewest`, `answer-bar`;
    - statement: `dscr-<year>`, `available-<year>`, `service-<year>`, `pbt-<year>`, `tax-<year>`, `card-<year>`;
    - schedule: `schedule-<year>`, `month-<YYYY-MM>`;
    - loan read-back: `loan-level`, `loan-dates`, `amount-read`;
    - buttons: `tax-<borrower>`, `clear-all`.
- `site/`: home, `/dscr/`, 404; dark mode without a flash. `worker/`: `GET /health`.
- Checks, all in CI:
  - `npm test` (65, including the simulation);
  - `npm run typecheck`;
  - `npm run rules-doc -- --check`;
  - `npm run build`;
  - `npm run worker:build`;
  - `npm run check:site`: 0 violations. It drives the calculator with case A and with own figures, and takes about 15 s.

## Next — one fresh session per item
| # | Session | Starter prompt (paste as the first message) |
|---|---|---|
| P1c | DSCR statement download | "Read CLAUDE.md, docs/HANDOFF.md, docs/RULES.md, docs/DSCR-RESEARCH.md §2 and §7, and docs/LESSONS-CARRIED.md §1, §4 and §8. P1c: the DSCR statement as a document to download from the `/dscr/` preview. Formats first (a PDF for the lender; an Excel copy with the working for the accountant if it stays small), built in the browser from the engine's result only, reusing the statement and schedule views in `site/src/dscr/model.ts`; no figure computed in the document code. Ask first what the document needs that the page does not ask yet (like the borrower's name and the lender) and take each fact once. The statement states the method in plain words, the facts entered, the year-wise table, the average and the lowest year, the target and what limits the result; while anything is missing it is marked provisional and lists what is still needed. Test the document's text, not screenshots, and that the download works at 390 px. No payment yet. Finish per HANDOFF." |
| P1d | Payment for the download | Starter prompt to be written at the end of P1c (Razorpay through the Worker, after the owner's Phase 0 items). |

## End of every session
1. `npm test` (includes the simulation; `npm run sim` prints it: 0 violations), `npm run typecheck`, `npm run rules-doc`, `npm run build`, `npm run check:site` (0 violations). One line in `docs/DECISIONS.md` per decision.
2. Update this file (state + next), commit, draft PR. The branch preview builds itself (link on the PR); open it and say so.

## Waiting on the owner
- **Read `docs/DSCR-RESEARCH.md`.** From general knowledge (never an employer's norms), say:
  - whether the three presets (common, RBI 2020, Schedule III) are right and in the right order;
  - whether any lender you serve uses the simple average;
  - whether the tax rates by borrower hold for FY 2026-27.
- **To let a session read the primary texts itself,** allow `rbi.org.in`, `rbidocs.rbi.org.in`, `icai.org` and `bcasonline.org` in the environment's network settings. They are blocked now; the research used secondary sources.
- Try `/dscr/` on the branch preview (link on PR #2) with fictional case A, on a phone too, and say what reads wrong or asks too much.
- Work fictional case A (`docs/GOLDEN-CASES.md`) in your own Excel at home, or send public worked examples with their source. Never office files (D-BIZ-02).
- Read `docs/RULES.md` and say, from general knowledge (not an employer's norms), whether the four choices and the "common" preset are right, and which lenders' published norms matter first. The page shows both as "not yet checked" until then.
- The Worker (`docs/CLOUDFLARE.md` §2: create D1 + KV, send the IDs) can wait until the payment session.
- Allow `developers.cloudflare.com` and `pages.dev` in the environment's network settings (both blocked now), so a session can check `docs/CLOUDFLARE.md` against the docs and open previews itself.
- Business entity, GST registration and Razorpay account (Phase 0).
- Before payments: keep the separate Worker (D-TECH-01) or move the API beside the site as Pages Functions (same address, separate preview data per branch)? Branch previews of a separate Worker share the live D1 and KV. Decide with the Cloudflare docs open.
- A product name and domain (the site says "Loan document tools" for now); at launch remove the `noindex` in `site/public/_headers`.
- First region and cities for construction rates (Phase 2).
- Main customer first: DSAs (plans) or borrowers (one-off).

## Gotchas
- One session at a time per checkout; check `git log origin/<branch>` and `git status` before any reset.
- The session's git proxy caps concurrent git operations: one clone or fetch at a time.
- Astro runs from inside `site/` (the npm scripts do this): `astro dev --root site` finds no pages in Astro 7.3. The dev server logs to `site/.astro/dev.log`.
- `.astro` files are not type-checked (TypeScript 7): keep logic in `.ts`/`.tsx`.
- Worker runtime types are generated by `npm run typecheck` (or `npm run worker:types`) and gitignored.
- `npm run check:site` needs `npm run build` first. Playwright is pinned to the container's Chromium (1.56.1); if a container ships another version, set `CHROMIUM_PATH=/opt/pw-browsers/chromium`.
- Vitest 5 hides console output from passing tests; `npm run sim` shows the simulation's per-seed summary (about 10 s).
- Stop background servers by PID: `pkill -f 'wrangler dev'` also matches the calling shell.
- A field's `change` event (a month picker, or Playwright's `fill`) can arrive before Preact re-renders the draft: commit from the input's own value, as `useDraft` in `site/src/fields.tsx` does. Preact runs `useEffect` only after the next frame (or 35 ms): use `useLayoutEffect` where a field must show a change at once, and make checks wait for what they read (`expectText`, `expectValue`).
- Scratch scripts outside the repo cannot import `playwright` by name; import `node_modules/playwright/index.mjs` by path.
- WebFetch goes through the same network policy: rbi.org.in, bcasonline.org and srbatliboi.in were refused, while WebSearch works. Mark anything read only through search results as secondary.
