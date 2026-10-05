# Rooms by buttons: a plan

Written 03-10-2026 at the owner's request: "make provision such that the user knows the area of the floor and asks for one living room, one master bedroom with attached bathroom, one kitchen and make the living room spacious and the bedroom medium sized or slightly above medium etc. give buttons for such options. Or maybe they can adjust the rooms in sized in 3d lateron. Think about this and make plans to implement this in an intuitive interface." This is a plan. R1 was built on 03-10-2026 (D-UX-28, D-TECH-20, D-DATA-07) on the recommendations below, and R2a, the rooms by buttons of the kinds the library already has (D-UX-29, D-TECH-21). R2b, the new kinds of room, and R3 are not built.

## The short answer

- **Yes, and most of it builds on E3.** The engine already plans each room from the area and the bedrooms, and the Rooms list already shows each room's size, with a size or a level of its own.
- **Two kinds of buttons:**
  1. **Which rooms:** + Bedroom, + Bathroom, "Attached bathroom" on a bedroom, + Study, + Pooja room, + Utility, + Store, and a × on a room to take it out.
  2. **How big:** four buttons on each room: Compact, Medium, Above medium, Spacious.
- **The area stays what the user said.** A room made Spacious takes its extra from the other rooms, in proportion. The page says so straight away ("the other rooms 7% smaller") and shows a bar of how the area is shared.
- **Sizing rooms in 3D comes later, and 3D is not the way to size them.** Dragging the wall between two rooms on a 2D plan sizes them better on a phone; 3D is for seeing (design mode phases 3 and 4). The buttons, the plan and the 3D view all read the same rooms, so nothing built now is thrown away.
- **Recommended order:**
  1. R1, the size buttons (one session);
  2. R2, rooms by buttons (one or two sessions, mostly the new rooms' items);
  3. R3, for a new house only and optional, the area worked out from the rooms;
  4. then the design mode's 2D plan and 3D view.

## 1. The contract, in the owner's words

- **Who:** a borrower on a phone, after the six questions.
- **Inputs:**
  - the area of the floor (already one of the six questions);
  - the rooms ("one living room, one master bedroom with attached bathroom, one kitchen");
  - a size for each ("spacious", "medium", "slightly above medium").

  All by buttons, nothing typed.
- **Outputs:** each room's size in ft and sq ft, the estimate for those rooms, and what the change did (the What changed bar).
- **The default path does not grow.** The six questions stay the only fields on it. The buttons sit in Rooms, under the answer, closed until opened, as now.

## 2. What the user sees (a phone, 390 px)

A 1BHK of 600 sq ft carpet area, with the living room made Spacious and the bedroom Above medium. The figures are only an illustration: the engine works them out.

```
Your rooms                                       1BHK · 600 sq ft
[ Living 37% | Bedroom 27% | Kitchen 13% | Bath 8% | Passage 10% | Walls 5% ]

Living and dining                            17.0 × 13.0 ft · 221 sq ft
( Compact )( Medium )( Above medium )( ● Spacious )
Level: As the sections ▾                          Type your own size ›

Bedroom (main)                               13.9 × 11.5 ft · 160 sq ft
( Compact )( Medium )( ● Above medium )( Spacious )
[✓] Attached bathroom

Kitchen                                      10.0 × 8.0 ft · 80 sq ft
( Compact )( ● Medium )( Above medium )( Spacious )

Bathroom (attached)                            8.9 × 5.5 ft · 49 sq ft
( Compact )( ● Medium )( Above medium )( Spacious )

[+ Bedroom] [+ Bathroom] [+ Pooja room] [+ Study] [+ Utility] [+ Store]
```

The bar at the bottom of the screen then reads: "Living and dining to Spacious: the other rooms 7% smaller · Rs. … more".

**How it behaves:**
- **A tap moves the room's share.** Its size and the bar change at once, and the other rooms shrink or grow in proportion.
- **Making every room Spacious changes little,** because the rooms share the area. The page says: "The rooms share your 600 sq ft. To make them all bigger, change the area."
- **A room squeezed below its Code minimum is flagged, never refused or changed.** The minimums are already in the rules: a bedroom 9.5 sq m, a kitchen 5.0 sq m, a bathroom 2.8 sq m (NBC 2016 Part 3, as reported).
- **A typed size still wins (E3).** That room keeps its size and its buttons read "Your size". The other rooms share what is left by their words.
- **The passage, the walls and the balcony stay as the rules set them.** Each can still be given a typed size.
- **One place for the count of bedrooms.**
  - + Bedroom changes the bedrooms answer.
  - The bathrooms follow the rule (one for each bedroom from a 2BHK); + Bathroom and "Attached bathroom" change it.
- **Keyboard and screen readers:**
  - each group of buttons is a radio group, moved with the arrow keys;
  - the room's name is in its label;
  - the change is read aloud.

## 3. How the engine works it out

**Today:**
- The area left after the passage (a tenth) and the walls (a twentieth) is shared among the rooms in proportion to each room's reference size.
- The reference size is the middle of the room's reported range. For a 1BHK: a bedroom 100–140 sq ft, a living room 120–180, a kitchen 50–80, a toilet 30–50.
- The 2BHK and 3BHK have their own ranges in the rules.

**With the buttons, the words move each room's weight along its reported range:**
- Compact: the bottom of the range;
- Medium: the middle (today's);
- Above medium: three quarters of the way up;
- Spacious: the top.

So the words rest on sourced sizes, not on multipliers of our own. The weights still share the user's area, so a word sets a room's share of it, not its size in feet. The size in feet shows beside the buttons.

**The rules are data.** They go in `engine/data/architect.json`: each kind of room's range, with its source. They are listed on the page, for example "Compact: the bottom of a bedroom's reported range, 100 sq ft in a 1BHK".

**Worked out twice.**
- The second computation shares the area room by room in closed form; the first works from the totals. Nothing shows unless they agree.
- A hand-worked test: a 1BHK of 600 sq ft, the living room Spacious, the bedroom Above medium.

**New kinds of rooms (R2) each need their items at the five levels**, as the other rooms have:
- a study: floor, paint, points, and a desk unit in Wardrobes' board and finish;
- a pooja room: a stone floor and cladding, a door, a light;
- a utility: a wet area like the balcony, with a tap, a drain and a washing machine point;
- a store: floor, paint, a light, shelves.

Each item needs its sources, so R2 is mostly research and data.

## 4. Tradeoffs, each with a recommendation

1. **The area stays yours, or the area follows the rooms.**
   - In a flat the area is what was bought, so a spacious living room must take space from the other rooms.
   - A new house could grow instead, but that changes the structure and the cost a lot, and the area is one of the six answers.

   *Recommended:* the area stays. "Let the area follow the rooms" comes later and for a new house only (R3). There the words become sizes (Spacious is the top of the range), and the area is worked out from them.
2. **A word moves the other rooms.**
   - E3 keeps the other rooms as they are when a size is typed, so a change shows only its own effect (D-UX-25).
   - With the words, the others must shrink, which moves lines the user did not touch.

   *Recommended:*
   - typed sizes keep E3's rule, since a measured room tells us nothing about the others;
   - the words share what is left;
   - the bar at the bottom names the knock-on ("the other rooms 7% smaller"), so nothing moves silently.
3. **Four words, or five.** Five stops would match the five levels, but they crowd a phone: each button would be under 70 px wide after the margins. "Medium or slightly above medium" is the owner's own distinction. *Recommended:* four words (Compact, Medium, Above medium, Spacious), with the size in feet beside them, so each word becomes a figure.
4. **A picture of the shares, or a drawing that looks like a plan.**
   - Rooms packed as rectangles into the outline look appealing.
   - But such a drawing places a bathroom where no plan would, and users may take it for their layout.

   *Recommended:* the bar of shares now: one line, cheap, honest and read aloud. A real plan comes only with the design mode's templates, checked by a professional.
5. **Sizing rooms in 3D.** Dragging walls in 3D on a phone is fiddly, makes some people motion-sick, and cannot be used with a screen reader. *Recommended:*
   - size rooms with the buttons now;
   - later, size them on a 2D plan: drag the wall between two rooms and one grows while the other shrinks, the same rule as the buttons;
   - look at them in 3D (design mode §7 and §8).

## 5. Phases

| # | What | Sessions | Done when |
|---|---|---|---|
| R1 | Size buttons on each room; the bar of shares; the knock-on in What changed; flags below the Code's minimums. Worked out twice. **Built 03-10-2026** | 1 | You make the living room Spacious on a phone and the sizes make sense |
| R2a | Rooms by buttons of the kinds the library has: + Bedroom (the bedrooms answer), + Bathroom, attached or common, a room's ×, the balcony out. **Built 03-10-2026** | 1 | You build "one living room, one main bedroom with attached bathroom, one kitchen" in a few taps |
| R2b | The new kinds: + Pooja room, + Study, + Utility, + Store (D-UX-39). Each new room's range and its items at five levels, with sources | 1–2 | You add a study or a pooja room and its items make sense |
| R3 | For a new house only, and optional: the area follows the rooms, and the structure follows the area | 1 | You decide it is wanted |
| Design mode, phases 3 and 4 | The 2D plan from checked templates (drag a wall), then the 3D view of the same rooms | See `docs/DESIGN-MODE-FEASIBILITY.md` §10 | As there |

## 6. Decisions for you

1. **The four words:** Compact, Medium, Above medium, Spacious, or your own?
2. **The area:** keep it fixed (recommended), or let it follow the rooms for a new house?
3. **The extra rooms first:** Study, Pooja room, Utility, Store, a separate dining room, a servant's room?
4. **Typed sizes and words:** typed sizes keep the other rooms as they are (E3), and the words share what is left. Agreed?

Answered on 05-10-2026, on the recommendations (D-UX-39): the four words and typed sizes as R1 built them; the area fixed, R3 later; R2b in the order + Pooja room, + Study, + Utility, + Store.

## 7. Starter prompt for R1

"Work from `main`. Read CLAUDE.md, docs/HANDOFF.md, docs/ROOM-PICKER-PLAN.md and the brief-first skill. R1 on the planning estimate's Rooms: four buttons on each room (Compact, Medium, Above medium, Spacious) that move its share of the area along its reported range, the other rooms sharing what is left; typed sizes keep E3's rule; the bar of shares; What changed names the knock-on; rooms below the Code's minimums flagged, never changed. Each kind of room's range goes in architect.json with its source. Every figure worked out twice. The six questions stay the only fields on the default path. Finish per HANDOFF."
