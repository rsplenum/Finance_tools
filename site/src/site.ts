/** Site name and the tools, in build order (docs/PROJECT.md). A tool gets `href` only once its page exists. */
export const SITE_NAME = 'Loan document tools';

export interface Tool { name: string; what: string; status: 'Being built' | 'Later'; href?: string }

export const TOOLS: Tool[] = [
  { name: 'DSCR statement', status: 'Being built', href: '/dscr/',
    what: 'Year-wise DSCR, the average and the lowest year, and the loan or tenure that meets the lender’s target.' },
  { name: 'Construction or renovation estimate', status: 'Later',
    what: 'Item by item, with the basis of each rate stated, in the format lenders use.' },
  { name: 'Project report', status: 'Later',
    what: 'For term loans and working capital: projected balance sheet, profit and loss, cash flow, DSCR, break-even and ratio checks.' },
  { name: 'Home-loan project cost', status: 'Later', what: 'A free calculator for the total cost of a home project.' },
];

/** Page <title>: the page name, then the site name. */
export const pageTitle = (name?: string) => (name ? `${name} · ${SITE_NAME}` : SITE_NAME);
