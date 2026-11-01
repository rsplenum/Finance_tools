/** Exact conversions from 1 ft = 0.3048 m, apart from the library so the rules alone can use them (UXR7); library.ts re-exports them. */
export const SQFT_PER_SQM = 1 / (0.3048 * 0.3048);
export const FT_PER_M = 1 / 0.3048;
export const CFT_PER_CUM = 1 / (0.3048 * 0.3048 * 0.3048);
