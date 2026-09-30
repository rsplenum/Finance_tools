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
| D-UX-01 | 30-09-2026 | **Mobile and dark mode are checked, not promised:** `npm run check:site` (`scripts/site-check.mjs`, in CI) opens every built page at 390 px in light and dark and fails on horizontal scroll, an input under 16 px, text below WCAG AA contrast (catches a missing `dark:` class), a missing title, description or single h1, script or console errors, missing files, a light flash before scripts load (inline `THEME_BOOT` in `theme.ts`), or the toggle not cycling Auto → Light → Dark and remembering it | Lessons §4 as text assertions; each check was seen to fail on a planted fault | C |
| D-UX-02 | 30-09-2026 | Placeholder tool page `/dscr/` with one working field: the loan amount typed as 70 L, 1.2 Cr or 70,00,000, read back in figures and words by the engine (`site/src/amount.ts`). The home page lists the four tools; only built ones link | Proves engine-in-the-browser and the field conventions (`fld-…`, `data-testid`) before P1 | C |

## TECH
| ID | Date | Decision | Why | By |
|---|---|---|---|---|
| D-TECH-01 | 30-09-2026 | Astro + Preact + Tailwind static site on Cloudflare Pages; engine in pure TypeScript run in the browser; one Worker for Razorpay orders, webhook verification and download tokens; D1 + KV | Near-zero running cost; customer financials stay in the browser (study report) | U+C |
| D-TECH-02 | 30-09-2026 | **Build for Cloudflare from day one; do not build on a claude.ai page first and port later.** Development still happens in Claude Code sessions in the cloud, as for the appraisal tool. Every branch deploys a Cloudflare Pages preview (free), and a claude.ai page is used only if the owner wants a private demo. | A claude.ai page cannot carry a domain, search-indexed pages (pSEO), Razorpay or a Worker, which are the product. Porting later would mean rebuilding routing, payments and SEO; building the same static Astro site straight onto Pages costs nothing extra. The appraisal tool was different: private and internal, with no payment or SEO. | U+C |
| D-TECH-03 | 30-09-2026 | **Lessons carried** from the appraisal project in `docs/LESSONS-CARRIED.md`; CLAUDE.md requires reading §1 and §8 every session. Generic code carried with no bank references: `engine/util.ts` (EMI, principal from EMI, outstanding balance, Indian number format, amount in words), `engine/parse.ts` (70 L / 1.2 Cr / dd-mm-yyyy), `site/src/theme.ts` + `ThemeToggle.tsx` (not typechecked until the site is set up) | Owner: carry every lesson | U |
| D-TECH-04 | 30-09-2026 | **One root package, no workspaces:** `site/` (Astro 7, Preact 10, Tailwind 4 through its Vite plugin; Astro runs from inside `site/`, output `site/dist`) and `worker/` share the root `package.json` and lockfile; the site imports `engine/` directly. Preact stays on 10 (`@astrojs/preact` does not support 11); Playwright pinned to 1.56.1, the Chromium pre-installed in cloud sessions; `.node-version` 22 for CI and Cloudflare | One install for CI, Pages and Workers builds; nothing to publish between packages | C |
| D-TECH-05 | 30-09-2026 | **Typecheck is two programs** (`npm run typecheck`): engine, tests and site `.ts/.tsx` with DOM types; the Worker with runtime types from `wrangler types`, generated at typecheck and gitignored (616 KB would flood every grep). TypeScript 7 kept, so `.astro` files are not type-checked (`astro check` needs TypeScript 6 or lower): logic stays out of `.astro` files. Revisit when `@astrojs/check` supports 7 | Checks everything the tools can check; low token use | C |
| D-TECH-06 | 30-09-2026 | **Worker `finance-tools-api`:** `GET /health` only, 200 or 503 naming a missing binding; D1 `DB` and KV `KV` with placeholder IDs until the owner creates them (IDs are not secrets; secrets only through `wrangler secret put` or the dashboard); compatibility date = runtime of the pinned wrangler; `workers.dev` and preview URLs on | P0 scope; a missing binding is shown, never assumed | C |
| D-TECH-07 | 30-09-2026 | **Pages headers and 404:** `site/public/_headers` sets `noindex` on every page until launch on the real domain, plus nosniff, a referrer policy and a year's cache for hashed `/_astro/` files; `404.astro` exists because without a `404.html` Pages answers every unknown path with the home page | Placeholder and `pages.dev` copies must not be indexed; no soft 404s once pSEO pages exist | C |

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
