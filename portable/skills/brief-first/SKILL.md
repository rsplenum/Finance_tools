---
name: brief-first
description: Take on anything the owner asks to build or change - their words, one recommendation in plain words, the bold version built for real and shown early, done when they say it is better and feels simple.
---

# Brief first

Past work went wrong in one repeated way: each request grew into a bigger system (methods, modes, research, notes) while the page the owner could try got longer and arrived late. An outside review called one tool "haywire": the owner had pictured seven inputs and a table to print, and got ten fields, method choices and notes. The maths was right; the product was not what was asked.

Then the opposite failure: that lesson was read as "keep every change small". Asks to make a look, a page or a film better got small changes to what existed, chains of approval steps (a path, stills, frames and a kit, four sessions before anything moved) and lists of tradeoffs to sort; the owner saw "PowerPoint style" and "like what we have is so sacred". Small is for the questions a user answers; the ambition stays big. This skill keeps the questions few and the work bold, asked for and clickable.

## 1. Write the contract in the owner's words

Before designing, write down (and show the owner when it is new or unclear):

- **Inputs** the user will type, in the owner's words, and how many.
- **Outputs** they expect to see and to take away (a table, a schedule, a PDF, a spreadsheet, a printout).
- **Who** types them: a customer on a phone, an agent, an accountant.
- **Size**, for a showcase (a trailer, a demo, a story on a home page): write it in lines and seconds before building, and show the owner something of that size first. A showcase gives a glimpse of the tool, never the tool's full working.

The inputs the owner lists for a page are its default path: a ceiling, not a floor to build on. When the maths needs a fact the list lacks, prefer an assumption stated on the page over a new question. Ask first what narrows later questions (purpose, product, type), and take each fact once, shown elsewhere read-only.

What the owner attaches (an analysis, a design document, a catalogue) is read in full before any question or choice; where it already answers a question or names a method, follow it over the repo's older notes and ask only what it leaves open. A draft the owner will judge is made with the owner's own tool for the job and from their catalogue where one exists; a hand-made stand-in is called that before the owner judges it.

## 2. Recommend, then build

Say in a line or two, in plain words, what you will build and why, then build it. Name a tradeoff only when it could flip the owner's decision, at most two, each with your pick: what an assumption does to the answer, who is served and who is not, what it costs later (upkeep, payment, legal). Where it applies, the one that most often matters is a professional's completeness against a customer's speed to an answer. Never hand the owner a list to sort or a questionnaire on details. Ask only what is truly theirs: money, law, their customers, their name.

## 3. Build the bold version for real, and show it early

Make the real thing end to end in the same session: for a tool, form, calculation, result and download, working at 390 px and on `main` (through a PR the owner merges); for a look or a film, the thing itself, moving, in its world, with its sound. Rough is fine; a step toward it is not: no plan, stills, frames or kit for approval before something real exists. Depth in plumbing (more methods, modes, research, tooling) comes only when the next version needs it; ambition in what the user sees comes first. Work that sits on an unmerged branch looks, to anyone reading `main`, like work never done.

- **Before and after first**: For a change to what the customer sees, publish a before and after the owner can open (today recorded beside the live proposal) before it goes into the docs; words alone drew "first show me" twice (HOME1).
- **Bold first**: For a look, a page, a flow or a film, start from the reference's world or a fresh idea, never today's version with effects added. What exists is a draft, not a rule: replace it when something serves the user better, and scale back only on the owner's word ("you just spruced up the Hollywood hacker"; "like what we have is so sacred").
- **Motion is new too**: before any tooling for a film, show a few seconds of its hardest move as it will move, in its world and with its sound ("still look like powerpoint presentation slides with sound effects").
- **Say each thing once**: A page review asks what each section says that no other does, and a check counts each repeated block (HOME1).

## 4. Keep the default path to the contract

- Ask only the contract's inputs by default. Everything else is an assumption shown in one line with a way to change it, or sits under one closed "More options", grouped inside.
- Count the fields on the default path and assert the count in the site check, so any growth is seen.
- Show the answer first, visible on a phone without opening "More options". Give a page's answer a word budget that the site check fails on; new detail goes behind a tap.
- Say what limits the answer ("limited by X in month N; Y has Rs. Z of room"), and offer the better option when the default falls short.
- Never default a missing fact silently: show "needed: X" and keep the answer provisional. An assumption listed on the page with its reason is not silent. Stress tests and prudence flags are shown, never applied silently.
- Use the owner's words on screen; a professional's terms go in the document, where they are expected.

## 5. When the owner says it asks too much

Remove questions. Do not answer with a note, a list of assumptions, another choice or an explanation: that made it worse before ("why is it asking for 10 years of financials?", then "assume the rest", then the review). After the change, recount the default fields against the contract.

## 6. Pages

- Decisive facts first: a short set of screens gives the answer early, provisional until complete.
- A "No" hides its follow-up questions; every choice that changes the answer has its follow-ups ("record found" asks what was found).
- Keep what is typed in a local draft until the field is left, so a re-render from another field cannot wipe it; a half-typed value never makes the whole state invalid.
- Mobile from the start: no sideways scroll at 390 px, 16 px inputs, tables become cards on phones. Dark mode on every element; the toggle cycles Auto, Light, Dark without a flash on load.
- State a thing once; list only what changes the answer. "Intuitive" means short and clear, never diluted: what does not change the answer is counted in one line, not listed.
- Plain words on screen; sources and clause codes sit behind an icon, and formal documents keep the citations.
- Stable ids for checks: `fld-<path>` on inputs, `data-testid` on results; check pages with text assertions.

## 7. Done is the owner's word

Done means the owner has tried it on a phone and on a desktop and says it feels simple. Passing checks only make it ready to try. Until then, aim for a customer finishing the default path on a phone in about a minute.

## 8. Refuse these

- Another method preset or configuration surface on the default path.
- A field added to the default path "just in case".
- Explanatory paragraphs above the inputs.
- The professional surface (a CA's year-by-year figures) as the main experience: it sits behind a visible link.
- A silent default of a fact that changes the answer.
- Any figure worked out by an AI instead of deterministic code.
