# The estimate tool: blueprint and research

02-10-2026, version 3. Version 3 builds the engine and its library (A0); the page and the documents come next (A17). It grows the estimate at `/estimate/` (D-UX-13) rather than replacing it. Recorded as D-UX-16 (version 1), D-UX-17 (version 2) and D-UX-18 (version 3).

**Asked, in the owner's words:**
- **Version 1:** "what to include in the construction estimate, what fields to include in the home repair and renovation estimate, what to include in the home improve or enrich estimate, how to calculate the estimate various costs, carpet area, built-up area etc., what to ask from the user as input data (most high value items of information that satisfies answers to various questions down the line) … a detailed blueprint for a estimate creation tool … structured so that a layperson can use it and a professional can also use it."
- **Version 2, after reading version 1:** "not required: Loan … what is required: an itemised estimate, very detailed: that figures out all the technical details that only an architect knows from very little information. like an estimate for repair and renovation of flat or house may include, flooring, wall paint, ceiling, sanitary items like jaquar etc. so the user should be asked to choose the brands or quality of each item or they can just choose a package like (create packages for modest, upper class, high, luxury, ultra luxury; figure out on your own, maybe even sliders for each section, so that moving a slider will take that section from one end of the scale/spectrum to other end while simultaneously updating the contents and cost of that section. We would require a large library of all sorts of material and items under the different categories for this to implement."
- The owner also asked for a critique of a second blueprint, made by another AI (Gemini), taking what is useful (B11).
- **Version 3, after merging version 2:** "the big insight is that the engine must acts as the architect. give the engine all architects skills. find them online or create them from scratch. create a vast library of all sorts of construction materials and interior decoration material and finishes (sky is the limit here on what can be included here)". A second note from Gemini came with it, "take what is useful" (B12).

**What changed from version 1:**
- **The tool works the estimate out** from a few facts (A3 to A6). Before, it only laid out a quotation the user typed. Typing a quotation stays, as a second path (A9).
- **Five levels, a slider for each section, and a brand or level for each item** (A4).
- **A library** of items, specifications, brands and rates, each with its source and date (A7). This is now most of the work.
- **The loan, your share and the EMI are gone** from the page and from More options.

**What changed in version 3:**
- **The engine is built as the architect** (A0): from the six answers it plans the rooms, places the doors and windows, measures every surface, puts in what each room needs at each level, prices it for the city and adds it up at all five levels, worked twice.
- **The library is built:** 312 items in 79 families, every rate with its source (`docs/LIBRARY.md`).
- **Rates are as reported until checked.** A18's decision 1 is taken on the owner's word, and marked on the page and in the documents (A7).
- **The page is next** (E1, A17).

**How it was made:**
- **Version 1:** about 50 public sources, listed in B8:
  - regulators and standards;
  - banks, housing finance companies and NBFCs;
  - industry guides;
  - forums: Quora, the NoBroker forum, RenoTalk, owner-builder forums, Scribd and renovation-estimate guides.
- **Version 3:** about 55 more searches for the library and the rules; 183 sources in `engine/data/sources.json`, listed with each rate in `docs/LIBRARY.md`.
- **Version 2:** about 20 more, for the library (B10):
  - builders' and interior firms' published packages;
  - brand comparisons;
  - rate guides, room sizes and electrical layouts;
  - the CPWD schedule and cost index, as reported.

All of it was read through search results on 02-10-2026. The pages themselves could not be opened from the session, so every figure in Part B is "as reported" until it is checked against its primary text (B9). Reddit could not be searched, because it is closed to the search tool.

The owner also downloaded three documents from the internet, each said to have been accepted by a lender:
- They were read for their structure only (B2).
- No name, address, account number or figure from them is kept here, and the files are not in the repo.
- They were read again only to check what the second blueprint says about them (B11).

**Decide first:** A18, five choices, each with a recommendation.

**Contents**
- Part A, the blueprint:
  - A0 the engine is the architect (built in version 3);
  - A1 the contract;
  - A2 four kinds of work;
  - A3 the default path;
  - A4 five levels, sliders and brands;
  - A5 how the estimate is worked out;
  - A6 sections and levels;
  - A7 the library;
  - A8 the screen;
  - A9 a quotation in hand;
  - A10 More options;
  - A11 the professional page;
  - A12 which input answers which question;
  - A13 areas;
  - A14 checks;
  - A15 the documents;
  - A16 data and engine;
  - A17 build order;
  - A18 decisions for the owner.
- Part B, the research:
  - B1 lenders;
  - B2 the three sample documents;
  - B3 areas and measurement;
  - B4 how estimates are made;
  - B5 taxes, cess and fees;
  - B6 interiors, societies and permissions;
  - B7 forums;
  - B8 sources;
  - B9 what could not be reached, and what to verify;
  - B10 the library: packages, brands, rates and quantities;
  - B11 the second blueprint;
  - B12 Gemini's second note.

---

## Part A: the blueprint

### A0. The engine is the architect (version 3, built)

The owner's insight: the engine, not the user, carries what an architect knows. Version 3 builds it and the library it draws on. E1 shows it at `/estimate/` (D-UX-21), with the planning estimate to download (D-DOC-08).

**What it does with the six answers** (`engine/architect.ts`):
1. **Plans the rooms.** Each BHK has a programme of rooms whose reported sizes are used as proportions. The rooms share 85% of the carpet area, the passage and foyer 10% and the internal walls 5%; a balcony is added at its own size. Each room gets a usual length-to-breadth ratio. A room below the Code's minimum is flagged, never changed.
2. **Places the doors and windows:** a main door, a door to each bedroom and bathroom, the kitchen's opening and a balcony door; enough 4 × 4 ft windows for a tenth of each habitable room's floor (NBC 2016); a ventilator in each bathroom.
3. **Measures every surface by IS 1200:** floors with 100 mm skirting less the doorways; walls less their openings (none up to 0.5 sq m, one face up to 3 sq m, both faces and the reveals above); bathroom tiles to the level's height (7 ft, 8 ft or the ceiling); the kitchen counter as an L with tiles above it; waterproofing over the floor, 300 mm up the walls and 1.8 m in the shower; false ceilings, coves, wardrobes and units by the level.
4. **Puts in what each room needs** at its section's level, from the library: about 40 kinds of item in a renovated 2BHK, from taking up the old floor to the deep cleaning. The layers an owner forgets are there: waterproofing under the tiles, debris, floor protection, making good, and the plumbing and electrical points.
5. **Prices it for the city:** the middle of each reported range; a material's wastage and fixing; a set's parts; the city's factor on labour, never on a product; GST only on a rate quoted before it.
6. **Adds it up:** by line, section and room; the total; the cost per sq ft of carpet area; the split into fixed, movable and appliance; the five-level strip.
7. **Works it twice** (`engine/architect-check.ts`): rooms, quantities, rates and totals by another route; nothing is shown when the two disagree.
8. **Says what it assumed and what to check:** the rooms, bathrooms, height, sections, city, rates and points as assumptions (D-UX-08); flags for a room below the Code, an unusual carpet area, the paint ratio, a place with no city figure, an item with no rate yet, and rates as reported.

**The rules** are in `engine/data/architect.json`, each with its source or marked as our own rule with its reason, and in plain words in `docs/RULES.md`. "Find them online or create them" became both: about 30 rules, half from codes and reported practice and half our own, each saying which.

**The library** is in `engine/data/library/` (15 files) and in plain words in `docs/LIBRARY.md`: 312 items in 79 families, 17 kinds of labour, 183 sources.
- A **family** is a slot an architect fills: a floor finish, a WC and basin, a wardrobe.
- Its **five levels** name one item each. Every other item of the family is an alternative for the item drawer: about 30 floor finishes from sheet vinyl to Calacatta marble, 25 wall finishes from economy emulsion to tadelakt, 12 ceilings, 9 windows, 8 railings, and so on.
- **Items still without a rate** (granite flooring, epoxy, Athangudi and encaustic tiles, carpet) are listed, and cannot be a level's item.

