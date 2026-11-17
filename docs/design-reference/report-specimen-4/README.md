# SPEC4: SPEC3 redrawn to Rahul's review of it

This is the target LIB1 builds to. It is SPEC3 (`../report-specimen-3/README.md`, kept as it was) redrawn to Rahul's review of it (`docs/REPORT-REVIEW.md` §11). It is a drawing: the only change in the product is that the engine now keeps each ratio's two sides (`ratioParts` in `engine/report.ts`).

- `spec4-snacks.pdf`, `spec4-laundry.pdf`: the same two fictional cases, printed as a lender would get them. The snacks unit reads *comfortable*, the laundry *tight*. Each is 18 pages.
- `spec4-*-marked.pdf`: the same, with each block marked with the rule that chose it and the piece that wrote it; the factory map and the acceptance test on the last pages.
- `factory-*.json`: the factory map as data.

## What changed from SPEC3

- **The summary shows the business's size first, as a picture.** Under the request: each year's projected sales as a column, its profit after tax the teal foot of the column (a loss in red, below the line), the first year darker and labelled in full beside it (snacks, 2027-28: ₹79.20 lakh and ₹5.19 lakh; the laundry: ₹38.45 lakh and a loss of ₹0.45 lakh). All figures are the engine's. A first year of fewer than twelve months says how many.
- **Chapter 10 drops "Who acts" and "Tested by".** Each risk now has what it would hit, its first sign and what is done. The owner and the case that tests each risk stay in `cases.cjs` for LIB1, off the page.
- **Annex A.5 works each key ratio out.** Each ratio is a sum on paper: the lines above the rule are added, the lines below it are added, and the top is divided by the bottom. Every line is copied from the statements in rupees (A.1, A.2, A.4), so the reader checks by finding and copying, never by working out. The heading line of each says in a sentence what the ratio tells, the usual level for a new loan (`engine/data/ratios.json`) and where its lines come from. A year below the usual level prints in amber with "below usual"; a year with no loan left says "Loan repaid". A.5 takes two pages, so A.6 to A.8 share the next one.
- Kept from SPEC3: the plain words, the length and the eight pictures.

## How it is made

```
S=<scratch dir>
node_modules/.bin/esbuild docs/design-reference/report-specimen-4/figures.ts --bundle --platform=node --format=cjs --loader:.json=json --resolve-extensions=.ts,.tsx,.js,.json '--define:import.meta.env={}' --outfile=$S/figures.cjs --log-level=error
cp docs/design-reference/report-specimen-4/cases.cjs $S/ && node $S/figures.cjs > $S/figures.json
node docs/design-reference/report-specimen-4/build.cjs $S/figures.json $S/out
```

- `figures.ts` is SPEC3's, now also picking each year's `ratioParts`, unsecured loans, creditors and guarantee fee.
- `build.cjs` adds two checks for A.5: the rounded lines must add to the rounded total within a rupee (the page says a total can differ by a rupee), and the rounded top ÷ bottom must give the ratio printed. It warns if either fails; neither does now.
- Nothing in A.5 is added or divided in the drawing: the totals are the engine's two sides of each ratio and the answer is the engine's ratio. `tests/report.test.ts` rebuilds both sides from the year's own lines and checks top ÷ bottom against each ratio.

## What LIB1 takes from it

All of SPEC3's list, and:
- the summary's size picture (piece `summary.size v2`);
- the risk table in three columns (`table.risks v3`);
- the worked ratios (rule `annex.a.ratios`, piece `statement.ratios-worked`), built from `ratioParts`.
