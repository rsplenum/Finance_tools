# Loan-document tools — what and why

Study report: https://claude.ai/code/artifact/4bad29bb-5d80-4b27-9386-be3f2581c068 (private; read it for the full case).

## What
Web tools that produce the documents lenders ask borrowers for, correct and in the expected format on the first submission:
1. **DSCR statement**: year-wise DSCR, average and minimum, and the loan or tenure that reaches the lender's target.
2. **Construction / renovation estimate**: item-wise, with the rate basis stated, in the usual lender format.
3. **Project report** (term loan and working capital), including the projected balance sheet and P&L, cash flow, DSCR, break-even and ratio checks.
Free: a home-loan project-cost calculator, used to bring in visitors.

## Who
DSAs and accountants who prepare many files (monthly plan), and borrowers preparing one (pay per document). Bank staff are not customers.

## How
Static Astro site on Cloudflare Pages, with the calculations running in the browser. Programmatic SEO pages each carry a working calculator. Razorpay unlocks the download through one Cloudflare Worker, with D1 and KV behind it. Documents are generated in the browser (DOCX, Excel, print to PDF). Numbers come from a deterministic engine; AI only drafts narrative text, marked as a draft.

## Order
Phase 0 clearances (permission settled 30-09-2026, D-BIZ-01; entity, GST, Razorpay still to do) → Phase 1 DSCR (weeks 1–4) → Phase 2 estimate (weeks 5–8) → Phase 3 project report (weeks 9–18). Gates between phases: written go-ahead, 20 paid reports, 10 DSA plans.

## Open questions
- Which lenders' formats and benchmarks come first.
- Golden figures: the owner's own fictional cases and public worked examples, never office files (D-BIZ-02).
- First region and cities for construction rates.
- Main customer first: DSAs (plans) or borrowers (one-off).
