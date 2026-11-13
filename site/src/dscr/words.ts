/**
 * The DSCR page's words (WORDS1, docs/PLAN.md row 3): what a borrower reads on the default path, one short line a
 * question. Figures and the sentences built around them stay in model.ts; the statement's own words in document.ts.
 */
export const W = {
  kind: 'A statement for your lender',
  title: 'DSCR statement',
  lead: 'Does your business earn enough to repay the loan? Seven questions, then a statement to sign.',
  borrower: 'Who is the borrower?',
  profit: 'This year’s profit before interest, depreciation and tax',
  growth: 'Growth in sales a year (%)',
  growthHint: 'Like 10.',
  emis: 'EMIs already paid, a month',
  emisHint: 'Each loan’s monthly instalment. Leave empty if none.',
  depreciation: 'Depreciation a year, if any',
  empty: 'Leave empty if none.',
  amount: 'Loan amount',
  rate: 'Interest rate (% a year)',
  rateHint: 'Like 12.',
  years: 'Repayment period (years)',
  yearsHint: 'Like 5.',
  drawn: (month: string) => `Taken as drawn in ${month} and repaid by monthly EMI, with no holiday.`,
  more: 'Year-by-year figures, a holiday or a loan already drawn?',
  useMore: 'Use More options',
  moreHolds: 'the method, the loan in full, year-by-year figures',
  average: 'Average DSCR',
  lowest: 'Lowest year',
  instalment: 'Each instalment',
  interest: 'Interest over the whole loan',
  yearByYear: 'Year by year',
  openYear: 'In rupees. Tap a year to see how it adds up.',
  inRupees: 'In rupees.',
  nilLines: 'On a phone, lines that are nil every year are left out; the statement keeps them.',
  schedule: 'Repayment schedule',
  openMonths: 'Open a year for its months.',
  tests: 'About the lender’s tests',
  download: 'Download the statement',
  borrowerName: 'Borrower’s name',
  borrowerLike: 'Like Asha Traders.',
  lender: 'Lender',
  preparedBy: 'Prepared by',
  docMore: 'Address, purpose and GSTIN',
};

/**
 * The worked page's words (NEW1, docs/WORKED-PAGE.md §4): the reading in its three states, the facts as one sentence,
 * the one next step. Sixty words or fewer on the first phone screen (§2); figures come from the engine, in model.ts.
 */
