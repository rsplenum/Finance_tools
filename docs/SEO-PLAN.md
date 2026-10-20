# The pSEO plan (SEO1, 20-10-2026; D-BIZ-08) — for the owner to approve

What people in India search for that our five tools answer, the page types that meet it, how many pages, and the data each page carries. SEO2 builds the template and the 23 pages that need no new source; SEO3 the pages by business once their model cases come; SEO4 the rest (`docs/ROADMAP.md` rows 7 to 8b). Nothing here is indexed before LAUNCH (`noindex` stays, D-TECH-07) or before the IP lawyer's read (`docs/TRADEMARKS.md`).

## Sources (all in `docs/seo/`, read 20-10-2026)
- **Demand:** the owner's Google Ads Keyword Planner exports, location India, 1 Oct 2025 to 30 Sep 2026 (`keyword-planner-stats-2026-10-20a.csv`, 596 terms; `…b.csv`, 30 terms; the ad forecast `keyword-planner-forecast-2026-10-20.csv`). Google Trends was not read: the export gives bands, which Trends' relative index cannot add to.
- **What people type after a seed:** Google's autocomplete for India (`suggestqueries.google.com`, `gl=in`, `hl=en`), each seed alone and with a to w after it (`autocomplete-2026-10-20.txt`; a `~` line is a suggestion that does not start with the seed).
- **Competitors' page counts:** their `robots.txt` sitemaps, every URL counted by pattern (below).
- **Google's rules:** the spam policies (updated 28-08-2026), "Creating helpful, reliable, people-first content" (05-10-2026) and "Using generative AI content" (01-10-2026), all on developers.google.com/search/docs.

**How to read the counts.** An account that has not run ads gets bands, not counts: 50 means 10 to 100 a month, 500 means 100 to 1,000, 5,000 means 1,000 to 10,000, 50,000 means 10,000 to 100,000. Keyword Planner also folds close variants into one figure: "dscr formula", "debt service coverage ratio formula", "debt coverage formula", "dscr ratio formula", "debt service ratio formula" and "loan coverage ratio formula" each show 50,000 with the same bids, so they are one search counted six times, never to be added. The same holds for "project report format for bank loan" and "sample project report format for bank loan" (5,000 each).

## Google's rules, and the test every page passes
Google: "Scaled content abuse is when many pages are generated for the primary purpose of manipulating search rankings and not helping users … no matter how it's created." Its doorway examples include "multiple … pages targeted at specific regions or cities that funnel users to one page" and "substantially similar pages that are closer to search results than a clearly defined, browseable hierarchy". On AI: "using generative AI tools … to generate many pages without adding value for users may violate Google's spam policy on scaled content abuse."

So a page is made only when it passes all five, and SEO2's thin-page check fails the build otherwise:
1. **Its own data changes the answer.** Each page carries values from a dated, sourced data file that no other page has (a business's project cost and output, a city's rates, a worked DSCR case), and the tool on it opens with them filled in, marked "an example from <source>, change any figure".
2. **A working tool, not a funnel.** The calculator works on the page itself; the page never only links to the tool.
3. **The words come from the data.** Headings, the read-back and the worked example are written from the page's own figures by the engine; no paragraph is shared word for word beyond the common footer and the method link. AI writes no page text (CLAUDE.md).
4. **A hierarchy you can browse.** Every page sits under its tool's hub, linked from a list there (`/project-report/` lists the businesses), with a breadcrumb.
5. **Sourced and dated.** Every figure shows its source and date, as on the tools now; a value not yet checked is marked so, and a page with any unchecked core value is not published.

## Demand, by tool (bands as above; the strongest terms)
| Tool | Head terms (band) | The long tail it opens |
|---|---|---|
| DSCR | "dscr formula" cluster (50,000); "debt service coverage calculation", "calculate dscr ratio" (5,000); "dscr calculator", "debt service coverage ratio calculator", "dscr ratio calculator" (500 each, YoY +900%); "interest service coverage ratio" (50,000, three-month +900%) | "dscr formula for term loan", "dscr formula in bank", "dscr formula with example", "dscr ratio ideal", "gross dscr formula", "average dscr formula", "dscr formula excel" (500 each); autocomplete adds "dscr and iscr", "benchmark ratio for msme", "dscr in pmegp", "dscr in project report" |
| Project report | "project report for bank loan", "pmegp project report", "project report format for bank loan", "pmegp project list" (5,000 each) | "project report for msme loan", "mudra loan project report", "detailed project report for bank loan", "project report for business loan", "pmegp project report pdf/sample", "kvic project report", "project report for poultry farm" (500 each); by business at 50 each: boutique, cafe, fabrication, flour mill, garments, hotel, restaurant, shop, warehouse, tent house and some 30 more; autocomplete adds dairy farm, goat farming, atta chakki, oil mill, bakery, kirana, medical store, beauty parlour, gym, fly ash bricks, mineral water plant, masala, mushroom, cyber cafe, e-rickshaw, CM Yuva and other state schemes |
| CMA | "cma data format", "cma report for bank loan", "cma report format", "cma data format in excel", "cma data for bank loan", "cma report full form" (500 each) | for a CC limit, a term loan, working capital, a proprietorship, manufacturing or trading (50 each); per-bank formats (Bank of Baroda, Bank of India, PNB, SBI; 50 each): **not to be built**, below |
| Estimate | "house construction cost calculator" (50,000; three-month −90%); "house construction cost in bangalore", "house construction cost per sq ft" (500); "construction loan calculator", "home construction loan calculator", "house building loan calculator", "home construction loan emi calculator" (500 each); "construction estimate for home loan" (no band: too few) | autocomplete: "house construction cost in" Chennai, Kerala, Lucknow, Hyderabad, Jaipur, Indore, Dehradun, Bhubaneswar, Coimbatore, Ahmedabad, Delhi, Goa, Gurgaon and more, often "per sq ft" and "2026" |
| Others | "term loan emi calculator" (5,000); "break even calculator" (500); "working capital loan calculator", "working capital limit calculation" (50) | |

