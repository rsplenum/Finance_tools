# Handoff — start here in a new session
State at 02-10-2026: P0 to P1e are on `main` (PRs #2 to #5), which Cloudflare Pages builds: the DSCR engine, the calculator at `/dscr/`, the statement to download as a PDF and an Excel copy (D-DOC-01, D-DOC-02, D-TECH-13), free for now, without the page's assumptions or its verdict, largest loan and fewest instalments (D-DOC-03), and P1e: existing EMIs as debt service, the tax by who the borrower is (a proprietor's slab rates), and the new asset's income, each worked out twice and shown on the current page in the smallest way (D-POL-07 to 09, D-UX-11, D-TECH-15). The interest rule is in the owner's words (D-POL-10).
- **The owner is not satisfied with the page.** An outside review (Gemini, reading `main` before PR #2 was merged) and the owner's own words: it should ask seven inputs, not ten plus method choices. The engine's maths stands; the review's own formula taxes profit before interest. **Next:** the downloads (P1g: the layout of the PDF and the Excel copy reworked, and a Word copy, as the owner asked on 02-10-2026), then the front door itself (P1f): the owner's inputs by default, everything else under one closed "More options" (D-POL-05, D-POL-06, D-UX-10): a borrower first.
- **Skills** in `.claude/skills/` (D-TECH-14): `brief-first` (now with the finish line, the owner saying it feels simple, and what to refuse; D-UX-12), `money-maths-checks`, `lender-documents`. The owner's rule, now in CLAUDE.md: give the tradeoffs of every request.

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
    - `planStatement` from projections and loan terms, with the profit build-up and tax; per year it also takes the new asset's income (`assetIncome`, added to profit), existing EMIs (`existingEmis`, debt service in full under every method, `PLAN_SERVICE`) and, in place of a rate, who the borrower is (`taxBy`);
    - `amortization`, `maxLoanAmount`, `shortestRepayment` and `loanTimeline`;
    - an optional first year of figures (`start`) that leaves out an interest-only first year by the user's choice (D-POL-04);
  - `engine/project.ts`: yearly figures from one or two answers (the same, grows by %, falls by %), checked in closed form (D-TECH-12). The page asks a few answers per line, not every year (D-UX-07). Also `emisByYear` (EMIs a month to each year, up to each loan's last EMI) and `fromMonth` (a yearly figure from the month it starts running);
    - a list of facts needed instead of figures.
  - `engine/tax.ts`: `taxOn` by borrower (slabs, rebate and marginal relief, surcharge and marginal relief, cess), `taxSummary`, `BORROWERS`.
  - `engine/dscr-check.ts`: the second computation, closed-form month by month; `taxCheck`, `emisCheck`, `fromMonthCheck`. Figures are withheld if it disagrees.
  - Data: the method, three presets and which existing EMIs count by borrower (`existingEmis`) in `engine/data/dscr.json`; the tax by borrower (proprietor, firm or LLP, company; secondary sources) in `engine/data/tax.json`.
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
    - who the borrower is: `fld-borrowerType-<proprietor|firm|company>`; `tax-by` (the tax line's words);
    - loans already running: the mode `fld-otherLoansInterest-emi`, then `fld-emi-<n>`, `fld-emiLast-<n>`, `add-loan`, `remove-loan`, `emis-ask`, `readback-existingEmis`;
    - the new asset: the mode `fld-assetIncome-from`, then `fld-assetIncome-yearly`, `fld-assetIncome-start`, `readback-assetIncome`;
    - statement lines shown only when not nil: `asset-<year>`, `emis-<year>`;
    - buttons: `clear-all`;
    - download: fields `fld-borrower`, `fld-lender`, `fld-preparedBy`; `doc-status`, `doc-needs`, `doc-wait`, `download-pdf`, `download-xlsx`.
- The document (P1c):
  - `site/src/dscr/document.ts`: `statementDoc` builds it from the state and the preview; `docNeeds`, `docStatus`, `fileName`.
  - `site/src/doc/`: `doc.ts` (blocks, `docText` for tests), `pdf.ts` (PDF writer, `printable`), `xlsx.ts` (Excel writer and zip). Pure, no DOM.
  - `scripts/read-doc.mjs`: reads the files back with pdf.js and read-excel-file, for the tests and the site check.
- `site/`: home, `/dscr/`, 404; dark mode without a flash. `worker/`: `GET /health`.
- Checks, all in CI:
  - `npm test` (130, including the simulation and the document read back by pdf.js and read-excel-file);
  - `npm run typecheck`;
  - `npm run rules-doc -- --check`;
  - `npm run build`;
  - `npm run worker:build`;
  - `npm run check:site`: 0 violations. It drives the calculator with case A, the quick path, a proprietor with EMIs and the new asset, and own figures, downloads the PDF and the Excel copy at 390 px (provisional, then complete) and reads them back; about 20 s.

## Next — one fresh session per item
| # | Session | Starter prompt (paste as the first message) |
|---|---|---|
| P1g | The downloads: a new layout, and a Word copy | "Work from `main`. Read CLAUDE.md, docs/HANDOFF.md, the `lender-documents` skill and docs/DECISIONS.md D-DOC-01 to D-DOC-03. P1g: the downloads. (1) The layout of the PDF and the Excel copy: before building, show me in one message how they will look, as a CA's DSCR statement would: what is on the first page, the order of the sections, the statement table, what moves to an annex and what is cut. Then build what I agree. (2) A Word copy (.docx) as a third download beside the PDF and the Excel copy, written in the browser from the same document with no library, as the other two are, and read back in the tests by a reader written by others. The site check downloads all three at 390 px and reads them back. Every figure stays one the page showed or the user typed. Finish per HANDOFF." |
| P1f | The front door for `/dscr/` | "Work from `main`. Read CLAUDE.md, docs/HANDOFF.md and docs/DECISIONS.md D-UX-10 to D-UX-12. P1f: the front door, for a borrower first, with a visible link at the top for a DSA's or CA's year-by-year projections. By default the page asks only: who the borrower is (it sets the tax and which EMIs count); this year's profit (before tax, depreciation and loan interest); growth % a year; existing EMIs a month (labelled by borrower type); depreciation, if any; loan amount; interest rate; term in years. The loan starts this month, listed as an assumption. Everything else goes under one closed 'More options', grouped inside (the loan, the business, the method); it also takes extra income from the new asset and each existing loan's end month (the engine has them: P1e). Results first: the EMI (or the first instalment), total interest over the loan (added to the engine and worked out twice, since the page adds no figures), the average and lowest DSCR, each year marked against the target in words and colour, and the verdict; then the year-wise table, with each part-year marked with its instalments ('7 of 12 instalments'), and the schedule; the download buttons, and Print (it opens the same PDF). Shorten the list of assumptions by grouping them (the method and the target in one line). Done when: the default path shows only those fields and the More-options control, and the site check counts them and fails if the count grows; at 390 px the results show without opening More options; More options is closed on load; cases A, A′ and P pass through More options; the downloads stay in step and read back; and I have tried it on a phone and a desktop and say it feels simple. Finish per HANDOFF." |
| P1d | Payment for the download (after P1f, and after the owner's Phase 0 items: business entity, GST, Razorpay account) | "Work from `main`. Read CLAUDE.md, docs/HANDOFF.md, docs/DECISIONS.md (D-TECH-01, D-TECH-06, D-DOC-01) and docs/CLOUDFLARE.md. P1d: payment for the DSCR statement download, through Razorpay and the Worker. Ask me first, in one message: the price; whether the Worker stays separate or moves beside the site as Pages Functions; and, since the document is made in the browser, whether payment only unlocks the two buttons (anyone reading the page's code could still make the file) or the file must come from the server. Then build it: the order made in the Worker, the payment verified by its signature, and the buttons unlocked for that statement only. Test with Razorpay's test keys, set only in the environment settings, never in the repo. The preview stays free. Finish per HANDOFF." |

## End of every session
1. `npm test` (includes the simulation; `npm run sim` prints it: 0 violations), `npm run typecheck`, `npm run rules-doc`, `npm run build`, `npm run check:site` (0 violations). One line in `docs/DECISIONS.md` per decision.
2. Update this file (state + next), commit, draft PR. The branch preview builds itself (link on the PR); open it and say so.

## Waiting on the owner
- **Merge PR #5** before the next session: no freeze, the interest rule in your words, and the downloads without the assumptions, the verdict, the largest loan and the fewest instalments.
- **Try P1e on the live site**: who the borrower is, EMIs a month, the new asset's income.
- **Try P1f** once it is built, on a phone and a desktop: it is done when you say it feels simple.
- **Work fictional case P** (`docs/GOLDEN-CASES.md`: a proprietor with EMIs and a new asset) at home, as for A and A′.
- **Check the tax by borrower** (`docs/RULES.md`, "Tax by borrower"): a proprietor's new-regime slab rates for 2026-27, the firm's surcharge above Rs. 1 crore, and the assumption that a proprietor's business profit is their only income. Read from secondary sources only.
- **The downloads' layout (P1g):** you want the PDF and the Excel copy laid out better, and a Word copy. If you can, say before P1g what else reads wrong (open the Excel copy in Excel itself too). In particular:
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
- **Network settings:** allow `rbi.org.in`, `rbidocs.rbi.org.in`, `icai.org` and `bcasonline.org` so a session can read the primary texts (the research used secondary sources); `incometaxindia.gov.in`, `incometax.gov.in`, `indiabudget.gov.in` and `egazette.gov.in` for the tax rates; and `developers.cloudflare.com` and `pages.dev` so it can check `docs/CLOUDFLARE.md` and open previews itself. All are blocked now.
- The Worker (`docs/CLOUDFLARE.md` §2: create D1 + KV, send the IDs) can wait until the payment session.
- Business entity, GST registration and Razorpay account (Phase 0).
- Before payments: keep the separate Worker (D-TECH-01) or move the API beside the site as Pages Functions (same address, separate preview data per branch)? Branch previews of a separate Worker share the live D1 and KV. Decide with the Cloudflare docs open.
- A product name and domain (the site says "Loan document tools" for now); at launch remove the `noindex` in `site/public/_headers`.
- First region and cities for construction rates (Phase 2).
- Main customer first, for the price (P1d): DSAs (plans) or borrowers (one-off). The page is built for a borrower first (D-UX-10).

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
- A row's answers are radios `fld-<key>-<answer>`: a field of that row must not reuse one (the new asset's month is `fld-assetIncome-start`, since `fld-assetIncome-from` is the radio).
- Expected figures in tests: round the exact value once. 6,15,500 ÷ 2,09,000 is 2.94498, which shows as 2.94; rounding 2.9450 again gives a wrong 2.95.
