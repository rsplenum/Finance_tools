/**
 * Whether the report's pages are open (NEW2, docs/WORKED-PAGE.md §7): every user sees them open until the gate at the
 * final launch (PAY1); the locked state is built and shown with `?paper=locked`, for review only. PAY1 changes this one
 * place.
 */
export function paperOpen(): boolean {
  try { return new URLSearchParams(location.search).get('paper') !== 'locked'; } catch { return true; }
}
