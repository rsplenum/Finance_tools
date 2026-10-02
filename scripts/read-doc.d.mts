/** Types for read-doc.mjs. */
export function pdfPages(bytes: Uint8Array): Promise<string[]>;
export function workbook(bytes: Uint8Array): Promise<{ sheet: string; data: (string | number | boolean | Date | null)[][] }[]>;
export function docxLines(bytes: Uint8Array): Promise<{ lines: string[]; messages: { type: string; message: string }[] }>;
export function docxPart(bytes: Uint8Array, name: string): Promise<string | undefined>;
