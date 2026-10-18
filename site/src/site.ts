/** Site name and the tools, in build order (docs/PROJECT.md). A tool gets `href` only once its page exists. */
export const SITE_NAME = 'FinSight';

/**
 * The notice wherever brand names show (D-BIZ-03, rule 4 of docs/TRADEMARKS.md, word for word), in the same type as the
 * rest, and only where a brand shows (D-BIZ-05): on the planning estimate where a line or an open drawer names one, and in
 * each download that names one. The site check holds both to the rule's text, on the page and in the six downloads.
 */
/** Its first two sentences: where brands show without our prices, as on the bill of quantities (D-BIZ-05). */
export const BRAND_NOTICE_SHORT = 'Brand names belong to their owners and are used here only to name their products. We are not linked to, paid by or endorsed by any of them.';
export const BRAND_NOTICE = `${BRAND_NOTICE_SHORT} Each price comes from the source and date shown; where brands are listed as examples, the price is for the level, not a quote for any one brand. Prices change: check with a seller before you buy.`;

/**
 * `what`: what the tool is, in plain words for someone who has never met the term (about 15 words);
 * `gives`: what ours gives that a lender, DSA or accountant would want (about 15 words), only for a tool that works and
 * only what the engine does today (D-UX-65). `status`: Ready when the page works today.
 */
export interface Tool { name: string; short?: string; brief?: string; what: string; gives?: string; status: 'Ready' | 'Later'; href?: string }

export const TOOLS: Tool[] = [
  { name: 'DSCR statement', short: 'DSCR', status: 'Ready', href: '/dscr/',
    what: 'How many times a business’s yearly earnings cover its loan repayments.',
    gives: 'Each year’s cover, the weakest year and the largest loan that passes, as PDF, Excel or Word.' },
  { name: 'Construction, renovation or interiors estimate', short: 'Estimate', brief: 'Construction estimate', status: 'Ready', href: '/estimate/',
    what: 'What your building, renovation or interior work should cost, before you collect contractors’ quotes.',
    gives: 'Room by room at five quality levels, a check of each quote against reported prices, and a bill of quantities.' },
  { name: 'Project report', short: 'Project report', status: 'Ready', href: '/project-report/',
    what: 'The report a lender reads before a term loan: what the project costs, how it is paid for, whether it can repay.',
    gives: 'Projected profit and loss, balance sheet and cash flow, every figure worked out twice, as PDF, Excel or Word.' },
  { name: 'CMA data', short: 'CMA data', status: 'Ready', href: '/cma/',
    what: 'The forms a bank uses to set a working-capital limit, such as cash credit, from a business’s figures.',
    gives: 'Forms I to VI, the ratios and the turnover-method limit, from five years’ figures.' },
  { name: 'Home-loan project cost', status: 'Later', what: 'Free calculator for a home project’s total cost.' },
];

/** The tools that work today, in build order: the top bar and the footer of the new look link each (D-UX-66). */
export const READY = TOOLS.filter((t): t is Tool & { href: string; short: string } => t.status === 'Ready' && Boolean(t.href && t.short));

/** Page <title>: the page name, then the site name. */
export const pageTitle = (name?: string) => (name ? `${name} · ${SITE_NAME}` : SITE_NAME);

/**
 * The policy pages (LEGAL1, D-BIZ-07), linked from every footer and held there by the site check. AI drafts, marked as
 * drafts until the owner's lawyer has read them: then LEGAL_DRAFT goes false, and the site check fails on any draft mark
 * or gap left. A fact only the owner can give shows as a gap (policy.ts), never a guess.
 */
export const POLICIES = [
  { href: '/privacy/', name: 'Privacy' },
  { href: '/terms/', name: 'Terms of use' },
  { href: '/not-advice/', name: 'Not advice' },
  { href: '/refunds/', name: 'Refunds' },
  { href: '/contact/', name: 'Contact' },
] as const;
export const LEGAL_DRAFT = true;
/** The day the policies' words last changed; each page shows it. */
export const POLICY_DATE = '18-10-2026';
/** The contact email, from the owner (LEGAL1 had none yet): null shows a gap where it goes. */
export const CONTACT_EMAIL: string | null = null;
/** Interaction data (UD1, D-TECH-37) is on once the Worker is live; the footer and the privacy page say so only then. */
export const COUNTING = Boolean(import.meta.env.PUBLIC_API_URL) || import.meta.env.PUBLIC_EVENTS === 'on';
