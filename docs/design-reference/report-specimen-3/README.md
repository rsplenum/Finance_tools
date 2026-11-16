# SPEC3: the specimen redrawn to Rahul's ten points

This is the target LIB1 builds to. It is SPEC2 redrawn to Rahul's ten points on it (`docs/REPORT-REVIEW.md` §10, D-DOC-28). It is a drawing: nothing in the product changes.

- `spec3-snacks.pdf`, `spec3-laundry.pdf`: the same two fictional cases as SPEC2, printed as a lender would get them. The snacks unit's reading is *comfortable*; the laundry's is *tight*. Each is 17 pages: the cover with the contents, a one-page summary, twelve chapters on ten pages, then Annexes A and B.
- `spec3-*-marked.pdf`: the same reports, with every block marked in the left margin with the rule that chose it and the piece that wrote it. Engine figures are on yellow and the borrower's typed words on lilac. The last two pages are the factory map and the acceptance test.
- `factory-*.json`: the factory map as data (rules, when each applies, the pieces each chose), plus the acceptance test's answers.

## What changed from SPEC2

- **What the reader no longer sees.** The where-to-find table, the how-to-read page, the evidence tags and the grey references are gone. What backs a line is now said in words ("On the machine maker's quotation, 28-10-2026"; "The partners' own estimate"; "Assumed: …"). The marks a reviewer or a machine needs stay in the marked copy only. The build stops if a factory word reaches the clean copy: exhibit, the register, LIB, provenance, slot, the engine, and similar.
- **The chapters are the credit questions, in story order.** 1 Who will run the business · 2 What it will make (or do), and why here and now · 3 Who will buy, and at what price · 4 How the unit will work · 5 From the loan to the first sale · 6 What it costs and how it is paid for · 7 Sales and profit · 8 Can the business repay the loan? · 9 If things go worse · 10 What could go wrong · 11 What the figures assume · 12 What is still to be done, and the declaration. The contents sit on the cover, so they are the guide. The build checks that each of the nine credit questions is answered by a chapter title (the table on the marked copy's last page).
- **Pictures where they say it faster.** Eight of them:
  - money in and out: two columns, what the money buys and who pays, each line with its amount and its backing;
  - buyers by firmness: written order, letter of intent, tried samples, enquiry only;
  - the price ladder: competitors' bands against our price;
  - the process with its slowest step marked;
  - the timeline from the first draw of the loan to the first sale;
  - sales against break-even;
  - the cover by year against the usual level;
  - the three cases.

  Each picture has a title that says what it shows. No picture, table and paragraph all repeat the same numbers.
- **A figure repeats where the reader needs it.** D-DOC-27 is set aside: a figure is not tied to one exhibit any more.
- **Plain words.** Each term is explained once, where it is first used: break-even in Chapter 7, the DSCR in Chapter 8. The cases are "As planned", "Worse" and "Much worse".
- **The footer** reads "Made using FinSight" and the page number.

## How it is made

```
S=<scratch dir>
node_modules/.bin/esbuild docs/design-reference/report-specimen-3/figures.ts --bundle --platform=node --format=cjs --loader:.json=json --resolve-extensions=.ts,.tsx,.js,.json '--define:import.meta.env={}' --outfile=$S/figures.cjs --log-level=error
cp docs/design-reference/report-specimen-3/cases.cjs $S/ && node $S/figures.cjs > $S/figures.json
node docs/design-reference/report-specimen-3/build.cjs $S/figures.json $S/out
```

- `figures.ts` is SPEC2's, unchanged. It runs the engine on both cases and on each case of things going worse.
- `cases.cjs` holds the borrower's own facts as in SPEC2, with these additions:
  - each competitor's price band as numbers, for the ladder;
  - `service` ("make" or "do");
  - `slowest`: the process step that sets the day's output.
- `build.cjs` keeps SPEC2's guards:
  - `fill()` refuses any digit outside an engine slot;
  - `claim()` keeps a finding only when the figures bear it out;
  - `typed()` marks the borrower's own words.

  It adds the plain-words check and the acceptance test. It prints each copy's pages, its reading and any page that overflows. There are none at the time of writing.

## What LIB1 takes from it

- The 24 rules and about 53 pieces in each factory map. Each piece becomes a versioned library file with named slots, and each rule a dated rule file.
- The chapter order above, and the contents as the guide. The acceptance test becomes a check on every report the factory makes.
- The eight pictures as parts that draw from the engine's figures. Each has a title chosen by `claim()` from what the figures show.
- The three readings (comfortable, tight, short), each with its own text in the summary, Chapter 8 and Chapter 12.
- What backs each line, in words, from the evidence labels. The labels stay in the data and on the marked copy.
- Still pencil here: the trade packs' words (LIB2 sources them), the sizes of the cases and the competitors' bands (the borrower's typed figures).
