/**
 * SPEC2's two cases, both fictional (rule 15): what the borrower would have told us, each fact with its evidence label, and
 * the trade packs the library would hold. Figures the engine works out are never here: the builder puts them in through
 * slots. Digits here are the borrower's own typed words (a buyer's quantity, a paper's date) and print as typed.
 * Evidence labels (docs/REPORT-REVIEW.md §3): engine, paper (dated), quote (a quotation, dated), buyer (enquiry, trial,
 * order or letter), word (the promoters' word), pencil (an assumption with its reason), missing.
 * The scenarios' sizes are pencil here; LIB1 moves them to a dated rule file (rule 13).
 */
const snacks = {
  reportNo: 'FS-2026-SNK-0001', version: 1, date: '16 November 2026', kind: 'Standard project report', purpose: 'New unit', funding: 'Term loan and working-capital limit',
  oneLine: 'A unit to roast, season and pack chana and peanuts', trade: 'snacks', promotersAre: 'the partners',
  promoters: [
    { name: 'Meera Patil', role: 'Partner · buying, the roasting line and quality', past: 'Twelve years buying pulses and groundnut for a trader at the Nashik market yards.', brings: 'Her share of the promoters’ money, from savings', ev: 'word' },
    { name: 'Suresh Jadhav', role: 'Partner · sales, delivery and accounts', past: 'Eight years selling packed snacks to grocery shops in Nashik district for a regional brand.', brings: 'His share, from savings and a gold loan already repaid', ev: 'word' },
  ],
  enterprise: [['Constitution', 'Partnership firm, deed dated 03-10-2026', 'paper'], ['Udyam registration', 'Held, dated 10-10-2026 (number on the paper, not printed here)', 'paper'], ['Existing loans', 'None, in the firm or either partner’s name', 'word'], ['Bank account', 'Current account opened in the firm’s name', 'word']],
  why: [
    ['Why this', 'The partners know both ends of the trade: where the grain is bought and which packs the shops reorder. Shops in the district buy roasted chana and peanuts loose from small roasters or packed from brands made far away; a local packed product sits between the two.', 'word'],
    ['Why here', 'Example village is close to the Nashik market yards, where chana and groundnut are traded through the year, and within a day’s delivery of the towns where the snacks will sell.', 'word'],
    ['Why now', 'The partners have buyers ready to try the product (Chapter 4), the land is the family’s own, and the machine maker’s quotation holds until January 2027.', 'word'],
  ],
  buyers: [
    { who: 'A wholesaler in Nashik city', status: 'order', date: '02-11-2026', note: 'Trial order of 300 kg a month for three months from the first sale' },
    { who: 'A distributor serving Malegaon and Satana', status: 'letter', date: '06-11-2026', note: 'Letter of intent; no quantity named' },
    { who: 'A group of eight grocery shops in Sinnar', status: 'trial', date: '25-10-2026', note: 'Took samples made by hand; asked for a price list' },
    { who: 'Sweet shops and tea stalls in Niphad', status: 'enquiry', date: '—', note: 'Asked for samples once the unit runs' },
  ],
  competitors: [
    ['Loose roasted chana and peanuts from small local roasters', '₹160 to ₹200 a kg, sold loose', 'Cheapest; no pack, no shelf life'],
    ['Packed brands from other districts', '₹240 to ₹320 a kg in small packs', 'On the shelves already; weekly supply from outside'],
    ['National brands', 'Above ₹400 a kg', 'Sold in larger towns; flavoured ranges'],
  ],
  market: 'The partners see the firm’s packs priced between loose roasted snacks and the packed brands from outside the district, sold through the wholesaler and the distributor first, and to shops direct as the delivery route grows. These are the partners’ own observations from their years in the trade, not a market study.',
  ops: [['Working', 'One shift of eight hours, 300 days a year', 'word'], ['The line', 'One roaster, one seasoning drum, one packing machine', 'quote'], ['Yield', 'About 92 kg of roasted product from 100 kg of cleaned grain, as the roaster’s maker states', 'quote'], ['The bottleneck', 'The roaster: the packing machine can pack faster than the roaster can roast', 'quote']],
  site: [['Land', 'The family’s own plot at Example village; the firm uses it under a lease from the owner, dated 05-10-2026', 'paper'], ['Building', 'A shed to be built: roasting hall, packing room, store', 'quote'], ['Power', 'A three-phase connection applied for on 12-10-2026', 'paper'], ['Water', 'The plot’s own borewell; little is used in roasting', 'word'], ['Food licence', 'FSSAI registration to be applied for once the shed is up', 'missing']],
  inputs: [['Chana and groundnut', 'Bought at the Nashik market yards, from traders Meera has bought from for years', 'word'], ['Salt, spices, oil', 'From wholesalers in Nashik city', 'word'], ['Packing film and cartons', 'A packaging maker in Sinnar; quotation awaited', 'missing']],
  people: [['The two partners', 'Run the unit full time', 'word'], ['Roaster operator', 'One, to be hired; trained by the machine maker', 'quote'], ['Helpers for cleaning and packing', 'Four, from the village', 'word'], ['Driver for deliveries', 'One, with the firm’s own small goods vehicle', 'word']],
  timetable: [['Nov 2026 to Jan 2027', 'Shed built; power connected'], ['Feb 2027', 'Machines delivered and installed by the maker'], ['Mar 2027', 'Trial runs; FSSAI registration']],
  machines: [['Roaster', 'Roasts cleaned grain batch by batch; sets the day’s output', 'Maker’s quotation, 28-10-2026'], ['Seasoning drum', 'Coats the warm product with salt and spice', 'Same quotation'], ['Cleaner and grader', 'Takes out stones, dust and broken grain', 'Same quotation'], ['Packing machine', 'Weighs, fills, seals and codes the packs', 'Same quotation'], ['Shed', 'Roasting hall, packing room, store', 'Contractor’s estimate, 20-10-2026']],
  costEv: { building: ['quote', 'Civil contractor’s estimate, 20-10-2026'], machinery: ['quote', 'Machine maker’s quotation, 28-10-2026, valid to 31-01-2027'], idc: ['engine', 'Worked out by the engine'], margin: ['engine', 'Worked out by the engine'] },
  papers: [
    ['Partnership deed', '03-10-2026', 'held'], ['Udyam registration', '10-10-2026', 'held'], ['Lease of the plot to the firm', '05-10-2026', 'held'],
    ['Civil contractor’s estimate for the shed', '20-10-2026', 'held'], ['Machine maker’s quotation: roaster, seasoning drum, packing machine', '28-10-2026', 'held'],
    ['Power connection application', '12-10-2026', 'held'], ['Wholesaler’s trial order', '02-11-2026', 'held'], ['Distributor’s letter of intent', '06-11-2026', 'held'],
    ['Packaging maker’s quotation', '—', 'to come'], ['FSSAI registration', '—', 'to come'], ['Partners’ bank statements, last six months', '—', 'to come'],
  ],
  risks: [
    { risk: 'Groundnut and chana cost more after a poor crop', threatens: 'Materials and other variable costs as a share of sales', sign: 'Prices at the market yards above the partners’ buying range for a month', response: 'Buy ahead after harvest while prices are low; review pack prices each quarter', owner: 'Meera Patil', scenario: 'Downside, Severe' },
    { risk: 'Shops take longer to take up a new name', threatens: 'Use of the capacity in the first two years', sign: 'The wholesaler’s second month order below the first', response: 'Sell through the distributor; samples to shops on the delivery route', owner: 'Suresh Jadhav', scenario: 'Downside, Severe' },
    { risk: 'The shed or the machines are late', threatens: 'The month sales start', sign: 'The shed not roofed by the end of January 2027', response: 'The maker holds the machines; the partners pay the interest meanwhile', owner: 'Both partners', scenario: 'Severe' },
    { risk: 'A batch fails a food-safety test', threatens: 'Sales, and the buyers’ trust', sign: 'Moisture or taste complaints from a buyer', response: 'Clean and grade every lot; keep a sample of each batch; register with FSSAI before the first sale', owner: 'Meera Patil', scenario: 'none: a condition before the first sale' },
    { risk: 'Buyers pay later than planned', threatens: 'Stock, debtors and creditors days', sign: 'The wholesaler paying after the agreed days', response: 'Cash on delivery for small shops; the limit sized on the stated days', owner: 'Suresh Jadhav', scenario: 'none yet: a case for LIB1' },
  ],
  respond: { down: 'Hold fixed costs; delay the second helper; the partners take no drawings in the first year', severe: 'The partners put in more of their own money; the bank is told before an instalment is missed' },
  conditions: [['Packaging maker’s quotation', 'Suresh Jadhav', 'Before sanction'], ['FSSAI registration', 'Meera Patil', 'Before the first sale'], ['Partners’ bank statements', 'Both partners', 'With the application'], ['Power connection sanctioned', 'Meera Patil', 'Before the machines arrive']],
  photos: ['The plot at Example village', 'The roaster, from the maker’s brochure', 'Samples made by hand'],
};