**The ad forecast** (owner's export): ₹460 a day in November 2026 gives about 889 clicks for ₹13,800 at ₹15.53 a click, three-quarters on mobile. Recorded for later; see tradeoff 5.

## Competitors (sitemap URLs on 20-10-2026)
| Site | URLs read | Project report pages | Calculators | DSCR or CMA tools |
|---|---|---|---|---|
| niir.org | 7,960 | 5,974 (`/project-reports/…`, paid reports) | 0 | 0 |
| finline.in | 546 | 526 (`/project-report/restaurant` …) | 0 | 0 (a paid CMA service) |
| paisabazaar.com | 10,750 | 4 (`/business-loan/mudra-loan-project-report/` …) | 210 (EMI per bank) | 0 |
| groww.in | 42,869 | 0 | 218 | 0 |
| bankbazaar.com | 32,558 (80 of 316 sitemaps read) | 0 | 216 | 0 |
| cleartax.in | 14,389 | 0 | 58 (tax) | one CMA article |
| indiafilings.com, vakilsearch.com | 18,473 (80 of 175 sitemaps read), 139,997 | 0 | 20, 21 | one CMA service page |
| ultratechcement.com | 1,626 | 0 | 3 (cost, EMI) | 0 |

myloancare.in and nobroker.in gave no sitemap URLs to a script. **The gap:** no site has a working DSCR or CMA tool on a page of its own, and the project-report sites sell a PDF per business rather than letting the borrower work their own figures. Our pages per business win only if each carries a real model case the borrower can change.

## The page types, their count and each page's data
| Type | Address | Pages | Each page's data (its source) | Batch |
|---|---|---|---|---|
| T1 The tool pages, retuned | `/dscr/`, `/project-report/`, `/cma/`, `/estimate/` | 0 new (4 titles, lines and hub lists) | as now; titles take the head terms ("DSCR calculator", "Project report for a bank loan", "CMA data format", "House construction cost and estimate for a home loan") | SEO2 |
| T2 DSCR questions | `/dscr/<question>/`: formula with an example; the DSCR banks look for; average or lowest; gross and net; for a term loan; DSCR and ISCR; in Excel; in a project report or PMEGP | 8 | one worked case each, from the owner's fictional cases (CLAUDE.md), run by the engine; the benchmarks in `engine/data/dscr.json`; ISCR needs a small engine addition (tradeoff 4) | SEO2 |
| T3 Project report by business | `/project-report/<business>/` | 30 in SEO2's batch, to about 60 in SEO3, never more than the businesses with a checked model case | a model case: project cost by head (land, building, machinery, furniture, other, contingency, preliminary), capacity and its unit, price, use of capacity by year, variable cost share, fixed costs, stock, debtor and creditor days, months to start, and PMEGP's fit (category, area, activity); source: a dated public model profile (KVIC's PMEGP model projects, NABARD's model schemes for dairy, poultry and goats), in a new `engine/data/businesses/` file per business. **Not yet readable from here** (tradeoff 1) | SEO3 (30), SEO4 (the rest) |
| T4 Scheme hubs | `/project-report/pmegp/`, `/project-report/pmegp/list/` ("pmegp project list"), `/project-report/mudra/`, `/project-report/msme-loan/` | 4 | the scheme's rules already in `engine/data/report.json` (`schemes.pmegp`); Mudra's tiers to add, sourced; each lists its T3 pages | SEO2 |
| T5 CMA questions | `/cma/<question>/`: the format in Excel; for a CC limit; for a term loan; trading or manufacturing; what CMA data holds | 5 | one fictional case each through the CMA engine; its Excel download | SEO2 |
| T6 House construction cost by city | `/estimate/<city>/` | 6 now (Bengaluru, Chennai, Delhi NCR, Hyderabad, Mumbai, Pune); more only as each city's band is sourced | the city's reported cost band and factor (`engine/data/architect.json` `cities`), the city's own charges (`byCity` in the library), the estimate opened for that city | SEO2 |
| T7 Loan tools from the engines | `/emi/term-loan/`, `/emi/house-construction/`, `/break-even/` | 3 | the engine's EMI (`engine/util.ts`) and break-even (`engine/report.ts`, a small entry point to add); no rate filled in, as now | SEO4 |

**Count:** 23 new pages in SEO2 (T2 8, T4 4, T5 5, T6 6) with T1's 4 retuned, 30 in SEO3 (T3's first businesses), and about 33 in SEO4 (T3 to about 60, T7 3): **about 86 new pages** in all, against 526 and 5,974 for the project-report sites. Fewer and richer, as `docs/TRADEMARKS.md` rule 8 asks.

