# Product

<!-- impeccable:product-schema 1 -->

A full copy for Impeccable, by the owner's choice (26-10-2026): its view is to be fused with the repo's own later. Where this file and the repo's docs differ, the docs win until that fusion: `docs/PROJECT.md` (the vision), `CLAUDE.md` (the rules), `docs/DESIGN.md` (the design system), `docs/DECISIONS.md` (each decision).

## Platform

web

## Users

- **First: borrowers preparing one file.** Small businesses and self-employed people in India asking for an MSME, Mudra or PMEGP loan, or a loan to build or renovate. They arrive through search, get the answer free and pay only for the document. Often on a phone.
- **Recurring: DSAs, consultants and accountants**, who prepare many files and come back, on a plan for many files once the borrower's path has paid reports behind it.
- **Not users:** bank staff. Nothing is aimed at them, and nothing at the customers of the owner's employer bank (legal condition, D-BIZ-01).
- **The reader at the other end:** the lender's officer, who reads the PDF the borrower hands over.

## Product Purpose

The documents a lender asks a borrower for, right on the first submission. Success: a file accepted without being sent back, with every figure in it either the borrower's own or an assumption stated on the page.

The documents:
1. **DSCR statement**: year by year, the average and the lowest, and the loan or tenure that meets the lender's target, beside the DSCR as lenders test it.
2. **CMA data**, from the borrower's figures or a statement read and confirmed by them.
3. **Project report** for a term loan and working capital: sales by product, the projected P&L, balance sheet and cash flow, DSCR, break-even and the scheme's checks (PMEGP now, Mudra next).
4. **Construction or renovation estimate**, item by item with each rate's source.
5. **Make it viable**: what to change (loan, tenure, own money) when the numbers fall short.

Each comes as the PDF a lender reads, an Excel copy for an accountant and a Word copy to edit.

## Positioning

- **Truth over speed.** Sales are asked, never invented; every figure is the user's or a stated assumption. Competitors such as Finline invent sales and write "loyal customers" for a business not yet started.
- **The scheme's rules checked** from dated files with their source (PMEGP's cap, land and own share; Mudra's levels), not a "100% compliance" seal.
- **The answer before any sign-up**; sign-up only to save or download.
- **Numbers worked twice, never by an AI.** Every amount, ratio, eligibility and price comes from a deterministic engine and is checked by an independent second computation.
- **AI writes the literature, not the numbers.** The business profile, product profile and other narrative are drafted by AI from the user's own inputs and marked as a draft.

## Operating Context

- The borrower fills a short form, sees the answer on screen as they type, and downloads the document to hand to a bank or NBFC.
- An accountant or DSA opens the Excel copy; the borrower may edit the Word copy.
- AI may read figures from the borrower's own documents as an option beside typing: each shown with its page and line, cross-checked by the engine and confirmed by the borrower before it counts.
- Found through search: programmatic search pages each carry a working tool.

## Capabilities and Constraints

- **Pages now:** home, DSCR (`/dscr`), CMA, project report, estimate, contact, site map, and the policy pages (terms, privacy, refunds, not advice).
- **Stack:** Astro, Preact and Tailwind 4 on Cloudflare Pages; the engine in the browser in pure TypeScript (`engine/`); one Worker with D1 and KV. Every branch gets a preview deploy.
- **Rules and rates** live only in dated data files under `engine/data/`, each value with its source and date; lender-specific values are marked unverified until confirmed.
- **Never default a missing fact:** show what is needed and keep the result provisional. The only exceptions are the listed assumptions in `engine/data/defaults.json` and `engine/data/architect.json`, each shown on the page with its reason.
- **A page asks only the inputs the owner listed for it**; that list is a ceiling. The DSCR page asks seven inputs (with depreciation as an optional eighth); everything else is a stated assumption or under one closed "More options". A check counts the fields.
- **Words:** the estimate works "as an architect would" but never calls the tool, a page or a document an architect (Architects Act 1972, s. 37).
- **Money:** free answers on screen; paid lender-ready documents, per document for a borrower and a plan for professionals, priced at or below Finline's (Rs. 999 a report; Rs. 6,500 a year). Ads only on content pages, never inside a tool or a document. Payment starts after the entity, GST and Razorpay are in place.
- **Later:** more Indian languages, then the US, Europe and South America, each with its own dated rules; no rule carried across countries.

## Brand Commitments

- **Name:** FinSight (the owner, 13-10-2026).
- **Voice:** plain words on screen, the owner's words; a chartered accountant's terms in the documents. Every quoted figure has its source.
- **Brands of others** are named only as `docs/TRADEMARKS.md` allows.

## Evidence on Hand

- Test cases are the owner's own fictional cases worked at home, and public worked examples with their source.
- **Absent, never to be fabricated:** testimonials, customer names, user counts, lender endorsements, acceptance rates. Nothing from the owner's office or employer, not even anonymised; no bank-internal material, circulars or customer data.

## Product Principles

1. **Every figure is the borrower's own or a stated assumption.** Missing facts are asked for, never filled in.
2. **The answer first, free, before any sign-up.**
3. **Ask only what changes the answer.**
4. **The document must survive the lender's reading**: what a lender relies on comes before anything decorative.
5. **Plain words for the borrower; a CA's terms only in the documents.**

## Accessibility & Inclusion

WCAG 2.2 A and AA. Usable on a 360 px phone and by keyboard alone, the focus kept and visible. Readers include first-time borrowers for whom English is a second language; more Indian languages are planned.
