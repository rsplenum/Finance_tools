# Road to launch (12-10-2026, D-TECH-36)

The engines and the five tools (DSCR, CMA, the planning estimate, the project report, Make it viable) are built for a first launch. None of the work below is new money maths: it's the wrapper. Each row is one fresh session. HANDOFF's Next table holds the row due next; when a session ends, it moves the following row from here into that table.

Sizes come from HANDOFF: S is about 60 steps or 15 minutes, M about 120 or 30, L about 200 or 45. The last ten sessions used 30 to 80% of their budget.

| # | Row | Size | Needs from the owner first |
|---|---|---|---|
| 1 | **UD1 Interaction data** (D-TECH-37, D-TECH-38): done 12-10-2026; records once the Worker is live (row 2) | L, high | — |
| 2 | **DEP1 Worker live**: D1 and KV created, UD1 recording on; U1's reading on if a key is set | S, high | the D1 and KV IDs (`docs/CLOUDFLARE.md` §2); an Anthropic key only if U1 is to be on |
| 3 | **LEGAL1 Policy pages**: privacy, terms, a "not advice" line, refunds and contact, linked from every footer (Razorpay asks for all of them). AI drafts, marked as drafts | M, high | the business name and a contact email; the lawyer reads them together with `docs/TRADEMARKS.md` |
| 3b | **DT1 Design team** (proposed 12-10-2026, waits on the owner's yes): `docs/DESIGN.md` (principles, the look as tokens, the shared parts, do and don't, borrowing proven public form patterns such as the GOV.UK Design System's), two agents in `.claude/agents/` (a designer that proposes and builds screens, and a critic that reviews screenshots at 390 px and a desktop, light and dark, against DESIGN.md, `brief-first` and WCAG 2.2 AA), automatic checks for contrast, tap-target size and text size in the site check, and `docs/DESIGN-LESSONS.md` that each review adds to. It learns through files: the funnels (UD1), your test notes (UX1) and your verdicts. UX1 to UX4 then run through it | M, Extra | your yes; a few sites you like the look of, as references |
| 4 | **UX1 Research**: each tool and the home page audited at 390 px and on a desktop against `brief-first` and UD1's first funnels, plus a 20-minute test script for five people you pick (DSAs, borrowers, a CA) | M, high | you run the five tests, about 2 hours of your time |
| 5 | **UX2 Design**: one look for the site (type, colour, spacing, the shared parts) and the home page | L, Extra | UX1's findings and your test notes |
| 6 | **UX3** The look applied to the DSCR and CMA pages | M, high | — |
| 7 | **UX4** The look applied to the estimate and the project report | M, high | — |
| 8 | **SEO1 pSEO plan**: the searches people in India make, the page types, how many pages, and the data each page needs | M, high | the hosts `npm run hosts` names, allowed first |
| 9 | **SEO2 pSEO template and first batch** (about 50 pages, each with a working calculator), plus the sitemap, canonical tags, structured data, and a site check that fails thin pages | L, Extra | — |
| 10 | **SEO3** The rest of the batch and the internal links | M, high | — |
| 11 | **Q1 Downloads on any phone** | S, high | your phone test of today's downloads |
| 12 | **LAUNCH**: the real domain, `noindex` off, Search Console, Cloudflare Web Analytics | S, high | the name and domain, the lawyer's review |
| 13 | **P1d Payment** (its row: `docs/HANDOFF-ARCHIVE.md`) | L, high | Phase 0: the entity, GST, Razorpay and the price |

The free tools can launch at row 12, with payment added at row 13 when Phase 0 is done.

## After launch, only if the interaction data asks for it
D3, the borrower's one-page checklist (D-DOC-11; its starter prompt is in HANDOFF-ARCHIVE, 12-10-2026). The CMA's second method above ₹5 crore and Form IV. U1 on the DSCR, an ITR or a CA's provisional figures. The schemes: CGTMSE's fee, MUDRA's limits, Stand-Up India and PMEGP from KVIC. The next four cities (D-DATA-13). More Make it viable levers (D-UX-50). Notes for kitchens, bathrooms and flooring. Design mode (D-UX-31). A sterner DSCR in own-figures mode.
