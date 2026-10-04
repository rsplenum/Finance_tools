# Portable skills

The owner's general skills, which hold in any project (D-TECH-27). Uploaded to the owner's claude.ai account, they load in the owner's Claude Code sessions of every project (cloud, Cowork, and a terminal signed in with that account) when a task matches. Where a project has a skill of the same name, as this repo does for four of them, the project's copy runs.

| Skill | Master copy | Loads |
| --- | --- | --- |
| `working-practice` | `skills/working-practice/`, with `.claude/agents/fetcher.md` added as `fetcher.md` | at the start of each session |
| `brief-first` | `skills/brief-first/` | when the owner asks to build or change anything |
| `money-maths-checks` | `skills/money-maths-checks/` | for any money figure |
| `lender-documents` | `skills/lender-documents/` | for documents a borrower hands a lender |
| `lessons` | `.claude/skills/lessons/`, shared with this repo | at the end of each session, on a correction |

## Upload

1. `npm run pack-skills` writes one zip per skill to `portable/dist/` (not committed).
2. On claude.ai: Settings → Capabilities → Skills, upload each zip. After a change, replace that skill with its new zip.

## A new project

- Add one line to its CLAUDE.md: "Read the `working-practice` skill at the start of each session." Account skills load only when a task matches; the line makes sure this one does.
- Start `docs/LESSONS.md` from the template in the `lessons` skill, and `docs/DECISIONS.md` and `docs/HANDOFF.md` as `working-practice` says.
- For the `fetcher` agent there, copy `fetcher.md` from the `working-practice` skill into `.claude/agents/`.

## Keeping it current

`npm run verify` runs `node portable/pack.mjs --check`. It fails when a skill's name differs from its folder, a description is over claude.ai's 200 characters, a file names this project, or a rule that `docs/LESSONS.md` marks `any` is missing from the pack word for word (`skills/working-practice/carried.md` holds each one). After a change, run `npm run pack-skills` and send the owner the changed zips to upload. A lesson found in another project reaches the pack when the owner brings its row to a session here.
