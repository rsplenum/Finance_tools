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

Dated 02-10-2026. Set by Claude at the owner's request (30-09-2026: work everything out from this year's figures and sales growth, and assume the rest). Chosen to be reasonable and on the careful side for a lender; not checked against a published source. Every one is shown on the page and can be changed.

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
| Interest on working capital | None: the profit asked on the first screen is before all interest | Give the interest on a cash credit or overdraft under More options, if the business pays it |
| Loans already running | None | Change it if EMIs are paid on other loans: all of a proprietor's, business and personal; a firm's, LLP's or company's own loans only |
| Other non-cash charges and lease rentals | None | Few small businesses have them |
| The first year of the figures | The year the loan is first drawn | The business is running: it has this year's figures |
| The loan | Drawn this month, repaid by EMI every month, with no moratorium | Change any of it under More options |

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

## The architect's rules

Dated 03-10-2026. What an architect would decide from six answers: the rooms and their sizes, the doors and windows, how each surface is measured, what each room needs at each level, and how many points the wiring and plumbing need (D-UX-18). Each rule names its source, or says it is our own rule and why. A rule is an assumption until the user changes it, and the page and the document list it (D-UX-08). The sources were read through search summaries and are not yet checked against their pages.

**The five levels**

| On screen | Your word | What it means |
|---|---|---|
| Basic | Modest | Sound and simple: ISI-marked materials, the economy ranges of known brands, nothing decorative |
| Standard | Upper class | What most new flats are sold with: branded mid-range materials and a few comforts |
| Premium | High | Premium Indian and mainstream international brands, better finishes, more lighting |
| Luxury | Luxury | International premium brands, natural stone, designer finishes, tiles to the ceiling |
| Bespoke | Ultra luxury | Imported designer brands, bespoke joinery, Italian marble, home automation |

**Sections on for each kind of work**

- **Build a new house**: Structure, Waterproofing, Terrace, exterior and stairs, Flooring, Walls and paint, Ceiling, Bathrooms, Kitchen, Doors and windows, Electrical and lights, Plumbing, Outside works, Water. A new house: its structure, the terrace, the outside walls and the stairs, every finish and service inside, the outside works round the plot and the water. Wardrobes, appliances, smart controls, furniture and soft furnishings are often bought later, so they start off and can be switched on.
- **Repair or renovate**: Civil and repairs, Waterproofing, Flooring, Walls and paint, Ceiling, Bathrooms, Kitchen, Doors and windows, Electrical and lights, Plumbing. A renovation renews the finishes and the services; appliances, furniture and smart controls are bought separately, so they start off and can be switched on.
- **Interiors**: Civil and repairs, Walls and paint, Ceiling, Kitchen, Wardrobes and storage, Electrical and lights, Appliances, Smart home and security, Furniture, Soft furnishings. Interiors fit out and furnish a flat whose floors, bathrooms, doors and services are already done; those sections start off and can be switched on. The furniture and soft furnishings are movable, so they are shown apart from the fixed works (the owner, D-UX-19).

**The rooms for each BHK** (each room's reported range in sq ft; only the sizes' proportions are used, shared out over your carpet area)

