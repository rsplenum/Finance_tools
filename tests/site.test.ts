import { describe, expect, it } from 'vitest';
import { gstinOk } from '../site/src/site';

// Sample GSTINs that circulate in public GST examples, their last character as printed, each worked again in Python as
// a second computation (LEGAL1, D-BIZ-07). The owner's GSTIN stays out of the public repo until payments (P1d).
describe('gstinOk', () => {
  it('takes a GSTIN whose last character is its check character', () => {
    expect(gstinOk('27AAPFU0939F1ZV')).toBe(true);
    expect(gstinOk('29AABCU9603R1ZJ')).toBe(true);
  });
  it('refuses a wrong check character, a changed character and a malformed number', () => {
    expect(gstinOk('27AAPFU0939F1ZW')).toBe(false);
    expect(gstinOk('27AAPFU0939G1ZV')).toBe(false);
    expect(gstinOk('27aapfu0939f1zv')).toBe(false);
    expect(gstinOk('27AAPFU0939F1Z')).toBe(false);
  });
});
