# The estimate tool: blueprint and research

02-10-2026. A proposal for the owner to decide on; nothing in it is built yet. It grows the estimate at `/estimate/` (D-UX-13) rather than replacing it. Recorded as D-UX-16.

**Asked, in the owner's words:** "what to include in the construction estimate, what fields to include in the home repair and renovation estimate, what to include in the home improve or enrich estimate, how to calculate the estimate various costs, carpet area, built-up area etc., what to ask from the user as input data (most high value items of information that satisfies answers to various questions down the line) … a detailed blueprint for a estimate creation tool … structured so that a layperson can use it and a professional can also use it."

**How it was made.** About 50 public sources, listed in B8:
- regulators and standards;
- banks, housing finance companies and NBFCs;
- industry guides;
- forums: Quora, the NoBroker forum, RenoTalk, owner-builder forums, Scribd and renovation-estimate guides.

All of it was read through search results on 02-10-2026. The pages themselves could not be opened from the session, so every figure in Part B is "as reported" until it is checked against its primary text (B9). Reddit could not be searched, because it is closed to the search tool.

The owner also downloaded three documents from the internet, each said to have been accepted by a lender. They were read for their structure only (B2). No name, address, account number or figure from them is kept here, and the files are not in the repo.

**Decide first:** A14, five choices, each with a recommendation.

**Contents**
- Part A, the blueprint:
  - A1 who it is for;
  - A2 four kinds of work;
  - A3 the default path;
  - A4 More options;
  - A5 the professional page;
  - A6 which input answers which later question;
  - A7 areas;
  - A8 the method;
  - A9 heads and items;
  - A10 checks;
  - A11 the documents;
  - A12 data and engine;
  - A13 build order;
  - A14 decisions for the owner.
- Part B, the research:
  - B1 lenders;
  - B2 the three sample documents;
  - B3 areas and measurement;
  - B4 how estimates are made;
  - B5 taxes, cess and fees;
  - B6 interiors, societies and permissions;
  - B7 forums;
  - B8 sources;
  - B9 what could not be reached and what to verify.

---

## Part A: the blueprint

### A1. Who it is for, and the contract

**Who types:**
- **A layperson:** the owner of a house or flat, on a phone, with a contractor's or interior firm's quotation in hand (or none yet).
- **A professional:** a contractor, an interior firm, an architect, a civil engineer or a DSA, preparing the estimate for a client on a desktop.

**Who reads it at the other end:** the lender's officer, and the panel valuer or engineer who vets the cost (B2).

**Inputs on the default path:**
- what the work is;
- how big the house is;
- the items;
- whether GST is in the rates;
- who gave the rates, and when.

At download, the owner's name and the address of the property where the work is done.

**Outputs:**
- **On the page, results first:**
  - the total cost;
  - the cost per sq ft, naming the area used;
  - the part lenders usually finance and the part they may not;
  - what the lender will ask for that is still missing.
- **To take away:** the estimate as a PDF (for the lender), an Excel copy (for the accountant) and a Word copy (to put on a letterhead and sign). All three come from one document, as for the DSCR statement (`lender-documents`).

**The standing tradeoff** is a professional's completeness against a layperson's speed. It is settled as on the DSCR page (D-UX-10, D-UX-12, D-UX-15):
- the default path is a ceiling of eight fields;
- everything else sits in one closed More options;
- the professional's full form sits behind a visible link.

### A2. Four kinds of work

| On screen | What it covers | Usual loan (B1) | Area for the cost per sq ft | What the lender asks for besides the estimate |
|---|---|---|---|---|
| Build a house | A new house on the owner's plot | Home construction loan, paid in stages | Built-up (plinth) area of all floors | Title of the plot, the approved plan, an estimate signed by an architect or civil engineer |
| Add a floor or rooms | An extension of an existing house | Home extension loan, paid in stages | Built-up area being added | The approved plan for the extension; the existing structure's soundness for a new floor |
| Repair or renovate | Civil repairs, waterproofing, flooring, doors and windows, kitchen, toilets, plumbing, electrical, painting | Home improvement or renovation loan | Carpet area | An estimate or quotation; the society's permission for a flat; an engineer's certificate if walls, beams or balconies change |
| Interiors and furnishing | False ceiling, fixed carpentry (wardrobes, modular kitchen, TV unit), lighting, loose furniture, appliances, soft furnishings, upgrades (solar, automation) | Home improvement loan; some banks' furnishing schemes; a top-up or personal loan for movable items | Carpet area | A quotation, and the fixed and movable items told apart |

Jobs mix: the sample renovation quotation combined civil work and interiors (B2). So the kind sets the document's title and the starting heads, but an item may go under any head of renovation or of interiors.

### A3. The default path (a layperson on a phone)

**Five questions on the page, in plain words:**

1. **What is the work?** Four buttons, as in A2.
2. **How big is the house?** The label follows the kind:
   - for building: "Built-up area of all floors";
   - for an extension: "Built-up area being added";
   - for repairs and interiors: "Carpet area, as in your agreement".

   A sq ft / sq m switch goes with it (A7).
3. **What is in the quotation?** Item rows: what it is, the quantity, the unit and the rate, or the amount alone for a lump sum. Buttons add a row with the right head and unit:
   - Painting, Flooring, False ceiling, Wardrobe, Kitchen;
   - Electrical points, Plumbing, Doors, Windows, Waterproofing;
   - Civil repairs, Furniture, Appliances, Other.

   A lump sum is kept as 1 LS × the amount, so the engine is unchanged.
4. **Is GST in these rates?** Included, Extra at __%, or Not charged.
5. **Who gave these rates, and when?** For example "Contractor's quotation of 25-09-2026".

**At download, as now:**

6. The owner's name, as on the property papers.
7. The address of the property where the work is done, "not where you live now". The sample quotation went to the client's present home; the vetting was of the flat being renovated (B2).

**Results come first:**
- the total cost;
- the cost per sq ft "of carpet area" or "of built-up area";
- when there are movable items or appliances: "Lenders usually finance Rs. X; they may not finance Rs. Y (loose furniture, appliances)";
- "Before you go to the lender": what is missing (A10).

