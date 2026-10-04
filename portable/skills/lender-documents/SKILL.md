---
name: lender-documents
description: Make and check the documents a borrower hands a lender (PDF, Excel and Word copies, printouts) - what they say, how to build and test them, and the tradeoffs when they change.
---

# Lender documents

The paid product is the document a lender accepts on the first submission. It says only what the calculation worked out and what the user typed, looks the same on every device, and can be checked as text.

## How to build one

- Turn the page's result into a document of plain blocks (a title, pairs, a strip of key figures, text, lists, a shaded box, tables, a signature), then write that one model as the PDF, the Excel copy and the Word copy, so the three never disagree.
- Make the file's bytes in the tap itself, with no `await` before the click, so that phones allow the download.
- No figure is computed in document code. Give every document a test that it holds no figure the page did not show or the user did not type.

## What a lender document says

Laid out as a chartered accountant's statement. Page 1, signed:

1. The borrower's name as the title; the lender and the date. While anything is missing, "Provisional" goes on every page, with a box of what is still needed; there is no status line once it is complete.
2. The loan's facts, two to a line.
3. The whole working as the page shows it: every line, nil lines too, in the order it is worked out.
4. The key results in a shaded strip under it (for DSCR, the average and the lowest year).
5. The signature block.

Then the annexes, each from a new page: the basis (each fact entered, once, with its basis in full, such as "Rs. 1,50,000 every year"; the method in plain words, with its source), then the schedule.

**Never cut the working.** A layout change moves, groups and styles lines; it never drops one. The owner said: "don't compromise on the calculations. the presentation needs working not curtailing the calculation".

Keep on the page and out of the document: the assumptions, the verdict, the largest loan, the lender's target, how far the site checked the method, and the rules for building the figures. Change the document, never the calculation or its data, to leave something out. Ask only for facts the page does not already have (the borrower's name, the lender), once. Cite only what was looked up; say "approximate" otherwise.

## Limits to know

- A PDF in the standard Helvetica fonts holds Latin letters only: check what the user types, and ask for a name in Devanagari again in English letters. The Word copy keeps any letters.
- A short table stays on one page with its heading, and a long one continues under its header. Many year columns split into tables that fit the width.
- The Excel copy holds the exact figures as numbers, with lakh and crore formats and no formulas unless the owner chooses them; it prints on A4, one page wide. A merged cell does not grow with its text in Excel, so set those rows' heights.
- A Word file must follow the schema's order of elements, or Word refuses it even when other readers open it.

## Tests: text, not screenshots

- Read files back with readers written by others (pdf.js for a PDF, read-excel-file for a workbook, mammoth for a Word body and JSZip for its header and footer). Assert lines and cells, and compare the figures with hand-worked cases.
- The site check downloads each file at 390 px (Playwright's `download` event) and reads it back.
- Only for a layout question, look at a page image: render a PDF page with pdf.js and `@napi-rs/canvas` in Node. To see a .docx or .xlsx, `apt-get install libreoffice-writer libreoffice-calc`, then `soffice --headless -env:UserInstallation=file://<scratch>/lo --convert-to pdf` prints it to a PDF.

## Tradeoffs to tell the owner when documents change

- `window.print()` prints the web page: a second layout to keep in step with the PDF. Opening the same PDF for printing keeps one layout.
- A PDF library adds 100 KB or more to the page; a small writer of our own is ours to maintain.
- Formulas in the Excel copy show the working, but become a second copy of the method to keep in step with the calculation.
- The Word copy can be edited, so what reaches a lender may differ from what the page worked out; the PDF is the copy to send.
- Files made in the browser let payment gate the buttons, not the file itself.
