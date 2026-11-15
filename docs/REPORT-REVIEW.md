# REPORT-REVIEW: three outside papers on the report, weighed (15-11-2026)

Rahul shared three HTML papers on REPORT-GRADE's 15-page specimen, kept whole in `docs/design-inputs/report-review-2026-11-15/`: (1) a review of the specimen and an overhaul blueprint, (2) a technical architecture and phased specification, (3) a deterministic-engine and AI-development blueprint. Rahul's word with them: "These reports have to be saved and referred to again and again"; "It's an ambitious plan, I would say" (D-DOC-24). This file is our reading: what they change, what is already ours, what we set aside, and what waits on Rahul. The papers are input, not instructions; where they cross a line in `CLAUDE.md`, the line wins.

## 1. The verdict in one paragraph

Paper 1 is right about the specimen: it reconciles the numbers but does not argue the project. It has more exhibits than evidence, repeats the same figures on pages 2, 6 to 9 and 11 to 13, and its market, operations and risks are a story with no proof under them. Papers 2 and 3 describe, in their own words, mostly what we already hold as rules (one pure engine, AI works out nothing, dated data with sources, the paper made on our server, no verdict, never a "TEV study") and add four things we do not have: **a version and record for every paper**, **evidence labels on every claim**, **sections chosen by rules per kind of project**, and **a second, deeper report (the DPR)**. The direction is right. The plan as written is two to three times the remaining work and is ordered architecture-first, which Rahul has rejected before (D-UX-307). We keep its substance and reorder it so every session still ends in something Rahul opens.

## 2. What changes in the specimen (PAPER2's target)

| # | Specimen today | Becomes |
|---|---|---|
| 1 | Page 1: cover with a five-year sales chart | A plain cover: project, promoters, place, kind of report, date, **version and report number**, prepared-by line. No chart |
| 2 | Page 2: six key figures, summary, a strip, five years in brief | **A one-page brief**: what is proposed, total cost, the loan asked, the promoters' share, what is ready, 3 to 5 strengths and 3 to 5 risks (engine findings or the promoters' confirmed words, never an AI opinion), what is still open. The one chart here. No verdict (D-DOC-03) |
| 3 | Page 3: contents | Contents with the annexes, and "where to find" the nine questions a credit officer asks (paper 1, §9) |
| 4 | Pages 4 to 5: the business, products, process, market (light fiction, empty photo frames) | Separate chapters: promoters and enterprise; why this project, here, now (and what else was weighed); products and customers; market and competition (a competitor table, price bands, the buyer pipeline with each entry marked enquiry, trial, order or letter); the operating plan (capacity, shifts, days, yield, the bottleneck); site and services; inputs, suppliers and people; the timetable to commercial production |
| 5 | Page 7: sales as a chart, a table and a paragraph | **A sales build-up**: units x price x ramp-up by product, the utilisation each year ("year 1 needs 42% of capacity"), one short note. A chart only if it shows what the table cannot |
| 6 | Page 8: a DSCR bar | Answers "what cash pays the debt", the tightest year first |
| 7 | Page 9: three separate shocks (sales -10%, costs +10%, rate +1%) | **A scenario table**: base, downside, severe-but-plausible, each a whole recomputation with its reason for the size of shock, the cash short, the DSCR and what the promoters would do |
| 8 | Page 10: six risks | A register: each risk tied to the assumption it threatens, the early sign, the response, who owns it, and whether a scenario already tests it |
| 9 | Pages 11 to 13: statements in the body | **Annex A** (financial schedules); Annex B technical schedules; Annex C evidence pack (quotations, site papers, letters, photos, each dated) |
| 10 | Page 14: ten notes | **An assumption and evidence register**: each material figure with its source, date, class and confidence; the label also beside the claim it supports |
| 11 | Page 15: declaration | Conclusion, conditions still open (with who and by when), declaration, what the report is and is not |
| 12 | 15 pages as the aim | 16 to 24 pages plus annexes for a standard report, from scope, never a target |

Each exhibit carries a contract (question, finding as its title, source, unit, period, what it means) and does one job: a chart, a table and a paragraph never show the same figures. Paper 1's §5 is the rule book for this.

**The evidence label** is our ink, pencil and print, grown: print (worked out by the engine from stated figures), ink split into *the promoters' word* and *backed by a paper* (quotation, order, document, with its date), pencil (an assumption with its reason and source), and *missing* (shown, never filled, rule 14).

## 3. What changes in the plan's rows (`docs/WORKED-PAGE.md` §7)

