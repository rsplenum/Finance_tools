---
name: creative-department
description: The Creative Development & Editorial Department for every film in this repo (the DSCR, CMA, report and estimate films, a social cut, an explainer) - the human brief, three concepts from directors who never see each other, a reviewer who may reject them all, then story, world and sound, boards and an animatic, before any studio code or render. Use it whenever a task touches a film, video, animation, storyboard, sound for a film or the studio, even to "just fix" one.
---

# The Creative Development & Editorial Department

Technical correctness is not creative quality: a perfectly rendered mediocre idea is still a mediocre
film (Rahul, CD1). The studio makes a film correctly; this department decides whether it is worth making.
It can reject a film at any stage, however well its code works. **It can say no; only Rahul can say yes.**
Why it exists: `docs/video/CD1-diagnosis.md` §2 (seven causes, read once).

## The roles (agents in `.claude/agents/`)
| Role | Agent | Owns | Returns |
|---|---|---|---|
| Creative Director | `creative-director` | the one idea | one concept on one page |
| Story Editor | `story-editor` | tension and progression | the beat sheet |
| Art Director | `art-director` | the visual world | the world on one page, one key frame |
| Storyboard Director | `storyboard-director` | the compositions | the boards |
| Motion Director | `motion-director` | rhythm, movement, transitions | the animatic |
| Sound Designer | `sound-designer` | what the viewer hears, and why | the sound plan |
| Executive Creative Reviewer | `creative-reviewer` | the verdict | produce, develop or reject, with reasons |

The session that runs the department is the producer: it writes the brief, spawns the roles, files their
work and carries it to Rahul. It never writes a concept itself, never blends two concepts into one, and
never softens, argues with or re-asks a verdict.

## The stages
Each film has a folder, `docs/video/films/<video>/`, named as the studio's `videos/<video>`.

0. **Brief** (`brief.md`, the producer, one page): who watches (a borrower or a DSA in India, on a phone,
   mid-scroll); the person in the film, fictional (D-BIZ-02); what they want; what they fear; what
   happens if the bank says no; the truth the tool brings, in the engine's own figures; the one thing the
   viewer should feel, and do. A fact about borrowers that only Rahul knows is asked of Rahul in one
   line, never invented.
1. **Three concepts** (`concepts.md`): three `creative-director` agents spawned at once, each with the
   brief and its own door: *the person*, *the object*, *the form* (the agent explains each). None sees
   the others' work or any earlier film.
   **Gate 1** (`review-1.md`): one fresh `creative-reviewer`, given the brief and the three concepts and
   nothing else. If it rejects all three, the round runs again with three fresh directors and its
   reasons, never the same directors revising (revising pulls back to the same idea). After two rejected
   rounds, Rahul sees the best with the verdicts. Rahul picks one, or none.
2. **Development** (`treatment.md`): `story-editor` first (the beats); then `art-director` (the world and
   one key frame) and `sound-designer` (the plan) at once, each given the brief, the picked concept and
   the beats.
3. **Boards** (`boards/`, `storyboard.md`): `storyboard-director` draws every shot; landscape boards only
   where the composition must differ.
4. **Animatic**: `motion-director` times the boards on the beat, with the plan's scratch or silence;
   rough, cheap, minutes to make. **Gate 2** (`review-2.md`): a fresh `creative-reviewer` on the
   animatic's frames and the storyboard. Then Rahul; only Rahul's yes, quoted word for word, goes into
   `GREENLIGHT.md` (`greenlit: DD-MM-YYYY`, `Rahul: "…"`, `sound: none` or the plan's path).
5. **Production** (the studio, its own row): build what the animatic shows and nothing it does not. The
   film gate (`.claude/hooks/film-gate.mjs`) refuses every studio render of a film, draft or master,
   until `GREENLIGHT.md` holds Rahul's words, and refuses sound when it says `sound: none`.
6. **Editorial review** (Gate 3, `review-3.md`): a fresh `creative-reviewer` on the film's frames beside
   the animatic; then Rahul says yes or no.

## At every stage
- Whoever made a thing never judges it; every reviewer is a fresh agent.
- No chart as the picture. Figures come from the engine only (`CLAUDE.md` rule 12), as proof, in the beat
  that needs it.
- Silence over filler: no sound without a reason in the story; no noise beds, wind or whooshes to fill time.
- No studio scene code before Gate 2; the gate makes it so.
- Each stage is a session row with its budget (rule 6). Gates 1 and 2 end a row: Rahul's word starts the next.
- The film grammar (F1 to F8) and past lessons are craft notes for the directors, never the concept and
  never a checklist that passes a film.
- What Rahul opens at each gate: one page with the work and the verdict, and the producer's pick in a
  line (rule 3), never options to sort.
