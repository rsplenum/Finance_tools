/**
 * The privacy page's words (PRIV1, D-BIZ-07), in plain text for policy.ts. Each section names in `src` the code that
 * makes it true, and tests/privacy.test.ts holds each fact it states against that code: a change to what is kept, sent
 * or stored fails the test until these words change with it. The DPDP Act 2023 and its 2025 Rules ask for the notice,
 * consent, rights and grievance parts; a fact only the owner can give is a gap, never a guess.
 */
import type { Section } from './policy';

/** The Worker's own numbers (worker/src/events.ts KEEP_DAYS, worker/src/caps.ts CAP_DAYS), copied here as the site does
 * not load the Worker's code; the test fails when they part. */
export const KEEP_DAYS = 400;
export const CAP_DAYS = 2;

/** The day these words last changed. */
export const PRIVACY_DATE = '25-10-2026';

/** What a draft of the report's words sends (engine/narrative.ts, NarrativeInput), in words. */
export const DRAFT_SENDS = 'the business’s name, address, activity, constitution, scheme and products, the loan’s uses and sources, and your notes';

export interface PolicySection extends Section { src: string[] }

export const privacySections = (counting: boolean): PolicySection[] => [
  { h: 'What you type stays on your device', src: ['site/src/events.ts', 'site/src/download.ts', 'site/src/fields.tsx'], p: [
    'The figures, names and other details you type into a tool are worked out in your browser. They are not sent to us, and we cannot see them.',
    'Downloads (PDF, Excel and Word) are made in your browser too. Your answers stay on your device, only for this tab. Close the tab and they are gone.',
  ] },
  { h: 'What we count, never what you type', src: ['worker/src/event-shape.ts', 'worker/src/events.ts', 'worker/migrations/0001_events.sql', 'worker/wrangler.jsonc'], p: [
    'To make the tools better, we count which steps are used:',
    ['the page, and where the visit came from (our own pages, a search or elsewhere)', 'which field changed, by its name, never what is in it', 'parts opened, buttons tapped, whether a result was ready, a download’s format and an error shown', 'the time since the page opened, and the screen size as phone, tablet or desktop'],
    `A random tag ties one page view’s steps together. Your browser forgets it when you close the tab, and it is tied to nothing that names you. We set no cookies, use no outside analytics and never record your screen. The counts are kept for ${KEEP_DAYS} days, then deleted.`,
    'To stop floods, your internet address is counted for one minute, then forgotten; it is never stored with the counts.',
    counting ? 'This counting is on.' : 'This counting is not switched on yet; this page will say when it is.',
  ] },
  { h: 'When an AI reads a statement or drafts words for you', src: ['site/src/cma/Read.tsx', 'worker/src/read.ts', 'site/src/report/Words.tsx', 'worker/src/draft.ts', 'engine/narrative.ts', 'worker/src/caps.ts'], p: [
    'On the CMA page you may choose to have an AI find the figures in an audited statement instead of typing them. Only then does the statement’s text leave your device: it goes to our server and on to Anthropic, the US company whose AI reads it, so it is handled outside India. The AI says where each figure is printed; your browser copies the figures, and none counts until you tick it.',
    `On the project report you may choose to have the same AI draft the report’s words. Only then does this go, by the same road. It sends ${DRAFT_SENDS}, but no figure.`,
    `We do not keep or log what is sent; Anthropic handles it under its own terms. To limit how many reads and drafts a day, your internet address is counted for ${CAP_DAYS} days, then forgotten. If you would rather nothing left your device, type the figures and write the words yourself.`,
  ] },
  { h: 'Who else sees your visit', src: ['worker/wrangler.jsonc', 'site/src/theme.ts', 'site/src/report/Report.tsx', 'site/src/fields.tsx'], p: [
    'Cloudflare hosts this site and our server, and may hold the counts outside India. Like any host, it receives your internet address and browser details when a page loads. Its own privacy policy covers them. Our server’s error notes say only what kind of failure it was. From launch we will also use Cloudflare Web Analytics, which counts page views without cookies.',
    'Your browser remembers two choices on your device: light or dark, and the project report’s simple or expert view. For this tab only, it also keeps your answers, and clears them when you close it. Uploaded documents and results are never kept. We show no ads today.',
  ] },
  { h: 'What this means under India’s data law', src: ['site/src/privacy.ts'], p: [
    'The Digital Personal Data Protection Act, 2023 and its 2025 Rules cover personal data: anything that names you or could. What we may hold of it, and why:',
    ['your internet address, for one minute to stop floods, or two days to cap the AI’s reads and drafts', 'what an AI read or draft sends, only while it is worked, to give you the figures’ places or the draft', 'what you write to us, to answer you'],
    'We ask nothing else, and the counts above name no one. Choosing an AI read or draft is your consent to send it. You may stop at any time by typing instead. Nothing of it is kept, so there is nothing to withdraw.',
  ] },
  { h: 'No accounts and no payments yet', src: ['site/src/site.ts'], p: [
    'You do not sign up, and we take no payments today. Before we do, this page will say what a payment shares and with whom.',
  ] },
  { h: 'Your rights', src: ['site/src/site.ts', 'site/src/pages/contact.astro'], p: [
    'Write to us through the [Contact](/contact/) page to ask what we hold about you, or to have it corrected or deleted. You may also name someone to act for you if you die or cannot act, or complain. Our grievance officer is named there: the person who answers questions about your data. They will answer within {gap:how many days we take, 90 at most}.',
    'If you are not satisfied with the answer, you may complain to the Data Protection Board of India. As we keep nothing that names you, most answers will be short.',
    'This site is meant for adults, 18 or over. When this page changes, the date at the top changes too.',
  ] },
];
