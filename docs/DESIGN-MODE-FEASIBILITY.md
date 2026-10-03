# Design mode: a feasibility plan

Written 03-10-2026 at the owner's request: "Prepare a detailed feasibility plan detailing all technical or other challenges that we would have to face in realising this vision." It is a plan for discussion, not a decision. Nothing here is built except what section 13 lists.

## The short answer

- **Yes, it is possible, built in layers over the estimate we already have.** The engine already works as an architect would: it plans the rooms, measures them by IS 1200, fills each one at five levels and prices every line twice. It already lets the user change a single item, keeps some items fixed at every level, and gives every line a "how we worked this out".
- **Easy to medium:**
  - showing what each step up buys;
  - locking the basics;
  - choosing finish by finish (inside paint and outside paint apart);
  - a new house's structure;
  - a 3D room built from the plan, with real tile sizes, paint and wood, on a mid-range phone.
- **Hard:**
  - a library of thousands of items, kept current and sourced;
  - drawing or importing a plan on a phone;
  - 3D models and textures we are allowed to use;
  - lighting that looks real.
- **Very hard, and best left for later or to partners:**
  - photo-real walk-throughs in real time on phones;
  - branded 3D models of every product;
  - a full drawing tool for professionals.
- **The biggest risks are not the maths.** They are:
  - the library: its size, its freshness and its sources;
  - the right to use 3D assets;
  - the phone's limits;
  - keeping the default path as simple as it is now.
- **Recommended order:**
  1. finish the estimate (a new house, rooms, compare);
  2. a value layer;
  3. a bigger, checked library;
  4. a 2D plan;
  5. a 3D view;
  6. choosing in 3D;
  7. the professional's tools.

  Each step is a thin version you try on a phone before the next.

## 1. The vision, as a contract

| | In your words |
|---|---|
| Who | A lay person, and also an architect |
| What they do | Design a house or a flat and cost it, as a separate mode |
| What they choose | Every element: walls, roof, floors, tiles, plumbing, wiring, sanitary ware, bathrooms, storage, paint, doors, cabinets, stairs, ceilings, false ceilings, decoration, appliances, furniture, windows, waterproofing, heating and cooling, solar and more |
| How choice works | Levels like a car's variants, base to top. Also a jump to a different car altogether (a Creta to an Ioniq 5, an E-Class to an S-Class). Unlike a car, they can choose element by element (a costly paint outside, a cheaper one inside), and the basics are never compromised |
| What they see | What each upgrade buys: quality, finish, durability, comfort. Optionally a 3D preview: tiles, false ceiling, paint, lights, a chandelier, the TV, a sofa set, wood finishes, going up and down the stairs |
| What they take away | The estimate and its documents, as now |

The six questions stay the default path (brief-first). Design mode is a separate, optional mode reached from the estimate. It never adds fields to the six.

## 2. What we already have to build on

- **The engine as the architect:** `engine/architect.ts`, worked a second way in `architect-check.ts`. It turns six answers into:
  - rooms, by the BHK and the area;
  - doors and windows, by the Code's minimums (as reported);
  - quantities, by IS 1200;
  - each room's items at the section's level;
  - prices for the city;
  - totals by section and room, at all five levels.
- **Choice by element exists:**
  - every line has a key (room, family, rule);
  - a user can already put a different item on one line;
  - a different brand chip goes on any line;
  - a different level goes on any section.
- **Basics exist in a small way:** some families are fixed at every level:
  - waterproofing;
  - the distribution board with MCBs and a 30 mA RCCB;
  - the water supply and drain points;
  - the bathroom door.
- **The library:**
  - 312 items in 79 families, with 17 kinds of labour and 183 sources;
  - each item has a specification, brands, a unit, a reported rate, wastage and the labour that fixes it;
  - each rate is read through search summaries and not yet checked (E2).
- **Documents:** the PDF, Excel and Word copies, written by our own code and read back in tests.

