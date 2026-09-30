/** Header button: System → Light → Dark. */
import { useEffect, useState } from 'preact/hooks';
import { NEXT_THEME, initTheme, setThemePref, themePref, type ThemePref } from './theme';

const ICON: Record<ThemePref, string> = { system: '◐', light: '☀', dark: '☾' };
const LABEL: Record<ThemePref, string> = { system: 'Theme: as system', light: 'Theme: light', dark: 'Theme: dark' };

export function ThemeToggle() {
  const [p, setP] = useState<ThemePref>(themePref());
  useEffect(() => initTheme(), []);
  const next = NEXT_THEME[p];
  return <button type="button" data-testid="theme-toggle" aria-label={`${LABEL[p]} — switch to ${next}`} title={`${LABEL[p]}. Click for ${next}.`}
    onClick={() => { setThemePref(next); setP(next); }}
    class="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
    <span aria-hidden="true" class="text-sm leading-none">{ICON[p]}</span>
    <span>{p === 'system' ? 'Auto' : p === 'light' ? 'Light' : 'Dark'}</span>
  </button>;
}
