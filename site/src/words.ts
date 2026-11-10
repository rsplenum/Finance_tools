/**
 * Words every tool page shares (WORDS1, docs/PLAN.md row 3). Each page keeps its own in `site/src/<tool>/words.ts`: one
 * short line a question, and the sources, dates and reasons in one closed part, "How this is worked out". A second
 * language is these files' work. Figures, and the sentences the model builds around them, are never written here.
 */
export const SHARED = {
  how: 'How this is worked out',
  assumed: 'What we assumed',
  fixed: 'These stay as they are for now',
  whyThese: 'Why these',
  show: 'Show',
  hide: 'Hide',
  change: 'Change',
  twice: 'Every figure is worked out twice in your browser and shown only when both agree.',
  rounded: 'Tables are in rupees, rounded; totals use the exact figures.',
  files: 'PDF, Excel and Word, made in your browser.',
  wait: 'PDF, Excel and Word, once the figures are in.',
  lender: 'The bank and the branch, if known.',
  preparedBy: 'If not the borrower.',
};

/** The record's own codes ("(D-UX-47)", "(E2, D-DATA-09)") never reach the screen (WORDS1): a reason from a data file passes through this. */
export const plain = (t: string) => t.replace(/\s*\((?:[A-Z]\d+, )?D-[A-Z]+-\d+(?:, D-[A-Z]+-\d+)*\)/g, '');
