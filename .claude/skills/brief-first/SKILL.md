---
name: brief-first
description: How to take on anything the owner (Rahul) asks to build or change in this repo (a new tool, page, field, document, look, film or fix) so it matches what they pictured - their inputs and outputs in their own words, one recommendation in plain words, and the bold version built for real and shown early, done only when Rahul says it is better and feels simple. Use it at the start of every feature session, whenever the owner asks for something, and whenever they say a page asks too much, took a tangent, is over-engineered, is timid or iterative, looks like slides, or is not what they had in mind, even if no skill is named.
---

# Brief first

The owner is a lender who knows the maths and knows what a borrower or a DSA will put up with. Past work went wrong in one repeated way: each request grew into a bigger system (methods, modes, research, notes) while the page the owner could try got longer and arrived late. An outside review in September 2026 called the DSCR tool "haywire": the owner had pictured seven inputs and a table to print, and got ten fields, method choices and notes. The engine's maths was right; the product was not what was asked.

Then the opposite failure (03-11-2026): that lesson was read as "keep every change small". Asks to make a look, a page or a film better got small changes to what existed, chains of approval steps (VID3: a path, stills, frames and a kit, four sessions before anything moved) and lists of tradeoffs to sort. The owner saw "PowerPoint style" and "like what we have is so sacred". Small is for the questions a user answers; the ambition stays big. This skill keeps the questions few and the work bold, asked for and clickable.

## 1. Write the contract in the owner's words

Before designing, write down (and show the owner when it is new or unclear):

- **Inputs** the user will type, in the owner's words (income, EMI, ROI, term), and how many.
- **Outputs** they expect to see and to take away (a table, a schedule, a PDF, an Excel copy, a printout).
- **Who** types them: a borrower on a phone, a DSA, an accountant.
- **Size**, for a showcase (a trailer, a demo, a story on a home page): write it in lines and seconds before building, and show the owner something of that size first. A showcase gives a glimpse of the tool, never the tool's full working.

A list the owner gives is the default path, not a floor to build on. When the maths needs a fact the list lacks, prefer an assumption stated on the page over a new question.

What the owner attaches (an analysis, a design document, a catalogue) is read in full before any question or choice; where it already answers a question or names a method, follow it over the repo's older notes and ask only what it leaves open. A draft the owner will judge is made with the owner's own tool for the job and from their catalogue where one exists; a hand-made stand-in is called that before the owner judges it.

## 2. Recommend, then build

Say in a line or two, in plain words, what you will build and why, then build it. Name a tradeoff only when it could flip the owner's decision, at most two, each with your pick: what an assumption does to the answer, who is served and who is not, what it costs later (upkeep, payment, legal). On a page that serves both, the one that most often matters is a professional's completeness against a borrower's or DSA's speed to an answer. Never hand the owner a list to sort or a questionnaire on details: VID3c asked five questions on tick spacing and loudness about a film the owner then saw as slides. Ask only what is truly theirs: money, law, their customers, their name.

## 3. Build the bold version for real, and show it early

Make the real thing end to end in the same session: for a tool, form, engine, result and download, working at 390 px and on `main` (through a PR the owner merges); for a look, the thing itself, in its world; for a film, the stage it is at, made for real (its concepts, its animatic, the film). Rough is fine; a step toward it is not: no plan, stills, frames or kit for approval before something real exists. Depth in plumbing (more methods, modes, research, tooling) comes only when the next version needs it; ambition in what the user sees comes first. Work that sits on an unmerged branch looks, to anyone reading `main`, like work never done: the outside review judged an empty `main` while the engine waited on a PR.

- **Before and after first**: For a change to what the customer sees, publish a before and after the owner can open (today recorded beside the live proposal) before it goes into the docs; words alone drew "first show me" twice (HOME1).
- **Bold first**: For a look, a page, a flow or a film, start from the reference's world or a fresh idea, never today's version with effects added. What exists is a draft, not a rule: replace it when something serves the user better, and scale back only on the owner's word (HOME1c: "you just spruced up the Hollywood hacker"; 03-11-2026: "like what we have is so sacred").
- **A film is an idea before it is code**: three concepts from makers who never see each other; a reviewer who made none of them and may reject all three; then the story, the world and the sound plan, boards and an animatic, reviewed again; only then production (`creative-department`; `docs/video/CD1-diagnosis.md`). Technical correctness is not creative quality: a perfectly rendered mediocre idea is still a mediocre film (the owner, on a bold, correct film on a camera with depth: "It illustrates a calculation. It doesn't tell a story"). Silence beats a sound with no reason.
- **Say each thing once**: A page review asks what each section says that no other does, and a check counts each repeated block (HOME1).

## 4. Keep the default path to the contract

- Ask only the contract's inputs by default. Everything else is an assumption shown in one line with a way to change it, or sits under one closed "More options".
- Count the fields on the default path and assert the count in the site check, so any growth is seen.
- Keep "More options" one closed section, grouped inside (for the DSCR page: the loan, the business, the method), so it does not become a pile of twenty fields.
- Show the answer first: the results the owner named above the tables, visible on a phone without opening "More options".
- Use the owner's words on screen. Keep a CA's terms for the document, where lenders expect them.

## 5. When the owner says it asks too much

Remove questions. Do not answer with a note, a list of assumptions, another choice or an explanation: that made it worse before ("why is it asking for 10 years of financials?", then "assume the rest", then the review). After the change, recount the default fields against the contract.

## 6. Done is the owner's word

Done means the owner has tried it on a phone and on a desktop and says it is better and feels simple. Passing checks only make it ready to try: they guard money, law and the contract, never taste. Until they have, aim for a borrower finishing the default path on a phone in about a minute: few fields (about eight on the DSCR page), and the results without opening "More options".

## 7. Refuse these

- Another method preset or configuration surface on the default path.
- A field added to the default path "just in case".
- Explanatory paragraphs above the inputs.
- The professional surface (a CA's or DSA's year-by-year figures) as the main experience: it sits behind a visible link (D-UX-10).
- A silent default of a fact that changes the answer. An assumption from `engine/data/defaults.json`, listed on the page, is not silent.
- Any figure worked out by an AI instead of the engine.
