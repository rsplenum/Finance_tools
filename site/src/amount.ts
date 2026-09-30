/** What an amount field says back while typing. Figures come only from the engine; '' while the field is empty. */
import { parseAmount } from '../../engine/parse';
import { rs, rupeesWords } from '../../engine/util';

export function readBack(text: string): string {
  if (!text.trim()) return '';
  const n = parseAmount(text);
  if (n === undefined) return 'Not understood. Try 70 L, 1.2 Cr or 70,00,000.';
  if (n <= 0) return 'Enter an amount above zero.';
  return `${rs(n)} (${rupeesWords(n)})`;
}
