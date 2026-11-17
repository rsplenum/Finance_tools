# REPORT-REVIEW: the report factory (15-11-2026, rewritten the same day)

Rahul shared three HTML papers on REPORT-GRADE's 15-page specimen, kept whole in `docs/design-inputs/report-review-2026-11-15/`: (1) a review of the specimen and an overhaul blueprint; (2) "One project model, two report depths, a deterministic report factory"; (3) "Build the engine with AI and run the business on deterministic code". Rahul's word with them: "These reports have to be saved and referred to again and again"; "It's an ambitious plan". Then, on reading our first take: the page's structure and look are to be redone (NEW2, decided); the report's content is to be **made by code from a library of pre-written pieces chosen by rules, with AI only filling gaps**, so that every report is tailored; and "Differentiation and ease of use and depth of content and variety of reports are our business plan." And: "let's implement the plan" (D-DOC-24).

The first reading (commit `2da8be7`) kept the AI drafting the descriptive chapters (WRITE1 as it stood, D-AI-01, D-AI-03). That was wrong: it is not what papers 2 and 3 say, and it is the weaker plan. This file replaces it. The papers are input, not instructions; where they cross a line in `CLAUDE.md`, the line wins.

## 1. The picture in one paragraph

The report is a **factory**: one project model (every fact with its evidence label), the engine's figures, a set of **rules** that choose the chapters, exhibits and wording this project needs, and a **library** of short pieces written and checked once, each with its conditions and its figure slots. Code puts them together for each project; the same answers make the same paper, with no AI call and no cost per report. AI is used heavily **while we build** (to research trades, write and test the pieces) and only at the edges **while the borrower works**: reading their papers, and a draft where the library has nothing yet, marked and confirmed. Paper 1 is still right about the specimen: it reconciles the numbers but does not argue the project. The factory is how we argue it, the same way, for every kind of business we cover, without an LLM inventing the argument each time.

## 2. Rahul's case, weighed fairly

