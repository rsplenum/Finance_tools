---
name: working-practice
description: How the owner wants work done in any repo - tokens, effort, tradeoffs, checks, records, safety. Read it at the start of each session and before building or changing anything.
---

# Working practice

What the owner taught across projects, so a new project starts where the last one ended. The owner is the person the work is for. Where a repo's CLAUDE.md or its own skills say otherwise, they win. `carried.md` in this folder indexes the lessons behind these rules, with the context each arose in.

## Tokens: every step re-reads the whole context

- One deliverable per session, each in a new session, with a budget set before it starts (S about 60 steps, M about 120, L about 200; stop at the budget plus a quarter) and ended by the handoff below; preparing the next session's row is part of the one that ends. Measure each session's actual and keep it next to its budget. When new work is asked in an old conversation, say once that a new session costs less.
- Grep before reading; never read a large file, PDF or source text whole. Check a page with text assertions, and take a screenshot only for a layout question.
- Put independent commands together in one step, and fetch many pages through one script that prints only what is needed.
- Compact at about 192k tokens: set `CLAUDE_CODE_AUTO_COMPACT_WINDOW` to `"260000"` under `env` in the repo's `.claude/settings.json` (a 1M-token window otherwise never compacts), and give CLAUDE.md a "Compact Instructions" section naming what a summary must keep.

## Effort and thinking

- Start at the effort the handoff's next row names, else high, in the app's words: high, or Extra where the main work is maths or design. Max is for bursts the owner switches on for a hard patch. Ultracode spends more, not less.
- Within it, think briefly on docs, bookkeeping and regenerated files; think fully (work it out, check it a second way, look for the case that breaks it) on money maths, a red check or a design choice.
- Keep the model the session started on: a change of effort keeps the prompt cache, a change of model does not.
- Hand an errand that reads much new material and returns little, such as fetching sources, to an agent on a cheaper model: the repo's `fetcher` agent (copy this folder's `fetcher.md` into `.claude/agents/`), or else the general-purpose agent with `model: sonnet` and that file's rules in its prompt. Never a figure, calculation code, a design or a fix.

## What the owner asks for

- Give the tradeoffs they may not have considered: the three to five that could change the decision, each with a recommendation. Then build, unless the choice is genuinely theirs; `brief-first` has the rest.
- A list the owner gives is examples, not the full set: generalise from it and say which cases you added. Where the rules are silent, flag it for a person; do not restrict.
- Propose your own ideas and criticise your own work; do not wait to be told everything.
- Search the source before asking the owner for a fact it already holds. Cite only what was looked up; say "approximate" otherwise.
- With the owner, name a setting as the screen they use shows it; use the setting file's word only where a file needs it.

## Checks

- Run a project's checks through one script that prints each check's exit code and only a failing check's output (`npm run verify` or its like); every change passes it.
- A test asserts that its fixture exists and is the one meant, picked by its full key, never a part of it; no expectations inside an `if`; a fixture picked for a property of the data (the cheapest, not yet checked) asserts that property first.
- A data check over many items collects every offender and asserts the list is empty, so one run names them all.
- Drive a page to reproduce a bug before fixing it. When a regression appears, test the commit before yours (a worktree at it) to learn whether it is new.
- A generated doc prints the exceptions and a count, not every row. Generate a rules doc from the code, so it cannot drift.
- Match text read across paragraphs with no space before a label that starts one: `textContent` joins paragraphs with none.
- Before building on a tool's setting, try it once in this environment and read what it did (a log line, an environment variable). After changing a tool's setting, confirm its effect in the logs before stating it as fact.

## Records

- `docs/DECISIONS.md`: one line per decision, with an ID by area (such as POL, UX, TECH, DOC, DATA, AI, BIZ), the date, what and where, why, and who decided, so later sessions do not decide it again.
- `docs/HANDOFF.md`, short and current, its size capped by a check (about 10 KB): the state and the next rows, each with its deliverable, budget, plan and the effort to start at. History, traps and what waits on the owner go to files read only by grep. End each session with a starter prompt the owner can paste into a new one.
- Recount a figure from the data just before writing it into a doc, by a script that says what it counts; where a generated doc can print it, print it there and cite that.
- The `lessons` skill at the end of each session.
- Draft PRs; the owner says "merge" once they have tried it. No hourly PR check-ins unless asked.

## Safety

- Nothing from the owner's office or employer, not even anonymised: no bank-internal material, circulars or customer data in any repo. In a project that sells, never sell directly to the customers of the owner's employer bank, nor aim pages, campaigns or outreach at them.
- Secrets only in environment settings. Before a real document reaches an AI service, decide which service may see it; anonymise first and keep the identity map out of git.
- Numbers shown to users come only from deterministic code, never from an AI (`money-maths-checks`). Measure an AI feature's cost per run rather than guess it, and trial a new model on synthetic data against known answers before relying on its claims.

## Claude Code on the web

- One session at a time per checkout. Before a `git reset` or `checkout -B`, read `git status` and `git log origin/<branch>`: one reset dropped another session's commit.
- A host the proxy blocks (403) is opened in the environment's settings, not worked round in code.
- A shell safety-check failure is transient: retry once, then carry on with the file tools.