The count is four questions plus one item row of four fields, which is eight. The two download fields come only at download. Contingency moves to More options. The site check asserts the count (brief-first §4).

### A4. More options: one closed section, five groups

1. **Property and permissions:**
   - the plot area and the number of floors;
   - the approved plan's number and date (building and extensions);
   - the society's permission: obtained, to apply for, or not a society;
   - "Does the work change walls, columns, beams, slabs or a balcony?"
2. **Contractor and terms:**
   - the firm's address, phone, GSTIN and PAN;
   - the quotation number and the date it is valid till;
   - the time to finish;
   - the payment stages, as a % or an amount;
   - what is not included;
   - the bank account for payment, when the lender pays the contractor directly. The sample quotation carried its bank details for this (B2).
3. **Other costs:**
   - contingency, none or __%;
   - the architect's or engineer's fee;
   - approvals and fees;
   - the labour welfare cess, when it applies (B5);
   - connections for electricity, water and drainage.

   It also carries the "often forgotten" list for the kind (A9). Each line ticked asks an amount, or can be marked "not needed".
4. **Loan:**
   - your share, as a margin % you choose (lenders ask 10% to 25%, B1);
   - the loan it leaves;
   - with a rate and a term, the EMI from the existing EMI engine.

   This stays on the page, never in the lender's document.
5. **Measure the rooms:**
   - each room's length, breadth and height, with its doors and windows;
   - the floor, wall and ceiling areas worked out by the IS 1200 rules (A7);
   - an item can take its quantity from a room, and the quantities are checked against the rooms.

Two extras on each item also live here:
- the room (Living room, Bedroom 1, Kitchen, First floor);
- the kind of item: fixed, movable or appliance. The head suggests it and the user can change it.

### A5. The professional page (behind "Preparing estimates for clients? Use the full form")

- **An item grid:**
  - the item number;
  - a schedule-of-rates reference (such as a DSR item) or "market";
  - the description with its specification (make, grade, thickness);
  - the room or floor;
  - the quantity, from a measurement sheet (L × B × H × number, less deductions);
  - the unit and the rate;
  - the rate's basis;
  - the GST rate of the item;
  - fixed, movable or appliance;
  - paid to: the contractor, a supplier, or bought by the owner.
- **Rate analysis, optional:** materials + labour + tools and sundries, then water charges of 1% and the contractor's profit and overheads of 15%, which is the CPWD convention (B4).
- **The abstract by head or by room**, over several floors or blocks.
- **Additions:**
  - profit and overheads, when the rates are cost rates;
  - escalation a year, for long jobs;
  - contingency, fees and statutory costs.
- **A stage-wise schedule for building:** foundation, plinth, each slab, masonry and plaster, finishing. The % are set per lender and the amounts are worked out.
- **A signature block:**
  - name and qualification;
  - registration number (COA for an architect; the chartered-engineer or registered-valuer number);
  - firm and date.
- **Paste rows from Excel** (description, quantity, unit, rate).
- **Save the estimate as a file to reuse** for the next client. It stays in the browser, with no server.

### A6. Which input answers which later question

This is the owner's "high value items of information". Each input is asked once and answers the questions that come later.

| Input | Answers (who asks) | Where |
|---|---|---|
| Kind of work | Which loan; which heads; which area; the document's title (lender) | Default |
| Carpet or built-up area | The cost per sq ft (valuer); quantity checks; flooring and ceiling plausibility | Default |
| Items: quantity × rate, or a lump sum | The total; the summary by head the valuer certifies (B2) | Default |
| GST | The cost actually paid; whether a GSTIN is needed | Default |
| Who gave the rates, and when | "Basis of rates" (valuer); how fresh the quote is | Default |
| Owner's name | Must match the property papers (lender, valuer) | Download |
| Site address | The property the loan is against; the valuer's visit | Download |
| Plot area, floors | Built-up area against the plot; local FSI rules (flagged, not checked) | More options |
| Approved plan number and date | The lender's must-have for building and extensions | More options |
| Society permission; structural change | The society's permission for a flat; the engineer's certificate; municipal approval for a balcony enclosure (B6) | More options |
| Contractor's GSTIN, PAN, address | The GST check; paying the contractor directly | More options |
| Quotation number, valid till, time to finish | The vetting date; escalation; the stage plan | More options |
| Payment stages | When each part of the loan is paid out (B1) | More options |
| What is not included | Disputes and the complete cost (B2, B7) | More options |
| Bank account for payment | Direct payment by the lender | More options |
| Contingency, fees, approvals, cess, connections | The complete cost (often forgotten, B7) | More options |
| Margin %, rate, term | The loan, your share, the EMI | More options |
| Rooms and openings | Quantities and their checks | More options |
| Fixed, movable or appliance | What lenders finance (B1) | More options; set from the head |
| Schedule-of-rates references, specifications, rate analysis, measurement sheets, signature details | A professional's estimate that a valuer can vet line by line | Professional page |

**Not asked:** material quantities (cement bags, steel kg), labour, brands as separate fields (they go in the description), the property's market value (the valuer's job), and the contractor's experience. These matter little to the lender's estimate, or can be worked out from the rest.

### A7. Areas: what each means, which to use, how to work it out

| Area | What it is | Use it for |
|---|---|---|
| Carpet area (RERA, section 2(k)) | The net usable floor area of a flat, including internal partition walls, excluding external walls, service shafts, an exclusive balcony or verandah and an exclusive open terrace. It is printed in every RERA agreement for sale. | Repairs, renovation and interiors of a flat; flooring, ceiling and painting checks |
| Plinth or built-up area (IS 3861:2002) | The covered area at floor level including walls, shafts, staircases and lift wells. A covered balcony or verandah counts in full and an uncovered one at 50% (as reported). Lengths are taken to 0.01 m and areas to 0.01 sq m. | Building and extensions; plinth-area rates are per sq m of this area |
| Super built-up (saleable) area | Built-up area plus a share of the common areas (the "loading") | Not used in an estimate; developers quote it |
| Plot area and FSI | Local rules cap the total built-up area at plot × FSI and limit the ground coverage | Flag only: the rules are local and change |

