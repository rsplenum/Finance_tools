# Rules

Generated from `engine/data/` by `npm run rules-doc`; edit the data file, not this page.

## DSCR: how it is worked out

Dated 30-09-2026. Written from general practice by Claude. Not yet checked against a public worked example or confirmed by the owner; no figures, formats or norms from any employer (D-BIZ-02).

DSCR for a year = cash available for debt service ÷ debt service in that year.

- **Cash available** always includes profit after tax, depreciation and other non-cash charges (amortisation, amounts written off).
- **Debt service** always includes term-loan instalments (principal).

Four choices set the rest. The engine never picks one for you.

**Which interest is added back to cash available and counted as debt service?** (`interest`)

- Interest on term loans: adds interest on term loans to both cash available and debt service (`term-loans`)
- Interest on all borrowings, working capital too: adds interest on term loans and interest on other borrowings (working capital) to both cash available and debt service (`all-borrowings`)
- None: cash accruals against instalments only (`none`)

**Are lease rentals added back and counted as debt service?** (`leases`)

- Lease rentals left out (`no`)
- Lease rentals counted: adds lease rentals to both cash available and debt service (`yes`)

**Which years count towards the average and the lowest year?** (`years`)

- Years with a term-loan instalment (`repayment`)
- Every year with interest or instalments due (`debt-service`)

**How is the average worked out?** (`average`)

- Total cash available ÷ total debt service (`totals`)
- Simple average of the yearly DSCRs (`mean`)

The lowest year is the lowest DSCR among the years that count.

### Presets

- **Common term-loan DSCR**: interest on term loans; lease rentals left out; years with a term-loan instalment; total cash available ÷ total debt service. Source: How chartered accountants and banks work DSCR for term loans, as described in public articles (bankingfinance.in, finpab.com; docs/DSCR-RESEARCH.md); not a regulation, and not checked against a primary source (30-09-2026, not yet checked).
- **RBI resolution framework (2020)**: interest on all borrowings, working capital too; lease rentals left out; every year with interest or instalments due; total cash available ÷ total debt service. Source: RBI circular DOR.No.BP.BC/13/21.04.048/2020-21 of 7 September 2020: DSCR = (net cash accruals + interest and finance charges) ÷ (current portion of long-term debt + interest and finance charges), and the average over the period of the loan. Read through summaries; the circular itself could not be opened (30-09-2026, not yet checked).
- **As in the annual accounts (Schedule III)**: interest on all borrowings, working capital too; lease rentals counted; every year with interest or instalments due; total cash available ÷ total debt service. Source: ICAI Guidance Note on Schedule III: (profit after tax + non-cash operating expenses + interest) ÷ (interest and lease payments + principal repayments). It defines the yearly ratio only; the years counted and the average are this tool's. Read through summaries; the Guidance Note itself could not be opened (30-09-2026, not yet checked).

### Benchmarks

Shown as examples only, never used unless chosen. Each lender sets its own.

| What | Value | Source | Date | Checked |
|---|---|---|---|---|
| Average DSCR | 1.50 | Commonly quoted in Indian lending; not checked against a published source. Each lender sets its own | 30-09-2026 | no |
| Lowest year | 1.20 | Commonly quoted in Indian lending; not checked against a published source. Each lender sets its own | 30-09-2026 | no |

### When the engine builds the figures from the loan terms

