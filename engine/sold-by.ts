/**
 * What a product or service is sold by (OR6, D-UX-203): its unit, and the words "how many a month" and "the price" take
 * for it. A word only: the unit changes no sum. A line with no unit is sold by the piece.
 */
export interface SoldBy { id: string; label: string; many: string; per: string; sold: string }

export const SOLD_BY: SoldBy[] = [
  { id: 'piece', label: 'Piece', many: 'pieces', per: 'a piece', sold: 'Pieces sold' },
  { id: 'kg', label: 'Kilogram (kg)', many: 'kg', per: 'a kg', sold: 'Kg sold' },
  { id: 'tonne', label: 'Tonne', many: 'tonnes', per: 'a tonne', sold: 'Tonnes sold' },
  { id: 'litre', label: 'Litre', many: 'litres', per: 'a litre', sold: 'Litres sold' },
  { id: 'metre', label: 'Metre', many: 'metres', per: 'a metre', sold: 'Metres sold' },
  { id: 'sqft', label: 'Square foot (sq ft)', many: 'sq ft', per: 'a sq ft', sold: 'Sq ft sold' },
  { id: 'hour', label: 'Hour', many: 'hours', per: 'an hour', sold: 'Hours sold' },
  { id: 'day', label: 'Day', many: 'days', per: 'a day', sold: 'Days sold' },
  { id: 'job', label: 'Job', many: 'jobs', per: 'a job', sold: 'Jobs done' },
  { id: 'month', label: 'Month (a monthly fee)', many: 'customers billed', per: 'a month', sold: 'Months billed' },
];

/** A line's unit by its id; the piece when none is given or the id is not known. */
export const soldBy = (id?: string): SoldBy => SOLD_BY.find((u) => u.id === id) ?? SOLD_BY[0];