**Working the areas out:**
- **Carpet area from the rooms:** the sum of each room's internal length × breadth, plus the internal partition walls' footprint.
- **Built-up area:** the carpet area plus the footprint of the external walls and shafts, plus balconies by the IS 3861 rule.

Reported ratios are given below. They are for planning only and never go in a document:
- built-up ≈ carpet × 1.10 to 1.25;
- super built-up ≈ carpet × 1.25 to 1.35 in most cities, and up to 1.50 in Mumbai (B3).

**Conversions:**
- 1 ft = 0.3048 m exactly, so 1 sq m = 10.7639 sq ft and 1 cum = 35.3147 cft;
- 1 sq yd = 9 sq ft;
- 1 guntha = 1,089 sq ft;
- 1 cent = 435.6 sq ft;
- 1 acre = 43,560 sq ft;
- a bigha differs by state, so it is not converted.

**Quantities from the rooms:**
- **Floor:** L × B.
- **Ceiling:** L × B. A false ceiling's cove or border is a running length.
- **Walls**, for plaster or paint: 2 × (L + B) × H, less openings by the IS 1200 rules:
  - an opening up to 0.5 sq m is not deducted;
  - one of 0.5 to 3 sq m is deducted from one face, when both faces get the same finish;
  - one over 3 sq m is deducted from both faces, and its reveals (jambs, sill, soffit) are added.
- **Skirting:** the perimeter less the door widths, in running length.
- **Wall tiles:** the perimeter × the tile height, less openings.
- **A check, not a rule:** walls plus ceiling for paint come to about 2.5 to 3.5 × the carpet area (B3).
- **Joinery:** doors and windows by number and size; carpentry by the face area of its shutters (sq ft), a kitchen by running length or as a set, electrical work by points.

### A8. How the figures are worked out

1. **Each item:** quantity × rate, or the lump sum.
2. **Each head:** the sum of its items. A **head total is always shown**; the sample quotation left its subtotal rows blank (B2).
3. **Total of the works:** the sum of the heads.
4. **GST:** if the rates leave it out, it is added at the rate given on the works, or at each item's rate on the professional page.
5. **Contingency:** at the % chosen, on the works with GST, as now.
6. **Other costs:** fees, approvals, cess and connections, as entered. A fee may be a % of the works.
7. **Total estimated cost:** 3 + 4 + 5 + 6.
8. **Cost per sq ft:** the total ÷ the area, naming the area (carpet or built-up).
9. **The split:**
   - fixed items and their share of GST and contingency, set against movable items and appliances with theirs, the shares pro rata to the item amounts;
   - other costs shown on their own line ("lenders decide").
10. **The loan:** the part lenders usually finance × (1 − margin). Your share is the total less the loan. These are on the page only.
11. **The stages:** the total × each stage's %. The %s must add up to 100.
12. **In words:** the total in Indian words (lakh, crore), as valuers write it (B2).

Every figure is worked out twice (`estimate-check.ts`), and the figures are withheld when the two disagree, as now. The exact values are rounded once, for display.

### A9. Heads and items for each kind

**Build a house** keeps today's heads (`engine/data/estimate.json`) and adds:
- site work (clearing, soil test, anti-termite treatment);
- staircase and railings;
- external works (compound wall, gate, paving, drainage);
- water (sump, overhead tank, borewell, rainwater harvesting);
- septic tank or treatment plant;
- lift;
- solar.

The often-forgotten list for building:
- the architect's and structural engineer's fees;
- plan approval and development charges;
- the labour welfare cess;
- temporary electricity and water;
- electricity and water connections and their deposits;
- debris removal;
- curing water and site security;
- insurance;
- escalation on a long job;
- occupancy-certificate fees.

**Add a floor or rooms** has the same heads, plus strengthening the existing structure. Its forgotten list adds the structural stability certificate.

**Repair or renovate** keeps today's heads and adds:
- structural repairs (cracks, RCC repairs, jacketing);
- grills and fabrication;
- debris removal and scaffolding.

The often-forgotten list for renovation:
- the society's permission and its refundable deposit;
- protecting the lift and lobby;
- debris disposal;
- shifting, storage and a temporary stay;
- an engineer's certificate when the structure is touched;
- waterproofing under new tiles;
- rewiring and a larger distribution board for new loads (AC, induction);
- making good after dismantling;
- final cleaning.

**Interiors and furnishing** is new. Its heads, with the kind of item:

| Head | Unit | Kind |
|---|---|---|
| False ceiling | sq ft (cove: rft) | Fixed |
| Wall finishes (paint, texture, wallpaper, panelling) | sq ft | Fixed |
| Flooring (wooden, vinyl, tiles) | sq ft | Fixed |
| Fixed carpentry (wardrobes, TV unit, storage, shoe rack, study, mandir, doors) | sq ft of face area, or set | Fixed |
| Modular kitchen (base, wall and loft units, counter, accessories) | rft or set | Fixed |
| Electrical and lighting | point, nos | Fixed (light fittings: appliance) |
| Plumbing fittings and sanitaryware | nos, set | Fixed |
| Glass and mirrors | sq ft | Fixed |
| Loose furniture (beds, sofas, tables) | nos, set | Movable |
| Soft furnishings (curtains, blinds) | sq ft, nos | Movable |
| Appliances (chimney, hob, AC, geyser, purifier) | nos | Appliance |
| Upgrades (solar, inverter, automation, security, EV charging) | nos, LS | Fixed or appliance |
| Transport and installation | LS | Fixed |

The often-forgotten list for interiors:
- handles, mirrors, lights and fans, which are often left out of carpentry quotes (B2);
- transport and offloading;
- civil and plumbing preparation;
- the design fee;
- changes after the design is frozen;
- GST.

**New units:** point and set.

### A10. Checks the page runs (flags, never refusals)

- **Arithmetic, worked twice:**
  - each line, each head, the GST, the contingency, the total, the split and the stages;
  - when the user types the quotation's own amount and it differs from quantity × rate by more than Re. 1, it is flagged (the paisa in B2).
- **Missing for the lender** ("Before you go to the lender"):
  - the area;
  - GST;
  - the basis of rates;
  - the owner's name and the site address;
  - an item with a description but no amount: "the valuer will ask". The sample had three (B2).
  - for building and extensions, the approved plan;
  - payment stages that do not add up to 100%.
