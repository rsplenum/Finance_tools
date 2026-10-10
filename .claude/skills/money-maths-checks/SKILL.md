---
name: money-maths-checks
description: Rules and a checklist for any calculation of money in this repo - DSCR, EMI and repayment schedules, interest, tax, projections, FOIR, LTV, eligibility, the largest loan or the shortest tenure - when writing it, changing it, testing it, quoting a computed figure to the owner, or judging someone else's formula (another AI's, a spreadsheet's, a reviewer's). Use it before touching engine/ or any test of figures, and before stating a computed number in chat, even for a quick check.
---

# Money maths checks

Two projects taught this the hard way. In the home-loan appraisal tool, every test written from the model's own understanding passed while the owner's Excel showed the maths "way off". In this repo, a DSCR formula from an outside review looked clean but taxed profit before interest, which turns a loan that passes into one that fails. The figures are the product: a wrong one costs a borrower a loan, or a lender a default.

## Where numbers come from

- Only the engine (`engine/`, pure TypeScript, no DOM) computes a figure a user sees. Pages and documents turn its results into words; they never add, round-and-sum or convert amounts, and no AI output is ever a figure shown to users.
- Work out every figure twice, by different routes (step by step, and a closed form or another method), and withhold it when the two disagree (`engine/dscr-check.ts`). The simulation (`npm run sim`) checks invariants over random cases.
- Rules, benchmarks and rates live in dated data files under `engine/data/`, each with its source and date, marked unverified until confirmed. Never hardcode a lender's norm (a "bank target of 1.25"): lenders differ.
- A missing or unreadable input is never taken as 0. List what is needed and keep the result provisional; only the assumptions in `engine/data/defaults.json` may stand in, each shown with its reason.

## Rates read from a source

- A listing with a plural title ("ceiling lights", "robe hooks") may price a pack: read how many it holds before taking its price as one item's.
- Read a source's note on GST once, and tag every item that cites it alone the same way: before GST adds 18%, an MRP or retail price already includes it.
- Before bundling one item into another's set (a lock with a door, a mesh with a window), look in `engine/data/architect.json` for another family priced on the same quantity. A line cannot be switched off by itself, only its section, so the user cannot take out a double count.
- A search summary is a lead, not a source: open the page and read the figure before taking it.
- Read a page's notes and footnotes before checking a figure against it: a page that calls its prices illustrative, indicative or examples is a lead, not a check.
- A script that fills missing values touches only missing values: it prints each value it changes, old and new, and stops on one already set.
- Add a tax or a factor only to the part of a rate that its source quotes; keep parts from other sources apart in both computations.

## Where test figures come from

- From the owner's fictional cases worked at home, or a public worked example with its source. Never from the owner's office or employer, not even anonymised (D-BIZ-02). Until the owner confirms, call them model-worked.
- Never type an expected figure from memory: copy it from the hand-worked comment in the tests, or work it out a second way first. In September 2026, case A's yearly DSCRs typed from memory were wrong; the test caught it.
- Before quoting a figure to the owner in chat, compute it a second way (a short script or a hand check) and say how. A price derived from another (a cache read from an input price) is quoted with its ratio and source, and worked twice like any figure.

## Traps in Indian lending maths

Check each one when writing or reviewing a formula:

- **Tax** is on profit after interest and depreciation. Taxing profit before interest removes the interest's tax saving and understates DSCR. Example: Rs. 50 L at 10% over 5 years, profit Rs. 18 L taxed at 25% gives a year-1 DSCR of 1.15, not 1.06, and 1.23 with Rs. 4 L of depreciation.
- **Who the borrower is sets the tax.** A flat rate suits a company or a firm. An individual (a proprietor) pays slab rates, which are far lower on small incomes, so a flat 31.2% can overstate tax badly. Say which is used.
- **Depreciation** is a non-cash cost: it lowers tax and is added back to cash.
- **The average DSCR** is usually total cash available ÷ total debt service; the mean of the yearly ratios is a different method. Never average rounded ratios.
- **A year with no debt service** is "not counted", never 0.00 or "deficit".
- **DSCR is worked out once per financial year (April to March), over the whole year** (D-POL-05). In the year a loan starts or ends, count the year's full income and existing EMIs against only the new loan's instalments that fall in that year. Never share the income by months: the business earns all year. Those part-years show a high DSCR and lift the average, so always show the lowest year beside it.
- **Moratorium**: interest is paid and no principal; the first instalment comes after it.
- **EMI** is exact (as Excel's PMT); banks round it up to the rupee, so say which. An equal-principal loan has no single EMI.
- **Existing loans end.** Say whether they are assumed to run through the new loan.
- **Show enough decimals** that a ratio never contradicts its verdict (1.4996 against a target of 1.50).
- **Lakh and crore**: show 12,34,567, and accept "12 L" and "1.2 Cr" typed.
- **Where income ends** (retirement), model the boundary: the tiers end there. Never show Rs. 0 or "does not work" for a later period (the appraisal project).