**First 30 businesses for T3**, each seen in the export or in India's autocomplete: dairy farm, poultry farm (layer), poultry farm (broiler), goat farming, flour mill (atta chakki), oil mill, dal mill, masala making, bakery, restaurant, cafe, small hotel, kirana shop, medical store, readymade garments, boutique, beauty parlour, gym, fly ash bricks, cement bricks, mineral water plant, mushroom farming, fabrication workshop, furniture making, photo studio, cyber cafe, xerox and printing, tent house, e-rickshaw, cloud kitchen. A business without a checked model case is skipped, not filled in.

## Not to build
- **Per-bank CMA or project-report formats** ("bank of baroda cma data format" and the like): D-BIZ-01 forbids pages aimed at the employer bank's customers, and `docs/TRADEMARKS.md` rule 7 keeps brands out of addresses and titles.
- **Students' searches** ("project report for mba", "on dmart pdf", "ignou"): not borrowers.
- **US-only terms** in the export ("dscr mortgage", "fha", "va construction loan", "heloc"): no Indian demand.
- **Home loan eligibility calculator** (50,000, medium competition): no engine yet, and banks hold the page one; a later engine row (tradeoff 3).

## Tradeoffs to decide
1. **Where T3's model cases come from.** KVIC's model-project pages are gone from kvic.gov.in (404) and kviconline.gov.in and nabard.org do not answer this cloud; msme.gov.in and sidbi.in list none; myscheme's PMEGP page needs a browser. *Recommended:* you download KVIC's PMEGP model project PDFs and NABARD's model schemes for the first 30 businesses on your own connection and upload them; a session reads each into a dated file and you confirm. The other ways: build T3 without figures (thin by Google's rule, not recommended) or build only the other 23 pages until the PDFs come (SEO2 does that first in any case).
2. **Hindi.** Autocomplete shows "kya hota hai", "kaise banaye" and "in hindi" for the DSCR, CMA and PMEGP. *Recommended:* English at launch; Hindi pages for the top 10 later, written from the same data, as a translation alone with little added is one of Google's examples of scaled abuse.
3. **The home loan eligibility calculator** has the biggest band in the export but no engine. *Recommended:* after launch, its own engine row (FOIR and LTV rules, sourced); not in SEO2 or SEO3.
4. **Interest service coverage ratio** (50,000, rising): *Recommended:* add ISCR to the DSCR engine in SEO2 (a small addition, under the money-maths checks) so its page shows a real figure; otherwise its page explains without one.
5. **Ads before search ranks.** The forecast's clicks are cheap, but payment is not live (P1d). *Recommended:* no ads until P1d is live; then a test on the T3 and T4 terms only, never on brand names (`docs/TRADEMARKS.md` rule 10).

## The reading, offloaded (D-TECH-53)
SEO2 to SEO4 read the most (scheme pages, model profiles, competitors' sitemaps, search terms). Where the owner runs Gemini on it: the session writes the Gemini prompt and the hosts, the owner saves Gemini's answer as `docs/inbox/<row>-gemini.md`, each fact a word-for-word quote with its address and date. Claude then fetches only the quoted lines, checks every figure (a rate, limit, count or price) and about one in five of the rest, and marks each same, differs or unclear; only checked lines go into a dated data file. A figure never comes from Gemini's own words, and no page text or code is taken from it unchecked.

## What SEO2 builds from this
The page template (the five tests above as code), T1's 4 retuned and the 23 pages of T2, T4, T5 and T6 from data files, a sitemap, canonicals, breadcrumbs and `WebApplication` structured data, and the thin-page check: it fails a page with fewer than its type's own data values, no prefilled tool, no source and date, or a paragraph repeated on another page. Mudra's tiers need a source this cloud can read (mudra.org.in does not answer it): SEO2 lists the hosts first, as always. T3 waits on tradeoff 1.