- **Consistency:**
  - a floor or ceiling area larger than the carpet area: "is a balcony or terrace included?";
  - paint area outside 2.5 to 3.5 × the carpet area (a rule of thumb, with its source, from a data file);
  - a head named under "not included" that also has priced items (B2);
  - the same line twice;
  - a GST rate other than the current slabs;
  - a quotation past its "valid till" date.
- **Financing:** when there are movable items or appliances, the split, with "some lenders finance furnishing within limits; others do not" (B1).
- **Permissions:**
  - a structural change brings the engineer's certificate and the society's and municipal approval;
  - a balcony enclosure may need municipal approval (B6).
- **Later (E5):** a building's cost per sq ft far outside the CPWD plinth-area range for its city.

### A11. What the lender gets (PDF, Excel, Word)

The documents follow the DSCR statement's rules (D-DOC-04 to 06): facts and working, no assumptions, no checks, every line kept.

**Page 1, the estimate of cost:**
- **The title** follows the kind: "Estimate of cost of construction", "of an extension", "of renovation" or "of interiors and furnishing".
- **The facts:**
  - the owners;
  - the property (the site address);
  - the work;
  - the area (sq ft, with sq m);
  - prepared by (name, qualification, registration number when given);
  - the basis of rates and its date;
  - the date.
- **The abstract of cost by head:** serial number, head and amount. Then the works total, GST, contingency, other costs, and the total estimated cost in figures and in words.
- **The cost per sq ft.**
- **The split**, when there are movable items or appliances.
- **The signature block.**

**Annex 1, the detailed estimate:** every item under its head (or its room):
- number;
- description and specification;
- quantity, unit, rate and amount;
- with head totals.

**Annex 2, terms**, when given:
- the payment stages with amounts;
- the time to finish and the date the quote is valid till;
- what is not included;
- the contractor's name, address, GSTIN and PAN;
- the bank account for payment.

**Annex 3, measurements**, when the rooms were measured.

These stay on the page only: the flags, "Before you go to the lender", the planning range, the loan, your share and the EMI.

### A12. Data and engine

**`engine/data/estimate.json`:**
- kinds `extension` and `interiors`;
- each head's unit, example and kind of item (fixed, movable, appliance);
- the units point and set;
- the often-forgotten list for each kind;
- the method lines.

**New `engine/data/estimate-checks.json`**, dated and sourced:
- the IS 1200 thresholds (0.5 and 3 sq m);
- the paint ratio;
- the conversions (0.3048 m to the foot).

**Later, `engine/data/par.json`:** CPWD plinth-area rates and city cost indices, taken only from the official text with its edition and date, and unverified until the owner checks them (E5).

**`engine/estimate.ts`:**
- each item gains the optional room, kind of item, GST rate and basis;
- the result gains the split, the other costs, the area named for the cost per sq ft, and the stages;
- `estimate-check.ts` gets a second computation for each.

**New `engine/areas.ts`:** room, wall and ceiling areas with the IS 1200 deductions, and the conversions, each checked by a second computation.

**New `engine/words.ts`:** an amount in Indian words, tested on cases worked by hand.

### A13. Build order: thin versions, one session each, merged by the owner

| Step | Delivers | Done when |
|---|---|---|
| E1 | The front door of A3: four kinds, the area by kind, item buttons, lump sums, GST three ways, the basis; results first (total, per sq ft, split, what is missing); documents with the property facts and the total in words; the field count asserted | The owner tries it on a phone and a desktop and says it feels simple |
| E2 | More options groups 1 to 4 (property and permissions, contractor and terms, other costs with the forgotten list, loan and EMI); Annex 2 | As above |
| E3 | Measure the rooms (`areas.ts`, quantities from rooms, the checks); Annex 3 | As above |
| E4 | The professional page (A5) | A professional the owner trusts uses it for one real estimate of their own |
| E5 | A planning range for building from CPWD plinth-area rates and the city's cost index, on the page only | The owner has checked `par.json` against the official text |

**Test cases** are the owner's fictional cases worked at home, one for each kind. They are never the sample PDFs, which belong to real people.

### A14. Decisions for the owner

1. **Should the tool supply rates?** Today it supplies none: each estimate states where its rates come from.
   - A planning range would help someone with no quotation yet. But the only official benchmark, CPWD's plinth-area rates, covers buildings, not interiors, and commercial interior rates vary three to five times (B4, B6).
   - **Recommended:** no rates in E1 to E4. E5 adds a building-only planning range, on the page and never in the lender's document.
2. **Movable furniture and appliances.** The choices are to refuse them, to include them silently, or to include them with a split.
   - Classic improvement loans exclude movable items. Some banks finance furnishing within a share of the house's cost, or with a larger margin (B1). One sample mixed beds and sofas with fixed carpentry (B2).
   - **Recommended:** include them, with the split on the page and in the abstract. Flag; do not restrict.
3. **A layperson's speed against a professional's completeness.**
   - **Recommended:** the five questions of A3, More options closed, and the professional page behind a link, as on the DSCR page.
4. **Typed quantities or measured rooms.**
   - Measuring rooms gives checkable quantities but adds fields.
   - **Recommended:** typed quantities by default; rooms under More options (E3).
5. **What the lender's document carries.**
   - **Recommended:** facts, the abstract, every line and the terms. Flags, the loan and the EMI stay on the page, as the owner asked for the DSCR downloads (D-DOC-05).

Two smaller choices, decided unless the owner says otherwise:
- one estimate can mix renovation and interiors heads;
- the contractor's bank account appears only when entered, and only in Annex 2.

---

## Part B: the research

### B1. What lenders ask for and finance

**Documents:**
- **Construction loans:** the title of the plot, the plan approved by the local authority, and a construction estimate by an architect or civil engineer [15, 31, 32]. One bank's process: the estimate is certified by a chartered engineer or architect and verified by the bank's technical officer [45].
- **Extension loans:** the approved plan for the extension and an estimate; paid in stages [25, 15].
- **Improvement and renovation loans:** an estimate or quotation from an architect, engineer or valuer [23, 24]; quotations with the KYC and property papers; paid as a lump sum or in stages [17, 18].