**It is right, and stronger than the first reading allowed.** Seven reasons, each one ours, not only the papers':
1. **The papers say it themselves.** Paper 2: "Standard report generation must work with zero LLM inference"; the core build is "project data → calculation engine → rule engine → content composition → validation → HTML/PDF. No LLM call in this path"; "Do not call AI for repeated template assembly or standard interpretations." Paper 3: "The narrative is not generated from scratch. A tested rule selects a carefully written interpretation." AI drafts narrative only "for non-standard cases".
2. **We have already built one.** The estimate is a library chosen by rules: 594 items in 103 families from 467 sources, each dated, priced a second way (`engine/library.ts`, `docs/LIBRARY.md`). It is the best-checked thing on the site. The report should be made the same way.
3. **Depth is written once and checked once.** What a lender expects to read about a roasted-snacks unit (the process, the inputs, the power and water, the risks of the trade) can be researched with sources, written well and reviewed; an AI draft is only as deep as one call, and different every time.
4. **The same answers make the same paper** (paper 2's P06). That is what REC1 and "referred to again and again" need; an AI draft cannot promise it.
5. **It works today.** The Worker's `/draft` answers "not switched on" until a key is set; the library needs none. No cost per report, no provider to fail, nothing of the borrower's sent away for the words.
6. **Law and honesty.** Every sentence the library can print is read before it ships. WORDS1's checks (no reputation a new unit cannot have, no experience not told us) are proven once on the library, rather than hoped for on each draft.
7. **It is the business plan.** Differentiation (a report a credit officer finds answers in), ease (the borrower confirms, not writes), depth (a trade's pack, researched), variety (many trades, purposes and depths from one engine). None of the four depends on an AI at run time.

**Its limits, which the papers also name** (paper 3 §02): code can phrase a fact; it cannot know one. The customers, the promoters' story, the site, the quotations come only from the borrower or from sources we cite. The library is what makes those facts read like a report, and what names, plainly, the facts still missing.

## 3. How the factory works

| Part | What it is | Where it lives |
|---|---|---|
| **The project model** | Every answer, figure and document as a typed fact with its evidence label: print (worked out by the engine), the promoters' word, backed by a paper (with its date), pencil (an assumption with its reason), missing. Unknown, not given, not applicable and zero are four different things | grows from `site/src/report/model.ts`; pure functions in `engine/` |
| **The rules** | From the project's kind, purpose, size, evidence and funding: which chapters, which pieces, which exhibits, which caveats, and which facts each chapter still needs. One rule file per kind of business, dated (rule 13) | `engine/data/report/rules/*.json`, read by one pure function |
| **The library** | Short pieces, each with an id, a version, what it needs, when it applies, its slots, and for trade facts their source and date. Kinds: a fact block (the promoters), an analysis (capacity use), a table (machinery), an exhibit (the sales build-up, with its question and finding), a reading (the DSCR's three wordings: comfortable, tight, short), an evidence note, a risk row (trigger, response, who, which scenario tests it) | `engine/data/report/library/*.json`; `npm run rules-doc` prints it for reading, as `docs/LIBRARY.md` does |
| **Trade packs** | Per trade: how such units usually work (process, inputs, power, water, people, the usual bottleneck), the usual risks, the usual buyers. Written as "units of this kind usually …", never as this borrower's fact until they confirm it. Researched with sources (rule 13); never a figure from the web (rule 8) | inside the library, one file per trade |
| **The compiler** | Rules + library + the engine's figures through slots (D-DOC-23's `fill`, `claim`) → one document tree → the screen's outline, the PDF, the Word copy. A piece whose condition fails does not print; a slot with no figure stops the build | `engine/report-compose.ts`; the writers in `site/src/doc/` |
| **AI, at the edges** | (a) reading the borrower's own papers (U1's path: each figure with its page and line, cross-checked, confirmed: D-UX-44); (b) **the brief reader** (D-DOC-25): on every report, the borrower's own words, typed however they come (jumbled, inconsistent, misspelt), are turned into clean facts for the pieces' slots and short clean statements in their voice; it fixes spelling and order, asks when two answers disagree, never adds a fact, and the borrower confirms each; (c) **a gap**: a trade or a case the library does not cover gets a draft for that chapter, marked "drafted", slots only, WORDS1's checks, confirmed by the borrower; each such gap is logged (the trade, never the borrower's words) so the library grows where real projects need it. A test still builds every golden case's report with the AI switched off, from clean answers | `worker/src/draft.ts`, `engine/narrative.ts` move here |

**Who writes the prose (D-DOC-25, Rahul 15-11-2026).** The prose is written by AI **ahead of time**, not per report: each library piece in several variants (openings, angles, lengths, by size, stage and evidence), read, checked and fixed in the dated files. At run time code chooses and combines them, so the same clean facts give the same paper. The one AI call on every report is the brief reader, because people's own words cannot be handled by rules; that is the accepted cost per report. Model: Sonnet at high effort or Gemini at medium, chosen by measuring both on the same briefs (cost per report and Rahul's reading); the other is the fallback. A first estimate for an AI writing every chapter was about $0.56 (≈ ₹50) a report with Sonnet; the brief reader writes much less, and its real cost is measured in WRITE1.

**What the borrower meets.** The write-up step stops being "write" and becomes **read and confirm**: each chapter already made from their answers and their trade's pack, its gaps named in place ("your buyers so far: none yet; add one"), one tap to confirm. A chapter the library could not make offers the draft. Nothing new is required (rule 17): the deeper facts sit under each chapter's "More options", and a chapter without them prints, honestly, what it lacks.

