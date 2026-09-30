/** Types for read-doc.mjs. */
export function pdfPages(bytes: Uint8Array): Promise<string[]>;
export function workbook(bytes: Uint8Array): Promise<{ sheet: string; data: (string | number | boolean | Date | null)[][] }[]>;