**Payment in stages for building**, as reported, varies by lender: foundation 15% to 25%, plinth or columns 20% to 25%, roof 25% to 30%, masonry and plaster 15% to 20%, finishing the rest. Each stage is released after the lender's engineer inspects it [26, 33].

**Technical verification:** an engineer or valuation agency visits, measures and compares with the plans. The lender lends on the lower of the price and the valuation. The fees are Rs. 5,000 to 25,000 [28].

**What is financed:**
- **Classic home improvement loans** cover immovable work: repairs, painting, tiling, flooring, waterproofing, plumbing, electrical work, false ceilings, modular kitchens and built-in wardrobes. They do not cover movable furniture or appliances [29, 30, 24, 23].
- **Some banks finance furnishing:**
  - one adds furnishing and interiors up to a share of the house's cost (15% or 20% in different reports, at most Rs. 50 lakh) within the LTV [19];
  - one's improvement loan covers furniture, fixtures, furnishings and gadgets, with a 25% margin on the whole [20];
  - others run furnishing schemes [21, 22].
- Personal loans fund the rest [30].

**RBI limits:**
- **Housing loan LTV:** at most 90% up to Rs. 30 lakh, 80% above Rs. 30 lakh and up to Rs. 75 lakh, and 75% above Rs. 75 lakh [1].
- **Stamp duty, registration and documentation charges** are left out of the cost, except where the house costs Rs. 10 lakh or less [1].
- **Loans for repairs** to dwelling units count as priority sector up to Rs. 15, 12 or 10 lakh, by the centre's population (Master Directions 2025, as reported) [2].

**Tax:** interest on a loan for repairs or renovation was deductible up to Rs. 30,000 a year for a self-occupied house under the old regime (section 24(b) of the 1961 Act) [14]. The Income-tax Act 2025 applies from 01-04-2026, so verify before any use.

### B2. What the three sample documents show

The owner downloaded these from the internet. They are summarised here for structure only.

**A renovation-and-interiors quotation for a flat (2 pages).**
- **Layout:**
  - the firm's name and office on top, then the client's name and address and the date;
  - items grouped by room (living room, bedroom), then by trade: false ceiling, painting, carpentry, electrical, civil;
  - columns for number, description, unit, quantity, rate and total;
  - one grand total;
  - "For [firm], Proprietor", signed;
  - the firm's bank account for payment.
- **How items are measured:**
  - the false ceiling, painting and carpentry (doors, TV unit, panelling, wardrobes) by sq ft;
  - electrical work by number of points, with the make;
  - civil work by lump sum;
  - one item specified in full (gypsum board thickness, GI frame, cut-outs, jointing).
- **Gaps:**
  - no GST line and no GSTIN;
  - no date it is valid till, no time to finish, no terms;
  - three items with no quantity, rate or amount;
  - the head total rows left blank;
  - addressed to the client's present home, not the flat being renovated;
  - no area;
  - civil items that may need permission (a balcony extension, a kitchen window wall);
  - quantities not tied to any measured area.

  The arithmetic is right: every line and the total agree.

**A lender's cost-vetting report on that quotation (5 pages).** It was prepared by a firm of chartered engineers and government-registered valuers on the lender's panel.

- **Opening:**
  - reference number and date;
  - the branch that instructed it;
  - the site visit and its date;
  - the property's full description: flat, floor, building, society, survey or CTS numbers, village, taluka and district;
  - the owners as in the agreement for sale, its date and the vendor.
