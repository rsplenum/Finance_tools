/** Header button: System → Light → Dark. */
import { useEffect, useState } from 'preact/hooks';
import { NEXT_THEME, initTheme, setThemePref, themePref, type ThemePref } from './theme';

const ICON: Record<ThemePref, string> = { system: '◐', light: '☀', dark: '☾' };
const LABEL: Record<ThemePref, string> = { system: 'Theme: as system', light: 'Theme: light', dark: 'Theme: dark' };

export function ThemeToggle() {
  // The first render matches the pre-built HTML ('system'); the stored choice is read after hydration.
  const [p, setP] = useState<ThemePref>('system');
  useEffect(() => { initTheme(); setP(themePref()); }, []);
  const next = NEXT_THEME[p];
  // Its name starts "Theme:" and ends with the word shown, so a voice command of what is seen reaches it (WCAG 2.5.3).
  return <button type="button" data-testid="theme-toggle" title={`${LABEL[p]}. Click for ${next}.`}
    onClick={() => { setThemePref(next); setP(next); }}
    class="inline-flex min-h-8 items-center gap-1 rounded-control border border-edge bg-field px-2.5 py-1.5 text-sm font-medium text-ink hover:bg-surface">
    <span aria-hidden="true" class="leading-none">{ICON[p]}</span>
    <span class="sr-only">Theme: </span>
    <span>{p === 'system' ? 'Auto' : p === 'light' ? 'Light' : 'Dark'}</span>
  </button>;
}
