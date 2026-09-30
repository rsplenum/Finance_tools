# Working on this repo (for AI agents and developers)

- Start with `docs/HANDOFF.md` (current state, next work, gotchas), then only the parts of `docs/DECISIONS.md` you need (indexed). `docs/PROJECT.md` has the what/why. `docs/LESSONS-CARRIED.md` holds the lessons from the owner's earlier project: read §1 and §8 once per session.
- Keep token use low (owner's request): grep before reading, text assertions over screenshots, one feature per session; update `docs/HANDOFF.md` at the end of each session and give the owner a starter prompt for the next one.
- Numbers come only from the deterministic engine (`engine/`, pure TypeScript, no DOM). Never let an AI compute amounts, ratios, eligibility or prices shown to users. AI may draft narrative text from the user's own inputs, marked as a draft.
- Rules, benchmarks and rates live only in dated data files under `engine/data/`, each value with its source and date; lender-specific values are marked unverified until confirmed.
- Never default a missing fact: show what is needed and keep the result provisional.
- Test against real worked figures (anonymised), not figures the model produced; every quoted figure has an independent second computation.
- Screens use plain words; lists the owner gives are examples, not the full set; where rules are silent, flag, do not restrict.
- Every change: `npm test`, `npm run typecheck`, `npm run build`, `npm run check:site` (0 violations), the simulation (0 violations), regenerate docs, one line in `docs/DECISIONS.md`, commit. Draft PRs; the owner says "merge".
- No bank-internal material, circulars or customer data in this repo. Sample data anonymised; secrets only in environment settings.
- Legal condition (D-BIZ-01): market across India on the internet, but never sell directly to the customers of the owner's employer bank. No pages, campaigns or outreach aimed at them, and none of that bank's material.
- Build for Cloudflare Pages + Workers from day one (D-TECH-02); every branch gets a preview deploy.