- **Methodology:** the inputs from the clients and contractors were checked, and the cost's reasonableness was judged from market and public sources.
- **Summary:** a summary of the estimated expenditure by head (the quotation's own groups), with the total in figures and in words.
- **Opinion:** the cost is "as per prevailing market norms … true and fair".
- **Closing:**
  - confidentiality;
  - a declaration of no interest, with the valuer's category;
  - a disclaimer that title and legality were not checked;
  - signature and seal;
  - the quotation attached and stamped on every page.
- **What it did not do:** it gave no cost per sq ft and no area, and it accepted the items that had no amount.

**A modular-furniture quotation (3 pages).**
- **Header:** the firm, the client and the site city, a quotation number, prepared by, a contact and the date.
- **Items:** each is a "set" with a total, plus a list of what it includes:
  - the board (16 mm BWR or BWP ply, 1 mm laminate, 0.8 mm liner), with areas in sq ft per part;
  - the hardware (soft-close hinges, channels, lift-ups) with make and number;
  - installation.
- **Exclusions noted under each item:** mattress, handles, mirror. Lights, fans and transport are left out.
- **Electrical work:** priced per point, with a note giving a different count from the one priced.
- **Painting:** a lump sum.
- **Terms:** 50% advance and 50% before delivery; design changes change the price; rust and damage are not under warranty; no cancellation. One term excludes electrical and civil work while the quotation prices electrical work.
- **Movable furniture** (beds, sofas, a sofa-cum-bed) is mixed with fixed carpentry and not split out.
- **GST:** no mention.
- **Arithmetic:** the total agrees with its lines; one line is a paisa out because its unit price was rounded for display.

**What this means for the tool:**
- show the summary by head and the total in words that the valuer uses;
- put the site, not the client's address, on the estimate;
- state GST, validity and terms;
- never leave an item without an amount or a head without a total;
- split movable from fixed;
- check what is excluded against what is priced;
- carry the area, so the cost per sq ft is there when the valuer asks.

### B3. Areas and measurement

- **RERA carpet area (section 2(k)):** the net usable floor area including internal partition walls, excluding external walls, service shafts, an exclusive balcony or verandah and an exclusive open terrace [3].
- **IS 3861:2002, plinth area:**
  - the covered area at floor level, including walls (but not plinth offsets), shafts and the staircase;
  - balconies and verandahs: covered ones in full, uncovered ones at 50%;
  - lengths to 0.01 m and areas to 0.01 sq m [4].
- **Built-up and super built-up area:**
  - built-up area is the carpet area plus walls, reported as 10% to 25% more;
  - super built-up adds a share of the common areas, the "loading";
  - loading is 25% to 35% in most projects, over 40% in luxury ones, and 40% to 50% in Mumbai [16, 34].
- **IS 1200, plaster and paint deductions:**
  - up to 0.5 sq m, none;
  - 0.5 to 3 sq m, from one face when both faces are alike;
  - over 3 sq m, from both faces, with reveals added.

  IS 1200 Part 13 covers painting [5].
- **Paint area:** about 2.5 to 3.5 × the carpet area (a rule of thumb). Measured, it is 2 × (L + B) × H less doors and windows, plus the ceiling [39].

### B4. How estimates are made in India

- **Plinth-area method, preliminary:**
  - CPWD's Plinth Area Rates give a cost per sq m of plinth area by type of building.
  - PAR 2023, the 11th edition, was effective from 01-08-2023, at the Delhi cost index of 107 as on 01-04-2023, and reflected GST going from 12% to 18% on works.
  - PAR 2025 is the 12th edition.
  - CPWD publishes a building cost index for each city every 1 April and 1 October; the rates are for Delhi and are scaled by the index [6].
- **Detailed estimate:**
  - quantities from the drawings × rates from the Delhi Schedule of Rates or the state's schedule, summed in an abstract of cost [7, 42].
  - CPWD practice adds 3% for contingencies and 1.5% to 2.5% for work-charged establishment [7].
- **Rate analysis:** materials + labour + tools and sundries, then water charges of 1% and the contractor's profit and overheads of 15% (7.5% + 7.5%) [8].
- **Private practice** (Quora):
  - contingency of 5% to 15%;
  - escalation of 5% to 10% a year on long jobs;
  - soft costs (design, approvals) of 10% to 20% [42].
- **Renovation contingency:** 10% to 20%, and 15% to 20% for houses over about 50 years old. An allowance is a marked placeholder for an item not yet chosen [46, 48].
- **Cost per sq ft of a house in 2026** (commercial guides): basic Rs. 1,400 to 1,800, standard Rs. 1,800 to 2,800, premium Rs. 2,800 to 5,000. The ranges differ by city; Mumbai is the highest [34].
- **Thumb rules:**
  - per sq ft of built-up area: cement 0.35 to 0.45 bags and steel 3.5 to 4.5 kg;
  - by cost: materials about 60%, labour 30%, plant and overheads 10%;
  - by part: structure about 40%, finishes 30%, services 15% [38].

### B5. Taxes, cess and fees

- **GST on construction:**
  - building a house with labour and materials is a works contract at 18%;
  - a pure labour contract for a single residential unit (not part of a complex) is exempt [9].
- **GST Council, 56th meeting:** from 22-09-2025, cement went from 28% to 18%, and marble and granite blocks and sand-lime bricks from 12% to 5%. Most goods now sit in two slabs, 5% and 18%, with 40% on a few [10].
- **Building workers' welfare cess:**
  - 1% of the cost of construction;
  - as reported, an individual's house costing under Rs. 50 lakh is exempt from 21-11-2025 under the Code on Social Security, 2020. The earlier threshold was Rs. 10 lakh.

  Verify against the notification [11].
- **Architect's fees:**
  - the Council of Architecture's guidance is 7.5% of the cost of works for individual houses, and 5% for single-block housing on small sites;
  - documentation charges are 10% of the fee;
  - the guidance is not binding [12].
- **Often missed, as reported:**
  - plan approval, Rs. 5,000 to 50,000;
  - development charges, Rs. 50 to 150 per sq ft;
  - temporary electricity, Rs. 3,000 to 12,000;
  - deposits, Rs. 5,000 to 25,000;
  - a structural safety certificate, Rs. 10,000 to 25,000;
  - a borewell, Rs. 80,000 to 2.5 lakh;
  - a compound wall, Rs. 1 to 3 lakh.

  In all, these add 10% to 25% beyond the per-sq-ft rate [40].

### B6. Interiors, societies and permissions

- **Interiors by the sq ft** (commercial guides):
  - overall: economy Rs. 800 to 1,200, standard Rs. 1,500 to 2,500, luxury Rs. 3,000 to 5,000 or more;
  - a modular kitchen: Rs. 1,500 to 3,000;
  - wardrobes: laminate Rs. 1,000 to 1,500, acrylic Rs. 2,000 to 2,800, sliding Rs. 2,500 to 3,500;
  - false ceiling: gypsum Rs. 90 to 150, POP Rs. 70 to 120, wood Rs. 250 to 450 [35, 36, 37].
- **Interiors by room:** firms quote room by room, for example the living room (sofa, TV unit, false ceiling) and the bedrooms (wardrobe, bed) [35].
- **Societies** (Maharashtra's model bye-laws and guides):
  - the society's written permission before any civil work;
  - a refundable deposit of Rs. 10,000 to 50,000 for the common areas;
  - structural changes need an engineer's certification;
  - work must match the approved plans.
  - Enclosing a balcony can breach the FSI and need municipal approval; the Bombay High Court has said to know the rules first [13].

### B7. What the forums say

- **Quora:** estimate by quantities from the drawings × the schedule of rates. Budget separately for land; hard costs; soft costs (fees, approvals, surveys); utilities; contingency; escalation; and taxes and levies [42].
- **Renovation-estimate guides** of the Houzz kind list every line:
  - demolition and debris, protection;
  - plumbing and electrical by count;
  - finishes with a waste factor;
  - fixtures, labour by trade, permits;
  - allowances, exclusions, contingency, overheads and markup.

  Track each line's estimate against its actual cost, and each allowance against the item chosen [46].
- **The NoBroker forum and RenoTalk**, on what a quotation must carry:
  - the firm's details;
  - the client and the project address;
  - a quote number, the date and the date it is valid till;
  - the schedule;
  - the scope by room or trade;
  - quantities, rates, allowances and tax;
  - materials chosen and items the owner supplies;
  - exclusions;
  - payment stages, how changes are approved, and the warranty.

  Also: write to the society before renovating [43, 44].
- **GharPedia:** unexpected costs come from design changes and site conditions; keep a reserve [41].
- **Owner-builder forums:**
  - building took twice as long and cost about 50% more than planned;
  - estimates miss soft costs, permits, temporary power, waste removal and site preparation;
  - firm bids beat guesses [47].
- **Scribd:** bank-loan estimate sheets for houses lay out an abstract and a detailed estimate (earthwork, concrete, masonry and so on) with the engineer's certificate. There are also IS 1200 deduction notes [45].

### B8. Sources

Read through search results on 02-10-2026; "as reported" throughout.

**Regulators and standards**
1. RBI, Master Circular on Housing Finance (LTV; stamp duty in the cost), as reported by [TaxGuru](https://taxguru.in/rbi/home-loan-inclusion-stamp-duty-charges-ltv-ratio-construction-linked-disbursal.html) and [99acres](https://www.99acres.com/articles/rbi-guidelines-on-home-loan-financing-and-ltv-ratio.html)
2. RBI, [Master Directions on Priority Sector Lending](https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=12799); [EMI Calculator summary](https://emicalculator.net/rbi-revises-priority-sector-lending-cap-for-housing-loans-does-this-affect-you/)
3. RERA 2016, section 2(k), as reported by [Godrej Capital](https://www.godrejcapital.com/media-blog/knowledge-centre/what-is-rera-carpet-area)
4. IS 3861:2002, as reported by [Civil4M](https://civil4m.com/threads/measurement-of-plinth-and-carpet-areas-of-buildings-as-per-is-3861.1461/) and [Civil Mentor](https://ecivilmentor.blogspot.com/2021/10/how-to-measure-plinth-and-carpet-area.html)
5. IS 1200: [The Constructor](https://theconstructor.org/question/what-is-the-rule-for-deduction-in-the-measurement-of-plastering-work/); [IS 1200 Part 13 (law.resource.org)](https://law.resource.org/pub/in/bis/S03/is.1200.13.1994.pdf)
6. CPWD Plinth Area Rates: [PAR 2023 (CEV News)](https://cevnews.in/2023/08/cpwd-plinth-area-rates-2023/), [PAR 2025 (CEV News)](https://cevnews.in/2025/09/cpwd-plinth-area-rates-2025/), [cost index (NSR Civil)](https://nsrcivil.in/cpwd-building-cost-index-calculation/)
7. CPWD contingencies and work-charged establishment: [Testbook](https://testbook.com/question-answer/what-percentage-of-contingencies-and-work-charged--622ebf003ba3098ca4557bee), [Ques10](https://www.ques10.com/p/30614/explain-contingencies-and-work-establishment-charg/)
8. CPWD analysis of rates: [The Constructor](https://theconstructor.org/construction/analysis-of-rates-for-building-works/6895/), [QSC Engineer](https://qscengineer.com/contractor-profit-rate-analysis-india/)
9. GST on a single residential unit: [TaxGuru](https://taxguru.in/goods-and-service-tax/gst-single-residential-unit-construction.html), [TaxTMI](https://www.taxtmi.com/forum/issue?id=114190)
10. GST Council, 56th meeting: [Business Standard](https://www.business-standard.com/industry/news/gst-council-cuts-cement-construction-materials-boost-affordable-housing-125090400622_1.html), [News on AIR](https://www.newsonair.gov.in/gst-council-cuts-rates-on-key-housing-materials-providing-big-relief-to-common-man)
11. Construction workers' welfare cess: [GKToday](https://www.gktoday.in/centre-notifies-1-construction-welfare-cess/), [GK365](https://gk365.in/current-affairs-articles/national/construction-welfare-cess-2026-key-provisions-bocw-facts/), [Bar & Bench](https://www.barandbench.com/law-firms/view-point/bocw-unravelling-the-complexities-of-construction-cess)
12. Council of Architecture scale of charges: [COA](https://coa.gov.in/index1.php?lang=1&level=2&sublinkid=299&lid=86), [Studio Matrx](https://www.studiomatrx.org/guides/architect-scope-of-services-coa-india)
13. Society rules: [Maharashtra model bye-laws](https://sahakarayukta.maharashtra.gov.in/SITE/PDF/Rules_Acts_Bylaws/Model_Bye_Laws_of_Coop_Housing_Society_New_Flatowner_Type_(2-9-14)%20(1).pdf), [NoBrokerHood](https://www.nobrokerhood.com/blog/society-rules-for-flat-renovation-in-mumbai/), [Pune Pulse on the Bombay High Court](https://www.mypunepulse.com/planning-to-enclose-your-balcony-or-install-a-safety-grill-bombay-hc-says-know-the-rules-first/)
14. Section 24(b): [TaxBuddy](https://www.taxbuddy.com/blog/section-24b-home-loan-interest-deduction), [Bajaj Finserv](https://www.bajajfinserv.in/tax-deduction-on-home-loan-interest-under-section-24)

**Banks, housing finance companies and NBFCs**

15. HDFC Bank: [documents](https://homeloans.hdfc.bank.in/checklist/documents-charges), [extension](https://homeloans.hdfc.bank.in/blog/home-finance/loans-can-fund-your-home-extension-too)
16. ICICI Bank: [carpet, built-up and super built-up area](https://www.icici.bank.in/personal-banking/blogs/loan/home-loan/all-about-carpet-area-built-up-area-and-super-built-up-area)
17. ICICI Home Finance: [home improvement loan](https://www.icicihfc.com/knowledge-hub/step-by-step-guide-to-get-a-home-improvement-loan)
18. Kotak Mahindra Bank: [home improvement loan](https://www.kotak.bank.in/en/stories-in-focus/loans/home-loan/home-improvement-loan.html)
19. Central Bank of India: [Cent Home Loan](https://centralbank.bank.in/en/node/417), as summarised by [Paisabazaar](https://www.paisabazaar.com/central-bank-of-india/home-loan/)
20. Bank of Baroda: [home improvement loan](https://bankofbaroda.bank.in/personal-banking/loans/home-loan/home-improvement-loan)
21. Bank of India: [Star Home Loan, furnishing](https://bankofindia.bank.in/home-loan/star-home-loan-furnishing)
22. Karnataka Bank: [Home Comfort](https://www.karnatakabank.bank.in/personal/loans/home-comfort)
23. LIC Housing Finance, as reported by [NoBroker](https://www.nobroker.in/home-loan/lic-housing-finance/home-improvement-loan/)
24. PNB, as reported by [NoBroker](https://www.nobroker.in/home-loan/punjab-national-bank/home-improvement-loan/) and [Urban Money](https://www.urbanmoney.com/home-loan/punjab-national-bank/home-renovation-loan-hlprop)
25. Tata Capital: [home extension loan](https://www.tatacapital.com/home-loan/home-extension-loan.html), [home renovation loan](https://www.tatacapital.com/personal-loan/home-renovation-loan.html)
26. Aavas Financiers: [construction disbursement](https://www.aavas.in/blog/home-construction-loan-disbursement-process)
27. PNB Housing Finance: [construction loans](https://www.pnbhousing.com/blog/home-construction-loans-vs.-regular-home-loans-what-s-the-difference)
28. Bajaj Finserv: [legal and technical verification](https://www.bajajfinserv.in/understanding-legal-and-technical-verification-in-housing-loan)
29. Aditya Birla Capital: [home renovation loan](https://www.adityabirlacapital.com/abc-of-money/home-renovation-loan)
30. Ambak: [home loan for interiors](https://ambak.com/blog/home-loan-for-interiors-in-india-2025-latest-rates-eligibility-benefits-and-application-guide/)
31. Paisabazaar: [home construction loan](https://www.paisabazaar.com/home-loan/home-construction-loan/)
32. Urban Money: [SBI construction loan](https://www.urbanmoney.com/home-loan/state-bank-of-india/sbi-home-loan-for-construction-hlprop)
33. NoBroker: [construction loan disbursement](https://www.nobroker.in/home-loan/construction-loan/)

**Industry guides**

34. [Brick & Bolt, cost per sq ft 2026](https://www.bricknbolt.com/blogs-and-articles/construction-guide/house-construction-cost-in-india-%E2%82%B91800-%E2%82%B93500-per-sq-ft-2026); [NoBroker, super built-up area](https://www.nobroker.in/blog/super-built-up-area-vs-carpet-area-calculation-guide/)
35. [Design Cafe, 2BHK interiors](https://www.designcafe.com/blog/home-interiors/2bhk-interior-design-cost-in-delhi/)
36. [Livspace, 2BHK cost breakup](https://www.livspace.com/in/magazine/breakup-of-2-bhk-interior-design-cost)
37. [Housiey, interior budgeting](https://housiey.com/blogs/interior-budgeting-2025-1bhk-2bhk-3bhk-cost-breakdowns)
38. [Civiconcepts, thumb rules](https://civiconcepts.com/blog/thumb-rules-for-civil-engineering); [Civil Planets](https://civilplanets.com/civil-engineering-thumb-rule-in-construction/)
39. [AapkaPainter, painting area](https://aapkapainter.com/blog/how-to-calculate-painting-cost-per-sq-ft/); [NoBroker forum, wall area](https://www.nobroker.in/forum/how-to-calculate-wall-area-for-painting/)
40. Hidden costs: [Kairali TMT](https://kairalitmt.com/hidden-costs-of-house-construction-in-india/), [HouseYog](https://www.houseyog.com/blog/hidden-construction-costs-india/), [Ghar Ka Budget](https://gharkabudget.com/articles/house-construction-hidden-costs-india/)
41. [GharPedia, unexpected costs](https://www.gharpedia.com/blog/managing-unexpected-costs-construction-project/)

**Forums and shared documents**

42. Quora: [estimating a civil building](https://www.quora.com/What-is-the-procedure-and-how-do-you-estimate-the-cost-of-civil-building), [a construction budget](https://www.quora.com/How-can-I-correctly-estimate-my-home-construction-budget-before-starting-work), [thumb rules](https://www.quora.com/What-is-the-thumb-rule-in-getting-the-construction-cost-of-residential-building)
43. NoBroker forum: [letter to the society](https://www.nobroker.in/forum/how-to-write-a-letter-to-society-for-renovation/), [interiors](https://www.nobroker.in/forum/interior-design-queries/)
44. RenoTalk: [advice on a quotation](https://www.renotalk.com/forum/topic/65521-need-advice-on-this-quotation/)
45. Scribd: [bank-loan estimate](https://www.scribd.com/document/378412529/7-lakhs-bank-estimate-xls), [construction-loan estimate sheet](https://www.scribd.com/document/704070720/1613719092184Home-Construction-Loan-Estimation-Sheet), [IS 1200 plaster deductions](https://www.scribd.com/document/414082528/Plastering-Deductions-as-per-IS-Code-1200-docx); the certificate practice from [100 Pillars](https://100pillars.in/house-construction-loan-process/)
46. Renovation-estimate guides: [Renofiz](https://www.renofiz.com/wa/blog/renovation-estimate-breakdown-every-line-explained), [SimplyWise](https://www.simplywise.com/blog/remodeling-estimate-template/)
47. Owner-builder forums: [DIY Chatroom](https://www.diychatroom.com/threads/estimating-cost-when-building-your-own-house.188163/), [Building Advisor](https://buildingadvisor.com/project-management/estimating-overview-2/estimating-errors/), [MetaFilter](https://ask.metafilter.com/71185/How-can-we-estimate-how-much-it-would-cost-to-build-our-own-house)
48. [Wikipedia, cost contingency](https://en.wikipedia.org/wiki/Cost_contingency)

### B9. What could not be reached, and what to verify before any figure enters a data file

- **Pages could not be opened.** The session's network blocked opening pages (`indiacode.nic.in` was refused), so every source above was read through search results.
- **Primary texts to read** before anything here becomes a rule in `engine/data/`:
  - the RERA Act;
  - IS 3861 and IS 1200 (BIS);
  - CPWD's PAR 2025 and the latest cost-index circular;
  - the RBI master circular and directions;
  - the GST notifications for works contracts and the 56th Council's rates;
  - the cess notification under the Code on Social Security, 2020;
  - the COA scale of charges;
  - the Income-tax Act 2025 section that replaces section 24(b).
- **Not found:** the National Building Code 2016 Part 8 table of light, fan and socket points for each room.
- **Not searched:** Reddit, which is closed to the search tool.
- **All rates in B4 to B6 are commercial or as reported.** They are evidence for the design, not values for the engine.
