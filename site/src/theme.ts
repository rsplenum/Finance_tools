/**
 * Light / dark theme. The user's choice — System, Light or Dark — is kept in this browser; "System" follows
 * the page host's theme (claude.ai sets data-theme on <html>) and then the operating system. Tailwind's `dark:` variant
 * keys on the `dark` class of <html> (global.css).
 */
export type ThemePref = 'system' | 'light' | 'dark';
const KEY = 'app-theme';

function load(): ThemePref {
  try { const v = localStorage.getItem(KEY); if (v === 'light' || v === 'dark') return v; } catch { /* storage blocked */ }
  return 'system';
}
let pref: ThemePref = load();
let started = false;

export const themePref = () => pref;

export function applyTheme() {
  const root = document.documentElement;
  const host = root.getAttribute('data-theme');
  const dark = pref !== 'system' ? pref === 'dark' : host ? host === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  root.classList.toggle('dark', dark);
  root.style.colorScheme = dark ? 'dark' : 'light';
}

/** Apply now and follow later changes of the host's or the system's theme (once per page). */
export function initTheme() {
  applyTheme();
  if (started) return;
  started = true;
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}

export function setThemePref(p: ThemePref) {
  pref = p;
  try { if (p === 'system') localStorage.removeItem(KEY); else localStorage.setItem(KEY, p); } catch { /* storage blocked: choice lasts for this visit */ }
  applyTheme();
}

export const NEXT_THEME: Record<ThemePref, ThemePref> = { system: 'light', light: 'dark', dark: 'system' };

/** Inline <head> script with the same rule as applyTheme(), run before first paint so a dark page never flashes white. */
export const THEME_BOOT = `(function(){var p;try{p=localStorage.getItem(${JSON.stringify(KEY)})}catch(e){}` +
  `var r=document.documentElement,h=r.getAttribute('data-theme'),` +
  `d=p==='dark'||(p!=='light'&&(h?h==='dark':matchMedia('(prefers-color-scheme: dark)').matches));` +
  `r.classList.toggle('dark',d);r.style.colorScheme=d?'dark':'light'})()`;
