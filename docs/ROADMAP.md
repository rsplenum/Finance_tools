# Road to launch (17-10-2026; D-TECH-36, redrawn by D-TECH-42)

The engines and the five tools (DSCR, CMA, the planning estimate, the project report, Make it viable) are built. What is left is the wrapper: the last pages in the new look, the Worker, the policy pages, downloads on any phone, the search pages, one release check, then launch. None of it is new money maths. Each row is one fresh session; HANDOFF's Next table holds the rows due next, and the session that ends moves the following row from here into it.

Sizes come from HANDOFF: S is about 60 steps, M about 120, L about 200. What is left adds up to about 1,000 steps over ten sessions. The long pole is the owner's column, not the sessions, so the owner's items start now, in parallel (below).

## Done
UD1 interaction data (records once DEP1 is live), DT1 the design team, UX1 research, UX2 and UX2b the load measure and home, AG1 to AG3c FinSight's look and trailers on home, UX3 the DSCR and CMA pages, UX4 the critics' fixes and the estimate (PR #74).

## The path, in order
| # | Row | Size | Done when (the quality bar) | Needs from the owner first |
|---|---|---|---|---|
| 1 | **UX5** The project report in FinSight's look; the report's findings 3 to 12; CMA 6 (a card a year below 640 px) and 14; the critics on the estimate and the report | M, high | every finding a blocker or significant fixed, the critics' fix-checks pass, the load and token ratchets no higher | — (your test notes, if they have come) |
| 2 | **UX6** The last of the look: the 404 page in the new look, the old look's rules out of `docs/DESIGN.md` (its cap back to 12 KB), raw colours and arbitrary values to nil; the site check's one intermittent CI failure (D-TECH-41) root-caused if its annotation has named it | S, high | every page in `NEW_LOOK`; the ratchet at 0 and the baseline file emptied of tokens | — |
| 3 | **DEP1** Worker live: D1 and KV, the events table, `PUBLIC_API_URL`, UD1 recording | S, high | `/health` ok, a batch from the live site in D1, `npm run usage` answering | the D1 and KV IDs (`docs/CLOUDFLARE.md` §2) |
| 4 | **LEGAL1** Policy pages: privacy, terms, "not advice", refunds, contact, in every footer. AI drafts, marked as drafts | M, high | each page linked from every footer and checked by the site check; the drafts with the lawyer | the business name and a contact email |
| 5 | **Q1** Downloads on any phone: a slow-phone timing in the site check, a way out of WhatsApp's in-app browser | S, high | every download opens on your iPhone and Android, timed in the check | your phone test of today's downloads |
| 6 | **SEO1** pSEO plan: the searches people in India make, the page types, the count, each page's data | M, high | a plan you approve, with its sources | the hosts `npm run hosts` names, allowed |
| 7 | **SEO2** The pSEO template and the first 50 pages, each with a working calculator; sitemap, canonicals, structured data; a check that fails thin pages | L, Extra | every page passes the thin-page check and the site check | — |
| 8 | **SEO3** The rest of the batch and the internal links | M, high | as SEO2, at full count | — |
| 9 | **RC1** Release check: every page by a critic at once, your five tests scored by the researcher, the live Worker's first funnels read, `noindex` still on; what it finds is fixed in this row or named as a launch blocker; the network back from Full to the list of allowed hosts, with the ones SEO1 used (`docs/OWNER.md`) | M, high | no blocker open; every check at 0 | your five tests' notes; the lawyer's review back |
| 10 | **LAUNCH** The real domain, `noindex` off, Search Console, Cloudflare Web Analytics | S, high | the site on its domain, indexed, the analytics counting | the name and domain, the lawyer's sign-off |
| 11 | **P1d Payment** (its row: `docs/HANDOFF-ARCHIVE.md`) | L, high | a paid statement end to end in Razorpay's test mode, then live | Phase 0: the entity, GST, Razorpay and the price |

The free tools launch at row 10; payment follows at row 11 when Phase 0 is done.

## The owner's path, started now (each one unblocks a row above)
In order of the rows they unblock; `docs/OWNER.md` has the clicks for each.
1. Try PR #74's work on the live site once merged (`docs/OWNER.md`), and run the five tests (`docs/design-reviews/2026-10-13-test-script.md`), about 2 hours: RC1, and UX5 if they come early.
2. Create the D1 and KV and send their IDs: DEP1.
3. The name: search the trademark register, buy the domain, set up a contact email: LEGAL1 and LAUNCH.
4. Book the IP lawyer for `docs/TRADEMARKS.md` and the policy drafts: RC1 and LAUNCH.
5. The phone test of the downloads: Q1.
6. Allow SEO1's hosts.
7. Phase 0 (entity, GST, Razorpay, price): P1d only; it does not hold the launch.

## How the cost stays low without a shortcut
- Quality holds by gates, not effort: `npm run verify` at 0 violations on every change, an independent second computation for any figure, the critics' blockers fixed before "merge", your try on the preview, and RC1 before launch.
- One deliverable a session, in a new session, with its owner inputs gathered before it starts: a session that waits mid-way for an answer pays for its whole context again.
- Agents only where they pay for themselves (UX4: 62% of its cost). The designer builds; one critic per page changed, never a second pass over a page unchanged; fix-checks by text assertions, not screenshots.
- A fix to a shared part is checked on every page that uses it, in the same session (DESIGN-LESSONS 8), so no row redoes another's work.
- SEO2 makes pages from one template and data, so fifty pages cost one template; the thin-page check keeps quality at scale.
- CI's failures come back as annotations (D-TECH-41), so a red check is read in one step, not guessed at.

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
D3, the borrower's one-page checklist (D-DOC-11; its starter prompt is in HANDOFF-ARCHIVE, 12-10-2026). The CMA's second method above ₹5 crore and Form IV. U1 on the DSCR, an ITR or a CA's provisional figures. The schemes: CGTMSE's fee, MUDRA's limits, Stand-Up India and PMEGP from KVIC. The next four cities (D-DATA-13). More Make it viable levers (D-UX-50). Notes for kitchens, bathrooms and flooring. Design mode (D-UX-31). A sterner DSCR in own-figures mode. A paid API for lenders (parked, SWOT 10-10-2026).
