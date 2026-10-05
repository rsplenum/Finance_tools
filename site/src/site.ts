/** Site name and the tools, in build order (docs/PROJECT.md). A tool gets `href` only once its page exists. */
export const SITE_NAME = 'Loan document tools';

/**
 * The notice wherever brand names show (D-BIZ-03, rule 4 of docs/TRADEMARKS.md, word for word), in the same type as the
 * rest, and only where a brand shows (D-BIZ-05): on the planning estimate where a line or an open drawer names one, and in
 * each download that names one. The site check holds both to the rule's text, on the page and in the six downloads.
 */
/** Its first two sentences: where brands show without our prices, as on the bill of quantities (D-BIZ-05). */
export const BRAND_NOTICE_SHORT = 'Brand names belong to their owners and are used here only to name their products. We are not linked to, paid by or endorsed by any of them.';
export const BRAND_NOTICE = `${BRAND_NOTICE_SHORT} Each price comes from the source and date shown; where brands are listed as examples, the price is for the level, not a quote for any one brand. Prices change: check with a seller before you buy.`;

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
