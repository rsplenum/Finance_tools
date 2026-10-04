# Carried lessons

The lessons that hold in any project: the context each arose in, its rule, and where the rule lives in this pack. Each project keeps its own log (`docs/LESSONS.md`, the `lessons` skill); a row that holds anywhere is copied here with its rule word for word, and the changed skills are uploaded again. Newest at the bottom.

| Date | Context | Rule | Lives in |
| --- | --- | --- | --- |
| 09-2026 | Tests written from the model's own understanding passed while the owner's Excel showed the maths "way off" | Golden tests come from the owner's worked figures | `money-maths-checks`, Tests |
| 09-2026 | A tiered option showed "Rs. 0 / does not work" for a later period with no income | Model the domain boundary: tiers end where income ends | `money-maths-checks`, traps |
| 09-2026 | Long explanatory paragraphs, and the same label repeated on every option | State a thing once; list only what changes the answer | `brief-first`, Pages |
| 09-2026 | A list the owner gave was treated as complete | Generalise; lists are examples | `working-practice` |
| 09-2026 | Generated text cited page references never looked up | Cite only what was looked up; say "approximate" otherwise | `working-practice`; `lender-documents` |
| 09-2026 | The owner was asked for facts already in the rules text | Search the source before asking | `working-practice` |
| 03-10-2026 | A page's answer ran to about 810 words before any tap; the owner asked for it shorter | Give a page's answer a word budget that the site check fails on; new detail goes behind a tap. | `brief-first` §4 |
| 03-10-2026, sharpened 04-10-2026 | A test looked up a wrong key inside an `if`, so it skipped itself and passed while testing nothing; another picked a line by part of its key and caught the wrong one | A test asserts that its fixture exists and is the one meant, picked by its full key, never a part of it; no expectations inside an `if`. | `working-practice`, Checks |
| 03-10-2026 | A generated doc printed 81 lines, nearly all alike, and buried the 10 that mattered | A generated doc prints the exceptions and a count, not every row. | `working-practice`, Checks |
| 04-10-2026 | A long session on a model with a 1M-token window never compacted: the context peaked at 746k tokens, and reading it back was about 60% of the cost | Compact at about 192k tokens, and start a new session for each feature. | `working-practice`, Tokens |
| 04-10-2026 | Where compaction fires was stated from one line of the tool's code; the log showed otherwise, and the answer and three docs were corrected | After changing a tool's setting, confirm its effect in the logs before stating it as fact. | `working-practice`, Checks; `lessons` §7 |
| 04-10-2026 | A retail listing with a plural title may price a pack | Read how many a listing with a plural title holds before taking its price as one item's. | `money-maths-checks`, Rates |
| 04-10-2026 | Tagged one by one, items citing the same source could end up with different tax bases | Read a source's note on GST once and tag every item that cites it alone the same way. | `money-maths-checks`, Rates |
| 04-10-2026 | `textContent` joins paragraphs with no space, so four checks with a space before each label failed on a page that was right | Match text read across paragraphs with no space before a label that starts one. | `working-practice`, Checks |
| 04-10-2026 | Heavy usage after compaction: 184 steps an hour, most of them single web searches, each re-reading a fixed 62k tokens | Put independent commands together in one step and fetch many pages through one script that prints only what is needed; start each feature in a new session. | `working-practice`, Tokens |
| 04-10-2026 | Six checks chained through `tail` hid their exit codes, so two were run again | Run a project's checks through one script that prints each check's exit code and only a failing check's output | `working-practice`, Checks |
| 04-10-2026 | An effort level was named by its settings-file word; the owner's app calls it Extra, and the owner corrected it | With the owner, name a setting as the screen they use shows it; use the setting file's word only where a file needs it | `working-practice`, What the owner asks for |
| 04-10-2026 | Effort skills were built and recorded from the documentation before one was tried; the first try showed no effect, and four docs were written again | Before building on a tool's setting, try it once in this environment and read what it did (a log line, an environment variable) | `working-practice`, Checks |
| 04-10-2026 | Pages behind search summaries held other figures, or none: a parked domain, a firm that publishes no rates | A search summary is a lead, not a source: open the page and read the figure before taking it. | `money-maths-checks`, Rates |
| 04-10-2026 | A script filling missing values changed 14 that were already set, while reporting no conflicts | A script that fills missing values touches only missing values: it prints each value it changes, old and new, and stops on one already set. | `money-maths-checks`, Rates |
| 04-10-2026 | GST for a material's source was added to labour from another source too | Add a tax or a factor only to the part of a rate that its source quotes; keep parts from other sources apart in both computations. | `money-maths-checks`, Rates |
