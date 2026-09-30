/** The amount field's read-back: 70 lakh is 70,00,000 and 1.2 crore is 1,20,00,000 by definition of the units. */
import { describe, it, expect } from 'vitest';
import { readBack } from '../site/src/amount';

describe('amount read-back', () => {
  it('reads Indian shorthand back in figures and words', () => {
    expect(readBack('70 L')).toBe('Rs. 70,00,000 (Rupees Seventy Lakh Only)');
    expect(readBack('1.2 Cr')).toBe('Rs. 1,20,00,000 (Rupees One Crore Twenty Lakh Only)');
    expect(readBack('Rs. 7,00,000')).toBe('Rs. 7,00,000 (Rupees Seven Lakh Only)');
  });
  it('says nothing while empty, and says what is wrong otherwise', () => {
    expect(readBack('  ')).toBe('');
    expect(readBack('seventy')).toMatch(/^Not understood/);
    expect(readBack('0')).toBe('Enter an amount above zero.');
    expect(readBack('-5 L')).toBe('Enter an amount above zero.');
  });
});
