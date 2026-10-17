/**
 * The new look's shared motion (D-UX-72; UX3): blocks settle into place once in view (the foot's name, a result landing
 * as paper) and the top bar steps out of the way while reading down. Every page in the new look runs it (Base.astro);
 * home adds its own on top (home/home.ts). Under reduced motion Base.astro leaves out the `js` mark and nothing moves.
 */
export function look() {
  if (document.body.dataset.look !== 'new' || !document.documentElement.classList.contains('js')) return;
  settling();
  header();
}

/** Blocks settle into place once in view, those a page adds later too; one that takes the focus first shows at once. */
function settling() {
  const io = new IntersectionObserver((es) => {
    for (const e of es) if (e.isIntersecting) { e.target.classList.add('settled'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -8% 0px' });
  const watch = (root: ParentNode) => root.querySelectorAll('[data-settle]:not(.settled)').forEach((el) => io.observe(el));
  watch(document);
  // A tool page renders its result after load: what it adds is watched as it comes.
  new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n instanceof Element) { if (n.matches('[data-settle]')) io.observe(n); watch(n); } })
    .observe(document.body, { childList: true, subtree: true });
  document.addEventListener('focusin', (e) => {
    const r = (e.target as Element).closest?.<HTMLElement>('[data-settle]:not(.settled)');
    if (r) { r.style.transition = 'none'; r.classList.add('settled'); }
  });
}

/** The top bar steps out of the way while reading down and comes back on the way up (or when it holds the focus). */
function header() {
  const bar = document.querySelector<HTMLElement>('[data-header]');
  if (!bar) return;
  let last = scrollY;
  addEventListener('scroll', () => {
    const y = scrollY;
    if (y > last + 4 && y > 240) bar.dataset.away = '';
    else if (y < last - 4) delete bar.dataset.away;
    last = y;
  }, { passive: true });
}
