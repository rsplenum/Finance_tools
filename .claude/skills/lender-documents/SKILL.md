---
name: lender-documents
description: How documents are made, checked and changed in this repo - the PDF a borrower hands to a lender, the Excel copy for an accountant, a printout - for the DSCR statement now and the construction estimate and project report later. Use it whenever a task touches site/src/doc/, site/src/dscr/document.ts, a download or print button, or what a downloaded file says, and before adding any PDF or spreadsheet library.
---

# Lender documents

The paid product is the document a lender accepts on the first submission. It says only what the engine worked out and what the user typed, looks the same on every device, and can be checked as text.

## How a document is built

1. The engine's result reaches the page as views (`site/src/dscr/model.ts`). The statement and schedule views carry the words shown and the engine's exact figures (`n`).
2. A builder turns the page's state and preview into a `Doc` of plain blocks (`site/src/doc/doc.ts`): a title, pairs, text, lists, a shaded box, tables and a signature. For DSCR it is `site/src/dscr/document.ts`.
3. The same `Doc` is written twice, by `pdfOf` (`site/src/doc/pdf.ts`) and `xlsxOf` (`site/src/doc/xlsx.ts`), with no library: about 10 KB gzipped in all.
4. The page makes the bytes in the tap itself, with no `await` before the click, so that phones allow the download.

No figure is computed in document code. The test that the document "holds no figure the page did not already show or the user did not type" fails if one is (`tests/dscr-document.test.ts`); give every new document the same test.

## What a lender document says

In order:

1. Who and what: the borrower, the lender, the date and the status. While anything is missing, "Provisional" goes on every page, with what is still needed.
2. The result, then the table.
3. The working: the method in plain words, with its source.
4. The facts entered, each once, and every assumption still in use with its reason.
5. A signature block, then any annexes.

Ask only for facts the page does not already have (such as the borrower's name and the lender), once.

## Limits to know

- The PDF uses the standard Helvetica fonts, so Latin letters only. `printable()` checks what the user types; a name in Devanagari is asked for again in English letters.
- A short table stays on one page with its heading, and a long one continues under its header. Many year columns split into tables that fit the width.
- The Excel copy holds the engine's exact figures as numbers, with lakh and crore formats and no formulas (D-DOC-02; the owner may choose formulas later).

## Tests: text, not screenshots

- Read files back with readers written by others (`scripts/read-doc.mjs`: pdf.js for the PDF, read-excel-file for the workbook). Assert lines and cells, and compare the figures with hand-worked cases.
- The site check downloads each file at 390 px (Playwright's `download` event) and reads it back.
- Only for a layout question, look at a page image. LibreOffice in the container opens no file, so render the PDF with pdf.js in Chromium from a scratch script that serves `node_modules/pdfjs-dist`; for a workbook, use openpyxl in a scratch venv.

## Tradeoffs to tell the owner when documents change

- `window.print()` prints the web page: a second layout to keep in step with the PDF. Opening the same PDF for printing keeps one layout.
- A PDF library adds 100 KB or more to the page; our writer is small, but ours to maintain.
- Formulas in the Excel copy show the working, but become a second copy of the method to keep in step with the engine.
- The files are made in the browser, so payment can gate the buttons, not the file itself.
