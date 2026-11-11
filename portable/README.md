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
- Start `docs/lessons/` as the `lessons` skill says (a short index and one file a topic), and `docs/DECISIONS.md` and `docs/HANDOFF.md` as `working-practice` says.
- For the `fetcher` agent there, copy `fetcher.md` from the `working-practice` skill into `.claude/agents/`.

## Keeping it current

`npm run pack-skills` checks the pack before it writes the zips: it stops when a skill's name differs from its folder, a description is over claude.ai's 200 characters, or a file names this project. It is not part of `npm run verify`, and no lesson is held word for word in two files. A lesson that holds in any project goes into the skill for its task, in general words; `skills/working-practice/carried.md` keeps the story behind the older ones. After a change, send the owner the changed zips to upload.
