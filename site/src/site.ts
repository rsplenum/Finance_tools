/** Site name and the tools, in build order (docs/PROJECT.md). A tool gets `href` only once its page exists. */
export const SITE_NAME = 'Loan document tools';

/**
 * The notice wherever brand names show (D-BIZ-03, rule 4 of docs/TRADEMARKS.md, word for word): on the planning estimate
 * where its brand examples show, and in each download that names a brand, in the same type as the rest. The site check
 * holds it to the rule's text, on the page and in the six downloads.
 */
export const BRAND_NOTICE = 'Brand names belong to their owners and are used here only to name their products. We are not linked to, paid by or endorsed by any of them. Each price comes from the source and date shown; where brands are listed as examples, the price is for the grade, not a quote for any one brand. Prices change: check with a dealer before you buy.';

export interface Tool { name: string; what: string; status: 'Being built' | 'Later'; href?: string }

export const TOOLS: Tool[] = [
  { name: 'DSCR statement', status: 'Being built', href: '/dscr/',
    what: 'Year-wise DSCR, the average and the lowest year, and the loan or tenure that meets the lender’s target.' },
  { name: 'Construction, renovation or interiors estimate', status: 'Being built', href: '/estimate/',
    what: 'A new house, a renovation or interiors: six questions, then every room, item and rate worked out at five levels, with a planning estimate for the lender. Or type a quotation’s items.' },
  { name: 'Project report', status: 'Being built', href: '/project-report/',
    what: 'For term loans and working capital: projected balance sheet, profit and loss, cash flow, DSCR, break-even and ratio checks.' },
  { name: 'Home-loan project cost', status: 'Later', what: 'A free calculator for the total cost of a home project.' },
];

/** Page <title>: the page name, then the site name. */
export const pageTitle = (name?: string) => (name ? `${name} · ${SITE_NAME}` : SITE_NAME);
