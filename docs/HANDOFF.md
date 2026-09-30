# Handoff — start here in a new session
State at 30-09-2026: repo set up from the appraisal project's starter kit. It has the lessons, CLAUDE.md, DECISIONS (hosting D-TECH-02, legal condition D-BIZ-01), the project brief, generic loan maths and parsing with tests (3 passing), and CI (tests + typecheck on every push). No site, Worker or tool yet; next is **P0-setup + P1 DSCR**. Keep this file short and current.

## Where things are
- Live site: not yet (Cloudflare Pages). Worker: not yet. Repo: rsplenum/Finance_tools. Study report (private): https://claude.ai/code/artifact/4bad29bb-5d80-4b27-9386-be3f2581c068
- Read order: `CLAUDE.md` → this file → the `docs/DECISIONS.md` sections you need → `docs/PROJECT.md` only for the why.

## What works now
- `engine/util.ts` (EMI, formats, words) and `engine/parse.ts` (amounts, dates), tested in `tests/util.test.ts` against textbook figures.
- `site/src/theme.ts`, `ThemeToggle.tsx`: waiting for the Astro site.

## Next — one fresh session per item
| # | Session | Starter prompt (paste as the first message) |
|---|---|---|
| P0 | Site + Worker skeleton | "Read CLAUDE.md, docs/HANDOFF.md, docs/PROJECT.md and docs/LESSONS-CARRIED.md §1 and §8. Set up `site/` (Astro + Preact + Tailwind, static, dark mode with site/src/theme.ts, mobile-first: no horizontal scroll at 390 px, 16 px inputs) and `worker/` (Cloudflare Worker with wrangler config, D1 + KV bindings, no secrets in the repo; a health route only). Add both to tsconfig and CI. Tell me exactly what to set up on Cloudflare (Pages project connected to this repo, preview deploys per branch). Finish per HANDOFF." |
| P1 | DSCR statement | "Read CLAUDE.md, docs/HANDOFF.md and LESSONS-CARRIED §1 and §8. Build the DSCR engine first: year-wise DSCR, average and minimum, and the loan amount or tenure that meets a target. Keep the definitions and benchmarks in dated data files and list the common variants lenders use. Write golden tests against my worked figures (ask me for them; until then use a hand-worked example and say so) plus a second independent computation. Then the calculator page with a free preview, plain words, and what limits the result. No payment yet. Finish per HANDOFF." |

## End of every session
1. Tests, typecheck, simulation (0 violations), regenerate docs; one line in `docs/DECISIONS.md`.
2. Update this file (state + next), commit, draft PR, deploy the preview.

## Waiting on the owner
- Worked DSCR figures from 3–5 real (anonymised) files for golden tests.
- Which lenders' DSCR definitions and benchmarks come first.
- Business entity, GST registration and Razorpay account (Phase 0).
- First region and cities for construction rates (Phase 2).
- Main customer first: DSAs (plans) or borrowers (one-off).

## Gotchas
- One session at a time per checkout; check `git log origin/<branch>` and `git status` before any reset.
- The session's git proxy caps concurrent git operations: one clone or fetch at a time.
