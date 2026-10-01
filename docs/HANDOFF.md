# Handoff — start here in a new session
State at 30-09-2026: P0 to P1c are on `main` (PRs #2 and #3 merged), which Cloudflare Pages builds: the DSCR engine, the calculator at `/dscr/`, and the statement to download as a PDF and an Excel copy (D-DOC-01, D-DOC-02, D-TECH-13), free for now.
- **The owner is not satisfied with the page.** An outside review (Gemini, reading `main` before PR #2 was merged) and the owner's own words: it should ask seven inputs, not ten plus method choices. The engine's maths stands; the review's own formula taxes profit before interest. **Next: the engine the front door needs (P1e), then the front door itself (P1f)**: the owner's seven inputs by default, everything else under one closed "More options". The owner answered five of the six choices on 01-10-2026 (D-POL-05, D-POL-06, D-UX-10); who the page suits first is still open (below).
- **Skills** in `.claude/skills/` (D-TECH-14): `brief-first`, `money-maths-checks`, `lender-documents`. The owner's rule, now in CLAUDE.md: give the tradeoffs of every request.

The test figures are model-worked until the owner confirms fictional cases A and A′ (`docs/GOLDEN-CASES.md`); nothing from the owner's office, ever (D-BIZ-02). Keep this file short and current.

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
| P1e | The engine for the front door (after the owner confirms the plan below) | "Work from `main`. Read CLAUDE.md, docs/HANDOFF.md and docs/DECISIONS.md D-POL-05, D-POL-06 and D-UX-10. P1e: the engine the front door needs, each figure worked out twice, with hand-worked tests. (1) The first year is the leftover period from the month the loan starts to 31 March, and the last part-year runs to the last instalment. When the page works the figures out from this year's figures, a part-year takes the year's figures by months; say so in engine/data/dscr.json, so docs/RULES.md shows it. (2) Existing EMIs a month count as debt service by borrower type: all of a proprietor's EMIs, and a firm's, LLP's or company's own loans only. (3) The borrower type sets the tax: the company and firm/LLP rates as now; for a proprietor, the new regime's slab rates with the rebate and cess, in a dated data file with sources (official ones if the network allows, else marked secondary). Show them on the current page in the smallest way (borrower-type buttons, an EMIs-a-month field); the front door comes next session. Finish per HANDOFF." |
| P1f | The front door for `/dscr/` | "Work from `main`. Read CLAUDE.md, docs/HANDOFF.md and docs/DECISIONS.md D-UX-10. P1f: the front door. It suits first: <borrowers, or DSAs and CAs>. By default the page asks only: who the borrower is; this year's profit (before tax, depreciation and loan interest); growth % a year; existing EMIs a month (labelled by borrower type); depreciation, if any; loan amount; interest rate; term in years. The loan starts this month, listed as an assumption. Everything else goes under one closed 'More options', with a visible link for year-by-year projections. Results first: the EMI (or the first instalment), total interest, the average and lowest DSCR, each year marked against the target in words and colour; then the year-wise table and the schedule; buttons PDF, Excel and Print (Print opens the same PDF). The site check counts the default fields. Keep cases A and A′ passing through More options, and the document in step. Finish per HANDOFF." |
| P1d | Payment for the download (after P1f, and after the owner's Phase 0 items: business entity, GST, Razorpay account) | "Work from `main`. Read CLAUDE.md, docs/HANDOFF.md, docs/DECISIONS.md (D-TECH-01, D-TECH-06, D-DOC-01) and docs/CLOUDFLARE.md. P1d: payment for the DSCR statement download, through Razorpay and the Worker. Ask me first, in one message: the price; whether the Worker stays separate or moves beside the site as Pages Functions; and, since the document is made in the browser, whether payment only unlocks the two buttons (anyone reading the page's code could still make the file) or the file must come from the server. Then build it: the order made in the Worker, the payment verified by its signature, and the buttons unlocked for that statement only. Test with Razorpay's test keys, set only in the environment settings, never in the repo. The preview stays free. Finish per HANDOFF." |

## End of every session
1. `npm test` (includes the simulation; `npm run sim` prints it: 0 violations), `npm run typecheck`, `npm run rules-doc`, `npm run build`, `npm run check:site` (0 violations). One line in `docs/DECISIONS.md` per decision.
2. Update this file (state + next), commit, draft PR. The branch preview builds itself (link on the PR); open it and say so.

## Waiting on the owner
- **Still open for the front door** (asked 01-10-2026; Claude's recommendation first):
  - Who the page suits first: a borrower (the seven inputs, with a visible "I have year-by-year projections" link); or a DSA or CA (year-by-year figures first).
  - The loan's last part-year takes the year's figures by months, like the first.
  - One question, who the borrower is, sets both the tax and which EMIs count, in place of typing a tax rate.
  - The order: the engine first (P1e, with the proprietor's slab rates moved into it), then the front door (P1f), so the front door opens with the right numbers.
- **Try the download on the live site** (https://finance-tools-9if.pages.dev/dscr/), on a phone too: open the PDF, and the Excel copy in Excel itself (it was read by pdf.js, read-excel-file and openpyxl, but not opened in Excel). Say what reads wrong. In particular:
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
