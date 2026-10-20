# FinSight — the vision on one page (VIS1, 20-10-2026; D-BIZ-11)

Study report: https://claude.ai/code/artifact/4bad29bb-5d80-4b27-9386-be3f2581c068 (private; the full case). What remains, in order: `docs/ROADMAP.md`.

## The promise
The documents a lender asks a borrower for, right on the first submission, and every figure in them either the borrower's own or an assumption stated on the page. Never a figure made up to fill a gap; never a claim the business cannot make.

## Whom we serve first
**Borrowers preparing one file**: small businesses and self-employed people in India asking for an MSME, Mudra or PMEGP loan, or a loan to build or renovate. They find us through search, get the answer free and pay only for the document. **DSAs and accountants** come second, on a plan for many files, once the borrower's path has paid reports behind it. Bank staff are not customers; nothing is aimed at the customers of the owner's employer bank (D-BIZ-01).

## The documents we make
1. **DSCR statement**: year by year, the average and the lowest, and the loan or tenure that meets the lender's target; beside it the DSCR as lenders test it.
2. **CMA data**, from the borrower's figures or a statement read and confirmed by them.
3. **Project report** for a term loan and working capital: sales by product, the projected P&L, balance sheet and cash flow, DSCR, break-even and the scheme's checks (PMEGP now, Mudra next).
4. **Construction or renovation estimate**, item by item with its rate's source.
5. **Make it viable**: what to change (loan, tenure, own money) when the numbers fall short.
Each comes as the PDF a lender reads, an Excel copy for an accountant and a Word copy to edit.

## Where we beat Finline and the others
- **Truth over speed**: sales asked, never invented; every figure the user's or a stated assumption (Finline invents sales and writes "loyal customers" for a business not yet started).
- **The scheme's rules checked** from dated files with their source (PMEGP's cap, land and own share; Mudra's levels), not a "100% compliance" seal.
- **The answer before any sign-up**; sign-up only to save or download.
- **Maths worked twice**, by the engine and by hand, never by an AI; AI only drafts the words, from the user's inputs, marked as a draft.
- Where they lead and we close the gap: ten short steps (our simple mode, REP3) and a written narrative (REP2).

## How we earn
- **Free**: every tool's answer on screen and the search pages that bring people in. Ads (AdSense) on the content pages only, never inside a tool or a document.
- **Paid**: the lender-ready document, per document for a borrower and a plan for DSAs and accountants. The price is set at P1d, at or below Finline's (Rs. 999 a report; Rs. 6,500 a year for professionals) as the benchmark.
- Payment starts once Phase 0 is done (the entity, GST, Razorpay); the free tools launch first.

## After launch
Three months of improving from what users do (the interaction data, D-TECH-37), then: more Indian languages, then the US, Europe and South America, each with its own dated rules and lenders' formats, and never a rule carried from one country to another. Hence a .com domain (D-BIZ-11).

## How it is built
Astro on Cloudflare Pages, the engine in the browser (pure TypeScript), one Worker with D1 and KV. Rules and rates only in dated data files under `engine/data/`. Programmatic search pages each carry a working tool and name brands only as `docs/TRADEMARKS.md` allows (D-BIZ-03).
