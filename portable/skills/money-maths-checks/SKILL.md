---
name: money-maths-checks
description: Rules and traps for any money calculation in Indian lending (EMI, DSCR, interest, tax, FOIR, LTV, eligibility, schedules) - writing, testing or reviewing one, or quoting a figure.
---

# Money maths checks

Two projects taught this the hard way. In a home-loan appraisal tool, every test written from the model's own understanding passed while the owner's Excel showed the maths "way off". In a DSCR tool, a formula from an outside review looked clean but taxed profit before interest, which turns a loan that passes into one that fails. The figures are the product: a wrong one costs a borrower a loan, or a lender a default.

## Where numbers come from

- Only deterministic code (a pure calculation module, no page code) computes a figure a user sees. Pages and documents turn its results into words; they never add, round-and-sum or convert amounts, and no AI output is ever a figure shown to users. AI may draft text from the user's own inputs, marked as a draft.
- Work out every figure twice, by different routes (step by step, and a closed form or another method), and withhold it when the two disagree. A quoted figure becomes a commitment: block the quote while a fact it depends on is missing or the two disagree.
- Rules, benchmarks and rates live in dated data files, each value with its source and date; a lender's or client's own values sit apart, marked unverified until confirmed. Never hardcode a lender's norm (a "bank target of 1.25"): lenders differ.
- A missing or unreadable input is never taken as 0. List what is needed and keep the result provisional; only assumptions listed on the page with their reason may stand in.
- Show what limits the answer. Stress tests and prudence flags are shown and tagged as prudence, never applied silently.

## Tests

- Golden tests come from the owner's worked figures: their own fictional cases worked at home, or a public worked example with its source, compared to the rupee (once Rs. 7,00,18,520 against an Excel's Rs. 7,00,18,523.50, a gap explained by rounding). Never from the owner's office or employer, not even anonymised. Until the owner confirms, call them model-worked.
- Never type an expected figure from memory: copy it from the hand-worked comment in the tests, or work it out a second way first.
- Property tests: the result moves the right way with income, tenure and rate; the balance reaches 0; every monthly constraint holds.
- A simulation over thousands of generated cases checks the invariants with a random fact dropped each time. Run every seed, not one: a bug once showed only on seed 4.
- Keep solvers monotone: when the maximum is the least of per-constraint bisections, every constraint must be monotone in the principal.
- Before quoting a figure to the owner in chat, compute it a second way (a short script or a hand check) and say how.

## Understand the method before coding it

Most rework came from misreading how practitioners work a calculation, so find a worked example first. Tiered EMI, for one: the maximum is the present value of each tier's surplus; at a lower amount every tier pays the same share of its surplus; tiers end where the income runs out.

## Rates read from a source

- Read how many a listing with a plural title holds before taking its price as one item's.
- Read a source's note on GST once and tag every item that cites it alone the same way. An MRP or retail price already includes GST; a price quoted before GST does not.
- A search summary is a lead, not a source: open the page and read the figure before taking it.
- A script that fills missing values touches only missing values: it prints each value it changes, old and new, and stops on one already set.
- Add a tax or a factor only to the part of a rate that its source quotes; keep parts from other sources apart in both computations.

## Traps in Indian lending maths

Check each one when writing or reviewing a formula:

- **Tax** is on profit after interest and depreciation. Taxing profit before interest removes the interest's tax saving and understates DSCR. Example: Rs. 50 L at 10% over 5 years, profit Rs. 18 L taxed at 25% gives a year-1 DSCR of 1.15, not 1.06, and 1.23 with Rs. 4 L of depreciation.
- **Who the borrower is sets the tax.** A flat rate suits a company or a firm. An individual (a proprietor) pays slab rates, which are far lower on small incomes, so a flat 31.2% can overstate tax badly. Say which is used.
- **Depreciation** is a non-cash cost: it lowers tax and is added back to cash.
- **The average DSCR** is usually total cash available ÷ total debt service; the mean of the yearly ratios is a different method. Never average rounded ratios.
- **A year with no debt service** is "not counted", never 0.00 or "deficit".
- **DSCR is worked out once per financial year (April to March), over the whole year.** In the year a loan starts or ends, count the year's full income and existing EMIs against only the new loan's instalments that fall in that year. Never share the income by months: the business earns all year. Those part-years show a high DSCR and lift the average, so always show the lowest year beside it.
- **Moratorium**: interest is paid and no principal; the first instalment comes after it.
- **EMI** is exact (as Excel's PMT); banks round it up to the rupee, so say which. An equal-principal loan has no single EMI.
- **Existing loans end.** Say whether they are assumed to run through the new loan.
- **Show enough decimals** that a ratio never contradicts its verdict (1.4996 against a target of 1.50).
- **Lakh and crore**: show 12,34,567, and accept "12 L" and "1.2 Cr" typed.
- **Where income ends** (retirement), model the boundary: the tiers end there. Never show Rs. 0 or "does not work" for a later period.
- **Sub-rupee rounding at the edges**: the last month's remainder must not push the instalment over the month's limit, and a Rs. 1 loan still shows an instalment above 0.
