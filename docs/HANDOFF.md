# Handoff — start here in a new session
State at 30-09-2026: P0, P1a (the DSCR engine) and P1b (the DSCR calculator at `/dscr/`) are on `main` (PR #2 merged), which Cloudflare Pages builds. **P1c, the DSCR statement to download, is done on a draft PR** from branch `ccr-ba2b6ab9-casbge`, waiting for the owner to try the preview and say "merge the PR".
- **The page opens with its assumptions answered** (D-UX-08): it asks only the loan and this year's four figures, and lists each assumption until it is changed.
- **It shows** a free preview that stays provisional and lists what is still needed: the DSCR statement in the layout CAs use, and the repayment schedule month by month.
- **New: "Download the statement"** under the preview. It asks the borrower's name, the lender and, if not the borrower, who prepared it (D-UX-09), then makes a PDF for the lender and an Excel copy for the accountant in the browser (D-DOC-01, D-DOC-02, D-TECH-13). Free for now; payment is P1d.

The test figures are model-worked until the owner confirms fictional cases A and A′ (`docs/GOLDEN-CASES.md`); nothing from the owner's office, ever (D-BIZ-02). Next: fixes from the owner's try of the download, if any, then **P1d, payment for the download**. Keep this file short and current.

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
    - an optional first year of figures (`start`) that leaves out an interest-only first year by the user's choice (D-POL-04);
  - `engine/project.ts`: yearly figures from one or two answers (the same, grows by %, falls by %), checked in closed form (D-TECH-12). The page asks a few answers per line, not every year (D-UX-07);
    - a list of facts needed instead of figures.
  - `engine/dscr-check.ts`: the second computation, closed-form month by month. Figures are withheld if it disagrees.
  - Data: the method and three presets in `engine/data/dscr.json`; tax rates by borrower in `engine/data/tax.json`.
- DSCR page (D-UX-03 to 06, D-TECH-09 and 11):
  - Files:
    - `site/src/dscr/model.ts`: pure; typed text to engine to words, with the statement and schedule views; unit-tested.
    - `Calculator.tsx`: the island.
    - `site/src/fields.tsx`: fields that keep a draft until left.
    - In `model.ts`: `ASSUMED` (the starting state, from `engine/data/defaults.json`), `assumedIn` and `withSource`. The statement and schedule views carry the engine's exact figures (`n`) beside the words, for the Excel copy.
  - Fields are `fld-…`; answers have `data-testid`:
    - assumptions: `dscr-assumed`, `assumed-<id>`;
    - summary: `dscr-status`, `dscr-needs`, `dscr-average`, `dscr-lowest`, `dscr-verdict`, `dscr-largest`, `dscr-fewest`, `answer-bar`;
    - statement: `dscr-<year>`, `available-<year>`, `service-<year>`, `pbt-<year>`, `tax-<year>`, `card-<year>`;
    - schedule: `schedule-<year>`, `month-<YYYY-MM>`;
    - loan read-back: `loan-level`, `loan-dates`, `amount-read`;
    - buttons: `tax-<borrower>`, `clear-all`;
    - download: fields `fld-borrower`, `fld-lender`, `fld-preparedBy`; `doc-status`, `doc-needs`, `doc-wait`, `download-pdf`, `download-xlsx`.
- The document (P1c):
  - `site/src/dscr/document.ts`: `statementDoc` builds it from the state and the preview; `docNeeds`, `docStatus`, `fileName`.
  - `site/src/doc/`: `doc.ts` (blocks, `docText` for tests), `pdf.ts` (PDF writer, `printable`), `xlsx.ts` (Excel writer and zip). Pure, no DOM.
  - `scripts/read-doc.mjs`: reads the files back with pdf.js and read-excel-file, for the tests and the site check.
- `site/`: home, `/dscr/`, 404; dark mode without a flash. `worker/`: `GET /health`.
- Checks, all in CI:
  - `npm test` (103, including the simulation and the document read back by pdf.js and read-excel-file);
  - `npm run typecheck`;
  - `npm run rules-doc -- --check`;
  - `npm run build`;
  - `npm run worker:build`;
  - `npm run check:site`: 0 violations. It drives the calculator with case A, the quick path and own figures, downloads the PDF and the Excel copy at 390 px (provisional, then complete) and reads them back; about 16 s.

## Next — one fresh session per item
| # | Session | Starter prompt (paste as the first message) |
|---|---|---|
| P1c fixes | Only if the download needs changes before merging | "Read CLAUDE.md and docs/HANDOFF.md. The P1c pull request (branch `ccr-ba2b6ab9-casbge`) is still a draft: work on that branch and push to it (you have my permission). In the downloaded statement, this reads wrong or is missing: <your notes>. Fix only that, keep cases A and A′ passing, finish per HANDOFF." |
| P1d | Payment for the download (after the P1c PR is merged: say "merge the PR" at the start, or merge it on GitHub first; and after the owner's Phase 0 items: business entity, GST, Razorpay account) | "Work from `main`. Read CLAUDE.md, docs/HANDOFF.md, docs/DECISIONS.md (D-TECH-01, D-TECH-06, D-DOC-01) and docs/CLOUDFLARE.md. P1d: payment for the DSCR statement download, through Razorpay and the Worker. Ask me first, in one message: the price; whether the Worker stays separate or moves beside the site as Pages Functions; and, since the document is made in the browser, whether payment only unlocks the two buttons (anyone reading the page's code could still make the file) or the file must come from the server. Then build it: the order made in the Worker, the payment verified by its signature, and the buttons unlocked for that statement only. Test with Razorpay's test keys, set only in the environment settings, never in the repo. The preview stays free. Finish per HANDOFF." |

## End of every session
1. `npm test` (includes the simulation; `npm run sim` prints it: 0 violations), `npm run typecheck`, `npm run rules-doc`, `npm run build`, `npm run check:site` (0 violations). One line in `docs/DECISIONS.md` per decision.
2. Update this file (state + next), commit, draft PR. The branch preview builds itself (link on the PR); open it and say so.

## Waiting on the owner
- **Try the download on the preview** (https://ccr-ba2b6ab9-casbge.finance-tools-9if.pages.dev/dscr/), on a phone too: open the PDF, and the Excel copy in Excel itself (it was read by pdf.js, read-excel-file and openpyxl, but not opened in Excel). Say what reads wrong; then "merge the PR". In particular:
  - is anything missing that a lender expects on it (the loan's purpose, the borrower's address, a GSTIN)?
  - do the signature block and "Not a CA's certificate" suit?
  - should the Excel copy carry formulas that redo the working (D-DOC-02)?
- **Check the page's assumptions** (`docs/RULES.md`, "What the page assumes until you change it"), above all the tax rate of 31.2% and profit growing with sales.
- **Work fictional cases A and A′** (`docs/GOLDEN-CASES.md`) in your own Excel at home, or send public worked examples with their source. Never office files (D-BIZ-02).
- **Read `docs/RULES.md` and `docs/DSCR-RESEARCH.md`.** From general knowledge and published material only (never an employer's norms), say:
  - whether the four choices and the three presets (common, RBI 2020, Schedule III) are right and in the right order;
  - whether you know published lender norms that use the simple average, and which lenders' published norms matter first;
  - whether the tax rates by borrower hold for FY 2026-27.

  The page shows the method as "not yet checked" until then.
- **Network settings:** allow `rbi.org.in`, `rbidocs.rbi.org.in`, `icai.org` and `bcasonline.org` so a session can read the primary texts (the research used secondary sources), and `developers.cloudflare.com` and `pages.dev` so it can check `docs/CLOUDFLARE.md` and open previews itself. All are blocked now.
- The Worker (`docs/CLOUDFLARE.md` §2: create D1 + KV, send the IDs) can wait until the payment session.
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
- LibreOffice is installed in the container but loads no file ("source file could not be loaded", even a CSV). To look at a PDF's layout, render its pages with pdf.js in Chromium (a scratch script serving `node_modules/pdfjs-dist`); to check a workbook, `pip install openpyxl` in a scratch venv.
- `new Blob([bytes])` needs `Uint8Array<ArrayBuffer>` in TypeScript 7: the writers return that type.
- pdf.js in Node: `getDocument(...)` returns a task; call `task.destroy()`, not the document's.
- A field's `change` event (a month picker, or Playwright's `fill`) can arrive before Preact re-renders the draft: commit from the input's own value, as `useDraft` in `site/src/fields.tsx` does. Preact runs `useEffect` only after the next frame (or 35 ms): use `useLayoutEffect` where a field must show a change at once, and make checks wait for what they read (`expectText`, `expectValue`).
- Scratch scripts outside the repo cannot import `playwright` by name; import `node_modules/playwright/index.mjs` by path.
- WebFetch goes through the same network policy: rbi.org.in, bcasonline.org and srbatliboi.in were refused, while WebSearch works. Mark anything read only through search results as secondary.
