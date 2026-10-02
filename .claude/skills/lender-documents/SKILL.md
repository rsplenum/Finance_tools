---
name: lender-documents
description: How documents are made, checked and changed in this repo - the PDF a borrower hands to a lender, the Excel copy for an accountant, the Word copy to edit, a printout - for the DSCR statement now and the construction estimate and project report later. Use it whenever a task touches site/src/doc/, site/src/dscr/document.ts, a download or print button, or what a downloaded file says, and before adding any PDF, spreadsheet or Word library.
---

# Lender documents

The paid product is the document a lender accepts on the first submission. It says only what the engine worked out and what the user typed, looks the same on every device, and can be checked as text.

## How a document is built

1. The engine's result reaches the page as views (`site/src/dscr/model.ts`). The statement and schedule views carry the words shown and the engine's exact figures (`n`).
2. A builder turns the page's state and preview into a `Doc` of plain blocks (`site/src/doc/doc.ts`): a title, pairs, facts two to a line, a strip of key figures, text, lists, a shaded box, tables and a signature. For DSCR it is `site/src/dscr/document.ts`.
3. The same `Doc` is written three times, with no library: `pdfOf` (`pdf.ts`), `xlsxOf` (`xlsx.ts`) and `docxOf` (`docx.ts`); the last two share a stored zip (`zip.ts`). A part is a new page in the PDF and the Word copy, and a sheet in the Excel copy.
4. The page makes the bytes in the tap itself, with no `await` before the click, so that phones allow the download.

No figure is computed in document code. The test that the document "holds no figure the page did not already show or the user did not type" fails if one is (`tests/dscr-document.test.ts`); give every new document the same test.

## What a lender document says

Laid out as a chartered accountant's statement (D-DOC-04). Page 1, signed:

1. The borrower's name as the title; the lender and the date. While anything is missing, "Provisional" goes on every page, with a box of what is still needed. There is no status line once it is complete.
2. The loan's facts, two to a line.
3. The whole working as the page shows it: every line, nil lines too, in the order it is worked out (profit, cash available, debt service, the DSCR).
4. The average and the lowest year in a shaded strip under it.
5. The signature block.

Then the annexes, each from a new page: 1, the basis (the facts entered, each once, each with its basis in full, such as "Rs. 1,50,000 every year"; the method in plain words, with its source); 2, the repayment schedule.

**Never cut the working.** A layout change moves, groups and styles lines; it never drops one. The owner said: "don't compromise on the calculations. the presentation needs working not curtailing the calculation".

Kept on the page and out of the documents: the assumptions, the verdict, the largest loan and the fewest instalments (D-DOC-03); the lender's target; how far this site checked the method (`sourceForLender` trims the data's notes); and the rules for building the figures (D-DOC-05). Change the document, never the engine or its data, to leave something out.

Ask only for facts the page does not already have (such as the borrower's name and the lender), once.

## Limits to know

- The PDF uses the standard Helvetica fonts, so Latin letters only. `printable()` checks what the user types; a name in Devanagari is asked for again in English letters. The Word copy keeps any letters.
- A short table stays on one page with its heading, and a long one continues under its header. Many year columns split into tables that fit the width, in the PDF and the Word copy alike (`measure` in `pdf.ts`).
- The Excel copy holds the engine's exact figures as numbers, with lakh and crore formats and no formulas (D-DOC-02; the owner may choose formulas later). It prints on A4, one page wide. A merged cell does not grow with its text in Excel, so `xlsx.ts` sets those rows' heights itself.
- The Word copy must follow the schema's order of elements, or Word refuses the file even when other readers open it. `docx.ts` notes the order wherever it builds properties.

## Tests: text, not screenshots

- Read files back with readers written by others (`scripts/read-doc.mjs`): pdf.js for the PDF, read-excel-file for the workbook, mammoth for the Word copy's body and JSZip for its header and footer. Assert lines and cells, and compare the figures with hand-worked cases.
- The site check downloads each file at 390 px (Playwright's `download` event) and reads it back.
- Only for a layout question, look at a page image. Render a PDF page with pdf.js and `@napi-rs/canvas` in Node (`standardFontDataUrl` pointing to `node_modules/pdfjs-dist/standard_fonts/`). The container's LibreOffice is only its core: `apt-get install libreoffice-writer libreoffice-calc`, then `soffice --headless -env:UserInstallation=file://<scratch>/lo --convert-to pdf` prints a .docx or .xlsx to a PDF to look at.

## Tradeoffs to tell the owner when documents change

- `window.print()` prints the web page: a second layout to keep in step with the PDF. Opening the same PDF for printing keeps one layout.
- A PDF library adds 100 KB or more to the page; our writer is small, but ours to maintain.
- Formulas in the Excel copy show the working, but become a second copy of the method to keep in step with the engine.
- The Word copy can be edited, so what reaches a lender may differ from what the page worked out; the PDF is the copy to send.
- The files are made in the browser, so payment can gate the buttons, not the file itself.