- Interest accrues at the end of each day on that day's closing balance, and is charged (debited) at the end of the month, when it is paid. The loan is taken as drawn on the first day of its first month, and the balance changes only at a month's end, when an instalment is paid; so each month's interest is a twelfth of the yearly rate on the balance after the last instalment, as Excel's PMT and IPMT work it. A bank's account counts the days in each month instead, so its interest differs a little from month to month, but hardly over a year.
- No principal is repaid during the moratorium; interest is still paid.
- Instalment 1 falls at the end of the first month or quarter after the moratorium, and so on.
- Equal instalments of principal: loan ÷ number of instalments. Equated monthly instalments (EMI): the exact EMI, not rounded (as Excel's PMT); banks round it up to the rupee, a difference under Rs. 1 a month. EMI is worked monthly only.
- Tax: set by who the borrower is (engine/data/tax.json), or a typed rate × profit before tax. Nil in a year with a loss. Losses carried forward are not set off, so tax may be overstated in the year after a loss (the DSCR errs low).
- Profit before interest, depreciation and tax is taken after lease rentals.
- Extra income from the new asset is added to profit before interest, depreciation and tax from the month the asset starts running: in that year a twelfth of the yearly figure for each month left to 31 March, then the whole yearly figure. It does not grow. Leaving it out errs low.
- Years are Indian financial years, April to March.
- A line given as one figure and a percentage a year: each year is the year before × (1 + the percentage) when it grows, or × (1 − the percentage) when it falls (depreciation on the written-down value). One figure for every year is the same in each year. A figure for each year is taken as typed.
- When the figures start after the loan's first year (operations start later), no instalment may fall before they start; the interest before then is taken as paid from the project cost (capitalised, as Ind AS 23 does for an asset under construction), and those years are left out of the statement.
- Existing EMIs (loans already running) count in full as debt service under every method: each EMI for every month of every year, or only up to the month of its last EMI when that is given. A year that pays them has instalments, so it counts. Their interest is not known apart from the principal, so none of it is set against tax (the DSCR errs low).

### Which existing EMIs count

By who the borrower is (the owner's decision of 01-10-2026, D-POL-06).

| Borrower | Counted | Asked as |
|---|---|---|
| Proprietor | All of the proprietor's EMIs, business and personal: one cash flow pays them | All EMIs a month, business and personal (home, car, personal loans) |
| Partnership firm or LLP | The firm's or LLP's own loans only, not the partners' personal loans | EMIs a month on the firm's own loans |
| Company | The company's own loans only, not the directors' personal loans | EMIs a month on the company's own loans |
| Not yet said | | EMIs a month on loans already running: all of a proprietor's, business and personal; a firm's, LLP's or company's own loans only |

## Tax by borrower

Dated 01-10-2026. Rates for tax year 2026-27 (April 2026 to March 2027), the first under the Income-tax Act, 2025. Public summaries say the Finance Act, 2026 kept the rates of FY 2025-26. Secondary sources only, not yet checked against the Act or the Finance Act: the official sites (incometaxindia.gov.in, incometax.gov.in, indiabudget.gov.in, egazette.gov.in) could not be opened from the session. Later years are taken at the same rates. Tax is worked out on profit before tax, nil on a loss, and not rounded to the nearest Rs. 10 as a return is. The borrower's CA confirms it; any other rate can be typed.

Who the borrower is sets the tax on profit before tax: the rates, less any rebate, then any surcharge (never more than the tax at its threshold plus the income above it: marginal relief), then the cess on both.

| Borrower | Rates | Rebate | Surcharge | Cess | Law | Sources | Date | Checked |
|---|---|---|---|---|---|---|---|---|
| Proprietor: one person running the business in their own name | 0% up to Rs. 4,00,000; 5% above Rs. 4,00,000; 10% above Rs. 8,00,000; 15% above Rs. 12,00,000; 20% above Rs. 16,00,000; 25% above Rs. 20,00,000; 30% above Rs. 24,00,000 | Up to Rs. 60,000 on income up to Rs. 12,00,000; above that, the tax is at most the income above Rs. 12,00,000 | 10% above Rs. 50,00,000; 15% above Rs. 1,00,00,000; 25% above Rs. 2,00,00,000 | 4% | Section 202 (the new tax regime; section 115BAC of the 1961 Act) and section 156 (the rebate; section 87A of the 1961 Act) of the Income-tax Act, 2025; marginal relief just above the rebate's limit and at each surcharge threshold | cleartax.in and axismaxlife.com slab tables for FY 2026-27; bajajfinserv.in on Budget 2026 (slabs unchanged); aubsp.com and caclubindia.com on the section 156 rebate and its marginal relief; taxguru.in on section 202; cleartax.in on surcharge and marginal relief (secondary) | 01-10-2026 | no |
| Partnership firm or LLP: a partnership firm or a limited liability partnership | 30% of income | None | 12% above Rs. 1,00,00,000 | 4% | Rates in force for firms and LLPs, with marginal relief on the surcharge | taxmann.com and caalley.com rate charts for AY 2026-27; taxguru.in and taxscan.in on rates after the Finance Act, 2026 (secondary) | 01-10-2026 | no |
| Company: a company on the concessional rate of section 115BAA | 22% of income | None | 10% on any income | 4% | Section 115BAA of the Income-tax Act, 1961; section 200 of the Income-tax Act, 2025 | taxmann.com and caalley.com rate charts for AY 2026-27; taxtmi.com on section 200 (secondary) | 30-09-2026 | no |

## What the page assumes until you change it

Dated 01-10-2026. Set by Claude at the owner's request (30-09-2026: work everything out from this year's figures and sales growth, and assume the rest). Chosen to be reasonable and on the careful side for a lender; not checked against a published source. Every one is shown on the page and can be changed.

| What | Assumed | Why |
|---|---|---|
| How DSCR is worked out | Common term-loan DSCR | How chartered accountants and banks usually work it for term loans (docs/DSCR-RESEARCH.md) |
| The lender's target | Average 1.50, lowest year 1.20 | The commonly quoted examples (benchmarks in dscr.json); each lender sets its own |
| Tax rate | 31.2% | The rate for a firm or LLP, and the top rate for an individual with cess: on the careful side, since more tax gives a lower DSCR. Say who the borrower is to work out the tax for that borrower |
| A proprietor's tax | The new regime's slab rates, on the business's profit as the only income | Other income would put the profit in higher slabs, and the old regime (with deductions) is not offered: type a rate if either applies |
| Profit margin | As this year: profit before interest, depreciation and tax grows with sales | The only growth asked for is in sales |
| Extra income from the new asset | None beyond the growth | Leaving it out errs low. Add it if the asset adds to profit, from the month it starts running |
| Depreciation | As this year, every year | Depreciation on the asset the loan buys is left out; it lowers tax, so leaving it out errs low |
| Interest on other borrowings | As this year, every year, on top of this loan's interest | Working-capital limits are taken as unchanged |
| Loans already running | None | Change it if EMIs are paid on other loans: all of a proprietor's, business and personal; a firm's, LLP's or company's own loans only |
| Other non-cash charges and lease rentals | None | Few small businesses have them |
| The first year of the figures | The year the loan is first drawn | The business is running: it has this year's figures |

## Construction and renovation estimates

Dated 02-10-2026. The heads follow the usual order of a building estimate, as in public works schedules of rates; they are a convention, not a regulation. No rate is given anywhere: every estimate states the basis of its own rates, such as a contractor's quotation or a schedule of rates and its year.

**New construction**: Earthwork (cum); Plain concrete (cum); Reinforced concrete (cum); Reinforcement steel (kg); Masonry (cum); Plastering (sqm); Flooring and tiling (sqft); Doors and windows (LS); Painting (sqm); Waterproofing (sqm); Plumbing and sanitary (LS); Electrical (LS); Other works (LS).

**Renovation or repair**: Dismantling and removal (LS); Masonry and plaster repairs (sqm); Flooring and tiling (sqft); Doors and windows (nos); Kitchen (LS); Toilets and bathrooms (LS); Plumbing and sanitary (LS); Electrical (LS); Waterproofing (sqm); Painting (sqm); Other works (LS).

Units: cum (cubic metre), sqm (square metre), rmt (running metre), sqft (square foot), cft (cubic foot), rft (running foot), kg (kilogram), MT (tonne), nos (number), LS (lump sum).

- Each item's amount is its quantity × its rate.
- The abstract of cost adds up the items under each head; the total of the works is the sum of the heads.
- GST, when the rates leave it out, is added on the total of the works.
- Contingency, for unforeseen work, is added on the works with GST.
- The cost per sq ft is the total estimated cost ÷ the built-up area.

## Project report

Dated 02-10-2026. How a project report for a term loan with working capital is worked out here, in the form chartered accountants commonly use for small and medium enterprises. Set by Claude at the owner's request (02-10-2026); the depreciation rates and the working-capital methods are as described in public sources, not checked against the primary texts from here.

| Head of the project | Depreciation a year |
|---|---|
| Land | none |
| Building and civil works | 10% on the written-down value |
| Plant and machinery | 15% on the written-down value |
| Furniture and fixtures | 10% on the written-down value |
| Other fixed assets | 15% on the written-down value |
| Contingency on fixed assets | 15% on the written-down value |
| Preliminary and pre-operative expenses | written off over 5 years |

Written-down value at the income-tax rates (Income-tax Rules, 1962, Appendix I): buildings 10%, plant and machinery 15%, furniture 10%; other fixed assets and the contingency on them at the plant-and-machinery rate. A full year's depreciation in the first year.

Working capital: The second method of lending (Tandon Committee): the bank finances up to 75% of current assets, less creditors. The turnover method for small enterprises (Nayak Committee, RBI): working capital of 25% of the year's sales, of which the bank finances 20%.

**What the page assumes until you change it**

- **Stock, debtors and creditors**: 30 days each: stock and creditors of the year's materials and other variable costs, debtors of the year's sales. A common level for a small business; type the business's own.
- **The working-capital limit**: Fully used, and its interest paid, in every year. On the careful side: more interest, lower profit.
- **Drawings and dividends**: None: the profits stay in the business. Type them in the figures if the owners take money out.
- **Tax**: Paid in the year it falls due. No tax is left owing in the balance sheet.

**How the figures are worked out**

- Sales and fixed costs grow by the percentages given; materials and other variable costs are the same share of sales every year.
- Profit before interest, depreciation and tax is sales less variable and fixed costs. Depreciation is on the written-down value; preliminary expenses are written off in five equal parts.
- Interest on the term loan is from its repayment schedule; interest on working capital is the limit × its rate. Tax is worked out by who the borrower is.
- Stock, debtors and creditors are the days given of the year's figures. The margin for working capital, part of the cost of the project, is what the first year's stock and debtors need beyond the creditors and the bank's limit.
- The promoters bring in the cost of the project less the term loan, any subsidy and any unsecured loans.
- Cash in hand is what the cash flow leaves; the balance sheet must balance with it, or no figures are shown.
- DSCR is the common term-loan DSCR: (profit after tax + depreciation + preliminary expenses written off + interest on the term loan) ÷ (principal + interest on the term loan); the average is the totals' ratio.
- Break-even: fixed costs (with depreciation, preliminary expenses written off and interest) ÷ the contribution (sales less variable costs), as a share of sales; the cash break-even leaves out depreciation and the write-off.