| BHK | Rooms | Balcony | Usual carpet area | Why |
|---|---|---|---|---|
| 1 BHK | Living and dining 120–180; Bedroom 100–140; Kitchen 50–80; Bathroom 30–50 | 40 | 450–600 | Each room's reported range, Medium its middle: bedroom 100–140, living 120–180, kitchen 50–80, toilet 30–50 sq ft. The balcony is our own allowance. (Standard size of 1BHK to 4BHK flats; What is a 1 BHK: size and rooms) |
| 2 BHK | Living and dining 180–220; Main bedroom 130–160; Bedroom 2 110–130; Kitchen 60–80; Bathroom 1 (attached) 30–35; Bathroom 2 30–35 | 50 | 650–850 | Each room's reported range for a 700–850 sq ft 2BHK, Medium its middle: main bedroom 130–160, second bedroom 110–130, living and dining 180–220, kitchen 60–80, bathrooms 30–35, balcony 40–60 sq ft. (Ideal size of a 2BHK flat: room-by-room carpet areas; Standard size of 1BHK to 4BHK flats) |
| 3 BHK | Living and dining 400–600; Main bedroom 180–250; Bedroom 2 150–200; Bedroom 3 150–200; Kitchen 120–180; Bathroom 1 (attached) 60–80; Bathroom 2 60–80; Bathroom 3 60–80 | 115 | 850–1200 | Each room's reported range for a 3BHK, Medium its middle: living 250–350 and dining 150–250, main bedroom 180–250, other bedrooms 150–200, kitchen 120–180, bathrooms 60–80, balconies 80–150 sq ft. Only the proportions are used: the rooms are scaled to your carpet area. (What is a 3 BHK: size, layout and rooms) |
| 4 BHK | Living and dining 400–600; Main bedroom 180–250; Bedroom 2 150–200; Bedroom 3 150–200; Bedroom 4 150–200; Kitchen 120–180; Bathroom 1 (attached) 60–80; Bathroom 2 60–80; Bathroom 3 60–80; Bathroom 4 60–80 | 115 | 1300–1700 | A 3BHK's ranges with one more bedroom and bathroom of the same size (our rule); the typical carpet area is as reported. (Standard size of 1BHK to 4BHK flats; What is a 3 BHK: size, layout and rooms; our rule) |
| 5 BHK | Living and dining 400–600; Main bedroom 180–250; Bedroom 2 150–200; Bedroom 3 150–200; Bedroom 4 150–200; Bedroom 5 150–200; Kitchen 120–180; Bathroom 1 (attached) 60–80; Bathroom 2 60–80; Bathroom 3 60–80; Bathroom 4 60–80; Bathroom 5 60–80 | 150 | — | A 4BHK's ranges with one more bedroom and bathroom (our rule). (our rule) |
| 1 RK | Room 150–210; Kitchenette 40–60; Bathroom 25–35 | none | — | No source gave a 1 RK's rooms, so the ranges are our own: a room of 150–210 sq ft, a kitchenette of 40–60 and a bathroom of 25–35, Medium the middle of each. (our rule) |

**A room's size by a word** (R1): Compact 0, Medium 0.5, Above medium 0.75, Spacious 1 of the way up the range. A room's size word puts it along the room's reported range: Compact at the bottom, Medium in the middle (the plan's own), Above medium three quarters of the way up, Spacious at the top. The rooms share the area left after the passage and the walls in proportion to these sizes, so a word sets a room's share of your area, and a room made larger takes its extra from the other rooms in proportion. A size you type is used as it is and moves no other room. (our rule)

**A room of your own size or level** (E3): a size you give a room replaces the planned one, its longer side the length, and the other rooms keep theirs; the page flags when the rooms no longer fit the carpet area. A room's own level stands above the section's slider and below an item of your own (A4), and moves only the sections with a slider: the structure, waterproofing and plumbing stay as they are.

**How the rooms are drawn and measured**

