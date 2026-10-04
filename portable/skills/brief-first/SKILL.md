---
name: brief-first
description: Take on anything the owner asks to build or change so it matches what they pictured - their words, the tradeoffs, a thin version they can click, done when they say it feels simple.
---

# Brief first

Past work went wrong in one repeated way: each request grew into a bigger system (methods, modes, research, notes) while the page the owner could try got longer and arrived late. An outside review called one tool "haywire": the owner had pictured seven inputs and a table to print, and got ten fields, method choices and notes. The maths was right; the product was not what was asked. This skill keeps the next thing small, asked for and clickable.

## 1. Write the contract in the owner's words

Before designing, write down (and show the owner when it is new or unclear):

- **Inputs** the user will type, in the owner's words, and how many.
- **Outputs** they expect to see and to take away (a table, a schedule, a PDF, a spreadsheet, a printout).
- **Who** types them: a customer on a phone, an agent, an accountant.

The inputs the owner lists for a page are its default path: a ceiling, not a floor to build on. When the maths needs a fact the list lacks, prefer an assumption stated on the page over a new question. Ask first what narrows later questions (purpose, product, type), and take each fact once, shown elsewhere read-only.

## 2. Give the tradeoffs before building

Give the tradeoffs the owner may not have considered: what an assumption does to the answer and in which direction, who is served and who is not, accuracy against the number of fields, and what it costs later (upkeep, a second layout, payment, legal). Where it applies, name the standing one: a professional's completeness against a customer's speed to an answer. Keep to the three to five that could change the decision, each with a recommendation; a survey of every option wastes the owner's tokens. Then build, unless the choice is genuinely theirs.

## 3. Ship the thinnest version that works end to end

Form, calculation, result, download: working at 390 px and on `main` (through a small PR the owner merges) in the same session. Depth (more methods, modes, research, infrastructure) comes only when the next version needs it or the owner asks. Work that sits on an unmerged branch looks, to anyone reading `main`, like work never done.

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
