# The load measure: a paper for the owner's go (UX2, D-UX-61)

Proposed 13-10-2026; the owner said go the same day, with §7's five recommendations. Since UX2b it is a check in the site check (§5; `npm run load`, `scripts/load-measure.mjs`, D-UX-63). Sources marked [S] were read only through search results, because their hosts are blocked in this environment (`docs/OWNER.md`); UX2b reads them in the original once they are allowed.

## 1. What it is for
Design here is cutting the reader's effort: every screen spends attention and working memory (D-UX-61). Cognitive load theory splits that effort in two. One part is the task itself: a DSCR is what it is. The other comes from how the task is shown (Sweller, 1988; the term "extraneous load" [S]). Design can cut only the second part, and this measure counts it. Working memory holds about four chunks at once (Cowan, 2001 [S]), so every figure, word or colour a reader must carry from one place to another costs them.

The team is language models. They read code, not the screen, and they tend to add rather than cut. So a script counts the load from the built page, the way the engine counts money. Each count may only shrink, as the default fields may only shrink (D-UX-12). The counts are proxies: they cannot say whether a page is clear. People decide that (§6).

## 2. The reader's path
A reader on a tool page does five things in turn, and each count sits at one of them:

| The reader | What costs them | Counts |
|---|---|---|
| Orients: is this for me, where do I start? | reading before they can act | 1 |
| Reads | words, long sentences, unknown terms | 2, 3, 4, 5 |
| Decides | questions to answer, things to choose between | 6, 7 |
| Finds the answer | scrolling while holding what they typed | 8, 9 |
| Decodes and holds | styles and colours to learn; a figure that changes out of sight | 10, 11, 12 |

## 3. The counts
Each count is taken at 360 by 780 px in light mode, on the page as it loads (counts 1 and 6) and in its answer state with the default path filled (the rest). The answer states are the `result` states in `scripts/design-checks.mjs`. Home and the 404 page have no questions, so they are measured as they load. Text inside `main` is counted; text a screen reader alone hears (`sr-only`) is not.

**1. Words before the first question.** *In the head:* what a reader must read or skip before starting, and whether the page says quickly what it gives. *Source:* a page has about 10 seconds to show its worth (Nielsen, "How long do users stay on web pages?", NN/g [S]); adults read about 238 words a minute (Brysbaert, 2019 [S]), so 10 seconds is about 40 words. Also brief-first: no explanatory paragraphs above the inputs. *Read:* the words of visible text above the first field, or above the first control on a page without fields; the first field's place in screens is printed too. *Misses:* whether those words help; a heading weighs the same as a disclaimer. *Gamed by:* moving the opening text below the first field or into a closed part. *Guard:* count 3, and the critic reads the first screen.

**2. Words shown.** *In the head:* the reading the default path asks for. *Source:* on an average page people read about 20% of the words, and at most 28% (Nielsen, "How little do users read?", NN/g, 2008 [S]). Each extra word lowers the chance that the needed one is read. *Read:* the visible words in the answer state, outside closed parts. *Misses:* hard words against easy ones; a figure counts as a word; tables are scanned, not read. *Gamed by:* hiding text behind a tap (guard: count 3); turning words into icons (guard: principle 10 and the critic); dropping a fact that is needed (guard: CLAUDE.md's "never default a missing fact", and the critic).

**3. Words in all.** *In the head:* everything a reader who opens every part would face. Progressive disclosure moves words here from count 2; it does not delete them. *Source:* DESIGN principle 2 (NN/g, "Progressive disclosure", not re-read here). *Read:* every closed `<details>` opened, counted, then closed again; and again in the plan state (the `plan` state of `scripts/design-checks.mjs`), for the text that shows only after a button ("with the plan", its own figure). *Misses:* tooltips; text behind any other button. *Gamed by:* putting text behind a button that is not a closed part or the plan. *Guard:* the critic.

**4. Long sentences.** Sentences over 25 words. *In the head:* a long sentence must be held whole before it makes sense. *Source:* GOV.UK: "Try to split up sentences that are over 25 words long" ("Use clear language" [S]); W3C's cognitive accessibility guidance: "Use short sentences. Have only one point per sentence." (COGA design guide [S]). *Read:* the text of each block, split where a sentence ends. *Misses:* a short sentence can still be unclear; a list joined by a colon reads as one sentence. *Gamed by:* chopping a sentence into fragments with full stops. *Guard:* the writer and the critic read them, and on a screen a fragment is often right.

**5. Abbreviations.** Distinct words in capitals: DSCR, EMI, GSTIN. *In the head:* each one is a term to recall from memory, or a place to stop. *Source:* WCAG 3.1.4 Abbreviations and 3.1.3 Unusual words, both AAA [S]; Nielsen's heuristic 6, "Recognition rather than recall" [S]. *Read:* words with two or more capitals, a plural merged with its singular, roman numerals left out. *Misses:* jargon in small letters ("drawing power", "margin"). Also, the owner's readers know EMI and DSCR, which are the owner's own words: this count is a ratchet, not a ban. *Gamed by:* spelling a term out without making it plainer. *Guard:* the writer.

**6. Questions.** Fields on the default path; a set of radio buttons counts once. *In the head:* each is something to look up or recall, then a decision. *Source:* GOV.UK Service Manual, "Structuring forms" (cited in principle 2); the owner's ceiling (D-UX-12), which the site check already counts for the DSCR. *Read:* the visible fields as the page loads, outside closed parts. *Misses:* a hard question against an easy one (a name against last year's depreciation). *Gamed by:* moving a needed question under More options and defaulting its fact. *Guard:* forbidden by CLAUDE.md, so the result turns provisional; the critic.