**Variety, and how to count it.** Kinds of business × purpose (new unit, expansion, modernisation) × size × evidence (paper-backed, mixed, the promoters' word, incomplete) × funding (term loan, working capital, both) × depth (profile, standard, DPR): paper 3's six dimensions give 5,760 configurations before products, places and figures, and every piece varies with the figures it carries. The variety is real. It comes from facts, rules and evidence; where two wordings mean the same, the choice follows the project (its size, its stage), never chance (paper 3: "Do not use random variation").

## 4. What changes in the specimen (SPEC2's target)

| # | Specimen today | Becomes |
|---|---|---|
| 1 | Page 1: cover with a five-year sales chart | A plain cover: project, promoters, place, kind of report, date, version and report number, prepared-by line. No chart |
| 2 | Page 2: six key figures, summary, a strip, five years | **A one-page brief**: what is proposed, total cost, the loan, the promoters' share, what is ready, 3 to 5 strengths and 3 to 5 risks (findings or confirmed words, never an opinion), what is still open. The one chart here. No verdict (D-DOC-03) |
| 3 | Page 3: contents | Contents with the annexes and "where to find" the nine questions a credit officer asks (paper 1, §9) |
| 4 | Pages 4 to 5: business, products, process, market (light fiction, empty photo frames) | Chapters from the library: promoters and enterprise; why this project, here, now; products and customers; market and competition (competitors, price bands, buyers marked enquiry, trial, order or letter); the operating plan (capacity, shifts, days, yield, the bottleneck); site and services; inputs, suppliers and people; the timetable |
| 5 | Page 7: sales as chart, table and paragraph | **A sales build-up**: units x price x ramp-up by product, utilisation each year ("year 1 needs 42% of capacity"), one note |
| 6 | Page 8: a DSCR bar | "What cash pays the debt", the tightest year first, its reading chosen from three |
| 7 | Page 9: three separate shocks | **A scenario table**: base, downside, severe-but-plausible, each a whole recomputation with its reason, the cash short, the DSCR, what the promoters would do |
| 8 | Page 10: six risks | A register: each risk tied to the assumption it threatens, the early sign, the response, who owns it, which scenario tests it |
| 9 | Pages 11 to 13: statements | **Annex A** financial schedules; B technical schedules; C evidence pack (each paper dated) |
| 10 | Page 14: ten notes | **The assumption and evidence register**, the label also beside the claim it supports |
| 11 | Page 15: declaration | Conclusion, conditions still open (who, by when), declaration, what the report is and is not |
| 12 | 15 pages as the aim | 16 to 24 plus annexes for a standard report, from scope, never a target |

Each exhibit carries a contract (question, finding as title, source, unit, period, meaning) and does one job: a chart, a table and a paragraph never show the same figures (paper 1, §5). SPEC2 also marks, beside each paragraph, the rule and the piece that made it, so the specimen is the factory's drawing before it is built.

## 5. The page (NEW2): structure and look redone, as decided

Unchanged from `docs/WORKED-PAGE.md` §7 and `docs/REPORT-GRADE.md` §6: the questions hold the stage, the side is a companion and never the paper, CHECK1's Check step kept whole, the locked state built and every user on the open one until PAY1. One change from the factory: the side's outline is the rules' list of chapters for this project, each with what it still needs, so the borrower sees the report take shape as they answer. Until the factory's first row lands, NEW2 shows the outline from a fixed list with the same shape.

## 6. The rows, in the order to build

| # | Row | Size | Rahul opens |
|---|---|---|---|
| 1 | **NEW2** the report's screen, structure and look redone | L, Extra | `/project-report/` on the preview |
| 2 | **SPEC2** the specimen redrawn to §4, for the roasted-snacks example and one service case, each paragraph marked with its rule and piece | M, Extra | the two specimen PDFs |
| 3 | **LIB1** the factory's core: the rules and library formats, the compiler, the document tree; the brief and the financial chapters made by code (readings by condition, scenarios recomputed whole, each worked twice, the register, the evidence labels); a test that every golden case builds with AI off and the same answers give the same tree | L, Extra | the report's text for both cases, on the preview |
| 4 | **LIB2** the first trade pack and the descriptive chapters: roasted snacks and small food processing first (the example's trade), then two more manufacturing trades; the pieces' prose drafted by AI at build time in several variants each (D-DOC-25), read and fixed in the files; trade facts researched with sources (rule 9 hosts first, the `fetcher` for reading, never a figure from it); new unit and expansion; WORDS1's checks run on every piece | L, Extra | the same reports, now whole, and a second trade beside the first |
| 5 | **WRITE1** the write-up as read and confirm, with the brief reader (D-DOC-25: the borrower's words in, clean facts and statements out, each confirmed; Sonnet high and Gemini medium measured on the same briefs, cost per report recorded): gaps named in place, one tap a chapter, More options for depth, photos on the device; AI only where §3 says, marked, slots only, its digit and words checks (numbers in words refused outside a slot) | M, Extra | the step on the preview |
| 6 | **PAPER2a** the paper from the document tree to SPEC2: brief, financial chapters, scenarios, Annex A, the register, the version line; Word follows (no formula, D-DOC-21) | L, Extra | the three files |
| 7 | **PAPER2b** the operating and market chapters as printed pages, Annexes B and C | L, Extra | the three files |
| 8 | **REC1** every paper its own record (yes, D-DOC-26) | M, high | two versions of one report |
| 9 | **NEW3, NEW4, CASE1, PAY1** as `docs/WORKED-PAGE.md` §7 | L, L, L, M | as there |
| later | **LIB3 onward**, one research row per trade group (trading, services, then by demand: the logged gaps say which); **DPR1**, the detailed report as a second profile over the same rules | L each | the new trade's report |

Order's reason: the screen first because it is decided and every later row shows through it; the drawing before the factory (one session to agree what good is, against four to build the wrong thing); the factory's financial half before the descriptive half because it needs no research and proves the compiler; WRITE1 only once there is something to confirm; the paper last, since it renders a tree that by then exists.

## 7. Where I still disagree, and why

1. **The library cannot supply what lenders weigh most.** Who buys, who runs it, whether the site is ready: those are the borrower's facts. A report with a deep trade chapter and an empty buyers list is a well-written thin report, and a credit officer sees it at once. So depth of content needs some facts we do not ask today. The ceiling holds (rule 17): they sit under More options and the report shows what is missing. If Rahul wants the standard report to ask for buyers or the machine quotation by default, only Rahul can raise the count; I would raise it by one, for buyers.
2. **The same paragraph in many reports is a risk.** A lender who reads two of our reports for two snack units will meet the same trade paragraphs. That is fine for "how such units usually work", which is general knowledge marked as such; it is not fine if it reads as this borrower's own. Every trade sentence says "usually" until the borrower confirms it, and the pieces that describe this project carry its own facts. "Millions of combinations" counts configurations, not readings; the test of tailoring is paper 1's reviewer test (nine questions, time to answer), not the count.
3. **Variety by breadth too early would weaken depth.** "Variety of reports" pulls toward many trades fast; a thin pack across fifty trades is a template business, which is what lenders complain of today. I recommend three manufacturing trades done deeply before the next group, and the logged gaps choosing what comes next.
4. **Writing the library is the real cost.** Paper 3 is right that AI can draft pieces at build time, but each must be read and its trade facts sourced. Rahul cannot read hundreds of pieces. The checks do most of it (slots, conditions, WORDS1's words, a second figure for every number); Rahul reads one whole report per trade, not each piece.
5. **The borrower's own words stay theirs.** The brief reader (D-DOC-25) cleans them but adds nothing: every statement it makes is shown beside what they typed and confirmed by them; the library frames it and never rewrites it into claims.
6. **Variants are not variety by themselves.** Pre-written variants stop two reports reading alike, but they are chosen by the project (size, stage, evidence), never at random, and checked like any piece. What makes a report this borrower's is still their facts.

Where the papers and I still part, as the first reading said: no audit-first phases or "no report design yet" (every session ends in a thing Rahul opens, D-UX-307); no move of the code into new packages; no decimal library (rupees with rounding at the edge and a second computation are exact here; a test of rounding cases instead); no validation on "real anonymised projects" (rule 15, D-BIZ-02: fictional cases and public worked examples only); organisations, roles, tenant isolation and malware scanning only if reports are kept on our server (§9); paper 3's 2026 research citations not opened (rule 9).

## 8. What happens to what we have

- **Kept as it is:** the engine and every check; slots, `fill` and `claim` (D-DOC-23); the paper made on our server (D-DOC-23); dated data with sources; golden cases worked twice; no verdict, never "TEV", never an architect.
- **Moved off the default path:** `engine/narrative.ts`, `engine/data/narrative.json` and the Worker's `/draft` (D-AI-01 to D-AI-03) become the gap filler of §3; their checks (claims, guesses, blanks) become the library's tests too. WORDS1's blanks are the first form of the library's named gaps.
- **Superseded:** D-AI-01's "the report's narrative is drafted by AI" and WRITE1's "the AI drafts what describes" (D-DOC-24 says so).

## 9. Rahul's answers

**Settled 15-11-2026 (D-DOC-26), on Rahul's "yes to SPEC2 and REC1 / how saved reports are kept: you figure it out":** both rows yes; reports kept as (a) and (b) now, (c) with PAY1, since a paying customer will expect to download again. The two questions as they were put:

1. **How reports are kept** ("saved and referred to again and again"). Today nothing is kept on our side. (a) The paper is its own record (REC1, no account): number, version, date, engine and library version, a fingerprint of the answers, on every page; a new version never overwrites an old one; the same answers and versions remake the same paper, which the factory now guarantees. (b) A list on the device (CASE1): every report and its versions. (c) A library in our cloud with sign-in: across devices, but it reverses D-DOC-23's "nothing is kept" and the privacy page, needs sign-in (D-BIZ-26: none at launch), a retention policy, India's data-protection law and the lawyer. **Recommended:** (a) and (b) now, (c) with PAY1.
2. **A yes to SPEC2 and REC1** as §6 places them.

## 10. Rahul's review of SPEC2, reconciled with paper 1 (16-11-2026)

Rahul read `spec2-snacks.pdf` on the phone and gave ten points; then asked that they be reconciled with paper 1 (`docs/design-inputs/report-review-2026-11-15/1-report-review-and-overhaul.html`), which "missed some crucial aspects and over-emphasises some others". SPEC2 had taken paper 1's reading aids almost whole; Rahul's points take most of them out again. The rule that settles each clash: **the report is read by a person, start to finish; what helps a machine or a reviewer audit the report stays in the engine, the marked copy and the factory map, not on the reader's page.**

### Point by point

| # | Rahul | Paper 1 said | SPEC3 does |
|---|---|---|---|
| 1 | Remove "where to find the answers a credit officer asks" | A "where to find" guide for the nine credit questions | Removed. The nine questions become the **chapter titles and their order**, so the contents page is the guide. Paper 1's reviewer test (nine answers found unaided, timed) stays as the **acceptance test**, never printed |
| 2 | Remove "how to read it" | (implied by its exhibit contract and labels) | Removed. A report that needs a reading guide is not plain enough |
| 3 | Remove the evidence tags (Engine, Paper, Quotation, Buyer, Promoters' word, Pencil, Missing) everywhere | An evidence class, source, date, scope and confidence on every material claim | Tags and their legend removed. The **substance stays, in words, where it matters**: "on the maker's quotation of 28-10-2026", "the partners' own estimate", "assumed: a new unit rarely runs full at once", "to come". One table, "What the figures assume", says for each assumption its value and what backs it. No colour code to learn |
| 4 | Footer: just "Made using FinSight" | (no view) | Footer: "Made using FinSight" and the page number. No fingerprint, no "words from FinSight's library" |
| 5 | Simple words and sentences, still insightful; read by humans, not AI agents | Silent on the register; its own words (evidence class, provenance, exhibit, pencil) leaked into SPEC2 | Short sentences, everyday words; a term a lender expects (DSCR, break-even) is explained once in a line where it first appears. No "exhibit", "pencil", "register A3", "rule thirteen" |
| 6 | Not long for the sake of length; substantial | 16 to 24 pages plus annexes as "a design range" | Length follows substance. Expect about 14 pages plus a short annex for the snacks case; fewer statements in the annex where a chapter already gives the same table |
| 7 | No heading or paragraph open to misreading | (not addressed) | Each heading says plainly what is under it, most as the question it answers ("Can the business repay the loan?"). Tables in year order, never "tightest first". Status words a reader cannot misread ("Written trial order", "Enquiry only") |
| 8 | Everything expected is there, not hidden under layers | "Cross-reference instead of restating"; D-DOC-27 (a figure shown once, grey references after) | **D-DOC-27 set aside.** A figure appears where the reader needs it; no grey superscripts pointing to other exhibits. The summary states the key figures plainly; each chapter carries its own; Annex A is the full record |
| 9 | Graphics used creatively to ease understanding, not for their own sake | Wary of charts: "a chart only if it earns its place", tables preferred | Both hold: **a picture where it says the thing faster than a table**, a table for exact figures, and never a chart, a table and a paragraph saying the same numbers. SPEC3's pictures: where the money goes and who pays; buyers by how firm they are; the price ladder (competitors' bands and our price); the process with its slowest step marked; the timeline from the first draw to the first sale; sales against break-even by year; the cover each year against the usual level; the three cases' cover by year |
| 10 | A coherent flow from zero knowledge to full knowledge | A 16-module architecture and a spine (promoter, opportunity, market, operations, delivery, cost, cash, repayment, risks) | The spine kept as one story, told in that order, each chapter building on the last |

### What paper 1 missed
- **The reader.** It designed for an auditor checking provenance; Rahul's reader is a person, often the borrower or a branch officer, reading top to bottom. Plain words, unambiguous headings and a flow that teaches are what make a report credible to that reader.
- **Explaining the few technical terms once**, in plain words, where they first appear.
- **That graphics can carry meaning** a table cannot (a price ladder, a bottleneck, a timeline), not only decorate.

### What paper 1 over-emphasised, for the printed report
- The evidence-class taxonomy and confidence on every line; the exhibit contract's labelled lines (question, unit, period, source, meaning); the navigation table; strict "show once" cross-referencing. Each is sound as **engine and factory discipline** (metric IDs, sources, the marked copy, the factory map, the checks) and stays there. On the page they became layers a reader must decode.
- A page range as a target; the three output depths, payments and security belong to other rows.

### What stays from paper 1 and SPEC2
The plain cover with no chart; a one-page summary first; buyers by how firm they are and competitors' price bands, no invented market size; the operating plan with capacity, yield and the bottleneck; base, downside and severe-but-plausible cases, each a whole recomputation with the cash short and what the promoters would do; risks tied to an early sign, a response, an owner and the case that tests it; the assumptions in one table; open items with who and by when; the declaration and what the report is and is not; full statements in Annex A; the engine as the only source of figures, and `fill()` refusing any other digit (rule 12); the marked copy and the factory map for LIB1.

### SPEC3's order
Cover (name, what it is, place, the request, promoters, date, report number; contents below) · **Summary** (what, who, where; where the money goes and who pays; can it repay, as the cover against the usual level; in its favour, to watch, still to be done, each with its page) · 1 Who will run the business · 2 What it will make, and why here and now · 3 Who will buy, and at what price · 4 How the unit will work (process, capacity, site, inputs, people) · 5 From the loan to the first sale · 6 What it costs and how it is paid for · 7 Sales and profit · 8 Can the business repay the loan? · 9 If things go worse · 10 What could go wrong, and what is done about it · 11 What the figures assume · 12 What is still to be done, and the declaration · Annex A Financial statements · Annex B Machines and photographs.

## 11. Rahul's review of SPEC3 (17-11-2026)

Rahul read SPEC3 and kept its plain words, its length (points 5 and 6 of §10) and its pictures: "the way to go". Three changes, all made in SPEC4 (`docs/design-reference/report-specimen-4/`):

| # | Rahul | SPEC4 does |
|---|---|---|
| 1 | The summary also shows the first year's projected sales and profit after tax, so the reader sees the business's size at once | Then, in Rahul's word during the work, "communicated through graphics": under the request, each year's sales as a column with its profit after tax as the coloured foot (a loss in red, below the line); the first year darker and labelled in full beside it. The engine's figures. Snacks: ₹79.20 lakh and ₹5.19 lakh |
| 2 | In Chapter 10, remove the "who acts" and "tested by" columns | Removed. Each risk keeps what it would hit, its first sign and what is done. The owner and the testing case stay in the data, off the page. This sets aside the part of paper 1's risk contract (§10, "What stays") that tied each risk to an owner and a case on the page |
| 3 | In Annex A.5, show how each key ratio is worked out, so the reader can check it without working it out | Each ratio is drawn as a sum on paper: the lines above a rule added, the lines below it added, top divided by bottom, each line copied in rupees from the statement it sits in, named in the ratio's heading line with what the ratio tells and the usual level. The engine now keeps each ratio's two sides (`ratioParts`), so the page adds and divides nothing itself |