- **Bathrooms**: One bathroom for a 1 RK and a 1BHK; one for each bedroom from a 2BHK, the first attached to the main bedroom. Reported layouts give a 1BHK one toilet and a 2BHK two; one for each bedroom above that is our rule. Change the number if yours differs. (Standard size of 1BHK to 4BHK flats; our rule)
- **Passage and foyer**: 10% of the carpet area. The passage and foyer: about a tenth of a flat's carpet area, from the gap between the rooms' reported sizes and the flats' reported carpet areas. (our rule)
- **Internal walls**: 5% of the carpet area. RERA carpet area includes the internal partition walls; 115 mm walls take about a twentieth of it. (our rule)
- **Proportions**: length ÷ breadth: living 1.3, bedroom 1.2, kitchen 1.25, bathroom 1.6, passage 3, balcony 3. Length ÷ breadth of usual rooms: a 10 × 12 ft bedroom, a 14 × 18 ft living room, an 8 × 10 ft kitchen, a 5 × 8 ft bathroom; passages and balconies are long and narrow. (our rule)
- **Ceiling height**: 2.9 m. The Code's minimum for a habitable room is 2.75 m and flats are usually built higher, so 2.9 m (9 ft 6 in) until you change it. (our rule; NBC 2016 thumb rules: ceiling 2.75 m, room sizes)
- **The Code's minimums**: habitable room 9.5 sq m, kitchen 5 sq m, bath and WC 2.8 sq m. National Building Code 2016, Part 3, as reported: a habitable room 9.5 sq m, a kitchen 5.0 sq m, a combined bath and WC 2.8 sq m. A room below its minimum is flagged, never changed. (NBC 2016 thumb rules: ceiling 2.75 m, room sizes; Bathroom regulations in India: NBC 2016 and bye-laws)
- **Opening: main door**: 1000 × 2100 mm. The main door at least 1000 mm wide, 2100 mm high (NBC 2016, as reported). (Door size standards in India by room, NBC 2016 widths)
- **Opening: bedroom door**: 900 × 2100 mm. A bedroom door 900 mm wide. (Door size standards in India by room, NBC 2016 widths)
- **Opening: bath door**: 750 × 2100 mm. A bathroom door 750 mm wide (700 mm the minimum). (Door size standards in India by room, NBC 2016 widths)
- **Opening: kitchen door**: 900 × 2100 mm. A kitchen opening 800–900 mm wide; many new flats leave it without a shutter, so no door is priced. (Door size standards in India by room, NBC 2016 widths)
- **Opening: balcony door**: 1500 × 2100 mm. A two-panel sliding door from the living room to the balcony. (our rule)
- **Opening: window**: 1219 × 1219 mm, sill 750 mm. A 4 × 4 ft window in a bedroom or the living room, its sill 750 mm above the floor. (Standard door and window sizes in India; Standard window size for a house in India)
- **Opening: kitchen window**: 1219 × 914 mm, sill 1050 mm. A 4 × 3 ft kitchen window, its sill 1050 mm above the floor. (Standard door and window sizes in India)
- **Opening: ventilator**: 610 × 457 mm, sill 1500 mm. A 2 × 1.5 ft bathroom ventilator, its sill 1500 mm above the floor; the exhaust fan meets the Code's ventilation rule. (Standard door and window sizes in India)
- **Windows**: at least 10% of a habitable room's floor. Windows in a habitable room at least a tenth of its floor area (NBC 2016 Part 3 and Part 8, as reported): enough 4 × 4 ft windows are given to meet it. (Window size standards and the NBC 10 per cent rule; Minimum window area in a habitable room)
- **IS 1200 deductions**: none up to 0.5 sq m; one face up to 3 sq m; both faces and the reveals above. IS 1200, as reported: an opening up to 0.5 sq m is not deducted; one of 0.5 to 3 sq m is deducted from one face only; one over 3 sq m is deducted from both faces and its reveals are added. We deduct the one face inside the room the door or window belongs to (a bathroom's door from the bathroom, a bedroom's door from the bedroom). (IS 1200 deductions for openings in plaster and paint: none up to 0.5 sq m, one face from 0.5 to 3 sq m, both faces and reveals above 3 sq m)
- **Skirting**: 100 mm high. Skirting 100 mm high, of the floor's own tiles or stone, measured with the floor along the walls less the doorways. (our rule)
- **Bathroom wall tiles**: Basic 2133.6 mm, Standard 2438.4 mm, Premium to the ceiling, Luxury to the ceiling, Bespoke to the ceiling. Bathroom wall tiles to 7 ft at Basic, 8 ft at Standard, to the ceiling above (a builder's package ladder). When the bathrooms are not being redone, existing tiles are taken to 7 ft. (Indecimal: comparison of house-building packages (bathroom wall tile allowances))
- **Waterproofing**: 300 mm up the walls; the shower 1.5 m wide to 1.8 m; a balcony 150 mm. The bathroom floor, 300 mm up every wall, and the shower walls 1.5 m wide to 1.8 m high (Dr. Fixit's wet-area guidance, as reported); a balcony floor with a 150 mm upturn (our rule). (Dr. Fixit Bathseal: wet-area waterproofing heights; our rule)
- **Shower glass**: 1.5 × 2 m. One glass screen across the 1.5 m shower zone, 2.0 m high. (our rule)
- **Kitchen**: an L-shaped counter 600 mm deep; tiles 600 mm above it. An L-shaped counter along two walls, 600 mm deep (24 in, as reported), so its run is the kitchen's length plus its breadth less one depth; base and wall units run the same length; tiles 600 mm high between the counter and the wall units (our rule). Reported L-kitchens run 8–12 ft on the long side and 4–8 ft on the short. (Standard modular kitchen dimensions; Standard modular kitchen sizes in India; our rule)
- **Wardrobes and storage**: main bedroom 2438.4 mm wide, others 1828.8 mm; 2133.6 mm high with a 609.6 mm loft, floor to ceiling from Luxury. An 8 ft wardrobe in the main bedroom and 6 ft in the others, never wider than the longer wall less 2 ft; 7 ft high with a 2 ft loft up to Premium, floor to ceiling from Luxury. A TV unit 6 × 2.5 ft and a shoe rack 4 × 3 ft from Standard, a crockery unit 4 × 7 ft from Premium (our rule; reported wardrobes are 7–8 ft high and 6–12 ft wide with 450–750 mm lofts). (Standard wardrobe sizes; our rule)
- **False ceiling**: Basic: none; Standard: a 0.6 m border in living, master; Premium: the whole ceiling in living, bedroom; Luxury: the whole ceiling in living, bedroom, passage; Bespoke: the whole ceiling in living, bedroom, passage. No false ceiling at Basic; a 600 mm border with a cove in the living room and main bedroom at Standard; the whole ceiling of the living room and bedrooms at Premium, and of the passage too above that. The cove runs 600 mm in from the walls. (our rule)
- **Feature wall**: the living room from Luxury, the main bedroom from Bespoke. A feature wall from Luxury: the living room's longer wall; at Bespoke also the wall behind the main bed (the bedroom's shorter wall). (our rule)
- **Electrical points**: living: lights 3, fans 2, sockets 3, ac 1, tv 1; bedroom: lights 2, fans 1, sockets 2, ac 1, main bedroom +1; kitchen: lights 1, exhaust 1, sockets 3, power 2; bathroom: lights 1, exhaust 1, power 1; passage: lights 2; balcony: lights 1, sockets 1. Our rule for each room, set so that a 2BHK comes to about 40 points and a 3BHK to about 50, inside the 32–42 and 45–58 points reported for them. A point is one light, fan, socket or power outlet with its wiring and switch. (our rule; Goldmedal: electrical points in a 2BHK or 3BHK; Room-by-room guide to sockets in India; IS 4648:1968, guide for electrical layout in residential buildings)
- **Plumbing points**: bathroom: 5 water, 3 drainage; kitchen: 3 water, 2 drainage; balcony: 0 water, 1 drainage. A bathroom: water to the WC, the basin, the mixer (hot and cold) and the health faucet; drains from the WC, the basin and a floor trap. A kitchen: water to the sink, the purifier and the washing machine; drains from the sink and the washing machine. A balcony: one floor trap. (our rule)
- **Air conditioners**: from Premium in the living room and main bedroom, from Luxury in every bedroom. Split ACs in the living room and main bedroom from Premium, and in every bedroom from Luxury, when Appliances is on. (our rule)
- **Debris**: one lot per bathroom and per 500 sq ft of floor taken up. One lot (a tempo load to an approved dump) for each bathroom stripped, and one for each 500 sq ft of floor taken up, rounded up. (our rule)
- **Making good**: 10% of the walls. Making good the plaster after chasing walls for new pipes and wiring: a tenth of the walls. (our rule)
- **Cities**: Bengaluru Rs. 1,900–3,000 a sq ft; Chennai Rs. 1,800–2,700 a sq ft; Delhi NCR Rs. 1,900–3,000 a sq ft; Hyderabad Rs. 1,700–2,700 a sq ft; Mumbai Rs. 2,200–3,500 a sq ft; Pune Rs. 1,800–2,900 a sq ft. The middle of each city's reported construction cost per sq ft, against the average of the six cities' middles. It scales labour and rates that include labour, not the price of a product, which is the same across India. A place not in the list uses the rates as they are, and the page says so. (Home construction cost calculator India: 2026 city rates; India construction cost index 2026: city and material prices)
- **GST**: 18%. A rate quoted before GST has 18% added; every other rate is taken as the price paid, as its source quotes it. (GST Council cuts rates on housing materials (September 2025); GST 2.0 guide for home construction; WoodenMax: glass shower partition price per sq ft, 2026 (GST extra))
- **Check**: paint 2.5–3.5 × the carpet area. Walls and ceilings to paint usually come to 2.5–3.5 times the carpet area; outside that, check the room sizes. (our rule)

**A new house** (D-UX-23, E5): the outline from the built-up area and the floors, the rooms from what is left, the structure by rules of thumb; the plot round it, the outside works, the water, and the stages a construction loan pays by

- **Outline**: each floor 1.25 times as long as it is wide, the outer walls 230 mm. A new house's outline about 1.25 times as long as it is wide, as on a 30 × 40 ft plot after its setbacks; its outer walls one brick (230 mm) thick, as for the reveals. (our rule)
- **Floor to floor**: the ceiling height plus a 150 mm slab. Each floor's slab 150 mm thick, usual for a house's spans, so a floor is the ceiling height plus 150 mm. (our rule)
- **Parapet**: 1 m, painted on both faces. A 1.0 m parapet round the terrace, painted on both faces; minimums of 1.0 to 1.2 m are reported. (our rule; Jivial Railings: parapet railing design for terraces in India, heights)
- **Terrace**: waterproofed inside the parapet and 300 mm up it. The terrace's waterproofing turned 300 mm up the parapet, as up a bathroom's walls. (our rule)
- **Stairs**: a 2.5 × 4.5 m well on each floor, the top one rising to the terrace; two flights 1.1 m wide of 8 treads, 2.2 m along; a 1.2 m landing; 0.3 m between the flights. A dog-legged stair in a 2.5 × 4.5 m well on each floor, the top one rising to the terrace: two flights 1.1 m wide, each of 8 treads of 275 mm (2.2 m), a 1.2 m landing and 0.3 m between the flights (InfraLens's worked example, as reported); the Code's limits for a house are a 190 mm riser and a 250 mm tread (as reported). Its railing runs along both flights and the landing's edge; its treads, risers and landings take the stairs' finish, and the walls of its well are painted from the ground floor to the cabin's roof. (InfraLens: staircase design (IS 456, NBC 2016), a dog-legged stair in a 2.5 × 4.5 m well; NBC 2016 thumb rules: ceiling 2.75 m, room sizes)
- **Stair cabin**: on the well's outline, 2.7 m high, its area added to the structure's. A cabin (mumty) over the stair to the terrace, on the stair well's outline and 2.7 m high: room for 2.1 m of headroom over the top step and its slab, under the 3 m that bye-laws such as Delhi's allow outside the FAR (as reported). Its area is added to the structure's rules of thumb, its walls are painted inside and out, its door is a WPC door that stands the rain, and its roof is waterproofed in place of the terrace under it; the overhead tank stands on it. (Studio Matrx: building by-laws and the roof, the mumty (stair cabin) over the stair; Delhi's bye-laws allow one up to 3 m high outside the FAR; InfraLens: staircase design (IS 456, NBC 2016), a dog-legged stair in a 2.5 × 4.5 m well)
- **Structure**: for each sq ft of built-up area and of the stair cabin: 0.4 bags of cement, 3.5 kg of steel, 1.4 cft of sand, 1.75 cft of aggregate, 9 bricks. The middle of Brick&Bolt's rules of thumb for an RCC house, for each sq ft of built-up area: cement 0.35–0.45 bags, steel 3–4 kg, sand 1.2–1.6 cft, aggregate 1.5–2 cft and 8–10 bricks (as reported), for the foundation, the frame, the slabs, the walls and the plaster. InfraLens reports 15–25% more steel in seismic zones IV and V. A structural engineer's design and quantities replace them. (Brick&Bolt: construction material quantity estimation for a 1000 sq ft house (rules of thumb a sq ft, wastage); InfraLens: cement, sand and steel for a 1000 sq ft house (more steel in seismic zones IV and V))
- **Plot**: the outline with 3 m in front, 1.5 m behind and 1 m on each side, until you type your plot's size. The plot is the house's outline with margins round it: 3 m in front for the gate and a car, 1.5 m behind and 1 m on each side, within the setbacks reported for a 30 × 40 ft plot (front 1.5–3 m, rear 1–1.5 m, sides 0.5–1.5 m). Cities differ, and Bengaluru's 2026 rules allow less for small plots, so type your plot's size if you know it. (TalkingLands: building setback rules in India (2026), a 30 × 40 ft plot's front 1.5–3 m, rear 1–1.5 m, sides 0.5–1.5 m)
- **Outside works**: a compound wall 1.5 m high round the plot less a 3 m gate 1.5 m high, painted on both faces; the open ground round the house paved. A brick compound wall about 1.5 m (5 ft) high round all four sides of the plot, painted on both faces, less a gate 3.0 m (10 ft) wide and 1.5 m high for a car: HouseYog's wall rates are for walls 4.5–6 ft high, and Civil Sir gives a car's gate 10–12 ft by 5–6 ft. All the open ground round the house is paved. (HouseYog: boundary wall construction cost in India (2026), a 4.5-inch brick wall Rs. 800–1,100 and a 9-inch Rs. 1,200–1,500 a running foot, with excavation, footing, plinth beam, brickwork and plaster; Civil Sir: standard size of a main gate in India, 10–12 ft wide and 5–6 ft high for a car)
- **Household**: 1BHK 3, 2BHK 4, 3BHK 5, 4BHK 6, 5BHK 7, 1 RK 2 people, 135 litres a day each. A household of the bedrooms and two more (a 3BHK five), within the households HouseYog gives for each BHK (a 1BHK 2–4 people, a 2BHK 4–6, a 3BHK 5–8), each using 135 litres a day (NBC 2016 Part 9, as reported). (InfraLens: NBC 2016 Part 9, 135 litres a person a day; an underground tank of a day's demand, an overhead tank of a third to a half; HouseYog: septic tank construction cost in India (2026), 1BHK 4,000–5,000 litres Rs. 50,000–70,000; 2BHK 5,000–6,500 litres Rs. 60,000–85,000; 3BHK 6,500–8,000 litres Rs. 75,000–1,10,000; 4BHK 8,000–10,000 litres Rs. 1,00,000–1,40,000, with the soak pit)
- **Sump**: 3 days' water, rounded up to the next 1,000 litres. A sump of three days' water, as Brick&Bolt recommends, rounded up to the next 1,000 litres; many houses build more, to take a whole tanker. (Brick&Bolt: sump size for homes, 135 litres a person a day and three days' storage)
- **Overhead tank**: a day's water, the next size of 500, 750, 1,000, 1,500, 2,000, 3,000, 5,000 litres. An overhead tank of a day's water, the next size sold above it (Sintex: a family of four uses 540 litres a day and takes a 750-litre tank); NBC 2016 asks a third to a half of a day where a pump fills it (as reported). (Sintex: choosing a water tank by the family, 135 litres a person a day; a family of four needs 540 litres and a 750-litre tank; InfraLens: NBC 2016 Part 9, 135 litres a person a day; an underground tank of a day's demand, an overhead tank of a third to a half)
- **Septic tank**: 1BHK 4,500, 2BHK 5,750, 3BHK 7,250, 4BHK 9,000, 5BHK 10,000, 1 RK 4,000 litres, with a soak pit; the sewer connection in its place where the sewer reaches the plot. The middle of HouseYog's tank for each BHK (a 1BHK 4,000–5,000 litres, a 2BHK 5,000–6,500, a 3BHK 6,500–8,000, a 4BHK 8,000–10,000), with a soak pit; a 1 RK takes 4,000 litres and a 5BHK 10,000, the ends of those ranges. Where the city's sewer reaches the plot, a sewer connection takes the tank's place. (HouseYog: septic tank construction cost in India (2026), 1BHK 4,000–5,000 litres Rs. 50,000–70,000; 2BHK 5,000–6,500 litres Rs. 60,000–85,000; 3BHK 6,500–8,000 litres Rs. 75,000–1,10,000; 4BHK 8,000–10,000 litres Rs. 1,00,000–1,40,000, with the soak pit)
- **Rainwater harvesting**: one recharge pit with a filter. One recharge pit with a mesh filter, fed by the roof's downpipes, as HouseYog prices for a small house. Many cities require rainwater harvesting on a new house, and some size it by the roof. (HouseYog: rainwater harvesting cost in India (2025), a recharge pit Rs. 8,000–15,000, a mesh filter Rs. 2,000–5,000, pipes Rs. 2,000–10,000, labour Rs. 8,000–15,000)
- **Stages**: the structure 23.81% to the foundation and plinth, 42.86% to the frame and slabs (alike for each floor), 33.33% to the walls and plaster; the finishing, the outside works and water, and any movable items from the estimate's own lines. The structure is split by stage as Brick&Bolt splits a house's cost: foundation and plinth 10–15%, the RCC frame and slabs 20–25%, brickwork and plaster 15–20%. Taken over the three, the middles give 23.81%, 42.86% and 33.33% of the structure; Design Built's breakdown is much the same (the RCC frame 24–26%, brickwork 10–11%, plaster 6–7%). The frame and slabs are alike for each floor. The finishes, the outside works and the water come from the estimate's own lines, so a higher level moves only the later stages. (Brick&Bolt: house construction cost breakdown, foundation and plinth 10–15%, RCC structure 20–25%, brickwork and plastering 15–20% of the cost; Design Built Studio: 1,000 sq ft house construction cost breakdown (2026), foundation 12–15%, RCC structure 24–26%, brickwork 10–11%, plastering 6–7% of the cost)

**What each room gets** (the library's family, its section, and how it is measured)

- **The whole flat or house**: protection (civil and repairs, by protect); cleaning (civil and repairs, by carpet); debris (civil and repairs, by debris, renovate only); making-good (civil and repairs, by making-good, renovate only); db (electrical and lights, by one, renovate and build only); anti-termite (structure, by plinth, build only); cement (structure, by struct:cement, build only); steel (structure, by struct:steel, build only); sand (structure, by struct:sand, build only); coarse-aggregate (structure, by struct:aggregate, build only); brick (structure, by struct:bricks, build only); labour-foundation (structure, by built-up, build only); labour-rcc (structure, by built-up, build only); labour-masonry (structure, by built-up, build only); labour-plaster (structure, by built-up, build only); roof-waterproofing (terrace, exterior and stairs, by terrace, build only); exterior-paint (terrace, exterior and stairs, by exterior-walls, build only); Stair railing (terrace, exterior and stairs, by stair-railing, build only); Stairs' finish (terrace, exterior and stairs, by stair-finish, build only); Stair well and cabin walls, paint (terrace, exterior and stairs, by stair-walls, build only); Door to the terrace (terrace, exterior and stairs, by terrace-door, build only); compound-wall (outside works, by compound-wall, build only); Compound wall paint (outside works, by compound-paint, build only); gate (outside works, by gate, build only); paving (outside works, by paving, build only); sump (water, by sump, build only); overhead-tank (water, by tank, build only); septic (water, by septic, build only); sewer (water, by sewer, build only); rwh (water, by rwh, build only); video-door-phone (smart home and security, by one); cctv (smart home and security, by one).
- **Each living**: demolish-floor (civil and repairs, by floor, renovate only); floor (flooring, by floor-skirting); paint (walls and paint, by paint); feature-wall (walls and paint, by feature); false-ceiling (ceiling, by false-ceiling); cove (ceiling, by cove); wiring (electrical and lights, by points, renovate and build only); lights (electrical and lights, by light-points); fans (electrical and lights, by fan-points); chandelier (electrical and lights, by one); TV unit (wardrobes and storage, by unit:tv); Crockery unit (wardrobes and storage, by unit:crockery); windows (doors and windows, by windows); mesh (doors and windows, by windows); smart-switch (smart home and security, by light-points); ac (appliances, by ac); sofa (furniture, by one); dining (furniture, by one); curtains (soft furnishings, by window-count).
- **Each bedroom**: demolish-floor (civil and repairs, by floor, renovate only); floor (flooring, by floor-skirting); paint (walls and paint, by paint); feature-wall (walls and paint, by feature); false-ceiling (ceiling, by false-ceiling); cove (ceiling, by cove); wiring (electrical and lights, by points, renovate and build only); lights (electrical and lights, by light-points); fans (electrical and lights, by fan-points); wardrobe (wardrobes and storage, by wardrobe); loft (wardrobes and storage, by loft); room-door (doors and windows, by door); windows (doors and windows, by windows); mesh (doors and windows, by windows); smart-switch (smart home and security, by light-points); ac (appliances, by ac); bed (furniture, by one); mattress (furniture, by one); curtains (soft furnishings, by window-count).
- **Each kitchen**: demolish-floor (civil and repairs, by floor, renovate only); floor (flooring, by floor-skirting); paint (walls and paint, by paint); cabinets (kitchen, by counter-run); counter (kitchen, by counter-top); Tiles between the counter and the wall units (kitchen, by dado); sink (kitchen, by one); sink-mixer (kitchen, by one); hardware-upgrade (kitchen, by one); wiring (electrical and lights, by points, renovate and build only); lights (electrical and lights, by light-points); exhaust (electrical and lights, by exhaust-points); supply-point (plumbing, by supply-points); drain-point (plumbing, by drain-points); windows (doors and windows, by windows); mesh (doors and windows, by windows); chimney (appliances, by one); hob (appliances, by one); oven (appliances, by one); dishwasher (appliances, by one); purifier (appliances, by one).
- **Each bathroom**: demolish-bath (civil and repairs, by one, renovate only); waterproofing (waterproofing, by wp-bath); Floor tiles, anti-skid (bathrooms, by floor); Wall tiles (bathrooms, by bath-tiles); sanitary (bathrooms, by one); cp (bathrooms, by one); shower-screen (bathrooms, by shower-screen); vanity (bathrooms, by one); mirror (bathrooms, by one); accessories (bathrooms, by one); bath-ceiling (bathrooms, by floor); geyser (bathrooms, by one); paint (walls and paint, by paint); wiring (electrical and lights, by points, renovate and build only); lights (electrical and lights, by light-points); exhaust (electrical and lights, by exhaust-points); supply-point (plumbing, by supply-points); drain-point (plumbing, by drain-points); bath-door (doors and windows, by door).
- **Each passage**: demolish-floor (civil and repairs, by floor, renovate only); floor (flooring, by floor-skirting); paint (walls and paint, by paint); false-ceiling (ceiling, by false-ceiling); cove (ceiling, by cove); wiring (electrical and lights, by points, renovate and build only); lights (electrical and lights, by light-points); Shoe rack (wardrobes and storage, by unit:shoes); main-door (doors and windows, by main-door); smart-lock (doors and windows, by main-door); smart-switch (smart home and security, by light-points).
- **Each balcony**: demolish-floor (civil and repairs, by floor, renovate only); waterproofing (waterproofing, by wp-balcony); Floor tiles, anti-skid (flooring, by floor-skirting); wiring (electrical and lights, by points, renovate and build only); lights (electrical and lights, by light-points); drain-point (plumbing, by drain-points).

The library of materials, finishes and fittings, with every rate and its source, is in `docs/LIBRARY.md`.
