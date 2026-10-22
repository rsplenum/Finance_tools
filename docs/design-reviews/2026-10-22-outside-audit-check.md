# The outside audit, checked against the code (AUD1, 22-10-2026)

The audit: `2026-10-22-outside-audit.html` beside this file, kept as received. Each finding below is marked **true**, **already done** or **wrong**, with the file that shows it, and where a true one goes: TRUST1 (what a result and a download say about how sure we are), SEC1 (the Worker's hardening), a row already planned, or the owner's choice (D-BIZ-18).

## Financial correctness and trust (audit §4)
| # | Finding | Verdict | Evidence | Goes to |
|---|---|---|---|---|
| A | "Will the loan pass?" implies a lender's verdict | **True on home**; the DSCR page already says "Meets the target" or "Below the target: …" against targets marked examples | `site/src/home/story.ts:144`, `site/src/pages/index.astro:31,128`; `site/src/dscr/model.ts:548-559`; `engine/data/dscr.json:82,90` (`verified: false`) | Home's words in HOME1b (it rewrites those lines); the verdict's wording in TRUST1 |
| B | CMA's turnover-method shares read through search results; ratio benchmarks unverified | **True**, and the data says so itself | `engine/data/cma.json` status ("read through search results only … not checked"); `engine/data/ratios.json` (4 values `verified: false`) | TRUST1: shown as an illustrative assumption until checked at the banks' own pages |
| C | Tax rates from secondary sources | **True** | `engine/data/tax.json` status ("Secondary sources only, not yet checked against the Act"); 2 values `verified: false`, 1 `true` | TRUST1: the status into the result and the download; a professional's check is the owner's (LEGAL2's lawyer or a CA) |
| D | PMEGP's status needs reconciling with the 2026-27 page | **Already done** | `engine/data/report.json:58`: fresh applications paused until revised guidelines (the portal, October 2026); the figures are the 2021-22 to 2025-26 guideline's and may change | TRUST1 rereads the MyMSME page once its host is checked (`npm run hosts`) |
| E | A construction estimate should lead with a range | **Already done in part**: the rounded total leads, the level's range is a bar under it, the exact total below | `site/src/estimate/PlanEstimate.tsx:201-230` (A8, V1, L1, UX8) | The owner's choice in TRUST1: range first or total first |
| F | Four confidence levels (verified, cross-checked, illustrative, needs review) instead of a review date | **True**: the data holds only `verified: true/false` and a review date | `engine/data/*.json`; `scripts/` review-date check | TRUST1's core |
| G | Statuses in the downloads and checked before release | **True in part**: the DSCR, report and estimate documents name what is unverified; no check fails a release on it | `site/src/dscr/document.ts`, `site/src/report/document.ts`, `site/src/estimate/model.ts` | TRUST1 (a check in `npm run verify`) |

## Home (audit §5, §6)
| # | Finding | Verdict | Evidence | Goes to |
|---|---|---|---|---|
| H1 | Home repeats itself: "Three tools at work", then "Four tools", personas, chips, two CTA blocks | **True, already decided** | D-UX-114, D-UX-115; design lesson 11 | HOME1b (planned) |
| H2 | Four sections: hero with a task picker, one worked example, how it works, what is checked | **Already decided, close to it**: each tool once with its intro, a "how it works" diagram, the closing line | HOME1b's row | HOME1b; a trust line is TRUST1's to give home |

## Inside the tools (audit §7)
| # | Finding | Verdict | Evidence | Goes to |
|---|---|---|---|---|
| 7A | "Provisional: 5 still to answer" shown, then again by the download; no "next missing answer" | **True in part**: the DSCR says it twice in two forms; the estimate already links each question still open | `site/src/dscr/model.ts:898`, `site/src/doc/doc.ts:80`; `site/src/estimate/PlanEstimate.tsx:136` | TRUST1: one status line, one "next answer" link, on the DSCR as on the estimate |
| 7B | Short first path, the rest revealed later | **Already done** | D-UX-10, D-UX-12 ("More options", the site check counts the default fields) | — |
| 7C | Assumptions as a short ledger, the rest behind one line | **Already done** | D-UX-32 (one line with their count) | — (ranking them by effect is new; not recommended now) |
| 7D | The result as a decision panel: figure, target, what to verify next | **True in part**: figure, target and the lender's DSCR beside it are there (D-UX-47); "what to verify next" is not | `site/src/dscr/model.ts:455-475` | TRUST1 |
| 7E | CMA in two modes, guided and a full grid | **True**: the CMA has one form; simple and expert modes exist only on the report (D-UX-112) | `site/src/cma/Cma.tsx` | `docs/ROADMAP.md`, after the first user tests |
| 7F | The estimate should ask first: a plan, or checking a quote | **Already done** | `site/src/pages/estimate.astro:12` ("Have a contractor's quote?") | — |

## Speed, accuracy, documents (audit §8)
| # | Finding | Verdict | Evidence | Goes to |
|---|---|---|---|---|
| 8A | The estimate page weighs about 705 KB | **True, already logged** | REV1 L5 (`2026-10-21-rev1-site.md:17`) | RC1 |
| 8B | Load the export libraries only on download | **Wrong as stated**: there are no export libraries; the PDF, Excel and Word writers are ours, small, and imported with the page | `site/src/download.ts:6-8`, `site/src/doc/*.ts`, `package.json` | RC1 may lazy-load them with L5; small gain |
| 8C | Golden cases checked by an outside CA or lender | **True as a gap**: the cases are the owner's own fictional ones worked at home | `docs/GOLDEN-CASES.md`; never office material (D-BIZ-02) | The owner's choice (`docs/OWNER.md`) |
| 8D | Data freshness checks | **Already done** | the review-date check in `npm run verify` | — |
| 8E | Every download readable without the site | **Already done in part**: inputs, assumptions and sources are in each document | `lender-documents` skill | TRUST1 adds the confidence level |

## Security and privacy (audit §9)
| # | Finding | Verdict | Evidence | Goes to |
|---|---|---|---|---|
| S1 | Body size trusted from `Content-Length` | **True**: with no header the size reads 0 and the whole body is parsed | `worker/src/read.ts:59`, `worker/src/draft.ts:17` (`/api/e` reads the text first, then checks, `worker/src/events.ts:15-16`) | SEC1 |
| S2 | The AI's answer is cast, not checked, on the server | **True on the server**; the browser checks every figure's reference against the statement's lines, and the draft's figures are filtered (REP2) | `worker/src/read.ts:80`, `worker/src/draft.ts:38`; `site/src/cma/Read.tsx:35` | SEC1 |
| S3 | `/api/e` has only an origin check, which any client can forge | **True**: no cap on batches; anyone can fill D1 | `worker/src/events.ts:14`, `worker/src/index.ts` | SEC1 |
| S4 | IP counters in KV must match the privacy notice | **Already done**: two-day counters, and the page says "counted for two days, then forgotten" | `worker/src/caps.ts:6-9`, `site/src/pages/privacy.astro:17` | PRIV1 keeps it true |
| S5 | `.node-version` says 22 while undici 8.11.2 needs 22.19.0 or later | **True, low**: CI's setup-node takes the latest 22, so it works; a fresh machine on an older 22 fails | `.node-version`, `package-lock.json` (undici `engines`) | SEC1 |

## Roadmap and plan (audit §10, §11, §3, §12)
| # | Finding | Verdict | Evidence | Goes to |
|---|---|---|---|---|
| R1 | A loan-file workspace: facts entered once, every document from them | **True, not planned** | `docs/ROADMAP.md` has no such row | The owner's choice; after LAUNCH |
| R2 | A viability review: the changes that would meet the target | **Already done**: levers on the DSCR and the CMA, the report's "sales up 17.3% gives 1.25" | `site/src/dscr/levers.ts`, `site/src/cma/levers.ts`, D-UX-79 | — |
| R3 | A readiness check before the download | **Already done in part**: the provisional count; the borrower's one-page checklist is on the roadmap (D3, D-DOC-11) | `docs/ROADMAP.md:58` | TRUST1 joins the confidence levels to it |
| R4 | A CA and DSA workflow | **True, later** | — | after the borrower's journey is tested |
| R5 | Test with five real users | **True, the owner's step**; the script exists | `2026-10-13-test-script.md` | `docs/OWNER.md` |
| R6 | No dependable release gate; build and tests unproven | **Wrong**: `npm run verify` runs every check on each push in CI; the audit could not install the packages | `.github/workflows/ci.yml`; this session's `npm run verify` | — |

**Count:** 31 findings: 15 true (2 of them already planned, 3 the owner's step or choice), 3 true in part, 11 already done or done in part, 2 wrong. New work: TRUST1 (A, B, C, F, G, 7A, 7D, 8E, and D's reread) and SEC1 (S1, S2, S3, S5).
