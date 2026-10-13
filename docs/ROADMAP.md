# Road to launch (12-10-2026, D-TECH-36)

The engines and the five tools (DSCR, CMA, the planning estimate, the project report, Make it viable) are built for a first launch. None of the work below is new money maths: it's the wrapper. Each row is one fresh session. HANDOFF's Next table holds the row due next; when a session ends, it moves the following row from here into that table.

Sizes come from HANDOFF: S is about 60 steps or 15 minutes, M about 120 or 30, L about 200 or 45. The last ten sessions used 30 to 80% of their budget.

| # | Row | Size | Needs from the owner first |
|---|---|---|---|
| 1 | **UD1 Interaction data** (D-TECH-37, D-TECH-38): done 12-10-2026; records once the Worker is live (row 2) | L, high | — |
| 2 | **DEP1 Worker live**: D1 and KV created, UD1 recording on; U1's reading on if a key is set | S, high | the D1 and KV IDs (`docs/CLOUDFLARE.md` §2); an Anthropic key only if U1 is to be on |
| 3 | **LEGAL1 Policy pages**: privacy, terms, a "not advice" line, refunds and contact, linked from every footer (Razorpay asks for all of them). AI drafts, marked as drafts | M, high | the business name and a contact email; the lawyer reads them together with `docs/TRADEMARKS.md` |
| 3b | **DT1 Design team** (the owner's yes, 13-10-2026, D-UX-58): as agreed in "The design team" below; done 13-10-2026 (D-UX-59), the first review in `docs/design-reviews/` | L, Extra | a few sites you like the look of, as references |
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

## The design team (DT1, D-UX-58)
Agreed 13-10-2026 from the owner's request and two outside reviews. AI agents have no taste of their own and learn only through files, so the team runs on written rules, measured checks, real usage and the owner's judgement. The site is Astro, Preact and Tailwind 4.
- **`docs/DESIGN.md`**: the principles; the tokens (colour, type, a 4 px spacing scale, radius) in Tailwind 4's `@theme`; the shared parts (field, button, result panel, table, drawer, download row, notice); page templates; examples of acceptable and unacceptable work. Borrow proven interaction patterns (the GOV.UK Design System's forms, error messages and question pages), not GOV.UK's look. In order: reuse a pattern, adapt it, invent only when none fits, and test a new one before it is reused.
- **Each rule names the friction it removes and its evidence**: a WCAG criterion, published research (GOV.UK's, NN/g's), our own user tests or the usage numbers. A "law" named without a source counts for nothing; a review of 13-10-2026 offered several that do not hold (such as rounded corners being read faster). The owner's input behind these, with the rows that do not hold: `docs/design-inputs/cognitive-matrix.md`. The first principles: one thing per page where a flow has steps; a control beside the figure it changes (Make it viable, the estimate's sliders); labels on the chart or table, not in a distant legend; one accent colour, kept for the main action; lines of 45 to 75 characters; a reset always in reach; an answer that updates within 100 ms; no decoration that carries no meaning; no pure black behind white text in dark mode.
- **Two agents** in `.claude/agents/`: a designer that reads DESIGN.md and the open lessons, then proposes and builds; a critic that reviews on its own, ranks each finding blocker, significant or polish (an accessibility failure, broken navigation or an unusable phone layout is always a blocker) and checks that each fix works.
- **Measured checks in the site check**: axe-core with no violations; text contrast 4.5:1 and large text 3:1, and 3:1 for the edges of controls and the focus ring (WCAG 1.4.11), in light and dark; targets at least 24 by 24 px (WCAG 2.2 AA), 44 by 44 for the main controls on a phone; every control reachable by keyboard with a visible focus; no sideways scroll at 320 px; reduced motion respected; no raw colour or arbitrary size outside the tokens. That last check starts as a ratchet, since the pages hold 53 raw colour classes and 8 arbitrary values today (`text-[11px]` among them): the count may not grow, and UX2 to UX4 bring it to nil. WCAG sets no minimum text size; the house sizes live in DESIGN.md.
- **States, not one screenshot**: each tool is checked empty, partly filled, provisional (a fact missing), with an error, with a result and at the download, with focus and hover shown on its controls. Screenshots at 360 px (the common Indian Android width) and on a desktop, in light and dark, only for the pages a change touches; everything measurable is checked as text, since screenshots cost the most.
- **`docs/DESIGN-LESSONS.md`**, a queue rather than an attic: each entry has the observation, its evidence, the root cause, the rule, its scope and a status (proposed, accepted, superseded or rejected). A lesson is accepted only on evidence: a principle, a defect that repeats, an accessibility rule, the user tests, the usage numbers or the owner's word. An accepted lesson moves into DESIGN.md or the tokens and leaves the file, whose size the doc-size check caps.
- **The owner** sets the direction, picks between two or three looks in UX2, then judges only the preview link: does it read simply? The agents never merge.
- Left out: the reviews' quiz and simulation patterns, written for another site; a human designer for the logo waits until the name is settled.

## After launch, only if the interaction data asks for it
D3, the borrower's one-page checklist (D-DOC-11; its starter prompt is in HANDOFF-ARCHIVE, 12-10-2026). The CMA's second method above ₹5 crore and Form IV. U1 on the DSCR, an ITR or a CA's provisional figures. The schemes: CGTMSE's fee, MUDRA's limits, Stand-Up India and PMEGP from KVIC. The next four cities (D-DATA-13). More Make it viable levers (D-UX-50). Notes for kitchens, bathrooms and flooring. Design mode (D-UX-31). A sterner DSCR in own-figures mode.