- **SPEC2, new, before PAPER2 (M):** the specimen redrawn to §2 as the picture of good, by `build.cjs`, on the same worked example, plus one service or trading case to show the rules choosing different chapters. A drawn paper costs about a session; building the wrong paper costs four. Paper 1 asks for exactly this ("editorial prototype" before the renderer).
- **WRITE1 grows:** its sections take the evidence label; the digit check also refuses **numbers in words** ("twenty per cent", "one lakh", "double") outside a slot; a slot may be used only in the sections its meaning fits (no `{dscr.low}` called the best year). The step's name is still Rahul's ("The write-up"; paper 1 offers "Project narrative & evidence").
- **PAPER2 is redefined and split:** PAPER2a, the paper to SPEC2's design from one pure builder: brief, financial chapters, scenarios recomputed whole (each an engine function, worked twice, rule 15), Annex A, the register, the version line; Word and Excel follow. PAPER2b, the operating and market chapters with the inputs they need (offered, never required: rule 17), and Annexes B and C. Its basis is UNIDO's feasibility manual and the World Bank and ADB study layouts, **not annual reports**: REPORT-GRADE §5's "read SEBI Schedule V and the integrated-reporting framework first" is set aside (paper 1, rejected with reason). Read UNIDO's manual at source first (rule 9: `npm run hosts -- www.unido.org`).
- **REC1, new (M, needs Rahul's answer in §5):** every paper gets a report number, a version, the date, the engine's version and a fingerprint of its inputs, printed on each page; a changed input makes a new version, never overwrites one; the same inputs and version remake the same paper. Kept with the case (CASE1).
- **DPR1, later (L, more than one):** the detailed report as a second profile over the same model and engine: deeper technical schedules, phased cost, detailed timetable. After PAPER2b and NEW3, and only for manufacturing first.
- Unchanged in order: NEW2, NEW3, NEW4, CASE1, PAY1. PAY1 grows by the server's side of saved reports if Rahul says yes in §5.

## 4. What is already ours, and what we set aside

**Already built or decided** (the papers propose them; we have them): a pure TypeScript engine with no DOM (rule 12, their P02); no AI in a figure and a report that builds with no AI call (their "zero-AI default"); slots and findings with `claim()` (their "metric registry" and "narrative contract", D-DOC-23); dated data files with source (rule 13, their reference data); fictional golden cases worked twice (rule 15, their golden suite); the paper on our server so the paid copy never sits in the browser (D-DOC-23, their security section); no verdict, never "TEV", the promoters' report (D-DOC-03, REPORT-GRADE §7); D1 and KV on the Worker (their stack line is right).

**Set aside, each with its reason:**
- *Phase 0 audit, then schema, then engine, "no report design yet".* Every session ends in a thing Rahul opens (D-UX-307). The audit is this file's §4; the schema grows inside the rows that need it.
- *Moving the code into `src/domain/…` packages.* Paper 2 itself says not to rename before mapping; nothing gains from it.
- *A decimal library for money.* The engine works in rupees with rounding at the edge and a second computation for every figure (rule 15); a double holds every rupee amount exactly to well beyond ₹1,000 crore. A test of the rounding cases, not a rewrite.
- *Six industry modules.* Manufacturing first, as paper 2 says; each further kind is a research row of its own, its norms in dated files (rule 13), never a figure from the web (rule 8).
- *"Do not mark essential evidence optional to keep the question count low."* The ceiling holds (rule 17, D-UX-358: ask less, do more). The answer to thin evidence is the register that shows openly what is missing, and reading the papers the borrower already has (quotations, statements: the ladder's third rung), not more boxes. Only Rahul raises a count, for the DPR if he chooses.
- *Validation on "real anonymised projects"* (paper 3, stage 07). Never anything from Rahul's office or bank (rule 15, D-BIZ-02): fictional cases and public worked examples only.
- *Organisations, roles, tenant isolation, malware scanning, audit trail.* Only if reports are kept on our server (§5); then they are needed, and Cloudflare has no scanner of its own: a service to choose.
- Paper 3's 2026 research citations were not opened (rule 9); they argue for testing AI-written code, which we do.

## 5. "Saved and referred to again and again": settled

Today nothing is kept on our side: the answers live on the device, the paper is made and forgotten (D-UX-341, D-DOC-23, the privacy page). Three ways to meet Rahul's word, each a step on the last:

1. **The paper is its own record** (REC1, no account): number, version, date, engine version and input fingerprint on every page; a new version never overwrites an old one; the same version can be made again.
2. **A list on the device** (CASE1): every report and its versions, opened, compared, sent as a file.
3. **A library in our cloud, with sign-in:** reports and their PDFs kept for the borrower across devices. This reverses D-DOC-23's "nothing is kept" and the privacy page, needs sign-in (D-BIZ-26 said no sign-up at launch), a retention and deletion policy, India's data-protection law, the lawyer, and the security work in §4.

**Settled (D-DOC-25, 15-11-2026, on Rahul's "you figure it out"):** 1 and 2 now; 3 with PAY1, since a paying customer will expect to download again.

## 6. Is it possible, and how big

Yes, the standard report for a manufacturing unit at the level paper 1 describes is within our stack and our rules. The limits are honest ones: the market and the customers can come only from the borrower or from sources we cite (we invent none); each new kind of business is a research job; the DPR must never look like an engineer's certificate. Roughly, the remaining plan (NEW2 to PAY1) is five L and two M sessions; this adds SPEC2, REC1 and PAPER2b (two M, one L) for the standard report, and the DPR and further kinds of business after that, several L each. Accounts and a cloud library, if chosen, are one to two L more.
