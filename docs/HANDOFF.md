# Handoff — start here in a new session
State at 02-10-2026: P0 to P1g are on `main` (PRs #2 to #6), which Cloudflare Pages builds: the DSCR engine, the calculator at `/dscr/`, the statement to download (D-DOC-01, D-DOC-02, D-TECH-13), free for now, and P1e: existing EMIs as debt service, the tax by who the borrower is (a proprietor's slab rates), and the new asset's income, each worked out twice and shown on the current page in the smallest way (D-POL-07 to 09, D-UX-11, D-TECH-15). The interest rule is in the owner's words (D-POL-10).
- **P1g, merged in PR #6 on 02-10-2026:**
  - the downloads laid out as a CA's DSCR statement: page 1 has the whole working, every line, then the average and the lowest year, signed; Annex 1 is the basis, Annex 2 the repayment schedule (D-DOC-04);
  - a Word copy as the third download (D-DOC-06);
  - the lender's target, how far the method was checked and the planning rules left out of the documents, kept on the page (D-DOC-05).
  - a Total column in the statement, on the page and in the downloads: the engine adds each line over the years counted, checked twice (D-DOC-07).
- **Also in PR #6 (02-10-2026), the owner's "finish the project today":**
  - the construction or renovation estimate at `/estimate/` (D-UX-13);
  - the project report at `/project-report/` (D-UX-14);
  - the DSCR front door (P1f, D-UX-15): eight fields, everything else under a closed More options, results first, Print.
  Each tool has its own engine, worked out twice, and downloads in PDF, Excel and Word. PR #6 is merged, so all of it is on the live site.
- **The estimate's blueprint** (`docs/ESTIMATE-BLUEPRINT.md`, D-UX-16) is a proposal; nothing in it is built.
  - It draws on about 50 public sources, and on three sample documents the owner downloaded, used for structure only.
  - It plans the estimate for a layperson and a professional, in five thin steps, E1 to E5.
  - It waits on the owner's five decisions (A14).
- **The owner is not satisfied with the page.** An outside review (Gemini, reading `main` before PR #2 was merged) and the owner's own words: it should ask seven inputs, not ten plus method choices. The engine's maths stands; the review's own formula taxes profit before interest. **Next:** the owner tries the three tools on the live site, then payment (P1d) once the business entity, GST and Razorpay account exist. The front door is done when the owner says it feels simple (D-UX-15).
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
    - download: fields `fld-borrower`, `fld-lender`, `fld-preparedBy`; `doc-status`, `doc-needs`, `doc-wait`, `download-pdf`, `download-xlsx`, `download-docx`.
- Estimate: `engine/estimate.ts` (+ `estimate-check.ts`, `data/estimate.json`); page `site/src/estimate/` (`model.ts`, `Estimate.tsx`, `document.ts`); tests `tests/estimate*.test.ts` (fictional case E).
- Project report: `engine/report.ts` (+ `report-check.ts`, `data/report.json`; it calls `planStatement`); page `site/src/report/` (the page's tables in `model.ts` `viewOf` are the document's); tests `tests/report*.test.ts` (fictional case R, year 1 worked by hand). Shared: `site/src/download.ts` (the three files), `SelectField` in `site/src/fields.tsx`.
- The document (P1c, laid out in P1g):
  - `site/src/dscr/document.ts`: `statementDoc` builds it from the state and the preview: page 1, then `basisPart` (Annex 1) and `schedulePart` (Annex 2); `docNeeds`, `allNeeds` (not the target), `docStatus`, `fileName`, `sourceForLender`.
  - `site/src/doc/`: `doc.ts` (blocks, `docText` for tests), `pdf.ts` (PDF writer, `printable`, `measure`), `xlsx.ts` (Excel writer), `docx.ts` (Word writer), `zip.ts` (the stored zip of both). Pure, no DOM.
  - `scripts/read-doc.mjs`: reads the files back with pdf.js, read-excel-file, mammoth and JSZip, for the tests and the site check.
- `site/`: home, `/dscr/`, 404; dark mode without a flash. `worker/`: `GET /health`.
- Checks, all in CI:
  - `npm test` (136, including the simulation and the documents read back by pdf.js, read-excel-file and mammoth);
  - `npm run typecheck`;
  - `npm run rules-doc -- --check`;
  - `npm run build`;
  - `npm run worker:build`;
  - `npm run check:site`: 0 violations. It drives the calculator with case A, the quick path, a proprietor with EMIs and the new asset, and own figures, downloads the PDF, the Excel copy and the Word copy at 390 px (provisional, then complete) and reads them back, failing on anything kept to the page (the target, the verdict, the assumptions); about 20 s.

## Next — one fresh session per item
| # | Session | Starter prompt (paste as the first message) |
|---|---|---|
| P1d | Payment for the download (after P1f, and after the owner's Phase 0 items: business entity, GST, Razorpay account) | "Work from `main`. Read CLAUDE.md, docs/HANDOFF.md, docs/DECISIONS.md (D-TECH-01, D-TECH-06, D-DOC-01) and docs/CLOUDFLARE.md. P1d: payment for the DSCR statement download, through Razorpay and the Worker. Ask me first, in one message: the price; whether the Worker stays separate or moves beside the site as Pages Functions; and, since the document is made in the browser, whether payment only unlocks the two buttons (anyone reading the page's code could still make the file) or the file must come from the server. Then build it: the order made in the Worker, the payment verified by its signature, and the buttons unlocked for that statement only. Test with Razorpay's test keys, set only in the environment settings, never in the repo. The preview stays free. Finish per HANDOFF." |
| E1 | The estimate's front door (after the owner's A14 decisions) | "Work from `main`. Read CLAUDE.md, docs/HANDOFF.md and docs/ESTIMATE-BLUEPRINT.md: Part A, and Part B only where A points to it. My A14 decisions: [as recommended, or your changes]. Build E1 per A13: the four kinds, the area by kind, item buttons with lump sums, GST three ways, and who gave the rates; results first (the total, the cost per sq ft, the split, what is missing); the documents with the property's facts and the total in words; the default field count asserted. My fictional case, worked at home: [yours]. Finish per HANDOFF." |

## End of every session
1. `npm test` (includes the simulation; `npm run sim` prints it: 0 violations), `npm run typecheck`, `npm run rules-doc`, `npm run build`, `npm run check:site` (0 violations). One line in `docs/DECISIONS.md` per decision.
2. Update this file (state + next), commit, draft PR. The branch preview builds itself (link on the PR); open it and say so.

## Waiting on the owner
- **Read `docs/ESTIMATE-BLUEPRINT.md`** and decide the five choices in A14, or say "as recommended". Then the next session builds E1.
- **Try the three downloads on the live site.** Open the Word copy in Word itself and the Excel copy in Excel: they were checked with mammoth, read-excel-file and LibreOffice, not with Microsoft Office.
- **Try P1e on the live site**: who the borrower is, EMIs a month, the new asset's income.
- **Try the front door (P1f)** on the live site, on a phone and a desktop: it is done when you say it feels simple. Then the estimate and the project report, with your own fictional cases.
- **Work fictional case P** (`docs/GOLDEN-CASES.md`: a proprietor with EMIs and a new asset) at home, as for A and A′.
- **Check the tax by borrower** (`docs/RULES.md`, "Tax by borrower"): a proprietor's new-regime slab rates for 2026-27, the firm's surcharge above Rs. 1 crore, and the assumption that a proprietor's business profit is their only income. Read from secondary sources only.
- **Still open on the downloads:**
  - is anything missing that a lender expects on them (the loan's purpose, the borrower's address, a GSTIN)?
  - do the borrower's signature block and "Not a CA's certificate" suit?
  - should the Excel copy carry formulas that redo the working (D-DOC-02)?
- **Check the page's assumptions** (`docs/RULES.md`, "What the page assumes until you change it"), above all the tax rate of 31.2% and profit growing with sales.
- **Work fictional cases A and A′** (`docs/GOLDEN-CASES.md`) in your own Excel at home, or send public worked examples with their source. Never office files (D-BIZ-02).
- **Read `docs/RULES.md` and `docs/DSCR-RESEARCH.md`.** From general knowledge and published material only (never an employer's norms), say:
  - whether the four choices and the three presets (common, RBI 2020, Schedule III) are right and in the right order;
  - whether you know published lender norms that use the simple average, and which lenders' published norms matter first;
  - whether the tax rates by borrower hold for FY 2026-27.

  The page shows the method as "not yet checked" until then.
- **Network settings:** allow `rbi.org.in`, `rbidocs.rbi.org.in`, `icai.org` and `bcasonline.org` so a session can read the primary texts (the research used secondary sources); `incometaxindia.gov.in`, `incometax.gov.in`, `indiabudget.gov.in` and `egazette.gov.in` for the tax rates; and `developers.cloudflare.com` and `pages.dev` so it can check `docs/CLOUDFLARE.md` and open previews itself. For the estimate's primary texts (`docs/ESTIMATE-BLUEPRINT.md` B9), allow `indiacode.nic.in`, `cpwd.gov.in`, `bis.gov.in`, `coa.gov.in`, `cbic-gst.gov.in` and `labour.gov.in`. All are blocked now.
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
- The container's LibreOffice is only its core, so it loads no file ("source file could not be loaded"). `apt-get install -y libreoffice-writer libreoffice-calc` adds what it needs, in each new container. Then `soffice --headless -env:UserInstallation=file://<scratch>/lo --convert-to pdf` prints a .docx or .xlsx to a PDF. To look at a PDF page, render it in Node with pdf.js and `@napi-rs/canvas` (in `node_modules`), with `standardFontDataUrl` set to `node_modules/pdfjs-dist/standard_fonts/`.
- `new Blob([bytes])` needs `Uint8Array<ArrayBuffer>` in TypeScript 7: the writers return that type.
- pdf.js in Node: `getDocument(...)` returns a task; call `task.destroy()`, not the document's.
- A field's `change` event (a month picker, or Playwright's `fill`) can arrive before Preact re-renders the draft: commit from the input's own value, as `useDraft` in `site/src/fields.tsx` does. Preact runs `useEffect` only after the next frame (or 35 ms): use `useLayoutEffect` where a field must show a change at once, and make checks wait for what they read (`expectText`, `expectValue`).
- Scratch scripts outside the repo cannot import `playwright` by name; import `node_modules/playwright/index.mjs` by path.
- WebFetch goes through the same network policy: rbi.org.in, bcasonline.org and srbatliboi.in were refused, while WebSearch works. Mark anything read only through search results as secondary.
- A row's answers are radios `fld-<key>-<answer>`: a field of that row must not reuse one (the new asset's month is `fld-assetIncome-start`, since `fld-assetIncome-from` is the radio).
- Expected figures in tests: round the exact value once. 6,15,500 ÷ 2,09,000 is 2.94498, which shows as 2.94; rounding 2.9450 again gives a wrong 2.95.
