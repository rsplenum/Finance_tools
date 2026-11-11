/**
 * Finds a field the way a person does, by its label, never by an id (D-TECH-111): `field=Loan amount (Rs.)` is the input,
 * select or textarea whose label says that; `field=Who is borrowing? > A firm` is the choice "A firm" in the group so
 * named (a fieldset's legend, or a labelled group); a label ending in `…` is the one that starts so (a choice's label
 * runs into its description). Importing this file registers the engine with Playwright, so the
 * selector works wherever a selector does: page.fill, page.check, page.locator.
 */
import { selectors } from 'playwright';

/** Runs in the page. */
export function fieldEngine() {
  const norm = (t) => (t ?? '').replace(/\s+/g, ' ').trim();
  const byIds = (ids) => norm((ids ?? '').split(/\s+/).filter(Boolean).map((id) => document.getElementById(id)?.textContent ?? '').join(' '));
  const nameOf = (el) => norm(el.getAttribute('aria-label')) || byIds(el.getAttribute('aria-labelledby')) || norm(el.labels?.[0]?.textContent);
  const GROUP = 'fieldset, [role="group"], [role="radiogroup"]';
  const groupsOf = (el) => {
    const out = [];
    for (let g = el.parentElement?.closest(GROUP); g; g = g.parentElement?.closest(GROUP)) out.push(norm(g.querySelector(':scope > legend')?.textContent) || norm(g.getAttribute('aria-label')) || byIds(g.getAttribute('aria-labelledby')));
    return out;
  };
  const find = (root, sel) => {
    const parts = sel.split(' > ').map(norm), label = parts.pop();
    const fits = (name) => (label.endsWith('…') ? name.startsWith(label.slice(0, -1)) : name === label);
    return [...root.querySelectorAll('input, select, textarea')].filter((el) => fits(nameOf(el)) && parts.every((g) => groupsOf(el).includes(g)));
  };
  return { query: (root, sel) => find(root, sel)[0] ?? null, queryAll: find, nameOf, groupsOf };
}
await selectors.register('field', fieldEngine);
