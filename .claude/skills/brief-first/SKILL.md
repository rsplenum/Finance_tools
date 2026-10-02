---
name: brief-first
description: How to take on anything the owner asks to build or change in this repo (a new tool, page, field, document or fix) so it matches what they pictured - their inputs and outputs in their own words, the tradeoffs they may not have considered, and a thin working version they can click on main in the same session, done only when the owner says it feels simple. Use it at the start of every feature session, whenever the owner asks for something, and whenever they say a page asks too much, took a tangent, is over-engineered or is not what they had in mind, even if no skill is named.
---

# Brief first

The owner is a lender who knows the maths and knows what a borrower or a DSA will put up with. Past work went wrong in one repeated way: each request grew into a bigger system (methods, modes, research, notes) while the page the owner could try got longer and arrived late. An outside review in September 2026 called the DSCR tool "haywire": the owner had pictured seven inputs and a table to print, and got ten fields, method choices and notes. The engine's maths was right; the product was not what was asked. This skill keeps the next thing small, asked for and clickable.

## 1. Write the contract in the owner's words

Before designing, write down (and show the owner when it is new or unclear):

- **Inputs** the user will type, in the owner's words (income, EMI, ROI, term), and how many.
- **Outputs** they expect to see and to take away (a table, a schedule, a PDF, an Excel copy, a printout).
- **Who** types them: a borrower on a phone, a DSA, an accountant.

A list the owner gives is the default path, not a floor to build on. When the maths needs a fact the list lacks, prefer an assumption stated on the page over a new question.

## 2. Give the tradeoffs before building

Whenever the owner asks for something, give the tradeoffs they may not have considered: what an assumption does to the answer and in which direction, who is served and who is not, accuracy against the number of fields, and what it costs later (upkeep, a second layout, payment, legal). Where it applies, always name one standing tradeoff: a professional's completeness against a borrower's or DSA's speed to an answer. Keep to the three to five that could change the decision, each with a recommendation; a survey of every option wastes the owner's tokens. Then build, unless the choice is genuinely theirs.

## 3. Ship the thinnest version that works end to end

Form, engine, result, download: working at 390 px and on `main` (through a small PR the owner merges) in the same session. Depth (more methods, modes, research, infrastructure) comes only when the next version needs it or the owner asks. Work that sits on an unmerged branch looks, to anyone reading `main`, like work never done: the outside review judged an empty `main` while the engine waited on a PR.

## 4. Keep the default path to the contract

- Ask only the contract's inputs by default. Everything else is an assumption shown in one line with a way to change it, or sits under one closed "More options".
- Count the fields on the default path and assert the count in the site check, so any growth is seen.
- Keep "More options" one closed section, grouped inside (for the DSCR page: the loan, the business, the method), so it does not become a pile of twenty fields.
- Show the answer first: the results the owner named above the tables, visible on a phone without opening "More options".
- Use the owner's words on screen. Keep a CA's terms for the document, where lenders expect them.

## 5. When the owner says it asks too much

Remove questions. Do not answer with a note, a list of assumptions, another choice or an explanation: that made it worse before ("why is it asking for 10 years of financials?", then "assume the rest", then the review). After the change, recount the default fields against the contract.

## 6. Done is the owner's word

Done means the owner has tried it on a phone and on a desktop and says it feels simple. Passing checks only make it ready to try. Until they have, aim for a borrower finishing the default path on a phone in about a minute: few fields (about eight on the DSCR page), and the results without opening "More options".

## 7. Refuse these

- Another method preset or configuration surface on the default path.
- A field added to the default path "just in case".
- Explanatory paragraphs above the inputs.
- The professional surface (a CA's or DSA's year-by-year figures) as the main experience: it sits behind a visible link (D-UX-10).
- A silent default of a fact that changes the answer. An assumption from `engine/data/defaults.json`, listed on the page, is not silent.
- Any figure worked out by an AI instead of the engine.
