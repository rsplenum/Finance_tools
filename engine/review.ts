/**
 * Review-by dates (Q2, D-TECH-34, D-DATA-19): each data file under engine/data/ names, beside its date, the day
 * its figures are next due for a review (`reviewBy`). The dates live in the files; this only compares them with today.
 * `npm run verify` warns in the last 30 days and fails once a date has passed (scripts/review-dates.mjs); a page
 * flags a passed date beside the figure's source, worked out when it is viewed.
 */

/** Today as YYYY-MM-DD, in the viewer's own time zone. */
export function todayIso(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

/** Whether a review-by date has passed: the day itself is still in time. ISO dates compare as text. */
export const overdue = (reviewBy: string, today: string): boolean => today > reviewBy;

/** The earliest of several review-by dates: a page built from several files is due when the first of them is. */
export const earliest = (dates: string[]): string => [...dates].sort()[0];

/** The words a page adds beside a source once its review-by date has passed, or '' while in time. */
export function overdueNote(reviewBy: string, today: string): string {
  return overdue(reviewBy, today) ? `Due for review since ${reviewBy.split('-').reverse().join('-')}.` : '';
}
