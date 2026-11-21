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
  pastYears: 'Past years, from the books',
  otherChecks: 'The bank’s other checks',
  addSales: 'Add this year’s sales to see them',
  pastLead: 'Optional. Up to three years before your first projected year, from the audited or provisional accounts. They get a DSCR of their own; the answer above stays on the projected years.',
  pastCount: 'How many past years?',
  pastHint: {
    tax: 'Current and deferred together; a tax credit with a minus sign.',
    financeCost: 'All interest and finance charges in the profit and loss account.',
    interestTL: 'Left empty, all the finance cost is taken as term-loan interest: added back and counted in the debt service, which gives the lower DSCR.',
    principalTL: 'Term-loan instalments paid in the year, principal only: from the cash flow statement or the loan statements. 0 if none.',
  } as Partial<Record<string, string>>,
  sum: 'In rupees. Each total adds up the lines above it; the DSCR is cash available (A) divided by debt service (B).',
  showSum: 'Show the sum for',
  allYears: 'All the years together',
  nil: (xs: string[]) => `Nil in every year, so left out: ${xs.join(', ')}. The downloaded statement lists every line.`,
  nilLines: 'Lines nil in every year are left out on screen; the downloaded statement keeps them.',
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
  chart: { band: 'Cash for the loan against repayments', title: 'Cash for the loan against repayments, by year', cash: 'Cash available', service: 'Repayments due', unit: '₹ lakh', tight: 'tightest' },
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
  /** Room to move, beside the ways that work: its few words; every figure in them is the engine's. */
  pic: {
    room: 'Room to spare',
    less: 'Or borrow less',
    most: (limit?: string) => `The most your figures carry${limit ? `, set by ${limit}` : ''}:`,
    fewest: (n: number, per: number, tenure?: number) => `The shortest repayment that works: ${n} ${per === 4 ? 'quarterly' : 'monthly'} instalments${tenure !== undefined && (per === 4 || tenure !== n) ? `, ${tenure} months in all` : ''}.`,
    key: { fewest: 'Needed', spare: 'To spare in your term', yours: 'Your term', more: 'Needed beyond your term' },
    row: (i: number) => `Year ${i}`,
    useAmount: (x: string) => `Borrow ${x}`,
    useFewest: (tenure: number) => `Repay in ${tenure} months`,
    useTurns: (n: number) => `Repay in ${n} instalments`,
  },
  /** Simple mode states what it filled in, under the answer. */
  filled: {
    title: 'We filled in the rest',
    lead: (n: number) => `${n === 1 ? 'One thing' : `${n} things`} you were not asked, set the usual way. Tap a line to see why, or to change it.`,
    change: 'Change them in Professional mode',
    /** Grouped as a borrower thinks of them (NEW1e, Rahul, 13-11-2026: "The assumptions list is so ugly"). */
    groups: { loan: 'Your loan', profit: 'Your profit', borrowing: 'Other borrowing', tax: 'Tax', test: 'The bank’s test' },
    of: {
      loanStart: 'loan', start: 'loan', margin: 'profit', asset: 'profit', depreciation: 'profit', nonCash: 'profit',
      otherLoans: 'borrowing', interest: 'borrowing', interestNone: 'borrowing', promoters: 'borrowing', tax: 'tax', proprietorTax: 'tax', method: 'test', target: 'test',
    } as Record<string, 'loan' | 'profit' | 'borrowing' | 'tax' | 'test'>,
    /** Each line of the term sheet, what it is and as taken, in the page's plain words (engine/data/defaults.json keeps
     * the CA's, for the statement). The target and the tax rate keep the data file's own figures: a name only. */
    plain: {
      target: ['The bank’s target'], tax: ['Tax rate'],
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
    } as Record<string, [string, string?]>,
    change1: 'Change',
    /** Changed in place, under its line (Rahul, 21-11-2026): done, or put back as it was set. */
    done: 'Done', back: 'Put it back', mine: 'Changed by you',
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
    /** The profit in its four parts, as the accounts give them (Rahul, 21-11-2026). */
    parts: {
      open: 'Have it in parts? Net profit, interest, depreciation, tax', close: 'Type one figure instead',
      items: ['Net profit', 'Interest paid', 'Depreciation', 'Tax'], minus: 'After tax. A loss? Type it with a minus.',
      total: 'Before interest, depreciation and tax', needPat: 'Type the net profit. A loss with a minus, like -50,000.',
    },
  },
  /** The help under each question: where its answer is found, on the paper the borrower already has (Rahul, 21-11-2026). */
  help: {
    where: 'Where to find it',
    pl: { title: 'Profit and loss account, last year', sales: 'Sales', costs: 'Expenses', interest: 'Interest', depreciation: 'Depreciation', pbt: 'Profit before tax', tax: 'Tax', pat: 'Net profit' },
    letter: { title: 'The bank’s letter or quote', amount: 'Loan amount', rate: 'Rate of interest, a year', years: 'Repayment period', fee: 'Processing fee' },
    profit: 'Start at net profit and add back the three marked lines. Interest goes back because the DSCR sets the loan’s interest against this very profit; tax is worked out afresh for each year; depreciation is not cash.',
    rate: 'The yearly rate on the bank’s letter or quote. A floating rate? Today’s.',
    depreciation: 'The same account’s line, for what the business owns now. Leave out the machine this loan buys.',
    borrower: {
      title: 'What your answer changes', tax: 'Tax:', emis: 'EMIs that count:',
      counts: { proprietor: 'every EMI, business and personal', firm: 'the firm’s own loans', company: 'the company’s own loans' },
      say: 'A proprietor and the business are one purse; a firm or a company has its own.',
    },
    growth: { title: 'Look back before you look ahead', years: ['Two years ago', 'Last year', 'This year'], say: 'Your own sales tell you: how much did they grow each year lately? A bank asks about growth above that. Unsure? 0 is the careful answer.' },
    amount: { title: 'Only the loan', yours: 'Yours', loan: 'The loan', cost: 'What it all costs', say: 'The part the bank lends, not the whole cost. Banks look for a share of your own.' },
    years: { title: 'First EMI to last', first: 'First EMI', last: 'Last EMI', say: 'Count from the first EMI to the last: 60 EMIs is 5 years. A break before the EMIs start is set in Professional mode.' },
    emis: {
      title: 'Where to find it', paper: 'Bank statement', upi: 'UPI payment', emi: 'Loan EMI, auto-debit', cash: 'Cash deposit', emi2: 'Car loan EMI, auto-debit',
      say: {
        any: 'The same debit every month is an EMI. Add them up for a month.',
        proprietor: 'The same debit every month is an EMI. Add every one you pay: business, home, car, personal.',
        firm: 'The same debit every month is an EMI. The firm’s own loans only; partners’ personal loans stay out.',
        company: 'The same debit every month is an EMI. The company’s own loans only; directors’ personal loans stay out.',
      },
    },
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
  years: { band: 'Year by year', title: 'DSCR by year', line: (t: string) => `Line: ${t}, the least a year should reach`, below: 'below', part: 'part year',
    belowLine: (n: number, of: number, t: string) => (n ? `${n} of ${of} years below ${t}` : undefined) },
  pro: {
    lead: 'Every field, filled in from your answers. Change any; the answer moves with it.',
    why: 'Why', whyAll: 'What we filled in', change: 'Change',
    strip: (avg: string, low: string) => `DSCR ${avg} average, ${low} lowest`, see: 'See the answer',
    /** The guided steps (NEW1e): their short names, and the words that move along them. */
    steps: { label: 'Steps', step: (i: number, n: number) => `Step ${i} of ${n}`, next: (name: string) => `Next: ${name}`, back: 'Back', done: 'done' },
    /** The last step (Rahul, 21-11-2026: "I just completed entering all the information, now what are they asking"):
     * said first that the DSCR is done; each check a closed card, what it tells the bank and whether it is added. */
    checks: {
      title: 'The bank’s other checks',
      done: 'Your DSCR is worked out. You can stop here.',
      lead: 'Some banks look at four more things. Open one only if your bank asks for it: each adds a line beside your DSCR and none changes it.',
      added: 'Added', none: 'Not added', stays: 'Stays in',
      sales: { title: 'Sales', what: (tests: string) => `Your DSCR again with ${tests}.` },
      promoters: { title: 'Owners’ loans', what: 'Whether money the owners lent the business is paid back before this loan.',
        ask: 'Will any of it be paid back before this loan ends?', no: 'No, it stays in', yes: 'Yes, some', byYear: 'Type what is paid back each year; leave a year empty for none.' },
      audited: { title: 'The last audited year', what: 'Five figures from your last audited accounts, set beside your first year.',
        when: 'The year before your first year of figures. Its sales also start the cash check.' },
      cash: { title: 'The cash check', what: 'Whether the cash left after stock, unpaid bills and worn machines still pays the EMIs.' },
    },
    stops: { how: 'Method', loan: 'Loan', years: 'Years', business: 'Business', figures: 'Figures', target: 'Target', lender: 'Checks' },
    how: 'How it is worked out',
    /** The first step: the methods as fractions, and this case's DSCR under each (Rahul, 21-11-2026). */
    method: {
      legend: 'How does your lender work out DSCR?',
      lead: 'Most term loans use the first. Not sure? Keep it, and ask your lender. You can change it at any time; your figures stay.',
      pick: 'Most term loans', choose: 'My lender’s own way: choose each part',
      above: 'Cash', below: 'Due',
      part: { pat: 'Net profit', depreciation: 'Depreciation', nonCash: 'Non-cash charges', interestTL: 'Term-loan interest', principalTL: 'Principal', interestOther: 'Working-capital interest', leaseRentals: 'Lease rentals', existingEmis: 'Other EMIs' },
      when: {
        common: 'Counts only the term loans’ interest. What most banks use for a term loan.',
        'rbi-2020': 'Adds working-capital interest on both sides, and counts a year of interest only, before the first EMI. For a lender that names the RBI’s 2020 framework.',
        'schedule-iii': 'Adds working-capital interest and lease rentals on both sides. As a company’s annual accounts show the ratio.',
        choose: 'For a lender that counts the parts its own way.',
      },
      yours: (avg: string, low: string) => `This case: ${avg} average, ${low} in the tightest year`,
      same: 'The marked parts sit on both sides. Adding the same amount above and below the line pulls the DSCR towards 1, so a DSCR above 1 falls: the method alone can turn a pass into a miss.',
    },
  },
  /** For professionals, above the form: a projection typed from the start, with the stated assumptions kept. */
  blank: { lead: 'Typing a projection from the start?', go: 'Empty the form', undo: 'Undo' },
  needs: (what: string) => `Your own figure for ${what} (the example’s stands in)`,
} as const;
