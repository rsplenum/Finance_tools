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

/**
 * `ask`: the question the tool answers, in a borrower's or DSA's own words (about 8 words), only for a tool that works;
 * `what`: one line of what the reader takes away (about 14 words). `status`: Ready when the page works today.
 */
export interface Tool { name: string; ask?: string; what: string; status: 'Ready' | 'Later'; href?: string }

export const TOOLS: Tool[] = [
  { name: 'DSCR statement', status: 'Ready', href: '/dscr/',
    ask: 'Can the business repay this loan?',
    what: 'Year-by-year DSCR, the lowest year, and the largest loan that meets the lender’s target.' },
  { name: 'Construction, renovation or interiors estimate', status: 'Ready', href: '/estimate/',
    ask: 'How much will my building work cost?',
    what: 'Cost at five quality levels, room by room: a planning estimate for the lender.' },
  { name: 'Project report', status: 'Ready', href: '/project-report/',
    ask: 'Does my project work for a lender?',
    what: 'For a term loan: projected profit and loss, balance sheet, cash flow and DSCR.' },
  { name: 'CMA data', status: 'Ready', href: '/cma/',
    ask: 'What working-capital limit can I ask for?',
    what: 'Forms I to VI, ratios and the turnover-method limit, from five years’ figures.' },
  { name: 'Home-loan project cost', status: 'Later', what: 'Free calculator for a home project’s total cost.' },
];

/** Page <title>: the page name, then the site name. */
export const pageTitle = (name?: string) => (name ? `${name} · ${SITE_NAME}` : SITE_NAME);