**Not yet:**
- for a new house (built thin, D-UX-23): the compound, the water, the structure by stages and CPWD's check (E5);
- for a house being renovated: its own works, the terrace and the outside (E5; its rooms inside are worked out as a flat's, flagged, D-UX-22);
- furniture and furnishings in the estimate (E3; they are in the library);
- room sizes typed by the user (More options, E6).

**Never "architect" on screen.** The Architects Act 1972, s. 37, keeps the title to registered architects (as reported; the Supreme Court has held that it bars the title, not the work). The page says "worked out as an architect would", and the document is a planning estimate that an architect or engineer may adopt and sign.

### A1. The contract

**Who types:**
- **A layperson:** the owner of a flat or house, on a phone, often with no quotation yet.
- **A professional:** a contractor, an interior firm, an architect, an engineer or a DSA, on a desktop.

**Who reads it at the other end:**
- the lender's officer;
- the panel engineer or valuer who vets the cost (B2);
- contractors asked to quote against it (A9).

**What the user gives, very little:**
- the work;
- flat or house (or the floors, when building);
- the city;
- the area;
- the bedrooms (BHK);
- the level.

That is six questions (A3).

**What the tool works out, as an architect would:**
- the rooms and their sizes, from the BHK and the area (A5);
- every item each room needs for the work, with its specification, and its quantity by the measurement rules (A5, A6);
- each item's rate at the chosen level, for the city, from the library (A7);
- the total, by section and by room.

**What the user can change:**
- the level of the whole home: one of five packages;
- the level of each section: a slider;
- the brand or level of any item;
- any quantity or room size;
- any rate, when they have a quote.

**Outputs:**
- **On the page, results first:**
  - the total;
  - the cost per sq ft, naming the area;
  - the totals at all five levels side by side;
  - the split between fixed and movable items;
  - the sections with their sliders.
- **To take away:**
  - the estimate as a PDF, an Excel copy and a Word copy, all from one document (`lender-documents`);
  - a bill of quantities with the rates left blank, for contractors to quote (A9).

**Not on the page and not in the documents:** the loan, your share, the margin and the EMI (owner, 02-10-2026).

**The standing tradeoff** is a professional's completeness against a layperson's speed. It is settled as on the DSCR page (D-UX-10, D-UX-12):
- six questions on the default path;
- the sliders are the result, not more questions;
- everything else sits in one closed More options;
- the professional's grid sits behind a visible link.

### A2. Four kinds of work

| On screen | What it covers | Usual loan (B1) | Area for the cost per sq ft | What the lender asks for besides the estimate |
|---|---|---|---|---|
| Build a house | A new house on the owner's plot | Home construction loan, paid in stages | Built-up (plinth) area of all floors | Title of the plot, the approved plan, an estimate signed by an architect or civil engineer |
| Add a floor or rooms | An extension of an existing house | Home extension loan, paid in stages | Built-up area being added | The approved plan for the extension; the existing structure's soundness for a new floor |
| Repair or renovate | Civil repairs, waterproofing, flooring, doors and windows, kitchen, toilets, plumbing, electrical, painting | Home improvement or renovation loan | Carpet area | An estimate or quotation; the society's permission for a flat; an engineer's certificate if walls, beams or balconies change |
| Interiors and furnishing | False ceiling, fixed carpentry (wardrobes, modular kitchen, TV unit), lighting, loose furniture, appliances, soft furnishings, upgrades (solar, automation) | Home improvement loan; some banks' furnishing schemes; a top-up or personal loan for movable items | Carpet area | A quotation, and the fixed and movable items told apart |

Jobs mix: the sample renovation quotation combined civil work and interiors (B2). Renovation and interiors therefore share one list of sections. Each section has its own on/off switch, so a job can be any mix (A8).

### A3. The default path: six questions, then the estimate

1. **What is the work?** Build a house · Add a floor or rooms · Repair or renovate · Interiors. Build a house has been on the page since 03-10-2026 as "Build a new house" (D-UX-23); Add a floor or rooms is still to come.
2. **Flat or house?** This is asked for repairs and interiors. For building and for extensions it asks instead **How many floors?**:
   - Ground, G+1, G+2 or G+3;
   - for an extension, the floors being added.
3. **Which city?** A list of the places in the cost index (A7), with "Other: choose the nearest". It sets the city's rates.
4. **How big?** The label follows the kind:
   - "Built-up area of all floors", for building;
   - "Built-up area being added", for an extension;
   - "Carpet area, as in your agreement", for repairs and interiors.

   A sq ft / sq m switch goes with it.
5. **How many bedrooms?** 1 RK, then 1, 2, 3, 4 or 5+ BHK. For an extension, the rooms being added.
6. **Which level?** Five cards, Basic, Standard, Premium, Luxury and Bespoke, each with one line on what it means (A4).

**Assumed and shown, one line each with a way to change it.** These come from the data files and are listed on the page (D-UX-08):
- the number of bathrooms, from the BHK, by a rule in the data file with its source (B10 has layouts for a 2BHK only);
- the ceiling height;
- which sections are on for the kind;
- the date of the library's rates.

**At download:** the owner's name and the property's address, as in version 1.

**Results come first:**
- the total and the cost per sq ft;
- the five-level strip: the total at each level, where a tap switches the package;
- a bar of the total by section;
- "Planning estimate: rates as of [date] for [city]", naming any section whose rates are provisional (A7);
- the split, when movable sections are on.

The section cards follow (A8).

**The count:**
- every kind asks six questions, and the site check asserts six;
- it separately asserts the number of sections shown for each kind;
- so neither grows unseen (brief-first §4).

### A4. Five levels, a slider for each section, and brands

**The levels** (on screen, the market's words: the owner's choice on 02-10-2026, A18 decision 3, D-UX-19; level 5 renamed Bespoke by the owner on 03-10-2026, D-UX-20):

| Your word | On screen | What it means |
|---|---|---|
| Modest | Basic | Sound and simple: ISI-marked materials, the economy ranges of known brands, nothing decorative |
| Upper (middle) class | Standard | What most new flats are sold with: branded mid-range materials and a few comforts |
| High | Premium | Premium Indian and mainstream international brands, better finishes, more lighting |
| Luxury | Luxury | International premium brands, natural stone, designer finishes, tiles to the ceiling |
| Ultra luxury | Bespoke | Imported designer brands, bespoke joinery, Italian marble, home automation |

The market already sells levels this way. House builders sell three or four packages by the sq ft, one of them up to "Ultra-Luxury", and interior firms sell three (B10).

**How the levels work:**
- **The package** (the level chosen in question 6) sets every section.
- **Each section has a slider with five stops.**
  - Moving it changes that section's items, their specifications and their rates at once, and the total follows.
  - The package's stop stays marked, so the card can show "+Rs. X over the package".
- **Each item can be set on its own.** Opening it shows its ladder of five levels, each with its specification, brands as examples and rate. The user picks one, and the section's slider then shows "Mixed".
- **Order of precedence:** an item's own choice, then a room's level (A8), then the section's slider, then the package.
- **The sliders snap to the five stops.** A position between stops would invent a product that does not exist: there is nothing halfway between a vitrified tile and Italian marble.

**Brands:**
- **Priced by level, not by product.**
  - Each level lists the brands sold at that level as examples, and one rate covers them.
  - Product prices change monthly and run to tens of thousands of codes; a level's rate can be kept current.
- **Choosing a brand chip at a level** sets the item to that level and names the brand in the documents.
- **With no brand chosen,** the document says "brand X, Y or equivalent", as quotations do (B2).
- **A price for an exact product:** the user types it, and the item shows "your rate" and where it came from.

**What never moves with the slider (fixed specification):**
- the structure;
- the waterproofing system;
- the wire grade and the earthing;
- the distribution board's MCBs and RCCB;
- the pipe grades.

The slider changes finishes and brands, never safety. Builders' packages do the same: each one builds to the same structural standard (B10).

### A5. How the estimate is worked out from a few facts

**1. Rooms from the BHK and the area.**
- A room table for each BHK gives each room's usual share of the carpet area, from reported layouts. B10 has two for a 2BHK; the others are still to be found. The rooms are:
  - living and dining;
  - kitchen;
  - bedrooms;
  - bathrooms;
  - balcony;
  - passage.
- It is scaled to the user's area.
- Each room is compared with the National Building Code's minimums, as reported (B10):
  - a habitable room: 9.5 sq m, and 2.4 m wide;
  - a kitchen: 5.0 sq m;
  - a bathroom: 1.8 sq m.
- A room below its minimum is flagged ("the area seems small for 3 bedrooms") and not changed.
- For a house, the carpet area comes first from the built-up area, less the walls (A13).

**2. Heights.**
- The ceiling height comes from the data file. The Code's minimum for a habitable room is 2.75 m, as reported, and flats are often higher.
- The user can change it.

**3. Room templates: the list an architect would make.** Each kind of room has a template of items for each kind of work, each item with a quantity rule. For example, a bathroom being renovated:

| Item | Quantity rule | Moves with the level? |
|---|---|---|
| Dismantling the old tiles and fittings | Floor L × B; walls: perimeter × tile height, less the door | No |
| Debris removal | Per bathroom | No |
| Waterproofing: the floor, a strip up the walls, the shower walls | Floor + perimeter × the strip's height + the shower walls | No (fixed) |
| Floor tiles, anti-skid | L × B, plus wastage | Yes |
| Wall tiles | (Perimeter × tile height − the door), plus wastage. The level sets the height: 7 ft, 8 ft or to the ceiling (B10) | Yes |
| WC | 1 | Yes |
| Wash basin or vanity | 1 | Yes |
| Fittings: basin mixer, shower with diverter, health faucet, angle valves | 1 set | Yes |
| Shower partition or enclosure | 1, from Standard up | Yes |
| Accessories and mirror | 1 set | Yes |
| Floor trap and drain | 1 | No |
| Water supply and drainage points | By fixture | No (fixed) |
| Electrical: light, exhaust, geyser power point, socket | By the points rule (B10) | Fittings only |
| Ceiling, moisture-resistant | L × B | Yes |
| Door, water-resistant | 1 | Yes |

- There is a template for each kind of room (living and dining, bedroom, kitchen, bathroom, balcony, passage, puja room, study) and each kind of work.
- The quantity rules follow the IS 1200 measurement rules (A13): walls less openings, skirting less the door widths, a cove by running length.
- The wastage, the strip heights and the points come from the data files, each with its source. They are to be read from their primary texts before use (B9).

**4. Rates.**
- Each item's rate at its level comes from the library (A7).
- It is scaled to the city by the cost index: rate × (the city's index ÷ the index of the city the rate is for).
- When the city has no index, the rate is used as it is and the page says so.

**5. The method.** It is version 1's, less the loan:
1. each item: quantity × rate;
2. each section and each room: the sum of its items. A section total is always shown;
3. the total of the works;
4. GST, by the basis the library gives for each rate: included, or extra at the item's rate;
5. contingency: none, or a % under More options;
6. other costs, under More options;
7. the total estimated cost, and the cost per sq ft naming the area;
8. the split: fixed items against movable items and appliances, each with its share of GST and contingency, pro rata;
9. the total in Indian words;
10. the stages, when given, adding up to 100%.

The five-level strip is the same method run at each level.

**6. Worked twice.** Quantities, rates and totals are worked out a second time by a different route (`estimate-plan-check.ts`), as everywhere in the engine. The figures are withheld when the two disagree.

**7. Every assumption is shown.**
- Each item has a "how we worked this out" line. It names the room, the rule, the height, the wastage and the source.
- Nothing is defaulted silently. An assumption from the data files is listed with its reason (D-UX-08).

### A6. Sections and what each level puts in them

These ladders are a proposal drawn from the packages and comparisons in B10:
- the brands are examples;
- rates are not shown here, because they come from the library with their sources (A7);
- the library session confirms each rung against its source before it enters a data file.

**Flooring** (sq ft; fixed):

| | Basic | Standard | Premium | Luxury | Bespoke |
|---|---|---|---|---|---|
| Floor | Vitrified tiles, 600 × 600 | Vitrified tiles, 800 × 800 or 600 × 1200 | Large glazed vitrified tiles (800 × 1600), or engineered wood in the bedrooms | Indian marble, large slabs or engineered hardwood | Italian marble, or solid hardwood |
| Skirting | Tile | Tile | Tile or wood | Matching stone or wood | Stone or wood, flush with the wall |

**Walls and paint** (sq ft of wall and ceiling; fixed):

| | Basic | Standard | Premium | Luxury | Bespoke |
|---|---|---|---|---|---|
| Walls and ceilings | Putty, primer and two coats of an economy emulsion (e.g. Asian Paints Tractor) | A premium emulsion (e.g. Apcolite Premium) | A luxury emulsion (e.g. Royale Luxury) | The top emulsions (e.g. Royale Aspira), and a feature wall in texture or wallpaper | Designer finishes: lime or Venetian plaster, imported wallpaper, panelling |
| Doors and grills | Enamel | Enamel | PU or melamine on wood | PU | PU or lacquer |

**Ceiling** (sq ft; cove by rft; fixed):

| | Basic | Standard | Premium | Luxury | Bespoke |
|---|---|---|---|---|---|
| False ceiling | None: paint only | A POP or gypsum border in the living room and main bedroom, with a cove | Gypsum board in the living and dining rooms and all bedrooms, with coves | Gypsum with wood or veneer accents and profile lights | Designer: wood slats, stretch or acoustic ceilings with built-in linear lights |

**Bathrooms** (per bathroom; fixed):

| | Basic | Standard | Premium | Luxury | Bespoke |
|---|---|---|---|---|---|
| Wall tiles | 7 ft, ceramic | 8 ft, vitrified | To the ceiling, glazed vitrified | To the ceiling, large slabs and a feature wall | To the ceiling, natural stone |
| WC | Floor-mounted (Parryware, Hindware, Cera) | Floor-mounted or wall-hung (Cera, Hindware, Jaquar) | Wall-hung with a concealed cistern (Jaquar, Kohler) | Kohler, Duravit, Toto, Villeroy & Boch | Smart WC; the top ranges of the same |
| Fittings (mixer, shower, diverter) | Cera, Hindware | Jaquar or Kohler, with a diverter | Thermostatic: Kohler, Grohe | Grohe, Hansgrohe, rain showers | Axor, Gessi, Dornbracht |
| Shower area | Curtain rail | Fixed glass partition | Toughened glass partition | Frameless glass enclosure | Bespoke enclosure |
| Basin | Wall-hung basin | Counter basin on granite | Vanity unit | Designer vanity with a quartz top | Bespoke stone vanity |

**Kitchen** (cabinets by sq ft of face or rft; counter by rft; fixed. The chimney and hob are appliances):

| | Basic | Standard | Premium | Luxury | Bespoke |
|---|---|---|---|---|---|
| Cabinets | BWR ply base units, MR ply or MDF wall units, laminate | BWR ply throughout, laminate | BWP ply, acrylic shutters | BWP ply, PU lacquer or glass shutters | Imported or bespoke systems: veneer, lacquer |
| Hardware | Ebco | Hettich or Hafele hinges and channels | Hettich or Hafele, with tandem drawers | Blum | Blum, with powered and imported fittings |
| Counter | Granite | Granite, a better grade | Quartz | Premium quartz or solid surface | Italian marble or sintered stone |

**Wardrobes and storage** (sq ft of shutter face; fixed):

| | Basic | Standard | Premium | Luxury | Bespoke |
|---|---|---|---|---|---|
| Wardrobe | Hinged; MR or BWR ply; laminate | Hinged, with a loft; BWR ply; laminate | Sliding, with a loft; acrylic or laminate | Floor to ceiling, sliding; PU or veneer | Walk-in; glass, veneer or leather, with lighting |
| Hardware | Ebco | Hettich | Hettich or Hafele | Hafele or Blum | Blum |

The TV unit, shoe rack, crockery unit and study take the same board and finish as their level.

**Doors and windows** (doors by number; windows by sq ft; fixed):

| | Basic | Standard | Premium | Luxury | Bespoke |
|---|---|---|---|---|---|
| Main door | Flush door, teak frame, veneer | Solid teak | 8 ft teak, with a digital or biometric lock | Designer veneer or pivot door, smart lock | Bespoke pivot door |
| Room doors | Flush, laminate | Flush, laminate both sides, hardwood frame | Membrane or veneer | Veneer or PU, concealed hinges | Full height, flush with the wall |
| Windows | Aluminium, 2.5-track | Aluminium 3-track with mesh, or UPVC | UPVC 3-track, steel mesh | UPVC, acoustic double glazing | System aluminium, double glazed |
| Grills | MS | MS | MS or SS | SS, or invisible grills | Invisible grills |

**Electrical and lights** (points and numbers; fixed, with light fittings as appliances as in version 1):

| | Basic | Standard | Premium | Luxury | Bespoke |
|---|---|---|---|---|---|
| Switches and sockets | Anchor Roma or GM | Legrand Mylinc or Schneider | Legrand Arteor or Schneider Zencelo | Glass or metal plates in the premium ranges | Imported ranges, or smart (KNX) controls |
| Points | By room (A5) | By room | More, for coves and accents | More, for profile lights | More, with smart circuits |
| Lights | LED battens and panels | Panels and downlights | COB downlights, cove strips | Profile and track lights | Architectural and smart lighting |
| Fans | Standard | BLDC | Designer BLDC | Designer | Designer, or concealed |

At every level, fixed:
- FR copper wire (e.g. Finolex, Polycab, Havells);
- a distribution board with MCBs and an RCCB;
- earthing.

**Sections with one specification (no slider):**
- **Civil and repairs:** dismantling, debris removal, new partitions (AAC blocks), plaster, structural repairs, making good.
- **Waterproofing.**
- **Plumbing:** CPVC for hot water, UPVC for cold, SWR for drainage. The concealed valves follow the bathroom's level.

The specification comes from the schedule of rates (A7), to be checked against CPWD's specifications.

**Movable sections:** levels come in E3.
- Furniture (beds, sofas, dining, study): movable.
- Soft furnishings (curtains, blinds): movable.
- Appliances (chimney, hob, AC, geyser, purifier): appliance.
- Smart home and security (video door phone, smart lock, automation): fixed or appliance.

They are on for Interiors and off for Repair (decision 4).

**For a house, added:**
- Terrace and exterior: the roof's waterproofing (fixed), exterior paint by level, railings;
- External works: compound wall, gate, paving, drainage;
- Water: sump, tank, borewell, rainwater harvesting.

For building and extensions, the structure is costed by stages at one specification (E5).

**The often-forgotten lists** of version 1 (for building, renovation and interiors) move to Other costs in More options (A10).

### A7. The library: where every rate comes from

**What it holds, for each item:**
- the section, and the kinds of room it belongs to;
- the unit, and the kind of item (fixed, movable or appliance);
- the quantity rule, and whether its specification is fixed;
- for each level:
  - the specification;
  - the brands, as examples;
  - the rate, and the city the rate is for;
  - whether GST is in the rate;
  - the source, its class (below) and its date.

**Where the rates come from, in order of preference:**
1. **An official schedule of rates:** the CPWD Delhi Schedule of Rates (DSR 2023, with its correction slips), item by item with its specification, scaled to the city by CPWD's cost index. This is the yardstick lenders' panel engineers know (B4), and it usually fits Basic or Standard.
2. **A brand's own dated price list**, for the materials of the higher levels, with the laying or fixing labour taken from the schedule. This is a rate analysis (A11).
3. **A package's published allowance**, where the market prices by allowance: tiles at so much a sq ft, fittings at so much a set. It comes from the builders' and interior firms' published specifications, dated (B10). In Indian estimates this is a prime-cost (PC) item.
4. **Market ranges as reported** (rate guides and forums): only as the check band (A14), never as the rate. The exception is if the owner accepts them for a first version (decision 1). The section is then marked "Provisional" on the page and in the documents.

**Why this order:**
- Rate guides disagree by two to three times for the same item (B10).
- A library built from them would look exact and be unreliable, and a valuer cannot check a guide.

**City:**
- CPWD publishes cost indices for places (B10).
- The library keeps each rate's own city, and the engine scales it (A5).
- A place with no index uses the rate as it is, and the page says so.

**Upkeep:**
- every value has a date, and the page and the document show "rates as of [date]";
- a refresh every six months, after CPWD's index of 1 April and of 1 October and the brands' price-list changes;
- a test fails when a value has no source, class or date, and warns when a value is over 12 months old.

**Size:**
- The flat's sections in A6 come to about 80 items × 5 levels, many of them sharing a source.
- Building it takes 3 to 4 sessions of reading schedules, price lists and packages, one section at a time, alongside the screens (A17).

**What it needs:**
- The session's network must reach the sources:
  - `cpwd.gov.in`;
  - `archive.org` and `law.resource.org` (Indian Standards);
  - the brands' and firms' sites (B9).
- Today they are blocked.

**Version 3, as built:**
- Every rate is from classes 2 to 4, read through search summaries because the pages are blocked, and marked "as reported, not yet checked" (A18, decision 1).
- Class 1 (CPWD's schedule) is not yet used: its items and the cities' indices could not be read.
- The city factor comes instead from one reported table of construction cost per sq ft in six cities. It scales labour and fitted rates, not products; other places use the rates as they are.
- When the network opens, each source is read, its figure checked and the source marked as checked (E2).

### A8. The screen

Phone first (390 px), then desktop. The amounts below are letters: every figure comes from the engine.

```
┌──────────────── 390 px ────────────────┐
│ Renovate · Flat · Pune · 850 sq ft      │
│ 2 BHK · Standard               [Change] │
├─────────────────────────────────────────┤
│ Rs. A                                   │
│ Rs. B a sq ft of carpet area            │
│ Basic  Standard  Premium  Luxury  Ultra │
│ Rs. P  [Rs. A]   Rs. Q    Rs. R   Rs. S │
│ ▇▇▇▇▇▇▅▅▅▅▃▃▃▂▂  the total by section    │
│ Planning estimate · rates as of [date]  │
│ 2 bathrooms (change)                    │
├─────────────────────────────────────────┤
│ Flooring                           [on] │
│ ○────●────○────○────○                   │
│ Vitrified tiles, 800 × 800              │
│ 5 rooms, from your 2 BHK                │
│ Rs. C               +Rs. D over package │
│ See the 3 items ›                       │
├─────────────────────────────────────────┤
│ Bathrooms (2)                      [on] │
│ ○────○────○────●────○                   │
│ Wall-hung WCs, thermostatic showers,    │
│ tiles to the ceiling                    │
│ Rs. E               +Rs. F over package │
│ See the 14 items ›                      │
├─────────────────────────────────────────┤
│ …                                       │
╞═════════════════════════════════════════╡
│ Total Rs. A                [Download ▾] │
└─────────────────────────────────────────┘
```

**Its parts:**
1. **The questions** (A3), kept compact. After the first estimate they fold into one line with a Change button.
2. **The answer:**
   - the total and the cost per sq ft;
   - the five-level strip, each level's total, where a tap switches the package;
   - the bar of the total by section, where a tap jumps to the section.
3. **Section cards,** one for each section of the kind. Each has:
   - an on/off switch;
   - the slider, with the package's stop marked;
   - the specification at this level, in one line;
   - the quantity and where it came from, in one line;
   - the amount, and the change from the package;
   - "See the items".
4. **The item drawer:**
   - the item's ladder of five levels, each with its specification, brand chips and rate;
   - "My own brand and rate";
   - the quantity, with "how we worked this out" and a way to change the room it came from;
   - fixed, movable or appliance.
5. **Rooms:**
   - the rooms as a list, or as tiles sized by area;
   - each with its size, which can be changed;
   - bathrooms and bedrooms can have their own level: a main bathroom at Luxury while the others stay Standard.
6. **What changed:** after a slider moves, one line says what changed and by how much. For example: "Bathrooms to Luxury: wall-hung WCs, thermostatic showers, glass enclosures, tiles to the ceiling; +Rs. F".
7. **A bar fixed at the bottom on a phone,** with the total and Download.
8. **Compare** (on a desktop, or a tab on a phone): the sections down the side and the five levels across, with the user's choices marked.

**What the screen must not do:**
- show a figure the engine did not work out. All five levels are engine runs;
- show product photos or brand logos. Generic icons only;
- stop a slider between levels.

**Accessibility:**
- each slider is a range input with five stops, and it reads out the level's name;
- every control works from the keyboard;
- the totals are text, not only bars.

**Later, only if wanted: "Fit my budget".** The user types a budget, and the engine finds the highest level for each section that fits, by a fixed search. It is shown as a suggestion.

### A9. With a quotation in hand, and quotes against the estimate

**"Have a quotation already? Enter it."** This opens version 1's path:
- item rows, each with a head, quantity, unit and rate, or a lump sum;
- GST three ways;
- who gave the rates, and when.

The page then:
- matches each line to a library item by its head, and shows the library's range for each level;
- flags a line far outside it: "check this rate";
- lists what the library would include that the quotation leaves out: "not in your quotation: waterproofing, debris removal";
- makes the same documents (A15), titled as the contractor's estimate, entered by the user.

**The bill of quantities for quotes:**
- A download of the estimate's lines, with their specifications and quantities, and the rate and amount columns left blank.
- The owner gives it to two or three contractors, who quote like for like.
- The quotes come back through the path above.

This turns the tool's estimate into firm prices, which is what a lender finances.

### A10. More options: one closed section, four groups

1. **Property and permissions:**
   - the plot area and the number of floors;
   - the approved plan's number and date (building and extensions);
   - the society's permission: obtained, to apply for, or not a society;
   - "Does the work change walls, columns, beams, slabs or a balcony?"
   - the property's age, which suggests rewiring and new pipes when old (A14).
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

   It carries the often-forgotten list for the kind:
   - **for building:** the architect's and structural engineer's fees; plan approval and development charges; the labour welfare cess; temporary electricity and water; the electricity and water connections and their deposits; debris removal; curing water and site security; insurance; escalation on a long job; occupancy-certificate fees;
   - **for extensions:** the same, and the structural stability certificate;
   - **for renovation:** the society's permission and its refundable deposit; protecting the lift and lobby; debris disposal; shifting, storage and a temporary stay; an engineer's certificate when the structure is touched; rewiring and a larger distribution board for new loads (AC, induction); making good after dismantling; final cleaning;
   - **for interiors:** transport and offloading; civil and plumbing preparation; the design fee; changes after the design is frozen; GST.

   Each line, when ticked, asks for an amount, or can be marked "not needed".
4. **Your rooms:**
   - each room's size and height, with its doors and windows;
   - added rooms: a study, a puja room, a utility;
   - the areas, worked out by IS 1200 (A13).

   The quantities follow.

The loan group is gone (owner, 02-10-2026).

### A11. The professional page (behind "Preparing estimates for clients? Use the full form")

- **An item grid:**
  - the item number;
  - a schedule-of-rates reference (such as a DSR item) or the library item and level;
  - the description with its specification (make, grade, thickness);
  - the room or floor;
  - the quantity, from a measurement sheet (L × B × H × number, less deductions);
  - the unit and the rate;
  - the rate's basis and source;
  - the GST rate of the item;
  - fixed, movable or appliance;
  - paid to: the contractor, a supplier, or bought by the owner.
- **The professional's own rates:** any library rate can be replaced, with its basis.
- **Rate analysis, optional:** materials (from price lists) + labour + tools and sundries, then water charges of 1% and the contractor's profit and overheads of 15%, which is the CPWD convention (B4). Only here are profit and overheads added; the library's rates already include them.
- **The abstract by section or by room,** over several floors or blocks.
- **Additions:**
  - escalation a year, for long jobs;
  - contingency, fees and statutory costs.
- **A stage-wise schedule for building:** foundation, plinth, each slab, masonry and plaster, finishing. The % are set per lender, and the amounts are worked out.
- **The preparer's header and signature block:**
  - the firm, its GSTIN and PAN, the quotation number and the date;
  - the name and qualification;
  - the registration number (COA for an architect; the chartered-engineer or registered-valuer number).
- **Paste rows from Excel** (description, quantity, unit, rate).
- **Save the estimate as a file to reuse** for the next client. It stays in the browser, with no server.

### A12. Which input answers which later question

This is the owner's "high value items of information". Each input is asked once and answers the questions that come later.

| Input | Answers (who asks) | Where |
|---|---|---|
| Kind of work | Which loan; which sections; which area; the document's title (lender) | Default |
| Flat or house; floors | Which sections (terrace, exterior, external works); the structure's stages | Default |
| City | The rates, through the cost index | Default |
| Carpet or built-up area | The rooms' sizes; the cost per sq ft (valuer); the quantity checks | Default |
| Bedrooms (BHK) | The rooms, and so every quantity | Default |
| Level | Every specification, brand and rate | Default |
| Sliders, item choices, brands | The specification of each section and item; the brands in the documents | On the result |
| Owner's name | Must match the property papers (lender, valuer) | Download |
| Site address | The property the loan is against; the valuer's visit | Download |
| Plot area, floors | The built-up area against the plot; local FSI rules (flagged, not checked) | More options |
| Approved plan number and date | The lender's must-have for building and extensions | More options |
| Society permission; structural change | The society's permission for a flat; the engineer's certificate; municipal approval for a balcony enclosure (B6) | More options |
| Property's age | Whether to suggest rewiring and new pipes | More options |
| Contractor's GSTIN, PAN, address | The GST check; paying the contractor directly | More options |
| Quotation number, valid till, time to finish | The vetting date; escalation; the stage plan | More options |
| Payment stages | When each part of the loan is paid out (B1) | More options |
| What is not included | Disputes, and the complete cost (B2, B7) | More options |
| Bank account for payment | Direct payment by the lender | More options |
| Contingency, fees, approvals, cess, connections | The complete cost (often forgotten, B7) | More options |
| Rooms and openings | Quantities and their checks | More options |
| Fixed, movable or appliance | What lenders finance (B1) | Set by the library; changeable in the item drawer |
| Schedule-of-rates references, own rates, rate analysis, measurement sheets, signature details | A professional's estimate that a valuer can vet line by line | Professional page |

**Not asked:**
- material quantities (cement bags, steel kg) and labour, which are worked out from the items;
- the property's market value, which is the valuer's job;
- the contractor's experience;
- what the estimate is for (lender, quotes or a budget): one document serves all (B11).

### A13. Areas: what each means, which to use, how to work it out

| Area | What it is | Use it for |
|---|---|---|
| Carpet area (RERA, section 2(k)) | The net usable floor area of a flat, including internal partition walls, excluding external walls, service shafts, an exclusive balcony or verandah and an exclusive open terrace. It is printed in every RERA agreement for sale. | Repairs, renovation and interiors of a flat; the rooms' sizes; flooring, ceiling and painting checks |
| Plinth or built-up area (IS 3861:2002) | The covered area at floor level including walls, shafts, staircases and lift wells. A covered balcony or verandah counts in full and an uncovered one at 50% (as reported). Lengths are taken to 0.01 m and areas to 0.01 sq m. | Building and extensions; plinth-area rates are per sq m of this area |
| Super built-up (saleable) area | Built-up area plus a share of the common areas (the "loading") | Not used in an estimate; developers quote it |
| Plot area and FSI | Local rules cap the total built-up area at plot × FSI and limit the ground coverage | Flag only: the rules are local and change |

**Working the areas out:**
- **Carpet area from the rooms:** the sum of each room's internal length × breadth, plus the internal partition walls' footprint.
- **Built-up area:** the carpet area plus the footprint of the external walls and shafts, plus balconies by the IS 3861 rule.

Reported ratios are given below. They are for planning only, and they are never used silently or put in a document:
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
- **Joinery:**
  - doors and windows by number and size;
  - carpentry by the face area of its shutters (sq ft);
  - a kitchen by running length, or as a set;
  - electrical work by points.

### A14. Checks the page runs (flags, never refusals)

- **Arithmetic, worked twice:**
  - each line, each section, each room, the GST, the contingency, the total, the split, the stages and the five levels;
  - when the user types a quotation's own amount and it differs from quantity × rate by more than Re. 1, it is flagged (the paisa in B2).
- **The rooms worked out:**
  - a room below the Code's minimum;
  - floor areas adding up to more than the carpet area.
- **Rates:**
  - a typed rate far outside the library's band for its level;
  - a section running on provisional rates;
  - rates over 12 months old;
  - a city without an index.
- **Missing for the lender** ("Before you go to the lender"):
  - the owner's name and the site address;
  - for building and extensions, the approved plan;
  - from a quotation (A9): the area, GST, the basis of rates, and an item with a description but no amount ("the valuer will ask"; the sample had three, B2);
  - payment stages that do not add up to 100%.
- **Consistency:**
  - a floor or ceiling area larger than the carpet area: "is a balcony or terrace included?";
  - paint area outside 2.5 to 3.5 × the carpet area (a rule of thumb, with its source, from a data file);
  - a head named under "not included" that also has priced items (B2);
  - the same line twice;
  - a GST rate other than the current slabs;
  - a quotation past its "valid till" date.
- **The property's age:** an old property, from More options, suggests switching on rewiring and new pipes. It is never forced (B11).
- **Financing:** when movable sections are on, the split, with "some lenders finance furnishing within limits; others do not" (B1).
- **Permissions:**
  - a structural change brings the engineer's certificate and the society's and municipal approval;
  - a balcony enclosure may need municipal approval (B6).
- **A section set far above the others** is not flagged. It is the user's choice.
- **Later (E5):** a building's cost per sq ft far outside the CPWD plinth-area range for its city.

### A15. What the lender gets (PDF, Excel, Word)

The documents follow the DSCR statement's rules (D-DOC-04 to 06): facts and working, no assumptions or checks on page 1, every line kept.

**Page 1, the estimate of cost:**
- **The title** follows the kind: "Estimate of cost of construction", "of an extension", "of renovation" or "of interiors and furnishing".
- **Under the title:** "Planning estimate prepared with [the site] on [date]". The sources are not in the documents (D-DOC-09).
  - When a contractor, architect or engineer adopts it on the professional page and signs it, their name, registration and signature replace this line.
- **The facts:**
  - the owners;
  - the property (the site address);
  - the work;
  - the area (sq ft, with sq m);
  - the city and the level;
  - prepared by (name, qualification, registration number when given);
  - the date of the rates.
- **The abstract of cost by section:** serial number, section and amount. Then the works total, GST, contingency, other costs, and the total estimated cost in figures and in words.
- **The cost per sq ft.**
- **The split**, when there are movable items or appliances.
- **The signature block.**

**Annex 1, the detailed estimate:** every item under its section (or its room), with:
- number;
- description and specification, with the brand chosen, or "brand X, Y or equivalent";
- level;
- quantity, unit, rate and amount;
- section totals.

**The annexes** are numbered in the order the document holds them, with no gap (D-DOC-09): Annex 1, the detailed estimate; then, when given, the terms and the measurements; then what the estimate assumes. A planning estimate has Annex 1 and Annex 2 (what it assumes).

**The terms,** when given:
- the payment stages with amounts;
- the time to finish and the date the quote is valid till;
- what is not included;
- the contractor's name, address, GSTIN and PAN;
- the bank account for payment.

**What the estimate assumes,** one line each, without reasons or sources (the owner, 03-10-2026):
- the rooms and sizes used, the bathrooms, the heights, the doors and windows, the electrical points;
- for a new house, its outline, its floors and the structure's rules of thumb;
- not what page 1 already says (the city, the date of the rates, the sections).

The sources stay in the data and on the page.

**The measurements,** when the rooms were measured.

**Never in it:**
- a valuer's or panel engineer's certificate or opinion. That is their own document, after their inspection (B11);
- the loan or the EMI;
- the flags and the five-level strip.

**The bill of quantities for quotes** (A9) is a separate download.

### A16. Data and engine

**Built in version 3:**
- `engine/data/architect.json`: the architect's rules: levels, sections and kinds, room programmes, shares, proportions, height, minimums, openings, IS 1200, skirting, tile heights, waterproofing, kitchen, wardrobes, false ceilings, feature walls, points, plumbing, ACs, debris, making good, cities, GST, checks, and each room's template.
- `engine/data/library/*.json`: the 15 files of families and items, and `labour.json`.
- `engine/data/sources.json`: every source, with its class.
- `engine/library.ts`: loads the library; a family's five-level ladder; unit conversions; an item's price.
- `engine/architect.ts`: rooms, openings, measurement, the lines, the totals, the strip, the assumptions and the flags.
- `engine/architect-check.ts`: the second computation.
- `tests/library.test.ts` and `tests/architect.test.ts`.
- `scripts/rules-doc.mjs` writes `docs/RULES.md` and `docs/LIBRARY.md` from the data; CI fails when either is stale.

**Built in E1 (03-10-2026):** `overPackage` and `choicesFor` in `engine/architect.ts`, `checkRate` in `engine/architect-check.ts` (D-TECH-16); the page in `site/src/estimate/plan-model.ts` and `PlanEstimate.tsx`; the document in `plan-document.ts` on the `lender-documents` pipeline (D-DOC-08); tests in `tests/plan-page.test.ts`.

**Built for a new house (03-10-2026, D-UX-23, D-DATA-04):** `houseOf` and `measureHouse` in `engine/architect.ts`, drawn again its own way in `architect-check.ts`; the `house` rules in `architect.json`; the structure's materials, labour and treatment in `structure.json`.

**Still to come:** `engine/areas.ts` as in version 1; the total in words is `rupeesWords` in `engine/util.ts`.

### A17. Build order: thin versions, one session each, merged by the owner

| Step | Delivers | Done when |
|---|---|---|
| E0 | Done in version 3: the architect engine and the library, worked twice and tested (A0) | Merged by the owner |
| E1 | Built on 03-10-2026 (D-UX-21, D-DOC-08). The page on the engine, for a flat, every section: the six questions; the five-level strip, the section bar, the sliders, and the item drawer with the library's alternatives; the assumptions and flags; the planning-estimate PDF, Excel and Word with Annexes 1 and 3; the field count asserted | The owner tries it on a phone and a desktop and says it feels simple |
| E2 | The library checked against its sources, page by page, once the network allows; the owner's fictional flat, worked at home, as a test | Every level's item checked, or marked as not |
| E3 | Built on 03-10-2026 (D-UX-25, D-TECH-18, D-DATA-05). Rooms (sizes, a room's own level, for any room), What changed and Compare; the movable sections (Furniture, Soft furnishings, Appliances, Smart home) with the split | As above |
| E4 | A quotation in hand, and the bill of quantities for quotes (A9) | As above |
| E5 | A house. **Built thin on 03-10-2026 (D-UX-23):** Build a new house, with the floors and the built-up area, the structure at one specification, the terrace, the outside walls and the stair railing. **Still to come:** the structure by stages, External works, Water, Add a floor, a renovated house's own works, CPWD's plinth-area range as a check | The owner has checked `cost-index.json` and the plinth-area rates against the official texts |
| E6 | More options (A10); the terms and measurements annexes | As above |
| E7 | The professional page (A11) | A professional the owner trusts uses it for one real estimate of their own |
| E8 | Later, only if wanted: Fit my budget (A8) | As above |

**Test cases** are the owner's fictional cases worked at home, one for each kind. They are never the sample PDFs, which belong to real people.

### A18. Decisions for the owner

**Version 3 (02-10-2026):**
- **Decision 1 is taken on the owner's "create a vast library":** the rates are classes 2 to 4 as reported, marked, until each is checked (A7). Say if you would rather wait for the primary texts.
- **Decision 5 changes:** the engine and the library are built for every section of a flat (A0), so E1 is the page and the documents on them.
- **Decisions 3 and 4 answered by the owner on 02-10-2026, as recommended (D-UX-19):** Basic to Ultra luxury on screen (level 5 renamed Bespoke on 03-10-2026, D-UX-20), with your words kept beside them in the data; movable items in sections of their own, on for Interiors and off for Repair. Appliances and Smart home already work this way; Furniture and Soft furnishings join on the same rule in E3.
- **Decision 2 stands as recommended below.**


**Answered by the owner on 02-10-2026:**
- the loan, your share and the EMI go;
- the tool supplies rates, through a library;
- it works the quantities out from a few facts.

That settles version 1's decisions 1 and 4. Its decisions 3 and 5 are now in A1 and A15, and its decision 2 is decision 4 below.

1. **Where the rates come from.**
   - The alternative is web ranges as the rates, for a quick first version, marked "Provisional".
   - **Recommended:** classes 1 to 3 of A7: CPWD's schedule scaled by the city's index, the brands' price lists, and the published package allowances. Web ranges are checks only.
   - Either way, the session's network must reach the sources (A7).
2. **What the document says it is.**
   - Lenders finance a quotation, or an estimate signed by an architect or engineer, vetted by their panel engineer (B2). A generated estimate passed off as a contractor's quotation would be refused, and would not be honest.
   - **Recommended:** "Planning estimate" with its sources, until a contractor, architect or engineer adopts and signs it. Also the bill of quantities, for contractors to quote against.
3. **The level names.**
   - **Recommended:** Basic, Standard, Premium, Luxury and Ultra luxury. These are the words buyers see in builders' and interior firms' packages. They map to your modest, upper (middle) class, high, luxury and ultra luxury.
   - Say if you want your words on screen instead.
4. **Movable furniture and appliances** (version 1's decision 2).
   - **Recommended:** sections of their own, on for Interiors and off for Repair, with the split on the page and in the abstract. Flag; do not restrict.
5. **What the first build covers.**
   - **Recommended:** E1 as in A17, a flat with three sections end to end, so you can feel the sliders before the library grows.

**Smaller choices, decided unless the owner says otherwise:**
- safety keeps one specification at every level (A4);
- brands are priced by level, not by product (A4);
- the sliders snap to the five stops (A4);
- one estimate can mix renovation and interiors sections (A2);
- the contractor's bank account appears only when entered, and only in the terms' annex.

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

**Version 2: the library (B10)**

49. Brick & Bolt: [Bengaluru cost calculator](https://www.bricknbolt.com/home-construction-cost-calculator-in-bengaluru), [cost estimator](https://www.bricknbolt.com/cost-estimator)
50. Buildgrid: [packages from Basic to Ultra-Luxury](https://buildgrid.in/2026/03/08/house-construction-packages-in-bangalore-basic-to-ultra-luxury-compared/)
51. Indecimal: [package comparison](https://www.indecimal.com/compare-package)
52. Livspace: [price calculator](https://www.livspace.com/in/interiors/home-interior-price-calculator), [2BHK cost](https://www.livspace.com/in/magazine/breakup-of-2-bhk-interior-design-cost), [1BHK cost](https://www.livspace.com/in/magazine/calculate-the-average-cost-of-a-1-bhk-flat-interior-design)
53. Hardware: [Homeli](https://homeli.in/hettich-hafele-blum-hardware-care-guide), [Metal and More](https://metalandmore.in/hettich-vs-hafele-vs-ebco-kitchen-hardware/), [Welcome Kitchen World](https://www.welcomekitchenworld.com/hettich-vs-blum-vs-hafele-which-kitchen-hardware-brand-is-best-for-your-modular-kitchen-in-india-2026-guide/)
54. Bathroom brands: [De Ceramica, tiers](https://deceramica.in/top-bathroom-brands-india-2026/), [Valueline, a luxury showroom's brands](https://valueline.in/luxury-bathroom-showroom-in-delhi-ncr/), [Hart Design Selection](https://hartdesignselection.com/en/luxury-and-high-end-bathroom-guide-the-greatest-brands/)
55. Paint: [NoBroker, Asian Paints prices](https://www.nobroker.in/painting-services/home-painting-ideas/asian-paints-1-litre-price/), [AapkaPainter, Bengaluru](https://aapkapainter.com/blog/painting-cost-in-bangalore/), [AapkaPainter, Delhi](https://aapkapainter.com/blog/painting-cost-in-delhi/), [99acres](https://www.99acres.com/articles/costs-involved-in-painting-a-house.html)
56. Flooring: [Studio Matrx, Mumbai](https://www.studiomatrx.org/guides/flooring-cost-mumbai), [Ghar Ka Budget, tile laying](https://gharkabudget.com/articles/tile-laying-cost-per-sqft-2026/), [Comaron](https://www.comaron.com/blog/tiles-price-india-2026-ceramic-vitrified-marble-rates)
57. False ceiling: [Ghar Ka Budget](https://gharkabudget.com/articles/false-ceiling-cost-india/), [Varna Homes](https://varnahomes.in/blog/false-ceiling-cost-bangalore/), [Livspace](https://www.livspace.com/in/magazine/false-ceiling-cost)
58. Modular kitchens: [HouseYog](https://www.houseyog.com/blog/modular-kitchen-cost-in-india/), [3D Spaces](https://www.3dspaces.ai/blog/modular-kitchen-cost-per-sq-ft), [Holzbox](https://holzbox.in/blog/cost-breakdown-of-modular-kitchen-in-india/)
59. Wardrobes: [Elvenwood](https://elvenwood.in/wardrobe-cost-bangalore), [Limehouse](https://limehouse.in/wardrobe-cost-in-india-2025/), [RealCostIQ](https://realcostiq.com/in/wardrobe-cost-calculator/)
60. Bathrooms: [HomeLane](https://www.homelane.com/design-ideas/bathroom-design/bathroom-renovation-cost/), [Studio Matrx](https://www.studiomatrx.org/guides/bathroom-renovation-cost-india), [Aecord](https://aecord.com/blog/bathroom-renovation-cost-india-2026)
61. Electrical: [Goldmedal, points for a 2BHK or 3BHK](https://www.goldmedalindia.com/blog/2bhk-3bhk-electrical-layout-guide/), [Construction Estimator India](https://constructionestimatorindia.com/electrical-work-average-cost-estimates-in-india/), [Konn](https://www.konnworld.com/home-wiring-cost-india-a-2026-guide-to-electric-wire-and-installation/), [HomeLane, bedroom points](https://www.homelane.com/design-ideas/bedroom-design/bedroom-electrical-points/)
62. IS 4648:1968, guide for electrical layout in residential buildings: [Internet Archive](https://archive.org/details/gov.in.is.4648.1968), [law.resource.org](https://law.resource.org/pub/in/bis/S05/is.4648.1968.pdf). Found, not opened.
63. CPWD schedule of rates, as reported: [Nirman Dost, DSR in plain language](https://nirmandost.in/dsr/index.html), [NSR Civil, DSR 2023 correction slips](https://nsrcivil.in/cpwd-dsr-2023-corrections/), [DSR 2021 Vol. II](https://cpmgsupune.in/wp-content/uploads/2025/05/DSR2021-Vol-II.pdf)
64. CPWD cost indices: [NSR Civil, cost indices](https://nsrcivil.in/cost-indices/), [by state](https://nsrcivil.in/cpwd-building-cost-index-states/); PAR 2025 [6]
65. Room sizes: [NoBroker forum, 2BHK](https://www.nobroker.in/forum/how-many-square-feet-are-needed-for-a-spacious-2bhk/), [Civil Sir](https://civilsir.com/standard-size-of-1bhk-2bhk-3bhk-4bhk-flat-in-india/), [Square Yards](https://www.squareyards.com/sale/guides/what-is-2-bhk)
66. National Building Code 2016, Part 3 minimums, as reported: [Infralens](https://infralens.in/thumbrules), [Sobha](https://www.sobha.com/blog/national-building-code-of-india-residential-apartments/)
67. Wardrobe sizes: [WoodenStreet](https://www.woodenstreet.com/blog/standard-wardrobe-size), [McCoy Mart](https://mccoymart.com/post/standard-wardrobe-cabinet-size-dimensions-in-india/)
68. UltraTech: [home construction cost calculator](https://www.ultratechcement.com/for-homebuilders/homebuilding-explained/home-planning-tools/cost-calculator)

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
- **All rates in B4 to B6 and B10 are commercial or as reported.** They are evidence for the design, not values for the engine.
- **For the library (version 2), read before any value enters a data file:**
  - CPWD's DSR 2023 volumes and correction slips: each item's specification and rate, and whether GST is in the rates;
  - CPWD's latest cost-index circular, for the places' indices;
  - IS 4648:1968 (points for each room), and the National Building Code 2016, Parts 3 and 8;
  - the brands' dated price lists, for the ranges named in A6;
  - the builders' and interior firms' package pages, read in full and dated (B10).
- **The network:** allow `cpwd.gov.in`, `archive.org`, `law.resource.org` and the brands' and firms' sites, or give the library's sessions full network access.

### B10. The library: packages, brands, rates and quantities

**Packages are the market's own ladder of levels.** House builders sell levels by the sq ft, as reported:
- Brick & Bolt, Bengaluru: Basic Rs. 1,995, Classic Rs. 2,145, Premium Rs. 2,495 and Royale Rs. 2,750 [49];
- Buildgrid, Bengaluru: Basic Rs. 1,899, Standard Rs. 2,100, Luxury Rs. 3,000 and Ultra-Luxury Rs. 4,100 [50];
- Indecimal: Classic Rs. 1,969, Pure Rs. 2,299 and Premium Rs. 2,899 [51].

Every package builds to the same structural standard; the levels differ in finishes [49].

**Indecimal's comparison,** from its lowest package to its highest [51]:
- bathroom wall tiles: to 7 ft at a Rs. 60 a sq ft allowance; to 8 ft at Rs. 85; to the ceiling (10 ft) at Rs. 130;
- sanitaryware and fittings: Cera or Hindware; Jaquar or Kohler with diverters; Kohler or Grohe thermostatic;
- main door: a teak frame with a veneered flush door; solid African or Burma teak; an 8 ft teak door with a biometric lock;
- windows: Jindal aluminium 2.5-track; UPVC 3-track with steel mesh; acoustic double-glazed UPVC or Schüco;
- switches: Anchor Roma or GM; Legrand Mylinc or Schneider; Legrand Arteor or Schneider Zencelo.

**Other builders' Basic packages:**
- Buildgrid's: M20 concrete, Fe500 bars, red bricks or AAC blocks; flush doors, powder-coated aluminium sliding windows and MS grills; Parryware or Cera basic sanitaryware [50].
- Brick & Bolt's: flooring up to Rs. 50 a sq ft [49].

**Interior firms sell three levels:** Livspace's Essentials, Premium and Luxe [52].
- **Essentials:** kitchen base units in BWR ply, wall and loft units in MDF, wardrobes in MR ply or MDF, all in laminate.
- **Wardrobes by level:**
  - Essentials: a swing wardrobe with a loft;
  - Premium: an overlay sliding wardrobe with a loft;
  - Luxe: a sliding or floor-to-ceiling wardrobe.
- **A 2BHK's kitchen, as reported:** Rs. 2,00,000 (Essentials), Rs. 3,00,000 (Premium) and Rs. 4,50,000 (Luxe). Another of its pages gives Rs. 2,30,000, Rs. 3,50,000 and Rs. 5,00,000 as "starting" prices for the same.

**Brands by level, as reported:**
- **Sanitaryware and fittings** [54]:
  - Cera, Parryware and Hindware at the budget level;
  - Jaquar, Kohler and Roca in the middle;
  - Kohler, Toto, Duravit, Villeroy & Boch and Geberit at the luxury level.

  Luxury showrooms in Delhi NCR carry Dornbracht, THG Paris, Graff, Antoniolupi, Laufen and others.
- **Kitchen and wardrobe hardware** [53]: Ebco; then Hettich and Hafele; then Blum at the top.
  - Soft-close hinges: Rs. 180 to 450 (Hettich, Hafele), against Rs. 350 to 700 (Blum).
  - Drawer channels, a pair: Rs. 700 to 2,500, against Rs. 1,800 to 4,500.
- **Paint (Asian Paints)** [55]: Tractor Emulsion, Apcolite Premium Emulsion, Royale Luxury Emulsion and Royale Aspira, in rising price. As reported:
  - Tractor: Rs. 258 a litre;
  - Royale Luxury: Rs. 810 a litre;
  - Apcolite Premium: Rs. 8,750 for 20 litres;
  - Royale Aspira: Rs. 11,044 for 20 litres.

**Rates: the guides disagree.** As reported:
- **Painting** with putty, primer and two coats:
  - Tractor Rs. 12 to 18 a sq ft and Royale Rs. 22 to 32 (one guide);
  - Royale Rs. 35 to 55 (another);
  - Tractor Rs. 7, Apcolite Rs. 9 and Royale Rs. 12.5 a sq ft for two coats (a third) [55].
- **Electrical** [61]:
  - Rs. 400 to 700 a point with materials, or Rs. 150 to 350 for labour;
  - Rs. 25 to 60 a point for labour in North India;
  - a 2BHK rewired for Rs. 46,000 to 75,000, against Rs. 2.12 to 2.30 lakh for a 1,000 sq ft home.
- **Wardrobes,** a sq ft [59]:
  - one firm: laminate Rs. 1,300 hinged and Rs. 1,500 sliding, acrylic or veneer Rs. 1,500 to 1,700, PU Rs. 1,800;
  - another: Rs. 1,400 to 3,500;
  - a third: Rs. 350 to 1,400.
- **Modular kitchens,** a sq ft of cabinet face [58]:
  - laminate Rs. 1,200 to 2,200;
  - acrylic Rs. 2,200 to 3,000;
  - PU Rs. 2,500 to 3,200;
  - glass or veneer up to Rs. 3,500;
  - overall Rs. 1,200 to 5,000.
- **Flooring** [56]:
  - mid-range vitrified tiles Rs. 100 to 170 a sq ft laid (tile Rs. 70 to 120, labour Rs. 30 to 50);
  - laying 600 × 600 tiles Rs. 25 to 40, and 800 × 800 tiles Rs. 30 to 50;
  - Italian marble Rs. 350 to 2,500 or more, laid for Rs. 45 to 70.
- **False ceiling,** a sq ft [57]:
  - POP Rs. 45 to 80, or Rs. 95 to 105 plus GST;
  - gypsum Rs. 70 to 120, or Rs. 75 to 110 basic and Rs. 120 to 180 premium;
  - grid Rs. 100 to 150;
  - wood Rs. 850 to 1,200.
- **Bathroom renovation** [60]:
  - basic Rs. 50,000 to 1.5 lakh: ceramic tiles, Hindware or Parryware basics;
  - mid Rs. 1.5 to 3 lakh: vitrified tiles, Jaquar or Cera sets, a glass partition, concealed plumbing;
  - luxury from Rs. 4 lakh.

**What this shows:**
- The same item differs two to three times between guides. Wardrobes differ about ten times.
- The guides are evidence for the ladders and for the check band, not for the rates (A7).

**Official rates, as reported** [63]:
- DSR 2023 is based on the market rates of April 2023 at Delhi.
- Two coats of acrylic emulsion on walls: Rs. 92.75 per sq m.
- A gypsum false-ceiling item: Rs. 1,145.95. Its unit is to be read from the schedule.
- Vitrified tiles 600 × 600: Rs. 550 per sq m, in the building cost index's basket.
- Correction slips revise rates and add items after publication.

**City indices** [64, 6]:
- CPWD issues building cost indices for places and states.
- PAR 2025's base is 01-04-2025 = 100.
- The places' values were not found in search results.

**Quantities:**
- **Electrical points, as reported** [61]:
  - a 2BHK (650 to 950 sq ft): 32 to 42 points;
  - a 3BHK (1,000 to 1,400 sq ft): 45 to 58 points;
  - a bedroom: 6 to 10 points to start with; a main bedroom 12 to 16, another bedroom 8 to 12;
  - a kitchen: 10 to 15 sockets;
  - a bathroom: 1 to 3 sockets;
  - a dining area: 2 to 4; a study: 6 to 8; a balcony: 1 to 3;
  - 20% to 30% spare for later.

  The official guide is IS 4648:1968, found but not opened [62].
- **Room sizes** [65]:
  - **flats, one guide:** a 1BHK 450 to 600 sq ft, a 2BHK 650 to 800, a 3BHK 900 to 1,100, a 4BHK 1,300 to 1,700. Others give a 2BHK 650 to 1,000;
  - **a 2BHK of about 900 sq ft:** hall 12 × 16 ft, bedrooms 12 × 14 and 10 × 12, kitchen 8 × 10, two bathrooms 6 × 8;
  - **a mid-range 2BHK of 850 to 950 sq ft:** main bedroom 12 × 12, second bedroom 10 × 11, living room 14 × 14, kitchen 8 × 9, bathrooms 5 × 8.
- **The Code's minimums, as reported** [66]:
  - a habitable room: 9.5 sq m, at least 2.4 m wide and 2.75 m high;
  - a kitchen: 5.0 sq m;
  - a bathroom: 1.8 sq m, and 2.1 m high.
- **Wardrobes** [67]:
  - sliding: 7 to 8 ft high, 2 ft deep and 6 to 12 ft wide;
  - two-door: 3 to 3.6 ft wide;
  - three-door: 4.4 to 5.2 ft wide;
  - lofts: 450 to 750 mm.
- **Bathroom wall tiles by level:** 7 ft, 8 ft or to the ceiling [51].
- **House construction, as reported** [68, 38]:
  - cement: 0.4 bags a sq ft of built-up area;
  - steel: about 4 kg a sq ft;
  - UltraTech's calculator gives the quantities and a cost by phase, from the area and the location.

**Calculators** [49, 52, 68]:
- **Livspace** asks the BHK, the home's size, the rooms to design and a package. It shows an itemised breakdown that changes with the choices.
- **UltraTech** asks the area and the location, and gives the material quantities and a cost by phase.
- **Brick & Bolt** prices by city and package.

None found produces an itemised estimate for a lender, with specifications, sources and a level for each section. That is the gap this tool fills.

### B11. The second blueprint (Gemini's): what was taken and what was left

The owner asked for it to be read and critiqued, and for anything useful to be taken. Its claims about the three samples were checked against the files.

**Taken, with changes:**
1. **An estimate generated from a few facts** (scope, flat or house, city, area, BHK, quality) → A3 and A5.
2. **Flat or house as a question.** It decides the terrace, the exterior and the external works → A3, question 2.
3. **A city adjustment** → A7, by CPWD's cost index instead of its unsourced factors (0.85, 1.00 and 1.20 for three tiers of city).
4. **Quality tiers with brand ladders** → A4 and A6, as five levels instead of three, checked against published packages (B10).
5. **Quantities worked out from the area** → A5, from the rooms and the measurement rules instead of flat multiples of the carpet area.
6. **The kitchen's length and the wardrobes' face area for each bedroom,** as worked-out quantities → A16, in the rooms data.
7. **An old property suggests rewiring and new pipes** → a suggestion (A14), not "mandatory" as it has it.
8. **The contractor's header** (GSTIN, PAN, quotation number) → for a professional who adopts the estimate (A11).

Version 1 already had a fixed or movable tag on every line, sums worked twice, and an abstract by head with the total in words.

**Left, and why:**
1. **Personal data from the samples.** It copies their names, flat numbers, addresses, firms, a lender's branch and amounts into its tables and templates. None of it may enter the repo: no customer data, and D-UX-16's rule for the samples.
2. **Facts about the samples that the files do not bear out:**
   - It gives the furniture quotation's terms as 50% advance, 40% on delivery and 10% at handover. The quotation says 50% with the order and 50% before delivery.
   - It says that quotation holds only built-in, fixed furniture, such as a "hydraulic bed". The quotation lists a bed with storage and a cushioned headboard, among other movable pieces (B2), and no hydraulic bed.
   - It says the vetting report verified a carpet area and a built-up area, and shows a cost per sq ft on them. The report gives no area (B2).
   - It says the furniture quotation was accepted for a private or NBFC home loan. The quotation names no lender.
3. **A "Chartered Engineer / Valuer cost vetting report" as a download,** with the certificate "I have personally inspected the property". A tool must never write a professional's certificate or a lender's panel report. That is their own document, after their inspection, and producing it would be a false record.
4. **Its rate matrix:**
   - no value has a source or a date;
   - one unit is mixed: "Rft / sqft" for a kitchen;
   - some values are far from those reported. It allows 0.18 to 0.22 electrical points a sq ft of carpet, which it puts at 180 to 220 points for 1,000 sq ft. The reported counts are 32 to 42 for a 2BHK and 45 to 58 for a 3BHK (B10).
5. **A contractor's margin of 10% to 15% on top of market rates.** Market rates and CPWD's schedule already include the contractor's profit and overheads (B4), so this counts them twice. Only a rate analysis from bare costs adds them (A11).
6. **Stage payments of 30%, 30%, 25% and 15%** for every job. They are not from any lender (B1).
7. **"Purpose" as a question** (bank loan, contractor bid, budget). It changes no figure, and one document serves all.
8. **"100% eligible", the loan at 80% LTV and the margin, on the results.** The loan is out (owner), and no tool can promise a lender's acceptance.
9. **Taking movable items out of the lender's document automatically.** Lenders differ, and some finance furnishing (B1). The tool splits and flags them instead (A18, decision 4).
10. **Built-up = carpet × 1.10 to 1.15, applied silently.** The tool asks for the area as in the agreement and names it (A13).
11. **A new `engine/estimate/` folder layout.** The repo keeps `engine/estimate.ts`, the `*-check.ts` files and `engine/data/` (A16).
12. **"Prime cost" for the subtotal.** In Indian estimates a prime-cost item is an allowance for something chosen later. The library uses allowances that way (A7, class 3).

### B12. Gemini's second note: what was taken and what was left

The owner forwarded a second note from Gemini with "take what is useful". It critiques version 1 (rates left to the user, the loan, brands not asked), which version 2 had already changed.

**Taken, with changes:**
- Its material ladders by level (plywood grades, laminate thickness, hardware tiers, paints, switches, lights, sanitaryware), checked against the sources and put into the library's specifications and brands.
- Brands as what a valuer checks a cost against: each item names brands as examples, and the documents say "or equivalent".
- The often-forgotten costs as default items: debris, floor protection, making good and cleaning are in every renovation.
- The IS 1200 deductions, now in the engine (A0).
- GST by each rate's basis, 18% added only to a rate quoted before GST; GST 2.0 from 22-09-2025 noted: cement 18%, unpolished marble and granite blocks 5%.
- A modular kitchen priced by the running foot, as the market quotes it.
- A slider whose caption is the level's specification (already A8).

**Left:**
- Its rates, which have no sources. Its electrical rule, 0.2 points a sq ft (200 points for 1,000 sq ft), is about four times the 45–58 points reported for a 3BHK.
- Ratios of the carpet area as the method (paint 3.2 times, false ceiling 0.75 times): the engine measures room by room, and a ratio stays a check.
- "Bank status: 100% immovable real estate work (certified loan-eligible)": eligibility is the lender's call, and no tool certifies it.
- A "bank valuer vetting report" download: a valuer's report is the valuer's own document (A15).
- Documents with "zero unverified flags": the document stays a planning estimate, and the flags stay on the page. Its sources were in Annex 3 then; they are on the page since D-DOC-09.
- Rates in TypeScript (`library.ts` with 2026 rates): rates live in dated data files with their sources (CLAUDE.md).
- A valuer and a bank named from the sample documents: no name or figure from the samples enters the repo.
- Its check, "all lines sum = all trades sum", adds the same numbers twice; the engine's second computation takes another route.
- `Sliders.astro`: a slider that moves needs a Preact island, not a static Astro component.