So "choose per element" and "lock the basics" fit the engine as it is. Most of the new work is data, screens and geometry.

## 3. The house, element by element

Your list, plus what an architect would add. "Fixed" means the same at every level, because the Code or the cost of failure says so; the user sees why in one line. "Choice" means the level and the item are the user's.

| Element | In the library now | Fixed or choice | When |
|---|---|---|---|
| Walls (masonry) | Bricks, AAC blocks; plaster | Fixed (the engineer's specification) | E5, thin in this PR |
| Roof and floor slabs, columns, beams, foundation | Cement, steel, sand, aggregate; labour by stage | Fixed, by an engineer's design | E5, thin in this PR |
| Flooring and tiles | 37 items, five levels | Choice; anti-skid in wet areas fixed | Now |
| Plumbing | Supply and drain points | Pipes fixed; fittings a choice | Now |
| Electrical wiring | ISI copper wire at Basic; board with RCCB fixed | Safe minimum fixed; brands and automation a choice | Now |
| Sanitary ware, bathrooms | 56 items | Choice; waterproofing fixed | Now |
| Storage: wardrobes, lofts | 17 items | Choice | Now |
| Wall paint | Inside and outside families | Choice, separately inside and out | Now, outside with E5 |
| Doors | 44 items | Choice; bathroom door water-resistant, fixed | Now |
| Kitchen cabinets | 29 items | Choice; carcass at least water-resistant | Now |
| Stairs | Railings, five levels | Structure fixed; railing and finish a choice | Railing in this PR; finish in E5; geometry with the 2D plan |
| Ceilings, false ceilings | 13 items | Choice | Now |
| Decoration | Feature walls, wallpaper, panelling | Choice | Now; décor items with the bigger library |
| Appliances | 8 items | Choice, movable | Now |
| Furniture, soft furnishings | 15 items, not yet in the estimate | Choice, movable | E3 |
| Windows, panels, mesh, grills | 8 windows and their parts | Choice; window area at least a tenth of the floor, fixed | Now |
| Waterproofing | 7 items | Fixed | Now |
| Heating and cooling | Air conditioners, fans | Choice; their wiring fixed | Now; heat pumps and ducted systems with the bigger library |
| Solar | None | Choice, with its payback | Value layer |
| Anti-termite, damp-proof course | Anti-termite treatment (this PR) | Fixed | This PR; the damp-proof course with E5 |
| Terrace, parapet, exterior | Terrace waterproofing, exterior paint with five levels | Waterproofing fixed; paint a choice | This PR |
| Compound wall, gate, paving, drainage | None | Choice of finish | E5, later part |
| Sump, tank, borewell, septic tank, rainwater harvesting | None | Fixed where the city requires it | E5, later part |
| Earthing, lightning protection, gas pipeline | Earthing inside the board | Fixed | Bigger library |
| Lift (G+3 and up) | None | Choice | Bigger library |
| Plan approval, labour cess, connections, contingency | None | Fixed by law where it applies | More options (E6) |

## 4. Showing what each step up buys

### Trims and models

Your car comparison has two axes, and the house has the same two:

| Car | House | What changes |
|---|---|---|
| Variants of one model (Creta E to SX(O)) | The five levels, Basic to Bespoke, on one way of building | The finishes, fittings and comfort; the structure stays the same |
| A different model (Creta to Ioniq 5) | A different way of building or running the house: an energy-saving house (insulated roof and walls, double glazing, solar, heat-pump water heating); AAC blocks instead of bricks; a smart home | The technology, the running cost and the comfort, not only the finish |
| A class above (E-Class to S-Class) | Luxury to Bespoke | Materials and craft: imported stone, solid wood, designer fittings, automation, central air conditioning |

The levels exist. A "model" would be a switch that changes many families at once, such as "Energy-saving house", each change named and priced. It belongs in the value layer.

### What the user should see at each step

Take the library's own flooring ladder:

| Level | Item | What it buys |
|---|---|---|
| Basic | Double-charge vitrified tiles, 600 × 600 mm | Hard-wearing; more joints |
| Standard | Glazed vitrified tiles, 800 × 800 mm | Fewer joints; more designs |
| Premium | Large vitrified slabs, 800 × 1600 mm | Few joints; the look of stone |
| Luxury | Indian white marble (Ambaji) | Natural stone; polished on site; needs care |
| Bespoke | Italian marble (Statuario) | The most prized veining; mirror polish; the most care |

To make the value felt, each item needs a few more facts, each from a source:
- **Expected life**, in years, and the warranty.
- **Upkeep:**
  - how often (repainting, re-polishing, resealing);
  - what it costs each time.
- **The cost for each year of life:** what it costs, divided by its life, plus its upkeep, worked out by the engine. A paint that costs more but lasts longer can cost less each year. This is the most persuasive figure we can give honestly.
- **Running cost**, for anything that uses power or water:
  - an air conditioner's star rating;
  - LED against other lights;
  - solar's payback;
  - a dual-flush cistern.
- **The facts a professional checks**, in plain words:
  - for tiles: abrasion class, water absorption, slip rating;
  - for paint: washability, VOC;
  - for plywood: its grade (IS 710 or IS 303);
  - for fittings: a brass body and a ceramic cartridge;
  - for wire: FR, FRLS or zero-halogen;
  - for windows: glass, sound and heat insulation;
  - for lights: brightness for each watt, colour rendering.
- **Comfort and safety:**
  - quieter (soft-close fittings, double glazing);
  - cooler (roof insulation, reflective paint);
  - safer (anti-skid, toughened glass).

On the page:
- **What changed:** one line after a slider moves (E3). For example: "Flooring, Standard to Premium: fewer joints, the look of stone, Rs. 1,12,000 more".
- **Compare:** the sections down the side, the five levels across (E3).
- **Where to spend and where to save:** a short list of rules in the data, each with its reason. Spend on what is hard to change later (waterproofing, wiring, plumbing, windows, the structure). Save on what is easy to change later (paint, light fittings, furniture, curtains).
- **Pictures:**
  - first a photo or swatch for each item;
  - later the 3D view.

Honesty is the limit. We do not claim resale value, health benefits or "lasts a lifetime" without a source. An item with no life figure shows none.

## 5. The basics that are never compromised, and the free choices

**Never compromised: fixed at every level.** Each has its reason on screen, from the Code or a standard, as reported until read in the primary text:

| Basic | Why it is fixed |
|---|---|
| The structure designed by a qualified structural engineer, with concrete and steel of the grades the design needs (IS 456, IS 1786 Fe 500D, IS 1893 for earthquakes) | A failure costs lives; it cannot be put right later |
| Anti-termite treatment before building (IS 6313) and a damp-proof course | Cannot be added later |
| Waterproofing of the terrace, the bathrooms, the balconies and any sunken slab | Leaks are the commonest and costliest repair |
| ISI copper wiring of the right size, MCBs, a 30 mA RCCB and earthing (IS 732, IS 3043) | Shock and fire |
| Pressure-tested supply pipes, hot-water pipes rated for it, drains laid to fall with traps and vents | Leaks inside walls; smells |
| Windows of at least a tenth of each room's floor (NBC, as reported) | Light and air |
| Stairs within the Code's limits on riser, tread, headroom and railing | Falls |
| Anti-skid floors in wet areas | Falls |

How the engine does it:
- these families are fixed, as waterproofing is now;
- some families get a floor level, below which the slider does not go;
- the card says "Safety and durability: the same at every level", with its reason.

The user can still choose a brand within the safe item.

**Free choices:** every finish, fitting, fixture, appliance, piece of furniture and decoration:
- for each room;
- for each surface, such as the outside walls apart from the inside walls;
- for each bathroom, at its own level (E3).

The engine supports this now through its line keys. What is missing is the screen to pick an element (a wall, a floor) rather than a line in a list, which the 2D plan and the 3D view give.

## 6. The library at scale

**Today:** 312 items, 79 families and 183 sources. Each rate is the middle of a reported range, read through search summaries, not yet checked.

**Targets:**
- Phase 2 (section 10): about 1,500 items, each checked against its page.
- Later: 5,000 to 20,000 items and branded products.

**The shape of the data (version 2):**
- **Category:** flooring, paint, sanitary ware, and so on.
- **Family:** the slot an architect fills, such as "a bedroom's floor finish". As now.
- **Item:** a generic specification, such as "glazed vitrified tile 800 × 800 mm, abrasion class 4". As now.
- **Product**, which is new:
  - the brand, model and code;
  - the pack and its coverage;
  - the price, its date and its source;
  - the warranty.
- **Facts typed by category**, which are new:
  - for tiles: the size, thickness, abrasion class, water absorption and slip rating;
  - for paint: the type, sheen, VOC, washability, coverage a litre and warranty;
  - for plywood: the grade and thickness;
  - for wire: the size and type;
  - for windows: the profile, the glass and the insulation;
  - for air conditioners: the rating;
  - for lights: brightness for each watt, colour rendering and colour temperature.
- **For value:** the expected life, the upkeep interval and its cost, the running cost.
- **For the screen and 3D:**
  - a photo or swatch;
  - for 3D: a texture set at its real size, a colour, and a model where one exists.

**Where the figures come from:**
- brands' published price lists (MRP);
- state PWD schedules of rates and CPWD's DSR;
- shop listings;
- dealers' quotes.

Every figure carries its source and date, as now.

**Keeping it current:**
- each value gets a date after which it shows as old;
- steel and cement move monthly, finishes yearly;
- a curator refreshes them;
- the page says when a rate is old.

**Effort:**
- About 5 to 10 minutes an item with its source, so 1,500 items take 125 to 250 hours.
- That is a curator's work: a civil engineer or a quantity surveyor, part-time, or you.
- An AI can draft entries from a price list, but a person checks every figure before it enters a data file (CLAUDE.md).

**Tools:**
- a spreadsheet layout that a curator fills and a script checks and turns into the data files, with the same tests as now;
- a page listing what is old or unchecked.

**What stands in the way:**
- the session's network blocks most sites (E2 waits on it);
- shops' terms of use forbid scraping;
- product photos and textures belong to their makers, so we use them only with permission;
- brand names may be named, but not their logos.

## 7. From six questions to a plan

The estimate plans the rooms from the BHK and the area by rules. Design mode lets the user change the plan itself.

**Three ways in, in order of how hard they are:**
1. **Templates** (first): plans for the common plots and BHKs (20 × 30, 30 × 40, 30 × 50, 40 × 60 ft; 1 to 4 BHK; G to G+3), drawn once by us and checked by a professional. The user picks one and changes room sizes with sliders.
2. **A simple 2D editor** (next): rooms as rectangles on a grid. Walls, doors and windows follow; the user drags a wall, adds a window, moves a door. It works on a phone with big handles, and better on a tablet or computer.
3. **A plan the user uploads** (last): a photo or PDF of their architect's drawing, traced into rooms. Tracing by AI is a draft only: the user confirms every room before the engine uses it, and the quantities still come from the engine. Whether AI tracing is allowed at all is your decision (section 12).

**One model behind everything.** The plan, the 3D view, the quantities and the documents all read one model of the house:
- the plot and its orientation;
- the floors and their heights;
- the rooms as shapes;
- walls with their thickness and layers;
- doors and windows;
- stairs;
- the roof;
- the finish on each surface;
- fixtures, furniture and lights.

No figure is entered twice.

**Quantities from the plan** replace the room rules when a plan is given:
- floors, walls, ceilings, skirting and tiles are measured by IS 1200, as now, from the real shapes;
- the second computation uses a different route: it measures wall by wall where the first measures room by room, and works out shapes by triangles where the first uses the outline.

**Kept out on purpose:**
- **Structural design.** The steel and concrete stay rules of thumb, flagged, until the user types the engineer's quantities. The tool never sizes a column or a footing.
- **The plot rules** (FSI, setbacks, coverage, height). They differ by city and change often (Bengaluru, Pune's UDCPR, Delhi's bye-laws, Chennai, Hyderabad, Mumbai's DCPR). At first they are a flag ("check your city's rules"), never a refusal.

**For professionals, later:** they import and export open formats:
- IFC (open BIM), through the open-source web-ifc engine;
- DXF, for 2D drawings.

## 8. 3D in the browser

**Possible today.**
- three.js is free (MIT licence), works in every modern browser through WebGL2, and has a newer WebGPU renderer.
- WebGPU now ships in Chrome, Edge, Safari 26 and Firefox, as reported; the renderer falls back to WebGL2 where it does not.
- Nothing needs installing; it runs on the user's phone or computer, so there is no server cost for drawing.

**What it can show well:**
- **Rooms built from the plan.** Walls go up to the ceiling height, with openings for doors and windows, and skirting.
- **Tiles at their real size:**
  - 600 × 600 or 800 × 1600 mm;
  - the grout lines;
  - straight, staggered or herringbone.
- **Paint colours and wood finishes**, from texture sets (colour, bumps, gloss).
- **Ceilings:** a false ceiling with a cove light; a chandelier as a model with a light.
- **Daylight:** by the house's orientation, the time of day and the season.
- **Furniture:** placed by the user, with clearances checked (for example a 900 mm walkway).
- **The TV:** its size against the distance from the sofa, by a published rule.
- **The stairs:**
  - walked at eye height, up and down;
  - showing the steepness and the headroom;
  - with a flag when a riser or tread breaks the Code's limits.
- **Pictures to keep.** Still images to save. On a computer, a photo-like still made over a few seconds by path tracing (three-gpu-pathtracer).

**Hard:**
- **Real-looking light on phones, live.** Bounced light, many lamps and reflections are costly.
  - Live view: simpler lighting.
  - Real look: stills, on a computer.
- **Colour and feel:**
  - screens differ, so a paint colour on screen is only close;
  - gloss and texture are approximate;
  - every view says so.
- **Download size:**
  - each texture is 1 to 4 MB before compression;
  - textures shrink with KTX2 (Basis) and models with Draco or meshopt;
  - a first view should load in under 5 MB.
- **Phone memory and heat:**
  - iPhones close a tab that uses too much memory;
  - phones slow down when hot;
  - we need quality settings (low, medium, high), chosen from the device, and a budget of 30 frames a second on a Rs. 15,000 Android phone.
- **Touch controls:**
  - walking and placing furniture with fingers is fiddly;
  - recommended: arrange on the 2D plan, look in 3D;
  - walk with a thumb pad or by tapping where to go;
  - some users feel motion sickness, so movement stays slow and optional.
- **Access:**
  - 3D is visual;
  - every choice must also work as a list, by keyboard and screen reader;
  - the estimate never depends on 3D.

**Where the models and textures come from:**

| Asset | Recommended source | Watch for |
|---|---|---|
| Textures: tiles, wood, stone, plaster | Free CC0 sets (Poly Haven, ambientCG); our own photos; brands' textures with written permission | A brand's own tile or laminate design is theirs |
| Paint colours | The brand's published shade card, as approximate colours | Shade names are trademarks; the screen colour is only close |
| Furniture | Our own simple pieces, sized by parameters (sofa, bed, wardrobe, TV unit, dining set): free, light and ours | Marketplace models often forbid use in a web app where they can be downloaded; check each licence |
| Branded furniture and fittings | Makers' models, through partnerships | A partnership must not tilt the levels (section 9) |
| Skies and light (HDRI) | Free CC0 sets | None |

**Size of the code:** three.js adds about 170 KB compressed. It loads only in design mode, so the estimate stays as light as it is.

**Testing:**
- **Numbers:** the model and its quantities, tested as now.
- **3D:**
  - the site check opens the view in headless Chromium and fails on any error;
  - a few fixed screenshots;
  - you try it on real phones.

**Hosting:**
- Cloudflare Pages takes files up to 25 MiB each;
- large assets go to Cloudflare R2, which charges nothing for downloads.

**Later, if wanted:**
- placing a sofa in your real room through the camera (WebXR on Android; Quick Look on iPhones);
- headsets.

## 9. Other challenges

**Legal:**
- **The word "architect".** The Architects Act 1972 protects the title, not the work. The Supreme Court said so in Council of Architecture v. Mukesh Goyal (2020), as reported. The tool and its outputs never use the word (CLAUDE.md).
- **Approvals and liability:**
  - plans for approval need a registered architect's or licensed engineer's signature, so design mode's plans are marked "for planning, not for approval or construction";
  - the structure is always "to be designed by a structural engineer";
  - nothing here certifies safety.
- **Claims:** a claim about life, warranty or energy needs a source, or it is not made (the Consumer Protection Act 2019 forbids misleading claims).
- **Others' property:** brand names, yes; logos, product photos, textures and 3D models only with a licence or permission.
- **Personal data:**
  - a house's plan and address are personal and sensitive;
  - the Digital Personal Data Protection Act 2023 and its rules apply to anything we store;
  - recommended: keep projects on the user's device first, with saving to the cloud later, behind consent and an account.
- **The owner's conditions:** D-BIZ-01 (never selling to the employer bank's customers) and D-BIZ-02 (nothing from the office) hold for every partnership and every data source.

**The product:**
- **Two audiences:**
  - a lay person wants guidance, pictures and few choices;
  - an architect wants precision, their own rates and exports.
  - Recommended: the lay person first; the professional page (E7) later, behind its link.
- **Creeping complexity:**
  - the estimate's strength is six questions;
  - design mode must stay optional, open from the estimate with the estimate's answers, and never add a field to the six.
- **Phone first:** viewing works on a phone; editing a plan is easier on a tablet or computer, so the phone gets templates and sliders first.
- **Trust:** if brands pay to appear, the levels stop being neutral. Recommended: no paid places in the levels; any partnership disclosed.

**Money and people:**
- **What it costs:**
  - a curator for the library;
  - someone who knows 3D, or many sessions;
  - textures and models;
  - your time on real phones.
  - Hosting stays cheap.
- **How it could pay:**
  - the documents (P1d);
  - a plan for professionals;
  - later, partnerships that respect the rules above.
- **Others in this space:**
  - Planner 5D, Foyr Neo, Coohom, HomeByMe, Floorplanner, RoomSketcher, Sweet Home 3D;
  - the brands' own visualisers (paint, tiles);
  - the in-house tools of interior firms.

  None of them gives a priced, sourced Indian estimate with lender-ready documents from the same design. That is the edge: the estimate first, the design around it.
- **Upkeep:**
  - prices;
  - the Code's revisions;
  - browser changes;
  - three.js releases, which change often, so its version is pinned and updated on purpose.

## 10. The plan in phases

Each phase is a few thin versions, each one a session and a pull request you try on a phone and a computer. The session counts are rough.

| Phase | What it delivers | Sessions | Done when |
|---|---|---|---|
| 0. The estimate's core | A new house, thin (this PR), then its stages, outside works, water and CPWD's check (E5); rooms, What changed and Compare (E3); the library checked (E2); a quotation in hand (E4); More options (E6) | 5 to 7 | You say each feels simple |
| 1. Value | Each item's life, warranty and upkeep; the cost for each year of life; running costs; "Where to spend, where to save"; the basics marked fixed with their reasons; "models" such as an energy-saving house; solar with its payback | 3 to 5, plus data | A friend who is not in the trade says the strip and the cards make the upgrade clear |
| 2. The library, version 2 | Products under items; typed facts; a curator's spreadsheet and checks; dates after which a rate is old; about 1,500 items checked | 2 to 3, plus the curator's hours | The six cities' level items are all checked |
| 3. The plan (2D) | Templates for common plots and BHKs; a simple editor; quantities from the plan, worked twice; the estimate from the plan | 6 to 10 | You draw your own fictional house on a tablet in ten minutes and its estimate matches your hand count |
| 4. The 3D view | The plan in 3D with the chosen finishes; orbit and walk; daylight; quality settings | 6 to 10 | It runs smoothly on a Rs. 15,000 phone |
| 5. Choosing in 3D | Tap a wall or floor to change its finish, priced at once; furniture, lights, false ceilings, the TV, the stairs; stills to keep | 10 to 15 | A lay person furnishes a room without help |
| 6. The professional | Their own rates and library; IFC and DXF; the bill of quantities; options side by side; their signature (E7) | 8 to 12 | A professional you trust uses it for a real estimate of their own |
| 7. Later, if wanted | AR placement, cloud saving and sharing, makers' models through partnerships | As needed | |

**In all:** roughly 40 to 60 sessions, plus the curator's hours, spread over months. Phases 1 and 2 can run beside 3 and 4.

## 11. Risks and what to do about them

| Risk | What to do |
|---|---|
| Rates go stale or are wrong | A source and date on every value; old rates flagged; a curator; E2 first |
| No right to use a texture or model | CC0 and our own simple pieces first; a written licence for anything else |
| Too slow on phones | A budget per view; quality settings; KTX2 and Draco; test on a cheap phone every phase |
| The tool grows complicated | The six questions stay the default; design mode optional; brief-first for every step |
| Someone builds from our plan or our steel figures | "For planning, not for approval or construction"; the structure always "to be designed by an engineer" |
| Brands tilt the levels | No paid places; partnerships disclosed |
| The screen's colours or light mislead | "Approximate on screen" on every view; swatches and samples recommended |
| Too much for one owner | Phases that each stand alone; a curator; stop after any phase with a working product |
| Personal data | On the device first; cloud only with consent, under the DPDP Act |

## 12. Decisions for you

1. **Who first:** a lay person or an architect? *Recommended:* the lay person. The architect gets the professional page later.
2. **How the plan is entered:** templates and a simple editor, or uploads traced by AI? *Recommended:* templates first, then the editor. AI tracing comes later, if at all, as a draft the user confirms, since it turns a picture into the sizes the quantities use.
3. **3D:** a viewer first, or choosing in 3D at once? *Recommended:* the viewer first, with our own simple furniture. Branded models come later.
4. **The library:** a curator with spreadsheets, scraping shops, or brands' feeds? *Recommended:* a curator with spreadsheets, every figure checked. No scraping. Brands' feeds only with neutral levels.
5. **How it pays:** documents and professional plans, or brand placements? *Recommended:* documents and plans, with no paid places in the levels.
6. **A name for the mode:** without "architect". For example, "Design mode", "Plan and see" or "Home planner".

## 13. What this PR does now

- **A new house, thin (E5 brought forward):**
  - "Build a new house" is the third answer to the first question;
  - the second question becomes "How many floors?";
  - the area is the built-up area of all floors;
  - the structure is costed at one specification from rules of thumb with their sources;
  - the terrace's waterproofing, the outside paint and the stair railing are added, and the rooms inside are worked out as now;
  - what is not in yet is flagged on the page.
- **The documents:**
  - no sources annex;
  - the annexes numbered with no gap (Annex 1 the detailed estimate, Annex 2 what the estimate assumes, one line each).

  The sources stay in the data and on the page.
