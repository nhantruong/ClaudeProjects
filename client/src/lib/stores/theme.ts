import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeStore {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

function getSystemTheme(): 'dark' | 'light' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(mode: ThemeMode): void {
  const resolved = mode === 'system' ? getSystemTheme() : mode;
  const html = document.documentElement;
  if (resolved === 'light') {
    html.setAttribute('data-theme', 'light');
  } else {
    html.removeAttribute('data-theme');
  }
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      mode: 'dark',
      setMode: (mode) => {
        applyTheme(mode);
        set({ mode });
      },
    }),
    { name: 'raphael-theme' },
  ),
);

export function initTheme(): void {
  const stored = useThemeStore.getState();
  applyTheme(stored.mode);

  // Re-apply when system preference changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (useThemeStore.getState().mode === 'system') {
      applyTheme('system');
    }
  });
}