**7. Controls.** Visible links, buttons, fields and summaries in the answer state; a set of radio buttons counts once. *In the head:* everything the eye scans and sets aside to find what to do next. *Source:* the time to choose rises with the logarithm of the options (Hick, 1952; Hyman, 1953 [S, an encyclopedia]); COGA, "Avoid too much content": five or fewer main choices on a screen [S]. *Read:* counted. *Misses:* grouping, since twenty controls in three labelled groups beat ten scattered ones. Hick's law is about known options, not searching a screen, so this count is a rough proxy. *Gamed by:* a click on something that is not a control. *Guard:* axe and the Tab walk.

**8. Answer at (screens).** *In the head:* how far a reader scrolls before the point, holding what they typed. *Source:* 57% of viewing time is above the fold and 74% in the first two screens (NN/g, "Scrolling and attention", 2018 [S]); principle 1. *Read:* the top of the answer, in screens of 780 px. Each page marks its answer `data-answer` (the verdict in words on a tool page, the list of tools on home) and a sticky echo of it `data-answer-echo`. *Misses:* whether the answer is understood. *Gamed by:* putting the mark on something small near the top. *Guard:* the check fails a page without exactly one mark in its answer state, or whose mark holds no words, only a figure; the critic confirms where it sits.

**9. From the last step to the answer (px).** *In the head:* the reader has just typed the last answer; is the result in front of them, or must they hunt? *Source:* principle 1; the report's finding 8 and the CMA's finding 4 (`docs/design-reviews/`). *Read:* the answer state ends on the last default question: the last question shown above the answer is brought into view as typing it would (the nearest edge); where none shows (the estimate folds its questions once answered), the screen stays where the state's last step left it. Then 0 if the answer, or its echo, is in view; otherwise the distance from the screen's edge. *Misses:* an echo may show a figure without its verdict. *Gamed by:* ending a state on the answer, or folding the questions away. *Guard:* the rule above for the first; the critic for the second; a changed state shows in the diff.

**10. Text styles.** Distinct pairs of size and weight in visible text. *In the head:* each style is a level to decode (a heading, a label, a note?); more styles than meanings is noise. *Source:* Nielsen's heuristic 4, "Consistency and standards" [S]; the six-style scale in DESIGN.md. *Read:* the computed style of each visible text. *Misses:* colour and capitals as styles; whether a style means the same thing on every page. *Gamed by:* flattening all text to one style, which loses the hierarchy. *Guard:* a floor, the scale's own styles, and the headings check.