const laundry = {
  reportNo: 'FS-2026-LIN-0001', version: 1, date: '16 November 2026', kind: 'Standard project report', purpose: 'New unit', funding: 'Term loan and working-capital limit',
  oneLine: 'A laundry to wash, dry and press linen for hotels and hospitals', trade: 'laundry', promotersAre: 'the proprietor',
  promoters: [
    { name: 'Farida Shaikh', role: 'Proprietor · runs the unit, sales to hotels and hospitals', past: 'Ten years as housekeeping supervisor at a hotel in Indore, in charge of its linen and its outside laundry.', brings: 'The promoters’ money, from savings and the sale of a plot', ev: 'word' },
  ],
  enterprise: [['Constitution', 'Sole proprietorship', 'word'], ['Udyam registration', 'Held, dated 14-10-2026 (number on the paper, not printed here)', 'paper'], ['Existing loans', 'A two-wheeler loan, closing in March 2027', 'paper'], ['Bank account', 'Current account opened in the business’s name', 'word']],
  why: [
    ['Why this', 'Hotels and small hospitals in Indore send their linen to outside laundries but complain of late returns and torn sheets. Farida has run the buying side of that work and knows what the buyers check.', 'word'],
    ['Why here', 'Example nagar is on the ring road, within a short drive of the hotels near the station and the hospitals on the bypass; a laundry needs a daily pickup and drop, so distance is the cost.', 'word'],
    ['Why now', 'Two buyers have written to say they would send linen (Chapter 4); a shed on the ring road is offered on rent from January 2027.', 'word'],
  ],
  buyers: [
    { who: 'A hotel of about sixty rooms near the station', status: 'letter', date: '04-11-2026', note: 'Letter: would send all its room linen once the unit runs' },
    { who: 'A nursing home on the bypass', status: 'letter', date: '08-11-2026', note: 'Letter: would send its linen subject to a hygiene check' },
    { who: 'Two guest houses in the same lane', status: 'enquiry', date: '—', note: 'Asked for rates' },
  ],
  competitors: [
    ['Small dhobi units, washed by hand', '₹20 to ₹30 a kg', 'Cheapest; slow and uneven'],
    ['Mechanised laundries in the city', '₹40 to ₹55 a kg', 'Two serve the hotels today'],
    ['Hotels’ own laundries', '—', 'Only the larger hotels; the small ones send out'],
  ],
  market: 'Farida sees her rates close to the city’s mechanised laundries, winning on pickup times and on separate washing for hospital linen. This is her own reading from her work in the trade, not a market study.',
  ops: [['Working', 'Two shifts of eight hours, 310 days a year', 'word'], ['The line', 'Two washer-extractors, one dryer, one flatwork ironer, a small boiler', 'quote'], ['Loss in handling', 'Torn and rejected pieces, to be counted from the first month', 'missing'], ['The bottleneck', 'The flatwork ironer: washing can run ahead of pressing', 'quote']],
  site: [['Shed', 'Rented, about 2,000 sq ft, from January 2027; rent agreement to be signed', 'missing'], ['Power', 'Three-phase connection in the shed, as the owner states', 'word'], ['Water', 'Municipal connection and a storage tank', 'word'], ['Waste water', 'Consent from the pollution control board to be applied for', 'missing'], ['Fuel for the boiler', 'Wood pellets or LPG, to be chosen with the boiler maker', 'pencil']],
  inputs: [['Detergents and chemicals', 'Two suppliers in Indore; prices from Farida’s hotel days', 'word'], ['Fuel for the boiler', 'As chosen with the boiler maker', 'pencil'], ['Bags and tags', 'Local printers', 'word']],
  people: [['Farida Shaikh', 'Runs the unit full time', 'word'], ['Machine operators', 'Two, one each shift', 'word'], ['Sorting, folding and pressing', 'Six', 'word'], ['Driver for pickups', 'One, with a hired van', 'word']],
  timetable: [['Dec 2026', 'Machines ordered; consent applied for'], ['Jan 2027', 'Shed rented and fitted out'], ['Feb to Mar 2027', 'Machines installed; boiler inspected'], ['Mar 2027', 'Trial washes for the two buyers']],
  machines: [['Washer-extractors, two', 'Wash and spin by programme; hospital linen in its own machine', 'Maker’s quotation, 30-10-2026'], ['Tumble dryer', 'Dries towels and covers', 'Same quotation'], ['Flatwork ironer', 'Dries and presses sheets in one pass; sets the day’s output', 'Same quotation'], ['Boiler', 'Steam for the ironer', 'Quotation to come'], ['Shed fit-out', 'Drains, floor, wiring for the machines', 'Fit-out estimate, 22-10-2026']],
  costEv: { building: ['quote', 'Fit-out estimate for the rented shed, 22-10-2026'], machinery: ['quote', 'Laundry machine maker’s quotation, 30-10-2026'], idc: ['engine', 'Worked out by the engine'], margin: ['engine', 'Worked out by the engine'] },
  papers: [
    ['Udyam registration', '14-10-2026', 'held'], ['Fit-out estimate for the shed', '22-10-2026', 'held'], ['Machine maker’s quotation', '30-10-2026', 'held'],
    ['Hotel’s letter', '04-11-2026', 'held'], ['Nursing home’s letter', '08-11-2026', 'held'], ['Two-wheeler loan statement', '01-11-2026', 'held'],
    ['Rent agreement for the shed', '—', 'to come'], ['Pollution control board consent', '—', 'to come'], ['Boiler maker’s quotation and fuel choice', '—', 'to come'],
  ],
  risks: [
    { risk: 'One buyer stops sending linen', threatens: 'Use of the capacity; the two letters carry the first year', sign: 'A buyer’s weekly weight falling for a month', response: 'Win the guest houses and one more hotel before the first sale; no buyer above half the work', owner: 'Farida Shaikh', scenario: 'Downside, Severe' },
    { risk: 'Hotels fill fewer rooms in the off season', threatens: 'Use of the capacity, month to month', sign: 'Lower pickups from May to July', response: 'Hospital linen does not follow the season; seek a second hospital', owner: 'Farida Shaikh', scenario: 'Downside' },
    { risk: 'Detergent, fuel or power cost more', threatens: 'Materials and other variable costs as a share of sales', sign: 'A supplier’s price above the last quarter’s', response: 'Rates with a fuel clause in each buyer’s agreement', owner: 'Farida Shaikh', scenario: 'Downside' },
    { risk: 'Consent for waste water delayed', threatens: 'The month sales start', sign: 'No reply from the board by February 2027', response: 'Apply in December 2026, with the shed owner’s papers', owner: 'Farida Shaikh', scenario: 'Severe' },
    { risk: 'The first year is a loss before the work builds up', threatens: 'Cash in the first year', sign: 'Sales below the plan for two months running', response: 'The proprietor keeps money aside to meet the shortfall', owner: 'Farida Shaikh', scenario: 'Base, Downside' },
  ],
  respond: { down: 'Farida puts in the cash the engine says is short, from the money she has kept aside', severe: 'Not met from the business: the loan’s size or its term would need to change' },
  conditions: [['Rent agreement for the shed', 'Farida Shaikh', 'Before sanction'], ['Pollution control board consent', 'Farida Shaikh', 'Before the first sale'], ['Boiler maker’s quotation and fuel choice', 'Farida Shaikh', 'Before sanction'], ['Handling loss to be counted', 'Farida Shaikh', 'First three months']],
  photos: ['The shed at Example nagar', 'The washer-extractor, from the maker’s brochure', 'The hotel’s linen room today'],
};

