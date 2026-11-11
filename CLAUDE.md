# Working on this repo (for AI agents and developers)

Rahul is the owner: every "the owner" in this repo means Rahul (D-TECH-98). We are creators, not imitators (D-TECH-75). Tokens and attention go to building, and to checking that new work runs and breaks nothing (REFORM1, D-TECH-113). The numbers are the old ones, so "rule 17" in the code still points here.

## The lines that do not bend: money, law, privacy

12. Numbers come only from the deterministic engine (`engine/`, pure TypeScript, no DOM). Never let an AI compute amounts, ratios, eligibility or prices shown to users. AI may draft narrative text from the user's own inputs, marked as a draft, and read figures from the borrower's own documents, each shown with its page and line, cross-checked by the engine and confirmed by the borrower before it counts (D-UX-44).
13. Rules, benchmarks and rates live only in dated data files under `engine/data/`, each value with its source and date; lender-specific values are marked unverified until confirmed.
14. Never default a missing fact: show what is needed and keep the result provisional. The only exceptions are the stated assumptions in `engine/data/defaults.json` and `engine/data/architect.json`, each shown on the page with its reason (D-UX-08, D-UX-18, D-UX-32).
15. Test money against worked figures from outside the model: Rahul's own fictional cases, or public worked examples with their source. Every quoted figure has an independent second computation. Never anything from Rahul's office or employer, not even anonymised (D-BIZ-02).
17. A page's default path asks only the inputs Rahul listed for it: a ceiling on questions, never on ambition (the DSCR: Rahul's seven, depreciation an optional eighth, D-UX-10). The rest is a stated assumption or sits under one closed "More options". The site check counts the fields; only Rahul raises the count (D-UX-12).
19. No bank-internal material, circulars or customer data in this repo. Sample data anonymised; secrets only in environment settings; no PAN or GSTIN in the repo or on the site (D-BIZ-07).
20. Legal condition (D-BIZ-01): market across India on the internet, but never sell directly to the customers of Rahul's employer bank: no pages, campaigns or outreach aimed at them, and none of that bank's material.
21. The estimate works "as an architect would", but never calls the tool, a page or a document an architect: the Architects Act 1972, s. 37 (D-UX-18).

## How we work: lessons, which inform and bend

Everything below, and everything in `docs/`, is what we have learned so far. It is there to make the next piece of work better, never to limit it. When a lesson or a past decision stands in the way of a better result, set it aside and say so in one line; Rahul can overrule.

1. Plain, short words to Rahul, to the point, so that they can decide.
2. Outcome before architecture (D-UX-307, D-UX-309): start from the reference-quality result, never from what we have built; if the machinery cannot produce it, replace the machinery. Build the boldest version that serves the user; scale back only on Rahul's word. Simple for the user, ambitious in the work.
3. Recommend, don't survey: say in a line or two what you will do and why, then do it. Name a tradeoff only when it could flip Rahul's decision. Ask only what is truly Rahul's: money, law, customers, the name.
4. Reading: start with `docs/HANDOFF.md`. Then fetch only what the work touches: the topic file named in `docs/lessons/README.md`, a grep of `docs/GOTCHAS.md` for the files you will touch, a grep of `docs/DECISIONS.md` by id or word. Read whole what the task itself is about. Nothing else is read by every session.
5. Spend tokens on the work: independent commands in one step, text assertions over screenshots.
6. One deliverable per session: the real thing Rahul can open, rough but real, never a step toward it. Its row in `docs/HANDOFF.md` names it, its size (S, M, L) and its plan. Stop at the budget plus a quarter and hand off the rest (`npm run cost`). On a cost guard warning tell Rahul once and follow their word.
7. One row at a time, each in a fresh session on its own branch. A branch and its PR are their maker's until Rahul hands them over; a hook guards it.
8. Gears: start at the effort the row names. Think fully on money maths, a red check or a design choice; briefly on docs and bookkeeping. Keep the session's model. The `fetcher` agent runs errands that read much and return little, never a figure, a design or a fix. Never take a figure from WebFetch.
9. Websites: before reading any website, run `npm run hosts -- <hosts>` once and give Rahul the blocked ones to allow first; never try a blocked host (`docs/OWNER.md`).
10. Do not reopen a settled answer unasked. Reopen it when Rahul points out a problem, or when it stands in the way of the result.
11. Skills in `.claude/skills/` load by their descriptions; general copies live in `portable/` for Rahul's claude.ai account.
16. Screens use plain words; lists Rahul gives are examples, not the full set; where rules are silent, flag, do not restrict.
18. Every change: `npm run verify -- --quick`, commit, draft PR, ready when CI's full check is green; Rahul says "merge". Checks show that new work runs and breaks nothing, and guard money, law, privacy, accessibility and the question ceiling: never taste. What Rahul sees is done when they say it is better (D-UX-307). A line in `docs/DECISIONS.md` only when Rahul decides something, or for a choice on money, law or the product's shape; the commit holds the rest.
22. Build for Cloudflare Pages + Workers (D-TECH-02); every branch gets a preview deploy.

## Compact Instructions
When compacting, keep: Rahul's latest request in their words; the branch, the PR's number and state, and what is committed, pushed or only on disk; decisions, figures and errors met this session that are not yet in `docs/`; the next step. Leave out what a new session reads anyway: CLAUDE.md, the skills and `docs/` (name the file), file contents and tool output (name the path), and finished work (give the commit).
