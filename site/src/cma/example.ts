/**
 * Fictional case K (C1), in lakh, oldest year first: a private company making steel furniture, worked outside the engine
 * (tests/cma.test.ts holds the figures worked by hand). The page offers it to try the forms; it is nobody's real data.
 */
export const EXAMPLE = {
  existingLimit: 7000000,
  rows: {
    sales: [300, 345, 390, 445, 520], otherIncome: [2, 2, 3, 3, 3], materials: [195, 224, 253, 289, 338], otherDirect: [30, 34, 39, 44, 52],
    employees: [20, 22, 25, 28, 31], sga: [15, 17, 19, 22, 25], depreciation: [6, 6, 7, 8, 9], wcInterest: [5, 6, 7, 8, 9], tlInterest: [3, 3, 2.5, 2, 3],
    tax: [7, 8.8, 10.1, 11.8, 14], drawings: [12, 15, 18, 22, 26],
    capital: [30, 30, 30, 30, 40], reserves: [0, 11.2, 23.6, 36.8, 52.8], promoterLoans: [15, 15, 15, 15, 15], termLoans: [30, 24, 18, 12, 40], tlDue12: [6, 6, 6, 6, 8],
    bankWc: [45, 52, 60, 70, 95], creditors: [25, 28, 32, 36, 42], otherCl: [8, 9, 10, 11, 12],
    netBlock: [60, 60, 62, 64, 110], nonCurrent: [5, 5, 6, 6, 6], stock: [35, 40, 46, 52, 60], debtors: [33, 38, 43, 50, 58], cash: [14, 19.2, 23.6, 29.8, 52.8], otherCa: [6, 7, 8, 9, 10],
  } as Record<string, number[]>,
};