/* Trade packs (LIB2's shape): how units of this kind usually work, never this borrower's fact until confirmed. No figure:
 * a trade figure needs its source and date (rule 13), which LIB2 researches. */
const packs = {
  snacks: {
    name: 'Roasted snacks and small food processing',
    process: [['Raw grain in', 'Weighed and stored dry, away from damp'], ['Cleaning and grading', 'Stones, dust and broken grain taken out'], ['Roasting', 'Batch by batch, by heat and time'], ['Seasoning', 'Salt and spice in a drum while warm'], ['Cooling', 'Spread out so packs do not sweat'], ['Packing', 'Weighed, sealed and coded by batch']],
    usual: 'Units of this kind usually run as many roasting batches as the roaster allows, so the roaster sets the day’s output; packing and cleaning keep pace with it. The cost of the grain moves with each crop, and buyers expect a steady price, so the margin is made or lost at the market yard.',
    buyers: 'Small packed-snack units usually sell first through one wholesaler or distributor, then direct to shops along a delivery route as the name becomes known.',
  },
  laundry: {
    name: 'Commercial laundry',
    process: [['Pickup', 'Weighed and tagged at the buyer’s door'], ['Sorting', 'By buyer, fabric and soiling; hospital linen kept apart'], ['Washing', 'In washer-extractors, by programme'], ['Drying', 'Tumble-dried, towels and covers'], ['Pressing', 'Sheets through the flatwork ironer'], ['Return', 'Folded, counted and delivered']],
    usual: 'Laundries of this kind usually find that pressing, not washing, sets the day’s output; water, power and fuel together are the costs that move. Work comes daily and must go back on time, so pickups and the van’s round matter as much as the machines.',
    buyers: 'A new commercial laundry usually starts with a few buyers who know the promoter, and grows by the second and third hotel or hospital on the same round.',
  },
};

const scenarios = {
  snacks: [
    { id: 'base', label: 'Base', why: 'As the partners plan it' },
    { id: 'down', label: 'Downside', volume: -10, variablePts: 2, why: 'Shops slower to take up the packs and grain dearer, together: sales a tenth lower and materials two points more of sales' },
    { id: 'severe', label: 'Severe but plausible', volume: -20, variablePts: 4, lateMonths: 3, why: 'A poor crop and a late shed together: sales a fifth lower, materials four points more of sales, sales starting three months late' },
  ],
  laundry: [
    { id: 'base', label: 'Base', why: 'As the proprietor plans it' },
    { id: 'down', label: 'Downside', volume: -10, variablePts: 2, why: 'A buyer slow to send all its linen and fuel dearer: work a tenth lower and running costs two points more of sales' },
    { id: 'severe', label: 'Severe but plausible', volume: -20, ratePts: 1, lateMonths: 3, why: 'One of the two buyers lost and consent delayed: work a fifth lower, interest one point higher, sales starting three months late' },
  ],
};

module.exports = { cases: { snacks: { ...snacks, scenarios: scenarios.snacks }, laundry: { ...laundry, scenarios: scenarios.laundry } }, packs };
