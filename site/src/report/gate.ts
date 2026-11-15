/**
 * Whether the report's pages are open (NEW2, docs/WORKED-PAGE.md §7). Locked by default on Rahul's word (his review of
 * NEW2, 15-11-2026: a report shown whole on the screen is copied, not paid for): the first page shows, the rest open with
 * the download. `?paper=open` shows them all, for review and the site check, until the gate at the final launch (PAY1)
 * opens them on payment. PAY1 changes this one place.
 */
export function paperOpen(): boolean {
  try { return new URLSearchParams(location.search).get('paper') === 'open'; } catch { return false; }
}
