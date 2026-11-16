# SPEC2: the specimen redrawn to the review

This is the target LIB1 builds to (D-DOC-26). It follows the twelve changes in docs/REPORT-REVIEW.md §4. It is a drawing: nothing in the product changes.

- `spec2-snacks.pdf`, `spec2-laundry.pdf`: two fictional cases, printed as a lender would get them. The snacks unit is the roasted-snacks page example, a partnership, and its reading is *comfortable*. The laundry is a service case run by a proprietor, and its reading is *tight*: the first year falls short of break-even, and the downside case runs short of cash.
- `spec2-*-marked.pdf`: the same reports, with every block marked in the left margin with the rule that chose it and the library piece that wrote it. Engine figures are on yellow and the borrower's typed words on lilac. The last two pages are the factory map.
- `factory-*.json`: the factory map as data (rules, when each applies, the pieces each chose), as LIB1's checklist.

## How it is made

- `figures.ts` runs the engine (`engine/report.ts`, `engine/worth.ts`) on both cases, then runs it again for each scenario. Every figure in the PDFs comes from there (rule 12).
- `cases.cjs` holds the borrower's own facts: promoters, buyers, competitors, risks, papers and what is still open. It also holds the trade packs ("units of this kind usually…"), which have no figures until LIB2 sources them, and the sizes of the scenarios, which are pencil (assumptions) until LIB1 puts them in a dated rule file.
- `build.cjs` puts the pages together. `fill()` refuses any digit outside an engine slot. `claim()` keeps a finding only when the figures bear it out. A figure belongs to one exhibit, and the build stops if a second exhibit shows it. A repeat elsewhere is a grey reference to that exhibit. The brief is a summary and Annex A's schedules are the record, so both point back by reference or repeat by design.

```
S=<scratch dir>
node_modules/.bin/esbuild docs/design-reference/report-specimen-2/figures.ts --bundle --platform=node --format=cjs --loader:.json=json --resolve-extensions=.ts,.tsx,.js,.json '--define:import.meta.env={}' --outfile=$S/figures.cjs --log-level=error
cp docs/design-reference/report-specimen-2/cases.cjs $S/ && node $S/figures.cjs > $S/figures.json
node docs/design-reference/report-specimen-2/build.cjs $S/figures.json $S/out
```

The build prints each copy's page count, reading and any page that overflows (none at the time of writing). It also writes a contact sheet of each marked copy.

## What LIB1 takes from it

- The 26 rules and 60 pieces in the factory map. Each piece becomes a versioned library file with named slots. Each rule becomes a dated rule file.
- The three readings of the cover (comfortable, tight, short), each with its own text.
- The exhibit contract: the finding as the title, then the question, unit, period, source and what it means.
- The order of the chapters, and the "where to find" table for the nine credit questions.
- What is still pencil here: the trade packs' words (LIB2 sources them), the scenario sizes, and the evidence chip on each line of the cost.
