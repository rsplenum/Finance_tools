---
name: lessons
description: Keep what a session learns where later sessions will meet it. Use at the end of each session, on a correction, after redone work or a failure that could recur, or to measure a session's cost.
---

# Lessons

A session's code survives in the repo. What it learned survives only if it is written where a later session will meet it: chat history, the context window and the container are all lost. The owner is the person the work is for.

A lesson is there to make the next piece of work better. It says what happened and what we took from it, so a mistake is not made twice. **It is not a rule.** It informs and it bends: when a lesson stands in the way of a better result, the session sets it aside and says so in one line. A lesson is never a limit on how to design, what to try or what to leave out. The few lines that do not bend (the law, money, privacy, what the owner decided as theirs) live in the project's always-read instructions, not here.

## 1. Spot them: none to three a session

At the end of a session, and on a correction, redone work or a failure that could recur, ask: what would I do differently if I started this session again? Keep only what would change what a future session does. "Be careful with tests" is not a lesson; "a test asserts that its fixture exists" is. Most sessions have none or one.

The owner's own corrections are the most valuable kind: quote their words.

## 2. Write it once, by topic

Lessons live in `docs/lessons/`: a short `README.md` (which file to read for which kind of work) and one file a topic (the owner's own words, design, words, checks, sessions, or what the project needs). No session reads them all: a session reads the file its work touches.

An entry has three parts, in a line or two: **what happened** (with the date and the task, so the story can be found), **what we learned**, and **when it applies**. Write it as something learned ("a figure that changes out of sight was the one fault the measure found"), not as an order.

Before adding, grep the topic file and the skills for the same point. If it is there, sharpen that entry: never a second copy. A lesson that proved wrong is corrected in place. A lesson that no longer holds is taken out. A file that grows past what a session would read in a minute is due a merge.

## 3. Where else it may go

- **The skill for that kind of task**, when the lesson is how to do a task that comes up again: one line there, and no copy elsewhere.
- **A traps file read by grep** (`docs/GOTCHAS.md`), for a fact about one file or tool that will likely expire.
- **A check or a test, only when both hold**: a machine can tell right from wrong, and the lesson guards money, law, privacy, accessibility or a flow that breaks for a user. A matter of taste, wording or layout is never a check: checks of that kind pile up until every change is a negotiation with them, and the work bends to fit the checks.
- **The always-read instructions**, almost never: every line there is paid for at every step.

## 4. Tell the owner

One line per lesson: what was learned and where it is kept, or "no new lessons". When you set a lesson aside for a better result, say which, so the owner can overrule.

## 5. Carry them to every project

The owner's general skills (this one, `working-practice`, `brief-first`, `money-maths-checks` and `lender-documents`) are kept as a pack: master copies in the `portable/` folder of the repo that keeps it, uploaded to the owner's claude.ai account, from where they load in the sessions of every project. Where a project has a skill of the same name, the project's copy runs.

A lesson that holds in any project goes into the pack's skill for that task, in general words, and the owner is told which skill to upload again. In another project, give it in the handoff for the owner to bring to the pack. A new project starts `docs/lessons/` with a `README.md` and the first topic file it needs.

## 6. Measure a session

`scripts/session-cost.mjs`, in this skill's folder, reads a Claude Code session log (the newest for the current folder, or the path given) and prints its steps and working hours, its context sizes, where compactions fired and how long each paused the work, where the cost went, a replay at other compaction sizes: cost, how often, and minutes of pause an hour; and where re-reading went beyond the plan: cache misses (and how many followed a break of over an hour), the three additions that cost most to re-read (a step's tool results, or a message typed or pasted, measured by the next step's real token count), and the steps after the last merge. Run it when a session felt slow or costly, and after a few sessions to check the compaction size (`CLAUDE_CODE_AUTO_COMPACT_WINDOW`). Compaction fired at about 0.8 × (window − 20k) in Claude Code 2.1, a share it can change, so trust the log over the setting's name.
