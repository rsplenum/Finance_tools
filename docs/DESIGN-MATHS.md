# The design maths (UX5c, D-UX-95)

Why the look is what it is, in the few formulas that back it. Each section names the rule it gives the pages and the
count in `scripts/load-measure.mjs` that watches it, or says no count does. The counts are in `docs/LOAD-MEASURE.md`;
the look page by page in `docs/DESIGN-SITE.md`. Sources marked [K] are the standard papers, cited from the literature
and not reopened this session; nothing here is a figure shown to a borrower.

## 1. Load as time
A page costs its reader roughly

  T ≈ W / 238 + Σ choices + scrolls

seconds of reading, choosing and finding (W/238 in minutes), where W is the words read and 238 words a minute is the adult
silent-reading rate (Brysbaert 2019). Each part has its law:
- **Reading.** Time grows with words, so 10 seconds to show a page's worth is about 40 words: the aim for count 1
  (words before the first question). The tool heading (D-UX-94) spends some of these on one line of what the page
  needs and gives; it is the only text above the first field.
- **Choosing.** Hick-Hyman: T = a + b·log2(n + 1) for n equally likely options (Hick 1952, Hyman 1953 [K]). Time
  grows with the log of the options, so a long list costs less than its length suggests, but every extra field on the
  default path is a fresh choice to read and decide. Hence the owner's input lists as a ceiling (D-UX-10, D-UX-12):
  count 7 (controls) and the site check's field count.
- **Reaching.** Fitts, in MacKenzie's form: T = a + b·log2(D / W + 1), D the distance to a target and W its width
  (Fitts 1954, MacKenzie 1992 [K]). A small target far away costs most. Hence 44 px targets (WCAG 2.5.5) and the answer
  bar's one arrow pinned to the foot: its D is never more than a thumb's reach. No count reads target sizes; the design
  checks do.

## 2. One visual code per meaning
A colour, a ground, a rule or a mark is a code the reader learns: "teal here means it passes". The cost is not the
number of colours (count 11) but the number of codes per meaning, and meanings whose colours are near enough to be
confused.

  Extra codes = Σ over meanings (channels used − 1) + pairs of meanings in use whose hues lie within 15°

- A **meaning** is a token group: act (`--link`, `--accent`, `--accent-hover`), good, warn and bad (each with its
  tint), marigold, margin, the chart sparks, and each of the estimate's room shares.
- A **channel** is the way a shown element carries that token: text, ground (background), rule (a border) or mark
  (an SVG fill or stroke). A computed colour counts as the token's when each of R, G and B lies within 2.
- One meaning on one channel costs 0: teal text for "meets" everywhere. Teal text and a teal ground for the same
  meaning cost 1, because the reader must learn that both say "meets". Two meanings in near hues cost 1, because the
  reader must tell them apart.

The aim is 0; the check holds each page at its baseline and lets it only fall (`docs/LOAD-MEASURE.md` §5). At UX5c
the tool pages stood at 3 or 4 (act on text and ground, good and warn on text, ground and rule). UX7 (D-UX-104) cut them
all to 0: good, warn and bad on text only, the accent on links only, a chosen option and the answer's state drawn in ink.
Kept, with its line: a field in error has a red edge beside its red words, the convention people know; no measured
state shows one.

*Gamed by:* drawing a meaning in a raw colour that matches no token (the design baseline's ratchet on raw palette
classes guards it), or one token for two meanings (the critic's "one colour per thing").

## 3. Which encoding for which figure
Cleveland and McGill (1984 [K]) ranked how accurately people read amounts: position on a common scale first, then
position on unaligned scales, length, angle and slope, area, and last colour saturation and hue. Mackinlay (1986 [K])
added that for categories (nominal data) hue ranks high, just after position. Bertin (1967 [K]) gives the same split
between quantity and kind. The rules the pages take:
- An amount is shown by position or length on one scale (the DSCR's years on one axis, the estimate's room shares as
  lengths of one bar), and always also as a figure in words.
- Hue says only a kind (meets, provisional, misses; which room), never how much.
- No pies, no areas, no 3D. No count reads this; the critic does.

## 4. Say only what changed
Shannon (1948 [K]): a message carries −log2 p bits, p its probability. A figure the reader expected says almost
nothing; the change is the news. Hence:
- live regions read out the answer, not the page, and only when it changes (the answer bar, D-UX-84);
- a changed figure shows was → now where the page keeps the old one;
- count 12 (out of sight) fails a control whose change lands where the reader cannot see it.

## 5. What it does not model
- Meaning: a word count weighs a heading like a disclaimer; the critic and people read the sense.
- Learning across visits: a code learnt once costs less the next time; the counts take a first visit.
- Dark mode and widths above 360 px: measured by the critic, not the counts (`docs/LOAD-MEASURE.md` §7, 4).
- People: the aims are hypotheses until the owner's tests back them (§6 of the same paper).

## Sources
Brysbaert (2019), *Journal of Memory and Language* 109, "How many words do we read per minute?"; Hick (1952),
*Quarterly Journal of Experimental Psychology* 4, 11-26; Hyman (1953), *Journal of Experimental Psychology* 45,
188-196; Fitts (1954), *Journal of Experimental Psychology* 47, 381-391; MacKenzie (1992), *Human-Computer
Interaction* 7, 91-139; Cleveland and McGill (1984), *Journal of the American Statistical Association* 79, 531-554;
Mackinlay (1986), *ACM Transactions on Graphics* 5, 110-141; Shannon (1948), *Bell System Technical Journal* 27,
379-423; Bertin (1967), *Sémiologie graphique*; WCAG 2.2, Success Criterion 2.5.5 (Target Size, Enhanced).
