import { questionsLeft } from '../verdict';
/**
 * A document to download, as plain blocks: built once from the page's words and the engine's figures, then written as a
 * PDF (pdf.ts), an Excel workbook (xlsx.ts) and a Word file (docx.ts). Nothing here computes a figure: a cell carries the
 * text shown and, for the Excel copy, the number the engine gave.
 */

/** A figure as the engine gave it: an amount in rupees, a ratio, a count or a quantity (as typed), and the decimals shown. */
export interface Figure {
  /** `month`: a month as Excel's serial day number of its first day, shown as "Apr 2026". */
  value: number; kind: 'amount' | 'ratio' | 'count' | 'quantity' | 'month'; decimals: number;
  /** In the Excel copy: an input of the model, in blue on a pale yellow fill (the FAST Standard's mark), to be typed over. */
  input?: boolean;
  /** In the Excel copy: a zero shows as an empty cell (a count that is only there in some rows). */
  hideZero?: boolean;
  /**
   * In the Excel copy only, a formula (without "=") that redoes the figure from other cells, `value` being what the engine
   * gave: `{ref}` is this column's cell in the row named `ref` on the same sheet, `{Part!ref}` on another part's sheet,
   * `{ref@3}` the cell in the table's column 3 (0 the labels), `{ref@$3}` the same cell fixed ($D$9, for a range or a
   * constant), and `{ref@-1}` the cell one column to the left (the year before).
   */
  formula?: string;
  /** A formula that gives words (the year of the lowest DSCR): the words, shown until Excel works it again. A formula
   * whose `value` is not a number (NaN) gives an empty cell until then. */
  result?: string;
}
export interface Cell { text: string; figure?: Figure }
/** `head` names a group of rows, on a shaded band; `total` rows are in bold under a rule, and a `ratio` row between two. */
export type RowKind = 'head' | 'total' | 'ratio';
/** `ref` names the row for a formula (Figure.formula). */
export interface Row { cells: Cell[]; kind?: RowKind; ref?: string }
/** `wrap`: a column of words, left-aligned and wrapped, taking this share of the width the other columns leave. */
export interface Column { label: string; sub?: string; wrap?: number }
/** The first column names each row, and is repeated when the other columns are split across pages. */
/** `unit`: what its figures are in ("Amount in rupees"), said above the table at the right. */
/** `freeze`: in the Excel copy, the headings and this many columns of names stay in view as the sheet scrolls. */
/** `headRef`: names the headings' row for a formula, as `Row.ref` does (the years, for a chart's labels). */
export interface Table { columns: Column[]; rows: Row[]; size?: 'small'; unit?: string; freeze?: number; headRef?: string }

/** A figure in a shaded strip: its name, the figure, the level the lender looks for (in bold) and a note under it. */
export interface KeyFigure { label: string; value: string; level?: string; note?: string }
/**
 * Two amounts a year as bars from a common start, each with its figure at its end, the tightest year shaded and named
 * (`tightName`); the same chart on the page (Bars.tsx), in the PDF, the Word copy and the Excel copy. `texts` are the
 * figures as shown; `values` the engine's, for the bars' lengths and the Excel chart's cells.
 */
export interface Chart {
  title: string; unit: string; names: [string, string]; tightName: string;
  /** In the Word and Excel charts: the values divided by `scale` (100000 for lakh) and shown to `decimals`, as `texts` are. */
  scale?: number; decimals?: number;
  /** In the Excel copy: the model's cells the chart reads, as formula references ({Statement!cashLakh@$2}:{Statement!cashLakh@$7}). */
  sheet?: { labels: string; a: string; b: string };
  rows: { label: string; values: [number, number]; texts: [string, string]; tight?: boolean; note?: string }[];
}

/** A cover page: no running header or footer on it, and the next block starts a new page. */
export interface Cover { kicker: string; title: string; sub?: string; lines: string[]; facts: [string, string][]; mark?: { title: string; text: string } }

