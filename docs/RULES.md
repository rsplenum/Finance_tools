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

- **Common term-loan DSCR**: interest on term loans; lease rentals left out; years with a term-loan instalment; total cash available ÷ total debt service. Source: General practice in Indian project reports, as Claude understands it; not checked against a published source (30-09-2026, not yet checked).

### Benchmarks

Shown as examples only, never used unless chosen. Each lender sets its own.

| What | Value | Source | Date | Checked |
|---|---|---|---|---|
| Average DSCR | 1.50 | Commonly quoted in Indian lending; not checked against a published source. Each lender sets its own | 30-09-2026 | no |
| Lowest year | 1.20 | Commonly quoted in Indian lending; not checked against a published source. Each lender sets its own | 30-09-2026 | no |

### When the engine builds the figures from the loan terms

- Interest is charged every month on the balance at the start of the month, and paid that month.
- No principal is repaid during the moratorium; interest is still paid.
- Instalment 1 falls at the end of the first month or quarter after the moratorium, and so on.
- Equal instalments of principal: loan ÷ number of instalments. Equated monthly instalments (EMI): the exact EMI, not rounded (as Excel's PMT); banks round it up to the rupee, a difference under Rs. 1 a month. EMI is worked monthly only.
- Tax = tax rate × profit before tax, and nil in a year with a loss. Losses carried forward are not set off, so tax may be overstated in the year after a loss (the DSCR errs low).
- Profit before interest, depreciation and tax is taken after lease rentals.
- Years are Indian financial years, April to March.
