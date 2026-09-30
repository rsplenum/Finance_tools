/**
 * A document to download, as plain blocks: built once from the page's words and the engine's figures, then written as a
 * PDF (pdf.ts) and as an Excel workbook (xlsx.ts). Nothing here computes a figure: a cell carries the text shown and,
 * for the Excel copy, the number the engine gave.
 */

/** A figure as the engine gave it: an amount in rupees, a ratio or a count, and the decimals shown. */
export interface Figure { value: number; kind: 'amount' | 'ratio' | 'count'; decimals: number }
export interface Cell { text: string; figure?: Figure }
/** `head` names a group of rows; `total` and `ratio` rows are in bold, under a rule. */
export type RowKind = 'head' | 'total' | 'ratio';
export interface Row { cells: Cell[]; kind?: RowKind }
export interface Column { label: string; sub?: string }
/** The first column names each row, and is repeated when the other columns are split across pages. */
export interface Table { columns: Column[]; rows: Row[]; size?: 'small' }

export type Block =
  | { kind: 'title'; text: string; sub?: string }
  | { kind: 'heading'; text: string }
  | { kind: 'text'; text: string; small?: boolean }
  | { kind: 'list'; items: string[]; small?: boolean }
  | { kind: 'pairs'; pairs: [string, string][] }
  | { kind: 'box'; title: string; items: string[] }
  | { kind: 'table'; table: Table }
  | { kind: 'signature'; lines: string[] };

/** A part is a sheet in the Excel copy, and starts a new page in the PDF. */
export interface Part { name: string; blocks: Block[] }

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
    if (b.kind === 'title') out.push(b.text, b.sub ?? '');
    else if (b.kind === 'heading' || b.kind === 'text') out.push(b.text);
    else if (b.kind === 'list') out.push(...b.items);
    else if (b.kind === 'pairs') out.push(...b.pairs.map(([k, v]) => `${k}: ${v}`));
    else if (b.kind === 'box') out.push(b.title, ...b.items);
    else if (b.kind === 'table') out.push(b.table.columns.map((c) => c.label + (c.sub ? ` (${c.sub})` : '')).join(' | '), ...b.table.rows.map(cells));
    else out.push(...b.lines);
  }
  return out.filter(Boolean).join('\n');
}
