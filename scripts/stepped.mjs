/**
 * The builder's steps for a script (BUILD1, D-UX-340): the project report keeps every step on the page and shows one, so a
 * script that fills a field or presses a button first goes to the step that holds it. `stepped(page)` wraps a Playwright
 * page so each act does that by itself; the site check, the design checks and the load measure all drive the page through it.
 */
const STEP_ACTS = new Set(['check', 'uncheck', 'setChecked', 'fill', 'click', 'dblclick', 'focus', 'selectOption', 'press', 'type', 'pressSequentially', 'tap', 'hover', 'isVisible', 'waitFor', 'scrollIntoViewIfNeeded']);
const isLocator = (x) => !!x && typeof x === 'object' && typeof x.count === 'function' && typeof x.click === 'function' && typeof x.then !== 'function';
async function stepTo(page, loc) {
  if (!(await loc.count())) return;
  const id = await loc.first().evaluate((el) => { const st = el.closest('[data-step]'); return st ? (st.hidden ? st.dataset.step : null) : el.closest('[hidden]') ? 'business' : null; });
  if (id) await page.getByTestId(`rep-step-${id}`).click();
}
const steppedLocator = (page, loc) => new Proxy(loc, { get(t, k) {
  const val = t[k];
  if (typeof val !== 'function') return val;
  if (STEP_ACTS.has(k)) return async (...a) => { if (k !== 'waitFor' || !a[0]?.state || a[0].state === 'visible') await stepTo(page, t); return val.apply(t, a); };
  return (...a) => { const out = val.apply(t, a); return isLocator(out) ? steppedLocator(page, out) : out; };
} });
export const stepped = (page) => new Proxy(page, { get(t, k) {
  const val = t[k];
  if (typeof val !== 'function') return val;
  if (STEP_ACTS.has(k)) return async (sel, ...a) => { if (typeof sel === 'string') await stepTo(t, t.locator(sel)); return val.call(t, sel, ...a); };
  return (...a) => { const out = val.apply(t, a); return isLocator(out) ? steppedLocator(t, out) : out; };
} });