**11. Colours.** Distinct strong hues in text, grounds, edges and chart marks. Greys, slates and pale tints (OKLCH chroma under 0.07) do not count, and hues within 15 degrees of each other count as one. *In the head:* each colour is a code to learn and keep (what does amber mean here?). *Source:* principles 5 and 6; colour codes run out at about 8 to 14 colours (a lecture citing Ware, *Information Visualization* [S]). *Read:* computed colours turned into OKLCH. *Misses:* whether one colour means one thing: teal for both "Complete" and "meets" (the DSCR's finding 6) counts as one colour. *Gamed by:* using one colour for two meanings, so the count falls while the load rises. *Guard:* the critic's "one colour per thing".

**11a. Extra codes** (UX5c, D-UX-95). Per meaning (a token group: act, good, warn, bad, marigold, margin, the sparks, the room shares), the channels it is drawn on (text, ground, rule, mark) less one, plus the pairs of meanings in use whose hues lie within 15 degrees. *In the head:* each extra way of saying one thing is one more code to learn; near hues must be told apart. *Source:* `docs/DESIGN-MATHS.md` §2. *Read:* computed colours matched to the tokens, each RGB channel within 2. *Misses:* a raw colour that matches no token (the design ratchet's job). *Gamed by:* one token for two meanings. *Guard:* the critic's "one colour per thing". Aim 0.

**12. Out of sight.** Of the controls in the answer state that move a figure, those that move none in view. *In the head:* split attention. A reader who changes a figure and must scroll to see what it did holds the change in mind while looking. *Source:* separated sources that must be joined in the head "impose a heavy extraneous cognitive load" (Chandler and Sweller, 1992 [S]); "place matching text and graphics close together", upheld in 22 tests of 22 (Mayer's spatial contiguity principle [S]); principle 4. *Read:* each control is put in the middle of the screen, moved once (a figure doubled, the next option, a slider by a fifth) and moved back. A watcher notes the figures that changed outside the control, its label and its read-back. The control counts if none of them is on screen; a sticky band counts as on screen. *Misses:* whether the figure that moved is the one that matters (a total or a footnote); controls in closed parts and in the plan. *Gamed by:* a sticky band showing any figure that moves with everything. *Guard:* the critic confirms the band shows the answer.

## 4. Baseline, 13-10-2026 (`main` at c2e47b7)
| Page | 1 Words before Q1 (Q1 at, screens) | 2 Words shown | 3 Words in all | 4 Long sentences | 5 Abbreviations | 6 Questions | 7 Controls | 8 Answer at (screens) | 9 Last step to answer (px) | 10 Text styles | 11 Colours | 12 Out of sight |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Home | 22 (0.4) | 149 | 149 | 1 | 3 | 0 | 4 | 0.4 | - | 5 | 1 | - |
| DSCR | 38 (0.4) | 1,203 | 3,557 | 0 | 5 | 11 | 39 | 2.0 | 0 | 8 | 3 | 0 of 6 |
| CMA | 99 (0.7) | 912 | 1,669 | 6 | 5 | 130 | 142 | 3.7 | 2,133 | 7 | 2 | 73 of 88 |
| Estimate | 29 (0.4) | 351 | 1,597 | 2 | 2 | 7 | 36 | 0.5 | 0 | 8 | 3 | 0 of 1 |
| Project report | 43 (0.4) | 738 | 1,398 | 1 | 5 | 33 | 46 | 4.8 | 253 | 8 | 2 | 15 of 18 |
| 404 | 3 (0.2) | 8 | 8 | 0 | 0 | 0 | 1 | 0.2 | - | 2 | 1 | - |

A second count, taken from the built HTML by a separate script, gives the same words for home (149) and the 404 page (8).

**What the baseline says**
- The counts agree with the critic where the critic had evidence. The CMA and the report send the answer 3.7 and 4.8 screens down (CMA finding 4, report findings 3 and 8). Most of their controls move figures out of sight (73 of 88, and 15 of 18; CMA finding 8, report finding 4). The home page's one long sentence is the estimate's entry, its finding 4.
- The DSCR shows what works. Its answer sits 2 screens down, but the sticky answer bar keeps it in view of every control, so 0 of 6 controls are out of sight. That is the pattern for UX3 and UX4.
- The estimate keeps 1,597 words but shows 351: its drawers do the work of progressive disclosure.
- Text styles run at 7 or 8 on the tool pages, against the six in the scale: the first place the ratchet can cut.

## 5. The check (UX2b, D-UX-63)
- `scripts/load-baseline.json` holds every built page's counts, and the site check measures every built page against it (`scripts/load-measure.mjs`, `loadCheck`). A count that rose fails; so does a count that fell, until the baseline is lowered in the same commit (`npm run load -- --lower <page>`, which also adds a new page), so the baseline is always today's page and no slack builds up for a later rise.
- A count rises only with a line in `docs/DECISIONS.md` naming why (the owner's ask, or a principle such as a reset in reach): `npm run load -- --raise <page> <count> <D-id>` checks the line exists, writes the new count and keeps the rise in the baseline's `raised` list.
- `npm run load` prints the table with an aim row from the sources (40 words before the first question, no long sentences, the answer within 1 screen, nothing out of sight). The aims fail nothing until the tests back them.
- No total score: a total lets one load be traded for another and hides which one grew.
- Every page's answer state must hold one `data-answer` mark with words in it; a page without one fails.

## 6. How people calibrate it
- The five tests (`docs/design-reviews/2026-10-13-test-script.md`). The researcher turns the owner's notes into ranked findings and tags each one with the count that saw it, or with none.
- After the tests and one release, a count that matched nothing people met is printed but no longer fails. A struggle that no count saw goes to the critic's checklist, or becomes a proposed count in `docs/DESIGN-LESSONS.md` with its evidence.
- The tests rank the pages by how hard people found them. If the counts rank them differently, the counts are wrong, not the people.
- Once the Worker is live, the usage numbers (UD1) add the time to a result and the share of people who open More options.

## 7. Tradeoffs for the owner
1. **Ratchet all twelve, or only a core?** A ratchet also blocks good additions: a Clear all button adds a control. *Recommend:* all twelve, with the cheap raise path in §5, so every rise is a decision someone wrote down.
2. **One baseline per page, or one ceiling per template?** A ceiling taken from the best page would make a new page start at the best, but today's pages differ too much for one ceiling. *Recommend:* per page now, and template ceilings once UX4 has redesigned three tool pages.
3. **Aims as hard limits?** The research is about other readers, mostly English-speaking, often on a desktop, and it is secondary here. *Recommend:* print the aims, and let only growth fail until the five tests back an aim.
4. **One width, or every width and scheme?** *Recommend:* 360 px in light mode only. The words do not change with the scheme, and the phone is where the load bites. Colours in dark mode stay with the critic.
5. **Twelve counts, or fewer?** More counts are more to keep up and more ways to game. *Recommend:* keep twelve until the tests, then drop any that predicted nothing (§6).

## 8. Left to people
Grouping and alignment (the critic's screenshot pass), the meaning and tone of words (the writer and the tests), trust, whether the figures are right (the engine), and the header and footer, which are the same on every page.

## 9. Sources
Read through search results this session [S], because the hosts were blocked: Brysbaert (2019), *Journal of Memory and Language*, "How many words do we read per minute?"; Chandler and Sweller (1992), *British Journal of Educational Psychology* 62, 233-246; Cowan (2001), *Behavioral and Brain Sciences* 24, 87-114; GOV.UK, "Use clear language" (guidance.publishing.service.gov.uk); Hick (1952), *Quarterly Journal of Experimental Psychology* 4, 11-26, and Hyman (1953), as an encyclopedia gives them; Mayer, "Principles for reducing extraneous processing", *Cambridge Handbook of Multimedia Learning* (2014); NN/g, "How little do users read?", "How long do users stay on web pages?", "Scrolling and attention" and "10 usability heuristics" (nngroup.com); Sweller (1988), *Cognitive Science* 12, 257-285; W3C, "Making content usable for people with cognitive and learning disabilities" (Group Note, 2021) and its design guide; WCAG Understanding 3.1.3, 3.1.4 and 3.1.5; Ware, *Information Visualization*, through a UBC lecture handout. Checked and not used: Healey (1996) does not find "up to seven colours" (that figure is an older military rule-of-thumb in its introduction); the "10 to 20 seconds" of the NN/g article is 10 to 30 in its words. Already in `docs/DESIGN.md`: GOV.UK "Structuring forms", NN/g "Progressive disclosure".
