/**
 * How sure each figure is (D-DATA-25, TRUST1): every file in engine/data/ carries a mark, and so does every block in it
 * with a source of its own. Four marks: verified at its primary source (with `read`, the date that page was read),
 * cross-checked (two or more secondary sources agree), illustrative (our own choice, the owner's, or an example) and
 * needs review. A mark never changes a figure, and never blocks a download: it is said beside the result it moves.
 * Only a session that read the primary page promotes a value to verified. Pure — no DOM.
 */
export type Sure = 'verified' | 'cross-checked' | 'illustrative' | 'review';
export const SURE: Sure[] = ['verified', 'cross-checked', 'illustrative', 'review'];

/** What a block of data carries: its mark and, when verified, the day its primary page was read. */
export interface Marked { sure: Sure; read?: string }

const dmy = (iso: string) => iso.split('-').reverse().join('-');

/** The mark in a few plain words, as it reads in a line beside a result. */
export const SURE_WORD: Record<Sure, string> = {
  verified: 'verified at its source',
  'cross-checked': 'cross-checked: two or more sources agree',
  illustrative: 'illustrative: an example or our own choice, not a rule',
  review: 'needs review: not yet confirmed at its source',
};

/** "Verified at its source on 20-10-2026", or the mark's words with a capital. */
export const sureText = (m: Marked) => {
  const w = m.sure === 'verified' && m.read ? `${SURE_WORD.verified} on ${dmy(m.read)}` : SURE_WORD[m.sure];
  return w.charAt(0).toUpperCase() + w.slice(1);
};

/** The least sure of several marks, which is what a result resting on all of them can claim. */
export const leastSure = (ms: Marked[]): Marked => {
  const worst = ms.reduce((a, m) => (SURE.indexOf(m.sure) > SURE.indexOf(a.sure) ? m : a), ms[0]);
  const reads = ms.filter((m) => m.sure === 'verified' && m.read).map((m) => m.read as string).sort();
  return worst.sure === 'verified' ? { sure: 'verified', read: reads[0] } : { sure: worst.sure };
};

/** Every place in a data file that lacks its mark, for the check in `npm run verify`: the file itself, each block with a
 *  source, and each verified mark without the date its page was read. */
export function unmarked(file: string, data: unknown): string[] {
  const out: string[] = [];
  const look = (o: unknown, at: string, top: boolean) => {
    if (Array.isArray(o)) return o.forEach((x, i) => look(x, `${at}[${i}]`, false));
    if (!o || typeof o !== 'object') return;
    const r = o as Record<string, unknown>;
    if (top || typeof r.source === 'string') {
      if (!SURE.includes(r.sure as Sure)) out.push(`${file}${at}: no mark`);
      else if (r.sure === 'verified' && !/^\d{4}-\d{2}-\d{2}$/.test(String(r.read))) out.push(`${file}${at}: verified without the day it was read`);
    }
    if ('verified' in r || typeof r.checked === 'boolean') out.push(`${file}${at}: the old flag, in place of a mark`);
    for (const [k, v] of Object.entries(r)) look(v, `${at}.${k}`, false);
  };
  look(data, '', true);
  return out;
}

/** The same words in lower case, to follow a colon or a clause. */
export const sureLower = (m: Marked) => { const t = sureText(m); return t.charAt(0).toLowerCase() + t.slice(1); };