export const N = {
  title: 'Can your business repay the loan?',
  example: 'Example',
  paperLink: 'The report',
  reading: {
    example: (noun: string) => `The example ${noun}`,
    yours: 'Your business',
    carries: (who: string, asked: string) => `${who} can carry the ${asked} asked.`,
    carriesMore: (who: string, most: string, asked: string) => `${who} can carry up to ${most}, more than the ${asked} asked.`,
    short: (who: string, most: string, asked: string) => `${who} can carry ${most} of the ${asked} asked.`,
    cannot: (who: string) => `As it stands, ${who.replace(/^The /, 'the ').replace(/^Your /, 'your ')} cannot carry this loan.`,
    banker: (avg: string, low: string, fy: string, target?: [string, string]) =>
      `Banks call this the DSCR: ${avg} on average, ${low} in ${fy}, the tightest year.${target ? ` Lenders often ask for ${target[0]} and ${target[1]}.` : ''}`,
    wait: (needs: string) => `Still needed: ${needs}.`,
  },
  noun: { proprietor: 'proprietor', firm: 'firm', company: 'company', none: 'business' },
  who: { proprietor: 'A proprietor', firm: 'A firm', company: 'A company', none: 'A business' },
  mark: {
    example: 'Example: a fictional firm. Tap any figure to make it yours.',
    /** Opened from the home page with its case (D-UX-245): still a marked example. */
    home: 'Example: the home page’s fictional firm. Tap any figure to make it yours.',
    part: (yours: string, left: string) => `Yours: ${yours}. Still the example’s: ${left}.`,
  },
  name: { profit: 'the profit', amount: 'the loan', years: 'the years', rate: 'the rate', borrower: 'who borrows', growth: 'the growth', emis: 'other loans', depreciation: 'depreciation' },
  label: {
    profit: 'This year’s profit before interest, depreciation and tax', amount: 'Loan amount', years: 'Repay over (years)', rate: 'Interest rate (% a year)',
    borrower: 'Who is the borrower?', growth: 'Growth in sales a year (%)', emis: 'EMIs already paid, a month', depreciation: 'Depreciation a year',
  },
  hint: {
    profit: 'From your last accounts or this year’s books. Type 6 L or 6,00,000.',
    amount: 'The loan you want. Type 12 L or 12,00,000.',
    years: 'How long to repay, in years: 5, or 7.5.',
    rate: 'The rate the bank quotes, like 12.',
    borrower: 'It sets the tax on the profit.',
    growth: 'How much you expect sales to grow each year. Profit grows with them.',
    emis: 'Each running loan’s monthly instalment, added up. Empty if none.',
    depreciation: 'As in your accounts. It lowers tax. Empty if none.',
  },
  kindSpoken: { ink: 'yours', example: 'the example’s', assumed: 'assumed' },
  facts: { ownYears: 'its own yearly figures', noLoans: 'No other loans', onOther: ' on other loans', noDep: 'no depreciation', depreciation: ' depreciation a year.' },
  sheet: {
    empty: 'Type a figure to go on.', notMoney: 'Not understood. Type 6 L, 1.2 Cr or 6,00,000.', notNumber: 'Not understood. Type a number, like 12.',
    negative: 'Type a figure of 0 or more.', zeroLoan: 'Type the loan you want, more than 0.', tooLarge: 'That is more than this page takes. Check the figure.',
    range: (lo: number, hi: number) => `Type a number from ${lo} to ${hi}.`,
  },
  next: {
    own: 'Use your own figures', continue: (what: string) => `Next: ${what}`, options: 'See ways to make it work', change: 'Change your figures', paper: 'Get the report',
  },
  options: {
    title: 'Ways that work', lead: 'Each one meets the lender’s levels. Pick one; you can undo it.', use: 'Use this', none: 'No change to the loan alone makes it work. Change your answers, or open Professional mode.',
    used: (title: string) => `Used: ${title}.`, undo: 'Undo',
  },
  chart: { title: 'Cash for the loan against repayments, by year', cash: 'Cash available', service: 'Repayments due', unit: '₹ lakh', tight: 'tightest' },
  folds: { working: 'How it adds up', paper: 'The report' },
  /** The page opens here (Rahul, 12-11-2026): what DSCR is in a few words, then a choice of two ways in (NEW1c, Rahul,
   * 12-11-2026): Simple asks the questions and states what it filled in; Professional asks the same, then opens every field filled in. */
  intro: {
    lead: (target: string) => `Banks check it with the DSCR: the cash your business earns, divided by the loan repayments due each year. Most look for ${target} or more.`,
    simple: 'Simple', simpleLine: (n: number) => `${n} questions, then your answer. We fill in the rest.`,
    pro: 'Professional', proLine: (n: number) => `The same ${n} questions, then every field filled in, to change.`,
    example: 'See an example',
  },
  /** The two ways, switched on top of the report. */
  mode: { label: 'Mode', simple: 'Simple', pro: 'Professional' },
  /** The working as pictures (PIC1, Rahul, 13-11-2026: "A picture or graphics speaks a thousand words"): each picture's
   * few words; every figure in them is the engine's. */
  pic: {
    lowest: (fy?: string) => (fy ? `Lowest year, ${fy}` : 'Lowest year'),
    average: 'Average of the years',
    needs: (t: string) => `needs ${t}`,
    room: 'Room to move',
    most: 'Most it can repay',
    asked: 'You asked',
    over: 'More than it can repay',
    limit: (l: string) => `What limits it: ${l}.`,
    fewest: (n: number, per: number) => `${n} ${per === 4 ? 'quarterly' : 'monthly'} instalments: the fewest that work.`,
    key: { fewest: 'The fewest that work', spare: 'Your term, beyond them', yours: 'Your term', more: 'Needed beyond your term' },
    row: (i: number) => `Year ${i}`,
    useAmount: (x: string) => `Make the loan ${x}`,
    useFewest: (n: number) => `Repay in ${n} instalments`,
    stress: 'The bank’s harder tests',
    locked: 'Add this year’s sales to see these',
    lowestShort: 'lowest',
    build: 'How the cash covers the bank',
    a: 'Cash available (A)',
    b: 'Owed to the bank (B)',
    ratio: 'DSCR = A ÷ B',
  },
  /** Simple mode states what it filled in, under the answer. */
  filled: {
    title: 'We filled in the rest',
    lead: (n: number) => `${n === 1 ? 'One thing' : `${n} things`} you were not asked, set the usual way. Tap one to see why.`,
    change: 'Change them in Professional mode',
    /** Grouped as a borrower thinks of them (NEW1e, Rahul, 13-11-2026: "The assumptions list is so ugly"). */
    groups: { loan: 'Your loan', profit: 'Your profit', borrowing: 'Other borrowing', tax: 'Tax', test: 'The bank’s test' },
    of: {
      loanStart: 'loan', start: 'loan', margin: 'profit', asset: 'profit', depreciation: 'profit', nonCash: 'profit',
      otherLoans: 'borrowing', interest: 'borrowing', interestNone: 'borrowing', promoters: 'borrowing', tax: 'tax', proprietorTax: 'tax', method: 'test', target: 'test',
    } as Record<string, 'loan' | 'profit' | 'borrowing' | 'tax' | 'test'>,
    /** The page's plain words for each (engine/data/defaults.json keeps the CA's, for the statement); figures stay the data file's. */
    plain: {
      loanStart: ['When the loan starts', 'Paid out this month, repaid by EMI every month, with no break'],
      start: ['The first year counted', 'The year the loan is paid out'],
      margin: ['Profit as sales grow', 'Grows in step with sales'],
      asset: ['Extra income from what the loan buys', 'None, beyond the growth'],
      depreciation: ['Depreciation', 'The same as this year, every year'],
      nonCash: ['Other non-cash costs and lease rent', 'None'],
      otherLoans: ['Loans you already repay', 'None'],
      interest: ['Interest on other borrowing', 'The same as this year, on top of this loan’s'],
      interestNone: ['Interest on a cash credit or overdraft', 'None: the profit you gave is before all interest'],
      promoters: ['Money the owners lent the business', 'Stays in until this loan is repaid'],
      proprietorTax: ['Tax for a proprietor', 'The new tax regime’s slab rates, the business the only income'],
      method: ['How the bank works it out', 'The usual way for a term loan'],
    } as Record<string, [string, string]>,
    change1: 'Change',
    /** Each assumption as a chip: a few words; the full line opens under it. A figure stays the data file's. */
    chip: {
      loanStart: 'Paid out now, EMI monthly', start: 'Counted from the payout year', margin: 'Profit grows with sales',
      asset: 'No extra income from the loan', depreciation: 'Depreciation stays the same', nonCash: 'No lease rent or write-offs',
      otherLoans: 'No other loans', interest: 'Other interest stays the same', interestNone: 'No overdraft interest',
      promoters: 'Owners’ money stays in', proprietorTax: 'New tax regime', method: 'The usual term-loan way',
    } as Record<string, string>,
    /** A chip that is the data file's figure, in a few words around it. */
    figure: { tax: (x: string) => `Tax at ${x}` } as Record<string, (x: string) => string>,
  },
  /** One question a screen. */
  ask: {
    q: {
      borrower: 'Who is borrowing?', profit: 'This year’s profit before interest, depreciation and tax?', growth: 'How much will sales grow each year?',
      amount: 'How much do you want to borrow?', rate: 'At what interest rate?', years: 'Over how many years?',
      emis: 'EMIs you already pay, a month?', depreciation: 'Depreciation a year?',
    },
    hint: {
      borrower: 'It sets the tax.', profit: 'From your last accounts. Type 6 L or 6,00,000.', growth: 'Profit grows with sales. 0 if none.',
      amount: 'Type 12 L or 12,00,000.', rate: 'As the bank quotes it, like 12.', years: 'Like 5, or 7.5.',
      emis: 'All running loans, added up.', depreciation: 'As in your accounts. It lowers the tax.',
    },
    next: 'Next', done: 'Done', see: 'See your answer', fields: 'See every field', back: 'Back', none: 'None', step: (i: number, n: number) => `${i} of ${n}`,
    reads: (t: string) => `Reads as ${t}`,
  },
  /** The report: what can be undone and started over sits on top, where it is looked for. */
  report: {
    change: 'Change answers', undo: 'Undo', over: 'Start over', overDone: 'Started over.',
    example: 'Example: a fictional firm.', home: 'Example: the home page’s fictional firm.', yours: 'Answer the 8 questions',
    paper: 'Get the report',
  },
  tiles: {
    average: 'DSCR, average', lowest: 'Tightest year', emi: 'EMI a month', interest: 'Interest, whole loan',
    against: (t: string) => `Banks look for ${t}`, inYear: (fy: string) => `in ${fy}`, years: (n: number) => `over ${n} years`,
  },
  years: { title: 'DSCR by year', line: (t: string) => `Line: ${t}, the least a year should reach`, below: 'below', part: 'part year' },
  pro: {
    lead: 'Every field, filled in from your answers. Change any; the answer moves with it.',
    why: 'Why', whyAll: 'What we filled in', change: 'Change',
    strip: (avg: string, low: string) => `DSCR ${avg} average, ${low} lowest`, see: 'See the answer',
    /** The guided steps (NEW1e): their short names, and the words that move along them. */
    steps: { label: 'Steps', step: (i: number, n: number) => `Step ${i} of ${n}`, next: (name: string) => `Next: ${name}`, back: 'Back', done: 'done' },
    stops: { how: 'Method', loan: 'Loan', years: 'Years', business: 'Business', figures: 'Figures', target: 'Target', lender: 'Checks' },
    how: 'How it is worked out',
  },
  /** For professionals, above the form: a projection typed from the start, with the stated assumptions kept. */
  blank: { lead: 'Typing a projection from the start?', go: 'Empty the form', undo: 'Undo' },
  needs: (what: string) => `Your own figure for ${what} (the example’s stands in)`,
} as const;