export type Block =
  | ({ kind: 'cover' } & Cover)
  /** The parts with a `section`, in order, each with its page in the PDF; a contents field in the Word copy; links in the Excel copy. */
  | { kind: 'contents'; title: string; compact?: boolean }
  /** `small` for the title of an annex. */
  | { kind: 'title'; text: string; sub?: string; small?: boolean }
  | { kind: 'heading'; text: string }
  | { kind: 'text'; text: string; small?: boolean }
  | { kind: 'list'; items: string[]; small?: boolean }
  | { kind: 'pairs'; pairs: [string, string][] }
  /** Facts two to a line where they are short; a line with one fact runs across the page. */
  | { kind: 'facts'; lines: [string, string][][] }
  | { kind: 'figures'; items: KeyFigure[] }
  | { kind: 'box'; title: string; items: string[] }
  | { kind: 'table'; table: Table }
  | { kind: 'chart'; chart: Chart }
  | { kind: 'signature'; lines: string[] };

/** A part is a sheet in the Excel copy, and starts a new page in the PDF and the Word copy; `sheetOnly` (a check sheet of formulas) is in the Excel copy alone. */
export interface Part {
  name: string; blocks: Block[]; sheetOnly?: boolean;
  /** In the PDF and the Word copy alone: the reading, whose figures the Excel copy's model sheets hold as formulas. */
  paperOnly?: boolean;
  /** Its line in the contents (like "1. The project at a glance"). */
  section?: string;
  /** Runs on under the part before it, in the PDF and the Word copy, rather than from a new page. */
  flow?: boolean;
  /** On the page's live paper only (Paper.tsx): the part is not worked out yet and stands as this many faint lines. */
  ghost?: number;
}

export interface Doc {
  title: string;
  /** On every page: at the top left, and in bold at the top right (like "Provisional"). */
  header: string;
  mark?: string;
  /** At the foot of every page, beside the page number. */
  footer: string;
  /** Said once near the top of the Excel copy only, about its cells. */
  workbookNote?: string;
  author?: string;
  creator: string;
  parts: Part[];
}

/** Every word and figure of the document as plain lines, in reading order: what the tests read. */
export function docText(d: Doc): string {
  const out: string[] = [d.header, d.mark ?? '', d.footer, d.workbookNote ?? ''];
  const cells = (r: Row) => r.cells.map((c) => c.text).join(' | ');
  for (const part of d.parts) for (const b of part.blocks) {
    if (b.kind === 'cover') out.push(b.kicker, b.title, b.sub ?? '', ...b.lines, ...b.facts.map(([k, v]) => `${k}: ${v}`), ...(b.mark ? [b.mark.title, b.mark.text] : []));
    else if (b.kind === 'contents') out.push(b.title, ...d.parts.filter((x) => x.section && !x.sheetOnly).map((x) => x.section as string));
    else if (b.kind === 'title') out.push(b.text, b.sub ?? '');
    else if (b.kind === 'heading' || b.kind === 'text') out.push(b.text);
    else if (b.kind === 'list') out.push(...b.items);
    else if (b.kind === 'pairs') out.push(...b.pairs.map(([k, v]) => `${k}: ${v}`));
    else if (b.kind === 'facts') out.push(...b.lines.flat().map(([k, v]) => `${k}: ${v}`));
    else if (b.kind === 'figures') out.push(...b.items.map((f) => `${f.label}: ${f.value}${f.level ? ` ${f.level}` : ''}${f.note ? ` ${f.note}` : ''}`));
    else if (b.kind === 'chart') out.push(b.chart.title, b.chart.unit, b.chart.names.join(' | '), ...b.chart.rows.map((r) => `${r.label}${r.tight ? ` (${b.chart.tightName})` : r.note ? ` (${r.note})` : ''}: ${r.texts.join(' | ')}`));
    else if (b.kind === 'box') out.push(b.title, ...b.items);
    else if (b.kind === 'table') out.push(b.table.unit ?? '', b.table.columns.map((c) => c.label + (c.sub ? ` (${c.sub})` : '')).join(' | '), ...b.table.rows.map(cells));
    else out.push(...b.lines);
  }
  return out.filter(Boolean).join('\n');
}

/** Beside the download buttons when the figures are complete and only the document's own facts are missing: not
 * "Provisional", which says the figures may change (CMA review finding 14, UX5); "1 question left, for the document" (OR3). */
export const forDocument = (n: number) => `${questionsLeft(n)}, for the document`;
