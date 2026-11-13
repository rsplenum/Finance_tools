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
  openYear: 'In rupees. Open a year for its working.',
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
  paperLink: 'The paper',
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
    own: 'Use your own figures', continue: (what: string) => `Next: ${what}`, options: 'See ways to make it work', change: 'Change your figures', paper: 'Get the paper',
  },
  options: {
    title: 'Ways that work', lead: 'Each one meets the lender’s levels. Pick one; you can undo it.', use: 'Use this', none: 'No change to the loan alone makes it work. Change your answers, or open Professional mode.',
    used: (title: string) => `Used: ${title}.`, undo: 'Undo',
  },
  chart: { title: 'Cash for the loan against repayments, by year', cash: 'Cash available', service: 'Repayments due', unit: '₹ lakh', tight: 'tightest' },
  folds: { working: 'See the working', paper: 'The paper' },
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
  /** Simple mode states what it filled in, under the answer. */
  filled: {
    title: 'We filled in the rest',
    lead: (n: number) => `${n === 1 ? 'One figure' : `${n} figures`} you were not asked. Tap Why for each reason.`,
    change: 'Change them in Professional mode',
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
    next: 'Next', done: 'Done', see: 'See the report', fields: 'See every field', back: 'Back', none: 'None', step: (i: number, n: number) => `${i} of ${n}`,
    reads: (t: string) => `Reads as ${t}`,
  },
  /** The report: what can be undone and started over sits on top, where it is looked for. */
  report: {
    change: 'Change answers', undo: 'Undo', over: 'Start over', overDone: 'Started over.',
    example: 'Example: a fictional firm.', home: 'Example: the home page’s fictional firm.', yours: 'Answer the 8 questions',
    paper: 'Get the paper',
  },
  tiles: {
    average: 'DSCR, average', lowest: 'Tightest year', emi: 'EMI a month', interest: 'Interest, whole loan',
    against: (t: string) => `Banks look for ${t}`, inYear: (fy: string) => `in ${fy}`, years: (n: number) => `over ${n} years`,
  },
  years: { title: 'DSCR by year', line: (t: string) => `Line: ${t}, the least a year should reach`, below: 'below', part: 'part year' },
  pro: {
    lead: 'Every field, filled in from your answers. Change any; the answer moves with it.',
    why: 'Why', whyAll: 'Why these figures', change: 'Change',
    strip: (avg: string, low: string) => `DSCR ${avg} average, ${low} lowest`, see: 'See the answer',
    /** The journey across (NEW1d): its stops' short names, and the words that move along it. */
    journey: { label: 'Steps', step: (i: number, n: number) => `Step ${i} of ${n}`, next: (name: string) => `Next: ${name}`, back: 'Back' },
    stops: { how: 'Method', loan: 'Loan', years: 'Years', business: 'Business', figures: 'Figures', target: 'Target', lender: 'Checks' },
    how: 'How it is worked out',
  },
  /** For professionals, above the form: a projection typed from the start, with the stated assumptions kept. */
  blank: { lead: 'Typing a projection from the start?', go: 'Empty the form', undo: 'Undo' },
  needs: (what: string) => `Your own figure for ${what} (the example’s stands in)`,
} as const;
