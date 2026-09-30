# Decisions log
One line per decision: ID · date · the decision (what, where in code) · why · by (U = owner, C = Claude). Newest at the bottom of each section. Never re-decide a logged question without a new line that supersedes it.

## Index
POL (calculation rules and benchmarks) · UX · TECH · DOC (documents produced) · DATA · AI · BIZ (pricing, legal, channels)

## POL
| ID | Date | Decision | Why | By |
|---|---|---|---|---|

## UX
| ID | Date | Decision | Why | By |
|---|---|---|---|---|

## TECH
| ID | Date | Decision | Why | By |
|---|---|---|---|---|
| D-TECH-01 | 30-09-2026 | Astro + Preact + Tailwind static site on Cloudflare Pages; engine in pure TypeScript run in the browser; one Worker for Razorpay orders, webhook verification and download tokens; D1 + KV | Near-zero running cost; customer financials stay in the browser (study report) | U+C |
| D-TECH-02 | 30-09-2026 | **Build for Cloudflare from day one; do not build on a claude.ai page first and port later.** Development still happens in Claude Code sessions in the cloud, as for the appraisal tool. Every branch deploys a Cloudflare Pages preview (free), and a claude.ai page is used only if the owner wants a private demo. | A claude.ai page cannot carry a domain, search-indexed pages (pSEO), Razorpay or a Worker, which are the product. Porting later would mean rebuilding routing, payments and SEO; building the same static Astro site straight onto Pages costs nothing extra. The appraisal tool was different: private and internal, with no payment or SEO. | U+C |
| D-TECH-03 | 30-09-2026 | **Lessons carried** from the appraisal project in `docs/LESSONS-CARRIED.md`; CLAUDE.md requires reading §1 and §8 every session. Generic code carried with no bank references: `engine/util.ts` (EMI, principal from EMI, outstanding balance, Indian number format, amount in words), `engine/parse.ts` (70 L / 1.2 Cr / dd-mm-yyyy), `site/src/theme.ts` + `ThemeToggle.tsx` (not typechecked until the site is set up) | Owner: carry every lesson | U |

## DOC
| ID | Date | Decision | Why | By |
|---|---|---|---|---|

## DATA
| ID | Date | Decision | Why | By |
|---|---|---|---|---|

## AI
| ID | Date | Decision | Why | By |
|---|---|---|---|---|

## BIZ
| ID | Date | Decision | Why | By |
|---|---|---|---|---|
| D-BIZ-01 | 30-09-2026 | **Permitted with one condition:** the owner may build this and market it on the internet across India, but must not sell these services directly to the customers of the bank that employs them. So: no selling at or through that bank's branches, no outreach to its borrowers, no pages or campaigns aimed at that bank's customers, and no use of that bank's internal material or formats. Bank staff are not customers. | Owner's legal question settled, 30-09-2026 | U |
