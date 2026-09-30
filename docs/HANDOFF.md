# Handoff — start here in a new session
State at 30-09-2026: P0 (site + Worker skeleton) is on `main`, which Cloudflare Pages builds. **P1a, the DSCR engine, is done on a draft PR**: statement, planning from loan terms, largest loan, shortest repayment, facts needed, all computed twice. Its test figures are model-worked until the owner confirms fictional case A (`docs/GOLDEN-CASES.md`); nothing from the owner's office, ever (D-BIZ-02). Next is **P1b, the DSCR calculator page**. Keep this file short and current.

## Where things are
- Live site: https://finance-tools-9if.pages.dev (Pages project `finance-tools`, built from `main`); each branch previews at `https://<branch>.finance-tools-9if.pages.dev`, linked on its pull request. Worker: not deployed (placeholder IDs). Repo: rsplenum/Finance_tools. Study report (private): https://claude.ai/code/artifact/4bad29bb-5d80-4b27-9386-be3f2581c068
- Read order: `CLAUDE.md` → this file → the `docs/DECISIONS.md` sections you need → `docs/PROJECT.md` only for the why. DSCR method in plain words: `docs/RULES.md` (generated). Cloudflare settings: `docs/CLOUDFLARE.md`.

## What works now
- `engine/util.ts` (EMI, formats, words) and `engine/parse.ts` (amounts, dates), tested against textbook figures.
- DSCR engine: `engine/loan.ts` (schedule by financial year), `engine/dscr.ts` (`dscrStatement` from the borrower's own figures; `planStatement` from projections and loan terms; `maxLoanAmount`; `shortestRepayment`; a list of facts needed instead of figures), `engine/dscr-check.ts` (the second computation; figures are withheld if it disagrees), method in `engine/data/dscr.json`.
- `site/`: home, `/dscr/` placeholder (loan amount read back in figures and words), 404; dark mode without a flash. `worker/`: `GET /health`.
- Checks, all in CI: `npm test` (32, including the simulation), `npm run typecheck`, `npm run rules-doc -- --check`, `npm run build`, `npm run worker:build`, `npm run check:site` (0 violations).

## Next — one fresh session per item
| # | Session | Starter prompt (paste as the first message) |
|---|---|---|
| P1b | DSCR calculator page | "Read CLAUDE.md, docs/HANDOFF.md, docs/RULES.md and docs/LESSONS-CARRIED.md §1, §4 and §8. P1b: the DSCR calculator at `/dscr/`, replacing the placeholder and keeping its loan amount field. Use only `engine/dscr.ts` for figures. Ask first what narrows later questions (own yearly figures, or build them from the loan terms; the four DSCR choices, or the common preset) and take each fact once. Year-wise inputs as a table that becomes cards on phones; a free preview that stays provisional and lists what is still needed; plain words; say what limits the result (the lowest year or the average). `npm run check:site` at 0 violations plus text assertions on the page's results (`fld-…` ids, `data-testid`). No payment yet. Finish per HANDOFF." |
| P1c | DSCR statement download | Starter prompt to be written at the end of P1b (document formats first, payment after). |

## End of every session
1. `npm test` (includes the simulation; `npm run sim` prints it: 0 violations), `npm run typecheck`, `npm run rules-doc`, `npm run build`, `npm run check:site` (0 violations). One line in `docs/DECISIONS.md` per decision.
2. Update this file (state + next), commit, draft PR. The branch preview builds itself (link on the PR); open it and say so.

## Waiting on the owner
- Work fictional case A (`docs/GOLDEN-CASES.md`) in your own Excel at home, or send public worked examples with their source. Never office files (D-BIZ-02).
- Read `docs/RULES.md` and say, from general knowledge (not an employer's norms), whether the four choices and the "common" preset are right, and which lenders' published norms matter first.
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
