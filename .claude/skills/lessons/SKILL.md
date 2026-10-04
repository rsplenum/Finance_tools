---
name: lessons
description: Keep what a session learns where later sessions will meet it. Use at the end of each session, on a correction, after redone work or a failure that could recur, or to measure a session's cost.
---

# Lessons

A session's code survives in the repo. What it learned survives only if it is written where the next session will meet it: chat history, the context window and the container are all lost. This skill turns a mistake or a correction into a rule kept at the place that enforces it, with a log row saying when it arose and why. The owner is the person the work is for.

## 1. Spot them: none to three a session

At the end of a session, and at the moment one of the triggers above happens, ask: what would I do differently if I started this session again? Keep only lessons that would change what a future session does. "Be careful with tests" is not one; "a test asserts that its fixture exists" is. Most sessions have none or one; more than three usually means they are not yet sorted by what matters.

A lesson stops repeated work or a repeated mistake. It is never a rule about how to design, what to try or what to leave out: such rules narrow the next session's thinking and save nothing. Prefer a check, which says nothing until something breaks, and delete a rule that gets in the way more than it saves.

## 2. Write the row

In the project's lessons log (`docs/LESSONS.md`; start it from the template in §6 if missing), one row each:

- **Context:** what we were doing and what set it off, in a few words. A rule without its context gets applied where it does not fit, or dropped as arbitrary.
- **What happened:** the cost: rework, a red build, hours, tokens, the owner's words.
- **Rule:** one imperative sentence a stranger could follow.
- **Kept in:** where the rule now lives (§3). The log is the index; the rule itself lives where it acts.
- **Reach:** `any` if it holds in any project (write it without this project's names, ready to move), `here` if it is about this project only.

## 3. Keep the rule at the strongest place that fits

1. **A check, test, lint rule or hook.** It cannot be forgotten and costs no tokens to remember. Prefer it whenever a machine can tell right from wrong.
2. **A line in the skill for that kind of task.** It loads only when that task comes up. Make a new skill only when about three rules about the same kind of task have gathered, or the owner asks: a skill of one rule is noise in every session's list.
3. **The always-read instructions (CLAUDE.md or its like).** Only for rules that apply at every step, since every line there is paid for at every step.
4. **The handoff's gotchas.** For facts about this project that will likely expire: a tool's version, a workaround.

Write the rule with its reason, in the plain style of its neighbours.

## 4. Before adding

Search the log, the skills and the pack's `carried.md` (§6) for the same rule (grep a key word). If it is there, sharpen it or add the new context to its row rather than a second row. If a rule proved wrong, correct it in place and date the change; never leave two rules that disagree.

## 5. Tell the owner

One line per lesson: the rule and where it is kept, or "no new lessons". The owner can overrule a rule only if they see it.

## 6. Carry them to every project

The owner's general skills (this one, `working-practice`, `brief-first`, `money-maths-checks` and `lender-documents`) are kept as a pack: master copies in the `portable/` folder of the repo that keeps it, uploaded to the owner's claude.ai account, from where they load in the sessions of every project. Where a project has a skill of the same name, the project's copy runs.

- **A lesson with reach `any`** also goes into the pack: its row, with the rule word for word, in `carried.md` (in `working-practice`), and the rule itself in the pack's skill for that task. In the repo that keeps the pack, its check fails until then, and `npm run pack-skills` makes the zips to send the owner; in another project, give the row in the handoff for the owner to bring there. Either way, tell the owner which skills to upload again.
- **A new project:** start its log from the template below, and read `carried.md` once.

Template for a new log:

    # Lessons
    What each session learned, the context it arose in, and where its rule now lives (the `lessons` skill). Reach `any`: holds in any project; `here`: this project only. Newest at the bottom.

    | Date | Context | What happened | Rule | Kept in | Reach |
    | --- | --- | --- | --- | --- | --- |

## 7. Measure a session

`scripts/session-cost.mjs`, in this skill's folder, reads a Claude Code session log (the newest for the current folder, or the path given) and prints its steps and working hours, its context sizes, where compactions fired and how long each paused the work, where the cost went, and a replay at other compaction sizes: cost, how often, and minutes of pause an hour. Run it when a session felt slow or costly, and after a few sessions to check the compaction size (`CLAUDE_CODE_AUTO_COMPACT_WINDOW`). Compaction fired at about 0.8 × (window − 20k) in Claude Code 2.1, a share it can change, so trust the log over the setting's name.
