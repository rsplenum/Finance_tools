# Golden cases

Golden figures must come from outside the model, and never from the owner's office or employer (D-BIZ-02). Two ways:
1. **The owner's own fictional cases**, worked at home in the owner's own Excel, the usual way.
2. **Public worked examples**, with the source named (document, page, date).

Until a case is confirmed that way, its expected figures in the tests are **model-worked** and say so.

## Case A (fictional): confirmation wanted
Inputs only, so your working is not anchored to ours. Work it your usual way and send back: the DSCR for each year, the average, the lowest year, and the loan amount at which the average is exactly 1.50. If your method differs from `docs/RULES.md` (the interest, the years counted or the average), say how. That difference is what this case is for.

**Loan:** Rs. 12,00,000 at 12% a year, drawn in April 2026. Six months' moratorium with interest paid monthly. Then 12 quarterly instalments of Rs. 1,00,000 principal, the first at the end of December 2026. Interest is charged monthly on the balance.

| Rs. | 2026-27 | 2027-28 | 2028-29 | 2029-30 |
|---|---|---|---|---|
| Profit before interest, depreciation and tax | 5,00,000 | 7,50,000 | 8,00,000 | 8,00,000 |
| Depreciation | 1,50,000 | 1,30,000 | 1,10,000 | 1,00,000 |
| Interest on working capital | 50,000 | 50,000 | 50,000 | 50,000 |
| Tax rate | 25% | 25% | 25% | 25% |

No other non-cash charges, other term loans or lease rentals.

Status: model-worked in `tests/dscr.test.ts`, and entered through the page in `tests/dscr-page.test.ts` and `npm run check:site`; not yet confirmed.

## Case A′ (fictional): the quick path
Case A's loan, and only this year's figures; the page assumes the rest (`docs/RULES.md`, "What the page assumes").

**This year (2026-27):** profit before interest, depreciation and tax Rs. 5,00,000, growing 10% a year with sales; depreciation Rs. 1,50,000 and interest on working capital Rs. 50,000, both the same every year. Tax 31.2%.

Send back, your usual way: the DSCR for each year, the average and the lowest year.

Status: model-worked in `tests/dscr-page.test.ts` and `npm run check:site`; not yet confirmed.
