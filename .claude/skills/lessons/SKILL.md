---
name: lessons
description: Keep what a session learns, with the context it arose in, so later sessions in this project or another do not pay for it again. Use it at the end of every working session, before the handoff and the commit; whenever the owner corrects course or says something is not what they asked for; when work had to be redone; when a check, test or CI run failed for a reason that could happen again; when something cost far more time or tokens than it should have; and when starting a new project, to bring the general lessons along. Use it even if no one says "lesson".
---

# Lessons

A session's code survives in the repo. What it learned survives only if it is written where the next session will meet it: chat history, the context window and the container are all lost. This skill turns a mistake or a correction into a rule kept at the place that enforces it, with a log row saying when it arose and why. The owner is the person the work is for.

## 1. Spot them: none to three a session

At the end of a session, and at the moment one of the triggers above happens, ask: what would I do differently if I started this session again? Keep only lessons that would change what a future session does. "Be careful with tests" is not one; "a test asserts that its fixture exists" is. Most sessions have none or one; more than three usually means they are not yet sorted by what matters.

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

Search the log and the skills for the same rule (grep a key word). If it is there, sharpen it or add the new context to its row rather than a second row. If a rule proved wrong, correct it in place and date the change; never leave two rules that disagree.

## 5. Tell the owner

One line per lesson: the rule and where it is kept, or "no new lessons". The owner can overrule a rule only if they see it.

## 6. Carry them to another project

- **Skills:** a skill with no project names in it (this one, and any made from `any` rows) can be saved to the owner's claude.ai account, from where it loads in every Claude Code session of every project. Keep the master copy in a repo and save it again after a change; or copy the folder into the new repo's `.claude/skills/`.
- **The log:** copy its `any` rows into the new project's log or carried lessons; leave the `here` rows behind.

Template for a new log:

    # Lessons
    What each session learned, the context it arose in, and where its rule now lives (the `lessons` skill). Reach `any`: holds in any project; `here`: this project only. Newest at the bottom.

    | Date | Context | What happened | Rule | Kept in | Reach |
    | --- | --- | --- | --- | --- | --- |
